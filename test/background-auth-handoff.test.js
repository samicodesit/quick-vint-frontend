const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const test = require("node:test");
const vm = require("node:vm");

async function runBackgroundHandoff(
  message,
  sender = { origin: "https://autolister.app", url: "https://autolister.app/auth/callback" },
  options = {},
) {
  const storageData = { ...(options.initialStorage || {}) };
  let externalListener;
  let setSessionArgs = null;
  const setSessionResult = options.setSessionResult || {
    data: {
      session: {
        expires_at: 2000000000,
        user: { id: "user-1", email: "seller@example.com" },
      },
    },
    error: null,
  };
  const supabaseClient = {
    auth: {
      setSession: async (session) => {
        setSessionArgs = session;
        return {
          ...setSessionResult,
          data: {
            ...setSessionResult.data,
            session: setSessionResult.data?.session
              ? { ...session, ...setSessionResult.data.session }
              : null,
          },
        };
      },
      getUser: async () => ({
        data: { user: { id: "user-1", email: "seller@example.com" } },
        error: null,
      }),
      refreshSession: async () => ({ data: { session: null }, error: null }),
      onAuthStateChange() {},
    },
    from() {
      return {
        select() {
          return this;
        },
        eq() {
          return this;
        },
        single: async () => ({
          data: { email: "seller@example.com", subscription_tier: "free" },
          error: null,
        }),
      };
    },
  };

  const chrome = {
    runtime: {
      lastError: null,
      getManifest: () => ({ version: "1.0.0" }),
      setUninstallURL(_url, callback) {
        callback?.();
      },
      onInstalled: { addListener() {} },
      onMessageExternal: {
        addListener(listener) {
          externalListener = listener;
        },
      },
      onMessage: { addListener() {} },
      onSuspend: { addListener() {} },
    },
    storage: {
      local: {
        async get(key) {
          if (typeof key === "string") return { [key]: storageData[key] };
          if (Array.isArray(key)) {
            return Object.fromEntries(key.map((item) => [item, storageData[item]]));
          }
          return { ...storageData };
        },
        async set(values) {
          Object.assign(storageData, values);
        },
        async remove(keys) {
          for (const key of Array.isArray(keys) ? keys : [keys]) {
            delete storageData[key];
          }
        },
      },
    },
    tabs: {
      create() {},
      query(_query, callback) {
        callback([]);
      },
      sendMessage() {},
    },
    action: { openPopup: async () => {} },
  };

  const sandbox = {
    console,
    chrome,
    fetch: async () => ({ ok: true, json: async () => ({}) }),
    setTimeout: () => 1,
    clearTimeout() {},
    URLSearchParams,
    URL,
    crypto: { randomUUID: () => "cid-test" },
    importScripts() {
      sandbox.supabase = {
        createClient: () => supabaseClient,
      };
    },
  };

  vm.createContext(sandbox);
  vm.runInContext(readFileSync("background.js", "utf8"), sandbox);
  await new Promise((resolve) => setImmediate(resolve));

  let response;
  externalListener(
    message,
    sender,
    (value) => {
      response = value;
    },
  );
  await new Promise((resolve) => setImmediate(resolve));

  return { response, storageData, setSessionArgs };
}

test("background accepts HTTPS auth handoff and stores the Supabase session", async () => {
  const { response, storageData, setSessionArgs } = await runBackgroundHandoff({
    type: "AUTH_HANDOFF",
    session: {
      access_token: "access-1",
      refresh_token: "refresh-1",
    },
  });

  assert.equal(response.ok, true);
  assert.equal(setSessionArgs.access_token, "access-1");
  assert.equal(setSessionArgs.refresh_token, "refresh-1");
  assert.equal(storageData.supabaseSession.user.email, "seller@example.com");
  assert.equal(storageData.accountEmail, "seller@example.com");
});

test("background rejects malformed HTTPS auth handoff sessions", async () => {
  const { response, storageData, setSessionArgs } = await runBackgroundHandoff({
    type: "AUTH_HANDOFF",
    session: {
      access_token: "access-1",
    },
  });

  assert.equal(response.ok, false);
  assert.equal(response.error, "invalid_session");
  assert.equal(setSessionArgs, null);
  assert.equal(storageData.supabaseSession, undefined);
});

test("background ignores auth handoff messages outside the HTTPS callback page", async () => {
  const { response, storageData, setSessionArgs } = await runBackgroundHandoff(
    {
      type: "AUTH_HANDOFF",
      session: {
        access_token: "access-1",
        refresh_token: "refresh-1",
      },
    },
    { origin: "https://autolister.app", url: "https://autolister.app/blog" },
  );

  assert.equal(response, undefined);
  assert.equal(setSessionArgs, null);
  assert.equal(storageData.supabaseSession, undefined);
});

test("background keeps the existing stored session when a valid-shaped handoff fails Supabase validation", async () => {
  const previousSession = {
    access_token: "old-access",
    refresh_token: "old-refresh",
    user: { email: "existing@example.com" },
  };
  const { response, storageData, setSessionArgs } = await runBackgroundHandoff(
    {
      type: "AUTH_HANDOFF",
      session: {
        access_token: "bad-access",
        refresh_token: "bad-refresh",
      },
    },
    { origin: "https://autolister.app", url: "https://autolister.app/auth/callback" },
    {
      initialStorage: {
        supabaseSession: previousSession,
        accountEmail: "existing@example.com",
      },
      setSessionResult: {
        data: { session: null },
        error: new Error("invalid JWT"),
      },
    },
  );

  assert.equal(response.ok, false);
  assert.equal(response.error, "invalid JWT");
  assert.equal(setSessionArgs.access_token, "bad-access");
  assert.deepEqual(storageData.supabaseSession, previousSession);
  assert.equal(storageData.accountEmail, "existing@example.com");
});
