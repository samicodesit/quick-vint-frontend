const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const crypto = require("node:crypto");
// The regular suite verifies native upload bytes and the browser payload. A
// cross-repository incident check can additionally run the actual backend image
// preparation helper, with every HTTP request restricted to this local server.
const api = process.env.AUTOLISTER_API_PATH;
let prepareOpenAIImageUrls;
if (api) {
  const esbuild = require(path.join(api, "node_modules/esbuild"));
  const mod = { exports: {} };
  new Function(
    "module",
    "exports",
    esbuild.transformSync(
      fs.readFileSync(path.join(api, "utils/openaiImageUrls.ts"), "utf8"),
      { loader: "ts", format: "cjs" },
    ).code,
  )(mod, mod.exports);
  prepareOpenAIImageUrls = mod.exports.prepareOpenAIImageUrls;
}
const { test, expect, chromium } = require("@playwright/test");
const extensionPath =
  process.env.AUTOLISTER_EXTENSION_PATH || path.resolve(__dirname, "../..");
const listingHtml = fs.readFileSync(
  path.join(__dirname, "../fixtures/vinted-listing.html"),
  "utf8",
);

for (const mode of [
  "stable",
  "reconnect",
  "photos",
  "account",
  "settings",
  "storage-denied",
  "retry",
  "small",
]) {
  test(`DOM prepared-byte transport: ${mode}`, async () => {
    test.setTimeout(90000);
    const files = [],
      requests = [],
      uploads = [],
      events = [],
      stored = new Map();
    let generating = false,
      providerCalls = 0,
      upstream404s = 0;
    const photoCount = mode === "small" ? 1 : 17;
    const interrupted = [
      "photos",
      "account",
      "settings",
      "storage-denied",
    ].includes(mode);
    let uploadStarted, releaseUpload;
    const started = new Promise((resolve) => (uploadStarted = resolve));
    const release = new Promise((resolve) => (releaseUpload = resolve));
    let disconnects = 0;
    const server = http.createServer((req, res) => {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Headers", "*");
      res.setHeader("Access-Control-Allow-Methods", "*");
      if (req.method === "OPTIONS") {
        res.writeHead(204);
        return res.end();
      }
      const url = new URL(req.url, "http://localhost");
      if (url.pathname === "/items/new") {
        res.setHeader("Content-Type", "text/html");
        return res.end(listingHtml);
      }
      if (url.pathname.startsWith("/images/")) {
        if (generating) {
          upstream404s++;
          res.writeHead(404);
          return res.end("controlled upstream unavailable");
        }
        res.setHeader("Content-Type", "image/jpeg");
        return res.end(files[Number(url.pathname.split("/").pop())]);
      }
      if (url.pathname.startsWith("/storage/")) {
        const data = stored.get(Number(url.pathname.split("/").pop()));
        if (!data) {
          res.writeHead(404);
          return res.end();
        }
        res.setHeader("Content-Type", "image/jpeg");
        return res.end(data);
      }
      if (url.pathname === "/api/phone-upload") {
        const action = url.searchParams.get("action");
        res.setHeader("Content-Type", "application/json");
        if (action === "open")
          return res.end(
            JSON.stringify({ success: true, v: 2, status: "open" }),
          );
        if (action === "prepare")
          return res.end(
            JSON.stringify({ success: true, expectedCount: photoCount }),
          );
        if (action === "cleanup") {
          stored.clear();
          return res.end(
            JSON.stringify({ success: true, status: "cancelled" }),
          );
        }
        const list = () =>
          [...stored.entries()].map(([order, data]) => ({
            order,
            name: String(order).padStart(6, "0") + "-upload.jpg",
            path: "fixture/" + order,
            url: "https://fixture.supabase.co/storage/" + order,
            size: data.length,
          }));
        if (req.method === "GET")
          return res.end(JSON.stringify({ files: list(), complete: false }));
        if (mode === "storage-denied") {
          uploadStarted();
          res.writeHead(403);
          return res.end('{"error":"Controlled storage rejection"}');
        }
        if (mode === "reconnect" && disconnects < 2) {
          disconnects++;
          req.socket.destroy();
          return;
        }
        const chunks = [];
        req.on("data", (chunk) => chunks.push(chunk));
        req.on("end", async () => {
          // Native browser FormData, parsed only for the two known bounded fields.
          const boundary =
            req.headers["content-type"].match(/boundary=(.+)$/)[1];
          const parts = Buffer.concat(chunks)
            .toString("latin1")
            .split("--" + boundary);
          const order = Number(
            parts
              .find((part) => part.includes('name="uploadOrder"'))
              .split("\r\n\r\n")[1]
              .trim(),
          );
          const part = parts.find((part) => part.includes('name="file"'));
          const data = Buffer.from(
            part.slice(part.indexOf("\r\n\r\n") + 4, -2),
            "latin1",
          );
          stored.set(order, data);
          uploadStarted();
          if (interrupted) await release;
          res.end(
            JSON.stringify({
              files: list().filter((file) => file.order === order),
            }),
          );
        });
        return;
      }
      if (url.pathname === "/api/generate") {
        const chunks = [];
        req.on("data", (c) => chunks.push(c));
        req.on("end", async () => {
          const raw = Buffer.concat(chunks),
            body = JSON.parse(raw);
          generating = true;
          requests.push({
            bytes: raw.length,
            body,
            requestId: req.headers["x-autolister-request-id"],
          });
          if (mode === "retry" && requests.length === 1) {
            res.writeHead(503, { "Content-Type": "application/json" });
            return res.end(
              JSON.stringify({
                error: "Still finalizing",
                code: "generation_commit_pending",
              }),
            );
          }
          let prepared;
          try {
            prepared = prepareOpenAIImageUrls
              ? await prepareOpenAIImageUrls(
                  body.imageUrls,
                  (input, options) => {
                    const u = new URL(input);
                    if (u.hostname === "images1.vinted.net")
                      return fetch(
                        "http://127.0.0.1:" +
                          server.address().port +
                          "/images/" +
                          u.pathname.split("/").pop(),
                        options,
                      );
                    if (u.hostname === "fixture.supabase.co")
                      return fetch(
                        "http://127.0.0.1:" +
                          server.address().port +
                          u.pathname,
                        options,
                      );
                    throw new Error("Unexpected isolated image host");
                  },
                )
              : body.imageUrls;
          } catch (error) {
            res.writeHead(400, { "Content-Type": "application/json" });
            return res.end(JSON.stringify({ error: error.message }));
          }
          for (let index = 0; index < prepared.length; index++) {
            if (
              body.imageMetadata[index].generationPayloadSource ===
              "prepared_dom_storage_url"
            ) {
              expect(body.imageUrls[index]).toBe(
                "https://fixture.supabase.co/storage/" + index,
              );
              const bytes = prepareOpenAIImageUrls
                ? Buffer.from(prepared[index].split(",")[1], "base64")
                : stored.get(index);
              if (!bytes.equals(stored.get(index)))
                throw new Error("Prepared bytes changed");
              // Existing metadata estimates base64 size without subtracting padding.
              const estimate = body.imageMetadata[index].outputBytes;
              if (estimate < bytes.length || estimate > bytes.length + 2)
                throw new Error("Prepared image size changed");
            }
          }
          providerCalls++;
          res.setHeader("Content-Type", "application/json");
          res.end(
            JSON.stringify({
              title: "Prepared bytes retained",
              description: "Local isolated provider boundary.",
              measurementAdvice: "",
            }),
          );
        });
        return;
      }
      res.writeHead(404);
      res.end();
    });
    await new Promise((r) => server.listen(0, "127.0.0.1", r));
    const base = "http://test.vinted.nl:" + server.address().port;
    const local = "http://127.0.0.1:" + server.address().port;
    const profile = fs.mkdtempSync(
      path.join(os.tmpdir(), "autolister-prepared-bytes-"),
    );
    let context;
    try {
      context = await chromium.launchPersistentContext(profile, {
        channel: "chromium",
        headless: true,
        args: [
          "--disable-extensions-except=" + extensionPath,
          "--load-extension=" + extensionPath,
          "--host-resolver-rules=MAP * 127.0.0.1, EXCLUDE localhost",
          "--no-proxy-server",
        ],
      });
      let [worker] = context.serviceWorkers();
      if (!worker) worker = await context.waitForEvent("serviceworker");
      await context.route("https://autolister.app/**", async (route) => {
        const u = new URL(route.request().url());
        if (u.pathname === "/api/generate")
          return route.fulfill({
            status: 307,
            headers: {
              Location: local + "/api/generate",
              "Access-Control-Allow-Origin": "*",
            },
          });
        if (u.pathname === "/api/events/track") {
          const b = route.request().postDataJSON();
          events.push(...(b.events || []));
          return route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              acknowledgedIds: (b.events || []).map((x) => x.id),
            }),
          });
        }
        if (u.pathname === "/api/phone-upload") {
          uploads.push({
            method: route.request().method(),
            action: u.searchParams.get("action"),
          });
          return route.fulfill({
            status: 307,
            headers: {
              Location: local + u.pathname + u.search,
              "Access-Control-Allow-Origin": "*",
            },
          });
        }
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            allowed: true,
            available: 100,
            usage: { count: 0, limit: 100, remaining: 100 },
          }),
        });
      });
      await context.route("https://images1.vinted.net/**", (route) =>
        route.fulfill({
          status: 307,
          headers: {
            Location:
              base +
              "/images/" +
              new URL(route.request().url()).pathname.split("/").pop(),
            "Access-Control-Allow-Origin": "*",
          },
        }),
      );
      await worker.evaluate(() =>
        chrome.storage.local.set({
          supabaseSession: {
            access_token: "isolated-test-token",
            refresh_token: "isolated-test-refresh",
            expires_at: Math.floor(Date.now() / 1000) + 3600,
            user: { id: "test-user", email: "seller@example.invalid" },
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
        }),
      );
      const page = await context.newPage();
      for (let photo = 0; photo < photoCount; photo++) {
        const encoded = await page.evaluate((photo) => {
          const canvas = document.createElement("canvas");
          canvas.width = 600;
          canvas.height = 800;
          const ctx = canvas.getContext("2d"),
            image = ctx.createImageData(600, 800);
          let seed = 12345 + photo;
          for (let i = 0; i < image.data.length; i += 4) {
            for (let j = 0; j < 3; j++) {
              seed = (1664525 * seed + 1013904223) >>> 0;
              image.data[i + j] = seed >>> 24;
            }
            image.data[i + 3] = 255;
          }
          ctx.putImageData(image, 0, 0);
          return canvas.toDataURL("image/jpeg", 0.95).split(",")[1];
        }, photo);
        files.push(Buffer.from(encoded, "base64"));
      }
      await page.goto(base + "/items/new");
      await expect(page.locator("#quickvint-gen-btn")).toBeVisible();
      await page.evaluate((photoCount) => {
        document.querySelectorAll(".photo-box").forEach((x) => x.remove());
        document
          .querySelector('[data-testid="media-upload-grid"]')
          .insertAdjacentHTML(
            "beforeend",
            Array.from(
              { length: photoCount },
              (_, i) =>
                '<div class="photo-box"><div class="photo-box__image-container"><img class="web_ui__Image__content" style="width:174px;height:174px" src="https://images1.vinted.net/local-test/' +
                i +
                '"></div></div>',
            ).join(""),
          );
        document.querySelector('[data-testid="title--input"]').value = "";
        document.querySelector('[data-testid="description--input"]').value = "";
      }, photoCount);
      await page.waitForFunction(() =>
        Array.from(document.querySelectorAll(".photo-box img")).every(
          (i) => i.complete && i.naturalWidth === 600,
        ),
      );
      await page.locator("#quickvint-gen-btn").click();
      if (interrupted) {
        await started;
        if (mode === "photos")
          await page
            .locator(".photo-box")
            .first()
            .evaluate((element) => element.remove());
        else if (mode === "account" || mode === "settings")
          await worker.evaluate(async (mode) => {
            if (mode === "settings")
              return chrome.storage.local.set({ tone: "casual" });
            const { supabaseSession } =
              await chrome.storage.local.get("supabaseSession");
            await chrome.storage.local.set({
              supabaseSession: {
                ...supabaseSession,
                access_token: "other-test-token",
                user: { id: "other-test-user" },
              },
            });
          }, mode);
        await page.waitForTimeout(100);
        releaseUpload();
        await expect
          .poll(() => uploads.some((upload) => upload.action === "cleanup"))
          .toBe(true);
        await expect(page.locator("#quickvint-gen-btn")).toBeEnabled();
        expect(requests).toHaveLength(0);
        expect(await page.locator(".photo-box img").count()).toBe(
          mode === "photos" ? 16 : 17,
        );
        return;
      }
      await expect.poll(() => requests.length).toBe(1);
      if (mode === "retry") {
        await expect(page.locator("#quickvint-gen-btn")).toBeEnabled();
        const uploadCount = uploads.length;
        await page.locator("#quickvint-gen-btn").click();
        await expect.poll(() => requests.length).toBe(2);
        expect(requests[1].body).toEqual(requests[0].body);
        expect(requests[1].requestId).toBe(requests[0].requestId);
        expect(uploads).toHaveLength(uploadCount);
      }
      console.log(
        JSON.stringify({
          originalBytes: files[0].length,
          wireBytes: requests[0].bytes,
          imageCount: requests[0].body.imageUrls.length,
          payloadSources: [
            ...new Set(
              requests[0].body.imageMetadata.map(
                (x) => x.generationPayloadSource,
              ),
            ),
          ],
          remoteFallbackEvents: events.filter(
            (x) => x.event === "generate_payload_remote_fallback",
          ).length,
          upstream404s,
          providerCalls,
          storageCalls: uploads.length,
          storedPhotoCount: stored.size,
          backendHelperChecked: Boolean(prepareOpenAIImageUrls),
          preparedBytes: requests[0].body.imageMetadata.reduce(
            (n, x) => n + (x.outputBytes || 0),
            0,
          ),
        }),
      );
      await expect(page.locator('[data-testid="title--input"]')).toHaveValue(
        "Prepared bytes retained",
      );
      expect(providerCalls).toBe(1);
      expect(upstream404s).toBe(0);
      expect(requests[0].body.imageUrls).toHaveLength(photoCount);
      expect(await page.locator(".photo-box img").count()).toBe(photoCount);
      if (mode === "small") expect(uploads).toHaveLength(0);
      else
        expect(
          new Set(
            [...stored.values()].map((bytes) =>
              crypto.createHash("sha256").update(bytes).digest("hex"),
            ),
          ).size,
        ).toBe(17);
      if (mode === "reconnect") expect(disconnects).toBe(2);
    } finally {
      releaseUpload();
      await context?.close();
      await new Promise((r) => server.close(r));
      if (
        path.dirname(profile) === os.tmpdir() &&
        path.basename(profile).startsWith("autolister-prepared-bytes-")
      )
        fs.rmSync(profile, { recursive: true, force: true });
    }
  });
}
