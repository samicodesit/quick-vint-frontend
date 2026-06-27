const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const test = require("node:test");

test("shared language defaults load before extension entrypoints", () => {
  const manifest = JSON.parse(readFileSync("manifest.json", "utf8"));
  const contentScripts = manifest.content_scripts?.[0]?.js || [];

  assert.deepEqual(contentScripts.slice(0, 2), [
    "language-defaults.js",
    "content.js",
  ]);

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
