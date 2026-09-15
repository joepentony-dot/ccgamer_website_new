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

try{
  const context=await browser.newContext({viewport:{width:1600,height:900}}),page=await context.newPage();
  page.setDefaultTimeout(45000);
  const errors=[],failedScripts=[];
  page.on("pageerror",error=>errors.push(String(error?.stack||error)));
  page.on("requestfailed",request=>{try{const url=new URL(request.url());if(url.origin===origin&&/\.js(?:\?|$)/i.test(url.pathname))failedScripts.push(`${url.pathname}: ${request.failure()?.errorText||"failed"}`)}catch(_){}});

  await page.goto(`${origin}/arcade/lost-sizzler/?v142-rpg-checkpoint-persistence=1`,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.body.dataset.releaseReady==="true"&&Boolean(window.CCGLostSizzlerV142ProceduralOverhaul)&&Boolean(window.CCGProgression)&&Boolean(document.getElementById("solo-btn")),null,{timeout:90000});
  await page.evaluate(()=>{try{window.CCGProgression.clearCheckpoint()}catch(_){}});
  await page.click("#solo-btn");
  await page.waitForFunction(()=>document.body.dataset.runActive==="true"&&mode==="playing"&&playMode==="solo"&&Boolean(run)&&Boolean(p1),null,{timeout:20000});

  const saved=await page.evaluate(()=>{
    p1.level=5;
    p1.xp=321;
    p1.totalXp=9876;
    p1.pendingLevels=4;
    p1.skills=[];
    p1.rpgStats={might:5,vitality:5,agility:5,endurance:5,luck:5,arcana:5};
    p1.maxHealth=10;
    p1.health=10;
    p1.maxMana=100;
    p1.mana=100;
    p1.armor=1;
    p1.moveMultiplier=1;
    p1.damageBonus=0;
    p1.banishmentVessel=true;
    p1.banishmentEssence=4;
    p1.banishmentEssenceCost=3;
    p1.relics=[];

    for(const id of ["v142-stat-vitality","v142-stat-agility","v142-stat-endurance","v142-stat-arcana"]){
      const result=window.CCGProgression.applySkill(p1,id);
      if(!result)throw new Error(`Failed to apply ${id}`);
    }

    p1.relics=["archive-plate","cartographer-chip"];
    p1.v142SightBonus=1;
    p1.v142WardCooldownMs=24600;
    p1.v142BloodCartridge=true;
    p1.v142BloodHealAt=27;
    run.floor=2;
    run.floorXP=4321;
    run.bankedXP=222;

    const snapshot={
      level:p1.level,xp:p1.xp,totalXp:p1.totalXp,pendingLevels:p1.pendingLevels,
      skills:[...p1.skills],rpgStats:{...p1.rpgStats},maxHealth:p1.maxHealth,health:p1.health,
      maxMana:p1.maxMana,mana:p1.mana,armor:p1.armor,moveMultiplier:p1.moveMultiplier,
      damageBonus:p1.damageBonus,banishmentVessel:p1.banishmentVessel,
      banishmentEssence:p1.banishmentEssence,banishmentEssenceCost:p1.banishmentEssenceCost,
      relics:[...p1.relics],v142SightBonus:p1.v142SightBonus,v142WardCooldownMs:p1.v142WardCooldownMs,
      v142BloodCartridge:p1.v142BloodCartridge,v142BloodHealAt:p1.v142BloodHealAt
    };
    const checkpoint=window.CCGProgression.makeCheckpoint(run,p1,typeof p2!=="undefined"?p2:null,typeof score!=="undefined"?score:0,playMode);
    if(!window.CCGProgression.saveCheckpointData(checkpoint))throw new Error("Checkpoint save failed");
    const persisted=window.CCGProgression.loadCheckpoint();
    if(!persisted)throw new Error("Checkpoint could not be read back immediately after save");
    return{snapshot,run:{floor:run.floor,floorXP:run.floorXP,bankedXP:run.bankedXP},savedAt:persisted.savedAt};
  });

  assert.deepEqual(saved.snapshot.rpgStats,{might:5,vitality:6,agility:6,endurance:6,luck:5,arcana:6},"The qualification setup must create the expected four-stat V10.42 build.");
  assert.deepEqual(saved.snapshot.skills,["v142-stat-vitality","v142-stat-agility","v142-stat-endurance","v142-stat-arcana"],"The permanent RPG history must contain each applied V10.42 choice exactly once.");
  assert.equal(saved.snapshot.maxHealth,11,"Vitality must have its derived maximum-health effect before save.");
  assert.ok(Math.abs(saved.snapshot.moveMultiplier-.97)<1e-9,"Agility must have its derived movement effect before save.");
  assert.equal(saved.snapshot.maxMana,114,"Endurance must have its derived ammunition effect before save.");
  assert.equal(saved.snapshot.armor,2,"Endurance must have its derived armour effect before save.");
  assert.equal(saved.snapshot.banishmentEssenceCost,2,"Arcana 6 must have its derived Banishment cost effect before save.");

  await page.reload({waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.body.dataset.releaseReady==="true"&&Boolean(window.CCGLostSizzlerV142ProceduralOverhaul)&&Boolean(window.CCGProgression),null,{timeout:90000});

  const loaded=await page.evaluate(()=>{
    const checkpoint=window.CCGProgression.loadCheckpoint();
    if(!checkpoint)throw new Error("Checkpoint did not survive page reload");
    const player=checkpoint.player;
    return{
      version:checkpoint.version,playMode:checkpoint.playMode,savedAt:checkpoint.savedAt,
      run:{floor:checkpoint.run?.floor,floorXP:checkpoint.run?.floorXP,bankedXP:checkpoint.run?.bankedXP},
      player:{
        level:player?.level,xp:player?.xp,totalXp:player?.totalXp,pendingLevels:player?.pendingLevels,
        skills:[...(player?.skills||[])],rpgStats:{...(player?.rpgStats||{})},maxHealth:player?.maxHealth,health:player?.health,
        maxMana:player?.maxMana,mana:player?.mana,armor:player?.armor,moveMultiplier:player?.moveMultiplier,
        damageBonus:player?.damageBonus,banishmentVessel:player?.banishmentVessel,
        banishmentEssence:player?.banishmentEssence,banishmentEssenceCost:player?.banishmentEssenceCost,
        relics:[...(player?.relics||[])],v142SightBonus:player?.v142SightBonus,v142WardCooldownMs:player?.v142WardCooldownMs,
        v142BloodCartridge:player?.v142BloodCartridge,v142BloodHealAt:player?.v142BloodHealAt
      }
    };
  });

  assert.equal(loaded.version,"V10.3","V10.42 RPG persistence must remain compatible with the established checkpoint format.");
  assert.equal(loaded.playMode,"solo","The saved dungeon mode must survive the checkpoint round-trip.");
  assert.equal(loaded.savedAt,saved.savedAt,"The reload must read the exact checkpoint that was persisted before navigation.");
  assert.deepEqual(loaded.run,saved.run,"Floor and XP run state must survive alongside the RPG build.");
  assert.deepEqual(loaded.player,saved.snapshot,"All six-stat RPG state, derived effects, relic state and V10.42 persistent fields must survive a real storage/page-reload round-trip.");
  assert.deepEqual(errors,[],`RPG checkpoint persistence qualification must not raise page errors: ${errors.join("\n")}`);
  assert.deepEqual(failedScripts,[],`RPG checkpoint persistence qualification must not lose same-origin scripts: ${failedScripts.join("\n")}`);

  await page.evaluate(()=>{try{window.CCGProgression.clearCheckpoint()}catch(_){}});
  console.log("V10.42 six-stat RPG checkpoint persistence qualification passed.");
  await context.close();
}finally{
  await browser.close();
  for(const socket of sockets)socket.destroy();
  await new Promise(resolve=>server.close(()=>resolve()));
}
