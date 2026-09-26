(function (root) {
  "use strict";
  const VERSION = 1;
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const allowedTypes = new Set(["OPS_HELLO", "OPS_PREPARE_LISTING"]);

  function isUuid(value) { return typeof value === "string" && UUID.test(value); }
  function validateMessage(message) {
    if (!message || typeof message !== "object" || Array.isArray(message) || !allowedTypes.has(message.type) || message.version !== VERSION || !isUuid(message.requestId)) return false;
    const keys = Object.keys(message).sort().join(",");
    if (message.type === "OPS_HELLO") return keys === "requestId,type,version";
    return keys === "itemId,listingId,requestId,revisionId,type,version,workspaceId" &&
      [message.workspaceId, message.itemId, message.listingId, message.revisionId].every(isUuid);
  }
  function validatePacket(packet, message) {
    return Boolean(packet && packet.protocolVersion === VERSION && packet.state === "prepared" &&
      packet.workspaceId === message.workspaceId && packet.itemId === message.itemId &&
      packet.listingId === message.listingId && packet.revisionId === message.revisionId &&
      typeof packet.title === "string" && packet.title.length > 0 && packet.title.length <= 100 &&
      typeof packet.description === "string" && packet.description.length > 0 && packet.description.length <= 10000 &&
      Number.isSafeInteger(packet.price?.minor) && packet.price.minor > 0 &&
      /^[A-Z]{3}$/.test(packet.price?.currency || ""));
  }
  function setNativeValue(field, value, doc) {
    const prototype = field.tagName === "TEXTAREA" ? doc.defaultView.HTMLTextAreaElement.prototype : doc.defaultView.HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
    if (setter) setter.call(field, value); else field.value = value;
    field.dispatchEvent(new doc.defaultView.Event("input", { bubbles: true }));
    field.dispatchEvent(new doc.defaultView.Event("change", { bubbles: true }));
  }
  function fillListing(packet, doc, path) {
    if (path !== "/items/new") return { ok: false, state: "prepared", reason: "Open a new Vinted listing form." };
    const title = doc.querySelector('input[data-testid="title--input"]');
    const description = doc.querySelector('textarea[data-testid="description--input"]');
    if (!title || !description) return { ok: false, state: "prepared", reason: "Supported title and description fields were not found." };
    if ((title.value && title.value !== packet.title) || (description.value && description.value !== packet.description)) return { ok: false, state: "prepared", reason: "The form already has different text. Review it before replacing anything." };
    setNativeValue(title, packet.title, doc);
    setNativeValue(description, packet.description, doc);
    if (title.value !== packet.title || description.value !== packet.description) return { ok: false, state: "prepared", reason: "Vinted did not keep the filled text." };
    return { ok: true, state: "filled", filledFields: ["title", "description"], unsupportedFields: ["price", "photos", "category", "condition"], reason: "Title and description filled. Add remaining fields and publish in Vinted yourself." };
  }
  const api = { VERSION, validateMessage, validatePacket, fillListing };
  root.OpsBridge = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
