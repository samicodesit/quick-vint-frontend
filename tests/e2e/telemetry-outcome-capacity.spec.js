const { test, expect, chromium } = require("@playwright/test");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const http = require("node:http");

test("auth outcomes survive repeated failed transport, worker restart and duplicate acknowledgement", async () => {
  test.setTimeout(180_000);
  const extension = process.env.TELEMETRY_EXTENSION_PATH || path.resolve(__dirname, "../..");
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "autolister-outcome-capacity-"));
  const accepted = new Map();
  const requests = [];
  let connected = false;
  let loseFirstReply = true;
  const server = http.createServer((req, res) => {
    if (!connected) { req.socket.destroy(); return; }
    if (req.method !== "POST") { res.writeHead(204, { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type, Authorization" }); res.end(); return; }
    let raw = "";
    req.on("data", chunk => { raw += chunk; });
    req.on("end", () => {
      const body = JSON.parse(raw);
      const duplicates = [];
      for (const event of body.events) {
        if (accepted.has(event.id)) duplicates.push(event.id);
        else accepted.set(event.id, event);
      }
      requests.push({ body, authorization: req.headers.authorization, bytes: Buffer.byteLength(raw), duplicates });
      if (loseFirstReply) { loseFirstReply = false; req.socket.destroy(); return; }
      res.writeHead(200, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
      res.end(JSON.stringify({ acknowledgedIds: body.events.filter(e => !duplicates.includes(e.id)).map(e => e.id), duplicateIds: duplicates }));
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
    await context.route(/^https?:\/\//, route => route.request().url().startsWith(endpoint) ? route.continue() : route.abort());
    const worker = context.serviceWorkers()[0] || await context.waitForEvent("serviceworker");
    await worker.evaluate(async endpoint => {
      const nativeFetch = globalThis.fetch.bind(globalThis);
      globalThis.__telemetryFastOffline = false;
      globalThis.fetch = (url, options) => {
        if (String(url) !== endpoint) return Promise.reject(new Error("External service isolated"));
        if (globalThis.__telemetryFastOffline) return Promise.reject(new Error("Controlled continued outage"));
        return nativeFetch(url, options);
      };
      globalThis.getTelemetryEndpoint = () => endpoint;
      // The fixture drives every retry explicitly. Disable only this disposable
      // profile's timer so deadline edits cannot race a real alarm transaction.
      await chrome.alarms.clear("autolister-telemetry-retry");
    }, endpoint);
    return worker;
  }
  try {
    let worker = await launch();
    const proof = await worker.evaluate(async () => {
      await chrome.storage.local.set({ supabaseSession: { user: { id: "fixture-account" }, access_token: "fixture-token" } });
      const emitted = [];
      const protectedIds = [];
      async function emit(name, input, protect = false) {
        const p = AutoListerTelemetry.prepare(name, input, "extension_background");
        emitted.push(p.event.id);
        if (protect) protectedIds.push(p.event.id);
        // Match the released background observer's explicit critical override.
        const critical = name === "auth_session_result" || p.critical;
        const result = await AutoListerBackgroundTelemetry.accept(p.event, "fixture-account", critical, true);
        if (!result.queued && (protect || result.reason)) throw new Error(`Fixture enqueue failed: ${name}`);
      }
      await emit("generate_error", { generationAttemptId: "fixture-listing", message: "Controlled distinct failure" }, true);
      // One real disconnected transport attempt above, then immediate controlled
      // failures compress the prolonged outage without waiting ten hours.
      globalThis.__telemetryFastOffline = true;
      await emit("listing_report_submitted", { message: "Controlled retained report" }, true);
      for (let attempt = 0; attempt < 220; attempt++) {
        if ([5, 50, 100].includes(attempt)) await emit("auth_session_result", { operationId: `session-${attempt}`, resultStatus: "silent_renewed" }, true);
        if (attempt === 100) {
          await emit("auth_action_result", { operationId: "fixture-action", resultStatus: "blocked" }, true);
          await emit("auth_action_result", { operationId: "fixture-action", resultStatus: "recovered" }, true);
        }
        await emit("token_refresh_start", { phase: "restore_session", operationId: `refresh-${attempt}` });
        await emit("token_refresh_failed", { phase: "restore_session", operationId: `refresh-${attempt}`, statusCode: 0, message: "Controlled offline failure" });
        // Each fresh attempt exercises the real queue; older backoff deadlines
        // remain intact during the outage and all mutations keep their owner.
        await AutoListerBackgroundTelemetry.flush();
      }
      await AutoListerBackgroundTelemetry.flush();
      const { autolisterTelemetryV2: state } = await chrome.storage.local.get("autolisterTelemetryV2");
      return { emitted, protectedIds, retainedIds: state.events.map(e => e.event.id), queueBytes: new TextEncoder().encode(JSON.stringify(state)).length,
        accounted: state.events.length + state.dropped + state.events.reduce((sum, e) => sum + (e.event.context?.queueDropped || 0), 0) };
    });
    expect(proof.retainedIds).toEqual(expect.arrayContaining(proof.protectedIds));
    expect(proof.retainedIds.length).toBeLessThanOrEqual(200);
    expect(proof.queueBytes).toBeLessThanOrEqual(524288);
    expect(proof.accounted).toBe(proof.emitted.length);
    await context.close(); context = null;
    worker = await launch();
    connected = true;
    await context.setOffline(false);
    for (let attempt = 0; attempt < 15; attempt++) {
      await worker.evaluate(async () => {
        await AutoListerBackgroundTelemetry.flush();
        const { autolisterTelemetryV2: state } = await chrome.storage.local.get("autolisterTelemetryV2");
        for (const entry of state.events) entry.nextAt = 0;
        await chrome.storage.local.set({ autolisterTelemetryV2: state });
        await AutoListerBackgroundTelemetry.flush();
      });
      if (await worker.evaluate(async () => (await chrome.storage.local.get("autolisterTelemetryV2")).autolisterTelemetryV2.events.length === 0)) break;
    }
    expect([...accepted.keys()]).toEqual(expect.arrayContaining(proof.protectedIds));
    expect(requests.some(r => r.duplicates.length > 0)).toBe(true);
    expect(requests.every(r => r.authorization === "Bearer fixture-token" && r.bytes <= 49152 && r.body.events.length <= 25)).toBe(true);
    const drops = [...accepted.values()].reduce((sum, e) => sum + (e.context?.queueDropped || 0), 0);
    const pendingCounters = await worker.evaluate(async () => (await chrome.storage.local.get("autolisterTelemetryV2")).autolisterTelemetryV2.dropped);
    expect(accepted.size + drops + pendingCounters).toBe(proof.emitted.length);
    // Counts can outlive the final frozen carrier. They stay durable until
    // ordinary activity supplies the next carrier, including after restart.
    await context.close(); context = null;
    worker = await launch();
    await context.setOffline(false);
    const activityId = await worker.evaluate(async () => {
      const p = AutoListerTelemetry.prepare("listing_tools_ready", {}, "extension_content");
      const result = await AutoListerBackgroundTelemetry.accept(p.event, "fixture-account", p.critical, true);
      if (!result.accepted) throw new Error("Reconnected activity not acknowledged");
      return p.event.id;
    });
    expect(accepted.has(activityId)).toBe(true);
    const finalDrops = [...accepted.values()].reduce((sum, e) => sum + (e.context?.queueDropped || 0), 0);
    expect(accepted.size + finalDrops).toBe(proof.emitted.length + 1);
    expect([...accepted.values()].reduce((sum, e) => sum + (e.context?.queueDroppedCustomerReports || 0), 0)).toBe(0);
    expect(await worker.evaluate(async () => {
      const s = (await chrome.storage.local.get("autolisterTelemetryV2")).autolisterTelemetryV2;
      return { events: s.events.length, dropped: s.dropped };
    })).toEqual({ events: 0, dropped: 0 });
  } finally {
    await context?.close();
    await new Promise(resolve => server.close(resolve));
    if (path.dirname(profile) !== os.tmpdir() || !path.basename(profile).startsWith("autolister-outcome-capacity-")) throw new Error("Unexpected disposable profile path");
    fs.rmSync(profile, { recursive: true, force: true });
  }
});
