/* The Lost Sizzler V10.41 — release overlay gameplay-input safety.
 *
 * V10.36 owns the release/loading presentation. A late release-gate callback
 * can occasionally lag behind a game that has already reported itself ready,
 * leaving the full-screen loading layer above otherwise playable UI. This
 * final guard never masks a genuine fatal-load state, but once the canonical
 * page is ready (or a run is already active) the stale loading layer must not
 * remain visible or intercept pointer input.
 */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V141_RELEASE_OVERLAY_SAFETY__)return;
  window.__CCG_LOST_SIZZLER_V141_RELEASE_OVERLAY_SAFETY__=true;

  const STYLE_ID="ccg-v141-release-overlay-safety-style";
  const state={timer:0,bodyObserver:null,overlayObserver:null,overlay:null,releases:0,lastReleaseAt:0};

  function ensureStyle(){
    if(document.getElementById(STYLE_ID))return;
    const style=document.createElement("style");
    style.id=STYLE_ID;
    style.textContent=`
      body[data-release-ready="true"] #ccg-release-loading:not(.is-error),
      body[data-run-active="true"] #ccg-release-loading:not(.is-error),
      body[data-tutorial-active="true"] #ccg-release-loading:not(.is-error){
        display:none!important;
        visibility:hidden!important;
        pointer-events:none!important;
      }
    `;
    (document.head||document.documentElement).appendChild(style);
  }

  function fatalLoad(){
    const overlay=document.getElementById("ccg-release-loading");
    if(overlay?.classList?.contains("is-error"))return true;
    try{return window.CCGLostSizzlerReleaseGate?.state?.failed===true}catch(_){return false}
  }

  function playable(){
    const data=document.body?.dataset;
    if(!data)return false;
    if(data.releaseReady==="true"||data.runActive==="true"||data.tutorialActive==="true")return true;
    try{return Boolean(window.CCGLostSizzlerSpecialModes?.active)}catch(_){return false}
  }

  function releaseOverlay(){
    const overlay=document.getElementById("ccg-release-loading");
    if(!overlay)return false;
    if(fatalLoad()){
      overlay.style.pointerEvents="";
      overlay.removeAttribute("aria-hidden");
      return false;
    }
    if(!playable())return false;
    overlay.hidden=true;
    overlay.setAttribute("aria-hidden","true");
    overlay.style.pointerEvents="none";
    state.releases++;
    state.lastReleaseAt=Date.now();
    return true;
  }

  function observeOverlay(){
    const overlay=document.getElementById("ccg-release-loading");
    if(!overlay||overlay===state.overlay)return;
    state.overlayObserver?.disconnect?.();
    state.overlay=overlay;
    state.overlayObserver=new MutationObserver(()=>releaseOverlay());
    state.overlayObserver.observe(overlay,{attributes:true,attributeFilter:["hidden","class","style"]});
    releaseOverlay();
  }

  function tick(){
    ensureStyle();
    observeOverlay();
    releaseOverlay();
  }

  function install(){
    ensureStyle();
    tick();
    if(document.body){
      state.bodyObserver=new MutationObserver(()=>releaseOverlay());
      state.bodyObserver.observe(document.body,{attributes:true,attributeFilter:["data-release-ready","data-run-active","data-tutorial-active","data-special-mode"]});
    }
    state.timer=setInterval(tick,160);
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",install,{once:true});else install();
  window.addEventListener("pagehide",()=>{
    if(state.timer)clearInterval(state.timer);
    state.timer=0;
    state.bodyObserver?.disconnect?.();
    state.overlayObserver?.disconnect?.();
  },{once:true});

  window.CCGLostSizzlerV141ReleaseOverlaySafety={releaseOverlay,playable,fatalLoad,get state(){return state}};
})();
