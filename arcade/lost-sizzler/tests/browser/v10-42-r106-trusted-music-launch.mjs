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

let musicRequests=0;
const sockets=new Set();
const server=http.createServer((req,res)=>{
  try{
    const url=new URL(req.url,"http://local");
    const pathname=decodeURIComponent(url.pathname);
    if(pathname.startsWith("/arcade/lost-sizzler/assets/audio/music/"))musicRequests+=1;
    const relative=pathname.endsWith("/")?`${pathname}index.html`:pathname;
    const file=path.resolve(repo,`.${relative}`);
    if(!file.startsWith(`${repo}${path.sep}`)&&file!==repo){res.writeHead(403).end("forbidden");return}
    fs.readFile(file,(error,data)=>{
      if(error){res.writeHead(404,{connection:"close"}).end("not found");return}
      res.writeHead(200,{
        "content-type":mime[path.extname(file).toLowerCase()]||"application/octet-stream",
        "cache-control":"no-store",
        connection:"close"
      });
      res.end(data);
    });
  }catch(error){res.writeHead(500,{connection:"close"}).end(String(error))}
});
server.on("connection",socket=>{sockets.add(socket);socket.on("close",()=>sockets.delete(socket))});
await new Promise((resolve,reject)=>{server.once("error",reject);server.listen(0,"127.0.0.1",resolve)});
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,args:["--disable-dev-shm-usage","--disable-background-networking"]});

try{
  const context=await browser.newContext({viewport:{width:1440,height:900}});
  await context.addInitScript(()=>{window.__CCG_ALLOW_REMOTE_TEST_ASSETS__=true});

  const rows=[
    ["lostSizzlerExploration--trusted-test",`${origin}/arcade/lost-sizzler/assets/audio/music/exploration.wav`],
    ["lostSizzlerDanger--trusted-test",`${origin}/arcade/lost-sizzler/assets/audio/music/danger.wav`],
    ["lostSizzlerSanctuary--trusted-test",`${origin}/arcade/lost-sizzler/assets/audio/music/sanctuary.wav`],
    ["lostSizzlerNamed--trusted-test",`${origin}/arcade/lost-sizzler/assets/audio/music/named-enemy.wav`],
    ["lostSizzlerStalker--trusted-test",`${origin}/arcade/lost-sizzler/assets/audio/music/count-loadula.wav`]
  ].map(([asset_key,public_url],index)=>({
    asset_group:"music",
    asset_key,
    public_url,
    enabled:true,
    created_at:`2026-01-01T00:00:0${index+1}Z`,
    asset_meta:{playlist:true}
  }));

  await context.route("https://lcslgxpgmttaexsorxik.supabase.co/rest/v1/arcade_assets**",async route=>{
    const request=route.request();
    const headers={
      "access-control-allow-origin":origin,
      "access-control-allow-methods":"GET,OPTIONS",
      "access-control-allow-headers":"apikey,authorization,accept,content-type",
      "content-type":"application/json; charset=utf-8"
    };
    if(request.method()==="OPTIONS"){await route.fulfill({status:200,headers,body:""});return}
    await route.fulfill({status:200,headers,body:JSON.stringify(rows)});
  });

  let heldModule=false,releaseHeldModule=()=>{};
  const heldModuleGate=new Promise(resolve=>{releaseHeldModule=resolve});
  await context.route("**/js/v10-42-r94-enemy-identity.js*",async route=>{
    if(!heldModule){
      heldModule=true;
      await heldModuleGate;
    }
    await route.continue();
  });

  const page=await context.newPage();
  page.setDefaultTimeout(45000);
  const pageErrors=[];
  page.on("pageerror",error=>pageErrors.push(String(error?.stack||error)));
  page.on("request",request=>{const url=request.url();if(/\\.supabase\\.co\\/storage\\/v1\\/object\\//i.test(url)&&/\\/music\\//i.test(url))musicRequests+=1});

  await page.goto(`${origin}/arcade/lost-sizzler/?trusted-music-launch=1`,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>Boolean(window.CCGLostSizzlerV142Bootstrap)&&window.CCGLostSizzlerV142Bootstrap.ready===false);
  for(let attempt=0;attempt<100&&!heldModule;attempt++)await new Promise(resolve=>setTimeout(resolve,20));
  assert.equal(heldModule,true,"trusted-music regression must hold an ordered module so the first Start Game click is genuinely pre-ready");

  const start=page.locator("#solo-btn");
  const blocked=await page.evaluate(()=>{
    const loader=document.getElementById("ccg-release-loading");
    const style=loader?getComputedStyle(loader):null;
    return{
      releaseReady:document.body.dataset.releaseReady||"",
      loaderVisible:Boolean(loader&&!loader.hidden&&style?.display!=="none"),
      bootstrapReady:Boolean(window.CCGLostSizzlerV142Bootstrap?.ready),
      playlistOwner:Boolean(window.CCGLostSizzlerPlaylistAudio)
    };
  });
  assert.deepEqual(blocked,{releaseReady:"false",loaderVisible:true,bootstrapReady:false,playlistOwner:true},"the pre-ready menu must remain covered while the R110 playlist owner is already core-loaded");
  await start.dispatchEvent("click");
  const captured=await page.evaluate(()=>({pending:window.CCGLostSizzlerV142Bootstrap?.pendingStartId||"",note:document.getElementById("menu-note")?.textContent||""}));
  assert.equal(captured.pending,"solo-btn","a pre-ready Start Game request reaching the bootstrap boundary must be captured before startup is released");
  releaseHeldModule();

  await page.waitForFunction(()=>window.CCGLostSizzlerV142Bootstrap?.ready===true&&window.CCGLostSizzlerReleaseGate?.state?.ready===true);
  await page.waitForTimeout(120);

  const held=await page.evaluate(()=>({
    runActive:document.body.dataset.runActive,
    busy:document.getElementById("solo-btn")?.getAttribute("aria-busy")||"",
    note:document.getElementById("menu-note")?.textContent||""
  }));
  assert.notEqual(held.runActive,"true","an early Start Game click must not auto-launch after browser activation has expired");
  assert.equal(held.busy,"","the early Start Game button must be released once V10.42 is ready");
  assert.match(held.note,/click Start Game again/i,"the player must be told to make the fresh trusted click required for fullscreen and music");
  assert.equal(musicRequests,0,"no soundtrack request may start from the expired pre-ready click");

  await start.click({force:true});
  await page.waitForFunction(()=>document.body.dataset.runActive==="true");
  await page.waitForFunction(()=>{
    const snapshot=window.CCGLostSizzlerPlaylistAudio?.getState?.();
    const slot=snapshot?.slots?.[snapshot.state];
    return Boolean(snapshot?.started&&snapshot?.customSoundtrackOwned===true&&snapshot?.url?.includes("/music/")&&slot?.active===true&&slot?.paused===false);
  });

  const playing=await page.evaluate(()=>window.CCGLostSizzlerPlaylistAudio.getState());
  assert.ok(musicRequests>=1,"the fresh trusted Start Game click must request an uploaded/authored soundtrack file");
  assert.ok(playing.slots[playing.state].readyState>=1,"the trusted launch gesture must prepare the selected authored media before/while playback begins");
  assert.equal(playing.fallbackActive,false,"trusted launch must not fall back to generated music");
  assert.equal(playing.adminAudioReady,true,"trusted launch must use the hydrated production soundtrack catalogue");
  assert.equal(playing.pendingGestureState,"","successful trusted launch must not leave music waiting for another gesture");
  assert.ok(playing.slots[playing.state].volume>=.1,"live authored music must remain at an audible non-zero level");
  assert.equal(playing.slots[playing.state].muted,false,"live authored music must not be muted");
  assert.deepEqual(pageErrors,[],`trusted launch must not raise page errors: ${pageErrors.join("\n")}`);

  await context.close();
  console.log("R106 trusted Start Game music launch passed: deferred click released, fresh click starts authored audio.");
}finally{
  try{releaseHeldModule?.()}catch(_){}
  await browser.close();
  for(const socket of sockets)socket.destroy();
  await new Promise(resolve=>server.close(()=>resolve()));
}
