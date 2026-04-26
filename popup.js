document.addEventListener("DOMContentLoaded", () => {
  // --- CONSTANTS & CONFIGURATION ---
  const API_BASE = "https://quick-vint.vercel.app";
  const SUPABASE_URL = "https://jqloiovdwjaornnfvmyu.supabase.co";
  const SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpxbG9pb3Zkd2phb3JubmZ2bXl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgyMDgzMzIsImV4cCI6MjA2Mzc4NDMzMn0.iFtkUorY1UqK8zamnwgjB-yhsXe0bJAA8YFm22bzc3A";
  const TIER_LIMITS = {
    free: { daily: 2, monthly: 8 },
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
  const trustNotes = document.querySelectorAll(".trust-note");
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
    button.textContent = isLoading ? "Processing…" : defaultText;
  }

  function encodeUserData(data) {
    try {
      return btoa(JSON.stringify(data));
    } catch (e) {
      console.error("Failed to encode user data:", e);
      return null;
    }
  }

  function getTrustNoteText(languageCode) {
    const code = (languageCode || "en").toLowerCase();
    const trustByLanguage = {
      en: "Safe workflow by design: text generation only, no automated mass account actions.",
      fr: "Flux de travail securise : generation de texte uniquement, sans actions de masse automatisees sur le compte.",
      de: "Sicherer Workflow: nur Textgenerierung, keine automatisierten Massenaktionen auf dem Konto.",
      es: "Flujo seguro: solo generacion de texto, sin acciones masivas automatizadas en la cuenta.",
      it: "Flusso di lavoro sicuro: solo generazione di testo, senza azioni di massa automatizzate sull'account.",
      nl: "Veilige workflow: alleen tekstgeneratie, geen geautomatiseerde massa-acties op je account.",
      pl: "Bezpieczny workflow: tylko generowanie tekstu, bez masowych zautomatyzowanych akcji na koncie.",
      cz: "Bezpecny workflow: pouze generovani textu, bez automatizovanych hromadnych akci na uctu.",
      da: "Sikkert workflow: kun tekstgenerering, ingen automatiserede massehandlinger pa kontoen.",
    };
    return trustByLanguage[code] || trustByLanguage.en;
  }

  function applyTrustNoteLocalization(languageCode) {
    if (!trustNotes || trustNotes.length === 0) return;
    const localizedText = getTrustNoteText(languageCode);
    trustNotes.forEach((node) => {
      node.textContent = localizedText;
    });
  }

  // --- UI RENDERING ---

  function render(user, profile) {
    if (user && profile) {
      if (userEmailSpan) userEmailSpan.textContent = user.email;
      const status = profile.subscription_status || "free";
      const rawTier = profile.subscription_tier || "free";
      const tier = normalizeTier(rawTier);
      if (planName) planName.textContent = TIER_DISPLAY_NAMES[tier] || "?";

      chrome.runtime.sendMessage({ type: "GET_USER_USAGE_COUNT" }, (resp) => {
        const dailyUsed =
          resp && typeof resp.daily === "number" ? resp.daily : 0;
        const monthlyUsed =
          resp && typeof resp.monthly === "number" ? resp.monthly : 0;

        updateUsageUI(dailyUsed, monthlyUsed, tier);
      });

      if (status === "active" && tier !== "free") {
        if (freePlanView) freePlanView.classList.add("hidden");
        if (paidPlanView) paidPlanView.classList.remove("hidden");
        const rawEnd = profile.current_period_end;
        if (renewalDate) {
          if (rawEnd) {
            const dt = new Date(rawEnd);
            renewalDate.innerHTML = `Active until: <strong>${dt.toLocaleDateString(
              undefined,
              { year: "numeric", month: "short", day: "numeric" },
            )}</strong>`;
          } else {
            renewalDate.innerHTML = `<strong>Active subscription</strong>`;
          }
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
    const dailyTotal = totals.daily;
    const monthlyTotal = totals.monthly;
    const displayDailyUsed = Math.min(dailyUsed, dailyTotal);
    const displayMonthlyUsed = Math.min(monthlyUsed, monthlyTotal);
    const dailyPercent =
      dailyTotal > 0 ? Math.min((dailyUsed / dailyTotal) * 100, 100) : 0;
    const monthlyPercent =
      monthlyTotal > 0 ? Math.min((monthlyUsed / monthlyTotal) * 100, 100) : 0;

    if (dailyCallsUsed)
      dailyCallsUsed.textContent = `${displayDailyUsed} / ${dailyTotal}`;
    if (monthlyCallsUsed)
      monthlyCallsUsed.textContent = `${displayMonthlyUsed} / ${monthlyTotal}`;
    if (dailyProgressBar) dailyProgressBar.style.width = `${dailyPercent}%`;
    if (monthlyProgressBar)
      monthlyProgressBar.style.width = `${monthlyPercent}%`;
    if (tier === "business") {
      if (dailyCallsUsed) dailyCallsUsed.textContent = `Unlimited`;
      if (dailyProgressBar) dailyProgressBar.style.width = "100%";
    }
  }

  // --- DATA & STATE MANAGEMENT ---

  /**
   * Refreshes user profile from database then reads from storage and triggers a render.
   * This ensures we always have fresh data, matching the instant update behavior of usage counters.
   */
  function updateFromStorage() {
    // First, trigger background to refresh profile from database
    chrome.runtime.sendMessage({ type: "AUTH_UPDATED" }, () => {
      // Then read the freshly updated storage and render
      chrome.storage.local.get(["supabaseSession", "userProfile"], (data) => {
        const user = data.supabaseSession?.user || null;
        const profile = data.userProfile || null;
        render(user, profile);
      });
    });
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

  function handleSignOut() {
    setLoading(signOutBtn, true, "Sign Out");
    chrome.runtime.sendMessage({ type: "SIGN_OUT" }, () => {
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
    if (e) e.preventDefault();
    chrome.runtime.sendMessage({ type: "GET_USER_PROFILE" }, (resp) => {
      const userData = {
        source: "extension",
        signed_in: !!resp?.user,
        plan: resp?.profile?.subscription_tier || "free",
        email: resp?.user?.email || "",
        timestamp: Date.now(),
      };
      const token = encodeUserData(userData);
      if (token) {
        const url = `https://quick-vint.vercel.app/pricing?token=${token}`;
        window.open(url, "_blank");
      }
    });
  }

  // --- LANGUAGE DROPDOWN LOGIC ---
  function setupLanguageDropdown() {
    chrome.storage.local.get(["selectedLanguage"], (result) => {
      if (result.selectedLanguage) {
        const selectedItem = [...languageOptions].find(
          (item) => item.dataset.value === result.selectedLanguage,
        );
        if (selectedItem && dropdownToggle) {
          dropdownToggle.innerHTML = selectedItem.innerHTML;
          languageOptions.forEach((opt) => opt.classList.remove("selected"));
          selectedItem.classList.add("selected");
        }
        applyTrustNoteLocalization(result.selectedLanguage);
      } else {
        const browserLanguage = (navigator.language || "en").slice(0, 2);
        const fallbackCode = browserLanguage === "cs" ? "cz" : browserLanguage;
        applyTrustNoteLocalization(fallbackCode);
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
        applyTrustNoteLocalization(li.dataset.value);
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

    setupLanguageDropdown();
    setupSettings();

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
    window.addEventListener("focus", updateFromStorage);

    // Initial load
    updateFromStorage();
  }

  init();
});
