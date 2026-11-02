// Billing text comes from the generated shared bundle. Prices and behavior stay local.
(function (root, factory) {
  const api = factory(root.AutoListerSharedUiCopy || (typeof require === "function" ? require("./shared-ui-copy.js") : null));
  if (typeof module === "object" && module.exports) module.exports = api;
  root.AutoListerBilling = api;
})(typeof globalThis !== "undefined" ? globalThis : window, function (shared) {
  if (!shared) throw Error("Load shared-ui-copy.js before billing translations");
  const copy = shared.billing;
  const packs = [{id:"credits_20",credits:20,priceEur:5.99},{id:"credits_50",credits:50,priceEur:9.99},{id:"credits_100",credits:100,priceEur:16.99}];
  function getCopy(language = "en") {
    const code = String(language).toLowerCase().split(/[-_]/)[0].replace(/^cs$/, "cz");
    return copy[code] || copy.en;
  }
  function formatPrice(price, locale = "en", digits = 2) {
    return new Intl.NumberFormat(locale === "cz" ? "cs" : locale, {style:"currency",currency:"EUR",minimumFractionDigits:digits,maximumFractionDigits:digits}).format(price);
  }
  function formatUnitPrice(price, quantity, locale = "en") {
    return formatPrice(price/quantity, locale, price/quantity < 0.1 ? 3 : 2);
  }
  return { packs, getCopy, formatPrice, formatUnitPrice };
});
