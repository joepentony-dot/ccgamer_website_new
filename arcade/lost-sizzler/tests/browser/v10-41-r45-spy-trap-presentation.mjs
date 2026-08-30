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
  const context=await browser.newContext({viewport:{width:1900,height:1000}}),page=await context.newPage();page.setDefaultTimeout(45000);const errors=[];page.on("pageerror",error=>errors.push(String(error?.stack||error)));
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
    const me=m.players.find(row=>String(row.id)===String(p1.id))||m.players[0];
    api.buildOverhaulWorld(false);
    const logical=(m.map.rooms||[]).find(room=>!room.spawn&&!room.extraction&&Number.isFinite(Number(room.dungeonRoomId)));
    if(!logical)throw new Error("no ordinary Spy room for placement fixture");
    const furniture=(host.blockingDecor||[]).find(row=>row?.spyR32Furniture&&String(row.logicalRoomId||"")===String(logical.id)&&row.logicalFurnitureId);
    if(!furniture)throw new Error("no r32 Spy furniture for placement fixture");
    const candidates=[{x:furniture.x+1,y:furniture.y},{x:furniture.x-1,y:furniture.y},{x:furniture.x,y:furniture.y+1},{x:furniture.x,y:furniture.y-1}].filter(q=>world.map?.[q.y]?.[q.x]===0&&!(host.blockingDecor||[]).some(row=>Number(row.x)===q.x&&Number(row.y)===q.y)&&(host.doors||[]).every(row=>Number(row.x)!==q.x||Number(row.y)!==q.y));
    const cell=candidates[0];if(!cell)throw new Error("no walkable adjacent furniture cell for placement fixture");
    me.roomId=logical.id;me.x=cell.x;me.y=cell.y;me.status="active";me.trapCharges=Math.max(3,Number(me.trapCharges||0));p1.x=p1.rx=cell.x;p1.y=p1.ry=cell.y;
    r45.clearSlot(1);r45.clearSlot(2);
    const result=api.performAction({actorId:me.id,type:"place-trap",trapId:"powerBrick",target:{type:"furniture",id:String(furniture.logicalFurnitureId),roomId:String(logical.id),x:Number(furniture.x),y:Number(furniture.y),label:String(furniture.label||"FURNITURE")}});
    r45.processEvents();
    const slot=Number(me.slot||1),fx=document.querySelector(`.spy-r45-trap-fx[data-slot="${slot}"]`),toast=document.getElementById("spy-r32-objective-toast");
    return{kind:String(result?.kind||""),ok:Boolean(result?.ok),slot,visible:fx?.dataset.visible,phase:fx?.dataset.phase,trap:fx?.dataset.trap,title:fx?.querySelector("strong")?.textContent||"",detail:fx?.querySelector("span")?.textContent||"",toast:toast?.textContent||"",placementVisuals:Number(r45.state.placementVisuals||0)}
  });
  assert.equal(placed.kind,"trap-placed","real Spy action path must accept the valid BOMB placement");
  assert.equal(placed.ok,true,"valid BOMB placement must succeed");
  assert.equal(placed.visible,"true","placer slot must receive a placement visual");
  assert.equal(placed.phase,"placed","placement visual must be distinguishable from a triggered trap");
  assert.equal(placed.trap,"powerBrick","placement visual must identify the armed BOMB");
  assert.match(placed.title,/BOMB ARMED/,"placement visual must name the armed trap");
  assert.match(placed.detail,/opponent cannot see/i,"placement visual must explain that the trap remains hidden");
  assert.match(placed.toast,/TRAP ARMED.*EXPLODING POWER BRICK/i,"existing written Spy result must remain visible alongside r45 presentation");
  assert.ok(placed.placementVisuals>=1,"r45 diagnostics must record the placement visual");

  console.log("[r45 Spy traps] opponent placement remains secret");
  const secrecySetup=await page.evaluate(()=>{
    const m=window.CCGLostSizzlerSpecialModes.active.state,r45=window.CCGLostSizzlerV141R45SpyTrapPresentation,me=m.players.find(row=>String(row.id)===String(p1.id))||m.players[0],other=m.players.find(row=>row!==me);if(!other)throw new Error("missing Player 2");
    r45.clearSlot(1);r45.clearSlot(2);const at=Date.now()+101;m.events.push({type:"trap-armed",playerId:other.id,trap:{id:`remote-hidden-${at}`,trapId:"spring",ownerId:other.id,x:10,y:10},at});return{otherSlot:Number(other.slot||2),before:Number(r45.state.hiddenRemotePlacements||0)}
  });
  await page.waitForTimeout(100);
  const secrecy=await page.evaluate(otherSlot=>{
    const r45=window.CCGLostSizzlerV141R45SpyTrapPresentation,fx=document.querySelector(`.spy-r45-trap-fx[data-slot="${otherSlot}"]`);return{visible:fx?.dataset.visible,phase:fx?.dataset.phase,after:Number(r45.state.hiddenRemotePlacements||0)}
  },secrecySetup.otherSlot);
  assert.notEqual(secrecy.visible,"true","opponent must never receive a placement-location visual for the other agent's hidden trap");
  assert.ok(secrecy.after>secrecySetup.before,"hidden remote placement must be explicitly observed and suppressed");

  console.log("[r45 Spy traps] Player 2 springs a real SPRING and gets written + visual victim feedback");
  const spring=await page.evaluate(()=>{
    const m=window.CCGLostSizzlerSpecialModes.active.state,r36=window.CCGLostSizzlerV141R36SpyPerfection,r45=window.CCGLostSizzlerV141R45SpyTrapPresentation,packet=window.CCGLostSizzlerV141R32SpyPacketOwner,owner=m.players.find(row=>String(row.id)===String(p1.id))||m.players[0],victim=m.players.find(row=>row!==owner);if(!victim)throw new Error("no Player 2 model");
    r45.clearSlot(1);r45.clearSlot(2);victim.status="active";victim.hp=victim.maxHp=6;victim.effects={};
    const logical=m.map.rooms.find(room=>!room.spawn&&!room.extraction)||m.map.rooms[0],physical=world.rooms[Number(logical.dungeonRoomId)];if(!physical)throw new Error("no physical Spy room for Player 2");
    const candidates=[];for(let y=physical.y+1;y<physical.y+physical.h;y++)for(let x=physical.x+1;x<physical.x+physical.w;x++)if(world.map?.[y]?.[x]===0&&!(host.blockingDecor||[]).some(row=>Number(row.x)===x&&Number(row.y)===y)&&(host.doors||[]).every(row=>Number(row.x)!==x||Number(row.y)!==y))candidates.push({x,y});const cell=candidates[0];if(!cell)throw new Error("no safe floor cell for Player 2 trap fixture");
    victim.roomId=logical.id;victim.x=cell.x;victim.y=cell.y;const live={...p1,id:victim.id,name:victim.name,x:cell.x,y:cell.y,rx:cell.x,ry:cell.y,health:6,maxHealth:6,lastSeen:performance.now()};remote.set(victim.id,live);
    const placed={id:`r45-spring-${Date.now()}`,trapId:"spring",ownerId:owner.id,roomId:logical.id,targetType:"floor",targetId:`floor:${cell.x},${cell.y}`,armed:true,placedAt:Date.now()-1000,detonatesAt:0,x:cell.x,y:cell.y,spyR32Trap:true};m.traps.push(placed);
    r36.state.roomById.set(String(victim.id),String(logical.id));const before=Number(victim.hp);r36.reconcileRemoteTraps();r36.processTrapEvents();r45.processEvents();packet.renderClassicUi(true);
    const slot=Number(victim.slot||2),fx=document.querySelector(`.spy-r45-trap-fx[data-slot="${slot}"]`),classic=document.querySelector(`.spy-classic-hit[data-slot="${slot}"]`);
    return{slot,armed:Boolean(placed.armed),before,after:Number(victim.hp),liveHp:Number(live.health),slow:Number(victim.effects?.slow||0),fxVisible:fx?.dataset.visible,fxTone:fx?.dataset.tone,fxTitle:fx?.querySelector("strong")?.textContent||"",fxDetail:fx?.querySelector("span")?.textContent||"",classicVisible:classic?.dataset.visible,classicText:classic?.textContent||"",remoteVisuals:Number(r45.state.remoteVictimVisuals||0)}
  });
  assert.equal(spring.armed,false,"Player 2 stepping onto the trap must actually spring it");
  assert.ok(spring.after<spring.before,"SPRING must damage Player 2 rules HP");
  assert.equal(spring.liveHp,spring.after,"SPRING damage must reach Player 2 physical HP");
  assert.ok(spring.slow>Date.now(),"SPRING must apply its timed slowdown to Player 2");
  assert.equal(spring.fxVisible,"true","Player 2 half must receive the r45 visual effect");
  assert.equal(spring.fxTone,"spring","Player 2 visual must use the dedicated SPRING treatment");
  assert.match(spring.fxTitle,/SPRING!/,"Player 2 visual must name the trap");
  assert.match(spring.fxDetail,/SLOWED/,"Player 2 visual must write the gameplay effect");
  assert.equal(spring.classicVisible,"true","existing Player 2 written hit overlay must remain visible");
  assert.match(spring.classicText,/SPRING/i,"existing Player 2 written overlay must name the triggered trap");
  assert.ok(spring.remoteVisuals>=1,"remote-victim presentation must be tracked");

  console.log("[r45 Spy traps] BOMB has a distinct explosion treatment and written consequence");
  const bomb=await page.evaluate(()=>{
    const m=window.CCGLostSizzlerSpecialModes.active.state,r36=window.CCGLostSizzlerV141R36SpyPerfection,r45=window.CCGLostSizzlerV141R45SpyTrapPresentation,me=m.players.find(row=>String(row.id)===String(p1.id))||m.players[0];r45.clearSlot(1);r45.clearSlot(2);
    const at=Date.now()+202;m.events.push({type:"trap-triggered",victimId:me.id,playerId:me.id,trapType:"powerBrick",trapId:`bomb-${at}`,at});r36.processTrapEvents();r45.processEvents();const slot=Number(me.slot||1),fx=document.querySelector(`.spy-r45-trap-fx[data-slot="${slot}"]`);return{visible:fx?.dataset.visible,tone:fx?.dataset.tone,title:fx?.querySelector("strong")?.textContent||"",detail:fx?.querySelector("span")?.textContent||""}
  });
  assert.equal(bomb.visible,"true","BOMB trigger must show its victim effect");
  assert.equal(bomb.tone,"bomb","BOMB must use its own explosion presentation");
  assert.match(bomb.title,/BOMB!/,"BOMB trigger must be named in writing");
  assert.match(bomb.detail,/ITEMS DROPPED/,"BOMB trigger must state its item-drop consequence");

  console.log("[r45 Spy traps] WATER BUCKET visibly splashes/obscures and writes the vision effect");
  const water=await page.evaluate(()=>{
    const m=window.CCGLostSizzlerSpecialModes.active.state,r36=window.CCGLostSizzlerV141R36SpyPerfection,r45=window.CCGLostSizzlerV141R45SpyTrapPresentation,me=m.players.find(row=>String(row.id)===String(p1.id))||m.players[0];r45.clearSlot(1);r45.clearSlot(2);me.effects={};
    const at=Date.now()+303;m.events.push({type:"trap-triggered",victimId:me.id,playerId:me.id,trapType:"custard",trapId:`water-${at}`,at});r36.processTrapEvents();r45.processEvents();const slot=Number(me.slot||1),fx=document.querySelector(`.spy-r45-trap-fx[data-slot="${slot}"]`),drops=fx?.querySelector(".spy-r45-drops"),style=fx?getComputedStyle(fx):null;return{visible:fx?.dataset.visible,tone:fx?.dataset.tone,title:fx?.querySelector("strong")?.textContent||"",detail:fx?.querySelector("span")?.textContent||"",drops:drops?getComputedStyle(drops).display:"none",backdrop:String(style?.backdropFilter||style?.webkitBackdropFilter||""),slow:Number(me.effects?.slow||0),vision:Number(me.effects?.["obscure-reveal"]||0)}
  });
  assert.equal(water.visible,"true","WATER BUCKET trigger must show its victim effect");
  assert.equal(water.tone,"water","WATER BUCKET must use its own splash presentation");
  assert.match(water.title,/WATER BUCKET!/,"WATER BUCKET trigger must be named in writing");
  assert.match(water.detail,/VISION HIT/,"WATER BUCKET trigger must state its vision consequence");
  assert.equal(water.drops,"block","WATER BUCKET must display the animated splash/rain layer");
  assert.ok(water.backdrop&&water.backdrop!=="none","WATER BUCKET must visibly alter the victim view while active");
  assert.ok(water.slow>Date.now()&&water.vision>Date.now(),"WATER BUCKET must retain its real timed slow and vision effects");

  assert.deepEqual(errors,[],`r45 Spy trap presentation must not throw browser errors: ${errors.join("\n")}`);
  console.log("Lost Sizzler V10.41 r45 Spy trap presentation Chromium regression passed.");
}finally{
  await browser.close();for(const socket of sockets)socket.destroy();await new Promise(resolve=>server.close(resolve));
}
