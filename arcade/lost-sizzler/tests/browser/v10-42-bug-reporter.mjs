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
  const context=await browser.newContext({viewport:{width:1280,height:800}});
  await context.addInitScript(()=>{try{localStorage.setItem("ccg-lost-sizzler-tutorial-seen-v1","true")}catch(_){}});
  const page=await context.newPage();
  page.setDefaultTimeout(60000);
  const errors=[],failedScripts=[];
  page.on("pageerror",error=>errors.push(String(error?.stack||error)));
  page.on("requestfailed",request=>{try{const url=new URL(request.url());if(url.origin===origin&&/\.js(?:\?|$)/i.test(url.pathname))failedScripts.push(`${url.pathname}: ${request.failure()?.errorText||"failed"}`)}catch(_){}});

  await page.goto(`${origin}/arcade/lost-sizzler/?bugreport=1&bug-reporter-contract=1`,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.body.dataset.releaseReady==="true"&&window.CCGLostSizzlerV142Bootstrap?.ready===true&&window.CCGLostSizzlerBugReporter?.state?.installed===true);
  await page.waitForFunction(()=>{const b=document.getElementById("ccg-bug-report-btn");return Boolean(b&&!b.hidden&&b.getClientRects().length)});

  await page.click("#solo-btn");
  await page.waitForFunction(()=>document.body.dataset.runActive==="true"&&mode==="playing"&&Boolean(p1),null,{timeout:20000});
  await page.evaluate(()=>{p1.firearmUnlocked=true;p1.mana=Math.max(20,p1.mana||0);fire1=0;fireBuffer1=0;input.delete("Space")});

  await page.keyboard.press("Tab");
  await page.waitForFunction(()=>mode==="inventory"&&!document.getElementById("inventory-panel")?.classList.contains("hidden"));
  await page.keyboard.press("Tab");
  await page.waitForFunction(()=>mode==="playing"&&document.getElementById("inventory-panel")?.classList.contains("hidden"));

  const manaBefore=await page.evaluate(()=>Number(p1.mana));
  await page.keyboard.press("Space");
  await page.waitForFunction(before=>Number(p1.mana)<before||Number(fire1)>0||Number(fireBuffer1)>0,manaBefore,{timeout:3000});
  await page.waitForTimeout(750);

  const environmentalBefore=await page.evaluate(()=>{
    const reporter=window.CCGLostSizzlerBugReporter;
    const before={
      anomalies:Number(reporter.state.environmentAnomalies||0),
      contacts:Number(reporter.state.environmentContacts||0)
    };
    const stamp=performance.now();
    const trap={id:"bug-report-crossing",kind:"spike",x:Number(p1.x),y:Number(p1.y),active:true,period:1000000,phase:-stamp};
    host.traps.push(trap);
    reporter.observeMovementBoundary(p1,"before",{source:"browser-contract",deliberate:true});
    // Deliberately omit triggerTrap/hurtPlayer to model the live regression:
    // the player crossed an ACTIVE trap but gameplay produced no damage.
    reporter.observeMovementBoundary(p1,"after",{source:"browser-contract",deliberate:true});
    host.traps=host.traps.filter(row=>row!==trap);
    // Unrelated damage inside the verification window must not mask the missed
    // trap hit. This reproduces the review case where an enemy attacks at the
    // same moment as a broken environmental contact.
    p1.invuln=0;p1.health=Math.max(4,Number(p1.health||8));
    hurtPlayer(p1,1,false,"unrelated enemy");
    return before;
  });
  await page.waitForFunction(before=>{
    const state=window.CCGLostSizzlerBugReporter?.state;
    return Number(state?.environmentContacts||0)>before.contacts&&Number(state?.environmentAnomalies||0)>before.anomalies;
  },environmentalBefore,{timeout:3000});
  const environmentalEvidence=await page.evaluate(()=>({
    state:{...window.CCGLostSizzlerBugReporter.state},
    events:window.CCGLostSizzlerBugReporter.events.filter(event=>String(event.type).includes("environment")||String(event.type).includes("ACTIVE_TRAP_CROSSING"))
  }));
  assert.ok(environmentalEvidence.events.some(event=>event.type==="environment-boundary-contact"),"reporter must capture exact active-trap contact at the movement boundary");
  assert.ok(environmentalEvidence.events.some(event=>event.type==="ANOMALY_ACTIVE_TRAP_CROSSING_NO_DAMAGE"),"reporter must flag an active trap crossing that produced no health loss");
  const missedTrap=environmentalEvidence.events.find(event=>event.type==="ANOMALY_ACTIVE_TRAP_CROSSING_NO_DAMAGE");
  assert.equal(missedTrap?.detail?.damageSource,"unrelated enemy","unrelated damage must be retained as evidence but must not satisfy trap confirmation");

  const successfulTrapProbe=await page.evaluate(()=>{
    const reporter=window.CCGLostSizzlerBugReporter,stamp=performance.now();
    const trap={id:"bug-report-confirmed-trap",kind:"shock",x:Number(p1.x),y:Number(p1.y),active:true,period:1000000,phase:-stamp};
    p1.invuln=0;p1.health=Math.max(6,Number(p1.health||8));p1.armor=0;
    const before={anomalies:Number(reporter.state.environmentAnomalies||0),verified:Number(reporter.state.environmentVerifiedHits||0)};
    host.traps.push(trap);
    reporter.observeMovementBoundary(p1,"before",{source:"confirmed-trap"});
    triggerTrap(p1);
    reporter.observeMovementBoundary(p1,"after",{source:"confirmed-trap"});
    host.traps=host.traps.filter(row=>row!==trap);
    // A later enemy hit deliberately overwrites the global last-damage fields.
    // The already-emitted exact trap signal must still confirm the earlier hit.
    p1.invuln=0;
    hurtPlayer(p1,1,false,"enemy after confirmed trap");
    return before;
  });
  await page.waitForFunction(before=>Number(window.CCGLostSizzlerBugReporter?.state?.environmentVerifiedHits||0)>before.verified,successfulTrapProbe,{timeout:3000});
  const successfulTrapEvents=await page.evaluate(()=>window.CCGLostSizzlerBugReporter.events.filter(event=>
    event.detail?.trapSignal?.trapId==="bug-report-confirmed-trap"||
    event.detail?.traps?.some?.(row=>row?.id==="bug-report-confirmed-trap"||row?.trap?.id==="bug-report-confirmed-trap")
  ));
  assert.ok(successfulTrapEvents.some(event=>event.type==="environment-trap-crossing-damage-confirmed"&&event.detail?.trapSignal?.trapId==="bug-report-confirmed-trap"),"later unrelated damage must not invalidate a successful ordinary-trap contact signal");
  assert.equal(successfulTrapEvents.some(event=>event.type==="ANOMALY_ACTIVE_TRAP_CROSSING_NO_DAMAGE"),false,"a confirmed ordinary trap hit must not be reclassified after later damage");

  const hazardProbe=await page.evaluate(()=>{
    const reporter=window.CCGLostSizzlerBugReporter,original={x:p1.x,y:p1.y,health:p1.health,cooldown:Number(p1.hazardHitCooldown||0)};
    const roomId=W.roomAt(world,Number(p1.x),Number(p1.y));
    const adjacent=[[1,0],[-1,0],[0,1],[0,-1]].map(([dx,dy])=>({x:Number(p1.x)+dx,y:Number(p1.y)+dy}))
      .find(q=>W.roomAt(world,q.x,q.y)===roomId&&W.walkable(world.map,q.x,q.y,host));
    if(!adjacent)return{available:false};
    const start={x:Number(p1.x),y:Number(p1.y)},elapsed=Number(host.floorElapsed||run.elapsed||0),period=1000000,group=Math.floor(elapsed/period)%2;
    const hazard={id:"bug-report-exact-hazard",roomId,type:"embers",title:"BUG REPORT EXACT HAZARD",cells:[{...start,group},{...adjacent,group}],groups:2,period,warningMs:0,activeMs:999999,phase:0};
    host.hazardRooms.push(hazard);p1.hazardHitCooldown=0;
    const beforeAnomalies=Number(reporter.state.environmentAnomalies||0),beforeVerified=Number(reporter.state.environmentVerifiedHits||0);
    reporter.observeMovementBoundary(p1,"before",{source:"hazard-cell-one"});
    reporter.observeMovementBoundary(p1,"after",{source:"hazard-cell-one"});
    p1.x=adjacent.x;p1.y=adjacent.y;p1.rx=p1.x;p1.ry=p1.y;p1.hazardHitCooldown=0;
    reporter.observeMovementBoundary(p1,"before",{source:"hazard-cell-two"});
    reporter.observeMovementBoundary(p1,"after",{source:"hazard-cell-two"});
    const damageAt=performance.now()+1;
    p1.__ccgLastHurtAt=damageAt;p1.__ccgLastDamageAt=damageAt;p1.__ccgLastDamageSource="BUG REPORT EXACT HAZARD trap";
    p1.health=Math.max(2,Number(p1.health||8)-1);
    dispatchEvent(new CustomEvent("ccg:hazard-damage",{detail:{
      playerId:String(p1.id||p1.name||"P1"),hazardId:hazard.id,type:hazard.type,
      x:adjacent.x,y:adjacent.y,at:damageAt
    }}));
    const laterAt=damageAt+1;
    p1.__ccgLastHurtAt=laterAt;p1.__ccgLastDamageAt=laterAt;p1.__ccgLastDamageSource="unrelated enemy after hazard";
    p1.health=Math.max(1,Number(p1.health||2)-1);
    host.hazardRooms=host.hazardRooms.filter(row=>row!==hazard);
    setTimeout(()=>{p1.x=original.x;p1.y=original.y;p1.rx=p1.x;p1.ry=p1.y;p1.health=Math.max(1,original.health);p1.hazardHitCooldown=original.cooldown},500);
    return{available:true,beforeAnomalies,beforeVerified,start,adjacent};
  });
  assert.equal(hazardProbe.available,true,"hazard attribution fixture requires two adjacent cells in one room");
  await page.waitForFunction(probe=>{
    const state=window.CCGLostSizzlerBugReporter?.state;
    return Number(state?.environmentAnomalies||0)>probe.beforeAnomalies&&Number(state?.environmentVerifiedHits||0)>probe.beforeVerified;
  },hazardProbe,{timeout:3000});
  const hazardEvents=await page.evaluate(()=>window.CCGLostSizzlerBugReporter.events.filter(event=>String(event.detail?.hazards?.[0]?.id||"")==="bug-report-exact-hazard"));
  assert.ok(hazardEvents.some(event=>event.type==="ANOMALY_ACTIVE_HAZARD_CROSSING_NO_DAMAGE"&&event.detail?.contact?.x===hazardProbe.start.x&&event.detail?.contact?.y===hazardProbe.start.y),"damage on a later cell of the same hazard must not confirm an earlier missed contact");
  assert.ok(hazardEvents.some(event=>event.type==="environment-hazard-crossing-damage-confirmed"&&event.detail?.contact?.x===hazardProbe.adjacent.x&&event.detail?.contact?.y===hazardProbe.adjacent.y&&event.detail?.hazardSignal?.hazardId==="bug-report-exact-hazard"),"hazard confirmation must retain the exact damaging cell signal even after a later unrelated hit");

  const report=await page.evaluate(()=>window.CCGLostSizzlerBugReporter.createReport("browser-contract"));
  assert.equal(report.schema,"CCG-DUNGEON-BUG-REPORT-v1");
  assert.equal(report.summary.game.mode,"playing");
  assert.equal(report.summary.panels.inventory.hidden,true,"report must show that inventory returned to gameplay");
  assert.ok(report.recentEvents.some(event=>event.type==="keydown"&&event.detail?.code==="Tab"),"report must retain inventory key activity");
  assert.ok(report.recentEvents.some(event=>event.type==="keydown"&&event.detail?.code==="Space"),"report must retain attack key activity");
  assert.ok(report.recentEvents.some(event=>event.type==="attack-probe"),"report must retain post-attack liveness evidence");

  await page.click("#ccg-bug-report-btn");
  await page.waitForFunction(()=>document.getElementById("ccg-bug-report-modal")?.open===true);
  const text=await page.locator("#ccg-bug-report-text").inputValue();
  assert.match(text,/CCG DUNGEON CARNAGE BUG REPORT/);
  assert.match(text,/Fire state:/);
  assert.match(text,/Inventory hidden: true/);
  await page.click('[data-bug-close]');

  assert.deepEqual(errors,[],`incident reporter browser contract must not produce page errors: ${errors.join("\n")}`);
  assert.deepEqual(failedScripts,[],`incident reporter must not lose same-origin scripts: ${failedScripts.join("\n")}`);
  console.log("Dungeon Carnage incident reporter Solo/inventory/fire browser contract passed.");
  await context.close();
}finally{
  await browser.close();for(const socket of sockets)socket.destroy();await new Promise(resolve=>server.close(()=>resolve()));
}
