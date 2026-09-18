import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const source=fs.readFileSync(path.join(root,"js/v10-42-stage7-npc-merchant.js"),"utf8");
const core=fs.readFileSync(path.join(root,"js/game-core.js"),"utf8");
const render=fs.readFileSync(path.join(root,"js/game-render.js"),"utf8");
const bootstrap=fs.readFileSync(path.join(root,"js/v10-42-bootstrap.js"),"utf8");

function runtime(){
  const calls={talk:[],offers:[],quests:[]};
  const shops=[
    {id:"hidden",shopType:"hidden",roomId:2,title:"SECRET ARTEFACT TRADER",active:true,scorePurchases:0,sold:{}},
    {id:"entrance",shopType:"entrance",roomId:0,title:"FLOOR 2 SUPPLY DESK",active:true,scorePurchases:0,sold:{}}
  ];
  const host={shops,trader:shops[0],startShop:shops[1]};
  const world={rooms:[
    {id:0,theme:"IRON_KEEP",stage5TopologyRole:"route"},
    {id:1,theme:"IRON_KEEP",stage5TopologyRole:"crossroads"},
    {id:2,theme:"TREASURE_VAULT",stage5TopologyRole:"purposeful-dead-end"}
  ]};
  const npcs={
    quartermaster_bex:{id:"quartermaster_bex",name:"Bex Harrow",role:"quartermaster"},
    collector_nix:{id:"collector_nix",name:"Nix Calder",role:"collector"},
    archivist_orin:{id:"archivist_orin",name:"Orin Vale",role:"archivist"}
  };
  const api={
    npcs,
    talk(id,ctx){calls.talk.push({id,ctx});return{name:npcs[id].name,role:npcs[id].role,text:`line:${id}`,sequence:calls.talk.length,rumour:{text:"route hint"}}},
    offerFor(id,ctx){calls.offers.push({id,ctx});return{type:id==="quartermaster_bex"?"equipment-choice":"artefact-appraisal",choices:["a","b"]}},
    questSpec(id,ctx){calls.quests.push({id,ctx});return{id:`quest:${id}`,npcId:id,kind:id==="quartermaster_bex"?"prove-build":"complete-set",optional:true}}
  };
  const context={window:{CCGSystems:{decorate(){return host}},CCGLostSizzlerV142R15NpcExpansion:api}};
  vm.createContext(context);
  vm.runInContext(source,context,{filename:"v10-42-stage7-npc-merchant.js"});
  return{context,host,world,calls};
}

{
  const {context,host,world}=runtime(),api=context.window.CCGLostSizzlerV142Stage7NpcMerchant;
  context.window.CCGSystems.decorate(world,host,{floor:2,objective:"keys"});
  assert.equal(host.startShop.stage7NpcId,"quartermaster_bex");
  assert.equal(host.startShop.stage7NpcName,"Bex Harrow");
  assert.equal(host.trader.stage7NpcId,"archivist_orin","even floors should bind the hidden research merchant");
  assert.equal(host.v142NpcMerchants.shops.length,2);
  const interaction=api.enterShop(host.startShop);
  assert.equal(interaction.name,"Bex Harrow");
  assert.equal(interaction.offer.type,"equipment-choice");
  assert.equal(interaction.quest.kind,"prove-build");
  const view=api.describeShop(host.startShop);
  assert.match(view.heading,/BEX HARROW/);
  assert.match(view.copy,/line:quartermaster_bex/);
  assert.match(view.copy,/equipment choice/);
  const transaction=api.noteTransaction(host.startShop,"ammo");
  assert.equal(transaction.transactions,1);
  assert.equal(host.startShop.scorePurchases,0,"Stage 7 observation must not mutate the shop price ladder");
  assert.deepEqual(host.startShop.sold,{},"Stage 7 observation must not mutate authoritative sold-state");
}

{
  const {context,host,world}=runtime();
  context.window.CCGSystems.decorate(world,host,{floor:3,objective:"keys"});
  assert.equal(host.trader.stage7NpcId,"collector_nix","odd floors should bind the hidden artefact merchant");
}

assert.match(source,/const baseDecorate=SYS\.decorate\.bind\(SYS\)/,"Stage 7 must consume the established decorated host");
assert.match(source,/return bindMerchants\(worldState,result\|\|hostState,runState\)/,"Stage 7 must run after established shop placement");
assert.doesNotMatch(source,/score\s*[-+]=|scorePurchases\s*[-+]=|inventoryAdd\(|inventoryRemove\(|sold\.[A-Za-z0-9_]+\s*=/,"Stage 7 must not become transaction authority");
assert.doesNotMatch(source,/run\.floor\s*=|floorComplete\(|descendFloor\(|prepareTransit\(|confirmArrival\(/,"Stage 7 must not advance campaign or portal progression");
assert.doesNotMatch(source,/localStorage|sessionStorage|saveCheckpoint|loadCheckpoint|fetch\(|WebSocket|RoomNetwork/,"Stage 7 must not own persistence or networking");

assert.match(core,/CCGLostSizzlerV142Stage7NpcMerchant\?\.describeShop\?\.\(activeShop\)/,"shop panel must consume Stage 7 merchant presentation");
assert.match(core,/stage7\?\.enterShop\?\.\(shop/,"opening an existing shop must create one NPC interaction");
assert.match(core,/CCGLostSizzlerV142Stage7NpcMerchant\?\.noteTransaction\?\.\(activeShop,id\)/,"successful existing purchases must be observed by Stage 7");
assert.match(render,/stage7NpcName/,"world shop labels must expose bound merchant identity");

const r15=bootstrap.indexOf('["v10-42-r15-npc-expansion.js","CCGLostSizzlerV142R15NpcExpansion"]');
const stage7=bootstrap.indexOf('["v10-42-stage7-npc-merchant.js","CCGLostSizzlerV142Stage7NpcMerchant"]');
const r16=bootstrap.indexOf('["v10-42-r16-environment-presentation.js","CCGLostSizzlerV142R16EnvironmentPresentation"]');
assert.ok(r15>=0&&stage7>r15&&r16>stage7,"Stage 7 must load after R15 NPC state and before later presentation consumers");

console.log("PASS V10.42 Stage 7 NPC merchant integration");
