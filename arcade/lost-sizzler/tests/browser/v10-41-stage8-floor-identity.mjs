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
assert.doesNotMatch(dialogueSource,/\bsetInterval\s*\(/,"Stage 8 floor identity must not add a polling interval");
assert.doesNotMatch(dialogueSource,/\brequestAnimationFrame\s*\(/,"Stage 8 floor identity must not add a frame owner");
assert.doesNotMatch(dialogueSource,/window\.(?:update|movePlayer|hurtPlayer)\s*=/,"Stage 8 floor identity must not replace protected gameplay owners");

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
    const entries=Object.entries(api.lines.environment||{}).map(([theme,line])=>({theme,key:String(line.key||""),title:String(line.title||""),text:String(line.text||""),voiceKey:String(line.voiceKey||"")}));
    const before={score:Number(score||0),health:Number(p1.health||0),maxHealth:Number(p1.maxHealth||0),inventory:JSON.stringify(p1.inventory||[]),revision:Number(host.revision||0),presentations:Number(api.state.environmentalPresentations||0)};
    const firstRoom={theme:"C64_ARCHIVE"},secondRoom={theme:"1541_WORKSHOP"};
    const first=api.presentEnvironmentalStory(p1,firstRoom);
    const firstView={title:String(document.getElementById("pickup-title")?.textContent||""),text:String(document.getElementById("pickup-text")?.textContent||""),last:{...(api.state.last||{})}};
    const second=api.presentEnvironmentalStory(p1,secondRoom);
    const secondView={title:String(document.getElementById("pickup-title")?.textContent||""),text:String(document.getElementById("pickup-text")?.textContent||""),last:{...(api.state.last||{})}};
    const after={score:Number(score||0),health:Number(p1.health||0),maxHealth:Number(p1.maxHealth||0),inventory:JSON.stringify(p1.inventory||[]),revision:Number(host.revision||0),presentations:Number(api.state.environmentalPresentations||0)};
    document.body.dataset.specialMode="horde-survivor";
    const isolated=api.presentEnvironmentalStory(p1,{theme:"BUDGET_BIN"});
    delete document.body.dataset.specialMode;
    return{entries,before,after,first,second,firstView,secondView,isolated,controller:window.CCGLostSizzlerModeRuntime?.detect?.()||""};
  });

  assert.ok(result.entries.length>=10,"Stage 8 floor identity must expose a substantial set of existing room-theme identities");
  assert.equal(new Set(result.entries.map(entry=>entry.key)).size,result.entries.length,"each environmental identity must have a unique state key");
  assert.equal(new Set(result.entries.map(entry=>entry.title)).size,result.entries.length,"each environmental identity must have a distinct presentation title");
  assert.equal(new Set(result.entries.map(entry=>entry.voiceKey)).size,result.entries.length,"each environmental identity must keep a distinct package-safe voice key");
  assert.ok(result.entries.every(entry=>entry.text.length>=60),"each floor identity anchor must carry useful world/mechanics context rather than a label-only message");
  assert.equal(result.first,true,"first eligible room identity must present through the existing event-driven environmental boundary");
  assert.equal(result.second,true,"a different eligible room identity must remain independently presentable on the same floor within the bounded budget");
  assert.notEqual(result.firstView.title,result.secondView.title,"different room themes must produce visibly distinct identity titles");
  assert.notEqual(result.firstView.last.key,result.secondView.last.key,"different room themes must retain distinct identity state keys");
  assert.match(result.firstView.text,/Hidden routes|cracked masonry/i,"C64 Archive identity must describe its existing exploration mechanic");
  assert.match(result.secondView.text,/generators|reinforcements/i,"1541 Workshop identity must describe its existing encounter mechanic");
  assert.equal(result.after.presentations,result.before.presentations+2,"two distinct identity anchors must consume exactly two bounded environmental presentations");
  assert.equal(result.after.score,result.before.score,"floor identity must not mutate score");
  assert.equal(result.after.health,result.before.health,"floor identity must not mutate health");
  assert.equal(result.after.maxHealth,result.before.maxHealth,"floor identity must not mutate maximum health");
  assert.equal(result.after.inventory,result.before.inventory,"floor identity must not mutate inventory");
  assert.equal(result.after.revision,result.before.revision,"floor identity must not mutate world revision");
  assert.equal(result.isolated,false,"Horde ownership must reject Solo floor-identity storytelling");
  assert.equal(result.controller,"dungeon-solo","floor-identity qualification must leave Solo controller ownership intact");
  assert.deepEqual(errors,[],`Stage 8 floor-identity regression must not raise page errors: ${errors.join("\n")}`);
  console.log(`Stage 8 floor-identity qualification passed: ${JSON.stringify({count:result.entries.length,first:result.firstView.last.key,second:result.secondView.last.key})}`);
}finally{
  await browser.close();
  for(const socket of sockets)socket.destroy();
  await new Promise(resolve=>server.close(resolve));
}
