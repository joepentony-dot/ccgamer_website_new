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

async function boundedTrapStep(page,key,trapId){
  const activeBefore=await page.evaluate(id=>{
    const trap=(host?.traps||[]).find(t=>String(t.id)===String(id));
    return Boolean(trap?.active&&SYS.trapActive(trap,performance.now()));
  },trapId);
  // The dedicated mobile control/layout workflow covers the touch surface.
  // Here we keep the mobile runtime active but use one discrete real keyboard
  // step so trap ownership is sampled on exactly one movement boundary.
  await page.keyboard.press(key,{delay:24});
  await page.waitForFunction(id=>{
    const trap=(host?.traps||[]).find(t=>String(t.id)===String(id));
    return Boolean(
      trap&&Number(p1?.x)===Number(trap.x)&&Number(p1?.y)===Number(trap.y)
    );
  },trapId,{timeout:4000,polling:16});
  await page.waitForFunction(id=>{
    const probe=window.__ccgNaturalTrapProbe;
    return Boolean(
      probe&&String(probe.targetId)===String(id)&&(probe.samples||[]).length>0
    );
  },trapId,{timeout:1200,polling:"raf"});
  await page.waitForTimeout(90);
  return{activeBefore,activeAfterStart:activeBefore};
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
    const previousTrapActive=SYS.trapActive;
    const probe={installed:true,targetId:"",samples:[],damageEvents:[]};
    // Passive observation only. The production lexical trap owner remains
    // untouched; this records the exact occupied-cell active sample it uses.
    SYS.trapActive=function trapActiveNaturalProbe(trap,now){
      const active=previousTrapActive.call(this,trap,now);
      if(String(trap?.id)===String(probe.targetId)&&p1&&Number(p1.x)===Number(trap.x)&&Number(p1.y)===Number(trap.y)){
        const sampledAt=Number.isFinite(Number(now))?Number(now):performance.now();
        const period=Math.max(1,Number(trap.period||1));
        const phase=(sampledAt+Number(trap.phase||0))%period;
        const sample={
          at:sampledAt,active:Boolean(active),phase,period,
          remainingActiveMs:active?Math.max(0,period*.46-phase):0,
          x:Number(p1.x),y:Number(p1.y),health:Number(p1.health||0),armor:Number(p1.armor||0)
        };
        const last=probe.samples[probe.samples.length-1];
        if(!last||last.active!==sample.active||Math.abs(sample.at-last.at)>20)probe.samples.push(sample);
        if(probe.samples.length>40)probe.samples.splice(0,probe.samples.length-40);
      }
      return active;
    };
    addEventListener("ccg:trap-damage",event=>{
      const detail=event?.detail||{};
      if(String(detail.trapId||"")!==String(probe.targetId))return;
      probe.damageEvents.push({...detail});
      if(probe.damageEvents.length>12)probe.damageEvents.splice(0,probe.damageEvents.length-12);
    });
    window.__ccgNaturalTrapProbe=probe;
  })()`));

  // Reproduce the live-device ownership failure: a late visible wrapper can
  // swallow trap-labelled hurtPlayer calls while still retaining the previous
  // ancestry. Caller-validated floor traps must bypass this mutable top-level
  // owner and reach R19's retained canonical damage/death owner directly.
  await page.evaluate(()=>globalThis.eval(`(()=>{
    if(window.__ccgNaturalTrapSwallowOwner)return;
    const previous=window.hurtPlayer;
    const swallowed=function liveDeviceTrapSwallowOwner(player,amount,flash,source){
      if(/trap/i.test(String(source||"")))return false;
      return previous.apply(this,arguments);
    };
    swallowed.__ccgOriginal=previous;
    window.hurtPlayer=swallowed;
    window.__ccgNaturalTrapSwallowOwner=swallowed;
  })()`));
  await page.waitForFunction(()=>window.hurtPlayer===window.__ccgNaturalTrapSwallowOwner);


  const kinds=await page.evaluate(()=>[...new Set((host?.traps||[]).filter(t=>t?.active).map(t=>String(t.kind||"floor")))]);
  assert.ok(kinds.length>0,"generated Solo floor must contain real traps");

  for(const kind of kinds.slice(0,3)){
    const fixture=await page.evaluate(kind=>globalThis.eval(`(()=>{
      const dirs=[
        {dx:-1,dy:0,key:"KeyD"},
        {dx:1,dy:0,key:"KeyA"},
        {dx:0,dy:-1,key:"KeyS"},
        {dx:0,dy:1,key:"KeyW"}
      ];
      const candidates=(host?.traps||[]).filter(t=>t?.active&&String(t.kind||"floor")===${JSON.stringify(kind)});
      const match=candidates.map(trap=>{
        if(!W.walkable(world.map,Number(trap.x),Number(trap.y),host))return null;
        if((host?.enemies||[]).some(e=>e?.alive&&Number(e.x)===Number(trap.x)&&Number(e.y)===Number(trap.y)))return null;
        if(host?.stalker?.awake&&Number(host.stalker.x)===Number(trap.x)&&Number(host.stalker.y)===Number(trap.y))return null;
        const route=dirs.find(d=>{
          const x=Number(trap.x)+d.dx,y=Number(trap.y)+d.dy;
          return world?.map?.[y]?.[x]===0&&W.walkable(world.map,x,y,host)&&
            !(host?.enemies||[]).some(e=>e?.alive&&Number(e.x)===x&&Number(e.y)===y)&&
            !(host?.traps||[]).some(other=>other?.active&&String(other.id)!==String(trap.id)&&Number(other.x)===x&&Number(other.y)===y);
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
        if(probe){probe.targetId=String(id);probe.samples.length=0;probe.damageEvents.length=0}
      },fixture.id);
      await page.waitForTimeout(120);
      await page.waitForFunction(id=>{
        const trap=(host?.traps||[]).find(t=>String(t.id)===id);
        if(!trap?.active)return false;
        const period=Math.max(1,Number(trap.period||1));
        const phase=(performance.now()+Number(trap.phase||0))%period;
        return SYS.trapActive(trap,performance.now())&&phase<Math.min(period*.06,120);
      },fixture.id,{timeout:12000});

      const touchWindow=await boundedTrapStep(page,fixture.key,fixture.id);
      const after=await page.evaluate(id=>{
        const trap=(host?.traps||[]).find(t=>String(t.id)===String(id));
        return{
          x:Number(p1.x),y:Number(p1.y),health:Number(p1.health),armor:Number(p1.armor),
          activeNow:Boolean(trap?.active&&SYS.trapActive(trap,performance.now())),
          trapSamples:[...(window.__ccgNaturalTrapProbe?.samples||[])],
          trapDamageEvents:[...(window.__ccgNaturalTrapProbe?.damageEvents||[])],
          trapHits:Number(window.CCGLostSizzlerV142R19MobileTrapLayoutStability?.state?.trapHits||0),
          r57Hits:Number(window.CCGLostSizzlerV141R57DesktopPrepStability?.state?.trapHits||0),
          r57Fallbacks:Number(window.CCGLostSizzlerV141R57DesktopPrepStability?.state?.trapFallbacks||0)
        };
      },fixture.id);
      console.log("MOBILE_NATURAL_TRAP_TOUCH",JSON.stringify({kind,attempt,fixture,touchWindow,after}));

      const stableCrossing=after.trapSamples.find(sample=>sample.active);
      if(stableCrossing){
        const targetEvents=after.trapDamageEvents.filter(event=>String(event.trapId||"")===String(fixture.id));
        const accepted=targetEvents[0]||null;
        assert.equal(targetEvents.length,1,`real generated ${kind} trap must emit exactly one canonical damage event for the sampled active crossing: ${JSON.stringify({fixture,touchWindow,stableCrossing,after})}`);
        assert.ok(accepted,`real generated ${kind} trap must emit canonical accepted-damage evidence on the exact active touch crossing`);
        assert.equal(Number(accepted.beforeHealth),fixture.before.health,`real generated ${kind} trap damage evidence must begin from the fixture health`);
        assert.equal(Number(accepted.afterHealth),fixture.before.health-1,`real generated ${kind} trap must remove exactly one health on the valid active cycle`);
        assert.equal(after.armor,fixture.before.armor,`real generated ${kind} trap must preserve armour at the exact active touch crossing`);
        assert.equal(after.health,fixture.before.health-1,`the sampled active crossing must remove exactly one HEALTH and no more: ${JSON.stringify({fixture,touchWindow,stableCrossing,after})}`);
        assert.equal(Number(accepted.x),fixture.target.x,`real generated ${kind} trap damage evidence must retain the exact trap X coordinate`);
        assert.equal(Number(accepted.y),fixture.target.y,`real generated ${kind} trap damage evidence must retain the exact trap Y coordinate`);
        qualified={attempt,touchWindow,stableCrossing,accepted,after};
        break;
      }
    }
    assert.ok(qualified,`real generated ${kind} trap did not produce a canonical active exact-cell touch sample within six natural active cycles`);

    await resetFixture(page,fixture);
    await page.waitForTimeout(120);
  }

  const stationary=await page.evaluate(()=>globalThis.eval(`(()=>{
    const trap=(host?.traps||[]).find(t=>t?.active);
    if(!trap)return{available:false};
    const original={period:Number(trap.period),phase:Number(trap.phase)};
    for(const enemy of host?.enemies||[])if(enemy?.alive&&Number(enemy.x)===Number(trap.x)&&Number(enemy.y)===Number(trap.y))enemy.alive=false;
    p1.x=Number(trap.x);p1.y=Number(trap.y);p1.rx=p1.x;p1.ry=p1.y;
    p1.health=Math.max(4,Number(p1.health||8));p1.maxHealth=Math.max(Number(p1.maxHealth||8),p1.health);
    p1.armor=Math.max(2,Number(p1.armor||0));p1.invuln=0;p1.hitStunMs=0;move1=0;input.clear();
    const period=100000,now=performance.now();
    trap.period=period;
    trap.phase=((period*.70)-(now%period)+period)%period;
    window.CCGLostSizzlerV142R19MobileTrapLayoutStability?.rearmInactiveTrapContacts?.();
    return{available:true,id:String(trap.id),before:{health:Number(p1.health),armor:Number(p1.armor),x:Number(p1.x),y:Number(p1.y)},original};
  })()`));
  assert.equal(stationary.available,true,"generated Solo floor must provide a trap for stationary active-cycle validation");
  await page.waitForTimeout(180);
  await page.evaluate(id=>{
    const trap=(host?.traps||[]).find(t=>String(t.id)===String(id));
    const period=Math.max(1000,Number(trap?.period||100000)),now=performance.now();
    trap.phase=((period*.10)-(now%period)+period)%period;
  },stationary.id);
  await page.waitForFunction(before=>Number(p1.health)===Number(before.health)-1,stationary.before,{timeout:1800,polling:40});
  const stationaryAfter=await page.evaluate(id=>{
    const trap=(host?.traps||[]).find(t=>String(t.id)===String(id));
    return{
      health:Number(p1.health),armor:Number(p1.armor),x:Number(p1.x),y:Number(p1.y),
      active:Boolean(trap?.active&&SYS.trapActive(trap,performance.now())),
      trapHits:Number(window.CCGLostSizzlerV142R19MobileTrapLayoutStability?.state?.trapHits||0)
    };
  },stationary.id);
  assert.equal(stationaryAfter.active,true,"stationary trap must be visibly/live active when damage lands");
  assert.equal(stationaryAfter.health,stationary.before.health-1,"a player already standing on a trap must lose exactly one health when its active cycle begins");
  assert.equal(stationaryAfter.armor,stationary.before.armor,"stationary active-cycle trap damage must preserve armour");
  assert.deepEqual({x:stationaryAfter.x,y:stationaryAfter.y},{x:stationary.before.x,y:stationary.before.y},"stationary active-cycle damage must not require movement");

  const globalTrapAudit=await page.evaluate(()=>({
    origin:{x:Number(p1.x),y:Number(p1.y),health:Number(p1.health),maxHealth:Number(p1.maxHealth),armor:Number(p1.armor)},
    traps:(host?.traps||[]).filter(trap=>trap?.active).map(trap=>({id:String(trap.id),kind:String(trap.kind||"floor"),period:Number(trap.period),phase:Number(trap.phase)})),
    simulationPasses:Number(window.CCGLostSizzlerV142R19MobileTrapLayoutStability?.state?.simulationPasses||0)
  }));
  assert.ok(globalTrapAudit.traps.length>=3,`global trap audit expected at least three generated floor traps, got ${globalTrapAudit.traps.length}`);
  assert.deepEqual(new Set(globalTrapAudit.traps.map(trap=>trap.kind)),new Set(["fire","spike","shock"]),"generated global trap audit must cover fire, spike and shock");

  for(const auditTrap of globalTrapAudit.traps){
    const staged=await page.evaluate(id=>globalThis.eval(`(()=>{
      const trap=(host?.traps||[]).find(t=>String(t.id)===${JSON.stringify(id)});
      if(!trap)return{available:false};
      const original={period:Number(trap.period),phase:Number(trap.phase)};
      for(const enemy of host?.enemies||[])if(enemy?.alive&&Number(enemy.x)===Number(trap.x)&&Number(enemy.y)===Number(trap.y))enemy.alive=false;
      p1.x=Number(trap.x);p1.y=Number(trap.y);p1.rx=p1.x;p1.ry=p1.y;
      p1.maxHealth=Math.max(20,Number(p1.maxHealth||8));p1.health=20;p1.armor=3;p1.invuln=0;p1.hitStunMs=0;move1=0;input.clear();
      const period=100000,now=performance.now();
      trap.period=period;trap.phase=((period*.70)-(now%period)+period)%period;
      return{available:true,id:String(trap.id),kind:String(trap.kind||"floor"),original,before:{health:Number(p1.health),armor:Number(p1.armor)}};
    })()`),auditTrap.id);
    assert.equal(staged.available,true,`generated trap ${auditTrap.id} must remain available for global cycle audit`);
    await page.waitForTimeout(180);

    await page.evaluate(id=>{
      const trap=(host?.traps||[]).find(t=>String(t.id)===String(id));
      const period=Math.max(1000,Number(trap?.period||100000)),now=performance.now();
      trap.phase=((period*.10)-(now%period)+period)%period;
    },auditTrap.id);
    await page.waitForFunction(before=>Number(p1.health)===Number(before)-1,staged.before.health,{timeout:1600,polling:25});
    const first=await page.evaluate(id=>{
      const trap=(host?.traps||[]).find(t=>String(t.id)===String(id));
      return{health:Number(p1.health),armor:Number(p1.armor),active:Boolean(trap?.active&&SYS.trapActive(trap,performance.now()))};
    },auditTrap.id);
    assert.equal(first.active,true,`${auditTrap.kind} ${auditTrap.id} must be active when its first stationary hit lands`);
    assert.equal(first.health,staged.before.health-1,`${auditTrap.kind} ${auditTrap.id} must remove exactly one health on active transition`);
    assert.equal(first.armor,staged.before.armor,`${auditTrap.kind} ${auditTrap.id} must not consume armour`);

    await page.waitForTimeout(240);
    assert.equal(await page.evaluate(()=>Number(p1.health)),first.health,`${auditTrap.kind} ${auditTrap.id} must not repeatedly damage during one active phase`);

    const rearmBefore=await page.evaluate(()=>Number(window.CCGLostSizzlerV142R19MobileTrapLayoutStability?.state?.rearms||0));
    await page.evaluate(id=>{
      const trap=(host?.traps||[]).find(t=>String(t.id)===String(id));
      const period=Math.max(1000,Number(trap?.period||100000)),now=performance.now();
      trap.phase=((period*.70)-(now%period)+period)%period;
    },auditTrap.id);
    await page.waitForFunction(before=>Number(window.CCGLostSizzlerV142R19MobileTrapLayoutStability?.state?.rearms||0)>Number(before),rearmBefore,{timeout:2000,polling:25});
    const safeHealth=await page.evaluate(()=>Number(p1.health));
    await page.evaluate(id=>{
      const trap=(host?.traps||[]).find(t=>String(t.id)===String(id));
      const period=Math.max(1000,Number(trap?.period||100000)),now=performance.now();
      trap.phase=((period*.10)-(now%period)+period)%period;
    },auditTrap.id);
    await page.waitForFunction(before=>Number(p1.health)===Number(before)-1,safeHealth,{timeout:2000,polling:25});
    assert.equal(await page.evaluate(()=>Number(p1.health)),safeHealth-1,`${auditTrap.kind} ${auditTrap.id} must rearm and remove one health on the next active cycle`);

    await page.evaluate(({id,original,origin})=>{
      p1.x=origin.x;p1.y=origin.y;p1.rx=p1.x;p1.ry=p1.y;p1.health=Math.max(4,origin.health);p1.maxHealth=Math.max(origin.maxHealth,p1.health);p1.armor=origin.armor;p1.invuln=0;
      const trap=(host?.traps||[]).find(t=>String(t.id)===String(id));
      if(trap){trap.period=original.period;trap.phase=original.phase}
    },{id:auditTrap.id,original:staged.original,origin:globalTrapAudit.origin});
    await page.waitForTimeout(100);
  }

  const globalTrapState=await page.evaluate(()=>window.CCGLostSizzlerV142R19MobileTrapLayoutStability?.state||{});
  assert.ok(Number(globalTrapState.simulationPasses||0)>globalTrapAudit.simulationPasses,"global trap checks must run from the gameplay simulation, not only the fallback monitor");

  await page.evaluate(fixture=>{
    const trap=(host?.traps||[]).find(t=>String(t.id)===String(fixture.id));
    if(trap){trap.period=fixture.original.period;trap.phase=fixture.original.phase}
    p1.x=world.start.x;p1.y=world.start.y;p1.rx=p1.x;p1.ry=p1.y;p1.invuln=0;p1.hitStunMs=0;
    window.CCGLostSizzlerV142R19MobileTrapLayoutStability?.rearmInactiveTrapContacts?.();
  },stationary);

  // Global cyclic-floor-trap regression. Keep the player on each real generated
  // FIRE/SPIKE/SHOCK tile, land one hit, prove the same active cycle cannot
  // double-hit, then advance the trap by a complete period without ever exposing
  // an inactive sample. The next still-visible ACTIVE cycle must inflict exactly
  // one new HP. This reproduces the stale-latch shape seen after a runtime stall.
  const globalCycle=await page.evaluate(()=>globalThis.eval(`(()=>{
    const api=window.CCGLostSizzlerV142R19MobileTrapLayoutStability;
    const required=["fire","spike","shock"],results=[];
    if(!api?.damageOccupiedActiveTraps||!api?.trapCycleId)return{available:false,reason:"R19 cycle API unavailable"};
    const cycleRearmsBefore=Number(api.state?.cycleRearms||0);
    for(const kind of required){
      const trap=(host?.traps||[]).find(t=>t?.active&&String(t.kind||"").toLowerCase()===kind);
      if(!trap){results.push({kind,available:false});continue}
      const original={period:Number(trap.period),phase:Number(trap.phase)};
      for(const enemy of host?.enemies||[])if(enemy?.alive&&Number(enemy.x)===Number(trap.x)&&Number(enemy.y)===Number(trap.y))enemy.alive=false;
      p1.x=Number(trap.x);p1.y=Number(trap.y);p1.rx=p1.x;p1.ry=p1.y;
      p1.maxHealth=Math.max(8,Number(p1.maxHealth||8));p1.health=p1.maxHealth;
      p1.armor=Math.max(3,Number(p1.armor||0));p1.invuln=0;p1.hitStunMs=0;move1=0;input.clear();
      const period=100000,phaseAt=fraction=>{
        const now=performance.now();
        return((period*fraction)-(now%period)+period)%period
      };
      trap.period=period;trap.phase=phaseAt(.70);
      api.rearmInactiveTrapContacts();
      trap.phase=phaseAt(.10);
      const active1=Boolean(SYS.trapActive(trap,performance.now())),cycle1=api.trapCycleId(trap,performance.now());
      const before={health:Number(p1.health),armor:Number(p1.armor)};
      const firstHandled=api.damageOccupiedActiveTraps();
      const afterFirst={health:Number(p1.health),armor:Number(p1.armor)};
      const duplicateHandled=api.damageOccupiedActiveTraps();
      const afterDuplicate={health:Number(p1.health),armor:Number(p1.armor)};
      trap.phase+=period;
      const active2=Boolean(SYS.trapActive(trap,performance.now())),cycle2=api.trapCycleId(trap,performance.now());
      const secondHandled=api.damageOccupiedActiveTraps();
      const afterSecond={health:Number(p1.health),armor:Number(p1.armor)};
      results.push({kind,available:true,active1,active2,cycle1,cycle2,before,afterFirst,afterDuplicate,afterSecond,firstHandled,duplicateHandled,secondHandled});
      trap.period=original.period;trap.phase=original.phase;
      p1.x=world.start.x;p1.y=world.start.y;p1.rx=p1.x;p1.ry=p1.y;p1.invuln=0;p1.hitStunMs=0;
      api.rearmInactiveTrapContacts();
    }
    return{
      available:true,
      results,
      cycleRearmsBefore,
      cycleRearmsAfter:Number(api.state?.cycleRearms||0),
      hitsByKind:{...(api.state?.trapHitsByKind||{})},
      damageRetries:Number(api.state?.damageRetries||0)
    };
  })()`));
  assert.equal(globalCycle.available,true,`global trap cycle probe unavailable: ${JSON.stringify(globalCycle)}`);
  assert.deepEqual(globalCycle.results.map(row=>row.kind),["fire","spike","shock"],"global floor-trap regression must cover FIRE, SPIKE and SHOCK");
  for(const row of globalCycle.results){
    assert.equal(row.available,true,`generated Solo floor must contain a real ${row.kind} trap`);
    assert.equal(row.active1,true,`${row.kind} trap must be visibly active for its first contact`);
    assert.equal(row.active2,true,`${row.kind} trap must remain visibly active after the synthetic skipped inactive window`);
    assert.equal(row.cycle2,row.cycle1+1,`${row.kind} trap cycle identity must advance exactly once while its visible phase remains active`);
    assert.equal(row.afterFirst.health,row.before.health-1,`${row.kind} ACTIVE must remove exactly one HP`);
    assert.equal(row.afterFirst.armor,row.before.armor,`${row.kind} ACTIVE must not consume armour`);
    assert.equal(row.afterDuplicate.health,row.afterFirst.health,`${row.kind} must not double-hit during one active cycle`);
    assert.equal(row.afterDuplicate.armor,row.before.armor,`${row.kind} duplicate guard must preserve armour`);
    assert.equal(row.afterSecond.health,row.before.health-2,`${row.kind} must remove one new HP in the next active cycle even when no inactive frame was sampled`);
    assert.equal(row.afterSecond.armor,row.before.armor,`${row.kind} next-cycle hit must preserve armour`);
  }
  assert.ok(globalCycle.cycleRearmsAfter-globalCycle.cycleRearmsBefore>=3,`expected one stale-cycle rearm for each floor-trap kind: ${JSON.stringify(globalCycle)}`);
  for(const kind of ["fire","spike","shock"])assert.ok(Number(globalCycle.hitsByKind?.[kind]||0)>=2,`expected R19 diagnostics to record both ${kind} cycle hits`);

  assert.deepEqual(errors,[],`real mobile trap cycle must not raise browser errors: ${errors.join("\n")}`);
  console.log("DUNGEON_MOBILE_NATURAL_TRAPS",JSON.stringify({kinds}));
  console.log("C64 Dungeon Carnage real generated mobile trap damage passed.");
  await context.close();
}finally{
  await browser.close();
  for(const socket of sockets)socket.destroy();
  await new Promise(resolve=>server.close(resolve));
}
