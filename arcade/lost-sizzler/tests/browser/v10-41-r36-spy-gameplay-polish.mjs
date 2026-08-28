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
  const context=await browser.newContext({viewport:{width:1600,height:1000}}),page=await context.newPage();page.setDefaultTimeout(45000);
  const errors=[];page.on("pageerror",error=>errors.push(String(error?.stack||error)));
  console.log("[r36 Spy] load canonical page and start real two-player Spy fixture");
  await page.goto(`${origin}/arcade/lost-sizzler/`,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.body.dataset.releaseReady==="true"&&Boolean(window.CCGLostSizzlerV141R32SpyLoader));
  const started=await page.evaluate(()=>{net.setSolo("Agent One");const id=String(net.sessionId);return window.CCGLostSizzlerSpecialModes.startOnline({roomMode:"sizzler-saboteurs",players:[{id,name:"Agent One"},{id:"R36-SPY-B",name:"Agent Two"}],hostId:id,seed:"V141-R36-POLISH",roomCode:"R36SPY"})});
  assert.equal(started,true,"r36 Spy fixture must start through the canonical adapter");
  await page.waitForFunction(()=>document.body.dataset.specialMode==="sizzler-saboteurs"&&Boolean(window.CCGLostSizzlerV141R36SpyGameplayPolish)&&Boolean(window.CCGLostSizzlerV141R35SpyRulesHardening)&&Boolean(window.CCGLostSizzlerV141R32SpyOverhaul)&&Boolean(window.CCGLostSizzlerV141R34SpyFullscreenUi)&&Boolean(document.getElementById("spy-classic-trapulators")));
  await page.waitForFunction(()=>Boolean(window.CCGLostSizzlerEnvironmentAtlasFix?.state?.ready),null,{timeout:15000});
  await page.waitForTimeout(250);

  console.log("[r36 Spy] install a live remote agent and verify melee swing state");
  const combatFixture=await page.evaluate(()=>{
    const m=window.CCGLostSizzlerSpecialModes.active.state,me=m.players.find(row=>String(row.id)===String(p1.id))||m.players[0],victim=m.players.find(row=>row.id==="R36-SPY-B"),logical=m.map.rooms.find(row=>row.id===me.roomId),physical=world.rooms[Number(logical?.dungeonRoomId)];
    if(!physical)throw new Error("r36 combat fixture has no physical room");
    const blocked=(x,y)=>(host.blockingDecor||[]).some(row=>Number(row.x)===x&&Number(row.y)===y);let pair=null;
    for(let y=Math.ceil(physical.y+1);y<Math.floor(physical.y+physical.h-1)&&!pair;y++)for(let x=Math.ceil(physical.x+1);x<Math.floor(physical.x+physical.w-2)&&!pair;x++)if(world.map?.[y]?.[x]===0&&world.map?.[y]?.[x+1]===0&&!blocked(x,y)&&!blocked(x+1,y))pair=[{x,y},{x:x+1,y}];
    if(!pair)throw new Error("r36 combat fixture has no adjacent cells");const [a,b]=pair;
    p1.x=p1.rx=a.x;p1.y=p1.ry=a.y;me.x=a.x;me.y=a.y;me.roomId=logical.id;me.status="active";me.weapon=null;
    remote.set(victim.id,{...p1,id:victim.id,name:victim.name,x:b.x,y:b.y,rx:b.x,ry:b.y,lastSeen:performance.now(),health:6,maxHealth:6});victim.x=b.x;victim.y=b.y;victim.roomId=logical.id;victim.status="active";victim.hp=6;victim.maxHp=6;victim.invulnerableUntil=0;
    const before=Number(p1._meleeSwingAt||0),ok=window.CCGLostSizzlerSaboteurs.useWeapon(m,me.id,victim.id,Date.now());
    return{ok,before,after:Number(p1._meleeSwingAt||0),dir:p1._meleeSwingDir,swings:window.CCGLostSizzlerV141R36SpyGameplayPolish.state.swingAnimations}
  });
  assert.equal(combatFixture.ok,true,"Spy hit must still use the real Saboteurs combat rule");assert.ok(combatFixture.after>combatFixture.before,"accepted Spy hit must stamp the visible melee swing animation");assert.ok(Math.abs(Number(combatFixture.dir?.x||0))+Math.abs(Number(combatFixture.dir?.y||0))>0,"swing animation must carry an attack direction");assert.ok(combatFixture.swings>=1);

  console.log("[r36 Spy] Spy doors expose intermediate animation frames before opening");
  const doorFixture=await page.evaluate(()=>{
    const m=window.CCGLostSizzlerSpecialModes.active.state,me=m.players.find(row=>String(row.id)===String(p1.id))||m.players[0],door=(host.doors||[]).find(row=>row.spyR32Door);if(!door)throw new Error("no r32 Spy door");
    const candidates=[[1,0,"ArrowLeft"],[-1,0,"ArrowRight"],[0,1,"ArrowUp"],[0,-1,"ArrowDown"]].map(([dx,dy,code])=>({x:Number(door.x)+dx,y:Number(door.y)+dy,code})).filter(q=>world.map?.[q.y]?.[q.x]===0&&!(host.blockingDecor||[]).some(row=>Number(row.x)===q.x&&Number(row.y)===q.y));
    const cell=candidates[0];if(!cell)throw new Error("no open cell beside Spy door");const logical=m.map.rooms.find(row=>Number(row.dungeonRoomId)===Number(CCGWorld.roomAt(world,cell.x,cell.y)))||m.map.rooms[0];
    p1.x=p1.rx=cell.x;p1.y=p1.ry=cell.y;me.x=cell.x;me.y=cell.y;me.roomId=logical.id;me.status="active";door.open=false;door.opening=false;door.openingStart=0;door.openAt=0;window.CCGLostSizzlerV141R32SpyOverhaul.state.lastMoveAt=0;return{id:door.id,code:cell.code,guard:Boolean(window.drawDoors?.__ccgV141R36SpyDoors)}
  });
  assert.equal(doorFixture.guard,true,"r36 must own the active Spy door renderer");await page.keyboard.down(doorFixture.code);await page.waitForTimeout(90);await page.keyboard.up(doorFixture.code);
  const opening=await page.evaluate(id=>{const d=host.doors.find(row=>String(row.id)===String(id));window.drawDoors();return{opening:d.opening,open:d.open,frame:Number(d._v141r36Frame),changes:window.CCGLostSizzlerV141R36SpyGameplayPolish.state.doorFrameChanges}},doorFixture.id);
  assert.equal(opening.opening,true,"walking into a closed Spy door must start its animation");assert.ok(opening.frame>=1&&opening.frame<=4,`opening Spy door must render an intermediate atlas frame, got ${opening.frame}`);assert.ok(opening.changes>=1);
  await page.waitForTimeout(360);const opened=await page.evaluate(id=>{const d=host.doors.find(row=>String(row.id)===String(id));window.drawDoors();return{opening:d.opening,open:d.open,frame:Number(d._v141r36Frame)}},doorFixture.id);assert.equal(opened.open,true,"Spy door must finish opening");assert.equal(opened.frame,5,"fully open Spy door must render final atlas frame");

  console.log("[r36 Spy] local Trapulator owns live search progress");
  const searchFixture=await page.evaluate(()=>{
    const m=window.CCGLostSizzlerSpecialModes.active.state,me=m.players.find(row=>String(row.id)===String(p1.id))||m.players[0],physical=(host.blockingDecor||[]).find(row=>row.spyR32Furniture);if(!physical)throw new Error("no Spy furniture");
    const logicalRoom=m.map.rooms.find(row=>(row.furniture||[]).some(item=>String(item.id)===String(physical.logicalFurnitureId))),item=logicalRoom?.furniture?.find(row=>String(row.id)===String(physical.logicalFurnitureId));if(!logicalRoom||!item)throw new Error("cannot map Spy furniture");item.searched=false;
    const cell=[[1,0],[-1,0],[0,1],[0,-1]].map(([dx,dy])=>({x:Number(physical.x)+dx,y:Number(physical.y)+dy})).find(q=>world.map?.[q.y]?.[q.x]===0&&!(host.blockingDecor||[]).some(row=>Number(row.x)===q.x&&Number(row.y)===q.y));if(!cell)throw new Error("no open search cell");
    p1.x=p1.rx=cell.x;p1.y=p1.ry=cell.y;me.x=cell.x;me.y=cell.y;me.roomId=logicalRoom.id;window.CCGLostSizzlerV141R32SpyOverhaul.state.search=null;return{slot:Number(me.slot)||1}
  });
  await page.keyboard.press("KeyE");await page.waitForTimeout(180);
  const searchHud=await page.evaluate(slot=>{window.CCGLostSizzlerV141R36SpyGameplayPolish.updateSearchHud();const n=document.querySelector(`.spy-r36-search[data-slot="${slot}"]`);return{visible:n?.dataset.visible,text:n?.querySelector("em")?.textContent||"",percent:Number(n?.dataset.percent||0),search:Boolean(window.CCGLostSizzlerV141R32SpyOverhaul.state.search)}},searchFixture.slot);
  assert.equal(searchHud.search,true,"E must start the real r32 Spy search");assert.equal(searchHud.visible,"true","Trapulator search meter must be visible while searching");assert.match(searchHud.text,/SEARCHING/);assert.ok(searchHud.percent>0&&searchHud.percent<100,`search meter must show live progress, got ${searchHud.percent}%`);
  await page.waitForTimeout(650);

  console.log("[r36 Spy] door traps trigger from either side of a room transition");
  const trapResult=await page.evaluate(()=>{
    const r36=window.CCGLostSizzlerV141R36SpyGameplayPolish,m=window.CCGLostSizzlerSpecialModes.active.state,victim=m.players.find(row=>row.id==="R36-SPY-B"),edge=m.map.edges?.[0];if(!victim||!edge)throw new Error("no remote victim/edge for r36 trap fixture");
    victim.status="active";victim.hp=victim.maxHp;victim.counter=null;victim.effects={};victim.roomId=edge.a;r36.state.lastRoomByPlayer.set(victim.id,String(edge.a));
    const trap={id:"r36-directional-door-trap",trapId:"custard",ownerId:String(p1.id),roomId:String(edge.a),targetType:"door",targetId:String(edge.id),armed:true,placedAt:Date.now()-1000,detonatesAt:0,x:0,y:0,spyR32Trap:true};m.traps.push(trap);
    victim.roomId=edge.b;const changed=r36.reconcileDoorTraps();return{changed,armed:trap.armed,effect:Number(victim.effects?.["obscure-reveal"]||0)-Date.now(),fallbacks:r36.state.trapFallbacks,room:victim.roomId,trapRoom:trap.roomId}
  });
  assert.equal(trapResult.armed,false,`door trap must fire regardless of travel direction: ${JSON.stringify(trapResult)}`);assert.ok(trapResult.effect>2000,"water-bucket door trap must apply its vision effect");assert.ok(trapResult.fallbacks>=1,"r36 transition fallback must record the door-trap repair");

  console.log("[r36 Spy] ten-second ghost respawn restores full model and physical HP");
  const ghostSetup=await page.evaluate(()=>{
    const m=window.CCGLostSizzlerSpecialModes.active.state,me=m.players.find(row=>String(row.id)===String(p1.id))||m.players[0],victim=m.players.find(row=>row.id==="R36-SPY-B"),logical=m.map.rooms.find(row=>row.id===me.roomId),physical=world.rooms[Number(logical?.dungeonRoomId)];
    const blocked=(x,y)=>(host.blockingDecor||[]).some(row=>Number(row.x)===x&&Number(row.y)===y);let pair=null;for(let y=physical.y+1;y<physical.y+physical.h-1&&!pair;y++)for(let x=physical.x+1;x<physical.x+physical.w-2&&!pair;x++)if(world.map?.[y]?.[x]===0&&world.map?.[y]?.[x+1]===0&&!blocked(x,y)&&!blocked(x+1,y))pair=[{x,y},{x:x+1,y}];if(!pair)throw new Error("no adjacent cells for ghost fixture");
    const [a,b]=pair;p1.x=p1.rx=a.x;p1.y=p1.ry=a.y;me.x=a.x;me.y=a.y;me.roomId=logical.id;me.status="active";me.weapon=null;const live=remote.get(victim.id)||{};remote.set(victim.id,{...live,id:victim.id,name:victim.name,x:b.x,y:b.y,rx:b.x,ry:b.y,lastSeen:performance.now(),health:1,maxHealth:6});victim.x=b.x;victim.y=b.y;victim.roomId=logical.id;victim.maxHp=6;victim.hp=1;victim.status="active";victim.invulnerableUntil=0;return window.CCGLostSizzlerSaboteurs.useWeapon(m,me.id,victim.id,Date.now())
  });
  assert.equal(ghostSetup,true,"lethal Spy hit must be accepted");await page.waitForTimeout(160);
  const ghostState=await page.evaluate(()=>{const v=window.CCGLostSizzlerSpecialModes.active.state.players.find(row=>row.id==="R36-SPY-B");return{status:v.status,hp:v.hp,remaining:Number(v.ghostUntil||0)-Date.now()}});assert.equal(ghostState.status,"ghost");assert.equal(ghostState.hp,0);assert.ok(ghostState.remaining>9000);
  await page.evaluate(()=>{const hard=window.CCGLostSizzlerV141R35SpyRulesHardening,v=window.CCGLostSizzlerSpecialModes.active.state.players.find(row=>row.id==="R36-SPY-B");v.ghostUntil=Date.now()-1;v.respawnAt=v.ghostUntil;hard.respawnGhosts()});await page.waitForTimeout(180);
  const respawn=await page.evaluate(()=>{const r36=window.CCGLostSizzlerV141R36SpyGameplayPolish,m=window.CCGLostSizzlerSpecialModes.active.state,v=m.players.find(row=>row.id==="R36-SPY-B"),live=remote.get(v.id),logical=m.map.rooms.find(row=>row.id===v.roomId),physical=world.rooms[Number(logical?.dungeonRoomId)];return{status:v.status,modelHp:v.hp,modelMax:v.maxHp,liveHp:live?.health,liveMax:live?.maxHealth,inRoom:Boolean(physical&&live.x>=physical.x&&live.x<=physical.x+physical.w&&live.y>=physical.y&&live.y<=physical.y+physical.h),syncs:r36.state.respawnSyncs}});
  assert.equal(respawn.status,"active");assert.equal(respawn.modelHp,respawn.modelMax,"respawned Spy model HP must be full");assert.equal(respawn.liveHp,respawn.liveMax,"respawned physical Spy HP must be full");assert.equal(respawn.liveHp,6,"six-HP Spy must return at 6/6, never 1/6");assert.equal(respawn.inRoom,true,"physical respawn must match the randomly selected logical room");assert.ok(respawn.syncs>=1);

  console.log("[r36 Spy] poisoned movement cooldown self-recovers without freezing the player");
  const movementFixture=await page.evaluate(()=>{
    const api=window.CCGLostSizzlerV141R32SpyOverhaul,m=window.CCGLostSizzlerSpecialModes.active.state,me=m.players.find(row=>String(row.id)===String(p1.id))||m.players[0],logical=m.map.rooms.find(row=>row.id===me.roomId),physical=world.rooms[Number(logical?.dungeonRoomId)],blocked=(x,y)=>(host.blockingDecor||[]).some(row=>Number(row.x)===x&&Number(row.y)===y);let pair=null;
    for(let y=physical.y+1;y<physical.y+physical.h-1&&!pair;y++)for(let x=physical.x+1;x<physical.x+physical.w-2&&!pair;x++)if(world.map?.[y]?.[x]===0&&world.map?.[y]?.[x+1]===0&&!blocked(x,y)&&!blocked(x+1,y))pair=[{x,y},{x:x+1,y}];if(!pair)throw new Error("no open movement lane");const [a]=pair;p1.x=p1.rx=a.x;p1.y=p1.ry=a.y;me.x=a.x;me.y=a.y;me.status="active";api.state.inventoryOpen=false;api.state.search=null;api.state.lastMoveAt=Infinity;return{x:a.x,y:a.y}
  });
  await page.keyboard.down("ArrowRight");await page.waitForTimeout(650);await page.keyboard.up("ArrowRight");await page.waitForTimeout(80);
  const movement=await page.evaluate(()=>({x:Number(p1.x),y:Number(p1.y),cooldownRepairs:window.CCGLostSizzlerV141R36SpyGameplayPolish.state.cooldownRepairs,movementRepairs:window.CCGLostSizzlerV141R36SpyGameplayPolish.state.movementRepairs,lastMoveAt:Number(window.CCGLostSizzlerV141R32SpyOverhaul.state.lastMoveAt)}));
  assert.ok(movement.x>movementFixture.x||movement.y!==movementFixture.y,`poisoned movement cooldown must not permanently freeze Spy: ${JSON.stringify({movementFixture,movement})}`);assert.ok(movement.cooldownRepairs>=1,"r36 must detect and reset the impossible movement cooldown");assert.ok(Number.isFinite(movement.lastMoveAt));

  assert.deepEqual(errors,[],`r36 Spy gameplay polish must have no uncaught browser errors: ${errors.join("\n")}`);
  console.log("Lost Sizzler r36 Spy door/swing, full-health ghost respawn, search HUD, trap and movement-stall regressions passed in Chromium.");
  await context.close();
}finally{
  await browser.close();for(const socket of sockets)socket.destroy();await new Promise(resolve=>server.close(()=>resolve()));
}
