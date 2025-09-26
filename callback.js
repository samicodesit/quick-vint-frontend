(() => {
  const SUPABASE_URL = "https://jqloiovdwjaornnfvmyu.supabase.co";
  const SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpxbG9pb3Zkd2phb3JubmZ2bXl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgyMDgzMzIsImV4cCI6MjA2Mzc4NDMzMn0.iFtkUorY1UqK8zamnwgjB-yhsXe0bJAA8YFm22bzc3A";
  const supabaseFactory = window.supabase || window.supabaseJs;
  const supabaseClient = supabaseFactory.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
  );

  const loadingDiv = document.getElementById("loadingState");
  const successDiv = document.getElementById("successState");
  const errorDiv = document.getElementById("errorState");
  const errorMsg = document.getElementById("errorMessage");

  // Global state
  let currentLocalization = null;
  let userSession = null;

  // Vinted domains and localization
  const LOCALIZATION = {
    FR: {
      domain: "vinted.fr",
      currency: "€",
      texts: {
        welcomeTitle: "Bienvenue sur AutoLister AI !",
        welcomeSubtitle:
          "Vous êtes connecté et prêt à créer des annonces incroyables avec l'IA.",
        welcomeMessage:
          "🎯 Prêt à vendre ? Le bouton <span class='inline-btn'>🪄 Generate</span> apparaîtra lors de la création d'annonces !",
        vintedButton: "Créer sur Vinted",
        viewPlansButton: "Voir tous les plans",
        closeTabButton: "Fermer l'onglet",
        featuresTitle: "✨ Ce que vous pouvez faire maintenant",
        feature1:
          "Générer des titres et descriptions convaincants instantanément",
        feature2:
          "Télécharger des photos et obtenir des annonces alimentées par l'IA",
        feature3: "Économiser des heures de rédaction manuelle",
        feature4: "Commencer avec 2 annonces gratuites par jour",
        upgradeTitle: "💡 Vous voulez plus de puissance ?",
        upgradeDescription:
          "Les utilisateurs gratuits obtiennent 2 annonces par jour. Passez à la version supérieure pour obtenir jusqu'à 75 annonces quotidiennes, un support prioritaire et plus de fonctionnalités !",
        starterFeatures:
          "15 annonces/jour<br>Parfait pour vendeurs occasionnels",
        proFeatures: "40 annonces/jour<br>Pour vendeurs actifs",
        businessFeatures: "75 annonces/jour<br>Pour vendeurs professionnels",
        privacyLink: "Politique de confidentialité",
        termsLink: "Conditions d'utilisation",
      },
    },
    DE: {
      domain: "vinted.de",
      currency: "€",
      texts: {
        welcomeTitle: "Willkommen bei AutoLister AI!",
        welcomeSubtitle:
          "Sie sind angemeldet und bereit, fantastische Anzeigen mit KI zu erstellen.",
        welcomeMessage:
          "🎯 Bereit zu verkaufen? Der <span class='inline-btn'>🪄 Generate</span> Button erscheint beim Erstellen neuer Anzeigen!",
        vintedButton: "Auf Vinted erstellen",
        viewPlansButton: "Alle Pläne anzeigen",
        closeTabButton: "Tab schließen",
        featuresTitle: "✨ Was Sie jetzt tun können",
        feature1: "Überzeugende Titel und Beschreibungen sofort generieren",
        feature2: "Fotos hochladen und KI-gestützte Anzeigen erhalten",
        feature3: "Stunden manueller Schreibarbeit sparen",
        feature4: "Mit 2 kostenlosen Anzeigen täglich beginnen",
        upgradeTitle: "💡 Möchten Sie mehr Power?",
        upgradeDescription:
          "Kostenlose Nutzer erhalten 2 Anzeigen pro Tag. Upgraden Sie, um bis zu 75 tägliche Anzeigen, Priority-Support und mehr Features zu erhalten!",
        starterFeatures: "15 Anzeigen/Tag<br>Perfekt für Gelegenheitsverkäufer",
        proFeatures: "40 Anzeigen/Tag<br>Für aktive Verkäufer",
        businessFeatures: "75 Anzeigen/Tag<br>Für professionelle Verkäufer",
        privacyLink: "Datenschutzerklärung",
        termsLink: "Nutzungsbedingungen",
      },
    },
    ES: {
      domain: "vinted.es",
      currency: "€",
      texts: {
        welcomeTitle: "¡Bienvenido a AutoLister AI!",
        welcomeSubtitle:
          "Has iniciado sesión y estás listo para crear increíbles anuncios con IA.",
        welcomeMessage:
          "🎯 ¿Listo para vender? ¡El botón <span class='inline-btn'>🪄 Generate</span> aparecerá al crear nuevos anuncios!",
        vintedButton: "Crear en Vinted",
        viewPlansButton: "Ver todos los planes",
        closeTabButton: "Cerrar pestaña",
        featuresTitle: "✨ Lo que puedes hacer ahora",
        feature1: "Generar títulos y descripciones convincentes al instante",
        feature2: "Subir fotos y obtener anuncios potenciados por IA",
        feature3: "Ahorrar horas de escritura manual",
        feature4: "Comenzar con 2 anuncios gratuitos diarios",
        upgradeTitle: "💡 ¿Quieres más potencia?",
        upgradeDescription:
          "Los usuarios gratuitos obtienen 2 anuncios por día. ¡Actualiza para obtener hasta 75 anuncios diarios, soporte prioritario y más características!",
        starterFeatures:
          "15 anuncios/día<br>Perfecto para vendedores ocasionales",
        proFeatures: "40 anuncios/día<br>Para vendedores activos",
        businessFeatures: "75 anuncios/día<br>Para vendedores profesionales",
        privacyLink: "Política de privacidad",
        termsLink: "Términos de servicio",
      },
    },
    IT: {
      domain: "vinted.it",
      currency: "€",
      texts: {
        welcomeTitle: "Benvenuto su AutoLister AI!",
        welcomeSubtitle:
          "Hai effettuato l'accesso e sei pronto per creare annunci fantastici con l'IA.",
        welcomeMessage:
          "🎯 Pronto a vendere? Il pulsante <span class='inline-btn'>🪄 Generate</span> apparirà quando crei nuovi annunci!",
        vintedButton: "Crea su Vinted",
        viewPlansButton: "Visualizza tutti i piani",
        closeTabButton: "Chiudi scheda",
        featuresTitle: "✨ Cosa puoi fare ora",
        feature1: "Generare titoli e descrizioni convincenti istantaneamente",
        feature2: "Caricare foto e ottenere annunci potenziati dall'IA",
        feature3: "Risparmiare ore di scrittura manuale",
        feature4: "Iniziare con 2 annunci gratuiti al giorno",
        upgradeTitle: "💡 Vuoi più potenza?",
        upgradeDescription:
          "Gli utenti gratuiti ottengono 2 annunci al giorno. Aggiorna per ottenere fino a 75 annunci giornalieri, supporto prioritario e più funzionalità!",
        starterFeatures:
          "15 annunci/giorno<br>Perfetto per venditori occasionali",
        proFeatures: "40 annunci/giorno<br>Per venditori attivi",
        businessFeatures: "75 annunci/giorno<br>Per venditori professionali",
        privacyLink: "Informativa sulla privacy",
        termsLink: "Termini di servizio",
      },
    },
    NL: {
      domain: "vinted.nl",
      currency: "€",
      texts: {
        welcomeTitle: "Welkom bij AutoLister AI!",
        welcomeSubtitle:
          "Je bent ingelogd en klaar om geweldige advertenties te maken met AI.",
        welcomeMessage:
          "🎯 Klaar om te verkopen? De <span class='inline-btn'>🪄 Generate</span> knop verschijnt bij het maken van advertenties!",
        vintedButton: "Maak op Vinted",
        viewPlansButton: "Bekijk alle plannen",
        closeTabButton: "Tabblad sluiten",
        featuresTitle: "✨ Wat je nu kunt doen",
        feature1: "Overtuigende titels en beschrijvingen direct genereren",
        feature2: "Foto's uploaden en AI-aangedreven advertenties krijgen",
        feature3: "Uren handmatig schrijven besparen",
        feature4: "Begin met 2 gratis advertenties per dag",
        upgradeTitle: "💡 Wil je meer kracht?",
        upgradeDescription:
          "Gratis gebruikers krijgen 2 advertenties per dag. Upgrade om tot 75 dagelijkse advertenties, prioriteitsondersteuning en meer functies te krijgen!",
        starterFeatures:
          "15 advertenties/dag<br>Perfect voor occasionele verkopers",
        proFeatures: "40 advertenties/dag<br>Voor actieve verkopers",
        businessFeatures: "75 advertenties/dag<br>Voor professionele verkopers",
        privacyLink: "Privacybeleid",
        termsLink: "Servicevoorwaarden",
      },
    },
    DEFAULT: {
      domain: "vinted.com",
      currency: "€",
      texts: {
        welcomeTitle: "Welcome to AutoLister AI!",
        welcomeSubtitle:
          "You're signed in and ready to create amazing listings with AI.",
        welcomeMessage:
          "🎯 Ready to list? The <span class='inline-btn'>🪄 Generate</span> button will appear when you create new listings!",
        vintedButton: "Start Creating on Vinted",
        viewPlansButton: "View All Plans",
        closeTabButton: "Close Tab",
        featuresTitle: "✨ What You Can Do Now",
        feature1: "Generate compelling titles and descriptions instantly",
        feature2: "Upload photos and get AI-powered listings",
        feature3: "Save hours of manual writing",
        feature4: "Start with 2 free listings daily",
        upgradeTitle: "💡 Want More Power?",
        upgradeDescription:
          "Free users get 2 listings per day. Upgrade to get up to 75 daily listings, priority support, and more features!",
        starterFeatures: "15 listings/day<br>Perfect for casual sellers",
        proFeatures: "40 listings/day<br>For active sellers",
        businessFeatures: "75 listings/day<br>For power sellers",
        privacyLink: "Privacy Policy",
        termsLink: "Terms of Service",
      },
    },
  };

  function detectCountryAndLocalization() {
    let countryCode = "DEFAULT";

    // Primary detection via timezone (most reliable)
    if (typeof Intl !== "undefined") {
      try {
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const timezoneMap = {
          "Europe/Paris": "FR",
          "Europe/Berlin": "DE",
          "Europe/Madrid": "ES",
          "Europe/Rome": "IT",
          "Europe/Amsterdam": "NL",
          "Europe/Brussels": "NL", // Belgium often uses Dutch for Vinted
        };

        if (timezoneMap[timezone]) {
          countryCode = timezoneMap[timezone];
        }
      } catch (e) {
        console.warn("Timezone detection failed:", e);
      }
    }

    // Fallback to language detection
    if (countryCode === "DEFAULT" && navigator.language) {
      const lang = navigator.language.toLowerCase();
      if (lang.startsWith("fr")) countryCode = "FR";
      else if (lang.startsWith("de")) countryCode = "DE";
      else if (lang.startsWith("es")) countryCode = "ES";
      else if (lang.startsWith("it")) countryCode = "IT";
      else if (lang.startsWith("nl")) countryCode = "NL";
    }

    return LOCALIZATION[countryCode] || LOCALIZATION.DEFAULT;
  }

  function localizeContent(localization) {
    const elements = {
      "success-title": "welcomeTitle",
      "success-subtitle": "welcomeSubtitle",
      "welcome-message": "welcomeMessage",
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
        if (elementId === "welcome-message") {
          element.innerHTML = `<strong>${localization.texts[textKey]}</strong>`;
        } else if (
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

    // Update language toggle button
    updateLanguageToggle();
  }

  function updateLanguageToggle() {
    const langToggle = document.getElementById("lang-toggle");
    const langCurrent = document.getElementById("lang-current");
    const langAlternative = document.getElementById("lang-alternative");

    if (langToggle && langCurrent && langAlternative) {
      const currentLang = Object.keys(LOCALIZATION).find(
        (key) => LOCALIZATION[key] === currentLocalization
      );
      const detectedLang = Object.keys(LOCALIZATION).find(
        (key) => LOCALIZATION[key] === detectCountryAndLocalization()
      );

      // Always show: [DetectedLang] | [EN] - positions never change
      langCurrent.textContent = detectedLang || "AUTO";
      langAlternative.textContent = "EN";

      // Reset styles first
      langCurrent.style.opacity = "";
      langAlternative.style.opacity = "";
      langCurrent.style.fontWeight = "";
      langAlternative.style.fontWeight = "";

      if (currentLang === "DEFAULT") {
        // Currently showing English - EN is active (right side)
        langCurrent.style.opacity = "0.5";
        langAlternative.style.fontWeight = "700";
        langToggle.onclick = () => switchLanguage("auto");
      } else {
        // Currently showing local language - local lang is active (left side)
        langCurrent.style.fontWeight = "700";
        langAlternative.style.opacity = "0.5";
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
      <div style="padding: 20px;">
        <div style="width: 24px; height: 24px; border: 3px solid #f3f3f3; border-top: 3px solid #4f46e5; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 10px;"></div>
        <div style="color: #4f46e5; font-weight: 600;">Opening checkout...</div>
      </div>
    `;

    try {
      const response = await fetch(
        "https://quick-vint.vercel.app/api/stripe/create-checkout",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: userSession.user.email,
            tier: planTier,
          }),
        }
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
        "Unable to open checkout. Please try upgrading through the extension or contact support."
      );
      planCard.innerHTML = originalContent;
    }
  }

  async function checkAndCustomizeForExistingSubscriber() {
    if (!userSession?.user?.email) return;

    try {
      // Check if user has an active subscription by calling your backend
      const response = await fetch(
        "https://quick-vint.vercel.app/api/check-subscription",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: userSession.user.email,
          }),
        }
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
        (key) => LOCALIZATION[key] === currentLocalization
      );
      const isEnglish = currentLang === "DEFAULT";

      const messages = {
        DEFAULT: `<strong>🎉 Welcome back!</strong> You're on the <strong>${planName}</strong> plan. Ready to create more amazing listings?`,
        FR: `<strong>🎉 Bon retour !</strong> Vous êtes sur le plan <strong>${planName}</strong>. Prêt à créer d'autres annonces fantastiques ?`,
        DE: `<strong>🎉 Willkommen zurück!</strong> Sie haben den <strong>${planName}</strong>-Plan. Bereit, weitere fantastische Anzeigen zu erstellen?`,
        ES: `<strong>🎉 ¡Bienvenido de nuevo!</strong> Tienes el plan <strong>${planName}</strong>. ¿Listo para crear más anuncios increíbles?`,
        IT: `<strong>🎉 Bentornato!</strong> Hai il piano <strong>${planName}</strong>. Pronto a creare altri annunci fantastici?`,
        NL: `<strong>🎉 Welkom terug!</strong> Je hebt het <strong>${planName}</strong> plan. Klaar om meer geweldige advertenties te maken?`,
      };

      welcomeMessage.innerHTML = messages[currentLang] || messages.DEFAULT;
      welcomeMessage.style.background = "#e0f2fe";
      welcomeMessage.style.borderColor = "#0284c7";
      welcomeMessage.style.color = "#0c4a6e";
    }

    // Update the upgrade section to show "Manage Subscription" instead
    const upgradeSection = document.querySelector(".upgrade-section");
    if (upgradeSection) {
      const currentLang = Object.keys(LOCALIZATION).find(
        (key) => LOCALIZATION[key] === currentLocalization
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
        <div class="cta-buttons" style="margin-top: 1.5rem;">
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
      upgradeSection.style.background = "#f0f9ff";
      upgradeSection.style.borderColor = "#0284c7";
      upgradeSection.style.color = "#0c4a6e";
    }

    // Update the View Plans button text
    const viewPlansBtn = document.getElementById("view-plans");
    if (viewPlansBtn) {
      const currentLang = Object.keys(LOCALIZATION).find(
        (key) => LOCALIZATION[key] === currentLocalization
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
          signed_in: !!userSession?.user?.email, // Boolean like popup.js
          plan: planTier.toLowerCase(),
          email: userSession?.user?.email || "",
          timestamp: Date.now(), // For freshness validation
        };

        try {
          const token = btoa(JSON.stringify(userData));
          window.open(
            `https://quick-vint.vercel.app/pricing.html?token=${encodeURIComponent(
              token
            )}`,
            "_blank"
          );
        } catch (error) {
          console.error("Failed to create token:", error);
          // Fallback for existing subscribers
          const params = new URLSearchParams({
            source: "extension",
            signed_in: "true",
            plan: planTier.toLowerCase(),
            from: "subscriber_compare",
            lang: userData.lang,
          });
          window.open(
            `https://quick-vint.vercel.app/pricing.html?${params.toString()}`,
            "_blank"
          );
        }
      };
    }
  }

  function show(state, msg = "") {
    [loadingDiv, successDiv, errorDiv].forEach(
      (el) => el && el.classList.add("hidden")
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
        // Create encoded token exactly like popup.js
        const userData = {
          source: "extension",
          signed_in: !!userSession?.user?.email, // Boolean like popup.js
          plan: "free", // We know they're free since they're seeing upgrade options
          email: userSession?.user?.email || "",
          timestamp: Date.now(), // For freshness validation
        };

        try {
          const token = btoa(JSON.stringify(userData));
          window.open(
            `https://quick-vint.vercel.app/pricing.html?token=${encodeURIComponent(
              token
            )}`,
            "_blank"
          );
        } catch (error) {
          console.error("Failed to create token:", error);
          // Fallback to legacy params if token creation fails
          const params = new URLSearchParams({
            source: "extension",
            signed_in: "true",
            plan: "free",
            from: "auth_success",
            lang: userData.lang,
          });
          window.open(
            `https://quick-vint.vercel.app/pricing.html?${params.toString()}`,
            "_blank"
          );
        }
      };
    }

    // Initialize plan card click handlers
    const starterCard = document.getElementById("starter-card");
    const proCard = document.getElementById("pro-card");
    const businessCard = document.getElementById("business-card");

    if (starterCard) {
      starterCard.onclick = () => handlePlanSelection("starter");
    }

    if (proCard) {
      proCard.onclick = () => handlePlanSelection("pro");
    }

    if (businessCard) {
      businessCard.onclick = () => handlePlanSelection("business");
    }

    // Check if user already has a subscription and customize UI
    checkAndCustomizeForExistingSubscriber();

    // Smooth auto-close notification (below the fold)
    setTimeout(() => {
      const notice = document.createElement("div");
      notice.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: rgba(79, 70, 229, 0.95);
        backdrop-filter: blur(10px);
        color: white;
        padding: 12px 20px;
        border-radius: 12px;
        font-size: 0.9rem;
        box-shadow: 0 8px 32px rgba(79, 70, 229, 0.3);
        z-index: 1000;
        animation: slideInNotice 0.4s ease-out;
        cursor: pointer;
      `;

      const autoCloseText = localization.texts.closeTabButton || "Close Tab";
      notice.innerHTML = `${autoCloseText} in <span id="countdown">25</span>s`;
      notice.onclick = () => window.close();
      document.body.appendChild(notice);

      // Countdown
      let countdown = 25;
      const interval = setInterval(() => {
        countdown--;
        const countdownEl = document.getElementById("countdown");
        if (countdownEl) countdownEl.textContent = countdown;
        if (countdown <= 0) {
          clearInterval(interval);
          window.close();
        }
      }, 1000);
    }, 4000);
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
        "You have been signed out. Please try signing in again from the extension."
      );
    } else {
      userSession = null;
      show(
        "error",
        "Authentication failed or expired. Please try signing in again from the extension."
      );
    }
  });

  // Add animation styles
  const style = document.createElement("style");
  style.textContent = `
    @keyframes slideInNotice {
      from {
        transform: translateX(100%) scale(0.8);
        opacity: 0;
      }
      to {
        transform: translateX(0) scale(1);
        opacity: 1;
      }
    }
  `;
  document.head.appendChild(style);
})();
