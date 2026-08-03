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
  const removedTabs = [];
  const storageData = {
    supabaseSession: {
      access_token: "access-token",
      refresh_token: "refresh-token",
      expires_at: 2000000000,
      user: { id: "user-1", email: "seller@example.com" },
    },
  };
  const tabs = new Map([[sourceTab.id, { ...sourceTab, status: "complete" }]]);
  const runResolvers = [];
  const capacityResolvers = [];
  const pingCounts = new Map();
  const settleDelays = [];
  let listener;
  let nextTabId = 100;

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
          if (typeof key === "string") return { [key]: storageData[key] };
          if (Array.isArray(key)) return Object.fromEntries(key.map((item) => [item, storageData[item]]));
          return { ...storageData };
        },
        async set(values) { Object.assign(storageData, values); },
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
        callback?.({ id: nextTabId++, status: "complete" });
      },
      update(_tabId, _details, callback) { callback?.(); },
      get(tabId, callback) { callback(tabs.get(tabId)); },
      remove(tabId, callback) { removedTabs.push(tabId); callback?.(); },
      onUpdated: { addListener() {}, removeListener() {} },
      sendMessage(tabId, message, callback) {
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
          if (options.failFirstRun && sentToWorkTab.length === 1) {
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
          if (options.holdBatchRuns) {
            runResolvers.push(() => callback?.({ ok: true }));
            return;
          }
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
    crypto: { randomUUID: () => "cid-test" },
    fetch: async (url) => {
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
      return new Response(JSON.stringify({}), { status: 200 });
    },
    setTimeout(callback, delay) {
      if (delay === 900) settleDelays.push(delay);
      if (delay < 1000) queueMicrotask(callback);
      return 1;
    },
    clearTimeout() {},
    importScripts() { sandbox.supabase = { createClient: () => supabaseClient }; },
  };

  vm.createContext(sandbox);
  vm.runInContext(readFileSync("background.js", "utf8"), sandbox);
  await flush();

  return {
    createdTabs,
    duplicatedTabs,
    sentToWorkTab,
    sourceProgress,
    removedTabs,
    settleDelays,
    resolveRun: () => runResolvers.shift()?.(),
    releaseCapacity: () => capacityResolvers.splice(0).forEach((resolve) => resolve()),
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

test("wardrobe rewrite validates its request and opens an active edit tab", async () => {
  const harness = await runBackground({ holdRuns: true });
  const response = await harness.sendRuntimeMessage(rewriteMessage());

  assert.equal(response.ok, true);
  assert.deepEqual(harness.createdTabs.map(({ url, active }) => ({ url, active })), [
    { url: "https://www.vinted.nl/items/42/edit", active: true },
  ]);
  assert.equal(harness.duplicatedTabs.length, 0);
  assert.equal(harness.sentToWorkTab.some(({ message }) => message.type === "RUN_BATCH_ITEM"), false);

  for (const message of [
    rewriteMessage([]),
    rewriteMessage([{ id: "42", editUrl: "https://www.vinted.nl/items/42/edit" }, { id: "42", editUrl: "https://www.vinted.nl/items/42/edit" }]),
    rewriteMessage([{ id: "nope", editUrl: "https://www.vinted.nl/items/nope/edit" }]),
    rewriteMessage([{ id: "42", editUrl: "https://www.vinted.be/items/42/edit" }]),
    rewriteMessage([{ id: "42", editUrl: "https://www.vinted.nl/items/42" }]),
    { ...rewriteMessage(), applyMode: "publish" },
    { ...rewriteMessage(), titleLanguageCode: "xx" },
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

  const batchHarness = await runBackground({ holdRuns: true });
  assert.equal((await batchHarness.sendRuntimeMessage({
    type: "START_BATCH_GENERATION",
    sessionId: "batch-1",
    groups: [["photo"]],
  })).ok, true);
  const blockedRewrite = await batchHarness.sendRuntimeMessage(rewriteMessage());
  assert.equal(blockedRewrite.ok, false);
  assert.equal(batchHarness.createdTabs.length, 0);
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
  const harness = await runBackground({ holdCapacity: true });
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

  assert.equal(batchResponse.ok, true);
  assert.equal(wardrobeResponse.ok, false);
  assert.equal(harness.duplicatedTabs.length, 1);
  assert.equal(harness.createdTabs.length, 0);
  assert.equal(harness.sentToWorkTab.some(({ message }) => message.type === "RUN_WARDROBE_REWRITE_ITEM"), false);
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
