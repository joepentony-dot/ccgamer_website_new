/* The Lost Sizzler V10.41 r29 — final animation-loop and mode-runtime ownership. */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V141_R29_LOOP_FINALIZER__)return;
  window.__CCG_LOST_SIZZLER_V141_R29_LOOP_FINALIZER__=true;

  const state={timer:0,reassertions:0,lastLoop:null,spyRuntimeRequested:false,spyRuntimeReady:false,spyRuntimeError:""};

  function ensureFinalLoop(){
    const api=window.CCGLostSizzlerV141R29;
    if(!api?.install)return false;
    const before=window.loop;
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
    const rev=String(document.querySelector('meta[name="ccg-lost-sizzler-cache"]')?.content||"20260825r29");
    const script=document.createElement("script");script.src=`js/v10-41-r29-spy-engine-isolation.js?v=${encodeURIComponent(rev)}`;script.async=false;script.dataset.ccgR29SpyEngine="true";
    script.addEventListener("load",()=>{state.spyRuntimeReady=Boolean(window.CCGLostSizzlerV141R29SpyEngine);state.spyRuntimeError=state.spyRuntimeReady?"":"Spy runtime loaded without registering its engine."},{once:true});
    script.addEventListener("error",()=>{state.spyRuntimeError="Unable to load isolated Spy Vs Spy runtime.";state.spyRuntimeRequested=false},{once:true});
    document.body.appendChild(script);return false;
  }

  ensureFinalLoop();ensureSpyRuntime();
  state.timer=setInterval(()=>{ensureFinalLoop();ensureSpyRuntime()},40);
  addEventListener("pagehide",()=>{if(state.timer)clearInterval(state.timer)},{once:true});

  window.CCGLostSizzlerV141R29LoopFinalizer={ensureFinalLoop,ensureSpyRuntime,get state(){return state}};
})();