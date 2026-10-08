import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const script=fs.readFileSync("arcade/lost-sizzler/js/v10-16-voice-director.js","utf8");
const hooks={},timeouts=new Map(),intervals=new Map();
let timerId=0,clock=50000;
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
  performance:{now:()=>clock},console,Math,Date,
  setTimeout:fn=>{const id=++timerId;timeouts.set(id,fn);return id},
  clearTimeout:id=>timeouts.delete(id),
  setInterval:fn=>{const id=++timerId;intervals.set(id,fn);return id},
  clearInterval:id=>intervals.delete(id),
  run:{floor:4},mode:"playing",S:{isEnabled:()=>true}};
vm.createContext(env);
vm.runInContext(script,env);
const voice=window.CCGLostSizzlerVoice;
assert.ok(voice,"Director must initialise");
for(const fn of hooks.pointerdown||[])fn();
assert.equal(voice.state.unlocked,true);
assert.equal(voice.sayDialogue("npc.scout.found","Thank God you found me.",{priority:44}),true);
assert.equal(voice.state.active.key,"npc.scout.found");
assert.equal(voice.sayDialogue("npc.scout.following","I'll follow you.",{priority:44}),true);
assert.equal(voice.say("exitSigilAcquired",{priority:62,interrupt:false}),true);
assert.equal(voice.state.queue.length,2,"Correct scenario prompts must wait, not vanish");
function advance(){
  const current=voice.state.active;
  assert.ok(current?.timer,"Recorded sprite cue must be active");
  current.audio.currentTime=999;
  intervals.get(current.timer)();
  for(const [id,fn] of [...timeouts]){timeouts.delete(id);fn()}
}
advance();
assert.equal(voice.state.active.key,"exitSigilAcquired","Important event has priority");
advance();
assert.equal(voice.state.active.key,"npc.scout.following","NPC recording follows");
assert.equal(voice.sayDialogue("npc.scout.found","Thank God you found me.",{priority:44,cooldown:0}),true);
assert.equal(voice.state.queue.length,1);
for(const fn of hooks["ccg:run-started"]||[])fn({detail:{run:{floor:1}}});
assert.equal(voice.state.queue.length,0,"Old-run prompts must be discarded");
voice.setEnabled(false);
assert.equal(voice.state.active,null);
assert.equal(voice.state.queue.length,0);
console.log("R119 owner recorded voice queue, priority, run reset, VOICE OFF: PASS");
