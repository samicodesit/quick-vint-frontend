const { test, expect } = require('@playwright/test');
const { openBatchJourney } = require('./batch-journey');
const path = require('node:path');

async function modelClientFixture(page, mode) {
  await page.route('https://startup.test/**', route => route.fulfill({ body: '<div class="quickvint-primary-tools"><button id="quickvint-style-btn">Style</button></div>', contentType: 'text/html' }));
  await page.goto('https://startup.test/items/new');
  await page.evaluate(mode => {
    const listeners = [];
    let releaseLanguage, releaseModel;
    const language = new Promise(resolve => { releaseLanguage = resolve; });
    const model = new Promise(resolve => { releaseModel = resolve; });
    window.calls = []; window.events = [];
    window.releaseLanguage = () => releaseLanguage({});
    window.releaseModel = () => releaseModel({ ok: false, status: 404 });
    window.switchOwner = id => listeners.forEach(fn => fn({ supabaseSession: { newValue: { user: { id } } } }, 'local'));
    window.AutoListerListingTools = { enhance() {} };
    window.AutoListerModelUI = { t: value => value };
    window.AutoListerTelemetry = { track: (event, context, source, required, owner) => events.push({ event, owner }) };
    window.chrome = {
      storage: { local: { get: async key => Array.isArray(key) ? (mode === 'auth-race' ? language : {}) : key === 'supabaseSession' ? { supabaseSession: { user: { id: 'old-owner' } } } : {}, set: async () => {} },
        onChanged: { addListener: fn => listeners.push(fn), removeListener: () => {} } },
      runtime: { getURL: () => 'data:,', sendMessage: async message => { calls.push(message); return mode === 'disabled' ? model : { ok: true, data: { enabled: false, model: null, invitationState: 'dismissed' } }; } },
    };
  }, mode);
  await page.addScriptTag({ path: path.resolve(__dirname, '../../lib/user-model-client.js') });
  await page.evaluate(() => AutoListerModels.startContent());
}

test('an auth change supersedes an initially delayed owner read', async ({ page }) => {
  await modelClientFixture(page, 'auth-race');
  await page.evaluate(() => switchOwner('new-owner'));
  await expect.poll(() => page.evaluate(() => calls.length)).toBe(1);
  await page.evaluate(() => { releaseLanguage(); });
  await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 0)));
  await page.evaluate(() => dispatchEvent(new Event('autolister-listing-tools-ready')));
  expect(await page.evaluate(() => calls.map(call => call.expectedUserId))).toEqual(['new-owner']);
});

test('a pending placeholder and unavailable model never count as model exposure', async ({ page }) => {
  await modelClientFixture(page, 'disabled');
  await expect(page.locator('#quickvint-model-control')).toHaveAttribute('aria-busy', 'true');
  expect(await page.evaluate(() => events)).toEqual([]);
  await page.evaluate(() => releaseModel());
  await expect(page.locator('#quickvint-model-control')).toHaveCount(0);
  await page.evaluate(() => dispatchEvent(new Event('autolister-listing-tools-ready')));
  expect(await page.evaluate(() => events)).toEqual([]);
});

test('newly inserted tools announce readiness in the same insertion turn', async () => {
  const f = await openBatchJourney({ beforeNavigate: async ({ context }) => {
    await context.addInitScript(() => {
      let events = 0;
      addEventListener('autolister-listing-tools-ready', () => events++);
      const observer = new MutationObserver(() => {
        if (!document.querySelector('.quickvint-primary-tools')) return;
        window.firstToolbarReadyEvents = events;
        observer.disconnect();
      });
      observer.observe(document, { subtree: true, childList: true });
    });
  } });
  try { expect(await f.controller.evaluate(() => window.firstToolbarReadyEvents)).toBeGreaterThan(0); }
  finally { await f.close(); }
});

test('pending model state reserves its controls without blocking the rest of the toolbar', async () => {
  const f = await openBatchJourney();
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  let requests = 0;
  await f.context.route('https://autolister.app/api/user/model', async route => {
    if (route.request().method() === 'GET') { requests++; await gate; }
    return route.fulfill({ json: { enabled: false, model: null, invitationState: 'dismissed' } });
  });
  try {
    await f.controller.reload();
    await expect(f.controller.locator('#quickvint-gen-btn')).toBeVisible();
    await expect.poll(() => requests).toBeGreaterThan(0);
    const model = f.controller.locator('#quickvint-model-control');
    await expect(model).toBeVisible({ timeout: 700 });
    await expect(model).toHaveAttribute('aria-busy', 'true');
    await expect(f.controller.locator('#quickvint-model-btn')).toBeDisabled();
    await expect(f.controller.locator('#quickvint-gen-btn')).toBeEnabled();
    await f.controller.locator('#quickvint-style-btn').click();
    await expect(f.controller.locator('dialog.al-tools-panel[open]')).toBeVisible();
    await f.controller.keyboard.press('Escape');
    release();
    await expect(model).toHaveAttribute('aria-busy', 'false', { timeout: 1000 });
    await expect(f.controller.locator('#quickvint-model-btn')).toBeEnabled();
  } finally { release(); await f.close(); }
});

test('a ready model does not wait for the three-second discovery interval', async () => {
  const f = await openBatchJourney();
  let responseAt;
  await f.context.route('https://autolister.app/api/user/model', async route => {
    await route.fulfill({ json: { enabled: false, model: null, invitationState: 'dismissed' } });
    responseAt = Date.now();
  });
  try {
    await f.controller.reload();
    await expect.poll(() => responseAt).toBeTruthy();
    await expect(f.controller.locator('#quickvint-model-btn')).toBeVisible({ timeout: 1000 });
    await expect(f.controller.locator('#quickvint-model-btn')).toBeEnabled({ timeout: 1000 });
    console.log('model response to usable control (ms):', Date.now() - responseAt);
  } finally { await f.close(); }
});

test('model failures resolve the loading state and keep core tools usable', async () => {
  const f = await openBatchJourney();
  let status = 503;
  await f.context.route('https://autolister.app/api/user/model', route => route.fulfill({ status, json: { error: 'Model temporarily unavailable' } }));
  try {
    await f.controller.reload();
    await expect(f.controller.locator('#quickvint-model-control')).toHaveAttribute('aria-busy', 'false');
    await expect(f.controller.locator('.um-toolbar-error')).toBeVisible();
    await expect(f.controller.locator('#quickvint-model-btn')).toBeEnabled();
    await expect(f.controller.locator('#quickvint-model-toggle')).toBeDisabled();
    await expect(f.controller.locator('#quickvint-gen-btn')).toBeEnabled();
    status = 404;
    await f.controller.reload();
    await expect(f.controller.locator('#quickvint-gen-btn')).toBeVisible();
    await expect(f.controller.locator('#quickvint-model-control')).toHaveCount(0);
  } finally { await f.close(); }
});

test('signing out while model state is loading cannot reveal the old account control', async () => {
  const f = await openBatchJourney();
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  await f.context.route('https://autolister.app/api/user/model', async route => {
    await gate;
    return route.fulfill({ json: { enabled: true, model: { state: 'ready', imageUrl: 'https://old-account.invalid/model.jpg' } } });
  });
  try {
    await f.controller.reload();
    await expect(f.controller.locator('#quickvint-model-control')).toHaveAttribute('aria-busy', 'true');
    await f.worker.evaluate(() => chrome.storage.local.remove('supabaseSession'));
    await expect(f.controller.locator('#quickvint-model-control')).toHaveCount(0);
    release();
    await expect(f.controller.locator('#quickvint-signin-btn')).toBeVisible();
    await expect(f.controller.locator('#quickvint-model-control')).toHaveCount(0);
  } finally { release(); await f.close(); }
});

test('toolbar refresh preserves a pending toggle and its recoverable error', async () => {
  const f = await openBatchJourney();
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  await f.context.route('https://autolister.app/api/user/model', async route => {
    if (route.request().method() === 'PATCH') {
      await gate;
      return route.fulfill({ status: 503, json: { error: 'Model temporarily unavailable' } });
    }
    return route.fulfill({ json: { enabled: false, model: { state: 'ready', imageUrl: 'about:blank' }, invitationState: 'dismissed' } });
  });
  try {
    await f.controller.reload();
    const toggle = f.controller.locator('#quickvint-model-toggle');
    await expect(toggle).toBeEnabled();
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-busy', 'true');
    await f.controller.evaluate(() => dispatchEvent(new Event('autolister-listing-tools-ready')));
    await expect(toggle).toBeDisabled();
    release();
    await expect(f.controller.locator('.um-toolbar-error')).toBeVisible();
    await f.controller.evaluate(() => dispatchEvent(new Event('autolister-listing-tools-ready')));
    await expect(f.controller.locator('.um-toolbar-error')).toBeVisible();
    await expect(toggle).toBeEnabled();
  } finally { release(); await f.close(); }
});
