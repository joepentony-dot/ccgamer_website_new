import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {chromium} from "playwright";

const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,"../../../..");
const dialoguePath=path.join(repo,"arcade/lost-sizzler/js/v10-41-stage8-npc-dialogue.js");
const dialogueSource=fs.readFileSync(dialoguePath,"utf8");
assert.doesNotMatch(dialogueSource,/\bsetInterval\s*\(/,"Stage 8 sanctuary dialogue must not add a polling interval");
assert.doesNotMatch(dialogueSource,/\brequestAnimationFrame\s*\(/,"Stage 8 sanctuary dialogue must not add a frame owner");
assert.match(dialogueSource,/npc\.sanctuary\.keeper/,"sanctuary dialogue must retain an offline/local voice-key contract with text fallback");

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
  await page.waitForFunction(()=>window.CCGLostSizzlerStage8NpcDialogue?.state?.sanctuaryInstalled===true,null,{timeout:10000});

  const result=await page.evaluate(()=>{
    const api=window.CCGLostSizzlerStage8NpcDialogue;
    const depth=(source,marker)=>{const seen=new Set();let current=source,count=0;while(typeof current==="function"&&!seen.has(current)){if(current[marker])count++;seen.add(current);current=current.__ccgOriginal}return count};
    const room=world.rooms.find(candidate=>candidate?.sanctuary);
    if(!room)return{missingSanctuary:true};
    let tile=null;
    for(let y=room.y;y<=room.y+room.h&&!tile;y++)for(let x=room.x;x<=room.x+room.w;x++)if(W.walkable(world.map,x,y,host)){tile={x,y};break}
    if(!tile)return{missingTile:true,roomId:room.id};

    p1.x=tile.x;p1.y=tile.y;p1.rx=tile.x;p1.ry=tile.y;p1.lastRoom=-999;
    const before={score:Number(score||0),health:Number(p1.health||0),maxHealth:Number(p1.maxHealth||0),inventory:JSON.stringify(p1.inventory||[]),revision:Number(host.revision||0),presentations:Number(api.state.presentations||0),suppressed:Number(api.state.suppressed||0)};
    updateRoomMessage(p1,false);
    const first={title:String(document.getElementById("pickup-title")?.textContent||""),body:String(document.getElementById("pickup-text")?.textContent||""),last:{...(api.state.last||{})}};

    p1.lastRoom=-999;
    updateRoomMessage(p1,false);
    const second={title:String(document.getElementById("pickup-title")?.textContent||""),body:String(document.getElementById("pickup-text")?.textContent||""),presentations:Number(api.state.presentations||0),suppressed:Number(api.state.suppressed||0)};
    const after={score:Number(score||0),health:Number(p1.health||0),maxHealth:Number(p1.maxHealth||0),inventory:JSON.stringify(p1.inventory||[]),revision:Number(host.revision||0)};

    const priorSpecial=document.body.dataset.specialMode||"";
    document.body.dataset.specialMode="horde-survivor";
    const isolatedArgs=api.augmentSanctuaryToast(["SANCTUARY — ISOLATION TEST","Canonical sanctuary text.","green",1000]);
    if(priorSpecial)document.body.dataset.specialMode=priorSpecial;else delete document.body.dataset.specialMode;

    return{roomId:room.id,before,first,second,after,isolated:String(isolatedArgs[1]||""),toastDepth:depth(window.showToast,"__ccgStage8ScoutToastBridge"),sanctuaryDepth:depth(window.showToast,"__ccgStage8SanctuaryDialogue"),controller:window.CCGLostSizzlerModeRuntime?.detect?.()||""};
  });

  assert.notEqual(result.missingSanctuary,true,"generated Solo floor must expose the existing sanctuary-room contract");
  assert.notEqual(result.missingTile,true,"existing sanctuary room must contain a walkable tile");
  assert.match(result.first.title,/^SANCTUARY — /,"canonical sanctuary title must remain owned by updateRoomMessage");
  assert.match(result.first.body,/No monster can enter this safe room\./,"canonical sanctuary safety guidance must remain present");
  assert.match(result.first.body,/green regeneration square to recover 1 HP every 3 seconds\./,"canonical regeneration guidance must remain present");
  assert.match(result.first.body,/Keeper: /,"Stage 8 must append the Sanctuary Keeper character line to the canonical room toast");
  assert.equal(result.first.last.key,"sanctuary.keeper","Stage 8 must expose the sanctuary dialogue key for optional local voice assets");
  assert.equal(result.first.last.voiceKey,"npc.sanctuary.keeper","Stage 8 sanctuary must retain its package-safe local voice key");
  assert.doesNotMatch(result.second.body,/Keeper: /,"immediate repeated sanctuary room messaging must suppress only the repeated character line");
  assert.ok(result.second.suppressed>result.before.suppressed,"repeat suppression counter must advance for repeated sanctuary dialogue");
  assert.equal(result.after.score,result.before.score,"sanctuary dialogue must not mutate score");
  assert.equal(result.after.health,result.before.health,"sanctuary dialogue must not itself mutate health");
  assert.equal(result.after.maxHealth,result.before.maxHealth,"sanctuary dialogue must not mutate maximum health");
  assert.equal(result.after.inventory,result.before.inventory,"sanctuary dialogue must not mutate inventory");
  assert.equal(result.after.revision,result.before.revision,"sanctuary dialogue must not mutate world revision");
  assert.equal(result.isolated,"Canonical sanctuary text.","special modes must receive the canonical toast without Stage 8 sanctuary dialogue");
  assert.equal(result.toastDepth,1,"shared Stage 8 toast wrapper depth must remain exactly one");
  assert.equal(result.sanctuaryDepth,1,"sanctuary dialogue must share that single event-driven toast wrapper");
  assert.equal(result.controller,"dungeon-solo","sanctuary qualification must leave Solo controller ownership intact");
  assert.deepEqual(errors,[],`Stage 8 sanctuary dialogue regression must not raise page errors: ${errors.join("\n")}`);
  console.log(`Stage 8 sanctuary dialogue qualification passed: ${JSON.stringify(result)}`);
}finally{
  await browser.close();
  for(const socket of sockets)socket.destroy();
  await new Promise(resolve=>server.close(resolve));
}
