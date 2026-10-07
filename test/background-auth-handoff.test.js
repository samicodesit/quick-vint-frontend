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
  const storageValue = (value) => {
    if (!options.reorderStorageKeys || !value || typeof value !== "object") return value;
    if (Array.isArray(value)) return value.map(storageValue);
    return Object.fromEntries(Object.keys(value).sort().map(key => [key, storageValue(value[key])]));
  };
  const createdTabs = [];
  const removedTabs = [];
  const timers = [];
  const timerCalls = [];
  const telemetryEvents = [];
  let externalListener;
  let internalListener;
  let installedListener;
  let authStateListener;
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
        if (options.setSessionError) throw options.setSessionError;
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
      onAuthStateChange(listener) { authStateListener = listener; },
    },
    from(table) {
      return {
        select() {
          return this;
        },
        eq() {
          return this;
        },
        gte() {
          return this;
        },
        order() {
          return this;
        },
        limit() {
          return this;
        },
        single: async () => ({
          data:
            table === "profiles"
              ? options.profileData || {
                  email: "seller@example.com",
                  subscription_status: "free",
                  subscription_tier: "free",
                }
              : null,
          error: null,
        }),
        maybeSingle: async () => ({ data: options.dayLimitData || null, error: null }),
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
          if (typeof key === "string") return { [key]: storageValue(storageData[key]) };
          if (Array.isArray(key)) {
            return Object.fromEntries(key.map((item) => [item, storageValue(storageData[item])]));
          }
          return storageValue({ ...storageData });
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
    TextEncoder,
    navigator: { userAgent: "Chrome" },
    chrome,
    fetch: options.fetch || (async () => ({ ok: true, json: async () => ({}) })),
    setTimeout(callback, delay) {
      const timer = { callback, delay };
      timers.push(timer);
      timerCalls.push({ delay });
      if (options.resolveRefreshBackoff && [2000, 4000].includes(delay)) {
        queueMicrotask(callback);
      }
      return timers.length;
    },
    clearTimeout() {},
    URLSearchParams,
    URL,
    AbortController,
    crypto: { randomUUID: () => "cid-test" },
    importScripts(...files) {
      sandbox.supabase = {
        createClient: () => supabaseClient,
      };
      if (options.captureTelemetry) {
        for (const file of files) {
          if (["lib/telemetry-registry.js", "lib/telemetry-client.js"].includes(file)) {
            vm.runInContext(readFileSync(file, "utf8"), sandbox);
          }
        }
        sandbox.AutoListerBackgroundTelemetry = {
          async accept(event, accountId) {
            telemetryEvents.push({ ...event, accountId });
            return { queued: true };
          },
        };
      }
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
    telemetryEvents,
    fireTimer: (delay) => timers.find(timer => timer.delay === delay)?.callback(),
    refreshToken: () => vm.runInContext("refreshTokenWithRetry()", sandbox),
    emitAuthState: (event, session) => authStateListener(event, session),
  };
}

test("exhausted token refresh retains the final sanitized provider error without changing retry timing", async () => {
  let refreshCalls = 0;
  const providerError = Object.assign(new Error("Gateway unavailable https://private.example/path?token=secret Bearer private-credential"), {
    code: "unexpected_failure", status: 503,
  });
  const harness = await runBackgroundHandoff({ type: "PING" }, undefined, {
    initialStorage: { supabaseSession: {
      access_token: "existing-access", refresh_token: "existing-refresh", expires_at: 2000000000,
      user: { id: "user-1", email: "seller@example.com" },
    } },
    runScheduledTimers: false,
    captureTelemetry: true,
    resolveRefreshBackoff: true,
    refreshSession: async () => { refreshCalls++; return { data: { session: null }, error: providerError }; },
  });
  assert.equal(await harness.refreshToken(), null);
  await new Promise(resolve => setImmediate(resolve));
  const failure = harness.telemetryEvents.find(event => event.event === "token_refresh_failed");
  assert.equal(failure.context.errorCode, "unexpected_failure");
  assert.equal(failure.context.statusCode, 503);
  assert.equal(failure.context.attempts, 3);
  assert.equal(failure.context.stage, "authenticating");
  assert.equal(failure.context.phase, "refresh_session");
  assert.ok(failure.context.elapsedMs >= 0);
  assert.match(failure.context.message, /Gateway unavailable/);
  assert.equal(failure.context.errorName, "Error");
  assert.match(failure.context.stack, /Gateway unavailable/);
  assert.doesNotMatch(JSON.stringify(failure), /private\.example|private-credential|existing-access|existing-refresh/);
  assert.equal(refreshCalls, 3);
  assert.deepEqual(harness.timers.filter(timer => [2000, 4000].includes(timer.delay)), [{ delay: 2000 }, { delay: 4000 }]);
  assert.equal(harness.storageData.supabaseSession.access_token, "existing-access");
});

test("refresh failures keep their stage and original error after the SDK signs out", async () => {
  let harness;
  const providerError = Object.assign(new Error("Provider unavailable"), { code: "unexpected_failure", status: 500 });
  harness = await runBackgroundHandoff({ type: "PING" }, undefined, {
    initialStorage: { supabaseSession: {
      access_token: "existing-access", refresh_token: "existing-refresh", expires_at: 2000000000,
      user: { id: "user-1" },
    } },
    runScheduledTimers: false, captureTelemetry: true, resolveRefreshBackoff: true,
    refreshSession: async () => {
      harness.emitAuthState("SIGNED_OUT", null);
      await new Promise(resolve => setImmediate(resolve));
      return { data: { session: null }, error: providerError };
    },
  });
  assert.equal(await harness.refreshToken(), null);
  await new Promise(resolve => setImmediate(resolve));
  const failure = harness.telemetryEvents.find(event => event.event === "token_refresh_failed");
  assert.equal(failure.accountId, null);
  assert.equal(failure.context.stage, "authenticating");
  assert.equal(failure.context.phase, "refresh_session");
  assert.equal(failure.context.errorCode, "unexpected_failure");
  assert.equal(failure.context.operationId, harness.telemetryEvents[0].context.operationId);
  assert.equal(harness.storageData.supabaseSession, undefined);
});

test("refresh diagnostics distinguish session restoration exceptions without making refresh requests", async () => {
  let refreshCalls = 0;
  const options = {
    initialStorage: { supabaseSession: {
      access_token: "existing-access", refresh_token: "existing-refresh", expires_at: 2000000000,
      user: { id: "user-1" },
    } },
    runScheduledTimers: false, captureTelemetry: true,
    refreshSession: async () => { refreshCalls++; return { data: { session: null }, error: null }; },
  };
  const harness = await runBackgroundHandoff({ type: "PING" }, undefined, options);
  options.setSessionError = Object.assign(new Error("Failed to fetch"), { name: "TypeError" });
  assert.equal(await harness.refreshToken(), null);
  await new Promise(resolve => setImmediate(resolve));
  const failure = harness.telemetryEvents.find(event => event.event === "token_refresh_failed");
  assert.equal(failure.context.stage, "authenticating");
  assert.equal(failure.context.phase, "restore_session");
  assert.equal(failure.context.errorName, "TypeError");
  assert.equal(failure.context.message, "Failed to fetch");
  assert.equal(failure.context.attempts, 0);
  assert.equal(refreshCalls, 0);
});

test("phone metadata proxy exposes Retry-After, scopes its timeout and never retries", async () => {
  const requests = [];
  const harness = await runBackgroundHandoff({ type: "PING" }, undefined, {
    runScheduledTimers: false,
    fetch: async (url, options) => {
      requests.push({ url, options });
      return { ok: false, status: 503, headers: new Headers({ "content-type": "application/json", "retry-after": "60" }), json: async () => ({ retryable: true }) };
    },
  });
  const proxy = (url) => new Promise(resolve => harness.internalListener({ type: "PROXY_FETCH", url, options: { method: "POST" }, timeoutMs: 10000 }, {}, resolve));
  const metadata = await proxy("https://autolister.app/api/phone-upload?action=complete&v=2");
  assert.equal(metadata.retryAfter, "60"); assert.equal(requests.length, 1); assert.ok(requests[0].options.signal);
  const ordinary = await proxy("https://autolister.app/api/generate");
  assert.equal(ordinary.retryAfter, undefined); assert.equal(requests.length, 2); assert.equal(requests[1].options.signal, undefined);
});

test("background opens onboarding only for fresh installs", async (t) => {
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

  await t.test("updates do not open a tab", async () => {
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

test("usage keeps a past-due customer's paid tier and historical usage", async () => {
  const session = {
    access_token: "valid-access",
    refresh_token: "refresh-token",
    expires_at: 2000000000,
    user: { id: "user-1", email: "seller@example.com" },
  };
  const { response } = await runBackgroundMessage(
    { type: "GET_USER_USAGE_COUNT" },
    {
      initialStorage: { supabaseSession: session },
      runScheduledTimers: false,
      profileData: {
        email: "seller@example.com",
        subscription_status: "past_due",
        subscription_tier: "business",
        api_calls_this_month: 508,
        is_legacy_plan: false,
        free_lifetime_generations_used: 5,
        pack_credits: 0,
        custom_daily_limit: null,
        custom_monthly_limit: null,
        custom_limit_expires_at: null,
      },
      dayLimitData: { count: 12 },
    },
  );

  assert.equal(response.tier, "business");
  assert.equal(response.daily, 12);
  assert.equal(response.monthly, 508);
  assert.deepEqual(JSON.parse(JSON.stringify(response.limits)), {
    daily: 60,
    monthly: 600,
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

const FIRST_TOUCH_KEY = "autolister.first_touch.v1";
function acquisitionFixture(source = "google") {
  return { source, medium: source === "google" ? "search" : "organic_social",
    campaign: "first-campaign", content: "home-cta",
    capturedAt: new Date().toISOString(), referrerHost: "www.google.com" };
}
const acquisitionSender = { url: "https://autolister.app/welcome", origin: "https://autolister.app", frameId: 0 };
const signedInSession = { access_token: "buyer-access", refresh_token: "buyer-refresh",
  expires_at: 2000000000, user: { id: "buyer-1", email: "seller@example.com" } };
async function settleAcquisition() { for (let i = 0; i < 8; i++) await new Promise(resolve => setImmediate(resolve)); }
function captureAcquisition(harness, attribution, sender = acquisitionSender) {
  return new Promise(resolve => harness.internalListener(
    { type: "CAPTURE_ATTRIBUTION", attribution }, sender, resolve));
}

test("website first touch survives installation and is claimed automatically after Google-style sign-in", async () => {
  const requests = [];
  const harness = await runBackgroundHandoff({ type: "PING" }, undefined, {
    reorderStorageKeys: true,
    runScheduledTimers: false, fetch: async (url, options) => {
      requests.push({ url, options }); return { ok: true, status: 200 };
    },
  });
  const first = acquisitionFixture();
  assert.deepEqual(JSON.parse(JSON.stringify(await captureAcquisition(harness, { ...first, access_token: "never-copy" }))), { ok: true });
  assert.equal(requests.length, 0);
  assert.deepEqual(JSON.parse(JSON.stringify(harness.storageData[FIRST_TOUCH_KEY].attribution)), first);
  assert.doesNotMatch(JSON.stringify(harness.storageData[FIRST_TOUCH_KEY]), /never-copy/);
  harness.emitAuthState("SIGNED_IN", signedInSession);
  await settleAcquisition();
  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, "https://autolister.app/api/attribution/claim");
  assert.equal(requests[0].options.headers.Authorization, "Bearer buyer-access");
  assert.deepEqual(JSON.parse(requests[0].options.body), { attribution: first });
  assert.equal(harness.storageData[FIRST_TOUCH_KEY].userId, "buyer-1");
  assert.equal(harness.storageData[FIRST_TOUCH_KEY].claimed, true);
  await captureAcquisition(harness, acquisitionFixture("tiktok"));
  harness.emitAuthState("TOKEN_REFRESHED", signedInSession);
  await settleAcquisition();
  assert.equal(requests.length, 1);
  assert.equal(harness.storageData[FIRST_TOUCH_KEY].attribution.source, "google");
});

test("attribution failure never blocks auth, retains first touch and retries after auth refresh", async () => {
  let resolveRequest;
  const requests = [];
  const harness = await runBackgroundHandoff({ type: "PING" }, undefined, {
    runScheduledTimers: false, fetch: (url, options) => {
      requests.push({ url, options });
      if (requests.length === 1) return new Promise(resolve => { resolveRequest = resolve; });
      return Promise.resolve({ ok: true, status: 200 });
    },
  });
  const first = acquisitionFixture("tiktok");
  await captureAcquisition(harness, first);
  harness.emitAuthState("SIGNED_IN", signedInSession);
  await settleAcquisition();
  assert.equal(harness.storageData.supabaseSession.access_token, "buyer-access");
  assert.equal(harness.storageData.userProfile.subscription_tier, "free");
  assert.equal(requests.length, 1);
  harness.emitAuthState("TOKEN_REFRESHED", signedInSession);
  await settleAcquisition();
  assert.equal(requests.length, 1, "concurrent auth events must not duplicate the pending claim");
  resolveRequest({ ok: false, status: 503 });
  await settleAcquisition();
  assert.equal(harness.storageData[FIRST_TOUCH_KEY].claimed, undefined);
  harness.emitAuthState("TOKEN_REFRESHED", signedInSession);
  await settleAcquisition();
  assert.equal(requests.length, 2);
  assert.deepEqual(JSON.parse(requests[1].options.body), { attribution: first });
  assert.equal(harness.storageData[FIRST_TOUCH_KEY].claimed, true);
});

test("attribution bridge rejects unrelated pages, subframes, malformed and expired sources", async () => {
  const harness = await runBackgroundHandoff({ type: "PING" }, undefined, { runScheduledTimers: false });
  for (const sender of [
    { ...acquisitionSender, url: "https://www.vinted.co.uk/items/new", origin: "https://www.vinted.co.uk" },
    { ...acquisitionSender, url: "https://autolister.app.evil.example/welcome" },
    { ...acquisitionSender, origin: "https://evil.example" },
    { ...acquisitionSender, frameId: 1 },
  ]) assert.equal((await captureAcquisition(harness, acquisitionFixture(), sender)).ok, false);
  for (const value of [null, [], { ...acquisitionFixture(), medium: "invalid" },
    { ...acquisitionFixture(), source: "seller@example.com" },
    { ...acquisitionFixture(), capturedAt: new Date(Date.now() - 181 * 86400000).toISOString() },
    { ...acquisitionFixture(), capturedAt: new Date(Date.now() + 3600000).toISOString() },
  ]) assert.equal((await captureAcquisition(harness, value)).ok, false);
  assert.equal(harness.storageData[FIRST_TOUCH_KEY], undefined);
});

test("a server acknowledgement stays with the original account if auth changes during the claim", async () => {
  let resolveRequest;
  const first = acquisitionFixture();
  const harness = await runBackgroundHandoff({ type: "PING" }, undefined, {
    initialStorage: { [FIRST_TOUCH_KEY]: { attribution: first } },
    runScheduledTimers: false,
    fetch: () => new Promise(resolve => { resolveRequest = resolve; }),
  });
  harness.emitAuthState("SIGNED_IN", signedInSession);
  await settleAcquisition();
  harness.emitAuthState("SIGNED_OUT", null);
  await settleAcquisition();
  resolveRequest({ ok: true, status: 200 });
  await settleAcquisition();
  assert.equal(harness.storageData[FIRST_TOUCH_KEY].userId, "buyer-1");
  assert.equal(harness.storageData[FIRST_TOUCH_KEY].claimed, true);
  assert.equal(harness.storageData.supabaseSession, undefined);
});

test("a pending source is claimed after a service worker restart", async () => {
  const requests = [];
  const first = acquisitionFixture();
  const harness = await runBackgroundHandoff({ type: "PING" }, undefined, {
    initialStorage: {
      [FIRST_TOUCH_KEY]: { attribution: first },
      supabaseSession: signedInSession,
    },
    runScheduledTimers: false,
    fetch: async (url, options) => {
      requests.push({ url, options });
      return { ok: true, status: 200 };
    },
  });
  await settleAcquisition();
  assert.equal(requests.length, 1);
  assert.deepEqual(JSON.parse(requests[0].options.body), { attribution: first });
  assert.equal(harness.storageData[FIRST_TOUCH_KEY].claimed, true);
});

test("a hanging claim times out without affecting the signed-in account and can retry", async () => {
  let requests = 0;
  let signal;
  const harness = await runBackgroundHandoff({ type: "PING" }, undefined, {
    runScheduledTimers: false,
    fetch: (_url, options) => {
      requests++;
      signal = options.signal;
      if (requests > 1) return Promise.resolve({ ok: true, status: 200 });
      return new Promise((_resolve, reject) => {
        signal.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
      });
    },
  });
  await captureAcquisition(harness, acquisitionFixture());
  harness.emitAuthState("SIGNED_IN", signedInSession);
  await settleAcquisition();
  assert.equal(harness.storageData.userProfile.subscription_tier, "free");
  assert.equal(signal.aborted, false);
  harness.fireTimer(5000);
  await settleAcquisition();
  assert.equal(signal.aborted, true);
  assert.equal(harness.storageData.supabaseSession.access_token, "buyer-access");
  assert.equal(harness.storageData[FIRST_TOUCH_KEY].claimed, undefined);
  harness.emitAuthState("TOKEN_REFRESHED", signedInSession);
  await settleAcquisition();
  assert.equal(requests, 2);
  assert.equal(harness.storageData[FIRST_TOUCH_KEY].claimed, true);
});

test("sign-in makes only one claim attempt when the server fails immediately", async () => {
  let requests = 0;
  const harness = await runBackgroundHandoff({ type: "PING" }, undefined, {
    runScheduledTimers: false,
    fetch: async () => { requests++; return { ok: false, status: 503 }; },
  });
  await captureAcquisition(harness, acquisitionFixture());
  harness.emitAuthState("SIGNED_IN", signedInSession);
  await settleAcquisition();
  assert.equal(requests, 1);
  assert.equal(harness.storageData.supabaseSession.user.id, "buyer-1");
});

test("a pending source belongs to its first account, including failure and account switching", async () => {
  let requests = 0;
  let resolveRequest;
  const harness = await runBackgroundHandoff({ type: "PING" }, undefined, {
    runScheduledTimers: false,
    fetch: () => {
      requests++;
      return requests === 1
        ? new Promise(resolve => { resolveRequest = resolve; })
        : Promise.resolve({ ok: true, status: 200 });
    },
  });
  await captureAcquisition(harness, acquisitionFixture());
  harness.emitAuthState("SIGNED_IN", signedInSession);
  await settleAcquisition();
  const otherSession = { ...signedInSession, access_token: "other-access", user: { id: "buyer-2" } };
  harness.emitAuthState("SIGNED_IN", otherSession);
  await settleAcquisition();
  assert.equal(requests, 1, "another account must not claim the pending source");
  resolveRequest({ ok: false, status: 503 });
  await settleAcquisition();
  harness.emitAuthState("TOKEN_REFRESHED", otherSession);
  await settleAcquisition();
  assert.equal(requests, 1, "a failed claim must retain its original account binding");
  harness.emitAuthState("SIGNED_IN", signedInSession);
  await settleAcquisition();
  assert.equal(requests, 2, "the original account can retry its pending source");
  harness.emitAuthState("SIGNED_IN", otherSession);
  await settleAcquisition();
  assert.equal(requests, 2, "an acknowledged source must not be reused for another account");
});

test("the real website bridge does not truncate an invalid source into a valid one", async () => {
  const harness = await runBackgroundHandoff({ type: "PING" }, undefined, { runScheduledTimers: false });
  const source = { ...acquisitionFixture(), source: "a".repeat(81) };
  vm.runInNewContext(readFileSync("lib/attribution-bridge.js", "utf8"), {
    window: {
      location: { origin: "https://autolister.app" },
      localStorage: { getItem: () => JSON.stringify(source) },
      addEventListener() {},
    },
    document: { addEventListener() {} },
    chrome: { runtime: {
      lastError: null,
      sendMessage: (message, callback) => harness.internalListener(message, acquisitionSender, callback),
    } },
  });
  await settleAcquisition();
  assert.equal(harness.storageData[FIRST_TOUCH_KEY], undefined);
});
