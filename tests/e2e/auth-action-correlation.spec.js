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
  const authGate = options.holdAuth ? new Promise(resolve => { releaseAuth = resolve; }) : Promise.resolve();
  let disconnected = true;
  const oldAccess = jwt(Math.floor(Date.now() / 1000) + 60);
  const session = { access_token: oldAccess, refresh_token: "local-refresh", expires_at: Math.floor(Date.now() / 1000) + 60, user };
  const renewed = { ...session, access_token: jwt(Math.floor(Date.now() / 1000) + 3600), expires_at: Math.floor(Date.now() / 1000) + 3600, expires_in: 3600, token_type: "bearer" };
  const flow = await openBatchJourney({ photoPaths: [path.resolve(__dirname, "../../images/quickvint-upload-single.jpg")],
    session: { ...session, expires_at: renewed.expires_at }, generate: ({ route, request, commits }) =>
    route.fulfill({ status: !options.acceptOld && route.request().headers().authorization === `Bearer ${oldAccess}` ? 401 : 200,
      json: !options.acceptOld && route.request().headers().authorization === `Bearer ${oldAccess}` ? { error: "Local expired access" } : commits.get(request.id) }) });
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
    if (url.pathname.endsWith("/verify") || url.pathname.endsWith("/token")) return route.fulfill({ json: renewed });
    if (url.pathname.endsWith("/user")) return route.fulfill({ json: user });
    return route.fulfill({ json: { subscription_status: "active", subscription_tier: "pro", api_calls_this_month: 0, pack_credits: 0 } });
  });
  await flow.controller.locator('[data-testid="add-photos-input"]').setInputFiles(path.resolve(__dirname, "../../images/quickvint-upload-single.jpg"));
  await expect(flow.controller.locator('[data-testid="media-upload-grid"] img')).toHaveCount(1);
  await expect(flow.controller.locator('[data-testid="media-upload-grid"] img')).toHaveAttribute("src", /images1.vinted.net/);
  return { ...flow, get worker() { return flow.worker; }, events, authRequests, session,
    releaseAuth: () => releaseAuth?.(), reconnect: () => { disconnected = false; },
    async verifyCode() { return sendFromExtensionContent(flow.context, flow.controller, { type: "VERIFY_EMAIL_OTP", email: user.email, token: "123456" }); } };
}

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

test("a real Generate action reports its auth block and same-input recovery with the same action ID", async ({}, testInfo) => {
  test.setTimeout(90000);
  const flow = await authJourney();
  try {
    await flow.worker.evaluate(session => chrome.storage.local.set({ supabaseSession: session }), flow.session);
    await flow.controller.locator("#quickvint-gen-btn").click();
    await expect.poll(() => flow.requests.length, { timeout: 35000 }).toBe(1);
    await expect(flow.controller.getByRole("button", { name: /Sign in to enable AI Tools/ })).toBeVisible();
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
    expect((await flow.verifyCode()).ok).toBe(true);
    await flow.controller.locator("#quickvint-gen-btn").click();
    await expect(flow.controller.locator('[data-testid="title--input"]')).toHaveValue("Item 2");
    const recovered = await evidence(testInfo, flow, "action-recovered");
    const recovery = recovered.events.find(event => event.event === "auth_action_result" && event.context.resultStatus === "recovered");
    expect(recovery).toBeTruthy();
    expect(recovery.context.operationId).toBe(result.context.operationId);
    expect(recovery.context.attempt).toBe(2);
    expect(recovery.context.authRefreshOperationId).toBe(failure.context.operationId);
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
    await expect(flow.controller.getByRole("button", { name: /Sign in to enable AI Tools/ })).toBeVisible();
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
    await expect(flow.controller.getByRole("button", { name: /Sign in to enable AI Tools/ })).toBeVisible({ timeout: 35000 });
    await evidence(testInfo, flow, "changed-input-blocked");
    flow.reconnect(); expect((await flow.verifyCode()).ok).toBe(true);
    await flow.controller.locator('[data-testid="media-upload-grid"] .photo-box').evaluateAll(boxes => boxes.forEach(box => box.remove()));
    await flow.controller.locator('[data-testid="add-photos-input"]').setInputFiles(path.resolve(__dirname, "../../images/quickvint-upload-multiple.jpg"));
    await expect(flow.controller.locator('[data-testid="media-upload-grid"] img')).toHaveAttribute("src", /images1.vinted.net/);
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
    await flow.worker.evaluate(session => chrome.storage.local.set({ supabaseSession: session }), flow.session);
    await flow.controller.locator("#quickvint-gen-btn").click();
    await expect(flow.controller.locator('[data-testid="title--input"]')).toHaveValue("Item 1", { timeout: 35000 });
    const data = await evidence(testInfo, flow, "retained-access-success");
    const failure = data.events.find(event => event.event === "token_refresh_failed");
    expect(failure).toBeTruthy();
    const result = data.events.find(event => event.event === "auth_action_result" && event.context.resultStatus === "succeeded");
    expect(result.context.authRefreshOperationId).toBe(failure.context.operationId);
    expect(data.events.some(event => ["blocked", "recovered"].includes(event.context.resultStatus))).toBe(false);
    expect(data.generationRequests).toHaveLength(1);
    expect(data.photos).toBe(1);
  } finally { await flow.close(); }
});

test("unavailable telemetry cannot change auth, Generate output or retained photos", async () => {
  test.setTimeout(90000);
  const flow = await authJourney();
  try {
    flow.reconnect();
    await flow.context.route("https://autolister.app/api/events/track", route => route.abort("internetdisconnected"));
    await flow.worker.evaluate(session => chrome.storage.local.set({ supabaseSession: session }), flow.session);
    await flow.controller.locator("#quickvint-gen-btn").click();
    await expect(flow.controller.locator('[data-testid="title--input"]')).toHaveValue("Item 1", { timeout: 35000 });
    expect(flow.requests).toHaveLength(1);
    await expect(flow.controller.locator('[data-testid="media-upload-grid"] img')).toHaveCount(1);
    await expect(flow.controller.getByRole("button", { name: /Sign in to enable AI Tools/ })).toHaveCount(0);
  } finally { await flow.close(); }
});
