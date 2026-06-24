(async () => {
  const statusEl = document.getElementById("sourceStatus");
  const warningEl = document.getElementById("loadWarning");
  const contentUrl = new URL(
    `../content.js?v=${Date.now()}`,
    window.location.href,
  ).href;

  const imageDataUrl =
    "data:image/svg+xml;charset=utf-8," +
    encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="320" height="320" viewBox="0 0 320 320">
        <defs>
          <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="#e0f2fe"/>
            <stop offset="1" stop-color="#ede9fe"/>
          </linearGradient>
        </defs>
        <rect width="320" height="320" rx="28" fill="url(#g)"/>
        <rect x="62" y="78" width="196" height="210" rx="24" fill="#ffffff"/>
        <path d="M104 118h112v40H104z" fill="#c4b5fd"/>
        <path d="M92 194h136" stroke="#94a3b8" stroke-width="14" stroke-linecap="round"/>
        <path d="M92 228h102" stroke="#cbd5e1" stroke-width="14" stroke-linecap="round"/>
      </svg>
    `);

  const scenarios = [
    {
      id: "signed-out",
      title: "Signed out controls",
      note: "Real sign-in state from content.js.",
      height: 390,
      auth: false,
      action: "none",
      openLanguage: false,
      hasImages: true,
      verify(doc) {
        const signIn = doc.getElementById("quickvint-signin-btn");
        return isVisible(doc, signIn);
      },
    },
    {
      id: "emoji-retry-prompt",
      title: "Emoji retry prompt",
      note: "Free-user prompt after an emoji generation, with settings link and retry action.",
      height: 560,
      auth: true,
      action: "generate-emoji-prompt",
      hasImages: true,
      useEmojis: true,
      generateResponse: {
        status: 200,
        body: {
          title: "Vintage denim jacket",
          description:
            "✨ Light blue denim jacket in good condition. Easy to style and ready for everyday wear. ✅",
          measurementAdvice: "",
        },
      },
      verify(doc) {
        const prompt = doc.getElementById("quickvint-description-apply-prompt");
        return (
          doc.defaultView.__generateCallCount === 1 &&
          /Prefer no emojis\?/.test(prompt?.textContent || "") &&
          /Retry once for free without emojis/.test(prompt?.textContent || "") &&
          /Retry for free/.test(prompt?.textContent || "") &&
          /Keep emojis/.test(prompt?.textContent || "") &&
          /Open Settings/.test(prompt?.textContent || "") &&
          !!prompt?.querySelector(".quickvint-apply-settings")
        );
      },
    },
    {
      id: "missing-photo",
      title: "Missing photo error",
      note: "Real validation toast before the API is called.",
      height: 360,
      auth: true,
      action: "generate-missing-photo",
      hasImages: false,
      verify(doc) {
        return /Please upload at least one image/.test(
          doc.querySelector("#quickvint-toast")?.textContent || "",
        );
      },
    },
    {
      id: "signed-in",
      title: "Signed in controls + language dropdown",
      note: "Real injected buttons and real language dropdown behavior.",
      height: 620,
      auth: true,
      action: "open-title-language",
      hasImages: true,
      verify(doc) {
        const generate = doc.getElementById("quickvint-gen-btn");
        const phone = doc.getElementById("quickvint-phone-btn");
        const menu = doc.querySelector(".quickvint-lang-field.open .quickvint-lang-menu");
        return isVisible(doc, generate) && isVisible(doc, phone) && isVisible(doc, menu);
      },
    },
    {
      id: "success",
      title: "Successful generation",
      note: "Clicks Generate against a mocked successful /api/generate response.",
      height: 500,
      auth: true,
      action: "generate-success",
      hasImages: true,
      verify(doc) {
        return doc.querySelector('[data-testid="title--input"]')?.value === "Vintage denim jacket";
      },
    },
    {
      id: "existing-description-choice",
      title: "Existing description choice",
      note: "Generated text waits while the user chooses how to apply it.",
      height: 560,
      auth: true,
      action: "generate-success",
      hasImages: true,
      initialDescription: "My original description.",
      verify(doc) {
        const desc = doc.querySelector('[data-testid="description--input"]');
        const prompt = doc.getElementById("quickvint-description-apply-prompt");
        return (
          desc?.value === "My original description." &&
          doc.querySelector('[data-testid="title--input"]')?.value === "" &&
          doc.defaultView.__generateCallCount === 0 &&
          /Description already has text/.test(prompt?.textContent || "") &&
          /Replace/.test(prompt?.textContent || "") &&
          /Add below/.test(prompt?.textContent || "") &&
          /Cancel/.test(prompt?.textContent || "")
        );
      },
    },
    {
      id: "existing-description-replace",
      title: "Existing description: replace",
      note: "Generated text waits for an explicit replace choice.",
      height: 540,
      auth: true,
      action: "generate-existing-replace",
      hasImages: true,
      initialDescription: "My original description.",
      verify(doc) {
        const desc = doc.querySelector('[data-testid="description--input"]');
        return (
          doc.defaultView.__generateCallCount === 1 &&
          desc?.value ===
            "Light blue denim jacket in good condition. Easy to style and ready for everyday wear." &&
          !doc.getElementById("quickvint-description-apply-prompt")
        );
      },
    },
    {
      id: "existing-description-add",
      title: "Existing description: add below",
      note: "Generated text appends only after the user chooses add below.",
      height: 540,
      auth: true,
      action: "generate-existing-add",
      hasImages: true,
      initialDescription: "My original description.",
      verify(doc) {
        const desc = doc.querySelector('[data-testid="description--input"]');
        return (
          doc.defaultView.__generateCallCount === 1 &&
          desc?.value ===
            "My original description.\n\nLight blue denim jacket in good condition. Easy to style and ready for everyday wear." &&
          !doc.getElementById("quickvint-description-apply-prompt")
        );
      },
    },
    {
      id: "existing-description-cancel",
      title: "Existing description: cancel",
      note: "Cancel closes the prompt before any API call.",
      height: 540,
      auth: true,
      action: "generate-existing-cancel",
      hasImages: true,
      initialDescription: "My original description.",
      verify(doc) {
        const desc = doc.querySelector('[data-testid="description--input"]');
        return (
          doc.defaultView.__generateCallCount === 0 &&
          doc.querySelector('[data-testid="title--input"]')?.value === "" &&
          desc?.value === "My original description." &&
          !doc.getElementById("quickvint-description-apply-prompt")
        );
      },
    },
    {
      id: "free-limit",
      title: "Free limit paywall",
      note: "Real 429 handling path for free users.",
      height: 480,
      auth: true,
      action: "generate-free-limit",
      hasImages: true,
      generateResponse: {
        status: 429,
        body: {
          code: "free_lifetime_limit",
          currentTier: "free",
        },
      },
      verify(doc) {
        const toastText = doc.querySelector("#quickvint-toast")?.textContent || "";
        const canSelectPlans =
          selectPaywallOption(doc, "Pro") &&
          /Upgrade to Pro/.test(paywallPrimaryText(doc)) &&
          selectPaywallOption(doc, "Business") &&
          /Upgrade to Business/.test(paywallPrimaryText(doc)) &&
          selectPaywallOption(doc, "One-time credits") &&
          /Buy one-time credits/.test(paywallPrimaryText(doc)) &&
          selectPaywallOption(doc, "Starter") &&
          /Upgrade to Starter/.test(paywallPrimaryText(doc));
        return (
          /Free listings used/.test(toastText) &&
          /Starter/.test(toastText) &&
          /€3\.99\/mo/.test(toastText) &&
          /10\/day · 75\/month/.test(toastText) &&
          /Pro/.test(toastText) &&
          /€9\.99\/mo/.test(toastText) &&
          /Business/.test(toastText) &&
          /€19\.99\/mo/.test(toastText) &&
          /One-time credits/.test(toastText) &&
          /€5\.99/.test(toastText) &&
          /No commitment/.test(toastText) &&
          /Upgrade to Starter/.test(toastText) &&
          /Compare all plans/.test(toastText) &&
          /Secure checkout by Stripe/.test(toastText) &&
          canSelectPlans &&
          !!doc.querySelector("#quickvint-toast .paywall-logo")
        );
      },
    },
    {
      id: "paid-limit",
      title: "Paid plan limit paywall",
      note: "Real monthly limit path for Starter users.",
      height: 430,
      auth: true,
      action: "generate-paid-limit",
      hasImages: true,
      generateResponse: {
        status: 429,
        body: {
          code: "monthly_limit",
          currentTier: "starter",
          nextTier: "pro",
        },
      },
      verify(doc) {
        const toastText = doc.querySelector("#quickvint-toast")?.textContent || "";
        const canSelectTopUp =
          selectPaywallOption(doc, "One-time credits") &&
          /Buy one-time credits/.test(paywallPrimaryText(doc)) &&
          selectPaywallOption(doc, "Pro") &&
          /Upgrade to Pro/.test(paywallPrimaryText(doc));
        return (
          /Monthly limit reached/.test(toastText) &&
          /Pro/.test(toastText) &&
          /€9\.99\/mo/.test(toastText) &&
          /25\/day · 250\/month/.test(toastText) &&
          /One-time credits/.test(toastText) &&
          /€5\.99/.test(toastText) &&
          /Upgrade to Pro/.test(toastText) &&
          /Compare all plans/.test(toastText) &&
          /Secure checkout by Stripe/.test(toastText) &&
          canSelectTopUp &&
          !!doc.querySelector("#quickvint-toast .paywall-logo")
        );
      },
    },
    {
      id: "business-limit",
      title: "Business top-up prompt",
      note: "Real monthly limit path for Business users.",
      height: 430,
      auth: true,
      action: "generate-business-limit",
      hasImages: true,
      generateResponse: {
        status: 429,
        body: {
          code: "monthly_limit",
          currentTier: "business",
        },
      },
      verify(doc) {
        const toastText = doc.querySelector("#quickvint-toast")?.textContent || "";
        const selectedOption = doc.querySelector("#quickvint-toast .paywall-option.selected");
        const canSelectContact =
          selectPaywallOption(doc, "Tailored limits") &&
          /Contact us/.test(paywallPrimaryText(doc)) &&
          selectPaywallOption(doc, "One-time credits") &&
          /Buy one-time credits/.test(paywallPrimaryText(doc));
        return (
          /Limit reached/.test(toastText) &&
          /One-time credits/.test(toastText) &&
          /€5\.99/.test(toastText) &&
          /Tailored limits/.test(toastText) &&
          /support@autolister\.app/.test(toastText) &&
          /Buy one-time credits/.test(toastText) &&
          /One-time purchase/.test(toastText) &&
          !/Current plan/.test(toastText) &&
          !/Compare all plans/.test(toastText) &&
          canSelectContact &&
          /One-time credits/.test(selectedOption?.textContent || "") &&
          !!doc.querySelector("#quickvint-toast .paywall-logo")
        );
      },
    },
    {
      id: "account-paused",
      title: "Paused account notice",
      note: "Real 403 account_paused handling shown after a paused user clicks Generate.",
      height: 390,
      auth: true,
      action: "generate-account-paused",
      hasImages: true,
      generateResponse: {
        status: 403,
        body: {
          code: "account_paused",
          error:
            "This account is paused because it appears linked to duplicate free-trial usage. To continue, contact support or choose a paid option.",
        },
      },
      verify(doc) {
        const toastText = doc.querySelector("#quickvint-toast")?.textContent || "";
        return (
          /account is paused/.test(toastText) &&
          /View paid options/.test(toastText) &&
          /Contact support/.test(toastText) &&
          !!doc.querySelector("#quickvint-toast .toast-actions") &&
          !!doc.querySelector("#quickvint-toast .toast-link.primary") &&
          !!doc.querySelector("#quickvint-toast .toast-link.secondary")
        );
      },
    },
    {
      id: "account-paused-paywall",
      title: "Paused account paid options",
      note: "Clicking View paid options swaps the paused warning for the real paywall.",
      height: 560,
      auth: true,
      action: "generate-account-paused-paywall",
      hasImages: true,
      generateResponse: {
        status: 403,
        body: {
          code: "account_paused",
          error:
            "This account is paused because it appears linked to duplicate free-trial usage. To continue, contact support or choose a paid option.",
        },
      },
      verify(doc) {
        const toastText = doc.querySelector("#quickvint-toast")?.textContent || "";
        return (
          /Continue with a paid option/.test(toastText) &&
          /Starter/.test(toastText) &&
          /Pro/.test(toastText) &&
          /Business/.test(toastText) &&
          /One-time credits/.test(toastText) &&
          /Contact support/.test(toastText) &&
          !!doc.querySelector("#quickvint-toast .paywall-logo")
        );
      },
    },
    {
      id: "service-error",
      title: "Temporary service error",
      note: "Real non-paywall 429 handling for temporary backend issues.",
      height: 360,
      auth: true,
      action: "generate-service-error",
      hasImages: true,
      generateResponse: {
        status: 429,
        body: {
          code: "service_unavailable",
          error: "Service temporarily unavailable. Please try again later.",
        },
      },
      verify(doc) {
        return /Service temporarily unavailable/.test(
          doc.querySelector("#quickvint-toast")?.textContent || "",
        );
      },
    },
  ];

  function escapeAttr(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;");
  }

  function escapeTextAreaValue(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function isVisible(doc, element) {
    if (!element) return false;
    const style = doc.defaultView.getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return (
      style.display !== "none" &&
      style.visibility !== "hidden" &&
      rect.width > 0 &&
      rect.height > 0
    );
  }

  function getPaywallOption(doc, label) {
    return Array.from(doc.querySelectorAll("#quickvint-toast .paywall-option")).find(
      (option) => option.textContent.includes(label),
    );
  }

  function selectPaywallOption(doc, label) {
    const option = getPaywallOption(doc, label);
    if (!option || option.disabled) return false;
    option.click();
    return option.classList.contains("selected");
  }

  function paywallPrimaryText(doc) {
    return doc.querySelector("#quickvint-toast .paywall-action")?.textContent || "";
  }

  function renderPanels() {
    const grid = document.getElementById("previewGrid");
    grid.innerHTML = scenarios
      .map((scenario) => {
        const wide =
          scenario.id === "signed-in" ||
          scenario.id === "emoji-retry-prompt" ||
          scenario.id === "success";
        return `
          <article class="ds-panel${wide ? " wide" : ""}">
            <div class="ds-panel-head">
              <div>
                <h2 class="ds-panel-title">${scenario.title}</h2>
                <p class="ds-panel-note">${scenario.note}</p>
              </div>
              <div class="ds-panel-actions">
                <span class="ds-scenario-badge" data-scenario-badge="${escapeAttr(scenario.id)}">runtime</span>
                <button class="ds-rerun" type="button" data-rerun-scenario="${escapeAttr(scenario.id)}">rerun</button>
              </div>
            </div>
            <div class="ds-stage">
              <iframe
                class="ds-frame"
                title="${escapeAttr(scenario.title)}"
                data-scenario-id="${escapeAttr(scenario.id)}"
                style="height: ${scenario.height}px"
              ></iframe>
            </div>
          </article>
        `;
      })
      .join("");
  }

  function scenarioStorage(scenario) {
    return {
      supabaseSession: scenario.auth
        ? {
            access_token: `preview-token-${scenario.id}`,
            user: { email: "preview@autolister.app" },
          }
        : null,
      userProfile: {
        subscription_tier:
          scenario.id === "paid-limit"
            ? "starter"
            : scenario.id === "business-limit"
              ? "business"
              : "free",
      },
      selectedLanguage: "en",
      selectedTitleLanguage: "en",
      selectedDescriptionLanguage: "nl",
      tone: "standard",
      useEmojis: scenario.useEmojis === true,
      useBulletPoints: true,
    };
  }

  function mockVintedMarkup({ hasImages, initialDescription = "" }) {
    const safeInitialDescription = escapeTextAreaValue(initialDescription);
    const media = hasImages
      ? `
        <section data-testid="media-upload-grid" class="mock-media-grid">
          <div class="photo-box">
            <div data-testid="image-wrapper-0">
              <img class="web_ui__Image__content" src="${imageDataUrl}" alt="Uploaded photo 1" />
            </div>
          </div>
          <div class="photo-box">
            <div data-testid="image-wrapper-1">
              <img class="web_ui__Image__content" src="${imageDataUrl}" alt="Uploaded photo 2" />
            </div>
          </div>
        </section>
      `
      : `
        <section data-testid="media-upload-grid" class="mock-media-grid empty">
          <div class="mock-empty-photo">No photos</div>
        </section>
      `;

    return `
      <main class="mock-page">
        <div class="mock-card">
          <div class="mock-card-title">Vinted item listing</div>
          ${media}
          <label class="mock-field">
            <div data-testid="title--title" class="mock-field-title">Title</div>
            <div class="mock-input-shell">
              <input data-testid="title--input" class="mock-input" value="" placeholder="Item title" />
            </div>
          </label>
          <label class="mock-field">
            <div data-testid="description--title" class="mock-field-title">Description</div>
            <div class="mock-input-shell">
              <textarea data-testid="description--input" class="mock-textarea" placeholder="Describe your item">${safeInitialDescription}</textarea>
            </div>
          </label>
        </div>
      </main>
    `;
  }

  function frameHtml(scenario) {
    const storage = scenarioStorage(scenario);
    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      min-height: 100%;
      overflow: hidden;
      background: #f8fafc;
      color: #111827;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      -webkit-font-smoothing: antialiased;
    }
    .mock-page {
      min-height: ${scenario.height}px;
      padding: 16px;
      background:
        linear-gradient(90deg, rgba(226, 232, 240, 0.74) 1px, transparent 1px),
        linear-gradient(rgba(226, 232, 240, 0.74) 1px, transparent 1px),
        #f8fafc;
      background-size: 24px 24px;
    }
    .mock-card {
      width: min(100%, 760px);
      padding: 16px;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      background: #ffffff;
      box-shadow: 0 10px 26px rgba(15, 23, 42, 0.07);
    }
    .mock-card-title {
      margin-bottom: 12px;
      color: #111827;
      font-size: 14px;
      font-weight: 800;
    }
    .mock-media-grid {
      display: grid;
      grid-template-columns: repeat(4, 70px);
      gap: 10px;
      margin-bottom: 16px;
    }
    .photo-box,
    .mock-empty-photo {
      width: 70px;
      height: 70px;
      display: grid;
      place-items: center;
      border: 1px solid #dbe3f0;
      border-radius: 8px;
      background: #f1f5f9;
      overflow: hidden;
      color: #94a3b8;
      font-size: 11px;
      font-weight: 700;
    }
    .photo-box img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    .mock-field {
      display: block;
      margin-top: 14px;
    }
    .mock-field-title {
      margin-bottom: 8px;
      color: #334155;
      font-size: 13px;
      font-weight: 760;
    }
    .mock-input,
    .mock-textarea {
      width: 100%;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      background: #ffffff;
      color: #111827;
      font: inherit;
      font-size: 14px;
      outline: none;
    }
    .mock-input {
      height: 40px;
      padding: 0 12px;
    }
    .mock-textarea {
      min-height: 74px;
      padding: 10px 12px;
      resize: none;
    }
    #quickvint-toast {
      top: 18px !important;
      right: 18px !important;
      left: auto !important;
    }
    @media (max-width: 560px) {
      .mock-page { padding: 12px; }
      .mock-card { padding: 14px; }
      #quickvint-toast {
        right: 12px !important;
        left: 12px !important;
      }
    }
  </style>
</head>
<body>
  ${mockVintedMarkup(scenario)}
  <script>
    (() => {
      const scenario = ${JSON.stringify(scenario)};
      const storage = ${JSON.stringify(storage)};
      const listeners = [];
      const nativeSetTimeout = window.setTimeout.bind(window);

      window.setTimeout = (callback, delay, ...args) => {
        const reviewDelay = delay === 4000 ? 60000 : delay;
        return nativeSetTimeout(callback, reviewDelay, ...args);
      };

      function clone(value) {
        return value == null ? value : JSON.parse(JSON.stringify(value));
      }

      window.__generateCallCount = 0;

      window.chrome = {
        storage: {
          local: {
            get(keys, callback) {
              let result = {};
              if (Array.isArray(keys)) {
                keys.forEach((key) => { result[key] = clone(storage[key]); });
              } else if (typeof keys === "string") {
                result[keys] = clone(storage[keys]);
              } else if (keys && typeof keys === "object") {
                Object.keys(keys).forEach((key) => {
                  result[key] = storage[key] === undefined ? keys[key] : clone(storage[key]);
                });
              } else {
                result = clone(storage);
              }
              if (callback) callback(result);
              return Promise.resolve(result);
            },
            set(values, callback) {
              Object.assign(storage, clone(values));
              if (callback) callback();
              return Promise.resolve();
            },
          },
          onChanged: {
            addListener(listener) {
              listeners.push(listener);
            },
          },
        },
        runtime: {
          getManifest() {
            return { version: "design-system" };
          },
          getURL(path) {
            return new URL("../" + path, ${JSON.stringify(window.location.href)}).href;
          },
          onMessage: {
            addListener(listener) {
              listeners.push(listener);
            },
          },
          sendMessage(message, callback) {
            let response = {};
            if (message && message.type === "GET_ACCESS_TOKEN") {
              response = { access_token: storage.supabaseSession?.access_token || null };
            }
            if (message && message.type === "CREATE_CHECKOUT") {
              response = storage.supabaseSession?.user?.email
                ? { ok: true, url: "https://checkout.stripe.test/session" }
                : { ok: false, error: "Please sign in again before checkout." };
            }
            if (callback) callback(response);
            return Promise.resolve(response);
          },
        },
      };

      window.fetch = async (url) => {
        if (String(url).includes("/api/generate")) {
          window.__generateCallCount += 1;
          const configured = scenario.generateResponse;
          if (configured) {
            return new Response(JSON.stringify(configured.body || {}), {
              status: configured.status,
              headers: { "Content-Type": "application/json" },
            });
          }
          return new Response(JSON.stringify({
            title: "Vintage denim jacket",
            description: "Light blue denim jacket in good condition. Easy to style and ready for everyday wear.",
            measurementAdvice: "Tip: add measurements if you want fewer buyer questions.",
          }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }

        return new Response("{}", {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      };

      window.__runScenario = () => {
        const generate = document.getElementById("quickvint-gen-btn");
        if (scenario.action === "open-title-language") {
          document.getElementById("quickvint-title-language-select")?.click();
          return;
        }
        if (
          scenario.action === "generate-existing-replace" ||
          scenario.action === "generate-existing-add" ||
          scenario.action === "generate-existing-cancel"
        ) {
          generate?.click();
          const buttonClass =
            scenario.action === "generate-existing-replace"
              ? ".quickvint-apply-replace"
              : scenario.action === "generate-existing-add"
                ? ".quickvint-apply-add"
                : ".quickvint-apply-cancel";
          setTimeout(() => {
            document.querySelector(buttonClass)?.click();
          }, 120);
          return;
        }
        if (
          scenario.action === "generate-success" ||
          scenario.action === "generate-free-limit" ||
          scenario.action === "generate-paid-limit" ||
          scenario.action === "generate-business-limit" ||
          scenario.action === "generate-account-paused" ||
          scenario.action === "generate-account-paused-paywall" ||
          scenario.action === "generate-missing-photo" ||
          scenario.action === "generate-service-error" ||
          scenario.action === "generate-emoji-prompt"
        ) {
          generate?.click();
          if (scenario.action === "generate-account-paused-paywall") {
            setTimeout(() => {
              document.querySelector("#quickvint-toast .toast-action-button")?.click();
            }, 550);
          }
        }
      };
    })();
  </script>
  <script src="${contentUrl}"></script>
  <script>
    window.addEventListener("load", () => {
      setTimeout(() => window.__runScenario?.(), 450);
    });
  </script>
</body>
</html>`;
  }

  function loadScenarioFrame(scenario) {
    const frame = document.querySelector(`[data-scenario-id="${scenario.id}"]`);
    if (!frame) return;
    const panel = frame.closest(".ds-panel");
    const badge = document.querySelector(`[data-scenario-badge="${scenario.id}"]`);
    panel?.classList.remove("verified", "needs-attention");
    if (badge) badge.textContent = "runtime";
    frame.addEventListener("load", () => {
      setTimeout(() => verifyScenario(scenario), 1400);
    }, { once: true });
    frame.srcdoc = frameHtml(scenario);
  }

  function verifyScenario(scenario) {
    const frame = document.querySelector(`[data-scenario-id="${scenario.id}"]`);
    const badge = document.querySelector(`[data-scenario-badge="${scenario.id}"]`);
    const panel = frame?.closest(".ds-panel");

    let passed = false;
    try {
      passed = !!scenario.verify?.(frame.contentDocument);
    } catch (error) {
      console.warn(`Could not verify scenario: ${scenario.id}`, error);
    }

    if (panel) {
      panel.classList.toggle("verified", passed);
      panel.classList.toggle("needs-attention", !passed);
    }
    if (badge) {
      badge.textContent = passed ? "verified" : "check";
    }

    const verifiedCount = document.querySelectorAll(".ds-panel.verified").length;
    const total = scenarios.length;
    statusEl.textContent =
      verifiedCount === total
        ? `Real content.js verified in ${total} scenarios`
        : `Real content.js running: ${verifiedCount}/${total} verified`;
  }

  try {
    const response = await fetch(contentUrl, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    await response.text();

    renderPanels();
    document.getElementById("previewGrid").addEventListener("click", (event) => {
      const button = event.target.closest("[data-rerun-scenario]");
      if (!button) return;
      const scenario = scenarios.find((item) => item.id === button.dataset.rerunScenario);
      if (scenario) loadScenarioFrame(scenario);
    });
    scenarios.forEach(loadScenarioFrame);
    statusEl.textContent = "Real content.js running in isolated scenarios";
  } catch (error) {
    warningEl.style.display = "block";
    statusEl.textContent = "Could not load content.js";
    console.error(error);
  }
})();
