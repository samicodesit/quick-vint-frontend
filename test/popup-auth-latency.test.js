const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const source = fs.readFileSync(require.resolve("../popup.js"), "utf8");
function handler(name, next, context) {
  const start = source.indexOf(`  async function ${name}(`);
  const end = source.indexOf(`  ${next}`, start);
  assert.ok(start >= 0 && end > start);
  return vm.runInNewContext(`${source.slice(start, end)}; ${name}`, context);
}
async function withoutTelemetryWaiting(operation) {
  let timer;
  try {
    return await Promise.race([operation, new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error("Product action waited for unresolved telemetry")), 100);
    })]);
  } finally { clearTimeout(timer); }
}
for (const resend of [false, true]) test(`magic link ${resend ? "resend" : "send"} finishes while telemetry never responds`, async () => {
  const events = [], requests = [], loading = [];
  const context = {
    API_BASE: "https://local.test", showMessage() {},
    setLoading: (_button, value) => loading.push(value),
    trackGrowthEvent: event => { events.push(event); return new Promise(() => {}); },
    fetch: async url => { requests.push(url); return { ok: true, json: async () => ({ success: true }) }; },
    setPendingMagicLinkEmail: async () => {},
  };
  const run = handler("sendMagicLinkToEmail", "async function handleSendMagicLink(", context);
  await withoutTelemetryWaiting(run("fixture@example.com", {}, "Send", resend));
  assert.equal(requests.length, 1);
  assert.deepEqual(events, resend ? ["magic_link_resend_request", "magic_link_resent"] : ["magic_link_request", "magic_link_sent"]);
  assert.deepEqual(loading, [true, false]);
});
test("verified sign-in becomes usable while success telemetry never responds", async () => {
  let refreshed = false, signedIn = false;
  const context = {
    MAGIC_LINK_PENDING_KEY: "pending", getLocalStorage: async () => ({ pending: { email: "fixture@example.com" } }),
    magicLinkOtpInput: { value: "123456" }, verifyMagicLinkCodeBtn: {},
    setLoading() {}, showMagicLinkForm() {},
    showMessage: value => { if (value === "Signed in.") signedIn = true; },
    sendRuntimeMessage: async () => ({ ok: true }),
    chrome: { storage: { local: { remove: async () => {} } } },
    trackGrowthEvent: () => new Promise(() => {}),
    updateFromStorage: async () => { refreshed = true; }, refreshSettingsAccess() {},
  };
  await withoutTelemetryWaiting(handler("handleVerifyMagicLinkCode", "function handleSignOut(", context)());
  assert.ok(signedIn && refreshed);
});
