import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
const source=fs.readFileSync(new URL("../js/game-render.js",import.meta.url),"utf8");
const calls=[];
class Image{constructor(){this.complete=true;this.naturalWidth=320;this.naturalHeight=320}set src(value){this.url=value;if(/shade-puny/.test(value)){this.naturalWidth=768;this.naturalHeight=256}}}
const ctx={save(){},restore(){},translate(){},scale(){},drawImage(...args){calls.push(args)},globalAlpha:1};
const sandbox={window:{},document:{querySelector:()=>({content:"r97-test"})},Image,ctx,performance:{now:()=>1000},P:{red:"#f00",cyan:"#0ff"},enemySpriteSeed:()=>0};
const setup=source.slice(0,source.indexOf("const chestRenderDiagnostics"));
const routes=source.slice(source.indexOf("const PUNY_ENEMY_CELL="),source.indexOf("function drawEnemy(e)"));
vm.runInNewContext(setup+"\n"+routes,sandbox);
const puny=sandbox.window.CCGPunyEnemyVisuals,atlas=sandbox.window.CCGDungeonEnemyArt;
for(const [kind,file] of Object.entries({scout:"archer-green",guard:"soldier-red",charger:"orc-grunt",cook:"orc-peon-red"})){
  for(const [state,extra,columns] of [
    ["idle",{},[0,1]],["move",{aiState:"chase"},[2,3]],["attack",{_attackAnimAt:900},kind==="scout"?[8,9,10,11]:[4,5,6,7]],
    ["hurt",{hitStunMs:140},[18,19,20]],["death",{__defeatProgress:.8},[21,22,23]]
  ]){
    const entity={kind,facing:{x:1,y:0},...extra};
    assert.equal(puny.drawPunyEnemySprite(entity,32,34),true);
    const draw=calls.at(-1);
    assert.ok(draw[0].url.includes(file),kind+" must use matching art");
    assert.ok(columns.includes(draw[1]/32),kind+" must use "+state+" frames");
    assert.equal(draw[2],64,"right-facing row must be authored row 2");
  }
}
for(const [kind,expected] of Object.entries({spider:["horde",0],skeleton:["horde",1],knight:["horde",2],ambusher:["standard-a",1],hunter:["standard-a",2],ghost:["standard-a",4],ranger:["standard-b",0],root:["standard-b",2],firebreather:["standard-b",4]})){
  assert.equal(puny.drawPunyEnemySprite({kind},32,34),false,kind+" cannot become a generic humanoid");
  assert.equal(atlas.draw({kind},32,34),true);
  assert.ok(calls.at(-1)[0].url.includes(expected[0]));
  assert.equal(calls.at(-1)[2],expected[1]*64+1);
  assert.equal(atlas.draw({kind,_attackAnimAt:900},32,34),true);
  assert.equal(calls.at(-1)[1],4*64+1,"authored attack frame must be used");
}
for(const entity of [{kind:"ghost",follower:{name:"AZALEA"}},{kind:"scout",follower:{name:"CPU"}},{kind:"ghost",deathStalker:true,voidStalker:true},{kind:"scout",treasureGoblin:true}]){
  assert.equal(puny.drawPunyEnemySprite(entity,32,34),false);
  assert.equal(atlas.draw(entity,32,34),false,"named identities must retain their established renderer");
}
calls.at(-1)[0].complete=false;
assert.equal(atlas.draw({kind:"firebreather"},32,34),false,"undecoded creature art must fall back");
assert.equal(puny.punyEnemyDirectionRow({facing:{x:0,y:-1}}),4);
assert.equal(puny.punyEnemyDirectionRow({facing:{x:-1,y:0}}),6);
console.log("R97 matching RPG enemy art, animation, direction and named-identity regressions passed.");
