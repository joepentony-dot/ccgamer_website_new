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

async function touchButton(page,context,key,trapId){
  const locator=page.locator(`#v104-touch-controls .v104-touch-pad [data-key="${key}"]`);
  await locator.waitFor({state:"visible",timeout:5000});
  const box=await locator.boundingBox();
  assert.ok(box&&box.width>0&&box.height>0,`touch target ${key} must be visible`);
  const x=box.x+box.width/2,y=box.y+box.height/2;
  const active=()=>page.evaluate(id=>{
    const trap=(host?.traps||[]).find(t=>String(t.id)===String(id));
    return Boolean(trap&&SYS.trapActive(trap,performance.now()));
  },trapId);
  const cdp=await context.newCDPSession(page);
  let activeBefore=false,activeAfterStart=false;
  try{
    activeBefore=await active();
    await cdp.send("Input.dispatchTouchEvent",{type:"touchStart",touchPoints:[{x,y,radiusX:1,radiusY:1,force:1,id:1}]});
    activeAfterStart=await active();
    await page.waitForFunction(id=>{
      const probe=window.__ccgNaturalTrapProbe;
      return Boolean(probe&&String(probe.targetId)===String(id)&&(probe.calls||[]).length>0);
    },trapId,{timeout:1200,polling:"raf"});
    await cdp.send("Input.dispatchTouchEvent",{type:"touchEnd",touchPoints:[]});
  }finally{await cdp.detach()}
  await page.waitForTimeout(90);
  return{activeBefore,activeAfterStart};
}

async function resetFixture(page,fixture){
  await page.evaluate(f=>{
    p1.x=f.origin.x;p1.y=f.origin.y;p1.rx=p1.x;p1.ry=p1.y;
    p1.health=f.before.health;p1.armor=f.before.armor;
    p1.invuln=0;p1.hitStunMs=0;move1=0;input.clear();
    window.CCGLostSizzlerV142R19MobileTrapLayoutStability?.rearmInactiveTrapContacts?.();
  },fixture);
}

try{
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2});
  await context.addInitScript(()=>{try{localStorage.setItem("ccg-lost-sizzler-tutorial-seen-v1","true");localStorage.setItem("ccg-lost-sizzler-tutorial-complete-v1","true")}catch(_){}});
  const page=await context.newPage();
  page.setDefaultTimeout(30000);
  const errors=[];
  page.on("pageerror",error=>errors.push(String(error?.stack||error)));

  await page.goto(`${origin}/arcade/lost-sizzler/?mobile-natural-trap=1`,{waitUntil:"load"});
  await page.waitForFunction(()=>document.body.dataset.gameReady==="true");
  await page.waitForFunction(()=>Boolean(window.CCGLostSizzlerV142R19MobileTrapLayoutStability));
  await page.waitForLoadState("load");
  await page.waitForFunction(()=>document.body.classList.contains("v104-touch-device")&&Boolean(document.getElementById("v104-touch-controls")));
  await page.locator("#solo-btn").click({noWaitAfter:true});
  await page.waitForFunction(()=>document.body.dataset.runActive==="true");
  await page.waitForFunction(()=>document.getElementById("menu")?.classList.contains("hidden")===true);
  await page.waitForFunction(()=>typeof playMode!=="undefined"&&String(playMode||"")==="solo"&&typeof mode!=="undefined"&&String(mode||"")==="playing"&&document.body.dataset.tutorialActive!=="true"&&window.CCGLostSizzlerOnboardingV120?.state?.active!==true);
  const notice=page.locator("#ccg-mobile-pc-notice");
  if(await notice.isVisible()){
    await page.locator("#ccg-mobile-pc-accept").click({noWaitAfter:true});
    await page.waitForFunction(()=>document.getElementById("ccg-mobile-pc-notice")?.classList.contains("hidden")===true||getComputedStyle(document.getElementById("ccg-mobile-pc-notice")).display==="none");
  }
  await page.waitForFunction(()=>Boolean(document.getElementById("v104-touch-controls")));
  await page.waitForTimeout(320);
  await page.waitForFunction(()=>{
    const buttons=[...document.querySelectorAll("#v104-touch-controls .v104-touch-pad .v104-touch-btn")];
    return buttons.length===4&&buttons.every(button=>button.getBoundingClientRect().width>0&&button.getBoundingClientRect().height>0);
  });

  await page.evaluate(()=>{
    if(host){
      host.enemies=[];
      host.generators=[];
      if(host.stalker)host.stalker.awake=false;
    }
  });

  await page.evaluate(()=>globalThis.eval(`(()=>{
    if(window.__ccgNaturalTrapProbe?.installed)return;
    const previous=triggerTrap;
    const previousTrapActive=SYS.trapActive;
    const probe={installed:true,targetId:"",calls:[],inTrigger:false,canonical:null};
    SYS.trapActive=function trapActiveNaturalProbe(trap,now){
      const active=previousTrapActive.call(this,trap,now);
      if(probe.inTrigger&&probe.canonical===null&&String(trap?.id)===String(probe.targetId)){
        const sampledAt=Number.isFinite(Number(now))?Number(now):performance.now();
        const period=Math.max(1,Number(trap.period||1));
        const phase=(sampledAt+Number(trap.phase||0))%period;
        probe.canonical={
          at:sampledAt,
          active:Boolean(active),
          phase,
          period,
          remainingActiveMs:active?Math.max(0,period*.46-phase):0
        };
      }
      return active;
    };
    const wrapped=function triggerTrapNaturalProbe(player){
      const trap=(host?.traps||[]).find(t=>String(t.id)===String(probe.targetId));
      let sample=null;
      if(trap&&player&&Number(player.x)===Number(trap.x)&&Number(player.y)===Number(trap.y)){
        const r19=window.CCGLostSizzlerV142R19MobileTrapLayoutStability?.state||{};
        sample={
          beforeHealth:Number(player.health||0),beforeArmor:Number(player.armor||0),
          x:Number(player.x),y:Number(player.y),
          r19Before:{
            trapHits:Number(r19.trapHits||0),
            trapContactBlocks:Number(r19.trapContactBlocks||0),
            trapProtectionBlocks:Number(r19.trapProtectionBlocks||0),
            damageOwnerInstalls:Number(r19.damageOwnerInstalls||0),
            trapTriggerOwnerInstalls:Number(r19.trapTriggerOwnerInstalls||0),
            directTrapRepairs:Number(r19.directTrapRepairs||0),
            triggerName:String(globalThis.triggerTrap?.name||""),
            triggerOwned:Boolean(globalThis.triggerTrap?.__ccgV142R19TrapTriggerOwner),
            hurtName:String(globalThis.hurtPlayer?.name||"")
          },
          canonicalContactsBefore:[...(window.CCGLostSizzlerRareEventsBalance?.trapRuntime?.contact||[])].filter(key=>String(key).endsWith("|"+String(trap?.id||(String(trap?.x)+","+String(trap?.y)))))
        };
      }
      probe.canonical=null;
      probe.inTrigger=Boolean(sample);
      let result;
      try{result=previous.apply(this,arguments)}
      finally{probe.inTrigger=false}
      if(sample){
        const canonical=probe.canonical||{};
        sample.at=Number(canonical.at||0);
        sample.active=Boolean(canonical.active);
        sample.phase=Number(canonical.phase||0);
        sample.period=Number(canonical.period||0);
        sample.remainingActiveMs=Number(canonical.remainingActiveMs||0);
        const r19=window.CCGLostSizzlerV142R19MobileTrapLayoutStability?.state||{};
        sample.afterHealth=Number(player.health||0);
        sample.afterArmor=Number(player.armor||0);
        sample.r19After={
          trapHits:Number(r19.trapHits||0),
          trapContactBlocks:Number(r19.trapContactBlocks||0),
          trapProtectionBlocks:Number(r19.trapProtectionBlocks||0),
          damageOwnerInstalls:Number(r19.damageOwnerInstalls||0),
          trapTriggerOwnerInstalls:Number(r19.trapTriggerOwnerInstalls||0),
          directTrapRepairs:Number(r19.directTrapRepairs||0),
          triggerName:String(globalThis.triggerTrap?.name||""),
          triggerOwned:Boolean(globalThis.triggerTrap?.__ccgV142R19TrapTriggerOwner),
          hurtName:String(globalThis.hurtPlayer?.name||"")
        };
        const currentTrap=(host?.traps||[]).find(t=>String(t.id)===String(probe.targetId));
        sample.canonicalContactsAfter=[...(window.CCGLostSizzlerRareEventsBalance?.trapRuntime?.contact||[])].filter(key=>String(key).endsWith("|"+String(currentTrap?.id||(String(currentTrap?.x)+","+String(currentTrap?.y)))));
        probe.calls.push(sample);
      }
      return result;
    };
    wrapped.__ccgOriginal=previous;
    triggerTrap=wrapped;
    window.__ccgNaturalTrapProbe=probe;
  })()`));


  const kinds=await page.evaluate(()=>[...new Set((host?.traps||[]).map(t=>String(t.kind||"floor")))]);
  assert.ok(kinds.length>0,"generated Solo floor must contain real traps");

  for(const kind of kinds.slice(0,3)){
    const fixture=await page.evaluate(kind=>globalThis.eval(`(()=>{
      const dirs=[
        {dx:-1,dy:0,key:"KeyD"},
        {dx:1,dy:0,key:"KeyA"},
        {dx:0,dy:-1,key:"KeyS"},
        {dx:0,dy:1,key:"KeyW"}
      ];
      const candidates=(host?.traps||[]).filter(t=>String(t.kind||"floor")===${JSON.stringify(kind)});
      const match=candidates.map(trap=>{
        if(!W.walkable(world.map,Number(trap.x),Number(trap.y),host))return null;
        if((host?.enemies||[]).some(e=>e?.alive&&Number(e.x)===Number(trap.x)&&Number(e.y)===Number(trap.y)))return null;
        if(host?.stalker?.awake&&Number(host.stalker.x)===Number(trap.x)&&Number(host.stalker.y)===Number(trap.y))return null;
        const route=dirs.find(d=>{
          const x=Number(trap.x)+d.dx,y=Number(trap.y)+d.dy;
          return world?.map?.[y]?.[x]===0&&W.walkable(world.map,x,y,host)&&
            !(host?.enemies||[]).some(e=>e?.alive&&Number(e.x)===x&&Number(e.y)===y);
        });
        return route?{trap,route}:null;
      }).find(Boolean);
      if(!match)return{available:false,reason:"no enterable enemy-free trap of kind"};
      const {trap,route}=match;
      const x=Number(trap.x)+route.dx,y=Number(trap.y)+route.dy;
      for(const enemy of host?.enemies||[])if(enemy?.alive&&Number(enemy.x)===Number(trap.x)&&Number(enemy.y)===Number(trap.y))enemy.alive=false;
      for(const chest of host?.chests||[])if(chest?.active&&Number(chest.x)===Number(trap.x)&&Number(chest.y)===Number(trap.y))chest.active=false;
      for(const door of host?.doors||[])if(Number(door.x)===Number(trap.x)&&Number(door.y)===Number(trap.y)){door.open=true;door.locked=false}
      if(host?.stalker&&Number(host.stalker.x)===Number(trap.x)&&Number(host.stalker.y)===Number(trap.y))host.stalker.awake=false;
      p1.x=x;p1.y=y;p1.rx=x;p1.ry=y;
      p1.health=Math.max(4,Number(p1.health||8));
      p1.maxHealth=Math.max(Number(p1.maxHealth||8),p1.health);
      p1.armor=Math.max(2,Number(p1.armor||0));
      p1.invuln=0;p1.hitStunMs=0;
      move1=0;input.clear();
      window.CCGLostSizzlerV142R19MobileTrapLayoutStability?.rearmInactiveTrapContacts?.();
      const moveDx=route.key==="KeyD"?1:route.key==="KeyA"?-1:0;
      const moveDy=route.key==="KeyS"?1:route.key==="KeyW"?-1:0;
      return{available:true,key:route.key,moveDx,moveDy,kind:String(trap.kind||"floor"),id:String(trap.id),target:{x:Number(trap.x),y:Number(trap.y)},origin:{x,y},period:Number(trap.period),phase:Number(trap.phase),before:{health:Number(p1.health),armor:Number(p1.armor)}};
    })()`),kind);
    assert.equal(fixture.available,true,`real generated ${kind} trap must have a touch-accessible adjacent tile: ${JSON.stringify(fixture)}`);

    let qualified=null;
    for(let attempt=1;attempt<=6;attempt++){
      await resetFixture(page,fixture);
      await page.evaluate(id=>{
        const probe=window.__ccgNaturalTrapProbe;
        if(probe){probe.targetId=String(id);probe.calls.length=0}
      },fixture.id);
      await page.waitForTimeout(120);
      await page.waitForFunction(id=>{
        const trap=(host?.traps||[]).find(t=>String(t.id)===id);
        if(!trap)return false;
        const period=Math.max(1,Number(trap.period||1));
        const phase=(performance.now()+Number(trap.phase||0))%period;
        return SYS.trapActive(trap,performance.now())&&phase<Math.min(period*.06,120);
      },fixture.id,{timeout:12000});

      const touchWindow=await touchButton(page,context,fixture.key,fixture.id);
      const after=await page.evaluate(id=>{
        const trap=(host?.traps||[]).find(t=>String(t.id)===String(id));
        return{
          x:Number(p1.x),y:Number(p1.y),health:Number(p1.health),armor:Number(p1.armor),
          activeNow:Boolean(trap&&SYS.trapActive(trap,performance.now())),
          trapCalls:[...(window.__ccgNaturalTrapProbe?.calls||[])],
          trapHits:Number(window.CCGLostSizzlerV142R19MobileTrapLayoutStability?.state?.trapHits||0),
          r57Hits:Number(window.CCGLostSizzlerV141R57DesktopPrepStability?.state?.trapHits||0),
          r57Fallbacks:Number(window.CCGLostSizzlerV141R57DesktopPrepStability?.state?.trapFallbacks||0)
        };
      },fixture.id);
      console.log("MOBILE_NATURAL_TRAP_TOUCH",JSON.stringify({kind,attempt,fixture,touchWindow,after}));

      const stableCrossing=after.trapCalls.find(call=>call.active);
      if(stableCrossing&&Number(stableCrossing.afterHealth)===fixture.before.health-1){
        assert.equal(Number(stableCrossing.afterArmor),fixture.before.armor,`real generated ${kind} trap must preserve armour at the exact active trap crossing`);
        qualified={attempt,touchWindow,stableCrossing,after};
        break;
      }

      if(stableCrossing){
        assert.fail(`real generated ${kind} trap was naturally active at the exact triggerTrap crossing but did not remove one health: ${JSON.stringify({fixture,touchWindow,stableCrossing,after})}`);
      }
    }
    assert.ok(qualified,`real generated ${kind} trap did not produce an active touch contact within six natural active cycles`);

    await resetFixture(page,fixture);
    await page.waitForTimeout(120);
  }

  assert.deepEqual(errors,[],`real mobile trap cycle must not raise browser errors: ${errors.join("\n")}`);
  console.log("DUNGEON_MOBILE_NATURAL_TRAPS",JSON.stringify({kinds}));
  console.log("C64 Dungeon Carnage real generated mobile trap damage passed.");
  await context.close();
}finally{
  await browser.close();
  for(const socket of sockets)socket.destroy();
  await new Promise(resolve=>server.close(resolve));
}
