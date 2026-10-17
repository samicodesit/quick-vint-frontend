// --- IMPORTS & INITIALIZATION ---
importScripts("lib/supabase.js", "lib/telemetry-registry.js", "lib/telemetry-core.js", "lib/telemetry-client.js", "lib/telemetry-background.js");

const ANALYTICS_CLIENT_ID_KEY = "analyticsClientId";
const ACCOUNT_EMAIL_STORAGE_KEY = "accountEmail";
const USER_USAGE_SNAPSHOT_STORAGE_KEY = "quickvintUserUsageSnapshot";
const BATCH_RECOVERY_STORAGE_KEY = "quickvintBatchRecovery";
const BATCH_GENERATION_REQUEST_KEY = "quickvintBatchGenerationRequest";
const BATCH_REVIEW_STORAGE_KEY = "quickvintBatchReviews";
const BATCH_RECOVERY_TTL_MS = 6 * 60 * 60 * 1000;
let batchGenerationRequestQueue = Promise.resolve();
let batchReviewQueue = Promise.resolve();
let batchCheckpointQueue = Promise.resolve();
let batchRecoveryQueue = Promise.resolve();
let batchRecoveryControlQueue = Promise.resolve();
let analyticsClientIdPromise;

function createAnalyticsClientId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `cid_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

async function getAnalyticsClientId() {
  if (!analyticsClientIdPromise) analyticsClientIdPromise = (async () => {
    const data = await chrome.storage.local.get(ANALYTICS_CLIENT_ID_KEY);
    if (data[ANALYTICS_CLIENT_ID_KEY]) return data[ANALYTICS_CLIENT_ID_KEY];
    const analyticsClientId = createAnalyticsClientId();
    await chrome.storage.local.set({ [ANALYTICS_CLIENT_ID_KEY]: analyticsClientId });
    return analyticsClientId;
  })().catch((error) => { analyticsClientIdPromise = null; throw error; });
  return analyticsClientIdPromise;
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
function getTelemetryEndpoint() { return `${API_BASE}/api/events/track`; }
const TOKEN_REFRESH_MARGIN_MS = 5 * 60 * 1000; // 5 minutes
const MIN_REFRESH_DELAY_MS = 60 * 1000; // 1 minute
const FREE_LIFETIME_LIMIT = 5;
const CHECKOUT_TIERS = new Set(["starter", "pro", "business"]);
const PAID_BILLING_STATUSES = new Set([
  "active",
  "trialing",
  "canceling",
  "past_due",
  "unpaid",
]);
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
// Bound auth network I/O, including the response body, before Chrome's
// service-worker fetch deadline. Other Supabase and product requests retain
// their existing transport. Abort the actual fetch rather than abandoning it.
async function boundedSupabaseFetch(input, options) {
  const url = new URL(typeof input === "string" ? input : input?.url || String(input));
  if (url.origin !== SUPABASE_URL || !url.pathname.startsWith("/auth/v1/")) {
    return fetch(input, options);
  }
  const controller = new AbortController();
  const callerSignal = options?.signal || input?.signal;
  const forwardAbort = () => controller.abort(callerSignal.reason);
  if (callerSignal?.aborted) forwardAbort();
  else callerSignal?.addEventListener("abort", forwardAbort, { once: true });
  const timeout = setTimeout(() => controller.abort(Object.assign(
    new Error("Authentication request timed out"), { name: "AbortError" },
  )), 20000);
  try {
    const response = await fetch(input, { ...options, signal: controller.signal });
    const body = await response.arrayBuffer();
    const complete = new Response(body.byteLength ? body : null, {
      status: response.status, statusText: response.statusText, headers: response.headers,
    });
    for (const key of ["url", "redirected", "type"])
      Object.defineProperty(complete, key, { value: response[key] });
    return complete;
  } finally {
    clearTimeout(timeout);
    callerSignal?.removeEventListener("abort", forwardAbort);
  }
}
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  global: { fetch: boundedSupabaseFetch },
});
let tokenRefreshPromise = null;
let tokenRefreshTimeout = null;
let activeTabJob = null;

// Website source data travels separately from auth. Never change the OAuth
// redirect or wait for analytics before completing sign-in.
const FIRST_TOUCH_KEY = "autolister.first_touch.v1";
const ATTRIBUTION_MAX_AGE_MS = 180 * 24 * 60 * 60 * 1000;
let attributionClaimInFlight = false;
let attributionStorageQueue = Promise.resolve();

function sanitizeFirstTouch(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const source = typeof value.source === "string" ? value.source.trim().toLowerCase() : "";
  const media = ["organic_social", "paid_social", "referral", "search", "email", "direct", "unknown"];
  const captured = typeof value.capturedAt === "string" ? Date.parse(value.capturedAt) : NaN;
  if (!/^[a-z0-9][a-z0-9._-]{0,79}$/.test(source) || !media.includes(value.medium) ||
      !Number.isFinite(captured) || captured > Date.now() + 5 * 60 * 1000 ||
      captured < Date.now() - ATTRIBUTION_MAX_AGE_MS) return null;
  const slug = input => typeof input === "string"
    ? input.trim().toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || null
    : null;
  const host = typeof value.referrerHost === "string" ? value.referrerHost.trim().toLowerCase().replace(/\.$/, "") : "";
  const referrerHost = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(host) &&
    !/(^|\.)(autolister\.app|localhost|local|internal)$/.test(host) ? host : null;
  return { source, medium: value.medium, campaign: slug(value.campaign), content: slug(value.content),
    capturedAt: new Date(captured).toISOString(), referrerHost };
}

function withAttributionStorage(task) {
  const result = attributionStorageQueue.catch(() => {}).then(task);
  attributionStorageQueue = result;
  return result;
}

function isAttributionBridgeSender(sender) {
  try {
    return new URL(sender?.url || "").origin === "https://autolister.app" &&
      (!sender.origin || sender.origin === "https://autolister.app") &&
      (sender.frameId === undefined || sender.frameId === 0);
  } catch { return false; }
}

async function captureWebsiteAttribution(raw) {
  const attribution = sanitizeFirstTouch(raw);
  if (!attribution) return { ok: false, error: "invalid_attribution" };
  await withAttributionStorage(async () => {
    const data = await chrome.storage.local.get(FIRST_TOUCH_KEY);
    if (sanitizeFirstTouch(data[FIRST_TOUCH_KEY]?.attribution)) return;
    await chrome.storage.local.set({ [FIRST_TOUCH_KEY]: { attribution } });
  });
  void claimStoredFirstTouch().catch(() => {});
  return { ok: true };
}

async function claimStoredFirstTouch() {
  const data = await chrome.storage.local.get([FIRST_TOUCH_KEY, "supabaseSession"]);
  const session = data.supabaseSession;
  const record = data[FIRST_TOUCH_KEY];
  if (!record) return false;
  const attribution = sanitizeFirstTouch(record.attribution);
  if (!attribution) {
    await withAttributionStorage(async () => {
      const current = (await chrome.storage.local.get(FIRST_TOUCH_KEY))[FIRST_TOUCH_KEY];
      if (JSON.stringify(current) === JSON.stringify(record)) await chrome.storage.local.remove(FIRST_TOUCH_KEY);
    });
    return false;
  }
  const userId = session?.user?.id;
  if (!userId || !session.access_token || record.claimed ||
      (record.userId && record.userId !== userId) || attributionClaimInFlight) return false;
  attributionClaimInFlight = true;
  try {
    const pending = { attribution, userId };
    const bound = await withAttributionStorage(async () => {
      const current = await chrome.storage.local.get([FIRST_TOUCH_KEY, "supabaseSession"]);
      if (current.supabaseSession?.user?.id !== userId ||
          JSON.stringify(current[FIRST_TOUCH_KEY]) !== JSON.stringify(record)) return false;
      // Bind before sending, so failures or account changes cannot assign this
      // browser source to a second account. This never changes the auth session.
      if (!record.userId) await chrome.storage.local.set({ [FIRST_TOUCH_KEY]: pending });
      return true;
    });
    if (!bound) return false;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      const response = await fetch(`${API_BASE}/api/attribution/claim`, {
        method: "POST", credentials: "omit", signal: controller.signal,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ attribution }),
      });
      if (!response.ok) return false;
      await withAttributionStorage(async () => {
        const current = (await chrome.storage.local.get(FIRST_TOUCH_KEY))[FIRST_TOUCH_KEY];
        // Chrome storage can reorder object keys. Compare canonical source
        // values, rather than the serialized order of a newly created object.
        if (current?.userId === userId && !current.claimed &&
            JSON.stringify(sanitizeFirstTouch(current.attribution)) === JSON.stringify(attribution)) {
          await chrome.storage.local.set({ [FIRST_TOUCH_KEY]: { ...pending, claimed: true } });
        }
      });
      return true;
    } catch { return false; }
    finally { clearTimeout(timeout); }
  } finally { attributionClaimInFlight = false; }
}

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
  const telemetryOperation = crypto.randomUUID();
  const trackRefresh = (event, context = {}) => { void globalThis.AutoListerTelemetry?.track(event, { operationId: telemetryOperation, ...context }, "extension_background"); };
  const refreshStartedAt = Date.now();
  let refreshPhase = "load_session";
  const refreshErrorContext = (error) => ({
    stage: "authenticating",
    phase: refreshPhase,
    elapsedMs: Date.now() - refreshStartedAt,
    errorCode: error?.code || "REFRESH_RETRIES_EXHAUSTED",
    errorName: error?.name,
    message: error?.message,
    stack: error?.stack,
    statusCode: error?.status,
  });
  tokenRefreshPromise = (async () => {
    let lastRefreshError;
    let attempts = 0;
    try {
      const session = await getStoredSession();
      if (!session?.refresh_token) return null;

      trackRefresh("token_refresh_start");
      refreshPhase = "restore_session";
      const restored = await supabaseClient.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      });
      if (restored.error) {
        if (restored.error.message?.includes("Invalid Refresh Token") ||
            restored.error.message?.includes("refresh_token_not_found")) {
          trackRefresh("token_refresh_expired", { ...refreshErrorContext(restored.error), attempts });
          await handleSignOut({ clearAccountEmail: false });
          return null;
        }
        // An expired access JWT is recoverable with the refresh token. The
        // server can reject it before the local clock considers it expired.
        const accessTokenExpired = restored.error.code === "bad_jwt" &&
          restored.error.status === 403 && /token is expired/i.test(restored.error.message || "");
        if (!accessTokenExpired) throw restored.error;
      }

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        attempts = attempt;
        refreshPhase = "refresh_session";
        const { data, error } = await supabaseClient.auth.refreshSession({
          refresh_token: session.refresh_token,
        });

        if (!error && data.session) {
          refreshPhase = "persist_session";
          await setStoredSession(data.session);
          trackRefresh("token_refresh_success");
          return data.session;
        }

        lastRefreshError = error;
        console.warn(`Token refresh attempt ${attempt} failed:`, error?.message);
        if (
          error?.message?.includes("Invalid Refresh Token") ||
          error?.message?.includes("refresh_token_not_found")
        ) {
          trackRefresh("token_refresh_expired", { ...refreshErrorContext(error), attempts });
          await handleSignOut({ clearAccountEmail: false });
          return null;
        }

        if (attempt < maxRetries) {
          await new Promise((res) => setTimeout(res, 1000 * 2 ** attempt));
        }
      }
      trackRefresh("token_refresh_failed", { ...refreshErrorContext(lastRefreshError), reason: "retries_exhausted", attempts });
      console.error("Token refresh failed after all retries.");
      return null;
    } catch (error) {
      trackRefresh("token_refresh_failed", { ...refreshErrorContext(error), reason: "refresh_exception", attempts });
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
    PAID_BILLING_STATUSES.has(profile?.subscription_status)
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
  void claimStoredFirstTouch().catch(() => {});

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

async function createBatchWorkTab(job) {
  const source = await getTabIfPresent(job.sourceTabId);
  if (!source?.url) throw new Error("The batch tab was closed. Your source photos are still saved.");
  const url = new URL(source.url);
  if (url.protocol !== "https:" || !/(^|\.)vinted\.[a-z.]+$/i.test(url.hostname)) {
    throw new Error("Keep the batch tab on Vinted while listings are prepared.");
  }
  url.pathname = "/items/new";
  url.search = "";
  url.hash = "";
  const previous = await getTabIfPresent(job.lastCompletedWorkTabId);
  const anchor = previous?.windowId === source.windowId ? previous : source;
  return new Promise((resolve, reject) => {
    chrome.tabs.create({
      url: url.toString(), active: false, openerTabId: source.id,
      ...(Number.isInteger(source.windowId) ? { windowId: source.windowId } : {}),
      ...(Number.isInteger(anchor?.index) ? { index: anchor.index + 1 } : {}),
    }, (tab) => {
      const error = chrome.runtime.lastError;
      if (error || !tab?.id) {
        reject(new Error(error?.message || "Could not open a Vinted listing tab."));
        return;
      }
      resolve(tab);
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

async function notifyBatchProgress(job, payload) {
  if (!job?.sourceTabId) return;
  if ((await getStoredSession())?.user?.id !== job.ownerId) return;
  if (!["done", "paused", "failed"].includes(payload.status)) {
    void globalThis.AutoListerTelemetry?.track(payload.status === "waiting" ? "batch_worker_waiting" : "batch_worker_progress", { batchId: job.batchId, generationAttemptId: job.currentGenerationAttemptId, reason: payload.reason, inputSource: job.inputSource, phase: payload.status, itemIndex: payload.itemIndex, completedCount: job.completedCount, total: payload.total }, "extension_background", false, job.ownerId);
  }
  const message = { type: "BATCH_PROGRESS", ownerId: job.ownerId, batchId: job.batchId, generationAttemptId: job.currentGenerationAttemptId, inputSource: job.inputSource, reason: job.reason || null, createdAt: job.createdAt, ...payload };
  const delivery = chrome.tabs.sendMessage(job.sourceTabId, message);
  delivery?.catch?.(() => {
    // A closed controller is an interruption, not a host crash. Keep terminal
    // evidence even when its content-script tracking call can no longer run.
    if (["done", "paused", "failed"].includes(payload.status)) {
      void globalThis.AutoListerTelemetry?.track(message.reason === "user_stopped" ? "batch_cancelled" : `batch_${payload.status}`, { batchId: job.batchId, generationAttemptId: job.currentGenerationAttemptId, itemIndex: job.currentItemIndex, inputSource: job.inputSource, reason: message.reason, message: payload.message, completedCount: job.completedCount, total: payload.total }, "extension_background", false, job.ownerId);
    }
  });
}

function getBatchWorkTabIds(job) {
  return [...new Set([job?.currentWorkTabId, job?.lastCompletedWorkTabId])]
    .filter((tabId) => Number.isInteger(tabId) && tabId !== job?.sourceTabId);
}

async function notifyBatchRecoveryNudge(job) {
  if ((await getStoredSession())?.user?.id !== job.ownerId) return;
  await Promise.allSettled(getBatchWorkTabIds(job).map((tabId) =>
    sendTabMessage(tabId, {
      type: "SHOW_BATCH_RECOVERY_NUDGE",
      ownerId: job.ownerId,
      batchId: job.batchId,
      status: job.discardRequested ? "discard_pending" : job.status,
    }),
  ));
}

async function clearBatchRecoveryNudges(job) {
  if ((await getStoredSession())?.user?.id !== job.ownerId) return;
  await Promise.allSettled(getBatchWorkTabIds(job).map(tabId => sendTabMessage(tabId, {
    type: "CLEAR_BATCH_RECOVERY_NUDGE", ownerId: job.ownerId, batchId: job.batchId,
  })));
}

chrome.tabs.onRemoved?.addListener((tabId) => {
  void (async () => {
    const job = await getStoredBatchRecovery();
    if (job?.sourceTabId === tabId && ["paused", "expired"].includes(job.status)) {
      await notifyBatchRecoveryNudge(job);
    }
  })().catch(error => console.debug("Batch return control unavailable:", error));
});

function notifyWardrobeRewriteProgress(job, payload) {
  if (!job?.sourceTabId) return;
  job.telemetryOperationId ||= createAnalyticsClientId();
  const event = payload.status === "failed" ? "wardrobe_rewrite_failed" : payload.status === "done" ? "wardrobe_rewrite_done" : "wardrobe_rewrite_progress";
  void globalThis.AutoListerTelemetry?.track(event, { operationId: job.telemetryOperationId, mode: "wardrobe_rewrite", phase: payload.status, itemIndex: payload.itemIndex || payload.current, total: payload.total, message: payload.message }, "extension_background");
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
    await removeBatchRecoveryIfCurrent(stored);
    return null;
  }
  return stored;
}

function removeBatchRecoveryIfCurrent(job) {
  const operation = batchRecoveryQueue.then(async () => {
    const latest = (await chrome.storage.local.get(BATCH_RECOVERY_STORAGE_KEY))[BATCH_RECOVERY_STORAGE_KEY];
    if (!latest) return true;
    if (latest.batchId !== job.batchId || latest.ownerId !== job.ownerId) return false;
    await chrome.storage.local.remove(BATCH_RECOVERY_STORAGE_KEY);
    return true;
  });
  batchRecoveryQueue = operation.catch(() => {});
  return operation;
}

function persistBatchRecovery(job, updates = {}, options = {}) {
  const operation = batchRecoveryQueue.then(async () => {
    const latest = (await chrome.storage.local.get(BATCH_RECOVERY_STORAGE_KEY))[BATCH_RECOVERY_STORAGE_KEY];
    const changed = () => Object.assign(new Error("This batch changed. Your photos are still saved."), { code: "BATCH_STATE_CHANGED" });
    if (!options.initialize) {
      if (!latest || latest.batchId !== job.batchId || latest.ownerId !== job.ownerId) throw changed();
      if (latest.discardRequested && !job.discardRequested && !updates.discardRequested) throw changed();
      const proposedStatus = updates.status || job.status;
      if (latest.status === "paused" && ["running", "done"].includes(proposedStatus) && !options.resume) throw changed();
      if (latest.status === "done" && proposedStatus !== "done") throw changed();
      if (Number(latest.completedCount || 0) > Math.max(Number(job.completedCount || 0), Number(updates.completedCount || 0)) ||
          Number(latest.currentItemIndex || 0) > Math.max(Number(job.currentItemIndex || 0), Number(updates.currentItemIndex || 0))) throw changed();
    }
    return writeBatchRecovery(job, updates);
  });
  batchRecoveryQueue = operation.catch(() => {});
  return operation;
}

async function writeBatchRecovery(job, updates) {
  const stored = {
    version: 1,
    kind: "batch",
    batchId: job.batchId,
    ownerId: job.ownerId || null,
    sourceTabId: job.sourceTabId,
    sessionId: job.sessionId,
    inputSource: job.inputSource || "phone",
    groups: job.groups,
    completedCount: Math.max(0, Number(job.completedCount || 0)),
    currentItemIndex: Math.max(0, Number(job.currentItemIndex || 0)),
    currentGenerationAttemptId: job.currentGenerationAttemptId || null,
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
    discardRequested: job.discardRequested === true,
    createdAt: Number(job.createdAt || Date.now()),
    updatedAt: Date.now(),
    expiresAt: Number(job.expiresAt || Date.now() + BATCH_RECOVERY_TTL_MS),
    ...updates,
  };
  await chrome.storage.local.set({ [BATCH_RECOVERY_STORAGE_KEY]: stored });
  Object.assign(job, stored);
  return stored;
}

function publicBatchRecovery(job) {
  return {
    ownerId: job.ownerId,
    generationAttemptId: job.currentGenerationAttemptId || null,
    itemIndex: job.currentItemIndex,
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
    discardRequested: job.discardRequested === true,
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
  const accountId = message.kind === "batch" ? (await getStoredSession())?.user?.id : null;
  if (message.kind === "batch" && (!accountId || (activeTabJob?.kind === "batch" && activeTabJob.ownerId !== accountId))) {
    return { ok: true, active: false };
  }
  const active =
    activeTabJob?.kind === message.kind &&
    activeTabJob.sourceTabId === sourceTabId;
  if (active || message.kind !== "batch") return { ok: true, active };

  const recovery = await getStoredBatchRecovery();
  if (!recovery || recovery.ownerId !== accountId || recovery.sourceTabId !== sourceTabId) {
    return { ok: true, active: false };
  }
  if (recovery.status === "running") {
    if (!activeTabJob) {
      reattachRunningBatch(recovery);
    }
    return { ok: true, active: activeTabJob?.batchId === recovery.batchId };
  }
  return {
    ok: true,
    active: false,
    recoverable: true,
    recovery: publicBatchRecovery(recovery),
  };
}

function reattachRunningBatch(job) {
  activeTabJob = job;
  void globalThis.AutoListerTelemetry?.track("batch_worker_progress", {
    batchId: job.batchId, generationAttemptId: job.currentGenerationAttemptId,
    itemIndex: job.currentItemIndex, phase: "worker_reattached", reason: "service_worker_restarted",
  }, "extension_background", false, job.ownerId);
  runBatchGenerationJob(job);
}

async function cleanupBatchUploadSession(job, reason = "completed") {
  if (!job?.sessionId) return false;
  const v2 = job.inputSource !== "computer";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(
      `${API_BASE}/api/phone-upload?action=cleanup${v2 ? `&v=2&reason=${encodeURIComponent(reason)}` : ""}&sessionId=${encodeURIComponent(job.sessionId)}`,
      {
        method: "POST",
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      },
    );
    if (!response.ok) throw new Error(`Upload cleanup failed (HTTP ${response.status}).`);
    return true;
  } catch (err) {
    console.warn("[Background] Batch cleanup failed:", err);
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

async function runBatchGenerationJob(job) {
  const { groups } = job;
  let activeItemIndex = Math.max(0, Number(job.completedCount || 0));
  let lastWorkTabId = null;
  const offersByCampaign = new Map();

  notifyBatchProgress(job, {
    status: job.currentWorkTabId && job.message ? "waiting" : "queued",
    message: job.message || undefined,
    reason: job.reason || undefined,
    current: job.completedCount,
    total: groups.length,
  });

  try {
    for (let index = activeItemIndex; index < groups.length; index += 1) {
      activeItemIndex = index + 1;
      if (job.stopRequested || (await getStoredSession())?.user?.id !== job.ownerId) {
        throw new Error(job.stopRequested ? "Batch stopped. Your photos are saved." : "Sign in with the account that started this batch before continuing.");
      }
      const retainedWorkTabId = job.currentItemIndex === activeItemIndex && Number.isInteger(job.currentWorkTabId)
        ? job.currentWorkTabId : null;
      const retainedWorkTab = retainedWorkTabId ? await getTabIfPresent(retainedWorkTabId) : null;
      const retainedWaiting = retainedWorkTab && ["network_wait", "photo_download_wait", "generation_pending", "host_fields_hidden"].includes(job.reason);
      if (retainedWorkTabId && !retainedWorkTab) throw new Error("The listing tab was closed. Your photos are saved. Resume when ready.");
      await persistBatchRecovery(job, {
        status: "running",
        message: retainedWaiting ? job.message : null,
        reason: retainedWaiting ? job.reason : null,
        currentItemIndex: activeItemIndex,
        currentGenerationAttemptId: retainedWorkTabId ? job.currentGenerationAttemptId : null,
        currentWorkTabId: retainedWorkTabId,
      });
      if (!retainedWorkTab) notifyBatchProgress(job, {
        status: "opening_tab",
        current: index + 1,
        total: groups.length,
        itemIndex: index + 1,
      });

      const workTab = retainedWorkTab || await createBatchWorkTab(job);
      await persistBatchRecovery(job, { currentWorkTabId: workTab.id });
      if (!retainedWorkTab) await recordBatchWorkStart(job, index + 1, workTab.id).catch(error => {
        console.debug("Batch navigation unavailable:", error);
      });
      await waitForBatchTabReady(workTab.id);

      if (!retainedWorkTab) notifyBatchProgress(job, {
        status: "tab_ready",
        current: index + 1,
        total: groups.length,
        itemIndex: index + 1,
      });

      notifyBatchProgress(job, {
        status: retainedWaiting ? "waiting" : "generating",
        message: retainedWaiting ? job.message : undefined,
        reason: retainedWaiting ? job.reason : undefined,
        current: retainedWaiting ? job.completedCount : index + 1,
        total: groups.length,
        itemIndex: index + 1,
      });

      const result = await sendTabMessage(workTab.id, {
        type: "RUN_BATCH_ITEM",
        ownerId: job.ownerId,
        batchId: job.batchId,
        itemIndex: index + 1,
        totalItems: groups.length,
        generationAttemptId: job.currentGenerationAttemptId || null,
        files: groups[index],
      });

      if (!result?.ok) {
        throw new Error(
          result?.error || `Listing ${index + 1} could not be generated.`,
        );
      }
      const checkpoint = await markBatchItemComplete({
        batchId: job.batchId,
        itemIndex: index + 1,
        workTabId: workTab.id,
      });
      if (!checkpoint?.ok) throw new Error(checkpoint?.error || "Could not save this listing's completion. Your source photos are still saved.");
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

    // The last item checkpoints its count and terminal status atomically before
    // releasing the exact request or source photos. No second terminal write
    // may turn a completed batch into an interruption.
    notifyBatchProgress(job, {
      status: "done",
      reason: "completed",
      current: groups.length,
      total: groups.length,
      offers: Array.from(offersByCampaign.values()),
    });
    if (lastWorkTabId && job.hadIssues !== true) {
      sendTabMessage(job.sourceTabId, {
        type: "SHOW_BATCH_REVIEW_PROMPT",
        total: groups.length,
        deferUntilBatchDismissed: true,
      }).catch((error) =>
        console.debug("Batch review prompt unavailable:", error),
      );
    }
    // Listing completion is already durable. Housekeeping cannot hold the
    // ready UI or the next explicit Start. Conditional cleanup below cannot
    // remove a newer batch or its exact request.
    if (activeTabJob === job) activeTabJob = null;
    await cleanupBatchUploadSession(job);
    const requestCleared = await clearBatchGenerationRequest(job).catch(() => false);
    if (requestCleared) await removeBatchRecoveryIfCurrent(job).catch(error => {
      // A retained done checkpoint is safe to show and does not block a new
      // batch. Failure to remove it must not report a generation failure.
      console.debug("Completed batch checkpoint retained:", error);
    });
  } catch (err) {
    if (err.code === "BATCH_STATE_CHANGED") return;
    if (!job.stopRequested) console.error("[Background] Batch generation failed:", err);
    await persistBatchRecovery(job, {
      status: "paused",
      message: err.message || "Batch generation stopped.",
      reason: job.stopRequested ? "user_stopped" : "generation_error",
      hadIssues: true,
      currentItemIndex: activeItemIndex,
      currentWorkTabId: job.currentWorkTabId,
    });
    if (!job.stopRequested) await notifyBatchRecoveryNudge(job);
    notifyBatchProgress(job, {
      status: "paused",
      current: job.completedCount,
      total: groups.length,
      itemIndex: activeItemIndex,
      message: err.message || "Batch generation stopped.",
      reason: job.stopRequested ? "user_stopped" : "generation_error",
    });
  } finally {
    if (activeTabJob === job) activeTabJob = null;
  }
}

async function savedBatchStartBlock(ownerId, sourceTabId) {
  const saved = await getStoredBatchRecovery();
  if (!saved?.ownerId) return null;
  if (saved.status === "done") {
    const cleared = await clearBatchGenerationRequest(saved).catch(() => false);
    return cleared ? null : { ok: false, code: "batch_cleanup_failed",
      error: "Could not clear the completed batch. Try again." };
  }
  const owned = saved.ownerId === ownerId;
  return { ok: false, code: "saved_batch_exists", error: owned
    ? saved.discardRequested ? "Finish discarding the previous batch before starting another one."
      : "Resume or discard your saved batch before starting another one."
    : "Another account has a saved batch in this browser. Finish it with that account before starting another batch.",
    ...(owned && saved.sourceTabId === sourceTabId ? { recovery: publicBatchRecovery(saved) } : {}) };
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
  const ownerId = (await getStoredSession())?.user?.id;
  if (!ownerId) return { ok: false, error: "Please sign in before starting a batch." };
  const savedBlock = await savedBatchStartBlock(ownerId, sourceTabId);
  if (savedBlock) return savedBlock;

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

  if ((await getStoredSession())?.user?.id !== ownerId) return { ok: false, error: "Your account changed. Start the batch again when ready." };
  await batchCheckpointQueue;
  const finalSavedBlock = await savedBatchStartBlock(ownerId, sourceTabId);
  if (finalSavedBlock) return finalSavedBlock;
  if (activeTabJob) return { ok: false, error: "Another tab job is already running." };
  const job = {
    kind: "batch",
    ownerId,
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
    await persistBatchRecovery(job, {}, { initialize: true });
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

function markBatchItemComplete(message, sender = null) {
  const result = batchCheckpointQueue.then(() => completeBatchItemCheckpoint(message, sender));
  batchCheckpointQueue = result.catch(() => {});
  return result.catch(error => ({ ok: false, error: error?.message || "Could not save this listing's completion. Your photos are still saved." }));
}

async function completeBatchItemCheckpoint(message, sender) {
  const job = await getStoredBatchRecovery();
  const itemIndex = Math.floor(Number(message?.itemIndex || 0));
  const completedWorkTabId = Number.isInteger(sender?.tab?.id)
    ? sender.tab.id
    : Number.isInteger(message?.workTabId) ? message.workTabId : null;
  const accountId = (await getStoredSession())?.user?.id;
  if (job && (!accountId || job.ownerId !== accountId)) {
    return { ok: false, error: "Sign in with the account that started this batch before continuing." };
  }
  if (job && !["running", "done"].includes(job.status)) return { ok: false, error: "Batch paused. Your photos are saved." };
  if (
    !job ||
    message?.batchId !== job.batchId ||
    itemIndex < 1 ||
    itemIndex > job.groups.length ||
    itemIndex > job.completedCount + 1
  ) {
    return { ok: false, error: "Batch checkpoint is unavailable." };
  }
  if (itemIndex <= job.completedCount) {
    if (itemIndex !== job.completedCount || completedWorkTabId !== job.lastCompletedWorkTabId) {
      return { ok: false, error: "This listing is no longer the active batch item." };
    }
    await clearBatchGenerationRequest(job).catch(() => false);
    return { ok: true, completedCount: job.completedCount, total: job.groups.length };
  }
  if (completedWorkTabId !== job.currentWorkTabId || itemIndex !== job.currentItemIndex) {
    return { ok: false, error: "Only the active listing tab can confirm this batch item." };
  }
  const completedCount = Math.max(job.completedCount, itemIndex);
  const isActive = activeTabJob?.kind === "batch" && activeTabJob.batchId === job.batchId;
  const autoContinue = !activeTabJob && job.status === "running" && completedCount < job.groups.length;
  await persistBatchRecovery(job, {
    completedCount,
    currentItemIndex: itemIndex,
    currentWorkTabId: null,
    lastCompletedWorkTabId: completedWorkTabId,
    status: completedCount === job.groups.length
      ? "done"
      : isActive || autoContinue ? "running" : "paused",
    reason: completedCount === job.groups.length
      ? "completed"
      : isActive || autoContinue ? null : "service_worker_restarted",
    hadIssues: job.hadIssues === true || !isActive,
  });
  if (isActive) activeTabJob.completedCount = completedCount;
  if (isActive) activeTabJob.lastCompletedWorkTabId = completedWorkTabId;
  if (isActive && completedCount === job.groups.length) {
    activeTabJob.status = "done";
    activeTabJob.reason = "completed";
  }
  if (completedCount === job.groups.length) {
    void globalThis.AutoListerTelemetry?.track("batch_complete", { batchId: job.batchId, generationAttemptId: job.currentGenerationAttemptId, itemIndex, completedCount, total: job.groups.length }, "extension_background", false, job.ownerId);
  }
  await recordBatchReviewCompletion(job, itemIndex, completedWorkTabId).catch(error => {
    console.debug("Batch review navigation unavailable:", error);
  });
  // Completion is already durable. A housekeeping failure must not turn the
  // generated result into a failure. Keep its proof until cleanup can finish.
  await clearBatchGenerationRequest(job).catch(() => false);
  if (!isActive && completedCount === job.groups.length) {
    void cleanupBatchUploadSession(job);
    notifyBatchProgress(job, { status: "done", current: completedCount, total: job.groups.length, reason: "completed" });
  }
  if (autoContinue) {
    activeTabJob = job;
    runBatchGenerationJob(job);
  } else if (!isActive && completedCount < job.groups.length) {
    await notifyBatchRecoveryNudge(job);
  }
  return { ok: true, completedCount, total: job.groups.length };
}

function getBatchFileKey(file) {
  return String(file?.path || file?.name || "");
}

function mutateBatchReviews(operation) {
  const result = batchReviewQueue.then(async () => {
    const stored = (await chrome.storage.local.get(BATCH_REVIEW_STORAGE_KEY))[BATCH_REVIEW_STORAGE_KEY] || {};
    const records = Object.fromEntries(Object.entries(stored).filter(([, record]) => Number(record?.expiresAt) > Date.now()));
    return operation(records);
  });
  batchReviewQueue = result.catch(() => {});
  return result;
}

function publicBatchReview(record) {
  return { ownerId: record.ownerId, batchId: record.batchId, total: record.total, readyCount: record.tabs.filter(Number.isInteger).length,
    readyItems: record.tabs.map((tabId, index) => Number.isInteger(tabId) ? index + 1 : null).filter(Boolean),
    following: record.following !== false, pauseReason: record.pauseReason || null };
}

async function notifyBatchReview(record) {
  if ((await getStoredSession())?.user?.id !== record.ownerId) return;
  await Promise.allSettled([...new Set([record.sourceTabId, record.currentWorkTabId, ...record.tabs])].filter(Number.isInteger).map(tabId =>
    sendTabMessage(tabId, { type: "BATCH_REVIEW_STATE", state: publicBatchReview(record),
      itemIndex: record.tabs.indexOf(tabId) + 1 }),
  ));
}

async function recordBatchWorkStart(job, itemIndex, tabId) {
  let record = await mutateBatchReviews(async records => {
    const old = records[job.batchId];
    const next = old?.ownerId === job.ownerId ? old : {
      batchId: job.batchId, ownerId: job.ownerId, sourceTabId: job.sourceTabId,
      total: job.groups.length, tabs: [], following: true, expiresAt: job.expiresAt,
    };
    next.currentWorkTabId = tabId;
    next.currentItemIndex = itemIndex;
    records[job.batchId] = next;
    const bounded = Object.fromEntries(Object.entries(records).slice(-10));
    await chrome.storage.local.set({ [BATCH_REVIEW_STORAGE_KEY]: bounded });
    return next;
  });
  await notifyBatchReview(record);
  if (!record.following) return;
  const active = await new Promise(resolve => chrome.tabs.query({ active: true, lastFocusedWindow: true }, tabs => resolve(tabs?.[0] || null)));
  if (active?.id !== record.sourceTabId && !record.tabs.includes(active?.id)) {
    record = await mutateBatchReviews(async records => {
      const latest = records[job.batchId];
      if (!latest) return record;
      latest.following = false; latest.pauseReason = "other_tab";
      await chrome.storage.local.set({ [BATCH_REVIEW_STORAGE_KEY]: records });
      return latest;
    });
    await notifyBatchReview(record);
    return;
  }
  const allowed = await sendTabMessage(active.id, { type: "CAN_BATCH_AUTO_FOLLOW", batchId: job.batchId }).catch(() => null);
  if (!allowed?.ok) {
    record = await mutateBatchReviews(async records => {
      const latest = records[job.batchId];
      if (!latest) return record;
      latest.following = false; latest.pauseReason = "editing";
      await chrome.storage.local.set({ [BATCH_REVIEW_STORAGE_KEY]: records });
      return latest;
    });
    await notifyBatchReview(record);
    return;
  }
  // Recheck a concurrently delivered edit/pause before changing focus.
  const latest = await mutateBatchReviews(records => records[job.batchId]);
  const stillActive = await new Promise(resolve => chrome.tabs.query({ active: true, lastFocusedWindow: true }, tabs => resolve(tabs?.[0]?.id)));
  if (latest?.following && stillActive === active.id && (await getStoredSession())?.user?.id === job.ownerId) await activateTab(tabId);
}

async function recordBatchReviewCompletion(job, itemIndex, tabId) {
  const record = await mutateBatchReviews(async records => {
    const next = records[job.batchId];
    if (!next || next.ownerId !== job.ownerId) return null;
    next.tabs[itemIndex - 1] = tabId;
    if (next.currentWorkTabId === tabId) next.currentWorkTabId = null;
    await chrome.storage.local.set({ [BATCH_REVIEW_STORAGE_KEY]: records });
    return next;
  });
  if (record) await notifyBatchReview(record);
}

async function batchReviewAction(message, sender) {
  const accountId = (await getStoredSession())?.user?.id;
  let targetId = null;
  const result = await mutateBatchReviews(async records => {
    const record = records[message.batchId];
    const callerId = sender?.tab?.id;
    if (!record || record.ownerId !== accountId ||
        (callerId !== record.sourceTabId && callerId !== record.currentWorkTabId && !record.tabs.includes(callerId))) {
      return { ok: false, error: "This batch is unavailable for this tab and account." };
    }
    if (message.type === "SET_BATCH_FOLLOW") {
      record.following = message.following === true;
      record.pauseReason = record.following ? null : message.reason === "editing" ? "editing" : "manual";
      await chrome.storage.local.set({ [BATCH_REVIEW_STORAGE_KEY]: records });
      await notifyBatchReview(record);
      if (record.following) targetId = record.currentWorkTabId || record.tabs.filter(Number.isInteger).at(-1) || null;
    } else if (message.type === "FOCUS_BATCH_REVIEW") {
      targetId = message.target === "controller" ? record.sourceTabId : record.tabs[Number(message.itemIndex) - 1];
      if (!Number.isInteger(targetId)) return { ok: false, error: "That listing is still being prepared." };
      record.following = false; record.pauseReason = "manual";
      await chrome.storage.local.set({ [BATCH_REVIEW_STORAGE_KEY]: records });
      await notifyBatchReview(record);
    }
    return { ok: true, state: publicBatchReview(record) };
  });
  if (result.ok && Number.isInteger(targetId)) {
    if (!await getTabIfPresent(targetId)) return { ok: false, error: "This listing tab was closed. Your other listing tabs are still open." };
    await activateTab(targetId);
  }
  return result;
}

async function refreshBatchRecoveryGroups(job) {
  const v2Query = job.inputSource === "computer" ? "" : "&v=2&includeUrls=1&fromOrder=0";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(
      `${API_BASE}/api/phone-upload?sessionId=${encodeURIComponent(job.sessionId)}${v2Query}&t=${Date.now()}`,
      { signal: controller.signal },
    );
    if (!response.ok) throw Object.assign(new Error(response.status === 410
      ? "This saved upload expired. Start a new batch with your original photos."
      : response.status === 404 ? "This saved upload could not be found. Use your original photos to start a new batch."
        : `Could not check saved photos (HTTP ${response.status}). Please try again.`), { expired: response.status === 410 });
    const data = await response.json();
    const files = Array.isArray(data?.files) ? data.files : [];
    const byKey = new Map(files.map((file) => [getBatchFileKey(file), file]));
    const groups = job.groups.map((group) =>
      group.map((oldFile) => byKey.get(getBatchFileKey(oldFile))),
    );
    if (!files.length || groups.some((group) => group.some((file) => !file))) {
      throw new Error("Could not load every saved photo. Please try again before starting a new batch.");
    }
    return groups;
  } catch (error) {
    if (controller.signal.aborted) throw new Error("Checking saved photos timed out. Try again.");
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function getBatchRecovery(sender) {
  const job = await getStoredBatchRecovery();
  const accountId = (await getStoredSession())?.user?.id;
  if (!job || !accountId || job.ownerId !== accountId) return { ok: true, recovery: null,
    savedBatchBlocked: Boolean(job?.ownerId && job.status !== "done") };
  const sourceTabId = sender?.tab?.id;
  if (job.sourceTabId !== sourceTabId) {
    return {
      ok: true,
      recovery: null,
      nudge: ["paused", "expired"].includes(job.status) && getBatchWorkTabIds(job).includes(sourceTabId),
      recoveryStatus: job.discardRequested ? "discard_pending" : job.status,
      ownerId: job.ownerId,
      batchId: job.batchId,
    };
  }
  if (job.status === "running" && activeTabJob?.batchId !== job.batchId) {
    if (!activeTabJob) {
      reattachRunningBatch(job);
    }
  }
  return { ok: true, recovery: publicBatchRecovery(job) };
}

function withBatchRecoveryControl(operation) {
  const result = batchRecoveryControlQueue.then(operation);
  batchRecoveryControlQueue = result.catch(() => {});
  return result;
}

function focusBatchRecovery(sender) {
  return withBatchRecoveryControl(() => focusBatchRecoveryIntent(sender));
}

async function focusBatchRecoveryIntent(sender) {
  const job = await getStoredBatchRecovery();
  const accountId = (await getStoredSession())?.user?.id;
  const callerTabId = sender?.tab?.id;
  if (
    !job ||
    !accountId || job.ownerId !== accountId ||
    !["paused", "expired"].includes(job.status) ||
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
  await waitForBatchTabReady(sourceTab.id);
  await sendTabMessage(sourceTab.id, {
    type: "SHOW_BATCH_RECOVERY",
    recovery: publicBatchRecovery(job),
  });
  return { ok: true, sourceTabId: sourceTab.id, recreated: true };
}

function resumeBatchGeneration(message, sender) {
  return withBatchRecoveryControl(() => resumeBatchGenerationIntent(message, sender));
}

async function resumeBatchGenerationIntent(message, sender) {
  if (activeTabJob) return { ok: false, error: "Another batch is already running." };
  const job = await getStoredBatchRecovery();
  if (!job) return { ok: false, error: "This saved batch is no longer available." };
  if (!job.ownerId || job.ownerId !== (await getStoredSession())?.user?.id) {
    return { ok: false, error: "Sign in with the account that started this batch before continuing." };
  }
  if (message.batchId !== job.batchId || (sender?.tab?.id !== job.sourceTabId && !getBatchWorkTabIds(job).includes(sender?.tab?.id))) {
    return { ok: false, error: "This saved batch is no longer available from this control." };
  }
  if (job.discardRequested) return { ok: false, discardPending: true,
    error: "Finish discarding this batch.", recovery: publicBatchRecovery(job) };
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
    const expired = error.expired === true;
    await persistBatchRecovery(job, {
      status: expired ? "expired" : "paused",
      message: error.message,
      reason: expired ? "recovery_files_expired" : "recovery_check_failed",
    });
    return {
      ok: false,
      expired,
      batchId: job.batchId,
      inputSource: job.inputSource,
      error: error.message,
    };
  }
  await clearBatchRecoveryNudges(job);
  job.sourceTabId = sender?.tab?.id || job.sourceTabId;
  await persistBatchRecovery(job, {
    status: "running",
    message: null,
    reason: null,
    sourceTabId: job.sourceTabId,
    currentWorkTabId: null,
  }, { resume: true });
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

function discardBatchRecovery(message, sender) {
  return withBatchRecoveryControl(() => discardBatchRecoveryIntent(message, sender));
}

async function discardBatchRecoveryIntent(message, sender) {
  const job = await getStoredBatchRecovery();
  if (!job) return { ok: true };
  const accountId = (await getStoredSession())?.user?.id;
  const callerId = sender?.tab?.id;
  if (!accountId || job.ownerId !== accountId || message.batchId !== job.batchId ||
      (callerId !== job.sourceTabId && !getBatchWorkTabIds(job).includes(callerId))) {
    return { ok: false, error: "This batch is unavailable for this tab and account." };
  }
  if (activeTabJob?.kind === "batch") {
    return { ok: false, error: "The batch is still running." };
  }
  if (job.status !== "done") await persistBatchRecovery(job, {
    discardRequested: true, reason: "discard_pending", message: "Discard not finished.",
  });
  if (job.status !== "done" && !await cleanupBatchUploadSession(job, "cancelled")) {
    return incompleteBatchDiscard(job, "Could not finish discarding. Try again.");
  }
  const requestCleared = await clearBatchGenerationRequest(job, { discard: true }).catch(() => false);
  if (!requestCleared) return incompleteBatchDiscard(job, "Could not clear the saved batch. Try again.");
  const removed = await removeBatchRecoveryIfCurrent(job).catch(() => false);
  if (!removed) return incompleteBatchDiscard(job, "Could not clear the saved batch. Try again.");
  await clearBatchRecoveryNudges(job);
  return { ok: true };
}

async function incompleteBatchDiscard(job, error) {
  if (job.status === "done") return { ok: false, error };
  await persistBatchRecovery(job, { reason: "discard_pending", message: error }).catch(() => {});
  await notifyBatchRecoveryNudge(job);
  return { ok: false, error, discardPending: true, recovery: publicBatchRecovery(job) };
}

function mutateBatchGenerationRequest(operation) {
  const result = batchGenerationRequestQueue.then(operation);
  batchGenerationRequestQueue = result.catch(() => {});
  return result;
}

function isCompletedBatchGenerationRequest(pending, job) {
  return pending?.accountId === job.ownerId && pending.batchId === job.batchId &&
    Number(pending.itemIndex) > 0 && Number(pending.itemIndex) <= Number(job.completedCount || 0);
}

function clearBatchGenerationRequest(job, { discard = false } = {}) {
  return mutateBatchGenerationRequest(async () => {
    const pending = (await chrome.storage.local.get(BATCH_GENERATION_REQUEST_KEY))[BATCH_GENERATION_REQUEST_KEY];
    if (!pending) return true;
    if (pending.accountId !== job.ownerId || pending.batchId !== job.batchId) return false;
    if (!discard && !isCompletedBatchGenerationRequest(pending, job)) return false;
    // Retry only this local, idempotent removal. Never replay generation or
    // discard another account's or an unfinished item's prepared request.
    await chrome.storage.local.remove(BATCH_GENERATION_REQUEST_KEY).catch(() =>
      chrome.storage.local.remove(BATCH_GENERATION_REQUEST_KEY));
    return true;
  });
}

async function batchGenerationRequest(message, sender, save = false) {
  return mutateBatchGenerationRequest(async () => {
    const job = await getStoredBatchRecovery();
    const accountId = (await getStoredSession())?.user?.id;
    const itemIndex = Math.floor(Number(message?.itemIndex));
    if (!job || job.status !== "running" || !accountId || job.ownerId !== accountId || message.userId !== accountId ||
        message.batchId !== job.batchId || sender?.tab?.id !== job.currentWorkTabId ||
        itemIndex !== job.currentItemIndex || itemIndex !== Number(job.completedCount || 0) + 1) {
      return { ok: false, error: "This batch item is no longer active for the signed-in account." };
    }
    let pending = (await chrome.storage.local.get(BATCH_GENERATION_REQUEST_KEY))[BATCH_GENERATION_REQUEST_KEY];
    if (pending && (Number(pending.expiresAt) <= Date.now() || isCompletedBatchGenerationRequest(pending, job))) {
      await chrome.storage.local.remove(BATCH_GENERATION_REQUEST_KEY);
      pending = null;
    }
    if (pending && (pending.accountId !== accountId || pending.batchId !== job.batchId || pending.itemIndex !== itemIndex)) {
      return { ok: false, error: "A different saved generation must be reviewed before continuing." };
    }
    if (save) {
      const request = message.request;
      if (!request || typeof request.requestId !== "string" || !request.requestId || request.requestId.length > 128 ||
          typeof request.requestBodyJson !== "string" || new TextEncoder().encode(request.requestBodyJson).length > 4 * 1024 * 1024) {
        return { ok: false, error: "Could not save the generation request safely. Your photos are still saved." };
      }
      let body;
      try { body = JSON.parse(request.requestBodyJson); } catch { return { ok: false, error: "Invalid generation request." }; }
      if (body?.generationMode !== "batch" || !Array.isArray(body.imageUrls) || !body.imageUrls.length || body.imageUrls.length > 20) {
        return { ok: false, error: "Invalid batch generation request." };
      }
      if (pending && (pending.requestId !== request.requestId || pending.requestBodyJson !== request.requestBodyJson) &&
          !(message.replaceDefinitive === true && message.previousRequestId === pending.requestId)) {
        return { ok: false, error: "The saved generation request changed. Your photos are still saved." };
      }
      pending = {
        accountId, batchId: job.batchId, itemIndex,
        requestId: request.requestId, requestBodyJson: request.requestBodyJson,
        payloadFallback: request.payloadFallback || null,
        createdAt: pending?.createdAt || Date.now(), expiresAt: job.expiresAt,
      };
      await chrome.storage.local.set({ [BATCH_GENERATION_REQUEST_KEY]: pending });
      if (job.currentGenerationAttemptId !== body.generationAttemptId) {
        await persistBatchRecovery(job, { currentGenerationAttemptId: body.generationAttemptId });
        if (activeTabJob?.batchId === job.batchId) activeTabJob.currentGenerationAttemptId = body.generationAttemptId;
        void globalThis.AutoListerTelemetry?.track("batch_item_started", { batchId: job.batchId, generationAttemptId: body.generationAttemptId, itemIndex }, "extension_background", false, job.ownerId);
      }
    }
    return { ok: true, request: pending || null };
  }).catch(() => ({ ok: false, error: "Could not save or read this generation safely. Your photos are still saved." }));
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
  if (!session?.user?.id) return;
  try {
    const prepared = globalThis.AutoListerTelemetry?.prepare("auth_success", { reason: authEvent }, "extension_external_auth");
    if (prepared) void globalThis.AutoListerBackgroundTelemetry?.accept(prepared.event, session.user.id, false, true).catch(() => {});
  } catch { /* Telemetry cannot delay or fail authentication. */ }
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
  // The durable telemetry listener owns these acknowledgements. A second reply
  // here would win the race before storage or server acceptance completes.
  if (["AUTOLISTER_TELEMETRY", "AUTOLISTER_TELEMETRY_FLUSH"].includes(message?.type)) return false;
  (async () => {
    switch (message.type) {
      case "CAPTURE_ATTRIBUTION":
        if (!isAttributionBridgeSender(sender)) {
          sendResponse({ ok: false, error: "invalid_sender" });
          break;
        }
        try { sendResponse(await captureWebsiteAttribution(message.attribution)); }
        catch { sendResponse({ ok: false, error: "attribution_storage_unavailable" }); }
        break;

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
                userId: session.user?.id || null,
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
        sendResponse(await resumeBatchGeneration(message, sender));
        break;

      case "STOP_BATCH_GENERATION": {
        const job = activeTabJob?.kind === "batch" ? activeTabJob : await getStoredBatchRecovery();
        const accountId = (await getStoredSession())?.user?.id;
        if (!job || !accountId || job.ownerId !== accountId || job.batchId !== message.batchId ||
            (job.sourceTabId !== sender?.tab?.id && !getBatchWorkTabIds(job).includes(sender?.tab?.id))) {
          sendResponse({ ok: false, error: "This batch is unavailable for this tab and account." });
          break;
        }
        if (job.discardRequested) {
          sendResponse({ ok: false, error: "Finish discarding this batch." });
          break;
        }
        job.stopRequested = true;
        const stoppedWork = job.currentWorkTabId
          ? sendTabMessage(job.currentWorkTabId, { type: "STOP_BATCH_ITEM", batchId: job.batchId }).catch(() => {})
          : Promise.resolve();
        let savedStop = true;
        await persistBatchRecovery(job, { status: "paused", reason: "user_stopped", message: "Batch stopped. Your photos are saved." }).catch(() => { savedStop = false; });
        await stoppedWork;
        if (!savedStop) {
          sendResponse({ ok: false, error: "Could not save the stop. Keep this tab open and try Stop again." });
          break;
        }
        notifyBatchProgress(job, { status: "paused", current: job.completedCount, total: job.groups.length, reason: "user_stopped", message: "Batch stopped. Your photos are saved." });
        sendResponse({ ok: true });
        break;
      }

      case "MARK_BATCH_ITEM_COMPLETE":
        sendResponse(await markBatchItemComplete(message, sender));
        break;

      case "GET_BATCH_GENERATION_REQUEST":
        sendResponse(await batchGenerationRequest(message, sender));
        break;

      case "BATCH_ITEM_WAITING": {
        const job = await getStoredBatchRecovery();
        const accountId = (await getStoredSession())?.user?.id;
        if (!job || job.status !== "running" || activeTabJob?.stopRequested || !accountId || job.ownerId !== accountId || job.batchId !== message.batchId ||
            job.currentWorkTabId !== sender?.tab?.id || job.currentItemIndex !== message.itemIndex ||
            job.currentGenerationAttemptId !== message.generationAttemptId) {
          sendResponse({ ok: false });
          break;
        }
        const saved = await persistBatchRecovery(job, { reason: message.reason, message: message.message }).catch(() => null);
        if (!saved) { sendResponse({ ok: false }); break; }
        notifyBatchProgress(job, { status: "waiting", current: job.completedCount, itemIndex: job.currentItemIndex,
          total: job.groups.length, reason: message.reason, message: message.message });
        sendResponse({ ok: true });
        break;
      }

      case "SAVE_BATCH_GENERATION_REQUEST":
        sendResponse(await batchGenerationRequest(message, sender, true));
        break;

      case "SET_BATCH_FOLLOW":
      case "FOCUS_BATCH_REVIEW":
        sendResponse(await batchReviewAction(message, sender));
        break;

      case "DISCARD_BATCH_RECOVERY":
        sendResponse(await discardBatchRecovery(message, sender));
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
        // Callers own retries. Only metadata and explicit photo downloads opt
        // into a deadline, so unrelated proxy requests retain their contract.
        let metadataTimer;
        let phoneMetadata = false;
        let photoDownload = false;
        try {
          const url = new URL(message.url);
          phoneMetadata = url.origin === API_BASE && url.pathname === "/api/phone-upload" &&
            ["prepare", "complete"].includes(url.searchParams.get("action")) && message.options?.method === "POST";
          photoDownload = message.isBlob === true && message.options?.method === "GET";
          let fetchOptions = message.options;
          if ((phoneMetadata || photoDownload) && Number.isFinite(message.timeoutMs) && message.timeoutMs > 0) {
            const controller = new AbortController();
            metadataTimer = setTimeout(() => controller.abort(), Math.min(phoneMetadata ? 10000 : 30000, message.timeoutMs));
            fetchOptions = { ...fetchOptions, signal: controller.signal };
          }
          const response = await fetch(message.url, fetchOptions);
          const metadataHeaders = phoneMetadata || photoDownload ? { retryAfter: response.headers.get("retry-after") } : {};

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
              ...metadataHeaders,
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
          sendResponse({ ok: true, status: response.status, data, ...metadataHeaders });
        } catch (err) {
          console.error("[Background] Fetch exception:", err);
          sendResponse({ ok: false, error: err.toString(), ...((phoneMetadata || photoDownload) && err.name === "AbortError" ? { code: "PHONE_REQUEST_TIMEOUT", retryable: true } : {}) });
        } finally {
          if (metadataTimer) clearTimeout(metadataTimer);
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
