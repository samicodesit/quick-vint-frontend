const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const vm = require("node:vm");
const { spawn } = require("node:child_process");

test("failed journey startup waits for its owned browser to exit before profile cleanup", { timeout: 10000 }, async () => {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "autolister-startup-qa-"));
  const launchFailure = new Error("Controlled missing debugging port");
  let child;
  let ready;
  const childScript = `
    const fs = require('node:fs');
    const path = require('node:path');
    const profile = process.argv[1];
    fs.mkdirSync(path.join(profile, 'Default'), { recursive: true });
    process.on('SIGTERM', () => setTimeout(() => {
      fs.writeFileSync(path.join(profile, 'Default', 'final-write'), 'finished');
      process.exit(0);
    }, 200));
    process.stderr.write('x'.repeat(10000) + 'isolated-startup-diagnostic\\n');
    process.send('ready');
    setInterval(() => {}, 1000);
  `;
  const source = fs.readFileSync(path.resolve(__dirname, "../tests/e2e/batch-journey.js"), "utf8");
  const moduleObject = { exports: {} };
  const context = vm.createContext({
    module: moduleObject, console, process, Buffer, setTimeout, clearTimeout,
    require(name) {
      if (name === "@playwright/test") return {
        chromium: { executablePath: () => process.execPath },
        expect: { poll: () => ({ async toBe() { await ready; throw launchFailure; } }) },
      };
      if (name === "node:child_process") return {
        spawn() {
          child = spawn(process.execPath, ["-e", childScript, profile], { stdio: ["ignore", "ignore", "pipe", "ipc"] });
          ready = new Promise((resolve, reject) => { child.once("message", resolve); child.once("error", reject); });
          return child;
        },
      };
      return require(name);
    },
  });
  vm.runInContext(source + "\nmodule.exports.launchJourneyBrowser = launchJourneyBrowser;", context);
  try {
    let rejection;
    try { await moduleObject.exports.launchJourneyBrowser(profile, "/isolated-extension", { realVisibility: true, hostPort: 1 }); }
    catch (error) { rejection = error; }
    assert.ok(child.exitCode !== null || child.signalCode !== null, "startup must not return while the owned profile writer is alive");
    assert.equal(rejection.cause, launchFailure);
    assert.equal(fs.readFileSync(path.join(profile, "Default", "final-write"), "utf8"), "finished");
    assert.match(rejection.message, /Controlled missing debugging port/);
    assert.match(rejection.message, /isolated-startup-diagnostic/);
    assert.ok(rejection.message.length < 5000, "startup diagnostics must remain bounded");
  } finally {
    if (child && child.exitCode === null && child.signalCode === null) {
      const exited = new Promise(resolve => child.once("exit", resolve));
      child.kill("SIGKILL");
      await exited;
    }
    assert.equal(path.dirname(fs.realpathSync(profile)), os.tmpdir());
    fs.rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
});
