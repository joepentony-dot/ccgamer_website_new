import fs from "node:fs";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const mobileLite = fs.readFileSync("js/ccg-mobile-lite.js", "utf8");
const gameRuntime = fs.readFileSync("js/load-single-game.js", "utf8");
const dynamicShell = fs.readFileSync("games/game.html", "utf8");
const canonicalGame = fs.readFileSync("games/commando/index.html", "utf8");

assert(!mobileLite.includes("ccg-box-dialog"), "mobile-lite must not carry single-game box-dialog runtime");
assert(gameRuntime.includes("function ensureDedicatedBoxDialog()"), "single-game runtime must own dialog creation");
assert(gameRuntime.includes("function openDedicatedBoxDialog(box)"), "single-game runtime must own dialog opening");
assert(gameRuntime.includes("function bindDedicatedBoxDialog()"), "single-game runtime must own box-dialog binding");
assert(gameRuntime.includes('root.dataset.ccgDedicatedBoxDialogBound = "true"'), "binding must remain idempotent");
assert(gameRuntime.includes('document.addEventListener("click", (event) => {'), "box interaction must remain document delegated");
assert(gameRuntime.includes('}, true);'), "box interaction must remain capture-phase to beat the legacy modal listener");
assert(gameRuntime.includes("bindDedicatedBoxDialog();"), "single-game startup must bind before game rendering completes");
assert(gameRuntime.includes("resetLegacyBoxModal();"), "dedicated dialog must still reset the legacy screenshot modal");
assert(dynamicShell.includes('<script src="../js/load-single-game.js" defer></script>'), "dynamic game shell must load the single-game runtime");
assert(canonicalGame.includes('<script src="/js/load-single-game.js" defer></script>'), "canonical game pages must load the single-game runtime");

console.log("CCG game box-dialog runtime extraction guard passed.");
