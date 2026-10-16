import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {chromium} from "playwright";

const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,"../../../..");
const release=JSON.parse(fs.readFileSync(path.join(repo,"arcade/lost-sizzler/version.json"),"utf8"));
const expectedBuild=String(release.build||"").trim(),expectedCache=String(release.cacheToken||"").trim();
const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".mjs":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json; charset=utf-8",".svg":"image/svg+xml",".png":"image/png",".webp":"image/webp",".wav":"audio/wav",".mp3":"audio/mpeg",".ogg":"audio/ogg"};
const sockets=new Set();
const server=http.createServer((req,res)=>{
  try{
    const url=new URL(req.url,"http://local"),pathname=decodeURIComponent(url.pathname),relative=pathname.endsWith("/")?`${pathname}index.html`:pathname,file=path.resolve(repo,`.${relative}`);
    if(!file.startsWith(`${repo}${path.sep}`)&&file!==repo){res.writeHead(403).end("forbidden");return}
    fs.readFile(file,(error,data)=>{if(error){res.writeHead(404,{connection:"close"}).end("not found");return}res.writeHead(200,{"content-type":mime[path.extname(file).toLowerCase()]||"application/octet-stream","cache-control":"no-store",connection:"close"});res.end(data)});
  }catch(error){res.writeHead(500,{connection:"close"}).end(String(error))}
});
server.on("connection",socket=>{sockets.add(socket);socket.on("close",()=>sockets.delete(socket))});
await new Promise((resolve,reject)=>{server.once("error",reject);server.listen(0,"127.0.0.1",resolve)});
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,args:["--disable-dev-shm-usage","--disable-background-networking","--autoplay-policy=no-user-gesture-required"]});

async function settleFloor(page,floor){
  await page.waitForFunction(expected=>Number(run?.floor||0)===expected&&Boolean(host&&world&&p1),floor,{timeout:20000});
  await page.waitForTimeout(420);
  await page.evaluate(()=>{
    const dossier=document.getElementById("named-dossier-panel");
    if(mode==="dossier"&&dossier&&!dossier.classList.contains("hidden")&&typeof hideNamedDossier==="function")hideNamedDossier();
    const save=document.getElementById("save-panel");
    if(mode==="saveprompt"&&save&&!save.classList.contains("hidden")&&typeof closeSavePrompt==="function")closeSavePrompt();
  });
  await page.waitForFunction(()=>mode==="playing"&&document.body.dataset.runActive==="true",null,{timeout:10000});
}

async function snapshot(page){
  return page.evaluate(()=>({
    floor:Number(run?.floor||0),deepest:Number(run?.deepest||0),mode:String(mode||""),active:String(document.body.dataset.runActive||""),
    firearmUnlocked:Boolean(p1?.firearmUnlocked),weaponTier:Number(p1?.weaponEvolutionTier||p1?.weaponLevel||0),mana:Number(p1?.mana||0),
    acceptedFrames:Number(window.CCGLostSizzlerV141R59LiveRegressionFixes?.state?.acceptedFrames||0),
    memory:Boolean(host?.memoryPuzzle),torch:Boolean(host?.sequenceTorchPuzzle),weight:Boolean(host?.weightBridge),clue:Boolean(host?.bloodClue)
  }));
}

// Controlled browser-level Floor 5 acceptance, not the owner's save or a
// natural movement/combat playthrough. Exercise actual gameplay owners together.
async function probeFloorFiveSoftlockGuards(page){
  const before=await snapshot(page);
  assert.equal(before.floor,5);
  const state=await page.evaluate(()=>{
    if(!host?.stalker||!host?.r114BossFight||!p1||run?.floor!==5)return{error:"Required Floor 5 bosses missing"};
    const generators=(host.generators||[]).filter(g=>g.alive),
      stalkers=(host.enemies||[]).filter(e=>e?.deathStalker&&e?.voidStalker);
    if(generators.length!==3||stalkers.length!==1)return{error:"Three generators and exactly one Death Stalker required",generators:generators.length,stalkers:stalkers.length};
    const sigilStatus=()=>({
      id:host.sigilRoomId??null,roomCount:world.rooms?.length||0,
      optionalRooms:(world.rooms||[]).filter(room=>room.optional).length,
      sigilRoomExists:host.sigilRoomId!=null&&Boolean(world.rooms?.[host.sigilRoomId]),
      sigilRoomFlags:(world.rooms||[]).filter(room=>room.sigilRoom).map(room=>({id:room.id,optional:room.optional})),
      sigilGates:(host.doors||[]).filter(door=>door.sigilGate).map(door=>({id:door.id,roomId:door.roomId,locked:door.locked,open:door.open})),
      sigilDefenderIds:host.sigilDefenderIds||[],
      sigilWarden:host.sigilWarden?.id||null,
      defendersAlive:SYS.sigilDefendersAlive(host).length,
      objective:host.objective?.type||null
    });
    const sigilBefore=sigilStatus();
    const count=host.stalker,stalker=stalkers[0],initialScore=score,killsBefore=run.stats.generators||0;
    p1.maxHealth=Math.max(5000,Number(p1.maxHealth)||0);p1.health=p1.maxHealth;
    count.spawnTimer=0;updateStalker(16);
    const bothAlive=Boolean(count.awake&&!count.permanentlyBanished&&stalker.alive);
    for(const g of generators.slice(0,2))damageGenerator(g,Math.max(1,g.hp),p1);
    const twoComplete=Boolean(host.objective.complete),twoExit=Boolean(host.exitOpen);
    damageGenerator(generators[2],Math.max(1,generators[2].hp),p1);
    damageGenerator(generators[2],9999,p1);
    updateFloorObjective();
    const after={dead:generators.filter(g=>!g.alive).length,complete:Boolean(host.objective.complete),exit:Boolean(host.exitOpen),
      kills:(run.stats.generators||0)-killsBefore,score:score-initialScore,
      count:Boolean(count.awake&&!count.permanentlyBanished),stalker:Boolean(stalker.alive),
      stalkerCount:(host.enemies||[]).filter(e=>e.deathStalker&&e.voidStalker).length};
    const sigilAfter=sigilStatus();
    // Floors 1–14 in the fifteen-floor campaign have boss-gated stairs,
    // not a Sigil chamber; only Floor 15 has the final Sigil encounter.
    const fight=host.r114BossFight,guardian=(host.enemies||[]).find(e=>e.id===fight?.bossId);
    if(!guardian?.alive)return{error:"Floor 5 Guardian Maw missing",sigilBefore,sigilAfter,bothAlive,twoComplete,twoExit,after};
    const beforeBoss={alive:guardian.alive,cleared:Boolean(fight.cleared),objective:Boolean(host.objective.complete),exit:Boolean(host.exitOpen)};
    guardian.alive=false; // simulate interrupted final hit, not normal player combat
    updateBossFight(16);updateFloorObjective();
    const afterBoss={
      cleared:Boolean(fight.cleared),objective:Boolean(host.objective.complete),exit:Boolean(host.exitOpen),
      sigilRoomId:host.sigilRoomId??null,sigilResolved:Boolean(host.sigilResolved),
      defenderCount:SYS.sigilDefendersAlive(host).length,
      activeSigils:(host.items||[]).filter(i=>i.kind==="exitSigil"&&i.active).length,
      doorsUnlocked:(host.doors||[]).filter(d=>d.type==="room"&&d.roomId===fight.roomId).every(d=>!d.locked),
      countAwake:Boolean(count.awake&&!count.permanentlyBanished),stalkerAlive:Boolean(stalker.alive)
    };
    const paid=score,chests=(host.chests||[]).length;
    updateBossFight(16);updateFloorObjective();
    afterBoss.repeatScore=score-paid;afterBoss.repeatChests=(host.chests||[]).length-chests;
    return{bothAlive,twoComplete,twoExit,after,sigilBefore,sigilAfter,beforeBoss,afterBoss,mode};
  });
  assert.ok(!state.error,`Generated Floor 5 scenario: ${state.error||""} ${state.error?JSON.stringify({sigilBefore:state.sigilBefore,sigilAfter:state.sigilAfter,after:state.after}):""}`);
  assert.equal(state.bothAlive,true,"Count and Death Stalker must coexist");
  assert.equal(state.twoComplete,false,"2/3 generators cannot complete objective");
  assert.equal(state.twoExit,false);
  assert.equal(state.after.dead,3);
  assert.equal(state.after.complete,false,"The living Guardian must keep Floor 5 incomplete");
  assert.equal(state.after.kills,3,"Generators must pay exactly once");
  assert.equal(state.after.score,2100,"Three generators pay exactly 700 each");
  assert.equal(state.after.exit,false,"Third generator alone cannot open stairs");
  assert.equal(state.after.count,true);
  assert.equal(state.after.stalker,true);
  assert.equal(state.after.stalkerCount,1);
  assert.equal(state.sigilBefore.id,null,"Interim Floor 5 must not require a final Sigil");
  assert.equal(state.sigilAfter.id,null,"Generator completion cannot create an interim Sigil");
  assert.equal(state.sigilAfter.defendersAlive,0);
  assert.equal(state.beforeBoss.alive,true);
  assert.equal(state.beforeBoss.cleared,false);
  assert.equal(state.beforeBoss.objective,false);
  assert.equal(state.beforeBoss.exit,false);
  assert.equal(state.afterBoss.cleared,true,"Boss death must clear the Guardian chamber");
  assert.equal(state.afterBoss.objective,true,"Guardian plus three generators complete Floor 5");
  assert.equal(state.afterBoss.exit,true,"Interim stairs open without Exit Sigil");
  assert.equal(state.afterBoss.sigilRoomId,null);
  assert.equal(state.afterBoss.sigilResolved,true);
  assert.equal(state.afterBoss.defenderCount,0);
  assert.equal(state.afterBoss.activeSigils,0);
  assert.equal(state.afterBoss.doorsUnlocked,true);
  assert.equal(state.afterBoss.countAwake,true);
  assert.equal(state.afterBoss.stalkerAlive,true);
  assert.equal(state.afterBoss.repeatScore,0,"Boss completion must not pay twice");
  assert.equal(state.afterBoss.repeatChests,0,"Boss completion must not duplicate caches");
  assert.equal(state.mode,"playing");
  await page.waitForFunction(previous=>Number(window.CCGLostSizzlerV141R59LiveRegressionFixes?.state?.acceptedFrames||0)>previous,before.acceptedFrames,{timeout:3500,polling:25});
}

// Controlled live browser bridge crossing, switch and stolen-item return.
// The origin is staged near the bridge to avoid unrelated exploration and
// combat. Crossing and return use real movePlayer boundaries, the bridge
// switch uses the real shot-qualified handler, and the thief's defeat uses
// actual damageEnemy. This is not a natural complete Floor 5 playthrough.
async function probeFloorFiveBridgeTraversal(page){
  const state=await page.evaluate(()=>{
    const bridge=host?.weightBridge,side=bridge?.entranceSide;
    if(run?.floor!==5||mode!=="playing"||!bridge?.bridgeTiles?.length||
       !["west","east","north","south"].includes(side))return{error:"Bridge traversal fixture not installed on active Floor 5"};
    const s=(host.switches||[]).find(q=>q.id===bridge.switchId&&q.weightBridgeSwitch);
    if(!s?.active)return{error:"Fresh bridge rebuild switch missing"};
    if(bridge.crossed||bridge.collapsed||bridge.rebuilt)return{error:"Bridge was already triggered"};
    const horizontal=side==="west"||side==="east",dx=side==="west"?1:side==="east"?-1:0,
      dy=side==="north"?1:side==="south"?-1:0;
    const ordered=[...bridge.bridgeTiles].sort((a,b)=>horizontal?(a.x-b.x)*dx:(a.y-b.y)*dy);
    const near={x:ordered[0].x-dx,y:ordered[0].y-dy},
      far={x:ordered.at(-1).x+dx,y:ordered.at(-1).y+dy};
    if(world.map[near.y]?.[near.x]!==0||world.map[far.y]?.[far.x]!==0)
      return{error:"Generated bridge approach has impassable underlying terrain",near,far,side};
    // Create an actual TAB-drop at the entrance and cross empty-handed.
    p1.inventory=[{kind:"banishment",name:"Banishment Flask",short:"BANISH",qty:1}];
    p1.x=near.x;p1.y=near.y;p1.rx=p1.x;p1.ry=p1.y;
    p1.hitStunMs=0;p1.health=Math.max(5000,Number(p1.health)||0);
    const droppedBefore=new Set((host.items||[]).map(i=>i.id));
    dropInventorySlot(p1,0);
    const dropped=(host.items||[]).find(i=>!droppedBefore.has(i.id)&&i.active&&i.carriedItem?.kind==="banishment");
    if(!dropped||PGR.inventoryCount(p1)!==0)return{error:"Actual inventory drop was not available"};
    const positions=[];
    for(let i=0;i<ordered.length+1;i++){
      movePlayer(p1,dx,dy);
      positions.push({x:p1.x,y:p1.y});
    }
    const thief=(host.enemies||[]).find(e=>e.id===bridge.thiefId&&e.bridgeThief);
    const afterCross={
      crossed:bridge.crossed,collapsed:bridge.collapsed,rebuilt:bridge.rebuilt,
      playerAtFar:p1.x===far.x&&p1.y===far.y,
      stolen:bridge.stolenItems?.filter(i=>i.carriedItem?.kind==="banishment").length||0,
      dropInactive:dropped.active===false,
      thiefAlive:Boolean(thief?.alive),thiefId:bridge.thiefId,
      path:positions
    };
    movePlayer(p1,-dx,-dy);
    const blockedReturn=p1.x===far.x&&p1.y===far.y;
    const switchActuated=activateSwitch(s,p1,true);
    const afterSwitch={rebuilt:bridge.rebuilt,collapsed:bridge.collapsed,
      stabilized:bridge.stabilized,switchInactive:!s.active,switchToggled:s.toggled,
      actuated:Boolean(switchActuated)};
    const back=[];
    for(let i=0;i<ordered.length+1;i++){movePlayer(p1,-dx,-dy);back.push({x:p1.x,y:p1.y})}
    const returned=p1.x===near.x&&p1.y===near.y;
    const beforeScore=score;
    if(thief?.alive){thief.hp=1;thief.armor=0;damageEnemy(thief,500,"energy",p1)}
    return{
      side,near,far,afterCross,blockedReturn,afterSwitch,returned,returnPath:back,
      thiefDefeated:Boolean(bridge.thiefDefeated&&thief?.alive===false),
      flaskCount:PGR.inventoryKindCount(p1,"banishment"),
      recoveredCount:Number(bridge.recoveredItemCount||0),
      recoveredToInventory:Number(bridge.recoveredToInventory||0),
      pending:Number(bridge.pendingStolenItemCount||0),
      scoreDelta:score-beforeScore,
      mode
    };
  });
  assert.ok(!state.error,JSON.stringify(state));
  assert.equal(state.afterCross.crossed,true,"Actual movement must trigger the Trickster Bridge");
  assert.equal(state.afterCross.collapsed,true,"Crossing must collapse the first span");
  assert.equal(state.afterCross.rebuilt,false);
  assert.equal(state.afterCross.playerAtFar,true,JSON.stringify(state.afterCross.path));
  assert.equal(state.afterCross.stolen,1,"A real dropped Flask must move to the thief ledger");
  assert.equal(state.afterCross.dropInactive,true,"Stolen floor item must be deactivated");
  assert.equal(state.afterCross.thiefAlive,true,"Bridge crossing must spawn a live Dungeon Thief");
  assert.equal(state.blockedReturn,true,"Walking back onto collapsed span must be refused");
  assert.equal(state.afterSwitch.actuated,true,"Shot-qualified switch owner must accept rebuild");
  assert.equal(state.afterSwitch.rebuilt,true);
  assert.equal(state.afterSwitch.collapsed,false);
  assert.equal(state.afterSwitch.stabilized,true);
  assert.equal(state.afterSwitch.switchInactive,true);
  assert.equal(state.afterSwitch.switchToggled,true);
  assert.equal(state.returned,true,JSON.stringify(state.returnPath));
  assert.equal(state.thiefDefeated,true,"Actual damage owner must resolve the thief defeat");
  assert.equal(state.flaskCount,1,"Stolen Flask must return to the player's inventory once");
  assert.equal(state.recoveredCount,1);
  assert.equal(state.recoveredToInventory,1);
  assert.equal(state.pending,0);
  assert.ok(state.scoreDelta>=750,"Defeated Dungeon Thief must still grant his advertised bonus");
  assert.equal(state.mode,"playing");
}

// Real browser death/respawn integration for the repaired Trickster Bridge.
// This stages the collapsed-bridge condition on a generated Floor 5, then
// invokes the authoritative player-death owner. It is NOT a natural keyboard
// crossing, owner's original saved incident or complete Windows acceptance.
async function probeFloorFiveBridgeDeath(page){
  const before=await snapshot(page);
  assert.equal(before.floor,5,"Bridge death probe requires the generated fifth floor");
  const result=await page.evaluate(()=>{
    const bridge=host?.weightBridge;
    if(!bridge?.rewardPos||!bridge?.switchId)return{error:"Generated Trickster Bridge/switch missing"};
    const switchOwner=(host.switches||[]).find(s=>s.id===bridge.switchId&&s.weightBridgeSwitch);
    if(!switchOwner)return{error:"Real far-side rebuild switch missing"};
    const farSide={...bridge.rewardPos},playerId=String(p1.id||p1.name||"P1");
    // Stage only the hard-to-reach state. The actual death, cache, respawn,
    // bridge release and confirmation below run through canonical owners.
    bridge.crossed=true;bridge.collapsed=true;bridge.rebuilt=false;
    bridge.stabilized=false;bridge.crossingPlayer=null;
    bridge.thiefId=bridge.thiefId||"floor-five-bridge-death-fixture";
    bridge.thiefDefeated=false;
    bridge.stolenItems=[{id:"dropped-bridge-flask-fixture",carriedItem:{kind:"banishment",qty:1}}];
    switchOwner.active=true;switchOwner.toggled=false;
    run.daily=false;
    p1.totalXp=Math.max(10000,Number(p1.totalXp)||0);
    p1.xp=Math.max(1000,Number(p1.xp)||0);
    run.bankedXP=Math.max(10000,Number(run.bankedXP)||0);
    score=Math.max(2000,Number(score)||0);
    p1.x=farSide.x;p1.y=farSide.y;p1.rx=p1.x;p1.ry=p1.y;
    p1.health=1;p1.invuln=0;p1.armor=0;p1.hitStunMs=0;
    const deathsBefore=Number(run.stats.deaths||0),scoreBefore=score;
    hurtPlayer(p1,1,false,"bridge recovery regression");
    const deathCache=(host.deathCaches||[]).find(c=>c.active&&c.x===farSide.x&&c.y===farSide.y);
    const state={
      modeAfterDeath:mode,
      deaths:Number(run.stats.deaths||0)-deathsBefore,
      scoreBefore,scoreAfter:score,
      playerAtStart:p1.x===world.start.x&&p1.y===world.start.y,
      repaired:bridge.rebuilt&&!bridge.collapsed&&bridge.stabilized,
      switchDisabled:switchOwner.active===false&&switchOwner.toggled===true,
      stolenFlaskCount:(bridge.stolenItems||[]).filter(x=>x.carriedItem?.kind==="banishment").length,
      thiefId:bridge.thiefId,
      deathCache:!!deathCache,
      message:String(pendingDeathConfirmation?.toastText||""),
      confirmed:false,
      modeAfterConfirm:""
    };
    // Consume the actual death confirmation; do not leave the existing
    // browser suite trapped in a modal or with gameplay disabled.
    if(mode==="respawning")state.confirmed=finishPendingDeathRespawn({playerId});
    state.modeAfterConfirm=mode;
    return state;
  });
  assert.ok(!result.error,JSON.stringify(result));
  assert.equal(result.modeAfterDeath,"respawning","Fatal hit must enter canonical death confirmation");
  assert.equal(result.deaths,1,"A single bridge death must count once");
  assert.equal(result.scoreAfter,Math.floor(result.scoreBefore/2),"Death must retain the normal score penalty");
  assert.equal(result.playerAtStart,true,"Real respawn must return the hero to floor entrance");
  assert.equal(result.repaired,true,"The collapsed bridge must become traversable on respawn");
  assert.equal(result.switchDisabled,true,"The far-side switch cannot remain a second required action");
  assert.equal(result.stolenFlaskCount,1,"A stolen Banishment Flask must not vanish on death");
  assert.ok(result.thiefId,"Bridge thief tracking must survive the player's death");
  assert.equal(result.deathCache,true,"Actual death-cache owner must preserve recoverable belongings/score");
  assert.match(result.message,/Trickster Bridge has rebuilt after your death/);
  assert.equal(result.confirmed,true,"Canonical confirmation must resume play");
  assert.equal(result.modeAfterConfirm,"playing");
  await page.waitForFunction(previous=>Number(window.CCGLostSizzlerV141R59LiveRegressionFixes?.state?.acceptedFrames||0)>previous,
    before.acceptedFrames,{timeout:3500,polling:25});
}

// Browser-level, staged Floor 5 pressure: actual world simulation runs with
// Guardian Maw, Count Loadula and the Death Stalker alive at 2/3 generators.
// This is a long-running interaction probe, not the owner's original save.
async function probeFloorFiveTripleThreatPressure(context,origin){
  const page=await context.newPage();
  page.setDefaultTimeout(30000);
  const errors=[];
  page.on("pageerror",error=>errors.push(String(error?.stack||error)));
  try{
    await page.goto(`${origin}/arcade/lost-sizzler/?r78-floor5-triple-pressure=1`,{waitUntil:"domcontentloaded"});
    await page.waitForFunction(()=>document.body.dataset.releaseReady==="true"&&
      Boolean(window.CCGLostSizzlerV141R59LiveRegressionFixes),null,{timeout:90000});
    await page.evaluate(()=>{try{window.CCGProgression?.clearCheckpoint?.()}catch(_){}});
    await page.click("#solo-btn");
    await settleFloor(page,1);
    for(let floor=2;floor<=5;floor++){
      await page.evaluate(()=>floorComplete("R78 live Floor 5 triple-pressure acceptance"));
      await page.waitForFunction(()=>mode==="floorcomplete",null,{timeout:10000});
      await page.evaluate(()=>descendFloor());
      await settleFloor(page,floor);
    }
    const staged=await page.evaluate(()=>{
      const fight=host?.r114BossFight,room=world?.rooms?.[fight?.roomId],
        maw=(host?.enemies||[]).find(e=>e.id===fight?.bossId&&e.alive),
        deathStalker=(host?.enemies||[]).find(e=>e.alive&&e.deathStalker&&e.voidStalker),
        count=host?.stalker,gens=(host?.generators||[]).filter(g=>g.alive);
      if(run?.floor!==5||!room||!maw||!deathStalker||!count||gens.length!==3)
        return{error:"Generated Floor 5 Maw, Count, Stalker or three generators missing"};
      const cells=[];
      for(let y=room.y+1;y<room.y+room.h;y++)for(let x=room.x+1;x<room.x+room.w;x++){
        if(world.map[y]?.[x]!==0||W.roomAt(world,x,y)!==fight.roomId||
           !W.playerWalkable(world.map,x,y,host)||
           (host.blockingDecor||[]).some(d=>d.x===x&&d.y===y)||
           (host.generators||[]).some(g=>g.alive&&g.x===x&&g.y===y)||
           (host.chests||[]).some(c=>c.active&&c.x===x&&c.y===y)||
           (host.items||[]).some(i=>i.active&&i.x===x&&i.y===y))continue;
        cells.push({x,y});
      }
      const playerCell=cells.find(q=>Math.abs(q.x-maw.x)+Math.abs(q.y-maw.y)>=3&&
        !(host.enemies||[]).some(e=>e.alive&&e.x===q.x&&e.y===q.y));
      const rivals=cells.filter(q=>playerCell&&(q.x!==playerCell.x||q.y!==playerCell.y)&&
        (q.x!==maw.x||q.y!==maw.y)&&
        !(host.enemies||[]).some(e=>e.alive&&e.x===q.x&&e.y===q.y)&&
        Math.abs(q.x-playerCell.x)+Math.abs(q.y-playerCell.y)>=2);
      if(!playerCell||rivals.length<2)return{error:"Maw room lacks independent walkable pressure cells"};
      p1.x=playerCell.x;p1.y=playerCell.y;p1.rx=p1.x;p1.ry=p1.y;
      p1.maxHealth=5000;p1.health=5000;p1.armor=0;p1.hitStunMs=0;p1.invuln=0;
      p1.controlLocked=false;p1.controlsLocked=false;
      deathStalker.x=rivals[0].x;deathStalker.y=rivals[0].y;
      deathStalker.dossierSeen=true;deathStalker.aiState="chase";
      deathStalker.moveCooldown=180;deathStalker.attackCooldown=950;
      count.x=rivals[1].x;count.y=rivals[1].y;
      count.stunMs=0;count.spawnTimer=0;count.moveCooldown=180;
      for(const e of host.enemies||[])e.dossierSeen=true;
      for(const g of gens.slice(0,2))damageGenerator(g,Math.max(1,g.hp),p1);
      const triggered=triggerBossFight(p1);
      updateStalker(16);updateFloorObjective();
      return{
        triggered,frames:Number(window.CCGLostSizzlerV141R59LiveRegressionFixes?.state?.acceptedFrames||0),
        elapsed:Number(host.floorElapsed||0),
        floor:Number(run.floor),destroyed:gens.filter(g=>!g.alive).length,
        remaining:(host.generators||[]).filter(g=>g.alive).length,
        complete:Boolean(host.objective?.complete),exit:Boolean(host.exitOpen),
        mawAlive:maw.alive,bossTriggered:Boolean(fight.triggered),
        stalkerAlive:deathStalker.alive,countAwake:Boolean(count.awake),
        mode:String(mode||"")
      };
    });
    assert.ok(!staged.error,JSON.stringify(staged));
    assert.equal(staged.triggered,true,"Guardian Maw chamber must begin a genuine boss lockdown");
    assert.equal(staged.destroyed,2);
    assert.equal(staged.remaining,1);
    assert.equal(staged.complete,false);
    assert.equal(staged.exit,false);
    assert.equal(staged.mawAlive,true);
    assert.equal(staged.bossTriggered,true);
    assert.equal(staged.stalkerAlive,true);
    assert.equal(staged.countAwake,true);
    assert.equal(staged.mode,"playing");
    await page.waitForTimeout(12000);
    const after=await page.evaluate(()=>{
      const fight=host.r114BossFight;
      return{
        floor:Number(run?.floor||0),mode:String(mode||""),
        frames:Number(window.CCGLostSizzlerV141R59LiveRegressionFixes?.state?.acceptedFrames||0),
        elapsed:Number(host.floorElapsed||0),
        remaining:(host.generators||[]).filter(g=>g.alive).length,
        complete:Boolean(host.objective?.complete),exit:Boolean(host.exitOpen),
        mawAlive:Boolean((host.enemies||[]).find(e=>e.id===fight?.bossId)?.alive),
        bossTriggered:Boolean(fight?.triggered),
        stalkerAlive:Boolean((host.enemies||[]).find(e=>e.deathStalker&&e.voidStalker)?.alive),
        countAwake:Boolean(host.stalker?.awake),health:Number(p1.health||0),
        enemyShots:(enemyBullets||[]).length
      };
    });
    assert.equal(after.floor,5);
    assert.equal(after.mode,"playing","Three simultaneous threats cannot freeze or leave live gameplay");
    assert.ok(after.frames>=staged.frames+45,"The authoritative simulation must keep accepting frames");
    assert.ok(after.elapsed>=staged.elapsed+7000,"The live floor timer must keep advancing");
    assert.equal(after.remaining,1,"The third generator cannot vanish without a player hit");
    assert.equal(after.complete,false,"2/3 generators and a living Maw cannot finish the objective");
    assert.equal(after.exit,false);
    assert.equal(after.mawAlive,true);
    assert.equal(after.bossTriggered,true);
    assert.equal(after.stalkerAlive,true);
    assert.equal(after.countAwake,true);
    assert.ok(after.health>0);
    assert.deepEqual(errors,[],"The simultaneous Floor 5 encounter must produce no JS faults");
    console.log("Dungeon R78 live 12s Count/Maw/Stalker at 2/3 generators passed:",JSON.stringify(after));
  }finally{
    await page.close();
  }
}

async function proveFire(page,floor){
  const before=await page.evaluate(()=>{
    p1.maxHealth=Math.max(5000,Number(p1.maxHealth)||0);p1.health=p1.maxHealth;p1.invuln=0;p1.hitStunMs=0;
    p1.firearmUnlocked=true;p1.maxMana=Math.max(1000,Number(p1.maxMana)||0);p1.mana=p1.maxMana;
    window.CCGLostSizzlerV142R47FirearmEvolution?.collapseOwnership?.(p1);
    for(const enemy of host.enemies||[])enemy.alive=false;
    if(host.stalker)host.stalker.awake=false;
    fire1=0;fireBuffer1=0;projectileCD=0;input.clear();
    return{mana:Number(p1.mana),tier:Number(p1.weaponEvolutionTier||p1.weaponLevel||0)};
  });
  assert.ok(before.tier>=1,`floor ${floor}: evolving firearm must be owned before firing`);
  await page.keyboard.down("Space");
  await page.waitForTimeout(260);
  await page.keyboard.up("Space");
  await page.waitForFunction(mana=>Number(p1?.mana||0)<Number(mana),before.mana,{timeout:3500,polling:20});
  const after=await snapshot(page);
  assert.equal(after.mode,"playing",`floor ${floor}: firing must leave gameplay active`);
  assert.equal(after.active,"true",`floor ${floor}: firing must not deactivate the run`);
  assert.ok(after.mana<before.mana,`floor ${floor}: firearm must consume ammunition`);
  return after;
}

try{
  const context=await browser.newContext({viewport:{width:1600,height:900}});
  await context.route("https://*.supabase.co/**",route=>route.fulfill({status:200,contentType:"application/json",headers:{"access-control-allow-origin":"*"},body:"{}"}));
  await context.addInitScript(()=>{try{localStorage.setItem("ccg-lost-sizzler-tutorial-seen-v1","true");localStorage.setItem("ccg-lost-sizzler-tutorial-complete-v1","true")}catch(_){}});
  const page=await context.newPage();page.setDefaultTimeout(60000);
  const errors=[],failedScripts=[];
  page.on("pageerror",error=>errors.push(String(error?.stack||error)));
  page.on("requestfailed",request=>{try{const url=new URL(request.url());if(url.origin===origin&&/\.js$/i.test(url.pathname))failedScripts.push(`${url.pathname}: ${request.failure()?.errorText||"failed"}`)}catch(_){}});

  await page.goto(`${origin}/arcade/lost-sizzler/?r78-five-floor-transition=1`,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.body.dataset.releaseReady==="true"&&Boolean(window.CCGLostSizzlerV142R47FirearmEvolution)&&Boolean(window.CCGLostSizzlerV142FiveDepthCampaign)&&Boolean(window.CCGLostSizzlerV141R59LiveRegressionFixes),null,{timeout:90000});
  const boot=await page.evaluate(()=>({build:window.CCGLostSizzlerV142Bootstrap?.build,cache:window.CCGLostSizzlerV142Bootstrap?.cache}));
  assert.equal(boot.build,expectedBuild);assert.equal(boot.cache,expectedCache);

  await page.evaluate(()=>{try{window.CCGProgression?.clearCheckpoint?.()}catch(_){}});
  await page.click("#solo-btn");
  await settleFloor(page,1);

  const floors=[];
  floors.push(await proveFire(page,1));
  for(let next=2;next<=5;next++){
    const beforeTransition=await snapshot(page);
    await page.evaluate(()=>floorComplete("R78 five-floor transition acceptance"));
    await page.waitForFunction(()=>mode==="floorcomplete"&&!document.getElementById("floor-complete")?.classList.contains("hidden"),null,{timeout:10000});
    await page.evaluate(()=>descendFloor());
    await settleFloor(page,next);
    const entered=await snapshot(page);
    assert.equal(entered.floor,next,`descent must reach floor ${next}`);
    assert.ok(entered.deepest>=next,`deepest-floor progress must reach ${next}`);
    assert.ok(entered.acceptedFrames>beforeTransition.acceptedFrames,`simulation clock must continue across descent to floor ${next}`);
    if(next===5)await probeFloorFiveSoftlockGuards(page);
    floors.push(await proveFire(page,next));
  }

  await probeFloorFiveBridgeTraversal(page);
  await probeFloorFiveBridgeDeath(page);

  assert.deepEqual(floors.map(row=>row.floor),[1,2,3,4,5],"real campaign transition path must reach all five floors in order");
  assert.equal(floors[1].clue,true,"Floor 2 must install the blood-clue puzzle");
  assert.equal(floors[2].memory,true,"Floor 3 must install the Memory Vault puzzle");
  assert.equal(floors[3].torch,true,"Floor 4 must install the sequence-torch puzzle");
  assert.equal(floors[4].weight,true,"Floor 5 must install the Weight Bridge puzzle");
  assert.ok(floors.every(row=>row.firearmUnlocked&&row.weaponTier>=1),"evolving firearm ownership must survive every floor entry");
  assert.deepEqual(errors,[],`five-floor transition acceptance must not raise page errors: ${errors.join("\n")}`);
  assert.deepEqual(failedScripts,[],`five-floor transition acceptance must not lose same-origin scripts: ${failedScripts.join("\n")}`);

  console.log("Dungeon R78 real Floor 1→5 transition, puzzle installation and firearm continuity acceptance passed.");
  await page.evaluate(()=>{try{window.CCGProgression?.clearCheckpoint?.()}catch(_){}});
  await page.close();
  await probeFloorFiveTripleThreatPressure(context,origin);
  await context.close();
}finally{
  await browser.close();for(const socket of sockets)socket.destroy();await new Promise(resolve=>server.close(()=>resolve()));
}
