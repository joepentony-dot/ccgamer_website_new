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
    fs.readFile(file,(error,data)=>{if(error){res.writeHead(404,{connection:"close"}).end("not found");return}res.writeHead(200,{"content-type":mime[path.extname(file).toLowerCase()]||"application/octet-stream","cache-control":"no-store",connection:"close"});res.end(data)});
  }catch(error){res.writeHead(500,{connection:"close"}).end(String(error))}
});
server.on("connection",socket=>{sockets.add(socket);socket.on("close",()=>sockets.delete(socket))});
await new Promise((resolve,reject)=>{server.once("error",reject);server.listen(0,"127.0.0.1",resolve)});
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,args:["--disable-dev-shm-usage","--disable-background-networking","--autoplay-policy=no-user-gesture-required"]});

try{
  const context=await browser.newContext({viewport:{width:1600,height:900}}),page=await context.newPage();page.setDefaultTimeout(45000);
  const errors=[];page.on("pageerror",error=>errors.push(String(error?.stack||error)));
  await page.goto(`${origin}/arcade/lost-sizzler/`,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.body.dataset.releaseReady==="true"&&Boolean(window.CCGLostSizzlerSpecialModes)&&Boolean(window.CCGLostSizzlerModeRuntime));

  const started=await page.evaluate(()=>{
    net.setSolo("Movement Host");const id=String(net.sessionId);
    return window.CCGLostSizzlerSpecialModes.startOnline({roomMode:"sizzler-saboteurs",players:[{id,name:"Movement Host"},{id:"MOVEMENT-GUEST",name:"Movement Guest"}],hostId:id,seed:"R32-MOVEMENT-STABILITY",roomCode:"MOVE32"});
  });
  assert.equal(started,true,"Spy movement fixture must start through the real online special-mode adapter");
  await page.waitForFunction(()=>document.body.dataset.specialMode==="sizzler-saboteurs"&&Boolean(window.CCGLostSizzlerV141R29SpyEngine?.state?.isolated));
  await page.waitForFunction(()=>Boolean(window.CCGLostSizzlerV141R32SpyLoader?.state?.loaded&&window.CCGLostSizzlerV141R32SpyOverhaul?.state?.worldBuilds>=1&&window.CCGLostSizzlerV141R32SpyPacketOwner?.state?.stableEnterSeals>=1&&window.CCGLostSizzlerV141R32SpyPacketOwner?.state?.visualSmoothingSeals>=1),null,{timeout:15000});

  const fixture=await page.evaluate(()=>{
    const match=window.CCGLostSizzlerSpecialModes.active.state,model=match.players.find(row=>String(row.id)===String(p1.id))||match.players[0],dirs=[{dx:1,dy:0,code:"ArrowRight",axis:"x",sign:1},{dx:-1,dy:0,code:"ArrowLeft",axis:"x",sign:-1},{dx:0,dy:1,code:"ArrowDown",axis:"y",sign:1},{dx:0,dy:-1,code:"ArrowUp",axis:"y",sign:-1}],blocked=(x,y)=>(host.blockingDecor||[]).some(item=>Number(item.x)===x&&Number(item.y)===y);
    for(const room of world.rooms||[]){
      for(let y=room.y+1;y<room.y+room.h;y++)for(let x=room.x+1;x<room.x+room.w;x++){
        for(const d of dirs){
          let open=true;for(let n=0;n<5;n++){const nx=x+d.dx*n,ny=y+d.dy*n;if(world.map?.[ny]?.[nx]!==0||blocked(nx,ny)){open=false;break}}
          if(!open)continue;
          const logical=match.map.rooms.find(row=>Number(row.dungeonRoomId)===Number(room.id));if(!logical)continue;
          p1.x=x;p1.y=y;p1.rx=x;p1.ry=y;model.x=x;model.y=y;model.roomId=logical.id;
          const owner=window.CCGLostSizzlerV141R32SpyOverhaul;owner.state.lastMoveAt=0;
          return{code:d.code,axis:d.axis,sign:d.sign,dx:d.dx,dy:d.dy,x,y,worldBuilds:Number(owner.state.worldBuilds),round:Number(owner.state.round),roomId:String(model.roomId)};
        }
      }
    }
    return null;
  });
  assert.ok(fixture,"Spy snapback/smoothing regression requires a five-tile clear movement lane");

  const repeatedEntry=await page.evaluate(()=>{
    const engine=window.CCGLostSizzlerV141R29SpyEngine,owner=window.CCGLostSizzlerV141R32SpyOverhaul,seal=window.CCGLostSizzlerV141R32SpyPacketOwner;
    const positions=[];for(let i=0;i<12;i++){engine.enterIsolation();positions.push({x:Number(p1.x),y:Number(p1.y),rx:Number(p1.rx),ry:Number(p1.ry),worldBuilds:Number(owner.state.worldBuilds)})}
    return{positions,worldBuilds:Number(owner.state.worldBuilds),x:Number(p1.x),y:Number(p1.y),rx:Number(p1.rx),ry:Number(p1.ry),stableSeal:Boolean(engine.enterIsolation?.__ccgV141R32SpyStableEnter),smoothSeal:Boolean(engine.isolatedUpdate?.__ccgV141R32SpyVisualSmoothing),visualSmoothingSeals:Number(seal?.state?.visualSmoothingSeals||0)};
  });
  assert.equal(repeatedEntry.stableSeal,true,"r32 packet ownership must replace the force-rebuilding Spy entry wrapper with the stable entry seal");
  assert.equal(repeatedEntry.smoothSeal,true,"Spy controller update must be wrapped by the dedicated visual smoothing owner");
  assert.ok(repeatedEntry.visualSmoothingSeals>=1,"Spy visual smoothing owner must be installed before movement begins");
  assert.equal(repeatedEntry.worldBuilds,fixture.worldBuilds,"repeated controller enterIsolation calls must not rebuild an unchanged Spy world");
  assert.equal(repeatedEntry.x,fixture.x,"repeated controller entry must not re-centre the local Spy horizontally");
  assert.equal(repeatedEntry.y,fixture.y,"repeated controller entry must not re-centre the local Spy vertically");
  assert.equal(repeatedEntry.rx,fixture.x,"repeated controller entry must preserve the rendered Spy X before movement");
  assert.equal(repeatedEntry.ry,fixture.y,"repeated controller entry must preserve the rendered Spy Y before movement");
  assert.ok(repeatedEntry.positions.every(pos=>pos.x===fixture.x&&pos.y===fixture.y&&pos.rx===fixture.x&&pos.ry===fixture.y),"every repeated Spy controller entry must preserve logical and rendered local position");

  const samples=[];
  await page.keyboard.down(fixture.code);
  for(let i=0;i<32;i++){
    await page.waitForTimeout(30);
    samples.push(await page.evaluate(()=>({x:Number(p1.x),y:Number(p1.y),rx:Number(p1.rx),ry:Number(p1.ry),worldBuilds:Number(window.CCGLostSizzlerV141R32SpyOverhaul.state.worldBuilds),visualStepRestores:Number(window.CCGLostSizzlerV141R32SpyPacketOwner?.state?.visualStepRestores||0),visualFrames:Number(window.CCGLostSizzlerV141R32SpyPacketOwner?.state?.visualFrames||0)})));
  }
  await page.keyboard.up(fixture.code);
  await page.waitForTimeout(360);
  const finalState=await page.evaluate(()=>{
    const match=window.CCGLostSizzlerSpecialModes.active.state,model=match.players.find(row=>String(row.id)===String(p1.id))||match.players[0],owner=window.CCGLostSizzlerV141R32SpyOverhaul,seal=window.CCGLostSizzlerV141R32SpyPacketOwner;
    return{x:Number(p1.x),y:Number(p1.y),rx:Number(p1.rx),ry:Number(p1.ry),modelX:Number(model.x),modelY:Number(model.y),worldBuilds:Number(owner.state.worldBuilds),moves:Number(owner.state.lastMoveAt||0),visualStepRestores:Number(seal?.state?.visualStepRestores||0),visualFrames:Number(seal?.state?.visualFrames||0)};
  });

  const logicalAxis=row=>fixture.axis==="x"?row.x:row.y,renderAxis=row=>fixture.axis==="x"?row.rx:row.ry,startAxis=fixture.axis==="x"?fixture.x:fixture.y;
  const logicalValues=samples.map(logicalAxis),renderValues=samples.map(renderAxis),finalAxis=logicalAxis(finalState),finalRenderAxis=renderAxis(finalState),progress=(finalAxis-startAxis)*fixture.sign;
  assert.ok(progress>=2,`held Spy movement must advance at least two tiles instead of being snapped back; progress=${progress}, logical=${JSON.stringify(logicalValues)}`);
  for(let i=1;i<logicalValues.length;i++)assert.ok((logicalValues[i]-logicalValues[i-1])*fixture.sign>=0,`Spy logical position must move monotonically with no room-centre snapback; logical=${JSON.stringify(logicalValues)}`);
  for(let i=1;i<renderValues.length;i++)assert.ok((renderValues[i]-renderValues[i-1])*fixture.sign>=-.001,`Spy rendered position must glide monotonically rather than jitter backwards; rendered=${JSON.stringify(renderValues)}`);
  const interpolated=samples.some(row=>{
    const logical=logicalAxis(row),rendered=renderAxis(row),renderProgress=(rendered-startAxis)*fixture.sign;
    return renderProgress>.03&&Math.abs(logical-rendered)>.03;
  });
  assert.equal(interpolated,true,`Spy render coordinate must occupy intermediate positions between logical tiles; logical=${JSON.stringify(logicalValues)}, rendered=${JSON.stringify(renderValues)}`);
  const renderDeltas=renderValues.slice(1).map((value,index)=>Math.abs(value-renderValues[index])),maxRenderDelta=Math.max(0,...renderDeltas);
  assert.ok(maxRenderDelta<.9,`Spy rendered position must not jump an entire tile between 30 ms samples; max delta=${maxRenderDelta}, rendered=${JSON.stringify(renderValues)}`);
  assert.ok(finalState.visualStepRestores>=1,"real Spy keyboard movement must pass through the visual-step restoration boundary");
  assert.ok(finalState.visualFrames>=10,"Spy visual smoothing must run continuously on controller frames");
  assert.ok(Math.abs(finalRenderAxis-finalAxis)<.03,`Spy rendered position must settle onto the authoritative logical tile after movement stops; logical=${finalAxis}, rendered=${finalRenderAxis}`);
  assert.equal(finalState.worldBuilds,fixture.worldBuilds,"normal Spy movement frames must not rebuild the physical world");
  assert.equal(finalState.modelX,finalState.x,"authoritative Spy model X must stay aligned with the live local player");
  assert.equal(finalState.modelY,finalState.y,"authoritative Spy model Y must stay aligned with the live local player");

  const remoteSmoothing=await page.evaluate(start=>{
    const seal=window.CCGLostSizzlerV141R32SpyPacketOwner,guestId="MOVEMENT-GUEST",beforeX=Number(start.x),beforeY=Number(start.y),targetX=beforeX+Number(start.dx),targetY=beforeY+Number(start.dy),existing=remote.get(guestId)||{};
    remote.set(guestId,{...existing,id:guestId,name:"Movement Guest",x:targetX,y:targetY,rx:beforeX,ry:beforeY,lastSeen:performance.now(),spyPosition:true});
    seal.smoothVisualPositions(1000/60);
    const guest=remote.get(guestId);return{x:Number(guest.x),y:Number(guest.y),rx:Number(guest.rx),ry:Number(guest.ry),beforeX,beforeY,targetX,targetY};
  },fixture);
  const remoteLogical=fixture.axis==="x"?remoteSmoothing.x:remoteSmoothing.y,remoteRendered=fixture.axis==="x"?remoteSmoothing.rx:remoteSmoothing.ry,remoteStart=fixture.axis==="x"?remoteSmoothing.beforeX:remoteSmoothing.beforeY;
  assert.ok((remoteRendered-remoteStart)*fixture.sign>0,"remote Spy render position must begin moving toward the received network position");
  assert.ok((remoteLogical-remoteRendered)*fixture.sign>0,"remote Spy render position must interpolate instead of snapping directly to the received network tile");

  assert.deepEqual(errors,[],`Spy movement smoothing regression must have no uncaught browser errors: ${errors.join("\n")}`);
  console.log("Lost Sizzler r32 Spy controller-entry, held-movement and local/remote visual smoothing regressions passed in Chromium.");
  await context.close();
}finally{
  await browser.close();for(const socket of sockets)socket.destroy();await new Promise(resolve=>server.close(()=>resolve()));
}