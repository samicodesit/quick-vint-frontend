#!/usr/bin/env node

/**
 * Pre-build script that substitutes environment variables into source files
 * Usage: node scripts/set-env.js
 *
 * Reads API_BASE_URL from process.env or .env file
 * Replaces all hardcoded "https://quick-vint.vercel.app" with the configured value
 */

const fs = require("fs");
const path = require("path");

const PROD_URL = "https://quick-vint.vercel.app";
const LOCAL_URL = "http://localhost:5000";

// Files to process (relative to project root)
const FILES_TO_PROCESS = [
  "content.js",
  "popup.js",
  "callback.js",
  "callback.html",
  "manifest.json",
];

function getApiBaseUrl() {
  // 1. Check environment variable
  if (process.env.API_BASE_URL) {
    return process.env.API_BASE_URL;
  }

  // 2. Check .env file
  const envPath = path.join(__dirname, "..", ".env");
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf8");
    for (const line of envContent.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const [key, ...valueParts] = line.split("=");
      if (key.trim() === "API_BASE_URL") {
        return valueParts
          .join("=")
          .trim()
          .replace(/^["']|["']$/g, "");
      }
    }
  }

  // Default to production — this is intentional so that CI/CD and `npm run build`
  // always produce a production build unless explicitly overridden.
  // Use `npm run build:local` for local development.
  return PROD_URL;
}

function normalizeUrl(url) {
  return url.trim().replace(/\/$/, "");
}

function replaceInFile(filePath, fromUrl, toUrl) {
  const fullPath = path.join(__dirname, "..", filePath);
  if (!fs.existsSync(fullPath)) return false;

  const content = fs.readFileSync(fullPath, "utf8");

  // Reset any known dev URLs to production first, then replace with target
  let newContent = content.split(LOCAL_URL).join(PROD_URL);
  newContent = newContent.split(fromUrl).join(toUrl);

  fs.writeFileSync(fullPath, newContent, "utf8");
  return true;
}

function main() {
  const targetUrl = normalizeUrl(getApiBaseUrl());

  console.log(`Setting API base URL to: ${targetUrl}`);

  for (const file of FILES_TO_PROCESS) {
    try {
      const updated = replaceInFile(file, PROD_URL, targetUrl);
      console.log(`  ${updated ? "Updated" : "Skipped (missing)"}: ${file}`);
    } catch (err) {
      console.error(`  Error in ${file}:`, err.message);
    }
  }
}

if (require.main === module) {
  main();
}

module.exports = { getApiBaseUrl, replaceInFile, PROD_URL };
