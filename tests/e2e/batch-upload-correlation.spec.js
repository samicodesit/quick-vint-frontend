const { test, expect } = require("@playwright/test");
const { createHash } = require("node:crypto");
const { openBatchJourney } = require("./batch-journey");

for (const switchAccount of [false, true]) {
test(switchAccount ? "an account switch during error capture cannot claim the previous upload" : "computer upload error retains the original session hash without its credential", async () => {
  let uploadSession;
  const flow = await openBatchJourney({
    beforeNavigate: async ({ context }) => {
      await context.route("https://autolister.app/api/phone-upload**", async route => {
        const request = route.request();
        const url = new URL(request.url());
        const response = (status, body) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
        if (url.searchParams.get("action") === "cleanup") return response(200, { success: true });
        if (url.searchParams.get("v") === "2") return response(200, { success: true, v: 2, status: "uploading", complete: false, files: [], count: 0 });
        if (request.method() === "POST") {
          uploadSession = url.searchParams.get("sessionId");
          return response(200, { success: true, files: [] });
        }
        // Controlled failure exercises capture, not the provider's root cause.
        return response(503, { error: "Isolated storage fixture unavailable" });
      });
    },
  });
  try {
    if (switchAccount) {
      const cdp = await flow.context.newCDPSession(flow.controller);
      const worlds = [];
      cdp.on("Runtime.executionContextCreated", ({ context }) => worlds.push(context));
      await cdp.send("Runtime.enable");
      let installed = false;
      for (const world of worlds.filter(world => !world.auxData?.isDefault)) {
        const probe = await cdp.send("Runtime.evaluate", { contextId: world.id, expression: "Boolean(globalThis.AutoListerTelemetry?.track)", returnByValue: true });
        if (!probe.result.value) continue;
        await cdp.send("Runtime.evaluate", { contextId: world.id, expression: `
          const originalUploadTrack = globalThis.AutoListerTelemetry.track;
          globalThis.AutoListerTelemetry.track = async function(...args) {
            if (args[0] === 'batch_computer_upload_error') {
              await chrome.storage.local.set({supabaseSession:{access_token:'isolated-other-token',refresh_token:'isolated-other-refresh',expires_at:Math.floor(Date.now()/1000)+3600,user:{id:'other-user',email:'other@example.invalid'}}});
              const result = await originalUploadTrack.apply(this,args);
              await chrome.storage.local.set({qaUploadTrackDisposition:result});
              return result;
            }
            return originalUploadTrack.apply(this,args);
          };
        ` });
        installed = true; break;
      }
      await cdp.detach();
      expect(installed).toBe(true);
    }
    await flow.controller.locator("#quickvint-phone-btn").click();
    await flow.controller.locator(".quickvint-upload-choice-multiple").click();
    await flow.controller.setInputFiles(".batch-computer-files-input", {
      name: "fixture.png", mimeType: "image/png",
      buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=", "base64"),
    });
    if (switchAccount) {
      await expect.poll(() => flow.worker.evaluate(async () => (await chrome.storage.local.get('qaUploadTrackDisposition')).qaUploadTrackDisposition)).toBeTruthy();
      const result = await flow.worker.evaluate(async () => (await chrome.storage.local.get('qaUploadTrackDisposition')).qaUploadTrackDisposition);
      expect(result).toMatchObject({queued:false,reason:'account_changed'});
      await flow.worker.evaluate(() => globalThis.AutoListerBackgroundTelemetry.flush());
      expect(flow.events.filter(event => event.event === 'batch_computer_upload_error')).toHaveLength(0);
      expect(flow.requests).toHaveLength(0);
      return;
    }
    await expect(flow.controller.locator(".batch-computer-error")).toBeVisible();
    await expect.poll(async () => {
      await flow.worker.evaluate(() => globalThis.AutoListerBackgroundTelemetry.flush());
      return flow.events.find(event => event.event === "batch_computer_upload_error");
    }).toBeTruthy();
    const event = flow.events.find(event => event.event === "batch_computer_upload_error");
    expect(uploadSession).toBeTruthy();
    expect(event.phoneSessionKey).toBe(createHash("sha256").update(uploadSession).digest("hex"));
    expect(JSON.stringify(event)).not.toContain(uploadSession);
    expect(event.source).toBe("extension_content");
    expect(event.accountId).toBe("test-user");
    expect(event.context.photoCount).toBe(1);
    expect(flow.requests).toHaveLength(0);
  } finally { await flow.close(); }
});
}
