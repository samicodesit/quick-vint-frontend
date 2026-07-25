const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const test = require("node:test");
const vm = require("node:vm");

function makeElement() {
  return {
    classList: {
      add() {},
      remove() {},
    },
    addEventListener() {},
    textContent: "",
    innerHTML: "",
  };
}

async function runCallback({ href, session = null }) {
  const fetchCalls = [];
  const storageData = {};
  const elements = new Map();
  const sandbox = {
    console,
    crypto: { randomUUID: () => "callback-test-cid" },
    document: {
      title: "Callback",
      getElementById(id) {
        if (!elements.has(id)) elements.set(id, makeElement());
        return elements.get(id);
      },
      createElement() {
        return { textContent: "" };
      },
      head: { appendChild() {} },
    },
    fetch: async (url, options = {}) => {
      fetchCalls.push({ url, options });
      return { ok: true };
    },
    history: { replaceState() {} },
    localStorage: {
      getItem: () => null,
      setItem() {},
    },
    navigator: {
      language: "en-US",
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15",
    },
    setTimeout(callback) {
      callback();
      return 1;
    },
    clearTimeout() {},
    URLSearchParams,
    window: {
      location: new URL(href),
      close() {},
      addEventListener() {},
      supabase: {
        createClient: () => ({
          auth: {
            exchangeCodeForSession: async () => ({ data: { session }, error: null }),
            setSession: async () => ({ data: { session }, error: null }),
            getSession: async () => ({ data: { session }, error: null }),
            onAuthStateChange() {},
          },
        }),
      },
    },
    chrome: {
      runtime: {
        id: "test-extension",
        getManifest: () => ({ version: "1.3.64" }),
        sendMessage(_message, callback) {
          callback?.();
        },
      },
      storage: {
        local: {
          get(key, callback) {
            callback(typeof key === "string" ? { [key]: storageData[key] } : storageData);
          },
          set(values, callback) {
            Object.assign(storageData, values);
            callback?.();
          },
        },
      },
    },
    LOCALIZATION: {
      DEFAULT: {
        texts: {},
      },
    },
    detectCountryAndLocalization: () => ({ texts: {} }),
  };
  sandbox.window.window = sandbox.window;
  sandbox.window.document = sandbox.document;
  sandbox.window.history = sandbox.history;
  sandbox.window.localStorage = sandbox.localStorage;
  sandbox.window.navigator = sandbox.navigator;
  sandbox.window.chrome = sandbox.chrome;

  vm.runInNewContext(readFileSync("callback.js", "utf8"), sandbox);
  await new Promise((resolve) => setImmediate(resolve));
  return fetchCalls.map((call) => JSON.parse(call.options.body));
}

test("callback logs opened and no-session failure before auth exists", async () => {
  const events = await runCallback({
    href: "chrome-extension://test-extension/callback.html",
    session: null,
  });

  assert.deepEqual(
    events.map((event) => event.event),
    ["auth_callback_opened", "auth_callback_error"],
  );
  assert.equal(events[0].context.hasCode, false);
  assert.equal(events[0].context.hasAccessToken, false);
  assert.equal(events[0].context.clientBrowser, "orion");
  assert.equal(events[0].context.clientPlatform, "ios");
  assert.equal(events[0].extensionVersion, "1.3.64");
  assert.equal(events[1].context.stage, "no_session");
});
