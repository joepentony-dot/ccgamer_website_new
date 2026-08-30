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
    const pathname=decodeURIComponent(new URL(req.url,"http://local").pathname);
    const relative=pathname.endsWith("/")?`${pathname}index.html`:pathname;
    const file=path.resolve(repo,`.${relative}`);
    if(!file.startsWith(`${repo}${path.sep}`)&&file!==repo){res.writeHead(403).end("forbidden");return}
    fs.readFile(file,(error,data)=>{
      if(error){res.writeHead(404,{connection:"close"}).end("not found");return}
      res.writeHead(200,{"content-type":mime[path.extname(file).toLowerCase()]||"application/octet-stream","cache-control":"no-store",connection:"close"});res.end(data)
    });
  }catch(error){res.writeHead(500,{connection:"close"}).end(String(error))}
});
server.on("connection",socket=>{sockets.add(socket);socket.on("close",()=>sockets.delete(socket))});
await new Promise((resolve,reject)=>{server.once("error",reject);server.listen(0,"127.0.0.1",resolve)});
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,args:["--disable-dev-shm-usage","--disable-background-networking","--autoplay-policy=no-user-gesture-required"]});

try{
  const context=await browser.newContext({viewport:{width:1900,height:1000}});
  const page=await context.newPage();page.setDefaultTimeout(45000);
  const errors=[];page.on("pageerror",error=>errors.push(String(error?.stack||error)));

  console.log("[r45 Spy traps] load canonical page");
  await page.goto(`${origin}/arcade/lost-sizzler/`,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.body.dataset.releaseReady==="true"&&Boolean(window.CCGLostSizzlerV141R32SpyLoader));

  console.log("[r45 Spy traps] start real two-player Spy fixture");
  const started=await page.evaluate(()=>{
    net.setSolo("Agent One");const id=String(net.sessionId);
    return window.CCGLostSizzlerSpecialModes.startOnline({roomMode:"sizzler-saboteurs",players:[{id,name:"Agent One"},{id:"R45-SPY-B",name:"Agent Two"}],hostId:id,seed:"V141-R45-TRAP-FX",roomCode:"R45SPY"});
  });
  assert.equal(started,true,"r45 fixture must start through the real Spy adapter");
  await page.waitForFunction(()=>document.body.dataset.specialMode==="sizzler-saboteurs"&&Boolean(window.CCGLostSizzlerV141R32SpyLoader?.state?.trapPresentationLoaded)&&Boolean(window.CCGLostSizzlerV141R45SpyTrapPresentation)&&document.body.dataset.spyR45TrapPresentation==="true");

  console.log("[r45 Spy traps] real BOMB placement gives the placer written and visual confirmation");
  const placed=await page.evaluate(()=>{
    const m=window.CCGLostSizzlerSpecialModes.active.state,api=window.CCGLostSizzlerV141R32SpyOverhaul,r45=window.CCGLostSizzlerV141R45SpyTrapPresentation;
    const me=m.players.find(row=>String(row.id)===String(p1.id))||m.players[0];api.buildOverhaulWorld(false);
    const logical=(m.map.rooms||[]).find(room=>!room.spawn&&!room.extraction&&Number.isFinite(Number(room.dungeonRoomId)));if(!logical)throw new Error("no ordinary Spy room");
    const furniture=(host.blockingDecor||[]).find(row=>row?.spyR32Furniture&&String(row.logicalRoomId||"")===String(logical.id)&&row.logicalFurnitureId);if(!furniture)throw new Error("no r32 Spy furniture");
    const candidates=[{x:furniture.x+1,y:furniture.y},{x:furniture.x-1,y:furniture.y},{x:furniture.x,y:furniture.y+1},{x:furniture.x,y:furniture.y-1}].filter(q=>world.map?.[q.y]?.[q.x]===0&&!(host.blockingDecor||[]).some(row=>Number(row.x)===q.x&&Number(row.y)===q.y)&&(host.doors||[]).every(row=>Number(row.x)!==q.x||Number(row.y)!==q.y));
    const cell=candidates[0];if(!cell)throw new Error("no walkable furniture cell");
    me.roomId=logical.id;me.x=cell.x;me.y=cell.y;me.status="active";me.trapCharges=Math.max(3,Number(me.trapCharges||0));p1.x=p1.rx=cell.x;p1.y=p1.ry=cell.y;r45.clearSlot(1);r45.clearSlot(2);
    const result=api.performAction({actorId:me.id,type:"place-trap",trapId:"powerBrick",target:{type:"furniture",id:String(furniture.logicalFurnitureId),roomId:String(logical.id),x:Number(furniture.x),y:Number(furniture.y),label:String(furniture.label||"FURNITURE")}});r45.processEvents();
    const slot=Number(me.slot||1),fx=document.querySelector(`.spy-r45-trap-fx[data-slot="${slot}"]`),toast=document.getElementById("spy-r32-objective-toast");
    return{kind:String(result?.kind||""),ok:Boolean(result?.ok),visible:fx?.dataset.visible,phase:fx?.dataset.phase,trap:fx?.dataset.trap,title:fx?.querySelector("strong")?.textContent||"",detail:fx?.querySelector("span")?.textContent||"",toast:toast?.textContent||"",count:Number(r45.state.placementVisuals||0)}
  });
  assert.equal(placed.kind,"trap-placed");assert.equal(placed.ok,true);assert.equal(placed.visible,"true");assert.equal(placed.phase,"placed");assert.equal(placed.trap,"powerBrick");
  assert.match(placed.title,/BOMB ARMED/);assert.match(placed.detail,/opponent cannot see/i);assert.match(placed.toast,/TRAP ARMED.*EXPLODING POWER BRICK/i);assert.ok(placed.count>=1);

  console.log("[r45 Spy traps] opponent placement remains secret");
  const secrecy=await page.evaluate(()=>{
    const m=window.CCGLostSizzlerSpecialModes.active.state,r45=window.CCGLostSizzlerV141R45SpyTrapPresentation,me=m.players.find(row=>String(row.id)===String(p1.id))||m.players[0],other=m.players.find(row=>row!==me);if(!other)throw new Error("missing Player 2");
    r45.clearSlot(1);r45.clearSlot(2);const before=Number(r45.state.hiddenRemotePlacements||0),at=Date.now()+101;
    m.events.push({type:"trap-armed",playerId:other.id,trap:{id:`remote-hidden-${at}`,trapId:"spring",ownerId:other.id,x:10,y:10},at});
    r45.processEvents();
    const slot=Number(other.slot||2),fx=document.querySelector(`.spy-r45-trap-fx[data-slot="${slot}"]`);
    return{visible:fx?.dataset.visible,phase:fx?.dataset.phase,before,after:Number(r45.state.hiddenRemotePlacements||0)}
  });
  assert.notEqual(secrecy.visible,"true","opponent must never receive a placement-location visual for the other agent's hidden trap");
  assert.ok(secrecy.after>secrecy.before,"remote placement must be observed and deliberately suppressed");

  console.log("[r45 Spy traps] Player 2 springs a real SPRING and gets written + visual victim feedback");
  const spring=await page.evaluate(()=>{
    const m=window.CCGLostSizzlerSpecialModes.active.state,r36=window.CCGLostSizzlerV141R36SpyPerfection,r45=window.CCGLostSizzlerV141R45SpyTrapPresentation,packet=window.CCGLostSizzlerV141R32SpyPacketOwner,owner=m.players.find(row=>String(row.id)===String(p1.id))||m.players[0],victim=m.players.find(row=>row!==owner);if(!victim)throw new Error("no Player 2 model");
    r45.clearSlot(1);r45.clearSlot(2);victim.status="active";victim.hp=victim.maxHp=6;victim.effects={};
    const logical=m.map.rooms.find(room=>!room.spawn&&!room.extraction)||m.map.rooms[0],physical=world.rooms[Number(logical.dungeonRoomId)];if(!physical)throw new Error("no physical Spy room");
    const cells=[];for(let y=physical.y+1;y<physical.y+physical.h;y++)for(let x=physical.x+1;x<physical.x+physical.w;x++)if(world.map?.[y]?.[x]===0&&!(host.blockingDecor||[]).some(row=>Number(row.x)===x&&Number(row.y)===y)&&(host.doors||[]).every(row=>Number(row.x)!==x||Number(row.y)!==y))cells.push({x,y});
    const cell=cells[0];if(!cell)throw new Error("no safe floor cell");victim.roomId=logical.id;victim.x=cell.x;victim.y=cell.y;
    const live={...p1,id:victim.id,name:victim.name,x:cell.x,y:cell.y,rx:cell.x,ry:cell.y,health:6,maxHealth:6,lastSeen:performance.now()};remote.set(victim.id,live);
    const trap={id:`r45-spring-${Date.now()}`,trapId:"spring",ownerId:owner.id,roomId:logical.id,targetType:"floor",targetId:`floor:${cell.x},${cell.y}`,armed:true,placedAt:Date.now()-1000,detonatesAt:0,x:cell.x,y:cell.y,spyR32Trap:true};m.traps.push(trap);
    r36.state.roomById.set(String(victim.id),String(logical.id));const before=Number(victim.hp);r36.reconcileRemoteTraps();r36.processTrapEvents();r45.processEvents();packet.renderClassicUi(true);
    const slot=Number(victim.slot||2),fx=document.querySelector(`.spy-r45-trap-fx[data-slot="${slot}"]`),classic=document.querySelector(`.spy-classic-hit[data-slot="${slot}"]`);
    return{armed:Boolean(trap.armed),before,after:Number(victim.hp),liveHp:Number(live.health),slow:Number(victim.effects?.slow||0),visible:fx?.dataset.visible,tone:fx?.dataset.tone,title:fx?.querySelector("strong")?.textContent||"",detail:fx?.querySelector("span")?.textContent||"",classicVisible:classic?.dataset.visible,classicText:classic?.textContent||"",remoteVisuals:Number(r45.state.remoteVictimVisuals||0)}
  });
  assert.equal(spring.armed,false);assert.ok(spring.after<spring.before);assert.equal(spring.liveHp,spring.after);assert.ok(spring.slow>Date.now());
  assert.equal(spring.visible,"true");assert.equal(spring.tone,"spring");assert.match(spring.title,/SPRING!/);assert.match(spring.detail,/SLOWED/);assert.equal(spring.classicVisible,"true");assert.match(spring.classicText,/SPRING/i);assert.ok(spring.remoteVisuals>=1);

  console.log("[r45 Spy traps] BOMB has a distinct explosion treatment and written consequence");
  const bomb=await page.evaluate(()=>{
    const m=window.CCGLostSizzlerSpecialModes.active.state,r45=window.CCGLostSizzlerV141R45SpyTrapPresentation,me=m.players.find(row=>String(row.id)===String(p1.id))||m.players[0];r45.clearSlot(1);r45.clearSlot(2);const at=Date.now()+202;
    const event={type:"trap-triggered",victimId:me.id,playerId:me.id,trapType:"powerBrick",trapId:`bomb-${at}`,at};m.events.push(event);r45.processEvents();const slot=Number(me.slot||1),fx=document.querySelector(`.spy-r45-trap-fx[data-slot="${slot}"]`);
    return{visible:fx?.dataset.visible,tone:fx?.dataset.tone,title:fx?.querySelector("strong")?.textContent||"",detail:fx?.querySelector("span")?.textContent||""}
  });
  assert.equal(bomb.visible,"true");assert.equal(bomb.tone,"bomb");assert.match(bomb.title,/BOMB!/);assert.match(bomb.detail,/ITEMS DROPPED/);

  console.log("[r45 Spy traps] WATER BUCKET visibly splashes/obscures and writes the vision effect");
  const water=await page.evaluate(()=>{
    const m=window.CCGLostSizzlerSpecialModes.active.state,r36=window.CCGLostSizzlerV141R36SpyPerfection,r45=window.CCGLostSizzlerV141R45SpyTrapPresentation,me=m.players.find(row=>String(row.id)===String(p1.id))||m.players[0];r45.clearSlot(1);r45.clearSlot(2);me.effects={};const at=Date.now()+303;
    m.events.push({type:"trap-triggered",victimId:me.id,playerId:me.id,trapType:"custard",trapId:`water-${at}`,at});r36.processTrapEvents();r45.processEvents();
    const slot=Number(me.slot||1),fx=document.querySelector(`.spy-r45-trap-fx[data-slot="${slot}"]`),drops=fx?.querySelector(".spy-r45-drops"),style=fx?getComputedStyle(fx):null;
    return{visible:fx?.dataset.visible,tone:fx?.dataset.tone,title:fx?.querySelector("strong")?.textContent||"",detail:fx?.querySelector("span")?.textContent||"",drops:drops?getComputedStyle(drops).display:"none",backdrop:String(style?.backdropFilter||style?.webkitBackdropFilter||""),slow:Number(me.effects?.slow||0),vision:Number(me.effects?.["obscure-reveal"]||0)}
  });
  assert.equal(water.visible,"true");assert.equal(water.tone,"water");assert.match(water.title,/WATER BUCKET!/);assert.match(water.detail,/VISION HIT/);assert.equal(water.drops,"block");assert.ok(water.backdrop&&water.backdrop!=="none");assert.ok(water.slow>Date.now()&&water.vision>Date.now());

  assert.deepEqual(errors,[],`r45 Spy trap presentation must not throw browser errors: ${errors.join("\n")}`);
  console.log("Lost Sizzler V10.41 r45 Spy trap presentation Chromium regression passed.");
}finally{
  await browser.close();for(const socket of sockets)socket.destroy();await new Promise(resolve=>server.close(resolve));
}
