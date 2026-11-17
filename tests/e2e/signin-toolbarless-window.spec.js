const { test, expect } = require("@playwright/test");
const { openBatchJourney } = require("./batch-journey");

test("a toolbarless Chrome window opens the full-tab sign-in fallback after the native popup error", async () => {
  const flow = await openBatchJourney({ session: {}, readySelector: "#quickvint-signin-btn" });
  try {
    await expect(flow.controller.locator("#quickvint-signin-btn")).toBeVisible();
    const window = await flow.worker.evaluate(async tabId => chrome.windows.create({ tabId, type: "popup", focused: true }), flow.sourceTabId);
    expect(window.type).toBe("popup");
    const pageOpened = flow.context.waitForEvent("page");
    await flow.controller.locator("#quickvint-signin-btn").click();
    const page = await pageOpened;
    await expect(page).toHaveURL(/chrome-extension:\/\/[^/]+\/popup.html\?source=vinted_signin_fallback/);
    await expect(page.locator("#emailInput")).toBeVisible();
    await expect(page.locator("#sendMagicLinkBtn")).toBeEnabled();
    await expect.poll(() => flow.events.some(event => event.event === "signin_popup_failed" &&
      /no toolbar/i.test(event.context?.message || ""))).toBe(true);
    await expect.poll(() => flow.events.some(event => event.event === "signin_auth_tab_opened")).toBe(true);
    await flow.restartWorker();
    await expect(page.locator("#emailInput")).toBeVisible();
    expect(flow.requests).toHaveLength(0);
  } finally { await flow.close(); }
});
