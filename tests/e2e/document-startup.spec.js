const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const { openBatchJourney } = require('./batch-journey');

test('listing controls initialize on HTML without a head, including after reload', async () => {
  const f = await openBatchJourney();
  try {
    const page = await f.context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const fixture = fs.readFileSync(path.join(__dirname, '../fixtures/vinted-listing.html'), 'utf8')
      .replace('</body>', '<script>document.head.remove()</script></body>');
    const url = 'https://www.vinted.com/items/new?headless-listing';
    await page.route(url, route => route.fulfill({contentType:'text/html', body:fixture}));
    await page.goto(url);
    for (let pass = 0; pass < 2; pass++) {
      expect(await page.evaluate(() => document.head)).toBeNull();
      await expect(page.locator('#quickvint-gen-btn')).toBeVisible();
      expect(errors).toEqual([]);
      if (!pass) await page.reload();
    }
    expect(f.requests).toHaveLength(0);
  } finally { await f.close(); }
});

test('waits for a temporarily detached HTML body and ignores a non-HTML resource', async () => {
  const f = await openBatchJourney();
  try {
    const page = await f.context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const url = 'https://www.vinted.com/items/new?body-replaced';
    const fixture = fs.readFileSync(path.join(__dirname, '../fixtures/vinted-listing.html'), 'utf8')
      .replace('</body>', '<script>const body=document.body;body.remove();window.restoreBody=()=>document.documentElement.append(body)</script></body>');
    await page.route(url, route => route.fulfill({contentType:'text/html', body:fixture}));
    await page.goto(url);
    expect(await page.evaluate(() => document.body)).toBeNull();
    await page.evaluate(() => window.restoreBody());
    await expect(page.locator('#quickvint-gen-btn')).toBeVisible();
    const svg = 'https://www.vinted.com/fixture.svg';
    await page.route(svg, route => route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg"/>'}));
    await page.goto(svg);
    expect(await page.evaluate(() => document.contentType)).toBe('image/svg+xml');
    expect(await page.locator('#quickvint-gen-btn').count()).toBe(0);
    expect(errors).toEqual([]);
    expect(f.requests).toHaveLength(0);
  } finally { await f.close(); }
});
