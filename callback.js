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

  // Global state
  let currentLocalization = null;
  let userSession = null;

  // Localization methods are now loaded from lib/localization.js

  function localizeContent(localization) {
    const elements = {
      "success-title": "welcomeTitle",
      "success-subtitle": "welcomeSubtitle",
      "vinted-redirect": "vintedButton",
      "view-plans": "viewPlansButton",
      "close-tab": "closeTabButton",
      "features-title": "featuresTitle",
      "feature-1": "feature1",
      "feature-2": "feature2",
      "feature-3": "feature3",
      "feature-4": "feature4",
      "upgrade-title": "upgradeTitle",
      "upgrade-description": "upgradeDescription",
      "starter-features": "starterFeatures",
      "pro-features": "proFeatures",
      "business-features": "businessFeatures",
      "privacy-link": "privacyLink",
      "terms-link": "termsLink",
    };

    Object.entries(elements).forEach(([elementId, textKey]) => {
      const element = document.getElementById(elementId);
      if (element && localization.texts[textKey]) {
        if (
          elementId.includes("features") ||
          elementId === "starter-features" ||
          elementId === "pro-features" ||
          elementId === "business-features"
        ) {
          element.innerHTML = localization.texts[textKey];
        } else {
          element.textContent = localization.texts[textKey];
        }
      }
    });

    // Update welcome message to include the image and new text structure
    const welcomeMsgEl = document.getElementById("welcome-message");
    if (welcomeMsgEl) {
      welcomeMsgEl.innerHTML = `
        <div class="onboarding-section">
            <h3 class="onboarding-title">${localization.texts.onboardingTitle}</h3>
            <p class="onboarding-text">${localization.texts.welcomeMessage}</p>
            <div class="onboarding-image-container">
                <img 
                    src="images/onboard.png" 
                    alt="${localization.texts.onboardingImageAlt}" 
                    class="onboarding-image"
                />
            </div>
        </div>
      `;
    }

    // Update language toggle button
    updateLanguageToggle();
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

  async function handlePlanSelection(planTier) {
    if (!userSession?.user?.email) {
      alert("Please wait for authentication to complete before upgrading.");
      return;
    }

    const planCard = document.querySelector(`[data-plan="${planTier}"]`);
    const originalContent = planCard.innerHTML;

    // Show loading state
    planCard.innerHTML = `
      <div class="checkout-loading-container">
        <div class="checkout-spinner"></div>
        <div class="checkout-loading-text">Opening checkout...</div>
      </div>
    `;

    try {
      const response = await fetch(
        `${API_BASE}/api/stripe/create-checkout`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: userSession.user.email,
            tier: planTier,
          }),
        },
      );

      const data = await response.json();

      if (response.ok && data.url) {
        window.open(data.url, "_blank");
        // Restore original content after short delay
        setTimeout(() => {
          planCard.innerHTML = originalContent;
        }, 2000);
      } else {
        throw new Error(data.error || "Failed to create checkout session");
      }
    } catch (error) {
      console.error("Checkout error:", error);
      alert(
        "Unable to open checkout. Please try upgrading through the extension or contact support.",
      );
      planCard.innerHTML = originalContent;
    }
  }

  async function checkAndCustomizeForExistingSubscriber() {
    if (!userSession?.user?.email) return;

    try {
      // Check if user has an active subscription by calling your backend
      const response = await fetch(
        `${API_BASE}/api/check-subscription`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: userSession.user.email,
          }),
        },
      );

      if (response.ok) {
        const data = await response.json();

        if (data.hasActiveSubscription) {
          // User has an active subscription - customize the UI
          customizeUIForSubscriber(data.planTier, data.planName);
        }
      }
    } catch (error) {
      console.log("Could not check subscription status:", error);
      // Fail silently - just show the normal upgrade UI
    }
  }

  function customizeUIForSubscriber(planTier, planName) {
    // Update the welcome message
    const welcomeMessage = document.getElementById("welcome-message");
    if (welcomeMessage) {
      const currentLang = Object.keys(LOCALIZATION).find(
        (key) => LOCALIZATION[key] === currentLocalization,
      );

      const messages = {
        DEFAULT: `<strong>🎉 Welcome back!</strong> You're on the <strong>${planName}</strong> plan. Ready to create more amazing listings?`,
        FR: `<strong>🎉 Bon retour !</strong> Vous êtes sur le plan <strong>${planName}</strong>. Prêt à créer d'autres annonces fantastiques ?`,
        DE: `<strong>🎉 Willkommen zurück!</strong> Sie haben den <strong>${planName}</strong>-Plan. Bereit, weitere fantastische Anzeigen zu erstellen?`,
        ES: `<strong>🎉 ¡Bienvenido de nuevo!</strong> Tienes el plan <strong>${planName}</strong>. ¿Listo para crear más anuncios increíbles?`,
        IT: `<strong>🎉 Bentornato!</strong> Hai il piano <strong>${planName}</strong>. Pronto a creare altri annunci fantastici?`,
        NL: `<strong>🎉 Welkom terug!</strong> Je hebt het <strong>${planName}</strong> plan. Klaar om meer geweldige advertenties te maken?`,
      };

      welcomeMessage.innerHTML = messages[currentLang] || messages.DEFAULT;
      welcomeMessage.classList.add("subscriber-active");
    }

    // Update the upgrade section to show "Manage Subscription" instead
    const upgradeSection = document.querySelector(".upgrade-section");
    if (upgradeSection) {
      const currentLang = Object.keys(LOCALIZATION).find(
        (key) => LOCALIZATION[key] === currentLocalization,
      );

      const titles = {
        DEFAULT: "⚙️ Manage Your Subscription",
        FR: "⚙️ Gérer votre abonnement",
        DE: "⚙️ Ihr Abonnement verwalten",
        ES: "⚙️ Gestionar tu suscripción",
        IT: "⚙️ Gestisci il tuo abbonamento",
        NL: "⚙️ Beheer je abonnement",
      };

      const descriptions = {
        DEFAULT: `You're currently on the <strong>${planName}</strong> plan. Want to upgrade, downgrade, or manage your billing? Click below to access your customer portal.`,
        FR: `Vous êtes actuellement sur le plan <strong>${planName}</strong>. Vous voulez upgrader, downgrader ou gérer votre facturation ? Cliquez ci-dessous pour accéder à votre portail client.`,
        DE: `Sie haben derzeit den <strong>${planName}</strong>-Plan. Möchten Sie upgraden, downgraden oder Ihre Abrechnung verwalten? Klicken Sie unten, um auf Ihr Kundenportal zuzugreifen.`,
        ES: `Actualmente tienes el plan <strong>${planName}</strong>. ¿Quieres actualizar, degradar o gestionar tu facturación? Haz clic abajo para acceder a tu portal de cliente.`,
        IT: `Attualmente hai il piano <strong>${planName}</strong>. Vuoi fare l'upgrade, downgrade o gestire la fatturazione? Clicca qui sotto per accedere al tuo portale cliente.`,
        NL: `Je hebt momenteel het <strong>${planName}</strong> plan. Wil je upgraden, downgraden of je facturering beheren? Klik hieronder om toegang te krijgen tot je klantportaal.`,
      };

      upgradeSection.innerHTML = `
        <h3>${titles[currentLang] || titles.DEFAULT}</h3>
        <p>${descriptions[currentLang] || descriptions.DEFAULT}</p>
        <div class="cta-buttons mt-1-5">
          <button class="btn btn-primary" onclick="window.open('https://billing.stripe.com/p/login', '_blank')">
            ${
              currentLang === "DEFAULT"
                ? "Manage Billing"
                : currentLang === "FR"
                  ? "Gérer la facturation"
                  : currentLang === "DE"
                    ? "Abrechnung verwalten"
                    : currentLang === "ES"
                      ? "Gestionar facturación"
                      : currentLang === "IT"
                        ? "Gestisci fatturazione"
                        : currentLang === "NL"
                          ? "Beheer facturering"
                          : "Manage Billing"
            }
          </button>
        </div>
      `;
      upgradeSection.classList.add("subscriber-active");
    }

    // Update the View Plans button text
    const viewPlansBtn = document.getElementById("view-plans");
    if (viewPlansBtn) {
      const currentLang = Object.keys(LOCALIZATION).find(
        (key) => LOCALIZATION[key] === currentLocalization,
      );
      const buttonTexts = {
        DEFAULT: "Compare Plans",
        FR: "Comparer les plans",
        DE: "Pläne vergleichen",
        ES: "Comparar planes",
        IT: "Confronta piani",
        NL: "Vergelijk plannen",
      };
      viewPlansBtn.textContent =
        buttonTexts[currentLang] || buttonTexts.DEFAULT;

      // Update the click handler for existing subscribers
      viewPlansBtn.onclick = () => {
        const userData = {
          source: "extension",
          signed_in: !!userSession?.user?.email,
          plan: planTier.toLowerCase(),
          email: userSession?.user?.email || "",
          timestamp: Date.now(),
        };

        try {
          const token = btoa(JSON.stringify(userData));
          window.open(
            `${API_BASE}/pricing?token=${encodeURIComponent(
              token,
            )}`,
            "_blank",
          );
        } catch (error) {
          console.error("Failed to create token:", error);
          const params = new URLSearchParams({
            source: "extension",
            signed_in: "true",
            plan: planTier.toLowerCase(),
            from: "subscriber_compare",
            lang: userData.lang,
          });
          window.open(
            `${API_BASE}/pricing?${params.toString()}`,
            "_blank",
          );
        }
      };
    }
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

    // Initialize Vinted redirect
    const vintedBtn = document.getElementById("vinted-redirect");
    if (vintedBtn) {
      const vintedUrl = `https://www.${currentLocalization.domain}/items/new`;
      vintedBtn.onclick = () => {
        window.open(vintedUrl, "_blank");
        setTimeout(() => window.close(), 800);
      };
    }

    // Initialize view plans button
    const plansBtn = document.getElementById("view-plans");
    if (plansBtn) {
      plansBtn.onclick = () => {
        const userData = {
          source: "extension",
          signed_in: !!userSession?.user?.email,
          plan: "free",
          email: userSession?.user?.email || "",
          timestamp: Date.now(),
        };

        try {
          const token = btoa(JSON.stringify(userData));
          window.open(
            `${API_BASE}/pricing?token=${encodeURIComponent(
              token,
            )}`,
            "_blank",
          );
        } catch (error) {
          console.error("Failed to create token:", error);
          const params = new URLSearchParams({
            source: "extension",
            signed_in: "true",
            plan: "free",
            from: "auth_success",
            lang: userData.lang,
          });
          window.open(
            `${API_BASE}/pricing?${params.toString()}`,
            "_blank",
          );
        }
      };
    }

    // Initialize plan card click handlers
    const starterCard = document.getElementById("starter-card");
    const proCard = document.getElementById("pro-card");
    const businessCard = document.getElementById("business-card");

    if (starterCard) starterCard.onclick = () => handlePlanSelection("starter");
    if (proCard) proCard.onclick = () => handlePlanSelection("pro");
    if (businessCard)
      businessCard.onclick = () => handlePlanSelection("business");

    // Initialize close tab button
    const closeTabBtn = document.getElementById("close-tab");
    if (closeTabBtn) {
      closeTabBtn.onclick = () => window.close();
    }
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
        "Authentication failed. Please try again from the extension.",
      );
    }
  }

  show("loading");

  supabaseClient.auth.onAuthStateChange((event, session) => {
    if ((event === "SIGNED_IN" || event === "INITIAL_SESSION") && session) {
      userSession = session; // Store for checkout functionality
      chrome.storage.local.set({ supabaseSession: session }, () => {
        chrome.runtime.sendMessage({ type: "AUTH_UPDATED" });
        show("success");
        console.log("✅ User authenticated:", session.user.email);
      });
    } else if (event === "SIGNED_OUT") {
      userSession = null;
      show(
        "error",
        "You have been signed out. Please try signing in again from the extension.",
      );
    } else {
      // Don't instantly fail here; some flows briefly emit non-session events.
      // We'll fail only if bootstrap can't produce a session.
    }
  });

  // Kick off auth handling for BOTH flows
  bootstrapAuthReturn();

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
