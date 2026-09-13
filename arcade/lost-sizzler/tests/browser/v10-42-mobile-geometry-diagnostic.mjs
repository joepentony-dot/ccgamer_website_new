import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {chromium} from "playwright";

const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,"../../../..");
const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json; charset=utf-8",".svg":"image/svg+xml",".webp":"image/webp",".png":"image/png",".jpg":"image/jpeg",".jpeg":"image/jpeg",".mp3":"audio/mpeg",".wav":"audio/wav",".ogg":"audio/ogg",".m4a":"audio/mp4"};
const sockets=new Set();
const server=http.createServer((req,res)=>{
  try{
    const pathname=decodeURIComponent(new URL(req.url,"http://local").pathname);
    const relative=pathname.endsWith("/")?`${pathname}index.html`:pathname;
    const file=path.resolve(repo,`.${relative}`);
    if(!file.startsWith(`${repo}${path.sep}`)&&file!==repo){res.writeHead(403).end("forbidden");return;}
    fs.readFile(file,(error,data)=>{
      if(error){res.writeHead(404).end("not found");return;}
      res.setHeader("content-type",mime[path.extname(file).toLowerCase()]||"application/octet-stream");
      res.setHeader("cache-control","no-store");
      res.end(data);
    });
  }catch(error){res.writeHead(500).end(String(error));}
});
server.on("connection",socket=>{sockets.add(socket);socket.on("close",()=>sockets.delete(socket));});
await new Promise((resolve,reject)=>{server.once("error",reject);server.listen(0,"127.0.0.1",resolve);});
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,args:["--disable-dev-shm-usage","--disable-background-networking"]});
try{
  const context=await browser.newContext({viewport:{width:320,height:568},isMobile:true,hasTouch:true,deviceScaleFactor:2});
  const page=await context.newPage();
  page.setDefaultTimeout(20000);
  await page.goto(`${origin}/arcade/lost-sizzler/`,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.body.dataset.gameReady==="true");
  await page.waitForFunction(()=>Boolean(window.CCGLostSizzlerV142R19MobileTrapLayoutStability));
  await page.waitForLoadState("load");
  await page.waitForFunction(()=>document.body.classList.contains("v104-touch-device")&&Boolean(document.getElementById("v104-touch-controls")));
  await page.locator("#solo-btn").click({noWaitAfter:true});
  await page.waitForFunction(()=>document.body.dataset.runActive==="true");
  await page.waitForFunction(()=>document.getElementById("menu")?.classList.contains("hidden")===true);
  await page.waitForTimeout(350);
  const diagnostic=await page.evaluate(()=>{
    const snap=element=>{
      if(!element)return null;
      const r=element.getBoundingClientRect(),s=getComputedStyle(element);
      return{id:element.id||"",className:String(element.className||""),rect:{x:r.x,y:r.y,width:r.width,height:r.height},display:s.display,visibility:s.visibility,position:s.position,gridRow:s.gridRow};
    };
    const action=element=>({tag:element.tagName,id:element.id||"",className:String(element.className||""),text:String(element.textContent||"").trim(),href:element.getAttribute("href"),role:element.getAttribute("role"),dataAction:element.getAttribute("data-action")});
    const shell=document.querySelector(".ccg-game"),area=document.querySelector(".ccg-game>.game-area"),touch=document.getElementById("v104-touch-controls"),notice=document.getElementById("ccg-mobile-pc-notice");
    return{
      viewport:{width:innerWidth,height:innerHeight},
      runActive:document.body.dataset.runActive,
      menuHidden:document.getElementById("menu")?.classList.contains("hidden")===true,
      shell:snap(shell),area:snap(area),touch:snap(touch),
      activeDirectOverlays:[...document.querySelectorAll(".game-area>.overlay:not(.hidden)")].map(snap),
      allDirectOverlays:[...document.querySelectorAll(".game-area>.overlay")].map(element=>({id:element.id,className:String(element.className||""),display:getComputedStyle(element).display,hidden:element.classList.contains("hidden")})),
      notice:notice?{...snap(notice),text:String(notice.innerText||notice.textContent||"").trim(),actions:[...notice.querySelectorAll("button,a,[role='button']")].map(action)}:null,
      buttons:[...document.querySelectorAll("#v104-touch-controls .v104-touch-pad .v104-touch-btn")].map(snap)
    };
  });
  console.log(`MOBILE_OVERLAY_DIAGNOSTIC ${JSON.stringify(diagnostic)}`);

  const notice=page.locator("#ccg-mobile-pc-notice");
  if(await notice.isVisible()){
    await page.locator("#ccg-mobile-pc-accept").click({noWaitAfter:true});
    await page.waitForFunction(()=>document.getElementById("ccg-mobile-pc-notice")?.classList.contains("hidden")===true||getComputedStyle(document.getElementById("ccg-mobile-pc-notice")).display==="none");
  }
  await page.waitForTimeout(320);

  const fixture=await page.evaluate(()=>globalThis.eval(`(()=>{
    if(!p1||!world||!host||!W)return{available:false,reason:"runtime unavailable"};
    host.enemies=[];host.items=[];host.doors=[];host.chests=[];host.switches=[];host.shrines=[];host.arenas=[];host.timedRooms=[];host.generators=[];
    host.trader=null;host.startShop=null;host.rescue=null;host.boulderTrap=null;host.spiderNest=null;host.memoryPuzzle=null;host.sequenceTorchPuzzle=null;host.weightBridge=null;
    host.sigilRoomId=null;host.sigilLockdown=false;host.sigilResolved=true;host.stalker=null;
    const dirs=[{dx:1,dy:0,key:"KeyD"},{dx:-1,dy:0,key:"KeyA"},{dx:0,dy:1,key:"KeyS"},{dx:0,dy:-1,key:"KeyW"}];
    let route=null;
    for(let y=2;y<world.map.length-2&&!route;y++)for(let x=2;x<world.map[y].length-2&&!route;x++){
      if(world.map[y]?.[x]!==0||!W.walkable(world.map,x,y,host))continue;
      for(const dir of dirs){const tx=x+dir.dx,ty=y+dir.dy;if(world.map[ty]?.[tx]!==0||!W.walkable(world.map,tx,ty,host))continue;if((tx===world.exit?.x&&ty===world.exit?.y)||(x===world.exit?.x&&y===world.exit?.y))continue;route={x,y,targetX:tx,targetY:ty,...dir};break}
    }
    if(!route)return{available:false,reason:"no cardinal walkable route"};
    const now=performance.now(),period=1000000;
    host.traps=[{id:"mobile-diagnostic-trap",x:route.targetX,y:route.targetY,roomId:W.roomAt(world,route.targetX,route.targetY),kind:"spike",phase:(period-(now%period))%period,period,active:true}];
    p1.x=route.x;p1.y=route.y;p1.rx=route.x;p1.ry=route.y;p1.health=8;p1.maxHealth=Math.max(Number(p1.maxHealth)||8,8);p1.armor=6;p1.invuln=0;p1.hitStunMs=0;move1=0;input.clear();
    window.CCGLostSizzlerV142R19MobileTrapLayoutStability?.rearmInactiveTrapContacts?.();
    const chain=[];let owner=window.hurtPlayer;const seen=new Set();
    while(typeof owner==="function"&&!seen.has(owner)&&chain.length<24){seen.add(owner);chain.push({name:owner.name||"anonymous",markers:Object.getOwnPropertyNames(owner).filter(key=>key.startsWith("__ccg")||key.toLowerCase().includes("original")),source:String(owner).slice(0,180)});owner=typeof owner.__ccgOriginal==="function"?owner.__ccgOriginal:null}
    window.__ccgMobileTrapDamageTrace=[];
    const original=window.hurtPlayer;
    const traced=function mobileTrapDiagnosticTrace(player,amount,flash,source){const before={health:Number(player?.health||0),armor:Number(player?.armor||0),invuln:Number(player?.invuln||0),hitStunMs:Number(player?.hitStunMs||0)};const result=original.apply(this,arguments);window.__ccgMobileTrapDamageTrace.push({amount,flash,source,before,after:{health:Number(player?.health||0),armor:Number(player?.armor||0),invuln:Number(player?.invuln||0),hitStunMs:Number(player?.hitStunMs||0)}});return result};
    traced.__ccgOriginal=original;window.hurtPlayer=traced;
    return{available:true,key:route.key,origin:{x:route.x,y:route.y},target:{x:route.targetX,y:route.targetY},before:{health:p1.health,armor:p1.armor,invuln:p1.invuln},chain};
  })()`));

  if(fixture.available){
    const button=page.locator(`#v104-touch-controls .v104-touch-pad [data-key="${fixture.key}"]`);
    const box=await button.boundingBox();
    if(box){
      const cdp=await context.newCDPSession(page);
      const x=box.x+box.width/2,y=box.y+box.height/2;
      try{
        await cdp.send("Input.dispatchTouchEvent",{type:"touchStart",touchPoints:[{x,y,radiusX:1,radiusY:1,force:1,id:1}]});
        await page.waitForTimeout(55);
        await cdp.send("Input.dispatchTouchEvent",{type:"touchEnd",touchPoints:[]});
      }finally{await cdp.detach()}
      await page.waitForTimeout(140);
    }
  }
  const trapDiagnostic=await page.evaluate(()=>globalThis.eval(`(()=>({
    fixture:${JSON.stringify(fixture)},
    after:{x:p1?.x,y:p1?.y,health:Number(p1?.health||0),armor:Number(p1?.armor||0),invuln:Number(p1?.invuln||0),hitStunMs:Number(p1?.hitStunMs||0)},
    trace:window.__ccgMobileTrapDamageTrace||[],
    r19:{state:window.CCGLostSizzlerV142R19MobileTrapLayoutStability?.state||null}
  }))()`));
  console.log(`MOBILE_TRAP_DAMAGE_DIAGNOSTIC ${JSON.stringify(trapDiagnostic)}`);

  await context.close();
}finally{
  await browser.close();
  for(const socket of sockets)socket.destroy();
  await new Promise(resolve=>server.close(resolve));
}
