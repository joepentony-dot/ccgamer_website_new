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
  const context=await browser.newContext({viewport:{width:1500,height:820}}),page=await context.newPage();
  page.setDefaultTimeout(45000);
  const pageErrors=[];page.on("pageerror",error=>pageErrors.push(String(error?.stack||error)));
  await page.goto(`${origin}/arcade/lost-sizzler/`,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.body.dataset.releaseReady==="true"&&typeof window.CCGLostSizzlerV141R31SoloDungeon?.sourceHasMarker==="function"&&typeof window.openChest==="function",null,{timeout:90000});

  const synthetic=await page.evaluate(()=>{
    const api=window.CCGLostSizzlerV141R31SoloDungeon;
    const owner=function syntheticR31ImmediateLootOwner(){};owner.__ccgV141R31ChestFix=true;
    let current=owner;
    for(let i=0;i<160;i++){
      const previous=current,wrapped=function syntheticOwnershipWrapper(){return previous.apply(this,arguments)};
      if(i%3===0)wrapped.__ccgV141ModeOwnedSource=previous;
      else if(i%3===1)wrapped.__ccgOriginal=previous;
      else wrapped.__ccgV141R31Original=previous;
      current=wrapped;
    }
    const cycleA=function syntheticCycleA(){},cycleB=function syntheticCycleB(){};
    cycleA.__ccgOriginal=cycleB;cycleB.__ccgV141ModeOwnedSource=cycleA;
    return{
      deepDetected:api.sourceHasMarker(current,"__ccgV141R31ChestFix"),
      missingDetected:api.sourceHasMarker(current,"__ccgMissingR31Marker"),
      cycleMiss:api.sourceHasMarker(cycleA,"__ccgMissingR31Marker")
    };
  });
  assert.equal(synthetic.deepDetected,true,"R31 marker discovery must survive a 160-layer ownership ancestry");
  assert.equal(synthetic.missingDetected,false,"R31 marker discovery must not invent a marker in a deep ancestry");
  assert.equal(synthetic.cycleMiss,false,"R31 marker discovery must terminate safely on cyclic ancestry");

  const inspect=()=>page.evaluate(()=>{
    const seen=new Set(),rows=[];let current=window.openChest,cycle=false;
    while(typeof current==="function"&&rows.length<256){
      if(seen.has(current)){cycle=true;break}
      seen.add(current);rows.push({name:String(current.name||"anonymous"),r31:Boolean(current.__ccgV141R31ChestFix),modeGate:Boolean(current.__ccgV141ModeOwnedGate)});
      current=current.__ccgV141ModeOwnedSource||current.__ccgOriginal||current.__ccgV141R31Original||null;
    }
    return{depth:rows.length,cycle,r31Layers:rows.filter(row=>row.r31).length,signature:rows.map(row=>`${row.name}${row.r31?"[R31]":""}${row.modeGate?"[MODE]":""}`).join(" <- ")};
  });

  await page.waitForTimeout(600);
  const baseline=await inspect();
  await page.evaluate(()=>{const api=window.CCGLostSizzlerV141R31SoloDungeon;for(let i=0;i<12;i++)api.monitor()});
  await page.waitForTimeout(900);
  const stressed=await inspect();
  assert.equal(baseline.cycle,false,`openChest must begin with acyclic R31 ownership: ${baseline.signature}`);
  assert.equal(stressed.cycle,false,`openChest must retain acyclic R31 ownership: ${stressed.signature}`);
  assert.equal(baseline.r31Layers,1,`openChest must contain exactly one R31 ImmediateLoot layer after settle: ${baseline.signature}`);
  assert.equal(stressed.r31Layers,1,`openChest must retain exactly one R31 ImmediateLoot layer across monitor cycles: ${stressed.signature}`);
  assert.ok(stressed.depth<=baseline.depth,`R31 openChest ancestry must not grow across repeated monitor cycles: before=${baseline.signature}; after=${stressed.signature}`);

  assert.deepEqual(pageErrors,[],`R31 openChest ownership regression produced page errors: ${pageErrors.join("\n")}`);
  await context.close();
  console.log(`R31 openChest ownership stability regression passed: ${JSON.stringify(stressed)}`);
}finally{
  await browser.close();for(const socket of sockets)socket.destroy();await new Promise(resolve=>server.close(()=>resolve()));
}
