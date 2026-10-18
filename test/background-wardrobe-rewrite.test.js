const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const test = require("node:test");
const vm = require("node:vm");

const sourceTab = { id: 7, url: "https://www.vinted.nl/member/9" };
const rewriteMessage = (items = [{ id: "42", editUrl: "https://www.vinted.nl/items/42/edit" }]) => ({
  type: "START_WARDROBE_REWRITE",
  items,
  applyMode: "review",
  titleLanguageCode: "en",
  descriptionLanguageCode: "nl",
});

async function flush() {
  for (let index = 0; index < 12; index += 1) {
    await new Promise((resolve) => setImmediate(resolve));
  }
}

async function runBackground(options = {}) {
  const createdTabs = [];
  const duplicatedTabs = [];
  const sentToWorkTab = [];
  const sourceProgress = [];
  const sentTabMessages = [];
  const updatedTabs = [];
  const removedTabs = [];
  const cleanupCalls = [];
  const storageData = options.storageData || {
    supabaseSession: {
      access_token: "access-token",
      refresh_token: "refresh-token",
      expires_at: 2000000000,
      user: { id: "user-1", email: "seller@example.com" },
    },
  };
  const tabs = new Map(options.missingSourceTab
    ? []
    : [[sourceTab.id, { ...sourceTab, status: "complete" }]]);
  const runResolvers = [];
  const batchReadyResolvers = [];
  const capacityResolvers = [];
  const pingCounts = new Map();
  const settleDelays = [];
  const tabUpdatedListeners = new Set();
  let recoveryWriteHeld = false;
  let releaseRecoveryWrite;
  const recoveryWriteMayFinish = new Promise(resolve => { releaseRecoveryWrite = resolve; });
  let listener;
  let channelFailed = false;
  let nextTabId = options.nextTabId || 100;

  const chrome = {
    runtime: {
      lastError: null,
      getManifest: () => ({ version: "1.0.0" }),
      setUninstallURL(_url, callback) { callback?.(); },
      onInstalled: { addListener() {} },
      onSuspend: { addListener() {} },
      onMessage: { addListener(value) { listener = value; } },
      onMessageExternal: { addListener() {} },
    },
    storage: {
      local: {
        async get(key) {
          if (typeof key === "string") return { [key]: structuredClone(storageData[key]) };
          if (Array.isArray(key)) return structuredClone(Object.fromEntries(key.map((item) => [item, storageData[item]])));
          return structuredClone(storageData);
        },
        async set(values) {
          if (options.failRecoveryReason && values.quickvintBatchRecovery?.reason === options.failRecoveryReason) {
            throw new Error('Controlled storage failure');
          }
          if (options.holdRecoveryReason && !recoveryWriteHeld && values.quickvintBatchRecovery?.reason === options.holdRecoveryReason) {
            recoveryWriteHeld = true;
            await recoveryWriteMayFinish;
          }
          Object.assign(storageData, structuredClone(values));
        },
        async remove(keys) {
          for (const key of Array.isArray(keys) ? keys : [keys]) delete storageData[key];
        },
      },
    },
    tabs: {
      create(details, callback) {
        createdTabs.push(details);
        const tab = { id: nextTabId++, ...details, status: "complete" };
        tabs.set(tab.id, tab);
        callback?.(tab);
      },
      duplicate(tabId, callback) {
        duplicatedTabs.push(tabId);
        const tab = { id: nextTabId++, status: "complete", url: tabs.get(tabId)?.url };
        if (options.completeDuplicateTabs) tabs.set(tab.id, tab);
        callback?.(tab);
      },
      update(tabId, details, callback) {
        updatedTabs.push({ tabId, details });
        const tab = tabs.get(tabId);
        if (tab) Object.assign(tab, details);
        callback?.(tab);
      },
      get(tabId, callback) {
        const tab = tabs.get(tabId);
        chrome.runtime.lastError = channelFailed && options.tabLookupError
          ? { message: options.tabLookupError }
          : !tab ? { message: `No tab with id: ${tabId}.` } : null;
        callback(tab);
        chrome.runtime.lastError = null;
      },
      remove(tabId, callback) { removedTabs.push(tabId); callback?.(); },
      onUpdated: {
        addListener(listener) { tabUpdatedListeners.add(listener); },
        removeListener(listener) { tabUpdatedListeners.delete(listener); },
      },
      sendMessage(tabId, message, callback) {
        sentTabMessages.push({ tabId, message });
        if (message.type === "BATCH_PING" && options.holdBatchReady) {
          batchReadyResolvers.push(() => callback?.({ ok: true }));
          return;
        }
        if (tabId === sourceTab.id && message.type === "WARDROBE_REWRITE_PROGRESS") {
          sourceProgress.push(message);
          return;
        }
        if (message.type === "WARDROBE_REWRITE_PING") {
          const count = pingCounts.get(tabId) || 0;
          pingCounts.set(tabId, count + 1);
          callback?.({ ok: count > 0 });
          return;
        }
        if (message.type === "RUN_WARDROBE_REWRITE_ITEM") {
          sentToWorkTab.push({ tabId, message });
          if (options.failChannelRun === sentToWorkTab.length) {
            channelFailed = true;
            if (options.workTabLifecycle === "closed") tabs.delete(tabId);
            if (options.workTabLifecycle === "document_changed") {
              for (const listener of tabUpdatedListeners) listener(tabId, { status: "loading" });
            }
            chrome.runtime.lastError = { message: "A listener indicated an asynchronous response by returning true, but the message channel closed before a response was received" };
            callback?.();
            chrome.runtime.lastError = null;
          } else if (options.failFirstRun && sentToWorkTab.length === 1) {
            callback?.({ ok: false, error: "generation failed" });
          } else if (options.holdRuns) {
            runResolvers.push(() => callback?.({ ok: true }));
          } else {
            callback?.({ ok: true });
          }
          return;
        }
        if (message.type === "RUN_BATCH_ITEM") {
          sentToWorkTab.push({ tabId, message });
          if (options.failBatchRun) {
            callback?.({ ok: false, error: "generation failed" });
            return;
          }
          if (options.holdBatchRuns) {
            runResolvers.push(result => callback?.(result || { ok: true }));
            return;
          }
        }
        if (message.type === "SHOW_BATCH_REVIEW_PROMPT") {
          sentToWorkTab.push({ tabId, message });
        }
        callback?.({ ok: true });
      },
      query(_query, callback) { callback([]); },
    },
    action: { openPopup: async () => {} },
  };

  const supabaseClient = {
    auth: {
      setSession: async () => ({ data: { session: storageData.supabaseSession }, error: null }),
      refreshSession: async () => ({ data: { session: storageData.supabaseSession }, error: null }),
      getUser: async () => ({ data: { user: storageData.supabaseSession.user }, error: null }),
      onAuthStateChange() {},
    },
    from() {
      return {
        select() { return this; },
        eq() { return this; },
        single: async () => ({ data: { email: "seller@example.com" }, error: null }),
      };
    },
  };
  const sandbox = {
    console,
    chrome,
    URL,
    URLSearchParams,
    Response,
    AbortController,
    crypto: { randomUUID: () => "cid-test" },
    fetch: async (url) => {
      if (String(url).includes("action=cleanup")) cleanupCalls.push(String(url));
      if (String(url).includes("/api/user/batch-capacity")) {
        const response = new Response(JSON.stringify({ allowed: true, available: options.available ?? 3 }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
        if (options.holdCapacity) {
          return new Promise((resolve) => capacityResolvers.push(() => resolve(response)));
        }
        return response;
      }
      if (String(url).includes("/api/phone-upload") && options.phoneFiles) {
        return new Response(JSON.stringify({
          complete: true,
          count: options.phoneFiles.length,
          expectedCount: options.phoneFiles.length,
          files: options.phoneFiles,
        }), { status: 200, headers: { "content-type": "application/json" } });
      }
      return new Response(JSON.stringify({}), { status: 200 });
    },
    setTimeout(callback, delay) {
      if (delay === 900) settleDelays.push(delay);
      if (delay < 1000) queueMicrotask(callback);
      return 1;
    },
    clearTimeout() {},
    importScripts() {
      sandbox.supabase = { createClient: () => supabaseClient };
      vm.runInContext(readFileSync("lib/auth-session-observer.js", "utf8"), sandbox);
    },
  };

  vm.createContext(sandbox);
  vm.runInContext(readFileSync("background.js", "utf8"), sandbox);
  await flush();

  return {
    createdTabs,
    duplicatedTabs,
    sentToWorkTab,
    sentTabMessages,
    updatedTabs,
    sourceProgress,
    storageData,
    removedTabs,
    cleanupCalls,
    settleDelays,
    get recoveryWriteHeld() { return recoveryWriteHeld; },
    releaseRecoveryWrite,
    resolveRun: result => runResolvers.shift()?.(result),
    closeTab: tabId => tabs.delete(tabId),
    addTab: tab => tabs.set(tab.id, { status: "complete", ...tab }),
    releaseBatchReady: () => batchReadyResolvers.splice(0).forEach(resolve => resolve()),
    releaseCapacity: () => capacityResolvers.splice(0).forEach((resolve) => resolve()),
    notifyProgress(job, payload) {
      sandbox.qaProgressJob = job;
      sandbox.qaProgressPayload = payload;
      return vm.runInContext("notifyBatchProgress(qaProgressJob, qaProgressPayload)", sandbox);
    },
    dispatchRuntimeMessage(message, sender = { tab: sourceTab }) {
      return new Promise((resolve) => listener(message, sender, resolve));
    },
    async sendRuntimeMessage(message, sender = { tab: sourceTab }) {
      const response = this.dispatchRuntimeMessage(message, sender);
      await flush();
      return response;
    },
  };
}

test("progress sender joins the current durable owner, batch, controller, item, attempt and Stop revision", async () => {
  const harness = await runBackground();
  const current = { ownerId: "user-1", batchId: "current", sourceTabId: sourceTab.id,
    currentItemIndex: 2, currentGenerationAttemptId: "attempt-current", status: "running", stopRevision: 1 };
  harness.storageData.quickvintBatchRecovery = structuredClone(current);
  for (const change of [{ ownerId: "other" }, { batchId: "old" }, { sourceTabId: 999 },
    { currentItemIndex: 1 }, { currentGenerationAttemptId: "attempt-old" }, { stopRevision: 0 }, { status: "paused" }, { discardRequested: true }]) {
    await harness.notifyProgress({ ...current, ...change }, { status: "waiting", current: 1, total: 2 });
  }
  assert.equal(harness.sentTabMessages.filter(row => row.message.type === "BATCH_PROGRESS").length, 0);
  await harness.notifyProgress(current, { status: "waiting", current: 1, total: 2 });
  const sent = harness.sentTabMessages.filter(row => row.message.type === "BATCH_PROGRESS");
  assert.equal(sent.length, 1);
  assert.equal(sent[0].message.batchId, "current");
  assert.equal(sent[0].message.itemIndex, 2);
  assert.equal(sent[0].message.generationAttemptId, "attempt-current");
});

test("completed heartbeat proof is scoped to its account, batch, source and expiry", async () => {
  const harness = await runBackground();
  const completion = { ownerId: "user-1", batchId: "completed", sourceTabId: sourceTab.id, status: "done" };
  const receipt = { ...completion, completion, expiresAt: Date.now() + 60_000 };
  harness.storageData.quickvintBatchReviews = { completed: receipt };
  const message = { type: "QUICKVINT_TAB_JOB_HEARTBEAT", kind: "batch", batchId: "completed" };
  assert.equal((await harness.sendRuntimeMessage(message)).completion.batchId, "completed");
  assert.equal((await harness.sendRuntimeMessage(message, { tab: { id: 999 } })).completion, undefined);
  assert.equal((await harness.sendRuntimeMessage({ ...message, batchId: "different" })).completion, undefined);
  receipt.ownerId = "other";
  assert.equal((await harness.sendRuntimeMessage(message)).completion, undefined);
  receipt.ownerId = "user-1";
  receipt.expiresAt = Date.now() - 1;
  assert.equal((await harness.sendRuntimeMessage(message)).completion, undefined);
});

test("concurrent duplicate completion messages clean up a recovered item only once", async () => {
  const harness = await runBackground({ storageData: {
    supabaseSession: { access_token: "local-token", user: { id: "owner" } },
    quickvintBatchRecovery: {
      version: 1, kind: "batch", batchId: "duplicate-completion", ownerId: "owner", sourceTabId: 7,
      sessionId: "local-session", groups: [[{ name: "photo.jpg" }]], completedCount: 0,
      currentItemIndex: 1, currentWorkTabId: 100, status: "running", expiresAt: Date.now() + 60000,
    },
  } });
  const message = { type: "MARK_BATCH_ITEM_COMPLETE", batchId: "duplicate-completion", itemIndex: 1 };
  const sender = { tab: { id: 100, url: "https://www.vinted.nl/items/new" } };
  const results = await Promise.all([harness.sendRuntimeMessage(message, sender), harness.sendRuntimeMessage(message, sender)]);
  assert.equal(results.every(result => result.ok), true);
  assert.equal(harness.storageData.quickvintBatchRecovery.completedCount, 1);
  assert.equal(harness.cleanupCalls.length, 1);
});

test("an in-flight waiting checkpoint cannot reactivate a batch after Stop", async () => {
  const harness = await runBackground({ holdRecoveryReason: 'network_wait', storageData: {
    supabaseSession: { access_token: 'local-token', user: { id: 'owner' } },
    quickvintBatchRecovery: { version: 1, kind: 'batch', batchId: 'stop-race', ownerId: 'owner', sourceTabId: 7,
      sessionId: 'local-session', groups: [[{ name: 'photo.jpg' }]], completedCount: 0, currentItemIndex: 1,
      currentWorkTabId: 100, currentGenerationAttemptId: 'attempt-one', status: 'running', expiresAt: Date.now() + 60000 },
  } });
  const waiting = harness.dispatchRuntimeMessage({ type: 'BATCH_ITEM_WAITING', batchId: 'stop-race', itemIndex: 1,
    generationAttemptId: 'attempt-one', reason: 'network_wait', message: 'Waiting for connection' }, { tab: { id: 100 } });
  await flush();
  assert.equal(harness.recoveryWriteHeld, true);
  const stopped = harness.dispatchRuntimeMessage({ type: 'STOP_BATCH_GENERATION', batchId: 'stop-race' });
  await flush();
  harness.releaseRecoveryWrite();
  await Promise.all([waiting, stopped]);
  assert.equal(harness.storageData.quickvintBatchRecovery.status, 'paused');
  assert.equal(harness.storageData.quickvintBatchRecovery.reason, 'user_stopped');
  assert.equal(harness.cleanupCalls.length, 0);
});

test("Stop still reaches the work tab and reports a failed checkpoint when storage rejects", async () => {
  const harness = await runBackground({ failRecoveryReason: 'user_stopped', storageData: {
    supabaseSession: { access_token: 'local-token', user: { id: 'owner' } },
    quickvintBatchRecovery: { version: 1, kind: 'batch', batchId: 'stop-storage', ownerId: 'owner', sourceTabId: 7,
      sessionId: 'local-session', groups: [[{ name: 'photo.jpg' }]], completedCount: 0, currentItemIndex: 1,
      currentWorkTabId: 100, status: 'running', expiresAt: Date.now() + 60000 },
  } });
  const response = await harness.sendRuntimeMessage({ type: 'STOP_BATCH_GENERATION', batchId: 'stop-storage' });
  assert.equal(response.ok, false);
  assert.match(response.error, /save.*stop/i);
  assert.equal(harness.sentTabMessages.some(({ tabId, message }) => tabId === 100 && message.type === 'STOP_BATCH_ITEM'), true);
  assert.equal(harness.cleanupCalls.length, 0);
  assert.equal(harness.storageData.quickvintBatchRecovery.groups[0].length, 1);
});

test("an unowned legacy recovery is neither disclosed nor adopted by the current account", async () => {
  const harness = await runBackground({ storageData: {
    supabaseSession: { access_token: 'local-token', user: { id: 'owner' } },
    quickvintBatchRecovery: { version: 1, kind: 'batch', batchId: 'legacy', sourceTabId: 7,
      sessionId: 'legacy-session', groups: [[{ name: 'photo.jpg' }]], completedCount: 0,
      currentItemIndex: 1, currentWorkTabId: 100, status: 'paused', expiresAt: Date.now() + 60000 },
  } });
  assert.equal((await harness.sendRuntimeMessage({ type: 'GET_BATCH_RECOVERY' })).recovery, null);
  assert.equal((await harness.sendRuntimeMessage({ type: 'RESUME_BATCH_GENERATION', batchId: 'legacy' })).ok, false);
  assert.equal((await harness.sendRuntimeMessage({ type: 'DISCARD_BATCH_RECOVERY', batchId: 'legacy' })).ok, false);
  assert.equal(harness.storageData.quickvintBatchRecovery.sessionId, 'legacy-session');
  assert.equal(harness.cleanupCalls.length, 0);
  assert.equal(harness.createdTabs.length, 0);
});

test("a completion checkpoint wakes a restarted worker and automatically continues only unfinished listings", async () => {
  const files = [1, 2].map((order) => ({
    name: `00000${order}-upload.jpg`,
    path: `batch-1/00000${order}-upload.jpg`,
    order: order - 1,
    url: `https://signed.test/${order}`,
  }));
  const firstWorker = await runBackground({
    holdBatchRuns: true,
    completeDuplicateTabs: true,
  });
  assert.deepEqual({ ...await firstWorker.sendRuntimeMessage({ type: "GET_RUNTIME_INFO" }) }, {
    ok: true,
    batchDiagnosticsVersion: 2,
  });
  const started = await firstWorker.sendRuntimeMessage({
    type: "START_BATCH_GENERATION",
    sessionId: "batch-1",
    inputSource: "phone",
    groups: [[files[0]], [files[1]]],
  });

  assert.equal(started.ok, true);
  assert.equal(firstWorker.storageData.quickvintBatchRecovery.completedCount, 0);
  const batchId = firstWorker.storageData.quickvintBatchRecovery.batchId;
  assert.equal(started.batchId, batchId);
  assert.equal(started.inputSource, "phone");

  const restartedWorker = await runBackground({
    holdBatchRuns: true,
    completeDuplicateTabs: true,
    storageData: firstWorker.storageData,
    phoneFiles: files,
  });
  const marked = await restartedWorker.sendRuntimeMessage({
    type: "MARK_BATCH_ITEM_COMPLETE",
    batchId,
    itemIndex: 1,
  }, { tab: { id: 100, url: sourceTab.url } });
  assert.equal(marked.ok, true);

  const heartbeat = await restartedWorker.sendRuntimeMessage({
    type: "QUICKVINT_TAB_JOB_HEARTBEAT",
    kind: "batch",
  });
  assert.equal(heartbeat.active, true);
  assert.equal(restartedWorker.storageData.quickvintBatchRecovery.completedCount, 1);
  await flush();
  assert.equal(restartedWorker.sentToWorkTab.length, 1);
  assert.equal(restartedWorker.sentToWorkTab[0].message.itemIndex, 2);
  assert.equal(restartedWorker.sentToWorkTab[0].message.files[0].url, "https://signed.test/2");
  restartedWorker.resolveRun();
  await flush();
  assert.equal(
    restartedWorker.sentToWorkTab.some(({ message }) => message.type === "SHOW_BATCH_REVIEW_PROMPT"),
    false,
  );
});

test("a saved batch recreates its missing controller only from its own work tab", async () => {
  const recovery = {
    version: 1,
    kind: "batch",
    batchId: "batch-recreate",
    ownerId: "user-1",
    sourceTabId: 7,
    sessionId: "session-recreate",
    inputSource: "computer",
    groups: [[{ name: "photo.jpg", path: "photo.jpg", url: "https://signed.test/photo" }]],
    completedCount: 0,
    currentItemIndex: 1,
    currentWorkTabId: 100,
    lastCompletedWorkTabId: null,
    status: "paused",
    reason: "service_worker_restarted",
    hadIssues: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    expiresAt: Date.now() + 60000,
  };
  const harness = await runBackground({
    missingSourceTab: true,
    nextTabId: 200,
    storageData: { quickvintBatchRecovery: recovery, supabaseSession: { access_token: "local-token", user: { id: "user-1" } } },
  });
  const response = await harness.sendRuntimeMessage({
    type: "FOCUS_BATCH_RECOVERY",
  }, { tab: { id: 100, url: "https://www.vinted.nl/items/new" } });

  assert.deepEqual({ ...response }, { ok: true, sourceTabId: 200, recreated: true });
  assert.equal(harness.createdTabs.at(-1).url, "https://www.vinted.nl/items/new");
  assert.equal(harness.createdTabs.at(-1).active, true);
  assert.equal(harness.storageData.quickvintBatchRecovery.sourceTabId, 200);
  assert.equal(
    harness.sentTabMessages.some(({ tabId, message }) =>
      tabId === 200 && message.type === "SHOW_BATCH_RECOVERY"),
    true,
  );
});

test("only a clean batch sends the final review prompt", async () => {
  const clean = await runBackground({ completeDuplicateTabs: true });
  assert.equal((await clean.sendRuntimeMessage({
    type: "START_BATCH_GENERATION",
    sessionId: "batch-clean",
    groups: [["photo"]],
  })).ok, true);
  for (let attempt = 0; attempt < 10 && !clean.sentToWorkTab.some(
    ({ message }) => message.type === "SHOW_BATCH_REVIEW_PROMPT",
  ); attempt += 1) {
    await flush();
  }
  assert.equal(
    clean.sentToWorkTab.some(({ message }) => message.type === "SHOW_BATCH_REVIEW_PROMPT"),
    true,
  );

  const failed = await runBackground({ completeDuplicateTabs: true, failBatchRun: true });
  assert.equal((await failed.sendRuntimeMessage({
    type: "START_BATCH_GENERATION",
    sessionId: "batch-failed",
    groups: [["photo"]],
  })).ok, true);
  await flush();
  assert.equal(failed.storageData.quickvintBatchRecovery.hadIssues, true);
  assert.equal(failed.storageData.quickvintBatchRecovery.currentWorkTabId, 100);
  assert.equal(
    failed.sentTabMessages.some(({ tabId, message }) =>
      tabId === 100 && message.type === "SHOW_BATCH_RECOVERY_NUDGE"),
    true,
  );
  assert.equal(
    failed.sentToWorkTab.some(({ message }) => message.type === "SHOW_BATCH_REVIEW_PROMPT"),
    false,
  );
});

test("wardrobe rewrite validates its request and opens an active edit tab", async () => {
  const harness = await runBackground({ holdRuns: true });
  const response = await harness.sendRuntimeMessage({
    ...rewriteMessage(),
    descriptionFooterIncluded: false,
  });

  assert.equal(response.ok, true);
  assert.deepEqual(harness.createdTabs.map(({ url, active }) => ({ url, active })), [
    { url: "https://www.vinted.nl/items/42/edit", active: true },
  ]);
  assert.equal(harness.duplicatedTabs.length, 0);
  assert.equal(harness.sentToWorkTab.some(({ message }) => message.type === "RUN_BATCH_ITEM"), false);
  assert.equal(harness.sentToWorkTab[0].message.descriptionFooterIncluded, false);

  for (const message of [
    rewriteMessage([]),
    rewriteMessage([{ id: "42", editUrl: "https://www.vinted.nl/items/42/edit" }, { id: "42", editUrl: "https://www.vinted.nl/items/42/edit" }]),
    rewriteMessage([{ id: "nope", editUrl: "https://www.vinted.nl/items/nope/edit" }]),
    rewriteMessage([{ id: "42", editUrl: "https://www.vinted.be/items/42/edit" }]),
    rewriteMessage([{ id: "42", editUrl: "https://www.vinted.nl/items/42" }]),
    { ...rewriteMessage(), applyMode: "publish" },
    { ...rewriteMessage(), titleLanguageCode: "xx" },
    { ...rewriteMessage(), descriptionFooterIncluded: "false" },
  ]) {
    const invalid = await (await runBackground()).sendRuntimeMessage(message);
    assert.equal(invalid.ok, false);
  }
  const overCapacity = await (await runBackground({ available: 1 })).sendRuntimeMessage(
    rewriteMessage([
      { id: "42", editUrl: "https://www.vinted.nl/items/42/edit" },
      { id: "43", editUrl: "https://www.vinted.nl/items/43/edit" },
    ]),
  );
  assert.equal(overCapacity.ok, false);
});

test("batch and wardrobe starts share one lock without mixing their messages", async () => {
  const rewriteHarness = await runBackground({ holdRuns: true });
  assert.equal((await rewriteHarness.sendRuntimeMessage(rewriteMessage())).ok, true);
  const blockedBatch = await rewriteHarness.sendRuntimeMessage({
    type: "START_BATCH_GENERATION",
    sessionId: "batch-1",
    groups: [["photo"]],
  });
  assert.equal(blockedBatch.ok, false);
  assert.equal(rewriteHarness.duplicatedTabs.length, 0);
  assert.equal(rewriteHarness.sourceProgress.every((message) => message.type === "WARDROBE_REWRITE_PROGRESS"), true);

  const batchHarness = await runBackground({ holdBatchRuns: true });
  assert.equal((await batchHarness.sendRuntimeMessage({
    type: "START_BATCH_GENERATION",
    sessionId: "batch-1",
    groups: [["photo"]],
  })).ok, true);
  const blockedRewrite = await batchHarness.sendRuntimeMessage(rewriteMessage());
  assert.equal(blockedRewrite.ok, false);
  assert.equal(batchHarness.createdTabs.length, 1);
  assert.equal(batchHarness.createdTabs[0].active, false);
  assert.equal(batchHarness.sourceProgress.length, 0);
});

test("tab job heartbeat validates the source tab and isolates the active job kind", async () => {
  const wardrobe = await runBackground({ holdRuns: true });
  assert.equal((await wardrobe.sendRuntimeMessage(rewriteMessage())).ok, true);
  assert.deepEqual({ ...await wardrobe.sendRuntimeMessage({
    type: "QUICKVINT_TAB_JOB_HEARTBEAT",
    kind: "wardrobe-rewrite",
  }) }, { ok: true, active: true });
  assert.deepEqual({ ...await wardrobe.sendRuntimeMessage({
    type: "QUICKVINT_TAB_JOB_HEARTBEAT",
    kind: "batch",
  }) }, { ok: true, active: false });
  assert.deepEqual({ ...await wardrobe.sendRuntimeMessage({
    type: "QUICKVINT_TAB_JOB_HEARTBEAT",
    kind: "wardrobe-rewrite",
  }, { tab: { id: 8, url: sourceTab.url } }) }, { ok: true, active: false });
  assert.equal((await wardrobe.sendRuntimeMessage({
    type: "QUICKVINT_TAB_JOB_HEARTBEAT",
    kind: "other",
  })).ok, false);

  const batch = await runBackground({ holdBatchRuns: true });
  assert.equal((await batch.sendRuntimeMessage({
    type: "START_BATCH_GENERATION",
    sessionId: "batch-1",
    groups: [["photo"]],
  })).ok, true);
  assert.deepEqual({ ...await batch.sendRuntimeMessage({
    type: "QUICKVINT_TAB_JOB_HEARTBEAT",
    kind: "batch",
  }) }, { ok: true, active: true });
});

test("concurrent batch and wardrobe starts recheck the lock after capacity", async () => {
  const harness = await runBackground({ holdCapacity: true, holdRuns: true, holdBatchRuns: true });
  const batchStart = harness.dispatchRuntimeMessage({
    type: "START_BATCH_GENERATION",
    sessionId: "batch-1",
    groups: [["photo"]],
  });
  const wardrobeStart = harness.dispatchRuntimeMessage(rewriteMessage());
  await flush();

  assert.equal(harness.duplicatedTabs.length, 0);
  assert.equal(harness.createdTabs.length, 0);
  harness.releaseCapacity();
  const [batchResponse, wardrobeResponse] = await Promise.all([batchStart, wardrobeStart]);
  await flush();

  // Whichever asynchronous account/capacity check finishes first may win.
  // Exactly one runner owns the lock while its work is genuinely in flight.
  assert.notEqual(batchResponse.ok, wardrobeResponse.ok);
  assert.equal(harness.duplicatedTabs.length, 0);
  assert.equal(harness.createdTabs.length, 1);
  assert.equal(harness.createdTabs[0].active, wardrobeResponse.ok);
  assert.equal(harness.sentToWorkTab.some(({ message }) => message.type === (batchResponse.ok ? "RUN_WARDROBE_REWRITE_ITEM" : "RUN_BATCH_ITEM")), false);
});

test("Stop while a new listing tab is becoming ready prevents dispatching generation", async () => {
  const harness = await runBackground({ holdBatchReady: true, holdBatchRuns: true });
  assert.equal((await harness.sendRuntimeMessage({ type: "START_BATCH_GENERATION", sessionId: "batch-1", groups: [["photo"]] })).ok, true);
  const saved = harness.storageData.quickvintBatchRecovery;
  assert.equal((await harness.sendRuntimeMessage({ type: "STOP_BATCH_GENERATION", batchId: saved.batchId })).ok, true);
  harness.releaseBatchReady();
  await flush();
  assert.equal(harness.sentToWorkTab.some(({ message }) => message.type === "RUN_BATCH_ITEM"), false);
  assert.equal(harness.storageData.quickvintBatchRecovery.status, "paused");
  assert.equal(harness.storageData.quickvintBatchRecovery.reason, "user_stopped");
  assert.equal(harness.cleanupCalls.length, 0);
});

test("a late closed-tab failure cannot reject or overwrite a restored controller", async () => {
  const harness = await runBackground({ holdBatchRuns: true });
  await harness.sendRuntimeMessage({ type: "START_BATCH_GENERATION", sessionId: "batch-1", groups: [["photo"]] });
  const old = structuredClone(harness.storageData.quickvintBatchRecovery);
  harness.closeTab(old.sourceTabId);
  harness.closeTab(old.currentWorkTabId);
  const fresh = { id: 8, url: "https://www.vinted.nl/items/new" };
  harness.addTab(fresh);
  const result = await harness.sendRuntimeMessage({ type: "GET_BATCH_RECOVERY" }, { tab: fresh });
  assert.equal(result.recovery.batchId, old.batchId);
  harness.resolveRun({ ok: false, error: "The old listing tab closed." });
  await flush();
  assert.equal(harness.storageData.quickvintBatchRecovery.sourceTabId, fresh.id);
  assert.equal(harness.storageData.quickvintBatchRecovery.status, "paused");
  assert.equal(harness.storageData.quickvintBatchRecovery.reason, "tabs_closed");
  assert.equal(harness.cleanupCalls.length, 0);
});

test("an authorized late Stop preserves the new controller and current recovery fields", async () => {
  const harness = await runBackground({ holdBatchRuns: true, holdRecoveryReason: "tabs_closed" });
  await harness.sendRuntimeMessage({ type: "START_BATCH_GENERATION", sessionId: "batch-1", groups: [["photo"]] });
  const old = structuredClone(harness.storageData.quickvintBatchRecovery);
  harness.closeTab(old.sourceTabId);
  harness.closeTab(old.currentWorkTabId);
  const fresh = { id: 8, url: "https://www.vinted.nl/items/new" };
  harness.addTab(fresh);
  const restore = harness.dispatchRuntimeMessage({ type: "GET_BATCH_RECOVERY" }, { tab: fresh });
  await flush();
  assert.equal(harness.recoveryWriteHeld, true);
  const stop = harness.dispatchRuntimeMessage({ type: "STOP_BATCH_GENERATION", batchId: old.batchId });
  await flush();
  harness.releaseRecoveryWrite();
  assert.equal((await restore).recovery.batchId, old.batchId);
  assert.equal((await stop).ok, true);
  await flush();
  assert.equal(harness.storageData.quickvintBatchRecovery.sourceTabId, fresh.id);
  assert.equal(harness.storageData.quickvintBatchRecovery.reason, "user_stopped");
  assert.equal(harness.storageData.quickvintBatchReviews[old.batchId].sourceTabId, fresh.id);
  assert.equal(harness.cleanupCalls.length, 0);
});

test("persisted running batch reserves ownership against wardrobe after worker restart", async () => {
  const recovery = {
    version: 1, kind: "batch", batchId: "saved-running", ownerId: "user-1", sourceTabId: 7,
    sessionId: "session-1", groups: [[{ name: "photo.jpg" }]], completedCount: 0,
    currentItemIndex: 1, currentWorkTabId: null, currentGenerationAttemptId: "attempt-1",
    status: "running", expiresAt: Date.now() + 60000,
  };
  const harness = await runBackground({ holdBatchRuns: true, storageData: {
    supabaseSession: { access_token: "local-token", user: { id: "user-1" } },
    quickvintBatchRecovery: recovery,
  } });
  const rewrite = await harness.sendRuntimeMessage(rewriteMessage(), { tab: { id: 8, url: sourceTab.url } });
  assert.equal(rewrite.ok, false);
  const heartbeat = await harness.sendRuntimeMessage({ type: "QUICKVINT_TAB_JOB_HEARTBEAT", kind: "batch" });
  assert.equal(heartbeat.active, true);
  assert.equal(harness.sentToWorkTab.some(({ message }) => message.type === "RUN_WARDROBE_REWRITE_ITEM"), false);
  assert.equal(harness.sentToWorkTab.filter(({ message }) => message.type === "RUN_BATCH_ITEM").length, 1);
});

test("concurrent Resume and wardrobe admission select one owner after their asynchronous checks", async () => {
  const photo = { name: "photo.jpg", url: "https://storage.example/photo.jpg" };
  const harness = await runBackground({ holdBatchRuns: true, holdRuns: true, phoneFiles: [photo], storageData: {
    supabaseSession: { access_token: "local-token", user: { id: "user-1" } },
    quickvintBatchRecovery: {
      version: 1, kind: "batch", batchId: "saved-paused", ownerId: "user-1", sourceTabId: 7,
      sessionId: "session-1", groups: [[photo]], completedCount: 0, currentItemIndex: 1,
      status: "paused", expiresAt: Date.now() + 60000,
    },
  } });
  const [resume, rewrite] = await Promise.all([
    harness.dispatchRuntimeMessage({ type: "RESUME_BATCH_GENERATION", batchId: "saved-paused" }),
    harness.dispatchRuntimeMessage(rewriteMessage(), { tab: { id: 8, url: sourceTab.url } }),
  ]);
  await flush();
  assert.notEqual(resume.ok, rewrite.ok);
  assert.equal(harness.createdTabs.length, 1);
  assert.equal(harness.sentToWorkTab.filter(({ message }) => message.type.startsWith("RUN_")).length, 1);
  assert.equal(harness.storageData.quickvintBatchRecovery.status, resume.ok ? "running" : "paused");
});

test("wardrobe rewrite waits for each edit tab and reports sequential progress", async () => {
  const harness = await runBackground({ holdRuns: true });
  const response = await harness.sendRuntimeMessage(rewriteMessage([
    { id: "42", editUrl: "https://www.vinted.nl/items/42/edit" },
    { id: "43", editUrl: "https://www.vinted.nl/items/43/edit" },
  ]));
  assert.equal(response.ok, true);
  assert.equal(harness.createdTabs.length, 1);
  assert.equal(harness.sentToWorkTab.length, 1);

  harness.resolveRun();
  await flush();
  assert.equal(harness.createdTabs.length, 2);
  assert.deepEqual(harness.settleDelays, [900]);
  assert.equal(harness.sentToWorkTab.length, 2);
  harness.resolveRun();
  await flush();

  assert.deepEqual(harness.sourceProgress.map((message) => message.status), [
    "queued", "opening_tab", "tab_ready", "generating", "item_done",
    "opening_tab", "tab_ready", "generating", "item_done", "done",
  ]);
});

for (const [lifecycle, reason] of [
  ["closed", "work_tab_closed"],
  ["document_changed", "work_tab_loading"],
  ["unknown", "message_channel_closed"],
]) {
  test(`wardrobe channel failure records ${lifecycle} and preserves confirmed progress without replay`, async () => {
    const harness = await runBackground({ available: 9, failChannelRun: 3, workTabLifecycle: lifecycle });
    const items = ["42", "43", "44", "45"].map(id => ({ id, editUrl: `https://www.vinted.nl/items/${id}/edit` }));
    assert.equal((await harness.sendRuntimeMessage(rewriteMessage(items))).ok, true);
    await flush();
    const failure = harness.sourceProgress.at(-1);
    assert.equal(failure.status, "failed");
    assert.equal(failure.reason, reason);
    assert.equal(failure.errorCode, "WARDROBE_MESSAGE_CHANNEL_CLOSED");
    assert.equal(failure.completedCount, 2);
    assert.equal(failure.itemIndex, 3);
    assert.equal(harness.sentToWorkTab.length, 3);
    assert.equal(harness.createdTabs.length, 3);
  });
}

test("a failed tab lookup does not claim that the wardrobe tab closed", async () => {
  const harness = await runBackground({ failChannelRun: 1, tabLookupError: "Temporary tab lookup failure" });
  assert.equal((await harness.sendRuntimeMessage(rewriteMessage())).ok, true);
  await flush();
  assert.equal(harness.sourceProgress.at(-1).reason, "message_channel_closed");
});

test("wardrobe rewrite stops after the first failed item and leaves its tab open", async () => {
  const harness = await runBackground({ failFirstRun: true });
  const response = await harness.sendRuntimeMessage(rewriteMessage([
    { id: "42", editUrl: "https://www.vinted.nl/items/42/edit" },
    { id: "43", editUrl: "https://www.vinted.nl/items/43/edit" },
  ]));
  assert.equal(response.ok, true);
  await flush();

  assert.equal(harness.createdTabs.length, 1);
  assert.deepEqual(harness.settleDelays, []);
  assert.equal(harness.sourceProgress.at(-1).status, "failed");
  assert.deepEqual(harness.removedTabs, []);
});
