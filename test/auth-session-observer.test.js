const test = require("node:test");
const assert = require("node:assert/strict");
const { createObserver } = require("../lib/auth-session-observer");

function fixture() {
  let saved, clock = 1000;
  const results = [];
  const options = { load: async () => saved, save: async value => { saved = structuredClone(value); },
    emit: async event => { results.push(event); return { queued: true }; }, now: () => clock };
  const event = (name, id, context = {}) => ({ event: name, id, occurredAt: new Date(clock).toISOString(),
    source: "extension_background", context: { operationId: id, entryPoint: "startup_restore", ...context } });
  return { options, results, event, restart: () => createObserver(options), advance: ms => { clock += ms; },
    saved: () => saved };
}

test("background failure survives worker restart and links only the same owner's silent renewal", async () => {
  const f = fixture(); let observer = f.restart();
  await observer.observe(f.event("token_refresh_failed", "failure"), "owner");
  observer = f.restart();
  await observer.observe(f.event("token_refresh_success", "other"), "other-owner");
  assert.equal(f.results.length, 0);
  await observer.observe(f.event("token_refresh_success", "renewal"), "owner");
  assert.equal(f.results.length, 1);
  assert.deepEqual(f.results[0].context, { operationId: "failure", authRefreshOperationId: "renewal",
    entryPoint: "startup_restore", resultStatus: "silent_renewed", reason: "token_refresh_success",
    attempt: 1, elapsedMs: 0, signInRequired: false });
  await observer.observe(f.event("token_refresh_success", "duplicate"), "owner");
  assert.equal(f.results.length, 1);
});

test("only explicit fresh sign-in establishes sign-in, and only rejection establishes it was required", async () => {
  const f = fixture(); const observer = f.restart();
  await observer.observe(f.event("token_refresh_failed", "failure"), "owner");
  await observer.observe(f.event("token_refresh_expired", "rejected"), "owner");
  await observer.observe(f.event("auth_success", "signin", { reason: "email_otp" }), "owner");
  assert.equal(f.results[0].context.resultStatus, "signed_in");
  assert.equal(f.results[0].context.reason, "email_otp");
  assert.equal(f.results[0].context.signInRequired, true);
});

test("ordinary success emits no extra record, and expired episodes do not invent recovery", async () => {
  const f = fixture(); const observer = f.restart();
  await observer.observe(f.event("token_refresh_success", "normal"), "owner");
  assert.equal(f.results.length, 0);
  await observer.observe(f.event("token_refresh_failed", "failure"), "owner");
  f.advance(86400001);
  await observer.observe(f.event("auth_success", "signin"), "owner");
  assert.equal(f.results.length, 0);
});

test("failed enqueue retries one stable event ID across restart without storing credentials", async () => {
  const f = fixture(); let fail = true;
  f.options.emit = async event => { f.results.push(event); return { queued: !fail }; };
  let observer = f.restart();
  await observer.observe(f.event("token_refresh_failed", "failure", { token: "secret" }), "owner");
  await observer.observe(f.event("token_refresh_success", "renewal"), "owner");
  assert.ok(f.saved().outcome);
  fail = false; observer = f.restart(); await observer.resume("owner");
  assert.equal(f.results.length, 2);
  assert.equal(f.results[0].id, f.results[1].id);
  assert.equal(JSON.stringify(f.saved()).includes("secret"), false);
});

test("storage/telemetry failures remain fail-open", async () => {
  const observer = createObserver({ load: async () => { throw Error("storage"); }, save: async () => {}, emit: async () => {} });
  await assert.doesNotReject(observer.observe({ event: "token_refresh_failed" }, "owner"));
});
