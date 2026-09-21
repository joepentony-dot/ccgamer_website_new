"use strict";
net=new window.CCGNetwork.RoomNetwork({onMembers,onPacket});

function installEarlyStableResize(){
  if(window.__CCG_LOST_SIZZLER_EARLY_RESIZE_GUARD__)return;
  window.__CCG_LOST_SIZZLER_EARLY_RESIZE_GUARD__=true;
  const coarsePointer=()=>window.matchMedia?.("(pointer: coarse)")?.matches===true;
  const deviceMemory=()=>Math.max(1,Number(navigator.deviceMemory)||4);
  const pixelBudget=()=>{
    if(coarsePointer())return deviceMemory()<=2?1400000:1900000;
    if(deviceMemory()<=2)return 2200000;
    if(deviceMemory()<=4)return 3200000;
    return 5000000;
  };
  resizeGameCanvas=function(){
    const area=document.querySelector(".canvas-wrap");
    if(!area||!canvas||!ctx)return false;
    const r=area.getBoundingClientRect();
    if(!Number.isFinite(r.width)||!Number.isFinite(r.height)||r.width<2||r.height<2)return false;
    let w=Math.max(640,Math.min(4096,Math.floor(r.width)));
    let h=Math.max(360,Math.min(2160,Math.floor(r.height)));
    const budget=pixelBudget(),pixels=w*h;
    if(pixels>budget){
      const scale=Math.sqrt(budget/pixels);
      w=Math.max(640,Math.floor(w*scale));
      h=Math.max(360,Math.floor(h*scale));
      if(w*h>budget){
        if(w>=h)w=Math.max(640,Math.floor(budget/h));
        else h=Math.max(360,Math.floor(budget/w));
      }
    }
    if(Math.abs(canvas.width-w)<2&&Math.abs(canvas.height-h)<2)return false;
    canvas.width=w;canvas.height=h;ctx.imageSmoothingEnabled=false;cameras.clear();return true;
  };
}
installEarlyStableResize();

function installChestXPSourceContract(){
  const grantXP=awardXP;
  awardXP=function(player,amount,reason=""){
    if(String(reason)==="Chest opened")return{amount:0,gross:Math.max(0,Math.round(Number(amount)||0)),debtPaid:0,discarded:0,capped:false,reason,levels:[],blocked:true};
    return grantXP(player,amount,reason);
  };
  window.CCGLostSizzlerChestXPSourceContract=Object.freeze({blockedReason:"Chest opened"});
}
installChestXPSourceContract();

function installFloorCheckpointContinuity(){
  updateSavedRunButton=function(){
    const b=$("continue-save-btn"),raw=PGR.loadCheckpoint(),floor=Number(raw?.floor||raw?.run?.floor||0),data=floor>=1?raw:null;
    if(!b)return;
    b.classList.toggle("hidden",!data);
    if(data)b.textContent=savedRunLabel(data);
  };
  captureFloorEntryCheckpoint=function(){
    if(!run||run.daily||playMode==="online"||Number(run.floor||0)<1){floorEntryCheckpoint=null;return null}
    floorEntryCheckpoint=PGR.makeCheckpoint(run,p1,p2,score,playMode);
    return floorEntryCheckpoint;
  };
  saveFloorCheckpoint=function(returnToMenu=false){
    const data=floorEntryCheckpoint||captureFloorEntryCheckpoint();
    if(!data)return false;
    const ok=PGR.saveCheckpointData(data);
    updateSavedRunButton();
    if(ok)showToast("FLOOR CHECKPOINT SAVED",`Floor ${data.floor} entry saved. Loading it later restarts this floor from its entrance state.`,"green",7500);
    else showToast("SAVE FAILED","The floor-entry checkpoint could not be written to this browser. Your current run is still active.","red",7000);
    if(ok&&returnToMenu)setTimeout(()=>quitToMenu(),180);
    return ok;
  };
  offerFloorSave=function(restPrompt=false){
    if(!run||run.daily||playMode==="online"||!UI.savePanel||Number(run.floor||0)<1)return false;
    savePromptReason=restPrompt?"rest":"entry";
    UI.saveTitle.textContent=restPrompt?"FIVE DEATHS — SAVE FOR ANOTHER DAY?":`FLOOR ${run.floor} CHECKPOINT`;
    UI.saveCopy.textContent=restPrompt?"That was five deaths on this floor. Save the floor-entry checkpoint and return when you are feeling braver, or keep going now.":"Save this floor-entry checkpoint so you can leave the game and resume from the start of this floor later.";
    UI.saveNow.classList.toggle("hidden",restPrompt);
    UI.saveContinue.textContent=restPrompt?"Continue the Run":"Continue Without Saving";
    UI.saveReturn.classList.toggle("hidden",!restPrompt);
    UI.saveNote.textContent="Checkpoint saves deliberately return you to the floor entrance; they are not mid-battle quick saves.";
    mode="saveprompt";input.clear();UI.savePanel.classList.remove("hidden");return true;
  };
  resumeSavedRun=async function(){
    const saved=PGR.loadCheckpoint(),floor=Number(saved?.floor||saved?.run?.floor||0);
    if(!saved||floor<1){updateSavedRunButton();return false}
    const audio=S.start(),fs=requestPlayFullscreen();
    await Promise.all([audio,fs]);
    await net.leave();
    net.setSolo(saved.player?.name||playerName());
    run=saved.run;score=Math.max(0,Number(saved.score)||0);p1=saved.player;p2=saved.player2||null;playMode=p2?"split":"solo";mode="playing";
    startWorld(PGR.floorSeed(run),Boolean(p2),true,true);
    floorEntryCheckpoint=saved;
    UI.menu.classList.add("hidden");setRunPresentation(true);S.startMusic();
    showToast("CHECKPOINT RESTORED",`Floor ${run.floor}: ${PGR.floorInfo(run).name}. You are back at the floor entrance with the saved loadout.`,"green",9000);
    sync();return true;
  };
  const startRun=beginRun;
  beginRun=function(options={}){
    const started=startRun(options);
    if(started!==false&&run&&!run.daily&&playMode!=="online")captureFloorEntryCheckpoint();
    return started;
  };
  window.CCGDungeonSaveRestoreContract=Object.freeze({floorOne:true,entrySnapshot:true,writeFailureSafe:true,r43AutosaveAware:true});
}
installFloorCheckpointContinuity();

function hideStaticPanels(){UI.rulebook?.classList.add("hidden");UI.support?.classList.add("hidden");UI.shop?.classList.add("hidden");UI.savePanel?.classList.add("hidden");UI.artefactChoice?.classList.add("hidden");pendingBanishmentReward=null;activeShop=null;hideItemInfo();hideNamedDossier()}
function closeInventoryForMenu(){if(UI.inventory&&!UI.inventory.classList.contains("hidden"))UI.inventory.classList.add("hidden");if(mode==="inventory")mode="playing"}
function clearAbandonedRun(){
  world=null;host=null;p1=null;p2=null;run=null;window.__CCG_WORLD=null;score=0;won=false;floorEntryCheckpoint=null;savePromptReason="";pendingBanishmentReward=null;activeShop=null;
  for(const list of [bullets,enemyBullets,particles,rings,floaters,hazards,levelQueue,toastQueue])list.length=0;
  for(const collection of [pendingItems,questDone,remote,enemyVisuals,cameras,explored,campStates,roomVisits,playerTrails])collection.clear();
  for(const key of Object.keys(stats))stats[key]=0;enemyCD=projectileCD=sendCD=worldCD=surroundCD=specialCD=0;move1=move2=fire1=fire2=fireBuffer1=fireBuffer2=0;toastTimer=0;lowHealthCD=0;inventoryReminderMs=300000;lastAmbientMessage="";shake=0;damageFlash=0;input.clear();ctx.clearRect(0,0,canvas.width,canvas.height);ctx.fillStyle=P.black;ctx.fillRect(0,0,canvas.width,canvas.height);
  const radar=$("radar-canvas"),radarContext=radar?.getContext?.("2d");radarContext?.clearRect(0,0,radar.width,radar.height);
}
async function quitToMenu(){
  if(run?.daily)await submitWeeklyResultOnce();
  try{window.CCGLostSizzlerSpecialModes?.stop?.(undefined,true)}catch(_){}
  hideStaticPanels();closeInventoryForMenu();UI.pause.classList.add("hidden");UI.floorComplete?.classList.add("hidden");UI.levelUp?.classList.add("hidden");UI.end.classList.add("hidden");
  await net.leave();mode="menu";clearAbandonedRun();setRunPresentation(false);net.setSolo(playerName());S.setStalkerNear(false);S.setNamedEnemy?.(null);S.startMusic();UI.menu.classList.remove("hidden");refreshCollection();syncFullscreenState()
}
function showRulebook(){UI.support?.classList.add("hidden");UI.rulebook?.classList.remove("hidden")}
function showSupport(){UI.rulebook?.classList.add("hidden");UI.support?.classList.remove("hidden")}
function returnToGameFromPanel(){hideItemInfo();hideNamedDossier();UI.inventory?.classList.add("hidden");if(["inventory","dossier"].includes(mode))mode="playing";input.clear()}
async function shareQuest(){
  const data={title:"Cheeky's Commodore Quest",text:"Cheeky's Commodore Quest — a CCG dungeon crawl.",url:location.href};
  try{if(navigator.share){await navigator.share(data);return}if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(location.href);showToast("LINK COPIED","Cheeky's Commodore Quest link copied to the clipboard.","green");return}}catch(_){}
  showToast("SHARE LINK",String(location.href||"Cheeky's Commodore Quest"),"cyan")
}

function handleHeaderQuit(){
  if(mode==="menu"){location.assign("/games/ccg-games/");return}
  if(mode==="ended"){quitToMenu();return}
  openPauseMenu()
}
function clearPauseAttackCadence(reason="resume"){
  fire1=0;fire2=0;fireBuffer1=0;fireBuffer2=0;projectileCD=0;
  input.delete("Space");input.delete("Enter");input.delete("KeyF");input.delete("Numpad0");
  try{window.CCGLostSizzlerV142AttackHoldLiveness?.clearHeld?.()}catch(_){}
  try{
    const r1=window.CCGLostSizzlerV142R1Stability;
    r1?.repairCombatTimers?.();r1?.repairProjectilePool?.()
  }catch(_){}
  window.__CCG_PAUSE_ATTACK_RESETS__=Math.max(0,Number(window.__CCG_PAUSE_ATTACK_RESETS__)||0)+1;
  window.__CCG_PAUSE_ATTACK_LAST_RESET__={reason:String(reason),mode:String(mode),at:performance.now()};
}
function settlePauseAttackCadence(reason="resume"){
  const settle=()=>{
    if(mode!=="playing"||!run)return false;
    clearPauseAttackCadence(reason);
    try{window.CCGLostSizzlerV142R18SoloPlaytestStability?.repairAttackLiveness?.("pause-resume")}catch(_){}
    return true
  };
  if(settle())return true;
  queueMicrotask(settle);
  setTimeout(settle,0);
  return false
}
function resumePausedRun(){
  if(mode!=="paused")return false;
  clearPauseAttackCadence("handler-before-resume");
  const resumed=pause(true);
  if(mode!=="paused"){settlePauseAttackCadence("handler-after-resume");return true}
  return Boolean(resumed)
}
function capturePausedResumeAttackReset(event){
  if(mode!=="paused"||!run)return;
  if(event.type==="keydown"){
    if(event.repeat||!(event.code==="KeyP"||event.code==="Escape"))return;
    clearPauseAttackCadence(`capture-${event.code}`);return;
  }
  if(event.type==="click"&&event.target instanceof Element&&event.target.closest("#resume-btn"))clearPauseAttackCadence("capture-resume-button");
}
addEventListener("keydown",capturePausedResumeAttackReset,true);
addEventListener("click",capturePausedResumeAttackReset,true);

$("solo-btn").addEventListener("click",startSolo);$("continue-save-btn")?.addEventListener("click",resumeSavedRun);$("daily-btn")?.addEventListener("click",startDaily);$("split-btn").addEventListener("click",startSplit);$("resume-btn")?.addEventListener("click",resumePausedRun);$("pause-quit-btn")?.addEventListener("click",quitToMenu);$("quit-btn")?.addEventListener("click",handleHeaderQuit);
$("rulebook-btn")?.addEventListener("click",showRulebook);$("rulebook-close-btn")?.addEventListener("click",()=>UI.rulebook?.classList.add("hidden"));$("support-btn")?.addEventListener("click",showSupport);$("support-close-btn")?.addEventListener("click",()=>UI.support?.classList.add("hidden"));$("share-btn")?.addEventListener("click",shareQuest);$("item-info-close")?.addEventListener("click",hideItemInfo);$("named-dossier-btn")?.addEventListener("click",showNamedDossier);
$("inventory-dossier-btn")?.addEventListener("click",showNamedDossier);$("named-dossier-close")?.addEventListener("click",hideNamedDossier);$("shop-close")?.addEventListener("click",closeShop);$("save-now-btn")?.addEventListener("click",()=>{saveFloorCheckpoint(false);closeSavePrompt()});$("save-continue-btn")?.addEventListener("click",()=>{if(savePromptReason==="rest"&&run)run.consecutiveDeaths=0;closeSavePrompt()});$("save-return-btn")?.addEventListener("click",()=>{if(run)run.consecutiveDeaths=0;saveFloorCheckpoint(true)});
$("inventory-close-top")?.addEventListener("click",returnToGameFromPanel);$("named-dossier-close-top")?.addEventListener("click",returnToGameFromPanel);
$("artefact-score-btn")?.addEventListener("click",()=>claimBanishmentArtefact("score"));$("artefact-xp-btn")?.addEventListener("click",()=>claimBanishmentArtefact("xp"));
UI.sound.addEventListener("click",toggleSound);$("fullscreen-btn")?.addEventListener("click",toggleFullscreen);UI.descend?.addEventListener("click",descendFloor);UI.extract?.addEventListener("click",extractRun);UI.inventoryClose?.addEventListener("click",toggleInventory);
$("again-btn").addEventListener("click",quitToMenu);

function isEditableKeyboardTarget(target){
  if(!(target instanceof Element))return false;
  if(target.matches("input,textarea,select,[contenteditable='true'],[contenteditable='']"))return true;
  return Boolean(target.closest("input,textarea,select,[contenteditable='true'],[contenteditable='']"));
}

addEventListener("keydown",e=>{
  // Forms and text editors own their keyboard input. This must happen before
  // the gameplay preventDefault calls so Space remains usable in bug reports,
  // emails, player names and any future editable admin/game field.
  if(isEditableKeyboardTarget(e.target))return;
  if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","Space","Tab"].includes(e.code))e.preventDefault();
  if(e.code==="Escape"){
    if(mode==="paused"){resumePausedRun();return}
    if(UI.itemInfo&&!UI.itemInfo.classList.contains("hidden")){hideItemInfo();return}
    if(UI.namedDossier&&!UI.namedDossier.classList.contains("hidden")){hideNamedDossier();return}
    if(UI.rulebook&&!UI.rulebook.classList.contains("hidden")){UI.rulebook.classList.add("hidden");return}
    if(UI.support&&!UI.support.classList.contains("hidden")){UI.support.classList.add("hidden");return}
    if(UI.shop&&!UI.shop.classList.contains("hidden")){closeShop();return}
    if(UI.savePanel&&!UI.savePanel.classList.contains("hidden")){if(savePromptReason==="rest"&&run)run.consecutiveDeaths=0;closeSavePrompt();return}
    if(mode==="inventory"){toggleInventory();pause();return}
    if(mode==="playing"||mode==="paused"){pause();return}
  }
  if(e.code==="KeyP"&&(mode==="playing"||mode==="paused")){if(mode==="paused")resumePausedRun();else pause();return}
  if(e.code==="KeyF"){toggleFullscreen();return}
  if(e.code==="Tab"&&["playing","inventory"].includes(mode)){toggleInventory();return}
  if(mode!=="playing")return;if(p1)setDir(p1,e.code);if(p2)setDir(p2,e.code);input.add(e.code);
  if(e.code==="Space"&&!e.repeat)queueAttack(p1);if(p2&&e.code==="Enter"&&!e.repeat)queueAttack(p2);if(e.code==="ShiftLeft"&&!e.repeat)dashPlayer(p1,d1()||p1.dir);if(p2&&e.code==="ControlRight"&&!e.repeat)dashPlayer(p2,d2()||p2.dir);if(e.code==="KeyE"&&!e.repeat)usePotion(p1);if(e.code==="KeyQ"&&!e.repeat)useUtility(p1);if(e.code==="KeyR"&&!e.repeat)useTeleport(p1);if(e.code==="KeyC"&&!e.repeat)closeNearbyDoor(p1);if(e.code==="KeyB"&&!e.repeat)useBanishment(p1);if(p2&&e.code==="KeyO"&&!e.repeat)usePotion(p2)
},{passive:false});
addEventListener("keyup",e=>input.delete(e.code));addEventListener("blur",()=>input.clear());document.addEventListener("visibilitychange",()=>{if(document.hidden)input.clear()});
canvas.addEventListener("pointerdown",()=>{if(document.body.dataset.runActive==="true")try{canvas.tabIndex=-1;canvas.focus({preventScroll:true})}catch(_){}});
refreshCollection();
net.setSolo("TITLE");mode="menu";setRunPresentation(false);document.body.dataset.gameReady="true";requestAnimationFrame(loop);

let gameResizeFrame=0;
function scheduleGameResize(){
  if(gameResizeFrame)return;
  gameResizeFrame=requestAnimationFrame(()=>{
    gameResizeFrame=0;
    try{resizeGameCanvas()}catch(error){console.warn("[Lost Sizzler] canvas resize failed safely",error)}
  });
}
window.__CCG_LOST_SIZZLER_SCHEDULE_RESIZE__=scheduleGameResize;
addEventListener("resize",scheduleGameResize,{passive:true});
document.addEventListener("fullscreenchange",()=>{syncFullscreenState();scheduleGameResize()});
if(window.ResizeObserver){
  const resizeTarget=document.querySelector(".canvas-wrap")||document.querySelector(".game-area");
  if(resizeTarget){
    try{window.__CCG_LOST_SIZZLER_RESIZE_OBSERVER__?.disconnect?.()}catch(_){}
    const observer=new ResizeObserver(scheduleGameResize);
    observer.observe(resizeTarget);
    window.__CCG_LOST_SIZZLER_RESIZE_OBSERVER__=observer;
  }
}
addEventListener("pagehide",()=>{
  if(gameResizeFrame)cancelAnimationFrame(gameResizeFrame);
  gameResizeFrame=0;
  try{window.__CCG_LOST_SIZZLER_RESIZE_OBSERVER__?.disconnect?.()}catch(_){}
  window.__CCG_LOST_SIZZLER_RESIZE_OBSERVER__=null;
},{once:true});
requestAnimationFrame(()=>{scheduleGameResize();syncFullscreenState()});