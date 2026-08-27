import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {chromium} from "playwright";

const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,"../../../..");
const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".mjs":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json; charset=utf-8",".svg":"image/svg+xml",".webp":"image/webp",".png":"image/png",".ogg":"audio/ogg",".mp3":"audio/mpeg"};
const sockets=new Set();
const server=http.createServer((req,res)=>{
  try{
    const pathname=decodeURIComponent(new URL(req.url,"http://local").pathname),relative=pathname.endsWith("/")?`${pathname}index.html`:pathname,file=path.resolve(repo,`.${relative}`);
    if(!file.startsWith(`${repo}${path.sep}`)&&file!==repo){res.writeHead(403).end("forbidden");return}
    fs.readFile(file,(error,data)=>{if(error){res.writeHead(404,{connection:"close"}).end("not found");return}res.writeHead(200,{"content-type":mime[path.extname(file).toLowerCase()]||"application/octet-stream","cache-control":"no-store",connection:"close"});res.end(data)});
  }catch(error){res.writeHead(500,{connection:"close"}).end(String(error))}
});
server.on("connection",socket=>{sockets.add(socket);socket.on("close",()=>sockets.delete(socket))});
await new Promise((resolve,reject)=>{server.once("error",reject);server.listen(0,"127.0.0.1",resolve)});
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,args:["--disable-dev-shm-usage","--disable-background-networking","--autoplay-policy=no-user-gesture-required"]});

try{
  const context=await browser.newContext({viewport:{width:1600,height:900}}),page=await context.newPage();page.setDefaultTimeout(45000);
  const errors=[];page.on("pageerror",error=>errors.push(String(error?.stack||error)));
  await page.goto(`${origin}/arcade/lost-sizzler/`,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.body.dataset.releaseReady==="true"&&Boolean(window.CCGLostSizzlerV141PostPlaytestStability)&&Boolean(document.getElementById("horde-solo-btn")));

  await page.evaluate(()=>{
    window.__ccgLegacyHordeBannerDraws=[];
    const record=(name,original)=>function(){
      const [x,y,w,h]=arguments;
      if(Number(x)>=13&&Number(x)<=15&&Number(y)>=13&&Number(y)<=15&&Number(w)>=300&&Number(h)>=68&&Number(h)<=71)window.__ccgLegacyHordeBannerDraws.push({name,x,y,w,h});
      return original.apply(this,arguments)
    };
    ctx.fillRect=record("fillRect",ctx.fillRect);ctx.strokeRect=record("strokeRect",ctx.strokeRect);
  });

  await page.click("#horde-solo-btn");
  await page.waitForFunction(()=>document.body.dataset.specialMode==="horde-survivor"&&document.body.dataset.hordeSolo==="true"&&Boolean(window.CCGLostSizzlerSpecialModes?.active?.state));
  await page.waitForFunction(()=>Boolean(world?._v141CompactHordeArena&&world?._v141TraversalHordeArena));
  await page.waitForTimeout(250);

  const live=await page.evaluate(()=>{
    const room=world.rooms?.[0],map=world.map,centre={x:Math.round(room.x+room.w/2),y:Math.round(room.y+room.h/2)};let interiorWalls=0;
    for(let y=room.y+4;y<=room.y+room.h-4;y++)for(let x=room.x+4;x<=room.x+room.w-4;x++)if(map?.[y]?.[x]===1)interiorWalls++;
    const runState=window.CCGLostSizzlerSpecialModes.active.state,model=runState.players?.find(row=>String(row.id)===String(p1.id))||runState.players?.[0];
    return{marked:Boolean(world._v141TraversalHordeArena),blocks:Number(room.hordeTraversalBlocks||0),interiorWalls,centreOpen:map?.[centre.y]?.[centre.x]===0,bannerDraws:[...(window.__ccgLegacyHordeBannerDraws||[])],playerCount:Number(runState.playerCount||0),modelId:String(model?.id||""),physicalId:String(p1.id||"")};
  });
  assert.equal(live.marked,true,"real Horde Solo start must finish with traversal geometry installed");
  assert.ok(live.blocks>=4,`real Horde Solo start must retain several wall groups, got ${live.blocks}`);
  assert.ok(live.interiorWalls>=40,`real Horde Solo start must contain meaningful internal obstacles, got ${live.interiorWalls} interior wall cells`);
  assert.equal(live.centreOpen,true,"Horde Solo must retain its open centre crossing");
  assert.deepEqual(live.bannerDraws,[],"obsolete large Horde canvas banner rectangles must not be drawn over gameplay");
  assert.equal(live.playerCount,1,"Horde Solo live rules state must contain one player");

  const death=await page.evaluate(()=>{
    const runState=window.CCGLostSizzlerSpecialModes.active.state,model=runState.players?.find(row=>String(row.id)===String(p1.id))||runState.players?.[0];
    model.selfReviveAvailable=false;model.status="active";model.hp=1;model.invulnerableUntil=0;p1.health=1;p1.maxHealth=Math.max(1,Number(model.maxHp||10));
    hurtPlayer(p1,5,false,"browser-regression");
    window.CCGLostSizzlerV141PostPlaytestStability.monitor();
    return{state:String(runState.state||""),status:String(model.status||""),modelHp:Number(model.hp),physicalHp:Number(p1.health),locked:Boolean(p1._v141PostPlaytestHordeLock),repairs:window.CCGLostSizzlerV141PostPlaytestStability.state.hordeSoloDefeats};
  });
  assert.equal(death.state,"defeat","unrevivable Horde Solo lethal damage must end the run immediately");
  assert.equal(death.status,"eliminated","unrevivable Horde Solo player must become eliminated rather than lingering downed");
  assert.equal(death.modelHp,0,"Horde rules model must remain at zero HP after lethal damage");
  assert.equal(death.physicalHp,0,"physical Horde player must remain at zero HP after lethal damage");
  assert.equal(death.locked,true,"dead Horde Solo player must not retain live controls");
  assert.ok(death.repairs>=1,"Solo Horde terminal repair must record the resolved lethal state");

  await page.reload({waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.body.dataset.releaseReady==="true"&&Boolean(window.CCGLostSizzlerV141PostPlaytestStability)&&Boolean(document.getElementById("solo-btn")));
  await page.click("#solo-btn");
  await page.waitForFunction(()=>document.body.dataset.runActive==="true"&&typeof mode!=="undefined"&&mode==="playing");
  const fireRecovery=await page.evaluate(()=>{
    fire1=Infinity;fireBuffer1=Infinity;
    window.CCGLostSizzlerV141PostPlaytestStability.monitor();
    return{fire1:Number(fire1),fireBuffer1:Number(fireBuffer1),cooldownRepairs:window.CCGLostSizzlerV141PostPlaytestStability.state.fireCooldownRepairs,bufferRepairs:window.CCGLostSizzlerV141PostPlaytestStability.state.fireBufferRepairs};
  });
  assert.equal(fireRecovery.fire1,0,"non-finite Solo fire cooldown must recover instead of permanently disabling shooting");
  assert.equal(fireRecovery.fireBuffer1,0,"non-finite Solo fire buffer must recover");
  assert.ok(fireRecovery.cooldownRepairs>=1,"Solo fire cooldown recovery must be recorded");
  assert.ok(fireRecovery.bufferRepairs>=1,"Solo fire buffer recovery must be recorded");

  assert.deepEqual(errors,[],`post-playtest browser regression must have no uncaught browser errors: ${errors.join("\n")}`);
  console.log("Lost Sizzler real Horde Solo arena/death/HUD and Solo fire recovery regressions passed in Chromium.");
  await context.close();
}finally{
  await browser.close();for(const socket of sockets)socket.destroy();await new Promise(resolve=>server.close(()=>resolve()));
}
