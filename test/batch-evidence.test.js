const { test } = require('node:test');
const assert = require('node:assert/strict');
const evidence = require('../lib/telemetry-flow');

test('photo evidence distinguishes unique confirmations, pending, failed and local previews without retaining URLs', () => {
  const images = [
    {src:'https://images.vinted.net/a?x=1',complete:true,naturalWidth:100},
    {src:'https://images.vinted.net/a?x=2',complete:true,naturalWidth:100},
    {src:'https://images.vinted.net/b',complete:false,naturalWidth:0},
    {src:'https://images.vinted.net/c',complete:true,naturalWidth:0},
    {src:'blob:private-photo',complete:true,naturalWidth:100},
    {src:'https://unknown.example/photo',complete:true,naturalWidth:100},
  ];
  const result = evidence.photoState(images, 4);
  assert.equal(result.count, 1);
  assert.equal(result.pendingCount, 1);
  assert.equal(result.failedPhotoCount, 1);
  assert.equal(result.previewPhotoCount, 1);
  assert.equal(result.duplicatePhotoCount, 1);
  assert.equal(result.unrecognizedPhotoCount, 1);
  assert.equal(result.visiblePhotoCount, 6);
  assert.equal(JSON.stringify(result).includes('private-photo'), false);
});

test('batch timing survives worker reloads, separates paused time and labels explicit Resume', () => {
  assert.equal(typeof evidence.batchTiming, 'function');
  let job = {createdAt:1000,status:'running',completedCount:0};
  job.diagnostics = evidence.batchTiming(null, job, 1000, {initialize:true});
  let paused = {...job,status:'paused'};
  paused.diagnostics = evidence.batchTiming(job,paused,61000);
  assert.equal(paused.diagnostics.pauseCount,1);
  let resumed = {...JSON.parse(JSON.stringify(paused)),status:'running'};
  resumed.diagnostics = evidence.batchTiming(paused,resumed,121000,{resume:true});
  assert.equal(resumed.diagnostics.resumeTrigger,'user_resume');
  assert.equal(resumed.diagnostics.resumeCount,1);
  const reattached = evidence.batchTiming(resumed,resumed,131000,{reattach:true});
  assert.equal(reattached.resumeTrigger,'user_resume');
  assert.equal(reattached.automaticRecoveryCount,1);
  const done = evidence.batchTiming(resumed,{...resumed,status:'done'},181000);
  assert.equal(done.recoveryAgeMs,180000);
  assert.equal(done.pauseDurationMs,60000);
  assert.equal(done.activeDurationMs,120000);
  assert.equal(done.batchFinishedAt,'1970-01-01T00:03:01.000Z');
  assert.equal(done.recoveredFromPause,true);
});

test('legacy timing is explicitly incomplete and malformed diagnostics cannot invent a recovery', () => {
  assert.equal(typeof evidence.batchTiming, 'function');
  const result = evidence.batchTiming({status:'paused',createdAt:1000},{status:'done',createdAt:1000},9000);
  assert.equal(result.timingComplete,false);
  assert.equal(result.activeDurationMs,undefined);
  assert.notEqual(result.recoveredFromPause,true);
});
