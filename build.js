#!/usr/bin/env node

/**
 * AutoLister AI - Build Script for Chrome Extension Release
 * Usage: node build.js [version]
 * Example: node build.js 1.2.3
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// Configuration
const INCLUDE_LIST = [
  "manifest.json",
  "content.js",
  "background.js",
  "popup.html",
  "popup.js",
  "callback.html",
  "callback.js",
  "lib",
  "icons",
  "_locales",
];

const EXCLUDE_PATTERNS = [
  /^\./, // hidden files
  /\.md$/, // markdown files
  /\.zip$/, // zip files
  /node_modules/, // node_modules
  /store-descriptions/, // store descriptions folder
];

const COLORS = {
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  nc: "\x1b[0m",
};

function log(message, color = "nc") {
  console.log(`${COLORS[color]}${message}${COLORS.nc}`);
}

function shouldInclude(filePath) {
  const basename = path.basename(filePath);
  for (const pattern of EXCLUDE_PATTERNS) {
    if (pattern.test(basename)) return false;
  }
  return true;
}

function copyRecursive(src, dest) {
  const stat = fs.statSync(src);

  if (stat.isDirectory()) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    const entries = fs.readdirSync(src);
    for (const entry of entries) {
      if (!shouldInclude(entry)) continue;
      copyRecursive(path.join(src, entry), path.join(dest, entry));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

function createZip(sourceDir, outputFile) {
  try {
    execSync(
      `cd "${sourceDir}" && zip -r "${outputFile}" . -x ".*" -x "*.md"`,
      { stdio: "ignore" },
    );
  } catch (e) {
    throw new Error(
      "Packaging requires the system 'zip' command. Install it (e.g. 'apt install zip' or 'brew install zip') and try again."
    );
  }
}

function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

async function main() {
  log("🏗️  AutoLister AI - Release Builder", "green");
  log("====================================");

  // Ensure production URLs in the staged copy, not the source files
  const { PROD_URL } = require("./scripts/set-env");
  const FILES_TO_UPDATE = [
    "content.js",
    "popup.js",
    "callback.js",
    "callback.html",
    "manifest.json",
  ];

  log("🔄 Ensuring production URLs...", "yellow");

  const versionArg = process.argv[2];
  const scriptDir = __dirname;
  const manifestPath = path.join(scriptDir, "manifest.json");

  // Validate manifest exists
  if (!fs.existsSync(manifestPath)) {
    log("❌ Error: manifest.json not found", "red");
    process.exit(1);
  }

  // Read and parse manifest
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  let currentVersion = manifest.version;

  log(`📦 Current version: ${currentVersion}`, "yellow");

  // Update version if provided
  if (versionArg) {
    if (!/^\d+\.\d+\.\d+$/.test(versionArg)) {
      log(
        "❌ Invalid version format. Use semantic versioning (e.g., 1.2.3)",
        "red",
      );
      process.exit(1);
    }

    log(`📝 Updating version to: ${versionArg}`, "yellow");
    manifest.version = versionArg;
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
    currentVersion = versionArg;
  }

  // Create dist directory
  const distDir = path.join(scriptDir, "dist");
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }

  const outputFile = path.join(distDir, `autolister-ai-v${currentVersion}.zip`);

  // Remove old zip if exists
  if (fs.existsSync(outputFile)) {
    log("🗑️  Removing old package...");
    fs.unlinkSync(outputFile);
  }

  // Create temp staging directory
  const tempDir = fs.mkdtempSync(
    path.join(require("os").tmpdir(), "autolister-build-"),
  );

  try {
    // Copy files to temp directory
    log("📂 Staging files...");
    for (const item of INCLUDE_LIST) {
      const srcPath = path.join(scriptDir, item);
      const destPath = path.join(tempDir, item);

      if (fs.existsSync(srcPath)) {
        copyRecursive(srcPath, destPath);
      } else {
        log(`⚠️  Warning: ${item} not found, skipping`, "yellow");
      }
    }

    // Apply production URL substitutions on the staged copy (not source files)
    const NON_PROD_PATTERNS = [
      "http://localhost:5000",
      "http://localhost:3000",
      "http://localhost:4321",
    ];
    for (const file of FILES_TO_UPDATE) {
      const stagedPath = path.join(tempDir, file);
      if (fs.existsSync(stagedPath)) {
        let content = fs.readFileSync(stagedPath, "utf8");
        for (const pattern of NON_PROD_PATTERNS) {
          content = content.split(pattern).join(PROD_URL);
        }
        fs.writeFileSync(stagedPath, content, "utf8");
      }
    }

    // Create ZIP
    log("🗜️  Creating package...");
    await createZip(tempDir, outputFile);

    // Verify output
    if (fs.existsSync(outputFile)) {
      const stats = fs.statSync(outputFile);
      const fileSize = formatBytes(stats.size);

      log("");
      log("✅ Package created successfully!", "green");
      log(`📍 Location: ${outputFile}`, "yellow");
      log(`📊 Size: ${fileSize}`, "yellow");
      log("");
      log("Files included:");

      // List files in zip
      try {
        const output = execSync(`unzip -l "${outputFile}"`, {
          encoding: "utf8",
        });
        const lines = output.split("\n").slice(3, -3);
        lines.forEach((line) => {
          const parts = line.trim().split(/\s+/);
          if (parts.length >= 4) {
            const filename = parts.slice(3).join(" ");
            console.log(`  ${filename}`);
          }
        });
      } catch (e) {
        log(
          '  (run "unzip -l dist/autolister-ai-vX.X.X.zip" to see contents)',
          "yellow",
        );
      }
    } else {
      log("❌ Failed to create package", "red");
      process.exit(1);
    }
  } finally {
    // Cleanup temp directory
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

main().catch((err) => {
  log(`❌ Error: ${err.message}`, "red");
  process.exit(1);
});
