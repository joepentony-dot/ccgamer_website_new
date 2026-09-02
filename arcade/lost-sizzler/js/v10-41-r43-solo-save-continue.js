/* The Lost Sizzler V10.41 r43 — resilient Solo save / continue.
 *
 * Extends the existing floor-entry checkpoint model rather than serialising a
 * live dungeon. Standard Solo saves therefore resume at the entrance of the
 * current floor with the loadout/progression that existed at floor entry.
 * Weekly Vault, Tutorial, Split Screen and every online mode keep their
 * existing ownership and storage behaviour.
 */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V141_R43_SOLO_SAVE_CONTINUE__)return;
  window.__CCG_LOST_SIZZLER_V141_R43_SOLO_SAVE_CONTINUE__=true;

  const SCHEMA="ccg-lost-sizzler-solo-save";
  const SCHEMA_VERSION=2;
  const GAME_VERSION="V10.41";
  const PRIMARY_KEY="ccg-lost-sizzler-solo-save-v2";
  const BACKUP_KEY="ccg-lost-sizzler-solo-save-v2-backup";
  const MONITOR_MS=100;
  const ACTIVE_SPECIAL_MODES=new Set(["horde-survivor","sizzler-saboteurs"]);

  const original={
    loadCheckpoint:PGR.loadCheckpoint.bind(PGR),
    saveCheckpointData:PGR.saveCheckpointData.bind(PGR),
    clearCheckpoint:PGR.clearCheckpoint.bind(PGR),
    offerFloorSave:typeof offerFloorSave==="function"?offerFloorSave:null
  };

  const state={
    timer:0,observer:null,entryCheckpoint:null,entryFloorKey:"",lastAutoSaveKey:"",resumeInProgress:false,
    saves:0,autosaves:0,saveQuits:0,resumes:0,migrations:0,backupRecoveries:0,
    offerOwnerInstalls:0,automaticPromptSuppressions:0,
    lastSavedAt:0,lastReason:"",lastError:"",pauseButton:null,summaryNode:null
  };

  const safe=value=>String(value??"").trim();
  const clone=value=>{try{return JSON.parse(JSON.stringify(value))}catch(_){return null}};
  const specialType=()=>{try{return String(window.CCGLostSizzlerSpecialModes?.active?.type||document.body?.dataset?.specialMode||"")}catch(_){return""}};
  const tutorialOwned=()=>{try{const s=window.CCGLostSizzlerOnboardingV120?.state;return Boolean(s?.active||s?.tutorialRequested||s?.forceTutorial||document.body?.dataset?.tutorialActive==="true")}catch(_){return false}};
  const soloSaveOwner=()=>{
    if(tutorialOwned())return false;
    const special=specialType();if(special||ACTIVE_SPECIAL_MODES.has(special))return false;
    try{return Boolean(run&&!run.daily&&p1&&!p2&&String(playMode||"")==="solo"&&!net?.connected&&document.body?.dataset?.hordeSolo!=="true")}catch(_){return false}
  };
  const standardSolo=()=>{
    if(!soloSaveOwner())return false;
    try{return !run?.runComplete&&String(mode||"")!=="ended"}catch(_){return false}
  };
  const floorKey=()=>{try{return `${safe(run?.seed)}|${Math.max(1,Number(run?.floor)||1)}`}catch(_){return""}};

  function hashText(text){
    let h=2166136261>>>0;
    for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619)}
    return (h>>>0).toString(16).padStart(8,"0")
  }

  function checkpointIsSolo(data){
    return Boolean(data&&data.run&&data.player&&!data.run.daily&&!data.player2&&String(data.playMode||"solo")==="solo")
  }

  function checkpointMatchesCurrentFloor(data){
    if(!checkpointIsSolo(data)||!standardSolo())return false;
    try{return Number(data.run?.floor||data.floor||0)===Number(run?.floor||0)&&safe(data.run?.seed)===safe(run?.seed)}catch(_){return false}
  }

  function checkpointSummary(checkpoint){
    const savedAt=Math.max(0,Number(checkpoint?.savedAt)||Date.now());
    return{
      floor:Math.max(1,Number(checkpoint?.floor||checkpoint?.run?.floor)||1),
      level:Math.max(1,Number(checkpoint?.player?.level)||1),
      score:Math.max(0,Math.floor(Number(checkpoint?.score)||0)),
      playerName:safe(checkpoint?.player?.name||checkpoint?.player?.displayName||"CCG Player").slice(0,18)||"CCG Player",
      difficulty:safe(checkpoint?.run?.difficulty||"ARCADE").slice(0,20)||"ARCADE",
      savedAt
    }
  }

  function makeEnvelope(checkpoint,reason="autosave"){
    const cp=clone(checkpoint);if(!checkpointIsSolo(cp))return null;
    cp.savedAt=Date.now();cp.floor=Math.max(1,Number(cp.run?.floor)||Number(cp.floor)||1);cp.playMode="solo";
    const payload={schema:SCHEMA,schemaVersion:SCHEMA_VERSION,gameVersion:GAME_VERSION,savedAt:cp.savedAt,reason:safe(reason)||"autosave",summary:checkpointSummary(cp),checkpoint:cp};
    return{...payload,checksum:hashText(JSON.stringify(payload))}
  }

  function validateEnvelope(raw){
    if(!raw||typeof raw!=="object"||raw.schema!==SCHEMA||Number(raw.schemaVersion)!==SCHEMA_VERSION)return null;
    const {checksum,...payload}=raw;
    if(!checksum||hashText(JSON.stringify(payload))!==String(checksum))return null;
    if(!checkpointIsSolo(payload.checkpoint))return null;
    const floor=Math.max(1,Number(payload.checkpoint.run?.floor)||0);if(!floor||floor>Number(window.CCG_CONFIG?.maxFloors||5))return null;
    return raw
  }

  function parseEnvelope(text){try{return validateEnvelope(JSON.parse(text||"null"))}catch(_){return null}}
  function readSlot(key){try{return parseEnvelope(localStorage.getItem(key))}catch(_){return null}}

  function readEnvelope(){
    const primary=readSlot(PRIMARY_KEY);if(primary)return primary;
    const backup=readSlot(BACKUP_KEY);if(!backup)return null;
    try{localStorage.setItem(PRIMARY_KEY,JSON.stringify(backup));state.backupRecoveries++}catch(_){}
    return backup
  }

  function legacySolo(){
    let data=null;try{data=original.loadCheckpoint()}catch(_){}
    return checkpointIsSolo(data)?data:null
  }

  function writeEnvelope(checkpoint,reason="autosave",{backup=true}={}){
    const envelope=makeEnvelope(checkpoint,reason);if(!envelope)return false;
    try{
      const previous=localStorage.getItem(PRIMARY_KEY);
      if(backup&&previous&&parseEnvelope(previous))localStorage.setItem(BACKUP_KEY,previous);
      localStorage.setItem(PRIMARY_KEY,JSON.stringify(envelope));
      state.saves++;if(reason==="autosave")state.autosaves++;if(reason==="save_quit")state.saveQuits++;
      state.lastSavedAt=envelope.savedAt;state.lastReason=reason;state.lastError="";
      updateMenu();return true
    }catch(error){state.lastError=String(error?.message||error);return false}
  }

  function migrateLegacyIfNeeded(){
    if(readEnvelope())return false;
    const legacy=legacySolo();if(!legacy)return false;
    if(!writeEnvelope(legacy,"legacy_migration",{backup:false}))return false;
    state.migrations++;return true
  }

  function currentSavedCheckpoint(){
    const envelope=readEnvelope();if(envelope)return clone(envelope.checkpoint);
    const legacy=legacySolo();return legacy?clone(legacy):null
  }

  function clearSoloSave(){
    try{localStorage.removeItem(PRIMARY_KEY);localStorage.removeItem(BACKUP_KEY)}catch(_){}
    state.entryCheckpoint=null;state.entryFloorKey="";state.lastAutoSaveKey="";updateMenu();return true
  }

  function canonicalEntryCheckpoint(){
    if(!standardSolo())return null;
    try{
      if(Number(run?.floor||1)>1&&typeof floorEntryCheckpoint!=="undefined"&&checkpointMatchesCurrentFloor(floorEntryCheckpoint))return clone(floorEntryCheckpoint)
    }catch(_){}
    return null
  }

  function captureEntry(reason="autosave"){
    if(state.resumeInProgress)return state.entryCheckpoint?clone(state.entryCheckpoint):null;
    if(!standardSolo())return null;
    let checkpoint=canonicalEntryCheckpoint();
    try{if(!checkpoint)checkpoint=PGR.makeCheckpoint(run,p1,null,score,"solo")}catch(error){state.lastError=String(error?.message||error);return null}
    if(!checkpointIsSolo(checkpoint))return null;
    checkpoint.floor=Math.max(1,Number(run?.floor)||1);checkpoint.savedAt=Date.now();checkpoint.playMode="solo";
    state.entryCheckpoint=clone(checkpoint);state.entryFloorKey=floorKey();
    if(reason&&state.lastAutoSaveKey!==state.entryFloorKey){
      if(writeEnvelope(state.entryCheckpoint,reason)){state.lastAutoSaveKey=state.entryFloorKey;try{showToast?.("RUN AUTOSAVED",`Floor ${checkpoint.floor} entrance saved.`,"green",3000)}catch(_){}}
    }
    return clone(state.entryCheckpoint)
  }

  function ensureEntryCaptured(){
    if(!standardSolo())return false;
    const key=floorKey();if(!key)return false;
    if(state.entryCheckpoint&&state.entryFloorKey===key)return true;
    return Boolean(captureEntry("autosave"))
  }

  function formatWhen(savedAt){
    const d=new Date(Number(savedAt)||Date.now());
    if(!Number.isFinite(d.getTime()))return "saved earlier";
    try{return d.toLocaleString(undefined,{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"})}catch(_){return d.toLocaleString()}
  }

  function ensureSummaryNode(){
    if(state.summaryNode?.isConnected)return state.summaryNode;
    const buttons=document.querySelector("#menu .game-mode-buttons");if(!buttons)return null;
    let node=document.getElementById("solo-save-summary");
    if(!node){node=document.createElement("p");node.id="solo-save-summary";node.className="collection-summary solo-save-summary hidden";buttons.insertAdjacentElement("afterend",node)}
    state.summaryNode=node;return node
  }

  function updateMenu(){
    const button=document.getElementById("continue-save-btn"),solo=document.getElementById("solo-btn"),node=ensureSummaryNode();
    const envelope=readEnvelope();
    if(!button)return;
    if(!envelope){button.classList.add("hidden");if(solo)solo.textContent="Play Solo";node?.classList.add("hidden");return}
    const s=envelope.summary||checkpointSummary(envelope.checkpoint);
    button.classList.remove("hidden");button.textContent=`Continue Solo — Floor ${s.floor}`;
    if(solo)solo.textContent="New Solo Run";
    if(node){node.textContent=`Saved run: Floor ${s.floor} • Level ${s.level} • Score ${Number(s.score||0).toLocaleString()} • ${s.difficulty} • ${formatWhen(s.savedAt)}`;node.classList.remove("hidden")}
  }

  function ensurePauseButton(){
    const actions=document.querySelector("#pause .menu-buttons");if(!actions)return null;
    let button=document.getElementById("save-quit-solo-btn");
    if(!button){button=document.createElement("button");button.id="save-quit-solo-btn";button.type="button";button.textContent="Save & Quit to Main Menu";button.addEventListener("click",saveAndQuit);actions.insertBefore(button,document.getElementById("pause-quit-btn")||actions.lastElementChild)}
    button.classList.toggle("hidden",!standardSolo());state.pauseButton=button;return button
  }

  async function saveAndQuit(){
    if(!standardSolo())return false;
    if(!ensureEntryCaptured())return false;
    const ok=writeEnvelope(state.entryCheckpoint,"save_quit");
    if(!ok){try{showToast?.("SAVE FAILED","The run could not be written to this browser. Your current game is still active.","red",7000)}catch(_){}return false}
    try{showToast?.("RUN SAVED",`Floor ${run.floor} entrance saved. Returning to the main menu.`,"green",3200)}catch(_){}
    setTimeout(()=>{try{quitToMenu?.()}catch(error){state.lastError=String(error?.message||error)}},120);return true
  }

  async function resumeSolo(){
    const saved=currentSavedCheckpoint();if(!checkpointIsSolo(saved)){updateMenu();return false}
    if(state.resumeInProgress)return false;
    state.resumeInProgress=true;
    let audio=null,fs=null;
    try{
      // Fullscreen/audio are user-gesture side effects, not restore ownership.
      // Start them synchronously but never yield the Continue transaction to
      // their promises before the saved checkpoint is authoritative again.
      try{audio=S.start()}catch(_){}
      try{fs=requestPlayFullscreen()}catch(_){}
      // Continue is a local checkpoint restore. net.setSolo() initiates
      // best-effort transport teardown and resets local network state immediately.
      net.setSolo(saved.player?.name||playerName());
      run=clone(saved.run);score=Math.max(0,Number(saved.score)||0);p1=clone(saved.player);p2=null;playMode="solo";mode="playing";
      startWorld(PGR.floorSeed(run),false,true,true);
      floorEntryCheckpoint=clone(saved);state.entryCheckpoint=clone(saved);state.entryFloorKey=floorKey();state.lastAutoSaveKey=state.entryFloorKey;
      UI.menu.classList.add("hidden");setRunPresentation(true);S.startMusic();
      state.resumes++;state.lastError="";
      try{showToast("SAVED RUN RESTORED",`Floor ${run.floor}: ${PGR.floorInfo(run).name}. Resumed safely from the floor entrance.`,"green",9000)}catch(_){}
      sync();ensurePauseButton();
      try{Promise.allSettled([audio,fs].filter(Boolean)).catch(()=>{})}catch(_){}
      return true
    }catch(error){state.lastError=String(error?.message||error);try{console.warn("[Lost Sizzler r43] Solo resume failed safely",error)}catch(_){};return false}
    finally{state.resumeInProgress=false}
  }

  function interceptContinue(event){
    const button=event?.target?.closest?.("#continue-save-btn");if(!button||!readEnvelope())return;
    event.preventDefault();event.stopImmediatePropagation();resumeSolo()
  }

  function interceptDescend(event){
    const button=event?.target?.closest?.("#descend-btn");if(!button||!standardSolo())return;
    let before=0;try{before=Number(run?.floor)||0}catch(_){return}
    queueMicrotask(()=>{
      if(!standardSolo())return;
      const after=Number(run?.floor)||0;if(after<=before)return;
      captureEntry("autosave");suppressAutomaticFloorPrompt()
    })
  }

  function savedCurrentFloor(){
    if(!standardSolo())return false;
    try{
      const envelope=readEnvelope(),currentFloor=Math.max(1,Number(run?.floor)||1);
      return Boolean(envelope&&Number(envelope.summary?.floor||envelope.checkpoint?.run?.floor||0)===currentFloor&&state.lastAutoSaveKey===floorKey())
    }catch(_){return false}
  }

  function automaticPromptActive(){
    if(!standardSolo()||!savedCurrentFloor())return false;
    try{
      const reason=typeof savePromptReason!=="undefined"?String(savePromptReason||""):"";
      if(reason==="rest")return false;
      const panelVisible=Boolean(UI?.savePanel&&!UI.savePanel.classList.contains("hidden"));
      return String(mode||"")==="saveprompt"||panelVisible
    }catch(_){return false}
  }

  function suppressAutomaticFloorPrompt(){
    if(!automaticPromptActive())return false;
    try{UI?.savePanel?.classList?.add?.("hidden")}catch(_){}
    try{if(typeof savePromptReason!=="undefined"&&String(savePromptReason||"")!=="rest")savePromptReason=""}catch(_){}
    try{if(String(mode||"")==="saveprompt")mode="playing"}catch(_){}
    try{input?.clear?.()}catch(_){}
    state.automaticPromptSuppressions++;
    return true
  }

  function installOfferFloorSaveOwner(){
    const current=window.offerFloorSave;if(typeof current!=="function")return false;
    if(current.__ccgV141R43AutoSaveOwner===true)return true;
    const wrapped=function offerFloorSaveV141R43Owned(restPrompt=false){
      if(!restPrompt&&standardSolo()){
        ensureEntryCaptured();suppressAutomaticFloorPrompt();return false
      }
      return current.apply(this,arguments)
    };
    wrapped.__ccgV141R43AutoSaveOwner=true;wrapped.__ccgOriginal=current;
    window.offerFloorSave=wrapped;state.offerOwnerInstalls++;return true
  }

  function onRunPresentation(){
    if(document.body?.dataset?.runActive==="true"&&standardSolo()){
      queueMicrotask(()=>ensureEntryCaptured());
      try{requestAnimationFrame(()=>ensureEntryCaptured())}catch(_){}
      setTimeout(()=>ensureEntryCaptured(),40)
    }else if(document.body?.dataset?.runActive!=="true"){
      state.entryCheckpoint=null;state.entryFloorKey="";state.lastAutoSaveKey=""
    }
    installOfferFloorSaveOwner();suppressAutomaticFloorPrompt();ensurePauseButton();updateMenu()
  }

  // Route legacy Solo checkpoint writes through the v2 envelope. Split Screen
  // and other legacy owners still use the original storage method untouched.
  PGR.saveCheckpointData=function saveCheckpointDataV141R43(data){
    if(checkpointIsSolo(data))return writeEnvelope(data,"manual_checkpoint");
    return original.saveCheckpointData(data)
  };
  PGR.loadCheckpoint=function loadCheckpointV141R43(){
    const saved=currentSavedCheckpoint();if(saved)return saved;
    return original.loadCheckpoint()
  };
  PGR.clearCheckpoint=function clearCheckpointV141R43(){
    if(soloSaveOwner()){
      clearSoloSave();try{original.clearCheckpoint()}catch(_){};return true
    }
    return original.clearCheckpoint()
  };

  // Prevent the old Floor > 1-only menu refresher from briefly hiding a valid
  // Floor 1 save after canonical menu cleanup calls refreshCollection().
  try{if(typeof updateSavedRunButton==="function")updateSavedRunButton=function updateSavedRunButtonV141R43(){updateMenu()}}catch(_){}

  // Automatic floor saves replace the old voluntary entry prompt in standard
  // Solo. Reassert this top-level owner because later compatibility layers may
  // wrap offerFloorSave after r43. Five-death/rest prompts always delegate to
  // the retained function and are never dismissed by the automatic-prompt guard.
  installOfferFloorSaveOwner();

  document.addEventListener("click",interceptContinue,true);
  document.addEventListener("click",interceptDescend,true);
  state.observer=new MutationObserver(onRunPresentation);
  state.observer.observe(document.body,{attributes:true,attributeFilter:["data-run-active","data-special-mode","data-tutorial-active"]});
  state.timer=setInterval(()=>{
    installOfferFloorSaveOwner();
    if(standardSolo()){ensureEntryCaptured();suppressAutomaticFloorPrompt()}
    ensurePauseButton();updateMenu()
  },MONITOR_MS);

  migrateLegacyIfNeeded();updateMenu();ensurePauseButton();onRunPresentation();
  addEventListener("pagehide",()=>{if(state.timer)clearInterval(state.timer);state.observer?.disconnect?.()},{once:true});

  window.CCGLostSizzlerV141R43SoloSave={
    SCHEMA,SCHEMA_VERSION,PRIMARY_KEY,BACKUP_KEY,
    readEnvelope,currentSavedCheckpoint,captureEntry,saveAndQuit,resumeSolo,clearSoloSave,updateMenu,
    validateEnvelope,makeEnvelope,hashText,checkpointMatchesCurrentFloor,canonicalEntryCheckpoint,
    installOfferFloorSaveOwner,suppressAutomaticFloorPrompt,automaticPromptActive,savedCurrentFloor,
    get state(){return state}
  };
})();