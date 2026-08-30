/* The Lost Sizzler V10.41 — bounded loading watchdog and loader cleanup. */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V141_LOAD_WATCHDOG__)return;
  window.__CCG_LOST_SIZZLER_V141_LOAD_WATCHDOG__=true;

  const state={
    startedAt:performance.now(),lastTick:performance.now(),maxDelay:0,stalls:0,timer:0,finished:false,
    pendingSolo:false,soloReplayQueued:false,soloReplays:0
  };

  function loadingStatus(message){
    const node=document.getElementById("ccg-release-loading-status");
    if(node&&message&&node.textContent!==message)node.textContent=message;
  }

  function releaseReady(){
    try{return document.body?.dataset?.releaseReady==="true"||window.CCGLostSizzlerReleaseGate?.state?.ready===true}catch(_){return false}
  }

  function cancelPendingSoloForAnotherChoice(event){
    if(!state.pendingSolo)return;
    const target=event?.target?.closest?.("#tutorial-zone-btn,#create-btn,#horde-mode-btn,#saboteurs-mode-btn,#daily-btn,#split-btn,#join-btn,#continue-save-btn");
    if(target)state.pendingSolo=false;
  }

  function capturePreReleaseSolo(event){
    cancelPendingSoloForAnotherChoice(event);
    const button=event?.target?.closest?.("#solo-btn");
    if(!button||releaseReady()||document.body?.dataset?.runActive==="true")return;

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
    if(!releaseReady())return false;
    const button=document.getElementById("solo-btn");if(!button)return false;

    state.soloReplayQueued=true;
    queueMicrotask(()=>{
      state.soloReplayQueued=false;
      if(!state.pendingSolo)return;
      if(document.body?.dataset?.runActive==="true"){state.pendingSolo=false;return}
      if(!releaseReady())return;
      state.pendingSolo=false;state.soloReplays++;
      button.click();
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
    state.finished=true;
    if(state.timer){clearInterval(state.timer);state.timer=0}
  }

  function tick(){
    const now=performance.now(),delay=now-state.lastTick;state.lastTick=now;state.maxDelay=Math.max(state.maxDelay,delay);
    if(delay>1800)state.stalls++;
    syncCacheStatus();
    const gate=window.CCGLostSizzlerReleaseGate?.state;
    if(gate?.ready){replayPendingSolo();stopLoaderObservers()}
    else if(gate?.failed){state.pendingSolo=false;stopLoaderObservers()}
  }

  document.addEventListener("click",capturePreReleaseSolo,true);
  window.addEventListener("ccg-lost-sizzler-cache-status",()=>queueMicrotask(syncCacheStatus));
  window.addEventListener("pagehide",()=>{
    state.pendingSolo=false;
    document.removeEventListener("click",capturePreReleaseSolo,true);
    stopLoaderObservers();
  },{once:true});
  state.timer=setInterval(tick,250);
  tick();
  window.CCGLostSizzlerLoadWatchdog={state,stop:stopLoaderObservers,replayPendingSolo};
})();