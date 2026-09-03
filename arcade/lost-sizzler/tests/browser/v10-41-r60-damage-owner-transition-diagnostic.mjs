import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {chromium} from "playwright";

const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,"../../../..");
const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".mjs":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json; charset=utf-8",".svg":"image/svg+xml",".png":"image/png",".webp":"image/webp",".ogg":"audio/ogg",".mp3":"audio/mpeg"};
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
  const context=await browser.newContext({viewport:{width:1800,height:1000}}),page=await context.newPage();
  page.setDefaultTimeout(45000);
  const errors=[];page.on("pageerror",error=>errors.push(String(error?.stack||error)));

  await page.goto(`${origin}/arcade/lost-sizzler/`,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.body.dataset.releaseReady==="true"&&Boolean(window.CCGLostSizzlerV141R30)&&Boolean(window.CCGLostSizzlerV141R60HordeOwnerComposition),null,{timeout:90000});
  await page.click("#solo-btn");
  await page.waitForFunction(()=>document.body.dataset.runActive==="true"&&mode==="playing"&&playMode==="solo"&&Boolean(p1)&&Boolean(host),null,{timeout:30000});
  await page.waitForFunction(()=>window.CCGLostSizzlerV141R30?.modernDamageOwnershipPresent?.(window.hurtPlayer)===true,null,{timeout:10000});

  await page.evaluate(()=>{
    const inspect=()=>{
      const seen=new Set(),chain=[];let current=window.hurtPlayer,depth=0;
      while(typeof current==="function"&&!seen.has(current)&&depth<32){
        seen.add(current);
        chain.push({name:String(current.name||"anonymous"),markers:Object.getOwnPropertyNames(current).filter(name=>name.startsWith("__ccgV141")).sort()});
        current=typeof current.__ccgOriginal==="function"?current.__ccgOriginal:null;depth++
      }
      const composition=window.CCGLostSizzlerV141R60HordeOwnerComposition,r30=window.CCGLostSizzlerV141R30,descriptor=Object.getOwnPropertyDescriptor(window,"hurtPlayer");
      return{
        at:Number(performance.now().toFixed(1)),mode:String(mode||""),runActive:String(document.body.dataset.runActive||""),
        owner:String(window.hurtPlayer?.name||""),chain,
        modern:Boolean(r30?.modernDamageOwnershipPresent?.(window.hurtPlayer)),spyContaminated:Boolean(r30?.spyContaminated?.(window.hurtPlayer)),
        gateActive:Boolean(composition?.soloHurtGateActive?.()),gate:Boolean(composition?.state?.soloHurtGate),gateLosses:Number(composition?.state?.soloHurtGateLosses||0),
        gateBlocked:Number(composition?.state?.soloHurtBlockedWrites||0),gateAccepted:Number(composition?.state?.soloHurtAcceptedWrites||0),
        accessor:Boolean(descriptor?.get||descriptor?.set),r30Repairs:Number(r30?.state?.ownershipRepairs||0),r30Forced:Number(r30?.state?.forcedRestores||0),
        r30Reason:String(r30?.state?.lastRestoreReason||""),r60Reassertions:Number(window.CCGLostSizzlerV141R60LivePlayIntegrity?.state?.ownerReassertions||0),
        postPlaytestWrapped:Boolean(window.CCGLostSizzlerV141PostPlaytestStability?.state?.hurtWrapped)
      }
    };
    window.__ccgR60DamageTransitionTimeline=[inspect()];
    window.__ccgR60DamageTransitionLast=window.hurtPlayer;
    window.__ccgR60DamageTransitionSampler=setInterval(()=>{
      const changed=window.hurtPlayer!==window.__ccgR60DamageTransitionLast;
      const current=inspect(),last=window.__ccgR60DamageTransitionTimeline.at(-1);
      if(changed||!last||current.modern!==last.modern||current.gateActive!==last.gateActive||current.r30Repairs!==last.r30Repairs||current.gateLosses!==last.gateLosses){
        window.__ccgR60DamageTransitionTimeline.push(current);window.__ccgR60DamageTransitionLast=window.hurtPlayer
      }
    },10)
  });

  for(let cycle=0;cycle<6;cycle++){
    await page.keyboard.press("KeyP");await page.waitForFunction(()=>mode==="paused");
    await page.evaluate(()=>{const until=performance.now()+320;while(performance.now()<until){}});
    await page.waitForTimeout(50);
    await page.keyboard.press("KeyP");await page.waitForFunction(()=>mode==="playing");
    await page.waitForTimeout(90)
  }
  await page.waitForTimeout(500);

  const result=await page.evaluate(()=>{
    if(window.__ccgR60DamageTransitionSampler)clearInterval(window.__ccgR60DamageTransitionSampler);
    const r30=window.CCGLostSizzlerV141R30,composition=window.CCGLostSizzlerV141R60HordeOwnerComposition;
    return{timeline:window.__ccgR60DamageTransitionTimeline||[],modern:Boolean(r30?.modernDamageOwnershipPresent?.(window.hurtPlayer)),gateActive:Boolean(composition?.soloHurtGateActive?.()),r30:{repairs:Number(r30?.state?.ownershipRepairs||0),forced:Number(r30?.state?.forcedRestores||0),reason:String(r30?.state?.lastRestoreReason||"")},composition:{...(composition?.state||{})}}
  });
  console.log(`[r60 damage transition] ${JSON.stringify(result)}`);
  assert.equal(errors.length,0,`damage-owner transition diagnostic must not raise page errors: ${JSON.stringify(errors)}`);
  assert.equal(result.gateActive,true,`R60 Solo damage property gate must survive repeated pause/resume: ${JSON.stringify(result)}`);
  assert.equal(result.modern,true,`R56/R60 environmental damage ancestry must survive repeated pause/resume: ${JSON.stringify(result)}`);
  console.log("Lost Sizzler R60 damage-owner transition diagnostic passed.")
} finally {
  await browser.close();
  for(const socket of sockets)socket.destroy();
  await new Promise(resolve=>server.close(resolve))
}
