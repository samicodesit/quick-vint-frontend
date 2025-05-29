// popup.js
document.addEventListener("DOMContentLoaded", () => {
  const API_BASE = "https://quick-vint.vercel.app";

  // UI elements
  const signedOutView = document.getElementById("signedOutView");
  const signedInView = document.getElementById("signedInView");
  const emailInput = document.getElementById("emailInput");
  const sendMagicLinkBtn = document.getElementById("sendMagicLinkBtn");
  const userEmailSpan = document.getElementById("userEmail");
  const subscriptionStatus = document.getElementById("subscriptionStatus");
  const signOutBtn = document.getElementById("signOutBtn");
  const messagesDiv = document.getElementById("messages");

  function showMessage(msg, type = "info") {
    messagesDiv.textContent = msg;
    messagesDiv.className = type;
    messagesDiv.classList.remove("hidden");
    if (type === "info" || type === "success") {
      setTimeout(() => messagesDiv.classList.add("hidden"), 4000);
    }
  }

  function setLoading(button, isLoading, text) {
    button.disabled = isLoading;
    button.textContent = isLoading ? "Processing…" : text;
  }

  function render(session, profile) {
    if (session?.user) {
      signedOutView.classList.add("hidden");
      signedInView.classList.remove("hidden");
      userEmailSpan.textContent = session.user.email;
      subscriptionStatus.textContent = `Status: ${
        profile?.subscription_status || "free"
      } | Calls: ${profile?.api_calls_this_month || 0}`;
    } else {
      signedInView.classList.add("hidden");
      signedOutView.classList.remove("hidden");
      subscriptionStatus.textContent = "Status: Not signed in";
    }
  }

  // Read session + profile from storage and render
  function updateFromStorage() {
    chrome.storage.local.get(
      ["supabaseSession", "supabaseProfile"],
      ({ supabaseSession, supabaseProfile }) => {
        console.log(supabaseProfile, "supab base profile");
        render(supabaseSession, supabaseProfile);
      }
    );
  }

  // Listen for storage changes
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.supabaseSession || changes.supabaseProfile) {
      updateFromStorage();
    }
  });

  // Initial render
  updateFromStorage();

  // Send magic link
  sendMagicLinkBtn.addEventListener("click", async () => {
    const email = emailInput.value.trim();
    if (!email.includes("@")) {
      showMessage("Enter a valid email", "error");
      return;
    }
    setLoading(sendMagicLinkBtn, true, "Send Magic Link");
    showMessage("", "");
    try {
      const res = await fetch(`${API_BASE}/api/auth/magic-link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = await res.json();
      if (res.ok) {
        showMessage(json.message || "Check your email", "success");
        emailInput.value = "";
      } else {
        showMessage(json.error || "Error sending link", "error");
      }
    } catch {
      showMessage("Network error", "error");
    } finally {
      setLoading(sendMagicLinkBtn, false, "Send Magic Link");
    }
  });

  // Sign out
  signOutBtn.addEventListener("click", () => {
    setLoading(signOutBtn, true, "Sign Out");
    chrome.runtime.sendMessage({ type: "SIGN_OUT" }, () => {
      setLoading(signOutBtn, false, "Sign Out");
      // the storage change listener will call updateFromStorage()
    });
  });
});
