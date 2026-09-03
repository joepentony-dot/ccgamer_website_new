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
  await page.waitForFunction(()=>document.body.dataset.releaseReady==="true"&&Boolean(window.CCGLostSizzlerV141R56PlaytestCompletion)&&Boolean(document.getElementById("solo-btn")),null,{timeout:90000});
  await page.click("#solo-btn");
  await page.waitForFunction(()=>document.body.dataset.runActive==="true"&&typeof mode!=="undefined"&&mode==="playing"&&Boolean(p1)&&Boolean(host),null,{timeout:20000});

  const inspect=()=>page.evaluate(()=>{
    const inspectOwner=(name,r56Marker)=>{
      const seen=new Set(),rows=[];let current=window[name],cycle=false;
      while(typeof current==="function"&&rows.length<256){
        if(seen.has(current)){cycle=true;break}
        seen.add(current);
        rows.push({
          name:String(current.name||"anonymous"),
          r56:Boolean(current[r56Marker]),
          modeGate:Boolean(current.__ccgV141ModeOwnedGate&&current.__ccgV141ModeOwnedName===name)
        });
        current=typeof current.__ccgOriginal==="function"?current.__ccgOriginal:null;
      }
      return{
        depth:rows.length,
        cycle,
        r56Layers:rows.filter(row=>row.r56).length,
        modeGateLayers:rows.filter(row=>row.modeGate).length,
        signature:rows.map(row=>`${row.name}${row.r56?"[R56]":""}${row.modeGate?"[MODE]":""}`).join(" <- ")
      };
    };
    return{
      openChest:inspectOwner("openChest","__ccgV141R56ChestDelivery"),
      triggerShrine:inspectOwner("triggerShrine","__ccgV141R56ShrineFeedback")
    };
  });

  await page.waitForTimeout(1200);
  const baseline=await inspect();
  await page.waitForTimeout(1800);
  const stressed=await inspect();

  for(const name of ["openChest","triggerShrine"]){
    const before=baseline[name],after=stressed[name];
    assert.equal(before.cycle,false,`${name} ownership chain must not contain a cycle: ${JSON.stringify(baseline)}`);
    assert.equal(after.cycle,false,`${name} ownership chain must remain acyclic: ${JSON.stringify(stressed)}`);
    assert.equal(before.r56Layers,1,`${name} must contain exactly one R56 compatibility layer after settle: ${JSON.stringify(baseline)}`);
    assert.equal(after.r56Layers,1,`${name} must retain exactly one R56 compatibility layer: ${JSON.stringify(stressed)}`);
    assert.ok(before.modeGateLayers<=2,`${name} must not accumulate mode-owned gates during initial settle: ${JSON.stringify(baseline)}`);
    assert.ok(after.modeGateLayers<=2,`${name} must not accumulate mode-owned gates across monitor cycles: ${JSON.stringify(stressed)}`);
    assert.ok(before.depth<=6,`${name} ownership ancestry must remain bounded after initial settle: ${JSON.stringify(baseline)}`);
    assert.ok(after.depth<=6,`${name} ownership ancestry must remain bounded after repeated 40/80 ms monitor cycles: ${JSON.stringify(stressed)}`);
    assert.ok(after.depth<=before.depth,`${name} ownership ancestry must not grow after the settled baseline: before=${before.signature}; after=${after.signature}`);
  }

  assert.deepEqual(pageErrors,[],`R56 mode-owned wrapper stability regression produced page errors: ${pageErrors.join("\n")}`);
  await context.close();
  console.log(`R56 mode-owned wrapper stability regression passed: ${JSON.stringify(stressed)}`);
}finally{
  await browser.close();for(const socket of sockets)socket.destroy();await new Promise(resolve=>server.close(()=>resolve()));
}
