// Real Vinted batch recovery test. Never clicks Save or Publish.
import { writeFileSync, readFileSync, existsSync, unlinkSync } from "node:fs";
import { dirname, join } from "node:path";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)(process.env.AUTOLISTER_PLAYWRIGHT_MODULE || "@playwright/test");

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
const modelPhotosOnly = process.env.AUTOLISTER_REAL_MODEL_PHOTOS_ONLY === "1";
const origin = "https://www.vinted.nl";
const createUrl = `${origin}/items/new`;
// UI-only control of the dedicated login tabs. No cookies or sessions are copied.
async function serviceLoginUi(fallbackPage) {
  if (!modelPhotosOnly) return;
  const folder = dirname(outputFile);
  const commandFile = join(folder, 'live-login-command.json');
  let command;
  if (existsSync(commandFile)) {
    command = JSON.parse(readFileSync(commandFile, 'utf8'));
    unlinkSync(commandFile);
  }
  const pages = context.pages();
  const page = Number.isInteger(command?.page) ? pages[command.page] : fallbackPage;
  if (!page) return;
  if (command?.action === 'click') await page.locator(command.selector).click({timeout:10000});
  if (command?.action === 'fill') await page.locator(command.selector).fill(command.value,{timeout:10000});
  if (command?.action === 'front') await page.bringToFront();
  if (command?.action === 'press') await page.locator(command.selector).press(command.key);
  if (command?.action === 'viewport') await page.setViewportSize({width:command.width,height:command.height});
  if (command?.action === 'read') {
    writeFileSync(join(folder,'live-dom.json'),JSON.stringify(await page.locator(command.selector).evaluateAll(es=>es.map(e=>({html:e.outerHTML,rect:e.getBoundingClientRect().toJSON(),display:getComputedStyle(e).display}))),null,2));
  }
  if (command || !existsSync(join(folder,'live-login-state.json'))) {
    const state=[];
    for (const tab of context.pages()) {
      state.push({url:tab.url(),title:await tab.title(),ui:await tab.locator('body').innerText().catch(()=>''),controls:await tab.locator('button,input,a').evaluateAll(es=>es.map(e=>({tag:e.tagName,id:e.id,type:e.type,name:e.name,text:(e.textContent||'').trim().slice(0,120),placeholder:e.getAttribute('placeholder'),aria:e.getAttribute('aria-label')})))});
    }
    writeFileSync(join(folder,'live-login-state.json'),JSON.stringify(state,null,2));
    await page.screenshot({path:join(folder,'live-login.png'),fullPage:true});
  }
}

console.log('Launching the dedicated Chrome profile...');
const context = await chromium.launchPersistentContext(userDataDir, {
  executablePath: browserExecutable,
  headless: false,
  locale: "nl-NL",
  timezoneId: "Europe/Amsterdam",
  viewport: { width: 1440, height: 1000 },
  timeout: 60000,
  ignoreDefaultArgs: ['--disable-extensions'],
  args: [
    "--disable-blink-features=AutomationControlled",
    `--profile-directory=${profileDirectory}`,
    `--disable-extensions-except=${extensionPath}`,
    `--load-extension=${extensionPath}`,
  ],
});
console.log('Browser connected. Checking extension worker...');
if (modelPhotosOnly) {
  const landing = context.pages()[0] || await context.newPage();
  await landing.goto(createUrl, {waitUntil:'domcontentloaded',timeout:60000});
  await landing.bringToFront();
}

const diagnostics = {
  startedAt: new Date().toISOString(),
  mode: modelPhotosOnly ? 'model_photos' : 'batch_recovery',
  normal: {},
  recovery: {},
  saveOrPublishClicks: 0,
};

const loadedManifest=JSON.parse(readFileSync(join(extensionPath,'manifest.json'),'utf8'));
const expectedId=loadedManifest.key ? createHash('sha256').update(Buffer.from(loadedManifest.key,'base64')).digest('hex').slice(0,32).replace(/[0-9a-f]/g,c=>String.fromCharCode(97+parseInt(c,16))) : null;
let modelRuntimePage;
if(expectedId){
  const wake=await context.newPage();
  await wake.goto(`chrome-extension://${expectedId}/popup.html`);
  if(modelPhotosOnly)modelRuntimePage=wake;else await wake.close();
}
let worker =
  modelRuntimePage ||
  context.serviceWorkers().find(w=>!expectedId||new URL(w.url()).hostname===expectedId) ||
  (await context.waitForEvent("serviceworker", { predicate:w=>!expectedId||new URL(w.url()).hostname===expectedId, timeout:30000 }).catch(async error=>{
    if(!modelPhotosOnly)throw error;
    console.log('Extension startup is blocked. Keeping the Vinted window open for sign-in.');
    const inspect=await context.newPage();await inspect.goto('chrome://extensions');
    await serviceLoginUi(inspect);
    while(true){await serviceLoginUi(context.pages()[0]).catch(()=>{});const ready=context.serviceWorkers().find(w=>!expectedId||new URL(w.url()).hostname===expectedId);if(ready)return ready;await new Promise(r=>setTimeout(r,500));}
  }));

const extensionId = new URL(worker.url()).hostname;
console.log('Extension worker loaded. Checking runtime...');
const preflightPage = await context.newPage();
await preflightPage.goto(`chrome-extension://${extensionId}/popup.html`);
let runtimeInfo = await preflightPage.evaluate(() =>
  chrome.runtime.sendMessage({ type: "GET_RUNTIME_INFO" })
);
if (runtimeInfo?.batchDiagnosticsVersion !== 2) {
  const nextWorker = context.waitForEvent("serviceworker", { timeout: 30000 });
  await stopExtensionWorker(preflightPage);
  const nextRuntimeInfo = preflightPage.evaluate(() =>
    chrome.runtime.sendMessage({ type: "GET_RUNTIME_INFO" })
  );
  worker = await nextWorker;
  runtimeInfo = await nextRuntimeInfo;
}
await preflightPage.close();
if (runtimeInfo?.batchDiagnosticsVersion !== 2) {
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
console.log('Extension session present:', extensionSession.hasToken);
if (!extensionSession.hasToken) {
  const extensionId = await worker.evaluate(() => chrome.runtime.id);
  const signInPage = await context.newPage();
  await signInPage.goto(`chrome-extension://${extensionId}/popup.html`);
  console.log("ACTION REQUIRED: Sign into the AutoLister extension in this browser.");
  const deadline = Date.now() + (modelPhotosOnly ? 1800000 : 300000);
  while (!extensionSession.hasToken && Date.now() < deadline) {
    await serviceLoginUi(signInPage);
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
    await page.bringToFront();
    diagnostics.ok = false;
    diagnostics.blocker = { reason: 'vinted_auth_required', path: new URL(page.url()).pathname };
    writeFileSync(outputFile, JSON.stringify(diagnostics, null, 2));
    await page.screenshot({path:join(dirname(outputFile),'authentication-required.png'),fullPage:true});
    console.log("ACTION REQUIRED: Sign into Vinted in this browser, then open https://www.vinted.nl/items/new");
  }
  if (modelPhotosOnly) {
    const deadline=Date.now()+1800000;
    while(!await page.locator('input[data-testid="title--input"]').isVisible() && Date.now()<deadline){
      await serviceLoginUi(page);
      await page.waitForTimeout(300);
    }
  }
  await page.locator('input[data-testid="title--input"]').waitFor({ timeout: 300000 });
  await page.locator("#quickvint-phone-btn").waitFor({ timeout: 45000 });
  await page.locator("#quickvint-signin-btn").waitFor({ state: "hidden", timeout: 30000 });
  delete diagnostics.blocker;
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
  const start = modal.locator(".batch-start");
  await start.waitFor({ state: "visible", timeout: 30000 });
  const capacityDeadline = Date.now() + 30000;
  while (await start.isDisabled() && Date.now() < capacityDeadline) {
    await page.waitForTimeout(200);
  }
  if (await start.isDisabled()) {
    throw new Error(`Real batch start button remained disabled: ${(await modal.innerText()).replace(/\s+/g, " ").trim()}`);
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
  await closeOtherVintedCreatePages(null);
  if (modelPhotosOnly) {
    const { checkLiveModelPhotos } = await import('./live-model-photo-check.mjs');
    diagnostics.modelPhotos = await checkLiveModelPhotos({ context, openRealCreatePage, extensionId, outputFile });
  } else {
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
  const recoveryWorkPage = context.pages().filter((page) => {
    if (page === recoverySource) return false;
    try {
      const url = new URL(page.url());
      return url.origin === origin && url.pathname === "/items/new";
    } catch {
      return false;
    }
  }).at(-1);
  if (!recoveryWorkPage) throw new Error("The first recovery work tab was not found.");
  const reloadWorker = await getCurrentWorker();
  diagnostics.recovery.beforeReload = await reloadWorker.evaluate(async () => {
    const recovery = (await chrome.storage.local.get("quickvintBatchRecovery")).quickvintBatchRecovery;
    return recovery ? {
      batchId: recovery.batchId,
      completedCount: recovery.completedCount,
      total: recovery.groups?.length,
      status: recovery.status,
      sourceTabId: recovery.sourceTabId,
      currentWorkTabId: recovery.currentWorkTabId,
      lastCompletedWorkTabId: recovery.lastCompletedWorkTabId,
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
      currentWorkTabId: recovery.currentWorkTabId,
      lastCompletedWorkTabId: recovery.lastCompletedWorkTabId,
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
  const workPages = context.pages().filter((page) => page !== recoverySource && page.url().startsWith(origin));
  diagnostics.recovery.workPageUrls = workPages.map((page) => page.url());
  let nudgePage = null;
  for (const page of workPages) {
    if (await page.locator("#quickvint-batch-recovery-nudge").isVisible().catch(() => false)) {
      nudgePage = page;
      break;
    }
  }
  diagnostics.recovery.automaticNudge = Boolean(nudgePage);
  diagnostics.recovery.routing = await (await getCurrentWorker()).evaluate(async () => {
    const recovery = (await chrome.storage.local.get("quickvintBatchRecovery")).quickvintBatchRecovery;
    const tabs = await chrome.tabs.query({});
    const targetTab = tabs.find((tab) => tab.id === recovery?.lastCompletedWorkTabId) || null;
    return {
      recovery: recovery ? {
        status: recovery.status,
        sourceTabId: recovery.sourceTabId,
        currentWorkTabId: recovery.currentWorkTabId,
        lastCompletedWorkTabId: recovery.lastCompletedWorkTabId,
      } : null,
      targetTab: targetTab ? { id: targetTab.id, url: targetTab.url, status: targetTab.status } : null,
    };
  });
  if (!nudgePage) throw new Error("Recovery nudge did not reach any generated work tab.");
  await nudgePage.bringToFront();
  const recoveryNudge = nudgePage.locator("#quickvint-batch-recovery-nudge");
  await recoveryNudge.getByRole("button", { name: "Return to batch" }).click();
  await recoverySource.waitForFunction(() => document.hasFocus(), null, { timeout: 10000 });
  diagnostics.recovery.returnedToController = true;
  await recoverySource.getByRole("button", { name: /Resume \d+ remaining/ }).click();
  diagnostics.recovery.workTabs = await collectReadyWorkPages(recoverySource, 2);
  diagnostics.recovery.readyText = await recoverySource
    .locator("#quickvint-batch-modal .batch-subtitle")
    .innerText();

  }
  diagnostics.finishedAt = new Date().toISOString();
  diagnostics.ok = true;
} catch (error) {
  diagnostics.finishedAt = new Date().toISOString();
  diagnostics.ok = false;
  diagnostics.error = error?.message || String(error);
  throw error;
} finally {
  writeFileSync(outputFile, JSON.stringify(diagnostics, null, 2));
  if (modelPhotosOnly) {
    console.log('Photo check finished. Keeping the test window open for inspection.');
    while (context.pages().length) {
      const repeat=join(dirname(outputFile),'live-recheck.json');
      if(existsSync(repeat)){
        unlinkSync(repeat);
        try{
          const {checkLiveModelPhotos}=await import(`./live-model-photo-check.mjs?run=${Date.now()}`);
          diagnostics.modelPhotos=await checkLiveModelPhotos({context,openRealCreatePage,extensionId,outputFile});diagnostics.ok=true;delete diagnostics.error;
        }catch(error){diagnostics.ok=false;diagnostics.error=error.message;}
        writeFileSync(outputFile,JSON.stringify(diagnostics,null,2));
        console.log('Repeated photo check:',diagnostics.ok?'passed':diagnostics.error);
      }
      await serviceLoginUi(context.pages().find(p=>p.url().includes('/items/new')) || context.pages()[0]).catch(error=>console.log('Inspection:',error.message.split('\n')[0]));
      await new Promise(resolve=>setTimeout(resolve,500));
    }
  } else await context.close();
}
