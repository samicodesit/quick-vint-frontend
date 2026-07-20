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
});
