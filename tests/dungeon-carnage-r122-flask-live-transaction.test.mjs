import {test} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const shopSource=fs.readFileSync("arcade/lost-sizzler/js/v10-42-artefact-shop-stability.js","utf8");

function game({essence=0,artefacts=0,shop=true,gold=175,score=2640,limit=8,sealDiscount=false}={}){
  const player={
    id:"player-one",health:8,maxHealth:10,
    banishmentEssence:essence,inventory:artefacts?[{kind:"artefact",name:"Legacy Banishment Artefact",qty:artefacts}]:[]
  };
  const trace={toasts:[],sounds:[],otherPurchases:0,renderCalls:0};
  const runtime={
    console,Math,Date,
    window:{
      CCGDungeonProgressionFoundation:{ready:true},
      CCG_CONFIG:{stalker:{flaskArtefacts:3}},
      CCGLostSizzlerV142ProceduralOverhaul:{essenceCost:()=>sealDiscount?2:3},
      CCGProgression:{
        firstInventory:(p,kind)=>p.inventory.findIndex(i=>i?.kind===kind),
        inventoryRemove:(p,idx,qty=1)=>{
          const original=p.inventory[idx];
          if(!original||qty<1)return null;
          const available=Math.max(1,Number(original.qty)||1);
          if(available<qty)return null;
          if(available===qty)p.inventory.splice(idx,1);
          else p.inventory[idx]={...original,qty:available-qty};
          return {...original,qty};
        },
        inventoryAdd:(p,item)=>{
          if(p.inventory.length>=limit)return false;
          p.inventory.push({...item});return true;
        }
      }
    },
    p1:player,
    score,gold,host:{revision:0},
    activeShop:shop?{v142Alchemist:true,title:"BANISHMENT ALCHEMIST"}:{title:"ORDINARY SHOP"},
    UI:{shopItems:null},
    S:{sfx:(...args)=>trace.sounds.push(args)},
    showToast:(...args)=>trace.toasts.push(args),
    broadcastWorld:()=>{},
    sync:()=>{},
    renderShop:()=>{trace.renderCalls++},
    buyShopItem:()=>{trace.otherPurchases++;return true},
    setTimeout:()=>0,clearTimeout:()=>{},
    setInterval:()=>0,clearInterval:()=>{},
    addEventListener:()=>{},
    queueMicrotask:()=>{}
  };
  vm.createContext(runtime);
  vm.runInContext(shopSource,runtime,{filename:"v10-42-artefact-shop-stability.js"});
  const api=runtime.window.CCGLostSizzlerV142ArtefactShopStability;
  assert.ok(api?.isInstalled(),"Real final Alchemist buyShopItem owner must install");
  const flasks=()=>player.inventory.filter(item=>item?.kind==="banishment");
  return {runtime,player,trace,flasks,api};
}

test("three Vessel Essence buy one Flask without any previous Gold Flask; Gold and Score unchanged",()=>{
  const g=game({essence:3,gold:123,score:4567});
  const oldGold=g.runtime.gold,oldScore=g.runtime.score;
  assert.equal(g.flasks().length,0,"No pre-purchased Flask may be required");
  assert.equal(g.runtime.buyShopItem("banishment"),true);
  assert.equal(g.flasks().length,1,"Exactly one Flask must be created");
  assert.equal(g.flasks()[0].qty??1,1);
  assert.equal(g.player.banishmentEssence,0);
  assert.equal(g.runtime.gold,oldGold);
  assert.equal(g.runtime.score,oldScore);
  assert.equal(g.api.diagnostics.trades,1);
  assert.equal(g.trace.otherPurchases,0,"Exchange must not purchase a score-funded Flask");
});

test("two Essence do not create a Flask or alter Gold, Score or inventory",()=>{
  const g=game({essence:2,gold:239,score:999});
  const before=JSON.stringify(g.player.inventory);
  assert.equal(g.runtime.buyShopItem("banishment"),false);
  assert.equal(g.flasks().length,0);
  assert.equal(g.player.banishmentEssence,2);
  assert.equal(JSON.stringify(g.player.inventory),before);
  assert.equal(g.runtime.gold,239);
  assert.equal(g.runtime.score,999);
  assert.equal(g.api.diagnostics.insufficient,1);
});

test("Alchemist's Seal two-Essence discount is honoured by actual transaction",()=>{
  const g=game({essence:2,sealDiscount:true});
  assert.equal(g.runtime.buyShopItem("banishment"),true);
  assert.equal(g.flasks().length,1);
  assert.equal(g.player.banishmentEssence,0);
});

test("legacy three-Artefact stack exchanges for exactly one Flask",()=>{
  const g=game({artefacts:3});
  assert.equal(g.runtime.buyShopItem("banishment"),true);
  assert.equal(g.flasks().length,1);
  assert.equal(g.player.inventory.filter(x=>x.kind==="artefact").length,0);
  assert.equal(g.player.banishmentEssence,0);
});

test("mixed legacy Artefact and Vessel Essence are charged exactly once",()=>{
  const g=game({artefacts:1,essence:2,gold:7,score:280});
  assert.equal(g.runtime.buyShopItem("banishment"),true);
  assert.equal(g.flasks().length,1);
  assert.equal(g.player.inventory.filter(x=>x.kind==="artefact").length,0);
  assert.equal(g.player.banishmentEssence,0);
  assert.equal(g.runtime.gold,7);assert.equal(g.runtime.score,280);
});

test("failed inventory insertion restores all Essence and any legacy Artefacts",()=>{
  const g=game({artefacts:1,essence:2,limit:0});
  const before=JSON.stringify(g.player.inventory);
  assert.equal(g.runtime.buyShopItem("banishment"),false);
  assert.equal(JSON.stringify(g.player.inventory),before);
  assert.equal(g.player.banishmentEssence,2);
  assert.equal(g.flasks().length,0);
  assert.equal(g.api.diagnostics.rollbacks,1);
});

test("non-Alchemist and deprecated Score-funded Flask both fail closed",()=>{
  const ordinary=game({essence:3,shop:false});
  assert.equal(ordinary.runtime.buyShopItem("banishment"),false);
  assert.equal(ordinary.player.banishmentEssence,3);
  const alchemist=game({essence:3});
  assert.equal(alchemist.runtime.buyShopItem("banishmentScore"),false);
  assert.equal(alchemist.player.banishmentEssence,3);
  assert.equal(alchemist.flasks().length,0);
});
