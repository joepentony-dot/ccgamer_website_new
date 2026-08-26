import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {chromium} from "playwright";

const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,"../../../..");
const v139Source=fs.readFileSync(path.join(repo,"arcade/lost-sizzler/js/v10-39-horde-live-loadout.js"),"utf8");
const v140Source=fs.readFileSync(path.join(repo,"arcade/lost-sizzler/js/v10-40-horde-final.js"),"utf8");
assert.doesNotMatch(v139Source,/window\.update\s*=/,"V10.39 must not replace the shared update loop after controller migration");
assert.doesNotMatch(v140Source,/window\.update\s*=/,"V10.40 must not replace the shared update loop after controller migration");

const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".mjs":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json; charset=utf-8",".svg":"image/svg+xml",".webp":"image/webp",".png":"image/png",".ogg":"audio/ogg",".mp3":"audio/mpeg"};
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
  const context=await browser.newContext({viewport:{width:1600,height:900}});
  const page=await context.newPage();page.setDefaultTimeout(30000);
  const errors=[];page.on("pageerror",error=>errors.push(String(error?.stack||error)));
  await page.goto(`${origin}/arcade/lost-sizzler/`,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.body.dataset.releaseReady==="true"&&Boolean(window.CCGLostSizzlerModeRuntime)&&Boolean(window.CCGLostSizzlerV139?.state?.installed)&&Boolean(window.CCGLostSizzlerV140?.state?.installed));

  const ownership=await page.evaluate(()=>({
    v139:{controllerOwned:Boolean(window.CCGLostSizzlerV139?.state?.controllerOwned),wrapped:Boolean(window.CCGLostSizzlerV139?.state?.wrapped)},
    v140:{controllerOwned:Boolean(window.CCGLostSizzlerV140?.state?.controllerOwned),wrapped:Boolean(window.CCGLostSizzlerV140?.state?.updateWrapped)}
  }));
  assert.deepEqual(ownership.v139,{controllerOwned:true,wrapped:false},"V10.39 loadout maintenance must be controller-owned and not globally wrapped");
  assert.deepEqual(ownership.v140,{controllerOwned:true,wrapped:false},"V10.40 reserve maintenance must be controller-owned and not globally wrapped");

  const routed=await page.evaluate(()=>{
    const api=window.CCGLostSizzlerModeRuntime,special=window.CCGLostSizzlerSpecialModes;
    const descriptor=Object.getOwnPropertyDescriptor(special,"active"),previousPlay=playMode,previousSpecial=document.body.dataset.specialMode,previousSolo=document.body.dataset.hordeSolo;
    const result={};
    try{
      Object.defineProperty(special,"active",{configurable:true,value:null});
      delete document.body.dataset.specialMode;delete document.body.dataset.hordeSolo;playMode="solo";api.sync("controller maintenance dungeon control");
      const dungeonBefore=api.snapshot();api.frame();const dungeonAfter=api.snapshot();
      result.dungeon={activeId:dungeonAfter.activeId,loadoutDelta:dungeonAfter.hordeLoadoutMaintenances-dungeonBefore.hordeLoadoutMaintenances,reserveDelta:dungeonAfter.hordeReserveMaintenances-dungeonBefore.hordeReserveMaintenances};

      document.body.dataset.specialMode="horde-survivor";document.body.dataset.hordeSolo="true";
      Object.defineProperty(special,"active",{configurable:true,value:{type:"horde-survivor",authoritative:false,state:{wave:3,state:"wave",playerCount:1,players:[],spawned:0,activeEnemies:[]}}});
      api.sync("controller maintenance Horde Solo");const soloBefore=api.snapshot();api.frame();const soloAfter=api.snapshot();
      result.hordeSolo={activeId:soloAfter.activeId,loadoutDelta:soloAfter.hordeLoadoutMaintenances-soloBefore.hordeLoadoutMaintenances,reserveDelta:soloAfter.hordeReserveMaintenances-soloBefore.hordeReserveMaintenances};

      document.body.dataset.hordeSolo="false";api.sync("controller maintenance Horde Online");const onlineBefore=api.snapshot();api.frame();const onlineAfter=api.snapshot();
      result.hordeOnline={activeId:onlineAfter.activeId,loadoutDelta:onlineAfter.hordeLoadoutMaintenances-onlineBefore.hordeLoadoutMaintenances,reserveDelta:onlineAfter.hordeReserveMaintenances-onlineBefore.hordeReserveMaintenances};
    }finally{
      playMode=previousPlay;
      if(previousSpecial===undefined)delete document.body.dataset.specialMode;else document.body.dataset.specialMode=previousSpecial;
      if(previousSolo===undefined)delete document.body.dataset.hordeSolo;else document.body.dataset.hordeSolo=previousSolo;
      if(descriptor)Object.defineProperty(special,"active",descriptor);else delete special.active;
      api.sync("controller maintenance restore");
    }
    return result;
  });

  assert.deepEqual(routed.dungeon,{activeId:"dungeon-solo",loadoutDelta:0,reserveDelta:0},"Dungeon Solo must never execute Horde loadout or reserve maintenance");
  assert.equal(routed.hordeSolo.activeId,"horde-solo","Horde Solo must own its maintenance path");
  assert.ok(routed.hordeSolo.loadoutDelta>=1,"Horde Solo must execute controller-owned loadout maintenance");
  assert.ok(routed.hordeSolo.reserveDelta>=1,"Horde Solo must execute controller-owned reserve maintenance");
  assert.equal(routed.hordeOnline.activeId,"horde-online","Horde Multiplayer must own its maintenance path");
  assert.ok(routed.hordeOnline.loadoutDelta>=1,"Horde Multiplayer must execute controller-owned loadout maintenance");
  assert.ok(routed.hordeOnline.reserveDelta>=1,"Horde Multiplayer must execute controller-owned reserve maintenance");
  assert.deepEqual(errors,[],`controller-owned Horde maintenance regression must have no uncaught browser errors: ${errors.join("\n")}`);

  console.log("Lost Sizzler V10.39/V10.40 Horde controller-owned maintenance and Dungeon Solo update-isolation regression passed in Chromium.");
  await context.close();
}finally{
  await browser.close();for(const socket of sockets)socket.destroy();await new Promise(resolve=>server.close(()=>resolve()));
}
