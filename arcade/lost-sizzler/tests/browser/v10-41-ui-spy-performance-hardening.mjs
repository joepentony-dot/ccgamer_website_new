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
  const context=await browser.newContext({viewport:{width:1600,height:900}}),page=await context.newPage();page.setDefaultTimeout(45000);
  const errors=[];page.on("pageerror",error=>errors.push(String(error?.stack||error)));
  await page.goto(`${origin}/arcade/lost-sizzler/`,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.body.dataset.releaseReady==="true"&&Boolean(window.CCGLostSizzlerV141UiSpyPerformance)&&Boolean(document.getElementById("horde-solo-btn")));

  await page.click("#horde-solo-btn");
  await page.waitForFunction(()=>document.body.dataset.specialMode==="horde-survivor"&&document.body.dataset.hordeSolo==="true"&&Boolean(window.CCGLostSizzlerSpecialModes?.active?.state));
  await page.waitForFunction(()=>document.getElementById("horde-live-roster")?.parentElement?.classList?.contains("player-hub"));

  const hordeUi=await page.evaluate(()=>{
    const roster=document.getElementById("horde-live-roster"),api=window.CCGLostSizzlerV141UiSpyPerformance;
    return{parent:roster?.parentElement?.className||"",position:roster?getComputedStyle(roster).position:"",top:roster?getComputedStyle(roster).top:"",focusWrapped:Boolean(window.CCGLostSizzlerV137?.updateHordeFocus?.__ccgV141UiPerformanceFocus),liveWrapped:Boolean(window.CCGLostSizzlerV138?.updateHordeLive?.__ccgV141UiPerformanceLive),moves:api?.state?.hordeRosterMoves||0};
  });
  assert.match(hordeUi.parent,/player-hub/,"Horde Players must live below the game canvas in the player hub");
  assert.equal(hordeUi.position,"static","Horde Players must not remain an absolute overlay over gameplay");
  assert.equal(hordeUi.focusWrapped,true,"Horde focus maintenance must use the throttled hardening owner");
  assert.equal(hordeUi.liveWrapped,true,"Horde live maintenance must use the throttled hardening owner");

  const healed=await page.evaluate(()=>{
    const api=window.CCGLostSizzlerV141UiSpyPerformance,active=window.CCGLostSizzlerSpecialModes.active,runState=active.state,model=runState.players?.find(row=>String(row.id)===String(p1.id))||runState.players?.[0];
    host.enemies=[];runState.state="briefing";runState.startedAt=Date.now();model.status="active";model.maxHp=10;model.hp=4;model.invulnerableUntil=Date.now()+10000;p1.maxHealth=10;p1.health=4;
    runState.health.active=[{id:"v141-browser-health",x:Number(p1.x),y:Number(p1.y),restore:3,spawnedAt:Date.now(),_v137Randomised:true}];
    const collected=api.repairHordeHealth(runState,Date.now());
    return{collected,modelHp:Number(model.hp),physicalHp:Number(p1.health),remaining:runState.health.active.length,collections:api.state.hordeHealthCollections};
  });
  assert.equal(healed.collected,true,"standing on a Horde health pickup must collect it");
  assert.equal(healed.modelHp,7,"Horde health pickup must restore the authoritative rules-model HP");
  assert.equal(healed.physicalHp,7,"Horde health pickup must immediately restore visible player HP");
  assert.equal(healed.remaining,0,"collected Horde health pickup must leave the active pickup list");
  assert.ok(healed.collections>=1,"Horde health reconciliation must record the collection");
  await page.waitForTimeout(180);
  const healedStable=await page.evaluate(()=>{const runState=window.CCGLostSizzlerSpecialModes.active.state,model=runState.players?.find(row=>String(row.id)===String(p1.id))||runState.players?.[0];return{modelHp:Number(model.hp),physicalHp:Number(p1.health)}});
  assert.equal(healedStable.modelHp,7,"Horde model HP must remain healed on later controller frames");
  assert.equal(healedStable.physicalHp,7,"physical Horde HP must not be overwritten back to the pre-pickup value");

  const spyStarted=await page.evaluate(()=>{
    try{window.CCGLostSizzlerSpecialModes.stop(undefined,true)}catch(_){}
    net.setSolo("Agent One");const id=String(net.sessionId);
    return window.CCGLostSizzlerSpecialModes.startOnline({roomMode:"sizzler-saboteurs",players:[{id,name:"Agent One"},{id:"TEST-SPY-B",name:"Agent Two"}],hostId:id,seed:"V141-SPY-UI-PERF",roomCode:"SPYUI"});
  });
  assert.equal(spyStarted,true,"isolated Spy fixture must start through the real special-mode adapter");
  await page.waitForFunction(()=>document.body.dataset.specialMode==="sizzler-saboteurs"&&document.body.dataset.spyIndependentUi==="true"&&Boolean(window.CCGLostSizzlerV141R29SpyEngine?.state?.isolated));
  await page.waitForFunction(()=>Boolean(window.CCGLostSizzlerV141R32SpyLoader?.state?.loaded&&window.CCGLostSizzlerV141R32SpyLoader?.state?.uiLoaded&&window.CCGLostSizzlerV141R32SpyOverhaul?.state?.worldBuilds>=1&&window.CCGLostSizzlerV141R32SpySearchUiOwner),null,{timeout:15000});
  await page.waitForFunction(()=>getComputedStyle(document.getElementById("spy-independent-hud")).display!=="none");

  const spyUi=await page.evaluate(()=>{
    const hud=document.getElementById("spy-independent-hud"),objectives=[...hud.querySelectorAll(".spy-objective")],legacy=window.CCGLostSizzlerV141R27SpyIsolation;
    return{
      critical:getComputedStyle(document.querySelector(".critical-strip")).display,
      tactical:getComputedStyle(document.querySelector(".tactical-zone")).display,
      progress:getComputedStyle(document.querySelector(".hub-progress")).display,
      keyCard:getComputedStyle(document.querySelector(".keys-card")).display,
      objectiveCount:objectives.length,
      objectiveTexts:objectives.map(node=>node.textContent.trim()),
      objectiveVisible:objectives.every(node=>node.getBoundingClientRect().width>0&&node.getBoundingClientRect().height>0),
      legacyRendering:Boolean(legacy?.state?.rendering),
      renders:window.CCGLostSizzlerV141UiSpyPerformance.state.spyHudRenders
    };
  });
  assert.equal(spyUi.critical,"none","Spy must hide Dungeon critical/Main Vault Keys chrome");
  assert.equal(spyUi.tactical,"none","Spy must hide the Dungeon tactical/right sidebar rather than overlap it");
  assert.equal(spyUi.progress,"none","Spy must hide the Dungeon objective/progression strip");
  assert.equal(spyUi.keyCard,"none","Main Vault Keys must never be visible inside Spy Vs Spy");
  assert.equal(spyUi.objectiveCount,4,"Spy independent HUD must show all four required case objectives");
  assert.equal(spyUi.objectiveVisible,true,"all Spy objective items must remain fully present in the independent HUD");
  assert.deepEqual(spyUi.objectiveTexts.map(text=>text.replace(/MISSING|HELD/g,"").trim()),["SIZZLER CASE","JOYSTICK","LOADING TAPE","DUNGEON KEY"],"Spy objective HUD must expose the complete objective set");
  assert.equal(spyUi.legacyRendering,true,"legacy r27 Dungeon-HUD renderer must yield while the independent Spy UI owns presentation");

  const rendersBefore=spyUi.renders;
  await page.keyboard.down("ArrowRight");await page.waitForTimeout(520);await page.keyboard.up("ArrowRight");await page.waitForTimeout(120);
  const rendersAfter=await page.evaluate(()=>window.CCGLostSizzlerV141UiSpyPerformance.state.spyHudRenders);
  assert.ok(rendersAfter-rendersBefore<=1,`moving a Spy must not rebuild/flicker the objective-case HUD; render delta was ${rendersAfter-rendersBefore}`);

  const searchReady=await page.evaluate(()=>{
    const api=window.CCGLostSizzlerV141UiSpyPerformance,active=window.CCGLostSizzlerSpecialModes.active,match=active.state,model=match.players?.find(row=>String(row.id)===String(p1.id))||match.players?.[0],blocker=(host.blockingDecor||[]).find(item=>item?.spyFurniture);
    if(!blocker)throw new Error("Spy fixture has no searchable furniture");
    const logicalRoom=match.map?.rooms?.find(room=>(room.furniture||[]).some(item=>String(item.id)===String(blocker.logicalFurnitureId)));
    const logical=logicalRoom?.furniture?.find(item=>String(item.id)===String(blocker.logicalFurnitureId));if(!logicalRoom||!logical)throw new Error("Spy fixture could not map physical furniture to logical furniture");logical.searched=false;
    const candidates=[[1,0],[-1,0],[0,1],[0,-1]].map(([dx,dy])=>({x:Number(blocker.x)+dx,y:Number(blocker.y)+dy})).filter(cell=>world.map?.[cell.y]?.[cell.x]===0&&!(host.blockingDecor||[]).some(item=>Number(item.x)===cell.x&&Number(item.y)===cell.y));
    const cell=candidates[0];if(!cell)throw new Error("Spy fixture has no open adjacent furniture cell");p1.x=cell.x;p1.y=cell.y;p1.rx=cell.x;p1.ry=cell.y;model.x=cell.x;model.y=cell.y;model.roomId=logicalRoom.id;
    api.renderSearchIndicator();const indicator=document.getElementById("spy-search-indicator");return{visible:indicator.dataset.visible,state:indicator.dataset.state,label:document.getElementById("spy-search-label")?.textContent||"",target:api.nearSpyFurniture()?.id||""};
  });
  assert.equal(searchReady.visible,"true","standing beside Spy furniture must show the search interaction indicator");
  assert.equal(searchReady.state,"ready","unsearched Spy furniture must show a ready-to-search state");
  assert.match(searchReady.label,/E — SEARCH/,"searchable Spy furniture must advertise the E interaction");

  await page.keyboard.press("KeyE");await page.waitForTimeout(210);
  const searchProgress=await page.evaluate(()=>{window.CCGLostSizzlerV141UiSpyPerformance.renderSearchIndicator();const indicator=document.getElementById("spy-search-indicator"),fill=document.getElementById("spy-search-fill");return{state:indicator.dataset.state,label:document.getElementById("spy-search-label")?.textContent||"",width:parseFloat(fill?.style?.width||"0"),pulses:window.CCGLostSizzlerV141UiSpyPerformance.state.searchPulses}});
  assert.equal(searchProgress.state,"searching","Spy furniture interaction must show an in-progress state");
  assert.match(searchProgress.label,/SEARCHING/,"Spy search indicator must say what is being searched");
  assert.ok(searchProgress.width>0&&searchProgress.width<100,`Spy search progress bar must visibly advance, got ${searchProgress.width}%`);
  assert.ok(searchProgress.pulses>=1,"Spy search feedback must register the interaction pulse");
  await page.waitForTimeout(430);
  const searchComplete=await page.evaluate(()=>{window.CCGLostSizzlerV141UiSpyPerformance.renderSearchIndicator();const indicator=document.getElementById("spy-search-indicator");return{state:indicator.dataset.state,width:parseFloat(document.getElementById("spy-search-fill")?.style?.width||"0")}});
  assert.equal(searchComplete.state,"complete","Spy search feedback must visibly complete after the interaction window");
  assert.equal(searchComplete.width,100,"completed Spy search feedback must fill the interaction bar");

  assert.deepEqual(errors,[],`Horde/Spy UI-performance browser regression must have no uncaught browser errors: ${errors.join("\n")}`);
  console.log("Lost Sizzler Horde roster/health and independent Spy HUD/search regressions passed in Chromium.");
  await context.close();
}finally{
  await browser.close();for(const socket of sockets)socket.destroy();await new Promise(resolve=>server.close(()=>resolve()));
}