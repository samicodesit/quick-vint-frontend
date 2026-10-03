const { test } = require("node:test");
const assert = require("node:assert/strict");
const { photoState, confirmFields } = require("../lib/telemetry-flow.js");

test("local previews and pending photos never confirm host acceptance", () => {
  assert.equal(photoState([{ src: "blob:preview", complete: true, naturalWidth: 200 }], 1).confirmed, false);
  assert.equal(photoState([{ src: "https://images.vinted.net/photo.jpg", complete: false, naturalWidth: 0 }], 1).confirmed, false);
  assert.equal(photoState([], 1).confirmed, false);
});
test("requires the expected number of loaded host images", () => {
  const photos = [{ src: "https://images.vinted.net/photo.jpg", complete: true, naturalWidth: 200 }];
  assert.equal(photoState(photos, 2).confirmed, false);
  assert.equal(photoState(photos, 1).confirmed, true);
});

test("field confirmation uses intended text and does not report a failed write as applied", async () => {
  const events = [];
  global.AutoListerTelemetry = { track: (event, context) => events.push({ event, context }) };
  const field = { value: "old text", addEventListener() {}, removeEventListener() {} };
  await confirmFields({ operationId: "attempt", expectedTitle: "new title", expectedDescription: "new description", titleInput: field, descriptionInput: field,
    wait: async (title, description) => {
      assert.equal(title, "new title"); assert.equal(description, "new description"); throw new Error("Fields rejected");
    }, photoCount: 1 });
  assert.deepEqual(events.map(item => item.event), ["fields_apply_failed"]);
  assert.equal(events[0].context.lastConfirmedStage, "generation_received");
  delete global.AutoListerTelemetry;
});

test("user edits during confirmation remain a quiet review state", async () => {
  const events = []; let listener;
  global.AutoListerTelemetry = { track: (event) => events.push(event) };
  const field = { addEventListener(_event, callback) { listener = callback; }, removeEventListener() {} };
  await confirmFields({ operationId: "attempt", titleInput: field, descriptionInput: field,
    wait: async () => { listener({ isTrusted: true }); throw new Error("Changed by user"); }, photoCount: 1 });
  assert.deepEqual(events, ["listing_review"]);
  delete global.AutoListerTelemetry;
});
