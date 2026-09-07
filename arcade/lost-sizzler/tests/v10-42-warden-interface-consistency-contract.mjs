import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source=fs.readFileSync(new URL("../js/v10-42-warden-interface-consistency.js",import.meta.url),"utf8");
const toastLog=[];
let renderCalls=0,buyCalls=[];
const player={inventory:[{kind:"banishment",name:"Banishment Flask"}]};
const progression={inventoryLabel:item=>item?.name||item?.kind||"ITEM"};
const cards={banishment:{removed:false},banishmentScore:{removed:false}};
const shopItems={querySelector(selector){const match=selector.match(/data-shop-buy="([^"]+)"/),id=match?.[1];if(!id||!cards[id])return null;return{closest:()=>({remove:()=>{cards[id].removed=true}})}}};
const tip={textContent:"Death Stalker: trade 3 artefacts or pay 10,000 score at a shop for a Flask.",innerHTML:""};
const feature={textContent:"DEATH STALKERS — Banishment Flask",innerHTML:""};
const UI={shopItems};
let activeShop={title:"DUNGEON SUPPLY SHOP"};
const context={
  console,window:{},UI,p1:player,activeShop,
  document:{querySelector:selector=>selector===".dossier-card .reference-tip"?tip:null,querySelectorAll:selector=>selector==="#menu .feature-strip span"?[feature]:[]},
  showToast:(title,text,tone,duration)=>{toastLog.push({title,text,tone,duration});return true},
  renderShop:()=>{renderCalls++;return"BASE SHOP"},
  buyShopItem:(id,...args)=>{buyCalls.push([id,...args]);return`BOUGHT:${id}`},
  guideDefinitions:()=>[
    {kind:"health",name:"HEALTH PACK",desc:"heal"},
    {kind:"banishment",name:"BANISHMENT FLASK",desc:"Permanently destroys a nearby Death Stalker."},
    {kind:"loot",name:"RARE ARTEFACT",desc:"Collect 3 and find the Secret Artefact Trader to obtain a Banishment Flask."}
  ],
  itemInfoDetails:it=>({name:it?.name||"ITEM",kind:it?.kind,desc:"OLD DESC",why:it?.kind==="artefact"?"Trade 3 at a shop for a Banishment Flask.":"OLD WHY"})
};
context.window.CCG_CONFIG={stalker:{banishPromptDistance:8,name:"Count Loadula"}};
context.window.CCGProgression=progression;
vm.createContext(context);
vm.runInContext(source,context,{filename:"v10-42-warden-interface-consistency.js"});

const api=context.window.CCGLostSizzlerV142WardenInterfaceConsistency;
assert.ok(api,"Warden interface consistency API should install");
assert.match(tip.innerHTML,/earn or distil a Ward-Break Charge/i,"Static Death Stalker reference tip should lose the old Flask/score instructions");
assert.match(feature.innerHTML,/WARDEN HUNTS/,"Menu feature copy should stop advertising the retired Flask economy");

const spawned=api.normaliseToast("SOMETHING HAS ENTERED THE VAULT","FIND 3 ARTEFACTS TO EXCHANGE FOR THE POTION TO KILL THIS INDESTRUCTIBLE ENEMY");
assert.match(spawned.text,/Ward-Break Charge/,"Count Loadula spawn warning should teach Ward Break instead of an artefact potion");
assert.match(spawned.text,/defeat it with normal weapons/,"Spawn warning should explain the second combat stage");
const near=api.normaliseToast("COUNT LOADULA IS NEAR","FIND 3 ARTEFACTS TO EXCHANGE FOR THE POTION TO KILL THIS INDESTRUCTIBLE ENEMY");
assert.doesNotMatch(near.text,/POTION TO KILL|ARTEFACTS TO EXCHANGE/i,"Near warning should retire the old instant-kill instructions");
const timed=api.normaliseToast("TIMED CHAMBER — DEATH STALKER","This is the floor's one Death Stalker. Trade 3 artefacts or pay 10,000 score at a shop for the Flask that destroys it.");
assert.match(timed.text,/strip its immunity and fight it normally/i,"Timed chamber should teach the two-stage Warden fight");
assert.doesNotMatch(timed.text,/10,000|Flask that destroys/i,"Timed chamber should not advertise the retired score/Flask route");
const survived=api.normaliseToast("TIMED CHAMBER CLEARED","Thirty seconds survived. The Death Stalker remains until permanently destroyed with a Banishment Flask. Bonus armour awarded.");
assert.match(survived.text,/ward is broken and it is defeated in normal combat/i,"Timed clear should describe the current Warden resolution rule");
const defeated=api.normaliseToast("TIMED CHAMBER — STALKER BANISHED","This floor's Death Stalker has already been permanently destroyed.");
assert.equal(defeated.title,"TIMED CHAMBER — WARDEN DEFEATED","Legacy 'banished' chamber title should become a defeat state");
assert.match(defeated.text,/domain cleansed/i,"Defeated chamber copy should connect the kill to cleansing");

context.showToast("COUNT LOADULA IS NEAR","FIND 3 ARTEFACTS TO EXCHANGE FOR THE POTION TO KILL THIS INDESTRUCTIBLE ENEMY","red",8000);
assert.match(toastLog.at(-1).text,/Ward-Break Charge/,"Global toast wrapper should normalise inherited live warnings");

const defs=context.guideDefinitions();
assert.equal(defs.find(row=>row.kind==="banishment").name,"WARD-BREAK CHARGE","Item guide should rename the legacy Banishment Flask");
assert.match(defs.find(row=>row.kind==="banishment").desc,/does not kill the Warden/i,"Item guide should state that the charge only breaks immunity");
assert.match(defs.find(row=>row.kind==="loot").desc,/Banishment Essence/,"Rare loot guide should explain the current Vessel/Essence economy");
assert.doesNotMatch(defs.find(row=>row.kind==="loot").desc,/Banishment Flask/,"Rare loot guide should not point to the retired Flask trade");

assert.equal(progression.inventoryLabel(player.inventory[0]),"Ward-Break Charge","Legacy saved banishment items should display the current Ward-Break name");
const banishInfo=context.itemInfoDetails(player.inventory[0]);
assert.equal(banishInfo.name,"WARD-BREAK CHARGE","Inventory information should rename legacy banishment items");
assert.match(banishInfo.why,/immunity drops/i,"Inventory information should explain why Ward Break matters");
const artefactInfo=context.itemInfoDetails({kind:"artefact",name:"Old Artefact"});
assert.match(artefactInfo.desc,/stored as Banishment Essence/i,"Legacy artefact information should explain Vessel conversion");
assert.doesNotMatch(artefactInfo.why,/instant-kill Flask trade/i,"Legacy artefact information should explicitly retire the old Flask trade wording");

cards.banishment.removed=false;cards.banishmentScore.removed=false;context.activeShop={title:"DUNGEON SUPPLY SHOP"};
assert.equal(context.renderShop(),"BASE SHOP","Shop cleanup should preserve the existing render return value");
assert.equal(renderCalls,1,"Shop cleanup should call the existing renderer once");
assert.equal(cards.banishment.removed,true,"Normal shops should remove the obsolete Flask/artefact-trade card");
assert.equal(cards.banishmentScore.removed,true,"Normal shops should remove the obsolete 10,000-score Flask card");

cards.banishment.removed=false;cards.banishmentScore.removed=false;context.activeShop={title:"BANISHMENT ALCHEMIST",v142Alchemist:true};
context.renderShop();
assert.equal(cards.banishment.removed,false,"The Alchemist should retain its current Essence distillation action");
assert.equal(cards.banishmentScore.removed,true,"The retired score purchase should remain hidden even at the Alchemist");

context.activeShop={title:"DUNGEON SUPPLY SHOP"};
assert.equal(context.buyShopItem("banishment"),false,"Programmatic legacy Flask purchases should be rejected outside an Alchemist");
assert.equal(buyCalls.length,0,"Rejected normal-shop Flask purchase must not reach the inherited purchase handler");
context.activeShop={title:"BANISHMENT ALCHEMIST",v142Alchemist:true};
assert.equal(context.buyShopItem("banishment"),"BOUGHT:banishment","Alchemist Ward-Break distillation should still reach the existing purchase handler");
assert.equal(buyCalls.length,1,"Alchemist distillation should call the inherited handler once");
assert.equal(context.buyShopItem("banishmentScore"),false,"The retired 10,000-score purchase should be blocked everywhere");
assert.equal(buyCalls.length,1,"Retired score purchase must not reach the inherited handler");
assert.match(toastLog.at(-1).text,/old 10,000-score instant-kill purchase is no longer part of V10.42/i,"Retired score purchase should explain the replacement economy");

console.log("PASS v10-42 Warden interface/legacy Flask consistency contract");
