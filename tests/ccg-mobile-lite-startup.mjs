import fs from "node:fs";

const source = fs.readFileSync("js/ccg-mobile-lite.js", "utf8");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(source.includes("let legacyRetailerCommissionUiInitialPassDone = false;"), "startup cleanup must track its completed initial pass");
assert(source.includes("if (!document.body) return;"), "startup cleanup must defer safely when the body is unavailable");
assert(source.includes("if (!force && legacyRetailerCommissionUiInitialPassDone) return;"), "normal repeated startup calls must avoid a second full DOM scan");
assert(source.includes("legacyRetailerCommissionUiInitialPassDone = true;"), "a successful startup cleanup must mark the initial pass complete");
assert(source.includes('window.addEventListener("ccg:game-loaded", () => retireLegacyRetailerCommissionUi({ force: true }));'), "dynamic game rendering must still force a fresh cleanup pass");
assert(source.includes("'a[href*=\"amzn.to\" i]'"), "legacy cleanup must still inspect shortened Amazon links");
assert(source.includes("'a[href*=\"amazon.\" i]'"), "legacy cleanup must still inspect Amazon host links");
assert(source.includes("'a[data-ccg-affiliate-link=\"amazon\"]'"), "legacy cleanup must still inspect explicit Amazon affiliate markers");
assert(source.includes("'a[data-ccg-revenue-link=\"amazon-affiliate\"]'"), "legacy cleanup must still inspect explicit Amazon revenue markers");
assert(!source.includes('document.querySelectorAll("a[href]")'), "startup cleanup must not scan every link when only legacy affiliate candidates need parsing");
assert(source.includes('root.classList.add("ccg-mobile-lite", "ccg-mobile-defer-visuals");'), "mobile classification and visual deferral classes must remain intact");
assert(source.includes('document.dispatchEvent(new Event("ccg-visuals-ready"));'), "visuals-ready event contract must remain intact");
assert(source.includes("requestAnimationFrame(markVisualsReady);"), "desktop visuals-ready scheduling must remain frame-based");
assert(!source.includes("const loadDeferredScripts ="), "unused deferred-script loader must remain removed");
assert(!source.includes("const scheduleDeferredScripts ="), "unused deferred-script scheduler must remain removed");
assert(!source.includes('script[data-ccg-defer]'), "mobile-lite must not scan for unused deferred-script placeholders");
assert(!source.includes("scheduleDeferredScripts();"), "mobile-lite startup must not schedule unused deferred-script work");

console.log("CCG mobile-lite startup optimisation guard passed.");
