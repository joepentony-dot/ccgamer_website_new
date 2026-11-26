import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
const source=fs.readFileSync(new URL("../js/v10-42-r55-shop-feedback.js",import.meta.url),"utf8");

const start=source.indexOf("  function fallbackFeedback("),end=source.indexOf("  function install()",start);
assert.ok(start>=0&&end>start);
let p,shop,score=0,gold=0,blocked=false,checks=0;
const state={fallbacks:0},events=[];
const context={state,player:()=>p,activeShop:null,window:{CCGDungeonProgressionFoundation:{ready:true,goldBalance:()=>gold,shopGoldPrice:()=>20},CCG_CONFIG:{stalker:{flaskArtefacts:3}}},run:{},scoreNow:()=>score,shopScorePrice:()=>1000,inventoryBlocked:()=>{checks++;return blocked},setStatus:(...args)=>{events.push(args);return true}};
vm.createContext(context);vm.runInContext(source.slice(start,end),context);
function call(id,data={},options={}){
  p={inventory:[],banishmentEssence:0,...data};shop={v142Alchemist:true,...options.shop};context.activeShop=shop;score=options.score??0;gold=options.gold??0;blocked=options.blocked??false;checks=0;events.length=0;
  const before=JSON.stringify([p,shop]),result=context.fallbackFeedback(id,options.allowGeneric??true);
  assert.equal(JSON.stringify([p,shop]),before);return {result,event:events[0],checks};
}
let a=call("banishment");assert.equal(a.event[3],"insufficient-essence");assert.equal(a.checks,0);
a=call("banishment",{banishmentEssence:3});assert.equal(a.event[3],"distillation-blocked");assert.equal(a.checks,0);
a=call("banishment",{banishmentEssence:1,inventory:[{kind:"artefact",qty:2}]},{blocked:true});assert.equal(a.event[3],"distillation-blocked");assert.equal(a.checks,0);
a=call("banishment",{banishmentEssence:3,inventory:[{kind:"banishment"}]});assert.equal(a.event[3],"charge-already-carried");
a=call("banishment",{banishmentEssence:3},{shop:{v142Alchemist:false,title:"SUPPLY DESK"}});assert.equal(a.event[3],"alchemist-required");
a=call("banishment",{banishmentEssence:2},{shop:{v142Alchemist:false,title:"ALCHEMIST"}});assert.equal(a.event[3],"insufficient-essence");
a=call("banishmentScore",{banishmentEssence:9});assert.equal(a.event[3],"retired-score-purchase");assert.equal(a.checks,0);
a=call("banishment",{banishmentEssence:3},{allowGeneric:false});assert.equal(a.result,false);assert.equal(a.event,undefined);
context.window.CCGLostSizzlerV142ProceduralOverhaul={essenceCost:()=>5};
a=call("banishment",{banishmentEssence:4});assert.equal(a.event[3],"insufficient-essence");assert.ok(a.event[1].includes("5 Essence"));
a=call("potion");assert.equal(a.event[3],"insufficient-gold");
a=call("potion",{},{gold:20,blocked:true});assert.equal(a.event[3],"inventory-full");
a=call("potion",{},{gold:20,allowGeneric:false});assert.equal(a.result,false);
delete context.window.CCGDungeonProgressionFoundation;
a=call("torch");assert.equal(a.event[3],"insufficient-score");
console.log("PASS R198 Essence-only fallback and retained ordinary wallet feedback");
