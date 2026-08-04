const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const test = require("node:test");
const vm = require("node:vm");

async function runBackgroundHandoff(
  message,
  sender = {
    origin: "https://autolister.app",
    url: "https://autolister.app/auth/callback",
    tab: { id: 123 },
  },
  options = {},
) {
  const storageData = { ...(options.initialStorage || {}) };
  const createdTabs = [];
  const removedTabs = [];
  const timers = [];
  const timerCalls = [];
  let externalListener;
  let internalListener;
  let installedListener;
  let setSessionArgs = null;
  let verifyOtpArgs = null;
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
      verifyOtp: async (params) => {
        verifyOtpArgs = params;
        return (
          options.verifyOtpResult || {
            data: {
              session: {
                access_token: "otp-access",
                refresh_token: "otp-refresh",
                expires_at: 2000000000,
                user: { id: "user-1", email: params.email },
              },
            },
            error: null,
          }
        );
      },
      refreshSession:
        options.refreshSession ||
        (async () => ({ data: { session: null }, error: null })),
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
      getManifest: () => ({ version: options.manifestVersion || "1.0.0" }),
      setUninstallURL(_url, callback) {
        callback?.();
      },
      onInstalled: {
        addListener(listener) {
          installedListener = listener;
        },
      },
      onMessageExternal: {
        addListener(listener) {
          externalListener = listener;
        },
      },
      onMessage: {
        addListener(listener) {
          internalListener = listener;
        },
      },
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
      create(details) {
        createdTabs.push(details);
      },
      remove(tabId) {
        removedTabs.push(tabId);
      },
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
    fetch: options.fetch || (async () => ({ ok: true, json: async () => ({}) })),
    setTimeout(callback, delay) {
      const timer = { callback, delay };
      timers.push(timer);
      timerCalls.push({ delay });
      return timers.length;
    },
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

  if (options.runScheduledTimers !== false) {
    timers.splice(0).forEach(({ callback }) => callback());
  }
  await new Promise((resolve) => setImmediate(resolve));

  return {
    response,
    storageData,
    setSessionArgs,
    verifyOtpArgs,
    getVerifyOtpArgs: () => verifyOtpArgs,
    createdTabs,
    installedListener,
    removedTabs,
    timers: timerCalls,
    internalListener,
  };
}

test("background opens release pages only for their explicit install reason and version", async (t) => {
  await t.test("fresh install keeps the welcome page", async () => {
    const harness = await runBackgroundHandoff(
      { type: "PING" },
      undefined,
      { manifestVersion: "1.4.0" },
    );
    harness.installedListener({ reason: "install" });
    assert.deepEqual(JSON.parse(JSON.stringify(harness.createdTabs)), [
      { url: "https://autolister.app/welcome" },
    ]);
  });

  await t.test("update to 1.4.0 opens the dedicated page", async () => {
    const harness = await runBackgroundHandoff(
      { type: "PING" },
      undefined,
      { manifestVersion: "1.4.0" },
    );
    harness.installedListener({ reason: "update", previousVersion: "1.3.70" });
    assert.deepEqual(JSON.parse(JSON.stringify(harness.createdTabs)), [
      { url: "https://autolister.app/updates/1-4-0" },
    ]);
  });

  await t.test("a direct update from 1.3 to 1.4.1 still opens the 1.4 page", async () => {
    const harness = await runBackgroundHandoff(
      { type: "PING" },
      undefined,
      { manifestVersion: "1.4.1" },
    );
    harness.installedListener({ reason: "update", previousVersion: "1.3.70" });
    assert.deepEqual(JSON.parse(JSON.stringify(harness.createdTabs)), [
      { url: "https://autolister.app/updates/1-4-0" },
    ]);
  });

  await t.test("update from 1.4.0 to 1.4.1 does not repeat the page", async () => {
    const harness = await runBackgroundHandoff(
      { type: "PING" },
      undefined,
      { manifestVersion: "1.4.1" },
    );
    harness.installedListener({ reason: "update", previousVersion: "1.4.0" });
    assert.deepEqual(JSON.parse(JSON.stringify(harness.createdTabs)), []);
  });

  await t.test("later versions do not inherit the 1.4 announcement", async () => {
    const harness = await runBackgroundHandoff(
      { type: "PING" },
      undefined,
      { manifestVersion: "1.4.2" },
    );
    harness.installedListener({ reason: "update", previousVersion: "1.3.70" });
    assert.deepEqual(JSON.parse(JSON.stringify(harness.createdTabs)), []);
  });
});

async function runBackgroundMessage(message, options = {}) {
  const harness = await runBackgroundHandoff(
    { type: "PING" },
    {
      origin: "https://autolister.app",
      url: "https://autolister.app/auth/callback",
    },
    options,
  );
  let response;
  harness.internalListener(message, {}, (value) => {
    response = value;
  });
  await new Promise((resolve) => setImmediate(resolve));
  return { ...harness, response, verifyOtpArgs: harness.getVerifyOtpArgs() };
}

test("background accepts HTTPS auth handoff and stores the Supabase session", async () => {
  const { response, storageData, setSessionArgs, removedTabs } = await runBackgroundHandoff({
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
  assert.deepEqual(removedTabs, [123]);
});

test("background delays closing the HTTPS auth callback tab when requested", async () => {
  const { response, removedTabs, timers } = await runBackgroundHandoff({
    type: "AUTH_HANDOFF",
    session: {
      access_token: "access-1",
      refresh_token: "refresh-1",
    },
    closeDelayMs: 3400,
  });

  assert.equal(response.ok, true);
  assert.equal(timers.some((timer) => timer.delay === 3400), true);
  assert.deepEqual(removedTabs, [123]);
});

test("background rejects malformed HTTPS auth handoff sessions", async () => {
  const { response, storageData, setSessionArgs, removedTabs } = await runBackgroundHandoff({
    type: "AUTH_HANDOFF",
    session: {
      access_token: "access-1",
    },
  });

  assert.equal(response.ok, false);
  assert.equal(response.error, "invalid_session");
  assert.equal(setSessionArgs, null);
  assert.equal(storageData.supabaseSession, undefined);
  assert.deepEqual(removedTabs, []);
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

test("background verifies email OTP codes and stores the Supabase session", async () => {
  const { response, storageData, verifyOtpArgs } = await runBackgroundMessage({
    type: "VERIFY_EMAIL_OTP",
    email: "seller@example.com",
    token: "123456",
  });

  assert.equal(response.ok, true);
  assert.deepEqual(JSON.parse(JSON.stringify(verifyOtpArgs)), {
    email: "seller@example.com",
    token: "123456",
    type: "email",
  });
  assert.equal(storageData.supabaseSession.access_token, "otp-access");
  assert.equal(storageData.supabaseSession.user.email, "seller@example.com");
  assert.equal(storageData.accountEmail, "seller@example.com");
});

test("background proxy preserves structured API errors", async () => {
  const { response } = await runBackgroundMessage(
    { type: "PROXY_FETCH", url: "https://autolister.app/api/phone-upload" },
    {
      fetch: async () => ({
        ok: false,
        status: 410,
        headers: { get: () => "application/json" },
        json: async () => ({ status: "expired", error: "Upload session expired" }),
      }),
    },
  );

  assert.deepEqual(JSON.parse(JSON.stringify(response)), {
    ok: false,
    status: 410,
    data: { status: "expired", error: "Upload session expired" },
    error: "Upload session expired",
  });
});

test("capacity waits for an in-flight token refresh", async () => {
  let releaseRefresh;
  let refreshCalls = 0;
  const authorizationHeaders = [];
  const oldSession = {
    access_token: "expired-access",
    refresh_token: "refresh-token",
    expires_at: 1,
    user: { id: "user-1", email: "seller@example.com" },
  };
  const freshSession = {
    ...oldSession,
    access_token: "fresh-access",
    expires_at: 2000000000,
  };
  const harness = await runBackgroundHandoff(
    { type: "PING" },
    { origin: "https://autolister.app", url: "https://autolister.app/auth/callback" },
    {
      initialStorage: { supabaseSession: oldSession },
      refreshSession: async () => {
        refreshCalls += 1;
        return new Promise((resolve) => {
          releaseRefresh = () => resolve({ data: { session: freshSession }, error: null });
        });
      },
      fetch: async (_url, options) => {
        authorizationHeaders.push(options.headers.Authorization);
        const authorized = options.headers.Authorization === "Bearer fresh-access";
        return {
          ok: authorized,
          status: authorized ? 200 : 401,
          json: async () =>
            authorized
              ? { allowed: true, available: 5 }
              : { error: "Invalid token" },
        };
      },
    },
  );

  const responsePromise = new Promise((resolve) =>
    harness.internalListener({ type: "GET_BATCH_CAPACITY" }, {}, resolve),
  );
  await new Promise((resolve) => setImmediate(resolve));
  releaseRefresh();

  assert.deepEqual(JSON.parse(JSON.stringify(await responsePromise)), {
    ok: true,
    capacity: { allowed: true, available: 5 },
  });
  assert.equal(refreshCalls, 1);
  assert.deepEqual(authorizationHeaders, ["Bearer fresh-access"]);
});

test("capacity refreshes and retries once after a 401", async () => {
  const authorizationHeaders = [];
  const oldSession = {
    access_token: "rejected-access",
    refresh_token: "refresh-token",
    expires_at: 2000000000,
    user: { id: "user-1", email: "seller@example.com" },
  };
  const { response } = await runBackgroundMessage(
    { type: "GET_BATCH_CAPACITY" },
    {
      initialStorage: { supabaseSession: oldSession },
      runScheduledTimers: false,
      refreshSession: async () => ({
        data: {
          session: {
            ...oldSession,
            access_token: "fresh-access",
            expires_at: 2000000100,
          },
        },
        error: null,
      }),
      fetch: async (_url, options) => {
        authorizationHeaders.push(options.headers.Authorization);
        const authorized = options.headers.Authorization === "Bearer fresh-access";
        return {
          ok: authorized,
          status: authorized ? 200 : 401,
          json: async () =>
            authorized
              ? { allowed: true, available: 5 }
              : { error: "Invalid token" },
        };
      },
    },
  );

  assert.deepEqual(JSON.parse(JSON.stringify(response)), {
    ok: true,
    capacity: { allowed: true, available: 5 },
  });
  assert.deepEqual(authorizationHeaders, [
    "Bearer rejected-access",
    "Bearer fresh-access",
  ]);
});
