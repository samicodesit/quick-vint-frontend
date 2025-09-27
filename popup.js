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
  const renewalDate = document.getElementById("renewalDate");
  const upgradeBtn = document.getElementById("upgradeBtn");
  const manageBtn = document.getElementById("manageBtn");
  const viewAllPlansLink = document.getElementById("viewAllPlansLink");
  const viewAllPlansLinkPaid = document.getElementById("viewAllPlansLinkPaid");

  // Tier limits mapping
  const TIER_LIMITS = {
    free: { daily: 2, monthly: 10 },
    starter: { daily: 15, monthly: 300 },
    pro: { daily: 40, monthly: 800 },
    business: { daily: 75, monthly: 1500 },
  };

  // Helper to normalize tier names
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

  // =================================================================
  // VIEW NAVIGATION
  // =================================================================
  const settingsBtn = document.getElementById("settingsBtn");
  const backBtn = document.getElementById("backBtn");

  settingsBtn.addEventListener("click", () => {
    document.body.dataset.view = "settings";
  });

  backBtn.addEventListener("click", () => {
    document.body.dataset.view = "signed-in";
  });

  // =================================================================
  // SETTINGS LOGIC
  // =================================================================
  const settings = {
    tone: "neutral",
    length: "long",
    emojis: "yes",
  };
  const toneButtons = document.querySelectorAll("#tone-setting button");
  const lengthButtons = document.querySelectorAll("#length-setting button");
  const emojiButtons = document.querySelectorAll("#emoji-setting button");

  async function saveSettings() {
    if (chrome && chrome.storage && chrome.storage.local) {
      await chrome.storage.local.set({ generationSettings: settings });
      console.log("Settings saved:", settings);
    }
  }

  async function loadSettings() {
    if (chrome && chrome.storage && chrome.storage.local) {
      const result = await chrome.storage.local.get("generationSettings");
      if (result.generationSettings) {
        Object.assign(settings, result.generationSettings);
        console.log("Settings loaded:", settings);
      }
      updateSettingsUI();
    }
  }

  function updateSettingsUI() {
    // Tone
    toneButtons.forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.value === settings.tone);
    });
    // Length
    lengthButtons.forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.value === settings.length);
    });
    // Emojis
    emojiButtons.forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.value === settings.emojis);
    });
  }

  function handleSettingClick(event, settingKey, buttons) {
    const clickedButton = event.target.closest("button");
    if (!clickedButton) return;

    const value = clickedButton.dataset.value;
    settings[settingKey] = value;

    buttons.forEach((btn) => btn.classList.remove("active"));
    clickedButton.classList.add("active");

    saveSettings();
  }

  document
    .getElementById("tone-setting")
    .addEventListener("click", (e) =>
      handleSettingClick(e, "tone", toneButtons)
    );
  document
    .getElementById("length-setting")
    .addEventListener("click", (e) =>
      handleSettingClick(e, "length", lengthButtons)
    );
  document
    .getElementById("emoji-setting")
    .addEventListener("click", (e) =>
      handleSettingClick(e, "emojis", emojiButtons)
    );

  // Render user + subscription state
  function render(user, profile) {
    if (user && profile) {
      // Get new UI elements
      const planName = document.getElementById("planName");
      const dailyProgressBar = document.getElementById("dailyProgressBar");
      const monthlyProgressBar = document.getElementById("monthlyProgressBar");
      const dailyCallsUsed = document.getElementById("dailyCallsUsed");
      const monthlyCallsUsed = document.getElementById("monthlyCallsUsed");

      userEmailSpan.textContent = user.email;

      const status = profile.subscription_status || "free";
      const rawTier = profile.subscription_tier || "free";
      const tier = normalizeTier(rawTier);

      const monthlyUsed = profile.api_calls_this_month || 0;

      const totals = TIER_LIMITS[tier] || TIER_LIMITS["free"];
      const dailyTotal = totals.daily;
      const monthlyTotal = totals.monthly;

      const tierDisplayNames = {
        free: "Free Plan",
        starter: "Starter Plan",
        pro: "Pro Plan",
        business: "Business Plan",
      };

      planName.textContent = tierDisplayNames[tier] || "Starter Plan";

      const updateUsageUI = (dailyUsed) => {
        // TODO: The backend sometimes reports usage exceeding the tier limit.
        // This is a visual clamp to prevent showing numbers like "18 / 15".
        // The root cause should be investigated and fixed in the backend logic.
        const displayDailyUsed = Math.min(dailyUsed, dailyTotal);
        const displayMonthlyUsed = Math.min(monthlyUsed, monthlyTotal);

        const dailyPercent =
          dailyTotal > 0 ? Math.min((dailyUsed / dailyTotal) * 100, 100) : 0;
        const monthlyPercent =
          monthlyTotal > 0
            ? Math.min((monthlyUsed / monthlyTotal) * 100, 100)
            : 0;

        // Set the text content, using the clamped values for display
        dailyCallsUsed.textContent = `${displayDailyUsed} / ${dailyTotal}`;
        monthlyCallsUsed.textContent = `${displayMonthlyUsed} / ${monthlyTotal}`;

        // Update progress bar widths. Using original values is fine here as Math.min caps it.
        if (dailyProgressBar) dailyProgressBar.style.width = `${dailyPercent}%`;
        if (monthlyProgressBar)
          monthlyProgressBar.style.width = `${monthlyPercent}%`;

        // Override for Business plan's unlimited daily usage display
        if (tier === "business") {
          dailyCallsUsed.textContent = `Unlimited`;
          if (dailyProgressBar) dailyProgressBar.style.width = "100%";
        }
      };

      // Always fetch daily count from background script as it's the single source of truth.
      chrome.runtime.sendMessage({ type: "GET_USER_DAY_COUNT" }, (resp) => {
        const dailyUsed =
          resp && typeof resp.daily === "number" ? resp.daily : 0;
        updateUsageUI(dailyUsed);
      });

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
      settingsBtn.classList.add("hidden");
    }
  }

  async function updateFromStorage() {
    chrome.runtime.sendMessage({ type: "GET_USER_PROFILE" }, (resp) => {
      render(resp?.user || null, resp?.profile || null);
    });
  }

  // Initial View Kickoff
  updateFromStorage();
  loadSettings();

  chrome.storage.onChanged.addListener((changes) => {
    if (changes.supabaseSession || changes.userProfile) {
      updateFromStorage();
    }
  });

  window.addEventListener("focus", updateFromStorage);

  function encodeUserData(data) {
    try {
      const jsonString = JSON.stringify(data);
      return btoa(jsonString);
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

  sendMagicLinkBtn.addEventListener("click", async () => {
    const email = emailInput.value.trim();
    if (!email.includes("@")) {
      showMessage("Enter a valid email", "error");
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
      showMessage("Check your email for the sign-in link", "success");
      emailInput.value = "";
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
        body: JSON.stringify({ email: user.email, tier: "starter" }),
      });
      const { url } = await res.json();
      if (url) window.open(url, "_blank");
      else showMessage("Unable to open payment page.", "error");
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
      const { url } = await res.json();
      if (res.ok && url) window.open(url, "_blank");
      else showMessage("Unable to open subscription page.", "error");
    } catch (err) {
      console.error("Portal error:", err);
      showMessage("Connection issue. Please try again.", "error");
    } finally {
      setLoading(manageBtn, false, "Manage Subscription");
    }
  });

  function handleViewAllPlansClick(e) {
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

  // Language Dropdown Logic with chrome.storage.local
  const languageDropdown = document.querySelector(".language-dropdown");
  const dropdownToggle = document.querySelector(".dropdown-toggle");
  const dropdownMenu = document.querySelector(".dropdown-menu");
  const languageOptions = document.querySelectorAll(".dropdown-menu li");

  // Restore selection from chrome.storage.local
  if (chrome && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(["selectedLanguage"], function (result) {
      if (result.selectedLanguage) {
        const selectedItem = Array.from(languageOptions).find(
          (item) => item.getAttribute("data-value") === result.selectedLanguage
        );
        if (selectedItem) {
          dropdownToggle.innerHTML = selectedItem.innerHTML;
          languageOptions.forEach((opt) => opt.classList.remove("selected"));
          selectedItem.classList.add("selected");
        }
      }
    });
  }

  function toggleDropdown(show) {
    if (show) {
      dropdownMenu.classList.add("visible");
      dropdownToggle.classList.add("active");
    } else {
      dropdownMenu.classList.remove("visible");
      dropdownToggle.classList.remove("active");
    }
  }

  dropdownToggle.addEventListener("click", (e) => {
    e.stopPropagation();
    const isVisible = dropdownMenu.classList.contains("visible");
    toggleDropdown(!isVisible);
  });

  languageOptions.forEach((li) => {
    li.addEventListener("click", () => {
      const selectedLanguage = li.textContent.trim();
      const selectedValue = li.dataset.value;
      dropdownToggle.innerHTML = li.innerHTML;
      languageOptions.forEach((opt) => opt.classList.remove("selected"));
      li.classList.add("selected");
      toggleDropdown(false);
      if (chrome && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ selectedLanguage: selectedValue });
      }
      console.log(
        `Selected Language: ${selectedLanguage}, Value: ${selectedValue}`
      );
    });
  });

  document.addEventListener("click", (e) => {
    if (!languageDropdown.contains(e.target)) {
      toggleDropdown(false);
    }
  });

  viewAllPlansLink?.addEventListener("click", handleViewAllPlansClick);
  viewAllPlansLinkPaid?.addEventListener("click", handleViewAllPlansClick);
});
