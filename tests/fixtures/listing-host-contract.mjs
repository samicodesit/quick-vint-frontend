import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
export async function listingFixture(root) {
  // Reuse the sibling-label host contract already covered in extension.spec.js.
  // The minimal generation fixture lacks these anchors and hides both selectors.
  let html = (await fs.readFile(path.join(root, 'tests/fixtures/vinted-listing.html'), 'utf8'))
    .replace(/<label>\s*Title\s*<input data-testid="title--input"\s*\/?>\s*<\/label>/,
      '<div><label class="input-label" for="listing-title">Title</label><div data-testid="title" class="input-root"><input id="listing-title" data-testid="title--input"></div></div>')
    .replace(/<label>\s*Description\s*<textarea data-testid="description--input"><\/textarea>\s*<\/label>/,
      '<div data-testid="description"><div class="textarea-top"><label for="listing-description">Description</label></div><textarea id="listing-description" data-testid="description--input"></textarea></div>')
    .replace('<section data-testid="media-upload-grid">', '<p>Photos</p><section data-testid="media-upload-grid">')
    .replace(/src="data:image[^\"]+"/, `src="data:image/png;base64,${(await fs.readFile(path.join(root, 'icons/icon48.png'))).toString('base64')}"`);
  // Recorded real-host evidence (2026-11-01): Photos precedes About your item.
  // The minimal generation fixture has a different order and is not a layout reference.
  const photos = html.match(/<p>Photos<\/p><section data-testid="media-upload-grid">[\s\S]*?<\/section>/)?.[0];
  assert.ok(photos, 'Photo section must exist before correcting the host order');
  html = html.replace(photos, '').replace('<main>', `<main>${photos}<h2>About your item</h2>`);
  return html;
}
