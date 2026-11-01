const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  vm = require("node:vm"),
  fs = require("node:fs"),
  path = require("node:path");
test("listing tour and settings copy cover every model locale without empty strings", () => {
  const context = vm.createContext({ navigator: { languages: ["en"] } });
  for (const file of ["user-model-copy.js", "listing-tools-copy.js"])
    vm.runInContext(
      fs.readFileSync(path.join(__dirname, "../lib", file), "utf8"),
      context,
    );
  const model = context.AutoListerModelCopy,
    listing = context.AutoListerListingCopy;
  for (const code of Object.keys(model.copy)) {
    model.setLocale(code);
    const locale = model.getLocale();
    assert.ok(listing.copy[locale], locale);
    assert.deepEqual(
      Object.keys(listing.copy[locale]).sort(),
      Object.keys(listing.copy.en).sort(),
    );
    for (const [key, value] of Object.entries(listing.copy[locale])) {
      assert.ok(value.trim(), locale + key);
      assert.equal(listing.text(key), value);
      assert.ok(!value.includes("\u2014"));
    }
  }
});
