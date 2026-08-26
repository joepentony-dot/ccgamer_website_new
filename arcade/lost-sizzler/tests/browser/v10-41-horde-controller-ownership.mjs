import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {chromium} from "playwright";

const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,"../../../..");
const read=relative=>fs.readFileSync(path.join(repo,relative),"utf8");
const v139=read("arcade/lost-sizzler/js/v10-39-horde-live-loadout.js");
const v140=read("arcade/lost-sizzler/js/v10-40-horde-final.js");
assert.ok(!/window\.update\s*=/.test(v139),"V10.39 must not globally replace the shared update loop");
assert.ok(!/window\.update\s*=/.test(v140),"V10.40 must not globally replace the shared update loop");
assert.match(v139,/controller-owned/i,"V10.39 must declare controller ownership");
assert.match(v140,/controller-owned/i,"V10.40 must declare controller ownership");

const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".mjs":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json; charset=utf-8",".svg":"image/svg+xml",".webp":"image/webp",".png":"image/png",".ogg":"audio/ogg",".mp3":"audio/mpeg"};
const sockets=new Set();
const server=http.createServer((req,res)=>{
  try{
    const pathname=decodeURIComponent(new URL(req.url,"http://local").pathname);
    const relative=pathname.endsWith("/")?`${pathname}index.html`:pathname;
    const file=path.resolve(repo,`.${relative}`);
    if(!file.startsWith(`${repo}${path.sep}`)&&file!==repo){res.writeHead(403).end("forbidden");return}
    fs.readFile(file,(error,data)=>{if(error){res.writeHead(404,{connection:"close"}).end("not found");return}res.writeHead(200,{"content-type":mime[path.extname(file).toLowerCase()]||"application/octet-stream","cache-control":"no-store",connection:"close"});res.end(data)});
  }catch(error){res.writeHead(500,{connection:"close"}).end(String(error))}
});
server.on("connection",socket=>{sockets.add(socket);socket.on("close",()=>sockets.delete(socket))});
await new Promise((resolve,reject)=>{server.once("error",reject);server.listen(0,"127.0.0.1",resolve)});
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,args:["--disable-dev-shm-usage","--disable-background-networking"]});

try{
  const context=await browser.newContext({viewport:{width:1600,height:900}});
  const page=await context.newPage();
  page.setDefaultTimeout(30000);
  const pageErrors=[];page.on("pageerror",error=>pageErrors.push(String(error?.stack||error)));
  await page.goto(`${origin}/arcade/lost-sizzler/`,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.body.dataset.releaseReady==="true"&&Boolean(window.CCGLostSizzlerModeRuntime)&&Boolean(window.CCGLostSizzlerV139)&&Boolean(window.CCGLostSizzlerV140));

  const result=await page.evaluate(async()=>{
    const api=window.CCGLostSizzlerModeRuntime,special=window.CCGLostSizzlerSpecialModes;
    const descriptor=Object.getOwnPropertyDescriptor(special,"active"),previousPlay=playMode,previousSpecial=document.body.dataset.specialMode,previousSolo=document.body.dataset.hordeSolo;
    const restore=()=>{
      playMode=previousPlay;
      if(previousSpecial===undefined)delete document.body.dataset.specialMode;else document.body.dataset.specialMode=previousSpecial;
      if(previousSolo===undefined)delete document.body.dataset.hordeSolo;else document.body.dataset.hordeSolo=previousSolo;
      if(descriptor)Object.defineProperty(special,"active",descriptor);else delete special.active;
      api.sync("controller ownership restore");
    };
    try{
      Object.defineProperty(special,"active",{configurable:true,value:null});
      playMode="solo";delete document.body.dataset.specialMode;delete document.body.dataset.hordeSolo;api.sync("controller ownership dungeon solo");
      const soloBefore=api.snapshot();
      api.frame();api.frame();
      const soloAfter=api.snapshot();

      const hordeState={wave:3,state:"wave",playerCount:1,activeEnemies:[],spawned:0,players:[]};
      document.body.dataset.specialMode="horde-survivor";document.body.dataset.hordeSolo="true";
      Object.defineProperty(special,"active",{configurable:true,value:{type:"horde-survivor",authoritative:false,state:hordeState}});
      const hordeSoloId=api.sync("controller ownership horde solo").id;
      const hordeSoloBefore=api.snapshot();api.frame();const hordeSoloAfter=api.snapshot();

      document.body.dataset.hordeSolo="false";
      const hordeOnlineId=api.sync("controller ownership horde online").id;
      const hordeOnlineBefore=api.snapshot();api.frame();const hordeOnlineAfter=api.snapshot();

      return{soloBefore,soloAfter,hordeSoloId,hordeSoloBefore,hordeSoloAfter,hordeOnlineId,hordeOnlineBefore,hordeOnlineAfter};
    }finally{restore()}
  });

  assert.equal(result.soloAfter.activeId,"dungeon-solo","baseline ownership check must remain Dungeon Solo");
  assert.equal(result.soloAfter.hordeLoadoutMaintenances,result.soloBefore.hordeLoadoutMaintenances,"Dungeon Solo must not run Horde loadout maintenance");
  assert.equal(result.soloAfter.hordeReserveMaintenances,result.soloBefore.hordeReserveMaintenances,"Dungeon Solo must not run Horde reserve maintenance");
  assert.equal(result.hordeSoloId,"horde-solo","Horde Survivor Solo must route through horde-solo");
  assert.ok(result.hordeSoloAfter.hordeLoadoutMaintenances>result.hordeSoloBefore.hordeLoadoutMaintenances,"Horde Solo controller must own V10.39 loadout maintenance");
  assert.ok(result.hordeSoloAfter.hordeReserveMaintenances>result.hordeSoloBefore.hordeReserveMaintenances,"Horde Solo controller must own V10.40 reserve maintenance");
  assert.equal(result.hordeOnlineId,"horde-online","Horde Multiplayer must route through horde-online");
  assert.ok(result.hordeOnlineAfter.hordeLoadoutMaintenances>result.hordeOnlineBefore.hordeLoadoutMaintenances,"Horde Online controller must own V10.39 loadout maintenance");
  assert.ok(result.hordeOnlineAfter.hordeReserveMaintenances>result.hordeOnlineBefore.hordeReserveMaintenances,"Horde Online controller must own V10.40 reserve maintenance");
  assert.deepEqual(pageErrors,[],`controller ownership regression must have no uncaught browser errors: ${pageErrors.join("\n")}`);
  console.log("Lost Sizzler V10.39/V10.40 Horde maintenance ownership is isolated to horde-solo and horde-online in Chromium.");
  await context.close();
}finally{
  await browser.close();for(const socket of sockets)socket.destroy();await new Promise(resolve=>server.close(()=>resolve()));
}
