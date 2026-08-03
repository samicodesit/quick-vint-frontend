const assert = require("node:assert/strict");
const test = require("node:test");

test("DOM canary runner builds the heartbeat payload", async () => {
  const { buildCanaryPayload } = await import("../scripts/run-dom-canary.mjs");

  const payload = buildCanaryPayload({
    status: "passed",
    now: new Date("2026-07-20T09:00:00.000Z"),
    url: "https://www.vinted.fr/items/new",
    path: "/items/new",
    extensionVersion: "1.3.58",
    result: { injected: true },
    selectors: { button: "#quickvint-gen-btn" },
  });

  assert.deepEqual(payload, {
    check: "vinted_listing_field_injection",
    status: "passed",
    occurredAt: "2026-07-20T09:00:00.000Z",
    url: "https://www.vinted.fr/items/new",
    path: "/items/new",
    extensionVersion: "1.3.58",
    result: { injected: true },
    selectors: { button: "#quickvint-gen-btn" },
  });
});

test("DOM canary runner checks every required listing control", async () => {
  const { selectors } = await import("../scripts/run-dom-canary.mjs");

  assert.deepEqual(Object.keys(selectors), [
    "title",
    "description",
    "fileInput",
    "generateButton",
    "signInButton",
    "phoneButton",
    "titleLanguage",
    "descriptionLanguage",
    "tools",
  ]);
});

test("DOM canary runner keeps scheduling config explicit", async () => {
  const { getConfig } = await import("../scripts/run-dom-canary.mjs");

  const config = getConfig({
    DOM_CANARY_SECRET: "secret",
    DOM_CANARY_PROFILE_DIR: "/tmp/autolister-canary-profile",
    DOM_CANARY_URL: "https://www.vinted.nl/items/new",
    DOM_CANARY_API_BASE_URL: "https://example.com/",
  });

  assert.equal(config.secret, "secret");
  assert.equal(config.profileDir, "/tmp/autolister-canary-profile");
  assert.equal(config.url, "https://www.vinted.nl/items/new");
  assert.equal(config.apiUrl, "https://example.com/api/dom-canary");
  assert.equal(config.postResult, true);
  assert.equal(config.keepOpenMs, 0);
});

test("DOM canary runner supports setup mode without posting alerts", async () => {
  const { getConfig } = await import("../scripts/run-dom-canary.mjs");

  const config = getConfig({
    DOM_CANARY_SECRET: "secret",
    DOM_CANARY_PROFILE_DIR: "/tmp/autolister-canary-profile",
    DOM_CANARY_NO_POST: "1",
    DOM_CANARY_KEEP_OPEN_MS: "600000",
  });

  assert.equal(config.postResult, false);
  assert.equal(config.keepOpenMs, 600000);
});

test("DOM canary runner supports Windows Chrome profile selection", async () => {
  const { getConfig } = await import("../scripts/run-dom-canary.mjs");

  const config = getConfig({
    DOM_CANARY_SECRET: "secret",
    DOM_CANARY_PROFILE_DIR: "C:\\Users\\Sami\\AppData\\Local\\AutoListerCanary\\Chrome",
    DOM_CANARY_EXTENSION_PATH: "C:\\Users\\Sami\\AppData\\Local\\AutoListerCanary\\Extension",
    DOM_CANARY_BROWSER_EXECUTABLE:
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    DOM_CANARY_PROFILE_DIRECTORY: "Profile 4",
  });

  assert.equal(
    config.executablePath,
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  );
  assert.equal(config.profileDirectory, "Profile 4");
  assert.equal(
    config.extensionPath,
    "C:\\Users\\Sami\\AppData\\Local\\AutoListerCanary\\Extension",
  );
});

test("DOM canary runner classifies Vinted auth redirects", async () => {
  const { classifyCanaryFailure } = await import("../scripts/run-dom-canary.mjs");

  assert.deepEqual(
    classifyCanaryFailure(
      "https://www.vinted.nl/member/signup/select_type?ref_url=%2Fitems%2Fnew",
    ),
    { reason: "auth_required" },
  );
  assert.deepEqual(
    classifyCanaryFailure("https://www.vinted.nl/items/new"),
    { reason: "selector_timeout" },
  );
});

test("DOM canary runner can treat reported failures as process success", async () => {
  const { getProcessExitCode } = await import("../scripts/run-dom-canary.mjs");

  assert.equal(getProcessExitCode({ status: "passed" }, {}), 0);
  assert.equal(getProcessExitCode({ status: "failed" }, {}), 1);
  assert.equal(
    getProcessExitCode(
      { status: "failed" },
      { DOM_CANARY_EXIT_ZERO_ON_REPORTED_FAILURE: "1" },
    ),
    0,
  );
});
