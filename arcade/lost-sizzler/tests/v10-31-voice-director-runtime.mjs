import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const source=fs.readFileSync(path.join(root,"js/v10-16-voice-director.js"),"utf8");
let now=100000;
const audioInstances=[];
class AudioMock{
  constructor(src){this.src=src;this.readyState=1;this.currentTime=0;this.paused=true;this.volume=1;this.listeners={};audioInstances.push(this)}
  addEventListener(type,fn){this.listeners[type]=fn}
  load(){this.listeners.loadedmetadata?.()}
  play(){this.paused=false;return Promise.resolve()}
  pause(){this.paused=true}
}
class UtteranceMock{constructor(text){this.text=text}}
const speech={cancelled:0,spoken:[],getVoices:()=>[],cancel(){this.cancelled++},speak(value){this.spoken.push(value)}};
const tutorial={state:{active:false,tutorialRequested:false}};
const context={
  console,Audio:AudioMock,SpeechSynthesisUtterance:UtteranceMock,
  setTimeout,clearTimeout,setInterval,clearInterval,
  performance:{now:()=>now},localStorage:{getItem:()=>null,setItem(){}},
  document:{readyState:"complete",addEventListener(){},getElementById:()=>null,querySelector:()=>null,createElement:()=>({addEventListener(){},setAttribute(){}})},
  run:{floor:1},mode:"playing",p1:{x:2,y:2,maxHealth:8,health:8},world:{},host:{enemies:[]},
  W:{roomAt:(_world,x)=>x<10?1:2},visibleTo:()=>true,S:{isEnabled:()=>true},
  window:{CCG_ASSET_OVERRIDES:{audio:{voice:{}}},CCGLostSizzlerOnboardingV120:tutorial,speechSynthesis:speech}
};
context.window.window=context.window;
vm.createContext(context);vm.runInContext(source,context,{filename:"v10-16-voice-director.js"});
const voice=context.window.CCGLostSizzlerVoice;
voice.state.unlocked=true;

assert.equal(voice.say("secret"),true,"first event should take the idle voice channel");
const first=voice.state.active;
assert.equal(voice.say("shop"),false,"a second ordinary cue must be skipped while speech is active");
assert.equal(voice.state.active,first,"a skipped cue must not replace current speech");
assert.equal(voice.state.queue.length,0,"skipped cues must never enter a backlog");
assert.equal(voice.state.lastSkipped.reason,"busy");

assert.equal(voice.say("gameOver"),true,"an explicitly interrupting critical cue may replace lower-priority speech");
assert.notEqual(voice.state.active,first);
assert.equal(first.audio.paused,true,"interruption must stop the old audio source");
assert.equal(voice.state.interrupted,1);
voice.stop();

assert.equal(voice.say("hurt"),true,"Ow should play for the first registered hit");
voice.stop();now+=1000;
assert.equal(voice.say("hurt"),false,"Ow must not repeat inside 30 seconds");
now+=29001;
assert.equal(voice.say("hurt"),true,"Ow may play again after its 30-second gap");
voice.stop();

tutorial.state.active=true;
assert.equal(voice.say("secret"),false,"tutorial mode must reject every voice cue");
tutorial.state.active=false;

assert.equal(typeof voice.sayDialogue,"function","voice owner must expose one bounded dialogue speech entry point");
voice.stop();
const speechBefore=speech.spoken.length;
assert.equal(voice.sayDialogue("npc.scout.found","There you are. Get me to the lights.",{cooldown:9000}),true,"first NPC dialogue line should use the existing voice channel");
assert.equal(speech.spoken.length,speechBefore+1,"NPC dialogue without a recorded override must fall back through the existing speech owner");
assert.equal(speech.spoken.at(-1)?.text,"There you are. Get me to the lights.","dialogue fallback must speak the supplied character text");
voice.stop();
assert.equal(voice.sayDialogue("npc.scout.found","There you are. Get me to the lights.",{cooldown:9000}),false,"the same dialogue key must respect its cooldown after playback ends");
now+=9001;
assert.equal(voice.sayDialogue("npc.scout.found","Still here.",{cooldown:9000}),true,"dialogue may speak again only after its bounded cooldown");
voice.stop();
voice.setEnabled(false);
now+=9001;
assert.equal(voice.sayDialogue("npc.scout.found","Voice disabled.",{cooldown:0}),false,"disabled voice must suppress NPC dialogue without affecting the game");
voice.setEnabled(true);

context.host.enemies=[{alive:true,deathStalker:true,voidStalker:true,x:12,y:2}];
assert.equal(voice.classifyToast("DOOR CLOSED","The floor's one Death Stalker can open it."),"","remote lore text must not create an encounter voice");
context.host.enemies[0].x=3;
assert.equal(voice.classifyToast("DEATH STALKER — INDESTRUCTIBLE","Weapons only repel it."),"deathStalker","a visible same-room stalker may authorise its warning");

assert.ok(audioInstances.every(audio=>audio.volume<=.72),"all recorded speech must use the reduced volume ceiling");
voice.stop();
console.log("Lost Sizzler V10.31 voice channel runtime checks passed.");
