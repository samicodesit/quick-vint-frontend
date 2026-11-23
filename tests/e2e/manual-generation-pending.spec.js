const { test, expect } = require('@playwright/test');
const { openBatchJourney } = require('./batch-journey');
const fs = require('node:fs');
const path = require('node:path');

const result = { title: 'Recovered pending coat', description: 'Original committed result', measurementAdvice: '' };
const pending = { error: 'A generation for this request is already in progress.', code: 'generation_in_progress' };

async function openEdit(generate) {
  const flow = await openBatchJourney({ realVisibility: true, generate });
  try {
    const fixture = fs.readFileSync(path.join(__dirname, '../fixtures/vinted-listing.html'), 'utf8')
      .replace(/src="data:image[^"]+"/, 'src="https://images1.vinted.net/t/qa-0.png"');
    const edit = 'https://www.vinted.com/items/987654321/edit';
    await flow.context.route(edit, route => route.fulfill({ contentType: 'text/html', body: fixture }));
    await flow.controller.goto(edit, { waitUntil: 'domcontentloaded' });
    await expect(flow.controller.locator('#quickvint-gen-btn')).toBeVisible();
    await expect(flow.controller.locator('[data-testid="media-upload-grid"] img')).toHaveCount(1);
    return flow;
  } catch (error) { await flow.close(); throw error; }
}

async function changeScope(flow, change) {
  if (change === 'account') {
    await flow.worker.evaluate(async () => {
      const { supabaseSession } = await chrome.storage.local.get('supabaseSession');
      await chrome.storage.local.set({ supabaseSession: { ...supabaseSession, user: { id: 'other-user' } } });
    });
  } else if (change === 'settings') {
    await flow.worker.evaluate(() => chrome.storage.local.set({ tone: 'casual' }));
  } else if (change === 'photos') {
    await flow.controller.locator('[data-testid="media-upload-grid"] img').evaluate(image => image.src = 'https://images1.vinted.net/t/qa-other.png');
  } else {
    await flow.controller.evaluate(() => history.pushState({}, '', '/items/999/edit'));
  }
}

for (const [status, code] of [[409, 'generation_in_progress'], [503, 'generation_commit_pending']]) {
  test(`manual Generate retrieves its pending ${status} request after a lost reply`, async () => {
    const flow = await openEdit(async ({ route, requests }) => {
      if (requests.length === 1) return route.abort('connectionreset');
      if (requests.length === 2) return route.fulfill({ status, json: { ...pending, code } });
      return route.fulfill({ json: result });
    });
    try {
      await flow.controller.locator('#quickvint-gen-btn').click();
      await expect(flow.controller.locator('[data-testid="title--input"]')).toHaveValue(result.title);
      expect(flow.requests).toHaveLength(3);
      expect(new Set(flow.requests.map(request => request.id)).size).toBe(1);
      expect(new Set(flow.requests.map(request => request.rawBody)).size).toBe(1);
      await expect(flow.controller.locator('[data-testid="media-upload-grid"] img')).toHaveCount(1);
      expect(flow.events.some(event => event.event === 'generate_error')).toBe(false);
    } finally { await flow.close(); }
  });
}

test('pending manual generation survives a real extension worker restart', async () => {
  const flow = await openEdit(async ({ route, requests }) => requests.length === 1
    ? route.fulfill({ status: 409, headers: { 'Retry-After': '3' }, json: pending })
    : route.fulfill({ json: result }));
  try {
    await flow.controller.locator('#quickvint-gen-btn').click();
    await expect.poll(() => flow.requests.length).toBe(1);
    await flow.restartWorker();
    await expect(flow.controller.locator('[data-testid="title--input"]')).toHaveValue(result.title);
    expect(flow.requests).toHaveLength(2);
    expect(flow.requests[1].id).toBe(flow.requests[0].id);
    expect(flow.requests[1].rawBody).toBe(flow.requests[0].rawBody);
    await expect(flow.controller.locator('[data-testid="media-upload-grid"] img')).toHaveCount(1);
  } finally { await flow.close(); }
});

for (const change of ['account', 'photos', 'settings', 'listing']) {
  test(`pending manual generation stops after ${change} change`, async () => {
    const flow = await openEdit(async ({ route }) => route.fulfill({ status: 409, json: pending }));
    try {
      await flow.controller.locator('#quickvint-gen-btn').click();
      await expect.poll(() => flow.requests.length).toBe(1);
      await changeScope(flow, change);
      await expect(flow.controller.locator('#quickvint-gen-btn')).toBeEnabled();
      expect(flow.requests).toHaveLength(1);
      await expect(flow.controller.locator('[data-testid="title--input"]')).toHaveValue('');
      await expect(flow.controller.locator('[data-testid="media-upload-grid"] img')).toHaveCount(1);
    } finally { await flow.close(); }
  });

  test(`pending manual result is not applied after an in-flight ${change} change`, async () => {
    let reply;
    const ready = new Promise(resolve => { reply = resolve; });
    const flow = await openEdit(async ({ route, requests }) => {
      if (requests.length === 1) return route.fulfill({ status: 409, json: pending });
      await ready;
      return route.fulfill({ json: result });
    });
    try {
      await flow.controller.locator('#quickvint-gen-btn').click();
      await expect.poll(() => flow.requests.length).toBe(2);
      await changeScope(flow, change);
      reply();
      await expect(flow.controller.locator('#quickvint-gen-btn')).toBeEnabled();
      expect(flow.requests).toHaveLength(2);
      expect(flow.requests[1].id).toBe(flow.requests[0].id);
      await expect(flow.controller.locator('[data-testid="title--input"]')).toHaveValue('');
      await expect(flow.controller.locator('[data-testid="media-upload-grid"] img')).toHaveCount(1);
    } finally { reply(); await flow.close(); }
  });
}

for (const failure of ['conflict', 'network', 'timeout']) {
  test(`manual pending retry keeps its ${failure} boundary`, async () => {
    if (failure === 'timeout') test.setTimeout(150000);
    const flow = await openEdit(async ({ route }) => {
      if (failure === 'network') return route.abort('connectionreset');
      if (failure === 'conflict') return route.fulfill({ status: 409, json: { error: 'Request changed', code: 'idempotency_conflict' } });
      return route.fulfill({ status: 409, headers: { 'Retry-After': failure === 'timeout' ? '999' : '1', 'Access-Control-Expose-Headers': 'Retry-After' }, json: pending });
    });
    try {
      await flow.controller.locator('#quickvint-gen-btn').click();
      await expect(flow.controller.locator('#quickvint-gen-btn')).toBeEnabled({ timeout: failure === 'timeout' ? 130000 : 7500 });
      expect(flow.requests).toHaveLength(failure === 'network' ? 2 : 1);
      await expect(flow.controller.locator('[data-testid="title--input"]')).toHaveValue('');
      await expect(flow.controller.locator('[data-testid="media-upload-grid"] img')).toHaveCount(1);
    } finally { await flow.close(); }
  });
}

for (const changeListing of [false, true]) {
  test(`pending manual request keeps its scope through HTTP401 renewal: changed listing ${changeListing}`, async () => {
    let release;
    const ready = new Promise(resolve => { release = resolve; });
    const flow = await openEdit(async ({ route, requests }) => {
      if (requests.length === 1) return route.fulfill({ status: 409, json: pending });
      if (requests.length === 2) return route.fulfill({ status: 401, json: { error: 'Session expired' } });
      await ready;
      return route.fulfill({ json: result });
    });
    try {
      // Synthetic local credentials, never an authenticated production session.
      const expires = Math.floor(Date.now() / 1000) + 3600;
      const token = [Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url'),
        Buffer.from(JSON.stringify({ sub: 'test-user', exp: expires })).toString('base64url'), 'local-signature'].join('.');
      await flow.context.route('**/auth/v1/token**', route => route.fulfill({ json: {
        access_token: token, refresh_token: 'local-test-refresh', expires_at: expires, expires_in: 3600,
        token_type: 'bearer', user: { id: 'test-user', email: 'seller@example.invalid' },
      } }));
      await flow.controller.locator('#quickvint-gen-btn').click();
      await expect.poll(() => flow.requests.length).toBe(3);
      if (changeListing) await changeScope(flow, 'listing');
      release();
      await expect(flow.controller.locator('#quickvint-gen-btn')).toBeEnabled();
      await expect(flow.controller.locator('[data-testid="title--input"]')).toHaveValue(changeListing ? '' : result.title);
      expect(flow.requests).toHaveLength(3);
      expect(new Set(flow.requests.map(request => request.id)).size).toBe(1);
      expect(new Set(flow.requests.map(request => request.rawBody)).size).toBe(1);
      await expect(flow.controller.locator('[data-testid="media-upload-grid"] img')).toHaveCount(1);
    } finally { release(); await flow.close(); }
  });
}
