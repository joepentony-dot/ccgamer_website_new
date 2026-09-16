import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {chromium} from "playwright";

const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,"../../../..");
const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".mjs":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json; charset=utf-8",".svg":"image/svg+xml",".png":"image/png",".webp":"image/webp",".wav":"audio/wav",".mp3":"audio/mpeg",".ogg":"audio/ogg"};
const sockets=new Set();
const server=http.createServer((req,res)=>{
  try{
    const url=new URL(req.url,"http://local"),pathname=decodeURIComponent(url.pathname),relative=pathname.endsWith("/")?`${pathname}index.html`:pathname,file=path.resolve(repo,`.${relative}`);
    if(!file.startsWith(`${repo}${path.sep}`)&&file!==repo){res.writeHead(403).end("forbidden");return}
    fs.readFile(file,(error,data)=>{if(error){res.writeHead(404,{connection:"close"}).end("not found");return}res.writeHead(200,{"content-type":mime[path.extname(file).toLowerCase()]||"application/octet-stream","cache-control":"no-store",connection:"close"});res.end(data)});
  }catch(error){res.writeHead(500,{connection:"close"}).end(String(error))}
});
server.on("connection",socket=>{sockets.add(socket);socket.on("close",()=>sockets.delete(socket))});
await new Promise((resolve,reject)=>{server.once("error",reject);server.listen(0,"127.0.0.1",resolve)});
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,args:["--disable-dev-shm-usage","--disable-background-networking","--autoplay-policy=no-user-gesture-required"]});

async function settlePlayable(page,floor){
  await page.waitForFunction(expected=>Number(run?.floor||0)===expected&&Boolean(world)&&Boolean(host)&&Boolean(p1),floor,{timeout:15000});
  for(let attempt=0;attempt<3;attempt++){
    await page.waitForTimeout(220);
    await page.evaluate(()=>{
      const dossier=document.getElementById("named-dossier-panel");
      if(mode==="dossier"&&dossier&&!dossier.classList.contains("hidden")&&typeof hideNamedDossier==="function")hideNamedDossier();
      const save=document.getElementById("save-panel");
      if(mode==="saveprompt"&&save&&!save.classList.contains("hidden")&&typeof closeSavePrompt==="function")closeSavePrompt();
    });
  }
  await page.waitForFunction(()=>mode==="playing"&&document.body.dataset.runActive==="true"&&window.CCGLostSizzlerModeRuntime?.detect?.()==="dungeon-solo",null,{timeout:10000});
}

async function enterOpenExit(page){
  const route=await page.evaluate(()=>{
    const candidates=[[1,0],[-1,0],[0,1],[0,-1]];
    const step=candidates.find(([dx,dy])=>window.CCGWorld.walkable(world.map,world.exit.x-dx,world.exit.y-dy,host));
    if(!step)return{moved:false,exitOpen:false};
    const [dx,dy]=step,exitOpen=Boolean(host.exitOpen);
    p1.x=world.exit.x-dx;p1.y=world.exit.y-dy;p1.rx=p1.x;p1.ry=p1.y;
    movePlayer(p1,dx,dy);
    return{moved:p1.x===world.exit.x&&p1.y===world.exit.y,exitOpen};
  });
  assert.equal(route.exitOpen,true,"The completed floor must authorize the live exit before entry.");
  assert.equal(route.moved,true,"The player must enter the real exit tile through movePlayer().");
  await page.waitForFunction(()=>mode==="floorcomplete"&&run?.floorComplete===true&&!document.getElementById("floor-complete")?.classList.contains("hidden"));
}

async function clickDescendAndSettle(page,nextFloor){
  const button=page.locator("#descend-btn");
  await button.waitFor({state:"visible"});
  assert.equal(await button.isEnabled(),true,"Descend Deeper must be an enabled interaction owner.");
  await button.click();
  await settlePlayable(page,nextFloor);
}

try{
  const context=await browser.newContext({viewport:{width:1600,height:900}}),page=await context.newPage();
  page.setDefaultTimeout(45000);
  const errors=[],failedScripts=[];
  page.on("pageerror",error=>errors.push(String(error?.stack||error)));
  page.on("requestfailed",request=>{try{const url=new URL(request.url());if(url.origin===origin&&/\.js(?:\?|$)/i.test(url.pathname))failedScripts.push(`${url.pathname}: ${request.failure()?.errorText||"failed"}`)}catch(_){}});

  await page.goto(`${origin}/arcade/lost-sizzler/?defect3-floor-exit=1`,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.body.dataset.releaseReady==="true"&&Boolean(window.CCGLostSizzlerV142FiveDepthCampaign)&&Boolean(window.CCGLostSizzlerModeRuntime)&&Boolean(document.getElementById("solo-btn")),null,{timeout:90000});
  await page.evaluate(()=>{try{window.CCGProgression?.clearCheckpoint?.();localStorage.removeItem("ccg-quest-collection")}catch(_){}});
  await page.click("#solo-btn");
  await settlePlayable(page,1);

  const seeded=await page.evaluate(()=>{
    p1.rpgStats={might:8,vitality:7,agility:6,endurance:9,luck:7,arcana:8};
    p1.relics=["threshold-compass"];
    p1.banishmentVessel=true;p1.banishmentEssence=4;p1.banishmentEssenceCost=3;
    run.v142Campaign=true;run.v142ClaimedDomains=[];run.floorGames=["Archon"];
    world.__defect3World="floor-1";host.__defect3Host="floor-1";
    bullets.push({id:"defect3-old-player-shot",x:p1.x,y:p1.y,vx:0,vy:0,life:9999,power:1,owner:p1.id});
    enemyBullets.push({id:"defect3-old-enemy-shot",x:p1.x,y:p1.y,vx:0,vy:0,life:9999,power:1});
    if(!host.guardian?.alive)throw new Error("Floor 1 guardian is required for the live objective contract");
    const visited=explored.get(p1.id)||new Set();
    for(const room of world.rooms||[])if(!room.optional){const cx=Math.floor(room.x+room.w/2),cy=Math.floor(room.y+room.h/2);visited.add(`${cx},${cy}`)}
    explored.set(p1.id,visited);
    damageEnemy(host.guardian,999,"energy",p1);
    const explorePct=Math.round(window.CCGProgression.roomCompletion(visited,world)*100);
    const opened=window.CCGSystems.updateObjective(host,run,explorePct);
    return{opened:Boolean(opened),objective:Boolean(host.objective?.complete),guardianAlive:Boolean(host.guardian?.alive),explorePct,xp:Number(p1.xp||0),totalXp:Number(p1.totalXp||0),score:Number(score||0)};
  });
  assert.equal(seeded.guardianAlive,false,"The real Floor 1 guardian must be defeated before exit authorization.");
  assert.ok(seeded.explorePct>=70,"The deterministic reproduction must satisfy the real Floor 1 exploration threshold.");
  assert.equal(seeded.objective,true,"A legitimately explored Floor 1 plus the defeated guardian must complete the objective.");
  assert.equal(seeded.opened,true,"Completed Floor 1 must authorize the live stairs.");

  await enterOpenExit(page);
  const completed=await page.evaluate(()=>({floor:Number(run.floor),floorComplete:Boolean(run.floorComplete),xp:Number(p1.xp||0),totalXp:Number(p1.totalXp||0),score:Number(score||0)}));
  assert.equal(completed.floor,1,"Entering the exit must stop at the Floor 1 completion screen before descent.");
  assert.equal(completed.floorComplete,true,"Entering the exit must set the floor-complete latch exactly once.");
  assert.equal(completed.xp,seeded.xp,"The transition itself must award no extra progression XP.");
  assert.equal(completed.totalXp,seeded.totalXp,"The transition itself must not alter lifetime progression XP.");

  await clickDescendAndSettle(page,2);
  const floor2=await page.evaluate(()=>({
    floor:Number(run.floor),deepest:Number(run.deepest),floorComplete:Boolean(run.floorComplete),mode:String(mode),controller:window.CCGLostSizzlerModeRuntime?.detect?.()||"",runActive:document.body.dataset.runActive,
    worldMarker:world.__defect3World||"",hostMarker:host.__defect3Host||"",playerBullets:bullets.length,enemyBullets:enemyBullets.length,
    rpgStats:{...p1.rpgStats},relics:[...(p1.relics||[])],vessel:Boolean(p1.banishmentVessel),essence:Number(p1.banishmentEssence||0),essenceCost:Number(p1.banishmentEssenceCost||0),bankedGames:[...(run.bankedGames||[])],floorGames:[...(run.floorGames||[])]
  }));
  assert.equal(floor2.floor,2,"The real exit + Descend Deeper path must advance Floor 1 to Floor 2 exactly once.");
  assert.equal(floor2.deepest,2,"Deepest-floor tracking must advance with the canonical descent.");
  assert.equal(floor2.floorComplete,false,"Floor 2 must not retain Floor 1's completion latch.");
  assert.equal(floor2.mode,"playing","Floor 2 must resume in normal playing mode.");
  assert.equal(floor2.controller,"dungeon-solo","Solo controller ownership must survive the transition.");
  assert.equal(floor2.runActive,"true","The run must remain active after descent.");
  assert.equal(floor2.worldMarker,"","Floor 2 must own a newly generated world rather than retaining Floor 1's world object.");
  assert.equal(floor2.hostMarker,"","Floor 2 must own a newly generated host state rather than retaining Floor 1's host object.");
  assert.equal(floor2.playerBullets,0,"Player projectiles from Floor 1 must not survive the rebuild.");
  assert.equal(floor2.enemyBullets,0,"Enemy projectiles from Floor 1 must not survive the rebuild.");
  assert.deepEqual(floor2.rpgStats,{might:8,vitality:7,agility:6,endurance:9,luck:7,arcana:8},"RPG attributes must survive the real Floor 1 descent.");
  assert.deepEqual(floor2.relics,["threshold-compass"],"Relics must survive the real Floor 1 descent.");
  assert.equal(floor2.vessel,true,"The Banishment Vessel must survive the real Floor 1 descent.");
  assert.equal(floor2.essence,4,"Banishment Essence must survive the real Floor 1 descent.");
  assert.equal(floor2.essenceCost,3,"Banishment Essence cost must survive the real Floor 1 descent.");
  assert.deepEqual(floor2.bankedGames,["Archon"],"Floor 1 rescued games must be banked before Floor 2.");
  assert.deepEqual(floor2.floorGames,[],"Floor 2 must start with a fresh current-floor rescue buffer.");

  const opened2=await page.evaluate(()=>{
    run.v142ClaimedDomains=Array.isArray(run.v142ClaimedDomains)?run.v142ClaimedDomains:[];
    if(!run.v142ClaimedDomains.includes("iron"))run.v142ClaimedDomains.push("iron");
    run.floorGames=["Bruce Lee"];
    return Boolean(window.CCGSystems.updateObjective(host,run,100));
  });
  assert.equal(opened2,true,"A legitimately satisfied Floor 2 domain objective must authorize its live exit.");
  await enterOpenExit(page);
  await clickDescendAndSettle(page,3);
  const floor3=await page.evaluate(()=>({floor:Number(run.floor),floorComplete:Boolean(run.floorComplete),mode:String(mode),controller:window.CCGLostSizzlerModeRuntime?.detect?.()||"",bankedGames:[...(run.bankedGames||[])],rpgStats:{...p1.rpgStats}}));
  assert.equal(floor3.floor,3,"Repeated real exit progression must advance exactly one additional depth.");
  assert.equal(floor3.floorComplete,false,"Repeated progression must not retain a stale completion latch.");
  assert.equal(floor3.mode,"playing","Repeated progression must return to playable state.");
  assert.equal(floor3.controller,"dungeon-solo","Repeated progression must preserve Solo controller ownership.");
  assert.deepEqual(floor3.bankedGames,["Archon","Bruce Lee"],"Repeated descent must bank each completed floor once.");
  assert.deepEqual(floor3.rpgStats,floor2.rpgStats,"RPG state must survive repeated progression.");
  assert.deepEqual(errors,[],`The live floor-transition path must not raise page errors: ${errors.join("\n")}`);
  assert.deepEqual(failedScripts,[],`The live floor-transition path must not lose canonical scripts: ${failedScripts.join("\n")}`);

  await context.close();
  console.log("C64 Dungeon Carnage real exit -> completion panel -> Descend Deeper -> playable next-floor regression passed.");
}finally{
  await browser.close();
  for(const socket of sockets)socket.destroy();
  await new Promise(resolve=>server.close(resolve));
}
