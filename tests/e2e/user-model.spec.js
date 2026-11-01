const { test, expect } = require("@playwright/test");
const path = require("node:path");
const fs = require("node:fs");
const root = path.resolve(__dirname, "../..");
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
      '<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1536"><rect width="1024" height="1536" fill="#e1d8cc"/></svg>',
    );
async function scripts(page) {
  await page.route("https://model-assets.test/images/**", (route) =>
    route.fulfill({
      path: path.join(
        root,
        "images",
        new URL(route.request().url()).pathname.split("/").pop(),
      ),
      contentType: "image/webp",
    }),
  );
  await page.addStyleTag({ path: path.join(root, "lib/typography.css") });
  await page.addStyleTag({ path: path.join(root, "lib/user-model.css") });
  await page.addScriptTag({ path: path.join(root, "language-defaults.js") });
  await page.addScriptTag({ path: path.join(root, "lib/user-model-copy.js") });
  await page.addScriptTag({ path: path.join(root, "lib/user-model-ui.js") });
  await page.addScriptTag({
    path: path.join(root, "lib/user-model-client.js"),
  });
}
async function chromeMock(page, state) {
  await page.evaluate(
    ({ state, image }) => {
      const listeners = [];
      let currentOwner = "owner";
      window.modelCalls = [];
      window.modelState = state;
      window.chrome = {
        runtime: {
          getURL: (path) => "https://model-assets.test/" + path,
          sendMessage: async (msg) => {
            window.modelCalls.push(msg);
            if (msg.body?.action === "invite")
              return { ok: true, data: { claimed: true } };
            if (msg.body?.action === "dismiss") {
              window.modelState.invitationState = "dismissed";
              return { ok: true, data: window.modelState };
            }
            if (msg.body?.action === "create")
              window.modelState = {
                enabled: false,
                model: {
                  state: "queued",
                  operationId: "op",
                  preferences: msg.body.preferences,
                },
              };
            if (msg.method === "PATCH")
              window.modelState.enabled = msg.body.enabled;
            return {
              ok: true,
              data: JSON.parse(JSON.stringify(window.modelState)),
            };
          },
        },
        storage: {
          local: {
            get: async () => ({
              supabaseSession: { user: { id: currentOwner } },
              selectedDescriptionLanguage: state.fixtureLanguage,
              quickvintLanguagePreferenceTouched: !!state.fixtureLanguage,
            }),
          },
          onChanged: {
            addListener: (fn) => listeners.push(fn),
            removeListener: (fn) => {
              const i = listeners.indexOf(fn);
              if (i >= 0) listeners.splice(i, 1);
            },
          },
        },
      };
      window.completeModel = () => {
        window.modelState = {
          enabled: true,
          model: { state: "ready", imageUrl: image, width: 1024, height: 1536 },
        };
        window.dispatchEvent(new Event("focus"));
      };
      window.changeModelOwner = () => {
        currentOwner = "another";
        window.modelState = {
          invitationState: "dismissed",
          enabled: false,
          model: null,
        };
        listeners
          .slice()
          .forEach((fn) =>
            fn(
              { supabaseSession: { newValue: { user: { id: "another" } } } },
              "local",
            ),
          );
      };
    },
    { state, image },
  );
}
async function choose(page) {
  for (const name of ["Female", "Brown", "Average", "Medium tan"])
    await page.getByRole("radio", { name, exact: true }).check();
}
async function shot(page, name) {
  if (process.env.MODEL_SCREENSHOT_DIR) {
    fs.mkdirSync(process.env.MODEL_SCREENSHOT_DIR, { recursive: true });
    await page.evaluate(() => {
      document.querySelector(".popup-container")?.scrollTo(0, 0);
      window.scrollTo(0, 0);
    });
    await page.screenshot({
      path: path.join(process.env.MODEL_SCREENSHOT_DIR, name),
      fullPage: true,
    });
  }
}
test("popup model view preserves seller note, completes in background and survives reopening", async ({
  page,
}) => {
  const html = fs
    .readFileSync(path.join(root, "popup.html"), "utf8")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, "");
  await page.setViewportSize({ width: 320, height: 600 });
  await page.setContent(html);
  await page.evaluate(() => {
    document.body.classList.add("settings-active");
    document.body.dataset.view = "signed-in";
  });
  await chromeMock(page, {
    enabled: false,
    invitationState: "seen",
    model: null,
  });
  await scripts(page);
  await page.evaluate(() => AutoListerModels.startPopup());
  await expect(page.locator("#userModelButton")).toHaveClass(/um-discover/);
  await expect(page.locator("#userModelButton img")).toHaveJSProperty(
    "naturalWidth",
    280,
  );
  await shot(page, "extension-settings.png");
  await page.locator("#descriptionFooterText").fill("Keep my unsaved note");
  await page.locator("#userModelButton").click();
  await expect(page.locator("#userModelButton")).not.toHaveClass(/um-discover/);
  await choose(page);
  await shot(page, "extension-preferences.png");
  await page
    .getByRole("button", { name: "Back to settings", exact: true })
    .click();
  await expect(page.locator("#descriptionFooterText")).toHaveValue(
    "Keep my unsaved note",
  );
  await page.locator("#userModelButton").click();
  await choose(page);
  await page.getByRole("button", { name: "Create model", exact: true }).click();
  await expect(page.getByText("Creating your model…")).toBeVisible();
  await page
    .getByRole("button", { name: "Back to settings", exact: true })
    .click();
  await page.evaluate(() => completeModel());
  await page.locator("#userModelButton").click();
  await expect(page.getByAltText("Your saved full-length model")).toBeVisible();
  await page.getByRole("switch", { name: "Enable your model" }).uncheck();
  await expect(
    page.getByRole("switch", { name: "Enable your model" }),
  ).not.toBeChecked();
  await shot(page, "extension-saved-model.png");
  expect(
    await page.evaluate(
      () => modelCalls.filter((c) => c.body?.action === "create").length,
    ),
  ).toBe(1);
  await page.evaluate(() => changeModelOwner());
  await expect(page.getByAltText("Your saved full-length model")).toHaveCount(
    0,
  );
});

test("all model languages fit the popup and preserve preference enum values", async ({
  page,
}) => {
  const html = fs
    .readFileSync(path.join(root, "popup.html"), "utf8")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, "");
  await page.setViewportSize({ width: 320, height: 600 });
  await page.setContent(html);
  await page.evaluate(() => {
    document.body.classList.add("settings-active");
    document.body.dataset.view = "signed-in";
    document.getElementById("settingsView").classList.add("um-popup-active");
    const view = document.createElement("section");
    view.className = "um-popup-view";
    view.id = "locale-view";
    document.getElementById("settingsView").append(view);
  });
  await scripts(page);
  const languages = await page.evaluate(() =>
    Object.keys(AutoListerModelCopy.copy),
  );
  for (const code of languages) {
    await page.evaluate(
      ({ code, prefs }) => {
        window.disposeModelLocale?.();
        AutoListerModelCopy.setLocale(code);
        window.disposeModelLocale = AutoListerModelUI.mount(
          document.getElementById("locale-view"),
          {
            initialPreferences: prefs,
            onClose: () => {},
            backLabel: "Settings",
            request: async (method, body) => {
              if (body?.action === "create")
                window.localePrefs = body.preferences;
              return {
                model: null,
                enabled: false,
                invitationState: "dismissed",
              };
            },
          },
        );
      },
      { code, prefs },
    );
    expect(
      await page
        .locator(".um-view")
        .evaluate((el) => el.scrollWidth <= el.clientWidth),
    ).toBe(true);
    await page.locator('input[name="model-hair"][value="red"]').check();
    await page.locator(".um-primary").click();
    expect(await page.evaluate(() => window.localePrefs.hair)).toBe("red");
    if (["fr", "de"].includes(code))
      await shot(page, "extension-preferences-" + code + ".png");
  }
});

test("popup model copy follows the existing explicit language preference", async ({
  page,
}) => {
  const html = fs
    .readFileSync(path.join(root, "popup.html"), "utf8")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, "");
  await page.setViewportSize({ width: 320, height: 600 });
  await page.setContent(html);
  await page.evaluate(() => {
    document.body.classList.add("settings-active");
    document.body.dataset.view = "signed-in";
  });
  await chromeMock(page, {
    model: null,
    enabled: false,
    invitationState: "seen",
    fixtureLanguage: "fr",
  });
  await scripts(page);
  await page.evaluate(() => AutoListerModels.startPopup());
  await page
    .getByRole("button", { name: "Créer votre mannequin", exact: true })
    .click();
  await expect(
    page.getByRole("radio", { name: "Roux", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Créer le mannequin", exact: true }),
  ).toBeVisible();
});
test("listing invitation waits for an idle eligible route and closes on account switch", async ({
  page,
}) => {
  await page.route("https://www.vinted.com/**", (route) =>
    route.fulfill({
      body: '<html><body><h1>Add an item</h1><div><button id="quickvint-description-footer-edit-btn">Seller note</button></div></body></html>',
      contentType: "text/html",
    }),
  );
  await page.goto("https://www.vinted.com/items/new");
  await chromeMock(page, {
    invitationState: "unseen",
    enabled: false,
    model: null,
  });
  await scripts(page);
  await page.evaluate(() => {
    window.modelBusy = true;
    AutoListerModels.startContent({ isBusy: () => window.modelBusy });
  });
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.evaluate(() => (window.modelBusy = false));
  await expect(page.getByRole("dialog")).toBeVisible({ timeout: 5000 });
  await expect(page.locator(".um-invitation-new")).toHaveText("New");
  const invitationFonts = await page
    .locator(".um-view")
    .evaluate((el) =>
      [el, el.querySelector("h2"), el.querySelector("button")].map(
        (node) => getComputedStyle(node).fontFamily,
      ),
    );
  expect(new Set(invitationFonts).size).toBe(1);
  expect(invitationFonts[0]).toContain("system-ui");
  await expect(page.locator(".um-example-pair img").first()).toHaveJSProperty(
    "naturalWidth",
    280,
  );
  await shot(page, "extension-invitation.png");
  await page.getByRole("button", { name: "Create my model" }).click();
  await choose(page);
  await expect(
    page.getByRole("button", { name: "Create model", exact: true }),
  ).toBeVisible();
  await page.evaluate(() => changeModelOwner());
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(
    await page.evaluate(
      () => modelCalls.filter((c) => c.body?.action === "create").length,
    ),
  ).toBe(0);
});
test("shared preference form requires all choices and keeps height numeric", async ({
  page,
}) => {
  await page.setContent('<section id="view"></section>');
  await scripts(page);
  await page.evaluate(() =>
    AutoListerModelUI.mount(document.getElementById("view"), {
      mode: "preferences",
      onContinue: (value) => (window.modelChoice = value),
    }),
  );
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  expect(await page.evaluate(() => window.modelChoice)).toBeUndefined();
  await choose(page);
  await page
    .getByRole("spinbutton", { name: "Height value in centimeters" })
    .fill("184");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  expect(await page.evaluate(() => window.modelChoice.heightCm)).toBe(184);
});

test("a late refresh cannot undo a more recent enable toggle", async ({
  page,
}) => {
  await page.setContent('<section id="view"></section>');
  await scripts(page);
  await page.evaluate(
    ({ image }) => {
      let reads = 0;
      const ready = (enabled) => ({
        enabled,
        model: { state: "ready", imageUrl: image },
      });
      AutoListerModelUI.mount(document.getElementById("view"), {
        request: async (method, body) => {
          if (method === "PATCH") return ready(body.enabled);
          if (reads++ === 0) return ready(true);
          return new Promise((resolve) => {
            window.resolveOldModelRead = () => resolve(ready(true));
          });
        },
      });
    },
    { image },
  );
  await expect(page.getByRole("switch")).toBeChecked();
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await page.getByRole("switch").uncheck();
  await page.evaluate(() => resolveOldModelRead());
  await expect(page.getByRole("switch")).not.toBeChecked();
});
