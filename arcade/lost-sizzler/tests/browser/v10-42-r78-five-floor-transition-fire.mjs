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
  await context.close();
}finally{
  await browser.close();for(const socket of sockets)socket.destroy();await new Promise(resolve=>server.close(()=>resolve()));
}
