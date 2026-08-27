import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const source=fs.readFileSync(path.join(root,"js/v10-41-ui-spy-performance-hardening.js"),"utf8");
const loader=fs.readFileSync(path.join(root,"js/v10-41-r30-spy-exit-control-reset.js"),"utf8");

assert.match(loader,/v10-41-ui-spy-performance-hardening\.js/,"r30 tail must load the late Horde/Spy UI-performance hardening layer");
assert.match(loader,/data-ccg-ui-spy-performance-hardening/,"late Horde/Spy hardening loader must be deduplicated");

assert.match(source,/position:static!important/,"Horde players roster must be taken out of absolute canvas-overlay positioning");
assert.match(source,/hub\.appendChild\(roster\)/,"Horde players roster must be reparented into the below-game player hub");
assert.match(source,/lastHordeRosterSignature/,"Horde roster rendering must be signature-gated instead of rewriting every frame");
assert.match(source,/HORDE_CLEANUP_MS=900/,"Horde dungeon leak cleanup must be throttled rather than reallocating state every animation frame");
assert.match(source,/hordeDungeonLeak\(\)/,"Horde cleanup must still repair real dungeon-state leakage immediately");
assert.match(source,/HORDE_DRIVE_MS=48/,"Horde live enemy pressure should run on a bounded cadence rather than duplicate full work every display frame");

assert.match(source,/function repairHordeHealth/,"Horde health must have an explicit authoritative model/physical player reconciliation path");
assert.match(source,/H\.collectHealth\(runState,pickup\.id,model\.id,now\)/,"Horde pickup collection must mutate the Horde rules model first");
assert.match(source,/live\.health=Math\.max\(0,Number\(model\.hp\|\|0\)\)/,"successful Horde health collection must immediately update visible physical HP");
assert.match(source,/runState\.playerCount\|\|runState\.players\?\.length/,"Solo Horde health must have a safe one-player ID fallback");

assert.match(source,/id="spy-independent-hud"/,"Spy Vs Spy must own a dedicated HUD rather than repurposing Dungeon key/inventory cards");
assert.match(source,/data-special-mode="sizzler-saboteurs"[\s\S]*\.critical-strip/,"Spy must hide Dungeon critical/key UI while the independent HUD owns presentation");
assert.match(source,/data-special-mode="sizzler-saboteurs"[\s\S]*\.tactical-zone/,"Spy must hide the Dungeon tactical/sidebar UI instead of fighting it");
assert.match(source,/lastSpyHudSignature/,"Spy objective HUD must only write when its state changes");
assert.match(source,/legacy\.state\.rendering=true/,"the retained r27 Spy layer must yield its old repeated Dungeon-HUD renderer to the dedicated owner");
assert.match(source,/legacy\?\.restoreUi\?\.\(\)/,"leaving Spy must restore the ordinary Dungeon UI state");

assert.match(source,/id="spy-search-indicator"/,"Spy searchable furniture must have a dedicated interaction indicator");
assert.match(source,/SEARCH_FEEDBACK_MS=520/,"Spy search feedback must expose visible progress rather than a one-frame prompt only");
assert.match(source,/SEARCHING \$\{state\.searchTargetLabel/,"Spy search indicator must describe the furniture currently being searched");
assert.match(source,/style\.width=`\$\{progress\}%`/,"Spy search progress must drive a visible percentage bar");

assert.doesNotMatch(source,/window\.update\s*=/,"late UI/performance hardening must not take ownership of the global update loop");
assert.doesNotMatch(source,/window\.movePlayer\s*=/,"late UI/performance hardening must not compete for movement ownership");

console.log("Lost Sizzler Horde/Spy UI, health, isolation and performance hardening contracts passed.");
