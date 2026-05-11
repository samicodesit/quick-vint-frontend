document.addEventListener("DOMContentLoaded", () => {
  // --- CONSTANTS & CONFIGURATION ---
  const API_BASE = "https://quick-vint.vercel.app";
  const SUPABASE_URL = "https://jqloiovdwjaornnfvmyu.supabase.co";
  const SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpxbG9pb3Zkd2phb3JubmZ2bXl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgyMDgzMzIsImV4cCI6MjA2Mzc4NDMzMn0.iFtkUorY1UqK8zamnwgjB-yhsXe0bJAA8YFm22bzc3A";

  // Legacy tier daily/monthly limits (rate-limiter based).
  // Legacy Business is unlimited daily; only the monthly cap applies.
  const TIER_LIMITS = {
    free: { daily: 2, monthly: 8 },
    starter: { daily: 15, monthly: 300 },
    pro: { daily: 40, monthly: 800 },
    business: { daily: Infinity, monthly: 1500 },
  };

  const TIER_DISPLAY_NAMES = {
    free: "Free",
    starter: "Starter",
    pro: "Pro",
    business: "Business",
    starter_v2: "Starter",
    plus: "Plus",
    pro_v2: "Pro",
    business_v2: "Business",
  };

  // Rollover caps for new credit-based tiers
  const ROLLOVER_CAPS = {
    starter_v2: 240,
    plus: 600,
    pro_v2: 1200,
    business_v2: 3000,
  };
  const PHONE_UPLOAD_MONTHLY_LIMIT = 5;

  // Next tier upgrade path and button label
  const NEXT_TIER_INFO = {
    free: { id: "starter_v2", label: "Upgrade to Starter — €5.99/mo" },
    starter_v2: { id: "plus", label: "Upgrade to Plus — €9.99/mo" },
    plus: { id: "pro_v2", label: "Upgrade to Pro — €14.99/mo" },
    pro_v2: { id: "business_v2", label: "Upgrade to Business — €24.99/mo" },
    business_v2: null,
  };

  // Features per tier for downgrade "you'll lose" message
  const TIER_FEATURES = {
    starter_v2: [],
    plus: ["Listing Preferences", "Smart Re-Gen"],
    pro_v2: [
      "Listing Preferences",
      "Smart Re-Gen",
      "Tone Control",
      "Emoji",
      "Multi-language batch",
      "Listing improvement tips",
      "Priority support",
    ],
    business_v2: [
      "Listing Preferences",
      "Smart Re-Gen",
      "Tone Control",
      "Emoji",
      "Multi-language batch",
      "Listing improvement tips",
      "Priority support",
      "Priority processing",
      "Dedicated support",
    ],
  };

  const LISTING_PREFS = [
    {
      id: "pet_free_home",
      label: "Pet-free home",
      help: "Adds this trust note when relevant.",
    },
    {
      id: "smoke_free_home",
      label: "Smoke-free home",
      help: "Adds this trust note when relevant.",
    },
  ];
  const LISTING_PREF_IDS = new Set(LISTING_PREFS.map((pref) => pref.id));

  // --- SUPABASE CLIENT ---
  const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // --- DOM ELEMENT REFERENCES ---
  const messagesDiv = document.getElementById("messages");
  const emailInput = document.getElementById("emailInput");
  const sendMagicLinkBtn = document.getElementById("sendMagicLinkBtn");
  const userEmailSpan = document.getElementById("userEmail");
  const signOutBtn = document.getElementById("signOutBtn");
  const signOutBtnSettings = document.getElementById("signOutBtnSettings");
  const paidPlanView = document.getElementById("paidPlanView");
  const renewalDate = document.getElementById("renewalDate");
  const upgradeBtn = document.getElementById("upgradeBtn");
  const manageBtn = document.getElementById("manageBtn");
  const viewAllPlansLink = document.getElementById("viewAllPlansLink");
  const planName = document.getElementById("planName");
  const legacyBadge = document.getElementById("legacyBadge");
  // Legacy meters
  const dailyProgressBar = document.getElementById("dailyProgressBar");
  const monthlyProgressBar = document.getElementById("monthlyProgressBar");
  const dailyCallsUsed = document.getElementById("dailyCallsUsed");
  const monthlyCallsUsed = document.getElementById("monthlyCallsUsed");
  // Settings
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
  const prefsSettingsGrid = document.getElementById("prefsSettingsGrid");
  const prefsSettingsUpgradeNote = document.getElementById(
    "prefsSettingsUpgradeNote",
  );
  const phoneUploadUsed = document.getElementById("phoneUploadUsed");
  const phoneUploadLimit = document.getElementById("phoneUploadLimit");
  const phoneUploadBar = document.getElementById("phoneUploadBar");
  const phoneUsageRow = document.querySelector(".phone-usage-row");

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

  function closeSettingsView() {
    document.body.classList.remove("settings-active");
    if (gearIcon && backIcon) {
      gearIcon.classList.remove("hidden");
      backIcon.classList.add("hidden");
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
      starter_v2: "starter_v2",
      plus: "plus",
      pro_v2: "pro_v2",
      business_v2: "business_v2",
    };
    return map[tier] || "free";
  }

  function isLegacyProfile(profile) {
    if (profile?.is_legacy_plan !== undefined) return !!profile.is_legacy_plan;
    return ["starter", "pro", "business"].includes(
      normalizeTier(profile?.subscription_tier),
    );
  }

  function getFeatureAccess(profile) {
    const tier = normalizeTier(profile?.subscription_tier);
    const isLegacy = isLegacyProfile(profile);
    return {
      hasPlusAccess:
        !isLegacy && ["plus", "pro_v2", "business_v2"].includes(tier),
      hasProAccess: isLegacy
        ? ["pro", "business"].includes(tier)
        : ["pro_v2", "business_v2"].includes(tier),
    };
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

  function sanitizeListingPreferences(preferences = []) {
    const normalized = preferences.flatMap((pref) =>
      pref === "smoke_pet_free" ? ["pet_free_home", "smoke_free_home"] : [pref],
    );
    return [...new Set(normalized)].filter((pref) =>
      LISTING_PREF_IDS.has(pref),
    );
  }

  function hasUnlimitedPhoneUploads(profile, tier, isSubscribed) {
    // Monthly cap applies only to free users; subscriptions and legacy plans are unlimited.
    return Boolean(isSubscribed) || isLegacyProfile(profile);
  }

  function renderPhoneUploadUsage(
    profile = null,
    tier = "free",
    isSubscribed = false,
  ) {
    const used = Number(profile?.phone_uploads_this_month || 0);
    const packCredits = Number(profile?.pack_credits || 0);
    const unlimited = hasUnlimitedPhoneUploads(profile, tier, isSubscribed);

    if (phoneUploadUsed) phoneUploadUsed.textContent = used;
    if (phoneUploadLimit)
      phoneUploadLimit.textContent = unlimited
        ? "∞"
        : packCredits > 0
          ? packCredits
          : PHONE_UPLOAD_MONTHLY_LIMIT;

    const denom = packCredits > 0 ? packCredits : PHONE_UPLOAD_MONTHLY_LIMIT;
    if (phoneUploadBar)
      phoneUploadBar.style.width = `${Math.min(100, (used / Math.max(1, denom)) * 100)}%`;
    if (phoneUploadBar) phoneUploadBar.classList.toggle("unlimited", unlimited);
    if (phoneUsageRow) phoneUsageRow.classList.toggle("hidden", unlimited);
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
      fr: "Flux de travail sécurisé : génération de texte uniquement, sans actions de masse automatisées sur le compte.",
      de: "Sicherer Workflow: nur Textgenerierung, keine automatisierten Massenaktionen auf dem Konto.",
      es: "Flujo seguro: solo generación de texto, sin acciones masivas automatizadas en la cuenta.",
      it: "Flusso di lavoro sicuro: solo generazione di testo, senza azioni di massa automatizzate sull'account.",
      nl: "Veilige workflow: alleen tekstgeneratie, geen geautomatiseerde massa-acties op je account.",
      pl: "Bezpieczny workflow: tylko generowanie tekstu, bez masowych zautomatyzowanych akcji na koncie.",
      cs: "Bezpečný workflow: pouze generování textu, bez automatizovaných hromadných akcí na účtu.",
      cz: "Bezpečný workflow: pouze generování textu, bez automatizovaných hromadných akcí na účtu.",
      da: "Sikkert workflow: kun tekstgenerering, ingen automatiserede massehandlinger på kontoen.",
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

  // --- PLAN CARD HELPERS ---

  function hideAllPlanViews() {
    const ids = [
      "creditsBlock",
      "legacyMeters",
      "exhaustedWall",
      "freeActionsArea",
      "upgradeArea",
      "paidPlanView",
      "legacyMigrateBanner",
      "downgradeBanner",
      "profileSyncNote",
    ];
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.classList.add("hidden");
    });
  }

  function setRenewalDate(profile) {
    const rawEnd = profile.current_period_end;
    if (!renewalDate) return;
    if (rawEnd) {
      const dt = new Date(rawEnd);
      renewalDate.innerHTML = `Active until: <strong>${dt.toLocaleDateString(
        undefined,
        {
          year: "numeric",
          month: "short",
          day: "numeric",
        },
      )}</strong>`;
    } else {
      renewalDate.innerHTML = `<strong>Active subscription</strong>`;
    }
  }

  function renderDowngradeBanner(profile) {
    const pendingTier = profile.pending_tier;
    const banner = document.getElementById("downgradeBanner");
    const textEl = document.getElementById("downgradeText");
    if (!pendingTier || !banner || !textEl) return;

    const normalizedPending = normalizeTier(pendingTier);
    const newCap = ROLLOVER_CAPS[normalizedPending] ?? 0;
    const dateStr = profile.current_period_end
      ? new Date(profile.current_period_end).toLocaleDateString(undefined, {
          month: "long",
          day: "numeric",
        })
      : "your next billing date";

    const currentTier = normalizeTier(profile.subscription_tier || "free");
    const currentFeatures = TIER_FEATURES[currentTier] || [];
    const pendingFeatures = TIER_FEATURES[normalizedPending] || [];
    const lostFeatures = currentFeatures.filter(
      (f) => !pendingFeatures.includes(f),
    );

    let text = `Plan changes ${dateStr}. Up to ${newCap} banked credits carry over; the rest expire.`;
    if (lostFeatures.length > 0) {
      const shown = lostFeatures.slice(0, 3).join(", ");
      const more =
        lostFeatures.length > 3 ? ` +${lostFeatures.length - 3} more` : "";
      text += ` You'll lose: ${shown}${more}.`;
    }

    textEl.textContent = text;
    banner.classList.remove("hidden");
  }

  function renderLegacyView(profile, tier) {
    const legacyMeters = document.getElementById("legacyMeters");
    if (legacyMeters) legacyMeters.classList.remove("hidden");

    chrome.runtime.sendMessage({ type: "GET_USER_USAGE_COUNT" }, (resp) => {
      const dailyUsed = resp?.daily ?? 0;
      const monthlyUsed = resp?.monthly ?? 0;
      updateLegacyMeters(dailyUsed, monthlyUsed, tier);
    });

    if (paidPlanView) paidPlanView.classList.remove("hidden");
    setRenewalDate(profile);

    const legacyBanner = document.getElementById("legacyMigrateBanner");
    if (legacyBanner) legacyBanner.classList.remove("hidden");
  }

  function renderFreeWithCredits(
    profile,
    totalCredits,
    subCredits,
    packCredits,
  ) {
    const creditsBlock = document.getElementById("creditsBlock");
    if (creditsBlock) creditsBlock.classList.remove("hidden");

    const totalEl = document.getElementById("creditsTotalVal");
    if (totalEl) totalEl.textContent = totalCredits;

    const hasSplit = packCredits > 0 && subCredits >= 0;
    const splitBlock = document.getElementById("creditsSplit");
    if (splitBlock) {
      if (hasSplit) {
        splitBlock.classList.remove("hidden");
        const subEl = document.getElementById("subCreditVal");
        if (subEl) subEl.textContent = subCredits;
        const packEl = document.getElementById("packCreditVal");
        if (packEl) packEl.textContent = packCredits;
        const resetBadge = document.getElementById("resetBadge");
        if (resetBadge) resetBadge.classList.add("hidden");
      } else {
        splitBlock.classList.add("hidden");
      }
    }

    const rolloverRow = document.getElementById("rolloverRow");
    if (rolloverRow) rolloverRow.classList.add("hidden");

    const listingsEl = document.getElementById("listingsVal");
    if (listingsEl) listingsEl.textContent = profile.api_calls_this_month ?? 0;

    const freeActionsArea = document.getElementById("freeActionsArea");
    if (freeActionsArea) freeActionsArea.classList.remove("hidden");
  }

  function renderExhaustedWall() {
    const wall = document.getElementById("exhaustedWall");
    if (wall) wall.classList.remove("hidden");
  }

  function renderSubscribedNewTier(profile, tier, subCredits, packCredits) {
    const creditsBlock = document.getElementById("creditsBlock");
    if (creditsBlock) creditsBlock.classList.remove("hidden");

    const rolloverCredits = profile.rollover_credits ?? 0;
    const cycleEnd = profile.credits_cycle_end;
    const totalCredits = subCredits + packCredits;

    const totalEl = document.getElementById("creditsTotalVal");
    if (totalEl) totalEl.textContent = totalCredits;

    // Always show split for subscribed users so they can see the breakdown
    const splitBlock = document.getElementById("creditsSplit");
    if (splitBlock) {
      splitBlock.classList.remove("hidden");
      const subEl = document.getElementById("subCreditVal");
      if (subEl) subEl.textContent = subCredits;
      const packEl = document.getElementById("packCreditVal");
      if (packEl) packEl.textContent = packCredits;

      const resetBadge = document.getElementById("resetBadge");
      if (resetBadge && cycleEnd) {
        const daysLeft = Math.max(
          0,
          Math.ceil((new Date(cycleEnd) - new Date()) / (1000 * 60 * 60 * 24)),
        );
        resetBadge.textContent = `resets ${daysLeft}d`;
        resetBadge.classList.remove("hidden");
      }
    }

    const rolloverCap = ROLLOVER_CAPS[tier] ?? 0;
    const rolloverRow = document.getElementById("rolloverRow");
    const rolloverVal = document.getElementById("rolloverVal");
    if (rolloverRow) {
      if (rolloverCap > 0 && rolloverCredits > 0) {
        rolloverRow.classList.remove("hidden");
        if (rolloverVal)
          rolloverVal.textContent = `${rolloverCredits} / ${rolloverCap}`;
      } else {
        rolloverRow.classList.add("hidden");
      }
    }

    const listingsEl = document.getElementById("listingsVal");
    if (listingsEl) listingsEl.textContent = profile.api_calls_this_month ?? 0;

    // Upgrade button (hidden for business_v2)
    const nextTier = NEXT_TIER_INFO[tier];
    const upgradeArea = document.getElementById("upgradeArea");
    if (upgradeArea) {
      if (nextTier) {
        upgradeArea.classList.remove("hidden");
        if (upgradeBtn) {
          upgradeBtn.textContent = nextTier.label;
          upgradeBtn.dataset.targetTier = nextTier.id;
        }
      } else {
        upgradeArea.classList.add("hidden");
      }
    }

    if (paidPlanView) paidPlanView.classList.remove("hidden");
    setRenewalDate(profile);
  }

  function renderFreeFallback(profile) {
    // Cached profile is missing credit fields — show a quiet sync state.
    const listingsEl = document.getElementById("listingsVal");
    const creditsBlock = document.getElementById("creditsBlock");
    if (creditsBlock) creditsBlock.classList.remove("hidden");
    const totalEl = document.getElementById("creditsTotalVal");
    if (totalEl) totalEl.textContent = "—";
    const splitBlock = document.getElementById("creditsSplit");
    if (splitBlock) splitBlock.classList.add("hidden");
    const rolloverRow = document.getElementById("rolloverRow");
    if (rolloverRow) rolloverRow.classList.add("hidden");
    if (listingsEl)
      listingsEl.textContent = profile.api_calls_this_month ?? "—";
    const syncNote = document.getElementById("profileSyncNote");
    if (syncNote) syncNote.classList.remove("hidden");
    const freeActionsArea = document.getElementById("freeActionsArea");
    if (freeActionsArea) freeActionsArea.classList.remove("hidden");
    console.warn(
      "Profile missing credit fields; rendered free fallback state.",
      profile,
    );
  }

  // --- UI RENDERING ---

  function render(user, profile) {
    if (!user) {
      closeSettingsView();
      document.body.dataset.view = "signed-out";
      renderPhoneUploadUsage();
      return;
    }

    if (userEmailSpan) userEmailSpan.textContent = user.email;

    hideAllPlanViews();

    if (!profile) {
      if (planName) planName.textContent = "Free";
      if (legacyBadge) legacyBadge.classList.add("hidden");
      renderFreeFallback({});
      renderPhoneUploadUsage();
      renderDowngradeBanner({});
      document.body.dataset.view = "signed-in";
      return;
    }

    const rawTier = profile.subscription_tier || "free";
    const tier = normalizeTier(rawTier);
    const status = profile.subscription_status || "free";

    // Infer legacy from is_legacy_plan field; fall back to tier name for older cached profiles
    const isLegacy =
      profile.is_legacy_plan !== undefined
        ? !!profile.is_legacy_plan
        : ["starter", "pro", "business"].includes(tier);

    const isNewSubscribed = status === "active" && !isLegacy && tier !== "free";
    const isPhoneUploadUnlimited = isLegacy
      ? ["starter", "pro", "business"].includes(tier)
      : isNewSubscribed;

    if (planName) planName.textContent = TIER_DISPLAY_NAMES[tier] || tier;
    if (legacyBadge) legacyBadge.classList.toggle("hidden", !isLegacy);

    const subCredits = profile.subscription_credits ?? null;
    const packCredits = profile.pack_credits ?? 0;
    const hasNewCreditData = subCredits !== null;

    if (isLegacy) {
      renderLegacyView(profile, tier);
    } else if (!hasNewCreditData) {
      renderFreeFallback(profile);
    } else if (!isNewSubscribed) {
      const totalCredits = subCredits + packCredits;
      if (totalCredits === 0) {
        renderExhaustedWall();
      } else {
        renderFreeWithCredits(profile, totalCredits, subCredits, packCredits);
      }
    } else {
      renderSubscribedNewTier(profile, tier, subCredits, packCredits);
    }

    renderDowngradeBanner(profile);
    renderPhoneUploadUsage(profile, tier, isPhoneUploadUnlimited);

    document.body.dataset.view = "signed-in";
  }

  function updateLegacyMeters(dailyUsed, monthlyUsed, tier) {
    const totals = TIER_LIMITS[tier] || TIER_LIMITS["free"];
    const dailyTotal = totals.daily;
    const monthlyTotal = totals.monthly;
    const dailyUnlimited = !Number.isFinite(dailyTotal);

    const displayMonthlyUsed = Math.min(monthlyUsed, monthlyTotal);
    const monthlyPercent =
      monthlyTotal > 0 ? Math.min((monthlyUsed / monthlyTotal) * 100, 100) : 0;

    if (dailyUnlimited) {
      if (dailyCallsUsed) dailyCallsUsed.textContent = "Unlimited";
      if (dailyProgressBar) dailyProgressBar.style.width = "100%";
    } else {
      const displayDailyUsed = Math.min(dailyUsed, dailyTotal);
      const dailyPercent =
        dailyTotal > 0 ? Math.min((dailyUsed / dailyTotal) * 100, 100) : 0;
      if (dailyCallsUsed)
        dailyCallsUsed.textContent = `${displayDailyUsed} / ${dailyTotal}`;
      if (dailyProgressBar) dailyProgressBar.style.width = `${dailyPercent}%`;
    }

    if (monthlyCallsUsed)
      monthlyCallsUsed.textContent = `${displayMonthlyUsed} / ${monthlyTotal}`;
    if (monthlyProgressBar)
      monthlyProgressBar.style.width = `${monthlyPercent}%`;
  }

  // --- DATA & STATE MANAGEMENT ---

  function getStoredAuthState(callback) {
    chrome.storage.local.get(["supabaseSession", "userProfile"], (data) => {
      callback({
        user: data.supabaseSession?.user || null,
        profile: data.userProfile || null,
      });
    });
  }

  function getCurrentUserEmail() {
    return new Promise((resolve) => {
      chrome.storage.local.get(["supabaseSession"], (data) => {
        resolve(data.supabaseSession?.user?.email || "");
      });
    });
  }

  function updateFromStorage({ refreshProfile = false } = {}) {
    getStoredAuthState(({ user, profile }) => {
      render(user, profile);

      if (!refreshProfile || !user) return;
      chrome.runtime.sendMessage({ type: "AUTH_UPDATED" }, (resp) => {
        if (chrome.runtime.lastError) {
          console.warn(
            "Unable to refresh auth state:",
            chrome.runtime.lastError.message,
          );
          return;
        }
        if (resp?.user || resp?.profile) {
          render(resp.user || user, resp.profile || profile);
          return;
        }
        getStoredAuthState(({ user: latestUser, profile: latestProfile }) => {
          render(latestUser, latestProfile);
        });
      });
    });
  }

  // --- PACK CHECKOUT & NUDGE ---

  async function getPackPurchasesCount() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { type: "GET_PACK_PURCHASES_COUNT" },
        (resp) => {
          resolve(resp?.count ?? 0);
        },
      );
    });
  }

  async function proceedPackCheckout(email, btn) {
    const originalText = btn?.textContent || "Buy Pack — €3.99";
    setLoading(btn, true, "Loading…");
    try {
      const res = await fetch(`${API_BASE}/api/stripe/create-pack-checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const { url } = await res.json();
      if (res.ok && url) {
        window.open(url, "_blank");
      } else {
        showMessage("Unable to open the payment page.", "error");
      }
    } catch (err) {
      console.error("Pack checkout error:", err);
      showMessage("Connection issue. Please try again.", "error");
    } finally {
      setLoading(btn, false, originalText);
    }
  }

  function showPackNudge(packCount, email) {
    const modal = document.getElementById("packNudgeModal");
    const bodyText = document.getElementById("nudgeBodyText");
    if (!modal || !bodyText) return;

    // Spec: trigger after the user has bought 2 packs (i.e. they're about to
    // buy a 3rd). Reflect what they've already spent to make the math hit.
    const spent = (packCount * 3.99).toFixed(2);
    const totalCredits = packCount * 15;
    bodyText.textContent = `You've spent €${spent} on packs (${totalCredits} credits). A Starter subscription is €5.99/mo for 80 credits — 2.7× more for less money.`;

    modal.dataset.email = email;
    modal.classList.remove("hidden");
  }

  async function handleBuyPack(btn) {
    const email = await getCurrentUserEmail();
    if (!email) {
      showMessage("Please sign in first.", "error");
      return;
    }
    const packCount = await getPackPurchasesCount();
    // After 2 prior packs (about to buy the 3rd), nudge to a subscription.
    if (packCount >= 2) {
      showPackNudge(packCount, email);
      return;
    }
    await proceedPackCheckout(email, btn);
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
        throw new Error(
          res.ok
            ? "Invalid server response."
            : `Server error (${res.status}). Please try again later.`,
        );
      }

      if (!res.ok) {
        throw new Error(data.error || "Failed to send magic link.");
      }

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
    setLoading(signOutBtnSettings, true, "Sign Out");
    chrome.runtime.sendMessage({ type: "SIGN_OUT" }, () => {
      setLoading(signOutBtn, false, "Sign Out");
      setLoading(signOutBtnSettings, false, "Sign Out");
      updateFromStorage();
    });
  }

  async function handleUpgrade() {
    const email = await getCurrentUserEmail();
    if (!email) {
      showMessage("Please sign in to upgrade.", "error");
      return;
    }
    const targetTier = upgradeBtn?.dataset.targetTier || "starter_v2";
    const originalText = upgradeBtn?.textContent || "Upgrade";
    setLoading(upgradeBtn, true, "Loading…");
    try {
      const res = await fetch(`${API_BASE}/api/stripe/create-checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, tier: targetTier }),
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
      setLoading(upgradeBtn, false, originalText);
    }
  }

  async function handleManageSubscription() {
    const email = await getCurrentUserEmail();
    if (!email) {
      showMessage("Please sign in to manage your subscription.", "error");
      return;
    }
    setLoading(manageBtn, true, "Loading…");
    try {
      const res = await fetch(`${API_BASE}/api/stripe/create-portal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
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
        const selectedLanguage =
          result.selectedLanguage === "cs" ? "cz" : result.selectedLanguage;
        if (selectedLanguage !== result.selectedLanguage) {
          chrome.storage.local.set({ selectedLanguage });
        }
        const selectedItem = [...languageOptions].find(
          (item) => item.dataset.value === selectedLanguage,
        );
        if (selectedItem && dropdownToggle) {
          dropdownToggle.innerHTML = selectedItem.innerHTML;
          languageOptions.forEach((opt) => opt.classList.remove("selected"));
          selectedItem.classList.add("selected");
        }
        applyTrustNoteLocalization(selectedLanguage);
      } else {
        const browserLanguage = (navigator.language || "en").slice(0, 2);
        applyTrustNoteLocalization(
          browserLanguage === "cs" ? "cz" : browserLanguage,
        );
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
  function renderListingPreferencesSettings() {
    if (!prefsSettingsGrid) return;
    prefsSettingsGrid.replaceChildren();

    LISTING_PREFS.forEach((pref) => {
      const item = document.createElement("label");
      item.className = "pref-option";
      item.dataset.prefId = pref.id;
      item.innerHTML = `
        <input type="checkbox" value="${pref.id}">
        <span class="pref-option-copy">
          <span class="pref-option-title">${pref.label}</span>
          <span class="pref-option-subtitle">${pref.help}</span>
        </span>
      `;
      prefsSettingsGrid.appendChild(item);
    });
  }

  function setupListingPreferencesSettings() {
    if (!prefsSettingsGrid) return;

    chrome.storage.local.get(["listingPreferences"], (result) => {
      const saved = sanitizeListingPreferences(result.listingPreferences || []);
      if ((result.listingPreferences || []).join("|") !== saved.join("|")) {
        chrome.storage.local.set({ listingPreferences: saved });
      }
      prefsSettingsGrid
        .querySelectorAll('input[type="checkbox"]')
        .forEach((input) => {
          input.checked = saved.includes(input.value);
        });
    });

    prefsSettingsGrid.addEventListener("change", (event) => {
      const target = event.target;
      if (
        !(target instanceof HTMLInputElement) ||
        target.type !== "checkbox" ||
        target.disabled
      )
        return;

      const checked = Array.from(
        prefsSettingsGrid.querySelectorAll('input[type="checkbox"]:checked'),
      ).map((input) => input.value);
      chrome.storage.local.set({
        listingPreferences: sanitizeListingPreferences(checked),
      });
    });
  }

  function setupSettings() {
    chrome.storage.local.get(
      [
        "tone",
        "useEmojis",
        "useBulletPoints",
        "userProfile",
        "listingPreferences",
      ],
      (result) => {
        const profile = result.userProfile || {};
        const { hasPlusAccess, hasProAccess } = getFeatureAccess(profile);

        const savedTone = result.tone || "standard";
        const toneInput = document.querySelector(
          `input[name="tone"][value="${savedTone}"]`,
        );
        if (toneInput) toneInput.checked = true;

        if (emojiToggle) {
          emojiToggle.checked = result.useEmojis === true;
        }

        const useBulletPoints = result.useBulletPoints !== false;
        const formatValue = useBulletPoints ? "bullets" : "paragraphs";
        const formatInput = document.querySelector(
          `input[name="format"][value="${formatValue}"]`,
        );
        if (formatInput) formatInput.checked = true;

        if (!hasProAccess) {
          if (savedTone !== "standard") {
            const standardInput = document.querySelector(
              'input[name="tone"][value="standard"]',
            );
            if (standardInput) standardInput.checked = true;
            chrome.storage.local.set({ tone: "standard" });
          }
          if (result.useEmojis === true) {
            if (emojiToggle) emojiToggle.checked = false;
            chrome.storage.local.set({ useEmojis: false });
          }
        }

        const savedPrefs = result.listingPreferences || [];
        if (!hasPlusAccess && savedPrefs.length > 0) {
          chrome.storage.local.set({ listingPreferences: [] });
        }

        updateSettingsAccess({ hasPlusAccess, hasProAccess });
      },
    );

    toneOptions.forEach((radio) => {
      radio.addEventListener("change", (e) => {
        if (e.target.checked && !e.target.disabled) {
          chrome.storage.local.set({ tone: e.target.value });
        }
      });
    });

    if (emojiToggle) {
      emojiToggle.addEventListener("change", (e) => {
        if (!e.target.disabled) {
          chrome.storage.local.set({ useEmojis: e.target.checked });
        }
      });
    }

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
      updateSettingsAccess(getFeatureAccess(profile));
    });
  }

  function updateSettingsAccess({ hasPlusAccess, hasProAccess }) {
    const emojiContainer = document.querySelector(".toggle-container");
    const infoNote = document.querySelector(".info-note");
    const upgradeNote = document.querySelector(".upgrade-note");

    if (hasProAccess) {
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

    if (prefsSettingsGrid) {
      prefsSettingsGrid.querySelectorAll(".pref-option").forEach((option) => {
        const input = option.querySelector('input[type="checkbox"]');
        if (!input) return;
        option.classList.toggle("locked", !hasPlusAccess);
        input.disabled = !hasPlusAccess;
        if (!hasPlusAccess) input.checked = false;
      });
    }

    if (prefsSettingsUpgradeNote) {
      prefsSettingsUpgradeNote.style.display = hasPlusAccess ? "none" : "flex";
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

    // Buy pack buttons (free actions area + exhausted wall)
    const buyPackBtn = document.getElementById("buyPackBtn");
    if (buyPackBtn) {
      buyPackBtn.addEventListener("click", () => handleBuyPack(buyPackBtn));
    }
    const buyPackExhaustedBtn = document.getElementById("buyPackExhaustedBtn");
    if (buyPackExhaustedBtn) {
      buyPackExhaustedBtn.addEventListener("click", () =>
        handleBuyPack(buyPackExhaustedBtn),
      );
    }

    // See plans link in exhausted wall
    const seePlansExhaustedLink = document.getElementById(
      "seePlansExhaustedLink",
    );
    if (seePlansExhaustedLink) {
      seePlansExhaustedLink.addEventListener("click", handleViewAllPlans);
    }

    // Legacy migration banner link
    const legacySeePlansLink = document.getElementById("legacySeePlansLink");
    if (legacySeePlansLink) {
      legacySeePlansLink.addEventListener("click", handleViewAllPlans);
    }

    // Pack nudge modal: switch to Starter
    const switchToStarterBtn = document.getElementById("switchToStarterBtn");
    if (switchToStarterBtn) {
      switchToStarterBtn.addEventListener("click", async () => {
        const modal = document.getElementById("packNudgeModal");
        const email = modal?.dataset.email;
        if (modal) modal.classList.add("hidden");
        if (!email) return;
        setLoading(switchToStarterBtn, true, "Switch to Starter — €5.99/mo");
        try {
          const res = await fetch(`${API_BASE}/api/stripe/create-checkout`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, tier: "starter_v2" }),
          });
          const { url } = await res.json();
          if (res.ok && url) {
            window.open(url, "_blank");
          } else {
            showMessage("Unable to open the payment page.", "error");
          }
        } catch (err) {
          console.error("Starter checkout error:", err);
          showMessage("Connection issue. Please try again.", "error");
        } finally {
          setLoading(switchToStarterBtn, false, "Switch to Starter — €5.99/mo");
        }
      });
    }

    // Pack nudge modal: no thanks, just the pack
    const justPackLink = document.getElementById("justPackLink");
    if (justPackLink) {
      justPackLink.addEventListener("click", async (e) => {
        e.preventDefault();
        const modal = document.getElementById("packNudgeModal");
        const email = modal?.dataset.email;
        if (modal) modal.classList.add("hidden");
        if (email) await proceedPackCheckout(email, null);
      });
    }

    const settingsUpgradeLink = document.getElementById("settingsUpgradeLink");
    if (settingsUpgradeLink) {
      settingsUpgradeLink.addEventListener("click", handleViewAllPlans);
    }
    const prefsUpgradeLink = document.getElementById("prefsUpgradeLink");
    if (prefsUpgradeLink) {
      prefsUpgradeLink.addEventListener("click", handleViewAllPlans);
    }
    if (emailInput) {
      emailInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") handleSendMagicLink();
      });
    }

    setupLanguageDropdown();
    renderListingPreferencesSettings();
    setupListingPreferencesSettings();
    setupSettings();

    if (settingsToggleBtn) {
      settingsToggleBtn.addEventListener("click", toggleSettingsView);
    }

    chrome.storage.onChanged.addListener((changes) => {
      if (changes.supabaseSession || changes.userProfile) {
        updateFromStorage();
        refreshSettingsAccess();
      }
      if (changes.listingPreferences && prefsSettingsGrid) {
        const saved = sanitizeListingPreferences(
          changes.listingPreferences.newValue || [],
        );
        prefsSettingsGrid
          .querySelectorAll('input[type="checkbox"]')
          .forEach((input) => {
            input.checked = saved.includes(input.value);
          });
      }
    });

    window.addEventListener("focus", () =>
      updateFromStorage({ refreshProfile: true }),
    );

    updateFromStorage({ refreshProfile: true });
  }

  init();
});
