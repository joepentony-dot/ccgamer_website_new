import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {chromium} from "playwright";

const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,"../../../..");
const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".mjs":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json",".svg":"image/svg+xml",".webp":"image/webp",".png":"image/png",".ogg":"audio/ogg",".mp3":"audio/mpeg"};
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
  const context=await browser.newContext({viewport:{width:1600,height:900}}),page=await context.newPage();page.setDefaultTimeout(45000);
  const errors=[];page.on("pageerror",error=>errors.push(String(error?.stack||error)));
  await page.goto(`${origin}/arcade/lost-sizzler/`,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.body.dataset.releaseReady==="true"&&Boolean(window.CCGLostSizzlerV141R43SoloSave)&&Boolean(document.getElementById("solo-btn")),null,{timeout:90000});

  const clean=await page.evaluate(()=>{const api=window.CCGLostSizzlerV141R43SoloSave;api.clearSoloSave();return{primary:localStorage.getItem(api.PRIMARY_KEY),backup:localStorage.getItem(api.BACKUP_KEY)}});
  assert.equal(clean.primary,null,"browser regression must start without a current Solo save");
  assert.equal(clean.backup,null,"browser regression must start without a Solo backup save");

  await page.click("#solo-btn");
  await page.waitForFunction(()=>document.body.dataset.runActive==="true"&&mode==="playing"&&Boolean(run)&&Boolean(p1)&&Boolean(world)&&Boolean(host),null,{timeout:20000});
  await page.waitForFunction(()=>window.CCGLostSizzlerV141R43SoloSave?.readEnvelope?.()?.summary?.floor===1,null,{timeout:10000});

  const floor1=await page.evaluate(()=>{
    const api=window.CCGLostSizzlerV141R43SoloSave,envelope=api.readEnvelope();
    const cp=envelope.checkpoint;
    return{schema:envelope.schema,version:envelope.schemaVersion,reason:envelope.reason,floor:envelope.summary.floor,seed:cp.run.seed,score:cp.score,health:cp.player.health,mana:cp.player.mana,x:cp.player.x,y:cp.player.y,autosaves:api.state.autosaves,pauseButton:Boolean(document.getElementById("save-quit-solo-btn"))}
  });
  assert.equal(floor1.schema,"ccg-lost-sizzler-solo-save","Floor 1 autosave must use the r43 schema");
  assert.equal(floor1.version,2,"Floor 1 autosave must use schema version 2");
  assert.equal(floor1.reason,"autosave","new Solo run must create an automatic Floor 1 save");
  assert.equal(floor1.floor,1,"new Solo run must be resumable from Floor 1");
  assert.ok(floor1.autosaves>=1,"Floor 1 automatic save must be recorded");
  assert.equal(floor1.pauseButton,true,"Solo pause menu must own a Save & Quit control");

  // Change live state after the entry autosave. Save & Quit must preserve the
  // floor-entry snapshot, not capture these mid-room mutations.
  await page.evaluate(()=>{score=98765;p1.health=1;p1.mana=0;p1.x+=1;p1.y+=1;openPauseMenu()});
  await page.waitForSelector("#pause:not(.hidden)");
  await page.click("#save-quit-solo-btn");
  await page.waitForFunction(()=>document.body.dataset.runActive==="false"&&mode==="menu"&&!document.getElementById("menu").classList.contains("hidden"),null,{timeout:10000});
  await page.waitForFunction(()=>!document.getElementById("continue-save-btn").classList.contains("hidden")&&/Floor 1/.test(document.getElementById("continue-save-btn").textContent||""),null,{timeout:10000});

  const savedQuit=await page.evaluate(()=>{const api=window.CCGLostSizzlerV141R43SoloSave,e=api.readEnvelope();return{reason:e.reason,floor:e.summary.floor,score:e.checkpoint.score,health:e.checkpoint.player.health,mana:e.checkpoint.player.mana,x:e.checkpoint.player.x,y:e.checkpoint.player.y,button:document.getElementById("continue-save-btn")?.textContent||"",summary:document.getElementById("solo-save-summary")?.textContent||"",saveQuits:api.state.saveQuits}});
  assert.equal(savedQuit.reason,"save_quit","pause action must mark the save as Save & Quit");
  assert.equal(savedQuit.floor,1,"Save & Quit must retain the Floor 1 entry");
  assert.equal(savedQuit.score,floor1.score,"Save & Quit must not preserve mid-room score mutation");
  assert.equal(savedQuit.health,floor1.health,"Save & Quit must not preserve mid-room health mutation");
  assert.equal(savedQuit.mana,floor1.mana,"Save & Quit must not preserve mid-room ammunition mutation");
  assert.equal(savedQuit.x,floor1.x,"Save & Quit must retain entry X position");
  assert.equal(savedQuit.y,floor1.y,"Save & Quit must retain entry Y position");
  assert.match(savedQuit.button,/Continue Solo — Floor 1/,"menu must expose a Floor 1 Continue action");
  assert.match(savedQuit.summary,/Saved run: Floor 1/,"menu must expose saved-run metadata");
  assert.ok(savedQuit.saveQuits>=1,"Save & Quit diagnostic must advance");

  await page.click("#continue-save-btn");
  await page.waitForFunction(()=>document.body.dataset.runActive==="true"&&mode==="playing"&&run?.floor===1&&Boolean(world)&&Boolean(host)&&Boolean(p1),null,{timeout:20000});
  const resumed=await page.evaluate(()=>({seed:run.seed,score,health:p1.health,mana:p1.mana,x:p1.x,y:p1.y,resumes:window.CCGLostSizzlerV141R43SoloSave.state.resumes,player2:Boolean(p2),playMode}));
  assert.equal(resumed.seed,floor1.seed,"Continue must restore the original run seed");
  assert.equal(resumed.score,floor1.score,"Continue must restore floor-entry score");
  assert.equal(resumed.health,floor1.health,"Continue must restore floor-entry health");
  assert.equal(resumed.mana,floor1.mana,"Continue must restore floor-entry ammunition");
  assert.equal(resumed.x,floor1.x,"Continue must restore entry X position");
  assert.equal(resumed.y,floor1.y,"Continue must restore entry Y position");
  assert.equal(resumed.player2,false,"r43 Continue must remain one-player Solo");
  assert.equal(resumed.playMode,"solo","r43 Continue must restore Solo ownership");
  assert.ok(resumed.resumes>=1,"Continue diagnostic must advance");

  // Real Floor 1 -> Floor 2 descent must autosave immediately and suppress the
  // old voluntary entry checkpoint panel. The previous Floor 1 save becomes a
  // valid backup before Floor 2 replaces the primary slot.
  await page.evaluate(()=>floorComplete("R43 SAVE REGRESSION"));
  await page.waitForSelector("#floor-complete:not(.hidden)");
  await page.click("#descend-btn");
  await page.waitForFunction(()=>run?.floor===2&&mode==="playing"&&window.CCGLostSizzlerV141R43SoloSave?.readEnvelope?.()?.summary?.floor===2,null,{timeout:15000});
  await page.waitForTimeout(350);
  const floor2=await page.evaluate(()=>{
    const api=window.CCGLostSizzlerV141R43SoloSave,e=api.readEnvelope();
    let backup=null;try{backup=JSON.parse(localStorage.getItem(api.BACKUP_KEY)||"null")}catch(_){}
    return{floor:e.summary.floor,reason:e.reason,panelHidden:document.getElementById("save-panel")?.classList.contains("hidden")===true,mode,backupFloor:backup?.summary?.floor||0,backupValid:Boolean(api.validateEnvelope(backup)),autosaves:api.state.autosaves}
  });
  assert.equal(floor2.floor,2,"real descent must replace the current save with Floor 2 entry");
  assert.equal(floor2.reason,"autosave","Floor 2 entry must be automatic");
  assert.equal(floor2.panelHidden,true,"automatic Solo save must retire the old voluntary floor-entry prompt");
  assert.equal(floor2.mode,"playing","automatic floor save must not interrupt gameplay mode");
  assert.equal(floor2.backupFloor,1,"previous Floor 1 save must be retained as backup");
  assert.equal(floor2.backupValid,true,"backup slot must pass envelope validation");
  assert.ok(floor2.autosaves>=2,"Floor 1 and Floor 2 autosaves must both be recorded");

  // Weekly, Split and online ownership must reject capture attempts without
  // changing the current saved floor.
  const isolation=await page.evaluate(()=>{
    const api=window.CCGLostSizzlerV141R43SoloSave,before=api.readEnvelope()?.summary?.floor;
    const dailyBefore=run.daily;run.daily=true;const weeklyRejected=api.captureEntry("test")===null;run.daily=dailyBefore;
    const p2Before=p2;p2={...p1,id:"test-p2"};const splitRejected=api.captureEntry("test")===null;p2=p2Before;
    const playBefore=playMode;playMode="online";const onlineRejected=api.captureEntry("test")===null;playMode=playBefore;
    return{weeklyRejected,splitRejected,onlineRejected,before,after:api.readEnvelope()?.summary?.floor}
  });
  assert.equal(isolation.weeklyRejected,true,"Weekly Vault must never be captured by r43");
  assert.equal(isolation.splitRejected,true,"Split Screen must never be captured by r43");
  assert.equal(isolation.onlineRejected,true,"online modes must never be captured by r43");
  assert.equal(isolation.after,isolation.before,"rejected modes must not alter the Solo save");

  // Deliberately corrupt the primary slot. readEnvelope must reject it, restore
  // a valid backup and leave a valid primary behind for the next page load.
  const recovery=await page.evaluate(()=>{
    const api=window.CCGLostSizzlerV141R43SoloSave,good=localStorage.getItem(api.PRIMARY_KEY);
    localStorage.setItem(api.BACKUP_KEY,good);localStorage.setItem(api.PRIMARY_KEY,"{broken-json");
    const before=api.state.backupRecoveries,recovered=api.readEnvelope(),afterText=localStorage.getItem(api.PRIMARY_KEY);let after=null;try{after=JSON.parse(afterText||"null")}catch(_){}
    return{floor:recovered?.summary?.floor||0,delta:api.state.backupRecoveries-before,primaryValid:Boolean(api.validateEnvelope(after))}
  });
  assert.equal(recovery.floor,2,"corrupt primary must recover the valid saved floor from backup");
  assert.ok(recovery.delta>=1,"backup recovery diagnostic must advance");
  assert.equal(recovery.primaryValid,true,"backup recovery must repair the primary slot");

  await page.waitForTimeout(250);
  assert.deepEqual(errors,[],`r43 Solo save/continue regression must not produce page errors: ${errors.join("\n")}`);
  console.log("V10.41 r43 Floor 1 save/quit, Continue, Floor 2 autosave and backup recovery browser regression passed.");
}finally{
  await browser.close();
  for(const socket of sockets)socket.destroy();
  await new Promise(resolve=>server.close(resolve));
}
