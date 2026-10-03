const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const vm = require("node:vm");
test("workflow exposes a read-only status job without running the release job", () => {
  const workflow = readFileSync(".github/workflows/chrome-web-store-release.yml", "utf8");
  assert.match(workflow, /- status/);
  assert.match(workflow, /status:\s*\n\s*if:.*inputs\.mode == 'status'/);
  assert.match(workflow, /release:\s*\n\s*if:.*inputs\.mode != 'status'/);
  assert.match(workflow, /--mode status/);
});
test("store status mode performs only a store GET and never packages, uploads or publishes", async () => {
  const requests = [];
  const source = readFileSync("scripts/chrome-web-store-release.js", "utf8").split("main().catch")[0];
  const sandbox = { Buffer, URLSearchParams, console: { log() {}, error() {} }, process: { argv: ["node", "release", "--mode", "status"], env: { CHROME_WEB_STORE_SERVICE_ACCOUNT_JSON: JSON.stringify({ client_email: "fixture@example.test", private_key: "fixture-key" }) } },
    require(name) { if (name === "crypto") return { createSign: () => ({ update() { return this; }, sign: () => Buffer.from("fixture") }) }; if (name === "fs") return { readFileSync() { throw new Error("Status must not open a package"); } }; return require(name); },
    fetch: async (url, options) => { requests.push({ url, method: options.method }); return { ok: true, text: async () => JSON.stringify(url.includes("oauth2") ? { access_token: "fixture-token" } : { submittedItemRevisionStatus: { state: "PENDING_REVIEW" } }) }; },
  };
  vm.runInNewContext(`${source}\nglobalThis.runStatus = main;`, sandbox);
  await sandbox.runStatus();
  const store = requests.filter(request => request.url.includes("chromewebstore"));
  assert.equal(store.length, 1); assert.equal(store[0].method, "GET"); assert.ok(store[0].url.endsWith(":fetchStatus"));
});
