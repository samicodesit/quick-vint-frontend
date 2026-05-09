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
    images: '[data-testid="media-select-grid"] img',
  };
  const WAND_ICON_SVG = `<svg fill="#ffffff" viewBox="0 0 512 512" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"> <path d="M454.321,219.727l-38.766-51.947l20.815-61.385c2.046-6.032,0.489-12.704-4.015-17.208 c-4.504-4.504-11.175-6.061-17.208-4.015l-61.384,20.815l-51.951-38.766c-5.103-3.809-11.929-4.392-17.605-1.499 c-5.676,2.893-9.217,8.755-9.136,15.125l0.829,64.815l-52.923,37.426c-5.201,3.678-7.863,9.989-6.867,16.282 c0.996,6.291,5.479,11.471,11.561,13.363l43.844,13.63L14.443,483.432c-6.535,6.534-6.535,17.131,0,23.666s17.131,6.535,23.666,0 l257.073-257.072l13.629,43.843c2.172,6.986,8.638,11.768,15.984,11.768c5.375,0,10.494-2.595,13.66-7.072l37.426-52.923 l64.815,0.828c6.322,0.051,12.233-3.462,15.125-9.136S458.131,224.833,454.321,219.727z"></path> <polygon points="173.373,67.274 160.014,42.848 146.656,67.274 122.23,80.632 146.656,93.992 160.014,118.417 173.373,93.992 197.799,80.632 "></polygon> <polygon points="362.946,384.489 352.14,364.731 341.335,384.489 321.577,395.294 341.335,406.1 352.14,425.856 362.946,406.1 382.703,395.294 "></polygon> <polygon points="378.142,19.757 367.337,0 356.531,19.757 336.774,30.563 356.531,41.369 367.337,61.126 378.142,41.369 397.9,30.563 "></polygon> <polygon points="490.635,142.513 484.167,130.689 477.701,142.513 465.876,148.979 477.701,155.446 484.167,167.27 490.635,155.446 502.458,148.979 "></polygon> <polygon points="492.626,294.117 465.876,301.951 439.128,294.117 446.962,320.865 439.128,347.615 465.876,339.781 492.626,347.615 484.791,320.865 "></polygon> </svg>`;
  const PHONE_ICON_SVG = `<svg fill="#ffffff" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z"/></svg>`;

  const FEATURE_PANEL_ID = "quickvint-feature-panel";
  const RESULT_PANEL_ID = "quickvint-result-panel";

  const LISTING_PREFS = [
    { id: "measurements", label: "Mention item measurements" },
    { id: "smoke_pet_free", label: '"Smoke-free, pet-free home"' },
    { id: "shipping_speed", label: "Mention shipping speed" },
    { id: "closing_line", label: "Add a friendly closing line" },
    { id: "fabric_material", label: "Mention fabric/material when visible" },
    { id: "true_to_size", label: "Note if item is true to size" },
    { id: "retail_price", label: "Mention original retail price if known" },
    { id: "care_instructions", label: "Include care instructions" },
  ];

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
  let isBusy = false;
  let isAuthenticated = false;
  let pollInterval = null;
  let downloadedFiles = new Set();
  let hasPlusAccess = false;
  let hasProAccess = false;
  let featurePanel = null;
  let resultPanel = null;
  let lastImageUrls = [];
  let selectedBatchLangs = new Set();

  // --- HELPER FUNCTIONS ---

  function showToast(message, type = "error", action = null, autoHide = true) {
    let toast = document.getElementById("quickvint-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "quickvint-toast";
      document.body.appendChild(toast);
    }

    const icon = type === "success" ? "✅" : type === "info" ? "ℹ️" : "⚠️";
    let messageHtml = `<span>${message}</span>`;

    if (action && action.text && action.url) {
      messageHtml += `<a href="${action.url}" target="_blank" style="margin-left: 12px; color: inherit; text-decoration: underline; font-weight: 700; white-space: nowrap;">${action.text} &rarr;</a>`;
    }

    // Updated HTML structure with close button
    toast.innerHTML = `
      <span class="toast-icon">${icon}</span>
      <div class="toast-content">${messageHtml}</div>
      <button class="toast-close" aria-label="Close">×</button>
    `;

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

  // --- TIER ACCESS ---

  async function loadAccessLevel() {
    return new Promise((resolve) => {
      chrome.storage.local.get(["userProfile"], (data) => {
        const tier = data.userProfile?.subscription_tier || "free";
        const isLegacy = !!data.userProfile?.is_legacy_plan;
        if (isLegacy) {
          // Legacy pro/business get Plus+Pro access; legacy starter/free get nothing
          hasPlusAccess = ["pro", "business"].includes(tier);
          hasProAccess = ["pro", "business"].includes(tier);
        } else {
          hasPlusAccess = ["plus", "pro_v2", "business_v2"].includes(tier);
          hasProAccess = ["pro_v2", "business_v2"].includes(tier);
        }
        resolve();
      });
    });
  }

  // --- FEATURE PANEL (Preferences + Multi-lang) ---

  function createFeaturePanel() {
    const panel = document.createElement("div");
    panel.id = FEATURE_PANEL_ID;

    // ── Listing Preferences ──────────────────────────────────
    const prefsSection = document.createElement("div");
    prefsSection.className = "qv-section";

    const prefsHeader = document.createElement("div");
    prefsHeader.className = "qv-section-header";
    prefsHeader.innerHTML = `
      <span class="qv-section-title">🎨 Listing Preferences</span>
      <span class="qv-tier-badge plus">Plus</span>
    `;

    const prefList = document.createElement("div");
    prefList.className = "qv-pref-list";
    prefList.id = "qv-pref-list";

    LISTING_PREFS.forEach((pref) => {
      const item = document.createElement("label");
      item.className = "qv-pref-item" + (hasPlusAccess ? "" : " locked");
      item.dataset.prefId = pref.id;
      item.innerHTML = `<input type="checkbox" value="${pref.id}" ${hasPlusAccess ? "" : "disabled"}> ${pref.label}`;
      if (hasPlusAccess) {
        item.querySelector("input").addEventListener("change", savePrefState);
      }
      prefList.appendChild(item);
    });

    const lockedMsgPrefs = document.createElement("div");
    lockedMsgPrefs.className = "qv-locked-msg";
    lockedMsgPrefs.id = "qv-prefs-locked-msg";
    lockedMsgPrefs.textContent = "🔒 Available on Plus — upgrade to personalise every listing";
    lockedMsgPrefs.style.display = hasPlusAccess ? "none" : "flex";

    const suggestRow = document.createElement("div");
    suggestRow.className = "qv-suggest-row";
    suggestRow.innerHTML = `
      <input type="text" class="qv-suggest-input" id="qv-suggest-input"
        placeholder="Suggest a new preference…" maxlength="200">
      <button class="qv-suggest-btn" id="qv-suggest-btn">Submit</button>
    `;

    prefsSection.appendChild(prefsHeader);
    prefsSection.appendChild(prefList);
    prefsSection.appendChild(lockedMsgPrefs);
    prefsSection.appendChild(suggestRow);

    // ── Multi-Language Batch ──────────────────────────────────
    const mlSection = document.createElement("div");
    mlSection.className = "qv-section";

    const mlHeader = document.createElement("div");
    mlHeader.className = "qv-section-header";
    mlHeader.innerHTML = `
      <span class="qv-section-title">🌍 Multi-Language Generation</span>
      <span class="qv-tier-badge pro">Pro</span>
    `;

    const langPills = document.createElement("div");
    langPills.className = "qv-lang-pills";
    langPills.id = "qv-lang-pills";

    BATCH_LANGS.forEach((lang) => {
      const pill = document.createElement("div");
      pill.className = "qv-lang-pill" + (hasProAccess ? "" : " disabled");
      pill.dataset.code = lang.code;
      pill.innerHTML = `${lang.flag} ${lang.name}`;
      if (hasProAccess) {
        pill.addEventListener("click", () => toggleBatchLang(lang.code, pill));
      }
      langPills.appendChild(pill);
    });

    const lockedMsgML = document.createElement("div");
    lockedMsgML.className = "qv-locked-msg";
    lockedMsgML.id = "qv-ml-locked-msg";
    lockedMsgML.textContent = "🔒 Available on Pro — generate in multiple languages at once";
    lockedMsgML.style.display = hasProAccess ? "none" : "flex";

    const mlFooter = document.createElement("div");
    mlFooter.className = "qv-multilang-footer";
    mlFooter.style.display = hasProAccess ? "" : "none";
    mlFooter.innerHTML = `
      <span class="qv-lang-counter" id="qv-lang-counter">Select languages to generate at once</span>
      <button class="qv-gen-all-btn" id="qv-gen-all-btn" disabled>Generate All</button>
    `;

    const langResults = document.createElement("div");
    langResults.className = "qv-lang-results";
    langResults.id = "qv-lang-results";

    mlSection.appendChild(mlHeader);
    mlSection.appendChild(langPills);
    mlSection.appendChild(lockedMsgML);
    mlSection.appendChild(mlFooter);
    mlSection.appendChild(langResults);

    panel.appendChild(prefsSection);
    panel.appendChild(mlSection);

    return panel;
  }

  function savePrefState() {
    const checked = [];
    document.querySelectorAll("#qv-pref-list input:checked").forEach((cb) => {
      checked.push(cb.value);
    });
    chrome.storage.local.set({ listingPreferences: checked });
  }

  function restorePrefState() {
    chrome.storage.local.get(["listingPreferences"], (data) => {
      const saved = data.listingPreferences || [];
      document.querySelectorAll("#qv-pref-list input").forEach((cb) => {
        cb.checked = saved.includes(cb.value);
      });
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
    updateBatchLangFooter();
  }

  function updateBatchLangFooter() {
    const counter = document.getElementById("qv-lang-counter");
    const btn = document.getElementById("qv-gen-all-btn");
    const n = selectedBatchLangs.size;
    if (counter) {
      counter.textContent = n === 0
        ? "Select languages to generate at once"
        : `Selected: ${n} language${n > 1 ? "s" : ""} → ${n} credit${n > 1 ? "s" : ""}`;
    }
    if (btn) btn.disabled = n === 0 || isBusy;
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
          cb.addEventListener("change", savePrefState);
        }
      } else {
        item.classList.add("locked");
        if (cb) cb.disabled = true;
      }
    });
    const prefsLockedMsg = document.getElementById("qv-prefs-locked-msg");
    if (prefsLockedMsg) prefsLockedMsg.style.display = hasPlusAccess ? "none" : "flex";

    // Multi-lang pills
    featurePanel.querySelectorAll(".qv-lang-pill").forEach((pill) => {
      if (hasProAccess) {
        pill.classList.remove("disabled");
        const code = pill.dataset.code;
        pill.onclick = () => toggleBatchLang(code, pill);
      } else {
        pill.classList.add("disabled");
        pill.onclick = null;
      }
    });
    const mlLockedMsg = document.getElementById("qv-ml-locked-msg");
    if (mlLockedMsg) mlLockedMsg.style.display = hasProAccess ? "none" : "flex";

    const mlFooter = featurePanel.querySelector(".qv-multilang-footer");
    if (mlFooter) mlFooter.style.display = hasProAccess ? "" : "none";

    const genAllBtn = document.getElementById("qv-gen-all-btn");
    if (genAllBtn) genAllBtn.disabled = selectedBatchLangs.size === 0 || isBusy;
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
        if (lastImageUrls.length) btn.onclick = () => onRegenClick(style, lastImageUrls);
      } else {
        btn.classList.add("locked");
        btn.disabled = true;
        btn.onclick = null;
      }
    });
    const lockedMsg = document.getElementById("qv-regen-locked-msg");
    if (lockedMsg) lockedMsg.style.display = hasPlusAccess ? "none" : "flex";
  }

  // --- RESULT PANEL (Smart Re-Gen + Completeness) ---

  function createResultPanel() {
    const panel = document.createElement("div");
    panel.id = RESULT_PANEL_ID;
    panel.style.display = "none";

    // ── Smart Re-Gen ──────────────────────────────────────────
    const regenSection = document.createElement("div");
    regenSection.className = "qv-section";

    regenSection.innerHTML = `
      <div class="qv-section-header">
        <span class="qv-section-title">↻ Re-generate as:</span>
      </div>
      <div class="qv-regen-buttons">
        <button class="qv-regen-btn${hasPlusAccess ? "" : " locked"}" id="qv-regen-detailed"
          ${hasPlusAccess ? "" : "disabled"}>📝 Detailed</button>
        <button class="qv-regen-btn${hasPlusAccess ? "" : " locked"}" id="qv-regen-casual"
          ${hasPlusAccess ? "" : "disabled"}>💬 Casual</button>
        <button class="qv-regen-btn${hasPlusAccess ? "" : " locked"}" id="qv-regen-short"
          ${hasPlusAccess ? "" : "disabled"}>✂️ Short</button>
      </div>
      <div class="qv-locked-msg" id="qv-regen-locked-msg" style="display:${hasPlusAccess ? "none" : "flex"}">🔒 Available on Plus — directional re-generation</div>
      <div class="qv-regen-divider">
        <div class="qv-regen-divider-line"></div>
        <span class="qv-regen-divider-text">or just re-run</span>
        <div class="qv-regen-divider-line"></div>
      </div>
      <div class="qv-basic-regen-row">
        <button class="qv-basic-regen-btn" id="qv-basic-regen">↻ Regenerate</button>
        <span class="qv-credit-note">Costs 1 credit</span>
      </div>
    `;

    // ── Listing Completeness ──────────────────────────────────
    const completenessSection = document.createElement("div");
    completenessSection.className = "qv-section";
    completenessSection.id = "qv-completeness-section";
    completenessSection.innerHTML = `
      <div class="qv-completeness-header">
        <span class="qv-section-title">Listing Completeness</span>
        <span class="qv-score-badge" id="qv-score-badge">—/8</span>
      </div>
      <div class="qv-score-bar-bg">
        <div class="qv-score-bar-fill" id="qv-score-bar-fill" style="width:0%"></div>
      </div>
      <div class="qv-checks-list" id="qv-checks-list"></div>
    `;

    panel.appendChild(regenSection);
    panel.appendChild(completenessSection);

    return panel;
  }

  function runCompletenessCheck() {
    const titleEl = document.querySelector(SELECTORS.title);
    const descEl = document.querySelector(SELECTORS.description);
    const images = Array.from(document.querySelectorAll(SELECTORS.images));

    const title = titleEl?.value || "";
    const desc = descEl?.value || "";
    const photoCount = images.length;

    const checks = [];

    // 1. Title length
    const titleLen = title.length;
    checks.push({
      pass: titleLen >= 40,
      label: `Title length (${titleLen}/100 chars)`,
      tip: `Aim for 40+ chars out of Vinted's 100-char limit`,
    });

    // 2. Description length
    const descLen = desc.length;
    checks.push({
      pass: descLen >= 100,
      label: `Description length (${descLen} chars)`,
      tip: `Expand to 100+ chars for better search indexing`,
    });

    // 3. Photo count
    checks.push({
      pass: photoCount >= 5,
      label: `Photos: ${photoCount} uploaded`,
      tip: `Add ${Math.max(0, 8 - photoCount)} more photos — 8+ gets better visibility`,
    });

    // 4. Hashtags
    const hashtagCount = (desc.match(/#\w+/g) || []).length;
    checks.push({
      pass: hashtagCount >= 3,
      label: `Hashtags: ${hashtagCount} found`,
      tip: `Add 3+ hashtags to improve search discoverability`,
    });

    // 5. Brand in title (starts with capitalised word)
    const brandMatch = /^[A-Z][a-zA-Z]+/.test(title.trim());
    checks.push({
      pass: brandMatch,
      label: brandMatch ? "Brand detected in title" : "Brand not detected in title",
      tip: "Start your title with the brand name to improve discoverability",
    });

    // 6. Size mentioned
    const sizePattern = /\b(XS|S|M|L|XL|XXL|XXXL|\d{1,3}\/\d{1,3}|\bsize\b|\btaille\b|\bmaat\b)/i;
    const hasSize = sizePattern.test(title) || sizePattern.test(desc);
    checks.push({
      pass: hasSize,
      label: hasSize ? "Size mentioned" : "Size not mentioned",
      tip: "Add the size to title or description — buyers filter by size",
    });

    // 7. Color mentioned
    const colorPattern = /\b(black|white|blue|red|green|yellow|grey|gray|brown|pink|purple|orange|beige|navy|cream|noir|blanc|bleu|rouge|vert|gris|schwarz|weiß|blau|rot|grün|zwart|wit|blauw|rood|groen|geel|grijs|bruin|roze)\b/i;
    const hasColor = colorPattern.test(title) || colorPattern.test(desc);
    checks.push({
      pass: hasColor,
      label: hasColor ? "Color mentioned" : "Color not mentioned",
      tip: "Include the color — buyers often search by color",
    });

    // 8. Material mentioned
    const materialPattern = /\b(cotton|polyester|wool|linen|silk|leather|denim|cashmere|velvet|satin|nylon|viscose|coton|laine|soie|cuir|katoen|wol|zijde|leer|baumwolle|wolle|seide|leder)\b/i;
    const hasMaterial = materialPattern.test(desc);
    checks.push({
      pass: hasMaterial,
      label: hasMaterial ? "Material mentioned" : "Material not mentioned",
      tip: "Mention the fabric/material — helps buyers know what they're getting",
    });

    const score = checks.filter((c) => c.pass).length;
    return { score, total: checks.length, checks };
  }

  function showResultPanel(imageUrls) {
    if (!resultPanel) return;
    resultPanel.style.display = "block";

    // Wire basic regen (available to all tiers)
    const basicBtn = document.getElementById("qv-basic-regen");
    if (basicBtn) basicBtn.onclick = () => onRegenClick(null, imageUrls);

    // Wire directional regen buttons (Plus+ only) and update their locked state
    updateResultPanelAccess();

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
    list.innerHTML = "";

    checks.forEach((check) => {
      const item = document.createElement("div");
      item.className = "qv-check-item";

      const icon = check.pass ? "✅" : "⚠️";
      let bodyHtml;

      if (check.pass) {
        bodyHtml = `<span class="qv-check-label">${check.label}</span>`;
      } else if (hasProAccess) {
        bodyHtml = `
          <span class="qv-check-label warn">${check.label}</span>
          <div class="qv-check-tip">${check.tip}</div>
        `;
      } else {
        bodyHtml = `
          <span class="qv-check-label warn">${check.label}</span>
          <div><span class="qv-check-upgrade">🔒 Upgrade for tips</span></div>
        `;
      }

      item.innerHTML = `
        <span class="qv-check-icon">${icon}</span>
        <div class="qv-check-body">${bodyHtml}</div>
      `;
      list.appendChild(item);
    });
  }

  // --- REGEN & BATCH GENERATE ---

  async function onRegenClick(style, imageUrls) {
    const urls = imageUrls || lastImageUrls;
    if (!urls.length) {
      showToast("No images to re-generate from.", "error");
      return;
    }

    isBusy = true;
    updateButtonUI();
    updateBatchLangFooter();

    // Temporarily label the basic regen btn
    const basicBtn = document.getElementById("qv-basic-regen");
    if (basicBtn) {
      basicBtn.disabled = true;
      basicBtn.textContent = "⏳ Generating…";
    }

    try {
      const {
        selectedLanguage = "en",
        tone = "standard",
        useEmojis,
        useBulletPoints = true,
        listingPreferences = [],
      } = await chrome.storage.local.get([
        "selectedLanguage", "tone", "useEmojis", "useBulletPoints", "listingPreferences",
      ]);
      const { access_token } = await sendMessage({ type: "GET_ACCESS_TOKEN" });
      if (!access_token) throw new Error("Session expired. Please sign in again.");

      const response = await fetch(`${API_BASE}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${access_token}` },
        body: JSON.stringify({
          imageUrls: urls,
          languageCode: selectedLanguage,
          tone,
          useEmojis,
          useBulletPoints,
          regenStyle: style || undefined,
          listingPreferences: hasPlusAccess ? listingPreferences : [],
        }),
      });

      if (response.status === 401) { isAuthenticated = false; showToast("Session expired.", "error"); return; }
      if (response.status === 429 || response.status === 402) {
        const errData = await response.json();
        const pricingUrl = await getPricingUrl();
        showToast(errData.error || "Credit limit reached.", "error", { text: "Upgrade Plan", url: pricingUrl });
        return;
      }
      if (!response.ok) {
        const { error } = await response.json().catch(() => ({}));
        throw new Error(error || `HTTP ${response.status}`);
      }

      const { title, description, measurementAdvice } = await response.json();
      const titleInput = document.querySelector(SELECTORS.title);
      const descInput = document.querySelector(SELECTORS.description);
      if (titleInput) { titleInput.value = title; titleInput.dispatchEvent(new Event("input", { bubbles: true })); }
      if (descInput) { descInput.value = description; descInput.dispatchEvent(new Event("input", { bubbles: true })); }

      if (measurementAdvice?.trim()) {
        setTimeout(() => showToast(measurementAdvice, "info", null, false), 300);
      }

      setTimeout(() => updateCompletenessUI(), 100);
    } catch (err) {
      showToast(err.message || "Generation failed.", "error");
    } finally {
      isBusy = false;
      updateButtonUI();
      updateBatchLangFooter();
      if (basicBtn) {
        basicBtn.disabled = false;
        basicBtn.textContent = "↻ Regenerate";
      }
    }
  }

  async function onGenerateAllClick() {
    if (!hasProAccess || selectedBatchLangs.size === 0) return;
    if (lastImageUrls.length === 0) {
      showToast("Generate a listing first, then use batch generation.", "error");
      return;
    }

    const btn = document.getElementById("qv-gen-all-btn");
    if (btn) { btn.disabled = true; btn.textContent = "⏳ Generating…"; }

    const langResults = document.getElementById("qv-lang-results");
    if (langResults) langResults.innerHTML = "";

    try {
      const {
        tone = "standard",
        useEmojis,
        useBulletPoints = true,
        listingPreferences = [],
      } = await chrome.storage.local.get(["tone", "useEmojis", "useBulletPoints", "listingPreferences"]);
      const { access_token } = await sendMessage({ type: "GET_ACCESS_TOKEN" });
      if (!access_token) throw new Error("Session expired.");

      const langList = BATCH_LANGS.filter((l) => selectedBatchLangs.has(l.code));

      for (const lang of langList) {
        // Show loading card
        if (langResults) {
          const loadingCard = document.createElement("div");
          loadingCard.className = "qv-lang-result-card";
          loadingCard.id = `qv-result-${lang.code}`;
          loadingCard.innerHTML = `<div class="qv-lang-result-name">${lang.flag} ${lang.name}</div><div style="font-size:11.5px;color:#9ca3af;margin-top:6px">⏳ Generating…</div>`;
          langResults.appendChild(loadingCard);
        }

        try {
          const response = await fetch(`${API_BASE}/api/generate`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${access_token}` },
            body: JSON.stringify({
              imageUrls: lastImageUrls,
              languageCode: lang.code,
              tone,
              useEmojis,
              useBulletPoints,
              listingPreferences: hasPlusAccess ? listingPreferences : [],
            }),
          });

          const card = document.getElementById(`qv-result-${lang.code}`);
          if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            if (card) card.innerHTML = `<div class="qv-lang-result-name">${lang.flag} ${lang.name}</div><div style="font-size:11.5px;color:#dc2626;margin-top:6px">⚠️ ${err.error || "Generation failed"}</div>`;
            continue;
          }

          const { title, description } = await response.json();
          const copyText = `${title}\n\n${description}`;

          if (card) {
            card.innerHTML = `
              <div class="qv-lang-result-header">
                <span class="qv-lang-result-name">${lang.flag} ${lang.name}</span>
                <button class="qv-copy-btn">Copy</button>
              </div>
              <div class="qv-lang-result-title">${title}</div>
              <div class="qv-lang-result-desc">${description.replace(/</g, "&lt;")}</div>
            `;
            card.querySelector(".qv-copy-btn").onclick = () => {
              navigator.clipboard.writeText(copyText).then(() => {
                card.querySelector(".qv-copy-btn").textContent = "Copied!";
                setTimeout(() => { const b = card.querySelector(".qv-copy-btn"); if (b) b.textContent = "Copy"; }, 1500);
              });
            };
          }
        } catch (e) {
          const card = document.getElementById(`qv-result-${lang.code}`);
          if (card) card.innerHTML += `<div style="font-size:11.5px;color:#dc2626">⚠️ Error: ${e.message}</div>`;
        }
      }
    } catch (err) {
      showToast(err.message || "Batch generation failed.", "error");
    } finally {
      if (btn) { btn.disabled = selectedBatchLangs.size === 0; btn.textContent = "Generate All"; }
    }
  }

  async function onSubmitSuggestion() {
    const input = document.getElementById("qv-suggest-input");
    const btn = document.getElementById("qv-suggest-btn");
    if (!input || !btn) return;

    const text = input.value.trim();
    if (text.length < 5) { showToast("Please enter at least 5 characters.", "error"); return; }
    if (text.length > 200) { showToast("Suggestion must be under 200 characters.", "error"); return; }

    btn.disabled = true;
    btn.textContent = "Sending…";

    try {
      const { access_token } = await sendMessage({ type: "GET_ACCESS_TOKEN" });
      if (!access_token) throw new Error("Session expired.");

      const response = await fetch(`${API_BASE}/api/suggestions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${access_token}` },
        body: JSON.stringify({ suggestion: text }),
      });

      if (!response.ok) throw new Error("Server error");

      input.value = "";
      btn.textContent = "✓ Sent!";
      setTimeout(() => { btn.textContent = "Submit"; btn.disabled = false; }, 2000);
      showToast("Thanks! Your suggestion has been sent to the AutoLister team.", "success");
    } catch (err) {
      btn.textContent = "Submit";
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
          restorePrefState();
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
        updateResultPanelAccess();
      });
    }
  });

  // --- UI ---

  function injectStylesheet() {
    const style = document.createElement("style");
    style.textContent = `
      #${BTN_ID}, #${PHONE_BTN_ID} {
        display: none;
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
        padding: 40px;
        border-radius: 24px;
        text-align: center;
        max-width: 380px;
        width: 90%;
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
      
      #${MODAL_ID} img {
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
        margin: 0 0 20px;
        display: flex;
        justify-content: center;
        position: relative;
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
      #${RESULT_PANEL_ID} {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 13px;
        color: #1f2937;
      }

      .qv-section {
        background: #fff;
        border: 1px solid #e5e7eb;
        border-radius: 10px;
        padding: 12px 14px;
        margin-top: 10px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.04);
      }

      .qv-section-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 10px;
      }

      .qv-section-title {
        font-size: 12.5px;
        font-weight: 700;
        color: #1f2937;
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
        display: flex;
        gap: 6px;
        margin-top: 10px;
        padding-top: 10px;
        border-top: 1px solid #f3f4f6;
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
        gap: 4px;
        padding: 5px 11px;
        border: 1px solid #e5e7eb;
        border-radius: 20px;
        font-size: 12px;
        color: #374151;
        cursor: pointer;
        transition: all 0.15s;
        user-select: none;
        background: #fff;
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
        display: flex;
        gap: 6px;
        margin-bottom: 6px;
      }
      .qv-regen-btn {
        flex: 1;
        padding: 8px 4px;
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
      }
      .qv-regen-btn:hover:not(.locked) {
        border-color: #4f46e5;
        color: #4f46e5;
        background: #eef2ff;
        transform: translateY(-1px);
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

      .qv-regen-divider {
        display: flex;
        align-items: center;
        gap: 8px;
        margin: 8px 0;
      }
      .qv-regen-divider-line { flex: 1; height: 1px; background: #f3f4f6; }
      .qv-regen-divider-text { font-size: 10.5px; color: #9ca3af; white-space: nowrap; }

      .qv-basic-regen-row {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .qv-basic-regen-btn {
        padding: 7px 14px;
        background: #f3f4f6;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        font-size: 12.5px;
        font-weight: 600;
        color: #374151;
        cursor: pointer;
        transition: all 0.15s;
        font-family: inherit;
      }
      .qv-basic-regen-btn:hover { background: #e5e7eb; }
      .qv-basic-regen-btn:disabled { opacity: 0.5; cursor: not-allowed; }
      .qv-credit-note { font-size: 11px; color: #9ca3af; }

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
      if (signInBtn) signInBtn.style.display = "flex";
      if (generateBtn) generateBtn.style.display = "none";
      if (phoneBtn) phoneBtn.style.display = "none";
      if (featurePanel) featurePanel.style.display = "none";
      return;
    }

    // Authenticated state
    if (signInBtn) signInBtn.style.display = "none";
    if (generateBtn) generateBtn.style.display = "flex";
    if (phoneBtn) phoneBtn.style.display = "flex";
    if (featurePanel) featurePanel.style.display = "";

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
      label.textContent = "⏳ Generating…";
      generateBtn.style.cursor = "progress";
      generateBtn.style.backgroundColor = "#6b7280";
    } else {
      generateBtn.disabled = false;
      icon.style.display = "inline-block";
      label.textContent = "Generate";
      generateBtn.style.backgroundColor = "#4f46e5";
      generateBtn.style.cursor = "pointer";
    }
  }

  function setButtonSuccessState(imageUrls) {
    if (!generateBtn) return;
    const label = generateBtn.querySelector(".label");
    const icon = generateBtn.querySelector(".icon");
    if (!label || !icon) return;

    icon.style.display = "none";
    label.textContent = "✅ Done";

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
    const { selectedLanguage = "en" } =
      await chrome.storage.local.get("selectedLanguage");

    const languageOptions = [
      { code: "en", name: "English" },
      { code: "fr", name: "Français" },
      { code: "nl", name: "Nederlands" },
      { code: "da", name: "Dansk" },
      { code: "cs", name: "Čeština" },
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
          <span class="feature-pill">NEW · Free to test</span>
        </div>
        <p class="subtitle">Scan with your camera app</p>
        <div class="qr-container">
          <img id="qr-code" src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
            uploadUrl,
          )}" alt="QR Code" />
        </div>
        <p class="instruction">Photos will appear in this listing automatically</p>
        <div class="language-selector">
          <div class="language-select-wrapper">
            <select class="language-select" id="modal-language-select">
              ${optionsHTML}
            </select>
          </div>
        </div>
        <div class="status waiting">Waiting for photos from phone...</div>
        <div class="modal-buttons">
          <button class="close-btn">Done</button>
          <button class="generate-btn">
            <span class="icon" style="width: 14px; height: 14px; display: inline-block; margin-right: 6px;">${WAND_ICON_SVG}</span>
            Done + Generate
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

          for (const file of data.files) {
            if (!downloadedFiles.has(file.name)) {
              downloadedFiles.add(file.name);
              newFilesCount++;
              await downloadAndInjectImage(file.url, file.name);
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

      const fileInput = document.querySelector('input[type="file"]');
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
      }
    } catch (err) {
      console.error("Error downloading image:", err);
    }
  }

  async function onGenerateClick() {
    if (!isAuthenticated) {
      chrome.runtime.sendMessage({ type: "OPEN_POPUP" });
      return;
    }

    const rawImageUrls = Array.from(document.querySelectorAll(SELECTORS.images))
      .map((img) => img.src)
      .filter(Boolean);

    if (!rawImageUrls.length) {
      showToast("Please upload at least one image.", "error");
      return;
    }

    isBusy = true;
    updateButtonUI();
    updateBatchLangFooter();

    try {
      const {
        selectedLanguage = "en",
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
      const { access_token } = await sendMessage({ type: "GET_ACCESS_TOKEN" });

      if (!access_token) {
        throw new Error(
          "Your session has expired. Please sign in again via the extension.",
        );
      }

      const compressedImages = await compressImages(rawImageUrls);
      lastImageUrls = compressedImages;

      const response = await fetch(`${API_BASE}/api/generate`, {
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
          listingPreferences: hasPlusAccess ? listingPreferences : [],
        }),
      });

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
      const descInput = document.querySelector(SELECTORS.description);

      if (titleInput) {
        titleInput.value = title;
        titleInput.dispatchEvent(new Event("input", { bubbles: true }));
      }
      if (descInput) {
        descInput.value = description;
        descInput.dispatchEvent(new Event("input", { bubbles: true }));
      }

      setButtonSuccessState(compressedImages);

      if (measurementAdvice && measurementAdvice.trim()) {
        setTimeout(() => {
          showToast(measurementAdvice, "info", null, false);
        }, 300);
      }
    } catch (err) {
      console.error("AutoLister AI Error:", err);
      showToast(err.message || "An unexpected error occurred.", "error");
      isBusy = false;
      updateButtonUI();
      updateBatchLangFooter();
    }
  }

  // --- INJECTION & OBSERVATION LOGIC ---

  function injectButton() {
    const existingBtn = document.getElementById(BTN_ID);
    if (existingBtn) {
      generateBtn = existingBtn;
      phoneBtn = document.getElementById(PHONE_BTN_ID);
      signInBtn = document.getElementById(SIGN_IN_BTN_ID);
      featurePanel = document.getElementById(FEATURE_PANEL_ID);
      resultPanel = document.getElementById(RESULT_PANEL_ID);
      updateButtonUI();
      return true;
    }

    const titleEl = document.querySelector(SELECTORS.title);
    if (!titleEl) return false;

    const container = titleEl.closest("div");
    if (container && container.parentNode) {
      const btnContainer = document.createElement("div");
      btnContainer.style.marginTop = "20px";

      // Button row
      const toolsWrapper = document.createElement("div");
      toolsWrapper.style.display = "flex";
      toolsWrapper.style.alignItems = "center";

      generateBtn = createButton();
      phoneBtn = createPhoneButton();
      signInBtn = createSignInComponent();

      toolsWrapper.appendChild(generateBtn);
      toolsWrapper.appendChild(phoneBtn);

      // Result panel (Smart Re-Gen + Completeness) — hidden until first generation
      resultPanel = createResultPanel();

      // Feature panel (Preferences + Multi-lang) — always visible when authenticated
      featurePanel = createFeaturePanel();

      btnContainer.appendChild(toolsWrapper);
      btnContainer.appendChild(signInBtn);
      btnContainer.appendChild(resultPanel);
      btnContainer.appendChild(featurePanel);

      container.parentNode.insertBefore(btnContainer, container.nextSibling);
      updateButtonUI();

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
