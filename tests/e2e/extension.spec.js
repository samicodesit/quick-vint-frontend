const fs = require("node:fs");
const path = require("node:path");
const { test, expect, chromium } = require("@playwright/test");

const extensionPath = process.env.AUTOLISTER_EXTENSION_PATH
  ? path.resolve(process.env.AUTOLISTER_EXTENSION_PATH)
  : path.resolve(__dirname, "../..");
const languageDefaultsPath = path.join(extensionPath, "language-defaults.js");
const contentScriptPath = path.join(extensionPath, "content.js");
const tinyPngDataUrl =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=";
const listingFixture = fs.readFileSync(
  path.resolve(__dirname, "../fixtures/vinted-listing.html"),
  "utf8",
);
const emptyListingFixture = listingFixture.replace(
  /\n        <div class="photo-box">[\s\S]*?\n        <\/div>(?=\n      <\/section>)/,
  "",
);
const delayedFileInputListingFixture = emptyListingFixture.replace(
  /<input\s+data-testid="add-photos-input"[\s\S]*?\/>/,
  `<script>
    setTimeout(() => {
      const input = document.createElement("input");
      input.dataset.testid = "add-photos-input";
      input.name = "photos";
      input.type = "file";
      input.multiple = true;
      document.querySelector('[data-testid="media-upload-grid"]').prepend(input);
    }, 1000);
  </script>`,
);
const freeLimitPaywallSeenStorageKey =
  "quickvintLimitPaywallSeen:test-user:limit_followup_offer_v1";

async function loadExtension(options = {}) {
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
    ...options,
  });

  let [serviceWorker] = context.serviceWorkers();
  if (!serviceWorker) {
    serviceWorker = await context.waitForEvent("serviceworker");
  }

  return { context, serviceWorker };
}

function installChromeHarness(page, capacityResponse = null, initialStorage = {}) {
  return page.evaluate(({ capacity, initialStorage }) => {
    const capacityQueue = Array.isArray(capacity) ? [...capacity] : [capacity];
    let currentCapacity = capacityQueue[0] || null;
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
            if (capacityQueue.length) currentCapacity = capacityQueue.shift();
            response = { ok: true, capacity: currentCapacity };
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
  if (options.userAgent) {
    await page.evaluate((userAgent) => {
      Object.defineProperty(navigator, "userAgent", {
        configurable: true,
        value: userAgent,
      });
    }, options.userAgent);
  }
  if (options.orionTouchDevice) {
    await page.evaluate(() => {
      window.KAGI = {};
      Object.defineProperty(navigator, "maxTouchPoints", {
        configurable: true,
        value: 5,
      });
    });
  }
  if (options.emptyListing) {
    await page.evaluate(() => {
      document.querySelectorAll(".photo-box").forEach((node) => node.remove());
      document.querySelector('[data-testid="title--input"]').value = "";
      document.querySelector('[data-testid="description--input"]').value = "";
    });
  }
  if (options.fieldTitleNodes) {
    await page.evaluate(() => {
      for (const [selector, testId] of [
        ['[data-testid="title--input"]', "title--title"],
        ['[data-testid="description--input"]', "description--title"],
      ]) {
        const label = document.querySelector(selector)?.closest("label");
        const textNode = Array.from(label?.childNodes || []).find(
          (node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim(),
        );
        if (!textNode) continue;
        const title = document.createElement("span");
        title.dataset.testid = testId;
        title.textContent = textNode.textContent.trim();
        textNode.replaceWith(title);
      }
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
  if (options.shortenUploadIdleTimers) {
    await page.evaluate(() => {
      const originalSetTimeout = window.setTimeout.bind(window);
      window.setTimeout = (callback, delay, ...args) => {
        return originalSetTimeout(
          callback,
          delay === 5 * 60 * 1000 ? 25 : delay,
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
  await expect(page.locator("#quickvint-batch-btn")).toHaveCount(0);
  await expect(
    page.locator("#quickvint-description-length-toggle"),
  ).toBeVisible();
  await expect(page.locator("#quickvint-output-shape-toggle")).toBeVisible();
  await expect(page.locator("#quickvint-hashtags-toggle")).toBeVisible();
  await expect(page.locator("#quickvint-description-footer-btn")).toBeVisible();
}

async function openPhoneChoice(page) {
  await page.locator("#quickvint-phone-btn").click();
  const modal = page.locator("#quickvint-upload-choice-modal");
  await expect(modal).toBeVisible();
  return modal;
}

function getCapacityRequestCount(page) {
  return page.evaluate(
    () =>
      window.__extensionHarness.runtimeMessages.filter(
        (message) => message?.type === "GET_BATCH_CAPACITY",
      ).length,
  );
}

async function chooseSinglePhoneUpload(page) {
  const modal = await openPhoneChoice(page);
  await modal.locator(".quickvint-upload-choice-single").click();
}

async function chooseBatchUpload(page) {
  const modal = await openPhoneChoice(page);
  await modal.locator(".quickvint-upload-choice-multiple").click();
}

async function expectNoHorizontalOverflow(page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
}

async function expectInsideViewport(page, selector) {
  const viewport = page.viewportSize();
  await expect
    .poll(async () => {
      const box = await page.locator(selector).boundingBox();
      return Boolean(
        box &&
          box.x >= -1 &&
          box.y >= -1 &&
          box.x + box.width <= viewport.width + 1 &&
          box.y + box.height <= viewport.height + 1,
      );
    })
    .toBe(true);
}

async function expectElementCoversViewport(page, selector) {
  const viewport = page.viewportSize();
  expect(viewport).not.toBeNull();
  const box = await page.locator(selector).evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return {
      x: Math.round(rect.x),
      y: Math.round(rect.y),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
    };
  });
  expect(box.x).toBe(0);
  expect(box.width).toBe(viewport.width);
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.y).toBeLessThanOrEqual(12);
  expect(box.y + box.height).toBe(viewport.height);
}

async function expectBatchModalLayoutStable(page, modal) {
  await expectElementCoversViewport(page, "#quickvint-batch-modal");
  await expectInsideViewport(page, "#quickvint-batch-modal .batch-content");
  expect(
    await modal.evaluate((root) => {
      const content = root.querySelector(".batch-content");
      const body = root.querySelector(".batch-body");
      const review = root.querySelector(".batch-review");
      const gallery = root.querySelector(".batch-gallery");
      const actions = root.querySelector(".batch-actions");
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const contentRect = content.getBoundingClientRect();
      const galleryRect = gallery.getBoundingClientRect();
      const actionsRect = actions.getBoundingClientRect();
      return {
        panelIsConstrained:
          contentRect.width <= viewportWidth - 14 &&
          contentRect.height <= viewportHeight - 14,
        galleryVisible:
          galleryRect.width > 0 &&
          galleryRect.height >= 44 &&
          galleryRect.top >= contentRect.top &&
          galleryRect.bottom <= actionsRect.top + 1,
        actionsVisible:
          actionsRect.width > 0 &&
          actionsRect.height >= 44 &&
          actionsRect.bottom <= contentRect.bottom + 1,
        noDocumentOverflow:
          document.documentElement.scrollWidth <= viewportWidth + 1 &&
          document.body.scrollWidth <= viewportWidth + 1,
        bodyClipsFullBleedFooter: ["hidden", "clip"].includes(
          getComputedStyle(body).overflowX,
        ),
        reviewDoesNotSideScroll: review.scrollWidth <= review.clientWidth + 1,
      };
    }),
  ).toEqual({
    panelIsConstrained: true,
    galleryVisible: true,
    actionsVisible: true,
    noDocumentOverflow: true,
    bodyClipsFullBleedFooter: true,
    reviewDoesNotSideScroll: true,
  });
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

async function routeBatchComputerStorageUploads(
  page,
  { holdUploads = false, failUploads = false, failUploadOrders = [] } = {},
) {
  const uploadedFiles = [];
  const uploadRequests = [];
  const cleanupRequests = [];
  let releaseUploads;
  const uploadsReleased = holdUploads
    ? new Promise((resolve) => {
        releaseUploads = resolve;
      })
    : Promise.resolve();
  await page.route("https://autolister.app/api/phone-upload**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.searchParams.get("action") === "cleanup") {
      cleanupRequests.push(request.url());
      return route.fulfill({ status: 204, body: "" });
    }
    if (request.method() === "POST") {
      const body = request.postDataBuffer()?.toString("latin1") || "";
      const order = Number(body.match(/name="uploadOrder"\r\n\r\n(\d+)/)?.[1] || 0);
      const fileName = body.match(/filename="([^"]+)"/)?.[1] || `photo-${order}.jpg`;
      uploadRequests.push({ order, fileName });
      if (failUploads || failUploadOrders.includes(order)) {
        return route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ error: "Storage unavailable" }),
        });
      }
      await uploadsReleased;
      uploadedFiles[order] = {
        name: `${String(order).padStart(6, "0")}-${fileName}`,
        path: `batch-session/${String(order).padStart(6, "0")}-${fileName}`,
        url: `https://storage.test/${encodeURIComponent(fileName)}?token=signed-${order}`,
        order,
      };
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          count: 1,
          expectedCount: 1,
          files: [uploadedFiles[order]],
        }),
      });
    }
    const files = uploadedFiles.filter(Boolean);
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ files, count: files.length, complete: true }),
    });
  });
  return {
    uploadedFiles,
    uploadRequests,
    cleanupRequests,
    releaseUploads: () => releaseUploads?.(),
  };
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
  async function setupReadyPhoneUploadWithDelayedThumbnails(
    page,
    requestBodies,
    fileCount = 2,
    capacityResponse = { allowed: true, available: 10 },
  ) {
    await page.route("https://autolister.app/api/generate", (route) => {
      requestBodies.push(route.request().postDataJSON());
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          title: "Closed Then Generate",
          description: "Generated after closing phone upload.",
          measurementAdvice: "",
        }),
      });
    });

    await openContentHarness(
      page,
      capacityResponse,
      { emptyListing: true, shortenPhoneUploadPoll: true },
    );

    await page.evaluate(({ dataUrl, fileCount }) => {
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
                    files: Array.from({ length: fileCount }, (_, index) => ({
                      name: `phone-${index + 1}.jpg`,
                      path: `phone-${index + 1}.jpg`,
                      url: `https://storage.test/phone-${index + 1}.jpg`,
                      order: index,
                    })),
                    count: fileCount,
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
    }, { dataUrl: tinyPngDataUrl, fileCount });
  }

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

  test("opens the full sign-in tab from an iPhone", async ({ page }) => {
    await openContentHarness(page, null, {
      expectAuthenticated: false,
      initialStorage: {
        supabaseSession: null,
        userProfile: null,
      },
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15",
    });

    await page.locator("#quickvint-signin-btn").click();

    await expect
      .poll(() =>
        page.evaluate(() =>
          window.__extensionHarness.runtimeMessages
            .filter((message) => ["OPEN_POPUP", "OPEN_AUTH_TAB"].includes(message.type))
            .map((message) => message.type),
        ),
      )
      .toEqual(["OPEN_AUTH_TAB"]);
  });

  test("opens the full sign-in tab in Orion when it requests desktop sites", async ({
    page,
  }) => {
    await openContentHarness(page, null, {
      expectAuthenticated: false,
      initialStorage: {
        supabaseSession: null,
        userProfile: null,
      },
      orionTouchDevice: true,
    });

    await page.locator("#quickvint-signin-btn").click();

    await expect
      .poll(() =>
        page.evaluate(() =>
          window.__extensionHarness.runtimeMessages
            .filter((message) => ["OPEN_POPUP", "OPEN_AUTH_TAB"].includes(message.type))
            .map((message) => message.type),
        ),
      )
      .toEqual(["OPEN_AUTH_TAB"]);
  });

  test("keeps the popup sign-in flow on desktop", async ({ page }) => {
    await openContentHarness(page, null, {
      expectAuthenticated: false,
      initialStorage: {
        supabaseSession: null,
        userProfile: null,
      },
    });

    await page.locator("#quickvint-signin-btn").click();

    await expect
      .poll(() =>
        page.evaluate(() =>
          window.__extensionHarness.runtimeMessages
            .filter((message) => ["OPEN_POPUP", "OPEN_AUTH_TAB"].includes(message.type))
            .map((message) => message.type),
        ),
      )
      .toEqual(["OPEN_POPUP"]);
  });

  test("fits listing tools and report dialog on an Orion phone viewport", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openContentHarness(page, { allowed: true, available: 10 }, {
      orionTouchDevice: true,
    });

    const primaryBox = await page.locator(".quickvint-primary-tools").boundingBox();
    const actionBoxes = await Promise.all(
      [
        "#quickvint-gen-btn",
        "#quickvint-phone-btn",
        "#quickvint-report-btn",
      ].map((selector) => page.locator(selector).boundingBox()),
    );

    expect(primaryBox).not.toBeNull();
    expect(actionBoxes.every((box) => box && box.height >= 44)).toBe(true);
    expect(Math.max(...actionBoxes.map((box) => box.x + box.width))).toBeLessThanOrEqual(
      primaryBox.x + primaryBox.width + 1,
    );
    await expectNoHorizontalOverflow(page);

    await page.locator("#quickvint-report-btn").click();
    await expect(page.locator("#quickvint-report-modal")).toBeVisible();
    await expectInsideViewport(page, "#quickvint-report-modal .quickvint-report-card");
    expect(
      await page
        .locator("#quickvint-report-modal .quickvint-report-submit")
        .evaluate((button) => button.getBoundingClientRect().height),
    ).toBeGreaterThanOrEqual(44);
  });

  test("fits saved-note and phone dialogs on an Orion phone viewport", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openContentHarness(page, { allowed: true, available: 10 }, {
      orionTouchDevice: true,
      emptyListing: true,
    });

    await page.locator("#quickvint-description-footer-edit-btn").click();
    await expect(page.locator("#quickvint-description-footer-modal")).toBeVisible();
    await expectInsideViewport(
      page,
      "#quickvint-description-footer-modal .quickvint-footer-card",
    );
    expect(
      await page
        .locator("#quickvint-description-footer-modal .quickvint-footer-save")
        .evaluate((button) => button.getBoundingClientRect().height),
    ).toBeGreaterThanOrEqual(44);
    await page
      .locator("#quickvint-description-footer-modal .quickvint-footer-close")
      .click();

    await chooseSinglePhoneUpload(page);
    await expect(page.locator("#quickvint-phone-modal")).toBeVisible();
    await expectInsideViewport(page, "#quickvint-phone-modal .modal-content");
    for (const selector of [
      "#quickvint-phone-modal .close-btn",
      "#quickvint-phone-modal .generate-btn",
    ]) {
      expect(
        await page
          .locator(selector)
          .evaluate((button) => button.getBoundingClientRect().height),
      ).toBeGreaterThanOrEqual(44);
    }
    await expectNoHorizontalOverflow(page);
  });

  test("fits batch upload actions on an Orion phone viewport", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openContentHarness(page, { allowed: true, available: 10 }, {
      orionTouchDevice: true,
      emptyListing: true,
    });

    await chooseBatchUpload(page);
    await expect(page.locator("#quickvint-batch-modal")).toBeVisible();
    await expectInsideViewport(page, "#quickvint-batch-modal .batch-content");
    for (const selector of [
      "#quickvint-batch-modal .batch-close",
      "#quickvint-batch-modal .batch-cancel",
    ]) {
      expect(
        await page
          .locator(selector)
          .evaluate((button) => button.getBoundingClientRect().height),
      ).toBeGreaterThanOrEqual(44);
    }
    await expectNoHorizontalOverflow(page);
  });

  test("shows phone and computer batch sources without another chooser", async ({
    page,
  }) => {
    await openContentHarness(page, { allowed: true, available: 10 }, {
      emptyListing: true,
    });

    await chooseBatchUpload(page);
    const modal = page.locator("#quickvint-batch-modal");

    await expect(modal).toHaveAttribute("role", "dialog");
    await expect(modal).toHaveAttribute("aria-modal", "true");
    await expect(modal).toHaveAttribute(
      "aria-labelledby",
      "quickvint-batch-title",
    );
    await expect(modal.locator(".batch-source-phone")).toBeVisible();
    await expect(modal.locator(".batch-source-phone .batch-wait-title")).toHaveText(
      "Scan QR code",
    );
    await expect(modal.locator(".batch-computer-dropzone")).toContainText(
      "Drop photos or a folder",
    );
    await expect(modal.locator(".batch-computer-dropzone")).not.toContainText(
      "or choose them from this computer",
    );
    await expect(modal.locator(".batch-computer-icon svg")).toHaveAttribute(
      "data-icon",
      "upload",
    );
    await expect(modal.locator(".batch-subtitle")).toBeHidden();
    await expect(modal.locator(".batch-wait-copy")).toHaveText(
      "Choose photos. Keep page open.",
    );
    await expect(modal.locator(".batch-qr-note")).toHaveCount(0);
    await expect(modal.locator(".batch-computer-files-input")).toHaveAttribute(
      "multiple",
      "",
    );
    await expect(modal.locator(".batch-computer-folder-input")).toHaveAttribute(
      "webkitdirectory",
      "",
    );
    await expect(modal.locator(".batch-source-choice")).toHaveCount(0);
    await expect(modal.locator(".batch-qr img")).toBeVisible();
    for (const selector of [".batch-choose-files", ".batch-choose-folder"]) {
      expect(
        await modal
          .locator(selector)
          .evaluate((button) => button.getBoundingClientRect().height),
      ).toBeGreaterThanOrEqual(44);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await expectInsideViewport(page, "#quickvint-batch-modal .batch-content");
    await expectInsideViewport(page, "#quickvint-batch-modal .batch-source-phone");
    await expectInsideViewport(page, "#quickvint-batch-modal .batch-source-computer");
    await expectNoHorizontalOverflow(page);
  });

  test("computer batch upload sends loose files to the manual organizer", async ({
    page,
  }) => {
    const storage = await routeBatchComputerStorageUploads(page);
    await openContentHarness(page, { allowed: true, available: 10 }, {
      emptyListing: true,
    });
    await chooseBatchUpload(page);

    const uploadBuffer = Buffer.from(tinyPngDataUrl.split(",")[1], "base64");
    await page.setInputFiles(
      "#quickvint-batch-modal .batch-computer-files-input",
      [
        { name: "jacket-front.png", mimeType: "image/png", buffer: uploadBuffer },
        { name: "jacket-back.png", mimeType: "image/png", buffer: uploadBuffer },
      ],
    );

    const modal = page.locator("#quickvint-batch-modal");
    await expect(modal.locator(".batch-title")).toHaveText("Organize items");
    await expect(modal.locator(".batch-gallery .batch-photo")).toHaveCount(2);
    await expect(modal.locator(".batch-item-card")).toHaveCount(0);
    expect(storage.uploadRequests).toHaveLength(2);
    await expect(modal.locator(".batch-gallery img").first()).toHaveAttribute(
      "src",
      /jacket-front\.jpg/,
    );
  });

  test("computer batch generation keeps temporary storage URLs", async ({
    page,
  }) => {
    await routeBatchComputerStorageUploads(page);
    await openContentHarness(page, { allowed: true, available: 10 }, {
      emptyListing: true,
    });
    await chooseBatchUpload(page);

    const uploadBuffer = Buffer.from(tinyPngDataUrl.split(",")[1], "base64");
    await page.setInputFiles(
      "#quickvint-batch-modal .batch-computer-files-input",
      [
        { name: "jacket-front.png", mimeType: "image/png", buffer: uploadBuffer },
        { name: "jacket-back.png", mimeType: "image/png", buffer: uploadBuffer },
      ],
    );

    const modal = page.locator("#quickvint-batch-modal");
    await expect(modal.locator(".batch-gallery .batch-photo")).toHaveCount(2);
    await modal.locator(".batch-gallery .batch-photo").nth(0).click();
    await modal.locator(".batch-gallery .batch-photo").nth(1).click();
    await modal.locator(".batch-mark-group").click();
    await modal.locator(".batch-start").click();

    await expect
      .poll(() =>
        page.evaluate(() =>
          window.__extensionHarness.runtimeMessages.find(
            (message) => message?.type === "START_BATCH_GENERATION",
          ),
        ),
      )
      .toMatchObject({
        groups: [
          [
            { url: /jacket-front\.jpg\?token=signed-0/ },
            { url: /jacket-back\.jpg\?token=signed-1/ },
          ],
        ],
      });
  });

  test("computer batch upload sends folder files to the same manual organizer", async ({
    page,
  }) => {
    const storage = await routeBatchComputerStorageUploads(page);
    await openContentHarness(page, { allowed: true, available: 10 }, {
      emptyListing: true,
    });
    await chooseBatchUpload(page);
    await expect(
      page.locator("#quickvint-batch-modal .batch-computer-folder-input"),
    ).toHaveCount(1);

    await page.evaluate((dataUrl) => {
      const bytes = Uint8Array.from(atob(dataUrl.split(",")[1]), (char) =>
        char.charCodeAt(0),
      );
      const transfer = new DataTransfer();
      for (const [name, relativePath] of [
        ["item-10.png", "batch/item-10.png"],
        ["item-2.png", "batch/item-2.png"],
      ]) {
        const file = new File([bytes], name, { type: "image/png" });
        Object.defineProperty(file, "webkitRelativePath", {
          value: relativePath,
        });
        transfer.items.add(file);
      }
      const input = document.querySelector(
        "#quickvint-batch-modal .batch-computer-folder-input",
      );
      input.files = transfer.files;
      input.dispatchEvent(new Event("change", { bubbles: true }));
    }, tinyPngDataUrl);

    const modal = page.locator("#quickvint-batch-modal");
    await expect(modal.locator(".batch-title")).toHaveText("Organize items");
    await expect(modal.locator(".batch-gallery .batch-photo")).toHaveCount(2);
    await expect(modal.locator(".batch-item-card")).toHaveCount(0);
    expect(storage.uploadRequests).toHaveLength(2);
    await expect(modal.locator(".batch-gallery img").first()).toHaveAttribute(
      "src",
      /item-2\.jpg/,
    );
  });

  test("computer batch upload flattens a dropped folder without grouping", async ({
    page,
  }) => {
    await routeBatchComputerStorageUploads(page);
    await openContentHarness(page, { allowed: true, available: 10 }, {
      emptyListing: true,
    });
    await chooseBatchUpload(page);
    await expect(
      page.locator("#quickvint-batch-modal .batch-computer-dropzone"),
    ).toBeVisible();

    await page.evaluate((dataUrl) => {
      const bytes = Uint8Array.from(atob(dataUrl.split(",")[1]), (char) =>
        char.charCodeAt(0),
      );
      const fileEntries = [
        ["shoe-10.png", new File([bytes], "shoe-10.png", { type: "image/png" })],
        ["shoe-2.png", new File([bytes], "shoe-2.png", { type: "image/png" })],
      ].map(([name, file]) => ({
        isFile: true,
        isDirectory: false,
        fullPath: `/batch/${name}`,
        file: (resolve) => resolve(file),
      }));
      let readCount = 0;
      const directoryEntry = {
        isFile: false,
        isDirectory: true,
        fullPath: "/batch",
        createReader: () => ({
          readEntries: (resolve) => {
            const entries = readCount === 0 ? fileEntries : [];
            readCount += 1;
            resolve(entries);
          },
        }),
      };
      const event = new Event("drop", { bubbles: true, cancelable: true });
      Object.defineProperty(event, "dataTransfer", {
        value: {
          files: [],
          items: [{ webkitGetAsEntry: () => directoryEntry }],
        },
      });
      document
        .querySelector("#quickvint-batch-modal .batch-computer-dropzone")
        .dispatchEvent(event);
    }, tinyPngDataUrl);

    const modal = page.locator("#quickvint-batch-modal");
    await expect(modal.locator(".batch-title")).toHaveText("Organize items");
    await expect(modal.locator(".batch-gallery .batch-photo")).toHaveCount(2);
    await expect(modal.locator(".batch-item-card")).toHaveCount(0);
    await expect(modal.locator(".batch-gallery img").first()).toHaveAttribute(
      "src",
      /shoe-2\.jpg/,
    );
  });

  test("computer batch upload preserves loose drop order", async ({ page }) => {
    await routeBatchComputerStorageUploads(page);
    await openContentHarness(page, { allowed: true, available: 10 }, {
      emptyListing: true,
    });
    await chooseBatchUpload(page);
    await expect(
      page.locator("#quickvint-batch-modal .batch-computer-dropzone"),
    ).toBeVisible();

    await page.evaluate((dataUrl) => {
      const bytes = Uint8Array.from(atob(dataUrl.split(",")[1]), (char) =>
        char.charCodeAt(0),
      );
      const entries = ["z-front.png", "a-back.png"].map((name) => ({
        isFile: true,
        isDirectory: false,
        fullPath: `/${name}`,
        file: (resolve) =>
          resolve(new File([bytes], name, { type: "image/png" })),
      }));
      const event = new Event("drop", { bubbles: true, cancelable: true });
      Object.defineProperty(event, "dataTransfer", {
        value: {
          files: [],
          items: entries.map((entry) => ({
            webkitGetAsEntry: () => entry,
          })),
        },
      });
      document
        .querySelector("#quickvint-batch-modal .batch-computer-dropzone")
        .dispatchEvent(event);
    }, tinyPngDataUrl);

    const modal = page.locator("#quickvint-batch-modal");
    await expect(modal.locator(".batch-title")).toHaveText("Organize items");
    await expect(modal.locator(".batch-gallery img").first()).toHaveAttribute(
      "src",
      /z-front\.jpg/,
    );
  });

  test("computer batch upload reports unreadable dropped folders", async ({
    page,
  }) => {
    await openContentHarness(page, { allowed: true, available: 10 }, {
      emptyListing: true,
    });
    await chooseBatchUpload(page);
    await expect(
      page.locator("#quickvint-batch-modal .batch-computer-dropzone"),
    ).toBeVisible();

    await page.evaluate(() => {
      const directoryEntry = {
        isFile: false,
        isDirectory: true,
        createReader: () => ({
          readEntries: (_resolve, reject) => reject(new Error("Folder denied")),
        }),
      };
      const event = new Event("drop", { bubbles: true, cancelable: true });
      Object.defineProperty(event, "dataTransfer", {
        value: {
          files: [],
          items: [{ webkitGetAsEntry: () => directoryEntry }],
        },
      });
      document
        .querySelector("#quickvint-batch-modal .batch-computer-dropzone")
        .dispatchEvent(event);
    });

    await expect(page.locator("#quickvint-toast.error")).toContainText(
      "Could not read that folder. Try choosing it instead.",
    );
    await expect(
      page.locator("#quickvint-batch-modal .batch-source-computer"),
    ).toBeVisible();
  });

  test("closing during dropped-folder reading does not start an upload", async ({
    page,
  }) => {
    const storage = await routeBatchComputerStorageUploads(page);
    await openContentHarness(page, { allowed: true, available: 10 }, {
      emptyListing: true,
    });
    await page.evaluate(() => {
      window.__batchCloseMessages = [];
      window.confirm = (message) => {
        window.__batchCloseMessages.push(message);
        return true;
      };
    });
    await chooseBatchUpload(page);
    const modal = page.locator("#quickvint-batch-modal");
    const sessionId = await modal.getAttribute("data-session-id");

    await page.evaluate((dataUrl) => {
      const bytes = Uint8Array.from(atob(dataUrl.split(",")[1]), (char) =>
        char.charCodeAt(0),
      );
      const fileEntry = {
        isFile: true,
        isDirectory: false,
        fullPath: "/batch/jacket.png",
        file: (resolve) =>
          resolve(new File([bytes], "jacket.png", { type: "image/png" })),
      };
      let readCount = 0;
      const directoryEntry = {
        isFile: false,
        isDirectory: true,
        createReader: () => ({
          readEntries: (resolve) => {
            if (readCount > 0) {
              resolve([]);
              return;
            }
            readCount += 1;
            window.__releaseBatchDirectoryRead = () => resolve([fileEntry]);
          },
        }),
      };
      const event = new Event("drop", { bubbles: true, cancelable: true });
      Object.defineProperty(event, "dataTransfer", {
        value: {
          files: [],
          items: [{ webkitGetAsEntry: () => directoryEntry }],
        },
      });
      document
        .querySelector("#quickvint-batch-modal .batch-computer-dropzone")
        .dispatchEvent(event);
    }, tinyPngDataUrl);

    await expect
      .poll(() =>
        page.evaluate(() => typeof window.__releaseBatchDirectoryRead),
      )
      .toBe("function");
    await modal.locator(".batch-close").click();
    await expect(modal).toHaveCount(0);
    expect(await page.evaluate(() => window.__batchCloseMessages)).toEqual([
      "Photos are still uploading. Closing now will discard this batch upload. Close anyway?",
    ]);

    await page.evaluate(() => window.__releaseBatchDirectoryRead());
    await expect
      .poll(() =>
        page.evaluate((currentSessionId) =>
          window.__extensionHarness.runtimeMessages.some(
            (message) =>
              String(message?.url || "").includes("action=cleanup") &&
              String(message?.url || "").includes(currentSessionId),
          ),
        sessionId),
      )
      .toBe(true);
    expect(storage.uploadRequests).toHaveLength(0);
  });

  test("computer batch upload shows progress before opening the organizer", async ({
    page,
  }) => {
    const storage = await routeBatchComputerStorageUploads(page, {
      holdUploads: true,
    });
    await openContentHarness(page, { allowed: true, available: 10 }, {
      emptyListing: true,
    });
    await chooseBatchUpload(page);

    const uploadBuffer = Buffer.from(tinyPngDataUrl.split(",")[1], "base64");
    await page.setInputFiles(
      "#quickvint-batch-modal .batch-computer-files-input",
      [
        { name: "front.png", mimeType: "image/png", buffer: uploadBuffer },
        { name: "back.png", mimeType: "image/png", buffer: uploadBuffer },
      ],
    );

    const modal = page.locator("#quickvint-batch-modal");
    await expect(modal.locator(".batch-computer-progress")).toContainText(
      "Uploading 2 photos",
    );
    await expect(modal.locator(".batch-computer-progress")).toContainText(
      "0 of 2 uploaded",
    );
    await expect(modal.locator(".batch-choose-files")).toBeDisabled();
    await expect(modal.locator(".batch-choose-folder")).toBeDisabled();
    await expect(modal.locator(".batch-source-phone")).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    await expect(modal.locator(".batch-source-phone")).toContainText(
      "Using this computer",
    );
    await page.setViewportSize({ width: 390, height: 844 });
    await expectInsideViewport(page, "#quickvint-batch-modal .batch-content");
    await expect(modal.locator(".batch-computer-progress")).toBeVisible();
    await expectNoHorizontalOverflow(page);

    storage.releaseUploads();
    await expect(modal.locator(".batch-title")).toHaveText("Organize items");
    await expect(modal.locator(".batch-gallery .batch-photo")).toHaveCount(2);
  });

  test("computer batch upload rejects selections without images", async ({
    page,
  }) => {
    const storage = await routeBatchComputerStorageUploads(page);
    await openContentHarness(page, { allowed: true, available: 10 }, {
      emptyListing: true,
    });
    await chooseBatchUpload(page);

    await page.setInputFiles(
      "#quickvint-batch-modal .batch-computer-files-input",
      {
        name: "inventory.csv",
        mimeType: "text/csv",
        buffer: Buffer.from("sku,name\n1,jacket"),
      },
    );

    await expect(page.locator("#quickvint-toast.info")).toContainText(
      "Add image files to continue.",
    );
    await expect(
      page.locator("#quickvint-batch-modal .batch-source-computer"),
    ).toBeVisible();
    await expect(page.locator("#quickvint-batch-modal .batch-gallery")).toHaveCount(0);
    expect(storage.uploadRequests).toHaveLength(0);
  });

  test("computer batch upload failure stays recoverable", async ({ page }) => {
    const storage = await routeBatchComputerStorageUploads(page, {
      failUploads: true,
    });
    await openContentHarness(page, { allowed: true, available: 10 }, {
      emptyListing: true,
    });
    await chooseBatchUpload(page);

    await page.setInputFiles(
      "#quickvint-batch-modal .batch-computer-files-input",
      {
        name: "jacket.png",
        mimeType: "image/png",
        buffer: Buffer.from(tinyPngDataUrl.split(",")[1], "base64"),
      },
    );

    const modal = page.locator("#quickvint-batch-modal");
    await expect(modal.locator(".batch-computer-error")).toContainText(
      "Could not upload every photo. Try again.",
      { timeout: 10000 },
    );
    await expect(modal.locator(".batch-choose-files")).toBeEnabled();
    await expect(modal.locator(".batch-choose-folder")).toBeEnabled();
    await expect(modal.locator(".batch-gallery")).toHaveCount(0);
    expect(storage.uploadRequests).toHaveLength(3);
  });

  test("computer batch upload settles sibling requests before cleanup", async ({
    page,
  }) => {
    const storage = await routeBatchComputerStorageUploads(page, {
      holdUploads: true,
      failUploadOrders: [0],
    });
    await openContentHarness(page, { allowed: true, available: 10 }, {
      emptyListing: true,
    });
    await chooseBatchUpload(page);

    const uploadBuffer = Buffer.from(tinyPngDataUrl.split(",")[1], "base64");
    await page.setInputFiles(
      "#quickvint-batch-modal .batch-computer-files-input",
      [
        { name: "front.png", mimeType: "image/png", buffer: uploadBuffer },
        { name: "back.png", mimeType: "image/png", buffer: uploadBuffer },
      ],
    );

    await expect
      .poll(
        () => storage.uploadRequests.filter(({ order }) => order === 0).length,
        { timeout: 10000 },
      )
      .toBe(3);
    const modal = page.locator("#quickvint-batch-modal");
    const computerSessionId = await modal.getAttribute("data-session-id");
    await page.waitForTimeout(100);
    expect(
      await page.evaluate((sessionId) =>
        window.__extensionHarness.runtimeMessages.some(
          (message) =>
            String(message?.url || "").includes("action=cleanup") &&
            String(message?.url || "").includes(sessionId),
        ),
      computerSessionId),
    ).toBe(false);
    await expect(
      modal.locator(".batch-computer-error"),
    ).toHaveCount(0);

    storage.releaseUploads();
    await expect(modal.locator(".batch-computer-error")).toContainText(
      "Could not upload every photo. Try again.",
    );
    await expect
      .poll(() =>
        page.evaluate((sessionId) =>
          window.__extensionHarness.runtimeMessages.some(
            (message) =>
              String(message?.url || "").includes("action=cleanup") &&
              String(message?.url || "").includes(sessionId),
          ),
        computerSessionId),
      )
      .toBe(true);
  });

  test("locks batch computer controls after phone photos begin arriving", async ({
    page,
  }) => {
    await openContentHarness(
      page,
      { allowed: true, available: 10 },
      { emptyListing: true, shortenPhoneUploadPoll: true },
    );
    await page.evaluate(() => {
      const originalSendMessage = window.chrome.runtime.sendMessage;
      window.chrome.runtime.sendMessage = (message, callback) => {
        const url = String(message?.url || "");
        if (
          message?.type === "PROXY_FETCH" &&
          url.includes("/api/phone-upload?sessionId=")
        ) {
          setTimeout(
            () =>
              callback?.({
                ok: true,
                data: {
                  files: [
                    {
                      name: "phone-1.jpg",
                      path: "session/phone-1.jpg",
                      url: "https://storage.test/phone-1.jpg",
                      order: 0,
                    },
                  ],
                  count: 1,
                  complete: false,
                },
              }),
            0,
          );
          return;
        }
        originalSendMessage(message, callback);
      };
    });

    await chooseBatchUpload(page);
    const modal = page.locator("#quickvint-batch-modal");
    await expect(modal.locator(".batch-wait-title")).toContainText(
      "Receiving 1 photo",
    );
    await expect(modal.locator(".batch-choose-files")).toBeDisabled();
    await expect(modal.locator(".batch-choose-folder")).toBeDisabled();
    await expect(modal.locator(".batch-computer-dropzone")).toContainText(
      "Receiving from phone",
    );
  });

  test("ignores a delayed phone poll after computer upload starts", async ({
    page,
  }) => {
    const storage = await routeBatchComputerStorageUploads(page, {
      holdUploads: true,
    });
    await openContentHarness(page, { allowed: true, available: 10 }, {
      emptyListing: true,
    });
    await page.evaluate(() => {
      const originalSendMessage = window.chrome.runtime.sendMessage;
      window.chrome.runtime.sendMessage = (message, callback) => {
        const url = String(message?.url || "");
        if (
          !window.__delayedBatchPhonePoll &&
          message?.type === "PROXY_FETCH" &&
          url.includes("/api/phone-upload?sessionId=")
        ) {
          window.__delayedBatchPhonePoll = callback;
          return;
        }
        originalSendMessage(message, callback);
      };
    });

    await chooseBatchUpload(page);
    await expect
      .poll(() =>
        page.evaluate(() => typeof window.__delayedBatchPhonePoll),
      )
      .toBe("function");
    await page.setInputFiles(
      "#quickvint-batch-modal .batch-computer-files-input",
      {
        name: "computer.png",
        mimeType: "image/png",
        buffer: Buffer.from(tinyPngDataUrl.split(",")[1], "base64"),
      },
    );

    const modal = page.locator("#quickvint-batch-modal");
    await expect(modal.locator(".batch-computer-progress")).toBeVisible();
    await page.evaluate(() => {
      window.__delayedBatchPhonePoll({
        ok: true,
        data: {
          files: [
            {
              name: "phone.jpg",
              path: "old-session/phone.jpg",
              url: "https://storage.test/phone.jpg",
              order: 0,
            },
          ],
          count: 1,
          complete: true,
        },
      });
    });

    await expect(modal.locator(".batch-computer-progress")).toBeVisible();
    await expect(modal.locator(".batch-title")).toHaveText("Batch upload");
    storage.releaseUploads();
    await expect(modal.locator(".batch-title")).toHaveText("Organize items");
    await expect(modal.locator(".batch-gallery .batch-photo")).toHaveCount(1);
    await expect(modal.locator(".batch-gallery img")).toHaveAttribute(
      "src",
      /computer\.jpg/,
    );
  });

  test("warns before closing while computer photos are uploading", async ({
    page,
  }) => {
    const storage = await routeBatchComputerStorageUploads(page, {
      holdUploads: true,
    });
    await openContentHarness(page, { allowed: true, available: 10 }, {
      emptyListing: true,
    });
    await page.evaluate(() => {
      window.__batchCloseMessages = [];
      window.confirm = (message) => {
        window.__batchCloseMessages.push(message);
        return false;
      };
    });
    await chooseBatchUpload(page);

    await page.setInputFiles(
      "#quickvint-batch-modal .batch-computer-files-input",
      {
        name: "jacket.png",
        mimeType: "image/png",
        buffer: Buffer.from(tinyPngDataUrl.split(",")[1], "base64"),
      },
    );
    const modal = page.locator("#quickvint-batch-modal");
    await expect(modal.locator(".batch-computer-progress")).toBeVisible();
    await modal.locator(".batch-close").click();

    await expect(modal).toBeVisible();
    expect(await page.evaluate(() => window.__batchCloseMessages)).toEqual([
      "Photos are still uploading. Closing now will discard this batch upload. Close anyway?",
    ]);

    storage.releaseUploads();
    await expect(modal.locator(".batch-title")).toHaveText("Organize items");
  });

  test("accepted close aborts uploads before cleaning the computer session", async ({
    page,
  }) => {
    const storage = await routeBatchComputerStorageUploads(page, {
      holdUploads: true,
    });
    await openContentHarness(page, { allowed: true, available: 10 }, {
      emptyListing: true,
    });
    await page.evaluate(() => {
      window.confirm = () => true;
    });
    await chooseBatchUpload(page);
    await page.setInputFiles(
      "#quickvint-batch-modal .batch-computer-files-input",
      {
        name: "jacket.png",
        mimeType: "image/png",
        buffer: Buffer.from(tinyPngDataUrl.split(",")[1], "base64"),
      },
    );

    const modal = page.locator("#quickvint-batch-modal");
    await expect(modal.locator(".batch-computer-progress")).toBeVisible();
    const computerSessionId = await modal.getAttribute("data-session-id");
    await modal.locator(".batch-close").click();
    await expect(modal).toHaveCount(0);

    await expect
      .poll(() =>
        page.evaluate((sessionId) =>
          window.__extensionHarness.runtimeMessages.some(
            (message) =>
              String(message?.url || "").includes("action=cleanup") &&
              String(message?.url || "").includes(sessionId),
          ),
        computerSessionId),
      )
      .toBe(true);
    storage.releaseUploads();
  });

  test("opens a simple phone upload chooser with clear copy and available listings", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openContentHarness(page, { allowed: true, available: 12 });

    await expect(page.locator("#quickvint-phone-btn .quickvint-phone-new-badge")).toHaveText(
      "NEW",
    );
    const modal = await openPhoneChoice(page);
    await expect(modal.locator(".quickvint-upload-choice-title")).toHaveText(
      "How many items do you want to sell?",
    );
    await expect(modal.locator(".quickvint-upload-choice-capacity")).toHaveText(
      "12 listings available",
    );
    expect(
      await modal.locator(".quickvint-upload-choice-capacity").evaluate((element) => {
        const style = getComputedStyle(element);
        return {
          color: style.color,
          fontSize: style.fontSize,
          fontWeight: style.fontWeight,
        };
      }),
    ).toEqual({
      color: "rgb(51, 65, 85)",
      fontSize: "14px",
      fontWeight: "700",
    });
    await expect(modal).not.toContainText(/daily|monthly|extra credit/i);
    await expect(modal.locator(".quickvint-upload-choice-single")).toContainText(
      "1 item",
    );
    await expect(modal.locator(".quickvint-upload-choice-single")).toContainText(
      "Add photos to this page",
    );
    await expect(modal.locator(".quickvint-upload-choice-multiple")).toContainText(
      "Multiple items",
    );
    await expect(modal.locator(".quickvint-upload-choice-multiple")).toContainText(
      "Create new listings. This listing will not change.",
    );
    await expect(modal.locator(".quickvint-upload-choice-art img")).toHaveCount(2);
    await expect(
      modal.locator(".quickvint-upload-choice-single img"),
    ).toHaveAttribute("src", /quickvint-upload-single\.jpg/);
    await expect(
      modal.locator(".quickvint-upload-choice-multiple img"),
    ).toHaveAttribute("src", /quickvint-upload-multiple\.jpg/);
    const artBox = await modal
      .locator(".quickvint-upload-choice-art")
      .first()
      .evaluate((element) => {
        const rect = element.getBoundingClientRect();
        return { width: rect.width, height: rect.height };
      });
    expect(Math.abs(artBox.width - artBox.height)).toBeLessThanOrEqual(2);
    await expectInsideViewport(page, "#quickvint-upload-choice-modal .quickvint-upload-choice-card");
    await expectNoHorizontalOverflow(page);
  });

  test("shows availability through the chooser and batch source screen", async ({
    page,
  }) => {
    await openContentHarness(page, { allowed: true, available: 12 }, {
      emptyListing: true,
    });

    const chooser = await openPhoneChoice(page);
    await chooser.locator(".quickvint-upload-choice-multiple").click();
    const batch = page.locator("#quickvint-batch-modal");

    await expect(batch.locator(".batch-availability")).toHaveText(
      "12 listings available",
    );
    expect(
      await batch.locator(".batch-availability").evaluate((element) => {
        const style = getComputedStyle(element);
        return {
          backgroundColor: style.backgroundColor,
          borderStyle: style.borderStyle,
          borderRadius: style.borderRadius,
          paddingLeft: style.paddingLeft,
          color: style.color,
          fontSize: style.fontSize,
          fontWeight: style.fontWeight,
        };
      }),
    ).toEqual({
      backgroundColor: "rgba(0, 0, 0, 0)",
      borderStyle: "none",
      borderRadius: "0px",
      paddingLeft: "0px",
      color: "rgb(51, 65, 85)",
      fontSize: "14px",
      fontWeight: "700",
    });
    const [titleBox, availabilityBox] = await Promise.all([
      batch.locator(".batch-title").boundingBox(),
      batch.locator(".batch-availability").boundingBox(),
    ]);
    expect(availabilityBox.y).toBeGreaterThanOrEqual(titleBox.y + titleBox.height);
    expect(await getCapacityRequestCount(page)).toBe(1);
    await expect(batch).not.toContainText(/daily|monthly|extra credit/i);
  });

  test("shows available listings while organizing a batch", async ({ page }) => {
    await setupReadyPhoneUploadWithDelayedThumbnails(
      page,
      [],
      4,
      { allowed: true, available: 12 },
    );

    await chooseBatchUpload(page);
    const batch = page.locator("#quickvint-batch-modal");
    const gallery = batch.locator(".batch-gallery");
    await expect(gallery.locator(".batch-photo")).toHaveCount(4);

    for (const key of ["phone-1.jpg", "phone-2.jpg"]) {
      await gallery.locator(`.batch-photo[data-photo-key="${key}"]`).click();
      await batch.locator(".batch-mark-group").click();
    }

    await expect(batch.locator(".batch-availability")).toHaveText(
      "12 listings available",
    );
    await expect(batch.locator(".batch-capacity-note")).toHaveText(
      "Using 2 of 12 available",
    );
  });

  test("shows refreshed batch availability before limited generation", async ({
    page,
  }) => {
    await setupReadyPhoneUploadWithDelayedThumbnails(page, [], 3, [
      { allowed: true, available: 12 },
      { allowed: true, available: 2 },
    ]);

    await chooseBatchUpload(page);
    const batch = page.locator("#quickvint-batch-modal");
    const gallery = batch.locator(".batch-gallery");
    await expect(gallery.locator(".batch-photo")).toHaveCount(3);
    await expect(batch.locator(".batch-availability")).toHaveText(
      "2 listings available",
    );

    for (const key of ["phone-1.jpg", "phone-2.jpg", "phone-3.jpg"]) {
      await gallery.locator(`.batch-photo[data-photo-key="${key}"]`).click();
      await batch.locator(".batch-mark-group").click();
    }

    await expect(batch.locator(".batch-capacity-note")).toContainText(
      "You can generate 2 of 3 listings right now",
    );
    await expect(batch.locator(".batch-start")).toHaveText(
      "Generate first 2 of 3",
    );
  });

  for (const [mode, selector, destination] of [
    ["single", ".quickvint-upload-choice-single", "#quickvint-phone-modal"],
    ["batch", ".quickvint-upload-choice-multiple", "#quickvint-batch-modal"],
  ]) {
    test(`checks capacity on the first Phone click before ${mode} upload choice`, async ({
      page,
    }) => {
      await openContentHarness(page, { allowed: true, available: 10 });

      const modal = await openPhoneChoice(page);
      expect(await getCapacityRequestCount(page)).toBe(1);

      await modal.locator(selector).click();
      await expect(page.locator(destination)).toBeVisible();
      expect(await getCapacityRequestCount(page)).toBe(1);
    });
  }

  test("localizes the phone upload chooser", async ({ page }) => {
    await openContentHarness(page, { allowed: true, available: 10 }, {
      initialStorage: {
        selectedLanguage: "nl",
        selectedTitleLanguage: "en",
        selectedDescriptionLanguage: "en",
      },
    });

    const modal = await openPhoneChoice(page);
    await expect(modal.locator(".quickvint-upload-choice-title")).toHaveText(
      "Hoeveel items wil je verkopen?",
    );
    await expect(modal.locator(".quickvint-upload-choice-single")).toContainText(
      "1 item",
    );
    await expect(modal.locator(".quickvint-upload-choice-single")).toContainText(
      "Voeg foto's toe aan deze pagina",
    );
    await expect(modal.locator(".quickvint-upload-choice-multiple")).toContainText(
      "Nieuwe advertenties maken. Deze advertentie verandert niet.",
    );
  });

  test("keeps language menus inside an Orion phone viewport", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openContentHarness(page, null, {
      orionTouchDevice: true,
      fieldTitleNodes: true,
    });
    await page.locator("#quickvint-title-language-select").evaluate((trigger) => {
      const field = trigger.closest(".quickvint-lang-field");
      Object.assign(field.style, {
        display: "flex",
        position: "fixed",
        top: "120px",
        right: "0",
        zIndex: "2147483647",
      });
    });

    await page.locator("#quickvint-title-language-select").click();
    const menuBox = await page
      .locator("#quickvint-title-language-select + .quickvint-lang-menu")
      .boundingBox();

    expect(menuBox.x).toBeGreaterThanOrEqual(8);
    expect(menuBox.x + menuBox.width).toBeLessThanOrEqual(382);
  });

  test("preserves desktop listing tool geometry", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await openContentHarness(page);

    const primary = page.locator(".quickvint-primary-tools");
    const generateBox = await page.locator("#quickvint-gen-btn").boundingBox();
    const actionBoxes = await Promise.all(
      [
        "#quickvint-gen-btn",
        "#quickvint-phone-btn",
        "#quickvint-report-btn",
      ].map((selector) => page.locator(selector).boundingBox()),
    );

    expect(await primary.evaluate((element) => getComputedStyle(element).display)).toBe(
      "flex",
    );
    expect(generateBox.height).toBe(38);
    expect(
      Math.max(...actionBoxes.map((box) => box.y)) -
        Math.min(...actionBoxes.map((box) => box.y)),
    ).toBeLessThan(1);

    await page.locator("#quickvint-report-btn").click();
    const modalBox = await page
      .locator("#quickvint-report-modal .quickvint-report-card")
      .boundingBox();
    expect(Math.abs(modalBox.y + modalBox.height / 2 - 450)).toBeLessThan(2);
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
        "canary-config.js",
        "language-defaults.js",
        "content.js",
      ]);
      expect(manifest.host_permissions).toContain("https://autolister.app/*");
    } finally {
      await context.close();
    }
  });

  test("opens the responsive sign-in page from a simulated iPhone", async () => {
    const { context, serviceWorker } = await loadExtension({
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15",
      viewport: { width: 390, height: 844 },
    });
    const page = await context.newPage();
    const authEvents = [];
    try {
      await context.addInitScript(() => {
        window.KAGI = {};
      });
      await page.addInitScript(() => {
        window.KAGI = {};
      });
      await context.route("https://autolister.app/api/events/track", (route) => {
        const body = route.request().postDataJSON();
        authEvents.push(...(body.events || [body]));
        route.fulfill({ status: 204 });
      });
      await serviceWorker.evaluate(() =>
        chrome.storage.local.set({ supabaseSession: null, userProfile: null }),
      );
      await context.route("https://www.vinted.com/**", (route) =>
        route.fulfill({
          status: 200,
          contentType: "text/html",
          body: listingFixture,
        }),
      );

      await page.goto("https://www.vinted.com/items/new", {
        waitUntil: "domcontentloaded",
      });
      await expect(page.locator("#quickvint-signin-btn")).toBeVisible();

      const signInPagePromise = context.waitForEvent("page", {
        predicate: (newPage) =>
          newPage.url().includes("popup.html?source=vinted_signin_fallback"),
      });
      await page.locator("#quickvint-signin-btn").click();
      const signInPage = await signInPagePromise;
      await signInPage.waitForLoadState("domcontentloaded");

      await expect(signInPage).toHaveURL(
        /popup\.html\?source=vinted_signin_fallback/,
      );
      await expect(signInPage.locator("body")).toHaveClass(/auth-tab-mode/);
      await expect(signInPage.locator("#emailInput")).toBeVisible();
      await expectNoHorizontalOverflow(signInPage);
      await expectInsideViewport(signInPage, ".popup-container");
      const signInButton = await signInPage
        .locator("#googleSignIn")
        .boundingBox();
      expect(signInButton.height).toBeGreaterThanOrEqual(44);
      await expect
        .poll(() =>
          authEvents.find((event) => event.event === "signin_auth_tab_opened"),
        )
        .toMatchObject({
          context: {
            clientBrowser: "orion",
            clientPlatform: "ios",
          },
        });
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

      await context.route("https://www.vinted.com/**", (route) =>
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
      await chooseSinglePhoneUpload(page);
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

  test("waits for Vinted photo input in the loaded MV3 batch flow", async () => {
    const { context, serviceWorker } = await loadExtension();
    const page = await context.newPage();
    const requestBodies = [];
    const cleanupRequests = [];
    let listingLoads = 0;
    let listRequests = 0;
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

      await context.route("https://www.vinted.com/**", (route) => {
        listingLoads += 1;
        return route.fulfill({
          status: 200,
          contentType: "text/html",
          body:
            listingLoads === 1
              ? emptyListingFixture
              : delayedFileInputListingFixture,
        });
      });
      await context.route("https://autolister.app/api/user/batch-capacity", (route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ allowed: true, available: 10 }),
        }),
      );
      await context.route("https://autolister.app/api/events/track", (route) =>
        route.fulfill({ status: 204, body: "" }),
      );
      await context.route("https://autolister.app/api/generate", (route) => {
        requestBodies.push(route.request().postDataJSON());
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            title: "Loaded Batch Item",
            description: "Generated through loaded batch flow.",
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
        listRequests += 1;
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            files: [
              {
                name: "batch-real-1.jpg",
                path: "session/batch-real-1.jpg",
                order: 0,
                url: "https://storage.test/batch-real-1.jpg",
              },
              {
                name: "batch-real-2.jpg",
                path: "session/batch-real-2.jpg",
                order: 1,
                url: "https://storage.test/batch-real-2.jpg",
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
      await expect(page.locator("#quickvint-batch-btn")).toHaveCount(0);
      await chooseBatchUpload(page);
      await expect(
        page.locator("#quickvint-batch-modal .batch-gallery .batch-photo"),
      ).toHaveCount(2);
      await page
        .locator("#quickvint-batch-modal .batch-gallery .batch-photo")
        .nth(0)
        .click();
      await page
        .locator("#quickvint-batch-modal .batch-gallery .batch-photo")
        .nth(1)
        .click();
      await page.locator("#quickvint-batch-modal .batch-mark-group").click();
      await expect(page.locator("#quickvint-batch-modal .batch-start")).toBeEnabled();
      await page.locator("#quickvint-batch-modal .batch-start").click();

      await expect.poll(() => requestBodies.length).toBe(1);
      expect(listingLoads).toBeGreaterThanOrEqual(2);
      const workPage = context
        .pages()
        .find((candidate) => candidate !== page && candidate.url().includes("/items/new"));
      await expect(
        workPage.locator('[data-testid="add-photos-input"]'),
      ).toHaveCount(1);
      expect(requestBodies[0].imageUrls).toEqual([
        "https://storage.test/batch-real-1.jpg",
        "https://storage.test/batch-real-2.jpg",
      ]);
      expect(requestBodies[0].imageMetadata[0]).toMatchObject({
        capturedUploadSource: "phone_upload_batch",
        generationPayloadSource: "phone_upload_storage_url",
      });
      await expect.poll(() => cleanupRequests.length).toBe(1);
      expect(listRequests).toBe(1);
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

  test("reports batch work tab ready only when Vinted photo input exists", async ({
    page,
  }) => {
    await openContentHarness(page);

    const pingBatchTab = () =>
      page.evaluate(
        () =>
          new Promise((resolve) => {
            const listener = window.__extensionHarness.runtimeListeners.find(
              (candidate) => typeof candidate === "function",
            );
            listener({ type: "BATCH_PING" }, {}, resolve);
          }),
      );

    await expect(pingBatchTab()).resolves.toEqual({ ok: true });
    await page
      .locator('[data-testid="add-photos-input"]')
      .evaluate((input) => input.remove());
    await expect(pingBatchTab()).resolves.toEqual({ ok: false });
  });

  test("keeps the unsorted row visible while grouped items scroll", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.route("https://storage.test/**", (route) => {
      const photoNumber =
        Number(route.request().url().match(/phone-(\d+)/)?.[1] || 1);
      const colors = ["#dbeafe", "#fce7f3", "#dcfce7", "#fef3c7", "#ede9fe"];
      return route.fulfill({
        status: 200,
        contentType: "image/svg+xml",
        body: `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160"><rect width="160" height="160" fill="${colors[(photoNumber - 1) % colors.length]}"/><text x="80" y="92" text-anchor="middle" font-family="Arial" font-size="44" fill="#334155">${photoNumber}</text></svg>`,
      });
    });
    await setupReadyPhoneUploadWithDelayedThumbnails(page, [], 15);

    await chooseBatchUpload(page);
    const modal = page.locator("#quickvint-batch-modal");
    const gallery = modal.locator(".batch-gallery");
    const galleryPhotos = gallery.locator(".batch-photo");
    await expect(galleryPhotos).toHaveCount(15);
    await expect(gallery).toHaveClass(/is-sticky-row/);

    for (let groupIndex = 0; groupIndex < 3; groupIndex += 1) {
      await gallery
        .locator(
          `.batch-photo[data-photo-key="phone-${groupIndex * 2 + 1}.jpg"]`,
        )
        .click();
      await gallery
        .locator(
          `.batch-photo[data-photo-key="phone-${groupIndex * 2 + 2}.jpg"]`,
        )
        .click();
      await modal.locator(".batch-mark-group").click();
    }

    await expect(gallery).toHaveClass(/is-sticky-row/);
    await expect(gallery.locator(".batch-photo-wrap:not([hidden])")).toHaveCount(9);
    expect(
      await gallery
        .locator(".batch-photo-wrap:not([hidden]) .batch-photo")
        .evaluateAll((photos) => photos.slice(0, 4).map((photo) => photo.dataset.photoKey)),
    ).toEqual(["phone-7.jpg", "phone-8.jpg", "phone-9.jpg", "phone-10.jpg"]);
    expect(
      await gallery.evaluate((node) => node.scrollWidth > node.clientWidth),
    ).toBe(true);
    await expect(modal.locator(".batch-review")).not.toHaveClass(/is-reflowing/);
    await expect(modal.locator(".batch-item-card")).toHaveCount(3);
    await expect(modal.locator(".batch-item-card").last()).not.toHaveClass(
      /is-entering/,
    );
    expect(await gallery.evaluate((node) => node.scrollLeft)).toBe(0);
    const review = modal.locator(".batch-review");
    await review.evaluate((node) => {
      node.scrollTop = node.scrollHeight;
    });
    await expect
      .poll(async () => {
        const [galleryBox, reviewBox] = await Promise.all([
          gallery.boundingBox(),
          review.boundingBox(),
        ]);
        return Math.abs(galleryBox.y - reviewBox.y);
      })
      .toBeLessThanOrEqual(1);
    expect(
      await review.evaluate((node) => node.scrollLeft),
    ).toBe(0);
    expect(
      await review.evaluate((node) => node.offsetWidth - node.clientWidth),
    ).toBe(0);
    expect(
      await modal.locator(".batch-body").evaluate((body) => body.scrollLeft),
    ).toBe(0);
    expect(
      await modal.evaluate((root) => {
        const body = root.querySelector(".batch-body");
        const bodyRect = body.getBoundingClientRect();
        if (getComputedStyle(body).overflowX === "visible") return true;
        return [".batch-summary-title", ".batch-selection-count"].every(
          (selector) => {
            const rect = root.querySelector(selector).getBoundingClientRect();
            return rect.left >= bodyRect.left && rect.right <= bodyRect.right;
          },
        );
      }),
    ).toBe(true);
    await expectBatchModalLayoutStable(page, modal);

    const stalePhoto = gallery.locator(".batch-photo-wrap:not([hidden])").first();
    await stalePhoto.evaluate((wrapper) => {
      wrapper.hidden = true;
      wrapper.classList.add("is-grouped");
      wrapper.setAttribute("aria-hidden", "true");
    });
    await gallery
      .locator(".batch-photo-wrap:not([hidden]) .batch-photo")
      .first()
      .click();
    await expect(stalePhoto).toBeVisible();

    await page.setViewportSize({ width: 390, height: 844 });
    await expect(gallery).toHaveClass(/is-sticky-row/);
    await expectBatchModalLayoutStable(page, modal);

    const remainingPhotos = gallery.locator(
      ".batch-photo-wrap:not([hidden]) .batch-photo",
    );
    for (let index = 0; index < (await remainingPhotos.count()); index += 1) {
      const photo = remainingPhotos.nth(index);
      if (!(await photo.evaluate((node) => node.classList.contains("selected")))) {
        await photo.click();
      }
    }
    await modal.locator(".batch-mark-group").click();
    await expect(gallery).not.toHaveClass(/is-sticky-row/);
    await expect(modal.locator(".organize-unsorted-badge")).toHaveText("All sorted");
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

  test("keeps batch grouping open after upload idle without refreshing fresh signed URLs", async ({
    page,
  }) => {
    await page.route("https://autolister.app/api/events/track", (route) =>
      route.fulfill({ status: 204, body: "" }),
    );

    await openContentHarness(
      page,
      { allowed: true, available: 10 },
      {
        emptyListing: true,
        shortenPhoneUploadPoll: true,
        shortenUploadIdleTimers: true,
      },
    );

    await page.evaluate(() => {
      const originalSendMessage = window.chrome.runtime.sendMessage;
      window.__batchListRequests = 0;
      window.chrome.runtime.sendMessage = (message, callback) => {
        if (message?.type === "PROXY_FETCH") {
          const url = String(message.url || "");
          if (url.includes("/api/phone-upload?sessionId=")) {
            if (url.includes("action=cleanup")) {
              setTimeout(() => callback?.({ ok: true, data: {} }), 0);
              return;
            }
            window.__batchListRequests += 1;
            const suffix = window.__batchListRequests === 1 ? "old" : "fresh";
            setTimeout(
              () =>
                callback?.({
                  ok: true,
                  data: {
                    files: [
                      {
                        name: "phone-1.jpg",
                        path: "session/phone-1.jpg",
                        url: `https://storage.test/${suffix}-phone-1.jpg`,
                      },
                      {
                        name: "phone-2.jpg",
                        path: "session/phone-2.jpg",
                        url: `https://storage.test/${suffix}-phone-2.jpg`,
                      },
                    ],
                    count: 2,
                    complete: true,
                  },
                }),
              0,
            );
            return;
          }
        }
        originalSendMessage(message, callback);
      };
    });

    await chooseBatchUpload(page);
    await expect(
      page.locator("#quickvint-batch-modal .batch-gallery .batch-photo"),
    ).toHaveCount(2);

    await page.waitForTimeout(100);
    await expect(page.locator("#quickvint-batch-modal")).toBeVisible();
    expect(
      await page.evaluate(() =>
        window.__extensionHarness.runtimeMessages.some(
          (message) =>
            message?.type === "PROXY_FETCH" &&
            String(message.url || "").includes("action=cleanup"),
        ),
      ),
    ).toBe(false);

    await page
      .locator("#quickvint-batch-modal .batch-gallery .batch-photo")
      .nth(0)
      .click();
    await page
      .locator("#quickvint-batch-modal .batch-gallery .batch-photo")
      .nth(1)
      .click();
    await page.locator("#quickvint-batch-modal .batch-mark-group").click();
    await expect(page.locator("#quickvint-batch-modal .batch-start")).toBeEnabled();
    await page.locator("#quickvint-batch-modal .batch-start").click();

    await expect
      .poll(() =>
        page.evaluate(() =>
          Boolean(
            window.__extensionHarness.runtimeMessages.find(
              (message) => message?.type === "START_BATCH_GENERATION",
            ),
          ),
        ),
      )
      .toBe(true);
    const batchStart = await page.evaluate(() =>
      window.__extensionHarness.runtimeMessages.find(
        (message) => message?.type === "START_BATCH_GENERATION",
      ),
    );
    expect(batchStart.groups[0].map((file) => file.url)).toEqual([
      "https://storage.test/old-phone-1.jpg",
      "https://storage.test/old-phone-2.jpg",
    ]);
    expect(await page.evaluate(() => window.__batchListRequests)).toBe(1);
  });

  test("refreshes stale batch signed URLs before start", async ({ page }) => {
    await page.route("https://autolister.app/api/events/track", (route) =>
      route.fulfill({ status: 204, body: "" }),
    );

    await openContentHarness(
      page,
      { allowed: true, available: 10 },
      {
        emptyListing: true,
        shortenPhoneUploadPoll: true,
        shortenUploadIdleTimers: true,
      },
    );

    await page.evaluate(() => {
      const originalSendMessage = window.chrome.runtime.sendMessage;
      const originalNow = Date.now.bind(Date);
      window.__batchFakeNow = originalNow();
      Date.now = () => window.__batchFakeNow;
      window.__batchListRequests = 0;
      window.chrome.runtime.sendMessage = (message, callback) => {
        if (message?.type === "PROXY_FETCH") {
          const url = String(message.url || "");
          if (url.includes("/api/phone-upload?sessionId=")) {
            if (url.includes("action=cleanup")) {
              setTimeout(() => callback?.({ ok: true, data: {} }), 0);
              return;
            }
            window.__batchListRequests += 1;
            const suffix = window.__batchListRequests === 1 ? "old" : "fresh";
            setTimeout(
              () =>
                callback?.({
                  ok: true,
                  data: {
                    files: [
                      {
                        name: "phone-1.jpg",
                        path: "session/phone-1.jpg",
                        url: `https://storage.test/${suffix}-phone-1.jpg`,
                      },
                      {
                        name: "phone-2.jpg",
                        path: "session/phone-2.jpg",
                        url: `https://storage.test/${suffix}-phone-2.jpg`,
                      },
                    ],
                    count: 2,
                    complete: true,
                  },
                }),
              0,
            );
            return;
          }
        }
        originalSendMessage(message, callback);
      };
    });

    await chooseBatchUpload(page);
    await expect(
      page.locator("#quickvint-batch-modal .batch-gallery .batch-photo"),
    ).toHaveCount(2);
    await page.waitForTimeout(100);
    await expect(page.locator("#quickvint-batch-modal")).toBeVisible();

    await page
      .locator("#quickvint-batch-modal .batch-gallery .batch-photo")
      .nth(0)
      .click();
    await page
      .locator("#quickvint-batch-modal .batch-gallery .batch-photo")
      .nth(1)
      .click();
    await page.locator("#quickvint-batch-modal .batch-mark-group").click();
    await page.evaluate(() => {
      window.__batchFakeNow += 46 * 60 * 1000;
    });
    await page.locator("#quickvint-batch-modal .batch-start").click();

    await expect
      .poll(() =>
        page.evaluate(() =>
          Boolean(
            window.__extensionHarness.runtimeMessages.find(
              (message) => message?.type === "START_BATCH_GENERATION",
            ),
          ),
        ),
      )
      .toBe(true);
    const batchStart = await page.evaluate(() =>
      window.__extensionHarness.runtimeMessages.find(
        (message) => message?.type === "START_BATCH_GENERATION",
      ),
    );
    expect(batchStart.groups[0].map((file) => file.url)).toEqual([
      "https://storage.test/fresh-phone-1.jpg",
      "https://storage.test/fresh-phone-2.jpg",
    ]);
    expect(await page.evaluate(() => window.__batchListRequests)).toBe(2);
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

  test("disables the generate button while manual photos are preparing", async ({
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
    await expect(page.locator("#quickvint-gen-btn")).toBeDisabled();
    await expect(page.locator("#quickvint-gen-btn .label")).toHaveText(
      "Preparing...",
    );
    await page.evaluate(() => document.getElementById("quickvint-gen-btn")?.click());
    expect(generateRequests).toBe(0);

    releaseUpload();
    await expect(page.locator("#quickvint-gen-btn")).toBeEnabled();
    await page.locator("#quickvint-gen-btn").click();
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

    await chooseSinglePhoneUpload(page);
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
    await setupReadyPhoneUploadWithDelayedThumbnails(page, requestBodies, 3);

    await chooseSinglePhoneUpload(page);
    await expect(page.locator("#quickvint-phone-modal .preview-thumb")).toHaveCount(3);
    await expect(page.locator("#quickvint-phone-modal .status")).toHaveText(
      "3 photos ready to generate.",
    );
    expect(await page.locator(".photo-box").count()).toBe(0);

    await page.locator("#quickvint-phone-modal .close-btn").click();
    await expect(page.locator("#quickvint-phone-modal")).toHaveCount(0);
    await page.waitForTimeout(3500);
    expect(
      await page.evaluate(() =>
        window.__extensionHarness.runtimeMessages.some(
          (message) =>
            message?.type === "PROXY_FETCH" &&
            String(message.url || "").includes("action=cleanup"),
        ),
      ),
    ).toBe(false);
    await page.locator("#quickvint-gen-btn").click();

    await expect.poll(() => requestBodies.length).toBe(1);
    expect(requestBodies[0].imageUrls).toEqual([
      "https://storage.test/phone-1.jpg",
      "https://storage.test/phone-2.jpg",
      "https://storage.test/phone-3.jpg",
    ]);
    expect(requestBodies[0].imageMetadata).toHaveLength(3);
    expect(requestBodies[0].imageMetadata[0]).toMatchObject({
      generationPayloadSource: "phone_upload_storage_url",
      capturedUploadSource: "phone_upload_single",
    });
    await expect
      .poll(() =>
        page.evaluate(() =>
          window.__extensionHarness.runtimeMessages.some(
            (message) =>
              message?.type === "PROXY_FETCH" &&
              String(message.url || "").includes("action=cleanup"),
          ),
        ),
      )
      .toBe(true);
    await expect(page.locator(".photo-box")).toHaveCount(3);
  });

  [
    {
      name: "close X",
      close: (page) => page.locator("#quickvint-phone-modal .close-x").click(),
    },
    {
      name: "outside click",
      close: (page) =>
        page.evaluate(() => {
          const modal = document.getElementById("quickvint-phone-modal");
          modal?.dispatchEvent(
            new MouseEvent("click", { bubbles: true, cancelable: true }),
          );
        }),
    },
  ].forEach(({ name, close }) => {
    test(`keeps ready phone-upload files after ${name}`, async ({ page }) => {
      const requestBodies = [];
      await setupReadyPhoneUploadWithDelayedThumbnails(page, requestBodies);

      await chooseSinglePhoneUpload(page);
      await expect(page.locator("#quickvint-phone-modal .preview-thumb")).toHaveCount(2);
      await expect(page.locator("#quickvint-phone-modal .status")).toHaveText(
        "2 photos ready to generate.",
      );

      await close(page);
      await expect(page.locator("#quickvint-phone-modal")).toHaveCount(0);
      await page.waitForTimeout(3500);
      expect(
        await page.evaluate(() =>
          window.__extensionHarness.runtimeMessages.some(
            (message) =>
              message?.type === "PROXY_FETCH" &&
              String(message.url || "").includes("action=cleanup"),
          ),
        ),
      ).toBe(false);

      await page.locator("#quickvint-gen-btn").click();
      await expect.poll(() => requestBodies.length).toBe(1);
      expect(requestBodies[0].imageUrls).toEqual([
        "https://storage.test/phone-1.jpg",
        "https://storage.test/phone-2.jpg",
      ]);
      expect(requestBodies[0].imageMetadata[0]).toMatchObject({
        generationPayloadSource: "phone_upload_storage_url",
        capturedUploadSource: "phone_upload_single",
      });
      await expect
        .poll(() =>
          page.evaluate(() =>
            window.__extensionHarness.runtimeMessages.some(
              (message) =>
                message?.type === "PROXY_FETCH" &&
                String(message.url || "").includes("action=cleanup"),
            ),
          ),
        )
        .toBe(true);
    });
  });

  test("disables generation while phone-upload downloads are still pending", async ({
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
            setTimeout(() => callback?.({ ok: true, data: dataUrl }), 1000);
            return;
          }
        }
        originalSendMessage(message, callback);
      };
    }, tinyPngDataUrl);

    await chooseSinglePhoneUpload(page);
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

    const generateButton = page.locator("#quickvint-gen-btn");
    await expect(generateButton).toBeDisabled();
    await expect(generateButton.locator(".label")).toHaveText("Preparing...");
    await page.evaluate(() => document.getElementById("quickvint-gen-btn")?.click());
    await expect.poll(() => generateRequests).toBe(0);

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
    expect(closePrompts).toEqual([
      "Stop receiving photos? Photos already added will stay.",
    ]);

    await page.locator("#quickvint-phone-modal .close-btn").click();
    await expect(page.locator("#quickvint-phone-modal")).toHaveCount(0);
    expect(closePrompts).toEqual([
      "Stop receiving photos? Photos already added will stay.",
      "Stop receiving photos? Photos already added will stay.",
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
    await expect(generateButton).toBeEnabled();
    await expect(generateButton.locator(".label")).toHaveText("Generate");

    await chooseSinglePhoneUpload(page);
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

    await chooseSinglePhoneUpload(page);
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
    await expect(page.locator("#quickvint-gen-btn")).toBeEnabled();
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

    await chooseSinglePhoneUpload(page);
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

    await chooseSinglePhoneUpload(page);
    await expect(page.locator("#quickvint-phone-modal .preview-thumb")).toHaveCount(2);
    await expect(page.locator("#quickvint-phone-modal .status")).toHaveText(
      "2 photos ready to generate.",
    );
    await page.locator("#quickvint-phone-modal .close-btn").click();
    await expect(page.locator("#quickvint-phone-modal")).toHaveCount(0);
    await expect(page.locator(".photo-box")).toHaveCount(0);

    await chooseSinglePhoneUpload(page);
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
    await expect
      .poll(() =>
        page.evaluate(() => {
          const sessions = window.__phoneSessions || [];
          const cleanupUrls = window.__extensionHarness.runtimeMessages
            .filter(
              (message) =>
                message?.type === "PROXY_FETCH" &&
                String(message.url || "").includes("action=cleanup"),
            )
            .map((message) => String(message.url || ""));
          return sessions.filter((sessionId) =>
            cleanupUrls.some((url) => url.includes(`sessionId=${sessionId}`)),
          ).length;
        }),
      )
      .toBe(2);

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

    await expect(page.locator("#quickvint-upload-choice-modal")).toHaveCount(0);
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

  test("shows a soft Pro upsell after Starter users close the daily-limit paywall", async ({
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
    await expect(offer).toContainText("Your limit resets tomorrow");
    await expect(offer).toContainText("Pro gives you 25/day and 250/month");
    await expect(offer).toContainText("Upgrade to Pro");
    await expect(offer).not.toContainText("LISTFASTER20");
    await offer.locator(".quickvint-limit-primary").click();

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
          source: "extension_limit_followup_offer",
        },
      ]);
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
    await expect(offer).toContainText("Your limit resets tomorrow");
    await expect(offer).not.toContainText("LISTFASTER20");

    await offer.locator(".quickvint-limit-close").click();
    await expect(offer).toHaveCount(0);
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            window.__extensionHarness.storage[
              "quickvintOfferDismissed:test-user:starter_daily_pro_offer_v1"
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
