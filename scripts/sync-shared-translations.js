const path = require("node:path");
const { spawnSync } = require("node:child_process");
const args = process.argv.slice(2);
for (let index = 0; index < args.length; index++) {
  if (args[index] === "--check") continue;
  if (args[index] !== "--source-root" || !args[++index] || args[index].startsWith("--"))
    throw Error("Use --source-root /path/to/quick-vint-api and optional --check.");
}
const sourceIndex = args.indexOf("--source-root");
const source = sourceIndex >= 0 ? args[sourceIndex + 1] : process.env.AUTOLISTER_TRANSLATIONS_SOURCE_ROOT;
if (!source || source.startsWith("--")) throw Error("Pass --source-root /path/to/quick-vint-api or set AUTOLISTER_TRANSLATIONS_SOURCE_ROOT.");
const command = [path.resolve(source, "scripts/sync-shared-translations.mjs"), "--extension-root", path.resolve(__dirname, "..")];
if (args.includes("--check")) command.push("--check");
const result = spawnSync(process.execPath, command, { stdio: "inherit" });
process.exit(result.status || (result.error ? 1 : 0));
