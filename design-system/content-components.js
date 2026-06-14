(async () => {
  const CONSTANTS = {
    BTN_ID: "quickvint-gen-btn",
    PHONE_BTN_ID: "quickvint-phone-btn",
    SIGN_IN_BTN_ID: "quickvint-signin-btn",
    MODAL_ID: "quickvint-phone-modal",
  };

  const FALLBACK_LANGUAGES = [
    { code: "en", shortName: "EN", flag: "gb", flagAlt: "UK Flag" },
    { code: "fr", shortName: "FR", flag: "fr", flagAlt: "French Flag" },
    { code: "nl", shortName: "NL", flag: "nl", flagAlt: "Dutch Flag" },
  ];

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

  function extractBacktickConst(source, name) {
    const match = source.match(new RegExp(`const ${name} = \`([\\s\\S]*?)\`;`));
    return match ? match[1] : "";
  }

  function extractLanguageOptions(source) {
    const match = source.match(/const LANGUAGE_OPTIONS = (\[[\s\S]*?\]);\n  const WAND_ICON_SVG/);
    if (!match) return FALLBACK_LANGUAGES;

    try {
      return Function(`"use strict"; return ${match[1]};`)();
    } catch (error) {
      console.warn("Could not parse LANGUAGE_OPTIONS from content.js", error);
      return FALLBACK_LANGUAGES;
    }
  }

  function htmlEscape(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function frameDocument({ css, body, minHeight = 220 }) {
    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <style>${css}</style>
  <style>
    * { box-sizing: border-box; }
    html, body {
      width: 100%;
      min-height: ${minHeight}px;
      margin: 0;
      overflow: hidden;
      background:
        linear-gradient(90deg, rgba(229, 231, 235, 0.7) 1px, transparent 1px),
        linear-gradient(rgba(229, 231, 235, 0.7) 1px, transparent 1px),
        #f8fafc;
      background-size: 24px 24px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    .preview-form {
      width: min(100% - 32px, 680px);
      margin: 18px;
      padding: 18px;
      border: 1px solid #e5e7eb;
      border-radius: 14px;
      background: #ffffff;
    }
    .preview-label {
      display: block;
      margin-bottom: 8px;
      color: #374151;
      font-size: 13px;
      font-weight: 750;
    }
    .preview-input {
      width: 100%;
      height: 42px;
      margin-bottom: 14px;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      background: #ffffff;
    }
    .preview-photos {
      display: grid;
      grid-template-columns: repeat(3, 74px);
      gap: 10px;
      margin: 0 0 12px;
    }
    .preview-photo {
      aspect-ratio: 1;
      border: 1px dashed #cbd5e1;
      border-radius: 10px;
      background: #f1f5f9;
    }
    .preview-controls {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }
    .preview-field-row {
      display: flex;
      align-items: flex-start;
      gap: 28px;
      margin-top: 18px;
    }
    .preview-field-title {
      color: #374151;
      font-size: 13px;
      font-weight: 750;
    }
    .quickvint-lang-field {
      display: inline-flex !important;
    }
  </style>
</head>
<body>${body}</body>
</html>`;
  }

  function renderFrame(stage, options) {
    const iframe = document.createElement("iframe");
    iframe.className = "ds-frame";
    iframe.title = options.title || "Component preview";
    iframe.loading = "eager";
    iframe.style.height = `${options.height || 220}px`;
    iframe.srcdoc = frameDocument({
      css: options.css,
      body: options.body,
      minHeight: options.height || 220,
    });

    stage.replaceChildren(iframe);
  }

  function renderPaywallBody({ title, message, actionText }) {
    return `
      <div id="quickvint-toast" class="paywall visible">
        <div class="paywall-body">
          <div class="paywall-header">
            <div class="paywall-mark" aria-hidden="true">AI</div>
            <div>
              <div class="paywall-kicker">AutoLister AI</div>
              <div class="paywall-title">${htmlEscape(title)}</div>
            </div>
          </div>
          <div class="paywall-message">${htmlEscape(message)}</div>
          <a class="paywall-action" href="#" onclick="return false;">
            <span>${htmlEscape(actionText)}</span>
            <span aria-hidden="true">→</span>
          </a>
        </div>
        <button class="toast-close paywall-close" aria-label="Close">×</button>
      </div>
    `;
  }

  function renderToastBody(type, message) {
    const icon = type === "success" ? "✅" : type === "info" ? "ℹ️" : "⚠️";
    return `
      <div id="quickvint-toast" class="${type} visible">
        <span class="toast-icon">${icon}</span>
        <div class="toast-content"><span>${htmlEscape(message)}</span></div>
        <button class="toast-close" aria-label="Close">×</button>
      </div>
    `;
  }

  function renderLanguageField({ id, languages, selectedCode = "en", top = 0, left = 0 }) {
    const selected = languages.find((lang) => lang.code === selectedCode) || languages[0];
    const options = languages
      .map((lang) => {
        const active = lang.code === selected.code ? " active" : "";
        return `
          <button type="button" class="quickvint-lang-option${active}" data-value="${htmlEscape(lang.code)}" title="${htmlEscape(lang.name || lang.shortName)}">
            <img src="https://flagcdn.com/w40/${htmlEscape(lang.flag)}.png" alt="${htmlEscape(lang.flagAlt)}"><span>${htmlEscape(lang.shortName)}</span>
          </button>
        `;
      })
      .join("");

    return `
      <div class="quickvint-lang-field open" title="Language">
        <button id="${htmlEscape(id)}" type="button" class="quickvint-lang-trigger" aria-label="Language" data-value="${htmlEscape(selected.code)}">
          <img src="https://flagcdn.com/w40/${htmlEscape(selected.flag)}.png" alt="${htmlEscape(selected.flagAlt)}"><span>${htmlEscape(selected.shortName)}</span>
        </button>
        <div class="quickvint-lang-menu" style="left: ${left}px; top: ${top}px; min-width: 58px;">
          ${options}
        </div>
      </div>
    `;
  }

  function renderControlsBody({ wandIcon, phoneIcon, languages }) {
    return `
      <div class="preview-form">
        <label class="preview-label">Photos</label>
        <div class="preview-photos" aria-hidden="true">
          <div class="preview-photo"></div>
          <div class="preview-photo"></div>
          <div class="preview-photo"></div>
        </div>
        <div class="preview-controls">
          <button id="${CONSTANTS.BTN_ID}" type="button">
            <span class="icon">${wandIcon}</span>
            <span class="label">Generate</span>
          </button>
          <button id="${CONSTANTS.PHONE_BTN_ID}" type="button" disabled>
            <span class="icon">${phoneIcon}</span>
            <span class="label">Phone</span>
          </button>
          <button id="${CONSTANTS.SIGN_IN_BTN_ID}" type="button" style="display: inline-flex; width: auto; margin-top: 0;">
            Sign in to AutoLister AI
          </button>
        </div>
        <div class="preview-field-row">
          <div>
            <div class="preview-field-title quickvint-lang-title-host">
              Title
              ${renderLanguageField({
                id: "quickvint-title-language-select",
                languages,
                selectedCode: "en",
                top: 216,
                left: 18,
              })}
            </div>
          </div>
          <div>
            <div class="preview-field-title quickvint-lang-title-host">
              Description
              ${renderLanguageField({
                id: "quickvint-description-language-select",
                languages,
                selectedCode: "nl",
                top: 216,
                left: 148,
              })}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  let kit = null;

  try {
    const response = await fetch("../content.js", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const source = await response.text();
    const css = extractContentStyles(source);
    if (!css) throw new Error("Could not extract content script CSS");

    kit = {
      css,
      wandIcon: extractBacktickConst(source, "WAND_ICON_SVG"),
      phoneIcon: extractBacktickConst(source, "PHONE_ICON_SVG"),
      languages: extractLanguageOptions(source),
    };

    statusEl.textContent = "Live styles loaded from content.js";
  } catch (error) {
    warningEl.style.display = "block";
    statusEl.textContent = "Could not load content.js";
    console.error(error);
    return;
  }

  renderFrame(document.querySelector('[data-scenario="controls"]'), {
    css: kit.css,
    height: 520,
    title: "On-page controls",
    body: renderControlsBody({
      wandIcon: kit.wandIcon,
      phoneIcon: kit.phoneIcon,
      languages: kit.languages,
    }),
  });

  [
    {
      scenario: "free",
      title: "Free limit reached",
      message:
        "You used your free listings. Upgrade to Starter for more each month, or buy one-time credits for a small top-up.",
      actionText: "View options",
    },
    {
      scenario: "monthly",
      title: "Monthly limit reached",
      message:
        "Your Starter monthly limit is used. Upgrade to Pro for 250/month, or choose one-time credits on the pricing page.",
      actionText: "Upgrade to Pro",
    },
    {
      scenario: "business",
      title: "Limit reached",
      message:
        "You can manage billing or buy top-up credits if you need extra listings this cycle.",
      actionText: "View options",
    },
  ].forEach((sample) => {
    renderFrame(document.querySelector(`[data-scenario="${sample.scenario}"]`), {
      css: kit.css,
      height: 245,
      title: sample.title,
      body: renderPaywallBody(sample),
    });
  });

  [
    ["success", "Done. Your listing text was added."],
    ["info", "Tip: add measurements to improve buyer trust."],
    ["error", "Please upload at least one image."],
  ].forEach(([type, message]) => {
    renderFrame(document.querySelector(`[data-scenario="${type}-toast"]`), {
      css: kit.css,
      height: 120,
      title: `${type} toast`,
      body: renderToastBody(type, message),
    });
  });
})();
