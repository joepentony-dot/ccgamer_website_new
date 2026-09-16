import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {chromium} from "playwright";

const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,"../../../..");
const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".mjs":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json; charset=utf-8",".svg":"image/svg+xml",".webp":"image/webp",".png":"image/png",".jpg":"image/jpeg",".jpeg":"image/jpeg",".ogg":"audio/ogg",".mp3":"audio/mpeg",".wav":"audio/wav"};
const sockets=new Set();
const server=http.createServer((req,res)=>{
  try{
    const pathname=decodeURIComponent(new URL(req.url,"http://local").pathname),relative=pathname.endsWith("/")?`${pathname}index.html`:pathname,file=path.resolve(repo,`.${relative}`);
    if(!file.startsWith(`${repo}${path.sep}`)&&file!==repo){res.writeHead(403).end("forbidden");return}
    fs.readFile(file,(error,data)=>{if(error){res.writeHead(404).end("not found");return}res.setHeader("content-type",mime[path.extname(file).toLowerCase()]||"application/octet-stream");res.setHeader("cache-control","no-store");res.setHeader("connection","close");res.end(data)})
  }catch(error){res.writeHead(500).end(String(error))}
});
server.on("connection",socket=>{sockets.add(socket);socket.on("close",()=>sockets.delete(socket))});
await new Promise((resolve,reject)=>{server.once("error",reject);server.listen(0,"127.0.0.1",resolve)});
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,args:["--disable-dev-shm-usage","--disable-background-networking","--autoplay-policy=no-user-gesture-required"]});

try{
  const context=await browser.newContext({viewport:{width:1600,height:900}}),page=await context.newPage();
  page.setDefaultTimeout(25000);
  const errors=[];page.on("pageerror",error=>errors.push(String(error?.stack||error)));
  await page.goto(`${origin}/arcade/lost-sizzler/`,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.body.dataset.releaseReady==="true");
  await page.waitForFunction(()=>Boolean(window.CCGLostSizzlerV141R29?.state?.loopInstalled));

  const ownership=await page.evaluate(()=>{
    const api=window.CCGLostSizzlerV141R29,state=api?.state||{};
    const player={x:6,y:6,rx:6,ry:6,dir:{x:0,y:1}},enemy={x:7,y:6};
    const contactResult=api.contactBlock(player,enemy,6,6);
    return{
      installHealthy:Boolean(api.install()),
      active:{
        loop:Boolean(state.loopInstalled),quit:Boolean(state.quitInstalled),contact:Boolean(state.contactInstalled),pickup:Boolean(state.pickupInstalled),enter:Boolean(state.enterInstalled)
      },
      markers:{loop:Boolean(window.loop?.__ccgV141R29Stable)},
      exports:Object.keys(api).sort(),
      stateKeys:Object.keys(state).sort(),
      contact:{result:contactResult,x:player.x,y:player.y,rx:player.rx,ry:player.ry,dir:player.dir},
      titles:{health:api.normaliseItemTitle({kind:"health",title:"Hidden cache"}),ammo:api.normaliseItemTitle({kind:"ammo",title:""}),custom:api.normaliseItemTitle({kind:"torch",title:"ARCHIVE TORCH"})},
      retiredButtons:{horde:Boolean(document.getElementById("horde-mode-btn")),spy:Boolean(document.getElementById("saboteurs-mode-btn"))},
      specialMode:String(document.body.dataset.specialMode||"")
    };
  });

  assert.equal(ownership.installHealthy,true,"r29 cooperative install must report healthy using active owners only");
  assert.deepEqual(ownership.active,{loop:true,quit:true,contact:true,pickup:true,enter:true},"all retained r29 active owners must be installed");
  assert.equal(ownership.markers.loop,true,"r29 stable loop marker must remain live");
  for(const retiredExport of ["spyMove","spyStep","primeSpyDoor","hordeRemaining","updateRemainingHud","SPY_HINT_COOLDOWN_MS"]){
    assert.equal(ownership.exports.includes(retiredExport),false,`r29 must no longer export retired ownership: ${retiredExport}`);
  }
  for(const retiredState of ["damageInstalled","packetInstalled","toastInstalled","spyMoveInstalled","hordeFriendlyFireBlocked","hordeEnemyHitsRerouted","spyMoves","spyBlockedMoves","spyHintsSuppressed","lastRemaining"]){
    assert.equal(ownership.stateKeys.includes(retiredState),false,`r29 state must no longer own retired Horde/Spy field: ${retiredState}`);
  }
  assert.deepEqual(ownership.contact,{result:false,x:6,y:6,rx:6,ry:6,dir:{x:1,y:0}},"retained contact combat must block enemy-tile occupation without adding damage");
  assert.deepEqual(ownership.titles,{health:"HEALTH PACK",ammo:"AMMO PACK",custom:"ARCHIVE TORCH"},"retained generic item naming must preserve explicit useful titles and repair misleading/empty labels");
  assert.deepEqual(ownership.retiredButtons,{horde:false,spy:false},"retired Horde and Spy launch controls must remain absent");
  assert.equal(ownership.specialMode,"","active runtime must not enter a retired special mode");
  assert.deepEqual(errors,[],`r29 active-runtime extraction must not raise page errors: ${errors.join("\n")}`);

  console.log("C64 Dungeon Carnage r29 active-only runtime ownership passed in Chromium.");
  await context.close();
}finally{
  await browser.close();for(const socket of sockets)socket.destroy();await new Promise(resolve=>server.close(()=>resolve()));
}