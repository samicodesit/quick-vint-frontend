// Actual MV3 extension startup on local fixtures. No live marketplace/API calls.
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs/promises';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { listingFixture } from '../tests/fixtures/listing-host-contract.mjs';
const require = createRequire(import.meta.url);
const { expect } = require('@playwright/test');
const { openBatchJourney } = require('../tests/e2e/batch-journey');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'docs/qa/toolbar-startup');
await fs.mkdir(output, { recursive: true });
const scratch = await fs.mkdtemp(path.join(os.tmpdir(), 'autolister-startup-baseline-'));
const baseline = path.join(scratch, 'extension');
const files = execFileSync('git', ['ls-tree', '-r', '--name-only', '9932410', '--', 'manifest.json', 'canary-config.js', 'language-defaults.js', 'content.js', 'background.js', 'popup.html', 'popup.js', 'callback.html', 'callback.js', 'lib', 'icons', 'images', '_locales'], { cwd: root, encoding: 'utf8' }).trim().split('\n');
for (const file of files) {
  await fs.mkdir(path.dirname(path.join(baseline, file)), { recursive: true });
  await fs.writeFile(path.join(baseline, file), execFileSync('git', ['show', `9932410:${file}`], { cwd: root, maxBuffer: 20 * 1024 * 1024 }));
}
const results = [];
const fixture = await listingFixture(root);
async function shot(page, name) {
  await page.evaluate(async () => { await document.fonts.ready; await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))); });
  const clip = await page.evaluate(() => {
    const input = document.querySelector('[data-testid="title--input"]').getBoundingClientRect();
    const label = document.querySelector('[data-testid="title--input"]').labels?.[0]?.getBoundingClientRect();
    const tools = document.querySelector('.al-listing-tools').getBoundingClientRect();
    const top = Math.max(0, (label?.top || input.top - 52) - 6);
    return { x: input.left - 8, y: top, width: input.width + 16, height: tools.bottom - top + 12 };
  });
  await page.screenshot({ path: path.join(output, name + '.png'), clip });
}
try {
  for (const variant of ['before', 'after']) {
    process.env.AUTOLISTER_EXTENSION_PATH = variant === 'before' ? baseline : root;
    for (let sample = 0; sample < (variant==='after'?4:3); sample++) {
      let responseAt, requestAt, release;
      const held = variant === 'after' && sample === 0;
      const gate = new Promise(resolve => { release = resolve; });
      const browserStartedAt = Date.now();
      const f = await openBatchJourney({ beforeNavigate: async ({ context, worker, controller }) => {
        await worker.evaluate(() => chrome.storage.local.set({selectedLanguage:'nl',selectedTitleLanguage:'nl',selectedDescriptionLanguage:'nl',quickvintLanguagePreferenceTouched:true,quickvintInlineLanguageHintDone:true}));
        await context.route('https://www.vinted.com/items/new**', route => route.fulfill({ contentType:'text/html', body:fixture }));
        await context.route('https://flagcdn.com/w40/nl.png', route => route.fulfill({contentType:'image/png',path:path.join(root,'tests/fixtures/flag-nl.png')}));
        await context.route('https://autolister.app/api/user/model', async route => {
          if (route.request().method() === 'GET') {
            requestAt = Date.now();
            if (held) await gate;
            await new Promise(resolve => setTimeout(resolve, 300));
            responseAt = Date.now();
          }
          return route.fulfill({ json:{enabled:false,model:null,invitationState:'dismissed'} });
        });
        await controller.addInitScript(() => {
          const times = window.__toolbarStartup = {};
          const observe = () => {
            const visible = id => { const el=document.getElementById(id); return el?.getClientRects().length && getComputedStyle(el).visibility !== 'hidden'; };
            const record = (key, ready) => { if(ready && times[key]===undefined) times[key]=performance.now(); };
            const core = ['quickvint-gen-btn','quickvint-style-btn','quickvint-more-btn'];
            record('coreVisible',core.every(visible));
            record('coreEnabled',core.every(id=>visible(id)&&!document.getElementById(id).disabled));
            record('modelVisible',visible('quickvint-model-btn'));
            record('modelEnabled',visible('quickvint-model-btn')&&!document.getElementById('quickvint-model-btn').disabled);
          };
          new MutationObserver(observe).observe(document,{subtree:true,childList:true,attributes:true});
          addEventListener('DOMContentLoaded',observe);
        });
      } });
      try {
        for (const navigation of ['cold', 'warm']) {
          await f.controller.setViewportSize({width:1280,height:900});
          if (navigation === 'warm') { responseAt=undefined; requestAt=undefined; await f.controller.reload(); }
          await expect(f.controller.locator('#quickvint-gen-btn')).toBeEnabled();
          let writingStyleInteraction, helpInteraction;
          for(const [trigger,key] of [['#quickvint-style-btn','style'],['#quickvint-more-btn','help']]) {
            await f.controller.locator(trigger).click();
            await expect(f.controller.locator('dialog.al-tools-panel[open]')).toBeVisible();
            const time=await f.controller.evaluate(()=>performance.now());
            if(key==='style') writingStyleInteraction=time; else helpInteraction=time;
            await f.controller.keyboard.press('Escape');
          }
          if (held && navigation === 'cold') {
            await expect(f.controller.locator('#quickvint-model-control')).toHaveAttribute('aria-busy','true');
            for(const [name,width,height] of [['desktop',1280,900],['narrow',390,844]]) {
              await f.controller.setViewportSize({width,height});
              await shot(f.controller,'loading-'+name);
            }
            release();
          }
          await expect(f.controller.locator('#quickvint-model-btn')).toBeVisible();
          await expect(f.controller.locator('#quickvint-model-btn')).toBeEnabled();
          const resolvedAt=responseAt, modelRequestAt=requestAt;
          const timings = await f.controller.evaluate(() => ({...window.__toolbarStartup,timeOrigin:performance.timeOrigin}));
          timings.writingStyleInteraction=writingStyleInteraction;
          timings.helpInteraction=helpInteraction;
          if(held&&navigation==='cold') {
            for(const [name,width,height] of [['desktop',1280,900],['narrow',390,844]]) {
              await f.controller.setViewportSize({width,height});
              await shot(f.controller,'ready-'+name);
            }
          }
          for(const [trigger,selector] of [['#quickvint-model-btn','dialog.um-modal[open]']]) {
            await f.controller.locator(trigger).click();
            await expect(f.controller.locator(selector)).toBeVisible();
            await expect(f.controller.locator(selector+' input[type="range"]')).toBeVisible();
            timings.modelInteraction=await f.controller.evaluate(()=>performance.now());
            await f.controller.keyboard.press('Escape');
          }
          results.push({variant,sample,navigation,held:held&&navigation==='cold',browserLaunchToObserved:Date.now()-browserStartedAt,requestAt:modelRequestAt,responseAt:resolvedAt,...timings,responseToEnabled:Math.round(timings.timeOrigin+timings.modelEnabled-resolvedAt)});
        }
      } finally { release(); await f.close(); }
    }
  }
} finally { delete process.env.AUTOLISTER_EXTENSION_PATH; await fs.rm(scratch,{recursive:true,force:true}); }
await fs.writeFile(path.join(output,'timings.json'),JSON.stringify({scope:'real Chromium MV3, same local host-contract fixture; 300ms model API fixture, cold fresh profile vs warm same-profile reload; not live Vinted/network performance',results},null,2));
console.log(JSON.stringify(results.map(({variant,navigation,held,coreVisible,coreEnabled,modelVisible,modelEnabled,responseToEnabled})=>({variant,navigation,held,coreVisible,coreEnabled,modelVisible,modelEnabled,responseToEnabled})),null,2));
