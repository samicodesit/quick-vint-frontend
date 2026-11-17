const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const { createQueue } = require("../lib/telemetry-core.js");

for (const status of [200, 503]) {
  test(`an unreadable HTTP ${status} reply preserves its status and server retry boundary`, async () => {
    let now = 1000;
    let data = { supabaseSession: { user: { id: "a" }, access_token: "local-fixture-token" } };
    let sends = 0;
    const sandbox = {
      AbortController, setTimeout, clearTimeout,
      getAnalyticsClientId: async () => "fixture-client",
      AutoListerTelemetryCore: { createQueue: options => createQueue({ ...options, now: () => now }) },
      fetch: async () => { sends++; return { status, headers: new Headers({ "Retry-After": "120" }),
        json: async () => { throw new SyntaxError("Controlled unreadable response"); } }; },
      chrome: {
        storage: { local: { get: async key => ({ [key]: data[key] }),
          set: async value => { data = { ...data, ...structuredClone(value) }; } },
        onChanged: { addListener() {} } },
        runtime: { onMessage: { addListener() {} }, onStartup: { addListener() {} } },
        alarms: { get: async () => ({ name: "autolister-telemetry-retry" }), onAlarm: { addListener() {} } },
      },
    };
    vm.runInNewContext(fs.readFileSync(path.resolve(__dirname, "../lib/telemetry-background.js"), "utf8"), sandbox);
    const original = { id: "original", event: "token_refresh_failed", source: "extension_background", context: {} };
    await sandbox.AutoListerBackgroundTelemetry.accept(original, "a", true, false);
    const entry = data.autolisterTelemetryV2.events[0];
    assert.equal(entry.lastStatus, status);
    assert.equal(entry.retryCause, status === 503 ? "server" : "unacknowledged");
    assert.equal(entry.retryNotBefore, 121000);
    now = 2000;
    await sandbox.AutoListerBackgroundTelemetry.accept(original, "a", true, false, true,
      "00000000-0000-4000-8000-000000000010");
    assert.equal(sends, 1);
    assert.equal(data.autolisterTelemetryV2.events[0].nextAt, 121000);
  });
}
