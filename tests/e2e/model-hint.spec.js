const { test, expect } = require("@playwright/test");
const fs = require("node:fs");
const path = require("node:path");
const { openBatchJourney } = require("./batch-journey");

test("shows the saved-model hint through the extension model button", async () => {
  const fixture = await openBatchJourney();
  try {
    await fixture.context.route("https://autolister.app/api/user/model", route =>
      route.fulfill({ json: {
        enabled: true, invitationState: "created", listingPhotosAvailable: true,
        model: { state: "ready", imageUrl: "https://storage.test/model-preview.webp" },
      } }),
    );
    await fixture.context.route("https://storage.test/model-preview.webp", route =>
      route.fulfill({ path: path.resolve(__dirname, "../../images/user-model-male.webp"), contentType: "image/webp" }),
    );
    const page = fixture.controller;
    await page.setViewportSize({ width: 1365, height: 900 });
    await page.reload();
    const tour = page.locator("#quickvint-listing-tour");
    if (await tour.isVisible()) await tour.getByRole("button", { name: "Skip" }).click();
    await page.locator("#quickvint-model-btn").click();
    const hint = page.locator("dialog.um-modal .um-preview-hint");
    await expect(hint).toHaveText("Your model will wear your items in future listing photos.");
    await expect(hint.locator("svg")).toBeVisible();
    if (process.env.MODEL_HINT_OUTPUT) {
      fs.mkdirSync(process.env.MODEL_HINT_OUTPUT, { recursive: true });
      await hint.evaluate(el => el.style.visibility = "hidden");
      await page.screenshot({ path: path.join(process.env.MODEL_HINT_OUTPUT, "extension-before.png") });
      await hint.evaluate(el => el.style.visibility = "");
      await page.screenshot({ path: path.join(process.env.MODEL_HINT_OUTPUT, "extension-after.png") });
    }
  } finally {
    await fixture.close();
  }
});
