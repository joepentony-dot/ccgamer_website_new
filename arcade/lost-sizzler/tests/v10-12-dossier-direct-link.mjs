import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const gameDir=path.resolve(here,"..");
const read=name=>fs.readFileSync(path.join(gameDir,name),"utf8");

const dossier=read("js/v10-6-dossier-polish.js");
const loader=read("js/asset-overrides.js");
const main=read("js/game-main.js");

assert.match(dossier,/querySelectorAll\("\.dossier-entry\.unknown"\).*remove/s,"undiscovered dossier entries are removed");
assert.match(dossier,/querySelectorAll\("\.dossier-entry:not\(\.focused\)"\).*remove/s,"first-encounter dossier view keeps only the focused enemy");
assert.match(dossier,/No named enemies encountered yet/,"empty dossier has a safe discovered-only state");
assert.match(dossier,/const discoveryQueue=\[\]/,"first-time enemy cards use an explicit queue");
assert.match(dossier,/const knownNames=new Set\(Object\.entries\(stored\)/,"persistent dossier history decides whether an enemy type is new");
assert.match(dossier,/if\(firstEver&&!discoveryQueue\.includes\(name\)\)discoveryQueue\.push\(name\)/,"each enemy type enters the discovery queue only once");
assert.match(dossier,/const name=discoveryQueue\.shift\(\)/,"queued discoveries are shown one at a time");
assert.match(dossier,/showNamedDossier\(name,true\)/,"the first encounter opens the focused dossier panel");
assert.match(dossier,/named-dossier-close.*scheduleNextDiscovery/s,"closing one dossier advances a simultaneous second discovery");

assert.match(loader,/DOMContentLoaded.*startEnhancements/s,"direct-link enhancements start at DOM ready rather than full window load");
assert.doesNotMatch(loader,/window\.addEventListener\("load"/,"direct-link startup no longer waits for the full load event");
assert.match(loader,/optional enhancement timed out/,"a stalled optional enhancement cannot freeze the rest of the patch queue");
assert.ok(loader.indexOf("v10-9-browser-stability.js")<loader.indexOf("lost-sizzler-playlist-audio.js"),"browser stability guard loads before optional audio enhancements");
assert.match(loader,/CCG_DOSSIER_REV="20260823b"/,"updated dossier logic is cache-busted");

assert.match(main,/installEarlyStableResize/,"base game installs a stability guard before its first resize");
assert.match(main,/pixelBudget/,"cold boot canvas allocation has a device-aware pixel ceiling");
assert.match(main,/Math\.min\(4096/,"cold boot canvas width has a hard upper bound");
assert.match(main,/Math\.min\(2160/,"cold boot canvas height has a hard upper bound");
assert.ok(main.indexOf("installEarlyStableResize();")<main.indexOf("requestAnimationFrame(loop)"),"early resize guard is active before the render loop starts");

console.log("V10.12 final dossier and direct-link regression checks passed");
