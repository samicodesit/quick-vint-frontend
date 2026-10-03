(function (root) {
  "use strict";
  const KEY = "autolisterTelemetryV2";
  const ALARM = "autolister-telemetry-retry";
  let mutation = Promise.resolve();
  const storage = { transact(fn) {
    const operation = mutation.then(async () => {
      const data = await chrome.storage.local.get(KEY);
      const state = data[KEY] || { events: [], dropped: 0 };
      const result = fn(state);
      await chrome.storage.local.set({ [KEY]: state });
      return result;
    });
    mutation = operation.catch(() => {});
    return operation;
  } };
  const identity = async () => {
    const { supabaseSession } = await chrome.storage.local.get("supabaseSession");
    return { id: supabaseSession?.user?.id, token: supabaseSession?.access_token };
  };
  const queue = root.AutoListerTelemetryCore.createQueue({ storage, identity,
    send: async (body, token) => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      try {
        const response = await fetch(root.getTelemetryEndpoint?.() || "https://autolister.app/api/events/track", { method: "POST", signal: controller.signal,
          headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) });
        const payload = [200, 503].includes(response.status) ? await response.json() : {};
        return { status: response.status, headers: response.headers, json: async () => payload };
      } finally { clearTimeout(timeout); }
    },
  });
  let timer;
  async function accept(event, accountId, critical, immediate) {
    // Only this worker creates shared metadata and owns queue mutations.
    const current = await identity();
    if (accountId && accountId !== current.id) return { queued: false, reason: "identity_changed" };
    event.context = { ...event.context, analyticsClientId: await root.getAnalyticsClientId() };
    const queued = await queue.enqueue(event, accountId, critical);
    if (!queued.queued) return queued;
    if (critical || immediate) {
      const result = await queue.flush();
      return { ...queued, accepted: result.acknowledgedIds?.includes(event.id) || false, report: result.reports?.[event.id] };
    }
    if (!timer) timer = setTimeout(() => { timer = null; void queue.flush(); }, 1200);
    return queued;
  }
  chrome.runtime.onMessage.addListener((message, sender, reply) => {
    if (sender.id !== chrome.runtime.id) return;
    if (message?.type === "AUTOLISTER_TELEMETRY") {
      accept(message.event, message.accountId, message.critical, message.immediate).then(reply, () => reply({ queued: false }));
      return true;
    }
    if (message?.type === "AUTOLISTER_TELEMETRY_FLUSH") {
      queue.flush().then(reply, () => reply({ delivered: false }));
      return true;
    }
  });
  async function startup() {
    try {
      if (chrome.alarms?.get && chrome.alarms?.create && !(await chrome.alarms.get(ALARM))) await chrome.alarms.create(ALARM, { periodInMinutes: 1 });
    } catch { /* Orion and other partial MV3 implementations use activity flush. */ }
    void queue.flush();
  }
  chrome.alarms?.onAlarm?.addListener((alarm) => { if (alarm.name === ALARM) void queue.flush(); });
  chrome.runtime.onStartup?.addListener(startup);
  chrome.storage.onChanged?.addListener((changes, area) => { if (area === "local" && changes.supabaseSession) void queue.flush(); });
  root.addEventListener?.("online", () => { void queue.flush(); });
  root.AutoListerBackgroundTelemetry = { accept, flush: queue.flush };
  void startup();
})(globalThis);
