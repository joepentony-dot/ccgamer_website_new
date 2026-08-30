/* The Lost Sizzler V10.41 r43 — ordinary Solo save / continue.
 *
 * Saves deliberately contain the stable entrance snapshot for the current floor,
 * not the live room simulation. Enemy timers, projectiles, active encounters and
 * render state are regenerated from the existing deterministic floor seed when a
 * run is continued. Weekly Vault, Tutorial, Split Screen and every online/special
 * mode are excluded from ownership.
 */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V141_R43_SOLO_SAVE__)return;
  window.__CCG_LOST_SIZZLER_V141_R43_SOLO_SAVE__=true;

  const STORAGE_KEY="ccg-lost-sizzler-v10-41-solo-save-v2";
  const LEGACY_V1_KEY="ccg-lost-sizzler-v10-41-solo-save-v1";
  const SCHEMA="ccg-lost-sizzler-solo-save";
  const VERSION=2;
  const RESUME_POLICY="floor_entry";
  const MONITOR_MS=180;
  const state={
    entry:null,lastSavedAt:0,lastReason:"",captures:0,resumes:0,migrations:0,
    corruptClears:0,writeFailures:0,lastError:"",lastRunKey:"",timer:0,
    activationTimer:0,lastOwnedSeed:""
  };

  const clone=value=>{try{return JSON.parse(JSON.stringify(value))}catch(_){return null}};
  const finiteInt=(value,fallback=0)=>Number.isFinite(Number(value))?Math.floor(Number(value)):fallback;
  const maxFloors=()=>Math.max(1,finiteInt(window.CCG_CONFIG?.maxFloors,5));
  const safeText=value=>String(value??"").trim();
  const runKeyOf=data=>`${safeText(data?.run?.seed)}|${finiteInt(data?.floor??data?.run?.floor,0)}`;

  function specialMode(){
    try{return String(window.CCGLostSizzlerSpecialModes?.active?.type||document.body?.dataset?.specialMode||"")}catch(_){return""}
  }
  function tutorialOwned(){
    try{
      const tutorial=window.CCGLostSizzlerOnboardingV120?.state;
      return Boolean(tutorial?.active||tutorial?.tutorialRequested||tutorial?.forceTutorial||document.body?.dataset?.tutorialActive==="true")
    }catch(_){return false}
  }
  function networkConnected(){try{return Boolean(net?.connected)}catch(_){return false}}
  function soloRunOwned(){
    try{
      if(!run||run.daily||p2||String(playMode||"")!=="solo")return false;
      if(specialMode()||tutorialOwned()||document.body?.dataset?.hordeSolo==="true")return false;
      if(networkConnected())return false;
      return true
    }catch(_){return false}
  }
  function soloRunActive(){
    try{return Boolean(soloRunOwned()&&p1&&document.body?.dataset?.runActive==="true")}catch(_){return false}
  }

  function validPlayer(player){
    if(!player||typeof player!=="object")return false;
    const level=finiteInt(player.level,1),maxHealth=Number(player.maxHealth),health=Number(player.health);
    if(level<1||level>999)return false;
    if(!Number.isFinite(maxHealth)||maxHealth<=0||maxHealth>9999)return false;
    if(!Number.isFinite(health)||health<0||health>maxHealth+999)return false;
    return true
  }
  function valid(data){
    if(!data||typeof data!=="object"||data.schema!==SCHEMA||Number(data.version)!==VERSION)return false;
    if(data.resumePolicy!==RESUME_POLICY||data.playMode!=="solo"||data.player2)return false;
    if(!data.run||!validPlayer(data.player)||data.run.daily)return false;
    const floor=finiteInt(data.floor??data.run.floor,0),runFloor=finiteInt(data.run.floor,0),savedScore=Number(data.score);
    if(floor<1||floor>maxFloors()||runFloor!==floor)return false;
    if(!safeText(data.run.seed)||!Number.isFinite(savedScore)||savedScore<0)return false;
    if(!Number.isFinite(Number(data.savedAt))||Number(data.savedAt)<=0)return false;
    return true
  }
  function legacyV1Valid(data){
    if(!data||typeof data!=="object"||data.schema!==SCHEMA||Number(data.version)!==1)return false;
    if(data.playMode!=="solo"||data.player2||!data.run||!validPlayer(data.player)||data.run.daily)return false;
    const floor=finiteInt(data.floor??data.run.floor,0),runFloor=finiteInt(data.run.floor,0),savedScore=Number(data.score);
    return floor>=1&&floor<=maxFloors()&&runFloor===floor&&Boolean(safeText(data.run.seed))&&Number.isFinite(savedScore)&&savedScore>=0
  }
  function removeStorageKey(key){try{localStorage.removeItem(key);return true}catch(error){state.lastError=String(error?.message||error);return false}}
  function parseStorage(key,validator,{removeInvalid=false}={}){
    let raw="";
    try{raw=localStorage.getItem(key)||""}catch(error){state.lastError=String(error?.message||error);return null}
    if(!raw)return null;
    try{
      const data=JSON.parse(raw);
      if(validator(data))return data;
      if(removeInvalid){removeStorageKey(key);state.corruptClears++}
      return null
    }catch(error){
      state.lastError=String(error?.message||error);
      if(removeInvalid){removeStorageKey(key);state.corruptClears++}
      return null
    }
  }
  function readRaw(){
    const data=parseStorage(STORAGE_KEY,valid,{removeInvalid:true});
    if(data){state.entry=clone(data);state.lastSavedAt=Number(data.savedAt)||0;state.lastReason=String(data.reason||"")}
    else state.entry=null;
    return data
  }

  function checkpointToSave(checkpoint,reason="floor_entry"){
    if(!checkpoint?.run||!checkpoint?.player)return null;
    const floor=finiteInt(checkpoint.floor??checkpoint.run.floor,0),scoreValue=Math.max(0,finiteInt(checkpoint.score,0));
    const data={
      schema:SCHEMA,version:VERSION,resumePolicy:RESUME_POLICY,
      build:safeText(document.querySelector('meta[name="ccg-lost-sizzler-build"]')?.content||"V10.41"),
      savedAt:Date.now(),reason:reason||"floor_entry",floor,score:scoreValue,playMode:"solo",
      run:clone(checkpoint.run),player:clone(checkpoint.player),player2:null
    };
    return valid(data)?data:null
  }
  function writeSave(data,{reason=data?.reason||"floor_entry",announce=false,touchTime=true}={}){
    if(!valid(data))return false;
    const copy=clone(data);if(!copy)return false;
    copy.reason=reason||"floor_entry";if(touchTime)copy.savedAt=Date.now();
    try{localStorage.setItem(STORAGE_KEY,JSON.stringify(copy))}
    catch(error){state.writeFailures++;state.lastError=String(error?.message||error);return false}
    state.entry=clone(copy);state.lastSavedAt=copy.savedAt;state.lastReason=copy.reason;state.lastError="";refreshUi();
    if(announce){
      try{showToast?.("SOLO RUN AUTOSAVED",`Floor ${copy.floor} entrance saved. You can continue this run later from the title screen.`,"green",6500)}catch(_){}
    }
    return true
  }
  function persistCheckpoint(checkpoint,reason="floor_entry",announce=false){
    const data=checkpointToSave(checkpoint,reason);if(!data)return null;
    if(!writeSave(data,{reason,announce}))return null;
    state.captures++;return checkpoint
  }
  function makeCurrentCheckpoint(){
    if(!soloRunActive())return null;
    try{
      const checkpoint=window.CCGProgression?.makeCheckpoint?.(run,p1,null,score,"solo");
      return checkpoint?.run&&checkpoint?.player?checkpoint:null
    }catch(_){return null}
  }
  function matchingActiveFloor(data){
    if(!valid(data)||!soloRunOwned())return false;
    try{return safeText(data.run.seed)===safeText(run.seed)&&finiteInt(data.floor,0)===finiteInt(run.floor,0)}catch(_){return false}
  }
  function matchingFloorCheckpoint(){
    if(!soloRunActive())return null;
    try{
      const checkpoint=floorEntryCheckpoint;
      if(!checkpoint?.run||!checkpoint?.player)return null;
      return safeText(checkpoint.run.seed)===safeText(run.seed)&&finiteInt(checkpoint.floor??checkpoint.run.floor,0)===finiteInt(run.floor,0)?checkpoint:null
    }catch(_){return null}
  }
  function captureFreshFloorOne(){
    if(!soloRunActive()||finiteInt(run?.floor,0)!==1)return false;
    const existing=readRaw();
    if(matchingActiveFloor(existing)){state.entry=clone(existing);return true}
    const checkpoint=makeCurrentCheckpoint();if(!checkpoint)return false;
    try{floorEntryCheckpoint=checkpoint}catch(_){}
    return Boolean(persistCheckpoint(checkpoint,"new_run",true))
  }
  function persistKnownFloorEntry(reason="floor_entry",announce=true){
    if(!soloRunActive())return false;
    const existing=readRaw();if(matchingActiveFloor(existing)){state.entry=clone(existing);return true}
    const checkpoint=matchingFloorCheckpoint();if(!checkpoint)return false;
    return Boolean(persistCheckpoint(checkpoint,reason,announce))
  }
  function entryForExit(){
    const stored=readRaw();if(matchingActiveFloor(stored))return stored;
    const checkpoint=matchingFloorCheckpoint();
    if(checkpoint){
      const data=checkpointToSave(checkpoint,"floor_entry");
      if(data&&writeSave(data,{reason:"floor_entry",announce:false}))return readRaw()
    }
    return null
  }

  function formatWhen(value){
    const date=new Date(Number(value)||Date.now());
    try{return date.toLocaleString([],{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"})}catch(_){return"saved recently"}
  }
  function ensureMenuNote(){
    let note=document.getElementById("solo-save-menu-note");if(note)return note;
    const modes=document.querySelector(".game-mode-buttons");if(!modes)return null;
    note=document.createElement("small");note.id="solo-save-menu-note";note.className="hidden";modes.insertAdjacentElement("afterend",note);return note
  }
  function ensurePauseUi(){
    const pause=document.getElementById("pause"),actions=pause?.querySelector?.(".menu-buttons"),quit=document.getElementById("pause-quit-btn");
    if(!actions||!quit)return null;
    let button=document.getElementById("solo-save-quit-btn");
    if(!button){button=document.createElement("button");button.id="solo-save-quit-btn";button.type="button";button.className="primary hidden";button.textContent="Save & Quit";actions.insertBefore(button,quit);button.addEventListener("click",saveAndQuit)}
    let note=document.getElementById("solo-save-pause-note");
    if(!note){note=document.createElement("small");note.id="solo-save-pause-note";note.className="hidden";actions.insertAdjacentElement("afterend",note)}
    return button
  }
  function refreshContinueUi(){
    const button=document.getElementById("continue-save-btn"),solo=document.getElementById("solo-btn"),note=ensureMenuNote(),data=readRaw();
    if(data){
      if(button){button.classList.remove("hidden");button.textContent=`Continue Saved Run — Floor ${data.floor}`}
      if(solo)solo.textContent="New Solo Run";
      if(note){
        const level=Math.max(1,finiteInt(data.player?.level,1)),savedScore=Math.max(0,finiteInt(data.score,0));
        note.classList.remove("hidden");note.textContent=`Saved ${formatWhen(data.savedAt)} · Floor ${data.floor} · Level ${level} · ${savedScore.toLocaleString()} score. Continue resumes at the floor entrance. Starting a New Solo Run replaces this save.`
      }
      return
    }
    if(solo)solo.textContent="Play Solo";if(note)note.classList.add("hidden");
    if(typeof legacyUpdateSavedRunButton==="function")legacyUpdateSavedRunButton();else button?.classList.add("hidden")
  }
  function refreshPauseUi(){
    const button=ensurePauseUi(),note=document.getElementById("solo-save-pause-note"),enabled=soloRunActive();if(!button)return;
    button.classList.toggle("hidden",!enabled);button.disabled=!enabled;
    if(note){note.classList.toggle("hidden",!enabled);if(enabled)note.textContent=`Save & Quit keeps this Solo run at the Floor ${finiteInt(run?.floor,1)} entrance. Progress made since entering this floor is not included.`}
  }
  function refreshUi(){refreshContinueUi();refreshPauseUi()}

  async function saveAndQuit(){
    if(!soloRunActive())return false;
    const data=entryForExit();
    if(!data){
      try{showToast?.("SAVE NOT READY","No safe floor-entry checkpoint is available yet. Continue for a moment and try Save & Quit again.","red",8500)}catch(_){}
      return false
    }
    if(!writeSave(data,{reason:"save_and_quit",announce:false,touchTime:true})){
      try{showToast?.("SAVE FAILED","The browser could not store this Solo checkpoint. Your current run has not been closed.","red",9000)}catch(_){}
      return false
    }
    try{showToast?.("SOLO RUN SAVED",`Floor ${data.floor} entrance saved.`,"green",2200)}catch(_){}
    try{await quitToMenu();refreshUi();return true}catch(error){state.lastError=String(error?.message||error);return false}
  }

  async function resume(){
    const saved=readRaw();if(!saved){refreshUi();return false}
    const snapshot=clone(saved);if(!snapshot||!valid(snapshot))return false;
    try{
      const audio=typeof S!=="undefined"&&typeof S.start==="function"?S.start():Promise.resolve();
      const fullscreen=typeof requestPlayFullscreen==="function"?requestPlayFullscreen():Promise.resolve();
      await Promise.all([audio,fullscreen]);
      await net?.leave?.();
      if(UI?.name&&snapshot.player?.name)UI.name.value=String(snapshot.player.name).slice(0,18);
      net?.setSolo?.(snapshot.player?.name||"CCG Player");
      run=clone(snapshot.run);score=Math.max(0,finiteInt(snapshot.score,0));p1=clone(snapshot.player);p2=null;playMode="solo";mode="playing";
      startWorld(PGR.floorSeed(run),false,true,true);
      floorEntryCheckpoint=PGR.makeCheckpoint(run,p1,null,score,"solo");
      state.entry=clone(snapshot);state.resumes++;state.lastRunKey=runKeyOf(snapshot);state.lastOwnedSeed=safeText(run.seed);
      UI.menu?.classList.add("hidden");setRunPresentation(true);S?.startMusic?.();
      showToast?.("SOLO RUN RESTORED",`Floor ${run.floor}: ${PGR.floorInfo(run).name}. Resumed from the saved floor entrance.`,"green",8500);sync?.();refreshUi();return true
    }catch(error){state.lastError=String(error?.message||error);console.warn("[Lost Sizzler r43] Solo save restore failed safely",error);return false}
  }

  function migrateLegacyV1(){
    if(readRaw())return false;
    const legacy=parseStorage(LEGACY_V1_KEY,legacyV1Valid,{removeInvalid:true});if(!legacy)return false;
    const migrated=checkpointToSave(legacy,"v1_migration");if(!migrated)return false;
    if(!writeSave(migrated,{reason:"v1_migration",announce:false}))return false;
    removeStorageKey(LEGACY_V1_KEY);state.migrations++;return true
  }
  function migrateLegacyCheckpoint(){
    if(readRaw())return false;
    try{
      const legacy=PGR?.loadCheckpoint?.();
      if(!legacy?.run||!legacy?.player||legacy.player2||legacy.run.daily||String(legacy.playMode||"solo")!=="solo")return false;
      const migrated=checkpointToSave(legacy,"v10_3_migration");if(!migrated)return false;
      if(!writeSave(migrated,{reason:"v10_3_migration",announce:false}))return false;
      PGR?.clearCheckpoint?.();state.migrations++;return true
    }catch(error){state.lastError=String(error?.message||error);return false}
  }
  function migrateLegacy(){return migrateLegacyV1()||migrateLegacyCheckpoint()}
  function clear(reason="run_ended"){
    removeStorageKey(STORAGE_KEY);removeStorageKey(LEGACY_V1_KEY);state.entry=null;state.lastSavedAt=0;state.lastReason=reason;
    try{PGR?.clearCheckpoint?.()}catch(_){}
    refreshUi();return true
  }

  function scheduleActivationCapture(){
    if(state.activationTimer){clearInterval(state.activationTimer);state.activationTimer=0}
    let attempts=0;
    const stop=()=>{if(state.activationTimer)clearInterval(state.activationTimer);state.activationTimer=0};
    const attempt=()=>{
      attempts++;
      if(!document.body||document.body.dataset.runActive!=="true"){if(attempts>=80)stop();return}
      if(!soloRunActive()){if(attempts>=80)stop();return}
      state.lastOwnedSeed=safeText(run.seed);state.lastRunKey=`${state.lastOwnedSeed}|${finiteInt(run.floor,0)}`;
      let ready=false;
      if(finiteInt(run.floor,0)===1)ready=captureFreshFloorOne();
      else ready=persistKnownFloorEntry("resume_or_floor_entry",false)||matchingActiveFloor(readRaw());
      refreshUi();if(ready||attempts>=80)stop()
    };
    attempt();if(!state.activationTimer&&attempts<80)state.activationTimer=setInterval(attempt,50)
  }
  function lifecycleMonitor(){
    if(soloRunOwned()){
      state.lastOwnedSeed=safeText(run?.seed);
      const key=`${state.lastOwnedSeed}|${finiteInt(run?.floor,0)}`;
      if(key!==state.lastRunKey){
        state.lastRunKey=key;
        if(finiteInt(run?.floor,0)===1){if(!matchingActiveFloor(readRaw()))captureFreshFloorOne()}
        else if(!matchingActiveFloor(readRaw()))persistKnownFloorEntry("floor_entry_watch",false)
      }
    }
    try{
      if(mode==="ended"&&state.lastOwnedSeed){
        const data=readRaw();if(data&&safeText(data.run?.seed)===state.lastOwnedSeed)clear("run_ended_watch");state.lastOwnedSeed=""
      }
    }catch(_){}
    refreshPauseUi()
  }

  /* Redirect only ordinary Solo through r43. The established checkpoint path is
   * left intact for every other mode, including the five-death rest prompt. */
  const legacyCapture=typeof captureFloorEntryCheckpoint==="function"?captureFloorEntryCheckpoint:null;
  if(legacyCapture){
    captureFloorEntryCheckpoint=function(){
      const checkpoint=legacyCapture.apply(this,arguments);
      if(soloRunActive()&&checkpoint)persistCheckpoint(checkpoint,"floor_entry",true);
      return checkpoint
    }
  }
  const legacySave=typeof saveFloorCheckpoint==="function"?saveFloorCheckpoint:null;
  if(legacySave){
    saveFloorCheckpoint=function(returnToMenu=false){
      if(!soloRunActive())return legacySave.apply(this,arguments);
      const data=entryForExit();if(!data)return false;
      const ok=writeSave(data,{reason:returnToMenu?"save_and_return":"manual_checkpoint",announce:false});
      if(ok)showToast?.("SOLO RUN SAVED",`Floor ${data.floor} entrance saved.`,"green",6000);
      if(ok&&returnToMenu)setTimeout(()=>quitToMenu?.(),120);return ok
    }
  }
  const legacyOffer=typeof offerFloorSave==="function"?offerFloorSave:null;
  if(legacyOffer){
    offerFloorSave=function(restPrompt=false){if(soloRunActive()&&!restPrompt)return false;return legacyOffer.apply(this,arguments)}
  }
  const legacyEndRun=typeof endRun==="function"?endRun:null;
  if(legacyEndRun){
    endRun=function(){
      const shouldClear=soloRunOwned(),endingSeed=shouldClear?safeText(run?.seed):"",result=legacyEndRun.apply(this,arguments);
      if(shouldClear){const data=readRaw();if(!data||!endingSeed||safeText(data.run?.seed)===endingSeed)clear("run_ended")}
      return result
    }
  }
  const legacyUpdateSavedRunButton=typeof updateSavedRunButton==="function"?updateSavedRunButton:null;
  if(legacyUpdateSavedRunButton)updateSavedRunButton=refreshContinueUi;

  document.addEventListener("click",event=>{
    const button=event.target?.closest?.("#continue-save-btn");if(!button||!readRaw())return;
    event.preventDefault();event.stopImmediatePropagation();resume()
  },true);

  const observer=new MutationObserver(records=>{
    refreshUi();
    if(records.some(record=>record.target===document.body&&record.attributeName==="data-run-active")&&document.body.dataset.runActive==="true")scheduleActivationCapture()
  });
  const pause=document.getElementById("pause");if(pause)observer.observe(pause,{attributes:true,attributeFilter:["class"]});
  if(document.body)observer.observe(document.body,{attributes:true,attributeFilter:["data-run-active","data-special-mode","data-tutorial-active","data-horde-solo"]});

  migrateLegacy();ensurePauseUi();refreshUi();
  if(document.body?.dataset?.runActive==="true")scheduleActivationCapture();
  state.timer=setInterval(lifecycleMonitor,MONITOR_MS);
  addEventListener("pagehide",()=>{
    observer.disconnect();if(state.timer)clearInterval(state.timer);state.timer=0;
    if(state.activationTimer)clearInterval(state.activationTimer);state.activationTimer=0
  },{once:true});

  window.CCGLostSizzlerV141R43SoloSave={
    STORAGE_KEY,LEGACY_V1_KEY,SCHEMA,VERSION,RESUME_POLICY,
    valid,read:readRaw,captureFreshFloorOne,persistKnownFloorEntry,saveAndQuit,resume,clear,migrateLegacy,
    owned:soloRunOwned,active:soloRunActive,refresh:refreshUi,get state(){return state}
  };
})();
