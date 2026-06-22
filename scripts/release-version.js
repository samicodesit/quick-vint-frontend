#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const rootDir = path.join(__dirname, "..");
const manifestPath = path.join(rootDir, "manifest.json");
const storeVersionPath = path.join(rootDir, "CHROME_WEB_STORE_VERSION");
const pendingVersionPath = path.join(rootDir, "CHROME_WEB_STORE_PENDING_VERSION");

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

  if (!fs.existsSync(storeVersionPath)) {
    throw new Error("CHROME_WEB_STORE_VERSION not found");
  }

  const manifest = readJson(manifestPath);
  const manifestVersion = manifest.version;
  const storeVersion = readVersionFile(storeVersionPath);
  const pendingVersion = fs.existsSync(pendingVersionPath)
    ? readVersionFile(pendingVersionPath)
    : null;

  assertVersion(manifestVersion, "manifest.json version");
  assertVersion(storeVersion, "CHROME_WEB_STORE_VERSION");
  if (pendingVersion) {
    assertVersion(pendingVersion, "CHROME_WEB_STORE_PENDING_VERSION");
  }

  return {
    manifest,
    manifestVersion,
    storeVersion,
    pendingVersion,
    suggestedNextVersion: nextPatch(storeVersion),
  };
}

function writeManifestVersion(version) {
  assertVersion(version, "New manifest version");

  const { manifest } = getVersions();
  manifest.version = version;
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
}

function writeStoreVersion(version) {
  assertVersion(version, "Chrome Web Store version");
  fs.writeFileSync(storeVersionPath, `${version}\n`);
}

function writePendingVersion(version) {
  assertVersion(version, "Pending version");
  fs.writeFileSync(pendingVersionPath, `${version}\n`);
}

function clearPendingVersion() {
  if (fs.existsSync(pendingVersionPath)) {
    fs.unlinkSync(pendingVersionPath);
  }
}

function printStatus() {
  const { manifestVersion, storeVersion, pendingVersion, suggestedNextVersion } = getVersions();
  const uploadable =
    compareVersions(manifestVersion, storeVersion) > 0 && !pendingVersion;

  console.log(`Last Chrome Web Store upload:       ${storeVersion}`);
  console.log(`manifest.json version:              ${manifestVersion}`);
  console.log(`Pending uploaded package:           ${pendingVersion || "none"}`);
  console.log(`Next upload version:                ${suggestedNextVersion}`);
  console.log(`Ready to upload:                    ${uploadable ? "yes" : "no"}`);

  if (pendingVersion) {
    console.log("");
    console.log(
      `Finish pending ${pendingVersion}: npm run release:mark-uploaded -- ${pendingVersion}`,
    );
    console.log("If the upload was discarded: npm run release:clear-pending");
  } else if (!uploadable) {
    console.log("");
    console.log(`Run: npm run release:bump`);
  }
}

function checkUploadable() {
  const { manifestVersion, storeVersion, pendingVersion, suggestedNextVersion } = getVersions();

  if (pendingVersion) {
    console.error("Release version check failed.");
    console.error(`Pending uploaded package: ${pendingVersion}`);
    console.error("");
    console.error(
      `Finish it first: npm run release:mark-uploaded -- ${pendingVersion}`,
    );
    console.error("If the upload was discarded: npm run release:clear-pending");
    process.exit(1);
  }

  checkVersionAgainstStore(manifestVersion, storeVersion, suggestedNextVersion);

  console.log(`Release version check passed: ${manifestVersion} > ${storeVersion}`);
}

function checkVersionAgainstStore(version, storeVersion, suggestedNextVersion) {
  if (compareVersions(version, storeVersion) <= 0) {
    console.error("Release version check failed.");
    console.error(`Last Chrome Web Store upload:       ${storeVersion}`);
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

function markUploaded(versionArg) {
  const { manifestVersion } = getVersions();
  const version = versionArg || manifestVersion;
  writeStoreVersion(version);
  clearPendingVersion();
  console.log(`CHROME_WEB_STORE_VERSION updated to ${version}`);
  console.log("Pending release cleared.");
}

function checkVersion(versionArg) {
  if (!versionArg) {
    throw new Error("check-version requires a version argument");
  }

  assertVersion(versionArg, "Upload version");
  const { storeVersion, pendingVersion, suggestedNextVersion } = getVersions();
  if (pendingVersion) {
    console.error("Release version check failed.");
    console.error(`Pending uploaded package: ${pendingVersion}`);
    console.error("");
    console.error(
      `Finish it first: npm run release:mark-uploaded -- ${pendingVersion}`,
    );
    console.error("If the upload was discarded: npm run release:clear-pending");
    process.exit(1);
  }

  checkVersionAgainstStore(versionArg, storeVersion, suggestedNextVersion);
  console.log(`Release version check passed: ${versionArg} > ${storeVersion}`);
}

function markPending(versionArg) {
  if (!versionArg) {
    throw new Error("mark-pending requires a version argument");
  }

  assertVersion(versionArg, "Pending version");
  writePendingVersion(versionArg);
  console.log(`CHROME_WEB_STORE_PENDING_VERSION updated to ${versionArg}`);
}

function clearPending() {
  clearPendingVersion();
  console.log("Pending release cleared.");
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
    case "mark-uploaded":
    case "mark-published":
      markUploaded(versionArg);
      break;
    case "check-version":
      checkVersion(versionArg);
      break;
    case "mark-pending":
      markPending(versionArg);
      break;
    case "clear-pending":
      clearPending();
      break;
    default:
      console.error("Usage: node scripts/release-version.js <status|check|check-version|bump-patch|mark-pending|mark-uploaded|mark-published|clear-pending> [version]");
      process.exit(1);
  }
}

if (require.main === module) {
  main();
}
