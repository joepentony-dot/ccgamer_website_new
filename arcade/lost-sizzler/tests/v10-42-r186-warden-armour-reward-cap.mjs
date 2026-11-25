import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {dirname,join} from "node:path";
import {fileURLToPath} from "node:url";
import vm from "node:vm";

const js=join(dirname(fileURLToPath(import.meta.url)),"../js");
const read=name=>readFileSync(join(js,name),"utf8");
function owner(source,first,after){
  const start=source.indexOf(first),end=source.indexOf(after,start);
  assert.ok(start>=0&&end>start,`Production owner not found: ${first}`);
  return source.slice(start,end);
}
const program=[
  owner(read("progression.js"),"function armourCap(","  function magicSackTier("),
  `const PROG={armourCap},PGR=PROG;const h={},r={v142SealThresholds:[]};let p;
  const currentHost=()=>h,currentRun=()=>r,currentWorld=()=>null,performance={now:()=>1000},
    AFTERSHOCK_MS=30000,AFTERSHOCK_ALERT=82,label=()=>"Death Stalker",
    init=()=>r,P=()=>p,localRoster=()=>[p],toast=()=>{},applyBossDebt=()=>{};`,
  owner(read("v10-42-warden-purpose-overhaul.js"),"function startAftershock(","  function grantEssence("),
  owner(read("v10-42-warden-domain-progression.js"),"function threshold(","  function checkThresholds("),
  `globalThis.api={armourCap,run(player,which){
    p=player;r.v142SealThresholds=[];
    if(which==="aftershock")startAftershock({},p);
    else {threshold(10,p);threshold(10,p)}
    return {armour:p.armor,health:p.health,mana:p.mana,alert:r.alert,thresholds:r.v142SealThresholds.length};
  }};`
].join("\n");
const {api}=vm.runInNewContext(program+"\nglobalThis;",{},{timeout:3000});
for(const kind of ["aftershock","threshold"]){
  for(const [armor,bonus,expected] of [[10,0,12],[12,0,12],[17,8,19],[19,8,20],[20,8,20],[21,8,21],[19,9,21]]){
    const player={armor,wearables:{body:{armourBonus:bonus}},mana:0,maxMana:100,health:6,maxHealth:10};
    assert.equal(api.armourCap(player),12+bonus);
    const result=api.run(player,kind);
    assert.equal(result.armour,expected,`${kind}: ${armor} at cap ${12+bonus} must not lose armour`);
    if(kind==="aftershock"){assert.equal(result.mana,18);assert.equal(result.alert,82);assert.equal(result.health,6)}
    else{assert.equal(result.health,8);assert.equal(result.thresholds,1);assert.equal(result.mana,0)}
  }
}
console.log("PASS R186 Warden reward and Master Seal respect wearable caps, retain over-cap armour, and preserve ammo/health and one-time threshold");
