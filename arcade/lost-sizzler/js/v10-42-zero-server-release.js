/* The Lost Sizzler V10.42 — zero-server-cost production release policy. */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V142_ZERO_SERVER_RELEASE__)return;
  window.__CCG_LOST_SIZZLER_V142_ZERO_SERVER_RELEASE__=true;

  const ONLINE_BUTTON_IDS=["create-btn","horde-mode-btn","saboteurs-mode-btn","join-btn"];
  const LOCAL_BUTTON_IDS=["solo-btn","tutorial-zone-btn","split-btn"];
  const ONLINE_ONLY_SELECTORS=[".online-howto",".join-row","#online-lobby"];
  const RELEASE_STYLE_ID="v142-zero-server-release-style";
  const RELEASE_BLURB="A five-floor pixel dungeon crawl filled with shifting objectives, rare loot, hidden routes, dangerous events and things in the dark that ordinary weapons cannot finish.";
  const RELEASE_MODE_LABEL_HTML="<span>✦</span> CHOOSE YOUR ADVENTURE <span>✦</span>";
  const RELEASE_NOTE="V10.42 uses a zero-server-cost release model: Solo, Tutorial and 2P Split Screen run locally in your browser. Supabase remains available for CCG account features such as the Weekly High-Score Vault, but core gameplay never requires an online multiplayer server.";
  const state={enabled:true,removedButtons:[],hiddenPanels:[],networkLocked:false,lastReason:"",enforcementPasses:0,releaseStyleReady:false,onlineTeardowns:0,localBootTeardownsSkipped:0,localMenuRecoveries:0,localButtonRecoveries:0,observerSkips:0};

  function ensureReleaseStyle(){
    let style=document.getElementById(RELEASE_STYLE_ID);
    if(!style){
      style=document.createElement("style");
      style.id=RELEASE_STYLE_ID;
      style.textContent="#create-btn,#horde-mode-btn,#saboteurs-mode-btn,#join-btn,.online-howto,.join-row,#online-lobby{display:none!important;}";
      (document.head||document.documentElement).appendChild(style);
    }
    state.releaseStyleReady=true;
    return style;
  }

  function hideNode(node){
    if(!node)return false;
    let changed=false;
    if(!node.hidden){node.hidden=true;changed=true}
    if(!node.classList?.contains?.("hidden")){node.classList?.add?.("hidden");changed=true}
    if(node.getAttribute?.("aria-hidden")!=="true"){node.setAttribute?.("aria-hidden","true");changed=true}
    if(node.style.getPropertyValue("display")!=="none"||node.style.getPropertyPriority("display")!=="important"){
      node.style.setProperty("display","none","important");
      changed=true;
    }
    return changed;
  }

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

  function localControlsMayBeEnabled(){
    const body=document.body;
    if(!body)return false;
    if(body.dataset.v142DemoLocked==="true")return false;
    if(body.dataset.publicBeta==="ended"||body.classList.contains("ccg-public-beta-closed"))return false;
    return true;
  }

  function ensureLocalMenuAvailability(){
    const body=document.body;if(!body||body.dataset.runActive==="true")return false;
    let currentMode="";try{currentMode=String(typeof mode!=="undefined"?mode:"").toLowerCase()}catch(_){}
    if(currentMode&&currentMode!=="menu"&&currentMode!=="title")return false;
    let changed=false;
    const menu=document.getElementById("menu");
    if(menu?.classList?.contains?.("hidden")){menu.classList.remove("hidden");state.localMenuRecoveries++;changed=true}
    if(!localControlsMayBeEnabled())return changed;
    for(const id of LOCAL_BUTTON_IDS){
      const button=document.getElementById(id);if(!button)continue;
      if(button.dataset.betaEnded==="true")continue;
      if(button.disabled){button.disabled=false;state.localButtonRecoveries++;changed=true}
      if(button.getAttribute("aria-disabled")==="true"){button.removeAttribute("aria-disabled");changed=true}
    }
    return changed;
  }

  function retireOnlineEntryPoints(){
    state.enforcementPasses+=1;
    ensureReleaseStyle();
    for(const id of ONLINE_BUTTON_IDS){
      const node=document.getElementById(id);
      if(node){
        hideNode(node);
        if(!state.removedButtons.includes(id))state.removedButtons.push(id);
      }
    }
    for(const selector of ONLINE_ONLY_SELECTORS){
      const node=document.querySelector(selector);
      if(node){
        hideNode(node);
        if(!state.hiddenPanels.includes(selector))state.hiddenPanels.push(selector);
      }
    }

    setTextIfChanged(document.querySelector(".menu-blurb"),RELEASE_BLURB);
    setHtmlIfChanged(document.querySelector(".mode-select-label"),RELEASE_MODE_LABEL_HTML);
    setTextIfChanged(document.getElementById("menu-note"),RELEASE_NOTE);
    ensureLocalMenuAvailability();

    document.body.dataset.onlineMultiplayer="disabled";
    document.body.dataset.releaseModel="zero-server-cost";
  }

  function unavailable(){
    const error=new Error("Online multiplayer is not part of the zero-server-cost Lost Sizzler release.");
    error.code="online_multiplayer_disabled";
    state.lastReason=error.code;
    try{showToast?.("ONLINE MULTIPLAYER DISABLED","Solo, Tutorial and 2P Split Screen remain available. The released game does not require a paid multiplayer server.","cyan",7000)}catch(_){}
    return Promise.reject(error);
  }

  function hasActiveOnlinePresentation(){
    try{if(typeof mode!=="undefined"&&mode==="lobby")return true}catch(_){}
    try{
      if(!net)return false;
      if(net.connected===true)return true;
      const transport=String(net.transport||"").toLowerCase();
      if(transport&&transport!=="solo"&&transport!=="local"&&transport!=="offline"&&transport!=="title")return true;
    }catch(_){}
    return false;
  }

  function lockExistingNetwork(){
    try{
      if(!net)return false;
      const hadOnlinePresentation=hasActiveOnlinePresentation();
      if(hadOnlinePresentation){
        try{net.leave?.()}catch(_){}
        try{net.setSolo?.("TITLE")}catch(_){}
        state.onlineTeardowns+=1;
      }else state.localBootTeardownsSkipped+=1;
      for(const method of ["join","createOnlineRoom","joinExistingRoom"]){
        if(typeof net[method]!=="function")continue;
        if(net[method].__ccgV142ZeroServer)continue;
        const original=net[method].bind(net);
        const blocked=function(){return unavailable()};
        blocked.__ccgV142ZeroServer=true;
        blocked.__ccgOriginal=original;
        net[method]=blocked;
      }
      state.networkLocked=true;
      return true;
    }catch(_){return false}
  }

  function lockLegacyEntryFunctions(){
    try{
      if(typeof createRoom==="function"&&!createRoom.__ccgV142ZeroServer){
        const original=createRoom;
        createRoom=function(){return unavailable()};
        createRoom.__ccgV142ZeroServer=true;
        createRoom.__ccgOriginal=original;
      }
    }catch(_){}
    try{
      if(typeof joinRoom==="function"&&!joinRoom.__ccgV142ZeroServer){
        const original=joinRoom;
        joinRoom=function(){return unavailable()};
        joinRoom.__ccgV142ZeroServer=true;
        joinRoom.__ccgOriginal=original;
      }
    }catch(_){}
  }

  function leaveAnyOnlinePresentation(){
    const hadOnlinePresentation=hasActiveOnlinePresentation();
    try{
      if(typeof mode!=="undefined"&&mode==="lobby")mode="menu";
      document.getElementById("online-lobby")?.classList.add("hidden");
      if(hadOnlinePresentation){
        window.CCGLostSizzlerSpecialModes?.stop?.(undefined,true);
        state.onlineTeardowns+=1;
      }else state.localBootTeardownsSkipped+=1;
    }catch(_){}
  }

  function enforce(){
    retireOnlineEntryPoints();
    lockExistingNetwork();
    lockLegacyEntryFunctions();
    leaveAnyOnlinePresentation();
    ensureLocalMenuAvailability();
  }

  function mutationTouchesReleaseSurface(record){
    if(record.type==="attributes"){
      const target=record.target;
      if(!(target instanceof Element))return false;
      if(target.id==="menu"||ONLINE_BUTTON_IDS.includes(target.id)||LOCAL_BUTTON_IDS.includes(target.id))return true;
      return target.matches?.(".online-howto,.join-row,#online-lobby")||false;
    }
    if(record.type!=="childList")return false;
    for(const node of record.addedNodes){
      if(!(node instanceof Element))continue;
      if(node.id==="menu"||ONLINE_BUTTON_IDS.includes(node.id)||LOCAL_BUTTON_IDS.includes(node.id))return true;
      if(node.matches?.(".online-howto,.join-row,#online-lobby"))return true;
      if(node.querySelector?.("#menu,#create-btn,#horde-mode-btn,#saboteurs-mode-btn,#join-btn,#solo-btn,#tutorial-zone-btn,#split-btn,.online-howto,.join-row,#online-lobby"))return true;
    }
    return false;
  }

  document.addEventListener("click",event=>{
    const target=event.target instanceof Element?event.target.closest("#create-btn,#horde-mode-btn,#saboteurs-mode-btn,#join-btn"):null;
    if(!target)return;
    event.preventDefault();
    event.stopImmediatePropagation();
    unavailable().catch(()=>{});
  },true);

  const observer=new MutationObserver(records=>{
    if(!records.some(mutationTouchesReleaseSurface)){state.observerSkips+=records.length;return}
    retireOnlineEntryPoints();
  });
  observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:["style","class","hidden","aria-hidden","disabled"]});
  addEventListener("pagehide",()=>observer.disconnect(),{once:true});
  addEventListener("ccg:v142-ready",()=>queueMicrotask(ensureLocalMenuAvailability));
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>queueMicrotask(ensureLocalMenuAvailability),{once:true});
  else queueMicrotask(ensureLocalMenuAvailability);

  enforce();
  window.CCGLostSizzlerV142ZeroServerRelease=Object.freeze({
    enabled:true,
    onlineMultiplayer:false,
    localModes:Object.freeze(["solo","tutorial","split-screen"]),
    supabaseAccountFeatures:true,
    diagnostics:()=>Object.freeze({...state,removedButtons:[...state.removedButtons],hiddenPanels:[...state.hiddenPanels]})
  });
})();
