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
  const context=await browser.newContext({viewport:{width:1600,height:900}}),page=await context.newPage();page.setDefaultTimeout(60000);
  const errors=[];page.on("pageerror",error=>errors.push(String(error?.stack||error)));
  await page.goto(`${origin}/arcade/lost-sizzler/`,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.body.dataset.releaseReady==="true"&&Boolean(window.CCGLostSizzlerV141R31SoloDungeon)&&Boolean(document.getElementById("solo-btn")),null,{timeout:90000});
  await page.click("#solo-btn");
  await page.waitForFunction(()=>document.body.dataset.runActive==="true"&&window.CCGLostSizzlerModeRuntime?.detect?.()==="dungeon-solo"&&typeof mode!=="undefined"&&mode==="playing"&&Boolean(p1));
  await page.waitForTimeout(700);

  const seeded=await page.evaluate(()=>{
    const api=window.CCGLostSizzlerV141R31SoloDungeon;
    if(typeof render==="function")render();
    const captured=api.captureHealthyCanvas();
    return{captured,blank:api.canvasFrameIsBlank(),healthy:Number(api.state.canvasHealthyFrames||0),width:Number(canvas?.width||0),height:Number(canvas?.height||0)};
  });
  assert.equal(seeded.captured,true,"Solo watchdog must be able to retain a healthy gameplay frame");
  assert.equal(seeded.blank,false,"normal Solo gameplay must not be classified as a blank canvas");
  assert.ok(seeded.healthy>=1,"healthy Solo frames must be recorded");
  assert.ok(seeded.width>0&&seeded.height>0,"Solo canvas must have live dimensions");

  const before=await page.evaluate(()=>({recoveries:Number(window.CCGLostSizzlerV141R31SoloDungeon.state.canvasRecoveries||0),fallbacks:Number(window.CCGLostSizzlerV141R31SoloDungeon.state.canvasFallbackRestores||0)}));
  await page.evaluate(()=>{
    const api=window.CCGLostSizzlerV141R31SoloDungeon;
    window.__r31OriginalRender=window.render;
    window.render=function r31ForcedBlankRender(){const c=ctx||canvas.getContext("2d");c.save();c.setTransform(1,0,0,1,0,0);c.fillStyle="#000";c.fillRect(0,0,canvas.width,canvas.height);c.restore()};
    window.render();
    if(!api.canvasFrameIsBlank())throw new Error("forced browser fixture did not create a blank Solo canvas");
    api.watchSoloCanvas(true);
    api.watchSoloCanvas(true);
  });
  await page.waitForTimeout(220);

  const recovered=await page.evaluate(()=>{
    const api=window.CCGLostSizzlerV141R31SoloDungeon;
    const result={blank:api.canvasFrameIsBlank(),recoveries:Number(api.state.canvasRecoveries||0),fallbacks:Number(api.state.canvasFallbackRestores||0),displayRecoveries:Number(api.state.displayRecoveries||0),mode:String(mode||""),controller:String(window.CCGLostSizzlerModeRuntime?.detect?.()||"")};
    window.render=window.__r31OriginalRender;delete window.__r31OriginalRender;
    if(typeof render==="function")render();
    return result;
  });
  assert.equal(recovered.controller,"dungeon-solo","blank-canvas recovery must remain owned by Solo Dungeon");
  assert.equal(recovered.mode,"playing","blank-canvas recovery must not pause or exit the run");
  assert.ok(recovered.recoveries>before.recoveries,"two consecutive blank checks must trigger Solo canvas recovery");
  assert.ok(recovered.fallbacks>before.fallbacks,"when a fresh render is still black the last healthy Solo frame must be restored");
  assert.equal(recovered.blank,false,"the player must not be left with a black gameplay canvas after recovery");
  assert.ok(recovered.displayRecoveries>=1,"canvas recovery must reuse the established Solo canvas/camera rebuild path");
  assert.deepEqual(errors,[],`Solo blank-canvas watchdog browser regression must have no uncaught errors: ${errors.join("\n")}`);

  console.log("Lost Sizzler Solo Dungeon recurring black-canvas watchdog and last-healthy-frame fallback passed in Chromium.");
  await context.close();
}finally{
  await browser.close();for(const socket of sockets)socket.destroy();await new Promise(resolve=>server.close(()=>resolve()));
}
