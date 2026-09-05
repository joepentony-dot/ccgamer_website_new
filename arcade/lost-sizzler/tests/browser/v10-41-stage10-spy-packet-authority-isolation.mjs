import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {chromium} from "playwright";

const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,"../../../..");
const networkSource=fs.readFileSync(path.join(repo,"arcade/lost-sizzler/js/v10-41-r29-spy-network-isolation.js"),"utf8");
assert.match(networkSource,/PACKET="v141_spy_position"/,"Stage 10 Spy transport must retain a dedicated packet type");
assert.doesNotMatch(networkSource,/processRemoteMovement\s*\(/,"Spy transport must never call Dungeon remote movement processing");
assert.match(networkSource,/payload\?\.roomMode!==MODE_ID/,"Spy packet admission must reject non-Spy room modes");
assert.match(networkSource,/if\(!spyActive\(\)\|\|payload\?\.roomMode!==MODE_ID\)return false/,"Spy packets must fail closed outside an active Spy match");

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
      res.end(data)
    });
  }catch(error){res.writeHead(500,{connection:"close"}).end(String(error))}
});
server.on("connection",socket=>{sockets.add(socket);socket.on("close",()=>sockets.delete(socket))});
await new Promise((resolve,reject)=>{server.once("error",reject);server.listen(0,"127.0.0.1",resolve)});
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,args:["--disable-dev-shm-usage","--disable-background-networking","--autoplay-policy=no-user-gesture-required"]});

try{
  const context=await browser.newContext({viewport:{width:1600,height:900}});
  const page=await context.newPage();
  page.setDefaultTimeout(45000);
  const errors=[];
  page.on("pageerror",error=>errors.push(String(error?.stack||error)));

  console.log("[Stage 10 Spy packet isolation] load canonical page and start real Spy match");
  await page.goto(`${origin}/arcade/lost-sizzler/`,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.body.dataset.releaseReady==="true"&&Boolean(window.CCGLostSizzlerSpecialModes)&&Boolean(window.CCGLostSizzlerV141R29SpyNetwork)&&typeof quitToMenu==="function",null,{timeout:90000});
  const started=await page.evaluate(()=>{
    net.setSolo("Packet Agent");
    const id=String(net.sessionId);
    return window.CCGLostSizzlerSpecialModes.startOnline({
      roomMode:"sizzler-saboteurs",
      players:[{id,name:"Packet Agent"},{id:"STAGE10-PACKET-B",name:"Packet Rival"}],
      hostId:id,
      seed:"STAGE10-SPY-PACKET",
      roomCode:"S10PKT"
    })
  });
  assert.equal(started,true,"Stage 10 packet fixture must start through the real special-mode adapter");
  await page.waitForFunction(()=>document.body.dataset.specialMode==="sizzler-saboteurs"&&document.body.dataset.modeController==="spy-online"&&Boolean(window.CCGLostSizzlerV141R29SpyEngine?.state?.isolated)&&Boolean(window.CCGLostSizzlerV141R29SpyNetwork));

  const baseline=await page.evaluate(()=>{
    const active=window.CCGLostSizzlerSpecialModes.active,m=active.state,network=window.CCGLostSizzlerV141R29SpyNetwork;
    const me=m.players.find(row=>String(row.id)===String(p1.id))||m.players[0],other=m.players.find(row=>row!==me);
    const room=m.map.rooms.find(row=>Number.isFinite(Number(row.dungeonRoomId)))||m.map.rooms[0];
    const physical=world.rooms[Number(room.dungeonRoomId)];
    const x=Math.floor(Number(physical.x)+Number(physical.w)/2),y=Math.floor(Number(physical.y)+Number(physical.h)/2);
    me.roomId=room.id;me.x=x;me.y=y;p1.x=p1.rx=x;p1.y=p1.ry=y;
    other.roomId=room.id;other.x=x+1;other.y=y;
    remote.delete(other.id);
    const originalMembers=net.getMembers;
    net.getMembers=()=>[{id:String(me.id)},{id:String(other.id)}];
    window.__CCG_STAGE10_PACKET_ORIGINAL_MEMBERS__=originalMembers;
    return{
      meId:String(me.id),otherId:String(other.id),roomId:String(room.id),x,y,
      localX:Number(p1.x),localY:Number(p1.y),entered:JSON.stringify(host.enteredRoomIds||[]),
      received:Number(network.state.received||0),dropped:Number(network.state.dropped||0),timer:Number(network.state.timer||0),installed:Boolean(network.state.installed)
    }
  });
  assert.ok(baseline.timer>0,"dedicated Spy heartbeat must exist while Spy is active");
  assert.equal(baseline.installed,true,"dedicated Spy packet owner must be installed while Spy is active");

  console.log("[Stage 10 Spy packet isolation] reject non-Spy and unadmitted packets without runtime contamination");
  const rejected=await page.evaluate(base=>{
    const network=window.CCGLostSizzlerV141R29SpyNetwork;
    const wrongMode=network.applyPosition({roomMode:"dungeon",actorId:base.otherId,player:{id:base.otherId,x:base.x+2,y:base.y}});
    const unknown=network.applyPosition({roomMode:"sizzler-saboteurs",actorId:"STAGE10-NOT-A-MEMBER",player:{id:"STAGE10-NOT-A-MEMBER",x:base.x+2,y:base.y},sentAt:Date.now()});
    return{wrongMode,unknown,unknownPresent:remote.has("STAGE10-NOT-A-MEMBER"),otherPresent:remote.has(base.otherId),dropped:Number(network.state.dropped||0),localX:Number(p1.x),localY:Number(p1.y),entered:JSON.stringify(host.enteredRoomIds||[])}
  },baseline);
  assert.equal(rejected.wrongMode,false,"non-Spy room packet must be rejected");
  assert.equal(rejected.unknown,false,"unadmitted Spy actor must be rejected");
  assert.equal(rejected.unknownPresent,false,"rejected actor must not enter remote state");
  assert.equal(rejected.otherPresent,false,"wrong-mode packet must not create the legitimate rival either");
  assert.ok(rejected.dropped>baseline.dropped,"rejected admitted-check packet must increment the transport drop counter");
  assert.equal(rejected.localX,baseline.localX);
  assert.equal(rejected.localY,baseline.localY);
  assert.equal(rejected.entered,baseline.entered,"rejected Spy packets must not mutate Dungeon entered-room state");

  console.log("[Stage 10 Spy packet isolation] admit dedicated remote position without Dungeon movement ownership");
  const applied=await page.evaluate(base=>{
    const active=window.CCGLostSizzlerSpecialModes.active,m=active.state,network=window.CCGLostSizzlerV141R29SpyNetwork;
    const ok=network.applyPosition({roomMode:"sizzler-saboteurs",actorId:base.otherId,player:{id:base.otherId,name:"Packet Rival",x:base.x+2,y:base.y,health:5,maxHealth:6,dir:{x:1,y:0}},sentAt:Date.now()});
    const live=remote.get(base.otherId),model=m.players.find(row=>String(row.id)===base.otherId);
    return{ok,received:Number(network.state.received||0),remoteX:Number(live?.x),remoteY:Number(live?.y),spyPosition:Boolean(live?.spyPosition),modelX:Number(model?.x),modelY:Number(model?.y),localX:Number(p1.x),localY:Number(p1.y),entered:JSON.stringify(host.enteredRoomIds||[]),specialMode:String(document.body.dataset.specialMode||""),controller:String(document.body.dataset.modeController||"")}
  },baseline);
  assert.equal(applied.ok,true,"admitted Spy packet must update dedicated remote state");
  assert.ok(applied.received>baseline.received,"admitted Spy packet must increment receive diagnostics");
  assert.equal(applied.remoteX,baseline.x+2);
  assert.equal(applied.remoteY,baseline.y);
  assert.equal(applied.spyPosition,true,"remote entry must be marked as dedicated Spy position state");
  assert.equal(applied.modelX,baseline.x+2,"logical Spy player must follow the dedicated packet");
  assert.equal(applied.modelY,baseline.y);
  assert.equal(applied.localX,baseline.localX,"remote Spy packet must never move the local Dungeon/Spy actor");
  assert.equal(applied.localY,baseline.localY);
  assert.equal(applied.entered,baseline.entered,"dedicated Spy packet must not invoke Dungeon entered-room bookkeeping");
  assert.equal(applied.specialMode,"sizzler-saboteurs");
  assert.equal(applied.controller,"spy-online");

  console.log("[Stage 10 Spy packet isolation] leaving Spy stops transport and makes late packets inert");
  await page.evaluate(async()=>{if(window.__CCG_STAGE10_PACKET_ORIGINAL_MEMBERS__)net.getMembers=window.__CCG_STAGE10_PACKET_ORIGINAL_MEMBERS__;delete window.__CCG_STAGE10_PACKET_ORIGINAL_MEMBERS__;await quitToMenu()});
  await page.waitForFunction(()=>mode==="menu"&&document.body.dataset.specialMode!=="sizzler-saboteurs"&&!window.CCGLostSizzlerV141R29SpyNetwork?.state?.timer&&!window.CCGLostSizzlerV141R29SpyNetwork?.state?.installed,null,{timeout:15000});
  const after=await page.evaluate(base=>{
    const network=window.CCGLostSizzlerV141R29SpyNetwork,before=remote.get(base.otherId)?{x:Number(remote.get(base.otherId).x),y:Number(remote.get(base.otherId).y)}:null;
    const ok=network.applyPosition({roomMode:"sizzler-saboteurs",actorId:base.otherId,player:{id:base.otherId,x:999,y:999},sentAt:Date.now()});
    const current=remote.get(base.otherId)?{x:Number(remote.get(base.otherId).x),y:Number(remote.get(base.otherId).y)}:null;
    return{ok,before,current,timer:Number(network.state.timer||0),installed:Boolean(network.state.installed),mode:String(typeof mode!=="undefined"?mode:""),specialMode:String(document.body.dataset.specialMode||"")}
  },baseline);
  assert.equal(after.ok,false,"late Spy packet after exit must fail closed");
  assert.deepEqual(after.current,after.before,"late Spy packet after exit must not mutate retained remote presentation state");
  assert.equal(after.timer,0,"Spy heartbeat must stop on mode exit");
  assert.equal(after.installed,false,"Spy packet owner must restore its downstream callback on exit");
  assert.equal(after.mode,"menu");
  assert.notEqual(after.specialMode,"sizzler-saboteurs");
  assert.deepEqual(errors,[],`Stage 10 Spy packet isolation must have no uncaught browser errors: ${errors.join("\n")}`);

  console.log("Lost Sizzler Stage 10 Spy packet admission, remote authority and cross-mode isolation qualification passed in Chromium.");
  await context.close();
}finally{
  await browser.close();
  for(const socket of sockets)socket.destroy();
  await new Promise(resolve=>server.close(()=>resolve()))
}
