import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {chromium} from "playwright";

const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,"../../../..");
const dialoguePath=path.join(repo,"arcade/lost-sizzler/js/v10-41-stage8-npc-dialogue.js");
const dialogueSource=fs.readFileSync(dialoguePath,"utf8");
assert.doesNotMatch(dialogueSource,/\bsetInterval\s*\(/,"Stage 8 dialogue must not install a polling interval");
assert.doesNotMatch(dialogueSource,/\bsetTimeout\s*\(/,"Stage 8 dialogue must not add a recurring or delayed proximity scanner");
assert.doesNotMatch(dialogueSource,/\brequestAnimationFrame\s*\(/,"Stage 8 dialogue must not add a frame owner");
assert.doesNotMatch(dialogueSource,/window\.(?:update|movePlayer|hurtPlayer)\s*=/,"Stage 8 dialogue must not replace protected gameplay owners");
assert.doesNotMatch(dialogueSource,/mode\s*=\s*["']dialogue["']/,"Stage 8 dialogue must not add a dialogue gameplay mode");

const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".mjs":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json; charset=utf-8",".svg":"image/svg+xml",".webp":"image/webp",".png":"image/png",".ogg":"audio/ogg",".mp3":"audio/mpeg"};
const sockets=new Set();
const server=http.createServer((req,res)=>{
  try{
    const pathname=decodeURIComponent(new URL(req.url,"http://local").pathname),relative=pathname.endsWith("/")?`${pathname}index.html`:pathname,file=path.resolve(repo,`.${relative}`);
    if(!file.startsWith(`${repo}${path.sep}`)&&file!==repo){res.writeHead(403).end("forbidden");return}
    fs.readFile(file,(error,data)=>{if(error){res.writeHead(404,{connection:"close"}).end("not found");return}res.writeHead(200,{"content-type":mime[path.extname(file).toLowerCase()]||"application/octet-stream","cache-control":"no-store",connection:"close"});res.end(data)});
  }catch(error){res.writeHead(500,{connection:"close"}).end(String(error))}
});
server.on("connection",socket=>{sockets.add(socket);socket.on("close",()=>sockets.delete(socket))});
await new Promise((resolve,reject)=>{server.once("error",reject);server.listen(0,"127.0.0.1",resolve)});
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,args:["--disable-dev-shm-usage","--disable-background-networking","--autoplay-policy=no-user-gesture-required"]});

try{
  const context=await browser.newContext({viewport:{width:1600,height:900}}),page=await context.newPage();
  page.setDefaultTimeout(45000);
  const errors=[];page.on("pageerror",error=>errors.push(String(error?.stack||error)));
  await page.goto(`${origin}/arcade/lost-sizzler/`,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.body.dataset.releaseReady==="true"&&Boolean(window.CCGLostSizzlerStage8NpcDialogue)&&Boolean(window.CCGLostSizzlerModeRuntime)&&Boolean(document.getElementById("solo-btn")),null,{timeout:90000});
  await page.click("#solo-btn");
  await page.waitForFunction(()=>document.body.dataset.runActive==="true"&&typeof mode!=="undefined"&&mode==="playing"&&window.CCGLostSizzlerModeRuntime?.detect?.()==="dungeon-solo");
  await page.waitForFunction(()=>Boolean(host)&&Boolean(p1)&&typeof triggerRescue==="function"&&typeof movePlayer==="function",null,{timeout:15000});

  const first=await page.evaluate(()=>{
    const api=window.CCGLostSizzlerStage8NpcDialogue;
    const markerDepth=(source,marker)=>{
      const seen=new Set();let current=source,depth=0;
      while(typeof current==="function"&&!seen.has(current)){
        if(current[marker])depth++;
        seen.add(current);current=current.__ccgOriginal;
      }
      return depth;
    };
    const descriptor=Object.getOwnPropertyDescriptor(window,"triggerRescue");
    const assignmentGateSupported=Boolean(descriptor?.configurable&&!descriptor?.get&&!descriptor?.set);
    const ownerBeforeInjection=window.triggerRescue;
    const canonical=ownerBeforeInjection?.__ccgOriginal||ownerBeforeInjection;
    const lateCanonicalOwner=function stage8LateCanonicalRescueOwner(){return canonical.apply(this,arguments)};
    lateCanonicalOwner.__ccgOriginal=canonical;
    const reAdoptionsBefore=api.state.reAdoptions;
    window.triggerRescue=lateCanonicalOwner;
    const immediateReAdopted=Boolean(window.triggerRescue?.__ccgStage8NpcDialogue)&&window.triggerRescue!==lateCanonicalOwner&&api.state.reAdoptions===reAdoptionsBefore+1;
    host.rescue={id:"stage8-browser-scout",x:Number(p1.x)+1,y:Number(p1.y),rescued:false,following:false,found:false};
    const before=api.state.presentations;
    triggerRescue(p1);
    const eventReAdopted=Boolean(window.triggerRescue?.__ccgStage8NpcDialogue)&&window.triggerRescue!==lateCanonicalOwner;
    return{controller:window.CCGLostSizzlerModeRuntime.detect(),descriptorConfigurable:Boolean(descriptor?.configurable),descriptorAccessor:Boolean(descriptor?.get||descriptor?.set),assignmentGateSupported,assignmentGate:Boolean(api.state.assignmentGate),immediateReAdopted,eventReAdopted,installed:Boolean(triggerRescue.__ccgStage8NpcDialogue),rescueDialogueDepth:markerDepth(triggerRescue,"__ccgStage8NpcDialogue"),toastBridgeDepth:markerDepth(showToast,"__ccgStage8ScoutToastBridge"),following:Boolean(host.rescue.following),found:Boolean(host.rescue.found),rescued:Boolean(host.rescue.rescued),presented:api.state.presentations-before,last:{...api.state.last},toastTitle:document.getElementById("pickup-title")?.textContent||"",toastText:document.getElementById("pickup-text")?.textContent||"",voiceKey:api.lines.scout.trapped.voiceKey};
  });
  assert.equal(first.controller,"dungeon-solo","Scout dialogue regression must run under the Solo Dungeon controller");
  assert.equal(first.assignmentGate,first.assignmentGateSupported,"Stage 8 must use an assignment gate only when the canonical triggerRescue descriptor can legally support one");
  if(first.assignmentGateSupported)assert.equal(first.immediateReAdopted,true,"a writable configurable triggerRescue owner must be composed immediately without polling");
  assert.equal(first.eventReAdopted,true,"when a late canonical triggerRescue replacement survives assignment, the canonical Scout-found event must re-adopt Stage 8 without polling");
  assert.equal(first.installed,true,"Stage 8 must own the Scout rescue dialogue wrapper after the first canonical Scout interaction");
  assert.equal(first.rescueDialogueDepth,1,"Stage 8 must not self-nest its Scout rescue dialogue wrapper ancestry");
  assert.equal(first.toastBridgeDepth,1,"Stage 8 must not self-nest its Scout notification bridge ancestry");
  assert.equal(first.following,true,"first Scout contact must preserve the canonical following transition");
  assert.equal(first.found,true,"first Scout contact must preserve the canonical found state");
  assert.equal(first.rescued,false,"finding the Scout must not mark the rescue complete");
  assert.equal(first.presented,1,"first Scout contact must present exactly one Stage 8 dialogue line");
  assert.equal(first.last.key,"scout.trapped","first Scout contact must use the trapped/found dialogue state");
  assert.match(first.toastTitle,/CCG SCOUT/i,"Scout dialogue must use the existing notification surface");
  assert.match(first.toastText,/There you are/i,"the first Scout line must be visible through the existing non-blocking toast");
  assert.equal(first.voiceKey,"npc.scout.found","Scout text must carry a stable optional local-voice key for later expansion");

  const following=await page.evaluate(()=>{
    const api=window.CCGLostSizzlerStage8NpcDialogue,r=host.rescue;
    r.rescued=false;r.following=true;r.found=true;r.x=p1.x;r.y=p1.y;
    const before=api.state.presentations,shown=api.presentScout(p1,{force:true,stateKey:"following"});
    return{shown,presented:api.state.presentations-before,last:{...api.state.last},following:Boolean(r.following),rescued:Boolean(r.rescued)};
  });
  assert.equal(following.shown,true,"a nearby following Scout must be able to speak from the reusable dialogue surface");
  assert.equal(following.presented,1,"forced focused regression interaction must present one following line");
  assert.equal(following.last.key,"scout.following","following interaction must use the following dialogue state");
  assert.equal(following.following,true,"dialogue must not alter the canonical following state");
  assert.equal(following.rescued,false,"following dialogue must not complete the rescue");

  const rescued=await page.evaluate(()=>{
    const api=window.CCGLostSizzlerStage8NpcDialogue,r=host.rescue;
    r.x=p1.x;r.y=p1.y;r.rescued=true;r.following=false;r.found=true;
    const before=api.state.presentations;triggerRescue(p1);
    return{presented:api.state.presentations-before,last:{...api.state.last},following:Boolean(r.following),rescued:Boolean(r.rescued)};
  });
  assert.equal(rescued.presented,1,"a rescued Scout encountered nearby must acknowledge the safe state");
  assert.equal(rescued.last.key,"scout.rescued","post-rescue interaction must use the safe dialogue state");
  assert.equal(rescued.following,false,"post-rescue dialogue must not restart following");
  assert.equal(rescued.rescued,true,"post-rescue dialogue must preserve canonical completion state");

  const isolated=await page.evaluate(()=>{
    const api=window.CCGLostSizzlerStage8NpcDialogue,r=host.rescue,before=api.state.presentations,previous=document.body.dataset.specialMode;
    document.body.dataset.specialMode="horde-survivor";
    const shown=api.presentScout(p1,{force:true,stateKey:"rescued"});
    if(previous===undefined)delete document.body.dataset.specialMode;else document.body.dataset.specialMode=previous;
    return{shown,presented:api.state.presentations-before,controller:window.CCGLostSizzlerModeRuntime.detect()};
  });
  assert.equal(isolated.shown,false,"Solo NPC dialogue must no-op while a special-mode boundary is active");
  assert.equal(isolated.presented,0,"special-mode isolation must not emit a Scout line");
  assert.equal(isolated.controller,"dungeon-solo","the isolation probe must not mutate the actual mode controller");

  const movement=await page.evaluate(()=>{
    host.rescue=null;p1.hitStunMs=0;
    const dirs=[{x:1,y:0},{x:-1,y:0},{x:0,y:1},{x:0,y:-1}];
    for(const dir of dirs){
      const nx=p1.x+dir.x,ny=p1.y+dir.y;
      if(!W.walkable(world.map,nx,ny,host))continue;
      if(W.doorAt?.(host,nx,ny)||W.chestAt?.(host,nx,ny))continue;
      if((host.enemies||[]).some(enemy=>enemy?.alive&&enemy.x===nx&&enemy.y===ny))continue;
      if((host.shops||[]).some(shop=>shop?.active&&shop.x===nx&&shop.y===ny))continue;
      const before={x:p1.x,y:p1.y};movePlayer(p1,dir.x,dir.y);
      if(p1.x!==before.x||p1.y!==before.y)return{moved:true,before,after:{x:p1.x,y:p1.y},mode:String(mode),controller:window.CCGLostSizzlerModeRuntime.detect()};
    }
    return{moved:false,mode:String(mode),controller:window.CCGLostSizzlerModeRuntime.detect()};
  });
  assert.equal(movement.moved,true,"normal Solo movement must remain responsive immediately after dialogue interactions");
  assert.equal(movement.mode,"playing","dialogue must never replace the normal playing mode");
  assert.equal(movement.controller,"dungeon-solo","dialogue must not disturb the Solo controller");
  assert.deepEqual(errors,[],`Stage 8 Scout dialogue browser regression must not raise page errors: ${errors.join("\n")}`);
  console.log("Stage 8 Scout dialogue regression passed");
}finally{
  await browser.close();
  for(const socket of sockets)socket.destroy();
  await new Promise(resolve=>server.close(resolve));
}