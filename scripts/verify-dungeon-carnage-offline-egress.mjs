import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import process from "node:process";
import {chromium} from "playwright";

const flag=process.argv.indexOf("--root");
if(flag<0||!process.argv[flag+1])throw new Error("--root <package game directory> is required");
const root=path.resolve(process.argv[flag+1]);
const types={".html":"text/html",".js":"application/javascript",".css":"text/css",".json":"application/json",".svg":"image/svg+xml",".png":"image/png",".webp":"image/webp",".mp3":"audio/mpeg",".wav":"audio/wav",".ogg":"audio/ogg"};
const server=http.createServer((req,res)=>{
 try{
  const uri=new URL(req.url,"http://localhost");
  const relative=decodeURIComponent(uri.pathname)==="/"?"/index.html":decodeURIComponent(uri.pathname);
  const absolute=path.resolve(root,"."+relative);
  if(!absolute.startsWith(root+path.sep)){res.writeHead(403).end();return}
  fs.readFile(absolute,(error,data)=>{
   if(error){res.writeHead(404).end("missing");return}
   res.writeHead(200,{"content-type":types[path.extname(absolute)]||"application/octet-stream","cache-control":"no-store"});
   res.end(data);
  });
 }catch(error){res.writeHead(500).end(String(error))}
});
await new Promise((resolve,reject)=>{server.once("error",reject);server.listen(0,"127.0.0.1",resolve)});
const origin="http://127.0.0.1:"+server.address().port+"/";
const browser=await chromium.launch({headless:true,args:["--disable-dev-shm-usage"]});
try{
 const context=await browser.newContext({viewport:{width:1440,height:900}});
 const attempted=[];
 await context.route("**/*",async route=>{
  const url=route.request().url();
  if(/https?:\/\/[^/]*\.supabase\.co\//i.test(url)){
   attempted.push(url);
   await route.abort("blockedbyclient");
  }else await route.continue();
 });
 const page=await context.newPage();
 page.setDefaultTimeout(90000);
 await page.goto(origin,{waitUntil:"domcontentloaded"});
 await page.waitForFunction(()=>window.CCGLostSizzlerV142Bootstrap?.ready===true||window.CCGLostSizzlerV142Bootstrap?.failed===true);
 const bootstrap=await page.evaluate(()=>({ready:window.CCGLostSizzlerV142Bootstrap?.ready,failed:window.CCGLostSizzlerV142Bootstrap?.failed,error:window.CCGLostSizzlerV142Bootstrap?.error||""}));
 assert.equal(bootstrap.ready,true,"Offline game failed to boot: "+JSON.stringify(bootstrap));
 assert.equal(bootstrap.failed,false,"Offline game startup reported an error.");
 await page.locator("#solo-btn").click();
 await page.waitForFunction(()=>document.body?.dataset?.runActive==="true");
 await page.waitForTimeout(1500);
 const snapshot=await page.evaluate(()=>({
  music:window.CCGLostSizzlerPlaylistAudio?.getState?.(),
  remoteAudioSkipped:window.CCG_ADMIN_AUDIO?.remoteMediaSkipped===true,
  itchMode:window.CCGDungeonCarnageItchRelease?.mode||""
 }));
 assert.equal(snapshot.itchMode,"itch-html5","Offline game identity was not loaded.");
 assert.equal(snapshot.remoteAudioSkipped,true,"Offline game tried to load the Supabase audio catalogue.");
 assert.equal(attempted.length,0,"Offline runtime made Supabase requests: "+JSON.stringify(attempted.slice(0,5)));
 for(const source of Object.values(snapshot.music?.slots||{})){
  assert.ok(!String(source.url||"").includes(".supabase.co"),"Offline soundtrack selected remote Supabase music.");
 }
 await context.close();
 console.log("Offline owner Solo boot, local audio and ZERO Supabase network requests: PASS");
}finally{
 await browser.close();
 await new Promise(resolve=>server.close(resolve));
}
