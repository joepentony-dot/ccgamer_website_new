import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const overrides=readFileSync(new URL("../js/asset-overrides.js",import.meta.url),"utf8");
const renderer=readFileSync(new URL("../js/game-render.js",import.meta.url),"utf8");
const manifest=JSON.parse(readFileSync(new URL("../assets/asset-manifest.json",import.meta.url),"utf8"));
const workstream=readFileSync(new URL("../../../docs/ai-work/dungeon-carnage-visual-overhaul.md",import.meta.url),"utf8");

const visualKeys=[
  "playerSheet","chestSheet","enemyAtlasA","enemyAtlasB",
  "environmentAtlas","switchSheet","sigilSheet","environmentTileset"
];

assert.match(overrides,/visuals:\s*\{/,"visual override registry must exist");
for(const key of visualKeys){
  assert.match(overrides,new RegExp(`\\b${key}:null\\b`),`visual override must expose ${key}`);
  assert.ok(Object.prototype.hasOwnProperty.call(manifest.images.visualOverhaul,key),`asset manifest must expose ${key}`);
}

assert.match(renderer,/window\.CCG_ASSET_OVERRIDES\?\.images\?\.visuals\|\|\{\}/,"renderer must read the visual override registry");
assert.match(renderer,/selected\("playerSheet","assets\/pixel\/explorer-sheet-v10-34\.png"\)/,"player fallback must remain the current explorer sheet");
assert.match(renderer,/selected\("chestSheet","assets\/pixel\/chest-sheet-v10-34\.png"\)/,"chest fallback must remain the current chest sheet");
assert.match(renderer,/selected\("enemyAtlasA","assets\/pixel\/enemy-atlas-standard-a-v10-35\.png"\)/,"enemy atlas A fallback must remain local");
assert.match(renderer,/selected\("enemyAtlasB","assets\/pixel\/enemy-atlas-standard-b-v10-35\.png"\)/,"enemy atlas B fallback must remain local");
assert.match(renderer,/selected\("environmentAtlas","assets\/pixel\/environment-atlas-v10-35\.png"\)/,"environment atlas fallback must remain local");
assert.match(renderer,/switches:make\(selected\("switchSheet"\)\)/,"switch replacement slot must fail safely to no image");
assert.match(renderer,/sigils:make\(selected\("sigilSheet"\)\)/,"sigil replacement slot must fail safely to no image");
assert.match(renderer,/environmentTiles:make\(selected\("environmentTileset"\)\)/,"environment tileset slot must fail safely to no image");

const visualBlock=overrides.match(/visuals:\s*\{([\s\S]*?)\n\s*\},\n\s*namedEnemies:/)?.[1]||"";
assert.ok(visualBlock,"visual registry block must be discoverable");
assert.doesNotMatch(visualBlock,/https?:\/\//i,"production visual overrides must not hotlink remote assets");

assert.match(workstream,/CC0|public[- ]domain/i,"visual workstream must record licence policy");
assert.match(workstream,/provenance/i,"visual workstream must require provenance");
assert.match(workstream,/0x72 DungeonTileset II/,"primary visual source candidate must remain documented");

console.log("Dungeon Carnage visual-overhaul asset-registry foundation contract passed.");
