const { test, expect } = require("@playwright/test");
const path = require("node:path");
const { openBatchJourney } = require("./batch-journey");
const root = path.resolve(__dirname, "../..");

test("model funnel records transitions once and excludes appearance data", async ({ page }) => {
  await page.setContent('<section id="model"></section>');
  await page.addScriptTag({ path: path.join(root, "lib/shared-ui-copy.js") });
  await page.addScriptTag({ path: path.join(root, "lib/user-model-copy.js") });
  await page.addScriptTag({ path: path.join(root, "lib/user-model-ui.js") });
  await page.evaluate(() => {
    window.events = [];
    window.modelState = { enabled: false, model: null };
    window.dispose = AutoListerModelUI.mount(document.querySelector("#model"), {
      track: (event, context) => window.events.push({ event, context }),
      initialPreferences: {gender:"female",hair:"red",build:"plus_size",skinTone:"tone_3",heightCm:175},
      request: async (method, body) => {
        if (body?.action === "create") window.modelState = {enabled:false,model:{state:"queued",operationId:"operation-1"}};
        return structuredClone(window.modelState);
      },
    });
  });
  await page.getByRole("button", {name:"Create model",exact:true}).click();
  await expect(page.getByRole("status").first()).toContainText("Creating");
  await page.evaluate(() => {
    window.modelState = {enabled:true,model:{state:"ready",operationId:"operation-1",imageUrl:"about:blank"}};
    window.dispatchEvent(new Event("focus"));
  });
  await expect(page.getByRole("switch")).toBeVisible();
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  const events = await page.evaluate(() => window.events);
  for (const event of ["model_view_opened","model_setup_started","model_creation_requested","model_creation_accepted","model_creation_completed"])
    expect(events.filter(e => e.event === event)).toHaveLength(1);
  expect(JSON.stringify(events)).not.toMatch(/female|plus_size|heightCm|skinTone|imageUrl/);
  await page.evaluate(() => window.dispose());
});

test("tour emits automatic exposure, skip, replay and completion through the durable transport", async () => {
  const f = await openBatchJourney();
  try {
    const p = f.controller;
    await expect(p.locator("#quickvint-model-control")).toBeVisible();
    await expect(p.locator("#quickvint-listing-tour")).toBeVisible();
    await p.locator("#quickvint-listing-tour").getByRole("button",{name:"Skip",exact:true}).click();
    await p.locator("#quickvint-more-btn").click();
    await p.locator("#quickvint-tour-replay").click();
    await p.locator("#quickvint-listing-tour").getByRole("button",{name:"Next",exact:true}).click();
    await p.locator("#quickvint-listing-tour").getByRole("button",{name:"Next",exact:true}).click();
    await p.locator("#quickvint-listing-tour").getByRole("button",{name:"Done",exact:true}).click();
    await expect.poll(() => f.events.filter(e=>e.event === "listing_tour_completed").length).toBe(1);
    for(const event of ["listing_tour_offered","listing_tour_skipped"])
      expect(f.events.filter(e=>e.event===event)).toHaveLength(1);
    const starts=f.events.filter(e=>e.event==="listing_tour_started");
    expect(starts).toHaveLength(2);
    expect(starts.map(e=>e.context.entryPoint)).toEqual(["automatic","help"]);
    expect(f.events.filter(e=>e.event === "listing_tour_closed")).toHaveLength(0);
    expect(f.requests).toHaveLength(0);
  } finally { await f.close(); }
});
