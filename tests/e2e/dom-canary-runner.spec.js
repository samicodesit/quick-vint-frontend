const { test, expect } = require("@playwright/test");
const http = require("node:http");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

// Real Chromium and loopback HTTP test the runner/report boundary. The fixture
// supplies controls; this does not certify Vinted or product injection.
async function fixture(missingLanguages = false) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "autolister-canary-test-"));
  const extensionPath = path.join(root, "extension");
  await fs.mkdir(extensionPath);
  await fs.writeFile(path.join(extensionPath, "manifest.json"), JSON.stringify({
    manifest_version: 3, name: "Canary runner fixture", version: "9.8.7",
  }));
  const reports = [];
  const server = http.createServer(async (req, res) => {
    if (req.method === "POST") {
      const parts = [];
      for await (const part of req) parts.push(part);
      reports.push(JSON.parse(Buffer.concat(parts)));
      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end('{"ok":true}');
    }
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end('<title>Listing fixture</title><label data-testid="title-field"><span data-testid="title--title">Title</span><input data-testid="title--input" value="PRIVATE_TITLE"></label><textarea data-testid="description--input">PRIVATE_DESCRIPTION</textarea><input type="file" name="photos"><div class="quickvint-tools"><button id="quickvint-gen-btn"></button><button id="quickvint-signin-btn"></button><button id="quickvint-phone-btn"></button>' + (missingLanguages ? '' : '<select id="quickvint-title-language-select"></select><select id="quickvint-description-language-select"></select>') + '</div>');
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  return {
    reports,
    config: { secret: "local-fixture", profileDir: path.join(root, "profile"),
      extensionPath, url: `${base}/items/new`, apiUrl: `${base}/api/dom-canary`,
      headless: true, channel: "chromium", timeoutMs: 1000, postResult: true,
      keepOpenMs: 0, resultPath: path.join(root, "last-result.json") },
    async close() {
      server.closeAllConnections();
      await new Promise(resolve => server.close(resolve));
      await fs.rm(root, { recursive: true, force: true });
    },
  };
}

test("selector success retains the actual loaded version and every production proof flag", async () => {
  const f = await fixture();
  try {
    const { runDomCanary } = await import("../../scripts/run-dom-canary.mjs");
    const result = await runDomCanary(f.config);
    expect(result.status).toBe("passed");
    expect(result.extensionVersion).toBe("9.8.7");
    expect(result.result.injected).toBe(true);
    expect(result.result.dom).toMatchObject({ title: true, description: true,
      fileInput: true, generateButton: true, signInButton: true, phoneButton: true,
      titleLanguage: true, descriptionLanguage: true, tools: true });
    expect(f.reports).toEqual([result]);
    expect(JSON.parse(await fs.readFile(f.config.resultPath, "utf8"))).toEqual(result);
  } finally { await f.close(); }
});

test("a real browser-launch failure still produces a retained failure report", async () => {
  const f = await fixture();
  try {
    const { runDomCanary } = await import("../../scripts/run-dom-canary.mjs");
    const result = await runDomCanary({ ...f.config, executablePath: path.join(f.config.profileDir, "missing-browser") });
    expect(result.status).toBe("failed");
    expect(result.result.reason).toBe("browser_launch_failed");
    expect(f.reports).toEqual([result]);
    expect(JSON.parse(await fs.readFile(f.config.resultPath, "utf8"))).toEqual(result);
  } finally { await f.close(); }
});

test("missing language controls retain bounded field structure without field contents", async () => {
  const f = await fixture(true);
  try {
    const { runDomCanary } = await import("../../scripts/run-dom-canary.mjs");
    const result = await runDomCanary(f.config);
    expect(result.status).toBe("failed");
    expect(result.result.dom.fieldStructure.title[0]).toMatchObject({ tag: "LABEL", testId: "title-field" });
    expect(result.result.dom.fieldStructure.title).toHaveLength(3);
    expect(JSON.stringify(result.result.dom.fieldStructure)).not.toContain("PRIVATE_");
    expect(f.reports).toEqual([result]);
  } finally { await f.close(); }
});
