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
    fs.readFile(file,(error,data)=>{if(error){res.writeHead(404,{"connection":"close"}).end("not found");return}res.writeHead(200,{"content-type":mime[path.extname(file).toLowerCase()]||"application/octet-stream","cache-control":"no-store",connection:"close"});res.end(data)});
  }catch(error){res.writeHead(500,{connection:"close"}).end(String(error))}
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
  await page.waitForFunction(()=>Boolean(window.CCGLostSizzlerModeRuntime?.state?.sharedFrameBoundary));
  await page.waitForFunction(()=>Boolean(window.CCGLostSizzlerV141R29SpyEngine));
  await page.waitForFunction(()=>Boolean(window.CCGLostSizzlerV141R29SpyNetwork));

  const setup=await page.evaluate(()=>{
    const special=window.CCGLostSizzlerSpecialModes,engine=window.CCGLostSizzlerV141R29SpyEngine,network=window.CCGLostSizzlerV141R29SpyNetwork,SAB=window.CCGLostSizzlerSaboteurs,runtime=window.CCGLostSizzlerModeRuntime;
    run=PGR.makeRun({difficulty:"ARCADE",seed:"R29-SPY-ISOLATION"});playMode="online";startWorld(PGR.floorSeed(run),false,false);mode="playing";p1.id="SPY-HOST";p1.name="HOST";document.body.dataset.runActive="true";
    const descriptor=Object.getOwnPropertyDescriptor(special,"active"),boundary=runtime.state.sharedFrameBoundary;
    const t=Date.now(),match=SAB.createMatch({players:[{id:String(p1.id),name:"HOST"},{id:"SPY-2",name:"GUEST"}],hostId:String(p1.id),seed:"R29-SPY-ISOLATION",now:t});
    SAB.beginRound(match,t);match.trapLoadout=["timeBomb","snare","fakeHealth"];
    match.traps.push({id:"old-time-bomb",trapId:"timeBomb",ownerId:match.players[0].id,roomId:match.players[0].roomId,targetType:"floor",targetId:"x",armed:true,placedAt:t,detonatesAt:t+10000});
    Object.defineProperty(special,"active",{configurable:true,value:{type:"sizzler-saboteurs",state:match,authoritative:true,cooldowns:new Map(),seed:match.seed}});
    document.body.dataset.specialMode="sizzler-saboteurs";
    runtime.sync("browser Spy setup");engine.enterIsolation();engine.compactLogicalMap();engine.buildCompactWorld(true);
    const compact={rooms:world.rooms.length,maxW:Math.max(...world.rooms.map(room=>room.w)),maxH:Math.max(...world.rooms.map(room=>room.h)),logicalRooms:match.map.rooms.length};
    const mapRef=match.map,furnitureFingerprint=(host.blockingDecor||[]).filter(item=>item.spyFurniture).map(item=>`${item.id}:${item.type}:${item.x},${item.y}`).sort().join("|");
    window.__CCG_SPY_BROWSER_STATE__={descriptor,boundary,mapRef,furnitureFingerprint,compactions:engine.state.logicalCompactions,worldBuilds:engine.state.worldBuilds,sourceFrames:runtime.state.sharedSourceFrames,bypasses:runtime.state.spySourceBypasses,moves:engine.state.moves,ownerTrace:[]};
    return{
      updateStable:window.update===boundary,
      compact,
      noTimeBomb:!match.trapLoadout.includes("timeBomb")&&!match.traps.some(trap=>trap.trapId==="timeBomb"),
      isolatedFlag:document.body.dataset.spyRuntimeIsolated==="true",
      registered:runtime?.runtimes?.["sizzler-saboteurs"]?.isolatedRules===true,
      networkReady:Boolean(network)&&network.PACKET==="v141_spy_position"&&typeof network.sendPosition==="function"&&typeof network.applyPosition==="function"
    };
  });

  assert.equal(setup.updateStable,true,"entering Spy must leave the authoritative controller update boundary installed");
  assert.ok(setup.compact.logicalRooms<=28,`Spy logical map must remain compact, got ${setup.compact.logicalRooms} rooms`);
  assert.ok(setup.compact.maxW<=9&&setup.compact.maxH<=9,`Spy physical rooms must be at most 9x9, got ${setup.compact.maxW}x${setup.compact.maxH}`);
  assert.equal(setup.noTimeBomb,true,"idle/delayed floor time bombs must not survive the isolated Spy ruleset");
  assert.equal(setup.isolatedFlag,true,"Spy runtime isolation marker must be active during the match");
  assert.equal(setup.registered,true,"Spy must be registered as an isolated rules runtime");
  assert.equal(setup.networkReady,true,"dedicated Spy position transport must be loaded and registered in Chromium");

  const stability=await page.evaluate(async()=>{
    const engine=window.CCGLostSizzlerV141R29SpyEngine,runtime=window.CCGLostSizzlerModeRuntime,saved=window.__CCG_SPY_BROWSER_STATE__,match=window.CCGLostSizzlerSpecialModes.active.state;
    // Deliberately inject a Dungeon chase-state enemy: the Spy controller frame
    // must purge it before Dungeon enemy alert/render state can leak into Spy.
    host.enemies=[{id:"dungeon-alert-leak",alive:true,x:p1.x+1,y:p1.y,aiState:"chase",lastSeen:{x:p1.x,y:p1.y}}];
    const sampleOwner=(iteration,phase)=>{
      if(window.update===saved.boundary)return;
      saved.ownerTrace.push({iteration,phase,name:String(window.update?.name||""),r24:Boolean(window.update?.__ccgV141R24SpyMovement),r25:Boolean(window.update?.__ccgV141R25SpySpeedBounty),r26:Boolean(window.update?.__ccgV141R26Stability),gambler:Boolean(window.update?.__ccgV141Gambler)});
    };
    for(let i=0;i<18;i++){sampleOwner(i,"before");window.update(16);sampleOwner(i,"after");await new Promise(r=>setTimeout(r,4));sampleOwner(i,"wait")}
    const fingerprint=(host.blockingDecor||[]).filter(item=>item.spyFurniture).map(item=>`${item.id}:${item.type}:${item.x},${item.y}`).sort().join("|");
    return{
      updateStable:window.update===saved.boundary,
      ownerTrace:saved.ownerTrace,
      mapStable:match.map===saved.mapRef,
      furnitureStable:fingerprint===saved.furnitureFingerprint,
      compactionDelta:engine.state.logicalCompactions-saved.compactions,
      worldBuildDelta:engine.state.worldBuilds-saved.worldBuilds,
      dungeonEnemies:host.enemies.length,
      dungeonAlertEnemies:(host.enemies||[]).filter(enemy=>enemy.aiState==="chase"||enemy.aiState==="search").length,
      sourceDelta:runtime.state.sharedSourceFrames-saved.sourceFrames,
      bypassDelta:runtime.state.spySourceBypasses-saved.bypasses,
      spyFrames:runtime.state.spyRuleFrames
    };
  });

  assert.equal(stability.updateStable,true,"Spy frames must never replace the controller update boundary");
  assert.deepEqual(stability.ownerTrace,[],"no retained compatibility timer may transiently displace the controller update boundary");
  assert.equal(stability.mapStable,true,"Spy logical map identity must remain stable across frames instead of being regenerated");
  assert.equal(stability.furnitureStable,true,"Spy bookshelf/furniture identity and placement must remain stable across frames");
  assert.equal(stability.compactionDelta,0,"an already compacted Spy map must not compact again during normal frames");
  assert.equal(stability.worldBuildDelta,0,"an unchanged Spy round must not rebuild its physical furniture/world every frame");
  assert.equal(stability.dungeonEnemies,0,"Dungeon enemies must be purged from Spy before they can render");
  assert.equal(stability.dungeonAlertEnemies,0,"Dungeon chase/search alert indicators must never survive in Spy");
  assert.equal(stability.sourceDelta,0,"Spy controller frames must not execute the inherited Dungeon update source");
  assert.ok(stability.bypassDelta>=18,"every Spy frame must explicitly bypass the inherited Dungeon source");
  assert.ok(stability.spyFrames>=18,"Spy rules must execute through the authoritative controller");

  const furniture=await page.evaluate(()=>{
    const engine=window.CCGLostSizzlerV141R29SpyEngine,match=window.CCGLostSizzlerSpecialModes.active.state;
    const blocker=host.blockingDecor.find(item=>item.spyFurniture),logical=match.map.rooms.find(room=>room.furniture.some(item=>String(item.id)===String(blocker?.logicalFurnitureId))),model=match.players[0];
    if(!blocker||!logical)return{blocked:false,prompt:""};
    const candidates=[[1,0],[-1,0],[0,1],[0,-1]].map(([dx,dy])=>({x:blocker.x-dx,y:blocker.y-dy,dx,dy})).filter(cell=>window.CCGWorld.walkable(world.map,cell.x,cell.y,host));
    const from=candidates[0];if(!from)return{blocked:false,prompt:""};
    p1.x=from.x;p1.y=from.y;p1.rx=from.x;p1.ry=from.y;model.x=from.x;model.y=from.y;model.roomId=logical.id;
    const before={x:p1.x,y:p1.y},moved=engine.attemptMove(p1,from.dx,from.dy,false);engine.updatePrompt();
    return{blocked:!moved&&p1.x===before.x&&p1.y===before.y,prompt:document.getElementById("spy-context-prompt")?.textContent||""};
  });
  assert.equal(furniture.blocked,true,"Spy furniture must block player movement in Chromium");
  assert.match(furniture.prompt,/^E — SEARCH /,"standing beside unsearched Spy furniture must show a direct E-search prompt");

  const direction=await page.evaluate(()=>{
    const match=window.CCGLostSizzlerSpecialModes.active.state,model=match.players[0],dirs=[{dx:1,dy:0,code:"ArrowRight"},{dx:-1,dy:0,code:"ArrowLeft"},{dx:0,dy:1,code:"ArrowDown"},{dx:0,dy:-1,code:"ArrowUp"}];
    for(const room of world.rooms||[]){
      for(let y=room.y+1;y<room.y+room.h;y++)for(let x=room.x+1;x<room.x+room.w;x++){
        for(const d of dirs){let ok=true;for(let n=0;n<5;n++){const nx=x+d.dx*n,ny=y+d.dy*n;if(!window.CCGWorld.walkable(world.map,nx,ny,host)){ok=false;break}}if(!ok)continue;
          p1.x=x;p1.y=y;p1.rx=x;p1.ry=y;model.x=x;model.y=y;const logical=match.map.rooms.find(row=>Number(row.dungeonRoomId)===Number(room.id));if(logical)model.roomId=logical.id;
          window.CCGLostSizzlerV141R29SpyEngine.state.lastMoveAt=0;return{code:d.code,x,y};
        }
      }
    }
    return null;
  });
  assert.ok(direction,"Spy cadence test requires a five-tile clear path");
  await page.keyboard.down(direction.code);await page.waitForTimeout(760);await page.keyboard.up(direction.code);await page.waitForTimeout(80);
  const movement=await page.evaluate(start=>({tiles:Math.abs(Number(p1.x)-Number(start.x))+Math.abs(Number(p1.y)-Number(start.y)),x:p1.x,y:p1.y}),direction);
  assert.ok(movement.tiles>=1,"held Spy movement must still advance the local agent");
  assert.ok(movement.tiles<=4,`220ms Spy cadence must prevent over-fast repeated steps; observed ${movement.tiles} tiles in 760ms`);

  const exit=await page.evaluate(()=>{
    const special=window.CCGLostSizzlerSpecialModes,runtime=window.CCGLostSizzlerModeRuntime,saved=window.__CCG_SPY_BROWSER_STATE__;
    if(saved.descriptor)Object.defineProperty(special,"active",saved.descriptor);else delete special.active;
    delete document.body.dataset.specialMode;runtime.sync("browser Spy exit");
    return{updateStable:window.update===saved.boundary,isolated:Boolean(window.CCGLostSizzlerV141R29SpyEngine.state.isolated)};
  });
  assert.equal(exit.updateStable,true,"leaving Spy must not restore or replace the controller update boundary");
  assert.equal(exit.isolated,false,"Spy controller exit must release isolated movement/damage ownership");

  assert.deepEqual(errors,[],`controller-owned Spy browser regression must have no uncaught errors: ${errors.join("\n")}`);
  console.log("Lost Sizzler V10.41 controller-owned Spy runtime passed stable-map, bounded-speed, no-Dungeon-alert and update-ownership Chromium checks.");
  await context.close();
}finally{
  await browser.close();for(const socket of sockets)socket.destroy();await new Promise(resolve=>server.close(()=>resolve()));
}