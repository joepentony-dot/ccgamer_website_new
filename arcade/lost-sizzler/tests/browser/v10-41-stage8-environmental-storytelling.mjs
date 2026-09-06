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
assert.doesNotMatch(dialogueSource,/\bsetInterval\s*\(/,"Stage 8 environmental storytelling must not add a polling interval");
assert.doesNotMatch(dialogueSource,/\brequestAnimationFrame\s*\(/,"Stage 8 environmental storytelling must not add a frame owner");
assert.match(gameplaySource,/CCGLostSizzlerStage8NpcDialogue\?\.onRoomEntered/,"canonical room entry must publish the Stage 8 environmental event");

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
  await page.waitForFunction(()=>document.body.dataset.runActive==="true"&&mode==="playing"&&playMode==="solo"&&Boolean(world)&&Boolean(host)&&Boolean(p1),null,{timeout:20000});

  const result=await page.evaluate(()=>{
    const api=window.CCGLostSizzlerStage8NpcDialogue;
    const depth=(source,marker)=>{const seen=new Set();let current=source,count=0;while(typeof current==="function"&&!seen.has(current)){if(current[marker])count++;seen.add(current);current=current.__ccgOriginal}return count};
    const tileFor=room=>{for(let y=room.y;y<=room.y+room.h;y++)for(let x=room.x;x<=room.x+room.w;x++)if(W.walkable(world.map,x,y,host))return{x,y};return null};
    const eligible=world.rooms.map(room=>({room,tile:tileFor(room)})).filter(row=>row.tile&&api.environmentalEligible(row.room));
    if(!eligible.length)return{eligibleRooms:0};
    const fixtures=["1541_WORKSHOP","BUDGET_BIN","DEMO_LOUNGE","SID_REACTOR","ZZAP_LIBRARY"].map((theme,index)=>({id:`stage8-environment-${index}`,theme}));
    const before={score:Number(score||0),health:Number(p1.health||0),maxHealth:Number(p1.maxHealth||0),inventory:JSON.stringify(p1.inventory||[]),revision:Number(host.revision||0),presentations:Number(api.state.environmentalPresentations||0),skips:Number(api.state.environmentalBudgetSkips||0)};

    const enter=row=>{p1.x=row.tile.x;p1.y=row.tile.y;p1.rx=row.tile.x;p1.ry=row.tile.y;p1.lastRoom=-999;updateRoomMessage(p1,false);return{title:String(document.getElementById("pickup-title")?.textContent||""),body:String(document.getElementById("pickup-text")?.textContent||""),presentations:Number(api.state.environmentalPresentations||0),last:{...(api.state.last||{})}}};
    const present=room=>{const shown=api.presentEnvironmentalStory(p1,room);return{shown,presentations:Number(api.state.environmentalPresentations||0),last:{...(api.state.last||{})}}};
    const first=enter(eligible[0]);
    const firstAgain=enter(eligible[0]);
    const second=present(fixtures[0]);
    const third=present(fixtures[1]);
    const fourth=present(fixtures[2]);

    const beforeIsolation={presentations:Number(api.state.environmentalPresentations||0),lastKey:String(api.state.last?.key||"")};
    document.body.dataset.specialMode="horde-survivor";
    const isolated=present(fixtures[3]);
    delete document.body.dataset.specialMode;

    const forced=api.presentEnvironmentalStory(p1,fixtures[4],{force:true});
    const after={score:Number(score||0),health:Number(p1.health||0),maxHealth:Number(p1.maxHealth||0),inventory:JSON.stringify(p1.inventory||[]),revision:Number(host.revision||0),presentations:Number(api.state.environmentalPresentations||0),skips:Number(api.state.environmentalBudgetSkips||0),lastKey:String(api.state.last?.key||"")};

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

    return{eligibleRooms:eligible.length,before,first,firstAgain,second,third,fourth,beforeIsolation,isolated,forced,after,movement,toastDepth:depth(window.showToast,"__ccgStage8ScoutToastBridge"),rescueDepth:depth(window.triggerRescue,"__ccgStage8NpcDialogue"),controller:window.CCGLostSizzlerModeRuntime?.detect?.()||""};
  });

  assert.ok(result.eligibleRooms>=1,"generated Solo floor must provide an ordinary room backed by a Stage 8 environmental record");
  assert.match(result.first.last.key,/^environment\./,"first eligible canonical room entry must present an environmental record");
  assert.ok(result.first.last.text.length>20,"environmental record must expose its configured gameplay guidance text");
  assert.match(result.first.last.voiceKey,/^environment\./,"environmental record must retain its package-safe optional voice key");
  assert.equal(result.firstAgain.presentations,result.first.presentations,"re-entering the same room must not repeat its environmental record");
  assert.equal(result.third.presentations,result.before.presentations+3,"only three environmental records may appear on one generated floor");
  assert.equal(result.second.shown,true,"a second eligible room may use the shared environmental presentation boundary");
  assert.equal(result.third.shown,true,"a third eligible room may use the shared environmental presentation boundary");
  assert.equal(result.fourth.shown,false,"the fourth eligible room must be rejected by the per-floor story budget");
  assert.equal(result.fourth.presentations,result.third.presentations,"the fourth eligible room must respect the per-floor story budget");
  assert.ok(result.after.skips>result.before.skips,"the bounded story budget must expose a diagnostic skip");
  assert.equal(result.isolated.shown,false,"Horde ownership must reject Stage 8 environmental records");
  assert.equal(result.isolated.presentations,result.beforeIsolation.presentations,"Horde ownership must suppress Stage 8 environmental records");
  assert.equal(result.isolated.last.key,result.beforeIsolation.lastKey,"cross-mode isolation must not replace the last Solo environmental record");
  assert.equal(result.forced,false,"forced initial room setup must remain silent");
  assert.equal(result.after.score,result.before.score,"environmental records must not mutate score");
  assert.equal(result.after.health,result.before.health,"environmental records must not mutate health");
  assert.equal(result.after.maxHealth,result.before.maxHealth,"environmental records must not mutate maximum health");
  assert.equal(result.after.inventory,result.before.inventory,"environmental records must not mutate inventory");
  assert.equal(result.after.revision,result.before.revision,"environmental records must not mutate world revision");
  assert.equal(result.toastDepth,1,"environmental records must reuse the existing single Stage 8 toast bridge");
  assert.equal(result.rescueDepth,1,"environmental records must not grow Scout rescue ownership");
  assert.equal(result.movement.moved,true,"Solo movement must remain responsive after environmental records");
  assert.equal(result.movement.mode,"playing","environmental records must not add a gameplay mode");
  assert.equal(result.movement.controller,"dungeon-solo","post-record movement must remain under Solo ownership");
  assert.equal(result.controller,"dungeon-solo","environmental storytelling must leave the Solo controller intact");
  assert.deepEqual(errors,[],`Stage 8 environmental storytelling regression must not raise page errors: ${errors.join("\n")}`);
  console.log(`Stage 8 environmental storytelling qualification passed: ${JSON.stringify(result)}`);
}finally{
  await browser.close();
  for(const socket of sockets)socket.destroy();
  await new Promise(resolve=>server.close(resolve));
}
