importScripts("lib/supabase.js");

const SUPABASE_URL = "https://jqloiovdwjaornnfvmyu.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpxbG9pb3Zkd2phb3JubmZ2bXl1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODIwODMzMiwiZXhwIjoyMDYzNzg0MzMyfQ.Urz77RMqsJs8gJmA3yia_HhxaaeDrHURrF-fPeExRNQ";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function getStoredSession() {
  return new Promise((resolve) => {
    chrome.storage.local.get(["supabaseSession"], (result) => {
      resolve(result.supabaseSession || null);
    });
  });
}

async function setStoredSession(session) {
  chrome.storage.local.set({ supabaseSession: session });
}

setInterval(async () => {
  const session = await getStoredSession();
  if (!session?.refresh_token) return;
  await supabaseClient.auth.setSession({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  });
  const { data, error } = await supabaseClient.auth.refreshSession({
    refresh_token: session.refresh_token,
  });
  if (data?.session) setStoredSession(data.session);
  // If refresh fails, you may want to sign out
}, 5 * 60 * 1000);

// Restore session to Supabase client on startup
(async () => {
  const session = await getStoredSession();
  if (session) {
    await supabaseClient.auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    });
  }
})();

supabaseClient.auth.onAuthStateChange((_event, session) => {
  if (session) setStoredSession(session);
  else chrome.storage.local.remove(["supabaseSession"]);
});

async function fetchUserAndProfile() {
  const session = await getStoredSession();
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

  console.log("Fetched user + profile:", userData.user, profile);
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === "GET_USER_PROFILE") {
    getStoredSession().then(async (session) => {
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

  if (msg.type === "AUTH_UPDATED") {
    fetchUserAndProfile(); // 🔁 refetch both
  }

  if (msg.type === "SIGN_OUT") {
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
