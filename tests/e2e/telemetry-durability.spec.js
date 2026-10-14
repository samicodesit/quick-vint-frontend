const { test, expect, chromium } = require("@playwright/test");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const http = require("node:http");
const extension = path.resolve(__dirname, "../..");

test("offline auth floods preserve distinct failures and reports through a real worker restart and HTTP reconnect", async () => {
  test.setTimeout(180_000);
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "autolister-telemetry-test-"));
  const received = [];
  let connected = false;
  const server = http.createServer((req, res) => {
    if (!connected) { req.socket.destroy(); return; }
    if (req.method !== "POST" || req.url !== "/api/events/track") {
      res.writeHead(204, { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type, Authorization" });
      res.end(); return;
    }
    let raw = "";
    req.on("data", chunk => { raw += chunk; });
    req.on("end", () => {
      const body = JSON.parse(raw);
      received.push({ body, authorization: req.headers.authorization });
      res.writeHead(200, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
      res.end(JSON.stringify({ acknowledgedIds: body.events.map(event => event.id) }));
    });
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const endpoint = `http://127.0.0.1:${server.address().port}/api/events/track`;
  let context;
  async function launch() {
    context = await chromium.launchPersistentContext(profile, {
      channel: "chromium", headless: true, offline: true,
      args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`],
    });
    const worker = context.serviceWorkers()[0] || await context.waitForEvent("serviceworker");
    await worker.evaluate(endpoint => {
      // Real local HTTP transport, with every external service isolated.
      const nativeFetch = globalThis.fetch.bind(globalThis);
      globalThis.fetch = (url, options) => {
        if (String(url) !== endpoint) return Promise.reject(new Error("External service isolated"));
        return nativeFetch(url, options);
      };
      globalThis.getTelemetryEndpoint = () => endpoint;
    }, endpoint);
    return worker;
  }
  try {
    let worker = await launch();
    const id = new URL(worker.url()).host;
    const page = await context.newPage();
    await page.goto(`chrome-extension://${id}/popup.html`);
    const protectedIds = await page.evaluate(async () => {
      await chrome.storage.local.set({ supabaseSession: { user: { id: "account-a" }, access_token: "token-a" } });
      async function emit(name, input) {
        const prepared = AutoListerTelemetry.prepare(name, input, "extension_background");
        if (!prepared.critical) throw new Error(`Expected critical definition for ${name}`);
        const result = await chrome.runtime.sendMessage({ type: "AUTOLISTER_TELEMETRY", event: prepared.event, accountId: "account-a", critical: prepared.critical, immediate: true });
        if (!result?.queued) throw new Error(`Fixture was not queued: ${JSON.stringify(result)}`);
        return prepared.event.id;
      }
      const failure = await emit("generate_error", { generationAttemptId: "offline-attempt", message: "Controlled distinct failure" });
      const report = await emit("listing_report_submitted", { message: "Controlled saved report" });
      // Exercise simultaneous messages too. All mutations still pass through
      // the worker's real serialized chrome.storage transaction boundary.
      for (let batch = 0; batch < 9; batch++) await Promise.all(Array.from({ length: 25 }, (_, index) => emit("token_refresh_failed", {
        phase: "restore_session", statusCode: 0, attempts: 0, operationId: `refresh-${batch * 25 + index}`,
      })));
      return [failure, report];
    });
    const state = await worker.evaluate(async () => (await chrome.storage.local.get("autolisterTelemetryV2")).autolisterTelemetryV2);
    expect(state.events.map(entry => entry.event.id)).toEqual(expect.arrayContaining(protectedIds));
    expect(state.events.length).toBeLessThanOrEqual(200);
    expect(state.dropped + state.events.reduce((sum, entry) => sum + (entry.event.context?.queueDropped || 0), 0)).toBeGreaterThan(0);
    expect(Buffer.byteLength(JSON.stringify(state))).toBeLessThanOrEqual(524288);
    expect(state.dropCounts?.customerReports || 0).toBe(0);
    await context.close(); context = null;
    worker = await launch();
    connected = true;
    await context.setOffline(false);
    await expect.poll(() => worker.evaluate(async () => {
      const state = (await chrome.storage.local.get("autolisterTelemetryV2")).autolisterTelemetryV2;
      return state.events.every(entry => entry.nextAt <= Date.now());
    }), { timeout: 75_000, intervals: [500, 1000] }).toBe(true);
    await worker.evaluate(() => AutoListerBackgroundTelemetry.flush());
    expect(received.flatMap(request => request.body.events.map(event => event.id))).toEqual(expect.arrayContaining(protectedIds));
    expect(received.every(request => request.authorization === "Bearer token-a")).toBe(true);
    expect(received.every(request => Buffer.byteLength(JSON.stringify(request.body)) <= 49152)).toBe(true);
    // Each activity/alarm flush intentionally drains at most eight requests.
    // A byte-heavy backlog needs several activity signals, not an unbounded flush.
    await expect.poll(async () => {
      await worker.evaluate(() => AutoListerBackgroundTelemetry.flush());
      return worker.evaluate(async () => (await chrome.storage.local.get("autolisterTelemetryV2")).autolisterTelemetryV2.events.length);
    }, { timeout: 10_000 }).toBe(0);
    const reconnectedPage = await context.newPage();
    await reconnectedPage.goto(`chrome-extension://${id}/popup.html`);
    const acknowledged = await reconnectedPage.evaluate(async () => {
      const prepared = AutoListerTelemetry.prepare("listing_report_submitted", { message: "Controlled reconnected report" });
      const result = await chrome.runtime.sendMessage({ type: "AUTOLISTER_TELEMETRY", event: prepared.event, accountId: "account-a", critical: prepared.critical, immediate: true });
      return { id: prepared.event.id, result };
    });
    expect(acknowledged.result.accepted).toBe(true);
    expect(received.at(-1).body.events.map(event => event.id)).toContain(acknowledged.id);
  } finally {
    await context?.close();
    await new Promise(resolve => server.close(resolve));
    if (path.dirname(profile) !== os.tmpdir() || !path.basename(profile).startsWith("autolister-telemetry-test-")) throw new Error("Unexpected test profile path");
    fs.rmSync(profile, { recursive: true, force: true });
  }
});

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
