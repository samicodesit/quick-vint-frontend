const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createQueue } = require("../lib/telemetry-core.js");

function fixture() {
  let state = { events: [], dropped: 0 };
  let account = { id: "a", token: "token-a" };
  let now = 1000;
  const requests = [];
  let response = { status: 503, headers: { get: () => null }, json: async () => ({}) };
  const storage = { transact: async (fn) => fn(state) };
  const make = () => createQueue({ storage, now: () => now, identity: async () => account, send: async (body, token) => { requests.push({ body, token }); return response; } });
  return { make, requests, storage, state: () => state, account: (value) => { account = value; }, time: (value) => { now = value; }, respond: (value) => { response = value; } };
}
test("anonymous phone evidence is removed after durable acceptance without waiting for identity", async () => {
  const f = fixture(); const q = f.make();
  await q.enqueue({ id: "phone-event", event: "phone_upload_transfer_error" }, null);
  f.respond({ status: 200, json: async () => ({ acknowledgedIds: ["phone-event"] }) });
  await q.flush();
  assert.equal(f.state().events.length, 0);
  assert.equal(f.requests[0].token, null);
});
test("survives queue recreation and retains events until a server acknowledgement", async () => {
  const f = fixture();
  await f.make().enqueue({ id: "one", event: "generate_error" }, "a");
  await f.make().flush();
  assert.equal(f.state().events.length, 1);
  f.time(62000);
  f.respond({ status: 200, json: async () => ({ acknowledgedIds: ["one"] }) });
  await f.make().flush();
  assert.equal(f.state().events.length, 0);
});
test("partial acknowledgement removes only accepted IDs", async () => {
  const f = fixture(); const q = f.make();
  await q.enqueue({ id: "one", event: "generate_error" }, "a");
  await q.enqueue({ id: "two", event: "generate_error" }, "a");
  f.respond({ status: 200, json: async () => ({ duplicateIds: ["one"] }) });
  await q.flush();
  assert.deepEqual(f.state().events.map((entry) => entry.event.id), ["two"]);
});
test("never sends another account's queued evidence with current credentials", async () => {
  const f = fixture(); const q = f.make();
  await q.enqueue({ id: "one", event: "generate_error" }, "a");
  f.account({ id: "b", token: "token-b" });
  await q.flush();
  assert.equal(f.requests.length, 0);
  assert.equal(f.state().events.length, 1);
});
test("respects Retry-After and does not turn retries into extra events", async () => {
  const f = fixture(); const q = f.make();
  await q.enqueue({ id: "one", event: "generate_error" }, "a");
  f.respond({ status: 429, headers: { get: () => "120" }, json: async () => ({}) });
  await q.flush(); f.time(62000); await q.flush();
  assert.equal(f.requests.length, 1);
  f.time(122000); await q.flush();
  assert.equal(f.requests.length, 2);
  assert.equal(f.state().events.length, 1);
});
test("enforces queue and request limits while preserving critical evidence first", async () => {
  const f = fixture(); const q = f.make();
  await q.enqueue({ id: "critical", event: "generate_error" }, "a", true);
  for (let i = 0; i < 220; i++) await q.enqueue({ id: String(i), event: "click", context: { message: "x".repeat(2500) } }, "a");
  assert.ok(f.state().events.length <= 200);
  assert.ok(Buffer.byteLength(JSON.stringify(f.state())) <= 524288);
  assert.ok(f.state().events.some((entry) => entry.event.id === "critical"));
  await q.flush();
  assert.ok(f.requests[0].body.events.length <= 25);
  assert.ok(Buffer.byteLength(JSON.stringify(f.requests[0].body)) <= 49152);
});
test("unavailable storage is reported without throwing into product work", async () => {
  const q = createQueue({ storage: { transact: async () => { throw new Error("disabled"); } }, identity: async () => null, send: async () => {} });
  assert.deepEqual(await q.enqueue({ id: "one" }, null), { queued: false, reason: "storage_unavailable" });
  assert.equal((await q.flush()).delivered, false);
});

test("drop evidence identifies expiry, capacity and critical customer reports", async () => {
  const f = fixture(); const q = f.make();
  await q.enqueue({ id: "expired-report", event: "listing_report_submitted" }, "a", true);
  f.time(86401001);
  for (let i = 0; i < 201; i++) await q.enqueue({ id: `routine-${i}`, event: "click" }, "a");
  f.respond({ status: 200, json: async () => ({ acknowledgedIds: f.requests.at(-1).body.events.map(event => event.id) }) });
  await q.flush();
  const carriers = f.requests.flatMap(request => request.body.events).filter(event => event.context?.queueDropped);
  assert.equal(carriers.length, 1);
  assert.deepEqual(carriers[0].context, {
    queueDropped: 2, queueDroppedExpired: 1, queueDroppedCapacity: 1,
    queueDroppedRejected: 0, queueDroppedCritical: 1, queueDroppedCustomerReports: 1, queueDroppedUnclassified: 0,
  });
});

test("terminal rejection records its reason but network retries and capacity rejection do not count as drops", async () => {
  const f = fixture(); const q = f.make();
  await q.enqueue({ id: "rejected", event: "listing_report_submitted" }, "a", true);
  f.respond({ status: 200, json: async () => ({ rejections: [{ id: "rejected", reason: "expired" }] }) });
  await q.flush();
  await q.enqueue({ id: "carrier", event: "click" }, "a");
  f.respond({ status: 503, json: async () => ({ rejections: [{ id: "carrier", reason: "receipt_capacity" }] }) });
  await q.flush();
  const context = f.requests.at(-1).body.events[0].context;
  assert.equal(context.queueDropped, 1);
  assert.equal(context.queueDroppedRejected, 1);
  assert.equal(context.queueDropLastRejection, "expired");
  assert.equal(context.queueDroppedCustomerReports, 1);
  assert.equal(f.state().events.length, 1);
  assert.equal(f.state().dropped, 0);
  f.time(62000); await q.flush();
  assert.equal(f.state().dropped, 0);
  assert.deepEqual(f.requests.at(-1).body.events[0].context, context);
});

test("drains anonymous and authenticated partitions without sharing credentials", async () => {
  let state = { events: [], dropped: 0 }; const sent = [];
  const q = createQueue({ storage: { transact: async (fn) => fn(state) }, identity: async () => ({ id: "a", token: "token-a" }), send: async (body, token) => {
    sent.push({ body, token }); return { status: 200, json: async () => ({ acknowledgedIds: body.events.map(event => event.id) }) };
  } });
  await q.enqueue({ id: "anonymous" }, null);
  await q.enqueue({ id: "signed-in" }, "a");
  const result = await q.flush();
  assert.deepEqual(result.acknowledgedIds.sort(), ["anonymous", "signed-in"]);
  assert.equal(sent[0].token, null);
  assert.equal(sent[1].token, "token-a");
});

test("pre-upgrade drop totals remain explicitly unclassified and survive a lost acknowledgement", async () => {
  const f = fixture(); const q = f.make();
  f.state().dropped = 57;
  await q.enqueue({ id: "carrier", event: "click" }, "a");
  await q.flush();
  assert.equal(f.requests[0].body.events[0].context.queueDroppedUnclassified, 57);
  f.time(62000);
  f.respond({ status: 200, json: async () => ({ duplicateIds: ["carrier"] }) });
  await q.flush();
  assert.equal(f.state().events.length, 0);
  assert.deepEqual(f.requests[1].body.events[0].context, f.requests[0].body.events[0].context);
  assert.equal(f.state().dropped, 0);
});

test("byte capacity records the routine eviction while preserving a critical report", async () => {
  const f = fixture(); const q = f.make();
  await q.enqueue({ id: "report", event: "listing_report_submitted" }, "a", true);
  for (let i = 0; i < 12; i++) await q.enqueue({ id: String(i), event: "click", context: { message: "x".repeat(45000) } }, "a");
  assert.equal(f.state().dropped, 1);
  assert.ok(f.state().events.some(entry => entry.event.id === "report"));
  await q.flush();
  const context = f.requests[0].body.events[0].context;
  assert.equal(context.queueDroppedCapacity, 1);
  assert.equal(context.queueDroppedCritical, 0);
  assert.equal(context.queueDroppedCustomerReports, 0);
});

test("an old tab clearing the total cannot make stale reason counters describe later drops", async () => {
  const f = fixture(); const q = f.make();
  f.state().dropCounts = { expired: 57, critical: 1, customerReports: 1 };
  f.state().dropped = 0;
  await q.enqueue({ id: "new-routine", event: "click" }, "a");
  f.time(86401001);
  await q.enqueue({ id: "new-carrier", event: "click" }, "a");
  await q.flush();
  const context = f.requests[0].body.events[0].context;
  assert.equal(context.queueDropped, 1);
  assert.equal(context.queueDroppedExpired, 1);
  assert.equal(context.queueDroppedCritical, 0);
  assert.equal(context.queueDroppedCustomerReports, 0);
});

test("a flush requested during an account change rechecks identity before settling", async () => {
  const state = { events: [], dropped: 0 };
  let account = { id: "b", token: "token-b" };
  let releaseIdentity;
  const blockedIdentity = new Promise((resolve) => { releaseIdentity = resolve; });
  let first = true;
  const sent = [];
  const q = createQueue({
    storage: { transact: async (fn) => fn(state) },
    identity: async () => {
      const snapshot = account;
      if (first) { first = false; await blockedIdentity; }
      return snapshot;
    },
    send: async (body, token) => {
      sent.push(token);
      return { status: 200, json: async () => ({ acknowledgedIds: body.events.map(event => event.id) }) };
    },
  });
  await q.enqueue({ id: "waiting-for-a" }, "a", true);
  const started = q.flush();
  account = { id: "a", token: "token-a" };
  const resumed = q.flush();
  releaseIdentity();
  await Promise.all([started, resumed]);
  assert.deepEqual(sent, ["token-a"]);
  assert.equal(state.events.length, 0);
});

test("overlapping critical delivery preserves the failed event's backoff", async () => {
  const state = { events: [], dropped: 0 };
  let releaseSend, markStarted;
  const sending = new Promise((resolve) => { markStarted = resolve; });
  const blocked = new Promise((resolve) => { releaseSend = resolve; });
  const sent = [];
  const q = createQueue({
    storage: { transact: async (fn) => fn(state) },
    identity: async () => ({ id: "a", token: "token-a" }),
    now: () => 1000,
    send: async (body) => {
      sent.push(body.events.map(event => event.id));
      if (sent.length === 1) {
        markStarted(); await blocked;
        return { status: 503, json: async () => ({}) };
      }
      return { status: 200, json: async () => ({ acknowledgedIds: body.events.map(event => event.id) }) };
    },
  });
  await q.enqueue({ id: "failed" }, "a");
  const active = q.flush(); await sending;
  await q.enqueue({ id: "new-critical" }, "a", true);
  const requested = q.flush(); releaseSend();
  await Promise.all([active, requested]);
  assert.deepEqual(sent, [["failed"], ["new-critical"]]);
  assert.equal(state.events.length, 1);
  assert.equal(state.events[0].nextAt, 61000);
  assert.equal(state.events[0].attempts, 1);
});
