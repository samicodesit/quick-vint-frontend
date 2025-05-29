// popup.js
const SUPABASE_URL = "https://jqloiovdwjaornnfvmyu.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpxbG9pb3Zkd2phb3JubmZ2bXl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgyMDgzMzIsImV4cCI6MjA2Mzc4NDMzMn0.iFtkUorY1UqK8zamnwgjB-yhsXe0bJAA8YFm22bzc3A";
const API_BASE_URL = "https://quick-vint.vercel.app";

let supabaseClient; // This will be our Supabase client instance

// Attempt to initialize the Supabase client
// The UMD script loaded via <script src="lib/supabase.js"> in popup.html
// should make 'supabase' available globally (on the window object).
if (
  typeof supabase !== "undefined" &&
  typeof supabase.createClient === "function" &&
  SUPABASE_URL &&
  SUPABASE_ANON_KEY
) {
  supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  console.log(
    "Popup: Supabase client initialized using global 'supabase' object."
  );
} else if (
  typeof supabaseJs !== "undefined" &&
  typeof supabaseJs.createClient === "function" &&
  SUPABASE_URL &&
  SUPABASE_ANON_KEY
) {
  // Fallback for older or different UMD patterns that might expose supabaseJs
  supabaseClient = supabaseJs.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  console.log(
    "Popup: Supabase client initialized using global 'supabaseJs' object."
  );
} else {
  console.error(
    "Popup: Supabase client factory (global 'supabase' or 'supabaseJs') not found or configuration missing. Ensure lib/supabase.js is loaded before popup.js in popup.html."
  );
  const body = document.body;
  if (body) {
    // Ensure body exists before trying to modify it
    body.innerHTML =
      '<p style="color:red; padding:10px;">Error: Extension cannot load. Supabase configuration is missing or incorrect. Check console.</p>';
  }
}

const signedOutView = document.getElementById("signedOutView");
const signedInView = document.getElementById("signedInView");
const emailInput = document.getElementById("emailInput");
const sendMagicLinkBtn = document.getElementById("sendMagicLinkBtn");
const userEmailSpan = document.getElementById("userEmail");
const subscriptionStatusSpan = document.getElementById("subscriptionStatus");
const signOutBtn = document.getElementById("signOutBtn");
const messagesDiv = document.getElementById("messages");

function showMessage(message, type = "info") {
  if (!messagesDiv) return;
  messagesDiv.textContent = message;
  messagesDiv.className = type; // Resets other classes like 'hidden' before adding type
  messagesDiv.classList.remove("hidden");
  if (type === "info" || type === "success") {
    setTimeout(() => {
      if (messagesDiv.textContent === message)
        messagesDiv.classList.add("hidden");
    }, 4000);
  }
}

function clearMessage() {
  if (!messagesDiv) return;
  messagesDiv.textContent = "";
  messagesDiv.classList.add("hidden");
  messagesDiv.className = "hidden"; // Ensure all style classes are removed too
}

function setLoadingState(buttonElement, isLoading, originalText = "Submit") {
  if (!buttonElement) return;
  buttonElement.disabled = isLoading;
  buttonElement.textContent = isLoading ? "Processing..." : originalText;
}

async function fetchAndDisplayUserProfile(user) {
  if (!user || !supabaseClient) {
    // Check supabaseClient
    if (subscriptionStatusSpan)
      subscriptionStatusSpan.textContent = "Status: Error fetching profile.";
    return;
  }
  if (subscriptionStatusSpan)
    subscriptionStatusSpan.textContent = "Status: Loading...";

  try {
    // Ask background script for the profile, as it might have a fresher cache or direct access
    const profile = await chrome.runtime.sendMessage({
      type: "GET_USER_PROFILE",
    });
    if (profile) {
      const statusText = `Status: ${
        profile.subscription_status || "free"
      } | Calls: ${
        profile.api_calls_this_month !== undefined
          ? profile.api_calls_this_month
          : "N/A"
      }`;
      if (subscriptionStatusSpan)
        subscriptionStatusSpan.textContent = statusText;
    } else {
      // This case might happen if background is still starting or profile not found
      console.warn("Popup: Profile not received from background script.");
      if (subscriptionStatusSpan)
        subscriptionStatusSpan.textContent = `Status: 'free' (default) | Calls: 0 (local estimate)`;
    }
  } catch (error) {
    console.warn(
      "Popup: Error fetching profile via background:",
      error.message
    );
    if (subscriptionStatusSpan)
      subscriptionStatusSpan.textContent = "Status: Could not load details.";
    if (
      error.message &&
      error.message.includes("Could not establish connection")
    ) {
      if (subscriptionStatusSpan)
        subscriptionStatusSpan.textContent =
          "Status: Loading... (connecting to background)";
    }
  }
}

async function updateUIForAuthState(user) {
  clearMessage();
  if (!signedOutView || !signedInView || !userEmailSpan) return;

  if (user) {
    signedOutView.classList.add("hidden");
    signedInView.classList.remove("hidden");
    userEmailSpan.textContent = user.email;
    await fetchAndDisplayUserProfile(user);
  } else {
    signedInView.classList.add("hidden");
    signedOutView.classList.remove("hidden");
    userEmailSpan.textContent = "";
    if (subscriptionStatusSpan)
      subscriptionStatusSpan.textContent = "Status: Not signed in";
  }
}

async function handleSendMagicLink() {
  if (!supabaseClient || !emailInput || !sendMagicLinkBtn) {
    // Check supabaseClient
    showMessage("UI elements missing or Supabase not initialized.", "error");
    return;
  }
  const email = emailInput.value.trim();
  if (!email || !email.includes("@")) {
    showMessage("Please enter a valid email address.", "error");
    return;
  }
  setLoadingState(sendMagicLinkBtn, true, "Send Magic Link");
  clearMessage();

  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/magic-link`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const result = await response.json();
    if (response.ok) {
      showMessage(
        result.message || "Magic link sent! Check your email.",
        "success"
      );
      emailInput.value = "";
    } else {
      showMessage(result.error || "Failed to send magic link.", "error");
    }
  } catch (error) {
    console.error("Send magic link error:", error);
    showMessage(
      error.message || "Network error. Could not send magic link.",
      "error"
    );
  } finally {
    setLoadingState(sendMagicLinkBtn, false, "Send Magic Link");
  }
}

async function handleSignOut() {
  if (!supabaseClient || !signOutBtn) {
    // Check supabaseClient
    showMessage("Supabase not initialized or button missing.", "error");
    return;
  }
  setLoadingState(signOutBtn, true, "Sign Out");
  clearMessage();
  try {
    const { error } = await supabaseClient.auth.signOut(); // Use supabaseClient
    if (error) throw error;
    showMessage("Signed out successfully.", "success"); // Local feedback
    // onAuthStateChange will update UI and background will notify content scripts
  } catch (error) {
    console.error("Sign out error:", error);
    showMessage(error.message || "Failed to sign out.", "error");
  } finally {
    setLoadingState(signOutBtn, false, "Sign Out");
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  if (!supabaseClient) {
    // Check supabaseClient
    // The error message is already shown by the initialization block
    if (signedOutView) signedOutView.classList.add("hidden");
    if (signedInView) signedInView.classList.add("hidden");
    // showMessage already called by init block if it failed.
    return;
  }

  if (sendMagicLinkBtn)
    sendMagicLinkBtn.addEventListener("click", handleSendMagicLink);
  if (signOutBtn) signOutBtn.addEventListener("click", handleSignOut);

  try {
    // Prefer getting session state from background script as it's the source of truth
    const sessionFromBg = await chrome.runtime.sendMessage({
      type: "GET_SESSION",
    });
    updateUIForAuthState(sessionFromBg?.user || null);
  } catch (e) {
    console.warn(
      "Popup: Could not get initial session from background. May not be ready or extension reloaded.",
      e.message
    );
    // Fallback to checking local Supabase state if background communication fails
    const {
      data: { session: localSession },
    } = await supabaseClient.auth.getSession();
    updateUIForAuthState(localSession?.user || null);
  }

  // Listen for auth state changes to keep popup UI in sync
  supabaseClient.auth.onAuthStateChange(async (_event, session) => {
    // Use supabaseClient
    console.log("Popup Auth event:", _event, session); // For debugging
    updateUIForAuthState(session?.user || null);
  });
});
