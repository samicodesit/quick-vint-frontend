(() => {
  const SUPABASE_URL = "https://jqloiovdwjaornnfvmyu.supabase.co";
  const SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpxbG9pb3Zkd2phb3JubmZ2bXl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgyMDgzMzIsImV4cCI6MjA2Mzc4NDMzMn0.iFtkUorY1UqK8zamnwgjB-yhsXe0bJAA8YFm22bzc3A";
  const API_BASE = "https://autolister.app";

  const supabaseFactory = window.supabase || window.supabaseJs;
  if (!supabaseFactory?.createClient) {
    console.error(
      "Supabase client not found on window. Check lib/supabase.js load order.",
    );

    // Provide user-facing feedback if Supabase failed to load.
    const loadingDivFallback = document.getElementById("loadingState");
    const errorDivFallback = document.getElementById("errorState");
    const errorMsgFallback = document.getElementById("errorMessage");
    if (loadingDivFallback) {
      loadingDivFallback.classList.add("hidden");
    }
    if (errorDivFallback) {
      errorDivFallback.classList.remove("hidden");
    }
    if (errorMsgFallback) {
      errorMsgFallback.textContent =
        "We’re having trouble connecting to our service. Please check your internet connection and try reloading the page.";
    }

    return;
  }

  const supabaseClient = supabaseFactory.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
  );

  const loadingDiv = document.getElementById("loadingState");
  const successDiv = document.getElementById("successState");
  const errorDiv = document.getElementById("errorState");
  const errorMsg = document.getElementById("errorMessage");
  const ANALYTICS_CLIENT_ID_KEY = "analyticsClientId";

  // Global state
  let currentLocalization = null;
  let userSession = null;
  let authSuccessTracked = false;
  let callbackActionTaken = false;
  let analyticsClientId = null;

  // Localization methods are now loaded from lib/localization.js

  function localizeContent(localization) {
    const elements = {
      "success-title": "welcomeTitle",
      "success-subtitle": "welcomeSubtitle",
      "close-tab": "closeTabButton",
      "privacy-link": "privacyLink",
      "terms-link": "termsLink",
    };

    Object.entries(elements).forEach(([elementId, textKey]) => {
      const element = document.getElementById(elementId);
      if (element && localization.texts[textKey]) {
        element.textContent = localization.texts[textKey];
      }
    });

    // Keep sign-in success focused. The install welcome page handles onboarding.
    const welcomeMsgEl = document.getElementById("welcome-message");
    if (welcomeMsgEl) {
      welcomeMsgEl.innerHTML = `
        <div class="onboarding-section">
            <p class="onboarding-text">${localization.texts.welcomeMessage}</p>
        </div>
      `;
    }

    // Update language toggle button
    updateLanguageToggle();
  }

  function createAnalyticsClientId() {
    if (crypto?.randomUUID) return crypto.randomUUID();
    return `cid_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  }

  function ensureAnalyticsClientId() {
    return new Promise((resolve) => {
      chrome.storage.local.get(ANALYTICS_CLIENT_ID_KEY, (data) => {
        if (data[ANALYTICS_CLIENT_ID_KEY]) {
          analyticsClientId = data[ANALYTICS_CLIENT_ID_KEY];
          resolve(analyticsClientId);
          return;
        }

        analyticsClientId = createAnalyticsClientId();
        chrome.storage.local.set(
          { [ANALYTICS_CLIENT_ID_KEY]: analyticsClientId },
          () => resolve(analyticsClientId),
        );
      });
    });
  }

  function trackCallbackEvent(event, context = {}) {
    if (!userSession?.access_token) return;

    const send = (clientId) => {
      fetch(`${API_BASE}/api/events/track`, {
        method: "POST",
        keepalive: true,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userSession.access_token}`,
        },
        body: JSON.stringify({
          event,
          source: "extension_callback",
          page: "callback",
          context: {
            ...context,
            analyticsClientId: clientId,
          },
        }),
      }).catch(() => {
        // Analytics must never block login completion.
      });
    };

    if (analyticsClientId) {
      send(analyticsClientId);
      return;
    }

    ensureAnalyticsClientId().then(send).catch(() => {});
  }

  function trackAuthSuccess(session, eventName) {
    if (authSuccessTracked || !session?.access_token) return;
    authSuccessTracked = true;
    userSession = session;
    trackCallbackEvent("auth_success", {
      auth_event: eventName,
    });
  }

  function updateLanguageToggle() {
    const langToggle = document.getElementById("lang-toggle");
    const langCurrent = document.getElementById("lang-current");
    const langAlternative = document.getElementById("lang-alternative");

    if (langToggle && langCurrent && langAlternative) {
      const currentLang = Object.keys(LOCALIZATION).find(
        (key) => LOCALIZATION[key] === currentLocalization,
      );
      const detectedLang = Object.keys(LOCALIZATION).find(
        (key) => LOCALIZATION[key] === detectCountryAndLocalization(),
      );

      // Always show: [DetectedLang] | [EN] - positions never change
      langCurrent.textContent = detectedLang || "AUTO";
      langAlternative.textContent = "EN";

      // Reset styles first
      langCurrent.classList.remove("lang-active", "lang-inactive");
      langAlternative.classList.remove("lang-active", "lang-inactive");

      if (currentLang === "DEFAULT") {
        // Currently showing English - EN is active (right side)
        langCurrent.classList.add("lang-inactive");
        langAlternative.classList.add("lang-active");
        langToggle.onclick = () => switchLanguage("auto");
      } else {
        // Currently showing local language - local lang is active (left side)
        langCurrent.classList.add("lang-active");
        langAlternative.classList.add("lang-inactive");
        langToggle.onclick = () => switchLanguage("DEFAULT");
      }
    }
  }

  function switchLanguage(targetLang) {
    if (targetLang === "auto") {
      currentLocalization = detectCountryAndLocalization();
      // Store user preference for detected language
      localStorage.setItem("autoListerLanguage", "auto");
    } else {
      currentLocalization = LOCALIZATION.DEFAULT;
      // Store user preference for English
      localStorage.setItem("autoListerLanguage", "en");
    }

    localizeContent(currentLocalization);
    updateLanguageToggle();
  }

  function getStoredLanguagePreference() {
    try {
      const stored = localStorage.getItem("autoListerLanguage");
      if (stored === "en") {
        return LOCALIZATION.DEFAULT;
      } else if (stored === "auto") {
        return detectCountryAndLocalization();
      }
    } catch (e) {
      console.warn("Could not access localStorage:", e);
    }
    // Default to detected language for new users
    return detectCountryAndLocalization();
  }

  function show(state, msg = "") {
    [loadingDiv, successDiv, errorDiv].forEach(
      (el) => el && el.classList.add("hidden"),
    );

    if (state === "loading") {
      loadingDiv?.classList.remove("hidden");
    } else if (state === "success") {
      successDiv?.classList.remove("hidden");
      initializeSuccessActions();
    } else if (state === "error") {
      errorDiv?.classList.remove("hidden");
      if (errorMsg && msg) {
        errorMsg.textContent = msg;
      }
    }
  }

  function initializeSuccessActions() {
    // Use stored language preference instead of always detecting
    currentLocalization = getStoredLanguagePreference();

    // Apply localization first (above the fold priority)
    localizeContent(currentLocalization);

    // Initialize close tab button
    const closeTabBtn = document.getElementById("close-tab");
    if (closeTabBtn) {
      closeTabBtn.onclick = () => {
        callbackActionTaken = true;
        trackCallbackEvent("auth_close_click");
        window.close();
        setTimeout(() => {
          if (!document.hidden && currentLocalization?.texts?.closeTabFallback) {
            closeTabBtn.textContent = currentLocalization.texts.closeTabFallback;
          }
        }, 300);
      };
    }

    setTimeout(() => {
      trackCallbackEvent("auth_auto_close_attempt", {
        has_opener: Boolean(window.opener),
      });
      window.close();
      setTimeout(() => {
        if (document.hidden) {
          callbackActionTaken = true;
        }
      }, 300);
    }, 700);
  }

  // ---- IMPORTANT: supports BOTH magic-link + Google OAuth return ----
  async function bootstrapAuthReturn() {
    try {
      const url = window.location.href;
      const searchParams = new URLSearchParams(window.location.search);
      const hasOAuthCode = !!searchParams.get("code");

      // Google OAuth returns ?code=... and MUST be exchanged for a session
      if (hasOAuthCode) {
        const { error } = await supabaseClient.auth.exchangeCodeForSession(url);
        if (error) {
          console.error("exchangeCodeForSession error:", error);
          show("error", error.message);
          return;
        }
      }

      // For magic links / already-established sessions, this nudges session init
      await supabaseClient.auth.getSession();
      // onAuthStateChange will handle the UI + storage
    } catch (e) {
      console.error("bootstrapAuthReturn failed:", e);
      show(
        "error",
        "Authentication failed. Please try signing in again.",
      );
    }
  }

  show("loading");

  supabaseClient.auth.onAuthStateChange((event, session) => {
    if ((event === "SIGNED_IN" || event === "INITIAL_SESSION") && session) {
      userSession = session; // Store for checkout functionality
      chrome.storage.local.set({ supabaseSession: session }, () => {
        chrome.runtime.sendMessage({ type: "AUTH_UPDATED" });
        trackAuthSuccess(session, event);
        show("success");
        console.log("✅ User authenticated:", session.user.email);
      });
    } else if (event === "SIGNED_OUT") {
      userSession = null;
      show(
        "error",
        "You have been signed out. Please try signing in again.",
      );
    } else {
      // Don't instantly fail here; some flows briefly emit non-session events.
      // We'll fail only if bootstrap can't produce a session.
    }
  });

  // Kick off auth handling for BOTH flows
  ensureAnalyticsClientId().catch(() => {});
  bootstrapAuthReturn();

  window.addEventListener("pagehide", () => {
    if (authSuccessTracked && !callbackActionTaken) {
      trackCallbackEvent("auth_callback_exit", {
        without_action: true,
      });
    }
  });

  // Add animation styles
  const style = document.createElement("style");
  style.textContent = `
    @keyframes slideInNotice {
      from { transform: translateX(100%) scale(0.8); opacity: 0; }
      to { transform: translateX(0) scale(1); opacity: 1; }
    }
  `;
  document.head.appendChild(style);
})();
