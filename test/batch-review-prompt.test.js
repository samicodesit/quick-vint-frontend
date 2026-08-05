const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const background = fs.readFileSync(path.join(root, "background.js"), "utf8");
const content = fs.readFileSync(path.join(root, "content.js"), "utf8");

test("successful batches offer a review in the final generated tab", () => {
  assert.match(background, /lastWorkTabId[\s\S]*SHOW_BATCH_REVIEW_PROMPT/);
  assert.match(
    content,
    /BATCH_REVIEW_SNOOZE_MS\s*=\s*7\s*\*\s*24\s*\*\s*60\s*\*\s*60\s*\*\s*1000/,
  );
  assert.match(
    content,
    /SHOW_BATCH_REVIEW_PROMPT[\s\S]*showBatchReviewPrompt/,
  );
});
