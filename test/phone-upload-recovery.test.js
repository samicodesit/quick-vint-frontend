const { test } = require("node:test");
const assert = require("node:assert/strict");
const recovery = require("../lib/phone-upload-recovery.js");

function fixture(responses, options = {}) {
  let time = 0; const calls = []; const waits = [];
  const run = () => recovery.run({ now: () => time, random: () => 0, wait: async ms => { waits.push(ms); time += ms; }, request: async metadata => { calls.push(metadata); const response = responses.shift(); if (response instanceof Error) throw response; return response; }, ...options });
  return { run, calls, waits, elapsed: () => time };
}
const success = { ok: true, status: 200, data: { complete: true } };
test("healthy metadata makes one request with zero waiting", async () => {
  const f = fixture([success]); assert.equal(await f.run(), success); assert.equal(f.calls.length, 1); assert.deepEqual(f.waits, []);
});
test("transient network and provider failures recover within three attempts", async () => {
  let recovered = 0; const f = fixture([new TypeError("Failed to fetch"), { ok: false, status: 503, data: { code: "DatabaseError", retryable: true } }, success], { onRecovered: () => recovered++ });
  assert.equal(await f.run(), success); assert.deepEqual(f.waits, [700, 1500]); assert.equal(recovered, 1);
});
test("exhaustion preserves the provider code and bounds requests", async () => {
  const failure = { ok: false, status: 503, data: { code: "DatabaseError" } }; const f = fixture([failure, failure, failure, success]);
  await assert.rejects(f.run(), e => e.code === "DatabaseError" && e.attempts === 3); assert.equal(f.calls.length, 3);
});
test("explicit nonretryable and terminal responses never retry", async () => {
  for (const status of [400, 401, 403, 409, 410, 500]) {
    const f = fixture([{ ok: false, status, data: { retryable: false } }, success]); await assert.rejects(f.run()); assert.equal(f.calls.length, 1);
  }
});
test("Retry-After longer than the quick window defers to a manual retry", async () => {
  const f = fixture([{ ok: false, status: 429, retryAfter: "60" }, success]);
  await assert.rejects(f.run(), e => e.retryAt === 60000); assert.equal(f.calls.length, 1); assert.deepEqual(f.waits, []);
});
test("Retry-After seconds and HTTP dates are honored", async () => {
  for (const retryAfter of ["1", "Thu, 01 Jan 1970 00:00:01 GMT"]) {
    const f = fixture([{ ok: false, status: 429, retryAfter }, success]); await f.run(); assert.deepEqual(f.waits, [1000]);
  }
});
test("Retry-After on the exhausted attempt still gates a manual retry", async () => {
  const f = fixture([{ ok: false, status: 503 }, { ok: false, status: 503 }, { ok: false, status: 429, retryAfter: "60" }]);
  await assert.rejects(f.run(), e => e.retryAt === 62200);
});
test("settling and transient attempts share one eight-call loop", async () => {
  const settling = { ok: true, status: 202, data: { settling: true, complete: false } };
  const f = fixture([settling, { ok: false, status: 503 }, settling, settling, settling, settling, settling, success], { settling: true });
  await f.run(); assert.equal(f.calls.length, 8); assert.equal(f.waits.length, 7);
  const exhausted = fixture(Array(9).fill(settling), { settling: true }); await assert.rejects(exhausted.run()); assert.equal(exhausted.calls.length, 8);
});
test("cancellation or session replacement ignores late success and stops future calls", async () => {
  let active = true; const f = fixture([], { active: () => active, request: async () => { active = false; return success; } });
  await assert.rejects(f.run(), e => e.code === "PHONE_OPERATION_CANCELLED");
});
test("request timeouts stop at the overall deadline and abort each attempt", async () => {
  let calls = 0; let aborted = 0;
  // Real timers compressed through injected clock-compatible timer adapters.
  let time = 0;
  await assert.rejects(recovery.run({ now: () => time, random: () => 0, wait: async ms => { time += ms; }, setTimer: (fn, ms) => setTimeout(() => { time += ms; fn(); }, 1), clearTimer: clearTimeout,
    request: ({ signal }) => { calls++; signal.addEventListener("abort", () => aborted++); return new Promise(() => {}); } }), e => ["PHONE_REQUEST_TIMEOUT", "PHONE_OPERATION_TIMEOUT"].includes(e.code));
  assert.equal(calls, 3); assert.equal(aborted, 3); assert.ok(time <= 30000);
});
