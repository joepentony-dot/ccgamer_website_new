import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {chromium} from "playwright";

const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,"../../../..");
const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".mjs":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json; charset=utf-8",".svg":"image/svg+xml",".png":"image/png",".webp":"image/webp",".wav":"audio/wav",".mp3":"audio/mpeg",".ogg":"audio/ogg"};
const sockets=new Set();
const server=http.createServer((req,res)=>{
  try{
    const url=new URL(req.url,"http://local"),pathname=decodeURIComponent(url.pathname),relative=pathname.endsWith("/")?`${pathname}index.html`:pathname,file=path.resolve(repo,`.${relative}`);
    if(!file.startsWith(`${repo}${path.sep}`)&&file!==repo){res.writeHead(403).end("forbidden");return}
    fs.readFile(file,(error,data)=>{if(error){res.writeHead(404,{connection:"close"}).end("not found");return}res.writeHead(200,{"content-type":mime[path.extname(file).toLowerCase()]||"application/octet-stream","cache-control":"no-store",connection:"close"});res.end(data)});
  }catch(error){res.writeHead(500,{connection:"close"}).end(String(error))}
});
server.on("connection",socket=>{sockets.add(socket);socket.on("close",()=>sockets.delete(socket))});
await new Promise((resolve,reject)=>{server.once("error",reject);server.listen(0,"127.0.0.1",resolve)});
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,args:["--disable-dev-shm-usage","--disable-background-networking","--autoplay-policy=no-user-gesture-required"]});

try{
  const context=await browser.newContext({viewport:{width:1600,height:900}}),page=await context.newPage();
  page.setDefaultTimeout(45000);
  const errors=[],failedScripts=[];
  page.on("pageerror",error=>errors.push(String(error?.stack||error)));
  page.on("requestfailed",request=>{try{const url=new URL(request.url());if(url.origin===origin&&/\.js(?:\?|$)/i.test(url.pathname))failedScripts.push(`${url.pathname}: ${request.failure()?.errorText||"failed"}`)}catch(_){}});

  await page.goto(`${origin}/arcade/lost-sizzler/?v142-r24-room-grammar=1`,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.body.dataset.releaseReady==="true"&&Boolean(window.CCGLostSizzlerV142R6BiomeEnvironmentDirector)&&Boolean(window.CCGLostSizzlerV142R7RoomObjectiveDirector)&&Boolean(window.CCGLostSizzlerV142R24BiomeRoomGrammar)&&Boolean(document.getElementById("solo-btn")),null,{timeout:90000});

  const loadOrder=await page.evaluate(()=>[...(window.CCGLostSizzlerV142Bootstrap?.loaded||[])]);
  const r7Index=loadOrder.indexOf("v10-42-r7-room-objective-director.js"),r24Index=loadOrder.indexOf("v10-42-r24-biome-room-grammar.js"),r8Index=loadOrder.indexOf("v10-42-r8-breakable-interaction-director.js");
  assert.ok(r7Index>=0&&r24Index>r7Index&&r8Index>r24Index,"Live ordered bootstrap must load R24 after R7 and before R8.");

  await page.click("#solo-btn");
  await page.waitForFunction(()=>document.body.dataset.runActive==="true"&&mode==="playing"&&playMode==="solo"&&Boolean(run)&&Boolean(world)&&Boolean(host)&&Boolean(p1)&&Boolean(host.v142Environment)&&Boolean(host.v142RoomObjectives)&&Boolean(host.v142RoomGrammar),null,{timeout:20000});

  const result=await page.evaluate(()=>{
    const api=window.CCGLostSizzlerV142R24BiomeRoomGrammar;
    const before={
      map:JSON.stringify(world.map),revision:Number(host.revision||0),
      items:JSON.stringify(host.items||[]),enemies:JSON.stringify(host.enemies||[]),doors:JSON.stringify(host.doors||[]),chests:JSON.stringify(host.chests||[]),shops:JSON.stringify(host.shops||[])
    };
    api.applyGrammar(world,host,run);
    const after={
      map:JSON.stringify(world.map),revision:Number(host.revision||0),
      items:JSON.stringify(host.items||[]),enemies:JSON.stringify(host.enemies||[]),doors:JSON.stringify(host.doors||[]),chests:JSON.stringify(host.chests||[]),shops:JSON.stringify(host.shops||[])
    };
    const liveRooms=(world.rooms||[]).filter(Boolean).map(room=>({
      id:room.id,environment:Boolean(room.v142Environment),objective:Boolean(room.v142Objective),grammar:{...(room.v142RoomGrammar||{})}
    }));
    const biomes=["threshold","iron","bone","ash","sigil"];
    const samples=biomes.map((biome,index)=>{
      const floor=index+1,room={id:91,v142Environment:{biome,role:"chamber",rareRole:"",variant:`${biome}-sample`,dressingSeed:900+floor},v142Objective:{type:"recover-cache",title:"RECOVER THE CACHE"}};
      return api.grammarForRoom(room,{rooms:[room]},{},{seed:"R24-BROWSER",floor});
    });
    const secret=api.grammarForRoom({id:92,v142Environment:{biome:"bone",role:"secret",rareRole:"hidden-alcove",variant:"bone-secret"},v142Objective:{type:"recover-hidden-cache",title:"RECOVER THE HIDDEN CACHE"}},{rooms:[]},{},{seed:"R24-BROWSER",floor:3});
    const exit=api.grammarForRoom({id:93,v142Environment:{biome:"sigil",role:"exit",rareRole:"",variant:"sigil-exit"},v142Objective:{type:"secure-exit",title:"SECURE THE DESCENT"}},{rooms:[]},{},{seed:"R24-BROWSER",floor:5});

    let movement={moved:false,controller:window.CCGLostSizzlerModeRuntime?.detect?.()||"",mode:String(mode||"")};
    for(const dir of [{x:1,y:0},{x:-1,y:0},{x:0,y:1},{x:0,y:-1}]){
      const nx=p1.x+dir.x,ny=p1.y+dir.y;
      if(!W.walkable(world.map,nx,ny,host))continue;
      if(W.doorAt?.(host,nx,ny)||W.chestAt?.(host,nx,ny))continue;
      if((host.enemies||[]).some(enemy=>enemy?.alive&&enemy.x===nx&&enemy.y===ny))continue;
      if((host.shops||[]).some(shop=>shop?.active&&shop.x===nx&&shop.y===ny))continue;
      const start={x:p1.x,y:p1.y};movePlayer(p1,dir.x,dir.y);movement={moved:p1.x!==start.x||p1.y!==start.y,controller:window.CCGLostSizzlerModeRuntime?.detect?.()||"",mode:String(mode||"")};if(movement.moved)break;
    }
    return{
      version:api.version,before,after,liveRooms,samples,secret,exit,movement,
      hostSummary:{...(host.v142RoomGrammar||{})},floor:Number(run.floor||0),controller:window.CCGLostSizzlerModeRuntime?.detect?.()||""
    };
  });

  assert.equal(result.version,"V10.42-r24","Live R24 room-grammar API must expose the intended version.");
  assert.equal(result.floor,1,"R24 live qualification must begin on the first campaign depth.");
  assert.equal(result.hostSummary.biome,"threshold","Floor 1 live grammar must consume the R6 Threshold biome.");
  assert.equal(result.hostSummary.identity,"RUINED APPROACH","Floor 1 live grammar must expose its stronger depth identity.");
  assert.equal(result.liveRooms.length,result.hostSummary.plans.length,"Every generated live room must receive exactly one grammar plan.");
  assert.ok(result.liveRooms.length>=3,"Live Solo generation must provide enough rooms to qualify room grammar.");
  assert.ok(result.liveRooms.every(room=>room.environment&&room.objective&&room.grammar.version==="V10.42-r24"),"R24 must compose after R6 environment and R7 objective metadata for every live room.");
  assert.ok(result.liveRooms.every(room=>room.grammar.landmark&&room.grammar.routeIntent&&room.grammar.approachCue&&room.grammar.foreshadowing),"Every live room grammar must carry landmark, route, approach and foreshadowing descriptors.");
  assert.equal(new Set(result.samples.map(sample=>sample.biomeIdentity)).size,5,"All five campaign biomes must expose distinct R24 identities.");
  assert.equal(new Set(result.samples.map(sample=>sample.landmark)).size,5,"All five campaign biomes must expose distinct deterministic landmarks for the same room seed.");
  assert.deepEqual(result.samples.map(sample=>sample.biome),["threshold","iron","bone","ash","sigil"],"R24 must preserve the established five-depth biome order.");
  assert.equal(result.secret.archetype,"concealed alcove","Hidden alcoves must refine room grammar into a distinct exploration archetype.");
  assert.equal(result.secret.routeIntent,"search","Hidden alcoves must advertise search intent without changing progression.");
  assert.equal(result.exit.routeIntent,"descend","Exit rooms must advertise descent intent without opening or changing exits.");
  assert.deepEqual(result.after,result.before,"Reapplying R24 metadata must not mutate map, revision or live entity collections.");
  assert.equal(result.controller,"dungeon-solo","R24 qualification must leave Solo controller ownership intact.");
  assert.equal(result.movement.moved,true,"Solo movement must remain responsive after R24 metadata application.");
  assert.equal(result.movement.mode,"playing","R24 must not introduce a gameplay mode.");
  assert.equal(result.movement.controller,"dungeon-solo","Post-R24 movement must remain under Solo ownership.");
  assert.deepEqual(errors,[],`R24 biome room-grammar qualification must not raise page errors: ${errors.join("\n")}`);
  assert.deepEqual(failedScripts,[],`R24 biome room-grammar qualification must not lose same-origin scripts: ${failedScripts.join("\n")}`);

  console.log(`Lost Sizzler V10.42 R24 biome room-grammar qualification passed: ${JSON.stringify({rooms:result.liveRooms.length,identities:result.samples.map(sample=>sample.biomeIdentity)})}`);
  await context.close();
}finally{
  await browser.close();
  for(const socket of sockets)socket.destroy();
  await new Promise(resolve=>server.close(()=>resolve()));
}