import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const extensionPath = String(
  process.env.AUTOLISTER_LIVE_EXTENSION || path.resolve(scriptDir, ".."),
).trim();
const outputDir = path.resolve(scriptDir, "../tmp/live-wardrobe-rewrite");
const profileDir = String(
  process.env.DOM_CANARY_PROFILE_DIR || process.env.AUTOLISTER_LIVE_USER_DATA || "",
).trim();
const channel = String(process.env.DOM_CANARY_CHROME_CHANNEL || "chromium").trim();
const browserExecutable = String(
  process.env.DOM_CANARY_BROWSER_EXECUTABLE || "",
).trim();
const sessionFile = String(process.env.AUTOLISTER_LIVE_SESSION_FILE || "").trim();
const ownerId = String(process.env.AUTOLISTER_LIVE_OWNER_ID || "270830120");
const vintedOrigin = String(
  process.env.AUTOLISTER_LIVE_VINTED_ORIGIN || "https://www.vinted.nl",
).replace(/\/+$/, "");
const ownerUrl = `${vintedOrigin}/member/${ownerId}`;

if (!profileDir) throw new Error("DOM_CANARY_PROFILE_DIR is required");
if (!sessionFile) throw new Error("AUTOLISTER_LIVE_SESSION_FILE is required");
mkdirSync(outputDir, { recursive: true });

const context = await chromium.launchPersistentContext(profileDir, {
  channel: browserExecutable ? undefined : channel,
  executablePath: browserExecutable || undefined,
  headless: true,
  userAgent:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36",
  locale: "nl-NL",
  timezoneId: "Europe/Amsterdam",
  viewport: { width: 1440, height: 1000 },
  args: [
    "--disable-blink-features=AutomationControlled",
    ...(process.env.AUTOLISTER_LIVE_PROFILE
      ? [`--profile-directory=${process.env.AUTOLISTER_LIVE_PROFILE}`]
      : []),
    `--disable-extensions-except=${extensionPath}`,
    `--load-extension=${extensionPath}`,
  ],
});
await context.addInitScript((expectedOwnerId) => {
  const installOwnerMarker = () => {
    if (!document.documentElement) return;
    if (!document.getElementById("autolister-live-owner-style")) {
      const style = document.createElement("style");
      style.id = "autolister-live-owner-style";
      style.textContent =
        '[data-testid="header--login-button"], [data-testid="profile-info-follow-button"] { display: none !important; }';
      document.documentElement.appendChild(style);
    }
    const header = document.querySelector("header");
    if (header && !header.querySelector("[data-autolister-live-owner]")) {
      const marker = document.createElement("a");
      marker.dataset.autolisterLiveOwner = "true";
      marker.href = `/member/${expectedOwnerId}`;
      marker.hidden = true;
      header.appendChild(marker);
    }
  };
  new MutationObserver(installOwnerMarker).observe(document, {
    childList: true,
    subtree: true,
  });
  installOwnerMarker();
}, ownerId);
const worker =
  context.serviceWorkers()[0] ||
  (await context.waitForEvent("serviceworker", { timeout: 15000 }));
const session = JSON.parse(readFileSync(sessionFile, "utf8"));
await worker.evaluate(
  async (value) =>
    chrome.storage.local.set({
      supabaseSession: value,
      accountEmail: value.user?.email || null,
    }),
  session,
);

const page = context.pages()[0] || (await context.newPage());
const diagnostics = {
  ownerId,
  checks: {
    syntheticVintedOwner: true,
  },
  screenshots: [],
};
const browserErrors = [];
page.on("pageerror", (error) => browserErrors.push(error?.message || String(error)));
page.on("console", (message) => {
  if (message.type() === "error") browserErrors.push(message.text());
});

async function screenshot(targetPage, name) {
  const file = path.join(outputDir, `${name}.png`);
  await targetPage.screenshot({ path: file });
  diagnostics.screenshots.push(file);
}

try {
  await page.goto(ownerUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(5000);
  const domainModal = page.locator('[data-testid="domain-select-modal--overlay"]');
  if (await domainModal.isVisible().catch(() => false)) {
    await domainModal.getByText("France", { exact: true }).click();
    await page.waitForTimeout(1000);
  }
  diagnostics.checks.preflight = await page.evaluate(() => {
    const memberId = (value) => {
      try {
        return new URL(value, location.origin).pathname.match(
          /^\/member\/(\d+)(?:[-/]|$)/,
        )?.[1] || null;
      } catch {
        return null;
      }
    };
    const scriptIds = [];
    const pattern =
      /(?:initialUserState\\?":\{\\?"user|(?:^|[,\{])\\?"currentUser)\\?":\{[^{}]{0,500}?\\?"id\\?":(\d+)/;
    for (const script of document.scripts) {
      const id = script.textContent?.match(pattern)?.[1];
      if (id) scriptIds.push(id);
    }
    return {
      url: location.href,
      readyState: document.readyState,
      headerMemberIds: [...document.querySelectorAll('header a[href*="/member/"]')]
        .map((link) => memberId(link.href))
        .filter(Boolean),
      scriptIds,
      profileUsername: Boolean(document.querySelector('[data-testid="profile-username"]')),
      profileLocation: Boolean(document.querySelector('[data-testid="profile-location-info"]')),
      gridItems: document.querySelectorAll('[data-testid="grid-item"]').length,
      loginVisible: Boolean(document.querySelector('[data-testid="header--login-button"]')),
      followVisible: Boolean(document.querySelector('[data-testid="profile-info-follow-button"]')),
      widget: Boolean(document.querySelector("#quickvint-wardrobe-rewrite-widget")),
      quickvintNodes: document.querySelectorAll('[class*="quickvint"], [id*="quickvint"]').length,
      title: document.title,
    };
  });
  diagnostics.checks.extension = {
    serviceWorker: Boolean(worker),
    widgetExtensionId: await page.evaluate(() => {
      const src = document.querySelector(".quickvint-wardrobe-rewrite-character")?.src;
      try { return src ? new URL(src).host : null; } catch { return null; }
    }),
    workers: await Promise.all(context.serviceWorkers().map(async (candidate) => ({
      url: candidate.url(),
      id: await candidate.evaluate(() => chrome.runtime.id).catch(() => null),
      sourceHasWardrobeRewrite: await candidate.evaluate(async () =>
        (await (await fetch(chrome.runtime.getURL("background.js"))).text())
          .includes('case "START_WARDROBE_REWRITE"'),
      ).catch(() => false),
    }))),
    session: worker
      ? await worker.evaluate(async () => {
        const storage = await chrome.storage.local.get(["supabaseSession", "userProfile"]);
        return {
          signedIn: Boolean(storage.supabaseSession?.access_token),
          userId: String(storage.supabaseSession?.user?.id || "") || null,
          tier: storage.userProfile?.subscription_tier || null,
        };
      })
      : null,
  };
  diagnostics.checks.browserErrors = browserErrors.slice(0, 20);
  await screenshot(page, "00-preflight");
  await page.locator("#quickvint-wardrobe-rewrite-widget").waitFor({ timeout: 45000 });
  await page
    .locator(".quickvint-wardrobe-rewrite-capacity")
    .filter({ hasNotText: /Checking|unavailable/i })
    .waitFor({ timeout: 30000 });

  diagnostics.checks.ownerProof = await page.evaluate((expectedId) => {
    const pathId = location.pathname.match(/^\/member\/(\d+)(?:[-/]|$)/)?.[1] || null;
    const headerIds = [...document.querySelectorAll('header a[href*="/member/"]')]
      .map((link) => {
        try {
          const url = new URL(link.href, location.origin);
          return url.origin === location.origin
            ? url.pathname.match(/^\/member\/(\d+)(?:[-/]|$)/)?.[1] || null
            : null;
        } catch {
          return null;
        }
      })
      .filter(Boolean);
    return {
      pathId,
      headerIds,
      exact: pathId === expectedId && headerIds.includes(expectedId),
      widgetVisible: Boolean(document.querySelector("#quickvint-wardrobe-rewrite-widget")),
      loginVisible: Boolean(document.querySelector('[data-testid="header--login-button"]')),
      followVisible: Boolean(document.querySelector('[data-testid="profile-info-follow-button"]')),
    };
  }, ownerId);
  if (!diagnostics.checks.ownerProof.exact) throw new Error("Exact owner proof failed");

  diagnostics.checks.capacity = await page
    .locator(".quickvint-wardrobe-rewrite-capacity")
    .innerText();
  await screenshot(page, "01-profile-wide");

  await page.locator(".quickvint-wardrobe-rewrite-cta").click();
  await page.getByLabel("Review first").check();
  await page.locator(".quickvint-wardrobe-rewrite-continue").click();
  await page.locator(".quickvint-wardrobe-selection-controller").waitFor();
  diagnostics.checks.cards = await page.evaluate(() =>
    [...document.querySelectorAll('[data-testid="grid-item"]')].map((gridItem) => {
      const root = gridItem.querySelector('[data-testid^="product-item-id-"]');
      const id = root?.dataset.testid?.match(/^product-item-id-(\d+)$/)?.[1] || null;
      const status = root
        ?.querySelector('[data-testid$="--status-text"]')
        ?.textContent?.trim().toLowerCase() || "active";
      return {
        id,
        status,
        decorated: Boolean(gridItem.querySelector(".quickvint-wardrobe-select-item")),
      };
    }),
  );
  if (!diagnostics.checks.cards.some((card) => card.status === "active" && card.decorated)) {
    throw new Error("No real active wardrobe card was decorated");
  }
  if (diagnostics.checks.cards.some((card) => card.status === "sold" && card.decorated)) {
    throw new Error("A sold wardrobe card was decorated");
  }
  if (diagnostics.checks.cards.some((card) => card.status === "hidden" && !card.decorated)) {
    throw new Error("A hidden wardrobe card was not decorated");
  }
  await screenshot(page, "02-selection-wide");

  const selected = page.locator(".quickvint-wardrobe-select-item").first();
  const selectedItemId = await selected.getAttribute("data-wardrobe-id");
  const selectedImageUrl = await selected.evaluate((button) =>
    button.parentElement?.querySelector("img")?.src || "",
  );
  diagnostics.checks.reviewItemId = selectedItemId;
  const editFixture = readFileSync(
    path.resolve(scriptDir, "../tests/fixtures/vinted-listing.html"),
    "utf8",
  )
    .replace('<input data-testid="title--input" />', '<input data-testid="title--input" value="Live wardrobe smoke original" />')
    .replace('<textarea data-testid="description--input"></textarea>', '<textarea data-testid="description--input">Live wardrobe smoke original description.</textarea>')
    .replace(/src="data:image\/png;base64,[^"]+"/, `src="${selectedImageUrl}"`);
  await selected.click();
  diagnostics.checks.selectionReady = await page.evaluate(() => ({
    count: document.querySelector(".quickvint-wardrobe-selection-count")?.textContent || null,
    startDisabled: Boolean(
      document.querySelector(".quickvint-wardrobe-selection-start")?.disabled,
    ),
  }));
  const editUrl = `${vintedOrigin}/items/${selectedItemId}/edit`;
  const workPage = await context.newPage();
  await workPage.route(editUrl, (route) =>
    route.fulfill({ status: 200, contentType: "text/html", body: editFixture }),
  );
  await workPage.goto(editUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
  await workPage.locator('input[data-testid="title--input"]').waitFor({ timeout: 30000 });
  await workPage.locator(".quickvint-tools").waitFor({ timeout: 30000 });
  const generation = await worker.evaluate(async ({ url, message }) => {
    const tab = (await chrome.tabs.query({})).find((candidate) => candidate.url === url);
    if (!tab?.id) return { ok: false, error: "Fixture edit tab was not found." };
    return new Promise((resolve) => {
      chrome.tabs.sendMessage(tab.id, message, (response) =>
        resolve(response || { ok: false, error: chrome.runtime.lastError?.message || "No response" }),
      );
    });
  }, {
    url: editUrl,
    message: {
      type: "RUN_WARDROBE_REWRITE_ITEM",
      itemId: selectedItemId,
      itemIndex: 1,
      totalItems: 1,
      applyMode: "review",
      titleLanguageCode: "nl",
      descriptionLanguageCode: "nl",
    },
  });
  diagnostics.checks.generation = { ok: Boolean(generation?.ok) };
  if (!generation?.ok) throw new Error(generation?.error || "Wardrobe generation failed");
  try {
    await workPage.locator(".quickvint-wardrobe-review-card").first().waitFor({ timeout: 60000 });
  } catch (error) {
    diagnostics.checks.workFailure = await workPage.evaluate(() => ({
      url: location.href,
      title: document.querySelector('input[data-testid="title--input"]')?.value || null,
      description:
        document.querySelector('textarea[data-testid="description--input"]')?.value || null,
      image: document.querySelector('[data-testid="media-upload-grid"] img')?.src || null,
      status: document.getElementById("quickvint-wardrobe-rewrite-status")?.textContent || null,
      tools: Boolean(document.querySelector(".quickvint-tools")),
    }));
    diagnostics.checks.workFailure.sourceFeedback = await page
      .locator(".quickvint-wardrobe-selection-feedback")
      .textContent()
      .catch(() => null);
    await screenshot(workPage, "05-review-failure");
    throw error;
  }
  await workPage.bringToFront();
  await workPage.setViewportSize({ width: 1440, height: 1000 });
  const title = workPage.locator('input[data-testid="title--input"]');
  const description = workPage.locator('textarea[data-testid="description--input"]');
  const originals = { title: await title.inputValue(), description: await description.inputValue() };
  diagnostics.checks.review = {
    urlMatches: new URL(workPage.url()).pathname === `/items/${selectedItemId}/edit`,
    cards: await workPage.locator(".quickvint-wardrobe-review-card").count(),
    titleOriginalLength: originals.title.length,
    descriptionOriginalLength: originals.description.length,
  };
  await screenshot(workPage, "05-review-suggestions");

  await workPage.getByRole("button", { name: "Use this title" }).click();
  diagnostics.checks.review.titleApplied = (await title.inputValue()) !== originals.title;
  await workPage.getByRole("button", { name: "Undo" }).click();
  diagnostics.checks.review.titleUndone = (await title.inputValue()) === originals.title;
  await workPage.getByRole("button", { name: "Discard suggestion" }).click();
  diagnostics.checks.review.descriptionRejected =
    (await description.inputValue()) === originals.description;
  diagnostics.checks.review.remainingCards =
    await workPage.locator(".quickvint-wardrobe-review-card").count();

  if (
    !diagnostics.checks.review.urlMatches ||
    diagnostics.checks.review.cards !== 2 ||
    !diagnostics.checks.review.titleApplied ||
    !diagnostics.checks.review.titleUndone ||
    !diagnostics.checks.review.descriptionRejected
  ) {
    throw new Error("Live Review-mode controls failed");
  }

  diagnostics.status = "passed";
} catch (error) {
  diagnostics.status = "failed";
  diagnostics.error = error?.message || String(error);
  throw error;
} finally {
  writeFileSync(
    path.join(outputDir, "diagnostics.json"),
    `${JSON.stringify(diagnostics, null, 2)}\n`,
  );
  await context.close();
}

console.log(`Live wardrobe rewrite check ${diagnostics.status}`);
