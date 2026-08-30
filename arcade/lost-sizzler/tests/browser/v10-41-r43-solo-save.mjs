import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {chromium} from "playwright";

const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,"../../../..");
const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".mjs":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json; charset=utf-8",".svg":"image/svg+xml",".webp":"image/webp",".png":"image/png",".ogg":"audio/ogg",".mp3":"audio/mpeg"};
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

async function waitForR43(page){
  await page.waitForFunction(()=>document.body.dataset.releaseReady==="true"&&Boolean(window.CCGLostSizzlerV141R43SoloSave)&&Boolean(document.getElementById("solo-btn")),null,{timeout:90000});
}

try{
  const context=await browser.newContext({viewport:{width:1600,height:900}}),page=await context.newPage();page.setDefaultTimeout(60000);
  const errors=[];page.on("pageerror",error=>errors.push(String(error?.stack||error)));
  await page.goto(`${origin}/arcade/lost-sizzler/`,{waitUntil:"domcontentloaded"});await waitForR43(page);

  await page.evaluate(()=>{
    const api=window.CCGLostSizzlerV141R43SoloSave;
    api.clear("browser_fixture");
    try{localStorage.removeItem(api.LEGACY_V1_KEY)}catch(_){}
  });
  await page.click("#solo-btn");
  await page.waitForFunction(()=>document.body.dataset.runActive==="true"&&typeof mode!=="undefined"&&mode==="playing"&&typeof playMode!=="undefined"&&playMode==="solo"&&Boolean(run)&&Boolean(p1));
  await page.waitForFunction(()=>Boolean(window.CCGLostSizzlerV141R43SoloSave.read()),null,{timeout:15000});

  const initial=await page.evaluate(()=>{
    const api=window.CCGLostSizzlerV141R43SoloSave,data=api.read(),button=document.getElementById("continue-save-btn"),solo=document.getElementById("solo-btn"),note=document.getElementById("solo-save-menu-note");
    return{schema:data?.schema,version:data?.version,resumePolicy:data?.resumePolicy,floor:data?.floor,score:data?.score,playMode:data?.playMode,daily:data?.run?.daily,player2:data?.player2,seed:data?.run?.seed,playerHealth:data?.player?.health,playerLevel:data?.player?.level,buttonHidden:button?.classList.contains("hidden"),buttonText:button?.textContent||"",soloText:solo?.textContent||"",noteText:note?.textContent||"",captures:api.state.captures,owned:api.owned(),active:api.active()};
  });
  assert.equal(initial.schema,"ccg-lost-sizzler-solo-save","Floor 1 autosave must use the Solo save schema");
  assert.equal(initial.version,2,"Floor 1 autosave must use schema version 2");
  assert.equal(initial.resumePolicy,"floor_entry","save must explicitly declare floor-entry resume semantics");
  assert.equal(initial.floor,1,"a new Solo run must be resumable from Floor 1");
  assert.equal(initial.score,0,"new Solo checkpoint must begin with the floor-entry score");
  assert.equal(initial.playMode,"solo","checkpoint must be marked as Solo only");
  assert.equal(initial.daily,false,"ordinary Solo checkpoint must never masquerade as Weekly Vault");
  assert.equal(initial.player2,null,"ordinary Solo checkpoint must not contain Split Screen state");
  assert.ok(String(initial.seed).length>0,"saved run must retain its deterministic seed");
  assert.ok(Number(initial.playerHealth)>0,"saved Floor 1 player must be alive");
  assert.ok(Number(initial.playerLevel)>=1,"saved Floor 1 player must retain a valid level");
  assert.equal(initial.buttonHidden,false,"Continue Saved Run must become visible after the Floor 1 autosave");
  assert.match(initial.buttonText,/Continue Saved Run — Floor 1/,"Continue button must identify the saved floor");
  assert.equal(initial.soloText,"New Solo Run","existing save must distinguish a new run from Continue");
  assert.match(initial.noteText,/Floor 1.*Level .*score.*floor entrance.*replaces this save/i,"menu save details must explain floor, player progress, resume point and replacement behavior");
  assert.ok(initial.captures>=1,"new Solo run must record an autosave capture");
  assert.equal(initial.owned,true,"r43 must own an ordinary Solo run");
  assert.equal(initial.active,true,"r43 must recognise an active ordinary Solo run");

  // Mid-floor mutations must never become the resumable snapshot. Save & Quit
  // deliberately preserves the floor entrance state instead.
  await page.evaluate(()=>{score=777;p1.health=Math.max(0,Number(p1.health)-1);pause()});
  await page.waitForSelector("#pause:not(.hidden)");
  const pauseUi=await page.evaluate(()=>({hidden:document.getElementById("solo-save-quit-btn")?.classList.contains("hidden"),disabled:document.getElementById("solo-save-quit-btn")?.disabled,note:document.getElementById("solo-save-pause-note")?.textContent||""}));
  assert.equal(pauseUi.hidden,false,"Save & Quit must be visible for paused ordinary Solo");
  assert.equal(pauseUi.disabled,false,"Save & Quit must be enabled for paused ordinary Solo");
  assert.match(pauseUi.note,/Floor 1 entrance.*Progress made since entering this floor is not included/i,"pause copy must disclose floor-entry semantics");

  await page.click("#solo-save-quit-btn");
  await page.waitForFunction(()=>document.body.dataset.runActive==="false"&&typeof mode!=="undefined"&&mode==="menu"&&!document.getElementById("menu")?.classList.contains("hidden"),null,{timeout:15000});
  const afterQuit=await page.evaluate(()=>window.CCGLostSizzlerV141R43SoloSave.read());
  assert.equal(afterQuit.floor,1,"Save & Quit must retain the Floor 1 entry");
  assert.equal(afterQuit.score,0,"Save & Quit must not serialise mid-floor score gains");
  assert.equal(afterQuit.player.health,initial.playerHealth,"Save & Quit must not serialise mid-floor damage");
  assert.equal(afterQuit.reason,"save_and_quit","save metadata must record the explicit Save & Quit action");

  await page.click("#continue-save-btn");
  await page.waitForFunction(()=>document.body.dataset.runActive==="true"&&typeof mode!=="undefined"&&mode==="playing"&&playMode==="solo"&&Boolean(run)&&Boolean(p1),null,{timeout:15000});
  const resumed=await page.evaluate(()=>({floor:run?.floor,score:Number(score),health:Number(p1?.health),seed:run?.seed,playMode,p2:Boolean(p2),daily:Boolean(run?.daily),resumes:window.CCGLostSizzlerV141R43SoloSave.state.resumes,stored:window.CCGLostSizzlerV141R43SoloSave.read()}));
  assert.equal(resumed.floor,1,"Continue Saved Run must restore Floor 1");
  assert.equal(resumed.score,0,"Continue must restore floor-entry score");
  assert.equal(resumed.health,initial.playerHealth,"Continue must restore floor-entry health");
  assert.equal(resumed.seed,initial.seed,"Continue must retain the deterministic run seed");
  assert.equal(resumed.playMode,"solo","Continue must restore Solo mode only");
  assert.equal(resumed.p2,false,"Continue must never create a Split Screen player");
  assert.equal(resumed.daily,false,"Continue must not enter Weekly Vault");
  assert.ok(resumed.resumes>=1,"r43 diagnostics must record the resume");
  assert.equal(resumed.stored.floor,1,"resuming must keep the checkpoint until the run actually ends");

  // Use the real floor-complete/Descend UI route. r43 must replace the old
  // interrupting save prompt with an automatic Floor 2 entry checkpoint.
  await page.evaluate(()=>floorComplete("R43 SAVE REGRESSION"));
  await page.waitForSelector("#floor-complete:not(.hidden)");
  await page.click("#descend-btn");
  await page.waitForFunction(()=>run?.floor===2&&mode==="playing"&&Boolean(world)&&Boolean(host)&&Boolean(p1),null,{timeout:15000});
  await page.waitForFunction(()=>window.CCGLostSizzlerV141R43SoloSave.read()?.floor===2,null,{timeout:10000});
  await page.waitForTimeout(250);
  const floorTwo=await page.evaluate(()=>{
    const api=window.CCGLostSizzlerV141R43SoloSave,data=api.read();
    return{floor:data?.floor,runFloor:data?.run?.floor,seed:data?.run?.seed,policy:data?.resumePolicy,savePanelHidden:document.getElementById("save-panel")?.classList.contains("hidden"),mode,reason:data?.reason,captures:api.state.captures,entryFloor:typeof floorEntryCheckpoint!=="undefined"?(floorEntryCheckpoint?.floor||floorEntryCheckpoint?.run?.floor):null}
  });
  assert.equal(floorTwo.floor,2,"real Descend must autosave the Floor 2 entrance");
  assert.equal(floorTwo.runFloor,2,"saved run snapshot must agree with the advertised floor");
  assert.equal(floorTwo.seed,initial.seed,"floor autosave must stay on the same deterministic run");
  assert.equal(floorTwo.policy,"floor_entry","later autosaves must retain floor-entry policy");
  assert.equal(floorTwo.savePanelHidden,true,"automatic Solo floor save must not show the old manual checkpoint prompt");
  assert.equal(floorTwo.mode,"playing","automatic save must leave Floor 2 in live gameplay");
  assert.equal(floorTwo.entryFloor,2,"canonical in-memory floor checkpoint must still describe Floor 2");
  assert.ok(floorTwo.captures>=2,"Floor 2 descent must add another save capture");

  // Prove the same API refuses every non-standard Solo ownership shape and
  // leaves the valid Floor 2 checkpoint untouched.
  const isolation=await page.evaluate(()=>{
    const api=window.CCGLostSizzlerV141R43SoloSave,before=JSON.stringify(api.read()),original={playMode,p2,daily:run.daily,special:document.body.dataset.specialMode,tutorial:document.body.dataset.tutorialActive,hordeSolo:document.body.dataset.hordeSolo};
    const results={};
    run.daily=true;results.weekly=!api.owned()&&!api.persistKnownFloorEntry("isolation",false);run.daily=original.daily;
    p2={id:"fixture-p2"};results.split=!api.owned()&&!api.persistKnownFloorEntry("isolation",false);p2=original.p2;
    playMode="online";results.online=!api.owned()&&!api.persistKnownFloorEntry("isolation",false);playMode=original.playMode;
    document.body.dataset.tutorialActive="true";results.tutorial=!api.owned()&&!api.persistKnownFloorEntry("isolation",false);if(original.tutorial===undefined)delete document.body.dataset.tutorialActive;else document.body.dataset.tutorialActive=original.tutorial;
    document.body.dataset.specialMode="sizzler-saboteurs";results.special=!api.owned()&&!api.persistKnownFloorEntry("isolation",false);if(original.special===undefined)delete document.body.dataset.specialMode;else document.body.dataset.specialMode=original.special;
    document.body.dataset.hordeSolo="true";results.hordeSolo=!api.owned()&&!api.persistKnownFloorEntry("isolation",false);if(original.hordeSolo===undefined)delete document.body.dataset.hordeSolo;else document.body.dataset.hordeSolo=original.hordeSolo;
    let networkTested=false,networkExcluded=false;const own=Object.getOwnPropertyDescriptor(net,"connected"),beforeConnected=net.connected;
    try{
      Object.defineProperty(net,"connected",{configurable:true,writable:true,value:true});networkTested=net.connected===true;networkExcluded=networkTested&&!api.owned()&&!api.persistKnownFloorEntry("isolation",false)
    }catch(_){}
    try{if(own)Object.defineProperty(net,"connected",own);else{delete net.connected;if(beforeConnected!==undefined)net.connected=beforeConnected}}catch(_){}
    const after=JSON.stringify(api.read());
    return{...results,networkTested,networkExcluded,unchanged:before===after,storedFloor:api.read()?.floor}
  });
  assert.equal(isolation.weekly,true,"r43 must refuse Weekly Vault save ownership");
  assert.equal(isolation.split,true,"r43 must refuse Split Screen save ownership");
  assert.equal(isolation.online,true,"r43 must refuse online Dungeon save ownership");
  assert.equal(isolation.tutorial,true,"r43 must refuse Tutorial save ownership");
  assert.equal(isolation.special,true,"r43 must refuse special multiplayer modes");
  assert.equal(isolation.hordeSolo,true,"r43 must refuse Horde Solo state");
  assert.equal(isolation.networkTested,true,"browser fixture must be able to simulate a connected network");
  assert.equal(isolation.networkExcluded,true,"r43 must refuse a connected network even if playMode was not changed");
  assert.equal(isolation.unchanged,true,"refused captures must not alter the valid checkpoint");
  assert.equal(isolation.storedFloor,2,"refused captures must leave Floor 2 stored");

  // Migrate the interrupted r42/v1 development slot into the published r43/v2
  // schema, then verify the old key is retired.
  await page.evaluate(()=>{
    const api=window.CCGLostSizzlerV141R43SoloSave,current=api.read(),legacy={...current,version:1};delete legacy.resumePolicy;
    localStorage.setItem(api.LEGACY_V1_KEY,JSON.stringify(legacy));localStorage.removeItem(api.STORAGE_KEY)
  });
  await page.reload({waitUntil:"domcontentloaded"});await waitForR43(page);
  const migratedV1=await page.evaluate(()=>{const api=window.CCGLostSizzlerV141R43SoloSave,data=api.read();return{version:data?.version,policy:data?.resumePolicy,floor:data?.floor,legacyPresent:localStorage.getItem(api.LEGACY_V1_KEY)!==null,migrations:api.state.migrations,buttonHidden:document.getElementById("continue-save-btn")?.classList.contains("hidden")}});
  assert.equal(migratedV1.version,2,"compatible v1 save must migrate to schema version 2");
  assert.equal(migratedV1.policy,"floor_entry","v1 migration must add the floor-entry policy");
  assert.equal(migratedV1.floor,2,"v1 migration must retain the saved floor");
  assert.equal(migratedV1.legacyPresent,false,"successful v1 migration must remove the old slot");
  assert.ok(migratedV1.migrations>=1,"v1 migration must be recorded");
  assert.equal(migratedV1.buttonHidden,false,"migrated save must remain available from the title screen");

  // Also migrate the established V10.3 core checkpoint so users with the older
  // manual Floor 2+ save are not stranded by r43.
  await page.evaluate(()=>{
    const api=window.CCGLostSizzlerV141R43SoloSave,current=api.read();
    const old={version:"V10.3",savedAt:Date.now(),floor:current.floor,score:current.score,playMode:"solo",run:current.run,player:current.player,player2:null};
    window.CCGProgression.saveCheckpointData(old);localStorage.removeItem(api.STORAGE_KEY)
  });
  await page.reload({waitUntil:"domcontentloaded"});await waitForR43(page);
  const migratedV103=await page.evaluate(()=>{const api=window.CCGLostSizzlerV141R43SoloSave,data=api.read();return{version:data?.version,reason:data?.reason,floor:data?.floor,legacyCore:Boolean(window.CCGProgression.loadCheckpoint()),migrations:api.state.migrations}});
  assert.equal(migratedV103.version,2,"compatible V10.3 checkpoint must migrate to v2");
  assert.equal(migratedV103.reason,"v10_3_migration","V10.3 migration must be identified in metadata");
  assert.equal(migratedV103.floor,2,"V10.3 migration must retain the saved floor");
  assert.equal(migratedV103.legacyCore,false,"successful V10.3 migration must retire the old checkpoint slot");
  assert.ok(migratedV103.migrations>=1,"V10.3 migration must be recorded");

  // Malformed current data must fail closed: remove the corrupt slot, hide the
  // Continue action and leave the title screen operational without page errors.
  await page.evaluate(()=>{const api=window.CCGLostSizzlerV141R43SoloSave;window.CCGProgression.clearCheckpoint();localStorage.removeItem(api.LEGACY_V1_KEY);localStorage.setItem(api.STORAGE_KEY,"{not-valid-json")});
  await page.reload({waitUntil:"domcontentloaded"});await waitForR43(page);
  const corrupt=await page.evaluate(()=>{const api=window.CCGLostSizzlerV141R43SoloSave;api.refresh();return{read:api.read(),raw:localStorage.getItem(api.STORAGE_KEY),buttonHidden:document.getElementById("continue-save-btn")?.classList.contains("hidden"),soloText:document.getElementById("solo-btn")?.textContent||"",clears:api.state.corruptClears,mode:typeof mode!=="undefined"?mode:"unknown"}});
  assert.equal(corrupt.read,null,"malformed save must never become a resumable run");
  assert.equal(corrupt.raw,null,"malformed save slot must be removed");
  assert.equal(corrupt.buttonHidden,true,"Continue must be hidden when no valid save remains");
  assert.equal(corrupt.soloText,"Play Solo","title screen must return to ordinary Play Solo after corrupt-save cleanup");
  assert.ok(corrupt.clears>=1,"corrupt cleanup must be recorded");
  assert.equal(corrupt.mode,"menu","corrupt-save cleanup must leave the game at the title menu");

  assert.deepEqual(errors,[],`Solo save browser regression emitted page errors:\n${errors.join("\n")}`);
  console.log("V10.41 r43 Solo autosave, Save & Quit, Continue, floor transition, migration and corruption regression passed.");
}finally{
  await browser.close().catch(()=>{});
  for(const socket of sockets)socket.destroy();
  await new Promise(resolve=>server.close(resolve));
}
