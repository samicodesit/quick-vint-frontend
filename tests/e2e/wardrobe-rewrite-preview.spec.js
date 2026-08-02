const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { test, expect } = require("@playwright/test");

const previewUrl = pathToFileURL(
  path.join(__dirname, "../../design-system/wardrobe-rewrite-widget.html"),
).href;

test("wardrobe rewrite widget stays compact without overlapping the profile", async ({ page }) => {
  for (const viewport of [
    { name: "wide", width: 1440, height: 1000 },
    { name: "medium", width: 900, height: 900 },
    { name: "narrow", width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(previewUrl);

    await expect(
      page.getByRole("heading", { name: "Let's rewrite your listings" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Rewrite my listings" }),
    ).toBeVisible();

    const layout = await page.evaluate(() => {
      const rect = (selector) => {
        const { top, right, bottom, left, width, height } = document
          .querySelector(selector)
          .getBoundingClientRect();
        return { top, right, bottom, left, width, height };
      };
      const widget = rect(".qv-rewrite-widget");
      const summary = rect("[data-profile-summary]");
      const actions = rect("[data-profile-actions]");
      const body = document.querySelector(".qv-rewrite-widget__body");
      return {
        widget,
        summary,
        actions,
        bodyVisible: getComputedStyle(body).display !== "none",
        overflow:
          document.documentElement.scrollWidth >
          document.documentElement.clientWidth,
      };
    });

    const doesNotOverlap = (a, b) =>
      a.bottom <= b.top ||
      a.top >= b.bottom ||
      a.left >= b.right ||
      a.right <= b.left;

    expect(layout.overflow, `${viewport.name} viewport overflowed`).toBe(false);
    expect(
      layout.widget.height,
      `${viewport.name} widget became too tall`,
    ).toBeLessThanOrEqual(180);
    expect(doesNotOverlap(layout.widget, layout.actions)).toBe(true);
    expect(doesNotOverlap(layout.widget, layout.summary)).toBe(true);
    expect(layout.bodyVisible).toBe(viewport.name !== "narrow");
    if (viewport.name === "medium") {
      expect(
        layout.actions.top,
        "medium follow controls should remain above the rewrite card",
      ).toBeLessThan(layout.widget.top);
    }
  }
});
