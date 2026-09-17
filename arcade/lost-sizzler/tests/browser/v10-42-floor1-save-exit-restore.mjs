import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {chromium} from "playwright";

const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,"../../../..");
const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".mjs":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json; charset=utf-8",".svg":"image/svg+xml",".png":"image/png",".webp":"image/webp",".wav":"audio/wav",".mp3":"audio/mpeg",".ogg":"audio/ogg"};
const sockets=new Set();
const server=http.createServer((req,res)=>{
  try{
    const url=new URL(req.url,"http://local"),pathname=decodeURIComponent(url.pathname),relative=pathname.endsWith("/")?`${pathname}index.html`:pathname,file=path.resolve(repo,`.${relative}`);
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
  const errors=[],failedScripts=[];
  page.on("pageerror",error=>errors.push(String(error?.stack||error)));
  page.on("requestfailed",request=>{try{const url=new URL(request.url());if(url.origin===origin&&/\.js(?:\?|$)/i.test(url.pathname))failedScripts.push(`${url.pathname}: ${request.failure()?.errorText||"failed"}`)}catch(_){}});

  await page.goto(`${origin}/arcade/lost-sizzler/?floor1-save-exit-restore=1`,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.body.dataset.releaseReady==="true"&&Boolean(window.CCGProgression)&&Boolean(window.CCGDungeonSaveRestoreContract)&&Boolean(document.getElementById("solo-btn")),null,{timeout:90000});
  await page.evaluate(()=>window.CCGProgression.clearCheckpoint());
  await page.click("#solo-btn");
  await page.waitForFunction(()=>document.body.dataset.runActive==="true"&&mode==="playing"&&playMode==="solo"&&run?.floor===1&&Boolean(p1)&&Boolean(world),null,{timeout:20000});

  const entry=await page.evaluate(()=>({
    floor:floorEntryCheckpoint?.run?.floor||floorEntryCheckpoint?.floor||0,
    seed:floorEntryCheckpoint?.run?.seed,
    score:floorEntryCheckpoint?.score,
    health:floorEntryCheckpoint?.player?.health,
    mana:floorEntryCheckpoint?.player?.mana,
    x:floorEntryCheckpoint?.player?.x,
    y:floorEntryCheckpoint?.player?.y,
    persisted:Boolean(window.CCGProgression.loadCheckpoint())
  }));
  assert.equal(entry.floor,1,"a genuine Solo Floor 1 start must own a floor-entry checkpoint snapshot");
  assert.equal(entry.persisted,false,"starting Floor 1 must not silently change the current voluntary checkpoint design into autosave");

  const prompt=await page.evaluate(()=>{
    score=98765;p1.health=1;p1.mana=0;p1.x+=1;p1.y+=1;run.consecutiveDeaths=5;
    const offered=offerFloorSave(true);
    return{offered,mode,title:UI.saveTitle?.textContent||"",returnHidden:UI.saveReturn?.classList.contains("hidden")!==false};
  });
  assert.equal(prompt.offered,true,"the supported five-death Save & Return flow must be available on Floor 1");
  assert.equal(prompt.mode,"saveprompt","Floor 1 Save & Return must enter the save prompt owner");
  assert.match(prompt.title,/FIVE DEATHS/i,"Floor 1 must expose the existing five-death save wording rather than a new save mode");
  assert.equal(prompt.returnHidden,false,"Floor 1 must expose the existing Save & Return to Menu control");

  await page.click("#save-return-btn");
  await page.waitForFunction(()=>mode==="menu"&&document.body.dataset.runActive==="false"&&!document.getElementById("menu").classList.contains("hidden"),null,{timeout:10000});
  await page.waitForFunction(()=>!document.getElementById("continue-save-btn").classList.contains("hidden")&&/Floor 1/.test(document.getElementById("continue-save-btn").textContent||""),null,{timeout:10000});

  const saved=await page.evaluate(()=>{
    const checkpoint=window.CCGProgression.loadCheckpoint();
    return{
      floor:checkpoint?.run?.floor||checkpoint?.floor||0,
      seed:checkpoint?.run?.seed,
      score:checkpoint?.score,
      health:checkpoint?.player?.health,
      mana:checkpoint?.player?.mana,
      x:checkpoint?.player?.x,
      y:checkpoint?.player?.y,
      label:document.getElementById("continue-save-btn")?.textContent||""
    };
  });
  assert.equal(saved.floor,1,"Save & Return must persist a Floor 1 checkpoint");
  assert.equal(saved.seed,entry.seed,"Floor 1 save must retain the original run seed");
  assert.equal(saved.score,entry.score,"Save & Return must persist the entrance score, not mutated mid-room score");
  assert.equal(saved.health,entry.health,"Save & Return must persist entrance health, not mutated mid-room health");
  assert.equal(saved.mana,entry.mana,"Save & Return must persist entrance ammunition, not mutated mid-room ammunition");
  assert.equal(saved.x,entry.x,"Save & Return must persist the Floor 1 entrance X position");
  assert.equal(saved.y,entry.y,"Save & Return must persist the Floor 1 entrance Y position");
  assert.match(saved.label,/Resume Floor 1/i,"the title screen must expose the saved Floor 1 run");

  await page.click("#continue-save-btn");
  await page.waitForFunction(()=>document.body.dataset.runActive==="true"&&mode==="playing"&&playMode==="solo"&&run?.floor===1&&Boolean(p1)&&Boolean(world),null,{timeout:20000});
  const resumed=await page.evaluate(()=>({seed:run.seed,score,health:p1.health,mana:p1.mana,x:p1.x,y:p1.y,floor:run.floor,player2:Boolean(p2)}));
  assert.equal(resumed.floor,1,"Resume Saved Run must accept a valid Floor 1 checkpoint");
  assert.equal(resumed.seed,entry.seed,"Floor 1 restore must recover the original run seed");
  assert.equal(resumed.score,entry.score,"Floor 1 restore must recover entrance score");
  assert.equal(resumed.health,entry.health,"Floor 1 restore must recover entrance health");
  assert.equal(resumed.mana,entry.mana,"Floor 1 restore must recover entrance ammunition");
  assert.equal(resumed.x,entry.x,"Floor 1 restore must recover entrance X position");
  assert.equal(resumed.y,entry.y,"Floor 1 restore must recover entrance Y position");
  assert.equal(resumed.player2,false,"the Solo Floor 1 checkpoint must remain Solo after restore");

  assert.deepEqual(errors,[],`Floor 1 Save & Exit regression must not raise page errors: ${errors.join("\n")}`);
  assert.deepEqual(failedScripts,[],`Floor 1 Save & Exit regression must not lose same-origin scripts: ${failedScripts.join("\n")}`);
  await page.evaluate(()=>window.CCGProgression.clearCheckpoint());
  console.log("V10.42 Floor 1 Save & Return / restore regression passed.");
  await context.close();
}finally{
  await browser.close();
  for(const socket of sockets)socket.destroy();
  await new Promise(resolve=>server.close(()=>resolve()));
}
