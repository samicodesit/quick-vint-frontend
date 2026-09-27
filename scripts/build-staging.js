#!/usr/bin/env node

// Build an unpacked test extension without changing tracked production files.
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const output = path.join(root, 'dist', 'staging-extension');
const files = [
  'manifest.json', 'canary-config.js', 'language-defaults.js', 'content.js',
  'background.js', 'ops-bridge.js', 'popup.html', 'popup.js',
  'callback.html', 'callback.js', 'lib', 'icons', 'images', '_locales',
];
const productionApi = 'https://autolister.app';
const productionSupabase = 'https://jqloiovdwjaornnfvmyu.supabase.co';

function requiredUrl(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.pathname !== '/' || url.search || url.hash) {
    throw new Error(`${name} must be an HTTPS origin`);
  }
  return url.origin;
}

function build() {
  const api = requiredUrl('STAGING_API_URL');
  const supabase = requiredUrl('STAGING_SUPABASE_URL');
  const anonKey = process.env.STAGING_SUPABASE_ANON_KEY;
  if (api === productionApi || supabase === productionSupabase || !anonKey) {
    throw new Error('Separate staging API, Supabase project and anon key are required');
  }
  const productionPopup = fs.readFileSync(path.join(root, 'popup.js'), 'utf8');
  const productionKey = productionPopup.match(/const SUPABASE_ANON_KEY\s*=\s*"([^"]+)"/)?.[1];
  if (!productionKey || anonKey === productionKey) {
    throw new Error('Staging Supabase anon key must differ from production');
  }
  if (fs.existsSync(output)) fs.rmSync(output, { recursive: true });
  fs.mkdirSync(output, { recursive: true });
  for (const file of files) fs.cpSync(path.join(root, file), path.join(output, file), { recursive: true });

  for (const file of ['content.js', 'background.js', 'popup.js', 'callback.js', 'callback.html']) {
    const target = path.join(output, file);
    let source = fs.readFileSync(target, 'utf8');
    source = source.replaceAll(productionApi, api).replaceAll(productionSupabase, supabase);
    if (['background.js', 'popup.js', 'callback.js'].includes(file)) {
      const pattern = /(const SUPABASE_ANON_KEY\s*=\s*)"[^"]+"/;
      if (!pattern.test(source)) throw new Error(`Missing Supabase anon key in ${file}`);
      source = source.replace(pattern, (_, prefix) => `${prefix}${JSON.stringify(anonKey)}`);
    }
    fs.writeFileSync(target, source);
  }

  const manifestPath = path.join(output, 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  delete manifest.key; // A separate unpacked extension identity protects the installed release.
  manifest.name = 'AutoLister Staging';
  manifest.description = 'Private AutoLister staging test build';
  manifest.host_permissions = manifest.host_permissions.map((entry) =>
    entry === `${productionApi}/*` ? `${api}/*` : entry,
  );
  manifest.externally_connectable.matches = [`${api}/*`];
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  for (const file of ['background.js', 'popup.js', 'callback.js']) {
    const source = fs.readFileSync(path.join(output, file), 'utf8');
    if (source.includes(productionSupabase)) throw new Error(`Production Supabase reference remains in ${file}`);
  }
  console.log(`Staging extension ready: ${output}`);
  console.log('Load this directory unpacked, then allow its exact callback URL in staging Supabase Auth.');
}

if (require.main === module) build();
module.exports = { build };
