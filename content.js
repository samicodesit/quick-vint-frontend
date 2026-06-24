(() => {
  // --- CONSTANTS & CONFIGURATION ---
  const BTN_ID = "quickvint-gen-btn";
  const PHONE_BTN_ID = "quickvint-phone-btn";
  const BATCH_BTN_ID = "quickvint-batch-btn";
  const EMOJI_TOGGLE_ID = "quickvint-emoji-toggle";
  const SIGN_IN_BTN_ID = "quickvint-signin-btn";
  const DESCRIPTION_APPLY_PROMPT_ID = "quickvint-description-apply-prompt";
  const TITLE_LANGUAGE_SELECT_ID = "quickvint-title-language-select";
  const DESCRIPTION_LANGUAGE_SELECT_ID = "quickvint-description-language-select";
  const MODAL_ID = "quickvint-phone-modal";
  const BATCH_MODAL_ID = "quickvint-batch-modal";
  const API_BASE = "https://autolister.app";
  const PHONE_API_BASE = "https://autolister.app";
  const PHONE_UPLOAD_PAGE = `${PHONE_API_BASE}/phone-upload`;
  const PHONE_UPLOAD_API = `${PHONE_API_BASE}/api/phone-upload`;
  const MAX_PHONE_UPLOAD_PREVIEWS = 7;
  const BATCH_POLL_INTERVAL_MS = 3000;
  const BATCH_UPLOAD_STALE_MS = 15000;
  const BATCH_UPLOAD_IDLE_TIMEOUT_MS = 5 * 60 * 1000;
  const BATCH_UPLOAD_WAIT_TIMEOUT_MS = 60000;
  const MEASUREMENT_ADVICE_HIDDEN_KEY = "quickvintHideMeasurementAdvice";
  const MEASUREMENT_ADVICE_LAST_SHOWN_KEY = "quickvintMeasurementAdviceLastShown";
  const EMOJI_RETRY_PROMPT_HANDLED_KEY = "quickvintEmojiRetryPromptHandled";
  const OPEN_SETTINGS_ON_NEXT_POPUP_KEY = "quickvintOpenSettingsOnNextPopup";
  const EMOJI_SEQUENCE_REGEX =
    /(?:[0-9#*]\uFE0F?\u20E3)|(?:[\u{1F1E6}-\u{1F1FF}]{2})|(?:\p{Emoji_Presentation}|\p{Emoji}\uFE0F)(?:\p{Emoji_Modifier})?(?:\u200D(?:\p{Emoji_Presentation}|\p{Emoji}\uFE0F)(?:\p{Emoji_Modifier})?)*/gu;
  const SELECTORS = {
    title: 'input[data-testid="title--input"]',
    description: 'textarea[data-testid="description--input"]',
    mediaGrid: '[data-testid="media-upload-grid"], [data-testid="media-select-grid"]',
    mediaPhotoBox: ".photo-box",
    mediaImageWrapper: '[data-testid^="image-wrapper-"]',
    mediaImage:
      '[data-testid^="image-wrapper-"] img.web_ui__Image__content, .photo-box__image-container img.web_ui__Image__content, img[alt^="Uploaded photo"]',
    mediaDeleteButton: '[data-testid^="media-select-grid-delete-button-"]',
    mediaRotateButton: '[data-testid^="media-select-grid-rotate-button-"]',
    mediaAddPhotosButton:
      '[data-testid="add-photos-icon-button"], button[aria-label="Add photos"]',
    fileInput:
      '[data-testid="media-upload"] input[data-testid="add-photos-input"][type="file"], input[data-testid="add-photos-input"][type="file"], input[type="file"][name="photos"]',
  };
  const LANGUAGE_OPTIONS = [
    { code: "en", name: "English", shortName: "EN", flag: "gb", flagAlt: "UK Flag", flagEmoji: "🇬🇧" },
    { code: "fr", name: "Français", shortName: "FR", flag: "fr", flagAlt: "French Flag", flagEmoji: "🇫🇷" },
    { code: "cz", name: "Čeština", shortName: "CZ", flag: "cz", flagAlt: "Czech Flag", flagEmoji: "🇨🇿" },
    { code: "da", name: "Dansk", shortName: "DA", flag: "dk", flagAlt: "Danish Flag", flagEmoji: "🇩🇰" },
    { code: "nl", name: "Nederlands", shortName: "NL", flag: "nl", flagAlt: "Dutch Flag", flagEmoji: "🇳🇱" },
    { code: "de", name: "Deutsch", shortName: "DE", flag: "de", flagAlt: "German Flag", flagEmoji: "🇩🇪" },
    { code: "el", name: "Ελληνικά", shortName: "EL", flag: "gr", flagAlt: "Greek Flag", flagEmoji: "🇬🇷" },
    { code: "hr", name: "Hrvatski", shortName: "HR", flag: "hr", flagAlt: "Croatian Flag", flagEmoji: "🇭🇷" },
    { code: "fi", name: "Suomeksi", shortName: "FI", flag: "fi", flagAlt: "Finnish Flag", flagEmoji: "🇫🇮" },
    { code: "hu", name: "Magyar", shortName: "HU", flag: "hu", flagAlt: "Hungarian Flag", flagEmoji: "🇭🇺" },
    { code: "it", name: "Italiano", shortName: "IT", flag: "it", flagAlt: "Italian Flag", flagEmoji: "🇮🇹" },
    { code: "lt", name: "Lietuvių", shortName: "LT", flag: "lt", flagAlt: "Lithuanian Flag", flagEmoji: "🇱🇹" },
    { code: "pl", name: "Polski", shortName: "PL", flag: "pl", flagAlt: "Polish Flag", flagEmoji: "🇵🇱" },
    { code: "pt", name: "Português", shortName: "PT", flag: "pt", flagAlt: "Portuguese Flag", flagEmoji: "🇵🇹" },
    { code: "ro", name: "Română", shortName: "RO", flag: "ro", flagAlt: "Romanian Flag", flagEmoji: "🇷🇴" },
    { code: "es", name: "Español", shortName: "ES", flag: "es", flagAlt: "Spanish Flag", flagEmoji: "🇪🇸" },
    { code: "sk", name: "Slovenčina", shortName: "SK", flag: "sk", flagAlt: "Slovak Flag", flagEmoji: "🇸🇰" },
    { code: "sv", name: "Svenska", shortName: "SV", flag: "se", flagAlt: "Swedish Flag", flagEmoji: "🇸🇪" },
  ];
  const WAND_ICON_SVG = `<svg fill="#ffffff" viewBox="0 0 512 512" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"> <path d="M454.321,219.727l-38.766-51.947l20.815-61.385c2.046-6.032,0.489-12.704-4.015-17.208 c-4.504-4.504-11.175-6.061-17.208-4.015l-61.384,20.815l-51.951-38.766c-5.103-3.809-11.929-4.392-17.605-1.499 c-5.676,2.893-9.217,8.755-9.136,15.125l0.829,64.815l-52.923,37.426c-5.201,3.678-7.863,9.989-6.867,16.282 c0.996,6.291,5.479,11.471,11.561,13.363l43.844,13.63L14.443,483.432c-6.535,6.534-6.535,17.131,0,23.666s17.131,6.535,23.666,0 l257.073-257.072l13.629,43.843c2.172,6.986,8.638,11.768,15.984,11.768c5.375,0,10.494-2.595,13.66-7.072l37.426-52.923 l64.815,0.828c6.322,0.051,12.233-3.462,15.125-9.136S458.131,224.833,454.321,219.727z"></path> <polygon points="173.373,67.274 160.014,42.848 146.656,67.274 122.23,80.632 146.656,93.992 160.014,118.417 173.373,93.992 197.799,80.632 "></polygon> <polygon points="362.946,384.489 352.14,364.731 341.335,384.489 321.577,395.294 341.335,406.1 352.14,425.856 362.946,406.1 382.703,395.294 "></polygon> <polygon points="378.142,19.757 367.337,0 356.531,19.757 336.774,30.563 356.531,41.369 367.337,61.126 378.142,41.369 397.9,30.563 "></polygon> <polygon points="490.635,142.513 484.167,130.689 477.701,142.513 465.876,148.979 477.701,155.446 484.167,167.27 490.635,155.446 502.458,148.979 "></polygon> <polygon points="492.626,294.117 465.876,301.951 439.128,294.117 446.962,320.865 439.128,347.615 465.876,339.781 492.626,347.615 484.791,320.865 "></polygon> </svg>`;
  const PHONE_ICON_SVG = `<svg fill="#ffffff" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z"/></svg>`;
  const BATCH_ICON_SVG = `<svg fill="#ffffff" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M5 4h11.5A2.5 2.5 0 0 1 19 6.5V18H7.5A2.5 2.5 0 0 1 5 15.5V4Zm2 2v9.5c0 .28.22.5.5.5H17V6.5a.5.5 0 0 0-.5-.5H7Zm-3 2h1v9.5A1.5 1.5 0 0 0 6.5 19H17v1H6.5A2.5 2.5 0 0 1 4 17.5V8Zm5.25 6h5.5l-1.75-2.33-1.38 1.72-.95-1.14L9.25 14ZM10 9.5A1.5 1.5 0 1 0 10 12.5 1.5 1.5 0 0 0 10 9.5Z"/></svg>`;
  const PLAN_LIMITS = {
    free: { name: "Free", daily: null, monthly: 5, price: "Free" },
    starter: { name: "Starter", daily: 10, monthly: 75, price: "€3.99/mo" },
    pro: { name: "Pro", daily: 25, monthly: 250, price: "€9.99/mo" },
    business: { name: "Business", daily: 60, monthly: 600, price: "€19.99/mo" },
  };
  const CREDIT_PACK = {
    name: "One-time credits",
    price: "€5.99",
    limits: "20 extra listings",
  };
  const SUPPORT_EMAIL = "support@autolister.app";
  const ANALYTICS_CLIENT_ID_KEY = "analyticsClientId";
  const TAILORED_LIMITS_CONTACT_URL =
    `mailto:${SUPPORT_EMAIL}?subject=AutoLister%20AI%20tailored%20limits`;
  const ACCOUNT_REVIEW_CONTACT_URL =
    `mailto:${SUPPORT_EMAIL}?subject=AutoLister%20AI%20account%20review`;
  const PRIMARY_BUTTON_BACKGROUND =
    "linear-gradient(135deg, #5b54f0 0%, #4338ca 100%)";

  // --- STATE ---
  let generateBtn = null;
  let phoneBtn = null;
  let batchBtn = null;
  let emojiToggleBtn = null;
  let signInBtn = null;
  let isBusy = false;
  let isAuthenticated = false;
  let pollInterval = null;
  let downloadedFiles = new Set();
  let pendingPhoneFiles = new Set();
  let isPhoneUploadPollInFlight = false;
  let activePhoneUploadSessionId = null;
  let phoneUploadPreviewUrls = [];
  let displayedPhoneUploadPreviewCount = 0;
  let phoneUploadPreviewTimer = null;
  let phoneUploadAutoCloseTimer = null;
  let inlineLanguageListenersBound = false;
  let activeDescriptionApplyPromptCleanup = null;
  let batchUploadSessionId = null;
  let batchPollInterval = null;
  let batchAutoCloseTimer = null;
  let batchRemoteFiles = [];
  let batchRemoteFileKeys = new Set();
  let batchMarkedGroups = [];
  let batchSelectedPhotoKeys = new Set();
  let batchIsComplete = false;
  let batchPhotoTileByKey = new Map();
  let batchGroupRowById = new Map();
  let batchNextGroupId = 1;
  let batchLastFileCount = 0;
  let batchLastFileChangeAt = 0;
  let batchProgressGroups = [];
  let batchProgressStatus = null;
  let batchGenerationCapacity = null;
  let batchCapacityLoading = false;
  let batchReceivedEventSent = false;
  let listingToolsReadyTracked = false;
  let signedOutToolsReadyTracked = false;
  let batchCompleteReceivedEventSent = false;
  let eventQueue = [];
  let eventFlushTimer = null;
  let batchTabStatusTimer = null;
  let emojiToggleSyncTimer = null;
  let isBatchPollInFlight = false;
  let batchImagePreloadUrls = new Set();
  let batchImagePreloadCache = new Map();

  // --- HELPER FUNCTIONS ---

  function showToast(message, type = "error", action = null, autoHide = true) {
    let toast = document.getElementById("quickvint-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "quickvint-toast";
      document.body.appendChild(toast);
    }

    const icon = type === "success" ? "✅" : type === "info" ? "ℹ️" : "⚠️";
    let messageHtml = `<span class="toast-message-text">${escapeHtml(message)}</span>`;

    if (action && action.text && typeof action.onClick === "function") {
      messageHtml += `
        <div class="toast-actions">
          <button type="button" class="toast-link primary toast-action-button">
            <span>${escapeHtml(action.text)}</span>
            <span aria-hidden="true">&rarr;</span>
          </button>
      `;
      if (action.secondaryText && action.secondaryUrl) {
        messageHtml += `
          <a class="toast-link secondary" href="${action.secondaryUrl}" target="_blank" rel="noopener noreferrer">
            <span>${escapeHtml(action.secondaryText)}</span>
            <span aria-hidden="true">&rarr;</span>
          </a>
        `;
      }
      messageHtml += "</div>";
    } else if (action && action.text && action.url) {
      messageHtml += `
        <div class="toast-actions">
          <a class="toast-link primary" href="${action.url}" target="_blank" rel="noopener noreferrer">
            <span>${escapeHtml(action.text)}</span>
            <span aria-hidden="true">&rarr;</span>
          </a>
      `;
      if (action.secondaryText && action.secondaryUrl) {
        messageHtml += `
          <a class="toast-link secondary" href="${action.secondaryUrl}" target="_blank" rel="noopener noreferrer">
            <span>${escapeHtml(action.secondaryText)}</span>
            <span aria-hidden="true">&rarr;</span>
          </a>
        `;
      }
      messageHtml += "</div>";
    }

    // Updated HTML structure with close button
    toast.innerHTML = `
      <span class="toast-icon">${icon}</span>
      <div class="toast-content">${messageHtml}</div>
      <button class="toast-close" aria-label="Close">×</button>
    `;

    function hideToast() {
      toast.classList.remove("visible");
      if (window.quickvintToastTimeout)
        clearTimeout(window.quickvintToastTimeout);
      if (window.quickvintToastVisibilityTimeout)
        clearTimeout(window.quickvintToastVisibilityTimeout);
      window.quickvintToastVisibilityTimeout = setTimeout(() => {
        if (!toast.classList.contains("visible")) {
          toast.style.visibility = "hidden";
        }
      }, 300);
    }

    const hasStructuredActions =
      action && action.text && (action.url || typeof action.onClick === "function");
    toast.className = `${type}${hasStructuredActions ? " has-actions" : ""}`;
    toast.style.visibility = "visible"; // Ensure it's visible for the transition

    // Add close handler
    const closeBtn = toast.querySelector(".toast-close");
    if (closeBtn) {
      closeBtn.onclick = hideToast;
    }

    const actionButton = toast.querySelector(".toast-action-button");
    if (actionButton && action && typeof action.onClick === "function") {
      actionButton.onclick = () => {
        hideToast();
        action.onClick();
      };
    }

    // Force reflow
    toast.offsetHeight;

    toast.classList.add("visible");

    if (window.quickvintToastTimeout)
      clearTimeout(window.quickvintToastTimeout);
    if (window.quickvintToastVisibilityTimeout)
      clearTimeout(window.quickvintToastVisibilityTimeout);

    // Only auto-hide if autoHide is true and there is NO action.
    // If there IS an action or autoHide is false, it stays until manually closed.
    if (autoHide && !action) {
      window.quickvintToastTimeout = setTimeout(hideToast, 4000);
    }
  }

  function getTodayKey() {
    return new Date().toISOString().slice(0, 10);
  }

  async function shouldShowMeasurementAdvice() {
    const {
      [MEASUREMENT_ADVICE_HIDDEN_KEY]: hidden,
      [MEASUREMENT_ADVICE_LAST_SHOWN_KEY]: lastShown,
    } = await chrome.storage.local.get([
      MEASUREMENT_ADVICE_HIDDEN_KEY,
      MEASUREMENT_ADVICE_LAST_SHOWN_KEY,
    ]);

    return !hidden && lastShown !== getTodayKey();
  }

  async function markMeasurementAdviceShown() {
    await chrome.storage.local.set({
      [MEASUREMENT_ADVICE_LAST_SHOWN_KEY]: getTodayKey(),
    });
  }

  function createAnalyticsClientId() {
    if (crypto?.randomUUID) return crypto.randomUUID();
    return `cid_${Date.now()}_${Math.random().toString(36).slice(2)}`;
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

  function buildEventPayload(event, context, userProfile, analyticsClientId) {
    return {
      event,
      source: "extension_content",
      page: `${window.location.origin}${window.location.pathname}`,
      plan: userProfile?.subscription_tier || "free",
      context: {
        ...context,
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
      const { supabaseSession, userProfile } = await chrome.storage.local.get([
        "supabaseSession",
        "userProfile",
      ]);
      const headers = { "Content-Type": "application/json" };
      if (supabaseSession?.access_token) {
        headers.Authorization = `Bearer ${supabaseSession.access_token}`;
      }

      fetch(`${API_BASE}/api/events/track`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          events: queuedEvents.map((item) =>
            buildEventPayload(
              item.event,
              item.context,
              userProfile,
              analyticsClientId,
            ),
          ),
        }),
      }).catch(() => {});
    } catch (err) {
      // Analytics must never block listing creation.
    }
  }

  function trackGrowthEvent(event, context = {}) {
    try {
      eventQueue.push({ event, context });

      if (eventQueue.length >= 8) {
        if (!eventFlushTimer) {
          eventFlushTimer = setTimeout(flushGrowthEvents, 0);
        }
        return;
      }

      if (!eventFlushTimer) {
        eventFlushTimer = setTimeout(flushGrowthEvents, 1200);
      }
    } catch (err) {
      // Analytics must never block listing creation.
    }
  }

  function hideMeasurementAdviceForever() {
    chrome.storage.local.set({
      [MEASUREMENT_ADVICE_HIDDEN_KEY]: true,
    });
  }

  async function maybeShowMeasurementAdvice(measurementAdvice) {
    if (!measurementAdvice || !measurementAdvice.trim()) return;
    if (!(await shouldShowMeasurementAdvice())) return;

    await markMeasurementAdviceShown();
    setTimeout(() => {
      showToast(
        "Tip: for clothing, adding simple measurements can reduce buyer questions.",
        "info",
        { text: "Don't show again", onClick: hideMeasurementAdviceForever },
        false,
      );
    }, 300);
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function showLimitPaywall({
    title,
    message,
    options = [],
    trustNote,
    actionText,
    actionUrl,
    secondaryActionText,
    secondaryActionUrl,
  }) {
    trackGrowthEvent("paywall_shown", {
      title,
      optionCount: options.length,
      actionText,
    });

    let toast = document.getElementById("quickvint-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "quickvint-toast";
      document.body.appendChild(toast);
    }

    const logoUrl = chrome.runtime.getURL("icons/icon48.png");
    const selectableIndex = options.findIndex(
      (option) => option.featured && option.selectable !== false,
    );
    const firstSelectableIndex = options.findIndex(
      (option) => option.selectable !== false,
    );
    const defaultOptionIndex =
      selectableIndex >= 0 ? selectableIndex : firstSelectableIndex;
    const defaultOption =
      defaultOptionIndex >= 0 ? options[defaultOptionIndex] : null;
    const defaultActionText = defaultOption?.actionText || actionText;
    const optionsHtml = options.length
      ? `
        <div class="paywall-options">
          ${options
            .map((option, index) => {
              const isSelectable = option.selectable !== false;
              const isSelected = index === defaultOptionIndex;
              return `
                <button
                  class="paywall-option${option.featured ? " featured" : ""}${option.muted ? " muted" : ""}${isSelected ? " selected" : ""}"
                  type="button"
                  data-paywall-option-index="${index}"
                  ${isSelectable ? "" : "disabled"}
                >
                  <div class="paywall-option-main">
                    <span class="paywall-option-name">${escapeHtml(option.name)}</span>
                    ${
                      option.badge
                        ? `<span class="paywall-option-badge">${escapeHtml(option.badge)}</span>`
                        : ""
                    }
                  </div>
                  <div class="paywall-option-side">
                    <span class="paywall-option-price">${escapeHtml(option.price)}</span>
                    <span class="paywall-option-limits">${escapeHtml(option.limits)}</span>
                  </div>
                </button>
              `;
            })
            .join("")}
        </div>
      `
      : "";
    const trustHtml = trustNote
      ? `<div class="paywall-trust">${escapeHtml(trustNote)}</div>`
      : "";

    toast.innerHTML = `
      <div class="paywall-body">
        <div class="paywall-header">
          <img class="paywall-logo" src="${logoUrl}" alt="" aria-hidden="true">
          <div>
            <div class="paywall-kicker">AutoLister AI</div>
            <div class="paywall-title">${escapeHtml(title)}</div>
          </div>
        </div>
        <div class="paywall-message">${escapeHtml(message)}</div>
        ${optionsHtml}
        <button class="paywall-action" type="button">
          <span>${escapeHtml(defaultActionText)}</span>
          <span aria-hidden="true">→</span>
        </button>
        ${
          secondaryActionText && secondaryActionUrl
            ? `<a class="paywall-secondary-action" href="${secondaryActionUrl}" target="_blank" rel="noopener noreferrer">${escapeHtml(secondaryActionText)}</a>`
            : ""
        }
        ${trustHtml}
      </div>
      <button class="toast-close paywall-close" aria-label="Close">×</button>
    `;

    toast.className = "paywall";
    toast.style.visibility = "visible";

    const closeBtn = toast.querySelector(".toast-close");
    if (closeBtn) {
      closeBtn.onclick = () => {
        toast.classList.remove("visible");
        if (window.quickvintToastTimeout)
          clearTimeout(window.quickvintToastTimeout);
      };
    }

    let selectedOptionIndex = defaultOptionIndex;
    const actionBtn = toast.querySelector(".paywall-action");
    const actionTextEl = actionBtn?.querySelector("span");
    const optionButtons = Array.from(
      toast.querySelectorAll("[data-paywall-option-index]"),
    );

    function setSelectedOption(index) {
      const option = options[index];
      if (!option || option.selectable === false) return;
      selectedOptionIndex = index;
      optionButtons.forEach((button) => {
        button.classList.toggle(
          "selected",
          Number(button.dataset.paywallOptionIndex) === index,
        );
      });
      if (actionTextEl) {
        actionTextEl.textContent = option.actionText || actionText;
      }
    }

    optionButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const optionIndex = Number(button.dataset.paywallOptionIndex);
        setSelectedOption(optionIndex);
        const option = options[optionIndex];
        trackGrowthEvent("paywall_option_select", {
          tier: option?.tier || null,
          checkoutType: option?.checkoutType || null,
        });
      });
    });

    if (actionBtn) {
      actionBtn.addEventListener("click", async () => {
        const selectedOption = options[selectedOptionIndex];
        const checkoutOption =
          selectedOption && selectedOption.selectable !== false
            ? selectedOption
            : null;

        if (!checkoutOption?.checkoutType) {
          trackGrowthEvent("paywall_action_click", {
            action: "external_link",
            tier: checkoutOption?.tier || null,
          });
          window.open(
            checkoutOption?.actionUrl || actionUrl,
            "_blank",
            "noopener,noreferrer",
          );
          return;
        }

        const previousText = actionTextEl?.textContent || actionText;
        const checkoutWindow = window.open("about:blank", "_blank");
        actionBtn.disabled = true;
        if (actionTextEl) actionTextEl.textContent = "Opening checkout...";
        trackGrowthEvent("checkout_start", {
          source: "extension_paywall",
          tier: checkoutOption.tier,
          checkoutType: checkoutOption.checkoutType,
        });

        try {
          const checkoutUrl = await createCheckoutForPaywall(checkoutOption);
          trackGrowthEvent("checkout_opened", {
            source: "extension_paywall",
            tier: checkoutOption.tier,
            checkoutType: checkoutOption.checkoutType,
          });
          if (checkoutWindow) {
            checkoutWindow.location.href = checkoutUrl;
          } else {
            window.open(checkoutUrl, "_blank", "noopener,noreferrer");
          }
        } catch (error) {
          if (checkoutWindow) checkoutWindow.close();
          console.error("Paywall checkout error:", error);
          showToast(
            error.message || "Unable to open the payment page. Please try again.",
            "error",
          );
        } finally {
          actionBtn.disabled = false;
          if (actionTextEl) actionTextEl.textContent = previousText;
        }
      });
    }

    toast.offsetHeight;
    toast.classList.add("visible");

    if (window.quickvintToastTimeout)
      clearTimeout(window.quickvintToastTimeout);
  }

  function normalizeLanguageCode(code) {
    return code === "cs" ? "cz" : code;
  }

  async function getPricingUrl() {
    return new Promise((resolve) => {
      chrome.storage.local.get(["supabaseSession", "userProfile"], (data) => {
        const user = data.supabaseSession?.user;
        const profile = data.userProfile;

        try {
          const userData = {
            source: "extension",
            signed_in: !!user,
            plan: profile?.subscription_tier || "free",
            subscription_status: profile?.subscription_status || "free",
            email: user?.email || "",
            timestamp: Date.now(),
          };
          // Simple base64 encode
          const token = btoa(JSON.stringify(userData));
          resolve(`${API_BASE}/pricing?token=${token}`);
        } catch (e) {
          console.error("Error building pricing URL:", e);
          resolve(`${API_BASE}/pricing`);
        }
      });
    });
  }

  function normalizeTier(tier) {
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

  function isFreeProfile(profile) {
    const tier = normalizeTier(profile?.subscription_tier);
    return profile?.subscription_status !== "active" || tier === "free";
  }

  function canUseEmojiSetting(profile) {
    const tier = normalizeTier(profile?.subscription_tier);
    if (profile?.subscription_status !== "active" || tier === "free") {
      return true;
    }
    return tier === "pro" || tier === "business";
  }

  function formatPlanLimitSummary(plan) {
    const daily = plan.daily === null ? "no daily limit" : `${plan.daily}/day`;
    return `${daily} · ${plan.monthly}/month`;
  }

  function planOption(
    tier,
    { badge = "", featured = false, muted = false, selectable = true } = {},
  ) {
    const plan = PLAN_LIMITS[tier];
    return {
      tier,
      name: plan.name,
      price: plan.price,
      limits: formatPlanLimitSummary(plan),
      actionText: `Upgrade to ${plan.name}`,
      checkoutType: "subscription",
      badge,
      featured,
      muted,
      selectable,
    };
  }

  function creditPackOption({ badge = "", featured = false } = {}) {
    return {
      tier: "credit_pack",
      name: CREDIT_PACK.name,
      price: CREDIT_PACK.price,
      limits: CREDIT_PACK.limits,
      actionText: "Buy one-time credits",
      checkoutType: "credit_pack",
      badge,
      featured,
    };
  }

  function tailoredLimitsOption({ badge = "", featured = false } = {}) {
    return {
      name: "Tailored limits",
      price: SUPPORT_EMAIL,
      limits: "For higher volume",
      actionText: "Contact us",
      actionUrl: TAILORED_LIMITS_CONTACT_URL,
      badge,
      featured,
    };
  }

  function showAccountPausedPaywall(pricingUrl) {
    showLimitPaywall({
      title: "Continue with a paid option",
      message:
        "Paid plans and credit packs let legitimate sellers continue while support reviews duplicate free-trial issues.",
      options: [
        planOption("starter", { badge: "Best next step", featured: true }),
        planOption("pro"),
        planOption("business"),
        creditPackOption({ badge: "One-time purchase" }),
      ],
      trustNote: "Secure checkout by Stripe. Contact support if this pause looks wrong.",
      actionText: "Upgrade to Starter",
      actionUrl: pricingUrl,
      secondaryActionText: "Contact support",
      secondaryActionUrl: ACCOUNT_REVIEW_CONTACT_URL,
    });
  }

  async function createCheckoutForPaywall(option) {
    const response = await sendMessage({
      type: "CREATE_CHECKOUT",
      checkoutType: option.checkoutType,
      tier: option.tier,
      source: "extension_paywall",
    });
    if (!response?.ok || !response.url) {
      throw new Error(response?.error || "Unable to open the payment page.");
    }
    return response.url;
  }

  function buildLimitMessage(limitData = {}) {
    const code = limitData.code;
    const currentTier = normalizeTier(limitData.currentTier);
    const nextTier = limitData.nextTier ? normalizeTier(limitData.nextTier) : null;
    const nextPlan = nextTier ? PLAN_LIMITS[nextTier] : null;
    if (code === "burst_limit") {
      return {
        message: "Too many requests at once. Please wait a moment and try again.",
        actionText: null,
        paywall: false,
      };
    }

    if (code === "service_unavailable") {
      return {
        message: limitData.error || "Service temporarily unavailable. Please try again later.",
        actionText: null,
        paywall: false,
      };
    }

    if (code === "account_paused") {
      return {
        title: "Account paused",
        message:
          limitData.error ||
          "This account is paused because it appears linked to duplicate free-trial usage. To continue, contact support or choose a paid option.",
        actionText: "View paid options",
        secondaryActionText: "Contact support",
        secondaryActionUrl: ACCOUNT_REVIEW_CONTACT_URL,
        paywall: false,
      };
    }

    if (code === "free_lifetime_limit") {
      return {
        title: "Free listings used",
        message: "Pick the plan that fits how often you list.",
        options: [
          planOption("starter", { badge: "Best next step", featured: true }),
          planOption("pro"),
          planOption("business"),
          creditPackOption({ badge: "No commitment" }),
        ],
        trustNote: "Secure checkout by Stripe. Cancel anytime.",
        actionText: "Upgrade to Starter",
        secondaryActionText: "Compare all plans",
        paywall: true,
      };
    }

    if (currentTier === "business") {
      return {
        title: "Limit reached",
        message:
          code === "monthly_limit" || code === "daily_limit"
            ? "Add a few more listings without changing plan."
            : limitData.error || "Usage limit reached.",
        options:
          code === "monthly_limit" || code === "daily_limit"
            ? [
                creditPackOption({ badge: "One-time", featured: true }),
                tailoredLimitsOption(),
              ]
            : [],
        trustNote:
          code === "monthly_limit" || code === "daily_limit"
            ? "Secure checkout by Stripe. One-time purchase."
            : "",
        actionText:
          code === "monthly_limit" || code === "daily_limit"
            ? "Buy one-time credits"
            : null,
        secondaryActionText:
          code === "monthly_limit" || code === "daily_limit"
            ? null
            : null,
        paywall: code === "monthly_limit" || code === "daily_limit",
      };
    }

    if (nextPlan) {
      const titleText =
        code === "monthly_limit" ? "Monthly limit reached" : "Daily limit reached";
      const nextTierOptions =
        currentTier === "starter"
          ? [
              planOption("pro", { badge: "Recommended", featured: true }),
              planOption("business"),
              creditPackOption({ badge: "One-time" }),
            ]
          : currentTier === "pro"
            ? [
                planOption("business", { badge: "Recommended", featured: true }),
                creditPackOption({ badge: "One-time" }),
              ]
            : [planOption(nextTier, { badge: "Recommended", featured: true })];

      return {
        title: titleText,
        message: "Choose more monthly room or a one-time top-up.",
        options: nextTierOptions,
        trustNote: "Secure checkout by Stripe. Cancel anytime.",
        actionText: `Upgrade to ${nextPlan.name}`,
        secondaryActionText: "Compare all plans",
        paywall: true,
      };
    }

    return {
      message:
        limitData.error ||
        "Pick the option that fits your next listings.",
      actionText: "Compare all plans",
      options: [
        planOption("starter", { featured: true }),
        planOption("pro"),
        planOption("business"),
      ],
      trustNote: "Secure checkout by Stripe. Cancel anytime.",
      paywall: true,
      title: "Usage limit reached",
    };
  }

  async function sendMessage(message) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(message, resolve);
    });
  }

  /**
   * Compresses and resizes an image to reduce token usage for AI processing.
   * @param {string} imageUrl - The original image URL
   * @param {number} maxDimension - Maximum width or height (default: 1024)
   * @param {number} quality - JPEG quality 0-1 (default: 0.8)
   * @returns {Promise<string>} Base64 encoded compressed image
   */
  async function compressImage(imageUrl, maxDimension = 1024, quality = 0.8) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";

      img.onload = () => {
        try {
          // Calculate new dimensions while maintaining aspect ratio
          let width = img.width;
          let height = img.height;

          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          // Create canvas and draw resized image
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);

          // Convert to base64 with compression
          const base64 = canvas.toDataURL("image/jpeg", quality);
          resolve(base64);
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => {
        reject(new Error(`Failed to load image: ${imageUrl}`));
      };

      img.src = imageUrl;
    });
  }

  /**
   * Compresses multiple images in parallel with error handling.
   * @param {string[]} imageUrls - Array of image URLs
   * @returns {Promise<string[]>} Array of compressed base64 images
   */
  async function compressImages(imageUrls) {
    const compressionPromises = imageUrls.map(async (url) => {
      try {
        return await compressImage(url);
      } catch (error) {
        console.warn(`Failed to compress image ${url}:`, error);
        // Return original URL as fallback if compression fails
        return url;
      }
    });

    return Promise.all(compressionPromises);
  }

  function getUploadedImageUrls() {
    const grid = document.querySelector(SELECTORS.mediaGrid);
    const root = grid || document;
    const images = Array.from(root.querySelectorAll(SELECTORS.mediaImage));
    const seenUrls = new Set();

    return images
      .map((img) => img.currentSrc || img.src || img.getAttribute("src"))
      .filter((url) => {
        if (!url || seenUrls.has(url)) return false;
        seenUrls.add(url);
        return true;
      });
  }

  function getVisibleUploadedPhotoCount() {
    const grid = document.querySelector(SELECTORS.mediaGrid);
    if (!grid) return getUploadedImageUrls().length;
    return grid.querySelectorAll(SELECTORS.mediaPhotoBox).length;
  }

  // --- AUTHENTICATION & STATE SYNC ---

  function initializeAuthState() {
    chrome.storage.local.get("supabaseSession", ({ supabaseSession }) => {
      isAuthenticated = !!supabaseSession?.access_token;
      updateButtonUI();
    });
  }

  chrome.storage.onChanged.addListener((changes) => {
    if (changes.supabaseSession) {
      isAuthenticated = !!changes.supabaseSession.newValue?.access_token;
      updateButtonUI();
    }
    if (
      changes.selectedLanguage ||
      changes.selectedTitleLanguage ||
      changes.selectedDescriptionLanguage
    ) {
      syncInlineLanguageControls();
    }
    if (changes.useEmojis || changes.userProfile) {
      syncEmojiToggleState();
    }
  });

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message?.type === "BATCH_PING") {
      sendResponse({ ok: true });
      return false;
    }

    if (message?.type === "RUN_BATCH_ITEM") {
      runBatchItem(message)
        .then((result) => sendResponse(result))
        .catch((err) => {
          console.error("Batch item error:", err);
          sendResponse({
            ok: false,
            error: err.message || "Batch item failed.",
          });
        });
      return true;
    }

    if (message?.type === "BATCH_PROGRESS") {
      handleBatchProgress(message);
      sendResponse({ ok: true });
      return false;
    }

    return false;
  });

  // --- UI ---

  function injectStylesheet() {
    const style = document.createElement("style");
    style.textContent = `
      #${BTN_ID}, #${PHONE_BTN_ID}, #${BATCH_BTN_ID} {
        display: none;
        align-items: center;
        justify-content: center;
        gap: 7px;
        min-height: 38px;
        padding: 9px 18px;
        background: #a1a1aa;
        color: white;
        border: none;
        border-radius: 10px;
        font-size: 14px;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        cursor: not-allowed;
        transition: transform 0.16s ease, box-shadow 0.16s ease, filter 0.16s ease, opacity 0.16s ease;
        font-weight: 650;
        line-height: 1;
        box-shadow: 0 7px 16px rgba(79, 70, 229, 0.22);
        text-align: center;
        white-space: nowrap;
      }

      #${SIGN_IN_BTN_ID} {
        display: none;
        width: 100%;
        margin-top: 14px;
        padding: 14px 24px;
        background: linear-gradient(135deg, rgb(79, 70, 229) 0%, rgb(67, 56, 202) 100%);
        color: white;
        border: none;
        border-radius: 12px;
        font-size: 15px;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        font-weight: 600;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(79, 70, 229, 0.25);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        align-items: center;
        justify-content: center;
        gap: 10px;
        text-decoration: none;
        position: relative;
        overflow: hidden;
      }

      #${SIGN_IN_BTN_ID}::after {
        content: "";
        position: absolute;
        top: 0;
        left: -150%;
        width: 100%;
        height: 100%;
        background: linear-gradient(
          to right,
          rgba(255, 255, 255, 0) 0%,
          rgba(255, 255, 255, 0.03) 15%,
          rgba(255, 255, 255, 0.35) 50%,
          rgba(255, 255, 255, 0.03) 85%,
          rgba(255, 255, 255, 0) 100%
        );
        transform: skewX(-20deg);
        animation: slow-glide-fast-restart 3s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite;
        pointer-events: none;
      }

      @keyframes slow-glide-fast-restart {
        0% {
          left: -150%;
        }
        /* The shimmer takes 80% of the time (3.2s) to cross.
          This makes the movement very slow and deliberate. */
        80% {
          left: 150%;
        }
        /* It only pauses for the remaining 20% (0.8s).
          This makes the "restart" feel much faster. */
        100% {
          left: 150%;
        }
      }

      #${SIGN_IN_BTN_ID}:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 24px rgba(79, 70, 229, 0.4);
        /* Brighter gradient on hover for better feedback */
        background: linear-gradient(135deg, rgb(90, 82, 245) 0%, rgb(79, 70, 229) 100%);
      }

      #${SIGN_IN_BTN_ID}:active {
        transform: translateY(0);
      }

      #${SIGN_IN_BTN_ID} svg {
        width: 18px;
        height: 18px;
        fill: currentColor;
      }

      #${PHONE_BTN_ID}, #${BATCH_BTN_ID} {
        margin-left: 8px;
      }

      #${BTN_ID}:disabled, #${PHONE_BTN_ID}:disabled, #${BATCH_BTN_ID}:disabled {
        box-shadow: 0 3px 8px rgba(17, 24, 39, 0.1);
        opacity: 0.82;
      }

      #${BTN_ID}.is-loading::before,
      #${PHONE_BTN_ID}.is-loading::before,
      #${BATCH_BTN_ID}.is-loading::before {
        content: "";
        width: 14px;
        height: 14px;
        border: 2px solid rgba(255, 255, 255, 0.38);
        border-top-color: #ffffff;
        border-radius: 999px;
        animation: quickvintSpin 760ms linear infinite;
      }

      #${BTN_ID}.is-loading .icon,
      #${PHONE_BTN_ID}.is-loading .icon,
      #${BATCH_BTN_ID}.is-loading .icon {
        display: none !important;
      }

      @keyframes quickvintSpin {
        to {
          transform: rotate(360deg);
        }
      }

      #quickvint-batch-tab-status {
        position: static;
        display: inline-flex;
        align-items: center;
        gap: 9px;
        width: 100%;
        max-width: 100%;
        min-height: 42px;
        margin: 8px 0 10px;
        padding: 10px 13px;
        border: 1px solid rgba(79, 70, 229, 0.18);
        border-radius: 12px;
        background: rgba(255, 255, 255, 0.97);
        color: #111827;
        box-shadow: 0 16px 42px rgba(15, 23, 42, 0.18), 0 8px 18px rgba(79, 70, 229, 0.12);
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-size: 13px;
        font-weight: 780;
        line-height: 1.2;
        transform: translateY(-4px);
        opacity: 0;
        pointer-events: none;
        transition: opacity 160ms ease, transform 160ms ease;
      }

      #quickvint-batch-tab-status.visible {
        opacity: 1;
        transform: translateY(0);
      }

      #quickvint-batch-tab-status .batch-tab-status-icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex: 0 0 18px;
        width: 18px;
        height: 18px;
        border-radius: 999px;
        color: #ffffff;
        font-size: 12px;
        font-weight: 900;
      }

      #quickvint-batch-tab-status.loading .batch-tab-status-icon {
        border: 2px solid rgba(79, 70, 229, 0.22);
        border-top-color: #4f46e5;
        background: transparent;
        animation: quickvintSpin 760ms linear infinite;
      }

      #quickvint-batch-tab-status.success .batch-tab-status-icon {
        background: #16a34a;
      }

      #quickvint-batch-tab-status.error .batch-tab-status-icon {
        background: #dc2626;
      }

      .quickvint-lang-field {
        display: none;
        align-items: center;
        width: fit-content;
        margin-top: 0;
        position: relative;
        color: #4c1d95;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      }

      .quickvint-lang-title-host {
        display: flex !important;
        flex-direction: column;
        align-items: flex-start;
        gap: 10px;
      }

      .quickvint-lang-trigger {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        height: 28px;
        padding: 0 9px;
        border: 1px solid #ddd6fe;
        border-radius: 8px;
        background: #f8f7ff;
        color: #312e81;
        cursor: pointer;
        font-size: 12px;
        font-weight: 700;
        outline: none;
      }

      .quickvint-lang-trigger::after {
        content: "";
        width: 6px;
        height: 6px;
        border-right: 1.5px solid currentColor;
        border-bottom: 1.5px solid currentColor;
        transform: rotate(45deg) translateY(-2px);
      }

      .quickvint-lang-menu {
        display: none;
        position: fixed;
        z-index: 2147483647;
        min-width: 92px;
        max-height: 240px;
        overflow-y: auto;
        padding: 2px 0;
        border: 1px solid #c7d2fe;
        border-radius: 6px;
        background: #ffffff;
        box-shadow: 0 8px 18px rgba(17, 24, 39, 0.14);
      }

      .quickvint-lang-field.open .quickvint-lang-menu {
        display: block;
      }

      .quickvint-lang-option {
        display: flex;
        align-items: center;
        gap: 7px;
        width: 100%;
        margin: 0;
        padding: 6px 9px;
        border: 0 !important;
        border-radius: 0;
        background: transparent !important;
        box-shadow: none !important;
        color: #1f2937;
        cursor: pointer;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        font-size: 12px;
        font-weight: 700;
        line-height: 1.2;
        text-align: left;
        appearance: none;
        -webkit-appearance: none;
        transition: background-color 120ms ease, color 120ms ease;
      }

      .quickvint-lang-option.active {
        background: #eef2ff;
        color: #3730a3;
      }

      .quickvint-lang-option:hover {
        background: #f6f7ff !important;
        color: #312e81;
      }

      .quickvint-lang-field img {
        width: 16px;
        height: 11px;
        border-radius: 2px;
        object-fit: cover;
        box-shadow: 0 0 0 1px rgba(17, 24, 39, 0.08);
      }

      #${BTN_ID}:not(:disabled):hover, #${PHONE_BTN_ID}:not(:disabled):hover, #${BATCH_BTN_ID}:not(:disabled):hover {
        box-shadow: 0 10px 22px rgba(79, 70, 229, 0.3);
        filter: brightness(1.05);
        transform: translateY(-1px);
      }

      #${BTN_ID}:not(:disabled):active, #${PHONE_BTN_ID}:not(:disabled):active, #${BATCH_BTN_ID}:not(:disabled):active {
        box-shadow: 0 5px 12px rgba(79, 70, 229, 0.24);
        filter: brightness(0.98);
        transform: translateY(0);
      }

      #${BTN_ID} .icon, #${PHONE_BTN_ID} .icon, #${BATCH_BTN_ID} .icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 17px;
        height: 17px;
        flex: 0 0 17px;
      }

      #${BTN_ID} .icon svg, #${PHONE_BTN_ID} .icon svg, #${BATCH_BTN_ID} .icon svg {
        display: block;
        width: 100%;
        height: 100%;
      }

      /* Modal Styles */
      #${MODAL_ID} {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.48);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        animation: fadeIn 0.2s ease-out;
      }

      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }

      @keyframes slideUp {
        from { transform: translateY(10px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }

      #${MODAL_ID} .modal-content {
        background: white;
        padding: 32px;
        border-radius: 20px;
        text-align: center;
        max-width: 430px;
        width: 90%;
        max-height: calc(100vh - 32px);
        overflow-y: auto;
        box-shadow: 0 18px 42px -12px rgba(0, 0, 0, 0.32);
        animation: slideUp 0.3s ease-out;
        position: relative;
      }

      #${MODAL_ID} .close-x {
        position: absolute;
        top: 16px;
        right: 16px;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: transparent;
        border: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
        color: #9ca3af;
        font-size: 24px;
        line-height: 1;
        padding: 0;
      }

      #${MODAL_ID} .close-x:hover {
        background: #f3f4f6;
        color: #374151;
      }

      #${MODAL_ID} .modal-header {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        margin-bottom: 8px;
      }

      #${MODAL_ID} .feature-pill {
        background: #dcfce7;
        color: #166534;
        padding: 4px 10px;
        border-radius: 999px;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.02em;
        border: 1px solid #bbf7d0;
      }

      #${MODAL_ID} h3 {
        margin: 0;
        font-size: 22px;
        font-weight: 700;
        color: #111827;
        letter-spacing: -0.02em;
      }

      #${MODAL_ID} .subtitle {
        font-size: 14px;
        color: #6b7280;
        margin: 0 0 32px 0;
      }

      #${MODAL_ID} .qr-container {
        margin: 0 auto 24px;
        padding: 12px;
        background: white;
        border-radius: 20px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.06);
        display: inline-block;
        border: 1px solid #f3f4f6;
      }

      #${MODAL_ID} #qr-code {
        display: block;
        border-radius: 12px;
        width: 180px;
        height: 180px;
      }

      #${MODAL_ID} .instruction {
        margin: 0 0 24px 0;
        color: #4b5563;
        font-size: 14px;
        line-height: 1.5;
      }

      #${MODAL_ID} .modal-buttons {
        display: flex;
        gap: 12px;
        justify-content: center;
        margin-top: 32px;
      }

      #${MODAL_ID} .close-btn, #${MODAL_ID} .generate-btn {
        flex: 1;
        padding: 12px 20px;
        border-radius: 12px;
        cursor: pointer;
        font-weight: 600;
        font-size: 14px;
        transition: all 0.2s ease;
        border: none;
      }

      #${MODAL_ID} .close-btn {
        background: white;
        color: #374151;
        border: 1px solid #e5e7eb;
      }

      #${MODAL_ID} .generate-btn {
        background: ${PRIMARY_BUTTON_BACKGROUND};
        color: white;
        box-shadow: 0 4px 12px rgba(79, 70, 229, 0.25);
      }

      #${MODAL_ID} .close-btn:hover {
        background: #f9fafb;
        border-color: #d1d5db;
      }

      #${MODAL_ID} .generate-btn:hover {
        background: ${PRIMARY_BUTTON_BACKGROUND};
        filter: brightness(1.05);
        transform: translateY(-1px);
        box-shadow: 0 6px 16px rgba(79, 70, 229, 0.35);
      }

      #${MODAL_ID} .status {
        margin-top: 0;
        padding: 8px 16px;
        font-size: 13px;
        color: #6b7280;
        background: #f9fafb;
        border-radius: 99px;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        border: 1px solid #f3f4f6;
      }

      #${MODAL_ID} .status.waiting {
        color: #4f46e5;
        background: #eef2ff;
        border-color: #e0e7ff;
      }

      #${MODAL_ID} .status.waiting::before {
        content: '';
        width: 8px;
        height: 8px;
        background: currentColor;
        border-radius: 50%;
        animation: pulse 1.5s ease-in-out infinite;
      }

      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.4; }
      }

      #${MODAL_ID} .phone-previews {
        height: 50px;
        margin: 0 0 14px;
        padding: 8px 10px;
        background: #f9fafb;
        border: 1px solid #eef0f3;
        border-radius: 12px;
        display: flex;
        align-items: center;
        gap: 10px;
        overflow: hidden;
      }

      #${MODAL_ID} .preview-header {
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        flex: 0 0 54px;
        color: #374151;
        font-size: 11px;
        font-weight: 700;
        line-height: 1.2;
      }

      #${MODAL_ID} .preview-extra {
        color: #6b7280;
        font-weight: 600;
        margin-top: 3px;
      }

      #${MODAL_ID} .preview-grid {
        display: flex;
        align-items: center;
        gap: 6px;
        min-width: 0;
        flex: 1;
        overflow: hidden;
      }

      #${MODAL_ID} .preview-empty {
        display: flex;
        align-items: center;
        gap: 8px;
        color: #6b7280;
        font-size: 12px;
        font-weight: 600;
        white-space: nowrap;
      }

      #${MODAL_ID} .waiting-dots,
      #${BATCH_MODAL_ID} .waiting-dots {
        display: inline-flex;
        width: 18px;
        margin-left: 1px;
      }

      #${MODAL_ID} .waiting-dots span,
      #${BATCH_MODAL_ID} .waiting-dots span {
        animation: waitingDot 1.15s ease-in-out infinite;
      }

      #${MODAL_ID} .waiting-dots span:nth-child(2),
      #${BATCH_MODAL_ID} .waiting-dots span:nth-child(2) {
        animation-delay: 0.16s;
      }

      #${MODAL_ID} .waiting-dots span:nth-child(3),
      #${BATCH_MODAL_ID} .waiting-dots span:nth-child(3) {
        animation-delay: 0.32s;
      }

      @keyframes waitingDot {
        0%, 80%, 100% { opacity: 0.28; }
        40% { opacity: 1; }
      }

      #${MODAL_ID} .preview-pulse {
        width: 28px;
        height: 28px;
        border-radius: 8px;
        background: linear-gradient(90deg, #eef2ff 0%, #f8fafc 45%, #eef2ff 100%);
        background-size: 200% 100%;
        border: 1px solid #e0e7ff;
        animation: previewShimmer 1.4s ease-in-out infinite;
      }

      #${MODAL_ID} .preview-dot {
        width: 5px;
        height: 5px;
        border-radius: 999px;
        background: #818cf8;
        animation: pulse 1.4s ease-in-out infinite;
      }

      @keyframes previewShimmer {
        0% { background-position: 100% 0; }
        100% { background-position: -100% 0; }
      }

      #${MODAL_ID} .preview-thumb {
        flex: 0 0 32px;
        width: 32px;
        height: 32px;
        object-fit: cover;
        border-radius: 6px;
        border: 1px solid #e5e7eb;
        background: white;
        opacity: 0;
        transform: translateY(4px) scale(0.96);
        animation: previewIn 0.22s ease-out forwards;
      }

      #${MODAL_ID} .preview-more {
        flex: 0 0 auto;
        color: #6b7280;
        font-size: 12px;
        font-weight: 700;
        padding: 0 2px;
      }

      @keyframes previewIn {
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }

      #${BATCH_MODAL_ID} {
        position: fixed;
        inset: 0;
        background: rgba(17, 24, 39, 0.46);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 2147483646;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        animation: fadeIn 0.2s ease-out;
      }

      #${BATCH_MODAL_ID} .batch-content {
        width: min(760px, calc(100vw - 28px));
        max-height: calc(100vh - 28px);
        overflow: auto;
        background: #fbfcff;
        border: 1px solid rgba(229, 231, 235, 0.9);
        border-radius: 16px;
        box-shadow: 0 22px 54px rgba(17, 24, 39, 0.24);
        padding: 18px;
        color: #111827;
        animation: slideUp 0.24s ease-out;
      }

      #${BATCH_MODAL_ID} .batch-topbar {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 16px;
        margin-bottom: 18px;
      }

      #${BATCH_MODAL_ID} .batch-title {
        margin: 0 0 5px;
        font-size: 20px;
        font-weight: 800;
        letter-spacing: 0;
      }

      #${BATCH_MODAL_ID} .batch-subtitle {
        margin: 0;
        color: #6b7280;
        font-size: 13px;
        line-height: 1.45;
      }

      #${BATCH_MODAL_ID} .batch-close {
        flex: 0 0 auto;
        width: 32px;
        height: 32px;
        border: 0;
        border-radius: 8px;
        background: #f3f4f6;
        color: #4b5563;
        cursor: pointer;
        font-size: 22px;
        line-height: 1;
      }

      #${BATCH_MODAL_ID} .batch-close:hover {
        background: #e5e7eb;
        color: #111827;
      }

      #${BATCH_MODAL_ID} .batch-layout {
        display: grid;
        grid-template-columns: 204px minmax(0, 1fr);
        gap: 16px;
        align-items: start;
      }

      #${BATCH_MODAL_ID} .batch-qr {
        padding: 12px;
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        background: #ffffff;
        text-align: center;
      }

      #${BATCH_MODAL_ID} .batch-qr img {
        width: 164px;
        height: 164px;
        border-radius: 8px;
        background: #ffffff;
      }

      #${BATCH_MODAL_ID} .batch-qr-note {
        margin: 10px 0 0;
        color: #6b7280;
        font-size: 12px;
        line-height: 1.4;
      }

      #${BATCH_MODAL_ID} .batch-status {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        min-height: 32px;
        margin: 0 0 14px;
        padding: 7px 12px;
        border: 1px solid #e0e7ff;
        border-radius: 999px;
        background: #eef2ff;
        color: #4f46e5;
        font-size: 12px;
        font-weight: 750;
      }

      #${BATCH_MODAL_ID} .batch-status::before {
        content: "";
        width: 7px;
        height: 7px;
        border-radius: 999px;
        background: currentColor;
        animation: pulse 1.4s ease-in-out infinite;
      }

      #${BATCH_MODAL_ID} .batch-status.done {
        border-color: #bbf7d0;
        background: #ecfdf5;
        color: #047857;
      }

      #${BATCH_MODAL_ID} .batch-section-label {
        margin: 0 0 8px;
        color: #374151;
        font-size: 12px;
        font-weight: 850;
      }

      #${BATCH_MODAL_ID} .batch-helper {
        margin: 9px 0 0;
        color: #6b7280;
        font-size: 12px;
        line-height: 1.42;
      }

      #${BATCH_MODAL_ID} .batch-helper + .batch-section-label {
        margin-top: 14px;
      }

      #${BATCH_MODAL_ID} .batch-strip {
        min-height: 112px;
        padding: 10px;
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        background: #ffffff;
        display: flex;
        align-items: center;
        gap: 8px;
        overflow-x: auto;
      }

      #${BATCH_MODAL_ID} .batch-empty {
        width: 100%;
        color: #6b7280;
        text-align: center;
        font-size: 13px;
        font-weight: 650;
      }

      #${BATCH_MODAL_ID} .batch-photo-wrap {
        flex: 0 0 auto;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      #${BATCH_MODAL_ID} .batch-photo {
        position: relative;
        width: 82px;
        height: 96px;
        border-radius: 9px;
        overflow: hidden;
        background: #f3f4f6;
        border: 1px solid #e5e7eb;
      }

      #${BATCH_MODAL_ID} .batch-photo img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }

      #${BATCH_MODAL_ID} .batch-photo-badge {
        position: absolute;
        left: 6px;
        top: 6px;
        padding: 3px 6px;
        border-radius: 999px;
        background: rgba(17, 24, 39, 0.74);
        color: #ffffff;
        font-size: 10px;
        font-weight: 800;
      }

      #${BATCH_MODAL_ID} .batch-gallery {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(86px, 1fr));
        gap: 10px;
        margin-top: 10px;
      }

      #${BATCH_MODAL_ID} .batch-gallery .batch-photo-wrap {
        display: block;
      }

      #${BATCH_MODAL_ID} .batch-gallery .batch-photo {
        width: 100%;
        height: auto;
        aspect-ratio: 1 / 1.18;
        cursor: pointer;
        border: 2px solid #e5e7eb;
        background: #ffffff;
        transition: border-color 120ms ease, box-shadow 120ms ease, opacity 120ms ease, transform 120ms ease;
      }

      #${BATCH_MODAL_ID} .batch-gallery .batch-photo.selected {
        border-color: #4f46e5;
        box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.16);
        transform: translateY(-1px);
      }

      #${BATCH_MODAL_ID} .batch-gallery .batch-photo.marked {
        opacity: 0.38;
        filter: grayscale(0.35);
        cursor: default;
      }

      #${BATCH_MODAL_ID} .batch-select-check {
        position: absolute;
        right: 7px;
        top: 7px;
        width: 22px;
        height: 22px;
        border-radius: 999px;
        border: 2px solid #ffffff;
        background: rgba(17, 24, 39, 0.4);
        color: #ffffff;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 13px;
        font-weight: 900;
        box-shadow: 0 3px 8px rgba(17, 24, 39, 0.18);
      }

      #${BATCH_MODAL_ID} .batch-gallery .batch-photo.selected .batch-select-check {
        background: #4f46e5;
      }

      #${BATCH_MODAL_ID} .batch-inline-actions {
        display: flex;
        align-items: center;
        gap: 10px;
        flex-wrap: wrap;
        margin-top: 14px;
      }

      #${BATCH_MODAL_ID} .batch-selection-count {
        color: #6b7280;
        font-size: 12px;
        font-weight: 750;
        margin-right: auto;
      }

      #${BATCH_MODAL_ID} .batch-groups {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
        gap: 10px;
        margin-top: 12px;
      }

      #${BATCH_MODAL_ID} .batch-item-card {
        min-width: 0;
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        background: #ffffff;
        padding: 10px;
        box-shadow: 0 1px 2px rgba(17, 24, 39, 0.04);
      }

      #${BATCH_MODAL_ID} .batch-item-title {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 8px;
        margin: 0 0 9px;
        color: #111827;
        font-size: 12px;
        font-weight: 850;
      }

      #${BATCH_MODAL_ID} .batch-item-count {
        color: #6b7280;
        font-size: 11px;
        font-weight: 750;
      }

      #${BATCH_MODAL_ID} .batch-ungroup {
        border: 0;
        background: transparent;
        color: #4f46e5;
        cursor: pointer;
        font-size: 11px;
        font-weight: 850;
        padding: 0;
      }

      #${BATCH_MODAL_ID} .batch-item-photos {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }

      #${BATCH_MODAL_ID} .batch-item-card .batch-photo-wrap {
        display: block;
      }

      #${BATCH_MODAL_ID} .batch-item-card .batch-photo {
        width: 70px;
        height: 84px;
      }

      #${BATCH_MODAL_ID} .batch-actions {
        display: flex;
        gap: 10px;
        justify-content: flex-end;
        margin-top: 18px;
      }

      #${BATCH_MODAL_ID} .batch-actions button,
      #${BATCH_MODAL_ID} .batch-inline-actions button {
        min-height: 36px;
        width: auto;
        padding: 0 12px;
        border-radius: 8px;
        border: 1px solid #d1d5db;
        background: #ffffff;
        color: #111827;
        cursor: pointer;
        font-size: 13px;
        font-weight: 800;
      }

      #${BATCH_MODAL_ID} .batch-actions button:hover:not(:disabled),
      #${BATCH_MODAL_ID} .batch-inline-actions button:hover:not(:disabled) {
        background: #f9fafb;
        border-color: #9ca3af;
      }

      #${BATCH_MODAL_ID} .batch-actions .primary {
        border-color: #4f46e5;
        background: ${PRIMARY_BUTTON_BACKGROUND};
        color: #ffffff;
        box-shadow: 0 8px 18px rgba(79, 70, 229, 0.22);
      }

      #${BATCH_MODAL_ID} .batch-inline-actions .primary {
        border-color: #4f46e5;
        background: ${PRIMARY_BUTTON_BACKGROUND};
        color: #ffffff;
        box-shadow: 0 8px 18px rgba(79, 70, 229, 0.18);
      }

      #${BATCH_MODAL_ID} .batch-actions .primary:hover:not(:disabled),
      #${BATCH_MODAL_ID} .batch-inline-actions .primary:hover:not(:disabled) {
        background: ${PRIMARY_BUTTON_BACKGROUND};
        border-color: #4338ca;
        filter: brightness(1.05);
      }

      #${BATCH_MODAL_ID} .batch-actions button:disabled {
        cursor: not-allowed;
        opacity: 0.58;
        box-shadow: none;
      }

      #${BATCH_MODAL_ID} .batch-body {
        min-height: 0;
      }

      #${BATCH_MODAL_ID} .batch-review {
        min-height: 0;
      }

      #${BATCH_MODAL_ID} .batch-gallery {
        grid-template-columns: repeat(auto-fill, minmax(68px, 1fr));
        gap: 8px;
        max-height: min(48vh, 430px);
        overflow: auto;
        padding-right: 2px;
      }

      #${BATCH_MODAL_ID} .batch-gallery .batch-photo {
        aspect-ratio: 1 / 1.08;
        border-radius: 8px;
      }

      #${BATCH_MODAL_ID} .batch-groups {
        display: flex;
        flex-direction: column;
        gap: 6px;
        max-height: 184px;
        overflow: auto;
        margin-top: 8px;
        padding-right: 2px;
      }

      #${BATCH_MODAL_ID} .batch-item-card {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        border-radius: 8px;
        padding: 8px 10px;
        box-shadow: none;
      }

      #${BATCH_MODAL_ID} .batch-item-title {
        flex: 1 1 auto;
        min-width: 138px;
        margin: 0;
      }

      #${BATCH_MODAL_ID} .batch-item-photos {
        flex: 0 0 auto;
        align-items: center;
        gap: 4px;
        flex-wrap: nowrap;
      }

      #${BATCH_MODAL_ID} .batch-thumb-chip {
        width: 24px;
        height: 24px;
        border-radius: 5px;
        object-fit: cover;
        border: 1px solid #e5e7eb;
      }

      #${BATCH_MODAL_ID} .batch-thumb-more {
        min-width: 24px;
        height: 24px;
        border-radius: 5px;
        background: #f3f4f6;
        color: #4b5563;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
        font-weight: 850;
      }

      #${BATCH_MODAL_ID} .batch-actions {
        position: sticky;
        bottom: -18px;
        z-index: 2;
        margin: 16px -18px -18px;
        padding: 12px 18px;
        background: #fbfcff;
        border-top: 1px solid #e5e7eb;
      }

      #${BATCH_MODAL_ID} .batch-content {
        width: min(820px, calc(100vw - 28px));
        border-radius: 12px;
        padding: 16px 18px 18px;
      }

      #${BATCH_MODAL_ID} .batch-topbar {
        margin-bottom: 14px;
      }

      #${BATCH_MODAL_ID} .batch-title {
        font-size: 18px;
      }

      #${BATCH_MODAL_ID} .batch-subtitle {
        font-size: 12px;
      }

      #${BATCH_MODAL_ID} .batch-qr-placeholder {
        position: relative;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 164px;
        height: 164px;
        border-radius: 8px;
        background: linear-gradient(135deg, #f8fafc, #eef2ff);
        overflow: hidden;
        color: #4f46e5;
        font-size: 12px;
        font-weight: 850;
      }

      #${BATCH_MODAL_ID} .batch-qr-placeholder::before {
        content: "";
        position: absolute;
        inset: 0;
        background: linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.72) 50%, transparent 100%);
        transform: translateX(-100%);
        animation: batchQrShimmer 1.4s ease-in-out infinite;
      }

      #${BATCH_MODAL_ID} .batch-qr-placeholder::after {
        content: "QR";
        position: relative;
        z-index: 1;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 42px;
        height: 42px;
        border: 1px solid #c7d2fe;
        border-radius: 12px;
        background: rgba(255, 255, 255, 0.82);
        box-shadow: 0 8px 18px rgba(79, 70, 229, 0.1);
      }

      #${BATCH_MODAL_ID} .batch-qr-placeholder.error {
        background: #fff7ed;
        color: #c2410c;
      }

      #${BATCH_MODAL_ID} .batch-qr-placeholder.error::before {
        display: none;
      }

      #${BATCH_MODAL_ID} .batch-qr-placeholder.error::after {
        content: "QR";
        border-color: #fed7aa;
      }

      @keyframes batchQrShimmer {
        to {
          transform: translateX(100%);
        }
      }

      #${BATCH_MODAL_ID} .batch-wait-panel {
        min-height: 196px;
        border: 1px solid #e5e7eb;
        border-radius: 10px;
        background: #ffffff;
        padding: 16px;
        display: flex;
        flex-direction: column;
        justify-content: center;
      }

      #${BATCH_MODAL_ID} .batch-wait-title {
        color: #111827;
        font-size: 18px;
        font-weight: 850;
        letter-spacing: 0;
      }

      #${BATCH_MODAL_ID} .batch-count-number {
        display: inline-block;
        min-width: 0.7em;
        text-align: right;
      }

      #${BATCH_MODAL_ID} .batch-count-number.bump {
        animation: batchCountBump 220ms cubic-bezier(0.16, 1, 0.3, 1);
      }

      @keyframes batchCountBump {
        0% {
          opacity: 0.35;
          transform: translateY(7px) scale(0.96);
        }
        100% {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }

      #${BATCH_MODAL_ID} .batch-wait-copy,
      #${BATCH_MODAL_ID} .batch-review-subtitle {
        margin-top: 5px;
        color: #6b7280;
        font-size: 12px;
        line-height: 1.45;
      }

      #${BATCH_MODAL_ID} .batch-status.warning {
        border-color: #fed7aa;
        background: #fff7ed;
        color: #c2410c;
      }

      #${BATCH_MODAL_ID} .batch-review-header,
      #${BATCH_MODAL_ID} .batch-summary-head {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: 12px;
      }

      #${BATCH_MODAL_ID} .batch-summary-head {
        margin: 12px 0 7px;
        color: #374151;
        font-size: 12px;
        font-weight: 850;
      }

      #${BATCH_MODAL_ID} .batch-summary-count {
        color: #6b7280;
        font-size: 11px;
        font-weight: 750;
      }

      #${BATCH_MODAL_ID} .batch-gallery {
        grid-template-columns: repeat(auto-fill, minmax(62px, 1fr));
        gap: 7px;
        max-height: min(43vh, 344px);
        margin-top: 10px;
        padding: 1px 2px 1px 1px;
      }

      #${BATCH_MODAL_ID} .batch-gallery .batch-photo {
        aspect-ratio: 1 / 1;
        border-width: 1px;
        border-radius: 7px;
        transition: border-color 100ms ease, box-shadow 100ms ease, opacity 100ms ease;
      }

      #${BATCH_MODAL_ID} .batch-gallery .batch-photo.selected {
        border-color: #4f46e5;
        box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.22);
        transform: none;
      }

      #${BATCH_MODAL_ID} .batch-gallery .batch-photo.marked {
        opacity: 0.5;
        filter: saturate(0.75);
      }

      #${BATCH_MODAL_ID} .batch-photo-badge {
        left: 5px;
        top: 5px;
        padding: 2px 5px;
        font-size: 9px;
      }

      #${BATCH_MODAL_ID} .batch-select-check {
        right: 5px;
        top: 5px;
        width: 18px;
        height: 18px;
        font-size: 11px;
      }

      #${BATCH_MODAL_ID} .batch-groups {
        gap: 6px;
        max-height: 142px;
      }

      #${BATCH_MODAL_ID} .batch-item-card {
        min-height: 42px;
        flex-direction: row;
        align-items: center;
        border-radius: 7px;
        padding: 7px 10px;
      }

      #${BATCH_MODAL_ID} .batch-item-title {
        min-width: 0;
        flex: 1 1 auto;
        font-size: 12px;
        margin: 0;
      }

      #${BATCH_MODAL_ID} .batch-item-side {
        flex: 0 0 auto;
        display: flex;
        align-items: center;
        gap: 10px;
      }

      #${BATCH_MODAL_ID} .batch-item-photos {
        gap: 4px;
      }

      #${BATCH_MODAL_ID} .batch-ungroup {
        min-height: auto !important;
        width: auto !important;
        padding: 0 !important;
        border: 0 !important;
        background: transparent !important;
        box-shadow: none !important;
        color: #4f46e5 !important;
        font-size: 11px !important;
        line-height: 1 !important;
      }

      #${BATCH_MODAL_ID} .batch-actions {
        align-items: center;
        gap: 8px;
      }

      #${BATCH_MODAL_ID} .batch-actions .batch-selection-count {
        margin-right: auto;
      }

      #${BATCH_MODAL_ID} .batch-actions button {
        min-height: 34px;
        border-radius: 7px;
      }

      #${BATCH_MODAL_ID} {
        background: rgba(17, 24, 39, 0.42);
      }

      #${BATCH_MODAL_ID} .batch-content {
        width: min(620px, calc(100vw - 32px));
        background: #ffffff;
        border-color: #dfe3ea;
        border-radius: 10px;
        box-shadow: 0 18px 42px rgba(17, 24, 39, 0.2);
        padding: 16px 18px 0;
      }

      #${BATCH_MODAL_ID} .batch-topbar {
        align-items: center;
        margin-bottom: 14px;
      }

      #${BATCH_MODAL_ID} .batch-title {
        margin-bottom: 3px;
        font-size: 17px;
      }

      #${BATCH_MODAL_ID} .batch-subtitle {
        max-width: 430px;
        font-size: 12px;
      }

      #${BATCH_MODAL_ID} .batch-close {
        width: 30px;
        height: 30px;
        border: 1px solid #e5e7eb;
        background: #ffffff;
        box-shadow: 0 4px 10px rgba(17, 24, 39, 0.08);
      }

      #${BATCH_MODAL_ID} .batch-layout {
        grid-template-columns: 176px minmax(0, 1fr);
        gap: 14px;
      }

      #${BATCH_MODAL_ID} .batch-qr {
        padding: 12px;
        border-radius: 9px;
        background: #ffffff;
      }

      #${BATCH_MODAL_ID} .batch-qr img,
      #${BATCH_MODAL_ID} .batch-qr-placeholder {
        width: 148px;
        height: 148px;
      }

      #${BATCH_MODAL_ID} .batch-qr-note {
        margin-top: 8px;
        font-size: 11px;
      }

      #${BATCH_MODAL_ID} .batch-wait-panel {
        min-height: 206px;
        border-radius: 9px;
        padding: 22px 18px;
        justify-content: center;
      }

      #${BATCH_MODAL_ID} .batch-status {
        width: fit-content;
        min-height: 26px;
        margin-bottom: 12px;
        padding: 5px 9px;
        border-radius: 999px;
        font-size: 11px;
      }

      #${BATCH_MODAL_ID} .batch-wait-title {
        font-size: 18px;
        min-height: 22px;
      }

      #${BATCH_MODAL_ID} .batch-wait-copy {
        max-width: 360px;
        min-height: 34px;
      }

      #${BATCH_MODAL_ID} .batch-actions {
        margin: 16px -18px 0;
        padding: 10px 18px 12px;
      }

      #${BATCH_MODAL_ID} .batch-layout + .batch-actions {
        min-height: 58px;
      }

      #${BATCH_MODAL_ID} .batch-actions button[hidden] {
        display: none;
      }

      @keyframes batchCardIn {
        from {
          opacity: 0;
          transform: translateX(14px);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }

      @media (max-width: 680px) {
        #${BATCH_MODAL_ID} .batch-layout {
          grid-template-columns: 1fr;
        }

        #${BATCH_MODAL_ID} .batch-qr img {
          width: 150px;
          height: 150px;
        }

        #${BATCH_MODAL_ID} .batch-content {
          padding: 14px;
        }

        #${BATCH_MODAL_ID} .batch-actions {
          bottom: -14px;
          margin: 14px -14px -14px;
          padding: 10px 14px;
        }

        #${BATCH_MODAL_ID} .batch-gallery {
          grid-template-columns: repeat(auto-fill, minmax(58px, 1fr));
          max-height: 42vh;
        }

        #${BATCH_MODAL_ID} .batch-item-card {
          align-items: center;
          flex-direction: row;
        }

        #${BATCH_MODAL_ID} .batch-item-side {
          gap: 7px;
        }

        #${BATCH_MODAL_ID} .batch-actions {
          flex-wrap: wrap;
        }

        #${BATCH_MODAL_ID} .batch-actions .batch-selection-count {
          flex: 1 0 100%;
        }
      }

      #${BATCH_MODAL_ID},
      #${BATCH_MODAL_ID} * {
        box-sizing: border-box;
      }

      html.quickvint-batch-modal-open,
      body.quickvint-batch-modal-open {
        overflow: hidden !important;
        scrollbar-gutter: stable;
      }

      #${BATCH_MODAL_ID} .batch-content {
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }

      #${BATCH_MODAL_ID} .batch-body {
        display: flex;
        flex-direction: column;
        min-height: 0;
      }

      #${BATCH_MODAL_ID} .batch-actions {
        position: static;
        bottom: auto;
        z-index: 1;
        flex: 0 0 auto;
        margin: 16px -18px 0;
        padding: 12px 18px 14px;
        border-top: 1px solid #e5e7eb;
        background: #ffffff;
      }

      #${BATCH_MODAL_ID}.organizing .batch-content {
        width: min(520px, calc(100vw - 24px));
        height: auto;
        max-height: min(860px, calc(100vh - 20px));
        padding: 18px 18px 0;
        border-radius: 16px;
        background: #f8fafc;
      }

      #${BATCH_MODAL_ID}.organizing .batch-topbar {
        flex: 0 0 auto;
        align-items: flex-start;
        flex-wrap: wrap;
        margin: -18px -18px 14px;
        padding: 18px 18px 14px;
        border-bottom: 1px solid #e2e8f0;
        background: #f8fafc;
        z-index: 2;
      }

      #${BATCH_MODAL_ID}.organizing .batch-heading {
        flex: 1 1 auto;
        min-width: 0;
      }

      #${BATCH_MODAL_ID}.organizing .batch-title {
        margin: 0;
        font-size: 18px;
        line-height: 1.2;
      }

      #${BATCH_MODAL_ID}.organizing .batch-subtitle {
        max-width: none;
        margin: 2px 0 0;
        color: #64748b;
        font-size: 13px;
        font-weight: 700;
      }

      #${BATCH_MODAL_ID}.organizing .batch-body {
        flex: 0 1 auto;
        max-height: none;
        overflow: hidden;
      }

      #${BATCH_MODAL_ID}.organizing .batch-review {
        flex: 0 1 auto;
        min-height: 0;
        max-height: min(650px, calc(100vh - 184px));
        overflow-x: hidden;
        overflow-y: auto;
        overscroll-behavior: contain;
        padding: 0 0 18px;
        scrollbar-gutter: stable;
        scrollbar-width: none;
      }

      #${BATCH_MODAL_ID}.organizing .batch-review::-webkit-scrollbar {
        width: 0;
        height: 0;
      }

      #${BATCH_MODAL_ID}.organizing .batch-review.is-reflowing {
        overflow-y: hidden;
      }

      #${BATCH_MODAL_ID}.organizing .organize-progress {
        position: relative;
        flex: 1 0 100%;
        width: 100%;
        height: 5px;
        margin: 10px 0 0;
        border-radius: 999px;
        background: #e2e8f0;
        overflow: hidden;
      }

      #${BATCH_MODAL_ID}.organizing .organize-progress span {
        position: absolute;
        top: 0;
        bottom: 0;
        display: block;
        border-radius: inherit;
        transition: left 180ms ease, width 180ms ease;
      }

      #${BATCH_MODAL_ID}.organizing .organize-status-row {
        flex: 1 0 100%;
        display: flex;
        align-items: center;
        gap: 10px;
        width: 100%;
        margin: 10px 0 0;
      }

      #${BATCH_MODAL_ID}.organizing .organize-status-row .organize-progress {
        flex: 1 1 auto;
        margin: 0;
      }

      #${BATCH_MODAL_ID}.organizing .organize-unsorted-badge {
        flex: 0 0 auto;
        min-width: 92px;
        padding: 5px 8px;
        border: 1px solid #fecaca;
        border-radius: 999px;
        background: #fef2f2;
        color: #b91c1c;
        text-align: center;
        font-size: 12px;
        font-weight: 850;
        line-height: 1;
        white-space: nowrap;
      }

      #${BATCH_MODAL_ID}.organizing .organize-unsorted-badge[hidden] {
        display: inline-block !important;
        visibility: hidden;
      }

      #${BATCH_MODAL_ID}.organizing .organize-unsorted-badge.done {
        border-color: #bbf7d0;
        background: #ecfdf5;
        color: #047857;
      }

      #${BATCH_MODAL_ID}.organizing .organize-progress-done {
        left: 0;
        background: #22c55e;
      }

      #${BATCH_MODAL_ID}.organizing .organize-progress-active {
        background: #fb923c;
      }

      #${BATCH_MODAL_ID}.organizing .organize-tip {
        display: flex;
        align-items: center;
        gap: 8px;
        margin: 0 0 12px;
        color: #64748b;
        font-size: 14px;
        max-height: 24px;
        opacity: 1;
        overflow: hidden;
        transform: translateY(0);
        transition:
          max-height 120ms ease,
          margin 120ms ease,
          opacity 160ms ease,
          transform 160ms ease;
      }

      #${BATCH_MODAL_ID}.organizing .organize-tip.is-hidden {
        max-height: 0;
        margin: 0;
        opacity: 0;
        pointer-events: none;
        transform: translateY(-4px);
      }

      #${BATCH_MODAL_ID}.organizing .organize-tip-icon {
        color: #94a3b8;
        font-size: 16px;
        line-height: 1;
      }

      #${BATCH_MODAL_ID}.organizing .batch-gallery {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 9px;
        min-height: var(--quickvint-batch-gallery-min-height, 0);
        max-height: none;
        overflow: hidden;
        margin: 0;
        padding: 0 0 22px;
        border-bottom: 1px solid #e2e8f0;
        transition: padding 180ms ease, border-color 180ms ease;
      }

      #${BATCH_MODAL_ID}.organizing .batch-photo-wrap {
        display: block;
        min-width: 0;
      }

      #${BATCH_MODAL_ID}.organizing .batch-photo-wrap.is-grouped {
        pointer-events: none;
      }

      #${BATCH_MODAL_ID}.organizing .batch-gallery.is-empty {
        min-height: 0;
        padding-bottom: 0;
        border-bottom-color: transparent;
      }

      #${BATCH_MODAL_ID}.organizing .batch-gallery.is-settling {
        padding-bottom: 22px;
        border-bottom-color: #e2e8f0;
      }

      #${BATCH_MODAL_ID}.organizing .batch-gallery .batch-photo {
        width: 100%;
        aspect-ratio: 1 / 1;
        border: 2px solid transparent;
        border-radius: 12px;
        background: #e2e8f0;
        box-shadow: none;
        cursor: pointer;
        transform: translateZ(0);
        transition:
          border-color 180ms ease,
          box-shadow 180ms ease,
          transform 180ms ease;
      }

      #${BATCH_MODAL_ID}.organizing .batch-gallery .batch-photo.tap-target:not(.selected) {
        border-color: rgba(99, 102, 241, 0.34);
        border-style: dashed;
        box-shadow: 0 5px 14px rgba(15, 23, 42, 0.08);
      }

      #${BATCH_MODAL_ID}.organizing .batch-gallery .batch-photo.tap-target:not(.selected):hover,
      #${BATCH_MODAL_ID}.organizing .batch-gallery .batch-photo.tap-target:not(.selected):focus-visible {
        border-color: rgba(79, 70, 229, 0.48);
        border-style: solid;
        box-shadow: 0 8px 18px rgba(79, 70, 229, 0.14);
        outline: none;
        transform: translateY(-1px);
      }

      #${BATCH_MODAL_ID}.organizing .batch-gallery .batch-photo:active:not(.marked) {
        transform: scale(0.96);
      }

      #${BATCH_MODAL_ID}.organizing .batch-gallery .batch-photo.selected {
        border-color: #2563eb;
        border-style: solid;
        box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.22);
        transform: scale(0.96);
      }

      #${BATCH_MODAL_ID}.organizing .batch-gallery .batch-photo.selected::after {
        content: "";
        position: absolute;
        inset: 0;
        background: rgba(37, 99, 235, 0.22);
        pointer-events: none;
      }

      #${BATCH_MODAL_ID}.organizing .batch-gallery .batch-photo.marked {
        opacity: 1;
      }

      #${BATCH_MODAL_ID}.organizing .batch-photo-badge {
        display: none;
      }

      #${BATCH_MODAL_ID}.organizing .batch-select-check {
        left: 50%;
        right: auto;
        top: 50%;
        z-index: 1;
        width: 24px;
        height: 24px;
        transform: translate(-50%, -50%) scale(0.82);
        border: 0;
        background: #3b82f6;
        color: #ffffff;
        box-shadow: 0 8px 18px rgba(37, 99, 235, 0.3);
        opacity: 0;
        transition: opacity 160ms ease, transform 160ms ease;
      }

      #${BATCH_MODAL_ID}.organizing .batch-gallery .batch-photo.selected .batch-select-check {
        opacity: 1;
        transform: translate(-50%, -50%) scale(1);
      }

      #${BATCH_MODAL_ID}.organizing .batch-discard-photo {
        position: absolute;
        right: 7px;
        top: 7px;
        z-index: 2;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 24px;
        height: 24px;
        min-height: 24px;
        padding: 0;
        border: 1px solid rgba(255, 255, 255, 0.82);
        border-radius: 999px;
        background: rgba(15, 23, 42, 0.68);
        color: #ffffff;
        box-shadow: 0 6px 14px rgba(15, 23, 42, 0.2);
        cursor: pointer;
        font-size: 16px;
        font-weight: 850;
        line-height: 1;
        opacity: 0.82;
        transform: scale(1);
        transition: opacity 140ms ease, transform 140ms ease, background 140ms ease;
      }

      #${BATCH_MODAL_ID}.organizing .batch-gallery .batch-photo:hover .batch-discard-photo,
      #${BATCH_MODAL_ID}.organizing .batch-discard-photo:focus-visible {
        opacity: 1;
      }

      #${BATCH_MODAL_ID}.organizing .batch-discard-photo:hover {
        background: #dc2626;
      }

      #${BATCH_MODAL_ID}.organizing .batch-empty-state {
        max-height: 72px;
        margin: 0 0 14px;
        padding: 18px;
        border: 1px solid #bbf7d0;
        border-radius: 12px;
        background: #f0fdf4;
        color: #15803d;
        text-align: center;
        font-size: 13px;
        font-weight: 750;
        opacity: 1;
        overflow: hidden;
        transform: translateY(0);
        transition:
          max-height 180ms ease,
          margin 180ms ease,
          padding 180ms ease,
          border-width 180ms ease,
          opacity 160ms ease,
          transform 160ms ease;
        animation: batchCardIn 180ms ease-out;
      }

      #${BATCH_MODAL_ID}.organizing .batch-empty-state.is-hidden {
        max-height: 0;
        margin: 0;
        padding-top: 0;
        padding-bottom: 0;
        border-width: 0;
        opacity: 0;
        transform: translateY(-4px);
      }

      #${BATCH_MODAL_ID}.organizing .batch-empty-state.is-hidden.is-reserved {
        max-height: 44px;
        margin: 0 0 10px;
        padding: 10px 12px;
        border-width: 1px;
        visibility: hidden;
      }

      #${BATCH_MODAL_ID}.organizing .batch-summary-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        max-height: 36px;
        margin: 18px 0 8px;
        color: #94a3b8;
        font-size: 12px;
        font-weight: 850;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        opacity: 1;
        overflow: hidden;
        transform: translateY(0);
        transition:
          max-height 120ms ease,
          margin 120ms ease,
          opacity 160ms ease,
          transform 160ms ease;
      }

      #${BATCH_MODAL_ID}.organizing .batch-summary-title {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        min-width: 0;
      }

      #${BATCH_MODAL_ID}.organizing .batch-summary-head.is-hidden {
        max-height: 0;
        margin: 0;
        opacity: 0;
        transform: translateY(-4px);
      }

      #${BATCH_MODAL_ID}.organizing .batch-summary-count {
        letter-spacing: 0;
        text-transform: none;
      }

      #${BATCH_MODAL_ID}.organizing .batch-summary-reset {
        flex: 0 0 auto;
        width: auto !important;
        max-width: max-content;
        min-height: 30px;
        padding: 0 10px;
        border: 1px solid #cbd5e1;
        border-radius: 999px;
        background: #ffffff;
        color: #475569;
        cursor: pointer;
        font-size: 11px;
        font-weight: 850;
        letter-spacing: 0;
        text-transform: none;
        transition:
          opacity 140ms ease,
          transform 140ms ease,
          background 140ms ease,
          border-color 140ms ease,
          color 140ms ease;
      }

      #${BATCH_MODAL_ID}.organizing .batch-summary-reset:hover:not(:disabled) {
        border-color: #94a3b8;
        background: #f8fafc;
        color: #0f172a;
      }

      #${BATCH_MODAL_ID} .batch-capacity-note {
        max-height: 84px;
        margin: 12px 0 14px;
        padding: 10px 12px;
        border: 1px solid #e0e7ff;
        border-radius: 12px;
        background: #eef2ff;
        color: #3730a3;
        font-size: 12.5px;
        font-weight: 750;
        line-height: 1.35;
        opacity: 1;
        overflow: hidden;
        transform: translateY(0);
        transition:
          max-height 120ms ease,
          margin 120ms ease,
          padding 120ms ease,
          border-width 120ms ease,
          opacity 160ms ease,
          transform 160ms ease;
      }

      #${BATCH_MODAL_ID} .batch-capacity-note.is-hidden {
        max-height: 0;
        margin-top: 0;
        margin-bottom: 0;
        padding-top: 0;
        padding-bottom: 0;
        border-width: 0;
        opacity: 0;
        transform: translateY(-4px);
      }

      #${BATCH_MODAL_ID} .batch-capacity-note.warning {
        border-color: #fed7aa;
        background: #fff7ed;
        color: #9a3412;
      }

      #${BATCH_MODAL_ID} .batch-capacity-note.error {
        border-color: #fecaca;
        background: #fef2f2;
        color: #991b1b;
      }

      #${BATCH_MODAL_ID}.organizing .batch-groups {
        display: flex;
        flex-direction: column;
        gap: 12px;
        max-height: none;
        overflow: visible;
        margin: 0;
        padding: 0 0 10px;
      }

      #${BATCH_MODAL_ID}.organizing .batch-item-card {
        display: block;
        min-height: 0;
        padding: 14px 16px 16px;
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        background: #ffffff;
        box-shadow: 0 3px 12px rgba(15, 23, 42, 0.05);
        opacity: 1;
        transform: translateX(0);
        overflow: hidden;
        transition:
          border-color 150ms ease,
          box-shadow 150ms ease,
          transform 260ms cubic-bezier(0.16, 1, 0.3, 1);
      }

      #${BATCH_MODAL_ID}.organizing .batch-item-card.is-entering,
      #${BATCH_MODAL_ID}.organizing .batch-item-card.is-leaving {
        transform: translateX(34px);
      }

      #${BATCH_MODAL_ID}.organizing .batch-item-card-head {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 12px;
      }

      #${BATCH_MODAL_ID}.organizing .batch-item-title {
        display: block;
        min-width: 0;
        margin: 0;
        color: #0f172a;
        font-size: 14px;
        font-weight: 850;
        line-height: 1.25;
      }

      #${BATCH_MODAL_ID}.organizing .batch-item-count {
        display: block;
        margin-top: 2px;
        color: #64748b;
        font-size: 12px;
        font-weight: 600;
      }

      #${BATCH_MODAL_ID}.organizing .batch-item-photos {
        display: flex;
        gap: 8px;
        overflow: hidden;
        padding-bottom: 0;
        flex-wrap: nowrap;
      }

      #${BATCH_MODAL_ID}.organizing .batch-thumb-chip,
      #${BATCH_MODAL_ID}.organizing .batch-thumb-more {
        flex: 0 0 auto;
        width: 62px;
        height: 62px;
        border-radius: 8px;
      }

      #${BATCH_MODAL_ID}.organizing .batch-thumb-chip {
        object-fit: cover;
        border: 1px solid #e5e7eb;
        background: #f1f5f9;
      }

      #${BATCH_MODAL_ID}.organizing .batch-thumb-more {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border: 1px solid #e2e8f0;
        background: #f1f5f9;
        color: #64748b;
        font-size: 13px;
        font-weight: 850;
      }

      #${BATCH_MODAL_ID}.organizing .batch-ungroup {
        flex: 0 0 auto;
        width: 32px !important;
        height: 32px !important;
        min-height: 32px !important;
        padding: 0 !important;
        border: 0 !important;
        border-radius: 999px !important;
        background: transparent !important;
        box-shadow: none !important;
        color: #94a3b8 !important;
        font-size: 18px !important;
        line-height: 1 !important;
      }

      #${BATCH_MODAL_ID}.organizing .batch-ungroup:hover {
        background: #f1f5f9 !important;
        color: #ef4444 !important;
      }

      #${BATCH_MODAL_ID}.organizing .batch-actions {
        position: static;
        left: auto;
        right: auto;
        bottom: auto;
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(160px, 240px);
        grid-template-areas:
          "status primary"
          "secondary primary";
        align-items: center;
        row-gap: 8px;
        column-gap: 14px;
        margin: 0 -18px;
        min-height: 94px;
        padding: 14px 24px 16px;
        background: rgba(255, 255, 255, 0.98);
        box-shadow: 0 -10px 26px rgba(15, 23, 42, 0.08);
        border-top: 1px solid #e5e7eb;
      }

      #${BATCH_MODAL_ID}.organizing .batch-selection-count {
        grid-area: status;
        display: inline-flex;
        align-items: center;
        justify-content: flex-start;
        min-width: 0;
        max-height: 32px;
        min-height: 24px;
        margin: 0;
        color: #64748b;
        font-size: 12.5px;
        font-weight: 650;
        text-align: left;
        line-height: 1.35;
        opacity: 1;
        overflow: hidden;
        transform: translateY(0);
        white-space: nowrap;
        transition:
          max-width 140ms ease,
          opacity 160ms ease,
          transform 160ms ease,
          color 160ms ease;
      }

      #${BATCH_MODAL_ID}.organizing .batch-selection-count.is-hidden {
        max-width: 0;
        opacity: 0;
        transform: translateY(4px);
      }

      #${BATCH_MODAL_ID}.organizing .batch-secondary-actions {
        grid-area: secondary;
        display: flex;
        justify-content: flex-start;
        align-items: center;
        flex-wrap: nowrap;
        gap: 10px;
        max-width: 100%;
        max-height: 34px;
        min-height: 34px;
        opacity: 1;
        transform: translateY(0);
        overflow: hidden;
        transition: opacity 120ms ease, transform 120ms ease;
      }

      #${BATCH_MODAL_ID}.organizing .batch-actions:not(.has-primary-action) .batch-secondary-actions {
        justify-content: flex-end;
      }

      #${BATCH_MODAL_ID}.organizing .batch-actions:not(.has-primary-action) {
        grid-template-columns: minmax(0, 1fr);
        grid-template-areas:
          "status"
          "secondary";
        min-height: 94px;
      }

      #${BATCH_MODAL_ID}.organizing .batch-secondary-actions.is-hidden {
        max-width: 0;
        max-height: 0;
        min-height: 0;
        gap: 0;
        opacity: 0;
        pointer-events: none;
        transform: translateY(4px);
        visibility: hidden;
      }

      #${BATCH_MODAL_ID}.organizing .batch-actions button {
        min-height: 34px;
        border-radius: 12px;
        transition:
          transform 140ms ease,
          box-shadow 140ms ease,
          opacity 140ms ease,
          background 140ms ease;
      }

      #${BATCH_MODAL_ID}.organizing .batch-actions button:not(:disabled):active {
        transform: scale(0.98);
      }

      #${BATCH_MODAL_ID}.organizing .batch-mark-group,
      #${BATCH_MODAL_ID}.organizing .batch-start {
        grid-area: primary;
        width: 100%;
        max-width: none;
        justify-self: stretch;
        justify-content: center;
        background: ${PRIMARY_BUTTON_BACKGROUND};
        border-color: #4f46e5;
        box-shadow: 0 10px 24px rgba(79, 70, 229, 0.28);
      }

      #${BATCH_MODAL_ID}.organizing .footer-control.is-hidden {
        max-height: 0;
        max-width: 0;
        min-height: 0;
        margin: 0;
        padding-left: 0;
        padding-right: 0;
        padding-top: 0;
        padding-bottom: 0;
        border-width: 0;
        opacity: 0;
        pointer-events: none;
        transform: translateY(4px);
        overflow: hidden;
      }

      #${BATCH_MODAL_ID}.organizing .batch-summary-reset.is-hidden {
        max-width: 0;
        min-height: 0;
        padding-left: 0;
        padding-right: 0;
        border-width: 0;
        opacity: 0;
        pointer-events: none;
        transform: translateY(4px);
        overflow: hidden;
      }

      #${BATCH_MODAL_ID}.organizing .batch-actions [hidden],
      #${BATCH_MODAL_ID} [hidden] {
        display: none !important;
      }

      #${BATCH_MODAL_ID}.generating .batch-content {
        width: min(620px, calc(100vw - 24px));
        max-height: min(760px, calc(100vh - 24px));
        padding: 18px 18px 0;
        border-radius: 16px;
        background: #f8fafc;
        overflow: hidden;
      }

      #${BATCH_MODAL_ID}.generating .batch-topbar {
        align-items: flex-start;
        margin: -18px -18px 0;
        padding: 18px 18px 14px;
        border-bottom: 1px solid #e2e8f0;
        background: #f8fafc;
      }

      #${BATCH_MODAL_ID}.generating .batch-heading {
        flex: 1 1 auto;
        min-width: 0;
      }

      #${BATCH_MODAL_ID}.generating .batch-title {
        margin: 0;
        font-size: 18px;
        line-height: 1.2;
      }

      #${BATCH_MODAL_ID}.generating .batch-subtitle {
        margin: 2px 0 0;
        color: #64748b;
        font-size: 13px;
        font-weight: 750;
      }

      #${BATCH_MODAL_ID}.generating .batch-close:disabled {
        cursor: wait;
        opacity: 0.42;
      }

      #${BATCH_MODAL_ID}.generating .batch-body {
        flex: 1 1 auto;
        min-height: 0;
        margin: 0 -18px;
        overflow: hidden;
      }

      #${BATCH_MODAL_ID}.generating .batch-progress-stage {
        position: relative;
        flex: 1 1 auto;
        min-height: 0;
        padding: 18px;
        overflow: hidden;
      }

      #${BATCH_MODAL_ID}.generating .batch-ambient {
        position: absolute;
        inset: 0;
        pointer-events: none;
        background:
          linear-gradient(115deg, transparent 0%, rgba(79, 70, 229, 0.08) 42%, transparent 68%),
          linear-gradient(180deg, rgba(255, 255, 255, 0.82), rgba(248, 250, 252, 0));
        opacity: 0.75;
        transform: translateX(-38%);
      }

      #${BATCH_MODAL_ID}.generating .batch-progress-stage.is-live .batch-ambient {
        animation: batchAmbientSweep 3.6s ease-in-out infinite;
      }

      @keyframes batchAmbientSweep {
        0% {
          transform: translateX(-38%);
          opacity: 0.45;
        }
        50% {
          opacity: 0.82;
        }
        100% {
          transform: translateX(38%);
          opacity: 0.45;
        }
      }

      #${BATCH_MODAL_ID}.generating .batch-progress-head {
        position: relative;
        z-index: 1;
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 14px;
        margin-bottom: 14px;
      }

      #${BATCH_MODAL_ID}.generating .batch-progress-title {
        color: #475569;
        font-size: 13px;
        font-weight: 700;
      }

      #${BATCH_MODAL_ID}.generating .batch-progress-count {
        min-width: 54px;
        padding: 6px 8px;
        border: 1px solid #e2e8f0;
        border-radius: 999px;
        background: #ffffff;
        color: #0f172a;
        text-align: center;
        font-size: 12px;
        font-weight: 850;
        box-shadow: 0 5px 14px rgba(15, 23, 42, 0.05);
      }

      #${BATCH_MODAL_ID}.generating .batch-live-progress {
        position: relative;
        z-index: 1;
        height: 8px;
        margin-bottom: 16px;
        border-radius: 999px;
        background: #e2e8f0;
        overflow: hidden;
      }

      #${BATCH_MODAL_ID}.generating .batch-live-progress span {
        display: block;
        height: 100%;
        border-radius: inherit;
        background: linear-gradient(90deg, #4f46e5, #22c55e);
        transition: width 360ms ease;
      }

      #${BATCH_MODAL_ID}.generating .batch-progress-list {
        position: relative;
        z-index: 1;
        display: flex;
        flex-direction: column;
        gap: 10px;
        max-height: min(46vh, 420px);
        overflow-y: auto;
        padding: 1px;
        overscroll-behavior: contain;
        scrollbar-width: none;
      }

      #${BATCH_MODAL_ID}.generating .batch-progress-list::-webkit-scrollbar {
        width: 0;
        height: 0;
      }

      #${BATCH_MODAL_ID}.generating .batch-progress-card {
        display: grid;
        grid-template-columns: auto minmax(0, 1fr) auto;
        align-items: center;
        gap: 12px;
        min-height: 76px;
        padding: 11px 12px;
        border: 1px solid #e2e8f0;
        border-radius: 14px;
        background: rgba(255, 255, 255, 0.94);
        box-shadow: 0 5px 16px rgba(15, 23, 42, 0.05);
        transition: border-color 180ms ease, transform 180ms ease, box-shadow 180ms ease;
      }

      #${BATCH_MODAL_ID}.generating .batch-progress-card.active {
        border-color: #818cf8;
        box-shadow: 0 10px 24px rgba(79, 70, 229, 0.14);
        transform: translateY(-1px);
      }

      #${BATCH_MODAL_ID}.generating .batch-progress-card.done {
        border-color: #bbf7d0;
        background: rgba(240, 253, 244, 0.9);
      }

      #${BATCH_MODAL_ID}.generating .batch-progress-card.failed {
        border-color: #fed7aa;
        background: #fff7ed;
      }

      #${BATCH_MODAL_ID}.generating .batch-progress-thumbs {
        display: flex;
        align-items: center;
        min-width: 82px;
      }

      #${BATCH_MODAL_ID}.generating .batch-progress-thumbs img,
      #${BATCH_MODAL_ID}.generating .batch-progress-thumbs span {
        width: 38px;
        height: 44px;
        margin-left: -12px;
        border: 2px solid #ffffff;
        border-radius: 9px;
        object-fit: cover;
        background: #e2e8f0;
        box-shadow: 0 4px 10px rgba(15, 23, 42, 0.1);
      }

      #${BATCH_MODAL_ID}.generating .batch-progress-thumbs img:first-child,
      #${BATCH_MODAL_ID}.generating .batch-progress-thumbs span:first-child {
        margin-left: 0;
      }

      #${BATCH_MODAL_ID}.generating .batch-progress-thumbs span {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        color: #475569;
        font-size: 11px;
        font-weight: 850;
      }

      #${BATCH_MODAL_ID}.generating .batch-progress-meta {
        min-width: 0;
      }

      #${BATCH_MODAL_ID}.generating .batch-progress-meta strong {
        display: block;
        color: #0f172a;
        font-size: 14px;
        font-weight: 850;
        line-height: 1.2;
      }

      #${BATCH_MODAL_ID}.generating .batch-progress-meta span {
        display: block;
        margin-top: 3px;
        color: #64748b;
        font-size: 12px;
        font-weight: 650;
      }

      #${BATCH_MODAL_ID}.generating .batch-progress-badge {
        min-width: 86px;
        padding: 6px 8px;
        border-radius: 999px;
        background: #f1f5f9;
        color: #475569;
        text-align: center;
        font-size: 11px;
        font-weight: 850;
      }

      #${BATCH_MODAL_ID}.generating .batch-progress-card.active .batch-progress-badge {
        background: #eef2ff;
        color: #4f46e5;
      }

      #${BATCH_MODAL_ID}.generating .batch-progress-card.done .batch-progress-badge {
        background: #dcfce7;
        color: #15803d;
      }

      #${BATCH_MODAL_ID}.generating .batch-progress-card.failed .batch-progress-badge {
        background: #ffedd5;
        color: #c2410c;
      }

      #${BATCH_MODAL_ID}.generating .batch-progress-note {
        position: relative;
        z-index: 1;
        margin-top: 14px;
        color: #64748b;
        font-size: 12.5px;
        font-weight: 650;
        line-height: 1.45;
      }

      #${BATCH_MODAL_ID}.generating .batch-actions {
        flex: 0 0 auto;
        justify-content: flex-end;
        margin: 0;
        min-height: 86px;
        padding: 18px 32px 22px;
        background: rgba(255, 255, 255, 0.98);
        border-top: 1px solid #e5e7eb;
        box-shadow: 0 -10px 26px rgba(15, 23, 42, 0.08);
      }

      #${BATCH_MODAL_ID}.generating .batch-dismiss {
        width: min(100%, 320px);
        justify-content: center;
        background: ${PRIMARY_BUTTON_BACKGROUND} !important;
        border-color: #4f46e5 !important;
        color: #ffffff !important;
        box-shadow: 0 10px 24px rgba(79, 70, 229, 0.22) !important;
      }

      #${BATCH_MODAL_ID}.generating .batch-dismiss:hover:not(:disabled) {
        background: ${PRIMARY_BUTTON_BACKGROUND} !important;
        border-color: #4338ca !important;
        color: #ffffff !important;
        filter: brightness(1.04);
      }

      #${BATCH_MODAL_ID}.generating .batch-dismiss:disabled {
        background: ${PRIMARY_BUTTON_BACKGROUND} !important;
        border-color: #4f46e5 !important;
        color: #ffffff !important;
        cursor: wait !important;
        opacity: 0.52;
        box-shadow: none !important;
        filter: none !important;
      }

      @media (max-width: 560px) {
        #${BATCH_MODAL_ID}.organizing .batch-content {
          width: calc(100vw - 24px);
          padding: 16px 14px 0;
        }

        #${BATCH_MODAL_ID}.organizing .batch-topbar {
          margin: -16px -14px 12px;
          padding: 16px 14px 14px;
        }

        #${BATCH_MODAL_ID}.organizing .batch-gallery {
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 8px;
        }

        #${BATCH_MODAL_ID}.organizing .batch-actions {
          grid-template-columns: minmax(0, 1fr);
          grid-template-areas:
            "status"
            "primary"
            "secondary";
          row-gap: 10px;
          column-gap: 0;
          margin: 0 -14px;
          min-height: 126px;
          padding: 14px 18px 18px;
        }

        #${BATCH_MODAL_ID}.organizing .batch-selection-count {
          min-width: 0;
          min-height: 24px;
          white-space: normal;
        }

        #${BATCH_MODAL_ID}.organizing .batch-secondary-actions {
          min-height: 34px;
        }

        #${BATCH_MODAL_ID}.organizing .batch-mark-group,
        #${BATCH_MODAL_ID}.organizing .batch-start {
          max-width: none;
          width: 100%;
        }

        #${BATCH_MODAL_ID}.generating .batch-actions {
          min-height: 84px;
          padding: 16px 22px 20px;
        }

        #${BATCH_MODAL_ID}.generating .batch-dismiss {
          width: 100%;
        }

        #${BATCH_MODAL_ID}.generating .batch-progress-card {
          grid-template-columns: 1fr;
          gap: 8px;
        }

        #${BATCH_MODAL_ID}.generating .batch-progress-badge {
          width: fit-content;
          min-width: 0;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        #${BATCH_MODAL_ID} *,
        #${BATCH_MODAL_ID} *::before,
        #${BATCH_MODAL_ID} *::after {
          animation-duration: 1ms !important;
          transition-duration: 1ms !important;
        }
      }

      #${MODAL_ID} .language-selector {
        margin: 0 0 20px;
        display: flex;
        justify-content: center;
        gap: 10px;
        flex-wrap: wrap;
        position: relative;
      }

      #${MODAL_ID} .language-select-wrapper {
        position: relative;
        width: 100%;
        max-width: 180px;
      }

      #${MODAL_ID} .language-select-label {
        display: block;
        margin: 0 0 5px 2px;
        color: #6b7280;
        font-size: 11px;
        font-weight: 700;
        line-height: 1;
      }

      #${MODAL_ID} .modal-flag-icon {
        position: absolute;
        left: 12px;
        top: 30px;
        pointer-events: none;
        z-index: 1;
        width: 20px;
        height: 14px;
        border-radius: 2px;
        object-fit: cover;
        box-shadow: 0 0 0 1px rgba(17, 24, 39, 0.08);
      }

      #${MODAL_ID} .language-select {
        width: 100%;
        padding: 10px 36px 10px 42px;
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        background: #f9fafb;
        font-size: 14px;
        color: #374151;
        cursor: pointer;
        font-weight: 500;
        outline: none;
        text-align: left;
        appearance: none;
        transition: all 0.2s ease;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E");
        background-repeat: no-repeat;
        background-position: right 12px center;
        background-size: 16px;
      }

      #${MODAL_ID} .language-select:hover {
        background-color: #f3f4f6;
        border-color: #d1d5db;
        color: #111827;
      }

      #${MODAL_ID} .language-select:focus {
        background-color: white;
        border-color: #4f46e5;
        box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
      }

      #${MODAL_ID} .disclaimer {
        margin-top: 24px;
        font-size: 11px;
        color: #9ca3af;
        text-align: center;
      }

      #${DESCRIPTION_APPLY_PROMPT_ID} {
        position: fixed;
        z-index: 2147483647;
        padding: 12px;
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        background: #ffffff;
        box-shadow: 0 16px 40px rgba(17, 24, 39, 0.18);
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      }

      #${DESCRIPTION_APPLY_PROMPT_ID} .quickvint-apply-title {
        margin: 0 0 9px;
        color: #111827;
        font-size: 13px;
        font-weight: 800;
        line-height: 1.35;
      }

      #${DESCRIPTION_APPLY_PROMPT_ID} .quickvint-apply-copy {
        margin: -3px 0 10px;
        color: #4b5563;
        font-size: 12px;
        font-weight: 600;
        line-height: 1.4;
      }

      #${DESCRIPTION_APPLY_PROMPT_ID} .quickvint-apply-copy a {
        color: #4f46e5;
        font-weight: 800;
        text-decoration: underline;
      }

      #${DESCRIPTION_APPLY_PROMPT_ID} .quickvint-apply-actions {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        justify-content: flex-start;
      }

      #${DESCRIPTION_APPLY_PROMPT_ID} button {
        flex: 0 0 auto;
        width: auto !important;
        min-width: 76px;
        min-height: 34px;
        padding: 0 12px;
        border-radius: 8px;
        border: 1px solid #d1d5db;
        background: #ffffff;
        color: #111827;
        cursor: pointer;
        font: inherit;
        font-size: 12px;
        font-weight: 800;
      }

      #${DESCRIPTION_APPLY_PROMPT_ID} .quickvint-apply-add {
        min-width: 96px;
        border-color: #4f46e5;
        background: ${PRIMARY_BUTTON_BACKGROUND};
        color: #ffffff;
      }

      #${DESCRIPTION_APPLY_PROMPT_ID} .quickvint-apply-settings {
        flex-basis: 100%;
        border-color: #e5e7eb;
        background: #f8fafc;
        color: #374151;
      }

      #${DESCRIPTION_APPLY_PROMPT_ID} button:hover {
        filter: brightness(0.98);
      }

      #${EMOJI_TOGGLE_ID} {
        display: inline-flex;
        align-items: center;
        justify-content: space-between;
        gap: 9px;
        height: 38px;
        min-height: 38px;
        margin-left: 6px;
        padding: 5px 7px 5px 12px;
        border: 1px solid #d9dde8;
        border-radius: 12px;
        background: #ffffff;
        color: #475569;
        cursor: pointer;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-size: 12px;
        font-weight: 800;
        line-height: 1;
        white-space: nowrap;
        box-shadow: 0 6px 16px rgba(15, 23, 42, 0.07);
        transition: border-color 0.18s ease, background 0.18s ease, color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease;
      }

      #${EMOJI_TOGGLE_ID}:hover {
        border-color: #b8c0d8;
        background: #f8fafc;
        transform: translateY(-1px);
      }

      #${EMOJI_TOGGLE_ID}[aria-pressed="true"] {
        border-color: #8b7cf6;
        background: linear-gradient(135deg, #eef2ff 0%, #f5f3ff 100%);
        color: #4338ca;
        box-shadow: 0 8px 20px rgba(79, 70, 229, 0.16);
      }

      #${EMOJI_TOGGLE_ID}:disabled {
        cursor: not-allowed;
        opacity: 0.58;
        transform: none;
        box-shadow: 0 3px 8px rgba(17, 24, 39, 0.08);
      }

      #${EMOJI_TOGGLE_ID}:disabled:hover {
        border-color: #d9dde8;
        background: #ffffff;
        transform: none;
      }

      #${EMOJI_TOGGLE_ID} .quickvint-emoji-label {
        line-height: 1;
      }

      #${EMOJI_TOGGLE_ID} .quickvint-emoji-switch {
        position: relative;
        width: 36px;
        height: 20px;
        flex: 0 0 auto;
        border-radius: 999px;
        background: #cbd5e1;
        box-shadow: inset 0 0 0 1px rgba(15, 23, 42, 0.06);
        transition: background 0.18s ease, box-shadow 0.18s ease;
      }

      #${EMOJI_TOGGLE_ID} .quickvint-emoji-knob {
        position: absolute;
        top: 3px;
        left: 3px;
        width: 14px;
        height: 14px;
        border-radius: 999px;
        background: #ffffff;
        box-shadow: 0 1px 4px rgba(15, 23, 42, 0.28);
        transition: transform 0.18s ease;
      }

      #${EMOJI_TOGGLE_ID}[aria-pressed="true"] .quickvint-emoji-switch {
        background: ${PRIMARY_BUTTON_BACKGROUND};
        box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.18);
      }

      #${EMOJI_TOGGLE_ID}[aria-pressed="true"] .quickvint-emoji-knob {
        transform: translateX(16px);
      }

      /* TOAST NOTIFICATION */
      #quickvint-toast {
        position: fixed;
        top: 120px;
        right: 24px;
        transform: translateY(-20px);
        background: #4f46e5; /* Brand Purple */
        color: #ffffff;
        padding: 14px 18px; /* Slightly tighter horizontal padding */
        border-radius: 12px; /* Fixed radius instead of pill */
        z-index: 2147483647;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-size: 14px;
        font-weight: 500;
        line-height: 1.4;
        box-shadow: 0 10px 25px -5px rgba(79, 70, 229, 0.4), 0 8px 10px -6px rgba(79, 70, 229, 0.2);
        display: flex;
        align-items: flex-start; /* Align to top in case of multiline */
        gap: 12px;
        opacity: 0;
        visibility: hidden;
        transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        pointer-events: auto;
        min-width: 320px; /* Force minimum width */
        max-width: 450px; /* Don't get too wide */
      }

      #quickvint-toast.error {
        background: #dc2626; /* Red for errors */
        box-shadow: 0 10px 25px -5px rgba(220, 38, 38, 0.4), 0 8px 10px -6px rgba(220, 38, 38, 0.2);
      }

      #quickvint-toast.info {
        background: #0891b2; /* Cyan for info/tips */
        box-shadow: 0 10px 25px -5px rgba(8, 145, 178, 0.4), 0 8px 10px -6px rgba(8, 145, 178, 0.2);
      }

      #quickvint-toast.success {
        background: #059669; /* Green for success */
        box-shadow: 0 10px 25px -5px rgba(5, 150, 105, 0.4), 0 8px 10px -6px rgba(5, 150, 105, 0.2);
      }

      #quickvint-toast.paywall {
        background: linear-gradient(180deg, #ffffff 0%, #fbfcff 100%);
        color: #111827;
        border: 1px solid rgba(79, 70, 229, 0.14);
        border-radius: 18px;
        padding: 17px;
        min-width: 390px;
        max-width: 450px;
        gap: 10px;
        box-shadow: 0 26px 80px rgba(17, 24, 39, 0.2), 0 10px 26px rgba(79, 70, 229, 0.14);
        overflow: hidden;
      }

      #quickvint-toast.paywall::before {
        content: "";
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 3px;
        background: linear-gradient(90deg, #10b981, #38bdf8, #4f46e5);
        pointer-events: none;
        z-index: 0;
      }

      #quickvint-toast.visible {
        opacity: 1;
        visibility: visible;
        transform: translateY(0);
      }

      #quickvint-toast .toast-icon {
        flex-shrink: 0; /* Don't squash icon */
        margin-top: 1px; /* Align slightly with text */
      }

      #quickvint-toast .toast-content {
        flex: 1;
        /* Allow wrapping normally */
      }

      #quickvint-toast.has-actions .toast-content {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }

      #quickvint-toast .toast-message-text {
        display: block;
      }

      #quickvint-toast .toast-actions {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 7px;
        margin-top: 2px;
      }

      #quickvint-toast .toast-link {
        appearance: none;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        width: auto;
        min-width: 190px;
        max-width: 100%;
        min-height: 34px;
        padding: 8px 12px;
        border-radius: 9px;
        border: 1px solid rgba(255, 255, 255, 0.28);
        background: rgba(255, 255, 255, 0.13);
        color: inherit;
        cursor: pointer;
        font: inherit;
        text-decoration: none;
        font-size: 13px;
        font-weight: 850;
        line-height: 1.2;
      }

      #quickvint-toast .toast-link.primary {
        background: rgba(255, 255, 255, 0.2);
        border-color: rgba(255, 255, 255, 0.42);
      }

      #quickvint-toast .toast-link:hover {
        background: rgba(255, 255, 255, 0.26);
        text-decoration: none;
      }

      #quickvint-toast .toast-action-button:not(.toast-link) {
        appearance: none;
        border: 0;
        background: transparent;
        color: inherit;
        cursor: pointer;
        font: inherit;
        font-weight: 700;
        margin-left: 12px;
        padding: 0;
        text-decoration: underline;
        white-space: nowrap;
      }

      #quickvint-toast .toast-action-button:not(.toast-link):hover {
        opacity: 0.86;
      }

      #quickvint-toast.paywall .paywall-logo {
        flex: 0 0 auto;
        width: 38px;
        height: 38px;
        border-radius: 12px;
        display: block;
        background: #ffffff;
        border: 1px solid rgba(79, 70, 229, 0.12);
        box-shadow: 0 6px 14px rgba(17, 24, 39, 0.08);
      }

      #quickvint-toast.paywall .paywall-body {
        position: relative;
        z-index: 1;
        flex: 1;
        min-width: 0;
      }

      #quickvint-toast.paywall .paywall-header {
        display: flex;
        align-items: center;
        gap: 11px;
        margin: 1px 28px 10px 0;
      }

      #quickvint-toast.paywall .paywall-kicker {
        color: #667085;
        font-size: 11px;
        font-weight: 760;
        line-height: 1.1;
        margin-bottom: 3px;
      }

      #quickvint-toast.paywall .paywall-title {
        margin: 0;
        color: #111827;
        font-size: 16px;
        font-weight: 800;
        letter-spacing: 0;
        line-height: 1.2;
      }

      #quickvint-toast.paywall .paywall-message {
        color: #5b6472;
        font-size: 13px;
        line-height: 1.5;
        margin: 0 0 11px;
      }

      #quickvint-toast.paywall .paywall-options {
        display: grid;
        gap: 7px;
        margin: 0 0 12px;
      }

      #quickvint-toast.paywall .paywall-option {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        align-items: center;
        gap: 10px;
        width: 100%;
        min-height: 48px;
        padding: 9px 10px;
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        background: #ffffff;
        box-shadow: 0 1px 2px rgba(17, 24, 39, 0.04);
        cursor: pointer;
        font-family: inherit;
        text-align: left;
        transition: border-color 140ms ease, background 140ms ease, box-shadow 140ms ease;
      }

      #quickvint-toast.paywall .paywall-option:hover:not(:disabled) {
        border-color: #d1d5db;
        box-shadow: 0 5px 14px rgba(79, 70, 229, 0.1);
      }

      #quickvint-toast.paywall .paywall-option.selected {
        border-color: rgba(79, 70, 229, 0.62);
        background: #f7f7ff;
        box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.1);
      }

      #quickvint-toast.paywall .paywall-option.muted {
        background: #f8fafc;
      }

      #quickvint-toast.paywall .paywall-option:disabled {
        cursor: default;
      }

      #quickvint-toast.paywall .paywall-option-main {
        display: flex;
        align-items: center;
        gap: 7px;
        min-width: 0;
      }

      #quickvint-toast.paywall .paywall-option-name {
        color: #111827;
        font-size: 13px;
        font-weight: 850;
        line-height: 1.2;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      #quickvint-toast.paywall .paywall-option-badge {
        flex: 0 0 auto;
        padding: 3px 6px;
        border-radius: 999px;
        background: #ecfdf5;
        color: #047857;
        border: 1px solid #bbf7d0;
        font-size: 10px;
        font-weight: 850;
        line-height: 1;
        white-space: nowrap;
      }

      #quickvint-toast.paywall .paywall-option-side {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 2px;
        text-align: right;
        white-space: nowrap;
      }

      #quickvint-toast.paywall .paywall-option-price {
        color: #111827;
        font-size: 13px;
        font-weight: 850;
        line-height: 1.1;
      }

      #quickvint-toast.paywall .paywall-option-limits {
        color: #667085;
        font-size: 11px;
        font-weight: 720;
        line-height: 1.15;
      }

      #quickvint-toast.paywall .paywall-action {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        width: 100%;
        min-height: 38px;
        padding: 0 14px;
        border-radius: 10px;
        background: #111827;
        color: #ffffff;
        border: 0;
        cursor: pointer;
        font-family: inherit;
        text-decoration: none;
        font-size: 13px;
        font-weight: 800;
        box-shadow: 0 10px 22px rgba(17, 24, 39, 0.18);
      }

      #quickvint-toast.paywall .paywall-action:hover:not(:disabled) {
        background: #1f2937;
      }

      #quickvint-toast.paywall .paywall-action:disabled {
        cursor: wait;
        opacity: 0.78;
      }

      #quickvint-toast.paywall .paywall-secondary-action {
        display: inline-flex;
        justify-content: center;
        width: 100%;
        margin-top: 9px;
        color: #4f46e5;
        text-decoration: none;
        font-size: 12px;
        font-weight: 800;
      }

      #quickvint-toast.paywall .paywall-secondary-action:hover {
        text-decoration: underline;
      }

      #quickvint-toast.paywall .paywall-trust {
        margin-top: 9px;
        color: #778196;
        font-size: 11px;
        font-weight: 650;
        line-height: 1.35;
        text-align: center;
      }

      #quickvint-toast .toast-close {
        background: transparent;
        border: none;
        color: rgba(255,255,255,0.7);
        cursor: pointer;
        font-size: 20px;
        line-height: .8;
        padding: 4px;
        margin: -2px -4px 0 0;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
        flex-shrink: 0;
        border-radius: 4px;
        width: 24px;
        height: 24px;
      }

      #quickvint-toast .toast-close:hover {
        background: rgba(255,255,255,0.15);
        color: #ffffff;
      }

      #quickvint-toast.paywall .toast-close {
        position: absolute;
        top: 12px;
        right: 12px;
        color: #9ca3af;
        z-index: 2;
      }

      #quickvint-toast.paywall .toast-close:hover {
        background: #f3f4f6;
        color: #111827;
      }

      /* Icons are emojis, but if we use text/svg later, ensure they pop */
      #quickvint-toast.error .toast-icon { text-shadow: 0 0 10px rgba(220, 38, 38, 0.5); }
      #quickvint-toast.success .toast-icon { text-shadow: 0 0 10px rgba(5, 150, 105, 0.5); }
      #quickvint-toast.info .toast-icon { text-shadow: 0 0 10px rgba(8, 145, 178, 0.5); }

      @media (max-width: 520px) {
        #quickvint-toast {
          top: 16px;
          right: 12px;
          left: 12px;
          min-width: 0;
          max-width: none;
        }

        #quickvint-toast.paywall {
          min-width: 0;
          max-width: none;
        }

        #quickvint-toast.paywall .paywall-option {
          grid-template-columns: 1fr;
          gap: 5px;
        }

        #quickvint-toast.paywall .paywall-option-side {
          align-items: flex-start;
          text-align: left;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function createButton() {
    const btn = document.createElement("button");
    btn.id = BTN_ID;
    btn.innerHTML = `
        <span class="icon">${WAND_ICON_SVG}</span>
        <span class="label">Generate</span>
    `;
    btn.addEventListener("click", onGenerateClick);
    return btn;
  }

  function createPhoneButton() {
    const btn = document.createElement("button");
    btn.id = PHONE_BTN_ID;
    btn.disabled = true;
    btn.innerHTML = `
        <span class="icon">${PHONE_ICON_SVG}</span>
        <span class="label">Phone</span>
    `;
    btn.addEventListener("click", onPhoneUploadClick);
    return btn;
  }

  function createBatchButton() {
    const btn = document.createElement("button");
    btn.id = BATCH_BTN_ID;
    btn.disabled = true;
    btn.innerHTML = `
        <span class="icon">${BATCH_ICON_SVG}</span>
        <span class="label">Batch</span>
    `;
    btn.addEventListener("click", onBatchUploadClick);
    return btn;
  }

  function setEmojiToggleState(enabled) {
    if (!emojiToggleBtn) return;
    emojiToggleBtn.setAttribute("aria-pressed", enabled ? "true" : "false");
  }

  async function syncEmojiToggleState() {
    if (!emojiToggleBtn) return;
    const { useEmojis = true, userProfile = null } = await new Promise((resolve) => {
      chrome.storage.local.get(
        { useEmojis: true, userProfile: null },
        (result) => resolve(result),
      );
    });
    const emojiAccess = canUseEmojiSetting(userProfile);
    emojiToggleBtn.disabled = !emojiAccess;
    emojiToggleBtn.title = emojiAccess
      ? useEmojis !== false
        ? "Emojis are on for generated descriptions"
        : "Emojis are off for generated descriptions"
      : "Emoji support is available during the free trial and on Pro or Business.";
    setEmojiToggleState(emojiAccess && useEmojis !== false);
  }

  function createEmojiToggleButton() {
    const btn = document.createElement("button");
    btn.id = EMOJI_TOGGLE_ID;
    btn.type = "button";
    btn.setAttribute("aria-label", "Toggle emojis in generated descriptions");
    btn.setAttribute("aria-pressed", "true");
    btn.innerHTML = `
      <span class="quickvint-emoji-label">😊 Emoji</span>
      <span class="quickvint-emoji-switch" aria-hidden="true">
        <span class="quickvint-emoji-knob"></span>
      </span>
    `;
    btn.addEventListener("click", async () => {
      const { useEmojis = true, userProfile = null } = await new Promise((resolve) => {
        chrome.storage.local.get(
          { useEmojis: true, userProfile: null },
          (result) => resolve(result),
        );
      });
      if (!canUseEmojiSetting(userProfile)) {
        setEmojiToggleState(false);
        return;
      }
      const nextValue = useEmojis === false;
      await chrome.storage.local.set({ useEmojis: nextValue });
      setEmojiToggleState(nextValue);
      trackGrowthEvent("emoji_toggle_changed", {
        source: "listing_tools",
        enabled: nextValue,
      });
    });
    syncEmojiToggleState();
    startEmojiToggleSync();
    return btn;
  }

  function startEmojiToggleSync() {
    if (emojiToggleSyncTimer) return;
    emojiToggleSyncTimer = window.setInterval(() => {
      if (!emojiToggleBtn || !document.body.contains(emojiToggleBtn)) {
        window.clearInterval(emojiToggleSyncTimer);
        emojiToggleSyncTimer = null;
        return;
      }
      syncEmojiToggleState();
    }, 1000);
  }

  function setActionButtonLoading(button, labelText) {
    if (!button) return () => {};

    const label = button.querySelector(".label");
    const previousLabel = label?.textContent || button.textContent || "";
    const previousDisabled = button.disabled;
    const previousCursor = button.style.cursor;
    const previousBackground = button.style.background;

    button.classList.add("is-loading");
    button.disabled = true;
    button.style.cursor = "progress";
    button.style.background = PRIMARY_BUTTON_BACKGROUND;
    if (label) {
      label.textContent = labelText;
    } else {
      button.textContent = labelText;
    }

    return () => {
      button.classList.remove("is-loading");
      button.disabled = previousDisabled;
      button.style.cursor = previousCursor;
      button.style.background = previousBackground;
      if (label) {
        label.textContent = previousLabel;
      } else {
        button.textContent = previousLabel;
      }
    };
  }

  function createInlineLanguageField(label, title, selectId, storageKey) {
    const field = document.createElement("div");
    field.className = "quickvint-lang-field";
    field.title = title;

    const trigger = document.createElement("button");
    trigger.id = selectId;
    trigger.type = "button";
    trigger.className = "quickvint-lang-trigger";
    trigger.setAttribute("aria-label", title);
    trigger.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      document.querySelectorAll(".quickvint-lang-field.open").forEach((openField) => {
        if (openField !== field) openField.classList.remove("open");
      });
      field.classList.toggle("open");
      if (field.classList.contains("open")) {
        positionInlineLanguageMenu(trigger, menu);
      }
    });

    const menu = document.createElement("div");
    menu.className = "quickvint-lang-menu";
    menu.addEventListener("mousedown", (event) => event.stopPropagation());
    menu.addEventListener("click", (event) => event.stopPropagation());
    menu.addEventListener("wheel", (event) => event.stopPropagation());
    LANGUAGE_OPTIONS.forEach((lang) => {
      const option = document.createElement("button");
      option.type = "button";
      option.className = "quickvint-lang-option";
      option.dataset.value = lang.code;
      option.title = lang.name;
      option.innerHTML = `<img src="https://flagcdn.com/w40/${lang.flag}.png" alt="${lang.flagAlt}"><span>${lang.shortName}</span>`;
      option.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        updateInlineLanguageControl(trigger, lang.code);
        field.classList.remove("open");
        chrome.storage.local.set({
          [storageKey]: lang.code,
        });
      });
      menu.appendChild(option);
    });

    field.appendChild(trigger);
    field.appendChild(menu);
    bindInlineLanguageGlobalListeners();
    return field;
  }

  function bindInlineLanguageGlobalListeners() {
    if (inlineLanguageListenersBound) return;
    inlineLanguageListenersBound = true;

    document.addEventListener("click", closeInlineLanguageMenus);
    window.addEventListener("scroll", closeInlineLanguageMenus, true);
    window.addEventListener("resize", closeInlineLanguageMenus);
  }

  function closeInlineLanguageMenus(event) {
    const target = event?.target;
    if (
      target instanceof Element &&
      target.closest(".quickvint-lang-field")
    ) {
      return;
    }
    document.querySelectorAll(".quickvint-lang-field.open").forEach((field) => {
      field.classList.remove("open");
    });
  }

  function positionInlineLanguageMenu(trigger, menu) {
    const rect = trigger.getBoundingClientRect();
    menu.style.left = `${Math.round(rect.left)}px`;
    menu.style.top = `${Math.round(rect.bottom + 4)}px`;
    menu.style.minWidth = `${Math.round(rect.width)}px`;
  }

  function updateInlineLanguageControl(trigger, languageCode) {
    const selectedOption = LANGUAGE_OPTIONS.find(
      (lang) => lang.code === normalizeLanguageCode(languageCode),
    );
    if (!selectedOption) return;
    trigger.dataset.value = selectedOption.code;
    trigger.innerHTML = `<img src="https://flagcdn.com/w40/${selectedOption.flag}.png" alt="${selectedOption.flagAlt}"><span>${selectedOption.shortName}</span>`;
    trigger
      .closest(".quickvint-lang-field")
      ?.querySelectorAll(".quickvint-lang-option")
      .forEach((option) => {
        option.classList.toggle("active", option.dataset.value === selectedOption.code);
      });
  }

  function injectFieldLanguageControls() {
    const titleInput = document.querySelector(SELECTORS.title);
    const descriptionInput = document.querySelector(SELECTORS.description);

    injectFieldLanguageControl(
      titleInput,
      "T",
      "Title language",
      TITLE_LANGUAGE_SELECT_ID,
      "selectedTitleLanguage",
    );
    injectFieldLanguageControl(
      descriptionInput,
      "D",
      "Description language",
      DESCRIPTION_LANGUAGE_SELECT_ID,
      "selectedDescriptionLanguage",
    );
    syncInlineLanguageControls();
  }

  function injectFieldLanguageControl(input, label, title, selectId, storageKey) {
    if (!input || document.getElementById(selectId)) return;
    const fieldLabel = input.closest("label");
    const titleNode =
      fieldLabel?.querySelector('[data-testid$="--title"]') ||
      fieldLabel?.querySelector('[class*="Input__title"]');
    if (!titleNode) return;
    titleNode.classList.add("quickvint-lang-title-host");
    titleNode.appendChild(
      createInlineLanguageField(label, title, selectId, storageKey),
    );
  }

  function syncInlineLanguageControls(root = document) {
    chrome.storage.local.get(
      ["selectedLanguage", "selectedTitleLanguage", "selectedDescriptionLanguage"],
      ({
        selectedLanguage = "en",
        selectedTitleLanguage,
        selectedDescriptionLanguage,
      }) => {
        const fallbackLanguage = normalizeLanguageCode(selectedLanguage);
        const titleTrigger = root.querySelector(`#${TITLE_LANGUAGE_SELECT_ID}`);
        const descriptionTrigger = root.querySelector(
          `#${DESCRIPTION_LANGUAGE_SELECT_ID}`,
        );
        if (titleTrigger) {
          updateInlineLanguageControl(
            titleTrigger,
            selectedTitleLanguage || fallbackLanguage,
          );
        }
        if (descriptionTrigger) {
          updateInlineLanguageControl(
            descriptionTrigger,
            selectedDescriptionLanguage || fallbackLanguage,
          );
        }
      },
    );
  }

  function createSignInComponent() {
    const btn = document.createElement("button");
    btn.id = SIGN_IN_BTN_ID;
    btn.innerHTML = `
        ${WAND_ICON_SVG}
        <span>Sign in to enable AI Tools</span>
        <span>(Click here)</span>
    `;

    btn.addEventListener("click", (e) => {
      e.preventDefault();
      trackGrowthEvent("signin_cta_click", {
        path: window.location.pathname,
      });
      chrome.runtime.sendMessage({ type: "OPEN_POPUP" });
    });

    return btn;
  }

  function updateButtonUI() {
    const titleLanguageField = document
      .getElementById(TITLE_LANGUAGE_SELECT_ID)
      ?.closest(".quickvint-lang-field");
    const descriptionLanguageField = document
      .getElementById(DESCRIPTION_LANGUAGE_SELECT_ID)
      ?.closest(".quickvint-lang-field");

    // If not authenticated, show premium sign-in button and hide others
    if (!isAuthenticated) {
      if (signInBtn) signInBtn.style.display = "flex";
      if (generateBtn) generateBtn.style.display = "none";
      if (phoneBtn) phoneBtn.style.display = "none";
      if (batchBtn) batchBtn.style.display = "none";
      if (emojiToggleBtn) emojiToggleBtn.style.display = "none";
      if (titleLanguageField) titleLanguageField.style.display = "none";
      if (descriptionLanguageField) descriptionLanguageField.style.display = "none";
      maybeTrackSignedOutToolsReady();
      return;
    }

    // Authenticated state
    if (signInBtn) signInBtn.style.display = "none";
    if (generateBtn) generateBtn.style.display = "flex";
    if (phoneBtn) phoneBtn.style.display = "flex";
    if (batchBtn) batchBtn.style.display = "flex";
    if (emojiToggleBtn) emojiToggleBtn.style.display = "inline-flex";
    if (titleLanguageField) titleLanguageField.style.display = "inline-flex";
    if (descriptionLanguageField) {
      descriptionLanguageField.style.display = "inline-flex";
    }

    if (!generateBtn) return;
    maybeTrackListingToolsReady();
    const label = generateBtn.querySelector(".label");
    const icon = generateBtn.querySelector(".icon");

    if (phoneBtn) {
      phoneBtn.classList.remove("is-loading");
      phoneBtn.disabled = isBusy;
      phoneBtn.style.background = PRIMARY_BUTTON_BACKGROUND;
      phoneBtn.style.cursor = isBusy ? "not-allowed" : "pointer";
    }
    if (batchBtn) {
      batchBtn.classList.remove("is-loading");
      batchBtn.disabled = isBusy;
      batchBtn.style.background = PRIMARY_BUTTON_BACKGROUND;
      batchBtn.style.cursor = isBusy ? "not-allowed" : "pointer";
    }

    if (!label || !icon) return;

    if (isBusy) {
      generateBtn.classList.add("is-loading");
      generateBtn.disabled = true;
      icon.style.display = "";
      label.textContent = "Generating...";
      generateBtn.style.cursor = "progress";
      generateBtn.style.background = PRIMARY_BUTTON_BACKGROUND;
    } else {
      generateBtn.classList.remove("is-loading");
      generateBtn.disabled = false;
      icon.style.display = "";
      label.textContent = "Generate";
      generateBtn.style.background = PRIMARY_BUTTON_BACKGROUND;
      generateBtn.style.cursor = "pointer";
    }
  }

  function maybeTrackListingToolsReady() {
    if (listingToolsReadyTracked || !isAuthenticated || !generateBtn) return;
    listingToolsReadyTracked = true;
    trackGrowthEvent("listing_tools_ready", {
      path: window.location.pathname,
      visiblePhotoCount: getVisibleUploadedPhotoCount(),
    });
  }

  function maybeTrackSignedOutToolsReady() {
    if (signedOutToolsReadyTracked || isAuthenticated || !signInBtn) return;
    signedOutToolsReadyTracked = true;
    trackGrowthEvent("signed_out_tools_ready", {
      path: window.location.pathname,
      visiblePhotoCount: getVisibleUploadedPhotoCount(),
    });
  }

  function setButtonSuccessState() {
    if (!generateBtn) return;
    const label = generateBtn.querySelector(".label");
    const icon = generateBtn.querySelector(".icon");
    if (!label || !icon) return;

    generateBtn.classList.remove("is-loading");
    icon.style.display = "none";
    label.textContent = "✅ Done";

    setTimeout(() => {
      isBusy = false;
      updateButtonUI();
    }, 2000);
  }

  function removeDescriptionApplyPrompt() {
    if (activeDescriptionApplyPromptCleanup) {
      activeDescriptionApplyPromptCleanup("cancel");
      return;
    }
    document.getElementById(DESCRIPTION_APPLY_PROMPT_ID)?.remove();
  }

  function setDescriptionValue(descInput, value) {
    descInput.value = value;
    descInput.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function positionDescriptionApplyPrompt(prompt, descInput) {
    const descriptionBox = descInput.closest("label") || descInput;
    const titleInput = document.querySelector(SELECTORS.title);
    const titleBox = titleInput?.closest("label") || titleInput;
    const anchor = titleBox?.parentElement || descriptionBox.parentElement || descriptionBox;
    const anchorRect = anchor.getBoundingClientRect();
    const promptWidth = Math.min(320, window.innerWidth - 24);
    const gap = 12;
    const rightSpace = window.innerWidth - anchorRect.right;
    const left = rightSpace >= promptWidth + gap
      ? anchorRect.right + gap
      : Math.max(12, window.innerWidth - promptWidth - 12);
    const top = Math.max(12, anchorRect.top);

    prompt.style.width = `${promptWidth}px`;
    prompt.style.left = `${left}px`;
    prompt.style.top = `${top}px`;
  }

  function getDescriptionApplyChoice(descInput) {
    if (!(descInput.value || "").trim()) {
      return Promise.resolve("replace");
    }

    removeDescriptionApplyPrompt();

    return new Promise((resolve) => {
      const prompt = document.createElement("div");
      prompt.id = DESCRIPTION_APPLY_PROMPT_ID;
      prompt.innerHTML = `
        <div class="quickvint-apply-title">Description already has text.</div>
        <div class="quickvint-apply-actions">
          <button type="button" class="quickvint-apply-replace">Replace</button>
          <button type="button" class="quickvint-apply-add">Add below</button>
          <button type="button" class="quickvint-apply-cancel">Cancel</button>
        </div>
      `;

      document.body.appendChild(prompt);
      positionDescriptionApplyPrompt(prompt, descInput);

      const onReposition = () => positionDescriptionApplyPrompt(prompt, descInput);
      window.addEventListener("resize", onReposition);
      window.addEventListener("scroll", onReposition, true);

      function finish(choice) {
        window.removeEventListener("resize", onReposition);
        window.removeEventListener("scroll", onReposition, true);
        prompt.remove();
        activeDescriptionApplyPromptCleanup = null;
        resolve(choice);
      }

      activeDescriptionApplyPromptCleanup = finish;

      prompt
        .querySelector(".quickvint-apply-replace")
        ?.addEventListener("click", () => {
          finish("replace");
        });

      prompt
        .querySelector(".quickvint-apply-add")
        ?.addEventListener("click", () => {
          finish("add");
        });

      prompt
        .querySelector(".quickvint-apply-cancel")
        ?.addEventListener("click", () => {
          finish("cancel");
        });
    });
  }

  function stripEmojisFromText(text) {
    return text
      .replace(EMOJI_SEQUENCE_REGEX, "")
      .replace(/[\uFE0E\uFE0F]/g, "")
      .replace(/[ \t]{2,}/g, " ")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n[ \t]+/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  function getEmojiRemoveChoice(descInput) {
    removeDescriptionApplyPrompt();

    return new Promise((resolve) => {
      const prompt = document.createElement("div");
      prompt.id = DESCRIPTION_APPLY_PROMPT_ID;
      prompt.innerHTML = `
        <div class="quickvint-apply-title">😊 Remove emojis?</div>
        <div class="quickvint-apply-copy">Remove emojis and turn them off.</div>
        <div class="quickvint-apply-actions">
          <button type="button" class="quickvint-apply-add">Remove emojis</button>
          <button type="button" class="quickvint-apply-cancel">Keep emojis</button>
          <button type="button" class="quickvint-apply-settings">⚙️ Open Settings</button>
        </div>
      `;

      document.body.appendChild(prompt);
      positionDescriptionApplyPrompt(prompt, descInput);

      const onReposition = () => positionDescriptionApplyPrompt(prompt, descInput);
      window.addEventListener("resize", onReposition);
      window.addEventListener("scroll", onReposition, true);

      function finish(choice) {
        window.removeEventListener("resize", onReposition);
        window.removeEventListener("scroll", onReposition, true);
        prompt.remove();
        activeDescriptionApplyPromptCleanup = null;
        resolve(choice);
      }

      activeDescriptionApplyPromptCleanup = finish;

      prompt
        .querySelector(".quickvint-apply-settings")
        ?.addEventListener("click", async (event) => {
          event.preventDefault();
          await chrome.storage.local.set({
            [OPEN_SETTINGS_ON_NEXT_POPUP_KEY]: Date.now(),
          });
          chrome.runtime.sendMessage({ type: "OPEN_POPUP" });
        });

      prompt
        .querySelector(".quickvint-apply-add")
        ?.addEventListener("click", () => {
          finish("remove_emojis");
        });

      prompt
        .querySelector(".quickvint-apply-cancel")
        ?.addEventListener("click", () => {
          finish("keep_emojis");
        });
    });
  }

  function applyGeneratedDescription(descInput, generatedDescription, applyChoice) {
    const currentDescription = descInput.value || "";
    if (applyChoice === "add" && currentDescription.trim()) {
      setDescriptionValue(
        descInput,
        `${currentDescription.trimEnd()}\n\n${generatedDescription}`,
      );
      return;
    }

    setDescriptionValue(descInput, generatedDescription);
  }

  async function maybeShowEmojiRetryPrompt(descInput) {
    const { [EMOJI_RETRY_PROMPT_HANDLED_KEY]: handled } =
      await chrome.storage.local.get(EMOJI_RETRY_PROMPT_HANDLED_KEY);

    if (handled) return;

    const choice = await getEmojiRemoveChoice(descInput);
    await chrome.storage.local.set({ [EMOJI_RETRY_PROMPT_HANDLED_KEY]: true });

    if (choice !== "remove_emojis") {
      trackGrowthEvent("emoji_remove_prompt_kept", {
        source: "listing_tools",
      });
      return;
    }

    await chrome.storage.local.set({ useEmojis: false });
    setEmojiToggleState(false);
    const originalDescription = descInput.value || "";
    const strippedDescription = stripEmojisFromText(originalDescription);
    if (strippedDescription !== originalDescription) {
      setDescriptionValue(descInput, strippedDescription);
    }
    trackGrowthEvent("emoji_remove_prompt_accepted", {
      source: "listing_tools",
      changed: strippedDescription !== originalDescription,
    });
  }

  // --- CORE LOGIC & EVENT HANDLERS ---

  // --- PHONE UPLOAD LOGIC ---

  function generateSessionId() {
    return "sess_" + Math.random().toString(36).substring(2, 15);
  }

  async function createModal(sessionId) {
    const modal = document.createElement("div");
    modal.id = MODAL_ID;
    modal.dataset.sessionId = sessionId;

    const uploadUrl = `${PHONE_UPLOAD_PAGE}?s=${sessionId}`;

    // Get saved language preferences. Fall back to the legacy single language setting.
    const {
      selectedLanguage = "en",
      selectedTitleLanguage,
      selectedDescriptionLanguage,
    } = await chrome.storage.local.get([
      "selectedLanguage",
      "selectedTitleLanguage",
      "selectedDescriptionLanguage",
    ]);
    const selectedModalTitleLanguage = normalizeLanguageCode(
      selectedTitleLanguage || selectedLanguage,
    );
    const selectedModalDescriptionLanguage = normalizeLanguageCode(
      selectedDescriptionLanguage || selectedLanguage,
    );

    const selectedTitleLanguageOption =
      LANGUAGE_OPTIONS.find((lang) => lang.code === selectedModalTitleLanguage) ||
      LANGUAGE_OPTIONS[0];
    const selectedDescriptionLanguageOption =
      LANGUAGE_OPTIONS.find(
        (lang) => lang.code === selectedModalDescriptionLanguage,
      ) ||
      LANGUAGE_OPTIONS[0];

    const buildOptionsHTML = (selectedCode) =>
      LANGUAGE_OPTIONS
      .map(
        (lang) =>
          `<option value="${lang.code}" ${
            lang.code === selectedCode ? "selected" : ""
          }>${lang.name}</option>`,
      )
      .join("");

    modal.innerHTML = `
      <div class="modal-content">
        <button class="close-x" aria-label="Close">&times;</button>
        <div class="modal-header">
          <h3>📱 Upload from Phone</h3>
          <span class="feature-pill">NEW · Free to test</span>
        </div>
        <p class="subtitle">Scan with your camera app</p>
        <div class="qr-container">
          <img id="qr-code" src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
            uploadUrl,
          )}" alt="QR Code" />
        </div>
        <p class="instruction">Photos will appear in this listing automatically</p>
        <div class="phone-previews" aria-live="polite">
          <div class="preview-header">
            <span>Photos</span>
            <span class="preview-extra"></span>
          </div>
          <div class="preview-grid">
            <span class="preview-empty">
              <span class="preview-pulse"></span>
              <span>Waiting for photos<span class="waiting-dots" aria-hidden="true"><span>.</span><span>.</span><span>.</span></span></span>
            </span>
          </div>
        </div>
        <div class="language-selector">
          <div class="language-select-wrapper">
            <span class="language-select-label">Title</span>
            <img
              class="modal-flag-icon modal-title-flag-icon"
              src="https://flagcdn.com/w40/${selectedTitleLanguageOption.flag}.png"
              alt="${selectedTitleLanguageOption.flagAlt}"
            />
            <select class="language-select" id="modal-title-language-select">
              ${buildOptionsHTML(selectedTitleLanguageOption.code)}
            </select>
          </div>
          <div class="language-select-wrapper">
            <span class="language-select-label">Description</span>
            <img
              class="modal-flag-icon modal-description-flag-icon"
              src="https://flagcdn.com/w40/${selectedDescriptionLanguageOption.flag}.png"
              alt="${selectedDescriptionLanguageOption.flagAlt}"
            />
            <select class="language-select" id="modal-description-language-select">
              ${buildOptionsHTML(selectedDescriptionLanguageOption.code)}
            </select>
          </div>
        </div>
        <div class="status waiting">Waiting for photos from your phone...</div>
        <div class="modal-buttons">
          <button class="close-btn">Done</button>
          <button class="generate-btn">
            <span class="icon" style="width: 14px; height: 14px; display: inline-block; margin-right: 6px;">${WAND_ICON_SVG}</span>
            Done + Generate
          </button>
        </div>
        <div class="disclaimer">
          <strong>Note:</strong> This feature will soon be available exclusively to Pro & Business plans.
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Setup language selectors
    const setupModalLanguageSelect = (selector, flagSelector, storageKey) => {
      const languageSelect = modal.querySelector(selector);
      const languageFlag = modal.querySelector(flagSelector);
      if (!languageSelect) return;
      languageSelect.addEventListener("change", (e) => {
        const selectedOption = LANGUAGE_OPTIONS.find(
          (lang) => lang.code === e.target.value,
        );
        if (languageFlag && selectedOption) {
          languageFlag.src = `https://flagcdn.com/w40/${selectedOption.flag}.png`;
          languageFlag.alt = selectedOption.flagAlt;
        }
        chrome.storage.local.set({
          [storageKey]: e.target.value,
        });
      });
    };
    setupModalLanguageSelect(
      "#modal-title-language-select",
      ".modal-title-flag-icon",
      "selectedTitleLanguage",
    );
    setupModalLanguageSelect(
      "#modal-description-language-select",
      ".modal-description-flag-icon",
      "selectedDescriptionLanguage",
    );

    // Close button handlers
    modal.querySelector(".close-x").addEventListener("click", closeModal);
    modal.querySelector(".close-btn").addEventListener("click", closeModal);
    modal.querySelector(".generate-btn").addEventListener("click", () => {
      closeModal();
      // Trigger generate after a brief delay to ensure modal cleanup completes
      setTimeout(() => onGenerateClick(), 100);
    });

    // Close when clicking outside modal (on backdrop)
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        closeModal();
      }
    });

    return modal;
  }

  function closeModal() {
    const modal = document.getElementById(MODAL_ID);
    const sessionId = modal?.dataset?.sessionId;
    const receivedCount = downloadedFiles.size;

    if (activePhoneUploadSessionId === sessionId) {
      activePhoneUploadSessionId = null;
    }
    if (modal) {
      modal.remove();
    }
    if (pollInterval) {
      clearInterval(pollInterval);
      pollInterval = null;
    }
    if (phoneUploadAutoCloseTimer) {
      clearTimeout(phoneUploadAutoCloseTimer);
      phoneUploadAutoCloseTimer = null;
    }
    downloadedFiles.clear();
    pendingPhoneFiles.clear();
    isPhoneUploadPollInFlight = false;
    if (phoneUploadPreviewTimer) {
      clearTimeout(phoneUploadPreviewTimer);
      phoneUploadPreviewTimer = null;
    }
    phoneUploadPreviewUrls.forEach((url) => URL.revokeObjectURL(url));
    phoneUploadPreviewUrls = [];
    displayedPhoneUploadPreviewCount = 0;

    if (sessionId) {
      trackGrowthEvent("phone_upload_close", {
        mode: "single",
        receivedCount,
      });
    }

    // Notify server to clean up session and delete files
    if (sessionId && chrome.runtime?.id) {
      sendMessage({
        type: "PROXY_FETCH",
        url: `${PHONE_UPLOAD_API}?action=cleanup&sessionId=${sessionId}`,
        options: {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        },
      }).catch(() => {}); // Silent fail
    }
  }

  async function onPhoneUploadClick() {
    if (!isAuthenticated) {
      showToast("Please sign in via the extension popup first.", "error");
      return;
    }

    const restorePhoneButton = setActionButtonLoading(phoneBtn, "Checking...");
    let capacity;
    try {
      capacity = await fetchBatchGenerationCapacity();
    } catch (err) {
      capacity = {
        allowed: false,
        available: 0,
        message: "Could not check how many listings are available.",
      };
    }

    const available = Math.max(0, Math.floor(Number(capacity.available || 0)));
    if (!capacity.allowed || available <= 0) {
      restorePhoneButton();
      await showBatchCapacityBlocked(capacity);
      return;
    }

    if (document.getElementById(MODAL_ID)) {
      closeModal();
    }

    const sessionId = generateSessionId();
    try {
      trackGrowthEvent("phone_upload_start", {
        mode: "single",
        available,
      });
      await createModal(sessionId);
      startPolling(sessionId);
    } finally {
      restorePhoneButton();
    }
  }

  function startPolling(sessionId) {
    activePhoneUploadSessionId = sessionId;

    if (pollInterval) {
      clearInterval(pollInterval);
      pollInterval = null;
    }

    const statusEl = document.querySelector(`#${MODAL_ID} .status`);
    const initialImageCount = getVisibleUploadedPhotoCount();
    schedulePhoneUploadAutoClose(sessionId);

    pollInterval = setInterval(async () => {
      if (isPhoneUploadPollInFlight) return;

      try {
        isPhoneUploadPollInFlight = true;

        // Check if extension context is still valid
        if (!chrome.runtime?.id) {
          clearInterval(pollInterval);
          pollInterval = null;
          return;
        }

        const response = await sendMessage({
          type: "PROXY_FETCH",
          url: `${PHONE_UPLOAD_API}?sessionId=${sessionId}&t=${Date.now()}`,
          options: { method: "GET" },
        });

        if (!response || !response.ok) return;

        const data =
          typeof response.data === "string"
            ? JSON.parse(response.data)
            : response.data;
        if (data.files && data.files.length > 0) {
          const newRemoteFiles = data.files.filter((file) => {
            const fileKey = getPhoneUploadFileKey(file);
            return (
              fileKey &&
              !downloadedFiles.has(fileKey) &&
              !pendingPhoneFiles.has(fileKey)
            );
          });

          if (newRemoteFiles.length > 0) {
            schedulePhoneUploadAutoClose(sessionId);
            newRemoteFiles.forEach((file) =>
              pendingPhoneFiles.add(getPhoneUploadFileKey(file)),
            );

            if (statusEl) {
              statusEl.className = "status";
              statusEl.textContent = `Adding ${newRemoteFiles.length} photo${
                newRemoteFiles.length !== 1 ? "s" : ""
              } to your listing...`;
            }

            try {
              const downloads = await Promise.all(
                newRemoteFiles.map(downloadPhoneUploadFile),
              );

              if (!isPhoneUploadSessionActive(sessionId)) {
                downloads.forEach((result) => {
                  if (result.previewUrl) URL.revokeObjectURL(result.previewUrl);
                });
                return;
              }

              const filesToInject = downloads
                .filter((result) => result.file)
                .map((result) => result.file);
              const failedDownloadCount = downloads.length - filesToInject.length;

              if (filesToInject.length > 0) {
                if (injectFilesIntoVinted(filesToInject)) {
                  downloads.forEach((result) => {
                    if (result.file) {
                      downloadedFiles.add(result.key);
                      if (result.previewUrl) {
                        phoneUploadPreviewUrls.push(result.previewUrl);
                      }
                    }
                  });
                  trackGrowthEvent("phone_upload_received", {
                    mode: "single",
                    receivedCount: filesToInject.length,
                    failedDownloadCount,
                    totalReceivedCount: downloadedFiles.size,
                  });
                  schedulePhoneUploadPreviewReveal();
                } else {
                  trackGrowthEvent("phone_upload_inject_error", {
                    mode: "single",
                    receivedCount: filesToInject.length,
                    failedDownloadCount,
                  });
                  downloads.forEach((result) => {
                    if (result.previewUrl) URL.revokeObjectURL(result.previewUrl);
                  });
                }
              } else if (failedDownloadCount > 0) {
                trackGrowthEvent("phone_upload_download_error", {
                  mode: "single",
                  failedDownloadCount,
                });
              }
            } finally {
              newRemoteFiles.forEach((file) =>
                pendingPhoneFiles.delete(getPhoneUploadFileKey(file)),
              );
            }
          }

          updatePhoneUploadStatus(statusEl, initialImageCount);
        } else {
          // No files yet, show waiting message
          if (statusEl && downloadedFiles.size === 0) {
            statusEl.className = "status waiting";
            statusEl.textContent = "Waiting for photos from your phone...";
          } else if (statusEl && downloadedFiles.size > 0) {
            updatePhoneUploadStatus(statusEl, initialImageCount);
          }
        }
      } catch (err) {
        console.error("Polling error:", err);
      } finally {
        if (activePhoneUploadSessionId === sessionId) {
          isPhoneUploadPollInFlight = false;
        }
      }
    }, 3000);

  }

  function schedulePhoneUploadAutoClose(sessionId) {
    if (phoneUploadAutoCloseTimer) {
      clearTimeout(phoneUploadAutoCloseTimer);
      phoneUploadAutoCloseTimer = null;
    }

    // Auto-close after 5 minutes of inactivity (silent, no alert)
    phoneUploadAutoCloseTimer = setTimeout(
      () => {
        if (isPhoneUploadSessionActive(sessionId)) {
          closeModal();
        }
      },
      5 * 60 * 1000,
    );
  }

  function isPhoneUploadSessionActive(sessionId) {
    const modal = document.getElementById(MODAL_ID);
    return (
      activePhoneUploadSessionId === sessionId &&
      modal?.dataset?.sessionId === sessionId
    );
  }

  function getPhoneUploadFileKey(file) {
    if (!file) return "";
    const explicitKey = file.id || file.key || file.path || file.storagePath;
    if (explicitKey) return String(explicitKey);

    let stableUrl = file.url || "";
    try {
      const parsedUrl = new URL(file.url);
      stableUrl = `${parsedUrl.origin}${parsedUrl.pathname}`;
    } catch (err) {
      // Keep the raw URL if it is not parseable.
    }

    return [file.name, stableUrl].filter(Boolean).join("|");
  }

  async function downloadPhoneUploadFile(remoteFile) {
    const key = getPhoneUploadFileKey(remoteFile);
    try {
      const response = await sendMessage({
        type: "PROXY_FETCH",
        url: remoteFile.url,
        options: { method: "GET" },
        isBlob: true,
      });

      if (!response || !response.ok) {
        throw new Error(
          response ? response.error : "Failed to download image via proxy",
        );
      }

      const res = await fetch(response.data);
      const blob = await res.blob();
      const filename = remoteFile.name || `upload_${Date.now()}.jpg`;
      const file = new File([blob], filename, {
        type: blob.type || "image/jpeg",
      });
      const previewUrl = URL.createObjectURL(blob);

      return { key, file, previewUrl };
    } catch (err) {
      console.error("Error downloading phone upload image:", err);
      return { key, file: null, previewUrl: null };
    }
  }

  function injectFilesIntoVinted(files) {
    const fileInput = document.querySelector(SELECTORS.fileInput);
    if (!fileInput || files.length === 0) return false;

    const dataTransfer = new DataTransfer();
    files.forEach((file) => dataTransfer.items.add(file));

    fileInput.files = dataTransfer.files;
    fileInput.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  }

  function updatePhoneUploadStatus(statusEl, initialImageCount) {
    if (!statusEl) return;

    const sentCount = downloadedFiles.size;
    const visiblePhoneUploadCount = Math.max(
      0,
      getVisibleUploadedPhotoCount() - initialImageCount,
    );

    statusEl.className = "status";
    if (sentCount === 0) {
      statusEl.className = "status waiting";
      statusEl.textContent = "Waiting for photos from your phone...";
    } else if (visiblePhoneUploadCount >= sentCount) {
      statusEl.textContent = `${sentCount} photo${
        sentCount !== 1 ? "s" : ""
      } added. Ready for more.`;
    } else {
      statusEl.textContent = `${sentCount} photo${
        sentCount !== 1 ? "s" : ""
      } received. Adding to your listing...`;
    }
  }

  function schedulePhoneUploadPreviewReveal() {
    if (phoneUploadPreviewTimer) return;
    if (displayedPhoneUploadPreviewCount >= phoneUploadPreviewUrls.length) return;

    phoneUploadPreviewTimer = setTimeout(() => {
      phoneUploadPreviewTimer = null;
      displayedPhoneUploadPreviewCount += 1;
      renderPhoneUploadPreviews();
      schedulePhoneUploadPreviewReveal();
    }, displayedPhoneUploadPreviewCount === 0 ? 80 : 180);
  }

  function createPhoneUploadEmptyState() {
    const emptyEl = document.createElement("span");
    emptyEl.className = "preview-empty";
    emptyEl.innerHTML = `
      <span class="preview-pulse"></span>
      <span>Waiting for photos<span class="waiting-dots" aria-hidden="true"><span>.</span><span>.</span><span>.</span></span></span>
    `;
    return emptyEl;
  }

  function renderPhoneUploadPreviews() {
    const modal = document.getElementById(MODAL_ID);
    if (!modal) return;

    const previewsEl = modal.querySelector(".phone-previews");
    const gridEl = modal.querySelector(".preview-grid");
    const extraEl = modal.querySelector(".preview-extra");
    if (!previewsEl || !gridEl || !extraEl) return;

    const revealedCount = Math.min(
      displayedPhoneUploadPreviewCount,
      phoneUploadPreviewUrls.length,
    );
    const visibleUrls = phoneUploadPreviewUrls.slice(
      0,
      Math.min(revealedCount, MAX_PHONE_UPLOAD_PREVIEWS),
    );
    const hiddenCount = Math.max(
      0,
      revealedCount - MAX_PHONE_UPLOAD_PREVIEWS,
    );

    const existingThumbs = gridEl.querySelectorAll(".preview-thumb").length;
    if (revealedCount === 0) {
      gridEl.replaceChildren(createPhoneUploadEmptyState());
    } else {
      const emptyEl = gridEl.querySelector(".preview-empty");
      if (emptyEl) emptyEl.remove();

      visibleUrls.slice(existingThumbs).forEach((url, index) => {
        const thumbIndex = existingThumbs + index;
        const img = document.createElement("img");
        img.className = "preview-thumb";
        img.src = url;
        img.alt = `Uploaded photo ${thumbIndex + 1}`;
        gridEl.appendChild(img);
      });
    }

    let moreEl = gridEl.querySelector(".preview-more");
    if (hiddenCount > 0) {
      if (!moreEl) {
        moreEl = document.createElement("span");
        moreEl.className = "preview-more";
        gridEl.appendChild(moreEl);
      }
      moreEl.textContent = `+${hiddenCount}`;
    } else if (moreEl) {
      moreEl.remove();
    }

    extraEl.textContent = revealedCount > 0 ? String(revealedCount) : "";
  }

  // --- BATCH UPLOAD LOGIC ---

  function resetBatchState() {
    batchUploadSessionId = null;
    batchRemoteFiles = [];
    batchRemoteFileKeys = new Set();
    batchMarkedGroups = [];
    batchSelectedPhotoKeys = new Set();
    batchIsComplete = false;
    batchPhotoTileByKey = new Map();
    batchGroupRowById = new Map();
    batchNextGroupId = 1;
    batchLastFileCount = 0;
    batchLastFileChangeAt = 0;
    batchProgressGroups = [];
    batchProgressStatus = null;
    batchGenerationCapacity = null;
    batchCapacityLoading = false;
    batchReceivedEventSent = false;
    batchCompleteReceivedEventSent = false;
    isBatchPollInFlight = false;
    batchImagePreloadUrls = new Set();
    batchImagePreloadCache = new Map();
  }

  function setBatchModalScrollLock(locked) {
    document.documentElement.classList.toggle("quickvint-batch-modal-open", locked);
    document.body?.classList.toggle("quickvint-batch-modal-open", locked);
  }

  function isBatchGenerationActive() {
    return Boolean(batchProgressStatus && isBatchProgressActive(batchProgressStatus));
  }

  function isBatchProgressFinished() {
    return Boolean(batchProgressStatus && !isBatchProgressActive(batchProgressStatus));
  }

  function shouldWarnBeforeClosingBatch() {
    if (isBatchProgressFinished()) return false;

    return (
      isBatchGenerationActive() ||
      batchRemoteFiles.length > 0 ||
      batchSelectedPhotoKeys.size > 0 ||
      batchMarkedGroups.length > 0
    );
  }

  function getBatchCloseWarningMessage() {
    if (isBatchGenerationActive()) {
      return "Batch generation is still running. Closing this panel will hide progress, but opened listing tabs may continue. Close anyway?";
    }

    if (!batchIsComplete && batchRemoteFiles.length > 0) {
      return "Photos are still uploading. Closing now will discard this batch upload. Close anyway?";
    }

    return "Closing now will discard this batch setup, including uploaded photos and grouped items. Close anyway?";
  }

  function requestCloseBatchModal({ cleanup = true } = {}) {
    if (shouldWarnBeforeClosingBatch() && !window.confirm(getBatchCloseWarningMessage())) {
      return false;
    }

    closeBatchModal({
      cleanup: cleanup && !isBatchGenerationActive(),
    });
    return true;
  }

  function closeBatchModal({ cleanup = true } = {}) {
    const sessionId = batchUploadSessionId;
    const receivedCount = batchRemoteFiles.length;
    const groupedCount = batchMarkedGroups.length;
    const wasComplete = batchIsComplete;
    document.getElementById(BATCH_MODAL_ID)?.remove();
    setBatchModalScrollLock(false);

    if (batchPollInterval) {
      clearInterval(batchPollInterval);
      batchPollInterval = null;
    }
    if (batchAutoCloseTimer) {
      clearTimeout(batchAutoCloseTimer);
      batchAutoCloseTimer = null;
    }

    if (cleanup && sessionId && chrome.runtime?.id) {
      sendMessage({
        type: "PROXY_FETCH",
        url: `${PHONE_UPLOAD_API}?action=cleanup&sessionId=${sessionId}`,
        options: {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        },
      }).catch(() => {});
    }

    if (sessionId) {
      trackGrowthEvent("phone_upload_close", {
        mode: "batch",
        cleanup: Boolean(cleanup),
        complete: wasComplete,
        receivedCount,
        groupedCount,
      });
    }

    resetBatchState();
  }

  function scheduleBatchAutoClose(sessionId) {
    if (batchAutoCloseTimer) {
      clearTimeout(batchAutoCloseTimer);
      batchAutoCloseTimer = null;
    }

    batchAutoCloseTimer = setTimeout(() => {
      if (batchUploadSessionId === sessionId) {
        closeBatchModal({ cleanup: true });
      }
    }, BATCH_UPLOAD_IDLE_TIMEOUT_MS);
  }

  async function onBatchUploadClick() {
    if (!isAuthenticated) {
      trackGrowthEvent("phone_upload_blocked", { reason: "signed_out" });
      showToast("Please sign in via the extension popup first.", "error");
      return;
    }

    if (getVisibleUploadedPhotoCount() > 0) {
      trackGrowthEvent("phone_upload_blocked", { reason: "listing_not_empty" });
      showToast("Start batch upload from an empty Vinted listing tab.", "error");
      return;
    }

    if (document.getElementById(BATCH_MODAL_ID)) {
      const closed = requestCloseBatchModal({ cleanup: true });
      if (!closed) return;
    }

    resetBatchState();
    const restoreBatchButton = setActionButtonLoading(batchBtn, "Checking...");
    batchCapacityLoading = true;

    try {
      batchGenerationCapacity = await fetchBatchGenerationCapacity();
    } catch (err) {
      batchGenerationCapacity = {
        allowed: false,
        available: 0,
        message: "Could not check how many listings are available.",
      };
    } finally {
      batchCapacityLoading = false;
      restoreBatchButton();
    }

    const available = Math.max(
      0,
      Math.floor(Number(batchGenerationCapacity?.available || 0)),
    );
    if (!batchGenerationCapacity?.allowed || available <= 0) {
      await showBatchCapacityBlocked(batchGenerationCapacity);
      resetBatchState();
      return;
    }

    const sessionId = generateSessionId();
    batchUploadSessionId = sessionId;
    batchLastFileChangeAt = Date.now();
    trackGrowthEvent("phone_upload_start", { mode: "batch", available });
    createBatchModal(sessionId);
    startBatchPolling(sessionId);
  }

  function createBatchModal(sessionId) {
    const modal = document.createElement("div");
    modal.id = BATCH_MODAL_ID;
    modal.dataset.sessionId = sessionId;
    setBatchModalScrollLock(true);

    modal.innerHTML = `
      <div class="batch-content">
        <div class="batch-topbar">
          <div class="batch-heading">
            <h3 class="batch-title">Batch upload</h3>
            <p class="batch-subtitle">Create several listings at once.</p>
          </div>
          <button class="batch-close" type="button" aria-label="Close">&times;</button>
        </div>
        <div class="batch-body"></div>
      </div>
    `;

    document.body.appendChild(modal);
    modal.querySelector(".batch-close")?.addEventListener("click", () => {
      requestCloseBatchModal({ cleanup: true });
    });
    modal.addEventListener("click", (event) => {
      if (event.target === modal) requestCloseBatchModal({ cleanup: true });
    });

    renderBatchUploadPhase(sessionId);
  }

  function getBatchUploadUrl(sessionId) {
    return `${PHONE_UPLOAD_PAGE}?s=${sessionId}&mode=batch`;
  }

  function getBatchBody() {
    return document.querySelector(`#${BATCH_MODAL_ID} .batch-body`);
  }

  function renderBatchUploadPhase(sessionId) {
    const body = getBatchBody();
    if (!body) return;
    document.getElementById(BATCH_MODAL_ID)?.classList.remove("organizing", "generating");
    const titleEl = document.querySelector(`#${BATCH_MODAL_ID} .batch-title`);
    const subtitleEl = document.querySelector(`#${BATCH_MODAL_ID} .batch-subtitle`);
    if (titleEl) titleEl.textContent = "Batch upload";
    if (subtitleEl) {
      subtitleEl.hidden = false;
      subtitleEl.textContent = "Create several listings at once.";
    }
    document
      .querySelector(`#${BATCH_MODAL_ID} .organize-progress`)
      ?.remove();

    const uploadUrl = getBatchUploadUrl(sessionId);
    body.innerHTML = `
      <div class="batch-layout">
        <div class="batch-qr">
          <div class="batch-qr-placeholder" data-qr-src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
            uploadUrl,
          )}"></div>
          <p class="batch-qr-note">Keep the phone page open.</p>
        </div>
        <div class="batch-wait-panel">
          <div class="batch-wait-title">Waiting for photos<span class="waiting-dots" aria-hidden="true"><span>.</span><span>.</span><span>.</span></span></div>
          <div class="batch-wait-copy">Choose photos on your phone. They will appear here.</div>
        </div>
      </div>
      <div class="batch-actions">
        <button type="button" class="batch-cancel">Cancel</button>
        <button type="button" class="primary batch-group" disabled hidden>Group photos</button>
      </div>
    `;

    requestAnimationFrame(() => {
      const placeholder = body.querySelector(".batch-qr-placeholder");
      if (!placeholder?.dataset.qrSrc) return;
      const img = document.createElement("img");
      img.alt = "Batch upload QR Code";
      img.onload = () => {
        placeholder.replaceWith(img);
      };
      img.onerror = () => {
        placeholder.classList.add("error");
      };
      img.src = placeholder.dataset.qrSrc;
    });

    body.querySelector(".batch-cancel")?.addEventListener("click", () => {
      requestCloseBatchModal({ cleanup: true });
    });
    body.querySelector(".batch-group")?.addEventListener("click", () => {
      renderBatchGroupingPhase();
    });
    renderBatchUploadStrip();
  }

  function renderBatchUploadStrip() {
    const status = document.querySelector(`#${BATCH_MODAL_ID} .batch-status`);
    const groupButton = document.querySelector(`#${BATCH_MODAL_ID} .batch-group`);
    const title = document.querySelector(`#${BATCH_MODAL_ID} .batch-wait-title`);
    const copy = document.querySelector(`#${BATCH_MODAL_ID} .batch-wait-copy`);
    if (!title || !copy) return;

    const receivedCount = batchRemoteFiles.length;
    const isStale =
      !batchIsComplete &&
      receivedCount > 0 &&
      Date.now() - batchLastFileChangeAt > BATCH_UPLOAD_STALE_MS;

    if (status) {
      status.classList.toggle("done", batchIsComplete && receivedCount > 0);
      status.classList.toggle("warning", isStale);
      status.textContent = batchIsComplete
        ? receivedCount
          ? `${receivedCount} ready`
          : "No photos"
        : receivedCount
          ? isStale
            ? "Connection paused"
            : `${receivedCount} received`
          : "Waiting";
    }

    const previousCount = Number(title.dataset.receivedCount || "0");
    const countChanged = receivedCount > 0 && receivedCount !== previousCount;
    title.dataset.receivedCount = String(receivedCount);

    if (batchIsComplete) {
      title.innerHTML = receivedCount
        ? `<span class="batch-count-number">${receivedCount}</span> photo${receivedCount === 1 ? "" : "s"} ready`
        : "No photos received";
    } else if (receivedCount) {
      title.innerHTML = isStale
        ? `Check phone (<span class="batch-count-number">${receivedCount}</span> received)`
        : `Receiving <span class="batch-count-number">${receivedCount}</span> photo${receivedCount === 1 ? "" : "s"}<span class="waiting-dots" aria-hidden="true"><span>.</span><span>.</span><span>.</span></span>`;
    } else {
      title.innerHTML =
        'Waiting for photos<span class="waiting-dots" aria-hidden="true"><span>.</span><span>.</span><span>.</span></span>';
    }
    if (countChanged) {
      const countEl = title.querySelector(".batch-count-number");
      countEl?.classList.add("bump");
    }
    copy.textContent = batchIsComplete
      ? receivedCount
        ? "Group photos into listings."
        : "Select photos on your phone to begin."
      : receivedCount
        ? isStale
          ? "Reopen the phone page, then leave it visible."
          : "Keep the phone page open."
        : "Choose photos on your phone. They will appear here.";

    if (groupButton) {
      groupButton.disabled = !batchIsComplete || receivedCount === 0;
      groupButton.hidden = groupButton.disabled;
      groupButton.textContent = receivedCount
        ? batchIsComplete
          ? `Group ${receivedCount} photo${receivedCount === 1 ? "" : "s"}`
          : "Receiving photos"
        : "Group photos";
    }
  }

  function refreshBatchWaitingState() {
    if (document.querySelector(`#${BATCH_MODAL_ID} .batch-wait-panel`)) {
      renderBatchUploadStrip();
    }
  }

  function maybeAutoOpenBatchGrouping() {
    if (!batchIsComplete || batchRemoteFiles.length === 0) return false;
    if (!document.querySelector(`#${BATCH_MODAL_ID} .batch-wait-panel`)) return false;
    renderBatchGroupingPhase();
    return true;
  }

  function preloadBatchImage(file) {
    const url = file?.url;
    if (!url || batchImagePreloadUrls.has(url)) return;
    batchImagePreloadUrls.add(url);

    const img = new Image();
    img.decoding = "async";
    img.loading = "eager";
    img.src = url;
    batchImagePreloadCache.set(url, img);
  }

  function preloadBatchImages(files = batchRemoteFiles) {
    files.forEach(preloadBatchImage);
  }

  function runAfterBatchRender(callback) {
    let didRun = false;
    const run = () => {
      if (didRun) return;
      didRun = true;
      callback();
    };

    requestAnimationFrame(run);
    window.setTimeout(run, 50);
  }

  function steadyBatchReviewLayout(durationMs = 220) {
    const review = document.querySelector(`#${BATCH_MODAL_ID} .batch-review`);
    if (!review) return;

    const timerKey = "__quickvintReflowTimer";
    const galleryTimerKey = "__quickvintGalleryHeightTimer";
    const gallery = document.querySelector(`#${BATCH_MODAL_ID}.organizing .batch-gallery`);
    if (review[timerKey]) {
      clearTimeout(review[timerKey]);
    }
    if (gallery?.[galleryTimerKey]) {
      clearTimeout(gallery[galleryTimerKey]);
    }

    const galleryHeight = gallery?.getBoundingClientRect().height || 0;
    if (galleryHeight) {
      gallery.style.setProperty(
        "--quickvint-batch-gallery-min-height",
        `${Math.round(galleryHeight)}px`,
      );
    }

    review.classList.add("is-reflowing");
    review[timerKey] = window.setTimeout(() => {
      review.classList.remove("is-reflowing");
      review[timerKey] = null;
    }, durationMs);

    if (gallery) {
      gallery[galleryTimerKey] = window.setTimeout(() => {
        gallery.style.removeProperty("--quickvint-batch-gallery-min-height");
        gallery[galleryTimerKey] = null;
      }, durationMs);
    }
  }

  function measureBatchGalleryPositions() {
    const gallery = document.querySelector(`#${BATCH_MODAL_ID}.organizing .batch-gallery`);
    if (!gallery) return new Map();

    const positions = new Map();
    gallery.querySelectorAll(".batch-photo-wrap:not([hidden])").forEach((wrapper) => {
      const key = wrapper.querySelector(".batch-photo")?.dataset?.photoKey;
      if (!key) return;
      const rect = wrapper.getBoundingClientRect();
      positions.set(key, { left: rect.left, top: rect.top });
    });
    return positions;
  }

  function animateBatchGalleryFromPositions(beforePositions) {
    const gallery = document.querySelector(`#${BATCH_MODAL_ID}.organizing .batch-gallery`);
    if (!gallery || !beforePositions?.size) return;

    const movingItems = [];
    gallery.querySelectorAll(".batch-photo-wrap:not([hidden])").forEach((wrapper) => {
      const key = wrapper.querySelector(".batch-photo")?.dataset?.photoKey;
      const before = key ? beforePositions.get(key) : null;
      if (!before) return;
      const rect = wrapper.getBoundingClientRect();
      const dx = before.left - rect.left;
      const dy = before.top - rect.top;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
      movingItems.push({ wrapper, dx, dy });
    });

    movingItems.forEach(({ wrapper, dx, dy }) => {
      wrapper.style.transition = "none";
      wrapper.style.transform = `translate(${Math.round(dx)}px, ${Math.round(dy)}px)`;
    });

    requestAnimationFrame(() => {
      movingItems.forEach(({ wrapper }) => {
        wrapper.style.transition = "transform 180ms ease";
        wrapper.style.transform = "";
        window.setTimeout(() => {
          wrapper.style.transition = "";
        }, 200);
      });
    });
  }

  function createBatchPhotoElement(file, index, itemNumber, options = {}) {
    const {
      badgeText = `Listing ${itemNumber}`,
      marked = false,
      onClick = null,
      onDiscard = null,
      selected = false,
    } = options;
    const wrapper = document.createElement("div");
    wrapper.className = "batch-photo-wrap";
    wrapper.classList.toggle("is-grouped", marked);
    wrapper.hidden = marked;
    wrapper.setAttribute("aria-hidden", marked ? "true" : "false");

    const photo = document.createElement("div");
    photo.className = "batch-photo";
    photo.dataset.photoIndex = String(index);
    photo.dataset.photoKey = getPhoneUploadFileKey(file);
    photo.classList.toggle("selected", selected);
    photo.classList.toggle("marked", marked);
    photo.classList.toggle("tap-target", Boolean(onClick) && !marked);
    if (onClick) {
      photo.addEventListener("click", onClick);
    }
    const img = document.createElement("img");
    img.loading = "eager";
    img.decoding = "async";
    img.fetchPriority = "high";
    img.src = file.url;
    img.alt = `Batch photo ${index + 1}`;
    const badge = document.createElement("span");
    badge.className = "batch-photo-badge";
    badge.textContent = badgeText;
    photo.appendChild(img);
    photo.appendChild(badge);

    if (onDiscard) {
      const discardButton = document.createElement("button");
      discardButton.type = "button";
      discardButton.className = "batch-discard-photo";
      discardButton.setAttribute("aria-label", `Discard photo ${index + 1}`);
      discardButton.title = "Discard photo";
      discardButton.textContent = "×";
      discardButton.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        onDiscard();
      });
      photo.appendChild(discardButton);
    }

    if (onClick) {
      const check = document.createElement("span");
      check.className = "batch-select-check";
      check.textContent = selected ? "✓" : "";
      photo.appendChild(check);
    }

    wrapper.appendChild(photo);
    return wrapper;
  }

  function renderBatchGroupingPhase() {
    const body = getBatchBody();
    if (!body) return;
    if (!batchIsComplete) {
      showToast("Phone upload is still running.", "info");
      renderBatchUploadPhase(batchUploadSessionId);
      return;
    }
    if (!batchRemoteFiles.length) {
      showToast("No photos were sent for this batch.", "error");
      return;
    }
    preloadBatchImages(batchRemoteFiles);
    const modal = document.getElementById(BATCH_MODAL_ID);
    modal?.classList.remove("generating");
    modal?.classList.add("organizing");
    const titleEl = document.querySelector(`#${BATCH_MODAL_ID} .batch-title`);
    const subtitleEl = document.querySelector(`#${BATCH_MODAL_ID} .batch-subtitle`);
    if (titleEl) titleEl.textContent = "Organize items";
    if (subtitleEl) {
      subtitleEl.hidden = true;
      subtitleEl.textContent = "";
    }
    const topbarEl = document.querySelector(`#${BATCH_MODAL_ID} .batch-topbar`);
    if (topbarEl && !topbarEl.querySelector(".organize-progress")) {
      topbarEl.insertAdjacentHTML(
        "beforeend",
        `
          <div class="organize-status-row" aria-live="polite">
            <div class="organize-progress" aria-hidden="true">
              <span class="organize-progress-done"></span>
              <span class="organize-progress-active"></span>
            </div>
            <span class="organize-unsorted-badge"></span>
          </div>
        `,
      );
    }

    body.innerHTML = `
      <div class="batch-review">
        <div class="organize-tip">
          <span class="organize-tip-icon">▧</span>
          <span>Tap photos for one item</span>
        </div>
        <div class="batch-gallery" aria-live="polite"></div>
        <div class="batch-empty-state is-hidden" aria-hidden="true">Review grouped items below.</div>
        <div class="batch-summary-head">
          <span class="batch-summary-title">
            <span>Items</span>
            <span class="batch-summary-count"></span>
          </span>
          <button type="button" class="batch-summary-reset batch-reset-groups is-hidden" hidden aria-hidden="true">Reset groups</button>
        </div>
        <div class="batch-capacity-note">Checking availability...</div>
        <div class="batch-groups" aria-live="polite"></div>
      </div>
      <div class="batch-actions">
        <span class="batch-selection-count"></span>
        <div class="batch-secondary-actions is-hidden" hidden>
          <button type="button" class="footer-control batch-clear-selection is-hidden" hidden aria-hidden="true">Clear</button>
        </div>
        <button type="button" class="primary footer-control batch-mark-group is-hidden" disabled hidden aria-hidden="true">Group photos</button>
        <button type="button" class="primary footer-control batch-start is-hidden" hidden aria-hidden="true"></button>
      </div>
    `;

    body.querySelector(".batch-clear-selection")?.addEventListener("click", () => {
      const selectedKeys = Array.from(batchSelectedPhotoKeys);
      batchSelectedPhotoKeys.clear();
      selectedKeys.forEach(updateBatchPhotoSelectionTile);
      updateBatchGroupingControls();
    });
    body.querySelector(".batch-mark-group")?.addEventListener("click", markSelectedPhotosAsGroup);
    body.querySelector(".batch-reset-groups")?.addEventListener("click", () => {
      steadyBatchReviewLayout();
      const groupedKeys = getMarkedBatchPhotoKeys();
      batchMarkedGroups = [];
      batchSelectedPhotoKeys.clear();
      batchGroupRowById.forEach((row) => row.remove());
      batchGroupRowById.clear();
      const emptyMarkedKeys = new Set();
      groupedKeys.forEach((key) => updateBatchPhotoMarkedTile(key, emptyMarkedKeys));
      updateBatchGroupingControls();
    });
    body.querySelector(".batch-start")?.addEventListener("click", startBatchGeneration);
    buildBatchGroupingGallery();
    refreshBatchGenerationCapacity();
  }

  function buildBatchGroupingGallery() {
    const gallery = document.querySelector(`#${BATCH_MODAL_ID} .batch-gallery`);
    const groupsEl = document.querySelector(`#${BATCH_MODAL_ID} .batch-groups`);
    if (!gallery || !groupsEl) return;

    batchPhotoTileByKey = new Map();
    batchGroupRowById = new Map();
    gallery.textContent = "";
    groupsEl.textContent = "";

    const markedKeys = getMarkedBatchPhotoKeys();
    const fragment = document.createDocumentFragment();
    batchRemoteFiles.forEach((file, index) => {
      const key = getPhoneUploadFileKey(file);
      const tile = createBatchPhotoElement(file, index, batchMarkedGroups.length + 1, {
        badgeText: `#${index + 1}`,
        marked: markedKeys.has(key),
        selected: batchSelectedPhotoKeys.has(key),
        onClick: () => toggleBatchPhotoSelection(key),
        onDiscard: () => discardBatchPhoto(key),
      });
      batchPhotoTileByKey.set(key, tile.querySelector(".batch-photo"));
      fragment.appendChild(tile);
    });
    gallery.appendChild(fragment);

    batchMarkedGroups.forEach((group) => renderBatchGroupRow(group));
    updateBatchGroupingControls();
  }

  function getMarkedBatchPhotoKeys() {
    return new Set(batchMarkedGroups.flatMap((group) => group.keys));
  }

  function isBatchPhotoMarked(key) {
    return batchMarkedGroups.some((group) => group.keys.includes(key));
  }

  function toggleBatchPhotoSelection(key) {
    if (!key || isBatchPhotoMarked(key)) return;
    if (batchSelectedPhotoKeys.has(key)) {
      batchSelectedPhotoKeys.delete(key);
    } else {
      batchSelectedPhotoKeys.add(key);
    }
    updateBatchPhotoSelectionTile(key);
    updateBatchGroupingControls();
  }

  function discardBatchPhoto(key) {
    if (!key) return;

    const index = batchRemoteFiles.findIndex(
      (file) => getPhoneUploadFileKey(file) === key,
    );
    if (index < 0) return;

    const beforePositions = measureBatchGalleryPositions();
    steadyBatchReviewLayout();
    batchRemoteFiles.splice(index, 1);
    batchRemoteFileKeys.delete(key);
    batchSelectedPhotoKeys.delete(key);
    batchLastFileCount = batchRemoteFiles.length;
    batchLastFileChangeAt = Date.now();

    batchMarkedGroups = batchMarkedGroups
      .map((group) => ({
        ...group,
        keys: group.keys.filter((itemKey) => itemKey !== key),
      }))
      .filter((group) => group.keys.length > 0);

    buildBatchGroupingGallery();
    animateBatchGalleryFromPositions(beforePositions);
  }

  function updateBatchPhotoSelectionTile(key) {
    const photo = batchPhotoTileByKey.get(key);
    if (!photo) return;

    const selected = batchSelectedPhotoKeys.has(key);
    photo.classList.toggle("selected", selected);
    const check = photo.querySelector(".batch-select-check");
    if (check) check.textContent = selected ? "✓" : "";
  }

  function updateBatchPhotoMarkedTile(key, markedKeys = getMarkedBatchPhotoKeys()) {
    const photo = batchPhotoTileByKey.get(key);
    if (!photo) return;

    const marked = markedKeys.has(key);
    photo.classList.toggle("marked", marked);
    photo.classList.toggle("selected", batchSelectedPhotoKeys.has(key));
    const check = photo.querySelector(".batch-select-check");
    if (check) check.textContent = batchSelectedPhotoKeys.has(key) ? "✓" : "";
    const badge = photo.querySelector(".batch-photo-badge");
    if (badge) badge.textContent = marked ? "Done" : `#${getBatchFileIndexByKey(key) + 1}`;
    const wrapper = photo.closest(".batch-photo-wrap");
    if (wrapper) {
      const timerKey = "__quickvintHiddenTimer";
      if (wrapper[timerKey]) {
        clearTimeout(wrapper[timerKey]);
        wrapper[timerKey] = null;
      }
      wrapper.setAttribute("aria-hidden", marked ? "true" : "false");
      if (marked) {
        wrapper.classList.add("is-grouped");
        wrapper[timerKey] = window.setTimeout(() => {
          if (wrapper.classList.contains("is-grouped")) {
            wrapper.hidden = true;
            updateBatchGroupingControls();
          }
          wrapper[timerKey] = null;
        }, 130);
      } else {
        wrapper.hidden = false;
        runAfterBatchRender(() => {
          wrapper.classList.remove("is-grouped");
        });
      }
    }
  }

  async function fetchBatchGenerationCapacity() {
    const response = await sendMessage({ type: "GET_BATCH_CAPACITY" });
    return response?.ok
      ? response.capacity
      : {
          allowed: false,
          available: 0,
          message:
            response?.error ||
            "Could not check how many listings are available.",
        };
  }

  async function refreshBatchGenerationCapacity() {
    if (batchCapacityLoading) return;
    batchCapacityLoading = true;
    batchGenerationCapacity = null;
    updateBatchGroupingControls();

    try {
      batchGenerationCapacity = await fetchBatchGenerationCapacity();
    } catch (err) {
      batchGenerationCapacity = {
        allowed: false,
        available: 0,
        message: "Could not check how many listings are available.",
      };
    } finally {
      batchCapacityLoading = false;
      updateBatchGroupingControls();
    }
  }

  function setBatchControlHidden(control, hidden) {
    if (!control) return;
    const timerKey = "__quickvintHiddenTimer";
    if (control[timerKey]) {
      clearTimeout(control[timerKey]);
      control[timerKey] = null;
    }

    if (hidden) {
      control.classList.add("is-hidden");
      control.setAttribute("aria-hidden", "true");
      control[timerKey] = window.setTimeout(() => {
        if (control.classList.contains("is-hidden")) {
          control.hidden = true;
        }
        control[timerKey] = null;
      }, 160);
      return;
    }

    control.hidden = false;
    control.setAttribute("aria-hidden", "false");
    runAfterBatchRender(() => {
      control.classList.remove("is-hidden");
    });
  }

  function updateBatchGroupingControls() {
    const subtitleEl = document.querySelector(`#${BATCH_MODAL_ID} .batch-subtitle`);
    const selectionCount = document.querySelector(
      `#${BATCH_MODAL_ID} .batch-selection-count`,
    );
    const clearButton = document.querySelector(`#${BATCH_MODAL_ID} .batch-clear-selection`);
    const resetButton = document.querySelector(`#${BATCH_MODAL_ID} .batch-reset-groups`);
    const secondaryActions = document.querySelector(
      `#${BATCH_MODAL_ID} .batch-secondary-actions`,
    );
    const markButton = document.querySelector(`#${BATCH_MODAL_ID} .batch-mark-group`);
    const startButton = document.querySelector(`#${BATCH_MODAL_ID} .batch-start`);
    const actions = document.querySelector(`#${BATCH_MODAL_ID} .batch-actions`);
    const review = document.querySelector(`#${BATCH_MODAL_ID} .batch-review`);
    const organizeTip = document.querySelector(`#${BATCH_MODAL_ID} .organize-tip`);
    const gallery = document.querySelector(`#${BATCH_MODAL_ID} .batch-gallery`);
    const summaryHead = document.querySelector(`#${BATCH_MODAL_ID} .batch-summary-head`);
    const summaryCount = document.querySelector(`#${BATCH_MODAL_ID} .batch-summary-count`);
    const emptyState = document.querySelector(`#${BATCH_MODAL_ID} .batch-empty-state`);
    const capacityNote = document.querySelector(`#${BATCH_MODAL_ID} .batch-capacity-note`);
    const progressDone = document.querySelector(`#${BATCH_MODAL_ID} .organize-progress-done`);
    const progressActive = document.querySelector(`#${BATCH_MODAL_ID} .organize-progress-active`);
    const unsortedBadge = document.querySelector(`#${BATCH_MODAL_ID} .organize-unsorted-badge`);
    const groups = getBatchGroups();
    const markedKeys = getMarkedBatchPhotoKeys();
    const selectedCount = batchSelectedPhotoKeys.size;
    const remainingCount = batchRemoteFiles.length - markedKeys.size;
    const visibleGalleryCount = gallery
      ? gallery.querySelectorAll(".batch-photo-wrap:not([hidden])").length
      : remainingCount;
    const groupedPct = batchRemoteFiles.length
      ? Math.round((markedKeys.size / batchRemoteFiles.length) * 100)
      : 0;
    const remainingPct = batchRemoteFiles.length
      ? Math.max(0, 100 - groupedPct)
      : 0;
    const hasStatusLine = true;
    const hasSecondaryAction = selectedCount > 0;
    const hasPrimaryAction =
      selectedCount > 0 || (groups.length > 0 && remainingCount === 0);

    if (subtitleEl) {
      subtitleEl.textContent = "";
    }
    if (actions) {
      actions.classList.toggle("has-status-line", hasStatusLine);
      actions.classList.toggle("has-secondary-action", hasSecondaryAction);
      actions.classList.toggle("has-primary-action", hasPrimaryAction);
    }
    if (unsortedBadge) {
      unsortedBadge.classList.toggle("done", remainingCount === 0);
      unsortedBadge.hidden = false;
      unsortedBadge.textContent =
        remainingCount === 0 ? "All sorted" : `${remainingCount} unsorted`;
    }
    if (progressDone) {
      progressDone.style.width = `${groupedPct}%`;
    }
    if (progressActive) {
      progressActive.style.left = `${groupedPct}%`;
      progressActive.style.width = `${remainingPct}%`;
    }
    if (selectionCount) {
      selectionCount.textContent = selectedCount
        ? `${selectedCount} selected`
        : !batchRemoteFiles.length
          ? "No photos left in this batch"
          : remainingCount
          ? "Select photos for one item"
          : "Ready to generate";
      setBatchControlHidden(selectionCount, false);
    }
    if (review) {
      review.classList.toggle("is-all-grouped", remainingCount === 0);
    }
    if (organizeTip) {
      organizeTip.classList.toggle("is-hidden", remainingCount === 0);
      organizeTip.setAttribute("aria-hidden", remainingCount === 0 ? "true" : "false");
    }
    if (gallery) {
      gallery.classList.toggle("is-settling", remainingCount === 0 && visibleGalleryCount > 0);
      gallery.classList.toggle("is-empty", remainingCount === 0 && visibleGalleryCount === 0);
    }
    if (summaryHead) {
      summaryHead.classList.toggle("is-hidden", groups.length === 0);
      summaryHead.setAttribute("aria-hidden", groups.length === 0 ? "true" : "false");
    }
    if (summaryCount) {
      summaryCount.textContent = `(${groups.length})`;
    }
    if (emptyState) {
      const showEmptyState = remainingCount === 0 && groups.length > 0;
      emptyState.classList.toggle(
        "is-reserved",
        groups.length > 0 && remainingCount <= 1,
      );
      emptyState.classList.toggle("is-hidden", !showEmptyState);
      emptyState.setAttribute("aria-hidden", showEmptyState ? "false" : "true");
    }
    if (capacityNote) {
      capacityNote.classList.remove("warning", "error");
      if (!groups.length) {
        capacityNote.classList.add("is-hidden");
        capacityNote.setAttribute("aria-hidden", "true");
      } else if (batchCapacityLoading) {
        capacityNote.classList.add("is-hidden");
        capacityNote.setAttribute("aria-hidden", "true");
      } else if (!batchGenerationCapacity) {
        capacityNote.classList.add("is-hidden");
        capacityNote.setAttribute("aria-hidden", "true");
      } else {
        const available = Math.max(
          0,
          Math.floor(Number(batchGenerationCapacity.available || 0)),
        );
        if (!batchGenerationCapacity.allowed || available <= 0) {
          capacityNote.classList.remove("is-hidden");
          capacityNote.classList.add("error");
          capacityNote.setAttribute("aria-hidden", "false");
          capacityNote.textContent =
            batchGenerationCapacity.message ||
            "You cannot generate more listings right now.";
        } else if (groups.length > 0 && available < groups.length) {
          capacityNote.classList.remove("is-hidden");
          capacityNote.classList.add("warning");
          capacityNote.setAttribute("aria-hidden", "false");
          capacityNote.textContent = `Your balance allows ${available} of ${groups.length} listings. The first ${available} will be generated.`;
        } else {
          capacityNote.classList.add("is-hidden");
          capacityNote.setAttribute("aria-hidden", "true");
        }
      }
    }
    if (clearButton) {
      setBatchControlHidden(clearButton, selectedCount === 0);
    }
    if (resetButton) {
      setBatchControlHidden(resetButton, groups.length === 0);
    }
    if (secondaryActions) {
      setBatchControlHidden(
        secondaryActions,
        selectedCount === 0,
      );
    }
    if (markButton) {
      markButton.textContent = `Group ${selectedCount} photo${selectedCount === 1 ? "" : "s"}`;
      markButton.disabled = selectedCount === 0;
      setBatchControlHidden(markButton, selectedCount === 0);
    }
    if (startButton) {
      const available = batchGenerationCapacity
        ? Math.max(0, Math.floor(Number(batchGenerationCapacity.available || 0)))
        : null;
      const effectiveCount =
        available === null ? groups.length : Math.min(groups.length, available);
      startButton.textContent = batchCapacityLoading
        ? "Checking availability..."
        : available !== null && groups.length > 0 && available < groups.length && available > 0
          ? `Generate first ${available} of ${groups.length}`
          : `Generate ${effectiveCount} listing${effectiveCount === 1 ? "" : "s"}`;
      startButton.disabled =
        batchCapacityLoading ||
        groups.length === 0 ||
        remainingCount > 0 ||
        (available !== null && effectiveCount <= 0);
      setBatchControlHidden(
        startButton,
        selectedCount > 0 || groups.length === 0 || remainingCount > 0,
      );
    }
  }

  function markSelectedPhotosAsGroup() {
    const markedKeys = getMarkedBatchPhotoKeys();
    const keys = Array.from(batchSelectedPhotoKeys)
      .filter((key) => !markedKeys.has(key))
      .sort((a, b) => getBatchFileIndexByKey(a) - getBatchFileIndexByKey(b));
    if (!keys.length) return;

    const beforePositions = measureBatchGalleryPositions();
    steadyBatchReviewLayout();
    const group = { id: `group-${batchNextGroupId++}`, keys };
    batchMarkedGroups.push(group);
    batchSelectedPhotoKeys.clear();
    trackGrowthEvent("batch_group_created", {
      groupCount: batchMarkedGroups.length,
      photoCount: keys.length,
      totalPhotoCount: batchRemoteFiles.length,
    });
    const nextMarkedKeys = getMarkedBatchPhotoKeys();
    keys.forEach((key) => {
      updateBatchPhotoSelectionTile(key);
      updateBatchPhotoMarkedTile(key, nextMarkedKeys);
    });
    renderBatchGroupRow(group);
    updateBatchGroupingControls();
    window.setTimeout(() => {
      animateBatchGalleryFromPositions(beforePositions);
    }, 145);
  }

  function renderBatchGroupRow(group) {
    const groupsEl = document.querySelector(`#${BATCH_MODAL_ID} .batch-groups`);
    if (!groupsEl || !group?.id) return;

    const groupIndex = batchMarkedGroups.findIndex((item) => item.id === group.id);
    if (groupIndex < 0) return;

    let row = batchGroupRowById.get(group.id);
    const isNewRow = !row;
    if (!row) {
      row = document.createElement("div");
      row.className = "batch-item-card is-entering";
      batchGroupRowById.set(group.id, row);
      groupsEl.appendChild(row);
    }

    const photos = getBatchFilesForKeys(group.keys);
    row.innerHTML = `
      <div class="batch-item-card-head">
        <div>
          <div class="batch-item-title">Item #${groupIndex + 1}</div>
          <span class="batch-item-count">${photos.length} photo${photos.length === 1 ? "" : "s"}</span>
        </div>
        <button type="button" class="batch-ungroup" aria-label="Ungroup item ${groupIndex + 1}" title="Ungroup">↶</button>
      </div>
      <div class="batch-item-photos"></div>
    `;

    const chips = row.querySelector(".batch-item-photos");
    photos.slice(0, 5).forEach(({ file, index }) => {
      const chip = document.createElement("img");
      chip.className = "batch-thumb-chip";
      chip.loading = "eager";
      chip.decoding = "async";
      chip.src = file.url;
      chip.alt = `Listing ${groupIndex + 1} photo ${index + 1}`;
      chips.appendChild(chip);
    });
    if (photos.length > 5) {
      const more = document.createElement("span");
      more.className = "batch-thumb-more";
      more.textContent = `+${photos.length - 5}`;
      chips.appendChild(more);
    }

    row.querySelector(".batch-ungroup")?.addEventListener("click", () => {
      ungroupBatchGroup(group.id);
    });

    if (isNewRow) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          row.classList.remove("is-entering");
        });
      });
    }
  }

  function rerenderBatchGroupRows() {
    batchMarkedGroups.forEach(renderBatchGroupRow);
  }

  function ungroupBatchGroup(groupId) {
    const groupIndex = batchMarkedGroups.findIndex((group) => group.id === groupId);
    if (groupIndex < 0) return;

    steadyBatchReviewLayout();
    const [group] = batchMarkedGroups.splice(groupIndex, 1);
    trackGrowthEvent("batch_group_removed", {
      groupCount: batchMarkedGroups.length,
      photoCount: group.keys.length,
      totalPhotoCount: batchRemoteFiles.length,
    });
    const row = batchGroupRowById.get(group.id);
    if (row) {
      row.classList.add("is-leaving");
      window.setTimeout(() => row.remove(), 190);
    }
    batchGroupRowById.delete(group.id);
    const markedKeys = getMarkedBatchPhotoKeys();
    group.keys.forEach((key) => updateBatchPhotoMarkedTile(key, markedKeys));
    rerenderBatchGroupRows();
    updateBatchGroupingControls();
  }

  function getBatchFileIndexByKey(key) {
    return batchRemoteFiles.findIndex((file) => getPhoneUploadFileKey(file) === key);
  }

  function getBatchFilesForKeys(keys) {
    return keys
      .map((key) => {
        const index = getBatchFileIndexByKey(key);
        return index >= 0 ? { file: batchRemoteFiles[index], index } : null;
      })
      .filter(Boolean)
      .sort((a, b) => a.index - b.index);
  }

  function getBatchGroupsWithKeys() {
    return batchMarkedGroups
      .map((group) =>
        group.keys
          .slice()
          .sort((a, b) => getBatchFileIndexByKey(a) - getBatchFileIndexByKey(b))
          .map((key) => {
            const index = getBatchFileIndexByKey(key);
            const file = index >= 0 ? batchRemoteFiles[index] : null;
            return { file, key, index };
          })
          .filter(({ file }) => file),
      )
      .filter((group) => group.length > 0);
  }

  function getBatchGroups() {
    if (!batchRemoteFiles.length) return [];
    return getBatchGroupsWithKeys().map((group) =>
      group.map(({ file }) => file),
    );
  }

  async function showBatchCapacityBlocked(capacity = {}) {
    const pricingUrl = await getPricingUrl();
    const limitMessage = buildLimitMessage({
      code: capacity.reason,
      currentTier: capacity.tier,
      nextTier: capacity.nextTier,
      error: capacity.message,
    });

    if (limitMessage.paywall && pricingUrl) {
      showLimitPaywall({
        title: limitMessage.title || "Usage limit reached",
        message: limitMessage.message,
        options: limitMessage.options,
        trustNote: limitMessage.trustNote,
        actionText: limitMessage.actionText,
        actionUrl: pricingUrl,
        secondaryActionText: limitMessage.secondaryActionText,
        secondaryActionUrl: pricingUrl,
      });
      return;
    }

    showToast(
      limitMessage.message ||
        capacity.message ||
        "You do not have enough listings available right now.",
      "error",
      pricingUrl && limitMessage.actionText
        ? {
            text: limitMessage.actionText,
            url: pricingUrl,
            secondaryText: limitMessage.secondaryActionText,
            secondaryUrl: limitMessage.secondaryActionUrl,
          }
        : null,
    );
  }

  function normalizeBatchRemoteFiles(files) {
    return files
      .slice()
      .sort((a, b) => {
        const orderA = Number.isFinite(Number(a.order)) ? Number(a.order) : Number.MAX_SAFE_INTEGER;
        const orderB = Number.isFinite(Number(b.order)) ? Number(b.order) : Number.MAX_SAFE_INTEGER;
        return orderA - orderB || String(a.name || "").localeCompare(String(b.name || ""));
      });
  }

  function startBatchPolling(sessionId) {
    if (batchPollInterval) {
      clearInterval(batchPollInterval);
      batchPollInterval = null;
    }
    scheduleBatchAutoClose(sessionId);

    const poll = async () => {
      if (isBatchPollInFlight || batchUploadSessionId !== sessionId) return;

      try {
        isBatchPollInFlight = true;
        const response = await sendMessage({
          type: "PROXY_FETCH",
          url: `${PHONE_UPLOAD_API}?sessionId=${sessionId}&t=${Date.now()}`,
          options: { method: "GET" },
        });
        if (!response?.ok) return;

        const data =
          typeof response.data === "string"
            ? JSON.parse(response.data)
            : response.data;
        const files = Array.isArray(data.files)
          ? normalizeBatchRemoteFiles(data.files)
          : [];
        const wasComplete = batchIsComplete;
        batchIsComplete = data.complete === true;
        let added = false;

        files.forEach((file) => {
          const key = getPhoneUploadFileKey(file);
          if (!key || batchRemoteFileKeys.has(key)) return;
          batchRemoteFileKeys.add(key);
          batchRemoteFiles.push(file);
          added = true;
        });

        if (batchIsComplete) {
          batchRemoteFiles = files;
          batchRemoteFileKeys = new Set(files.map(getPhoneUploadFileKey).filter(Boolean));
        } else if (added) {
          batchRemoteFiles = normalizeBatchRemoteFiles(batchRemoteFiles);
        }

        if (batchRemoteFiles.length !== batchLastFileCount) {
          batchLastFileCount = batchRemoteFiles.length;
          batchLastFileChangeAt = Date.now();
          if (!batchReceivedEventSent) {
            batchReceivedEventSent = true;
            trackGrowthEvent("phone_upload_received", {
              mode: "batch",
              receivedCount: batchRemoteFiles.length,
              complete: false,
            });
          }
        }

        if (batchIsComplete && !batchCompleteReceivedEventSent && batchRemoteFiles.length > 0) {
          batchCompleteReceivedEventSent = true;
          trackGrowthEvent("phone_upload_received", {
            mode: "batch",
            receivedCount: batchRemoteFiles.length,
            complete: true,
          });
        }

        preloadBatchImages(files);

        const openedGrouping = maybeAutoOpenBatchGrouping();

        if (openedGrouping) {
          scheduleBatchAutoClose(sessionId);
        } else if (added || batchIsComplete !== wasComplete) {
          scheduleBatchAutoClose(sessionId);
          refreshBatchWaitingState();
        } else {
          refreshBatchWaitingState();
        }

        if (batchIsComplete && batchPollInterval) {
          clearInterval(batchPollInterval);
          batchPollInterval = null;
        }
      } catch (err) {
        console.error("Batch polling error:", err);
      } finally {
        isBatchPollInFlight = false;
      }
    };

    poll();
    batchPollInterval = setInterval(poll, BATCH_POLL_INTERVAL_MS);
  }

  async function startBatchGeneration() {
    const modal = document.getElementById(BATCH_MODAL_ID);
    if (!modal || !batchUploadSessionId) return;
    const startButton = modal.querySelector(".batch-start");

    if (!batchIsComplete) {
      showToast("Phone upload is still running.", "info");
      return;
    }

    let groupsWithKeys = getBatchGroupsWithKeys();
    let groups = groupsWithKeys.map((group) => group.map(({ file }) => file));
    if (!groups.length) {
      trackGrowthEvent("batch_start_blocked", { reason: "no_groups" });
      showToast("Add at least one photo before starting batch generation.", "error");
      return;
    }

    const remainingCount = batchRemoteFiles.length - getMarkedBatchPhotoKeys().size;
    if (remainingCount > 0) {
      trackGrowthEvent("batch_start_blocked", {
        reason: "ungrouped_photos",
        remainingCount,
      });
      showToast("Group every photo before generating listings.", "error");
      return;
    }

    if (getVisibleUploadedPhotoCount() > 0) {
      trackGrowthEvent("batch_start_blocked", { reason: "listing_not_empty" });
      showToast("Start batch generation from an empty Vinted listing tab.", "error");
      return;
    }

    const restoreStartButton = setActionButtonLoading(startButton, "Starting...");

    let capacity;
    try {
      capacity = await fetchBatchGenerationCapacity();
    } catch (err) {
      capacity = {
        allowed: false,
        available: 0,
        message: "Could not check how many listings are available.",
      };
    }
    const available = Math.max(0, Math.floor(Number(capacity.available || 0)));
    if (!capacity.allowed || available <= 0) {
      restoreStartButton();
      trackGrowthEvent("generate_limit_hit", {
        mode: "batch",
        code: capacity.reason || null,
        tier: capacity.tier || null,
      });
      await showBatchCapacityBlocked(capacity);
      return;
    }

    if (available < groups.length) {
      const confirmed = window.confirm(
        `You have ${available} of ${groups.length} listings available. Generate the first ${available}?`,
      );
      if (!confirmed) {
        restoreStartButton();
        return;
      }

      groupsWithKeys = groupsWithKeys.slice(0, available);
      groups = groups.slice(0, available);
      showToast(
        `Generating first ${available} listing${available === 1 ? "" : "s"}.`,
        "info",
      );
    }

    if (batchPollInterval) {
      clearInterval(batchPollInterval);
      batchPollInterval = null;
    }
    if (batchAutoCloseTimer) {
      clearTimeout(batchAutoCloseTimer);
      batchAutoCloseTimer = null;
    }

    batchProgressGroups = groupsWithKeys;
    renderBatchProgress({ status: "queued", current: 0, total: groups.length });
    restoreStartButton();
    trackGrowthEvent("batch_start", {
      groupCount: groups.length,
      available,
    });

    const response = await sendMessage({
      type: "START_BATCH_GENERATION",
      sessionId: batchUploadSessionId,
      groups,
    });

    if (!response?.ok) {
      renderBatchProgress({
        status: "failed",
        current: 0,
        total: groups.length,
        message: response?.error || "Could not start batch generation.",
      });
    } else if (response.limited) {
      const startedCount = Math.max(
        0,
        Math.floor(Number(response.startedCount || 0)),
      );
      if (startedCount > 0 && startedCount < groups.length) {
        batchProgressGroups = groupsWithKeys.slice(0, startedCount);
        renderBatchProgress({
          status: "queued",
          current: 0,
          total: startedCount,
          message: `Generating first ${startedCount} listing${
            startedCount === 1 ? "" : "s"
          }.`,
        });
      }
    }
  }

  function isBatchProgressActive(status) {
    return !["done", "failed"].includes(status);
  }

  function getBatchProgressCopy({ status, current = 0, total = 0, message = "", delayMs = 0 }) {
    if (message) return message;
    const itemCopy = current > 0 ? `Listing ${current} of ${total}` : `${total} listing${total === 1 ? "" : "s"}`;
    switch (status) {
      case "done":
        return `${total} listing${total === 1 ? "" : "s"} ready`;
      case "failed":
        return "Batch generation stopped.";
      case "opening_tab":
        return `${itemCopy}: opening tab...`;
      case "tab_ready":
        return `${itemCopy}: adding photos...`;
      case "generating":
        return `${itemCopy}: writing details...`;
      case "item_done":
        return `${itemCopy}: ready.`;
      case "waiting":
        return delayMs > 0
          ? "Brief pause..."
          : "Preparing next listing...";
      case "queued":
      default:
        return `Preparing ${total} listing${total === 1 ? "" : "s"}...`;
    }
  }

  function getBatchProgressPercent(status, current, total) {
    if (!total) return 0;
    if (status === "done") return 100;
    if (status === "failed") {
      return Math.max(0, Math.min(100, Math.round(((current || 0) / total) * 100)));
    }

    const currentIndex = Math.max(0, current - 1);
    const phaseWeight =
      status === "opening_tab"
        ? 0.12
        : status === "tab_ready"
          ? 0.28
          : status === "generating"
            ? 0.64
            : status === "item_done" || status === "waiting"
              ? 1
              : 0;
    return Math.max(0, Math.min(99, Math.round(((currentIndex + phaseWeight) / total) * 100)));
  }

  function getBatchItemState(status, itemNumber, current) {
    if (status === "done") return "done";
    if (status === "failed") {
      if (!current) return "pending";
      if (itemNumber < current) return "done";
      if (itemNumber === current) return "failed";
      return "pending";
    }
    if (status === "item_done" || status === "waiting") {
      if (itemNumber <= current) return "done";
      return "pending";
    }
    if (itemNumber < current) return "done";
    if (itemNumber === current && current > 0) return "active";
    return "pending";
  }

  function getBatchItemStateLabel(state, status) {
    if (state === "done") return "Ready";
    if (state === "failed") return "Stopped";
    if (state === "active") {
      if (status === "opening_tab") return "Opening tab";
      if (status === "tab_ready") return "Adding photos";
      return "Writing";
    }
    return "Queued";
  }

  function getBatchReadyCount(status, current) {
    if (status === "done") return current;
    if (status === "item_done" || status === "waiting") return current;
    if (status === "failed") return Math.max(0, current - 1);
    return Math.max(0, current - 1);
  }

  function renderBatchProgress({ status, current = 0, total = 0, message = "", delayMs = 0 }) {
    const body = getBatchBody();
    if (!body) return;

    const previousStatus = batchProgressStatus;
    batchProgressStatus = status;
    if (previousStatus !== status && (status === "done" || status === "failed")) {
      trackGrowthEvent(status === "done" ? "batch_done" : "batch_failed", {
        current,
        total,
        message: message || null,
      });
    }
    const modal = document.getElementById(BATCH_MODAL_ID);
    modal?.classList.remove("organizing");
    modal?.classList.add("generating");
    modal?.querySelector(".organize-status-row")?.remove();

    const closeButton = modal?.querySelector(".batch-close");
    if (closeButton) {
      closeButton.setAttribute(
        "aria-label",
        isBatchProgressActive(status)
          ? "Close batch generation progress"
          : "Close",
      );
    }

    const titleEl = document.querySelector(`#${BATCH_MODAL_ID} .batch-title`);
    const subtitleEl = document.querySelector(`#${BATCH_MODAL_ID} .batch-subtitle`);
    if (titleEl) titleEl.textContent = "Generating listings";
    if (subtitleEl) {
      subtitleEl.hidden = false;
      subtitleEl.textContent = `${getBatchReadyCount(status, current)}/${total} ready`;
    }

    const groups = batchProgressGroups.length
      ? batchProgressGroups
      : getBatchGroupsWithKeys();
    const progressPercent = getBatchProgressPercent(status, current, total);
    const statusText = getBatchProgressCopy({ status, current, total, message, delayMs });
    const running = isBatchProgressActive(status);

    body.innerHTML = `
      <div class="batch-progress-stage ${running ? "is-live" : ""}">
        <div class="batch-ambient" aria-hidden="true"></div>
        <div class="batch-progress-head">
          <div>
            <div class="batch-status ${status === "done" ? "done" : status === "failed" ? "warning" : ""}">${statusText}</div>
            <div class="batch-progress-title">${running ? "Keep this tab open" : status === "done" ? "Review tabs before publishing" : "Generation stopped"}</div>
          </div>
          <div class="batch-progress-count">${progressPercent}%</div>
        </div>
        <div class="batch-live-progress" aria-hidden="true">
          <span style="width: ${progressPercent}%"></span>
        </div>
        <div class="batch-progress-list" aria-live="polite"></div>
        ${status === "done" ? "" : `<div class="batch-progress-note">${status === "failed" ? "No more tabs will open." : "Tabs open one at a time."}</div>`}
      </div>
      <div class="batch-actions">
        <button type="button" class="batch-dismiss" ${running ? "disabled" : ""}>${running ? "Working..." : "Done"}</button>
      </div>
    `;

    const list = body.querySelector(".batch-progress-list");
    groups.forEach((group, index) => {
      const itemNumber = index + 1;
      const state = getBatchItemState(status, itemNumber, current);
      const card = document.createElement("div");
      card.className = `batch-progress-card ${state}`;

      const thumbs = document.createElement("div");
      thumbs.className = "batch-progress-thumbs";
      group.slice(0, 3).forEach(({ file }, photoIndex) => {
        const img = document.createElement("img");
        img.loading = "eager";
        img.decoding = "async";
        img.src = file.url;
        img.alt = `Listing ${itemNumber} preview ${photoIndex + 1}`;
        thumbs.appendChild(img);
      });
      if (group.length > 3) {
        const more = document.createElement("span");
        more.textContent = `+${group.length - 3}`;
        thumbs.appendChild(more);
      }

      const meta = document.createElement("div");
      meta.className = "batch-progress-meta";
      meta.innerHTML = `
        <strong>Listing ${itemNumber}</strong>
        <span>${group.length} photo${group.length === 1 ? "" : "s"}</span>
      `;

      const badge = document.createElement("div");
      badge.className = "batch-progress-badge";
      badge.textContent = getBatchItemStateLabel(state, status);

      card.appendChild(thumbs);
      card.appendChild(meta);
      card.appendChild(badge);
      list?.appendChild(card);
    });

    body.querySelector(".batch-dismiss")?.addEventListener("click", () => {
      closeBatchModal({ cleanup: false });
    });
  }

  function handleBatchProgress(message) {
    if (!document.getElementById(BATCH_MODAL_ID)) return;
    renderBatchProgress(message);
    if (message.status === "failed") {
      showToast(message.message || "Batch generation stopped.", "error");
    }
  }

  function waitForUploadedPhotoCount(targetCount, timeoutMs = BATCH_UPLOAD_WAIT_TIMEOUT_MS) {
    return new Promise((resolve, reject) => {
      const startedAt = Date.now();
      const timer = setInterval(() => {
        if (
          getVisibleUploadedPhotoCount() >= targetCount &&
          getUploadedImageUrls().length >= targetCount
        ) {
          clearInterval(timer);
          resolve();
          return;
        }
        if (Date.now() - startedAt > timeoutMs) {
          clearInterval(timer);
          reject(new Error("Photos were added, but Vinted did not finish showing them in time."));
        }
      }, 500);
    });
  }

  function waitForGeneratedListingFields(expectedTitle, expectedDescription, timeoutMs = 2500) {
    const normalize = (value) => String(value || "").trim();
    const expectedTitleText = normalize(expectedTitle);
    const expectedDescriptionText = normalize(expectedDescription);

    return new Promise((resolve, reject) => {
      const startedAt = Date.now();
      const check = () => {
        const titleInput = document.querySelector(SELECTORS.title);
        const descInput = document.querySelector(SELECTORS.description);
        const titleMatches =
          !expectedTitleText || normalize(titleInput?.value) === expectedTitleText;
        const descriptionMatches =
          !expectedDescriptionText ||
          normalize(descInput?.value).includes(expectedDescriptionText);

        if (titleMatches && descriptionMatches) {
          resolve();
          return;
        }

        if (Date.now() - startedAt > timeoutMs) {
          reject(new Error("Generated listing details were not visible in time."));
          return;
        }

        requestAnimationFrame(check);
      };

      requestAnimationFrame(check);
    });
  }

  function showBatchTabStatus(message, state = "loading") {
    let status = document.getElementById("quickvint-batch-tab-status");
    if (!status) {
      status = document.createElement("div");
      status.id = "quickvint-batch-tab-status";
    }

    const titleInput = document.querySelector(SELECTORS.title);
    const descriptionInput = document.querySelector(SELECTORS.description);
    const detailsCard =
      titleInput?.closest(".web_ui__Card__card") ||
      descriptionInput?.closest(".web_ui__Card__card");
    const fallbackAnchor =
      titleInput?.closest("label") ||
      titleInput ||
      descriptionInput?.closest("label") ||
      descriptionInput;
    const anchor = detailsCard || fallbackAnchor;

    if (anchor?.parentElement) {
      if (status.parentElement !== anchor.parentElement || status.nextSibling !== anchor) {
        anchor.parentElement.insertBefore(status, anchor);
      }
    } else if (!status.parentElement) {
      document.body.appendChild(status);
    }

    if (batchTabStatusTimer) {
      clearTimeout(batchTabStatusTimer);
      batchTabStatusTimer = null;
    }

    const iconText = state === "success" ? "✓" : state === "error" ? "!" : "";
    status.className = state;
    status.innerHTML = `
      <span class="batch-tab-status-icon" aria-hidden="true">${iconText}</span>
      <span>${escapeHtml(message)}</span>
    `;

    requestAnimationFrame(() => {
      status.classList.add("visible");
    });
  }

  function hideBatchTabStatus(delayMs = 0) {
    if (batchTabStatusTimer) {
      clearTimeout(batchTabStatusTimer);
      batchTabStatusTimer = null;
    }

    batchTabStatusTimer = setTimeout(() => {
      const status = document.getElementById("quickvint-batch-tab-status");
      if (!status) return;
      status.classList.remove("visible");
      setTimeout(() => status.remove(), 180);
    }, delayMs);
  }

  async function runBatchItem(message) {
    const remoteFiles = Array.isArray(message.files) ? message.files : [];
    const itemIndex = Math.max(1, Number(message.itemIndex || 1));
    const totalItems = Math.max(itemIndex, Number(message.totalItems || itemIndex));
    const listingPrefix = totalItems > 1 ? `Listing ${itemIndex} of ${totalItems}` : "Listing";
    isBusy = true;
    updateButtonUI();

    if (!remoteFiles.length) {
      showBatchTabStatus(`${listingPrefix}: no photos were provided.`, "error");
      hideBatchTabStatus(9000);
      isBusy = false;
      updateButtonUI();
      throw new Error("Batch item has no photos.");
    }
    if (getVisibleUploadedPhotoCount() > 0) {
      showBatchTabStatus(`${listingPrefix}: this tab already has photos.`, "error");
      hideBatchTabStatus(9000);
      isBusy = false;
      updateButtonUI();
      throw new Error("This Vinted listing tab already has photos.");
    }

    const initialPhotoCount = getVisibleUploadedPhotoCount();
    let downloads = [];

    try {
      showBatchTabStatus(`${listingPrefix}: preparing photos...`);
      downloads = await Promise.all(remoteFiles.map(downloadPhoneUploadFile));
      const filesToInject = downloads
        .filter((result) => result.file)
        .map((result) => result.file);

      if (filesToInject.length !== remoteFiles.length) {
        throw new Error("Could not download every photo for this item.");
      }

      showBatchTabStatus(`${listingPrefix}: adding photos...`);
      if (!injectFilesIntoVinted(filesToInject)) {
        throw new Error("Could not add photos to the Vinted listing.");
      }

      showBatchTabStatus(`${listingPrefix}: waiting for Vinted to show photos...`);
      await waitForUploadedPhotoCount(initialPhotoCount + filesToInject.length);

      showBatchTabStatus(`${listingPrefix}: writing title and description...`);
      const generatedListing = await generateCurrentListing({
        descriptionApplyChoice: "replace",
        manageButtonState: false,
        showMeasurementAdvice: false,
        throwOnLimit: true,
      });
      showBatchTabStatus(`${listingPrefix}: checking listing details...`);
      await waitForGeneratedListingFields(
        generatedListing?.title,
        generatedListing?.description,
      );

      showBatchTabStatus(`${listingPrefix}: ready to review.`, "success");
      hideBatchTabStatus(3500);
      return { ok: true };
    } catch (err) {
      showBatchTabStatus(
        err.message || `${listingPrefix}: generation failed.`,
        "error",
      );
      hideBatchTabStatus(9000);
      throw err;
    } finally {
      downloads.forEach((result) => {
        if (result.previewUrl) URL.revokeObjectURL(result.previewUrl);
      });
      isBusy = false;
      updateButtonUI();
    }
  }

  async function generateCurrentListing({
    descriptionApplyChoice = "replace",
    manageButtonState = true,
    showMeasurementAdvice = true,
    throwOnLimit = false,
    skipEmojiRetryPrompt = false,
    emojiRetry = false,
    overrideUseEmojis = null,
  } = {}) {
    const imageUrls = getUploadedImageUrls();
    const mode = manageButtonState ? "manual" : "batch";

    if (!imageUrls.length) {
      trackGrowthEvent("generate_missing_photo", { mode });
      if (manageButtonState) {
        showToast("Please upload at least one image.", "error");
      }
      throw new Error("Please upload at least one image.");
    }

    if (manageButtonState) {
      isBusy = true;
    }
    removeDescriptionApplyPrompt();
    updateButtonUI();

    try {
      const {
        selectedLanguage = "en",
        selectedTitleLanguage,
        selectedDescriptionLanguage,
        tone = "standard",
        useEmojis = true,
        useBulletPoints = true,
        userProfile,
      } = await chrome.storage.local.get([
        "selectedLanguage",
        "selectedTitleLanguage",
        "selectedDescriptionLanguage",
        "tone",
        "useEmojis",
        "useBulletPoints",
        "userProfile",
      ]);
      const emojiAccess = canUseEmojiSetting(userProfile);
      const effectiveUseEmojis =
        emojiAccess &&
        (overrideUseEmojis === null
          ? useEmojis !== false
          : overrideUseEmojis === true);
      const titleLanguageCode = normalizeLanguageCode(
        selectedTitleLanguage || selectedLanguage,
      );
      const descriptionLanguageCode = normalizeLanguageCode(
        selectedDescriptionLanguage || selectedLanguage,
      );
      const legacyLanguageCode = descriptionLanguageCode || titleLanguageCode;
      trackGrowthEvent("generate_request", {
        mode,
        photoCount: imageUrls.length,
        titleLanguageCode,
        descriptionLanguageCode,
        tone,
        useEmojis: effectiveUseEmojis,
        useBulletPoints: Boolean(useBulletPoints),
        emojiRetry: Boolean(emojiRetry),
      });
      const { access_token } = await sendMessage({ type: "GET_ACCESS_TOKEN" });

      if (!access_token) {
        throw new Error(
          "Your session has expired. Please sign in again via the extension.",
        );
      }

      // Compress images before sending to API to reduce token usage
      const compressedImages = await compressImages(imageUrls);

      const response = await fetch(`${API_BASE}/api/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${access_token}`,
          "X-Autolister-Extension-Version":
            chrome.runtime.getManifest().version,
        },
        body: JSON.stringify({
          imageUrls: compressedImages,
          languageCode: legacyLanguageCode,
          titleLanguageCode,
          descriptionLanguageCode,
          tone,
          useEmojis: effectiveUseEmojis,
          emojiRetry: Boolean(emojiRetry),
          useBulletPoints,
        }),
      });

      if (response.status === 401) {
        trackGrowthEvent("generate_error", { mode, status: 401 });
        isAuthenticated = false;
        showToast("Session expired. Please sign in again.", "error");
        if (manageButtonState) {
          isBusy = false;
        }
        updateButtonUI();
        throw new Error("Session expired. Please sign in again.");
      }
      if (response.status === 429 || response.status === 403) {
        const errData = await response.json();
        if (response.status === 403 && errData.code !== "account_paused") {
          trackGrowthEvent("generate_error", {
            mode,
            status: response.status,
            code: errData.code || null,
          });
          throw new Error(errData.error || "Request blocked.");
        }
        trackGrowthEvent("generate_limit_hit", {
          mode,
          status: response.status,
          code: errData.code || null,
          currentTier: errData.currentTier || null,
          nextTier: errData.nextTier || null,
        });
        const limitMessage = buildLimitMessage(errData);
        const pricingUrl = limitMessage.actionText ? await getPricingUrl() : null;
        if (limitMessage.paywall && pricingUrl) {
          showLimitPaywall({
            title: limitMessage.title || "Usage limit reached",
            message: limitMessage.message,
            options: limitMessage.options,
            trustNote: limitMessage.trustNote,
            actionText: limitMessage.actionText,
            actionUrl: pricingUrl,
            secondaryActionText: limitMessage.secondaryActionText,
            secondaryActionUrl: pricingUrl,
          });
        } else {
          const isAccountPaused = errData.code === "account_paused";
          showToast(
            limitMessage.message,
            "error",
            pricingUrl
              ? {
                  text: limitMessage.actionText,
                  onClick: isAccountPaused
                    ? () => showAccountPausedPaywall(pricingUrl)
                    : null,
                  url: isAccountPaused ? null : pricingUrl,
                  secondaryText: limitMessage.secondaryActionText,
                  secondaryUrl: limitMessage.secondaryActionUrl,
                }
              : null,
            !isAccountPaused,
          );
        }
        if (errData.code === "account_paused") {
          trackGrowthEvent("account_paused_shown", {
            mode,
            status: response.status,
            code: errData.code,
          });
        }
        if (manageButtonState) {
          isBusy = false;
        }
        updateButtonUI();
        if (throwOnLimit) {
          throw new Error(limitMessage.message || "Usage limit reached.");
        }
        return { ok: false, limited: true };
      }
      if (!response.ok) {
        const { error } = await response.json().catch(() => ({}));
        trackGrowthEvent("generate_error", {
          mode,
          status: response.status,
          message: error || null,
        });
        throw new Error(error || `HTTP ${response.status}`);
      }

      const { title, description, measurementAdvice } = await response.json();
      const titleInput = document.querySelector(SELECTORS.title);
      const descInput = document.querySelector(SELECTORS.description);

      if (titleInput) {
        titleInput.value = title;
        titleInput.dispatchEvent(new Event("input", { bubbles: true }));
      }
      if (descInput) {
        applyGeneratedDescription(descInput, description, descriptionApplyChoice);
      }

      if (manageButtonState) {
        setButtonSuccessState();
      }

      if (showMeasurementAdvice && measurementAdvice && measurementAdvice.trim()) {
        await maybeShowMeasurementAdvice(measurementAdvice);
      }

      trackGrowthEvent("generate_success", {
        mode,
        photoCount: imageUrls.length,
        titleLanguageCode,
        descriptionLanguageCode,
        useEmojis: effectiveUseEmojis,
        emojiRetry: Boolean(emojiRetry),
        hasMeasurementAdvice: Boolean(measurementAdvice && measurementAdvice.trim()),
      });

      if (
        manageButtonState &&
        effectiveUseEmojis &&
        !skipEmojiRetryPrompt &&
        isFreeProfile(userProfile) &&
        descInput
      ) {
        await maybeShowEmojiRetryPrompt(descInput);
      }

      return { ok: true, title, description, measurementAdvice };
    } catch (err) {
      console.error("AutoLister AI Error:", err);
      trackGrowthEvent("generate_error", {
        mode,
        message: err.message || "unknown",
      });
      if (manageButtonState) {
        showToast(err.message || "An unexpected error occurred.", "error");
        isBusy = false;
      }
      updateButtonUI();
      throw err;
    }
  }

  async function onGenerateClick() {
    if (!isAuthenticated) {
      trackGrowthEvent("generate_blocked", { reason: "signed_out" });
      chrome.runtime.sendMessage({ type: "OPEN_POPUP" });
      return;
    }

    const descInputBeforeGenerate = document.querySelector(SELECTORS.description);
    const descriptionApplyChoice = descInputBeforeGenerate
      ? await getDescriptionApplyChoice(descInputBeforeGenerate)
      : "replace";

    if (descriptionApplyChoice === "cancel") {
      trackGrowthEvent("generate_cancelled", { reason: "description_apply_choice" });
      return;
    }

    try {
      trackGrowthEvent("generate_click", {
        mode: "manual",
        descriptionApplyChoice,
      });
      await generateCurrentListing({
        descriptionApplyChoice,
        manageButtonState: true,
        showMeasurementAdvice: true,
      });
    } catch (err) {
      // generateCurrentListing already renders the user-facing error for manual clicks.
    }
  }

  // --- INJECTION & OBSERVATION LOGIC ---

  function injectButton() {
    const existingBtn = document.getElementById(BTN_ID);
    if (existingBtn) {
      generateBtn = existingBtn;
      phoneBtn = document.getElementById(PHONE_BTN_ID);
      batchBtn = document.getElementById(BATCH_BTN_ID);
      emojiToggleBtn = document.getElementById(EMOJI_TOGGLE_ID);
      signInBtn = document.getElementById(SIGN_IN_BTN_ID);
      injectFieldLanguageControls();
      syncEmojiToggleState();
      updateButtonUI();
      return true;
    }

    const titleEl = document.querySelector(SELECTORS.title);
    if (!titleEl) return false;

    const container = titleEl.closest("div");
    if (container && container.parentNode) {
      const btnContainer = document.createElement("div");
      // Container for tool buttons and the sign-in component, spaced below the title.
      btnContainer.style.marginTop = "20px";

      // Wrapper for tools (Generate + Phone)
      const toolsWrapper = document.createElement("div");
      toolsWrapper.style.display = "flex";
      toolsWrapper.style.alignItems = "center";

      generateBtn = createButton();
      phoneBtn = createPhoneButton();
      batchBtn = createBatchButton();
      emojiToggleBtn = createEmojiToggleButton();
      signInBtn = createSignInComponent();

      toolsWrapper.appendChild(generateBtn);
      toolsWrapper.appendChild(phoneBtn);
      toolsWrapper.appendChild(batchBtn);
      toolsWrapper.appendChild(emojiToggleBtn);

      btnContainer.appendChild(toolsWrapper);
      btnContainer.appendChild(signInBtn);

      container.parentNode.insertBefore(btnContainer, container.nextSibling);
      injectFieldLanguageControls();
      updateButtonUI();
      return true;
    }
    return false;
  }

  function startInjectionObserver() {
    const pollInterval = setInterval(() => {
      if (injectButton()) {
        clearInterval(pollInterval);
      }
    }, 100);

    const observer = new MutationObserver(() => {
      if (injectButton()) {
        observer.disconnect();
        clearInterval(pollInterval);
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  // --- INITIALIZATION ---

  function init() {
    injectStylesheet();
    initializeAuthState();
    startInjectionObserver();
  }

  init();
})();
