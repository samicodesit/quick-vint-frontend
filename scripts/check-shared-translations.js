const { createHash } = require("node:crypto");
const { spawnSync } = require("node:child_process");
const path = require("node:path");
const { readFileSync } = require("node:fs");
const shared = require("../lib/shared-ui-copy.js");
const hash = createHash("sha256").update(JSON.stringify(shared.data)).digest("hex");
if (hash !== shared.sourceHash) throw Error("Shared translation bundle was edited. Regenerate it from quick-vint-api.");
const modelHash = createHash("sha256").update(readFileSync(path.resolve(__dirname, "../lib/user-model-copy.js"))).digest("hex");
if (modelHash !== shared.data.componentHashes.userModelCopy) throw Error("Model translations are stale. Regenerate them from quick-vint-api/public/user-model-copy.js.");
const source = process.env.AUTOLISTER_TRANSLATIONS_SOURCE_ROOT;
if (source) {
  const result = spawnSync(process.execPath, [path.resolve(source, "scripts/sync-shared-translations.mjs"), "--check", "--extension-root", path.resolve(__dirname, "..")], { stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status || 1);
}
console.log("Bundled shared translations verified: " + hash.slice(0, 12));
