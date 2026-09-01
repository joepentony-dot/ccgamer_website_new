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
  const context=await browser.newContext({viewport:{width:1800,height:1000}}),page=await context.newPage();page.setDefaultTimeout(45000);const errors=[];page.on("pageerror",error=>errors.push(String(error?.stack||error)));
  console.log("[r58 hardening] load canonical page and start host Spy fixture");
  await page.goto(`${origin}/arcade/lost-sizzler/`,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.body.dataset.releaseReady==="true"&&Boolean(window.CCGLostSizzlerV141R32SpyLoader));
  const started=await page.evaluate(()=>{net.setSolo("Agent One");const id=String(net.sessionId);return window.CCGLostSizzlerSpecialModes.startOnline({roomMode:"sizzler-saboteurs",players:[{id,name:"Agent One"},{id:"R58-HARD-B",name:"Agent Two"}],hostId:id,seed:"V141-R58-SEARCH-CLOCK",roomCode:"R58HC"})});
  assert.equal(started,true);
  await page.waitForFunction(()=>document.body.dataset.specialMode==="sizzler-saboteurs"&&Boolean(window.CCGLostSizzlerV141R58SpyOverhaul)&&Boolean(window.CCGLostSizzlerSpecialModes.active?.state?.r58Rules));

  console.log("[r58 hardening] arm a real furniture BOMB through the live T key");
  const fixture=await page.evaluate(()=>{
    const m=window.CCGLostSizzlerSpecialModes.active.state,r32=window.CCGLostSizzlerV141R32SpyOverhaul,r58=window.CCGLostSizzlerV141R58SpyOverhaul;r32.buildOverhaulWorld(false);r58.tick();
    const owner=m.players.find(row=>String(row.id)===String(p1.id))||m.players[0],victim=m.players.find(row=>row!==owner),room=(m.map.rooms||[]).find(row=>!row.spawn&&!row.extraction&&Number.isFinite(Number(row.dungeonRoomId))),physical=(host.blockingDecor||[]).find(row=>row?.spyR32Furniture&&String(row.logicalRoomId||"")===String(room?.id||"")&&row.logicalFurnitureId);
    if(!room||!physical||!victim)throw new Error("R58 hardening fixture unavailable");
    const cell=[[1,0],[-1,0],[0,1],[0,-1]].map(([dx,dy])=>({x:Number(physical.x)+dx,y:Number(physical.y)+dy})).find(q=>world.map?.[q.y]?.[q.x]===0&&!(host.blockingDecor||[]).some(row=>Number(row.x)===q.x&&Number(row.y)===q.y)&&(host.doors||[]).every(row=>Number(row.x)!==q.x||Number(row.y)!==q.y));if(!cell)throw new Error("no open furniture neighbour");
    owner.roomId=room.id;owner.status="active";owner.hp=owner.maxHp=6;owner.trapCharges=5;owner.timeRemainingMs=500000;p1.x=p1.rx=cell.x;p1.y=p1.ry=cell.y;owner.x=cell.x;owner.y=cell.y;
    victim.roomId=room.id;victim.status="active";victim.hp=victim.maxHp=6;victim.counter=null;victim.timeRemainingMs=500000;
    r32.selectTrap(0);document.getElementById("game")?.focus?.();return{ownerId:String(owner.id),victimId:String(victim.id),furnitureId:String(physical.logicalFurnitureId),before:Number(m.traps?.length||0)}
  });
  await page.keyboard.press("KeyT");
  await page.waitForFunction(before=>Number(window.CCGLostSizzlerSpecialModes.active.state.traps?.length||0)>before,fixture.before);

  console.log("[r58 hardening] owner search bypasses their own trap but leaves it armed");
  const ownerSearch=await page.evaluate(({ownerId,furnitureId})=>{
    const m=window.CCGLostSizzlerSpecialModes.active.state,r58=window.CCGLostSizzlerV141R58SpyOverhaul,owner=m.players.find(row=>String(row.id)===ownerId),trap=m.traps.find(row=>row.armed&&String(row.ownerId)===ownerId&&row.targetType==="furniture"&&String(row.targetId)===furnitureId),before=Number(r58.state.ownerTrapIgnores||0);if(!owner||!trap)throw new Error("armed owner furniture trap missing");
    const result=window.CCGLostSizzlerSaboteurs.searchFurniture(m,owner.id,furnitureId,Date.now());return{result,armed:Boolean(trap.armed),status:String(owner.status),before,after:Number(r58.state.ownerTrapIgnores||0),routes:Number(r58.state.furnitureTrapRoutes||0)}
  },fixture);
  assert.notEqual(ownerSearch.result?.trapped,true,"owner search must not spring their own trap");assert.equal(ownerSearch.armed,true,"owner search must leave their trap armed for the opponent");assert.equal(ownerSearch.status,"active");assert.ok(ownerSearch.after>ownerSearch.before);assert.ok(ownerSearch.routes>=1);

  console.log("[r58 hardening] opponent search routes through R58 lethal trap authority");
  const opponentSearch=await page.evaluate(({victimId,furnitureId})=>{
    const m=window.CCGLostSizzlerSpecialModes.active.state,r58=window.CCGLostSizzlerV141R58SpyOverhaul,victim=m.players.find(row=>String(row.id)===victimId),trap=m.traps.find(row=>row.armed&&row.targetType==="furniture"&&String(row.targetId)===furnitureId);if(!victim||!trap)throw new Error("armed opponent furniture trap missing");
    victim.status="active";victim.hp=victim.maxHp=6;victim.counter=null;victim.timeRemainingMs=500000;const before=Number(victim.timeRemainingMs),result=window.CCGLostSizzlerSaboteurs.searchFurniture(m,victim.id,furnitureId,Date.now());r58.observeDeaths();return{trapped:Boolean(result?.trapped),armed:Boolean(trap.armed),status:String(victim.status),hp:Number(victim.hp),penalty:before-Number(victim.timeRemainingMs),deathKind:String(victim.r58Death?.kind||""),trapId:String(victim.r58Death?.trapId||""),legacyRemaining:Number(victim.ghostUntil||0)-Date.now(),r58Remaining:Number(victim.r58RespawnAt||0)-Date.now(),routes:Number(r58.state.furnitureTrapRoutes||0)}
  },fixture);
  assert.equal(opponentSearch.trapped,true);assert.equal(opponentSearch.armed,false);assert.equal(opponentSearch.status,"ghost");assert.equal(opponentSearch.hp,0);assert.equal(opponentSearch.penalty,30000);assert.equal(opponentSearch.deathKind,"trap");assert.equal(opponentSearch.trapId,"powerBrick");assert.ok(opponentSearch.legacyRemaining>9000&&opponentSearch.legacyRemaining<=10000,`legacy marker should remain about ten seconds, got ${opponentSearch.legacyRemaining}`);assert.ok(opponentSearch.r58Remaining>2400&&opponentSearch.r58Remaining<=2800,`R58 live respawn must remain short, got ${opponentSearch.r58Remaining}`);assert.ok(opponentSearch.routes>=2);

  console.log("[r58 hardening] guest normalisation preserves inherited host clocks");
  const inherited=await page.evaluate(()=>{
    const active=window.CCGLostSizzlerSpecialModes.active,m=active.state,r58=window.CCGLostSizzlerV141R58SpyOverhaul;active.authoritative=false;m.r58Rules=true;m.players[0].timeRemainingMs=412345;m.players[1].timeRemainingMs=287654;m.r58ClockAt=Date.now()-250;r58.state.matchKey="";const before=m.players.map(row=>Number(row.timeRemainingMs)),count=Number(r58.state.inheritedClockPreserves||0);r58.normaliseMatch(m,Date.now());return{before,after:m.players.map(row=>Number(row.timeRemainingMs)),authoritative:Boolean(active.authoritative),count,afterCount:Number(r58.state.inheritedClockPreserves||0)}
  });
  assert.equal(inherited.authoritative,false);assert.deepEqual(inherited.after,inherited.before,"guest must inherit host personal clocks rather than resetting to 10:00");assert.ok(inherited.afterCount>inherited.count);

  assert.deepEqual(errors,[],`R58 search/clock hardening must not throw browser errors: ${errors.join("\n")}`);
  console.log("Lost Sizzler V10.41 r58 furniture-search and inherited-clock hardening passed in Chromium.");
}finally{
  await browser.close();for(const socket of sockets)socket.destroy();await new Promise(resolve=>server.close(resolve));
}
