// background.js
const SUPABASE_URL = "https://jqloiovdwjaornnfvmyu.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpxbG9pb3Zkd2phb3JubmZ2bXl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgyMDgzMzIsImV4cCI6MjA2Mzc4NDMzMn0.iFtkUorY1UqK8zamnwgjB-yhsXe0bJAA8YFm22bzc3A";

let supabaseClientInstance; // Changed from 'supabase' to avoid global conflicts
let currentUser = null;
let userProfile = null;

console.log("Background: Script started.");

try {
  importScripts("./lib/supabase.js"); // Path relative to background.js (root of extension)
  console.log("Background: importScripts('./lib/supabase.js') executed.");

  let supabaseClientFactory;

  if (
    typeof supabase !== "undefined" &&
    typeof supabase.createClient === "function"
  ) {
    supabaseClientFactory = supabase;
  } else if (
    typeof supabaseJs !== "undefined" &&
    typeof supabaseJs.createClient === "function"
  ) {
    supabaseClientFactory = supabaseJs;
  } else if (
    typeof self !== "undefined" &&
    typeof self.supabase !== "undefined" &&
    typeof self.supabase.createClient === "function"
  ) {
    supabaseClientFactory = self.supabase;
  } else if (
    typeof self !== "undefined" &&
    typeof self.supabaseJs !== "undefined" &&
    typeof self.supabaseJs.createClient === "function"
  ) {
    supabaseClientFactory = self.supabaseJs;
  }

  if (
    supabaseClientFactory &&
    typeof supabaseClientFactory.createClient === "function"
  ) {
    if (SUPABASE_URL && SUPABASE_ANON_KEY) {
      supabaseClientInstance = supabaseClientFactory.createClient(
        SUPABASE_URL,
        SUPABASE_ANON_KEY
      );
    } else {
      throw new Error("Supabase URL or Anon Key missing.");
    }
  } else {
    throw new Error(
      "Supabase client (supabase or supabaseJs) global object not found or invalid after import. Ensure './lib/supabase.js' is the correct UMD build."
    );
  }
} catch (e) {
  console.error(
    "Background: CRITICAL - Failed to import or initialize Supabase client."
  );
}

async function fetchUserProfile(userId) {
  if (!userId || !supabaseClientInstance) {
    userProfile = null;
    return null;
  }
  try {
    const { data, error } = await supabaseClientInstance // Use instance
      .from("profiles")
      .select("subscription_status, api_calls_this_month, last_api_call_reset")
      .eq("id", userId)
      .single();
    if (error) {
      if (error.code === "PGRST116") {
        // Row not found
        console.warn(
          `Background: Profile not found for user ${userId}. It might be created shortly or trigger failed.`
        );
        // Return a default/temporary profile structure if needed, or handle as error
        userProfile = {
          id: userId,
          subscription_status: "free",
          api_calls_this_month: 0,
          last_api_call_reset: null,
        };
      } else {
        throw error;
      }
    } else {
      userProfile = data;
    }
    return userProfile;
  } catch (error) {
    console.error("Background: Error fetching user profile:", error.message);
    userProfile = null;
    return null;
  }
}

async function broadcastAuthState(isAuthenticated) {
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
        "*://*.vinted.com/*",
      ],
    });
    tabs.forEach((tab) => {
      if (tab.id) {
        // Ensure tab.id is valid
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
    console.warn(
      "Error querying/messaging tabs to broadcast auth state:",
      e.message
    );
  }
}

if (supabaseClientInstance) {
  supabaseClientInstance.auth.onAuthStateChange(async (event, session) => {
    console.log("Background Auth Event:", event, session);
    currentUser = session?.user || null;
    if (currentUser) {
      await fetchUserProfile(currentUser.id);
    } else {
      userProfile = null; // Clear profile when signed out
    }
    await broadcastAuthState(!!currentUser);
  });

  supabaseClientInstance.auth
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
      await broadcastAuthState(!!currentUser);
    })
    .catch((error) =>
      console.error("Background: Initial getSession error", error.message)
    );

  console.log("Background: Supabase event listeners attached.");
} else {
  console.error(
    "Background: Supabase client instance is not available. Auth event listeners not attached. API calls will fail."
  );
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (!supabaseClientInstance) {
    console.warn(
      "Background: Received message but Supabase is not initialized:",
      request.type
    );
    sendResponse({ error: "Supabase not available in background." });
    return true;
  }

  if (request.type === "GET_AUTH_TOKEN") {
    supabaseClientInstance.auth
      .getSession()
      .then(({ data: { session } }) => {
        sendResponse({ token: session?.access_token || null });
      })
      .catch((error) => {
        console.error(
          "Background: Error getting session for token:",
          error.message
        );
        sendResponse({ token: null, error: error.message });
      });
    return true; // Indicates response will be sent asynchronously
  }

  if (request.type === "GET_SESSION") {
    supabaseClientInstance.auth
      .getSession()
      .then(({ data: { session } }) => {
        sendResponse(session); // Send the whole session object
      })
      .catch((error) => {
        console.error("Background: Error in GET_SESSION:", error.message);
        sendResponse(null);
      });
    return true;
  }

  if (request.type === "GET_USER_PROFILE") {
    if (currentUser && userProfile && userProfile.id === currentUser.id) {
      // Check if cached profile belongs to current user
      sendResponse(userProfile);
      // return false; // No, still need to return true if any path MIGHT be async.
      // Or, structure to only return true if actually async.
      // For simplicity now, always returning true if a promise is involved.
    } else if (currentUser) {
      fetchUserProfile(currentUser.id)
        .then((profile) => {
          sendResponse(profile);
        })
        .catch((e) => {
          console.error(
            "Background: Error in GET_USER_PROFILE fetch:",
            e.message
          );
          sendResponse(null);
        });
    } else {
      sendResponse(null); // No user, no profile
    }
    return true; // As fetchUserProfile is async
  }

  // Default for unhandled message types
  // console.log("Background: Unhandled message type received:", request.type);
  return false;
});
