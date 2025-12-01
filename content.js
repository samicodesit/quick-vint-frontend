(() => {
  // --- CONSTANTS & CONFIGURATION ---
  const BTN_ID = "quickvint-gen-btn";
  const API_BASE = "https://quick-vint.vercel.app";
  const SELECTORS = {
    title: 'input[data-testid="title--input"]',
    description: 'textarea[data-testid="description--input"]',
    images: '[data-testid="media-select-grid"] img',
  };
  const WAND_ICON_SVG = `<svg fill="#ffffff" viewBox="0 0 512 512" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"> <path d="M454.321,219.727l-38.766-51.947l20.815-61.385c2.046-6.032,0.489-12.704-4.015-17.208 c-4.504-4.504-11.175-6.061-17.208-4.015l-61.384,20.815l-51.951-38.766c-5.103-3.809-11.929-4.392-17.605-1.499 c-5.676,2.893-9.217,8.755-9.136,15.125l0.829,64.815l-52.923,37.426c-5.201,3.678-7.863,9.989-6.867,16.282 c0.996,6.291,5.479,11.471,11.561,13.363l43.844,13.63L14.443,483.432c-6.535,6.534-6.535,17.131,0,23.666s17.131,6.535,23.666,0 l257.073-257.072l13.629,43.843c2.172,6.986,8.638,11.768,15.984,11.768c5.375,0,10.494-2.595,13.66-7.072l37.426-52.923 l64.815,0.828c6.322,0.051,12.233-3.462,15.125-9.136S458.131,224.833,454.321,219.727z"></path> <polygon points="173.373,67.274 160.014,42.848 146.656,67.274 122.23,80.632 146.656,93.992 160.014,118.417 173.373,93.992 197.799,80.632 "></polygon> <polygon points="362.946,384.489 352.14,364.731 341.335,384.489 321.577,395.294 341.335,406.1 352.14,425.856 362.946,406.1 382.703,395.294 "></polygon> <polygon points="378.142,19.757 367.337,0 356.531,19.757 336.774,30.563 356.531,41.369 367.337,61.126 378.142,41.369 397.9,30.563 "></polygon> <polygon points="490.635,142.513 484.167,130.689 477.701,142.513 465.876,148.979 477.701,155.446 484.167,167.27 490.635,155.446 502.458,148.979 "></polygon> <polygon points="492.626,294.117 465.876,301.951 439.128,294.117 446.962,320.865 439.128,347.615 465.876,339.781 492.626,347.615 484.791,320.865 "></polygon> </svg>`;

  // --- STATE ---
  let generateBtn = null;
  let isBusy = false;
  let isAuthenticated = false;

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
      #${BTN_ID} {
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 8px 0;
        padding: 8px 14px;
        color: #fff;
        background-color: #aaa;
        border: none;
        border-radius: 6px;
        font-size: 14px;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        cursor: not-allowed;
        transition: background-color 0.2s, transform 0.2s, box-shadow 0.2s;
        max-width: 150px;
        font-weight: 500;
        box-shadow: rgba(0, 0, 0, 0.1) 0px 2px 4px;
        min-width: 130px;
        text-align: center;
        white-space: nowrap;
        overflow: hidden;
      }
      #${BTN_ID}:not(:disabled):hover {
        background-color: #4338ca;
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
        transform: translateY(-1px);
      }
      #${BTN_ID} .icon {
        width: 16px;
        height: 16px;
        margin-right: 6px;
      }
      #${BTN_ID} .label {
        text-overflow: ellipsis;
        overflow: hidden;
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

  function updateButtonUI() {
    if (!generateBtn) return;
    const label = generateBtn.querySelector(".label");
    const icon = generateBtn.querySelector(".icon");
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
        useEmojis = true,
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
      generateBtn = createButton();
      container.parentNode.insertBefore(generateBtn, container.nextSibling);
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
