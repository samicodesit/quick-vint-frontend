(() => {
  const SELECTORS = {
    title: 'input[data-testid="title--input"]',
    description: 'textarea[data-testid="description--input"]',
    images: '[data-testid="media-select-grid"] img',
  };
  const BTN_ID = "quickvint-gen-btn";
  const API_BASE = "https://quick-vint.vercel.app";
  let isAuthenticated = false;
  let accessToken = null;
  let generateBtn = null;

  // debounce helper
  const debounce = (fn, ms) => {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), ms);
    };
  };

  // read auth + token from storage
  function updateAuthFromStorage() {
    chrome.storage.local.get("supabaseSession", ({ supabaseSession }) => {
      isAuthenticated = !!(supabaseSession && supabaseSession.access_token);
      accessToken = supabaseSession?.access_token ?? null;
      updateButton();
    });
  }
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.supabaseSession) updateAuthFromStorage();
  });

  function createButton() {
    const btn = document.createElement("button");
    btn.id = BTN_ID;
    btn.textContent = "🪄 Generate";
    Object.assign(btn.style, {
      margin: "8px 0",
      padding: "8px 14px",
      color: "#fff",
      backgroundColor: "#aaa",
      border: "none",
      borderRadius: "6px",
      fontSize: "14px",
      cursor: "not-allowed",
      transition: "background-color 0.2s",
    });
    btn.disabled = true;
    btn.addEventListener("click", onGenerate);
    return btn;
  }

  function updateButton() {
    if (!generateBtn) return;
    if (isAuthenticated) {
      generateBtn.disabled = false;
      generateBtn.textContent = "🪄 Generate";
      generateBtn.style.backgroundColor = "#4f46e5";
      generateBtn.style.cursor = "pointer";
    } else {
      generateBtn.disabled = true;
      generateBtn.textContent = "Sign in via Extension";
      generateBtn.style.backgroundColor = "#aaa";
      generateBtn.style.cursor = "not-allowed";
    }
  }

  async function onGenerate() {
    if (!isAuthenticated) {
      alert("Please sign in via the extension popup.");
      return;
    }
    const imgs = Array.from(document.querySelectorAll(SELECTORS.images))
      .map((i) => i.src)
      .filter(Boolean);
    if (!imgs.length) {
      alert("Upload at least one image.");
      return;
    }
    generateBtn.disabled = true;
    generateBtn.textContent = "⏳ Generating…";
    try {
      const res = await fetch(`${API_BASE}/api/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ imageUrls: imgs }),
      });
      if (res.status === 401) {
        isAuthenticated = false;
        updateButton();
        alert("Session expired. Please sign in again.");
        return;
      }
      if (res.status === 429) {
        const err = (await res.json()).error || "Rate limit exceeded";
        alert(err);
        return;
      }
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({}));
        throw new Error(error || `HTTP ${res.status}`);
      }
      const { title, description } = await res.json();
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
      generateBtn.textContent = "✅ Done";
      setTimeout(updateButton, 2000);
    } catch (err) {
      console.error(err);
      alert(`Error: ${err.message}`);
      updateButton();
    }
  }

  function injectButton() {
    const titleEl = document.querySelector(SELECTORS.title);
    if (!titleEl) return;
    if (!document.getElementById(BTN_ID)) {
      const container = titleEl.closest("div");
      if (!container) return;
      container.parentNode.insertBefore(createButton(), container.nextSibling);
    }
    if (!generateBtn) generateBtn = document.getElementById(BTN_ID);
    updateButton();
  }

  const observer = new MutationObserver(debounce(injectButton, 300));
  observer.observe(document.body, { childList: true, subtree: true });

  // init
  updateAuthFromStorage();
})();
