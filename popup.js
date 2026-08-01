document.addEventListener("DOMContentLoaded", () => {
  if (
    new URLSearchParams(window.location.search).get("source") ===
    "vinted_signin_fallback"
  ) {
    document.body.classList.add("auth-tab-mode");
  }

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
  const LOW_REMAINING_RATIO = 0.2;
  const OPEN_SETTINGS_ON_NEXT_POPUP_KEY = "quickvintOpenSettingsOnNextPopup";
  const OPEN_SETTINGS_FLAG_MAX_AGE_MS = 15000;
  const MAGIC_LINK_PENDING_KEY = "quickvintMagicLinkPending";
  const MAGIC_LINK_PENDING_MAX_AGE_MS = 15 * 60 * 1000;
  const MAGIC_LINK_RESEND_COOLDOWN_MS = 60 * 1000;
  const LANGUAGE_PREFERENCE_TOUCHED_KEY = "quickvintLanguagePreferenceTouched";
  const DESCRIPTION_FOOTER_STORAGE_KEY = "descriptionFooterText";
  const DESCRIPTION_FOOTER_MAX_LENGTH = 240;
  const languageDefaults = window.AutoListerLanguageDefaults;

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

  const DESCRIPTION_FOOTER_COPY = {
    en: {
      title: "Saved note",
      placeholder: "Smoke-free home. Happy to bundle items.",
      bullets: ["Appears on every future listing", "Added before hashtags", "No links or contact details"],
      locked: "Available during the free trial and on Pro or Business.",
      saved: "Saved.",
      cleared: "Cleared.",
      clear: "Clear",
    },
    fr: {
      title: "Note enregistrée",
      placeholder: "Maison non-fumeur. Regroupement possible.",
      bullets: ["Ajoutée à chaque future annonce", "Placée avant les hashtags", "Pas de liens ni coordonnées"],
      locked: "Disponible avec l'essai gratuit et les offres Pro ou Business.",
      saved: "Enregistrée.",
      cleared: "Effacée.",
      clear: "Effacer",
    },
    cz: {
      title: "Uložená poznámka",
      placeholder: "Nekuřácká domácnost. Ráda sloučím více věcí.",
      bullets: ["Zobrazí se u každého dalšího inzerátu", "Přidá se před hashtagy", "Bez odkazů a kontaktních údajů"],
      locked: "Dostupné ve zkušební verzi zdarma a v tarifech Pro nebo Business.",
      saved: "Uloženo.",
      cleared: "Vymazáno.",
      clear: "Vymazat",
    },
    da: {
      title: "Gemt note",
      placeholder: "Røgfrit hjem. Samler gerne varer.",
      bullets: ["Vises på alle fremtidige annoncer", "Tilføjes før hashtags", "Ingen links eller kontaktoplysninger"],
      locked: "Tilgængelig i gratis prøveperiode og på Pro eller Business.",
      saved: "Gemt.",
      cleared: "Ryddet.",
      clear: "Ryd",
    },
    nl: {
      title: "Opgeslagen notitie",
      placeholder: "Rookvrij huis. Bundelen is mogelijk.",
      bullets: ["Verschijnt bij elke toekomstige advertentie", "Komt voor de hashtags", "Geen links of contactgegevens"],
      locked: "Beschikbaar tijdens de gratis proefperiode en met Pro of Business.",
      saved: "Opgeslagen.",
      cleared: "Gewist.",
      clear: "Wissen",
    },
    de: {
      title: "Gespeicherte Notiz",
      placeholder: "Rauchfreier Haushalt. Kombiversand möglich.",
      bullets: ["Erscheint bei jedem künftigen Angebot", "Wird vor Hashtags eingefügt", "Keine Links oder Kontaktdaten"],
      locked: "Verfügbar im kostenlosen Test und mit Pro oder Business.",
      saved: "Gespeichert.",
      cleared: "Gelöscht.",
      clear: "Löschen",
    },
    el: {
      title: "Αποθηκευμένη σημείωση",
      placeholder: "Σπίτι χωρίς καπνό. Μπορώ να συνδυάσω προϊόντα.",
      bullets: ["Εμφανίζεται σε κάθε μελλοντική αγγελία", "Μπαίνει πριν από τα hashtags", "Χωρίς links ή στοιχεία επικοινωνίας"],
      locked: "Διαθέσιμο στη δωρεάν δοκιμή και στα Pro ή Business.",
      saved: "Αποθηκεύτηκε.",
      cleared: "Διαγράφηκε.",
      clear: "Διαγραφή",
    },
    hr: {
      title: "Spremljena napomena",
      placeholder: "Dom bez dima. Mogu spojiti više artikala.",
      bullets: ["Pojavljuje se na svakoj budućoj objavi", "Dodaje se prije hashtagova", "Bez linkova ili kontakt podataka"],
      locked: "Dostupno u besplatnoj probi i na Pro ili Business planu.",
      saved: "Spremljeno.",
      cleared: "Obrisano.",
      clear: "Obriši",
    },
    fi: {
      title: "Tallennettu huomautus",
      placeholder: "Savuton koti. Yhdistelen mielelläni tuotteita.",
      bullets: ["Näkyy jokaisessa tulevassa ilmoituksessa", "Lisätään ennen hashtageja", "Ei linkkejä tai yhteystietoja"],
      locked: "Saatavilla ilmaisessa kokeilussa sekä Pro- tai Business-tilillä.",
      saved: "Tallennettu.",
      cleared: "Tyhjennetty.",
      clear: "Tyhjennä",
    },
    hu: {
      title: "Mentett megjegyzés",
      placeholder: "Dohányfüstmentes otthon. Több terméket is össze tudok vonni.",
      bullets: ["Minden jövőbeli hirdetésben megjelenik", "A hashtagek elé kerül", "Nincsenek linkek vagy elérhetőségek"],
      locked: "Elérhető az ingyenes próba alatt, valamint Pro vagy Business csomaggal.",
      saved: "Mentve.",
      cleared: "Törölve.",
      clear: "Törlés",
    },
    it: {
      title: "Nota salvata",
      placeholder: "Casa senza fumo. Posso unire più articoli.",
      bullets: ["Compare in ogni annuncio futuro", "Viene aggiunta prima degli hashtag", "Niente link o contatti"],
      locked: "Disponibile nella prova gratuita e con Pro o Business.",
      saved: "Salvata.",
      cleared: "Eliminata.",
      clear: "Cancella",
    },
    lt: {
      title: "Išsaugota pastaba",
      placeholder: "Namai be dūmų. Galiu sujungti kelias prekes.",
      bullets: ["Rodoma kiekviename būsimame skelbime", "Pridedama prieš grotažymes", "Be nuorodų ar kontaktų"],
      locked: "Pasiekiama nemokamos bandomosios versijos metu ir su Pro arba Business.",
      saved: "Išsaugota.",
      cleared: "Išvalyta.",
      clear: "Išvalyti",
    },
    pl: {
      title: "Zapisana notatka",
      placeholder: "Dom bez dymu. Chętnie połączę kilka rzeczy.",
      bullets: ["Pojawia się w każdej przyszłej ofercie", "Dodawana przed hashtagami", "Bez linków i danych kontaktowych"],
      locked: "Dostępne w darmowej wersji próbnej oraz w Pro lub Business.",
      saved: "Zapisano.",
      cleared: "Wyczyszczono.",
      clear: "Wyczyść",
    },
    pt: {
      title: "Nota guardada",
      placeholder: "Casa sem fumo. Posso juntar artigos.",
      bullets: ["Aparece em todos os anúncios futuros", "É adicionada antes das hashtags", "Sem links ou contactos"],
      locked: "Disponível no teste gratuito e nos planos Pro ou Business.",
      saved: "Guardada.",
      cleared: "Apagada.",
      clear: "Limpar",
    },
    ro: {
      title: "Notă salvată",
      placeholder: "Casă fără fum. Pot grupa articole.",
      bullets: ["Apare la fiecare anunț viitor", "Este adăugată înainte de hashtaguri", "Fără linkuri sau date de contact"],
      locked: "Disponibil în perioada gratuită și pe Pro sau Business.",
      saved: "Salvată.",
      cleared: "Ștearsă.",
      clear: "Șterge",
    },
    es: {
      title: "Nota guardada",
      placeholder: "Casa sin humo. Puedo agrupar artículos.",
      bullets: ["Aparece en todos los anuncios futuros", "Se añade antes de los hashtags", "Sin enlaces ni datos de contacto"],
      locked: "Disponible en la prueba gratuita y en Pro o Business.",
      saved: "Guardada.",
      cleared: "Eliminada.",
      clear: "Borrar",
    },
    sk: {
      title: "Uložená poznámka",
      placeholder: "Nefajčiarska domácnosť. Rada spojím viac vecí.",
      bullets: ["Zobrazí sa pri každom budúcom inzeráte", "Pridá sa pred hashtagy", "Bez odkazov a kontaktných údajov"],
      locked: "Dostupné v bezplatnej skúšobnej verzii a v Pro alebo Business.",
      saved: "Uložené.",
      cleared: "Vymazané.",
      clear: "Vymazať",
    },
    sv: {
      title: "Sparad notis",
      placeholder: "Rökfritt hem. Samfraktar gärna.",
      bullets: ["Visas på varje framtida annons", "Läggs till före hashtags", "Inga länkar eller kontaktuppgifter"],
      locked: "Tillgängligt under gratis testperiod och med Pro eller Business.",
      saved: "Sparad.",
      cleared: "Rensad.",
      clear: "Rensa",
    },
  };

  // --- SUPABASE CLIENT ---
  const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // --- DOM ELEMENT REFERENCES ---
  const messagesDiv = document.getElementById("messages");
  const signedOutView = document.getElementById("signedOutView");
  const authEntryState = document.getElementById("authEntryState");
  const magicLinkSentState = document.getElementById("magicLinkSentState");
  const magicLinkSentEmail = document.getElementById("magicLinkSentEmail");
  const magicLinkOtpField = document.getElementById("magicLinkOtpField");
  const magicLinkOtpInput = document.getElementById("magicLinkOtpInput");
  const magicLinkOtpCells = magicLinkOtpField
    ? [...magicLinkOtpField.querySelectorAll(".otp-cell")]
    : [];
  const resendMagicLinkBtn = document.getElementById("resendMagicLinkBtn");
  const verifyMagicLinkCodeBtn = document.getElementById("verifyMagicLinkCodeBtn");
  const editMagicLinkEmailBtn = document.getElementById("editMagicLinkEmailBtn");
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
  const emojiToggleContainer = document.getElementById("emojiToggleContainer");
  const descriptionFooterTitle = document.getElementById("descriptionFooterTitle");
  const descriptionFooterHelp = document.getElementById("descriptionFooterHelp");
  const descriptionFooterTextarea = document.getElementById("descriptionFooterText");
  const descriptionFooterCount = document.getElementById("descriptionFooterCount");
  const descriptionFooterStatus = document.getElementById("descriptionFooterStatus");
  const descriptionFooterClear = document.getElementById("descriptionFooterClear");
  const formatOptions = document.querySelectorAll('input[name="format"]');
  let descriptionFooterSaveTimer = null;
  let currentDescriptionFooterCopy = DESCRIPTION_FOOTER_COPY.en;
  let renderRequestId = 0;
  let profileRefreshInFlight = false;
  let lastProfileRefreshAt = 0;
  let renderedTier = null;
  let magicLinkCooldownTimer = null;

  // --- HELPER & UTILITY FUNCTIONS ---

  function getLocalStorage(keys) {
    return new Promise((resolve) => {
      chrome.storage.local.get(keys, resolve);
    });
  }

  async function getActiveVintedHostname() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const url = new URL(tab?.url || "");
      return url.hostname || "";
    } catch (error) {
      return "";
    }
  }

  async function getDefaultListingLanguageCode() {
    const activeHostname = await getActiveVintedHostname();
    return languageDefaults.getDefaultListingLanguageInfo({
      hostname: activeHostname,
    }).code;
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

  const eventQueue = [];
  let eventFlushTimer = null;
  const ANALYTICS_CLIENT_ID_KEY = "analyticsClientId";

  function createAnalyticsClientId() {
    if (crypto?.randomUUID) return crypto.randomUUID();
    return `cid_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  }

  function getClientAnalyticsContext() {
    const userAgent = navigator.userAgent || "";
    const isIos = /iPhone|iPad|iPod/i.test(userAgent);
    const isOrion =
      Boolean(window.KAGI) ||
      /Orion/i.test(userAgent) ||
      (isIos && typeof chrome !== "undefined" && Boolean(chrome.runtime?.id));
    return {
      clientBrowser: isOrion ? "orion" : "other",
      clientPlatform: isIos
        ? "ios"
        : /Android/i.test(userAgent)
          ? "android"
          : "desktop",
    };
  }

  async function getAnalyticsClientId() {
    const data = await chrome.storage.local.get(ANALYTICS_CLIENT_ID_KEY);
    if (data[ANALYTICS_CLIENT_ID_KEY]) {
      return data[ANALYTICS_CLIENT_ID_KEY];
    }
    const analyticsClientId = createAnalyticsClientId();
    await chrome.storage.local.set({ [ANALYTICS_CLIENT_ID_KEY]: analyticsClientId });
    return analyticsClientId;
  }

  function buildEventPayload(event, context, analyticsClientId) {
    return {
      event,
      source: "extension_popup",
      page: "extension_popup",
      context: {
        ...context,
        ...getClientAnalyticsContext(),
        analyticsClientId,
      },
      extensionVersion: chrome.runtime.getManifest().version,
    };
  }

  async function flushGrowthEvents() {
    if (eventFlushTimer) {
      clearTimeout(eventFlushTimer);
      eventFlushTimer = null;
    }
    if (!eventQueue.length) return;

    const queuedEvents = eventQueue.splice(0, eventQueue.length);
    try {
      const analyticsClientId = await getAnalyticsClientId();
      const {
        data: { session },
      } = await supabaseClient.auth.getSession();
      const headers = { "Content-Type": "application/json" };
      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`;
      }

      fetch(`${API_BASE}/api/events/track`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          events: queuedEvents.map((item) =>
            buildEventPayload(item.event, item.context, analyticsClientId),
          ),
        }),
      }).catch(() => {});
    } catch (err) {
      // Analytics must never block auth, checkout, or popup rendering.
    }
  }

  function trackGrowthEvent(event, context = {}, immediate = false) {
    try {
      eventQueue.push({ event, context });

      if (immediate || eventQueue.length >= 6) {
        return flushGrowthEvents();
      }

      if (!eventFlushTimer) {
        eventFlushTimer = setTimeout(flushGrowthEvents, 700);
      }
    } catch (err) {
      // Analytics must never block auth, checkout, or popup rendering.
    }
    return Promise.resolve();
  }

  window.addEventListener("pagehide", flushGrowthEvents);

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

  function setSettingsView(isSettingsActive) {
    document.body.classList.toggle("settings-active", isSettingsActive);
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

  function toggleSettingsView() {
    setSettingsView(!document.body.classList.contains("settings-active"));
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

  function isActiveCustomPlan(profile) {
    return Boolean(
      profile?.subscription_status === "active" &&
        profile?.custom_limit_expires_at &&
        new Date(profile.custom_limit_expires_at) > new Date() &&
        (Number(profile.custom_daily_limit) > 0 ||
          Number(profile.custom_monthly_limit) > 0),
    );
  }

  function canUseEmojiSetting(profile) {
    const tier = normalizeTier(profile?.subscription_tier);
    if (profile?.subscription_status !== "active" || tier === "free") {
      return true;
    }
    return tier === "pro" || tier === "business";
  }

  function canUseDescriptionFooterSetting(profile) {
    const tier = normalizeTier(profile?.subscription_tier);
    if (profile?.subscription_status !== "active" || tier === "free") {
      return true;
    }
    return tier === "pro" || tier === "business";
  }

  function getDescriptionFooterCopy(languageCode) {
    const supportedLanguage =
      languageDefaults.getSupportedLanguageCode(languageCode) || "en";
    return DESCRIPTION_FOOTER_COPY[supportedLanguage] || DESCRIPTION_FOOTER_COPY.en;
  }

  async function resolveDescriptionFooterCopy(storage = {}) {
    const hostname = await getActiveVintedHostname();
    const languageProfile = languageDefaults.resolveLanguageProfile(storage, {
      hostname,
    });
    return getDescriptionFooterCopy(languageProfile.uiLanguageCode);
  }

  function applyDescriptionFooterSettingsCopy(copy) {
    currentDescriptionFooterCopy = copy;
    if (descriptionFooterTitle) {
      descriptionFooterTitle.textContent = copy.title;
    }
    if (descriptionFooterHelp) {
      descriptionFooterHelp.innerHTML = "";
      copy.bullets.forEach((bullet) => {
        const item = document.createElement("li");
        item.textContent = bullet;
        descriptionFooterHelp.appendChild(item);
      });
    }
    if (descriptionFooterTextarea) {
      descriptionFooterTextarea.placeholder = copy.placeholder;
    }
    if (descriptionFooterClear) {
      descriptionFooterClear.textContent = copy.clear;
    }
  }

  function validateDescriptionFooterText(value) {
    const text = typeof value === "string" ? value : "";
    if (text.length > DESCRIPTION_FOOTER_MAX_LENGTH) {
      return {
        ok: false,
        error: `Max ${DESCRIPTION_FOOTER_MAX_LENGTH} characters.`,
      };
    }

    const hasLink =
      /\b(?:https?:\/\/|www\.|[a-z0-9-]+\.(?:com|net|org|co|io|app|fr|de|nl|it|es|pl|pt|be|uk|co\.uk)\b)/i.test(
        text,
      );
    const hasEmail = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(text);
    const hasPhone = /(?:\+|00)?\d[\d\s().-]{7,}\d/.test(text);

    if (hasLink || hasEmail || hasPhone) {
      return { ok: false, error: "No links, email addresses, or phone numbers." };
    }

    return { ok: true, text };
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

  function clearMagicLinkCooldownTimer() {
    if (magicLinkCooldownTimer) {
      clearInterval(magicLinkCooldownTimer);
      magicLinkCooldownTimer = null;
    }
  }

  function getMagicLinkCooldownRemainingMs(sentAt) {
    const sentAtMs = Number(sentAt || 0);
    if (!sentAtMs) return 0;
    return Math.max(0, sentAtMs + MAGIC_LINK_RESEND_COOLDOWN_MS - Date.now());
  }

  function updateMagicLinkResendButton(sentAt) {
    if (!resendMagicLinkBtn) return 0;
    const remainingMs = getMagicLinkCooldownRemainingMs(sentAt);
    const remainingSeconds = Math.ceil(remainingMs / 1000);

    if (remainingSeconds > 0) {
      resendMagicLinkBtn.disabled = true;
      resendMagicLinkBtn.textContent = `Resend in ${remainingSeconds}s`;
    } else {
      resendMagicLinkBtn.disabled = false;
      resendMagicLinkBtn.textContent = "Resend";
    }

    return remainingMs;
  }

  function startMagicLinkCooldown(sentAt) {
    clearMagicLinkCooldownTimer();
    const remainingMs = updateMagicLinkResendButton(sentAt);
    if (remainingMs <= 0) return;

    magicLinkCooldownTimer = setInterval(() => {
      if (updateMagicLinkResendButton(sentAt) <= 0) {
        clearMagicLinkCooldownTimer();
      }
    }, 1000);
  }

  function showMagicLinkForm() {
    clearMagicLinkCooldownTimer();
    if (resendMagicLinkBtn) {
      resendMagicLinkBtn.disabled = false;
      resendMagicLinkBtn.textContent = "Resend";
    }
    signedOutView?.classList.remove("magic-link-mode");
    authEntryState?.classList.remove("hidden");
    magicLinkSentState?.classList.add("hidden");
  }

  function showMagicLinkSent(email, sentAt = Date.now()) {
    signedOutView?.classList.add("magic-link-mode");
    authEntryState?.classList.add("hidden");
    magicLinkSentState?.classList.remove("hidden");
    if (magicLinkSentEmail) {
      magicLinkSentEmail.textContent = email;
    }
    if (magicLinkOtpInput) {
      magicLinkOtpInput.value = "";
      renderMagicLinkOtpCells();
    }
    startMagicLinkCooldown(sentAt);
  }

  function renderMagicLinkOtpCells() {
    const token = String(magicLinkOtpInput?.value || "").replace(/\D/g, "");
    magicLinkOtpCells.forEach((cell, index) => {
      cell.textContent = token[index] || "";
      cell.classList.toggle("filled", index < token.length);
    });
  }

  async function setPendingMagicLinkEmail(email) {
    const sentAt = Date.now();
    await chrome.storage.local.set({
      [MAGIC_LINK_PENDING_KEY]: {
        email,
        sentAt,
      },
    });
    showMagicLinkSent(email, sentAt);
  }

  async function clearPendingMagicLinkEmail() {
    await chrome.storage.local.remove(MAGIC_LINK_PENDING_KEY);
    showMagicLinkForm();
  }

  async function restorePendingMagicLinkState() {
    const data = await getLocalStorage(MAGIC_LINK_PENDING_KEY);
    const pending = data[MAGIC_LINK_PENDING_KEY];
    const sentAt = Number(pending?.sentAt || 0);
    const email = typeof pending?.email === "string" ? pending.email : "";

    if (email && Date.now() - sentAt < MAGIC_LINK_PENDING_MAX_AGE_MS) {
      showMagicLinkSent(email, sentAt);
      return;
    }

    if (pending) {
      await chrome.storage.local.remove(MAGIC_LINK_PENDING_KEY);
    }
    showMagicLinkForm();
  }

  function restoreUpgradeButtonContent() {
    if (!upgradeBtn) return;
    upgradeBtn.disabled = false;
    upgradeBtn.innerHTML = `Upgrade to Starter (€3.99/mo)<span class="cta-subline">10/day · 75/month</span>`;
  }

  function restoreCreditPackButtonContent() {
    if (!creditPackBtn) return;
    creditPackBtn.disabled = false;
    creditPackBtn.textContent = `Buy ${CREDIT_PACK.credits} credits - ${CREDIT_PACK.price} one-time`;
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
        label ||
        `Buy ${CREDIT_PACK.credits} credits - ${CREDIT_PACK.price} one-time`;
    }
  }

  function hasLowRemaining(remaining, total) {
    return total > 0 && remaining / total <= LOW_REMAINING_RATIO;
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
      if (dailyMeterLabel) dailyMeterLabel.textContent = "Free listings";
      if (monthlyMeterLabel) monthlyMeterLabel.textContent = "Extra credits";
    } else {
      if (dailyMeterLabel) dailyMeterLabel.textContent = "Daily usage";
      if (monthlyMeterLabel) monthlyMeterLabel.textContent = "Monthly usage";
    }

    if (dailyCallsUsed) dailyCallsUsed.textContent = "Loading...";
    if (monthlyCallsUsed) monthlyCallsUsed.textContent = "Loading...";
    if (dailyProgressBar) dailyProgressBar.style.width = "0%";
    if (monthlyProgressBar) monthlyProgressBar.style.width = "0%";
    if (dailyProgressBar?.parentElement) {
      dailyProgressBar.parentElement.style.display = "";
    }
    if (monthlyProgressBar?.parentElement) {
      monthlyProgressBar.parentElement.style.display =
        tier === "free" ? "none" : "";
    }
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
      clearMagicLinkCooldownTimer();
      chrome.storage.local.remove(MAGIC_LINK_PENDING_KEY);
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
      if (planName) {
        planName.textContent = isActiveCustomPlan(profile)
          ? "Custom Plan"
          : TIER_DISPLAY_NAMES[tier] || "Free Plan";
      }

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
      await restorePendingMagicLinkState();
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
      const freeRemaining = Math.max(0, freeLimit - freeUsed);

      if (dailyMeterLabel) dailyMeterLabel.textContent = "Free listings";
      if (monthlyMeterLabel) monthlyMeterLabel.textContent = "Extra credits";
      if (dailyCallsUsed)
        dailyCallsUsed.textContent = `${freeUsed} / ${freeLimit} used`;
      if (monthlyCallsUsed)
        monthlyCallsUsed.textContent = `${packCredits} available`;
      if (dailyProgressBar) dailyProgressBar.style.width = `${freePercent}%`;
      if (dailyProgressBar?.parentElement) {
        dailyProgressBar.parentElement.style.display = "";
      }
      if (monthlyProgressBar?.parentElement) {
        monthlyProgressBar.parentElement.style.display = "none";
      }

      updateUsageUpsell({
        tier,
        dailyPercent: freePercent,
        monthlyPercent: 0,
        packCredits,
        freeRemaining,
        freeLimit,
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
    if (dailyMeterLabel) dailyMeterLabel.textContent = "Daily usage";
    if (monthlyMeterLabel) monthlyMeterLabel.textContent = "Monthly usage";
    if (dailyCallsUsed)
      dailyCallsUsed.textContent = hasDailyLimit
        ? `${displayDailyUsed} / ${dailyTotal}`
        : "Unlimited";
    if (monthlyCallsUsed)
      monthlyCallsUsed.textContent = `${displayMonthlyUsed} / ${monthlyTotal}`;
    if (dailyProgressBar) dailyProgressBar.style.width = `${dailyPercent}%`;
    if (monthlyProgressBar)
      monthlyProgressBar.style.width = `${monthlyPercent}%`;
    if (dailyProgressBar?.parentElement) {
      dailyProgressBar.parentElement.style.display = hasDailyLimit ? "" : "none";
    }
    if (monthlyProgressBar?.parentElement) {
      monthlyProgressBar.parentElement.style.display = "";
    }

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
    freeLimit,
    isLegacy,
    hasDailyLimit = true,
  }) {
    if (usageLimitNote) usageLimitNote.style.display = "none";
    if (paidUpgradeBtn) paidUpgradeBtn.classList.add("hidden");
    setCreditPackVisibility(false);

    if (tier === "free") {
      const isLowCreditBalance =
        packCredits > 0 && hasLowRemaining(packCredits, CREDIT_PACK.credits);

      if (packCredits === 0 || isLowCreditBalance) {
        setCreditPackVisibility(
          true,
          packCredits > 0
            ? `Buy another ${CREDIT_PACK.credits} credits`
            : `Buy ${CREDIT_PACK.credits} credits - ${CREDIT_PACK.price} one-time`,
        );
      }
      return;
    }

    const nextTier = NEXT_TIER[tier];
    const isNearLimit =
      (hasDailyLimit && dailyPercent >= 80) || monthlyPercent >= 80;
    const hasCredits = packCredits > 0;
    const isLowCreditBalance =
      hasCredits && hasLowRemaining(packCredits, CREDIT_PACK.credits);
    const shouldShowTopUp = isNearLimit && (!hasCredits || isLowCreditBalance);

    if (tier === "business") {
      if (shouldShowTopUp && usageLimitNote) {
        usageLimitNote.textContent =
          "Business usage is high. Top-up credits are available if you need extra listings this cycle.";
        usageLimitNote.style.display = "block";
      }
      if (shouldShowTopUp) {
        setCreditPackVisibility(
          true,
          hasCredits
            ? `Buy another ${CREDIT_PACK.credits} credits`
            : `Buy ${CREDIT_PACK.credits} extra credits`,
        );
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
      if (shouldShowTopUp) {
        setCreditPackVisibility(
          true,
          hasCredits
            ? `Buy another ${CREDIT_PACK.credits} credits`
            : `Buy ${CREDIT_PACK.credits} extra credits`,
        );
      }
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

  async function getVerifiedSignedInBillingState() {
    const sessionResult = await sendRuntimeMessage({ type: "GET_VALID_SESSION" });
    if (!sessionResult?.ok || !sessionResult.email) {
      return {
        ok: false,
        reason: sessionResult?.reason || "no_session",
      };
    }

    const { userProfile } = await getLocalStorage(["userProfile"]);
    const profile = userProfile || null;
    const tier = normalizeTier(profile?.subscription_tier);

    return { ok: true, email: sessionResult.email, profile, tier };
  }

  async function getVerifiedBillingPortalState() {
    const signedInState = await getVerifiedSignedInBillingState();
    if (!signedInState.ok) {
      return signedInState;
    }

    const hasSubscriptionPlan =
      signedInState.profile?.subscription_status === "active" &&
      signedInState.tier !== "free";

    if (!hasSubscriptionPlan) {
      return { ok: false, reason: "no_active_subscription" };
    }

    return signedInState;
  }

  // --- API & EVENT HANDLERS ---

  async function sendMagicLinkToEmail(email, button, defaultText, isResend = false) {
    if (!email.includes("@")) {
      showMessage("Please enter a valid email address.", "error");
      return;
    }

    setLoading(button, true, defaultText);
    showMessage(null);
    await trackGrowthEvent(
      isResend ? "magic_link_resend_request" : "magic_link_request",
      {
        domain: email.split("@")[1]?.toLowerCase() || null,
      },
      true,
    );

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

      await setPendingMagicLinkEmail(email);
      await trackGrowthEvent(
        isResend ? "magic_link_resent" : "magic_link_sent",
        {
          domain: email.split("@")[1]?.toLowerCase() || null,
        },
        true,
      );
    } catch (err) {
      trackGrowthEvent("magic_link_error", {
        message: err.message || "unknown",
        isResend,
      });
      showMessage(
        err.message || "Connection issue. Please check your internet.",
        "error",
      );
    } finally {
      setLoading(button, false, defaultText);
    }
  }

  async function handleSendMagicLink() {
    if (!emailInput) return;
    await sendMagicLinkToEmail(
      emailInput.value.trim(),
      sendMagicLinkBtn,
      "Send Magic Link",
    );
  }

  async function handleResendMagicLink() {
    const data = await getLocalStorage(MAGIC_LINK_PENDING_KEY);
    const pending = data[MAGIC_LINK_PENDING_KEY];
    const email = pending?.email;
    if (!email) {
      showMagicLinkForm();
      return;
    }

    if (getMagicLinkCooldownRemainingMs(pending.sentAt) > 0) {
      updateMagicLinkResendButton(pending.sentAt);
      return;
    }

    await sendMagicLinkToEmail(
      email,
      resendMagicLinkBtn,
      "Resend",
      true,
    );
  }

  async function handleVerifyMagicLinkCode() {
    const data = await getLocalStorage(MAGIC_LINK_PENDING_KEY);
    const pending = data[MAGIC_LINK_PENDING_KEY];
    const email = typeof pending?.email === "string" ? pending.email : "";
    const token = String(magicLinkOtpInput?.value || "").replace(/\D/g, "");

    if (!email) {
      showMagicLinkForm();
      return;
    }
    if (token.length !== 6) {
      showMessage("Enter the 6-digit code from your email.", "error");
      return;
    }

    setLoading(verifyMagicLinkCodeBtn, true, "Verify");
    try {
      const response = await sendRuntimeMessage({
        type: "VERIFY_EMAIL_OTP",
        email,
        token,
      });
      if (!response?.ok) {
        throw new Error(response?.error || "Invalid or expired code.");
      }

      await chrome.storage.local.remove(MAGIC_LINK_PENDING_KEY);
      await trackGrowthEvent(
        "magic_link_code_success",
        {
          domain: email.split("@")[1]?.toLowerCase() || null,
        },
        true,
      );
      showMessage("Signed in.", "success");
      await updateFromStorage();
      refreshSettingsAccess();
    } catch (error) {
      trackGrowthEvent("magic_link_code_error", {
        message: error.message || "unknown",
      });
      showMessage(error.message || "Invalid or expired code.", "error");
    } finally {
      setLoading(verifyMagicLinkCodeBtn, false, "Verify");
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
    setLoading(upgradeBtn, true, "Loading…");
    showMessage(null);
    try {
      const checkoutState = await getVerifiedSignedInBillingState();
      if (!checkoutState.ok) {
        trackGrowthEvent("pricing_signin_required", {
          source: "extension_popup_upgrade",
          reason: checkoutState.reason,
        });
        showMessage("Please sign in to upgrade.", "error");
        await updateFromStorage();
        return;
      }

      trackGrowthEvent("checkout_start", {
        source: "extension_popup",
        tier: "starter",
        checkoutType: "subscription",
      });
      const res = await fetch(`${API_BASE}/api/stripe/create-checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: checkoutState.email,
          tier: "starter",
          source: "extension_popup",
        }),
      });
      const { url } = await res.json();
      if (res.ok && url) {
        trackGrowthEvent("checkout_opened", {
          source: "extension_popup",
          tier: "starter",
          checkoutType: "subscription",
        });
        await chrome.tabs.create({ url });
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
    setLoading(manageBtn, true, "Loading…");
    showMessage(null);
    try {
      const portalState = await getVerifiedBillingPortalState();
      if (!portalState.ok) {
        if (
          portalState.reason === "signed_out" ||
          portalState.reason === "no_session"
        ) {
          trackGrowthEvent("billing_portal_signin_required", {
            source: "extension_popup",
          });
          showMessage("Please sign in to manage your subscription.", "error");
          await updateFromStorage();
          return;
        }

        if (portalState.reason === "no_active_subscription") {
          showMessage("No active subscription found for this account.", "error");
          await updateFromStorage();
          return;
        }

        trackGrowthEvent("billing_portal_verification_failed", {
          source: "extension_popup",
          reason: portalState.reason,
        });
        showMessage(
          "Unable to verify your subscription. Please try again.",
          "error",
        );
        return;
      }

      trackGrowthEvent("billing_portal_start", { source: "extension_popup" });
      const res = await fetch(`${API_BASE}/api/stripe/create-portal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: portalState.email }),
      });
      const { url } = await res.json();
      if (res.ok && url) {
        trackGrowthEvent("billing_portal_opened", { source: "extension_popup" });
        await chrome.tabs.create({ url });
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
    setLoading(creditPackBtn, true, "Loading…");
    showMessage(null);
    try {
      const checkoutState = await getVerifiedSignedInBillingState();
      if (!checkoutState.ok) {
        trackGrowthEvent("pricing_signin_required", {
          source: "extension_popup_credit_pack",
          reason: checkoutState.reason,
        });
        showMessage("Please sign in to buy credits.", "error");
        await updateFromStorage();
        return;
      }

      trackGrowthEvent("credit_pack_click", { source: "extension_popup" });
      trackGrowthEvent("checkout_start", {
        source: "extension_popup",
        tier: "credit_pack",
        checkoutType: "credit_pack",
      });
      const res = await fetch(`${API_BASE}/api/stripe/create-credit-checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: checkoutState.email,
          source: "extension_popup",
        }),
      });
      const { url, error } = await res.json();
      if (res.ok && url) {
        trackGrowthEvent("checkout_opened", {
          source: "extension_popup",
          tier: "credit_pack",
          checkoutType: "credit_pack",
        });
        await chrome.tabs.create({ url });
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
    trackGrowthEvent("pricing_view_all_click", { source: "extension_popup" });
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
        chrome.tabs.create({ url });
      }
    });
  }

  // --- LANGUAGE DROPDOWN LOGIC ---
  function setupLanguageDropdown() {
    const ready = new Promise((resolve) => {
      getDefaultListingLanguageCode().then((fallbackCode) => {
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
            [LANGUAGE_PREFERENCE_TOUCHED_KEY]: true,
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
  function updateDescriptionFooterSettingsState({
    allowed,
    text,
    status = "",
  }) {
    const currentText =
      typeof text === "string" ? text : descriptionFooterTextarea?.value || "";
    const validation = validateDescriptionFooterText(currentText);

    if (descriptionFooterTextarea) {
      descriptionFooterTextarea.disabled = !allowed;
      descriptionFooterTextarea.maxLength = DESCRIPTION_FOOTER_MAX_LENGTH;
    }
    if (descriptionFooterCount) {
      descriptionFooterCount.textContent = `${currentText.length}/${DESCRIPTION_FOOTER_MAX_LENGTH}`;
    }
    if (descriptionFooterStatus) {
      const message = !allowed
        ? currentDescriptionFooterCopy.locked
        : validation.ok
          ? status
          : validation.error;
      descriptionFooterStatus.textContent = message;
      descriptionFooterStatus.dataset.state = validation.ok || !allowed ? "default" : "error";
    }
    if (descriptionFooterClear) {
      descriptionFooterClear.disabled = !allowed || currentText.length === 0;
    }

    return validation;
  }

  function scheduleDescriptionFooterSave() {
    if (!descriptionFooterTextarea || descriptionFooterTextarea.disabled) return;
    const text = descriptionFooterTextarea.value;
    const validation = updateDescriptionFooterSettingsState({
      allowed: true,
      text,
    });

    if (descriptionFooterSaveTimer) {
      clearTimeout(descriptionFooterSaveTimer);
    }
    if (!validation.ok) return;

    descriptionFooterSaveTimer = setTimeout(() => {
      chrome.storage.local.set(
        { [DESCRIPTION_FOOTER_STORAGE_KEY]: validation.text },
        () => {
          updateDescriptionFooterSettingsState({
            allowed: true,
            text: validation.text,
            status: /\S/.test(validation.text)
              ? currentDescriptionFooterCopy.saved
              : "",
          });
        },
      );
    }, 250);
  }

  function setupSettings() {
    // Load saved settings and user profile for tier check
    chrome.storage.local.get(
      [
        "tone",
        "useEmojis",
        "useBulletPoints",
        DESCRIPTION_FOOTER_STORAGE_KEY,
        "selectedLanguage",
        "selectedTitleLanguage",
        "selectedDescriptionLanguage",
        LANGUAGE_PREFERENCE_TOUCHED_KEY,
        "userProfile",
      ],
      async (result) => {
        const descriptionFooterCopy = await resolveDescriptionFooterCopy(result);
        applyDescriptionFooterSettingsCopy(descriptionFooterCopy);
        const profile = result.userProfile || {};
        const tier = normalizeTier(profile.subscription_tier);
        const isActive = profile.subscription_status === "active";
        const hasProAccess =
          isActive && (tier === "pro" || tier === "business");
        const hasEmojiAccess = canUseEmojiSetting(profile);
        const hasDescriptionFooterAccess = canUseDescriptionFooterSetting(profile);

        // Set Tone
        const savedTone = result.tone || "standard";
        const toneInput = document.querySelector(
          `input[name="tone"][value="${savedTone}"]`,
        );
        if (toneInput) toneInput.checked = true;

        // Set Emojis
        if (emojiToggle) {
          // Default to true unless the user explicitly turned emojis off.
          emojiToggle.checked = hasEmojiAccess && result.useEmojis !== false;
        }

        // Set Format
        // Default to true (bullets) if not set or undefined
        const useBulletPoints = result.useBulletPoints !== false;
        const formatValue = useBulletPoints ? "bullets" : "paragraphs";
        const formatInput = document.querySelector(
          `input[name="format"][value="${formatValue}"]`,
        );
        if (formatInput) formatInput.checked = true;

        if (descriptionFooterTextarea) {
          descriptionFooterTextarea.value =
            typeof result[DESCRIPTION_FOOTER_STORAGE_KEY] === "string"
              ? result[DESCRIPTION_FOOTER_STORAGE_KEY]
              : "";
          updateDescriptionFooterSettingsState({
            allowed: hasDescriptionFooterAccess,
            text: descriptionFooterTextarea.value,
          });
        }

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

        }
        updateSettingsAccess(
          hasProAccess,
          hasEmojiAccess,
          hasDescriptionFooterAccess,
        );
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
      emojiToggleContainer?.addEventListener("click", (event) => {
        if (event.target.closest(".toggle-switch")) return;
        if (!emojiToggle.disabled) {
          emojiToggle.click();
        }
      });
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

    if (descriptionFooterTextarea) {
      descriptionFooterTextarea.addEventListener("input", scheduleDescriptionFooterSave);
    }
    if (descriptionFooterClear) {
      descriptionFooterClear.addEventListener("click", () => {
        if (!descriptionFooterTextarea || descriptionFooterTextarea.disabled) return;
        if (descriptionFooterSaveTimer) {
          clearTimeout(descriptionFooterSaveTimer);
          descriptionFooterSaveTimer = null;
        }
        descriptionFooterTextarea.value = "";
        chrome.storage.local.set({ [DESCRIPTION_FOOTER_STORAGE_KEY]: "" }, () => {
          updateDescriptionFooterSettingsState({
            allowed: true,
            text: "",
            status: currentDescriptionFooterCopy.cleared,
          });
        });
      });
    }
  }

  function refreshSettingsAccess() {
    chrome.storage.local.get(["userProfile"], (data) => {
      const profile = data.userProfile || {};
      const tier = normalizeTier(profile.subscription_tier);
      const isActive = profile.subscription_status === "active";
      const hasProAccess =
        isActive && (tier === "pro" || tier === "business");
      updateSettingsAccess(
        hasProAccess,
        canUseEmojiSetting(profile),
        canUseDescriptionFooterSetting(profile),
      );
    });
  }

  function updateSettingsAccess(
    hasProAccess,
    hasEmojiAccess = false,
    hasDescriptionFooterAccess = false,
  ) {
    const toneContainer = document.querySelector(".tone-grid");
    const emojiContainer = emojiToggle?.closest(".toggle-container");
    const infoNote = document.querySelector(".info-note");
    const upgradeNote = document.querySelector(".upgrade-note");
    const descriptionFooterText = descriptionFooterTextarea?.value || "";

    if (hasProAccess) {
      // Full access - enable everything
      toneOptions.forEach((radio) => {
        radio.disabled = false;
        const chip = radio.nextElementSibling;
        if (chip) chip.classList.remove("locked");
      });
      if (emojiToggle) {
        emojiToggle.disabled = !hasEmojiAccess;
        emojiToggle.checked = hasEmojiAccess && emojiToggle.checked;
        if (emojiContainer) {
          emojiContainer.classList.toggle("locked", !hasEmojiAccess);
        }
      }
      updateDescriptionFooterSettingsState({
        allowed: hasDescriptionFooterAccess,
        text: descriptionFooterText,
      });
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
        emojiToggle.disabled = !hasEmojiAccess;
        emojiToggle.checked = hasEmojiAccess && emojiToggle.checked;
        if (emojiContainer) {
          emojiContainer.classList.toggle("locked", !hasEmojiAccess);
        }
      }
      updateDescriptionFooterSettingsState({
        allowed: hasDescriptionFooterAccess,
        text: descriptionFooterText,
      });
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
    if (resendMagicLinkBtn) {
      resendMagicLinkBtn.addEventListener("click", handleResendMagicLink);
    }
    if (verifyMagicLinkCodeBtn) {
      verifyMagicLinkCodeBtn.addEventListener("click", handleVerifyMagicLinkCode);
    }
    if (magicLinkOtpInput) {
      magicLinkOtpInput.addEventListener("input", () => {
        magicLinkOtpInput.value = magicLinkOtpInput.value
          .replace(/\D/g, "")
          .slice(0, 6);
        renderMagicLinkOtpCells();
      });
      magicLinkOtpInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          handleVerifyMagicLinkCode();
        }
      });
    }
    if (magicLinkOtpField) {
      magicLinkOtpField.addEventListener("click", () => {
        magicLinkOtpInput?.focus();
      });
    }
    if (editMagicLinkEmailBtn) {
      editMagicLinkEmailBtn.addEventListener("click", async () => {
        const data = await getLocalStorage(MAGIC_LINK_PENDING_KEY);
        const email = data[MAGIC_LINK_PENDING_KEY]?.email;
        await clearPendingMagicLinkEmail();
        if (emailInput && email) {
          emailInput.value = email;
          emailInput.focus();
          emailInput.select();
        }
      });
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
    const { [OPEN_SETTINGS_ON_NEXT_POPUP_KEY]: openSettingsOnNextPopup } =
      await chrome.storage.local.get(OPEN_SETTINGS_ON_NEXT_POPUP_KEY);
    const settingsFlagAge =
      typeof openSettingsOnNextPopup === "number"
        ? Date.now() - openSettingsOnNextPopup
        : Infinity;
    if (openSettingsOnNextPopup) {
      await chrome.storage.local.set({
        [OPEN_SETTINGS_ON_NEXT_POPUP_KEY]: false,
      });
    }
    if (
      settingsFlagAge >= 0 &&
      settingsFlagAge <= OPEN_SETTINGS_FLAG_MAX_AGE_MS
    ) {
      setSettingsView(true);
    }
    refreshProfileInBackground();
  }

  init().catch((error) => {
    console.error("Popup initialization failed:", error);
    setView("signed-out");
  });
});
