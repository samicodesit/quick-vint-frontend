#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const rootDir = path.join(__dirname, "..");
const manifestPath = path.join(rootDir, "manifest.json");
const publishedVersionPath = path.join(rootDir, "CHROME_WEB_STORE_VERSION");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function readVersionFile(filePath) {
  return fs.readFileSync(filePath, "utf8").trim();
}

function assertVersion(version, label) {
  if (!/^\d+\.\d+\.\d+$/.test(version)) {
    throw new Error(`${label} must use x.y.z format, got "${version}"`);
  }
}

function parseVersion(version) {
  assertVersion(version, "Version");
  return version.split(".").map((part) => Number(part));
}

function compareVersions(a, b) {
  const left = parseVersion(a);
  const right = parseVersion(b);

  for (let index = 0; index < left.length; index += 1) {
    if (left[index] > right[index]) return 1;
    if (left[index] < right[index]) return -1;
  }

  return 0;
}

function nextPatch(version) {
  const [major, minor, patch] = parseVersion(version);
  return `${major}.${minor}.${patch + 1}`;
}

function getVersions() {
  if (!fs.existsSync(manifestPath)) {
    throw new Error("manifest.json not found");
  }

  if (!fs.existsSync(publishedVersionPath)) {
    throw new Error("CHROME_WEB_STORE_VERSION not found");
  }

  const manifest = readJson(manifestPath);
  const manifestVersion = manifest.version;
  const publishedVersion = readVersionFile(publishedVersionPath);

  assertVersion(manifestVersion, "manifest.json version");
  assertVersion(publishedVersion, "CHROME_WEB_STORE_VERSION");

  return {
    manifest,
    manifestVersion,
    publishedVersion,
    suggestedNextVersion: nextPatch(publishedVersion),
  };
}

function writeManifestVersion(version) {
  assertVersion(version, "New manifest version");

  const { manifest } = getVersions();
  manifest.version = version;
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
}

function writePublishedVersion(version) {
  assertVersion(version, "Published version");
  fs.writeFileSync(publishedVersionPath, `${version}\n`);
}

function printStatus() {
  const { manifestVersion, publishedVersion, suggestedNextVersion } = getVersions();
  const uploadable = compareVersions(manifestVersion, publishedVersion) > 0;

  console.log(`Published Chrome Web Store version: ${publishedVersion}`);
  console.log(`manifest.json version:              ${manifestVersion}`);
  console.log(`Next upload version:                ${suggestedNextVersion}`);
  console.log(`Ready to upload:                    ${uploadable ? "yes" : "no"}`);

  if (!uploadable) {
    console.log("");
    console.log(`Run: npm run release:bump`);
  }
}

function checkUploadable() {
  const { manifestVersion, publishedVersion, suggestedNextVersion } = getVersions();

  checkVersionAgainstPublished(manifestVersion, publishedVersion, suggestedNextVersion);

  console.log(`Release version check passed: ${manifestVersion} > ${publishedVersion}`);
}

function checkVersionAgainstPublished(version, publishedVersion, suggestedNextVersion) {
  if (compareVersions(version, publishedVersion) <= 0) {
    console.error("Release version check failed.");
    console.error(`Published Chrome Web Store version: ${publishedVersion}`);
    console.error(`Upload version:                     ${version}`);
    console.error(`Next upload version should be:       ${suggestedNextVersion}`);
    console.error("");
    console.error("Run: npm run release:bump");
    process.exit(1);
  }
}

function bumpPatch() {
  const { suggestedNextVersion } = getVersions();
  writeManifestVersion(suggestedNextVersion);
  console.log(`manifest.json bumped to ${suggestedNextVersion}`);
}

function markPublished(versionArg) {
  const { manifestVersion } = getVersions();
  const version = versionArg || manifestVersion;
  writePublishedVersion(version);
  console.log(`CHROME_WEB_STORE_VERSION updated to ${version}`);
}

function checkVersion(versionArg) {
  if (!versionArg) {
    throw new Error("check-version requires a version argument");
  }

  assertVersion(versionArg, "Upload version");
  const { publishedVersion, suggestedNextVersion } = getVersions();
  checkVersionAgainstPublished(versionArg, publishedVersion, suggestedNextVersion);
  console.log(`Release version check passed: ${versionArg} > ${publishedVersion}`);
}

function main() {
  const [command, versionArg] = process.argv.slice(2);

  switch (command) {
    case "status":
      printStatus();
      break;
    case "check":
      checkUploadable();
      break;
    case "bump-patch":
      bumpPatch();
      break;
    case "mark-published":
      markPublished(versionArg);
      break;
    case "check-version":
      checkVersion(versionArg);
      break;
    default:
      console.error("Usage: node scripts/release-version.js <status|check|check-version|bump-patch|mark-published> [version]");
      process.exit(1);
  }
}

if (require.main === module) {
  main();
}
