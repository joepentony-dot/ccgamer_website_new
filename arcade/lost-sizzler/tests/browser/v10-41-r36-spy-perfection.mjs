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
const server=http.createServer((req,res)=>{
  try{
    const pathname=decodeURIComponent(new URL(req.url,"http://local").pathname),relative=pathname.endsWith("/")?`${pathname}index.html`:pathname,file=path.resolve(repo,`.${relative}`);
    if(!file.startsWith(`${repo}${path.sep}`)&&file!==repo){res.writeHead(403).end("forbidden");return}
    fs.readFile(file,(error,data)=>{if(error){res.writeHead(404,{connection:"close"}).end("not found");return}res.writeHead(200,{"content-type":mime[path.extname(file).toLowerCase()]||"application/octet-stream","cache-control":"no-store",connection:"close"});res.end(data)});
  }catch(error){res.writeHead(500,{connection:"close"}).end(String(error))}
});
server.on("connection",socket=>{sockets.add(socket);socket.on("close",()=>sockets.delete(socket))});
await new Promise((resolve,reject)=>{server.once("error",reject);server.listen(0,"127.0.0.1",resolve)});
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,args:["--disable-dev-shm-usage","--disable-background-networking","--autoplay-policy=no-user-gesture-required"]});

try{
  const context=await browser.newContext({viewport:{width:1900,height:1000}}),page=await context.newPage();page.setDefaultTimeout(45000);const errors=[];page.on("pageerror",error=>errors.push(String(error?.stack||error)));
  console.log("[r36 Spy] load canonical page");
  await page.goto(`${origin}/arcade/lost-sizzler/`,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.body.dataset.releaseReady==="true"&&Boolean(window.CCGLostSizzlerV141R32SpyLoader));

  console.log("[r36 Spy] start real Spy adapter fixture");
  const started=await page.evaluate(()=>{
    net.setSolo("Agent One");const id=String(net.sessionId);
    return window.CCGLostSizzlerSpecialModes.startOnline({roomMode:"sizzler-saboteurs",players:[{id,name:"Agent One"},{id:"R36-SPY-B",name:"Agent Two"}],hostId:id,seed:"V141-R36-PERFECTION",roomCode:"R36SPY"});
  });
  assert.equal(started,true,"r36 Spy fixture must start through the real special-mode adapter");
  await page.waitForFunction(()=>document.body.dataset.specialMode==="sizzler-saboteurs"&&Boolean(window.CCGLostSizzlerV141R32SpyLoader?.state?.perfectionLoaded)&&Boolean(window.CCGLostSizzlerV141R36SpyPerfection)&&document.body.dataset.spyR36Perfection==="true");

  console.log("[r36 Spy] inventory has an explicit exit and cannot strand play");
  await page.keyboard.press("Tab");await page.waitForTimeout(100);
  const inventory=await page.evaluate(()=>{
    const root=document.getElementById("spy-r32-inventory"),button=root?.querySelector(".spy-r36-return");
    return{open:Boolean(window.CCGLostSizzlerV141R32SpyOverhaul?.state?.inventoryOpen),button:Boolean(button),buttonText:String(button?.textContent||"").trim(),visible:button?getComputedStyle(button).display!=="none":false,mode:String(mode),sharedHidden:Boolean(UI.inventory?.classList?.contains("hidden"))};
  });
  assert.equal(inventory.open,true,"TAB must open Spy item inventory");
  assert.equal(inventory.button,true,"Spy inventory must expose an explicit Return to Game button");
  assert.equal(inventory.buttonText,"RETURN TO GAME","inventory exit must use an unambiguous label");
  assert.equal(inventory.visible,true,"Return to Game must be visible while inventory is open");
  assert.equal(inventory.mode,"playing","Spy inventory must not enter shared Dungeon inventory mode");
  assert.equal(inventory.sharedHidden,true,"shared Dungeon inventory must remain hidden");
  await page.locator(".spy-r36-return").click();await page.waitForTimeout(120);
  const closed=await page.evaluate(()=>({open:Boolean(window.CCGLostSizzlerV141R32SpyOverhaul.state.inventoryOpen),mode:String(mode),sharedHidden:UI.inventory.classList.contains("hidden")}));
  assert.equal(closed.open,false,"Return to Game must close Spy inventory");
  assert.equal(closed.mode,"playing","Return to Game must restore playing mode");
  assert.equal(closed.sharedHidden,true,"Return to Game must not expose shared inventory");

  console.log("[r36 Spy] player remains movable after closing item inventory");
  const moveFixture=await page.evaluate(()=>{
    const choices=[{code:"ArrowRight",dx:1,dy:0},{code:"ArrowLeft",dx:-1,dy:0},{code:"ArrowDown",dx:0,dy:1},{code:"ArrowUp",dx:0,dy:-1}];
    const open=choices.find(row=>world.map?.[Number(p1.y)+row.dy]?.[Number(p1.x)+row.dx]===0&&!(host.blockingDecor||[]).some(item=>Number(item.x)===Number(p1.x)+row.dx&&Number(item.y)===Number(p1.y)+row.dy));
    if(!open)throw new Error("no open Spy movement cell after closing inventory");return{x:Number(p1.x),y:Number(p1.y),code:open.code}
  });
  await page.keyboard.down(moveFixture.code);await page.waitForTimeout(520);await page.keyboard.up(moveFixture.code);await page.waitForTimeout(120);
  const moved=await page.evaluate(()=>({x:Number(p1.x),y:Number(p1.y)}));
  assert.ok(Math.abs(moved.x-moveFixture.x)+Math.abs(moved.y-moveFixture.y)>0,`Spy must move after inventory closes; ${JSON.stringify(moveFixture)} -> ${JSON.stringify(moved)}`);

  console.log("[r36 Spy] Space produces the actual melee swing animation state");
  const swingBefore=await page.evaluate(()=>Number(p1._meleeSwingAt||0));
  await page.keyboard.press("Space");await page.waitForTimeout(30);
  const swing=await page.evaluate(()=>({at:Number(p1._meleeSwingAt||0),ms:Number(p1._meleeSwingMs||0),dir:p1._meleeSwingDir||null,count:Number(window.CCGLostSizzlerV141R36SpyPerfection.state.swings||0)}));
  assert.ok(swing.at>swingBefore,"Spy Space attack must start the shared melee animation clock");
  assert.ok(swing.ms>=220,"Spy melee swing must remain visible long enough to animate");
  assert.ok(swing.dir&&(Math.abs(Number(swing.dir.x))+Math.abs(Number(swing.dir.y))>=1),"Spy melee animation must have a facing direction");
  assert.ok(swing.count>=1,"r36 must record the melee presentation event");

  console.log("[r36 Spy] ghost respawn restores both rules HP and physical HP to full");
  const respawn=await page.evaluate(()=>{
    const hard=window.CCGLostSizzlerV141R35SpyRulesHardening,r36=window.CCGLostSizzlerV141R36SpyPerfection,m=window.CCGLostSizzlerSpecialModes.active.state,model=m.players.find(row=>String(row.id)===String(p1.id))||m.players[0];
    model.status="ghost";model.hp=0;model.ghostUntil=Date.now()-10;model.respawnAt=Date.now()-10;p1.health=1;p1.maxHealth=model.maxHp;
    r36.syncPlayers();hard.respawnGhosts();r36.syncPlayers();
    return{status:model.status,modelHp:Number(model.hp),modelMax:Number(model.maxHp),liveHp:Number(p1.health),liveMax:Number(p1.maxHealth),respawnRepairs:Number(r36.state.respawnRepairs)}
  });
  assert.equal(respawn.status,"active","expired ghost must become active again");
  assert.equal(respawn.modelHp,respawn.modelMax,"Spy rules HP must return to full after respawn");
  assert.equal(respawn.liveHp,respawn.liveMax,"physical player HP must return to full after respawn");
  assert.ok(respawn.respawnRepairs>=1,"r36 must reconcile the physical respawn transition");

  console.log("[r36 Spy] stale shared mode/search state cannot freeze an active agent");
  const thaw=await page.evaluate(()=>{
    const r36=window.CCGLostSizzlerV141R36SpyPerfection,overhaul=window.CCGLostSizzlerV141R32SpyOverhaul;
    overhaul.state.inventoryOpen=false;overhaul.state.search={targetId:"stale",targetLabel:"STALE",startedAt:performance.now()-5000,completesAt:performance.now()-3000};mode="inventory";UI.inventory.classList.remove("hidden");
    r36.repairStaleControl();
    return{mode:String(mode),search:overhaul.state.search,sharedHidden:UI.inventory.classList.contains("hidden"),freezeRepairs:Number(r36.state.freezeRepairs),searchRepairs:Number(r36.state.searchRepairs)}
  });
  assert.equal(thaw.mode,"playing","active Spy must be returned from stale shared inventory mode");
  assert.equal(thaw.search,null,"stale completed search lock must be cleared");
  assert.equal(thaw.sharedHidden,true,"stale shared inventory must be hidden");
  assert.ok(thaw.freezeRepairs>=1&&thaw.searchRepairs>=1,"freeze watchdog must record both repairs");

  console.log("[r36 Spy] instant-open door is converted back into a visible opening animation");
  const door=await page.evaluate(()=>{
    const r36=window.CCGLostSizzlerV141R36SpyPerfection,d=(host.doors||[]).find(row=>row?.spyR32Door);if(!d)throw new Error("no r32 Spy door");
    const id=String(d.id||`${d.x},${d.y}`);d.open=false;d.opening=false;d.openingStart=0;d.openAt=0;delete d._v141r36AnimatedOpen;r36.state.doorById.set(id,{open:false,opening:false});
    d.open=true;d.opening=false;r36.repairDoors();return{open:Boolean(d.open),opening:Boolean(d.opening),duration:Number(d.openAt)-Number(d.openingStart),repair:Boolean(d._v141r36DoorRepair),count:Number(r36.state.doorRepairs)}
  });
  assert.equal(door.open,false,"repaired instant-open door must begin from closed visual state");
  assert.equal(door.opening,true,"repaired door must expose opening=true to shared renderer");
  assert.ok(door.duration>=480,"Spy door animation must have a visible opening interval");
  assert.equal(door.repair,true,"repaired door must remain marked through its animation");
  assert.ok(door.count>=1,"door repair must be observable in diagnostics");

  console.log("[r36 Spy] Player 2 springs a real trap and receives its effect/HP change");
  const trap=await page.evaluate(()=>{
    const m=window.CCGLostSizzlerSpecialModes.active.state,r36=window.CCGLostSizzlerV141R36SpyPerfection,owner=m.players.find(row=>String(row.id)===String(p1.id))||m.players[0],victim=m.players.find(row=>row!==owner);if(!victim)throw new Error("no second Spy model");
    victim.status="active";victim.hp=victim.maxHp=6;victim.effects={};const logical=m.map.rooms.find(room=>!room.spawn&&!room.extraction)||m.map.rooms[0],physical=world.rooms[Number(logical.dungeonRoomId)];if(!physical)throw new Error("no physical Spy room for Player 2");
    const candidates=[];for(let y=physical.y+1;y<physical.y+physical.h;y++)for(let x=physical.x+1;x<physical.x+physical.w;x++)if(world.map?.[y]?.[x]===0&&!(host.blockingDecor||[]).some(row=>Number(row.x)===x&&Number(row.y)===y)&&(host.doors||[]).every(row=>Number(row.x)!==x||Number(row.y)!==y))candidates.push({x,y});const cell=candidates[0];if(!cell)throw new Error("no safe floor cell for Player 2 trap fixture");
    victim.roomId=logical.id;victim.x=cell.x;victim.y=cell.y;const live={...p1,id:victim.id,name:victim.name,x:cell.x,y:cell.y,rx:cell.x,ry:cell.y,health:6,maxHealth:6,lastSeen:performance.now()};remote.set(victim.id,live);
    const placed={id:`r36-test-trap-${Date.now()}`,trapId:"spring",ownerId:owner.id,roomId:logical.id,targetType:"floor",targetId:`floor:${cell.x},${cell.y}`,armed:true,placedAt:Date.now()-1000,detonatesAt:0,x:cell.x,y:cell.y,spyR32Trap:true};m.traps.push(placed);
    r36.state.roomById.set(String(victim.id),String(logical.id));const before=Number(victim.hp);r36.reconcileRemoteTraps();r36.processTrapEvents();const hit=window.CCGLostSizzlerV141R32SpyPacketOwner.state.lastTrapByVictim.get(String(victim.id));
    return{armed:Boolean(placed.armed),before,after:Number(victim.hp),liveHp:Number(live.health),slow:Number(victim.effects?.slow||0),hitTrap:String(hit?.trapId||""),remoteChecks:Number(r36.state.remoteTrapChecks),trapEvents:Number(r36.state.trapEvents)}
  });
  assert.equal(trap.armed,false,"second player stepping onto a floor trap must consume/spring it");
  assert.ok(trap.after<trap.before,"Spring trap must damage the second player's rules HP");
  assert.equal(trap.liveHp,trap.after,"Spring trap damage must reach the second player's physical health");
  assert.ok(trap.slow>Date.now(),"Spring trap must apply its visible movement-slow effect");
  assert.equal(trap.hitTrap,"spring","Trapulator hit owner must record the sprung trap for visual feedback");
  assert.ok(trap.remoteChecks>=1&&trap.trapEvents>=1,"remote trap reconciliation and event presentation must both run");

  console.log("[r36 Spy] Trapulator carries search and persistent armed-trap status");
  const panel=await page.evaluate(()=>{
    const r36=window.CCGLostSizzlerV141R36SpyPerfection,overhaul=window.CCGLostSizzlerV141R32SpyOverhaul,m=window.CCGLostSizzlerSpecialModes.active.state,me=m.players.find(row=>String(row.id)===String(p1.id))||m.players[0];
    m.traps.push({id:"r36-armed-ui",trapId:"powerBrick",ownerId:me.id,roomId:me.roomId,targetType:"furniture",targetId:"fixture",armed:true,placedAt:Date.now(),x:p1.x,y:p1.y});
    overhaul.state.search={targetId:"fixture",targetLabel:"BOOKCASE",startedAt:performance.now()-200,completesAt:performance.now()+500};r36.updatePanelWidgets();
    const slot=Number(me.slot||1),root=document.querySelector(`.spy-classic-trapulator[data-slot="${slot}"]`),search=root?.querySelector(".spy-r36-searchline")?.textContent||"",armed=root?.querySelector(".spy-r36-armedline")?.textContent||"",badge=root?.querySelector(".spy-r36-armed-badge")?.textContent||"";overhaul.state.search=null;return{search,armed,badge}
  });
  assert.ok(panel.search.includes("SEARCHING BOOKCASE"),`Trapulator must show live search progress; got ${panel.search}`);
  assert.ok(panel.armed.includes("BOMB"),`Trapulator must list armed traps persistently; got ${panel.armed}`);
  assert.ok(panel.badge.includes("ARMED"),`selected trap card must expose armed-count feedback; got ${panel.badge}`);

  console.log("[r36 Spy] desktop command rail uses only measured spare space");
  const rail=await page.evaluate(()=>{
    const r36=window.CCGLostSizzlerV141R36SpyPerfection;r36.updateRail();const node=document.getElementById("spy-r36-desktop-rail"),area=document.querySelector(".ccg-game>.game-area"),canvas=document.getElementById("game"),a=area.getBoundingClientRect(),c=canvas.getBoundingClientRect(),r=node.getBoundingClientRect(),visible=getComputedStyle(node).display!=="none"&&r.width>0;
    return{exists:Boolean(node),visible,gap:a.right-c.right,canvasRight:c.right,railLeft:r.left,railRight:r.right,areaRight:a.right,text:String(node?.textContent||"")}
  });
  assert.equal(rail.exists,true,"desktop Spy command rail must be mounted");
  if(rail.visible){assert.ok(rail.gap>=210,"desktop rail may only appear when genuine spare width exists");assert.ok(rail.railLeft>=rail.canvasRight-1,"desktop rail must begin outside the rendered game canvas");assert.ok(rail.railRight<=rail.areaRight+1,"desktop rail must remain inside game-area spare width");assert.ok(rail.text.includes("SPY COMMAND")&&rail.text.includes("ARMED TRAPS"),"desktop rail must contain useful Spy status rather than empty black space")}

  assert.deepEqual(errors,[],`r36 Spy perfection browser regression must have no uncaught errors: ${errors.join("\n")}`);
  console.log("Lost Sizzler r36 Spy inventory exit, movement recovery, melee animation, respawn HP, doors, traps and HUD passed in Chromium.");
  await context.close();
}finally{
  await browser.close();for(const socket of sockets)socket.destroy();await new Promise(resolve=>server.close(()=>resolve()));
}
