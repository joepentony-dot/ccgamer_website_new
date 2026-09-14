import fs from "node:fs";

const source = fs.readFileSync("js/ccg-community-config.js", "utf8");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(source.includes("function positionCommunitySection(section)"), "community position helper must remain");
assert(source.includes("if (section.nextElementSibling === peripherals) return;"), "already-correct peripherals position must not be reinserted");
assert(source.includes("if (section.nextElementSibling === quickActions) return;"), "already-correct quick-actions position must not be reinserted");
assert(source.includes("shell.insertBefore(section, peripherals);"), "peripherals fallback repositioning must remain");
assert(source.includes("shell.insertBefore(section, quickActions);"), "quick-actions fallback repositioning must remain");
assert(source.includes("if (section.parentElement === shell && section === shell.lastElementChild) return;"), "last-child no-op guard must remain");
assert(source.includes("shell.appendChild(section);"), "append fallback must remain");
assert(source.includes("var section = document.createElement('section');"), "fallback section creation must remain");
assert(source.includes("ensureCommunityStylesheet();"), "community stylesheet fallback must remain");

console.log("Community section position no-op guard passed.");
