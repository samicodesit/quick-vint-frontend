// --- IMPORTS & INITIALIZATION ---
importScripts("lib/supabase.js");

const ANALYTICS_CLIENT_ID_KEY = "analyticsClientId";
const ACCOUNT_EMAIL_STORAGE_KEY = "accountEmail";
const USER_USAGE_SNAPSHOT_STORAGE_KEY = "quickvintUserUsageSnapshot";
const BATCH_RECOVERY_STORAGE_KEY = "quickvintBatchRecovery";
const BATCH_RECOVERY_TTL_MS = 6 * 60 * 60 * 1000;

function createAnalyticsClientId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `cid_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

async function getAnalyticsClientId() {
  const data = await chrome.storage.local.get(ANALYTICS_CLIENT_ID_KEY);
  if (data[ANALYTICS_CLIENT_ID_KEY]) return data[ANALYTICS_CLIENT_ID_KEY];
  const analyticsClientId = createAnalyticsClientId();
  await chrome.storage.local.set({ [ANALYTICS_CLIENT_ID_KEY]: analyticsClientId });
  return analyticsClientId;
}

function normalizeEmail(email) {
  return typeof email === "string" && email.includes("@")
    ? email.trim().toLowerCase()
    : "";
}

async function setAutolisterUninstallUrl() {
  const extensionVersion = chrome.runtime.getManifest().version;
  const analyticsClientId = await getAnalyticsClientId();
  const session = await getStoredSession();
  const params = new URLSearchParams({
    version: extensionVersion,
    cid: analyticsClientId,
  });
  if (session?.user?.id) {
    params.set("uid", session.user.id);
  }
  const uninstallUrl = `https://autolister.app/uninstall?${params.toString()}`;

  chrome.runtime.setUninstallURL(uninstallUrl, () => {
    if (chrome.runtime.lastError) {
      console.warn(
        "Failed to set AutoLister uninstall URL:",
        chrome.runtime.lastError.message,
      );
    }
  });
}

// --- FIRST RUN: open welcome/onboarding page on install ---
chrome.runtime.onInstalled.addListener((details) => {
  setAutolisterUninstallUrl().catch(() => {});

  if (details.reason === "install") {
    chrome.tabs.create({ url: "https://autolister.app/welcome" });
  }
});

setAutolisterUninstallUrl().catch(() => {});

// --- CONSTANTS ---
const SUPABASE_URL = "https://jqloiovdwjaornnfvmyu.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpxbG9pb3Zkd2phb3JubmZ2bXl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgyMDgzMzIsImV4cCI6MjA2Mzc4NDMzMn0.iFtkUorY1UqK8zamnwgjB-yhsXe0bJAA8YFm22bzc3A";
const API_BASE = "https://autolister.app";
const TOKEN_REFRESH_MARGIN_MS = 5 * 60 * 1000; // 5 minutes
const MIN_REFRESH_DELAY_MS = 60 * 1000; // 1 minute
const FREE_LIFETIME_LIMIT = 5;
const CHECKOUT_TIERS = new Set(["starter", "pro", "business"]);
const CURRENT_TIER_LIMITS = {
  free: { daily: FREE_LIFETIME_LIMIT, monthly: FREE_LIFETIME_LIMIT },
  starter: { daily: 10, monthly: 75 },
  pro: { daily: 25, monthly: 250 },
  business: { daily: 60, monthly: 600 },
};
const LEGACY_TIER_LIMITS = {
  free: CURRENT_TIER_LIMITS.free,
  starter: { daily: 15, monthly: 300 },
  pro: { daily: 40, monthly: 800 },
  business: { daily: null, monthly: 1500 },
};
const BATCH_ITEM_REVIEW_SETTLE_MS = 900;
const SUPPORTED_LANGUAGE_CODES = new Set([
  "en", "fr", "cz", "da", "nl", "de", "el", "hr", "fi", "hu",
  "it", "lt", "pl", "pt", "ro", "es", "sk", "sv",
]);

// --- STATE ---
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
let tokenRefreshPromise = null;
let tokenRefreshTimeout = null;
let activeTabJob = null;

// --- SESSION & TOKEN MANAGEMENT ---

/**
 * Retrieves the Supabase session from local storage.
 * @returns {Promise<object|null>} The session object or null.
 */
async function getStoredSession() {
  const result = await chrome.storage.local.get(["supabaseSession"]);
  return result.supabaseSession || null;
}

/**
 * Stores the Supabase session in local storage and schedules the next token refresh.
 * @param {object|null} session - The Supabase session object.
 */
async function setStoredSession(session) {
  const values = { supabaseSession: session };
  const email = normalizeEmail(session?.user?.email);
  if (email) values[ACCOUNT_EMAIL_STORAGE_KEY] = email;
  await chrome.storage.local.set(values);
  if (session?.expires_at) {
    scheduleTokenRefresh(session);
  }
}

/**
 * Checks if a session token is within the refresh margin.
 * @param {object} session - The Supabase session object.
 * @returns {boolean} True if the token is near expiry.
 */
function isTokenNearExpiry(session) {
  if (!session?.expires_at) return false;
  const expiresAt = session.expires_at * 1000;
  const now = Date.now();
  return expiresAt <= now + TOKEN_REFRESH_MARGIN_MS;
}

/**
 * Schedules a token refresh before the current token expires.
 * @param {object} session - The Supabase session object.
 */
function scheduleTokenRefresh(session) {
  if (tokenRefreshTimeout) clearTimeout(tokenRefreshTimeout);
  if (!session?.expires_at) return;

  const expiresAt = session.expires_at * 1000;
  const now = Date.now();
  const refreshIn = expiresAt - now - TOKEN_REFRESH_MARGIN_MS;

  const timeout = Math.max(refreshIn, MIN_REFRESH_DELAY_MS);
  tokenRefreshTimeout = setTimeout(refreshTokenWithRetry, timeout);
}

/**
 * Refreshes the authentication token with exponential backoff retry logic.
 * @returns {Promise<object|null>} The new session object or null on failure.
 */
async function refreshTokenWithRetry(maxRetries = 3) {
  if (tokenRefreshPromise) return tokenRefreshPromise;
  tokenRefreshPromise = (async () => {
    try {
      const session = await getStoredSession();
      if (!session?.refresh_token) return null;

      await supabaseClient.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      });

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        const { data, error } = await supabaseClient.auth.refreshSession({
          refresh_token: session.refresh_token,
        });

        if (!error && data.session) {
          await setStoredSession(data.session);
          return data.session;
        }

        console.warn(`Token refresh attempt ${attempt} failed:`, error?.message);
        if (
          error?.message?.includes("Invalid Refresh Token") ||
          error?.message?.includes("refresh_token_not_found")
        ) {
          await handleSignOut({ clearAccountEmail: false });
          return null;
        }

        if (attempt < maxRetries) {
          await new Promise((res) => setTimeout(res, 1000 * 2 ** attempt));
        }
      }
      console.error("Token refresh failed after all retries.");
      return null;
    } catch (error) {
      console.error("Unexpected error during token refresh:", error);
      return null;
    }
  })();

  try {
    return await tokenRefreshPromise;
  } finally {
    tokenRefreshPromise = null;
  }
}

/**
 * Ensures the current session token is valid, refreshing it if necessary.
 * @returns {Promise<object|null>} A valid session object or null.
 */
async function ensureValidToken() {
  const session = await getStoredSession();
  if (!session) return null;

  if (isTokenNearExpiry(session)) {
    return (await refreshTokenWithRetry()) || (await getStoredSession());
  }
  return session;
}

/**
 * Creates a Supabase client instance with the user's access token.
 * @param {string} accessToken
 * @returns {object} A Supabase client instance.
 */
function createAuthenticatedClient(accessToken) {
  if (!accessToken) {
    throw new Error("Access token is required.");
  }
  return supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

function normalizeTier(tier) {
  const map = {
    unlimited_monthly: "starter",
    unlimited_annual: "starter",
    starter: "starter",
    pro: "pro",
    business: "business",
    free: "free",
  };

  return map[tier] || "free";
}

function getUsageLimits(profile) {
  const tier =
    profile?.subscription_status === "active"
      ? normalizeTier(profile?.subscription_tier)
      : "free";
  const source =
    tier !== "free" && profile?.is_legacy_plan
      ? LEGACY_TIER_LIMITS
      : CURRENT_TIER_LIMITS;

  const baseLimits = source[tier] || CURRENT_TIER_LIMITS.free;
  const hasActiveCustomLimits = Boolean(
    profile?.custom_limit_expires_at &&
      new Date(profile.custom_limit_expires_at) > new Date(),
  );
  const customDaily =
    hasActiveCustomLimits && Number(profile?.custom_daily_limit) > 0
      ? Number(profile.custom_daily_limit)
      : null;
  const customMonthly =
    hasActiveCustomLimits && Number(profile?.custom_monthly_limit) > 0
      ? Number(profile.custom_monthly_limit)
      : null;

  return {
    tier,
    isLegacy: tier !== "free" && Boolean(profile?.is_legacy_plan),
    isCustomPlan: tier !== "free" && hasActiveCustomLimits,
    limits: {
      ...baseLimits,
      ...(customDaily !== null ? { daily: customDaily } : {}),
      ...(customMonthly !== null ? { monthly: customMonthly } : {}),
    },
  };
}

// --- DATA FETCHING & STATE SYNCHRONIZATION ---

/**
 * Fetches the user's profile and stores it in chrome.storage.local.
 * This is the single source of truth for the user's profile data.
 */
async function updateAndStoreUserProfile() {
  const session = await ensureValidToken();
  if (!session?.access_token) return;

  try {
    const authClient = createAuthenticatedClient(session.access_token);
    const {
      data: { user },
      error: userError,
    } = await authClient.auth.getUser();
    if (userError || !user) throw userError || new Error("User not found.");

    const { data: profile, error: profileError } = await authClient
      .from("profiles")
      .select(
        "email, subscription_status, api_calls_this_month, subscription_tier, current_period_end, is_legacy_plan, free_lifetime_generations_used, pack_credits, custom_daily_limit, custom_monthly_limit, custom_limit_expires_at",
      )
      .eq("id", user.id)
      .single();

    if (profileError) throw profileError;

    const accountEmail = normalizeEmail(user.email) || normalizeEmail(profile?.email);
    await chrome.storage.local.set({
      userProfile: profile,
      ...(accountEmail ? { [ACCOUNT_EMAIL_STORAGE_KEY]: accountEmail } : {}),
    });
    await setAutolisterUninstallUrl();
  } catch (error) {
    console.error("Failed to update and store user profile:", error);
  }
}

/**
 * Fetches current usage, current limits, and available top-up credits.
 * @returns {Promise<object>}
 */
async function fetchUserUsageCount() {
  const session = await ensureValidToken();
  if (!session?.access_token) {
    return {
      daily: 0,
      monthly: 0,
      tier: "free",
      isLegacy: false,
      limits: CURRENT_TIER_LIMITS.free,
      freeLifetimeUsed: 0,
      freeLifetimeLimit: FREE_LIFETIME_LIMIT,
      packCredits: 0,
    };
  }

  try {
    const authClient = createAuthenticatedClient(session.access_token);
    const {
      data: { user },
      error: userError,
    } = await authClient.auth.getUser();
    if (userError || !user) throw userError || new Error("User not found.");

    const { data: profile, error: profileError } = await authClient
      .from("profiles")
      .select(
        "subscription_status, subscription_tier, api_calls_this_month, is_legacy_plan, free_lifetime_generations_used, pack_credits, custom_daily_limit, custom_monthly_limit, custom_limit_expires_at",
      )
      .eq("id", user.id)
      .single();
    if (profileError) throw profileError;

    const monthly =
      typeof profile?.api_calls_this_month === "number"
        ? profile.api_calls_this_month
        : 0;
    const entitlement = getUsageLimits(profile);
    const freeLifetimeUsed = Math.max(
      0,
      Number(profile?.free_lifetime_generations_used || 0),
    );
    const packCredits = Math.max(0, Number(profile?.pack_credits || 0));

    const { data: limit, error: limitError } = await authClient
      .from("rate_limits")
      .select("count")
      .eq("user_id", user.id)
      .eq("window_type", "day")
      .gte("expires_at", new Date().toISOString())
      .order("count", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (limitError) throw limitError;

    const usage = {
      daily: entitlement.tier === "free" ? null : limit?.count || 0,
      monthly: entitlement.tier === "free" ? null : monthly,
      tier: entitlement.tier,
      isLegacy: entitlement.isLegacy,
      isCustomPlan: entitlement.isCustomPlan,
      limits: entitlement.limits,
      freeLifetimeUsed,
      freeLifetimeLimit: FREE_LIFETIME_LIMIT,
      packCredits,
      fetchedAt: Date.now(),
    };
    await chrome.storage.local.set({ [USER_USAGE_SNAPSHOT_STORAGE_KEY]: usage });
    return usage;
  } catch (error) {
    console.error("Failed to fetch user day count:", error);
    return {
      daily: 0,
      monthly: 0,
      tier: "free",
      isLegacy: false,
      limits: CURRENT_TIER_LIMITS.free,
      freeLifetimeUsed: 0,
      freeLifetimeLimit: FREE_LIFETIME_LIMIT,
      packCredits: 0,
    };
  }
}

/**
 * Signs the user out and clears all local session data.
 * @returns {Promise<{ok: boolean, error?: string}>}
 */
async function handleSignOut({ clearAccountEmail = true } = {}) {
  if (tokenRefreshTimeout) clearTimeout(tokenRefreshTimeout);
  try {
    const { error } = await supabaseClient.auth.signOut();
    if (error) throw error;
    if (clearAccountEmail) {
      await chrome.storage.local.remove([ACCOUNT_EMAIL_STORAGE_KEY]);
    }
    return { ok: true };
  } catch (err) {
    return { error: err.message };
  }
}

async function getStoredCheckoutEmail(session) {
  const sessionEmail = normalizeEmail(session?.user?.email);
  if (sessionEmail) return sessionEmail;

  const stored = await chrome.storage.local.get([
    ACCOUNT_EMAIL_STORAGE_KEY,
    "userProfile",
  ]);
  return (
    normalizeEmail(stored[ACCOUNT_EMAIL_STORAGE_KEY]) ||
    normalizeEmail(stored.userProfile?.email)
  );
}

async function createCheckout(message = {}) {
  const session = await ensureValidToken();
  const email = await getStoredCheckoutEmail(session);
  if (!email) {
    return {
      ok: false,
      reason: "no_checkout_email",
      error: "Please sign in again before checkout.",
    };
  }

  const checkoutType = message.checkoutType;
  const isCreditPack = checkoutType === "credit_pack";
  if (!isCreditPack && checkoutType !== "subscription") {
    return { ok: false, error: "Unsupported checkout type." };
  }

  const tier = normalizeTier(message.tier);
  if (!isCreditPack && !CHECKOUT_TIERS.has(tier)) {
    return { ok: false, error: "Unsupported plan." };
  }

  const endpoint = isCreditPack
    ? `${API_BASE}/api/stripe/create-credit-checkout`
    : `${API_BASE}/api/stripe/create-checkout`;
  const body = {
    email,
    source: message.source || "extension_background",
  };
  if (!isCreditPack) {
    body.tier = tier;
  }

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok || !payload.url) {
      return {
        ok: false,
        status: response.status,
        error: payload.error || "Unable to open the payment page.",
      };
    }

    return { ok: true, url: payload.url };
  } catch (err) {
    console.error("[Background] Checkout exception:", err);
    return {
      ok: false,
      error: "Connection issue. Please try again.",
    };
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function duplicateTab(tabId) {
  return new Promise((resolve, reject) => {
    chrome.tabs.duplicate(tabId, (tab) => {
      const error = chrome.runtime.lastError;
      if (error || !tab?.id) {
        reject(new Error(error?.message || "Could not duplicate Vinted tab."));
        return;
      }
      chrome.tabs.update(tab.id, { active: false }, () => resolve(tab));
    });
  });
}

function createActiveTab(url) {
  return new Promise((resolve, reject) => {
    chrome.tabs.create({ url, active: true }, (tab) => {
      const error = chrome.runtime.lastError;
      if (error || !tab?.id) {
        reject(new Error(error?.message || "Could not open Vinted edit tab."));
        return;
      }
      resolve(tab);
    });
  });
}

function waitForTabComplete(tabId, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    let done = false;
    const timeout = setTimeout(() => {
      if (done) return;
      done = true;
      chrome.tabs.onUpdated.removeListener(onUpdated);
      reject(new Error("Duplicated Vinted tab did not finish loading in time."));
    }, timeoutMs);

    const finish = () => {
      if (done) return;
      done = true;
      clearTimeout(timeout);
      chrome.tabs.onUpdated.removeListener(onUpdated);
      resolve();
    };

    const onUpdated = (updatedTabId, changeInfo) => {
      if (updatedTabId === tabId && changeInfo.status === "complete") {
        finish();
      }
    };

    chrome.tabs.onUpdated.addListener(onUpdated);
    chrome.tabs.get(tabId, (tab) => {
      const error = chrome.runtime.lastError;
      if (error) {
        finish();
        return;
      }
      if (tab?.status === "complete") finish();
    });
  });
}

function sendTabMessage(tabId, message) {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, message, (response) => {
      const error = chrome.runtime.lastError;
      if (error) {
        reject(new Error(error.message));
        return;
      }
      resolve(response);
    });
  });
}

function getTabIfPresent(tabId) {
  return new Promise((resolve) => {
    if (!Number.isInteger(tabId)) return resolve(null);
    chrome.tabs.get(tabId, (tab) => {
      const error = chrome.runtime.lastError;
      resolve(error ? null : tab || null);
    });
  });
}

function activateTab(tabId) {
  return new Promise((resolve, reject) => {
    chrome.tabs.update(tabId, { active: true }, (tab) => {
      const error = chrome.runtime.lastError;
      if (error || !tab) reject(new Error(error?.message || "Could not open the batch tab."));
      else resolve(tab);
    });
  });
}

async function waitForBatchTabReady(tabId, timeoutMs = 30000) {
  const startedAt = Date.now();
  let lastError = null;

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await sendTabMessage(tabId, { type: "BATCH_PING" });
      if (response?.ok) return;
    } catch (err) {
      lastError = err;
    }

    await sleep(250);
  }

  throw new Error(
    lastError?.message || "Duplicated Vinted tab was not ready in time.",
  );
}

async function waitForWardrobeRewriteTabReady(tabId, itemId, timeoutMs = 30000) {
  const startedAt = Date.now();
  let lastError = null;

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await sendTabMessage(tabId, {
        type: "WARDROBE_REWRITE_PING",
        itemId,
      });
      if (response?.ok) return;
    } catch (err) {
      lastError = err;
    }

    await sleep(250);
  }

  throw new Error(lastError?.message || "Vinted edit tab was not ready in time.");
}

function notifyBatchProgress(job, payload) {
  if (!job?.sourceTabId) return;
  chrome.tabs.sendMessage(job.sourceTabId, {
    type: "BATCH_PROGRESS",
    batchId: job.batchId,
    inputSource: job.inputSource,
    reason: job.reason || null,
    createdAt: job.createdAt,
    ...payload,
  });
}

function getBatchWorkTabIds(job) {
  return [...new Set([job?.currentWorkTabId, job?.lastCompletedWorkTabId])]
    .filter((tabId) => Number.isInteger(tabId) && tabId !== job?.sourceTabId);
}

async function notifyBatchRecoveryNudge(job) {
  await Promise.allSettled(getBatchWorkTabIds(job).map((tabId) =>
    sendTabMessage(tabId, {
      type: "SHOW_BATCH_RECOVERY_NUDGE",
      batchId: job.batchId,
    }),
  ));
}

function notifyWardrobeRewriteProgress(job, payload) {
  if (!job?.sourceTabId) return;
  chrome.tabs.sendMessage(job.sourceTabId, {
    type: "WARDROBE_REWRITE_PROGRESS",
    ...payload,
  });
}

async function getStoredBatchRecovery() {
  const stored = (await chrome.storage.local.get(BATCH_RECOVERY_STORAGE_KEY))[
    BATCH_RECOVERY_STORAGE_KEY
  ];
  if (
    !stored ||
    stored.version !== 1 ||
    stored.kind !== "batch" ||
    !stored.batchId ||
    !Array.isArray(stored.groups)
  ) {
    return null;
  }
  if (Number(stored.expiresAt || 0) <= Date.now()) {
    await chrome.storage.local.remove(BATCH_RECOVERY_STORAGE_KEY);
    return null;
  }
  return stored;
}

async function persistBatchRecovery(job, updates = {}) {
  const stored = {
    version: 1,
    kind: "batch",
    batchId: job.batchId,
    sourceTabId: job.sourceTabId,
    sessionId: job.sessionId,
    inputSource: job.inputSource || "phone",
    groups: job.groups,
    completedCount: Math.max(0, Number(job.completedCount || 0)),
    currentItemIndex: Math.max(0, Number(job.currentItemIndex || 0)),
    currentWorkTabId: Number.isInteger(job.currentWorkTabId)
      ? job.currentWorkTabId
      : null,
    lastCompletedWorkTabId: Number.isInteger(job.lastCompletedWorkTabId)
      ? job.lastCompletedWorkTabId
      : null,
    status: job.status || "running",
    message: job.message || null,
    reason: job.reason || null,
    hadIssues: job.hadIssues === true,
    createdAt: Number(job.createdAt || Date.now()),
    updatedAt: Date.now(),
    expiresAt: Number(job.expiresAt || Date.now() + BATCH_RECOVERY_TTL_MS),
    ...updates,
  };
  Object.assign(job, stored);
  await chrome.storage.local.set({ [BATCH_RECOVERY_STORAGE_KEY]: stored });
  return stored;
}

function publicBatchRecovery(job) {
  return {
    batchId: job.batchId,
    sessionId: job.sessionId,
    inputSource: job.inputSource,
    groups: job.groups,
    completedCount: Math.max(0, Number(job.completedCount || 0)),
    total: job.groups.length,
    status: job.status,
    message: job.message || null,
    reason: job.reason || null,
    hadIssues: job.hadIssues === true,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    expiresAt: job.expiresAt,
  };
}

async function getTabJobHeartbeat(message, sender) {
  if (!["batch", "wardrobe-rewrite"].includes(message?.kind)) {
    return { ok: false, active: false, error: "Invalid tab job heartbeat." };
  }
  const sourceTabId = sender?.tab?.id;
  if (!Number.isInteger(sourceTabId) || sourceTabId <= 0) {
    return { ok: false, active: false, error: "Invalid tab job heartbeat." };
  }
  const active =
    activeTabJob?.kind === message.kind &&
    activeTabJob.sourceTabId === sourceTabId;
  if (active || message.kind !== "batch") return { ok: true, active };

  const recovery = await getStoredBatchRecovery();
  if (!recovery || recovery.sourceTabId !== sourceTabId) {
    return { ok: true, active: false };
  }
  if (recovery.status === "running") {
    await persistBatchRecovery(recovery, {
      status: "paused",
      reason: "service_worker_restarted",
      hadIssues: true,
    });
    await notifyBatchRecoveryNudge(recovery);
  }
  return {
    ok: true,
    active: false,
    recoverable: true,
    recovery: publicBatchRecovery(recovery),
  };
}

async function cleanupBatchUploadSession(job, reason = "completed") {
  if (!job?.sessionId) return;
  const v2 = job.inputSource !== "computer";
  try {
    await fetch(
      `${API_BASE}/api/phone-upload?action=cleanup${v2 ? `&v=2&reason=${encodeURIComponent(reason)}` : ""}&sessionId=${encodeURIComponent(job.sessionId)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      },
    );
  } catch (err) {
    console.warn("[Background] Batch cleanup failed:", err);
  }
}

async function runBatchGenerationJob(job) {
  const { groups } = job;
  let activeItemIndex = Math.max(0, Number(job.completedCount || 0));
  let lastWorkTabId = null;
  const offersByCampaign = new Map();

  notifyBatchProgress(job, {
    status: "queued",
    current: job.completedCount,
    total: groups.length,
  });

  try {
    for (let index = activeItemIndex; index < groups.length; index += 1) {
      activeItemIndex = index + 1;
      await persistBatchRecovery(job, {
        status: "running",
        message: null,
        reason: null,
        currentItemIndex: activeItemIndex,
        currentWorkTabId: null,
      });
      notifyBatchProgress(job, {
        status: "opening_tab",
        current: index + 1,
        total: groups.length,
        itemIndex: index + 1,
      });

      const workTab = await duplicateTab(job.sourceTabId);
      await persistBatchRecovery(job, { currentWorkTabId: workTab.id });
      await waitForTabComplete(workTab.id);
      await waitForBatchTabReady(workTab.id);

      notifyBatchProgress(job, {
        status: "tab_ready",
        current: index + 1,
        total: groups.length,
        itemIndex: index + 1,
      });

      notifyBatchProgress(job, {
        status: "generating",
        current: index + 1,
        total: groups.length,
        itemIndex: index + 1,
      });

      const result = await sendTabMessage(workTab.id, {
        type: "RUN_BATCH_ITEM",
        batchId: job.batchId,
        itemIndex: index + 1,
        totalItems: groups.length,
        files: groups[index],
      });

      if (!result?.ok) {
        throw new Error(
          result?.error || `Listing ${index + 1} could not be generated.`,
        );
      }
      await markBatchItemComplete({
        batchId: job.batchId,
        itemIndex: index + 1,
        workTabId: workTab.id,
      });
      lastWorkTabId = workTab.id;

      if (Array.isArray(result.offers)) {
        result.offers.forEach((offer) => {
          if (offer?.campaignKey && !offersByCampaign.has(offer.campaignKey)) {
            offersByCampaign.set(offer.campaignKey, offer);
          }
        });
      }

      notifyBatchProgress(job, {
        status: "item_done",
        current: index + 1,
        total: groups.length,
        itemIndex: index + 1,
      });

      if (index < groups.length - 1) {
        notifyBatchProgress(job, {
          status: "waiting",
          current: index + 1,
          total: groups.length,
          itemIndex: index + 1,
          delayMs: BATCH_ITEM_REVIEW_SETTLE_MS,
        });
        await sleep(BATCH_ITEM_REVIEW_SETTLE_MS);
      }
    }

    await cleanupBatchUploadSession(job);
    await persistBatchRecovery(job, {
      status: "done",
      reason: "completed",
      completedCount: groups.length,
      currentItemIndex: groups.length,
      currentWorkTabId: job.currentWorkTabId,
    });
    notifyBatchProgress(job, {
      status: "done",
      reason: "completed",
      current: groups.length,
      total: groups.length,
      offers: Array.from(offersByCampaign.values()),
    });
    if (lastWorkTabId && job.hadIssues !== true) {
      sendTabMessage(lastWorkTabId, {
        type: "SHOW_BATCH_REVIEW_PROMPT",
        total: groups.length,
      }).catch((error) =>
        console.debug("Batch review prompt unavailable:", error),
      );
    }
    await chrome.storage.local.remove(BATCH_RECOVERY_STORAGE_KEY);
  } catch (err) {
    console.error("[Background] Batch generation failed:", err);
    await persistBatchRecovery(job, {
      status: "paused",
      message: err.message || "Batch generation stopped.",
      reason: "generation_error",
      hadIssues: true,
      currentItemIndex: activeItemIndex,
      currentWorkTabId: job.currentWorkTabId,
    });
    await notifyBatchRecoveryNudge(job);
    notifyBatchProgress(job, {
      status: "paused",
      current: job.completedCount,
      total: groups.length,
      itemIndex: activeItemIndex,
      message: err.message || "Batch generation stopped.",
      reason: "generation_error",
    });
  } finally {
    if (activeTabJob === job) activeTabJob = null;
  }
}

async function startBatchGeneration(message, sender) {
  if (activeTabJob) {
    return {
      ok: false,
      error: activeTabJob.kind === "batch"
        ? "A batch is already running."
        : "Another tab job is already running.",
    };
  }

  const sourceTabId = sender?.tab?.id;
  if (!sourceTabId) {
    return { ok: false, error: "Could not find the current Vinted tab." };
  }

  let groups = Array.isArray(message.groups)
    ? message.groups.filter((group) => Array.isArray(group) && group.length > 0)
    : [];
  if (!groups.length) {
    return { ok: false, error: "No grouped photos were provided." };
  }

  const capacityResult = await getBatchCapacity();
  if (!capacityResult.ok) {
    return {
      ok: false,
      error: capacityResult.error || "Could not check generation capacity.",
    };
  }

  const capacity = capacityResult.capacity || {};
  const available = Math.max(0, Math.floor(Number(capacity.available || 0)));
  if (!capacity.allowed || available <= 0) {
    return {
      ok: false,
      error: capacity.message || "You cannot generate more listings right now.",
    };
  }

  const requestedCount = groups.length;
  if (available < requestedCount) {
    groups = groups.slice(0, available);
  }

  if (activeTabJob) {
    return {
      ok: false,
      error: activeTabJob.kind === "batch"
        ? "A batch is already running."
        : "Another tab job is already running.",
    };
  }

  const job = {
    kind: "batch",
    batchId: createAnalyticsClientId(),
    sourceTabId,
    sessionId: message.sessionId,
    inputSource: message.inputSource === "computer" ? "computer" : "phone",
    groups,
    completedCount: 0,
    currentItemIndex: 0,
    currentWorkTabId: null,
    lastCompletedWorkTabId: null,
    status: "running",
    reason: null,
    hadIssues: false,
    createdAt: Date.now(),
    expiresAt: Date.now() + BATCH_RECOVERY_TTL_MS,
  };

  activeTabJob = job;
  try {
    await persistBatchRecovery(job);
  } catch (error) {
    if (activeTabJob === job) activeTabJob = null;
    return { ok: false, error: "Could not save this batch for recovery." };
  }
  runBatchGenerationJob(job);
  return {
    ok: true,
    batchId: job.batchId,
    inputSource: job.inputSource,
    requestedCount,
    startedCount: groups.length,
    limited: groups.length < requestedCount,
  };
}

async function markBatchItemComplete(message, sender = null) {
  const job = await getStoredBatchRecovery();
  const itemIndex = Math.floor(Number(message?.itemIndex || 0));
  if (
    !job ||
    message?.batchId !== job.batchId ||
    itemIndex < 1 ||
    itemIndex > job.groups.length ||
    itemIndex > job.completedCount + 1
  ) {
    return { ok: false, error: "Batch checkpoint is unavailable." };
  }
  const completedCount = Math.max(job.completedCount, itemIndex);
  const isActive = activeTabJob?.kind === "batch" && activeTabJob.batchId === job.batchId;
  const completedWorkTabId = Number.isInteger(sender?.tab?.id)
    ? sender.tab.id
    : Number.isInteger(message?.workTabId)
      ? message.workTabId
      : job.lastCompletedWorkTabId;
  await persistBatchRecovery(job, {
    completedCount,
    currentItemIndex: itemIndex,
    currentWorkTabId: null,
    lastCompletedWorkTabId: completedWorkTabId,
    status: completedCount === job.groups.length
      ? isActive ? "running" : "done"
      : isActive ? "running" : "paused",
    reason: completedCount === job.groups.length
      ? isActive ? null : "completed"
      : isActive ? null : "service_worker_restarted",
    hadIssues: job.hadIssues === true || !isActive,
  });
  if (isActive) activeTabJob.completedCount = completedCount;
  if (isActive) activeTabJob.lastCompletedWorkTabId = completedWorkTabId;
  if (!isActive && completedCount === job.groups.length) {
    await cleanupBatchUploadSession(job);
  }
  if (!isActive && completedCount < job.groups.length) {
    await notifyBatchRecoveryNudge(job);
  }
  return { ok: true, completedCount, total: job.groups.length };
}

function getBatchFileKey(file) {
  return String(file?.path || file?.name || "");
}

async function refreshBatchRecoveryGroups(job) {
  const v2Query = job.inputSource === "computer" ? "" : "&v=2&includeUrls=1&fromOrder=0";
  const response = await fetch(
    `${API_BASE}/api/phone-upload?sessionId=${encodeURIComponent(job.sessionId)}${v2Query}&t=${Date.now()}`,
  );
  if (!response.ok) throw new Error("Saved photos are no longer available.");
  const data = await response.json();
  const files = Array.isArray(data?.files) ? data.files : [];
  const byKey = new Map(files.map((file) => [getBatchFileKey(file), file]));
  const groups = job.groups.map((group) =>
    group.map((oldFile) => byKey.get(getBatchFileKey(oldFile))),
  );
  if (!files.length || groups.some((group) => group.some((file) => !file))) {
    throw new Error("Saved photos are no longer available.");
  }
  return groups;
}

async function getBatchRecovery(sender) {
  const job = await getStoredBatchRecovery();
  if (!job) return { ok: true, recovery: null };
  const sourceTabId = sender?.tab?.id;
  if (job.sourceTabId !== sourceTabId) {
    return {
      ok: true,
      recovery: null,
      nudge: job.status !== "running" && getBatchWorkTabIds(job).includes(sourceTabId),
      batchId: job.batchId,
    };
  }
  if (job.status === "running" && activeTabJob?.batchId !== job.batchId) {
    await persistBatchRecovery(job, {
      status: "paused",
      reason: "service_worker_restarted",
      hadIssues: true,
    });
    await notifyBatchRecoveryNudge(job);
  }
  return { ok: true, recovery: publicBatchRecovery(job) };
}

async function focusBatchRecovery(sender) {
  const job = await getStoredBatchRecovery();
  const callerTabId = sender?.tab?.id;
  if (
    !job ||
    job.status !== "paused" ||
    !getBatchWorkTabIds(job).includes(callerTabId)
  ) {
    return { ok: false, error: "Batch recovery is unavailable from this tab." };
  }

  const existingSource = await getTabIfPresent(job.sourceTabId);
  if (existingSource) {
    await activateTab(existingSource.id);
    sendTabMessage(existingSource.id, {
      type: "SHOW_BATCH_RECOVERY",
      recovery: publicBatchRecovery(job),
    }).catch(() => {});
    return { ok: true, sourceTabId: existingSource.id, recreated: false };
  }

  let createUrl;
  try {
    const callerUrl = new URL(sender.tab.url);
    if (
      callerUrl.protocol !== "https:" ||
      !/(^|\.)vinted\.[a-z.]+$/i.test(callerUrl.hostname)
    ) {
      throw new Error("Invalid Vinted tab.");
    }
    callerUrl.pathname = "/items/new";
    callerUrl.search = "";
    callerUrl.hash = "";
    createUrl = callerUrl.toString();
  } catch {
    return { ok: false, error: "Could not open the batch tab." };
  }

  const sourceTab = await createActiveTab(createUrl);
  await persistBatchRecovery(job, { sourceTabId: sourceTab.id, hadIssues: true });
  await waitForTabComplete(sourceTab.id);
  await waitForBatchTabReady(sourceTab.id);
  await sendTabMessage(sourceTab.id, {
    type: "SHOW_BATCH_RECOVERY",
    recovery: publicBatchRecovery(job),
  });
  return { ok: true, sourceTabId: sourceTab.id, recreated: true };
}

async function resumeBatchGeneration(sender) {
  if (activeTabJob) return { ok: false, error: "Another batch is already running." };
  const job = await getStoredBatchRecovery();
  if (!job) return { ok: false, error: "This saved batch is no longer available." };
  if (job.completedCount >= job.groups.length) {
    return {
      ok: true,
      done: true,
      batchId: job.batchId,
      inputSource: job.inputSource,
      recovery: publicBatchRecovery(job),
    };
  }
  await persistBatchRecovery(job, { hadIssues: true });
  try {
    job.groups = await refreshBatchRecoveryGroups(job);
  } catch (error) {
    await persistBatchRecovery(job, {
      status: "expired",
      message: error.message,
      reason: "recovery_files_expired",
    });
    return {
      ok: false,
      expired: true,
      batchId: job.batchId,
      inputSource: job.inputSource,
      error: error.message,
    };
  }
  job.sourceTabId = sender?.tab?.id || job.sourceTabId;
  await persistBatchRecovery(job, {
    status: "running",
    message: null,
    reason: null,
    sourceTabId: job.sourceTabId,
  });
  activeTabJob = job;
  runBatchGenerationJob(job);
  return {
    ok: true,
    batchId: job.batchId,
    inputSource: job.inputSource,
    completedCount: job.completedCount,
    total: job.groups.length,
  };
}

async function discardBatchRecovery() {
  if (activeTabJob?.kind === "batch") {
    return { ok: false, error: "The batch is still running." };
  }
  const job = await getStoredBatchRecovery();
  if (job) await cleanupBatchUploadSession(job, "cancelled");
  await chrome.storage.local.remove(BATCH_RECOVERY_STORAGE_KEY);
  return { ok: true };
}

function validateWardrobeRewriteRequest(message, sender, available) {
  const sourceTabId = sender?.tab?.id;
  const sourceUrl = sender?.tab?.url || sender?.url;
  if (!Number.isInteger(sourceTabId) || sourceTabId <= 0 || !sourceUrl) {
    return { ok: false, error: "Could not find the current Vinted tab." };
  }

  let source;
  try {
    source = new URL(sourceUrl);
  } catch (err) {
    return { ok: false, error: "Could not verify the current Vinted tab." };
  }
  if (source.protocol !== "https:") {
    return { ok: false, error: "Wardrobe rewrites require a secure Vinted tab." };
  }

  const items = Array.isArray(message.items) ? message.items : [];
  if (!items.length) return { ok: false, error: "No wardrobe items were provided." };
  if (items.length > available) {
    return { ok: false, error: "Selected items exceed your available listings." };
  }
  if (!["replace", "review"].includes(message.applyMode)) {
    return { ok: false, error: "Unsupported rewrite mode." };
  }
  if (
    !SUPPORTED_LANGUAGE_CODES.has(message.titleLanguageCode) ||
    !SUPPORTED_LANGUAGE_CODES.has(message.descriptionLanguageCode)
  ) {
    return { ok: false, error: "Unsupported language." };
  }
  if (
    message.descriptionFooterIncluded !== undefined &&
    typeof message.descriptionFooterIncluded !== "boolean"
  ) {
    return { ok: false, error: "Unsupported saved note preference." };
  }

  const ids = new Set();
  for (const item of items) {
    const itemId = item?.id;
    if (typeof itemId !== "string" || !/^\d+$/.test(itemId) || ids.has(itemId)) {
      return { ok: false, error: "Wardrobe items must have unique numeric IDs." };
    }
    ids.add(itemId);

    try {
      const editUrl = new URL(item.editUrl);
      if (
        editUrl.protocol !== "https:" ||
        editUrl.origin !== source.origin ||
        editUrl.pathname !== `/items/${itemId}/edit` ||
        editUrl.search ||
        editUrl.hash
      ) {
        return { ok: false, error: "Wardrobe item edit URLs are invalid." };
      }
    } catch (err) {
      return { ok: false, error: "Wardrobe item edit URLs are invalid." };
    }
  }

  return { ok: true, sourceTabId, items };
}

async function runWardrobeRewriteJob(job) {
  let activeItemIndex = 0;

  notifyWardrobeRewriteProgress(job, {
    status: "queued",
    current: 0,
    total: job.items.length,
  });

  try {
    for (let index = 0; index < job.items.length; index += 1) {
      const item = job.items[index];
      activeItemIndex = index + 1;
      notifyWardrobeRewriteProgress(job, {
        status: "opening_tab",
        current: activeItemIndex,
        total: job.items.length,
        itemIndex: activeItemIndex,
        itemId: item.id,
      });

      const workTab = await createActiveTab(item.editUrl);
      await waitForTabComplete(workTab.id);
      await waitForWardrobeRewriteTabReady(workTab.id, item.id);

      notifyWardrobeRewriteProgress(job, {
        status: "tab_ready",
        current: activeItemIndex,
        total: job.items.length,
        itemIndex: activeItemIndex,
        itemId: item.id,
      });
      notifyWardrobeRewriteProgress(job, {
        status: "generating",
        current: activeItemIndex,
        total: job.items.length,
        itemIndex: activeItemIndex,
        itemId: item.id,
      });

      const result = await sendTabMessage(workTab.id, {
        type: "RUN_WARDROBE_REWRITE_ITEM",
        itemId: item.id,
        itemIndex: activeItemIndex,
        totalItems: job.items.length,
        applyMode: job.applyMode,
        titleLanguageCode: job.titleLanguageCode,
        descriptionLanguageCode: job.descriptionLanguageCode,
        descriptionFooterIncluded: job.descriptionFooterIncluded,
      });
      if (!result?.ok) {
        throw new Error(result?.error || `Listing ${activeItemIndex} could not be rewritten.`);
      }

      notifyWardrobeRewriteProgress(job, {
        status: "item_done",
        current: activeItemIndex,
        total: job.items.length,
        itemIndex: activeItemIndex,
        itemId: item.id,
      });
      if (index < job.items.length - 1) {
        await sleep(BATCH_ITEM_REVIEW_SETTLE_MS);
      }
    }

    notifyWardrobeRewriteProgress(job, {
      status: "done",
      current: job.items.length,
      total: job.items.length,
    });
  } catch (err) {
    console.error("[Background] Wardrobe rewrite failed:", err);
    notifyWardrobeRewriteProgress(job, {
      status: "failed",
      current: activeItemIndex,
      total: job.items.length,
      itemIndex: activeItemIndex,
      message: err.message || "Wardrobe rewrite stopped.",
    });
  } finally {
    if (activeTabJob === job) activeTabJob = null;
  }
}

async function startWardrobeRewrite(message, sender) {
  if (activeTabJob) {
    return { ok: false, error: "Another tab job is already running." };
  }

  const capacityResult = await getBatchCapacity();
  if (!capacityResult.ok) {
    return {
      ok: false,
      error: capacityResult.error || "Could not check generation capacity.",
    };
  }

  const capacity = capacityResult.capacity || {};
  const available = Math.max(0, Math.floor(Number(capacity.available || 0)));
  if (!capacity.allowed || available <= 0) {
    return {
      ok: false,
      error: capacity.message || "You cannot generate more listings right now.",
    };
  }

  const request = validateWardrobeRewriteRequest(message, sender, available);
  if (!request.ok) return request;

  if (activeTabJob) {
    return { ok: false, error: "Another tab job is already running." };
  }

  const job = {
    kind: "wardrobe-rewrite",
    sourceTabId: request.sourceTabId,
    items: request.items,
    applyMode: message.applyMode,
    titleLanguageCode: message.titleLanguageCode,
    descriptionLanguageCode: message.descriptionLanguageCode,
    descriptionFooterIncluded: message.descriptionFooterIncluded !== false,
  };
  activeTabJob = job;
  runWardrobeRewriteJob(job);
  return { ok: true, startedCount: job.items.length };
}

async function getBatchCapacity() {
  let session = await ensureValidToken();
  if (!session?.access_token) {
    return {
      ok: false,
      status: 401,
      reason: "auth_required",
      error: "Please sign in again before generating.",
    };
  }

  try {
    let response;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      response = await fetch(`${API_BASE}/api/user/batch-capacity`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "X-Autolister-Extension-Version": chrome.runtime.getManifest().version,
        },
      });
      if (response.status !== 401 || attempt === 1) break;
      session = await refreshTokenWithRetry();
      if (!session?.access_token) break;
    }
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        reason: response.status === 401 ? "auth_required" : "service_unavailable",
        error: payload.error || "Could not check generation capacity.",
      };
    }

    return { ok: true, capacity: payload };
  } catch (err) {
    console.error("[Background] Batch capacity exception:", err);
    return {
      ok: false,
      reason: "service_unavailable",
      error: "Connection issue. Please try again.",
    };
  }
}

// --- EVENT LISTENERS ---

function isAllowedExternalSender(sender) {
  if (sender?.origin) return sender.origin === "https://autolister.app";
  try {
    return sender?.url
      ? new URL(sender.url).origin === "https://autolister.app"
      : false;
  } catch (err) {
    return false;
  }
}

function isAllowedAuthHandoffSender(sender) {
  try {
    const url = sender?.url ? new URL(sender.url) : null;
    if (url) {
      return (
        url.origin === "https://autolister.app" &&
        url.pathname === "/auth/callback"
      );
    }
  } catch (err) {
    return false;
  }
  return false;
}

function buildPublicUserProfileResponse(supabaseSession, userProfile) {
  const user = supabaseSession?.user || null;
  return {
    installed: true,
    signedIn: Boolean(user),
    user: user
      ? {
          id: user.id || null,
          email: user.email || null,
        }
      : null,
    profile: userProfile
      ? {
          subscription_tier: userProfile.subscription_tier || "free",
          subscription_status: userProfile.subscription_status || "free",
          credits_balance: userProfile.credits_balance || 0,
        }
      : null,
  };
}

async function trackAuthHandoffSuccess(session, authEvent = "auth_handoff") {
  if (!session?.access_token) return;
  const analyticsClientId = await getAnalyticsClientId();
  await fetch(`${API_BASE}/api/events/track`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      event: "auth_success",
      source: "extension_external_auth",
      page: "background",
      context: {
        auth_event: authEvent,
        analyticsClientId,
      },
    }),
  }).catch(() => {});
}

async function acceptExternalAuthHandoff(rawSession) {
  const accessToken =
    typeof rawSession?.access_token === "string" ? rawSession.access_token : "";
  const refreshToken =
    typeof rawSession?.refresh_token === "string"
      ? rawSession.refresh_token
      : "";
  if (!accessToken || !refreshToken) {
    return { ok: false, error: "invalid_session" };
  }

  const previousSession = await getStoredSession();
  const { data, error } = await supabaseClient.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  if (error || !data?.session) {
    if (previousSession) await setStoredSession(previousSession);
    return {
      ok: false,
      error: error?.message || "session_set_failed",
    };
  }

  await setStoredSession(data.session);
  await updateAndStoreUserProfile();
  await trackAuthHandoffSuccess(data.session);
  return { ok: true };
}

async function verifyEmailOtp({ email, token }) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const normalizedToken = String(token || "").replace(/\D/g, "");
  if (!normalizedEmail.includes("@") || normalizedToken.length !== 6) {
    return { ok: false, error: "invalid_otp" };
  }

  const { data, error } = await supabaseClient.auth.verifyOtp({
    email: normalizedEmail,
    token: normalizedToken,
    type: "email",
  });
  if (error || !data?.session) {
    return {
      ok: false,
      error: error?.message || "otp_verification_failed",
    };
  }

  await setStoredSession(data.session);
  await updateAndStoreUserProfile();
  await trackAuthHandoffSuccess(data.session, "email_otp");
  return {
    ok: true,
    email: data.session.user?.email || normalizedEmail,
  };
}

function closeAuthHandoffTab(sender, delayMs = 0) {
  const tabId = sender?.tab?.id;
  if (typeof tabId !== "number") return;
  const close = () => {
    try {
      chrome.tabs.remove(tabId, () => {
        if (chrome.runtime.lastError) {
          console.debug(
            "Could not close auth callback tab:",
            chrome.runtime.lastError.message,
          );
        }
      });
    } catch (error) {
      console.debug("Could not close auth callback tab:", error);
    }
  };
  const delay = Math.min(Math.max(Number(delayMs) || 0, 0), 5000);
  if (delay > 0) {
    setTimeout(close, delay);
  } else {
    close();
  }
}

async function notifyVintedTabsCheckoutFulfilled() {
  try {
    const tabs = await chrome.tabs.query({
      url: [
        "*://*.vinted.at/*",
        "*://*.vinted.be/*",
        "*://*.vinted.cz/*",
        "*://*.vinted.de/*",
        "*://*.vinted.dk/*",
        "*://*.vinted.es/*",
        "*://*.vinted.fi/*",
        "*://*.vinted.fr/*",
        "*://*.vinted.gr/*",
        "*://*.vinted.hr/*",
        "*://*.vinted.hu/*",
        "*://*.vinted.ie/*",
        "*://*.vinted.it/*",
        "*://*.vinted.lt/*",
        "*://*.vinted.lu/*",
        "*://*.vinted.nl/*",
        "*://*.vinted.pt/*",
        "*://*.vinted.ro/*",
        "*://*.vinted.pl/*",
        "*://*.vinted.se/*",
        "*://*.vinted.sk/*",
        "*://*.vinted.co.uk/*",
        "*://*.vinted.com.au/*",
        "*://*.vinted.com/*",
      ],
    });

    await Promise.allSettled(
      tabs.map((tab) =>
        tab.id
          ? chrome.tabs.sendMessage(tab.id, { type: "CHECKOUT_FULFILLED" })
          : Promise.resolve(),
      ),
    );
  } catch (error) {
    console.debug("Could not notify Vinted tabs after checkout:", error);
  }
}

async function openActionPopup() {
  try {
    await chrome.action.openPopup();
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error?.message || "Unable to open extension popup.",
    };
  }
}

async function openAuthTab() {
  try {
    await chrome.tabs.create({
      url: chrome.runtime.getURL("popup.html?source=vinted_signin_fallback"),
      active: true,
    });
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error?.message || "Unable to open AutoLister sign-in.",
    };
  }
}

chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  if (!isAllowedExternalSender(sender)) {
    return false;
  }

  if (message?.type === "PING") {
    sendResponse({ installed: true });
    return false;
  }

  if (message?.type === "GET_USER_PROFILE") {
    chrome.storage.local.get(["supabaseSession", "userProfile"], (data) => {
      sendResponse(
        buildPublicUserProfileResponse(data.supabaseSession, data.userProfile),
      );
    });
    return true;
  }

  if (
    message?.type === "OPEN_SIGNIN_POPUP" ||
    message?.type === "OPEN_POPUP"
  ) {
    openActionPopup().then(sendResponse);
    return true;
  }

  if (message?.type === "AUTH_HANDOFF") {
    if (!isAllowedAuthHandoffSender(sender)) return false;
    acceptExternalAuthHandoff(message.session).then((response) => {
      sendResponse(response);
      if (response?.ok) closeAuthHandoffTab(sender, message.closeDelayMs);
    });
    return true;
  }

  if (message?.type === "CHECKOUT_FULFILLED") {
    updateAndStoreUserProfile()
      .then(() => notifyVintedTabsCheckoutFulfilled())
      .then(() => sendResponse({ ok: true }))
      .catch((error) =>
        sendResponse({
          ok: false,
          error: error?.message || "Unable to refresh profile.",
        }),
      );
    return true;
  }

  return false;
});

/**
 * Main message handler for requests from other parts of the extension.
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    switch (message.type) {
      case "GET_USER_PROFILE":
        const { supabaseSession, userProfile } = await chrome.storage.local.get(
          ["supabaseSession", "userProfile"],
        );
        sendResponse({
          user: supabaseSession?.user || null,
          profile: userProfile || null,
        });
        break;

      case "GET_ACCESS_TOKEN":
        const session = await ensureValidToken();
        sendResponse(
          session
            ? {
                access_token: session.access_token,
                expires_at: session.expires_at,
              }
            : null,
        );
        break;

      case "GET_VALID_SESSION":
        const validSession = await ensureValidToken();
        sendResponse(
          validSession?.user?.email
            ? {
                ok: true,
                email: validSession.user.email,
                userId: validSession.user.id || null,
                expires_at: validSession.expires_at || null,
              }
            : { ok: false, reason: "no_session" },
        );
        break;

      case "GET_USER_USAGE_COUNT":
        const usageCount = await fetchUserUsageCount();
        sendResponse(usageCount);
        break;

      // THIS IS THE FIX: Restore the handler for the signal from the callback page.
      case "AUTH_UPDATED":
        await updateAndStoreUserProfile();
        sendResponse({ ok: true });
        break;

      case "VERIFY_EMAIL_OTP":
        sendResponse(await verifyEmailOtp(message));
        break;

      case "SIGN_OUT":
        const result = await handleSignOut();
        sendResponse(result);
        break;

      case "OPEN_POPUP":
        sendResponse(await openActionPopup());
        break;

      case "OPEN_AUTH_TAB":
        sendResponse(await openAuthTab());
        break;

      case "CREATE_CHECKOUT": {
        const checkout = await createCheckout(message);
        sendResponse(checkout);
        break;
      }

      case "QUICKVINT_TAB_JOB_HEARTBEAT":
        sendResponse(await getTabJobHeartbeat(message, sender));
        break;

      case "GET_RUNTIME_INFO":
        sendResponse({ ok: true, batchDiagnosticsVersion: 2 });
        break;

      case "GET_BATCH_RECOVERY":
        sendResponse(await getBatchRecovery(sender));
        break;

      case "FOCUS_BATCH_RECOVERY":
        sendResponse(await focusBatchRecovery(sender));
        break;

      case "RESUME_BATCH_GENERATION":
        sendResponse(await resumeBatchGeneration(sender));
        break;

      case "MARK_BATCH_ITEM_COMPLETE":
        sendResponse(await markBatchItemComplete(message, sender));
        break;

      case "DISCARD_BATCH_RECOVERY":
        sendResponse(await discardBatchRecovery());
        break;

      case "START_BATCH_GENERATION": {
        const batchStart = await startBatchGeneration(message, sender);
        sendResponse(batchStart);
        break;
      }

      case "START_WARDROBE_REWRITE": {
        const wardrobeStart = await startWardrobeRewrite(message, sender);
        sendResponse(wardrobeStart);
        break;
      }

      case "GET_BATCH_CAPACITY": {
        const capacity = await getBatchCapacity();
        sendResponse(capacity);
        break;
      }

      case "PROXY_FETCH":
        try {
          const response = await fetch(message.url, message.options);

          if (!response.ok) {
            let data = null;
            try {
              const contentType = response.headers.get("content-type");
              data = contentType?.includes("application/json")
                ? await response.json()
                : await response.text();
            } catch (error) {
              // Keep the HTTP status when the error body is unreadable.
            }
            sendResponse({
              ok: false,
              status: response.status,
              data,
              error: data?.error || `HTTP ${response.status}`,
            });
            return;
          }

          if (message.isBlob) {
            const blob = await response.blob();

            if (blob.size === 0) {
              sendResponse({ ok: false, error: "Empty blob received" });
              return;
            }

            const reader = new FileReader();
            reader.onloadend = () => {
              sendResponse({
                ok: true,
                status: response.status,
                data: reader.result,
              });
            };
            reader.onerror = () => {
              sendResponse({ ok: false, error: "Failed to read blob" });
            };
            reader.readAsDataURL(blob);
            return;
          }

          let data;
          const contentType = response.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            data = await response.json();
          } else {
            data = await response.text();
          }
          sendResponse({ ok: true, status: response.status, data });
        } catch (err) {
          console.error("[Background] Fetch exception:", err);
          sendResponse({ ok: false, error: err.toString() });
        }
        break;

      default:
        sendResponse({ error: "Unknown message type" });
        break;
    }
  })();
  return true; // Keep message channel open for async response
});

/**
 * Listens for Supabase auth state changes to keep storage and profile in sync.
 */
supabaseClient.auth.onAuthStateChange((event, session) => {
  (async () => {
    try {
      if (event === "SIGNED_OUT" || event === "USER_DELETED") {
        if (tokenRefreshTimeout) clearTimeout(tokenRefreshTimeout);
        const keysToRemove = ["supabaseSession", "userProfile"];
        if (event === "USER_DELETED") keysToRemove.push(ACCOUNT_EMAIL_STORAGE_KEY);
        await chrome.storage.local.remove(keysToRemove);
        await setAutolisterUninstallUrl();
      } else if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        await setStoredSession(session);
        await updateAndStoreUserProfile();
      } else if (session) {
        await setStoredSession(session);
        await setAutolisterUninstallUrl();
      }
    } catch (e) {
      console.error("Error in onAuthStateChange handler:", e);
    }
  })();
});

/**
 * Clean up the refresh timer when the service worker is about to go idle.
 */
chrome.runtime.onSuspend.addListener(() => {
  if (tokenRefreshTimeout) {
    clearTimeout(tokenRefreshTimeout);
  }
});

// --- STARTUP LOGIC ---

/**
 * Initializes the service worker on startup.
 */
async function init() {
  const session = await getStoredSession();
  if (session) {
    await supabaseClient.auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    });

    updateAndStoreUserProfile();

    if (isTokenNearExpiry(session)) {
      await refreshTokenWithRetry();
    } else {
      scheduleTokenRefresh(session);
    }
  }
}

init();
