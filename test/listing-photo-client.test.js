const test=require("node:test");const assert=require("node:assert/strict");
const {hostImageKey,sourceSetKey,missingSlots}=require("../lib/listing-photo-client.js");
test("host identity ignores image transformations and source order but preserves image identity",()=>{
 assert.equal(hostImageKey("https://images1.vinted.net/a.jpg?width=100"),hostImageKey("https://images1.vinted.net/a.jpg?width=500"));
 assert.equal(sourceSetKey(["b","a"]),sourceSetKey(["a","b"]));assert.notEqual(sourceSetKey(["a"]),sourceSetKey(["b"]));
});
test("partial upload recovery returns only the missing slot and respects deliberate deletion after completion",()=>{
 const state={slots:{primary:{hostKey:"a"}},completed:false};
 assert.deepEqual(missingSlots(state,["a"]),["secondary"]);
 assert.deepEqual(missingSlots({...state,completed:true},[]),[]);
});
