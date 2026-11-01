const { test } = require('node:test');
const assert = require('node:assert/strict');
const ui = require('../lib/listing-model-photos');
test('every supported locale covers every photo operation and action',()=>{
 for(const [locale,row] of Object.entries(ui.rows)){
  assert.equal(row.split('|').length,ui.keys.length,locale);
  assert.ok(row.split('|').every(Boolean),locale);
 }
 assert.equal(ui.statusKey({status:'ready'}),null);
 assert.equal(ui.statusKey({status:'attachment_failed'}),'Couldn’t add model photos.');
});
