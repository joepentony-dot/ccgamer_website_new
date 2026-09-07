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
const server=http.createServer((req,res)=>{try{const pathname=decodeURIComponent(new URL(req.url,"http://local").pathname),relative=pathname.endsWith("/")?`${pathname}index.html`:pathname,file=path.resolve(repo,`.${relative}`);if(!file.startsWith(`${repo}${path.sep}`)&&file!==repo){res.writeHead(403).end("forbidden");return}fs.readFile(file,(error,data)=>{if(error){res.writeHead(404,{connection:"close"}).end("not found");return}res.writeHead(200,{"content-type":mime[path.extname(file).toLowerCase()]||"application/octet-stream","cache-control":"no-store",connection:"close"});res.end(data)})}catch(error){res.writeHead(500,{connection:"close"}).end(String(error))}});
server.on("connection",socket=>{sockets.add(socket);socket.on("close",()=>sockets.delete(socket))});
await new Promise((resolve,reject)=>{server.once("error",reject);server.listen(0,"127.0.0.1",resolve)});
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,args:["--disable-dev-shm-usage","--disable-background-networking","--autoplay-policy=no-user-gesture-required"]});

try{
  const context=await browser.newContext({viewport:{width:1600,height:900}}),page=await context.newPage();page.setDefaultTimeout(45000);const errors=[];page.on("pageerror",error=>errors.push(String(error?.stack||error)));
  await page.goto(`${origin}/arcade/lost-sizzler/`,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.body.dataset.gameReady==="true"&&Boolean(window.CCGLostSizzlerV141R50MultiplayerRecoveryUX));
  await page.waitForFunction(()=>Boolean(window.CCGLostSizzlerV142Bootstrap));
  await page.waitForFunction(()=>window.CCGLostSizzlerV142Bootstrap.ready===true||window.CCGLostSizzlerV142Bootstrap.failed===true);
  const releaseBoundary=await page.evaluate(()=>({
    bootstrapReady:Boolean(window.CCGLostSizzlerV142Bootstrap?.ready),
    bootstrapFailed:Boolean(window.CCGLostSizzlerV142Bootstrap?.failed),
    zeroServer:Boolean(window.CCGLostSizzlerV142ZeroServerRelease?.enabled&&window.CCGLostSizzlerV142ZeroServerRelease?.onlineMultiplayer===false)
  }));
  assert.equal(releaseBoundary.bootstrapFailed,false,"V10.42 ordered bootstrap must settle successfully before the retained r50 multiplayer recovery fixture begins");
  assert.equal(releaseBoundary.bootstrapReady,true,"V10.42 ordered bootstrap must be ready before the retained r50 multiplayer recovery fixture begins");
  assert.equal(releaseBoundary.zeroServer,true,"r50 must exercise the preserved multiplayer recovery UX only after the production zero-server policy has settled");
  await page.locator("#solo-btn").click({noWaitAfter:true});
  await page.waitForFunction(()=>document.body.dataset.runActive==="true"&&typeof p1!=="undefined"&&Boolean(p1));

  const fallback=await page.evaluate(()=>{
    const api=window.CCGLostSizzlerV141R50MultiplayerRecoveryUX;
    playMode="online";net.connected=true;net.roomCode="R50UX";net.roomMode="dungeon";
    window.CCGLostSizzlerV141R40ColyseusDungeon={getDiagnostics(){return{status:"FALLBACK",transportLive:false,connected:false}}};
    api.state.lastMemberSig="P1|P2";api.state.lastMemberCount=2;net.getMembers=()=>[{id:"P1",name:"One"}];
    api.updateRecovery();
    const banner=document.getElementById("ccg-r50-recovery");return{hidden:banner.classList.contains("hidden"),title:banner.querySelector("[data-title]").textContent,copy:banner.querySelector("[data-copy]").textContent,leaves:api.state.memberLeaves,code:api.state.lastRoomCode}
  });
  assert.equal(fallback.hidden,false);
  assert.match(fallback.title,/DUNGEON SERVER RECONNECTING/);
  assert.match(fallback.copy,/safe fallback transport/i);
  assert.equal(fallback.leaves,1);
  assert.equal(fallback.code,"R50UX");

  const restored=await page.evaluate(()=>{
    const api=window.CCGLostSizzlerV141R50MultiplayerRecoveryUX;api.state.lossSince=Date.now()-1000;
    window.CCGLostSizzlerV141R40ColyseusDungeon={getDiagnostics(){return{status:"LIVE",transportLive:true,connected:true}}};api.updateRecovery();
    return{hidden:document.getElementById("ccg-r50-recovery").classList.contains("hidden"),recoveries:api.state.recoveries}
  });
  assert.equal(restored.hidden,true);
  assert.ok(restored.recoveries>=1);

  const hardLoss=await page.evaluate(()=>{
    const api=window.CCGLostSizzlerV141R50MultiplayerRecoveryUX;net.connected=false;api.state.lossSince=Date.now()-9000;api.updateRecovery();
    const banner=document.getElementById("ccg-r50-recovery"),button=banner.querySelector("[data-return]");return{hidden:banner.classList.contains("hidden"),buttonHidden:button.classList.contains("hidden"),title:banner.querySelector("[data-title]").textContent}
  });
  assert.equal(hardLoss.hidden,false);
  assert.equal(hardLoss.buttonHidden,false);
  assert.match(hardLoss.title,/ROOM CONNECTION LOST/);

  await page.evaluate(async()=>{const api=window.CCGLostSizzlerV141R50MultiplayerRecoveryUX;await api.returnToOnlineMenu()});
  await page.waitForFunction(()=>typeof mode!=="undefined"&&mode==="menu");
  await page.waitForTimeout(150);
  const returned=await page.evaluate(()=>{
    const join=document.getElementById("join-btn");
    return{
      code:document.getElementById("room-code")?.value,
      active:document.activeElement?.id,
      endAction:Boolean(document.getElementById("ccg-r50-online-return")),
      joinVisible:Boolean(join&&!join.hidden&&getComputedStyle(join).display!=="none"),
      zeroServer:Boolean(window.CCGLostSizzlerV142ZeroServerRelease?.enabled&&window.CCGLostSizzlerV142ZeroServerRelease?.onlineMultiplayer===false)
    }
  });
  assert.equal(returned.code,"R50UX","room code must survive the canonical return-to-menu path");
  assert.equal(returned.zeroServer,true,"V10.42 zero-server policy must remain active after the legacy recovery return path");
  assert.equal(returned.joinVisible,false,"retired Join Online Room control must remain hidden in the V10.42 zero-server release");
  assert.notEqual(returned.active,"join-btn","the hidden retired Join Online Room control must not steal focus in V10.42");
  assert.equal(returned.endAction,true,"online result action must be installed");
  assert.deepEqual(errors,[],`r50 browser test must not raise page errors: ${errors.join("\n")}`);
  console.log("Lost Sizzler V10.41 r50 multiplayer fallback and recovery UX remains safely preserved under the V10.42 zero-server release.");
  await context.close();
}finally{
  await browser.close().catch(()=>{});for(const socket of sockets)socket.destroy();await new Promise(resolve=>server.close(()=>resolve()));
}
