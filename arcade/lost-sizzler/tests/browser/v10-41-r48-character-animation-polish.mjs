import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {chromium} from "playwright";

const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,"../../../..");
const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".mjs":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json",".svg":"image/svg+xml",".webp":"image/webp",".png":"image/png",".ogg":"audio/ogg",".mp3":"audio/mpeg"};
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
  await page.waitForFunction(()=>document.body.dataset.releaseReady==="true"&&Boolean(window.CCGLostSizzlerV141R48CharacterAnimation)&&Boolean(document.getElementById("solo-btn")),null,{timeout:90000});
  await page.waitForFunction(()=>{
    try{return Boolean(lostSizzlerPixelAssets?.explorer?.complete&&lostSizzlerPixelAssets.explorer.naturalWidth===192&&lostSizzlerPixelAssets.explorer.naturalHeight===128)}catch(_){return false}
  },null,{timeout:20000});

  const atlas=await page.evaluate(()=>{
    const api=window.CCGLostSizzlerV141R48CharacterAnimation,source=api.verifySourceFrameMargins(),check=api.verifyPaddedAtlas();
    return{...check,source,cell:api.PLAYER_CELL,cols:api.PLAYER_COLS,rows:api.PLAYER_ROWS,pad:api.PLAYER_PAD,stride:api.PLAYER_STRIDE,walk:api.WALK_SEQUENCE.map(x=>x.label),attack:api.ATTACK_SEQUENCE.map(x=>x.label),builds:api.state.atlasBuilds}
  });
  assert.equal(atlas.source.ok,true,`every original explorer pose must have a transparent one-pixel perimeter; touching frames: ${JSON.stringify(atlas.source.framesTouchingEdges)}`);
  assert.equal(atlas.source.edgeOpaquePixels,0,"no visible player pixel may already touch a 32x32 source-cell edge and risk being cut off");
  assert.equal(atlas.source.frames,24,"source-margin audit must inspect all 24 directional/action cells");
  assert.deepEqual(atlas.source.framesTouchingEdges,[],"no player source frame may touch its previous/next frame boundary");
  assert.equal(atlas.ok,true,"every explorer frame gutter must remain fully transparent");
  assert.equal(atlas.opaqueGutterPixels,0,"no pixel from any player frame may bleed into the previous/next frame gutter");
  assert.equal(atlas.cell,32,"player source cells must remain exactly 32x32");
  assert.equal(atlas.cols,6,"all six explorer source columns must be preserved");
  assert.equal(atlas.rows,4,"all four directional player rows must be preserved");
  assert.equal(atlas.pad,2,"each player frame must receive a two-pixel transparent gutter on every side");
  assert.equal(atlas.stride,36,"padded player cells must be 36x36");
  assert.equal(atlas.width,216,"six padded player cells must occupy the expected atlas width");
  assert.equal(atlas.height,144,"four padded player rows must occupy the expected atlas height");
  assert.equal(atlas.frames,24,"all 24 directional/action source cells must be isolated");
  assert.equal(new Set(atlas.walk).size,4,"walk presentation must expose four distinct cadence stages");
  assert.equal(atlas.attack.length,6,"melee presentation must expose six cadence stages");
  assert.ok(atlas.builds>=1,"padded player atlas must be constructed in the real browser runtime");

  const timing=await page.evaluate(()=>{
    const api=window.CCGLostSizzlerV141R48CharacterAnimation;
    const walker={id:"r48-walker",x:2,y:1,rx:1,ry:1,hitStunMs:0,_meleeSwingAt:-Infinity};
    const walk=[];for(let n=0;n<4;n++)walk.push(api.playerPose(walker,1,n*api.WALK_FRAME_MS).label);
    const attacker={id:"r48-attacker",x:1,y:1,rx:1,ry:1,hitStunMs:0,_meleeSwingAt:1000,_meleeSwingMs:600};
    const attack=[];for(let n=0;n<6;n++)attack.push(api.playerPose(attacker,3,1000+n*100+1).label);
    const full=api.interpolationRate(.26,16.6667),half=api.interpolationRate(.26,8.33335),combined=1-(1-half)*(1-half),highRefresh=api.interpolationRate(.26,6.9444);
    return{walk,attack,full,half,combined,highRefresh}
  });
  assert.equal(new Set(timing.walk).size,4,"deterministic walk sampling must visit all four stages");
  assert.deepEqual(timing.attack,["wind-up","draw-back","early-swing","impact","follow-through","recover"],"melee animation must progress through all six stages in order");
  assert.ok(Math.abs(timing.full-.26)<.001,"60 Hz enemy interpolation must preserve the existing movement feel");
  assert.ok(Math.abs(timing.combined-.26)<.002,"two 120 Hz updates must cover the same movement fraction as one 60 Hz update");
  assert.ok(timing.highRefresh<timing.full,"high-refresh enemy interpolation must use a smaller per-frame step rather than moving too fast");

  await page.click("#solo-btn");
  await page.waitForFunction(()=>document.body.dataset.runActive==="true"&&typeof mode!=="undefined"&&mode==="playing"&&Boolean(run)&&Boolean(p1)&&Boolean(world)&&Boolean(host),null,{timeout:20000});
  await page.waitForFunction(()=>window.drawPlayer?.__ccgV141R48CharacterAnimation===true&&window.enemyScreen?.__ccgV141R48FrameRateIndependent===true,null,{timeout:10000});

  const players=await page.evaluate(()=>{
    const api=window.CCGLostSizzlerV141R48CharacterAnimation,before=api.state.safePlayerDraws;
    if(typeof render==="function")render();
    const clone=value=>JSON.parse(JSON.stringify(value));
    const p2=clone(p1);p2.id="r48-p2";p2.name="R48 P2";
    const remote=clone(p1);remote.id="r48-remote";remote.name="R48 REMOTE";
    drawPlayer(p1,"p1");drawPlayer(p2,"p2");drawPlayer(remote,"remote");
    const last=api.state.lastPlayerDraw,check=api.verifyPaddedAtlas(),source=api.verifySourceFrameMargins();
    return{delta:api.state.safePlayerDraws-before,last,check,source,playerDraws:api.state.playerDraws}
  });
  assert.ok(players.delta>=3,"P1, P2 and remote player rendering must all pass through the padded-cell safety path");
  assert.equal(players.source.ok,true,"live player drawing must continue to use source poses with untouched transparent margins");
  assert.equal(players.check.ok,true,"runtime player drawing must not contaminate any neighbouring frame gutter");
  assert.ok(players.last.sourceX%36===0&&players.last.sourceY%36===0,"player source sampling must start exactly on padded-cell boundaries");
  assert.equal(players.last.sourceW,36,"player source sampling must include one whole padded cell and nothing from its neighbour");
  assert.equal(players.last.sourceH,36,"player source sampling must include one whole padded row cell and nothing from its neighbour");
  assert.ok(players.last.sourceX>=0&&players.last.sourceX+players.last.sourceW<=216,"player frame source must remain inside the padded atlas width");
  assert.ok(players.last.sourceY>=0&&players.last.sourceY+players.last.sourceH<=144,"player frame source must remain inside the padded atlas height");
  assert.ok(players.playerDraws>=3,"player animation diagnostics must observe all canonical player variants");

  const enemyFamilies=await page.evaluate(()=>{
    const kinds=["spider","skeleton","knight","scout","hunter","ambusher","guard","charger","ranger","root","cook","firebreather","ghost","treasure","guardian"];
    const failures=[];ctx.save();
    try{
      for(const [index,kind] of kinds.entries()){
        try{drawPixelEnemySprite({id:`r48-${kind}`,kind,alive:true,aiState:"chase",facing:{x:1,y:0},armor:kind==="guardian"?2:0,flash:0,guardian:kind==="guardian"},80+(index%5)*70,80+Math.floor(index/5)*70)}catch(error){failures.push(`${kind}: ${error?.message||error}`)}
      }
      try{drawPixelEnemySprite({id:"r48-death-stalker",kind:"guardian",alive:true,aiState:"chase",facing:{x:1,y:0},armor:0,flash:0,deathStalker:true,voidStalker:true},500,250)}catch(error){failures.push(`death-stalker: ${error?.message||error}`)}
    }finally{ctx.restore()}
    const api=window.CCGLostSizzlerV141R48CharacterAnimation,enemy=(host.enemies||[]).find(row=>row?.alive);let screenA=null,screenB=null,before=api.state.enemyScreenSamples;
    if(enemy){screenA=enemyScreen(enemy);screenB=enemyScreen(enemy)}
    return{failures,kinds:kinds.length,hasEnemy:Boolean(enemy),screenA,screenB,samples:api.state.enemyScreenSamples-before,lastError:api.state.lastError}
  });
  assert.deepEqual(enemyFamilies.failures,[],`every standard procedural enemy family must render without animation errors: ${enemyFamilies.failures.join("; ")}`);
  assert.equal(enemyFamilies.kinds,15,"browser audit must exercise every standard procedural enemy family");
  if(enemyFamilies.hasEnemy){
    assert.ok(Number.isFinite(enemyFamilies.screenA?.x)&&Number.isFinite(enemyFamilies.screenA?.y),"frame-rate-independent enemy interpolation must return finite screen coordinates");
    assert.ok(Number.isFinite(enemyFamilies.screenB?.x)&&Number.isFinite(enemyFamilies.screenB?.y),"subsequent enemy interpolation must remain finite");
    assert.ok(enemyFamilies.samples>=2,"real enemy rendering must pass through the r48 interpolation owner");
  }
  assert.equal(enemyFamilies.lastError,"",`animation layer must not record runtime errors: ${enemyFamilies.lastError}`);

  await page.waitForTimeout(250);
  assert.deepEqual(errors,[],`r48 character animation regression must not produce page errors: ${errors.join("\n")}`);
  console.log("V10.41 r48 player source-margin, frame-gutter, expanded cadence and procedural-enemy smoothing browser regression passed.");
}finally{
  await browser.close();
  for(const socket of sockets)socket.destroy();
  await new Promise(resolve=>server.close(resolve));
}
