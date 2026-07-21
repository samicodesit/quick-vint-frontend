const assert = require("node:assert/strict");
const test = require("node:test");

const languageDefaults = require("../language-defaults");

test("domain language is used when no user preference exists", () => {
  const result = languageDefaults.resolveListingLanguagePreferences(
    {},
    {
      hostname: "www.vinted.de",
      navigatorLanguages: ["en-US"],
      navigatorLanguage: "en-US",
    },
  );

  assert.equal(result.titleLanguageCode, "de");
  assert.equal(result.descriptionLanguageCode, "de");
  assert.equal(result.defaultSource, "vinted_domain");
  assert.equal(result.domainLanguageCode, "de");
  assert.equal(result.hasStoredLanguagePreference, false);
});

test("Australian Vinted domain defaults to English", () => {
  const result = languageDefaults.resolveListingLanguagePreferences(
    {},
    {
      hostname: "www.vinted.com.au",
      navigatorLanguages: ["fr-FR"],
      navigatorLanguage: "fr-FR",
    },
  );

  assert.equal(result.titleLanguageCode, "en");
  assert.equal(result.descriptionLanguageCode, "en");
  assert.equal(result.defaultSource, "vinted_domain");
});

test("stored title and description language choices override domain fallback", () => {
  const result = languageDefaults.resolveListingLanguagePreferences(
    {
      selectedLanguage: "de",
      selectedTitleLanguage: "fr",
      selectedDescriptionLanguage: "nl",
    },
    {
      hostname: "vinted.es",
      navigatorLanguages: ["es-ES"],
      navigatorLanguage: "es-ES",
    },
  );

  assert.equal(result.selectedLanguage, "de");
  assert.equal(result.titleLanguageCode, "fr");
  assert.equal(result.descriptionLanguageCode, "nl");
  assert.equal(result.defaultLanguageCode, "es");
  assert.equal(result.hasStoredLanguagePreference, true);
});

test("ambiguous Vinted domains fall back to browser language instead of forcing a market language", () => {
  const result = languageDefaults.resolveListingLanguagePreferences(
    {},
    {
      hostname: "vinted.be",
      navigatorLanguages: ["fr-BE", "nl-BE"],
      navigatorLanguage: "fr-BE",
    },
  );

  assert.equal(result.titleLanguageCode, "fr");
  assert.equal(result.descriptionLanguageCode, "fr");
  assert.equal(result.defaultSource, "browser");
  assert.equal(result.domainLanguageCode, null);
});

test("Czech browser language normalizes to supported cz code", () => {
  const result = languageDefaults.resolveListingLanguagePreferences(
    {},
    {
      hostname: "example.com",
      navigatorLanguages: ["cs-CZ"],
      navigatorLanguage: "cs-CZ",
    },
  );

  assert.equal(result.titleLanguageCode, "cz");
  assert.equal(result.descriptionLanguageCode, "cz");
  assert.equal(result.defaultSource, "browser");
});

test("unsupported domain and browser language fall back to English", () => {
  const result = languageDefaults.resolveListingLanguagePreferences(
    {},
    {
      hostname: "example.com",
      navigatorLanguages: ["ja-JP"],
      navigatorLanguage: "ja-JP",
    },
  );

  assert.equal(result.titleLanguageCode, "en");
  assert.equal(result.descriptionLanguageCode, "en");
  assert.equal(result.defaultSource, "fallback");
});

test("unsupported stored language is ignored in favor of domain fallback", () => {
  const result = languageDefaults.resolveListingLanguagePreferences(
    {
      selectedLanguage: "ja",
      selectedTitleLanguage: "xx",
    },
    {
      hostname: "vinted.it",
      navigatorLanguages: ["en-US"],
      navigatorLanguage: "en-US",
    },
  );

  assert.equal(result.selectedLanguage, "it");
  assert.equal(result.titleLanguageCode, "it");
  assert.equal(result.descriptionLanguageCode, "it");
  assert.equal(result.hasStoredLanguagePreference, false);
});

test("language profile keeps displayed defaults separate from explicit UI preference", () => {
  const result = languageDefaults.resolveLanguageProfile(
    {
      selectedLanguage: "fr",
      selectedTitleLanguage: "fr",
      selectedDescriptionLanguage: "fr",
    },
    {
      hostname: "vinted.nl",
      navigatorLanguages: ["en-US"],
      navigatorLanguage: "en-US",
    },
  );

  assert.equal(result.titleLanguageCode, "fr");
  assert.equal(result.descriptionLanguageCode, "fr");
  assert.equal(result.hasStoredLanguagePreference, true);
  assert.equal(result.hasExplicitLanguagePreference, false);
  assert.equal(result.uiLanguageCode, "nl");
  assert.equal(result.uiLanguageSource, "vinted_domain");
});

test("language profile uses explicit description language for UI after user interaction", () => {
  const result = languageDefaults.resolveLanguageProfile(
    {
      quickvintLanguagePreferenceTouched: true,
      selectedLanguage: "en",
      selectedTitleLanguage: "en",
      selectedDescriptionLanguage: "nl",
    },
    {
      hostname: "vinted.fr",
      navigatorLanguages: ["fr-FR"],
      navigatorLanguage: "fr-FR",
    },
  );

  assert.equal(result.titleLanguageCode, "en");
  assert.equal(result.descriptionLanguageCode, "nl");
  assert.equal(result.uiLanguageCode, "nl");
  assert.equal(result.uiLanguageSource, "explicit_description_language");
  assert.equal(result.hasExplicitLanguagePreference, true);
});

test("language profile falls back to title language for UI when touched without description language", () => {
  const result = languageDefaults.resolveLanguageProfile(
    {
      quickvintLanguagePreferenceTouched: true,
      selectedTitleLanguage: "de",
    },
    {
      hostname: "vinted.es",
      navigatorLanguages: ["es-ES"],
      navigatorLanguage: "es-ES",
    },
  );

  assert.equal(result.titleLanguageCode, "de");
  assert.equal(result.descriptionLanguageCode, "es");
  assert.equal(result.uiLanguageCode, "de");
  assert.equal(result.uiLanguageSource, "explicit_title_language");
});
