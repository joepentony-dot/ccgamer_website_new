import assert from "node:assert/strict";
import fs from "node:fs";import http from "node:http";import path from "node:path";import {fileURLToPath} from "node:url";import {chromium} from "playwright";
const here=path.dirname(fileURLToPath(import.meta.url)),repo=path.resolve(here,"../../../.."),mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json",".png":"image/png",".webp":"image/webp",".svg":"image/svg+xml",".mp3":"audio/mpeg"};
const sockets=new Set(),server=http.createServer((req,res)=>{try{const pn=decodeURIComponent(new URL(req.url,"http://x").pathname),rel=pn.endsWith("/")?`${pn}index.html`:pn,file=path.resolve(repo,`.${rel}`);fs.readFile(file,(e,d)=>{if(e){res.writeHead(404).end("no");return}res.writeHead(200,{"content-type":mime[path.extname(file)]||"application/octet-stream","cache-control":"no-store"});res.end(d)})}catch(e){res.writeHead(500).end(String(e))}});
server.on("connection",s=>{sockets.add(s);s.on("close",()=>sockets.delete(s))});await new Promise((r,j)=>{server.once("error",j);server.listen(0,"127.0.0.1",r)});const origin=`http://127.0.0.1:${server.address().port}`,browser=await chromium.launch({headless:true,args:["--disable-dev-shm-usage"]});
try{
 const context=await browser.newContext({viewport:{width:1280,height:900}});await context.addInitScript(()=>{localStorage.setItem("ccg-lost-sizzler-tutorial-seen-v1","true");localStorage.setItem("ccg-lost-sizzler-tutorial-complete-v1","true")});
 const page=await context.newPage();await page.goto(`${origin}/arcade/lost-sizzler/?chest-visuals=1`,{waitUntil:"load"});await page.waitForFunction(()=>document.body.dataset.v142BootstrapReady==="true");
 await page.locator("#solo-btn").click({noWaitAfter:true});await page.waitForFunction(()=>document.body.dataset.runActive==="true"&&Boolean(host?.chests?.length&&p1));
 const result=await page.evaluate(async()=>globalThis.eval(`(async()=>{
   const chest=(host.chests||[]).find(c=>c?.active)||host.chests[0];if(!chest)return{available:false};
   p1.x=Number(chest.x);p1.y=Number(chest.y);p1.rx=p1.x;p1.ry=p1.y;focus=p1;cam={x:0,y:0};view={x:0,y:0,w:canvas.width,h:canvas.height};
   await new Promise(r=>setTimeout(r,80));
   const diagnostics=window.__CCG_CHEST_RENDER_DIAGNOSTICS__,cc0Before=Number(diagnostics?.assetFrames||0);
   drawChests();
   const primaryMode=String(diagnostics?.lastMode||""),cc0After=Number(diagnostics?.assetFrames||0);
   const pixel="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";
   for(const image of lostSizzlerPixelAssets.chestFrames||[])if(image)image.src=pixel;
   if(lostSizzlerPixelAssets.chests)lostSizzlerPixelAssets.chests.src=pixel;
   if(lostSizzlerPixelAssets.chestReplacement)lostSizzlerPixelAssets.chestReplacement.src=pixel;
   await new Promise(r=>setTimeout(r,80));
   const before=Number(diagnostics?.richFallbackFrames||0);
   drawChests();
   return{
     available:true,primaryMode,cc0Before,cc0After,before,after:Number(diagnostics?.richFallbackFrames||0),
     mode:String(diagnostics?.lastMode||""),
     legacyWidth:Number(lostSizzlerPixelAssets.chests?.naturalWidth||0),
     frameWidths:(lostSizzlerPixelAssets.chestFrames||[]).map(image=>Number(image?.naturalWidth||0))
   };
 })()`));
 assert.equal(result.available,true);
 assert.equal(result.primaryMode,"cc0-frames",`decoded CC0 frames must be the primary chest renderer: ${JSON.stringify(result)}`);
 assert.ok(result.cc0After>result.cc0Before,`primary CC0 chest presentation must render before the failure fixture: ${JSON.stringify(result)}`);
 assert.ok(result.legacyWidth<160&&result.frameWidths.every(width=>width<16),`fixture must invalidate every image-backed chest layer: ${JSON.stringify(result)}`);
 assert.ok(result.after>result.before,`rich fallback must render when both CC0 frames and legacy/custom sheets are unavailable: ${JSON.stringify(result)}`);
 assert.equal(result.mode,"rich-fallback");
 await context.close();
}finally{await browser.close();await new Promise(r=>server.close(r));for(const s of sockets)s.destroy()}
console.log("PASS chest visual fallback browser contract");
