document.addEventListener("DOMContentLoaded", () => {
  const API_BASE = "https://quick-vint.vercel.app";
  const SUPABASE_URL = "https://jqloiovdwjaornnfvmyu.supabase.co";
  const SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpxbG9pb3Zkd2phb3JubmZ2bXl1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODIwODMzMiwiZXhwIjoyMDYzNzg0MzMyfQ.Urz77RMqsJs8gJmA3yia_HhxaaeDrHURrF-fPeExRNQ";

  const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // DOM elements
  const emailInput = document.getElementById("emailInput");
  const sendMagicLinkBtn = document.getElementById("sendMagicLinkBtn");
  const userEmailSpan = document.getElementById("userEmail");
  const signOutBtn = document.getElementById("signOutBtn");
  const messagesDiv = document.getElementById("messages");

  // Subscription-area elements
  const freePlanView = document.getElementById("freePlanView");
  const paidPlanView = document.getElementById("paidPlanView");
  const freeCallsUsed = document.getElementById("freeCallsUsed");
  const renewalDate = document.getElementById("renewalDate");
  const upgradeBtn = document.getElementById("upgradeBtn");
  const manageBtn = document.getElementById("manageBtn");

  // Render user + subscription state
  function render(user, profile) {
    if (user && profile) {
      // Populate the signed-in view's content
      userEmailSpan.textContent = user.email;

      const status = profile.subscription_status || "free";
      const tier = profile.subscription_tier || "free";
      const used = profile.api_calls_this_month || 0;

      if (
        status === "active" &&
        (tier === "unlimited_monthly" || tier === "unlimited_annual")
      ) {
        freePlanView.classList.add("hidden");
        paidPlanView.classList.remove("hidden");
        const rawEnd = profile.current_period_end;
        if (rawEnd) {
          const dt = new Date(rawEnd);
          renewalDate.innerHTML = `Renews on: <strong>${dt.toLocaleDateString(
            undefined,
            { year: "numeric", month: "short", day: "numeric" }
          )}</strong>`;
        } else {
          renewalDate.innerHTML = `Renews on: <strong>—</strong>`;
        }
      } else {
        paidPlanView.classList.add("hidden");
        freePlanView.classList.remove("hidden");
        freeCallsUsed.textContent = `Calls this month: ${used} / 5`;
      }

      // Set the final view state on the body
      document.body.dataset.view = "signed-in";
    } else {
      // Set the final view state on the body
      document.body.dataset.view = "signed-out";
    }
  }

  // Ask background for current user + profile
  async function updateFromStorage() {
    chrome.runtime.sendMessage({ type: "GET_USER_PROFILE" }, (resp) => {
      render(resp?.user || null, resp?.profile || null);
    });
  }

  // Initial View Kickoff
  updateFromStorage();

  // Listen for changes from other parts of the extension
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.supabaseSession || changes.userProfile) {
      updateFromStorage();
    }
  });

  window.addEventListener("focus", updateFromStorage);

  // Utility functions
  function showMessage(msg, type = "info") {
    if (!msg) {
      messagesDiv.classList.add("hidden");
      return;
    }
    messagesDiv.textContent = msg;
    messagesDiv.className = type; // Resets class list
    messagesDiv.classList.remove("hidden");
    if (type === "info" || type === "success") {
      setTimeout(() => messagesDiv.classList.add("hidden"), 4000);
    }
  }

  function setLoading(button, isLoading, defaultText) {
    button.disabled = isLoading;
    button.textContent = isLoading ? "Processing…" : defaultText;
  }

  // Auth Handlers
  sendMagicLinkBtn.addEventListener("click", async () => {
    const email = emailInput.value.trim();
    if (!email.includes("@")) {
      showMessage("Enter a valid email", "error");
      return;
    }

    setLoading(sendMagicLinkBtn, true, "Send Magic Link");
    showMessage(null);

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

  emailInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") sendMagicLinkBtn.click();
  });

  // Subscription Handlers
  upgradeBtn.addEventListener("click", async () => {
    const {
      data: { session },
    } = await supabaseClient.auth.getSession();
    const user = session?.user;
    if (!user?.email) {
      showMessage("Please sign in first", "error");
      return;
    }

    setLoading(upgradeBtn, true, "Loading…");
    try {
      const res = await fetch(`${API_BASE}/api/stripe/create-checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: user.email,
          interval: "monthly",
        }),
      });
      const { url } = await res.json();
      if (url) {
        window.open(url, "_blank");
      } else {
        showMessage("Failed to start checkout", "error");
      }
    } catch (err) {
      console.error("Checkout error:", err);
      showMessage("Unable to start checkout", "error");
    } finally {
      setLoading(upgradeBtn, false, "Upgrade to Unlimited");
    }
  });

  manageBtn.addEventListener("click", async () => {
    const {
      data: { session },
    } = await supabaseClient.auth.getSession();
    const user = session?.user;
    if (!user?.email) {
      showMessage("Please sign in first", "error");
      return;
    }

    setLoading(manageBtn, true, "Loading…");
    try {
      const res = await fetch(`${API_BASE}/api/stripe/create-portal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email }),
      });
      const json = await res.json();
      if (res.ok && json.url) {
        window.open(json.url, "_blank");
      } else {
        showMessage(json.error || "Could not open portal", "error");
      }
    } catch (err) {
      console.error("Portal error:", err);
      showMessage("Network error", "error");
    } finally {
      setLoading(manageBtn, false, "Manage Subscription");
    }
  });
});
