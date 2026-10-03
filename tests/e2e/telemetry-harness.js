const path = require("node:path");

// Use the production queue and adapters in simulated content/popup contexts.
// Only the Chrome message boundary is simulated; delivery still uses the test's
// intercepted HTTP endpoint and real chrome.storage fixture.
async function installTelemetryHarness(page, extensionPath) {
  if (await page.evaluate(() => Boolean(window.AutoListerBackgroundTelemetry))) return;
  await page.evaluate(() => {
    if (window.AutoListerBackgroundTelemetry) return;
    const original = chrome.runtime.sendMessage.bind(chrome.runtime);
    const listeners = [];
    window.__telemetryOriginalOnMessage = chrome.runtime.onMessage;
    chrome.runtime.onMessage = { addListener(listener) { listeners.push(listener); } };
    window.getAnalyticsClientId = async () => {
      const data = await chrome.storage.local.get("analyticsClientId");
      if (data.analyticsClientId) return data.analyticsClientId;
      const id = "test-analytics-client";
      await chrome.storage.local.set({ analyticsClientId: id });
      return id;
    };
    chrome.runtime.sendMessage = (message, callback) => {
      if (!String(message?.type || "").startsWith("AUTOLISTER_TELEMETRY")) return original(message, callback);
      return new Promise((resolve) => {
        const reply = (value) => { callback?.(value); resolve(value); };
        for (const listener of listeners) if (listener(message, { id: chrome.runtime.id }, reply) === true) return;
        reply({ queued: false });
      });
    };
  });
  for (const name of ["registry", "core", "client", "background", "flow"]) await page.addScriptTag({ path: path.join(extensionPath, `lib/telemetry-${name}.js`) });
  await page.addScriptTag({ path: path.join(extensionPath, "lib/phone-upload-recovery.js") });
  await page.evaluate(() => { chrome.runtime.onMessage = window.__telemetryOriginalOnMessage; delete window.__telemetryOriginalOnMessage; });
}
module.exports = { installTelemetryHarness };
