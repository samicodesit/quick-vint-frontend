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
