const assert = require("node:assert/strict");
const test = require("node:test");

test("resolves the two supported real-browser checks", async () => {
  const { resolveRealBrowserCheck } = await import(
    "../scripts/run-real-browser.mjs"
  );

  assert.deepEqual(resolveRealBrowserCheck("listing-create"), {
    name: "listing-create",
    script: "run-dom-canary.mjs",
    profileMode: "canary",
    requiresSession: false,
  });
  assert.deepEqual(resolveRealBrowserCheck("wardrobe-rewrite"), {
    name: "wardrobe-rewrite",
    script: "run-live-wardrobe-rewrite.mjs",
    profileMode: "disposable",
    requiresSession: true,
  });
});

test("rejects unknown real-browser checks", async () => {
  const { resolveRealBrowserCheck } = await import(
    "../scripts/run-real-browser.mjs"
  );

  assert.throws(
    () => resolveRealBrowserCheck("unknown"),
    /Unknown real-browser check/,
  );
});

test("returns the selected child check exit code", async () => {
  const { runRealBrowser } = await import("../scripts/run-real-browser.mjs");
  const spawn = () => ({ status: 7, error: undefined });

  assert.equal(runRealBrowser("listing-create", { spawn }), 7);
});

test("describes a check for the shared Windows wrapper", async () => {
  const { describeRealBrowserCheck } = await import(
    "../scripts/run-real-browser.mjs"
  );

  assert.deepEqual(JSON.parse(describeRealBrowserCheck("listing-create")), {
    name: "listing-create",
    script: "run-dom-canary.mjs",
    profileMode: "canary",
    requiresSession: false,
  });
});
