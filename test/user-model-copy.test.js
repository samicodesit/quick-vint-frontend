const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const copy = require("../lib/user-model-copy.js");
test("model copy covers every supported UI language without missing strings", () => {
  assert.deepEqual(
    Object.keys(copy.copy).sort(),
    [
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
    ].sort(),
  );
  for (const row of Object.values(copy.copy)) {
    assert.deepEqual(Object.keys(row), copy.source);
    assert.ok(
      Object.values(row).every(
        (value) => value.trim() && !value.includes("\u2014"),
      ),
    );
  }
  assert.equal(copy.detect(["xx", "cs-CZ"]), "cz");
  assert.equal(copy.detect(["nl-NL"]), "nl");
  assert.equal(copy.detect(["zh-CN"]), "en");
});
test("model errors use localized recovery copy instead of raw server details", () => {
  copy.setLocale("fr-FR");
  assert.equal(copy.text("Red"), "Roux");
  assert.equal(copy.error({ status: 401 }), "Reconnectez-vous pour continuer.");
  assert.equal(
    copy.error({ message: "internal database detail" }),
    copy.text("Your model could not be loaded. Try again."),
  );
  copy.setLocale("en");
});
test("model assets are packaged for listing-page access", () => {
  const manifest = require("../manifest.json");
  for (const name of ["female", "male"]) {
    const asset = "images/user-model-" + name + ".webp";
    assert.ok(
      manifest.web_accessible_resources.some((entry) =>
        entry.resources.includes(asset),
      ),
    );
    assert.ok(fs.statSync(path.join(__dirname, "..", asset)).size < 10000);
  }
});
