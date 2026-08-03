import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const scriptDir = path.dirname(scriptPath);
const checks = Object.freeze({
  "listing-create": Object.freeze({
    name: "listing-create",
    script: "run-dom-canary.mjs",
    profileMode: "canary",
    requiresSession: false,
  }),
  "wardrobe-rewrite": Object.freeze({
    name: "wardrobe-rewrite",
    script: "run-live-wardrobe-rewrite.mjs",
    profileMode: "disposable",
    requiresSession: true,
  }),
});

export function resolveRealBrowserCheck(name) {
  const check = checks[name];
  if (!check) {
    throw new Error(
      `Unknown real-browser check: ${name || "(missing)"}. Use listing-create or wardrobe-rewrite.`,
    );
  }
  return check;
}

export function describeRealBrowserCheck(name) {
  return JSON.stringify(resolveRealBrowserCheck(name));
}

export function runRealBrowser(name, { spawn = spawnSync, env = process.env } = {}) {
  const check = resolveRealBrowserCheck(name);
  const result = spawn(process.execPath, [path.join(scriptDir, check.script)], {
    env,
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  return Number.isInteger(result.status) ? result.status : 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
  try {
    if (process.argv[3] === "--describe") {
      console.log(describeRealBrowserCheck(process.argv[2]));
    } else {
      process.exitCode = runRealBrowser(process.argv[2]);
    }
  } catch (error) {
    console.error(error?.message || error);
    process.exitCode = 1;
  }
}
