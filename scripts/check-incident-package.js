const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const { chromium } = require("@playwright/test");
const { INCLUDE_LIST, copyReleaseItem, minifyContentScript, createZip } = require("../build.js");
const root = path.resolve(__dirname, "..");

async function main() {
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "autolister-package-check-"));
  const staged = path.join(scratch, "extension");
  fs.mkdirSync(staged);
  let browser;
  try {
    minifyContentScript(root);
    for (const item of INCLUDE_LIST) copyReleaseItem(root, staged, item);
    const manifest = JSON.parse(fs.readFileSync(path.join(staged, "manifest.json"), "utf8"));
    assert.ok(manifest.permissions.includes("alarms"));
    for (const name of ["core", "client", "registry", "background", "flow"]) assert.ok(fs.existsSync(path.join(staged, `lib/telemetry-${name}.js`)));
    for (const file of manifest.content_scripts.flatMap(script => script.js)) assert.ok(fs.existsSync(path.join(staged, file)), file);
    for (const html of ["popup.html", "callback.html"]) {
      const source = fs.readFileSync(path.join(staged, html), "utf8");
      for (const [, script] of source.matchAll(/<script[^>]+src="([^"]+)"/g)) assert.ok(fs.existsSync(path.join(staged, script)), script);
    }
    const api = path.resolve(root, "../quick-vint-api/public");
    if (fs.existsSync(api)) for (const name of ["core", "client", "registry"]) {
      assert.equal(fs.readFileSync(path.join(staged, `lib/telemetry-${name}.js`), "utf8"), fs.readFileSync(path.join(api, `telemetry-${name}.js`), "utf8"), `${name} differs between the coordinated repositories`);
    }
    browser = await chromium.launchPersistentContext(path.join(scratch, "profile"), { channel: "chromium", headless: true, offline: true, args: [`--disable-extensions-except=${staged}`, `--load-extension=${staged}`] });
    const worker = browser.serviceWorkers()[0] || await browser.waitForEvent("serviceworker");
    assert.deepEqual(await worker.evaluate(() => [typeof AutoListerBackgroundTelemetry.accept, typeof AutoListerTelemetry.prepare, Boolean(AutoListerEventRegistry.fields_apply_failed)]), ["function", "function", true]);
    await browser.close(); browser = null;
    const artifact = path.join(root, "dist", `autolister-incident-validation-v${manifest.version}.zip`);
    fs.mkdirSync(path.dirname(artifact), { recursive: true });
    await createZip(staged, artifact);
    const report = { artifact, version: manifest.version, sha256: crypto.createHash("sha256").update(fs.readFileSync(artifact)).digest("hex"), bytes: fs.statSync(artifact).size, helpersVerified: 5, packagedWorkerLoaded: true, offline: true, releaseStatusChanged: false };
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await browser?.close();
    assert.equal(path.dirname(scratch), os.tmpdir());
    assert.ok(path.basename(scratch).startsWith("autolister-package-check-"));
    fs.rmSync(scratch, { recursive: true, force: true });
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
