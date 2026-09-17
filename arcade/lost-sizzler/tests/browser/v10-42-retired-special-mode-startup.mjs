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
  const localScripts=[];
  page.on("request",request=>{
    try{
      const url=new URL(request.url());
      if(url.origin===origin&&/\/arcade\/lost-sizzler\/js\/.*\.js$/i.test(url.pathname))localScripts.push(path.basename(url.pathname));
    }catch(_){}
  });

  await page.goto(`${origin}/arcade/lost-sizzler/?retired-special-mode-startup=1`,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>window.CCGLostSizzlerV142Bootstrap?.ready===true||window.CCGLostSizzlerV142Bootstrap?.failed===true,null,{timeout:90000});

  const boot=await page.evaluate(()=>({
    ready:Boolean(window.CCGLostSizzlerV142Bootstrap?.ready),
    failed:Boolean(window.CCGLostSizzlerV142Bootstrap?.failed),
    error:String(window.CCGLostSizzlerV142Bootstrap?.error||""),
    postPlaytest:Boolean(window.CCGLostSizzlerV141PostPlaytestStability),
    r59:Boolean(window.CCGLostSizzlerV141R59LiveRegressionFixes),
    hordeComposition:Boolean(window.CCGLostSizzlerV141R60HordeOwnerComposition),
    spyExit:Boolean(window.CCGLostSizzlerV141R30SpyExitControlReset),
    spyWorld:Boolean(window.CCGLostSizzlerV141R32SpyWorldOwner),
    spyLoader:Boolean(window.CCGLostSizzlerV141R32SpyLoader),
    specialMode:String(document.body?.dataset?.specialMode||"")
  }));

  assert.equal(boot.failed,false,`release bootstrap failed: ${boot.error}`);
  assert.equal(boot.ready,true,"release bootstrap must complete");
  assert.equal(boot.postPlaytest,true,"supported post-playtest stability owner must remain available");
  assert.equal(boot.r59,true,"supported r59 pause/Solo stability owner must remain available");
  assert.equal(boot.hordeComposition,true,"historically named bridge with supported Solo ownership must remain available");
  assert.equal(boot.spyExit,false,"retired Spy exit owner must not install during supported startup");
  assert.equal(boot.spyWorld,false,"retired Spy world owner must not install during supported startup");
  assert.equal(boot.spyLoader,false,"retired Spy lazy loader must not install during supported startup");
  assert.equal(boot.specialMode,"","supported startup must not activate a retired special mode");

  for(const retiredScript of [
    "v10-41-r30-spy-exit-control-reset.js",
    "v10-41-r32-spy-world-owner.js",
    "v10-41-r32-spy-loader.js"
  ])assert.equal(localScripts.includes(retiredScript),false,`retired startup script must not be requested: ${retiredScript}`);

  await page.click("#solo-btn");
  await page.waitForFunction(()=>document.body?.dataset?.runActive==="true"&&typeof mode!=="undefined"&&mode==="playing"&&Boolean(p1),null,{timeout:20000});
  const solo=await page.evaluate(()=>({
    active:document.body?.dataset?.runActive||"",
    mode:String(typeof mode!=="undefined"?mode:""),
    playMode:String(typeof playMode!=="undefined"?playMode:""),
    postPlaytest:Boolean(window.CCGLostSizzlerV141PostPlaytestStability),
    r59:Boolean(window.CCGLostSizzlerV141R59LiveRegressionFixes),
    specialMode:String(document.body?.dataset?.specialMode||"")
  }));
  assert.equal(solo.active,"true","supported Solo run must start");
  assert.equal(solo.mode,"playing","supported Solo run must enter playing mode");
  assert.equal(solo.playMode,"solo","supported Solo ownership must remain selected");
  assert.equal(solo.postPlaytest,true,"post-playtest Solo stability owner must survive run start");
  assert.equal(solo.r59,true,"r59 Solo/pause stability owner must survive run start");
  assert.equal(solo.specialMode,"","Solo must not activate retired special-mode state");

  console.log("DUNGEON_RETIRED_SPECIAL_MODE_STARTUP",JSON.stringify({boot,solo,scriptCount:localScripts.length}));
  console.log("Dungeon Carnage retired special-mode startup browser contract passed.");
  await context.close();
}finally{
  await browser.close();
  for(const socket of sockets)socket.destroy();
  await new Promise(resolve=>server.close(resolve));
}
