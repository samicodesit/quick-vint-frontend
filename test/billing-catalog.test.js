const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("billing catalog supplies every supported language and all three pack prices", () => {
  const file = path.join(__dirname, "../lib/billing-catalog.js");
  assert.ok(fs.existsSync(file), "billing catalog is available to the extension");
  const billing = require(file);
  for (const language of ["en", "fr", "cz", "da", "nl", "de", "el", "hr", "fi", "hu", "it", "lt", "pl", "pt", "ro", "es", "sk", "sv"]) {
    for (const value of Object.values(billing.getCopy(language))) assert.ok(typeof value === "string" && value.length > 0);
  }
  assert.deepEqual(billing.packs.map(p => [p.id, p.credits, p.priceEur]), [["credits_20",20,5.99],["credits_50",50,9.99],["credits_100",100,16.99]]);
  assert.equal(billing.formatUnitPrice(9.99, 250, "en"), "€0.040");
  assert.equal(billing.formatUnitPrice(9.99, 50, "nl"), "€ 0,20");
});
