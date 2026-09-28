import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const overrides=readFileSync(new URL("../js/asset-overrides.js",import.meta.url),"utf8");
const renderer=readFileSync(new URL("../js/game-render.js",import.meta.url),"utf8");
const manifest=JSON.parse(readFileSync(new URL("../assets/asset-manifest.json",import.meta.url),"utf8"));
const workstream=readFileSync(new URL("../../../docs/ai-work/dungeon-carnage-visual-overhaul.md",import.meta.url),"utf8");

const visualKeys=[
  "playerSheet","chestSheet","enemyAtlasA","enemyAtlasB",
  "environmentAtlas","switchSheet","switchSecretSheet","sigilSheet","environmentTileset",
  "chestFrame0","chestFrame1","chestFrame2",
  "spikeTrapFrame0","spikeTrapFrame1","spikeTrapFrame2","spikeTrapFrame3",
  "doorLeafClosed","doorLeafOpen","doorFrameLeft","doorFrameRight","doorFrameTop",
  "floorTile1","floorTile2","floorTile3","floorTile4","floorTile5","floorTile6","floorTile7","floorTile8","wallTileMid","wallTileHole1","wallTileHole2"
];

assert.match(overrides,/visuals:\s*\{/,"visual override registry must exist");
for(const key of visualKeys){
  assert.match(overrides,new RegExp(`\\b${key}:null\\b`),`visual override must expose ${key}`);
  assert.ok(Object.prototype.hasOwnProperty.call(manifest.images.visualOverhaul,key),`asset manifest must expose ${key}`);
}

assert.match(renderer,/window\.CCG_ASSET_OVERRIDES\?\.images\?\.visuals\|\|\{\}/,"renderer must read the visual override registry");

assert.match(renderer,/explorer:make\("assets\/pixel\/explorer-sheet-v10-34\.png"\)/,"player fallback must remain the established explorer sheet");
assert.match(renderer,/chests:make\("assets\/pixel\/chest-sheet-v10-34\.png"\)/,"chest fallback must remain the established chest sheet");
assert.match(renderer,/enemyAtlasA:make\("assets\/pixel\/enemy-atlas-standard-a-v10-35\.png"\)/,"enemy atlas A fallback must remain local");
assert.match(renderer,/enemyAtlasB:make\("assets\/pixel\/enemy-atlas-standard-b-v10-35\.png"\)/,"enemy atlas B fallback must remain local");
assert.match(renderer,/environmentAtlas:make\("assets\/pixel\/environment-atlas-v10-35\.png"\)/,"environment atlas fallback must remain local");

assert.match(renderer,/playerReplacement:make\(selected\("playerSheet"\)\)/,"player replacement must be optional and layered above the fallback");
assert.match(renderer,/chestReplacement:make\(selected\("chestSheet"\)\)/,"chest replacement must be optional and layered above the fallback");
assert.match(renderer,/enemyAtlasAReplacement:make\(selected\("enemyAtlasA"\)\)/,"enemy atlas A replacement slot must remain optional");
assert.match(renderer,/enemyAtlasBReplacement:make\(selected\("enemyAtlasB"\)\)/,"enemy atlas B replacement slot must remain optional");
assert.match(renderer,/environmentAtlasReplacement:make\(selected\("environmentAtlas"\)\)/,"environment atlas replacement slot must remain optional");
assert.match(renderer,/switches:make\(selected\("switchSheet","assets\/pixel\/visual-overhaul\/0x72\/lever-left\.png"\)\)/,"ordinary switch must default to the imported local CC0 lever");
assert.match(renderer,/secretSwitches:make\(selected\("switchSecretSheet","assets\/pixel\/visual-overhaul\/0x72\/lever-right\.png"\)\)/,"secret switch must default to the alternate imported local CC0 lever");
assert.match(renderer,/chestFrames:\s*\[/,"renderer must load a frame-based CC0 chest set");
assert.match(renderer,/spikeTrapFrames:\s*\[/,"renderer must load a frame-based CC0 spike set");
assert.match(renderer,/lastMode="cc0-frames"/,"live chest renderer must identify the CC0 frame path");
assert.match(renderer,/t\.kind==="spike"&&spikeArtReady/,"live spike renderer must prefer the imported animation when decoded");
assert.match(renderer,/floorTiles:\s*\[/,"renderer must preload the eight named CC0 floor variants");
assert.match(renderer,/wallTiles:\s*\{/,"renderer must preload normal and damaged CC0 wall variants");
assert.match(renderer,/floorArt=floorSet\.length\?floorSet\[h%floorSet\.length\]:null/,"floor texture selection must be deterministic from the existing tile hash");
assert.match(renderer,/h%31===0\?lostSizzlerPixelAssets\.wallTiles\?\.hole2:h%23===0\?lostSizzlerPixelAssets\.wallTiles\?\.hole1/,"damaged wall variants must remain sparse and deterministic");
assert.match(renderer,/doorLeafClosed:make\(selected\("doorLeafClosed","assets\/pixel\/visual-overhaul\/0x72\/door-leaf-closed\.png"\)\)/,"closed door sprite must remain local and overrideable");
assert.match(renderer,/doorLeafOpen:make\(selected\("doorLeafOpen","assets\/pixel\/visual-overhaul\/0x72\/door-leaf-open\.png"\)\)/,"open door sprite must remain local and overrideable");
assert.match(renderer,/frame\*32,0,32,40,-18,-30,36,45/,"ready exit must render the five-frame CC0 portal strip");
assert.match(renderer,/k==="exitSigil"/,"exit sigil pickup must have a dedicated visual path");
assert.match(renderer,/sigils:make\(selected\("sigilSheet","assets\/pixel\/visual-overhaul\/cc0-portal\/portal-sheet\.png"\)\)/,"sigil must default to the imported local CC0 portal sheet");
assert.match(renderer,/environmentTiles:make\(selected\("environmentTileset"\)\)/,"environment tileset slot must fail safely to no image");

assert.match(renderer,/replacement\?\.complete&&replacement\.naturalWidth\?replacement:lostSizzlerPixelAssets\.chests/,"chest replacement must fall back if it is not decoded");
assert.match(renderer,/replacement\?\.complete&&replacement\.naturalWidth\?replacement:lostSizzlerPixelAssets\.explorer/,"player replacement must fall back if it is not decoded");

const visualBlock=overrides.match(/visuals:\s*\{([\s\S]*?)\n\s*\},\n\s*namedEnemies:/)?.[1]||"";
assert.ok(visualBlock,"visual registry block must be discoverable");
assert.doesNotMatch(visualBlock,/https?:\/\//i,"production visual overrides must not hotlink remote assets");

assert.match(workstream,/CC0|public[- ]domain/i,"visual workstream must record licence policy");
assert.match(workstream,/provenance/i,"visual workstream must require provenance");
assert.match(workstream,/0x72 DungeonTileset II/,"primary visual source candidate must remain documented");

console.log("Dungeon Carnage visual-overhaul asset-registry foundation contract passed.");
