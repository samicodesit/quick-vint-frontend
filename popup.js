// popup.js
const SUPABASE_URL = "https://jqloiovdwjaornnfvmyu.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpxbG9pb3Zkd2phb3JubmZ2bXl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgyMDgzMzIsImV4cCI6MjA2Mzc4NDMzMn0.iFtkUorY1UqK8zamnwgjB-yhsXe0bJAA8YFm22bzc3A";
const API_BASE_URL = "https://quick-vint.vercel.app";

let supabase;
if (typeof supabaseJs !== "undefined" && SUPABASE_URL && SUPABASE_ANON_KEY) {
  supabase = supabaseJs.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} else {
  console.error(
    "Supabase client (supabaseJs) not found or configuration missing."
  );
  const body = document.body;
  if (body) {
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
  messagesDiv.className = type;
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
  messagesDiv.className = "hidden";
}

function setLoadingState(buttonElement, isLoading, originalText = "Submit") {
  if (!buttonElement) return;
  buttonElement.disabled = isLoading;
  buttonElement.textContent = isLoading ? "Processing..." : originalText;
}

async function fetchAndDisplayUserProfile(user) {
  if (!user || !supabase) {
    if (subscriptionStatusSpan)
      subscriptionStatusSpan.textContent = "Status: Error fetching profile.";
    return;
  }
  if (subscriptionStatusSpan)
    subscriptionStatusSpan.textContent = "Status: Loading...";

  try {
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
      if (subscriptionStatusSpan)
        subscriptionStatusSpan.textContent = `Status: 'free' (default) | Calls: 0`;
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
          "Status: Loading... (please wait a moment)";
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
  if (!supabase || !emailInput || !sendMagicLinkBtn)
    return showMessage(
      "UI elements missing or Supabase not initialized.",
      "error"
    );

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
  if (!supabase || !signOutBtn)
    return showMessage("Supabase not initialized or button missing.", "error");
  setLoadingState(signOutBtn, true, "Sign Out");
  clearMessage();
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    // onAuthStateChange in background.js will handle central state.
    // Popup's onAuthStateChange will also update its UI.
    showMessage("Signed out successfully.", "success");
  } catch (error) {
    console.error("Sign out error:", error);
    showMessage(error.message || "Failed to sign out.", "error");
  } finally {
    setLoadingState(signOutBtn, false, "Sign Out");
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  if (!supabase) {
    if (signedOutView) signedOutView.classList.add("hidden");
    if (signedInView) signedInView.classList.add("hidden");
    showMessage(
      "Critical Error: Supabase client is not available. Extension cannot function.",
      "error"
    );
    return;
  }

  if (sendMagicLinkBtn)
    sendMagicLinkBtn.addEventListener("click", handleSendMagicLink);
  if (signOutBtn) signOutBtn.addEventListener("click", handleSignOut);

  try {
    const session = await chrome.runtime.sendMessage({ type: "GET_SESSION" });
    updateUIForAuthState(session?.user || null);
  } catch (e) {
    console.warn(
      "Popup: Could not get initial session from background. May not be ready or extension reloaded.",
      e.message
    );
    const {
      data: { session },
    } = await supabase.auth.getSession(); // Fallback to local check
    updateUIForAuthState(session?.user || null);
  }

  supabase.auth.onAuthStateChange(async (_event, session) => {
    updateUIForAuthState(session?.user || null);
  });
});
