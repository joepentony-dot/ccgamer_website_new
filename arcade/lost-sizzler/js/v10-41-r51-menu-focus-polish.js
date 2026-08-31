/* R51 menu focus visibility polish. Presentation only. */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V141_R51_MENU_FOCUS__)return;
  window.__CCG_LOST_SIZZLER_V141_R51_MENU_FOCUS__=true;
  const state={focusMoves:0,installed:false};
  const reduced=()=>document.body?.classList?.contains("ccg-reduced-motion")||(()=>{try{return matchMedia("(prefers-reduced-motion: reduce)").matches}catch(_){return false}})();
  function onFocus(event){
    const target=event.target;if(!(target instanceof HTMLElement)||!target.closest("#menu, #online-lobby, .overlay"))return;
    if(!target.matches("button,a[href],input,select,[tabindex]"))return;
    try{target.scrollIntoView({block:"nearest",inline:"nearest",behavior:reduced()?"auto":"smooth"});state.focusMoves++}catch(_){target.scrollIntoView?.(false)}
  }
  function install(){if(state.installed)return true;document.addEventListener("focusin",onFocus,{passive:true});state.installed=true;document.body.dataset.v141R51MenuFocus="true";return true}
  install();addEventListener("pagehide",()=>document.removeEventListener("focusin",onFocus),{once:true});
  window.CCGLostSizzlerV141R51MenuFocus={install,get state(){return state}};
})();
