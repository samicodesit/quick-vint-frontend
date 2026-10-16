// Local interactive preview of the actual candidate extension. No live services.
const http = require("node:http");
const path = require("node:path");
const { openBatchJourney } = require("../tests/e2e/batch-journey");
const { expect } = require("@playwright/test");

const port = Number(process.env.BATCH_PREVIEW_PORT || 4187);
let flow = null;
let opening = false;
let error = "";
let stopping = false;

async function resetPreview() {
  if (opening) return;
  opening = true; error = "";
  try {
    await flow?.close(); flow = null;
    const sweater = path.resolve(__dirname, "../images/quickvint-upload-single.jpg");
    const outfit = path.resolve(__dirname, "../images/quickvint-upload-multiple.jpg");
    flow = await openBatchJourney({ realVisibility: true, localPreview: true, hostPhotoDelay: 1200,
      photoPaths: [sweater, sweater, outfit, outfit],
      generate: async ({ route, request, requests, commits }) => {
        await new Promise(resolve => setTimeout(resolve, 6500));
        const item = requests.length;
        const result = item === 1
          ? { title: "Cream textured knit sweater", description: "Cream knit sweater with a textured pattern and round neckline.\n\nLocal demo description. Check the photos and add the actual size, condition and measurements before publishing.", measurementAdvice: "" }
          : { title: "Casual outfit collection", description: "Casual clothing and accessories shown in the photos.\n\nLocal demo description. Check the photos and add the actual sizes, condition and measurements before publishing.", measurementAdvice: "" };
        commits.set(request.id, result);
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(result) });
      },
    });
    await flow.controller.setViewportSize({ width: 1280, height: 900 });
    flow.context.on("page", page => void page.setViewportSize({ width: 1280, height: 900 }).catch(() => {}));
    // Use the actual visible organizer, but leave the single Start action to the seller.
    await flow.controller.locator("#quickvint-phone-btn").click();
    await flow.controller.locator(".quickvint-upload-choice-multiple").click();
    const modal = flow.controller.locator("#quickvint-batch-modal");
    await expect(modal.locator(".batch-photo")).toHaveCount(4);
    for (let group = 0; group < 2; group++) {
      await expect(modal.locator(".batch-gallery .batch-photo:visible")).toHaveCount(4 - group * 2);
      await modal.locator(".batch-gallery .batch-photo:visible").nth(0).click();
      await modal.locator(".batch-gallery .batch-photo:visible").nth(1).click();
      await modal.locator(".batch-mark-group").click();
      await expect(modal.locator(".batch-gallery .batch-photo:visible")).toHaveCount(2 - group * 2);
    }
    await expect(modal.locator(".batch-start")).toHaveText("Generate 2 listings");
    await flow.controller.bringToFront();
  } catch (cause) { error = cause.message; }
  finally { opening = false; }
}

const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>AutoLister local preview</title>
<style>*{box-sizing:border-box}body{margin:0;background:#f8f7fc;color:#27213d;font:16px/1.6 system-ui,sans-serif}main{max-width:740px;margin:64px auto;padding:32px;background:white;border:1px solid #e5dff1;border-radius:16px}small{color:#705098;font-weight:700;letter-spacing:.08em}h1{font-size:30px;line-height:1.2}p{color:#625b75}li{margin:12px 0}button{min-height:44px;padding:10px 18px;border:0;border-radius:8px;background:#6e46b6;color:white;font:inherit;cursor:pointer}button+button{margin-left:8px;background:#eee8f8;color:#503a85}button:disabled{opacity:.5;cursor:wait}#status{padding:14px;background:#f5f2fb;border-radius:8px}footer{font-size:13px;color:#746c82;margin-top:28px}@media(max-width:700px){main{margin:16px;padding:24px}}</style>
<main><small>LOCAL ONLY</small><h1>Try the batch review flow</h1><p>The candidate extension opens in its own Chromium window. Two demo listings are already grouped, so you can try the one-click start.</p>
<ol><li>Click <strong>Generate 2 listings</strong> in the extension window.</li><li>Each new listing tab opens in front immediately. Watch its photos upload and title and description appear.</li><li>To stay on a finished listing, pause auto-follow or start editing before the next tab opens. You can also switch to another tab. The batch continues in the background.</li></ol>
<p id="status" role="status">Opening preview...</p><button id="show">Show extension window</button><button id="reset">Restart preview</button>
<footer>Actual MV3 extension, Chrome tab focus, form filling and local storage. Local fixtures replace the marketplace, uploaded photos, authentication and AI responses. No customer account, paid generation or live listing actions. This preview does not certify network recovery, production readiness or Orion/iOS.</footer></main>
<script>async function refresh(){try{const s=await fetch('/status').then(r=>r.json());document.querySelector('#status').textContent=s.error?'Preview needs attention: '+s.error:s.opening?'Opening preview...':s.requests?s.ready+' / 2 listings ready. '+s.requests+' local generation request(s).':'Ready. Click Generate 2 listings in the extension window.';document.querySelectorAll('button').forEach(b=>b.disabled=s.opening)}catch{document.querySelector('#status').textContent='Preview server stopped.'}}document.querySelector('#reset').onclick=()=>fetch('/reset',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'}).then(refresh);document.querySelector('#show').onclick=()=>fetch('/show',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});setInterval(refresh,1200);refresh();</script></html>`;

const server = http.createServer(async (request, response) => {
  if (!["localhost", "127.0.0.1"].includes(String(request.headers.host || "").split(":")[0])) { response.writeHead(403); response.end(); return; }
  response.setHeader("Cache-Control", "no-store");
  if (request.method === "GET" && request.url === "/") { response.setHeader("Content-Type", "text/html; charset=utf-8"); response.end(html); return; }
  if (request.method === "GET" && request.url === "/status") {
    const records = await flow?.worker.evaluate(() => chrome.storage.local.get("quickvintBatchReviews")).catch(() => ({}));
    const review = Object.values(records?.quickvintBatchReviews || {}).at(-1);
    response.setHeader("Content-Type", "application/json");
    response.end(JSON.stringify({ opening, error, requests: flow?.requests.length || 0, ready: review?.tabs.filter(Number.isInteger).length || 0 })); return;
  }
  if (request.method === "POST") {
    if (!["http://localhost:" + port, "http://127.0.0.1:" + port].includes(request.headers.origin)) { response.writeHead(403); response.end(); return; }
    if (request.url === "/reset") { void resetPreview(); response.writeHead(202); response.end(); return; }
    if (request.url === "/show") {
      if (!opening && flow) {
        const tabs = flow.context.pages().filter(page => page.url().includes("/items/new"));
        await (tabs.at(-1) || flow.controller).bringToFront().catch(() => {});
      }
      response.writeHead(204); response.end(); return;
    }
  }
  response.writeHead(404); response.end();
});
server.listen(port, "127.0.0.1", () => { console.log("Local batch preview: http://localhost:" + port); void resetPreview(); });
async function stop() {
  if (stopping) return; stopping = true;
  await flow?.close(); server.close(); process.exit(0);
}
process.on("SIGINT", stop); process.on("SIGTERM", stop);
module.exports = { getFlow: () => flow, resetPreview };
