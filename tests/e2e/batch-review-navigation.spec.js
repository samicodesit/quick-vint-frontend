const { test, expect } = require("@playwright/test");
const { openBatchJourney } = require("./batch-journey");

async function groupTwoItems(flow) {
  await flow.controller.locator("#quickvint-phone-btn").click();
  await flow.controller.locator(".quickvint-upload-choice-multiple").click();
  const modal = flow.controller.locator("#quickvint-batch-modal");
  await expect(modal.locator(".batch-photo")).toHaveCount(4);
  await modal.locator(".batch-gallery .batch-photo:visible").nth(0).click();
  await modal.locator(".batch-gallery .batch-photo:visible").nth(1).click();
  await modal.locator(".batch-mark-group").click();
  await expect(modal.locator(".batch-gallery .batch-photo:visible")).toHaveCount(2);
  await modal.locator(".batch-gallery .batch-photo:visible").nth(0).click();
  await modal.locator(".batch-gallery .batch-photo:visible").nth(1).click();
  await modal.locator(".batch-mark-group").click();
  await modal.locator(".batch-start").click();
}

test("seller reviews the first ready listing while later listings prepare without stealing focus or edits", async () => {
  let releaseSecond;
  const secondMayFinish = new Promise(resolve => { releaseSecond = resolve; });
  const flow = await openBatchJourney({ realVisibility: true, headless: false, photos: 4,
    generate: async ({ route, request, requests, commits }) => {
      if (requests.length === 2) await secondMayFinish;
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(commits.get(request.id)) });
    },
  });
  try {
    await groupTwoItems(flow);
    await expect.poll(() => flow.requests.length).toBe(1);
    const first = flow.context.pages().find(page => page !== flow.controller && page.url().includes("/items/new"));
    await expect.poll(() => first.evaluate(() => document.visibilityState)).toBe("visible");
    await expect(first.getByRole("button", { name: "Pause auto-follow", exact: true })).toBeVisible();
    await expect(first.locator("#quickvint-batch-navigation")).toHaveCount(0);
    await expect(first.locator("#quickvint-batch-tab-status")).toHaveCount(1);
    await first.locator('[data-testid="description--input"]').fill("Seller checked and edited this description.");
    await expect.poll(() => flow.requests.length).toBe(2);
    const pages = flow.context.pages().filter(page => page !== flow.controller && page.url().includes("/items/new"));
    releaseSecond();
    await expect.poll(() => flow.cleanup.length).toBe(1);
    expect(await first.evaluate(() => document.visibilityState)).toBe("visible");
    await expect(first.locator('[data-testid="description--input"]')).toHaveValue("Seller checked and edited this description.");
    await expect(pages[1].locator("#quickvint-batch-review-modal")).toHaveCount(0);
    await first.getByRole("button", { name: "Next ready listing", exact: true }).click();
    await expect.poll(() => pages[1].evaluate(() => document.visibilityState)).toBe("visible");
    await pages[1].getByRole("button", { name: "Back to batch", exact: true }).click();
    await expect.poll(() => flow.controller.evaluate(() => document.visibilityState)).toBe("visible");
    await flow.controller.getByRole("button", { name: "Review listing 1", exact: true }).click();
    await expect.poll(() => first.evaluate(() => document.visibilityState)).toBe("visible");
    expect(flow.commits.size).toBe(2);
  } finally { releaseSecond(); await flow.close(); }
});

test("each new listing opens in front while photos and generation are still in progress", async () => {
  let releaseFirst;
  const firstMayFinish = new Promise(resolve => { releaseFirst = resolve; });
  let releaseSecond;
  const secondMayFinish = new Promise(resolve => { releaseSecond = resolve; });
  const flow = await openBatchJourney({ realVisibility: true, photos: 4,
    generate: async ({ route, request, requests, commits }) => {
      if (requests.length === 1) await firstMayFinish;
      if (requests.length === 2) await secondMayFinish;
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(commits.get(request.id)) });
    },
  });
  try {
    await groupTwoItems(flow);
    await expect.poll(() => flow.requests.length).toBe(1);
    const first = flow.context.pages().find(page => page !== flow.controller && page.url().includes("/items/new"));
    await expect.poll(() => first.evaluate(() => document.visibilityState)).toBe("visible");
    await expect(first.locator("#quickvint-batch-tab-status")).toContainText("writing title and description");
    await expect(first.locator('[data-testid="title--input"]')).toHaveValue("");
    await expect(first.locator('[data-testid="description--input"]')).toHaveJSProperty("readOnly", true);
    releaseFirst();
    await expect.poll(() => flow.requests.length).toBe(2);
    const pages = flow.context.pages().filter(page => page !== flow.controller && page.url().includes("/items/new"));
    await expect.poll(() => pages[1].evaluate(() => document.visibilityState)).toBe("visible");
    await expect(pages[1].locator('[data-testid="title--input"]')).toHaveValue("");
    await expect(pages[0].locator('[data-testid="description--input"]')).toHaveJSProperty("readOnly", false);
    releaseSecond();
    await expect.poll(() => flow.cleanup.length).toBe(1);
    await expect.poll(() => pages[1].evaluate(() => document.visibilityState)).toBe("visible");
    await expect(pages[1].locator("#quickvint-batch-tab-status")).toContainText("2/2 ready");
    expect(flow.requests).toHaveLength(2);
    expect(flow.commits.size).toBe(2);
  } finally { releaseFirst(); releaseSecond(); await flow.close(); }
});

test("a first finished listing does not pull the seller away from another tab", async () => {
  let release;
  const mayFinish = new Promise(resolve => { release = resolve; });
  const flow = await openBatchJourney({ realVisibility: true, headless: false,
    generate: async ({ route, request, commits }) => {
      await mayFinish;
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(commits.get(request.id)) });
    },
  });
  try {
    await flow.start();
    await expect.poll(() => flow.requests.length).toBe(1);
    const notes = await flow.context.newPage();
    await notes.goto("about:blank");
    await notes.bringToFront();
    release();
    await expect.poll(() => flow.cleanup.length).toBe(1);
    expect(await notes.evaluate(() => document.visibilityState)).toBe("visible");
  } finally { release(); await flow.close(); }
});

test("opening the next listing leaves another active tab alone", async () => {
  let releaseFirst, releaseSecond;
  const firstMayFinish = new Promise(resolve => { releaseFirst = resolve; });
  const secondMayFinish = new Promise(resolve => { releaseSecond = resolve; });
  const flow = await openBatchJourney({ realVisibility: true, photos: 4,
    generate: async ({ route, request, requests, commits }) => {
      await (requests.length === 1 ? firstMayFinish : secondMayFinish);
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(commits.get(request.id)) });
    },
  });
  try {
    await groupTwoItems(flow);
    await expect.poll(() => flow.requests.length).toBe(1);
    const notes = await flow.context.newPage();
    await notes.goto("about:blank");
    await notes.bringToFront();
    releaseFirst();
    await expect.poll(() => flow.requests.length).toBe(2);
    expect(await notes.evaluate(() => document.visibilityState)).toBe("visible");
    releaseSecond();
    await expect.poll(() => flow.cleanup.length).toBe(1);
    expect(await notes.evaluate(() => document.visibilityState)).toBe("visible");
  } finally { releaseFirst(); releaseSecond(); await flow.close(); }
});

test("a failed generation releases the temporary title and description locks", async () => {
  const flow = await openBatchJourney({ generate: ({ route }) => route.fulfill({
    status: 400, contentType: "application/json", body: JSON.stringify({ error: "Invalid fixture image input" }),
  }) });
  try {
    await flow.start();
    // A definitive remote-image rejection can use the existing local-image
    // fallback. This check concerns unlocking after that terminal failure.
    await expect.poll(() => flow.requests.length).toBeGreaterThan(0);
    await expect.poll(async () => (await flow.worker.evaluate(() => chrome.storage.local.get("quickvintBatchRecovery"))).quickvintBatchRecovery?.status).toBe("paused");
    const work = flow.context.pages().find(page => page !== flow.controller && page.url().includes("/items/new"));
    await expect(work.locator('[data-testid="title--input"]')).toHaveJSProperty("readOnly", false);
    await expect(work.locator('[data-testid="description--input"]')).toHaveJSProperty("readOnly", false);
    expect(flow.cleanup).toHaveLength(0);
  } finally { await flow.close(); }
});
