(function attachLanguageDefaults(root, factory) {
  const api = factory(root);

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }

  root.AutoListerLanguageDefaults = api;
})(typeof globalThis !== "undefined" ? globalThis : window, (root) => {
  const DEFAULT_LANGUAGE_CODE = "en";
  const SUPPORTED_LANGUAGE_CODES = new Set([
    "en",
    "fr",
    "cz",
    "da",
    "nl",
    "de",
    "el",
    "hr",
    "fi",
    "hu",
    "it",
    "lt",
    "pl",
    "pt",
    "ro",
    "es",
    "sk",
    "sv",
  ]);
  const VINTED_DOMAIN_LANGUAGE_SUFFIXES = [
    ["vinted.at", "de"],
    ["vinted.de", "de"],
    ["vinted.fr", "fr"],
    ["vinted.nl", "nl"],
    ["vinted.it", "it"],
    ["vinted.es", "es"],
    ["vinted.pl", "pl"],
    ["vinted.pt", "pt"],
    ["vinted.cz", "cz"],
    ["vinted.sk", "sk"],
    ["vinted.lt", "lt"],
    ["vinted.dk", "da"],
    ["vinted.fi", "fi"],
    ["vinted.hu", "hu"],
    ["vinted.ro", "ro"],
    ["vinted.hr", "hr"],
    ["vinted.se", "sv"],
    ["vinted.gr", "el"],
    ["vinted.co.uk", "en"],
    ["vinted.ie", "en"],
    ["vinted.com", "en"],
  ];

  function normalizeLanguageCode(code) {
    const normalized = String(code || "")
      .trim()
      .toLowerCase()
      .split(/[-_]/)[0];
    return normalized === "cs" ? "cz" : normalized;
  }

  function getSupportedLanguageCode(code) {
    const normalized = normalizeLanguageCode(code);
    return SUPPORTED_LANGUAGE_CODES.has(normalized) ? normalized : null;
  }

  function getVintedDomainLanguageCode(hostname = "") {
    const host = String(hostname || "")
      .trim()
      .toLowerCase()
      .replace(/^www\./, "");

    for (const [suffix, languageCode] of VINTED_DOMAIN_LANGUAGE_SUFFIXES) {
      if (host === suffix || host.endsWith(`.${suffix}`)) {
        return languageCode;
      }
    }

    return null;
  }

  function getBrowserLanguageCode({
    navigatorLanguages = root.navigator?.languages,
    navigatorLanguage = root.navigator?.language,
  } = {}) {
    const browserLanguages = [
      ...(Array.isArray(navigatorLanguages) ? navigatorLanguages : []),
      navigatorLanguage,
    ];

    for (const language of browserLanguages) {
      const supportedLanguage = getSupportedLanguageCode(language);
      if (supportedLanguage) return supportedLanguage;
    }

    return null;
  }

  function getDefaultListingLanguageInfo({
    hostname = root.location?.hostname || "",
    navigatorLanguages,
    navigatorLanguage,
  } = {}) {
    const domainLanguageCode = getVintedDomainLanguageCode(hostname);
    if (domainLanguageCode) {
      return {
        code: domainLanguageCode,
        source: "vinted_domain",
        domainLanguageCode,
      };
    }

    const browserLanguageCode = getBrowserLanguageCode({
      navigatorLanguages,
      navigatorLanguage,
    });
    if (browserLanguageCode) {
      return {
        code: browserLanguageCode,
        source: "browser",
        domainLanguageCode: null,
      };
    }

    return {
      code: DEFAULT_LANGUAGE_CODE,
      source: "fallback",
      domainLanguageCode: null,
    };
  }

  function resolveListingLanguagePreferences(storage = {}, options = {}) {
    const defaultLanguage = getDefaultListingLanguageInfo(options);
    const storedBaseLanguage = getSupportedLanguageCode(storage.selectedLanguage);
    const selectedLanguage = storedBaseLanguage || defaultLanguage.code;
    const titleLanguageCode =
      getSupportedLanguageCode(storage.selectedTitleLanguage) || selectedLanguage;
    const descriptionLanguageCode =
      getSupportedLanguageCode(storage.selectedDescriptionLanguage) ||
      selectedLanguage;
    const hasStoredLanguagePreference = Boolean(
      storedBaseLanguage ||
        getSupportedLanguageCode(storage.selectedTitleLanguage) ||
        getSupportedLanguageCode(storage.selectedDescriptionLanguage),
    );

    return {
      selectedLanguage,
      titleLanguageCode,
      descriptionLanguageCode,
      hasStoredLanguagePreference,
      defaultLanguageCode: defaultLanguage.code,
      defaultSource: defaultLanguage.source,
      domainLanguageCode: defaultLanguage.domainLanguageCode,
    };
  }

  return {
    DEFAULT_LANGUAGE_CODE,
    normalizeLanguageCode,
    getSupportedLanguageCode,
    getVintedDomainLanguageCode,
    getBrowserLanguageCode,
    getDefaultListingLanguageInfo,
    resolveListingLanguagePreferences,
  };
});
