import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {chromium} from "playwright";

const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,"../../../..");
const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".mjs":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json; charset=utf-8",".svg":"image/svg+xml",".png":"image/png",".webp":"image/webp",".mp3":"audio/mpeg"};
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
  await context.addInitScript(()=>{try{localStorage.setItem("ccg-lost-sizzler-tutorial-seen-v1","true");localStorage.setItem("ccg-lost-sizzler-tutorial-complete-v1","true")}catch(_){}});
  const page=await context.newPage();page.setDefaultTimeout(30000);
  const errors=[];page.on("pageerror",error=>errors.push(String(error?.stack||error)));
  await page.goto(origin+"/arcade/lost-sizzler/?r67-hazard-enemy-pressure=1",{waitUntil:"load"});
  await page.waitForFunction(()=>document.body.dataset.gameReady==="true"&&document.body.dataset.v142BootstrapReady==="true");
  await page.locator("#solo-btn").click({noWaitAfter:true});
  await page.waitForFunction(()=>document.body.dataset.runActive==="true"&&String(mode)==="playing"&&Boolean(p1&&host&&run));

  const fixture=await page.evaluate(()=>globalThis.eval(`(()=>{
    if((host.traps||[]).length)return{available:false,reason:"ordinary traps restored"};
    const dirs=[
      {key:"ArrowRight",dx:1,dy:0},{key:"ArrowLeft",dx:-1,dy:0},
      {key:"ArrowDown",dx:0,dy:1},{key:"ArrowUp",dx:0,dy:-1}
    ];
    let selected=null;
    for(const hazard of host.hazardRooms||[]){
      const pressure=(host.enemies||[]).find(e=>e?.alive&&W.roomAt(world,e.x,e.y)===hazard.roomId);
      if(!pressure)continue;
      for(const cell of hazard.cells||[]){
        if(world?.map?.[Number(cell.y)]?.[Number(cell.x)]!==0)continue;
        if((host.enemies||[]).some(e=>e?.alive&&e.x===Number(cell.x)&&e.y===Number(cell.y)))continue;
        for(const dir of dirs){
          const entry={x:Number(cell.x)-dir.dx,y:Number(cell.y)-dir.dy};
          if(W.walkable(world.map,entry.x,entry.y,host)&&!(host.enemies||[]).some(e=>e?.alive&&e.x===entry.x&&e.y===entry.y)){selected={hazard,cell,dir,entry,pressure};break}
        }
        if(selected)break;
      }
      if(selected)break;
    }
    if(!selected)return{available:false,reason:"no dedicated hazard with live room enemy",hazards:(host.hazardRooms||[]).length};
    const {hazard,cell,dir,entry,pressure}=selected;
    for(const e of host.enemies||[])if(e!==pressure)e.alive=false;
    pressure.aiState="idle";pressure.moveCooldown=999999;pressure.attackCooldown=999999;pressure.hitStunMs=0;
    if(host.stalker)host.stalker.awake=false;
    hazard.period=100000;hazard.warningMs=120;hazard.activeMs=12000;
    const groups=Math.max(2,Number(hazard.groups||2)),group=((Number(cell.group||0)%groups)+groups)%groups;
    const elapsed=Number(host.floorElapsed||run.elapsed||0);
    let step=group;while(step*hazard.period+hazard.warningMs+240<elapsed)step+=groups;
    hazard.phase=step*hazard.period+hazard.warningMs+240-elapsed;
    p1.x=entry.x;p1.y=entry.y;p1.rx=entry.x;p1.ry=entry.y;
    p1.maxHealth=Math.max(20,Number(p1.maxHealth||8));p1.health=20;p1.armor=5;p1.invuln=0;p1.hitStunMs=0;p1.hazardHitCooldown=0;
    move1=0;input.clear();window.__r67PressureHazardEvents=[];
    addEventListener("ccg:hazard-damage",event=>window.__r67PressureHazardEvents.push({...event.detail}));
    return{
      available:true,id:String(hazard.id),type:String(hazard.type||""),roomId:Number(hazard.roomId),key:dir.key,
      target:{x:Number(cell.x),y:Number(cell.y)},entry,enemyId:String(pressure.id),enemyKind:String(pressure.kind||""),
      before:{health:Number(p1.health),armor:Number(p1.armor),live:(host.enemies||[]).filter(e=>e?.alive).length},
      active:Boolean(SYS.hazardCellState(hazard,Number(cell.x),Number(cell.y),host.floorElapsed||run.elapsed).active)
    };
  })()`));
  assert.equal(fixture.available,true,"live enemy-pressure dedicated hazard fixture must be available: "+JSON.stringify(fixture));
  assert.equal(fixture.active,true,"dedicated hazard must be ACTIVE before the real keyboard crossing");
  assert.ok(fixture.before.live>=1,"dedicated hazard room must retain a live enemy pressure actor");

  await page.keyboard.press(fixture.key,{delay:24});
  await page.waitForFunction(target=>Number(p1.x)===target.x&&Number(p1.y)===target.y,fixture.target,{timeout:3000,polling:16});
  await page.waitForFunction(before=>Number(p1.health)===before-1,fixture.before.health,{timeout:2500,polling:16});
  const after=await page.evaluate(({id,target,enemyId,roomId})=>{
    const hazard=(host.hazardRooms||[]).find(h=>String(h.id)===id);
    const enemy=(host.enemies||[]).find(e=>String(e.id)===enemyId);
    return{
      health:Number(p1.health),armor:Number(p1.armor),x:Number(p1.x),y:Number(p1.y),
      active:Boolean(SYS.hazardCellState(hazard,target.x,target.y,host.floorElapsed||run.elapsed).active),
      enemyAlive:Boolean(enemy?.alive),enemyRoom:enemy?W.roomAt(world,enemy.x,enemy.y):-1,
      events:[...(window.__r67PressureHazardEvents||[])],ordinary:(host.traps||[]).length,mode:String(mode||""),roomId
    };
  },{id:fixture.id,target:fixture.target,enemyId:fixture.enemyId,roomId:fixture.roomId});

  assert.deepEqual({x:after.x,y:after.y},fixture.target,"real keyboard movement must finish on the ACTIVE dedicated hazard cell");
  assert.equal(after.health,fixture.before.health-1,"dedicated hazard contact under live enemy pressure must remove exactly one HP");
  assert.equal(after.armor,fixture.before.armor,"dedicated hazard contact under enemy pressure must bypass and preserve armour");
  assert.equal(after.active,true,"dedicated hazard must still be ACTIVE when the post-crossing state is inspected");
  assert.equal(after.enemyAlive,true,"the hazard-room enemy must remain alive during the ownership check");
  assert.equal(after.enemyRoom,fixture.roomId,"the live pressure enemy must remain in the dedicated hazard room");
  assert.equal(after.events.filter(e=>String(e.hazardId||"")===fixture.id).length,1,"enemy pressure must not duplicate or suppress the canonical hazard-damage event");
  assert.equal(after.ordinary,0,"ordinary procedural traps must remain absent under encounter pressure");
  assert.equal(after.mode,"playing","enemy pressure plus hazard contact must leave Solo mode playing");
  assert.deepEqual(errors,[],"R67 live enemy-pressure hazard regression must not produce page errors: "+errors.join("\n"));
  console.log("C64 Dungeon Carnage R67 dedicated hazard contact under live enemy pressure passed.");
  await context.close();
}finally{
  await browser.close();
  for(const socket of sockets)socket.destroy();
  await new Promise(resolve=>server.close(()=>resolve()));
}
