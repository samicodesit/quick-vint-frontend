const { test, expect } = require("@playwright/test");
const { openBatchJourney, sendFromExtensionContent } = require("./batch-journey");
const fs = require("node:fs");
const path = require("node:path");

const user = { id: "00000000-0000-4000-8000-000000000001", email: "seller@example.invalid" };
const jwt = exp => [
  Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url"),
  Buffer.from(JSON.stringify({ sub: user.id, exp })).toString("base64url"), "local-signature",
].join(".");
const unique = events => [...new Map(events.map(event => [event.id, event])).values()];

async function authJourney(options = {}) {
  const events = [];
  const authRequests = [];
  let releaseAuth;
  let authGate = options.holdAuth ? new Promise(resolve => { releaseAuth = resolve; }) : Promise.resolve();
  let disconnected = true;
  let rejectRefresh = false;
  const oldAccess = jwt(Math.floor(Date.now() / 1000) + 60);
  const session = { access_token: oldAccess, refresh_token: "local-refresh", expires_at: Math.floor(Date.now() / 1000) + 60, user };
  const renewed = { ...session, access_token: jwt(Math.floor(Date.now() / 1000) + 3600), expires_at: Math.floor(Date.now() / 1000) + 3600, expires_in: 3600, token_type: "bearer" };
  const flow = await openBatchJourney({ photoPaths: [path.resolve(__dirname, "../../images/quickvint-upload-single.jpg")],
    session: { ...session, expires_at: renewed.expires_at }, generate: ({ route, request, requests, commits }) => {
      if (requests.length <= (options.loseFirstResponses || 0)) return route.abort("connectionreset");
      const rejected = (options.forceFirstGenerate401 && requests.length === 1) ||
        (!options.acceptOld && route.request().headers().authorization === `Bearer ${oldAccess}`);
      return route.fulfill({ status: rejected ? 401 : 200,
        json: rejected ? { error: "Local expired access" } : commits.get(request.id) });
    } });
  await flow.context.route("https://autolister.app/api/events/track", route => {
    const body = route.request().postDataJSON(); events.push(...body.events);
    return route.fulfill({ json: { acknowledgedIds: body.events.map(event => event.id), duplicateIds: [], rejections: [] } });
  });
  // Match the real upload contract: separate upload sessions have distinct URLs.
  await flow.context.route("https://autolister.app/api/phone-upload**", route => {
    const url = new URL(route.request().url());
    if (url.searchParams.get("action") === "cleanup") return route.fulfill({ status: 204 });
    return route.fulfill({ json: { success: true, v: 2, status: "complete", complete: true,
      files: flow.files.map(file => ({ ...file, url: file.url + "?session=" + url.searchParams.get("sessionId") })),
      count: flow.files.length, expectedCount: flow.files.length } });
  });
  await flow.context.route("https://jqloiovdwjaornnfvmyu.supabase.co/**", async route => {
    const url = new URL(route.request().url());
    if (url.pathname.startsWith("/auth/")) { authRequests.push(url.pathname); await authGate; }
    if (disconnected && url.pathname.startsWith("/auth/")) return route.abort("internetdisconnected");
    if (options.failOtp && url.pathname.endsWith("/verify")) return route.fulfill({ status: 400, json: { code: "otp_expired", message: "Invalid code" } });
    if (rejectRefresh && url.pathname.endsWith("/token")) return route.fulfill({ status: 400,
      json: { code: "refresh_token_not_found", message: "Invalid Refresh Token: Refresh Token Not Found" } });
    if (url.pathname.endsWith("/verify") || url.pathname.endsWith("/token")) return route.fulfill({ json: renewed });
    if (url.pathname.endsWith("/user")) return route.fulfill({ json: user });
    return route.fulfill({ json: { subscription_status: "active", subscription_tier: "pro", api_calls_this_month: 0, pack_credits: 0 } });
  });
  await flow.controller.locator('[data-testid="add-photos-input"]').setInputFiles(path.resolve(__dirname, "../../images/quickvint-upload-single.jpg"));
  await expect(flow.controller.locator('[data-testid="media-upload-grid"] img')).toHaveCount(1);
  await expect(flow.controller.locator('[data-testid="media-upload-grid"] img')).toHaveAttribute("src", /images1.vinted.net/);
  return { ...flow, get worker() { return flow.worker; }, events, authRequests, session,
    releaseAuth: () => releaseAuth?.(), reconnect: () => { disconnected = false; },
    holdAuth: () => { authGate = new Promise(resolve => { releaseAuth = resolve; }); },
    rejectRefresh: () => { disconnected = false; rejectRefresh = true; },
    async verifyCode() { return sendFromExtensionContent(flow.context, flow.controller, { type: "VERIFY_EMAIL_OTP", email: user.email, token: "123456" }); } };
}

test("failed overlapping sign-in cannot hide a successful SDK renewal", async ({}, testInfo) => {
  const flow = await authJourney({ failOtp: true });
  try {
    await flow.worker.evaluate(session => chrome.storage.local.set({ supabaseSession: session }), flow.session);
    await flow.worker.evaluate(() => refreshTokenWithRetry(1, { entryPoint: "startup_restore" }));
    await flow.worker.evaluate(() => authSessionObserver.drain());
    flow.reconnect(); flow.holdAuth();
    const renewal = flow.worker.evaluate(session => supabaseClient.auth.refreshSession({ refresh_token: session.refresh_token }), flow.session);
    const signin = flow.verifyCode();
    await expect.poll(() => flow.worker.evaluate(() => interactiveAuthObservations > 0)).toBe(true);
    flow.releaseAuth();
    await Promise.all([renewal, signin]);
    await expect.poll(async () => {
      await flow.worker.evaluate(() => AutoListerTelemetry.flush());
      return unique(flow.events).filter(e => e.event === "auth_session_result").length;
    }).toBe(1);
    const data = await evidence(testInfo, flow, "background-overlapping-failed-signin");
    expect(data.events.find(e => e.event === "auth_session_result").context.resultStatus).toBe("silent_renewed");
    expect(data.generationRequests).toHaveLength(0);
    expect(data.photos).toBe(1);
  } finally { flow.releaseAuth(); await flow.close(); }
});

test("a confirmed session rejection records required fresh sign-in without generating", async ({}, testInfo) => {
  const flow = await authJourney();
  try {
    await flow.worker.evaluate(session => chrome.storage.local.set({ supabaseSession: session }), flow.session);
    flow.rejectRefresh();
    await flow.worker.evaluate(() => refreshTokenWithRetry(1, { entryPoint: "startup_restore" }));
    await flow.worker.evaluate(() => authSessionObserver.drain());
    expect(await flow.worker.evaluate(async () => (await chrome.storage.local.get("supabaseSession")).supabaseSession)).toBeUndefined();
    await flow.verifyCode();
    await expect.poll(async () => {
      await flow.worker.evaluate(() => AutoListerTelemetry.flush());
      return unique(flow.events).filter(e => e.event === "auth_session_result").length;
    }).toBe(1);
    const data = await evidence(testInfo, flow, "background-required-signin");
    const result = data.events.find(e => e.event === "auth_session_result");
    expect(result.context.resultStatus).toBe("signed_in");
    expect(result.context.signInRequired).toBe(true);
    expect(result.context.reason).toBe("email_otp");
    expect(data.generationRequests).toHaveLength(0);
    expect(data.photos).toBe(1);
  } finally { await flow.close(); }
});

test("ordinary silent renewal adds no session outcome record", async ({}, testInfo) => {
  const flow = await authJourney();
  try {
    flow.reconnect();
    await flow.worker.evaluate(() => refreshTokenWithRetry(1, { entryPoint: "scheduled_refresh" }));
    await flow.worker.evaluate(() => authSessionObserver.drain());
    const data = await evidence(testInfo, flow, "background-ordinary-renewal");
    expect(data.events.some(e => e.event === "token_refresh_success")).toBe(true);
    expect(data.events.filter(e => e.event === "auth_session_result")).toEqual([]);
    expect(data.generationRequests).toHaveLength(0);
    expect(data.photos).toBe(1);
  } finally { await flow.close(); }
});

async function evidence(testInfo, flow, name) {
  await flow.worker.evaluate(() => AutoListerTelemetry.flush());
  const data = { scenario: name, extensionVersion: await flow.worker.evaluate(() => chrome.runtime.getManifest().version),
    events: unique(flow.events), generationRequests: flow.requests.map(request => ({ id: request.id, generationAttemptId: request.body.generationAttemptId })),
    photos: await flow.controller.locator('[data-testid="media-upload-grid"] img').count(),
    title: await flow.controller.locator('[data-testid="title--input"]').inputValue(),
    visibleText: (await flow.controller.locator('body').innerText()).slice(-1500) };
  const file = testInfo.outputPath(`${name}.json`); fs.writeFileSync(file, JSON.stringify(data, null, 2));
  if (process.env.AUTH_QA_DIR) {
    fs.mkdirSync(process.env.AUTH_QA_DIR, { recursive: true });
    fs.writeFileSync(path.join(process.env.AUTH_QA_DIR, `${name}-${testInfo.repeatEachIndex}.json`), JSON.stringify(data, null, 2));
  }
  return data;
}

test("a real scheduled refresh failure identifies its background trigger without inventing a blocked action", async ({}, testInfo) => {
  test.setTimeout(110000);
  const flow = await authJourney();
  try {
    await flow.worker.evaluate(session => scheduleTokenRefresh(session), flow.session);
    await expect.poll(async () => {
      await flow.worker.evaluate(() => AutoListerTelemetry.flush());
      return unique(flow.events).filter(event => event.event === "token_refresh_failed").length;
    }, { timeout: 95000, intervals: [1000] }).toBeGreaterThan(0);
    const data = await evidence(testInfo, flow, "scheduled-failure");
    const failure = data.events.find(event => event.event === "token_refresh_failed");
    expect(failure.context.entryPoint).toBe("scheduled_refresh");
    expect(data.events.filter(event => event.event === "auth_action_result")).toEqual([]);
    expect(data.generationRequests).toHaveLength(0);
    expect(data.photos).toBe(1);
  } finally { await flow.close(); }
});

for (const outcome of ["silent_renewed", "signed_in", "sdk_renewed", "handoff_signed_in"]) {
  test(`background failure survives a worker restart and records ${outcome} without generating`, async ({}, testInfo) => {
    test.setTimeout(90000);
    const flow = await authJourney();
    try {
      await flow.worker.evaluate(session => chrome.storage.local.set({ supabaseSession: session }), flow.session);
      await flow.worker.evaluate(() => refreshTokenWithRetry(1, { entryPoint: "startup_restore" }));
      await flow.worker.evaluate(() => AutoListerTelemetry.flush());
      const failure = unique(flow.events).find(e => e.event === "token_refresh_failed");
      expect(failure).toBeTruthy();
      await flow.worker.evaluate(() => authSessionObserver.drain());
      if (outcome === "signed_in" || outcome === "handoff_signed_in") {
        // Keep renewal disconnected until the voluntary sign-out and restart
        // finish. Otherwise a legitimate usage refresh can win before sign-in.
        await flow.context.route("https://jqloiovdwjaornnfvmyu.supabase.co/auth/v1/logout**", route => route.fulfill({ status: 204 }));
        await flow.worker.evaluate(session => chrome.storage.local.set({ supabaseSession: {
          ...session, expires_at: Math.floor(Date.now() / 1000) + 3600,
        } }), flow.session);
        const signedOut = await sendFromExtensionContent(flow.context, flow.controller, { type: "SIGN_OUT" });
        expect(signedOut.ok).toBe(true);
        await expect.poll(() => flow.worker.evaluate(async () => (await chrome.storage.local.get("supabaseSession")).supabaseSession)).toBeUndefined();
      }
      if (outcome !== "sdk_renewed") await flow.restartWorker();
      flow.reconnect();
      if (outcome === "signed_in") {
        // A real successful OTP handler, SDK request and session persistence.
        // Explicit sign-out prevents an unrelated SDK auto-renewal racing
        // this fresh sign-in. It must not be labelled required sign-in.
        await flow.verifyCode();
      } else if (outcome === "handoff_signed_in") {
        await flow.context.route("https://autolister.app/auth/callback", route => route.fulfill({ contentType: "text/html", body: "<!doctype html><title>Local callback</title>" }));
        const callback = await flow.context.newPage();
        await callback.goto("https://autolister.app/auth/callback");
        const extensionId = new URL(flow.worker.url()).hostname;
        const response = await callback.evaluate(({ extensionId, session }) => new Promise(resolve =>
          chrome.runtime.sendMessage(extensionId, { type: "AUTH_HANDOFF", session, closeDelayMs: 500 }, resolve)), {
          extensionId, session: { access_token: jwt(Math.floor(Date.now() / 1000) - 60), refresh_token: "local-refresh" },
        });
        expect(response.ok).toBe(true);
      } else if (outcome === "sdk_renewed") {
        await flow.worker.evaluate(session => supabaseClient.auth.refreshSession({ refresh_token: session.refresh_token }), flow.session);
      } else {
        await flow.worker.evaluate(() => refreshTokenWithRetry(1, { entryPoint: "startup_restore" }));
      }
      await expect.poll(async () => {
        await flow.worker.evaluate(() => AutoListerTelemetry.flush());
        return unique(flow.events).filter(e => e.event === "auth_session_result").length;
      }).toBe(1);
      const data = await evidence(testInfo, flow, `background-${outcome}`);
      const result = data.events.find(e => e.event === "auth_session_result");
      expect(result.context.operationId).toBe(failure.context.operationId);
      expect(result.context.resultStatus).toBe(outcome.includes("signed_in") ? "signed_in" : "silent_renewed");
      expect(result.context.signInRequired).toBe(false);
      expect(result.context.analyticsClientId).toBe(failure.context.analyticsClientId);
      expect(data.generationRequests).toHaveLength(0);
      expect(data.photos).toBe(1);
    } finally { await flow.close(); }
  });
}

test("a real Generate action reports its auth block and same-input recovery with the same action ID", async ({}, testInfo) => {
  test.setTimeout(90000);
  const flow = await authJourney();
  try {
    await flow.worker.evaluate(session => chrome.storage.local.set({ supabaseSession: session }), flow.session);
    await flow.controller.locator("#quickvint-gen-btn").click();
    await expect.poll(() => flow.requests.length, { timeout: 35000 }).toBe(1);
    await expect(flow.controller.locator("#quickvint-gen-btn")).toHaveText(/Waiting for connection/);
    await expect(flow.controller.getByRole("button", { name: /Sign in to enable AI Tools/ })).toHaveCount(0);
    const blocked = await evidence(testInfo, flow, "action-blocked");
    const result = blocked.events.find(event => event.event === "auth_action_result" && event.context.resultStatus === "blocked");
    expect(result, "actual unauthorized Generate result needs an auth action record").toBeTruthy();
    const failure = blocked.events.find(event => event.event === "token_refresh_failed");
    expect(result.context.authRefreshOperationId).toBe(failure.context.operationId);
    expect(result.context.generationAttemptId).toBe(flow.requests[0].body.generationAttemptId);
    expect(blocked.photos).toBe(1);
    if (process.env.AUTH_QA_DIR) await flow.controller.screenshot({ path: path.join(process.env.AUTH_QA_DIR, `blocked-${testInfo.repeatEachIndex}.png`) });
    flow.reconnect();
    await flow.restartWorker();
    await expect(flow.controller.locator('[data-testid="title--input"]')).toHaveValue("Item 1");
    const recovered = await evidence(testInfo, flow, "action-recovered");
    const recovery = recovered.events.find(event => event.event === "auth_action_result" && event.context.resultStatus === "recovered");
    expect(recovery).toBeTruthy();
    expect(recovery.context.operationId).toBe(result.context.operationId);
    expect(recovery.context.attempt).toBe(2);
    expect(typeof recovery.context.authRefreshOperationId).toBe("string");
    expect(recovered.generationRequests).toHaveLength(2);
    expect(flow.requests[1].body.imageUrls).toEqual(flow.requests[0].body.imageUrls);
    expect(recovered.photos).toBe(1);
    if (process.env.AUTH_QA_DIR) {
      await expect(flow.controller.locator("#quickvint-toast.visible")).toHaveCount(0, { timeout: 10000 });
      await flow.controller.screenshot({ path: path.join(process.env.AUTH_QA_DIR, `recovered-${testInfo.repeatEachIndex}.png`) });
    }
  } finally { await evidence(testInfo, flow, "action-final"); await flow.close(); }
});

test("a user action joining a background refresh links to that one refresh", async ({}, testInfo) => {
  test.setTimeout(90000);
  const flow = await authJourney({ holdAuth: true });
  try {
    await flow.worker.evaluate(async session => {
      await chrome.storage.local.set({ supabaseSession: session });
      void refreshTokenWithRetry(3, { entryPoint: "scheduled_refresh" });
    }, flow.session);
    await expect.poll(() => flow.authRequests.length).toBeGreaterThan(0);
    await flow.controller.locator("#quickvint-gen-btn").click();
    // The worker has accepted the real content message and joined the existing promise.
    await expect.poll(async () => {
      await flow.worker.evaluate(() => AutoListerTelemetry.flush());
      return flow.events.some(event => event.event === "auth_action_result" && event.context.resultStatus === "refresh_joined");
    }).toBe(true);
    flow.releaseAuth();
    await expect.poll(() => flow.requests.length, { timeout: 35000 }).toBe(1);
    await expect(flow.controller.locator("#quickvint-gen-btn")).toHaveText(/Waiting for connection/);
    await expect(flow.controller.getByRole("button", { name: /Sign in to enable AI Tools/ })).toHaveCount(0);
    const data = await evidence(testInfo, flow, "shared-refresh");
    const starts = data.events.filter(event => event.event === "token_refresh_start" && event.context.entryPoint === "scheduled_refresh");
    expect(starts).toHaveLength(1);
    expect(starts[0].context.entryPoint).toBe("scheduled_refresh");
    expect(data.events.some(event => event.event === "token_refresh_start" && event.context.entryPoint === "access_token_request")).toBe(false);
    const blocked = data.events.find(event => event.event === "auth_action_result" && event.context.resultStatus === "blocked");
    expect(blocked.context.authRefreshOperationId).toBe(starts[0].context.operationId);
    expect(data.photos).toBe(1);
  } finally { flow.releaseAuth(); await flow.close(); }
});

test("success with changed photos cannot recover the earlier blocked action", async ({}, testInfo) => {
  test.setTimeout(90000);
  const flow = await authJourney();
  try {
    await flow.worker.evaluate(session => chrome.storage.local.set({ supabaseSession: session }), flow.session);
    await flow.controller.locator("#quickvint-gen-btn").click();
    await expect(flow.controller.locator("#quickvint-gen-btn")).toHaveText(/Waiting for connection/, { timeout: 35000 });
    await evidence(testInfo, flow, "changed-input-blocked");
    await flow.controller.locator('[data-testid="media-upload-grid"] .photo-box').evaluateAll(boxes => boxes.forEach(box => box.remove()));
    await flow.controller.locator('[data-testid="add-photos-input"]').setInputFiles(path.resolve(__dirname, "../../images/quickvint-upload-multiple.jpg"));
    await expect(flow.controller.locator('[data-testid="media-upload-grid"] img')).toHaveAttribute("src", /images1.vinted.net/);
    flow.reconnect();
    await expect(flow.controller.locator("#quickvint-gen-btn")).toBeEnabled();
    await flow.controller.locator("#quickvint-gen-btn").click();
    await expect(flow.controller.locator('[data-testid="title--input"]')).toHaveValue("Item 2");
    const data = await evidence(testInfo, flow, "changed-input-success");
    expect(flow.requests[1].body.imageUrls).not.toEqual(flow.requests[0].body.imageUrls);
    expect(data.events.some(event => event.event === "auth_action_result" && event.context.resultStatus === "blocked")).toBe(true);
    expect(data.events.some(event => event.event === "auth_action_result" && event.context.resultStatus === "recovered")).toBe(false);
    expect(data.photos).toBe(1);
  } finally { await flow.close(); }
});

test("a failed refresh is not a blocked action when the retained access still completes Generate", async ({}, testInfo) => {
  test.setTimeout(90000);
  const flow = await authJourney({ acceptOld: true });
  try {
    // An unrelated background failure may already be in the same event batch.
    await flow.worker.evaluate(session => chrome.storage.local.set({ supabaseSession: session }), flow.session);
    await flow.worker.evaluate(() => refreshTokenWithRetry(1, { entryPoint: "scheduled_refresh" }));
    await flow.worker.evaluate(() => AutoListerTelemetry.flush());
    await flow.worker.evaluate(session => chrome.storage.local.set({ supabaseSession: session }), flow.session);
    await flow.controller.locator("#quickvint-gen-btn").click();
    await expect(flow.controller.locator('[data-testid="title--input"]')).toHaveValue("Item 1", { timeout: 35000 });
    await expect.poll(async () => {
      await flow.worker.evaluate(() => AutoListerTelemetry.flush());
      return unique(flow.events).some(event => event.event === "token_refresh_failed");
    }).toBe(true);
    const data = await evidence(testInfo, flow, "retained-access-success");
    const result = data.events.find(event => event.event === "auth_action_result" && event.context.resultStatus === "succeeded");
    expect(result).toBeTruthy();
    const failure = data.events.find(event => event.event === "token_refresh_failed" &&
      event.context.parentOperationId === result.context.operationId);
    expect(failure, "match the Generate action, not an unrelated background failure").toBeTruthy();
    expect(result.context.authRefreshOperationId).toBe(failure.context.operationId);
    expect(data.events.some(event => event.event === "token_refresh_failed" &&
      event.context.entryPoint === "scheduled_refresh" && event.context.operationId !== failure.context.operationId)).toBe(true);
    expect(result.context.generationAttemptId).toBe(flow.requests[0].body.generationAttemptId);
    expect(data.events.some(event => ["blocked", "recovered"].includes(event.context.resultStatus))).toBe(false);
    expect(data.generationRequests).toHaveLength(1);
    expect(data.photos).toBe(1);
  } finally { await flow.close(); }
});

test("unavailable telemetry cannot change auth, Generate output or retained photos", async () => {
  test.setTimeout(90000);
  const flow = await authJourney({ forceFirstGenerate401: true });
  try {
    flow.reconnect();
    const generationStatuses = [];
    flow.context.on("response", response => { if (response.url().endsWith("/api/generate")) generationStatuses.push(response.status()); });
    await flow.context.route("https://autolister.app/api/events/track", route => route.abort("internetdisconnected"));
    await flow.worker.evaluate(session => chrome.storage.local.set({ supabaseSession: session }), flow.session);
    // CI caught the normal usage refresh winning before Generate. Complete it
    // explicitly, then require the selected API rejection and identical replay.
    await flow.worker.evaluate(() => refreshTokenWithRetry(1, { entryPoint: "usage_count" }));
    expect(await flow.worker.evaluate(() => getStoredSession().then(session => session.access_token))).not.toBe(flow.session.access_token);
    await flow.controller.locator("#quickvint-gen-btn").click();
    await expect(flow.controller.locator('[data-testid="title--input"]')).toHaveValue("Item 1", { timeout: 35000 });
    expect(flow.requests).toHaveLength(2);
    expect(generationStatuses).toEqual([401, 200]);
    expect(flow.requests[1].id).toBe(flow.requests[0].id);
    expect(flow.requests[1].rawBody).toBe(flow.requests[0].rawBody);
    await expect(flow.controller.locator('[data-testid="media-upload-grid"] img')).toHaveCount(1);
    await expect(flow.controller.getByRole("button", { name: /Sign in to enable AI Tools/ })).toHaveCount(0);
  } finally { await flow.close(); }
});

test("an auth-blocked uncertain replay records the generation ID from the saved HTTP payload", async ({}, testInfo) => {
  test.setTimeout(90000);
  const flow = await authJourney({ loseFirstResponses: 2 });
  try {
    await flow.controller.locator("#quickvint-gen-btn").click();
    await expect.poll(() => flow.requests.length).toBe(2);
    await expect(flow.controller.locator("#quickvint-gen-btn")).toBeEnabled();
    await flow.worker.evaluate(session => chrome.storage.local.set({ supabaseSession: session }), flow.session);
    await flow.controller.locator("#quickvint-gen-btn").click();
    await expect(flow.controller.locator("#quickvint-gen-btn")).toHaveText(/Waiting for connection/, { timeout: 35000 });
    const data = await evidence(testInfo, flow, "uncertain-replay-blocked");
    expect(flow.requests).toHaveLength(3);
    expect(flow.requests[2].id).toBe(flow.requests[0].id);
    expect(flow.requests[2].rawBody).toBe(flow.requests[0].rawBody);
    const result = data.events.find(event => event.event === "auth_action_result" && event.context.resultStatus === "blocked");
    expect(result.context.generationAttemptId).toBe(flow.requests[2].body.generationAttemptId);
    const failure = data.events.find(event => event.event === "generate_error" && event.context.statusCode === 401);
    expect(failure.context.parentOperationId).toBe(result.context.operationId);
    flow.reconnect();
    await expect(flow.controller.locator('[data-testid="title--input"]')).not.toHaveValue("");
    const recovered = await evidence(testInfo, flow, "uncertain-replay-recovered");
    const recovery = recovered.events.find(event => event.event === "auth_action_result" && event.context.resultStatus === "recovered");
    expect(recovery.context.operationId).toBe(result.context.operationId);
    expect(recovery.context.generationAttemptId).toBe(flow.requests[3].body.generationAttemptId);
    expect(recovered.generationRequests).toHaveLength(4);
    expect(recovered.photos).toBe(1);
  } finally { await flow.close(); }
});
