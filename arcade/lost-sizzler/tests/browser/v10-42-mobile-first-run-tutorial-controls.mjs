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
  ".webp":"image/webp",
  ".png":"image/png",
  ".jpg":"image/jpeg",
  ".jpeg":"image/jpeg",
  ".mp3":"audio/mpeg",
  ".wav":"audio/wav",
  ".ogg":"audio/ogg"
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

async function acceptMobilePlayNotice(page){
  const notice=page.locator("#ccg-mobile-pc-notice");
  if(!(await notice.isVisible()))return false;
  const accept=page.locator("#ccg-mobile-pc-accept");
  assert.equal(await accept.isVisible(),true,"mobile play notice must expose ACCEPT");
  await accept.click({noWaitAfter:true});
  await page.waitForFunction(()=>document.getElementById("ccg-mobile-pc-notice")?.classList.contains("hidden")===true||getComputedStyle(document.getElementById("ccg-mobile-pc-notice")).display==="none");
  return true;
}

async function touchButton(page,context,selector){
  const locator=page.locator(selector);
  const box=await locator.boundingBox();
  assert.ok(box&&box.width>0&&box.height>0,`touch target ${selector} must have geometry`);
  const x=box.x+box.width/2,y=box.y+box.height/2;
  const cdp=await context.newCDPSession(page);
  try{
    await cdp.send("Input.dispatchTouchEvent",{type:"touchStart",touchPoints:[{x,y,radiusX:1,radiusY:1,force:1,id:1}]});
    await page.waitForTimeout(60);
    await cdp.send("Input.dispatchTouchEvent",{type:"touchEnd",touchPoints:[]});
  }finally{
    await cdp.detach();
  }
  await page.waitForTimeout(100);
}

function overlaps(a,b){
  return Boolean(a&&b&&a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top);
}

try{
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2});
  await context.addInitScript(()=>{
    try{
      localStorage.removeItem("ccg-lost-sizzler-tutorial-seen-v1");
      localStorage.removeItem("ccg-lost-sizzler-tutorial-complete-v1");
    }catch(_){}
  });
  const page=await context.newPage();
  page.setDefaultTimeout(30000);
  const errors=[];
  page.on("pageerror",error=>errors.push(String(error?.stack||error)));

  await page.goto(`${origin}/arcade/lost-sizzler/?mobile-first-run-tutorial=1`,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.body.dataset.releaseReady==="true"&&Boolean(window.CCGLostSizzlerTutorialGuidanceV123)&&Boolean(window.CCGLostSizzlerOnboardingV120));
  await page.waitForLoadState("load");

  const initial=await page.evaluate(()=>({
    seen:window.CCGLostSizzlerOnboardingV120?.isTutorialSeen?.(),
    complete:window.CCGLostSizzlerOnboardingV120?.isTutorialComplete?.()
  }));
  assert.equal(initial.seen,false,"fresh mobile profile must begin unseen");
  assert.equal(initial.complete,false,"fresh mobile profile must begin with tutorial incomplete");

  await page.locator("#solo-btn").click({noWaitAfter:true});
  await page.waitForFunction(()=>document.body.dataset.runActive==="true");
  await page.waitForFunction(()=>document.body.dataset.tutorialActive==="true");
  await acceptMobilePlayNotice(page);

  await page.waitForFunction(()=>!document.getElementById("ccg-tutorial-stage-modal")?.classList.contains("hidden"));
  const firstStage=await page.locator("#ccg-tutorial-stage-modal h2").textContent();
  assert.match(String(firstStage||""),/MOVE AROUND/i,"first-ever Solo start must begin Tutorial movement training");

  await page.locator("#ccg-tutorial-stage-modal [data-stage-continue]").click({noWaitAfter:true});
  await page.waitForFunction(()=>document.getElementById("ccg-tutorial-stage-modal")?.classList.contains("hidden")===true);
  await page.waitForFunction(()=>Boolean(document.getElementById("ccg-tutorial-live-progress"))&&Boolean(document.querySelector("#v104-touch-controls [data-key='KeyS']")));
  await page.waitForTimeout(220);

  const geometry=await page.evaluate(()=>{
    const rect=selector=>{
      const r=document.querySelector(selector)?.getBoundingClientRect();
      return r?{left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height}:null;
    };
    const down=document.querySelector("#v104-touch-controls [data-key='KeyS']");
    const dr=down?.getBoundingClientRect();
    const hit=dr?document.elementFromPoint(dr.left+dr.width/2,dr.top+dr.height/2):null;
    return{
      overlay:rect("#ccg-tutorial-live-progress"),
      pad:rect("#v104-touch-controls .v104-touch-pad"),
      down:rect("#v104-touch-controls [data-key='KeyS']"),
      overlayPointer:getComputedStyle(document.getElementById("ccg-tutorial-live-progress")).pointerEvents,
      downHit:Boolean(hit&&(hit===down||down?.contains(hit))),
      skipVisible:Boolean(document.querySelector("#ccg-tutorial-live-progress [data-live-skip]"))
    };
  });

  assert.ok(geometry.overlay&&geometry.pad&&geometry.down,`tutorial mobile geometry must exist: ${JSON.stringify(geometry)}`);
  assert.equal(overlaps(geometry.overlay,geometry.pad),false,`Training Control overlay must never cover the mobile D-pad: ${JSON.stringify(geometry)}`);
  assert.equal(overlaps(geometry.overlay,geometry.down),false,`Training Control overlay must never cover DOWN: ${JSON.stringify(geometry)}`);
  assert.equal(geometry.overlayPointer,"none","mobile Training Control container must not intercept touch input");
  assert.equal(geometry.downHit,true,"DOWN must own hit-testing at its centre");
  assert.equal(geometry.skipVisible,true,"interactive Tutorial must expose persistent Skip Tutorial");

  await page.evaluate(()=>{
    const down=document.querySelector("#v104-touch-controls [data-key='KeyS']");
    window.__ccgTutorialDownTouched=false;
    down?.addEventListener("pointerdown",()=>{window.__ccgTutorialDownTouched=true},{once:true});
  });
  await touchButton(page,context,"#v104-touch-controls [data-key='KeyS']");
  assert.equal(await page.evaluate(()=>window.__ccgTutorialDownTouched===true),true,"real touch input must reach DOWN while Training Control is visible");

  await page.locator("#ccg-tutorial-live-progress [data-live-skip]").click({noWaitAfter:true});
  await page.waitForFunction(()=>document.body.dataset.tutorialActive!=="true"&&document.body.dataset.runActive!=="true");
  await page.waitForFunction(()=>document.getElementById("menu")?.classList.contains("hidden")===false);
  const afterSkip=await page.evaluate(()=>({
    seen:window.CCGLostSizzlerOnboardingV120?.isTutorialSeen?.(),
    complete:window.CCGLostSizzlerOnboardingV120?.isTutorialComplete?.()
  }));
  assert.equal(afterSkip.seen,true,"skipping Tutorial must mark first-run onboarding as seen");
  assert.equal(afterSkip.complete,false,"skipping Tutorial must not falsely mark it complete");

  await page.locator("#solo-btn").click({noWaitAfter:true});
  await page.waitForFunction(()=>document.body.dataset.runActive==="true");
  await page.waitForTimeout(450);
  const returning=await page.evaluate(()=>({
    tutorialActive:document.body.dataset.tutorialActive||"",
    modalHidden:document.getElementById("ccg-tutorial-stage-modal")?.classList.contains("hidden")===true
  }));
  assert.notEqual(returning.tutorialActive,"true","after an explicit skip, subsequent Solo starts must not force Tutorial again");
  assert.equal(returning.modalHidden,true,"returning-player Solo must not reopen the Tutorial stage modal");

  assert.deepEqual(errors,[],`mobile first-run Tutorial contract emitted page errors: ${errors.join("\n")}`);
  console.log("Dungeon Carnage mobile first-run Tutorial and unobstructed D-pad contract passed.");
  await context.close();
}finally{
  await browser.close();
  for(const socket of sockets)socket.destroy();
  await new Promise(resolve=>server.close(()=>resolve()));
}
