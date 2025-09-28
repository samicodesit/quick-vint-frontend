// --- IMPORTS & INITIALIZATION ---
importScripts("lib/supabase.js");

// --- CONSTANTS ---
const SUPABASE_URL = "https://jqloiovdwjaornnfvmyu.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpxbG9pb3Zkd2phb3JubmZ2bXl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgyMDgzMzIsImV4cCI6MjA2Mzc4NDMzMn0.iFtkUorY1UqK8zamnwgjB-yhsXe0bJAA8YFm22bzc3A";
const TOKEN_REFRESH_MARGIN_MS = 5 * 60 * 1000; // 5 minutes
const MIN_REFRESH_DELAY_MS = 60 * 1000; // 1 minute

// --- STATE ---
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
let isRefreshingToken = false;
let tokenRefreshTimeout = null;

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
  await chrome.storage.local.set({ supabaseSession: session });
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
  if (isRefreshingToken) return;
  isRefreshingToken = true;

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
        await handleSignOut();
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
  } finally {
    isRefreshingToken = false;
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
        "subscription_status, api_calls_this_month, subscription_tier, current_period_end"
      )
      .eq("id", user.id)
      .single();

    if (profileError) throw profileError;

    await chrome.storage.local.set({ userProfile: profile });
  } catch (error) {
    console.error("Failed to update and store user profile:", error);
  }
}

/**
 * Fetches the user's daily API call count.
 * @returns {Promise<{daily: number|null}>} Null for business tier, otherwise the count.
 */
async function fetchUserDayCount() {
  const session = await ensureValidToken();
  if (!session?.access_token) return { daily: 0 };

  try {
    const authClient = createAuthenticatedClient(session.access_token);
    const {
      data: { user },
      error: userError,
    } = await authClient.auth.getUser();
    if (userError || !user) throw userError || new Error("User not found.");

    const { data: profile, error: profileError } = await authClient
      .from("profiles")
      .select("subscription_tier")
      .eq("id", user.id)
      .single();
    if (profileError) throw profileError;

    if (profile?.subscription_tier === "business") return { daily: null };

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

    return { daily: limit?.count || 0 };
  } catch (error) {
    console.error("Failed to fetch user day count:", error);
    return { daily: 0 };
  }
}

/**
 * Signs the user out and clears all local session data.
 * @returns {Promise<{ok: boolean, error?: string}>}
 */
async function handleSignOut() {
  if (tokenRefreshTimeout) clearTimeout(tokenRefreshTimeout);
  try {
    const { error } = await supabaseClient.auth.signOut();
    if (error) throw error;
    return { ok: true };
  } catch (err) {
    return { error: err.message };
  }
}

// --- EVENT LISTENERS ---

/**
 * Main message handler for requests from other parts of the extension.
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    switch (message.type) {
      case "GET_USER_PROFILE":
        const { supabaseSession, userProfile } = await chrome.storage.local.get(
          ["supabaseSession", "userProfile"]
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
            : null
        );
        break;

      case "GET_USER_DAY_COUNT":
        const dayCount = await fetchUserDayCount();
        sendResponse(dayCount);
        break;

      // THIS IS THE FIX: Restore the handler for the signal from the callback page.
      case "AUTH_UPDATED":
        await updateAndStoreUserProfile();
        sendResponse({ ok: true });
        break;

      case "SIGN_OUT":
        const result = await handleSignOut();
        sendResponse(result);
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
        await chrome.storage.local.remove(["supabaseSession", "userProfile"]);
      } else if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        await setStoredSession(session);
        await updateAndStoreUserProfile();
      } else if (session) {
        await setStoredSession(session);
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
