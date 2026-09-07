/* The Lost Sizzler V10.42 — zero-server-cost production release policy. */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V142_ZERO_SERVER_RELEASE__)return;
  window.__CCG_LOST_SIZZLER_V142_ZERO_SERVER_RELEASE__=true;

  const ONLINE_BUTTON_IDS=["create-btn","horde-mode-btn","saboteurs-mode-btn","join-btn"];
  const ONLINE_ONLY_SELECTORS=[".online-howto",".join-row","#online-lobby"];
  const RELEASE_STYLE_ID="v142-zero-server-release-style";
  const RELEASE_BLURB="A five-floor pixel dungeon crawl filled with shifting objectives, rare loot, hidden routes, dangerous events and things in the dark that ordinary weapons cannot finish.";
  const RELEASE_MODE_LABEL_HTML="<span>✦</span> CHOOSE YOUR ADVENTURE <span>✦</span>";
  const RELEASE_NOTE="V10.42 uses a zero-server-cost release model: Solo, Tutorial and 2P Split Screen run locally in your browser. Supabase remains available for CCG account features such as the Weekly High-Score Vault, but core gameplay never requires an online multiplayer server.";
  const state={enabled:true,removedButtons:[],hiddenPanels:[],networkLocked:false,lastReason:"",enforcementPasses:0,releaseStyleReady:false};

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

  function lockExistingNetwork(){
    try{
      if(!net)return false;
      try{net.leave?.()}catch(_){}
      try{net.setSolo?.("TITLE")}catch(_){}
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
    try{
      if(mode==="lobby")mode="menu";
      document.getElementById("online-lobby")?.classList.add("hidden");
      window.CCGLostSizzlerSpecialModes?.stop?.(undefined,true);
    }catch(_){}
  }

  function enforce(){
    retireOnlineEntryPoints();
    lockExistingNetwork();
    lockLegacyEntryFunctions();
    leaveAnyOnlinePresentation();
  }

  document.addEventListener("click",event=>{
    const target=event.target instanceof Element?event.target.closest("#create-btn,#horde-mode-btn,#saboteurs-mode-btn,#join-btn"):null;
    if(!target)return;
    event.preventDefault();
    event.stopImmediatePropagation();
    unavailable().catch(()=>{});
  },true);

  const observer=new MutationObserver(()=>retireOnlineEntryPoints());
  observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:["style","class","hidden","aria-hidden"]});
  addEventListener("pagehide",()=>observer.disconnect(),{once:true});

  enforce();
  window.CCGLostSizzlerV142ZeroServerRelease=Object.freeze({
    enabled:true,
    onlineMultiplayer:false,
    localModes:Object.freeze(["solo","tutorial","split-screen"]),
    supabaseAccountFeatures:true,
    diagnostics:()=>Object.freeze({...state,removedButtons:[...state.removedButtons],hiddenPanels:[...state.hiddenPanels]})
  });
})();
