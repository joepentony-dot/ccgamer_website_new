import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {chromium} from "playwright";

const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,"../../../..");
const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".mjs":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json",".svg":"image/svg+xml",".webp":"image/webp",".png":"image/png",".jpg":"image/jpeg",".jpeg":"image/jpeg",".mp3":"audio/mpeg",".wav":"audio/wav",".ogg":"audio/ogg"};
const sockets=new Set();
const server=http.createServer((req,res)=>{
  try{
    const pathname=decodeURIComponent(new URL(req.url,"http://local").pathname);
    const relative=pathname.endsWith("/")?`${pathname}index.html`:pathname;
    const file=path.resolve(repo,`.${relative}`);
    if(!file.startsWith(`${repo}${path.sep}`)&&file!==repo){res.writeHead(403).end("forbidden");return}
    fs.readFile(file,(error,data)=>{
      if(error){res.writeHead(404).end("not found");return}
      res.writeHead(200,{"content-type":mime[path.extname(file).toLowerCase()]||"application/octet-stream","cache-control":"no-store",connection:"close"});
      res.end(data);
    });
  }catch(error){res.writeHead(500).end(String(error))}
});
server.on("connection",socket=>{sockets.add(socket);socket.on("close",()=>sockets.delete(socket))});
await new Promise((resolve,reject)=>{server.once("error",reject);server.listen(0,"127.0.0.1",resolve)});
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,args:["--disable-dev-shm-usage","--disable-background-networking","--autoplay-policy=no-user-gesture-required"]});

try{
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2});
  await context.route("https://*.supabase.co/**",route=>route.fulfill({status:200,contentType:"application/json",headers:{"access-control-allow-origin":"*"},body:"{}"}));
  await context.addInitScript(()=>{try{localStorage.setItem("ccg-lost-sizzler-tutorial-seen-v1","true");localStorage.setItem("ccg-lost-sizzler-tutorial-complete-v1","true")}catch(_){}});
  const page=await context.newPage();
  page.setDefaultTimeout(30000);
  const errors=[];
  page.on("pageerror",error=>errors.push(String(error?.stack||error)));

  await page.goto(`${origin}/arcade/lost-sizzler/?mobile-dedicated-hazard=1`,{waitUntil:"load"});
  await page.waitForFunction(()=>document.body.dataset.gameReady==="true");
  await page.locator("#solo-btn").click({noWaitAfter:true});
  await page.waitForFunction(()=>document.body.dataset.runActive==="true");
  await page.waitForFunction(()=>typeof playMode!=="undefined"&&playMode==="solo"&&typeof mode!=="undefined"&&mode==="playing");
  const notice=page.locator("#ccg-mobile-pc-notice");
  if(await notice.isVisible()){
    await page.locator("#ccg-mobile-pc-accept").click({noWaitAfter:true});
    await page.waitForFunction(()=>document.getElementById("ccg-mobile-pc-notice")?.classList.contains("hidden")===true||getComputedStyle(document.getElementById("ccg-mobile-pc-notice")).display==="none");
  }
  await page.waitForFunction(()=>document.body.classList.contains("v104-touch-device")&&Boolean(document.getElementById("v104-touch-controls")));

  await page.evaluate(()=>globalThis.eval(`(()=>{
    window.__ccgDedicatedHazardEvents=[];
    addEventListener("ccg:hazard-damage",event=>{
      window.__ccgDedicatedHazardEvents.push({...event.detail});
      if(window.__ccgDedicatedHazardEvents.length>12)window.__ccgDedicatedHazardEvents.splice(0,window.__ccgDedicatedHazardEvents.length-12);
    });
    const previous=window.hurtPlayer;
    const swallowed=function r67MutableTrapSwallowOwner(player,amount,friendly,source){
      if(/trap|hazard/i.test(String(source||"")))return false;
      return previous.apply(this,arguments);
    };
    swallowed.__ccgOriginal=previous;
    window.hurtPlayer=swallowed;
    window.__ccgDedicatedHazardSwallowOwner=swallowed;
  })()`));
  await page.waitForFunction(()=>window.hurtPlayer===window.__ccgDedicatedHazardSwallowOwner);

  const fixture=await page.evaluate(()=>globalThis.eval(`(()=>{
    if(!host||!p1)return{available:false,reason:"missing live host/player"};
    const ordinaryCount=(host.traps||[]).length;
    const hazard=(host.hazardRooms||[]).find(candidate=>
      Array.isArray(candidate?.cells)&&candidate.cells.some(cell=>
        world?.map?.[Number(cell.y)]?.[Number(cell.x)]===0&&W.roomAt(world,Number(cell.x),Number(cell.y))===candidate.roomId
      )
    );
    if(!hazard)return{available:false,reason:"no usable dedicated hazard",ordinaryCount,hazardCount:(host.hazardRooms||[]).length};
    const cell=hazard.cells.find(cell=>world?.map?.[Number(cell.y)]?.[Number(cell.x)]===0&&W.roomAt(world,Number(cell.x),Number(cell.y))===hazard.roomId);
    host.enemies=[];host.generators=[];if(host.stalker)host.stalker.awake=false;
    p1.x=Number(cell.x);p1.y=Number(cell.y);p1.rx=p1.x;p1.ry=p1.y;
    p1.maxHealth=Math.max(20,Number(p1.maxHealth||8));p1.health=20;p1.armor=3;p1.invuln=0;p1.hitStunMs=0;p1.hazardHitCooldown=0;
    const original={period:Number(hazard.period),phase:Number(hazard.phase),warningMs:Number(hazard.warningMs),activeMs:Number(hazard.activeMs),groups:Number(hazard.groups)};
    hazard.period=100000;hazard.warningMs=900;hazard.activeMs=5000;
    const groups=Math.max(2,Number(hazard.groups||2)),group=((Number(cell.group||0)%groups)+groups)%groups;
    const elapsed=Number(host.floorElapsed||run.elapsed||0);
    let target=group*hazard.period+120;
    while(target<elapsed)target+=groups*hazard.period;
    hazard.phase=target-elapsed;
    const room=world.rooms?.find?.(candidate=>Number(candidate?.id)===Number(hazard.roomId))||world.rooms?.[hazard.roomId]||null;
    return{
      available:true,ordinaryCount,hazardCount:(host.hazardRooms||[]).length,
      id:String(hazard.id),type:String(hazard.type||"hazard"),title:String(hazard.title||""),
      roomId:Number(hazard.roomId),roomDedicated:Boolean(room?.dedicatedHazard),
      cell:{x:Number(cell.x),y:Number(cell.y),group},before:{health:Number(p1.health),armor:Number(p1.armor)},
      original
    };
  })()`));

  assert.equal(fixture.available,true,`R67 must generate a usable dedicated hazard room: ${JSON.stringify(fixture)}`);
  assert.equal(fixture.ordinaryCount,0,"R67 mobile Solo must not generate retired ordinary FIRE/SPIKE/SHOCK traps");
  assert.ok(fixture.hazardCount>=1,"R67 mobile Solo must retain at least one dedicated hazard room");
  assert.equal(fixture.roomDedicated,true,"the live hazard owner must belong to a dedicated hazard room");

  const warning=await page.evaluate(({id,cell})=>{
    const hazard=(host.hazardRooms||[]).find(row=>String(row.id)===id);
    const state=SYS.hazardCellState(hazard,cell.x,cell.y,host.floorElapsed||run.elapsed);
    return{...state,health:Number(p1.health),armor:Number(p1.armor)};
  },fixture);
  assert.equal(warning.warning,true,"dedicated hazard cell must expose its warning phase before activation");
  assert.equal(warning.active,false,"warning phase must not already be active");
  await page.waitForTimeout(180);
  assert.equal(await page.evaluate(()=>Number(p1.health)),fixture.before.health,"warning phase must not damage the player");

  await page.evaluate(({id,cell})=>{
    const hazard=(host.hazardRooms||[]).find(row=>String(row.id)===id);
    const groups=Math.max(2,Number(hazard.groups||2)),group=((Number(cell.group||0)%groups)+groups)%groups;
    const elapsed=Number(host.floorElapsed||run.elapsed||0);
    let target=group*Number(hazard.period)+Number(hazard.warningMs)+180;
    while(target<elapsed)target+=groups*Number(hazard.period);
    hazard.phase=target-elapsed;
    p1.invuln=0;p1.hitStunMs=0;p1.hazardHitCooldown=0;
  },fixture);

  await page.waitForFunction(before=>Number(p1.health)===Number(before)-1,fixture.before.health,{timeout:2500,polling:16});
  const after=await page.evaluate(({id,cell})=>{
    const hazard=(host.hazardRooms||[]).find(row=>String(row.id)===id);
    return{
      health:Number(p1.health),armor:Number(p1.armor),x:Number(p1.x),y:Number(p1.y),
      source:String(p1.__ccgLastDamageSource||""),
      active:SYS.hazardCellState(hazard,cell.x,cell.y,host.floorElapsed||run.elapsed).active,
      cooldown:Number(p1.hazardHitCooldown||0),
      events:[...(window.__ccgDedicatedHazardEvents||[])],
      ordinaryCount:(host.traps||[]).length
    };
  },fixture);

  assert.equal(after.active,true,"dedicated hazard must be live-active when damage lands");
  assert.equal(after.health,fixture.before.health-1,"dedicated hazard must remove exactly one HEALTH");
  assert.equal(after.armor,fixture.before.armor,"dedicated hazard damage must bypass armour rather than consuming it");
  assert.deepEqual({x:after.x,y:after.y},{x:fixture.cell.x,y:fixture.cell.y},"dedicated hazard damage must occur on the exact occupied hazard cell");
  assert.match(after.source,/trap/i,"dedicated hazard damage must retain environmental trap source ownership");
  assert.ok(after.cooldown>0,"dedicated hazard must arm its bounded hit cooldown after damage");
  assert.equal(after.ordinaryCount,0,"ordinary procedural traps must remain absent after dedicated hazard damage");
  const events=after.events.filter(event=>String(event.hazardId||"")===fixture.id);
  assert.equal(events.length,1,`dedicated hazard must emit one canonical damage event: ${JSON.stringify(after)}`);
  assert.equal(String(events[0].type||""),fixture.type);
  assert.equal(Number(events[0].x),fixture.cell.x);
  assert.equal(Number(events[0].y),fixture.cell.y);

  await page.waitForTimeout(260);
  assert.equal(await page.evaluate(()=>Number(p1.health)),after.health,"dedicated hazard must not double-hit during its hit cooldown");

  assert.deepEqual(errors,[],`R67 dedicated mobile hazard test emitted browser errors: ${errors.join("\n")}`);
  console.log("DUNGEON_MOBILE_DEDICATED_HAZARD",JSON.stringify({fixture,warning,after}));
  console.log("C64 Dungeon Carnage R67 mobile dedicated hazard damage passed.");
  await context.close();
}finally{
  await browser.close();
  for(const socket of sockets)socket.destroy();
  await new Promise(resolve=>server.close(resolve));
}
