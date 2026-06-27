const fs = require("node:fs");
const path = require("node:path");
const { test, expect, chromium } = require("@playwright/test");

const extensionPath = path.resolve(__dirname, "../..");
const languageDefaultsPath = path.join(extensionPath, "language-defaults.js");
const contentScriptPath = path.join(extensionPath, "content.js");
const listingFixture = fs.readFileSync(
  path.resolve(__dirname, "../fixtures/vinted-listing.html"),
  "utf8",
);

async function loadExtension() {
  const userDataDir = fs.mkdtempSync(
    path.join(require("node:os").tmpdir(), "quick-vint-e2e-"),
  );
  const context = await chromium.launchPersistentContext(userDataDir, {
    channel: "chromium",
    headless: false,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
    ],
  });

  let [serviceWorker] = context.serviceWorkers();
  if (!serviceWorker) {
    serviceWorker = await context.waitForEvent("serviceworker");
  }

  return { context, serviceWorker };
}

function installChromeHarness(page, capacityResponse = null) {
  return page.evaluate((capacity) => {
    const storage = {
      supabaseSession: {
        access_token: "test-access-token",
        refresh_token: "test-refresh-token",
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        user: {
          id: "test-user",
          email: "seller@example.com",
        },
      },
      userProfile: {
        subscription_status: "active",
        subscription_tier: "pro",
        api_calls_this_month: 0,
        pack_credits: 0,
      },
      selectedLanguage: "en",
      selectedTitleLanguage: "en",
      selectedDescriptionLanguage: "en",
      tone: "standard",
      useBulletPoints: true,
    };

    window.chrome = {
      runtime: {
        id: "test-extension",
        getManifest: () => ({ version: "1.3.17" }),
        getURL: (assetPath) => `chrome-extension://test-extension/${assetPath}`,
        onMessage: { addListener: () => {} },
        sendMessage: (message, callback) => {
          let response = { ok: true };
          if (message?.type === "GET_ACCESS_TOKEN") {
            response = {
              access_token: storage.supabaseSession.access_token,
              expires_at: storage.supabaseSession.expires_at,
            };
          } else if (message?.type === "GET_BATCH_CAPACITY") {
            response = { ok: true, capacity };
          } else if (message?.type === "GET_USER_PROFILE") {
            response = {
              user: storage.supabaseSession.user,
              profile: storage.userProfile,
            };
          }

          setTimeout(() => callback?.(response), 0);
        },
      },
      storage: {
        local: {
          get: (keys, callback) => {
            const result = {};
            const requested =
              keys && typeof keys === "object" && !Array.isArray(keys)
                ? Object.keys(keys)
                : Array.isArray(keys)
                  ? keys
                  : [keys];
            requested.forEach((key) => {
              if (Object.prototype.hasOwnProperty.call(storage, key)) {
                result[key] = storage[key];
              } else if (
                keys &&
                typeof keys === "object" &&
                !Array.isArray(keys) &&
                Object.prototype.hasOwnProperty.call(keys, key)
              ) {
                result[key] = keys[key];
              }
            });
            setTimeout(() => callback?.(result), 0);
            return Promise.resolve(result);
          },
          set: (values, callback) => {
            Object.assign(storage, values);
            setTimeout(() => callback?.(), 0);
            return Promise.resolve();
          },
        },
        onChanged: { addListener: () => {} },
      },
    };
  }, capacityResponse);
}

async function openContentHarness(page, capacityResponse = null) {
  const pageErrors = [];
  const consoleErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  await page.setContent(listingFixture, { waitUntil: "domcontentloaded" });
  await installChromeHarness(page, capacityResponse);
  await page.addScriptTag({ path: languageDefaultsPath });
  await page.addScriptTag({ path: contentScriptPath });
  try {
    await expect(page.locator("#quickvint-gen-btn")).toBeVisible();
  } catch (err) {
    throw new Error(
      [
        "Content harness did not inject the Generate button.",
        pageErrors.length ? `Page errors: ${pageErrors.join(" | ")}` : "",
        consoleErrors.length ? `Console errors: ${consoleErrors.join(" | ")}` : "",
        err.message,
      ]
        .filter(Boolean)
        .join("\n"),
    );
  }
  await expect(page.locator("#quickvint-phone-btn")).toBeVisible();
}

test.describe("AutoLister extension smoke flows", () => {
  test("loads the MV3 extension service worker and manifest", async () => {
    const { context, serviceWorker } = await loadExtension();
    try {
      const manifest = await serviceWorker.evaluate(() =>
        chrome.runtime.getManifest(),
      );
      expect(manifest.manifest_version).toBe(3);
      expect(manifest.background.service_worker).toBe("background.js");
      expect(manifest.content_scripts[0].js).toEqual([
        "language-defaults.js",
        "content.js",
      ]);
      expect(manifest.host_permissions).toContain("https://autolister.app/*");
    } finally {
      await context.close();
    }
  });

  test("generates listing copy into Vinted fields", async ({ page }) => {
    const requestBodies = [];
    await page.route("https://autolister.app/api/generate", (route) => {
      requestBodies.push(route.request().postDataJSON());
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          title: "Black Test Jacket",
          description: "Clean black jacket in good condition.",
          measurementAdvice: "",
        }),
      });
    });

    await openContentHarness(page);
    await page.locator("#quickvint-gen-btn").click();

    await expect(page.locator('[data-testid="title--input"]')).toHaveValue(
      "Black Test Jacket",
    );
    await expect(page.locator('[data-testid="description--input"]')).toHaveValue(
      /Clean black jacket/,
    );
    expect(requestBodies[0].useEmojis).toBe(true);
  });

  test("lets free users remove emojis locally and saves the preference", async ({
    page,
  }) => {
    const requestBodies = [];
    await page.route("https://autolister.app/api/generate", (route) => {
      const requestBody = route.request().postDataJSON();
      requestBodies.push(requestBody);
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          title: "Black Test Jacket with emojis",
          description:
            "✨ Clean black jacket ✅ Size EU 38 © brand ™ 🇬🇧 #️⃣ 1️⃣",
          measurementAdvice: "",
        }),
      });
    });

    await openContentHarness(page);
    await page.evaluate(() =>
      chrome.storage.local.set({
        userProfile: {
          subscription_status: "free",
          subscription_tier: "free",
          api_calls_this_month: 0,
          pack_credits: 0,
        },
      }),
    );

    await page.locator("#quickvint-gen-btn").click();
    await expect(page.locator("#quickvint-description-apply-prompt")).toContainText(
      "Remove emojis?",
    );

    await page.locator(".quickvint-apply-add").click();

    await expect(page.locator('[data-testid="title--input"]')).toHaveValue(
      "Black Test Jacket with emojis",
    );
    await expect(page.locator('[data-testid="description--input"]')).toHaveValue(
      "Clean black jacket Size EU 38 © brand ™",
    );
    expect(requestBodies).toHaveLength(1);
    expect(requestBodies[0].useEmojis).toBe(true);
    expect(requestBodies[0].emojiRetry).toBe(false);
    await expect(
      page.locator("#quickvint-description-apply-prompt"),
    ).toHaveCount(0);

    const storedUseEmojis = await page.evaluate(
      () => chrome.storage.local.get("useEmojis"),
    );
    expect(storedUseEmojis.useEmojis).toBe(false);
    await expect(page.locator("#quickvint-emoji-toggle")).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  test("lets free users claim a generation offer without regenerating", async ({
    page,
  }) => {
    const requestBodies = [];
    let claimCount = 0;
    await page.route("https://autolister.app/api/generate", (route) => {
      requestBodies.push(route.request().postDataJSON());
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          title: "Black Test Jacket",
          description: "Clean black jacket in good condition.",
          measurementAdvice: "",
          offers: [
            {
              id: "offer-label-1",
              campaignKey: "label_photo_bonus_2026_06",
              offerCode: "free_label_photo_generation",
              creditAmount: 1,
              title: "Forgot the label photo?",
              body: "Label photos help create better descriptions.",
              cta: "🎁 Claim 1 free generation",
            },
          ],
        }),
      });
    });
    await page.route(
      "https://autolister.app/api/user/generation-offers/claim",
      (route) => {
        claimCount += 1;
        expect(route.request().postDataJSON()).toEqual({
          offerId: "offer-label-1",
        });
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            ok: true,
            offerId: "offer-label-1",
            campaignKey: "label_photo_bonus_2026_06",
            offerCode: "free_label_photo_generation",
            creditAmount: 1,
            packCredits: 1,
          }),
        });
      },
    );

    await openContentHarness(page);
    await page.evaluate(() =>
      chrome.storage.local.set({
        userProfile: {
          subscription_status: "free",
          subscription_tier: "free",
          api_calls_this_month: 0,
          free_lifetime_generations_used: 0,
          pack_credits: 0,
        },
      }),
    );

    await page.locator("#quickvint-gen-btn").click();
    const prompt = page.locator("#quickvint-description-apply-prompt");
    await expect(prompt).toContainText(
      "Forgot the label photo?",
    );
    await expect(prompt).toContainText(
      "Label photos help create better descriptions.",
    );
    await expect(prompt).toContainText("🎁 Claim 1 free generation");

    await page.locator("#quickvint-description-apply-prompt .quickvint-apply-add").click();
    await expect(page.locator("#quickvint-toast.success")).toContainText(
      "1 free generation added.",
    );
    expect(requestBodies).toHaveLength(1);
    expect(claimCount).toBe(1);

    const storedProfile = await page.evaluate(() =>
      chrome.storage.local.get("userProfile"),
    );
    expect(storedProfile.userProfile.pack_credits).toBe(1);
  });

  test("does not allow Starter users to enable emoji generation", async ({
    page,
  }) => {
    const requestBodies = [];
    await page.route("https://autolister.app/api/generate", (route) => {
      requestBodies.push(route.request().postDataJSON());
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          title: "Black Test Jacket",
          description: "Clean black jacket in good condition.",
          measurementAdvice: "",
        }),
      });
    });

    await openContentHarness(page);
    await page.evaluate(() =>
      chrome.storage.local.set({
        useEmojis: true,
        userProfile: {
          subscription_status: "active",
          subscription_tier: "starter",
          api_calls_this_month: 0,
          pack_credits: 0,
        },
      }),
    );
    await page.waitForTimeout(1100);

    await expect(page.locator("#quickvint-emoji-toggle")).toBeDisabled();
    await expect(page.locator("#quickvint-emoji-toggle")).toHaveAttribute(
      "aria-pressed",
      "false",
    );

    await page.locator("#quickvint-gen-btn").click();
    await expect.poll(() => requestBodies.length).toBe(1);
    expect(requestBodies[0].useEmojis).toBe(false);
  });

  test("lets users permanently hide clothing measurement advice", async ({
    page,
  }) => {
    await page.route("https://autolister.app/api/generate", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          title: "Black Test Jacket",
          description: "Clean black jacket in good condition.",
          measurementAdvice: "Add chest and length measurements.",
        }),
      }),
    );

    await openContentHarness(page);
    await page.locator("#quickvint-gen-btn").click();

    const toast = page.locator("#quickvint-toast.info");
    await expect(toast).toBeVisible();
    await expect(toast).toContainText(
      "adding simple measurements can reduce buyer questions",
    );

    await page.locator("#quickvint-toast .toast-action-button").click();
    await expect(toast).not.toBeVisible();

    await page.waitForTimeout(2100);
    await page.locator('[data-testid="description--input"]').fill("");
    await page.locator("#quickvint-gen-btn").click();
    await page.waitForTimeout(700);

    await expect(page.locator("#quickvint-toast.info")).not.toBeVisible();
  });

  test("shows contact and paid options for paused accounts", async ({ page }) => {
    await page.route("https://autolister.app/api/generate", (route) =>
      route.fulfill({
        status: 403,
        contentType: "application/json",
        body: JSON.stringify({
          code: "account_paused",
          error:
            "This account is paused because it appears linked to duplicate free-trial usage. To continue, contact support or choose a paid option.",
        }),
      }),
    );

    await openContentHarness(page);
    await page.locator("#quickvint-gen-btn").click();

    const toast = page.locator("#quickvint-toast.error");
    await expect(toast).toBeVisible();
    await expect(toast).toContainText("account is paused");
    await expect(toast).toContainText("View paid options");
    await expect(toast).toContainText("Contact support");
    await expect(page.locator("#quickvint-gen-btn")).toBeEnabled();

    await page.locator("#quickvint-toast .toast-action-button").click();
    await expect(page.locator("#quickvint-toast.paywall")).toBeVisible();
    await expect(page.locator("#quickvint-toast.paywall")).toContainText(
      "Continue with a paid option",
    );
    await expect(page.locator("#quickvint-toast.paywall")).toContainText(
      "Starter",
    );
  });

  test("blocks phone upload before QR modal when no generation capacity remains", async ({
    page,
  }) => {
    await openContentHarness(page, {
      allowed: false,
      available: 0,
      reason: "free_lifetime_limit",
      tier: "free",
      nextTier: "starter",
      message:
        "Free listing limit reached. Upgrade your plan or buy a one-time credit pack.",
    });

    await page.locator("#quickvint-phone-btn").click();

    await expect(page.locator("#quickvint-phone-modal")).toHaveCount(0);
    await expect(page.locator("#quickvint-toast.paywall")).toBeVisible();
    await expect(page.locator("#quickvint-toast.paywall")).toContainText(
      "Free listings used",
    );
  });
});
