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
test('unsuitable items have a quiet terminal status while cancelled operations stay hidden',()=>{
 assert.equal(ui.statusKey({status:'skipped',eligible:false}), 'Model photos aren’t available for this item.');
 assert.equal(ui.statusKey({status:'cancelled'}),null);
});
test('ordering failures report uploaded photos without asking the user to move them',()=>{
 assert.equal(ui.statusKey({status:'order_failed'}),'Photos added. Couldn’t put them first.');
});
