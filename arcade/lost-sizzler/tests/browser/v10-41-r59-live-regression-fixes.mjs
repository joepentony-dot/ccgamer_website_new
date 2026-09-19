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
  const context=await browser.newContext({viewport:{width:1800,height:1000}});
  await context.addInitScript(()=>{try{localStorage.setItem("ccg-lost-sizzler-tutorial-seen-v1","true")}catch(_){}});
  const page=await context.newPage();
  page.setDefaultTimeout(45000);
  const errors=[];page.on("pageerror",error=>errors.push(String(error?.stack||error)));

  console.log("[r59] load canonical runtime and wait for final clock owner");
  await page.goto(`${origin}/arcade/lost-sizzler/`,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.body.dataset.releaseReady==="true"&&Boolean(window.CCGLostSizzlerV141R59LiveRegressionFixes),null,{timeout:90000});
  await page.click("#solo-btn");
  await page.waitForFunction(()=>document.body.dataset.runActive==="true"&&mode==="playing"&&Boolean(p1)&&window.loop?.__ccgV141R59PauseClock===true,null,{timeout:20000});

  const CADENCE_SAMPLE_MS=1500;
  console.log("[r59] establish runner-relative accepted-frame cadence before pause cycling");
  const baselineStart=await page.evaluate(()=>Number(window.CCGLostSizzlerV141R59LiveRegressionFixes.state.acceptedFrames||0));
  await page.waitForTimeout(CADENCE_SAMPLE_MS);
  const baselineEnd=await page.evaluate(()=>Number(window.CCGLostSizzlerV141R59LiveRegressionFixes.state.acceptedFrames||0));
  const baselineFrames=baselineEnd-baselineStart;
  assert.ok(baselineFrames>=5,`baseline R59 clock must continue advancing, got ${baselineFrames} accepted frames in ${CADENCE_SAMPLE_MS} ms`);

  console.log("[r59] five pause/resume cycles cannot pay paused wall-clock time into recovery");
  for(let cycle=0;cycle<5;cycle++){
    await page.keyboard.press("KeyP");
    await page.waitForFunction(()=>mode==="paused");
    const before=await page.evaluate(()=>({r29:Number(window.CCGLostSizzlerV141R29?.state?.combatStallRecoveries||0),discarded:Number(window.CCGLostSizzlerV141R59LiveRegressionFixes?.state?.pausedGapsDiscarded||0)}));
    await page.evaluate(()=>{const until=performance.now()+620;while(performance.now()<until){}});
    await page.waitForTimeout(80);
    const paused=await page.evaluate(()=>({mode,r29:Number(window.CCGLostSizzlerV141R29?.state?.combatStallRecoveries||0),discarded:Number(window.CCGLostSizzlerV141R59LiveRegressionFixes?.state?.pausedGapsDiscarded||0)}));
    assert.equal(paused.mode,"paused",`cycle ${cycle+1}: blocking pause fixture must remain paused`);
    assert.equal(paused.r29,before.r29,`cycle ${cycle+1}: paused wall-clock gap must not enter R29 combat recovery`);
    assert.ok(paused.discarded>before.discarded,`cycle ${cycle+1}: R59 must record the paused long gap as discarded`);
    await page.keyboard.press("KeyP");
    await page.waitForFunction(()=>mode==="playing");
    await page.waitForTimeout(100);
  }

  console.log("[r59] repeated resume cannot multiply accepted simulation cadence");
  const afterStart=await page.evaluate(()=>Number(window.CCGLostSizzlerV141R59LiveRegressionFixes.state.acceptedFrames||0));
  await page.waitForTimeout(CADENCE_SAMPLE_MS);
  const afterEnd=await page.evaluate(()=>Number(window.CCGLostSizzlerV141R59LiveRegressionFixes.state.acceptedFrames||0));
  const afterFrames=afterEnd-afterStart,ratio=afterFrames/Math.max(1,baselineFrames);
  assert.ok(afterFrames>=5,`post-pause R59 clock must continue advancing, got ${afterFrames} accepted frames in ${CADENCE_SAMPLE_MS} ms`);
  assert.ok(ratio>=0.5&&ratio<=1.75,`five resumes must not multiply or collapse simulation cadence: baseline=${baselineFrames}, after=${afterFrames}, ratio=${ratio.toFixed(2)}`);
  const pauseState=await page.evaluate(()=>({...window.CCGLostSizzlerV141R59LiveRegressionFixes.state}));
  assert.ok(pauseState.pauseBoundaries>=10,`five pause/resume cycles must cross at least ten R59 boundaries, got ${pauseState.pauseBoundaries}`);

  const retirement=await page.evaluate(()=>({
    horde:Boolean(document.getElementById("horde-mode-btn")),
    spy:Boolean(document.getElementById("saboteurs-mode-btn")),
    specialMode:String(document.body.dataset.specialMode||"")
  }));
  assert.deepEqual(retirement,{horde:false,spy:false,specialMode:""},"retired special modes must remain absent during R59 active-clock coverage");
  assert.deepEqual(errors,[],`R59 active live-regression browser test produced page errors: ${errors.join("\n")}`);
  console.log(`C64 Dungeon Carnage V10.41 R59 pause cadence (${baselineFrames}->${afterFrames}, ratio ${ratio.toFixed(2)}) and paused-gap isolation passed in Chromium.`);
  await context.close();
}finally{
  await browser.close().catch(()=>{});for(const socket of sockets)socket.destroy();await new Promise(resolve=>server.close(resolve));
}
