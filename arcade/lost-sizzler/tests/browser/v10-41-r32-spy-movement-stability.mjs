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
  await page.waitForFunction(()=>Boolean(window.CCGLostSizzlerV141R32SpyLoader?.state?.loaded&&window.CCGLostSizzlerV141R32SpyOverhaul?.state?.worldBuilds>=1&&window.CCGLostSizzlerV141R32SpyPacketOwner?.state?.stableEnterSeals>=1),null,{timeout:15000});

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
          return{code:d.code,axis:d.axis,sign:d.sign,x,y,worldBuilds:Number(owner.state.worldBuilds),round:Number(owner.state.round),roomId:String(model.roomId)};
        }
      }
    }
    return null;
  });
  assert.ok(fixture,"Spy snapback regression requires a five-tile clear movement lane");

  const repeatedEntry=await page.evaluate(start=>{
    const engine=window.CCGLostSizzlerV141R29SpyEngine,owner=window.CCGLostSizzlerV141R32SpyOverhaul;
    const positions=[];for(let i=0;i<12;i++){engine.enterIsolation();positions.push({x:Number(p1.x),y:Number(p1.y),worldBuilds:Number(owner.state.worldBuilds)})}
    return{positions,worldBuilds:Number(owner.state.worldBuilds),x:Number(p1.x),y:Number(p1.y),stableSeal:Boolean(engine.enterIsolation?.__ccgV141R32SpyStableEnter)};
  },fixture);
  assert.equal(repeatedEntry.stableSeal,true,"r32 packet ownership must replace the force-rebuilding Spy entry wrapper with the stable entry seal");
  assert.equal(repeatedEntry.worldBuilds,fixture.worldBuilds,"repeated controller enterIsolation calls must not rebuild an unchanged Spy world");
  assert.equal(repeatedEntry.x,fixture.x,"repeated controller entry must not re-centre the local Spy horizontally");
  assert.equal(repeatedEntry.y,fixture.y,"repeated controller entry must not re-centre the local Spy vertically");
  assert.ok(repeatedEntry.positions.every(pos=>pos.x===fixture.x&&pos.y===fixture.y),"every repeated Spy controller entry must preserve the live local position");

  const samples=[];
  await page.keyboard.down(fixture.code);
  for(let i=0;i<10;i++){await page.waitForTimeout(85);samples.push(await page.evaluate(()=>({x:Number(p1.x),y:Number(p1.y),worldBuilds:Number(window.CCGLostSizzlerV141R32SpyOverhaul.state.worldBuilds)})))}
  await page.keyboard.up(fixture.code);await page.waitForTimeout(100);
  const finalState=await page.evaluate(()=>{
    const match=window.CCGLostSizzlerSpecialModes.active.state,model=match.players.find(row=>String(row.id)===String(p1.id))||match.players[0],owner=window.CCGLostSizzlerV141R32SpyOverhaul;
    return{x:Number(p1.x),y:Number(p1.y),modelX:Number(model.x),modelY:Number(model.y),worldBuilds:Number(owner.state.worldBuilds),moves:Number(owner.state.lastMoveAt||0)};
  });

  const startAxis=fixture.axis==="x"?fixture.x:fixture.y,values=samples.map(row=>fixture.axis==="x"?row.x:row.y),finalAxis=fixture.axis==="x"?finalState.x:finalState.y,progress=(finalAxis-startAxis)*fixture.sign;
  assert.ok(progress>=2,`held Spy movement must advance at least two tiles instead of being snapped back; progress=${progress}, samples=${JSON.stringify(values)}`);
  for(let i=1;i<values.length;i++)assert.ok((values[i]-values[i-1])*fixture.sign>=0,`Spy position must move monotonically with no room-centre snapback; samples=${JSON.stringify(values)}`);
  assert.equal(finalState.worldBuilds,fixture.worldBuilds,"normal Spy movement frames must not rebuild the physical world");
  assert.equal(finalState.modelX,finalState.x,"authoritative Spy model X must stay aligned with the live local player");
  assert.equal(finalState.modelY,finalState.y,"authoritative Spy model Y must stay aligned with the live local player");

  assert.deepEqual(errors,[],`Spy movement snapback regression must have no uncaught browser errors: ${errors.join("\n")}`);
  console.log("Lost Sizzler r32 Spy controller-entry and held-movement snapback regression passed in Chromium.");
  await context.close();
}finally{
  await browser.close();for(const socket of sockets)socket.destroy();await new Promise(resolve=>server.close(()=>resolve()));
}