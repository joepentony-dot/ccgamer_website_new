import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {chromium} from "playwright";

const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,"../../../..");
const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".mjs":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json; charset=utf-8",".svg":"image/svg+xml",".webp":"image/webp",".png":"image/png",".jpg":"image/jpeg",".ogg":"audio/ogg",".mp3":"audio/mpeg",".wav":"audio/wav"};
const sockets=new Set();
const server=http.createServer((req,res)=>{
  try{
    const pathname=decodeURIComponent(new URL(req.url,"http://local").pathname);
    const relative=pathname.endsWith("/")?`${pathname}index.html`:pathname;
    const file=path.resolve(repo,`.${relative}`);
    if(!file.startsWith(`${repo}${path.sep}`)&&file!==repo){res.writeHead(403).end("forbidden");return}
    fs.readFile(file,(error,data)=>{
      if(error){res.writeHead(404,{connection:"close"}).end("not found");return}
      res.writeHead(200,{"content-type":mime[path.extname(file).toLowerCase()]||"application/octet-stream","cache-control":"no-store",connection:"close"});
      res.end(data);
    });
  }catch(error){res.writeHead(500,{connection:"close"}).end(String(error))}
});
server.on("connection",socket=>{sockets.add(socket);socket.on("close",()=>sockets.delete(socket))});
await new Promise((resolve,reject)=>{server.once("error",reject);server.listen(0,"127.0.0.1",resolve)});
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,args:["--disable-dev-shm-usage","--disable-background-networking","--autoplay-policy=no-user-gesture-required"]});

try{
  const context=await browser.newContext({viewport:{width:1440,height:900}});
  await context.route("https://*.supabase.co/**",route=>route.fulfill({status:200,contentType:"application/json",headers:{"access-control-allow-origin":"*"},body:"{}"}));
  const page=await context.newPage();
  page.setDefaultTimeout(60000);
  const errors=[];
  page.on("pageerror",error=>errors.push(String(error?.stack||error)));

  await page.goto(`${origin}/arcade/lost-sizzler/?retired-spy-fullscreen-hook=1`,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.body?.dataset?.releaseReady==="true"&&document.body?.dataset?.gameReady==="true",null,{timeout:90000});
  await page.click("#solo-btn");
  await page.waitForFunction(()=>document.body?.dataset?.runActive==="true"&&typeof mode!=="undefined"&&mode==="playing"&&window.CCGLostSizzlerModeRuntime?.state?.activeId==="dungeon-solo",null,{timeout:30000});

  const before=await page.evaluate(()=>({
    spyLoader:Boolean(window.CCGLostSizzlerV141R32SpyLoader),
    specialMode:String(document.body?.dataset?.specialMode||""),
    controller:String(window.CCGLostSizzlerModeRuntime?.state?.activeId||"")
  }));
  assert.equal(before.spyLoader,false,"retired R32 Spy loader must be absent before supported fullscreen input");
  assert.equal(before.specialMode,"","Solo must not activate a retired special mode");
  assert.equal(before.controller,"dungeon-solo","Solo must retain canonical dungeon-solo ownership");

  // Solo startup may legitimately have entered fullscreen already. Return to a
  // known non-fullscreen state so the next F press exercises requestFullscreen
  // through the supported toggle owner rather than its equally valid exit path.
  await page.evaluate(async()=>{
    if(document.fullscreenElement){
      try{await document.exitFullscreen()}catch(_){}
    }
  });
  await page.waitForFunction(()=>!document.fullscreenElement,null,{timeout:5000});

  await page.evaluate(()=>{
    window.__ccgStage1FullscreenCalls=0;
    window.__ccgStage1RetiredSpyFullscreenCalls=0;
    const shell=document.querySelector(".ccg-game");
    shell.requestFullscreen=async()=>{window.__ccgStage1FullscreenCalls++};
    window.CCGLostSizzlerV141R32SpyLoader={
      handleSpyFullscreenKey(){window.__ccgStage1RetiredSpyFullscreenCalls++;return true}
    };
  });

  await page.keyboard.press("f");
  await page.waitForFunction(()=>window.__ccgStage1FullscreenCalls===1,null,{timeout:5000});
  let result=await page.evaluate(()=>({
    fullscreenCalls:Number(window.__ccgStage1FullscreenCalls||0),
    retiredSpyCalls:Number(window.__ccgStage1RetiredSpyFullscreenCalls||0),
    controller:String(window.CCGLostSizzlerModeRuntime?.state?.activeId||""),
    specialMode:String(document.body?.dataset?.specialMode||"")
  }));
  assert.equal(result.fullscreenCalls,1,"F must dispatch directly to the supported fullscreen owner");
  assert.equal(result.retiredSpyCalls,0,"fabricated retired Spy fullscreen owner must not intercept F");
  assert.equal(result.controller,"dungeon-solo","fullscreen input must not change Solo mode ownership");
  assert.equal(result.specialMode,"","fullscreen input must not activate retired special-mode state");

  await page.click("#fullscreen-btn");
  await page.waitForFunction(()=>window.__ccgStage1FullscreenCalls===2,null,{timeout:5000});
  result=await page.evaluate(()=>({
    fullscreenCalls:Number(window.__ccgStage1FullscreenCalls||0),
    retiredSpyCalls:Number(window.__ccgStage1RetiredSpyFullscreenCalls||0)
  }));
  assert.equal(result.fullscreenCalls,2,"fullscreen button must retain the same supported fullscreen owner");
  assert.equal(result.retiredSpyCalls,0,"fullscreen button must remain independent of retired Spy ownership");
  assert.deepEqual(errors,[],`fullscreen retirement boundary must have no uncaught browser errors: ${errors.join("\n")}`);

  console.log("DUNGEON_RETIRED_SPY_FULLSCREEN_HOOK",JSON.stringify({before,result}));
  console.log("Dungeon Carnage retired Spy fullscreen hook browser contract passed.");
  await context.close();
}finally{
  await browser.close();
  for(const socket of sockets)socket.destroy();
  await new Promise(resolve=>server.close(resolve));
}
