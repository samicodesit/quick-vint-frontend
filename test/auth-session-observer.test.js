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
  assert.equal(f.results[0].context.reason, "auth_success");
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


test("a bounded original journal survives failed admission, restart and retry until protected queue admission", async () => {
  const f = fixture(); const originals = []; let accepted = false;
  f.options.emitOriginal = async event => { originals.push(structuredClone(event)); return { queued: accepted, accepted }; };
  const original = f.event("token_refresh_failed", "00000000-0000-4000-8000-000000000001", {
    errorCode: "REFRESH_RETRIES_EXHAUSTED", errorName: "AuthRetryableFetchError", statusCode: 0,
    phase: "restore_session", navigatorOnline: false, access_token: "never-save", message: "never-save", photos: ["never-save"],
  });
  original.extensionVersion = "1.4.39";
  let observer = f.restart(); await observer.observe(original, "owner");
  assert.equal(f.saved().original.id, original.id);
  assert.equal(JSON.stringify(f.saved()).includes("never-save"), false);
  assert.ok(JSON.stringify(f.saved()).length < 2500);
  await observer.observe(f.event("token_refresh_success", "renewal"), "owner");
  const outcomeId = f.saved().outcome.id;
  observer = f.restart(); await observer.resume("another-owner");
  assert.equal(originals.length, 1);
  accepted = true; await observer.resume("owner");
  assert.equal(f.saved(), null); assert.equal(originals.length, 2);
  assert.deepEqual(originals[0], originals[1]);
  assert.equal(originals[0].occurredAt, original.occurredAt);
  assert.equal(f.results[1].id, outcomeId);
});

test("failed original replay still queues the outcome, expires without replay and never invents a legacy event", async () => {
  const f = fixture(); let calls = 0;
  f.options.emitOriginal = async () => { calls++; throw Error("controlled transport failure"); };
  const original = f.event("token_refresh_failed", "00000000-0000-4000-8000-000000000002");
  let observer = f.restart(); await observer.observe(original, "owner");
  await observer.observe(f.event("token_refresh_success", "renewal"), "owner");
  assert.equal(f.results.length, 1); assert.ok(f.saved().original); assert.equal(calls, 1);
  f.advance(86400001); observer = f.restart(); await observer.resume("owner");
  assert.equal(f.saved(), null); assert.equal(calls, 1);
  await observer.observe(f.event("token_refresh_failed", "legacy-operation-not-transport-id"), "owner");
  await observer.observe(f.event("token_refresh_success", "renewal"), "owner");
  assert.equal(f.saved(), null); assert.equal(calls, 1);
});


test("acknowledging an older journal cannot consume the next failure observation", async () => {
  const f = fixture(); let accepted = false;
  f.options.emitOriginal = async () => ({ queued: accepted, accepted });
  const observer = f.restart();
  const first = f.event("token_refresh_failed", "00000000-0000-4000-8000-000000000001");
  await observer.observe(first, "owner");
  await observer.observe(f.event("token_refresh_success", "renewal"), "owner");
  assert.ok(f.saved().outcome); accepted = true;
  const next = f.event("token_refresh_failed", "00000000-0000-4000-8000-000000000002");
  await observer.observe(next, "owner");
  assert.equal(f.saved()?.operationId, next.context.operationId);
  assert.equal(f.saved()?.original.id, next.id); assert.equal(f.saved()?.outcome, undefined);
});

test("a queued original awaiting acknowledgment does not hide a later auth episode", async () => {
  const f = fixture(); f.options.emitOriginal = async () => ({ queued: true, accepted: false });
  const observer = f.restart();
  await observer.observe(f.event("token_refresh_failed", "00000000-0000-4000-8000-000000000001"), "owner");
  await observer.observe(f.event("token_refresh_success", "renewal-one"), "owner");
  assert.equal(f.saved(), null);
  await observer.observe(f.event("token_refresh_failed", "00000000-0000-4000-8000-000000000002"), "owner");
  await observer.observe(f.event("token_refresh_success", "renewal-two"), "owner");
  assert.equal(f.results.length, 2);
  assert.notEqual(f.results[0].context.operationId, f.results[1].context.operationId);
});
