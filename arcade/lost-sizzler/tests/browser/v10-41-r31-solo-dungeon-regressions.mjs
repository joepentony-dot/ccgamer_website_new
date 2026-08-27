import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {chromium} from "playwright";

const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,"../../../..");
const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".mjs":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json; charset=utf-8",".svg":"image/svg+xml",".webp":"image/webp",".png":"image/png",".ogg":"audio/ogg",".mp3":"audio/mpeg"};
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
  const context=await browser.newContext({viewport:{width:1600,height:900}}),page=await context.newPage();page.setDefaultTimeout(45000);
  const errors=[];page.on("pageerror",error=>errors.push(String(error?.stack||error)));
  await page.goto(`${origin}/arcade/lost-sizzler/`,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.body.dataset.releaseReady==="true"&&Boolean(window.CCGLostSizzlerV141R31SoloDungeon)&&Boolean(window.CCGLostSizzlerModeRuntime)&&Boolean(document.getElementById("solo-btn")),null,{timeout:90000});
  await page.click("#solo-btn");
  await page.waitForFunction(()=>document.body.dataset.runActive==="true"&&typeof mode!=="undefined"&&mode==="playing"&&window.CCGLostSizzlerModeRuntime?.detect?.()==="dungeon-solo");
  await page.waitForFunction(()=>Boolean(host?.enemies)&&Boolean(p1),null,{timeout:15000});
  await page.evaluate(()=>{
    const api=window.CCGLostSizzlerV141R31SoloDungeon;
    const isCpuFollower=follower=>{
      if(!follower||String(follower.kind||"").toLowerCase()!=="cook")return false;
      const name=String(follower.name||"").trim().toUpperCase(),initials=String(follower.initials||"").trim().toUpperCase(),music=String(follower.musicKey||"").trim().toLowerCase(),avatar=String(follower.avatar||"").trim().toLowerCase();
      return name==="CPU"||name==="CPU COOK"||initials==="CPU"||music==="cpu"||/(^|\/)cpu\.png(?:$|[?#])/.test(avatar);
    };
    if(!host.enemies.some(enemy=>isCpuFollower(enemy?.follower))){
      const configured=window.CCG_CONFIG?.followerElites?.find(follower=>isCpuFollower(follower));
      if(!configured)throw new Error("CPU Cook regression fixture could not find the configured CPU follower");
      host.enemies.push({id:"r31-browser-cpu-cook",kind:"cook",x:Number(p1.x)||0,y:Number(p1.y)||0,rx:Number(p1.x)||0,ry:Number(p1.y)||0,hp:Number(configured.hp)||9,maxHp:Number(configured.hp)||9,armor:Number(configured.armor)||5,active:true,follower:{...configured}});
    }
    api.normaliseCpuCook();api.monitor();
  });
  await page.waitForFunction(()=>{
    const api=window.CCGLostSizzlerV141R31SoloDungeon;
    if(!api||!host?.enemies)return false;
    api.normaliseCpuCook();api.monitor();
    const isCpuFollower=follower=>{
      if(!follower||String(follower.kind||"").toLowerCase()!=="cook")return false;
      const name=String(follower.name||"").trim().toUpperCase(),initials=String(follower.initials||"").trim().toUpperCase(),music=String(follower.musicKey||"").trim().toLowerCase(),avatar=String(follower.avatar||"").trim().toLowerCase();
      return name==="CPU"||name==="CPU COOK"||initials==="CPU"||music==="cpu"||/(^|\/)cpu\.png(?:$|[?#])/.test(avatar);
    };
    const cpuFollowers=host.enemies.filter(enemy=>isCpuFollower(enemy?.follower));
    return cpuFollowers.length===1&&cpuFollowers[0]?._v141R31NamedCpuCook===true&&cpuFollowers[0]?.follower?.name==="CPU Cook"&&cpuFollowers[0]?.follower?.initials==="CPU";
  },null,{timeout:10000});

  const cpuAndHud=await page.evaluate(()=>{
    const api=window.CCGLostSizzlerV141R31SoloDungeon;
    api.normaliseCpuCook();api.monitor();
    const isCpuFollower=follower=>{
      if(!follower||String(follower.kind||"").toLowerCase()!=="cook")return false;
      const name=String(follower.name||"").trim().toUpperCase(),initials=String(follower.initials||"").trim().toUpperCase(),music=String(follower.musicKey||"").trim().toLowerCase(),avatar=String(follower.avatar||"").trim().toLowerCase();
      return name==="CPU"||name==="CPU COOK"||initials==="CPU"||music==="cpu"||/(^|\/)cpu\.png(?:$|[?#])/.test(avatar);
    };
    const cpuFollowers=host.enemies.filter(enemy=>isCpuFollower(enemy?.follower));
    const cpu=cpuFollowers.find(enemy=>enemy?._v141R31NamedCpuCook&&enemy?.follower?.name==="CPU Cook")||cpuFollowers[0];
    const generic={kind:"cook",follower:null},node=document.getElementById("hud-score"),style=getComputedStyle(node),rect=node.getBoundingClientRect();
    let portraitAlias=false;try{portraitAlias=avatarImages?.get?.("CPU Cook")===avatarImages?.get?.("CPU")&&Boolean(avatarImages?.get?.("CPU Cook"))}catch(_){}
    return{controller:window.CCGLostSizzlerModeRuntime.detect(),cpuName:cpu?.follower?.name||"",cpuInitials:cpu?.follower?.initials||"",cpuKind:cpu?.follower?.kind||"",named:Boolean(cpu?._v141R31NamedCpuCook),namedCpuCount:cpuFollowers.filter(enemy=>enemy?._v141R31NamedCpuCook&&enemy?.follower?.name==="CPU Cook"&&enemy?.follower?.initials==="CPU").length,genericCookName:api.genericCookDisplayName(generic),renderWrapped:Boolean(window.drawEnemy?.__ccgV141R31CpuCookRenderFix),portraitAlias,visibility:style.visibility,display:style.display,opacity:style.opacity,width:rect.width,height:rect.height};
  });
  assert.equal(cpuAndHud.controller,"dungeon-solo","r31 regression pass must run under the Solo Dungeon controller only");
  assert.equal(cpuAndHud.cpuName,"CPU Cook","the configured CPU follower must render with the CPU Cook name");
  assert.equal(cpuAndHud.cpuInitials,"CPU","CPU Cook must retain its named initials");
  assert.equal(cpuAndHud.cpuKind,"cook","CPU Cook must retain cook behaviour");
  assert.equal(cpuAndHud.named,true,"CPU Cook must retain explicit named-character state");
  assert.equal(cpuAndHud.namedCpuCount,1,"Solo Dungeon must expose exactly one named CPU Cook");
  assert.equal(cpuAndHud.genericCookName,"Kitchen Cook","ordinary cooks must use a distinct display identity");
  assert.equal(cpuAndHud.renderWrapped,true,"Solo cook rendering must install the CPU Cook identity boundary");
  assert.equal(cpuAndHud.portraitAlias,true,"CPU Cook must retain the configured CPU portrait");
  assert.equal(cpuAndHud.visibility,"visible","Solo score HUD must remain visible");
  assert.notEqual(cpuAndHud.display,"none","Solo score HUD must remain laid out");
  assert.equal(cpuAndHud.opacity,"1","Solo score HUD must remain fully opaque");
  assert.ok(cpuAndHud.width>0&&cpuAndHud.height>0,"Solo score HUD must occupy visible space");

  const shopSetup=await page.evaluate(()=>{
    score=100000;p1.armor=0;p1.inventorySlots=3;
    window.__r31Shop={id:"r31-browser-shop",active:true,sold:{},scorePurchases:0};
    const price=shopScorePrice(window.__r31Shop);openShop(window.__r31Shop,p1);
    return{price,score:Number(score),capacity:PGR.inventoryCapacity(p1)};
  });
  assert.equal(shopSetup.score,100000,"browser shop fixture must have enough score to exercise four doubling prices");
  assert.equal(shopSetup.price,1000,"the first normal purchase in a fresh shop must cost 1,000");
  assert.equal(shopSetup.capacity,3,"the inventory expansion fixture must start with three slots");
  await page.waitForSelector('#shop-panel:not(.hidden) [data-shop-buy="inventorySlot"]');
  await page.click('[data-shop-buy="inventorySlot"]');
  await page.waitForFunction(()=>window.__r31Shop.scorePurchases===1);
  const firstSlot=await page.evaluate(()=>({capacity:PGR.inventoryCapacity(p1),next:shopScorePrice(window.__r31Shop),disabled:document.querySelector('[data-shop-buy="inventorySlot"]')?.disabled,sold:Boolean(window.__r31Shop.sold.inventorySlot)}));
  assert.equal(firstSlot.capacity,4,"the first inventory expansion must open one slot");
  assert.equal(firstSlot.next,2000,"the second normal purchase must cost 2,000");
  assert.equal(firstSlot.disabled,false,"inventory expansion must remain purchasable below the six-slot cap");
  assert.equal(firstSlot.sold,false,"repeatable inventory expansion must not enter sold state");
  await page.click('[data-shop-buy="inventorySlot"]');
  await page.waitForFunction(()=>window.__r31Shop.scorePurchases===2);
  const secondSlot=await page.evaluate(()=>({capacity:PGR.inventoryCapacity(p1),next:shopScorePrice(window.__r31Shop),disabled:document.querySelector('[data-shop-buy="inventorySlot"]')?.disabled}));
  assert.equal(secondSlot.capacity,5,"a second inventory expansion in the same shop must open another slot");
  assert.equal(secondSlot.next,4000,"the third normal purchase must cost 4,000");
  assert.equal(secondSlot.disabled,false,"the fifth slot must leave the final expansion available");
  await page.click('[data-shop-buy="weapon"]');
  await page.waitForFunction(()=>window.__r31Shop.scorePurchases===3);
  const firstWeapon=await page.evaluate(()=>({next:shopScorePrice(window.__r31Shop),disabled:document.querySelector('[data-shop-buy="weapon"]')?.disabled,sold:Boolean(window.__r31Shop.sold.weapon)}));
  assert.equal(firstWeapon.next,8000,"the fourth normal purchase must cost 8,000");
  assert.equal(firstWeapon.disabled,false,"a weapon cache must remain available after buying one");
  assert.equal(firstWeapon.sold,false,"repeatable weapon caches must not enter sold state");
  await page.click('[data-shop-buy="weapon"]');
  await page.waitForFunction(()=>window.__r31Shop.scorePurchases===4);
  const shopResult=await page.evaluate(()=>({
    score:Number(score),scoreText:document.getElementById("shop-score")?.textContent||"",hudText:document.getElementById("hud-score")?.textContent||"",nextText:document.getElementById("shop-next-price")?.textContent||"",nextExpected:String(shopScorePrice(window.__r31Shop)),weaponDisabled:document.querySelector('[data-shop-buy="weapon"]')?.disabled,soldKeys:Object.keys(window.__r31Shop.sold).filter(key=>key!=="banishmentScore"),purchases:Number(window.__r31Shop.scorePurchases||0),capacity:PGR.inventoryCapacity(p1),refreshes:window.CCGLostSizzlerV141R31SoloDungeon.state.shopWalletRefreshes
  }));
  assert.equal(shopResult.score,100000-1000-2000-4000-8000,"each repeated purchase must deduct its exact doubling price immediately");
  assert.equal(shopResult.scoreText,String(shopResult.score).padStart(6,"0"),"open shop score must update without a page refresh");
  assert.equal(shopResult.hudText,String(shopResult.score).padStart(6,"0"),"live Solo HUD score must agree with the purchase immediately");
  assert.equal(shopResult.nextText,shopResult.nextExpected,"open shop next-price ladder must update after a purchase");
  assert.equal(shopResult.nextExpected,"16000","the next same-shop price after four purchases must be 16,000");
  assert.equal(shopResult.weaponDisabled,false,"weapons must still be purchasable after two same-shop weapon purchases");
  assert.deepEqual(shopResult.soldKeys,[],"normal purchases must not write any sold flags");
  assert.equal(shopResult.purchases,4,"the score purchase ladder must advance for every repeat purchase");
  assert.equal(shopResult.capacity,5,"the two inventory expansion purchases must persist");
  assert.ok(shopResult.refreshes>=4,"r31 shop wallet refresh must execute after every purchase");
  await page.evaluate(()=>{closeShop();p1.weapon=null;p1.firearmUnlocked=false});
  await page.waitForFunction(()=>typeof mode!=="undefined"&&mode==="playing");

  const chestResult=await page.evaluate(()=>{
    p1.armor=0;
    const scoreBefore=Number(score),xpBefore=Number(p1.totalXp||0);
    const before=window.CCGLostSizzlerV141R31SoloDungeon.state.chestImmediateDeliveries;
    const chest={id:"r31-browser-chest",x:p1.x,y:p1.y,active:true,locked:false,mimic:false,depth:5,loot:{kind:"armour",amount:2,rarity:"SIZZLER",name:"SIZZLER Armour Plate"}};
    const result=openChest(p1,chest);
    return{result,active:chest.active,opened:chest.opened,armour:Number(p1.armor||0),scoreBefore,scoreAfter:Number(score),xpBefore,xpAfter:Number(p1.totalXp||0),rewardScore:Number(chest.rewardScore||0),rewardXp:Number(chest.rewardXp||0),feedback:String(chest._v141R31Feedback||""),immediate:window.CCGLostSizzlerV141R31SoloDungeon.state.chestImmediateDeliveries-before,feedbackCount:window.CCGLostSizzlerV141R31SoloDungeon.state.chestFeedbacks};
  });
  assert.equal(chestResult.result,true,"r31 browser chest must open through the mode-owned interaction gate");
  assert.equal(chestResult.active,false,"opened chest must become inactive");
  assert.equal(chestResult.opened,true,"opened chest must retain opened state");
  assert.ok(chestResult.armour>=2,"chest loot must be applied during the opening action rather than after the old delayed callback");
  assert.ok(chestResult.rewardScore>0,"every chest must record a positive score reward");
  assert.equal(chestResult.rewardXp,10,"every chest must record its 10 XP reward");
  assert.equal(chestResult.scoreAfter-chestResult.scoreBefore,chestResult.rewardScore,"the recorded chest score must be added immediately");
  assert.equal(chestResult.xpAfter-chestResult.xpBefore,chestResult.rewardXp,"the recorded chest XP must be added immediately");
  assert.match(chestResult.feedback,/SIZZLER/,"chest feedback above the chest must include its rarity");
  assert.match(chestResult.feedback,/ARMOUR PLATE/i,"chest feedback above the chest must identify the item");
  assert.match(chestResult.feedback,/SCORE/,"chest feedback above the chest must show the score award");
  assert.match(chestResult.feedback,/XP/,"chest feedback above the chest must show the XP award");
  assert.equal(chestResult.immediate,1,"exactly one legacy delayed chest delivery must be converted to immediate delivery");
  assert.ok(chestResult.feedbackCount>=1,"r31 must record visible chest feedback");

  for(let i=0;i<3;i++){
    await page.evaluate(()=>pause());await page.waitForFunction(()=>mode==="paused");
    await page.evaluate(()=>pause());await page.waitForFunction(()=>mode==="playing");
  }
  await page.evaluate(()=>pause());await page.waitForFunction(()=>mode==="paused");
  await page.evaluate(()=>{fire1=900;fireBuffer1=900;p1.hitStunMs=900;p1.controlLocked=true;p1.controlsLocked=true});
  await page.evaluate(()=>pause());await page.waitForFunction(()=>mode==="playing");
  await page.waitForTimeout(30);
  const resumeState=await page.evaluate(()=>({fire1:Number(fire1),fireBuffer1:Number(fireBuffer1),hitStun:Number(p1.hitStunMs||0),controlLocked:Boolean(p1.controlLocked),controlsLocked:Boolean(p1.controlsLocked),resets:window.CCGLostSizzlerV141R31SoloDungeon.state.pauseCombatResets,lastResumeAt:Number(window.CCGLostSizzlerV141R31SoloDungeon.state.lastResumeAt||0)}));
  assert.ok(Number.isFinite(resumeState.fire1)&&resumeState.fire1<=0,"repeated Solo pauses must leave the attack cooldown ready rather than retain a positive stale value");
  assert.ok(Number.isFinite(resumeState.fireBuffer1)&&resumeState.fireBuffer1<=0,"repeated Solo pauses must leave the attack buffer ready rather than retain a positive poisoned value");
  assert.equal(resumeState.hitStun,0,"Solo resume must clear stale hit-stun left at the pause boundary");
  assert.equal(resumeState.controlLocked,false,"Solo resume must release singular control lock state");
  assert.equal(resumeState.controlsLocked,false,"Solo resume must release plural control lock state");
  assert.ok(resumeState.resets>=4,"each repeated Solo resume must pass through the combat recovery boundary");
  assert.ok(resumeState.lastResumeAt>0,"Solo resume must arm the bounded first-attack safeguard");

  const attackBefore=await page.evaluate(()=>({rearms:window.CCGLostSizzlerV141R31SoloDungeon.state.postResumeAttackRearms,swing:Number(p1._meleeSwingAt||0)}));
  await page.keyboard.press("Space");
  await page.waitForFunction(previous=>window.CCGLostSizzlerV141R31SoloDungeon.state.postResumeAttackRearms>previous.rearms&&Number(p1._meleeSwingAt||0)>previous.swing,attackBefore);
  const attackAfter=await page.evaluate(()=>({rearms:window.CCGLostSizzlerV141R31SoloDungeon.state.postResumeAttackRearms,swing:Number(p1._meleeSwingAt||0),fire1:Number(fire1)}));
  assert.ok(attackAfter.rearms>attackBefore.rearms,"first attack after resume must pass through the r31 rearm safeguard");
  assert.ok(attackAfter.swing>attackBefore.swing,"first attack after repeated pauses must execute a real Solo attack");
  assert.ok(Number.isFinite(attackAfter.fire1),"post-resume attack cooldown must remain finite");

  await page.evaluate(()=>toggleInventory());await page.waitForFunction(()=>mode==="inventory"&&!document.getElementById("inventory-panel").classList.contains("hidden"));
  await page.click("#inventory-close");await page.waitForFunction(()=>mode==="playing"&&document.getElementById("inventory-panel").classList.contains("hidden"));
  await page.waitForTimeout(120);
  const displayState=await page.evaluate(()=>{
    const game=document.getElementById("game"),context=game.getContext("2d"),pixels=context.getImageData(0,0,game.width,game.height).data;
    let visibleSamples=0;for(let i=0;i<pixels.length;i+=256)if(pixels[i]>4||pixels[i+1]>4||pixels[i+2]>4)visibleSamples++;
    return{width:game.width,height:game.height,visibleSamples,recoveries:window.CCGLostSizzlerV141R31SoloDungeon.state.displayRecoveries,frames:window.CCGLostSizzlerV141R31SoloDungeon.state.displayFrames,mode};
  });
  assert.equal(displayState.mode,"playing","closing inventory must restore active play mode");
  assert.ok(displayState.width>0&&displayState.height>0,"closing a panel must retain a sized canvas");
  assert.ok(displayState.visibleSamples>0,"closing Pause or inventory must leave a visibly painted game frame rather than a black canvas");
  assert.ok(displayState.recoveries>=5,"Pause and inventory returns must pass through the display recovery boundary");
  assert.ok(displayState.frames>=5,"display recovery must paint verified canvas frames");

  assert.deepEqual(errors,[],`r31 Solo Dungeon browser regression must have no uncaught browser errors: ${errors.join("\n")}`);
  console.log("Lost Sizzler r31 Solo Dungeon repeat-shop, chest-reward, panel-display, CPU Cook, pause-combat and score-HUD regressions passed in Chromium.");
  await context.close();
}finally{
  await browser.close();for(const socket of sockets)socket.destroy();await new Promise(resolve=>server.close(()=>resolve()));
}
