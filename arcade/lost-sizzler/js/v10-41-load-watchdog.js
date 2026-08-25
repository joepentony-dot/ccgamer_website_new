/* The Lost Sizzler V10.41 — bounded loading watchdog and loader cleanup. */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V141_LOAD_WATCHDOG__)return;
  window.__CCG_LOST_SIZZLER_V141_LOAD_WATCHDOG__=true;

  const state={startedAt:performance.now(),lastTick:performance.now(),maxDelay:0,stalls:0,timer:0,finished:false};

  function loadingStatus(message){
    const node=document.getElementById("ccg-release-loading-status");
    if(node&&message&&node.textContent!==message)node.textContent=message;
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
    if(gate?.ready||gate?.failed)stopLoaderObservers();
  }

  window.addEventListener("ccg-lost-sizzler-cache-status",()=>queueMicrotask(syncCacheStatus));
  window.addEventListener("pagehide",stopLoaderObservers,{once:true});
  state.timer=setInterval(tick,250);
  tick();
  window.CCGLostSizzlerLoadWatchdog={state,stop:stopLoaderObservers};
})();