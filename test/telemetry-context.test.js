const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { webcrypto } = require("node:crypto");
const test = require("node:test");
const vm = require("node:vm");

function telemetry() {
  const sandbox = vm.createContext({ crypto: webcrypto, TextEncoder });
  for (const file of ["lib/telemetry-registry.js", "lib/telemetry-client.js"])
    vm.runInContext(readFileSync(file, "utf8"), sandbox);
  return sandbox.AutoListerTelemetry;
}

test("legacy error code and numeric status reach the canonical diagnostic fields", () => {
  const { event } = telemetry().prepare("generate_error", {
    code: "provider_unavailable", status: 503, message: "Service unavailable",
    operationId: "generation-1", generatedDescription: "private listing",
  });
  assert.equal(event.context.errorCode, "provider_unavailable");
  assert.equal(event.context.statusCode, 503);
  assert.equal(event.context.operationId, "generation-1");
  assert.equal(event.context.code, undefined);
  assert.equal(event.context.generatedDescription, undefined);
});

test("explicit canonical diagnostics take precedence and string workflow status stays intact", () => {
  const { event } = telemetry().prepare("phone_upload_transfer_error", {
    errorCode: "PHONE_REQUEST_TIMEOUT", code: "ignored", statusCode: 408, status: "settling",
  });
  assert.equal(event.context.errorCode, "PHONE_REQUEST_TIMEOUT");
  assert.equal(event.context.statusCode, 408);
  assert.equal(event.context.status, "settling");
});
