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
  const context=await browser.newContext({viewport:{width:1600,height:900}}),page=await context.newPage();
  page.setDefaultTimeout(45000);
  const errors=[];page.on("pageerror",error=>errors.push(String(error?.stack||error)));
  await page.goto(`${origin}/arcade/lost-sizzler/`,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.body.dataset.releaseReady==="true"&&Boolean(window.CCGLostSizzlerStage8NpcDialogue)&&Boolean(document.getElementById("solo-btn")),null,{timeout:90000});
  await page.click("#solo-btn");
  await page.waitForFunction(()=>document.body.dataset.runActive==="true"&&mode==="playing"&&playMode==="solo"&&Boolean(host)&&Boolean(p1)&&typeof window.openShop==="function",null,{timeout:20000});

  const result=await page.evaluate(()=>{
    const api=window.CCGLostSizzlerStage8NpcDialogue;
    const depth=(source,marker)=>{const seen=new Set();let current=source,count=0;while(typeof current==="function"&&!seen.has(current)){if(current[marker])count++;seen.add(current);current=current.__ccgOriginal}return count};
    const original={games:stats.games,secrets:stats.secrets,champions:run.stats.champions};
    stats.games=0;stats.secrets=0;run.stats.champions=0;
    const sourceBefore=JSON.stringify({games:stats.games,secrets:stats.secrets,champions:run.stats.champions});
    const games={...api.fieldTaskSnapshot()};
    stats.games=1;const secrets={...api.fieldTaskSnapshot()};
    stats.secrets=2;const champions={...api.fieldTaskSnapshot()};
    run.stats.champions=2;const complete={...api.fieldTaskSnapshot()};
    stats.games=0;stats.secrets=0;run.stats.champions=0;
    const sourceAfter=JSON.stringify({games:stats.games,secrets:stats.secrets,champions:run.stats.champions});

    const shop={active:true,x:p1.x,y:p1.y,shopType:"entrance",title:"DUNGEON SUPPLY SHOP",scorePurchases:0,sold:{}};
    const before={score:Number(score||0),health:Number(p1.health||0),maxHealth:Number(p1.maxHealth||0),inventory:JSON.stringify(p1.inventory||[]),revision:Number(host.revision||0),briefings:Number(api.state.merchantTaskBriefings||0)};
    const opened=window.openShop(shop,p1);
    const after={score:Number(score||0),health:Number(p1.health||0),maxHealth:Number(p1.maxHealth||0),inventory:JSON.stringify(p1.inventory||[]),revision:Number(host.revision||0),briefings:Number(api.state.merchantTaskBriefings||0),lastTask:{...(api.state.lastMerchantTask||{})},last:{...(api.state.last||{})},title:document.getElementById("pickup-title")?.textContent||"",text:document.getElementById("pickup-text")?.textContent||""};
    closeShop();

    document.body.dataset.specialMode="horde-survivor";
    const isolationBefore=Number(api.state.merchantTaskBriefings||0),isolated=api.presentMerchant({active:true,x:p1.x,y:p1.y,shopType:"entrance"},{force:true}),isolationAfter=Number(api.state.merchantTaskBriefings||0);
    delete document.body.dataset.specialMode;

    stats.games=original.games;stats.secrets=original.secrets;run.stats.champions=original.champions;
    let movement={moved:false};
    for(const dir of [{x:1,y:0},{x:-1,y:0},{x:0,y:1},{x:0,y:-1}]){
      const nx=p1.x+dir.x,ny=p1.y+dir.y;if(!W.walkable(world.map,nx,ny,host)||W.doorAt?.(host,nx,ny)||W.chestAt?.(host,nx,ny)||(host.enemies||[]).some(enemy=>enemy?.alive&&enemy.x===nx&&enemy.y===ny))continue;
      const start={x:p1.x,y:p1.y};movePlayer(p1,dir.x,dir.y);movement={moved:p1.x!==start.x||p1.y!==start.y,mode:String(mode||""),controller:window.CCGLostSizzlerModeRuntime?.detect?.()||""};if(movement.moved)break
    }
    return{games,secrets,champions,complete,sourceBefore,sourceAfter,opened,before,after,isolated,isolationBefore,isolationAfter,movement,shopDepth:depth(window.openShop,"__ccgStage8MerchantDialogue"),toastDepth:depth(window.showToast,"__ccgStage8ScoutToastBridge")};
  });

  assert.deepEqual(result.games,{id:"games",label:"Rescue 1 C64 game",progress:0,target:1},"field board must begin with the existing game-rescue side quest");
  assert.deepEqual(result.secrets,{id:"secrets",label:"Find 2 secret rooms",progress:0,target:2},"field board must advance to the existing secret-room side quest");
  assert.deepEqual(result.champions,{id:"champions",label:"Defeat 2 champions",progress:0,target:2},"field board must advance to the existing champion side quest");
  assert.equal(result.complete.id,"complete","field board must recognize completion from canonical counters");
  assert.equal(result.complete.complete,true,"completed field board must expose its terminal status");
  assert.equal(result.sourceAfter,result.sourceBefore,"reading the field board must not mutate authoritative task counters");
  assert.equal(result.opened,true,"field briefing must preserve canonical shop opening");
  assert.equal(result.after.briefings,result.before.briefings+1,"opening a merchant must present one field briefing");
  assert.equal(result.after.lastTask.id,"games","merchant briefing must record the authoritative next side quest");
  assert.equal(result.after.last.key,"merchant.entrance","field service must stay inside the existing merchant dialogue state");
  assert.match(result.after.title,/DUNGEON QUARTERMASTER/i,"field service must reuse the merchant notification surface");
  assert.match(result.after.text,/Field commission: Rescue 1 C64 game \(0\/1\)/i,"merchant must report live side-quest progress");
  assert.match(result.after.text,/existing \+350 score reward is handled automatically/i,"merchant must identify the existing automatic reward path");
  assert.equal(result.after.score,result.before.score,"field service must not change score");
  assert.equal(result.after.health,result.before.health,"field service must not change health");
  assert.equal(result.after.maxHealth,result.before.maxHealth,"field service must not change maximum health");
  assert.equal(result.after.inventory,result.before.inventory,"field service must not change inventory");
  assert.equal(result.after.revision,result.before.revision,"field service must not change world revision");
  assert.equal(result.isolated,false,"Horde ownership must reject the Solo merchant field service");
  assert.equal(result.isolationAfter,result.isolationBefore,"mode isolation must not record a briefing");
  assert.equal(result.shopDepth,1,"field service must retain one Stage 8 merchant wrapper");
  assert.equal(result.toastDepth,1,"field service must reuse the existing Stage 8 toast bridge");
  assert.equal(result.movement.moved,true,"Solo movement must remain responsive after the field service");
  assert.equal(result.movement.mode,"playing","field service must return to canonical play after the shop closes");
  assert.equal(result.movement.controller,"dungeon-solo","field service must leave movement under Solo ownership");
  assert.deepEqual(errors,[],`Stage 8 merchant field-service regression must not raise page errors: ${errors.join("\n")}`);
  console.log(`Stage 8 merchant field-service qualification passed: ${JSON.stringify(result)}`);
}finally{
  await browser.close();
  for(const socket of sockets)socket.destroy();
  await new Promise(resolve=>server.close(resolve));
}
