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
assert(source.includes('document.querySelectorAll("a[href]").forEach((link) => {'), "legacy affiliate link cleanup behaviour must remain present");

console.log("CCG mobile-lite startup optimisation guard passed.");
