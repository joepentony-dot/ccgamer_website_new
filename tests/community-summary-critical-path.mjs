import fs from "node:fs";

const source = fs.readFileSync("js/ccg-community-comments.js", "utf8");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(source.includes("const summaryState = {"), "comments runtime must track summary request state");
assert(source.includes("if (!force && summaryState.contextKey === contextKey) return;"), "completed duplicate summary queries must be skipped");
assert(source.includes("summaryState.inFlight && summaryState.inFlightKey === contextKey"), "in-flight duplicate summary queries must be coalesced");
assert(source.includes("await summaryState.inFlight;"), "duplicate callers must reuse the active summary request");
assert(source.includes("summaryState.contextKey = contextKey;"), "successful summary queries must memoize their game context");
assert(source.includes("refreshSummaryCount({ force: true });"), "comment mutations must force a fresh summary count");
assert(source.includes("refreshSummaryCount();"), "normal startup/game-load summary refresh behaviour must remain present");
assert(source.includes("window.addEventListener('ccg:game-loaded'"), "game-loaded summary refresh behaviour must remain present");

console.log("Community summary critical-path guard passed.");
