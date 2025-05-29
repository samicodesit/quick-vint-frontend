importScripts("lib/supabase.js");

const SUPABASE_URL = "https://jqloiovdwjaornnfvmyu.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpxbG9pb3Zkd2phb3JubmZ2bXl1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODIwODMzMiwiZXhwIjoyMDYzNzg0MzMyfQ.Urz77RMqsJs8gJmA3yia_HhxaaeDrHURrF-fPeExRNQ";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

supabaseClient.auth.onAuthStateChange(async (_event, session) => {
  if (session) {
    // fetch profile (so popup can read it)
    const { data: profile, error } = await supabaseClient
      .from("profiles")
      .select("subscription_status, api_calls_this_month")
      .eq("id", session.user.id)
      .single();
    // store both session + profile
    chrome.storage.local.set({
      supabaseSession: session,
      supabaseProfile: error ? null : profile,
    });
  } else {
    chrome.storage.local.remove(["supabaseSession", "supabaseProfile"]);
  }
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
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
