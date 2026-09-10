import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {chromium} from "playwright";

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
  ".jpg":"image/jpeg",
  ".jpeg":"image/jpeg",
  ".webp":"image/webp",
  ".ogg":"audio/ogg",
  ".mp3":"audio/mpeg",
  ".wav":"audio/wav"
};

const sockets=new Set();
const server=http.createServer((req,res)=>{
  try{
    const url=new URL(req.url,"http://local"),pathname=decodeURIComponent(url.pathname),relative=pathname.endsWith("/")?`${pathname}index.html`:pathname,file=path.resolve(repo,`.${relative}`);
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

async function open(context,label){
  const page=await context.newPage();
  page.setDefaultTimeout(30000);
  const pageErrors=[];
  page.on("pageerror",error=>pageErrors.push(String(error?.stack||error)));
  await page.goto(`${origin}/arcade/lost-sizzler/?v142-tutorial-boundary=${label}`,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>Boolean(window.CCGLostSizzlerV142DemoPaywall));
  return{page,pageErrors};
}

async function emitTutorialComplete(page){
  await page.evaluate(()=>{
    document.getElementById("ccg-tutorial-complete-banner")?.remove();
    const banner=document.createElement("div");
    banner.id="ccg-tutorial-complete-banner";
    banner.innerHTML="<b>TUTORIAL COMPLETE</b><span>Training finished.</span>";
    document.body.appendChild(banner);
  });
}

try{
  const normalContext=await browser.newContext({viewport:{width:1280,height:800}});
  const normal=await open(normalContext,"normal");
  await emitTutorialComplete(normal.page);
  await normal.page.waitForTimeout(650);
  const normalAudit=await normal.page.evaluate(()=>({
    demoMode:window.CCGLostSizzlerV142DemoPaywall.demoMode,
    shown:window.CCGLostSizzlerV142DemoPaywall.diagnostics().shown,
    overlayHidden:document.getElementById("v142-demo-paywall")?.classList.contains("hidden")===true,
    guarded:window.CCGLostSizzlerV142DemoPaywall.diagnostics().guardedCount
  }));
  assert.equal(normalAudit.demoMode,false,"Canonical full-game boot must remain outside explicit demo mode.");
  assert.equal(normalAudit.shown,false,"Tutorial completion must not open a purchase screen during normal full-game development/runtime boot.");
  assert.equal(normalAudit.overlayHidden,true,"Normal full-game Tutorial completion must leave the permanent-unlock overlay hidden.");
  assert.equal(normalAudit.guarded,0,"Normal full-game Tutorial completion must not install paid-mode guards.");
  assert.deepEqual(normal.pageErrors,[],`Normal Tutorial completion boundary must not raise page errors: ${normal.pageErrors.join("\n")}`);
  await normalContext.close();

  const demoContext=await browser.newContext({viewport:{width:1280,height:800}});
  await demoContext.addInitScript(()=>{window.CCG_LOST_SIZZLER_DEMO_MODE=true});
  const demo=await open(demoContext,"demo");
  await demo.page.waitForFunction(()=>window.CCGLostSizzlerV142DemoPaywall.diagnostics().guardedCount===8);
  await emitTutorialComplete(demo.page);
  await demo.page.waitForFunction(()=>!document.getElementById("v142-demo-paywall")?.classList.contains("hidden"));
  const demoAudit=await demo.page.evaluate(()=>({
    demoMode:window.CCGLostSizzlerV142DemoPaywall.demoMode,
    shown:window.CCGLostSizzlerV142DemoPaywall.diagnostics().shown,
    kicker:document.querySelector("#v142-demo-paywall .v142-paywall-kicker")?.textContent||"",
    guarded:window.CCGLostSizzlerV142DemoPaywall.diagnostics().guardedCount,
    runActive:document.body.dataset.runActive
  }));
  assert.equal(demoAudit.demoMode,true,"Explicit demo wrapper must retain the Tutorial completion purchase boundary.");
  assert.equal(demoAudit.shown,true,"Demo Tutorial completion must present the permanent-unlock offer.");
  assert.match(demoAudit.kicker,/TUTORIAL COMPLETE/i,"Demo Tutorial completion offer must identify the completed free introduction.");
  assert.equal(demoAudit.guarded,8,"Tutorial completion offer must leave all paid game-entry paths guarded until entitlement is verified.");
  assert.notEqual(demoAudit.runActive,"true","Tutorial completion purchase presentation must not start paid gameplay underneath the overlay.");
  assert.deepEqual(demo.pageErrors,[],`Demo Tutorial completion boundary must not raise page errors: ${demo.pageErrors.join("\n")}`);
  await demoContext.close();

  console.log("Lost Sizzler V10.42 demo-only Tutorial completion purchase boundary browser contract passed.");
}finally{
  await browser.close();
  for(const socket of sockets)socket.destroy();
  await new Promise(resolve=>server.close(()=>resolve()));
}
