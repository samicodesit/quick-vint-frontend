(() => {
  // --- CONSTANTS & CONFIGURATION ---
  const BTN_ID = "quickvint-gen-btn";
  const PHONE_BTN_ID = "quickvint-phone-btn";
  const SIGN_IN_BTN_ID = "quickvint-signin-btn";
  const MODAL_ID = "quickvint-phone-modal";
  const API_BASE = "https://quick-vint.vercel.app";
  const PHONE_API_BASE = "https://quick-vint.vercel.app";
  const PHONE_UPLOAD_PAGE = `${PHONE_API_BASE}/phone-upload`;
  const PHONE_UPLOAD_API = `${PHONE_API_BASE}/api/phone-upload`;
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
    fileInput: 'input[type="file"]',
    measurementsSection: 'label[for="measurements"]',
  };
  const WAND_ICON_SVG = `<svg fill="#ffffff" viewBox="0 0 512 512" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"> <path d="M454.321,219.727l-38.766-51.947l20.815-61.385c2.046-6.032,0.489-12.704-4.015-17.208 c-4.504-4.504-11.175-6.061-17.208-4.015l-61.384,20.815l-51.951-38.766c-5.103-3.809-11.929-4.392-17.605-1.499 c-5.676,2.893-9.217,8.755-9.136,15.125l0.829,64.815l-52.923,37.426c-5.201,3.678-7.863,9.989-6.867,16.282 c0.996,6.291,5.479,11.471,11.561,13.363l43.844,13.63L14.443,483.432c-6.535,6.534-6.535,17.131,0,23.666s17.131,6.535,23.666,0 l257.073-257.072l13.629,43.843c2.172,6.986,8.638,11.768,15.984,11.768c5.375,0,10.494-2.595,13.66-7.072l37.426-52.923 l64.815,0.828c6.322,0.051,12.233-3.462,15.125-9.136S458.131,224.833,454.321,219.727z"></path> <polygon points="173.373,67.274 160.014,42.848 146.656,67.274 122.23,80.632 146.656,93.992 160.014,118.417 173.373,93.992 197.799,80.632 "></polygon> <polygon points="362.946,384.489 352.14,364.731 341.335,384.489 321.577,395.294 341.335,406.1 352.14,425.856 362.946,406.1 382.703,395.294 "></polygon> <polygon points="378.142,19.757 367.337,0 356.531,19.757 336.774,30.563 356.531,41.369 367.337,61.126 378.142,41.369 397.9,30.563 "></polygon> <polygon points="490.635,142.513 484.167,130.689 477.701,142.513 465.876,148.979 477.701,155.446 484.167,167.27 490.635,155.446 502.458,148.979 "></polygon> <polygon points="492.626,294.117 465.876,301.951 439.128,294.117 446.962,320.865 439.128,347.615 465.876,339.781 492.626,347.615 484.791,320.865 "></polygon> </svg>`;
  const PHONE_ICON_SVG = `<svg fill="#ffffff" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z"/></svg>`;

  const FEATURE_PANEL_ID = "quickvint-feature-panel";
  const RESULT_PANEL_ID = "quickvint-result-panel";
  const MULTILANG_PANEL_ID = "quickvint-multilang-panel";
  const COMPLETENESS_PANEL_ID = "quickvint-completeness-panel";
  const GENERATE_TOOLS_ID = "quickvint-generate-tools";
  const GENERATE_MODE_BTN_ID = "quickvint-generate-mode-btn";
  const PREFS_TOGGLE_BTN_ID = "quickvint-prefs-toggle";
  const PREFS_DOCK_ID = "quickvint-prefs-dock";
  const BATCH_LANGS_STORAGE_KEY = "batchLanguages";
  const MEASUREMENT_HINT_KEY = "quickvintMeasurementHintLastShownAt";
  const MEASUREMENT_HINT_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;

  const LISTING_PREFS = [
    { id: "pet_free_home", label: "Pet-free home" },
    { id: "smoke_free_home", label: "Smoke-free home" },
  ];
  const LISTING_PREF_IDS = new Set(LISTING_PREFS.map((pref) => pref.id));

  const BATCH_LANGS = [
    { code: "fr", flag: "🇫🇷", name: "Français", domain: "vinted.fr" },
    { code: "de", flag: "🇩🇪", name: "Deutsch", domain: "vinted.de" },
    { code: "nl", flag: "🇳🇱", name: "Nederlands", domain: "vinted.nl" },
    { code: "es", flag: "🇪🇸", name: "Español", domain: "vinted.es" },
    { code: "it", flag: "🇮🇹", name: "Italiano", domain: "vinted.it" },
    { code: "pt", flag: "🇵🇹", name: "Português", domain: "vinted.pt" },
    { code: "pl", flag: "🇵🇱", name: "Polski", domain: "vinted.pl" },
    { code: "cz", flag: "🇨🇿", name: "Čeština", domain: "vinted.cz" },
    { code: "sk", flag: "🇸🇰", name: "Slovenčina", domain: "vinted.sk" },
    { code: "sv", flag: "🇸🇪", name: "Svenska", domain: "vinted.se" },
    { code: "da", flag: "🇩🇰", name: "Dansk", domain: "vinted.dk" },
    { code: "fi", flag: "🇫🇮", name: "Suomeksi", domain: "vinted.fi" },
    { code: "hu", flag: "🇭🇺", name: "Magyar", domain: "vinted.hu" },
    { code: "lt", flag: "🇱🇹", name: "Lietuvių", domain: "vinted.lt" },
    { code: "ro", flag: "🇷🇴", name: "Română", domain: "vinted.ro" },
    { code: "el", flag: "🇬🇷", name: "Ελληνικά", domain: "vinted.gr" },
    { code: "hr", flag: "🇭🇷", name: "Hrvatski", domain: "vinted.hr" },
    { code: "en", flag: "🇬🇧", name: "English", domain: "vinted.co.uk" },
  ];

  // --- STATE ---
  let generateBtn = null;
  let phoneBtn = null;
  let signInBtn = null;
  let generateTools = null;
  let generateModeBtn = null;
  let prefsToggleBtn = null;
  let prefsDock = null;
  let isBusy = false;
  let isAuthenticated = false;
  let pollInterval = null;
  let downloadedFiles = new Set();
  let hasPlusAccess = false;
  let hasProAccess = false;
  let featurePanel = null;
  let resultPanel = null;
  let multiLangPanel = null;
  let completenessPanel = null;
  let lastImageUrls = [];
  let selectedBatchLangs = new Set();

  // --- HELPER FUNCTIONS ---

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

  function showToast(message, type = "error", action = null, autoHide = true) {
    let toast = document.getElementById("quickvint-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "quickvint-toast";
      document.body.appendChild(toast);
    }

    const iconText = type === "success" ? "✅" : type === "info" ? "ℹ️" : "⚠️";
    const icon = document.createElement("span");
    icon.className = "toast-icon";
    icon.textContent = iconText;

    const content = document.createElement("div");
    content.className = "toast-content";

    const messageText = document.createElement("span");
    messageText.textContent = message;
    content.appendChild(messageText);

    if (action && action.text && action.url) {
      const actionLink = document.createElement("a");
      actionLink.href = action.url;
      actionLink.target = "_blank";
      actionLink.rel = "noopener noreferrer";
      actionLink.style.marginLeft = "12px";
      actionLink.style.color = "inherit";
      actionLink.style.textDecoration = "underline";
      actionLink.style.fontWeight = "700";
      actionLink.style.whiteSpace = "nowrap";
      actionLink.textContent = `${action.text} →`;
      content.appendChild(actionLink);
    }

    const closeButton = document.createElement("button");
    closeButton.className = "toast-close";
    closeButton.setAttribute("aria-label", "Close");
    closeButton.textContent = "×";

    toast.replaceChildren(icon, content, closeButton);

    toast.className = type;
    toast.style.visibility = "visible"; // Ensure it's visible for the transition

    // Add close handler
    const closeBtn = toast.querySelector(".toast-close");
    if (closeBtn) {
      closeBtn.onclick = () => {
        toast.classList.remove("visible");
        if (window.quickvintToastTimeout)
          clearTimeout(window.quickvintToastTimeout);
      };
    }

    // Force reflow
    toast.offsetHeight;

    toast.classList.add("visible");

    if (window.quickvintToastTimeout)
      clearTimeout(window.quickvintToastTimeout);

    // Only auto-hide if autoHide is true and there is NO action.
    // If there IS an action or autoHide is false, it stays until manually closed.
    if (autoHide && !action) {
      window.quickvintToastTimeout = setTimeout(() => {
        toast.classList.remove("visible");
      }, 4000);
    }
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
            email: user?.email || "",
            timestamp: Date.now(),
          };
          // Simple base64 encode
          const token = btoa(JSON.stringify(userData));
          resolve(`https://quick-vint.vercel.app/pricing?token=${token}`);
        } catch (e) {
          console.error("Error building pricing URL:", e);
          resolve("https://quick-vint.vercel.app/pricing");
        }
      });
    });
  }

  async function sendMessage(message) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(message, resolve);
    });
  }

  async function fetchWithTimeout(url, options = {}, timeoutMs = 90000) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, { ...options, signal: controller.signal });
    } finally {
      clearTimeout(timeout);
    }
  }

  function setTextareaValue(value) {
    const descInput = document.querySelector(SELECTORS.description);
    if (!descInput) return;
    descInput.value = value;
    descInput.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function appendDescriptionsToTextarea(descriptions) {
    if (!descriptions.length) return;
    setTextareaValue(descriptions.join("\n\n"));
  }

  function sanitizeListingPreferences(preferences = []) {
    const normalized = preferences.flatMap((pref) =>
      pref === "smoke_pet_free" ? ["pet_free_home", "smoke_free_home"] : [pref],
    );
    return [...new Set(normalized)].filter((pref) =>
      LISTING_PREF_IDS.has(pref),
    );
  }

  function getLangMeta(code) {
    return (
      BATCH_LANGS.find((lang) => lang.code === code) ||
      BATCH_LANGS.find((lang) => lang.code === "en") || {
        code: "en",
        name: "English",
        flag: "",
      }
    );
  }

  function formatLangCode(code) {
    return (code || "en").toUpperCase();
  }

  function getFlagCountryCode(code) {
    const map = {
      en: "gb",
      fr: "fr",
      de: "de",
      nl: "nl",
      es: "es",
      it: "it",
      pt: "pt",
      pl: "pl",
      cz: "cz",
      sk: "sk",
      sv: "se",
      da: "dk",
      fi: "fi",
      hu: "hu",
      lt: "lt",
      ro: "ro",
      el: "gr",
      hr: "hr",
    };
    return map[code] || "gb";
  }

  function createFlagImage(code, alt = "") {
    const img = document.createElement("img");
    img.className = "qv-lang-flag";
    img.src = `https://flagcdn.com/w40/${getFlagCountryCode(code)}.png`;
    img.alt = alt;
    img.loading = "lazy";
    return img;
  }

  async function updateGenerateModeLabel() {
    if (!generateBtn) return;
    const { selectedLanguage: storedLanguage = "en" } =
      await chrome.storage.local.get("selectedLanguage");
    const selectedLanguage = storedLanguage === "cs" ? "cz" : storedLanguage;
    const label = generateBtn.querySelector(".label");
    const flag = generateBtn.querySelector(".qv-output-flag");
    const lang = getLangMeta(selectedLanguage);
    if (flag) {
      flag.src = `https://flagcdn.com/w40/${getFlagCountryCode(selectedLanguage)}.png`;
      flag.alt = lang.name;
    }
    if (label && !isBusy) label.textContent = "Generate";
    if (generateModeBtn) {
      const selectedCount = selectedBatchLangs.size;
      generateModeBtn.textContent =
        selectedCount > 0 ? `Multi ${selectedCount}` : "Multi-lang";
      generateModeBtn.title =
        selectedCount > 0
          ? `Single: ${lang.name}. Multi-language set: ${selectedCount} selected.`
          : `Single output language: ${lang.name}. Click for multi-language options.`;
    }
  }

  async function maybeShowMeasurementAdvice(message) {
    const trimmed = message?.trim();
    if (!trimmed) return;

    const data = await chrome.storage.local.get([MEASUREMENT_HINT_KEY]);
    const lastShownAt = Number(data[MEASUREMENT_HINT_KEY] || 0);
    const now = Date.now();
    if (lastShownAt && now - lastShownAt < MEASUREMENT_HINT_INTERVAL_MS) return;

    chrome.storage.local.set({ [MEASUREMENT_HINT_KEY]: now });
    setTimeout(() => {
      showToast(trimmed, "info", null, true);
    }, 300);
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
      const timeout = setTimeout(() => {
        reject(new Error(`Image compression timed out: ${imageUrl}`));
      }, 15000);

      img.onload = () => {
        try {
          clearTimeout(timeout);
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
        clearTimeout(timeout);
        reject(new Error(`Failed to load image: ${imageUrl}`));
      };

      img.src = imageUrl;
    });
  }

  function nextFrame() {
    return new Promise((resolve) => requestAnimationFrame(() => resolve()));
  }

  /**
   * Compresses multiple images with small UI yields between canvas work.
   * @param {string[]} imageUrls - Array of image URLs
   * @returns {Promise<string[]>} Array of compressed base64 images
   */
  async function compressImages(imageUrls) {
    const compressed = [];
    for (const url of imageUrls) {
      try {
        compressed.push(await compressImage(url));
      } catch (error) {
        console.warn(`Failed to compress image ${url}:`, error);
        compressed.push(url);
      }
      await nextFrame();
    }
    return compressed;
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

  // --- TIER ACCESS ---

  async function loadAccessLevel() {
    return new Promise((resolve) => {
      chrome.storage.local.get(["userProfile"], (data) => {
        const tier = normalizeTier(data.userProfile?.subscription_tier);
        const isLegacy = isLegacyProfile(data.userProfile);
        if (isLegacy) {
          // Legacy users keep their original feature set instead of inheriting
          // new Plus-only features.
          hasPlusAccess = false;
          hasProAccess = ["pro", "business"].includes(tier);
        } else {
          hasPlusAccess = ["plus", "pro_v2", "business_v2"].includes(tier);
          hasProAccess = ["pro_v2", "business_v2"].includes(tier);
        }
        resolve();
      });
    });
  }

  // --- FEATURE PANEL (Preferences) ---

  function createFeaturePanel() {
    const panel = document.createElement("div");
    panel.id = FEATURE_PANEL_ID;
    panel.className = "qv-floating-panel";

    const prefsSection = document.createElement("details");
    prefsSection.className = "qv-disclosure";

    const prefsHeader = document.createElement("summary");
    prefsHeader.className = "qv-disclosure-summary";
    prefsHeader.innerHTML = `
      <span class="qv-disclosure-title-wrap">
        <span class="qv-section-title">Listing Preferences</span>
        <span class="qv-disclosure-subtitle">Small trust notes added to future generations</span>
      </span>
      <span class="qv-tier-badge plus">Plus</span>
    `;

    const prefsBody = document.createElement("div");
    prefsBody.className = "qv-disclosure-body";

    const prefList = document.createElement("div");
    prefList.className = "qv-pref-list";
    prefList.id = "qv-pref-list";

    LISTING_PREFS.forEach((pref) => {
      const item = document.createElement("label");
      item.className = "qv-pref-item" + (hasPlusAccess ? "" : " locked");
      item.dataset.prefId = pref.id;
      item.innerHTML = `<input type="checkbox" value="${pref.id}" ${hasPlusAccess ? "" : "disabled"}> ${pref.label}`;
      if (hasPlusAccess) {
        item.querySelector("input").onchange = savePrefState;
      }
      prefList.appendChild(item);
    });

    const lockedMsgPrefs = document.createElement("div");
    lockedMsgPrefs.className = "qv-locked-msg";
    lockedMsgPrefs.id = "qv-prefs-locked-msg";
    lockedMsgPrefs.textContent = "Available on Plus";
    lockedMsgPrefs.style.display = hasPlusAccess ? "none" : "flex";

    const suggestRow = document.createElement("div");
    suggestRow.className = "qv-suggest-row";
    suggestRow.innerHTML = `
      <div class="qv-suggest-copy">
        <span class="qv-suggest-title">Missing an option?</span>
        <span class="qv-suggest-help">Send one preference idea.</span>
      </div>
      <div class="qv-suggest-controls">
        <input type="text" class="qv-suggest-input" id="qv-suggest-input"
          placeholder="Request another option" maxlength="200">
        <button class="qv-suggest-btn" id="qv-suggest-btn">Send</button>
      </div>
    `;

    const footerRow = document.createElement("div");
    footerRow.className = "qv-panel-footer";
    footerRow.innerHTML = `
      <button type="button" class="qv-panel-link-btn" id="qv-open-full-settings">Popup settings</button>
    `;

    prefsBody.appendChild(prefList);
    prefsBody.appendChild(lockedMsgPrefs);
    prefsBody.appendChild(suggestRow);
    prefsBody.appendChild(footerRow);
    prefsSection.appendChild(prefsHeader);
    prefsSection.appendChild(prefsBody);

    panel.appendChild(prefsSection);

    return panel;
  }

  function createPrefsToggleButton() {
    const btn = document.createElement("button");
    btn.id = PREFS_TOGGLE_BTN_ID;
    btn.type = "button";
    btn.className = "qv-inline-control-btn";
    btn.innerHTML = `
      <span class="qv-inline-control-label">Preferences</span>
      <span class="qv-tier-badge plus">Plus</span>
    `;
    btn.addEventListener("click", () => {
      if (!featurePanel) return;
      const nextOpen = !featurePanel.classList.contains("visible");
      featurePanel.classList.toggle("visible", nextOpen);
      btn.classList.toggle("active", nextOpen);
      const details = featurePanel.querySelector("details");
      if (details) details.open = nextOpen;
    });
    return btn;
  }

  function createPrefsDock() {
    const dock = document.createElement("div");
    dock.id = PREFS_DOCK_ID;

    prefsToggleBtn = createPrefsToggleButton();
    featurePanel = createFeaturePanel();

    dock.appendChild(prefsToggleBtn);
    dock.appendChild(featurePanel);
    return dock;
  }

  function createMultiLangPanel() {
    const panel = document.createElement("div");
    panel.id = MULTILANG_PANEL_ID;
    panel.className = "qv-popover-panel";
    panel.style.display = "none";
    panel.innerHTML = `
      <details class="qv-disclosure">
        <summary class="qv-disclosure-summary">
          <span class="qv-disclosure-title-wrap">
            <span class="qv-section-title">Generation Language</span>
            <span class="qv-disclosure-subtitle" id="qv-single-lang-note">Single generation uses popup output language</span>
          </span>
          <span class="qv-tier-badge pro">Pro</span>
        </summary>
        <div class="qv-disclosure-body">
          <div class="qv-mode-note" id="qv-mode-note">Use Generate for the selected output language, or select languages below for multi-generation. Each language uses 1 credit.</div>
          <div class="qv-lang-pills" id="qv-lang-pills"></div>
          <div class="qv-locked-msg" id="qv-ml-locked-msg">Available on Pro</div>
          <div class="qv-multilang-footer">
            <span class="qv-lang-counter" id="qv-lang-counter">Select languages to generate at once</span>
            <button class="qv-gen-all-btn" id="qv-gen-all-btn" disabled>Generate All</button>
          </div>
          <div class="qv-lang-results" id="qv-lang-results"></div>
        </div>
      </details>
    `;

    const langPills = panel.querySelector("#qv-lang-pills");
    BATCH_LANGS.forEach((lang) => {
      const pill = document.createElement("button");
      pill.type = "button";
      pill.className = "qv-lang-pill" + (hasProAccess ? "" : " disabled");
      pill.dataset.code = lang.code;
      pill.appendChild(createFlagImage(lang.code, lang.name));
      pill.appendChild(document.createTextNode(lang.name));
      pill.disabled = !hasProAccess;
      langPills.appendChild(pill);
    });

    const lockedMsg = panel.querySelector("#qv-ml-locked-msg");
    const footer = panel.querySelector(".qv-multilang-footer");
    if (lockedMsg) lockedMsg.style.display = hasProAccess ? "none" : "flex";
    if (footer) footer.style.display = hasProAccess ? "" : "none";

    return panel;
  }

  function savePrefState() {
    const checked = [];
    document.querySelectorAll("#qv-pref-list input:checked").forEach((cb) => {
      checked.push(cb.value);
    });
    chrome.storage.local.set({
      listingPreferences: sanitizeListingPreferences(checked),
    });
  }

  function restorePrefState() {
    chrome.storage.local.get(["listingPreferences"], (data) => {
      const saved = sanitizeListingPreferences(data.listingPreferences || []);
      if ((data.listingPreferences || []).join("|") !== saved.join("|")) {
        chrome.storage.local.set({ listingPreferences: saved });
      }
      document.querySelectorAll("#qv-pref-list input").forEach((cb) => {
        cb.checked = saved.includes(cb.value);
      });
    });
  }

  function restoreBatchLangState() {
    chrome.storage.local.get([BATCH_LANGS_STORAGE_KEY], (data) => {
      const saved = Array.isArray(data[BATCH_LANGS_STORAGE_KEY])
        ? data[BATCH_LANGS_STORAGE_KEY]
        : [];
      selectedBatchLangs = new Set(
        saved.filter((code) => BATCH_LANGS.some((lang) => lang.code === code)),
      );
      if (multiLangPanel) {
        multiLangPanel.querySelectorAll(".qv-lang-pill").forEach((pill) => {
          pill.classList.toggle(
            "selected",
            selectedBatchLangs.has(pill.dataset.code),
          );
        });
      }
      updateBatchLangFooter();
      updateGenerateModeLabel();
    });
  }

  function toggleBatchLang(code, pillEl) {
    if (selectedBatchLangs.has(code)) {
      selectedBatchLangs.delete(code);
      pillEl.classList.remove("selected");
    } else {
      selectedBatchLangs.add(code);
      pillEl.classList.add("selected");
    }
    chrome.storage.local.set({
      [BATCH_LANGS_STORAGE_KEY]: [...selectedBatchLangs],
    });
    updateBatchLangFooter();
    updateGenerateModeLabel();
  }

  function updateBatchLangFooter() {
    const counter = document.getElementById("qv-lang-counter");
    const btn = document.getElementById("qv-gen-all-btn");
    const n = selectedBatchLangs.size;
    if (counter) {
      counter.textContent =
        n === 0
          ? "Select languages to generate at once"
          : `Selected: ${n} language${n > 1 ? "s" : ""} → ${n} credit${n > 1 ? "s" : ""}`;
    }
    if (btn) btn.disabled = n === 0 || isBusy;
  }

  function createLangResultName(lang) {
    const name = document.createElement("div");
    name.className = "qv-lang-result-name";
    name.textContent = `${lang.flag} ${lang.name}`;
    return name;
  }

  function createLangStatus(text, color) {
    const status = document.createElement("div");
    status.style.fontSize = "11.5px";
    status.style.color = color;
    status.style.marginTop = "6px";
    status.textContent = text;
    return status;
  }

  function renderLangLoading(card, lang) {
    card.replaceChildren(
      createLangResultName(lang),
      createLangStatus("Generating...", "#9ca3af"),
    );
  }

  function renderLangError(card, lang, message) {
    card.replaceChildren(
      createLangResultName(lang),
      createLangStatus(`Error: ${message || "Generation failed"}`, "#dc2626"),
    );
  }

  function renderLangSuccess(card, lang, title, description) {
    const header = document.createElement("div");
    header.className = "qv-lang-result-header";

    const name = document.createElement("span");
    name.className = "qv-lang-result-name";
    name.textContent = `${lang.flag} ${lang.name}`;

    const copyBtn = document.createElement("button");
    copyBtn.className = "qv-copy-btn";
    copyBtn.textContent = "Copy";

    header.appendChild(name);
    header.appendChild(copyBtn);

    const titleEl = document.createElement("div");
    titleEl.className = "qv-lang-result-title";
    titleEl.textContent = title || "";

    const descEl = document.createElement("div");
    descEl.className = "qv-lang-result-desc";
    descEl.textContent = description || "";

    card.replaceChildren(header, titleEl, descEl);

    copyBtn.onclick = () => {
      navigator.clipboard
        .writeText(`${title || ""}\n\n${description || ""}`)
        .then(() => {
          copyBtn.textContent = "Copied!";
          setTimeout(() => {
            copyBtn.textContent = "Copy";
          }, 1500);
        });
    };
  }

  function updateFeaturePanelAccess() {
    if (!featurePanel) return;

    // Preferences
    featurePanel.querySelectorAll(".qv-pref-item").forEach((item) => {
      const cb = item.querySelector("input");
      if (hasPlusAccess) {
        item.classList.remove("locked");
        if (cb) {
          cb.disabled = false;
          cb.onchange = savePrefState;
        }
      } else {
        item.classList.add("locked");
        if (cb) {
          cb.disabled = true;
          cb.onchange = null;
        }
      }
    });
    const prefsLockedMsg = document.getElementById("qv-prefs-locked-msg");
    if (prefsLockedMsg)
      prefsLockedMsg.style.display = hasPlusAccess ? "none" : "flex";
  }

  function closeFeaturePanel() {
    if (featurePanel) featurePanel.classList.remove("visible");
    if (prefsToggleBtn) prefsToggleBtn.classList.remove("active");
  }

  function updateMultiLangPanelAccess() {
    if (!multiLangPanel) return;

    multiLangPanel.querySelectorAll(".qv-lang-pill").forEach((pill) => {
      if (hasProAccess) {
        pill.classList.remove("disabled");
        pill.disabled = false;
        const code = pill.dataset.code;
        pill.onclick = () => toggleBatchLang(code, pill);
      } else {
        pill.classList.add("disabled");
        pill.disabled = true;
        pill.onclick = null;
      }
    });
    const mlLockedMsg = multiLangPanel.querySelector("#qv-ml-locked-msg");
    if (mlLockedMsg) mlLockedMsg.style.display = hasProAccess ? "none" : "flex";

    const mlFooter = multiLangPanel.querySelector(".qv-multilang-footer");
    if (mlFooter) mlFooter.style.display = hasProAccess ? "" : "none";

    const genAllBtn = document.getElementById("qv-gen-all-btn");
    if (genAllBtn) genAllBtn.disabled = selectedBatchLangs.size === 0 || isBusy;
  }

  function positionFloatingTools() {
    const anchor =
      generateTools || document.querySelector(SELECTORS.description);
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const anchorLeft = rect.left || 12;
    const anchorBottom = rect.bottom || 80;
    const panelLeft = Math.max(
      12,
      Math.min(window.innerWidth - 340, anchorLeft),
    );
    const panelTop = Math.max(
      12,
      Math.min(window.innerHeight - 440, anchorBottom + 8),
    );
    [multiLangPanel, resultPanel, completenessPanel].forEach((panel) => {
      if (!panel) return;
      panel.style.left = `${panelLeft}px`;
      panel.style.top = `${panelTop}px`;
    });
    if (
      resultPanel &&
      completenessPanel &&
      resultPanel.style.display !== "none"
    ) {
      const resultHeight = resultPanel.offsetHeight || 150;
      completenessPanel.style.top = `${Math.min(window.innerHeight - 190, panelTop + resultHeight + 8)}px`;
    }
  }

  function toggleMultiLangPanel(forceOpen) {
    if (!multiLangPanel) return;
    const nextOpen = forceOpen ?? multiLangPanel.style.display === "none";
    multiLangPanel.style.display = nextOpen ? "block" : "none";
    if (generateModeBtn) generateModeBtn.classList.toggle("active", nextOpen);
    const details = multiLangPanel.querySelector("details");
    if (details) details.open = true;
    if (nextOpen) positionFloatingTools();
  }

  function updateResultPanelAccess() {
    if (!resultPanel) return;
    const STYLES = ["detailed", "casual", "short"];
    STYLES.forEach((style) => {
      const btn = document.getElementById(`qv-regen-${style}`);
      if (!btn) return;
      if (hasPlusAccess) {
        btn.classList.remove("locked");
        btn.disabled = false;
        if (lastImageUrls.length)
          btn.onclick = () => onRegenClick(style, lastImageUrls);
      } else {
        btn.classList.add("locked");
        btn.disabled = true;
        btn.onclick = null;
      }
    });
    const lockedMsg = document.getElementById("qv-regen-locked-msg");
    if (lockedMsg) lockedMsg.style.display = hasPlusAccess ? "none" : "flex";
  }

  function setRefineButtonsBusy(busy, activeStyle = null) {
    ["detailed", "casual", "short"].forEach((style) => {
      const btn = document.getElementById(`qv-regen-${style}`);
      if (!btn) return;
      btn.disabled = busy || !hasPlusAccess;
      btn.classList.toggle("loading", busy && style === activeStyle);
      const label = btn.querySelector("span");
      if (label) {
        label.textContent =
          busy && style === activeStyle
            ? "Refining..."
            : style.charAt(0).toUpperCase() + style.slice(1);
      }
    });
  }

  function closeResultPanel() {
    if (resultPanel) resultPanel.style.display = "none";
    if (completenessPanel) completenessPanel.style.display = "none";
  }

  // --- RESULT PANEL (Smart Re-Gen) ---

  function createResultPanel() {
    const panel = document.createElement("div");
    panel.id = RESULT_PANEL_ID;
    panel.className = "qv-popover-panel qv-aftergen-panel";
    panel.style.display = "none";
    panel.innerHTML = `
      <div class="qv-section">
        <div class="qv-section-header">
          <span class="qv-section-title">Refine Description</span>
          <button type="button" class="qv-panel-close-btn" id="qv-close-result-panel" aria-label="Dismiss">×</button>
        </div>
        <div class="qv-section-subtitle">Generate a new version from the same photos.</div>
        <div class="qv-regen-buttons">
          <button class="qv-regen-btn${hasPlusAccess ? "" : " locked"}" id="qv-regen-detailed"
            ${hasPlusAccess ? "" : "disabled"}><span>Detailed</span><small>More buyer detail</small></button>
          <button class="qv-regen-btn${hasPlusAccess ? "" : " locked"}" id="qv-regen-casual"
            ${hasPlusAccess ? "" : "disabled"}><span>Casual</span><small>Warmer tone</small></button>
          <button class="qv-regen-btn${hasPlusAccess ? "" : " locked"}" id="qv-regen-short"
            ${hasPlusAccess ? "" : "disabled"}><span>Short</span><small>More concise</small></button>
        </div>
        <div class="qv-locked-msg qv-regen-locked-msg" id="qv-regen-locked-msg" style="display:${hasPlusAccess ? "none" : "flex"}">Refine options are available on Plus.</div>
      </div>
    `;

    return panel;
  }

  function createCompletenessPanel() {
    const panel = document.createElement("div");
    panel.id = COMPLETENESS_PANEL_ID;
    panel.className = "qv-popover-panel qv-completeness-popover";
    panel.style.display = "none";
    panel.innerHTML = `
      <details class="qv-disclosure">
        <summary class="qv-disclosure-summary">
          <span class="qv-disclosure-title-wrap">
            <span class="qv-section-title">Listing Completeness</span>
            <span class="qv-disclosure-subtitle">Checks only fields visible on this page</span>
          </span>
          <span class="qv-score-badge" id="qv-score-badge">—/3</span>
        </summary>
        <div class="qv-disclosure-body">
          <div class="qv-score-bar-bg">
            <div class="qv-score-bar-fill" id="qv-score-bar-fill" style="width:0%"></div>
          </div>
          <div class="qv-checks-list" id="qv-checks-list"></div>
        </div>
      </details>
    `;
    return panel;
  }

  function runCompletenessCheck() {
    const titleEl = document.querySelector(SELECTORS.title);
    const descEl = document.querySelector(SELECTORS.description);

    const title = titleEl?.value || "";
    const desc = descEl?.value || "";
    const photoCount = getUploadedImageUrls().length;

    const checks = [];

    const titleLen = title.length;
    checks.push({
      pass: titleLen >= 20,
      label: `Title: ${titleLen}/100 chars`,
      tip: "Add a clear title before publishing",
    });

    const descLen = desc.length;
    checks.push({
      pass: descLen >= 80,
      label: `Description: ${descLen} chars`,
      tip: "Add a fuller description before publishing",
    });

    const hashtags = (desc.match(/#[A-Za-z0-9_]+/g) || []).length;
    checks.push({
      pass: hashtags >= 3,
      label: `Hashtags: ${hashtags} found`,
      tip: "Use at least 3 hashtags to improve discovery",
    });

    checks.push({
      pass: photoCount >= 3,
      label: `Photos: ${photoCount} uploaded`,
      tip: "Add at least 3 photos",
    });

    const measurementSection = document.querySelector(
      SELECTORS.measurementsSection,
    );
    if (measurementSection) {
      const measurementInputs = Array.from(
        measurementSection.querySelectorAll("input"),
      ).filter((input) => !input.disabled && input.type !== "hidden");
      if (measurementInputs.length > 0) {
        const filledMeasurements = measurementInputs.filter(
          (input) => input.value.trim().length > 0,
        ).length;
        checks.push({
          pass: filledMeasurements > 0,
          label: `Measurements: ${filledMeasurements}/${measurementInputs.length} filled`,
          tip: "Add at least one measurement so buyers can compare sizes",
        });
      }
    }

    const score = checks.filter((c) => c.pass).length;
    return { score, total: checks.length, checks };
  }

  function showResultPanel(imageUrls) {
    if (!resultPanel) return;
    resultPanel.style.display = "block";
    positionFloatingTools();
    if (completenessPanel) {
      completenessPanel.style.display = "block";
      const details = completenessPanel.querySelector("details");
      if (details) details.open = false;
    }

    // Wire directional regen buttons (Plus+ only) and update their locked state
    updateResultPanelAccess();

    const closeBtn = document.getElementById("qv-close-result-panel");
    if (closeBtn) closeBtn.onclick = closeResultPanel;

    // Run completeness check
    updateCompletenessUI();
  }

  function updateCompletenessUI() {
    const { score, total, checks } = runCompletenessCheck();
    const pct = Math.round((score / total) * 100);
    const colorClass = pct >= 75 ? "good" : pct >= 50 ? "medium" : "low";

    const badge = document.getElementById("qv-score-badge");
    if (badge) {
      badge.textContent = `${score}/${total}`;
      badge.className = `qv-score-badge ${colorClass}`;
    }

    const bar = document.getElementById("qv-score-bar-fill");
    if (bar) {
      bar.style.width = `${pct}%`;
      bar.className = `qv-score-bar-fill ${colorClass}`;
    }

    const list = document.getElementById("qv-checks-list");
    if (!list) return;
    list.replaceChildren();

    checks.forEach((check) => {
      const item = document.createElement("div");
      item.className = "qv-check-item";

      const icon = check.pass ? "✓" : "!";
      const iconEl = document.createElement("span");
      iconEl.className = "qv-check-icon";
      iconEl.textContent = icon;

      const body = document.createElement("div");
      body.className = "qv-check-body";

      const label = document.createElement("span");
      label.className = "qv-check-label" + (check.pass ? "" : " warn");
      label.textContent = check.label;
      body.appendChild(label);

      if (!check.pass && hasProAccess) {
        const tip = document.createElement("div");
        tip.className = "qv-check-tip";
        tip.textContent = check.tip;
        body.appendChild(tip);
      } else if (!check.pass) {
        const upgradeWrapper = document.createElement("div");
        const upgrade = document.createElement("span");
        upgrade.className = "qv-check-upgrade";
        upgrade.textContent = "Upgrade for tips";
        upgradeWrapper.appendChild(upgrade);
        body.appendChild(upgradeWrapper);
      }

      item.appendChild(iconEl);
      item.appendChild(body);
      list.appendChild(item);
    });
  }

  // --- REGEN & BATCH GENERATE ---

  async function onRegenClick(style, imageUrls) {
    const urls = imageUrls || lastImageUrls;
    if (isBusy) return;
    if (!urls.length) {
      showToast("No images to re-generate from.", "error");
      return;
    }

    isBusy = true;
    updateButtonUI();
    updateBatchLangFooter();
    setRefineButtonsBusy(true, style);

    try {
      const {
        selectedLanguage: storedLanguage = "en",
        tone = "standard",
        useEmojis,
        useBulletPoints = true,
        listingPreferences = [],
      } = await chrome.storage.local.get([
        "selectedLanguage",
        "tone",
        "useEmojis",
        "useBulletPoints",
        "listingPreferences",
      ]);
      const selectedLanguage = storedLanguage === "cs" ? "cz" : storedLanguage;
      const { access_token } = await sendMessage({ type: "GET_ACCESS_TOKEN" });
      if (!access_token)
        throw new Error("Session expired. Please sign in again.");

      const response = await fetch(`${API_BASE}/api/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${access_token}`,
        },
        body: JSON.stringify({
          imageUrls: urls,
          languageCode: selectedLanguage,
          tone,
          useEmojis,
          useBulletPoints,
          regenStyle: style || undefined,
          listingPreferences: hasPlusAccess
            ? sanitizeListingPreferences(listingPreferences)
            : [],
        }),
      });

      if (response.status === 401) {
        isAuthenticated = false;
        showToast("Session expired.", "error");
        return;
      }
      if (response.status === 429 || response.status === 402) {
        const errData = await response.json();
        const pricingUrl = await getPricingUrl();
        showToast(errData.error || "Credit limit reached.", "error", {
          text: "Upgrade Plan",
          url: pricingUrl,
        });
        return;
      }
      if (!response.ok) {
        const { error } = await response.json().catch(() => ({}));
        throw new Error(error || `HTTP ${response.status}`);
      }

      const { title, description, measurementAdvice } = await response.json();
      const titleInput = document.querySelector(SELECTORS.title);
      if (titleInput) {
        titleInput.value = title;
        titleInput.dispatchEvent(new Event("input", { bubbles: true }));
      }
      setTextareaValue(description);

      await maybeShowMeasurementAdvice(measurementAdvice);

      setTimeout(() => updateCompletenessUI(), 100);
    } catch (err) {
      showToast(err.message || "Generation failed.", "error");
    } finally {
      isBusy = false;
      updateButtonUI();
      updateBatchLangFooter();
      setRefineButtonsBusy(false);
      updateResultPanelAccess();
    }
  }

  async function onGenerateAllClick() {
    if (!hasProAccess || selectedBatchLangs.size === 0) return;
    if (isBusy) return;
    isBusy = true;
    updateButtonUI();
    updateBatchLangFooter();

    let imageUrlsForBatch = lastImageUrls;

    const btn = document.getElementById("qv-gen-all-btn");
    if (btn) {
      btn.disabled = true;
      btn.textContent = "⏳ Generating…";
    }

    const langResults = document.getElementById("qv-lang-results");
    if (langResults) langResults.replaceChildren();

    try {
      if (imageUrlsForBatch.length === 0) {
        const imageUrls = getUploadedImageUrls();
        if (!imageUrls.length) {
          throw new Error("Upload photos first, then generate.");
        }
        imageUrlsForBatch = await compressImages(imageUrls);
        lastImageUrls = imageUrlsForBatch;
      }

      const {
        tone = "standard",
        useEmojis,
        useBulletPoints = true,
        listingPreferences = [],
      } = await chrome.storage.local.get([
        "tone",
        "useEmojis",
        "useBulletPoints",
        "listingPreferences",
      ]);
      const { access_token } = await sendMessage({ type: "GET_ACCESS_TOKEN" });
      if (!access_token) throw new Error("Session expired.");

      const langList = BATCH_LANGS.filter((l) =>
        selectedBatchLangs.has(l.code),
      );
      const langDescriptions = [];

      for (const lang of langList) {
        // Show loading card
        if (langResults) {
          const loadingCard = document.createElement("div");
          loadingCard.className = "qv-lang-result-card";
          loadingCard.id = `qv-result-${lang.code}`;
          renderLangLoading(loadingCard, lang);
          langResults.appendChild(loadingCard);
        }

        try {
          const response = await fetch(`${API_BASE}/api/generate`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${access_token}`,
            },
            body: JSON.stringify({
              imageUrls: imageUrlsForBatch,
              languageCode: lang.code,
              tone,
              useEmojis,
              useBulletPoints,
              listingPreferences: hasPlusAccess
                ? sanitizeListingPreferences(listingPreferences)
                : [],
            }),
          });

          const card = document.getElementById(`qv-result-${lang.code}`);
          if (response.status === 401) {
            isAuthenticated = false;
            showToast("Session expired.", "error");
            break;
          }
          if (response.status === 429 || response.status === 402) {
            const errData = await response.json().catch(() => ({}));
            const pricingUrl = await getPricingUrl();
            showToast(errData.error || "Credit limit reached.", "error", {
              text: "Upgrade Plan",
              url: pricingUrl,
            });
            if (card) {
              renderLangError(
                card,
                lang,
                errData.error || "Credit limit reached",
              );
            }
            break;
          }
          if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            if (card)
              renderLangError(card, lang, err.error || "Generation failed");
            continue;
          }

          const { title, description } = await response.json();
          if (card) renderLangSuccess(card, lang, title, description);
          langDescriptions.push(`${lang.name}\n${description || ""}`.trim());
        } catch (e) {
          const card = document.getElementById(`qv-result-${lang.code}`);
          if (card) renderLangError(card, lang, e.message);
        }
      }

      appendDescriptionsToTextarea(langDescriptions);
      setTimeout(() => updateCompletenessUI(), 100);
    } catch (err) {
      showToast(err.message || "Batch generation failed.", "error");
    } finally {
      isBusy = false;
      updateButtonUI();
      updateBatchLangFooter();
      if (btn) {
        btn.disabled = selectedBatchLangs.size === 0;
        btn.textContent = "Generate All";
      }
    }
  }

  async function onSubmitSuggestion() {
    const input = document.getElementById("qv-suggest-input");
    const btn = document.getElementById("qv-suggest-btn");
    if (!input || !btn) return;

    const text = input.value.trim();
    if (text.length < 5) {
      showToast("Please enter at least 5 characters.", "error");
      return;
    }
    if (text.length > 200) {
      showToast("Suggestion must be under 200 characters.", "error");
      return;
    }

    btn.disabled = true;
    btn.textContent = "Sending…";

    try {
      const { access_token } = await sendMessage({ type: "GET_ACCESS_TOKEN" });
      if (!access_token) throw new Error("Session expired.");

      const response = await fetch(`${API_BASE}/api/suggestions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${access_token}`,
        },
        body: JSON.stringify({ suggestion: text }),
      });

      if (!response.ok) throw new Error("Server error");

      input.value = "";
      btn.textContent = "✓ Sent!";
      setTimeout(() => {
        btn.textContent = "Send";
        btn.disabled = false;
      }, 2000);
      showToast(
        "Thanks! Your suggestion has been sent to the AutoLister team.",
        "success",
      );
    } catch (err) {
      btn.textContent = "Send";
      btn.disabled = false;
      showToast("Failed to send suggestion. Please try again.", "error");
    }
  }

  // --- AUTHENTICATION & STATE SYNC ---

  function initializeAuthState() {
    chrome.storage.local.get(["supabaseSession", "userProfile"], (data) => {
      isAuthenticated = !!data.supabaseSession?.access_token;
      updateButtonUI();
      if (isAuthenticated) {
        loadAccessLevel().then(() => {
          updateFeaturePanelAccess();
          updateMultiLangPanelAccess();
          restorePrefState();
          restoreBatchLangState();
        });
      }
    });
  }

  chrome.storage.onChanged.addListener((changes) => {
    if (changes.supabaseSession) {
      isAuthenticated = !!changes.supabaseSession.newValue?.access_token;
      updateButtonUI();
    }
    if (changes.userProfile) {
      loadAccessLevel().then(() => {
        updateFeaturePanelAccess();
        updateMultiLangPanelAccess();
        updateResultPanelAccess();
        updateGenerateModeLabel();
      });
    }
    if (changes.selectedLanguage) updateGenerateModeLabel();
  });

  // --- UI ---

  function injectStylesheet() {
    const style = document.createElement("style");
    style.textContent = `
      #${BTN_ID}, #${PHONE_BTN_ID} {
        display: none;
        width: auto;
        flex: 0 0 auto;
        align-items: center;
        justify-content: center;
        padding: 8px 16px;
        background-color: #aaa;
        color: white;
        border: none;
        border-radius: 8px;
        font-size: 14px;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        cursor: not-allowed;
        transition: background-color 0.2s, transform 0.2s, box-shadow 0.2s;
        font-weight: 500;
        box-shadow: rgba(0, 0, 0, 0.1) 0px 2px 4px;
        text-align: center;
        white-space: nowrap;
      }

      #${SIGN_IN_BTN_ID} {
        display: none;
        width: 100%;
        margin-top: 10px;
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
      
      #${PHONE_BTN_ID} {
        margin-left: 8px;
      }

      #${BTN_ID}:not(:disabled):hover, #${PHONE_BTN_ID}:not(:disabled):hover {
        background-color: #4338ca;
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
        transform: translateY(-1px);
      }
      
      #${BTN_ID} .icon, #${PHONE_BTN_ID} .icon {
        width: 16px;
        height: 16px;
        margin-right: 6px;
      }

      .qv-output-flag,
      .qv-lang-flag {
        width: 18px;
        height: 13px;
        border-radius: 2px;
        object-fit: cover;
        flex: 0 0 auto;
        box-shadow: 0 0 0 1px rgba(15, 23, 42, 0.1);
      }

      #${BTN_ID} .qv-output-flag {
        margin-right: 6px;
      }
      
      /* Modal Styles */
      #${MODAL_ID} {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.4);
        backdrop-filter: blur(5px);
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
        padding: 28px;
        border-radius: 16px;
        text-align: center;
        max-width: 440px;
        width: 90%;
        max-height: calc(100vh - 40px);
        overflow: auto;
        box-shadow: 0 20px 60px -10px rgba(0, 0, 0, 0.3);
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
        margin: 0 0 18px 0;
      }
      
      #${MODAL_ID} .qr-container {
        margin: 0 auto 16px;
        padding: 12px;
        background: white;
        border-radius: 20px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.06);
        display: inline-block;
        border: 1px solid #f3f4f6;
      }
      
      #${MODAL_ID} img {
        display: block;
        border-radius: 12px;
        width: 180px;
        height: 180px;
      }
      
      #${MODAL_ID} .instruction {
        margin: 0 0 14px 0;
        color: #4b5563;
        font-size: 14px;
        line-height: 1.5;
      }
      
      #${MODAL_ID} .modal-buttons {
        display: flex;
        gap: 12px;
        justify-content: center;
        margin-top: 18px;
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
        background: #4f46e5;
        color: white;
        box-shadow: 0 4px 12px rgba(79, 70, 229, 0.25);
      }
      
      #${MODAL_ID} .close-btn:hover {
        background: #f9fafb;
        border-color: #d1d5db;
      }
      
      #${MODAL_ID} .generate-btn:hover {
        background: #4338ca;
        transform: translateY(-1px);
        box-shadow: 0 6px 16px rgba(79, 70, 229, 0.35);
      }

      #${MODAL_ID} .generate-btn:disabled {
        background: #9ca3af;
        cursor: not-allowed;
        transform: none;
        box-shadow: none;
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
      
      #${MODAL_ID} .language-selector {
        margin: 0 0 14px;
        display: flex;
        justify-content: center;
        position: relative;
      }

      #${MODAL_ID} .phone-gen-mode {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 6px;
        margin: 0 0 12px;
        padding: 3px;
        border: 1px solid #e5e7eb;
        border-radius: 10px;
        background: #f9fafb;
      }

      #${MODAL_ID} .phone-mode-btn {
        border: none;
        border-radius: 8px;
        background: transparent;
        color: #4b5563;
        padding: 8px 10px;
        font-size: 12.5px;
        font-weight: 700;
        cursor: pointer;
      }

      #${MODAL_ID} .phone-mode-btn.active {
        background: #ffffff;
        color: #4338ca;
        box-shadow: 0 1px 4px rgba(15, 23, 42, 0.08);
      }

      #${MODAL_ID} .phone-mode-btn:disabled {
        opacity: 0.45;
        cursor: not-allowed;
      }

      #${MODAL_ID} .phone-multi-language {
        margin: 0 0 14px;
        padding: 10px;
        border: 1px solid #e5e7eb;
        border-radius: 10px;
        background: #ffffff;
        text-align: left;
      }

      #${MODAL_ID} .phone-multi-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        margin-bottom: 8px;
        font-size: 12px;
        font-weight: 700;
        color: #374151;
      }

      #${MODAL_ID} .phone-lang-pills {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        max-height: 112px;
        overflow: auto;
      }

      #${MODAL_ID} .phone-lang-pill {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        padding: 5px 8px;
        border: 1px solid #e5e7eb;
        border-radius: 999px;
        background: #ffffff;
        color: #374151;
        font-size: 11.5px;
        font-weight: 600;
        cursor: pointer;
      }

      #${MODAL_ID} .phone-lang-pill.selected {
        border-color: #4f46e5;
        background: #eef2ff;
        color: #3730a3;
      }

      #${MODAL_ID} .phone-lang-pill:disabled {
        opacity: 0.45;
        cursor: not-allowed;
      }

      #${MODAL_ID} .phone-lang-pill .qv-lang-flag {
        width: 16px;
        height: 12px;
        border-radius: 2px;
      }

      #${MODAL_ID} .phone-multi-note {
        margin-top: 8px;
        color: #6b7280;
        font-size: 11px;
        line-height: 1.35;
      }
      
      #${MODAL_ID} .language-select-wrapper {
        position: relative;
        width: 100%;
        max-width: 240px;
      }
      
      #${MODAL_ID} .language-select-wrapper::before {
        content: '🌐';
        position: absolute;
        left: 12px;
        top: 50%;
        transform: translateY(-50%);
        font-size: 14px;
        pointer-events: none;
        z-index: 1;
        filter: grayscale(100%);
        opacity: 0.6;
      }
      
      #${MODAL_ID} .language-select {
        width: 100%;
        padding: 10px 36px 10px 36px;
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

      /* Icons are emojis, but if we use text/svg later, ensure they pop */
      #quickvint-toast.error .toast-icon { text-shadow: 0 0 10px rgba(220, 38, 38, 0.5); }
      #quickvint-toast.success .toast-icon { text-shadow: 0 0 10px rgba(5, 150, 105, 0.5); }
      #quickvint-toast.info .toast-icon { text-shadow: 0 0 10px rgba(8, 145, 178, 0.5); }

      /* ═══ QuickVint Feature Panels ═══════════════════════════════ */
      #${FEATURE_PANEL_ID},
      #${PREFS_DOCK_ID},
      #${RESULT_PANEL_ID},
      #${MULTILANG_PANEL_ID},
      #${COMPLETENESS_PANEL_ID} {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 13px;
        color: #1f2937;
      }

      .qv-panel-shell {
        margin-top: 10px;
      }

      #${GENERATE_TOOLS_ID} {
        position: relative;
        z-index: 9;
        display: flex;
        align-items: center;
        gap: 6px;
        flex-wrap: wrap;
        margin-top: 10px;
        padding: 0;
        pointer-events: auto;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      }

      #${GENERATE_TOOLS_ID} #${BTN_ID},
      #${GENERATE_TOOLS_ID} #${PHONE_BTN_ID},
      #${GENERATE_TOOLS_ID} #${GENERATE_MODE_BTN_ID},
      #${GENERATE_TOOLS_ID} #${PREFS_TOGGLE_BTN_ID} {
        display: inline-flex !important;
      }

      #${GENERATE_TOOLS_ID} #${SIGN_IN_BTN_ID} {
        display: none;
      }

      #${GENERATE_TOOLS_ID} .qv-toolbar {
        display: inline-flex !important;
        align-items: center;
        gap: 7px !important;
        padding: 0;
        border: none;
        border-radius: 0;
        background: transparent;
        box-shadow: none;
        max-width: 100%;
        overflow-x: auto;
      }

      #${GENERATE_TOOLS_ID} .qv-toolbar > button {
        min-height: 36px;
        border-radius: 8px !important;
        margin: 0;
        box-shadow: 0 4px 12px rgba(15, 23, 42, 0.08) !important;
      }

      #${GENERATE_TOOLS_ID} .qv-toolbar > button + button {
        margin-left: 0;
      }

      #${GENERATE_TOOLS_ID} #${BTN_ID} {
        font-weight: 700;
        padding-left: 14px;
        padding-right: 14px;
      }

      #${GENERATE_TOOLS_ID} #${GENERATE_MODE_BTN_ID},
      #${GENERATE_TOOLS_ID} #${PREFS_TOGGLE_BTN_ID} {
        border: 1px solid #dbe4ff;
        background: #ffffff;
        color: #3730a3;
      }

      #${GENERATE_TOOLS_ID} #${GENERATE_MODE_BTN_ID}:hover,
      #${GENERATE_TOOLS_ID} #${PREFS_TOGGLE_BTN_ID}:hover {
        background: #eef2ff;
        border-color: #a5b4fc;
      }

      #${GENERATE_TOOLS_ID} #${PHONE_BTN_ID} {
        padding-left: 13px;
        padding-right: 13px;
      }

      #${GENERATE_TOOLS_ID} #${PREFS_TOGGLE_BTN_ID} {
        min-width: 122px;
      }

      .qv-floating-panel {
        position: fixed;
        top: 72px;
        right: 16px;
        width: min(360px, calc(100vw - 40px));
        z-index: 2147482992;
        opacity: 0;
        transform: translateY(-6px) scale(0.98);
        pointer-events: none;
        transition: opacity 0.22s ease, transform 0.22s ease;
      }
      .qv-floating-panel.visible {
        opacity: 1;
        transform: translateY(0) scale(1);
        pointer-events: auto;
      }

      #${PREFS_DOCK_ID} {
        position: fixed;
        top: 184px;
        right: 16px;
        z-index: 2147483000;
        display: none;
        width: auto;
        height: 34px;
        pointer-events: none;
      }
      #${PREFS_DOCK_ID}.visible {
        display: block;
      }
      #${PREFS_DOCK_ID} > * {
        pointer-events: auto;
      }

      .qv-inline-control-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        min-width: 116px;
        height: 34px;
        padding: 0 12px;
        border: 1px solid #dbe4ff;
        border-radius: 8px;
        background: #ffffff;
        color: #374151;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.18s ease;
        white-space: nowrap;
        box-shadow: 0 10px 28px rgba(15, 23, 42, 0.12);
      }
      .qv-inline-control-btn::before {
        content: "+";
        width: 16px;
        height: 16px;
        border-radius: 50%;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background: #eef2ff;
        color: #3730a3;
        font-size: 14px;
        font-weight: 800;
        line-height: 1;
      }
      .qv-inline-control-btn:hover,
      .qv-inline-control-btn.active {
        border-color: #a5b4fc;
        background: #eef2ff;
        color: #3730a3;
        box-shadow: 0 8px 24px rgba(79,70,229,0.12);
      }
      .qv-inline-control-label {
        position: static;
        width: auto;
        height: auto;
        overflow: visible;
        clip: auto;
      }
      .qv-inline-control-btn .qv-tier-badge {
        position: static;
        padding: 1px 5px;
        font-size: 9px;
      }

      .qv-section {
        background: #fff;
        border: 1px solid #e5e7eb;
        border-radius: 10px;
        padding: 12px 14px;
        margin-top: 10px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.04);
      }

      .qv-popover-panel {
        position: fixed;
        width: min(330px, calc(100vw - 24px));
        max-height: min(430px, calc(100vh - 96px));
        overflow: auto;
        z-index: 2147482991;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-size: 13px;
        color: #1f2937;
        filter: drop-shadow(0 18px 30px rgba(15, 23, 42, 0.14));
      }

      .qv-aftergen-panel,
      .qv-completeness-popover {
        width: min(300px, calc(100vw - 24px));
      }

      #${GENERATE_MODE_BTN_ID} {
        display: none;
        align-items: center;
        justify-content: center;
        min-width: 94px;
        height: 36px;
        padding: 0 10px;
        border: 1px solid #dbe4ff;
        border-radius: 8px;
        background: #ffffff;
        color: #3730a3;
        font-size: 12px;
        font-weight: 700;
        cursor: pointer;
        box-shadow: rgba(0, 0, 0, 0.08) 0px 2px 4px;
        white-space: nowrap;
      }
      #${GENERATE_MODE_BTN_ID}::before {
        content: "🌐";
        margin-right: 5px;
        font-family: "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif;
      }

      #${GENERATE_MODE_BTN_ID}:hover,
      #${GENERATE_MODE_BTN_ID}.active {
        background: #eef2ff;
        border-color: #a5b4fc;
      }

      .qv-disclosure {
        background: #fff;
        border: 1px solid #e5e7eb;
        border-radius: 10px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.04);
        overflow: hidden;
        transition: box-shadow 0.2s ease, border-color 0.2s ease;
      }
      .qv-disclosure[open] {
        box-shadow: 0 4px 14px rgba(0,0,0,0.06);
        border-color: #dbe4ff;
      }
      .qv-disclosure-summary {
        list-style: none;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 12px 14px;
        cursor: pointer;
      }
      .qv-mode-note {
        margin: 10px 0;
        padding: 8px 10px;
        border-radius: 8px;
        background: #f8fafc;
        border: 1px solid #e5e7eb;
        color: #4b5563;
        font-size: 11.5px;
        line-height: 1.35;
      }
      .qv-disclosure-summary::-webkit-details-marker {
        display: none;
      }
      .qv-disclosure-title-wrap {
        display: flex;
        flex-direction: column;
        gap: 2px;
        min-width: 0;
      }
      .qv-disclosure-subtitle {
        font-size: 11.5px;
        color: #6b7280;
      }
      .qv-disclosure-body {
        padding: 0 14px 14px;
        border-top: 1px solid #f3f4f6;
      }

      .qv-panel-footer {
        display: flex;
        justify-content: flex-end;
        margin-top: 8px;
        padding-top: 8px;
        border-top: 1px solid #f3f4f6;
      }
      .qv-panel-link-btn {
        background: #ffffff;
        border: 1px solid #dbe4ff;
        border-radius: 7px;
        color: #4338ca;
        font-size: 11.5px;
        font-weight: 700;
        cursor: pointer;
        padding: 6px 9px;
      }
      .qv-panel-link-btn:hover {
        background: #eef2ff;
      }

      .qv-section-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 4px;
      }

      .qv-section-title {
        font-size: 12.5px;
        font-weight: 700;
        color: #1f2937;
      }

      .qv-section-subtitle {
        font-size: 11.5px;
        color: #6b7280;
        margin: 0 0 10px;
      }

      .qv-panel-close-btn {
        width: 24px;
        height: 24px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border: 1px solid #e5e7eb;
        border-radius: 6px;
        background: #ffffff;
        color: #6b7280;
        font-size: 18px;
        line-height: 1;
        cursor: pointer;
        padding: 0;
        font-family: inherit;
      }
      .qv-panel-close-btn:hover {
        background: #f9fafb;
        color: #111827;
      }

      .qv-tier-badge {
        font-size: 10px;
        font-weight: 700;
        padding: 2px 7px;
        border-radius: 10px;
        letter-spacing: 0.02em;
      }
      .qv-tier-badge.plus {
        background: #ede9fe;
        color: #7c3aed;
        border: 1px solid #ddd6fe;
      }
      .qv-tier-badge.pro {
        background: #fef3c7;
        color: #92400e;
        border: 1px solid #fcd34d;
      }

      /* Listing Preferences */
      .qv-pref-list {
        display: flex;
        flex-direction: column;
        gap: 2px;
        margin-bottom: 2px;
      }
      .qv-pref-item {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 5px 4px;
        border-radius: 6px;
        cursor: pointer;
        transition: background 0.15s;
        font-size: 12.5px;
        color: #374151;
        user-select: none;
      }
      .qv-pref-item:hover:not(.locked) { background: #f9fafb; }
      .qv-pref-item input[type="checkbox"] {
        width: 14px;
        height: 14px;
        cursor: pointer;
        accent-color: #4f46e5;
        flex-shrink: 0;
        margin: 0;
      }
      .qv-pref-item.locked {
        opacity: 0.45;
        cursor: not-allowed;
        pointer-events: none;
      }

      .qv-locked-msg {
        font-size: 11px;
        color: #9ca3af;
        display: flex;
        align-items: center;
        gap: 5px;
        margin-top: 8px;
        padding: 5px 8px;
        background: #f9fafb;
        border-radius: 6px;
        border: 1px dashed #e5e7eb;
      }

      .qv-suggest-row {
        display: grid;
        gap: 8px;
        margin-top: 10px;
        padding: 10px;
        border-top: 1px solid #f3f4f6;
        border: 1px solid #eef2ff;
        border-radius: 8px;
        background: #f8faff;
      }
      .qv-suggest-copy {
        display: flex;
        justify-content: space-between;
        gap: 8px;
        align-items: baseline;
      }
      .qv-suggest-title {
        font-size: 12px;
        font-weight: 700;
        color: #1f2937;
      }
      .qv-suggest-help {
        font-size: 11px;
        color: #6b7280;
      }
      .qv-suggest-controls {
        display: flex;
        gap: 6px;
      }
      .qv-suggest-input {
        flex: 1;
        padding: 7px 10px;
        border: 1px solid #d1d5db;
        border-radius: 7px;
        font-size: 12px;
        color: #374151;
        background: #f9fafb;
        outline: none;
        font-family: inherit;
        transition: border-color 0.2s, background 0.2s;
      }
      .qv-suggest-input:focus {
        border-color: #4f46e5;
        background: #fff;
        box-shadow: 0 0 0 2px rgba(79,70,229,0.08);
      }
      .qv-suggest-btn {
        padding: 7px 12px;
        background: #4f46e5;
        color: white;
        border: none;
        border-radius: 7px;
        font-size: 11.5px;
        font-weight: 600;
        cursor: pointer;
        white-space: nowrap;
        transition: background 0.2s;
        font-family: inherit;
      }
      .qv-suggest-btn:hover { background: #4338ca; }
      .qv-suggest-btn:disabled { background: #9ca3af; cursor: not-allowed; }

      /* Multi-Language Batch */
      .qv-lang-pills {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-bottom: 10px;
      }
      .qv-lang-pill {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 5px 11px;
        border: 1px solid #e5e7eb;
        border-radius: 20px;
        font-size: 12px;
        color: #374151;
        cursor: pointer;
        transition: all 0.15s;
        user-select: none;
        background: #fff;
        font-family: inherit;
        line-height: 1.2;
        appearance: none;
      }
      .qv-lang-pill:hover:not(.disabled) {
        border-color: #4f46e5;
        color: #4f46e5;
        background: #eef2ff;
      }
      .qv-lang-pill.selected {
        background: #4f46e5;
        border-color: #4f46e5;
        color: white;
      }
      .qv-lang-pill.disabled {
        opacity: 0.4;
        cursor: not-allowed;
        pointer-events: none;
      }

      .qv-multilang-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        margin-top: 4px;
        padding-top: 8px;
        border-top: 1px solid #f3f4f6;
      }
      .qv-lang-counter {
        font-size: 11.5px;
        color: #6b7280;
      }
      .qv-gen-all-btn {
        padding: 7px 14px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border: none;
        border-radius: 7px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
        white-space: nowrap;
        font-family: inherit;
      }
      .qv-gen-all-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 10px rgba(102,126,234,0.3); }
      .qv-gen-all-btn:disabled { background: #9ca3af; cursor: not-allowed; transform: none; box-shadow: none; }

      .qv-lang-results {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin-top: 10px;
      }
      .qv-lang-result-card {
        background: #f9fafb;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        padding: 10px 12px;
      }
      .qv-lang-result-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 6px;
      }
      .qv-lang-result-name {
        font-size: 12px;
        font-weight: 700;
        color: #374151;
      }
      .qv-copy-btn {
        padding: 3px 9px;
        background: transparent;
        color: #4f46e5;
        border: 1px solid #c7d2fe;
        border-radius: 5px;
        font-size: 11px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.15s;
        font-family: inherit;
      }
      .qv-copy-btn:hover { background: #eef2ff; }
      .qv-lang-result-title {
        font-size: 12px;
        font-weight: 600;
        color: #1f2937;
        margin-bottom: 3px;
      }
      .qv-lang-result-desc {
        font-size: 11.5px;
        color: #4b5563;
        line-height: 1.5;
        white-space: pre-wrap;
        max-height: 80px;
        overflow: hidden;
        mask-image: linear-gradient(to bottom, black 60%, transparent);
        -webkit-mask-image: linear-gradient(to bottom, black 60%, transparent);
      }

      /* Result Panel: Smart Re-Gen */
      .qv-regen-buttons {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 7px;
        margin-bottom: 6px;
      }
      .qv-regen-btn {
        min-width: 0;
        padding: 9px 6px;
        border: 1px solid #e5e7eb;
        background: white;
        border-radius: 8px;
        font-size: 12px;
        font-weight: 600;
        color: #374151;
        cursor: pointer;
        transition: all 0.15s;
        text-align: center;
        font-family: inherit;
        display: flex;
        flex-direction: column;
        gap: 2px;
        align-items: center;
        justify-content: center;
        line-height: 1.2;
        min-height: 52px;
      }
      .qv-regen-btn small {
        display: block;
        color: #6b7280;
        font-size: 10.5px;
        font-weight: 500;
      }
      .qv-regen-btn:hover:not(.locked) {
        border-color: #4f46e5;
        color: #4f46e5;
        background: #eef2ff;
        transform: translateY(-1px);
      }
      .qv-regen-btn:hover:not(.locked) small {
        color: #4338ca;
      }
      .qv-regen-btn.locked {
        opacity: 0.4;
        cursor: not-allowed;
        background: #f9fafb;
      }
      .qv-regen-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        transform: none;
      }
      .qv-regen-btn.loading {
        opacity: 1;
        border-color: #c7d2fe;
        background: #eef2ff;
        color: #4338ca;
      }

      .qv-credit-note { font-size: 11px; color: #9ca3af; }

      .qv-regen-locked-msg {
        margin-top: 8px;
        justify-content: center;
      }

      /* Result Panel: Completeness Check */
      .qv-completeness-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 8px;
      }
      .qv-score-badge {
        font-size: 11px;
        font-weight: 700;
        padding: 2px 9px;
        border-radius: 10px;
        background: #4f46e5;
        color: white;
      }
      .qv-score-badge.good { background: #059669; }
      .qv-score-badge.medium { background: #d97706; }
      .qv-score-badge.low { background: #dc2626; }

      .qv-score-bar-bg {
        height: 5px;
        background: #f3f4f6;
        border-radius: 3px;
        overflow: hidden;
        margin-bottom: 10px;
      }
      .qv-score-bar-fill {
        height: 100%;
        background: linear-gradient(90deg, #4f46e5, #7c3aed);
        border-radius: 3px;
        transition: width 0.5s ease;
      }
      .qv-score-bar-fill.good { background: linear-gradient(90deg, #059669, #10b981); }
      .qv-score-bar-fill.medium { background: linear-gradient(90deg, #d97706, #f59e0b); }
      .qv-score-bar-fill.low { background: linear-gradient(90deg, #dc2626, #f87171); }

      .qv-checks-list { display: flex; flex-direction: column; gap: 5px; }
      .qv-check-item {
        display: flex;
        align-items: flex-start;
        gap: 7px;
        font-size: 12px;
        line-height: 1.4;
      }
      .qv-check-icon { flex-shrink: 0; width: 16px; text-align: center; line-height: 1.5; }
      .qv-check-body { flex: 1; }
      .qv-check-label { color: #374151; }
      .qv-check-label.warn { color: #6b7280; }
      .qv-check-tip { font-size: 11px; color: #6b7280; margin-top: 1px; }
      .qv-check-upgrade {
        display: inline-flex;
        align-items: center;
        gap: 3px;
        font-size: 10.5px;
        color: #9ca3af;
        background: #f9fafb;
        border: 1px solid #e5e7eb;
        border-radius: 4px;
        padding: 1px 6px;
        white-space: nowrap;
        margin-top: 2px;
      }
    `;
    document.head.appendChild(style);
  }

  function createButton() {
    const btn = document.createElement("button");
    btn.id = BTN_ID;
    btn.innerHTML = `
        <span class="icon">${WAND_ICON_SVG}</span>
        <img class="qv-output-flag" src="https://flagcdn.com/w40/gb.png" alt="English">
        <span class="label">Generate</span>
    `;
    btn.addEventListener("click", onGenerateClick);
    return btn;
  }

  function createGenerateModeButton() {
    const btn = document.createElement("button");
    btn.id = GENERATE_MODE_BTN_ID;
    btn.type = "button";
    btn.textContent = "Multi-lang";
    btn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      toggleMultiLangPanel();
    });
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
      chrome.runtime.sendMessage({ type: "OPEN_POPUP" });
    });

    return btn;
  }

  function updateButtonUI() {
    // If not authenticated, show premium sign-in button and hide others
    if (!isAuthenticated) {
      if (signInBtn) signInBtn.style.display = "none";
      if (generateTools) generateTools.style.display = "flex";
      if (generateBtn) generateBtn.style.display = "inline-flex";
      if (generateModeBtn) generateModeBtn.style.display = "inline-flex";
      if (phoneBtn) phoneBtn.style.display = "inline-flex";
      if (prefsToggleBtn) prefsToggleBtn.style.display = "inline-flex";
      if (prefsDock) prefsDock.classList.remove("visible");
      closeFeaturePanel();
      if (resultPanel) resultPanel.style.display = "none";
      if (multiLangPanel) multiLangPanel.style.display = "none";
      if (completenessPanel) completenessPanel.style.display = "none";
      if (generateBtn) {
        generateBtn.disabled = false;
        generateBtn.style.backgroundColor = "#4f46e5";
        generateBtn.style.cursor = "pointer";
      }
      if (phoneBtn) {
        phoneBtn.disabled = false;
        phoneBtn.style.backgroundColor = "#4f46e5";
        phoneBtn.style.cursor = "pointer";
      }
      updateGenerateModeLabel();
      positionFloatingTools();
      return;
    }

    // Authenticated state
    if (signInBtn) signInBtn.style.display = "none";
    if (generateTools) generateTools.style.display = "flex";
    if (generateBtn) generateBtn.style.display = "inline-flex";
    if (generateModeBtn) generateModeBtn.style.display = "inline-flex";
    if (phoneBtn) phoneBtn.style.display = "inline-flex";
    if (prefsToggleBtn) prefsToggleBtn.style.display = "inline-flex";
    if (prefsDock) prefsDock.classList.add("visible");
    positionFloatingTools();

    if (!generateBtn) return;
    const label = generateBtn.querySelector(".label");
    const icon = generateBtn.querySelector(".icon");

    if (phoneBtn) {
      phoneBtn.disabled = false;
      phoneBtn.style.backgroundColor = "#4f46e5";
      phoneBtn.style.cursor = "pointer";
    }

    if (!label || !icon) return;

    if (isBusy) {
      generateBtn.disabled = true;
      icon.style.display = "none";
      const flag = generateBtn.querySelector(".qv-output-flag");
      if (flag) flag.style.display = "none";
      label.textContent = "Generating...";
      generateBtn.style.cursor = "progress";
      generateBtn.style.backgroundColor = "#6b7280";
      if (generateModeBtn) generateModeBtn.disabled = true;
      if (phoneBtn) phoneBtn.disabled = true;
      if (prefsToggleBtn) prefsToggleBtn.disabled = true;
    } else {
      generateBtn.disabled = false;
      icon.style.display = "inline-block";
      const flag = generateBtn.querySelector(".qv-output-flag");
      if (flag) flag.style.display = "inline-block";
      generateBtn.style.backgroundColor = "#4f46e5";
      generateBtn.style.cursor = "pointer";
      if (generateModeBtn) generateModeBtn.disabled = false;
      if (phoneBtn) phoneBtn.disabled = false;
      if (prefsToggleBtn) prefsToggleBtn.disabled = false;
      updateGenerateModeLabel();
    }
  }

  function setButtonSuccessState(imageUrls) {
    if (!generateBtn) return;
    const label = generateBtn.querySelector(".label");
    const icon = generateBtn.querySelector(".icon");
    const flag = generateBtn.querySelector(".qv-output-flag");
    if (!label || !icon) return;

    icon.style.display = "none";
    if (flag) flag.style.display = "none";
    label.textContent = "Done";

    setTimeout(() => {
      isBusy = false;
      updateButtonUI();
      updateBatchLangFooter();
      // Show result panel after DOM settles so completeness check reads fresh values
      setTimeout(() => showResultPanel(imageUrls || lastImageUrls), 50);
    }, 2000);
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

    // Get saved language preference
    const { selectedLanguage: storedLanguage = "en" } =
      await chrome.storage.local.get("selectedLanguage");
    const selectedLanguage = storedLanguage === "cs" ? "cz" : storedLanguage;
    if (selectedLanguage !== storedLanguage) {
      chrome.storage.local.set({ selectedLanguage });
    }
    const batchData = await chrome.storage.local.get([BATCH_LANGS_STORAGE_KEY]);
    const savedBatchLangs = Array.isArray(batchData[BATCH_LANGS_STORAGE_KEY])
      ? batchData[BATCH_LANGS_STORAGE_KEY]
      : [...selectedBatchLangs];
    selectedBatchLangs = new Set(
      savedBatchLangs.filter((code) =>
        BATCH_LANGS.some((lang) => lang.code === code),
      ),
    );

    const languageOptions = [
      { code: "en", name: "English" },
      { code: "fr", name: "Français" },
      { code: "nl", name: "Nederlands" },
      { code: "da", name: "Dansk" },
      { code: "cz", name: "Čeština" },
      { code: "sk", name: "Slovenčina" },
      { code: "sv", name: "Svenska" },
      { code: "de", name: "Deutsch" },
      { code: "el", name: "Ελληνικά" },
      { code: "hr", name: "Hrvatski" },
      { code: "fi", name: "Suomeksi" },
      { code: "hu", name: "Magyar" },
      { code: "it", name: "Italiano" },
      { code: "lt", name: "Lietuvių" },
      { code: "pl", name: "Polski" },
      { code: "pt", name: "Português" },
      { code: "ro", name: "Română" },
      { code: "es", name: "Español" },
    ];

    const optionsHTML = languageOptions
      .map(
        (lang) =>
          `<option value="${lang.code}" ${
            lang.code === selectedLanguage ? "selected" : ""
          }>${lang.name}</option>`,
      )
      .join("");

    modal.innerHTML = `
      <div class="modal-content">
        <button class="close-x" aria-label="Close">&times;</button>
        <div class="modal-header">
          <h3>📱 Upload from Phone</h3>
        </div>
        <p class="subtitle">Scan with your camera app</p>
        <div class="qr-container">
          <img id="qr-code" src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
            uploadUrl,
          )}" alt="QR Code" />
        </div>
        <p class="instruction">Photos will appear in this listing automatically</p>
        <div class="phone-gen-mode" role="group" aria-label="Generation mode">
          <button type="button" class="phone-mode-btn active" data-mode="single">Single language</button>
          <button type="button" class="phone-mode-btn" data-mode="multi" ${hasProAccess ? "" : "disabled"}>Multi-lang</button>
        </div>
        <div class="language-selector" id="phone-single-language">
          <div class="language-select-wrapper">
            <select class="language-select" id="modal-language-select">
              ${optionsHTML}
            </select>
          </div>
        </div>
        <div class="phone-multi-language" id="phone-multi-language" style="display:none;">
          <div class="phone-multi-header">
            <span id="phone-multi-count">No languages selected</span>
            <span class="qv-tier-badge pro">Pro</span>
          </div>
          <div class="phone-lang-pills" id="phone-lang-pills"></div>
          <div class="phone-multi-note" id="phone-multi-note">Choose languages once; your selection is saved for next time. Each language uses 1 credit.</div>
        </div>
        <div class="status waiting">Waiting for photos from phone...</div>
        <div class="modal-buttons">
          <button class="close-btn">Done</button>
          <button class="generate-btn" data-mode="single">
            <span class="icon" style="width: 14px; height: 14px; display: inline-block; margin-right: 6px;">${WAND_ICON_SVG}</span>
            <span class="qv-phone-action-label">Done + Generate</span>
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Setup language selector
    const languageSelect = modal.querySelector("#modal-language-select");
    if (languageSelect) {
      languageSelect.addEventListener("change", (e) => {
        // Save the selected language for this session and future use
        chrome.storage.local.set({ selectedLanguage: e.target.value });
      });
    }

    const generateBtnModal = modal.querySelector(".generate-btn");
    const singlePanel = modal.querySelector("#phone-single-language");
    const multiPanel = modal.querySelector("#phone-multi-language");
    const multiCount = modal.querySelector("#phone-multi-count");
    const modeButtons = modal.querySelectorAll(".phone-mode-btn");
    const phoneLangPills = modal.querySelector("#phone-lang-pills");

    function updatePhoneMultiState() {
      if (multiCount) {
        const count = selectedBatchLangs.size;
        multiCount.textContent =
          count === 0
            ? "No languages selected"
            : `${count} language${count > 1 ? "s" : ""} selected`;
      }
      if (generateBtnModal) {
        const mode = generateBtnModal.dataset.mode || "single";
        generateBtnModal.disabled =
          mode === "multi" && (!hasProAccess || selectedBatchLangs.size === 0);
        const actionLabel = generateBtnModal.querySelector(
          ".qv-phone-action-label",
        );
        if (actionLabel) {
          actionLabel.textContent =
            mode === "multi" ? "Done + Generate Multi" : "Done + Generate";
        }
      }
      if (phoneLangPills) {
        phoneLangPills.querySelectorAll(".phone-lang-pill").forEach((pill) => {
          pill.classList.toggle(
            "selected",
            selectedBatchLangs.has(pill.dataset.code),
          );
        });
      }
    }

    if (phoneLangPills) {
      BATCH_LANGS.forEach((lang) => {
        const pill = document.createElement("button");
        pill.type = "button";
        pill.className = "phone-lang-pill";
        pill.dataset.code = lang.code;
        pill.appendChild(createFlagImage(lang.code, lang.name));
        pill.appendChild(document.createTextNode(lang.name));
        pill.disabled = !hasProAccess;
        pill.addEventListener("click", () => {
          toggleBatchLang(lang.code, pill);
          updatePhoneMultiState();
        });
        phoneLangPills.appendChild(pill);
      });
    }

    modeButtons.forEach((button) => {
      button.addEventListener("click", () => {
        if (button.disabled) return;
        const mode = button.dataset.mode || "single";
        modeButtons.forEach((btn) =>
          btn.classList.toggle("active", btn === button),
        );
        if (singlePanel)
          singlePanel.style.display = mode === "single" ? "flex" : "none";
        if (multiPanel)
          multiPanel.style.display = mode === "multi" ? "block" : "none";
        if (generateBtnModal) generateBtnModal.dataset.mode = mode;
        updatePhoneMultiState();
      });
    });
    updatePhoneMultiState();

    // Close button handlers
    modal.querySelector(".close-x").addEventListener("click", closeModal);
    modal.querySelector(".close-btn").addEventListener("click", closeModal);
    modal.querySelector(".generate-btn").addEventListener("click", () => {
      const mode =
        modal.querySelector(".generate-btn")?.dataset.mode || "single";
      closeModal();
      // Trigger generate after a brief delay to ensure modal cleanup completes
      setTimeout(() => {
        if (mode === "multi") {
          onGenerateAllClick();
        } else {
          onGenerateClick();
        }
      }, 100);
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

    if (modal) {
      modal.remove();
    }
    if (pollInterval) {
      clearInterval(pollInterval);
      pollInterval = null;
    }
    downloadedFiles.clear();

    // Notify server to clean up session and delete files
    if (sessionId && chrome.runtime?.id) {
      sendMessage({
        type: "PROXY_FETCH",
        url: `${PHONE_UPLOAD_API}?sessionId=${sessionId}`,
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

    const sessionId = generateSessionId();
    await createModal(sessionId);
    startPolling(sessionId);
  }

  function startPolling(sessionId) {
    const statusEl = document.querySelector(`#${MODAL_ID} .status`);

    pollInterval = setInterval(async () => {
      try {
        // Check if extension context is still valid
        if (!chrome.runtime?.id) {
          clearInterval(pollInterval);
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
          let newFilesCount = 0;
          let importedFileCount = 0;

          for (const file of data.files) {
            if (!downloadedFiles.has(file.name)) {
              downloadedFiles.add(file.name);
              const didImport = await downloadAndInjectImage(
                file.url,
                file.name,
              );
              if (didImport) {
                newFilesCount++;
                importedFileCount++;
              }
            }
          }

          // Update status with total count
          if (statusEl) {
            const total = downloadedFiles.size;
            statusEl.className = "status";
            statusEl.textContent = `✓ ${total} file${
              total !== 1 ? "s" : ""
            } added. Ready for more...`;
          }
        } else {
          // No files yet, show waiting message
          if (statusEl && downloadedFiles.size === 0) {
            statusEl.className = "status waiting";
            statusEl.textContent = "Waiting for photos from phone...";
          } else if (statusEl && downloadedFiles.size > 0) {
            statusEl.className = "status";
            statusEl.textContent = `✓ ${downloadedFiles.size} file${
              downloadedFiles.size !== 1 ? "s" : ""
            } added. Ready for more...`;
          }
        }
      } catch (err) {
        console.error("Polling error:", err);
      }
    }, 3000);

    // Auto-close after 5 minutes of inactivity (silent, no alert)
    setTimeout(
      () => {
        if (pollInterval) {
          closeModal();
        }
      },
      5 * 60 * 1000,
    );
  }

  async function downloadAndInjectImage(url, filename) {
    try {
      const response = await sendMessage({
        type: "PROXY_FETCH",
        url: url,
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
      const file = new File([blob], filename || `upload_${Date.now()}.jpg`, {
        type: "image/jpeg",
      });

      const fileInput = document.querySelector(SELECTORS.fileInput);
      if (fileInput) {
        const dataTransfer = new DataTransfer();

        if (fileInput.files) {
          for (let i = 0; i < fileInput.files.length; i++) {
            dataTransfer.items.add(fileInput.files[i]);
          }
        }

        dataTransfer.items.add(file);

        fileInput.files = dataTransfer.files;
        fileInput.dispatchEvent(new Event("change", { bubbles: true }));

        const statusEl = document.querySelector(`#${MODAL_ID} .status`);
        if (statusEl) statusEl.textContent = "Image uploaded!";
        return true;
      }
      return false;
    } catch (err) {
      console.error("Error downloading image:", err);
      return false;
    }
  }

  async function onGenerateClick() {
    if (isBusy) return;
    if (!isAuthenticated) {
      chrome.runtime.sendMessage({ type: "OPEN_POPUP" });
      return;
    }

    const imageUrls = getUploadedImageUrls();

    if (!imageUrls.length) {
      showToast("Please upload at least one image.", "error");
      return;
    }

    isBusy = true;
    updateButtonUI();
    updateBatchLangFooter();
    await nextFrame();

    try {
      const {
        selectedLanguage: storedLanguage = "en",
        tone = "standard",
        useEmojis,
        useBulletPoints = true,
        listingPreferences = [],
      } = await chrome.storage.local.get([
        "selectedLanguage",
        "tone",
        "useEmojis",
        "useBulletPoints",
        "listingPreferences",
      ]);
      const selectedLanguage = storedLanguage === "cs" ? "cz" : storedLanguage;
      const { access_token } = await sendMessage({ type: "GET_ACCESS_TOKEN" });

      if (!access_token) {
        throw new Error(
          "Your session has expired. Please sign in again via the extension.",
        );
      }

      const compressedImages = await compressImages(imageUrls);
      lastImageUrls = compressedImages;

      const response = await fetchWithTimeout(
        `${API_BASE}/api/generate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${access_token}`,
          },
          body: JSON.stringify({
            imageUrls: compressedImages,
            languageCode: selectedLanguage,
            tone,
            useEmojis,
            useBulletPoints,
            listingPreferences: hasPlusAccess
              ? sanitizeListingPreferences(listingPreferences)
              : [],
          }),
        },
        90000,
      );

      if (response.status === 401) {
        isAuthenticated = false;
        showToast("Session expired. Please sign in again.", "error");
        isBusy = false;
        updateButtonUI();
        return;
      }
      if (response.status === 429 || response.status === 402) {
        const errData = await response.json();
        const pricingUrl = await getPricingUrl();
        showToast(
          errData.error || "You have exceeded your usage limit.",
          "error",
          { text: "Upgrade Plan", url: pricingUrl },
        );
        isBusy = false;
        updateButtonUI();
        return;
      }
      if (!response.ok) {
        const { error } = await response.json().catch(() => ({}));
        throw new Error(error || `HTTP ${response.status}`);
      }

      const { title, description, measurementAdvice } = await response.json();
      const titleInput = document.querySelector(SELECTORS.title);

      if (titleInput) {
        titleInput.value = title;
        titleInput.dispatchEvent(new Event("input", { bubbles: true }));
      }
      setTextareaValue(description);

      setButtonSuccessState(compressedImages);
      await maybeShowMeasurementAdvice(measurementAdvice);
    } catch (err) {
      console.error("AutoLister AI Error:", err);
      const message =
        err.name === "AbortError"
          ? "Generation timed out. Please try again."
          : err.message || "An unexpected error occurred.";
      showToast(message, "error");
      isBusy = false;
      updateButtonUI();
      updateBatchLangFooter();
    }
  }

  // --- INJECTION & OBSERVATION LOGIC ---

  function injectButton() {
    try {
      const existingBtn = document.getElementById(BTN_ID);
      if (existingBtn) {
        generateBtn = existingBtn;
        generateTools = document.getElementById(GENERATE_TOOLS_ID);
        generateModeBtn = document.getElementById(GENERATE_MODE_BTN_ID);
        phoneBtn = document.getElementById(PHONE_BTN_ID);
        signInBtn = document.getElementById(SIGN_IN_BTN_ID);
        prefsToggleBtn = document.getElementById(PREFS_TOGGLE_BTN_ID);
        prefsDock = document.getElementById(PREFS_DOCK_ID);
        featurePanel = document.getElementById(FEATURE_PANEL_ID);
        resultPanel = document.getElementById(RESULT_PANEL_ID);
        multiLangPanel = document.getElementById(MULTILANG_PANEL_ID);
        completenessPanel = document.getElementById(COMPLETENESS_PANEL_ID);
        return true;
      }

      const titleEl = document.querySelector(SELECTORS.title);
      const descEl = document.querySelector(SELECTORS.description);
      if (!titleEl || !descEl) return false;

      [
        FEATURE_PANEL_ID,
        RESULT_PANEL_ID,
        MULTILANG_PANEL_ID,
        COMPLETENESS_PANEL_ID,
      ].forEach((id) => {
        document.getElementById(id)?.remove();
      });

      const titleDescriptionCard =
        document
          .querySelector('[data-testid="title"]')
          ?.closest(".web_ui__Card__card") ||
        document
          .querySelector('[data-testid="description"]')
          ?.closest(".web_ui__Card__card") ||
        titleEl.closest(".web_ui__Card__card") ||
        descEl.closest(".web_ui__Card__card") ||
        titleEl.closest('label[data-testid="title"]')?.parentElement ||
        titleEl.parentElement;

      const btnContainer = document.createElement("div");
      btnContainer.id = GENERATE_TOOLS_ID;
      btnContainer.style.margin = "0 0 10px";
      btnContainer.style.display = "flex";

      const toolsWrapper = document.createElement("div");
      toolsWrapper.className = "qv-toolbar";
      toolsWrapper.style.display = "flex";
      toolsWrapper.style.alignItems = "center";
      toolsWrapper.style.gap = "6px";
      toolsWrapper.style.flexWrap = "nowrap";

      generateBtn = createButton();
      generateModeBtn = createGenerateModeButton();
      phoneBtn = createPhoneButton();
      signInBtn = createSignInComponent();
      prefsToggleBtn = createPrefsToggleButton();
      featurePanel = createFeaturePanel();

      toolsWrapper.appendChild(generateBtn);
      toolsWrapper.appendChild(generateModeBtn);
      toolsWrapper.appendChild(phoneBtn);
      toolsWrapper.appendChild(prefsToggleBtn);

      resultPanel = createResultPanel();
      multiLangPanel = createMultiLangPanel();
      completenessPanel = createCompletenessPanel();

      btnContainer.appendChild(toolsWrapper);
      btnContainer.appendChild(signInBtn);

      if (titleDescriptionCard?.parentNode) {
        titleDescriptionCard.parentNode.insertBefore(
          btnContainer,
          titleDescriptionCard,
        );
      } else {
        document.body.appendChild(btnContainer);
      }
      document.body.appendChild(featurePanel);
      document.body.appendChild(resultPanel);
      document.body.appendChild(multiLangPanel);
      document.body.appendChild(completenessPanel);
      restorePrefState();
      restoreBatchLangState();
      updateFeaturePanelAccess();
      updateMultiLangPanelAccess();
      updateButtonUI();
      positionFloatingTools();

      // Wire up suggestion submit
      const suggestBtn = document.getElementById("qv-suggest-btn");
      if (suggestBtn) suggestBtn.addEventListener("click", onSubmitSuggestion);
      const suggestInput = document.getElementById("qv-suggest-input");
      if (suggestInput) {
        suggestInput.addEventListener("keydown", (e) => {
          if (e.key === "Enter") onSubmitSuggestion();
        });
      }

      // Wire up Generate All
      const genAllBtn = document.getElementById("qv-gen-all-btn");
      if (genAllBtn) genAllBtn.addEventListener("click", onGenerateAllClick);

      const fullSettingsBtn = document.getElementById("qv-open-full-settings");
      if (fullSettingsBtn) {
        fullSettingsBtn.addEventListener("click", () => {
          closeFeaturePanel();
          chrome.runtime.sendMessage({ type: "OPEN_POPUP" });
        });
      }

      return true;
    } catch (error) {
      console.error("QuickVint injection failed:", error);
      return false;
    }
  }

  function startInjectionObserver() {
    injectButton();
    const pollInterval = setInterval(() => {
      injectButton();
    }, 1000);

    const observer = new MutationObserver(() => {
      injectButton();
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  // --- INITIALIZATION ---

  function init() {
    injectStylesheet();
    initializeAuthState();
    document.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (
        featurePanel &&
        prefsToggleBtn &&
        !featurePanel.contains(target) &&
        !prefsToggleBtn.contains(target)
      ) {
        closeFeaturePanel();
      }
      if (
        multiLangPanel &&
        generateModeBtn &&
        !multiLangPanel.contains(target) &&
        !generateModeBtn.contains(target)
      ) {
        toggleMultiLangPanel(false);
      }
    });
    window.addEventListener("resize", positionFloatingTools);
    window.addEventListener("scroll", positionFloatingTools, true);
    startInjectionObserver();
  }

  init();
})();
