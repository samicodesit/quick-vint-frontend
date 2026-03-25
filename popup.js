document.addEventListener("DOMContentLoaded", () => {
  // --- CONSTANTS & CONFIGURATION ---
  const API_BASE = "https://quick-vint.vercel.app";
  const SUPABASE_URL = "https://jqloiovdwjaornnfvmyu.supabase.co";
  const SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpxbG9pb3Zkd2phb3JubmZ2bXl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgyMDgzMzIsImV4cCI6MjA2Mzc4NDMzMn0.iFtkUorY1UqK8zamnwgjB-yhsXe0bJAA8YFm22bzc3A";

  // Fallback limits — overridden by /api/tier-config on load
  let TIER_LIMITS = {
    free: { daily: null, monthly: 4 }, // lifetime total (no daily cap)
    starter: { daily: 5, monthly: 75 },
    pro: { daily: 15, monthly: 300 },
    business: { daily: 50, monthly: 1000 },
  };

  const TIER_DISPLAY_NAMES = {
    free: "Free",
    starter: "Starter Plan",
    pro: "Pro Plan",
    business: "Business Plan",
  };

  // --- UI LOCALIZATION STATE ---
  let T = window.getUIStrings("en"); // current UI strings, set properly in init

  function applyUITranslations() {
    // Update all elements with data-i18n attribute
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      if (T[key]) {
        // For elements that contain child elements (like NEW badges, <strong>), preserve children
        if (el.children.length > 0) {
          // Find first text node and update it
          for (const node of el.childNodes) {
            if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
              node.textContent = T[key] + " ";
              break;
            }
          }
        } else {
          el.textContent = T[key];
        }
      }
    });
    // Update tier display names from current language
    TIER_DISPLAY_NAMES.free = T.freePlan;
    TIER_DISPLAY_NAMES.starter = T.starterPlan;
    TIER_DISPLAY_NAMES.pro = T.proPlan;
    TIER_DISPLAY_NAMES.business = T.businessPlan;
    // Update content language dropdown placeholder if no language is selected yet
    if (dropdownToggle && dropdownToggle.children.length === 0) {
      dropdownToggle.textContent = T.selectLanguage;
    }
  }

  function setupUILanguagePicker() {
    const select = document.getElementById("uiLanguageSelect");
    if (!select) return;
    // Populate options
    select.innerHTML = "";
    window.UI_LANGUAGES.forEach((lang) => {
      const opt = document.createElement("option");
      opt.value = lang.code;
      opt.textContent = lang.name;
      select.appendChild(opt);
    });
    // Set current value
    chrome.storage.local.get(["uiLanguage"], (result) => {
      if (result.uiLanguage) {
        select.value = result.uiLanguage;
      } else {
        const detected = window.detectUILanguageCode();
        select.value = detected;
        chrome.storage.local.set({ uiLanguage: detected });
      }
      T = window.getUIStrings(select.value);
      applyUITranslations();
      // Set up content language dropdown AFTER UI language is loaded
      // so that if no content language is saved, we default to the same language
      setupLanguageDropdown();
    });
    select.addEventListener("change", () => {
      chrome.storage.local.set({ uiLanguage: select.value });
      T = window.getUIStrings(select.value);
      applyUITranslations();
      // Re-render to update plan name etc.
      updateFromStorage();
    });
  }

  // Fetch authoritative limits from API (non-blocking)
  fetch(`${API_BASE}/api/tier-config`)
    .then((r) => (r.ok ? r.json() : null))
    .then((data) => {
      if (!data) return;
      for (const [tier, cfg] of Object.entries(data)) {
        if (cfg.limits) {
          TIER_LIMITS[tier] = {
            daily: cfg.limits.daily ?? null,
            monthly: cfg.limits.monthly,
          };
        }
        // displayName intentionally not overridden here;
        // applyUITranslations() sets localized tier names from T.*Plan keys
      }
      // Re-render usage UI with authoritative limits
      if (typeof updateFromStorage === "function") updateFromStorage();
    })
    .catch(() => {
      /* use fallback values */
    });

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
  const renewalDate = document.getElementById("renewalDate");
  const upgradeBtn = document.getElementById("upgradeBtn");
  const upgradeStarterBtn = document.getElementById("upgradeStarterBtn");
  const upgradeProBtn = document.getElementById("upgradeProBtn");
  const manageBtn = document.getElementById("manageBtn");
  const viewAllPlansLink = document.getElementById("viewAllPlansLink");
  const viewAllPlansLinkPaid = document.getElementById("viewAllPlansLinkPaid");
  const planName = document.getElementById("planName");
  const dailyProgressBar = document.getElementById("dailyProgressBar");
  const monthlyProgressBar = document.getElementById("monthlyProgressBar");
  const dailyCallsUsed = document.getElementById("dailyCallsUsed");
  const monthlyCallsUsed = document.getElementById("monthlyCallsUsed");
  const languageDropdown = document.querySelector(".language-dropdown");
  const dropdownToggle = document.querySelector(".dropdown-toggle");
  const dropdownMenu = document.querySelector(".dropdown-menu");
  const languageOptions = document.querySelectorAll(".dropdown-menu li");
  const settingsToggleBtn = document.getElementById("settingsToggleBtn");
  const gearIcon = document.querySelector(".gear-icon");
  const backIcon = document.querySelector(".back-icon");
  const toneOptions = document.querySelectorAll('input[name="tone"]');
  const emojiToggle = document.getElementById("emojiToggle");
  const formatOptions = document.querySelectorAll('input[name="format"]');

  // --- HELPER & UTILITY FUNCTIONS ---

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
    button.textContent = isLoading ? T.processing : defaultText;
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

  function render(user, profile, daily, monthly) {
    if (user && profile) {
      if (userEmailSpan) userEmailSpan.textContent = user.email;
      const status = profile.subscription_status || "free";
      const rawTier = profile.subscription_tier || "free";
      const tier = normalizeTier(rawTier);
      if (planName) planName.textContent = TIER_DISPLAY_NAMES[tier] || "?";

      // Update usage UI synchronously before switching view
      updateUsageUI(daily ?? 0, monthly ?? 0, tier);

      if (status === "active" && tier !== "free") {
        if (freePlanView) freePlanView.classList.add("hidden");
        if (paidPlanView) paidPlanView.classList.remove("hidden");
        const rawEnd = profile.current_period_end;
        const dateEl = document.getElementById("renewalDateValue");
        const labelEl = document.getElementById("renewalLabel");
        if (rawEnd && dateEl) {
          const dt = new Date(rawEnd);
          if (labelEl) labelEl.textContent = T.activeUntil || "Active until";
          dateEl.textContent = dt.toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
          });
        } else if (dateEl) {
          if (labelEl) labelEl.textContent = "";
          dateEl.textContent = T.activeSubscription || "Active subscription";
        }
      } else {
        if (paidPlanView) paidPlanView.classList.add("hidden");
        if (freePlanView) freePlanView.classList.remove("hidden");
      }
      document.body.dataset.view = "signed-in";
    } else {
      document.body.dataset.view = "signed-out";
    }
  }

  function updateUsageUI(dailyUsed, monthlyUsed, tier) {
    const totals = TIER_LIMITS[tier] || TIER_LIMITS["free"];
    const isFree = totals.daily === null;
    const dailyMeter = document.getElementById("dailyMeter");
    const usageMeters = document.getElementById("usageMeters");
    const monthlyUsageLabel = document.getElementById("monthlyUsageLabel");

    if (isFree) {
      // Free tier: hide daily meter, show lifetime total.
      // api_calls_this_month is intentionally never reset for free users (see reset-counts.ts),
      // so it accurately represents lifetime usage.
      if (dailyMeter) dailyMeter.classList.add("hidden");
      if (monthlyUsageLabel) {
        monthlyUsageLabel.setAttribute("data-i18n", "totalUsage");
        monthlyUsageLabel.textContent = T.totalUsage || "Total Usage";
      }
      const totalLimit = totals.monthly;
      const displayTotal = Math.min(monthlyUsed, totalLimit);
      const totalPercent =
        totalLimit > 0 ? Math.min((monthlyUsed / totalLimit) * 100, 100) : 0;
      if (monthlyCallsUsed)
        monthlyCallsUsed.textContent = `${displayTotal} / ${totalLimit}`;
      if (monthlyProgressBar)
        monthlyProgressBar.style.width = `${totalPercent}%`;
      if (usageMeters) usageMeters.classList.add("loaded");
    } else {
      // Paid tiers: show both daily and monthly meters
      if (dailyMeter) dailyMeter.classList.remove("hidden");
      if (monthlyUsageLabel) {
        monthlyUsageLabel.setAttribute("data-i18n", "monthlyUsage");
        monthlyUsageLabel.textContent = T.monthlyUsage || "Monthly Usage";
      }
      const dailyTotal = totals.daily;
      const monthlyTotal = totals.monthly;
      const displayDailyUsed = Math.min(dailyUsed, dailyTotal);
      const displayMonthlyUsed = Math.min(monthlyUsed, monthlyTotal);
      const dailyPercent =
        dailyTotal > 0 ? Math.min((dailyUsed / dailyTotal) * 100, 100) : 0;
      const monthlyPercent =
        monthlyTotal > 0
          ? Math.min((monthlyUsed / monthlyTotal) * 100, 100)
          : 0;
      if (dailyCallsUsed)
        dailyCallsUsed.textContent = `${displayDailyUsed} / ${dailyTotal}`;
      if (monthlyCallsUsed)
        monthlyCallsUsed.textContent = `${displayMonthlyUsed} / ${monthlyTotal}`;
      if (dailyProgressBar) dailyProgressBar.style.width = `${dailyPercent}%`;
      if (monthlyProgressBar)
        monthlyProgressBar.style.width = `${monthlyPercent}%`;
      if (usageMeters) usageMeters.classList.add("loaded");
    }
  }

  // --- DATA & STATE MANAGEMENT ---

  /**
   * Reads user state (profile + usage) in a single message and triggers a render.
   */
  function updateFromStorage() {
    chrome.runtime.sendMessage({ type: "GET_USER_STATE" }, (resp) => {
      const user = resp?.user || null;
      const profile = resp?.profile || null;
      render(user, profile, resp?.daily ?? 0, resp?.monthly ?? 0);
    });
  }

  /** Full refresh: re-fetch profile from DB then render. Use for explicit user actions / initial load only. */
  function forceRefreshAndRender() {
    chrome.runtime.sendMessage({ type: "AUTH_UPDATED" }, () => {
      updateFromStorage();
    });
  }

  // --- API & EVENT HANDLERS ---

  async function handleSendMagicLink() {
    if (!emailInput) return;
    const email = emailInput.value.trim();
    if (!email.includes("@")) {
      showMessage(T.pleaseEnterValidEmail, "error");
      return;
    }
    setLoading(sendMagicLinkBtn, true, T.sendMagicLink);
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
      showMessage(data.message || T.checkEmailForLink, "success");
      emailInput.value = "";
    } catch (err) {
      showMessage(err.message || T.connectionIssue, "error");
    } finally {
      setLoading(sendMagicLinkBtn, false, T.sendMagicLink);
    }
  }

  function handleSignOut() {
    setLoading(signOutBtn, true, T.signOut);
    chrome.runtime.sendMessage({ type: "SIGN_OUT" }, () => {
      setLoading(signOutBtn, false, T.signOut);
    });
  }

  async function handleUpgrade(tier, btn) {
    const {
      data: { session },
    } = await supabaseClient.auth.getSession();
    if (!session?.user?.email) {
      showMessage(T.pleaseSignInToUpgrade, "error");
      return;
    }
    const label = btn ? btn.textContent : "Loading…";
    setLoading(btn || upgradeBtn, true, "Loading…");
    try {
      const res = await fetch(`${API_BASE}/api/stripe/create-checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: session.user.email, tier }),
      });
      const { url } = await res.json();
      if (res.ok && url) {
        window.open(url, "_blank", "noopener");
      } else {
        showMessage(T.unableToOpenPayment, "error");
      }
    } catch (err) {
      console.error("Checkout error:", err);
      showMessage(T.connectionIssue, "error");
    } finally {
      setLoading(btn || upgradeBtn, false, label);
    }
  }

  async function handleManageSubscription() {
    const {
      data: { session },
    } = await supabaseClient.auth.getSession();
    if (!session?.user?.email) {
      showMessage(T.pleaseSignInToManage, "error");
      return;
    }
    setLoading(manageBtn, true, T.processing);
    try {
      const res = await fetch(`${API_BASE}/api/stripe/create-portal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: session.user.email }),
      });
      const { url } = await res.json();
      if (res.ok && url) {
        window.open(url, "_blank", "noopener");
      } else {
        showMessage(T.unableToOpenSubscription, "error");
      }
    } catch (err) {
      console.error("Portal error:", err);
      showMessage(T.connectionIssue, "error");
    } finally {
      setLoading(manageBtn, false, T.manageSubscription);
    }
  }

  function handleViewAllPlans(e) {
    if (e) e.preventDefault();
    chrome.runtime.sendMessage({ type: "GET_USER_STATE" }, (resp) => {
      const userData = {
        source: "extension",
        signed_in: !!resp?.user,
        plan: resp?.profile?.subscription_tier || "free",
        email: resp?.user?.email || "",
        timestamp: Date.now(),
      };
      const token = encodeUserData(userData);
      if (token) {
        const url = `https://quick-vint.vercel.app/pricing?token=${encodeURIComponent(token)}`;
        window.open(url, "_blank", "noopener");
      }
    });
  }

  // --- LANGUAGE DROPDOWN LOGIC ---
  function setupLanguageDropdown() {
    chrome.storage.local.get(["selectedLanguage"], (result) => {
      let langCode = result.selectedLanguage;
      // Auto-detect content language on first use
      if (!langCode) {
        const detected = window.detectUILanguageCode();
        // Map UI language codes to content language codes (they match)
        langCode = detected;
        chrome.storage.local.set({ selectedLanguage: langCode });
      }
      const selectedItem = [...languageOptions].find(
        (item) => item.dataset.value === langCode,
      );
      if (selectedItem && dropdownToggle) {
        dropdownToggle.innerHTML = selectedItem.innerHTML;
        languageOptions.forEach((opt) => opt.classList.remove("selected"));
        selectedItem.classList.add("selected");
      } else if (dropdownToggle) {
        dropdownToggle.textContent = T.selectLanguage;
      }
    });
    const toggleDropdown = (show) => {
      if (dropdownMenu && dropdownToggle) {
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
        chrome.storage.local.set({ selectedLanguage: li.dataset.value });
      });
    });
    document.addEventListener("click", (e) => {
      if (languageDropdown && !languageDropdown.contains(e.target)) {
        toggleDropdown(false);
      }
    });
  }

  // --- SETTINGS LOGIC ---
  function setupSettings() {
    // Load saved settings and user profile for tier check
    chrome.storage.local.get(
      ["tone", "useEmojis", "useBulletPoints", "userProfile"],
      (result) => {
        const profile = result.userProfile || {};
        const tier = normalizeTier(profile.subscription_tier);
        const hasProAccess = tier === "pro" || tier === "business";

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
      const hasProAccess = tier === "pro" || tier === "business";
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
  function init() {
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
          alert(T.googleSignInFailed);
          return;
        }

        const popup = window.open(data.url, "_blank", "noopener");
        if (!popup || popup.closed || typeof popup.closed === "undefined") {
          console.warn("OAuth popup was likely blocked by the browser.");
          alert(T.popupBlocked);
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
      upgradeBtn.addEventListener("click", () =>
        handleUpgrade("starter", upgradeBtn),
      );
    }
    if (upgradeStarterBtn) {
      upgradeStarterBtn.addEventListener("click", () =>
        handleUpgrade("starter", upgradeStarterBtn),
      );
    }
    if (upgradeProBtn) {
      upgradeProBtn.addEventListener("click", () =>
        handleUpgrade("pro", upgradeProBtn),
      );
    }
    if (manageBtn) {
      manageBtn.addEventListener("click", handleManageSubscription);
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

    setupSettings();
    setupUILanguagePicker(); // also calls setupLanguageDropdown internally

    if (settingsToggleBtn) {
      settingsToggleBtn.addEventListener("click", toggleSettingsView);
    }

    // Listen for state changes from the background script. This is now the
    // primary way the UI stays in sync with auth and profile changes.
    chrome.storage.onChanged.addListener((changes) => {
      if (changes.supabaseSession || changes.userProfile) {
        updateFromStorage();
        refreshSettingsAccess(); // Update settings tier access when profile changes
      }
    });

    // Also update when the popup gains focus, to catch changes from other tabs.
    window.addEventListener("focus", forceRefreshAndRender);

    // Initial load — force refresh to get fresh data from DB
    forceRefreshAndRender();
  }

  init();
});
