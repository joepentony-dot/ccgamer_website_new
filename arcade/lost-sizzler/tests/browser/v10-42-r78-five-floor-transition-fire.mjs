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

async function settleFloor(page,floor){
  await page.waitForFunction(expected=>Number(run?.floor||0)===expected&&Boolean(host&&world&&p1),floor,{timeout:20000});
  await page.waitForTimeout(420);
  await page.evaluate(()=>{
    const dossier=document.getElementById("named-dossier-panel");
    if(mode==="dossier"&&dossier&&!dossier.classList.contains("hidden")&&typeof hideNamedDossier==="function")hideNamedDossier();
    const save=document.getElementById("save-panel");
    if(mode==="saveprompt"&&save&&!save.classList.contains("hidden")&&typeof closeSavePrompt==="function")closeSavePrompt();
  });
  await page.waitForFunction(()=>mode==="playing"&&document.body.dataset.runActive==="true",null,{timeout:10000});
}

async function snapshot(page){
  return page.evaluate(()=>({
    floor:Number(run?.floor||0),deepest:Number(run?.deepest||0),mode:String(mode||""),active:String(document.body.dataset.runActive||""),
    firearmUnlocked:Boolean(p1?.firearmUnlocked),weaponTier:Number(p1?.weaponEvolutionTier||p1?.weaponLevel||0),mana:Number(p1?.mana||0),
    acceptedFrames:Number(window.CCGLostSizzlerV141R59LiveRegressionFixes?.state?.acceptedFrames||0),
    memory:Boolean(host?.memoryPuzzle),torch:Boolean(host?.sequenceTorchPuzzle),weight:Boolean(host?.weightBridge),clue:Boolean(host?.bloodClue)
  }));
}

async function proveFire(page,floor){
  const before=await page.evaluate(()=>{
    p1.maxHealth=Math.max(5000,Number(p1.maxHealth)||0);p1.health=p1.maxHealth;p1.invuln=0;p1.hitStunMs=0;
    p1.firearmUnlocked=true;p1.maxMana=Math.max(1000,Number(p1.maxMana)||0);p1.mana=p1.maxMana;
    window.CCGLostSizzlerV142R47FirearmEvolution?.collapseOwnership?.(p1);
    for(const enemy of host.enemies||[])enemy.alive=false;
    if(host.stalker)host.stalker.awake=false;
    fire1=0;fireBuffer1=0;projectileCD=0;input.clear();
    return{mana:Number(p1.mana),tier:Number(p1.weaponEvolutionTier||p1.weaponLevel||0)};
  });
  assert.ok(before.tier>=1,`floor ${floor}: evolving firearm must be owned before firing`);
  await page.keyboard.down("Space");
  await page.waitForTimeout(260);
  await page.keyboard.up("Space");
  await page.waitForFunction(mana=>Number(p1?.mana||0)<Number(mana),before.mana,{timeout:3500,polling:20});
  const after=await snapshot(page);
  assert.equal(after.mode,"playing",`floor ${floor}: firing must leave gameplay active`);
  assert.equal(after.active,"true",`floor ${floor}: firing must not deactivate the run`);
  assert.ok(after.mana<before.mana,`floor ${floor}: firearm must consume ammunition`);
  return after;
}

try{
  const context=await browser.newContext({viewport:{width:1600,height:900}});
  await context.route("https://*.supabase.co/**",route=>route.fulfill({status:200,contentType:"application/json",headers:{"access-control-allow-origin":"*"},body:"{}"}));
  await context.addInitScript(()=>{try{localStorage.setItem("ccg-lost-sizzler-tutorial-seen-v1","true");localStorage.setItem("ccg-lost-sizzler-tutorial-complete-v1","true")}catch(_){}});
  const page=await context.newPage();page.setDefaultTimeout(60000);
  const errors=[],failedScripts=[];
  page.on("pageerror",error=>errors.push(String(error?.stack||error)));
  page.on("requestfailed",request=>{try{const url=new URL(request.url());if(url.origin===origin&&/\.js$/i.test(url.pathname))failedScripts.push(`${url.pathname}: ${request.failure()?.errorText||"failed"}`)}catch(_){}});

  await page.goto(`${origin}/arcade/lost-sizzler/?r78-five-floor-transition=1`,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.body.dataset.releaseReady==="true"&&Boolean(window.CCGLostSizzlerV142R47FirearmEvolution)&&Boolean(window.CCGLostSizzlerV142FiveDepthCampaign)&&Boolean(window.CCGLostSizzlerV141R59LiveRegressionFixes),null,{timeout:90000});
  const boot=await page.evaluate(()=>({build:window.CCGLostSizzlerV142Bootstrap?.build,cache:window.CCGLostSizzlerV142Bootstrap?.cache}));
  assert.equal(boot.build,"V10.42 r94");assert.equal(boot.cache,"20261002r94");

  await page.evaluate(()=>{try{window.CCGProgression?.clearCheckpoint?.()}catch(_){}});
  await page.click("#solo-btn");
  await settleFloor(page,1);

  const floors=[];
  floors.push(await proveFire(page,1));
  for(let next=2;next<=5;next++){
    const beforeTransition=await snapshot(page);
    await page.evaluate(()=>floorComplete("R78 five-floor transition acceptance"));
    await page.waitForFunction(()=>mode==="floorcomplete"&&!document.getElementById("floor-complete")?.classList.contains("hidden"),null,{timeout:10000});
    await page.evaluate(()=>descendFloor());
    await settleFloor(page,next);
    const entered=await snapshot(page);
    assert.equal(entered.floor,next,`descent must reach floor ${next}`);
    assert.ok(entered.deepest>=next,`deepest-floor progress must reach ${next}`);
    assert.ok(entered.acceptedFrames>beforeTransition.acceptedFrames,`simulation clock must continue across descent to floor ${next}`);
    floors.push(await proveFire(page,next));
  }

  assert.deepEqual(floors.map(row=>row.floor),[1,2,3,4,5],"real campaign transition path must reach all five floors in order");
  assert.equal(floors[1].clue,true,"Floor 2 must install the blood-clue puzzle");
  assert.equal(floors[2].memory,true,"Floor 3 must install the Memory Vault puzzle");
  assert.equal(floors[3].torch,true,"Floor 4 must install the sequence-torch puzzle");
  assert.equal(floors[4].weight,true,"Floor 5 must install the Weight Bridge puzzle");
  assert.ok(floors.every(row=>row.firearmUnlocked&&row.weaponTier>=1),"evolving firearm ownership must survive every floor entry");
  assert.deepEqual(errors,[],`five-floor transition acceptance must not raise page errors: ${errors.join("\n")}`);
  assert.deepEqual(failedScripts,[],`five-floor transition acceptance must not lose same-origin scripts: ${failedScripts.join("\n")}`);

  console.log("Dungeon R78 real Floor 1→5 transition, puzzle installation and firearm continuity acceptance passed.");
  await page.evaluate(()=>{try{window.CCGProgression?.clearCheckpoint?.()}catch(_){}});
  await context.close();
}finally{
  await browser.close();for(const socket of sockets)socket.destroy();await new Promise(resolve=>server.close(()=>resolve()));
}
