(() => {
  if (window.location.origin !== "https://autolister.app") return;
  const key = "autolister.first_touch.v1";
  let delivered = null;
  let pending = null;

  function transfer() {
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw || raw.length > 4096) return;
      const value = JSON.parse(raw);
      if (!value || typeof value !== "object" || Array.isArray(value)) return;
      // Only source fields from this size-limited record can cross over. This
      // bridge never reads an auth session, a complete URL or any other key.
      const attribution = {};
      for (const field of ["source", "medium", "campaign", "content", "capturedAt", "referrerHost"]) {
        attribution[field] = typeof value[field] === "string" ? value[field] : null;
      }
      const snapshot = JSON.stringify(attribution);
      if (snapshot === delivered || snapshot === pending) return;
      pending = snapshot;
      chrome.runtime.sendMessage({ type: "CAPTURE_ATTRIBUTION", attribution }, response => {
        const failed = chrome.runtime.lastError;
        if (!failed && response?.ok) delivered = snapshot;
        if (pending === snapshot) pending = null;
      });
    } catch { pending = null; }
  }

  document.addEventListener("autolister:attribution-ready", transfer);
  window.addEventListener("storage", event => { if (event.key === key) transfer(); });
  transfer();
})();
