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

async function settleFloorEntry(page,floor){
  await page.waitForFunction(expected=>Number(run?.floor||0)===expected&&Boolean(host)&&Boolean(p1),floor,{timeout:15000});
  await page.waitForTimeout(420);
  await page.evaluate(()=>{
    const dossier=document.getElementById("named-dossier-panel");if(mode==="dossier"&&dossier&&!dossier.classList.contains("hidden")&&typeof hideNamedDossier==="function")hideNamedDossier();
    const save=document.getElementById("save-panel");if(mode==="saveprompt"&&save&&!save.classList.contains("hidden")&&typeof closeSavePrompt==="function")closeSavePrompt();
  });
  await page.waitForFunction(()=>mode==="playing"&&document.body.dataset.runActive==="true",null,{timeout:10000});
}

try{
  const context=await browser.newContext({viewport:{width:1600,height:900}}),page=await context.newPage();
  page.setDefaultTimeout(45000);
  const errors=[],failedScripts=[];
  page.on("pageerror",error=>errors.push(String(error?.stack||error)));
  page.on("requestfailed",request=>{try{const url=new URL(request.url());if(url.origin===origin&&/\.js(?:\?|$)/i.test(url.pathname))failedScripts.push(`${url.pathname}: ${request.failure()?.errorText||"failed"}`)}catch(_){}});

  await page.goto(`${origin}/arcade/lost-sizzler/?v142-r23-rpg-build=1`,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.body.dataset.releaseReady==="true"&&Boolean(window.CCGLostSizzlerV142R23RpgBuildFocus)&&Boolean(window.CCGLostSizzlerV142R23RpgBuildExpansion)&&Boolean(window.CCGLostSizzlerV142ProceduralOverhaul)&&Boolean(window.CCGLostSizzlerV142FiveDepthCampaign),null,{timeout:90000});
  const bootstrap=await page.evaluate(()=>({build:window.CCGLostSizzlerV142Bootstrap?.build,cache:window.CCGLostSizzlerV142Bootstrap?.cache,loaded:[...(window.CCGLostSizzlerV142Bootstrap?.loaded||[])]}));
  assert.equal(bootstrap.build,"V10.42 r23","Ordered bootstrap must advertise the r23 build.");
  assert.equal(bootstrap.cache,"20260915r23","Ordered bootstrap must use the r23 module cache token.");
  assert.ok(bootstrap.loaded.includes("v10-42-r23-rpg-build-focus.js"),"Ordered bootstrap must retain the qualified r23 RPG build-focus runtime.");
  assert.ok(bootstrap.loaded.includes("v10-42-r23-rpg-build-expansion.js"),"Ordered bootstrap must load the r23 RPG expansion after build focus.");

  await page.evaluate(()=>{try{window.CCGProgression?.clearCheckpoint?.()}catch(_){}});
  await page.click("#solo-btn");
  await page.waitForFunction(()=>document.body.dataset.runActive==="true"&&mode==="playing"&&playMode==="solo"&&Boolean(p1)&&Boolean(run),null,{timeout:20000});

  const built=await page.evaluate(()=>{
    p1.rpgStats={might:5,vitality:9,agility:9,endurance:9,luck:5,arcana:9};
    p1.v142R23BuildMilestones={};p1.maxHealth=8;p1.health=8;p1.maxMana=240;p1.mana=240;p1.armor=0;p1.moveMultiplier=1;p1.dashDamage=0;p1.v142SightBonus=0;p1.v142WardCooldownMs=30000;p1.banishmentEssenceCost=3;
    const results=["vitality","agility","endurance","arcana"].map(id=>window.CCGProgression.applySkill(p1,`v142-stat-${id}`));
    return{results,rpg:{...p1.rpgStats},milestones:{...p1.v142R23BuildMilestones},maxHealth:p1.maxHealth,health:p1.health,maxMana:p1.maxMana,mana:p1.mana,armor:p1.armor,moveMultiplier:p1.moveMultiplier,dashDamage:p1.dashDamage,sight:p1.v142SightBonus,ward:p1.v142WardCooldownMs,cap:window.CCGProgression.floorLevelCap(run)};
  });
  assert.equal(built.cap,5,"r23 must not change the established Floor 1 level cap.");
  assert.deepEqual(built.rpg,{might:5,vitality:10,agility:10,endurance:10,luck:5,arcana:10},"r23 must leave Might/Luck untouched while the four qualified stats reach 10.");
  assert.deepEqual(built.milestones,{vitality:10,agility:10,endurance:10,arcana:10},"All four stat-10 specialisations must record exactly once.");
  assert.equal(built.maxHealth,11);assert.equal(built.health,11);
  assert.equal(built.maxMana,294);assert.equal(built.mana,294);assert.equal(built.armor,3);
  assert.ok(Math.abs(built.moveMultiplier-(.97*.95))<1e-9);assert.equal(built.dashDamage,1);
  assert.equal(built.sight,1);assert.equal(built.ward,18000);
  assert.ok(built.results.every(row=>/SPECIALISATION UNLOCKED/.test(row?.desc||"")),"Each threshold-crossing result must report its specialization unlock.");

  const idempotent=await page.evaluate(()=>{
    window.CCGLostSizzlerV142R23RpgBuildExpansion.reconcile(p1);window.CCGLostSizzlerV142R23RpgBuildExpansion.reconcile(p1);
    return{maxHealth:p1.maxHealth,maxMana:p1.maxMana,armor:p1.armor,moveMultiplier:p1.moveMultiplier,dashDamage:p1.dashDamage,sight:p1.v142SightBonus,ward:p1.v142WardCooldownMs,milestones:{...p1.v142R23BuildMilestones}};
  });
  assert.equal(idempotent.maxHealth,11);assert.equal(idempotent.maxMana,294);assert.equal(idempotent.armor,3);assert.ok(Math.abs(idempotent.moveMultiplier-(.97*.95))<1e-9);assert.equal(idempotent.dashDamage,1);assert.equal(idempotent.sight,1);assert.equal(idempotent.ward,18000);

  await page.evaluate(()=>floorComplete("r23 RPG build qualification"));
  await page.waitForFunction(()=>mode==="floorcomplete"&&!document.getElementById("floor-complete")?.classList.contains("hidden"));
  await page.evaluate(()=>descendFloor());
  await settleFloorEntry(page,2);
  const persisted=await page.evaluate(()=>({floor:run.floor,cap:window.CCGProgression.floorLevelCap(run),rpg:{...p1.rpgStats},milestones:{...p1.v142R23BuildMilestones},maxHealth:p1.maxHealth,maxMana:p1.maxMana,armor:p1.armor,moveMultiplier:p1.moveMultiplier,dashDamage:p1.dashDamage,sight:p1.v142SightBonus,ward:p1.v142WardCooldownMs}));
  assert.equal(persisted.floor,2);assert.equal(persisted.cap,10,"r23 must preserve the established Floor 2 cap.");
  assert.deepEqual(persisted.milestones,{vitality:10,agility:10,endurance:10,arcana:10},"Specialization ownership must survive the real floor transition.");
  assert.equal(persisted.maxHealth,11,"Vitality specialization must not stack on descent.");
  assert.equal(persisted.maxMana,294,"Endurance specialization must not stack on descent.");
  assert.equal(persisted.armor,3);assert.ok(Math.abs(persisted.moveMultiplier-(.97*.95))<1e-9);assert.equal(persisted.dashDamage,1);assert.equal(persisted.sight,1);assert.equal(persisted.ward,18000);
  assert.deepEqual(errors,[],`r23 browser qualification must not raise page errors: ${errors.join("\n")}`);
  assert.deepEqual(failedScripts,[],`r23 browser qualification must not lose same-origin scripts: ${failedScripts.join("\n")}`);

  await page.evaluate(()=>{try{window.CCGProgression?.clearCheckpoint?.()}catch(_){}});
  console.log("V10.42 r23 RPG specialisations + build-focus coexistence → Floor 2 persistence qualification passed.");
  await context.close();
}finally{
  await browser.close();for(const socket of sockets)socket.destroy();await new Promise(resolve=>server.close(()=>resolve()));
}