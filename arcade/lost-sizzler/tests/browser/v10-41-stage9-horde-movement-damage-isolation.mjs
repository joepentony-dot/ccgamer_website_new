import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {chromium} from "playwright";

const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,"../../../..");
const r56Source=fs.readFileSync(path.join(repo,"arcade/lost-sizzler/js/v10-41-r56-playtest-completion.js"),"utf8");
const r59Source=fs.readFileSync(path.join(repo,"arcade/lost-sizzler/js/v10-41-r59-live-regression-fixes.js"),"utf8");
assert.match(r56Source,/SPECIAL_BLOCK=new Set\(\["horde-survivor","sizzler-saboteurs"\]\)/,"R56 dungeon recovery must explicitly exclude Horde and Spy special modes");
assert.match(r59Source,/activeId==="dungeon-solo"/,"R59 Solo substeps must remain gated to the Dungeon Solo controller");
const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".mjs":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json; charset=utf-8",".svg":"image/svg+xml",".webp":"image/webp",".png":"image/png",".ogg":"audio/ogg",".mp3":"audio/mpeg"};
const sockets=new Set();
const server=http.createServer((req,res)=>{try{const pathname=decodeURIComponent(new URL(req.url,"http://local").pathname),relative=pathname.endsWith("/")?`${pathname}index.html`:pathname,file=path.resolve(repo,`.${relative}`);if(!file.startsWith(`${repo}${path.sep}`)&&file!==repo){res.writeHead(403).end("forbidden");return}fs.readFile(file,(error,data)=>{if(error){res.writeHead(404,{connection:"close"}).end("not found");return}res.writeHead(200,{"content-type":mime[path.extname(file).toLowerCase()]||"application/octet-stream","cache-control":"no-store",connection:"close"});res.end(data)})}catch(error){res.writeHead(500,{connection:"close"}).end(String(error))}});
server.on("connection",socket=>{sockets.add(socket);socket.on("close",()=>sockets.delete(socket))});
await new Promise((resolve,reject)=>{server.once("error",reject);server.listen(0,"127.0.0.1",resolve)});
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,args:["--disable-dev-shm-usage","--disable-background-networking","--autoplay-policy=no-user-gesture-required"]});

try{
  const context=await browser.newContext({viewport:{width:1600,height:900}}),page=await context.newPage();page.setDefaultTimeout(45000);
  const errors=[];page.on("pageerror",error=>errors.push(String(error?.stack||error)));
  await page.goto(`${origin}/arcade/lost-sizzler/`,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.body.dataset.releaseReady==="true"&&Boolean(window.CCGLostSizzlerV141R56PlaytestCompletion)&&Boolean(window.CCGLostSizzlerV141R59LiveRegressionFixes)&&Boolean(window.CCGLostSizzlerV141R60HordeCombatIntegrity?.state?.installed)&&Boolean(window.CCGLostSizzlerV141R60LivePlayIntegrity)&&Boolean(document.getElementById("horde-solo-btn")),null,{timeout:90000});
  await page.click("#horde-solo-btn");
  await page.waitForFunction(()=>mode==="playing"&&document.body.dataset.specialMode==="horde-survivor"&&document.body.dataset.hordeSolo==="true"&&window.CCGLostSizzlerModeRuntime?.snapshot?.().activeId==="horde-solo"&&Boolean(p1)&&Boolean(world)&&Boolean(host),null,{timeout:30000});
  await page.waitForFunction(()=>Boolean(window.CCGLostSizzlerV141R60HordeOwnerComposition?.state?.retired)&&Number(window.CCGLostSizzlerV141R60HordeOwnerComposition?.state?.timer||0)===0);
  await page.waitForTimeout(600);

  const result=await page.evaluate(async()=>{
    const r56=window.CCGLostSizzlerV141R56PlaytestCompletion,r59=window.CCGLostSizzlerV141R59LiveRegressionFixes,r60=window.CCGLostSizzlerV141R60HordeCombatIntegrity,r60Solo=window.CCGLostSizzlerV141R60LivePlayIntegrity;
    const snapshot=()=>({
      r56:{trapHits:Number(r56.state.trapHits||0),environmentHits:Number(r56.state.environmentHits||0),combatRearms:Number(r56.state.combatRearms||0),cooldownRepairs:Number(r56.state.cooldownRepairs||0),bufferRepairs:Number(r56.state.bufferRepairs||0),stunRepairs:Number(r56.state.stunRepairs||0),attackIntentRepairs:Number(r56.state.attackIntentRepairs||0)},
      r59:{acceptedFrames:Number(r59.state.acceptedFrames||0),soloFrames:Number(r59.state.soloFrames||0),soloSubsteps:Number(r59.state.soloSubsteps||0),soloCatchupFrames:Number(r59.state.soloCatchupFrames||0),soloDiscardedVisibleMs:Number(r59.state.soloDiscardedVisibleMs||0)},
      r60Solo:{smoothingFrames:Number(r60Solo.state.smoothingFrames||0),movementBlocks:Number(r60Solo.state.movementBlocks||0),environmentRepairs:Number(r60Solo.state.environmentRepairs||0),ownerReassertions:Number(r60Solo.state.ownerReassertions||0)},
      r60:{frames:Number(r60.state.frames||0),liveElapsedFrames:Number(r60.state.liveElapsedFrames||0),projectileSteps:Number(r60.state.projectileSteps||0),enemySteps:Number(r60.state.enemySteps||0),liveOwnerInstalls:Number(r60.state.liveOwnerInstalls||0),liveOwnerReassertions:Number(r60.state.liveOwnerReassertions||0),lastError:String(r60.state.lastError||"")}
    });
    const before=snapshot();
    const blocking=host.blockingDecor||[],traps=host.traps||[],enemies=host.enemies||[];
    const occupied=(rows,x,y)=>rows.some(row=>Number(row?.x)===Number(x)&&Number(row?.y)===Number(y));
    const open=(x,y)=>world?.map?.[y]?.[x]===0&&!occupied(blocking,x,y)&&!occupied(traps,x,y)&&!occupied(enemies,x,y);
    const dirs=[{dx:1,dy:0},{dx:-1,dy:0},{dx:0,dy:1},{dx:0,dy:-1}],dir=dirs.find(row=>open(Number(p1.x)+row.dx,Number(p1.y)+row.dy));
    if(!dir)throw new Error("Stage 9 Horde isolation fixture requires one adjacent open movement tile");
    const start={x:Number(p1.x),y:Number(p1.y)};move1=0;p1.hitStunMs=0;p1.controlLocked=false;p1.controlsLocked=false;
    const movementResult=movePlayer(p1,dir.dx,dir.dy);
    const moved={result:movementResult,x:Number(p1.x),y:Number(p1.y),dx:dir.dx,dy:dir.dy};

    const runState=window.CCGLostSizzlerSpecialModes?.active?.state,model=runState?.players?.find?.(row=>String(row.id)===String(p1.id||net?.sessionId))||runState?.players?.[0];
    p1.maxHealth=Math.max(1000,Number(p1.maxHealth)||0);p1.health=1000;p1.armor=0;p1.invuln=0;p1.hitStunMs=0;
    if(model){model.maxHp=Math.max(1000,Number(model.maxHp)||0);model.hp=1000;model.status="active";model.invulnerableUntil=0}
    const durabilityBefore=Number(p1.health||0)+Number(p1.armor||0);
    hurtPlayer(p1,1,false,"horde enemy");
    const durabilityAfter=Number(p1.health||0)+Number(p1.armor||0);
    await new Promise(resolve=>setTimeout(resolve,900));
    return{before,after:snapshot(),start,moved,durabilityBefore,durabilityAfter,activeId:window.CCGLostSizzlerModeRuntime?.snapshot?.().activeId||"",specialMode:document.body.dataset.specialMode||"",mode:String(mode||"")};
  });

  assert.equal(result.activeId,"horde-solo","movement/damage isolation must remain under the Horde Solo controller");
  assert.equal(result.specialMode,"horde-survivor","movement/damage isolation must remain inside Horde special mode");
  assert.equal(result.mode,"playing","movement/damage isolation must finish in active Horde play");
  assert.ok(result.moved.x!==result.start.x||result.moved.y!==result.start.y,`shared player movement must still function in Horde without adopting Solo-only repair ownership: ${JSON.stringify({start:result.start,moved:result.moved})}`);
  assert.ok(result.durabilityAfter<result.durabilityBefore,`ordinary Horde damage must still reach the player while R56 dungeon environmental ownership is bypassed: ${JSON.stringify({before:result.durabilityBefore,after:result.durabilityAfter})}`);

  for(const key of Object.keys(result.before.r56))assert.equal(result.after.r56[key],result.before.r56[key],`R56 Solo/dungeon counter ${key} must stay dormant during live Horde movement and damage`);
  for(const key of ["soloFrames","soloSubsteps","soloCatchupFrames","soloDiscardedVisibleMs"])assert.equal(result.after.r59[key],result.before.r59[key],`R59 Solo counter ${key} must stay dormant while Horde owns gameplay`);
  assert.ok(result.after.r59.acceptedFrames>result.before.r59.acceptedFrames,"the shared R59 RAF may continue accepting rendered frames while its Solo substep service remains dormant");
  for(const key of ["smoothingFrames","movementBlocks","environmentRepairs","ownerReassertions"])assert.equal(result.after.r60Solo[key],result.before.r60Solo[key],`R60 Solo live-play counter ${key} must stay dormant during Horde`);
  assert.ok(result.after.r60.frames>result.before.r60.frames,"R60 Horde combat frames must advance while Solo services remain dormant");
  assert.ok(result.after.r60.liveElapsedFrames>result.before.r60.liveElapsedFrames,"R60 Horde live elapsed service must advance while Solo services remain dormant");
  assert.ok(result.after.r60.projectileSteps>result.before.r60.projectileSteps,"R60 Horde projectile cadence must advance");
  assert.ok(result.after.r60.enemySteps>result.before.r60.enemySteps,"R60 Horde enemy cadence must advance");
  assert.equal(result.after.r60.liveOwnerInstalls,result.before.r60.liveOwnerInstalls,"live Horde movement/damage must not install another R60 Horde owner");
  assert.equal(result.after.r60.liveOwnerReassertions,result.before.r60.liveOwnerReassertions,"live Horde movement/damage must not reassert the R60 Horde owner");
  assert.equal(result.after.r60.lastError,"","R60 Horde movement/damage qualification must record no timing/combat error");
  assert.deepEqual(errors,[],`Stage 9 Horde movement/damage isolation must have no uncaught browser errors: ${errors.join("\n")}`);
  console.log("Lost Sizzler Stage 9 Horde movement/damage isolation from R56, R59 Solo substeps and R60 Solo live-play ownership passed in Chromium.");
  await context.close();
}finally{await browser.close();for(const socket of sockets)socket.destroy();await new Promise(resolve=>server.close(()=>resolve()))}
