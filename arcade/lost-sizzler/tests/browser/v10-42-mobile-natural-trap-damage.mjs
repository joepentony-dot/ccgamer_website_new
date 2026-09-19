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

async function touchButton(page,context,key){
  const locator=page.locator(`#v104-touch-controls .v104-touch-pad [data-key="${key}"]`);
  const box=await locator.boundingBox();
  assert.ok(box&&box.width>0&&box.height>0,`touch target ${key} must be visible`);
  const x=box.x+box.width/2,y=box.y+box.height/2;
  const cdp=await context.newCDPSession(page);
  try{
    await cdp.send("Input.dispatchTouchEvent",{type:"touchStart",touchPoints:[{x,y,radiusX:1,radiusY:1,force:1,id:1}]});
    await page.waitForTimeout(55);
    await cdp.send("Input.dispatchTouchEvent",{type:"touchEnd",touchPoints:[]});
  }finally{await cdp.detach()}
  await page.waitForTimeout(140);
}

try{
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2});
  const page=await context.newPage();
  page.setDefaultTimeout(30000);
  const errors=[];
  page.on("pageerror",error=>errors.push(String(error?.stack||error)));

  await page.goto(`${origin}/arcade/lost-sizzler/?mobile-natural-trap=1`,{waitUntil:"load"});
  await page.waitForFunction(()=>document.body.dataset.gameReady==="true");
  await page.waitForFunction(()=>Boolean(window.CCGLostSizzlerV142R19MobileTrapLayoutStability));
  await page.locator("#solo-btn").click({noWaitAfter:true});
  await page.waitForFunction(()=>document.body.dataset.runActive==="true");
  const notice=page.locator("#ccg-mobile-pc-notice");
  if(await notice.isVisible()){
    await page.locator("#ccg-mobile-pc-accept").click({noWaitAfter:true});
    await page.waitForFunction(()=>document.getElementById("ccg-mobile-pc-notice")?.classList.contains("hidden")===true||getComputedStyle(document.getElementById("ccg-mobile-pc-notice")).display==="none");
  }
  await page.waitForFunction(()=>Boolean(document.getElementById("v104-touch-controls")));
  await page.waitForTimeout(320);
  await page.waitForFunction(()=>[...document.querySelectorAll("#v104-touch-controls .v104-touch-pad .v104-touch-btn")].every(button=>button.getBoundingClientRect().width>0&&button.getBoundingClientRect().height>0));

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

    await page.waitForFunction(id=>{
      const trap=(host?.traps||[]).find(t=>String(t.id)===id);
      if(!trap)return false;
      const period=Math.max(1,Number(trap.period||1));
      const phase=(performance.now()+Number(trap.phase||0))%period;
      return SYS.trapActive(trap,performance.now())&&phase<period*.18;
    },fixture.id,{timeout:10000});

    const direct=await page.evaluate(({id,moveDx,moveDy})=>{
      const source="(()=>{"+
        "const targetId="+JSON.stringify(id)+";"+
        "const trap=(host?.traps||[]).find(t=>String(t.id)===targetId);"+
        "const rare=window.CCGLostSizzlerRareEventsBalance?.trapRuntime;"+
        "const r19=window.CCGLostSizzlerV142R19MobileTrapLayoutStability?.state;"+
        "const r57=window.CCGLostSizzlerV141R57DesktopPrepStability?.state;"+
        "const snap=()=>{const cycleKey=String(p1?.id||p1?.name||\"P1\")+\"|\"+String(trap?.id||\"\");return {"+
          "x:Number(p1.x),y:Number(p1.y),health:Number(p1.health),armor:Number(p1.armor),"+
          "invuln:Number(p1.invuln||0),hitStunMs:Number(p1.hitStunMs||0),"+
          "active:Boolean(trap&&SYS.trapActive(trap,performance.now())),"+
          "rareContact:[...(rare?.contact||[])],"+
          "r19:{trapHits:Number(r19?.trapHits||0),contactBlocks:Number(r19?.trapContactBlocks||0),protectionBlocks:Number(r19?.trapProtectionBlocks||0),rearms:Number(r19?.rearms||0)},"+
          "r57:{trapHits:Number(r57?.trapHits||0),fallbacks:Number(r57?.trapFallbacks||0),cycle:Boolean(r57?.trapCycles?.get?.(cycleKey))}"+
        "}};"+
        "const before=snap();"+
        "movePlayer(p1,"+Number(moveDx)+","+Number(moveDy)+",false);"+
        "const after=snap();"+
        "return {before,after};"+
      "})()";
      return globalThis.eval(source);
    },{id:fixture.id,moveDx:fixture.moveDx,moveDy:fixture.moveDy});

    console.log("MOBILE_NATURAL_TRAP_DIRECT",JSON.stringify({kind,fixture,direct}));
    assert.deepEqual({x:direct.after.x,y:direct.after.y},fixture.target,`one canonical movePlayer step must land on real generated ${kind} trap`);
    assert.equal(direct.after.health,direct.before.health-1,`one canonical mobile-runtime step onto naturally active ${kind} trap must remove one health: ${JSON.stringify({fixture,direct})}`);
    assert.equal(direct.after.armor,direct.before.armor,`canonical natural ${kind} trap damage must preserve armour`);

    await page.evaluate(fixture=>globalThis.eval("(()=>{const f="+JSON.stringify(fixture)+";p1.x=f.origin.x;p1.y=f.origin.y;p1.rx=p1.x;p1.ry=p1.y;p1.health=f.before.health;p1.armor=f.before.armor;p1.invuln=0;p1.hitStunMs=0;move1=0;input.clear();window.CCGLostSizzlerV142R19MobileTrapLayoutStability?.rearmInactiveTrapContacts?.();return true})()"),fixture);
    await page.waitForTimeout(120);

    await page.waitForFunction(id=>{
      const trap=(host?.traps||[]).find(t=>String(t.id)===id);
      if(!trap)return false;
      const period=Math.max(1,Number(trap.period||1));
      const phase=(performance.now()+Number(trap.phase||0))%period;
      return SYS.trapActive(trap,performance.now())&&phase<period*.18;
    },fixture.id,{timeout:10000});

    await touchButton(page,context,fixture.key);
    const after=await page.evaluate(()=>({
      x:Number(p1.x),y:Number(p1.y),health:Number(p1.health),armor:Number(p1.armor),
      trapHits:Number(window.CCGLostSizzlerV142R19MobileTrapLayoutStability?.state?.trapHits||0),
      r57Hits:Number(window.CCGLostSizzlerV141R57DesktopPrepStability?.state?.trapHits||0),
      r57Fallbacks:Number(window.CCGLostSizzlerV141R57DesktopPrepStability?.state?.trapFallbacks||0)
    }));
    console.log("MOBILE_NATURAL_TRAP_TOUCH",JSON.stringify({kind,fixture,after}));
    assert.equal(after.health,fixture.before.health-1,`real generated ${kind} trap entered through touch during its natural active phase must remove one health on mobile: ${JSON.stringify({fixture,after})}`);
    assert.equal(after.armor,fixture.before.armor,`real generated ${kind} trap must preserve armour while applying health damage`);
    assert.ok(Math.abs(after.x-fixture.target.x)+Math.abs(after.y-fixture.target.y)<=1,`touch movement must not skip more than one tile beyond a trap contact: ${JSON.stringify({fixture,after})}`);

    await page.evaluate(fixture=>globalThis.eval("(()=>{const f="+JSON.stringify(fixture)+";p1.x=f.origin.x;p1.y=f.origin.y;p1.rx=p1.x;p1.ry=p1.y;p1.invuln=0;p1.hitStunMs=0;move1=0;input.clear();window.CCGLostSizzlerV142R19MobileTrapLayoutStability?.rearmInactiveTrapContacts?.();return true})()"),fixture);
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
