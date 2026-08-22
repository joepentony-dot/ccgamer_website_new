"use strict";
net=new window.CCGNetwork.RoomNetwork({onMembers,onPacket});

function hideStaticPanels(){UI.rulebook?.classList.add("hidden");UI.support?.classList.add("hidden");UI.shop?.classList.add("hidden");UI.savePanel?.classList.add("hidden");UI.artefactChoice?.classList.add("hidden");pendingBanishmentReward=null;activeShop=null;hideItemInfo();hideNamedDossier()}
function closeInventoryForMenu(){if(UI.inventory&&!UI.inventory.classList.contains("hidden"))UI.inventory.classList.add("hidden");if(mode==="inventory")mode="playing"}
function clearAbandonedRun(){
  world=null;host=null;p1=null;p2=null;run=null;window.__CCG_WORLD=null;score=0;won=false;floorEntryCheckpoint=null;savePromptReason="";pendingBanishmentReward=null;activeShop=null;
  for(const list of [bullets,enemyBullets,particles,rings,floaters,hazards,levelQueue,toastQueue])list.length=0;
  for(const collection of [pendingItems,questDone,remote,enemyVisuals,cameras,explored,campStates,roomVisits,playerTrails])collection.clear();
  for(const key of Object.keys(stats))stats[key]=0;enemyCD=projectileCD=sendCD=worldCD=surroundCD=specialCD=0;move1=move2=fire1=fire2=0;toastTimer=0;lowHealthCD=0;inventoryReminderMs=300000;lastAmbientMessage="";shake=0;damageFlash=0;input.clear();ctx.clearRect(0,0,canvas.width,canvas.height);ctx.fillStyle=P.black;ctx.fillRect(0,0,canvas.width,canvas.height);
  const radar=$("radar-canvas"),radarContext=radar?.getContext?.("2d");radarContext?.clearRect(0,0,radar.width,radar.height);
}
async function quitToMenu(){
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
  if(mode==="lobby"){window.CCGLostSizzlerV106?.leaveLobby?.("You left the online room.");return}
  if(mode==="ended"){quitToMenu();return}
  openPauseMenu()
}
$("solo-btn").addEventListener("click",startSolo);$("continue-save-btn")?.addEventListener("click",resumeSavedRun);$("daily-btn")?.addEventListener("click",startDaily);$("split-btn").addEventListener("click",startSplit);$("create-btn").addEventListener("click",createRoom);$("join-btn").addEventListener("click",joinRoom);$("resume-btn").addEventListener("click",()=>pause(true));$("pause-quit-btn")?.addEventListener("click",quitToMenu);$("quit-btn")?.addEventListener("click",handleHeaderQuit);
$("rulebook-btn")?.addEventListener("click",showRulebook);$("rulebook-close-btn")?.addEventListener("click",()=>UI.rulebook?.classList.add("hidden"));$("support-btn")?.addEventListener("click",showSupport);$("support-close-btn")?.addEventListener("click",()=>UI.support?.classList.add("hidden"));$("share-btn")?.addEventListener("click",shareQuest);$("item-info-close")?.addEventListener("click",hideItemInfo);$("named-dossier-btn")?.addEventListener("click",showNamedDossier);
$("inventory-dossier-btn")?.addEventListener("click",showNamedDossier);$("named-dossier-close")?.addEventListener("click",hideNamedDossier);$("shop-close")?.addEventListener("click",closeShop);$("save-now-btn")?.addEventListener("click",()=>{saveFloorCheckpoint(false);closeSavePrompt()});$("save-continue-btn")?.addEventListener("click",()=>{if(savePromptReason==="rest"&&run)run.consecutiveDeaths=0;closeSavePrompt()});$("save-return-btn")?.addEventListener("click",()=>{if(run)run.consecutiveDeaths=0;saveFloorCheckpoint(true)});
$("inventory-close-top")?.addEventListener("click",returnToGameFromPanel);$("named-dossier-close-top")?.addEventListener("click",returnToGameFromPanel);
$("artefact-score-btn")?.addEventListener("click",()=>claimBanishmentArtefact("score"));$("artefact-xp-btn")?.addEventListener("click",()=>claimBanishmentArtefact("xp"));
UI.sound.addEventListener("click",toggleSound);$("fullscreen-btn")?.addEventListener("click",toggleFullscreen);UI.descend?.addEventListener("click",descendFloor);UI.extract?.addEventListener("click",extractRun);UI.inventoryClose?.addEventListener("click",toggleInventory);
$("again-btn").addEventListener("click",quitToMenu);

addEventListener("keydown",e=>{
  if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","Space","Tab"].includes(e.code))e.preventDefault();
  if(e.code==="Escape"){
    if(mode==="paused"){pause();return}
    if(UI.itemInfo&&!UI.itemInfo.classList.contains("hidden")){hideItemInfo();return}
    if(UI.namedDossier&&!UI.namedDossier.classList.contains("hidden")){hideNamedDossier();return}
    if(UI.rulebook&&!UI.rulebook.classList.contains("hidden")){UI.rulebook.classList.add("hidden");return}
    if(UI.support&&!UI.support.classList.contains("hidden")){UI.support.classList.add("hidden");return}
    if(UI.shop&&!UI.shop.classList.contains("hidden")){closeShop();return}
    if(UI.savePanel&&!UI.savePanel.classList.contains("hidden")){if(savePromptReason==="rest"&&run)run.consecutiveDeaths=0;closeSavePrompt();return}
    if(mode==="inventory"){toggleInventory();pause();return}
    if(mode==="playing"||mode==="paused"){pause();return}
  }
  if(e.code==="KeyP"&&(mode==="playing"||mode==="paused")){pause();return}
  if(e.code==="KeyM"){toggleSound();return}if(e.code==="KeyF"){toggleFullscreen();return}if(e.code==="Tab"&&["playing","inventory"].includes(mode)){toggleInventory();return}
  if(mode!=="playing")return;if(p1)setDir(p1,e.code);if(p2)setDir(p2,e.code);input.add(e.code);
  if(e.code==="Space"&&!e.repeat)firePlayer(p1,d1());if(p2&&e.code==="Enter"&&!e.repeat)firePlayer(p2,d2());if(e.code==="ShiftLeft"&&!e.repeat)dashPlayer(p1,d1()||p1.dir);if(p2&&e.code==="ControlRight"&&!e.repeat)dashPlayer(p2,d2()||p2.dir);if(e.code==="KeyE"&&!e.repeat)usePotion(p1);if(e.code==="KeyQ"&&!e.repeat)useUtility(p1);if(e.code==="KeyR"&&!e.repeat)useTeleport(p1);if(e.code==="KeyC"&&!e.repeat)closeNearbyDoor(p1);if(e.code==="KeyB"&&!e.repeat)useBanishment(p1);if(p2&&e.code==="KeyO"&&!e.repeat)usePotion(p2)
},{passive:false});
addEventListener("keyup",e=>input.delete(e.code));addEventListener("blur",()=>input.clear());document.addEventListener("visibilitychange",()=>{if(document.hidden)input.clear()});
refreshCollection();
net.setSolo("TITLE");mode="menu";setRunPresentation(false);document.body.dataset.gameReady="true";requestAnimationFrame(loop);
addEventListener("resize",()=>requestAnimationFrame(resizeGameCanvas));document.addEventListener("fullscreenchange",syncFullscreenState);if(window.ResizeObserver){new ResizeObserver(()=>resizeGameCanvas()).observe(document.querySelector(".game-area"))}requestAnimationFrame(()=>{resizeGameCanvas();syncFullscreenState()});
