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
  const context=await browser.newContext({viewport:{width:1600,height:1000}}),page=await context.newPage();page.setDefaultTimeout(45000);const errors=[];page.on("pageerror",error=>errors.push(String(error?.stack||error)));
  console.log("[r33 Spy] load canonical page");
  await page.goto(`${origin}/arcade/lost-sizzler/`,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.body.dataset.releaseReady==="true"&&Boolean(window.CCGLostSizzlerV141R32SpyLoader)&&Boolean(window.CCGLostSizzlerPlayerInsights));

  console.log("[r33 Spy] validate merged global account-rated suppression");
  await page.waitForTimeout(500);
  const globalRating=await page.evaluate(async()=>{
    const insights=window.CCGLostSizzlerPlayerInsights,supabase=window.ccgSupabase||(window.ccgSupabase={}),original=supabase.getClient;
    supabase.getClient=async()=>({functions:{invoke:async(_name,{body}={})=>body?.action==="rating_status"?{data:{success:true,authenticated:true,rated:true},error:null}:{data:{success:true},error:null}}});
    const rated=await insights.accountHasRating(true);
    const panel=document.getElementById("ccg-rating-panel");panel?.classList?.remove("hidden");
    const shown=await insights.showRating();
    const result={rated,shown,hidden:Boolean(panel?.classList?.contains("hidden")),state:insights.state};
    supabase.getClient=original;return result;
  });
  assert.equal(globalRating.rated,true,"merged player-insights owner must recognise an already-rated account");
  assert.equal(globalRating.shown,false,"an already-rated account must not reopen the rating prompt");
  assert.equal(globalRating.hidden,true,"already-rated account must keep the rating popup hidden in every game mode");
  assert.equal(globalRating.state.accountAlreadyRated,true,"merged account-rating state must remain latched after the check");

  console.log("[r33 Spy] start through special-mode adapter");
  const started=await page.evaluate(()=>{
    net.setSolo("Agent One");const id=String(net.sessionId);
    return window.CCGLostSizzlerSpecialModes.startOnline({roomMode:"sizzler-saboteurs",players:[{id,name:"Agent One"},{id:"TEST-SPY-B",name:"Agent Two"}],hostId:id,seed:"V141-R33-CLASSIC",roomCode:"R33SPY"});
  });
  assert.equal(started,true,"r33 Spy fixture must start through the real special-mode adapter");
  await page.waitForFunction(()=>document.body.dataset.specialMode==="sizzler-saboteurs"&&Boolean(window.CCGLostSizzlerV141R32SpyLoader?.state?.loaded)&&Boolean(window.CCGLostSizzlerV141R32SpyPacketOwner)&&Boolean(window.CCGLostSizzlerV141R32SpyOverhaul?.state?.worldBuilds)&&Boolean(document.getElementById("spy-classic-trapulators")));

  console.log("[r33 Spy] validate classic Trapulator and rooms-only maps");
  const classic=await page.evaluate(()=>{
    const api=window.CCGLostSizzlerV141R32SpyPacketOwner,match=window.CCGLostSizzlerSpecialModes.active.state,root=document.getElementById("spy-classic-trapulators"),panels=[...root.querySelectorAll(".spy-classic-trapulator")];
    const split=(()=>{let fn=window.render,depth=0;while(typeof fn==="function"&&depth++<16){if(fn.__ccgV141R33SpySplit)return true;fn=fn.__ccgOriginal}return false})();
    return{loadout:[...(match.trapLoadout||[])],names:api.CLASSIC_TRAPS.map(row=>row.name),effects:api.CLASSIC_TRAPS.map(row=>row.effect),panelCount:panels.length,maps:panels.map(panel=>panel.querySelector(".spy-classic-map")?.dataset?.mapMode||""),split,display:getComputedStyle(root).display};
  });
  assert.deepEqual(classic.loadout,["powerBrick","spring","custard"],"Spy must expose only the fixed Bomb, Spring and Water Bucket trap set");
  assert.deepEqual(classic.names,["BOMB","SPRING","WATER BUCKET"],"Trapulator must use understandable classic-style trap names");
  assert.ok(classic.effects.every(text=>text.length>5),"every trap must explain its victim penalty in the Trapulator");
  assert.equal(classic.panelCount,2,"Spy must mount one Trapulator panel for each player");
  assert.deepEqual(classic.maps,["rooms-only","rooms-only"],"both Spy maps must be rooms-only references with no player/trail mode");
  assert.equal(classic.split,true,"active render chain must retain the simultaneous Spy split-screen owner");
  assert.notEqual(classic.display,"none","Trapulator must be visible while Spy is active");

  console.log("[r33 Spy] validate TAB inventory ownership");
  await page.keyboard.press("Tab");await page.waitForTimeout(80);
  const inventoryOpen=await page.evaluate(()=>({spyOpen:Boolean(window.CCGLostSizzlerV141R32SpyOverhaul.state.inventoryOpen),mode:String(mode),sharedHidden:UI.inventory.classList.contains("hidden"),dataset:document.body.dataset.spyR32Inventory||""}));
  assert.equal(inventoryOpen.spyOpen,true,"TAB must open the Spy item inventory");
  assert.equal(inventoryOpen.mode,"playing","opening Spy inventory must never hand control to shared Dungeon inventory mode");
  assert.equal(inventoryOpen.sharedHidden,true,"shared Dungeon inventory must stay hidden in Spy");
  assert.equal(inventoryOpen.dataset,"true","Spy inventory data state must reflect TAB open");
  await page.keyboard.press("Tab");await page.waitForTimeout(80);
  const inventoryClosed=await page.evaluate(()=>({spyOpen:Boolean(window.CCGLostSizzlerV141R32SpyOverhaul.state.inventoryOpen),mode:String(mode)}));
  assert.equal(inventoryClosed.spyOpen,false,"second TAB press must close Spy inventory");
  assert.equal(inventoryClosed.mode,"playing","closing Spy inventory must return immediately to playing mode");

  console.log("[r33 Spy] validate movement after closing inventory");
  const moveFixture=await page.evaluate(()=>{
    const choices=[{code:"ArrowRight",dx:1,dy:0},{code:"ArrowLeft",dx:-1,dy:0},{code:"ArrowDown",dx:0,dy:1},{code:"ArrowUp",dx:0,dy:-1}];
    const open=choices.find(row=>world.map?.[Number(p1.y)+row.dy]?.[Number(p1.x)+row.dx]===0&&!(host.blockingDecor||[]).some(item=>Number(item.x)===Number(p1.x)+row.dx&&Number(item.y)===Number(p1.y)+row.dy));
    if(!open)throw new Error("no open movement direction after Spy inventory close");return{x:Number(p1.x),y:Number(p1.y),code:open.code}
  });
  await page.keyboard.down(moveFixture.code);await page.waitForTimeout(520);await page.keyboard.up(moveFixture.code);await page.waitForTimeout(120);
  const movementEnd=await page.evaluate(()=>({x:Number(p1.x),y:Number(p1.y)}));
  assert.ok(Math.abs(movementEnd.x-moveFixture.x)+Math.abs(movementEnd.y-moveFixture.y)>0,`player must still move after opening/closing inventory; ${JSON.stringify(moveFixture)} -> ${JSON.stringify(movementEnd)}`);

  console.log("[r33 Spy] validate repeat-search state");
  const searchFixture=await page.evaluate(()=>{
    const active=window.CCGLostSizzlerSpecialModes.active,match=active.state,model=match.players.find(row=>String(row.id)===String(p1.id))||match.players[0],blocker=(host.blockingDecor||[]).find(item=>item?.spyR32Furniture);if(!blocker)throw new Error("no Spy furniture");
    const room=match.map.rooms.find(row=>(row.furniture||[]).some(item=>String(item.id)===String(blocker.logicalFurnitureId))),item=room?.furniture?.find(row=>String(row.id)===String(blocker.logicalFurnitureId));if(!room||!item)throw new Error("could not map Spy furniture");item.searched=false;item.contents=null;
    const cells=[[1,0],[-1,0],[0,1],[0,-1]].map(([dx,dy])=>({x:Number(blocker.x)+dx,y:Number(blocker.y)+dy})).filter(cell=>world.map?.[cell.y]?.[cell.x]===0&&!(host.blockingDecor||[]).some(row=>Number(row.x)===cell.x&&Number(row.y)===cell.y));const cell=cells[0];if(!cell)throw new Error("no open furniture neighbour");
    p1.x=p1.rx=cell.x;p1.y=p1.ry=cell.y;model.x=cell.x;model.y=cell.y;model.roomId=room.id;return{id:item.id};
  });
  await page.keyboard.press("KeyE");await page.waitForTimeout(850);
  const searched=await page.evaluate(id=>{const match=window.CCGLostSizzlerSpecialModes.active.state;for(const room of match.map.rooms){const item=(room.furniture||[]).find(row=>String(row.id)===String(id));if(item)return Boolean(item.searched)}return false},searchFixture.id);
  assert.equal(searched,true,"even empty furniture must become searched after the first completed search");
  await page.keyboard.press("KeyE");await page.waitForTimeout(180);
  const repeated=await page.evaluate(()=>({toast:document.getElementById("spy-r32-objective-toast")?.textContent||"",indicator:document.getElementById("spy-search-label")?.textContent||""}));
  assert.ok(repeated.toast.includes("YOU HAVE ALREADY SEARCHED")||repeated.indicator.includes("YOU HAVE ALREADY SEARCHED"),`second search must say YOU HAVE ALREADY SEARCHED; ${JSON.stringify(repeated)}`);

  console.log("[r33 Spy] validate lazy Spy rating guard agrees with merged global owner");
  const rating=await page.evaluate(async()=>{
    const api=window.CCGLostSizzlerV141R32SpyPacketOwner,supabase=window.ccgSupabase||(window.ccgSupabase={}),original=supabase.getCurrentUserContext;
    supabase.getCurrentUserContext=async()=>({user:{id:"R33-RATED-USER"}});localStorage.setItem("ccg-lost-sizzler-rated:R33-RATED-USER","1");api.state.ratingChecked=false;await api.checkRatingEligibility(true);const panel=document.getElementById("ccg-rating-panel");panel?.classList?.remove("hidden");api.suppressRatingPrompt();supabase.getCurrentUserContext=original;return{rated:api.state.ratingAlreadySubmitted,hidden:Boolean(panel?.classList?.contains("hidden")),attr:document.body.dataset.ccgLostSizzlerRated||""};
  });
  assert.equal(rating.rated,true,"lazy Spy owner must agree that the logged-in account has already rated");
  assert.equal(rating.hidden,true,"Spy must not reopen the global rating prompt for an already-rated account");
  assert.equal(rating.attr,"true","already-rated state must remain exposed to the suppression guard in Spy");

  console.log("[r33 Spy] validate two-live-agent split render");
  const fakeRemote=await page.evaluate(()=>{
    const m=window.CCGLostSizzlerSpecialModes.active.state,model=m.players.find(row=>row.id==="TEST-SPY-B"),room=m.map.rooms.find(row=>row.id===model.roomId),physical=world.rooms[Number(room.dungeonRoomId)],x=Math.floor(physical.x+physical.w/2),y=Math.floor(physical.y+physical.h/2);remote.set(model.id,{...p1,id:model.id,name:model.name,x,y,rx:x,ry:y,lastSeen:performance.now(),health:model.hp,maxHealth:model.maxHp});window.render();return{remote:remote.has(model.id),panels:[...document.querySelectorAll(".spy-classic-trapulator")].map(node=>node.getBoundingClientRect().height)};
  });
  assert.equal(fakeRemote.remote,true,"split-screen fixture must have a live second multiplayer agent");
  assert.ok(fakeRemote.panels.every(height=>height>50),"both split-screen Trapulator halves must remain visible after rendering two live agents");

  assert.deepEqual(errors,[],`r33 Spy classic UX browser regression must have no uncaught errors: ${errors.join("\n")}`);
  console.log("Lost Sizzler r33 Spy split HUD, TAB inventory, rooms-only map, repeated-search and account-rating guards passed in Chromium.");
  await context.close();
}finally{
  await browser.close();for(const socket of sockets)socket.destroy();await new Promise(resolve=>server.close(()=>resolve()));
}
