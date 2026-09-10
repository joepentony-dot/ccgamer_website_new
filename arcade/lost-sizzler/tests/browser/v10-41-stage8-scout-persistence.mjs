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
assert.doesNotMatch(dialogueSource,/\bsetInterval\s*\(/,"Stage 8 persistence must not depend on a polling interval");
assert.doesNotMatch(dialogueSource,/\brequestAnimationFrame\s*\(/,"Stage 8 persistence must not add a frame owner");
assert.doesNotMatch(dialogueSource,/window\.(?:update|movePlayer|hurtPlayer)\s*=/,"Stage 8 persistence must not replace protected gameplay owners");

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
  await page.waitForFunction(()=>document.body.dataset.releaseReady==="true"&&Boolean(window.CCGLostSizzlerStage8NpcDialogue)&&Boolean(window.CCGLostSizzlerV141R43SoloSave)&&Boolean(window.CCGLostSizzlerModeRuntime)&&Boolean(document.getElementById("solo-btn")),null,{timeout:90000});

  await page.evaluate(()=>window.CCGLostSizzlerV141R43SoloSave.clearSoloSave());
  await page.click("#solo-btn");
  await page.waitForFunction(()=>document.body.dataset.runActive==="true"&&mode==="playing"&&window.CCGLostSizzlerModeRuntime?.detect?.()==="dungeon-solo"&&Boolean(host)&&Boolean(p1)&&typeof triggerRescue==="function",null,{timeout:20000});

  const beforeSave=await page.evaluate(()=>{
    const api=window.CCGLostSizzlerStage8NpcDialogue;
    const depth=(source,marker)=>{const seen=new Set();let current=source,count=0;while(typeof current==="function"&&!seen.has(current)){if(current[marker])count++;seen.add(current);current=current.__ccgOriginal}return count};
    host.rescue={id:"stage8-persist-scout",x:Number(p1.x)+1,y:Number(p1.y),rescued:false,following:false,found:false};
    triggerRescue(p1);
    return{
      rescue:{id:String(host.rescue?.id||""),following:Boolean(host.rescue?.following),found:Boolean(host.rescue?.found),rescued:Boolean(host.rescue?.rescued)},
      rescueDepth:depth(window.triggerRescue,"__ccgStage8NpcDialogue"),
      toastDepth:depth(window.showToast,"__ccgStage8ScoutToastBridge"),
      presentations:Number(api.state.presentations)||0,
      lastKey:String(api.state.last?.key||""),
      controller:window.CCGLostSizzlerModeRuntime.detect()
    };
  });
  assert.equal(beforeSave.rescue.following,true,"Scout must be following before Save & Quit persistence coverage begins");
  assert.equal(beforeSave.rescue.found,true,"Scout must be found before Save & Quit persistence coverage begins");
  assert.equal(beforeSave.rescue.rescued,false,"Scout must remain incomplete before Save & Quit");
  assert.equal(beforeSave.rescueDepth,1,"Stage 8 rescue ownership must have depth 1 before Save & Quit");
  assert.equal(beforeSave.toastDepth,1,"Stage 8 toast ownership must have depth 1 before Save & Quit");
  assert.equal(beforeSave.lastKey,"scout.trapped","first Scout contact must establish the trapped/found dialogue state before persistence");
  assert.equal(beforeSave.controller,"dungeon-solo","persistence coverage must begin in Solo Dungeon");

  await page.evaluate(()=>openPauseMenu());
  await page.waitForSelector("#pause:not(.hidden)");
  await page.click("#save-quit-solo-btn");
  await page.waitForFunction(()=>document.body.dataset.runActive==="false"&&mode==="menu"&&!document.getElementById("menu").classList.contains("hidden"),null,{timeout:10000});
  await page.waitForFunction(()=>!document.getElementById("continue-save-btn").classList.contains("hidden"),null,{timeout:10000});
  await page.click("#continue-save-btn");
  await page.waitForFunction(()=>document.body.dataset.runActive==="true"&&mode==="playing"&&window.CCGLostSizzlerModeRuntime?.detect?.()==="dungeon-solo"&&Boolean(host)&&Boolean(p1),null,{timeout:20000});
  await page.waitForTimeout(0);

  const afterContinue=await page.evaluate(()=>{
    const api=window.CCGLostSizzlerStage8NpcDialogue;
    const depth=(source,marker)=>{const seen=new Set();let current=source,count=0;while(typeof current==="function"&&!seen.has(current)){if(current[marker])count++;seen.add(current);current=current.__ccgOriginal}return count};
    return{
      rescue:host.rescue?{id:String(host.rescue.id||""),following:Boolean(host.rescue.following),found:Boolean(host.rescue.found),rescued:Boolean(host.rescue.rescued)}:null,
      rescueDepth:depth(window.triggerRescue,"__ccgStage8NpcDialogue"),
      toastDepth:depth(window.showToast,"__ccgStage8ScoutToastBridge"),
      assignmentGate:Boolean(api.state.assignmentGate),
      renderedObserver:Boolean(api.state.renderedObserver),
      controller:window.CCGLostSizzlerModeRuntime.detect(),
      mode:String(mode||"")
    };
  });
  assert.ok(afterContinue.rescue,"Scout authoritative rescue state must survive Save & Quit -> Continue");
  assert.equal(afterContinue.rescue.id,beforeSave.rescue.id,"Scout identity must survive Save & Quit -> Continue");
  assert.equal(afterContinue.rescue.following,true,"Scout following state must survive Save & Quit -> Continue");
  assert.equal(afterContinue.rescue.found,true,"Scout found state must survive Save & Quit -> Continue");
  assert.equal(afterContinue.rescue.rescued,false,"Save & Quit -> Continue must not complete the Scout rescue");
  assert.equal(afterContinue.rescueDepth,1,"Stage 8 rescue wrapper depth must remain exactly 1 after Continue");
  assert.equal(afterContinue.toastDepth,1,"Stage 8 toast wrapper depth must remain exactly 1 after Continue");
  assert.equal(afterContinue.controller,"dungeon-solo","Continue must restore the Solo Dungeon controller");
  assert.equal(afterContinue.mode,"playing","Continue must restore normal playing mode");

  const lifecycle=await page.evaluate(async()=>{
    const api=window.CCGLostSizzlerStage8NpcDialogue;
    const depth=(source,marker)=>{const seen=new Set();let current=source,count=0;while(typeof current==="function"&&!seen.has(current)){if(current[marker])count++;seen.add(current);current=current.__ccgOriginal}return count};
    for(let i=0;i<4;i++){
      document.body.dataset.modeController="dungeon-solo";
      document.body.dataset.runActive="true";
      await Promise.resolve();
      api.installWhenReady();
    }
    return{rescueDepth:depth(window.triggerRescue,"__ccgStage8NpcDialogue"),toastDepth:depth(window.showToast,"__ccgStage8ScoutToastBridge"),controller:window.CCGLostSizzlerModeRuntime.detect()};
  });
  assert.equal(lifecycle.rescueDepth,1,"repeated Solo lifecycle installation must not grow Stage 8 rescue wrapper depth");
  assert.equal(lifecycle.toastDepth,1,"repeated Solo lifecycle installation must not grow Stage 8 toast wrapper depth");
  assert.equal(lifecycle.controller,"dungeon-solo","lifecycle coverage must not disturb the Solo controller");

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
      if(p1.x!==before.x||p1.y!==before.y)return{moved:true,mode:String(mode),controller:window.CCGLostSizzlerModeRuntime.detect()};
    }
    return{moved:false,mode:String(mode),controller:window.CCGLostSizzlerModeRuntime.detect()};
  });
  assert.equal(movement.moved,true,"Solo movement must remain responsive after Scout Save & Quit -> Continue");
  assert.equal(movement.mode,"playing","Scout persistence coverage must not introduce a dialogue gameplay mode");
  assert.equal(movement.controller,"dungeon-solo","Scout persistence coverage must leave Solo ownership active");
  assert.deepEqual(errors,[],`Stage 8 Scout persistence regression must not raise page errors: ${errors.join("\n")}`);
  console.log("Stage 8 Scout Save & Quit -> Continue persistence regression passed");
}finally{
  await browser.close();
  for(const socket of sockets)socket.destroy();
  await new Promise(resolve=>server.close(resolve));
}
