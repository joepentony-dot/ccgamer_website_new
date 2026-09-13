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

async function auditTutorialBoundary(page){
  return page.evaluate(()=>({
    demoMode:window.CCGLostSizzlerV142DemoPaywall.demoMode,
    trialMode:window.CCGLostSizzlerV142DemoPaywall.trialMode,
    shown:window.CCGLostSizzlerV142DemoPaywall.diagnostics().shown,
    trialStarted:window.CCGLostSizzlerV142DemoPaywall.diagnostics().trialStarted,
    overlayHidden:document.getElementById("v142-demo-paywall")?.classList.contains("hidden")===true,
    legacyLocked:document.body.dataset.v142DemoLocked,
    legacyBadges:document.querySelectorAll(".v142-demo-lock-badge").length
  }));
}

try{
  const normalContext=await browser.newContext({viewport:{width:1280,height:800}});
  const normal=await open(normalContext,"normal");
  await emitTutorialComplete(normal.page);
  await normal.page.waitForTimeout(650);
  const normalAudit=await auditTutorialBoundary(normal.page);
  assert.equal(normalAudit.demoMode,false,"Canonical boot must remain outside the retired Tutorial-completion demo mode.");
  assert.equal(normalAudit.trialMode,true,"Canonical boot must expose the two-minute active-run trial mode.");
  assert.equal(normalAudit.shown,false,"Tutorial completion must not open a purchase screen before the two-minute trial expires.");
  assert.equal(normalAudit.trialStarted,false,"Tutorial completion alone must not start the two-minute trial clock.");
  assert.equal(normalAudit.overlayHidden,true,"Tutorial completion must leave the permanent-unlock overlay hidden.");
  assert.notEqual(normalAudit.legacyLocked,"true","Tutorial completion must not restore the retired demo button lock.");
  assert.equal(normalAudit.legacyBadges,0,"Tutorial completion must not add retired FULL GAME guard badges.");
  assert.deepEqual(normal.pageErrors,[],`Normal Tutorial completion boundary must not raise page errors: ${normal.pageErrors.join("\n")}`);
  await normalContext.close();

  const legacyFlagContext=await browser.newContext({viewport:{width:1280,height:800}});
  await legacyFlagContext.addInitScript(()=>{window.CCG_LOST_SIZZLER_DEMO_MODE=true});
  const legacy=await open(legacyFlagContext,"legacy-demo-flag");
  await emitTutorialComplete(legacy.page);
  await legacy.page.waitForTimeout(650);
  const legacyAudit=await auditTutorialBoundary(legacy.page);
  assert.equal(legacyAudit.demoMode,false,"The obsolete CCG_LOST_SIZZLER_DEMO_MODE flag must not restore the retired Tutorial purchase gate.");
  assert.equal(legacyAudit.trialMode,true,"The obsolete demo flag must still use the canonical two-minute trial model.");
  assert.equal(legacyAudit.shown,false,"Tutorial completion under the obsolete demo flag must not open a purchase screen.");
  assert.equal(legacyAudit.trialStarted,false,"Tutorial completion under the obsolete demo flag must not start the trial clock.");
  assert.equal(legacyAudit.overlayHidden,true,"The obsolete demo flag must not expose the paywall on Tutorial completion.");
  assert.notEqual(legacyAudit.legacyLocked,"true","The obsolete demo flag must not install legacy paid-mode guards.");
  assert.equal(legacyAudit.legacyBadges,0,"The obsolete demo flag must not add retired FULL GAME guard badges.");

  await legacy.page.evaluate(()=>{document.body.dataset.runActive="true"});
  await legacy.page.waitForFunction(()=>window.CCGLostSizzlerV142DemoPaywall.diagnostics().trialStarted===true);
  const activeRunAudit=await legacy.page.evaluate(()=>({
    trialStarted:window.CCGLostSizzlerV142DemoPaywall.diagnostics().trialStarted,
    remainingMs:window.CCGLostSizzlerV142DemoPaywall.diagnostics().remainingMs,
    countdown:document.querySelector("#v142-trial-countdown [data-trial-time]")?.textContent||"",
    badgeHidden:document.getElementById("v142-trial-countdown")?.classList.contains("hidden")===true,
    overlayHidden:document.getElementById("v142-demo-paywall")?.classList.contains("hidden")===true
  }));
  assert.equal(activeRunAudit.trialStarted,true,"The two-minute trial must begin from the canonical active-run state.");
  assert.ok(activeRunAudit.remainingMs>0&&activeRunAudit.remainingMs<=120000,"Active-run trial must begin with no more than the canonical two-minute allowance.");
  assert.match(activeRunAudit.countdown,/^0[12]:[0-5][0-9]$/,"Active-run trial must expose a visible countdown.");
  assert.equal(activeRunAudit.badgeHidden,false,"Active-run trial countdown must be visible.");
  assert.equal(activeRunAudit.overlayHidden,true,"Starting the active-run trial must not open the paywall before expiry.");
  assert.deepEqual(legacy.pageErrors,[],`Legacy demo-flag compatibility boundary must not raise page errors: ${legacy.pageErrors.join("\n")}`);
  await legacyFlagContext.close();

  console.log("C64 Dungeon Carnage Tutorial-neutral two-minute trial boundary browser contract passed.");
}finally{
  await browser.close();
  for(const socket of sockets)socket.destroy();
  await new Promise(resolve=>server.close(()=>resolve()));
}
