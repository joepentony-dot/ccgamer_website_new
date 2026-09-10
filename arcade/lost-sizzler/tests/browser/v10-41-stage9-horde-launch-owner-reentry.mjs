import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {chromium} from "playwright";

const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,"../../../..");
const r60Source=fs.readFileSync(path.join(repo,"arcade/lost-sizzler/js/v10-41-r60-horde-combat-integrity.js"),"utf8");
const compositionSource=fs.readFileSync(path.join(repo,"arcade/lost-sizzler/js/v10-41-r60-horde-owner-composition.js"),"utf8");
assert.doesNotMatch(r60Source,/requestAnimationFrame\s*\(/,"Stage 9 must keep R60 Horde combat on the existing controller frame boundary");
assert.doesNotMatch(compositionSource,/requestAnimationFrame\s*\(/,"Stage 9 owner composition must not add a second RAF owner");
assert.doesNotMatch(compositionSource,/window\.update\s*=/,"Stage 9 owner composition must not replace the shared gameplay update owner");

const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".mjs":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json; charset=utf-8",".svg":"image/svg+xml",".webp":"image/webp",".png":"image/png",".ogg":"audio/ogg",".mp3":"audio/mpeg"};
const sockets=new Set();
const server=http.createServer((req,res)=>{
  try{
    const pathname=decodeURIComponent(new URL(req.url,"http://local").pathname);
    const relative=pathname.endsWith("/")?`${pathname}index.html`:pathname;
    const file=path.resolve(repo,`.${relative}`);
    if(!file.startsWith(`${repo}${path.sep}`)&&file!==repo){res.writeHead(403).end("forbidden");return}
    fs.readFile(file,(error,data)=>{
      if(error){res.writeHead(404,{connection:"close"}).end("not found");return}
      res.writeHead(200,{"content-type":mime[path.extname(file).toLowerCase()]||"application/octet-stream","cache-control":"no-store",connection:"close"});res.end(data);
    });
  }catch(error){res.writeHead(500,{connection:"close"}).end(String(error))}
});
server.on("connection",socket=>{sockets.add(socket);socket.on("close",()=>sockets.delete(socket))});
await new Promise((resolve,reject)=>{server.once("error",reject);server.listen(0,"127.0.0.1",resolve)});
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,args:["--disable-dev-shm-usage","--disable-background-networking","--autoplay-policy=no-user-gesture-required"]});

try{
  const context=await browser.newContext({viewport:{width:1600,height:900}});
  const page=await context.newPage();page.setDefaultTimeout(30000);
  const errors=[];page.on("pageerror",error=>errors.push(String(error?.stack||error)));
  await page.goto(`${origin}/arcade/lost-sizzler/`,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.body.dataset.releaseReady==="true"&&Boolean(window.CCGLostSizzlerModeRuntime)&&Boolean(window.CCGLostSizzlerSpecialModes)&&Boolean(window.CCGLostSizzlerV138?.updateHordeLive)&&Boolean(window.CCGLostSizzlerV141R60HordeCombatIntegrity?.state?.installed)&&Boolean(window.CCGLostSizzlerV141R60HordeOwnerComposition?.state?.stable));
  await page.waitForFunction(()=>Boolean(window.CCGLostSizzlerV141R60HordeOwnerComposition?.state?.retired)&&Number(window.CCGLostSizzlerV141R60HordeOwnerComposition?.state?.timer||0)===0);

  const qualification=await page.evaluate(()=>{
    const api=window.CCGLostSizzlerModeRuntime;
    const special=window.CCGLostSizzlerSpecialModes;
    const r60=window.CCGLostSizzlerV141R60HordeCombatIntegrity;
    const composition=window.CCGLostSizzlerV141R60HordeOwnerComposition;
    const liveApi=window.CCGLostSizzlerV138;
    const descriptor=Object.getOwnPropertyDescriptor(special,"active");
    const previousPlay=playMode;
    const previousSpecial=document.body.dataset.specialMode;
    const previousSolo=document.body.dataset.hordeSolo;
    const previousRunActive=document.body.dataset.runActive;
    const owner=r60.state.liveOwner;
    if(typeof owner!=="function")throw new Error("Stage 9 qualification requires the installed R60 Horde live owner");

    const chainOwnerCount=fn=>{
      const seen=new Set();let current=fn,count=0,depth=0;
      while(typeof current==="function"&&!seen.has(current)&&depth++<32){
        if(current===owner)count++;
        seen.add(current);current=typeof current.__ccgOriginal==="function"?current.__ccgOriginal:null
      }
      return count
    };
    const snapshot=label=>({
      label,
      activeId:api.snapshot().activeId,
      sameOwner:r60.state.liveOwner===owner,
      ownerCount:chainOwnerCount(liveApi.updateHordeLive),
      ownsLive:composition.chainContains(liveApi.updateHordeLive,owner),
      uiOwner:composition.chainHasMarker(liveApi.updateHordeLive,"__ccgV141UiPerformanceLive"),
      compositionStable:Boolean(composition.state.stable),
      compositionRetired:Boolean(composition.state.retired),
      compositionTimer:Number(composition.state.timer||0),
      liveOwnerInstalls:Number(r60.state.liveOwnerInstalls||0),
      liveOwnerReassertions:Number(r60.state.liveOwnerReassertions||0)
    });
    const enterHorde=cycle=>{
      playMode="solo";
      document.body.dataset.runActive="true";
      document.body.dataset.specialMode="horde-survivor";
      document.body.dataset.hordeSolo="true";
      Object.defineProperty(special,"active",{configurable:true,value:{type:"horde-survivor",authoritative:false,state:{wave:cycle+1,state:"wave",playerCount:1,players:[],spawned:0,activeEnemies:[]}}});
      api.sync(`Stage 9 Horde entry ${cycle}`);
      r60.install();composition.compose();
      return snapshot(`horde-${cycle}`)
    };
    const exitToDungeon=cycle=>{
      playMode="solo";
      document.body.dataset.runActive="true";
      delete document.body.dataset.specialMode;
      delete document.body.dataset.hordeSolo;
      Object.defineProperty(special,"active",{configurable:true,value:null});
      api.sync(`Stage 9 Dungeon return ${cycle}`);
      r60.install();composition.compose();
      return snapshot(`dungeon-${cycle}`)
    };

    const baseline=snapshot("baseline"),cycles=[];
    try{
      for(let cycle=1;cycle<=4;cycle++)cycles.push({horde:enterHorde(cycle),dungeon:exitToDungeon(cycle)});
      return{baseline,cycles,final:snapshot("final")};
    }finally{
      playMode=previousPlay;
      if(previousSpecial===undefined)delete document.body.dataset.specialMode;else document.body.dataset.specialMode=previousSpecial;
      if(previousSolo===undefined)delete document.body.dataset.hordeSolo;else document.body.dataset.hordeSolo=previousSolo;
      if(previousRunActive===undefined)delete document.body.dataset.runActive;else document.body.dataset.runActive=previousRunActive;
      if(descriptor)Object.defineProperty(special,"active",descriptor);else delete special.active;
      api.sync("Stage 9 qualification restore");
    }
  });

  assert.equal(qualification.baseline.ownerCount,1,"the qualified R60 live owner must occur exactly once in the live-update ancestry before re-entry testing");
  assert.equal(qualification.baseline.ownsLive,true,"the baseline Horde live-update ancestry must retain R60");
  assert.equal(qualification.baseline.uiOwner,true,"the baseline Horde live-update ancestry must retain the UI/performance owner");
  assert.equal(qualification.baseline.compositionStable,true,"the R60/UI live-owner composition must be stable before Horde reconstruction proceeds");
  assert.equal(qualification.baseline.compositionRetired,true,"the bounded owner-composition installer must retire after qualification");
  assert.equal(qualification.baseline.compositionTimer,0,"the retired owner-composition bridge must have no live timer");

  for(const [index,cycle] of qualification.cycles.entries()){
    assert.equal(cycle.horde.activeId,"horde-solo",`Horde re-entry ${index+1} must route to the Horde Solo controller`);
    assert.equal(cycle.dungeon.activeId,"dungeon-solo",`Horde exit ${index+1} must restore the Dungeon Solo controller`);
    for(const state of [cycle.horde,cycle.dungeon]){
      assert.equal(state.sameOwner,true,`${state.label} must preserve the installed R60 live-owner identity`);
      assert.equal(state.ownerCount,1,`${state.label} must contain exactly one R60 live owner in the ancestry`);
      assert.equal(state.ownsLive,true,`${state.label} must preserve R60 in the live-update ancestry`);
      assert.equal(state.uiOwner,true,`${state.label} must preserve the UI/performance owner in the live-update ancestry`);
      assert.equal(state.compositionStable,true,`${state.label} must keep owner composition stable`);
      assert.equal(state.compositionRetired,true,`${state.label} must not revive the retired composition installer`);
      assert.equal(state.compositionTimer,0,`${state.label} must not create a new composition polling timer`);
      assert.equal(state.liveOwnerInstalls,qualification.baseline.liveOwnerInstalls,`${state.label} must reuse the existing R60 live owner rather than installing another`);
      assert.equal(state.liveOwnerReassertions,qualification.baseline.liveOwnerReassertions,`${state.label} must not require a live-owner reassertion during normal mode re-entry`)
    }
  }
  assert.equal(qualification.final.ownerCount,1,"repeated Horde re-entry must finish with exactly one R60 live owner");
  assert.equal(qualification.final.liveOwnerInstalls,qualification.baseline.liveOwnerInstalls,"repeated Horde re-entry must not grow the R60 live-owner install count");
  assert.equal(qualification.final.liveOwnerReassertions,qualification.baseline.liveOwnerReassertions,"repeated Horde re-entry must not grow the R60 live-owner reassertion count");
  assert.deepEqual(errors,[],`Stage 9 Horde launch/ownership/re-entry qualification must have no uncaught browser errors: ${errors.join("\n")}`);

  console.log("Lost Sizzler Stage 9 Horde launch, live-owner ancestry and repeated re-entry qualification passed in Chromium.");
  await context.close();
}finally{
  await browser.close();for(const socket of sockets)socket.destroy();await new Promise(resolve=>server.close(()=>resolve()));
}
