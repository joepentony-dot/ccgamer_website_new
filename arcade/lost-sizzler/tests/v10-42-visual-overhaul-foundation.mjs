import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const overrides=readFileSync(new URL("../js/asset-overrides.js",import.meta.url),"utf8");
const renderer=readFileSync(new URL("../js/game-render.js",import.meta.url),"utf8");
const manifest=JSON.parse(readFileSync(new URL("../assets/asset-manifest.json",import.meta.url),"utf8"));
const workstream=readFileSync(new URL("../../../docs/ai-work/dungeon-carnage-visual-overhaul.md",import.meta.url),"utf8");

const visualKeys=[
  "playerSheet","enemyWarriorSheet","enemySoldierSheet","enemyArcherSheet","enemyMageSheet","chestSheet","enemyAtlasA","enemyAtlasB",
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

assert.match(renderer,/playerReplacement:make\(selected\("playerSheet"\)\)/,"player replacement must be opt-in so the established CCG explorer remains the default hero");
assert.equal(manifest.images.visualOverhaul.playerSheet,"assets/pixel/explorer-sheet-v10-34.png","manifest must retain the CCG explorer as the default player identity");
assert.equal(manifest.images.visualOverhaul.playerAnimationReference,"assets/pixel/visual-overhaul/shade-puny/warrior-blue.png","generic CC0 Warrior sheet may remain only as animation reference");
assert.match(renderer,/enemyWarrior:make\(selected\("enemyWarriorSheet","assets\/pixel\/visual-overhaul\/shade-puny-enemies\/warrior-red\.png"\)\)/,"enemy warrior sheet must default to the local Shade Puny import");
assert.match(renderer,/enemySoldier:make\(selected\("enemySoldierSheet","assets\/pixel\/visual-overhaul\/shade-puny-enemies\/soldier-red\.png"\)\)/,"enemy soldier sheet must default to the local Shade Puny import");
assert.match(renderer,/enemyArcher:make\(selected\("enemyArcherSheet","assets\/pixel\/visual-overhaul\/shade-puny-enemies\/archer-green\.png"\)\)/,"enemy archer sheet must default to the local Shade Puny import");
assert.match(renderer,/enemyMage:make\(selected\("enemyMageSheet","assets\/pixel\/visual-overhaul\/shade-puny-enemies\/mage-red\.png"\)\)/,"enemy mage sheet must default to the local Shade Puny import");
assert.match(renderer,/PUNY_ENEMY_IDLE_COLUMNS=Object\.freeze\(\[0,1\]\)/,"enemy idle state must use authored Puny frames");
assert.match(renderer,/PUNY_ENEMY_WALK_COLUMNS=Object\.freeze\(\[2,3\]\)/,"enemy movement state must use authored Puny frames");
assert.match(renderer,/PUNY_ENEMY_ATTACK_COLUMNS=Object\.freeze\(\[4,5,6,7\]\)/,"enemy attack state must use a four-frame authored Puny sequence");
assert.match(renderer,/PUNY_ENEMY_HURT_COLUMNS=Object\.freeze\(\[18,19,20\]\)/,"enemy hurt state must use authored Puny frames");
assert.match(renderer,/PUNY_ENEMY_DEATH_COLUMNS=Object\.freeze\(\[21,22,23\]\)/,"enemy death state must use authored Puny frames");
assert.match(renderer,/ghost\.__defeatProgress=progress;if\(!drawPunyEnemySprite\(ghost,cx,cy\)&&!drawAuthoredDungeonEnemySprite\(ghost,cx,cy\)\)drawPixelEnemySprite\(ghost,cx,cy\)/,"defeat visuals must attempt authored Puny death frames before procedural fallback");
assert.match(renderer,/if\(!drawGrotesqueBossSprite\(e,cx,cy\)&&!drawPunyEnemySprite\(e,cx,cy\)&&!drawAuthoredDungeonEnemySprite\(e,cx,cy\)\)drawPixelEnemySprite\(e,cx,cy\)/,"live enemies must prefer bespoke grotesque bosses, then richer Puny/authored animation, before procedural fallback");
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
assert.match(renderer,/function punyPlayerCell\(pose,d,now\)/,"player animation must have a dedicated Puny-sheet frame mapper");
assert.match(renderer,/d\?\.y>0\?0:d\?\.x>0\?2:d\?\.y<0\?4:6/,"four-direction player mapping must use the correct Puny direction rows");
assert.match(renderer,/PUNY_PLAYER_MELEE_COLUMNS=Object\.freeze\(\[4,4,5,6,7,7,6,5\]\)/,"melee must use the real four-frame Puny attack sequence across the existing eight-stage timing");
assert.match(renderer,/PUNY_PLAYER_HURT_COLUMNS=Object\.freeze\(\[18,19,20,19\]\)/,"hurt state must use the real Puny hurt frames");
assert.match(renderer,/punyReady\?replacement:lostSizzlerPixelAssets\.explorer/,"the V10.34 explorer sheet must remain the player decode fallback");
assert.match(renderer,/k==="exitSigil"/,"exit sigil pickup must have a dedicated visual path");
assert.match(renderer,/sigils:make\(selected\("sigilSheet","assets\/pixel\/visual-overhaul\/cc0-portal\/portal-sheet\.png"\)\)/,"sigil must default to the imported local CC0 portal sheet");
assert.match(renderer,/environmentTiles:make\(selected\("environmentTileset"\)\)/,"environment tileset slot must fail safely to no image");

assert.match(renderer,/pixelSheet=customSheet\?\.complete&&customSheet\.naturalWidth>=160\?customSheet:lostSizzlerPixelAssets\.chests/,"owner-supplied chest sheet must fall back to the established V10.34 sheet when unavailable");
assert.match(renderer,/if\(frameArtReady&&\!\(customSheet\?\.complete&&customSheet\.naturalWidth>=160\)\)/,"CC0 frame set must be the normal chest renderer unless an explicit owner sheet is ready");
assert.match(renderer,/frameSet\.every\(image=>image\?\.complete&&image\.naturalWidth>=16&&image\.naturalHeight>=16\)/,"CC0 chest frames must reject malformed images smaller than one real 16x16 sprite cell");
assert.match(renderer,/drawAnimatedChestFallback\(c,s,col,now,anim,pulse\)/,"rich canvas chest must remain the final fallback when image layers fail");
assert.match(renderer,/punyReady=replacement\?\.complete&&replacement\.naturalWidth>=768&&replacement\.naturalHeight>=256,sheet=punyReady\?replacement:lostSizzlerPixelAssets\.explorer/,"Puny player art must decode at its expected dimensions or fall back to the established V10.34 explorer sheet");

const visualBlock=overrides.match(/visuals:\s*\{([\s\S]*?)\n\s*\},\n\s*namedEnemies:/)?.[1]||"";
assert.ok(visualBlock,"visual registry block must be discoverable");
assert.doesNotMatch(visualBlock,/https?:\/\//i,"production visual overrides must not hotlink remote assets");

assert.match(workstream,/CC0|public[- ]domain/i,"visual workstream must record licence policy");
assert.match(workstream,/provenance/i,"visual workstream must require provenance");
assert.match(workstream,/0x72 DungeonTileset II/,"primary visual source candidate must remain documented");

console.log("Dungeon Carnage visual-overhaul asset-registry foundation contract passed.");
