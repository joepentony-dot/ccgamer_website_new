import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import {test} from "node:test";

/** Actual voice-director VM, with deterministic approved owner-recording cues. */
const source=fs.readFileSync("arcade/lost-sizzler/js/v10-16-voice-director.js","utf8");
const metadata=fs.readFileSync("arcade/lost-sizzler/js/v10-42-r69-recorded-voices.js","utf8");
const aliases=JSON.parse(metadata.match(/aliases:Object\.freeze\((\{[^\n]+\})\)/)[1]);
const owner=Object.fromEntries([
  "exitSigilAcquired","guardianEncountered","useBanishmentFlask","enemiesNearby"
].map((k,i)=>[aliases[k],{start:i*3,duration:1}]));
function harness({guardian=false,banishment=false,enemy=false}={}){
  const events={},timer=new Map();let next=0,clock=50000;
  const player={x:3,y:3,health:10,maxHealth:10};
  const room={};
  const guardianEnemy={alive:true,guardian:true,x:5,y:4};
  const enemyNpc={alive:true,guardian:false,kind:"skeleton",x:6,y:4};
  const host={enemies:[...(guardian?[guardianEnemy]:[]),...(enemy?[enemyNpc]:[])]};
  const nearest={x:4,y:4};
  class TestAudio {
    constructor(src){this.src=src;this.currentTime=0;this.readyState=1;this.volume=1}
    load(){}
    play(){this.started=true;return Promise.resolve()}
    pause(){this.started=false}
    addEventListener(n,cb){this[n]=cb}
  }
  const window={
    CCG_RECORDED_VOICE_SPRITE:{
      src:"assets/audio/voice/ccg-recorded-voices-r69.ogg",aliases,cues:owner},
    addEventListener:(key,fn)=>(events[key]??=[]).push(fn),
    removeEventListener:()=>{}
  };
  const document={
    readyState:"complete",addEventListener:(key,fn)=>(events[key]??=[]).push(fn),
    getElementById:()=>null,querySelector:()=>null
  };
  const env={
    window,document,Audio:TestAudio,
    localStorage:{getItem:()=>null,setItem:()=>{}},
    performance:{now:()=>clock},console,Math,Date,
    setTimeout:fn=>{const n=++next;timer.set(n,fn);return n},
    clearTimeout:n=>timer.delete(n),
    setInterval:fn=>{const n=++next;timer.set(n,fn);return n},
    clearInterval:n=>timer.delete(n),
    mode:"playing",p1:player,p2:null,
    run:{floor:4},world:{rooms:[room]},
    host,W:{roomAt:()=>0},
    banishmentState:()=>banishment?{ready:true,nearest}:null,
    update:dt=>dt,
    S:{isEnabled:()=>true}
  };
  vm.createContext(env);
  vm.runInContext(source,env);
  const voice=window.CCGLostSizzlerVoice;
  for(const fn of events.pointerdown||[])fn();
  return {env,voice,guardianEnemy,nearest,player};
}
test("guardian encounter is not burned by a busy voice slot",()=>{
  const {env,voice,guardianEnemy}=harness({guardian:true});
  assert.equal(voice.say("exitSigilAcquired",{priority:75,cooldown:0}),true);
  assert.equal(voice.state.active.key,"exitSigilAcquired");
  env.update(400);
  assert.equal(voice.state.active.key,"exitSigilAcquired");
  assert.equal(voice.state.guardianVoiceSeen.has(guardianEnemy),false,
    "An ignored Guardian warning must be retryable");
  voice.stop("interrupted");
  env.update(400);
  assert.equal(voice.state.active.key,"guardianEncountered");
  assert.equal(voice.state.guardianVoiceSeen.has(guardianEnemy),true);
  assert.equal(voice.state.queue.length,0,"Never build a stale speech queue");
});
test("Banishment Flask use prompt retries when important speech finishes",()=>{
  const {env,voice,nearest}=harness({banishment:true});
  assert.equal(voice.say("exitSigilAcquired",{priority:75,cooldown:0}),true);
  env.update(400);
  assert.equal(voice.state.banishmentPromptSeen.has(nearest),false);
  voice.stop("interrupted");
  env.update(400);
  assert.equal(voice.state.active.key,"useBanishmentFlask");
  assert.equal(voice.state.banishmentPromptSeen.has(nearest),true);
});
test("ordinary enemy warning cannot be marked spoken without a recording",()=>{
  const {env,voice}=harness({enemy:true});
  assert.equal(voice.say("exitSigilAcquired",{priority:75,cooldown:0}),true);
  env.update(400);
  assert.equal(voice.state.enemyRoomVoiceKeys.size,0);
  voice.stop("interrupted");
  env.update(400);
  assert.equal(voice.state.active.key,"enemiesNearby");
  assert.equal(voice.state.enemyRoomVoiceKeys.size,1);
});
