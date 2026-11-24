import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import {fileURLToPath} from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const metadata=fs.readFileSync(path.join(root,"js/v10-42-r69-recorded-voices.js"),"utf8");
const director=fs.readFileSync(path.join(root,"js/v10-16-voice-director.js"),"utf8");

let now=100000;
class AudioMock{
  constructor(src){
    this.src=src;this.readyState=1;this.currentTime=0;this.paused=true;
    this.volume=1;this.muted=false;
  }
  addEventListener(){}
  load(){}
  play(){this.paused=false;return Promise.resolve()}
  pause(){this.paused=true}
}
const events=new Map();
const win={
  CCG_ASSET_OVERRIDES:{audio:{voice:{}}},
  addEventListener(name,fn){if(!events.has(name))events.set(name,new Set());events.get(name).add(fn)},
  removeEventListener(name,fn){events.get(name)?.delete(fn)},
  dispatchEvent(event){for(const fn of events.get(event.type)||[])fn(event);return true}
};
const run={floor:1,stats:{deaths:0}};
const ctx={
  console,Audio:AudioMock,setTimeout,clearTimeout,setInterval,clearInterval,
  performance:{now:()=>now},localStorage:{getItem:()=>null,setItem(){}},
  document:{readyState:"complete",addEventListener(){},getElementById:()=>null,querySelector:()=>null},
  window:win,run,mode:"playing",p1:{id:"P1",x:2,y:2,maxHealth:10,health:10},
  p2:null,host:{enemies:[]},world:{rooms:[]},W:{roomAt:()=>-1},S:{isEnabled:()=>true}
};
vm.createContext(ctx);
vm.runInContext(metadata,ctx,{filename:"v10-42-r69-recorded-voices.js"});
vm.runInContext(director,ctx,{filename:"v10-16-voice-director.js"});
const voice=win.CCGLostSizzlerVoice;
const owner=win.CCG_OWNER_VOICE_SPRITE;
assert.ok(owner&&voice,"recordings and voice director loaded");
voice.state.unlocked=true;

const event=(type,detail={})=>win.dispatchEvent({type,detail});
assert.equal(voice.classifyToast("RUN STARTED","It's a trap. A locked chest needs a bronze key."),"",
  "narrative mentions must not generate an unrelated trap or chest warning");
assert.equal(voice.classifyToast("SUPPLIES","A new supply stash means you cannot trap yourself."),"",
  "the verb trap in a message must not be interpreted as a trap encounter");
assert.equal(voice.classifyToast("PICKUP","The locked chest nearby needs a bronze key."),"",
  "descriptive locked-chest text must not produce a locked-chest warning");
assert.equal(voice.classifyToast("LOCKED CHEST","A bronze key opens it."),"chestKeyRequired",
  "actual chest interaction still speaks its warning");
assert.equal(voice.classifyToast("BRONZE KEY COLLECTED","Your keyring has a key."),"bronzeKeyCollected",
  "actual key pickup notification remains recognised");
assert.equal(voice.classifyToast("FIRE TRAP","Leave the active tile."),"trap",
  "actual named trap still speaks its warning");

event("ccg:toast-shown",{title:"RUN STARTED",text:"Watch out, it could be a trap; a locked chest is nearby."});
assert.equal(voice.state.active,null,"startup description must not initiate an incorrect voice");

event("ccg:toast-shown",{title:"LOCKED CHEST",text:"Come back with a bronze key."});
assert.equal(voice.state.active?.key,"chestKeyRequired");
const earlierChest=voice.state.active;
event("ccg:item-collected",{kind:"bronze",title:"BRONZE KEY"});
assert.equal(voice.state.active?.key,"bronzeKeyCollected",
  "physical bronze-key pickup must override an older locked chest warning");
assert.equal(earlierChest.audio.paused,true,"stale chest dialogue must be cancelled");
assert.equal(voice.state.active.audio.currentTime,owner.cues[owner.aliases.bronzeKeyCollected].start,
  "collected key is routed to the correct owner OGG cue offset");
voice.stop();

ctx.mode="respawning";now+=1000;
event("ccg:player-death",{requiresConfirmation:true,playerId:"P1",source:"enemy",floor:1});
assert.equal(voice.state.active?.key,"playerDeath",
  "the authoritative death event must speak even if the wrapped hurtPlayer was bypassed");
assert.equal(voice.state.active?.priority,96,
  "death must interrupt lesser pickups, combat chatter and chest prompts");
assert.equal(voice.state.active.audio.currentTime,owner.cues[owner.aliases.playerDeath].start,
  "death is routed to the owner-recorded player-death cue, not Game Over");
voice.stop();

event("ccg:player-death",{requiresConfirmation:false});
assert.equal(voice.state.active,null,"non-canonical death notices must not duplicate dialogue");
ctx.mode="menu";
event("ccg:toast-shown",{title:"FIRE TRAP",text:"World generation preview."});
assert.equal(voice.state.active,null,"menu/world-generation notices must not play encounter speech");

ctx.mode="playing";now+=1000;
event("ccg:run-started",{run});
await new Promise(resolve=>setTimeout(resolve,250));
assert.equal(voice.state.active?.key,"welcome","new-run startup speaks the Welcome clip");
assert.equal(voice.state.active.audio.currentTime,owner.cues[owner.aliases.welcome].start,
  "welcome voice seeks the matching owner OGG offset");
voice.stop();
console.log("PASS R170: authoritative death, pickup priority, title-scoped warnings, menu silence and Welcome playback.");
