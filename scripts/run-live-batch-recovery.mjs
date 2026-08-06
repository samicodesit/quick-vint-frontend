// Real Vinted batch recovery test. Never clicks Save or Publish.
import { writeFileSync } from "node:fs";
import { chromium } from "@playwright/test";

const required = (name) => {
  const value = String(process.env[name] || "").trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
};

const userDataDir = required("AUTOLISTER_REAL_BATCH_USER_DATA");
const extensionPath = required("AUTOLISTER_REAL_BATCH_EXTENSION");
const browserExecutable = required("AUTOLISTER_REAL_BATCH_BROWSER");
const outputFile = required("AUTOLISTER_REAL_BATCH_OUTPUT");
const imageOne = required("AUTOLISTER_REAL_BATCH_IMAGE_ONE");
const imageTwo = required("AUTOLISTER_REAL_BATCH_IMAGE_TWO");
const profileDirectory = String(process.env.AUTOLISTER_REAL_BATCH_PROFILE || "Default").trim();
const recoveryOnly = process.env.AUTOLISTER_REAL_BATCH_RECOVERY_ONLY === "1";
const origin = "https://www.vinted.nl";
const createUrl = `${origin}/items/new`;

const context = await chromium.launchPersistentContext(userDataDir, {
  executablePath: browserExecutable,
  headless: false,
  locale: "nl-NL",
  timezoneId: "Europe/Amsterdam",
  viewport: { width: 1440, height: 1000 },
  args: [
    "--disable-blink-features=AutomationControlled",
    `--profile-directory=${profileDirectory}`,
    `--disable-extensions-except=${extensionPath}`,
    `--load-extension=${extensionPath}`,
  ],
});

const diagnostics = {
  startedAt: new Date().toISOString(),
  normal: {},
  recovery: {},
  saveOrPublishClicks: 0,
};

let worker =
  context.serviceWorkers()[0] ||
  (await context.waitForEvent("serviceworker", { timeout: 30000 }));

const workerHasRecoveryCode = await worker.evaluate(async () =>
  (await (await fetch(chrome.runtime.getURL("background.js"))).text())
    .includes('case "QUICKVINT_TAB_JOB_HEARTBEAT"')
);
if (!workerHasRecoveryCode) throw new Error("Chrome loaded a stale extension worker.");
const extensionId = await worker.evaluate(() => chrome.runtime.id);
const preflightPage = await context.newPage();
await preflightPage.goto(`chrome-extension://${extensionId}/popup.html`);
const runtimeInfo = await preflightPage.evaluate(() =>
  chrome.runtime.sendMessage({ type: "GET_RUNTIME_INFO" })
);
await preflightPage.close();
if (runtimeInfo?.batchDiagnosticsVersion !== 1) {
  throw new Error("Chrome is executing a stale extension worker.");
}

async function getCurrentWorker() {
  const current = context.serviceWorkers().find((candidate) => candidate.url().endsWith("/background.js"));
  if (current) worker = current;
  return current || context.waitForEvent("serviceworker", { timeout: 30000 });
}

async function stopExtensionWorker(page) {
  const cdp = await context.newCDPSession(page);
  try {
    const { targetInfos } = await cdp.send("Target.getTargets");
    const target = targetInfos.find((item) =>
      item.type === "service_worker" && item.url.endsWith("/background.js")
    );
    if (!target) throw new Error("Could not find the extension worker target.");
    await cdp.send("Target.closeTarget", { targetId: target.targetId });
  } finally {
    await cdp.detach().catch(() => {});
  }
}

const readExtensionSession = () => worker.evaluate(async () => {
  const { supabaseSession } = await chrome.storage.local.get(["supabaseSession"]);
  return {
    hasToken: Boolean(supabaseSession?.access_token),
    email: supabaseSession?.user?.email || null,
    expiresAt: supabaseSession?.expires_at || null,
  };
});

let extensionSession = await readExtensionSession();
if (!extensionSession.hasToken) {
  const extensionId = await worker.evaluate(() => chrome.runtime.id);
  const signInPage = await context.newPage();
  await signInPage.goto(`chrome-extension://${extensionId}/popup.html`);
  console.log("ACTION REQUIRED: Sign into the AutoLister extension in this browser.");
  const deadline = Date.now() + 300000;
  while (!extensionSession.hasToken && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    extensionSession = await readExtensionSession();
  }
  await signInPage.close().catch(() => {});
}
if (!extensionSession.hasToken) throw new Error("AutoLister sign-in was not completed within five minutes.");
diagnostics.extensionAccount = extensionSession.email || null;
diagnostics.staleRecoveryDiscarded = await worker.evaluate(async () => {
  const key = "quickvintBatchRecovery";
  const recovery = (await chrome.storage.local.get(key))[key];
  if (!recovery) return false;
  if (recovery.sessionId) {
    const v2 = recovery.inputSource === "computer" ? "" : "&v=2&reason=cancelled";
    await fetch(`https://autolister.app/api/phone-upload?action=cleanup${v2}&sessionId=${encodeURIComponent(recovery.sessionId)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    }).catch(() => {});
  }
  await chrome.storage.local.remove(key);
  return true;
});

async function dismissDomainModal(page) {
  const modal = page.locator('[data-testid="domain-select-modal--overlay"]');
  if (!(await modal.isVisible().catch(() => false))) return;
  const netherlands = modal.getByText(/Nederland|Netherlands/i).first();
  if (await netherlands.isVisible().catch(() => false)) await netherlands.click();
  else await modal.locator('button[aria-label="Sluiten"], button[aria-label="Close"]').first().click();
  await page.waitForTimeout(800);
}

async function openRealCreatePage() {
  const page = await context.newPage();
  await page.goto(createUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
  await dismissDomainModal(page);
  if (new URL(page.url()).pathname !== "/items/new") {
    console.log("ACTION REQUIRED: Sign into Vinted in this browser, then open https://www.vinted.nl/items/new");
  }
  await page.locator('input[data-testid="title--input"]').waitFor({ timeout: 300000 });
  await page.locator("#quickvint-phone-btn").waitFor({ timeout: 45000 });
  await page.locator("#quickvint-signin-btn").waitFor({ state: "hidden", timeout: 30000 });
  return page;
}

async function prepareTwoItemBatch(page) {
  await page.locator("#quickvint-phone-btn").click();
  await page.locator(".quickvint-upload-choice-multiple").click();
  const modal = page.locator("#quickvint-batch-modal");
  await modal.locator(".batch-computer-files-input").setInputFiles([imageOne, imageTwo]);
  await modal.locator(".batch-title").filter({ hasText: "Organize items" }).waitFor({ timeout: 60000 });
  for (let index = 0; index < 2; index += 1) {
    await modal.locator(".batch-photo-wrap:not([hidden]) .batch-photo").first().click();
    await modal.locator(".batch-mark-group").click();
    await page.waitForTimeout(220);
  }
  await modal.locator(".batch-start").waitFor({ state: "visible", timeout: 30000 });
  if (await modal.locator(".batch-start").isDisabled()) {
    throw new Error("Real batch start button remained disabled.");
  }
  return modal;
}

async function collectReadyWorkPages(sourcePage, expected) {
  await sourcePage.locator("#quickvint-batch-modal .batch-status").filter({
    hasText: `${expected} listings ready`,
  }).waitFor({ timeout: 240000 });
  const workPages = context.pages().filter((page) =>
    page !== sourcePage && new URL(page.url()).origin === origin && new URL(page.url()).pathname === "/items/new"
  );
  if (workPages.length < expected) {
    throw new Error(`Expected ${expected} real Vinted work tabs, found ${workPages.length}.`);
  }
  const results = [];
  for (const page of workPages.slice(-expected)) {
    await page.locator('input[data-testid="title--input"]').waitFor({ timeout: 30000 });
    results.push(await page.evaluate(() => ({
      titleLength: document.querySelector('input[data-testid="title--input"]')?.value?.trim().length || 0,
      descriptionLength: document.querySelector('textarea[data-testid="description--input"]')?.value?.trim().length || 0,
      uploadedPhotoCount: document.querySelectorAll(
        '[data-testid="media-upload-grid"] img, [data-testid="media-select-grid"] img',
      ).length,
      saveButtons: [...document.querySelectorAll("button")].filter((button) =>
        /save|publish|upload|plaatsen|opslaan/i.test(button.textContent || "")
      ).length,
    })));
  }
  if (results.some((item) => !item.titleLength || !item.descriptionLength || !item.uploadedPhotoCount)) {
    throw new Error(`A real work tab was incomplete: ${JSON.stringify(results)}`);
  }
  return results;
}

async function closeOtherVintedCreatePages(keep) {
  for (const page of context.pages()) {
    if (page === keep) continue;
    try {
      const url = new URL(page.url());
      if (url.origin === origin && url.pathname === "/items/new") await page.close();
    } catch {}
  }
}

try {
  if (!recoveryOnly) {
    const normalSource = await openRealCreatePage();
    const normalModal = await prepareTwoItemBatch(normalSource);
    await normalModal.locator(".batch-start").click();
    diagnostics.normal.workTabs = await collectReadyWorkPages(normalSource, 2);
    diagnostics.normal.readyText = await normalModal.locator(".batch-subtitle").innerText();
    diagnostics.normal.checkpointCleared = !(await (await getCurrentWorker()).evaluate(async () =>
      Boolean((await chrome.storage.local.get("quickvintBatchRecovery")).quickvintBatchRecovery)
    ));
    await closeOtherVintedCreatePages(normalSource);
    await normalSource.close();
  }

  const recoverySource = await openRealCreatePage();
  const recoveryModal = await prepareTwoItemBatch(recoverySource);
  await recoveryModal.locator(".batch-start").click();
  const checkpointStarted = Date.now();
  await (async () => {
    while (Date.now() - checkpointStarted < 180000) {
      const completed = await (await getCurrentWorker()).evaluate(async () =>
        Number((await chrome.storage.local.get("quickvintBatchRecovery")).quickvintBatchRecovery?.completedCount || 0)
      ).catch(() => 0);
      if (completed >= 1) return;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    throw new Error("The first real recovery-batch item did not checkpoint.");
  })();
  const reloadWorker = await getCurrentWorker();
  diagnostics.recovery.beforeReload = await reloadWorker.evaluate(async () => {
    const recovery = (await chrome.storage.local.get("quickvintBatchRecovery")).quickvintBatchRecovery;
    return recovery ? {
      batchId: recovery.batchId,
      completedCount: recovery.completedCount,
      total: recovery.groups?.length,
      status: recovery.status,
      sourceTabId: recovery.sourceTabId,
    } : null;
  });
  diagnostics.recovery.workerStoppedAt = new Date().toISOString();
  await stopExtensionWorker(recoverySource);
  const recoveryStart = Date.now();
  await recoverySource.reload({ waitUntil: "domcontentloaded", timeout: 60000 });
  await dismissDomainModal(recoverySource);
  const restartedWorker = await getCurrentWorker();
  diagnostics.recovery.afterReload = await restartedWorker.evaluate(async () => {
    const recovery = (await chrome.storage.local.get("quickvintBatchRecovery")).quickvintBatchRecovery;
    return recovery ? {
      batchId: recovery.batchId,
      completedCount: recovery.completedCount,
      total: recovery.groups?.length,
      status: recovery.status,
      sourceTabId: recovery.sourceTabId,
    } : null;
  });
  await recoverySource.locator("#quickvint-batch-modal .batch-title").filter({
    hasText: "Batch paused",
  }).waitFor({ timeout: 20000 }).catch(async (error) => {
    diagnostics.recovery.pageAfterReload = await recoverySource.evaluate(() => ({
      url: location.href,
      batchModal: Boolean(document.querySelector("#quickvint-batch-modal")),
      phoneButton: Boolean(document.querySelector("#quickvint-phone-btn")),
      signInVisible: Boolean(document.querySelector("#quickvint-signin-btn")?.offsetParent),
    }));
    throw error;
  });
  diagnostics.recovery.promptDelayMs = Date.now() - recoveryStart;
  diagnostics.recovery.pausedReadyText = await recoverySource
    .locator("#quickvint-batch-modal .batch-subtitle")
    .innerText();
  await recoverySource.getByRole("button", { name: /Resume \d+ remaining/ }).click();
  diagnostics.recovery.workTabs = await collectReadyWorkPages(recoverySource, 2);
  diagnostics.recovery.readyText = await recoverySource
    .locator("#quickvint-batch-modal .batch-subtitle")
    .innerText();

  diagnostics.finishedAt = new Date().toISOString();
  diagnostics.ok = true;
} catch (error) {
  diagnostics.finishedAt = new Date().toISOString();
  diagnostics.ok = false;
  diagnostics.error = error?.message || String(error);
  throw error;
} finally {
  writeFileSync(outputFile, JSON.stringify(diagnostics, null, 2));
  await context.close();
}
