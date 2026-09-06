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
    const config=window.CCG_CONFIG?.proceduralDungeon;
    const seed="V10.42-BROWSER-CAMPAIGN-CONTRACT";
    const slices=[1,2,3,4,5].map(floor=>campaign.floorPickupSlice(seed,floor));
    const combined=slices.flat();
    const letters=combined.map(row=>row.letter);
    const player={};
    overhaul.initRpg(player);
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
  assert.match(audit.menuNote,/five new dungeon floors/i,"Canonical menu copy must describe the five-floor campaign.");
  assert.match(audit.menuNote,/persist/i,"Canonical menu copy must tell players that campaign progression persists between depths.");
  assert.deepEqual(pageErrors,[],`Canonical V10.42 campaign startup must not raise page errors: ${pageErrors.join("\n")}`);
  assert.deepEqual(failedScripts,[],`Canonical V10.42 campaign scripts must load without same-origin request failures: ${failedScripts.join("\n")}`);

  console.log("Lost Sizzler V10.42 canonical campaign browser integration contract passed.");
  await context.close();
}finally{
  await browser.close();
  for(const socket of sockets)socket.destroy();
  await new Promise(resolve=>server.close(()=>resolve()));
}
