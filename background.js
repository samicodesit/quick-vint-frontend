// background.js
const SUPABASE_URL = "https://jqloiovdwjaornnfvmyu.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpxbG9pb3Zkd2phb3JubmZ2bXl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgyMDgzMzIsImV4cCI6MjA2Mzc4NDMzMn0.iFtkUorY1UqK8zamnwgjB-yhsXe0bJAA8YFm22bzc3A";
// const API_BASE_URL = "https://quick-vint.vercel.app"; // Not directly used here but good to have for context

let supabase;
let currentUser = null;
let userProfile = null;

try {
  importScripts("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2");
  if (typeof supabaseJs !== "undefined" && SUPABASE_URL && SUPABASE_ANON_KEY) {
    supabase = supabaseJs.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      // For service workers, it's good to ensure session persistence is robust.
      // Supabase JS client for extensions attempts to use chrome.storage.local.
    });
    console.log("Background: Supabase client initialized from CDN.");
  } else {
    throw new Error(
      "Supabase client (supabaseJs) could not be initialized in background. Check CDN URL or config."
    );
  }
} catch (e) {
  console.error(
    "Background: Failed to import or initialize Supabase client:",
    e
  );
}

async function fetchUserProfile(userId) {
  if (!userId || !supabase) {
    userProfile = null;
    return null;
  }
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("subscription_status, api_calls_this_month, last_api_call_reset")
      .eq("id", userId)
      .single();
    if (error) {
      // PGRST116: Row not found (profile might not be created yet if trigger is slow/failed)
      if (error.code === "PGRST116") {
        console.warn(
          `Background: Profile not found for user ${userId}. It might be created shortly.`
        );
        userProfile = {
          id: userId,
          subscription_status: "free",
          api_calls_this_month: 0,
        }; // Temporary default
      } else {
        throw error;
      }
    } else {
      userProfile = data;
    }
    return userProfile;
  } catch (error) {
    console.error("Background: Error fetching user profile:", error);
    userProfile = null; // Clear stale profile on error
    return null;
  }
}

async function broadcastAuthState(isAuthenticated) {
  try {
    const tabs = await chrome.tabs.query({
      url: [
        "*://*.vinted.com/*",
        "*://*.vinted.de/*",
        "*://*.vinted.fr/*",
        "*://*.vinted.nl/*",
        "*://*.vinted.co.uk/*",
        "*://*.vinted.es/*",
        "*://*.vinted.it/*",
        "*://*.vinted.pl/*",
        "*://*.vinted.lt/*",
      ],
    });
    tabs.forEach((tab) => {
      if (tab.id) {
        chrome.tabs
          .sendMessage(tab.id, {
            type: "AUTH_STATE_CHANGED",
            authenticated: isAuthenticated,
          })
          .catch((error) => {
            /* console.log(`Could not send auth state to tab ${tab.id}: ${error.message}`); */
          });
      }
    });
  } catch (e) {
    console.warn("Error querying tabs to broadcast auth state:", e);
  }
}

if (supabase) {
  supabase.auth.onAuthStateChange(async (event, session) => {
    console.log("Background Auth Event:", event, session);
    currentUser = session?.user || null;
    if (currentUser) {
      await fetchUserProfile(currentUser.id);
    } else {
      userProfile = null;
    }
    await broadcastAuthState(!!currentUser);
  });

  // Initial session check when service worker starts or is woken up
  supabase.auth
    .getSession()
    .then(async ({ data: { session } }) => {
      currentUser = session?.user || null;
      if (currentUser) {
        await fetchUserProfile(currentUser.id);
      }
      console.log(
        "Background script initialized, current user:",
        currentUser ? currentUser.email : "None"
      );
      await broadcastAuthState(!!currentUser); // Notify content scripts on startup
    })
    .catch((error) =>
      console.error("Background: Initial getSession error", error)
    );
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (!supabase) {
    sendResponse({ error: "Supabase not available in background." });
    return true;
  }

  if (request.type === "GET_AUTH_TOKEN") {
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        sendResponse({ token: session?.access_token || null });
      })
      .catch((error) => {
        console.error("Background: Error getting session for token:", error);
        sendResponse({ token: null, error: error.message });
      });
    return true;
  }

  if (request.type === "GET_SESSION") {
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        sendResponse(session);
      })
      .catch((error) => {
        console.error("Background: Error in GET_SESSION:", error);
        sendResponse(null);
      });
    return true;
  }

  if (request.type === "GET_USER_PROFILE") {
    if (currentUser && userProfile) {
      // Use cached profile if available and user is current
      if (userProfile.id === currentUser.id) {
        // Ensure cached profile matches current user
        sendResponse(userProfile);
        return false; // Synchronous response from cache
      }
    }
    // If no cached profile, or user mismatch, fetch fresh
    if (currentUser) {
      fetchUserProfile(currentUser.id)
        .then((profile) => {
          sendResponse(profile);
        })
        .catch((e) => {
          console.error("Background: Error in GET_USER_PROFILE fetch:", e);
          sendResponse(null);
        });
    } else {
      sendResponse(null); // No user, no profile
    }
    return true; // Asynchronous as fetchUserProfile is async
  }
  return false; // Default for unhandled messages
});
