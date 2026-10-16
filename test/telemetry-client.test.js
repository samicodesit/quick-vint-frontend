const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { randomUUID } = require("node:crypto");
const vm = require("node:vm");

test("a late account-owned event cannot be reassigned during its asynchronous identity read", async () => {
  let userId = "account-a";
  let release;
  const readMayFinish = new Promise(resolve => { release = resolve; });
  const received = [];
  const sandbox = { TextEncoder, crypto: { randomUUID },
    chrome: { storage: { local: { async get() { await readMayFinish; return { supabaseSession: { user: { id: userId } } }; } } }, runtime: { getManifest: () => ({ version: "1.4.16" }) } },
    AutoListerBackgroundTelemetry: { async accept(event, accountId) { received.push({ event, accountId }); return { queued: true }; } },
  };
  vm.createContext(sandbox);
  for (const name of ["registry", "client"]) vm.runInContext(readFileSync(`lib/telemetry-${name}.js`, "utf8"), sandbox);
  const stale = sandbox.AutoListerTelemetry.track("generate_error", { generationAttemptId: "old-attempt" }, "extension_content", false, "account-a");
  userId = "account-b";
  release();
  assert.equal((await stale).reason, "account_changed");
  assert.equal(received.length, 0);
  await sandbox.AutoListerTelemetry.track("generate_success", { generationAttemptId: "new-attempt" }, "extension_content", false, "account-b");
  assert.equal(received.length, 1);
  assert.equal(received[0].accountId, "account-b");
  assert.equal(received[0].event.context.generationAttemptId, "new-attempt");
  assert.equal(JSON.stringify(received[0].event).includes("account-b"), false);
});
