import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";

const overrides=readFileSync(new URL("../js/asset-overrides.js",import.meta.url),"utf8").replaceAll("\r\n","\n");
const renderer=readFileSync(new URL("../js/game-render.js",import.meta.url),"utf8").replaceAll("\r\n","\n");
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

// Exercise the real cached stone painter against immutable geometry. It must
// remain a bounded presentation resource, with the existing wall as fallback.
const raster=[],submitted=[];
let material={wall:"#453aa0",hi:"#7f70eb"},created=0,canvasAvailable=true;
const stoneSandbox={window:{},document:{querySelector:()=>null,getElementById:()=>null,
  createElement(tag){
    assert.equal(tag,"canvas");created++;
    return{getContext(){return canvasAvailable?{imageSmoothingEnabled:false,
      save(){},restore(){},translate(){},fillRect(...rect){raster.push(rect)}}:null}};
  }},C:{tile:48},run:{floor:1},world:null,W:{themeAt:()=>material},
  ctx:{drawImage(...args){submitted.push(args)}}};
vm.createContext(stoneSandbox);
vm.runInContext(renderer,stoneSandbox,{timeout:1000});
function stoneWorld(mask){
  const map=Array.from({length:5},()=>Array(5).fill(1));
  if(mask&1)map[1][2]=0;if(mask&2)map[2][3]=0;
  if(mask&4)map[3][2]=0;if(mask&8)map[2][1]=0;
  return Object.freeze({map:Object.freeze(map.map(row=>Object.freeze(row)))});
}
for(let mask=0;mask<16;mask++){
  stoneSandbox.world=stoneWorld(mask);
  const before=JSON.stringify(stoneSandbox.world),beforeBuilds=created;
  raster.length=0;submitted.length=0;
  const result=vm.runInContext("drawDungeonStoneRelief({x:48,y:96},2,2,7)",stoneSandbox);
  assert.equal(result,mask!==0,"only exposed wall edges receive relief");
  assert.equal(JSON.stringify(stoneSandbox.world),before,"stonework cannot mutate collision geometry");
  if(!mask)continue;
  assert.ok(raster.length>0,"exposed faces must contain actual stone detail");
  for(const [x,y,w,h] of raster)assert.ok(x>=0&&y>=0&&w>0&&h>0&&x+w<=48&&y+h<=48,"stone pixels must stay inside their wall tile");
  vm.runInContext("drawDungeonStoneRelief({x:96,y:144},2,2,7)",stoneSandbox);
  assert.equal(created,beforeBuilds+1,"identical material/edge/seed must reuse one raster");
  assert.equal(submitted[0][0],submitted[1][0],"camera movement must reuse the same bitmap");
}
// Every canonical material/seed/mask fits, including camera exploration.
const worldSandbox={window:{}};vm.createContext(worldSandbox);
vm.runInContext(readFileSync(new URL("../js/config.js",import.meta.url),"utf8"),worldSandbox);
vm.runInContext(readFileSync(new URL("../js/world.js",import.meta.url),"utf8"),worldSandbox);
const materials=Object.values(worldSandbox.window.CCGWorld.themes);
assert.ok(materials.length<=32,"all canonical material/seed atlases must fit the bounded cache");
stoneSandbox.world=stoneWorld(15);stoneSandbox.C.tile=42;
const canonicalPass=()=>{
  for(const th of materials)for(let seed=0;seed<3;seed++){
    material=th;
    for(let mask=1;mask<16;mask++){
      // Changing exposures in a single world must not require another atlas.
      const exposed=stoneWorld(mask);stoneSandbox.world.map=exposed.map;
      vm.runInContext(`drawDungeonStoneRelief({x:0,y:0},2,2,${seed})`,stoneSandbox);
    }
  }
};
// Mutable fixture world only; its individual maps stay frozen.
stoneSandbox.world={map:stoneWorld(15).map};canonicalPass();
assert.equal(vm.runInContext("dungeonStoneReliefCache.size",stoneSandbox),materials.length);
const canonicalBuilds=created;canonicalPass();
assert.equal(created,canonicalBuilds,"all 990 visible canonical variations must remain warm");
assert.equal(vm.runInContext("dungeonStoneReliefBytes",stoneSandbox),materials.length*3*4*42*42*4);
// Admission beyond a future palette's limit cannot evict/rebuild hot entries.
for(let pass=0;pass<3;pass++){
  const before=created;
  for(let i=0;i<100;i++){
    material={wall:`#${i.toString(16).padStart(6,"0")}`,hi:"#7f70eb"};
    vm.runInContext("drawDungeonStoneRelief({x:0,y:0},2,2,7)",stoneSandbox);
  }
  if(pass>0)assert.equal(created,before,"overflow fallback must not allocate every frame");
}
assert.equal(vm.runInContext("dungeonStoneReliefCache.size",stoneSandbox),32);
material=materials[0];
const beforeReturn=created;
vm.runInContext("drawDungeonStoneRelief({x:0,y:0},2,2,0)",stoneSandbox);
assert.equal(created,beforeReturn,"scrolling back must retain admitted material atlases");
assert.ok(vm.runInContext("dungeonStoneReliefBytes<=DUNGEON_STONE_PIXEL_BUDGET",stoneSandbox));
stoneSandbox.world=stoneWorld(4);
vm.runInContext("drawDungeonStoneRelief({x:0,y:0},2,2,7)",stoneSandbox);
assert.equal(vm.runInContext("dungeonStoneReliefCache.size",stoneSandbox),1,"a new floor/world must retire old stone rasters");
const beforeLaterFloor=created;
stoneSandbox.run.floor=4;
stoneSandbox.world=stoneWorld(4);
assert.equal(vm.runInContext("drawDungeonStoneRelief({x:0,y:0},2,2,7)",stoneSandbox),false,"pilot must preserve later-floor presentation");
assert.equal(created,beforeLaterFloor);
assert.equal(vm.runInContext("dungeonStoneReliefCache.size",stoneSandbox),0,"later-floor handoff must retire pilot bitmaps");
stoneSandbox.run.floor=1;stoneSandbox.world=stoneWorld(4);canvasAvailable=false;
assert.equal(vm.runInContext("drawDungeonStoneRelief({x:0,y:0},2,2,7)",stoneSandbox),false,"unavailable Canvas must preserve the original wall fallback");
const failedBuilds=created;
vm.runInContext("drawDungeonStoneRelief({x:0,y:0},2,2,7)",stoneSandbox);
assert.equal(created,failedBuilds,"unavailable Canvas must not be retried each frame");
canvasAvailable=true;stoneSandbox.C.tile=128;stoneSandbox.world=stoneWorld(4);
const beforeByteLimit=created;
for(let pass=0;pass<2;pass++)for(let i=0;i<10;i++){
  material={wall:`#${i.toString(16).padStart(6,"0")}`,hi:"#7f70eb"};
  vm.runInContext("drawDungeonStoneRelief({x:0,y:0},2,2,7)",stoneSandbox);
}
assert.equal(created-beforeByteLimit,5,"byte admission limit must reject excess atlases before allocating");
assert.equal(vm.runInContext("dungeonStoneReliefBytes",stoneSandbox),5*128*128*12*4);
stoneSandbox.C.tile=512;stoneSandbox.world=stoneWorld(4);
const beforeOversize=created;
assert.equal(vm.runInContext("drawDungeonStoneRelief({x:0,y:0},2,2,7)",stoneSandbox),false);
assert.equal(created,beforeOversize,"oversized atlas must be rejected before Canvas allocation");
assert.equal(vm.runInContext("dungeonStoneReliefBytes",stoneSandbox),0,"tile-size handoff evicts old pixel backing");
assert.match(renderer,/function renderView\(p,v\)\{\s*retireDungeonStoneReliefWorld\(\)/,"world resources must retire even when severe rendering bypasses the stone painter");
assert.match(renderer.slice(renderer.indexOf("function drawTile(x,y)"),renderer.indexOf("function drawPickupGlyph")),/drawDungeonStoneRelief\(s,x,y,h\)/,"live detailed tiles must own the stone pass");
assert.doesNotMatch(renderer.slice(renderer.indexOf("function drawTilePerformance"),renderer.indexOf("function drawTile(x,y)")),/drawDungeonStoneRelief/,"severe static-tile fallback must retain its existing cost");

// R128: run the real decorative painter, assert bounded pixels and no new
// raster/cache/world owners. These checks share the existing visual VM harness.
const wearPixels=[];stoneSandbox.ctx={fillRect(...rect){wearPixels.push(rect)}};
const wearCase=(floor,hash,wall,theme,room=null)=>{
  wearPixels.length=0;stoneSandbox.run.floor=floor;
  vm.runInContext(`drawCampaignSurfaceWear({x:12,y:24},${hash},${wall},${JSON.stringify(room)},${JSON.stringify(theme)})`,stoneSandbox);
  return wearPixels.map(rect=>[...rect]);
};
for(const [floor,h,wall,theme] of [[4,35,true,"BUDGET_BIN"],[4,35,false,"BUDGET_BIN"],[7,35,true,"MOSS_CRYPT"],[7,35,false,"MOSS_CRYPT"]]){
  const first=wearCase(floor,h,wall,theme);
  assert.ok(first.length>=4,`floor ${floor} must add tangible ${wall?"wall":"floor"} detail`);
  for(const [x,y,w,hgt] of first)assert.ok(x>=12&&y>=24&&w>0&&hgt>0&&x+w<=54&&y+hgt<=66,"wear must stay inside its tile");
  assert.deepEqual(wearCase(floor,h,wall,theme),first,"wear must be deterministic and animation-independent");
}
assert.equal(wearCase(11,35,true,"EMBER_DUNGEON").length,0,"other floors must keep original painter");
assert.equal(wearCase(4,35,true,"BUDGET_BIN",{sanctuary:true}).length,0,"special rooms must remain unobstructed");
assert.equal(wearCase(7,35,true,"IRON_KEEP",{variant:0}).length,0,"room-specific alternate theme must be preserved");
assert.match(renderer,/drawCampaignSurfaceWear\(s,h,true,room,theme\)/,"rich walls must own wear");
assert.match(renderer,/drawCampaignSurfaceWear\(s,h,false,room,theme\)/,"rich flagstones must own wear");
assert.doesNotMatch(renderer.slice(renderer.indexOf("function drawTilePerformance"),renderer.indexOf("function drawTile(x,y)")),/drawCampaignSurfaceWear/,"severe tile path must stay unchanged");

// R128 floor identity is a campaign property, not a room-theme requirement.
// Generate real deterministic floors and exercise the production tile hash.
const worldFixture={window:{}};
vm.createContext(worldFixture);
vm.runInContext(readFileSync(new URL("../js/config.js",import.meta.url),"utf8"),worldFixture,{timeout:1000});
vm.runInContext(readFileSync(new URL("../js/world.js",import.meta.url),"utf8"),worldFixture,{timeout:1000});
const generatedWorld=worldFixture.window.CCGWorld;
const wearPainter=vm.runInContext("drawCampaignSurfaceWear",stoneSandbox);
const actualHash=vm.runInContext("tileHash",stoneSandbox);
for(const floor of [4,7]){
  stoneSandbox.run.floor=floor;
  const generated=generatedWorld.generate(`ccg-premium-visual-baseline-2026-10-09-F${floor}`);
  let decorated=0,starting=0,wallMarks=0,floorMarks=0;
  for(let y=0;y<generated.map.length;y++)for(let x=0;x<generated.map[y].length;x++){
    const roomId=generatedWorld.roomAt(generated,x,y),room=generated.rooms[roomId],
      wall=generated.map[y][x]!==0,variant=room?.variant||0;
    wearPixels.length=0;
    wearPainter({x:0,y:0},actualHash(x,y,wall?variant:variant+roomId),wall,room,room?.theme||"WARP_GALLERY");
    if(wearPixels.length){
      decorated++;
      if(roomId===generated.startRoomId)starting++;
      if(wall)wallMarks++;else floorMarks++;
    }
  }
  assert.ok(decorated>100,`generated Floor ${floor} must actually display its campaign patina, not just pass a synthetic room tag`);
  assert.ok(starting>0,`generated Floor ${floor} starting room must contain visible identity details`);
  assert.ok(wallMarks>0&&floorMarks>0,`generated Floor ${floor} must decorate both masonry and flagstones`);
}
assert.ok(wearCase(4,35,true,"TREASURE_VAULT",{variant:0}).length>0,"treasury rooms must receive rich brass detail");
assert.ok(wearCase(4,22,true,"C64_ARCHIVE",{variant:0}).length>0,"alternate Floor 4 room themes must retain sparse brass identity");
assert.ok(wearCase(7,22,true,"C64_ARCHIVE",{variant:0}).length>0,"alternate Floor 7 room themes must retain sparse moss identity");
assert.ok(wearCase(7,34,false,"WARP_GALLERY").length>0,"Floor 7 corridors must retain damp flagstone detail");
assert.equal(wearCase(7,22,true,"MOSS_CRYPT",{sanctuary:true}).length,0,"protected rooms must not gain patina");
assert.doesNotMatch(renderer.slice(renderer.indexOf("function drawCampaignSurfaceWear"),renderer.indexOf("function drawTilePerformance")),/createElement|OffscreenCanvas|new Image|createLinearGradient/,"surface wear must not allocate canvas/images/gradients");

console.log("Dungeon Carnage visual-overhaul asset-registry and cached stonework contracts passed.");
