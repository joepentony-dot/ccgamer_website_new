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
  const context=await browser.newContext({viewport:{width:1280,height:720}}),page=await context.newPage();page.setDefaultTimeout(30000);
  const errors=[];page.on("pageerror",error=>errors.push(String(error?.stack||error)));
  await page.goto(`${origin}/arcade/lost-sizzler/`,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.body.dataset.releaseReady==="true");
  await page.waitForFunction(()=>Boolean(window.CCGLostSizzlerV141R29SpyEngine&&window.CCGLostSizzlerSaboteurs&&window.CCGLostSizzlerSpecialModes&&window.CCGLostSizzlerV141R30));

  const entered=await page.evaluate(()=>{
    const special=window.CCGLostSizzlerSpecialModes,SAB=window.CCGLostSizzlerSaboteurs,engine=window.CCGLostSizzlerV141R29SpyEngine,r30=window.CCGLostSizzlerV141R30;
    run=PGR.makeRun({difficulty:"ARCADE",seed:"R29-DAMAGE-COMPOSITION"});playMode="online";startWorld(PGR.floorSeed(run),false,false);mode="playing";p1.id="SPY-HOST";p1.name="HOST";document.body.dataset.runActive="true";
    const descriptor=Object.getOwnPropertyDescriptor(special,"active"),t=Date.now(),match=SAB.createMatch({players:[{id:String(p1.id),name:"HOST"},{id:"SPY-2",name:"GUEST"}],hostId:String(p1.id),seed:"R29-DAMAGE-COMPOSITION",now:t});
    SAB.beginRound(match,t);Object.defineProperty(special,"active",{configurable:true,value:{type:"sizzler-saboteurs",state:match,authoritative:true,cooldowns:new Map(),seed:match.seed}});document.body.dataset.specialMode="sizzler-saboteurs";
    engine.enterIsolation();r30.maintainSpyOwnership();
    const before=window.hurtPlayer,probe=function hurtPlayerV141R29CompositionProbe(){return before.apply(this,arguments)};probe.__ccgOriginal=before;probe.__ccgR29CompositionProbe=true;window.hurtPlayer=probe;
    const maintained=r30.maintainSpyOwnership(),topProbeAfterR30=Boolean(window.hurtPlayer?.__ccgR29CompositionProbe),containsSaved=Boolean(r30.chainContains?.(window.hurtPlayer,before));
    window.__CCG_R29_DAMAGE_COMPOSITION__={descriptor,probe};
    return{isolated:engine.state.isolated,spyBelow:Boolean(before?.__ccgV141SpyDamageBoundary),maintained,topProbeAfterR30,containsSaved};
  });
  assert.equal(entered.isolated,true,"Spy damage isolation must be active for the ownership-composition regression");
  assert.equal(entered.spyBelow,true,"the synthetic later owner must initially compose directly around the Spy damage boundary");
  assert.equal(entered.maintained,true,"R30 Spy ownership maintenance must run while Spy isolation is active");
  assert.equal(entered.topProbeAfterR30,true,"R30 must not replace a later hurtPlayer owner whose ancestry already contains its saved Spy owner");
  assert.equal(entered.containsSaved,true,"R30 must recognise its saved Spy damage owner inside later wrapper ancestry");

  await page.waitForTimeout(180);
  const retained=await page.evaluate(()=>{
    const seen=new Set(),chain=[];let current=window.hurtPlayer;
    while(typeof current==="function"&&!seen.has(current)&&chain.length<64){seen.add(current);chain.push({name:String(current.name||""),probe:Boolean(current.__ccgR29CompositionProbe),spy:Boolean(current.__ccgV141SpyDamageBoundary)});current=typeof current.__ccgOriginal==="function"?current.__ccgOriginal:null}
    return{topProbe:Boolean(window.hurtPlayer?.__ccgR29CompositionProbe),hasProbe:chain.some(row=>row.probe),hasSpy:chain.some(row=>row.spy),chain};
  });
  assert.equal(retained.topProbe,true,`R29/R30 monitors must not discard a later owner that composes around the Spy boundary: ${JSON.stringify(retained.chain)}`);
  assert.equal(retained.hasProbe,true,"the later damage owner must remain in the live ancestry while Spy is active");
  assert.equal(retained.hasSpy,true,"the Spy damage boundary must remain in the live ancestry while the later owner stays installed");

  const exited=await page.evaluate(()=>{
    const special=window.CCGLostSizzlerSpecialModes,engine=window.CCGLostSizzlerV141R29SpyEngine,saved=window.__CCG_R29_DAMAGE_COMPOSITION__;
    if(saved.descriptor)Object.defineProperty(special,"active",saved.descriptor);else delete special.active;delete document.body.dataset.specialMode;
    engine.leaveIsolation();
    const seen=new Set(),chain=[];let current=window.hurtPlayer,spyOwner=null;
    while(typeof current==="function"&&!seen.has(current)&&chain.length<64){seen.add(current);if(current.__ccgV141SpyDamageBoundary)spyOwner=current;chain.push({name:String(current.name||""),probe:Boolean(current.__ccgR29CompositionProbe),spy:Boolean(current.__ccgV141SpyDamageBoundary)});current=typeof current.__ccgOriginal==="function"?current.__ccgOriginal:null}
    return{isolated:engine.state.isolated,hasProbe:chain.some(row=>row.probe),hasSpy:chain.some(row=>row.spy),spyDelegate:typeof spyOwner?.__ccgOriginal==="function",chain};
  });
  assert.equal(exited.isolated,false,"leaving Spy must release the isolation state");
  assert.equal(exited.hasProbe,true,`leaving Spy must not restore an old hurtPlayer snapshot over a later composed owner: ${JSON.stringify(exited.chain)}`);
  assert.equal(exited.hasSpy,true,"a Spy boundary left inside an outer composition must remain a safe dormant passthrough until normal owner repair retires it");
  assert.equal(exited.spyDelegate,true,"a dormant Spy boundary must retain a callable delegate after isolation state is cleared");

  assert.deepEqual(errors,[],`Spy damage-owner composition regression must have no uncaught errors: ${errors.join("\n")}`);
  console.log("Lost Sizzler V10.41 Spy damage ownership preserved later wrappers across R29/R30 monitors and mode exit.");
  await context.close();
}finally{
  await browser.close();for(const socket of sockets)socket.destroy();await new Promise(resolve=>server.close(()=>resolve()));
}
