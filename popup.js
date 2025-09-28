document.addEventListener("DOMContentLoaded", () => {
  // --- CONSTANTS & CONFIGURATION ---
  const API_BASE = "https://quick-vint.vercel.app";
  const SUPABASE_URL = "https://jqloiovdwjaornnfvmyu.supabase.co";
  const SUPABASE_ANON_KEY =
    "eyJhbGciOiJIJTIyNiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpxbG9pb3Zkd2phb3JubmZ2bXl1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODIwODMzMiwiZXhwIjoyMDYzNzg0MzMyfQ.Urz77RMqsJs8gJmA3yia_HhxaaeDrHURrF-fPeExRNQ";

  const TIER_LIMITS = {
    free: { daily: 2, monthly: 10 },
    starter: { daily: 15, monthly: 300 },
    pro: { daily: 40, monthly: 800 },
    business: { daily: 75, monthly: 1500 },
  };

  const TIER_DISPLAY_NAMES = {
    free: "Free Plan",
    starter: "Starter Plan",
    pro: "Pro Plan",
    business: "Business Plan",
  };

  // --- SUPABASE CLIENT ---
  const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // --- DOM ELEMENT REFERENCES ---
  // General
  const messagesDiv = document.getElementById("messages");

  // Signed Out View
  const emailInput = document.getElementById("emailInput");
  const sendMagicLinkBtn = document.getElementById("sendMagicLinkBtn");

  // Signed In View
  const userEmailSpan = document.getElementById("userEmail");
  const signOutBtn = document.getElementById("signOutBtn");

  // Subscription & Usage
  const freePlanView = document.getElementById("freePlanView");
  const paidPlanView = document.getElementById("paidPlanView");
  const renewalDate = document.getElementById("renewalDate");
  const upgradeBtn = document.getElementById("upgradeBtn");
  const manageBtn = document.getElementById("manageBtn");
  const viewAllPlansLink = document.getElementById("viewAllPlansLink");
  const viewAllPlansLinkPaid = document.getElementById("viewAllPlansLinkPaid");
  const planName = document.getElementById("planName");
  const dailyProgressBar = document.getElementById("dailyProgressBar");
  const monthlyProgressBar = document.getElementById("monthlyProgressBar");
  const dailyCallsUsed = document.getElementById("dailyCallsUsed");
  const monthlyCallsUsed = document.getElementById("monthlyCallsUsed");

  // Language Dropdown
  const languageDropdown = document.querySelector(".language-dropdown");
  const dropdownToggle = document.querySelector(".dropdown-toggle");
  const dropdownMenu = document.querySelector(".dropdown-menu");
  const languageOptions = document.querySelectorAll(".dropdown-menu li");

  // --- HELPER & UTILITY FUNCTIONS ---

  /** Normalizes various subscription tier names to a consistent key. */
  function normalizeTier(tier) {
    if (!tier) return "free";
    const map = {
      unlimited_monthly: "starter",
      unlimited_annual: "starter",
      starter: "starter",
      pro: "pro",
      business: "business",
      free: "free",
    };
    return map[tier] || "free";
  }

  /** Displays a message to the user. */
  function showMessage(msg, type = "info") {
    if (!msg) {
      messagesDiv.classList.add("hidden");
      return;
    }
    messagesDiv.textContent = msg;
    messagesDiv.className = type; // Resets class list to just the type
    messagesDiv.classList.remove("hidden");
    if (type === "info" || type === "success") {
      setTimeout(() => messagesDiv.classList.add("hidden"), 4000);
    }
  }

  /** Sets the loading state for a button. */
  function setLoading(button, isLoading, defaultText) {
    button.disabled = isLoading;
    button.textContent = isLoading ? "Processing…" : defaultText;
  }

  /** Encodes user data into a Base64 string for URL transport. */
  function encodeUserData(data) {
    try {
      const jsonString = JSON.stringify(data);
      return btoa(jsonString);
    } catch (e) {
      console.error("Failed to encode user data:", e);
      return null;
    }
  }

  // --- UI RENDERING ---

  /** Renders the main view based on user authentication and profile state. */
  function render(user, profile) {
    if (user && profile) {
      userEmailSpan.textContent = user.email;

      const status = profile.subscription_status || "free";
      const rawTier = profile.subscription_tier || "free";
      const tier = normalizeTier(rawTier);
      const monthlyUsed = profile.api_calls_this_month || 0;

      planName.textContent = TIER_DISPLAY_NAMES[tier] || "Starter Plan";

      // Fetch daily count from the background script (single source of truth).
      chrome.runtime.sendMessage({ type: "GET_USER_DAY_COUNT" }, (resp) => {
        const dailyUsed =
          resp && typeof resp.daily === "number" ? resp.daily : 0;
        updateUsageUI(dailyUsed, monthlyUsed, tier);
      });

      // Show correct subscription view (free vs. paid).
      if (status === "active" && tier !== "free") {
        freePlanView.classList.add("hidden");
        paidPlanView.classList.remove("hidden");
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
        paidPlanView.classList.add("hidden");
        freePlanView.classList.remove("hidden");
      }

      document.body.dataset.view = "signed-in";
    } else {
      document.body.dataset.view = "signed-out";
    }
  }

  /** Updates the usage meters and progress bars. */
  function updateUsageUI(dailyUsed, monthlyUsed, tier) {
    const totals = TIER_LIMITS[tier] || TIER_LIMITS["free"];
    const dailyTotal = totals.daily;
    const monthlyTotal = totals.monthly;

    // Clamp displayed usage to prevent visual overflow (e.g., "18 / 15").
    const displayDailyUsed = Math.min(dailyUsed, dailyTotal);
    const displayMonthlyUsed = Math.min(monthlyUsed, monthlyTotal);

    const dailyPercent =
      dailyTotal > 0 ? Math.min((dailyUsed / dailyTotal) * 100, 100) : 0;
    const monthlyPercent =
      monthlyTotal > 0 ? Math.min((monthlyUsed / monthlyTotal) * 100, 100) : 0;

    dailyCallsUsed.textContent = `${displayDailyUsed} / ${dailyTotal}`;
    monthlyCallsUsed.textContent = `${displayMonthlyUsed} / ${monthlyTotal}`;

    if (dailyProgressBar) dailyProgressBar.style.width = `${dailyPercent}%`;
    if (monthlyProgressBar)
      monthlyProgressBar.style.width = `${monthlyPercent}%`;

    // Handle special case for "unlimited" daily usage display.
    if (tier === "business") {
      dailyCallsUsed.textContent = `Unlimited`;
      if (dailyProgressBar) dailyProgressBar.style.width = "100%";
    }
  }

  // --- DATA & STATE MANAGEMENT ---

  /** Fetches user and profile data from the background script and triggers a re-render. */
  function updateFromStorage() {
    chrome.runtime.sendMessage({ type: "GET_USER_PROFILE" }, (resp) => {
      render(resp?.user || null, resp?.profile || null);
    });
  }

  // --- API & EVENT HANDLERS ---

  async function handleSendMagicLink() {
    const email = emailInput.value.trim();
    if (!email.includes("@")) {
      showMessage("Please enter a valid email address.", "error");
      return;
    }

    setLoading(sendMagicLinkBtn, true, "Send Magic Link");
    showMessage(null);

    try {
      await fetch(`${API_BASE}/api/auth/magic-link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      showMessage("Check your email for the sign-in link.", "success");
      emailInput.value = "";
    } catch {
      showMessage("Connection issue. Please check your internet.", "error");
    } finally {
      setLoading(sendMagicLinkBtn, false, "Send Magic Link");
    }
  }

  function handleSignOut() {
    setLoading(signOutBtn, true, "Sign Out");
    chrome.runtime.sendMessage({ type: "SIGN_OUT" }, () => {
      // The state change listener will handle the UI update.
      setLoading(signOutBtn, false, "Sign Out");
    });
  }

  async function handleUpgrade() {
    const {
      data: { session },
    } = await supabaseClient.auth.getSession();
    if (!session?.user?.email) {
      showMessage("Please sign in to upgrade.", "error");
      return;
    }

    setLoading(upgradeBtn, true, "Loading…");
    try {
      const res = await fetch(`${API_BASE}/api/stripe/create-checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: session.user.email, tier: "starter" }),
      });
      const { url } = await res.json();
      if (res.ok && url) {
        window.open(url, "_blank");
      } else {
        showMessage("Unable to open the payment page.", "error");
      }
    } catch (err) {
      console.error("Checkout error:", err);
      showMessage("Connection issue. Please try again.", "error");
    } finally {
      setLoading(upgradeBtn, false, "Upgrade to Starter (€3.99)");
    }
  }

  async function handleManageSubscription() {
    const {
      data: { session },
    } = await supabaseClient.auth.getSession();
    if (!session?.user?.email) {
      showMessage("Please sign in to manage your subscription.", "error");
      return;
    }

    setLoading(manageBtn, true, "Loading…");
    try {
      const res = await fetch(`${API_BASE}/api/stripe/create-portal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: session.user.email }),
      });
      const { url } = await res.json();
      if (res.ok && url) {
        window.open(url, "_blank");
      } else {
        showMessage("Unable to open the subscription page.", "error");
      }
    } catch (err) {
      console.error("Portal error:", err);
      showMessage("Connection issue. Please try again.", "error");
    } finally {
      setLoading(manageBtn, false, "Manage Subscription");
    }
  }

  function handleViewAllPlans(e) {
    e.preventDefault();
    chrome.runtime.sendMessage({ type: "GET_USER_PROFILE" }, (resp) => {
      const userData = {
        source: "extension",
        signed_in: !!resp?.user?.email,
        plan: resp?.profile?.subscription_tier || "free",
        email: resp?.user?.email || "",
        timestamp: Date.now(),
      };
      const token = encodeUserData(userData);
      const url = `https://quick-vint.vercel.app/pricing.html?token=${token}`;
      window.open(url, "_blank");
    });
  }

  // --- LANGUAGE DROPDOWN LOGIC ---

  function setupLanguageDropdown() {
    // Restore selection from storage
    chrome.storage.local.get(["selectedLanguage"], (result) => {
      if (result.selectedLanguage) {
        const selectedItem = [...languageOptions].find(
          (item) => item.dataset.value === result.selectedLanguage
        );
        if (selectedItem) {
          dropdownToggle.innerHTML = selectedItem.innerHTML;
          languageOptions.forEach((opt) => opt.classList.remove("selected"));
          selectedItem.classList.add("selected");
        }
      }
    });

    const toggleDropdown = (show) => {
      dropdownMenu.classList.toggle("visible", show);
      dropdownToggle.classList.toggle("active", show);
    };

    dropdownToggle.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleDropdown(!dropdownMenu.classList.contains("visible"));
    });

    languageOptions.forEach((li) => {
      li.addEventListener("click", () => {
        dropdownToggle.innerHTML = li.innerHTML;
        languageOptions.forEach((opt) => opt.classList.remove("selected"));
        li.classList.add("selected");
        toggleDropdown(false);
        chrome.storage.local.set({ selectedLanguage: li.dataset.value });
      });
    });

    // Close dropdown when clicking outside
    document.addEventListener("click", (e) => {
      if (!languageDropdown.contains(e.target)) {
        toggleDropdown(false);
      }
    });
  }

  // --- INITIALIZATION ---

  function init() {
    // Set up event listeners
    sendMagicLinkBtn.addEventListener("click", handleSendMagicLink);
    signOutBtn.addEventListener("click", handleSignOut);
    upgradeBtn.addEventListener("click", handleUpgrade);
    manageBtn.addEventListener("click", handleManageSubscription);
    viewAllPlansLink?.addEventListener("click", handleViewAllPlans);
    viewAllPlansLinkPaid?.addEventListener("click", handleViewAllPlans);
    emailInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") handleSendMagicLink();
    });

    // Set up dynamic components
    setupLanguageDropdown();

    // Listen for state changes from background script or other tabs
    chrome.storage.onChanged.addListener((changes) => {
      if (changes.supabaseSession || changes.userProfile) {
        updateFromStorage();
      }
    });
    window.addEventListener("focus", updateFromStorage);

    // Initial load
    updateFromStorage();
  }

  init();
});
