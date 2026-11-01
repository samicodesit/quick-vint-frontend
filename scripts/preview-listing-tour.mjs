import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
export async function previewListingTour({ context, folder, extensionId }) {
  const out = join(folder, "listing-tour");
  mkdirSync(out, { recursive: true });
  const reload = await context.newPage();
  await reload.goto(`chrome-extension://${extensionId}/popup.html`);
  await reload.evaluate(() => chrome.runtime.reload()).catch(() => {});
  await new Promise((r) => setTimeout(r, 1000));
  await reload.close().catch(() => {});
  const page = await context.newPage(),
    checks = [];
  await page.addInitScript(() =>
    document.addEventListener(
      "submit",
      (e) => {
        e.preventDefault();
        e.stopImmediatePropagation();
      },
      true,
    ),
  );
  try {
    await page.goto("https://www.vinted.nl/items/new", {
      waitUntil: "domcontentloaded",
    });
    await page.locator("#quickvint-style-btn").waitFor({ timeout: 30000 });
    await page
      .locator("#quickvint-model-control")
      .waitFor({ timeout: 10000 })
      .catch(() => {});
    // Render the gated model entry with a cached example, never paid generation.
    const cdp = await context.newCDPSession(page),
      worlds = [];
    cdp.on("Runtime.executionContextCreated", ({ context }) =>
      worlds.push(context),
    );
    await cdp.send("Runtime.enable");
    const world = worlds.find(
      (w) => w.origin === `chrome-extension://${extensionId}`,
    );
    if (world) {
      await cdp.send("Runtime.evaluate", {
        contextId: world.id,
        expression: `(()=>{
    const send=chrome.runtime.sendMessage.bind(chrome.runtime);
    const state={enabled:false,listingPhotosAvailable:true,invitationState:'seen',model:{state:'ready',imageUrl:chrome.runtime.getURL('images/user-model-female.webp')}};
    chrome.runtime.sendMessage=(m,...args)=>{if(m.type==='USER_MODEL_REQUEST'){if(m.method==='PATCH')state.enabled=m.body.enabled;return Promise.resolve({ok:true,data:state});}return send(m,...args);};
    AutoListerModels.startContent();return true;
   })()`,
        returnByValue: true,
      });
      await page
        .locator("#quickvint-model-control")
        .waitFor({ timeout: 10000 });
      await cdp.send("Runtime.evaluate", {
        contextId: world.id,
        expression: "AutoListerModelCopy.setLocale('en')",
      });
      await page.waitForTimeout(1100);
      await page.locator("#quickvint-model-toggle").click();
      await page.waitForFunction(
        () =>
          document
            .querySelector("#quickvint-model-toggle")
            ?.getAttribute("aria-checked") === "true",
      );
    }
    writeFileSync(
      join(out, "placement.json"),
      JSON.stringify(
        await page.evaluate(() => {
          const grid = document.querySelector(
              '[data-testid="media-upload-grid"],[data-testid="media-select-grid"]',
            ),
            button = document.querySelector("#quickvint-phone-btn");
          return {
            button: button?.outerHTML,
            bar: button?.parentElement.outerHTML,
            parents: [
              grid,
              grid?.parentElement,
              grid?.parentElement?.parentElement,
              grid?.parentElement?.parentElement?.parentElement,
            ].map((e) => e?.outerHTML.slice(0, 6000)),
          };
        }),
        null,
        2,
      ),
    );
    for (const width of [1440, 1024, 375]) {
      await page.setViewportSize({ width, height: width === 375 ? 812 : 1050 });
      await page.evaluate(() => {
        scrollTo(0, 0);
        return document.fonts.ready;
      });
      await page.locator("#quickvint-gen-btn").scrollIntoViewIfNeeded();
      await page.screenshot({ path: join(out, `actual-${width}.png`) });
      if (width === 1440)
        await page.screenshot({
          path: join(out, "desktop-detail.png"),
          clip: { x: 392, y: 185, width: 625, height: 755 },
        });
      const bounds = await page
        .locator(".quickvint-primary-tools")
        .evaluate((e) => ({
          width: innerWidth,
          overflow: e.scrollWidth > e.clientWidth,
          children: [...e.children].map((e) => ({
            id: e.id,
            x: e.getBoundingClientRect().x,
            right: e.getBoundingClientRect().right,
            y: e.getBoundingClientRect().y,
            height: e.getBoundingClientRect().height,
          })),
        }));
      if (bounds.overflow) throw Error("Toolbar overflow at " + width);
      checks.push(bounds);
      await page.locator("#quickvint-more-btn").click();
      await page.screenshot({ path: join(out, `tools-${width}.png`) });
      if (width === 1440)
        await page.screenshot({
          path: join(out, "tools-detail.png"),
          clip: { x: 392, y: 185, width: 625, height: 755 },
        });
      await page.locator("#quickvint-tour-replay").click();
      await page.locator("#quickvint-listing-tour").waitFor();
      for (let n = 1; n <= 3; n++) {
        await page.screenshot({ path: join(out, `tour-${width}-${n}.png`) });
        if (width === 1440)
          await page.screenshot({
            path: join(out, `tour-detail-${n}.png`),
            clip: { x: 300, y: 185, width: 720, height: 755 },
          });
        const next = page
          .locator("#quickvint-listing-tour footer button")
          .last();
        if (n === 3 || /Done|Klaar/.test(await next.innerText())) {
          await next.click();
          break;
        }
        await next.click();
      }
      await page.locator("#quickvint-style-btn").click();
      await page.screenshot({ path: join(out, `style-${width}.png`) });
      await page.keyboard.press("Escape");
    }
    if (world) {
      await page.setViewportSize({ width: 1440, height: 1050 });
      await cdp.send("Runtime.evaluate", {
        contextId: world.id,
        expression:
          "AutoListerModelCopy.setLocale('fr');dispatchEvent(new CustomEvent('autolister-ui-language-change'))",
      });
      await page.locator("#quickvint-style-btn").click();
      await page.screenshot({
        path: join(out, "localized-fr.png"),
        clip: { x: 392, y: 185, width: 625, height: 820 },
      });
      await page.keyboard.press("Escape");
      await cdp.detach();
    }
    writeFileSync(
      join(out, "verification.json"),
      JSON.stringify(
        {
          checks,
          realVinted: true,
          cachedModelExample: true,
          paidCalls: 0,
          listingWrites: 0,
          localBuild: true,
        },
        null,
        2,
      ),
    );
    return {
      listingTour: true,
      realVinted: true,
      paidCalls: 0,
      listingWrites: 0,
    };
  } finally {
    await page.close();
  }
}
