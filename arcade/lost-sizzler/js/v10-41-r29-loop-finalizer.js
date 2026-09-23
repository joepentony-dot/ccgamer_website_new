/* The Lost Sizzler V10.41 r29 — final animation-loop and mode-runtime ownership. */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V141_R29_LOOP_FINALIZER__)return;
  window.__CCG_LOST_SIZZLER_V141_R29_LOOP_FINALIZER__=true;

  const state={
    timer:0,reassertions:0,stableLoopSkips:0,lastLoop:null,
    spyRuntimeRequested:false,spyRuntimeReady:false,spyRuntimeError:"",
    spyNetworkRequested:false,spyNetworkReady:false,spyNetworkError:"",
    notificationRail:null,notificationObserver:null,notificationRailReady:false,notificationLive:false,
    notificationPending:false,notificationToastWrapped:false,notificationTopStabilised:0,
    spyHintAt:0,spyHintSuppressed:0
  };

  const releaseRevision=()=>String(document.querySelector('meta[name="ccg-lost-sizzler-cache"]')?.content||"20260825r29");

  function ensureFinalLoop(){
    const api=window.CCGLostSizzlerV141R29;
    if(!api?.install)return false;
    const before=window.loop;
    if(typeof before==="function"&&before.__ccgV141R29Stable){
      before.__ccgV141CrashContained=true;state.stableLoopSkips++;state.lastLoop=before;return true
    }
    try{api.install()}catch(error){try{console.error("[Lost Sizzler r29] final loop ownership install failed safely",error)}catch(_){}return false}
    const current=window.loop;
    if(typeof current!=="function"||!current.__ccgV141R29Stable)return false;
    current.__ccgV141CrashContained=true;
    if(current!==before)state.reassertions++;
    state.lastLoop=current;
    return true;
  }

  function ensureSpyRuntime(){
    if(window.CCGLostSizzlerV141R29SpyEngine){state.spyRuntimeReady=true;state.spyRuntimeError="";return true}
    if(state.spyRuntimeRequested)return false;
    const existing=document.querySelector('script[data-ccg-r29-spy-engine="true"]');
    if(existing){state.spyRuntimeRequested=true;return false}
    state.spyRuntimeRequested=true;
    const script=document.createElement("script");script.src=`js/v10-41-r29-spy-engine-isolation.js?v=${encodeURIComponent(releaseRevision())}`;script.async=false;script.dataset.ccgR29SpyEngine="true";
    script.addEventListener("load",()=>{state.spyRuntimeReady=Boolean(window.CCGLostSizzlerV141R29SpyEngine);state.spyRuntimeError=state.spyRuntimeReady?"":"Spy runtime loaded without registering its engine."},{once:true});
    script.addEventListener("error",()=>{state.spyRuntimeError="Unable to load isolated Spy Vs Spy runtime.";state.spyRuntimeRequested=false},{once:true});
    document.body.appendChild(script);return false;
  }

  function ensureSpyNetwork(){
    if(window.CCGLostSizzlerV141R29SpyNetwork){state.spyNetworkReady=true;state.spyNetworkError="";return true}
    if(!window.CCGLostSizzlerV141R29SpyEngine)return false;
    if(state.spyNetworkRequested)return false;
    const existing=document.querySelector('script[data-ccg-r29-spy-network="true"]');
    if(existing){state.spyNetworkRequested=true;return false}
    state.spyNetworkRequested=true;
    const script=document.createElement("script");script.src=`js/v10-41-r29-spy-network-isolation.js?v=${encodeURIComponent(releaseRevision())}`;script.async=false;script.dataset.ccgR29SpyNetwork="true";
    script.addEventListener("load",()=>{state.spyNetworkReady=Boolean(window.CCGLostSizzlerV141R29SpyNetwork);state.spyNetworkError=state.spyNetworkReady?"":"Spy network runtime loaded without registering its transport."},{once:true});
    script.addEventListener("error",()=>{state.spyNetworkError="Unable to load isolated Spy Vs Spy network transport.";state.spyNetworkRequested=false},{once:true});
    document.body.appendChild(script);return false;
  }

  function notificationActuallyLive(rail){
    if(!rail)return false;
    return Boolean(rail.querySelector("#pickup-toast.show,.ccg-rating-rail:not(.hidden),.ccg-important-notice.show"));
  }

  function enforceOrdinaryRailGeometry(rail){
    const area=rail?.closest?.(".v102-game-area");
    const toast=rail?.querySelector?.("#pickup-toast");
    const shortLandscape=Boolean(window.matchMedia?.("(min-width:821px) and (max-height:500px)")?.matches);
    if(shortLandscape){
      if(area){
        area.style.setProperty("display","grid","important");
        area.style.setProperty("grid-template-columns","minmax(0,1fr)","important");
        area.style.setProperty("grid-template-rows","minmax(0,1fr) 20px","important");
        area.style.setProperty("gap","0","important");
        area.dataset.ccgR51ShortRail="true";
      }
      rail.style.setProperty("box-sizing","border-box","important");
      rail.style.setProperty("height","20px","important");
      rail.style.setProperty("min-height","20px","important");
      rail.style.setProperty("max-height","20px","important");
      rail.style.setProperty("padding","0","important");
      rail.dataset.ccgR51ShortRail="true";
      if(toast){
        toast.style.setProperty("box-sizing","border-box","important");
        toast.style.setProperty("position","static","important");
        toast.style.setProperty("inset","auto","important");
        toast.style.setProperty("transform","none","important");
        toast.style.setProperty("display","flex","important");
        toast.style.setProperty("flex-direction","row","important");
        toast.style.setProperty("align-items","center","important");
        toast.style.setProperty("justify-content","flex-start","important");
        toast.style.setProperty("height","19px","important");
        toast.style.setProperty("min-height","19px","important");
        toast.style.setProperty("max-height","19px","important");
        toast.style.setProperty("padding","1px 8px","important");
        toast.style.setProperty("overflow","hidden","important");
        toast.dataset.ccgR51ShortRail="true";
      }
      return true;
    }
    if(area?.dataset?.ccgR51ShortRail==="true"){
      for(const prop of ["display","grid-template-columns","grid-template-rows","gap"])area.style.removeProperty(prop);
      delete area.dataset.ccgR51ShortRail;
    }
    if(rail.dataset?.ccgR51ShortRail==="true"){
      for(const prop of ["box-sizing","height","min-height","max-height","padding"])rail.style.removeProperty(prop);
      delete rail.dataset.ccgR51ShortRail;
    }
    if(toast?.dataset?.ccgR51ShortRail==="true"){
      for(const prop of ["box-sizing","position","inset","transform","display","flex-direction","align-items","justify-content","height","min-height","max-height","padding","overflow"])toast.style.removeProperty(prop);
      delete toast.dataset.ccgR51ShortRail;
    }
    return false;
  }

  function setNotificationRailDisplay(rail,live){
    if(!rail)return false;
    /* Solo and Tutorial reserve a compact, stable lower rail. Reintroducing
       * the historical display:contents owner here promotes routine reports
       * back into the canvas and turns a short pickup into a large overlay. */
    if(String(document.body?.dataset?.specialMode||"")!=="horde-survivor"){
      rail.style.setProperty("display","block","important");
      enforceOrdinaryRailGeometry(rail);
      state.notificationRail=rail;state.notificationRailReady=true;state.notificationLive=Boolean(live);
      return true;
    }
    rail.style.setProperty("display",live?"contents":"none","important");
    state.notificationRail=rail;state.notificationRailReady=true;state.notificationLive=Boolean(live);
    return true;
  }

  function syncNotificationRail(){
    const rail=state.notificationRail||document.querySelector(".ccg-game>.game-area>.game-message-rail");
    if(!rail)return false;
    const actual=notificationActuallyLive(rail);
    if(actual)state.notificationPending=false;
    return setNotificationRailDisplay(rail,actual||state.notificationPending);
  }

  function ensureNotificationRailGuard(){
    const rail=document.querySelector(".ccg-game>.game-area>.game-message-rail");
    if(!rail)return false;
    if(state.notificationRail!==rail||!state.notificationObserver){
      try{state.notificationObserver?.disconnect?.()}catch(_){}
      state.notificationRail=rail;
      state.notificationObserver=new MutationObserver(syncNotificationRail);
      state.notificationObserver.observe(rail,{subtree:true,childList:true,attributes:true,attributeFilter:["class","hidden","aria-hidden"]});
    }
    return syncNotificationRail();
  }

  function toastChainHasRailOwner(fn){
    let current=fn;
    for(let depth=0;depth<24&&typeof current==="function";depth++){
      if(current.__ccgV141R29NotificationRailOwner)return true;
      current=current.__ccgOriginal||current.__ccgV141Original||null;
    }
    return false;
  }

  function spyGuidanceSuppressed(title){
    if(String(title||"").toUpperCase()!=="MOVE BESIDE FURNITURE")return false;
    let spy=false;
    try{spy=window.CCGLostSizzlerSpecialModes?.active?.type==="sizzler-saboteurs"||document.body?.dataset?.specialMode==="sizzler-saboteurs"}catch(_){}
    if(!spy){state.spyHintAt=0;return false}
    const runtime=window.CCGLostSizzlerV141R29,runtimeState=runtime?.state,now=performance.now(),cooldown=Math.max(250,Number(runtime?.SPY_HINT_COOLDOWN_MS)||1800);
    const last=Math.max(Number(state.spyHintAt||0),Number(runtimeState?.lastSpyHintAt||0));
    if(last>0&&now-last<cooldown){
      state.spyHintSuppressed++;
      if(runtimeState)runtimeState.spyHintsSuppressed=Number(runtimeState.spyHintsSuppressed||0)+1;
      return true;
    }
    state.spyHintAt=now;
    return false;
  }

  function stabiliseToastOwner(fn){
    if(typeof fn!=="function")return false;
    // The V10.41 major-notification hardener treats this marker as final
    // priority ownership. Setting it on the outer r29 owner prevents the
    // legacy 300 ms hardener and the r29 80 ms Spy guard from endlessly
    // wrapping one another and growing the showToast call chain.
    if(fn.__ccgV141Priority!==true){fn.__ccgV141Priority=true;state.notificationTopStabilised++}
    return true;
  }

  function ensureNotificationToastOwner(){
    const current=window.showToast;
    if(typeof current!=="function")return false;
    if(toastChainHasRailOwner(current)){
      stabiliseToastOwner(current);
      state.notificationToastWrapped=true;
      return true;
    }
    const wrapped=function showToastV141R29NotificationRail(title){
      // A late installer can become the outer showToast owner between 40 ms
      // maintenance passes. Reassert priority synchronously during the real
      // dispatch so notification ownership cannot be sampled in that race.
      stabiliseToastOwner(window.showToast);
      // Keep the final notification owner capable of enforcing the Spy hint
      // cooldown even if a late legacy wrapper temporarily displaces the r29
      // throttle from the visible showToast ancestry. This is notification
      // ownership only; it does not intercept the gameplay update loop.
      if(spyGuidanceSuppressed(title))return false;
      const result=current.apply(this,arguments);
      const rail=state.notificationRail||document.querySelector(".ccg-game>.game-area>.game-message-rail");
      const renderedTitle=String(document.getElementById("pickup-title")?.textContent||"");
      // displayToast removes .show and restores it on the next animation frame
      // to restart its transition. Keep the rail live during that one-frame
      // hand-off, otherwise the legacy empty-rail rule can collapse the parent
      // between remove/add and produce a visible flash or a false hidden state.
      if(result!==false&&renderedTitle===String(title||"")){
        state.notificationPending=true;
        setNotificationRailDisplay(rail,true);
      }
      requestAnimationFrame(()=>{
        syncNotificationRail();
        requestAnimationFrame(()=>{state.notificationPending=false;syncNotificationRail()});
      });
      return result;
    };
    wrapped.__ccgV141R29NotificationRailOwner=true;
    wrapped.__ccgOriginal=current;
    wrapped.__ccgV141Priority=true;
    window.showToast=wrapped;state.notificationToastWrapped=true;return true;
  }

  function maintain(){
    ensureFinalLoop();ensureSpyRuntime();ensureSpyNetwork();ensureNotificationRailGuard();ensureNotificationToastOwner();
  }

  maintain();
  state.timer=setInterval(maintain,40);
  addEventListener("pagehide",()=>{
    if(state.timer)clearInterval(state.timer);
    try{state.notificationObserver?.disconnect?.()}catch(_){}
    state.notificationObserver=null;
  },{once:true});

  window.CCGLostSizzlerV141R29LoopFinalizer={ensureFinalLoop,ensureSpyRuntime,ensureSpyNetwork,ensureNotificationRailGuard,ensureNotificationToastOwner,spyGuidanceSuppressed,syncNotificationRail,get state(){return state}};
})();
