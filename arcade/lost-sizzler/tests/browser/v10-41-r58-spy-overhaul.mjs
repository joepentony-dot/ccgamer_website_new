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
    const pathname=decodeURIComponent(new URL(req.url,"http://local").pathname);
    const relative=pathname.endsWith("/")?`${pathname}index.html`:pathname;
    const file=path.resolve(repo,`.${relative}`);
    if(!file.startsWith(`${repo}${path.sep}`)&&file!==repo){res.writeHead(403).end("forbidden");return}
    fs.readFile(file,(error,data)=>{
      if(error){res.writeHead(404,{connection:"close"}).end("not found");return}
      res.writeHead(200,{"content-type":mime[path.extname(file).toLowerCase()]||"application/octet-stream","cache-control":"no-store",connection:"close"});res.end(data)
    });
  }catch(error){res.writeHead(500,{connection:"close"}).end(String(error))}
});
server.on("connection",socket=>{sockets.add(socket);socket.on("close",()=>sockets.delete(socket))});
await new Promise((resolve,reject)=>{server.once("error",reject);server.listen(0,"127.0.0.1",resolve)});
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,args:["--disable-dev-shm-usage","--disable-background-networking","--autoplay-policy=no-user-gesture-required"]});

try{
  const context=await browser.newContext({viewport:{width:1900,height:1000}});
  const page=await context.newPage();page.setDefaultTimeout(45000);
  const errors=[];page.on("pageerror",error=>errors.push(String(error?.stack||error)));

  console.log("[r58 Spy] load canonical page");
  await page.goto(`${origin}/arcade/lost-sizzler/`,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.body.dataset.releaseReady==="true"&&Boolean(window.CCGLostSizzlerV141R32SpyLoader));

  console.log("[r58 Spy] start real two-agent fixture");
  const started=await page.evaluate(()=>{
    net.setSolo("Agent One");const id=String(net.sessionId);
    return window.CCGLostSizzlerSpecialModes.startOnline({roomMode:"sizzler-saboteurs",players:[{id,name:"Agent One"},{id:"R58-SPY-B",name:"Agent Two"}],hostId:id,seed:"V141-R58-SPY-OVERHAUL",roomCode:"R58SPY"});
  });
  assert.equal(started,true,"R58 fixture must start through the real special-mode adapter");
  await page.waitForFunction(()=>document.body.dataset.specialMode==="sizzler-saboteurs"&&Boolean(window.CCGLostSizzlerV141R32SpyLoader?.state?.r58Loaded)&&Boolean(window.CCGLostSizzlerV141R58SpyOverhaul)&&Boolean(window.CCGLostSizzlerSpecialModes?.active?.state?.r58Rules));

  console.log("[r58 Spy] one-match rules and personal clocks replace legacy rounds");
  const baseline=await page.evaluate(()=>{
    const m=window.CCGLostSizzlerSpecialModes.active.state;
    return{bestOf:Number(m.bestOf),roundsToWin:Number(m.roundsToWin),round:Number(m.round),state:String(m.state),roundEndsAt:Number(m.roundEndsAt),loadout:[...(m.trapLoadout||[])],times:(m.players||[]).map(row=>Number(row.timeRemainingMs)),clockCount:document.querySelectorAll("#spy-r58-clockboard .spy-r58-clock").length,r58:Boolean(m.r58Rules)}
  });
  assert.equal(baseline.r58,true);assert.equal(baseline.bestOf,1);assert.equal(baseline.roundsToWin,1);assert.equal(baseline.round,1);assert.equal(baseline.state,"playing");
  assert.equal(baseline.roundEndsAt,Number.MAX_SAFE_INTEGER);assert.deepEqual(baseline.loadout,["powerBrick","spring","custard"]);assert.equal(baseline.clockCount,2);
  for(const value of baseline.times)assert.ok(value>590000&&value<=600000,`personal clock must begin near ten minutes, got ${value}`);

  console.log("[r58 Spy] real T key reaches contextual owner and arms BOMB beside furniture");
  const fixture=await page.evaluate(()=>{
    const m=window.CCGLostSizzlerSpecialModes.active.state,api=window.CCGLostSizzlerV141R32SpyOverhaul,r58=window.CCGLostSizzlerV141R58SpyOverhaul;
    api.buildOverhaulWorld(false);r58.tick();
    const me=m.players.find(row=>String(row.id)===String(p1.id))||m.players[0],other=m.players.find(row=>row!==me);
    const logical=(m.map.rooms||[]).find(room=>!room.spawn&&!room.extraction&&Number.isFinite(Number(room.dungeonRoomId)));if(!logical)throw new Error("no ordinary Spy room");
    const furniture=(host.blockingDecor||[]).find(row=>row?.spyR32Furniture&&String(row.logicalRoomId||"")===String(logical.id)&&row.logicalFurnitureId);if(!furniture)throw new Error("no Spy furniture");
    const cell=[{x:furniture.x+1,y:furniture.y},{x:furniture.x-1,y:furniture.y},{x:furniture.x,y:furniture.y+1},{x:furniture.x,y:furniture.y-1}].find(q=>world.map?.[q.y]?.[q.x]===0&&!(host.blockingDecor||[]).some(row=>Number(row.x)===q.x&&Number(row.y)===q.y)&&(host.doors||[]).every(row=>Number(row.x)!==q.x||Number(row.y)!==q.y));if(!cell)throw new Error("no walkable furniture neighbour");
    me.roomId=logical.id;me.x=cell.x;me.y=cell.y;me.status="active";me.hp=me.maxHp=6;me.trapCharges=5;me.timeRemainingMs=500000;p1.x=p1.rx=cell.x;p1.y=p1.ry=cell.y;p1.health=6;p1.maxHealth=6;
    if(other){other.status="active";other.hp=other.maxHp=6;other.timeRemainingMs=500000}
    api.selectTrap(0);document.getElementById("game")?.focus?.();
    return{ownerId:String(me.id),victimId:String(other?.id||""),roomId:String(logical.id),furnitureId:String(furniture.logicalFurnitureId),x:Number(furniture.x),y:Number(furniture.y),before:Number(m.traps?.length||0),passes:Number(r58.state.trapKeyPasses||0)}
  });
  await page.keyboard.press("KeyT");
  await page.waitForFunction(before=>Number(window.CCGLostSizzlerSpecialModes.active.state.traps?.length||0)>before,fixture.before);
  const armed=await page.evaluate(({passes,ownerId})=>{
    const m=window.CCGLostSizzlerSpecialModes.active.state,r58=window.CCGLostSizzlerV141R58SpyOverhaul,trap=[...(m.traps||[])].reverse().find(row=>String(row.ownerId)===ownerId&&row.armed);
    return{passes:Number(r58.state.trapKeyPasses||0),trap:trap?{id:String(trap.id),trapId:String(trap.trapId),ownerId:String(trap.ownerId),roomId:String(trap.roomId),targetType:String(trap.targetType),targetId:String(trap.targetId),armed:Boolean(trap.armed)}:null}
  },fixture);
  assert.ok(armed.passes>fixture.passes,"legacy KeyT stopImmediatePropagation must be bypassed in Spy");assert.ok(armed.trap,"real T key must create a live trap");assert.equal(armed.trap.trapId,"powerBrick");assert.equal(armed.trap.targetType,"furniture");assert.equal(armed.trap.targetId,fixture.furnitureId);

  console.log("[r58 Spy] owner cannot spring their own armed trap");
  const ownerSafe=await page.evaluate(trapId=>{
    const m=window.CCGLostSizzlerSpecialModes.active.state,r32=window.CCGLostSizzlerV141R32SpyOverhaul,r58=window.CCGLostSizzlerV141R58SpyOverhaul,me=m.players.find(row=>String(row.id)===String(p1.id))||m.players[0],trap=m.traps.find(row=>String(row.id)===String(trapId));
    const time=Number(me.timeRemainingMs),before=Number(r58.state.ownerTrapIgnores||0),ok=r32.triggerTrapForPlayer(me,{type:trap.targetType,id:trap.targetId});
    return{ok,armed:Boolean(trap.armed),status:String(me.status),time:Number(me.timeRemainingMs),before,after:Number(r58.state.ownerTrapIgnores||0)}
  },armed.trap.id);
  assert.equal(ownerSafe.ok,false);assert.equal(ownerSafe.armed,true);assert.equal(ownerSafe.status,"active");assert.equal(ownerSafe.time,500000);assert.ok(ownerSafe.after>ownerSafe.before);

  console.log("[r58 Spy] opposing agent springs BOMB: instant death, -30 seconds, complete item capture and silhouette FX");
  const lethal=await page.evaluate(trapId=>{
    const m=window.CCGLostSizzlerSpecialModes.active.state,r32=window.CCGLostSizzlerV141R32SpyOverhaul,r58=window.CCGLostSizzlerV141R58SpyOverhaul,owner=m.players.find(row=>String(row.id)===String(p1.id))||m.players[0],victim=m.players.find(row=>row!==owner),trap=m.traps.find(row=>String(row.id)===String(trapId));if(!victim||!trap)throw new Error("missing victim/trap");
    victim.status="active";victim.hp=victim.maxHp=6;victim.roomId=trap.roomId;victim.timeRemainingMs=500000;victim.hasCase=true;victim.objectives=["joystick","tape"];victim.looseItem="key";victim.weapon={id:"test",name:"Test Weapon",uses:2,damage:2};victim.counter="scanner";victim.trapCharges=2;victim.spyCapturedWeapons=[{id:"stash",name:"Stashed Weapon",uses:1}];victim.spyCapturedCounters=["raincoat"];
    owner.hasCase=false;owner.objectives=[];owner.looseItem=null;owner.weapon=null;owner.counter=null;owner.trapCharges=1;owner.spyCapturedWeapons=[];owner.spyCapturedCounters=[];
    const live={...p1,id:victim.id,name:victim.name,x:Number(trap.x),y:Number(trap.y),rx:Number(trap.x),ry:Number(trap.y),health:6,maxHealth:6,lastSeen:performance.now()};remote.set(victim.id,live);
    const before=Number(victim.timeRemainingMs),ok=r32.triggerTrapForPlayer(victim,{type:trap.targetType,id:trap.targetId});r58.observeDeaths();
    const slot=Number(victim.slot||2),fx=document.querySelector(`.spy-r58-death-fx[data-slot="${slot}"]`);
    return{ok,armed:Boolean(trap.armed),status:String(victim.status),hp:Number(victim.hp),before,after:Number(victim.timeRemainingMs),deathRoom:String(victim.r58DeathRoomId),respawnAt:Number(victim.r58RespawnAt),victim:{case:Boolean(victim.hasCase),objectives:[...(victim.objectives||[])],loose:victim.looseItem,weapon:victim.weapon,counter:victim.counter,charges:Number(victim.trapCharges||0),stash:(victim.spyCapturedWeapons||[]).length,counters:(victim.spyCapturedCounters||[]).length},owner:{case:Boolean(owner.hasCase),objectives:[...(owner.objectives||[])],weapon:owner.weapon?.name||"",counter:owner.counter||"",charges:Number(owner.trapCharges||0),stash:(owner.spyCapturedWeapons||[]).map(w=>w.name),counters:[...(owner.spyCapturedCounters||[])]},fx:{visible:fx?.dataset.visible,kind:fx?.dataset.kind,trap:fx?.dataset.trap,title:fx?.querySelector("strong")?.textContent||"",detail:fx?.querySelector("span")?.textContent||""}}
  },armed.trap.id);
  assert.equal(lethal.ok,true);assert.equal(lethal.armed,false);assert.equal(lethal.status,"ghost");assert.equal(lethal.hp,0);assert.equal(lethal.before-lethal.after,30000);assert.ok(lethal.respawnAt>Date.now());
  assert.deepEqual(lethal.victim.objectives,[]);assert.equal(lethal.victim.case,false);assert.equal(lethal.victim.loose,null);assert.equal(lethal.victim.weapon,null);assert.equal(lethal.victim.counter,null);assert.equal(lethal.victim.charges,0);assert.equal(lethal.victim.stash,0);assert.equal(lethal.victim.counters,0);
  assert.equal(lethal.owner.case,true);assert.deepEqual(new Set(lethal.owner.objectives),new Set(["joystick","tape","key"]));assert.equal(lethal.owner.weapon,"Test Weapon");assert.equal(lethal.owner.counter,"scanner");assert.ok(lethal.owner.charges>=3);assert.ok(lethal.owner.stash.includes("Stashed Weapon"));assert.ok(lethal.owner.counters.includes("raincoat"));
  assert.equal(lethal.fx.visible,"true");assert.equal(lethal.fx.kind,"trap");assert.equal(lethal.fx.trap,"powerBrick");assert.match(lethal.fx.title,/INSTANT KNOCKOUT/);assert.match(lethal.fx.detail,/-30 SECONDS/);

  console.log("[r58 Spy] dead agent respawns away from death room and killer room");
  const respawn=await page.evaluate(()=>{
    const m=window.CCGLostSizzlerSpecialModes.active.state,r58=window.CCGLostSizzlerV141R58SpyOverhaul,owner=m.players.find(row=>String(row.id)===String(p1.id))||m.players[0],victim=m.players.find(row=>row!==owner),death=String(victim.r58DeathRoomId),killer=String(owner.roomId);victim.r58RespawnAt=Date.now()-1;r58.respawnR58(m,Date.now());return{status:String(victim.status),hp:Number(victim.hp),room:String(victim.roomId),death,killer}
  });
  assert.equal(respawn.status,"active");assert.ok(respawn.hp>0);assert.notEqual(respawn.room,respawn.death);assert.notEqual(respawn.room,respawn.killer);

  console.log("[r58 Spy] lethal melee uses the same -30 second / item-capture / remote-respawn pipeline");
  const melee=await page.evaluate(()=>{
    const m=window.CCGLostSizzlerSpecialModes.active.state,r58=window.CCGLostSizzlerV141R58SpyOverhaul,owner=m.players.find(row=>String(row.id)===String(p1.id))||m.players[0],victim=m.players.find(row=>row!==owner);m.state="playing";m.r58ClockAt=Date.now();
    victim.status="active";victim.hp=1;victim.roomId=owner.roomId;victim.timeRemainingMs=420000;victim.hasCase=false;victim.objectives=[];victim.looseItem="key";victim.weapon=null;victim.counter=null;victim.trapCharges=0;victim.invulnerableUntil=0;owner.weapon=null;owner.looseItem=null;owner.objectives=(owner.objectives||[]).filter(id=>id!=="key");
    const before=Number(victim.timeRemainingMs),ok=window.CCGLostSizzlerSaboteurs.useWeapon(m,owner.id,victim.id,Date.now());r58.observeDeaths();return{ok,status:String(victim.status),hp:Number(victim.hp),lost:before-Number(victim.timeRemainingMs),ownerKey:Boolean(owner.objectives?.includes("key")),respawnAt:Number(victim.r58RespawnAt)}
  });
  assert.equal(melee.ok,true);assert.equal(melee.status,"ghost");assert.equal(melee.hp,0);assert.equal(melee.lost,30000);assert.equal(melee.ownerKey,true);assert.ok(melee.respawnAt>Date.now());

  console.log("[r58 Spy] complete case at extraction ends the entire match");
  const extraction=await page.evaluate(()=>{
    const m=window.CCGLostSizzlerSpecialModes.active.state,r58=window.CCGLostSizzlerV141R58SpyOverhaul,owner=m.players.find(row=>String(row.id)===String(p1.id))||m.players[0],other=m.players.find(row=>row!==owner);m.state="playing";m.matchWinnerId=null;m.completedAt=0;m.r58Extraction=null;m.r58ClockAt=Date.now();owner.status="active";owner.hp=owner.maxHp;owner.hasCase=true;owner.objectives=["joystick","tape","key"];owner.looseItem=null;owner.roomId=m.map.extractionRoomId;owner.timeRemainingMs=300000;if(other){other.status="active";other.timeRemainingMs=300000}
    const started=r58.beginExtractionR58(m,owner.id,Date.now()),at=Number(m.r58Extraction?.completesAt||0)+1;r58.tickExtractionR58(m,at);return{started,state:String(m.state),winner:String(m.matchWinnerId||""),reason:String(m.r58Result?.reason||"")}
  });
  assert.equal(extraction.started,true);assert.equal(extraction.state,"match-complete");assert.equal(extraction.winner,fixture.ownerId);assert.equal(extraction.reason,"extraction");

  console.log("[r58 Spy] personal clock reaching zero ends the match for that agent");
  const timeout=await page.evaluate(()=>{
    const m=window.CCGLostSizzlerSpecialModes.active.state,r58=window.CCGLostSizzlerV141R58SpyOverhaul,owner=m.players.find(row=>String(row.id)===String(p1.id))||m.players[0],victim=m.players.find(row=>row!==owner);m.state="playing";m.matchWinnerId=null;m.completedAt=0;m.r58Result=null;m.r58Extraction=null;owner.timeRemainingMs=500000;victim.timeRemainingMs=100;m.r58ClockAt=Date.now()-1000;r58.tickClocks(m,Date.now());return{state:String(m.state),winner:String(m.matchWinnerId||""),loser:String(m.r58Result?.loserId||""),reason:String(m.r58Result?.reason||"")}
  });
  assert.equal(timeout.state,"match-complete");assert.equal(timeout.winner,fixture.ownerId);assert.equal(timeout.loser,fixture.victimId);assert.equal(timeout.reason,"timer");

  console.log("[r58 Spy] Solo dungeon objects cannot leak into Spy");
  const purge=await page.evaluate(()=>{
    const r58=window.CCGLostSizzlerV141R58SpyOverhaul;host.enemies=[{id:"solo-enemy",alive:true}];host.items=[{id:"solo-item"}];host.chests=[{id:"solo-chest"}];host.shrines=[{id:"solo-shrine"}];host.switches=[{id:"solo-switch"}];host.generators=[{id:"solo-generator"}];host.arenas=[{id:"solo-arena"}];host.timedRooms=[{id:"solo-timed"}];host.hazardRooms=[{id:"solo-hazard"}];host.shops=[{id:"solo-shop"}];host.stalker={id:"solo-stalker"};host.guardian={id:"solo-guardian"};host.sigilWarden={id:"solo-sigil"};host.objective={type:"keys"};host.doors.push({id:"solo-door",x:1,y:1,type:"room"});host.blockingDecor.push({id:"solo-decor",x:2,y:2});world.decor.push({id:"solo-world-decor",x:3,y:3});
    const removed=r58.purgeSoloState();return{removed,enemies:host.enemies.length,items:host.items.length,chests:host.chests.length,shrines:host.shrines.length,switches:host.switches.length,generators:host.generators.length,arenas:host.arenas.length,timed:host.timedRooms.length,hazards:host.hazardRooms.length,shops:host.shops.length,stalker:host.stalker,guardian:host.guardian,sigil:host.sigilWarden,objective:host.objective,nonSpyDoors:host.doors.filter(row=>!row.spyR32Door&&!row.spyDoor).length,nonSpyDecor:host.blockingDecor.filter(row=>!row.spyR32Furniture&&!row.spyFurniture).length,nonSpyWorldDecor:world.decor.filter(row=>!row.spyR32Furniture&&!row.spyFurniture).length,spyDoors:host.doors.filter(row=>row.spyR32Door||row.spyDoor).length,spyDecor:host.blockingDecor.filter(row=>row.spyR32Furniture||row.spyFurniture).length}
  });
  assert.ok(purge.removed>0);for(const key of ["enemies","items","chests","shrines","switches","generators","arenas","timed","hazards","shops","nonSpyDoors","nonSpyDecor","nonSpyWorldDecor"])assert.equal(purge[key],0,`${key} must be purged from Spy`);
  assert.equal(purge.stalker,null);assert.equal(purge.guardian,null);assert.equal(purge.sigil,null);assert.equal(purge.objective,null);assert.ok(purge.spyDoors>0);assert.ok(purge.spyDecor>0);

  assert.deepEqual(errors,[],`R58 Spy overhaul must not throw browser errors: ${errors.join("\n")}`);
  console.log("Lost Sizzler V10.41 r58 Spy overhaul Chromium regression passed.");
}finally{
  await browser.close();for(const socket of sockets)socket.destroy();await new Promise(resolve=>server.close(resolve));
}
