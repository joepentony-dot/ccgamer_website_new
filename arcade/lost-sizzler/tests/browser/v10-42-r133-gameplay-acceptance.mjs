import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {chromium} from "playwright";

const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../../../..");
const mime={".html":"text/html",".js":"text/javascript",".css":"text/css",".json":"application/json",".svg":"image/svg+xml",".png":"image/png",".webp":"image/webp",".jpg":"image/jpeg",".ogg":"audio/ogg",".wav":"audio/wav",".mp3":"audio/mpeg"};
const sockets=new Set(),server=http.createServer((req,res)=>{
  const pathname=decodeURIComponent(new URL(req.url,"http://local").pathname);
  const file=path.resolve(repo,`.${pathname.endsWith("/")?pathname+"index.html":pathname}`);
  if(!file.startsWith(repo+path.sep)){res.writeHead(403).end();return}
  fs.readFile(file,(error,data)=>{if(error){res.writeHead(404).end();return}res.writeHead(200,{"content-type":mime[path.extname(file)]||"application/octet-stream","cache-control":"no-store"});res.end(data)});
});
server.on("connection",socket=>{sockets.add(socket);socket.on("close",()=>sockets.delete(socket))});
await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,args:["--disable-dev-shm-usage","--disable-background-networking","--autoplay-policy=no-user-gesture-required"]});

async function snapshot(page){return page.evaluate(()=>({
  essence:Number(p1.banishmentEssence||0),flasks:PGR.inventoryKindCount(p1,"banishment"),
  gold:Number(run.gold),score:Number(score),inventory:JSON.stringify(p1.inventory),
  trades:Number(window.CCGLostSizzlerV142ArtefactShopStability.diagnostics.trades),
  rollbacks:Number(window.CCGLostSizzlerV142ArtefactShopStability.diagnostics.rollbacks),
  goldFlaskBought:Boolean(host.trader.sold?.banishmentGold||host.trader.sold?.banishmentScore)
}))}

async function enterAlchemist(page){
  const key=await page.evaluate(()=>{
    const shop=host.trader;
    if(!shop?.active||!shop.v142Alchemist)return null;
    const dirs=[{x:1,y:0,key:"ArrowLeft"},{x:-1,y:0,key:"ArrowRight"},{x:0,y:1,key:"ArrowUp"},{x:0,y:-1,key:"ArrowDown"}];
    const d=dirs.find(d=>W.walkable(world.map,shop.x+d.x,shop.y+d.y,host)&&!host.enemies.some(e=>e.alive&&e.x===shop.x+d.x&&e.y===shop.y+d.y));
    if(!d)return null;
    // Position only the player beside the generated merchant. The keyboard
    // movement, merchant trigger, rendered card and purchase handlers stay real.
    p1.x=p1.rx=shop.x+d.x;p1.y=p1.ry=shop.y+d.y;p1.hitStunMs=0;p1.moveCooldown=0;
    return d.key;
  });
  assert.ok(key,"fixed seed must provide an accessible generated Alchemist");
  // Movement is frame-driven: retain the key through the actual step instead
  // of issuing a down/up pair that can finish between animation frames.
  await page.keyboard.down(key);
  try{await page.waitForFunction(()=>mode==="shop"&&!UI.shop.classList.contains("hidden"))}catch(error){
    console.error("ALCHEMIST_ENTRY",await page.evaluate(()=>({mode,p:{x:p1.x,y:p1.y,hp:p1.health,hitStun:p1.hitStunMs},shop:host.trader,shops:host.shops.map(s=>({id:s.id,x:s.x,y:s.y,active:s.active})),input:[...input],hidden:UI.shop.classList.contains("hidden")})));
    throw error;
  }finally{await page.keyboard.up(key)}
  assert.match(await page.locator('#shop-items [data-shop-buy="banishment"]').evaluate(button=>button.closest("article").textContent),/3 ESSENCE/);
}

async function verifyOffscreenGoblin(page){
  await page.locator("#inventory-close-top").click();
  await page.waitForFunction(()=>mode==="playing");
  const goblinId=await page.evaluate(()=>{
    const goblin=host.enemies.find(enemy=>enemy.treasureGoblin&&enemy.alive);
    if(!goblin)return null;
    const near=[[1,0],[-1,0],[0,1],[0,-1]].map(([dx,dy])=>({x:goblin.x+dx,y:goblin.y+dy})).find(p=>W.walkable(world.map,p.x,p.y,host));
    if(!near)return null;
    // Keep incidental combat out of the timer observation. The generated Goblin,
    // real frame loop, AI, authored 22-second timer and notices are unchanged.
    p1.maxHealth=5000;p1.health=5000;p1.x=p1.rx=near.x;p1.y=p1.ry=near.y;
    return goblin.id;
  });
  assert.ok(goblinId,"fixed-seed gameplay must contain a living Treasure Goblin");
  await page.waitForFunction(id=>host.enemies.find(enemy=>enemy.id===id)?.treasureGoblinSpotted===true||mode==="dossier",goblinId);
  if(await page.evaluate(()=>mode==="dossier")){
    await page.locator("#named-dossier-close").click();
    await page.waitForFunction(()=>mode==="playing");
  }
  try{await page.waitForFunction(id=>host.enemies.find(enemy=>enemy.id===id)?.treasureGoblinSpotted===true,goblinId)}catch(error){
    console.error("GOBLIN_SIGHTING",await page.evaluate(id=>({mode,elapsed:run.elapsed,p:{x:p1.x,y:p1.y,health:p1.health},goblin:host.enemies.find(enemy=>enemy.id===id),diagnostics:window.CCGAI.getSimulationDiagnostics()}),goblinId));throw error;
  }
  // Visiting a generated enemy room can legitimately open the once-per-run
  // named dossier. Close that real UI before measuring active simulation time.
  await page.waitForTimeout(500);
  if(await page.evaluate(()=>mode==="dossier"))await page.locator("#named-dossier-close").click();
  await page.waitForFunction(()=>mode==="playing");
  const before=await page.evaluate(id=>{
    const goblin=host.enemies.find(enemy=>enemy.id===id),AI=window.CCGAI;
    const far=world.rooms.map(room=>({x:Math.floor(room.x+room.w/2),y:Math.floor(room.y+room.h/2)})).find(p=>Math.hypot(p.x-goblin.x,p.y-goblin.y)>40&&!AI.simulationRoomsForPlayersForTest(world,[p]).has(W.roomAt(world,goblin.x,goblin.y)));
    if(!far)return null;
    p1.x=p1.rx=far.x;p1.y=p1.ry=far.y;
    return{clock:goblin.escapeMs,elapsed:run.elapsed};
  },goblinId);
  assert.ok(before?.clock>0&&before.clock<=22000,"sighting must start the authored 22-second timer");
  try{await page.waitForFunction(({id,clock})=>{
    const goblin=host.enemies.find(enemy=>enemy.id===id);
    return goblin.escapeMs<clock-500;
  },{id:goblinId,clock:before.clock},{timeout:5000})}catch(error){
    console.error("GOBLIN_OFFSCREEN",await page.evaluate(id=>({mode,elapsed:run.elapsed,p:{x:p1.x,y:p1.y,health:p1.health},goblin:host.enemies.find(enemy=>enemy.id===id),diagnostics:window.CCGAI.getSimulationDiagnostics()}),goblinId));throw error;
  }
  await page.waitForFunction(id=>host.enemies.find(enemy=>enemy.id===id)?.treasureGoblinEscaped===true,goblinId);
  const after=await page.evaluate(id=>{const goblin=host.enemies.find(enemy=>enemy.id===id);return{alive:goblin.alive,defeated:Boolean(goblin.treasureGoblinDefeated),clock:goblin.escapeMs,elapsed:run.elapsed,mode}},goblinId);
  assert.equal(after.alive,false);assert.equal(after.defeated,false);assert.ok(after.clock<=0);
  assert.ok(after.elapsed-before.elapsed>=before.clock,"live escape must wait the entire remaining simulation countdown");
  assert.equal(after.mode,"playing");
  console.log(`R133 real-frame offscreen Goblin escape PASS: ${JSON.stringify({before,after})}`);
}

try{
  for(const viewport of [{width:1440,height:900},{width:390,height:844}]){
    const context=await browser.newContext({viewport,reducedMotion:viewport.width<700?"reduce":"no-preference"});
    let storageAttempts=0;
    await context.route("https://*.supabase.co/**",route=>{
      if(new URL(route.request().url()).pathname.startsWith("/storage/v1/object/")){storageAttempts++;return route.abort()}
      return route.fulfill({status:200,contentType:"application/json",body:"{}",headers:{"access-control-allow-origin":"*"}});
    });
    await context.addInitScript(()=>{
      localStorage.setItem("ccg-lost-sizzler-tutorial-seen-v1","true");
      localStorage.setItem("ccg-lost-sizzler-tutorial-complete-v1","true");
    });
    const page=await context.newPage(),errors=[];
    page.on("pageerror",error=>errors.push(String(error.stack||error)));
    page.setDefaultTimeout(30000);
    await page.goto(`${origin}/arcade/lost-sizzler/`,{waitUntil:"domcontentloaded"});
    await page.waitForFunction(()=>document.body.dataset.releaseReady==="true"&&window.CCGDungeonProgressionFoundation?.ready&&window.CCGLostSizzlerV142ArtefactShopStability?.isInstalled(),null,{timeout:90000});
    await page.locator("#solo-btn").click();
    await page.waitForFunction(()=>mode==="playing"&&document.body.dataset.runActive==="true");
    const fixture=await page.evaluate(()=>{
      if(!beginRun({seed:"ccg-r133-alchemist-ui-20261012"}))return null;
      p1.inventory=[];p1.inventorySlots=3;p1.banishmentEssence=0;p1.banishmentEssenceCost=3;
      run.gold=123;score=4567;p1.health=p1.maxHealth-2;
      const room=world.rooms[world.startRoomId];
      for(let y=room.y+1;y<room.y+room.h-1;y++)for(let x=room.x+1;x<room.x+room.w-2;x++){
        if([x,x+1].some(tx=>!W.walkable(world.map,tx,y,host)||host.items.some(i=>i.active&&i.x===tx&&i.y===y)||host.enemies.some(e=>e.alive&&e.x===tx&&e.y===y)))continue;
        p1.x=p1.rx=x;p1.y=p1.ry=y;
        return{x,y,seed:run.seed,initialFlasks:PGR.inventoryKindCount(p1,"banishment")};
      }
      return null;
    });
    assert.ok(fixture,"fixed seed must expose a clear pickup pair");
    assert.equal(fixture.initialFlasks,0,"run must start with no previously purchased Gold Flask");
    // Controlled ordinary floor rewards are collected through actual keyboard
    // movement/requestCollect/applyLoot; never assign the earned Essence directly.
    const rewards=["potion","torch","teleport","artefact","artefact","artefact"];
    for(let index=0;index<rewards.length;index++){
      const kind=rewards[index],id=`r133-reward-${index}`;
      await page.evaluate(({kind,id,fixture,index})=>{
        const x=fixture.x+(index%2===0?1:0);
        host.items.push({id,x,y:fixture.y,active:true,kind:"loot",loot:{kind,name:kind==="artefact"?"Banishment Essence":kind,rarity:"SIZZLER",xp:0}});
        p1.hitStunMs=0;p1.moveCooldown=0;
      },{kind,id,fixture,index});
      const key=index%2===0?"ArrowRight":"ArrowLeft";
      await page.keyboard.down(key);
      try{await page.waitForFunction(id=>host.items.find(item=>item.id===id)?.active===false,id)}finally{await page.keyboard.up(key)}
      if(kind==="artefact")assert.equal((await snapshot(page)).essence,index-2,"each floor reward must contribute exactly one Vessel Essence");
    }
    const collected=await snapshot(page);
    assert.equal(collected.essence,3);assert.equal(collected.flasks,0);assert.equal(collected.goldFlaskBought,false);
    await page.keyboard.press("Tab");
    await page.waitForFunction(()=>mode==="inventory"&&!UI.inventory.classList.contains("hidden"));
    assert.match(await page.locator("#v142-rpg-sheet").textContent(),/3\/3 ESSENCE/);
    assert.equal(await page.locator("#inventory-list .inventory-slot.filled").count(),3,"Vessel Essence must not consume a fourth inventory slot");
    await page.locator("#inventory-close-top").click();
    await page.waitForFunction(()=>mode==="playing");
    await enterAlchemist(page);
    const before=await snapshot(page);
    await page.locator('[data-shop-buy="banishment"]').click();
    const refused=await snapshot(page);
    assert.equal(refused.rollbacks,before.rollbacks+1,"full inventory UI click must reach the actual rollback owner");
    assert.equal(refused.inventory,before.inventory);assert.equal(refused.essence,3);assert.equal(refused.flasks,0);
    assert.equal(refused.gold,before.gold);assert.equal(refused.score,before.score);
    await page.locator("#shop-close").click();
    await page.keyboard.press("Tab");
    await page.waitForFunction(()=>mode==="inventory");
    const health=await page.evaluate(()=>p1.health);
    await page.locator('#inventory-list [data-use="0"]').click();
    assert.ok(await page.evaluate(old=>p1.health>old,health),"actual inventory Use must consume the Potion and heal");
    assert.equal(await page.locator("#inventory-list .inventory-slot.filled").count(),2);
    await page.locator("#inventory-close-top").click();
    await enterAlchemist(page);
    const funded=await snapshot(page);
    await page.locator('[data-shop-buy="banishment"]').click();
    const distilled=await snapshot(page);
    assert.equal(distilled.trades,funded.trades+1);assert.equal(distilled.essence,0);assert.equal(distilled.flasks,1);
    assert.equal(distilled.gold,funded.gold);assert.equal(distilled.score,funded.score);assert.equal(distilled.goldFlaskBought,false);
    assert.equal(await page.locator("#shop-artefacts").textContent(),"0","real wallet must refresh after the exchange");
    await page.locator('[data-shop-buy="banishment"]').click();
    const repeated=await snapshot(page);
    assert.deepEqual(repeated,distilled,"repeat UI click with spent Essence must neither duplicate Flask nor spend currency");
    await page.locator("#shop-close").click();
    await page.keyboard.press("Tab");
    await page.waitForFunction(()=>mode==="inventory");
    assert.equal(await page.locator("#inventory-list .inventory-slot.filled").filter({hasText:"WARD BREAK"}).count(),1,"actual inventory must show exactly one distilled Flask under its current Ward-Break label");
    if(viewport.width===1440)await verifyOffscreenGoblin(page);
    assert.equal(storageAttempts,0,"gameplay acceptance must attempt no production Supabase media");
    assert.deepEqual(errors,[]);
    console.log(`R133 Alchemist UI acceptance PASS ${viewport.width}x${viewport.height}: ${JSON.stringify({seed:fixture.seed,before:funded,after:distilled})}`);
    await context.close();
  }
}finally{
  await browser.close();for(const socket of sockets)socket.destroy();await new Promise(resolve=>server.close(resolve));
}
