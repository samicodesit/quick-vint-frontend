document.addEventListener("DOMContentLoaded", () => {
  // --- CONSTANTS & CONFIGURATION ---
  const API_BASE = "https://autolister.app";
  const SUPABASE_URL = "https://jqloiovdwjaornnfvmyu.supabase.co";
  const SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpxbG9pb3Zkd2phb3JubmZ2bXl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgyMDgzMzIsImV4cCI6MjA2Mzc4NDMzMn0.iFtkUorY1UqK8zamnwgjB-yhsXe0bJAA8YFm22bzc3A";
  const TIER_LIMITS = {
    free: { daily: 5, monthly: 5 },
    starter: { daily: 10, monthly: 75 },
    pro: { daily: 25, monthly: 250 },
    business: { daily: 60, monthly: 600 },
  };
  const FREE_LIFETIME_LIMIT = 5;
  const CREDIT_PACK = {
    credits: 20,
    price: "€5.99",
  };

  const TIER_DISPLAY_NAMES = {
    free: "Free Plan",
    starter: "Starter Plan",
    pro: "Pro Plan",
    business: "Business Plan",
  };

  const NEXT_TIER = {
    free: "starter",
    starter: "pro",
    pro: "business",
    business: null,
  };

  const TIER_UPSELL_COPY = {
    starter: "Upgrade to Starter (€3.99/mo)",
    pro: "Upgrade to Pro (€9.99/mo)",
    business: "Upgrade to Business (€19.99/mo)",
  };

  // --- SUPABASE CLIENT ---
  const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // --- DOM ELEMENT REFERENCES ---
  const messagesDiv = document.getElementById("messages");
  const emailInput = document.getElementById("emailInput");
  const sendMagicLinkBtn = document.getElementById("sendMagicLinkBtn");
  const userEmailSpan = document.getElementById("userEmail");
  const signOutBtn = document.getElementById("signOutBtn");
  const signOutBtnSettings = document.getElementById("signOutBtnSettings");
  const freePlanView = document.getElementById("freePlanView");
  const paidPlanView = document.getElementById("paidPlanView");
  const oneTimeSeparator = document.getElementById("oneTimeSeparator");
  const oneTimePurchase = document.getElementById("oneTimePurchase");
  const creditPackBtn = document.getElementById("creditPackBtn");
  const renewalDate = document.getElementById("renewalDate");
  const upgradeBtn = document.getElementById("upgradeBtn");
  const paidUpgradeBtn = document.getElementById("paidUpgradeBtn");
  const manageBtn = document.getElementById("manageBtn");
  const viewAllPlansLink = document.getElementById("viewAllPlansLink");
  const viewAllPlansLinkPaid = document.getElementById("viewAllPlansLinkPaid");
  const planName = document.getElementById("planName");
  const dailyProgressBar = document.getElementById("dailyProgressBar");
  const monthlyProgressBar = document.getElementById("monthlyProgressBar");
  const dailyCallsUsed = document.getElementById("dailyCallsUsed");
  const monthlyCallsUsed = document.getElementById("monthlyCallsUsed");
  const dailyMeterLabel = document.getElementById("dailyMeterLabel");
  const monthlyMeterLabel = document.getElementById("monthlyMeterLabel");
  const usageLimitNote = document.getElementById("usageLimitNote");
  const languageDropdowns = document.querySelectorAll(".language-dropdown");
  const settingsToggleBtn = document.getElementById("settingsToggleBtn");
  const gearIcon = document.querySelector(".gear-icon");
  const backIcon = document.querySelector(".back-icon");
  const toneOptions = document.querySelectorAll('input[name="tone"]');
  const emojiToggle = document.getElementById("emojiToggle");
  const formatOptions = document.querySelectorAll('input[name="format"]');
  let renderRequestId = 0;
  let profileRefreshInFlight = false;
  let lastProfileRefreshAt = 0;
  let renderedTier = null;

  // --- HELPER & UTILITY FUNCTIONS ---

  function getLocalStorage(keys) {
    return new Promise((resolve) => {
      chrome.storage.local.get(keys, resolve);
    });
  }

  function sendRuntimeMessage(message) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          console.warn(
            `Runtime message failed (${message.type}):`,
            chrome.runtime.lastError.message,
          );
          resolve(null);
          return;
        }
        resolve(response);
      });
    });
  }

  function setView(view) {
    if (document.body.dataset.view !== view) {
      document.body.dataset.view = view;
    }
  }

  function getRenderableStateKey(data) {
    return JSON.stringify({
      userId:
        data.supabaseSession?.user?.id ||
        data.supabaseSession?.user?.email ||
        null,
      profile: data.userProfile || null,
    });
  }

  function toggleSettingsView() {
    const isSettingsActive = document.body.classList.toggle("settings-active");
    if (gearIcon && backIcon) {
      if (isSettingsActive) {
        gearIcon.classList.add("hidden");
        backIcon.classList.remove("hidden");
      } else {
        gearIcon.classList.remove("hidden");
        backIcon.classList.add("hidden");
      }
    }
  }

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

  function showMessage(msg, type = "info") {
    if (!messagesDiv) return;
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
    if (!button) return;
    button.disabled = isLoading;
    button.textContent = isLoading ? "Processing…" : defaultText;
  }

  function restoreUpgradeButtonContent() {
    if (!upgradeBtn) return;
    upgradeBtn.disabled = false;
    upgradeBtn.innerHTML = `Upgrade to Starter (€3.99/mo)<span class="cta-subline">10/day · 75/month</span>`;
  }

  function restoreCreditPackButtonContent() {
    if (!creditPackBtn) return;
    creditPackBtn.disabled = false;
    creditPackBtn.textContent = `Buy ${CREDIT_PACK.credits} credits for ${CREDIT_PACK.price}`;
  }

  function setPaidUpgradeButton(tier) {
    if (!paidUpgradeBtn) return;
    const nextTier = NEXT_TIER[tier];
    if (!nextTier) {
      paidUpgradeBtn.classList.add("hidden");
      return;
    }

    const nextLimits = TIER_LIMITS[nextTier];
    const dailyCopy =
      nextLimits.daily === null ? "No daily cap" : `${nextLimits.daily}/day`;
    paidUpgradeBtn.innerHTML = `${TIER_UPSELL_COPY[nextTier]}<span class="cta-subline">${dailyCopy} · ${nextLimits.monthly}/month</span>`;
  }

  function setCreditPackVisibility(show, label, options = {}) {
    const showSeparator = options.showSeparator !== false;
    if (oneTimeSeparator)
      oneTimeSeparator.classList.toggle("hidden", !show || !showSeparator);
    if (oneTimePurchase) oneTimePurchase.classList.toggle("hidden", !show);
    if (creditPackBtn) {
      creditPackBtn.textContent =
        label || `Buy ${CREDIT_PACK.credits} credits for ${CREDIT_PACK.price}`;
    }
  }

  function restoreSignOutButtonContent(button) {
    if (!button) return;
    button.disabled = false;
    button.innerHTML = `
      <svg class="sign-out-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor"
        stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
        <polyline points="16 17 21 12 16 7"></polyline>
        <line x1="21" y1="12" x2="9" y2="12"></line>
      </svg>
      Sign Out
    `;
  }

  function setUsageLoadingUI(tier) {
    if (usageLimitNote) usageLimitNote.style.display = "none";
    if (paidUpgradeBtn) paidUpgradeBtn.classList.add("hidden");
    setCreditPackVisibility(false);

    if (tier === "free") {
      if (dailyMeterLabel) dailyMeterLabel.textContent = "Free Listings";
      if (monthlyMeterLabel) monthlyMeterLabel.textContent = "Credit Pack";
    } else {
      if (dailyMeterLabel) dailyMeterLabel.textContent = "Daily Usage";
      if (monthlyMeterLabel) monthlyMeterLabel.textContent = "Monthly Usage";
    }

    if (dailyCallsUsed) dailyCallsUsed.textContent = "Loading...";
    if (monthlyCallsUsed) monthlyCallsUsed.textContent = "Loading...";
    if (dailyProgressBar) dailyProgressBar.style.width = "0%";
    if (monthlyProgressBar) monthlyProgressBar.style.width = "0%";
  }

  function encodeUserData(data) {
    try {
      return btoa(JSON.stringify(data));
    } catch (e) {
      console.error("Failed to encode user data:", e);
      return null;
    }
  }

  // --- UI RENDERING ---

  async function render(user, profile) {
    const requestId = ++renderRequestId;

    if (user && profile) {
      const shouldRevealAfterUsage = document.body.dataset.view !== "signed-in";
      if (shouldRevealAfterUsage) {
        setView("loading");
      }

      if (userEmailSpan) userEmailSpan.textContent = user.email;
      const rawTier = profile.subscription_tier || "free";
      const normalizedTier = normalizeTier(rawTier);
      const isActive = profile.subscription_status === "active";
      const tier = isActive ? normalizedTier : "free";
      const hasSubscriptionPlan = tier !== "free";
      const shouldResetUsage = shouldRevealAfterUsage || renderedTier !== tier;
      renderedTier = tier;
      if (planName) planName.textContent = TIER_DISPLAY_NAMES[tier] || "Free Plan";

      if (hasSubscriptionPlan) {
        if (freePlanView) freePlanView.classList.add("hidden");
        if (paidPlanView) paidPlanView.classList.remove("hidden");
        if (shouldRevealAfterUsage) setCreditPackVisibility(false);
        const rawEnd = profile.current_period_end;
        if (renewalDate) {
          if (rawEnd) {
            const dt = new Date(rawEnd);
            renewalDate.innerHTML = `Current period ends: <strong>${dt.toLocaleDateString(
              undefined,
              { year: "numeric", month: "short", day: "numeric" },
            )}</strong>`;
          } else {
            renewalDate.innerHTML = `Subscription settings are available in Stripe.`;
          }
        }
      } else {
        if (paidPlanView) paidPlanView.classList.add("hidden");
        if (freePlanView) freePlanView.classList.remove("hidden");
        if (shouldRevealAfterUsage) setCreditPackVisibility(false);
      }

      if (shouldResetUsage) {
        setUsageLoadingUI(tier);
      }
      if (shouldRevealAfterUsage) {
        setView("signed-in");
      }

      sendRuntimeMessage({ type: "GET_USER_USAGE_COUNT" }).then((usage) => {
        if (requestId !== renderRequestId) return;
        updateUsageUI(usage || {}, tier);
      });
    } else {
      renderRequestId += 1;
      renderedTier = null;
      document.body.classList.remove("settings-active");
      setView("signed-out");
    }
  }

  function updateUsageUI(usage, fallbackTier) {
    const tier = normalizeTier(usage.tier || fallbackTier);
    const limits = usage.limits || TIER_LIMITS[tier] || TIER_LIMITS.free;
    const packCredits = Math.max(0, Number(usage.packCredits || 0));

    if (tier === "free") {
      const freeLimit = Number(usage.freeLifetimeLimit || FREE_LIFETIME_LIMIT);
      const freeUsed = Math.max(
        0,
        Math.min(Number(usage.freeLifetimeUsed || 0), freeLimit),
      );
      const freePercent =
        freeLimit > 0 ? Math.min((freeUsed / freeLimit) * 100, 100) : 0;

      if (dailyMeterLabel) dailyMeterLabel.textContent = "Free Listings";
      if (monthlyMeterLabel) monthlyMeterLabel.textContent = "Credit Pack";
      if (dailyCallsUsed) dailyCallsUsed.textContent = `${freeUsed} / ${freeLimit}`;
      if (monthlyCallsUsed)
        monthlyCallsUsed.textContent =
          packCredits > 0 ? `${packCredits} left` : "None";
      if (dailyProgressBar) dailyProgressBar.style.width = `${freePercent}%`;
      if (monthlyProgressBar)
        monthlyProgressBar.style.width = packCredits > 0 ? "100%" : "0%";

      updateUsageUpsell({
        tier,
        dailyPercent: freePercent,
        monthlyPercent: 0,
        packCredits,
        freeRemaining: Math.max(0, freeLimit - freeUsed),
      });
      return;
    }

    const dailyUsed = Math.max(0, Number(usage.daily || 0));
    const monthlyUsed = Math.max(0, Number(usage.monthly || 0));
    const dailyTotal = limits.daily;
    const monthlyTotal = limits.monthly;
    const hasDailyLimit = dailyTotal !== null && dailyTotal !== undefined;
    const displayDailyUsed = hasDailyLimit
      ? Math.min(dailyUsed, dailyTotal)
      : dailyUsed;
    const displayMonthlyUsed = Math.min(monthlyUsed, monthlyTotal);
    const dailyPercent =
      hasDailyLimit && dailyTotal > 0
        ? Math.min((dailyUsed / dailyTotal) * 100, 100)
        : 100;
    const monthlyPercent =
      monthlyTotal > 0 ? Math.min((monthlyUsed / monthlyTotal) * 100, 100) : 0;

    if (dailyMeterLabel) dailyMeterLabel.textContent = "Daily Usage";
    if (monthlyMeterLabel) monthlyMeterLabel.textContent = "Monthly Usage";
    if (dailyCallsUsed)
      dailyCallsUsed.textContent = hasDailyLimit
        ? `${displayDailyUsed} / ${dailyTotal}`
        : "No daily limit";
    if (monthlyCallsUsed)
      monthlyCallsUsed.textContent = `${displayMonthlyUsed} / ${monthlyTotal}`;
    if (dailyProgressBar) dailyProgressBar.style.width = `${dailyPercent}%`;
    if (monthlyProgressBar) monthlyProgressBar.style.width = `${monthlyPercent}%`;

    updateUsageUpsell({
      tier,
      dailyPercent,
      monthlyPercent,
      packCredits,
      isLegacy: Boolean(usage.isLegacy),
      hasDailyLimit,
    });
  }

  function updateUsageUpsell({
    tier,
    dailyPercent,
    monthlyPercent,
    packCredits,
    freeRemaining,
    isLegacy,
    hasDailyLimit = true,
  }) {
    if (usageLimitNote) usageLimitNote.style.display = "none";
    if (paidUpgradeBtn) paidUpgradeBtn.classList.add("hidden");
    setCreditPackVisibility(false);

    if (tier === "free") {
      if (usageLimitNote && packCredits > 0) {
        usageLimitNote.textContent = `Credit pack: ${packCredits} top-up credits available.`;
        usageLimitNote.style.display = "block";
      }
      const isNearFreeLimit = freeRemaining <= 1;
      setCreditPackVisibility(
        true,
        packCredits > 0
          ? `Add ${CREDIT_PACK.credits} more credits (${CREDIT_PACK.price})`
          : `Buy ${CREDIT_PACK.credits} extra credits (${CREDIT_PACK.price})`,
        { showSeparator: isNearFreeLimit || packCredits > 0 },
      );
      return;
    }

    const nextTier = NEXT_TIER[tier];
    const isNearLimit =
      (hasDailyLimit && dailyPercent >= 80) || monthlyPercent >= 80;
    const hasCredits = packCredits > 0;

    if (hasCredits && usageLimitNote) {
      usageLimitNote.textContent = `Credit pack: ${packCredits} top-up credits available.`;
      usageLimitNote.style.display = "block";
    }

    if (tier === "business") {
      if (isNearLimit && usageLimitNote) {
        usageLimitNote.textContent = hasCredits
          ? `Credit pack: ${packCredits} top-up credits available.`
          : "Business usage is high. Top-up credits are available if you need extra listings this cycle.";
        usageLimitNote.style.display = "block";
      }
      if (isNearLimit) {
        setCreditPackVisibility(true, `Buy ${CREDIT_PACK.credits} top-up credits (${CREDIT_PACK.price})`);
      }
      return;
    }

    if (isNearLimit && nextTier) {
      const nextLimits = TIER_LIMITS[nextTier];
      const dailyCopy =
        nextLimits.daily === null ? "no daily cap" : `${nextLimits.daily}/day`;
      if (usageLimitNote) {
        const legacyCopy = isLegacy ? " Your current legacy limits stay while this subscription remains active." : "";
        usageLimitNote.textContent = `${TIER_DISPLAY_NAMES[nextTier].replace(" Plan", "")}: ${dailyCopy} · ${nextLimits.monthly}/month.${legacyCopy}`;
        usageLimitNote.style.display = "block";
      }
      setPaidUpgradeButton(tier);
      if (paidUpgradeBtn) paidUpgradeBtn.classList.remove("hidden");
      setCreditPackVisibility(
        true,
        hasCredits
          ? `Add ${CREDIT_PACK.credits} more credits (${CREDIT_PACK.price})`
          : `Buy ${CREDIT_PACK.credits} top-up credits (${CREDIT_PACK.price})`,
      );
    }
  }

  // --- DATA & STATE MANAGEMENT ---

  /**
   * Reads the cached auth/profile state and renders from local extension storage.
   * Remote profile refreshes run separately so opening the popup does not block on
   * network or reveal stale default UI first.
   */
  async function updateFromStorage() {
    const data = await getLocalStorage(["supabaseSession", "userProfile"]);
    const user = data.supabaseSession?.user || null;
    const profile = data.userProfile || null;

    if (user && !profile) {
      setView("loading");
      refreshProfileInBackground({ force: true });
      return;
    }

    await render(user, profile);
  }

  async function refreshProfileInBackground({ force = false } = {}) {
    const now = Date.now();
    if (profileRefreshInFlight) return;
    if (!force && now - lastProfileRefreshAt < 15000) return;

    profileRefreshInFlight = true;
    lastProfileRefreshAt = now;
    try {
      const before = await getLocalStorage(["supabaseSession", "userProfile"]);
      const beforeKey = getRenderableStateKey(before);
      await sendRuntimeMessage({ type: "AUTH_UPDATED" });
      const after = await getLocalStorage(["supabaseSession", "userProfile"]);
      if (getRenderableStateKey(after) !== beforeKey) {
        await updateFromStorage();
        refreshSettingsAccess();
      }
    } finally {
      profileRefreshInFlight = false;
    }
  }

  // --- API & EVENT HANDLERS ---

  async function handleSendMagicLink() {
    if (!emailInput) return;
    const email = emailInput.value.trim();
    if (!email.includes("@")) {
      showMessage("Please enter a valid email address.", "error");
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

      let data;
      try {
        data = await res.json();
      } catch (parseError) {
        // Fallback if the server returns non-JSON (e.g. 504 Gateway Timeout HTML)
        throw new Error(
          res.ok
            ? "Invalid server response."
            : `Server error (${res.status}). Please try again later.`,
        );
      }

      if (!res.ok) {
        // Backend returns { error: "..." } for all known errors (disposable email, invalid email, etc.)
        throw new Error(data.error || "Failed to send magic link.");
      }

      // Backend returns { message: "..." } for success
      showMessage(
        data.message || "Check your email for the sign-in link.",
        "success",
      );
      emailInput.value = "";
    } catch (err) {
      showMessage(
        err.message || "Connection issue. Please check your internet.",
        "error",
      );
    } finally {
      setLoading(sendMagicLinkBtn, false, "Send Magic Link");
    }
  }

  function handleSignOut(event) {
    const button = event?.currentTarget || signOutBtn;
    setLoading(button, true, "Sign Out");
    chrome.runtime.sendMessage({ type: "SIGN_OUT" }, () => {
      restoreSignOutButtonContent(button);
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
      restoreUpgradeButtonContent();
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

  async function handleCreditPackPurchase() {
    const {
      data: { session },
    } = await supabaseClient.auth.getSession();
    if (!session?.user?.email) {
      showMessage("Please sign in to buy credits.", "error");
      return;
    }

    setLoading(creditPackBtn, true, "Loading…");
    try {
      const res = await fetch(`${API_BASE}/api/stripe/create-credit-checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: session.user.email }),
      });
      const { url, error } = await res.json();
      if (res.ok && url) {
        window.open(url, "_blank");
      } else {
        showMessage(error || "Unable to open the payment page.", "error");
      }
    } catch (err) {
      console.error("Credit checkout error:", err);
      showMessage("Connection issue. Please try again.", "error");
    } finally {
      restoreCreditPackButtonContent();
    }
  }

  function handleViewAllPlans(e) {
    if (e) e.preventDefault();
    chrome.runtime.sendMessage({ type: "GET_USER_PROFILE" }, (resp) => {
      const userData = {
        source: "extension",
        signed_in: !!resp?.user,
        plan: resp?.profile?.subscription_tier || "free",
        subscription_status: resp?.profile?.subscription_status || "free",
        email: resp?.user?.email || "",
        timestamp: Date.now(),
      };
      const token = encodeUserData(userData);
      if (token) {
        const url = `${API_BASE}/pricing?token=${token}`;
        window.open(url, "_blank");
      }
    });
  }

  // --- LANGUAGE DROPDOWN LOGIC ---
  function setupLanguageDropdown() {
    const browserLanguage = (navigator.language || "en").slice(0, 2);
    const fallbackCode = browserLanguage === "cs" ? "cz" : browserLanguage;

    const ready = new Promise((resolve) => {
      chrome.storage.local.get(
        [
          "selectedLanguage",
          "selectedTitleLanguage",
          "selectedDescriptionLanguage",
        ],
        (result) => {
          languageDropdowns.forEach((dropdown) => {
            const storageKey = dropdown.dataset.storageKey || "selectedLanguage";
            const dropdownToggle = dropdown.querySelector(".dropdown-toggle");
            const languageOptions = dropdown.querySelectorAll(".dropdown-menu li");
            const selectedValue =
              result[storageKey] || result.selectedLanguage || fallbackCode;
            const selectedItem = [...languageOptions].find(
              (item) => item.dataset.value === selectedValue,
            );

            if (selectedItem && dropdownToggle) {
              dropdownToggle.innerHTML = selectedItem.innerHTML;
              languageOptions.forEach((opt) => opt.classList.remove("selected"));
              selectedItem.classList.add("selected");
            }
          });

          resolve();
        },
      );
    });

    const closeAllDropdowns = () => {
      languageDropdowns.forEach((dropdown) => {
        const menu = dropdown.querySelector(".dropdown-menu");
        const toggle = dropdown.querySelector(".dropdown-toggle");
        if (menu) menu.classList.remove("visible");
        if (toggle) toggle.classList.remove("active");
      });
    };

    languageDropdowns.forEach((dropdown) => {
      const dropdownToggle = dropdown.querySelector(".dropdown-toggle");
      const dropdownMenu = dropdown.querySelector(".dropdown-menu");
      const languageOptions = dropdown.querySelectorAll(".dropdown-menu li");
      const storageKey = dropdown.dataset.storageKey || "selectedLanguage";

      const toggleDropdown = (show) => {
        if (dropdownMenu && dropdownToggle) {
          if (show) closeAllDropdowns();
          dropdownMenu.classList.toggle("visible", show);
          dropdownToggle.classList.toggle("active", show);
        }
      };

      if (dropdownToggle) {
        dropdownToggle.addEventListener("click", (e) => {
          e.stopPropagation();
          if (dropdownMenu) {
            toggleDropdown(!dropdownMenu.classList.contains("visible"));
          }
        });
      }

      languageOptions.forEach((li) => {
        li.addEventListener("click", () => {
          if (dropdownToggle) {
            dropdownToggle.innerHTML = li.innerHTML;
          }
          languageOptions.forEach((opt) => opt.classList.remove("selected"));
          li.classList.add("selected");
          toggleDropdown(false);
          chrome.storage.local.set({
            [storageKey]: li.dataset.value,
          });
        });
      });
    });

    document.addEventListener("click", (e) => {
      const clickedInsideLanguageDropdown = [...languageDropdowns].some(
        (dropdown) => dropdown.contains(e.target),
      );
      if (!clickedInsideLanguageDropdown) {
        closeAllDropdowns();
      }
    });

    return ready;
  }

  // --- SETTINGS LOGIC ---
  function setupSettings() {
    // Load saved settings and user profile for tier check
    chrome.storage.local.get(
      ["tone", "useEmojis", "useBulletPoints", "userProfile"],
      (result) => {
        const profile = result.userProfile || {};
        const tier = normalizeTier(profile.subscription_tier);
        const isActive = profile.subscription_status === "active";
        const hasProAccess =
          isActive && (tier === "pro" || tier === "business");

        // Set Tone
        const savedTone = result.tone || "standard";
        const toneInput = document.querySelector(
          `input[name="tone"][value="${savedTone}"]`,
        );
        if (toneInput) toneInput.checked = true;

        // Set Emojis
        if (emojiToggle) {
          // Default to false if not set
          emojiToggle.checked = result.useEmojis === true;
        }

        // Set Format
        // Default to true (bullets) if not set or undefined
        const useBulletPoints = result.useBulletPoints !== false;
        const formatValue = useBulletPoints ? "bullets" : "paragraphs";
        const formatInput = document.querySelector(
          `input[name="format"][value="${formatValue}"]`,
        );
        if (formatInput) formatInput.checked = true;

        // Apply tier gating AND reset if expired
        if (!hasProAccess) {
          // If they lost access but still have premium tone selected, reset to standard
          if (savedTone !== "standard") {
            const standardInput = document.querySelector(
              'input[name="tone"][value="standard"]',
            );
            if (standardInput) standardInput.checked = true;
            // Also update storage so it persists
            chrome.storage.local.set({ tone: "standard" });
          }

          // If they lost access but still have emojis on, turn them off
          if (result.useEmojis === true) {
            if (emojiToggle) emojiToggle.checked = false;
            // Also update storage
            chrome.storage.local.set({ useEmojis: false });
          }
        }

        updateSettingsAccess(hasProAccess);
      },
    );

    // Save Tone on change
    toneOptions.forEach((radio) => {
      radio.addEventListener("change", (e) => {
        if (e.target.checked && !e.target.disabled) {
          chrome.storage.local.set({ tone: e.target.value });
        }
      });
    });

    // Save Emojis on change
    if (emojiToggle) {
      emojiToggle.addEventListener("change", (e) => {
        if (!e.target.disabled) {
          chrome.storage.local.set({ useEmojis: e.target.checked });
        }
      });
    }

    // Save Format on change
    formatOptions.forEach((radio) => {
      radio.addEventListener("change", (e) => {
        if (e.target.checked) {
          const isBullets = e.target.value === "bullets";
          chrome.storage.local.set({ useBulletPoints: isBullets });
        }
      });
    });
  }

  function refreshSettingsAccess() {
    chrome.storage.local.get(["userProfile"], (data) => {
      const profile = data.userProfile || {};
      const tier = normalizeTier(profile.subscription_tier);
      const isActive = profile.subscription_status === "active";
      const hasProAccess =
        isActive && (tier === "pro" || tier === "business");
      updateSettingsAccess(hasProAccess);
    });
  }

  function updateSettingsAccess(hasProAccess) {
    const toneContainer = document.querySelector(".tone-grid");
    const emojiContainer = document.querySelector(".toggle-container");
    const infoNote = document.querySelector(".info-note");
    const upgradeNote = document.querySelector(".upgrade-note");

    if (hasProAccess) {
      // Full access - enable everything
      toneOptions.forEach((radio) => {
        radio.disabled = false;
        const chip = radio.nextElementSibling;
        if (chip) chip.classList.remove("locked");
      });
      if (emojiToggle) {
        emojiToggle.disabled = false;
        if (emojiContainer) emojiContainer.classList.remove("locked");
      }
      if (infoNote) infoNote.style.display = "none";
      if (upgradeNote) upgradeNote.style.display = "none";
    } else {
      // Free tier - lock premium features
      toneOptions.forEach((radio) => {
        if (radio.value !== "standard") {
          radio.disabled = true;
          const chip = radio.nextElementSibling;
          if (chip) chip.classList.add("locked");
        }
      });
      if (emojiToggle) {
        emojiToggle.disabled = true;
        if (emojiContainer) emojiContainer.classList.add("locked");
      }
      if (infoNote) infoNote.style.display = "none";
      if (upgradeNote) upgradeNote.style.display = "flex";
    }
  }

  // --- INITIALIZATION ---
  async function init() {
    document
      .getElementById("googleSignIn")
      ?.addEventListener("click", async () => {
        const { data, error } = await supabaseClient.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: `chrome-extension://${chrome.runtime.id}/callback.html`,
            queryParams: { prompt: "select_account" },
          },
        });

        if (error || !data?.url) {
          console.error(
            error || new Error("Missing OAuth redirect URL from provider"),
          );
          alert("Google sign-in failed. Please try again in a moment.");
          return;
        }

        const popup = window.open(data.url, "_blank");
        if (!popup || popup.closed || typeof popup.closed === "undefined") {
          console.warn("OAuth popup was likely blocked by the browser.");
          alert(
            "We tried to open a Google sign-in window, but it may have been blocked by your browser. Please allow pop-ups for this extension and try again.",
          );
          return;
        }
        try {
          popup.focus();
        } catch (e) {
          console.debug("Unable to focus OAuth popup window.", e);
        }
      });

    if (sendMagicLinkBtn) {
      sendMagicLinkBtn.addEventListener("click", handleSendMagicLink);
    }
    if (signOutBtn) {
      signOutBtn.addEventListener("click", handleSignOut);
    }
    if (signOutBtnSettings) {
      signOutBtnSettings.addEventListener("click", handleSignOut);
    }
    if (upgradeBtn) {
      upgradeBtn.addEventListener("click", handleUpgrade);
    }
    if (paidUpgradeBtn) {
      paidUpgradeBtn.addEventListener("click", handleViewAllPlans);
    }
    if (manageBtn) {
      manageBtn.addEventListener("click", handleManageSubscription);
    }
    if (creditPackBtn) {
      creditPackBtn.addEventListener("click", handleCreditPackPurchase);
    }
    if (viewAllPlansLink) {
      viewAllPlansLink.addEventListener("click", handleViewAllPlans);
    }
    if (viewAllPlansLinkPaid) {
      viewAllPlansLinkPaid.addEventListener("click", handleViewAllPlans);
    }
    const settingsUpgradeLink = document.getElementById("settingsUpgradeLink");
    if (settingsUpgradeLink) {
      settingsUpgradeLink.addEventListener("click", handleViewAllPlans);
    }
    if (emailInput) {
      emailInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") handleSendMagicLink();
      });
    }

    const languageDropdownReady = setupLanguageDropdown();
    setupSettings();

    if (settingsToggleBtn) {
      settingsToggleBtn.addEventListener("click", toggleSettingsView);
    }

    // Listen for state changes from the background script. This is now the
    // primary way the UI stays in sync with auth and profile changes.
    chrome.storage.onChanged.addListener((changes) => {
      if (changes.supabaseSession || changes.userProfile) {
        if (profileRefreshInFlight && changes.userProfile && !changes.supabaseSession) {
          return;
        }
        updateFromStorage();
        refreshSettingsAccess(); // Update settings tier access when profile changes
      }
    });

    // Also refresh when the popup gains focus, to catch checkout/auth changes
    // from other tabs without blocking the initial popup render.
    window.addEventListener("focus", () => {
      refreshProfileInBackground();
    });

    // Initial load
    await languageDropdownReady;
    await updateFromStorage();
    refreshProfileInBackground();
  }

  init().catch((error) => {
    console.error("Popup initialization failed:", error);
    setView("signed-out");
  });
});
