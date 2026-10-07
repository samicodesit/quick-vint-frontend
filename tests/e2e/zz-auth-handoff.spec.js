const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { test, expect, chromium } = require("@playwright/test");

const extensionPath = path.resolve(__dirname, "../..");
const authContextCleanups = new Set();
const apiPathCandidates = [
  process.env.AUTOLISTER_API_PATH
    ? path.resolve(process.env.AUTOLISTER_API_PATH)
    : null,
  path.resolve(extensionPath, "../quick-vint-api"),
  path.resolve(extensionPath, "../quick-vint"),
].filter(Boolean);
const apiPath = apiPathCandidates.find((candidate) =>
  fs.existsSync(path.join(candidate, "src/pages/auth/callback.html")),
);

const callbackHtml = apiPath
  ? fs.readFileSync(path.join(apiPath, "src/pages/auth/callback.html"), "utf8")
  : "";
const callbackJs = apiPath
  ? fs.readFileSync(path.join(apiPath, "public/auth-callback.js"), "utf8")
  : "";

function fakeAccessToken(email = "seller@example.com") {
  const header = Buffer.from(
    JSON.stringify({ alg: "HS256", typ: "JWT" }),
  ).toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({
      sub: "user-e2e",
      email,
      exp: Math.floor(Date.now() / 1000) + 3600,
    }),
  ).toString("base64url");
  const signature = Buffer.from("signature").toString("base64url");
  return `${header}.${payload}.${signature}`;
}

async function loadExtension() {
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "quick-vint-auth-"));
  const context = await chromium.launchPersistentContext(userDataDir, {
    channel: "chromium",
    headless: process.env.E2E_HEADED !== "1",
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
    ],
  });

  let [serviceWorker] = context.serviceWorkers();
  if (!serviceWorker) {
    serviceWorker = await context.waitForEvent("serviceworker");
  }
  const cleanup = async () => {
    await context.close();
    fs.rmSync(userDataDir, { recursive: true, force: true });
    authContextCleanups.delete(cleanup);
  };
  authContextCleanups.add(cleanup);
  return { context, serviceWorker, cleanup };
}

async function installAuthRoutes(context, events, options = {}) {
  await context.route("https://autolister.app/auth/callback**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "text/html",
      body: callbackHtml,
    }),
  );
  await context.route("https://autolister.app/auth-callback.js", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/javascript",
      body: callbackJs,
    }),
  );
  for (const name of ["registry", "core", "client", "website"]) {
    await context.route(`https://autolister.app/telemetry-${name}.js`, route => route.fulfill({ status: 200, contentType: "application/javascript", body: fs.readFileSync(path.join(apiPath, `public/telemetry-${name}.js`), "utf8") }));
  }
  await context.route("https://autolister.app/api/events/track", async (route) => {
    const body = await route.request().postDataJSON();
    events.push(...(body.events || [body]));
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ acknowledgedIds: (body.events || []).map(event => event.id) }) });
  });
  await context.route(
    "https://jqloiovdwjaornnfvmyu.supabase.co/auth/v1/user",
    (route) =>
      route.fulfill({
        status: options.rejectSupabaseUser ? 401 : 200,
        contentType: "application/json",
        body: options.rejectSupabaseUser
          ? JSON.stringify({ message: "invalid JWT" })
          : JSON.stringify({ id: "user-e2e", email: "seller@example.com" }),
      }),
  );
  await context.route(
    "https://jqloiovdwjaornnfvmyu.supabase.co/rest/v1/profiles**",
    (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          email: "seller@example.com",
          subscription_status: "active",
          subscription_tier: "pro",
          api_calls_this_month: 0,
          is_legacy_plan: false,
          free_lifetime_generations_used: 0,
          pack_credits: 0,
        }),
      }),
  );
  await context.route("https://autolister.app/uninstall**", (route) =>
    route.fulfill({ status: 204, body: "" }),
  );
}

test.describe("HTTPS auth handoff", () => {
  test.skip(!apiPath, "API checkout is not available");
  test.afterEach(async () => {
    for (const cleanup of [...authContextCleanups]) await cleanup();
  });

  test("carries a pre-install website source through welcome and the Google-style extension callback without extra UI", async () => {
    const { context, serviceWorker, cleanup } = await loadExtension();
    try {
      const events = [];
      await installAuthRoutes(context, events);
      const source = { source: "google", medium: "search", campaign: null, content: null,
        capturedAt: new Date().toISOString(), referrerHost: "www.google.com" };
      await context.addInitScript(source => {
        if (location.origin === "https://autolister.app") localStorage.setItem("autolister.first_touch.v1", JSON.stringify(source));
      }, source);
      await context.route("https://autolister.app/welcome", route => route.fulfill({
        status: 200, contentType: "text/html", body: "<!doctype html><title>Welcome</title><p>Existing welcome page</p>",
      }));
      await serviceWorker.evaluate(() => {
        globalThis.acquisitionRequests = [];
        const originalFetch = globalThis.fetch;
        globalThis.fetch = async (url, options) => {
          if (url === "https://autolister.app/api/attribution/claim") {
            globalThis.acquisitionRequests.push({ body: JSON.parse(options.body), authorization: options.headers.Authorization });
            return new Response(JSON.stringify({ ok: true }), { status: 200 });
          }
          return originalFetch(url, options);
        };
      });
      const welcome = await context.newPage();
      await welcome.goto("https://autolister.app/welcome");
      await expect.poll(() => serviceWorker.evaluate(() =>
        chrome.storage.local.get("autolister.first_touch.v1"))).toMatchObject({
          "autolister.first_touch.v1": { attribution: source },
        });
      await welcome.close();
      const callback = await context.newPage();
      const extensionId = new URL(serviceWorker.url()).hostname;
      const token = fakeAccessToken();
      await callback.goto(`chrome-extension://${extensionId}/callback.html#access_token=${token}&refresh_token=refresh-e2e&expires_in=3600`);
      await expect.poll(() => serviceWorker.evaluate(() => globalThis.acquisitionRequests)).toEqual([
        { body: { attribution: source }, authorization: `Bearer ${token}` },
      ]);
      await expect.poll(() => serviceWorker.evaluate(() =>
        chrome.storage.local.get(["autolister.first_touch.v1", "supabaseSession"]))).toMatchObject({
          "autolister.first_touch.v1": { userId: "user-e2e", claimed: true },
          supabaseSession: { user: { id: "user-e2e" } },
        });
    } finally { await cleanup(); }
  });

  test("captures a website source that arrives after the bridge loads and copies only source fields", async () => {
    const { context, serviceWorker, cleanup } = await loadExtension();
    try {
      await context.route("https://autolister.app/**", route => route.fulfill({
        status: 200, contentType: "text/html", body: "<!doctype html><title>AutoLister</title><p>Existing content</p>",
      }));
      const page = await context.newPage();
      await page.goto("https://autolister.app/");
      const source = { source: "tiktok", medium: "paid_social", campaign: "seller-test", content: "proof",
        capturedAt: new Date().toISOString(), referrerHost: "www.tiktok.com" };
      await page.evaluate(source => {
        localStorage.setItem("unrelated-auth-key", "private-session");
        localStorage.setItem("autolister.first_touch.v1", JSON.stringify({ ...source, email: "private-email", access_token: "private-token" }));
        document.dispatchEvent(new Event("autolister:attribution-ready"));
      }, source);
      await expect.poll(async () => {
        await page.evaluate(() => document.dispatchEvent(new Event("autolister:attribution-ready")));
        return serviceWorker.evaluate(() => chrome.storage.local.get("autolister.first_touch.v1"));
      }).toEqual({
          "autolister.first_touch.v1": { attribution: source },
      });
      await expect(page.locator("p")).toHaveText("Existing content");
    } finally { await cleanup(); }
  });
  test("hands Supabase magic-link tokens from the real web callback page to the loaded extension", async () => {
    const { context, serviceWorker } = await loadExtension();
    const events = [];
    await installAuthRoutes(context, events);
    const accessToken = fakeAccessToken();

    const page = await context.newPage();
    const closePromise = page.waitForEvent("close", { timeout: 6000 });
    await page.goto(
      `https://autolister.app/auth/callback#access_token=${accessToken}&refresh_token=refresh-e2e&expires_in=3600&token_type=bearer`,
    );

    await expect(page.locator("#authCallbackStatus")).toHaveText("Signed in.");
    await expect(page.locator("#authCountdown")).toHaveText("3");
    await expect
      .poll(() => page.evaluate(() => window.location.hash))
      .toBe("");
    await expect
      .poll(() =>
        serviceWorker.evaluate(() =>
          chrome.storage.local.get(["supabaseSession", "accountEmail", "userProfile"]),
        ),
      )
      .toMatchObject({
        supabaseSession: {
          access_token: accessToken,
          refresh_token: "refresh-e2e",
          user: { email: "seller@example.com" },
        },
        accountEmail: "seller@example.com",
        userProfile: {
          email: "seller@example.com",
          subscription_tier: "pro",
        },
      });
    await expect.poll(() => events.map((event) => event.event)).toEqual(
      expect.arrayContaining([
        "auth_link_landed",
        "auth_extension_handoff_started",
        "auth_extension_handoff_success",
        "auth_success",
      ]),
    );
    await closePromise;

    await context.close();
  });

  test("does not overwrite an existing stored session when Supabase rejects the handoff token", async () => {
    const { context, serviceWorker } = await loadExtension();
    const events = [];
    await installAuthRoutes(context, events, { rejectSupabaseUser: true });
    const badAccessToken = fakeAccessToken("bad@example.com");
    await serviceWorker.evaluate(() =>
      chrome.storage.local.set({
        supabaseSession: {
          access_token: "old-access",
          refresh_token: "old-refresh",
          user: { email: "existing@example.com" },
        },
        accountEmail: "existing@example.com",
      }),
    );

    const page = await context.newPage();
    await page.goto(
      `https://autolister.app/auth/callback#access_token=${badAccessToken}&refresh_token=bad-refresh`,
    );

    await expect(page.locator("#authCallbackStatus")).toHaveText(
      "Could not open the extension.",
    );
    await expect
      .poll(() =>
        serviceWorker.evaluate(() =>
          chrome.storage.local.get(["supabaseSession", "accountEmail"]),
        ),
      )
      .toEqual({
        supabaseSession: {
          access_token: "old-access",
          refresh_token: "old-refresh",
          user: { email: "existing@example.com" },
        },
        accountEmail: "existing@example.com",
      });
    await expect.poll(() => events.map((event) => event.event)).toEqual(
      expect.arrayContaining([
        "auth_link_landed",
        "auth_extension_handoff_started",
        "auth_extension_handoff_error",
      ]),
    );

    await context.close();
  });
});
