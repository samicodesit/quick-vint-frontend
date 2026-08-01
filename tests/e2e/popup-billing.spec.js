const fs = require("node:fs");
const path = require("node:path");
const { test, expect } = require("@playwright/test");

const extensionPath = path.resolve(__dirname, "../..");
const popupHtml = fs.readFileSync(path.join(extensionPath, "popup.html"), "utf8");
const languageDefaultsPath = path.join(extensionPath, "language-defaults.js");
const popupScriptPath = path.join(extensionPath, "popup.js");

function createSession(email = "seller@example.com") {
  return {
    access_token: "stored-access-token",
    refresh_token: "stored-refresh-token",
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user: {
      id: "stored-user-id",
      email,
    },
  };
}

function createPaidProfile() {
  return {
    subscription_status: "active",
    subscription_tier: "starter",
    current_period_end: "2026-07-29T00:00:00.000Z",
    api_calls_this_month: 0,
    free_lifetime_generations_used: 0,
    pack_credits: 0,
  };
}

function createCustomBusinessProfile() {
  return {
    subscription_status: "active",
    subscription_tier: "business",
    current_period_end: "2026-08-07T23:59:59.000Z",
    api_calls_this_month: 91,
    free_lifetime_generations_used: 5,
    pack_credits: 0,
    custom_daily_limit: 100,
    custom_monthly_limit: 1000,
    custom_limit_expires_at: "2026-08-07T23:59:59.000Z",
  };
}

function createFreeProfile() {
  return {
    subscription_status: "free",
    subscription_tier: "free",
    api_calls_this_month: 0,
    free_lifetime_generations_used: 5,
    pack_credits: 0,
  };
}

async function installPopupHarness(page, options = {}) {
  const {
    initialStorage = {},
    validSessionResponse = null,
  } = options;

  await page.setContent(popupHtml, { waitUntil: "domcontentloaded" });
  await page.evaluate(
    ({ storageSeed, validSessionFixture }) => {
      const storage = { ...storageSeed };
      const eventLogs = [];
      const openedUrls = [];
      const popupOpenedUrls = [];
      let supabaseGetSessionCalls = 0;

      window.__popupHarness = {
        storage,
        eventLogs,
        openedUrls,
        popupOpenedUrls,
        getSupabaseGetSessionCalls: () => supabaseGetSessionCalls,
      };

      window.open = (url) => {
        popupOpenedUrls.push(url);
        return { closed: false, focus: () => {} };
      };

      window.supabase = {
        createClient: () => ({
          auth: {
            getSession: async () => {
              supabaseGetSessionCalls += 1;
              return { data: { session: null }, error: null };
            },
            signInWithOAuth: async () => ({ data: { url: "https://auth.test" } }),
            signOut: async () => ({ error: null }),
          },
        }),
      };

      function pickStorage(keys) {
        if (!keys) return { ...storage };
        if (Array.isArray(keys)) {
          return Object.fromEntries(
            keys
              .filter((key) => Object.prototype.hasOwnProperty.call(storage, key))
              .map((key) => [key, storage[key]]),
          );
        }
        if (typeof keys === "string") {
          return Object.prototype.hasOwnProperty.call(storage, keys)
            ? { [keys]: storage[keys] }
            : {};
        }
        return Object.fromEntries(
          Object.keys(keys).map((key) => [
            key,
            Object.prototype.hasOwnProperty.call(storage, key)
              ? storage[key]
              : keys[key],
          ]),
        );
      }

      window.chrome = {
        runtime: {
          id: "test-extension",
          lastError: null,
          getManifest: () => ({ version: "1.3.25" }),
          getURL: (assetPath) => `chrome-extension://test-extension/${assetPath}`,
          onMessage: { addListener: () => {} },
          sendMessage: (message, callback) => {
            let response = { ok: true };
            if (message?.type === "AUTH_UPDATED") {
              response = { ok: true };
            } else if (message?.type === "GET_VALID_SESSION") {
              response =
                validSessionFixture ||
                (storage.supabaseSession?.user?.email
                  ? {
                      ok: true,
                      email: storage.supabaseSession.user.email,
                      userId: storage.supabaseSession.user.id || null,
                      expires_at: storage.supabaseSession.expires_at || null,
                    }
                  : { ok: false, reason: "no_session" });
            } else if (message?.type === "GET_USER_USAGE_COUNT") {
              response =
                storage.userUsageCount || {
                  daily: 0,
                  monthly: 0,
                  tier: storage.userProfile?.subscription_tier || "free",
                  isLegacy: false,
                  limits: { daily: 10, monthly: 75 },
                  freeLifetimeUsed: 0,
                  freeLifetimeLimit: 5,
                  packCredits: storage.userProfile?.pack_credits || 0,
                };
            }
            setTimeout(() => callback?.(response), 0);
          },
        },
        tabs: {
          create: async ({ url }) => {
            openedUrls.push(url);
            return { id: openedUrls.length, url };
          },
          query: async () => [{ url: "https://www.vinted.com/items/new" }],
        },
        storage: {
          local: {
            get: (keys, callback) => {
              const result = pickStorage(keys);
              setTimeout(() => callback?.(result), 0);
              return Promise.resolve(result);
            },
            set: (values, callback) => {
              Object.assign(storage, values);
              setTimeout(() => callback?.(), 0);
              return Promise.resolve();
            },
            remove: (keys, callback) => {
              const list = Array.isArray(keys) ? keys : [keys];
              list.forEach((key) => delete storage[key]);
              setTimeout(() => callback?.(), 0);
              return Promise.resolve();
            },
          },
          onChanged: { addListener: () => {} },
        },
      };
    },
    { storageSeed: initialStorage, validSessionFixture: validSessionResponse },
  );

  await page.addScriptTag({ path: languageDefaultsPath });
  await page.addScriptTag({ path: popupScriptPath });
  await page.evaluate(() => {
    document.dispatchEvent(new Event("DOMContentLoaded"));
  });
}

test.describe("popup billing portal", () => {
  test("shows active custom business limits in the popup", async ({ page }) => {
    await page.route("https://autolister.app/api/events/track", (route) =>
      route.fulfill({ status: 204, body: "" }),
    );

    await installPopupHarness(page, {
      initialStorage: {
        supabaseSession: createSession("fuerallezugang@gmail.com"),
        userProfile: createCustomBusinessProfile(),
        userUsageCount: {
          daily: 12,
          monthly: 91,
          tier: "business",
          isLegacy: false,
          isCustomPlan: true,
          limits: { daily: 100, monthly: 1000 },
          freeLifetimeUsed: 5,
          freeLifetimeLimit: 5,
          packCredits: 0,
        },
      },
    });

    await expect(page.locator("#planName")).toHaveText("Custom Plan");
    await expect(page.locator("#dailyMeterLabel")).toHaveText("Daily usage");
    await expect(page.locator("#monthlyMeterLabel")).toHaveText("Monthly usage");
    await expect(page.locator("#dailyCallsUsed")).toHaveText("12 / 100");
    await expect(page.locator("#monthlyCallsUsed")).toHaveText("91 / 1000");
    await expect(page.locator("#dailyProgressBar")).toHaveAttribute("style", /width: 12%/);
    await expect(page.locator("#monthlyProgressBar")).toHaveAttribute("style", /width: 9\.1%/);
  });

  test("separates free quota usage from the extra-credit balance", async ({ page }) => {
    await page.route("https://autolister.app/api/events/track", (route) =>
      route.fulfill({ status: 204, body: "" }),
    );

    await installPopupHarness(page, {
      initialStorage: {
        supabaseSession: createSession(),
        userProfile: { ...createFreeProfile(), pack_credits: 10 },
        userUsageCount: {
          daily: 0,
          monthly: 0,
          tier: "free",
          limits: { daily: 5, monthly: 5 },
          freeLifetimeUsed: 5,
          freeLifetimeLimit: 5,
          packCredits: 10,
        },
      },
    });

    await expect(page.locator("#dailyMeterLabel")).toHaveText("Free listings");
    await expect(page.locator("#dailyCallsUsed")).toHaveText("5 / 5 used");
    await expect(page.locator("#dailyProgressBar")).toHaveAttribute("style", /width: 100%/);
    await expect(page.locator("#monthlyCallsUsed")).toHaveText("10 available");
    await expect(page.locator("#monthlyProgressBar").locator("..")).toBeHidden();
  });

  test("opens the billing portal from the stored extension session, not popup Supabase memory", async ({
    page,
  }) => {
    const portalRequests = [];
    await page.route("https://autolister.app/api/events/track", (route) =>
      route.fulfill({ status: 204, body: "" }),
    );
    await page.route("https://autolister.app/api/stripe/create-portal", (route) => {
      portalRequests.push(route.request().postDataJSON());
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ url: "https://billing.test/session" }),
      });
    });

    await installPopupHarness(page, {
      initialStorage: {
        supabaseSession: createSession("seller@example.com"),
        userProfile: createPaidProfile(),
      },
    });

    await expect(page.locator("#manageBtn")).toBeVisible();
    await page.locator("#manageBtn").click();

    await expect
      .poll(() => portalRequests.length, { message: "portal request count" })
      .toBe(1);
    expect(portalRequests[0]).toEqual({ email: "seller@example.com" });

    const openedUrls = await page.evaluate(() => window.__popupHarness.openedUrls);
    expect(openedUrls).toEqual(["https://billing.test/session"]);

    const supabaseSessionCalls = await page.evaluate(() =>
      window.__popupHarness.getSupabaseGetSessionCalls(),
    );
    expect(supabaseSessionCalls).toBe(0);
  });

  test("does not open Stripe when paid UI is stale but the stored session is gone", async ({
    page,
  }) => {
    const portalRequests = [];
    const trackedEvents = [];
    await page.route("https://autolister.app/api/stripe/create-portal", (route) => {
      portalRequests.push(route.request().postDataJSON());
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ url: "https://billing.test/session" }),
      });
    });
    await page.route("https://autolister.app/api/events/track", async (route) => {
      trackedEvents.push(route.request().postDataJSON());
      return route.fulfill({ status: 204, body: "" });
    });

    await installPopupHarness(page, {
      initialStorage: {
        supabaseSession: createSession("seller@example.com"),
        userProfile: createPaidProfile(),
      },
    });

    await expect(page.locator("#manageBtn")).toBeVisible();
    await page.evaluate(() => {
      delete window.__popupHarness.storage.supabaseSession;
    });
    await page.locator("#manageBtn").click();

    await expect
      .poll(() => portalRequests.length, { message: "portal request count" })
      .toBe(0);
    await expect(page.locator("#messages")).toContainText(
      "Please sign in to manage your subscription.",
    );
    await expect(page.locator("body")).toHaveAttribute("data-view", "signed-out");

    await expect
      .poll(
        () =>
          trackedEvents.flatMap((body) => body.events || []).map((event) => event.event),
        { message: "tracked event names" },
      )
      .toContain("billing_portal_signin_required");
  });

  test("does not open Stripe when token verification loses the stored session", async ({
    page,
  }) => {
    const portalRequests = [];
    const trackedEvents = [];
    await page.route("https://autolister.app/api/stripe/create-portal", (route) => {
      portalRequests.push(route.request().postDataJSON());
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ url: "https://billing.test/session" }),
      });
    });
    await page.route("https://autolister.app/api/events/track", async (route) => {
      trackedEvents.push(route.request().postDataJSON());
      return route.fulfill({ status: 204, body: "" });
    });

    await installPopupHarness(page, {
      initialStorage: {
        supabaseSession: createSession("seller@example.com"),
        userProfile: createPaidProfile(),
      },
      validSessionResponse: { ok: false, reason: "no_session" },
    });

    await expect(page.locator("#manageBtn")).toBeVisible();
    await page.locator("#manageBtn").click();

    await expect
      .poll(() => portalRequests.length, { message: "portal request count" })
      .toBe(0);
    await expect(page.locator("#messages")).toContainText(
      "Please sign in to manage your subscription.",
    );
    await expect
      .poll(
        () =>
          trackedEvents.flatMap((body) => body.events || []).map((event) => event.event),
        { message: "tracked event names" },
      )
      .toContain("billing_portal_signin_required");
  });

  test("subscription checkout uses the stored extension session, not popup Supabase memory", async ({
    page,
  }) => {
    const checkoutRequests = [];
    await page.route("https://autolister.app/api/events/track", (route) =>
      route.fulfill({ status: 204, body: "" }),
    );
    await page.route("https://autolister.app/api/stripe/create-checkout", (route) => {
      checkoutRequests.push(route.request().postDataJSON());
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ url: "https://checkout.test/subscription" }),
      });
    });

    await installPopupHarness(page, {
      initialStorage: {
        supabaseSession: createSession("seller@example.com"),
        userProfile: createFreeProfile(),
      },
    });

    await expect(page.locator("#upgradeBtn")).toBeVisible();
    await page.locator("#upgradeBtn").click();

    await expect
      .poll(() => checkoutRequests.length, {
        message: "subscription checkout request count",
      })
      .toBe(1);
    expect(checkoutRequests[0]).toEqual({
      email: "seller@example.com",
      tier: "starter",
      source: "extension_popup",
    });

    const openedUrls = await page.evaluate(() => window.__popupHarness.openedUrls);
    expect(openedUrls).toEqual(["https://checkout.test/subscription"]);
    const supabaseSessionCalls = await page.evaluate(() =>
      window.__popupHarness.getSupabaseGetSessionCalls(),
    );
    expect(supabaseSessionCalls).toBe(0);
  });

  test("credit checkout uses the stored extension session, not popup Supabase memory", async ({
    page,
  }) => {
    const checkoutRequests = [];
    await page.route("https://autolister.app/api/events/track", (route) =>
      route.fulfill({ status: 204, body: "" }),
    );
    await page.route(
      "https://autolister.app/api/stripe/create-credit-checkout",
      (route) => {
        checkoutRequests.push(route.request().postDataJSON());
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ url: "https://checkout.test/credits" }),
        });
      },
    );

    await installPopupHarness(page, {
      initialStorage: {
        supabaseSession: createSession("seller@example.com"),
        userProfile: createFreeProfile(),
      },
    });

    await expect(page.locator("#creditPackBtn")).toBeVisible();
    await page.locator("#creditPackBtn").click();

    await expect
      .poll(() => checkoutRequests.length, {
        message: "credit checkout request count",
      })
      .toBe(1);
    expect(checkoutRequests[0]).toEqual({
      email: "seller@example.com",
      source: "extension_popup",
    });

    const openedUrls = await page.evaluate(() => window.__popupHarness.openedUrls);
    expect(openedUrls).toEqual(["https://checkout.test/credits"]);
    const supabaseSessionCalls = await page.evaluate(() =>
      window.__popupHarness.getSupabaseGetSessionCalls(),
    );
    expect(supabaseSessionCalls).toBe(0);
  });

  test("prevents duplicate portal requests from repeated clicks while loading", async ({
    page,
  }) => {
    let releasePortal;
    const portalRequests = [];
    await page.route("https://autolister.app/api/events/track", (route) =>
      route.fulfill({ status: 204, body: "" }),
    );
    await page.route("https://autolister.app/api/stripe/create-portal", async (route) => {
      portalRequests.push(route.request().postDataJSON());
      await new Promise((resolve) => {
        releasePortal = resolve;
      });
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ url: "https://billing.test/session" }),
      });
    });

    await installPopupHarness(page, {
      initialStorage: {
        supabaseSession: createSession("seller@example.com"),
        userProfile: createPaidProfile(),
      },
    });

    await expect(page.locator("#manageBtn")).toBeVisible();
    await page.evaluate(() => {
      document.querySelector("#manageBtn").click();
      document.querySelector("#manageBtn").click();
    });

    await expect
      .poll(() => portalRequests.length, { message: "portal request count" })
      .toBe(1);
    releasePortal();
    await expect
      .poll(
        () =>
          page.evaluate(
            () => window.__popupHarness?.openedUrls?.length || 0,
          ),
        { message: "opened billing windows" },
      )
      .toBe(1);
  });
});
