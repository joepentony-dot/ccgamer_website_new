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

  let releaseOverhaul;
  const overhaulGate=new Promise(resolve=>{releaseOverhaul=resolve});
  let delayedOverhaul=false;
  await page.route("**/js/v10-41-r32-spy-overhaul.js*",async route=>{
    if(!delayedOverhaul){delayedOverhaul=true;await overhaulGate}
    await route.continue()
  });

  console.log("[Stage 10 Spy interactions] load canonical page");
  await page.goto(`${origin}/arcade/lost-sizzler/`,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.body.dataset.releaseReady==="true"&&Boolean(window.CCGLostSizzlerV141R32SpyLoader));

  console.log("[Stage 10 Spy interactions] start real local-authoritative Spy match with overhaul request held");
  const started=await page.evaluate(()=>{
    net.setSolo("Agent One");
    const id=String(net.sessionId);
    return window.CCGLostSizzlerSpecialModes.startOnline({
      roomMode:"sizzler-saboteurs",
      players:[{id,name:"Agent One"},{id:"STAGE10-SPY-B",name:"Agent Two"}],
      hostId:id,
      seed:"STAGE10-SPY-INTERACTIONS",
      roomCode:"S10INT"
    })
  });
  assert.equal(started,true,"Stage 10 interaction fixture must start through the real special-mode adapter");
  await page.waitForFunction(()=>document.body.dataset.specialMode==="sizzler-saboteurs"&&window.CCGLostSizzlerV141R32SpyLoader?.state?.loading===true&&!window.CCGLostSizzlerV141R32SpyLoader?.state?.loaded);

  console.log("[Stage 10 Spy interactions] first E action queues while the lazy owner is unavailable");
  const queueBefore=await page.evaluate(()=>({
    queued:Number(window.CCGLostSizzlerV141R32SpyLoader.state.queuedActions||0),
    replayed:Number(window.CCGLostSizzlerV141R32SpyLoader.state.replayedActions||0)
  }));
  await page.keyboard.press("KeyE");
  await page.waitForFunction(before=>window.CCGLostSizzlerV141R32SpyLoader.state.pendingActionCode==="KeyE"&&Number(window.CCGLostSizzlerV141R32SpyLoader.state.queuedActions||0)>before,queueBefore.queued);
  const queued=await page.evaluate(()=>({
    pending:String(window.CCGLostSizzlerV141R32SpyLoader.state.pendingActionCode||""),
    queued:Number(window.CCGLostSizzlerV141R32SpyLoader.state.queuedActions||0),
    searchDowns:Number(window.CCGLostSizzlerV141R32SpyLoader.state.searchKeyDowns||0)
  }));
  assert.equal(queued.pending,"KeyE");
  assert.ok(queued.queued>queueBefore.queued);
  assert.ok(queued.searchDowns>=1);

  releaseOverhaul();
  await page.waitForFunction(()=>Boolean(window.CCGLostSizzlerV141R32SpyOverhaul)&&Boolean(window.CCGLostSizzlerV141R58SpyOverhaul)&&window.CCGLostSizzlerV141R32SpyLoader?.state?.loaded===true);
  await page.waitForFunction(before=>Number(window.CCGLostSizzlerV141R32SpyLoader.state.replayedActions||0)>before,queueBefore.replayed);

  console.log("[Stage 10 Spy interactions] establish deterministic furniture fixture and owner baselines");
  const fixture=await page.evaluate(()=>{
    const active=window.CCGLostSizzlerSpecialModes.active,m=active.state,r32=window.CCGLostSizzlerV141R32SpyOverhaul,r58=window.CCGLostSizzlerV141R58SpyOverhaul;
    r32.buildOverhaulWorld(false);r58.tick();
    const me=m.players.find(row=>String(row.id)===String(p1.id))||m.players[0];
    const ordinary=(m.map.rooms||[]).filter(room=>!room.spawn&&!room.extraction&&Number.isFinite(Number(room.dungeonRoomId)));
    const candidates=[];
    for(const room of ordinary){
      for(const physical of host.blockingDecor||[]){
        if(!physical?.spyR32Furniture||String(physical.logicalRoomId||"")!==String(room.id)||!physical.logicalFurnitureId)continue;
        const logical=(room.furniture||[]).find(row=>String(row.id)===String(physical.logicalFurnitureId));
        if(!logical)continue;
        const cell=[{x:physical.x+1,y:physical.y},{x:physical.x-1,y:physical.y},{x:physical.x,y:physical.y+1},{x:physical.x,y:physical.y-1}]
          .find(q=>world.map?.[q.y]?.[q.x]===0&&!(host.blockingDecor||[]).some(row=>Number(row.x)===q.x&&Number(row.y)===q.y)&&(host.doors||[]).every(row=>Number(row.x)!==q.x||Number(row.y)!==q.y));
        if(cell)candidates.push({room,physical,logical,cell})
      }
    }
    if(candidates.length<1)throw new Error("no deterministic Spy furniture fixture");
    const first=candidates.find(row=>!row.logical.searched)||candidates[0];
    first.logical.searched=false;
    me.roomId=first.room.id;me.x=first.cell.x;me.y=first.cell.y;me.status="active";me.hp=me.maxHp=6;me.trapCharges=5;me.timeRemainingMs=500000;
    p1.x=p1.rx=first.cell.x;p1.y=p1.ry=first.cell.y;p1.health=6;p1.maxHealth=6;
    const compact=s=>s?JSON.parse(JSON.stringify(s)):null;
    return{
      ownerId:String(me.id),roomId:String(first.room.id),furnitureId:String(first.logical.id),x:Number(first.physical.x),y:Number(first.physical.y),
      authoritative:Boolean(active.authoritative),connected:Boolean(net.connected),actionsSent:Number(r32.state.actionsSent||0),searches:Number(r32.state.searches||0),
      r56:compact(window.CCGLostSizzlerV141R56PlaytestCompletion?.state),
      r59:compact(window.CCGLostSizzlerV141R59LiveRegressionFixes?.state),
      r60:compact(window.CCGLostSizzlerV141R60HordeOptimisation?.state)
    }
  });
  assert.equal(fixture.authoritative,true,"local Spy fixture must retain host authority");
  assert.equal(fixture.connected,false,"local-authoritative Spy fixture must not require a network connection");

  console.log("[Stage 10 Spy interactions] real E starts furniture search and drives retained progress feedback");
  await page.keyboard.press("KeyE");
  await page.waitForFunction(()=>Boolean(window.CCGLostSizzlerV141R32SpyOverhaul?.state?.search));
  const searching=await page.evaluate(()=>({
    state:String(document.getElementById("spy-search-indicator")?.dataset?.state||""),
    visible:String(document.getElementById("spy-search-indicator")?.dataset?.visible||""),
    label:String(document.getElementById("spy-search-label")?.textContent||""),
    pending:Boolean(window.CCGLostSizzlerV141R32SpyOverhaul.state.search)
  }));
  assert.equal(searching.pending,true);
  assert.equal(searching.visible,"true");
  assert.equal(searching.state,"searching");
  assert.match(searching.label,/SEARCHING/i);
  await page.waitForFunction(id=>{
    const m=window.CCGLostSizzlerSpecialModes.active?.state;
    return (m?.map?.rooms||[]).some(room=>(room.furniture||[]).some(row=>String(row.id)===String(id)&&row.searched===true));
  },fixture.furnitureId);
  await page.waitForFunction(before=>Number(window.CCGLostSizzlerV141R32SpyOverhaul.state.searches||0)>before,fixture.searches);
  const searched=await page.evaluate(id=>{
    const m=window.CCGLostSizzlerSpecialModes.active.state,r32=window.CCGLostSizzlerV141R32SpyOverhaul;
    const row=(m.map.rooms||[]).flatMap(room=>room.furniture||[]).find(item=>String(item.id)===String(id));
    return{searched:Boolean(row?.searched),searches:Number(r32.state.searches||0),searchActive:Boolean(r32.state.search),actionsSent:Number(r32.state.actionsSent||0)}
  },fixture.furnitureId);
  assert.equal(searched.searched,true);
  assert.equal(searched.searchActive,false);
  assert.equal(searched.actionsSent,fixture.actionsSent,"authoritative local search must not emit a network action");

  console.log("[Stage 10 Spy interactions] repeated E on searched furniture is rejected without a duplicate search");
  await page.keyboard.press("KeyE");
  await page.waitForTimeout(120);
  const repeated=await page.evaluate(()=>({searches:Number(window.CCGLostSizzlerV141R32SpyOverhaul.state.searches||0),active:Boolean(window.CCGLostSizzlerV141R32SpyOverhaul.state.search)}));
  assert.equal(repeated.searches,searched.searches);
  assert.equal(repeated.active,false);

  console.log("[Stage 10 Spy interactions] TAB owns field kit, safe loadout renders, numeric selection works");
  await page.keyboard.press("Tab");
  await page.waitForFunction(()=>window.CCGLostSizzlerV141R32SpyOverhaul?.state?.inventoryOpen===true&&document.body.dataset.spyR32Inventory==="true");
  const inventory=await page.evaluate(()=>{
    const m=window.CCGLostSizzlerSpecialModes.active.state,r32=window.CCGLostSizzlerV141R32SpyOverhaul,sab=window.CCGLostSizzlerSaboteurs;
    const panel=document.getElementById("spy-r32-inventory");
    return{
      mode:String(typeof mode==="undefined"?"":mode),
      open:Boolean(r32.state.inventoryOpen),
      body:String(document.body.dataset.spyR32Inventory||""),
      display:panel?getComputedStyle(panel).display:"",
      loadout:[...(m.trapLoadout||[])],
      known:[...(m.trapLoadout||[])].every(id=>Boolean(sab?.TRAPS?.[id])),
      buttons:panel?.querySelectorAll?.("[data-spy-trap-index]")?.length||0,
      charges:Number((m.players.find(row=>String(row.id)===String(p1.id))||m.players[0])?.trapCharges||0)
    }
  });
  assert.equal(inventory.mode,"playing");
  assert.equal(inventory.open,true);
  assert.equal(inventory.body,"true");
  assert.notEqual(inventory.display,"none");
  assert.ok(inventory.loadout.length>=3);
  assert.equal(inventory.known,true);
  assert.equal(inventory.buttons,inventory.loadout.length);
  assert.ok(inventory.charges>0);

  await page.keyboard.press("Digit2");
  await page.waitForFunction(()=>Number(window.CCGLostSizzlerV141R32SpyOverhaul.state.selectedTrapIndex)===1);
  const blockedBefore=await page.evaluate(()=>({
    searches:Number(window.CCGLostSizzlerV141R32SpyOverhaul.state.searches||0),
    traps:Number(window.CCGLostSizzlerSpecialModes.active.state.traps?.length||0),
    extraction:Boolean(window.CCGLostSizzlerSpecialModes.active.state.r58Extraction)
  }));
  await page.keyboard.press("KeyE");
  await page.keyboard.press("KeyT");
  await page.keyboard.press("KeyX");
  await page.waitForTimeout(120);
  const blockedAfter=await page.evaluate(()=>({
    searches:Number(window.CCGLostSizzlerV141R32SpyOverhaul.state.searches||0),
    traps:Number(window.CCGLostSizzlerSpecialModes.active.state.traps?.length||0),
    extraction:Boolean(window.CCGLostSizzlerSpecialModes.active.state.r58Extraction),
    search:Boolean(window.CCGLostSizzlerV141R32SpyOverhaul.state.search),
    open:Boolean(window.CCGLostSizzlerV141R32SpyOverhaul.state.inventoryOpen)
  }));
  assert.deepEqual(blockedAfter,{...blockedBefore,search:false,open:true},"E/T/X must remain blocked while the field kit owns input");

  await page.keyboard.press("Tab");
  await page.waitForFunction(()=>window.CCGLostSizzlerV141R32SpyOverhaul?.state?.inventoryOpen===false&&document.body.dataset.spyR32Inventory!=="true");

  console.log("[Stage 10 Spy interactions] real T places selected safe trap locally and consumes one charge");
  const trapFixture=await page.evaluate(()=>{
    const m=window.CCGLostSizzlerSpecialModes.active.state,r32=window.CCGLostSizzlerV141R32SpyOverhaul,me=m.players.find(row=>String(row.id)===String(p1.id))||m.players[0];
    const physical=(host.blockingDecor||[]).find(row=>row?.spyR32Furniture&&row.logicalFurnitureId);
    if(!physical)throw new Error("no Spy trap furniture");
    const room=(m.map.rooms||[]).find(row=>String(row.id)===String(physical.logicalRoomId));
    const cell=[{x:physical.x+1,y:physical.y},{x:physical.x-1,y:physical.y},{x:physical.x,y:physical.y+1},{x:physical.x,y:physical.y-1}]
      .find(q=>world.map?.[q.y]?.[q.x]===0&&!(host.blockingDecor||[]).some(row=>Number(row.x)===q.x&&Number(row.y)===q.y)&&(host.doors||[]).every(row=>Number(row.x)!==q.x||Number(row.y)!==q.y));
    if(!room||!cell)throw new Error("no walkable Spy trap fixture");
    me.roomId=room.id;me.x=cell.x;me.y=cell.y;me.status="active";me.trapCharges=5;p1.x=p1.rx=cell.x;p1.y=p1.ry=cell.y;
    r32.selectTrap(0);
    return{ownerId:String(me.id),targetId:String(physical.logicalFurnitureId),before:Number(m.traps?.length||0),charges:Number(me.trapCharges),placed:Number(r32.state.trapsPlaced||0),actionsSent:Number(r32.state.actionsSent||0),selected:String(m.trapLoadout?.[0]||"")}
  });
  await page.keyboard.press("KeyT");
  await page.waitForFunction(before=>Number(window.CCGLostSizzlerSpecialModes.active.state.traps?.length||0)>before,trapFixture.before);
  const trapped=await page.evaluate(({ownerId,targetId})=>{
    const m=window.CCGLostSizzlerSpecialModes.active.state,r32=window.CCGLostSizzlerV141R32SpyOverhaul,me=m.players.find(row=>String(row.id)===ownerId),trap=[...(m.traps||[])].reverse().find(row=>String(row.ownerId)===ownerId&&row.armed);
    return{
      trap:trap?{trapId:String(trap.trapId),ownerId:String(trap.ownerId),targetType:String(trap.targetType),targetId:String(trap.targetId),armed:Boolean(trap.armed)}:null,
      charges:Number(me?.trapCharges||0),placed:Number(r32.state.trapsPlaced||0),actionsSent:Number(r32.state.actionsSent||0),targetId:String(targetId)
    }
  },trapFixture);
  assert.ok(trapped.trap);
  assert.equal(trapped.trap.trapId,trapFixture.selected);
  assert.equal(trapped.trap.ownerId,trapFixture.ownerId);
  assert.equal(trapped.trap.targetType,"furniture");
  assert.equal(trapped.trap.targetId,trapped.targetId);
  assert.equal(trapped.trap.armed,true);
  assert.equal(trapped.charges,trapFixture.charges-1);
  assert.ok(trapped.placed>trapFixture.placed);
  assert.equal(trapped.actionsSent,trapFixture.actionsSent,"authoritative local trap placement must not emit a network action");

  console.log("[Stage 10 Spy interactions] real X starts complete-case extraction through retained owner");
  const extractFixture=await page.evaluate(()=>{
    const m=window.CCGLostSizzlerSpecialModes.active.state,r32=window.CCGLostSizzlerV141R32SpyOverhaul,me=m.players.find(row=>String(row.id)===String(p1.id))||m.players[0],other=m.players.find(row=>row!==me);
    m.state="playing";m.matchWinnerId=null;m.completedAt=0;m.r58Extraction=null;m.r58ClockAt=Date.now();
    me.status="active";me.hp=me.maxHp;me.hasCase=true;me.objectives=["joystick","tape","key"];me.looseItem=null;me.roomId=m.map.extractionRoomId;me.timeRemainingMs=300000;
    if(other){other.status="active";other.timeRemainingMs=300000}
    return{ownerId:String(me.id),actionsSent:Number(r32.state.actionsSent||0)}
  });
  await page.keyboard.press("KeyX");
  await page.waitForFunction(id=>String(window.CCGLostSizzlerSpecialModes.active.state.r58Extraction?.playerId||"")===String(id),extractFixture.ownerId);
  const extraction=await page.evaluate(()=>({
    playerId:String(window.CCGLostSizzlerSpecialModes.active.state.r58Extraction?.playerId||""),
    duration:Number(window.CCGLostSizzlerSpecialModes.active.state.r58Extraction?.completesAt||0)-Number(window.CCGLostSizzlerSpecialModes.active.state.r58Extraction?.startedAt||0),
    actionsSent:Number(window.CCGLostSizzlerV141R32SpyOverhaul.state.actionsSent||0)
  }));
  assert.equal(extraction.playerId,extractFixture.ownerId);
  assert.equal(extraction.duration,3000);
  assert.equal(extraction.actionsSent,extractFixture.actionsSent,"authoritative local extraction must not emit a network action");

  console.log("[Stage 10 Spy interactions] Spy actions do not wake accepted Solo/Horde owners");
  const finalOwners=await page.evaluate(()=>{
    const compact=s=>s?JSON.parse(JSON.stringify(s)):null;
    return{
      r56:compact(window.CCGLostSizzlerV141R56PlaytestCompletion?.state),
      r59:compact(window.CCGLostSizzlerV141R59LiveRegressionFixes?.state),
      r60:compact(window.CCGLostSizzlerV141R60HordeOptimisation?.state),
      controller:String(document.body.dataset.modeController||""),
      special:String(document.body.dataset.specialMode||"")
    }
  });
  assert.equal(finalOwners.controller,"spy-online");
  assert.equal(finalOwners.special,"sizzler-saboteurs");
  const stableCounter=(before,after,key)=>{
    if(before==null||after==null||!(key in before)||!(key in after))return;
    assert.equal(Number(after[key]||0),Number(before[key]||0),`${key} must not advance during Spy interaction gate`)
  };
  for(const key of ["combatRearms","trapHits","environmentTicks","inventoryRenders"])stableCounter(fixture.r56,finalOwners.r56,key);
  for(const key of ["soloFrames","soloUpdates","dungeonFrames"])stableCounter(fixture.r59,finalOwners.r59,key);
  for(const key of ["frames","hordeFrames","ticks"])stableCounter(fixture.r60,finalOwners.r60,key);

  assert.deepEqual(errors,[],`Stage 10 Spy search/inventory/trap gate must not throw browser errors: ${errors.join("\n")}`);
  await context.close();
  console.log("Lost Sizzler Stage 10 Spy search, inventory, trap and extraction interaction gate passed in Chromium.");
}finally{
  try{releaseOverhaul?.()}catch(_){}
  await browser.close();
  for(const socket of sockets)socket.destroy();
  await new Promise(resolve=>server.close(()=>resolve()))
}
