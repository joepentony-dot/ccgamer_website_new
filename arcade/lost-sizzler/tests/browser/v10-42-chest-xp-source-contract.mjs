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
  const context=await browser.newContext({viewport:{width:1560,height:800}}),page=await context.newPage();
  page.setDefaultTimeout(45000);
  const pageErrors=[];page.on("pageerror",error=>pageErrors.push(String(error?.stack||error)));
  await page.goto(`${origin}/arcade/lost-sizzler/`,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.body.dataset.gameReady==="true"&&Boolean(window.CCGLostSizzlerChestXPSourceContract)&&Boolean(document.getElementById("solo-btn")),null,{timeout:90000});
  await page.click("#solo-btn");
  await page.waitForFunction(()=>document.body.dataset.runActive==="true"&&typeof mode!=="undefined"&&mode==="playing"&&Boolean(p1)&&Boolean(run),null,{timeout:20000});

  const result=await page.evaluate(()=>{
    p1.level=1;p1.xp=0;p1.totalXp=0;p1.pendingLevels=0;run.floorXP=0;run.everEarnedXp=false;run.xpPeak=0;
    const before={xp:p1.xp,total:p1.totalXp,floor:run.floorXP};
    const blocked=awardXP(p1,10,"Chest opened");
    const afterChest={xp:p1.xp,total:p1.totalXp,floor:run.floorXP};
    awardXP(p1,7,"Enemy defeated");
    const afterCombat={xp:p1.xp,total:p1.totalXp,floor:run.floorXP};
    return{before,blocked,afterChest,afterCombat,contract:window.CCGLostSizzlerChestXPSourceContract};
  });

  assert.deepEqual(result.afterChest,result.before,`opening a chest must not grant XP: ${JSON.stringify(result)}`);
  assert.equal(result.blocked?.blocked,true,`chest XP must be rejected by the source guard: ${JSON.stringify(result.blocked)}`);
  assert.equal(result.afterCombat.total,7,`combat XP must remain available: ${JSON.stringify(result)}`);
  assert.equal(result.afterCombat.floor,7,`combat XP must still contribute to floor XP: ${JSON.stringify(result)}`);
  assert.equal(result.afterCombat.xp,7,`combat XP must still advance the current player level: ${JSON.stringify(result)}`);
  assert.equal(result.contract?.blockedReason,"Chest opened");
  assert.deepEqual(pageErrors,[],`chest XP-source browser regression produced page errors: ${pageErrors.join("\n")}`);
  await context.close();
  console.log("Chest XP is blocked while canonical combat XP remains live.");
}finally{
  await browser.close().catch(()=>{});for(const socket of sockets)socket.destroy();await new Promise(resolve=>server.close(()=>resolve()));
}
