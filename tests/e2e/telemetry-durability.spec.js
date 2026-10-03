const { test, expect, chromium } = require("@playwright/test");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const extension = path.resolve(__dirname, "../..");

test("a real MV3 queue survives browser shutdown and resumes without another account's credentials", async () => {
  test.setTimeout(100_000);
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "autolister-telemetry-test-"));
  let context;
  async function launch() {
    // Offline for the entire test. No live endpoint can receive fixture events.
    context = await chromium.launchPersistentContext(profile, {
      channel: "chromium", headless: true, offline: true,
      args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`],
    });
    return context.serviceWorkers()[0] || await context.waitForEvent("serviceworker");
  }
  try {
    let worker = await launch();
    await worker.evaluate(async () => {
      await chrome.storage.local.set({ supabaseSession: { user: { id: "account-a" }, access_token: "token-a" } });
      await AutoListerBackgroundTelemetry.accept(AutoListerTelemetry.prepare("fields_apply_failed", { message: "Synthetic offline failure" }).event, "account-a", true, true);
    });
    const queued = await worker.evaluate(async () => (await chrome.storage.local.get("autolisterTelemetryV2")).autolisterTelemetryV2.events);
    expect(queued).toHaveLength(1);
    const id = queued[0].event.id;
    // Restart with B already persisted. Keep the real retry deadline instead
    // of racing fixture storage writes against the worker's queue transactions.
    await worker.evaluate(async () => {
      await chrome.storage.local.set({ supabaseSession: { user: { id: "account-b" }, access_token: "token-b" } });
      await AutoListerBackgroundTelemetry.flush();
    });
    await context.close(); context = null;
    worker = await launch();
    await worker.evaluate(async () => {
      globalThis.__deliveries = [];
      globalThis.fetch = async (_url, options) => {
        const body = JSON.parse(options.body);
        __deliveries.push({ body, authorization: options.headers.Authorization });
        return { status: 200, headers: new Headers(), json: async () => ({ acknowledgedIds: body.events.map(event => event.id) }) };
      };
      await AutoListerBackgroundTelemetry.flush();
    });
    expect(await worker.evaluate(() => __deliveries.length)).toBe(0);
    await expect.poll(() => worker.evaluate(async () => {
      const state = (await chrome.storage.local.get("autolisterTelemetryV2")).autolisterTelemetryV2;
      return state.events[0].nextAt <= Date.now();
    }), { timeout: 70_000, intervals: [500, 1000] }).toBe(true);
    await worker.evaluate(() => AutoListerBackgroundTelemetry.flush());
    expect(await worker.evaluate(() => __deliveries.length)).toBe(0);
    await worker.evaluate(async () => {
      await chrome.storage.local.set({ supabaseSession: { user: { id: "account-a" }, access_token: "token-a" } });
      await AutoListerBackgroundTelemetry.flush();
    });
    await expect.poll(() => worker.evaluate(() => __deliveries.length)).toBe(1);
    const delivered = await worker.evaluate(() => __deliveries[0]);
    expect(delivered.authorization).toBe("Bearer token-a");
    expect(delivered.body.events[0].id).toBe(id);
    expect(await worker.evaluate(async () => (await chrome.storage.local.get("autolisterTelemetryV2")).autolisterTelemetryV2.events.length)).toBe(0);
    expect(await worker.evaluate(async () => Boolean(await chrome.alarms.get("autolister-telemetry-retry")))).toBe(true);
  } finally {
    await context?.close();
    if (path.dirname(profile) !== os.tmpdir() || !path.basename(profile).startsWith("autolister-telemetry-test-")) throw new Error("Unexpected test profile path");
    fs.rmSync(profile, { recursive: true, force: true });
  }
});
