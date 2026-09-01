import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {chromium} from "playwright";

const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,"../../../..");
const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".mjs":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json",".svg":"image/svg+xml",".png":"image/png",".webp":"image/webp",".ogg":"audio/ogg",".mp3":"audio/mpeg"};
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
  const context=await browser.newContext({viewport:{width:1900,height:1000}}),page=await context.newPage();page.setDefaultTimeout(60000);const errors=[];page.on("pageerror",error=>errors.push(String(error?.stack||error)));
  console.log("[r57] load canonical Lost Sizzler page and final owner");
  await page.goto(`${origin}/arcade/lost-sizzler/`,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.body.dataset.releaseReady==="true"&&Boolean(window.CCGLostSizzlerV141R57DesktopPrepStability));

  const loadEvidence=await page.evaluate(()=>({closed:window.CCGLostSizzlerLoadWatchdog.publicBetaClosed(),stages:[...window.CCGLostSizzlerLoadWatchdog.state.loadingStages],r57:Boolean(window.CCGLostSizzlerV141R57DesktopPrepStability)}));
  assert.equal(loadEvidence.closed,false,"local/CI game must stay playable while the production hostname is beta-locked");
  assert.equal(loadEvidence.r57,true,"R57 must be loaded after R56");
  assert.equal(loadEvidence.stages.at(-1),100,`loader must finish at 100: ${JSON.stringify(loadEvidence.stages)}`);
  assert.ok(loadEvidence.stages.every(value=>value%10===0),`loader evidence must use staged ten-percent values: ${JSON.stringify(loadEvidence.stages)}`);
  assert.ok(!loadEvidence.stages.includes(92),`loader must never advertise the old 92% plateau: ${JSON.stringify(loadEvidence.stages)}`);

  console.log("[r57] start real Spy fixture");
  const started=await page.evaluate(()=>{
    net.setSolo("Agent One");const id=String(net.sessionId);
    return window.CCGLostSizzlerSpecialModes.startOnline({roomMode:"sizzler-saboteurs",players:[{id,name:"Agent One"},{id:"R57-SPY-B",name:"Agent Two"}],hostId:id,seed:"V141-R57-DESKTOP-PREP",roomCode:"R57SPY"});
  });
  assert.equal(started,true,"Spy fixture must start through the real special-mode adapter");
  await page.waitForFunction(()=>document.body.dataset.specialMode==="sizzler-saboteurs"&&Boolean(window.CCGLostSizzlerV141R32SpyOverhaul)&&Boolean(window.CCGLostSizzlerV141R57DesktopPrepStability));
  await page.waitForTimeout(850);

  console.log("[r57] TAB opens and closes the Spy Field Kit");
  await page.keyboard.press("Tab");await page.waitForTimeout(120);
  assert.equal(await page.evaluate(()=>Boolean(window.CCGLostSizzlerV141R32SpyOverhaul.state.inventoryOpen)),true,"TAB must open Spy Field Kit");
  await page.keyboard.press("Tab");await page.waitForTimeout(120);
  assert.equal(await page.evaluate(()=>Boolean(window.CCGLostSizzlerV141R32SpyOverhaul.state.inventoryOpen)),false,"TAB must close Spy Field Kit");

  console.log("[r57] stale Spy host controls recover and P1 moves");
  const freeze=await page.evaluate(()=>{
    const api=window.CCGLostSizzlerV141R57DesktopPrepStability,spy=window.CCGLostSizzlerV141R32SpyOverhaul;
    spy.state.inventoryOpen=false;spy.state.search={targetId:"stale-r57",targetLabel:"STALE",startedAt:performance.now()-7000,completesAt:performance.now()-4000};spy.state.lastMoveAt=Infinity;
    mode="inventory";UI.inventory.classList.remove("hidden");p1.controlLocked=true;p1.controlsLocked=true;p1.hitStunMs=9999;api.repairSpyLiveness();
    const choices=[{code:"ArrowRight",dx:1,dy:0},{code:"ArrowLeft",dx:-1,dy:0},{code:"ArrowDown",dx:0,dy:1},{code:"ArrowUp",dx:0,dy:-1}],open=choices.find(row=>world.map?.[Number(p1.y)+row.dy]?.[Number(p1.x)+row.dx]===0&&!(host.blockingDecor||[]).some(item=>Number(item.x)===Number(p1.x)+row.dx&&Number(item.y)===Number(p1.y)+row.dy));
    if(!open)throw new Error("no open Spy movement cell for R57 fixture");
    return{mode:String(mode),search:spy.state.search,lastMove:Number(spy.state.lastMoveAt),locked:Boolean(p1.controlLocked||p1.controlsLocked),stun:Number(p1.hitStunMs),x:Number(p1.x),y:Number(p1.y),code:open.code}
  });
  assert.equal(freeze.mode,"playing","Spy host must return to playing mode");assert.equal(freeze.search,null,"stale Spy search must be cleared");assert.equal(freeze.lastMove,0,"impossible Spy move timestamp must be reset");assert.equal(freeze.locked,false,"stale Spy control locks must be released");assert.equal(freeze.stun,0,"impossible Spy stun must be released");
  await page.keyboard.down(freeze.code);await page.waitForTimeout(460);await page.keyboard.up(freeze.code);await page.waitForTimeout(100);
  const moved=await page.evaluate(()=>({x:Number(p1.x),y:Number(p1.y)}));assert.ok(Math.abs(moved.x-freeze.x)+Math.abs(moved.y-freeze.y)>0,`host P1 must move after repair: ${JSON.stringify(freeze)} -> ${JSON.stringify(moved)}`);

  console.log("[r57] active Player 2 survives a transient remote-map disappearance");
  const presence=await page.evaluate(()=>{
    const api=window.CCGLostSizzlerV141R57DesktopPrepStability,m=window.CCGLostSizzlerSpecialModes.active.state,me=m.players.find(row=>String(row.id)===String(p1.id))||m.players[0],other=m.players.find(row=>row!==me);if(!other)throw new Error("no second Spy model");
    other.status="active";api.repairSpyPresence();const first=remote.get(other.id);if(!first)throw new Error("R57 could not establish initial Player 2 presence");remote.delete(other.id);const before=performance.now();api.repairSpyPresence();const restored=remote.get(other.id);
    return{id:other.id,restored:Boolean(restored),fresh:Number(restored?.lastSeen||0)>=before,proxy:Boolean(restored?._r57SpyPresenceProxy),repairs:Number(api.state.spyPresenceRepairs||0)}
  });
  assert.equal(presence.restored,true,"active Player 2 must be restored into the physical split view after a transient disappearance");assert.equal(presence.fresh,true,"restored Player 2 must remain inside the renderer's live presence window");assert.ok(presence.repairs>=1,"presence recovery must be observable");

  console.log("[r57] Spy HP is transient and sword presentation is ten-tile gated");
  const hpAndRange=await page.evaluate(()=>{
    const api=window.CCGLostSizzlerV141R57DesktopPrepStability,m=window.CCGLostSizzlerSpecialModes.active.state,me=m.players.find(row=>String(row.id)===String(p1.id))||m.players[0],other=m.players.find(row=>row!==me),live=remote.get(other.id);if(!live)throw new Error("no Player 2 live object");
    api.state.spyHpPrevious.clear();api.state.spyHpUntil.clear();p1.health=6;api.trackSpyHealth(p1);p1.health=5;const visibleAfterHit=api.spyHealthBarVisibleFor(p1);api.state.spyHpUntil.set(String(p1.id),performance.now()-1);const hiddenAfterWindow=!api.spyHealthBarVisibleFor(p1);
    other.roomId=me.roomId;other.x=p1.x+12;other.y=p1.y;live.x=other.x;live.y=other.y;live.rx=live.x;live.ry=live.y;const far=api.spySwordAllowedFor(p1);
    other.x=p1.x+5;live.x=other.x;live.rx=live.x;const near=api.spySwordAllowedFor(p1);
    return{visibleAfterHit,hiddenAfterWindow,far,near,hpWrapped:Boolean(window.drawPlayer?.__ccgV141R57SpyHp),swordWrapped:Boolean(window.drawPlayerWeapon?.__ccgV141R57SpySwordRange)}
  });
  assert.equal(hpAndRange.visibleAfterHit,true,"Spy overhead HP window must open after health loss");assert.equal(hpAndRange.hiddenAfterWindow,true,"Spy overhead HP must disappear after its hit window");assert.equal(hpAndRange.far,false,"Spy sword must be disabled beyond ten tiles");assert.equal(hpAndRange.near,true,"Spy sword may be presented when the opponent is within ten tiles");assert.equal(hpAndRange.hpWrapped,true,"Spy player renderer must enforce transient HP");assert.equal(hpAndRange.swordWrapped,true,"Spy weapon renderer must enforce the ten-tile sword gate");

  console.log("[r57] quit Spy, then New Solo Run must start from the returned menu");
  await page.evaluate(async()=>{await Promise.resolve(quitToMenu())});
  await page.waitForFunction(()=>document.body.dataset.runActive!=="true"&&!document.getElementById("menu").classList.contains("hidden"));
  await page.locator("#solo-btn").click();
  await page.waitForFunction(()=>document.body.dataset.runActive==="true"&&String(playMode)==="solo"&&Boolean(p1),null,{timeout:10000});
  const solo=await page.evaluate(()=>({playMode:String(playMode),special:String(document.body.dataset.specialMode||""),health:Number(p1.health),recovery:Number(window.CCGLostSizzlerLoadWatchdog.state.soloRecoveries||0)}));
  assert.equal(solo.playMode,"solo","New Solo Run must become the active mode after returning from Spy");

  console.log("[r57] induced stall restores normal movement cadence before interactions");
  const stall=await page.evaluate(()=>{
    const api=window.CCGLostSizzlerV141R57DesktopPrepStability;p1.moveMultiplier=1;move1=-99999;p1.rx=p1.x-8;p1.ry=p1.y;for(let i=0;i<900;i++)particles.push({life:1});const before=particles.length;api.recoverAfterStall(1800);return{move:Number(move1),delay:Number(C.player.moveDelay),gap:Math.abs(Number(p1.x)-Number(p1.rx))+Math.abs(Number(p1.y)-Number(p1.ry)),before,after:particles.length,recoveries:Number(api.state.stallRecoveries)}
  });
  assert.ok(stall.move>0&&stall.move<=360,`post-stall movement must restart at a normal positive cadence: ${JSON.stringify(stall)}`);assert.equal(stall.gap,0,"post-stall visual interpolation must not race across an old position backlog");assert.ok(stall.after<=420&&stall.after<stall.before,"visual particle backlog must be trimmed after a stall");assert.ok(stall.recoveries>=1,"stall recovery must be recorded");

  console.log("[r57] fire and spike traps each deal one durability point per active cycle, including reactivation");
  const traps=await page.evaluate(()=>{
    const api=window.CCGLostSizzlerV141R57DesktopPrepStability;api.state.trapCycles.clear();p1.armor=0;p1.maxHealth=Math.max(12,p1.maxHealth);p1.health=12;p1.invuln=9999;
    const fire={id:"r57-fire",kind:"fire",x:p1.x,y:p1.y,active:true,period:10000000,phase:0};host.traps=[fire];const start=p1.health;api.contactTick();const fire1=p1.health;fire.phase=6000000;api.contactTick();fire.phase=0;p1.invuln=9999;api.contactTick();const fire2=p1.health;
    api.state.trapCycles.clear();const spike={id:"r57-spike",kind:"spike",x:p1.x,y:p1.y,active:true,period:10000000,phase:0};host.traps=[spike];p1.invuln=9999;api.contactTick();const spike1=p1.health;
    return{start,fire1,fire2,spike1,hits:Number(api.state.trapHits),fallbacks:Number(api.state.trapFallbacks)}
  });
  assert.equal(traps.start-traps.fire1,1,`active fire trap must deal exactly one point: ${JSON.stringify(traps)}`);assert.equal(traps.fire1-traps.fire2,1,"fire trap must deal one more point after a real inactive/reactivated cycle");assert.equal(traps.fire2-traps.spike1,1,"active spike trap must deal exactly one point");assert.ok(traps.hits>=3,"R57 must record all three successful trap cycles");

  console.log("[r57] shrine contact still activates after the induced stall");
  const shrine=await page.evaluate(()=>{
    const api=window.CCGLostSizzlerV141R57DesktopPrepStability,row={id:"r57-shrine",x:p1.x,y:p1.y,active:true};host.shrines=[row];const before=Number(run.stats.shrines||0);api.contactTick();return{active:Boolean(row.active),before,after:Number(run.stats.shrines||0),count:Number(api.state.shrinesActivated)}
  });
  assert.equal(shrine.active,false,"standing on an active shrine must consume/activate it even after a stall");assert.equal(shrine.after,shrine.before+1,"canonical shrine stats must advance");assert.ok(shrine.count>=1,"R57 shrine recovery must be observable");

  console.log("[r57] Timed Chamber prunes dead waves, caps catch-up and spawns only three after an interwave gap");
  const timed=await page.evaluate(()=>{
    const api=window.CCGLostSizzlerV141R57DesktopPrepStability,roomId=W.roomAt(world,p1.x,p1.y),t={id:"r57-timed",roomId,triggered:true,cleared:false,timeLeft:30000,wave:1,_v141WaveSpawned:true};host.timedRooms=[t];
    for(let i=0;i<36;i++)host.enemies.push({id:`r57-dead-${i}`,x:p1.x,y:p1.y,alive:false,_v141TimedRoomId:t.id});
    const before=Number(t.timeLeft);updateTimed(5000);const afterFirst=Number(t.timeLeft),deadAfterFirst=host.enemies.filter(e=>e._v141TimedRoomId===t.id&&!e.alive).length,aliveHold=host.enemies.filter(e=>e._v141TimedRoomId===t.id&&e.alive).length,held=Number(t._r57NextWaveAt||0)>performance.now();
    t._r57NextWaveAt=performance.now()-1;updateTimed(5000);const afterSecond=Number(t.timeLeft),aliveSpawn=host.enemies.filter(e=>e._v141TimedRoomId===t.id&&e.alive).length,deadAfterSecond=host.enemies.filter(e=>e._v141TimedRoomId===t.id&&!e.alive).length;
    return{before,afterFirst,afterSecond,deadAfterFirst,deadAfterSecond,aliveHold,aliveSpawn,held,pruned:Number(api.state.timedPruned),spawns:Number(api.state.timedSpawns),max:Number(api.state.maxTimedEnemies)}
  });
  assert.ok(timed.before-timed.afterFirst<=55,`a 5-second stalled frame must consume no more than the 50ms Timed Chamber cap: ${JSON.stringify(timed)}`);assert.ok(timed.afterFirst-timed.afterSecond<=55,"second oversized delta must also remain capped");assert.equal(timed.deadAfterFirst,0,"dead Timed Chamber wave actors must be physically removed");assert.equal(timed.deadAfterSecond,0,"dead timed actors must not reaccumulate during spawn");assert.equal(timed.aliveHold,0,"next wave must not spawn in the same frame as the previous wave clears");assert.equal(timed.held,true,"interwave delay must be armed");assert.ok(timed.aliveSpawn>0&&timed.aliveSpawn<=3,"interwave completion must spawn no more than three enemies");assert.ok(timed.pruned>=36,"all injected dead wave actors must be pruned");assert.ok(timed.max<=3,"diagnostic active timed enemy cap must remain three");

  console.log("[r57] Quick Inventory uses stable canonical artwork, not the flickering R56 overlay");
  const icons=await page.evaluate(()=>{
    p1.inventorySlots=3;p1.inventory=[{kind:"potion",name:"Restoration Potion",qty:2},{kind:"teleport",name:"Teleport Spell",qty:1},{kind:"artefact",name:"Rare Artefact",qty:1}];sync();
    const r56=window.CCGLostSizzlerV141R56PlaytestCompletion;r56.renderQuickIcons();
    return [...document.querySelectorAll("#quick-slots .quick-slot")].slice(0,3).map(slot=>{const canonical=slot.querySelector(":scope > .item-svg-wrap svg,:scope > .item-svg-wrap img.item-art"),legacy=slot.querySelector(".r56-quick-slot-icon"),cr=canonical?.getBoundingClientRect(),style=legacy?getComputedStyle(legacy):null;return{canonical:Boolean(canonical),w:Number(cr?.width||0),h:Number(cr?.height||0),legacyHidden:Boolean(legacy)&&style?.visibility==="hidden"&&Number(style?.opacity||0)===0}})
  });
  for(const [index,row] of icons.entries()){assert.equal(row.canonical,true,`quick slot ${index+1} must retain canonical graphical artwork`);assert.ok(row.w>=16&&row.h>=16,`quick slot ${index+1} artwork must remain visibly sized: ${JSON.stringify(row)}`);assert.equal(row.legacyHidden,true,`quick slot ${index+1} redundant R56 overlay must be hidden to prevent flicker`)}

  assert.deepEqual(errors,[],`R57 browser regression must have no uncaught errors: ${errors.join("\n")}`);
  console.log("R57 Spy/menu recovery, stall-safe traps/shrines/timed rooms and stable Quick Inventory browser regression passed.");
}finally{
  await browser.close();for(const socket of sockets)socket.destroy();await new Promise(resolve=>server.close(()=>resolve()));
}