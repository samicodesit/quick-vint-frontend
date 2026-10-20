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
    attempt: 1, elapsedMs: 0, signInRequired: false,
    firstFailureObservedAt: "1970-01-01T00:00:01.000Z", firstFailureEvent: "token_refresh_failed" });
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

test("a recovery carries the first failure facts even when its separate receipt is unavailable", async () => {
  const f = fixture();
  let clientInfo = { clientId: "client-first", version: "1.4.22" };
  f.options.clientInfo = async () => clientInfo;
  let observer = f.restart();
  await observer.observe(f.event("token_refresh_failed", "original", {
    errorCode: "REFRESH_RETRIES_EXHAUSTED", errorName: "AuthRetryableFetchError",
    statusCode: 0, phase: "restore_session", navigatorOnline: false,
    message: "Bearer secret-must-not-be-retained", token: "secret-must-not-be-retained",
  }), "owner");
  assert.equal(JSON.stringify(f.saved()).includes("secret-must-not-be-retained"), false);
  f.advance(60000);
  clientInfo = { clientId: "client-later", version: "1.4.23" };
  observer = f.restart();
  await observer.observe(f.event("token_refresh_failed", "later", { statusCode: 500 }), "owner");
  await observer.observe(f.event("token_refresh_success", "renewal"), "owner");
  const context = f.results[0].context;
  assert.equal(context.operationId, "original");
  assert.equal(context.firstFailureObservedAt, "1970-01-01T00:00:01.000Z");
  assert.equal(context.firstFailureClientId, "client-first");
  assert.equal(context.firstFailureVersion, "1.4.22");
  assert.equal(context.firstFailureEvent, "token_refresh_failed");
  assert.equal(context.firstFailureErrorCode, "REFRESH_RETRIES_EXHAUSTED");
  assert.equal(context.firstFailureErrorName, "AuthRetryableFetchError");
  assert.equal(context.firstFailureStatusCode, 0);
  assert.equal(context.firstFailurePhase, "restore_session");
  assert.equal(context.firstFailureOnline, false);
  assert.equal(context.resultStatus, "silent_renewed");
  assert.equal(context.signInRequired, false);
});

test("first-failure facts never cross accounts and optional metadata failure does not discard recovery", async () => {
  const f = fixture();
  f.options.clientInfo = async () => ({ clientId: "browser", version: "1.4.23" });
  const observer = f.restart();
  await observer.observe(f.event("token_refresh_failed", "owner-a", { errorCode: "A" }), "a");
  await observer.observe(f.event("token_refresh_failed", "owner-b", { errorCode: "B" }), "b");
  await observer.observe(f.event("token_refresh_success", "renewal-a"), "a");
  assert.equal(f.results.length, 0);
  await observer.observe(f.event("token_refresh_success", "renewal-b"), "b");
  assert.equal(f.results[0].context.operationId, "owner-b");
  assert.equal(f.results[0].context.firstFailureErrorCode, "B");
  f.options.clientInfo = async () => { throw Error("metadata unavailable"); };
  const restarted = f.restart();
  await restarted.observe(f.event("token_refresh_failed", "next"), "b");
  await restarted.observe(f.event("token_refresh_success", "renewal-next"), "b");
  assert.equal(f.results[1].context.operationId, "next");
  assert.equal(f.results[1].context.firstFailureClientId, undefined);
});

test("an older pending observation never invents first-failure facts at upgrade", async () => {
  const f = fixture();
  f.options.load = async () => ({ owner: "owner", operationId: "legacy", entryPoint: "startup_restore",
    startedAt: 1000, attempt: 1, signInRequired: false });
  f.options.clientInfo = async () => ({ clientId: "current-browser", version: "1.4.23" });
  await f.restart().observe(f.event("token_refresh_success", "renewal"), "owner");
  assert.equal(f.results[0].context.operationId, "legacy");
  assert.equal(f.results[0].context.firstFailureObservedAt, undefined);
  assert.equal(f.results[0].context.firstFailureClientId, undefined);
});
