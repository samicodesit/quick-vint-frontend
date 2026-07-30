const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const test = require("node:test");

test("shared language defaults load before extension entrypoints", () => {
  const manifest = JSON.parse(readFileSync("manifest.json", "utf8"));
  const contentScripts = manifest.content_scripts?.[0]?.js || [];
  const manifestLanguageScriptIndex = contentScripts.indexOf("language-defaults.js");
  const manifestContentScriptIndex = contentScripts.indexOf("content.js");

  assert.notEqual(manifestLanguageScriptIndex, -1);
  assert.notEqual(manifestContentScriptIndex, -1);
  assert.ok(manifestLanguageScriptIndex < manifestContentScriptIndex);

  const popupHtml = readFileSync("popup.html", "utf8");
  const languageScriptIndex = popupHtml.indexOf(
    '<script src="language-defaults.js"></script>',
  );
  const popupScriptIndex = popupHtml.indexOf('<script src="popup.js"></script>');

  assert.notEqual(languageScriptIndex, -1);
  assert.notEqual(popupScriptIndex, -1);
  assert.ok(languageScriptIndex < popupScriptIndex);

  const buildScript = readFileSync("build.js", "utf8");
  assert.match(buildScript, /'language-defaults\.js'/);
});

test("design-system preview loads shared language defaults before content script", () => {
  const reviewScript = readFileSync(
    "design-system/content-runtime-review.js",
    "utf8",
  );
  const languageDefaultsUrlIndex = reviewScript.indexOf("languageDefaultsUrl");
  const contentUrlIndex = reviewScript.indexOf("contentUrl");
  const languageScriptIndex = reviewScript.indexOf(
    '<script src="${languageDefaultsUrl}"></script>',
  );
  const contentScriptIndex = reviewScript.indexOf(
    '<script src="${contentUrl}"></script>',
  );

  assert.notEqual(languageDefaultsUrlIndex, -1);
  assert.notEqual(contentUrlIndex, -1);
  assert.ok(languageDefaultsUrlIndex > contentUrlIndex);
  assert.notEqual(languageScriptIndex, -1);
  assert.notEqual(contentScriptIndex, -1);
  assert.ok(languageScriptIndex < contentScriptIndex);
});

test("design-system preview includes phone upload chooser scenarios", () => {
  const reviewScript = readFileSync(
    "design-system/content-runtime-review.js",
    "utf8",
  );

  for (const scenarioId of [
    "phone-choice-new-listing",
    "phone-choice-current-listing",
    "phone-choice-localized",
    "phone-choice-mobile-current-listing",
  ]) {
    assert.match(reviewScript, new RegExp(`id: "${scenarioId}"`));
  }

  assert.match(reviewScript, /action: "open-phone-choice"/);
  assert.match(reviewScript, /action: "open-phone-choice-mobile"/);
  assert.match(reviewScript, /quickvint-upload-choice-modal/);
  assert.match(reviewScript, /quickvint-upload-choice-art/);
  assert.match(reviewScript, /How many items do you want to sell/);
  assert.match(reviewScript, /Hoeveel items wil je verkopen/);
  assert.match(reviewScript, /Create new listings/);
  assert.match(reviewScript, /This listing will not change/);
  assert.match(reviewScript, /Nieuwe advertenties maken/);
  assert.match(reviewScript, /Deze advertentie verandert niet/);

  const contentScript = readFileSync("content.js", "utf8");
  assert.match(contentScript, /images\/quickvint-upload-single\.jpg/);
  assert.match(contentScript, /images\/quickvint-upload-multiple\.jpg/);
  assert.match(contentScript, /quickvint-phone-new-badge/);
});
