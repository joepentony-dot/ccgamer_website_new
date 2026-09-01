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
const server=http.createServer((req,res)=>{try{const pathname=decodeURIComponent(new URL(req.url,"http://local").pathname),relative=pathname.endsWith("/")?`${pathname}index.html`:pathname,file=path.resolve(repo,`.${relative}`);if(!file.startsWith(`${repo}${path.sep}`)&&file!==repo){res.writeHead(403).end("forbidden");return}fs.readFile(file,(error,data)=>{if(error){res.writeHead(404,{connection:"close"}).end("not found");return}res.writeHead(200,{"content-type":mime[path.extname(file).toLowerCase()]||"application/octet-stream","cache-control":"no-store",connection:"close"});res.end(data)})}catch(error){res.writeHead(500,{connection:"close"}).end(String(error))}});
server.on("connection",socket=>{sockets.add(socket);socket.on("close",()=>sockets.delete(socket))});
await new Promise((resolve,reject)=>{server.once("error",reject);server.listen(0,"127.0.0.1",resolve)});
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,args:["--disable-dev-shm-usage","--disable-background-networking","--autoplay-policy=no-user-gesture-required"]});

try{
  const context=await browser.newContext({viewport:{width:1560,height:800}}),page=await context.newPage();
  page.setDefaultTimeout(45000);
  const pageErrors=[];page.on("pageerror",error=>pageErrors.push(String(error?.stack||error)));
  await page.goto(`${origin}/arcade/lost-sizzler/`,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.body.dataset.releaseReady==="true"&&Boolean(window.CCGLostSizzlerV141R56PlaytestCompletion)&&Boolean(document.getElementById("solo-btn")),null,{timeout:90000});
  await page.click("#solo-btn");
  await page.waitForFunction(()=>document.body.dataset.runActive==="true"&&typeof mode!=="undefined"&&mode==="playing"&&Boolean(p1)&&Boolean(host),null,{timeout:20000});

  const damage=await page.evaluate(()=>{
    const api=window.CCGLostSizzlerV141R56PlaytestCompletion;
    p1.health=p1.maxHealth=8;p1.armor=12;p1.invuln=999999;
    const start=Number(p1.health)+Number(p1.armor),rows=[];
    for(const kind of ["fire","spike","shock"]){
      const trap={id:`r56-${kind}`,x:p1.x,y:p1.y,roomId:0,kind,phase:-performance.now(),period:100000000,active:true};
      host.traps=[trap];p1.invuln=999999;const before=Number(p1.health)+Number(p1.armor);api.trapCycleTick();const after=Number(p1.health)+Number(p1.armor);rows.push({kind,before,after});
      trap.phase=trap.period*.7-performance.now();api.trapCycleTick();
    }
    const repeat={id:"r56-repeat",x:p1.x,y:p1.y,roomId:0,kind:"fire",phase:-performance.now(),period:100000000,active:true};host.traps=[repeat];p1.invuln=999999;const repeatBefore=Number(p1.health)+Number(p1.armor);api.trapCycleTick();const first=Number(p1.health)+Number(p1.armor);repeat.phase=repeat.period*.7-performance.now();api.trapCycleTick();repeat.phase=-performance.now();p1.invuln=999999;api.trapCycleTick();const second=Number(p1.health)+Number(p1.armor);
    p1.invuln=999999;const blastBefore=Number(p1.health)+Number(p1.armor);hurtPlayer(p1,1,false,"anti-loitering blast");const blastAfter=Number(p1.health)+Number(p1.armor);
    return{start,rows,repeatBefore,first,second,blastBefore,blastAfter,state:{trapHits:api.state.trapHits,environmentHits:api.state.environmentHits}};
  });
  for(const row of damage.rows)assert.equal(row.after,row.before-1,`${row.kind} trap must damage through stale invulnerability: ${JSON.stringify(damage)}`);
  assert.equal(damage.first,damage.repeatBefore-1,`first active trap cycle must damage: ${JSON.stringify(damage)}`);
  assert.equal(damage.second,damage.first-1,`the same trap must damage again on a new active cycle: ${JSON.stringify(damage)}`);
  assert.equal(damage.blastAfter,damage.blastBefore-1,`anti-loitering direct blast must damage through stale invulnerability: ${JSON.stringify(damage)}`);

  const chest=await page.evaluate(()=>{
    const oldLoot=PGR.lootForChest,loot={kind:"potion",amount:1,qty:1,rarity:"SIZZLER",name:"SIZZLER Restoration Potion"};
    PGR.lootForChest=()=>loot;p1.inventorySlots=6;p1.inventory=[];const scoreBefore=Number(score),xpBefore=Number(p1.totalXp||0),row={id:"r56-generated-chest",x:p1.x,y:p1.y,active:true,locked:false,mimic:false,depth:4};host.chests=[row];
    const result=openChest(p1,row),count=(p1.inventory||[]).filter(item=>item.kind==="potion").reduce((n,item)=>n+Math.max(1,Number(item.qty)||1),0);PGR.lootForChest=oldLoot;
    return{result,opened:row.opened,active:row.active,lootKind:row.loot?.kind,count,scoreGain:Number(score)-scoreBefore,xpGain:Number(p1.totalXp||0)-xpBefore};
  });
  assert.equal(chest.opened,true,`generated chest must open: ${JSON.stringify(chest)}`);assert.equal(chest.active,false);assert.equal(chest.lootKind,"potion");assert.equal(chest.count,1,`generated chest contents must be delivered immediately: ${JSON.stringify(chest)}`);assert.ok(chest.scoreGain>0&&chest.xpGain>0,`chest score and XP awards must remain intact: ${JSON.stringify(chest)}`);
  await page.waitForTimeout(700);
  const chestAfterDelay=await page.evaluate(()=>(p1.inventory||[]).filter(item=>item.kind==="potion").reduce((n,item)=>n+Math.max(1,Number(item.qty)||1),0));
  assert.equal(chestAfterDelay,1,"the legacy delayed chest callback must not duplicate R56 delivery");

  const fullChest=await page.evaluate(()=>{
    p1.inventorySlots=3;p1.inventory=[{kind:"torch",name:"Torch A"},{kind:"torch",name:"Torch B"},{kind:"torch",name:"Torch C"}];const row={id:"r56-full-chest",x:p1.x,y:p1.y,active:true,locked:false,mimic:false,depth:2,loot:{kind:"potion",amount:1,qty:1,rarity:"COMMON",name:"COMMON Restoration Potion"}};host.chests=[row];const scoreBefore=Number(score),result=openChest(p1,row);return{result,opened:Boolean(row.opened),active:row.active,scoreGain:Number(score)-scoreBefore,toast:String(document.getElementById("pickup-title")?.textContent||"")};
  });
  assert.equal(fullChest.result,false,`a full inventory must not consume carried chest loot: ${JSON.stringify(fullChest)}`);assert.equal(fullChest.opened,false);assert.equal(fullChest.active,true);assert.equal(fullChest.scoreGain,0,"a held chest must not grant farmable score before it really opens");assert.match(fullChest.toast,/INVENTORY FULL|CHEST HELD/i);

  const shrineRows=[];
  for(const roll of [0.1,0.5,0.9]){
    shrineRows.push(await page.evaluate(roll=>{
      const oldRandom=Math.random;Math.random=()=>roll;p1.maxHealth=8;p1.health=5;p1.damageBonus=0;p1.maxMana=240;p1.mana=200;p1.armor=0;run.alert=0;const row={id:`r56-shrine-${roll}`,x:p1.x,y:p1.y,active:true};host.shrines=[row];triggerShrine(p1);Math.random=oldRandom;return{roll,active:row.active,reward:String(row.__r56RewardText||""),last:String(window.CCGLostSizzlerV141R56PlaytestCompletion.state.lastShrine||"")};
    },roll));
  }
  assert.match(shrineRows[0].reward,/MAX HP.*HP/i,`endurance shrine must say exactly what was gained: ${JSON.stringify(shrineRows)}`);assert.match(shrineRows[1].reward,/DAMAGE.*MAX AMMO/i,`cursed shrine must state gain and drawback: ${JSON.stringify(shrineRows)}`);assert.match(shrineRows[2].reward,/ARMOUR.*ALERT/i,`noisy shrine must state armour and alert changes: ${JSON.stringify(shrineRows)}`);

  await page.evaluate(()=>{p1.level=1;p1.xp=0;p1.totalXp=0;run.floor=1;run.floorXP=0;window.CCGLostSizzlerV141R56PlaytestCompletion.state.lastPickup="";applyItem({id:"r56-xp",kind:"xpOrb",active:true,x:p1.x,y:p1.y},p1)});
  await page.waitForFunction(()=>/XP/.test(String(window.CCGLostSizzlerV141R56PlaytestCompletion?.state?.lastPickup||"")),null,{timeout:3000});
  const xpFeedback=await page.evaluate(()=>({text:String(window.CCGLostSizzlerV141R56PlaytestCompletion.state.lastPickup),xp:Number(p1.totalXp||0)}));
  assert.ok(xpFeedback.xp>0,`XP orb must award XP below the cap: ${JSON.stringify(xpFeedback)}`);assert.match(xpFeedback.text,/\+\d+ XP/);

  await page.evaluate(()=>{score=0;window.CCGLostSizzlerV141R56PlaytestCompletion.state.lastPickup="";applyItem({id:"r56-score",kind:"credits",active:true,x:p1.x,y:p1.y,value:25,scoreValue:25},p1)});
  await page.waitForFunction(()=>/SCORE/.test(String(window.CCGLostSizzlerV141R56PlaytestCompletion?.state?.lastPickup||"")),null,{timeout:3000});
  const scoreFeedback=await page.evaluate(()=>({text:String(window.CCGLostSizzlerV141R56PlaytestCompletion.state.lastPickup),score:Number(score)}));
  assert.ok(scoreFeedback.score>0,`score item must change score: ${JSON.stringify(scoreFeedback)}`);assert.match(scoreFeedback.text,/\+.*SCORE/);

  const icons=await page.evaluate(()=>{p1.inventorySlots=3;p1.inventory=[{kind:"potion",name:"Restoration Potion",qty:2},{kind:"teleport",name:"Teleport Spell",qty:1},{kind:"artefact",name:"Rare Artefact",qty:1}];sync();window.CCGLostSizzlerV141R56PlaytestCompletion.renderQuickIcons();return [...document.querySelectorAll("#quick-slots .quick-slot")].slice(0,3).map((slot,index)=>{const icon=slot.querySelector(".r56-quick-slot-icon svg,.r56-quick-slot-icon img.item-art"),a=slot.getBoundingClientRect(),b=icon?.getBoundingClientRect();return{index,tag:String(icon?.tagName||""),has:Boolean(icon),w:b?.width||0,h:b?.height||0,inside:Boolean(b&&b.left>=a.left&&b.right<=a.right&&b.top>=a.top&&b.bottom<=a.bottom)}})});
  assert.equal(icons.length,3,`three Quick Inventory slots must render: ${JSON.stringify(icons)}`);for(const row of icons){assert.equal(row.has,true,`occupied slot ${row.index+1} must contain graphical item art: ${JSON.stringify(icons)}`);assert.ok(row.w>=16&&row.h>=16&&row.inside,`slot ${row.index+1} icon must remain visible inside the compact bottom strip: ${JSON.stringify(icons)}`)}

  await page.evaluate(()=>{p1.health=p1.maxHealth=8;p1.armor=0;p1.firearmUnlocked=false;p1.weapon=null;p1.mana=0;p1.hitStunMs=0;p1.controlLocked=false;p1.controlsLocked=false;fire1=0;fireBuffer1=0;mode="playing";document.querySelectorAll("#pause,#inventory-panel,#item-info-panel,#named-dossier-panel,#shop-panel").forEach(n=>n.classList.add("hidden"));});
  for(let i=0;i<12;i++){
    await page.keyboard.press("KeyP");await page.waitForFunction(()=>mode==="paused",null,{timeout:3000});
    await page.evaluate(()=>{fire1=9999;fireBuffer1=700;p1.hitStunMs=9999;p1.controlLocked=true;p1.controlsLocked=true});
    await page.click("#resume-btn");await page.waitForFunction(()=>mode==="playing",null,{timeout:3000});
    const before=await page.evaluate(()=>Number(p1._meleeSwingAt||0));await page.keyboard.press("Space");await page.waitForFunction(before=>Number(p1._meleeSwingAt||0)>before,before,{timeout:2500});
    const combat=await page.evaluate(()=>({mana:Number(p1.mana||0),fire:Number(fire1||0),stun:Number(p1.hitStunMs||0),locked:Boolean(p1.controlLocked||p1.controlsLocked)}));
    assert.equal(combat.mana,0,`cycle ${i+1}: sword recovery must work at zero ammo`);assert.equal(combat.locked,false,`cycle ${i+1}: stale control locks must be cleared`);assert.ok(combat.stun<5000,`cycle ${i+1}: stuck hit-stun must be repaired`);
  }

  await page.evaluate(()=>{p1.firearmUnlocked=true;p1.weapon=PGR.generateWeapon(0,1,()=>0.1);p1.mana=30;host.enemies=[];host.blockingDecor=[];fire1=0;fireBuffer1=0;});
  for(let i=0;i<4;i++){
    await page.keyboard.press("KeyP");await page.waitForFunction(()=>mode==="paused",null,{timeout:3000});await page.evaluate(()=>{fire1=9999;p1.hitStunMs=9999;p1.controlLocked=true});await page.click("#resume-btn");await page.waitForFunction(()=>mode==="playing",null,{timeout:3000});const before=await page.evaluate(()=>({mana:Number(p1.mana||0),bullets:bullets.length}));await page.keyboard.press("Space");await page.waitForFunction(before=>Number(p1.mana||0)<before.mana||bullets.length>before.bullets,before,{timeout:2500});
  }

  const finalState=await page.evaluate(()=>({...window.CCGLostSizzlerV141R56PlaytestCompletion.state,trapCycles:window.CCGLostSizzlerV141R56PlaytestCompletion.state.trapCycles.size,pendingChests:window.CCGLostSizzlerV141R56PlaytestCompletion.state.pendingChests.size}));
  assert.ok(finalState.combatRearms>=12,`repeated pause stress must exercise R56 combat rearming: ${JSON.stringify(finalState)}`);
  assert.deepEqual(pageErrors,[],`R56 browser regression produced page errors: ${pageErrors.join("\n")}`);
  await context.close();
  console.log("R56 traps, chest rewards, feedback, inventory icons and repeated combat recovery browser regression passed.");
}finally{
  await browser.close();for(const socket of sockets)socket.destroy();await new Promise(resolve=>server.close(()=>resolve()));
}
