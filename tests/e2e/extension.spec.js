const fs = require("node:fs");
const path = require("node:path");
const { test, expect, chromium } = require("@playwright/test");

const extensionPath = process.env.AUTOLISTER_EXTENSION_PATH
  ? path.resolve(process.env.AUTOLISTER_EXTENSION_PATH)
  : path.resolve(__dirname, "../..");
const languageDefaultsPath = path.join(extensionPath, "language-defaults.js");
const qrCodePath = path.join(extensionPath, "lib/qrcode.min.js");
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

function wardrobeItemFixture({ id, status = "", title = `Item ${id}` }) {
  return `<div data-testid="grid-item">
    <div data-testid="product-item-id-${id}">
      <div class="new-item-box__image-container">
        <div data-testid="product-item-id-${id}--image">
          <img data-testid="product-item-id-${id}--image--img" alt="${title}" src="https://images1.vinted.net/${id}.webp">
        </div>
        <a data-testid="product-item-id-${id}--overlay-link" href="/items/${id}"></a>
        ${status ? `<div data-testid="product-item-id-${id}--status"><p data-testid="product-item-id-${id}--status-text">${status}</p></div>` : ""}
      </div>
    </div>
  </div>`;
}

function loadedWardrobeProfileFixture(items) {
  return `<!doctype html>
    <html><head><style>
      [data-testid="feed-grid"] { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
      .new-item-box__image-container { position: relative; }
      [data-testid$="--image"] { display: block; height: 180px; }
      [data-testid$="--image"] img { width: 100%; height: 100%; object-fit: cover; }
      [data-testid$="--overlay-link"] { position: absolute; inset: 0; }
    </style></head><body>
      <header><a href="/member/270830120">seller</a></header>
      <main>
        <div class="u-flex-grow">
          <div><h1 data-testid="profile-username">seller</h1></div>
          <div class="web_ui__Cell__cell"><div class="web_ui__Cell__content"><div data-testid="profile-location-info">Rotterdam</div></div></div>
        </div>
        <div data-testid="feed-grid">${items}<div data-testid="infinite-scroll"></div></div>
      </main>
    </body></html>`;
}

function loadedWardrobeEditFixture(itemId) {
  return listingFixture
    .replace(
      '<input data-testid="title--input" />',
      `<input data-testid="title--input" value="Original title ${itemId}" />`,
    )
    .replace(
      '<textarea data-testid="description--input"></textarea>',
      `<textarea data-testid="description--input">Original description ${itemId}</textarea>`,
    )
    .replace(
      "</body>",
      `<button type="button" aria-label="Vinted Save" onclick="window.__quickvintSaveClicks += 1">Save</button>
      <script>
        window.__quickvintSaveClicks = 0;
        window.__quickvintPhotoChanges = 0;
        document.querySelector('[data-testid="add-photos-input"]').addEventListener("change", () => window.__quickvintPhotoChanges += 1);
      </script></body>`,
    );
}

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
    const storageListeners = [];
    const openedWindows = [];

    window.__extensionHarness = {
      storage,
      runtimeMessages,
      runtimeListeners,
      storageListeners,
      openedWindows,
    };
    window.__AUTOLISTER_TEST_HOOKS__ = {};

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
            response = currentCapacity?.runtimeError
              ? {
                  ok: false,
                  status: currentCapacity.runtimeStatus,
                  error: currentCapacity.runtimeError,
                }
              : { ok: true, capacity: currentCapacity };
          } else if (message?.type === "START_WARDROBE_REWRITE") {
            response = storage.__startWardrobeResponse || { ok: true };
          } else if (message?.type === "QUICKVINT_TAB_JOB_HEARTBEAT") {
            response = storage.__tabJobHeartbeatResponse || { ok: true, active: true };
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

          setTimeout(
            () => callback?.(response),
            message?.type === "GET_BATCH_CAPACITY"
              ? Math.max(0, Number(currentCapacity?.delayMs || 0))
              : message?.type === "START_WARDROBE_REWRITE"
                ? Math.max(0, Number(storage.__startWardrobeDelayMs || 0))
                : 0,
          );
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
            const changes = Object.fromEntries(
              Object.entries(values).map(([key, newValue]) => [
                key,
                { oldValue: storage[key], newValue },
              ]),
            );
            Object.assign(storage, values);
            setTimeout(() => {
              storageListeners.forEach((listener) => listener(changes, "local"));
              callback?.();
            }, 0);
            return Promise.resolve();
          },
        },
        onChanged: { addListener: (listener) => storageListeners.push(listener) },
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
  if (options.pageUrl) {
    await page.route(options.pageUrl, (route) =>
      route.fulfill({ status: 200, contentType: "text/html", body: listingFixture }),
    );
    await page.goto(options.pageUrl, { waitUntil: "domcontentloaded" });
  } else {
    await page.setContent(listingFixture, { waitUntil: "domcontentloaded" });
  }
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
  if (options.domCanaryConfig) {
    await page.evaluate((config) => {
      globalThis.QUICKVINT_DOM_CANARY = config;
    }, options.domCanaryConfig);
  }
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
  await page.addScriptTag({ path: qrCodePath });
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

async function openWardrobeEditHarness(page, itemId = "42", options = {}) {
  const url = `https://www.vinted.nl/items/${itemId}/edit`;
  await page.route(url, (route) =>
    route.fulfill({ status: 200, contentType: "text/html", body: listingFixture }),
  );
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await installChromeHarness(page, options.capacityResponse || null, options.initialStorage || {});
  if (options.shortenWardrobeTimers) {
    await page.evaluate(() => {
      const originalSetTimeout = window.setTimeout.bind(window);
      const originalSetInterval = window.setInterval.bind(window);
      window.setTimeout = (callback, delay, ...args) =>
        originalSetTimeout(callback, delay === 5 * 60 * 1000 ? 200 : delay, ...args);
      window.setInterval = (callback, delay, ...args) =>
        originalSetInterval(callback, delay === 20 * 1000 ? 25 : delay, ...args);
    });
  }
  await page.addScriptTag({ path: languageDefaultsPath });
  await page.addScriptTag({ path: contentScriptPath });
  await expect(page.locator("#quickvint-gen-btn")).toBeVisible();
}

function sendContentMessage(page, message) {
  return page.evaluate(
    (payload) =>
      new Promise((resolve) => {
        const listener = window.__extensionHarness.runtimeListeners.find(
          (candidate) => typeof candidate === "function",
        );
        listener(payload, {}, resolve);
      }),
    message,
  );
}

async function openWardrobeHarness(
  page,
  {
    profileId = "270830120",
    currentUserId = "270830120",
    login = false,
    follow = false,
    collapsed = false,
    extraBadges = false,
    capacityResponse = { allowed: true, available: 12 },
    signedIn = true,
    wardrobeItems = null,
    initialStorage = {},
  } = {},
) {
  const state = currentUserId
    ? `initialUserState\\\":{\\\"user\\\":{\\\"id\\\":${currentUserId}}}`
    : "initialUserState\\\":{\\\"user\\\":null}";
  const profileUrl = `https://www.vinted.nl/member/${profileId}`;
  await page.route(profileUrl, (route) =>
    route.fulfill({
      status: 200,
      contentType: "text/html",
      body: `<!doctype html>
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <style>
              * { box-sizing: border-box; }
              body { margin: 0; font-family: Arial, sans-serif; color: #292929; }
              header { height: 98px; border-bottom: 1px solid #e5e7eb; }
              .profile-page { width: min(1200px, calc(100% - 32px)); margin: 40px auto; }
              .profile-row { display: flex; gap: 16px; }
              .avatar { flex: 0 0 192px; height: 192px; border-radius: 50%; background: #d8e7e5; }
              .u-flex-grow { flex: 1; min-width: 0; }
              .web_ui__Cell__cell { padding: 16px; }
              .profile-heading { min-height: 68px; }
              .profile-details { min-height: 140px; }
              .details-columns { display: flex; gap: 64px; line-height: 1.8; }
              .badges { margin-top: 8px; }
              .bio { min-height: 72px; }
              [data-testid="profile-info-follow-button"] { float: right; }
              .tabs { margin-top: 16px; padding: 16px; border-bottom: 1px solid #e5e7eb; }
              [data-testid="feed-grid"] { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
              .new-item-box__image-container { position: relative; }
              [data-testid$="--image"] { display: block; height: 180px; background: #e5e7eb; }
              [data-testid$="--image"] img { width: 100%; height: 100%; object-fit: cover; }
              [data-testid$="--overlay-link"] { position: absolute; inset: 0; }
              @media (max-width: 720px) {
                .avatar { flex-basis: 192px; height: 192px; }
                .profile-row { gap: 8px; }
                .profile-page { width: 582px; margin: 20px 0 0 10px; }
                .details-columns { display: block; }
              }
            </style>
            <script type="application/json" data-vinted-state>${state}</script>
          </head>
          <body>
            <header>
              ${login ? '<a data-testid="header--login-button" href="/member/login">Log in</a>' : ""}
            </header>
            <main class="profile-page">
              <div class="profile-row">
                <div class="avatar"></div>
                <div class="u-flex-grow">
                  <div class="web_ui__Cell__cell profile-heading">
                    <h1 data-testid="profile-username">seller</h1>
                    ${follow ? '<button data-testid="profile-info-follow-button">Follow</button>' : ""}
                  </div>
                  <div class="web_ui__Cell__cell profile-details">
                    <div class="web_ui__Cell__content">
                      <div class="details-columns">
                        <div class="web_ui__Cell__cell detail-location-cell">
                          <div data-testid="profile-location-info">Rotterdam, Nederland</div>
                        </div>
                        <div>Google verified<br />Email verified</div>
                      </div>
                      ${extraBadges ? '<div class="badges">Professional seller · Frequent uploader · Trusted member</div>' : ""}
                    </div>
                  </div>
                  <div class="web_ui__Cell__cell bio">Long seller biography remains readable below the profile details.</div>
                </div>
              </div>
              <div class="tabs">Listings &nbsp;&nbsp; Reviews</div>
              ${wardrobeItems ? `<div data-testid="feed-grid">${wardrobeItems}<div data-testid="infinite-scroll"></div></div>` : ""}
            </main>
          </body>
        </html>`,
    }),
  );
  await page.goto(profileUrl, { waitUntil: "domcontentloaded" });
  await installChromeHarness(page, capacityResponse, {
    quickvintWardrobeRewriteCollapsed: collapsed,
    ...(signedIn
      ? { supabaseSession: { access_token: "token" } }
      : { supabaseSession: null }),
    ...initialStorage,
  });
  await page.addScriptTag({ path: languageDefaultsPath });
  await page.addScriptTag({ path: contentScriptPath });
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

async function waitForWardrobeMotionToFinish(page) {
  const widget = page.locator("#quickvint-wardrobe-rewrite-widget");
  await expect(widget).toBeVisible();
  await expect(widget).not.toHaveClass(/is-animating/);
  await expect
    .poll(() =>
      widget.evaluate((element) =>
        element
          .getAnimations({ subtree: true })
          .every((animation) => animation.playState !== "running"),
      ),
    )
    .toBe(true);
}

async function enterWardrobeSelection(page, mode = "review") {
  await page.locator(".quickvint-wardrobe-rewrite-cta").click();
  await page.getByLabel(mode === "review" ? "Review first" : "Replace immediately").check();
  await page.locator(".quickvint-wardrobe-rewrite-continue").click();
  await expect(page.locator(".quickvint-wardrobe-selection-controller")).toBeVisible();
}

async function expectWardrobeSelectionControlsDisabled(page, disabled) {
  const controls = [
    ...(await page.locator(".quickvint-wardrobe-select-item").all()),
    page.getByLabel("Title language"),
    page.getByLabel("Description language"),
    page.getByRole("button", { name: "Start rewrite" }),
    page.getByRole("button", { name: "Cancel" }),
    page.getByRole("button", { name: "Exit selection" }),
  ];
  for (const control of controls) {
    if (disabled) await expect(control).toBeDisabled();
    else await expect(control).toBeEnabled();
  }
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
      const viewportInset = viewportWidth <= 680 ? 0 : 14;
      const contentRect = content.getBoundingClientRect();
      const galleryRect = gallery.getBoundingClientRect();
      const actionsRect = actions.getBoundingClientRect();
      return {
        panelIsConstrained:
          contentRect.width <= viewportWidth - viewportInset &&
          contentRect.height <= viewportHeight - viewportInset,
        galleryVisible:
          galleryRect.width > 0 &&
          galleryRect.height >= 44 &&
          galleryRect.bottom > contentRect.top &&
          galleryRect.top < actionsRect.top,
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
  test("daily DOM canary reports every required listing control", async ({ page }) => {
    const payloads = [];
    await page.route("https://autolister.app/api/dom-canary", async (route) => {
      payloads.push(route.request().postDataJSON());
      await route.fulfill({ status: 202, contentType: "application/json", body: "{}" });
    });
    await openContentHarness(page, null, {
      pageUrl: "https://www.vinted.nl/items/new",
      fieldTitleNodes: true,
      domCanaryConfig: { enabled: true, secret: "test-secret" },
    });

    await expect.poll(() => payloads.length).toBe(1);
    expect(payloads[0]).toMatchObject({
      status: "passed",
      path: "/items/new",
      result: {
        dom: {
          title: true,
          description: true,
          fileInput: true,
          generateButton: true,
          signInButton: true,
          phoneButton: true,
          titleLanguage: true,
          descriptionLanguage: true,
          tools: true,
        },
      },
    });
  });

  test("daily DOM canary does not pass with missing language controls", async ({ page }) => {
    const payloads = [];
    await page.route("https://autolister.app/api/dom-canary", async (route) => {
      payloads.push(route.request().postDataJSON());
      await route.fulfill({ status: 202, contentType: "application/json", body: "{}" });
    });
    await openContentHarness(page, null, {
      pageUrl: "https://www.vinted.nl/items/new",
      domCanaryConfig: { enabled: true, secret: "test-secret" },
    });

    await page.waitForTimeout(300);
    expect(payloads).toHaveLength(0);
  });

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
    expect(
      await page
        .locator("#quickvint-batch-modal .batch-content")
        .evaluate((element) => element.getBoundingClientRect().height),
    ).toBeGreaterThanOrEqual(820);
    const footerGap = await page
      .locator("#quickvint-batch-modal")
      .evaluate((modal) => {
        const content = modal.querySelector(".batch-content").getBoundingClientRect();
        const actions = modal.querySelector(".batch-actions").getBoundingClientRect();
        return Math.round(content.bottom - actions.bottom);
      });
    expect(footerGap).toBeGreaterThanOrEqual(0);
    expect(footerGap).toBeLessThanOrEqual(16);
    await expectInsideViewport(page, "#quickvint-batch-modal .batch-actions");
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

  test("keeps a tall stable batch frame through every phase", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await openContentHarness(page, { allowed: true, available: 20 }, {
      emptyListing: true,
    });
    await chooseBatchUpload(page);

    const modal = page.locator("#quickvint-batch-modal");
    const measureFrame = () =>
      modal.evaluate((root) => {
        const content = root.querySelector(".batch-content").getBoundingClientRect();
        const body = root.querySelector(".batch-body").getBoundingClientRect();
        const actions = root.querySelector(".batch-actions").getBoundingClientRect();
        const review = root.querySelector(".batch-review")?.getBoundingClientRect();
        return {
          width: Math.round(content.width),
          height: Math.round(content.height),
          bodyHeight: Math.round(body.height),
          reviewHeight: Math.round(review?.height || 0),
          footerGap: Math.round(content.bottom - actions.bottom),
        };
      });

    const sourceFrame = await measureFrame();
    expect(sourceFrame.height).toBeGreaterThanOrEqual(760);
    expect(sourceFrame.bodyHeight).toBeGreaterThanOrEqual(680);
    expect(Math.abs(sourceFrame.footerGap)).toBeLessThanOrEqual(1);
    const sourceGeometry = await modal.evaluate((root) => {
      const panels = Array.from(root.querySelectorAll(".batch-source-panel"));
      return {
        panelHeights: panels.map((panel) =>
          Math.round(panel.getBoundingClientRect().height),
        ),
        dropzoneHeight: Math.round(
          root.querySelector(".batch-computer-dropzone").getBoundingClientRect().height,
        ),
      };
    });
    expect(Math.max(...sourceGeometry.panelHeights)).toBeLessThanOrEqual(430);
    expect(sourceGeometry.dropzoneHeight).toBeLessThanOrEqual(270);

    await setupReadyPhoneUploadWithDelayedThumbnails(
      page,
      [],
      15,
      { allowed: true, available: 20 },
    );
    await chooseBatchUpload(page);
    await expect(modal.locator(".batch-title")).toHaveText("Organize items");

    const organizingFrame = await measureFrame();
    expect(Math.abs(organizingFrame.width - sourceFrame.width)).toBeLessThanOrEqual(1);
    expect(Math.abs(organizingFrame.height - sourceFrame.height)).toBeLessThanOrEqual(1);
    expect(organizingFrame.reviewHeight).toBeGreaterThanOrEqual(520);
    expect(Math.abs(organizingFrame.footerGap)).toBeLessThanOrEqual(1);

    const photos = modal.locator(".batch-gallery-grid .batch-photo");
    await expect(photos).toHaveCount(15);
    for (let index = 0; index < 15; index += 1) await photos.nth(index).click();
    await modal.locator(".batch-mark-group").click();
    await modal.locator(".batch-start").click();
    await expect(modal).toHaveClass(/generating/);

    const generatingFrame = await measureFrame();
    expect(Math.abs(generatingFrame.width - sourceFrame.width)).toBeLessThanOrEqual(1);
    expect(Math.abs(generatingFrame.height - sourceFrame.height)).toBeLessThanOrEqual(1);
    expect(Math.abs(generatingFrame.footerGap)).toBeLessThanOrEqual(1);

    await page.setViewportSize({ width: 390, height: 844 });
    await expectInsideViewport(page, "#quickvint-batch-modal .batch-content");
    await expectInsideViewport(page, "#quickvint-batch-modal .batch-actions");
    expect((await measureFrame()).height).toBeGreaterThanOrEqual(820);
  });

  test("keeps compact source controls reachable in a short desktop window", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 900, height: 480 });
    await openContentHarness(page, { allowed: true, available: 10 }, {
      emptyListing: true,
    });
    await chooseBatchUpload(page);

    const modal = page.locator("#quickvint-batch-modal");
    const sourceGrid = modal.locator(".batch-source-grid");
    await expectInsideViewport(page, "#quickvint-batch-modal .batch-content");
    expect(
      await sourceGrid.evaluate((grid) => ({
        overflowY: getComputedStyle(grid).overflowY,
        canScroll: grid.scrollHeight > grid.clientHeight,
      })),
    ).toEqual({ overflowY: "auto", canScroll: true });

    await sourceGrid.evaluate((grid) => {
      grid.scrollTop = grid.scrollHeight;
    });
    await expectInsideViewport(page, "#quickvint-batch-modal .batch-choose-files");
    await expectInsideViewport(page, "#quickvint-batch-modal .batch-choose-folder");
    await expectInsideViewport(page, "#quickvint-batch-modal .batch-actions");
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
      "Expires after 1 hour idle.",
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
          .evaluate((button) => Math.round(button.getBoundingClientRect().height)),
      ).toBeGreaterThanOrEqual(44);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await expectInsideViewport(page, "#quickvint-batch-modal .batch-content");
    await expectInsideViewport(page, "#quickvint-batch-modal .batch-source-phone");
    await expectInsideViewport(page, "#quickvint-batch-modal .batch-source-computer");
    await expectNoHorizontalOverflow(page);
  });

  test("renders phone QR locally in single and batch flows", async ({ page }) => {
    const externalQrRequests = [];
    page.on("request", (request) => {
      if (new URL(request.url()).hostname === "api.qrserver.com") {
        externalQrRequests.push(request.url());
      }
    });
    await openContentHarness(page, { allowed: true, available: 10 }, {
      emptyListing: true,
    });

    await chooseSinglePhoneUpload(page);
    await expect(page.locator("#quickvint-phone-modal #qr-code")).toHaveAttribute(
      "src",
      /^data:image\//,
    );
    await expect(page.locator("#quickvint-phone-modal .instruction")).toHaveText(
      "Expires after 1 hour idle.",
    );
    await page.locator("#quickvint-phone-modal .close-x").click();

    await chooseBatchUpload(page);
    await expect(page.locator("#quickvint-batch-modal .batch-qr img")).toHaveAttribute(
      "src",
      /^data:image\//,
    );
    await expect(
      page.locator("#quickvint-batch-modal .batch-wait-copy"),
    ).toHaveText("Expires after 1 hour idle.");
    expect(externalQrRequests).toEqual([]);
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
                  expectedCount: 2,
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
    await expect(modal.locator(".batch-source-grid")).toHaveCount(0);
    await expect(modal.locator(".batch-phone-receiving")).toBeVisible();
    await expect(modal.locator(".batch-wait-title")).toContainText(
      "Receiving 1 photo",
    );
    await expect(modal.locator(".batch-wait-copy")).toHaveText(
      "Keep the phone page open.",
    );
    await expect(modal.locator(".batch-choose-files")).toHaveCount(0);
    const loader = modal.locator(".quickvint-treadmill");
    const loaderBox = await loader.boundingBox();
    expect(loaderBox.width).toBeGreaterThanOrEqual(75);
    expect(loaderBox.width).toBeLessThanOrEqual(77);
    expect(loaderBox.height).toBeGreaterThanOrEqual(44);
    expect(loaderBox.height).toBeLessThanOrEqual(46);
    expect(
      await loader.locator(".quickvint-treadmill-cube").evaluate((cube) => [
        getComputedStyle(cube).animationName,
        getComputedStyle(cube, "::after").animationName,
      ]),
    ).toEqual(["quickvintTreadmillMove", "quickvintTreadmillMorph"]);

    await page.evaluate(() => {
      const staleNow = Date.now() + 16000;
      Date.now = () => staleNow;
    });
    await expect(modal.locator(".batch-wait-title")).toContainText("Check phone");
    await expect(modal.locator(".batch-wait-copy")).toHaveText(
      "Reopen the phone page, then leave it visible.",
    );
    expect(
      await loader.locator(".quickvint-treadmill-cube").evaluate((cube) => [
        getComputedStyle(cube).animationPlayState,
        getComputedStyle(cube, "::after").animationPlayState,
      ]),
    ).toEqual(["paused", "paused"]);
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

  test("keeps the batch source header free of availability copy", async ({
    page,
  }) => {
    await openContentHarness(page, { allowed: true, available: 12 }, {
      emptyListing: true,
    });

    const chooser = await openPhoneChoice(page);
    await chooser.locator(".quickvint-upload-choice-multiple").click();
    const batch = page.locator("#quickvint-batch-modal");

    await expect(batch.locator(".batch-availability")).toHaveCount(0);
    await expect(batch).not.toContainText("12 listings available");
    expect(await getCapacityRequestCount(page)).toBe(1);
    await expect(batch).not.toContainText(/daily|monthly|extra credit/i);
  });

  test("keeps sufficient capacity hidden while organizing a batch", async ({ page }) => {
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

    await expect(batch.locator(".batch-availability")).toHaveCount(0);
    await expect(batch.locator(".batch-capacity-note")).toBeHidden();
    await expect(batch).not.toContainText(/Using \d+ of \d+ available/);
  });

  test("capacity discard warning is explicit before limited generation", async ({
    page,
  }) => {
    await setupReadyPhoneUploadWithDelayedThumbnails(page, [], 3, [
      { allowed: true, available: 12 },
      { allowed: true, available: 2 },
      { allowed: true, available: 2 },
    ]);

    await chooseBatchUpload(page);
    const batch = page.locator("#quickvint-batch-modal");
    const gallery = batch.locator(".batch-gallery");
    await expect(gallery.locator(".batch-photo")).toHaveCount(3);
    await expect(batch.locator(".batch-availability")).toHaveCount(0);

    for (const key of ["phone-1.jpg", "phone-2.jpg", "phone-3.jpg"]) {
      await gallery.locator(`.batch-photo[data-photo-key="${key}"]`).click();
      await batch.locator(".batch-mark-group").click();
    }

    await expect(batch.locator(".batch-capacity-note")).toContainText(
      "You can generate 2 of 3 listings. Only the first 2 will be generated. The remaining 1 group will not be saved.",
    );
    await expect(batch.locator(".batch-start")).toHaveText(
      "Generate first 2 of 3",
    );

    const confirmation = new Promise((resolve) => {
      page.once("dialog", async (dialog) => {
        resolve(dialog.message());
        await dialog.dismiss();
      });
    });
    await batch.locator(".batch-start").click();
    await expect(confirmation).resolves.toBe(
      "You can generate 2 of 3 listings. Only the first 2 will be generated. The remaining 1 group will not be saved.",
    );
    await expect(batch.locator(".batch-gallery")).toBeVisible();
  });

  for (const [mode, selector, destination] of [
    ["single", ".quickvint-upload-choice-single", "#quickvint-phone-modal"],
    ["batch", ".quickvint-upload-choice-multiple", "#quickvint-batch-modal"],
  ]) {
    test(`keeps the chooser visible while starting ${mode} phone upload`, async ({
      page,
    }) => {
      await openContentHarness(page, { allowed: true, available: 10 });
      await page.evaluate(() => {
        const originalSendMessage = window.chrome.runtime.sendMessage;
        window.chrome.runtime.sendMessage = (message, callback) => {
          if (message?.type === "PROXY_FETCH") {
            const url = new URL(message.url);
            if (url.searchParams.get("action") === "open") {
              window.__releasePhoneOpen = () =>
                callback?.({ ok: true, status: 201, data: { status: "open" } });
              return;
            }
          }
          originalSendMessage(message, callback);
        };
      });

      const modal = await openPhoneChoice(page);
      expect(await getCapacityRequestCount(page)).toBe(1);

      await modal.locator(selector).click();
      await expect(modal).toBeVisible();
      await expect(modal).toHaveClass(/is-pending/);
      await expect(
        modal.locator(".quickvint-upload-choice-pending"),
      ).toContainText(
        mode === "batch" ? "Starting batch upload…" : "Starting phone upload…",
      );
      await expect(
        modal.locator(".quickvint-upload-choice-option:disabled"),
      ).toHaveCount(2);
      await expect(page.locator(destination)).toHaveCount(0);

      await page.evaluate(() => window.__releasePhoneOpen());
      await expect(page.locator(destination)).toBeVisible();
      await expect(page.locator("#quickvint-upload-choice-modal")).toHaveCount(0);
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
        "lib/qrcode.min.js",
        "content.js",
      ]);
      expect(manifest.host_permissions).toContain("https://autolister.app/*");
    } finally {
      await context.close();
    }
  });

  test("rewrites selected wardrobe listings through the loaded MV3 extension", async () => {
    test.setTimeout(90_000);
    const { context, serviceWorker } = await loadExtension();
    const source = await context.newPage();
    const generatedRequests = [];
    let releaseFirstGeneration;
    const firstGeneration = new Promise((resolve) => {
      releaseFirstGeneration = resolve;
    });
    const itemIds = ["9443601541", "7563307251"];
    try {
      await serviceWorker.evaluate(() =>
        chrome.storage.local.set({
          supabaseSession: {
            access_token: "test-access-token",
            refresh_token: "test-refresh-token",
            expires_at: Math.floor(Date.now() / 1000) + 3600,
            user: { id: "270830120", email: "seller@example.com" },
          },
          userProfile: {
            subscription_status: "active",
            subscription_tier: "pro",
          },
          selectedLanguage: "en",
          selectedTitleLanguage: "en",
          selectedDescriptionLanguage: "nl",
          tone: "standard",
          useBulletPoints: true,
          descriptionLength: "long",
          useHashtags: true,
        }),
      );
      await serviceWorker.evaluate(() => {
        const sendMessage = chrome.tabs.sendMessage.bind(chrome.tabs);
        globalThis.__wardrobeIntegrationMessages = [];
        globalThis.__tabJobHeartbeatCount = 0;
        chrome.runtime.onMessage.addListener((message) => {
          if (message?.type === "QUICKVINT_TAB_JOB_HEARTBEAT") {
            globalThis.__tabJobHeartbeatCount += 1;
          }
        });
        chrome.tabs.sendMessage = (...args) => {
          globalThis.__wardrobeIntegrationMessages.push(args[1]?.type || "");
          return sendMessage(...args);
        };
      });
      await serviceWorker.evaluate(() => {
        // Test-only: extension-created tabs bypass Playwright routing, so duplicate the
        // routed source tab before navigating it to the worker-requested edit URL.
        chrome.tabs.create = (details, callback) => {
          chrome.tabs.query(
            { url: "https://www.vinted.com/member/270830120" },
            ([sourceTab]) => {
              if (!sourceTab?.id) return callback?.();
              chrome.tabs.duplicate(sourceTab.id, (tab) =>
                chrome.tabs.update(tab.id, details, callback),
              );
            },
          );
        };
      });
      await context.route("https://www.vinted.com/**", (route) => {
        const url = new URL(route.request().url());
        const itemId = url.pathname.match(/^\/items\/(\d+)\/edit$/)?.[1];
        return route.fulfill({
          status: 200,
          contentType: "text/html",
          body: itemId
            ? loadedWardrobeEditFixture(itemId)
            : loadedWardrobeProfileFixture(
              itemIds.map((id) => wardrobeItemFixture({ id })).join(""),
            ),
        });
      });
      await context.route("https://autolister.app/api/user/batch-capacity", (route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ allowed: true, available: 2 }),
        }),
      );
      await context.route("https://autolister.app/api/events/track", (route) =>
        route.fulfill({ status: 204, body: "" }),
      );
      await context.route("https://autolister.app/api/generate", async (route) => {
        generatedRequests.push(route.request().postDataJSON());
        if (generatedRequests.length === 1) await firstGeneration;
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            title: `Generated title ${generatedRequests.length}`,
            description: `Generated description ${generatedRequests.length}`,
          }),
        });
      });

      await source.goto("https://www.vinted.com/member/270830120", {
        waitUntil: "domcontentloaded",
      });
      await expect(source.locator(".quickvint-wardrobe-rewrite-cta")).toBeVisible();
      await source.locator(".quickvint-wardrobe-rewrite-cta").click();
      await source.getByLabel("Review first").check();
      await source.locator(".quickvint-wardrobe-rewrite-continue").click();
      for (const itemId of itemIds) {
        await source.getByRole("button", { name: `Select Item ${itemId}` }).click();
      }
      await source.getByRole("button", { name: "Start rewrite" }).click();

      await expect.poll(() => generatedRequests.length).toBe(1);
      await expect.poll(() => context.pages().filter((page) => /\/items\/\d+\/edit$/.test(page.url())).length).toBe(1);
      expect(context.pages().filter((page) => /\/items\/\d+\/edit$/.test(page.url()))).toHaveLength(1);
      expect(
        await serviceWorker.evaluate(() =>
          globalThis.__wardrobeIntegrationMessages.filter(
            (type) => type === "RUN_WARDROBE_REWRITE_ITEM",
          ).length,
        ),
      ).toBe(1);

      await source.waitForTimeout(31_000);
      expect(
        await serviceWorker.evaluate(() => globalThis.__tabJobHeartbeatCount),
      ).toBeGreaterThan(0);

      releaseFirstGeneration();
      await expect.poll(() => generatedRequests.length).toBe(2);
      await expect.poll(() => context.pages().filter((page) => /\/items\/\d+\/edit$/.test(page.url())).length).toBe(2);
      await expect(source.locator(".quickvint-wardrobe-selection-feedback")).toHaveText(
        "2 listings ready",
      );

      const workPages = context.pages().filter((page) => /\/items\/\d+\/edit$/.test(page.url()));
      for (const workPage of workPages) {
        const itemId = workPage.url().match(/\/items\/(\d+)\/edit$/)?.[1];
        await expect(workPage.locator('[data-testid="title--input"]')).toHaveValue(
          `Original title ${itemId}`,
        );
        await expect(workPage.locator('[data-testid="description--input"]')).toHaveValue(
          `Original description ${itemId}`,
        );
        await expect(workPage.locator(".quickvint-wardrobe-review-card")).toHaveCount(2);
        await expect(workPage.locator("#quickvint-batch-modal")).toHaveCount(0);
        expect(
          await workPage.evaluate(() => ({
            saveClicks: window.__quickvintSaveClicks,
            photoChanges: window.__quickvintPhotoChanges,
            fileCount: document.querySelector('[data-testid="add-photos-input"]').files.length,
          })),
        ).toEqual({ saveClicks: 0, photoChanges: 0, fileCount: 0 });
      }
      await expect(source.locator("#quickvint-batch-modal")).toHaveCount(0);
      expect(generatedRequests).toHaveLength(2);
      expect(
        await serviceWorker.evaluate(() => globalThis.__wardrobeIntegrationMessages),
      ).not.toContain("RUN_BATCH_ITEM");
    } finally {
      releaseFirstGeneration?.();
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
        if (url.searchParams.get("action") === "open") {
          return route.fulfill({
            status: 201,
            contentType: "application/json",
            body: JSON.stringify({ success: true, v: 2, status: "open" }),
          });
        }
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
      const phoneGenerateButton = page.locator(
        "#quickvint-phone-modal .generate-btn",
      );
      await expect(phoneGenerateButton.locator(".label")).toHaveText("Generating");
      await expect(phoneGenerateButton.locator(".quickvint-mirage")).toBeVisible();
      await expect(phoneGenerateButton.locator(".icon")).toBeHidden();
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
    let capacityRequests = 0;
    let releaseBatchCapacity;
    const batchCapacityMayFinish = new Promise((resolve) => {
      releaseBatchCapacity = resolve;
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
      await context.route("https://autolister.app/api/user/batch-capacity", async (route) => {
        capacityRequests += 1;
        if (capacityRequests > 2) await batchCapacityMayFinish;
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ allowed: true, available: 10 }),
        });
      });
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
      const batchStartButton = page.locator(
        "#quickvint-batch-modal .batch-start",
      );
      await expect(batchStartButton).toBeEnabled();
      await batchStartButton.click();
      await expect(batchStartButton.locator(".label")).toHaveText("Starting");
      await expect(batchStartButton.locator(".quickvint-mirage")).toBeVisible();
      releaseBatchCapacity();

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
      expect(listRequests).toBeGreaterThanOrEqual(1);
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
    let releaseGenerate;
    const generateMayFinish = new Promise((resolve) => {
      releaseGenerate = resolve;
    });
    await page.route("https://autolister.app/api/events/track", (route) => {
      eventBatches.push(route.request().postDataJSON());
      return route.fulfill({
        status: 204,
        body: "",
      });
    });
    await page.route("https://autolister.app/api/generate", async (route) => {
      requestBodies.push(route.request().postDataJSON());
      await generateMayFinish;
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
    const generateButton = page.locator("#quickvint-gen-btn");
    const idleBounds = await generateButton.boundingBox();
    await generateButton.click();
    await expect(generateButton.locator(".label")).toHaveText("Generating");
    await expect(generateButton.locator(".quickvint-mirage")).toBeVisible();
    await expect(generateButton.locator(".icon")).toBeHidden();
    expect(await generateButton.boundingBox()).toEqual(idleBounds);
    releaseGenerate();

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

  test("separates photos from grouped items with an always-visible return path", async ({
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
    const review = modal.locator(".batch-review");
    const gallerySection = modal.locator(".batch-gallery-section");
    const galleryGrid = modal.locator(".batch-gallery-grid");
    const groupsSection = modal.locator(".batch-groups-section");
    const jumpToPhotos = modal.locator(".organize-jump-to-photos");
    const jumpToGroups = modal.locator(".organize-jump-to-groups");

    await expect(modal.locator(".batch-gallery-sticky")).toHaveCount(0);
    await expect(gallerySection.getByRole("heading", { name: "Photos to group" })).toBeVisible();
    await expect(groupsSection.getByRole("heading", { name: "Items" })).toBeVisible();
    await expect(galleryGrid.locator(".batch-photo-wrap:not([hidden])")).toHaveCount(15);
    await expect(groupsSection.locator(".batch-groups-empty")).toHaveText(
      "No items grouped yet.",
    );
    await expect(jumpToGroups).toBeHidden();
    expect(
      await galleryGrid.locator(".batch-photo-wrap:not([hidden])").evaluateAll((wrappers) =>
        new Set(wrappers.map((wrapper) => Math.round(wrapper.getBoundingClientRect().y)))
          .size,
      ),
    ).toBeGreaterThan(1);
    const scrollSurface = await review.evaluate((node) => ({
      overflowY: getComputedStyle(node).overflowY,
      scrollbarWidth: getComputedStyle(node).scrollbarWidth,
      reservedWidth: node.offsetWidth - node.clientWidth,
    }));
    expect(scrollSurface).toMatchObject({
      overflowY: "scroll",
      scrollbarWidth: "auto",
    });
    expect(scrollSurface.reservedWidth).toBeGreaterThan(0);

    for (let groupIndex = 0; groupIndex < 3; groupIndex += 1) {
      await modal
        .locator(
          `.batch-photo[data-photo-key="phone-${groupIndex * 2 + 1}.jpg"]`,
        )
        .click();
      await modal
        .locator(
          `.batch-photo[data-photo-key="phone-${groupIndex * 2 + 2}.jpg"]`,
        )
        .click();
      await modal.locator(".batch-mark-group").click();
    }

    await expect(galleryGrid.locator(".batch-photo-wrap:not([hidden])")).toHaveCount(9);
    await expect(modal.locator(".batch-item-card")).toHaveCount(3);
    await expect(groupsSection.locator(".batch-groups-empty")).toBeHidden();
    await expect(jumpToPhotos.locator(".organize-photos-label")).toHaveText(
      "9 photos remaining",
    );
    await expect(jumpToPhotos.locator(".batch-direction-icon")).toBeVisible();
    await expect(jumpToPhotos).toHaveAttribute(
      "aria-controls",
      "quickvint-batch-gallery-section",
    );
    await expect(jumpToGroups).toContainText("Items");
    await expect(jumpToGroups.locator(".organize-items-count")).toHaveText("3");
    await expect(jumpToGroups.locator(".batch-direction-icon")).toBeVisible();
    await expect(jumpToGroups).toHaveAttribute(
      "aria-controls",
      "quickvint-batch-groups-section",
    );
    expect(
      await galleryGrid.evaluate((node) => node.scrollWidth > node.clientWidth),
    ).toBe(false);
    await expect(modal.locator(".batch-item-card").last()).not.toHaveClass(
      /is-entering/,
    );

    const sectionBounds = await modal.evaluate((root) => {
      const gallery = root.querySelector(".batch-gallery-section").getBoundingClientRect();
      const groups = root.querySelector(".batch-groups-section").getBoundingClientRect();
      return {
        galleryBottom: Math.round(gallery.bottom),
        groupsTop: Math.round(groups.top),
      };
    });
    expect(sectionBounds.groupsTop).toBeGreaterThanOrEqual(sectionBounds.galleryBottom);

    await jumpToGroups.click();
    await expect
      .poll(() => review.evaluate((node) => node.scrollTop))
      .toBeGreaterThan(0);
    await jumpToPhotos.click();
    await expect.poll(() => review.evaluate((node) => node.scrollTop)).toBe(0);

    expect(await review.evaluate((node) => node.scrollLeft)).toBe(0);
    expect(
      await review.evaluate((node) => node.offsetWidth - node.clientWidth),
    ).toBeGreaterThan(0);
    expect(
      await modal.locator(".batch-body").evaluate((body) => body.scrollLeft),
    ).toBe(0);
    await expectBatchModalLayoutStable(page, modal);

    const stalePhoto = galleryGrid.locator(".batch-photo-wrap:not([hidden])").first();
    await stalePhoto.evaluate((wrapper) => {
      wrapper.hidden = true;
      wrapper.classList.add("is-grouped");
      wrapper.setAttribute("aria-hidden", "true");
    });
    await modal
      .locator(".batch-photo-wrap:not([hidden]) .batch-photo")
      .first()
      .click();
    await expect(stalePhoto).toBeVisible();

    await page.setViewportSize({ width: 390, height: 844 });
    for (const control of [jumpToPhotos, jumpToGroups]) {
      expect(
        await control.evaluate((button) => button.getBoundingClientRect().height),
      ).toBeGreaterThanOrEqual(44);
    }
    expect(
      await galleryGrid.locator(".batch-photo-wrap:not([hidden])").evaluateAll((wrappers) =>
        new Set(wrappers.map((wrapper) => Math.round(wrapper.getBoundingClientRect().x)))
          .size,
      ),
    ).toBe(3);
    await expectBatchModalLayoutStable(page, modal);

    const remainingPhotos = galleryGrid.locator(
      ".batch-photo-wrap:not([hidden]) .batch-photo",
    );
    for (let index = 0; index < (await remainingPhotos.count()); index += 1) {
      const photo = remainingPhotos.nth(index);
      if (!(await photo.evaluate((node) => node.classList.contains("selected")))) {
        await photo.click();
      }
    }
    await modal.locator(".batch-mark-group").click();
    await expect(jumpToPhotos).toHaveText("All photos grouped");
    await expect(jumpToPhotos).toBeDisabled();
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
      window.__batchSignedListRequests = 0;
      window.chrome.runtime.sendMessage = (message, callback) => {
        if (message?.type === "PROXY_FETCH") {
          const url = String(message.url || "");
          if (url.includes("/api/phone-upload?sessionId=")) {
            if (url.includes("action=cleanup")) {
              setTimeout(() => callback?.({ ok: true, data: {} }), 0);
              return;
            }
            window.__batchListRequests += 1;
            const includeUrls = url.includes("includeUrls=1");
            if (includeUrls) window.__batchSignedListRequests += 1;
            setTimeout(
              () =>
                callback?.({
                  ok: true,
                  data: {
                    files: [
                      {
                        name: "phone-1.jpg",
                        path: "session/phone-1.jpg",
                        ...(includeUrls
                          ? { url: "https://storage.test/fresh-phone-1.jpg" }
                          : {}),
                      },
                      {
                        name: "phone-2.jpg",
                        path: "session/phone-2.jpg",
                        ...(includeUrls
                          ? { url: "https://storage.test/fresh-phone-2.jpg" }
                          : {}),
                      },
                    ],
                    count: 2,
                    expectedCount: 2,
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
      "https://storage.test/fresh-phone-1.jpg",
      "https://storage.test/fresh-phone-2.jpg",
    ]);
    expect(await page.evaluate(() => window.__batchSignedListRequests)).toBe(1);
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
      window.__batchSignedListRequests = 0;
      window.chrome.runtime.sendMessage = (message, callback) => {
        if (message?.type === "PROXY_FETCH") {
          const url = String(message.url || "");
          if (url.includes("/api/phone-upload?sessionId=")) {
            if (url.includes("action=cleanup")) {
              setTimeout(() => callback?.({ ok: true, data: {} }), 0);
              return;
            }
            if (url.includes("action=complete")) {
              setTimeout(
                () => callback?.({ ok: true, data: { complete: true } }),
                0,
              );
              return;
            }
            const includeUrls = url.includes("includeUrls=1");
            if (includeUrls) window.__batchSignedListRequests += 1;
            const suffix =
              window.__batchSignedListRequests === 1 ? "old" : "fresh";
            setTimeout(
              () =>
                callback?.({
                  ok: true,
                  data: {
                    files: [
                      {
                        name: "phone-1.jpg",
                        path: "session/phone-1.jpg",
                        ...(includeUrls
                          ? { url: `https://storage.test/${suffix}-phone-1.jpg` }
                          : {}),
                      },
                      {
                        name: "phone-2.jpg",
                        path: "session/phone-2.jpg",
                        ...(includeUrls
                          ? { url: `https://storage.test/${suffix}-phone-2.jpg` }
                          : {}),
                      },
                    ],
                    count: 2,
                    expectedCount: 2,
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
    expect(await page.evaluate(() => window.__batchSignedListRequests)).toBe(2);
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

  test("opens an authenticated v2 phone session before showing its QR", async ({
    page,
  }) => {
    await openContentHarness(
      page,
      { allowed: true, available: 10 },
      { emptyListing: true, shortenPhoneUploadPoll: true },
    );
    await page.evaluate(() => {
      const originalSendMessage = window.chrome.runtime.sendMessage;
      window.__phoneV2Requests = [];
      window.chrome.runtime.sendMessage = (message, callback) => {
        if (message?.type === "PROXY_FETCH") {
          const url = new URL(message.url);
          if (url.searchParams.get("action") === "open") {
            window.__phoneV2Requests.push(message);
            setTimeout(
              () => callback?.({ ok: true, status: 201, data: { status: "open" } }),
              0,
            );
            return;
          }
          if (url.pathname.endsWith("/api/phone-upload")) {
            setTimeout(
              () => callback?.({ ok: true, data: { files: [], count: 0, complete: false } }),
              0,
            );
            return;
          }
        }
        originalSendMessage(message, callback);
      };
    });

    await chooseSinglePhoneUpload(page);
    await expect(page.locator("#quickvint-phone-modal")).toBeVisible();

    const request = await page.evaluate(() => window.__phoneV2Requests[0]);
    const url = new URL(request.url);
    expect(url.searchParams.get("action")).toBe("open");
    expect(url.searchParams.get("v")).toBe("2");
    expect(url.searchParams.get("mode")).toBe("single");
    expect(url.searchParams.get("sessionId")).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(request.options.headers.Authorization).toBe("Bearer test-access-token");
    await expect(page.locator("#quickvint-phone-modal #qr-code")).toHaveAttribute(
      "data-upload-url",
      /[?&]v=2(?:&|$)/,
    );
  });

  test("appends completed phone upload waves before the desktop lock", async ({
    page,
  }) => {
    await openContentHarness(
      page,
      { allowed: true, available: 10 },
      { emptyListing: true, shortenPhoneUploadPoll: true },
    );
    await page.evaluate((dataUrl) => {
      const originalSendMessage = window.chrome.runtime.sendMessage;
      window.__phoneExpected = 2;
      window.__phoneInputChanges = [];
      window.__phoneApiRequests = [];
      document
        .querySelector('[data-testid="add-photos-input"]')
        .addEventListener("change", (event) => {
          window.__phoneInputChanges.push(
            Array.from(event.currentTarget.files || []).map((file) => file.name),
          );
        });
      window.chrome.runtime.sendMessage = (message, callback) => {
        if (message?.type === "PROXY_FETCH") {
          const url = new URL(message.url);
          if (url.searchParams.get("action") === "open") {
            setTimeout(() => callback?.({ ok: true, status: 201, data: {} }), 0);
            return;
          }
          if (url.searchParams.get("action") === "complete") {
            window.__phoneApiRequests.push(url.search);
            setTimeout(
              () =>
                callback?.({
                  ok: true,
                  status: 200,
                  data: {
                    complete: true,
                    status: "complete",
                    expectedCount: window.__phoneExpected,
                  },
                }),
              0,
            );
            return;
          }
          if (url.hostname === "storage.test") {
            setTimeout(() => callback?.({ ok: true, data: dataUrl }), 0);
            return;
          }
          if (url.pathname.endsWith("/api/phone-upload")) {
            const fromOrder = Number(url.searchParams.get("fromOrder") || 0);
            const includeUrls = url.searchParams.get("includeUrls") === "1";
            window.__phoneApiRequests.push(url.search);
            const allFiles = Array.from(
              { length: window.__phoneExpected },
              (_, index) => ({
                name: `${String(index).padStart(6, "0")}-phone-${index + 1}.jpg`,
                path: `session/phone-${index + 1}.jpg`,
                order: index,
                ...(includeUrls
                  ? { url: `https://storage.test/phone-${index + 1}.jpg` }
                  : {}),
              }),
            );
            setTimeout(
              () =>
                callback?.({
                  ok: true,
                  data: {
                    files: includeUrls
                      ? allFiles.filter((file) => file.order >= fromOrder)
                      : allFiles,
                    count: window.__phoneExpected,
                    expectedCount: window.__phoneExpected,
                    complete: false,
                    status: "uploading",
                  },
                }),
              0,
            );
            return;
          }
        }
        originalSendMessage(message, callback);
      };
    }, tinyPngDataUrl);

    await chooseSinglePhoneUpload(page);
    await expect
      .poll(() => page.evaluate(() => window.__phoneInputChanges))
      .toEqual([["000000-phone-1.jpg", "000001-phone-2.jpg"]]);

    await page.evaluate(() => {
      window.__phoneExpected = 3;
    });
    await expect
      .poll(() => page.evaluate(() => window.__phoneInputChanges))
      .toEqual([
        ["000000-phone-1.jpg", "000001-phone-2.jpg"],
        ["000002-phone-3.jpg"],
      ]);

    expect(
      await page.evaluate(() =>
        window.__phoneApiRequests.filter((search) =>
          search.includes("includeUrls=1"),
        ),
      ),
    ).toEqual([
      expect.stringContaining("fromOrder=0"),
      expect.stringContaining("fromOrder=2"),
    ]);

    await page.locator("#quickvint-phone-modal .close-btn").click();
    await expect(page.locator("#quickvint-phone-modal")).toHaveCount(0);
    expect(
      await page.evaluate(() =>
        window.__phoneApiRequests.filter((search) =>
          search.includes("action=complete"),
        ),
      ),
    ).toHaveLength(1);
  });

  test("Scott upload keeps a 33-photo batch open beyond five client minutes", async ({
    page,
  }) => {
    await openContentHarness(
      page,
      { allowed: true, available: 40 },
      {
        emptyListing: true,
        shortenPhoneUploadPoll: true,
        shortenUploadIdleTimers: true,
      },
    );
    await page.evaluate(() => {
      const originalSendMessage = window.chrome.runtime.sendMessage;
      window.__scottCount = 0;
      window.chrome.runtime.sendMessage = (message, callback) => {
        if (message?.type === "PROXY_FETCH") {
          const url = new URL(message.url);
          if (url.searchParams.get("action") === "open") {
            setTimeout(() => callback?.({ ok: true, status: 201, data: {} }), 0);
            return;
          }
          if (url.pathname.endsWith("/api/phone-upload")) {
            const files = window.__scottCount
              ? Array.from({ length: window.__scottCount }, (_, index) => ({
                  name: `${String(index).padStart(6, "0")}-photo-${index + 1}.jpg`,
                  path: `scott/photo-${index + 1}.jpg`,
                  url: `https://storage.test/photo-${index + 1}.jpg`,
                  order: index,
                }))
              : [];
            setTimeout(
              () =>
                callback?.({
                  ok: true,
                  data: {
                    files,
                    count: files.length,
                    expectedCount: 33,
                    complete: window.__scottCount > 0,
                    status: window.__scottCount > 0 ? "complete" : "open",
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
    await page.waitForTimeout(100);
    await expect(page.locator("#quickvint-batch-modal")).toBeVisible();
    await expect(page.locator("#quickvint-batch-modal .batch-gallery")).toHaveCount(0);

    await page.evaluate(() => {
      window.__scottCount = 32;
    });
    await page.waitForTimeout(100);
    await expect(page.locator("#quickvint-batch-modal .batch-gallery")).toHaveCount(0);

    await page.evaluate(() => {
      window.__scottCount = 33;
    });
    await expect(
      page.locator("#quickvint-batch-modal .batch-gallery .batch-photo"),
    ).toHaveCount(33);
  });

  test("appends phone waves to batch grouping before generation locks them", async ({
    page,
  }) => {
    await openContentHarness(
      page,
      { allowed: true, available: 40 },
      { emptyListing: true, shortenPhoneUploadPoll: true },
    );
    await page.evaluate(() => {
      const originalSendMessage = window.chrome.runtime.sendMessage;
      window.__batchExpected = 2;
      window.__batchApiRequests = [];
      window.chrome.runtime.sendMessage = (message, callback) => {
        if (message?.type === "PROXY_FETCH") {
          const url = new URL(message.url);
          if (url.searchParams.get("action") === "open") {
            setTimeout(() => callback?.({ ok: true, status: 201, data: {} }), 0);
            return;
          }
          if (url.searchParams.get("action") === "complete") {
            window.__batchApiRequests.push(url.search);
            setTimeout(
              () =>
                callback?.({
                  ok: true,
                  status: 200,
                  data: {
                    complete: true,
                    status: "complete",
                    expectedCount: window.__batchExpected,
                  },
                }),
              0,
            );
            return;
          }
          if (url.pathname.endsWith("/api/phone-upload")) {
            const includeUrls = url.searchParams.get("includeUrls") === "1";
            const fromOrder = Number(url.searchParams.get("fromOrder") || 0);
            window.__batchApiRequests.push(url.search);
            const files = Array.from(
              { length: window.__batchExpected },
              (_, order) => ({
                name: `${String(order).padStart(6, "0")}-upload.jpg`,
                path: `batch/${String(order).padStart(6, "0")}-upload.jpg`,
                order,
                ...(includeUrls
                  ? { url: `https://storage.test/batch-${order}.jpg` }
                  : {}),
              }),
            );
            setTimeout(
              () =>
                callback?.({
                  ok: true,
                  status: 200,
                  data: {
                    files: includeUrls
                      ? files.filter((file) => file.order >= fromOrder)
                      : files,
                    count: window.__batchExpected,
                    expectedCount: window.__batchExpected,
                    complete: false,
                    status: "uploading",
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
    const modal = page.locator("#quickvint-batch-modal");
    await expect(modal.locator(".batch-gallery .batch-photo")).toHaveCount(2);
    await modal.locator(".batch-gallery .batch-photo").nth(0).click();
    await modal.locator(".batch-gallery .batch-photo").nth(1).click();
    await modal.locator(".batch-mark-group").click();
    await expect(modal.locator(".batch-item-card")).toHaveCount(1);

    await page.evaluate(() => {
      window.__batchExpected = 3;
    });
    await expect(modal.locator(".batch-gallery .batch-photo")).toHaveCount(3);
    await expect(modal.locator(".batch-item-card")).toHaveCount(1);
    await expect(modal.locator(".batch-photo-wrap:not([hidden]) .batch-photo")).toHaveCount(1);
    expect(
      await page.evaluate(() =>
        window.__batchApiRequests.filter((search) =>
          search.includes("includeUrls=1"),
        ),
      ),
    ).toEqual([
      expect.stringContaining("fromOrder=0"),
      expect.stringContaining("fromOrder=2"),
    ]);

    await modal.locator(".batch-photo-wrap:not([hidden]) .batch-photo").click();
    await modal.locator(".batch-mark-group").click();
    await modal.locator(".batch-start").click();
    await expect
      .poll(() =>
        page.evaluate(() =>
          window.__batchApiRequests.filter((search) =>
            search.includes("action=complete"),
          ).length,
        ),
      )
      .toBe(1);
  });

  test("protects an expected phone batch before the first photo arrives", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openContentHarness(
      page,
      { allowed: true, available: 40 },
      { emptyListing: true, shortenPhoneUploadPoll: true },
    );
    await page.evaluate(() => {
      const originalSendMessage = window.chrome.runtime.sendMessage;
      window.__batchCloseMessages = [];
      window.__expectedCountPolls = 0;
      window.confirm = (message) => {
        window.__batchCloseMessages.push(message);
        return false;
      };
      window.chrome.runtime.sendMessage = (message, callback) => {
        if (message?.type === "PROXY_FETCH") {
          const url = new URL(message.url);
          if (url.searchParams.get("action") === "open") {
            setTimeout(() => callback?.({ ok: true, status: 201, data: {} }), 0);
            return;
          }
          if (url.pathname.endsWith("/api/phone-upload")) {
            window.__expectedCountPolls += 1;
            setTimeout(
              () =>
                callback?.({
                  ok: true,
                  data: {
                    files: [],
                    count: 0,
                    expectedCount: 33,
                    complete: false,
                    status: "uploading",
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
    await expect
      .poll(() => page.evaluate(() => window.__expectedCountPolls))
      .toBeGreaterThan(0);

    const modal = page.locator("#quickvint-batch-modal");
    await expect(modal.locator(".batch-qr")).toHaveCount(0);
    await expect(modal.locator(".batch-wait-title")).toHaveText(
      "Receiving 0 of 33 photos",
    );
    await expect(modal.locator(".batch-wait-copy")).toHaveText(
      "Keep the phone page open.",
    );
    await expect(modal.locator(".batch-source-grid")).toHaveCount(0);
    await expect(modal.locator(".batch-phone-receiving")).toBeVisible();
    await expect(modal.locator(".batch-choose-files")).toHaveCount(0);
    expect(
      await modal.locator(".quickvint-treadmill-cube").evaluate((cube) => [
        getComputedStyle(cube).animationPlayState,
        getComputedStyle(cube, "::after").animationPlayState,
      ]),
    ).toEqual(["paused", "paused"]);
    await modal.locator(".batch-close").click();

    await expect(modal).toBeVisible();
    expect(await page.evaluate(() => window.__batchCloseMessages)).toEqual([
      "Photos are still uploading. Closing now will discard this batch upload. Close anyway?",
    ]);
  });

  test("shows finalizing while every expected phone photo awaits completion", async ({
    page,
  }) => {
    await openContentHarness(
      page,
      { allowed: true, available: 40 },
      { emptyListing: true, shortenPhoneUploadPoll: true },
    );
    await page.evaluate(() => {
      const originalSendMessage = window.chrome.runtime.sendMessage;
      window.chrome.runtime.sendMessage = (message, callback) => {
        if (message?.type === "PROXY_FETCH") {
          const url = new URL(message.url);
          if (url.searchParams.get("action") === "open") {
            setTimeout(() => callback?.({ ok: true, status: 201, data: {} }), 0);
            return;
          }
          if (url.pathname.endsWith("/api/phone-upload")) {
            setTimeout(
              () =>
                callback?.({
                  ok: true,
                  data: {
                    files: Array.from({ length: 3 }, (_, order) => ({
                      name: `${String(order).padStart(6, "0")}-upload.jpg`,
                      path: `session/${String(order).padStart(6, "0")}-upload.jpg`,
                      order,
                    })),
                    count: 3,
                    expectedCount: 3,
                    complete: false,
                    status: "uploading",
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

    const modal = page.locator("#quickvint-batch-modal");
    await expect(modal.locator(".batch-wait-title")).toHaveText(
      "Finalizing 3 photos…",
    );
    await expect(modal.locator(".batch-wait-copy")).toHaveText(
      "Preparing your gallery.",
    );
    await expect(modal.locator(".batch-gallery")).toHaveCount(0);
  });

  test("expired phone sessions explain the loss and offer a new upload", async ({
    page,
  }) => {
    for (const mode of ["single", "batch"]) {
      await openContentHarness(
        page,
        { allowed: true, available: 10 },
        { emptyListing: true, shortenPhoneUploadPoll: true },
      );
      await page.evaluate(() => {
        const originalSendMessage = window.chrome.runtime.sendMessage;
        window.chrome.runtime.sendMessage = (message, callback) => {
          if (message?.type === "PROXY_FETCH") {
            const url = new URL(message.url);
            if (url.searchParams.get("action") === "open") {
              setTimeout(
                () => callback?.({ ok: true, status: 201, data: {} }),
                0,
              );
              return;
            }
            if (url.pathname.endsWith("/api/phone-upload")) {
              setTimeout(
                () =>
                  callback?.({
                    ok: false,
                    status: 410,
                    data: {
                      status: "expired",
                      error: "Upload session expired",
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

      if (mode === "single") {
        await chooseSinglePhoneUpload(page);
        await expect(
          page.locator("#quickvint-phone-modal .status"),
        ).toContainText("expired");
        await expect(
          page.locator("#quickvint-phone-modal .phone-upload-restart"),
        ).toHaveText("Start new upload");
      } else {
        await chooseBatchUpload(page);
        await expect(
          page.locator("#quickvint-batch-modal .batch-wait-title"),
        ).toHaveText("Upload expired");
        await expect(
          page.locator("#quickvint-batch-modal .batch-upload-restart"),
        ).toHaveText("Start new upload");
      }
    }
  });

  test("phone upload network loss keeps the same session and retries", async ({
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
        if (message?.type === "PROXY_FETCH") {
          const url = new URL(message.url);
          if (url.searchParams.get("action") === "open") {
            setTimeout(() => callback?.({ ok: true, status: 201, data: {} }), 0);
            return;
          }
          if (url.pathname.endsWith("/api/phone-upload")) {
            setTimeout(() => callback?.({ ok: false, error: "Failed to fetch" }), 0);
            return;
          }
        }
        originalSendMessage(message, callback);
      };
    });

    await chooseSinglePhoneUpload(page);
    const sessionId = await page
      .locator("#quickvint-phone-modal")
      .getAttribute("data-session-id");
    await expect(page.locator("#quickvint-phone-modal .status")).toHaveText(
      "Connection lost. Retrying…",
    );
    await page.waitForTimeout(100);
    await expect(page.locator("#quickvint-phone-modal")).toHaveAttribute(
      "data-session-id",
      sessionId,
    );
  });

  test("active phone upload raises the native leave warning boundary", async ({
    page,
  }) => {
    await openContentHarness(page, { allowed: true, available: 10 }, {
      emptyListing: true,
    });
    await chooseSinglePhoneUpload(page);
    await expect(page.locator("#quickvint-phone-modal")).toBeVisible();

    expect(
      await page.evaluate(() =>
        window.__AUTOLISTER_TEST_HOOKS__.shouldWarnBeforeLeavingListing(),
      ),
    ).toBe(true);

    await page.locator("#quickvint-phone-modal .close-x").click();
    expect(
      await page.evaluate(() =>
        window.__AUTOLISTER_TEST_HOOKS__.shouldWarnBeforeLeavingListing(),
      ),
    ).toBe(false);
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
    await expect(page.locator("#quickvint-phone-modal .preview-thumb")).toHaveCount(0);
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
    await expect(page.locator("#quickvint-phone-modal .preview-thumb")).toHaveCount(7);
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
            setTimeout(() => callback?.({ ok: true, data: dataUrl }), 5000);
            return;
          }
        }
        originalSendMessage(message, callback);
      };
    }, tinyPngDataUrl);

    await chooseSinglePhoneUpload(page);
    await expect(page.locator("#quickvint-phone-modal .status")).toHaveText(
      "Receiving 2/2",
    );
    await expect(
      page.locator("#quickvint-phone-modal .status .status-count"),
    ).toHaveText(
      "2/2",
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
    await page.locator('[data-testid="title--input"]').fill("Original phone title");
    await page
      .locator('[data-testid="description--input"]')
      .fill("Original phone description");

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
    await page.getByRole("button", { name: "Review suggestions" }).click();

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

    await expect(page.locator('[data-testid="title--input"]')).toHaveValue(
      "Original phone title",
    );
    await expect(page.locator('[data-testid="description--input"]')).toHaveValue(
      "Original phone description",
    );
    await expect(page.locator(".quickvint-wardrobe-review-card")).toHaveCount(2);
    await page.getByRole("button", { name: "Discard title suggestion", exact: true }).click();
    await page
      .getByRole("button", { name: "Discard description suggestion", exact: true })
      .click();

    await expect(page.locator("#quickvint-phone-modal")).toHaveCount(0);
    await expect(page.locator("#quickvint-gen-btn")).toBeEnabled();
    await page.locator("#quickvint-gen-btn").click();
    await page.locator("#quickvint-description-apply-prompt button", {
      hasText: "Replace existing text",
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

  test("does not turn an expired capacity token into a paywall", async ({ page }) => {
    await openContentHarness(page, {
      runtimeStatus: 401,
      runtimeError: "Please sign in again before generating.",
    });

    await page.locator("#quickvint-phone-btn").click();

    await expect(page.locator("#quickvint-upload-choice-modal")).toHaveCount(0);
    await expect(page.locator("#quickvint-toast.paywall")).not.toBeVisible();
    await expect(page.locator("#quickvint-toast.error")).toContainText(
      "Please sign in again before generating.",
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

  test("offers review for a title-only listing and keeps fields unchanged", async ({ page }) => {
    let generationRequests = 0;
    await page.route("https://autolister.app/api/generate", (route) => {
      generationRequests += 1;
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          title: "Suggested title",
          description: "First line\nSecond line",
          measurementAdvice: "",
        }),
      });
    });
    await openContentHarness(page);
    await page.locator('[data-testid="title--input"]').fill("Original title");
    await page.locator('[data-testid="title--input"]').evaluate((input) => {
      const descriptor = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value",
      );
      window.__directTitleSetterCalls = 0;
      Object.defineProperty(input, "value", {
        configurable: true,
        get() {
          return descriptor.get.call(this);
        },
        set(value) {
          window.__directTitleSetterCalls += 1;
          descriptor.set.call(this, value);
        },
      });
    });
    await page.locator('[data-testid="description--input"]').evaluate((input) => {
      const descriptor = Object.getOwnPropertyDescriptor(
        HTMLTextAreaElement.prototype,
        "value",
      );
      window.__directDescriptionSetterCalls = 0;
      Object.defineProperty(input, "value", {
        configurable: true,
        get() {
          return descriptor.get.call(this);
        },
        set(value) {
          window.__directDescriptionSetterCalls += 1;
          descriptor.set.call(this, value);
        },
      });
    });

    await page.locator("#quickvint-gen-btn").click();
    await expect(page.locator("#quickvint-description-apply-prompt")).toContainText(
      "Review suggestions",
    );
    expect(generationRequests).toBe(0);
    await page.getByRole("button", { name: "Review suggestions" }).click();

    await expect.poll(() => generationRequests).toBe(1);
    await expect(page.locator('[data-testid="title--input"]')).toHaveValue("Original title");
    await expect(page.locator('[data-testid="description--input"]')).toHaveValue("");
    await expect(page.locator(".quickvint-wardrobe-review-card")).toHaveCount(2);
    await expect(page.locator("#quickvint-wardrobe-review-description p")).toHaveText(
      "First line\nSecond line",
    );
    await expect(page.locator("#quickvint-wardrobe-review-description p")).toHaveCSS(
      "white-space",
      "pre-wrap",
    );

    await page.getByRole("button", { name: "Use this title" }).click();
    await expect(page.locator('[data-testid="title--input"]')).toHaveValue("Suggested title");
    expect(await page.evaluate(() => window.__directTitleSetterCalls)).toBe(0);
    await expect(page.locator("#quickvint-wardrobe-review-title p")).toHaveCount(0);
    await page.getByRole("button", { name: "Undo title suggestion", exact: true }).click();
    await expect(page.locator('[data-testid="title--input"]')).toHaveValue("Original title");
    await expect(page.getByRole("button", { name: "Use this title" })).toBeVisible();
    await page.getByRole("button", { name: "Use this description" }).click();
    await expect(page.locator('[data-testid="description--input"]')).toHaveValue(
      "First line\nSecond line",
    );
    expect(await page.evaluate(() => window.__directDescriptionSetterCalls)).toBe(0);
    await page
      .getByRole("button", { name: "Undo description suggestion", exact: true })
      .click();
    await expect(page.locator('[data-testid="description--input"]')).toHaveValue("");
  });
});

test.describe("wardrobe rewrite tab", () => {
  test("is ready only for the matching edit route with fields and photos", async ({ page }) => {
    await openWardrobeEditHarness(page);
    const ping = (itemId) => sendContentMessage(page, { type: "WARDROBE_REWRITE_PING", itemId });
    await expect(ping("42")).resolves.toEqual({ ok: true, itemId: "42" });
    await expect(ping("43")).resolves.toEqual({ ok: false, itemId: "43" });
    await page.evaluate(() => history.replaceState({}, "", "/items/new"));
    await expect(ping("42")).resolves.toEqual({ ok: false, itemId: "42" });
    await page.evaluate(() => history.replaceState({}, "", "/items/42/edit"));
    await page.locator('[data-testid="title--input"]').evaluate((input) => input.remove());
    await expect(ping("42")).resolves.toEqual({ ok: false, itemId: "42" });
  });

  test("wardrobe rewrite tab rejects missing description and image discovery", async ({ page }) => {
    await openWardrobeEditHarness(page);
    const ping = () => sendContentMessage(page, { type: "WARDROBE_REWRITE_PING", itemId: "42" });
    await page.locator('[data-testid="description--input"]').evaluate((input) => input.remove());
    await expect(ping()).resolves.toEqual({ ok: false, itemId: "42" });
    await page.reload({ waitUntil: "domcontentloaded" });
    await installChromeHarness(page);
    await page.addScriptTag({ path: languageDefaultsPath });
    await page.addScriptTag({ path: contentScriptPath });
    await page.locator('[data-testid^="image-wrapper-"] img').evaluate((image) => image.remove());
    await expect(ping()).resolves.toEqual({ ok: false, itemId: "42" });
  });

  test("wardrobe language overrides keep fields and stored defaults unchanged in review", async ({ page }) => {
    const bodies = [];
    await page.route("https://autolister.app/api/events/track", (route) => route.fulfill({ status: 204, body: "" }));
    await page.route("https://autolister.app/api/generate", (route) => {
      bodies.push(route.request().postDataJSON());
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ title: "New title", description: "New description" }) });
    });
    await openWardrobeEditHarness(page, "42", { initialStorage: { selectedTitleLanguage: "de", selectedDescriptionLanguage: "es" } });
    await page.locator('[data-testid="title--input"]').fill("Original title");
    await page.locator('[data-testid="description--input"]').fill("Original description");
    await expect(sendContentMessage(page, { type: "RUN_WARDROBE_REWRITE_ITEM", itemId: "42", applyMode: "review", titleLanguageCode: "fr", descriptionLanguageCode: "nl" })).resolves.toMatchObject({ ok: true });
    await expect(page.locator('[data-testid="title--input"]')).toHaveValue("Original title");
    await expect(page.locator('[data-testid="description--input"]')).toHaveValue("Original description");
    expect(bodies[0]).toMatchObject({ titleLanguageCode: "fr", descriptionLanguageCode: "nl", generationMode: "batch" });
    expect(await page.evaluate(() => window.__extensionHarness.storage.selectedTitleLanguage)).toBe("de");
    expect(await page.evaluate(() => window.__extensionHarness.storage.selectedDescriptionLanguage)).toBe("es");
  });

  test("rejects incomplete HTTP 200 generation output without changing listing fields", async ({ page }) => {
    await page.route("https://autolister.app/api/events/track", (route) => route.fulfill({ status: 204, body: "" }));
    await page.route("https://autolister.app/api/generate", (route) => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ title: "  ", description: "Generated description" }),
    }));
    await openWardrobeEditHarness(page);
    await page.locator('[data-testid="title--input"]').fill("Original title");
    await page.locator('[data-testid="description--input"]').fill("Original description");

    await expect(sendContentMessage(page, {
      type: "RUN_WARDROBE_REWRITE_ITEM",
      itemId: "42",
      applyMode: "replace",
      titleLanguageCode: "en",
      descriptionLanguageCode: "nl",
    })).resolves.toMatchObject({
      ok: false,
      error: "Generated listing response was incomplete.",
    });
    await expect(page.locator('[data-testid="title--input"]')).toHaveValue("Original title");
    await expect(page.locator('[data-testid="description--input"]')).toHaveValue("Original description");
    await expect(page.locator(".quickvint-wardrobe-review-card, #quickvint-wardrobe-rewrite-result")).toHaveCount(0);
    await expect(page.locator("#quickvint-wardrobe-rewrite-status")).toContainText(
      "Generated listing response was incomplete.",
    );

    await page.locator("#quickvint-gen-btn").click();
    await expect(page.locator('[data-testid="title--input"]')).toHaveValue("Original title");
    await expect(page.locator('[data-testid="description--input"]')).toHaveValue("Original description");
  });

  test("rejects delayed wardrobe output after the edit route changes", async ({ page }) => {
    let releaseGeneration;
    let requested = false;
    const generationReleased = new Promise((resolve) => { releaseGeneration = resolve; });
    await page.route("https://autolister.app/api/events/track", (route) => route.fulfill({ status: 204, body: "" }));
    await page.route("https://autolister.app/api/generate", async (route) => {
      requested = true;
      await generationReleased;
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ title: "New title", description: "New description" }) });
    });
    await openWardrobeEditHarness(page);
    await page.locator('[data-testid="title--input"]').fill("Original title");
    await page.locator('[data-testid="description--input"]').fill("Original description");
    const result = sendContentMessage(page, { type: "RUN_WARDROBE_REWRITE_ITEM", itemId: "42", applyMode: "replace", titleLanguageCode: "en", descriptionLanguageCode: "nl" });
    await expect.poll(() => requested).toBe(true);
    await page.evaluate(() => history.pushState({}, "", "/items/43/edit"));
    releaseGeneration();
    await expect(result).resolves.toMatchObject({ ok: false });
    await expect(page.locator('[data-testid="title--input"]')).toHaveValue("Original title");
    await expect(page.locator('[data-testid="description--input"]')).toHaveValue("Original description");
    await expect(page.locator(".quickvint-wardrobe-review-card, #quickvint-wardrobe-rewrite-result")).toHaveCount(0);
  });

  test("rejects delayed wardrobe output after either original field changes", async ({ page }) => {
    let releaseGeneration;
    let requested = false;
    const generationReleased = new Promise((resolve) => { releaseGeneration = resolve; });
    await page.route("https://autolister.app/api/events/track", (route) => route.fulfill({ status: 204, body: "" }));
    await page.route("https://autolister.app/api/generate", async (route) => {
      requested = true;
      await generationReleased;
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ title: "New title", description: "New description" }) });
    });
    await openWardrobeEditHarness(page);
    await page.locator('[data-testid="title--input"]').fill("Original title");
    await page.locator('[data-testid="description--input"]').fill("Original description");
    const result = sendContentMessage(page, { type: "RUN_WARDROBE_REWRITE_ITEM", itemId: "42", applyMode: "review", titleLanguageCode: "en", descriptionLanguageCode: "nl" });
    await expect.poll(() => requested).toBe(true);
    await page.locator('[data-testid="description--input"]').fill("Seller changed description");
    releaseGeneration();
    await expect(result).resolves.toMatchObject({ ok: false });
    await expect(page.locator('[data-testid="title--input"]')).toHaveValue("Original title");
    await expect(page.locator('[data-testid="description--input"]')).toHaveValue("Seller changed description");
    await expect(page.locator(".quickvint-wardrobe-review-card")).toHaveCount(0);
  });

  test("shows isolated wardrobe work status and blocks manual generation while running", async ({ page }) => {
    let releaseGeneration;
    let requestCount = 0;
    const generationReleased = new Promise((resolve) => { releaseGeneration = resolve; });
    await page.route("https://autolister.app/api/events/track", (route) => route.fulfill({ status: 204, body: "" }));
    await page.route("https://autolister.app/api/generate", async (route) => {
      requestCount += 1;
      await generationReleased;
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ title: "New title", description: "New description" }) });
    });
    await openWardrobeEditHarness(page);
    const result = sendContentMessage(page, { type: "RUN_WARDROBE_REWRITE_ITEM", itemId: "42", applyMode: "review", titleLanguageCode: "en", descriptionLanguageCode: "nl" });
    await expect(page.locator("#quickvint-wardrobe-rewrite-status")).toContainText("Rewriting listing…");
    await expect(page.locator("#quickvint-gen-btn")).toBeDisabled();
    await page.locator("#quickvint-gen-btn").click({ force: true });
    expect(requestCount).toBe(1);
    releaseGeneration();
    await expect(result).resolves.toMatchObject({ ok: true });
    await expect(page.locator("#quickvint-wardrobe-rewrite-status")).toContainText("New title and description ready to review.");
    await expect(page.locator("#quickvint-gen-btn")).toBeEnabled();
    await expect(page.locator("#quickvint-batch-tab-status")).toHaveCount(0);
  });

  test("wardrobe replace applies fields with independent undo and never saves", async ({ page }) => {
    let saves = 0;
    await page.route("https://autolister.app/api/events/track", (route) => route.fulfill({ status: 204, body: "" }));
    await page.route("https://autolister.app/api/generate", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ title: "New title", description: "New description" }) }));
    await openWardrobeEditHarness(page);
    await page.evaluate(() => {
      const sentinel = document.createElement("button");
      sentinel.textContent = "Save sentinel";
      sentinel.addEventListener("click", () => window.__saveSentinelClicked = (window.__saveSentinelClicked || 0) + 1);
      document.body.append(sentinel);
    });
    await page.locator('[data-testid="title--input"]').fill("Original title");
    await page.locator('[data-testid="description--input"]').fill("Original description");
    await expect(sendContentMessage(page, { type: "RUN_WARDROBE_REWRITE_ITEM", itemId: "42", itemIndex: 1, totalItems: 1, applyMode: "replace", titleLanguageCode: "en", descriptionLanguageCode: "nl" })).resolves.toMatchObject({ ok: true });
    await expect(page.locator('[data-testid="title--input"]')).toHaveValue("New title");
    await expect(page.locator('[data-testid="description--input"]')).toHaveValue("New description");
    await page.getByRole("button", { name: "Undo title" }).click();
    await expect(page.locator('[data-testid="title--input"]')).toHaveValue("Original title");
    await expect(page.locator('[data-testid="description--input"]')).toHaveValue("New description");
    await page.getByRole("button", { name: "Undo description" }).click();
    saves = await page.evaluate(() => window.__saveSentinelClicked || 0);
    expect(saves).toBe(0);
  });

  test("wardrobe review applies, discards, and undoes each field independently", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 900 });
    await page.route("https://autolister.app/api/events/track", (route) => route.fulfill({ status: 204, body: "" }));
    await page.route("https://autolister.app/api/generate", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ title: "New title", description: "New description" }) }));
    await openWardrobeEditHarness(page);
    await page.locator('[data-testid="title--input"]').fill("Original title");
    await page.locator('[data-testid="description--input"]').fill("Original description");
    await sendContentMessage(page, { type: "RUN_WARDROBE_REWRITE_ITEM", itemId: "42", applyMode: "review", titleLanguageCode: "en", descriptionLanguageCode: "en" });
    await expect(page.locator(".quickvint-wardrobe-review-card")).toHaveCount(2);
    for (const button of await page.locator(".quickvint-wardrobe-review-card button").all()) {
      expect((await button.boundingBox()).height).toBeGreaterThanOrEqual(40);
    }
    await page.getByRole("button", { name: "Use this title" }).click();
    await expect(page.locator('[data-testid="title--input"]')).toHaveValue("New title");
    await expect(page.locator('[data-testid="description--input"]')).toHaveValue("Original description");
    await page
      .getByRole("button", { name: "Discard description suggestion", exact: true })
      .click();
    await page.getByRole("button", { name: "Undo title suggestion", exact: true }).click();
    await expect(page.locator('[data-testid="title--input"]')).toHaveValue("Original title");
    await expect(page.locator('[data-testid="description--input"]')).toHaveValue("Original description");
    await expectNoHorizontalOverflow(page);
  });

  test("removes stale review controls on SPA navigation and field edits", async ({ page }) => {
    await page.route("https://autolister.app/api/events/track", (route) => route.fulfill({ status: 204, body: "" }));
    await page.route("https://autolister.app/api/generate", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ title: "New title", description: "New description" }) }));
    await openWardrobeEditHarness(page);
    await page.locator('[data-testid="title--input"]').fill("Original title");
    await page.locator('[data-testid="description--input"]').fill("Original description");

    await sendContentMessage(page, { type: "RUN_WARDROBE_REWRITE_ITEM", itemId: "42", applyMode: "review", titleLanguageCode: "en", descriptionLanguageCode: "en" });
    await page.evaluate(() => history.pushState({}, "", "/items/43/edit"));
    await expect(page.locator(".quickvint-wardrobe-review-card")).toHaveCount(0);

    await page.evaluate(() => history.pushState({}, "", "/items/42/edit"));
    await sendContentMessage(page, { type: "RUN_WARDROBE_REWRITE_ITEM", itemId: "42", applyMode: "review", titleLanguageCode: "en", descriptionLanguageCode: "en" });
    await page.locator('[data-testid="title--input"]').fill("Seller title edit");
    await page.getByRole("button", { name: "Use this title" }).click();
    await expect(page.locator('[data-testid="title--input"]')).toHaveValue("Seller title edit");
    await expect(page.locator(".quickvint-wardrobe-review-card")).toHaveCount(0);

    await sendContentMessage(page, { type: "RUN_WARDROBE_REWRITE_ITEM", itemId: "42", applyMode: "review", titleLanguageCode: "en", descriptionLanguageCode: "en" });
    await page.getByRole("button", { name: "Use this title" }).click();
    await page.locator('[data-testid="title--input"]').fill("Seller changed generated title");
    await expect(
      page.getByRole("button", { name: "Undo title suggestion", exact: true }),
    ).toHaveCount(0);
    await expect(page.locator('[data-testid="title--input"]')).toHaveValue("Seller changed generated title");
    await expect(page.locator("#quickvint-wardrobe-review-title")).toHaveCount(0);
    await expect(page.locator("#quickvint-wardrobe-review-description")).toBeVisible();
  });

  test("wardrobe review failure and a second rewrite leave only the current controls", async ({ page }) => {
    let calls = 0;
    await page.route("https://autolister.app/api/events/track", (route) => route.fulfill({ status: 204, body: "" }));
    await page.route("https://autolister.app/api/generate", (route) => {
      calls += 1;
      return route.fulfill(calls === 1
        ? { status: 500, contentType: "application/json", body: JSON.stringify({ error: "No rewrite" }) }
        : { status: 200, contentType: "application/json", body: JSON.stringify({ title: `New title ${calls}`, description: `New description ${calls}` }) });
    });
    await openWardrobeEditHarness(page);
    await page.locator('[data-testid="title--input"]').fill("Original title");
    await page.locator('[data-testid="description--input"]').fill("Original description");
    await expect(sendContentMessage(page, { type: "RUN_WARDROBE_REWRITE_ITEM", itemId: "42", applyMode: "review", titleLanguageCode: "en", descriptionLanguageCode: "en" })).resolves.toMatchObject({ ok: false });
    await expect(page.locator('[data-testid="title--input"]')).toHaveValue("Original title");
    await expect(page.locator(".quickvint-wardrobe-review-card")).toHaveCount(0);
    await sendContentMessage(page, { type: "RUN_WARDROBE_REWRITE_ITEM", itemId: "42", applyMode: "review", titleLanguageCode: "en", descriptionLanguageCode: "en" });
    await sendContentMessage(page, { type: "RUN_WARDROBE_REWRITE_ITEM", itemId: "42", applyMode: "replace", titleLanguageCode: "en", descriptionLanguageCode: "en" });
    await expect(page.locator(".quickvint-wardrobe-review-card")).toHaveCount(0);
    await expect(page.locator("#quickvint-wardrobe-rewrite-result")).toHaveCount(1);
  });

  test("wardrobe review reattaches after a field wrapper rerender and stops after its timeout", async ({ page }) => {
    await page.route("https://autolister.app/api/events/track", (route) => route.fulfill({ status: 204, body: "" }));
    await page.route("https://autolister.app/api/generate", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ title: "New title", description: "New description" }) }));
    await openWardrobeEditHarness(page, "42", { shortenWardrobeTimers: true });
    await sendContentMessage(page, { type: "RUN_WARDROBE_REWRITE_ITEM", itemId: "42", applyMode: "review", titleLanguageCode: "en", descriptionLanguageCode: "en" });
    await page.locator('[data-testid="title--input"]').evaluate((input) => input.closest("div").replaceWith(input.closest("div").cloneNode(true)));
    await expect(page.getByRole("button", { name: "Use this title" })).toBeVisible();
    await page.waitForTimeout(250);
    await page.locator('[data-testid="title--input"]').evaluate((input) => input.closest("div").remove());
    await page.waitForTimeout(20);
    await expect(page.getByRole("button", { name: "Use this title" })).toHaveCount(0);
  });
});

test.describe("wardrobe rewrite progress", () => {
  test("updates the sticky controller and refreshes capacity without a batch modal", async ({ page }) => {
    await openWardrobeHarness(page, {
      capacityResponse: [
        { allowed: true, available: 2 },
        { allowed: true, available: 1 },
      ],
      wardrobeItems: wardrobeItemFixture({ id: "9443601541" }),
    });
    await enterWardrobeSelection(page);
    await expect(sendContentMessage(page, { type: "WARDROBE_REWRITE_PROGRESS", status: "generating", current: 1, total: 2 })).resolves.toEqual({ ok: true });
    await expect(page.locator(".quickvint-wardrobe-selection-feedback")).toHaveText("Rewriting 1 of 2…");
    await sendContentMessage(page, { type: "WARDROBE_REWRITE_PROGRESS", status: "done", current: 2, total: 2 });
    await expect(page.locator(".quickvint-wardrobe-selection-feedback")).toHaveText("2 listings ready");
    await expect(page.locator(".quickvint-wardrobe-rewrite-capacity")).toHaveText("1 listing available");
    await expect(page.locator("#quickvint-batch-modal")).toHaveCount(0);
  });
});

test.describe("own wardrobe rewrite widget", () => {
  test("waits for the profile to settle before changing its layout", async ({
    page,
  }) => {
    await openWardrobeHarness(page);

    await expect(page.locator("#quickvint-wardrobe-rewrite-widget")).toHaveCount(0);
    await expect(page.locator(".quickvint-wardrobe-rewrite-host")).toHaveCount(0);
    await expect(
      page.locator("#quickvint-wardrobe-rewrite-widget"),
    ).toBeVisible();
    expect(
      await page
        .locator(".quickvint-wardrobe-rewrite-host")
        .evaluate((host) =>
          host
            .getAnimations()
            .some((animation) => animation.playState === "running"),
        ),
    ).toBe(true);
  });

  test("animates the regular expand, collapse, and restore journey", async ({
    page,
  }) => {
    await openWardrobeHarness(page);

    const widget = page.locator("#quickvint-wardrobe-rewrite-widget");
    const host = page.locator(".quickvint-wardrobe-rewrite-host");
    await expect(widget).toBeVisible();
    const opening = await widget.boundingBox();
    const openingMotion = await widget.evaluate((element) => {
      const animation = element
        .getAnimations()
        .find((candidate) => candidate.playState === "running");
      const firstTransform = animation?.effect.getKeyframes()[0]?.transform || "";
      return {
        running: Boolean(animation),
        scale: Number.parseFloat(firstTransform.match(/scale\(([\d.]+)/)?.[1]),
      };
    });
    expect(openingMotion.running).toBe(true);
    expect(openingMotion.scale).toBeLessThan(0.6);
    await page.waitForTimeout(500);
    const before = await widget.boundingBox();
    expect(before.width).toBeGreaterThan(opening.width);

    const minimize = page.getByRole("button", {
      name: "Minimize rewrite listings",
    });
    const box = await minimize.boundingBox();
    expect(box.width).toBeGreaterThanOrEqual(40);
    expect(box.height).toBeGreaterThanOrEqual(40);
    await expect(minimize.locator("svg")).toBeVisible();
    await minimize.click();
    await page.waitForTimeout(100);
    const collapsedMidpoint = await widget.boundingBox();
    const collapseMotion = await page.evaluate(() => ({
      widget: document
        .querySelector("#quickvint-wardrobe-rewrite-widget")
        .getAnimations()
        .some((animation) => animation.playState === "running"),
      host: document
        .querySelector(".quickvint-wardrobe-rewrite-host")
        .getAnimations()
        .some((animation) => animation.playState === "running"),
      compactOpacity: Number.parseFloat(
        getComputedStyle(
          document.querySelector(".quickvint-wardrobe-rewrite-compact"),
        ).opacity,
      ),
    }));
    await page.waitForTimeout(400);
    const collapsed = await widget.boundingBox();

    expect(collapseMotion.widget).toBe(true);
    expect(collapseMotion.host).toBe(true);
    expect(collapsedMidpoint.width).toBeLessThan(before.width);
    expect(collapsedMidpoint.width).toBeGreaterThan(collapsed.width);
    expect(collapseMotion.compactOpacity).toBeGreaterThan(0);
    expect(collapseMotion.compactOpacity).toBeLessThan(1);

    await page.getByRole("button", { name: "Expand rewrite listings" }).click();
    await page.waitForTimeout(100);
    const expandedMidpoint = await widget.boundingBox();
    expect(expandedMidpoint.width).toBeGreaterThan(collapsed.width);
    expect(expandedMidpoint.width).toBeLessThan(before.width);
    await expect(host).toBeVisible();
  });

  test("applies state immediately when reduced motion is requested", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openWardrobeHarness(page);

    const widget = page.locator("#quickvint-wardrobe-rewrite-widget");
    expect(
      await widget.evaluate((element) =>
        element.getAnimations({ subtree: true }).length,
      ),
    ).toBe(0);

    await page.getByRole("button", { name: "Minimize rewrite listings" }).click();
    expect(
      await widget.evaluate((element) =>
        element.getAnimations({ subtree: true }).length,
      ),
    ).toBe(0);
    await expect(
      page.getByRole("button", { name: "Expand rewrite listings" }),
    ).toBeVisible();
  });

  test("docks unified availability above the wardrobe rewrite widget", async ({
    page,
  }) => {
    await openWardrobeHarness(page, {
      capacityResponse: { allowed: true, available: 12 },
    });
    const shell = page.locator(".quickvint-wardrobe-rewrite-shell");
    await expect(shell.locator(".quickvint-wardrobe-rewrite-capacity")).toHaveText(
      "12 listings available",
    );
    await expect(shell.locator(".quickvint-wardrobe-rewrite-cta")).toBeEnabled();
    await expect(shell).not.toContainText(/daily|monthly|credit/i);
  });

  test("asks how generated wardrobe copy should be handled without resizing", async ({
    page,
  }) => {
    await openWardrobeHarness(page);
    await waitForWardrobeMotionToFinish(page);
    const widget = page.locator("#quickvint-wardrobe-rewrite-widget");
    const before = await widget.boundingBox();

    await page.locator(".quickvint-wardrobe-rewrite-cta").click();
    await expect(
      page.getByText("What should happen to your new text?"),
    ).toBeVisible();
    await expect(
      page.locator('input[name="quickvint-wardrobe-apply-mode"]'),
    ).toHaveCount(2);
    await expect(page.locator(".quickvint-wardrobe-rewrite-continue")).toBeDisabled();
    await page.getByLabel("Review first").check();
    await expect(page.locator(".quickvint-wardrobe-rewrite-continue")).toBeEnabled();

    const after = await widget.boundingBox();
    expect(after.height).toBe(before.height);
    expect(after.width).toBe(before.width);
  });

  test("uses wardrobe preference navigation and selection instruction", async ({
    page,
  }) => {
    await openWardrobeHarness(page);
    await page.locator(".quickvint-wardrobe-rewrite-cta").click();
    await page.getByLabel("Replace immediately").check();
    await page.locator(".quickvint-wardrobe-rewrite-back").click();
    await expect(page.getByText("Let's rewrite your listings")).toBeVisible();

    await page.locator(".quickvint-wardrobe-rewrite-cta").click();
    await page.getByLabel("Replace immediately").check();
    await page.locator(".quickvint-wardrobe-rewrite-continue").click();
    await expect(page.getByRole("heading", { name: "Select listings below" })).toBeVisible();
    await expect(page.getByText("Your new title and description will replace the current ones.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Minimize rewrite listings" })).toBeHidden();

    await page.getByRole("button", { name: "Exit selection" }).click();
    await expect(page.getByText("Let's rewrite your listings")).toBeVisible();
  });

  test("keeps normal-motion wardrobe selection responsive after dynamic decoration", async ({ page }) => {
    await openWardrobeHarness(page, {
      capacityResponse: { allowed: true, available: 1 },
      wardrobeItems: wardrobeItemFixture({ id: "9443601541" }),
    });
    await enterWardrobeSelection(page);
    await expect(page.getByRole("button", { name: /Select Item 9443601541/ })).toBeVisible();
    await page.locator('[data-testid="feed-grid"]').evaluate((grid) => {
      grid.insertAdjacentHTML(
        "beforeend",
        `<div data-testid="grid-item"><div data-testid="product-item-id-8383838383"><div data-testid="product-item-id-8383838383--image"><img alt="Item 8383838383"></div><a data-testid="product-item-id-8383838383--overlay-link" href="/items/8383838383"></a></div></div>`,
      );
    });
    await expect(page.getByRole("button", { name: /Select Item 8383838383/ })).toBeVisible();
    expect(await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 0)))).toBeUndefined();
  });

  test("selects active and hidden wardrobe items but excludes sold items", async ({ page }) => {
    await openWardrobeHarness(page, {
      capacityResponse: { allowed: true, available: 2 },
      wardrobeItems: [
        wardrobeItemFixture({ id: "9443601541" }),
        wardrobeItemFixture({ id: "7563307251", status: "Hidden" }),
        wardrobeItemFixture({ id: "6361197692", status: "Sold" }),
      ].join(""),
    });
    await enterWardrobeSelection(page, "review");
    await expect(page.locator(".quickvint-wardrobe-select-item")).toHaveCount(2);
    await page.getByRole("button", { name: /Select Item 9443601541/ }).click();
    await page.getByRole("button", { name: /Select Item 7563307251/ }).click();
    await expect(page.locator(".quickvint-wardrobe-selection-count")).toHaveText(
      "2 selected",
    );
    await expect(page.locator('[data-testid="product-item-id-6361197692"] .quickvint-wardrobe-select-item')).toHaveCount(0);
    const overlay = page.getByRole("button", { name: /Unselect Item 9443601541/ });
    const image = page.locator('[data-testid="product-item-id-9443601541--image"]');
    const [overlayBox, imageBox] = await Promise.all([overlay.boundingBox(), image.boundingBox()]);
    expect(overlayBox.x).toBeLessThanOrEqual(imageBox.x);
    expect(overlayBox.y).toBeLessThanOrEqual(imageBox.y);
    expect(overlayBox.x + overlayBox.width).toBeGreaterThanOrEqual(
      imageBox.x + imageBox.width,
    );
    expect(overlayBox.y + overlayBox.height).toBeGreaterThanOrEqual(
      imageBox.y + imageBox.height,
    );
    await expect(overlay.locator(".quickvint-wardrobe-select-check")).toBeVisible();
    expect(
      await overlay.evaluate((node) => getComputedStyle(node).boxShadow),
    ).toContain("inset");
    await page.getByRole("button", { name: /Unselect Item 9443601541/ }).press("Enter");
    await expect(page.locator(".quickvint-wardrobe-selection-count")).toHaveText(
      "1 selected",
    );
    await page.getByRole("button", { name: /Select Item 9443601541/ }).click();
    await page.locator('[data-testid="feed-grid"]').evaluate(
      (grid, item) => grid.insertAdjacentHTML("beforeend", item),
      wardrobeItemFixture({ id: "1122334455" }),
    );
    await expect(page.getByRole("button", { name: /Select Item 1122334455/ })).toBeDisabled();
    expect(await page.evaluate(() => location.pathname)).toBe("/member/270830120");
  });

  test("dynamic wardrobe selection only decorates valid cards and respects motion and scroll preferences", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openWardrobeHarness(page, {
      wardrobeItems: [
        wardrobeItemFixture({ id: "9443601541" }),
        wardrobeItemFixture({ id: "7563307251" }).replace(
          'href="/items/7563307251"',
          'href="https://example.com/items/7563307251"',
        ),
        wardrobeItemFixture({ id: "6361197692" }).replace(
          'href="/items/6361197692"',
          'href="/items/999"',
        ),
      ].join(""),
    });
    await page.locator('[data-testid="feed-grid"]').evaluate((grid) => {
      grid.style.marginTop = "1600px";
    });
    await enterWardrobeSelection(page);
    await expect(page.locator(".quickvint-wardrobe-select-item")).toHaveCount(1);
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(1000);
    expect(
      await page.locator(".quickvint-wardrobe-select-item").evaluate((button) =>
        button.getAnimations().length,
      ),
    ).toBe(0);
    await page.locator('[data-testid="feed-grid"]').evaluate(
      (grid, item) => grid.insertAdjacentHTML("beforeend", item),
      wardrobeItemFixture({ id: "8383838383" }),
    );
    await expect(page.getByRole("button", { name: /Select Item 8383838383/ })).toBeVisible();
  });

  test("wardrobe controller renders sticky controls, persists languages, and starts the selected listing", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openWardrobeHarness(page, {
      capacityResponse: [
        { allowed: true, available: 2 },
        { allowed: true, available: 2 },
        { allowed: true, available: 1 },
      ],
      wardrobeItems: wardrobeItemFixture({ id: "9443601541" }),
      initialStorage: {
        selectedTitleLanguage: "en",
        selectedDescriptionLanguage: "nl",
        __startWardrobeDelayMs: 120,
      },
    });
    await enterWardrobeSelection(page);
    const controller = page.locator(".quickvint-wardrobe-selection-controller");
    expect(await controller.evaluate((node) => getComputedStyle(node).position)).toBe("sticky");
    expect(await controller.evaluate((node) => node.nextElementSibling?.dataset.testid)).toBe("feed-grid");
    for (const target of await controller.locator(
      ".quickvint-lang-trigger, .quickvint-wardrobe-selection-actions button",
    ).all()) {
      expect((await target.boundingBox()).height).toBeGreaterThanOrEqual(40);
    }
    await expect(page.getByLabel("Title language")).toHaveAttribute("data-value", "en");
    await expect(page.getByLabel("Description language")).toHaveAttribute("data-value", "nl");
    await page.evaluate(() =>
      chrome.storage.local.set({
        selectedTitleLanguage: "de",
        selectedDescriptionLanguage: "fr",
      }),
    );
    await expect(page.getByLabel("Title language")).toHaveAttribute("data-value", "de");
    await expect(page.getByLabel("Description language")).toHaveAttribute("data-value", "fr");
    await expect(page.getByRole("button", { name: "Start rewrite" })).toBeDisabled();
    await page.getByLabel("Title language").click();
    await page.locator(".quickvint-wardrobe-title-language-slot .quickvint-lang-option[data-value='nl']").click();
    await expect.poll(() => page.evaluate(() => window.__extensionHarness.storage.selectedTitleLanguage)).toBe("nl");
    await page.getByRole("button", { name: /Select Item 9443601541/ }).click();
    await page.evaluate(() => {
      const originalSetInterval = window.setInterval.bind(window);
      window.setInterval = (callback, delay, ...args) =>
        originalSetInterval(callback, delay === 20 * 1000 ? 25 : delay, ...args);
    });
    await page.getByRole("button", { name: "Start rewrite" }).click();
    await expect(page.locator(".quickvint-wardrobe-selection-feedback")).toHaveText("Preparing your listings…");
    await expectWardrobeSelectionControlsDisabled(page, true);
    await expect.poll(() => page.evaluate(() =>
      window.__extensionHarness.runtimeMessages.find(
        (message) => message?.type === "START_WARDROBE_REWRITE",
      ),
    )).toEqual({
      type: "START_WARDROBE_REWRITE",
      items: [
        { id: "9443601541", editUrl: "https://www.vinted.nl/items/9443601541/edit" },
      ],
      applyMode: "review",
      titleLanguageCode: "nl",
      descriptionLanguageCode: "fr",
    });
    await expect.poll(() => page.evaluate(() =>
      window.__extensionHarness.runtimeMessages.some(
        (message) => message?.type === "QUICKVINT_TAB_JOB_HEARTBEAT",
      ),
    )).toBe(true);
    await sendContentMessage(page, {
      type: "WARDROBE_REWRITE_PROGRESS",
      status: "running",
      current: 1,
      total: 1,
    });
    await expect(page.locator(".quickvint-wardrobe-selection-feedback")).toHaveText(
      "Rewriting 1 of 1…",
    );
    await page.getByRole("button", { name: "Exit selection" }).dispatchEvent("click");
    await expect(controller).toBeVisible();
    await sendContentMessage(page, {
      type: "WARDROBE_REWRITE_PROGRESS",
      status: "failed",
      current: 1,
      total: 1,
      message: "Exact generation failure",
    });
    await expect(page.locator(".quickvint-wardrobe-selection-feedback")).toHaveText(
      "Exact generation failure",
    );
    await expect(page.getByRole("button", { name: "Cancel" })).toBeEnabled();
    await expect(page.locator(".quickvint-wardrobe-rewrite-capacity")).toHaveText(
      "1 listing available",
    );
  });

  test("shows preparation and restores wardrobe selection after an exact start rejection", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openWardrobeHarness(page, {
      capacityResponse: { allowed: true, available: 2 },
      wardrobeItems: wardrobeItemFixture({ id: "9443601541" }),
      initialStorage: {
        __startWardrobeDelayMs: 80,
        __startWardrobeResponse: { ok: false, error: "Background rejected this rewrite." },
      },
    });
    await enterWardrobeSelection(page);
    await page.getByRole("button", { name: /Select Item 9443601541/ }).click();
    await page.getByRole("button", { name: "Start rewrite" }).click();
    await expect(page.locator(".quickvint-wardrobe-selection-feedback")).toHaveText("Preparing your listings…");
    await expectWardrobeSelectionControlsDisabled(page, true);
    await page.getByRole("button", { name: "Cancel" }).dispatchEvent("click");
    await expect(page.locator(".quickvint-wardrobe-selection-controller")).toBeVisible();
    await expect(page.locator(".quickvint-wardrobe-selection-feedback")).toHaveText(
      "Background rejected this rewrite.",
    );
    await expectWardrobeSelectionControlsDisabled(page, false);
  });

  test("failed fresh wardrobe capacity restores selection without starting", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openWardrobeHarness(page, {
      capacityResponse: [
        { allowed: true, available: 2 },
        { allowed: false, available: 0, error: "Exact capacity service error." },
      ],
      wardrobeItems: wardrobeItemFixture({ id: "9443601541" }),
    });
    await enterWardrobeSelection(page);
    await page.getByRole("button", { name: /Select Item 9443601541/ }).click();
    await page.getByRole("button", { name: "Start rewrite" }).click();

    await expect(page.locator(".quickvint-wardrobe-selection-feedback")).toHaveText(
      "Exact capacity service error.",
    );
    await expect(page.locator("#quickvint-toast.error")).toContainText(
      "Exact capacity service error.",
    );
    await expectWardrobeSelectionControlsDisabled(page, false);
    expect(
      await page.evaluate(() =>
        window.__extensionHarness.runtimeMessages.some(
          (message) => message?.type === "START_WARDROBE_REWRITE",
        ),
      ),
    ).toBe(false);
  });

  test("wardrobe selection refreshes capacity before start and cleans up on Exit and pagehide", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openWardrobeHarness(page, {
      capacityResponse: [
        { allowed: true, available: 2 },
        { allowed: true, available: 0 },
      ],
      wardrobeItems: wardrobeItemFixture({ id: "9443601541" }),
    });
    await enterWardrobeSelection(page);
    await page.getByRole("button", { name: /Select Item 9443601541/ }).click();
    await page.getByRole("button", { name: "Start rewrite" }).click();
    await expect(page.locator(".quickvint-wardrobe-selection-feedback")).toHaveText(
      "Deselect to the new maximum of 0.",
    );
    expect(
      await page.evaluate(() =>
        window.__extensionHarness.runtimeMessages.some(
          (message) => message?.type === "START_WARDROBE_REWRITE",
        ),
      ),
    ).toBe(false);
    await page.getByRole("button", { name: "Exit selection" }).click();
    await expect(page.locator(".quickvint-wardrobe-selection-controller")).toHaveCount(0);
    await expect(page.locator(".quickvint-wardrobe-select-item")).toHaveCount(0);
  });

  test("cleans a re-entered wardrobe selection up on pagehide", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openWardrobeHarness(page, {
      capacityResponse: { allowed: true, available: 2 },
      wardrobeItems: wardrobeItemFixture({ id: "9443601541" }),
    });
    await enterWardrobeSelection(page);
    await page.getByRole("button", { name: "Exit selection" }).click();
    await enterWardrobeSelection(page);
    await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent("pagehide")));
    await expect(page.locator(".quickvint-wardrobe-selection-controller")).toHaveCount(0);
    await expect(page.locator(".quickvint-wardrobe-select-item")).toHaveCount(0);
  });

  test("cleans wardrobe selection when SPA ownership changes or its widget disconnects", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openWardrobeHarness(page, {
      capacityResponse: { allowed: true, available: 2 },
      wardrobeItems: wardrobeItemFixture({ id: "9443601541" }),
    });
    await enterWardrobeSelection(page);
    await page.evaluate(() => history.pushState({}, "", "/member/999"));
    await expect(page.locator(".quickvint-wardrobe-selection-controller")).toHaveCount(0);
    await expect(page.locator(".quickvint-wardrobe-select-item")).toHaveCount(0);
    await expect(page.locator(".quickvint-wardrobe-rewrite-shell")).toHaveCount(0);

    await openWardrobeHarness(page, {
      capacityResponse: { allowed: true, available: 2 },
      wardrobeItems: wardrobeItemFixture({ id: "9443601541" }),
    });
    await enterWardrobeSelection(page);
    await page.locator("#quickvint-wardrobe-rewrite-widget").evaluate((widget) => widget.remove());
    await expect(page.locator(".quickvint-wardrobe-selection-controller")).toHaveCount(0);
    await expect(page.locator(".quickvint-wardrobe-select-item")).toHaveCount(0);
    await expect(page.locator(".quickvint-wardrobe-rewrite-shell")).toHaveCount(0);
  });

  test("does not start from a page-hidden wardrobe selection after capacity resolves", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openWardrobeHarness(page, {
      capacityResponse: [
        { allowed: true, available: 2 },
        { allowed: true, available: 2, delayMs: 100 },
      ],
      wardrobeItems: wardrobeItemFixture({ id: "9443601541" }),
    });
    await enterWardrobeSelection(page);
    await page.getByRole("button", { name: /Select Item 9443601541/ }).click();
    await page.getByRole("button", { name: "Start rewrite" }).click();
    await expect(page.getByRole("button", { name: "Exit selection" })).toBeDisabled();
    await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent("pagehide")));
    await page.waitForTimeout(150);
    expect(
      await page.evaluate(() =>
        window.__extensionHarness.runtimeMessages.some(
          (message) => message?.type === "START_WARDROBE_REWRITE",
        ),
      ),
    ).toBe(false);
    await expect(page.locator(".quickvint-wardrobe-selection-controller")).toHaveCount(0);
    await expect(page.locator(".quickvint-wardrobe-select-item")).toHaveCount(0);
  });

  test("keeps wardrobe preference fixed and keyboard-accessible on narrow reduced-motion screens", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 390, height: 900 });
    await openWardrobeHarness(page);
    const widget = page.locator("#quickvint-wardrobe-rewrite-widget");

    await page.locator(".quickvint-wardrobe-rewrite-cta").click();
    await expect(widget).toHaveCSS("height", "148px");
    await page.getByLabel("Replace immediately").focus();
    await page.keyboard.press("ArrowDown");
    await expect(page.getByLabel("Review first")).toBeChecked();
    await page.locator(".quickvint-wardrobe-rewrite-continue").focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("heading", { name: "Select listings below" })).toBeVisible();
    expect(
      await widget.evaluate((element) => element.getAnimations({ subtree: true }).length),
    ).toBe(0);
  });

  test("keeps wardrobe preference touch targets usable at desktop and narrow widths", async ({
    page,
  }) => {
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 900 });
      await openWardrobeHarness(page);
      await page.locator(".quickvint-wardrobe-rewrite-cta").click();

      for (const target of [
        page.getByLabel("Replace immediately").locator("..").first(),
        page.getByLabel("Review first").locator("..").first(),
        page.locator(".quickvint-wardrobe-rewrite-back"),
        page.locator(".quickvint-wardrobe-rewrite-continue"),
      ]) {
        expect((await target.boundingBox()).height).toBeGreaterThanOrEqual(39.5);
      }

      await page.getByLabel("Review first").check();
      await page.locator(".quickvint-wardrobe-rewrite-continue").click();
      expect(
        (await page.locator(".quickvint-wardrobe-rewrite-exit").boundingBox()).height,
      ).toBeGreaterThanOrEqual(40);
    }
  });

  test("retries a failed capacity lookup for wardrobe without showing a stale number", async ({
    page,
  }) => {
    await openWardrobeHarness(page, {
      capacityResponse: [
        { runtimeError: "Connection issue." },
        { allowed: true, available: 8 },
      ],
    });
    const capacity = page.locator(".quickvint-wardrobe-rewrite-capacity");
    await expect(capacity).toContainText("Availability unavailable");
    await expect(capacity).not.toContainText(/\d+ listings?/);
    await page.locator(".quickvint-wardrobe-rewrite-capacity-retry").click();
    await expect(capacity).toHaveText("8 listings available");
  });

  test("enables the real wardrobe rewrite CTA across availability states", async ({
    page,
  }) => {
    await openWardrobeHarness(page, { capacityResponse: { allowed: true, available: 1 } });
    const shell = page.locator(".quickvint-wardrobe-rewrite-shell");
    const capacity = shell.locator(".quickvint-wardrobe-rewrite-capacity");
    const cta = shell.locator(".quickvint-wardrobe-rewrite-cta");
    await expect(capacity).toHaveText("1 listing available");
    await waitForWardrobeMotionToFinish(page);
    await expect(cta).toBeEnabled();
    expect((await cta.boundingBox()).height).toBeGreaterThanOrEqual(40);
    const [widgetBox, ctaBox] = await Promise.all([
      page.locator("#quickvint-wardrobe-rewrite-widget").boundingBox(),
      cta.boundingBox(),
    ]);
    expect(ctaBox.y).toBeGreaterThanOrEqual(widgetBox.y);
    expect(ctaBox.y + ctaBox.height).toBeLessThanOrEqual(
      widgetBox.y + widgetBox.height,
    );
    await cta.focus();
    await expect(cta).toBeFocused();
    expect(await cta.evaluate((element) => getComputedStyle(element).outlineStyle)).not.toBe("none");

    await page.setViewportSize({ width: 390, height: 900 });
    await expect(page.locator("#quickvint-wardrobe-rewrite-widget")).toHaveCSS("height", "148px");
    await page.setViewportSize({ width: 1440, height: 900 });
    await expect(page.locator("#quickvint-wardrobe-rewrite-widget")).toHaveCSS("height", "176px");
    await page.getByRole("button", { name: "Minimize rewrite listings" }).click();
    await expect(shell.locator(".quickvint-wardrobe-rewrite-capacity")).toBeVisible();
  });

  test("shows zero and signed-out wardrobe availability states", async ({ page }) => {
    await openWardrobeHarness(page, { capacityResponse: { allowed: true, available: 0 } });
    await expect(page.locator(".quickvint-wardrobe-rewrite-capacity")).toHaveText(
      "0 listings available",
    );
    await expect(page.locator(".quickvint-wardrobe-rewrite-cta")).toBeEnabled();

    await openWardrobeHarness(page, { signedIn: false });
    await expect(page.locator(".quickvint-wardrobe-rewrite-capacity")).toHaveText(
      "Sign in to check availability",
    );
  });

  test("collapses to a reachable trigger and remembers the choice", async ({
    page,
  }) => {
    await openWardrobeHarness(page);

    await page.getByRole("button", { name: "Minimize rewrite listings" }).click();
    await expect(
      page.getByRole("button", { name: "Expand rewrite listings" }),
    ).toBeVisible();
    await expect(page.getByText("Refresh your titles and descriptions")).toBeHidden();
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            window.__extensionHarness.storage.quickvintWardrobeRewriteCollapsed,
        ),
      )
      .toBe(true);

    await page.getByRole("button", { name: "Expand rewrite listings" }).click();
    await expect(page.getByText("Let's rewrite your listings")).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            window.__extensionHarness.storage.quickvintWardrobeRewriteCollapsed,
        ),
      )
      .toBe(false);

    await page.evaluate(() =>
      document
        .querySelector('[data-testid="profile-location-info"]')
        .append(document.createElement("span")),
    );
    await expect(page.locator("#quickvint-wardrobe-rewrite-widget")).toHaveCount(1);
  });

  test("restores the compact trigger when it was previously minimized", async ({
    page,
  }) => {
    await openWardrobeHarness(page, { collapsed: true });

    await expect(
      page.getByRole("button", { name: "Expand rewrite listings" }),
    ).toBeVisible();
    await expect(page.getByText("Let's rewrite your listings")).toBeHidden();
    const widget = page.locator("#quickvint-wardrobe-rewrite-widget");
    expect((await widget.boundingBox()).width).toBeLessThanOrEqual(220);
    expect(
      await widget.evaluate(
        (element) => element.getAnimations({ subtree: true }).length,
      ),
    ).toBe(0);
  });

  test("stays legible across profile viewports with badges", async ({ page }) => {
    for (const viewport of [
      { width: 1440, sideBySide: true, compactCopy: false },
      { width: 900, sideBySide: false, compactCopy: false },
      { width: 390, sideBySide: false, compactCopy: true },
    ]) {
      await page.setViewportSize({ width: viewport.width, height: 900 });
      await openWardrobeHarness(page, { extraBadges: true });

      const widget = page.locator("#quickvint-wardrobe-rewrite-widget");
      const details = page.locator(
        ".profile-details > .web_ui__Cell__content",
      );
      await expect(widget).toBeVisible();
      await expect(page.getByText("Professional seller")).toBeVisible();
      if (!viewport.compactCopy) await expectNoHorizontalOverflow(page);

      const [widgetBox, detailsBox] = await Promise.all([
        widget.boundingBox(),
        details.boundingBox(),
      ]);
      expect(widgetBox).not.toBeNull();
      expect(detailsBox).not.toBeNull();
      expect(widgetBox.x).toBeGreaterThanOrEqual(0);
      expect(widgetBox.x + widgetBox.width).toBeLessThanOrEqual(
        viewport.width + 1,
      );
      if (viewport.sideBySide) {
        expect(widgetBox.x).toBeGreaterThanOrEqual(
          detailsBox.x + detailsBox.width - 1,
        );
      } else {
        expect(widgetBox.y).toBeGreaterThanOrEqual(
          detailsBox.y + detailsBox.height - 1,
        );
      }

      const supportingCopy = page.getByText(
        "Refresh your titles and descriptions without starting over.",
      );
      if (viewport.compactCopy) await expect(supportingCopy).toBeHidden();
      else await expect(supportingCopy).toBeVisible();
    }
  });

  test("hides the rewrite widget outside an authenticated own profile", async ({
    page,
  }) => {
    for (const scenario of [
      { currentUserId: "123" },
      { currentUserId: null },
      { login: true },
      { follow: true },
    ]) {
      await openWardrobeHarness(page, scenario);

      await expect(page.locator("#quickvint-wardrobe-rewrite-widget")).toHaveCount(0);
    }
  });
});
