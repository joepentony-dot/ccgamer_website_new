"use strict";
/*
 * Launch the real unpacked Windows EXE (never Chrome), verify its HTTP/OGG
 * serving, then restart the same app and verify browser-origin save storage.
 * Remote debugging is enabled ONLY in this GitHub Actions test invocation.
 */
const fs=require("node:fs");
const path=require("node:path");
const {spawn}=require("node:child_process");
const assert=require("node:assert/strict");
const {chromium}=require("playwright-core");

const exe=path.join(__dirname,"dist","win-unpacked","C64 Dungeon Carnage.exe");
const base="http://127.0.0.1:47731/";
const debug="http://127.0.0.1:47732";
const probeKey="ccg-windows-ci-save-probe";
const probeValue="save-survives-relaunch-v1";
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
if(process.platform!=="win32")throw Error("Windows runner required");
assert.ok(fs.existsSync(exe),"Missing unpacked Electron EXE");

async function waitForServer(child){
  for(let attempt=0;attempt<50;attempt++){
    if(child.exitCode!==null)throw Error("Game EXE exited before its local server started: "+child.exitCode);
    try{
      const response=await fetch(base+"index.html",{signal:AbortSignal.timeout(1000)});
      if(response.ok){
        assert.match(await response.text(),/C64 Dungeon Carnage/i);
        return;
      }
    }catch(error){if(error.name==="AssertionError")throw error}
    await pause(400);
  }
  throw Error("Actual Windows game EXE did not serve its game page");
}
async function connectGamePage(child){
  let browser=null;
  for(let attempt=0;attempt<35;attempt++){
    if(child.exitCode!==null)throw Error("Windows EXE exited before Playwright could connect");
    try{
      browser=await chromium.connectOverCDP(debug,{timeout:1800});
      const contexts=browser.contexts();
      const pages=contexts.flatMap(context=>context.pages());
      const game=pages.find(page=>page.url().startsWith(base));
      if(game)return {browser,page:game};
      await browser.close().catch(()=>{});
      browser=null;
    }catch(_){}
    await pause(400);
  }
  throw Error("Cannot connect to real Windows game Chromium session");
}
async function start(){
  const child=spawn(exe,["--remote-debugging-port=47732","--remote-allow-origins=*"],{
    cwd:path.dirname(exe),stdio:"ignore",windowsHide:false
  });
  let launchError=null;
  child.on("error",error=>{launchError=error});
  try{
    await waitForServer(child);
    if(launchError)throw launchError;
    const {browser,page}=await connectGamePage(child);
    return {child,browser,page};
  }catch(error){
    if(child.exitCode===null)child.kill();
    throw error
  }
}
async function stop(active){
  if(!active)return;
  try{await active.page.close({runBeforeUnload:false})}catch(_){}
  // Closing the CDP connection before Electron finished quitting could kill
  // the app before Chromium committed recently written localStorage.
  for(let attempt=0;attempt<40&&active.child.exitCode===null;attempt++)await pause(250);
  // Only terminate the EXE spawned for this test if normal closing fails.
  if(active.child.exitCode===null)active.child.kill();
  for(let attempt=0;attempt<20&&active.child.exitCode===null;attempt++)await pause(150);
  try{await active.browser.close()}catch(_){}
}
async function verifyAudioAndIsolation(){
  const response=await fetch(base+"assets/audio/voice/ccg-recorded-voices-r69.ogg",{
    headers:{Range:"bytes=0-63"},signal:AbortSignal.timeout(5000)
  });
  assert.equal(response.status,206,"Recorded audio sprite needs HTTP byte ranges");
  assert.match(response.headers.get("content-type")||"",/audio\/ogg/i);
  assert.equal((await response.arrayBuffer()).byteLength,64);

  // A bundled file can exist on disk yet be inaccessible to packaged audio.
  // Probe its real HTTP route and native RIFF/WAVE headers in the running EXE.
  for(const name of ["exploration","danger","sanctuary","named-enemy","count-loadula"]){
    const asset=await fetch(base+"assets/audio/music/"+name+".wav",{
      headers:{Range:"bytes=0-11"},signal:AbortSignal.timeout(5000)
    });
    assert.equal(asset.status,206,"Packaged soundtrack route missing: "+name);
    const data=Buffer.from(await asset.arrayBuffer());
    assert.equal(data.length,12);
    assert.equal(data.toString("ascii",0,4),"RIFF","Music asset is not WAV: "+name);
    assert.equal(data.toString("ascii",8,12),"WAVE","Music asset has invalid WAV header: "+name);
  }
  const dotfile=await fetch(base+".env",{signal:AbortSignal.timeout(5000)});
  assert.equal(dotfile.status,404,"Hidden server files must be inaccessible");
}
// Controlled performance acceptance inside the genuine packaged Windows EXE.
// A second pass must restore a real Floor 5 entry checkpoint through the
// normal Resume Saved Run button, not reconstruct an in-memory saved run.
// Neither synthetic pressure pass claims to reproduce the owner's missing save.
async function verifyWindowsFloorFivePressure(page,{resumeCheckpoint=false}={}){
  await page.waitForFunction(()=>window.CCGLostSizzlerV142Bootstrap?.ready===true,null,{timeout:45000});
  if(resumeCheckpoint){
    await page.waitForFunction(()=>{
      const saved=window.PGR?.loadCheckpoint?.();
      const button=document.getElementById("continue-save-btn");
      return Number(saved?.floor)===5&&Boolean(button)&&!button.classList.contains("hidden");
    },null,{timeout:30000});
    await page.click("#continue-save-btn");
  }else await page.click("#solo-btn");
  await page.waitForFunction(()=>mode==="playing"&&Boolean(p1&&host&&world),null,{timeout:30000});
  const staged=await page.evaluate(resumeCheckpoint=>{
    if(!resumeCheckpoint){
      beginRun({seed:"WIN-FLOOR-5-THREE-THREATS"});
      run.floor=5;run.deepest=5;run.modifier=null;
      startWorld(PGR.floorSeed(run),false,true,false);
      // Capture the authoritative Floor 5 *entrance* before touching bosses,
      // player stats or generators; normal checkpoint resume restarts the floor.
      const checkpoint=captureFloorEntryCheckpoint();
      if(Number(checkpoint?.floor)!==5||!saveFloorCheckpoint(false))
        return {error:"Cannot save a genuine Floor 5 entry checkpoint"};
    }
    const saved=PGR.loadCheckpoint();
    if(Number(saved?.floor)!==5||Number(run?.floor)!==5||
       String(saved?.run?.seed||"")!==String(run?.seed||""))
      return {error:"Missing or mismatched Floor 5 checkpoint after restart",
        savedFloor:saved?.floor,activeFloor:run?.floor};

    const fight=host?.r114BossFight,room=world?.rooms?.[fight?.roomId];
    const guardian=(host?.enemies||[]).find(e=>e.alive&&e.id===fight?.bossId);
    const death=(host?.enemies||[]).find(e=>e.alive&&e.deathStalker&&e.voidStalker);
    const count=host?.stalker,gens=(host?.generators||[]).filter(g=>g.alive);
    if(!room||!guardian||!death||!count||gens.length!==3)
      return {error:"Missing canonical Windows Floor 5 actors or generators",seed:run?.seed};
    // Move the test actors into a verified, walkable Guardian room as in the
    // already-qualified browser pressure contract. This is a synthetic setup.
    const cells=[];
    for(let y=room.y+1;y<room.y+room.h;y++)for(let x=room.x+1;x<room.x+room.w;x++){
      if(world.map[y]?.[x]!==0||W.roomAt(world,x,y)!==fight.roomId||
         !W.playerWalkable(world.map,x,y,host)||
         (host.blockingDecor||[]).some(d=>d.x===x&&d.y===y)||
         (host.generators||[]).some(g=>g.alive&&g.x===x&&g.y===y)||
         (host.chests||[]).some(c=>c.active&&c.x===x&&c.y===y)||
         (host.items||[]).some(i=>i.active&&i.x===x&&i.y===y))continue;
      cells.push({x,y});
    }
    const player=cells.find(q=>Math.abs(q.x-guardian.x)+Math.abs(q.y-guardian.y)>=3&&
      !(host.enemies||[]).some(e=>e.alive&&e.x===q.x&&e.y===q.y));
    const rivals=cells.filter(q=>player&&(q.x!==player.x||q.y!==player.y)&&
      (q.x!==guardian.x||q.y!==guardian.y)&&
      !(host.enemies||[]).some(e=>e.alive&&e.x===q.x&&e.y===q.y)&&
      Math.abs(q.x-player.x)+Math.abs(q.y-player.y)>=2);
    if(!player||rivals.length<2)return {error:"No valid independent Guardian-room pressure cells",seed:run.seed};
    p1.x=player.x;p1.y=player.y;p1.rx=p1.x;p1.ry=p1.y;
    p1.maxHealth=5000;p1.health=5000;p1.armor=0;p1.hitStunMs=0;p1.invuln=0;
    p1.controlLocked=false;p1.controlsLocked=false;
    death.x=rivals[0].x;death.y=rivals[0].y;
    death.dossierSeen=true;death.aiState="chase";
    death.moveCooldown=180;death.attackCooldown=950;
    count.x=rivals[1].x;count.y=rivals[1].y;
    count.stunMs=0;count.spawnTimer=0;count.moveCooldown=180;
    for(const e of host.enemies||[])e.dossierSeen=true;
    // Avoid unrelated first-contact dossier onboarding during this stress
    // probe; the real dossier behaviour has separate physical-input coverage.
    for(const entry of C.followerElites||[])PGR.recordNamedEncounter(entry.name,false);
    for(const g of gens.slice(0,2))damageGenerator(g,Math.max(1,g.hp),p1);
    const triggered=triggerBossFight(p1);
    updateStalker(16);updateFloorObjective();
    return {
      triggered,mode:String(mode),floor:Number(run.floor),
      resumeCheckpoint:Boolean(resumeCheckpoint),seed:String(run.seed||""),
      checkpointScore:Number(saved.score||0),
      generatorCount:(host.generators||[]).filter(g=>g.alive).length,
      guardianAlive:Boolean(guardian.alive),countAwake:Boolean(count.awake),
      deathAlive:Boolean(death.alive),complete:Boolean(host.objective?.complete),
      frames:Number(window.CCGLostSizzlerV141R59LiveRegressionFixes?.state?.acceptedFrames||0),
      elapsed:Number(host.floorElapsed||0)
    };
  },resumeCheckpoint);
  assert.ok(!staged.error,"Packaged Windows Floor 5 setup: "+JSON.stringify(staged));
  assert.equal(staged.triggered,true);
  assert.equal(staged.mode,"playing");
  assert.equal(staged.floor,5);
  assert.equal(staged.generatorCount,1);
  assert.equal(staged.guardianAlive,true);
  assert.equal(staged.countAwake,true);
  assert.equal(staged.deathAlive,true);
  assert.equal(staged.complete,false);
  const samples=[];
  for(let second=1;second<=9;second++){
    await page.waitForTimeout(1000);
    samples.push(await page.evaluate(()=>({
      frames:Number(window.CCGLostSizzlerV141R59LiveRegressionFixes?.state?.acceptedFrames||0),
      elapsed:Number(host?.floorElapsed||0),mode:String(mode||""),
      floor:Number(run?.floor||0),remaining:(host?.generators||[]).filter(g=>g.alive).length,
      guardianAlive:Boolean((host?.enemies||[]).find(e=>e.id===host.r114BossFight?.bossId)?.alive),
      countAwake:Boolean(host?.stalker?.awake),
      deathAlive:Boolean((host?.enemies||[]).find(e=>e.deathStalker&&e.voidStalker)?.alive),
      health:Number(p1?.health||0)
    })));
  }
  const windows=[];
  for(const i of [2,5,8]){
    const before=i===2?staged:samples[i-3],after=samples[i];
    const windowSample={endSecond:i+1,frames:after.frames-before.frames,elapsed:after.elapsed-before.elapsed};
    windows.push(windowSample);
    assert.equal(after.mode,"playing","Packaged Windows encounter must stay responsive");
    assert.equal(after.floor,5);
    assert.equal(after.remaining,1);
    assert.equal(after.guardianAlive,true);
    assert.equal(after.countAwake,true);
    assert.equal(after.deathAlive,true);
    assert.ok(after.health>0);
    assert.ok(windowSample.frames>=5,"Packaged Windows renderer stopped accepting frames: "+JSON.stringify(windows));
    assert.ok(windowSample.elapsed>=800,"Packaged Windows game clock stopped progressing: "+JSON.stringify(windows));
  }
  console.log("WINDOWS FLOOR 5 TRIPLE-THREAT PASS: "+JSON.stringify({staged,windows}));
  return staged;
}

async function main(){
  let run=null;
  try{
    run=await start();
    await verifyAudioAndIsolation();
    // Inspect the catalogue inside the *actual packaged Electron renderer*;
    // tests of authored JS alone cannot prove offline URLs are selected.
    await run.page.waitForFunction(
      ()=>Boolean(window.CCG_ASSET_OVERRIDES?.audio?.music?.playlists?.normal),
      null,{timeout:15000}
    );
    const selected=await run.page.evaluate(()=>({
      offline:window.CCGDungeonCarnageItchPackage,
      moods:window.CCG_ASSET_OVERRIDES.audio.music.playlists
    }));
    assert.equal(selected.offline,true,"Packaged offline flag must be enabled");
    const expected={
      normal:"exploration",danger:"danger",sanctuary:"sanctuary",
      named:"named-enemy",stalker:"count-loadula"
    };
    for(const [mood,filename] of Object.entries(expected)){
      assert.deepEqual(selected.moods[mood],
        ["assets/audio/music/"+filename+".wav"],
        "Packaged browser soundtrack must choose local track for "+mood);
    }
    const firstPressure=await verifyWindowsFloorFivePressure(run.page);
    await run.page.evaluate(([key,value])=>localStorage.setItem(key,value),[probeKey,probeValue]);
    assert.equal(await run.page.evaluate(key=>localStorage.getItem(key),probeKey),probeValue);
    await stop(run);run=null;

    run=await start();
    assert.equal(await run.page.evaluate(key=>localStorage.getItem(key),probeKey),probeValue,
      "The actual Windows application must preserve browser-origin storage across launches");
    const restoredPressure=await verifyWindowsFloorFivePressure(run.page,{resumeCheckpoint:true});
    assert.equal(restoredPressure.resumeCheckpoint,true,"Second triple-threat probe must use the real resumed Floor 5 checkpoint");
    assert.equal(restoredPressure.seed,firstPressure.seed,"Resume must restore the original saved run seed");
    assert.equal(restoredPressure.checkpointScore,firstPressure.checkpointScore,"Resume must retain the floor-entry checkpoint score");
    await run.page.evaluate(key=>{localStorage.removeItem(key);PGR.clearCheckpoint()},probeKey);
    console.log("WINDOWS EXE SMOKE PASS: real packaged game, 5 WAV soundtrack routes and selected local playlists, OGG byte-range, hidden-file protection, actual Floor 5 checkpoint resumed through the game menu after EXE restart and triple-threat pressure rechecked");
  }finally{await stop(run)}
}
main().catch(error=>{console.error(error);process.exitCode=1});
