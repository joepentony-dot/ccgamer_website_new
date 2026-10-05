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
  await page.goto(origin+"/arcade/lost-sizzler/?r67-dedicated-hazard-crossing=1",{waitUntil:"load"});
  await page.waitForFunction(()=>document.body.dataset.gameReady==="true"&&document.body.dataset.v142BootstrapReady==="true");
  await page.locator("#solo-btn").click({noWaitAfter:true});
  await page.waitForFunction(()=>document.body.dataset.runActive==="true"&&String(mode)==="playing"&&Boolean(p1&&host&&run));

  const fixture=await page.evaluate(()=>globalThis.eval(`(()=>{
    if((host.traps||[]).length)return{available:false,reason:"ordinary traps restored",ordinary:(host.traps||[]).length};
    const dirs=[
      {key:"ArrowRight",dx:1,dy:0},{key:"ArrowLeft",dx:-1,dy:0},
      {key:"ArrowDown",dx:0,dy:1},{key:"ArrowUp",dx:0,dy:-1}
    ];
    let selected=null;
    for(const hazard of host.hazardRooms||[]){
      for(const cell of hazard.cells||[]){
        if(world?.map?.[Number(cell.y)]?.[Number(cell.x)]!==0)continue;
        if((host.enemies||[]).some(e=>e?.alive&&e.x===Number(cell.x)&&e.y===Number(cell.y)))continue;
        for(const dir of dirs){
          const entry={x:Number(cell.x)-dir.dx,y:Number(cell.y)-dir.dy};
          if(W.walkable(world.map,entry.x,entry.y,host)&&!(host.enemies||[]).some(e=>e?.alive&&e.x===entry.x&&e.y===entry.y)){selected={hazard,cell,dir,entry};break}
        }
        if(selected)break;
      }
      if(selected)break;
    }
    if(!selected)return{available:false,reason:"no keyboard-reachable dedicated hazard cell",hazards:(host.hazardRooms||[]).length};
    const {hazard,cell,dir,entry}=selected;
    for(const enemy of host.enemies||[])enemy.alive=false;
    if(host.stalker)host.stalker.awake=false;
    const original={period:Number(hazard.period),warningMs:Number(hazard.warningMs),activeMs:Number(hazard.activeMs),phase:Number(hazard.phase)};
    hazard.period=100000;hazard.warningMs=120;hazard.activeMs=12000;
    const groups=Math.max(2,Number(hazard.groups||2)),group=((Number(cell.group||0)%groups)+groups)%groups;
    const elapsed=Number(host.floorElapsed||run.elapsed||0);
    let step=group;
    while(step*hazard.period+hazard.warningMs+240<elapsed)step+=groups;
    hazard.phase=step*hazard.period+hazard.warningMs+240-elapsed;
    p1.x=entry.x;p1.y=entry.y;p1.rx=entry.x;p1.ry=entry.y;
    p1.maxHealth=Math.max(20,Number(p1.maxHealth||8));p1.health=20;p1.armor=4;p1.invuln=0;p1.hitStunMs=0;p1.hazardHitCooldown=0;
    move1=0;input.clear();
    window.__r67HazardEvents=[];
    addEventListener("ccg:hazard-damage",event=>window.__r67HazardEvents.push({...event.detail}));
    const state=SYS.hazardCellState(hazard,Number(cell.x),Number(cell.y),host.floorElapsed||run.elapsed);
    return{
      available:true,id:String(hazard.id),type:String(hazard.type||""),key:dir.key,
      target:{x:Number(cell.x),y:Number(cell.y)},entry,backKey:dir.key==="ArrowRight"?"ArrowLeft":dir.key==="ArrowLeft"?"ArrowRight":dir.key==="ArrowDown"?"ArrowUp":"ArrowDown",
      before:{health:Number(p1.health),armor:Number(p1.armor)},active:Boolean(state.active),ordinary:(host.traps||[]).length,original
    };
  })()`));
  assert.equal(fixture.available,true,"dedicated hazard keyboard fixture must be available: "+JSON.stringify(fixture));
  assert.equal(fixture.ordinary,0,"R67 must keep ordinary FIRE/SPIKE/SHOCK traps absent");
  assert.equal(fixture.active,true,"dedicated hazard must be ACTIVE before real keyboard entry");

  await page.evaluate(()=>{
    try{document.activeElement?.blur?.()}catch(_){}
    const canvas=document.getElementById("game");
    if(canvas){canvas.tabIndex=-1;try{canvas.focus({preventScroll:true})}catch(_){}}
    try{window.focus()}catch(_){}
  });
  // Use one discrete direction tap. Holding the key until the polling loop
  // observes the target can legitimately advance another tile on a healthy
  // movement cadence and, from R106 onward, movement also supports deliberate
  // same-direction double-tap dashing.
  await page.keyboard.press(fixture.key,{delay:24});
  await page.waitForFunction(target=>Number(p1.x)===target.x&&Number(p1.y)===target.y,fixture.target,{timeout:3000,polling:16});
  await page.waitForFunction(before=>Number(p1.health)===before-1,fixture.before.health,{timeout:2500,polling:16});
  const first=await page.evaluate(({id,target})=>{
    const hazard=(host.hazardRooms||[]).find(h=>String(h.id)===id);
    return{health:Number(p1.health),armor:Number(p1.armor),x:Number(p1.x),y:Number(p1.y),active:Boolean(SYS.hazardCellState(hazard,target.x,target.y,host.floorElapsed||run.elapsed).active),events:[...(window.__r67HazardEvents||[])],ordinary:(host.traps||[]).length};
  },{id:fixture.id,target:fixture.target});
  assert.deepEqual({x:first.x,y:first.y},fixture.target,"keyboard movement must land on the dedicated hazard cell");
  assert.equal(first.health,fixture.before.health-1,"first ACTIVE dedicated hazard crossing must remove exactly one HP");
  assert.equal(first.armor,fixture.before.armor,"dedicated hazard crossing must preserve armour");
  assert.equal(first.active,true,"hazard must remain ACTIVE when the first hit is inspected");
  assert.equal(first.ordinary,0,"ordinary traps must remain absent after first crossing");
  assert.equal(first.events.filter(e=>String(e.hazardId||"")===fixture.id).length,1,"first crossing must emit one canonical hazard-damage event");

  await page.keyboard.press(fixture.backKey,{delay:24});
  await page.waitForFunction(entry=>Number(p1.x)===entry.x&&Number(p1.y)===entry.y,fixture.entry,{timeout:3000,polling:16});
  // The hazard cooldown is owned by simulation time, not wall time. After a
  // stressed/low-FPS predecessor contract, 1.15 seconds of wall time can elapse
  // before the canonical 1050 ms simulation cooldown has actually drained.
  // Wait for the authoritative cooldown itself so this remains a true
  // leave-and-re-enter-after-cooldown regression rather than a scheduler race.
  await page.waitForFunction(()=>Number(p1?.hazardHitCooldown||0)<=0,null,{timeout:5000,polling:16});
  await page.evaluate(()=>{p1.hitStunMs=0;move1=0;});
  await page.keyboard.press(fixture.key,{delay:24});
  await page.waitForFunction(target=>Number(p1.x)===target.x&&Number(p1.y)===target.y,fixture.target,{timeout:3000,polling:16});
  await page.waitForFunction(health=>Number(p1.health)===health-1,first.health,{timeout:3000,polling:16});
  const second=await page.evaluate(()=>({health:Number(p1.health),armor:Number(p1.armor),events:[...(window.__r67HazardEvents||[])],ordinary:(host.traps||[]).length,mode:String(mode||"")}));
  assert.equal(second.health,first.health-1,"leaving and re-entering the still ACTIVE dedicated hazard after cooldown must remove another HP");
  assert.equal(second.armor,fixture.before.armor,"second dedicated hazard hit must still preserve armour");
  assert.equal(second.events.filter(e=>String(e.hazardId||"")===fixture.id).length,2,"two qualified entries must emit exactly two canonical hazard-damage events");
  assert.equal(second.ordinary,0,"ordinary procedural traps must stay absent throughout the crossing regression");
  assert.equal(second.mode,"playing","dedicated hazard re-entry must leave Solo gameplay active");
  assert.deepEqual(errors,[],"R67 dedicated hazard crossing regression must not produce page errors: "+errors.join("\n"));
  console.log("C64 Dungeon Carnage R67 dedicated hazard keyboard crossing and re-entry passed.");
  await context.close();
}finally{
  await browser.close();
  for(const socket of sockets)socket.destroy();
  await new Promise(resolve=>server.close(()=>resolve()));
}
