const { test, expect } = require("@playwright/test");
const { openBatchJourney, sendFromExtensionContent } = require("./batch-journey");
const path = require("node:path");
const fs = require("node:fs");

const user = { id: "00000000-0000-4000-8000-000000000001", email: "seller@example.invalid" };
const jwt = exp => [Buffer.from('{"alg":"HS256","typ":"JWT"}').toString("base64url"),
  Buffer.from(JSON.stringify({ sub: user.id, exp })).toString("base64url"), "local-signature"].join(".");
const unique = events => [...new Map(events.map(event => [event.id, event])).values()];

async function journey(options = {}) {
  const expires = Math.floor(Date.now() / 1000);
  const old = { access_token: jwt(expires + (options.expired ? -60 : 60)), refresh_token: "local-refresh",
    expires_at: expires + (options.expired ? -60 : 60), user };
  const fresh = { ...old, access_token: jwt(expires + 3600), expires_at: expires + 3600, expires_in: 3600, token_type: "bearer" };
  const events = [], authRequests = [], accepted = [];
  let connected = options.connected === true, invalid = null, hold = options.hold === true, serverFailure = false;
  const held = [];
  const flow = await openBatchJourney({ session: fresh,
    photoPaths: [path.resolve(__dirname, "../../images/quickvint-upload-single.jpg")],
    generate: async data => {
      const oldToken = data.route.request().headers().authorization === `Bearer ${old.access_token}`;
      if (options.generate) return options.generate({ ...data, oldToken, accepted });
      if (!options.acceptOld && oldToken) return data.route.fulfill({ status: 401, json: { error: "Expired access" } });
      accepted.push(data.request.id);
      return data.route.fulfill({ json: data.commits.get(data.request.id) });
    } });
  await flow.context.route("https://autolister.app/api/events/track", route => {
    const body = route.request().postDataJSON(); events.push(...body.events);
    return route.fulfill({ json: { acknowledgedIds: body.events.map(event => event.id), duplicateIds: [], rejections: [] } });
  });
  await flow.context.route("https://jqloiovdwjaornnfvmyu.supabase.co/**", async route => {
    const url = new URL(route.request().url());
    if (url.pathname.startsWith("/auth/")) {
      authRequests.push({ path: url.pathname, at: Date.now() });
      if (hold) await new Promise(resolve => held.push(resolve));
      if (!connected) return route.abort("internetdisconnected").catch(() => {});
      if (serverFailure) return route.fulfill({ status: 500, json: { code: "unexpected_failure", message: "Temporary auth provider failure" } });
      if (url.pathname.endsWith("/logout")) { invalid = "refresh_token_not_found"; return route.fulfill({ status: 204 }); }
      if (invalid) return route.fulfill({ status: 400, headers: { "x-supabase-api-version": "2024-01-01",
        "access-control-expose-headers": "X-Supabase-Api-Version" },
        json: { code: invalid, error_code: invalid, message: "Saved session rejected" } });
      if (url.pathname.endsWith("/token")) return route.fulfill({ json: fresh });
      return route.fulfill({ json: user });
    }
    return route.fulfill({ json: { subscription_status: "active", subscription_tier: "pro", pack_credits: 0 } });
  });
  await flow.controller.locator('[data-testid="add-photos-input"]').setInputFiles(path.resolve(__dirname, "../../images/quickvint-upload-single.jpg"));
  await expect(flow.controller.locator('[data-testid="media-upload-grid"] img')).toHaveAttribute("src", /images1.vinted.net/);
  await flow.worker.evaluate(session => chrome.storage.local.set({ supabaseSession: session }), old);
  return { ...flow, get worker() { return flow.worker; }, old, fresh, events, authRequests, accepted,
    connect() { connected = true; serverFailure = false; hold = false; held.splice(0).forEach(resolve => resolve()); },
    failServer() { connected = true; serverFailure = true; },
    rejectSession(code = "refresh_token_not_found") { invalid = code; connected = true; hold = false; held.splice(0).forEach(resolve => resolve()); },
    release() { hold = false; held.splice(0).forEach(resolve => resolve()); } };
}

async function checkSuccess(flow, testInfo, name) {
  await expect(flow.controller.locator('[data-testid="title--input"]')).not.toHaveValue("", { timeout: 65000 });
  await expect(flow.controller.locator('[data-testid="media-upload-grid"] img')).toHaveCount(1);
  await expect(flow.controller.getByRole("button", { name: /Sign in to enable AI Tools/ })).toHaveCount(0);
  await flow.worker.evaluate(() => AutoListerTelemetry.flush());
  const data = { name, requests: flow.requests.map(r => ({ id: r.id, body: r.body, rawBody: r.rawBody })),
    accepted: flow.accepted, authRequests: flow.authRequests, events: unique(flow.events), photos: 1 };
  fs.writeFileSync(testInfo.outputPath(name + ".json"), JSON.stringify(data, null, 2));
  if (process.env.AUTH_QA_DIR) {
    fs.mkdirSync(process.env.AUTH_QA_DIR, { recursive: true });
    fs.writeFileSync(path.join(process.env.AUTH_QA_DIR, `${name}-${testInfo.repeatEachIndex}.json`), JSON.stringify(data, null, 2));
    await flow.controller.screenshot({ path: path.join(process.env.AUTH_QA_DIR, `${name}-${testInfo.repeatEachIndex}.png`) });
  }
  return data;
}

test("usable access generates immediately while renewal is stalled", async ({}, testInfo) => {
  const flow = await journey({ acceptOld: true, hold: true });
  try {
    const started = Date.now();
    await flow.controller.locator("#quickvint-gen-btn").click();
    await expect(flow.controller.locator('[data-testid="title--input"]')).toHaveValue("Item 1", { timeout: 5000 });
    expect(Date.now() - started).toBeLessThan(5000);
    expect(flow.authRequests.length).toBeGreaterThan(0);
    expect(flow.requests).toHaveLength(1);
    expect(flow.accepted).toHaveLength(1);
    await checkSuccess(flow, testInfo, "usable-access");
  } finally { flow.release(); await flow.close(); }
});

test("expired access silently renews and continues the original click after a real SDK timeout", async ({}, testInfo) => {
  test.setTimeout(110000);
  const flow = await journey({ expired: true, hold: true });
  try {
    await flow.controller.locator("#quickvint-gen-btn").click();
    await expect.poll(async () => {
      await flow.worker.evaluate(() => AutoListerTelemetry.flush());
      return unique(flow.events).some(e => e.event === "token_refresh_failed");
    }, { timeout: 65000, intervals: [500] }).toBe(true);
    expect(flow.requests).toHaveLength(0);
    await expect(flow.controller.locator('[data-testid="media-upload-grid"] img')).toHaveCount(1);
    await expect(flow.controller.getByRole("button", { name: /Sign in to enable AI Tools/ })).toHaveCount(0);
    await expect(flow.controller.locator("#quickvint-gen-btn")).toBeDisabled();
    if (process.env.AUTH_QA_DIR) await flow.controller.screenshot({ path: path.join(process.env.AUTH_QA_DIR, `network-wait-${testInfo.repeatEachIndex}.png`) });
    flow.connect();
    const data = await checkSuccess(flow, testInfo, "expired-silent-recovery");
    expect(flow.requests).toHaveLength(1);
    expect(new Set(flow.accepted).size).toBe(1);
    expect(data.events.some(e => e.event === "auth_action_result" && e.context.resultStatus === "blocked")).toBe(true);
    expect(data.events.some(e => e.event === "auth_action_result" && e.context.resultStatus === "recovered")).toBe(true);
  } finally { flow.release(); await flow.close(); }
});

test("HTTP 401 renews and retries only the identical generation request", async ({}, testInfo) => {
  const flow = await journey({ connected: true });
  try {
    await flow.controller.locator("#quickvint-gen-btn").dblclick();
    const data = await checkSuccess(flow, testInfo, "401-exact-replay");
    expect(flow.requests).toHaveLength(2);
    expect(flow.requests[1].id).toBe(flow.requests[0].id);
    expect(flow.requests[1].rawBody).toBe(flow.requests[0].rawBody);
    expect(flow.accepted).toHaveLength(1);
    const results = data.events.filter(e => e.event === "auth_action_result");
    const blocked = results.find(e => e.context.resultStatus === "blocked");
    const recovered = results.find(e => e.context.resultStatus === "recovered");
    expect(blocked).toBeTruthy(); expect(recovered).toBeTruthy();
    expect(recovered.context.operationId).toBe(blocked.context.operationId);
    expect(recovered.context.generationAttemptId).toBe(blocked.context.generationAttemptId);
  } finally { flow.release(); await flow.close(); }
});

test("a real worker termination during credential renewal resumes the original click", async ({}, testInfo) => {
  test.setTimeout(60000);
  const flow = await journey({ expired: true, hold: true });
  try {
    await flow.controller.locator("#quickvint-gen-btn").click();
    await expect.poll(() => flow.authRequests.length).toBeGreaterThan(0);
    await flow.restartWorker();
    await expect(flow.controller.getByRole("button", { name: /Sign in to enable AI Tools/ })).toHaveCount(0);
    await expect(flow.controller.locator("#quickvint-gen-btn")).toBeDisabled();
    expect(flow.requests).toHaveLength(0);
    flow.connect();
    const data = await checkSuccess(flow, testInfo, "worker-inflight-recovery");
    expect(data.events.some(e => e.event === "auth_action_result" && e.context.resultStatus === "blocked" && e.context.reason === "background_unavailable")).toBe(true);
    expect(flow.requests).toHaveLength(1);
    expect(flow.accepted).toHaveLength(1);
  } finally { flow.release(); await flow.close(); }
});

test("a lost reply after renewal replays one generation identity without another modeled charge", async ({}, testInfo) => {
  const flow = await journey({ connected: true, generate: ({ route, request, commits, oldToken, accepted }) => {
    if (oldToken) return route.fulfill({ status: 401, json: { error: "Expired access" } });
    accepted.push(request.id);
    if (accepted.length === 1) return route.abort("connectionreset");
    return route.fulfill({ json: commits.get(request.id) });
  } });
  try {
    await flow.controller.locator("#quickvint-gen-btn").click();
    await checkSuccess(flow, testInfo, "renewal-lost-reply");
    expect(flow.requests).toHaveLength(3);
    expect(new Set(flow.requests.map(r => r.id)).size).toBe(1);
    expect(new Set(flow.requests.map(r => r.rawBody)).size).toBe(1);
    expect(new Set(flow.accepted).size).toBe(1);
  } finally { flow.release(); await flow.close(); }
});

test("repeated HTTP 401 stops after one auth replay without signing out the retained session", async () => {
  const flow = await journey({ connected: true, generate: ({ route }) => route.fulfill({ status: 401, json: { error: "Rejected" } }) });
  try {
    await flow.controller.locator("#quickvint-gen-btn").click();
    await expect(flow.controller.locator("#quickvint-toast")).toContainText("Could not authorize generation");
    await expect(flow.controller.locator("#quickvint-gen-btn")).toBeEnabled();
    expect(flow.requests).toHaveLength(2);
    expect(flow.requests[1].rawBody).toBe(flow.requests[0].rawBody);
    expect(flow.requests[1].id).toBe(flow.requests[0].id);
    await expect(flow.controller.getByRole("button", { name: /Sign in to enable AI Tools/ })).toHaveCount(0);
    expect(flow.accepted).toHaveLength(0);
    await expect(flow.controller.locator('[data-testid="media-upload-grid"] img')).toHaveCount(1);
  } finally { flow.release(); await flow.close(); }
});

for (const code of ["refresh_token_not_found", "session_not_found"]) test(`${code} requires sign-in and retains photos without generating`, async ({}, testInfo) => {
  const flow = await journey({ expired: true });
  try {
    flow.rejectSession(code);
    await flow.controller.locator("#quickvint-gen-btn").click();
    await expect(flow.controller.getByRole("button", { name: /Sign in to enable AI Tools/ })).toBeVisible();
    fs.writeFileSync(testInfo.outputPath("rejection.json"), JSON.stringify({ code, authRequests: flow.authRequests, photosRetained: true }, null, 2));
    expect(flow.requests).toHaveLength(0);
    await expect(flow.controller.locator('[data-testid="media-upload-grid"] img')).toHaveCount(1);
  } finally { flow.release(); await flow.close(); }
});

test("a temporary auth HTTP 500 cannot sign out the saved session and recovers the pending click", async ({}, testInfo) => {
  const flow = await journey({ expired: true });
  try {
    flow.failServer();
    await flow.controller.locator("#quickvint-gen-btn").click();
    await expect.poll(async () => {
      await flow.worker.evaluate(() => AutoListerTelemetry.flush());
      return unique(flow.events).some(e => e.event === "token_refresh_failed" && e.context.statusCode === 500);
    }).toBe(true);
    await expect(flow.controller.getByRole("button", { name: /Sign in to enable AI Tools/ })).toHaveCount(0);
    expect(await flow.worker.evaluate(async () => Boolean((await chrome.storage.local.get("supabaseSession")).supabaseSession?.refresh_token))).toBe(true);
    expect(flow.requests).toHaveLength(0);
    flow.connect();
    await checkSuccess(flow, testInfo, "auth-500-recovery");
    expect(flow.accepted).toHaveLength(1);
  } finally { flow.release(); await flow.close(); }
});

test("account changes during renewal cancel the waiting action without generation", async () => {
  const flow = await journey({ expired: true, hold: true });
  try {
    await flow.controller.locator("#quickvint-gen-btn").click();
    await expect.poll(() => flow.authRequests.length).toBeGreaterThan(0);
    await flow.worker.evaluate(session => chrome.storage.local.set({ supabaseSession: {
      ...session, user: { id: "00000000-0000-4000-8000-000000000002", email: "other@example.invalid" },
    } }), flow.fresh);
    flow.connect();
    await expect(flow.controller.locator("#quickvint-gen-btn")).toBeEnabled();
    expect(flow.requests).toHaveLength(0);
    await expect(flow.controller.locator('[data-testid="title--input"]')).toHaveValue("");
    await expect(flow.controller.locator('[data-testid="media-upload-grid"] img')).toHaveCount(1);
    expect(await flow.worker.evaluate(async () => (await chrome.storage.local.get("supabaseSession")).supabaseSession?.user?.id)).toBe("00000000-0000-4000-8000-000000000002");
  } finally { flow.release(); await flow.close(); }
});

test("sign-out during renewal cannot be undone by the old response", async () => {
  const flow = await journey({ expired: true, hold: true });
  try {
    await flow.controller.locator("#quickvint-gen-btn").click();
    await expect.poll(() => flow.authRequests.length).toBeGreaterThan(0);
    const signingOut = sendFromExtensionContent(flow.context, flow.controller, { type: "SIGN_OUT" });
    await expect.poll(() => flow.worker.evaluate(() => requestedSignOuts)).toBe(1);
    flow.connect();
    expect((await signingOut).ok).toBe(true);
    await expect(flow.controller.getByRole("button", { name: /Sign in to enable AI Tools/ })).toBeVisible();
    await expect(flow.controller.getByRole("button", { name: /Sign in to enable AI Tools/ })).toBeEnabled();
    await expect(flow.controller.locator("#quickvint-toast")).toContainText("account changed");
    expect(flow.requests).toHaveLength(0);
    expect(await flow.worker.evaluate(async () => (await chrome.storage.local.get("supabaseSession")).supabaseSession)).toBeUndefined();
    await expect(flow.controller.locator('[data-testid="media-upload-grid"] img')).toHaveCount(1);
  } finally { flow.release(); await flow.close(); }
});

test("changed settings cancel a waiting renewal instead of generating the old selection", async () => {
  const flow = await journey({ expired: true, hold: true });
  try {
    await flow.controller.locator("#quickvint-gen-btn").click();
    await expect.poll(() => flow.authRequests.length).toBeGreaterThan(0);
    await flow.worker.evaluate(() => chrome.storage.local.set({ tone: "friendly" }));
    flow.connect();
    await expect(flow.controller.locator("#quickvint-gen-btn")).toBeEnabled();
    expect(flow.requests).toHaveLength(0);
    await expect(flow.controller.locator("#quickvint-toast")).toContainText("Settings changed");
  } finally { flow.release(); await flow.close(); }
});

test("Stop during batch auth renewal prevents replay and preserves the batch photos", async () => {
  test.setTimeout(60000);
  const flow = await journey();
  try {
    await flow.start();
    await expect.poll(() => flow.requests.length).toBe(1);
    const work = flow.context.pages().find(page => page !== flow.controller && page.url().includes("/items/new"));
    await expect(work.locator("#quickvint-batch-tab-status")).toContainText("Waiting for connection");
    await flow.controller.locator(".batch-stop").click();
    await expect(flow.controller.locator(".batch-recovery-resume")).toBeVisible();
    flow.connect();
    await expect(flow.controller.locator(".batch-title")).toHaveText("Batch paused");
    await expect(work.locator('[data-testid="media-upload-grid"] img')).toHaveCount(1);
    const saved = await flow.worker.evaluate(async () => (await chrome.storage.local.get("quickvintBatchRecovery")).quickvintBatchRecovery);
    expect(saved.reason).toBe("user_stopped");
    expect(saved.groups[0]).toHaveLength(1);
    expect(flow.requests).toHaveLength(1);
    expect(flow.accepted).toHaveLength(0);
    expect(flow.cleanup).toHaveLength(0);
  } finally { flow.release(); await flow.close(); }
});
