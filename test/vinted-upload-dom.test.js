const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

function getSelector(name) {
  const content = fs.readFileSync(
    path.resolve(__dirname, "../content.js"),
    "utf8",
  );
  const match = content.match(new RegExp(`${name}:\\s*(['"])(.*?)\\1`));
  assert.ok(match, `Missing selector ${name}`);
  return match[2];
}

test("mediaPhotoBox selector covers current Vinted CSS-module photo boxes", () => {
  const selector = getSelector("mediaPhotoBox");

  assert.match(selector, /\.photo-box/);
  // A single underscore covers both current wSh2GW_photo-box and older
  // double-underscore CSS modules, while excluding their inner elements.
  assert.match(selector, /\[class\*="_photo-box"\]/);
  assert.match(selector, /:not\(\[class\*="_photo-box__"\]\)/);
});
