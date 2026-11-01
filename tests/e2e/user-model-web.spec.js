const { test, expect } = require("@playwright/test");
const fs = require("node:fs"),
  path = require("node:path");
const url = process.env.MODEL_WEB_TEST_URL;
test.skip(
  !url,
  "Set MODEL_WEB_TEST_URL to a local Astro instance with model flags enabled.",
);
const owner = "123e4567-e89b-42d3-a456-426614174000";
const prefs = {
  gender: "female",
  hair: "brown",
  heightCm: 170,
  build: "average",
  skinTone: "tone_3",
};
const sample = process.env.MODEL_SAMPLE_PATH;
const image = sample
  ? "data:image/jpeg;base64," + fs.readFileSync(sample).toString("base64")
  : "data:image/svg+xml," +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1536"/>',
    );
async function mocks(page, state) {
  await page.route("**/api/**", async (route) => {
    const request = route.request(),
      pathname = new URL(request.url()).pathname;
    if (pathname === "/api/user/model") {
      const body = request.postDataJSON();
      if (body?.action === "invite") {
        state.invitationState = "seen";
        return route.fulfill({ json: { claimed: true } });
      }
      if (body?.action === "create") {
        state.model = {
          id: "model",
          state: "ready",
          operationId: "op",
          imageUrl: image,
          preferences: body.preferences,
        };
        state.enabled = true;
        state.invitationState = "created";
      }
      if (body?.action === "dismiss") state.invitationState = "dismissed";
      if (request.method() === "PATCH") state.enabled = body.enabled;
      return route.fulfill({ json: state });
    }
    if (pathname === "/api/user/usage")
      return route.fulfill({
        json: {
          canGenerate: true,
          plan: { tier: "starter", isPaid: true, status: "active" },
          limits: { daily: 10, monthly: 75 },
          remaining: { daily: 10, monthly: 75, credits: 0 },
          resetsAt: {},
        },
      });
    return route.fulfill({ json: {} });
  });
  await page.route("https://model-test.supabase.co/**", (route) =>
    route.fulfill({
      json: { user: { id: owner, email: "seller@example.com" } },
    }),
  );
}
async function signIn(page, pending) {
  await page.addInitScript(
    ({ owner, pending }) => {
      const token =
        btoa(JSON.stringify({ alg: "HS256", typ: "JWT" })) +
        "." +
        btoa(
          JSON.stringify({
            sub: owner,
            exp: Math.floor(Date.now() / 1000) + 3600,
          }),
        ) +
        ".signature";
      localStorage.setItem(
        "sb-model-test-auth-token",
        JSON.stringify({
          access_token: token,
          refresh_token: "fixture-refresh",
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          expires_in: 3600,
          token_type: "bearer",
          user: {
            id: owner,
            email: "seller@example.com",
            created_at: "2025-01-01T00:00:00Z",
          },
        }),
      );
      localStorage.setItem("autolister:style-setup:v1:" + owner, "done");
      if (pending)
        localStorage.setItem(
          "autolister:pending-model:v1",
          JSON.stringify({ preferences: pending }),
        );
    },
    { owner, pending },
  );
}
async function shot(page, name) {
  await page.addStyleTag({
    content: "astro-dev-toolbar{display:none!important}",
  });
  if (process.env.MODEL_SCREENSHOT_DIR) {
    fs.mkdirSync(process.env.MODEL_SCREENSHOT_DIR, { recursive: true });
    await page.screenshot({
      path: path.join(process.env.MODEL_SCREENSHOT_DIR, name),
      fullPage: true,
    });
  }
}
for (const size of [
  { width: 1440, height: 1000, name: "desktop" },
  { width: 390, height: 844, name: "mobile" },
]) {
  test(
    "web " +
      size.name +
      " invitation can be dismissed without creating a model",
    async ({ page }) => {
      const state = { model: null, enabled: false, invitationState: "unseen" };
      await page.setViewportSize(size);
      await mocks(page, state);
      await signIn(page);
      await page.goto(url + "/app?signin=1");
      await expect(
        page.getByRole("dialog", { name: "Your model" }),
      ).toBeVisible();
      await shot(page, "web-invitation-" + size.name + ".png");
      await page.getByRole("button", { name: "Not now", exact: true }).click();
      await expect(
        page.getByRole("dialog", { name: "Your model" }),
      ).toHaveCount(0);
      await expect.poll(() => state.invitationState).toBe("dismissed");
      expect(state.model).toBeNull();
      await page.reload();
      await expect(page.locator("[data-draft-global-trigger]")).toBeVisible();
      await expect(
        page.getByRole("dialog", { name: "Your model" }),
      ).toHaveCount(0);
    },
  );
  test(
    "web " + size.name + " model onboarding is skippable after listing style",
    async ({ page }) => {
      await page.setViewportSize(size);
      await mocks(page, {
        model: null,
        enabled: false,
        invitationState: "unseen",
      });
      await page.goto(url + "/app");
      await page.locator("[data-style-skip]").click();
      await expect(
        page.getByRole("heading", { name: "Create your model", exact: true }),
      ).toBeVisible();
      for (const name of ["Female", "Brown", "Average", "Medium tan"])
        await page.getByRole("radio", { name, exact: true }).check();
      await shot(page, "web-onboarding-" + size.name + ".png");
      await page
        .getByRole("button", { name: "Skip for now", exact: true })
        .click();
      await expect(
        page.getByRole("heading", { name: "Sign in", exact: true }),
      ).toBeVisible();
      expect(
        await page.evaluate(
          () =>
            JSON.parse(localStorage.getItem("autolister:pending-model:v1"))
              .preferences,
        ),
      ).toBeNull();
    },
  );
  test(
    "web " +
      size.name +
      " settings retain seller note and toggle the saved model",
    async ({ page }) => {
      await page.setViewportSize(size);
      await mocks(page, {
        model: {
          id: "model",
          state: "ready",
          imageUrl: image,
          preferences: prefs,
        },
        enabled: true,
        invitationState: "created",
      });
      await signIn(page);
      await page.goto(url + "/app?signin=1");
      await page.locator("[data-draft-global-trigger]").click();
      const dialog = page.locator("#draft-global-dialog");
      await dialog
        .getByRole("textbox", { name: "Seller note" })
        .fill("Keep this unsaved seller note");
      await dialog
        .locator(".draft-settings-content")
        .evaluate((el) => (el.scrollTop = 0));
      await shot(page, "web-settings-" + size.name + ".png");
      await dialog
        .getByRole("button", { name: "Your model", exact: true })
        .click();
      await expect(
        dialog.getByAltText("Your saved full-length model"),
      ).toBeVisible();
      await shot(page, "web-model-" + size.name + ".png");
      await dialog.getByRole("switch", { name: "Enable your model" }).uncheck();
      await expect(
        dialog.getByRole("switch", { name: "Enable your model" }),
      ).not.toBeChecked();
      await dialog
        .getByRole("button", { name: "Back to settings", exact: true })
        .click();
      await expect(
        dialog.getByRole("textbox", { name: "Seller note" }),
      ).toHaveValue("Keep this unsaved seller note");
    },
  );
  test(
    "web " +
      size.name +
      " puts model discovery first and stops motion after opening",
    async ({ page }) => {
      const state = { model: null, enabled: false, invitationState: "seen" };
      await page.setViewportSize(size);
      await mocks(page, state);
      await signIn(page);
      await page.goto(url + "/app?signin=1");
      const trigger = page.locator(
        "#draft-global-dialog [data-user-model-open]",
      );
      await expect(trigger).not.toHaveAttribute("hidden");
      await page.locator("[data-draft-global-trigger]").click();
      await expect(trigger).toHaveClass(/um-discover/);
      await expect(trigger.locator(".um-entry-copy")).toHaveCSS(
        "text-align",
        "left",
      );
      const languageButtons = page.locator(
        "#draft-global-dialog .draft-language-fields .draft-select-trigger",
      );
      const leftLanguage = await languageButtons.nth(0).boundingBox();
      const rightLanguage = await languageButtons.nth(1).boundingBox();
      expect(Math.abs(leftLanguage.y - rightLanguage.y)).toBeLessThan(1);
      expect(rightLanguage.x).toBeGreaterThan(
        leftLanguage.x + leftLanguage.width,
      );
      await expect(trigger.locator("img")).toHaveJSProperty(
        "naturalWidth",
        280,
      );
      expect(
        await trigger.evaluate(
          (el) => el.parentElement.firstElementChild === el,
        ),
      ).toBe(true);
      await shot(page, "web-discovery-" + size.name + ".png");
      if (size.name === "mobile") {
        await page.setViewportSize({ width: 320, height: 700 });
        await languageButtons.nth(1).click();
        const options = page.locator("#global-descriptionLanguageCode-options");
        await expect(options).toBeVisible();
        const bounds = await options.boundingBox();
        expect(bounds.x).toBeGreaterThanOrEqual(0);
        expect(bounds.x + bounds.width).toBeLessThanOrEqual(320);
        await page.keyboard.press("Escape");
        await page.setViewportSize(size);
      }
      await page.emulateMedia({ reducedMotion: "reduce" });
      expect(
        await trigger.evaluate(
          (el) => getComputedStyle(el, "::before").animationName,
        ),
      ).toBe("none");
      await trigger.click();
      await expect.poll(() => state.invitationState).toBe("dismissed");
      await page
        .getByRole("button", { name: "Back to settings", exact: true })
        .click();
      await expect(trigger).not.toHaveClass(/um-discover/);
      await page.reload();
      await expect(trigger).not.toHaveAttribute("hidden");
      await expect(trigger).not.toHaveClass(/um-discover/);
    },
  );
}
test("signed-in users explicitly review retained preferences before creation", async ({
  page,
}) => {
  let creates = 0;
  const state = { model: null, enabled: false, invitationState: "unseen" };
  await mocks(page, state);
  page.on("request", (r) => {
    if (
      r.url().endsWith("/api/user/model") &&
      r.postDataJSON()?.action === "create"
    )
      creates++;
  });
  await signIn(page, prefs);
  await page.goto(url + "/app?signin=1");
  await expect(page.getByRole("dialog", { name: "Your model" })).toBeVisible();
  await expect(
    page.getByRole("radio", { name: "Brown", exact: true }),
  ).toBeChecked();
  expect(creates).toBe(0);
  await page.getByRole("button", { name: "Create model", exact: true }).click();
  await expect(page.getByAltText("Your saved full-length model")).toBeVisible();
  expect(creates).toBe(1);
});

test("model onboarding follows browser language and keeps red as an API enum", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "languages", { get: () => ["fr-FR"] });
    Object.defineProperty(navigator, "language", { get: () => "fr-FR" });
  });
  await mocks(page, { model: null, enabled: false, invitationState: "unseen" });
  await page.goto(url + "/app");
  await page.locator("[data-style-skip]").click();
  await expect(
    page.getByRole("heading", { name: "Créer votre mannequin" }),
  ).toBeVisible();
  for (const [field, value] of Object.entries(prefs)) {
    if (field !== "heightCm")
      await page
        .locator(
          `input[name="model-${field}"][value="${field === "hair" ? "red" : value}"]`,
        )
        .check();
  }
  await page.getByRole("button", { name: "Continuer", exact: true }).click();
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("autolister:pending-model:v1"))
          .preferences.hair,
    ),
  ).toBe("red");
});
