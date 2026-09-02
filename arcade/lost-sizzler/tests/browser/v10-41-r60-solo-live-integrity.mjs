import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {chromium} from "playwright";

const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,"../../../..");
const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".mjs":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json; charset=utf-8",".svg":"image/svg+xml",".png":"image/png",".webp":"image/webp",".ogg":"audio/ogg",".mp3":"audio/mpeg"};
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
  const context=await browser.newContext({viewport:{width:1800,height:1000}}),page=await context.newPage();
  page.setDefaultTimeout(45000);
  const errors=[];page.on("pageerror",error=>errors.push(String(error?.stack||error)));

  console.log("[r60 Solo] load final live-play owner and start a canonical Solo Dungeon");
  await page.goto(`${origin}/arcade/lost-sizzler/`,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.body.dataset.releaseReady==="true"&&Boolean(window.CCGLostSizzlerV141R60LivePlayIntegrity)&&Boolean(window.CCGLostSizzlerV141R59LiveRegressionFixes),null,{timeout:90000});
  await page.click("#solo-btn");
  await page.waitForFunction(()=>document.body.dataset.runActive==="true"&&mode==="playing"&&playMode==="solo"&&Boolean(p1)&&Boolean(host)&&window.movePlayer?.__ccgV141R60CadenceSeal===true&&window.update?.__ccgV141R60TimeSmoothing===true,null,{timeout:30000});
  // A one-tick sighting is not enough: the final Solo host must retain exactly one CCG across the guarded R60 owner cadence.
  await page.waitForFunction(()=>{
    const count=(host?.enemies||[]).filter(enemy=>String(enemy?.follower?.name||"").toUpperCase()==="CCG").length,now=performance.now();
    if(count!==1){window.__ccgR60StableCcgSince=0;return false}
    if(!Number(window.__ccgR60StableCcgSince||0))window.__ccgR60StableCcgSince=now;
    return now-Number(window.__ccgR60StableCcgSince||0)>=200
  },null,{timeout:5000,polling:25});

  console.log("[r60 Solo] AZALEA portrait and CCG roster must be restored");
  const roster=await page.evaluate(()=>{
    const azalea=window.CCG_CONFIG.followerElites.find(row=>row.name==="AZALEA"),ccg=(host.enemies||[]).filter(enemy=>String(enemy?.follower?.name||"").toUpperCase()==="CCG");
    PGR.recordNamedEncounter?.("AZALEA",false);showNamedDossier("AZALEA",false);
    const portrait=document.querySelector("#named-dossier-list .focused img")?.getAttribute("src")||"";
    hideNamedDossier();
    return{azaleaAvatar:String(azalea?.avatar||""),portrait,ccgCount:ccg.length,ccgAlive:ccg.filter(enemy=>enemy.alive).length};
  });
  assert.equal(roster.azaleaAvatar,"assets/parsnip-celery.png","AZALEA config must own her actual portrait asset");
  assert.match(roster.portrait,/parsnip-celery\.png/,`AZALEA dossier must not fall back to the CCG logo: ${JSON.stringify(roster)}`);
  assert.equal(roster.ccgCount,1,`Solo Dungeon must contain exactly one CCG named enemy on the current floor: ${JSON.stringify(roster)}`);

  console.log("[r60 Solo] visual interpolation must scale with elapsed time rather than rendered-frame count");
  const smoothing=await page.evaluate(()=>{
    const api=window.CCGLostSizzlerV141R60LivePlayIntegrity,actor={x:10,y:10,rx:9,ry:10};
    const a16=api.timeSmoothingAlpha(.32,1000/60),a45=api.timeSmoothingAlpha(.32,45),a90=api.timeSmoothingAlpha(.32,90);
    api.applyTimeSmoothing([{player:actor,rx:9,ry:10,x:10,y:10,base:.32}],45);
    return{a16,a45,a90,rx:actor.rx};
  });
  assert.ok(Math.abs(smoothing.a16-.32)<.01,`time smoothing must preserve the established 60 Hz feel: ${JSON.stringify(smoothing)}`);
  assert.ok(smoothing.a45>.55&&smoothing.a90>.8,`slow rendered frames must visually catch up instead of sliding behind the physical player: ${JSON.stringify(smoothing)}`);
  assert.ok(smoothing.rx>9.55,`45 ms smoothing must close more than half of a one-tile visual gap: ${JSON.stringify(smoothing)}`);

  const SAMPLE_MS=1600;
  console.log("[r60 Solo] establish actual simulation-time rate before pause cycling");
  const baselineStart=await page.evaluate(()=>Number(run?.elapsed||0));
  await page.waitForTimeout(SAMPLE_MS);
  const baselineEnd=await page.evaluate(()=>Number(run?.elapsed||0));
  const baselineSim=baselineEnd-baselineStart,baselineRate=baselineSim/SAMPLE_MS;
  assert.ok(baselineSim>300,`Solo simulation clock must advance before the pause test: ${baselineSim} ms`);
  assert.ok(baselineRate<1.45,`baseline Solo simulation must not already outrun wall time: ${baselineRate.toFixed(2)}x`);

  console.log("[r60 Solo] six real pause/resume cycles must not accelerate simulation");
  for(let cycle=0;cycle<6;cycle++){
    await page.keyboard.press("KeyP");await page.waitForFunction(()=>mode==="paused");
    await page.evaluate(()=>{const until=performance.now()+320;while(performance.now()<until){}});
    await page.waitForTimeout(50);
    await page.keyboard.press("KeyP");await page.waitForFunction(()=>mode==="playing");
    await page.waitForTimeout(75);
  }
  const afterStart=await page.evaluate(()=>Number(run?.elapsed||0));
  await page.waitForTimeout(SAMPLE_MS);
  const afterEnd=await page.evaluate(()=>Number(run?.elapsed||0));
  const afterSim=afterEnd-afterStart,afterRate=afterSim/SAMPLE_MS,rateRatio=afterRate/Math.max(.01,baselineRate);
  assert.ok(afterSim>300,`Solo simulation clock must continue after repeated pauses: ${afterSim} ms`);
  assert.ok(afterRate<1.45,`repeated pauses must never make the Solo simulation run faster than wall time: baseline=${baselineRate.toFixed(2)}x after=${afterRate.toFixed(2)}x`);
  assert.ok(rateRatio>=.55&&rateRatio<=1.45,`six resumes must not multiply Solo simulation speed: baseline=${baselineRate.toFixed(2)}x after=${afterRate.toFixed(2)}x ratio=${rateRatio.toFixed(2)}`);

  console.log("[r60 Solo] duplicate movement calls after pause cycling must be cadence-blocked");
  const movement=await page.evaluate(()=>{
    const inspectChain=fn=>{
      const links=["__ccgOriginal","__ccgV141Original","__ccgV141TutorialOriginal","__ccgV141R27Original","__ccgV141R25Original"],seen=new Set(),chain=[];let current=fn,depth=0;
      while(typeof current==="function"&&!seen.has(current)&&depth<48){
        seen.add(current);
        const markers=Object.getOwnPropertyNames(current).filter(name=>name.startsWith("__ccgV141")||name==="__tutorial"||name==="__ccgOriginal").sort();
        chain.push({depth,name:String(current.name||"anonymous"),markers});
        current=links.map(key=>current?.[key]).find(value=>typeof value==="function"&&value!==current&&!seen.has(value))||null;depth++;
      }
      return{depth:chain.length,r60Layers:chain.filter(row=>row.markers.includes("__ccgV141R60CadenceSeal")).length,spyFinalLayers:chain.filter(row=>row.markers.includes("__ccgV141SpyFinal")).length,chain};
    };
    const dirs=[{dx:1,dy:0,code:"ArrowRight"},{dx:-1,dy:0,code:"ArrowLeft"},{dx:0,dy:1,code:"ArrowDown"},{dx:0,dy:-1,code:"ArrowUp"}],blocked=host.blockingDecor||[],enemies=host.enemies||[];
    const open=(x,y)=>window.CCGWorld.walkable(world.map,x,y,host)&&!blocked.some(row=>Number(row.x)===x&&Number(row.y)===y)&&!enemies.some(row=>row?.alive&&Number(row.x)===x&&Number(row.y)===y);
    let choice=null;
    for(let y=2;y<world.map.length-2&&!choice;y++)for(let x=2;x<world.map[y].length-2&&!choice;x++)for(const dir of dirs){if(open(x,y)&&open(x+dir.dx,y+dir.dy)&&open(x+dir.dx*2,y+dir.dy*2)){choice={x,y,...dir};break}}
    if(!choice)throw new Error("R60 Solo cadence fixture could not find a three-cell open lane");
    p1.x=choice.x;p1.y=choice.y;p1.rx=choice.x;p1.ry=choice.y;p1.hitStunMs=0;move1=0;input.clear();input.add(choice.code);
    const api=window.CCGLostSizzlerV141R60LivePlayIntegrity,r30=window.CCGLostSizzlerV141R30,seal=window.CCGLostSizzlerV141R30OwnerSeal;
    const blocksBefore=Number(api.state.movementBlocks||0),callAt=performance.now(),ownership=inspectChain(window.movePlayer);
    movePlayer(p1,choice.dx,choice.dy,false);movePlayer(p1,choice.dx,choice.dy,false);
    const first={x:Number(p1.x),y:Number(p1.y),blocks:Number(api.state.movementBlocks||0)-blocksBefore,cadence:Number(api.movementCadence(p1)),callAt,ownership,r30GoldenSame:Boolean(r30?.state?.goldenMove===window.movePlayer),r30GoldenPromotions:Number(r30?.state?.goldenMovePromotions||0),r30Repairs:Number(r30?.state?.ownershipRepairs||0),sealRepairs:Number(seal?.state?.repairs||0),sealBlockedWrites:Number(seal?.state?.blockedWrites||0)};
    input.delete(choice.code);return{choice,first};
  });
  assert.equal(movement.first.x,movement.choice.x+movement.choice.dx,"two immediate move calls may advance only one physical tile on X");
  assert.equal(movement.first.y,movement.choice.y+movement.choice.dy,"two immediate move calls may advance only one physical tile on Y");
  assert.ok(movement.first.blocks>=1,`the duplicate post-pause move must be rejected by the cadence owner: ${JSON.stringify(movement)}`);
  await page.waitForTimeout(Math.ceil(movement.first.cadence)+30);
  const movementAfter=await page.evaluate(({choice,first})=>{
    const inspectChain=fn=>{
      const links=["__ccgOriginal","__ccgV141Original","__ccgV141TutorialOriginal","__ccgV141R27Original","__ccgV141R25Original"],seen=new Set(),chain=[];let current=fn,depth=0;
      while(typeof current==="function"&&!seen.has(current)&&depth<48){
        seen.add(current);
        const markers=Object.getOwnPropertyNames(current).filter(name=>name.startsWith("__ccgV141")||name==="__tutorial"||name==="__ccgOriginal").sort();
        chain.push({depth,name:String(current.name||"anonymous"),markers});
        current=links.map(key=>current?.[key]).find(value=>typeof value==="function"&&value!==current&&!seen.has(value))||null;depth++;
      }
      return{depth:chain.length,r60Layers:chain.filter(row=>row.markers.includes("__ccgV141R60CadenceSeal")).length,spyFinalLayers:chain.filter(row=>row.markers.includes("__ccgV141SpyFinal")).length,chain};
    };
    const targetX=choice.x+choice.dx*2,targetY=choice.y+choice.dy*2,api=window.CCGLostSizzlerV141R60LivePlayIntegrity,r30=window.CCGLostSizzlerV141R30,seal=window.CCGLostSizzlerV141R30OwnerSeal;
    host.enemies=(host.enemies||[]).filter(row=>!(row?.alive&&Number(row.x)===targetX&&Number(row.y)===targetY));
    p1.hitStunMs=0;move1=0;input.clear();input.add(choice.code);
    const blocksBefore=Number(api.state.movementBlocks||0),before={x:Number(p1.x),y:Number(p1.y)},callAt=performance.now(),ownership=inspectChain(window.movePlayer);
    movePlayer(p1,choice.dx,choice.dy,false);input.delete(choice.code);
    return{x:Number(p1.x),y:Number(p1.y),before,elapsedSinceFirst:callAt-Number(first.callAt||0),blocksDelta:Number(api.state.movementBlocks||0)-blocksBefore,move1:Number(move1||0),hitStun:Number(p1.hitStunMs||0),mode:String(mode||""),held:Boolean(input.has(choice.code)),ownership,r30GoldenSame:Boolean(r30?.state?.goldenMove===window.movePlayer),r30GoldenPromotions:Number(r30?.state?.goldenMovePromotions||0),r30Repairs:Number(r30?.state?.ownershipRepairs||0),sealRepairs:Number(seal?.state?.repairs||0),sealBlockedWrites:Number(seal?.state?.blockedWrites||0)};
  },movement);
  console.log(`[r60 Solo] movement ownership after cadence wait: ${JSON.stringify({first:movement.first,after:movementAfter})}`);
  assert.equal(movementAfter.x,movement.choice.x+movement.choice.dx*2,`movement must resume normally after the configured cadence: ${JSON.stringify({first:movement.first,after:movementAfter})}`);
  assert.equal(movementAfter.y,movement.choice.y+movement.choice.dy*2,`movement must resume normally after the configured cadence: ${JSON.stringify({first:movement.first,after:movementAfter})}`);

  console.log("[r60 Solo] environmental damage must survive stale invulnerability/owner state");
  const environment=await page.evaluate(()=>{
    const inspectChain=fn=>{
      const seen=new Set(),chain=[];let current=fn,depth=0;
      while(typeof current==="function"&&!seen.has(current)&&depth<32){
        seen.add(current);
        const markers=Object.getOwnPropertyNames(current).filter(name=>name.startsWith("__ccgV141")||name==="__ccgOriginal").sort();
        chain.push({depth,name:String(current.name||"anonymous"),markers});
        current=current.__ccgOriginal||current.__ccgV141Original||null;depth++;
      }
      return{depth:chain.length,chain,r60InChain:chain.some(row=>row.markers.includes("__ccgV141R60EnvironmentSeal"))};
    };
    const before=Number(p1.health||0)+Number(p1.armor||0);p1.invuln=900;p1.hitStunMs=0;
    const ownership=inspectChain(window.hurtPlayer);
    window.hurtPlayer(p1,1,false,"fire trap");
    return{before,after:Number(p1.health||0)+Number(p1.armor||0),owner:Boolean(window.hurtPlayer?.__ccgV141R60EnvironmentSeal),ownership};
  });
  console.log(`[r60 Solo] hurtPlayer ownership at environmental assertion: ${JSON.stringify(environment.ownership)}`);
  assert.equal(environment.ownership.r60InChain,true,`R60 environmental seal must remain in the Solo Dungeon damage ancestry: ${JSON.stringify(environment.ownership)}`);
  assert.ok(environment.after<environment.before,`active trap damage must not be swallowed by stale invulnerability/owner state: ${JSON.stringify(environment)}`);

  const final=await page.evaluate(()=>({...window.CCGLostSizzlerV141R60LivePlayIntegrity.state}));
  assert.ok(final.pauseResets>=6,`R60 must observe repeated pause boundaries: ${JSON.stringify(final)}`);
  assert.equal(final.lastError,"",`R60 live-play owner must not record runtime faults: ${JSON.stringify(final)}`);
  assert.deepEqual(errors,[],`R60 Solo live-integrity browser regression produced page errors: ${errors.join("\n")}`);
  console.log(`R60 Solo live integrity passed: simulation ${baselineRate.toFixed(2)}x -> ${afterRate.toFixed(2)}x, cadence blocks=${final.movementBlocks}, smoothing frames=${final.smoothingFrames}.`);
  await context.close();
}finally{
  await browser.close().catch(()=>{});for(const socket of sockets)socket.destroy();await new Promise(resolve=>server.close(resolve));
}
