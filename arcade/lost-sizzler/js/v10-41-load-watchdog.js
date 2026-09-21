/* The Lost Sizzler V10.41 — bounded loading watchdog and loader cleanup. */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V141_LOAD_WATCHDOG__)return;
  window.__CCG_LOST_SIZZLER_V141_LOAD_WATCHDOG__=true;

  const EXPECTED_MODULES=108;
  const state={
    startedAt:performance.now(),lastTick:performance.now(),maxDelay:0,stalls:0,timer:0,finished:false,
    pendingSolo:false,soloReplayQueued:false,soloReplays:0,soloIntentSerial:0,soloRecoveries:0,soloRecoveryTimer:0,soloLivenessObserver:null,
    moduleObserver:null,loadingTimer:0,modulesReady:0,moduleKeys:new Set(),moduleTotalKeys:new Set(),expectedModules:EXPECTED_MODULES,loadingStage:0,loadingStages:[0],
    r57Timer:0,r57Loaded:false
  };

  // The C64 Dungeon Carnage release is playable on its public game page. These
  // compatibility probes deliberately stay false for older runtime layers that
  // still query them; account/authentication ownership remains with the site.
  const publicBetaClosed=()=>false;
  const publicPlayLocked=()=>false;

  function loadingStatus(message){
    const node=document.getElementById("ccg-release-loading-status");
    if(node&&message&&node.textContent!==message)node.textContent=message;
  }

  function releaseReady(){
    try{
      const build=String(document.querySelector('meta[name="ccg-lost-sizzler-build"]')?.content||"").toUpperCase();
      if(build.startsWith("V10.42")){
        const v142=window.CCGLostSizzlerV142Bootstrap;
        return Boolean(v142?.ready===true&&document.body?.dataset?.releaseReady==="true"&&document.body?.dataset?.v142BootstrapReady==="true")
      }
      return document.body?.dataset?.releaseReady==="true"||window.CCGLostSizzlerReleaseGate?.state?.ready===true
    }catch(_){return false}
  }

  function moduleScript(node){
    if(!(node instanceof HTMLScriptElement)||!node.src)return false;
    return [...node.attributes].some(attr=>attr.name.startsWith("data-ccg-"));
  }

  function noteModule(node){
    if(!moduleScript(node))return;
    let key="";try{key=new URL(node.src,location.href).pathname}catch(_){key=String(node.src||"").split("?")[0]}
    if(!key)return;
    state.moduleTotalKeys.add(key);
    if(state.moduleKeys.has(key))return;
    const ready=()=>{
      if(state.moduleKeys.has(key))return;
      state.moduleKeys.add(key);state.modulesReady++;
      syncLoadingStage();
    };
    if(node.dataset?.r57LoadSettled==="true"){ready();return}
    node.addEventListener("load",()=>{node.dataset.r57LoadSettled="true";ready()},{once:true});
    node.addEventListener("error",()=>{node.dataset.r57LoadSettled="true";ready()},{once:true});
  }

  function totalModules(){
    return Math.max(EXPECTED_MODULES,state.moduleTotalKeys.size)
  }

  function calculatedLoadingStage(){
    if(releaseReady())return 100;
    const total=totalModules(),ready=Math.min(total,Math.max(0,state.modulesReady));
    if(!ready)return 0;
    return Math.min(99,Math.max(1,Math.round((ready/total)*99)))
  }

  function writeLoadingStage(stage){
    const next=Math.max(0,Math.min(100,Math.round(Number(stage)||0)));
    const value=next===100?100:Math.max(state.loadingStage,next);
    const progress=document.getElementById("ccg-release-loading-progress"),percent=document.getElementById("ccg-release-loading-percent");
    if(progress&&Number(progress.value)!==value)progress.value=value;
    if(percent&&percent.textContent!==`${value}%`)percent.textContent=`${value}%`;
    const v136=window.CCGLostSizzlerV136?.state;if(v136&&Number(v136.progress)!==value)v136.progress=value;
    if(value!==state.loadingStage){state.loadingStage=value;if(state.loadingStages.at(-1)!==value)state.loadingStages.push(value)}
  }

  function syncLoadingStage(){
    const total=totalModules(),ready=Math.min(total,Math.max(0,state.modulesReady)),stage=calculatedLoadingStage();writeLoadingStage(stage);
    if(stage>=100)loadingStatus("Game systems ready.");
    else if(ready>=total)loadingStatus(`Finalising game systems… ${ready} / ${total} modules ready.`);
    else loadingStatus(`Loading game modules… ${ready} / ${total} ready.`);
  }
  function installStagedLoader(){
    const start=()=>{
      document.querySelectorAll("script[src]").forEach(noteModule);
      state.moduleObserver=new MutationObserver(records=>{for(const record of records)for(const node of record.addedNodes){if(node instanceof HTMLScriptElement)noteModule(node);else node?.querySelectorAll?.("script[src]")?.forEach?.(noteModule)}});
      state.moduleObserver.observe(document.documentElement,{childList:true,subtree:true});
      state.loadingTimer=setInterval(()=>{syncLoadingStage();if(releaseReady()){writeLoadingStage(100);clearInterval(state.loadingTimer);state.loadingTimer=0}},120);
      syncLoadingStage();
    };
    if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});else start();
  }

  function clearSoloLiveness(invalidate=true){
    if(invalidate)state.soloIntentSerial++;
    if(state.soloRecoveryTimer)clearTimeout(state.soloRecoveryTimer);
    state.soloRecoveryTimer=0;
    try{state.soloLivenessObserver?.disconnect?.()}catch(_){}
    state.soloLivenessObserver=null;
  }

  function cancelPendingSoloForAnotherChoice(event){
    const target=event?.target?.closest?.("#tutorial-zone-btn,#create-btn,#horde-mode-btn,#saboteurs-mode-btn,#daily-btn,#split-btn,#join-btn,#continue-save-btn");
    if(!target)return;
    state.pendingSolo=false;
    clearSoloLiveness(true);
  }

  function scheduleSoloLivenessCheck(){
    clearSoloLiveness(false);
    const serial=++state.soloIntentSerial;
    if(document.body){
      const observer=new MutationObserver(()=>{
        if(serial!==state.soloIntentSerial){observer.disconnect();if(state.soloLivenessObserver===observer)state.soloLivenessObserver=null;return}
        if(document.body?.dataset?.runActive!=="true")return;
        if(state.soloRecoveryTimer)clearTimeout(state.soloRecoveryTimer);
        state.soloRecoveryTimer=0;
        observer.disconnect();if(state.soloLivenessObserver===observer)state.soloLivenessObserver=null;
        state.soloIntentSerial++;
      });
      observer.observe(document.body,{attributes:true,attributeFilter:["data-run-active"]});
      state.soloLivenessObserver=observer;
    }
    state.soloRecoveryTimer=setTimeout(()=>{
      state.soloRecoveryTimer=0;
      try{state.soloLivenessObserver?.disconnect?.()}catch(_){}state.soloLivenessObserver=null;
      if(serial!==state.soloIntentSerial||publicPlayLocked()||document.body?.dataset?.runActive==="true"||!releaseReady())return;
      const menu=document.getElementById("menu");if(!menu||menu.classList.contains("hidden"))return;
      try{window.CCGLostSizzlerModeRuntime?.resetModeTransient?.("Solo launch liveness recovery")}catch(_){}
      try{window.CCGLostSizzlerV141R30?.assertNormalRuntimeOwnership?.("Solo launch liveness recovery")}catch(_){}
      try{delete document.body.dataset.specialMode;delete document.body.dataset.hordeSolo}catch(_){}
      state.soloRecoveries++;
      const guidance=window.CCGLostSizzlerTutorialGuidanceV123;
      if(typeof guidance?.launchSolo==="function")guidance.launchSolo(false);else document.getElementById("solo-btn")?.click();
    },3500);
  }

  function capturePreReleaseSolo(event){
    cancelPendingSoloForAnotherChoice(event);
    const button=event?.target?.closest?.("#solo-btn");
    if(!button||publicPlayLocked()||document.body?.dataset?.runActive==="true")return;
    if(releaseReady()){scheduleSoloLivenessCheck();return}

    // A player can click Play Solo after the core page is interactive but while
    // late release modules are still finishing. Do not let that user gesture
    // disappear into a half-installed runtime. Hold one bounded intent and
    // replay it once the authoritative release gate reports ready.
    state.pendingSolo=true;
    event.preventDefault();
    event.stopImmediatePropagation();
    loadingStatus("Finishing game systems… your Solo run will start automatically.");
  }

  function replayPendingSolo(){
    if(!state.pendingSolo||state.soloReplayQueued)return false;
    if(document.body?.dataset?.runActive==="true"){state.pendingSolo=false;return false}
    if(!releaseReady()||publicPlayLocked())return false;
    const button=document.getElementById("solo-btn");if(!button)return false;

    state.soloReplayQueued=true;
    queueMicrotask(()=>{
      state.soloReplayQueued=false;
      if(!state.pendingSolo)return;
      if(document.body?.dataset?.runActive==="true"){state.pendingSolo=false;return}
      if(!releaseReady()||publicPlayLocked())return;
      state.pendingSolo=false;state.soloReplays++;
      button.click();
      scheduleSoloLivenessCheck();
    });
    return true;
  }

  function syncCacheStatus(){
    const guard=window.CCGLostSizzlerCacheGuard?.state;
    if(!guard)return;
    if(guard.running)loadingStatus("Refreshing cached Lost Sizzler files…");
    else if(guard.done&&guard.needed&&!guard.timedOut)loadingStatus(guard.errors?.length?"Cache refresh completed with a warning. Preparing modules…":"Cached game files refreshed. Preparing modules…");
  }

  function stopLoaderObservers(){
    const v136=window.CCGLostSizzlerV136?.state;
    try{v136?.observer?.disconnect?.()}catch(_){}
    if(v136?.loadingTimer){clearInterval(v136.loadingTimer);v136.loadingTimer=0}
    try{state.moduleObserver?.disconnect?.()}catch(_){}
    if(state.loadingTimer){clearInterval(state.loadingTimer);state.loadingTimer=0}
    if(releaseReady())writeLoadingStage(100);
    state.finished=true;
    if(state.timer){clearInterval(state.timer);state.timer=0}
  }

  function ensureR57(){
    if(window.CCGLostSizzlerV141R57DesktopPrepStability){state.r57Loaded=true;if(state.r57Timer){clearInterval(state.r57Timer);state.r57Timer=0}return true}
    if(!window.CCGLostSizzlerV141R56PlaytestCompletion)return false;
    if(document.querySelector('script[data-ccg-v141-r57-desktop-prep-stability="true"]'))return false;
    const script=document.createElement("script"),rev=String(document.querySelector('meta[name="ccg-lost-sizzler-cache"]')?.content||document.querySelector('meta[name="ccg-lost-sizzler-build"]')?.content||Date.now());
    script.src=`js/v10-41-r57-desktop-prep-stability.js?v=${encodeURIComponent(rev)}`;script.async=false;script.dataset.ccgV141R57DesktopPrepStability="true";document.head.appendChild(script);return true
  }

  function tick(){
    const now=performance.now(),delay=now-state.lastTick;state.lastTick=now;state.maxDelay=Math.max(state.maxDelay,delay);
    if(delay>1800)state.stalls++;
    syncCacheStatus();
    const gate=window.CCGLostSizzlerReleaseGate?.state;
    if(releaseReady()){replayPendingSolo();stopLoaderObservers()}
    else if(gate?.failed||window.CCGLostSizzlerV142Bootstrap?.failed===true){state.pendingSolo=false;stopLoaderObservers()}
  }

  installStagedLoader();
  document.addEventListener("click",capturePreReleaseSolo,true);
  window.addEventListener("ccg-lost-sizzler-cache-status",()=>queueMicrotask(syncCacheStatus));
  window.addEventListener("pagehide",()=>{
    state.pendingSolo=false;clearSoloLiveness(true);
    document.removeEventListener("click",capturePreReleaseSolo,true);
    try{state.moduleObserver?.disconnect?.()}catch(_){}
    if(state.r57Timer)clearInterval(state.r57Timer);state.r57Timer=0;
    stopLoaderObservers();
  },{once:true});
  state.timer=setInterval(tick,250);
  state.r57Timer=setInterval(ensureR57,100);
  tick();ensureR57();
  window.CCGLostSizzlerLoadWatchdog={state,ownsLoadingProgress:true,expectedModules:EXPECTED_MODULES,totalModules,stop:stopLoaderObservers,replayPendingSolo,scheduleSoloLivenessCheck,clearSoloLiveness,syncLoadingStage,publicPlayLocked,publicBetaClosed,ensureR57};
})();
