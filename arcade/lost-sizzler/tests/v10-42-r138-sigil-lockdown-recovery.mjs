import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const source=fs.readFileSync(path.join(here,"../js/game-play.js"),"utf8");
const start=source.indexOf("function reconcileClearedSigilLockdown(){");
const end=source.indexOf("\nfunction updateFloorObjective(){",start);
assert.ok(start>=0&&end>start,"Stalled Sigil lockdown recovery must be present in game update code");
assert.match(source,/function updateFloorObjective\(\)\{\s*reconcileClearedSigilLockdown\(\);/,"Live floor tick must reconcile restored lockdowns");

function scenario({defenders=0,complete=true,lockdown=true,resolved=false,alreadyItem=false,collected=false,gate=true}={}){
  const notices=[],sounds=[],doors=[{sigilGate:gate,locked:true,open:false,opening:false}],
    rooms=[{x:7,y:9,w:8,h:6}],
    enemies=Array.from({length:defenders},(_,i)=>({id:`sigil-${i}`,alive:true,sigilDefender:true})),
    items=alreadyItem?[{id:"existing",kind:"exitSigil",active:true,x:10,y:12}]:[],
    host={sigilRoomId:0,sigilLockdown:lockdown,sigilResolved:resolved,exitSigilCollected:collected,objective:{complete},enemies,items,doors,revision:3};
  const context={
    host,world:{rooms},run:{floor:5},SYS:{sigilDefendersAlive:h=>h.enemies.filter(e=>e.alive&&e.sigilDefender)},
    beginDoorOpening:d=>{d.opening=true;d.locked=false},showToast:(...args)=>notices.push(args),
    S:{sfx:cue=>sounds.push(cue)}
  };
  vm.createContext(context);
  vm.runInContext(source.slice(start,end)+"\nthis.recover=reconcileClearedSigilLockdown;",context,{timeout:1000});
  return{host,doors,notices,sounds,recover:context.recover}
}

const recoverable=scenario();
assert.equal(recoverable.recover(),true,"Zero living defenders must release an inconsistent sealed room");
assert.equal(recoverable.host.sigilResolved,true);
assert.equal(recoverable.host.sigilLockdown,false);
assert.equal(recoverable.doors[0].locked,false);
assert.equal(recoverable.doors[0].opening,true);
assert.equal(recoverable.host.items.filter(i=>i.kind==="exitSigil").length,1,"Missing Exit Sigil must be restored once");
assert.equal(recoverable.recover(),false,"Repeated game ticks must be idempotent");
assert.equal(recoverable.host.items.filter(i=>i.kind==="exitSigil").length,1);
assert.equal(recoverable.notices.length,1);

const active=scenario({defenders:2});
assert.equal(active.recover(),false,"Living Sigil defenders must never be bypassed");
assert.equal(active.doors[0].locked,true);
assert.equal(active.host.items.length,0);

const incomplete=scenario({complete:false});
assert.equal(incomplete.recover(),false,"Incomplete main objective may not unlock the chamber");
const inactive=scenario({lockdown:false});
assert.equal(inactive.recover(),false,"Ordinary non-lockdown room state remains untouched");
const existing=scenario({alreadyItem:true});
assert.equal(existing.recover(),true);
assert.equal(existing.host.items.filter(i=>i.kind==="exitSigil").length,1,"Existing Exit Sigil must not be duplicated");
const collected=scenario({collected:true});
assert.equal(collected.recover(),true);
assert.equal(collected.host.items.length,0,"Already-collected Sigil must never reappear");
const notGate=scenario({gate:false});
assert.equal(notGate.recover(),true);
assert.equal(notGate.doors[0].locked,true,"Do not open unrelated door types");
console.log("PASS R138 stalled Sigil lockdown recovery, preserved defenders, idempotent Sigil and non-Sigil doors");
