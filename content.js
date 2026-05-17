(() => {
  // --- CONSTANTS & CONFIGURATION ---
  const BTN_ID = "quickvint-gen-btn";
  const PHONE_BTN_ID = "quickvint-phone-btn";
  const SIGN_IN_BTN_ID = "quickvint-signin-btn";
  const MODAL_ID = "quickvint-phone-modal";
  const API_BASE = "https://autolister.app";
  const PHONE_API_BASE = "https://autolister.app";
  const PHONE_UPLOAD_PAGE = `${PHONE_API_BASE}/phone-upload`;
  const PHONE_UPLOAD_API = `${PHONE_API_BASE}/api/phone-upload`;
  const MAX_PHONE_UPLOAD_PREVIEWS = 7;
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
  const WAND_ICON_SVG = `<svg fill="#ffffff" viewBox="0 0 512 512" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"> <path d="M454.321,219.727l-38.766-51.947l20.815-61.385c2.046-6.032,0.489-12.704-4.015-17.208 c-4.504-4.504-11.175-6.061-17.208-4.015l-61.384,20.815l-51.951-38.766c-5.103-3.809-11.929-4.392-17.605-1.499 c-5.676,2.893-9.217,8.755-9.136,15.125l0.829,64.815l-52.923,37.426c-5.201,3.678-7.863,9.989-6.867,16.282 c0.996,6.291,5.479,11.471,11.561,13.363l43.844,13.63L14.443,483.432c-6.535,6.534-6.535,17.131,0,23.666s17.131,6.535,23.666,0 l257.073-257.072l13.629,43.843c2.172,6.986,8.638,11.768,15.984,11.768c5.375,0,10.494-2.595,13.66-7.072l37.426-52.923 l64.815,0.828c6.322,0.051,12.233-3.462,15.125-9.136S458.131,224.833,454.321,219.727z"></path> <polygon points="173.373,67.274 160.014,42.848 146.656,67.274 122.23,80.632 146.656,93.992 160.014,118.417 173.373,93.992 197.799,80.632 "></polygon> <polygon points="362.946,384.489 352.14,364.731 341.335,384.489 321.577,395.294 341.335,406.1 352.14,425.856 362.946,406.1 382.703,395.294 "></polygon> <polygon points="378.142,19.757 367.337,0 356.531,19.757 336.774,30.563 356.531,41.369 367.337,61.126 378.142,41.369 397.9,30.563 "></polygon> <polygon points="490.635,142.513 484.167,130.689 477.701,142.513 465.876,148.979 477.701,155.446 484.167,167.27 490.635,155.446 502.458,148.979 "></polygon> <polygon points="492.626,294.117 465.876,301.951 439.128,294.117 446.962,320.865 439.128,347.615 465.876,339.781 492.626,347.615 484.791,320.865 "></polygon> </svg>`;
  const PHONE_ICON_SVG = `<svg fill="#ffffff" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z"/></svg>`;

  // --- STATE ---
  let generateBtn = null;
  let phoneBtn = null;
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
          resolve(`https://autolister.app/pricing?token=${token}`);
        } catch (e) {
          console.error("Error building pricing URL:", e);
          resolve("https://autolister.app/pricing");
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
        padding: 32px;
        border-radius: 20px;
        text-align: center;
        max-width: 430px;
        width: 90%;
        max-height: calc(100vh - 32px);
        overflow-y: auto;
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
      
      #${MODAL_ID} .modal-flag-icon {
        position: absolute;
        left: 12px;
        top: 50%;
        transform: translateY(-50%);
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
      return;
    }

    // Authenticated state
    if (signInBtn) signInBtn.style.display = "none";
    if (generateBtn) generateBtn.style.display = "flex";
    if (phoneBtn) phoneBtn.style.display = "flex";

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
    const { selectedLanguage = "en" } =
      await chrome.storage.local.get("selectedLanguage");
    const selectedModalLanguage =
      selectedLanguage === "cs" ? "cz" : selectedLanguage;

    const languageOptions = [
      { code: "en", name: "English", flag: "gb", flagAlt: "UK Flag" },
      { code: "fr", name: "Français", flag: "fr", flagAlt: "French Flag" },
      { code: "cz", name: "Čeština", flag: "cz", flagAlt: "Czech Flag" },
      { code: "da", name: "Dansk", flag: "dk", flagAlt: "Danish Flag" },
      { code: "nl", name: "Nederlands", flag: "nl", flagAlt: "Dutch Flag" },
      { code: "de", name: "Deutsch", flag: "de", flagAlt: "German Flag" },
      { code: "el", name: "Ελληνικά", flag: "gr", flagAlt: "Greek Flag" },
      { code: "hr", name: "Hrvatski", flag: "hr", flagAlt: "Croatian Flag" },
      { code: "fi", name: "Suomeksi", flag: "fi", flagAlt: "Finnish Flag" },
      { code: "hu", name: "Magyar", flag: "hu", flagAlt: "Hungarian Flag" },
      { code: "it", name: "Italiano", flag: "it", flagAlt: "Italian Flag" },
      { code: "lt", name: "Lietuvių", flag: "lt", flagAlt: "Lithuanian Flag" },
      { code: "pl", name: "Polski", flag: "pl", flagAlt: "Polish Flag" },
      { code: "pt", name: "Português", flag: "pt", flagAlt: "Portuguese Flag" },
      { code: "ro", name: "Română", flag: "ro", flagAlt: "Romanian Flag" },
      { code: "es", name: "Español", flag: "es", flagAlt: "Spanish Flag" },
      { code: "sk", name: "Slovenčina", flag: "sk", flagAlt: "Slovak Flag" },
      { code: "sv", name: "Svenska", flag: "se", flagAlt: "Swedish Flag" },
    ];
    const selectedLanguageOption =
      languageOptions.find((lang) => lang.code === selectedModalLanguage) ||
      languageOptions[0];

    const optionsHTML = languageOptions
      .map(
        (lang) =>
          `<option value="${lang.code}" ${
            lang.code === selectedLanguageOption.code ? "selected" : ""
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
              <span>Waiting for photos</span>
              <span class="preview-dot"></span>
            </span>
          </div>
        </div>
        <div class="language-selector">
          <div class="language-select-wrapper">
            <img
              class="modal-flag-icon"
              src="https://flagcdn.com/w40/${selectedLanguageOption.flag}.png"
              alt="${selectedLanguageOption.flagAlt}"
            />
            <select class="language-select" id="modal-language-select">
              ${optionsHTML}
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

    // Setup language selector
    const languageSelect = modal.querySelector("#modal-language-select");
    const languageFlag = modal.querySelector(".modal-flag-icon");
    if (languageSelect) {
      languageSelect.addEventListener("change", (e) => {
        const selectedOption = languageOptions.find(
          (lang) => lang.code === e.target.value,
        );
        if (languageFlag && selectedOption) {
          languageFlag.src = `https://flagcdn.com/w40/${selectedOption.flag}.png`;
          languageFlag.alt = selectedOption.flagAlt;
        }
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

    if (document.getElementById(MODAL_ID)) {
      closeModal();
    }

    const sessionId = generateSessionId();
    await createModal(sessionId);
    startPolling(sessionId);
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
                  schedulePhoneUploadPreviewReveal();
                } else {
                  downloads.forEach((result) => {
                    if (result.previewUrl) URL.revokeObjectURL(result.previewUrl);
                  });
                }
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
      <span>Waiting for photos</span>
      <span class="preview-dot"></span>
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

  async function onGenerateClick() {
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

    try {
      const {
        selectedLanguage = "en",
        tone = "standard",
        useEmojis,
        useBulletPoints = true,
      } = await chrome.storage.local.get([
        "selectedLanguage",
        "tone",
        "useEmojis",
        "useBulletPoints",
      ]);
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
        },
        body: JSON.stringify({
          imageUrls: compressedImages,
          languageCode: selectedLanguage,
          tone,
          useEmojis,
          useBulletPoints,
        }),
      });

      if (response.status === 401) {
        isAuthenticated = false;
        showToast("Session expired. Please sign in again.", "error");
        isBusy = false;
        updateButtonUI();
        return;
      }
      if (response.status === 429) {
        const errData = await response.json();
        const pricingUrl = await getPricingUrl();
        showToast(
          errData.error || "You have exceeded your daily/monthly usage limit.",
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

      setButtonSuccessState();

      // Show measurement advice if available
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
    }
  }

  // --- INJECTION & OBSERVATION LOGIC ---

  function injectButton() {
    const existingBtn = document.getElementById(BTN_ID);
    if (existingBtn) {
      generateBtn = existingBtn;
      phoneBtn = document.getElementById(PHONE_BTN_ID);
      signInBtn = document.getElementById(SIGN_IN_BTN_ID);
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
      signInBtn = createSignInComponent();

      toolsWrapper.appendChild(generateBtn);
      toolsWrapper.appendChild(phoneBtn);

      btnContainer.appendChild(toolsWrapper);
      btnContainer.appendChild(signInBtn);

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
