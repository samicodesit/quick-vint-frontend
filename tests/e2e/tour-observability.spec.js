const { test, expect } = require('@playwright/test');
const { openBatchJourney } = require('./batch-journey');

test('idle introduction stays visible and page visits do not imply model engagement', async () => {
  const f = await openBatchJourney();
  try {
    const p = f.controller;
    await expect(p.locator('#quickvint-listing-tour')).toBeVisible();
    await p.waitForTimeout(3200); // Cross three real guidance polling ticks.
    await expect(p.locator('#quickvint-listing-tour')).toBeVisible();
    await expect.poll(() => f.events.filter(e => e.event === 'listing_tour_started').length).toBe(1);
    expect(f.events.filter(e => e.event === 'listing_tour_closed')).toHaveLength(0);
    expect(f.events.filter(e => e.event === 'model_invitation_shown')).toHaveLength(0);
    await p.locator('#quickvint-listing-tour').getByRole('button', {name:'Skip',exact:true}).click();
    await p.reload();
    await expect(p.locator('#quickvint-model-btn')).toBeEnabled();
    await p.waitForTimeout(1300);
    await expect(p.locator('#quickvint-listing-tour')).toHaveCount(0);
    expect(f.events.filter(e => e.event === 'listing_tour_started')).toHaveLength(1);
    expect(f.events.filter(e => e.event === 'model_invitation_shown')).toHaveLength(0);
    await p.locator('#quickvint-model-btn').click();
    await expect.poll(() => f.events.filter(e => e.event === 'model_view_opened').length).toBe(1);
    expect(f.requests).toHaveLength(0);
  } finally { await f.close(); }
});

for (const cause of ['outside_pointer','page_changed','other_dialog']) {
  test(`tour interruption records ${cause} and visible duration without pretending completion`, async () => {
    const f = await openBatchJourney();
    try {
      const p = f.controller;
      await expect(p.locator('#quickvint-listing-tour')).toBeVisible();
      if (cause === 'outside_pointer') await p.locator('[data-testid="title--input"]').click();
      if (cause === 'page_changed') await p.evaluate(() => history.pushState({}, '', '/items/123/edit'));
      if (cause === 'other_dialog') await p.evaluate(() => {
        const dialog = document.createElement('dialog');
        dialog.textContent = 'Controlled host dialog'; document.body.append(dialog); dialog.showModal();
      });
      await expect(p.locator('#quickvint-listing-tour')).toHaveCount(0);
      await expect.poll(() => f.events.filter(e => e.event === 'listing_tour_closed').length).toBe(1);
      const event = f.events.find(e => e.event === 'listing_tour_closed');
      expect(event.context).toMatchObject({reason:cause, entryPoint:'automatic', count:1});
      expect(event.context.durationMs).toBeGreaterThanOrEqual(0);
      expect(event.context.durationMs).toBeLessThan(10000);
      expect(f.events.filter(e => ['listing_tour_skipped','listing_tour_completed'].includes(e.event))).toHaveLength(0);
      expect(f.requests).toHaveLength(0);
    } finally { await f.close(); }
  });
}

test('delayed model readiness does not close an untouched Italian introduction', async () => {
  const f = await openBatchJourney();
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  try {
    await f.context.route('https://autolister.app/api/user/model', async route => {
      await gate;
      await route.fulfill({json:{enabled:false, model:null, invitationState:'seen'}});
    });
    await f.worker.evaluate(async () => {
      await chrome.storage.local.set({selectedLanguage:'it', selectedTitleLanguage:'it', selectedDescriptionLanguage:'it', quickvintLanguagePreferenceTouched:true});
      await chrome.storage.local.remove('listingTourV1:test-user');
    });
    await f.controller.reload();
    const tour = f.controller.locator('#quickvint-listing-tour');
    await expect(tour).toBeVisible();
    await expect(tour).toHaveAttribute('lang','it');
    release();
    await expect(f.controller.locator('#quickvint-model-btn')).toBeEnabled();
    await f.controller.waitForTimeout(2200);
    await expect(tour).toBeVisible();
    expect(f.requests).toHaveLength(0);
  } finally { release(); await f.close(); }
});
