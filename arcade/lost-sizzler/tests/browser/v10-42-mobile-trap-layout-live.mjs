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

async function touchButton(page,context,selector){
  const locator=page.locator(selector);
  const box=await locator.boundingBox();
  assert.ok(box&&box.width>0&&box.height>0,`touch target ${selector} must have rendered geometry`);
  const x=box.x+box.width/2,y=box.y+box.height/2;
  const cdp=await context.newCDPSession(page);
  try{
    await cdp.send("Input.dispatchTouchEvent",{type:"touchStart",touchPoints:[{x,y,radiusX:1,radiusY:1,force:1,id:1}]});
    await page.waitForTimeout(55);
    await cdp.send("Input.dispatchTouchEvent",{type:"touchEnd",touchPoints:[]});
  }finally{
    await cdp.detach();
  }
  await page.waitForTimeout(80);
}

async function acceptMobilePlayNotice(page){
  const notice=page.locator("#ccg-mobile-pc-notice");
  if(!(await notice.isVisible()))return false;
  const accept=page.locator("#ccg-mobile-pc-accept");
  assert.equal(await accept.isVisible(),true,"mobile play notice must expose its production ACCEPT action");
  await accept.click({noWaitAfter:true});
  await page.waitForFunction(()=>document.getElementById("ccg-mobile-pc-notice")?.classList.contains("hidden")===true||getComputedStyle(document.getElementById("ccg-mobile-pc-notice")).display==="none");
  return true;
}

async function prepareTouchTrapFixture(page){
  return page.evaluate(()=>globalThis.eval(`(()=>{
    if(!p1||!world||!host||!W)return{available:false,reason:"runtime unavailable"};
    host.enemies=[];
    host.items=[];
    host.doors=[];
    host.chests=[];
    host.switches=[];
    host.shrines=[];
    host.arenas=[];
    host.timedRooms=[];
    host.generators=[];
    host.trader=null;
    host.startShop=null;
    host.rescue=null;
    host.boulderTrap=null;
    host.spiderNest=null;
    host.memoryPuzzle=null;
    host.sequenceTorchPuzzle=null;
    host.weightBridge=null;
    host.sigilRoomId=null;
    host.sigilLockdown=false;
    host.sigilResolved=true;
    host.stalker=null;
    const dirs=[
      {dx:1,dy:0,key:"KeyD"},
      {dx:-1,dy:0,key:"KeyA"},
      {dx:0,dy:1,key:"KeyS"},
      {dx:0,dy:-1,key:"KeyW"}
    ];
    let route=null;
    for(let y=2;y<world.map.length-2&&!route;y++){
      for(let x=2;x<world.map[y].length-2&&!route;x++){
        if(world.map[y]?.[x]!==0||!W.walkable(world.map,x,y,host))continue;
        for(const dir of dirs){
          const tx=x+dir.dx,ty=y+dir.dy;
          if(world.map[ty]?.[tx]!==0||!W.walkable(world.map,tx,ty,host))continue;
          if((tx===world.exit?.x&&ty===world.exit?.y)||(x===world.exit?.x&&y===world.exit?.y))continue;
          route={x,y,targetX:tx,targetY:ty,...dir};
          break;
        }
      }
    }
    if(!route)return{available:false,reason:"no cardinal walkable route"};
    const now=performance.now(),period=1000000;
    host.traps=[{
      id:"mobile-live-trap",
      x:route.targetX,
      y:route.targetY,
      roomId:W.roomAt(world,route.targetX,route.targetY),
      kind:"spike",
      phase:(period-(now%period))%period,
      period,
      active:true
    }];
    p1.x=route.x;p1.y=route.y;p1.rx=route.x;p1.ry=route.y;
    p1.health=Math.max(3,Number(p1.health)||8);
    p1.maxHealth=Math.max(Number(p1.maxHealth)||8,p1.health);
    p1.armor=Math.max(2,Number(p1.armor)||6);
    p1.invuln=0;p1.hitStunMs=0;
    move1=0;input.clear();
    window.CCGLostSizzlerV142R19MobileTrapLayoutStability?.rearmInactiveTrapContacts?.();
    return{
      available:true,
      key:route.key,
      origin:{x:route.x,y:route.y},
      target:{x:route.targetX,y:route.targetY},
      before:{health:p1.health,armor:p1.armor,xp:Number(p1.xp||0),totalXp:Number(p1.totalXp||0)},
      trapHits:Number(window.CCGLostSizzlerV142R19MobileTrapLayoutStability?.state?.trapHits||0)
    };
  })()`));
}

async function readPlayerTrapState(page){
  return page.evaluate(()=>globalThis.eval(`(()=>({
    x:p1?.x,y:p1?.y,
    health:Number(p1?.health||0),
    armor:Number(p1?.armor||0),
    invuln:Number(p1?.invuln||0),
    hitStunMs:Number(p1?.hitStunMs||0),
    xp:Number(p1?.xp||0),
    totalXp:Number(p1?.totalXp||0),
    trapHits:Number(window.CCGLostSizzlerV142R19MobileTrapLayoutStability?.state?.trapHits||0)
  }))()`));
}

async function resetForInvulnerableTrapReentry(page,fixture){
  await page.evaluate(({origin})=>globalThis.eval(`(()=>{
    p1.x=${Number(origin.x)};p1.y=${Number(origin.y)};
    p1.rx=${Number(origin.x)};p1.ry=${Number(origin.y)};
    p1.hitStunMs=0;move1=0;input.clear();
    window.CCGLostSizzlerV142R19MobileTrapLayoutStability?.rearmInactiveTrapContacts?.();
  })()`),{origin:fixture.origin});
}

async function runViewport(viewport){
  const context=await browser.newContext({viewport,isMobile:true,hasTouch:true,deviceScaleFactor:2});
  const page=await context.newPage();
  page.setDefaultTimeout(20000);
  const errors=[];
  page.on("pageerror",error=>errors.push(String(error?.stack||error)));

  await page.goto(`${origin}/arcade/lost-sizzler/`,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.body.dataset.gameReady==="true");
  await page.waitForFunction(()=>Boolean(window.CCGLostSizzlerV142R19MobileTrapLayoutStability));
  // V10.4 owns the touch UI from its window-load init. Qualify that real
  // production owner before starting Solo instead of waiting for controls that
  // cannot exist yet while the document is only at DOMContentLoaded.
  await page.waitForLoadState("load");
  await page.waitForFunction(()=>document.body.classList.contains("v104-touch-device")&&Boolean(document.getElementById("v104-touch-controls")));
  await page.locator("#solo-btn").click({noWaitAfter:true});
  await page.waitForFunction(()=>document.body.dataset.runActive==="true");
  await page.waitForFunction(()=>document.getElementById("menu")?.classList.contains("hidden")===true);
  // Mobile production presents a real play notice before it exposes the touch
  // controls. Exercise the same ACCEPT action a phone user must press; do not
  // bypass the overlay by mutating classes or forcing the dock visible.
  await acceptMobilePlayNotice(page);
  // The acceptance assertions below already require the real dock and every
  // directional target to have usable geometry. Give the production 220ms
  // V10.4 UI refresh one bounded cycle, then report the measured layout rather
  // than hiding a geometry failure behind a generic wait timeout.
  await page.waitForTimeout(320);

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
      hiddenRows:{
        topbar:getComputedStyle(document.querySelector(".ccg-game>.v102-topbar")).display,
        critical:getComputedStyle(document.querySelector(".ccg-game>.critical-strip")).display,
        fullscreenHint:getComputedStyle(document.querySelector(".ccg-game>.fullscreen-hint")).display,
        tactical:getComputedStyle(document.querySelector(".ccg-game>.tactical-zone")).display
      },
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
  assert.ok(layout.shell.height<=layout.viewport.height+2,`game shell must fit the portrait viewport height: ${JSON.stringify(layout)}`);
  assert.ok(layout.mission.height<=30,`portrait mission strip should remain compact: ${JSON.stringify(layout)}`);
  assert.ok(layout.playerHub.height<=78,`portrait player HUD should remain compact: ${JSON.stringify(layout)}`);
  assert.ok(layout.gameArea.height>layout.viewport.height*.55,`dungeon playfield must own most active portrait height: ${JSON.stringify(layout)}`);
  assert.ok(layout.gameArea.height>layout.mission.height+layout.playerHub.height,`gameplay area must retain the majority of active vertical space: ${JSON.stringify(layout)}`);
  assert.ok(layout.canvasWrap.width>0&&layout.canvasWrap.height>0,`portrait canvas must have usable geometry: ${JSON.stringify(layout)}`);
  assert.ok(layout.touch.width>0&&layout.touch.height>0,`touch dock must have rendered portrait geometry: ${JSON.stringify(layout)}`);
  assert.ok(Math.abs(layout.cssAspect-layout.backingAspect)<=0.01,`canvas backing aspect must match displayed portrait aspect: ${JSON.stringify(layout)}`);
  assert.ok(layout.backing.width>=640&&layout.backing.height>=360,`portrait backing store must retain canonical minimum dimensions: ${JSON.stringify(layout)}`);
  assert.ok(layout.repairs>=1,`portrait runtime should repair the initial landscape backing store when required: ${JSON.stringify(layout)}`);
  assert.deepEqual(layout.hiddenRows,{topbar:"none",critical:"none",fullscreenHint:"none",tactical:"none"},`desktop information rows must not consume active portrait gameplay height: ${JSON.stringify(layout.hiddenRows)}`);
  assert.equal(layout.movement.length,4,"mobile movement pad must expose four directional buttons");
  for(const button of layout.movement){
    assert.ok(button.width>=43.5&&button.height>=43.5,`mobile movement target ${button.key} must remain at least 44px: ${JSON.stringify({button,layout})}`);
  }

  const fixture=await prepareTouchTrapFixture(page);
  assert.equal(fixture.available,true,`live mobile runtime must provide a deterministic walkable trap route: ${JSON.stringify(fixture)}`);
  await touchButton(page,context,`#v104-touch-controls .v104-touch-pad [data-key="${fixture.key}"]`);
  const first=await readPlayerTrapState(page);
  assert.deepEqual({x:first.x,y:first.y},fixture.target,"real touch movement must step the player onto the active trap tile");
  assert.equal(first.health,fixture.before.health-1,"active floor trap reached by touch movement must remove one actual health");
  assert.equal(first.armor,fixture.before.armor,"touch-triggered floor trap damage must preserve armour");
  assert.equal(first.xp,fixture.before.xp,"touch-triggered floor trap damage must not award XP");
  assert.equal(first.totalXp,fixture.before.totalXp,"touch-triggered floor trap damage must not alter total XP");
  assert.ok(first.invuln>0,"touch-triggered trap damage must preserve canonical post-hit invulnerability");
  assert.equal(first.trapHits,fixture.trapHits+1,"one touch trap entry must create exactly one successful health hit");

  await resetForInvulnerableTrapReentry(page,fixture);
  const beforeSecond=await readPlayerTrapState(page);
  assert.ok(beforeSecond.invuln>0,"second trap entry must retain first-hit invulnerability");
  await touchButton(page,context,`#v104-touch-controls .v104-touch-pad [data-key="${fixture.key}"]`);
  const second=await readPlayerTrapState(page);
  assert.deepEqual({x:second.x,y:second.y},fixture.target,"second real touch movement must re-enter the active trap tile");
  assert.equal(second.health,first.health,"invulnerability must suppress an immediate duplicate trap health hit");
  assert.equal(second.armor,first.armor,"duplicate touch trap contact must not consume armour");
  assert.equal(second.xp,first.xp,"duplicate touch trap contact must not award XP");
  assert.equal(second.totalXp,first.totalXp,"duplicate touch trap contact must not alter total XP");
  assert.equal(second.trapHits,first.trapHits,"suppressed duplicate trap contact must not be recorded as another health hit");

  assert.deepEqual(errors,[],`mobile trap exercise must have no uncaught browser errors: ${errors.join("\n")}`);
  console.log(`C64 Dungeon Carnage mobile live contract passed at ${viewport.width}x${viewport.height}.`);
  await context.close();
}

async function runLandscapeGuard(){
  const viewport={width:1024,height:768};
  const context=await browser.newContext({viewport,isMobile:false,hasTouch:false,deviceScaleFactor:1});
  const page=await context.newPage();
  page.setDefaultTimeout(20000);
  await page.goto(`${origin}/arcade/lost-sizzler/`,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.body.dataset.gameReady==="true");
  await page.waitForFunction(()=>Boolean(window.CCGLostSizzlerV142R19MobileTrapLayoutStability));
  await page.locator("#solo-btn").click({noWaitAfter:true});
  await page.waitForFunction(()=>document.body.dataset.runActive==="true");
  await page.waitForFunction(()=>document.getElementById("menu")?.classList.contains("hidden")===true);
  const state=await page.evaluate(()=>({
    topbar:getComputedStyle(document.querySelector(".ccg-game>.v102-topbar")).display,
    gameArea:document.querySelector(".ccg-game>.game-area")?.getBoundingClientRect().height||0,
    playerHub:document.querySelector(".ccg-game>.player-hub")?.getBoundingClientRect().height||0,
    touch:Boolean(document.getElementById("v104-touch-controls"))
  }));
  assert.notEqual(state.topbar,"none","landscape desktop/tablet presentation must keep its existing topbar");
  assert.ok(state.gameArea>0,"landscape desktop/tablet dungeon area must remain usable");
  assert.ok(state.playerHub>0,"landscape desktop/tablet combat HUD must remain usable");
  assert.equal(state.touch,false,"non-touch landscape presentation must not gain mobile controls");
  await context.close();
}

try{
  await runViewport({width:320,height:568});
  await runViewport({width:360,height:800});
  await runViewport({width:390,height:844});
  await runLandscapeGuard();
}finally{
  await browser.close();
  for(const socket of sockets)socket.destroy();
  await new Promise(resolve=>server.close(()=>resolve()));
}
