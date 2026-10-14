import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const script=fs.readFileSync("arcade/lost-sizzler/js/v10-16-voice-director.js","utf8");
const hooks={},timers=new Map();
let timerId=0;
class TestAudio {
  constructor(src){this.src=src;this.currentTime=0;this.readyState=1;this.volume=1}
  load(){}
  play(){this.playing=true;return Promise.resolve()}
  pause(){this.playing=false}
  addEventListener(name,fn){this[name]=fn}
}
const cues={
  "thank-god-you-found-me":{start:0,duration:1},
  "i-ll-follow-you":{start:2,duration:1},
  "exit-sigil-acquired":{start:4,duration:1},
  "health-restored":{start:6,duration:1}
};
const recorded={src:"assets/audio/voice/ccg-recorded-voices-r69.ogg",
  aliases:{"npc.scout.found":"thank-god-you-found-me",
    "npc.scout.following":"i-ll-follow-you",exitSigilAcquired:"exit-sigil-acquired",
    healthRestored:"health-restored"},cues};
const window={CCG_RECORDED_VOICE_SPRITE:recorded,
  addEventListener:(name,fn)=>(hooks[name]??=[]).push(fn),removeEventListener:()=>{}};
const document={readyState:"complete",addEventListener:(name,fn)=>(hooks[name]??=[]).push(fn),
  getElementById:()=>null,querySelector:()=>null};
const env={window,document,Audio:TestAudio,
  localStorage:{getItem:()=>null,setItem:()=>{}},
  performance:{now:()=>50000},console,Math,Date,
  setTimeout:fn=>{const id=++timerId;timers.set(id,fn);return id},
  clearTimeout:id=>timers.delete(id),
  setInterval:fn=>{const id=++timerId;return id},
  clearInterval:()=>{},
  run:{floor:4},mode:"playing",S:{isEnabled:()=>true}};
vm.createContext(env);
vm.runInContext(script,env);
const voice=window.CCGLostSizzlerVoice;
assert.ok(voice,"Director must initialise");
for(const fn of hooks.pointerdown||[])fn();
assert.equal(voice.state.unlocked,true);
assert.equal(voice.say("healthRestored",{cooldown:0}),true);
assert.equal(voice.state.active.key,"healthRestored");
assert.equal(voice.sayDialogue("npc.scout.found","Thank God you found me.",{priority:44}),true,
  "Current recorded NPC dialogue should interrupt a minor health cue");
assert.equal(voice.state.active.key,"npc.scout.found");
const interruptedBefore=voice.state.interrupted;
assert.equal(voice.sayDialogue("npc.alchemist.ready","I can distil Banishment Essence.",{priority:90,interrupt:true}),false,
  "Missing R69 Alchemist dialogue must not pretend to play");
assert.equal(voice.state.active.key,"npc.scout.found",
  "Unavailable speech must not interrupt an existing audible recording");
assert.equal(voice.state.interrupted,interruptedBefore,
  "Missing recorded dialogue must never increment interrupted-speech counter");
assert.equal(voice.state.lastSkipped.reason,"no-approved-recording");
assert.equal(voice.sayDialogue("npc.scout.following","I'll follow you.",{priority:44}),false,
  "Equal priority must not interrupt current NPC recording");
assert.equal(voice.state.queue.length,0,"No stale recordings may accumulate");
assert.equal(voice.say("exitSigilAcquired",{priority:62}),true,
  "Current important game event should interrupt lower-priority NPC voice");
assert.equal(voice.state.active.key,"exitSigilAcquired");
assert.equal(voice.state.queue.length,0);
voice.setEnabled(false);
assert.equal(voice.state.active,null);
assert.equal(voice.state.queue.length,0);
const combat=fs.readFileSync("arcade/lost-sizzler/js/game-local-runtime.js","utf8");
assert.match(combat,/else if\(isDeathStalkerEnemy\(e\)\)window\.CCGLostSizzlerVoice\?\.say\?\.\("deathStalkerBanished",\{cooldown:0\}\)/,
  "Actual fatal Death Stalker hit must request its approved banishment recording");
console.log("R119 owner recorded voice priorities; no backlog; VOICE OFF: PASS");
