import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {chromium} from "playwright";

const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,"../../../..");
const dialoguePath=path.join(repo,"arcade/lost-sizzler/js/v10-41-stage8-npc-dialogue.js");
const gameplayPath=path.join(repo,"arcade/lost-sizzler/js/game-play.js");
const dialogueSource=fs.readFileSync(dialoguePath,"utf8");
const gameplaySource=fs.readFileSync(gameplayPath,"utf8");
assert.doesNotMatch(dialogueSource,/\bsetInterval\s*\(/,"Stage 8 exploration interactions must not add a polling interval");
assert.doesNotMatch(dialogueSource,/\brequestAnimationFrame\s*\(/,"Stage 8 exploration interactions must not add a frame owner");
assert.match(gameplaySource,/CCGLostSizzlerStage8NpcDialogue\?\.onMovementBoundary/,"canonical movement triggers must publish the Stage 8 exploration event");

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
  const context=await browser.newContext({viewport:{width:1600,height:900}}),page=await context.newPage();
  page.setDefaultTimeout(45000);
  const errors=[];page.on("pageerror",error=>errors.push(String(error?.stack||error)));
  await page.goto(`${origin}/arcade/lost-sizzler/`,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.body.dataset.releaseReady==="true"&&Boolean(window.CCGLostSizzlerStage8NpcDialogue)&&Boolean(document.getElementById("solo-btn")),null,{timeout:90000});
  await page.click("#solo-btn");
  await page.waitForFunction(()=>document.body.dataset.runActive==="true"&&mode==="playing"&&playMode==="solo"&&Boolean(world?.dungeonVariety)&&Boolean(host)&&Boolean(p1),null,{timeout:20000});

  const result=await page.evaluate(()=>{
    const api=window.CCGLostSizzlerStage8NpcDialogue;
    const depth=(source,marker)=>{const seen=new Set();let current=source,count=0;while(typeof current==="function"&&!seen.has(current)){if(current[marker])count++;seen.add(current);current=current.__ccgOriginal}return count};
    let structural=null;
    outer:for(let y=1;y<world.map.length-1;y++)for(let x=1;x<world.map[y].length-1;x++){
      if(!W.walkable(world.map,x,y,host))continue;
      const feature=api.explorationFeatureAt({x,y});
      if(feature){structural={x,y,feature};break outer}
    }
    if(!structural)return{missingStructuralFeature:true,meta:{deadEnds:world.dungeonVariety.deadEnds?.length||0,shortcuts:world.dungeonVariety.shortcuts?.length||0,galleries:world.dungeonVariety.galleries?.length||0,junctions:world.dungeonVariety.junctions?.length||0,parallelLoops:world.dungeonVariety.parallelLoops?.length||0}};

    p1.x=structural.x;p1.y=structural.y;p1.rx=structural.x;p1.ry=structural.y;p1.lastRoom=-999;
    const beforeCanonical=Number(api.state.explorationPresentations||0);
    movementTriggers(p1);
    const canonical={presentations:Number(api.state.explorationPresentations||0),last:{...(api.state.last||{})},feature:structural.feature};
    movementTriggers(p1);
    const repeat={presentations:Number(api.state.explorationPresentations||0)};

    const before={score:Number(score||0),health:Number(p1.health||0),maxHealth:Number(p1.maxHealth||0),inventory:JSON.stringify(p1.inventory||[]),revision:Number(host.revision||0),presentations:Number(api.state.explorationPresentations||0),skips:Number(api.state.explorationBudgetSkips||0)};
    const secondShown=api.presentExplorationFeature(p1,{id:"stage8-browser-second",kind:"gallery"});
    const afterSecond={presentations:Number(api.state.explorationPresentations||0),last:{...(api.state.last||{})}};
    const thirdShown=api.presentExplorationFeature(p1,{id:"stage8-browser-third",kind:"shortcut"});
    const afterThird={presentations:Number(api.state.explorationPresentations||0),skips:Number(api.state.explorationBudgetSkips||0),last:{...(api.state.last||{})}};

    document.body.dataset.specialMode="sizzler-saboteurs";
    const isolatedShown=api.presentExplorationFeature(p1,{id:"stage8-browser-isolated",kind:"junction"});
    delete document.body.dataset.specialMode;
    const after={score:Number(score||0),health:Number(p1.health||0),maxHealth:Number(p1.maxHealth||0),inventory:JSON.stringify(p1.inventory||[]),revision:Number(host.revision||0),presentations:Number(api.state.explorationPresentations||0),skips:Number(api.state.explorationBudgetSkips||0),last:{...(api.state.last||{})}};

    let movement={moved:false};
    const dirs=[{x:1,y:0},{x:-1,y:0},{x:0,y:1},{x:0,y:-1}];
    for(const dir of dirs){
      const nx=p1.x+dir.x,ny=p1.y+dir.y;
      if(!W.walkable(world.map,nx,ny,host))continue;
      if(W.doorAt?.(host,nx,ny)||W.chestAt?.(host,nx,ny))continue;
      if((host.enemies||[]).some(enemy=>enemy?.alive&&enemy.x===nx&&enemy.y===ny))continue;
      if((host.shops||[]).some(shop=>shop?.active&&shop.x===nx&&shop.y===ny))continue;
      const start={x:p1.x,y:p1.y};movePlayer(p1,dir.x,dir.y);movement={moved:p1.x!==start.x||p1.y!==start.y,mode:String(mode||""),controller:window.CCGLostSizzlerModeRuntime?.detect?.()||""};if(movement.moved)break
    }

    return{beforeCanonical,canonical,repeat,before,secondShown,afterSecond,thirdShown,afterThird,isolatedShown,after,movement,toastDepth:depth(window.showToast,"__ccgStage8ScoutToastBridge"),rescueDepth:depth(window.triggerRescue,"__ccgStage8NpcDialogue"),controller:window.CCGLostSizzlerModeRuntime?.detect?.()||""};
  });

  assert.notEqual(result.missingStructuralFeature,true,`generated Solo floor must expose walkable dungeon-variety metadata: ${JSON.stringify(result.meta||{})}`);
  assert.equal(result.canonical.presentations,result.beforeCanonical+1,"canonical movement trigger must present the first structural discovery");
  assert.match(result.canonical.last.key,/^exploration\./,"structural discovery must expose an exploration dialogue key");
  assert.match(result.canonical.last.voiceKey,/^exploration\./,"structural discovery must retain its package-safe optional voice key");
  assert.equal(result.repeat.presentations,result.canonical.presentations,"repeating the same structural movement boundary must stay silent");
  assert.equal(result.secondShown,true,"a second structural discovery may use the shared exploration presentation boundary");
  assert.equal(result.afterSecond.presentations,result.before.presentations+1,"the second structural discovery must consume one presentation slot");
  assert.equal(result.thirdShown,false,"a third structural discovery must respect the per-floor interaction budget");
  assert.equal(result.afterThird.presentations,result.afterSecond.presentations,"the exhausted exploration budget must not present another record");
  assert.ok(result.afterThird.skips>result.before.skips,"the exhausted exploration budget must expose a diagnostic skip");
  assert.equal(result.isolatedShown,false,"Spy ownership must reject Stage 8 structural discoveries");
  assert.equal(result.after.score,result.before.score,"exploration records must not mutate score");
  assert.equal(result.after.health,result.before.health,"exploration records must not mutate health");
  assert.equal(result.after.maxHealth,result.before.maxHealth,"exploration records must not mutate maximum health");
  assert.equal(result.after.inventory,result.before.inventory,"exploration records must not mutate inventory");
  assert.equal(result.after.revision,result.before.revision,"exploration records must not mutate world revision");
  assert.equal(result.toastDepth,1,"exploration records must reuse the existing single Stage 8 toast bridge");
  assert.equal(result.rescueDepth,1,"exploration records must not grow Scout rescue ownership");
  assert.equal(result.movement.moved,true,"Solo movement must remain responsive after structural discoveries");
  assert.equal(result.movement.mode,"playing","exploration records must not add a gameplay mode");
  assert.equal(result.movement.controller,"dungeon-solo","post-discovery movement must remain under Solo ownership");
  assert.equal(result.controller,"dungeon-solo","exploration interactions must leave the Solo controller intact");
  assert.deepEqual(errors,[],`Stage 8 exploration interaction regression must not raise page errors: ${errors.join("\n")}`);
  console.log(`Stage 8 exploration interaction qualification passed: ${JSON.stringify(result)}`);
}finally{
  await browser.close();
  for(const socket of sockets)socket.destroy();
  await new Promise(resolve=>server.close(resolve));
}
