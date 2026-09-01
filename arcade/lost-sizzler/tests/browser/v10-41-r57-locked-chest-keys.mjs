import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {chromium} from "playwright";

const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,"../../../..");
const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".mjs":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json; charset=utf-8",".svg":"image/svg+xml",".webp":"image/webp",".png":"image/png",".jpg":"image/jpeg",".jpeg":"image/jpeg",".ogg":"audio/ogg",".mp3":"audio/mpeg"};
const sockets=new Set();
const server=http.createServer((req,res)=>{
  try{
    const pathname=decodeURIComponent(new URL(req.url,"http://local").pathname);
    const relative=pathname.endsWith("/")?`${pathname}index.html`:pathname;
    const file=path.resolve(repo,`.${relative}`);
    if(!file.startsWith(`${repo}${path.sep}`)&&file!==repo){res.writeHead(403).end("forbidden");return;}
    fs.readFile(file,(error,data)=>{
      if(error){res.writeHead(404,{connection:"close"}).end("not found");return;}
      res.writeHead(200,{"content-type":mime[path.extname(file).toLowerCase()]||"application/octet-stream","cache-control":"no-store",connection:"close"});
      res.end(data);
    });
  }catch(error){res.writeHead(500,{connection:"close"}).end(String(error));}
});
server.on("connection",socket=>{sockets.add(socket);socket.on("close",()=>sockets.delete(socket));});
await new Promise((resolve,reject)=>{server.once("error",reject);server.listen(0,"127.0.0.1",resolve);});
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,args:["--disable-dev-shm-usage","--disable-background-networking","--autoplay-policy=no-user-gesture-required"]});

try{
  const context=await browser.newContext({viewport:{width:1560,height:800}});
  const page=await context.newPage();
  page.setDefaultTimeout(45000);
  const pageErrors=[];
  page.on("pageerror",error=>pageErrors.push(String(error?.stack||error)));

  await page.goto(`${origin}/arcade/lost-sizzler/`,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.body.dataset.releaseReady==="true"&&Boolean(window.CCGLostSizzlerV141R56PlaytestCompletion)&&Boolean(document.getElementById("solo-btn")),null,{timeout:90000});
  await page.click("#solo-btn");
  await page.waitForFunction(()=>document.body.dataset.runActive==="true"&&typeof mode!=="undefined"&&mode==="playing"&&Boolean(p1)&&Boolean(host)&&typeof tryChest==="function",null,{timeout:20000});

  const keyed=await page.evaluate(()=>{
    p1.bronzeKeys=2;
    p1.inventorySlots=6;
    p1.inventory=[];
    const row={id:"r57-locked-keyed",x:p1.x,y:p1.y,active:true,opened:false,locked:true,mimic:false,depth:4,loot:{kind:"potion",amount:1,qty:1,rarity:"SIZZLER",name:"SIZZLER Restoration Potion"}};
    host.chests=[row];
    const result=tryChest(p1,row.x,row.y);
    const count=(p1.inventory||[]).filter(item=>item.kind==="potion").reduce((n,item)=>n+Math.max(1,Number(item.qty)||1),0);
    return{result,opened:Boolean(row.opened),active:Boolean(row.active),keys:Number(p1.bronzeKeys||0),count};
  });
  assert.equal(keyed.result,true,`a locked chest with bronze keys and inventory space must open: ${JSON.stringify(keyed)}`);
  assert.equal(keyed.opened,true,`the keyed chest must be marked opened: ${JSON.stringify(keyed)}`);
  assert.equal(keyed.active,false,`the keyed chest must stop blocking the tile after opening: ${JSON.stringify(keyed)}`);
  assert.equal(keyed.keys,1,`a locked chest must consume exactly one bronze key: ${JSON.stringify(keyed)}`);
  assert.equal(keyed.count,1,`the keyed chest must deliver its reward exactly once immediately: ${JSON.stringify(keyed)}`);

  await page.waitForTimeout(700);
  const repeat=await page.evaluate(()=>{
    const row=host.chests[0];
    const beforeKeys=Number(p1.bronzeKeys||0);
    const beforeCount=(p1.inventory||[]).filter(item=>item.kind==="potion").reduce((n,item)=>n+Math.max(1,Number(item.qty)||1),0);
    const result=tryChest(p1,row.x,row.y);
    const afterCount=(p1.inventory||[]).filter(item=>item.kind==="potion").reduce((n,item)=>n+Math.max(1,Number(item.qty)||1),0);
    return{result,beforeKeys,afterKeys:Number(p1.bronzeKeys||0),beforeCount,afterCount,opened:Boolean(row.opened),active:Boolean(row.active)};
  });
  assert.equal(repeat.beforeCount,1,`the legacy delayed callback must not duplicate keyed chest loot: ${JSON.stringify(repeat)}`);
  assert.equal(repeat.afterCount,1,`revisiting an opened chest must not duplicate its loot: ${JSON.stringify(repeat)}`);
  assert.equal(repeat.afterKeys,repeat.beforeKeys,`revisiting an opened chest must not consume another bronze key: ${JSON.stringify(repeat)}`);
  assert.equal(repeat.opened,true);
  assert.equal(repeat.active,false);

  const held=await page.evaluate(()=>{
    p1.bronzeKeys=1;
    p1.inventorySlots=3;
    p1.inventory=[{kind:"torch",name:"Torch A"},{kind:"torch",name:"Torch B"},{kind:"torch",name:"Torch C"}];
    const row={id:"r57-locked-full",x:p1.x,y:p1.y,active:true,opened:false,locked:true,mimic:false,depth:2,loot:{kind:"potion",amount:1,qty:1,rarity:"COMMON",name:"COMMON Restoration Potion"}};
    host.chests=[row];
    const result=tryChest(p1,row.x,row.y);
    return{result,opened:Boolean(row.opened),active:Boolean(row.active),keys:Number(p1.bronzeKeys||0),toast:String(document.getElementById("pickup-title")?.textContent||"")};
  });
  assert.equal(held.result,false,`a full Quick Inventory must hold the chest rather than lose its reward: ${JSON.stringify(held)}`);
  assert.equal(held.opened,false,`a held locked chest must remain unopened: ${JSON.stringify(held)}`);
  assert.equal(held.active,true,`a held locked chest must remain available for retry: ${JSON.stringify(held)}`);
  assert.equal(held.keys,1,`a held locked chest must not consume its bronze key before the reward can be collected: ${JSON.stringify(held)}`);
  assert.match(held.toast,/INVENTORY FULL|CHEST HELD/i,`the refusal must explain why the keyed chest did not open: ${JSON.stringify(held)}`);

  const retry=await page.evaluate(()=>{
    p1.inventory.pop();
    const row=host.chests[0];
    const result=tryChest(p1,row.x,row.y);
    const count=(p1.inventory||[]).filter(item=>item.kind==="potion").reduce((n,item)=>n+Math.max(1,Number(item.qty)||1),0);
    return{result,opened:Boolean(row.opened),active:Boolean(row.active),keys:Number(p1.bronzeKeys||0),count};
  });
  assert.equal(retry.result,true,`freeing one Quick Inventory slot must allow the same keyed chest to open: ${JSON.stringify(retry)}`);
  assert.equal(retry.opened,true);
  assert.equal(retry.active,false);
  assert.equal(retry.keys,0,`the successful retry must consume exactly the one retained bronze key: ${JSON.stringify(retry)}`);
  assert.equal(retry.count,1,`the successful retry must deliver the held reward once: ${JSON.stringify(retry)}`);

  await page.waitForTimeout(700);
  const retryAfterDelay=await page.evaluate(()=>(p1.inventory||[]).filter(item=>item.kind==="potion").reduce((n,item)=>n+Math.max(1,Number(item.qty)||1),0));
  assert.equal(retryAfterDelay,1,"the delayed legacy callback must not duplicate a retried keyed chest reward");
  assert.deepEqual(pageErrors,[],`locked bronze-key chest browser regression produced page errors: ${pageErrors.join("\n")}`);

  await context.close();
  console.log("Locked bronze-key chest open, key retention, full-inventory hold and retry browser regression passed.");
}finally{
  await browser.close();
  for(const socket of sockets)socket.destroy();
  await new Promise(resolve=>server.close(()=>resolve()));
}
