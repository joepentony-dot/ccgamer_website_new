import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
const core=fs.readFileSync(new URL("../js/game-core.js",import.meta.url),"utf8");
const progressionSource=fs.readFileSync(new URL("../js/progression.js",import.meta.url),"utf8");

const cut=(s,a,b)=>{const start=s.indexOf(a),end=s.indexOf(b,start);assert.ok(start>=0&&end>start);return s.slice(start,end)};
const progression=cut(progressionSource,"  function magicSackTier(","  function compactInventory(");
const details=cut(core,"function itemInfoDetails(","function showItemInfo(");
const help=cut(core,"function itemHelp(","function itemIconSVG(");
const context={p1:null,PGR:{inventoryLabel:it=>it.kind,inventoryCapacity:()=>6},inventoryVisualKind:it=>it.kind,C:{stalker:{banishPromptDistance:8},player:{torchRadius:5,torchMs:30000,inventorySlots:12}}};
vm.createContext(context);
vm.runInContext(progression+"\n"+help+"\n"+details+"\nPGR.stackLimit=stackLimit;",context);
for(const [sacks,t,p] of [[0,1,3],[1,2,4],[2,3,5],[3,4,6],[-2,1,3],[99,4,6]]){
  context.p1={magicSacks:sacks,inventory:[{kind:"torch",qty:1},{kind:"potion",qty:2}]};
  const before=JSON.stringify(context.p1);
  const torch=context.itemInfoDetails(context.p1.inventory[0]),potion=context.itemInfoDetails(context.p1.inventory[1]);
  assert.ok(torch.why.includes("Current stack limit: "+t+" per slot."));
  assert.ok(torch.why.includes("Q is always Torch"));
  assert.ok(potion.why.includes("current stack limit is "+p+" per slot."));
  assert.ok(potion.why.includes("Press E"));
  const teleport=context.itemInfoDetails({kind:"teleport"}),map=context.itemInfoDetails({kind:"mapReveal"});
  assert.ok(teleport.why.includes("current stack limit is "+p+" per slot."));
  assert.ok(teleport.why.includes("outside sealed challenge rooms"));
  assert.ok(map.why.includes("current stack limit is "+t+" per slot."));
  assert.ok(map.why.includes("Use from TAB"));
  assert.equal(JSON.stringify(context.p1),before);
}
assert.equal(context.itemInfoDetails(null).kind,"empty");
assert.ok(context.itemHelp("magicSack").includes("potions, torches, Teleport Spells and Cartographer\x27s Eyes"));
assert.ok(!context.itemHelp("magicSack").includes("every stackable"));
assert.ok(context.itemHelp("potion").includes("one potion per stack"));
assert.ok(context.itemInfoDetails({kind:"banishment"}).why.includes("flashing B prompt"));
assert.ok(context.itemInfoDetails({kind:"artefact"}).why.includes("Score cannot buy it"));
console.log("PASS R196 live inventory help follows canonical Magic Sack stack limits");
