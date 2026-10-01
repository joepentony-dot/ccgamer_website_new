import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {chromium} from "playwright";

const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,"../../../..");
const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json",".png":"image/png",".webp":"image/webp",".svg":"image/svg+xml",".mp3":"audio/mpeg"};
const sockets=new Set();
const server=http.createServer((req,res)=>{
  try{
    const pathname=decodeURIComponent(new URL(req.url,"http://local").pathname);
    const relative=pathname.endsWith("/")?`${pathname}index.html`:pathname;
    const file=path.resolve(repo,`.${relative}`);
    fs.readFile(file,(error,data)=>{
      if(error){res.writeHead(404).end("not found");return}
      res.writeHead(200,{"content-type":mime[path.extname(file).toLowerCase()]||"application/octet-stream","cache-control":"no-store"});
      res.end(data);
    });
  }catch(error){res.writeHead(500).end(String(error))}
});
server.on("connection",socket=>{sockets.add(socket);socket.on("close",()=>sockets.delete(socket))});
await new Promise((resolve,reject)=>{server.once("error",reject);server.listen(0,"127.0.0.1",resolve)});
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,args:["--disable-dev-shm-usage"]});

try{
  const context=await browser.newContext({viewport:{width:1280,height:900}});
  await context.addInitScript(()=>{
    localStorage.setItem("ccg-lost-sizzler-tutorial-seen-v1","true");
    localStorage.setItem("ccg-lost-sizzler-tutorial-complete-v1","true");
  });
  const page=await context.newPage();
  const errors=[];
  page.on("pageerror",error=>errors.push(String(error?.stack||error)));
  await page.goto(`${origin}/arcade/lost-sizzler/?visual-door-contract=1`,{waitUntil:"load"});
  await page.waitForFunction(()=>document.body.dataset.v142BootstrapReady==="true");
  await page.locator("#solo-btn").click({noWaitAfter:true});
  await page.waitForFunction(()=>document.body.dataset.runActive==="true"&&Boolean(p1&&host));
  await page.waitForFunction(()=>Boolean(
    lostSizzlerPixelAssets?.doorLeafClosed?.complete&&lostSizzlerPixelAssets.doorLeafClosed.naturalWidth>=32&&
    lostSizzlerPixelAssets?.doorLeafOpen?.complete&&lostSizzlerPixelAssets.doorLeafOpen.naturalWidth>=32
  ));

  const result=await page.evaluate(async()=>globalThis.eval(`(async()=>{
    const diagnostics=window.__CCG_DOOR_RENDER_DIAGNOSTICS__;
    const before=Number(diagnostics?.assetFrames||0);
    const s=ws(Number(p1.x),Number(p1.y));
    const base={id:"visual-door-contract",x:Number(p1.x),y:Number(p1.y),type:"room",locked:false,openingStart:0,openAt:0};

    const horizontalDoor={...base,orientation:"horizontal",side:"north",open:false,opening:false};
    const horizontalRendered=drawDoorAsset(horizontalDoor,s,0,"#c05d84",performance.now());
    const horizontal={rendered:Boolean(horizontalRendered),mode:String(diagnostics?.lastMode||""),orientation:String(diagnostics?.lastOrientation||""),state:String(diagnostics?.lastState||""),assetFrames:Number(diagnostics?.assetFrames||0)};

    const verticalDoor={...base,orientation:"vertical",side:"west",open:true,opening:false};
    const verticalRendered=drawDoorAsset(verticalDoor,s,1,"#c05d84",performance.now());
    const verticalOpen={rendered:Boolean(verticalRendered),mode:String(diagnostics?.lastMode||""),orientation:String(diagnostics?.lastOrientation||""),state:String(diagnostics?.lastState||""),assetFrames:Number(diagnostics?.assetFrames||0)};

    const openingDoor={...base,orientation:"vertical",side:"west",open:false,opening:true};
    const openingRendered=drawDoorAsset(openingDoor,s,.5,"#c05d84",performance.now());
    const opening={rendered:Boolean(openingRendered),mode:String(diagnostics?.lastMode||""),orientation:String(diagnostics?.lastOrientation||""),state:String(diagnostics?.lastState||""),assetFrames:Number(diagnostics?.assetFrames||0)};

    const pixel="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";
    lostSizzlerPixelAssets.doorLeafClosed.src=pixel;
    lostSizzlerPixelAssets.doorLeafOpen.src=pixel;
    await new Promise(resolve=>setTimeout(resolve,80));
    const fallbackRendered=drawDoorAsset(horizontalDoor,s,0,"#c05d84",performance.now());
    const fallback={rendered:Boolean(fallbackRendered),closedWidth:Number(lostSizzlerPixelAssets.doorLeafClosed?.naturalWidth||0),openWidth:Number(lostSizzlerPixelAssets.doorLeafOpen?.naturalWidth||0)};
    return{before,horizontal,verticalOpen,opening,fallback};
  })()`));

  assert.equal(result.horizontal.rendered,true,JSON.stringify(result));
  assert.equal(result.horizontal.mode,"r84-framed-door",JSON.stringify(result));
  assert.equal(result.horizontal.orientation,"horizontal",JSON.stringify(result));
  assert.equal(result.horizontal.state,"closed",JSON.stringify(result));
  assert.ok(result.horizontal.assetFrames>result.before,JSON.stringify(result));
  assert.equal(result.verticalOpen.rendered,true,JSON.stringify(result));
  assert.equal(result.verticalOpen.mode,"r84-framed-door",JSON.stringify(result));
  assert.equal(result.verticalOpen.orientation,"vertical",JSON.stringify(result));
  assert.equal(result.verticalOpen.state,"open",JSON.stringify(result));
  assert.ok(result.verticalOpen.assetFrames>result.horizontal.assetFrames,JSON.stringify(result));
  assert.equal(result.opening.rendered,true,JSON.stringify(result));
  assert.equal(result.opening.mode,"r84-framed-door",JSON.stringify(result));
  assert.equal(result.opening.orientation,"vertical",JSON.stringify(result));
  assert.equal(result.opening.state,"opening",JSON.stringify(result));
  assert.ok(result.opening.assetFrames>result.verticalOpen.assetFrames,JSON.stringify(result));
  assert.ok(result.fallback.closedWidth<32&&result.fallback.openWidth<32,JSON.stringify(result));
  assert.equal(result.fallback.rendered,false,"malformed authored door states must decline rendering so drawDoors can use its pinned procedural fallback");
  assert.deepEqual(errors,[],"door renderer must not produce page errors");
  await context.close();
}finally{
  await browser.close();
  await new Promise(resolve=>server.close(resolve));
  for(const socket of sockets)socket.destroy();
}
console.log("PASS Dungeon R84 framed door renderer states, orientation and fallback handoff");
