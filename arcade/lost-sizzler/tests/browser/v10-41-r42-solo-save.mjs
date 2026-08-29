import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {chromium} from "playwright";

const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,"../../../..");
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
  const context=await browser.newContext({viewport:{width:1600,height:900}}),page=await context.newPage();page.setDefaultTimeout(60000);
  const errors=[];page.on("pageerror",error=>errors.push(String(error?.stack||error)));
  await page.goto(`${origin}/arcade/lost-sizzler/`,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.body.dataset.releaseReady==="true"&&Boolean(window.CCGLostSizzlerV141R42SoloSave)&&Boolean(document.getElementById("solo-btn")),null,{timeout:90000});

  await page.evaluate(()=>window.CCGLostSizzlerV141R42SoloSave.clear("browser_fixture"));
  await page.click("#solo-btn");
  await page.waitForFunction(()=>document.body.dataset.runActive==="true"&&typeof mode!=="undefined"&&mode==="playing"&&typeof playMode!=="undefined"&&playMode==="solo"&&Boolean(p1));
  await page.waitForFunction(()=>Boolean(window.CCGLostSizzlerV141R42SoloSave.read()),null,{timeout:15000});

  const initial=await page.evaluate(()=>{
    const api=window.CCGLostSizzlerV141R42SoloSave,data=api.read(),button=document.getElementById("continue-save-btn"),note=document.getElementById("solo-save-menu-note");
    return{schema:data?.schema,version:data?.version,floor:data?.floor,score:data?.score,playMode:data?.playMode,daily:data?.run?.daily,player2:data?.player2,buttonHidden:button?.classList.contains("hidden"),buttonText:button?.textContent||"",noteText:note?.textContent||"",captures:api.state.captures};
  });
  assert.equal(initial.schema,"ccg-lost-sizzler-solo-save","Floor 1 autosave must use the r42 schema");
  assert.equal(initial.version,1,"Floor 1 autosave must use schema version 1");
  assert.equal(initial.floor,1,"a new Solo run must be resumable from Floor 1");
  assert.equal(initial.score,0,"new Solo checkpoint must begin with the floor-entry score");
  assert.equal(initial.playMode,"solo","checkpoint must be marked as Solo only");
  assert.equal(initial.daily,false,"ordinary Solo checkpoint must never masquerade as Weekly Vault");
  assert.equal(initial.player2,null,"ordinary Solo checkpoint must not contain Split Screen player state");
  assert.equal(initial.buttonHidden,false,"Continue Saved Run must become available immediately after the Floor 1 autosave");
  assert.match(initial.buttonText,/Continue Saved Run — Floor 1/,"Continue button must identify the saved floor");
  assert.match(initial.noteText,/resumes at the Floor 1 entrance/i,"menu must explain where the save resumes");
  assert.ok(initial.captures>=1,"new Solo run must record an autosave capture");

  await page.evaluate(()=>{score=777;p1.health=1;pause()});
  await page.waitForSelector("#pause:not(.hidden)");
  const pauseUi=await page.evaluate(()=>({hidden:document.getElementById("solo-save-quit-btn")?.classList.contains("hidden"),disabled:document.getElementById("solo-save-quit-btn")?.disabled,note:document.getElementById("solo-save-pause-note")?.textContent||""}));
  assert.equal(pauseUi.hidden,false,"Save & Quit must be visible for a paused ordinary Solo run");
  assert.equal(pauseUi.disabled,false,"Save & Quit must be enabled for a paused ordinary Solo run");
  assert.match(pauseUi.note,/Progress made since entering this floor is not included/i,"pause UI must disclose floor-entry checkpoint semantics");

  await page.click("#solo-save-quit-btn");
  await page.waitForFunction(()=>document.body.dataset.runActive==="false"&&typeof mode!=="undefined"&&mode==="menu"&&!document.getElementById("menu")?.classList.contains("hidden"),null,{timeout:15000});
  const afterQuit=await page.evaluate(()=>window.CCGLostSizzlerV141R42SoloSave.read());
  assert.equal(afterQuit.floor,1,"Save & Quit must retain the current floor entrance");
  assert.equal(afterQuit.score,0,"Save & Quit must not serialise mid-floor score gains into a replayable floor checkpoint");
  assert.equal(afterQuit.player.health,initial?.playerHealth??afterQuit.player.health,"save must remain based on the entry snapshot rather than the mutated live player");

  await page.click("#continue-save-btn");
  await page.waitForFunction(()=>document.body.dataset.runActive==="true"&&typeof mode!=="undefined"&&mode==="playing"&&typeof playMode!=="undefined"&&playMode==="solo"&&Boolean(p1),null,{timeout:15000});
  const resumed=await page.evaluate(()=>({floor:run?.floor,score:Number(score),playMode,p2:Boolean(p2),daily:Boolean(run?.daily),resumes:window.CCGLostSizzlerV141R42SoloSave.state.resumes,stored:window.CCGLostSizzlerV141R42SoloSave.read()}));
  assert.equal(resumed.floor,1,"Continue Saved Run must restore the saved floor");
  assert.equal(resumed.score,0,"Continue Saved Run must restore the floor-entry score");
  assert.equal(resumed.playMode,"solo","Continue Saved Run must restore Solo mode only");
  assert.equal(resumed.p2,false,"Continue Saved Run must never create a Split Screen player");
  assert.equal(resumed.daily,false,"Continue Saved Run must not enter Weekly Vault");
  assert.ok(resumed.resumes>=1,"resume telemetry state must confirm the r42 handler owned the restore");
  assert.equal(resumed.stored.floor,1,"resuming must retain the checkpoint until the run actually ends");

  const isolation=await page.evaluate(()=>{
    const api=window.CCGLostSizzlerV141R42SoloSave,originalPlayMode=playMode,originalP2=p2,originalDaily=run.daily;
    playMode="split";p2={id:"fixture-p2"};const splitCapture=api.capture("isolation",false);
    playMode="solo";p2=null;run.daily=true;const weeklyCapture=api.capture("isolation",false);
    run.daily=originalDaily;playMode=originalPlayMode;p2=originalP2;
    return{splitCapture:Boolean(splitCapture),weeklyCapture:Boolean(weeklyCapture),storedFloor:api.read()?.floor};
  });
  assert.equal(isolation.splitCapture,false,"r42 must refuse Split Screen save capture");
  assert.equal(isolation.weeklyCapture,false,"r42 must refuse Weekly Vault save capture");
  assert.equal(isolation.storedFloor,1,"refused non-Solo captures must leave the valid Solo checkpoint untouched");

  assert.deepEqual(errors,[],`Solo save browser regression emitted page errors:\n${errors.join("\n")}`);
  console.log("V10.41 r42 Solo save/continue browser regression passed.");
}finally{
  await browser.close().catch(()=>{});
  for(const socket of sockets)socket.destroy();
  await new Promise(resolve=>server.close(resolve));
}
