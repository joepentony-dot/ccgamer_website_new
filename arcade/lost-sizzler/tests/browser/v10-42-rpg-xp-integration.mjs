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
    const dossier=document.getElementById("named-dossier-panel");
    if(mode==="dossier"&&dossier&&!dossier.classList.contains("hidden")&&typeof hideNamedDossier==="function")hideNamedDossier();
    const save=document.getElementById("save-panel");
    if(mode==="saveprompt"&&save&&!save.classList.contains("hidden")&&typeof closeSavePrompt==="function")closeSavePrompt();
  });
  await page.waitForTimeout(180);
  await page.evaluate(()=>{
    const dossier=document.getElementById("named-dossier-panel");
    if(mode==="dossier"&&dossier&&!dossier.classList.contains("hidden")&&typeof hideNamedDossier==="function")hideNamedDossier();
    const save=document.getElementById("save-panel");
    if(mode==="saveprompt"&&save&&!save.classList.contains("hidden")&&typeof closeSavePrompt==="function")closeSavePrompt();
  });
  await page.waitForFunction(()=>mode==="playing"&&document.body.dataset.runActive==="true"&&window.CCGLostSizzlerModeRuntime?.detect?.()==="dungeon-solo",null,{timeout:10000});
}

try{
  const context=await browser.newContext({viewport:{width:1600,height:900}});
  await context.addInitScript(()=>{try{localStorage.setItem("ccg-lost-sizzler-tutorial-seen-v1","true")}catch(_){}});
  const page=await context.newPage();
  page.setDefaultTimeout(45000);
  const errors=[],failedScripts=[];
  page.on("pageerror",error=>errors.push(String(error?.stack||error)));
  page.on("requestfailed",request=>{try{const url=new URL(request.url());if(url.origin===origin&&/\.js(?:\?|$)/i.test(url.pathname))failedScripts.push(`${url.pathname}: ${request.failure()?.errorText||"failed"}`)}catch(_){}});

  await page.goto(`${origin}/arcade/lost-sizzler/?v142-rpg-xp-integration=1`,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.body.dataset.releaseReady==="true"&&Boolean(window.CCGLostSizzlerV142ProceduralOverhaul)&&Boolean(window.CCGLostSizzlerV142FiveDepthCampaign)&&Boolean(window.CCGLostSizzlerXPSourceContract)&&Boolean(window.CCGLostSizzlerModeRuntime)&&Boolean(document.getElementById("solo-btn")),null,{timeout:90000});
  await page.evaluate(()=>{try{window.CCGProgression?.clearCheckpoint?.()}catch(_){}});
  await page.click("#solo-btn");
  await page.waitForFunction(()=>document.body.dataset.runActive==="true"&&mode==="playing"&&playMode==="solo"&&Boolean(run)&&Boolean(host)&&Boolean(p1)&&window.CCGLostSizzlerModeRuntime?.detect?.()==="dungeon-solo",null,{timeout:20000});

  const reset=await page.evaluate(()=>{
    p1.level=1;p1.xp=0;p1.totalXp=0;p1.pendingLevels=0;p1.skills=[];
    p1.rpgStats={might:5,vitality:5,agility:5,endurance:5,luck:5,arcana:5};
    p1.banishmentVessel=true;p1.banishmentEssence=0;p1.banishmentEssenceCost=3;
    p1.moveMultiplier=1;p1.damageBonus=0;p1.armor=0;
    run.floorXP=0;run.everEarnedXp=false;run.xpPeak=0;
    return{floor:run.floor,cap:window.CCGProgression.floorLevelCap(run),level:p1.level,rpg:{...p1.rpgStats}};
  });
  assert.equal(reset.floor,1,"RPG XP integration qualification must begin on Floor 1.");
  assert.equal(reset.cap,5,"Floor 1 must retain the established Level 5 cap.");
  assert.deepEqual(reset.rpg,{might:5,vitality:5,agility:5,endurance:5,luck:5,arcana:5},"Qualification must start from the six-stat RPG baseline.");

  const blocked=await page.evaluate(()=>{
    const before={xp:p1.xp,total:p1.totalXp,floor:run.floorXP,level:p1.level,pending:p1.pendingLevels};
    awardXP(p1,10,"Hidden wall opened");
    awardXP(p1,10,"Bronze door unlocked");
    return{before,after:{xp:p1.xp,total:p1.totalXp,floor:run.floorXP,level:p1.level,pending:p1.pendingLevels}};
  });
  assert.deepEqual(blocked.after,blocked.before,"Door interactions must remain unable to advance RPG progression.");

  const nearLevel=await page.evaluate(()=>{
    awardXP(p1,1424,"Enemy defeated");
    return{level:p1.level,xp:p1.xp,total:p1.totalXp,floor:run.floorXP,pending:p1.pendingLevels,mode};
  });
  assert.equal(nearLevel.level,1,"1,424 XP must remain one point below the first level threshold.");
  assert.equal(nearLevel.xp,1424,"Combat XP must accumulate toward the live level threshold.");
  assert.equal(nearLevel.total,1424,"Total XP must record the sanctioned combat XP below the threshold.");
  assert.equal(nearLevel.floor,1424,"Floor XP must record the sanctioned combat XP below the threshold.");
  assert.equal(nearLevel.pending,0,"No RPG choice may be queued before the threshold is crossed.");
  assert.equal(nearLevel.mode,"playing","Sub-threshold XP must not interrupt play with a level-up panel.");

  const crossed=await page.evaluate(()=>{
    const before={maxHealth:p1.maxHealth,maxMana:p1.maxMana,armor:p1.armor,moveMultiplier:p1.moveMultiplier,damageBonus:p1.damageBonus,essenceCost:p1.banishmentEssenceCost};
    awardXP(p1,1,"Enemy defeated");
    return{before,level:p1.level,xp:p1.xp,total:p1.totalXp,floor:run.floorXP,pending:p1.pendingLevels,mode};
  });
  assert.equal(crossed.level,2,"Player must reach Level 2 from sanctioned combat XP.");
  assert.equal(crossed.xp,0,"The exact first-level threshold must leave zero carry XP.");
  assert.equal(crossed.total,1425,"Total XP must record the full 1,425 sanctioned combat XP.");
  assert.equal(crossed.floor,1425,"Floor XP must record the full 1,425 sanctioned combat XP.");
  assert.equal(crossed.pending,1,"Crossing the threshold must queue one permanent RPG choice.");
  await page.waitForFunction(()=>mode==="levelup"&&!document.getElementById("level-up")?.classList.contains("hidden")&&document.querySelectorAll("#level-up-choices button").length===4);

  const choices=await page.evaluate(()=>[...document.querySelectorAll("#level-up-choices button")].map((button,index)=>({index,text:button.textContent||""})));
  assert.equal(choices.length,4,"V10.42 must offer four RPG attribute choices at level-up.");
  const attributeNames=["MIGHT","VITALITY","AGILITY","ENDURANCE","LUCK","ARCANA"];
  assert.ok(choices.every(choice=>attributeNames.some(name=>choice.text.startsWith(`${name} +1`))),`Every level-up option must be a V10.42 RPG attribute: ${JSON.stringify(choices)}`);
  assert.equal(new Set(choices.map(choice=>attributeNames.find(name=>choice.text.startsWith(`${name} +1`)))).size,4,"The four RPG choices must be distinct attributes.");

  const preferred=["VITALITY","AGILITY","ENDURANCE","ARCANA"];
  const chosenName=preferred.find(name=>choices.some(choice=>choice.text.startsWith(`${name} +1`)));
  assert.ok(chosenName,"At least one choice with an immediately observable build effect must be offered.");
  const chosen=choices.find(choice=>choice.text.startsWith(`${chosenName} +1`));
  await page.locator("#level-up-choices button").nth(chosen.index).click();
  await page.waitForFunction(()=>mode==="playing"&&p1.pendingLevels===0&&document.getElementById("level-up")?.classList.contains("hidden"));

  const built=await page.evaluate(()=>({
    level:p1.level,pending:p1.pendingLevels,skills:[...(p1.skills||[])],rpg:{...p1.rpgStats},
    maxHealth:p1.maxHealth,maxMana:p1.maxMana,armor:p1.armor,moveMultiplier:p1.moveMultiplier,damageBonus:p1.damageBonus,essenceCost:p1.banishmentEssenceCost
  }));
  const chosenId=chosenName.toLowerCase();
  assert.equal(built.rpg[chosenId],6,`${chosenName} must rise from 5 to 6 after choosing its RPG upgrade.`);
  for(const [id,value] of Object.entries(built.rpg))if(id!==chosenId)assert.equal(value,5,`${id} must remain at its baseline when ${chosenName} is selected.`);
  assert.equal(built.level,2,"Applying the RPG choice must retain Level 2.");
  assert.equal(built.pending,0,"Applying the RPG choice must consume the pending level exactly once.");
  assert.ok(built.skills.includes(`v142-stat-${chosenId}`),"The selected RPG attribute must be recorded in the permanent run skill history.");
  if(chosenName==="VITALITY")assert.equal(built.maxHealth,crossed.before.maxHealth+1,"Vitality +1 must add one maximum health.");
  if(chosenName==="AGILITY")assert.ok(Math.abs(built.moveMultiplier-crossed.before.moveMultiplier*.97)<1e-9,"Agility +1 must improve movement handling by the established 3% multiplier.");
  if(chosenName==="ENDURANCE"){
    assert.equal(built.maxMana,crossed.before.maxMana+14,"Endurance +1 must add 14 maximum ammunition.");
    assert.equal(built.armor,Math.min(12,crossed.before.armor+1),"Endurance +1 must add one armour immediately.");
  }
  if(chosenName==="ARCANA")assert.equal(built.essenceCost,Math.max(2,crossed.before.essenceCost-1),"Arcana reaching 6 must improve Banishment alchemy by one Essence.");

  await page.evaluate(()=>floorComplete("V10.42 RPG XP integration qualification"));
  await page.waitForFunction(()=>mode==="floorcomplete"&&!document.getElementById("floor-complete")?.classList.contains("hidden"));
  await page.evaluate(()=>descendFloor());
  await settleFloorEntry(page,2);

  const persisted=await page.evaluate(()=>({
    floor:run.floor,cap:window.CCGProgression.floorLevelCap(run),level:p1.level,xp:p1.xp,total:p1.totalXp,pending:p1.pendingLevels,
    skills:[...(p1.skills||[])],rpg:{...p1.rpgStats},controller:window.CCGLostSizzlerModeRuntime?.detect?.()||"",runActive:document.body.dataset.runActive
  }));
  assert.equal(persisted.floor,2,"The qualification descent must enter Iron Keep / Floor 2.");
  assert.equal(persisted.cap,10,"Descending to Floor 2 must raise the established level cap from 5 to 10.");
  assert.equal(persisted.level,2,"The combat-earned level must survive a real floor transition.");
  assert.equal(persisted.pending,0,"The consumed RPG choice must not reappear after descent.");
  assert.equal(persisted.rpg[chosenId],6,"The selected RPG build attribute must survive a real floor transition.");
  for(const [id,value] of Object.entries(persisted.rpg))if(id!==chosenId)assert.equal(value,5,`${id} must remain unchanged after the transition.`);
  assert.ok(persisted.skills.includes(`v142-stat-${chosenId}`),"The chosen RPG upgrade history must survive the floor transition.");
  assert.equal(persisted.controller,"dungeon-solo","RPG progression must remain under the Solo Dungeon controller after descent.");
  assert.equal(persisted.runActive,"true","The run must remain active after the RPG build transition qualification.");
  assert.deepEqual(errors,[],`RPG XP integration qualification must not raise page errors: ${errors.join("\n")}`);
  assert.deepEqual(failedScripts,[],`RPG XP integration qualification must not lose same-origin scripts: ${failedScripts.join("\n")}`);

  await page.evaluate(()=>{try{window.CCGProgression?.clearCheckpoint?.()}catch(_){}});
  console.log(`Combat XP → Level 2 → ${chosenName} RPG build → Floor 2 persistence qualification passed.`);
  await context.close();
}finally{
  await browser.close();
  for(const socket of sockets)socket.destroy();
  await new Promise(resolve=>server.close(()=>resolve()));
}
