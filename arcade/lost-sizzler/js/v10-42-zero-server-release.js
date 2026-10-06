/* C64 Dungeon Carnage V10.42 — local browser release policy. */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V142_ZERO_SERVER_RELEASE__)return;
  window.__CCG_LOST_SIZZLER_V142_ZERO_SERVER_RELEASE__=true;

  const LOCAL_BUTTON_IDS=["solo-btn","tutorial-zone-btn"];
  const RELEASE_BLURB="A fifteen-floor pixel dungeon crawl filled with shifting objectives, rare loot, hidden routes, dangerous events and things in the dark that ordinary weapons cannot finish.";
  const RELEASE_MODE_LABEL_HTML="<span>✦</span> CHOOSE YOUR ADVENTURE <span>✦</span>";
  const RELEASE_NOTE="C64 Dungeon Carnage runs directly in your browser. Start the main game or use the Tutorial to learn the controls.";
  const state={enabled:true,enforcementPasses:0,menuRecoveries:0,buttonRecoveries:0,focusRequests:0,focusAssignments:0};

  function setTextIfChanged(node,value){
    if(!node||node.textContent===value)return false;
    node.textContent=value;
    return true;
  }

  function setHtmlIfChanged(node,value){
    if(!node||node.innerHTML===value)return false;
    node.innerHTML=value;
    return true;
  }

  function controlsMayBeEnabled(){
    const body=document.body;
    if(!body)return false;
    if(body.dataset.v142DemoLocked==="true")return false;
    if(body.dataset.publicBeta==="ended"||body.classList.contains("ccg-public-beta-closed"))return false;
    return true;
  }

  function ensureMenuAvailability(){
    const body=document.body;if(!body||body.dataset.runActive==="true")return false;
    let currentMode="";try{currentMode=String(typeof mode!=="undefined"?mode:"").toLowerCase()}catch(_){}
    if(currentMode&&currentMode!=="menu"&&currentMode!=="title")return false;
    let changed=false;
    const menu=document.getElementById("menu");
    if(menu?.classList?.contains?.("hidden")){menu.classList.remove("hidden");state.menuRecoveries++;changed=true}
    if(!controlsMayBeEnabled())return changed;
    for(const id of LOCAL_BUTTON_IDS){
      const button=document.getElementById(id);if(!button)continue;
      if(button.dataset.betaEnded==="true")continue;
      if(button.disabled){button.disabled=false;state.buttonRecoveries++;changed=true}
      if(button.getAttribute("aria-disabled")==="true"){button.removeAttribute("aria-disabled");changed=true}
    }
    settleFocus();
    return changed;
  }

  function settleFocus(){
    if(!state.focusRequests)return false;
    const body=document.body;if(!body||body.dataset.runActive==="true")return false;
    let currentMode="";try{currentMode=String(typeof mode!=="undefined"?mode:"").toLowerCase()}catch(_){}
    if(currentMode!=="menu")return false;
    const menu=document.getElementById("menu"),button=document.getElementById("solo-btn");
    if(!menu||menu.classList.contains("hidden")||!button||!button.isConnected||button.disabled)return false;
    const style=window.getComputedStyle(button);
    if(style.display==="none"||style.visibility==="hidden"||style.pointerEvents==="none")return false;
    state.focusRequests=0;
    try{button.focus({preventScroll:true});state.focusAssignments++;return document.activeElement===button}catch(_){return false}
  }

  function focusRecoveredLocalMenu(){state.focusRequests++;return settleFocus()}

  function enforce(){
    state.enforcementPasses+=1;
    setTextIfChanged(document.querySelector(".menu-blurb"),RELEASE_BLURB);
    setHtmlIfChanged(document.querySelector(".mode-select-label"),RELEASE_MODE_LABEL_HTML);
    setTextIfChanged(document.getElementById("release-note"),RELEASE_NOTE);
    ensureMenuAvailability();
    if(document.body)document.body.dataset.releaseModel="local-browser";
  }

  const observer=new MutationObserver(records=>{
    if(!records.some(record=>{
      if(record.type==="attributes")return record.target instanceof Element&&(record.target.id==="menu"||LOCAL_BUTTON_IDS.includes(record.target.id));
      if(record.type!=="childList")return false;
      return [...record.addedNodes].some(node=>node instanceof Element&&(node.id==="menu"||LOCAL_BUTTON_IDS.includes(node.id)||Boolean(node.querySelector?.("#menu,#solo-btn,#tutorial-zone-btn"))));
    }))return;
    ensureMenuAvailability();
    settleFocus();
  });
  observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:["style","class","hidden","aria-hidden","disabled"]});
  addEventListener("pagehide",()=>observer.disconnect(),{once:true});
  addEventListener("ccg:v142-ready",()=>queueMicrotask(ensureMenuAvailability));
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>queueMicrotask(enforce),{once:true});
  else queueMicrotask(enforce);

  enforce();
  window.CCGLostSizzlerV142ZeroServerRelease=Object.freeze({
    enabled:true,
    releaseModel:"local-browser",
    localModes:Object.freeze(["game","tutorial"]),
    supabaseAccountFeatures:true,
    focusRecoveredLocalMenu,
    diagnostics:()=>Object.freeze({...state})
  });
})();
