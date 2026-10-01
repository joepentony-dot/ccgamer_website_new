import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {chromium} from "playwright";

const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,"../../../..");
const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json; charset=utf-8",".svg":"image/svg+xml",".png":"image/png",".webp":"image/webp",".wav":"audio/wav",".mp3":"audio/mpeg",".ogg":"audio/ogg"};
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
  const context=await browser.newContext({viewport:{width:1664,height:936}});
  await context.addInitScript(()=>{try{localStorage.setItem("ccg-lost-sizzler-tutorial-seen-v1","true")}catch(_){}});
  const page=await context.newPage();
  page.setDefaultTimeout(60000);
  const errors=[];
  page.on("pageerror",error=>errors.push(String(error?.stack||error)));

  await page.goto(`${origin}/arcade/lost-sizzler/?r82-inventory-layout=1`,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.body.dataset.releaseReady==="true");
  await page.click("#solo-btn");
  await page.waitForFunction(()=>document.body.dataset.runActive==="true"&&mode==="playing"&&Boolean(p1),null,{timeout:20000});
  await page.keyboard.press("Tab");
  await page.waitForFunction(()=>mode==="inventory"&&!document.getElementById("inventory-panel")?.classList.contains("hidden"));
  await page.waitForFunction(()=>Boolean(document.getElementById("r80-wearable-strip")));

  const layout=await page.evaluate(()=>{
    const rect=selector=>{
      const node=document.querySelector(selector),r=node?.getBoundingClientRect();
      return r?{left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height}:null;
    };
    const metrics=selector=>{
      const node=document.querySelector(selector);
      return node?{scrollHeight:node.scrollHeight,clientHeight:node.clientHeight,overflowY:getComputedStyle(node).overflowY}:null;
    };
    return{
      panel:rect("#inventory-panel .inventory-panel.r71-inventory-panel"),
      layout:rect("#inventory-panel .r71-inventory-layout"),
      objective:rect("#inventory-objective"),
      loadout:rect("#inventory-loadout"),
      list:rect("#inventory-list"),
      head:rect("#inventory-loadout .r71-loadout-head"),
      board:rect("#inventory-loadout .r71-equipment-board"),
      wearables:rect("#r80-wearable-strip"),
      stats:rect("#inventory-loadout .r71-stat-strip"),
      relics:rect("#inventory-loadout .r71-relic-strip"),
      loadoutMetrics:metrics("#inventory-loadout"),
      listMetrics:metrics("#inventory-list")
    };
  });

  assert.deepEqual(errors,[],`inventory launch must have no uncaught browser errors: ${errors.join("\n")}`);
  for(const key of ["panel","layout","objective","loadout","list","head","board","wearables","stats","relics"])assert.ok(layout[key],`${key} must exist: ${JSON.stringify(layout)}`);

  const before=(a,b,tolerance=2)=>a.bottom<=b.top+tolerance;
  assert.ok(before(layout.objective,layout.loadout),`objective must finish above loadout: ${JSON.stringify(layout)}`);
  assert.ok(before(layout.objective,layout.list),`objective must finish above carried inventory: ${JSON.stringify(layout)}`);
  assert.ok(layout.loadout.right<=layout.list.left+2,`loadout and carried inventory columns must not overlap: ${JSON.stringify(layout)}`);
  assert.ok(layout.loadout.bottom<=layout.layout.bottom+2,`loadout must remain inside inventory layout: ${JSON.stringify(layout)}`);
  assert.ok(layout.list.bottom<=layout.layout.bottom+2,`carried inventory must remain inside inventory layout: ${JSON.stringify(layout)}`);

  const ordered=[layout.head,layout.board,layout.wearables,layout.stats,layout.relics];
  for(let i=0;i<ordered.length-1;i++)assert.ok(before(ordered[i],ordered[i+1],3),`loadout sections ${i} and ${i+1} overlap: ${JSON.stringify(layout)}`);

  assert.ok(["auto","scroll"].includes(layout.loadoutMetrics.overflowY),`loadout must own vertical overflow instead of overlapping later sections: ${JSON.stringify(layout.loadoutMetrics)}`);
  assert.ok(["auto","scroll"].includes(layout.listMetrics.overflowY),`carried inventory must own vertical overflow instead of clipping slots: ${JSON.stringify(layout.listMetrics)}`);

  console.log("Dungeon Carnage R82 equipment/inventory non-overlap layout passed in Chromium.");
  await context.close();
}finally{
  await browser.close();
  for(const socket of sockets)socket.destroy();
  await new Promise(resolve=>server.close(()=>resolve()));
}
