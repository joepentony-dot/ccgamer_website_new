import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {chromium} from "playwright";

const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,"../../../..");
const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json; charset=utf-8",".svg":"image/svg+xml",".webp":"image/webp",".png":"image/png",".ogg":"audio/ogg"};
const sockets=new Set();
const server=http.createServer((req,res)=>{
  try{
    const pathname=decodeURIComponent(new URL(req.url,"http://local").pathname),relative=pathname.endsWith("/")?`${pathname}index.html`:pathname,file=path.resolve(repo,`.${relative}`);
    if(!file.startsWith(`${repo}${path.sep}`)&&file!==repo){res.writeHead(403).end("forbidden");return}
    fs.readFile(file,(error,data)=>{if(error){res.writeHead(404).end("not found");return}res.setHeader("content-type",mime[path.extname(file).toLowerCase()]||"application/octet-stream");res.setHeader("cache-control","no-store");res.setHeader("connection","close");res.end(data)})
  }catch(error){res.writeHead(500).end(String(error))}
});
server.on("connection",socket=>{sockets.add(socket);socket.on("close",()=>sockets.delete(socket))});
await new Promise((resolve,reject)=>{server.once("error",reject);server.listen(0,"127.0.0.1",resolve)});
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,args:["--disable-dev-shm-usage","--disable-background-networking","--autoplay-policy=no-user-gesture-required"]});

try{
  const context=await browser.newContext({viewport:{width:2560,height:1440}}),page=await context.newPage();page.setDefaultTimeout(25000);
  const errors=[];page.on("pageerror",error=>errors.push(String(error?.stack||error)));
  await page.goto(`${origin}/arcade/lost-sizzler/`,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.body.dataset.releaseReady==="true");
  await page.waitForFunction(()=>Boolean(window.CCGLostSizzlerV141R29?.state?.loopInstalled));

  const release=await page.evaluate(()=>({
    build:document.querySelector('meta[name="ccg-lost-sizzler-build"]')?.content,
    cache:document.querySelector('meta[name="ccg-lost-sizzler-cache"]')?.content,
    r29:Boolean(window.CCGLostSizzlerV141R29),
    loop:Boolean(window.loop?.__ccgV141R29Stable)
  }));
  assert.deepEqual(release,{build:"2026.08.25.29",cache:"20260825r29",r29:true,loop:true},"Chromium must run the r29 page and final stable loop");

  const geometry=await page.evaluate(async()=>{
    document.body.dataset.runActive="true";
    const canvas=document.getElementById("game"),wrap=document.querySelector(".canvas-wrap"),toast=document.getElementById("pickup-toast"),rail=document.querySelector(".game-message-rail");
    const sample=()=>({bw:canvas.width,bh:canvas.height,w:wrap.getBoundingClientRect().width,h:wrap.getBoundingClientRect().height,railDisplay:getComputedStyle(rail).display});
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    toast?.classList.remove("show");await new Promise(resolve=>requestAnimationFrame(resolve));
    const before=sample(),visibleSamples=[],hiddenSamples=[];
    for(let index=0;index<8;index++){
      window.showToast(`R29 GEOMETRY ${index}`,"Notification appearance must not resize the canvas.","cyan",200);
      await new Promise(resolve=>setTimeout(resolve,35));visibleSamples.push(sample());
      toast?.classList.remove("show");await new Promise(resolve=>setTimeout(resolve,35));hiddenSamples.push(sample());
    }
    const after=sample();return{before,after,visibleSamples,hiddenSamples,toastPosition:getComputedStyle(toast).position}
  });
  assert.equal(geometry.toastPosition,"absolute","r29 gameplay toasts must overlay the canvas");
  assert.equal(geometry.before.railDisplay,"none","an idle notification rail must collapse completely instead of reserving a gameplay row");
  assert.equal(geometry.after.railDisplay,"none","the notification rail must collapse again after the toast closes");
  for(const sample of geometry.visibleSamples){
    assert.equal(sample.railDisplay,"contents","a visible r29 toast must use a contents-only rail so it overlays without creating a gameplay row");
    assert.equal(sample.bw,geometry.before.bw,"toast churn must not change canvas backing width");
    assert.equal(sample.bh,geometry.before.bh,"toast churn must not change canvas backing height");
    assert.ok(Math.abs(sample.w-geometry.before.w)<1,"toast churn must not change canvas host width");
    assert.ok(Math.abs(sample.h-geometry.before.h)<1,"toast churn must not change canvas host height");
  }
  for(const sample of geometry.hiddenSamples){
    assert.equal(sample.railDisplay,"none","a hidden toast must leave no notification grid row behind");
    assert.equal(sample.bw,geometry.before.bw,"closing a toast must not change canvas backing width");
    assert.equal(sample.bh,geometry.before.bh,"closing a toast must not change canvas backing height");
    assert.ok(Math.abs(sample.w-geometry.before.w)<1,"closing a toast must not change canvas host width");
    assert.ok(Math.abs(sample.h-geometry.before.h)<1,"closing a toast must not change canvas host height");
  }

  const audio=await page.evaluate(()=>{
    let stops=0;const sound=window.CCGSound,oldStop=sound?.stopMusic;if(sound)sound.stopMusic=()=>{stops++};
    try{window.CCGLostSizzlerV141R29.silenceGameplayAudio()}finally{if(sound)sound.stopMusic=oldStop}
    return{stops,audioStops:window.CCGLostSizzlerV141R29.state.audioStops}
  });
  assert.ok(audio.stops>=1,"r29 return-to-menu audio guard must call the ordinary music stop path");

  const spyThrottle=await page.evaluate(()=>{
    const special=window.CCGLostSizzlerSpecialModes,descriptor=Object.getOwnPropertyDescriptor(special,"active"),before=window.CCGLostSizzlerV141R29.state.spyHintsSuppressed;
    Object.defineProperty(special,"active",{configurable:true,value:{type:"sizzler-saboteurs",state:{players:[]}}});
    window.showToast("MOVE BESIDE FURNITURE","first","cyan",3000);window.showToast("MOVE BESIDE FURNITURE","second","cyan",3000);window.showToast("MOVE BESIDE FURNITURE","third","cyan",3000);
    const after=window.CCGLostSizzlerV141R29.state.spyHintsSuppressed;
    if(descriptor)Object.defineProperty(special,"active",descriptor);else delete special.active;
    return{before,after}
  });
  assert.ok(spyThrottle.after-spyThrottle.before>=2,"repeated Spy furniture guidance must be suppressed instead of firing every update");

  const friendly=await page.evaluate(()=>{
    const special=window.CCGLostSizzlerSpecialModes,descriptor=Object.getOwnPropertyDescriptor(special,"active"),before=window.CCGLostSizzlerV141R29.state.hordeFriendlyFireBlocked;
    Object.defineProperty(special,"active",{configurable:true,value:{type:"horde-survivor",state:{players:[]}}});
    const result=window.hurtPlayer?.({id:"test-player"},1,true,"team-mate","other-player"),after=window.CCGLostSizzlerV141R29.state.hordeFriendlyFireBlocked;
    if(descriptor)Object.defineProperty(special,"active",descriptor);else delete special.active;
    return{result,delta:after-before}
  });
  assert.equal(friendly.result,false,"Horde player-v-player damage must be rejected");assert.equal(friendly.delta,1,"Horde friendly-fire rejection must execute exactly once");

  assert.deepEqual(errors,[],`r29 Chromium runtime regression must have no uncaught errors: ${errors.join("\n")}`);
  console.log("Lost Sizzler V10.41 r29 Chromium geometry, overlay-rail, audio, Spy hint and Horde friendly-fire checks passed.");
  await context.close()
}finally{
  await browser.close();for(const socket of sockets)socket.destroy();await new Promise(resolve=>server.close(()=>resolve()))
}
