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
  const overageUsage = document.getElementById("overageUsage");
  const upgradeBtn = document.getElementById("upgradeBtn");
  const manageBtn = document.getElementById("manageBtn");
  const viewAllPlansLink = document.getElementById("viewAllPlansLink");
  const viewAllPlansLinkPaid = document.getElementById("viewAllPlansLinkPaid");

  // Render user + subscription state
  function render(user, profile) {
    if (user && profile) {
      // Populate the signed-in view's content
      userEmailSpan.textContent = user.email;

      const status = profile.subscription_status || "free";
      const tier = profile.subscription_tier || "free";
      const used = profile.api_calls_this_month || 0;

      // Updated tier display names for new system + legacy
      const tierDisplayNames = {
        free: "Free",
        unlimited_monthly: "Starter", // Legacy user support
        unlimited_annual: "Starter", // Legacy user support (just in case)
        starter: "Starter",
        pro: "Pro",
        business: "Business",
      };

      // Check for new tier names + legacy
      if (
        status === "active" &&
        [
          "unlimited_monthly",
          "unlimited_annual",
          "starter",
          "pro",
          "business",
        ].includes(tier)
      ) {
        // Show paid plan view
        freePlanView.classList.add("hidden");
        paidPlanView.classList.remove("hidden");

        // Update plan name in paid view
        const planNameElement = paidPlanView.querySelector("p strong");
        if (planNameElement) {
          planNameElement.textContent = tierDisplayNames[tier] || "Starter";
        }

        // Only show overage if Business tier AND there's actual overage usage
        if (tier === "business" && profile.overage_used_today > 0) {
          overageUsage.classList.remove("hidden");
          const overageCount = profile.overage_used_today;
          overageUsage.innerHTML = `Extra calls today: <strong>${overageCount}</strong>`;
        } else {
          overageUsage.classList.add("hidden");
        }

        // Simplified renewal info - only show if date exists
        const rawEnd = profile.current_period_end;
        if (rawEnd) {
          const dt = new Date(rawEnd);
          renewalDate.innerHTML = `Active until: <strong>${dt.toLocaleDateString(
            undefined,
            { year: "numeric", month: "short", day: "numeric" }
          )}</strong>`;
        } else {
          renewalDate.innerHTML = `<strong>Active subscription</strong>`;
        }
      } else {
        // Show free plan view
        paidPlanView.classList.add("hidden");
        freePlanView.classList.remove("hidden");

        // Update plan name in free view
        const freePlanNameElement = freePlanView.querySelector("p strong");
        if (freePlanNameElement) {
          freePlanNameElement.textContent = "Free";
        }

        // Only show usage for free tier to encourage upgrades
        if (tier === "free") {
          const dailyLimit = 2;
          freeCallsUsed.textContent = `Calls today: ${used} / ${dailyLimit}`;
        } else {
          // For other tiers in free view, just show they have access
          freeCallsUsed.textContent = `Calls available today`;
        }
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

  // Utility function for encoding user data
  function encodeUserData(data) {
    try {
      const jsonString = JSON.stringify(data);
      return btoa(jsonString); // Base64 encode
    } catch (e) {
      console.error("Failed to encode user data:", e);
      return null;
    }
  }

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
        showMessage("Check your email for the sign-in link", "success");
        emailInput.value = "";
      } else {
        showMessage("Unable to send sign-in link. Please try again.", "error");
      }
    } catch {
      showMessage("Connection issue. Please check your internet.", "error");
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

  upgradeBtn.addEventListener("click", async () => {
    const {
      data: { session },
    } = await supabaseClient.auth.getSession();
    const user = session?.user;
    if (!user?.email) {
      showMessage("Please sign in to upgrade", "error");
      return;
    }

    setLoading(upgradeBtn, true, "Loading…");
    try {
      const res = await fetch(`${API_BASE}/api/stripe/create-checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: user.email,
          tier: "starter", // ✅ Fixed: use 'tier' instead of 'interval' and 'priceId'
        }),
      });
      const { url } = await res.json();
      if (url) {
        window.open(url, "_blank");
      } else {
        showMessage("Unable to open payment page. Please try again.", "error");
      }
    } catch (err) {
      console.error("Checkout error:", err);
      showMessage("Connection issue. Please try again.", "error");
    } finally {
      setLoading(upgradeBtn, false, "Upgrade to Starter (€3.99)");
    }
  });

  manageBtn.addEventListener("click", async () => {
    const {
      data: { session },
    } = await supabaseClient.auth.getSession();
    const user = session?.user;
    if (!user?.email) {
      showMessage("Please sign in to manage subscription", "error");
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
        showMessage(
          "Unable to open subscription page. Please try again.",
          "error"
        );
      }
    } catch (err) {
      console.error("Portal error:", err);
      showMessage("Connection issue. Please try again.", "error");
    } finally {
      setLoading(manageBtn, false, "Manage Subscription");
    }
  });

  // View All Plans handlers
  // Single View All Plans handler (replaces both previous handlers)
  function handleViewAllPlansClick(e) {
    e.preventDefault();
    chrome.runtime.sendMessage({ type: "GET_USER_PROFILE" }, (resp) => {
      const userData = {
        source: "extension",
        signed_in: !!resp?.user?.email,
        plan: resp?.profile?.subscription_tier || "free",
        email: resp?.user?.email || "",
        timestamp: Date.now(), // For freshness validation
      };

      const token = encodeUserData(userData);
      if (token) {
        // Use new token-based approach
        window.open(
          `https://quick-vint.vercel.app/pricing.html?token=${token}`,
          "_blank"
        );
      } else {
        // Fallback to old method if encoding fails
        const params = new URLSearchParams({
          source: "extension",
          signed_in: userData.signed_in ? "true" : "false",
          plan: userData.plan,
          email: userData.email,
        });
        window.open(
          `https://quick-vint.vercel.app/pricing.html?${params.toString()}`,
          "_blank"
        );
      }
    });
  }

  // Apply the single handler to both links
  viewAllPlansLink?.addEventListener("click", handleViewAllPlansClick);
  viewAllPlansLinkPaid?.addEventListener("click", handleViewAllPlansClick);
});
