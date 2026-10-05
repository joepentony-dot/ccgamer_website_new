import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {chromium} from "playwright";

const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../../../..");
const recordedSource=fs.readFileSync(path.join(repo,"arcade/lost-sizzler/js/v10-42-r69-recorded-voices.js"),"utf8");
const directorSource=fs.readFileSync(path.join(repo,"arcade/lost-sizzler/js/v10-16-voice-director.js"),"utf8");

const aliasMatch=recordedSource.match(/aliases:Object\.freeze\((\{.*?\})\),\s*cues:/s);
const cueMatch=recordedSource.match(/cues:Object\.freeze\((\{.*\})\)\s*\}\);/s);
assert.ok(aliasMatch&&cueMatch,"recorded voice metadata must expose aliases and cues");
const aliases=JSON.parse(aliasMatch[1]);
const cues=JSON.parse(cueMatch[1]);
for(const entry of Object.entries(aliases))assert.ok(cues[entry[1]],"recorded alias "+entry[0]+" must resolve to cue "+entry[1]);
assert.equal(aliases["npc.alchemist.ready"],undefined,"trade-ready Alchemist must not reuse the obsolete artefact-worded Flask recording");

const browser=await chromium.launch({headless:true,args:["--disable-dev-shm-usage"]});
try{
  const page=await browser.newPage();
  await page.setContent('<div class="system-buttons"></div>');
  await page.addScriptTag({content:[
    'window.S={isEnabled:()=>true};',
    'window.CCG_ASSET_OVERRIDES={audio:{voice:{}}};',
    'window.run={floor:1};window.mode="playing";',
    'window.p1={id:"P1",health:8,maxHealth:8};window.p2=null;',
    'window.host={enemies:[]};window.world={rooms:[]};window.W={roomAt:()=>-1};',
    'window.__voiceInstances=[];',
    'window.Audio=class{',
    'constructor(url){this.url=String(url||"");this.paused=true;this.currentTime=0;this.duration=240;this.readyState=0;this.volume=1;this.muted=false;this.preload="";this.listeners=new Map();window.__voiceInstances.push(this)}',
    'addEventListener(name,fn,opts){const list=this.listeners.get(name)||[];list.push({fn,once:Boolean(opts&&opts.once)});this.listeners.set(name,list)}',
    'removeEventListener(name,fn){const list=this.listeners.get(name)||[];this.listeners.set(name,list.filter(row=>row.fn!==fn))}',
    '_emit(name){const list=[...(this.listeners.get(name)||[])];for(const row of list){row.fn.call(this,{type:name,target:this});if(row.once)this.removeEventListener(name,row.fn)}}',
    'load(){this.readyState=1;queueMicrotask(()=>this._emit("loadedmetadata"))}',
    'play(){this.paused=false;return Promise.resolve()}',
    'pause(){this.paused=true}',
    'removeAttribute(){}',
    '};'
  ].join("\\n")});
  await page.addScriptTag({content:recordedSource});
  await page.addScriptTag({content:directorSource});
  await page.evaluate(()=>document.dispatchEvent(new KeyboardEvent("keydown",{code:"KeyA",bubbles:true})));
  await page.waitForTimeout(0);

  const results=await page.evaluate(async()=>{
    const api=window.CCGLostSizzlerVoice;
    const recorded=window.CCG_RECORDED_VOICE_SPRITE;
    const rows=[];
    for(const entry of Object.entries(recorded.aliases)){
      const key=entry[0],target=entry[1];
      api.stop("test-reset");
      const before=window.__voiceInstances.length;
      const started=api.lines[key]
        ? api.say(key,{cooldown:0,priority:100,interrupt:true})
        : api.sayDialogue(key,"Recorded cue "+key,{cooldown:0,priority:100,interrupt:true});
      await new Promise(resolve=>setTimeout(resolve,0));
      const created=window.__voiceInstances.slice(before).filter(audio=>audio.url===recorded.src&&!audio.muted);
      const audio=created.length?created[created.length-1]:null;
      const cue=recorded.cues[target];
      rows.push({key,target,started:Boolean(started),created:created.length,currentTime:audio?Number(audio.currentTime):null,expected:Number(cue.start)});
      api.stop("test-reset");
    }

    const beforeLevel=window.__voiceInstances.length;
    window.dispatchEvent(new CustomEvent("ccg:level-up",{detail:{level:2}}));
    await new Promise(resolve=>setTimeout(resolve,0));
    const createdLevel=window.__voiceInstances.slice(beforeLevel).filter(audio=>audio.url===recorded.src&&!audio.muted);
    const levelAudio=createdLevel.length?createdLevel[createdLevel.length-1]:null;
    api.stop("test-reset");
    return{
      rows,
      levelUp:{created:Boolean(levelAudio),currentTime:levelAudio?Number(levelAudio.currentTime):null,expected:Number(recorded.cues[recorded.aliases.levelUp].start)}
    };
  });

  for(const row of results.rows){
    assert.equal(row.started,true,row.key+" must start through the real voice director");
    assert.ok(row.created>=1,row.key+" must create the owner-recorded sprite audio");
    assert.ok(Math.abs(row.currentTime-row.expected)<0.001,row.key+" must seek to its recorded cue start");
  }
  assert.equal(results.levelUp.created,true,"authoritative ccg:level-up must start the recorded Level Up clip");
  assert.ok(Math.abs(results.levelUp.currentTime-results.levelUp.expected)<0.001,"Level Up must seek to the recorded level-up cue");
  console.log("R106 recorded voice catalogue passed: "+results.rows.length+" aliases + authoritative Level Up event.");
}finally{
  await browser.close();
}
