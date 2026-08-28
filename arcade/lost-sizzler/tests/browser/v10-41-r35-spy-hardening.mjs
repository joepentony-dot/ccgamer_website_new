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

try{
  const context=await browser.newContext({viewport:{width:1600,height:1000}}),page=await context.newPage();page.setDefaultTimeout(45000);const errors=[];page.on("pageerror",error=>errors.push(String(error?.stack||error)));
  console.log("[r35 Spy] load canonical page and start real Spy adapter");
  await page.goto(`${origin}/arcade/lost-sizzler/`,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.body.dataset.releaseReady==="true"&&Boolean(window.CCGLostSizzlerV141R32SpyLoader));
  const started=await page.evaluate(()=>{net.setSolo("Agent One");const id=String(net.sessionId);return window.CCGLostSizzlerSpecialModes.startOnline({roomMode:"sizzler-saboteurs",players:[{id,name:"Agent One"},{id:"R35-SPY-B",name:"Agent Two"}],hostId:id,seed:"V141-R35-HARDEN",roomCode:"R35SPY"})});
  assert.equal(started,true,"r35 Spy fixture must start through the canonical adapter");
  await page.waitForFunction(()=>document.body.dataset.specialMode==="sizzler-saboteurs"&&Boolean(window.CCGLostSizzlerV141R35SpyRulesHardening)&&Boolean(window.CCGLostSizzlerV141R32SpyPacketOwner)&&Boolean(window.CCGLostSizzlerV141R34SpyFullscreenUi)&&Boolean(document.getElementById("spy-classic-trapulators")));
  await page.waitForTimeout(300);

  console.log("[r35 Spy] TAB owns inventory and F remains fullscreen");
  await page.keyboard.press("Tab");await page.waitForTimeout(100);
  let controls=await page.evaluate(()=>({open:Boolean(window.CCGLostSizzlerV141R32SpyOverhaul.state.inventoryOpen),mode:String(mode),shared:UI.inventory.classList.contains("hidden"),signature:window.CCGLostSizzlerV141R35SpyRulesHardening.state.lastControlSignature}));
  assert.equal(controls.open,true,"TAB must open the Spy inventory");assert.equal(controls.mode,"playing","TAB inventory must never switch shared mode away from playing");assert.equal(controls.shared,true,"shared Dungeon inventory must remain hidden");assert.equal(controls.signature,"TAB-INVENTORY|F-FULLSCREEN");
  await page.keyboard.press("Tab");await page.waitForTimeout(100);
  controls=await page.evaluate(()=>({open:Boolean(window.CCGLostSizzlerV141R32SpyOverhaul.state.inventoryOpen),mode:String(mode)}));assert.equal(controls.open,false,"second TAB must close Spy inventory");assert.equal(controls.mode,"playing");
  const fullscreenKey=await page.evaluate(()=>{const original=window.toggleFullscreen;let calls=0;window.toggleFullscreen=()=>{calls++;return true};dispatchEvent(new KeyboardEvent("keydown",{code:"KeyF",key:"f",bubbles:true,cancelable:true}));window.toggleFullscreen=original;return calls});
  assert.equal(fullscreenKey,1,"F must invoke fullscreen exactly once and never open Spy inventory");

  console.log("[r35 Spy] Dungeon shrines and wall switches are purged from Spy");
  const purge=await page.evaluate(()=>{host.shrines=[{id:"shrine-test",type:"shrine",active:true}];host.switches=[{id:"switch-test",type:"switch",active:true}];world.decor.push({id:"decor-shrine-test",kind:"shrine"},{id:"decor-switch-test",kind:"wall-switch"});const removed=window.CCGLostSizzlerV141R35SpyRulesHardening.purgeDungeonOnlyObjects();return{removed,shrines:host.shrines.length,switches:host.switches.length,decor:world.decor.filter(row=>String(row.id||"").includes("-test")).length}});
  assert.ok(purge.removed>=4,`r35 should remove injected Dungeon-only objects: ${JSON.stringify(purge)}`);assert.equal(purge.shrines,0);assert.equal(purge.switches,0);assert.equal(purge.decor,0);

  console.log("[r35 Spy] searchable furniture can award trap charges");
  const trapFixture=await page.evaluate(()=>{
    const hard=window.CCGLostSizzlerV141R35SpyRulesHardening,m=window.CCGLostSizzlerSpecialModes.active.state,me=m.players.find(row=>String(row.id)===String(p1.id))||m.players[0];hard.seedTrapPickups();
    let room=null,item=null;for(const r of m.map.rooms||[]){const found=(r.furniture||[]).find(row=>row.spyR35TrapPickup&&String(row.contents||"").startsWith("trapCharge:"));if(found){room=r;item=found;break}}
    if(!room||!item)throw new Error("no r35 trap-charge furniture seeded");const physical=(host.blockingDecor||[]).find(row=>String(row.logicalFurnitureId||"")===String(item.id));if(!physical)throw new Error("trap-charge furniture has no physical blocker");
    const cell=[[1,0],[-1,0],[0,1],[0,-1]].map(([dx,dy])=>({x:Number(physical.x)+dx,y:Number(physical.y)+dy})).find(q=>world.map?.[q.y]?.[q.x]===0&&!(host.blockingDecor||[]).some(row=>Number(row.x)===q.x&&Number(row.y)===q.y));if(!cell)throw new Error("no open trap-charge search position");
    p1.x=p1.rx=cell.x;p1.y=p1.ry=cell.y;me.x=cell.x;me.y=cell.y;me.roomId=room.id;item.searched=false;const before=Number(me.trapCharges||0);return{id:item.id,before}
  });
  await page.keyboard.press("KeyE");await page.waitForTimeout(900);
  const trapFound=await page.evaluate(id=>{const m=window.CCGLostSizzlerSpecialModes.active.state,me=m.players.find(row=>String(row.id)===String(p1.id))||m.players[0];let item=null;for(const room of m.map.rooms||[]){item=(room.furniture||[]).find(row=>String(row.id)===String(id));if(item)break}return{charges:Number(me.trapCharges||0),searched:Boolean(item?.searched),toast:document.getElementById("spy-r32-objective-toast")?.textContent||"",found:window.CCGLostSizzlerV141R35SpyRulesHardening.state.trapPickupsFound}},trapFixture.id);
  assert.ok(trapFound.charges>trapFixture.before,`searching seeded furniture must increase trap charges: ${JSON.stringify({trapFixture,trapFound})}`);assert.equal(trapFound.searched,true);assert.ok(trapFound.toast.includes("TRAP CHARGE FOUND")||trapFound.found>0,"trap pickup must have explicit player feedback");

  console.log("[r35 Spy] self-only minimap markers are white for P1 and black for P2");
  const markers=await page.evaluate(()=>{
    const m=window.CCGLostSizzlerSpecialModes.active.state,remoteModel=m.players.find(row=>row.id==="R35-SPY-B"),room=m.map.rooms.find(row=>row.id===remoteModel.roomId),physical=world.rooms[Number(room.dungeonRoomId)],x=Math.floor(physical.x+physical.w/2),y=Math.floor(physical.y+physical.h/2);remote.set(remoteModel.id,{...p1,id:remoteModel.id,name:remoteModel.name,x,y,rx:x,ry:y,lastSeen:performance.now(),health:remoteModel.hp,maxHealth:remoteModel.maxHp});window.CCGLostSizzlerV141R34SpyFullscreenUi.refresh(true);return[1,2].map(slot=>{const c=document.querySelector(`.spy-classic-position-map[data-slot="${slot}"]`);return{slot,count:c?.dataset.markerCount,colour:c?.dataset.markerColour,markerSlot:c?.dataset.markerSlot,room:c?.dataset.markerRoom}})});
  assert.deepEqual(markers.map(row=>row.count),["1","1"],"each minimap must contain exactly one self marker and therefore no trail");assert.deepEqual(markers.map(row=>row.colour),["white","black"],"P1 must be white and P2 black");assert.deepEqual(markers.map(row=>row.markerSlot),["1","2"],"each map may identify only its own slot");

  console.log("[r35 Spy] 0 HP becomes ten-second ghost and transfers carried kit");
  const knockoutSetup=await page.evaluate(()=>{
    const m=window.CCGLostSizzlerSpecialModes.active.state,me=m.players.find(row=>String(row.id)===String(p1.id))||m.players[0],victim=m.players.find(row=>row.id==="R35-SPY-B");victim.roomId=me.roomId;victim.hp=1;victim.status="active";victim.hasCase=true;victim.objectives=["joystick"];victim.looseItem="tape";victim.weapon={...window.CCGLostSizzlerSaboteurs.WEAPONS.chicken};victim.counter="raincoat";victim.trapCharges=2;me.weapon=null;me.counter=null;me.trapCharges=0;me.hasCase=false;me.objectives=[];me.looseItem=null;window.CCGLostSizzlerV141R35SpyRulesHardening.refresh();return{beforeEvents:m.events.length}
  });
  await page.waitForTimeout(100);
  const attacked=await page.evaluate(()=>{const m=window.CCGLostSizzlerSpecialModes.active.state,me=m.players.find(row=>String(row.id)===String(p1.id))||m.players[0],victim=m.players.find(row=>row.id==="R35-SPY-B");return window.CCGLostSizzlerSaboteurs.useWeapon(m,me.id,victim.id,Date.now())});
  assert.equal(attacked,true,"real Spy weapon rule must accept the knockout hit");await page.waitForTimeout(180);
  const ghost=await page.evaluate(()=>{const m=window.CCGLostSizzlerSpecialModes.active.state,me=m.players.find(row=>String(row.id)===String(p1.id))||m.players[0],victim=m.players.find(row=>row.id==="R35-SPY-B");return{status:victim.status,hp:victim.hp,remaining:Number(victim.ghostUntil||0)-Date.now(),victimCharges:victim.trapCharges,attackerCharges:me.trapCharges,case:me.hasCase,objectives:[...(me.objectives||[])],weapon:me.weapon?.id||"",counter:me.counter||"",loose:m.looseObjects.filter(row=>String(row.id||"").includes("loose-")).length,processed:window.CCGLostSizzlerV141R35SpyRulesHardening.state.knockoutsProcessed}});
  assert.equal(ghost.status,"ghost","0 HP must enter ghost state instead of ordinary knocked-out state");assert.equal(ghost.hp,0);assert.ok(ghost.remaining>9000&&ghost.remaining<=10000,`ghost should last about 10 seconds, got ${ghost.remaining}ms`);assert.equal(ghost.victimCharges,0,"victim must lose carried trap charges");assert.equal(ghost.attackerCharges,2,"opponent must receive victim trap charges");assert.equal(ghost.case,true,"opponent must receive victim case");assert.ok(ghost.objectives.includes("joystick")&&ghost.objectives.includes("tape"),"opponent must receive victim objective items");assert.equal(ghost.weapon,"chicken","opponent must receive victim weapon");assert.equal(ghost.counter,"raincoat","opponent must receive victim trap counter");assert.ok(ghost.processed>=1,"r35 must process the knockout event");
  const respawn=await page.evaluate(()=>{const hard=window.CCGLostSizzlerV141R35SpyRulesHardening,m=window.CCGLostSizzlerSpecialModes.active.state,victim=m.players.find(row=>row.id==="R35-SPY-B");victim.ghostUntil=Date.now()-1;victim.respawnAt=victim.ghostUntil;const old=victim.roomId;hard.respawnGhosts();return{status:victim.status,hp:victim.hp,old,room:victim.roomId,valid:Boolean(m.map.rooms.find(row=>row.id===victim.roomId)),respawns:hard.state.ghostRespawns}});
  assert.equal(respawn.status,"active");assert.ok(respawn.hp>0);assert.equal(respawn.valid,true,"ghost must respawn into a valid Spy room");assert.ok(respawn.respawns>=1);

  console.log("[r35 Spy] black-canvas watchdog restores the last healthy Spy frame");
  const watchdogReady=await page.evaluate(async()=>{const hard=window.CCGLostSizzlerV141R35SpyRulesHardening;for(let i=0;i<6;i++){window.render();await new Promise(r=>setTimeout(r,110))}return{guard:Boolean(window.render?.__ccgV141R35SpyBlackGuard),ready:hard.state.lastGoodReady,calls:hard.state.renderGuardCalls}});
  assert.equal(watchdogReady.guard,true,"r35 must sit on the active render chain");assert.equal(watchdogReady.ready,true,"watchdog must retain a healthy frame before recovery testing");
  const recovery=await page.evaluate(async()=>{const hard=window.CCGLostSizzlerV141R35SpyRulesHardening,saved=window.render;window.render=function(){ctx.fillStyle="#000";ctx.fillRect(0,0,canvas.width,canvas.height)};await new Promise(r=>setTimeout(r,900));for(let i=0;i<8;i++){window.render();await new Promise(r=>setTimeout(r,90))}const out={recoveries:hard.state.blackRecoveries,black:hard.canvasLooksBlack(),errors:hard.state.renderErrors};window.render=saved;return out});
  assert.ok(recovery.recoveries>=1,`a late all-black renderer must be caught and restored: ${JSON.stringify(recovery)}`);assert.equal(recovery.black,false,"the visible Spy canvas must not remain black after watchdog recovery");

  assert.deepEqual(errors,[],`r35 Spy regression must have no uncaught browser errors: ${errors.join("\n")}`);
  console.log("Lost Sizzler r35 Spy controls, pickups, self maps, ghost capture, object purge and black-screen recovery passed in Chromium.");
  await context.close();
}finally{
  await browser.close();for(const socket of sockets)socket.destroy();await new Promise(resolve=>server.close(()=>resolve()));
}
