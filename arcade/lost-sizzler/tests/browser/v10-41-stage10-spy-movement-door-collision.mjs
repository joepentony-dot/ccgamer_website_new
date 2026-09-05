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
const server=http.createServer((req,res)=>{try{const pathname=decodeURIComponent(new URL(req.url,"http://local").pathname),relative=pathname.endsWith("/")?`${pathname}index.html`:pathname,file=path.resolve(repo,`.${relative}`);if(!file.startsWith(`${repo}${path.sep}`)&&file!==repo){res.writeHead(403).end("forbidden");return}fs.readFile(file,(error,data)=>{if(error){res.writeHead(404,{connection:"close"}).end("not found");return}res.writeHead(200,{"content-type":mime[path.extname(file).toLowerCase()]||"application/octet-stream","cache-control":"no-store",connection:"close"});res.end(data)})}catch(error){res.writeHead(500,{connection:"close"}).end(String(error))}});
server.on("connection",socket=>{sockets.add(socket);socket.on("close",()=>sockets.delete(socket))});
await new Promise((resolve,reject)=>{server.once("error",reject);server.listen(0,"127.0.0.1",resolve)});
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,args:["--disable-dev-shm-usage","--disable-background-networking","--autoplay-policy=no-user-gesture-required"]});

try{
  const context=await browser.newContext({viewport:{width:1600,height:900}}),page=await context.newPage();page.setDefaultTimeout(45000);
  const errors=[];page.on("pageerror",error=>errors.push(String(error?.stack||error)));
  await page.goto(`${origin}/arcade/lost-sizzler/`,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.body.dataset.releaseReady==="true"&&Boolean(window.CCGLostSizzlerModeRuntime)&&Boolean(window.CCGLostSizzlerSpecialModes)&&Boolean(window.CCGLostSizzlerV141R29SpyEngine)&&Boolean(window.CCGLostSizzlerV141R30)&&typeof quitToMenu==="function",null,{timeout:90000});

  const started=await page.evaluate(()=>{net.setSolo("Stage 10 Movement Agent");const id=String(net.sessionId);return window.CCGLostSizzlerSpecialModes.startOnline({roomMode:"sizzler-saboteurs",players:[{id,name:"Stage 10 Movement Agent"},{id:"STAGE10-MOVE-RIVAL",name:"Stage 10 Rival"}],hostId:id,seed:"STAGE10-SPY-MOVEMENT",roomCode:"S10M"})});
  assert.equal(started,true,"Stage 10 movement qualification must start through the canonical Spy adapter");
  await page.waitForFunction(()=>mode==="playing"&&document.body.dataset.specialMode==="sizzler-saboteurs"&&window.CCGLostSizzlerModeRuntime?.snapshot?.().activeId==="spy-online"&&Boolean(window.CCGLostSizzlerV141R29SpyEngine?.state?.isolated)&&Boolean(window.CCGLostSizzlerV141R32SpyOverhaul)&&Boolean(p1)&&Boolean(world)&&Boolean(host),null,{timeout:30000});
  await page.waitForTimeout(500);

  const direct=await page.evaluate(()=>{
    const engine=window.CCGLostSizzlerV141R29SpyEngine,r32=window.CCGLostSizzlerV141R32SpyOverhaul,match=window.CCGLostSizzlerSpecialModes?.active?.state,r30=window.CCGLostSizzlerV141R30,r56=window.CCGLostSizzlerV141R56PlaytestCompletion,r59=window.CCGLostSizzlerV141R59LiveRegressionFixes,r60=window.CCGLostSizzlerV141R60HordeCombatIntegrity;
    const model=match?.players?.find?.(row=>String(row.id)===String(p1.id||net?.sessionId))||match?.players?.[0];if(!engine||!r32||!match||!model)throw new Error("Stage 10 Spy movement fixture is missing its isolated model");
    model.status="active";model.hp=Math.max(1,Number(model.hp||model.maxHp||1));
    const occupied=(x,y)=>(typeof allPlayers==="function"?allPlayers():[p1]).some(other=>other&&other!==p1&&Number(other.x)===x&&Number(other.y)===y);
    const blocked=(x,y)=>(host.blockingDecor||[]).some(item=>Number(item.x)===x&&Number(item.y)===y);
    const free=(x,y)=>world?.map?.[y]?.[x]===0&&!blocked(x,y)&&!occupied(x,y);
    const setPlayer=(x,y,logicalRoomId)=>{p1.x=x;p1.y=y;p1.rx=x;p1.ry=y;p1.hitStunMs=0;p1.controlLocked=false;p1.controlsLocked=false;model.x=x;model.y=y;if(logicalRoomId!=null)model.roomId=logicalRoomId};
    const logicalAt=(x,y)=>{const rid=window.CCGWorld?.roomAt?.(world,x,y);return match.map?.rooms?.find(room=>Number(room.dungeonRoomId)===Number(rid))||null};
    const counters=()=>({moveReassertions:Number(engine.state.moveReassertions||0),watchdogRecoveries:Number(r30?.state?.watchdogRecoveries||0),ownershipRepairs:Number(r30?.state?.ownershipRepairs||0),r56TrapHits:Number(r56?.state?.trapHits||0),r56EnvironmentHits:Number(r56?.state?.environmentHits||0),r59SoloFrames:Number(r59?.state?.soloFrames||0),r59SoloSubsteps:Number(r59?.state?.soloSubsteps||0),r60HordeFrames:Number(r60?.state?.frames||0)});
    const beforeCounters=counters();

    let furnitureFixture=null;
    for(const blocker of (host.blockingDecor||[]).filter(item=>item?.spyFurniture)){
      for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
        const sx=Number(blocker.x)-dx,sy=Number(blocker.y)-dy;if(!free(sx,sy))continue;
        const room=match.map?.rooms?.find(row=>(row.furniture||[]).some(item=>String(item.id)===String(blocker.logicalFurnitureId)))||logicalAt(sx,sy);
        furnitureFixture={blocker,sx,sy,dx,dy,room};break
      }
      if(furnitureFixture)break
    }
    if(!furnitureFixture)throw new Error("Stage 10 Spy movement fixture requires one approachable furniture blocker");
    setPlayer(furnitureFixture.sx,furnitureFixture.sy,furnitureFixture.room?.id);
    const furnitureBefore={x:Number(p1.x),y:Number(p1.y),blocks:Number(engine.state.furnitureBlocks||0),moves:Number(engine.state.moves||0)};
    const furnitureMoved=engine.attemptMove(p1,furnitureFixture.dx,furnitureFixture.dy,false);
    const furnitureAfter={x:Number(p1.x),y:Number(p1.y),blocks:Number(engine.state.furnitureBlocks||0),moves:Number(engine.state.moves||0),hp:Number(furnitureFixture.blocker.hp||0),unbreakable:Boolean(furnitureFixture.blocker.spyUnbreakable)};

    let doorFixture=null;
    for(const door of (host.doors||[]).filter(row=>row?.spyDoor)){
      const variants=door.orientation==="vertical"?
        [{sx:Number(door.x)-1,sy:Number(door.y),dx:1,dy:0,tx:Number(door.x)+1,ty:Number(door.y)},{sx:Number(door.x)+1,sy:Number(door.y),dx:-1,dy:0,tx:Number(door.x)-1,ty:Number(door.y)}]:
        [{sx:Number(door.x),sy:Number(door.y)-1,dx:0,dy:1,tx:Number(door.x),ty:Number(door.y)+1},{sx:Number(door.x),sy:Number(door.y)+1,dx:0,dy:-1,tx:Number(door.x),ty:Number(door.y)-1}];
      const candidate=variants.find(row=>free(row.sx,row.sy)&&free(row.tx,row.ty));if(candidate){doorFixture={door,...candidate};break}
    }
    if(!doorFixture)throw new Error("Stage 10 Spy movement fixture requires one traversable direct Spy door");
    const startLogical=logicalAt(doorFixture.sx,doorFixture.sy);setPlayer(doorFixture.sx,doorFixture.sy,startLogical?.id);
    doorFixture.door.locked=false;doorFixture.door.open=false;doorFixture.door.opening=false;doorFixture.door.openingStart=0;doorFixture.door.openAt=0;
    const doorBefore={x:Number(p1.x),y:Number(p1.y),roomId:String(model.roomId||""),opens:Number(engine.state.doorOpens||0)};
    const intoDoor=engine.attemptMove(p1,doorFixture.dx,doorFixture.dy,false);
    const atDoor={result:intoDoor,x:Number(p1.x),y:Number(p1.y),open:Boolean(doorFixture.door.open),opens:Number(engine.state.doorOpens||0)};
    const throughDoor=engine.attemptMove(p1,doorFixture.dx,doorFixture.dy,false);
    const doorAfter={result:throughDoor,x:Number(p1.x),y:Number(p1.y),roomId:String(model.roomId||""),expectedX:doorFixture.tx,expectedY:doorFixture.ty,open:Boolean(doorFixture.door.open)};

    let line=null;
    const dirs=[{dx:1,dy:0,code:"ArrowRight"},{dx:-1,dy:0,code:"ArrowLeft"},{dx:0,dy:1,code:"ArrowDown"},{dx:0,dy:-1,code:"ArrowUp"}];
    for(const room of world.rooms||[]){
      for(let y=Number(room.y)+1;y<Number(room.y)+Number(room.h);y++){
        for(let x=Number(room.x)+1;x<Number(room.x)+Number(room.w);x++){
          const found=dirs.find(dir=>free(x,y)&&free(x+dir.dx,y+dir.dy)&&free(x+dir.dx*2,y+dir.dy*2)&&!(host.doors||[]).some(door=>[[x,y],[x+dir.dx,y+dir.dy],[x+dir.dx*2,y+dir.dy*2]].some(([cx,cy])=>Number(door.x)===cx&&Number(door.y)===cy)));
          if(found){line={x,y,logicalRoomId:room.logicalRoomId,dx:found.dx,dy:found.dy,code:found.code};break
        }
        if(line)break
      }
      if(line)break
    }
    if(!line)throw new Error("Stage 10 Spy movement fixture requires a clear two-step room line");
    setPlayer(line.x,line.y,line.logicalRoomId);
    const cadenceNow=performance.now();engine.state.lastMoveAt=cadenceNow;r32.state.lastMoveAt=cadenceNow+60000;
    const cadence={startX:Number(p1.x),startY:Number(p1.y),dx:line.dx,dy:line.dy,code:line.code,moves:Number(engine.state.moves||0),retiredLastMoveAt:Number(engine.state.lastMoveAt||0),ownerLastMoveAt:Number(r32.state.lastMoveAt||0)};
    return{furnitureBefore,furnitureMoved,furnitureAfter,doorBefore,atDoor,doorAfter,cadence,beforeCounters,afterDirectCounters:counters(),activeId:window.CCGLostSizzlerModeRuntime?.snapshot?.().activeId||"",specialMode:document.body.dataset.specialMode||""}
  });

  assert.equal(direct.activeId,"spy-online","movement qualification must remain under the Spy Online controller");
  assert.equal(direct.specialMode,"sizzler-saboteurs","movement qualification must remain inside Spy special mode");
  assert.equal(direct.furnitureMoved,false,"Spy movement must reject an occupied furniture cell");
  assert.deepEqual({x:direct.furnitureAfter.x,y:direct.furnitureAfter.y},{x:direct.furnitureBefore.x,y:direct.furnitureBefore.y},"blocked furniture movement must not displace the player");
  assert.equal(direct.furnitureAfter.blocks,direct.furnitureBefore.blocks+1,"furniture collision must be recorded exactly once");
  assert.equal(direct.furnitureAfter.moves,direct.furnitureBefore.moves,"blocked furniture movement must not count as a successful Spy move");
  assert.equal(direct.furnitureAfter.unbreakable,true,"Spy furniture must remain indestructible while it blocks movement");
  assert.ok(direct.furnitureAfter.hp>0,"Spy furniture collision must not damage the blocker");

  assert.equal(direct.atDoor.result,true,"moving into a direct Spy doorway must succeed");
  assert.equal(direct.atDoor.open,true,"entering a direct Spy doorway must synchronously open it");
  assert.equal(direct.atDoor.opens,direct.doorBefore.opens+1,"opening a closed Spy door must increment the door-open counter once");
  assert.equal(direct.doorAfter.result,true,"a second movement step must traverse through the opened Spy doorway");
  assert.deepEqual({x:direct.doorAfter.x,y:direct.doorAfter.y},{x:direct.doorAfter.expectedX,y:direct.doorAfter.expectedY},"direct-door traversal must land in the adjoining room cell");
  assert.equal(direct.doorAfter.open,true,"a traversed Spy door must remain open");
  assert.notEqual(direct.doorAfter.roomId,direct.doorBefore.roomId,"crossing the direct door must update the logical Spy room identity");

  await page.keyboard.down(direct.cadence.code);
  const early=await page.evaluate(()=>{
    const engine=window.CCGLostSizzlerV141R29SpyEngine,owner=window.CCGLostSizzlerV141R32SpyOverhaul;
    const ownerBefore=Number(owner.state.lastMoveAt||0),retiredMovesBefore=Number(engine.state.moves||0);
    engine.isolatedUpdate();
    return{x:Number(p1.x),y:Number(p1.y),ownerBefore,ownerAfter:Number(owner.state.lastMoveAt||0),retiredMovesBefore,retiredMovesAfter:Number(engine.state.moves||0)}
  });
  assert.deepEqual({x:early.x,y:early.y},{x:direct.cadence.startX,y:direct.cadence.startY},"held Spy movement must not step before the 220 ms walk governor expires");
  assert.equal(early.ownerAfter,early.ownerBefore,"the final R32 movement owner must not advance its cadence timestamp before the walk governor expires");
  assert.equal(early.retiredMovesAfter,early.retiredMovesBefore,"R32-owned keyboard cadence must not revive the retired R29 movement counter");

  const paced=await page.evaluate(()=>{
    const engine=window.CCGLostSizzlerV141R29SpyEngine,owner=window.CCGLostSizzlerV141R32SpyOverhaul;
    owner.state.lastMoveAt=performance.now()-221;
    const beforeLastMoveAt=Number(owner.state.lastMoveAt||0),retiredMovesBefore=Number(engine.state.moves||0);
    engine.isolatedUpdate();
    const result={x:Number(p1.x),y:Number(p1.y),retiredMovesBefore,retiredMovesAfter:Number(engine.state.moves||0),lastMoveAt:Number(owner.state.lastMoveAt||0),beforeLastMoveAt};
    owner.state.lastMoveAt=performance.now()+60000;
    return result
  });
  await page.keyboard.up(direct.cadence.code);
  await page.evaluate(()=>{window.CCGLostSizzlerV141R32SpyOverhaul.state.lastMoveAt=performance.now()});
  await page.waitForTimeout(80);
  assert.deepEqual({x:paced.x,y:paced.y},{x:direct.cadence.startX+direct.cadence.dx,y:direct.cadence.startY+direct.cadence.dy},"held Spy movement must make exactly one tile step after the 220 ms walk governor expires");
  assert.equal(paced.retiredMovesAfter,paced.retiredMovesBefore,"the paced R32 keyboard step must remain outside the retired R29 movement counter");
  assert.ok(paced.lastMoveAt>paced.beforeLastMoveAt,"the paced keyboard step must advance the final R32 movement timestamp");

  const dash=await page.evaluate(()=>{
    const engine=window.CCGLostSizzlerV141R29SpyEngine,match=window.CCGLostSizzlerSpecialModes?.active?.state,model=match?.players?.find?.(row=>String(row.id)===String(p1.id||net?.sessionId))||match?.players?.[0];
    const occupied=(x,y)=>(typeof allPlayers==="function"?allPlayers():[p1]).some(other=>other&&other!==p1&&Number(other.x)===x&&Number(other.y)===y),blocked=(x,y)=>(host.blockingDecor||[]).some(item=>Number(item.x)===x&&Number(item.y)===y),free=(x,y)=>world?.map?.[y]?.[x]===0&&!blocked(x,y)&&!occupied(x,y);
    const dirs=[{dx:1,dy:0},{dx:-1,dy:0},{dx:0,dy:1},{dx:0,dy:-1}];let line=null;
    for(const room of world.rooms||[]){for(let y=Number(room.y)+1;y<Number(room.y)+Number(room.h);y++){for(let x=Number(room.x)+1;x<Number(room.x)+Number(room.w);x++){const dir=dirs.find(row=>free(x,y)&&free(x+row.dx,y+row.dy)&&free(x+row.dx*2,y+row.dy*2));if(dir){line={x,y,logicalRoomId:room.logicalRoomId,...dir};break}}if(line)break}if(line)break}
    if(!line)throw new Error("Stage 10 Spy dash fixture requires a clear two-tile line");p1.x=line.x;p1.y=line.y;p1.rx=line.x;p1.ry=line.y;model.x=line.x;model.y=line.y;model.roomId=line.logicalRoomId;const movesBefore=Number(engine.state.moves||0),result=engine.attemptMove(p1,line.dx,line.dy,true);return{result,startX:line.x,startY:line.y,endX:Number(p1.x),endY:Number(p1.y),dx:line.dx,dy:line.dy,movesBefore,movesAfter:Number(engine.state.moves||0)}
  });
  assert.equal(dash.result,true,"Spy dash movement must succeed on a clear two-tile line");
  assert.deepEqual({x:dash.endX,y:dash.endY},{x:dash.startX+dash.dx*2,y:dash.startY+dash.dy*2},"Spy dash must traverse two clear tiles");
  assert.equal(dash.movesAfter,dash.movesBefore+2,"a successful two-tile dash must record two physical Spy movement steps");

  const after=await page.evaluate(()=>{const engine=window.CCGLostSizzlerV141R29SpyEngine,r30=window.CCGLostSizzlerV141R30,r56=window.CCGLostSizzlerV141R56PlaytestCompletion,r59=window.CCGLostSizzlerV141R59LiveRegressionFixes,r60=window.CCGLostSizzlerV141R60HordeCombatIntegrity;return{moveReassertions:Number(engine?.state?.moveReassertions||0),watchdogRecoveries:Number(r30?.state?.watchdogRecoveries||0),ownershipRepairs:Number(r30?.state?.ownershipRepairs||0),r56TrapHits:Number(r56?.state?.trapHits||0),r56EnvironmentHits:Number(r56?.state?.environmentHits||0),r59SoloFrames:Number(r59?.state?.soloFrames||0),r59SoloSubsteps:Number(r59?.state?.soloSubsteps||0),r60HordeFrames:Number(r60?.state?.frames||0),activeId:window.CCGLostSizzlerModeRuntime?.snapshot?.().activeId||"",specialMode:document.body.dataset.specialMode||""}});
  assert.equal(after.activeId,"spy-online","movement, door and dash qualification must finish under the Spy Online controller");
  assert.equal(after.specialMode,"sizzler-saboteurs","movement, door and dash qualification must finish inside Spy special mode");
  for(const key of ["moveReassertions","watchdogRecoveries","ownershipRepairs","r56TrapHits","r56EnvironmentHits","r59SoloFrames","r59SoloSubsteps","r60HordeFrames"])assert.equal(after[key],direct.beforeCounters[key],`Spy movement qualification must not activate or repair unrelated ownership counter ${key}`);

  await page.evaluate(async()=>{await quitToMenu()});
  await page.waitForFunction(()=>mode==="menu"&&document.body.dataset.specialMode!=="sizzler-saboteurs"&&!window.CCGLostSizzlerV141R29SpyEngine?.state?.isolated,null,{timeout:15000});
  assert.deepEqual(errors,[],`Stage 10 Spy movement/door/collision qualification must have no uncaught browser errors: ${errors.join("\n")}`);
  console.log("Lost Sizzler Stage 10 Spy 220ms movement cadence, dash, furniture collision and direct-door traversal passed in Chromium.");
  await context.close();
}finally{await browser.close();for(const socket of sockets)socket.destroy();await new Promise(resolve=>server.close(()=>resolve()))}
