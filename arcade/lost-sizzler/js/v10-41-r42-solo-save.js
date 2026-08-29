/* The Lost Sizzler V10.41 r42 — visible Solo save/continue facility.
 *
 * Solo saves are deliberately floor-entry checkpoints. The live dungeon contains
 * timers, active encounters and generated world objects that should not be
 * serialised halfway through a mutation. Saving the stable floor entrance keeps
 * resume deterministic while preserving the player's run, score and loadout.
 * Weekly Vault, Split Screen and every online mode are left unchanged.
 */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V141_R42_SOLO_SAVE__)return;
  window.__CCG_LOST_SIZZLER_V141_R42_SOLO_SAVE__=true;

  const STORAGE_KEY="ccg-lost-sizzler-v10-41-solo-save-v1";
  const SCHEMA="ccg-lost-sizzler-solo-save";
  const VERSION=1;
  const state={entry:null,lastSavedAt:0,lastReason:"",captures:0,resumes:0,migrated:false};
  const clone=value=>{try{return JSON.parse(JSON.stringify(value))}catch(_){return null}};
  const finiteInt=(value,fallback=0)=>Number.isFinite(Number(value))?Math.floor(Number(value)):fallback;
  const maxFloors=()=>Math.max(1,finiteInt(window.CCG_CONFIG?.maxFloors,5));

  function specialMode(){
    try{return String(window.CCGLostSizzlerSpecialModes?.active?.type||document.body?.dataset?.specialMode||"")}catch(_){return""}
  }
  function soloRunActive(){
    try{return Boolean(run&&p1&&!p2&&!run.daily&&playMode==="solo"&&!specialMode())}catch(_){return false}
  }
  function valid(data){
    if(!data||data.schema!==SCHEMA||Number(data.version)!==VERSION)return false;
    if(data.playMode!=="solo"||data.player2||!data.run||!data.player||data.run.daily)return false;
    const floor=finiteInt(data.floor||data.run.floor,0);
    if(floor<1||floor>maxFloors())return false;
    if(!String(data.run.seed||"").trim())return false;
    return true;
  }
  function readRaw(){
    try{const data=JSON.parse(localStorage.getItem(STORAGE_KEY)||"null");return valid(data)?data:null}catch(_){return null}
  }
  function removeRaw(){try{localStorage.removeItem(STORAGE_KEY)}catch(_){}state.entry=null;state.lastSavedAt=0;state.lastReason=""}
  function checkpointToSave(checkpoint,reason="floor_entry"){
    if(!checkpoint?.run||!checkpoint?.player)return null;
    const floor=finiteInt(checkpoint.floor||checkpoint.run.floor,1);
    const savedAt=Date.now();
    return{
      schema:SCHEMA,version:VERSION,build:String(document.querySelector('meta[name="ccg-lost-sizzler-build"]')?.content||"V10.41"),
      savedAt,reason,floor,score:Math.max(0,finiteInt(checkpoint.score,0)),playMode:"solo",
      run:clone(checkpoint.run),player:clone(checkpoint.player),player2:null
    };
  }
  function currentCheckpoint(){
    if(!soloRunActive())return null;
    try{
      const checkpoint=window.CCGProgression?.makeCheckpoint?.(run,p1,null,score,"solo");
      return checkpoint?.run&&checkpoint?.player?checkpoint:null
    }catch(_){return null}
  }
  function writeSave(data,{announce=false,reason="floor_entry"}={}){
    if(!valid(data))return false;
    const copy=clone(data);if(!copy)return false;
    copy.savedAt=Date.now();copy.reason=reason||copy.reason||"floor_entry";
    try{localStorage.setItem(STORAGE_KEY,JSON.stringify(copy))}catch(_){return false}
    state.entry=clone(copy);state.lastSavedAt=copy.savedAt;state.lastReason=copy.reason;refreshButton();
    if(announce)try{showToast?.("SOLO RUN AUTOSAVED",`Floor ${copy.floor} entrance saved. Continue later from this checkpoint.`,"green",6500)}catch(_){}
    return true
  }
  function capture(reason="floor_entry",announce=false){
    if(!soloRunActive())return null;
    const checkpoint=currentCheckpoint();if(!checkpoint)return null;
    const data=checkpointToSave(checkpoint,reason);if(!data)return null;
    state.entry=clone(data);state.captures++;
    try{floorEntryCheckpoint=checkpoint}catch(_){}
    writeSave(data,{announce,reason});
    return checkpoint
  }
  function sameRunAndFloor(data){
    if(!valid(data)||!soloRunActive())return false;
    try{return String(data.run.seed)===String(run.seed)&&finiteInt(data.floor,0)===finiteInt(run.floor,0)}catch(_){return false}
  }
  function saveEntryForExit(){
    let data=state.entry;
    if(!sameRunAndFloor(data)){
      const stored=readRaw();
      if(sameRunAndFloor(stored))data=stored;
    }
    if(!sameRunAndFloor(data)){
      const checkpoint=capture("floor_entry",false);
      if(!checkpoint)return false;
      data=state.entry;
    }
    return writeSave(data,{announce:false,reason:"save_and_quit"})
  }
  function formatWhen(ms){
    const d=new Date(Number(ms)||Date.now());
    try{return d.toLocaleString([], {day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"})}catch(_){return"saved recently"}
  }
  function ensureMenuNote(){
    const button=document.getElementById("continue-save-btn");if(!button)return null;
    let note=document.getElementById("solo-save-menu-note");
    if(!note){note=document.createElement("small");note.id="solo-save-menu-note";note.className="solo-save-menu-note hidden";button.insertAdjacentElement("afterend",note)}
    return note
  }
  function refreshButton(){
    const button=document.getElementById("continue-save-btn"),note=ensureMenuNote(),data=readRaw();
    if(!button)return;
    if(data){
      button.classList.remove("hidden");button.textContent=`Continue Saved Run — Floor ${data.floor}`;
      if(note){note.classList.remove("hidden");note.textContent=`Saved ${formatWhen(data.savedAt)} · resumes at the Floor ${data.floor} entrance.`}
      return
    }
    if(note)note.classList.add("hidden");
    if(typeof legacyUpdateSavedRunButton==="function")legacyUpdateSavedRunButton();
    else button.classList.add("hidden")
  }
  function ensurePauseSaveButton(){
    const pause=document.getElementById("pause"),actions=pause?.querySelector?.(".menu-buttons"),quit=document.getElementById("pause-quit-btn");
    if(!actions||!quit)return null;
    let button=document.getElementById("solo-save-quit-btn");
    if(!button){
      button=document.createElement("button");button.id="solo-save-quit-btn";button.type="button";button.className="primary solo-save-quit";button.textContent="Save & Quit";actions.insertBefore(button,quit);
      button.addEventListener("click",saveAndQuit);
    }
    let note=document.getElementById("solo-save-pause-note");
    if(!note){note=document.createElement("small");note.id="solo-save-pause-note";note.className="solo-save-pause-note hidden";actions.insertAdjacentElement("afterend",note)}
    return button
  }
  function refreshPause(){
    const button=ensurePauseSaveButton(),note=document.getElementById("solo-save-pause-note");
    if(!button)return;
    const enabled=soloRunActive();button.classList.toggle("hidden",!enabled);button.disabled=!enabled;
    if(note){note.classList.toggle("hidden",!enabled);if(enabled){const floor=finiteInt(run?.floor,1);note.textContent=`Save & Quit keeps your Solo run at the Floor ${floor} entrance. Progress made since entering this floor is not included.`}}
  }
  async function saveAndQuit(){
    if(!soloRunActive())return false;
    if(!saveEntryForExit()){
      try{showToast?.("SAVE FAILED","The browser could not store this Solo checkpoint. Your current run has not been closed.","red",9000)}catch(_){}
      return false
    }
    try{showToast?.("SOLO RUN SAVED",`Floor ${run.floor} entrance saved.`,"green",2500)}catch(_){}
    try{await quitToMenu();refreshButton();return true}catch(_){return false}
  }
  async function resume(){
    const saved=readRaw();if(!saved){refreshButton();return false}
    const snapshot=clone(saved);if(!snapshot)return false;
    try{
      const audio=S&&typeof S.start==="function"?S.start():Promise.resolve(),fs=typeof requestPlayFullscreen==="function"?requestPlayFullscreen():Promise.resolve();
      await Promise.all([audio,fs]);
      await net?.leave?.();
      if(UI?.name&&snapshot.player?.name)UI.name.value=String(snapshot.player.name).slice(0,18);
      net?.setSolo?.(snapshot.player?.name||"CCG Player");
      run=snapshot.run;score=Math.max(0,finiteInt(snapshot.score,0));p1=snapshot.player;p2=null;playMode="solo";mode="playing";
      startWorld(PGR.floorSeed(run),false,true,true);
      floorEntryCheckpoint=PGR.makeCheckpoint(run,p1,null,score,"solo");state.entry=clone(snapshot);state.resumes++;
      UI.menu?.classList.add("hidden");setRunPresentation(true);S?.startMusic?.();
      showToast?.("SOLO RUN RESTORED",`Floor ${run.floor}: ${PGR.floorInfo(run).name}. Resumed safely from the floor entrance.`,"green",8500);sync?.();refreshPause();return true
    }catch(error){
      console.warn("[Lost Sizzler r42] Solo save restore failed safely",error);return false
    }
  }
  function migrateLegacy(){
    if(readRaw())return false;
    try{
      const legacy=PGR?.loadCheckpoint?.();
      if(!legacy?.run||!legacy?.player||legacy.player2||legacy.run.daily||String(legacy.playMode||"solo")!=="solo")return false;
      const migrated=checkpointToSave(legacy,"legacy_migration");if(!migrated)return false;
      if(writeSave(migrated,{announce:false,reason:"legacy_migration"})){state.migrated=true;PGR?.clearCheckpoint?.();return true}
    }catch(_){}
    return false
  }
  function clear(reason="run_ended"){
    removeRaw();
    try{PGR?.clearCheckpoint?.()}catch(_){}
    refreshButton();state.lastReason=reason;return true
  }
  function waitForFreshSolo(){
    const started=performance.now();
    const timer=setInterval(()=>{
      if(soloRunActive()&&finiteInt(run?.floor,0)===1){clearInterval(timer);capture("new_run",true);refreshPause();return}
      if(performance.now()-started>12000)clearInterval(timer)
    },60)
  }

  /* Preserve the old checkpoint API for non-Solo modes while redirecting Solo
   * checkpoint calls into the new visible save slot. */
  const legacyCapture=typeof captureFloorEntryCheckpoint==="function"?captureFloorEntryCheckpoint:null;
  if(legacyCapture){
    captureFloorEntryCheckpoint=function(){if(soloRunActive())return capture("floor_entry",true);return legacyCapture.apply(this,arguments)}
  }
  const legacySave=typeof saveFloorCheckpoint==="function"?saveFloorCheckpoint:null;
  if(legacySave){
    saveFloorCheckpoint=function(returnToMenu=false){
      if(!soloRunActive())return legacySave.apply(this,arguments);
      const ok=saveEntryForExit();if(ok)showToast?.("SOLO RUN SAVED",`Floor ${run.floor} entrance saved.`,"green",6000);if(ok&&returnToMenu)setTimeout(()=>quitToMenu?.(),120);return ok
    }
  }
  const legacyOffer=typeof offerFloorSave==="function"?offerFloorSave:null;
  if(legacyOffer){
    offerFloorSave=function(restPrompt=false){
      if(soloRunActive()&&!restPrompt)return false;
      return legacyOffer.apply(this,arguments)
    }
  }
  const legacyEndRun=typeof endRun==="function"?endRun:null;
  if(legacyEndRun){
    endRun=function(){const shouldClear=soloRunActive();const result=legacyEndRun.apply(this,arguments);if(shouldClear)clear("run_ended");return result}
  }
  const legacyUpdateSavedRunButton=typeof updateSavedRunButton==="function"?updateSavedRunButton:null;
  if(legacyUpdateSavedRunButton){updateSavedRunButton=refreshButton}

  document.addEventListener("click",event=>{
    const button=event.target?.closest?.("button");if(!button)return;
    if(button.id==="solo-btn")waitForFreshSolo()
  });
  document.addEventListener("click",event=>{
    const button=event.target?.closest?.("#continue-save-btn");if(!button||!readRaw())return;
    event.preventDefault();event.stopImmediatePropagation();resume();
  },true);

  const observer=new MutationObserver(()=>{refreshPause();refreshButton()});
  const pause=document.getElementById("pause");if(pause)observer.observe(pause,{attributes:true,attributeFilter:["class"]});
  observer.observe(document.body,{attributes:true,attributeFilter:["data-run-active","data-special-mode"]});
  addEventListener("pagehide",()=>observer.disconnect(),{once:true});

  injectStyles();
  function injectStyles(){
    if(document.getElementById("ccg-r42-solo-save-styles"))return;
    const style=document.createElement("style");style.id="ccg-r42-solo-save-styles";style.textContent=`
      .solo-save-menu-note{display:block;width:100%;margin:-3px 0 5px;text-align:center;color:#bfb1cb;font:700 9px/1.35 "Courier New",monospace;letter-spacing:.25px}
      .solo-save-pause-note{display:block;margin:8px 0 0;color:#c9bbd3;font:700 10px/1.45 "Courier New",monospace;text-align:center}
      #solo-save-quit-btn{border-color:#72ff9b!important;box-shadow:0 0 16px rgba(114,255,155,.18)}
      .hidden{display:none!important}
    `;document.head.appendChild(style)
  }

  migrateLegacy();ensurePauseSaveButton();refreshPause();refreshButton();
  window.CCGLostSizzlerV141R42SoloSave={STORAGE_KEY,SCHEMA,VERSION,read:readRaw,capture,saveAndQuit,resume,clear,refresh:()=>{refreshButton();refreshPause()},get state(){return state}};
})();
