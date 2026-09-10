import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {chromium} from "playwright";

const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,"../../../..");
const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json; charset=utf-8",".svg":"image/svg+xml",".png":"image/png",".webp":"image/webp",".wav":"audio/wav",".mp3":"audio/mpeg",".ogg":"audio/ogg"};
const sockets=new Set();
const server=http.createServer((req,res)=>{
  try{
    const url=new URL(req.url,"http://local"),pathname=decodeURIComponent(url.pathname),relative=pathname.endsWith("/")?`${pathname}index.html`:pathname,file=path.resolve(repo,`.${relative}`);
    if(!file.startsWith(`${repo}${path.sep}`)&&file!==repo){res.writeHead(403).end("forbidden");return}
    fs.readFile(file,(error,data)=>{if(error){res.writeHead(404,{"connection":"close"}).end("not found");return}res.writeHead(200,{"content-type":mime[path.extname(file).toLowerCase()]||"application/octet-stream","cache-control":"no-store","connection":"close"});res.end(data)});
  }catch(error){res.writeHead(500,{"connection":"close"}).end(String(error))}
});
server.on("connection",socket=>{sockets.add(socket);socket.on("close",()=>sockets.delete(socket))});
await new Promise((resolve,reject)=>{server.once("error",reject);server.listen(0,"127.0.0.1",resolve)});
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,args:["--disable-dev-shm-usage","--disable-background-networking","--autoplay-policy=no-user-gesture-required"]});

try{
  const context=await browser.newContext({viewport:{width:1280,height:800}}),page=await context.newPage();
  page.setDefaultTimeout(30000);
  const pageErrors=[],failedScripts=[];
  page.on("pageerror",error=>pageErrors.push(String(error?.stack||error)));
  page.on("requestfailed",request=>{try{const url=new URL(request.url());if(url.origin===origin&&/\.js(?:\?|$)/i.test(url.pathname))failedScripts.push(`${url.pathname}: ${request.failure()?.errorText||"failed"}`)}catch(_){}});

  await page.goto(`${origin}/arcade/lost-sizzler/?v142-campaign-loader=1`,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>Boolean(window.CCGLostSizzlerV142ProceduralOverhaul?.version==="V10.42"));
  await page.waitForFunction(()=>Boolean(window.CCGLostSizzlerV142FiveDepthCampaign?.version==="V10.42"));

  const audit=await page.evaluate(()=>{
    const overhaul=window.CCGLostSizzlerV142ProceduralOverhaul;
    const campaign=window.CCGLostSizzlerV142FiveDepthCampaign;
    const progression=window.CCGProgression;
    const config=window.CCG_CONFIG?.proceduralDungeon;
    const seed="V10.42-BROWSER-CAMPAIGN-CONTRACT";
    const slices=[1,2,3,4,5].map(floor=>campaign.floorPickupSlice(seed,floor));
    const combined=slices.flat();
    const letters=combined.map(row=>row.letter);
    const player={};
    overhaul.initRpg(player);

    const run=progression.makeRun({seed:"V142-CHECKPOINT-BROWSER"});
    run.floor=4;
    run.deepest=4;
    run.v142Campaign=true;
    run.v142ClaimedDomains=["iron","bone","ash"];
    run.v142AllKeysAnnounced=true;
    run.bankedGames=["Boulder Dash","Bruce Lee"];
    run.floorGames=["Commando"];
    const savedPlayer={
      id:"P1",
      level:17,
      rpgStats:{might:8,vitality:7,agility:6,endurance:9,luck:7,arcana:8},
      relics:["sid-capacitor","ward-amplifier"],
      banishmentVessel:true,
      banishmentEssence:4,
      banishmentEssenceCost:2,
      sigilReveal:true,
      sigilWard:true,
      sigilBind:true,
      health:8,
      maxHealth:10,
      mana:120,
      maxMana:160,
      armor:5,
      inventory:[]
    };
    const savedPlayer2={
      id:"P2",
      level:12,
      rpgStats:{might:6,vitality:6,agility:7,endurance:6,luck:8,arcana:5},
      relics:["archive-plate"],
      banishmentVessel:true,
      banishmentEssence:2,
      banishmentEssenceCost:3,
      health:6,
      maxHealth:8,
      mana:90,
      maxMana:120,
      armor:3,
      inventory:[]
    };
    progression.clearCheckpoint();
    localStorage.removeItem("ccg-quest-collection");
    const checkpoint=progression.makeCheckpoint(run,savedPlayer,savedPlayer2,43210,"split");
    const checkpointSaved=progression.saveCheckpointData(checkpoint);
    const loaded=progression.loadCheckpoint();

    const bankingRun=progression.makeRun({seed:"V142-BANKING-BROWSER"});
    bankingRun.floor=2;
    bankingRun.floorGames=["Archon","Bruce Lee","Commando"];
    bankingRun.bankedGames=["Boulder Dash"];
    const persistentCollection=progression.bankFloor(bankingRun);

    progression.clearCheckpoint();
    localStorage.removeItem("ccg-quest-collection");

    return {
      overhaulVersion:overhaul.version,
      campaignVersion:campaign.version,
      floorCount:Array.isArray(config?.campaignFloors)?config.campaignFloors.length:0,
      floorNames:[1,2,3,4,5].map(floor=>campaign.floorConfig({floor})?.name||""),
      domains:[2,3,4].map(floor=>campaign.domainForFloor({floor})?.id||""),
      sliceLengths:slices.map(rows=>rows.length),
      pickupCount:combined.length,
      uniqueLetterCount:new Set(letters).size,
      sortedLetters:[...letters].sort().join(""),
      globalKeyCount:campaign.globalKeyCount({v142ClaimedDomains:["iron","bone","iron"]}),
      rpgStats:{...player.rpgStats},
      relics:Array.isArray(player.relics)?player.relics.length:-1,
      vessel:player.banishmentVessel,
      essence:player.banishmentEssence,
      essenceCost:player.banishmentEssenceCost,
      checkpointSaved,
      checkpointFloor:loaded?.run?.floor,
      checkpointKeys:[...(loaded?.run?.v142ClaimedDomains||[])],
      checkpointBankedGames:[...(loaded?.run?.bankedGames||[])],
      checkpointFloorGames:[...(loaded?.run?.floorGames||[])],
      checkpointRpgStats:{...(loaded?.player?.rpgStats||{})},
      checkpointRelics:[...(loaded?.player?.relics||[])],
      checkpointEssence:loaded?.player?.banishmentEssence,
      checkpointSigilBind:loaded?.player?.sigilBind,
      checkpointPlayer2RpgStats:{...(loaded?.player2?.rpgStats||{})},
      checkpointPlayer2Relics:[...(loaded?.player2?.relics||[])],
      checkpointScore:loaded?.score,
      checkpointPlayMode:loaded?.playMode,
      bankedAfterFloor:[...bankingRun.bankedGames],
      floorGamesAfterBank:[...bankingRun.floorGames],
      persistentCollection:[...persistentCollection],
      menuNote:document.getElementById("menu-note")?.textContent||""
    };
  });

  assert.equal(audit.overhaulVersion,"V10.42","Canonical page must install the V10.42 RPG/procedural overhaul.");
  assert.equal(audit.campaignVersion,"V10.42","Canonical page must install the V10.42 five-depth campaign layer.");
  assert.equal(audit.floorCount,5,"Canonical V10.42 config must expose exactly five campaign depths.");
  assert.deepEqual(audit.floorNames,["THE THRESHOLD","IRON KEEP","MOSS CRYPT","EMBER DEPTHS","SIGIL SANCTUM"],"Canonical browser runtime must expose the intended five-depth order.");
  assert.deepEqual(audit.domains,["iron","bone","ash"],"Floors 2–4 must own the Iron, Bone and Ash Key domains.");
  assert.deepEqual(audit.sliceLengths,[6,5,5,5,5],"The browser runtime must distribute the campaign A–Z deck as 6/5/5/5/5.");
  assert.equal(audit.pickupCount,26,"The live campaign deck must contain 26 C64 rescues.");
  assert.equal(audit.uniqueLetterCount,26,"The live campaign deck must contain one unique slot for every letter.");
  assert.equal(audit.sortedLetters,"ABCDEFGHIJKLMNOPQRSTUVWXYZ","The live campaign deck must cover A through Z exactly once.");
  assert.equal(audit.globalKeyCount,2,"Global Key counting must de-duplicate repeated domain IDs.");
  assert.deepEqual(audit.rpgStats,{might:5,vitality:5,agility:5,endurance:5,luck:5,arcana:5},"A canonical V10.42 character must initialise all six RPG attributes at baseline 5.");
  assert.equal(audit.relics,0,"A new V10.42 character must begin without relics.");
  assert.equal(audit.vessel,true,"A new V10.42 character must begin with the persistent Banishment Vessel.");
  assert.equal(audit.essence,0,"A new V10.42 character must begin with zero Banishment Essence.");
  assert.equal(audit.essenceCost,3,"The default Banishment Essence cost must match the campaign configuration.");

  assert.equal(audit.checkpointSaved,true,"The browser checkpoint store must accept a V10.42 campaign checkpoint.");
  assert.equal(audit.checkpointFloor,4,"Checkpoint round-trip must retain the active campaign floor.");
  assert.deepEqual(audit.checkpointKeys,["iron","bone","ash"],"Checkpoint round-trip must retain all three global Key domains.");
  assert.deepEqual(audit.checkpointBankedGames,["Boulder Dash","Bruce Lee"],"Checkpoint round-trip must retain already rescued C64 games.");
  assert.deepEqual(audit.checkpointFloorGames,["Commando"],"Checkpoint round-trip must retain rescued games still belonging to the current depth.");
  assert.deepEqual(audit.checkpointRpgStats,{might:8,vitality:7,agility:6,endurance:9,luck:7,arcana:8},"Checkpoint round-trip must retain Player 1 RPG attributes.");
  assert.deepEqual(audit.checkpointRelics,["sid-capacitor","ward-amplifier"],"Checkpoint round-trip must retain Player 1 relics.");
  assert.equal(audit.checkpointEssence,4,"Checkpoint round-trip must retain Banishment Essence.");
  assert.equal(audit.checkpointSigilBind,true,"Checkpoint round-trip must retain awakened Sigil powers.");
  assert.deepEqual(audit.checkpointPlayer2RpgStats,{might:6,vitality:6,agility:7,endurance:6,luck:8,arcana:5},"Checkpoint round-trip must retain Player 2 RPG attributes in split play.");
  assert.deepEqual(audit.checkpointPlayer2Relics,["archive-plate"],"Checkpoint round-trip must retain Player 2 relics in split play.");
  assert.equal(audit.checkpointScore,43210,"Checkpoint round-trip must retain campaign score.");
  assert.equal(audit.checkpointPlayMode,"split","Checkpoint round-trip must retain the saved play mode.");

  assert.deepEqual(audit.bankedAfterFloor,["Boulder Dash","Archon","Bruce Lee","Commando"],"Floor banking must move all current-depth rescued games into campaign-wide rescued state.");
  assert.deepEqual(audit.floorGamesAfterBank,[],"Floor banking must empty the current-depth rescued-game buffer after committing it.");
  assert.deepEqual(audit.persistentCollection,["Boulder Dash","Archon","Bruce Lee","Commando"],"Floor banking must mirror campaign rescues into the persistent local C64 collection without dropping prior games.");

  assert.match(audit.menuNote,/five new dungeon floors/i,"Canonical menu copy must describe the five-floor campaign.");
  assert.match(audit.menuNote,/persist/i,"Canonical menu copy must tell players that campaign progression persists between depths.");
  assert.deepEqual(pageErrors,[],`Canonical V10.42 campaign startup must not raise page errors: ${pageErrors.join("\n")}`);
  assert.deepEqual(failedScripts,[],`Canonical V10.42 campaign scripts must load without same-origin request failures: ${failedScripts.join("\n")}`);

  console.log("Lost Sizzler V10.42 canonical campaign, banking and checkpoint browser integration contract passed.");
  await context.close();
}finally{
  await browser.close();
  for(const socket of sockets)socket.destroy();
  await new Promise(resolve=>server.close(()=>resolve()));
}
