(async () => {
  const statusEl = document.getElementById("sourceStatus");
  const warningEl = document.getElementById("loadWarning");
  const contentUrl = new URL(
    `../content.js?v=${Date.now()}`,
    window.location.href,
  ).href;
  const languageDefaultsUrl = new URL(
    `../language-defaults.js?v=${Date.now()}`,
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
        return (
          isVisible(doc, signIn) &&
          !isVisible(doc, doc.querySelector(".quickvint-note-control")) &&
          !isVisible(doc, doc.getElementById("quickvint-description-footer-edit-btn"))
        );
      },
    },
    {
      id: "emoji-retry-prompt",
      title: "Emoji removal prompt",
      note: "Free-user prompt after an emoji generation, with local removal and settings action.",
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
          /😊 Remove emojis\?/.test(prompt?.textContent || "") &&
          /Remove emojis and turn them off\./.test(prompt?.textContent || "") &&
          /Remove emojis/.test(prompt?.textContent || "") &&
          /Keep emojis/.test(prompt?.textContent || "") &&
          /Open Settings/.test(prompt?.textContent || "") &&
          !!prompt?.querySelector(".quickvint-apply-settings")
        );
      },
    },
    {
      id: "generation-offer-prompt",
      title: "Free generation offer prompt",
      note: "Claimable free-generation offer anchored beside the Vinted listing inputs.",
      height: 560,
      auth: true,
      action: "generate-offer-prompt",
      hasImages: true,
      useEmojis: false,
      userProfile: {
        subscription_status: "free",
        subscription_tier: "free",
        api_calls_this_month: 0,
        free_lifetime_generations_used: 0,
        pack_credits: 0,
      },
      generateResponse: {
        status: 200,
        body: {
          title: "Vintage denim jacket",
          description:
            "Light blue denim jacket in good condition. Easy to style and ready for everyday wear.",
          measurementAdvice: "",
          offers: [
            {
              id: "offer-label-preview",
              campaignKey: "label_photo_bonus_2026_06",
              offerCode: "free_label_photo_generation",
              creditAmount: 1,
              title: "Forgot the label photo?",
              body: "Label photos help create better descriptions.",
              cta: "🎁 Claim 1 free generation",
            },
          ],
        },
      },
      verify(doc) {
        const prompt = doc.getElementById("quickvint-description-apply-prompt");
        return (
          doc.defaultView.__generateCallCount === 1 &&
          /Forgot the label photo\?/.test(
            prompt?.textContent || "",
          ) &&
          /Label photos help create better descriptions\./.test(
            prompt?.textContent || "",
          ) &&
          /🎁 Claim 1 free generation/.test(prompt?.textContent || "") &&
          /No thanks/.test(prompt?.textContent || "")
        );
      },
    },
    {
      id: "limit-followup-offer",
      title: "Free-limit follow-up offer",
      note: "Returning free-limit user sees a structured upgrade offer with a feedback escape path.",
      height: 640,
      auth: true,
      action: "none",
      hasImages: false,
      userProfile: {
        subscription_status: "free",
        subscription_tier: "free",
        api_calls_this_month: 5,
        free_lifetime_generations_used: 5,
        free_lifetime_generations_limit: 5,
        pack_credits: 0,
      },
      limitFollowupOffer: {
        eligible: true,
        campaignKey: "limit_followup_offer_v1",
        couponCode: "LISTFASTER20",
        discountLabel: "20% off your first month",
        title: "Keep listing without waiting",
        body: "You reached the free limit.",
        trust: "No Vinted account connection needed.",
        cta: "View upgrade options",
        pricingUrl: "https://autolister.app/pricing?offer=preview",
        limitHitAt: "2026-07-02T10:00:00.000Z",
      },
      verify(doc) {
        const modal = doc.getElementById("quickvint-limit-followup-modal");
        const text = modal?.textContent || "";
        return (
          /AutoLister AI/.test(text) &&
          /Vinted listing assistant/.test(text) &&
          /5 free listings used/.test(text) &&
          /Keep listing without waiting/.test(text) &&
          /LISTFASTER20/.test(text) &&
          /20% off your first month/.test(text) &&
          /No Vinted account connection needed/.test(text) &&
          /Secure Stripe checkout\. Cancel anytime\./.test(text) &&
          /View plans & use offer/.test(text) &&
          /Maybe later/.test(text) &&
          /🎁 Share feedback for free listings/.test(text) &&
          !!modal?.querySelector(".quickvint-limit-offer") &&
          !!modal?.querySelector(".quickvint-limit-primary") &&
          modal?.querySelector(".quickvint-limit-code")?.tagName === "BUTTON"
        );
      },
    },
    {
      id: "limit-followup-offer-fr",
      title: "Localized free-limit offer",
      note: "Explicit French language choice localizes the same offer card.",
      height: 640,
      auth: true,
      action: "none",
      hasImages: false,
      selectedLanguage: "fr",
      selectedTitleLanguage: "fr",
      selectedDescriptionLanguage: "fr",
      languagePreferenceTouched: true,
      userProfile: {
        subscription_status: "free",
        subscription_tier: "free",
        api_calls_this_month: 5,
        free_lifetime_generations_used: 5,
        free_lifetime_generations_limit: 5,
        pack_credits: 0,
      },
      limitFollowupOffer: {
        eligible: true,
        campaignKey: "limit_followup_offer_v1",
        couponCode: "LISTFASTER20",
        discountLabel: "20% off your first month",
        pricingUrl: "https://autolister.app/pricing?offer=preview",
        limitHitAt: "2026-07-02T10:00:00.000Z",
      },
      verify(doc) {
        const modal = doc.getElementById("quickvint-limit-followup-modal");
        const text = modal?.textContent || "";
        return (
          /AutoLister AI/.test(text) &&
          /Assistant d'annonces Vinted/.test(text) &&
          /5 annonces gratuites utilisées/.test(text) &&
          /Continuez à publier sans attendre/.test(text) &&
          /LISTFASTER20/.test(text) &&
          /-20 % sur votre premier mois/.test(text) &&
          /Aucune connexion à votre compte Vinted/.test(text) &&
          /Voir les abonnements/.test(text) &&
          /Plus tard/.test(text) &&
          /🎁 Donner un avis pour des annonces gratuites/.test(text)
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
          /Update existing description/.test(prompt?.textContent || "") &&
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
          selectPaywallOption(doc, "Business") &&
          selectPaywallOption(doc, "One-time credits") &&
          selectPaywallOption(doc, "Starter");
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
          /Most popular/.test(toastText) &&
          !/Best next step/.test(toastText) &&
          /No commitment/.test(toastText) &&
          /Compare all plans/.test(toastText) &&
          /Secure checkout by Stripe/.test(toastText) &&
          !paywallHasMainAction(doc) &&
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
          selectPaywallOption(doc, "Pro");
        return (
          /Monthly limit reached/.test(toastText) &&
          /Pro/.test(toastText) &&
          /€9\.99\/mo/.test(toastText) &&
          /25\/day · 250\/month/.test(toastText) &&
          /Most popular/.test(toastText) &&
          !/Recommended/.test(toastText) &&
          /One-time credits/.test(toastText) &&
          /€5\.99/.test(toastText) &&
          /Compare all plans/.test(toastText) &&
          /Secure checkout by Stripe/.test(toastText) &&
          !paywallHasMainAction(doc) &&
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
        const canSelectContact =
          selectPaywallOption(doc, "Tailored limits") &&
          selectPaywallOption(doc, "One-time credits");
        return (
          /Limit reached/.test(toastText) &&
          /One-time credits/.test(toastText) &&
          /€5\.99/.test(toastText) &&
          /Tailored limits/.test(toastText) &&
          /support@autolister\.app/.test(toastText) &&
          /One-time credits/.test(toastText) &&
          /One-time purchase/.test(toastText) &&
          !/Current plan/.test(toastText) &&
          !/Compare all plans/.test(toastText) &&
          canSelectContact &&
          !paywallHasMainAction(doc) &&
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
    return !!option && !option.disabled;
  }

  function paywallHasMainAction(doc) {
    return !!doc.querySelector("#quickvint-toast .paywall-action");
  }

  function getScenarioFrameHeight(scenario) {
    return Math.max(scenario.height || 0, 760);
  }

  function renderPanels() {
    const grid = document.getElementById("previewGrid");
    grid.innerHTML = scenarios
      .map((scenario) => {
        return `
          <article class="ds-panel">
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
                style="height: ${getScenarioFrameHeight(scenario)}px"
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
        subscription_status: "free",
        api_calls_this_month: 0,
        free_lifetime_generations_used: 0,
        pack_credits: 0,
        ...(scenario.userProfile || {}),
      },
      selectedLanguage: scenario.selectedLanguage || "en",
      selectedTitleLanguage: scenario.selectedTitleLanguage || "en",
      selectedDescriptionLanguage: scenario.selectedDescriptionLanguage || "nl",
      quickvintLanguagePreferenceTouched:
        scenario.languagePreferenceTouched === true,
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
        <div class="mock-topbar">
          <div class="mock-brand">Vinted</div>
          <div class="mock-search"></div>
          <div class="mock-pill"></div>
        </div>
        <div class="mock-layout">
          <section class="mock-card" aria-label="Vinted item listing form">
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
          </section>
          <aside class="mock-side-rail" aria-hidden="true">
            <div class="mock-side-card">
              <div class="mock-side-line wide"></div>
              <div class="mock-side-line"></div>
              <div class="mock-side-line short"></div>
            </div>
          </aside>
        </div>
      </main>
    `;
  }

  function frameHtml(scenario) {
    const storage = scenarioStorage(scenario);
    const extensionAssetBaseUrl = new URL("../", window.location.href).href;
    const frameHeight = getScenarioFrameHeight(scenario);
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
      background: #f3f6fb;
      color: #111827;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      -webkit-font-smoothing: antialiased;
    }
    .mock-page {
      min-height: ${frameHeight}px;
      padding: 24px 28px 140px;
      background:
        linear-gradient(90deg, rgba(226, 232, 240, 0.74) 1px, transparent 1px),
        linear-gradient(rgba(226, 232, 240, 0.74) 1px, transparent 1px),
        #f3f6fb;
      background-size: 24px 24px;
    }
    .mock-topbar {
      display: grid;
      grid-template-columns: 130px minmax(240px, 1fr) 112px;
      align-items: center;
      gap: 18px;
      width: min(1280px, calc(100% - 8px));
      height: 52px;
      margin: 0 auto 28px;
      padding: 0 18px;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.92);
      box-shadow: 0 8px 22px rgba(15, 23, 42, 0.05);
    }
    .mock-brand {
      color: #111827;
      font-size: 15px;
      font-weight: 850;
    }
    .mock-search,
    .mock-pill,
    .mock-side-line {
      border-radius: 999px;
      background: #e8edf5;
    }
    .mock-search {
      height: 30px;
    }
    .mock-pill {
      justify-self: end;
      width: 92px;
      height: 30px;
      background: #d8f3ea;
    }
    .mock-layout {
      display: grid;
      grid-template-columns: minmax(520px, 620px) minmax(430px, 1fr);
      align-items: start;
      gap: 28px;
      width: min(1280px, calc(100% - 8px));
      margin: 0 auto;
    }
    .mock-card {
      padding: 28px;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      background: #ffffff;
      box-shadow: 0 10px 26px rgba(15, 23, 42, 0.07);
    }
    .mock-card-title {
      margin-bottom: 18px;
      color: #111827;
      font-size: 16px;
      font-weight: 800;
    }
    .mock-side-rail {
      min-height: 560px;
      padding: 0 6px;
    }
    .mock-side-card {
      width: min(360px, 100%);
      height: 180px;
      margin-left: auto;
      padding: 22px;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.7);
    }
    .mock-side-line {
      height: 12px;
      margin-bottom: 14px;
    }
    .mock-side-line.wide {
      width: 82%;
    }
    .mock-side-line.short {
      width: 48%;
    }
    .mock-media-grid {
      display: grid;
      grid-template-columns: repeat(4, 88px);
      gap: 12px;
      margin-bottom: 22px;
    }
    .photo-box,
    .mock-empty-photo {
      width: 88px;
      height: 88px;
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
      margin-top: 20px;
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
      height: 48px;
      padding: 0 14px;
    }
    .mock-textarea {
      min-height: 142px;
      padding: 12px 14px;
      resize: none;
    }
    @media (max-width: 1180px) {
      .mock-page { padding: 24px 20px 120px; }
      .mock-topbar,
      .mock-layout {
        width: 100%;
      }
      .mock-layout {
        grid-template-columns: minmax(500px, 560px) minmax(420px, 1fr);
        gap: 20px;
      }
      .mock-side-card {
        display: none;
      }
    }
    @media (max-width: 980px) {
      .mock-topbar {
        grid-template-columns: 120px minmax(160px, 1fr);
      }
      .mock-pill {
        display: none;
      }
      .mock-layout {
        grid-template-columns: 1fr;
      }
      .mock-side-rail {
        display: none;
      }
    }
    @media (max-width: 560px) {
      .mock-page { padding: 12px; }
      .mock-topbar { display: none; }
      .mock-card { padding: 14px; }
      .mock-media-grid { grid-template-columns: repeat(2, 70px); }
      .photo-box,
      .mock-empty-photo {
        width: 70px;
        height: 70px;
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
        const isFollowupScenario =
          scenario.id === "limit-followup-offer" ||
          scenario.id === "limit-followup-offer-fr";
        const reviewDelay =
          delay === 4000
            ? isFollowupScenario
              ? 150
              : 60000
            : delay;
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
            return new URL(path, ${JSON.stringify(extensionAssetBaseUrl)}).href;
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
        if (String(url).includes("/api/user/limit-followup-offer")) {
          return new Response(JSON.stringify(scenario.limitFollowupOffer || {
            eligible: false,
          }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }

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
            measurementAdvice: "",
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
          const buttonSelector =
            scenario.action === "generate-existing-replace"
              ? "[data-quickvint-prompt-action='0']"
              : scenario.action === "generate-existing-add"
                ? "[data-quickvint-prompt-action='1']"
                : "[data-quickvint-prompt-action='2']";
          const clickWhenReady = (attempt = 0) => {
            const button = document.querySelector(buttonSelector);
            if (button) {
              button.click();
              return;
            }
            if (attempt < 20) {
              setTimeout(() => clickWhenReady(attempt + 1), 100);
            }
          };
          setTimeout(clickWhenReady, 120);
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
          scenario.action === "generate-emoji-prompt" ||
          scenario.action === "generate-offer-prompt"
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
  <script src="${languageDefaultsUrl}"></script>
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
    const [languageDefaultsResponse, contentResponse] = await Promise.all([
      fetch(languageDefaultsUrl, { cache: "no-store" }),
      fetch(contentUrl, { cache: "no-store" }),
    ]);
    if (!languageDefaultsResponse.ok) {
      throw new Error(`language-defaults.js HTTP ${languageDefaultsResponse.status}`);
    }
    if (!contentResponse.ok) {
      throw new Error(`content.js HTTP ${contentResponse.status}`);
    }
    await Promise.all([
      languageDefaultsResponse.text(),
      contentResponse.text(),
    ]);

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
