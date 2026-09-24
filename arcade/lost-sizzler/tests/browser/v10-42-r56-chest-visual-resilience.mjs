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
   lostSizzlerPixelAssets.chests.src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";
   await new Promise(r=>setTimeout(r,80));
   p1.x=Number(chest.x);p1.y=Number(chest.y);p1.rx=p1.x;p1.ry=p1.y;focus=p1;cam={x:0,y:0};view={x:0,y:0,w:canvas.width,h:canvas.height};
   const before=Number(window.__CCG_CHEST_RENDER_DIAGNOSTICS__?.richFallbackFrames||0);
   drawChests();
   const d=window.__CCG_CHEST_RENDER_DIAGNOSTICS__;
   return{available:true,before,after:Number(d?.richFallbackFrames||0),mode:String(d?.lastMode||""),naturalWidth:Number(lostSizzlerPixelAssets.chests.naturalWidth||0)};
 })()`));
 assert.equal(result.available,true);assert.ok(result.naturalWidth<160,`fixture must force asset fallback: ${JSON.stringify(result)}`);assert.ok(result.after>result.before,`rich fallback must render: ${JSON.stringify(result)}`);assert.equal(result.mode,"rich-fallback");
 await context.close();
}finally{await browser.close();await new Promise(r=>server.close(r));for(const s of sockets)s.destroy()}
console.log("PASS chest visual fallback browser contract");
