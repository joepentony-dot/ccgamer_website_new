import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {chromium} from "playwright";

const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,"../../../..");
const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".mjs":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json; charset=utf-8",".svg":"image/svg+xml",".png":"image/png",".webp":"image/webp",".ogg":"audio/ogg",".mp3":"audio/mpeg"};
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

async function ready(page){
  await page.waitForFunction(()=>document.body.dataset.releaseReady==="true"&&Boolean(window.CCGLostSizzlerModeRuntime)&&Boolean(window.CCGLostSizzlerSpecialModes)&&Boolean(window.CCGLostSizzlerV141R43SoloSave),null,{timeout:90000});
}

async function waitMenu(page){
  await page.waitForFunction(()=>mode==="menu"&&!run&&!p1&&!p2&&document.body.dataset.runActive!=="true",null,{timeout:20000});
  const state=await page.evaluate(()=>({special:document.body.dataset.specialMode||"",hordeSolo:document.body.dataset.hordeSolo||"",playMode:String(playMode||""),mode,activeId:window.CCGLostSizzlerModeRuntime?.snapshot?.().activeId||"",menuHidden:document.getElementById("menu")?.classList.contains("hidden")}));
  assert.equal(state.special,"","returning to menu must clear special-mode ownership");
  assert.equal(state.hordeSolo,"","returning to menu must clear Horde Solo ownership");
  assert.equal(state.menuHidden,false,"the main menu must be visible after mode teardown");
  return state;
}

async function viewportStress(page){
  for(const size of [{width:1366,height:768},{width:1024,height:768},{width:1600,height:900},{width:1280,height:720}]){
    await page.setViewportSize(size);await page.waitForTimeout(80);
    const canvas=await page.evaluate(()=>({w:game.width,h:game.height,cssW:game.getBoundingClientRect().width,cssH:game.getBoundingClientRect().height}));
    assert.ok(canvas.w>0&&canvas.h>0&&canvas.cssW>0&&canvas.cssH>0,`canvas must remain measurable after resize ${size.width}x${size.height}`);
    assert.ok(canvas.w*canvas.h<=5000000,`resize ${size.width}x${size.height} must remain inside the backing-store safety budget`);
  }
}

async function focusStress(page){
  await page.evaluate(()=>{window.dispatchEvent(new Event("blur"));document.dispatchEvent(new Event("visibilitychange"));window.dispatchEvent(new Event("focus"));document.dispatchEvent(new Event("visibilitychange"))});
  await page.waitForTimeout(120);
}

try{
  const context=await browser.newContext({viewport:{width:1600,height:900}}),page=await context.newPage();page.setDefaultTimeout(45000);
  const errors=[];page.on("pageerror",error=>errors.push(String(error?.stack||error)));
  console.log("[V10.42 soak] load canonical game");
  await page.goto(`${origin}/arcade/lost-sizzler/`,{waitUntil:"domcontentloaded"});await ready(page);await waitMenu(page);

  for(let cycle=1;cycle<=3;cycle++){
    console.log(`[V10.42 soak] cycle ${cycle}: Solo start / focus / resize / pause / resume / menu`);
    await page.click("#solo-btn");
    await page.waitForFunction(()=>document.body.dataset.runActive==="true"&&mode==="playing"&&playMode==="solo"&&Boolean(p1)&&!p2,null,{timeout:20000});
    await viewportStress(page);await focusStress(page);
    await page.keyboard.press("Escape");
    await page.waitForFunction(()=>!document.getElementById("pause")?.classList.contains("hidden"),null,{timeout:8000});
    await page.click("#resume-btn");
    await page.waitForFunction(()=>mode==="playing"&&document.getElementById("pause")?.classList.contains("hidden"),null,{timeout:8000});
    const soloBefore=await page.evaluate(()=>({x:p1.x,y:p1.y,activeId:window.CCGLostSizzlerModeRuntime.snapshot().activeId,cloudStatus:window.CCGLostSizzlerV141R44SoloCloudSave?.state?.status||""}));
    assert.equal(soloBefore.activeId,"dungeon-solo","Solo must reacquire the Dungeon Solo controller after focus/pause stress");
    await page.evaluate(()=>quitToMenu());await waitMenu(page);

    console.log(`[V10.42 soak] cycle ${cycle}: Tutorial start / focus / menu`);
    await page.click("#tutorial-zone-btn");
    await page.waitForFunction(()=>document.body.dataset.runActive==="true"&&Boolean(p1)&&Boolean(window.CCGLostSizzlerOnboardingV120?.state?.active),null,{timeout:20000});
    await focusStress(page);await page.evaluate(()=>quitToMenu());await waitMenu(page);

    console.log(`[V10.42 soak] cycle ${cycle}: Split Screen start / resize / menu`);
    await page.click("#split-btn");
    await page.waitForFunction(()=>document.body.dataset.runActive==="true"&&mode==="playing"&&playMode==="split"&&Boolean(p1)&&Boolean(p2),null,{timeout:20000});
    const split=await page.evaluate(()=>({activeId:window.CCGLostSizzlerModeRuntime.snapshot().activeId,p1:String(p1?.id||""),p2:String(p2?.id||"")}));
    assert.equal(split.activeId,"split-screen","Split Screen must own its controller after prior Solo/Tutorial teardown");
    assert.ok(split.p1&&split.p2&&split.p1!==split.p2,"Split Screen must have two distinct live players");
    await viewportStress(page);await page.evaluate(()=>quitToMenu());await waitMenu(page);

    console.log(`[V10.42 soak] cycle ${cycle}: Horde adapter start / blur / Escape teardown`);
    const horde=await page.evaluate(()=>{
      net.setSolo("Soak P1");const id=String(net.sessionId);
      return window.CCGLostSizzlerSpecialModes.startOnline({roomMode:"horde-survivor",players:[{id,name:"Soak P1"}],hostId:id,seed:`V1042-HORDE-${Date.now()}`,roomCode:"SOAKH"});
    });
    assert.equal(horde,true,"Horde soak fixture must start through the real special-mode adapter");
    await page.waitForFunction(()=>document.body.dataset.specialMode==="horde-survivor"&&document.body.dataset.runActive==="true"&&window.CCGLostSizzlerModeRuntime.snapshot().activeId.startsWith("horde-"),null,{timeout:15000});
    await focusStress(page);await page.keyboard.press("Escape");await waitMenu(page);

    console.log(`[V10.42 soak] cycle ${cycle}: Spy adapter start / resize / Escape teardown`);
    const spy=await page.evaluate(()=>{
      net.setSolo("Soak Agent");const id=String(net.sessionId);
      return window.CCGLostSizzlerSpecialModes.startOnline({roomMode:"sizzler-saboteurs",players:[{id,name:"Soak Agent"},{id:`SOAK-SPY-${Date.now()}`,name:"Remote Agent"}],hostId:id,seed:`V1042-SPY-${Date.now()}`,roomCode:"SOAKS"});
    });
    assert.equal(spy,true,"Spy soak fixture must start through the real special-mode adapter");
    await page.waitForFunction(()=>document.body.dataset.specialMode==="sizzler-saboteurs"&&document.body.dataset.runActive==="true"&&window.CCGLostSizzlerModeRuntime.snapshot().activeId==="spy-online",null,{timeout:15000});
    await viewportStress(page);await page.keyboard.press("Escape");await waitMenu(page);
  }

  console.log("[V10.42 soak] final Solo run must still move and attack after all mode churn");
  await page.click("#solo-btn");
  await page.waitForFunction(()=>document.body.dataset.runActive==="true"&&mode==="playing"&&playMode==="solo"&&Boolean(p1)&&!p2,null,{timeout:20000});
  const setup=await page.evaluate(()=>{
    if(mode==="dossier")hideNamedDossier();input.clear();bullets.length=0;run.namedDossierAutoShown=true;
    const dirs=[{key:"d",dx:1,dy:0},{key:"a",dx:-1,dy:0},{key:"s",dx:0,dy:1},{key:"w",dx:0,dy:-1}],move=dirs.find(q=>W.walkable(world.map,p1.x+q.dx,p1.y+q.dy,host));
    p1.firearmUnlocked=false;p1.weapon=null;p1.mana=0;p1.hitStunMs=0;p1._meleeSwingAt=0;fire1=0;fireBuffer1=0;
    return{move,start:{x:p1.x,y:p1.y}};
  });
  assert.ok(setup.move,"final Solo run must have a walkable direction");
  await page.keyboard.down(setup.move.key);await page.waitForTimeout(600);await page.keyboard.up(setup.move.key);await page.waitForTimeout(180);
  const moved=await page.evaluate(()=>({x:p1.x,y:p1.y}));assert.notDeepEqual(moved,setup.start,"movement must remain live after repeated cross-mode teardown");
  await page.keyboard.press("Space",{delay:20});await page.waitForTimeout(100);
  const final=await page.evaluate(()=>({swing:Number(p1?._meleeSwingAt||0),activeId:window.CCGLostSizzlerModeRuntime.snapshot().activeId,p2:Boolean(p2),special:document.body.dataset.specialMode||"",runActive:document.body.dataset.runActive}));
  assert.ok(final.swing>0,"attack input must remain live after repeated cross-mode teardown");
  assert.equal(final.activeId,"dungeon-solo","final Solo run must own Dungeon Solo controller");
  assert.equal(final.p2,false,"final Solo run must not inherit stale Player 2 state");
  assert.equal(final.special,"","final Solo run must not inherit stale special-mode ownership");
  assert.equal(final.runActive,"true","final Solo run must remain active");
  assert.deepEqual(errors,[],`release-candidate soak must not throw page errors: ${errors.join("\n")}`);
  console.log("Lost Sizzler V10.42 cross-mode start/stop, focus, resize, pause and final-input soak passed in Chromium.");
  await context.close();
}finally{
  await browser.close().catch(()=>{});for(const socket of sockets)socket.destroy();await new Promise(resolve=>server.close(resolve));
}
