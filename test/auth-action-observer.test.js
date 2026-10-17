const assert = require("node:assert/strict");
const test = require("node:test");
const { createObserver } = require("../lib/auth-action-observer");

function setup() {
  const events = []; let owner = "account-1"; let clock = 1000; let sequence = 0;
  const observer = createObserver({ track: (name, context, expectedOwner) => events.push({ name, context, expectedOwner }),
    makeId: () => `action-${++sequence}`, getOwner: () => owner, now: () => clock });
  const begin = (scope = "same-photos-and-settings", generationAttemptId = "generation-1") => observer.begin({ entryPoint: "generate", scope, generationAttemptId });
  return { observer, events, begin, account: next => { owner = next; }, advance: ms => { clock += ms; } };
}

test("only a successful matching retry is recovery of the blocked action", () => {
  const qa = setup(); const first = qa.begin();
  first.observe({ authRefreshOperationId: "refresh-1" });
  first.finish("blocked", { statusCode: 401, reason: "unauthorized" });
  const retry = qa.begin(undefined, "generation-2"); retry.finish("succeeded");
  assert.equal(qa.events[0].context.operationId, qa.events[1].context.operationId);
  assert.equal(qa.events[1].context.resultStatus, "recovered");
  assert.equal(qa.events[1].context.authRefreshOperationId, "refresh-1");
  assert.equal(qa.events[1].context.generationAttemptId, "generation-2");
  assert.equal(qa.events[1].context.attempt, 2);
});

test("a changed photo/settings scope cannot recover the previous action", () => {
  const qa = setup(); const first = qa.begin(); first.observe({ authRefreshOperationId: "refresh-1" }); first.finish("blocked");
  const other = qa.begin("different-photos"); other.finish("succeeded");
  assert.notEqual(other.operationId, first.operationId);
  assert.equal(qa.events.filter(event => event.context.resultStatus === "recovered").length, 0);
});

test("an account change cannot emit or recover another account's action", () => {
  const qa = setup(); const first = qa.begin(); first.observe({ authRefreshOperationId: "refresh-1" }); first.finish("blocked");
  qa.account("account-2"); first.finish("succeeded");
  const other = qa.begin(); other.finish("succeeded");
  assert.equal(qa.events.length, 1);
  assert.notEqual(other.operationId, first.operationId);
});

test("an ordinary provider failure is never reported as an auth block or recovery", () => {
  const qa = setup(); const first = qa.begin(); first.observe({ authRefreshOperationId: "refresh-1" }); first.finish("failed", { statusCode: 503 });
  assert.equal(qa.events[0].context.resultStatus, "failed");
  const next = qa.begin(); next.finish("succeeded");
  assert.notEqual(next.operationId, first.operationId);
  assert.equal(qa.events.length, 1);
});

test("old, duplicate and expired attempts cannot invent recovery", () => {
  const qa = setup(); const first = qa.begin(); first.observe({ authRefreshOperationId: "refresh-1" }); first.finish("blocked"); first.finish("blocked");
  qa.advance(15 * 60 * 1000 + 1);
  const next = qa.begin(); next.finish("succeeded");
  assert.equal(qa.events.length, 1);
  assert.notEqual(next.operationId, first.operationId);
});

test("diagnostic observer failures cannot escape into the product action", () => {
  const observer = createObserver({ track: () => { throw new Error("telemetry unavailable"); }, makeId: () => "action", getOwner: () => "account" });
  const action = observer.begin({ entryPoint: "generate", scope: "input" });
  action.observe({ authRefreshOperationId: "refresh" });
  assert.doesNotThrow(() => action.finish("blocked"));
});

test("the actual durable generation attempt overrides the initially allocated ID", () => {
  const qa = setup(); const action = qa.begin();
  action.observe({ authRefreshOperationId: "refresh-1" });
  action.finish("blocked", { generationAttemptId: "durable-generation" });
  assert.equal(qa.events[0].context.generationAttemptId, "durable-generation");
});

test("an overlapping attempt cannot finish a newer action", () => {
  const qa = setup(); const old = qa.begin();
  old.observe({ authRefreshOperationId: "refresh-old" });
  const current = qa.begin(); current.observe({ authRefreshOperationId: "refresh-new" });
  old.finish("blocked"); current.finish("succeeded");
  assert.equal(qa.events.length, 1);
  assert.equal(qa.events[0].context.operationId, current.operationId);
  assert.equal(qa.events[0].context.resultStatus, "succeeded");
});
