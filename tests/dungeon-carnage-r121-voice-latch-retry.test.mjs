import fs from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";
import {test} from "node:test";

const script=fs.readFileSync("arcade/lost-sizzler/js/v10-16-voice-director.js","utf8");
const metadata=fs.readFileSync("arcade/lost-sizzler/js/v10-42-r69-recorded-voices.js","utf8");
const originalAliases=JSON.parse(metadata.match(/aliases:Object\.freeze\((\{[^\n]+\})\)/)[1]);

function build(initialHealth=2){
  const hooks={},timers=new Map();let id=0;
  const player={x:2,y:2,health:initialHealth,maxHealth:10,armor:0};
  const aliases={...originalAliases,rareLoot:"qa-rare-loot"};
  const keys=["exitSigilAcquired","lowHealth","criticalHealth","rareLoot"];
  const cues=Object.fromEntries(keys.map((key,i)=>[
    aliases[key],{start:i*3,duration:1}
  ]));
  class TestAudio{
    constructor(src){this.src=src;this.currentTime=0;this.readyState=1}
    load(){}
    play(){this.playing=true;return Promise.resolve()}
    pause(){this.playing=false}
    addEventListener(name,fn){this[name]=fn}
  }
  const window={
    CCG_RECORDED_VOICE_SPRITE:{src:"assets/audio/voice/ccg-recorded-voices-r69.ogg",aliases,cues},
    addEventListener:(key,fn)=>(hooks[key]??=[]).push(fn),removeEventListener:()=>{}
  };
  const document={readyState:"complete",addEventListener:(k,fn)=>(hooks[k]??=[]).push(fn),getElementById:()=>null,querySelector:()=>null};
  const env={
    window,document,Audio:TestAudio,Math,Date,console,
    localStorage:{getItem:()=>null,setItem:()=>{}},
    performance:{now:()=>100000},
    setTimeout:fn=>{const key=++id;timers.set(key,fn);return key},
    clearTimeout:key=>timers.delete(key),
    setInterval:fn=>{const key=++id;timers.set(key,fn);return key},
    clearInterval:key=>timers.delete(key),
    S:{isEnabled:()=>true},mode:"playing",
    p1:player,p2:null,run:{floor:2,stats:{deaths:0}},
    world:{rooms:[{}]},host:{enemies:[]},W:{roomAt:()=>0},
    update:dt=>dt,
    hurtPlayer:(target,n)=>{target.health-=n;return target.health}
  };
  vm.createContext(env);
  vm.runInContext(script,env);
  const voice=window.CCGLostSizzlerVoice;
  assert.ok(voice,"Actual voice director did not start");
  for(const cb of hooks.pointerdown||[])cb();
  return {voice,env,player};
}

test("low-health warning remains retryable after busy combat speech",()=>{
  const {voice,env,player}=build(2);
  assert.equal(voice.say("exitSigilAcquired",{priority:80,cooldown:0}),true);
  env.update(400);
  assert.equal(voice.state.lowHealthLatch.has(player),false);
  assert.equal(voice.state.active.key,"exitSigilAcquired");
  voice.stop("interrupted");
  env.update(400);
  assert.equal(voice.state.lowHealthLatch.has(player),true);
  assert.equal(voice.state.active.key,"lowHealth");
  assert.equal(voice.state.queue.length,0);
});

test("critical-health warning remains retryable after a higher priority cue",()=>{
  const {voice,env,player}=build(1);
  assert.equal(voice.say("exitSigilAcquired",{priority:80,cooldown:0}),true);
  env.update(400);
  assert.equal(voice.state.criticalHealthLatch.has(player),false);
  voice.stop("interrupted");
  env.update(400);
  assert.equal(voice.state.criticalHealthLatch.has(player),true);
  assert.equal(voice.state.active.key,"criticalHealth");
});

test("damage callback cannot permanently consume a failed low-health warning",()=>{
  const {voice,env,player}=build(5);
  assert.equal(voice.say("exitSigilAcquired",{priority:80,cooldown:0}),true);
  env.hurtPlayer(player,3);
  assert.equal(player.health,2);
  assert.equal(voice.state.lowHealthLatch.has(player),false);
  voice.stop("interrupted");
  env.update(400);
  assert.equal(voice.state.lowHealthLatch.has(player),true);
  assert.equal(voice.state.active.key,"lowHealth");
});

test("rare loot's once-per-floor gate commits only after a recording plays",()=>{
  const {voice,env}=build(10);
  assert.equal(voice.say("exitSigilAcquired",{priority:80,cooldown:0}),true);
  assert.equal(voice.say("rareLoot",{cooldown:0}),false);
  assert.equal(voice.state.rareLootFloor,0);
  voice.stop("interrupted");
  assert.equal(voice.say("rareLoot",{cooldown:0}),true);
  assert.equal(voice.state.rareLootFloor,2);
  voice.stop("interrupted");
  assert.equal(voice.say("rareLoot",{cooldown:0}),false);
  env.run.floor=3;
  assert.equal(voice.say("rareLoot",{cooldown:0}),true);
  assert.equal(voice.state.rareLootFloor,3);
});
