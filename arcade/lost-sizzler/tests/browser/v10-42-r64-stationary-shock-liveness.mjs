import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {chromium} from "playwright";

const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,"../../../..");
const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json; charset=utf-8",".svg":"image/svg+xml",".png":"image/png",".webp":"image/webp",".mp3":"audio/mpeg"};
const sockets=new Set();
const server=http.createServer((req,res)=>{
  try{
    const url=new URL(req.url,"http://local");
    const pathname=decodeURIComponent(url.pathname);
    const relative=pathname.endsWith("/")?pathname+"index.html":pathname;
    const file=path.resolve(repo,"."+relative);
    if(!file.startsWith(repo+path.sep)&&file!==repo){res.writeHead(403).end("forbidden");return}
    fs.readFile(file,(error,data)=>{
      if(error){res.writeHead(404,{connection:"close"}).end("not found");return}
      res.writeHead(200,{"content-type":mime[path.extname(file).toLowerCase()]||"application/octet-stream","cache-control":"no-store",connection:"close"});
      res.end(data);
    });
  }catch(error){res.writeHead(500,{connection:"close"}).end(String(error))}
});
server.on("connection",socket=>{sockets.add(socket);socket.on("close",()=>sockets.delete(socket))});
await new Promise((resolve,reject)=>{server.once("error",reject);server.listen(0,"127.0.0.1",resolve)});
const origin="http://127.0.0.1:"+server.address().port;
const browser=await chromium.launch({headless:true,args:["--disable-dev-shm-usage","--disable-background-networking","--autoplay-policy=no-user-gesture-required"]});

try{
  const context=await browser.newContext({viewport:{width:1280,height:900}});
  await context.addInitScript(()=>{
    try{
      localStorage.setItem("ccg-lost-sizzler-tutorial-seen-v1","true");
      localStorage.setItem("ccg-lost-sizzler-tutorial-complete-v1","true");
      localStorage.setItem("ccg-dungeon-bug-reporter","1");
    }catch(_){}
  });
  const page=await context.newPage();
  page.setDefaultTimeout(30000);
  const errors=[];
  page.on("pageerror",error=>errors.push(String(error?.stack||error)));

  await page.goto(origin+"/arcade/lost-sizzler/?r64-stationary-shock=1&bugreport=1",{waitUntil:"load"});
  await page.waitForFunction(()=>document.body.dataset.gameReady==="true"&&document.body.dataset.v142BootstrapReady==="true");
  await page.waitForFunction(()=>Boolean(window.CCGLostSizzlerV142R58AuthoritativeTrapCore&&window.CCGLostSizzlerV142R19MobileTrapLayoutStability?.serviceTrapLiveness));
  await page.locator("#solo-btn").click({noWaitAfter:true});
  await page.waitForFunction(()=>document.body.dataset.runActive==="true"&&String(mode)==="playing"&&Boolean(p1&&host&&run));

  const fixture=await page.evaluate(()=>{
    const api=window.CCGLostSizzlerV142R19MobileTrapLayoutStability;
    const trap=(host?.traps||[]).find(t=>t?.active&&String(t.kind||"").toLowerCase()==="shock");
    if(!trap)return{available:false,reason:"no shock trap"};
    for(const enemy of host?.enemies||[])enemy.alive=false;
    if(host?.stalker)host.stalker.awake=false;
    if(Array.isArray(host?.hazardRooms))host.hazardRooms.length=0;
    hazards.length=0;
    input.clear();
    p1.x=Number(trap.x);p1.y=Number(trap.y);p1.rx=p1.x;p1.ry=p1.y;
    p1.maxHealth=Math.max(20,Number(p1.maxHealth||8));p1.health=20;p1.armor=4;p1.invuln=0;p1.hitStunMs=0;
    p1.controlLocked=false;p1.controlsLocked=false;
    const original={period:Number(trap.period),phase:Number(trap.phase)};
    const period=800,now=performance.now(),targetPhase=period*.72;
    trap.period=period;
    trap.phase=((targetPhase-(now%period))+period)%period;
    api.rearmInactiveTrapContacts();
    return{
      available:true,id:String(trap.id),x:Number(trap.x),y:Number(trap.y),
      original,health:Number(p1.health),armor:Number(p1.armor),
      safe:!SYS.trapActive(trap,performance.now()),
      passes:Number(api.state.trapLivenessPasses||0),
      hits:Number(api.state.trapHits||0),
      livenessHits:Number(api.state.trapLivenessHits||0)
    };
  });

  assert.equal(fixture.available,true,"stationary SHOCK fixture must exist: "+JSON.stringify(fixture));
  assert.equal(fixture.safe,true,"fixture must begin while the occupied SHOCK trap is in SAFE CYCLE");

  await page.waitForFunction(before=>Number(p1?.health||0)<before,fixture.health,{timeout:1800,polling:20});
  const after=await page.evaluate(id=>{
    const api=window.CCGLostSizzlerV142R19MobileTrapLayoutStability;
    const trap=(host?.traps||[]).find(t=>String(t.id)===String(id));
    return{
      health:Number(p1.health),armor:Number(p1.armor),active:Boolean(trap&&SYS.trapActive(trap,performance.now())),
      passes:Number(api.state.trapLivenessPasses||0),hits:Number(api.state.trapHits||0),
      livenessHits:Number(api.state.trapLivenessHits||0),errors:Number(api.state.trapLivenessErrors||0)
    };
  },fixture.id);

  assert.equal(after.health,fixture.health-1,"a player already standing on a SHOCK trap must lose exactly one HP when SAFE changes to ACTIVE");
  assert.equal(after.armor,fixture.armor,"ordinary SHOCK trap damage must preserve armour");
  assert.ok(after.passes>fixture.passes,"independent trap liveness scheduler must run while the player is stationary");
  assert.equal(after.hits,fixture.hits+1,"stationary SAFE→ACTIVE transition must record exactly one canonical trap hit");
  assert.ok(after.livenessHits>fixture.livenessHits,"the authoritative monitor must own the stationary-cycle hit");
  assert.equal(after.errors,0,"trap liveness monitor must not fault");

  await page.waitForTimeout(180);
  const sameCycle=await page.evaluate(()=>({health:Number(p1.health),hits:Number(window.CCGLostSizzlerV142R19MobileTrapLayoutStability.state.trapHits||0)}));
  assert.equal(sameCycle.health,after.health,"same active cycle must not repeatedly damage a stationary player");
  assert.equal(sameCycle.hits,after.hits,"same active cycle must remain one-hit-per-cycle");

  await page.evaluate(args=>{
    const trap=(host?.traps||[]).find(t=>String(t.id)===String(args.id));
    if(trap){trap.period=args.original.period;trap.phase=args.original.phase}
    p1.x=world.start.x;p1.y=world.start.y;p1.rx=p1.x;p1.ry=p1.y;p1.invuln=0;p1.hitStunMs=0;
    window.CCGLostSizzlerV142R19MobileTrapLayoutStability?.rearmInactiveTrapContacts?.();
  },{id:fixture.id,original:fixture.original});

  assert.deepEqual(errors,[],"stationary SHOCK liveness regression must not produce page errors: "+errors.join("\n"));
  console.log("PASS Dungeon Carnage R64 stationary SAFE-to-ACTIVE SHOCK trap liveness");
  await context.close();
}finally{
  await browser.close();
  for(const socket of sockets)socket.destroy();
  await new Promise(resolve=>server.close(()=>resolve()));
}
