const fs = require("node:fs");
const path = require("node:path");
const { test, expect, chromium } = require("@playwright/test");

const extensionPath = path.resolve(__dirname, "../..");
const languageDefaultsPath = path.join(extensionPath, "language-defaults.js");
const contentScriptPath = path.join(extensionPath, "content.js");
const tinyPngDataUrl =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=";
const listingFixture = fs.readFileSync(
  path.resolve(__dirname, "../fixtures/vinted-listing.html"),
  "utf8",
);
const freeLimitPaywallSeenStorageKey =
  "quickvintLimitPaywallSeen:test-user:limit_followup_offer_v1";

async function loadExtension() {
  const userDataDir = fs.mkdtempSync(
    path.join(require("node:os").tmpdir(), "quick-vint-e2e-"),
  );
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

  return { context, serviceWorker };
}

function installChromeHarness(page, capacityResponse = null, initialStorage = {}) {
  return page.evaluate(({ capacity, initialStorage }) => {
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
      descriptionLength: "long",
      useHashtags: true,
      ...initialStorage,
    };
    const runtimeMessages = [];
    const runtimeListeners = [];
    const openedWindows = [];

    window.__extensionHarness = {
      storage,
      runtimeMessages,
      runtimeListeners,
      openedWindows,
    };

    window.open = (url = "") => {
      const openedWindow = {
        closed: false,
        location: { href: url },
        close() {
          this.closed = true;
        },
        focus() {},
      };
      openedWindows.push(openedWindow);
      return openedWindow;
    };

    window.chrome = {
      runtime: {
        id: "test-extension",
        getManifest: () => ({ version: "1.3.17" }),
        getURL: (assetPath) => `chrome-extension://test-extension/${assetPath}`,
        onMessage: { addListener: (listener) => runtimeListeners.push(listener) },
        sendMessage: (message, callback) => {
          runtimeMessages.push(message);
          let response = { ok: true };
          if (message?.type === "GET_ACCESS_TOKEN") {
            response = {
              access_token: storage.supabaseSession?.access_token,
              expires_at: storage.supabaseSession?.expires_at,
            };
          } else if (message?.type === "GET_BATCH_CAPACITY") {
            response = { ok: true, capacity };
          } else if (message?.type === "GET_USER_PROFILE") {
            response = {
              user: storage.supabaseSession?.user || null,
              profile: storage.userProfile,
            };
          } else if (message?.type === "GET_USER_USAGE_COUNT") {
            response = storage.__usageResponse || {
              daily: 0,
              monthly: Number(storage.userProfile?.api_calls_this_month || 0),
              tier: storage.userProfile?.subscription_tier || "free",
              isLegacy: false,
              limits: {
                free: { daily: 5, monthly: 5 },
                starter: { daily: 10, monthly: 75 },
                pro: { daily: 25, monthly: 250 },
                business: { daily: 60, monthly: 600 },
              }[storage.userProfile?.subscription_tier || "free"],
              freeLifetimeUsed: Number(
                storage.userProfile?.free_lifetime_generations_used || 0,
              ),
              freeLifetimeLimit: 5,
              packCredits: Number(storage.userProfile?.pack_credits || 0),
            };
          } else if (message?.type === "CREATE_CHECKOUT") {
            response = storage.__checkoutResponse || {
              ok: true,
              url: "https://checkout.test/session",
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
  }, { capacity: capacityResponse, initialStorage });
}

async function openContentHarness(page, capacityResponse = null, options = {}) {
  const pageErrors = [];
  const consoleErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  await page.setContent(listingFixture, { waitUntil: "domcontentloaded" });
  if (options.emptyListing) {
    await page.evaluate(() => {
      document.querySelectorAll(".photo-box").forEach((node) => node.remove());
      document.querySelector('[data-testid="title--input"]').value = "";
      document.querySelector('[data-testid="description--input"]').value = "";
    });
  }
  await installChromeHarness(page, capacityResponse, options.initialStorage || {});
  if (options.shortenOfferTimers) {
    await page.evaluate(() => {
      const originalSetTimeout = window.setTimeout.bind(window);
      window.setTimeout = (callback, delay, ...args) => {
        const shortenedDelay =
          delay === 4000 || delay === 10000 ? 25 : delay;
        return originalSetTimeout(callback, shortenedDelay, ...args);
      };
    });
  }
  if (options.shortenPhoneUploadPoll) {
    await page.evaluate(() => {
      const originalSetInterval = window.setInterval.bind(window);
      window.setInterval = (callback, delay, ...args) => {
        return originalSetInterval(
          callback,
          delay === 3000 ? 25 : delay,
          ...args,
        );
      };
    });
  }
  await page.addScriptTag({ path: languageDefaultsPath });
  await page.addScriptTag({ path: contentScriptPath });
  if (options.expectAuthenticated === false) {
    await expect(page.locator("#quickvint-signin-btn")).toBeVisible();
    await expect(page.locator("#quickvint-gen-btn")).not.toBeVisible();
    return;
  }
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
  await expect(
    page.locator("#quickvint-description-length-toggle"),
  ).toBeVisible();
  await expect(page.locator("#quickvint-output-shape-toggle")).toBeVisible();
  await expect(page.locator("#quickvint-hashtags-toggle")).toBeVisible();
  await expect(page.locator("#quickvint-description-footer-btn")).toBeVisible();
}

async function routeManualStorageUploads(page) {
  const uploadedFiles = [];
  const uploadRequests = [];
  const uploadBodies = [];
  const cleanupRequests = [];
  await page.route("https://autolister.app/api/phone-upload**", (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.searchParams.get("action") === "cleanup") {
      cleanupRequests.push(request.url());
      return route.fulfill({ status: 204, body: "" });
    }
    if (request.method() === "POST") {
      uploadRequests.push(request.url());
      uploadBodies.push(request.postDataBuffer()?.toString("latin1") || "");
      const index = uploadedFiles.length;
      const name = `${String(index).padStart(6, "0")}-manual-${index + 1}.png`;
      const file = {
        name,
        path: `manual-session/${name}`,
        url: `https://storage.test/manual-${index + 1}.png?token=signed-${index + 1}`,
        order: index,
      };
      uploadedFiles.push(file);
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          count: 1,
          expectedCount: 1,
          files: [file],
        }),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        files: uploadedFiles,
        count: uploadedFiles.length,
        complete: true,
      }),
    });
  });
  return { uploadedFiles, uploadRequests, uploadBodies, cleanupRequests };
}

async function openImageCompressionHarness(page, proxyResponse) {
  await page.setContent(listingFixture, { waitUntil: "domcontentloaded" });
  await installChromeHarness(page);
  await page.evaluate((response) => {
    const originalSendMessage = window.chrome.runtime.sendMessage;
    window.__AUTOLISTER_TEST_HOOKS__ = {};
    window.__proxyFetchMessages = [];
    window.chrome.runtime.sendMessage = (message, callback) => {
      if (message?.type === "PROXY_FETCH") {
        window.__proxyFetchMessages.push(message);
        setTimeout(() => callback?.(response), 0);
        return;
      }
      originalSendMessage(message, callback);
    };
  }, proxyResponse);
  await page.addScriptTag({ path: languageDefaultsPath });
  await page.addScriptTag({ path: contentScriptPath });
  await expect
    .poll(() =>
      page.evaluate(
        () => typeof window.__AUTOLISTER_TEST_HOOKS__.compressImages,
      ),
    )
    .toBe("function");
}

test.describe("AutoLister extension smoke flows", () => {
  test("hides listing tools and saved-note edit control while signed out", async ({
    page,
  }) => {
    await openContentHarness(page, null, {
      expectAuthenticated: false,
      initialStorage: {
        supabaseSession: null,
        userProfile: null,
      },
    });

    await expect(page.locator(".quickvint-note-control")).not.toBeVisible();
    await expect(
      page.locator("#quickvint-description-footer-edit-btn"),
    ).not.toBeVisible();
    await expect(
      page.locator("#quickvint-description-footer-btn"),
    ).not.toBeVisible();
  });

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

  test("runs phone upload through the loaded MV3 extension when Vinted thumbnails are late", async () => {
    const { context, serviceWorker } = await loadExtension();
    const page = await context.newPage();
    const requestBodies = [];
    const trackedEvents = [];
    const sessions = [];
    const cleanupRequests = [];
    let resolveGenerate;
    const generateMayFinish = new Promise((resolve) => {
      resolveGenerate = resolve;
    });
    try {
      await serviceWorker.evaluate(() =>
        chrome.storage.local.set({
          supabaseSession: {
            access_token: "test-access-token",
            refresh_token: "test-refresh-token",
            expires_at: Math.floor(Date.now() / 1000) + 3600,
            user: { id: "test-user", email: "seller@example.com" },
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
          descriptionLength: "long",
          useHashtags: true,
        }),
      );

      await context.route("https://www.vinted.com/items/new", (route) =>
        route.fulfill({
          status: 200,
          contentType: "text/html",
          body: listingFixture,
        }),
      );
      await context.route("https://autolister.app/api/user/batch-capacity", (route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ allowed: true, available: 10 }),
        }),
      );
      await context.route("https://autolister.app/api/events/track", (route) => {
        trackedEvents.push(route.request().postDataJSON());
        return route.fulfill({ status: 204, body: "" });
      });
      await context.route("https://autolister.app/api/generate", async (route) => {
        requestBodies.push(route.request().postDataJSON());
        await generateMayFinish;
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            title: "Loaded Extension Upload",
            description: "Generated through the loaded extension.",
            measurementAdvice: "",
          }),
        });
      });
      await context.route("https://autolister.app/api/phone-upload**", (route) => {
        const url = new URL(route.request().url());
        if (url.searchParams.get("action") === "cleanup") {
          cleanupRequests.push(route.request().url());
          return route.fulfill({ status: 204, body: "" });
        }
        const sessionId = url.searchParams.get("sessionId");
        if (!sessions.includes(sessionId)) sessions.push(sessionId);
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            files: [
              {
                name: "phone-real-1.jpg",
                path: "phone-real-1.jpg",
                url: "https://storage.test/phone-real-1.jpg",
              },
              {
                name: "phone-real-2.jpg",
                path: "phone-real-2.jpg",
                url: "https://storage.test/phone-real-2.jpg",
              },
            ],
            count: 2,
            complete: true,
          }),
        });
      });
      await context.route("https://storage.test/**", (route) =>
        route.fulfill({
          status: 200,
          contentType: "image/png",
          body: Buffer.from(tinyPngDataUrl.split(",")[1], "base64"),
        }),
      );

      await page.goto("https://www.vinted.com/items/new", {
        waitUntil: "domcontentloaded",
      });
      await page.evaluate(() => {
        document.querySelectorAll(".photo-box").forEach((node) => node.remove());
        document.querySelector('[data-testid="title--input"]').value = "";
        document.querySelector('[data-testid="description--input"]').value = "";
      });

      await expect(page.locator("#quickvint-phone-btn")).toBeVisible();
      await page.locator("#quickvint-phone-btn").click();
      await expect(page.locator("#quickvint-phone-modal .preview-thumb")).toHaveCount(2);
      await expect(page.locator("#quickvint-phone-modal .status")).toHaveText(
        "2 photos ready to generate.",
      );
      await expect(page.locator(".photo-box")).toHaveCount(0);

      await page.locator("#quickvint-phone-modal .generate-btn").click();
      await expect.poll(() => requestBodies.length).toBe(1);
      await expect(page.locator("#quickvint-phone-modal")).toBeVisible();
      await expect.poll(() => cleanupRequests.length).toBe(0);

      resolveGenerate();
      await expect(page.locator("#quickvint-phone-modal")).toHaveCount(0);

      expect(requestBodies[0].imageMetadata).toHaveLength(2);
      expect(requestBodies[0].imageUrls).toEqual([
        "https://storage.test/phone-real-1.jpg",
        "https://storage.test/phone-real-2.jpg",
      ]);
      expect(requestBodies[0].imageMetadata[0]).toMatchObject({
        sourceSelection: "captured_upload_file",
        promptSource: "captured_upload_file",
        sourceKind: "remote_url",
        sourceUrl: "https://storage.test/phone-real-1.jpg",
        capturedUploadSource: "phone_upload_single",
        capturedUploadMatchStatus: "vinted_pending_using_captured",
        generationPayloadSource: "phone_upload_storage_url",
      });
      expect(sessions).toHaveLength(1);
      const eventNames = trackedEvents.flatMap((body) =>
        (body.events || []).map((event) => event.event),
      );
      expect(eventNames).not.toContain("phone_upload_generate_blocked");
    } finally {
      await context.close();
    }
  });

  test("background checkout uses the stored account email when the session is missing", async () => {
    const { context, serviceWorker } = await loadExtension();
    const checkoutRequests = [];
    try {
      await context.route(
        "https://autolister.app/api/stripe/create-checkout",
        async (route) => {
          checkoutRequests.push(route.request().postDataJSON());
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              url: "https://checkout.test/from-background",
            }),
          });
        },
      );

      await serviceWorker.evaluate(async () => {
        await chrome.storage.local.remove([
          "supabaseSession",
          "userProfile",
          "accountEmail",
        ]);
      });

      const missingEmailResult = await serviceWorker.evaluate(() =>
        createCheckout({
          checkoutType: "subscription",
          tier: "pro",
          source: "extension_paywall",
        }),
      );

      expect(missingEmailResult).toEqual({
        ok: false,
        reason: "no_checkout_email",
        error: "Please sign in again before checkout.",
      });
      expect(checkoutRequests).toEqual([]);

      const checkoutResult = await serviceWorker.evaluate(async () => {
        await chrome.storage.local.set({ accountEmail: "Seller@Example.com " });
        return createCheckout({
          checkoutType: "subscription",
          tier: "pro",
          source: "extension_paywall",
        });
      });

      expect(checkoutResult).toEqual({
        ok: true,
        url: "https://checkout.test/from-background",
      });
      expect(checkoutRequests).toEqual([
        {
          email: "seller@example.com",
          source: "extension_paywall",
          tier: "pro",
        },
      ]);
    } finally {
      await context.close();
    }
  });

  test("generates listing copy into Vinted fields", async ({ page }) => {
    const requestBodies = [];
    const eventBatches = [];
    await page.route("https://autolister.app/api/events/track", (route) => {
      eventBatches.push(route.request().postDataJSON());
      return route.fulfill({
        status: 204,
        body: "",
      });
    });
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
    expect(requestBodies[0].descriptionLength).toBe("long");
    expect(requestBodies[0].useHashtags).toBe(true);

    await expect
      .poll(
        () =>
          eventBatches
            .flatMap((batch) => batch.events || [])
            .filter((event) =>
              ["generate_click", "generate_request"].includes(event.event),
            ),
        { timeout: 5000 },
      )
      .toHaveLength(2);

    const events = eventBatches.flatMap((batch) => batch.events || []);
    for (const eventName of ["generate_click", "generate_request"]) {
      const event = events.find((candidate) => candidate.event === eventName);
      expect(event.context.photoCount).toBe(1);
      expect(event.context.imageSources).toHaveLength(1);
      expect(event.context.imageSources[0]).toMatchObject({
        index: 1,
        sourceKind: "data_url",
        sourceUrl: null,
      });
      expect(event.context.imageSources[0].domNaturalWidth).toBeGreaterThan(0);
      expect(event.context.imageSources[0].domNaturalHeight).toBeGreaterThan(0);
    }
  });

  test("logs compact diagnostics when the generate fetch fails before response", async ({
    page,
  }) => {
    const eventBatches = [];
    await page.route("https://autolister.app/api/events/track", (route) => {
      eventBatches.push(route.request().postDataJSON());
      return route.fulfill({
        status: 204,
        body: "",
      });
    });
    await page.route("https://autolister.app/api/generate", (route) =>
      route.abort("failed"),
    );

    await openContentHarness(page);
    await page.locator("#quickvint-gen-btn").click();

    await expect
      .poll(
        () =>
          eventBatches
            .flatMap((batch) => batch.events || [])
            .some((event) => event.event === "generate_error"),
        { timeout: 5000 },
      )
      .toBe(true);

    const events = eventBatches.flatMap((batch) => batch.events || []);
    const requestEvent = events.find((event) => event.event === "generate_request");
    const errorEvent = events.find((event) => event.event === "generate_error");

    expect(errorEvent.context).toMatchObject({
      mode: "manual",
      phase: "fetch",
      photoCount: 1,
      navigatorOnline: true,
      requestBodyImageCount: 1,
      generationMode: "manual",
    });
    expect(errorEvent.context.generationAttemptId).toBe(
      requestEvent.context.generationAttemptId,
    );
    expect(errorEvent.context.elapsedMs).toEqual(expect.any(Number));
    expect(errorEvent.context.requestBodyBytes).toEqual(expect.any(Number));
    expect(errorEvent.context.compressedImageBytes).toEqual(expect.any(Number));
    expect(errorEvent.context.errorName).toEqual(expect.any(String));
    expect(errorEvent.context.message).toEqual(expect.any(String));
    expect(errorEvent.context.stack).toEqual(expect.any(String));
  });

  test("lets sellers switch output shape from the listing tools", async ({
    page,
  }) => {
    const requestBodies = [];
    await page.route("https://autolister.app/api/events/track", (route) =>
      route.fulfill({ status: 204, body: "" }),
    );
    await page.route("https://autolister.app/api/generate", (route) => {
      requestBodies.push(route.request().postDataJSON());
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          title: "Paragraph Test Jacket",
          description: "Paragraph description.",
          measurementAdvice: "",
        }),
      });
    });

    await openContentHarness(page);
    await expect(page.locator("#quickvint-output-shape-toggle")).toBeVisible();
    await expect(
      page.locator("#quickvint-output-shape-toggle .format-icon-bullet"),
    ).toHaveCount(3);
    await expect(
      page.locator("#quickvint-output-shape-toggle .format-icon-para span"),
    ).toHaveCount(4);
    await page
      .locator("#quickvint-output-shape-toggle [data-format='paragraphs']")
      .click();
    await page.locator("#quickvint-gen-btn").click();

    await expect.poll(() => requestBodies.length).toBe(1);
    expect(requestBodies[0].useBulletPoints).toBe(false);
    expect(
      await page.evaluate(() => window.__extensionHarness.storage.useBulletPoints),
    ).toBe(false);
  });

  test("uses uploaded storage URLs for batch files when Vinted thumbnails are late", async ({
    page,
  }) => {
    const requestBodies = [];
    await page.route("https://autolister.app/api/events/track", (route) =>
      route.fulfill({ status: 204, body: "" }),
    );
    await page.route("https://autolister.app/api/generate", (route) => {
      requestBodies.push(route.request().postDataJSON());
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          title: "Late Thumbnail Batch",
          description: "Generated before Vinted thumbnails appeared.",
          measurementAdvice: "",
        }),
      });
    });

    await openContentHarness(page, null, { emptyListing: true });

    const result = await page.evaluate(async (dataUrl) => {
      const originalSendMessage = window.chrome.runtime.sendMessage;
      const originalSetInterval = window.setInterval.bind(window);
      const originalNow = Date.now.bind(Date);
      let fakeNow = originalNow();
      const blob = await (await fetch(dataUrl)).blob();
      const blobUrl = URL.createObjectURL(blob);

      window.chrome.runtime.sendMessage = (message, callback) => {
        if (message?.type === "PROXY_FETCH") {
          setTimeout(() => callback?.({ ok: true, data: blobUrl }), 0);
          return;
        }
        originalSendMessage(message, callback);
      };
      Date.now = () => fakeNow;
      window.setInterval = (callback, delay, ...args) =>
        originalSetInterval(
          () => {
            if (delay === 500) fakeNow += 61000;
            callback(...args);
          },
          delay === 500 ? 5 : delay,
        );

      const listener = window.__extensionHarness.runtimeListeners.find(
        (candidate) => typeof candidate === "function",
      );
      return await new Promise((resolve) => {
        listener(
          {
            type: "RUN_BATCH_ITEM",
            itemIndex: 1,
            totalItems: 1,
            files: [{ url: "https://phone-upload.test/item-a.jpg", name: "item-a.jpg" }],
          },
          {},
          resolve,
        );
      });
    }, tinyPngDataUrl);

    expect(result).toMatchObject({ ok: true });
    expect(requestBodies[0].imageUrls).toEqual([
      "https://phone-upload.test/item-a.jpg",
    ]);
    expect(requestBodies[0].imageMetadata).toHaveLength(1);
    expect(requestBodies[0].imageMetadata[0]).toMatchObject({
      sourceSelection: "captured_upload_file",
      promptSource: "captured_upload_file",
      sourceKind: "remote_url",
      sourceUrl: "https://phone-upload.test/item-a.jpg",
      capturedUploadSource: "phone_upload_batch",
      generationPayloadSource: "phone_upload_storage_url",
    });
  });

  test("uploads manual captured files to temp storage for generation", async ({
    page,
  }) => {
    const requestBodies = [];
    const eventBatches = [];
    const manualStorage = await routeManualStorageUploads(page);
    await page.route("https://autolister.app/api/events/track", (route) => {
      eventBatches.push(route.request().postDataJSON());
      return route.fulfill({
        status: 204,
        body: "",
      });
    });
    await page.route("https://autolister.app/api/generate", (route) => {
      requestBodies.push(route.request().postDataJSON());
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          title: "Captured Original Jacket",
          description: "Generated from captured upload file.",
          measurementAdvice: "",
        }),
      });
    });

    await openContentHarness(page);

    const uploadBuffer = Buffer.from(tinyPngDataUrl.split(",")[1], "base64");
    await page.setInputFiles('[data-testid="add-photos-input"]', {
      name: "original-upload.png",
      mimeType: "image/png",
      buffer: uploadBuffer,
    });
    await page.locator("#quickvint-gen-btn").click();

    await expect(page.locator('[data-testid="title--input"]')).toHaveValue(
      "Captured Original Jacket",
    );
    expect(manualStorage.uploadRequests.length).toBeGreaterThan(0);
    expect(manualStorage.uploadBodies[0]).toContain(
      'Content-Type: image/jpeg',
    );
    expect(requestBodies[0].imageUrls).toEqual([
      "https://storage.test/manual-1.png?token=signed-1",
    ]);
    expect(requestBodies[0].imageMetadata).toHaveLength(1);
    expect(requestBodies[0].imageMetadata[0]).toMatchObject({
      sourceSelection: "captured_upload_file",
      promptSource: "captured_upload_file",
      sourceKind: "remote_url",
      sourceUrl: "https://storage.test/manual-1.png",
      capturedUploadAvailable: true,
      capturedUploadSource: "manual_file_input",
      capturedUploadFileCount: 1,
      capturedUploadMatchStatus: "count_match_by_order",
      generationPayloadSource: "manual_upload_storage_url",
      capturedUploadFile: {
        index: 1,
        captureSource: "manual_file_input",
        fileName: "original-upload.png",
        fileType: "image/png",
        fileSizeBytes: uploadBuffer.length,
        promptSourceKind: "captured_file_object_url",
      },
      vintedSourceSelection: "current_src",
      vintedSourceKind: "data_url",
      vintedSourceUrl: null,
    });

    await expect
      .poll(
        () =>
          eventBatches
            .flatMap((batch) => batch.events || [])
            .find((event) => event.event === "generate_request")?.context
            ?.imageSources?.[0],
        { timeout: 5000 },
      )
      .toMatchObject({
        sourceSelection: "captured_upload_file",
        promptSource: "captured_upload_file",
        sourceKind: "blob_url",
        sourceUrl: null,
        capturedUploadSource: "manual_file_input",
        capturedUploadMatchStatus: "count_match_by_order",
      });
  });

  test("keeps the generate button loading while manual photos are preparing", async ({
    page,
  }) => {
    let releaseUpload;
    const uploadCanFinish = new Promise((resolve) => {
      releaseUpload = resolve;
    });
    let generateRequests = 0;

    await page.route("https://autolister.app/api/phone-upload**", async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      if (url.searchParams.get("action") === "cleanup") {
        return route.fulfill({ status: 204, body: "" });
      }
      if (request.method() === "POST") {
        await uploadCanFinish;
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            count: 1,
            expectedCount: 1,
            files: [
              {
                name: "000000-manual-1.jpg",
                path: "manual-session/000000-manual-1.jpg",
                url: "https://storage.test/manual-1.jpg?token=signed-1",
                order: 0,
              },
            ],
          }),
        });
      }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ files: [], count: 0, complete: false }),
      });
    });
    await page.route("https://autolister.app/api/generate", (route) => {
      generateRequests += 1;
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          title: "Prepared Upload Jacket",
          description: "Generated after preparation finished.",
          measurementAdvice: "",
        }),
      });
    });

    await openContentHarness(page);

    const uploadBuffer = Buffer.from(tinyPngDataUrl.split(",")[1], "base64");
    await page.setInputFiles('[data-testid="add-photos-input"]', {
      name: "manual-upload.png",
      mimeType: "image/png",
      buffer: uploadBuffer,
    });
    await page.locator("#quickvint-gen-btn").click();

    await expect(page.locator("#quickvint-gen-btn .label")).toHaveText(
      "Preparing...",
    );
    expect(generateRequests).toBe(0);

    releaseUpload();
    await expect(page.locator('[data-testid="title--input"]')).toHaveValue(
      "Prepared Upload Jacket",
    );
    expect(generateRequests).toBe(1);
  });

  test("retries manual temp upload before generating", async ({
    page,
  }) => {
    const requestBodies = [];
    const eventBatches = [];
    let uploadAttempts = 0;

    await page.route("https://autolister.app/api/events/track", (route) => {
      eventBatches.push(route.request().postDataJSON());
      return route.fulfill({ status: 204, body: "" });
    });
    await page.route("https://autolister.app/api/phone-upload**", (route) => {
      const request = route.request();
      const url = new URL(request.url());
      if (url.searchParams.get("action") === "cleanup") {
        return route.fulfill({ status: 204, body: "" });
      }
      if (request.method() === "POST") {
        uploadAttempts += 1;
        if (uploadAttempts === 1) {
          return route.fulfill({
            status: 500,
            contentType: "application/json",
            body: JSON.stringify({ error: "Storage unavailable" }),
          });
        }
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            count: 1,
            expectedCount: 1,
            files: [
              {
                name: "000000-manual-1.jpg",
                path: "manual-session/000000-manual-1.jpg",
                url: "https://storage.test/manual-1.jpg?token=signed-1",
                order: 0,
              },
            ],
          }),
        });
      }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ files: [], count: 0, complete: false }),
      });
    });
    await page.route("https://autolister.app/api/generate", (route) => {
      requestBodies.push(route.request().postDataJSON());
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          title: "Retried Upload Jacket",
          description: "Generated after upload retry.",
          measurementAdvice: "",
        }),
      });
    });

    await openContentHarness(page);

    const uploadBuffer = Buffer.from(tinyPngDataUrl.split(",")[1], "base64");
    await page.setInputFiles('[data-testid="add-photos-input"]', {
      name: "manual-upload.png",
      mimeType: "image/png",
      buffer: uploadBuffer,
    });
    await page.locator("#quickvint-gen-btn").click();

    await expect(page.locator('[data-testid="title--input"]')).toHaveValue(
      "Retried Upload Jacket",
    );
    expect(uploadAttempts).toBe(2);
    expect(requestBodies[0].imageUrls).toEqual([
      "https://storage.test/manual-1.jpg?token=signed-1",
    ]);
    const retryEvent = await expect
      .poll(
        () =>
          eventBatches
            .flatMap((batch) => batch.events || [])
            .find((event) => event.event === "manual_upload_storage_retry"),
        { timeout: 5000 },
      )
      .not.toBeUndefined()
      .then(() =>
        eventBatches
          .flatMap((batch) => batch.events || [])
          .find((event) => event.event === "manual_upload_storage_retry"),
      );
    expect(retryEvent.context).toMatchObject({
      order: 0,
      attempt: 1,
      nextAttempt: 2,
      status: 500,
      retryable: true,
    });
  });

  test("blocks manual generation after temp upload retries are exhausted", async ({
    page,
  }) => {
    const eventBatches = [];
    let uploadAttempts = 0;
    let generateRequests = 0;

    await page.route("https://autolister.app/api/events/track", (route) => {
      eventBatches.push(route.request().postDataJSON());
      return route.fulfill({ status: 204, body: "" });
    });
    await page.route("https://autolister.app/api/phone-upload**", (route) => {
      const request = route.request();
      const url = new URL(request.url());
      if (url.searchParams.get("action") === "cleanup") {
        return route.fulfill({ status: 204, body: "" });
      }
      if (request.method() === "POST") {
        uploadAttempts += 1;
        return route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ error: "Storage unavailable" }),
        });
      }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ files: [], count: 0, complete: false }),
      });
    });
    await page.route("https://autolister.app/api/generate", (route) => {
      generateRequests += 1;
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          title: "Should Not Generate",
          description: "",
          measurementAdvice: "",
        }),
      });
    });

    await openContentHarness(page);

    const uploadBuffer = Buffer.from(tinyPngDataUrl.split(",")[1], "base64");
    await page.setInputFiles('[data-testid="add-photos-input"]', {
      name: "manual-upload.png",
      mimeType: "image/png",
      buffer: uploadBuffer,
    });
    await page.locator("#quickvint-gen-btn").click();

    await expect(page.locator("#quickvint-toast.error")).toContainText(
      "Could not prepare photos. Try again.",
    );
    expect(uploadAttempts).toBe(3);
    expect(generateRequests).toBe(0);
    const errorEvent = await expect
      .poll(
        () =>
          eventBatches
            .flatMap((batch) => batch.events || [])
            .find((event) => event.event === "manual_upload_storage_error"),
        { timeout: 5000 },
      )
      .not.toBeUndefined()
      .then(() =>
        eventBatches
          .flatMap((batch) => batch.events || [])
          .find((event) => event.event === "manual_upload_storage_error"),
      );
    expect(errorEvent.context).toMatchObject({
      order: 0,
      attempts: 3,
      status: 500,
      expectedCount: 1,
    });
  });

  test("limits manual temp uploads to three concurrent requests", async ({
    page,
  }) => {
    let activeUploads = 0;
    let maxActiveUploads = 0;
    let uploadRequests = 0;
    const pendingRoutes = [];

    await page.route("https://autolister.app/api/phone-upload**", (route) => {
      const request = route.request();
      const url = new URL(request.url());
      if (url.searchParams.get("action") === "cleanup") {
        return route.fulfill({ status: 204, body: "" });
      }
      if (request.method() === "POST") {
        uploadRequests += 1;
        activeUploads += 1;
        maxActiveUploads = Math.max(maxActiveUploads, activeUploads);
        pendingRoutes.push(route);
        return;
      }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ files: [], count: 0, complete: false }),
      });
    });

    await openContentHarness(page);

    const uploadBuffer = Buffer.from(tinyPngDataUrl.split(",")[1], "base64");
    await page.setInputFiles(
      '[data-testid="add-photos-input"]',
      Array.from({ length: 4 }, (_, index) => ({
        name: `manual-upload-${index + 1}.png`,
        mimeType: "image/png",
        buffer: uploadBuffer,
      })),
    );

    await expect.poll(() => uploadRequests).toBe(3);
    expect(maxActiveUploads).toBe(3);

    const firstRoute = pendingRoutes.shift();
    activeUploads -= 1;
    await firstRoute.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        count: 1,
        expectedCount: 1,
        files: [
          {
            name: "000000-manual-1.jpg",
            path: "manual-session/000000-manual-1.jpg",
            url: "https://storage.test/manual-1.jpg?token=signed-1",
            order: 0,
          },
        ],
      }),
    });

    await expect.poll(() => uploadRequests).toBe(4);
    expect(maxActiveUploads).toBe(3);

    while (pendingRoutes.length) {
      const route = pendingRoutes.shift();
      activeUploads -= 1;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          count: 1,
          expectedCount: 1,
          files: [
            {
              name: "manual.jpg",
              path: "manual-session/manual.jpg",
              url: "https://storage.test/manual.jpg?token=signed",
              order: 0,
            },
          ],
        }),
      });
    }
  });

  test("uses manual storage URLs even when the generate payload cap is low", async ({
    page,
  }) => {
    const requestBodies = [];
    const eventBatches = [];
    await routeManualStorageUploads(page);
    await page.route("https://autolister.app/api/events/track", (route) => {
      eventBatches.push(route.request().postDataJSON());
      return route.fulfill({ status: 204, body: "" });
    });
    await page.route("https://autolister.app/api/generate", (route) => {
      requestBodies.push(route.request().postDataJSON());
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          title: "Remote Payload Jacket",
          description: "Generated from remote Vinted URLs.",
          measurementAdvice: "",
        }),
      });
    });

    await openContentHarness(page);
    await page.evaluate(() => {
      window.__AUTOLISTER_MAX_GENERATE_REQUEST_BODY_BYTES = 100;
      const grid = document.querySelector('[data-testid="media-upload-grid"]');
      grid.querySelectorAll(".photo-box").forEach((node) => node.remove());
      grid.insertAdjacentHTML(
        "beforeend",
        Array.from(
          { length: 3 },
          (_, index) => `
          <div class="photo-box">
            <div class="photo-box__image-container">
              <img
                class="web_ui__Image__content"
                alt="Uploaded remote ${index + 1}"
                src="https://images1.vinted.net/t/0${index + 1}_remote/f800/${index + 1}.webp"
              />
            </div>
          </div>
        `,
        ).join(""),
      );
    });

    const uploadBuffer = Buffer.from(tinyPngDataUrl.split(",")[1], "base64");
    await page.setInputFiles(
      '[data-testid="add-photos-input"]',
      Array.from({ length: 3 }, (_, index) => ({
        name: `phone-original-${index + 1}.png`,
        mimeType: "image/png",
        buffer: uploadBuffer,
      })),
    );
    await page.locator("#quickvint-gen-btn").click();

    await expect(page.locator('[data-testid="title--input"]')).toHaveValue(
      "Remote Payload Jacket",
    );
    expect(requestBodies).toHaveLength(1);
    expect(requestBodies[0].imageUrls).toEqual([
      "https://storage.test/manual-1.png?token=signed-1",
      "https://storage.test/manual-2.png?token=signed-2",
      "https://storage.test/manual-3.png?token=signed-3",
    ]);
    expect(requestBodies[0].imageMetadata).toHaveLength(3);
    expect(requestBodies[0].imageMetadata[0]).toMatchObject({
      sourceSelection: "captured_upload_file",
      promptSource: "captured_upload_file",
      sourceKind: "remote_url",
      sourceUrl: "https://storage.test/manual-1.png",
      generationPayloadSource: "manual_upload_storage_url",
    });

    const eventNames = eventBatches
      .flatMap((batch) => batch.events || [])
      .map((event) => event.event);
    expect(eventNames).not.toContain("generate_payload_remote_fallback");
  });

  test("keeps captured original files through reorder-only changes", async ({
    page,
  }) => {
    const requestBodies = [];
    await routeManualStorageUploads(page);
    await page.route("https://autolister.app/api/events/track", (route) =>
      route.fulfill({ status: 204, body: "" }),
    );
    await page.route("https://autolister.app/api/generate", (route) => {
      requestBodies.push(route.request().postDataJSON());
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          title: "Reordered Original Photos",
          description: "Generated from the captured original set.",
          measurementAdvice: "",
        }),
      });
    });

    await openContentHarness(page);
    await page.evaluate((src) => {
      const grid = document.querySelector('[data-testid="media-upload-grid"]');
      const box = document.createElement("div");
      box.className = "photo-box";
      box.innerHTML = `
        <div class="photo-box__image-container" data-testid="image-wrapper-2">
          <img class="web_ui__Image__content" alt="Uploaded photo 2" src="${src}" />
        </div>
      `;
      grid.appendChild(box);
    }, tinyPngDataUrl);

    const uploadBuffer = Buffer.from(tinyPngDataUrl.split(",")[1], "base64");
    await page.setInputFiles('[data-testid="add-photos-input"]', [
      {
        name: "first-original.png",
        mimeType: "image/png",
        buffer: uploadBuffer,
      },
      {
        name: "second-original.png",
        mimeType: "image/png",
        buffer: uploadBuffer,
      },
    ]);
    await page.locator('[data-testid="media-upload-grid"]').dispatchEvent("dragstart");
    await page.locator("#quickvint-gen-btn").click();

    await expect(page.locator('[data-testid="title--input"]')).toHaveValue(
      "Reordered Original Photos",
    );
    expect(requestBodies[0].imageMetadata).toHaveLength(2);
    expect(requestBodies[0].imageMetadata[0]).toMatchObject({
      sourceSelection: "captured_upload_file",
      promptSource: "captured_upload_file",
      capturedUploadMatchStatus: "count_match_unordered",
      capturedUploadOrderTrusted: false,
      capturedUploadSetTrusted: true,
    });
  });

  test("removes deleted captured originals when Vinted delete index is still trusted", async ({
    page,
  }) => {
    const requestBodies = [];
    await routeManualStorageUploads(page);
    await page.route("https://autolister.app/api/events/track", (route) =>
      route.fulfill({ status: 204, body: "" }),
    );
    await page.route("https://autolister.app/api/generate", (route) => {
      requestBodies.push(route.request().postDataJSON());
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          title: "Deleted Photo Removed",
          description: "Generated without the deleted captured original.",
          measurementAdvice: "",
        }),
      });
    });

    await openContentHarness(page);
    await page.evaluate((src) => {
      const grid = document.querySelector('[data-testid="media-upload-grid"]');
      const firstBox = grid.querySelector(".photo-box");
      const firstDelete = document.createElement("button");
      firstDelete.type = "button";
      firstDelete.dataset.testid = "media-select-grid-delete-button-0";
      firstDelete.textContent = "Delete first";
      firstBox.appendChild(firstDelete);

      const secondBox = document.createElement("div");
      secondBox.className = "photo-box";
      secondBox.innerHTML = `
        <div class="photo-box__image-container" data-testid="image-wrapper-2">
          <img class="web_ui__Image__content" alt="Uploaded photo 2" src="${src}" />
        </div>
        <button type="button" data-testid="media-select-grid-delete-button-1">Delete second</button>
      `;
      grid.appendChild(secondBox);
    }, tinyPngDataUrl);

    const uploadBuffer = Buffer.from(tinyPngDataUrl.split(",")[1], "base64");
    await page.setInputFiles('[data-testid="add-photos-input"]', [
      {
        name: "kept-original.png",
        mimeType: "image/png",
        buffer: uploadBuffer,
      },
      {
        name: "deleted-original.png",
        mimeType: "image/png",
        buffer: uploadBuffer,
      },
    ]);
    await page.locator('[data-testid="media-select-grid-delete-button-1"]').click();
    await page.evaluate(() => {
      document.querySelector('[data-testid="image-wrapper-2"]')?.closest(".photo-box")?.remove();
    });
    await page.locator("#quickvint-gen-btn").click();

    await expect(page.locator('[data-testid="title--input"]')).toHaveValue(
      "Deleted Photo Removed",
    );
    expect(requestBodies[0].imageMetadata).toHaveLength(1);
    expect(requestBodies[0].imageMetadata[0]).toMatchObject({
      sourceSelection: "captured_upload_file",
      promptSource: "captured_upload_file",
      capturedUploadFileCount: 1,
      capturedUploadMatchStatus: "count_match_by_order",
      capturedUploadFile: {
        fileName: "kept-original.png",
      },
    });
  });

  test("falls back to visible Vinted images when deletion follows a reorder", async ({
    page,
  }) => {
    const requestBodies = [];
    await routeManualStorageUploads(page);
    await page.route("https://autolister.app/api/events/track", (route) =>
      route.fulfill({ status: 204, body: "" }),
    );
    await page.route("https://autolister.app/api/generate", (route) => {
      requestBodies.push(route.request().postDataJSON());
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          title: "Fallback After Reorder Delete",
          description: "Generated from visible Vinted images.",
          measurementAdvice: "",
        }),
      });
    });

    await openContentHarness(page);
    await page.evaluate((src) => {
      const grid = document.querySelector('[data-testid="media-upload-grid"]');
      const box = document.createElement("div");
      box.className = "photo-box";
      box.innerHTML = `
        <div class="photo-box__image-container" data-testid="image-wrapper-2">
          <img class="web_ui__Image__content" alt="Uploaded photo 2" src="${src}" />
        </div>
      `;
      grid.appendChild(box);
    }, tinyPngDataUrl);

    const uploadBuffer = Buffer.from(tinyPngDataUrl.split(",")[1], "base64");
    await page.setInputFiles('[data-testid="add-photos-input"]', [
      {
        name: "first-original.png",
        mimeType: "image/png",
        buffer: uploadBuffer,
      },
      {
        name: "second-original.png",
        mimeType: "image/png",
        buffer: uploadBuffer,
      },
    ]);
    await page.locator('[data-testid="media-upload-grid"]').dispatchEvent("dragstart");
    await page.evaluate(() => {
      document.querySelector('[data-testid="image-wrapper-2"]')?.closest(".photo-box")?.remove();
    });
    await page.locator("#quickvint-gen-btn").click();

    await expect(page.locator('[data-testid="title--input"]')).toHaveValue(
      "Fallback After Reorder Delete",
    );
    expect(requestBodies[0].imageMetadata).toHaveLength(1);
    expect(requestBodies[0].imageMetadata[0]).toMatchObject({
      sourceSelection: "current_src",
      promptSource: "vinted_dom_image",
      capturedUploadFileCount: 2,
      capturedUploadMatchStatus: "count_mismatch_fallback_to_vinted",
      capturedUploadOrderTrusted: false,
      capturedUploadSetTrusted: true,
    });
    expect(requestBodies[0].imageMetadata[0].capturedUploadFile).toBeNull();
  });

  test("tracks generated output edits after users change generated copy", async ({
    page,
  }) => {
    const eventBatches = [];
    await page.route("https://autolister.app/api/events/track", (route) => {
      eventBatches.push(route.request().postDataJSON());
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      });
    });
    await page.route("https://autolister.app/api/generate", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          title: "Black Test Jacket",
          description: "Clean black jacket in good condition.",
          measurementAdvice: "",
        }),
      }),
    );

    await openContentHarness(page);
    await page.locator("#quickvint-gen-btn").click();
    await expect(page.locator('[data-testid="title--input"]')).toHaveValue(
      "Black Test Jacket",
    );

    await page
      .locator('[data-testid="title--input"]')
      .fill("Black Test Jacket Size M");
    await page
      .locator('[data-testid="description--input"]')
      .fill("Clean black jacket in good condition.\nSmoke-free home.");
    await page.evaluate(() => window.dispatchEvent(new Event("pagehide")));

    await expect
      .poll(
        () =>
          eventBatches
            .flatMap((batch) => batch.events || [])
            .find((event) => event.event === "generation_output_edited"),
        { timeout: 5000 },
      )
      .toBeTruthy();
    const events = eventBatches.flatMap((batch) => batch.events || []);
    const event = events.find(
      (candidate) => candidate.event === "generation_output_edited",
    );

    expect(event.context.editSequence).toBe(1);
    expect(event.context.editSummarySequence).toBe(1);
    expect(event.context.editSummaryReason).toBe("pagehide");
    expect(event.context.editEventCount).toBeGreaterThanOrEqual(2);
    expect(event.context.changedFields).toBe("title,description");
    expect(event.context.titleChanged).toBe(true);
    expect(event.context.descriptionChanged).toBe(true);
    expect(event.context.generatedTitle).toBe("Black Test Jacket");
    expect(event.context.appliedDescription).toBe(
      "Clean black jacket in good condition.",
    );
    expect(event.context.currentTitle).toBe("Black Test Jacket Size M");
    expect(event.context.currentDescription).toContain("Smoke-free home.");
    expect(event.context.titleLengthDelta).toBeGreaterThan(0);
    expect(event.context.descriptionLengthDelta).toBeGreaterThan(0);
  });

  test("compresses remote Vinted images through the background proxy", async ({
    page,
  }) => {
    await openImageCompressionHarness(page, {
      ok: true,
      data: tinyPngDataUrl,
    });

    const result = await page.evaluate(async () =>
      window.__AUTOLISTER_TEST_HOOKS__.compressImages([
        "https://images1.vinted.net/t/example/f800/item.webp?s=test",
      ]),
    );
    const proxyFetchMessages = await page.evaluate(
      () => window.__proxyFetchMessages,
    );

    expect(result).toHaveLength(1);
    expect(result[0]).toMatch(/^data:image\/jpeg;base64,/);
    expect(proxyFetchMessages).toEqual([
      {
        type: "PROXY_FETCH",
        url: "https://images1.vinted.net/t/example/f800/item.webp?s=test",
        options: { method: "GET" },
        isBlob: true,
      },
    ]);
  });

  test("falls back to original remote image URLs when proxy compression fails", async ({
    page,
  }) => {
    const imageUrls = [
      "https://images1.vinted.net/t/example-1/f800/item.webp?s=test",
      "https://images1.vinted.net/t/example-2/f800/item.webp?s=test",
    ];
    await openImageCompressionHarness(page, {
      ok: false,
      error: "HTTP 403",
    });

    const result = await page.evaluate(async (urls) => {
      const warnings = [];
      const originalWarn = console.warn;
      console.warn = (...args) => warnings.push(args.join(" "));
      try {
        const images =
          await window.__AUTOLISTER_TEST_HOOKS__.compressImages(urls);
        return { images, warnings };
      } finally {
        console.warn = originalWarn;
      }
    }, imageUrls);

    expect(result.images).toEqual(imageUrls);
    expect(result.warnings).toEqual([
      "AutoLister AI: 2/2 image(s) could not be compressed; using original URL fallback.",
    ]);
  });

  test("generates when all received phone-upload files are ready while Vinted thumbnails are delayed", async ({
    page,
  }) => {
    const requestBodies = [];
    const trackedEvents = [];
    await page.route("https://autolister.app/api/events/track", (route) => {
      trackedEvents.push(route.request().postDataJSON());
      return route.fulfill({ status: 204, body: "" });
    });
    await page.route("https://autolister.app/api/generate", (route) => {
      requestBodies.push(route.request().postDataJSON());
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          title: "Ready Phone Upload",
          description: "Generated from ready phone files.",
          measurementAdvice: "",
        }),
      });
    });

    await openContentHarness(
      page,
      { allowed: true, available: 10 },
      { emptyListing: true, shortenPhoneUploadPoll: true },
    );

    await page.evaluate((dataUrl) => {
      const originalSendMessage = window.chrome.runtime.sendMessage;
      window.chrome.runtime.sendMessage = (message, callback) => {
        if (message?.type === "PROXY_FETCH") {
          const url = String(message.url || "");
          if (url.includes("/api/phone-upload?sessionId=")) {
            setTimeout(
              () => {
                  const pollCount = (window.__phoneReadyPollCount || 0) + 1;
                  window.__phoneReadyPollCount = pollCount;
                  const finalBatch = window.__allowFinalPhoneReady === true;
                  const fileCount = finalBatch ? 10 : 8;
                  const files = Array.from({ length: fileCount }, (_, index) => ({
                    name: `phone-${index + 1}.jpg`,
                    path: `phone-${index + 1}.jpg`,
                    url: `https://storage.test/phone-${index + 1}.jpg`,
                  }));
                  callback?.({
                    ok: true,
                    data: {
                      files: [
                        {
                          name: "_expected-count-10.json",
                          path: "_expected-count-10.json",
                          url: "https://storage.test/_expected-count-10.json",
                        },
                        ...files,
                      ],
                      count: fileCount,
                      expectedCount: 10,
                      complete: finalBatch,
                    },
                  });
                },
              0,
            );
            return;
          }
          if (url.startsWith("https://storage.test/")) {
            setTimeout(() => callback?.({ ok: true, data: dataUrl }), 0);
            return;
          }
        }
        originalSendMessage(message, callback);
      };

      const fileInput = document.querySelector('[data-testid="add-photos-input"]');
      const grid = document.querySelector('[data-testid="media-upload-grid"]');
      fileInput.addEventListener("change", () => {
        const files = Array.from(fileInput.files || []);
        window.__delayedVintedAttachCount = files.length;
        setTimeout(() => {
          files.forEach((file, index) => {
            const box = document.createElement("div");
            box.className = "photo-box";
            box.innerHTML = `
              <div class="photo-box__image-container">
                <img
                  class="web_ui__Image__content"
                  alt="Phone upload ${index + 1}"
                  src="${URL.createObjectURL(file)}"
                />
              </div>
            `;
            grid.appendChild(box);
          });
        }, 1500);
      });
    }, tinyPngDataUrl);

    await page.locator("#quickvint-phone-btn").click();
    await expect(page.locator("#quickvint-phone-modal .preview-thumb")).toHaveCount(7);
    await expect(page.locator("#quickvint-phone-modal .status")).toHaveText(
      "Receiving 8/10",
    );
    await expect(
      page.locator("#quickvint-phone-modal .status .status-count"),
    ).toHaveText(
      "8/10",
    );
    await expect(page.locator("#quickvint-phone-modal .status")).not.toHaveClass(
      /ready/,
    );
    await page.locator("#quickvint-phone-modal .generate-btn").click();
    await expect.poll(() => requestBodies.length).toBe(0);

    await page.evaluate(() => {
      window.__allowFinalPhoneReady = true;
    });
    await expect(page.locator("#quickvint-phone-modal .status")).toHaveText(
      "10 photos ready to generate.",
    );
    await expect(page.locator("#quickvint-phone-modal .status")).toHaveClass(
      /ready/,
    );
    expect(await page.locator(".photo-box").count()).toBeLessThan(10);

    await page.locator("#quickvint-phone-modal .generate-btn").click();
    await expect.poll(() => requestBodies.length).toBe(1);
    expect(requestBodies[0].imageMetadata).toHaveLength(10);
    await expect(page.locator("#quickvint-phone-modal")).toHaveCount(0);
    await expect(page.locator(".photo-box")).toHaveCount(10);
    let blockedEvents = trackedEvents.flatMap((body) =>
      (body.events || []).filter(
        (event) => event.event === "phone_upload_generate_blocked",
      ),
    );
    expect(blockedEvents).toHaveLength(0);
    await expect
      .poll(() =>
        trackedEvents
          .flatMap((body) => body.events || [])
          .map((event) => event.event),
      )
      .toEqual(expect.arrayContaining([
        "phone_upload_ready",
        "phone_upload_generate_ready",
      ]));
    const readyEvent = trackedEvents
      .flatMap((body) => body.events || [])
      .find(
        (event) =>
          event.event === "phone_upload_ready" &&
          event.context?.readyCount === 10,
      );
    expect(readyEvent).toBeTruthy();
    expect(readyEvent.context).toMatchObject({
      readyCount: 10,
      receivedCount: 10,
      downloadedCount: 10,
      capturedFileCount: 10,
      pendingCount: 0,
    });
  });

  test("keeps ready phone-upload files after Done while Vinted thumbnails are delayed", async ({
    page,
  }) => {
    const requestBodies = [];
    await page.route("https://autolister.app/api/generate", (route) => {
      requestBodies.push(route.request().postDataJSON());
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          title: "Done Then Generate",
          description: "Generated after closing phone upload.",
          measurementAdvice: "",
        }),
      });
    });

    await openContentHarness(
      page,
      { allowed: true, available: 10 },
      { emptyListing: true, shortenPhoneUploadPoll: true },
    );

    await page.evaluate((dataUrl) => {
      const originalSendMessage = window.chrome.runtime.sendMessage;
      window.chrome.runtime.sendMessage = (message, callback) => {
        if (message?.type === "PROXY_FETCH") {
          const url = String(message.url || "");
          if (url.includes("/api/phone-upload?sessionId=")) {
            setTimeout(
              () =>
                callback?.({
                  ok: true,
                  data: {
                    files: Array.from({ length: 3 }, (_, index) => ({
                      name: `phone-${index + 1}.jpg`,
                      path: `phone-${index + 1}.jpg`,
                      url: `https://storage.test/phone-${index + 1}.jpg`,
                    })),
                    count: 3,
                    complete: true,
                  },
                }),
              0,
            );
            return;
          }
          if (url.startsWith("https://storage.test/")) {
            setTimeout(() => callback?.({ ok: true, data: dataUrl }), 0);
            return;
          }
        }
        originalSendMessage(message, callback);
      };

      const fileInput = document.querySelector('[data-testid="add-photos-input"]');
      const grid = document.querySelector('[data-testid="media-upload-grid"]');
      fileInput.addEventListener("change", () => {
        const files = Array.from(fileInput.files || []);
        setTimeout(() => {
          files.forEach((file, index) => {
            const box = document.createElement("div");
            box.className = "photo-box";
            box.innerHTML = `
              <div class="photo-box__image-container">
                <img
                  class="web_ui__Image__content"
                  alt="Phone upload ${index + 1}"
                  src="${URL.createObjectURL(file)}"
                />
              </div>
            `;
            grid.appendChild(box);
          });
        }, 1500);
      });
    }, tinyPngDataUrl);

    await page.locator("#quickvint-phone-btn").click();
    await expect(page.locator("#quickvint-phone-modal .preview-thumb")).toHaveCount(3);
    await expect(page.locator("#quickvint-phone-modal .status")).toHaveText(
      "3 photos ready to generate.",
    );
    expect(await page.locator(".photo-box").count()).toBe(0);

    await page.locator("#quickvint-phone-modal .close-btn").click();
    await expect(page.locator("#quickvint-phone-modal")).toHaveCount(0);
    await page.locator("#quickvint-gen-btn").click();

    await expect.poll(() => requestBodies.length).toBe(1);
    expect(requestBodies[0].imageMetadata).toHaveLength(3);
    await expect(page.locator(".photo-box")).toHaveCount(3);
  });

  test("dedupes generation tracking while phone-upload downloads are still pending", async ({
    page,
  }) => {
    let generateRequests = 0;
    const trackedEvents = [];
    await page.route("https://autolister.app/api/events/track", (route) => {
      trackedEvents.push(route.request().postDataJSON());
      return route.fulfill({ status: 204, body: "" });
    });
    await page.route("https://autolister.app/api/generate", (route) => {
      generateRequests += 1;
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          title: "Should Not Generate",
          description: "Generation should be blocked.",
          measurementAdvice: "",
        }),
      });
    });

    await openContentHarness(
      page,
      { allowed: true, available: 10 },
      { emptyListing: true, shortenPhoneUploadPoll: true },
    );

    await page.evaluate((dataUrl) => {
      const originalSendMessage = window.chrome.runtime.sendMessage;
      window.chrome.runtime.sendMessage = (message, callback) => {
        if (message?.type === "PROXY_FETCH") {
          const url = String(message.url || "");
          if (url.includes("/api/phone-upload?sessionId=")) {
            setTimeout(
              () =>
                callback?.({
                  ok: true,
                  data: {
                    files: Array.from({ length: 2 }, (_, index) => ({
                      name: `phone-${index + 1}.jpg`,
                      path: `phone-${index + 1}.jpg`,
                      url: `https://storage.test/phone-${index + 1}.jpg`,
                    })),
                    count: 2,
                    complete: true,
                  },
                }),
              0,
            );
            return;
          }
          if (url.startsWith("https://storage.test/")) {
            setTimeout(() => callback?.({ ok: true, data: dataUrl }), 10000);
            return;
          }
        }
        originalSendMessage(message, callback);
      };
    }, tinyPngDataUrl);

    await page.locator("#quickvint-phone-btn").click();
    await expect(page.locator("#quickvint-phone-modal .status")).toHaveText(
      "Receiving 0/2",
    );
    await expect(
      page.locator("#quickvint-phone-modal .status .status-count"),
    ).toHaveText(
      "0/2",
    );
    const sessionId = await page
      .locator("#quickvint-phone-modal")
      .getAttribute("data-session-id");

    await page.evaluate(() => document.getElementById("quickvint-gen-btn")?.click());
    await page.evaluate(() => document.getElementById("quickvint-gen-btn")?.click());
    await expect
      .poll(() =>
        trackedEvents.flatMap((body) =>
          (body.events || []).filter(
            (event) => event.event === "phone_upload_generate_blocked",
          ),
        ).length,
      )
      .toBe(1);
    const blockedEvents = trackedEvents.flatMap((body) =>
      (body.events || []).filter(
        (event) => event.event === "phone_upload_generate_blocked",
      ),
    );
    expect(blockedEvents[0].context).toMatchObject({
      mode: "single",
      sessionId,
      receivedCount: 2,
      visibleAddedCount: 0,
    });

    const closePrompts = [];
    page.on("dialog", async (dialog) => {
      closePrompts.push(dialog.message());
      if (closePrompts.length === 1) {
        await dialog.dismiss();
      } else {
        await dialog.accept();
      }
    });

    await page.locator("#quickvint-phone-modal .close-btn").click();
    await expect(page.locator("#quickvint-phone-modal")).toBeVisible();
    expect(closePrompts).toEqual(["Stop this upload? Added photos will stay."]);

    await page.locator("#quickvint-phone-modal .close-btn").click();
    await expect(page.locator("#quickvint-phone-modal")).toHaveCount(0);
    expect(closePrompts).toEqual([
      "Stop this upload? Added photos will stay.",
      "Stop this upload? Added photos will stay.",
    ]);
    await expect
      .poll(() =>
        page.evaluate(
          (uploadSessionId) =>
            window.__extensionHarness.runtimeMessages.some(
              (message) =>
                message?.type === "PROXY_FETCH" &&
                String(message.url || "").includes("action=cleanup") &&
                String(message.url || "").includes(
                  `sessionId=${uploadSessionId}`,
                ),
            ),
          sessionId,
        ),
      )
      .toBe(true);

    await page.locator("#quickvint-phone-btn").click();
    await expect(page.locator("#quickvint-phone-modal")).toBeVisible();
    const newSessionId = await page
      .locator("#quickvint-phone-modal")
      .getAttribute("data-session-id");
    expect(newSessionId).not.toBe(sessionId);
  });

  test("generates from completed phone-upload files when Vinted thumbnails are late", async ({
    page,
  }) => {
    const requestBodies = [];
    const trackedEvents = [];
    await page.route("https://autolister.app/api/events/track", (route) => {
      trackedEvents.push(route.request().postDataJSON());
      return route.fulfill({ status: 204, body: "" });
    });
    await page.route("https://autolister.app/api/generate", (route) => {
      requestBodies.push(route.request().postDataJSON());
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          title: "Completed Phone Upload",
          description: "Generated from captured phone files.",
          measurementAdvice: "",
        }),
      });
    });

    await openContentHarness(
      page,
      { allowed: true, available: 10 },
      { emptyListing: true, shortenPhoneUploadPoll: true },
    );

    await page.evaluate((dataUrl) => {
      const originalSendMessage = window.chrome.runtime.sendMessage;
      window.chrome.runtime.sendMessage = (message, callback) => {
        if (message?.type === "PROXY_FETCH") {
          const url = String(message.url || "");
          if (url.includes("/api/phone-upload?sessionId=")) {
            setTimeout(
              () =>
                callback?.({
                  ok: true,
                  data: {
                    files: Array.from({ length: 2 }, (_, index) => ({
                      name: `phone-${index + 1}.jpg`,
                      path: `phone-${index + 1}.jpg`,
                      url: `https://storage.test/phone-${index + 1}.jpg`,
                    })),
                    count: 2,
                    complete: true,
                  },
                }),
              0,
            );
            return;
          }
          if (url.startsWith("https://storage.test/")) {
            setTimeout(() => callback?.({ ok: true, data: dataUrl }), 0);
            return;
          }
        }
        originalSendMessage(message, callback);
      };
    }, tinyPngDataUrl);

    await page.locator("#quickvint-phone-btn").click();
    await expect(page.locator("#quickvint-phone-modal .preview-thumb")).toHaveCount(2);
    await expect(page.locator(".photo-box")).toHaveCount(0);
    await expect(page.locator("#quickvint-phone-modal .status")).toHaveText(
      "2 photos ready to generate.",
    );

    await page.locator("#quickvint-phone-modal .generate-btn").click();

    await expect.poll(() => requestBodies.length).toBe(1);
    expect(requestBodies[0].imageUrls).toEqual([
      "https://storage.test/phone-1.jpg",
      "https://storage.test/phone-2.jpg",
    ]);
    expect(requestBodies[0].imageMetadata).toHaveLength(2);
    expect(requestBodies[0].imageMetadata[0]).toMatchObject({
      sourceSelection: "captured_upload_file",
      promptSource: "captured_upload_file",
      capturedUploadSource: "phone_upload_single",
      capturedUploadMatchStatus: "vinted_pending_using_captured",
    });
    const eventNames = trackedEvents.flatMap((body) =>
      (body.events || []).map((event) => event.event),
    );
    expect(eventNames).not.toContain("phone_upload_generate_blocked");

    await expect(page.locator("#quickvint-phone-modal")).toHaveCount(0);
    await page.locator("#quickvint-gen-btn").click();
    await page.locator("#quickvint-description-apply-prompt button", {
      hasText: "Replace description",
    }).click();
    await expect.poll(() => requestBodies.length).toBe(2);
    expect(requestBodies[1].imageUrls).toHaveLength(2);
    expect(requestBodies[1].imageUrls.every((url) => url.startsWith("data:image/"))).toBe(
      true,
    );
    expect(
      requestBodies[1].imageMetadata.every(
        (metadata) => metadata.generationPayloadSource !== "phone_upload_storage_url",
      ),
    ).toBe(true);
    expect(requestBodies[1].imageMetadata[0]).toMatchObject({
      sourceSelection: "captured_upload_file",
      capturedUploadSource: "phone_upload_single",
      sourceKind: "blob_url",
    });
  });

  test("retries stale phone-upload storage URLs with local captured files", async ({
    page,
  }) => {
    const requestBodies = [];
    const trackedEvents = [];
    await page.route("https://autolister.app/api/events/track", (route) => {
      trackedEvents.push(route.request().postDataJSON());
      return route.fulfill({ status: 204, body: "" });
    });
    await page.route("https://autolister.app/api/generate", (route) => {
      const body = route.request().postDataJSON();
      requestBodies.push(body);
      if (
        requestBodies.length === 1 &&
        body.imageUrls?.some((url) => String(url).startsWith("https://storage.test/"))
      ) {
        return route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({
            error: "There was an issue processing your images. Please try different images.",
          }),
        });
      }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          title: "Recovered Phone Upload",
          description: "Generated after local retry.",
          measurementAdvice: "",
        }),
      });
    });

    await openContentHarness(
      page,
      { allowed: true, available: 10 },
      { emptyListing: true, shortenPhoneUploadPoll: true },
    );

    await page.evaluate((dataUrl) => {
      const originalSendMessage = window.chrome.runtime.sendMessage;
      window.chrome.runtime.sendMessage = (message, callback) => {
        if (message?.type === "PROXY_FETCH") {
          const url = String(message.url || "");
          if (url.includes("/api/phone-upload?sessionId=")) {
            setTimeout(
              () =>
                callback?.({
                  ok: true,
                  data: {
                    files: [
                      {
                        name: "phone-1.jpg",
                        path: "phone-1.jpg",
                        url: "https://storage.test/phone-1.jpg",
                      },
                    ],
                    count: 1,
                    complete: true,
                  },
                }),
              0,
            );
            return;
          }
          if (url.startsWith("https://storage.test/")) {
            setTimeout(() => callback?.({ ok: true, data: dataUrl }), 0);
            return;
          }
        }
        originalSendMessage(message, callback);
      };
    }, tinyPngDataUrl);

    await page.locator("#quickvint-phone-btn").click();
    await expect(page.locator("#quickvint-phone-modal .preview-thumb")).toHaveCount(1);
    await page.locator("#quickvint-phone-modal .generate-btn").click();

    await expect.poll(() => requestBodies.length).toBe(2);
    expect(requestBodies[0].imageUrls).toEqual(["https://storage.test/phone-1.jpg"]);
    expect(requestBodies[0].imageMetadata[0]).toMatchObject({
      generationPayloadSource: "phone_upload_storage_url",
    });
    expect(requestBodies[1].imageUrls).toHaveLength(1);
    expect(requestBodies[1].imageUrls[0].startsWith("data:image/")).toBe(true);
    expect(requestBodies[1].imageMetadata[0]).toMatchObject({
      sourceSelection: "captured_upload_file",
      capturedUploadSource: "phone_upload_single",
      sourceKind: "blob_url",
    });
    expect(requestBodies[1].imageMetadata[0].generationPayloadSource).toBeUndefined();
    await expect(page.locator('[data-testid="title--input"]')).toHaveValue(
      "Recovered Phone Upload",
    );

    await expect
      .poll(() =>
        trackedEvents.flatMap((body) =>
          (body.events || []).map((event) => event.event),
        ),
      )
      .toContain("generate_retry_local_captured_images");
  });

  test("keeps ready phone-upload files when users reopen phone upload to add more", async ({
    page,
  }) => {
    const requestBodies = [];
    const trackedEvents = [];
    let pollCount = 0;

    await page.route("https://autolister.app/api/events/track", (route) => {
      trackedEvents.push(route.request().postDataJSON());
      return route.fulfill({ status: 204, body: "" });
    });
    await page.route("https://autolister.app/api/generate", (route) => {
      requestBodies.push(route.request().postDataJSON());
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          title: "Reopened Phone Upload",
          description: "Generated from all phone files.",
          measurementAdvice: "",
        }),
      });
    });

    await openContentHarness(
      page,
      { allowed: true, available: 10 },
      { emptyListing: true, shortenPhoneUploadPoll: true },
    );

    await page.evaluate((dataUrl) => {
      const originalSendMessage = window.chrome.runtime.sendMessage;
      window.chrome.runtime.sendMessage = (message, callback) => {
        if (message?.type === "PROXY_FETCH") {
          const url = String(message.url || "");
          if (url.includes("/api/phone-upload?sessionId=")) {
            window.__phonePollCount = (window.__phonePollCount || 0) + 1;
            const sessionId = new URL(url).searchParams.get("sessionId");
            window.__phoneSessions ||= [];
            if (!window.__phoneSessions.includes(sessionId)) {
              window.__phoneSessions.push(sessionId);
            }
            const files =
              window.__phoneSessions.indexOf(sessionId) === 0
                ? [
                    {
                      name: "phone-1.jpg",
                      path: "phone-1.jpg",
                      url: "https://storage.test/phone-1.jpg",
                    },
                    {
                      name: "phone-2.jpg",
                      path: "phone-2.jpg",
                      url: "https://storage.test/phone-2.jpg",
                    },
                  ]
                : [
                    {
                      name: "phone-3.jpg",
                      path: "phone-3.jpg",
                      url: "https://storage.test/phone-3.jpg",
                    },
                  ];
            setTimeout(
              () =>
                callback?.({
                  ok: true,
                  data: { files, count: files.length, complete: true },
                }),
              0,
            );
            return;
          }
          if (url.startsWith("https://storage.test/")) {
            setTimeout(() => callback?.({ ok: true, data: dataUrl }), 0);
            return;
          }
        }
        originalSendMessage(message, callback);
      };
    }, tinyPngDataUrl);

    await page.locator("#quickvint-phone-btn").click();
    await expect(page.locator("#quickvint-phone-modal .preview-thumb")).toHaveCount(2);
    await expect(page.locator("#quickvint-phone-modal .status")).toHaveText(
      "2 photos ready to generate.",
    );
    await page.locator("#quickvint-phone-modal .close-btn").click();
    await expect(page.locator("#quickvint-phone-modal")).toHaveCount(0);
    await expect(page.locator(".photo-box")).toHaveCount(0);

    await page.locator("#quickvint-phone-btn").click();
    await expect(page.locator("#quickvint-phone-modal .preview-thumb")).toHaveCount(1);
    await expect(page.locator("#quickvint-phone-modal .status")).toHaveText(
      "1 photo ready to generate.",
    );
    await page.locator("#quickvint-phone-modal .generate-btn").click();

    await expect.poll(() => requestBodies.length).toBe(1);
    expect(requestBodies[0].imageMetadata).toHaveLength(3);
    expect(
      requestBodies[0].imageMetadata.map(
        (item) => item.capturedUploadFile?.fileName,
      ),
    ).toEqual(["phone-1.jpg", "phone-2.jpg", "phone-3.jpg"]);

    const eventNames = trackedEvents.flatMap((body) =>
      (body.events || []).map((event) => event.event),
    );
    expect(eventNames).not.toContain("phone_upload_generate_blocked");
    pollCount = await page.evaluate(() => window.__phonePollCount || 0);
    expect(pollCount).toBeGreaterThanOrEqual(2);
  });

  test("stops preference sync quietly when Chrome invalidates the extension context", async ({
    page,
  }) => {
    const warnings = [];
    page.on("console", (message) => {
      if (message.type() === "warning") warnings.push(message.text());
    });

    await openContentHarness(page);
    await page.evaluate(() => {
      chrome.storage.local.get = () => {
        throw new Error("Extension context invalidated.");
      };
    });
    await page.waitForTimeout(1300);

    expect(
      warnings.filter((warning) =>
        warning.includes("AutoLister AI: failed to load"),
      ),
    ).toEqual([]);
  });

  test("saves description length preference and sends it with generation requests", async ({
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
          description: "Clean black jacket.",
          measurementAdvice: "",
        }),
      });
    });

    await openContentHarness(page);
    await page
      .locator("#quickvint-description-length-toggle [data-length='short']")
      .click();

    const storedDescriptionLength = await page.evaluate(() =>
      chrome.storage.local.get("descriptionLength"),
    );
    expect(storedDescriptionLength.descriptionLength).toBe("short");
    await expect(
      page.locator("#quickvint-description-length-toggle [data-length='short']"),
    ).toHaveAttribute("aria-pressed", "true");

    await page.locator("#quickvint-gen-btn").click();
    await expect.poll(() => requestBodies.length).toBe(1);
    expect(requestBodies[0].descriptionLength).toBe("short");
  });

  test("saves hashtag preference and sends it with generation requests", async ({
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
          description: "Clean black jacket.",
          measurementAdvice: "",
        }),
      });
    });

    await openContentHarness(page);
    await page.locator("#quickvint-hashtags-toggle").click();

    const storedHashtags = await page.evaluate(() =>
      chrome.storage.local.get("useHashtags"),
    );
    expect(storedHashtags.useHashtags).toBe(false);
    await expect(page.locator("#quickvint-hashtags-toggle")).toHaveAttribute(
      "aria-pressed",
      "false",
    );

    await page.locator("#quickvint-gen-btn").click();
    await expect.poll(() => requestBodies.length).toBe(1);
    expect(requestBodies[0].useHashtags).toBe(false);
  });

  test("saves description note text exactly and sends it with generation requests", async ({
    page,
  }) => {
    const requestBodies = [];
    const savedNote = "  Smoke-free home.\n\nShips fast.  ";
    await page.route("https://autolister.app/api/generate", (route) => {
      requestBodies.push(route.request().postDataJSON());
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          title: "Black Test Jacket",
          description: "Clean black jacket.",
          measurementAdvice: "",
        }),
      });
    });

    await openContentHarness(page);
    await page.locator("#quickvint-description-footer-btn").click();
    await expect(page.locator(".quickvint-footer-copy")).toContainText(
      "Appears on every future listing",
    );
    await page.locator("#quickvint-footer-text").fill(savedNote);
    await page.locator(".quickvint-footer-save").click();

    const storedNote = await page.evaluate(() =>
      chrome.storage.local.get("descriptionFooterText"),
    );
    expect(storedNote.descriptionFooterText).toBe(savedNote);
    await expect(page.locator("#quickvint-description-footer-btn")).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await page.locator("#quickvint-gen-btn").click();
    await expect.poll(() => requestBodies.length).toBe(1);
    expect(requestBodies[0].descriptionFooterText).toBe(savedNote);
  });

  test("lets users skip the saved note for the current listing without deleting it", async ({
    page,
  }) => {
    const requestBodies = [];
    const savedNote = "  Smoke-free home.\n\nShips fast.  ";
    await page.route("https://autolister.app/api/generate", (route) => {
      requestBodies.push(route.request().postDataJSON());
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          title: "Black Test Jacket",
          description: "Clean black jacket.",
          measurementAdvice: "",
        }),
      });
    });

    await openContentHarness(page, null, {
      initialStorage: {
        descriptionFooterText: savedNote,
      },
    });
    await page.waitForTimeout(1100);

    await expect(page.locator("#quickvint-description-footer-btn")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await page.locator("#quickvint-description-footer-btn").click();
    await expect(page.locator("#quickvint-description-footer-btn")).toHaveAttribute(
      "aria-pressed",
      "false",
    );

    const storedNote = await page.evaluate(() =>
      chrome.storage.local.get("descriptionFooterText"),
    );
    expect(storedNote.descriptionFooterText).toBe(savedNote);

    await page.locator("#quickvint-gen-btn").click();
    await expect.poll(() => requestBodies.length).toBe(1);
    expect(requestBodies[0]).not.toHaveProperty("descriptionFooterText");

    await page.locator("#quickvint-description-footer-edit-btn").click();
    await expect(page.locator("#quickvint-footer-text")).toHaveValue(savedNote);
    await page.locator(".quickvint-footer-secondary").click();
  });

  test("localizes saved note helper copy from the selected UI language", async ({
    page,
  }) => {
    await page.route("https://autolister.app/api/generate", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          title: "Black Test Jacket",
          description: "Clean black jacket.",
          measurementAdvice: "",
        }),
      }),
    );

    await openContentHarness(page, null, {
      initialStorage: {
        selectedDescriptionLanguage: "fr",
        quickvintLanguagePreferenceTouched: true,
      },
    });

    await page.locator("#quickvint-description-footer-btn").click();
    await expect(page.locator("#quickvint-footer-title")).toHaveText(
      "Note enregistrée",
    );
    await expect(page.locator(".quickvint-footer-copy")).toContainText(
      "Ajoutée à chaque future annonce",
    );
  });

  test("does not send saved description notes for active Starter users", async ({
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
          description: "Clean black jacket.",
          measurementAdvice: "",
        }),
      });
    });

    await openContentHarness(page, null, {
      initialStorage: {
        descriptionFooterText: "  Smoke-free home.\n\nShips fast.  ",
        userProfile: {
          subscription_status: "active",
          subscription_tier: "starter",
          api_calls_this_month: 0,
          pack_credits: 0,
        },
      },
    });
    await page.waitForTimeout(1100);

    await expect(page.locator("#quickvint-description-footer-btn")).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    await page.locator("#quickvint-gen-btn").click();
    await expect.poll(() => requestBodies.length).toBe(1);
    expect(requestBodies[0]).not.toHaveProperty("descriptionFooterText");
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

  test("does not show clothing measurement advice toast", async ({
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
    await expect(page.locator('[data-testid="title--input"]')).toHaveValue(
      "Black Test Jacket",
    );
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

  test("does not interrupt an in-progress listing with the return-visit limit offer", async ({
    page,
  }) => {
    let offerFetchCount = 0;
    await page.route(
      "https://autolister.app/api/user/limit-followup-offer",
      (route) => {
        offerFetchCount += 1;
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            eligible: true,
            campaignKey: "limit_followup_offer_v1",
            couponCode: "LISTFASTER20",
            pricingUrl: "https://autolister.app/pricing?offer=test",
            limitHitAt: new Date().toISOString(),
          }),
        });
      },
    );

    await openContentHarness(page, null, {
      shortenOfferTimers: true,
      initialStorage: {
        [freeLimitPaywallSeenStorageKey]: Date.now(),
        userProfile: {
          subscription_status: "free",
          subscription_tier: "free",
          api_calls_this_month: 5,
          free_lifetime_generations_used: 5,
          pack_credits: 0,
        },
      },
    });
    await page.waitForTimeout(150);

    expect(offerFetchCount).toBe(0);
    await expect(page.locator("#quickvint-limit-followup-modal")).toHaveCount(0);
  });

  test("does not show the free return-visit offer before the free-limit paywall was seen", async ({
    page,
  }) => {
    await openContentHarness(page, null, {
      emptyListing: true,
      shortenOfferTimers: true,
      initialStorage: {
        userProfile: {
          subscription_status: "free",
          subscription_tier: "free",
          api_calls_this_month: 5,
          free_lifetime_generations_used: 5,
          pack_credits: 0,
        },
      },
    });

    await page.waitForTimeout(500);
    await expect(page.locator("#quickvint-limit-followup-modal")).toHaveCount(0);
  });

  test("shows the return-visit offer on an empty listing after the free-limit paywall was seen", async ({
    page,
  }) => {
    let offerFetchCount = 0;
    await page.route(
      "https://autolister.app/api/user/limit-followup-offer",
      (route) => {
        offerFetchCount += 1;
        return route.abort();
      },
    );

    await openContentHarness(page, null, {
      emptyListing: true,
      shortenOfferTimers: true,
      initialStorage: {
        [freeLimitPaywallSeenStorageKey]: Date.now(),
        userProfile: {
          subscription_status: "free",
          subscription_tier: "free",
          api_calls_this_month: 5,
          free_lifetime_generations_used: 5,
          pack_credits: 0,
        },
      },
    });

    const offer = page.locator("#quickvint-limit-followup-modal");
    await expect(offer).toBeVisible();
    await expect(offer).toContainText("5 free listings used");
    await expect(offer).toContainText("LISTFASTER20");
    expect(offerFetchCount).toBe(0);
  });

  test("does not treat stored language defaults as an explicit offer language", async ({
    page,
  }) => {
    await openContentHarness(page, null, {
      emptyListing: true,
      shortenOfferTimers: true,
      initialStorage: {
        [freeLimitPaywallSeenStorageKey]: Date.now(),
        selectedLanguage: "fr",
        selectedTitleLanguage: "fr",
        selectedDescriptionLanguage: "fr",
        userProfile: {
          subscription_status: "free",
          subscription_tier: "free",
          api_calls_this_month: 5,
          free_lifetime_generations_used: 5,
          pack_credits: 0,
        },
      },
    });

    const offer = page.locator("#quickvint-limit-followup-modal");
    await expect(offer).toBeVisible();
    await expect(offer).toContainText("Keep listing without waiting");
    await expect(offer).not.toContainText("Continuez à publier sans attendre");
  });

  test("uses the selected language for the offer after a real language interaction", async ({
    page,
  }) => {
    await openContentHarness(page, null, {
      emptyListing: true,
      shortenOfferTimers: true,
      initialStorage: {
        [freeLimitPaywallSeenStorageKey]: Date.now(),
        quickvintLanguagePreferenceTouched: true,
        selectedLanguage: "en",
        selectedTitleLanguage: "fr",
        selectedDescriptionLanguage: "fr",
        userProfile: {
          subscription_status: "free",
          subscription_tier: "free",
          api_calls_this_month: 5,
          free_lifetime_generations_used: 5,
          pack_credits: 0,
        },
      },
    });

    const offer = page.locator("#quickvint-limit-followup-modal");
    await expect(offer).toBeVisible();
    await expect(offer).toContainText("5 annonces gratuites utilisées");
    await expect(offer).toContainText("Continuez à publier sans attendre");
    await expect(offer).toContainText("LISTFASTER20");
  });

  test("shows the free-limit offer after closing the free-limit paywall", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1800, height: 900 });
    await page.route("https://autolister.app/api/generate", (route) =>
      route.fulfill({
        status: 429,
        contentType: "application/json",
        body: JSON.stringify({
          code: "free_lifetime_limit",
          currentTier: "free",
          nextTier: "starter",
          error: "Free listing limit reached.",
        }),
      }),
    );

    await openContentHarness(page, null, { shortenOfferTimers: true });
    await page.evaluate(() =>
      chrome.storage.local.set({
        userProfile: {
          subscription_status: "free",
          subscription_tier: "free",
          api_calls_this_month: 5,
          free_lifetime_generations_used: 5,
          pack_credits: 0,
        },
      }),
    );

    await page.locator("#quickvint-gen-btn").click();
    await expect(page.locator("#quickvint-toast.paywall")).toContainText(
      "Free listings used",
    );
    await expect(page.locator("#quickvint-toast.paywall")).toBeVisible();
    const paywallBox = await page.locator("#quickvint-toast.paywall").boundingBox();
    const titleBox = await page.locator('[data-testid="title--input"]').boundingBox();
    expect(paywallBox.x).toBeGreaterThan(titleBox.x + titleBox.width);
    expect(Math.abs(paywallBox.y - titleBox.y)).toBeLessThan(80);

    await page.locator("#quickvint-toast .paywall-close").click();

    const offer = page.locator("#quickvint-limit-followup-modal");
    await expect(offer).toBeVisible();
    await expect(offer).toContainText("5 free listings used");
    await expect(offer).toContainText("Keep listing without waiting");
    await expect(offer).toContainText("LISTFASTER20");
  });

  test("shows a localized Pro offer after Starter users close the daily-limit paywall", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1800, height: 900 });
    await page.route("https://autolister.app/api/generate", (route) =>
      route.fulfill({
        status: 429,
        contentType: "application/json",
        body: JSON.stringify({
          code: "daily_limit",
          currentTier: "starter",
          nextTier: "pro",
          currentLimit: 10,
          error: "Daily usage limit reached.",
        }),
      }),
    );

    await openContentHarness(page, null, {
      shortenOfferTimers: true,
      initialStorage: {
        quickvintLanguagePreferenceTouched: true,
        selectedLanguage: "fr",
        selectedTitleLanguage: "fr",
        selectedDescriptionLanguage: "fr",
        userProfile: {
          subscription_status: "active",
          subscription_tier: "starter",
          api_calls_this_month: 20,
          pack_credits: 0,
        },
      },
    });

    await page.locator("#quickvint-gen-btn").click();
    await expect(page.locator("#quickvint-toast.paywall")).toContainText(
      "Daily limit reached",
    );
    await page.locator("#quickvint-toast .paywall-close").click();

    const offer = page.locator("#quickvint-limit-followup-modal");
    await expect(offer).toBeVisible();
    await expect(offer).toContainText("Limite quotidienne Starter atteinte");
    await expect(offer).toContainText("Besoin de plus d'annonces aujourd'hui");
    await expect(offer).toContainText("LISTFASTER20");
  });

  test("does not show the Pro offer for Starter monthly limits", async ({
    page,
  }) => {
    await page.route("https://autolister.app/api/generate", (route) =>
      route.fulfill({
        status: 429,
        contentType: "application/json",
        body: JSON.stringify({
          code: "monthly_limit",
          currentTier: "starter",
          nextTier: "pro",
          currentLimit: 75,
          error: "Monthly usage limit reached.",
        }),
      }),
    );

    await openContentHarness(page, null, {
      shortenOfferTimers: true,
      initialStorage: {
        userProfile: {
          subscription_status: "active",
          subscription_tier: "starter",
          api_calls_this_month: 75,
          pack_credits: 0,
        },
      },
    });

    await page.locator("#quickvint-gen-btn").click();
    await expect(page.locator("#quickvint-toast.paywall")).toContainText(
      "Monthly limit reached",
    );
    await page.locator("#quickvint-toast .paywall-close").click();
    await page.waitForTimeout(100);

    await expect(page.locator("#quickvint-limit-followup-modal")).toHaveCount(0);
  });

  test("shows the Starter daily-limit offer on return while the daily limit is still reached", async ({
    page,
  }) => {
    await openContentHarness(page, null, {
      emptyListing: true,
      shortenOfferTimers: true,
      initialStorage: {
        userProfile: {
          subscription_status: "active",
          subscription_tier: "starter",
          api_calls_this_month: 20,
          pack_credits: 0,
        },
        __usageResponse: {
          daily: 10,
          monthly: 20,
          tier: "starter",
          isLegacy: false,
          limits: { daily: 10, monthly: 75 },
          freeLifetimeUsed: 5,
          freeLifetimeLimit: 5,
          packCredits: 0,
        },
      },
    });

    const offer = page.locator("#quickvint-limit-followup-modal");
    await expect(offer).toBeVisible();
    await expect(offer).toContainText("Starter daily limit reached");
    await expect(offer).toContainText("Need more listings today?");

    await offer.locator(".quickvint-limit-close").click();
    await expect(offer).toHaveCount(0);
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            window.__extensionHarness.storage[
              "quickvintOfferDismissed:test-user:starter_daily_limit_offer_v1"
            ],
        ),
      )
      .toBeTruthy();

    await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    await page.waitForTimeout(100);
    await expect(page.locator("#quickvint-limit-followup-modal")).toHaveCount(0);
  });

  test("opens checkout from the free-limit paywall when a plan is clicked", async ({
    page,
  }) => {
    const trackedEvents = [];
    await page.route("https://autolister.app/api/events/track", (route) => {
      trackedEvents.push(route.request().postDataJSON());
      return route.fulfill({ status: 204, body: "" });
    });
    await page.route("https://autolister.app/api/generate", (route) =>
      route.fulfill({
        status: 429,
        contentType: "application/json",
        body: JSON.stringify({
          code: "free_lifetime_limit",
          currentTier: "free",
          nextTier: "starter",
          error: "Free listing limit reached.",
        }),
      }),
    );

    await openContentHarness(page);

    await page.locator("#quickvint-gen-btn").click();
    await expect(page.locator("#quickvint-toast.paywall")).toContainText(
      "Free listings used",
    );
    await page.locator('[data-paywall-option-index="1"]').click();

    await expect
      .poll(() =>
        page.evaluate(
          () =>
            window.__extensionHarness.runtimeMessages.filter(
              (message) => message?.type === "CREATE_CHECKOUT",
            ),
        ),
      )
      .toEqual([
        {
          type: "CREATE_CHECKOUT",
          checkoutType: "subscription",
          tier: "pro",
          source: "extension_paywall",
        },
      ]);

    await expect
      .poll(() =>
        page.evaluate(() =>
          window.__extensionHarness.openedWindows.map((opened) => ({
            href: opened.location.href,
            closed: opened.closed,
          })),
        ),
      )
      .toEqual([{ href: "https://checkout.test/session", closed: false }]);

    await expect
      .poll(() =>
        trackedEvents.flatMap((body) => body.events || []).map((event) => event.event),
      )
      .toContain("checkout_opened");
  });

  test("logs failed paywall checkout and still shows the rescue offer after close", async ({
    page,
  }) => {
    const trackedEvents = [];
    await page.setViewportSize({ width: 1800, height: 900 });
    await page.route("https://autolister.app/api/events/track", (route) => {
      trackedEvents.push(route.request().postDataJSON());
      return route.fulfill({ status: 204, body: "" });
    });
    await page.route("https://autolister.app/api/generate", (route) =>
      route.fulfill({
        status: 429,
        contentType: "application/json",
        body: JSON.stringify({
          code: "free_lifetime_limit",
          currentTier: "free",
          nextTier: "starter",
          error: "Free listing limit reached.",
        }),
      }),
    );

    await openContentHarness(page, null, {
      shortenOfferTimers: true,
      initialStorage: {
        __checkoutResponse: {
          ok: false,
          reason: "no_checkout_email",
          error: "Please sign in again before checkout.",
        },
      },
    });

    await page.locator("#quickvint-gen-btn").click();
    await expect(page.locator("#quickvint-toast.paywall")).toContainText(
      "Free listings used",
    );
    await page.locator('[data-paywall-option-index="1"]').click();

    await expect
      .poll(() =>
        trackedEvents.flatMap((body) => body.events || []).map((event) => event.event),
      )
      .toContain("checkout_failed");

    await expect
      .poll(() =>
        page.evaluate(() =>
          window.__extensionHarness.openedWindows.map((opened) => opened.closed),
        ),
      )
      .toEqual([true]);

    const offer = page.locator("#quickvint-limit-followup-modal");
    await expect(offer).toBeVisible();
    await expect(offer).toContainText("LISTFASTER20");
  });
});
