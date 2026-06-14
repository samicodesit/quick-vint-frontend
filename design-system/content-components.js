(async () => {
  const CONSTANTS = {
    BTN_ID: "quickvint-gen-btn",
    PHONE_BTN_ID: "quickvint-phone-btn",
    SIGN_IN_BTN_ID: "quickvint-signin-btn",
    MODAL_ID: "quickvint-phone-modal",
  };

  const statusEl = document.getElementById("sourceStatus");
  const warningEl = document.getElementById("loadWarning");

  function extractContentStyles(source) {
    const match = source.match(
      /style\.textContent = `([\s\S]*?)`;\s*document\.head\.appendChild\(style\);/,
    );
    if (!match) return "";

    return match[1].replace(/\$\{([A-Z_]+)\}/g, (_, key) => {
      return CONSTANTS[key] || "";
    });
  }

  function injectRealStyles(css) {
    const style = document.createElement("style");
    style.textContent = css;
    document.head.appendChild(style);
  }

  function renderPaywall(stage, { title, message, actionText }) {
    stage.innerHTML = `
      <div id="quickvint-toast" class="paywall visible floating">
        <div class="paywall-body">
          <div class="paywall-header">
            <div class="paywall-mark" aria-hidden="true">AI</div>
            <div>
              <div class="paywall-kicker">AutoLister AI</div>
              <div class="paywall-title">${title}</div>
            </div>
          </div>
          <div class="paywall-message">${message}</div>
          <a class="paywall-action" href="#" onclick="return false;">
            <span>${actionText}</span>
            <span aria-hidden="true">→</span>
          </a>
        </div>
        <button class="toast-close paywall-close" aria-label="Close">×</button>
      </div>
    `;
  }

  function renderToast(stage, type, message, top) {
    const icon = type === "success" ? "✅" : type === "info" ? "ℹ️" : "⚠️";
    const toast = document.createElement("div");
    toast.id = `quickvint-toast-${type}`;
    toast.className = `${type} visible floating`;
    toast.style.top = `${top}px`;
    toast.innerHTML = `
      <span class="toast-icon">${icon}</span>
      <div class="toast-content"><span>${message}</span></div>
      <button class="toast-close" aria-label="Close">×</button>
    `;

    // Reuse production selectors by giving each sample the production id while mounted.
    toast.setAttribute("id", "quickvint-toast");
    stage.appendChild(toast);
  }

  try {
    const response = await fetch("../content.js", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const source = await response.text();
    const css = extractContentStyles(source);
    if (!css) throw new Error("Could not extract content script CSS");

    injectRealStyles(css);
    statusEl.textContent = "Styles loaded from content.js";
  } catch (error) {
    warningEl.style.display = "block";
    statusEl.textContent = "Using fallback preview shell";
    console.error(error);
  }

  renderPaywall(document.querySelector('[data-paywall="free"]'), {
    title: "Free limit reached",
    message:
      "You used your free listings. Upgrade to Starter for more each month, or buy one-time credits for a small top-up.",
    actionText: "View options",
  });

  renderPaywall(document.querySelector('[data-paywall="monthly"]'), {
    title: "Monthly limit reached",
    message:
      "Your Starter monthly limit is used. Upgrade to Pro for 250/month, or choose one-time credits on the pricing page.",
    actionText: "Upgrade to Pro",
  });

  renderPaywall(document.querySelector('[data-paywall="business"]'), {
    title: "Limit reached",
    message:
      "You can manage billing or buy top-up credits if you need extra listings this cycle.",
    actionText: "View options",
  });

  const toastStage = document.getElementById("toastStage");
  renderToast(toastStage, "success", "Done. Your listing text was added.", 20);
  renderToast(toastStage, "info", "Tip: add measurements to improve buyer trust.", 80);
  renderToast(toastStage, "error", "Please upload at least one image.", 140);
})();
