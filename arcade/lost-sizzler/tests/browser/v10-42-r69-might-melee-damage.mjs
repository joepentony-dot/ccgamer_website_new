import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {chromium} from "playwright";

const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,"../../../..");
const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json",".svg":"image/svg+xml",".webp":"image/webp",".png":"image/png",".mp3":"audio/mpeg",".ogg":"audio/ogg"};
const sockets=new Set();
const server=http.createServer((req,res)=>{
  try{
    const pathname=decodeURIComponent(new URL(req.url,"http://local").pathname),relative=pathname.endsWith("/")?pathname+"index.html":pathname,file=path.resolve(repo,"."+relative);
    if(!file.startsWith(repo+path.sep)&&file!==repo){res.writeHead(403).end("forbidden");return}
    fs.readFile(file,(error,data)=>{if(error){res.writeHead(404,{connection:"close"}).end("not found");return}res.writeHead(200,{"content-type":mime[path.extname(file).toLowerCase()]||"application/octet-stream","cache-control":"no-store",connection:"close"});res.end(data)});
  }catch(error){res.writeHead(500,{connection:"close"}).end(String(error))}
});
server.on("connection",socket=>{sockets.add(socket);socket.on("close",()=>sockets.delete(socket))});
await new Promise((resolve,reject)=>{server.once("error",reject);server.listen(0,"127.0.0.1",resolve)});
const origin="http://127.0.0.1:"+server.address().port;
const browser=await chromium.launch({headless:true,args:["--disable-dev-shm-usage","--disable-background-networking"]});

try{
  const context=await browser.newContext({viewport:{width:1280,height:800}});
  const page=await context.newPage();page.setDefaultTimeout(60000);
  const errors=[];page.on("pageerror",error=>errors.push(String(error?.stack||error)));
  await page.goto(origin+"/arcade/lost-sizzler/?r69-might-melee=1",{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.body.dataset.releaseReady==="true"&&typeof window.CCGLostSizzlerMeleeAmmoV125?.meleeDamageFor==="function",null,{timeout:90000});
  const result=await page.evaluate(()=>{
    const api=window.CCGLostSizzlerMeleeAmmoV125;
    const base={level:1,meleeWeapon:{power:1},damageBonus:0};
    const level6={...base,level:6};
    return{
      base:api.meleeDamageFor(base),
      plusOne:api.meleeDamageFor({...base,damageBonus:1}),
      plusTwo:api.meleeDamageFor({...base,damageBonus:2}),
      mastery:api.meleeDamageFor(level6),
      masteryPlusOne:api.meleeDamageFor({...level6,damageBonus:1})
    };
  });
  assert.equal(result.base,1,"starter sword baseline damage changed unexpectedly");
  assert.equal(result.plusOne,2,"+1 Might/general damage bonus must add exactly one melee damage");
  assert.equal(result.plusTwo,3,"+2 damage bonus must add exactly two melee damage");
  assert.equal(result.mastery,2,"level-6 melee mastery must still add one damage");
  assert.equal(result.masteryPlusOne,3,"Might damage and melee mastery must stack additively");
  assert.deepEqual(errors,[],"R69 Might/melee browser contract must not raise page errors: "+errors.join("\n"));
  console.log("C64 Dungeon Carnage R69 Might/melee damage contract passed:",JSON.stringify(result));
  await context.close();
}finally{
  await browser.close();
  for(const socket of sockets)socket.destroy();
  await new Promise(resolve=>server.close(resolve));
}
