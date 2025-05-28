// content.js
(function quickVintExtension() {
  const TITLE_SELECTOR = 'input[data-testid="title--input"]';
  const DESC_SELECTOR = 'textarea[data-testid="description--input"]';
  const BTN_ID = "quickvint-gen-btn";
  const API_BASE_URL = "https://quick-vint.vercel.app";
  let IS_USER_AUTHENTICATED = false;
  let generateBtnElement = null;

  function updateButtonState() {
    if (!generateBtnElement) return;
    if (IS_USER_AUTHENTICATED) {
      generateBtnElement.disabled = false;
      generateBtnElement.textContent = "🪄 Generate";
      generateBtnElement.style.background = "#4f46e5";
      generateBtnElement.style.cursor = "pointer";
    } else {
      generateBtnElement.disabled = true;
      generateBtnElement.textContent = "Sign in via Extension";
      generateBtnElement.style.background = "#aaa";
      generateBtnElement.style.cursor = "not-allowed";
    }
  }

  async function handleGenerateClick() {
    if (!IS_USER_AUTHENTICATED) {
      alert("Please sign in via the AutoLister AI extension popup first!");
      return;
    }

    generateBtnElement.disabled = true;
    generateBtnElement.textContent = "⏳ Generating…";

    const images = document.querySelectorAll(
      '[data-testid="media-select-grid"] img'
    );
    const urls = Array.from(images)
      .map((i) => i.src)
      .filter(Boolean);
    if (!urls.length) {
      alert("No photos found. Upload at least one image first.");
      updateButtonState();
      return;
    }

    try {
      const authResponse = await chrome.runtime.sendMessage({
        type: "GET_AUTH_TOKEN",
      });
      if (!authResponse || !authResponse.token) {
        IS_USER_AUTHENTICATED = false;
        updateButtonState();
        alert(
          "Authentication failed. Please sign in via the extension popup and refresh the page."
        );
        return;
      }
      const authToken = authResponse.token;

      const res = await fetch(`${API_BASE_URL}/api/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ imageUrls: urls }),
      });

      if (res.status === 401) {
        IS_USER_AUTHENTICATED = false;
        updateButtonState();
        alert(
          "Your session may have expired. Please sign in again via the extension popup and refresh the page."
        );
        return;
      }
      if (res.status === 429) {
        const errorData = await res.json();
        alert(
          errorData.error ||
            "API limit reached. Please check your subscription or try again later."
        );
        updateButtonState();
        return;
      }
      if (!res.ok) {
        let errorText = `HTTP error ${res.status}`;
        try {
          const errorData = await res.json();
          errorText = errorData.error || errorText;
        } catch (e) {
          /* ignore */
        }
        throw new Error(errorText);
      }

      const { title, description } = await res.json();
      const titleInput = document.querySelector(TITLE_SELECTOR);
      const descTextarea = document.querySelector(DESC_SELECTOR);

      if (titleInput) {
        titleInput.value = title;
        titleInput.dispatchEvent(new Event("input", { bubbles: true }));
      }
      if (descTextarea) {
        descTextarea.value = description;
        descTextarea.dispatchEvent(new Event("input", { bubbles: true }));
      }

      generateBtnElement.textContent = "✅ Done";
      setTimeout(() => updateButtonState(), 2000);
    } catch (err) {
      console.error("Generation failed:", err);
      alert(`Generation failed: ${err.message}. See console for more details.`);
      updateButtonState();
    }
  }

  function injectGenerateButton() {
    const titleInput = document.querySelector(TITLE_SELECTOR);
    if (!titleInput) return; // Form not ready

    if (!document.getElementById(BTN_ID)) {
      // Inject only if not present
      const descTextarea = document.querySelector(DESC_SELECTOR);
      if (!descTextarea) return;

      generateBtnElement = document.createElement("button");
      generateBtnElement.id = BTN_ID;
      Object.assign(generateBtnElement.style, {
        marginTop: "8px",
        padding: "8px 14px",
        color: "#fff",
        border: "none",
        borderRadius: "6px",
        fontSize: "14px",
        transition: "background-color 0.2s, opacity 0.2s",
      });

      // Insert after the parent of the title input for better layout consistency
      if (titleInput.parentElement && titleInput.parentElement.parentElement) {
        titleInput.parentElement.parentElement.insertBefore(
          generateBtnElement,
          titleInput.parentElement.nextSibling
        );
      } else {
        // Fallback, less ideal
        titleInput.parentElement.appendChild(generateBtnElement);
      }
      generateBtnElement.addEventListener("click", handleGenerateClick);
    } else {
      generateBtnElement = document.getElementById(BTN_ID); // Get existing button
    }
    updateButtonState(); // Always update state (e.g. if auth changed while page was open)
  }

  const observer = new MutationObserver(debounce(injectGenerateButton, 300));
  observer.observe(document.body, { childList: true, subtree: true });

  function debounce(fn, delay) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  }

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "AUTH_STATE_CHANGED") {
      IS_USER_AUTHENTICATED = request.authenticated;
      updateButtonState();
    }
    // Content scripts typically don't send responses for these notifications
  });

  async function initialAuthCheck() {
    try {
      const authResponse = await chrome.runtime.sendMessage({
        type: "GET_AUTH_TOKEN",
      });
      IS_USER_AUTHENTICATED = !!(authResponse && authResponse.token);
    } catch (e) {
      console.warn(
        "Content.js: Could not get initial auth state. Background script might not be ready.",
        e.message
      );
      IS_USER_AUTHENTICATED = false;
    }
    injectGenerateButton();
  }

  // Run initial checks
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialAuthCheck);
  } else {
    initialAuthCheck();
  }
})();
