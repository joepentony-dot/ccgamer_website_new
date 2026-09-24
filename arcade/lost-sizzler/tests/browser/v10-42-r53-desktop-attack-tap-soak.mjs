import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {chromium} from "playwright";

const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,"../../../..");
const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json; charset=utf-8",".svg":"image/svg+xml",".png":"image/png",".webp":"image/webp",".wav":"audio/wav",".mp3":"audio/mpeg",".ogg":"audio/ogg"};
const sockets=new Set();
const server=http.createServer((req,res)=>{
  try{
    const url=new URL(req.url,"http://local"),pathname=decodeURIComponent(url.pathname),relative=pathname.endsWith("/")?`${pathname}index.html`:pathname,file=path.resolve(repo,`.${relative}`);
    if(!file.startsWith(`${repo}${path.sep}`)&&file!==repo){res.writeHead(403).end("forbidden");return}
    fs.readFile(file,(error,data)=>{
      if(error){res.writeHead(404,{connection:"close"}).end("not found");return}
      res.writeHead(200,{"content-type":mime[path.extname(file).toLowerCase()]||"application/octet-stream","cache-control":"no-store",connection:"close"});res.end(data);
    });
  }catch(error){res.writeHead(500,{connection:"close"}).end(String(error))}
});
server.on("connection",socket=>{sockets.add(socket);socket.on("close",()=>sockets.delete(socket))});
await new Promise((resolve,reject)=>{server.once("error",reject);server.listen(0,"127.0.0.1",resolve)});
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,args:["--disable-dev-shm-usage","--disable-background-networking","--autoplay-policy=no-user-gesture-required"]});

async function runtime(page){
  return page.evaluate(()=>({
    mode:String(mode),active:String(document.body.dataset.runActive||""),health:Number(p1?.health||0),
    locked:Boolean(p1?.controlLocked||p1?.controlsLocked),stun:Number(p1?.hitStunMs||0),
    fire:Number(fire1),buffer:Number(fireBuffer1),space:Boolean(input.has("Space")),
    physicalHeld:Number(window.CCGLostSizzlerV142AttackHoldLiveness?.held?.size||0),
    errors:Number(window.CCGLostSizzlerV142R20LiveRegressionStability?.diagnostics?.directAttackErrors||0)
  }));
}

async function settle(page){
  await page.evaluate(()=>{
    if(!p1)return;
    p1.health=p1.maxHealth=Math.max(100000,Number(p1.maxHealth)||0);
    p1.invuln=0;p1.hitStunMs=0;p1.controlLocked=false;p1.controlsLocked=false;
    fire1=0;fireBuffer1=0;projectileCD=0;input.clear();
    window.CCGLostSizzlerV142AttackHoldLiveness?.clearHeld?.();
    for(const enemy of host?.enemies||[])enemy.alive=false;
  });
}

async function firearmTap(page,cycle){
  await settle(page);
  const before=await page.evaluate(()=>{
    p1.firearmUnlocked=true;p1.weapon=baseWeapon();p1.maxMana=Math.max(100000,Number(p1.maxMana)||0);p1.mana=100000;
    bullets.length=0;
    const dirs=[{x:1,y:0},{x:-1,y:0},{x:0,y:1},{x:0,y:-1}];
    const dir=dirs.find(d=>W.walkable(world.map,p1.x+d.x,p1.y+d.y,host)&&!(host?.blockingDecor||[]).some(item=>item?.x===p1.x+d.x&&item?.y===p1.y+d.y));
    if(!dir)return null;
    p1.dir={...dir};
    return{mana:Number(p1.mana),swing:Number(p1._meleeSwingAt||0)};
  });
  assert.ok(before,`cycle ${cycle}: desktop firearm soak needs a clear firing direction`);
  await page.keyboard.press("Space");
  await page.waitForTimeout(950);
  const after=await page.evaluate(()=>({mana:Number(p1.mana),swing:Number(p1._meleeSwingAt||0),space:input.has("Space"),held:Number(window.CCGLostSizzlerV142AttackHoldLiveness?.held?.size||0)}));
  assert.equal(before.mana-after.mana,1,`cycle ${cycle}: one desktop firearm tap must consume exactly one round`);
  assert.equal(after.swing,before.swing,`cycle ${cycle}: firearm tap must not fall through into melee`);
  assert.equal(after.space,false,`cycle ${cycle}: firearm tap left canonical Space held`);
  assert.equal(after.held,0,`cycle ${cycle}: firearm tap left physical hold ownership latched`);
}

async function swordTap(page,cycle){
  await settle(page);
  const before=await page.evaluate(()=>{
    p1.firearmUnlocked=false;p1.weapon=null;p1.mana=0;
    const dirs=[{x:1,y:0},{x:-1,y:0},{x:0,y:1},{x:0,y:-1}];
    const candidates=(host.enemies||[]).filter(enemy=>enemy&&!enemy.deathStalker&&!enemy.voidStalker&&!enemy.guardian&&!enemy.follower&&!enemy.exitWarden&&!enemy.sigilDefender&&!enemy.champion&&!enemy.spider&&!enemy.skeleton&&!enemy.treasureGoblin&&!enemy.horrorCreature&&!enemy.generatorId);
    let target=null,dir=null,playerCell=null;
    for(const enemy of candidates){
      const found=dirs.find(d=>{
        const x=Number(enemy.x)-d.x,y=Number(enemy.y)-d.y;
        if(!W.walkable(world.map,x,y,host))return false;
        if((host.blockingDecor||[]).some(item=>item?.x===x&&item?.y===y))return false;
        return true;
      });
      if(found){target=enemy;dir=found;playerCell={x:Number(enemy.x)-found.x,y:Number(enemy.y)-found.y};break}
    }
    if(!target||!dir||!playerCell)return null;
    for(const enemy of host.enemies||[])enemy.alive=false;
    Object.assign(target,{
      // Freeze the soak target through the canonical stationary guard AI path.
      // Attack noise can clamp ordinary enemies' moveCooldown via alertEnemy(),
      // which made this liveness test intermittently measure a legitimate dodge
      // rather than ATTACK ownership. Keep natural map placement, but remove
      // unrelated tactical/charge state so every sword tap has a stable adjacent
      // ordinary enemy to prove one-hit/one-tap behaviour.
      kind:"guard",alive:true,hp:50,maxHp:50,armor:0,maxArmor:0,weakness:null,resistance:null,
      follower:null,deathStalker:false,voidStalker:false,guardian:false,exitWarden:false,
      sigilDefender:false,champion:false,spider:false,skeleton:false,treasureGoblin:false,
      horrorCreature:false,generatorId:null,flash:0,hpBarMs:0,hitStunMs:0,
      aiState:"idle",facing:{x:0,y:0},lastSeen:null,memoryMs:0,searchMs:0,
      coverTarget:null,flankTarget:null,tacticalMode:"pressure",tacticalDecisionMs:1000000,
      tacticalHoldMs:0,chargeTelegraphMs:0,chargeTarget:null,retreating:false,
      moveCooldown:1000000,attackCooldown:1000000,chargeCooldown:1000000,healCooldown:1000000
    });
    target.rx=target.x;target.ry=target.y;
    p1.x=p1.rx=playerCell.x;p1.y=p1.ry=playerCell.y;p1.dir={...dir};
    return{
      targetId:target.id,hp:Number(target.hp),swing:Number(p1._meleeSwingAt||0),
      damage:Number(window.CCGLostSizzlerMeleeAmmoV125?.meleeDamageFor?.(p1)||1),
      player:{x:Number(p1.x),y:Number(p1.y)},target:{x:Number(target.x),y:Number(target.y)}
    };
  });
  assert.ok(before,`cycle ${cycle}: desktop sword soak needs a generated ordinary enemy with a walkable adjacent cell`);
  await page.keyboard.press("Space");
  await page.waitForFunction(swing=>Number(p1?._meleeSwingAt||0)>swing,before.swing,{timeout:3000});
  await page.waitForTimeout(120);
  const first=await page.evaluate(targetId=>{
    const target=(host?.enemies||[]).find(enemy=>String(enemy.id)===String(targetId));
    return{
      swing:Number(p1._meleeSwingAt||0),hp:Number(target?.hp||0),alive:Boolean(target?.alive),
      player:{x:Number(p1.x),y:Number(p1.y),dir:{...p1.dir}},
      target:target?{x:Number(target.x),y:Number(target.y),kind:String(target.kind||"")} : null,
      fire:Number(fire1||0),buffer:Number(fireBuffer1||0),
      attackIntents:Number(window.CCGLostSizzlerV142R20LiveRegressionStability?.diagnostics?.attackIntents||0)
    };
  },before.targetId);
  assert.ok(first.hp<before.hp,`cycle ${cycle}: sword swung but the adjacent ordinary enemy did not take damage: ${JSON.stringify({before,first})}`);
  await page.waitForTimeout(1200);
  const after=await page.evaluate(targetId=>{
    const target=(host?.enemies||[]).find(enemy=>String(enemy.id)===String(targetId));
    return{swing:Number(p1._meleeSwingAt||0),hp:Number(target?.hp||0),space:input.has("Space"),held:Number(window.CCGLostSizzlerV142AttackHoldLiveness?.held?.size||0),buffer:Number(fireBuffer1||0)};
  },before.targetId);
  assert.equal(first.swing,after.swing,`cycle ${cycle}: one sword tap repeated after physical key release`);
  assert.equal(before.hp-first.hp,before.damage,`cycle ${cycle}: adjacent enemy must receive exactly one sword hit`);
  assert.equal(after.space,false,`cycle ${cycle}: sword tap left canonical Space held`);
  assert.equal(after.held,0,`cycle ${cycle}: sword tap left physical hold ownership latched`);
  assert.equal(after.buffer,0,`cycle ${cycle}: sword tap left a queued follow-up attack`);
}

try{
  const context=await browser.newContext({viewport:{width:1440,height:900}});
  await context.route("https://*.supabase.co/**",route=>route.fulfill({status:200,contentType:"application/json",headers:{"access-control-allow-origin":"*"},body:"{}"}));
  await context.addInitScript(()=>{
    try{localStorage.setItem("ccg-lost-sizzler-tutorial-seen-v1","true")}catch(_){}
    HTMLElement.prototype.requestFullscreen=function(){return Promise.resolve()};
  });
  const page=await context.newPage();page.setDefaultTimeout(90000);
  const pageErrors=[];page.on("pageerror",error=>pageErrors.push(String(error?.stack||error)));
  await page.goto(`${origin}/arcade/lost-sizzler/?r53-desktop-attack-tap-soak=1`,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>window.CCGLostSizzlerV142Bootstrap?.ready===true||window.CCGLostSizzlerV142Bootstrap?.failed===true,null,{timeout:90000});
  assert.equal(await page.evaluate(()=>window.CCGLostSizzlerV142Bootstrap?.failed===true),false,"R53 bootstrap failed before desktop attack soak");
  await page.click("#solo-btn");
  await page.waitForFunction(()=>document.body.dataset.runActive==="true"&&mode==="playing"&&Boolean(p1)&&Boolean(host),null,{timeout:30000});

  const started=Date.now();
  let cycle=0;
  while(Date.now()-started<190000){
    cycle++;
    if(cycle%2)await swordTap(page,cycle);else await firearmTap(page,cycle);
    const state=await runtime(page);
    assert.equal(state.mode,"playing",`cycle ${cycle}: desktop attack soak left playing mode: ${JSON.stringify(state)}`);
    assert.equal(state.active,"true",`cycle ${cycle}: desktop attack soak lost active-run ownership`);
    assert.equal(state.locked,false,`cycle ${cycle}: control lock survived a verified attack`);
    assert.equal(state.space,false,`cycle ${cycle}: Space remained held between taps`);
    assert.equal(state.physicalHeld,0,`cycle ${cycle}: physical attack ownership remained latched`);
    assert.equal(state.errors,0,`cycle ${cycle}: attack owner accumulated direct errors`);
    const remaining=190000-(Date.now()-started);
    if(remaining>0)await page.waitForTimeout(Math.min(12000,remaining));
  }

  await firearmTap(page,cycle+1);
  await swordTap(page,cycle+2);
  const final=await runtime(page);
  assert.ok(Date.now()-started>=190000,"desktop quick-tap soak must cross the three-minute live failure window");
  assert.equal(final.mode,"playing","ATTACK must remain live after the three-minute desktop soak");
  assert.equal(final.locked,false,"ATTACK soak must finish without a stale control lock");
  assert.equal(final.space,false,"ATTACK soak must finish with Space released");
  assert.equal(final.physicalHeld,0,"ATTACK soak must finish with no physical hold owner");
  assert.deepEqual(pageErrors,[],`R53 desktop quick-tap soak produced page errors: ${pageErrors.join("\n")}`);
  console.log(`C64 Dungeon Carnage R53 desktop quick-tap sword/firearm soak passed ${cycle+2} verified taps over ${Date.now()-started}ms.`);
  await context.close();
}finally{
  await browser.close();
  for(const socket of sockets)socket.destroy();
  await new Promise(resolve=>server.close(()=>resolve()));
}
