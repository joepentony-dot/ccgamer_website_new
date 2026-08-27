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
  await page.waitForFunction(()=>Boolean(host?.enemies?.some?.(enemy=>enemy?._v141R31NamedCpuCook&&enemy?.follower?.name==="CPU Cook")));

  const cpuAndHud=await page.evaluate(()=>{
    const cpu=host.enemies.find(enemy=>enemy?._v141R31NamedCpuCook),generic={kind:"cook",follower:null},node=document.getElementById("hud-score"),style=getComputedStyle(node),rect=node.getBoundingClientRect();
    let portraitAlias=false;try{portraitAlias=avatarImages?.get?.("CPU Cook")===avatarImages?.get?.("CPU")&&Boolean(avatarImages?.get?.("CPU Cook"))}catch(_){}
    return{controller:window.CCGLostSizzlerModeRuntime.detect(),cpuName:cpu?.follower?.name||"",cpuInitials:cpu?.follower?.initials||"",cpuKind:cpu?.follower?.kind||"",named:Boolean(cpu?._v141R31NamedCpuCook),namedCpuCount:host.enemies.filter(enemy=>enemy?._v141R31NamedCpuCook).length,genericCookName:window.CCGLostSizzlerV141R31SoloDungeon.genericCookDisplayName(generic),renderWrapped:Boolean(window.drawEnemy?.__ccgV141R31CpuCookRenderFix),portraitAlias,visibility:style.visibility,display:style.display,opacity:style.opacity,width:rect.width,height:rect.height};
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
    score=6320;p1.armor=0;
    window.__r31Shop={id:"r31-browser-shop",active:true,sold:{},scorePurchases:0};
    const price=shopScorePrice(window.__r31Shop);openShop(window.__r31Shop,p1);
    return{price,score:Number(score)};
  });
  assert.equal(shopSetup.score,6320,"browser shop fixture must begin at the reported score");
  await page.waitForSelector('#shop-panel:not(.hidden) [data-shop-buy="armour"]');
  await page.click('[data-shop-buy="armour"]');
  await page.waitForTimeout(100);
  const shopResult=await page.evaluate(()=>({
    score:Number(score),scoreText:document.getElementById("shop-score")?.textContent||"",hudText:document.getElementById("hud-score")?.textContent||"",nextText:document.getElementById("shop-next-price")?.textContent||"",nextExpected:String(shopScorePrice(window.__r31Shop)),sold:Boolean(window.__r31Shop.sold.armour),purchases:Number(window.__r31Shop.scorePurchases||0),refreshes:window.CCGLostSizzlerV141R31SoloDungeon.state.shopWalletRefreshes
  }));
  assert.equal(shopResult.score,6320-shopSetup.price,"shop purchase must deduct score immediately");
  assert.equal(shopResult.scoreText,String(shopResult.score).padStart(6,"0"),"open shop score must update without a page refresh");
  assert.equal(shopResult.hudText,String(shopResult.score).padStart(6,"0"),"live Solo HUD score must agree with the purchase immediately");
  assert.equal(shopResult.nextText,shopResult.nextExpected,"open shop next-price ladder must update after a purchase");
  assert.equal(shopResult.sold,true,"purchased shop item must enter sold state");
  assert.equal(shopResult.purchases,1,"score purchase ladder must advance once");
  assert.ok(shopResult.refreshes>=1,"r31 shop wallet refresh must have executed");
  await page.evaluate(()=>closeShop());
  await page.waitForFunction(()=>typeof mode!=="undefined"&&mode==="playing");

  const chestResult=await page.evaluate(()=>{
    p1.armor=0;
    const before=window.CCGLostSizzlerV141R31SoloDungeon.state.chestImmediateDeliveries;
    const chest={id:"r31-browser-chest",x:p1.x,y:p1.y,active:true,locked:false,mimic:false,depth:5,loot:{kind:"armour",amount:2,rarity:"SIZZLER",name:"SIZZLER Armour Plate"}};
    const result=openChest(p1,chest);
    return{result,active:chest.active,opened:chest.opened,armour:Number(p1.armor||0),feedback:String(chest._v141R31Feedback||""),immediate:window.CCGLostSizzlerV141R31SoloDungeon.state.chestImmediateDeliveries-before,feedbackCount:window.CCGLostSizzlerV141R31SoloDungeon.state.chestFeedbacks};
  });
  assert.equal(chestResult.result,true,"r31 browser chest must open through the mode-owned interaction gate");
  assert.equal(chestResult.active,false,"opened chest must become inactive");
  assert.equal(chestResult.opened,true,"opened chest must retain opened state");
  assert.ok(chestResult.armour>=2,"chest loot must be applied during the opening action rather than after the old delayed callback");
  assert.match(chestResult.feedback,/SIZZLER/,"chest feedback above the chest must include its rarity");
  assert.match(chestResult.feedback,/ARMOUR PLATE/i,"chest feedback above the chest must identify the item");
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

  assert.deepEqual(errors,[],`r31 Solo Dungeon browser regression must have no uncaught browser errors: ${errors.join("\n")}`);
  console.log("Lost Sizzler r31 Solo Dungeon shop, chest, CPU Cook, pause-combat and score-HUD regressions passed in Chromium.");
  await context.close();
}finally{
  await browser.close();for(const socket of sockets)socket.destroy();await new Promise(resolve=>server.close(()=>resolve()));
}
