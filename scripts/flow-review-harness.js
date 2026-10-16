// Review-only fixtures. All UI actions remain explicit in the manual walkthrough.
const fs = require("node:fs");
const path = require("node:path");
const { openBatchJourney } = require("../tests/e2e/batch-journey");
const root = process.env.FLOW_REVIEW_OUTPUT ? path.resolve(process.env.FLOW_REVIEW_OUTPUT) : path.resolve(__dirname, "../docs/reviews/2026-10-16-flows");
fs.mkdirSync(root, { recursive: true });
const steps = [];

async function capture(page, flow, id, title, note, selector) {
  const filename = `${flow}-${id}.png`;
  await page.screenshot({ path: path.join(root, filename), animations: "disabled" });
  let detail = null;
  if (selector) {
    detail = `${flow}-${id}-detail.png`;
    await page.locator(selector).screenshot({ path: path.join(root, detail), animations: "disabled" });
  }
  const item = { flow, id, title, note, filename, detail, capturedAt: new Date().toISOString() };
  steps.push(item);
  fs.writeFileSync(path.join(root, "steps.json"), JSON.stringify(steps, null, 2) + "\n");
  return item;
}

async function openExtensionFlow({ single = false, manual = false } = {}) {
  const sweater = path.resolve(__dirname, "../images/quickvint-upload-single.jpg");
  const outfit = path.resolve(__dirname, "../images/quickvint-upload-multiple.jpg");
  const pending = [];
  const flow = await openBatchJourney({ realVisibility: true, localPreview: true, hostPhotoDelay: 1200,
    photoPaths: single ? [sweater, sweater] : [sweater, sweater, outfit, outfit],
    generate: async ({ route, request, requests, commits }) => {
      let finish;
      const ready = new Promise(resolve => { finish = resolve; });
      pending.push({ request, finish });
      await ready;
      const result = requests.length === 1 || single
        ? { title: "Cream textured knit sweater", description: "Cream knit sweater with a textured pattern and round neckline.\n\nDemo output. Add the actual size, condition and measurements before publishing.", measurementAdvice: "" }
        : { title: "Casual outfit collection", description: "Casual clothing and accessories shown in the photos.\n\nDemo output. Check the actual sizes, condition and measurements before publishing.", measurementAdvice: "" };
      commits.set(request.id, result);
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(result) });
    },
  });
  await flow.controller.setViewportSize({ width: 1280, height: 900 });
  flow.context.on("page", page => void page.setViewportSize({ width: 1280, height: 900 }).catch(() => {}));
  const uploads = [];
  if (manual) await flow.context.route("https://autolister.app/api/phone-upload**", async route => {
    const request = route.request(), url = new URL(request.url());
    if (url.searchParams.get("action") === "cleanup") return route.fulfill({ status: 204 });
    if (request.method() === "POST") {
      const body = request.postDataBuffer()?.toString("latin1") || "";
      const index = Number(body.match(/name="uploadOrder"\r\n\r\n(\d+)/)?.[1]);
      if (!Number.isInteger(index)) throw new Error("Missing upload order in real multipart request");
      uploads[index] = { ...flow.files[index], order: index };
      return route.fulfill({ json: { success: true, count: 1, expectedCount: 2, files: [uploads[index]] } });
    }
    return route.fulfill({ json: { success: true, v: 2, files: uploads, count: uploads.length, complete: true } });
  });
  return { ...flow, get worker() { return flow.worker; }, pending, uploads, capture: (id, title, note, selector, page = flow.controller) => capture(page, single ? manual ? "single-computer" : "single-phone" : "batch", id, title, note, selector),
    finish: index => pending[index].finish() };
}
module.exports = { root, steps, capture, openExtensionFlow };
