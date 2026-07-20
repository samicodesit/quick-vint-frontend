import { readFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const scriptPath = fileURLToPath(import.meta.url);
const extensionPath = path.resolve(path.dirname(scriptPath), "..");

const selectors = {
  title: 'input[data-testid="title--input"]',
  description: 'textarea[data-testid="description--input"]',
  generateButton: "#quickvint-gen-btn",
  signInButton: "#quickvint-signin-btn",
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

function getExtensionVersion() {
  const manifest = JSON.parse(
    readFileSync(path.join(extensionPath, "manifest.json"), "utf8"),
  );
  return manifest.version || "";
}

async function collectDomState(page) {
  return page
    .evaluate((selectors) => {
      const title = Boolean(document.querySelector(selectors.title));
      const description = Boolean(document.querySelector(selectors.description));
      const generateButton = Boolean(
        document.querySelector(selectors.generateButton),
      );
      const signInButton = Boolean(document.querySelector(selectors.signInButton));
      const tools = Boolean(document.querySelector(selectors.tools));
      return {
        title,
        description,
        generateButton,
        signInButton,
        tools,
        href: location.href,
        titleText: document.title,
      };
    }, selectors)
    .catch((error) => ({ error: error?.message || String(error) }));
}

async function postPayload(config, payload) {
  const response = await fetch(config.apiUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.secret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Canary post failed: ${response.status} ${text}`);
  }
}

export async function runDomCanary(config = getConfig()) {
  mkdirSync(config.profileDir, { recursive: true });
  const extensionVersion = getExtensionVersion();
  const context = await chromium.launchPersistentContext(config.profileDir, {
    channel: config.channel,
    headless: config.headless,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
    ],
  });

  const page = await context.newPage();
  let payload;

  try {
    await page.goto(config.url, {
      waitUntil: "domcontentloaded",
      timeout: config.timeoutMs,
    });
    await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
    const handle = await page.waitForFunction(
      (selectors) => {
        const title = Boolean(document.querySelector(selectors.title));
        const description = Boolean(document.querySelector(selectors.description));
        const quickvint = Boolean(
          document.querySelector(selectors.generateButton) ||
            document.querySelector(selectors.signInButton) ||
            document.querySelector(selectors.tools),
        );
        return title && description && quickvint
          ? { title, description, quickvint }
          : false;
      },
      selectors,
      { timeout: config.timeoutMs },
    );
    const result = await handle.jsonValue();
    const currentUrl = page.url();
    payload = buildCanaryPayload({
      status: "passed",
      url: currentUrl,
      path: new URL(currentUrl).pathname,
      extensionVersion,
      result,
      selectors,
    });
  } catch (error) {
    const currentUrl = page.url();
    payload = buildCanaryPayload({
      status: "failed",
      url: currentUrl,
      path: currentUrl ? new URL(currentUrl).pathname : "",
      extensionVersion,
      result: {
        error: error?.message || String(error),
        dom: await collectDomState(page),
      },
      selectors,
    });
  } finally {
    await context.close();
  }

  await postPayload(config, payload);
  return payload;
}

if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
  runDomCanary()
    .then((payload) => {
      console.log(`DOM canary ${payload.status}: ${payload.url}`);
      process.exitCode = payload.status === "passed" ? 0 : 1;
    })
    .catch((error) => {
      console.error(error?.message || error);
      process.exitCode = 1;
    });
}
