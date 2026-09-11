import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {chromium} from "playwright";

const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,"../../../..");
const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json; charset=utf-8",".svg":"image/svg+xml",".png":"image/png",".webp":"image/webp",".wav":"audio/wav",".mp3":"audio/mpeg",".ogg":"audio/ogg"};
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

try{
  const context=await browser.newContext({viewport:{width:1600,height:900}}),page=await context.newPage();
  page.setDefaultTimeout(60000);
  const errors=[],failedScripts=[];
  page.on("pageerror",error=>errors.push(String(error?.stack||error)));
  page.on("requestfailed",request=>{try{const url=new URL(request.url());if(url.origin===origin&&/\.js(?:\?|$)/i.test(url.pathname))failedScripts.push(`${url.pathname}: ${request.failure()?.errorText||"failed"}`)}catch(_){}});

  await page.goto(`${origin}/arcade/lost-sizzler/?v142-r1-stability=1`,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.body.dataset.v142BootstrapReady==="true"&&Boolean(window.CCGLostSizzlerV142R1Stability)&&Boolean(window.CCGLostSizzlerV142FiveDepthCampaign),null,{timeout:90000});

  const boot=await page.evaluate(()=>({
    build:document.body.dataset.v142Build,
    badge:document.querySelector(".build-badge")?.textContent||"",
    ready:window.CCGLostSizzlerV142Bootstrap?.ready,
    loaded:[...(window.CCGLostSizzlerV142Bootstrap?.loaded||[])],
    cpuName:window.CCG_CONFIG?.followerElites?.find(row=>row.kind==="cook")?.name||""
  }));
  assert.equal(boot.ready,true,"Ordered V10.42 bootstrap must finish before play is allowed.");
  assert.match(boot.build,/V10\.42/i,"Canonical runtime must stamp a V10.42 build identity.");
  assert.match(boot.badge,/V10\.42/i,"Visible build badge must identify V10.42.");
  assert.deepEqual(boot.loaded.slice(-2),["v10-42-r1-stability.js","v10-42-r18-solo-playtest-stability.js"],"R1 combat/playtest stability must remain immediately before the final R18 guarded solo playtest layer.");
  assert.equal(boot.cpuName,"CPU Cook","The cook named enemy must be represented as CPU Cook in the live dossier source.");

  await page.click("#solo-btn");
  await page.waitForFunction(()=>document.body.dataset.runActive==="true"&&mode==="playing"&&Boolean(p1)&&Boolean(host),null,{timeout:20000});

  const shop=await page.evaluate(()=>{
    score=100000;
    const fake={id:"v142-r1-shop-contract",active:true,title:"TEST SHOP",shopType:"normal",sold:{},scorePurchases:0};
    openShop(fake,p1);
    const prices=[shopScorePrice(fake)];
    for(let i=0;i<5;i++){buyShopItem("ammo");prices.push(shopScorePrice(fake))}
    closeShop();
    return{prices,count:fake.scorePurchases,shadow:fake.__v142ScorePurchases};
  });
  assert.deepEqual(shop.prices,[1000,2000,4000,8000,16000,32000],"Repeated score purchases in one shop must progress 1,000 → 2,000 → 4,000 → 8,000 → 16,000 → 32,000.");
  assert.equal(shop.count,5,"Five successful score purchases must advance the shop counter five times.");
  assert.equal(shop.shadow,5,"V10.42 stability counter must stay synchronized with the shop counter.");

  const combatRepair=await page.evaluate(()=>{
    p1.firearmUnlocked=true;p1.weapon=baseWeapon();p1.mana=100;fire1=Number.NaN;projectileCD=Number.NaN;fireBuffer1=Number.NaN;
    const stale={id:"v142-stale",owner:p1.id,x:p1.x,y:p1.y,dx:1,dy:0,ttl:99,__v142BornAt:performance.now()-6000};bullets.push(stale);
    window.CCGLostSizzlerV142R1Stability.repairCombatTimers();window.CCGLostSizzlerV142R1Stability.repairProjectilePool();
    return{fire1,projectileCD,fireBuffer1,staleTtl:stale.ttl,diagnostics:{...window.CCGLostSizzlerV142R1Stability.diagnostics}};
  });
  assert.equal(combatRepair.fire1,0,"Poisoned P1 fire cooldown must recover to zero.");
  assert.equal(combatRepair.projectileCD,0,"Poisoned projectile cadence must recover to zero.");
  assert.equal(combatRepair.fireBuffer1,0,"Poisoned attack buffer must recover to zero.");
  assert.equal(combatRepair.staleTtl,0,"A stale projectile must be retired instead of permanently consuming the projectile ceiling.");
  assert.ok(combatRepair.diagnostics.combatTimerRepairs>=3,"Combat diagnostics must record repaired poisoned timers.");
  assert.ok(combatRepair.diagnostics.staleProjectilesCleared>=1,"Combat diagnostics must record stale projectile recovery.");

  const manaBefore=await page.evaluate(()=>{p1.mana=100;fire1=Number.NaN;projectileCD=Number.NaN;return p1.mana});
  await page.keyboard.press("Space");
  await page.waitForTimeout(350);
  const manaAfter=await page.evaluate(()=>p1.mana);
  assert.ok(manaAfter<manaBefore,"Space attack must still fire after injected cooldown poisoning.");

  await page.evaluate(()=>{
    host.enemies=[];enemyBullets.length=0;hazards.length=0;bullets.length=0;fire1=0;projectileCD=0;p1.mana=220;p1.maxMana=Math.max(p1.maxMana,220);p1.health=Math.max(p1.health,20);p1.maxHealth=Math.max(p1.maxHealth,20);
  });
  for(let i=0;i<30;i++){
    await page.keyboard.press("Space");
    await page.waitForTimeout(200);
  }
  await page.waitForTimeout(1500);
  const sustainedBefore=await page.evaluate(()=>({mana:p1.mana,active:bullets.filter(b=>b.owner===p1.id&&b.ttl>0).length,fire1}));
  await page.keyboard.press("Space");
  await page.waitForTimeout(300);
  const sustainedAfter=await page.evaluate(()=>({mana:p1.mana,active:bullets.filter(b=>b.owner===p1.id&&b.ttl>0).length,fire1}));
  assert.ok(sustainedBefore.mana<220,"Sustained combat exercise must consume ammunition across repeated attack cycles.");
  assert.ok(sustainedAfter.mana<sustainedBefore.mana,"Attack must remain available after a sustained sequence of projectile cycles.");

  await page.evaluate(()=>showNamedDossier("CPU Cook",true));
  await page.waitForFunction(()=>mode==="dossier"&&!document.getElementById("named-dossier-panel")?.classList.contains("hidden"));
  await page.keyboard.press("Space");
  await page.waitForFunction(()=>mode==="playing"&&document.getElementById("named-dossier-panel")?.classList.contains("hidden"));

  const chest=await page.evaluate(()=>{
    p1.mana=1;
    const beforeMana=p1.mana;
    const fakeLoot={kind:"ammo",amount:5,rarity:"COMMON",name:"TEST AMMO CACHE"};
    const originalApplyLoot=applyLoot;
    let lootCalls=0;
    applyLoot=function(loot,player){
      if(loot===fakeLoot)lootCalls++;
      return originalApplyLoot(loot,player);
    };
    window.__v142R1ChestProbe={originalApplyLoot,get calls(){return lootCalls}};
    const recoveriesBefore=window.CCGLostSizzlerV142R1Stability?.diagnostics?.chestLootRecoveries||0;
    const fake={id:"v142-r1-chest-contract",x:p1.x,y:p1.y,active:true,locked:false,depth:2,loot:fakeLoot};
    openChest(p1,fake);
    mode="levelup";
    return{active:fake.active,rewardScore:fake.rewardScore,rewardXp:fake.rewardXp,beforeMana,afterOpenMana:p1.mana,recoveriesBefore};
  });
  assert.equal(chest.active,false,"Opening an unlocked chest must consume the chest.");
  assert.ok(chest.rewardScore>0,"Every opened chest must record a score reward.");
  assert.ok(chest.rewardXp>0,"Every opened chest must record an XP reward.");
  assert.equal(chest.beforeMana,1,"Synthetic chest qualification must begin with exactly one ammunition unit.");
  try{
    await page.waitForFunction(()=>document.getElementById("pickup-title")?.textContent==="CHEST REWARD CONFIRMED",null,{timeout:5000});
  }catch(error){
    const diagnostic=await page.evaluate(({pageErrors})=>{
      const stability=window.CCGLostSizzlerV142R1Stability;
      const diagnostics=stability?.diagnostics||{};
      const player=typeof p1!=="undefined"?p1:null;
      let local=false;
      try{local=Boolean(player&&typeof localPlayers==="function"&&localPlayers().includes(player))}catch(_){ }
      return{
        mode:typeof mode!=="undefined"?mode:undefined,
        pickupTitle:document.getElementById("pickup-title")?.textContent||"",
        pickupBody:document.querySelector("#pickup, #pickup-toast, .pickup, .toast")?.textContent||"",
        p1Mana:player?.mana,
        probeCalls:window.__v142R1ChestProbe?.calls,
        chestLootRecoveries:diagnostics.chestLootRecoveries,
        chestLootRecoveryFailures:diagnostics.chestLootRecoveryFailures,
        chestConfirmationFailures:diagnostics.chestConfirmationFailures,
        chestLastRecoveryError:diagnostics.chestLastRecoveryError,
        runExists:typeof run!=="undefined"&&Boolean(run),
        hostExists:typeof host!=="undefined"&&Boolean(host),
        p1InLocalPlayers:local,
        visibilityState:document.visibilityState,
        pageErrors
      };
    },{pageErrors:errors});
    console.error(`V142_R1_CHEST_DIAGNOSTIC ${JSON.stringify(diagnostic)}`);
    throw error;
  }
  const confirmedChest=await page.evaluate(()=>({
    mana:p1.mana,
    calls:window.__v142R1ChestProbe?.calls||0,
    recoveries:window.CCGLostSizzlerV142R1Stability?.diagnostics?.chestLootRecoveries||0
  }));
  assert.ok(confirmedChest.mana>chest.beforeMana,"The synthetic chest reward must be delivered by the established owner or the V10.42 recovery owner.");
  assert.equal(confirmedChest.calls,1,"The synthetic chest loot object must cross the active applyLoot boundary exactly once.");
  if(chest.afterOpenMana===chest.beforeMana){
    assert.ok(confirmedChest.recoveries>chest.recoveriesBefore,"V10.42 must recover chest loot when the established owner has not delivered it.");
  }else{
    assert.equal(confirmedChest.recoveries,chest.recoveriesBefore,"V10.42 must not recover chest loot that the established owner already delivered.");
  }
  await page.waitForTimeout(900);
  const settledChest=await page.evaluate(()=>({mana:p1.mana,calls:window.__v142R1ChestProbe?.calls||0}));
  assert.deepEqual(settledChest,{mana:confirmedChest.mana,calls:1},"Chest loot must remain exactly-once after all established and V10.42 recovery timers have settled.");
  await page.evaluate(()=>{
    const probe=window.__v142R1ChestProbe;
    if(probe?.originalApplyLoot)applyLoot=probe.originalApplyLoot;
    delete window.__v142R1ChestProbe;
    mode="playing";
  });

  const alphabet=await page.evaluate(()=>{
    const fake={items:"ABCDEF".split("").map((letter,index)=>({kind:"game",active:true,alphabetLetter:letter,title:`${letter} GAME ${index}`}))};
    window.CCGLostSizzlerV142R1Stability.repairAlphabetOrder(fake);
    return fake.items.map(item=>item.alphabetLetter).join("");
  });
  assert.notEqual(alphabet,"ABCDEF","Alphabetical collectible assignment must be shuffled before a floor is exposed to the player.");

  assert.deepEqual(errors,[],`V10.42 r1 stability regression must not raise page errors: ${errors.join("\n")}`);
  assert.deepEqual(failedScripts,[],`V10.42 ordered bootstrap must not lose same-origin scripts: ${failedScripts.join("\n")}`);

  console.log("Lost Sizzler V10.42 r1 ordered bootstrap, sustained combat, shop, dossier, chest and collectible stability browser regression passed.");
  await context.close();
}finally{
  await browser.close();
  for(const socket of sockets)socket.destroy();
  await new Promise(resolve=>server.close(()=>resolve()));
}
