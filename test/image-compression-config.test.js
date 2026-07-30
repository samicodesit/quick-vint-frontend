const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

function readPhoneUploadPageHtml() {
  const candidates = [
    process.env.AUTOLISTER_API_PATH
      ? path.resolve(process.env.AUTOLISTER_API_PATH, "src/pages/phone-upload.html")
      : null,
    path.resolve(__dirname, "../../quick-vint-api/src/pages/phone-upload.html"),
    path.resolve(__dirname, "../../quick-vint/src/pages/phone-upload.html"),
  ].filter(Boolean);
  const phoneUploadPath = candidates.find((candidate) => fs.existsSync(candidate));

  assert.ok(
    phoneUploadPath,
    `phone-upload.html not found. Checked: ${candidates.join(", ")}`,
  );
  return fs.readFileSync(phoneUploadPath, "utf8");
}

test("extension image compression defaults use standardized JPEG quality", () => {
  const content = fs.readFileSync(
    path.resolve(__dirname, "../content.js"),
    "utf8",
  );

  assert.match(
    content,
    /async function compressImageWithMetadata\([^)]*quality = 0\.8,/s,
  );
  assert.match(
    content,
    /async function compressImage\(imageUrl, maxDimension = 1280, quality = 0\.8\)/,
  );
  assert.match(
    content,
    /compressImageWithMetadata\(objectUrl, 1280, 0\.8\)/,
  );
  assert.match(
    content,
    /compressImageWithMetadata\(entry\.url, 1280, 0\.8, metadataBase\)/,
  );
});

test("manual storage compression retries before original file fallback", () => {
  const content = fs.readFileSync(
    path.resolve(__dirname, "../content.js"),
    "utf8",
  );

  assert.match(
    content,
    /const MANUAL_STORAGE_COMPRESSION_RETRY_DELAYS_MS = \[250\]/,
  );
  assert.match(
    content,
    /async function compressFileForStorageUploadOnce\(file\)/,
  );
  assert.match(
    content,
    /await compressFileForStorageUploadOnce\(file\)/,
  );
});

test("phone upload page compression retries before original file fallback", () => {
  const html = readPhoneUploadPageHtml();

  assert.match(html, /const COMPRESSION_RETRY_DELAYS_MS = \[250\]/);
  assert.match(html, /function compressImageOnce\(file\)/);
  assert.match(html, /await compressImageOnce\(file\)/);
});
