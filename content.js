(() => {
  // --- CONSTANTS & CONFIGURATION ---
  const BTN_ID = "quickvint-gen-btn";
  const PHONE_BTN_ID = "quickvint-phone-btn";
  const MODAL_ID = "quickvint-phone-modal";
  const API_BASE = "https://quick-vint.vercel.app";
  const PHONE_API_BASE = "https://quick-vint.vercel.app";
  const PHONE_UPLOAD_PAGE = `${PHONE_API_BASE}/phone-upload.html`;
  const PHONE_UPLOAD_API = `${PHONE_API_BASE}/api/phone-upload`;
  const SELECTORS = {
    title: 'input[data-testid="title--input"]',
    description: 'textarea[data-testid="description--input"]',
    images: '[data-testid="media-select-grid"] img',
  };
  const WAND_ICON_SVG = `<svg fill="#ffffff" viewBox="0 0 512 512" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"> <path d="M454.321,219.727l-38.766-51.947l20.815-61.385c2.046-6.032,0.489-12.704-4.015-17.208 c-4.504-4.504-11.175-6.061-17.208-4.015l-61.384,20.815l-51.951-38.766c-5.103-3.809-11.929-4.392-17.605-1.499 c-5.676,2.893-9.217,8.755-9.136,15.125l0.829,64.815l-52.923,37.426c-5.201,3.678-7.863,9.989-6.867,16.282 c0.996,6.291,5.479,11.471,11.561,13.363l43.844,13.63L14.443,483.432c-6.535,6.534-6.535,17.131,0,23.666s17.131,6.535,23.666,0 l257.073-257.072l13.629,43.843c2.172,6.986,8.638,11.768,15.984,11.768c5.375,0,10.494-2.595,13.66-7.072l37.426-52.923 l64.815,0.828c6.322,0.051,12.233-3.462,15.125-9.136S458.131,224.833,454.321,219.727z"></path> <polygon points="173.373,67.274 160.014,42.848 146.656,67.274 122.23,80.632 146.656,93.992 160.014,118.417 173.373,93.992 197.799,80.632 "></polygon> <polygon points="362.946,384.489 352.14,364.731 341.335,384.489 321.577,395.294 341.335,406.1 352.14,425.856 362.946,406.1 382.703,395.294 "></polygon> <polygon points="378.142,19.757 367.337,0 356.531,19.757 336.774,30.563 356.531,41.369 367.337,61.126 378.142,41.369 397.9,30.563 "></polygon> <polygon points="490.635,142.513 484.167,130.689 477.701,142.513 465.876,148.979 477.701,155.446 484.167,167.27 490.635,155.446 502.458,148.979 "></polygon> <polygon points="492.626,294.117 465.876,301.951 439.128,294.117 446.962,320.865 439.128,347.615 465.876,339.781 492.626,347.615 484.791,320.865 "></polygon> </svg>`;
  const PHONE_ICON_SVG = `<svg fill="#ffffff" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z"/></svg>`;

  // --- STATE ---
  let generateBtn = null;
  let phoneBtn = null;
  let isBusy = false;
  let isAuthenticated = false;
  let pollInterval = null;
  let downloadedFiles = new Set();

  // --- HELPER FUNCTIONS ---

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
  });

  // --- UI ---

  function injectStylesheet() {
    const style = document.createElement("style");
    style.textContent = `
      #${BTN_ID}, #${PHONE_BTN_ID} {
        display: flex;
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
      }
        text-align: center;
      }
    `;
    document.head.appendChild(style);
  }

  function createButton() {
    const btn = document.createElement("button");
    btn.id = BTN_ID;
    btn.disabled = true;
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

  function updateButtonUI() {
    if (!generateBtn) return;
    const label = generateBtn.querySelector(".label");
    const icon = generateBtn.querySelector(".icon");

    // Update Phone Button as well
    if (phoneBtn) {
      if (isAuthenticated) {
        phoneBtn.disabled = false;
        phoneBtn.style.backgroundColor = "#4f46e5";
        phoneBtn.style.cursor = "pointer";
      } else {
        phoneBtn.disabled = true;
        phoneBtn.style.backgroundColor = "#aaa";
        phoneBtn.style.cursor = "not-allowed";
      }
    }

    if (!label || !icon) return;

    if (isBusy) {
      generateBtn.disabled = true;
      icon.style.display = "none";
      label.textContent = "⏳ Generating…";
      generateBtn.style.cursor = "progress";
      generateBtn.style.backgroundColor = "#6b7280";
    } else if (isAuthenticated) {
      generateBtn.disabled = false;
      icon.style.display = "inline-block";
      label.textContent = "Generate";
      generateBtn.style.backgroundColor = "#4f46e5";
      generateBtn.style.cursor = "pointer";
    } else {
      generateBtn.disabled = true;
      icon.style.display = "none";
      label.textContent = "Sign in via Extension";
      generateBtn.style.backgroundColor = "#aaa";
      generateBtn.style.cursor = "not-allowed";
    }
  }

  function setButtonSuccessState() {
    if (!generateBtn) return;
    const label = generateBtn.querySelector(".label");
    const icon = generateBtn.querySelector(".icon");
    if (!label || !icon) return;

    icon.style.display = "none";
    label.textContent = "✅ Done";

    setTimeout(() => {
      isBusy = false;
      updateButtonUI();
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
    const { selectedLanguage = "en" } = await chrome.storage.local.get(
      "selectedLanguage"
    );

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
          }>${lang.name}</option>`
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
            uploadUrl
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
        <div class="disclaimer">
          <strong>Note:</strong> This feature will soon be available exclusively to Pro & Business plans.
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
      alert("Please sign in via the extension popup first.");
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
    setTimeout(() => {
      if (pollInterval) {
        closeModal();
      }
    }, 5 * 60 * 1000);
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
          response ? response.error : "Failed to download image via proxy"
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
      alert("Please sign in via the extension popup first.");
      return;
    }

    const imageUrls = Array.from(document.querySelectorAll(SELECTORS.images))
      .map((img) => img.src)
      .filter(Boolean);

    if (!imageUrls.length) {
      alert("Upload at least one image.");
      return;
    }

    isBusy = true;
    updateButtonUI();

    try {
      const {
        selectedLanguage = "en",
        tone = "standard",
        useEmojis,
      } = await chrome.storage.local.get([
        "selectedLanguage",
        "tone",
        "useEmojis",
      ]);
      const { access_token } = await sendMessage({ type: "GET_ACCESS_TOKEN" });

      if (!access_token) {
        throw new Error(
          "Your session has expired. Please sign in again via the extension."
        );
      }

      // Compress images before sending to API to reduce token usage
      const compressedImages = await compressImages(imageUrls);

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
        }),
      });

      if (response.status === 401) {
        isAuthenticated = false;
        alert("Session expired. Please sign in again.");
        isBusy = false;
        updateButtonUI();
        return;
      }
      if (response.status === 429) {
        const errData = await response.json();
        alert(
          errData.error || "You have exceeded your daily/monthly usage limit."
        );
        isBusy = false;
        updateButtonUI();
        return;
      }
      if (!response.ok) {
        const { error } = await response.json().catch(() => ({}));
        throw new Error(error || `HTTP ${response.status}`);
      }

      const { title, description } = await response.json();
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

      setButtonSuccessState();
    } catch (err) {
      console.error("AutoLister AI Error:", err);
      alert(`Error: ${err.message}`);
      isBusy = false;
      updateButtonUI();
    }
  }

  // --- INJECTION & OBSERVATION LOGIC ---

  function injectButton() {
    if (document.getElementById(BTN_ID)) return true;

    const titleEl = document.querySelector(SELECTORS.title);
    if (!titleEl) return false;

    const container = titleEl.closest("div");
    if (container && container.parentNode) {
      const btnContainer = document.createElement("div");
      btnContainer.style.display = "flex";
      btnContainer.style.alignItems = "center";
      btnContainer.style.marginTop = "20px";

      generateBtn = createButton();
      phoneBtn = createPhoneButton();

      btnContainer.appendChild(generateBtn);
      btnContainer.appendChild(phoneBtn);

      container.parentNode.insertBefore(btnContainer, container.nextSibling);
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
