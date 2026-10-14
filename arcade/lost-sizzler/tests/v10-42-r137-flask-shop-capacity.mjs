import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import path from "node:path";
import {fileURLToPath} from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../js");
const source=fs.readFileSync(path.join(root,"v10-42-artefact-shop-stability.js"),"utf8");
const start=source.indexOf("function tradeArtefactsForFlask(){");
const end=source.indexOf("function install(){",start);
assert.ok(start>0&&end>start,"Live Alchemist transaction source must be available");
function scenario({items=[],essence=2,cost=2,capacity=6,forceFailure=false}={}){
  const player={inventory:items.map(x=>({...x})),banishmentEssence:essence};
  const original=JSON.stringify(player),notices=[];
  const progression={
    inventoryCapacity:()=>capacity,
    inventoryCanAdd:(p,item)=>p.inventory.length<capacity,
    firstInventory:(p,kind)=>p.inventory.findIndex(x=>x.kind===kind),
    inventoryRemove:(p,index)=>p.inventory.splice(index,1)[0],
    inventoryAdd:(p,item)=>{if(forceFailure||p.inventory.length>=capacity)return false;p.inventory.push({...item});return true}
  };
  const ctx={window:{CCGLostSizzlerV142ProceduralOverhaul:{essenceCost:()=>cost},CCG_CONFIG:{stalker:{flaskArtefacts:cost}}},
    progression:()=>progression,currentPlayer:()=>player,alchemistOpen:()=>true,
    nonNegativeInt:x=>Math.max(0,Math.floor(Number(x)||0)),
    physicalArtefactCount:p=>p.inventory.filter(x=>x.kind==="artefact").reduce((n,x)=>n+Math.max(1,x.qty||1),0),
    snapshotPaymentState:p=>({inventory:p.inventory.map(x=>({...x})),hadEssence:true,essence:p.banishmentEssence}),
    restorePaymentState:(p,v)=>{p.inventory=v.inventory.map(x=>({...x}));p.banishmentEssence=v.essence},
    diagnostics:{trades:0,rollbacks:0,insufficient:0},showToast:(...args)=>notices.push(args),
    S:{sfx(){}},host:{revision:0},broadcastWorld(){},renderShop(){},sync(){}};
  vm.createContext(ctx);
  vm.runInContext(source.slice(start,end)+";this.trade=tradeArtefactsForFlask;",ctx,{timeout:1200});
  const success=ctx.trade();
  return {success,player,original,notices,diagnostics:ctx.diagnostics};
}
const canBuy=scenario({items:[{kind:"potion"},{kind:"torch"},{kind:"teleport"},{kind:"mapReveal"}],capacity:6});
assert.equal(canBuy.success,true,"Two unlocked free slots must permit one Flask");
assert.equal(canBuy.player.inventory.length,5);
assert.equal(canBuy.player.banishmentEssence,0,"Exactly the charged Essence cost is used");
assert.equal(canBuy.player.inventory.filter(x=>x.kind==="banishment").length,1);
const alreadyOwns=scenario({items:[{kind:"potion"},{kind:"banishment"}],capacity:6});
assert.equal(alreadyOwns.success,false,"The single-charge carrying rule stays intact");
assert.equal(JSON.stringify(alreadyOwns.player),alreadyOwns.original,"Failed duplicate purchase preserves Essence and items");
assert.equal(alreadyOwns.notices.at(-1)?.[0],"WARD-BREAK CHARGE ALREADY CARRIED");
const legacyFull=scenario({items:[{kind:"artefact",qty:1},{kind:"artefact",qty:1},{kind:"artefact",qty:1}],essence:0,cost:3,capacity:3});
assert.equal(legacyFull.success,true,"Three legacy physical Artefacts must free their own occupied inventory slots before Flask admission");
assert.equal(legacyFull.player.inventory.length,1,"After consuming three legacy Artefacts, only one Flask remains");
assert.equal(legacyFull.player.inventory[0]?.kind,"banishment");
assert.equal(legacyFull.player.banishmentEssence,0,"Legacy artefact payment must not debit Vessel Essence");
const legacyBlocked=scenario({items:[{kind:"artefact",qty:1},{kind:"potion"},{kind:"torch"}],essence:1,cost:2,capacity:3});
assert.equal(legacyBlocked.success,true,"Mixed legacy/Vessel payment can free the Flask destination slot");
assert.equal(legacyBlocked.player.inventory.filter(x=>x.kind==="artefact").length,0);
assert.equal(legacyBlocked.player.banishmentEssence,0);
assert.equal(legacyBlocked.player.inventory.filter(x=>x.kind==="banishment").length,1);
const lockedSlots=scenario({items:[{kind:"potion"},{kind:"torch"},{kind:"teleport"}],capacity:3});
assert.equal(lockedSlots.success,false);
assert.equal(lockedSlots.notices.at(-1)?.[0],"NO UNLOCKED FLASK SLOT");
assert.equal(JSON.stringify(lockedSlots.player),lockedSlots.original);
const unexpected=scenario({items:[],capacity:6,forceFailure:true});
assert.equal(unexpected.success,false);
assert.equal(unexpected.notices.at(-1)?.[0],"FLASK TRANSFER FAILED");
assert.equal(JSON.stringify(unexpected.player),unexpected.original,"Failed Flask insertion must be atomic");
console.log("PASS R137 Flask purchase after 3 legacy Artefacts, mixed payments, existing-charge, locked-slot and rollback");
