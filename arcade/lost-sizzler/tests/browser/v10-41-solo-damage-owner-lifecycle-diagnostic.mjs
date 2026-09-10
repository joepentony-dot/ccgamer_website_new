import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {chromium} from "playwright";

/*
 * Focused LS-SOLO-004 damage-owner lifecycle diagnostic.
 *
 * This test is intentionally observational. It starts a canonical Solo Dungeon,
 * records the complete hurtPlayer ancestry, crosses the same pause/focus edges
 * used by the sustained soak, and reports exactly which owner appears or changes.
 * Existing soak assertions remain authoritative; this file does not weaken them.
 */

const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,"../../../..");
const mime={
  ".html":"text/html; charset=utf-8",
  ".js":"text/javascript; charset=utf-8",
  ".mjs":"text/javascript; charset=utf-8",
  ".css":"text/css; charset=utf-8",
  ".json":"application/json; charset=utf-8",
  ".svg":"image/svg+xml",
  ".png":"image/png",
  ".webp":"image/webp",
  ".ogg":"audio/ogg",
  ".mp3":"audio/mpeg"
};
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

const PAUSE_CYCLES=12;
const OWNER_LIMIT=24;
const SOAK_HEALTH_RESERVE=1000000;

function primitiveState(source,keys){
  const out={};
  for(const key of keys){
    const value=source?.[key];
    if(value===null||["string","number","boolean"].includes(typeof value))out[key]=value;
  }
  return out;
}

try{
  const context=await browser.newContext({viewport:{width:1800,height:1000}});
  const page=await context.newPage();
  page.setDefaultTimeout(90000);

  const capture=label=>page.evaluate(({label,limit})=>{
    const markerKeys=[
      "__ccgV141PostPlaytestHurt",
      "__ccgV141R60EnvironmentSeal",
      "__ccgV141R56EnvironmentDamage",
      "__ccgV141R29HordeFriendly",
      "__ccgV141SpyDamageBoundary",
      "__ccgV141R29SpyRuntimeOwner",
      "__ccgV141SpyIsolated"
    ];
    const chain=[];
    const seen=new Set();
    let current=window.hurtPlayer,depth=0;
    while(typeof current==="function"&&!seen.has(current)&&depth<limit){
      seen.add(current);
      const markers=[];
      for(const key of markerKeys){
        try{if(current[key])markers.push(key)}catch(_){}
      }
      chain.push({depth,name:current.name||"anonymous",markers});
      let next=null;
      try{next=typeof current.__ccgOriginal==="function"?current.__ccgOriginal:(typeof current.__ccgV141Original==="function"?current.__ccgV141Original:null)}catch(_){}
      current=next;depth++;
    }
    const r30=window.CCGLostSizzlerV141R30GlobalMovementGuard?.state||window.CCGLostSizzlerV141R30?.state||{};
    const r56=window.CCGLostSizzlerV141R56PlaytestCompletion?.state||{};
    const r60=window.CCGLostSizzlerV141R60LivePlayIntegrity?.state||window.CCGLostSizzlerV141R60?.state||{};
    const post=window.CCGLostSizzlerV141PostPlaytestStability?.state||{};
    const spy=window.CCGLostSizzlerV141R29SpyEngine?.state||{};
    return{
      label,
      at:Number(performance.now().toFixed(2)),
      mode:typeof mode==="string"?mode:null,
      playMode:typeof playMode==="string"?playMode:null,
      controllerId:window.CCGLostSizzlerModeRuntime?.state?.activeId||"",
      specialMode:document.body.dataset.specialMode||"",
      hidden:Boolean(document.hidden),
      hasFocus:document.hasFocus(),
      depth:chain.length,
      chain,
      r30:{
        forcedRestores:Number(r30.forcedRestores||0),
        ownershipRepairs:Number(r30.ownershipRepairs||0),
        damageOwnershipRepairs:Number(r30.damageOwnershipRepairs||0),
        damageOwnershipPreservations:Number(r30.damageOwnershipPreservations||0),
        modeTransitions:Number(r30.modeTransitions||0),
        lastRestoreReason:String(r30.lastRestoreReason||""),
        goldenLocked:Boolean(r30.goldenLocked),
        goldenHurtName:typeof r30.goldenHurt==="function"?r30.goldenHurt.name||"anonymous":"",
        baselineHurtName:typeof r30.baselineHurt==="function"?r30.baselineHurt.name||"anonymous":""
      },
      r56:{timer:Number(r56.timer||0),environmentHits:Number(r56.environmentHits||0)},
      r60:{timer:Number(r60.timer||0),hurtWrapped:Boolean(r60.hurtWrapped),ownerReassertions:Number(r60.ownerReassertions||0),environmentRepairs:Number(r60.environmentRepairs||0)},
      post:{timer:Number(post.timer||0),hurtWrapped:Boolean(post.hurtWrapped)},
      spy:{timer:Number(spy.timer||0),isolated:Boolean(spy.isolated),baseHurtName:typeof spy.baseHurt==="function"?spy.baseHurt.name||"anonymous":""}
    };
  },{label,limit:OWNER_LIMIT});

  console.log("[solo-damage-owner] load canonical runtime and start Solo");
  await page.goto(`${origin}/arcade/lost-sizzler/`,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.body.dataset.releaseReady==="true"&&Boolean(window.CCGLostSizzlerV141R59LiveRegressionFixes),null,{timeout:90000});
  await page.click("#solo-btn");
  await page.waitForFunction(()=>document.body.dataset.runActive==="true"&&mode==="playing"&&window.CCGLostSizzlerModeRuntime?.state?.activeId==="dungeon-solo",null,{timeout:20000});
  await page.evaluate(reserve=>{if(typeof p1!=="undefined"&&p1){p1.maxHealth=Math.max(reserve,Number(p1.maxHealth)||0);p1.health=p1.maxHealth}},SOAK_HEALTH_RESERVE);
  await page.waitForTimeout(1200);

  const samples=[];
  samples.push(await capture("baseline"));
  assert.equal(samples[0].mode,"playing","damage-owner diagnostic requires active Solo play");
  assert.equal(samples[0].controllerId,"dungeon-solo","damage-owner diagnostic must remain in dungeon-solo");

  for(let cycle=0;cycle<PAUSE_CYCLES;cycle++){
    await page.keyboard.press("KeyP");
    await page.waitForFunction(()=>mode==="paused",null,{timeout:10000});
    await page.evaluate(()=>window.dispatchEvent(new Event("blur")));
    await page.waitForTimeout(120);
    await page.evaluate(()=>window.dispatchEvent(new Event("focus")));
    samples.push(await capture(`cycle-${cycle+1}-paused-after-focus`));

    await page.keyboard.press("KeyP");
    await page.waitForFunction(()=>mode==="playing",null,{timeout:10000});
    await page.waitForTimeout(220);
    samples.push(await capture(`cycle-${cycle+1}-resumed`));
  }

  await page.waitForTimeout(1200);
  samples.push(await capture("post-settle"));

  const changes=[];
  for(let index=1;index<samples.length;index++){
    const before=samples[index-1],after=samples[index];
    const beforeSig=JSON.stringify(before.chain),afterSig=JSON.stringify(after.chain);
    if(beforeSig!==afterSig||before.depth!==after.depth){
      changes.push({from:before.label,to:after.label,beforeDepth:before.depth,afterDepth:after.depth,beforeChain:before.chain,afterChain:after.chain,r30:after.r30,r56:after.r56,r60:after.r60,post:after.post,spy:after.spy});
    }
  }

  console.log("SOLO_DAMAGE_OWNER_LIFECYCLE_DEBUG "+JSON.stringify({pauseCycles:PAUSE_CYCLES,baseline:samples[0],post:samples.at(-1),changes,samples}));
  console.log(`Solo damage-owner lifecycle diagnostic completed: depth ${samples[0].depth} -> ${samples.at(-1).depth}; ownership changes=${changes.length}.`);

  await context.close();
}finally{
  await browser.close().catch(()=>{});
  for(const socket of sockets)socket.destroy();
  await new Promise(resolve=>server.close(resolve));
}
