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
    const pathname=decodeURIComponent(new URL(req.url,"http://local").pathname);
    const relative=pathname.endsWith("/")?`${pathname}index.html`:pathname;
    const file=path.resolve(repo,`.${relative}`);
    if(!file.startsWith(`${repo}${path.sep}`)&&file!==repo){res.writeHead(403).end("forbidden");return}
    fs.readFile(file,(error,data)=>{
      if(error){res.writeHead(404,{connection:"close"}).end("not found");return}
      res.writeHead(200,{"content-type":mime[path.extname(file).toLowerCase()]||"application/octet-stream","cache-control":"no-store",connection:"close"});
      res.end(data);
    });
  }catch(error){res.writeHead(500,{connection:"close"}).end(String(error))}
});
server.on("connection",socket=>{sockets.add(socket);socket.on("close",()=>sockets.delete(socket))});
await new Promise((resolve,reject)=>{server.once("error",reject);server.listen(0,"127.0.0.1",resolve)});
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,args:["--disable-dev-shm-usage","--disable-background-networking","--autoplay-policy=no-user-gesture-required"]});

async function settleFloorEntry(page){
  for(let attempt=0;attempt<8;attempt++){
    await page.waitForTimeout(180);
    const state=await page.evaluate(()=>({
      dossier:mode==="dossier"&&!document.getElementById("named-dossier-panel")?.classList.contains("hidden"),
      save:!document.getElementById("save-panel")?.classList.contains("hidden"),
      mode:String(mode||"")
    }));
    if(state.dossier)await page.evaluate(()=>{if(typeof hideNamedDossier==="function")hideNamedDossier()});
    if(state.save&&await page.locator("#save-continue-btn").isVisible())await page.locator("#save-continue-btn").click({noWaitAfter:true});
    if(!state.dossier&&!state.save&&state.mode==="playing")break;
  }
  await page.waitForFunction(()=>mode==="playing"&&document.getElementById("save-panel")?.classList.contains("hidden")===true&&document.getElementById("named-dossier-panel")?.classList.contains("hidden")===true,null,{timeout:10000});
}

try{
  const context=await browser.newContext({viewport:{width:1600,height:900}});
  await context.addInitScript(()=>{try{localStorage.setItem("ccg-lost-sizzler-tutorial-seen-v1","true")}catch(_){}});
  const page=await context.newPage();
  page.setDefaultTimeout(45000);
  const errors=[];
  page.on("pageerror",error=>errors.push(String(error?.stack||error)));

  await page.goto(`${origin}/arcade/lost-sizzler/?r60-floor-hud-effects=1`,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.body.dataset.releaseReady==="true"&&Boolean(document.getElementById("solo-btn")),null,{timeout:90000});
  await page.click("#solo-btn");
  await page.waitForFunction(()=>document.body.dataset.runActive==="true"&&mode==="playing"&&Number(run?.floor||0)===1&&Boolean(p1)&&Boolean(host),null,{timeout:20000});

  const initial=await page.evaluate(()=>globalThis.eval(`(()=>{
    window.__ccgR60WorldRef=world;window.__ccgR60HostRef=host;
    return{floor:Number(run.floor),statsFloors:Number(run.stats?.floors||0),elapsed:Number(run.elapsed||0)}
  })()`));
  assert.equal(initial.floor,1,"R60 floor/HUD contract must begin on Floor 1");

  await page.evaluate(()=>globalThis.eval(`floorComplete("R60 stay regression")`));
  await page.waitForFunction(()=>mode==="floorcomplete"&&!document.getElementById("floor-complete")?.classList.contains("hidden"));
  assert.equal(await page.locator("#stay-floor-btn").isVisible(),true,"Floor clear must expose Stay on This Floor");
  const firstBank=await page.evaluate(()=>Number(run?.stats?.floors||0));
  await page.locator("#stay-floor-btn").click({noWaitAfter:true});
  await page.waitForFunction(()=>mode==="playing"&&document.getElementById("floor-complete")?.classList.contains("hidden")===true);
  const stayed=await page.evaluate(()=>globalThis.eval(`(()=>({
    floor:Number(run.floor),
    floorComplete:Boolean(run.floorComplete),
    sameWorld:world===window.__ccgR60WorldRef,
    sameHost:host===window.__ccgR60HostRef,
    statsFloors:Number(run.stats?.floors||0)
  }))()`));
  assert.equal(stayed.floor,1,"Stay on This Floor must not advance the run");
  assert.equal(stayed.floorComplete,false,"Stay on This Floor must return the run to playable state");
  assert.equal(stayed.sameWorld,true,"Stay on This Floor must preserve the generated floor");
  assert.equal(stayed.sameHost,true,"Stay on This Floor must preserve current floor state");
  assert.equal(stayed.statsFloors,firstBank,"staying on a cleared floor must not double-count floor completion");

  await page.evaluate(()=>window.showToast?.("NEW DUNGEON BOUNTY","Floor 1 stale-notification reset probe.","gold",10000));
  await page.waitForFunction(()=>document.getElementById("ccg-major-notification")?.dataset.visible==="true");
  assert.equal(await page.evaluate(()=>document.body.hasAttribute("data-ccg-major-notification")),true,"Floor 1 bounty must own the major notification rail before descent");

  await page.evaluate(()=>globalThis.eval(`floorComplete("R60 descent regression")`));
  await page.waitForFunction(()=>mode==="floorcomplete");
  const secondBank=await page.evaluate(()=>Number(run?.stats?.floors||0));
  assert.equal(secondBank,firstBank,"revisiting the cleared exit must not double-count the floor");
  await page.locator("#descend-btn").click({noWaitAfter:true});
  await page.waitForFunction(()=>Number(run?.floor||0)===2&&Boolean(host)&&Boolean(p1),null,{timeout:10000});
  await settleFloorEntry(page);

  const reset=await page.evaluate(()=>({
    floor:Number(run?.floor||0),
    bodyMajor:document.body.hasAttribute("data-ccg-major-notification"),
    panelVisible:document.getElementById("ccg-major-notification")?.dataset.visible||"",
    railParent:document.getElementById("ccg-major-notification")?.parentElement?.classList.contains("game-message-rail")===true
  }));
  assert.equal(reset.floor,2,"descent must enter Floor 2");
  assert.equal(reset.bodyMajor,false,"Floor 2 start must clear stale major-notification ownership");
  assert.notEqual(reset.panelVisible,"true","Floor 2 start must hide the stale Floor 1 major notice");
  assert.equal(reset.railParent,true,"major notifications must remain owned by the shared game-message rail");

  await page.evaluate(()=>window.showToast?.("NEW DUNGEON BOUNTY","Floor 2 rail visibility regression probe.","gold",7600));
  await page.waitForFunction(()=>document.getElementById("ccg-major-notification")?.dataset.visible==="true");
  const rail=await page.evaluate(()=>{
    const node=document.querySelector(".game-message-rail"),major=document.getElementById("ccg-major-notification");
    const rr=node?.getBoundingClientRect(),mr=major?.getBoundingClientRect();
    return{
      display:node?getComputedStyle(node).display:"",
      railHeight:rr?.height||0,
      majorHeight:mr?.height||0,
      majorVisible:major?.dataset.visible||"",
      parent:major?.parentElement?.classList.contains("game-message-rail")===true
    };
  });
  assert.notEqual(rail.display,"none","Floor 2 must retain the same shared notification rail as Floor 1");
  assert.ok(rail.railHeight>=70,`Floor 2 desktop notification rail must retain its thick reserved bar: ${JSON.stringify(rail)}`);
  assert.ok(rail.majorHeight>0&&rail.majorVisible==="true","New Dungeon Bounty must render visibly in the Floor 2 rail");
  assert.equal(rail.parent,true,"Floor 2 major notice must remain inside the shared rail");

  const stress=await page.evaluate(()=>globalThis.eval(`(()=>{
    const beforeElapsed=Number(run?.elapsed||0);
    for(let i=0;i<64;i++){
      burst(p1.x,p1.y,P.orange,24,1.35);
      ring(p1.x,p1.y,P.orange,28);
      ring(p1.x,p1.y,P.gold,22);
    }
    return{beforeElapsed,particles:particles.length,rings:rings.length,mode:String(mode||"")};
  })()`));
  assert.equal(stress.mode,"playing","effect stress must begin in normal gameplay");
  assert.ok(stress.particles<=360,`explosion particle pool must be capped immediately: ${JSON.stringify(stress)}`);
  assert.ok(stress.rings<=72,`explosion ring pool must be capped immediately: ${JSON.stringify(stress)}`);

  await page.waitForTimeout(700);
  const afterStress=await page.evaluate(()=>globalThis.eval(`(()=>({
    elapsed:Number(run?.elapsed||0),
    particles:particles.length,
    rings:rings.length,
    mode:String(mode||""),
    active:document.body.dataset.runActive||""
  }))()`));
  assert.ok(afterStress.elapsed>stress.beforeElapsed,"simulation must continue advancing after an explosion/effect storm");
  assert.ok(afterStress.particles<=360,"particle pool must remain bounded after effect updates");
  assert.ok(afterStress.rings<=72,"ring pool must remain bounded after effect updates");
  assert.equal(afterStress.mode,"playing","effect storm must not freeze or leave gameplay mode");
  assert.equal(afterStress.active,"true","effect storm must not terminate the active run");

  assert.deepEqual(errors,[],`R60 floor/HUD/effect regression must not raise page errors: ${errors.join("\n")}`);
  await context.close();
  console.log("V10.42 R60 stay-on-floor, Floor 2 notification rail and effect-budget browser contract passed");
}finally{
  await browser.close();
  for(const socket of sockets)socket.destroy();
  await new Promise(resolve=>server.close(resolve));
}
