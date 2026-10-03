const { test, expect } = require("@playwright/test");
const fs = require("node:fs");
const path = require("node:path");
const api = path.resolve(__dirname, "../../../quick-vint-api");
const available = fs.existsSync(path.join(api, "public/admin-issues.js"));

test("Issues paginates, loads details lazily, escapes evidence and saves explicit state", async ({ page }) => {
  test.skip(!available, "Coordinated API checkout is unavailable");
  const styles = fs.readFileSync(path.join(api, "src/pages/admin.html"), "utf8").match(/<style[^>]*>([\s\S]*?)<\/style>/)?.[1] || "";
  await page.setContent(`<style>${styles}</style><main id="issues" style="max-width:1000px;margin:24px auto;padding:20px"></main><div id="modal"></div>`);
  await page.evaluate(() => {
    window.__calls = [];
    const issue = { id: "a423926a-35a6-4bf5-8027-8ab335c71110", event: "fields_apply_failed", stage: "generation_received", source: "extension_content", severity: "blocking", status: "open", release: "1.4.6", market: "nl", occurrences: 3, first_seen: new Date().toISOString(), last_seen: new Date().toISOString(), notification_status: "sent" };
    window.fetchAPI = async (url, options = {}) => {
      __calls.push({ url, options });
      const params = new URL(url, "https://autolister.app").searchParams;
      if (params.get("action") === "issue-state") { issue.status = JSON.parse(options.body).status; return { ok: true }; }
      if (params.get("action") === "issue-detail") return { issue: { ...issue, examples: [{ occurredAt: issue.last_seen, identityVerified: true, source: "extension_content", context: { message: '<img src=x onerror="window.__xss=true">', lastConfirmedStage: "generation_received" } }] }, operations: [{ operation_id: "attempt-1", stage: "generation_received", user_id: "user-1", updated_at: issue.last_seen, progress: { photoCount: 3 } }] };
      return { issues: [issue], nextCursor: params.has("cursor") ? null : "page-two", health: { groups: 51, flows: 100, receipts: 200, budgets: [{ emails: 1, sentry: 1, sweep_at: issue.last_seen, cleanup_at: issue.last_seen }] } };
    };
    window.openModal = (_title, html) => { document.getElementById("modal").innerHTML = html; };
    window.openLogsForUser = (id) => { window.__logsUser = id; };
    window.openAccountForIssue = (id) => { window.__accountUser = id; };
  });
  await page.addScriptTag({ path: path.join(api, "public/admin-issues.js") });
  await page.evaluate(() => AutoListerIssues.render(document.getElementById("issues")));
  expect(await page.evaluate(() => __calls.some(call => call.url.includes("issue-detail")))).toBe(false);
  await page.getByRole("button", { name: "View evidence", exact: true }).click();
  await expect(page.locator("#issue-detail-content")).toContainText("<img src=x");
  expect(await page.evaluate(() => window.__xss)).toBeUndefined();
  await page.getByRole("button", { name: "Resolve", exact: true }).click();
  await expect(page.locator("#issue-detail-content")).toContainText("resolved");
  await page.getByRole("button", { name: "Account logs", exact: true }).click();
  expect(await page.evaluate(() => window.__logsUser)).toBe("user-1");
  await page.getByRole("button", { name: "Account", exact: true }).click();
  expect(await page.evaluate(() => window.__accountUser)).toBe("user-1");
  await page.getByRole("button", { name: "Next 50", exact: true }).click();
  await expect(page.getByRole("button", { name: "Next 50", exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => __calls.some(call => call.url.includes("cursor=page-two")))).toBe(true);
  await page.locator("[data-issue-status]").selectOption("all");
  await expect(page.locator("[data-issue-status]")).toHaveValue("all");
  await page.locator("#modal").evaluate(element => { element.innerHTML = ""; });
  await page.setViewportSize({ width: 1200, height: 900 });
  await page.screenshot({ path: test.info().outputPath("issues-desktop.png"), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: test.info().outputPath("issues-mobile.png"), fullPage: true });
});
