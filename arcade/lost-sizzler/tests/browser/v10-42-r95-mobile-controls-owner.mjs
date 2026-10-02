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
      res.writeHead(200,{"content-type":mime[path.extname(file).toLowerCase()]||"application/octet-stream","cache-control":"no-store",connection:"close"});res.end(data);
    });
  }catch(error){res.writeHead(500,{connection:"close"}).end(String(error))}
});
server.on("connection",socket=>{sockets.add(socket);socket.on("close",()=>sockets.delete(socket))});
await new Promise((resolve,reject)=>{server.once("error",reject);server.listen(0,"127.0.0.1",resolve)});
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,args:["--disable-dev-shm-usage","--disable-background-networking","--autoplay-policy=no-user-gesture-required"]});

try{
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1});
  await context.addInitScript(()=>{try{localStorage.setItem("ccg-lost-sizzler-tutorial-seen-v1","true")}catch(_){}});
  await context.route("https://*.supabase.co/**",route=>route.fulfill({status:200,contentType:"application/json",headers:{"access-control-allow-origin":"*"},body:"{}"}));
  const page=await context.newPage();
  page.setDefaultTimeout(60000);
  const errors=[];page.on("pageerror",error=>errors.push(String(error?.stack||error)));

  await page.goto(`${origin}/arcade/lost-sizzler/?r95-mobile-controls-owner=1`,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.body?.dataset?.releaseReady==="true"&&Boolean(window.CCGLostSizzlerV142R95MobileControls)&&Boolean(document.getElementById("solo-btn")),null,{timeout:90000});
  await page.click("#solo-btn");
  await page.waitForFunction(()=>document.body?.dataset?.runActive==="true"&&document.getElementById("menu")?.classList.contains("hidden")===true,null,{timeout:30000});
  const notice=page.locator("#ccg-mobile-pc-notice");
  if(await notice.isVisible().catch(()=>false)){
    const accept=page.locator("#ccg-mobile-pc-accept");
    if(await accept.isVisible().catch(()=>false))await accept.click({noWaitAfter:true});
    await page.waitForFunction(()=>document.getElementById("ccg-mobile-pc-notice")?.classList.contains("hidden")===true||getComputedStyle(document.getElementById("ccg-mobile-pc-notice")).display==="none",null,{timeout:10000});
  }
  await page.waitForFunction(()=>typeof mode!=="undefined"&&mode==="playing"&&typeof playMode!=="undefined"&&playMode==="solo",null,{timeout:30000});
  await page.waitForFunction(()=>document.getElementById("v104-touch-controls")?.classList.contains("active")===true,null,{timeout:10000});

  const initial=await page.evaluate(()=>{
    const root=document.getElementById("v104-touch-controls"),rect=node=>{const r=node?.getBoundingClientRect?.();return r?{width:r.width,height:r.height,left:r.left,top:r.top,right:r.right,bottom:r.bottom}:null};
    return{
      root:rect(root),
      display:getComputedStyle(root).display,
      dirs:[...root.querySelectorAll("[data-key]")].map(button=>({key:button.dataset.key,rect:rect(button),display:getComputedStyle(button).display})),
      actions:[...root.querySelectorAll("[data-action]")].map(button=>({action:button.dataset.action,rect:rect(button),display:getComputedStyle(button).display})),
      installed:window.CCGLostSizzlerV142R95MobileControls?.state?.installed===true
    };
  });
  assert.equal(initial.installed,true,"R95 mobile control owner must install on touch devices");
  assert.equal(initial.display,"grid","mobile control dock must be visible during a real Solo run");
  assert.ok(initial.root?.height>=120&&initial.root.width>300,`mobile control dock must have visible geometry: ${JSON.stringify(initial.root)}`);
  assert.equal(initial.dirs.length,4,"mobile D-pad must expose four directions");
  const requiredActions=["dash","potion","torch","fire","banish","inventory","warp","door","pause"];
  assert.equal(initial.actions.length,requiredActions.length,`mobile action dock must contain exactly the authoritative R95 action set: ${JSON.stringify(initial.actions.map(row=>row.action))}`);
  for(const action of requiredActions){
    assert.equal(initial.actions.filter(row=>row.action===action).length,1,`mobile action dock must expose ${action.toUpperCase()} exactly once`);
  }
  assert.ok([...initial.dirs,...initial.actions].every(row=>row.rect?.width>0&&row.rect?.height>0&&row.display!=="none"),"every mobile control must retain visible hit geometry");

  const before=await page.evaluate(()=>({actions:window.CCGLostSizzlerV142R95MobileControls.state.actions,movements:window.CCGLostSizzlerV142R95MobileControls.state.movements}));
  await page.evaluate(()=>{
    const fire=document.querySelector('#v104-touch-controls [data-action="fire"]');
    if(fire){const clone=fire.cloneNode(true);fire.replaceWith(clone)}
    if(window.p1){p1.controlLocked=true;p1.controlsLocked=true;p1.hitStunMs=180;p1.__ccgLastHurtAt=performance.now()-2000}
    document.body.dataset.runActive="false";
  });
  await page.locator('#v104-touch-controls [data-action="fire"]').tap();
  await page.waitForTimeout(250);
  const after=await page.evaluate(()=>({
    actions:window.CCGLostSizzlerV142R95MobileControls.state.actions,
    active:document.body.dataset.runActive,
    controlLocked:Boolean(window.p1?.controlLocked),
    controlsLocked:Boolean(window.p1?.controlsLocked),
    hitStun:Number(window.p1?.hitStunMs||0)
  }));
  assert.ok(after.actions>before.actions,"root-delegated mobile FIRE must survive child-button replacement");
  assert.equal(after.active,"true","mobile FIRE must recover stale live-run presentation");
  assert.equal(after.controlLocked,false,"mobile FIRE must clear stale controlLocked");
  assert.equal(after.controlsLocked,false,"mobile FIRE must clear stale controlsLocked");
  assert.equal(after.hitStun,0,"mobile FIRE must clear stale hit-stun through the canonical attack path");
  assert.deepEqual(errors,[],`mobile control owner emitted page errors: ${errors.join("\n")}`);
  console.log("Dungeon Carnage R95 mobile Solo touch-control owner passed.");
  await context.close();
}finally{
  await browser.close();
  for(const socket of sockets)socket.destroy();
  await new Promise(resolve=>server.close(()=>resolve()));
}
