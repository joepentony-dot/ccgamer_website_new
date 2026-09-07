/* The Lost Sizzler V10.42 — zero-server-cost production release policy. */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V142_ZERO_SERVER_RELEASE__)return;
  window.__CCG_LOST_SIZZLER_V142_ZERO_SERVER_RELEASE__=true;

  const ONLINE_BUTTON_IDS=["create-btn","horde-mode-btn","saboteurs-mode-btn","join-btn"];
  const ONLINE_ONLY_SELECTORS=[".online-howto",".join-row","#online-lobby"];
  const state={enabled:true,removedButtons:[],hiddenPanels:[],networkLocked:false,lastReason:""};

  function hideNode(node){
    if(!node)return false;
    node.hidden=true;
    node.classList?.add?.("hidden");
    node.setAttribute?.("aria-hidden","true");
    node.style.display="none";
    return true;
  }

  function retireOnlineEntryPoints(){
    for(const id of ONLINE_BUTTON_IDS){
      const node=document.getElementById(id);
      if(node&&hideNode(node)&&!state.removedButtons.includes(id))state.removedButtons.push(id);
    }
    for(const selector of ONLINE_ONLY_SELECTORS){
      const node=document.querySelector(selector);
      if(node&&hideNode(node)&&!state.hiddenPanels.includes(selector))state.hiddenPanels.push(selector);
    }

    const blurb=document.querySelector(".menu-blurb");
    if(blurb)blurb.textContent="A five-floor pixel dungeon crawl filled with shifting objectives, rare loot, hidden routes, dangerous events and things in the dark that ordinary weapons cannot finish.";

    const label=document.querySelector(".mode-select-label");
    if(label)label.innerHTML="<span>✦</span> CHOOSE YOUR ADVENTURE <span>✦</span>";

    const note=document.getElementById("menu-note");
    if(note)note.textContent="V10.42 uses a zero-server-cost release model: Solo, Tutorial and 2P Split Screen run locally in your browser. Supabase remains available for CCG account features such as the Weekly High-Score Vault, but core gameplay never requires an online multiplayer server.";

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
  observer.observe(document.documentElement,{subtree:true,childList:true});
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
