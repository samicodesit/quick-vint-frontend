document.addEventListener("DOMContentLoaded", () => {
  const API_BASE = "https://quick-vint.vercel.app";

  // DOM
  const signedOutView = document.getElementById("signedOutView");
  const signedInView = document.getElementById("signedInView");
  const emailInput = document.getElementById("emailInput");
  const sendMagicLinkBtn = document.getElementById("sendMagicLinkBtn");
  const userEmailSpan = document.getElementById("userEmail");
  const subscriptionStatus = document.getElementById("subscriptionStatus");
  const signOutBtn = document.getElementById("signOutBtn");
  const messagesDiv = document.getElementById("messages");

  function showMessage(msg, type = "info") {
    if (!msg) {
      messagesDiv.classList.add("hidden");
      return;
    }
    messagesDiv.textContent = msg;
    messagesDiv.className = type;
    messagesDiv.classList.remove("hidden");
    if (type === "info" || type === "success") {
      setTimeout(() => messagesDiv.classList.add("hidden"), 4000);
    }
  }

  function setLoading(button, isLoading, defaultText) {
    button.disabled = isLoading;
    button.textContent = isLoading ? "Processing…" : defaultText;
  }

  function render(user, profile) {
    document.body.classList.remove("fade-in");
    void document.body.offsetWidth; // trigger reflow
    document.body.classList.add("fade-in");

    if (user && profile) {
      userEmailSpan.textContent = user.email;
      subscriptionStatus.textContent = `Status: ${
        profile.subscription_status || "free"
      } | Calls: ${profile.api_calls_this_month || 0}`;
      signedOutView.classList.add("hidden");
      signedInView.classList.remove("hidden");
    } else {
      subscriptionStatus.textContent = "Status: Not signed in";
      signedInView.classList.add("hidden");
      signedOutView.classList.remove("hidden");
    }
  }

  async function updateFromStorage() {
    chrome.runtime.sendMessage({ type: "GET_USER_PROFILE" }, (resp) => {
      render(resp?.user || null, resp?.profile || null);
    });
  }

  chrome.storage.onChanged.addListener((changes) => {
    if (changes.supabaseSession || changes.supabaseProfile) {
      updateFromStorage();
    }
  });

  // Initial
  signedInView.classList.add("hidden");
  signedOutView.classList.add("hidden");
  document.body.classList.remove("fade-in");
  updateFromStorage();

  sendMagicLinkBtn.addEventListener("click", async () => {
    const email = emailInput.value.trim();
    if (!email.includes("@")) {
      showMessage("Enter a valid email", "error");
      return;
    }

    setLoading(sendMagicLinkBtn, true, "Send Magic Link");
    showMessage(null); // clear

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

  signOutBtn.addEventListener("click", () => {
    setLoading(signOutBtn, true, "Sign Out");
    chrome.runtime.sendMessage({ type: "SIGN_OUT" }, () => {
      setLoading(signOutBtn, false, "Sign Out");
    });
  });

  window.addEventListener("focus", updateFromStorage);

  emailInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      sendMagicLinkBtn.click();
    }
  });
});
