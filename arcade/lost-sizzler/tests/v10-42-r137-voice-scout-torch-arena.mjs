import fs from "node:fs";
import assert from "node:assert/strict";
import vm from "node:vm";
import path from "node:path";
import {fileURLToPath} from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const read=file=>fs.readFileSync(path.join(root,"js",file),"utf8");
function cut(source,start,end){
  const a=source.indexOf(start),b=source.indexOf(end,a+start.length);
  assert.ok(a>=0&&b>a,"Missing exact source boundary "+start);
  return source.slice(a,b);
}
const voice=read("v10-16-voice-director.js"),npc=read("v10-41-stage8-npc-dialogue.js"),play=read("game-play.js");
const voiceEnd=cut(voice,"function finishActive(active=state.active){","function stopActive(");
const activeAudio={paused:false,pause(){this.paused=true},onended(){},onerror(){}};
const voiceCtx={state:{active:{audio:activeAudio,priority:45},activePriority:45},cleaned:0,fx:0,
clearActiveTimers:()=>{voiceCtx.cleaned++},releaseDungeonFx:()=>{voiceCtx.fx++}};
vm.createContext(voiceCtx);
vm.runInContext(voiceEnd+";this.finish=finishActive;",voiceCtx,{timeout:1200});
assert.equal(voiceCtx.finish(),true,"Watchdog/clip completion must stop the active clip");
assert.equal(activeAudio.paused,true,"Recorded voice must be PAUSED when its watchdog ends");
assert.equal(activeAudio.onended,null,"Old onended handlers must no longer chain playback");
assert.equal(voiceCtx.state.active,null,"Audio owner must release the old active clip");
assert.equal(voiceCtx.finish(),false,"Completing an old clip must not pause a new clip");
assert.match(npc,/if\(host\?\.rescue\?\.following&&!host\.rescue\.rescued\)return args/,"Escort cannot be interrupted by generic keeper greeting");
assert.doesNotMatch(npc,/else if\(rescue\.following&&withinReach\(player,rescue\)\)present\(rescue,lines\.scout\.following/,"Every step near the scout must not replay the same voice");
assert.match(npc,/else if\(rescue\.rescued&&withinReach\(player,rescue\)\)present\(rescue,lines\.scout\.rescued/,"Direct interaction with a rescued Scout must retain its safe-state acknowledgement");

const movement=cut(play,"function solveSequenceTorch(p){","function weightBridgeCell(");
const puzzle={roomId:4,torches:[{dir:"N",x:2,y:2,lit:false},{dir:"E",x:3,y:2,lit:false}],sequence:["N","E"],progress:0,solved:false};
const player={id:"hero",x:2,y:2},puzzleSfx=[],notices=[],xp=[];
const puzzleCtx={host:{sequenceTorchPuzzle:puzzle,chests:[],enemies:[],revision:0},
  world:{},W:{roomAt:()=>4},localPlayers:()=>[player],S:{sfx:k=>puzzleSfx.push(k)},
  P:{gold:"#ff0"},floatText(){},showToast(...args){notices.push(args)},score:0,
  awardXP:(p,n)=>xp.push(n),spawnPuzzleAmbush:()=>0};
vm.createContext(puzzleCtx);
vm.runInContext(movement+";this.stepTorch=triggerSequenceTorch;",puzzleCtx,{timeout:1200});
assert.equal(puzzleCtx.stepTorch(player,false),false,"Passive/non-deliberate updates must not activate a torch");
assert.equal(puzzleCtx.stepTorch(player,true),true,"Deliberately entering the N torch activates it");
assert.equal(puzzle.progress,1);
assert.equal(puzzleCtx.stepTorch(player,true),false,"Standing still cannot collect one torch twice");
player.x=3;assert.equal(puzzleCtx.stepTorch(player,true),true,"A deliberate new torch tile activates next step");
assert.equal(puzzle.solved,true,"All torch tiles solve puzzle exactly once");
assert.deepEqual(xp,[10],"Torch reward awarded once");

const rescueFn=cut(play,"function updateRescue(){","function updateStalker(");
const rescue={x:2,y:2,following:true,rescued:false},hero={id:"hero",x:2,y:2,health:11};
const voices=[],rescueToasts=[],updated=[];
const rescueCtx={host:{rescue},run:{},world:{},performance:{now:()=>2000},
  localPlayers:()=>[hero],md:(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y),
  SYS:{inSanctuary:()=>true,updateObjective:(...args)=>updated.push(args),pathStep:()=>null},
  PGR:{roomCompletion:()=>.75},explored:new Map([["hero",new Set()]]),
  window:{CCGLostSizzlerStage8NpcDialogue:{presentScout:(p,opts)=>voices.push({p,opts})},
    CCGLostSizzlerVoice:{say(){throw Error("Non-rescue voice must not take over")}}},
  showToast:(...args)=>rescueToasts.push(args)};
vm.createContext(rescueCtx);
vm.runInContext(rescueFn+";this.rescueTick=updateRescue;",rescueCtx,{timeout:1200});
rescueCtx.rescueTick();rescueCtx.rescueTick();
assert.equal(rescue.rescued,true);
assert.equal(rescue.following,false);
assert.equal(voices.length,1,"Scout completion voice must run exactly once");
assert.equal(voices[0].opts.stateKey,"rescued");
assert.equal(rescueToasts.length,1,"Completion feedback must not repeat");
assert.equal(rescueToasts[0][4].ccgDialogueVoiceHandled,true,"Generic sanctuary voice must not replace scout");
assert.equal(updated.length,1,"Rescue objective must update only once");

console.log("PASS R137 voice watchdog pause, Scout rescue and genuine torch entry (solo dungeon only)");
