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
      const trap=(host?.traps||[]).find(t=>String(t.kind||"floor")===${JSON.stringify(kind)});
      if(!trap)return{available:false,reason:"kind absent"};
      const dirs=[
        {dx:-1,dy:0,key:"KeyD"},
        {dx:1,dy:0,key:"KeyA"},
        {dx:0,dy:-1,key:"KeyS"},
        {dx:0,dy:1,key:"KeyW"}
      ];
      const route=dirs.find(d=>{
        const x=Number(trap.x)+d.dx,y=Number(trap.y)+d.dy;
        return world?.map?.[y]?.[x]===0&&W.walkable(world.map,x,y,host);
      });
      if(!route)return{available:false,reason:"no adjacent route",trap:{id:trap.id,kind:trap.kind,x:trap.x,y:trap.y}};
      const x=Number(trap.x)+route.dx,y=Number(trap.y)+route.dy;
      p1.x=x;p1.y=y;p1.rx=x;p1.ry=y;
      p1.health=Math.max(4,Number(p1.health||8));
      p1.maxHealth=Math.max(Number(p1.maxHealth||8),p1.health);
      p1.armor=Math.max(2,Number(p1.armor||0));
      p1.invuln=0;p1.hitStunMs=0;
      move1=0;input.clear();
      window.CCGLostSizzlerV142R19MobileTrapLayoutStability?.rearmInactiveTrapContacts?.();
      return{available:true,key:route.key,kind:String(trap.kind||"floor"),id:String(trap.id),target:{x:Number(trap.x),y:Number(trap.y)},period:Number(trap.period),phase:Number(trap.phase),before:{health:Number(p1.health),armor:Number(p1.armor)}};
    })()`),kind);
    assert.equal(fixture.available,true,`real generated ${kind} trap must have a touch-accessible adjacent tile: ${JSON.stringify(fixture)}`);

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
    assert.deepEqual({x:after.x,y:after.y},fixture.target,`touch input must step onto real generated ${kind} trap`);
    assert.equal(after.health,fixture.before.health-1,`real generated ${kind} trap entered during its natural active phase must remove one health on mobile: ${JSON.stringify({fixture,after})}`);
    assert.equal(after.armor,fixture.before.armor,`real generated ${kind} trap must preserve armour while applying health damage`);

    p1.x=fixture.target.x+(fixture.key==="KeyD"?-1:fixture.key==="KeyA"?1:0);
    p1.y=fixture.target.y+(fixture.key==="KeyS"?-1:fixture.key==="KeyW"?1:0);
    p1.rx=p1.x;p1.ry=p1.y;
    window.CCGLostSizzlerV142R19MobileTrapLayoutStability?.rearmInactiveTrapContacts?.();
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
