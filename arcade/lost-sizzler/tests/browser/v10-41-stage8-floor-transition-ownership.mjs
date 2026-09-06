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
assert.doesNotMatch(dialogueSource,/\bsetInterval\s*\(/,"Stage 8 floor-transition qualification must not depend on a polling interval");
assert.doesNotMatch(dialogueSource,/\brequestAnimationFrame\s*\(/,"Stage 8 floor-transition qualification must not add a frame owner");
assert.doesNotMatch(dialogueSource,/window\.(?:update|movePlayer|hurtPlayer)\s*=/,"Stage 8 must not replace protected gameplay owners");

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

async function settleFloorEntry(page){
  await page.waitForTimeout(420);
  const dossier=await page.evaluate(()=>{
    const panel=document.getElementById("named-dossier-panel");
    const visible=Boolean(panel&&!panel.classList.contains("hidden"));
    if(mode!=="dossier"||!visible)return{dismissed:false};
    if(typeof hideNamedDossier!=="function")return{dismissed:false,missingHide:true};
    hideNamedDossier();return{dismissed:true};
  });
  assert.notEqual(dossier.missingHide,true,"visible floor-entry dossier must retain its canonical close path");
  await page.waitForFunction(()=>mode==="playing"&&document.body.dataset.runActive==="true"&&document.getElementById("save-panel")?.classList.contains("hidden")===true&&window.CCGLostSizzlerModeRuntime?.detect?.()==="dungeon-solo",null,{timeout:10000});
}

try{
  const context=await browser.newContext({viewport:{width:1600,height:900}}),page=await context.newPage();
  page.setDefaultTimeout(45000);
  const errors=[];page.on("pageerror",error=>errors.push(String(error?.stack||error)));
  await page.goto(`${origin}/arcade/lost-sizzler/`,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.body.dataset.releaseReady==="true"&&Boolean(window.CCGLostSizzlerStage8NpcDialogue)&&Boolean(window.CCGLostSizzlerV141R30)&&Boolean(window.CCGLostSizzlerV141R57DesktopPrepStability)&&Boolean(window.CCGLostSizzlerV141R59LiveRegressionFixes)&&Boolean(window.CCGLostSizzlerV141R60LivePlayIntegrity)&&Boolean(window.CCGLostSizzlerModeRuntime)&&Boolean(document.getElementById("solo-btn")),null,{timeout:90000});
  await page.click("#solo-btn");
  await page.waitForFunction(()=>document.body.dataset.runActive==="true"&&mode==="playing"&&playMode==="solo"&&window.CCGLostSizzlerModeRuntime?.detect?.()==="dungeon-solo"&&Boolean(host)&&Boolean(p1),null,{timeout:20000});
  await page.waitForTimeout(220);

  const snapshot=()=>page.evaluate(()=>{
    const depth=(source,marker)=>{const seen=new Set();let current=source,count=0;while(typeof current==="function"&&!seen.has(current)){if(current[marker])count++;seen.add(current);current=current.__ccgOriginal}return count};
    const r30=window.CCGLostSizzlerV141R30?.state||{},r57=window.CCGLostSizzlerV141R57DesktopPrepStability?.state||{},r59=window.CCGLostSizzlerV141R59LiveRegressionFixes?.state||{};
    return{
      floor:Number(run?.floor||0),mode:String(mode||""),controller:window.CCGLostSizzlerModeRuntime?.detect?.()||"",
      stage8:{rescueDepth:depth(window.triggerRescue,"__ccgStage8NpcDialogue"),toastDepth:depth(window.showToast,"__ccgStage8ScoutToastBridge")},
      r30:{goldenMoveSame:r30.goldenMove===window.movePlayer,repairs:Number(r30.ownershipRepairs||0)},
      r57:{r56Timer:Number(window.CCGLostSizzlerV141R56PlaytestCompletion?.state?.timer||0),bridges:Number(r57.r56Bridges||0),dirty:Boolean(r57.r56BridgeDirty)},
      r59:{loop:Boolean(window.loop?.__ccgV141R59PauseClock),stable:Boolean(window.CCGLostSizzlerV141R29?.stableLoop?.__ccgV141R59PauseClock),checkpoint:Boolean(window.captureFloorEntryCheckpoint?.__ccgV141R59SoloAutosave),reassertions:Number(r59.clockOwnerReassertions||0)},
      r60:{move:Boolean(window.movePlayer?.__ccgV141R60CadenceSeal),update:Boolean(window.update?.__ccgV141R60TimeSmoothing)}
    };
  });

  const before=await snapshot();
  assert.equal(before.floor,1,"Stage 8 transition qualification must start on floor 1");
  assert.equal(before.mode,"playing","Stage 8 transition qualification must begin in playing mode");
  assert.equal(before.controller,"dungeon-solo","Stage 8 transition qualification must begin under the Solo Dungeon controller");
  assert.equal(before.stage8.rescueDepth,1,"Stage 8 rescue wrapper depth must be exactly 1 before descending");
  assert.equal(before.stage8.toastDepth,1,"Stage 8 Scout toast bridge depth must be exactly 1 before descending");
  assert.equal(before.r30.goldenMoveSame,true,"R30 golden movement owner must match the live movement owner before descending");
  assert.equal(before.r57.r56Timer,0,"R57 must keep the retired R56 recurring timer at zero before descending");
  assert.equal(before.r59.loop,true,"R59 must own the authoritative Solo RAF loop before descending");
  assert.equal(before.r59.stable,true,"R59 must own the exported stable loop before descending");
  assert.equal(before.r59.checkpoint,true,"R59 must own the floor-entry checkpoint boundary before descending");
  assert.equal(before.r60.move,true,"R60 Solo cadence seal must remain composed on movement before descending");
  assert.equal(before.r60.update,true,"R60 time smoothing must remain composed on update before descending");

  await page.evaluate(()=>floorComplete("Stage 8 lifecycle regression"));
  await page.waitForFunction(()=>mode==="floorcomplete"&&!document.getElementById("floor-complete").classList.contains("hidden"));
  await page.evaluate(()=>descendFloor());
  await page.waitForFunction(()=>Number(run?.floor||0)===2&&Boolean(host)&&Boolean(p1),null,{timeout:10000});
  await settleFloorEntry(page);

  const after=await snapshot();
  assert.equal(after.floor,2,"canonical descent must advance the Solo run to floor 2");
  assert.equal(after.mode,"playing","canonical Floor 2 autosave handling must restore playing mode");
  assert.equal(after.controller,"dungeon-solo","floor descent must retain the Solo Dungeon controller");
  assert.equal(after.stage8.rescueDepth,1,"floor descent must not grow or lose the Stage 8 rescue wrapper");
  assert.equal(after.stage8.toastDepth,1,"floor descent must not grow or lose the Stage 8 Scout toast bridge");
  assert.equal(after.r30.goldenMoveSame,true,"R30 golden movement ownership must remain aligned after floor descent");
  assert.equal(after.r57.r56Timer,0,"floor descent must not resurrect the retired R56 recurring timer");
  assert.equal(after.r59.loop,true,"R59 must retain authoritative Solo RAF ownership after floor descent");
  assert.equal(after.r59.stable,true,"R59 must retain exported stable-loop ownership after floor descent");
  assert.equal(after.r59.checkpoint,true,"R59 must retain floor-entry checkpoint ownership after floor descent");
  assert.equal(after.r60.move,true,"R60 movement cadence composition must survive floor descent");
  assert.equal(after.r60.update,true,"R60 update smoothing composition must survive floor descent");

  const lifecycle=await page.evaluate(async()=>{
    const api=window.CCGLostSizzlerStage8NpcDialogue;
    const depth=(source,marker)=>{const seen=new Set();let current=source,count=0;while(typeof current==="function"&&!seen.has(current)){if(current[marker])count++;seen.add(current);current=current.__ccgOriginal}return count};
    for(let i=0;i<4;i++){document.body.dataset.modeController="dungeon-solo";document.body.dataset.runActive="true";await Promise.resolve();api.installWhenReady()}
    return{rescueDepth:depth(window.triggerRescue,"__ccgStage8NpcDialogue"),toastDepth:depth(window.showToast,"__ccgStage8ScoutToastBridge"),controller:window.CCGLostSizzlerModeRuntime.detect()};
  });
  assert.equal(lifecycle.rescueDepth,1,"repeated post-descent lifecycle installation must not grow Stage 8 rescue wrapper depth");
  assert.equal(lifecycle.toastDepth,1,"repeated post-descent lifecycle installation must not grow Stage 8 toast wrapper depth");
  assert.equal(lifecycle.controller,"dungeon-solo","post-descent lifecycle checks must not disturb the Solo controller");

  const movement=await page.evaluate(()=>{
    p1.hitStunMs=0;move1=0;input.clear();
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
  assert.equal(movement.moved,true,"Solo movement must remain responsive immediately after Stage 8 floor-transition qualification");
  assert.equal(movement.mode,"playing","Stage 8 floor-transition qualification must finish in normal playing mode");
  assert.equal(movement.controller,"dungeon-solo","Stage 8 floor-transition qualification must leave Solo ownership active");
  assert.deepEqual(errors,[],`Stage 8 floor-transition ownership regression must not raise page errors: ${errors.join("\n")}`);
  console.log(`Stage 8 floor-transition ownership qualification passed: ${JSON.stringify({before,after})}`);
}finally{
  await browser.close();
  for(const socket of sockets)socket.destroy();
  await new Promise(resolve=>server.close(resolve));
}
