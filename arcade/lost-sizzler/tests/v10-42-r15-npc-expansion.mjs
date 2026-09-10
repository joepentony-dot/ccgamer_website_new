import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const file=path.join(root,"js","v10-42-r15-npc-expansion.js");
const source=fs.readFileSync(file,"utf8");

for(const forbidden of ["Math.random","localStorage","sessionStorage","WebSocket","EventSource","fetch(","setInterval","requestAnimationFrame"]){
  assert.equal(source.includes(forbidden),false,`r15 must not introduce ${forbidden}`);
}

function load(){
  const context={window:{},console,JSON,Math,Object,Number,String,Array,Set};
  vm.createContext(context);vm.runInContext(source,context,{filename:file});
  return context.window.CCGLostSizzlerV142R15NpcExpansion;
}

const a=load();
assert.ok(a,"r15 namespace should install");
assert.equal(a.version,"V10.42-r15");

const sanctuary=a.listForRoom({biome:"sanctuary",roomRole:"sanctuary"});
assert.deepEqual([...sanctuary.map(n=>n.id)].sort(),["archivist_orin","collector_nix","quartermaster_bex"]);
assert.ok(a.offerFor("quartermaster_bex"));
assert.equal(a.offerFor("quartermaster_bex").transactionAuthority,false,"r15 offers must remain descriptors only");
assert.equal(a.offerFor("collector_nix").type,"artefact-appraisal");
assert.equal(a.offerFor("archivist_orin").type,"dossier-research");

const web=a.listForRoom({biome:"spider-web",roomRole:"nest"});
assert.ok(web.some(n=>n.id==="survivor_elin"),"web rooms should expose the trapped/rescuable survivor");
const rescue=a.rescue("survivor_elin",{roomKey:"web-7"});
assert.equal(rescue.accepted,true);
assert.equal(a.rescue("survivor_elin",{roomKey:"web-7"}).accepted,false,"rescue must be exactly once");

const cryptTalk=a.talk("crypt_keeper",{biome:"moss-crypt",roomKey:"crypt-3",objective:"bone-totems"});
assert.equal(cryptTalk.role,"specialist");
assert.match(cryptTalk.rumour.text,/Bone|totem|crypt|door/i);
const emberTalk=a.talk("ember_runner",{biome:"ember-depths",roomKey:"ember-4"});
assert.match(emberTalk.rumour.text,/Ember|surge|distance/i);
const outdoor=a.listForRoom({biome:"outdoor-storm",roomRole:"outdoor-route"});
assert.ok(outdoor.some(n=>n.id==="weather_warden"),"outdoor/weather rooms need their own guide identity");

const quest=a.acceptQuest("scout_mara",{roomKey:"rare-side-2"});
assert.equal(quest.accepted,true);
assert.equal(quest.quest.optional,true);
assert.equal(quest.quest.target,"alternate-route");
assert.equal(a.claimQuestReward("scout_mara").accepted,false,"unfinished quest cannot reward");
assert.equal(a.advanceQuest("scout_mara",1).quest.completed,true);
assert.equal(a.claimQuestReward("scout_mara").accepted,true);
assert.equal(a.claimQuestReward("scout_mara").accepted,false,"quest reward must be exactly once");

const snap=a.snapshot();
const b=load();
b.restore(snap);
assert.deepEqual(JSON.parse(JSON.stringify(b.snapshot())),JSON.parse(JSON.stringify(snap)),"snapshot/restore must reproduce NPC state");
const nextA=a.talk("archivist_orin",{biome:"sanctuary",roomKey:"safe-1"});
const nextB=b.talk("archivist_orin",{biome:"sanctuary",roomKey:"safe-1"});
assert.equal(nextA.text,nextB.text,"restored dialogue sequencing must remain deterministic");

const bootstrap=fs.readFileSync(path.join(root,"js","v10-42-bootstrap.js"),"utf8");
const r14=bootstrap.indexOf('v10-42-r14-combat-encounter-bridge.js');
const r15=bootstrap.indexOf('v10-42-r15-npc-expansion.js');
const finalStability=bootstrap.indexOf('v10-42-r1-stability.js');
assert.ok(r14>=0&&r15>r14,"r15 must load after the stable r14 bridge");
assert.ok(finalStability>r15,"final r1 stability owner must remain after r15");

console.log("V10.42 r15 NPC expansion contract passed");
