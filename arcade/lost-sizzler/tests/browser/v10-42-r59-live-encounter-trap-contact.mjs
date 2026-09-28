import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {chromium} from "playwright";

const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,"../../../..");
const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".mjs":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json",".svg":"image/svg+xml",".webp":"image/webp",".png":"image/png",".jpg":"image/jpeg",".mp3":"audio/mpeg"};
const sockets=new Set();
const server=http.createServer((req,res)=>{
  try{
    const url=new URL(req.url,"http://local");
    const pathname=decodeURIComponent(url.pathname);
    const relative=pathname.endsWith("/")?pathname+"index.html":pathname;
    const file=path.resolve(repo,"."+relative);
    if(!file.startsWith(repo+path.sep)&&file!==repo){res.writeHead(403).end("forbidden");return}
    fs.readFile(file,(error,data)=>{
      if(error){res.writeHead(404,{connection:"close"}).end("not found");return}
      res.writeHead(200,{"content-type":mime[path.extname(file).toLowerCase()]||"application/octet-stream","cache-control":"no-store",connection:"close"});
      res.end(data);
    });
  }catch(error){res.writeHead(500,{connection:"close"}).end(String(error))}
});
server.on("connection",socket=>{sockets.add(socket);socket.on("close",()=>sockets.delete(socket))});
await new Promise((resolve,reject)=>{server.once("error",reject);server.listen(0,"127.0.0.1",resolve)});
const origin="http://127.0.0.1:"+server.address().port;
const browser=await chromium.launch({headless:true,args:["--disable-dev-shm-usage","--disable-background-networking","--autoplay-policy=no-user-gesture-required"]});

try{
  const context=await browser.newContext({viewport:{width:1280,height:900}});
  await context.addInitScript(()=>{
    try{
      localStorage.setItem("ccg-lost-sizzler-tutorial-seen-v1","true");
      localStorage.setItem("ccg-lost-sizzler-tutorial-complete-v1","true");
    }catch(_){}
  });
  const page=await context.newPage();
  page.setDefaultTimeout(30000);
  const errors=[];
  page.on("pageerror",error=>errors.push(String(error?.stack||error)));

  await page.goto(origin+"/arcade/lost-sizzler/?r59-live-encounter-trap=1",{waitUntil:"load"});
  await page.waitForFunction(()=>document.body.dataset.gameReady==="true"&&document.body.dataset.v142BootstrapReady==="true");
  await page.locator("#solo-btn").click({noWaitAfter:true});
  await page.waitForFunction(()=>document.body.dataset.runActive==="true"&&String(mode)==="playing"&&Boolean(p1&&host&&run));

  const fixture=await page.evaluate(()=>globalThis.eval(`(()=>{
    const api=window.CCGLostSizzlerV142R58AuthoritativeTrapCore;
    if(!api)return{available:false,reason:"authoritative trap core unavailable"};
    const directions=[
      {dx:1,dy:0,key:"ArrowRight"},
      {dx:-1,dy:0,key:"ArrowLeft"},
      {dx:0,dy:1,key:"ArrowDown"},
      {dx:0,dy:-1,key:"ArrowUp"}
    ];
    let selected=null;
    for(const trap of host?.traps||[]){
      if(!trap?.active)continue;
      const roomId=Number.isFinite(Number(trap.roomId))?Number(trap.roomId):W.roomAt(world,Number(trap.x),Number(trap.y));
      if(roomId<0)continue;
      for(const direction of directions){
        const entry={x:Number(trap.x)-direction.dx,y:Number(trap.y)-direction.dy};
        if(W.roomAt(world,entry.x,entry.y)!==roomId)continue;
        if(!W.walkable(world.map,entry.x,entry.y,host))continue;
        if((host.enemies||[]).some(enemy=>enemy?.alive&&enemy.x===entry.x&&enemy.y===entry.y))continue;
        if((host.enemies||[]).some(enemy=>enemy?.alive&&enemy.x===Number(trap.x)&&enemy.y===Number(trap.y)))continue;
        selected={trap,roomId,entry,direction};
        break
      }
      if(selected)break
    }
    if(!selected)return{available:false,reason:"no encounter-safe trap entry"};
    const {trap,roomId,entry,direction}=selected;
    for(const enemy of host?.enemies||[]){
      if(!enemy?.alive)continue;
      enemy.aiState="idle";enemy.moveCooldown=999999;enemy.attackCooldown=999999;enemy.chargeCooldown=999999;
    }
    enemyCD=999999;
    enemyBullets.length=0;
    host.arenas=host.arenas||[];
    const arenaId="r59-live-trap-arena";
    host.arenas.unshift({id:arenaId,roomId,triggered:false,cleared:false,wave:0,rewarded:false});
    p1.x=entry.x;p1.y=entry.y;p1.rx=entry.x;p1.ry=entry.y;
    p1.maxHealth=Math.max(8,Number(p1.maxHealth||8));p1.health=8;p1.armor=3;p1.invuln=10000;p1.hitStunMs=0;p1.controlLocked=false;p1.controlsLocked=false;
    move1=0;input.clear();
    const original={period:Number(trap.period),phase:Number(trap.phase)};
    const period=100000,now=performance.now();
    trap.period=period;trap.phase=((period*.10)-(now%period)+period)%period;
    api.reset();
    const active=Boolean(SYS.trapActive(trap,performance.now()));
    return{
      available:true,arenaId,key:direction.key,roomId,trapId:String(trap.id),kind:String(trap.kind||""),
      target:{x:Number(trap.x),y:Number(trap.y)},entry,original,active,
      before:{health:Number(p1.health),armor:Number(p1.armor),hits:Number(api.state.trapHits||0),enemies:(host.enemies||[]).filter(e=>e?.alive).length}
    };
  })()`));

  assert.equal(fixture.available,true,"live encounter trap fixture must be available: "+JSON.stringify(fixture));
  assert.equal(fixture.active,true,"ordinary floor trap must be ACTIVE before the real keyboard crossing");

  await page.keyboard.press(fixture.key,{delay:24});
  await page.waitForFunction(target=>Number(p1?.x)===target.x&&Number(p1?.y)===target.y,fixture.target,{timeout:4000,polling:16});

  await page.waitForFunction(arenaId=>(host?.arenas||[]).some(a=>a?.id===arenaId&&a.triggered===true),fixture.arenaId,{timeout:2500,polling:16});
  const after=await page.evaluate(({arenaId,trapId})=>{
    const api=window.CCGLostSizzlerV142R58AuthoritativeTrapCore;
    const arena=(host?.arenas||[]).find(a=>a?.id===arenaId);
    const trap=(host?.traps||[]).find(t=>String(t?.id||"")===String(trapId));
    return{
      health:Number(p1.health),armor:Number(p1.armor),x:Number(p1.x),y:Number(p1.y),
      hits:Number(api?.state?.trapHits||0),arenaTriggered:Boolean(arena?.triggered),
      liveEnemies:(host.enemies||[]).filter(e=>e?.alive).length,
      trapActive:Boolean(trap&&SYS.trapActive(trap,performance.now())),
      mode:String(mode||"")
    };
  },{arenaId:fixture.arenaId,trapId:fixture.trapId});

  assert.deepEqual({x:after.x,y:after.y},fixture.target,"real keyboard movement must finish on the active trap tile");
  assert.equal(after.mode,"playing","arena/encounter activation must leave the ordinary Solo run in playing mode");
  assert.equal(after.arenaTriggered,true,"the same movement boundary must activate the enemy-spawning room");
  assert.ok(after.liveEnemies>fixture.before.enemies,"the room must actually spawn live encounter enemies");
  assert.equal(after.health,fixture.before.health-1,"active trap contact in an enemy-spawning room must remove exactly one HEALTH");
  assert.equal(after.armor,fixture.before.armor,"active trap contact in an enemy-spawning room must bypass and preserve ARMOUR");
  assert.equal(after.hits,fixture.before.hits+1,"the lexical trap owner must record exactly one verified hit on the encounter movement boundary");
  assert.equal(after.trapActive,true,"the trap must still be in its ACTIVE cycle when the post-crossing state is inspected");
  assert.deepEqual(errors,[],"live encounter trap regression must not produce page errors: "+errors.join("\n"));

  console.log("C64 Dungeon Carnage live enemy-room ACTIVE trap contact passed.");
  await context.close();
}finally{
  await browser.close();
  for(const socket of sockets)socket.destroy();
  await new Promise(resolve=>server.close(()=>resolve()));
}
