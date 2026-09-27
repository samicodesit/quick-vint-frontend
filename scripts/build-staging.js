#!/usr/bin/env node

// Build an unpacked test extension without changing tracked production files.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const root = path.resolve(__dirname, '..');
const output = path.join(root, 'dist', 'staging-extension');
const files = [
  'manifest.json', 'canary-config.js', 'language-defaults.js', 'content.js',
  'background.js', 'ops-bridge.js', 'popup.html', 'popup.js',
  'callback.html', 'callback.js', 'lib', 'icons', 'images', '_locales',
];
const productionApi = 'https://autolister.app';
const productionSupabase = 'https://jqloiovdwjaornnfvmyu.supabase.co';
// Separate public key, generated only for the unpacked staging build.
// Chrome derives this build's stable ID from its SHA-256 hash.
const stagingExtensionKey = 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAqCAfl1VGzcgLEw/PbpCdZWiAgWa4Q2FdYnMgLtWDjX94/dX2BNI9OhV0r34JAdcFQaiCCVEBmT1WshSAntiUTtMP4uxDreiNkuLHelXXKQSSF/+IIPLFnFNOc+Zkx7OWaBmdpotcyZ3YUH1s6Q4VJg3yiCCYop1gOkQ8efu+llOnU6b0ClsFyDbsxs1ktMAXgrySbAbuKj/quUamlwngH8nfoi1MOVFW8l5IMnyKkXowgbTg8os0vIp6E6gvKnz8L+le83VA9tscjyTEEbRl2YBEn/TGnmGf7RO7o7oaHlpalACWmxI6EDQz4Rv7qTYPjTNdQisQc7Q8bK3b6e8J7wIDAQAB';
const stagingExtensionId = 'olpodlemebcdiklhjfemgdongmidnajb';

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
  const idFromKey = [...crypto.createHash('sha256').update(Buffer.from(stagingExtensionKey, 'base64')).digest('hex').slice(0, 32)]
    .map((value) => String.fromCharCode(97 + parseInt(value, 16))).join('');
  if (idFromKey !== stagingExtensionId) throw new Error('Staging extension key and ID disagree');
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
    if (file === 'popup.js') {
      const legacyRequest = `const res = await fetch(\`\${API_BASE}/api/auth/magic-link\`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });`;
      if (!source.includes(legacyRequest)) throw new Error('Missing extension magic-link request');
      // Staging uses Supabase's own email delivery. The production popup keeps its
      // existing Resend-backed endpoint, which is intentionally absent in staging.
      const stagingRequest = `const { error: otpError } = await supabaseClient.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: \`chrome-extension://\${chrome.runtime.id}/callback.html\` },
      });
      const res = {
        ok: !otpError,
        status: otpError?.status || 200,
        json: async () => ({ error: otpError?.message }),
      };`;
      source = source.replace(legacyRequest, stagingRequest);
    }
    fs.writeFileSync(target, source);
  }

  const manifestPath = path.join(output, 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  manifest.key = stagingExtensionKey; // Stable identity separate from the installed release.
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
  console.log(`Staging extension ID: ${stagingExtensionId}`);
  console.log('Load this directory unpacked, then confirm its ID matches and allow its exact callback URL in staging Supabase Auth.');
}

if (require.main === module) build();
module.exports = { build };
