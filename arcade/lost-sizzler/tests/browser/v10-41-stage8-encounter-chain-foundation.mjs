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
  await page.waitForFunction(()=>document.body.dataset.releaseReady==="true"&&Boolean(document.getElementById("solo-btn")),null,{timeout:90000});
  await page.click("#solo-btn");
  await page.waitForFunction(()=>document.body.dataset.runActive==="true"&&mode==="playing"&&playMode==="solo"&&Boolean(run)&&Boolean(host)&&Boolean(p1)&&Boolean(world),null,{timeout:20000});

  const result=await page.evaluate(()=>{
    const scoreBefore=Number(score||0),xpBefore=Number(p1.xp||0),secretsBefore=Number(run.stats?.secrets||0),chestsBefore=Number(run.stats?.chests||0),revisionBefore=Number(host.revision||0);
    const door={id:"stage8-chain-secret",type:"secret",x:p1.x+20,y:p1.y+20,locked:true,hidden:true,open:false,opening:false};
    host.doors.push(door);
    tryDoor(p1,door.x,door.y);
    const afterDoor={locked:door.locked,hidden:door.hidden,opening:door.opening,secrets:Number(run.stats?.secrets||0),score:Number(score||0),xp:Number(p1.xp||0),revision:Number(host.revision||0)};

    const chest={id:"stage8-chain-chest",x:p1.x+21,y:p1.y+20,active:true,locked:false,depth:Number(run.floor||1),loot:{kind:"ammo",name:"Stage 8 Qualification Cache",rarity:"STANDARD",amount:1}};
    host.chests.push(chest);
    openChest(p1,chest);
    const afterChest={active:chest.active,opened:chest.opened,chests:Number(run.stats?.chests||0),score:Number(score||0),xp:Number(p1.xp||0),rewardScore:Number(chest.rewardScore||0),rewardXp:Number(chest.rewardXp||0),revision:Number(host.revision||0),mode:String(mode||""),controller:window.CCGLostSizzlerModeRuntime?.detect?.()||""};

    host.doors=host.doors.filter(item=>item!==door);
    host.chests=host.chests.filter(item=>item!==chest);
    return{scoreBefore,xpBefore,secretsBefore,chestsBefore,revisionBefore,afterDoor,afterChest};
  });

  assert.equal(result.afterDoor.locked,false,"canonical secret-door interaction must unlock the optional branch");
  assert.equal(result.afterDoor.hidden,false,"canonical secret-door interaction must reveal the optional branch");
  assert.equal(result.afterDoor.opening,true,"canonical secret-door interaction must enter the established opening lifecycle");
  assert.equal(result.afterDoor.secrets,result.secretsBefore+1,"secret discovery must advance the canonical secret statistic exactly once");
  assert.equal(result.afterDoor.score,result.scoreBefore,"revealing an optional branch must not mint score by itself");
  assert.ok(result.afterDoor.xp>=result.xpBefore,"secret discovery may use the existing XP reward but must not reduce XP");
  assert.ok(result.afterDoor.revision>result.revisionBefore,"secret discovery must advance canonical world revision");

  assert.equal(result.afterChest.active,false,"canonical reward chest must become inactive after collection");
  assert.equal(result.afterChest.opened,true,"canonical reward chest must record its opened state");
  assert.equal(result.afterChest.chests,result.chestsBefore+1,"reward collection must advance the canonical chest statistic exactly once");
  assert.ok(result.afterChest.rewardScore>=100,"encounter reward foundation must retain the existing bounded score reward");
  assert.equal(result.afterChest.rewardXp,10,"encounter reward foundation must retain the existing chest XP reward");
  assert.equal(result.afterChest.score,result.afterDoor.score+result.afterChest.rewardScore,"reward score must be applied through the existing chest transaction");
  assert.ok(result.afterChest.xp>=result.afterDoor.xp,"reward collection must not reduce player XP");
  assert.ok(result.afterChest.revision>result.afterDoor.revision,"reward collection must advance canonical world revision");
  assert.equal(result.afterChest.mode,"playing","encounter-chain qualification must leave normal Solo play active");
  assert.equal(result.afterChest.controller,"dungeon-solo","encounter-chain qualification must retain the Solo Dungeon controller");
  assert.deepEqual(errors,[],`Stage 8 encounter-chain foundation must not raise page errors: ${errors.join("\n")}`);
  console.log(`Stage 8 encounter-chain foundation qualification passed: ${JSON.stringify(result)}`);
}finally{
  await browser.close();
  for(const socket of sockets)socket.destroy();
  await new Promise(resolve=>server.close(resolve));
}
