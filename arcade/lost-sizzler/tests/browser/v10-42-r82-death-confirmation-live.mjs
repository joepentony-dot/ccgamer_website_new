import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {chromium} from "playwright";

const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,"../../../..");
const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json; charset=utf-8",".svg":"image/svg+xml",".png":"image/png",".webp":"image/webp",".ogg":"audio/ogg",".mp3":"audio/mpeg",".wav":"audio/wav"};
const sockets=new Set();
const server=http.createServer((req,res)=>{
  try{
    const url=new URL(req.url,"http://local"),pathname=decodeURIComponent(url.pathname),relative=pathname.endsWith("/")?`${pathname}index.html`:pathname,file=path.resolve(repo,`.${relative}`);
    if(!file.startsWith(`${repo}${path.sep}`)&&file!==repo){res.writeHead(403).end("forbidden");return}
    fs.readFile(file,(error,data)=>{if(error){res.writeHead(404,{connection:"close"}).end("not found");return}res.writeHead(200,{"content-type":mime[path.extname(file).toLowerCase()]||"application/octet-stream","cache-control":"no-store",connection:"close"});res.end(data)});
  }catch(error){res.writeHead(500,{connection:"close"}).end(String(error))}
});
server.on("connection",socket=>{sockets.add(socket);socket.on("close",()=>sockets.delete(socket))});
await new Promise((resolve,reject)=>{server.once("error",reject);server.listen(0,"127.0.0.1",resolve)});
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,args:["--disable-dev-shm-usage","--disable-background-networking","--autoplay-policy=no-user-gesture-required"]});

try{
  const context=await browser.newContext({viewport:{width:1440,height:900}});
  await context.addInitScript(()=>{try{localStorage.setItem("ccg-lost-sizzler-tutorial-seen-v1","true")}catch(_){}});
  const page=await context.newPage();
  page.setDefaultTimeout(60000);
  const errors=[];page.on("pageerror",error=>errors.push(String(error?.stack||error)));

  await page.goto(`${origin}/arcade/lost-sizzler/?r82-live-death-confirmation=1`,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.body.dataset.releaseReady==="true"&&window.CCGLostSizzlerV142Bootstrap?.ready===true,null,{timeout:90000});
  await page.click("#solo-btn");
  await page.waitForFunction(()=>document.body.dataset.runActive==="true"&&mode==="playing"&&Boolean(p1),null,{timeout:20000});

  const death=await page.evaluate(()=>{
    p1.health=1;
    p1.invuln=0;
    p1.xp=Math.max(2200,Number(p1.xp)||0);
    p1.totalXp=Math.max(2200,Number(p1.totalXp)||0);
    run.floorXP=Math.max(1200,Number(run.floorXP)||0);
    run.bankedXP=Math.max(1200,Number(run.bankedXP)||0);
    run.consecutiveDeaths=0;
    hurtPlayer(p1,1,false,"death confirmation regression");
    return{
      mode:String(mode),
      health:Number(p1.health),
      pending:Boolean(document.getElementById("ccg-r72-death-feedback")?.classList.contains("active"))
    };
  });
  assert.equal(death.mode,"respawning","lethal damage must enter the confirmation-owned respawn state");
  await page.waitForFunction(()=>document.getElementById("ccg-r72-death-feedback")?.classList.contains("active")===true);

  const before=await page.evaluate(()=>({
    mode:String(mode),
    active:Boolean(document.getElementById("ccg-r72-death-feedback")?.classList.contains("active")),
    ariaHidden:document.getElementById("ccg-r72-death-feedback")?.getAttribute("aria-hidden"),
    confirmations:Number(window.CCGLostSizzlerV142R72MapDeathFeedback?.state?.confirmations||0)
  }));
  assert.equal(before.mode,"respawning");
  assert.equal(before.active,true);
  assert.equal(before.ariaHidden,"false");

  // The retired timed path resumed after roughly 5-6 seconds. Hold longer
  // than that and prove gameplay remains blocked until explicit confirmation.
  await page.waitForTimeout(7000);

  const held=await page.evaluate(()=>({
    mode:String(mode),
    active:Boolean(document.getElementById("ccg-r72-death-feedback")?.classList.contains("active")),
    ariaHidden:document.getElementById("ccg-r72-death-feedback")?.getAttribute("aria-hidden"),
    confirmations:Number(window.CCGLostSizzlerV142R72MapDeathFeedback?.state?.confirmations||0),
    runActive:String(document.body.dataset.runActive||"")
  }));
  assert.equal(held.mode,"respawning","death must not auto-respawn after the old timeout window");
  assert.equal(held.active,true,"YOU DIED must remain visible until the player confirms");
  assert.equal(held.ariaHidden,"false");
  assert.equal(held.confirmations,before.confirmations,"no hidden timer may synthesize a confirmation");
  assert.equal(held.runActive,"true","waiting on acknowledgement must preserve the run rather than ending/restarting it");

  await page.keyboard.press("Enter");
  await page.waitForFunction(()=>mode==="playing"&&document.getElementById("ccg-r72-death-feedback")?.classList.contains("active")===false);

  const after=await page.evaluate(()=>({
    mode:String(mode),
    active:Boolean(document.getElementById("ccg-r72-death-feedback")?.classList.contains("active")),
    confirmations:Number(window.CCGLostSizzlerV142R72MapDeathFeedback?.state?.confirmations||0)
  }));
  assert.equal(after.mode,"playing","explicit confirmation must resume gameplay");
  assert.equal(after.active,false,"respawn confirmation must dismiss YOU DIED");
  assert.equal(after.confirmations,before.confirmations+1,"one keypress must create exactly one confirmation");
  assert.deepEqual(errors,[],`death confirmation regression must not emit browser errors: ${errors.join("\n")}`);

  console.log("Dungeon Carnage persistent death acknowledgement passed in Chromium.");
  await context.close();
}finally{
  await browser.close();
  for(const socket of sockets)socket.destroy();
  await new Promise(resolve=>server.close(()=>resolve()));
}
