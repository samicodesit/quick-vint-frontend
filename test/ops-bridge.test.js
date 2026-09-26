const assert = require("node:assert/strict");
const test = require("node:test");
const bridge = require("../ops-bridge.js");

const ids = {
  workspaceId: "c0000000-0000-4000-8000-000000000901",
  itemId: "c0000000-0000-4000-8000-000000000902",
  listingId: "c0000000-0000-4000-8000-000000000903",
  revisionId: "c0000000-0000-4000-8000-000000000904",
};
const message = { type: "OPS_PREPARE_LISTING", version: 1, requestId: "c0000000-0000-4000-8000-000000000905", ...ids };
const packet = { protocolVersion: 1, state: "prepared", ...ids, title: "Levi's jeans W30", description: "Small scuff at hem", price: { minor: 2499, currency: "EUR" } };

test("bridge rejects extra fields, incompatible versions and foreign revision packets", () => {
  assert.equal(bridge.validateMessage(message), true);
  assert.equal(bridge.validateMessage({ ...message, version: 2 }), false);
  assert.equal(bridge.validateMessage({ ...message, publish: true }), false);
  assert.equal(bridge.validatePacket(packet, message), true);
  assert.equal(bridge.validatePacket({ ...packet, revisionId: ids.listingId }, message), false);
  assert.equal(bridge.validatePacket({ ...packet, workspaceId: ids.itemId }, message), false);
  assert.equal(bridge.validatePacket({ ...packet, state: "live" }, message), false);
});

test("fills only supported title and description fields and never submits", () => {
  class Input {
    constructor(tagName) { this.tagName = tagName; this.value = ""; this.events = []; }
    dispatchEvent(event) { this.events.push(event.type); }
  }
  const title = new Input("INPUT");
  const description = new Input("TEXTAREA");
  const doc = {
    defaultView: { HTMLInputElement: Input, HTMLTextAreaElement: Input, Event: class { constructor(type) { this.type = type; } } },
    querySelector(selector) { return selector.includes("title") ? title : selector.includes("description") ? description : null; },
  };
  const result = bridge.fillListing(packet, doc, "/items/new");
  assert.equal(result.state, "filled");
  assert.deepEqual(result.filledFields, ["title", "description"]);
  assert.equal(title.value, packet.title);
  assert.equal(description.value, packet.description);
  assert.deepEqual(title.events, ["input", "change"]);
  assert.equal(bridge.fillListing({ ...packet, title: "Different" }, doc, "/items/new").state, "prepared");
  assert.equal(bridge.fillListing(packet, doc, "/items/123/edit").state, "prepared");
});
