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
    const pathname=decodeURIComponent(new URL(req.url,"http://local").pathname),relative=pathname.endsWith("/")?`${pathname}index.html`:pathname,file=path.resolve(repo,`.${relative}`);
    if(!file.startsWith(`${repo}${path.sep}`)&&file!==repo){res.writeHead(403).end("forbidden");return}
    fs.readFile(file,(error,data)=>{if(error){res.writeHead(404,{"connection":"close"}).end("not found");return}res.writeHead(200,{"content-type":mime[path.extname(file).toLowerCase()]||"application/octet-stream","cache-control":"no-store","connection":"close"});res.end(data)});
  }catch(error){res.writeHead(500,{"connection":"close"}).end(String(error))}
});
server.on("connection",socket=>{sockets.add(socket);socket.on("close",()=>sockets.delete(socket))});
await new Promise((resolve,reject)=>{server.once("error",reject);server.listen(0,"127.0.0.1",resolve)});
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,args:["--disable-dev-shm-usage","--disable-background-networking","--autoplay-policy=no-user-gesture-required"]});

try{
  const context=await browser.newContext({viewport:{width:1920,height:1080}}),page=await context.newPage();page.setDefaultTimeout(30000);
  const errors=[];page.on("pageerror",error=>errors.push(String(error?.stack||error)));
  await page.goto(`${origin}/arcade/lost-sizzler/`,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.body.dataset.releaseReady==="true");
  await page.waitForFunction(()=>Boolean(window.CCGLostSizzlerV141R29SpyEngine));

  const result=await page.evaluate(async()=>{
    const special=window.CCGLostSizzlerSpecialModes,engine=window.CCGLostSizzlerV141R29SpyEngine,SAB=window.CCGLostSizzlerSaboteurs;
    const descriptor=Object.getOwnPropertyDescriptor(special,"active"),originalUpdate=window.update;
    let inheritedCalls=0;
    const countedUpdate=function(){inheritedCalls++};
    window.update=countedUpdate;
    const t=Date.now(),match=SAB.createMatch({players:[{id:String(p1.id||"P1"),name:"HOST"},{id:"SPY-2",name:"GUEST"}],hostId:String(p1.id||"P1"),seed:"R29-SPY-ISOLATION",now:t});
    SAB.beginRound(match,t);match.trapLoadout=["timeBomb","snare","fakeHealth"];
    match.traps.push({id:"old-time-bomb",trapId:"timeBomb",ownerId:match.players[0].id,roomId:match.players[0].roomId,targetType:"floor",targetId:"x",armed:true,placedAt:t,detonatesAt:t+10000});
    Object.defineProperty(special,"active",{configurable:true,value:{type:"sizzler-saboteurs",state:match,authoritative:true,cooldowns:new Map(),seed:match.seed}});
    document.body.dataset.specialMode="sizzler-saboteurs";
    engine.enterIsolation();engine.compactLogicalMap();engine.buildCompactWorld(true);

    host.enemies=[{id:"dungeon-leak",alive:true,x:1,y:1}];host.hazardRooms=[{id:"hazard-leak"}];host.timedRooms=[{id:"timed-leak"}];host.traps=[{id:"dungeon-trap"}];
    engine.sanitiseSharedDungeonState();
    window.update(16);
    const inheritedBypassed=inheritedCalls===0;

    const compact={rooms:world.rooms.length,maxW:Math.max(...world.rooms.map(room=>room.w)),maxH:Math.max(...world.rooms.map(room=>room.h)),logicalRooms:match.map.rooms.length};
    const noDungeonLeaks=host.enemies.length===0&&host.hazardRooms.length===0&&host.timedRooms.length===0&&host.traps.length===0;
    const noTimeBomb=!match.trapLoadout.includes("timeBomb")&&!match.traps.some(trap=>trap.trapId==="timeBomb");

    const blocker=host.blockingDecor.find(item=>item.spyFurniture),logical=match.map.rooms.find(room=>room.furniture.some(item=>String(item.id)===String(blocker?.logicalFurnitureId))),model=match.players[0];
    let furnitureBlocked=false,prompt="";
    if(blocker&&logical){
      const candidates=[[1,0],[-1,0],[0,1],[0,-1]].map(([dx,dy])=>({x:blocker.x-dx,y:blocker.y-dy,dx,dy})).filter(cell=>window.CCGWorld.walkable(world.map,cell.x,cell.y,host));
      const from=candidates[0];
      if(from){
        p1.x=from.x;p1.y=from.y;p1.rx=from.x;p1.ry=from.y;model.x=from.x;model.y=from.y;model.roomId=logical.id;
        const before={x:p1.x,y:p1.y},moved=engine.attemptMove(p1,from.dx,from.dy,false);furnitureBlocked=!moved&&p1.x===before.x&&p1.y===before.y;
        engine.updatePrompt();prompt=document.getElementById("spy-context-prompt")?.textContent||"";
      }
    }

    const isolatedFlag=document.body.dataset.spyRuntimeIsolated==="true",registered=window.CCGLostSizzlerModeRuntime?.runtimes?.["sizzler-saboteurs"]?.isolatedRules===true;
    engine.leaveIsolation();
    const restoredUpdate=window.update===countedUpdate;
    window.update=originalUpdate;
    if(descriptor)Object.defineProperty(special,"active",descriptor);else delete special.active;
    delete document.body.dataset.specialMode;
    return{inheritedBypassed,compact,noDungeonLeaks,noTimeBomb,furnitureBlocked,prompt,isolatedFlag,registered,restoredUpdate,worldBuilds:engine.state.worldBuilds,dungeonDamageBlocked:engine.state.dungeonDamageBlocked};
  });

  assert.equal(result.inheritedBypassed,true,"Spy update must not execute the inherited Dungeon update");
  assert.ok(result.compact.logicalRooms<=28,`Spy logical map must remain compact, got ${result.compact.logicalRooms} rooms`);
  assert.ok(result.compact.maxW<=9&&result.compact.maxH<=9,`Spy physical rooms must be at most 9x9, got ${result.compact.maxW}x${result.compact.maxH}`);
  assert.equal(result.noDungeonLeaks,true,"Dungeon hazards, enemies, timed rooms and host traps must be purged inside Spy");
  assert.equal(result.noTimeBomb,true,"idle/delayed floor time bombs must not survive the isolated Spy ruleset");
  assert.equal(result.furnitureBlocked,true,"Spy furniture must block player movement in Chromium");
  assert.match(result.prompt,/^E — SEARCH /,"standing beside unsearched Spy furniture must show a direct E-search prompt");
  assert.equal(result.isolatedFlag,true,"Spy runtime isolation marker must be active during the match");
  assert.equal(result.registered,true,"Spy must be registered as an isolated rules runtime");
  assert.equal(result.restoredUpdate,true,"leaving Spy must restore the inherited Dungeon update owner");
  assert.ok(result.worldBuilds>=1,"isolated Spy physical world must build successfully");
  assert.deepEqual(errors,[],`isolated Spy browser regression must have no uncaught errors: ${errors.join("\n")}`);
  console.log("Lost Sizzler V10.41 r29 isolated two-player Spy runtime passed in Chromium.");
  await context.close();
}finally{
  await browser.close();for(const socket of sockets)socket.destroy();await new Promise(resolve=>server.close(()=>resolve()));
}
