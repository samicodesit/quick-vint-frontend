const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

test("shared copy powers actual billing, listing and model consumers in all 18 locales offline", () => {
  const root = path.join(__dirname, "..");
  const browser = vm.createContext({ navigator: { languages: ["en"] }, fetch() { throw Error("No network"); } });
  for (const file of ["shared-ui-copy.js", "billing-catalog.js", "user-model-copy.js", "listing-tools-copy.js"])
    vm.runInContext(fs.readFileSync(path.join(root, "lib", file), "utf8"), browser);
  const shared = browser.AutoListerSharedUiCopy;
  assert.equal(Object.keys(shared.billing).length, 18);
  for (const locale of Object.keys(shared.billing)) {
    browser.AutoListerModelCopy.setLocale(locale);
    for (const [source, id] of [["Close", "action.close"], ["Short", "listing.short"], ["Seller note", "listing.sellerNote"], ["Title language", "listing.titleLanguage"]])
      assert.equal(browser.AutoListerListingCopy.text(source), shared.get(id, locale), locale + source);
    assert.equal(browser.AutoListerModelCopy.text("Close"), shared.get("action.close", locale));
    assert.equal(browser.AutoListerBilling.getCopy(locale).monthly, shared.billing[locale].monthly);
  }
  browser.AutoListerModelCopy.setLocale("nl");
  assert.equal(browser.AutoListerModelCopy.text("New"), "Nieuw", "feature badge is not the web Add item action");
  assert.equal(browser.AutoListerListingCopy.text("Generate"), "Genereren", "extension action keeps its own wording");
  assert.equal(browser.AutoListerListingCopy.text("Paragraphs"), "Alinea’s", "compact web format label stays separate");
  assert.throws(() => shared.get("misspelled.key", "nl"), /Unknown shared/);
});

test("real extension entry points load the bundled catalog before its consumers", () => {
  const root = path.join(__dirname, "..");
  const manifest = JSON.parse(fs.readFileSync(path.join(root, "manifest.json"), "utf8"));
  const scripts = manifest.content_scripts.find(entry => entry.js.includes("content.js")).js;
  const shared = scripts.indexOf("lib/shared-ui-copy.js");
  assert.ok(shared >= 0);
  for (const consumer of ["lib/billing-catalog.js", "lib/user-model-copy.js", "lib/listing-tools-copy.js", "content.js"])
    assert.ok(shared < scripts.indexOf(consumer), consumer);
  const popup = fs.readFileSync(path.join(root, "popup.html"), "utf8");
  assert.ok(popup.indexOf('src="lib/shared-ui-copy.js"') >= 0);
  assert.ok(popup.indexOf('src="lib/shared-ui-copy.js"') < popup.indexOf('src="lib/billing-catalog.js"'));
});
