import { readFileSync, mkdirSync, writeFileSync, renameSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const scriptPath = fileURLToPath(import.meta.url);
const extensionPath = path.resolve(path.dirname(scriptPath), "..");

export const selectors = {
  title: 'input[data-testid="title--input"]',
  description: 'textarea[data-testid="description--input"]',
  fileInput:
    '[data-testid="media-upload"] input[data-testid="add-photos-input"][type="file"], input[data-testid="add-photos-input"][type="file"], input[type="file"][name="photos"]',
  generateButton: "#quickvint-gen-btn",
  signInButton: "#quickvint-signin-btn",
  phoneButton: "#quickvint-phone-btn",
  titleLanguage: "#quickvint-title-language-select",
  descriptionLanguage: "#quickvint-description-language-select",
  tools: ".quickvint-tools",
};

export function getConfig(env = process.env) {
  const secret = String(env.DOM_CANARY_SECRET || "").trim();
  const profileDir = String(env.DOM_CANARY_PROFILE_DIR || "").trim();
  if (!secret) throw new Error("DOM_CANARY_SECRET is required");
  if (!profileDir) throw new Error("DOM_CANARY_PROFILE_DIR is required");

  const apiBaseUrl = String(
    env.DOM_CANARY_API_BASE_URL || env.API_BASE_URL || "https://autolister.app",
  ).replace(/\/+$/, "");

  return {
    secret,
    profileDir,
    url: env.DOM_CANARY_URL || "https://www.vinted.fr/items/new",
    apiUrl: `${apiBaseUrl}/api/dom-canary`,
    headless: env.DOM_CANARY_HEADED !== "1",
    channel: env.DOM_CANARY_CHROME_CHANNEL || "chromium",
    timeoutMs: Number(env.DOM_CANARY_TIMEOUT_MS || 45000),
    postResult: env.DOM_CANARY_NO_POST !== "1",
    keepOpenMs: Number(env.DOM_CANARY_KEEP_OPEN_MS || 0),
    executablePath: env.DOM_CANARY_BROWSER_EXECUTABLE || "",
    profileDirectory: env.DOM_CANARY_PROFILE_DIRECTORY || "",
    extensionPath: env.DOM_CANARY_EXTENSION_PATH || extensionPath,
    resultPath: env.DOM_CANARY_RESULT_PATH || "",
  };
}

export function buildCanaryPayload({
  status,
  now = new Date(),
  url = "",
  path = "",
  extensionVersion = "",
  result = {},
  selectors = {},
}) {
  return {
    check: "vinted_listing_field_injection",
    status,
    occurredAt: now.toISOString(),
    url,
    path,
    extensionVersion,
    result,
    selectors,
  };
}

function getExtensionVersion(directory) {
  const manifest = JSON.parse(
    readFileSync(path.join(directory, "manifest.json"), "utf8"),
  );
  return manifest.version || "";
}

function pathnameFromUrl(value) {
  try {
    return value ? new URL(value).pathname : "";
  } catch {
    return "";
  }
}

export function classifyCanaryFailure(currentUrl = "") {
  const pathname = pathnameFromUrl(currentUrl);
  if (/^\/terms_and_conditions(?:\/|$)/.test(pathname))
    return { reason: "terms_required" };
  return /\/member\/(?:signup|register|login)|\/auth\//.test(pathname)
    ? { reason: "auth_required" }
    : { reason: "selector_timeout" };
}

export function getProcessExitCode(payload) {
  return payload.status === "passed" ? 0 : 1;
}

async function collectDomState(page) {
  return page
    .evaluate((selectors) => {
      const title = Boolean(document.querySelector(selectors.title));
      const description = Boolean(document.querySelector(selectors.description));
      const fileInput = Boolean(document.querySelector(selectors.fileInput));
      const generateButton = Boolean(
        document.querySelector(selectors.generateButton),
      );
      const signInButton = Boolean(document.querySelector(selectors.signInButton));
      const phoneButton = Boolean(document.querySelector(selectors.phoneButton));
      const titleLanguage = Boolean(document.querySelector(selectors.titleLanguage));
      const descriptionLanguage = Boolean(
        document.querySelector(selectors.descriptionLanguage),
      );
      const tools = Boolean(document.querySelector(selectors.tools));
      return {
        title,
        description,
        fileInput,
        generateButton,
        signInButton,
        phoneButton,
        titleLanguage,
        descriptionLanguage,
        tools,
        href: location.href,
        titleText: document.title,
      };
    }, selectors)
    .catch((error) => ({ error: error?.message || String(error) }));
}

async function dismissVintedDomainModal(page) {
  const modal = page.locator('[data-testid="domain-select-modal--overlay"]');
  if (!(await modal.isVisible().catch(() => false))) return;

  const france = modal.getByText("France", { exact: true });
  if (await france.isVisible().catch(() => false)) {
    await france.click().catch(() => {});
    await page.waitForTimeout(1000);
    return;
  }

  await modal
    .locator('button[aria-label="Fermer"], button[aria-label="Close"]')
    .first()
    .click()
    .catch(() => {});
}

async function postPayload(config, payload) {
  const response = await fetch(config.apiUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.secret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Canary post failed: ${response.status} ${text}`);
  }
}

export async function runDomCanary(config = getConfig()) {
  let extensionVersion = "";
  let context;
  let page;
  let phase = "extension_load";
  const launchOptions = {
    channel: config.executablePath ? undefined : config.channel,
    executablePath: config.executablePath || undefined,
    headless: config.headless,
    args: [
      `--disable-extensions-except=${config.extensionPath}`,
      `--load-extension=${config.extensionPath}`,
      ...(config.profileDirectory
        ? [`--profile-directory=${config.profileDirectory}`]
        : []),
    ],
  };
  let payload;

  try {
    extensionVersion = getExtensionVersion(config.extensionPath);
    mkdirSync(config.profileDir, { recursive: true });
    phase = "browser_launch";
    context = await chromium.launchPersistentContext(config.profileDir, launchOptions);
    page = context.pages()[0] || await context.newPage();
    phase = "navigation";
    await page.goto(config.url, {
      waitUntil: "domcontentloaded",
      timeout: config.timeoutMs,
    });
    await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
    await dismissVintedDomainModal(page);
    // Setup mode leaves this same profile open for human review/sign-in. Never
    // accept terms, enter credentials or bypass a challenge automatically.
    if (!config.keepOpenMs && ["terms_required", "auth_required"].includes(classifyCanaryFailure(page.url()).reason))
      throw new Error("Vinted requires account review before the create page");
    phase = "selectors";
    const handle = await page.waitForFunction(
      (selectors) => {
        const title = Boolean(document.querySelector(selectors.title));
        const description = Boolean(document.querySelector(selectors.description));
        const fileInput = Boolean(document.querySelector(selectors.fileInput));
        const quickvint = Boolean(
          document.querySelector(selectors.generateButton) &&
            document.querySelector(selectors.signInButton) &&
            document.querySelector(selectors.phoneButton) &&
            document.querySelector(selectors.titleLanguage) &&
            document.querySelector(selectors.descriptionLanguage) &&
            document.querySelector(selectors.tools),
        );
        return title && description && fileInput && quickvint
          ? { title, description, fileInput, quickvint }
          : false;
      },
      selectors,
      { timeout: config.keepOpenMs || config.timeoutMs },
    );
    await handle.dispose();
    const currentUrl = page.url();
    payload = buildCanaryPayload({
      status: "passed",
      url: currentUrl,
      path: pathnameFromUrl(currentUrl),
      extensionVersion,
      result: { injected: true, dom: await collectDomState(page) },
      selectors,
    });
  } catch (error) {
    const currentUrl = page?.url() || config.url;
    payload = buildCanaryPayload({
      status: "failed",
      url: currentUrl,
      path: pathnameFromUrl(currentUrl),
      extensionVersion,
      result: {
        ...(page ? classifyCanaryFailure(currentUrl) : { reason: `${phase}_failed` }),
        phase,
        error: String(error?.message || error).slice(0, 1000),
        ...(page ? { dom: await collectDomState(page) } : {}),
      },
      selectors,
    });
  } finally {
    if (context) {
      try { await context.close(); }
      catch (error) {
        payload = { ...payload, status: "failed", result: { ...payload?.result,
          reason: "browser_close_failed", error: String(error?.message || error).slice(0, 1000) } };
      }
    }
  }

  if (config.resultPath) {
    mkdirSync(path.dirname(config.resultPath), { recursive: true });
    const temporary = `${config.resultPath}.tmp`;
    writeFileSync(temporary, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
    renameSync(temporary, config.resultPath);
  }
  if (config.postResult) {
    await postPayload(config, payload);
  }
  return payload;
}

if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
  runDomCanary()
    .then((payload) => {
      console.log(`DOM canary ${payload.status}: ${payload.url}`);
      process.exitCode = getProcessExitCode(payload);
    })
    .catch((error) => {
      console.error(error?.message || error);
      process.exitCode = 1;
    });
}
