importScripts("lib/supabase.js");

const SUPABASE_URL = "https://jqloiovdwjaornnfvmyu.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpxbG9pb3Zkd2phb3JubmZ2bXl1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODIwODMzMiwiZXhwIjoyMDYzNzg0MzMyfQ.Urz77RMqsJs8gJmA3yia_HhxaaeDrHURrF-fPeExRNQ";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Track refresh state to prevent concurrent refresh attempts
let isRefreshing = false;
let refreshTimeout = null;

async function getStoredSession() {
  return new Promise((resolve) => {
    chrome.storage.local.get(["supabaseSession"], (result) => {
      resolve(result.supabaseSession || null);
    });
  });
}

async function setStoredSession(session) {
  chrome.storage.local.set({ supabaseSession: session });

  // Schedule the next refresh if we have a valid session
  if (session?.expires_at) {
    scheduleTokenRefresh(session);
  }
}

// Helper function to check if token is close to expiring (within 5 minutes)
function isTokenNearExpiry(session) {
  if (!session?.expires_at) return false;
  const expiresAt = new Date(session.expires_at * 1000);
  const now = new Date();
  const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);
  return expiresAt <= fiveMinutesFromNow;
}

// Schedule token refresh based on expiration time
function scheduleTokenRefresh(session) {
  // Clear any existing timeout
  if (refreshTimeout) {
    clearTimeout(refreshTimeout);
    refreshTimeout = null;
  }

  if (!session?.expires_at) return;

  const expiresAt = new Date(session.expires_at * 1000);
  const now = new Date();
  // Refresh 5 minutes before expiration, but at least 1 minute from now
  const refreshTime = Math.max(
    expiresAt.getTime() - now.getTime() - 5 * 60 * 1000,
    60 * 1000
  );

  if (refreshTime > 0) {
    refreshTimeout = setTimeout(() => {
      refreshTokenWithRetry();
    }, refreshTime);
  }
}

// Refresh token with retry logic and proper error handling
async function refreshTokenWithRetry(maxRetries = 3) {
  if (isRefreshing) {
    // console.debug("Token refresh already in progress, skipping");
    return;
  }

  isRefreshing = true;

  try {
    const session = await getStoredSession();
    if (!session?.refresh_token) {
      // console.debug("No refresh token available");
      return;
    }

    // Set current session before refreshing
    await supabaseClient.auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    });

    let lastError;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const { data, error } = await supabaseClient.auth.refreshSession({
          refresh_token: session.refresh_token,
        });

        if (error) throw error;

        if (data?.session) {
          await setStoredSession(data.session);
          // console.debug(`Token refreshed successfully on attempt ${attempt}`);
          return data.session;
        }
      } catch (error) {
        lastError = error;
        console.warn(`Token refresh attempt ${attempt} failed:`, error.message);

        // Wait before retrying (exponential backoff)
        if (attempt < maxRetries) {
          await new Promise((resolve) =>
            setTimeout(resolve, Math.pow(2, attempt) * 1000)
          );
        }
      }
    }

    // All retries failed
    console.error("Token refresh failed after all retries:", lastError);

    // Only sign out if it's an auth error, not a network error
    if (
      lastError?.message?.includes("Invalid Refresh Token") ||
      lastError?.message?.includes("refresh_token_not_found")
    ) {
      // console.debug("Invalid refresh token, signing out user");
      await supabaseClient.auth.signOut();
      chrome.storage.local.remove(["supabaseSession", "userProfile"]);
    }
  } catch (error) {
    console.error("Unexpected error during token refresh:", error);
  } finally {
    isRefreshing = false;
  }
}

// Ensure token is valid before making authenticated requests
async function ensureValidToken() {
  const session = await getStoredSession();
  if (!session) return null;

  if (isTokenNearExpiry(session)) {
    // console.debug("Token near expiry, refreshing before request");
    const newSession = await refreshTokenWithRetry();
    return newSession || session;
  }

  return session;
}

// Restore session to Supabase client on startup
(async () => {
  const session = await getStoredSession();
  if (session) {
    await supabaseClient.auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    });

    // Check if we need to refresh immediately
    if (isTokenNearExpiry(session)) {
      // console.debug("Token near expiry on startup, refreshing");
      await refreshTokenWithRetry();
    } else {
      // Schedule refresh for later
      scheduleTokenRefresh(session);
    }
  }
})();

supabaseClient.auth.onAuthStateChange((_event, session) => {
  if (session) {
    setStoredSession(session);
  } else {
    // Clear refresh timeout on sign out
    if (refreshTimeout) {
      clearTimeout(refreshTimeout);
      refreshTimeout = null;
    }
    chrome.storage.local.remove(["supabaseSession"]);
  }
});

async function fetchUserAndProfile() {
  const session = await ensureValidToken();
  if (!session?.access_token) return;

  const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    },
  });

  const { data: userData, error: userError } = await _supabase.auth.getUser(
    session.access_token
  );
  if (userError || !userData?.user) {
    console.error("User fetch failed:", userError);
    return;
  }

  const { data: profile, error: profileError } = await _supabase
    .from("profiles")
    .select(
      "subscription_status, api_calls_this_month, subscription_tier, current_period_end, overage_used_today"
    )
    .eq("id", userData.user.id)
    .single();

  if (profileError) {
    console.error("Profile fetch failed:", profileError);
    return;
  }

  // ✅ optionally store or broadcast to popup
  chrome.storage.local.set({ userProfile: profile });

  chrome.runtime.sendMessage({
    type: "PROFILE_CHANGED",
    profile,
  });

  // console.debug("Fetched user + profile:", userData.user, profile);
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === "GET_USER_PROFILE") {
    ensureValidToken().then(async (session) => {
      if (!session?.access_token) return sendResponse(null);

      const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        },
      });

      const { data: userData } = await _supabase.auth.getUser(
        session.access_token
      );

      const { data: profile } = await _supabase
        .from("profiles")
        .select(
          "subscription_status, api_calls_this_month, subscription_tier, current_period_end, overage_used_today"
        )
        .eq("id", userData?.user?.id)
        .single();

      sendResponse({ user: userData.user, profile });
    });

    return true; // keep message channel open for async sendResponse
  }

  // Return a valid access token (refreshing if necessary)
  if (msg.type === "GET_ACCESS_TOKEN") {
    ensureValidToken()
      .then((session) => {
        if (!session?.access_token) return sendResponse({ access_token: null });
        return sendResponse({
          access_token: session.access_token,
          expires_at: session.expires_at,
        });
      })
      .catch((err) => {
        console.error("GET_ACCESS_TOKEN error:", err);
        return sendResponse({ access_token: null });
      });

    return true; // keep channel open for async response
  }

  // New: return the active 'day' counter for the signed-in user
  if (msg.type === "GET_USER_DAY_COUNT") {
    ensureValidToken().then(async (session) => {
      if (!session?.access_token) return sendResponse(null);

      const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        },
      });

      const { data: userData, error: userError } = await _supabase.auth.getUser(
        session.access_token
      );
      if (userError || !userData?.user) {
        console.error("User fetch failed for day count:", userError);
        return sendResponse({ daily: 0 });
      }

      // Fetch profile to see if the user is business (exempt)
      const { data: profile } = await _supabase
        .from("profiles")
        .select("subscription_tier")
        .eq("id", userData.user.id)
        .single();

      if (profile?.subscription_tier === "business") {
        // Business tier is exempt from daily limits; return null to indicate N/A
        return sendResponse({ daily: null });
      }

      const nowIso = new Date().toISOString();

      // Query the rate_limits table for the active day window for this user.
      // Keep it simple: pick the single non-expired day row with highest count if duplicates exist.
      const { data: rows, error: rlError } = await _supabase
        .from("rate_limits")
        .select("count")
        .eq("user_id", userData.user.id)
        .eq("window_type", "day")
        .gte("expires_at", nowIso)
        .order("count", { ascending: false })
        .limit(1);

      if (rlError) {
        console.error("Error fetching day rate limit:", rlError);
        return sendResponse({ daily: 0 });
      }

      const dayRow = Array.isArray(rows) && rows.length ? rows[0] : null;
      const daily = dayRow?.count || 0;
      sendResponse({ daily });
    });

    return true; // keep channel open
  }

  if (msg.type === "AUTH_UPDATED") {
    fetchUserAndProfile(); // 🔁 refetch both
  }

  if (msg.type === "SIGN_OUT") {
    // Clear refresh timeout before signing out
    if (refreshTimeout) {
      clearTimeout(refreshTimeout);
      refreshTimeout = null;
    }

    supabaseClient.auth
      .signOut()
      .then(() => {
        chrome.storage.local.remove(["supabaseSession", "supabaseProfile"]);
        sendResponse({ ok: true });
      })
      .catch((err) => sendResponse({ error: err.message }));
    return true;
  }
});

// Clean up refresh timeout when extension shuts down
chrome.runtime.onSuspend.addListener(() => {
  if (refreshTimeout) {
    clearTimeout(refreshTimeout);
    refreshTimeout = null;
  }
});
