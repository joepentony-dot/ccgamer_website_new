import assert from "node:assert/strict";
import fs from "node:fs";

const source=fs.readFileSync("arcade/lost-sizzler/js/v10-41-r31-solo-dungeon-regressions.js","utf8");
const start=source.indexOf("function installChestFix(){");
const end=source.indexOf("\n  function aliasCpuPortrait",start);

assert.ok(start>=0&&end>start,"R31 installChestFix must remain present");
const installChestFix=source.slice(start,end);

assert.match(
  installChestFix,
  /const source=window\.openChest;/,
  "R31 chest repair must compose around the current live openChest owner chain"
);
assert.doesNotMatch(
  installChestFix,
  /ownedSource\(["']openChest["']\)/,
  "R31 chest repair must not bypass outer compatibility owners by selecting only the mode gate source"
);
assert.match(
  installChestFix,
  /sourceHasMarker\(source,["']__ccgV141R31ChestFix["']\)/,
  "R31 chest repair must still refuse duplicate R31 layers"
);
assert.match(
  installChestFix,
  /CCGLostSizzlerModeRuntime\?\.ensureOwnedSystemGates\?\.\(\)/,
  "R31 chest repair must retain the mode-owned gate reconciliation step"
);

console.log("R31 chest owner composition contract passed");
