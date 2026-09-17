import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {chromium} from "playwright";

const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,"../../../..");
const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".mjs":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json; charset=utf-8",".svg":"image/svg+xml",".png":"image/png",".webp":"image/webp",".mp3":"audio/mpeg",".ogg":"audio/ogg",".wav":"audio/wav"};
const sockets=new Set();
const server=http.createServer((req,res)=>{
  try{
    const url=new URL(req.url,"http://local"),pathname=decodeURIComponent(url.pathname),relative=pathname.endsWith("/")?`${pathname}index.html`:pathname,file=path.resolve(repo,`.${relative}`);
    if(!file.startsWith(`${repo}${path.sep}`)&&file!==repo){res.writeHead(403).end("forbidden");return}
    fs.readFile(file,(error,data)=>{if(error){res.writeHead(404,{connection:"close"}).end("not found");return}res.writeHead(200,{"content-type":mime[path.extname(file).toLowerCase()]||"application/octet-stream","cache-control":"no-store",connection:"close"});res.end(data)});
  }catch(error){res.writeHead(500,{connection:"close"}).end(String(error))}
});
server.on("connection",socket=>{sockets.add(socket);socket.on("close",()=>sockets.delete(socket))});
await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
const port=server.address().port;
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1000}});

try{
  await page.goto(`http://127.0.0.1:${port}/arcade/lost-sizzler/`,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.body.dataset.gameReady==="true"&&typeof beginRun==="function"&&typeof descendFloor==="function"&&window.CCGLostSizzlerV141R43SoloSave?.saveAndQuit&&window.CCGLostSizzlerV141R43SoloSave?.resumeSolo);

  await page.evaluate(()=>{
    try{localStorage.clear()}catch(_){}
    net.setSolo("Save Restore Test");
    beginRun({split:false});
  });
  await page.waitForFunction(()=>mode==="playing"&&p1&&run&&document.body.dataset.runActive==="true");

  await page.evaluate(()=>{
    p1.rpgStats={might:8,vitality:7,agility:6,endurance:9,luck:7,arcana:8};
    p1.inventory=[{kind:"potion",name:"Restoration Potion",short:"POTION",qty:2}];
    p1.relics=["threshold-compass"];
    p1.banishmentVessel=true;
    p1.banishmentEssence=3;
    p1.sigilReveal=true;
    score=43210;
    descendFloor();
  });

  await page.waitForFunction(()=>Number(run?.floor)===2&&mode==="playing"&&window.CCGLostSizzlerV141R43SoloSave?.readEnvelope()?.summary?.floor===2);
  const floorEntry=await page.evaluate(()=>({
    floor:run.floor,
    score,
    rpgStats:{...p1.rpgStats},
    inventory:p1.inventory.map(item=>({...item})),
    relics:[...p1.relics],
    banishmentVessel:p1.banishmentVessel,
    banishmentEssence:p1.banishmentEssence,
    sigilReveal:p1.sigilReveal
  }));

  const savedAndQuit=await page.evaluate(()=>window.CCGLostSizzlerV141R43SoloSave.saveAndQuit());
  assert.equal(savedAndQuit,true,"Supported Save & Quit must report a successful checkpoint write before leaving the run.");
  await page.waitForFunction(()=>mode==="menu"&&document.body.dataset.runActive==="false"&&!document.getElementById("continue-save-btn")?.classList.contains("hidden"));

  await page.reload({waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.body.dataset.gameReady==="true"&&!document.getElementById("continue-save-btn")?.classList.contains("hidden"));
  await page.click("#continue-save-btn");
  await page.waitForFunction(()=>mode==="playing"&&Number(run?.floor)===2&&document.body.dataset.runActive==="true");

  const restored=await page.evaluate(()=>({
    floor:run.floor,
    score,
    rpgStats:{...p1.rpgStats},
    inventory:p1.inventory.map(item=>({...item})),
    relics:[...p1.relics],
    banishmentVessel:p1.banishmentVessel,
    banishmentEssence:p1.banishmentEssence,
    sigilReveal:p1.sigilReveal,
    x:p1.x,y:p1.y,startX:world.start.x,startY:world.start.y
  }));
  assert.equal(restored.floor,floorEntry.floor,"Continue must restore the saved floor.");
  assert.equal(restored.score,floorEntry.score,"Continue must restore the saved score.");
  assert.deepEqual(restored.rpgStats,floorEntry.rpgStats,"Continue must restore RPG attributes.");
  assert.deepEqual(restored.inventory,floorEntry.inventory,"Continue must restore inventory.");
  assert.deepEqual(restored.relics,floorEntry.relics,"Continue must restore relics.");
  assert.equal(restored.banishmentVessel,floorEntry.banishmentVessel,"Continue must restore Banishment Vessel ownership.");
  assert.equal(restored.banishmentEssence,floorEntry.banishmentEssence,"Continue must restore Banishment Essence.");
  assert.equal(restored.sigilReveal,floorEntry.sigilReveal,"Continue must restore Sigil powers.");
  assert.equal(restored.x,restored.startX,"Checkpoint restore must restart at the floor entrance X coordinate.");
  assert.equal(restored.y,restored.startY,"Checkpoint restore must restart at the floor entrance Y coordinate.");

  const failedSaveResult=await page.evaluate(async()=>{
    const originalSetItem=Storage.prototype.setItem;
    window.__checkpointOriginalSetItem=originalSetItem;
    const key=window.CCGLostSizzlerV141R43SoloSave.PRIMARY_KEY;
    Storage.prototype.setItem=function(storageKey,value){
      if(String(storageKey)===String(key))throw new DOMException("simulated quota failure","QuotaExceededError");
      return originalSetItem.call(this,storageKey,value);
    };
    return window.CCGLostSizzlerV141R43SoloSave.saveAndQuit();
  });
  assert.equal(failedSaveResult,false,"Supported Save & Quit must report a failed checkpoint write instead of pretending the save succeeded.");
  await page.waitForTimeout(350);
  const failedSaveState=await page.evaluate(()=>({mode,runActive:document.body.dataset.runActive,menuHidden:document.getElementById("menu")?.classList.contains("hidden")}));
  assert.notEqual(failedSaveState.mode,"menu","A failed checkpoint write must not discard the active run and return to the menu.");
  assert.equal(failedSaveState.runActive,"true","A failed checkpoint write must keep the active run alive.");
  assert.equal(failedSaveState.menuHidden,true,"A failed checkpoint write must not expose the title menu as if saving succeeded.");

  console.log("Dungeon Carnage save/restore lifecycle regression passed");
} finally {
  try{await page.evaluate(()=>{if(window.__checkpointOriginalSetItem)Storage.prototype.setItem=window.__checkpointOriginalSetItem})}catch(_){}
  await browser.close();
  for(const socket of sockets)socket.destroy();
  await new Promise(resolve=>server.close(()=>resolve()));
}
