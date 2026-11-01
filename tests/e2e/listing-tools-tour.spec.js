const { test, expect } = require("@playwright/test");
const { openBatchJourney } = require("./batch-journey");
const fs = require("node:fs"),
  path = require("node:path");
const evidence = process.env.LISTING_TOUR_EVIDENCE;

test("localized toolbar layout stays within its form at desktop and phone widths", async () => {
  const f = await openBatchJourney();
  const layouts = [];
  try {
    const p = f.controller;
    await expect(p.locator("#quickvint-model-control")).toBeVisible();
    await p.addStyleTag({
      content:
        "body{padding:12px}main{max-width:560px;padding:0}button{box-sizing:border-box}",
    });
    for (const width of [1024, 375]) {
      await p.setViewportSize({ width, height: 900 });
      for (const locale of [
        "en",
        "nl",
        "fr",
        "de",
        "es",
        "it",
        "pl",
        "pt",
        "cz",
        "da",
        "el",
        "hr",
        "fi",
        "hu",
        "lt",
        "ro",
        "sk",
        "sv",
      ]) {
        await f.worker.evaluate(
          (locale) =>
            chrome.storage.local.set({
              selectedDescriptionLanguage: locale,
              quickvintLanguagePreferenceTouched: true,
            }),
          locale,
        );
        await expect(p.locator(".al-listing-tools")).toHaveAttribute(
          "lang",
          locale === "cz" ? "cs" : locale,
        );
        const layout = await p
          .locator(".quickvint-primary-tools")
          .evaluate((e) => {
            const r = e.getBoundingClientRect(),
              children = [...e.children]
                .filter((e) => e.getClientRects().length)
                .map((e) => {
                  const b = e.getBoundingClientRect();
                  return {
                    id: e.id,
                    left: b.left,
                    right: b.right,
                    top: b.top,
                    bottom: b.bottom,
                    scroll: e.scrollWidth,
                    client: e.clientWidth,
                  };
                });
            return { left: r.left, right: r.right, children };
          });
        layouts.push({ width, locale, ...layout });
        for (const c of layout.children) {
          expect(c.left, locale).toBeGreaterThanOrEqual(layout.left - 1);
          expect(c.right, locale).toBeLessThanOrEqual(layout.right + 1);
        }
      }
    }
  } finally {
    fs.writeFileSync(
      "/tmp/listing-tools-layouts.json",
      JSON.stringify(layouts, null, 2),
    );
    await f.close();
  }
});

test("Help shows its actions and all new controls follow the existing UI language without reload", async () => {
  const f = await openBatchJourney();
  try {
    const p = f.controller;
    await expect(p.locator("#quickvint-model-control")).toBeVisible();
    await expect(p.locator("#quickvint-more-btn")).toHaveText("Help");
    await p.locator("#quickvint-more-btn").click();
    const panel = p
      .locator("dialog.al-tools-panel")
      .filter({ has: p.locator("#quickvint-tour-replay") });
    await expect(panel).toBeVisible();
    const feedbackIcon = await panel
      .locator("#quickvint-report-btn svg")
      .boundingBox();
    expect(feedbackIcon.width).toBe(16);
    expect(feedbackIcon.height).toBe(16);
    for (const name of ["Quick tour", "Send feedback", "Hide controls"])
      await expect(
        panel.getByRole("button", { name, exact: true }),
      ).toBeVisible();
    await f.worker.evaluate(() =>
      chrome.storage.local.set({
        selectedTitleLanguage: "nl",
        selectedDescriptionLanguage: "fr",
        quickvintLanguagePreferenceTouched: true,
      }),
    );
    await expect(panel).toHaveAttribute("aria-label", "Aide");
    await expect(p.locator("#quickvint-more-btn")).toHaveText("Aide");
    await expect(p.locator("#quickvint-gen-btn .label")).toHaveText("Générer");
    await expect(
      panel.getByRole("button", { name: "Visite rapide", exact: true }),
    ).toBeVisible();
    await expect(p.locator("#quickvint-model-btn")).toHaveAttribute(
      "aria-label",
      "Votre mannequin",
    );
    await p.keyboard.press("Escape");
    await p.locator("#quickvint-style-btn").click();
    await expect(
      p.locator("#quickvint-description-length-toggle"),
    ).toHaveAttribute("aria-label", "Longueur de la description");
    await expect(
      p.locator("#quickvint-description-footer-edit-btn"),
    ).toHaveAttribute("aria-label", "Modifier la note du vendeur");
    await expect(p.locator('[data-format="bullets"]')).toHaveAttribute(
      "aria-label",
      "Liste à puces",
    );
    await f.worker.evaluate(() =>
      chrome.storage.local.set({ selectedDescriptionLanguage: "de" }),
    );
    await expect(p.locator("#quickvint-style-btn")).toHaveText("Schreibstil");
    await expect(p.locator("#quickvint-gen-btn .label")).toHaveText(
      "Generieren",
    );
    await expect(
      p.locator("#quickvint-description-length-toggle"),
    ).toHaveAttribute("aria-label", "Beschreibungslänge");
    await expect(p.locator("#quickvint-emoji-toggle")).toHaveAttribute(
      "title",
      "Emojis",
    );
    await p.keyboard.press("Escape");
    await replay(p);
    await p
      .locator("#quickvint-listing-tour")
      .getByRole("button", { name: "Weiter", exact: true })
      .focus();
    await f.worker.evaluate(() =>
      chrome.storage.local.set({ selectedDescriptionLanguage: "nl" }),
    );
    await expect(p.locator("#quickvint-listing-tour")).toHaveAttribute(
      "lang",
      "nl",
    );
    await expect(
      p
        .locator("#quickvint-listing-tour")
        .getByRole("button", { name: "Volgende", exact: true }),
    ).toBeFocused();
    await p
      .locator("#quickvint-listing-tour")
      .getByRole("button", { name: "Volgende", exact: true })
      .click();
    await p
      .locator("#quickvint-listing-tour")
      .getByRole("button", { name: "Volgende", exact: true })
      .click();
    await expect(p.locator("#al-tour-copy")).toHaveText(
      "Bekijk of maak hier je model. Schakel het in voor twee modelfoto’s bij geschikte artikelen.",
    );
    expect(f.requests).toHaveLength(0);
  } finally {
    await f.close();
  }
});

test("model preview and toggle retain their real handlers and the thumb stays inside its track", async () => {
  const f = await openBatchJourney();
  let enabled = false;
  try {
    await f.context.route("https://autolister.app/api/user/model", (route) => {
      if (route.request().method() === "PATCH")
        enabled = route.request().postDataJSON().enabled;
      return route.fulfill({
        json: {
          enabled,
          listingPhotosAvailable: true,
          invitationState: "seen",
          model: {
            state: "ready",
            imageUrl: "https://storage.test/photo-0.png",
          },
        },
      });
    });
    const p = f.controller;
    await p.reload();
    await expect(p.locator("#quickvint-model-toggle")).toBeVisible();
    await p.locator("#quickvint-model-toggle").click();
    await expect(p.locator("#quickvint-model-toggle")).toHaveAttribute(
      "aria-checked",
      "true",
    );
    const fits = await p.locator("#quickvint-model-toggle").evaluate((e) => {
      const t = e
          .querySelector(".quickvint-toggle-switch")
          .getBoundingClientRect(),
        k = e.querySelector(".quickvint-toggle-knob").getBoundingClientRect();
      return (
        k.left >= t.left &&
        k.right <= t.right &&
        k.top >= t.top &&
        k.bottom <= t.bottom
      );
    });
    expect(fits).toBe(true);
    expect(enabled).toBe(true);
    await p.locator("#quickvint-model-btn").click();
    await expect(p.locator("dialog.um-modal")).toBeVisible();
    await p.keyboard.press("Escape");
    await expect(p.locator("dialog.um-modal")).toHaveCount(0);
    expect(f.requests).toHaveLength(0);
  } finally {
    await f.close();
  }
});

test("hidden drop overlays never anchor photo tools or become their parent", async () => {
  const f = await openBatchJourney();
  try {
    const p = f.controller;
    await p.setViewportSize({ width: 1024, height: 850 });
    await realisticFixture(p);
    await p.evaluate(() => {
      const grid = document.querySelector('[data-testid="media-upload-grid"]');
      const drop = document.createElement("div");
      drop.dataset.testid = "dropzone";
      grid.before(drop);
      drop.append(grid);
      const overlay = document.createElement("div");
      overlay.dataset.testid = "dropzone-overlay";
      overlay.style.cssText =
        "position:absolute;visibility:hidden;top:0;left:0";
      overlay.innerHTML = "<h2><span>Drop files here</span></h2>";
      drop.prepend(overlay);
      dispatchEvent(new Event("resize"));
    });
    await expect(p.locator("#quickvint-phone-btn")).toBeVisible();
    await expect
      .poll(() =>
        p.locator("#quickvint-phone-btn").evaluate((e) => {
          const heading = document
              .querySelector(".fixture-photos")
              .getBoundingClientRect(),
            b = e.getBoundingClientRect();
          return Math.abs(
            (b.top + b.bottom) / 2 - (heading.top + heading.bottom) / 2,
          );
        }),
      )
      .toBeLessThan(2);
    expect(
      await p
        .locator("#quickvint-phone-btn")
        .evaluate((e) => Boolean(e.closest('[data-testid="dropzone"]'))),
    ).toBe(false);
    await p.waitForTimeout(1200);
    await expect(p.locator("#quickvint-phone-btn")).toBeVisible();
    await p.locator("#quickvint-phone-btn").click();
    await expect(p.locator(".quickvint-upload-choice-card")).toBeVisible();
  } finally {
    await f.close();
  }
});

async function finishInvitation(page) {
  await expect(page.locator(".al-tour-invitation")).toBeVisible();
  await page
    .locator(".al-tour-invitation")
    .getByRole("button", { name: "Skip", exact: true })
    .click();
}
async function replay(page) {
  await page.locator("#quickvint-more-btn").click();
  await page.locator("#quickvint-tour-replay").click();
}
async function realisticFixture(page) {
  await page.addStyleTag({
    content: `
    body{background:white;padding:24px 12px;margin:0;color:#172126;font:14px Arial,sans-serif}
    main{max-width:560px;padding:0;margin:0 auto}
    label{margin-bottom:16px}
    input,textarea{border:1px solid #bac2c5;border-radius:4px;padding:12px;background:white;font:16px Arial;min-height:44px}
    textarea{height:126px;min-height:126px}
    [data-testid="media-upload-grid"]{border:1px solid #e2e5e7;border-radius:4px;height:220px;margin-bottom:44px;position:relative;padding:22px}
    [data-testid="media-upload-grid"]:before{content:"Upload photos";color:#007f87;border:1px solid #007f87;padding:12px 20px;border-radius:4px;position:absolute;top:50%;left:50%;transform:translate(-50%,-50%)}
    [data-testid="add-photos-input"]{opacity:0;position:absolute;inset:0;width:100%;height:100%;cursor:pointer}
    .photo-box{display:none}
    .fixture-photos{font-size:16px;font-weight:600;margin:0 0 22px;min-height:40px;display:flex;align-items:center}
    .fixture-title{font-size:18px;font-weight:600;margin:0 0 28px}
    @media(max-width:600px){body{padding:18px 12px} [data-testid="media-upload-grid"]{height:180px;margin-bottom:36px}}
  `,
  });
  await page.evaluate(() => {
    const main = document.querySelector("main"),
      grid = document.querySelector('[data-testid="media-upload-grid"]'),
      bar = document.querySelector("#quickvint-photo-tools");
    const section = document.createElement("section"),
      heading = document.createElement("h2");
    heading.className = "fixture-photos";
    heading.textContent = "Photos";
    section.append(heading, bar, grid);
    main.prepend(section);
    const title = document.createElement("h2");
    title.className = "fixture-title";
    title.textContent = "About your item";
    section.after(title);
    document.querySelector('[data-testid="title--input"]').placeholder =
      "Tell buyers what you’re selling";
    document.querySelector('[data-testid="description--input"]').placeholder =
      "Tell buyers about your item";
    dispatchEvent(new Event("resize"));
  });
}
async function shot(page, name) {
  if (!evidence) return;
  fs.mkdirSync(evidence, { recursive: true });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: path.join(evidence, name + ".png"),
    fullPage: true,
  });
}
test("first-use tour is optional, remembered, replayable and never generates", async () => {
  const f = await openBatchJourney();
  try {
    const p = f.controller;
    await p.setViewportSize({ width: 1440, height: 1000 });
    await realisticFixture(p);
    await expect(p.locator("#quickvint-model-control")).toBeVisible();
    await expect(p.locator(".um-modal")).toHaveCount(0);
    await expect(p.locator(".al-tour-invitation")).toBeVisible();
    await shot(p, "desktop-invitation");
    await p
      .locator(".al-tour-invitation")
      .getByRole("button", { name: "Quick tour", exact: true })
      .click();
    await expect(p.locator("#quickvint-listing-tour")).toContainText("1 / 3");
    await shot(p, "desktop-tour-photos");
    await p
      .locator("#quickvint-listing-tour")
      .getByRole("button", { name: "Next", exact: true })
      .click();
    await expect(p.locator("#quickvint-listing-tour")).toContainText(
      "Generate, then review",
    );
    await shot(p, "desktop-tour-generate");
    await p.keyboard.press("Escape");
    await expect(p.locator("#quickvint-listing-tour")).toHaveCount(0);
    await p.reload();
    await expect(p.locator("#quickvint-more-btn")).toBeVisible();
    await expect
      .poll(() =>
        f.worker.evaluate(() =>
          chrome.storage.local.get("listingTourV1:test-user"),
        ),
      )
      .toEqual({ "listingTourV1:test-user": true });
    await p.waitForTimeout(1200);
    await expect(p.locator(".al-tour-invitation")).toHaveCount(0);
    await expect(p.locator("#quickvint-model-control")).toBeVisible();
    await realisticFixture(p);
    await replay(p);
    await p
      .locator("#quickvint-listing-tour")
      .getByRole("button", { name: "Next", exact: true })
      .click();
    await p
      .locator("#quickvint-listing-tour")
      .getByRole("button", { name: "Next", exact: true })
      .click();
    await expect(p.locator("#quickvint-listing-tour")).toContainText(
      "Your model is optional",
    );
    await shot(p, "desktop-tour-model");
    await p
      .locator("#quickvint-listing-tour")
      .getByRole("button", { name: "Done", exact: true })
      .click();
    await shot(p, "desktop-ready");
    expect(f.requests).toHaveLength(0);
    await expect(p.locator('[data-testid="title--input"]')).toHaveValue("");
    await expect(p.locator('[data-testid="description--input"]')).toHaveValue(
      "",
    );
  } finally {
    await f.close();
  }
});
test("writing preferences persist, dialogs contain keyboard focus and fit narrow screens", async () => {
  const f = await openBatchJourney();
  try {
    const p = f.controller;
    await finishInvitation(p);
    await expect(p.locator("#quickvint-model-control")).toBeVisible();
    await p.setViewportSize({ width: 375, height: 667 });
    await realisticFixture(p);
    await shot(p, "mobile-ready");
    await p.locator("#quickvint-style-btn").click();
    const dialog = p.getByRole("dialog", {
      name: "Writing style",
      exact: true,
    });
    await expect(dialog).toBeVisible();
    await dialog.locator('[data-length="short"]').click();
    await expect
      .poll(() =>
        f.worker.evaluate(() => chrome.storage.local.get("descriptionLength")),
      )
      .toEqual({ descriptionLength: "short" });
    await expect(dialog.locator('[data-length="short"]')).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await shot(p, "mobile-writing-style");
    const box = await dialog.boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.y + box.height).toBeLessThanOrEqual(667);
    for (let i = 0; i < 15; i++) {
      await p.keyboard.press("Tab");
      expect(
        await dialog.evaluate((d) => d.contains(document.activeElement)),
      ).toBe(true);
    }
    await p.keyboard.press("Escape");
    await expect(p.locator("#quickvint-style-btn")).toBeFocused();
    await replay(p);
    await shot(p, "mobile-tour");
    await p
      .locator("#quickvint-listing-tour")
      .getByRole("button", { name: "Skip", exact: true })
      .click();
    await p.locator("#quickvint-phone-btn").click();
    await expect(p.locator(".quickvint-upload-choice-card")).toBeVisible();
    expect(f.requests).toHaveLength(0);
  } finally {
    await f.close();
  }
});
test("edit pages have replay but no automatic invitation and account changes dismiss an active tour", async () => {
  const f = await openBatchJourney();
  try {
    const p = f.controller;
    await finishInvitation(p);
    await replay(p);
    await f.worker.evaluate(() =>
      chrome.storage.local.set({ supabaseSession: null }),
    );
    await expect(p.locator("#quickvint-listing-tour")).toHaveCount(0);
    await f.worker.evaluate(() =>
      chrome.storage.local.set({
        supabaseSession: {
          access_token: "local",
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          user: { id: "second-user" },
        },
      }),
    );
    await expect(p.locator(".al-tour-invitation")).toBeVisible();
    await p
      .locator(".al-tour-invitation")
      .getByRole("button", { name: "Skip", exact: true })
      .click();
    await p.evaluate(() => history.pushState({}, "", "/items/123/edit"));
    await p.waitForTimeout(1200);
    await expect(p.locator(".al-tour-invitation")).toHaveCount(0);
    await replay(p);
    await expect(p.locator("#quickvint-listing-tour")).toBeVisible();
  } finally {
    await f.close();
  }
});
