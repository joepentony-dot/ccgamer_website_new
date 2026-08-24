import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {chromium} from "playwright";

const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,"../../..");
const TEST_TIMEOUT_MS=90000;
const STAGE_TIMEOUT_MS=20000;
const CLEANUP_TIMEOUT_MS=5000;
const startedAt=Date.now();
let currentStage="initialising";

function logStage(name){
  currentStage=name;
  console.log(`[Lost Sizzler browser] ${name}`);
}

function withTimeout(promise,ms,label){
  let timer;
  return Promise.race([
    Promise.resolve(promise),
    new Promise((_,reject)=>{
      timer=setTimeout(()=>reject(new Error(`${label} timed out after ${ms}ms`)),ms);
    })
  ]).finally(()=>clearTimeout(timer));
}

const watchdog=setTimeout(()=>{
  console.error(`[Lost Sizzler browser] OVERALL TIMEOUT at stage: ${currentStage}`);
  process.exitCode=1;
  process.exit(1);
},TEST_TIMEOUT_MS);
watchdog.unref?.();

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
server.on("connection",socket=>{
  sockets.add(socket);
  socket.on("close",()=>sockets.delete(socket));
});

logStage("start local server");
await withTimeout(new Promise((resolve,reject)=>{
  server.once("error",reject);
  server.listen(0,"127.0.0.1",resolve);
}),5000,"local server startup");
const origin=`http://127.0.0.1:${server.address().port}`;
const canonical=`${origin}/arcade/lost-sizzler/`;
const legacy=`${origin}/games/ccg-games/cheeky-commodore-quest/`;

logStage("launch Chromium");
const browser=await withTimeout(chromium.launch({headless:true,args:["--disable-dev-shm-usage","--disable-background-networking","--autoplay-policy=no-user-gesture-required"]}),15000,"Chromium launch");
const contexts=[];

async function newGamePage(viewport={width:1600,height:900}){
  const context=await withTimeout(browser.newContext({viewport}),5000,"browser context creation");
  contexts.push(context);
  const page=await withTimeout(context.newPage(),5000,"browser page creation");
  page.setDefaultTimeout(10000);
  page.setDefaultNavigationTimeout(15000);
  const pageErrors=[];
  let crashed=false;
  page.on("pageerror",error=>pageErrors.push(String(error?.stack||error)));
  page.on("crash",()=>{crashed=true;console.error(`[Lost Sizzler browser] PAGE CRASH during ${currentStage}`);});
  page.on("console",message=>{
    if(message.type()==="error")console.error(`[browser console] ${message.text()}`);
  });
  page.on("request",request=>{
    const url=request.url();
    if(url.includes("/arcade/lost-sizzler/js/"))console.log(`[browser script] ${new URL(url).pathname}${new URL(url).search}`);
  });
  return{context,page,pageErrors,crashed:()=>crashed};
}

async function assertHealthy(state,label){
  assert.equal(state.crashed(),false,`${label}: Chromium page did not crash`);
  assert.deepEqual(state.pageErrors,[],`${label}: no uncaught browser errors: ${state.pageErrors.join("\n")}`);
  assert.equal(await withTimeout(state.page.evaluate(()=>document.body.dataset.gameReady),5000,`${label} ready-state read`),"true",`${label}: game reaches ready state`);
  assert.equal(await withTimeout(state.page.evaluate(()=>Boolean(window.__CCG_LOST_SIZZLER_EARLY_RESIZE_GUARD__)),5000,`${label} resize-guard read`),true,`${label}: early canvas guard is active`);
}

async function waitForReady(state,label){
  await withTimeout(state.page.waitForFunction(()=>document.body.dataset.gameReady==="true",null,{timeout:15000}),STAGE_TIMEOUT_MS,`${label} gameReady`);
}

async function closeSafely(target,label){
  try{await withTimeout(target.close(),CLEANUP_TIMEOUT_MS,label);}catch(error){console.warn(`[Lost Sizzler browser] ${label}: ${error.message}`);}
}

try{
  {
    logStage("canonical desktop: create page");
    const state=await newGamePage();
    logStage("canonical desktop: navigate");
    await withTimeout(state.page.goto(canonical,{waitUntil:"domcontentloaded",timeout:15000}),STAGE_TIMEOUT_MS,"canonical navigation");
    logStage("canonical desktop: wait for gameReady");
    await waitForReady(state,"canonical desktop");
    await state.page.waitForTimeout(1200);
    logStage("canonical desktop: health check");
    await assertHealthy(state,"canonical desktop launch");

    logStage("canonical desktop: metadata and script dedupe");
    const canonicalHref=await withTimeout(state.page.locator('link[rel="canonical"]').getAttribute("href"),5000,"canonical metadata read");
    assert.equal(canonicalHref,"https://www.cheekycommodoregamer.co.uk/arcade/lost-sizzler/","canonical metadata uses the arcade URL");
    const scriptSources=await withTimeout(state.page.evaluate(()=>[...document.scripts].map(script=>script.src).filter(Boolean)),5000,"script source audit");
    const duplicateSources=scriptSources.filter((src,index)=>scriptSources.indexOf(src)!==index);
    assert.deepEqual(duplicateSources,[],`startup does not load the same script twice: ${duplicateSources.join(", ")}`);
    const buildSubtitle=await state.page.locator(".brand p").textContent();
    assert.equal(buildSubtitle?.trim(),"THE LOST SIZZLER — V10.35","the current build subtitle must survive older deferred UI initialisers");
    const voiceAsset=await withTimeout(state.page.evaluate(async()=>{
      const response=await fetch("assets/audio/voice/lost-sizzler-voices.ogg",{cache:"no-store"});
      const bytes=new Uint8Array(await response.arrayBuffer());
      return{ok:response.ok,status:response.status,size:bytes.length,header:String.fromCharCode(...bytes.slice(0,4))};
    }),5000,"recorded voice sprite fetch");
    assert.deepEqual(voiceAsset,{ok:true,status:200,size:191933,header:"OggS"},"browser must receive the complete recorded voice sprite from the canonical path");

    logStage("canonical desktop: canvas stabilisation");
    const menuSamples=[];
    for(let i=0;i<12;i++){
      menuSamples.push(await withTimeout(state.page.evaluate(()=>({w:game.width,h:game.height,pixels:game.width*game.height})),3000,"menu canvas sample"));
      await state.page.waitForTimeout(80);
    }
    const uniqueMenuSizes=new Set(menuSamples.map(sample=>`${sample.w}x${sample.h}`));
    assert.ok(uniqueMenuSizes.size<=3,`menu canvas backing store stabilises instead of reallocating continuously: ${[...uniqueMenuSizes].join(", ")}`);
    assert.ok(menuSamples.every(sample=>sample.pixels<=5000000),"desktop canvas stays within the stability pixel budget");

    logStage("canonical desktop: start Solo run");
    await withTimeout(state.page.locator("#solo-btn").click({timeout:8000,noWaitAfter:true}),10000,"Solo button click");
    logStage("canonical desktop: wait for runActive");
    await withTimeout(state.page.waitForFunction(()=>document.body.dataset.runActive==="true",null,{timeout:15000}),STAGE_TIMEOUT_MS,"Solo run start");
    const achievementRuntime=await state.page.evaluate(()=>({
      count:window.CCGLostSizzlerAchievementsV129?.catalog?.length||0,
      firstRun:Boolean(window.CCGLostSizzlerAchievementsV129?.earned?.("LS_FIRST_RUN")),
      platinum:Boolean(window.CCGLostSizzlerAchievementsV129?.catalog?.some?.(item=>item.key==="LS_CITADEL_PLATINUM"&&item.rarity==="platinum")),
      button:Boolean(document.getElementById("lost-sizzler-achievements-btn"))
    }));
    assert.deepEqual(achievementRuntime,{count:89,firstRun:true,platinum:true,button:true},`the live run must install, persist and expose the complete achievement system: ${JSON.stringify(achievementRuntime)}`);

    logStage("canonical desktop: keyboard movement");
    const keyboardMove=await state.page.evaluate(()=>{
      if(mode==="dossier")hideNamedDossier();
      const choices=[
        {key:"d",dx:1,dy:0},{key:"a",dx:-1,dy:0},{key:"s",dx:0,dy:1},{key:"w",dx:0,dy:-1}
      ];
      const choice=choices.find(q=>W.walkable(world.map,p1.x+q.dx,p1.y+q.dy,host));
      return{choice,start:{x:p1.x,y:p1.y},activeTag:document.activeElement?.tagName||""};
    });
    assert.ok(keyboardMove.choice,`the active run must have a walkable keyboard direction: ${JSON.stringify(keyboardMove)}`);
    await state.page.keyboard.down(keyboardMove.choice.key);
    await state.page.waitForTimeout(700);
    await state.page.keyboard.up(keyboardMove.choice.key);
    await state.page.waitForTimeout(800);
    const keyboardEnd=await state.page.evaluate(()=>({x:p1.x,y:p1.y}));
    assert.notDeepEqual(keyboardEnd,keyboardMove.start,`held keyboard movement must move Player 1 from ${JSON.stringify(keyboardMove.start)}`);

    logStage("canonical desktop: stationary facing attacks");
    await state.page.evaluate(()=>{if(mode==="dossier")hideNamedDossier();input.clear();run.namedDossierAutoShown=true;p1.firearmUnlocked=false;p1.weapon=null;p1.mana=0;p1.hitStunMs=0;p1.dir={x:-1,y:0};p1._meleeSwingAt=0;fire1=0;fireBuffer1=0;});
    await state.page.keyboard.press("Space",{delay:20});
    await state.page.waitForTimeout(80);
    const stationarySword=await state.page.evaluate(()=>({at:Number(p1?._meleeSwingAt||0),dir:p1?._meleeSwingDir||null,playerDir:p1?.dir||null,moving:Boolean(d1())}));
    assert.ok(stationarySword.at>0,`a quick stationary fire tap must start a sword swing: ${JSON.stringify(stationarySword)}`);
    assert.deepEqual(stationarySword.dir,{x:-1,y:0},`a stationary sword tap must swing left when the player faces left: ${JSON.stringify(stationarySword)}`);
    assert.equal(stationarySword.moving,false,"the stationary sword direction check must not rely on a movement key");

    const stationaryGunSetup=await state.page.evaluate(()=>{
      if(mode==="dossier")hideNamedDossier();
      const directions=[{x:0,y:-1},{x:1,y:0},{x:0,y:1},{x:-1,y:0}];
      const dir=directions.find(d=>[1,2,3].every(step=>W.walkable(world.map,p1.x+d.x*step,p1.y+d.y*step,host)&&!(host.enemies||[]).some(e=>e.alive&&e.x===p1.x+d.x*step&&e.y===p1.y+d.y*step)))||directions[0];
      input.clear();bullets.length=0;p1.firearmUnlocked=true;p1.weapon={id:"browser-facing-gun",shots:1,power:1,ttl:40,delay:1,element:"energy"};p1.mana=5;p1.maxMana=Math.max(5,Number(p1.maxMana||5));p1.dir={...dir};p1.hitStunMs=0;fire1=0;fireBuffer1=0;
      return{position:{x:p1.x,y:p1.y},dir:{...p1.dir},mode};
    });
    await state.page.keyboard.press("Space",{delay:20});
    await state.page.waitForTimeout(45);
    const stationaryGun=await state.page.evaluate(()=>{const shot=bullets.find(b=>b.owner===p1.id&&b.style==="browser-facing-gun");return{shot:shot?{dx:shot.dx,dy:shot.dy}:null,playerDir:{...p1.dir},mana:p1.mana,moving:Boolean(d1()),mode,fire1,fireBuffer1}});
    assert.deepEqual(stationaryGun.shot,{dx:stationaryGunSetup.dir.x,dy:stationaryGunSetup.dir.y},`a stationary gun tap must shoot in the player's facing direction: setup=${JSON.stringify(stationaryGunSetup)} result=${JSON.stringify(stationaryGun)}`);
    assert.equal(stationaryGun.moving,false,"the stationary gun direction check must not rely on a movement key");
    await state.page.waitForTimeout(420);

    logStage("canonical desktop: held sword attack");
    await state.page.evaluate(()=>{
      if(mode==="dossier")hideNamedDossier();input.clear();bullets.length=0;run.namedDossierAutoShown=true;
      window.__browserOriginalShowNamedDossier=showNamedDossier;showNamedDossier=()=>false;
      for(const enemy of host.enemies||[]){enemy._browserHeldAlive=enemy.alive;enemy.alive=false}
      const directions=[{x:1,y:0},{x:-1,y:0},{x:0,y:1},{x:0,y:-1}];
      p1.dir=directions.find(d=>W.walkable(world.map,p1.x+d.x,p1.y+d.y,host)&&!(host.generators||[]).some(g=>g.alive&&g.x===p1.x+d.x&&g.y===p1.y+d.y)&&!(host.blockingDecor||[]).some(q=>q.x===p1.x+d.x&&q.y===p1.y+d.y))||directions[0];
      p1.firearmUnlocked=false;p1.weapon=null;p1.mana=0;p1.hitStunMs=0;p1.invuln=999999;p1._meleeSwingAt=0;fire1=0;fireBuffer1=0;
    });
    await state.page.keyboard.down("Space");
    const heldSwingSamples=await state.page.evaluate(async()=>{
      const values=new Set(),modes=new Set(),inputStates=new Set();
      const until=performance.now()+1250;
      while(performance.now()<until){const at=Number(p1?._meleeSwingAt||0);if(at>0)values.add(at);modes.add(mode);inputStates.add(input.has("Space"));await new Promise(resolve=>setTimeout(resolve,45));}
      return{values:[...values],modes:[...modes],inputStates:[...inputStates],fire1,fireBuffer1,hitStunMs:p1.hitStunMs};
    });
    await state.page.keyboard.up("Space");
    assert.ok(heldSwingSamples.values.length>=2,`holding the fire key must auto-repeat sword swings: ${JSON.stringify(heldSwingSamples)}`);
    await state.page.evaluate(()=>{p1.invuln=0;if(window.__browserOriginalShowNamedDossier){showNamedDossier=window.__browserOriginalShowNamedDossier;delete window.__browserOriginalShowNamedDossier}for(const enemy of host.enemies||[])if("_browserHeldAlive" in enemy){enemy.alive=enemy._browserHeldAlive;delete enemy._browserHeldAlive}});

    logStage("canonical desktop: normal vortex damage and knockback");
    const vortexResult=await state.page.evaluate(()=>{
      const tutorial=window.CCGLostSizzlerOnboardingV120?.state;
      if(tutorial){tutorial.active=false;tutorial.tutorialRequested=false;}
      const previousPit=host.rareVortexPit,previous={x:p1.x,y:p1.y,rx:p1.rx,ry:p1.ry,health:p1.health,maxHealth:p1.maxHealth,armor:p1.armor};
      const origin={x:p1.x,y:p1.y};
      host.rareVortexPit={id:"browser-normal-vortex",cells:[origin],training:true,harmless:true};
      p1.health=10;p1.maxHealth=Math.max(10,Number(p1.maxHealth||10));p1.armor=0;delete p1._ccgPitCooldown;
      const triggered=window.CCGLostSizzlerEnvironmentalV121.triggerPlayerPit(p1);
      const result={triggered,before:10,after:p1.health,origin,position:{x:p1.x,y:p1.y},tutorialActive:Boolean(tutorial?.active)};
      host.rareVortexPit=previousPit;p1.x=previous.x;p1.y=previous.y;p1.rx=previous.rx;p1.ry=previous.ry;p1.health=previous.health;p1.maxHealth=previous.maxHealth;p1.armor=previous.armor;delete p1._ccgPitCooldown;
      return result;
    });
    assert.equal(vortexResult.triggered,true,"a normal-mode vortex must trigger");
    assert.equal(vortexResult.after,vortexResult.before-1,`a normal-mode vortex must deal exactly 1 HP: ${JSON.stringify(vortexResult)}`);
    assert.notDeepEqual(vortexResult.position,vortexResult.origin,`a normal-mode vortex must knock the player clear: ${JSON.stringify(vortexResult)}`);

    const activeSwing=await state.page.evaluate(()=>{
      const previous=Number(p1?._meleeSwingAt||0);
      const modeBefore=mode;
      if(mode==="dossier")hideNamedDossier();
      fire1=0;
      if(p1)p1.hitStunMs=0;
      const triggered=window.CCGLostSizzlerMeleeAmmoV125?.meleeAttack?.(p1,p1?.dir);
      return{triggered,modeBefore,mode,fire1,hitStunMs:Number(p1?.hitStunMs||0),previous,at:Number(p1?._meleeSwingAt||0),ms:Number(p1?._meleeSwingMs||0),dir:p1?._meleeSwingDir||null,hasRenderer:typeof drawPlayerWeapon==="function"};
    });
    assert.equal(activeSwing.triggered,true,`the live melee controller must accept a sword attack: ${JSON.stringify(activeSwing)}`);
    assert.ok(activeSwing.at>activeSwing.previous,"a live sword attack must start the player sword animation");
    assert.ok(activeSwing.ms>=220&&activeSwing.ms<=320,`sword swing duration must remain visible and bounded: ${activeSwing.ms}`);
    assert.ok(activeSwing.dir&&(activeSwing.dir.x||activeSwing.dir.y),`sword swing must preserve an attack direction: ${JSON.stringify(activeSwing.dir)}`);
    assert.equal(activeSwing.hasRenderer,true,"active run must install the dedicated player weapon renderer");
    await assertHealthy(state,"active solo run");

    logStage("canonical desktop: resize stress");
    const sizes=[
      {width:1920,height:1080},
      {width:1366,height:768},
      {width:1600,height:900},
      {width:1280,height:720},
      {width:1600,height:900}
    ];
    for(const size of sizes){
      await withTimeout(state.page.setViewportSize(size),5000,`resize ${size.width}x${size.height}`);
      await state.page.waitForTimeout(250);
      const canvas=await withTimeout(state.page.evaluate(()=>({w:game.width,h:game.height,pixels:game.width*game.height})),3000,"canvas budget read");
      assert.ok(canvas.pixels<=5000000,`resize ${size.width}x${size.height} remains inside canvas budget: ${canvas.w}x${canvas.h}`);
      await assertHealthy(state,`resize ${size.width}x${size.height}`);
    }

    logStage("canonical desktop: transient render-state audit");
    const transient=await withTimeout(state.page.evaluate(()=>({
      particles:typeof particles!=="undefined"?particles.length:0,
      rings:typeof rings!=="undefined"?rings.length:0,
      floaters:typeof floaters!=="undefined"?floaters.length:0,
      bullets:typeof bullets!=="undefined"?bullets.length:0,
      enemyBullets:typeof enemyBullets!=="undefined"?enemyBullets.length:0
    })),5000,"transient render-state audit");
    assert.ok(transient.particles<=2600&&transient.rings<=700&&transient.floaters<=700&&transient.bullets<=900&&transient.enemyBullets<=1600,`transient render state remains bounded: ${JSON.stringify(transient)}`);
    logStage("canonical desktop: complete");
  }

  {
    logStage("split-screen startup: create and navigate");
    const state=await newGamePage();
    await withTimeout(state.page.goto(canonical,{waitUntil:"domcontentloaded",timeout:15000}),STAGE_TIMEOUT_MS,"split-screen navigation");
    await waitForReady(state,"split-screen");
    await state.page.locator("#split-btn").click({noWaitAfter:true});
    await withTimeout(state.page.waitForFunction(()=>document.body.dataset.runActive==="true"&&typeof p2!=="undefined"&&Boolean(p2)&&playMode==="split"&&mode==="playing",null,{timeout:15000}),STAGE_TIMEOUT_MS,"split-screen activation");
    const split=await state.page.evaluate(()=>({p1:Boolean(p1),p2:Boolean(p2),sameTile:Boolean(p1&&p2&&p1.x===p2.x&&p1.y===p2.y),playMode,mode,menuHidden:document.getElementById("menu")?.classList.contains("hidden"),fallbackChoiceHidden:document.getElementById("ccg-tutorial-choice")?.classList.contains("hidden")}));
    assert.deepEqual(split,{p1:true,p2:true,sameTile:false,playMode:"split",mode:"playing",menuHidden:true,fallbackChoiceHidden:true},`split-screen must start both players without the retired tutorial chooser: ${JSON.stringify(split)}`);
    await assertHealthy(state,"active split-screen run");
    logStage("split-screen startup: complete");
  }

  {
    logStage("immediate Solo launch: create and navigate");
    const state=await newGamePage();
    await withTimeout(state.page.goto(canonical,{waitUntil:"domcontentloaded",timeout:15000}),STAGE_TIMEOUT_MS,"immediate Solo navigation");
    const releaseAtClick=await state.page.evaluate(()=>document.body.dataset.releaseReady);
    assert.equal(releaseAtClick,"false","the immediate-click test must act before the enhancement queue is release-ready");
    await withTimeout(state.page.locator("#solo-btn").click({timeout:8000,noWaitAfter:true}),10000,"immediate Solo button click");
    await withTimeout(state.page.waitForFunction(()=>document.body.dataset.releaseReady==="true",null,{timeout:15000}),STAGE_TIMEOUT_MS,"release-ready gate completion");
    await withTimeout(state.page.waitForFunction(()=>document.body.dataset.runActive==="true",null,{timeout:15000}),STAGE_TIMEOUT_MS,"queued Solo launch");
    await state.page.waitForTimeout(700);
    const launch=await state.page.evaluate(()=>{
      const named=(host?.enemies||[]).find(enemy=>enemy?.alive&&enemy.follower&&W.roomAt(world,enemy.x,enemy.y)!==W.roomAt(world,p1.x,p1.y));
      return{
        gateReady:Boolean(window.CCGLostSizzlerReleaseGate?.state?.ready),
        gateErrors:window.CCGLostSizzlerReleaseGate?.state?.errors?.length||0,
        polishReady:document.body.dataset.polishReady,
        mode,
        firearmUnlocked:Boolean(p1?.firearmUnlocked),
        weapon:p1?.weapon?.id||null,
        ammo:Number(p1?.mana||0),
        maxAmmo:Number(p1?.maxMana||0),
        melee:p1?.meleeWeapon?.id||null,
        meleeDamage:window.CCGLostSizzlerMeleeAmmoV125?.meleeDamageFor?.(p1),
        dossierHidden:document.getElementById("named-dossier-panel")?.classList.contains("hidden"),
        remoteNamedVisible:named?visibleTo(p1,named.x,named.y):false,
        ammoBudget:{meets:Boolean(host?.ammoBudget?.meetsAccuracyBudget),planned:Number(host?.ammoBudget?.totalPlannedRounds||0),needed:Number(host?.ammoBudget?.roundsNeeded||0)},
        potions:(host?.items||[]).filter(item=>item?.active&&item.kind==="potion").length,
        potionTarget:Number(host?.v130PotionTarget||0)
      };
    });
    assert.equal(launch.gateReady,true,`the complete release queue must be ready before the run starts: ${JSON.stringify(launch)}`);
    assert.equal(launch.gateErrors,0,`no critical release module may fail: ${JSON.stringify(launch)}`);
    assert.equal(launch.polishReady,"true",`V10.33 must install before queued Solo starts: ${JSON.stringify(launch)}`);
    assert.deepEqual({firearmUnlocked:launch.firearmUnlocked,weapon:launch.weapon,ammo:launch.ammo,maxAmmo:launch.maxAmmo,melee:launch.melee},{firearmUnlocked:false,weapon:null,ammo:0,maxAmmo:120,melee:"archive-sword"},`an immediate Solo click must retain sword-first progression: ${JSON.stringify(launch)}`);
    assert.equal(launch.meleeDamage,1,`level-one Archive Sword damage must remain one: ${JSON.stringify(launch)}`);
    assert.equal(launch.dossierHidden,true,`no named-enemy dossier may open at the starting position: ${JSON.stringify(launch)}`);
    assert.equal(launch.remoteNamedVisible,false,`a remote named enemy must not be visible through global follower light: ${JSON.stringify(launch)}`);
    assert.ok(launch.ammoBudget.meets&&launch.ammoBudget.planned>=launch.ammoBudget.needed,`placed ammunition must meet its calculated 50-percent-accuracy budget: ${JSON.stringify(launch)}`);
    assert.ok(launch.potions<=launch.potionTarget&&launch.potionTarget===3,`floor-one ground potions must use the V10.33 target: ${JSON.stringify(launch)}`);

    const pickupGuard=await state.page.evaluate(()=>{
      const health={id:"browser-full-health",x:p1.x,y:p1.y,kind:"health",active:true,title:"TEST HEALTH"};host.items.push(health);p1.health=p1.maxHealth;const healthRequest=requestCollect(health,p1);
      const ammo={id:"browser-nearly-full-ammo",x:p1.x,y:p1.y,kind:"ammo",active:true,title:"TEST AMMO",ammoRounds:40};host.items.push(ammo);p1.mana=p1.maxMana-5;const ammoRequest=requestCollect(ammo,p1);
      const reserve={id:"browser-partial-reserve",x:p1.x,y:p1.y,kind:"ammo",active:true,title:"TEST RESERVE",ammoRounds:200,v130ReserveAmmo:true};host.items.push(reserve);p1.mana=0;const reserveRequest=requestCollect(reserve,p1);
      return{healthRequest,healthActive:health.active,ammoRequest,ammoActive:ammo.active,reserveRequest,reserveActive:reserve.active,reserveRounds:reserve.ammoRounds,playerAmmo:p1.mana};
    });
    assert.deepEqual(pickupGuard,{healthRequest:false,healthActive:true,ammoRequest:false,ammoActive:true,reserveRequest:true,reserveActive:true,reserveRounds:80,playerAmmo:120},`resources must avoid waste and the final reserve must retain rounds that do not fit: ${JSON.stringify(pickupGuard)}`);
    await assertHealthy(state,"immediate queued Solo run");
    logStage("immediate Solo launch: complete");
  }

  {
    logStage("early Tutorial launch: create and navigate");
    const state=await newGamePage();
    await withTimeout(state.page.goto(canonical,{waitUntil:"domcontentloaded",timeout:15000}),STAGE_TIMEOUT_MS,"early Tutorial navigation");
    await withTimeout(state.page.locator("#tutorial-zone-btn").click({timeout:8000,noWaitAfter:true}),10000,"early Tutorial button click");
    await waitForReady(state,"early Tutorial");
    await withTimeout(state.page.waitForFunction(()=>document.body.dataset.runActive==="true"&&window.CCGLostSizzlerOnboardingV120?.state?.active===true,null,{timeout:15000}),STAGE_TIMEOUT_MS,"Tutorial activation");
    await state.page.waitForTimeout(900);
    const tutorialState=await state.page.evaluate(()=>({
      active:Boolean(window.CCGLostSizzlerOnboardingV120?.state?.active),
      requested:Boolean(window.CCGLostSizzlerOnboardingV120?.state?.tutorialRequested),
      step:Number(window.CCGLostSizzlerOnboardingV120?.state?.step||0),
      modalVisible:!document.getElementById("ccg-tutorial-stage-modal")?.classList.contains("hidden"),
      voiceActive:Boolean(window.CCGLostSizzlerVoice?.state?.active),
      voiceQueued:Number(window.CCGLostSizzlerVoice?.state?.queue?.length||0)
    }));
    assert.deepEqual(tutorialState,{active:true,requested:true,step:0,modalVisible:true,voiceActive:false,voiceQueued:0},`early Tutorial selection must activate a silent working tutorial: ${JSON.stringify(tutorialState)}`);
    await state.page.locator("#ccg-tutorial-stage-modal [data-stage-continue]").click();
    const tutorialMove=await state.page.evaluate(()=>{
      const blocked=(x,y)=>(host.blockingDecor||[]).some(q=>q.x===x&&q.y===y)||(host.generators||[]).some(q=>q.alive&&q.x===x&&q.y===y)||(host.enemies||[]).some(q=>q.alive&&q.x===x&&q.y===y);
      let safe=null;for(let y=2;y<world.map.length-2&&!safe;y++)for(let x=2;x<world.map[0].length-2&&!safe;x++)if(W.roomAt(world,x,y)===world.startRoomId&&[[0,0],[0,-1],[0,1],[-1,0],[1,0],[2,0],[3,0]].every(([dx,dy])=>W.walkable(world.map,x+dx,y+dy,host)&&!blocked(x+dx,y+dy)))safe={x,y};
      if(safe){p1.x=p1.rx=safe.x;p1.y=p1.ry=safe.y;p1.dir={x:1,y:0};window.CCGLostSizzlerOnboardingV120.state.lastMovement.set(p1.id||p1,{...safe})}
      return{safe,start:{x:p1.x,y:p1.y},activeTag:document.activeElement?.tagName||""};
    });
    assert.ok(tutorialMove.safe,`Tutorial start area must have a four-direction keyboard training cell: ${JSON.stringify(tutorialMove)}`);
    for(const key of ["w","s","a","d"]){await state.page.keyboard.down(key);await state.page.waitForTimeout(190);await state.page.keyboard.up(key);await state.page.waitForTimeout(180)}
    await withTimeout(state.page.waitForFunction(()=>window.CCGLostSizzlerOnboardingV120?.state?.step>=1,null,{timeout:5000}),7000,"Tutorial four-direction movement step");
    const tutorialProgress=await state.page.evaluate(()=>({step:window.CCGLostSizzlerOnboardingV120.state.step,moved:window.CCGLostSizzlerOnboardingV120.state.moved,directions:[...window.CCGLostSizzlerOnboardingV120.state.movementDirections].sort(),position:{x:p1.x,y:p1.y}}));
    assert.equal(tutorialProgress.moved,true,`Tutorial keyboard movement must register: ${JSON.stringify(tutorialProgress)}`);
    assert.deepEqual(tutorialProgress.directions,["down","left","right","up"],`Tutorial movement must require all four keyboard directions: ${JSON.stringify(tutorialProgress)}`);

    await withTimeout(state.page.waitForFunction(()=>!document.getElementById("ccg-tutorial-stage-modal")?.classList.contains("hidden")&&window.CCGLostSizzlerOnboardingV120.state.step===1,null,{timeout:4000}),6000,"Tutorial sword stage prompt");
    await state.page.locator("#ccg-tutorial-stage-modal [data-stage-continue]").click();
    for(let i=0;i<3;i++){const target=i+1;await state.page.keyboard.press("Space",{delay:30});await withTimeout(state.page.waitForFunction(expected=>Number(window.CCGLostSizzlerOnboardingV120?.state?.swingCount||0)>=expected,target,{timeout:1800}),2400,`Tutorial sword action ${target}/3`);const live=await state.page.locator("#ccg-tutorial-live-progress").innerText();assert.match(live,new RegExp(`${target}\\s*\\/\\s*3`),`sword overlay must repaint at ${target}/3 after a successful swing: ${live}`)}
    await withTimeout(state.page.waitForFunction(()=>window.CCGLostSizzlerOnboardingV120?.state?.step>=2,null,{timeout:5000}),7000,"Tutorial three-sword step");
    const swordProgress=await state.page.evaluate(()=>({step:window.CCGLostSizzlerOnboardingV120.state.step,count:window.CCGLostSizzlerOnboardingV120.state.swingCount}));
    assert.equal(swordProgress.count,3,`Tutorial sword training must require three successful swings: ${JSON.stringify(swordProgress)}`);

    await withTimeout(state.page.waitForFunction(()=>!document.getElementById("ccg-tutorial-stage-modal")?.classList.contains("hidden")&&window.CCGLostSizzlerOnboardingV120.state.step===2,null,{timeout:4000}),6000,"Tutorial dash stage prompt");
    await state.page.locator("#ccg-tutorial-stage-modal [data-stage-continue]").click();
    for(let i=0;i<3;i++){
      await state.page.evaluate(safe=>{p1.x=p1.rx=safe.x;p1.y=p1.ry=safe.y;p1.dir={x:1,y:0};p1._v125LastDashAt=0},tutorialMove.safe);
      const target=i+1;await state.page.keyboard.press("ShiftLeft",{delay:30});await withTimeout(state.page.waitForFunction(expected=>Number(window.CCGLostSizzlerOnboardingV120?.state?.dashCount||0)>=expected,target,{timeout:1800}),2400,`Tutorial dash action ${target}/3`);const live=await state.page.locator("#ccg-tutorial-live-progress").innerText();assert.match(live,new RegExp(`${target}\\s*\\/\\s*3`),`dash overlay must repaint at ${target}/3 after a successful dash: ${live}`);
    }
    await withTimeout(state.page.waitForFunction(()=>window.CCGLostSizzlerOnboardingV120?.state?.step>=3,null,{timeout:5000}),7000,"Tutorial three-dash step");
    const dashProgress=await state.page.evaluate(()=>({step:window.CCGLostSizzlerOnboardingV120.state.step,count:window.CCGLostSizzlerOnboardingV120.state.dashCount,voiceActive:Boolean(window.CCGLostSizzlerVoice?.state?.active),voiceQueued:Number(window.CCGLostSizzlerVoice?.state?.queue?.length||0)}));
    assert.deepEqual(dashProgress,{step:3,count:3,voiceActive:false,voiceQueued:0},`Tutorial dash training must require three successful silent dashes: ${JSON.stringify(dashProgress)}`);

    await withTimeout(state.page.waitForFunction(()=>!document.getElementById("ccg-tutorial-stage-modal")?.classList.contains("hidden")&&window.CCGLostSizzlerOnboardingV120.state.step===3,null,{timeout:4000}),6000,"Tutorial inventory stage prompt");
    await state.page.locator("#ccg-tutorial-stage-modal [data-stage-continue]").click();
    await state.page.keyboard.press("Tab");await state.page.waitForTimeout(180);await state.page.keyboard.press("Tab");
    await withTimeout(state.page.waitForFunction(()=>window.CCGLostSizzlerOnboardingV120.state.step===4&&!document.getElementById("ccg-tutorial-stage-modal")?.classList.contains("hidden"),null,{timeout:6000}),8000,"Tutorial information stages");
    for(let step=4;step<=8;step++){
      await state.page.locator("#ccg-tutorial-stage-modal [data-stage-continue]").click();
      await state.page.waitForTimeout(180);
      const tour=await state.page.evaluate(expected=>({step:window.CCGLostSizzlerOnboardingV120.state.step,tourVisible:!document.getElementById("ccg-tutorial-info-tour")?.classList.contains("hidden"),modalHidden:document.getElementById("ccg-tutorial-stage-modal")?.classList.contains("hidden"),cards:document.querySelectorAll("#ccg-tutorial-info-tour .tour-item").length,highlights:document.querySelectorAll(".ccg-tutorial-info-highlight").length}),step);
      assert.equal(tour.step,step,`information lesson ${step+1}/10 must pause on its live tour: ${JSON.stringify(tour)}`);assert.equal(tour.tourVisible,true);assert.equal(tour.modalHidden,true);assert.ok(tour.cards>=3,`lesson ${step+1}/10 needs its complete graphical examples: ${JSON.stringify(tour)}`);assert.ok(tour.highlights>=3,`lesson ${step+1}/10 needs live interface indicators: ${JSON.stringify(tour)}`);
      await state.page.locator("#ccg-tutorial-info-tour [data-tour-continue]").click();
      await withTimeout(state.page.waitForFunction(next=>window.CCGLostSizzlerOnboardingV120.state.step===next&&!document.getElementById("ccg-tutorial-stage-modal")?.classList.contains("hidden"),step+1,{timeout:4000}),6000,`Tutorial stage ${step+2}/10 prompt`);
    }
    const finalTutorial=await state.page.evaluate(()=>({copy:document.getElementById("ccg-tutorial-stage-modal")?.innerText||"",exitButtons:document.querySelectorAll("#ccg-tutorial-stage-modal [data-stage-exit]").length,completeButtons:document.querySelectorAll("#ccg-tutorial-stage-modal [data-stage-continue]").length}));
    assert.match(finalTutorial.copy,/You Are Ready To Take On The Adventure!/i,`final tutorial copy is incomplete: ${JSON.stringify(finalTutorial)}`);assert.deepEqual({exitButtons:finalTutorial.exitButtons,completeButtons:finalTutorial.completeButtons},{exitButtons:0,completeButtons:1},`final tutorial must have one completion action: ${JSON.stringify(finalTutorial)}`);
    await assertHealthy(state,"active silent Tutorial");
    logStage("early Tutorial launch: complete");
  }

  {
    logStage("mobile landscape: create and navigate");
    const state=await newGamePage({width:844,height:390});
    await withTimeout(state.page.goto(canonical,{waitUntil:"domcontentloaded",timeout:15000}),STAGE_TIMEOUT_MS,"mobile navigation");
    logStage("mobile landscape: wait for gameReady");
    await waitForReady(state,"mobile landscape");
    await state.page.waitForTimeout(900);
    await assertHealthy(state,"mobile landscape launch");
    const canvas=await withTimeout(state.page.evaluate(()=>({w:game.width,h:game.height,pixels:game.width*game.height})),3000,"mobile canvas budget read");
    assert.ok(canvas.pixels<=1900000,`mobile canvas remains inside coarse-device budget ceiling: ${canvas.w}x${canvas.h}`);
    logStage("mobile landscape: complete");
  }

  {
    logStage("legacy redirect: create and navigate");
    const state=await newGamePage();
    await withTimeout(state.page.goto(legacy,{waitUntil:"domcontentloaded",timeout:15000}),STAGE_TIMEOUT_MS,"legacy navigation");
    logStage("legacy redirect: wait for canonical URL");
    await withTimeout(state.page.waitForURL(url=>url.pathname==="/arcade/lost-sizzler/",{timeout:10000}),12000,"legacy redirect");
    logStage("legacy redirect: wait for gameReady");
    await waitForReady(state,"legacy redirect");
    await assertHealthy(state,"legacy redirect launch");
    assert.equal(new URL(state.page.url()).pathname,"/arcade/lost-sizzler/","legacy URL redirects once to canonical arcade runtime");
    logStage("legacy redirect: complete");
  }

  clearTimeout(watchdog);
  console.log(`Lost Sizzler real-browser startup, resize, redirect and crash checks passed in ${Date.now()-startedAt}ms`);
}catch(error){
  clearTimeout(watchdog);
  console.error(`[Lost Sizzler browser] FAILED at stage: ${currentStage}`);
  throw error;
}finally{
  logStage("cleanup browser contexts");
  for(const context of contexts)await closeSafely(context,"context close");
  logStage("cleanup Chromium");
  await closeSafely(browser,"browser close");
  logStage("cleanup local server");
  try{server.closeAllConnections?.();}catch(_){}
  for(const socket of sockets)try{socket.destroy();}catch(_){}
  try{await withTimeout(new Promise(resolve=>server.close(()=>resolve())),CLEANUP_TIMEOUT_MS,"server close");}catch(error){console.warn(`[Lost Sizzler browser] server close: ${error.message}`);}
  clearTimeout(watchdog);
}
