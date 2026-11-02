const { test, expect } = require("@playwright/test");
const path = require("node:path");
const { openBatchJourney, sendFromExtensionContent } = require("./batch-journey");

const user = { id: "00000000-0000-4000-8000-000000000001", email: "seller@example.invalid" };
const session = seconds => {
  const exp = Math.floor(Date.now() / 1000) + seconds;
  return {
    access_token: [Buffer.from('{"alg":"HS256","typ":"JWT"}').toString("base64url"),
      Buffer.from(JSON.stringify({ sub: user.id, exp })).toString("base64url"), "local-signature"].join("."),
    refresh_token: "local-refresh-0", expires_at: exp, user,
  };
};

async function establishWarmSession(flow) {
  await flow.worker.evaluate(() => {
    const original = updateAndStoreUserProfile;
    globalThis.__profileChecks = { started: 0, pending: 0 };
    updateAndStoreUserProfile = async (...args) => {
      __profileChecks.started++; __profileChecks.pending++;
      try { return await original(...args); }
      finally { __profileChecks.pending--; }
    };
  });
  await flow.worker.evaluate(value => supabaseClient.auth.setSession(value), session(3600));
  // The controller performs a usage check after initialization. Let that real
  // request finish before aging the session into the refresh window.
  await expect.poll(() => flow.worker.evaluate(async () => Boolean(
    (await chrome.storage.local.get("quickvintUserUsageSnapshot")).quickvintUserUsageSnapshot
  ))).toBe(true);
  await expect.poll(() => flow.worker.evaluate(() => __profileChecks.started > 0 &&
    __profileChecks.pending === 0 && !tokenRefreshPromise)).toBe(true);
}

test("a warm SDK timer and a waiting credential request do not rotate the same token twice", async () => {
  test.setTimeout(90000);
  const flow = await openBatchJourney({ session: session(3600) });
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const tokens = [];
  const initiators = [];
  try {
    await flow.context.route("https://jqloiovdwjaornnfvmyu.supabase.co/**", async route => {
      const pathname = new URL(route.request().url()).pathname;
      if (pathname.endsWith("/token")) {
        initiators.push(await flow.worker.evaluate(() => tokenRefreshPromise ? "coordinator" : "sdk_timer"));
        tokens.push(route.request().postDataJSON().refresh_token);
        if (tokens.length === 1) await gate;
        return route.fulfill({ json: { ...session(7200), refresh_token: "local-renewed",
          expires_in: 3600, token_type: "bearer" } });
      }
      if (pathname.endsWith("/user")) return route.fulfill({ json: user });
      return route.fulfill({ json: { subscription_status: "active", subscription_tier: "pro" } });
    });
    await flow.controller.locator('[data-testid="add-photos-input"]').setInputFiles(path.resolve(__dirname, "../../images/quickvint-upload-single.jpg"));
    await establishWarmSession(flow);
    await flow.worker.evaluate(async () => {
      const now = Date.now.bind(Date);
      Date.now = () => now() + 3485000;
      scheduleTokenRefresh(await getStoredSession());
    });
    // Controlled clock advancement ages an established session without a new
    // SIGNED_IN event. The SDK and coordinator timers themselves are real.
    await expect.poll(() => tokens.length, { timeout: 70000 }).toBeGreaterThan(0);
    console.log("warm refresh initiator:", initiators[0]);
    await flow.worker.evaluate(() => {
      const original = refreshTokenWithRetry;
      globalThis.__credentialRefreshEntered = false;
      refreshTokenWithRetry = (...args) => {
        if (args[1]?.entryPoint === "access_token_request") __credentialRefreshEntered = true;
        return original(...args);
      };
    });
    const pending = sendFromExtensionContent(flow.context, flow.controller, {
      type: "GET_ACCESS_TOKEN", forceRefresh: true, expectedUserId: user.id,
    });
    // Wait for this message to reach the coordinator, not just the scheduled
    // operation which was already pending before the content message was sent.
    await expect.poll(() => flow.worker.evaluate(() => __credentialRefreshEntered && Boolean(tokenRefreshPromise))).toBe(true);
    release();
    const result = await pending;
    expect(result.access_token).toBeTruthy();
    expect(tokens).toEqual(["local-refresh-0"]);
    expect(await flow.worker.evaluate(async () => (await getStoredSession()).refresh_token)).toBe("local-renewed");
    await expect(flow.controller.locator('[data-testid="media-upload-grid"] img')).toHaveCount(1);
    expect(flow.requests).toHaveLength(0);
  } finally { release(); await flow.close(); }
});

test("a failed scheduled refresh retries after reconnect without a new click", async () => {
  const flow = await openBatchJourney({ session: session(3600) });
  let disconnected = false;
  let rotations = 0;
  try {
    await flow.context.route("https://jqloiovdwjaornnfvmyu.supabase.co/**", async route => {
      const pathname = new URL(route.request().url()).pathname;
      if (disconnected && pathname.startsWith("/auth/")) {
        return route.fulfill({ status: 500, json: { message: "Temporary test outage" } });
      }
      if (pathname.endsWith("/token")) {
        rotations++;
        return route.fulfill({ json: { ...session(7200), refresh_token: "local-reconnected",
          expires_in: 3600, token_type: "bearer" } });
      }
      if (pathname.endsWith("/user")) return route.fulfill({ json: user });
      return route.fulfill({ json: { subscription_status: "active", subscription_tier: "pro" } });
    });
    await flow.controller.locator('[data-testid="add-photos-input"]').setInputFiles(path.resolve(__dirname, "../../images/quickvint-upload-single.jpg"));
    await establishWarmSession(flow);
    disconnected = true;
    await flow.worker.evaluate(async () => {
      const realTimeout = globalThis.setTimeout;
      // Accelerate only the existing one-minute refresh scheduling floor.
      // SDK logic, storage, messages and HTTP handling remain real.
      globalThis.setTimeout = (callback, ms, ...args) => realTimeout(callback, ms === 60000 ? 250 : ms, ...args);
      const now = Date.now.bind(Date);
      Date.now = () => now() + 3480000;
      scheduleTokenRefresh(await getStoredSession());
    });
    await expect.poll(async () => {
      await flow.worker.evaluate(() => AutoListerTelemetry.flush());
      return flow.events.some(event => event.event === "token_refresh_failed" &&
        event.context.entryPoint === "scheduled_refresh");
    }).toBe(true);
    await flow.worker.evaluate(async () => { if (tokenRefreshPromise) await tokenRefreshPromise; });
    expect(await flow.worker.evaluate(async () => (await getStoredSession())?.refresh_token)).toBe("local-refresh-0");
    disconnected = false;
    await expect.poll(() => flow.worker.evaluate(async () => (await getStoredSession())?.refresh_token),
      { timeout: 7000 }).toBe("local-reconnected");
    expect(rotations).toBe(1);
    await expect(flow.controller.locator('[data-testid="media-upload-grid"] img')).toHaveCount(1);
    expect(flow.requests).toHaveLength(0);
  } finally { await flow.close(); }
});
