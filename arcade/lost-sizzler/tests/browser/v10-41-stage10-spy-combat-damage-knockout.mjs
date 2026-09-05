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
      res.writeHead(200,{"content-type":mime[path.extname(file).toLowerCase()]||"application/octet-stream","cache-control":"no-store",connection:"close"});
      res.end(data)
    });
  }catch(error){res.writeHead(500,{connection:"close"}).end(String(error))}
});
server.on("connection",socket=>{sockets.add(socket);socket.on("close",()=>sockets.delete(socket))});
await new Promise((resolve,reject)=>{server.once("error",reject);server.listen(0,"127.0.0.1",resolve)});
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,args:["--disable-dev-shm-usage","--disable-background-networking","--autoplay-policy=no-user-gesture-required"]});

try{
  const context=await browser.newContext({viewport:{width:1900,height:1000}});
  const page=await context.newPage();
  page.setDefaultTimeout(45000);
  const errors=[];
  page.on("pageerror",error=>errors.push(String(error?.stack||error)));

  console.log("[Stage 10 Spy combat] load canonical page and real Spy match");
  await page.goto(`${origin}/arcade/lost-sizzler/`,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.body.dataset.releaseReady==="true"&&Boolean(window.CCGLostSizzlerV141R32SpyLoader));
  const started=await page.evaluate(()=>{
    net.setSolo("Agent One");
    const id=String(net.sessionId);
    return window.CCGLostSizzlerSpecialModes.startOnline({
      roomMode:"sizzler-saboteurs",
      players:[{id,name:"Agent One"},{id:"STAGE10-COMBAT-B",name:"Agent Two"}],
      hostId:id,
      seed:"STAGE10-SPY-COMBAT",
      roomCode:"S10CMB"
    })
  });
  assert.equal(started,true,"Stage 10 combat fixture must start through the real special-mode adapter");
  await page.waitForFunction(()=>document.body.dataset.specialMode==="sizzler-saboteurs"&&document.body.dataset.modeController==="spy-online"&&Boolean(window.CCGLostSizzlerV141R29SpyEngine?.state?.isolated)&&Boolean(window.CCGLostSizzlerV141R58SpyOverhaul)&&Boolean(window.CCGLostSizzlerSpecialModes?.active?.state?.r58Rules));

  console.log("[Stage 10 Spy combat] establish deterministic co-room opponent and damage-owner baseline");
  const fixture=await page.evaluate(()=>{
    const active=window.CCGLostSizzlerSpecialModes.active,m=active.state,r29=window.CCGLostSizzlerV141R29SpyEngine,r32=window.CCGLostSizzlerV141R32SpyOverhaul,r58=window.CCGLostSizzlerV141R58SpyOverhaul;
    r32?.buildOverhaulWorld?.(false);
    r58.tick();
    const me=m.players.find(row=>String(row.id)===String(p1.id))||m.players[0],other=m.players.find(row=>row!==me);
    if(!me||!other)throw new Error("Stage 10 Spy combat requires two agents");
    const room=(m.map.rooms||[]).find(row=>!row.extraction&&Number.isFinite(Number(row.dungeonRoomId)))||m.map.rooms?.[0];
    const physical=world.rooms?.[Number(room?.dungeonRoomId)];
    if(!room||!physical)throw new Error("Stage 10 Spy combat requires a physical room");
    const cx=Math.floor(Number(physical.x)+Number(physical.w)/2),cy=Math.floor(Number(physical.y)+Number(physical.h)/2);
    me.status="active";me.hp=me.maxHp=6;me.roomId=room.id;me.x=cx;me.y=cy;me.timeRemainingMs=500000;me.invulnerableUntil=0;me.knockouts=0;
    me.weapon={id:"stage10-baton",name:"Stage 10 Baton",uses:4,damage:2,knockback:0,effect:"bonk",effectMs:100};
    me.hasCase=false;me.objectives=[];me.looseItem=null;me.counter=null;me.trapCharges=1;
    other.status="active";other.hp=3;other.maxHp=6;other.roomId=room.id;other.x=cx+1;other.y=cy;other.timeRemainingMs=500000;other.invulnerableUntil=0;other.knockouts=0;
    other.hasCase=false;other.objectives=[];other.looseItem="key";other.weapon={id:"captured-tool",name:"Captured Tool",uses:2,damage:1};other.counter="scanner";other.trapCharges=2;
    p1.x=p1.rx=cx;p1.y=p1.ry=cy;p1.health=6;p1.maxHealth=6;
    remote.set(other.id,{...p1,id:other.id,name:other.name,x:cx+1,y:cy,rx:cx+1,ry:cy,health:3,maxHealth:6,lastSeen:performance.now()});
    const chain=()=>{const seen=new Set(),rows=[];let fn=window.hurtPlayer;while(typeof fn==="function"&&!seen.has(fn)&&rows.length<64){seen.add(fn);rows.push({name:String(fn.name||""),spy:Boolean(fn.__ccgV141SpyDamageBoundary),r56:Boolean(fn.__ccgV141R56EnvironmentDamage),r60:Boolean(fn.__ccgV141R60EnvironmentSeal)});fn=typeof fn.__ccgOriginal==="function"?fn.__ccgOriginal:null}return rows};
    const compact=s=>s?JSON.parse(JSON.stringify(s)):null;
    return{
      meId:String(me.id),otherId:String(other.id),roomId:String(room.id),deathX:cx+1,deathY:cy,
      otherHp:Number(other.hp),otherTime:Number(other.timeRemainingMs),meKnockouts:Number(me.knockouts||0),
      attacks:Number(r32?.state?.attacks||0),blocked:Number(r29.state.dungeonDamageBlocked||0),
      combatKills:Number(r58.state.combatKills||0),penalties:Number(r58.state.timePenalties||0),lootTransfers:Number(r58.state.lootTransfers||0),respawns:Number(r58.state.respawns||0),
      chain:chain(),
      r56:compact(window.CCGLostSizzlerV141R56PlaytestCompletion?.state),
      r60:compact(window.CCGLostSizzlerV141R60HordeOptimisation?.state)
    }
  });
  assert.equal(fixture.chain.filter(row=>row.spy).length,1,"Spy mode must have exactly one live R29 damage boundary before combat");

  console.log("[Stage 10 Spy combat] held Space produces a non-lethal opponent-only hit through isolated runtime");
  await page.keyboard.down("Space");
  await page.waitForFunction(before=>Number(window.CCGLostSizzlerV141R32SpyOverhaul?.state?.attacks||0)>before,fixture.attacks);
  await page.keyboard.up("Space");
  const first=await page.evaluate(({meId,otherId})=>{
    const m=window.CCGLostSizzlerSpecialModes.active.state,r29=window.CCGLostSizzlerV141R29SpyEngine,r32=window.CCGLostSizzlerV141R32SpyOverhaul;
    const me=m.players.find(row=>String(row.id)===meId),other=m.players.find(row=>String(row.id)===otherId);
    return{meHp:Number(me?.hp),otherHp:Number(other?.hp),otherStatus:String(other?.status),otherTime:Number(other?.timeRemainingMs),knockouts:Number(me?.knockouts||0),weaponUses:Number(me?.weapon?.uses),attacks:Number(r32?.state?.attacks||0),blocked:Number(r29.state.dungeonDamageBlocked||0)}
  },fixture);
  assert.equal(first.meHp,6,"Spy attack must not damage the attacker");
  assert.equal(first.otherHp,1,"first Stage 10 baton hit must apply only its two points of Spy damage");
  assert.equal(first.otherStatus,"active","non-lethal Spy damage must leave the opponent active");
  assert.equal(first.otherTime,fixture.otherTime,"non-lethal Spy damage must not deduct the knockout clock penalty");
  assert.equal(first.knockouts,fixture.meKnockouts,"non-lethal Spy damage must not increment knockout count");
  assert.equal(first.weaponUses,3,"real Space attack must consume one finite weapon use");
  assert.equal(first.blocked,fixture.blocked,"Spy-vs-Spy combat must not route through the shared Dungeon hurtPlayer boundary");

  console.log("[Stage 10 Spy combat] second real Space hit uses R58 knockout, penalty and loot-transfer lifecycle");
  await page.waitForTimeout(470);
  await page.keyboard.down("Space");
  await page.waitForFunction(({before,id})=>{
    const m=window.CCGLostSizzlerSpecialModes.active?.state,other=m?.players?.find(row=>String(row.id)===String(id));
    return Number(window.CCGLostSizzlerV141R32SpyOverhaul?.state?.attacks||0)>before&&String(other?.status)==="ghost";
  },{before:first.attacks,id:fixture.otherId});
  await page.keyboard.up("Space");
  const lethal=await page.evaluate(({meId,otherId})=>{
    const m=window.CCGLostSizzlerSpecialModes.active.state,r29=window.CCGLostSizzlerV141R29SpyEngine,r32=window.CCGLostSizzlerV141R32SpyOverhaul,r58=window.CCGLostSizzlerV141R58SpyOverhaul;
    const me=m.players.find(row=>String(row.id)===meId),other=m.players.find(row=>String(row.id)===otherId);
    const chain=()=>{const seen=new Set(),rows=[];let fn=window.hurtPlayer;while(typeof fn==="function"&&!seen.has(fn)&&rows.length<64){seen.add(fn);rows.push({name:String(fn.name||""),spy:Boolean(fn.__ccgV141SpyDamageBoundary),r56:Boolean(fn.__ccgV141R56EnvironmentDamage),r60:Boolean(fn.__ccgV141R60EnvironmentSeal)});fn=typeof fn.__ccgOriginal==="function"?fn.__ccgOriginal:null}return rows};
    return{
      state:String(m.state),round:Number(m.round),winner:m.matchWinnerId??null,
      me:{hp:Number(me?.hp),knockouts:Number(me?.knockouts||0),objectives:[...(me?.objectives||[])],counter:me?.counter||null,charges:Number(me?.trapCharges||0),weaponUses:Number(me?.weapon?.uses)},
      other:{hp:Number(other?.hp),status:String(other?.status),time:Number(other?.timeRemainingMs),deathRoom:String(other?.r58DeathRoomId||""),respawnAt:Number(other?.r58RespawnAt||0),invulnerableUntil:Number(other?.invulnerableUntil||0),loose:other?.looseItem??null,counter:other?.counter??null,charges:Number(other?.trapCharges||0),deathKind:String(other?.r58Death?.kind||"")},
      attacks:Number(r32?.state?.attacks||0),blocked:Number(r29.state.dungeonDamageBlocked||0),
      combatKills:Number(r58.state.combatKills||0),penalties:Number(r58.state.timePenalties||0),lootTransfers:Number(r58.state.lootTransfers||0),chain:chain()
    }
  },fixture);
  assert.equal(lethal.other.hp,0);
  assert.equal(lethal.other.status,"ghost");
  assert.equal(lethal.other.time,fixture.otherTime-30000,"lethal Spy combat must deduct exactly 30 seconds");
  assert.equal(lethal.other.deathRoom,fixture.roomId);
  assert.ok(lethal.other.respawnAt>Date.now(),"lethal Spy combat must schedule the R58 respawn beat");
  assert.equal(lethal.other.deathKind,"combat");
  assert.equal(lethal.me.knockouts,fixture.meKnockouts+1);
  assert.ok(lethal.me.objectives.includes("key"),"killer must capture the victim's carried objective");
  assert.equal(lethal.me.counter,"scanner","killer must capture the victim's counter when their slot is empty");
  assert.ok(lethal.me.charges>=3,"killer must capture the victim's trap charges");
  assert.equal(lethal.other.loose,null);
  assert.equal(lethal.other.counter,null);
  assert.equal(lethal.other.charges,0);
  assert.equal(lethal.me.weaponUses,2,"second real Space attack must consume the second finite weapon use");
  assert.equal(lethal.state,"playing","a knockout must not revive the retired legacy round transition");
  assert.equal(lethal.round,1);
  assert.equal(lethal.winner,null);
  assert.equal(lethal.blocked,fixture.blocked,"R58 combat knockout must remain outside Dungeon damage handling");
  assert.ok(lethal.combatKills>fixture.combatKills);
  assert.ok(lethal.penalties>fixture.penalties);
  assert.ok(lethal.lootTransfers>fixture.lootTransfers);
  assert.deepEqual(lethal.chain,fixture.chain,"Spy combat must not grow or reorder the shared hurtPlayer wrapper ancestry");

  console.log("[Stage 10 Spy combat] ghost is immune to repeat damage until authoritative remote respawn");
  const ghostGuard=await page.evaluate(({meId,otherId})=>{
    const m=window.CCGLostSizzlerSpecialModes.active.state,other=m.players.find(row=>String(row.id)===otherId),before=Number(other.timeRemainingMs);
    const ok=window.CCGLostSizzlerSaboteurs.damagePlayer(m,other.id,5,meId,Date.now(),"combat");
    return{ok,before,after:Number(other.timeRemainingMs),hp:Number(other.hp),status:String(other.status)}
  },fixture);
  assert.equal(ghostGuard.ok,false);
  assert.equal(ghostGuard.after,ghostGuard.before);
  assert.equal(ghostGuard.hp,0);
  assert.equal(ghostGuard.status,"ghost");

  const respawned=await page.evaluate(({meId,otherId})=>{
    const m=window.CCGLostSizzlerSpecialModes.active.state,r58=window.CCGLostSizzlerV141R58SpyOverhaul;
    const me=m.players.find(row=>String(row.id)===meId),other=m.players.find(row=>String(row.id)===otherId);
    other.r58RespawnAt=Date.now()-1;
    const before=Number(r58.state.respawns||0),changed=r58.respawnR58(m,Date.now());
    return{
      changed,before,after:Number(r58.state.respawns||0),state:String(m.state),
      other:{status:String(other.status),hp:Number(other.hp),maxHp:Number(other.maxHp),roomId:String(other.roomId),invulnerableUntil:Number(other.invulnerableUntil||0)},
      killerRoom:String(me.roomId),now:Date.now()
    }
  },fixture);
  assert.equal(respawned.changed,true);
  assert.ok(respawned.after>respawned.before);
  assert.equal(respawned.state,"playing");
  assert.equal(respawned.other.status,"active");
  assert.equal(respawned.other.hp,respawned.other.maxHp);
  assert.notEqual(respawned.other.roomId,fixture.roomId,"respawn must leave the death room");
  assert.notEqual(respawned.other.roomId,respawned.killerRoom,"respawn must avoid the killer's current room");
  assert.ok(respawned.other.invulnerableUntil>respawned.now,"respawn must grant a short invulnerability window");

  console.log("[Stage 10 Spy combat] accepted Solo/Horde damage owners remain dormant and R29 ancestry stays bounded");
  const final=await page.evaluate(()=>{
    const r29=window.CCGLostSizzlerV141R29SpyEngine;
    const chain=[];const seen=new Set();let fn=window.hurtPlayer;
    while(typeof fn==="function"&&!seen.has(fn)&&chain.length<64){seen.add(fn);chain.push({name:String(fn.name||""),spy:Boolean(fn.__ccgV141SpyDamageBoundary),r56:Boolean(fn.__ccgV141R56EnvironmentDamage),r60:Boolean(fn.__ccgV141R60EnvironmentSeal)});fn=typeof fn.__ccgOriginal==="function"?fn.__ccgOriginal:null}
    const compact=s=>s?JSON.parse(JSON.stringify(s)):null;
    return{
      controller:String(document.body.dataset.modeController||""),special:String(document.body.dataset.specialMode||""),isolated:Boolean(r29.state.isolated),
      blocked:Number(r29.state.dungeonDamageBlocked||0),chain,
      r56:compact(window.CCGLostSizzlerV141R56PlaytestCompletion?.state),
      r60:compact(window.CCGLostSizzlerV141R60HordeOptimisation?.state)
    }
  });
  assert.equal(final.controller,"spy-online");
  assert.equal(final.special,"sizzler-saboteurs");
  assert.equal(final.isolated,true);
  assert.equal(final.blocked,fixture.blocked);
  assert.equal(final.chain.filter(row=>row.spy).length,1);
  assert.deepEqual(final.chain,fixture.chain);

  const stableCounter=(before,after,key)=>{
    if(before==null||after==null||!(key in before)||!(key in after))return;
    assert.equal(Number(after[key]||0),Number(before[key]||0),`${key} must not advance during the Stage 10 Spy combat gate`)
  };
  for(const key of ["trapHits","environmentTicks","combatRearms","damageCalls"])stableCounter(fixture.r56,final.r56,key);
  for(const key of ["frames","hordeFrames","ticks","damageCalls","environmentDamageCalls"])stableCounter(fixture.r60,final.r60,key);

  assert.deepEqual(errors,[],`Stage 10 Spy combat/damage/knockout gate must not throw browser errors: ${errors.join("\n")}`);
  await context.close();
  console.log("Lost Sizzler Stage 10 Spy combat, damage, knockout and respawn isolation gate passed in Chromium.");
}finally{
  await browser.close();
  for(const socket of sockets)socket.destroy();
  await new Promise(resolve=>server.close(()=>resolve()))
}
