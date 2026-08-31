/* R51 menu focus visibility polish. Presentation only. */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V141_R51_MENU_FOCUS__)return;
  window.__CCG_LOST_SIZZLER_V141_R51_MENU_FOCUS__=true;
  const state={focusMoves:0,installed:false,lastFocused:null};
  const reduced=()=>document.body?.classList?.contains("ccg-reduced-motion")||(()=>{try{return matchMedia("(prefers-reduced-motion: reduce)").matches}catch(_){return false}})();
  function ensureStyle(){
    if(document.getElementById("ccg-r51-controller-focus-style"))return true;
    const style=document.createElement("style");style.id="ccg-r51-controller-focus-style";style.textContent=`
      .ccg-r51-focus-ring{outline:2px solid var(--r51-cyan,#6cecff)!important;outline-offset:3px!important;box-shadow:0 0 0 5px rgba(108,236,255,.13),0 0 22px rgba(108,236,255,.15)!important}
    `;document.head.appendChild(style);return true
  }
  function clearFocusRing(target=state.lastFocused){
    try{target?.classList?.remove("ccg-r51-focus-ring")}catch(_){}
    if(target===state.lastFocused)state.lastFocused=null
  }
  function onFocus(event){
    const target=event.target;if(!(target instanceof HTMLElement)||!target.closest("#menu, #online-lobby, .overlay"))return;
    if(!target.matches("button,a[href],input,select,[tabindex]"))return;
    if(state.lastFocused&&state.lastFocused!==target)clearFocusRing(state.lastFocused);
    target.classList.add("ccg-r51-focus-ring");state.lastFocused=target;
    try{target.scrollIntoView({block:"nearest",inline:"nearest",behavior:reduced()?"auto":"smooth"});state.focusMoves++}catch(_){target.scrollIntoView?.(false)}
  }
  function onBlur(event){
    const target=event.target;if(target===state.lastFocused)clearFocusRing(target)
  }
  function install(){
    if(state.installed)return true;ensureStyle();document.addEventListener("focusin",onFocus,{passive:true});document.addEventListener("focusout",onBlur,{passive:true});state.installed=true;document.body.dataset.v141R51MenuFocus="true";return true
  }
  install();addEventListener("pagehide",()=>{document.removeEventListener("focusin",onFocus);document.removeEventListener("focusout",onBlur);clearFocusRing()},{once:true});
  window.CCGLostSizzlerV141R51MenuFocus={install,get state(){return state}};
})();
