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
  ".ogg":"audio/ogg",
  ".m4a":"audio/mp4"
};

const sockets=new Set();
const server=http.createServer((req,res)=>{
  try{
    const pathname=decodeURIComponent(new URL(req.url,"http://local").pathname);
    const relative=pathname.endsWith("/")?`${pathname}index.html`:pathname;
    const file=path.resolve(repo,`.${relative}`);
    if(!file.startsWith(`${repo}${path.sep}`)&&file!==repo){res.writeHead(403).end("forbidden");return;}
    fs.readFile(file,(error,data)=>{
      if(error){res.writeHead(404).end("not found");return;}
      res.setHeader("content-type",mime[path.extname(file).toLowerCase()]||"application/octet-stream");
      res.setHeader("cache-control","no-store");
      res.setHeader("connection","close");
      res.end(data);
    });
  }catch(error){res.writeHead(500).end(String(error));}
});
server.on("connection",socket=>{sockets.add(socket);socket.on("close",()=>sockets.delete(socket));});

await new Promise((resolve,reject)=>{server.once("error",reject);server.listen(0,"127.0.0.1",resolve);});
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,args:["--disable-dev-shm-usage","--disable-background-networking","--autoplay-policy=no-user-gesture-required"]});

async function runViewport(viewport){
  const context=await browser.newContext({viewport,isMobile:true,hasTouch:true,deviceScaleFactor:2});
  const page=await context.newPage();
  page.setDefaultTimeout(20000);
  const errors=[];
  page.on("pageerror",error=>errors.push(String(error?.stack||error)));

  await page.goto(`${origin}/arcade/lost-sizzler/`,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.body.dataset.gameReady==="true");
  await page.waitForFunction(()=>Boolean(window.CCGLostSizzlerV142R19MobileTrapLayoutStability));
  await page.locator("#solo-btn").click({noWaitAfter:true});
  await page.waitForFunction(()=>document.body.dataset.runActive==="true");
  await page.waitForTimeout(700);

  const layout=await page.evaluate(()=>{
    const box=selector=>{
      const r=document.querySelector(selector)?.getBoundingClientRect();
      return r?{left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height}:null;
    };
    const canvas=document.getElementById("game");
    const wrap=document.querySelector(".canvas-wrap");
    const movement=[...document.querySelectorAll("#v104-touch-controls .v104-touch-pad .v104-touch-btn")].map(button=>{
      const r=button.getBoundingClientRect();
      return{key:button.dataset.key,width:r.width,height:r.height};
    });
    const canvasRect=wrap?.getBoundingClientRect();
    return{
      viewport:{width:innerWidth,height:innerHeight},
      bodyScrollWidth:document.documentElement.scrollWidth,
      shell:box(".ccg-game"),
      mission:box(".ccg-game>.mission"),
      gameArea:box(".ccg-game>.game-area"),
      canvasWrap:box(".ccg-game>.game-area>.canvas-wrap"),
      playerHub:box(".ccg-game>.player-hub"),
      touch:box("#v104-touch-controls"),
      movement,
      cssAspect:canvasRect?canvasRect.width/Math.max(1,canvasRect.height):0,
      backingAspect:canvas?canvas.width/Math.max(1,canvas.height):0,
      backing:{width:canvas?.width||0,height:canvas?.height||0},
      repairs:window.CCGLostSizzlerV142R19MobileTrapLayoutStability?.state?.canvasAspectRepairs||0
    };
  });

  assert.deepEqual(errors,[],`portrait launch must have no uncaught browser errors: ${errors.join("\n")}`);
  for(const key of ["shell","mission","gameArea","canvasWrap","playerHub","touch"])assert.ok(layout[key],`${key} must exist at ${viewport.width}x${viewport.height}`);
  assert.ok(layout.bodyScrollWidth<=layout.viewport.width+2,`portrait layout must not create horizontal page overflow: ${JSON.stringify(layout)}`);
  assert.ok(layout.shell.width<=layout.viewport.width+2,`game shell must fit the portrait viewport: ${JSON.stringify(layout)}`);
  assert.ok(layout.mission.height<=30,`portrait mission strip should remain compact: ${JSON.stringify(layout)}`);
  assert.ok(layout.playerHub.height<=58,`portrait player HUD should remain compact: ${JSON.stringify(layout)}`);
  assert.ok(layout.gameArea.height>layout.mission.height+layout.playerHub.height,`gameplay area must retain the majority of active vertical space: ${JSON.stringify(layout)}`);
  assert.ok(layout.canvasWrap.width>0&&layout.canvasWrap.height>0,`portrait canvas must have usable geometry: ${JSON.stringify(layout)}`);
  assert.ok(Math.abs(layout.cssAspect-layout.backingAspect)<=0.01,`canvas backing aspect must match displayed portrait aspect: ${JSON.stringify(layout)}`);
  assert.ok(layout.backing.width>=640&&layout.backing.height>=360,`portrait backing store must retain canonical minimum dimensions: ${JSON.stringify(layout)}`);
  assert.ok(layout.repairs>=1,`portrait runtime should repair the initial landscape backing store when required: ${JSON.stringify(layout)}`);
  assert.equal(layout.movement.length,4,"mobile movement pad must expose four directional buttons");
  for(const button of layout.movement){
    assert.ok(button.width>=43.5&&button.height>=43.5,`mobile movement target ${button.key} must remain at least 44px: ${JSON.stringify(button)}`);
  }

  const trapResult=await page.evaluate(()=>{
    const player=globalThis.eval("p1");
    if(!player||typeof window.hurtPlayer!=="function")return{available:false};
    const healthBefore=Number(player.health||0);
    const armorBefore=Number(player.armor||0);
    const xpBefore=Number(player.xp||0);
    const totalXpBefore=Number(player.totalXp||0);
    player.health=Math.max(2,healthBefore||8);
    player.armor=Math.max(2,armorBefore||6);
    player.invuln=0;
    const forcedHealthBefore=player.health;
    const forcedArmorBefore=player.armor;
    window.hurtPlayer(player,1,false,"spike trap");
    const first={health:player.health,armor:player.armor,invuln:player.invuln,xp:player.xp,totalXp:player.totalXp};
    window.hurtPlayer(player,1,false,"spike trap");
    const second={health:player.health,armor:player.armor,invuln:player.invuln,xp:player.xp,totalXp:player.totalXp};
    return{
      available:true,
      before:{health:forcedHealthBefore,armor:forcedArmorBefore,xp:xpBefore,totalXp:totalXpBefore},
      first,
      second,
      trapHits:window.CCGLostSizzlerV142R19MobileTrapLayoutStability?.state?.trapHits||0
    };
  });

  assert.equal(trapResult.available,true,"live mobile runtime must expose the canonical player damage path");
  assert.equal(trapResult.first.health,trapResult.before.health-1,"live floor-trap damage must remove one actual health");
  assert.equal(trapResult.first.armor,trapResult.before.armor,"live floor-trap damage must preserve armour");
  assert.equal(trapResult.first.xp,trapResult.before.xp,"live floor-trap damage must not award XP");
  assert.equal(trapResult.first.totalXp,trapResult.before.totalXp,"live floor-trap damage must not alter total XP");
  assert.ok(trapResult.first.invuln>0,"live floor-trap damage must preserve canonical post-hit invulnerability");
  assert.equal(trapResult.second.health,trapResult.first.health,"immediate duplicate floor-trap damage must be suppressed");
  assert.equal(trapResult.second.armor,trapResult.first.armor,"duplicate floor-trap suppression must not consume armour");
  assert.ok(trapResult.trapHits>=1,"r19 live owner must record the successful trap-health hit");

  console.log(`C64 Dungeon Carnage mobile live contract passed at ${viewport.width}x${viewport.height}.`);
  await context.close();
}

try{
  await runViewport({width:360,height:800});
  await runViewport({width:390,height:844});
}finally{
  await browser.close();
  for(const socket of sockets)socket.destroy();
  await new Promise(resolve=>server.close(()=>resolve()));
}
