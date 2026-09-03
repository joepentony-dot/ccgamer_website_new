import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {chromium} from "playwright";

const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,"../../../..");
const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".mjs":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json",".svg":"image/svg+xml",".png":"image/png",".webp":"image/webp",".ogg":"audio/ogg",".mp3":"audio/mpeg"};
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
  const context=await browser.newContext({viewport:{width:1900,height:1000}}),page=await context.newPage();page.setDefaultTimeout(60000);const errors=[];page.on("pageerror",error=>errors.push(String(error?.stack||error)));
  await page.goto(`${origin}/arcade/lost-sizzler/`,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.body.dataset.releaseReady==="true"&&Boolean(window.CCGLostSizzlerV141R56PlaytestCompletion)&&Boolean(window.CCGLostSizzlerV141R57DesktopPrepStability));

  const started=await page.evaluate(()=>{
    net.setSolo("Agent One");const id=String(net.sessionId);
    return window.CCGLostSizzlerSpecialModes.startOnline({roomMode:"sizzler-saboteurs",players:[{id,name:"Agent One"},{id:"R56Z-SPY-B",name:"Agent Two"}],hostId:id,seed:"V141-R56Z-QUICK-OWNER",roomCode:"R56ZSPY"});
  });
  assert.equal(started,true,"diagnostic Spy fixture must start");
  await page.waitForFunction(()=>document.body.dataset.specialMode==="sizzler-saboteurs"&&Boolean(window.CCGLostSizzlerV141R32SpyOverhaul));
  await page.waitForTimeout(250);
  await page.evaluate(async()=>{await Promise.resolve(quitToMenu())});
  await page.waitForFunction(()=>document.body.dataset.runActive!=="true"&&!document.getElementById("menu").classList.contains("hidden"));
  await page.locator("#solo-btn").click();
  await page.waitForFunction(()=>document.body.dataset.runActive==="true"&&String(playMode)==="solo"&&Boolean(p1),null,{timeout:10000});

  const evidence=await page.evaluate(()=>{
    const describe=()=>[...document.querySelectorAll("#quick-slots .quick-slot")].slice(0,3).map((slot,index)=>({
      index,
      html:slot.innerHTML,
      directCanonical:Boolean(slot.querySelector(":scope > .item-svg-wrap svg,:scope > .item-svg-wrap img.item-art")),
      anyCanonical:Boolean(slot.querySelector(".item-svg-wrap svg,.item-svg-wrap img.item-art")),
      directChildren:[...slot.children].map(node=>`${node.tagName.toLowerCase()}.${String(node.className||"").trim().replace(/\s+/g,".")}`)
    }));
    const chain=fn=>{const rows=[],seen=new Set();let current=fn;while(typeof current==="function"&&!seen.has(current)&&rows.length<48){seen.add(current);rows.push({name:String(current.name||"anonymous"),markers:Object.keys(current).filter(key=>key.startsWith("__ccg")).sort()});current=current.__ccgV141ModeOwnedSource||current.__ccgOriginal||current.__ccgV141R31Original||null}return rows};
    p1.inventorySlots=3;p1.inventory=[{kind:"potion",name:"Restoration Potion",qty:2},{kind:"teleport",name:"Teleport Spell",qty:1},{kind:"artefact",name:"Rare Artefact",qty:1}];
    sync();
    const afterSync=describe();
    const directIconSamples={potion:itemIconSVG("potion","Restoration Potion"),teleport:itemIconSVG("teleport","Teleport Spell"),artefact:itemIconSVG("artefact","Rare Artefact")};
    window.CCGLostSizzlerV141R56PlaytestCompletion.renderQuickIcons();
    const afterOverlay=describe();
    return{
      afterSync,afterOverlay,directIconSamples,
      syncChain:chain(sync),itemIconChain:chain(itemIconSVG),
      syncSource:Function.prototype.toString.call(sync).slice(0,1400),
      itemIconSource:Function.prototype.toString.call(itemIconSVG).slice(0,1400),
      mode:String(mode),playMode:String(playMode),controller:String(document.body.dataset.modeController||""),special:String(document.body.dataset.specialMode||"")
    };
  });
  console.log(`R56Z Quick Inventory ownership evidence: ${JSON.stringify(evidence)}`);
  for(const row of evidence.afterSync)assert.equal(row.directCanonical,true,`core canonical artwork must exist immediately after live sync(), slot ${row.index+1}: ${JSON.stringify(evidence)}`);
  for(const row of evidence.afterOverlay)assert.equal(row.directCanonical,true,`R56 overlay must preserve canonical artwork, slot ${row.index+1}: ${JSON.stringify(evidence)}`);
  assert.deepEqual(errors,[],`quick inventory owner diagnostic must have no page errors: ${errors.join("\n")}`);
  await context.close();
  console.log("R56Z Quick Inventory owner diagnostic passed.");
}finally{
  await browser.close();for(const socket of sockets)socket.destroy();await new Promise(resolve=>server.close(()=>resolve()));
}
