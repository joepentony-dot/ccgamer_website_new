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
  const context=await browser.newContext({viewport:{width:1560,height:800}});
  await context.addInitScript(()=>{try{localStorage.setItem("ccg-lost-sizzler-tutorial-seen-v1","true")}catch(_){}});
  const page=await context.newPage();
  page.setDefaultTimeout(45000);
  const pageErrors=[];page.on("pageerror",error=>pageErrors.push(String(error?.stack||error)));
  await page.goto(`${origin}/arcade/lost-sizzler/`,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.body.dataset.releaseReady==="true"&&Boolean(window.CCGLostSizzlerV141R56PlaytestCompletion)&&Boolean(document.getElementById("solo-btn")),null,{timeout:90000});
  await page.click("#solo-btn");
  await page.waitForFunction(()=>document.body.dataset.runActive==="true"&&typeof mode!=="undefined"&&mode==="playing"&&Boolean(p1)&&Boolean(host),null,{timeout:20000});

  const damage=await page.evaluate(()=>{
    const api=window.CCGLostSizzlerV142R58AuthoritativeTrapCore;
    p1.health=p1.maxHealth=8;p1.armor=12;p1.invuln=999999;
    const start=Number(p1.health)+Number(p1.armor),rows=[];
    for(const kind of ["fire","spike","shock"]){
      const trap={id:`r58-${kind}`,x:p1.x,y:p1.y,roomId:0,kind,phase:-performance.now(),period:100000000,active:true};
      host.traps=[trap];p1.invuln=999999;
      const before={health:Number(p1.health),armor:Number(p1.armor)};
      api.damageOccupiedActiveTraps();
      const after={health:Number(p1.health),armor:Number(p1.armor)};
      rows.push({kind,before,after});
      trap.phase=trap.period*.7-performance.now();api.rearmInactiveTrapContacts();
    }
    const repeat={id:"r58-repeat",x:p1.x,y:p1.y,roomId:0,kind:"fire",phase:-performance.now(),period:100000000,active:true};
    host.traps=[repeat];p1.invuln=999999;
    const repeatBefore=Number(p1.health);
    api.damageOccupiedActiveTraps();
    const first=Number(p1.health);
    api.damageOccupiedActiveTraps();
    const duplicate=Number(p1.health);
    repeat.phase=repeat.period*.7-performance.now();api.rearmInactiveTrapContacts();
    repeat.phase=-performance.now();p1.invuln=999999;api.damageOccupiedActiveTraps();
    const second=Number(p1.health);
    p1.invuln=999999;const blastBefore=Number(p1.health)+Number(p1.armor);hurtPlayer(p1,1,false,"anti-loitering blast");const blastAfter=Number(p1.health)+Number(p1.armor);
    return{start,rows,repeatBefore,first,duplicate,second,blastBefore,blastAfter,state:{...api.state}};
  });
  for(const row of damage.rows){
    assert.equal(row.after.health,row.before.health-1,`${row.kind} trap must remove exactly one HEALTH through stale invulnerability: ${JSON.stringify(damage)}`);
    assert.equal(row.after.armor,row.before.armor,`${row.kind} trap must preserve armour: ${JSON.stringify(damage)}`);
  }
  assert.equal(damage.first,damage.repeatBefore-1,`first active trap cycle must damage: ${JSON.stringify(damage)}`);
  assert.equal(damage.duplicate,damage.first,`the same active trap cycle must not double-hit: ${JSON.stringify(damage)}`);
  assert.equal(damage.second,damage.first-1,`the same trap must damage again after rearm: ${JSON.stringify(damage)}`);
  assert.equal(damage.blastAfter,damage.blastBefore-1,`anti-loitering direct blast must still damage through stale invulnerability: ${JSON.stringify(damage)}`);

  const chest=await page.evaluate(()=>{
    const oldLoot=PGR.lootForChest,loot={kind:"potion",amount:1,qty:1,rarity:"SIZZLER",name:"SIZZLER Restoration Potion"};
    PGR.lootForChest=()=>loot;p1.inventorySlots=6;p1.inventory=[];const scoreBefore=Number(score),xpBefore=Number(p1.totalXp||0),row={id:"r56-generated-chest",x:p1.x,y:p1.y,active:true,locked:false,mimic:false,depth:4};host.chests=[row];
    const result=openChest(p1,row),count=(p1.inventory||[]).filter(item=>item.kind==="potion").reduce((n,item)=>n+Math.max(1,Number(item.qty)||1),0);PGR.lootForChest=oldLoot;
    return{result,opened:row.opened,active:row.active,lootKind:row.loot?.kind,count,scoreGain:Number(score)-scoreBefore,xpGain:Number(p1.totalXp||0)-xpBefore};
  });
  assert.equal(chest.opened,true,`generated chest must open: ${JSON.stringify(chest)}`);assert.equal(chest.active,false);assert.equal(chest.lootKind,"potion");assert.equal(chest.count,1,`generated chest contents must be delivered immediately: ${JSON.stringify(chest)}`);assert.ok(chest.scoreGain>0,`chest score award must remain intact: ${JSON.stringify(chest)}`);assert.equal(chest.xpGain,0,`chests must not grant progression XP: ${JSON.stringify(chest)}`);
  await page.waitForTimeout(700);
  const chestAfterDelay=await page.evaluate(()=>(p1.inventory||[]).filter(item=>item.kind==="potion").reduce((n,item)=>n+Math.max(1,Number(item.qty)||1),0));
  assert.equal(chestAfterDelay,1,"the legacy delayed chest callback must not duplicate R56 delivery");

  const fullChest=await page.evaluate(()=>{
    p1.inventorySlots=3;
    p1.inventory=[{kind:"torch",name:"Torch A"},{kind:"torch",name:"Torch B"},{kind:"torch",name:"Torch C"}];
    const row={id:"r56-full-chest",x:p1.x,y:p1.y,active:true,locked:false,mimic:false,depth:2,
      loot:{kind:"potion",amount:1,qty:1,rarity:"COMMON",name:"COMMON Restoration Potion"}};
    host.chests=[row];
    // Observe the real owner passing its notice into the existing pipeline.
    // The wrapper does not override its return, timer, priority or UI state.
    const calls=[],source=window.showToast;
    const majorPanel=document.getElementById("ccg-major-notification");
    const majorBefore=majorPanel?.querySelector(".major-copy b")?.textContent||"";
    window.showToast=function(...args){calls.push(String(args[0]||""));return source.apply(this,args)};
    const scoreBefore=Number(score);
    let result;
    try{result=openChest(p1,row)}finally{window.showToast=source}
    const toast=String(document.getElementById("pickup-title")?.textContent||""),
      majorState=window.CCGLostSizzlerV141LandingNotificationPolish?.state,
      majorActive=majorPanel?.dataset.visible==="true"&&document.body.dataset.ccgMajorNotification==="true"&&
        Number(majorState?.majorUntil||0)>performance.now(),
      retainedActive=Boolean(retainedToast&&toastTimer>0),
      queuedHeld=toastQueue.some(entry=>/INVENTORY FULL|CHEST HELD/i.test(String(entry?.title||"")));
    return{result,opened:Boolean(row.opened),active:row.active,lootName:row.loot?.name,
      inventory:(p1.inventory||[]).map(item=>item.kind),scoreGain:Number(score)-scoreBefore,
      toast,calls,majorActive,
      majorPreserved:!majorActive||majorBefore===majorPanel?.querySelector(".major-copy b")?.textContent,
      retainedActive,queuedHeld};
  });
  assert.equal(fullChest.result,false,`a full inventory must not consume carried chest loot: ${JSON.stringify(fullChest)}`);
  assert.equal(fullChest.opened,false);
  assert.equal(fullChest.active,true);
  assert.equal(fullChest.lootName,"COMMON Restoration Potion","blocked chest must retain the uncollected reward");
  assert.deepEqual(fullChest.inventory,["torch","torch","torch"],"full chest must not mutate inventory");
  assert.equal(fullChest.scoreGain,0,"held chest must not grant farmable score");
  assert.ok(fullChest.calls.some(title=>/INVENTORY FULL|CHEST HELD/i.test(title)),
    `the actual chest owner must attempt inventory-full feedback: ${JSON.stringify(fullChest)}`);
  assert.equal(fullChest.majorPreserved,true,"held chest notification must not overwrite a major alert");
  assert.ok(/INVENTORY FULL|CHEST HELD/i.test(fullChest.toast)||fullChest.queuedHeld||
    fullChest.majorActive||fullChest.retainedActive,
    `chest feedback must display or be legitimately deferred by major/retained notice: ${JSON.stringify(fullChest)}`);

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

  const goldFeedback=await page.evaluate(()=>{
    score=0;run.gold=0;run.rareMutation="";
    const foundation=window.CCGDungeonProgressionFoundation,item={id:"r56-gold",kind:"credits",active:true,x:p1.x,y:p1.y,value:25,scoreValue:25},coinAwardsBefore=Number(foundation?.state?.coinAwards||0);
    const result=applyItem(item,p1);
    return{result,awarded:item._ccgGoldAwarded===true,gold:Number(run.gold||0),score:Number(score||0),coinAwardsDelta:Number(foundation?.state?.coinAwards||0)-coinAwardsBefore,hud:String(document.getElementById("hud-gold")?.textContent||"")};
  });
  assert.notEqual(goldFeedback.result,false,`credits pickup must complete: ${JSON.stringify(goldFeedback)}`);assert.equal(goldFeedback.awarded,true,`credits must be marked as Gold-awarded exactly once: ${JSON.stringify(goldFeedback)}`);assert.equal(goldFeedback.gold,1,`credits must award one Gold coin: ${JSON.stringify(goldFeedback)}`);assert.equal(goldFeedback.score,0,`credits must not change Score: ${JSON.stringify(goldFeedback)}`);assert.equal(goldFeedback.coinAwardsDelta,1,`credits must record exactly one Gold award: ${JSON.stringify(goldFeedback)}`);assert.equal(goldFeedback.hud,"1",`Gold HUD must reflect the awarded coin: ${JSON.stringify(goldFeedback)}`);

  const icons=await page.evaluate(()=>{p1.inventorySlots=3;p1.inventory=[{kind:"potion",name:"Restoration Potion",qty:2},{kind:"teleport",name:"Teleport Spell",qty:1},{kind:"artefact",name:"Rare Artefact",qty:1}];sync();window.CCGLostSizzlerV141R56PlaytestCompletion.renderQuickIcons();return [...document.querySelectorAll("#quick-slots .quick-slot")].slice(0,3).map((slot,index)=>{const icon=slot.querySelector(".r56-quick-slot-icon svg,.r56-quick-slot-icon img.item-art"),a=slot.getBoundingClientRect(),b=icon?.getBoundingClientRect();return{index,tag:String(icon?.tagName||""),has:Boolean(icon),w:b?.width||0,h:b?.height||0,inside:Boolean(b&&b.left>=a.left&&b.right<=a.right&&b.top>=a.top&&b.bottom<=a.bottom)}})});
  assert.equal(icons.length,3,`three Quick Inventory slots must render: ${JSON.stringify(icons)}`);for(const row of icons){assert.equal(row.has,true,`occupied slot ${row.index+1} must contain graphical item art: ${JSON.stringify(icons)}`);assert.ok(row.w>=16&&row.h>=16&&row.inside,`slot ${row.index+1} icon must remain visible inside the compact bottom strip: ${JSON.stringify(icons)}`)}

  await page.evaluate(()=>{p1.health=p1.maxHealth=8;p1.armor=0;p1.firearmUnlocked=false;p1.weapon=null;p1.mana=0;p1.hitStunMs=0;fire1=0;fireBuffer1=0;mode="playing";document.querySelectorAll("#pause,#inventory-panel,#item-info-panel,#named-dossier-panel,#shop-panel").forEach(n=>n.classList.add("hidden"));});
  for(let i=0;i<12;i++){
    await page.keyboard.press("KeyP");await page.waitForFunction(()=>mode==="paused",null,{timeout:3000});
    await page.evaluate(()=>{fire1=9999;fireBuffer1=700;p1.hitStunMs=9999;;p1.controlsLocked=true});
    await page.click("#resume-btn");await page.waitForFunction(()=>mode==="playing",null,{timeout:3000});
    const before=await page.evaluate(()=>Number(p1._meleeSwingAt||0));await page.keyboard.press("Space");await page.waitForFunction(before=>Number(p1._meleeSwingAt||0)>before,before,{timeout:2500});
    const combat=await page.evaluate(()=>({mana:Number(p1.mana||0),fire:Number(fire1||0),stun:Number(p1.hitStunMs||0)}));
    assert.equal(combat.mana,0,`cycle ${i+1}: sword recovery must work at zero ammo`);assert.ok(combat.stun<5000,`cycle ${i+1}: stuck hit-stun must be repaired`);
  }

  await page.evaluate(()=>{p1.firearmUnlocked=true;p1.weapon=PGR.generateWeapon(0,1,()=>0.1);p1.mana=30;host.enemies=[];host.blockingDecor=[];fire1=0;fireBuffer1=0;});
  for(let i=0;i<4;i++){
    await page.keyboard.press("KeyP");await page.waitForFunction(()=>mode==="paused",null,{timeout:3000});await page.evaluate(()=>{fire1=9999;p1.hitStunMs=9999;});await page.click("#resume-btn");await page.waitForFunction(()=>mode==="playing",null,{timeout:3000});const before=await page.evaluate(()=>({mana:Number(p1.mana||0),bullets:bullets.length}));await page.keyboard.press("Space");await page.waitForFunction(before=>Number(p1.mana||0)<before.mana||bullets.length>before.bullets,before,{timeout:2500});
  }

  const finalState=await page.evaluate(()=>({
    r56:{...window.CCGLostSizzlerV141R56PlaytestCompletion.state},
    r58Fire:Boolean(window.CCGLostSizzlerV142R58AuthoritativeFireCore),
    r58Trap:Boolean(window.CCGLostSizzlerV142R58AuthoritativeTrapCore)
  }));
  assert.equal(finalState.r58Fire,true,"r58 FIRE core must own the repeated pause stress");
  assert.equal(finalState.r58Trap,true,"r58 trap core must own floor-trap damage");
  assert.equal(Number(finalState.r56.combatRearms||0),0,`R56 combat ownership must remain retired: ${JSON.stringify(finalState)}`);
  assert.equal(Number(finalState.r56.trapHits||0),0,`R56 trap ownership must remain retired: ${JSON.stringify(finalState)}`);
  assert.deepEqual(pageErrors,[],`r58/R56 compatibility browser regression produced page errors: ${pageErrors.join("\n")}`);
  await context.close();
  console.log("R58 traps plus retained R56 chest, reward, feedback and inventory UI regression passed.");
}finally{
  await browser.close();for(const socket of sockets)socket.destroy();await new Promise(resolve=>server.close(()=>resolve()));
}