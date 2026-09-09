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

async function snapshot(page){
  return page.evaluate(()=>({
    floor:Number(run?.floor||0),
    deepest:Number(run?.deepest||0),
    floorName:window.CCGLostSizzlerV142FiveDepthCampaign?.floorConfig(run)?.name||"",
    mode:String(mode||""),
    controller:window.CCGLostSizzlerModeRuntime?.detect?.()||"",
    runActive:document.body.dataset.runActive,
    rpgStats:{...(p1?.rpgStats||{})},
    relics:[...(p1?.relics||[])],
    vessel:Boolean(p1?.banishmentVessel),
    essence:Number(p1?.banishmentEssence||0),
    essenceCost:Number(p1?.banishmentEssenceCost||0),
    sigilReveal:Boolean(p1?.sigilReveal),
    sigilWard:Boolean(p1?.sigilWard),
    sigilBind:Boolean(p1?.sigilBind),
    claimedDomains:[...(run?.v142ClaimedDomains||[])],
    bankedGames:[...(run?.bankedGames||[])],
    floorGames:[...(run?.floorGames||[])],
    persistentCollection:window.CCGProgression?.persistentCollection?.()||[]
  }));
}

async function bankAndDescend(page,{game,domain=null,relic=null,essence=null,sigil=null,nextFloor}){
  await page.evaluate(({game,domain,relic,essence,sigil})=>{
    run.floorGames=Array.isArray(run.floorGames)?run.floorGames:[];
    run.floorGames.push(game);
    run.v142ClaimedDomains=Array.isArray(run.v142ClaimedDomains)?run.v142ClaimedDomains:[];
    if(domain&&!run.v142ClaimedDomains.includes(domain))run.v142ClaimedDomains.push(domain);
    p1.relics=Array.isArray(p1.relics)?p1.relics:[];
    if(relic&&!p1.relics.includes(relic))p1.relics.push(relic);
    if(Number.isFinite(essence))p1.banishmentEssence=essence;
    if(sigil)p1[sigil]=true;
    floorComplete("V10.42 five-depth browser transition contract");
  },{game,domain,relic,essence,sigil});
  await page.waitForFunction(()=>mode==="floorcomplete"&&!document.getElementById("floor-complete")?.classList.contains("hidden"));
  await page.evaluate(()=>descendFloor());
  await settleFloorEntry(page,nextFloor);
  return snapshot(page);
}

try{
  const context=await browser.newContext({viewport:{width:1600,height:900}}),page=await context.newPage();
  page.setDefaultTimeout(45000);
  const errors=[],failedScripts=[];
  page.on("pageerror",error=>errors.push(String(error?.stack||error)));
  page.on("requestfailed",request=>{try{const url=new URL(request.url());if(url.origin===origin&&/\.js(?:\?|$)/i.test(url.pathname))failedScripts.push(`${url.pathname}: ${request.failure()?.errorText||"failed"}`)}catch(_){}});

  await page.goto(`${origin}/arcade/lost-sizzler/?v142-five-depth-live=1`,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.body.dataset.releaseReady==="true"&&Boolean(window.CCGLostSizzlerV142ProceduralOverhaul)&&Boolean(window.CCGLostSizzlerV142FiveDepthCampaign)&&Boolean(window.CCGLostSizzlerModeRuntime)&&Boolean(document.getElementById("solo-btn")),null,{timeout:90000});
  await page.evaluate(()=>{try{localStorage.removeItem("ccg-quest-collection");window.CCGProgression?.clearCheckpoint?.()}catch(_){}});
  await page.click("#solo-btn");
  await page.waitForFunction(()=>document.body.dataset.runActive==="true"&&mode==="playing"&&playMode==="solo"&&Boolean(run)&&Boolean(host)&&Boolean(p1)&&window.CCGLostSizzlerModeRuntime?.detect?.()==="dungeon-solo",null,{timeout:20000});

  await page.evaluate(()=>{
    p1.rpgStats={might:8,vitality:7,agility:6,endurance:9,luck:7,arcana:8};
    p1.relics=["threshold-compass"];
    p1.banishmentVessel=true;
    p1.banishmentEssence=1;
    p1.banishmentEssenceCost=3;
    p1.sigilReveal=false;p1.sigilWard=false;p1.sigilBind=false;
    run.v142Campaign=true;
    run.v142ClaimedDomains=[];
    run.bankedGames=[];
    run.floorGames=[];
  });

  const opening=await snapshot(page);
  assert.equal(opening.floor,1,"A live V10.42 Solo campaign must start on Floor 1.");
  assert.equal(opening.floorName,"THE THRESHOLD","The live campaign must begin in The Threshold.");
  assert.equal(opening.controller,"dungeon-solo","The live campaign must remain under the Solo Dungeon controller.");
  assert.deepEqual(opening.rpgStats,{might:8,vitality:7,agility:6,endurance:9,luck:7,arcana:8},"Seeded RPG attributes must be visible before the first descent.");

  const floor2=await bankAndDescend(page,{game:"Archon",essence:2,nextFloor:2});
  assert.equal(floor2.floorName,"IRON KEEP","First descent must enter Iron Keep.");
  assert.deepEqual(floor2.bankedGames,["Archon"],"Floor 1 rescued C64 games must be banked before entering Floor 2.");
  assert.deepEqual(floor2.rpgStats,opening.rpgStats,"RPG attributes must survive the first real startWorld transition.");
  assert.deepEqual(floor2.relics,["threshold-compass"],"Existing relics must survive the first real startWorld transition.");
  assert.equal(floor2.essence,2,"Banishment Essence must survive the first real startWorld transition.");

  const floor3=await bankAndDescend(page,{game:"Bruce Lee",domain:"iron",relic:"iron-heart",essence:3,sigil:"sigilReveal",nextFloor:3});
  assert.equal(floor3.floorName,"MOSS CRYPT","Second descent must enter Moss Crypt.");
  assert.deepEqual(floor3.claimedDomains,["iron"],"The global Iron Key must survive descent into Floor 3.");
  assert.deepEqual(floor3.relics,["threshold-compass","iron-heart"],"Iron Keep relic rewards must survive descent into Floor 3.");
  assert.equal(floor3.sigilReveal,true,"Reveal must survive descent into Floor 3.");
  assert.deepEqual(floor3.bankedGames,["Archon","Bruce Lee"],"Rescued games from Floors 1–2 must remain banked.");

  const floor4=await bankAndDescend(page,{game:"Commando",domain:"bone",relic:"crypt-lantern",essence:4,sigil:"sigilWard",nextFloor:4});
  assert.equal(floor4.floorName,"EMBER DEPTHS","Third descent must enter Ember Depths.");
  assert.deepEqual(floor4.claimedDomains,["iron","bone"],"Iron and Bone global Keys must survive descent into Floor 4.");
  assert.equal(floor4.sigilReveal,true,"Reveal must remain active on Floor 4.");
  assert.equal(floor4.sigilWard,true,"Ward must survive descent into Floor 4.");
  assert.deepEqual(floor4.bankedGames,["Archon","Bruce Lee","Commando"],"Rescued games from Floors 1–3 must remain banked.");

  const floor5=await bankAndDescend(page,{game:"Defender of the Crown",domain:"ash",relic:"ember-seal",essence:5,sigil:"sigilBind",nextFloor:5});
  assert.equal(floor5.floor,5,"Fourth descent must reach the fifth and final campaign depth.");
  assert.equal(floor5.deepest,5,"Deepest-floor tracking must reach 5 after four live descents.");
  assert.equal(floor5.floorName,"SIGIL SANCTUM","Fourth descent must enter Sigil Sanctum.");
  assert.deepEqual(floor5.claimedDomains,["iron","bone","ash"],"All three global Keys must survive into Sigil Sanctum.");
  assert.deepEqual(floor5.rpgStats,opening.rpgStats,"All six RPG attributes must survive the complete four-transition campaign path.");
  assert.deepEqual(floor5.relics,["threshold-compass","iron-heart","crypt-lantern","ember-seal"],"Relics accumulated across earlier depths must survive into Sigil Sanctum.");
  assert.equal(floor5.vessel,true,"The persistent Banishment Vessel must survive into Sigil Sanctum.");
  assert.equal(floor5.essence,5,"Banishment Essence must survive into Sigil Sanctum.");
  assert.equal(floor5.essenceCost,3,"The Banishment Essence cost must remain stable across all live floor transitions.");
  assert.equal(floor5.sigilReveal,true,"Reveal must survive into Sigil Sanctum.");
  assert.equal(floor5.sigilWard,true,"Ward must survive into Sigil Sanctum.");
  assert.equal(floor5.sigilBind,true,"Bind must survive into Sigil Sanctum.");
  assert.deepEqual(floor5.bankedGames,["Archon","Bruce Lee","Commando","Defender of the Crown"],"Each earlier depth's rescued C64 game must remain banked on Floor 5.");
  assert.deepEqual(floor5.floorGames,[],"The new final depth must begin with an empty current-floor rescue buffer.");
  assert.deepEqual(floor5.persistentCollection,["Archon","Bruce Lee","Commando","Defender of the Crown"],"The persistent local C64 collection must mirror all four banked depth rescues.");
  assert.equal(floor5.mode,"playing","The final depth must return to normal playing mode after its entry prompt is dismissed.");
  assert.equal(floor5.controller,"dungeon-solo","The Solo Dungeon controller must survive all four campaign transitions.");
  assert.equal(floor5.runActive,"true","The canonical run must remain active on Sigil Sanctum entry.");
  assert.deepEqual(errors,[],`Five-depth live campaign transition must not raise page errors: ${errors.join("\n")}`);
  assert.deepEqual(failedScripts,[],`Five-depth live campaign transition must not lose same-origin scripts: ${failedScripts.join("\n")}`);

  await page.evaluate(()=>{try{localStorage.removeItem("ccg-quest-collection");window.CCGProgression?.clearCheckpoint?.()}catch(_){}});
  console.log("Lost Sizzler V10.42 five-depth live transition persistence contract passed.");
  await context.close();
}finally{
  await browser.close();
  for(const socket of sockets)socket.destroy();
  await new Promise(resolve=>server.close(()=>resolve()));
}
