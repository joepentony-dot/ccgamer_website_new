/* The Lost Sizzler V10.42 — authoritative ordered bootstrap. */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V142_BOOTSTRAP__)return;
  window.__CCG_LOST_SIZZLER_V142_BOOTSTRAP__=true;

  const BUILD="V10.42 r2";
  const CACHE="20260909r32";
  const modules=[
    ["v10-42-procedural-overhaul.js","CCGLostSizzlerV142ProceduralOverhaul"],
    ["v10-42-five-depth-campaign.js","CCGLostSizzlerV142FiveDepthCampaign"],
    ["v10-42-floor-balance.js","CCGLostSizzlerV142FloorBalance"],
    ["v10-42-r6-biome-environment-director.js","CCGLostSizzlerV142R6BiomeEnvironmentDirector"],
    ["v10-42-r7-room-objective-director.js","CCGLostSizzlerV142R7RoomObjectiveDirector"],
    ["v10-42-r8-breakable-interaction-director.js","CCGLostSizzlerV142R8BreakableInteractionDirector"],
    ["v10-42-r9-breakable-presentation-director.js","CCGLostSizzlerV142R9BreakablePresentationDirector"],
    ["v10-42-r10-breakable-objective-runtime.js","CCGLostSizzlerV142R10BreakableObjectiveRuntime"],
    ["v10-42-r12-dynamic-encounter-director.js","CCGLostSizzlerV142R12DynamicEncounterDirector"],
    ["v10-42-r13-encounter-progression-runtime.js","CCGLostSizzlerV142R13EncounterProgressionRuntime"],
    ["v10-42-r14-combat-encounter-bridge.js","CCGLostSizzlerV142R14CombatEncounterBridge"],
    ["v10-42-r15-npc-expansion.js","CCGLostSizzlerV142R15NpcExpansion"],
    ["v10-42-r16-environment-presentation.js","CCGLostSizzlerV142R16EnvironmentPresentation"],
    ["v10-42-tutorial-campaign.js","CCGLostSizzlerV142TutorialCampaign"],
    ["v10-42-demo-paywall.js","CCGLostSizzlerV142DemoPaywall"],
    ["v10-42-zero-server-release.js","CCGLostSizzlerV142ZeroServerRelease"],
    ["v10-42-r3-retained-spy-inventory-seal.js","CCGLostSizzlerV142R3RetainedSpyInventorySeal"],
    ["v10-42-r2-controller-owner-seal.js","CCGLostSizzlerV142R2ControllerOwnerSeal"],
    ["v10-42-r5-spy-exit-movement-seal.js","CCGLostSizzlerV142R5SpyExitMovementSeal"],
    ["v10-42-r11-spy-packet-rejection-seal.js","CCGLostSizzlerV142R11SpyPacketRejectionSeal"],
    ["v10-42-warden-purpose-overhaul.js","CCGLostSizzlerV142WardenPurposeOverhaul"],
    ["v10-42-warden-domain-progression.js","CCGLostSizzlerV142WardenDomainProgression"],
    ["v10-42-warden-cleansing-effects.js","CCGLostSizzlerV142WardenCleansingEffects"],
    ["v10-42-warden-charge-routes.js","CCGLostSizzlerV142WardenChargeRoutes"],
    ["v10-42-warden-hunt-guidance.js","CCGLostSizzlerV142WardenHuntGuidance"],
    ["v10-42-warden-navigation-cues.js","CCGLostSizzlerV142WardenNavigationCues"],
    ["v10-42-warden-interface-consistency.js","CCGLostSizzlerV142WardenInterfaceConsistency"],
    ["v10-42-r1-stability.js","CCGLostSizzlerV142R1Stability"],
    ["v10-42-r18-solo-playtest-stability.js","CCGLostSizzlerV142R18SoloPlaytestStability"]
  ];
  const state={build:BUILD,cache:CACHE,ready:false,failed:false,loaded:[],pendingStartId:"",identityRestamps:0,identityTimers:[],controllerSealReady:false,controllerSealAttempts:0,r1ChestOwner:null,r1ChestOwnerRestores:0};
  window.CCGLostSizzlerV142Bootstrap=state;

  function setReleaseReady(value){
    if(document.body)document.body.dataset.releaseReady=value?"true":"false";
  }
  setReleaseReady(false);

  let releaseReadyObserver=null;
  function enforceReleaseReadyOwnership(){
    if(state.ready)return;
    if(document.body?.dataset?.releaseReady==="true")setReleaseReady(false);
  }
  function startReleaseReadyGuard(){
    if(releaseReadyObserver||typeof MutationObserver!=="function")return;
    releaseReadyObserver=new MutationObserver(enforceReleaseReadyOwnership);
    releaseReadyObserver.observe(document.documentElement,{subtree:true,attributes:true,attributeFilter:["data-release-ready"]});
    enforceReleaseReadyOwnership();
  }
  function stopReleaseReadyGuard(){
    releaseReadyObserver?.disconnect();
    releaseReadyObserver=null;
  }
  startReleaseReadyGuard();

  function stampBuild(){
    const buildMeta=document.querySelector('meta[name="ccg-lost-sizzler-build"]'),cacheMeta=document.querySelector('meta[name="ccg-lost-sizzler-cache"]');
    if(buildMeta&&buildMeta.content!==BUILD)buildMeta.content=BUILD;
    if(cacheMeta&&cacheMeta.content!==CACHE)cacheMeta.content=CACHE;
    const subtitle=document.querySelector(".v102-brand p"),expectedSubtitle="THE LOST SIZZLER — V10.42";
    if(subtitle&&subtitle.textContent!==expectedSubtitle)subtitle.textContent=expectedSubtitle;
    const badge=document.querySelector(".build-badge"),expectedBadge=`BUILD ${BUILD.toUpperCase()}`;
    if(badge&&badge.textContent!==expectedBadge)badge.textContent=expectedBadge;
    if(document.body){document.body.dataset.v142Build=BUILD;document.body.dataset.v142BootstrapReady=state.ready?"true":state.failed?"failed":"false"}
    state.identityRestamps+=1;
  }

  function scheduleIdentityRestamps(){
    for(const delay of [0,32,120,360,900,1800]){
      const timer=setTimeout(()=>{
        const index=state.identityTimers.indexOf(timer);if(index>=0)state.identityTimers.splice(index,1);
        stampBuild();
      },delay);
      state.identityTimers.push(timer);
    }
  }

  function clearIdentityRestamps(){
    for(const timer of state.identityTimers.splice(0))clearTimeout(timer);
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>{setReleaseReady(false);enforceReleaseReadyOwnership();stampBuild();scheduleIdentityRestamps()},{once:true});
  else{stampBuild();scheduleIdentityRestamps()}
  addEventListener("load",scheduleIdentityRestamps,{once:true});
  addEventListener("pagehide",()=>{clearIdentityRestamps();stopReleaseReadyGuard()},{once:true});

  function clearPendingBusy(){
    if(!state.pendingStartId)return;
    document.getElementById(state.pendingStartId)?.removeAttribute("aria-busy");
  }

  function blockedStart(event){
    if(state.ready||state.failed)return;
    const target=event.target instanceof Element?event.target.closest("#solo-btn,#continue-save-btn,#daily-btn,#split-btn,#tutorial-zone-btn"):null;
    if(!target)return;
    const paywall=window.CCGLostSizzlerV142DemoPaywall;
    if(paywall?.demoMode&&document.body?.dataset?.fullGameEntitled!=="true"&&target.id!=="tutorial-zone-btn"){
      event.preventDefault();event.stopImmediatePropagation();
      paywall.showPaywall?.({reason:"full-game"});
      return;
    }
    event.preventDefault();event.stopImmediatePropagation();
    clearPendingBusy();
    state.pendingStartId=target.id;
    target.setAttribute("aria-busy","true");
    const note=document.getElementById("menu-note");if(note)note.textContent="V10.42 systems are finishing their ordered startup. Your selected adventure will start automatically when the build is ready.";
  }
  document.addEventListener("click",blockedStart,true);

  function replayPendingStart(){
    const pendingId=state.pendingStartId;
    state.pendingStartId="";
    if(!pendingId)return;
    const target=document.getElementById(pendingId);
    target?.removeAttribute("aria-busy");
    queueMicrotask(()=>{
      if(!state.ready||state.failed||document.body.dataset.runActive==="true")return;
      const button=document.getElementById(pendingId);
      if(!button||button.disabled||!button.isConnected)return;
      button.click();
    });
  }

  function alreadyLoaded(marker){return Boolean(marker&&window[marker])}
  function loadOne(file,marker){
    if(alreadyLoaded(marker)){state.loaded.push(file);return Promise.resolve()}
    return new Promise((resolve,reject)=>{
      const existing=[...document.scripts].find(script=>String(script.src||"").includes(`/js/${file}`));
      if(existing){
        if(alreadyLoaded(marker)){state.loaded.push(file);resolve();return}
        existing.addEventListener("load",()=>{state.loaded.push(file);resolve()},{once:true});
        existing.addEventListener("error",()=>reject(new Error(`Failed to load ${file}`)),{once:true});
        return;
      }
      const script=document.createElement("script");script.async=false;script.src=`js/${file}?v=${CACHE}`;script.dataset.ccgV142Ordered="true";
      script.onload=()=>{state.loaded.push(file);resolve()};script.onerror=()=>reject(new Error(`Failed to load ${file}`));document.head.appendChild(script);
    })
  }

  function observeControllerSeal(){
    const seal=window.CCGLostSizzlerV142R2ControllerOwnerSeal;
    if(!seal||typeof seal.install!=="function")return false;
    state.controllerSealAttempts+=1;
    try{seal.install()}catch(_){}
    try{state.controllerSealReady=Boolean(seal.gateActive?.()&&window.update===seal.authoritativeBoundary?.())}catch(_){state.controllerSealReady=false}
    return state.controllerSealReady;
  }

  function promoteStage8MerchantOwner(){
    const top=window.openShop;
    if(typeof top!=="function")return false;
    if(top.__ccgStage8MerchantDialogue===true)return true;
    const seen=new Set();let owner=top;
    while(typeof owner==="function"&&!seen.has(owner)){
      if(owner.__ccgStage8MerchantDialogue===true){
        try{delete owner.__ccgStage8MerchantDialogue}catch(_){try{owner.__ccgStage8MerchantDialogue=false}catch(__){}}
        try{top.__ccgStage8MerchantDialogue=true;return true}catch(_){return false}
      }
      seen.add(owner);owner=owner.__ccgOriginal;
    }
    try{return Boolean(window.CCGLostSizzlerStage8NpcDialogue?.installMerchantDialogue?.())}catch(_){return false}
  }

  function chainHasR1ChestOwner(owner){
    const seen=new Set();let current=owner;
    while(typeof current==="function"&&!seen.has(current)){
      if(current.__ccgV142R1===true)return true;
      seen.add(current);current=typeof current.__ccgOriginal==="function"?current.__ccgOriginal:null;
    }
    return false;
  }

  function captureR1ChestOwner(){
    const owner=window.openChest;
    if(typeof owner==="function"&&owner.__ccgV142R1===true){
      state.r1ChestOwner=owner;
      return true;
    }
    return false;
  }

  function promoteR1ChestOwner(){
    const current=window.openChest,captured=state.r1ChestOwner;
    if(typeof current!=="function"||typeof captured!=="function")return false;
    if(chainHasR1ChestOwner(current))return true;
    if(current!==captured.__ccgOriginal)return false;
    window.openChest=captured;
    state.r1ChestOwnerRestores+=1;
    return true;
  }

  async function boot(){
    setReleaseReady(false);stampBuild();
    try{
      for(const [file,marker] of modules){
        await loadOne(file,marker);
        if(file==="v10-42-r1-stability.js")captureR1ChestOwner();
      }
      promoteR1ChestOwner();
      promoteStage8MerchantOwner();
      observeControllerSeal();
      state.ready=true;stopReleaseReadyGuard();setReleaseReady(true);stampBuild();scheduleIdentityRestamps();document.body.dataset.v142BootstrapReady="true";document.removeEventListener("click",blockedStart,true);
      const note=document.getElementById("menu-note");if(note)note.textContent="V10.42 READY — five new dungeon floors are loaded in verified order. Solo, Tutorial and 2P Split Screen run locally; Supabase account features remain available without making the core game depend on a paid multiplayer server.";
      window.dispatchEvent(new CustomEvent("ccg:v142-ready",{detail:{build:BUILD,cache:CACHE,loaded:[...state.loaded]}}));
      replayPendingStart();
    }catch(error){
      state.failed=true;state.error=String(error?.message||error);setReleaseReady(false);stampBuild();scheduleIdentityRestamps();document.body.dataset.v142BootstrapReady="failed";
      clearPendingBusy();state.pendingStartId="";
      const note=document.getElementById("menu-note");if(note)note.textContent=`V10.42 startup failed safely: ${state.error}. Refresh before starting a run.`;
      console.error("[Lost Sizzler V10.42] ordered bootstrap failed",error);
    }
  }

  boot();
})();
