const { expect, test } = require("@playwright/test");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

test("the bridge fills supported Vinted fixture fields without publishing", async ({ page }) => {
  await page.goto(pathToFileURL(path.resolve(__dirname, "../fixtures/vinted-listing.html")).href);
  await page.addScriptTag({ path: path.resolve(__dirname, "../../ops-bridge.js") });
  const result = await page.evaluate(() => {
    const packet = { title: "Levi's jeans W30", description: "Small scuff at hem" };
    return window.OpsBridge.fillListing(packet, document, "/items/new");
  });
  expect(result.state).toBe("filled");
  await expect(page.getByTestId("title--input")).toHaveValue("Levi's jeans W30");
  await expect(page.getByTestId("description--input")).toHaveValue("Small scuff at hem");
  expect(result.unsupportedFields).toContain("price");
  expect(page.url()).toContain("vinted-listing.html");
});
