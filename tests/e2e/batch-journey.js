const { chromium, expect } = require("@playwright/test");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawn, execFileSync } = require("node:child_process");
const https = require("node:https");

async function launchJourneyBrowser(profile, extensionPath, options) {
  const args = [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`,
    `--host-resolver-rules=MAP www.vinted.com 127.0.0.1:${options.hostPort}, MAP storage.test 127.0.0.1:${options.hostPort}, MAP images1.vinted.net 127.0.0.1:${options.hostPort}, MAP * ~NOTFOUND, EXCLUDE localhost`,
    "--ignore-certificate-errors", "--no-proxy-server"];
  if (!options.realVisibility) {
    const context = await chromium.launchPersistentContext(profile, {
      channel: "chromium", headless: options.headless !== false, offline: true, args,
    });
    return { context, close: () => context.close() };
  }
  // Playwright's normal launch enables focus emulation for every tab. Attach
  // without those overrides so inactive-tab visibility remains Chrome's own.
  const child = spawn(chromium.executablePath(), [
    "--no-sandbox", "--no-first-run", "--no-default-browser-check",
    "--disable-background-networking", "--remote-debugging-port=0",
    `--user-data-dir=${profile}`, ...args, "about:blank",
  ], { stdio: "ignore" });
  let browser;
  try {
    const portFile = path.join(profile, "DevToolsActivePort");
    await expect.poll(() => fs.existsSync(portFile)).toBe(true);
    const [port, endpoint] = fs.readFileSync(portFile, "utf8").trim().split("\n");
    browser = await chromium.connectOverCDP(`ws://127.0.0.1:${port}${endpoint}`, { noDefaults: true });
    const context = browser.contexts()[0];
    return { context, async close() {
      if (child.exitCode === null && child.signalCode === null) {
        const exited = new Promise(resolve => child.once("exit", resolve));
        const deadline = setTimeout(() => child.kill("SIGTERM"), 3000);
        try {
          // Closing a CDP connection alone can leave Chrome and profile writers
          // alive. Ask the actual browser to exit before removing its profile.
          const cdp = await browser.newBrowserCDPSession();
          await cdp.send("Browser.close").catch(() => {});
          await exited;
        } finally { clearTimeout(deadline); }
      }
      await browser.close().catch(() => {});
    } };
  } catch (error) {
    await browser?.close(); child.kill("SIGTERM"); throw error;
  }
}

// Real MV3 worker/content/storage/tabs. All external services are local fixtures.
// Model commits below are a server replay model, not paid generation or billing.
async function openBatchJourney(options = {}) {
  const extensionPath = process.env.AUTOLISTER_EXTENSION_PATH
    ? path.resolve(process.env.AUTOLISTER_EXTENSION_PATH)
    : path.resolve(__dirname, "../..");
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "autolister-batch-qa-"));
  const tlsDirectory = path.join(profile, "qa-tls");
  fs.mkdirSync(tlsDirectory);
  execFileSync("openssl", ["req", "-x509", "-newkey", "rsa:2048", "-nodes", "-days", "1", "-subj", "/CN=www.vinted.com",
    "-keyout", path.join(tlsDirectory, "key.pem"), "-out", path.join(tlsDirectory, "cert.pem")], { stdio: "ignore" });
  // tabs.create can navigate before CDP request interception attaches. A real
  // loopback HTTPS fixture keeps that first request local too. External hosts
  // remain DNS-blocked; the generated certificate is disposable test data.
  let listingHtml = () => "<!doctype html><title>Fixture initializing</title>";
  let localPhotoResponse = null;
  const hostServer = https.createServer({ key: fs.readFileSync(path.join(tlsDirectory, "key.pem")), cert: fs.readFileSync(path.join(tlsDirectory, "cert.pem")) }, (request, response) => {
    const host = String(request.headers.host || "").split(":")[0];
    if (["storage.test", "images1.vinted.net"].includes(host)) {
      if (request.url === "/held.png" && options.holdWorkResource) return;
      const photo = localPhotoResponse?.(`https://${host}${request.url}`);
      if (photo) { response.writeHead(photo.status, { "Content-Type": photo.contentType, "Access-Control-Allow-Origin": "*" }); response.end(photo.body); }
      else { response.writeHead(503); response.end(); }
    } else if (request.url?.startsWith("/items/new")) {
      response.writeHead(200, { "Content-Type": "text/html" }); response.end(listingHtml());
    } else { response.writeHead(404); response.end(); }
  });
  await new Promise(resolve => hostServer.listen(0, "127.0.0.1", resolve));
  async function closeHostServer() { hostServer.closeAllConnections(); await new Promise(resolve => hostServer.close(resolve)); }
  let browser;
  try {
  browser = await launchJourneyBrowser(profile, extensionPath, { ...options, hostPort: hostServer.address().port });
  const { context } = browser;
  const isExtensionWorker = worker => worker.url().startsWith("chrome-extension://") && worker.url().endsWith("/background.js");
  let worker = context.serviceWorkers().find(isExtensionWorker) || await context.waitForEvent("serviceworker", isExtensionWorker);
  await expect.poll(() => worker.evaluate(() => Boolean(globalThis.chrome?.storage?.local))).toBe(true);
  const requests = [];
  const commits = new Map();
  const events = [];
  const eventRequests = [];
  const cleanup = [];
  const unexpected = [];
  const heldResources = [];
  let loads = 0;
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=", "base64");
  const files = Array.from({ length: options.photoPaths?.length || options.photos || 2 }, (_, index) => ({
    name: `photo-${index}${options.photoPaths ? path.extname(options.photoPaths[index]) : ".png"}`,
    path: `qa-session/photo-${index}${options.photoPaths ? path.extname(options.photoPaths[index]) : ".png"}`, order: index,
    url: `https://storage.test/photo-${index}${options.photoPaths ? path.extname(options.photoPaths[index]) : ".png"}`,
  }));
  function photoResponse(url) {
    const index = Number(new URL(url).pathname.match(/(?:photo-|qa-)(\d+)/)?.[1] || 0);
    const filePath = options.photoPaths?.[index];
    return { status: 200, contentType: filePath ? "image/jpeg" : "image/png", body: filePath ? fs.readFileSync(filePath) : png };
  }
  localPhotoResponse = photoResponse;
  let fixture = fs.readFileSync(path.join(__dirname, "../fixtures/vinted-listing.html"), "utf8")
    .replace(/\n        <div class="photo-box">[\s\S]*?\n        <\/div>(?=\n      <\/section>)/, "");
  if (options.localPreview) fixture = fixture
    .replace("<title>Fake Vinted Listing</title>", "<title>AutoLister local flow preview</title>")
    .replace("<body>", '<body><aside style="max-width:776px;margin:0 auto 20px;padding:14px 16px;border:1px solid #d4c8f5;border-radius:10px;background:#eee8ff;color:#40286e;font:14px/1.5 system-ui"><strong>LOCAL PREVIEW</strong> · Real extension and tabs. Photos, marketplace page and AI responses are local fixtures. Nothing is published or charged.</aside>')
    .replace(".photo-box {", '[data-testid="media-upload-grid"] { display:flex; flex-wrap:wrap; gap:12px; margin-bottom:24px; } [data-testid="add-photos-input"] { flex-basis:100%; } .photo-box {');
  fixture = fixture.replace("</body>", `<script>
    window.__photoInputChanges = 0;
    document.querySelector('[data-testid="add-photos-input"]').addEventListener('change', event => {
      window.__photoInputChanges++;
      if (${Boolean(options.hostNoticeMessage)}) {
        const notice = document.createElement('div'); notice.setAttribute('role', 'alert');
        notice.textContent = ${JSON.stringify(options.hostNoticeMessage || "")};
        document.querySelector('[data-testid="media-upload-grid"]').append(notice);
      }
      if (${Boolean(options.rejectHostPhotos)}) {
        if (${Boolean(options.hostRejectMessage)}) {
          const error = document.createElement('div'); error.setAttribute('role', 'alert'); error.setAttribute('aria-invalid', 'true');
          error.textContent = ${JSON.stringify(options.hostRejectMessage || "")};
          document.querySelector('[data-testid="media-upload-grid"]').append(error);
        }
        return;
      }
      for (const [index, file] of Array.from(event.target.files).entries()) {
        const box = document.createElement('div'); box.className = 'photo-box';
        const image = document.createElement('img'); image.className = 'web_ui__Image__content';
        image.alt = 'Uploaded photo ' + (index + 1);
        image.src = URL.createObjectURL(file); box.append(image);
        document.querySelector('[data-testid="media-upload-grid"]').append(box);
        const photoKey = Number(file.name.split('-').pop().split('.')[0]);
        setTimeout(() => { image.src = 'https://images1.vinted.net/t/qa-' + photoKey + '.png'; }, ${Number(options.hostPhotoDelay || 0)});
      }
    });
  </script></body>`);
  listingHtml = () => {
    const isWorkTab = loads++ > 0;
    let html = fixture;
    if (isWorkTab && options.fileInputDelay) html = html.replace("</body>", `<script>
      const pendingInput = document.querySelector('input[type="file"]');
      const photoGrid = pendingInput.parentNode; pendingInput.remove();
      setTimeout(() => { photoGrid.prepend(pendingInput); window.__fileInputReady = true; }, ${Number(options.fileInputDelay)});
    </script></body>`);
    return options.holdWorkResource && isWorkTab ? html.replace("</body>", '<img src="https://storage.test/held.png"></body>') : html;
  };
  await context.route("**/*", route => {
    const url = new URL(route.request().url());
    if (["chrome-extension:", "blob:", "data:"].includes(url.protocol)) return route.continue();
    unexpected.push(url.origin);
    return route.abort();
  });
  await context.route("https://www.vinted.com/items/new**", route => {
    return route.fulfill({ status: 200, contentType: "text/html",
      body: listingHtml() });
  });
  await context.route("https://storage.test/**", route => {
    if (route.request().url().endsWith("/held.png")) {
      heldResources.push(route);
      return new Promise(() => {});
    }
    return route.fulfill(photoResponse(route.request().url()));
  });
  await context.route("https://images1.vinted.net/**", route => route.fulfill(photoResponse(route.request().url())));
  await context.route("https://autolister.app/**", async route => {
    const url = new URL(route.request().url());
    if (url.pathname.startsWith("/welcome")) return route.fulfill({ status: 200, contentType: "text/html", body: "<!doctype html><title>Isolated onboarding</title>" });
    if (url.pathname === "/api/events/track") {
      const body = route.request().postDataJSON(); events.push(...(body.events || [body]));
      eventRequests.push({ accountToken: route.request().headers().authorization, events: body.events || [body] });
      return route.fulfill({ status: 204 });
    }
    if (url.pathname === "/api/user/batch-capacity") return route.fulfill({
      status: 200, contentType: "application/json", body: JSON.stringify({ allowed: true, available: 10 }),
    });
    if (url.pathname === "/api/phone-upload") {
      if (url.searchParams.get("action") === "cleanup") {
        cleanup.push(url.searchParams.get("reason")); return route.fulfill({ status: 204 });
      }
      return route.fulfill({ status: url.searchParams.get("action") === "open" ? 201 : 200,
        contentType: "application/json", body: JSON.stringify({ success: true, v: 2, status: "complete", complete: true,
          files: options.refreshUrls && requests.length ? files.map(file => ({ ...file, url: file.url + "?signature=refreshed" })) : files,
          count: files.length, expectedCount: files.length }),
      });
    }
    if (url.pathname === "/api/generate") {
      const request = { id: route.request().headers()["x-autolister-request-id"], body: route.request().postDataJSON(), rawBody: route.request().postData() };
      requests.push(request);
      if (!commits.has(request.id)) commits.set(request.id, { title: `Item ${commits.size + 1}`, description: "Generated description", measurementAdvice: "" });
      if (options.generate) return options.generate({ route, request, requests, commits });
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(commits.get(request.id)) });
    }
    // Test-only account and usage calls may be made by normal initialization.
    if (url.pathname.startsWith("/api/user")) return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    unexpected.push(url.pathname); return route.abort();
  });
  await worker.evaluate(session => chrome.storage.local.set({
    supabaseSession: session || { access_token: "local-test-access", refresh_token: "local-test-refresh", expires_at: Math.floor(Date.now() / 1000) + 3600, user: { id: "test-user", email: "seller@example.invalid" } },
    userProfile: { subscription_status: "active", subscription_tier: "pro", api_calls_this_month: 0, pack_credits: 0 },
    selectedLanguage: "en", selectedTitleLanguage: "en", selectedDescriptionLanguage: "en", tone: "standard", descriptionLength: "long", useBulletPoints: true,
  }), options.session);
  await context.setOffline(false);
  const controller = await context.newPage();
  await controller.goto("https://www.vinted.com/items/new", { waitUntil: "domcontentloaded" });
  await expect(controller.locator("#quickvint-phone-btn")).toBeVisible();
  const sourceTabId = await worker.evaluate(async () => (await chrome.tabs.query({})).find(tab => tab.url?.includes("/items/new")).id);
  return {
    context, get worker() { return worker; }, controller, sourceTabId, requests, commits, events, eventRequests, cleanup, unexpected, files,
    async restartWorker() {
      const phase = name => { if (process.env.AUTH_RESTART_TRACE) console.log(`[WORKER-RESTART] ${Date.now()} ${name}`); };
      phase("cdp-start");
      const cdp = await context.newCDPSession(controller);
      phase("cdp-ready");
      const versions = new Map();
      cdp.on("ServiceWorker.workerVersionUpdated", ({ versions: updated }) => updated.forEach(version => versions.set(version.versionId, version)));
      await cdp.send("ServiceWorker.enable");
      phase("service-workers-enabled");
      await expect.poll(() => [...versions.values()].some(version => version.scriptURL === worker.url() && version.runningStatus === "running")).toBe(true);
      const version = [...versions.values()].find(version => version.scriptURL === worker.url() && version.runningStatus === "running");
      await worker.evaluate(() => { globalThis.__qaBeforeWorkerRestart = true; });
      phase("old-worker-marked");
      const { targetInfos } = await cdp.send("Target.getTargets");
      const target = targetInfos.find(target => target.type === "service_worker" && target.url === version.scriptURL);
      if (!target) throw new Error("Extension worker target was not found");
      await cdp.send("Target.closeTarget", { targetId: target.targetId });
      phase("close-command-returned");
      const response = await sendFromExtensionContent(context, controller, { type: "QUICKVINT_TAB_JOB_HEARTBEAT", kind: "batch" });
      phase("heartbeat-returned");
      await expect.poll(async () => {
        const candidate = context.serviceWorkers().find(isExtensionWorker);
        try {
          if (!candidate || await candidate.evaluate(() => globalThis.__qaBeforeWorkerRestart === true)) return false;
          worker = candidate;
          return true;
        } catch { return false; }
      }).toBe(true);
      await cdp.detach();
      phase("new-worker-confirmed");
      return response;
    },
    async start() {
      await controller.locator("#quickvint-phone-btn").click();
      await controller.locator(".quickvint-upload-choice-multiple").click();
      const modal = controller.locator("#quickvint-batch-modal");
      await expect(modal.locator(".batch-photo")).toHaveCount(files.length);
      for (const count of options.groupSizes || [files.length]) {
        const available = await modal.locator('.batch-gallery .batch-photo:not(.marked)').all();
        if (available.length < count) throw new Error("Insufficient fixture photos for group");
        for (const photo of available.slice(0, count)) await photo.click();
        await modal.locator(".batch-mark-group").click();
      }
      await modal.locator(".batch-start").click();
    },
    async close() {
      for (const route of heldResources) await route.abort().catch(() => {});
      await browser.close();
      await closeHostServer();
      const resolved = fs.realpathSync(profile);
      if (path.dirname(resolved) !== os.tmpdir() || !path.basename(resolved).startsWith("autolister-batch-qa-")) throw new Error("Unexpected QA profile");
      // Chrome's final profile writes can briefly outlive its parent process.
      fs.rmSync(resolved, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    },
  };
  } catch (error) {
    await browser?.close();
    await closeHostServer();
    if (path.dirname(profile) === os.tmpdir() && path.basename(profile).startsWith("autolister-batch-qa-")) fs.rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    throw error;
  }
}

module.exports = { openBatchJourney };

async function sendFromExtensionContent(context, page, message) {
  const cdp = await context.newCDPSession(page);
  const worlds = [];
  cdp.on("Runtime.executionContextCreated", ({ context }) => worlds.push(context));
  try {
    await cdp.send("Runtime.enable");
    for (const world of worlds.filter(world => !world.auxData?.isDefault)) {
      const probe = await cdp.send("Runtime.evaluate", { contextId: world.id, expression: "Boolean(globalThis.chrome?.runtime?.id)", returnByValue: true });
      if (!probe.result.value) continue;
      const result = await cdp.send("Runtime.evaluate", { contextId: world.id,
        expression: `chrome.runtime.sendMessage(${JSON.stringify(message)})`, awaitPromise: true, returnByValue: true });
      if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
      return result.result.value;
    }
    throw new Error("Loaded extension content world was not found");
  } finally { await cdp.detach(); }
}

module.exports.sendFromExtensionContent = sendFromExtensionContent;
