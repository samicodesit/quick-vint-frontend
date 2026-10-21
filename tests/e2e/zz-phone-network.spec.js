const fs = require("node:fs");
const path = require("node:path");
const { test, expect } = require("@playwright/test");

const apiPath =
  process.env.AUTOLISTER_API_PATH ||
  path.resolve(__dirname, "../../../quick-vint-api");
const htmlPath = path.join(apiPath, "src/pages/phone-upload.html");
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
  "base64",
);

test.describe("phone transfer network recovery", () => {
  test.skip(!fs.existsSync(htmlPath), "API checkout is not available");
  for (const failures of [0, 1, 3]) {
    test(`preserves upload behavior after ${failures} network failures`, async ({
      page,
    }) => {
      let attempts = 0;
      const events = [];
      await page.route("**/*", async (route) => {
        const url = new URL(route.request().url());
        if (url.pathname === "/phone-upload")
          return route.fulfill({
            contentType: "text/html",
            body: fs.readFileSync(htmlPath, "utf8"),
          });
        if (url.pathname.endsWith(".js")) {
          const file = path.join(
            apiPath,
            "public",
            path.basename(url.pathname),
          );
          if (fs.existsSync(file))
            return route.fulfill({
              contentType: "application/javascript",
              body: fs.readFileSync(file, "utf8"),
            });
        }
        if (url.pathname === "/api/events/track") {
          const body = route.request().postDataJSON();
          events.push(...(body.events || [body]));
          return route.fulfill({
            contentType: "application/json",
            body: JSON.stringify({
              acknowledgedIds: (body.events || []).map((event) => event.id),
            }),
          });
        }
        if (url.pathname === "/api/phone-upload") {
          if (
            route.request().method() === "POST" &&
            !url.searchParams.has("action")
          ) {
            attempts += 1;
            if (attempts <= failures) return route.abort("failed");
          }
          return route.fulfill({
            contentType: "application/json",
            body: JSON.stringify({ status: "active", files: [{ size: 68 }] }),
          });
        }
        return route.abort();
      });
      await page.goto(
        "https://autolister.app/phone-upload?v=2&s=00000000-0000-4000-8000-000000000001",
      );
      await page
        .locator("#fileInput")
        .setInputFiles({
          name: "photo.png",
          mimeType: "image/png",
          buffer: png,
        });
      await expect(page.locator("#mainBtn")).toHaveText(/Add more photos/, {
        timeout: 15000,
      });
      await expect
        .poll(
          () =>
            events.filter(
              (event) => event.event === "phone_upload_transfer_error",
            ).length,
        )
        .toBe(failures > 0 ? 1 : 0);
      await expect.poll(() => attempts).toBe(failures + 1);
      await expect
        .poll(
          () =>
            events.filter((event) => event.event === "phone_upload_ready")
              .length,
        )
        .toBe(1);
      const starts = events.filter(
        (event) => event.event === "phone_upload_transfer_start",
      );
      const errors = events.filter(
        (event) => event.event === "phone_upload_transfer_error",
      );
      for (const error of errors) {
        expect(error.context).toMatchObject({
          errorCode: "UPLOAD_NETWORK_ERROR",
          statusCode: 0,
        });
        expect(
          starts.some(
            (start) => start.context.operationId === error.context.operationId,
          ),
        ).toBe(true);
      }
      expect(starts).toHaveLength(attempts);
      expect(starts.every((event) => Boolean(event.context.operationId))).toBe(
        true,
      );
      expect(
        new Set(starts.map((event) => event.context.operationId)).size,
      ).toBe(1);
      expect(await page.locator("#cancelBtn").isVisible()).toBe(true);
    });
  }
});
