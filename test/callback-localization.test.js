const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const test = require("node:test");
const vm = require("node:vm");

function loadLocalization({ language = "en-US", timezone = "Europe/Amsterdam" } = {}) {
  const sandbox = {
    window: {},
    navigator: { language },
    console,
    Intl: {
      DateTimeFormat: () => ({
        resolvedOptions: () => ({ timeZone: timezone }),
      }),
    },
  };
  vm.runInNewContext(readFileSync("lib/localization.js", "utf8"), sandbox);
  return sandbox.window;
}

test("callback localization uses browser language instead of Amsterdam timezone", () => {
  const { detectCountryAndLocalization, LOCALIZATION } = loadLocalization({
    language: "en-US",
    timezone: "Europe/Amsterdam",
  });

  assert.equal(detectCountryAndLocalization(), LOCALIZATION.DEFAULT);
});

test("callback localization still supports Dutch browser language", () => {
  const { detectCountryAndLocalization, LOCALIZATION } = loadLocalization({
    language: "nl-NL",
    timezone: "Europe/London",
  });

  assert.equal(detectCountryAndLocalization(), LOCALIZATION.NL);
});

test("callback localization sends Australian English users to vinted.com.au", () => {
  const { detectCountryAndLocalization } = loadLocalization({
    language: "en-AU",
    timezone: "Europe/Amsterdam",
  });

  const localization = detectCountryAndLocalization();
  assert.equal(localization.domain, "vinted.com.au");
  assert.equal(localization.texts.vintedButton, "Start Creating on Vinted.com.au");
});
