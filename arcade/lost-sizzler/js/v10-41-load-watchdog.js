/* The Lost Sizzler V10.41 — bounded loading watchdog and loader cleanup. */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V141_LOAD_WATCHDOG__)return;
  window.__CCG_LOST_SIZZLER_V141_LOAD_WATCHDOG__=true;

  const LIVE_HOSTS=new Set(["cheekycommodoregamer.co.uk","www.cheekycommodoregamer.co.uk"]);
  const PLAYABLE_IDS=new Set(["solo-btn","tutorial-zone-btn","create-btn","horde-solo-btn","horde-mode-btn","saboteurs-mode-btn","continue-save-btn","daily-btn","split-btn","join-btn","lobby-start-btn"]);
  const OWNER_USERNAME="cheeky commodore gamer";
  const OWNER_ROLE="admin";
  let ownerAccessGranted=false;
  const state={
    startedAt:performance.now(),lastTick:performance.now(),maxDelay:0,stalls:0,timer:0,finished:false,
    pendingSolo:false,soloReplayQueued:false,soloReplays:0,soloIntentSerial:0,soloRecoveries:0,soloRecoveryTimer:0,
    moduleObserver:null,loadingTimer:0,modulesReady:0,moduleKeys:new Set(),loadingStage:10,loadingStages:[10],
    betaObserver:null,betaRunObserver:null,betaClosed:false,betaBlocks:0,
    ownerAccess:false,ownerAuthChecked:false,ownerAuthPending:false,ownerAuthTimer:0,ownerAuthAttempts:0,ownerUsername:"",ownerRole:"",
    r57Timer:0,r57Loaded:false
  };

  const publicBetaClosed=()=>LIVE_HOSTS.has(String(location.hostname||"").toLowerCase());
  const normalizeAccountName=value=>String(value||"").trim().replace(/\s+/g," ").toLowerCase();
  const ownerProfileMatches=profile=>normalizeAccountName(profile?.username)===OWNER_USERNAME&&normalizeAccountName(profile?.role)===OWNER_ROLE;
  const publicPlayLocked=()=>publicBetaClosed()&&!ownerAccessGranted;

  function loadingStatus(message){
    const node=document.getElementById("ccg-release-loading-status");
    if(node&&message&&node.textContent!==message)node.textContent=message;
  }

  function releaseReady(){
    try{return document.body?.dataset?.releaseReady==="true"||window.CCGLostSizzlerReleaseGate?.state?.ready===true}catch(_){return false}
  }

  function ensureBetaStyle(){
    if(!publicBetaClosed()||document.getElementById("ccg-lost-sizzler-beta-ended-style"))return;
    const style=document.createElement("style");
    style.id="ccg-lost-sizzler-beta-ended-style";
    style.textContent=`
      body.ccg-public-beta-closed #menu .game-mode-buttons button:disabled,
      body.ccg-public-beta-closed #menu #join-btn:disabled,
      body.ccg-public-beta-closed #online-lobby #lobby-start-btn:disabled{opacity:.28!important;filter:grayscale(1)!important;cursor:not-allowed!important;pointer-events:none!important;box-shadow:none!important}
      body.ccg-public-beta-closed #menu .beta-stage-disclaimer{text-decoration:line-through!important;opacity:.58!important}
      #ccg-beta-ended-sash{position:fixed;left:0;right:0;top:42%;z-index:9800;display:grid;place-items:center;gap:3px;padding:15px 18px;border-top:3px solid #ffd85a;border-bottom:3px solid #ffd85a;background:linear-gradient(90deg,rgba(17,4,27,.98),rgba(76,13,85,.99),rgba(17,4,27,.98));box-shadow:0 0 38px rgba(185,120,255,.52),0 12px 34px rgba(0,0,0,.72);pointer-events:none;text-align:center;text-transform:uppercase;font-family:Consolas,"Courier New",monospace;letter-spacing:.12em}
      #ccg-beta-ended-sash strong{display:block;color:#d8cddd;font-size:clamp(13px,1.4vw,20px);font-weight:900;text-decoration:line-through;text-decoration-thickness:3px;text-decoration-color:#ff6868}
      #ccg-beta-ended-sash span{display:block;color:#fff3b0;font-size:clamp(28px,5vw,72px);line-height:.96;font-weight:1000;letter-spacing:.08em;text-shadow:0 0 18px rgba(255,216,90,.55)}
      #ccg-beta-ended-sash small{display:block;color:#e7dcf2;font-size:clamp(8px,.9vw,13px);font-weight:800;letter-spacing:.15em}
      body.ccg-public-beta-closed:has(#rulebook-panel:not(.hidden)) #ccg-beta-ended-sash,
      body.ccg-public-beta-closed:has(#support-panel:not(.hidden)) #ccg-beta-ended-sash{opacity:.12}
      @media(max-width:760px){#ccg-beta-ended-sash{top:38%;padding:12px 10px}#ccg-beta-ended-sash span{font-size:clamp(30px,10vw,54px)}}
    `;
    document.head.appendChild(style);
  }

  function ensureBetaSash(){
    if(!publicPlayLocked()||document.getElementById("ccg-beta-ended-sash"))return;
    const sash=document.createElement("div");
    sash.id="ccg-beta-ended-sash";
    sash.setAttribute("role","status");
    sash.setAttribute("aria-label","Beta has ended. Coming soon.");
    sash.innerHTML='<strong>BETA HAS ENDED</strong><span>COMING SOON</span><small>THE LOST SIZZLER IS BEING PREPARED FOR ITS NEXT RELEASE</small>';
    document.body.appendChild(sash);
  }

  function restoreOwnerControls(){
    if(!publicBetaClosed()||!ownerAccessGranted)return false;
    state.betaClosed=false;state.ownerAccess=true;
    document.body?.classList?.remove("ccg-public-beta-closed");
    document.body?.setAttribute?.("data-public-beta","owner-preview");
    document.getElementById("ccg-beta-ended-sash")?.remove();
    for(const id of PLAYABLE_IDS){
      const button=document.getElementById(id);if(!button||button.dataset.betaEnded!=="true")continue;
      const wasDisabled=button.dataset.betaPreviousDisabled==="true",previousTitle=button.dataset.betaPreviousTitle||"";
      button.disabled=wasDisabled;
      if(wasDisabled)button.setAttribute("aria-disabled","true");else button.removeAttribute("aria-disabled");
      if(previousTitle)button.title=previousTitle;else button.removeAttribute("title");
      delete button.dataset.betaEnded;delete button.dataset.betaPreviousDisabled;delete button.dataset.betaPreviousTitle;
    }
    try{window.CCGWeeklyChallenge?.render?.()}catch(_){}
    return true
  }

  function lockPlayableControls(){
    if(!publicBetaClosed())return false;
    if(ownerAccessGranted)return restoreOwnerControls();
    state.betaClosed=true;state.ownerAccess=false;
    document.body?.classList?.add("ccg-public-beta-closed");document.body?.setAttribute?.("data-public-beta","ended");
    ensureBetaStyle();ensureBetaSash();
    for(const id of PLAYABLE_IDS){
      const button=document.getElementById(id);if(!button)continue;
      if(button.dataset.betaEnded!=="true"){
        button.dataset.betaPreviousDisabled=button.disabled?"true":"false";
        button.dataset.betaPreviousTitle=button.getAttribute("title")||"";
      }
      button.disabled=true;button.setAttribute("aria-disabled","true");button.dataset.betaEnded="true";
      button.title="The browser beta has ended. The next Lost Sizzler release is coming soon.";
    }
    return true
  }

  async function resolveOwnerAccess(){
    if(!publicBetaClosed())return false;
    const auth=window.ccgSupabase;
    if(state.ownerAuthPending||!auth?.getCurrentUserContext||!auth?.getClient)return false;
    state.ownerAuthPending=true;
    try{
      const context=await auth.getCurrentUserContext();
      const user=context?.user;
      if(!context?.isAuthenticated||!user?.id){
        ownerAccessGranted=false;state.ownerAccess=false;state.ownerAuthChecked=true;state.ownerUsername="";state.ownerRole="";lockPlayableControls();return false
      }
      const client=await auth.getClient();
      if(!client?.from)throw new Error("Website profile service unavailable");
      const query=client.from("profiles").select("username,role").eq("id",user.id);
      const result=typeof query?.maybeSingle==="function"?await query.maybeSingle():await query.single();
      if(result?.error)throw result.error;
      const profile=result?.data||null;
      state.ownerUsername=String(profile?.username||"");state.ownerRole=String(profile?.role||"");
      ownerAccessGranted=ownerProfileMatches(profile);state.ownerAccess=ownerAccessGranted;state.ownerAuthChecked=true;
      if(ownerAccessGranted)restoreOwnerControls();else lockPlayableControls();
      return ownerAccessGranted
    }catch(error){
      ownerAccessGranted=false;state.ownerAccess=false;state.ownerAuthChecked=true;lockPlayableControls();
      console.warn("[Lost Sizzler] owner preview authentication unavailable; public beta remains locked",error);return false
    }finally{state.ownerAuthPending=false}
  }

  function onOwnerAuthSignal(){
    state.ownerAuthChecked=false;
    resolveOwnerAccess().catch(()=>{});
  }

  function blockPublicPlay(event){
    if(!publicPlayLocked())return;
    const button=event?.target?.closest?.("button");
    if(!button||!PLAYABLE_IDS.has(button.id))return;
    event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();state.betaBlocks++;
    lockPlayableControls();
  }

  function installPublicBetaLock(){
    if(!publicBetaClosed())return false;
    const start=()=>{
      lockPlayableControls();
      document.addEventListener("click",blockPublicPlay,true);
      state.betaObserver=new MutationObserver(()=>lockPlayableControls());
      state.betaObserver.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:["class"]});
      state.betaRunObserver=new MutationObserver(()=>{
        if(!publicPlayLocked()||document.body?.dataset?.runActive!=="true")return;
        queueMicrotask(()=>{try{if(typeof quitToMenu==="function")quitToMenu()}catch(_){};lockPlayableControls()});
      });
      state.betaRunObserver.observe(document.body,{attributes:true,attributeFilter:["data-run-active"]});
      window.addEventListener("ccg:auth-ready",onOwnerAuthSignal);
      window.addEventListener("ccg:auth-changed",onOwnerAuthSignal);
      state.ownerAuthTimer=setInterval(()=>{
        state.ownerAuthAttempts++;
        if(window.ccgSupabase?.getCurrentUserContext){clearInterval(state.ownerAuthTimer);state.ownerAuthTimer=0;onOwnerAuthSignal()}
        else if(state.ownerAuthAttempts>=40){clearInterval(state.ownerAuthTimer);state.ownerAuthTimer=0}
      },250);
      onOwnerAuthSignal();
    };
    if(document.body)start();else document.addEventListener("DOMContentLoaded",start,{once:true});
    return true
  }

  function moduleScript(node){
    if(!(node instanceof HTMLScriptElement)||!node.src)return false;
    return [...node.attributes].some(attr=>attr.name.startsWith("data-ccg-"));
  }

  function noteModule(node){
    if(!moduleScript(node))return;
    let key="";try{key=new URL(node.src,location.href).pathname}catch(_){key=String(node.src||"").split("?")[0]}
    if(!key||state.moduleKeys.has(key))return;
    const ready=()=>{
      if(state.moduleKeys.has(key))return;
      state.moduleKeys.add(key);state.modulesReady++;
      syncLoadingStage();
    };
    if(node.dataset?.r57LoadSettled==="true"){ready();return}
    node.addEventListener("load",()=>{node.dataset.r57LoadSettled="true";ready()},{once:true});
    node.addEventListener("error",()=>{node.dataset.r57LoadSettled="true";ready()},{once:true});
  }

  function calculatedLoadingStage(){
    if(releaseReady())return 100;
    return Math.min(90,10+Math.floor(Math.max(0,state.modulesReady)/5)*10)
  }

  function writeLoadingStage(stage){
    const progress=document.getElementById("ccg-release-loading-progress"),percent=document.getElementById("ccg-release-loading-percent");
    if(progress&&Number(progress.value)!==stage)progress.value=stage;
    if(percent&&percent.textContent!==`${stage}%`)percent.textContent=`${stage}%`;
    const v136=window.CCGLostSizzlerV136?.state;if(v136&&Number(v136.progress)!==stage)v136.progress=stage;
    if(stage!==state.loadingStage){state.loadingStage=stage;if(state.loadingStages.at(-1)!==stage)state.loadingStages.push(stage)}
  }

  function syncLoadingStage(){
    const stage=calculatedLoadingStage();writeLoadingStage(stage);
    if(stage<100)loadingStatus(`Loading game modules… ${state.modulesReady} ready.`);
    else loadingStatus("Game systems ready.");
  }

  function installStagedLoader(){
    const start=()=>{
      document.querySelectorAll("script[src]").forEach(noteModule);
      state.moduleObserver=new MutationObserver(records=>{for(const record of records)for(const node of record.addedNodes){if(node instanceof HTMLScriptElement)noteModule(node);else node?.querySelectorAll?.("script[src]")?.forEach?.(noteModule)}});
      state.moduleObserver.observe(document.documentElement,{childList:true,subtree:true});
      state.loadingTimer=setInterval(()=>{syncLoadingStage();if(releaseReady()){writeLoadingStage(100);clearInterval(state.loadingTimer);state.loadingTimer=0}},120);
      syncLoadingStage();
    };
    if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});else start();
  }

  function cancelPendingSoloForAnotherChoice(event){
    if(!state.pendingSolo)return;
    const target=event?.target?.closest?.("#tutorial-zone-btn,#create-btn,#horde-mode-btn,#saboteurs-mode-btn,#daily-btn,#split-btn,#join-btn,#continue-save-btn");
    if(target)state.pendingSolo=false;
  }

  function scheduleSoloLivenessCheck(){
    const serial=++state.soloIntentSerial;
    if(state.soloRecoveryTimer)clearTimeout(state.soloRecoveryTimer);
    state.soloRecoveryTimer=setTimeout(()=>{
      state.soloRecoveryTimer=0;
      if(serial!==state.soloIntentSerial||publicPlayLocked()||document.body?.dataset?.runActive==="true"||!releaseReady())return;
      const menu=document.getElementById("menu");if(!menu||menu.classList.contains("hidden"))return;
      try{window.CCGLostSizzlerModeRuntime?.resetModeTransient?.("Solo launch liveness recovery")}catch(_){}
      try{window.CCGLostSizzlerV141R30?.assertNormalRuntimeOwnership?.("Solo launch liveness recovery")}catch(_){}
      try{delete document.body.dataset.specialMode;delete document.body.dataset.hordeSolo}catch(_){}
      state.soloRecoveries++;
      const guidance=window.CCGLostSizzlerTutorialGuidanceV123;
      if(typeof guidance?.launchSolo==="function")guidance.launchSolo(false);else document.getElementById("solo-btn")?.click();
    },3500);
  }

  function capturePreReleaseSolo(event){
    cancelPendingSoloForAnotherChoice(event);
    const button=event?.target?.closest?.("#solo-btn");
    if(!button||publicPlayLocked()||document.body?.dataset?.runActive==="true")return;
    if(releaseReady()){scheduleSoloLivenessCheck();return}

    // A player can click Play Solo after the core page is interactive but while
    // late release modules are still finishing. Do not let that user gesture
    // disappear into a half-installed runtime. Hold one bounded intent and
    // replay it once the authoritative release gate reports ready.
    state.pendingSolo=true;
    event.preventDefault();
    event.stopImmediatePropagation();
    loadingStatus("Finishing game systems… your Solo run will start automatically.");
  }

  function replayPendingSolo(){
    if(!state.pendingSolo||state.soloReplayQueued)return false;
    if(document.body?.dataset?.runActive==="true"){state.pendingSolo=false;return false}
    if(!releaseReady()||publicPlayLocked())return false;
    const button=document.getElementById("solo-btn");if(!button)return false;

    state.soloReplayQueued=true;
    queueMicrotask(()=>{
      state.soloReplayQueued=false;
      if(!state.pendingSolo)return;
      if(document.body?.dataset?.runActive==="true"){state.pendingSolo=false;return}
      if(!releaseReady()||publicPlayLocked())return;
      state.pendingSolo=false;state.soloReplays++;
      button.click();
      scheduleSoloLivenessCheck();
    });
    return true;
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
    try{state.moduleObserver?.disconnect?.()}catch(_){}
    if(state.loadingTimer){clearInterval(state.loadingTimer);state.loadingTimer=0}
    writeLoadingStage(100);
    state.finished=true;
    if(state.timer){clearInterval(state.timer);state.timer=0}
  }

  function ensureR57(){
    if(window.CCGLostSizzlerV141R57DesktopPrepStability){state.r57Loaded=true;if(state.r57Timer){clearInterval(state.r57Timer);state.r57Timer=0}return true}
    if(!window.CCGLostSizzlerV141R56PlaytestCompletion)return false;
    if(document.querySelector('script[data-ccg-v141-r57-desktop-prep-stability="true"]'))return false;
    const script=document.createElement("script"),rev=String(document.querySelector('meta[name="ccg-lost-sizzler-cache"]')?.content||document.querySelector('meta[name="ccg-lost-sizzler-build"]')?.content||Date.now());
    script.src=`js/v10-41-r57-desktop-prep-stability.js?v=${encodeURIComponent(rev)}`;script.async=false;script.dataset.ccgV141R57DesktopPrepStability="true";document.head.appendChild(script);return true
  }

  function tick(){
    const now=performance.now(),delay=now-state.lastTick;state.lastTick=now;state.maxDelay=Math.max(state.maxDelay,delay);
    if(delay>1800)state.stalls++;
    syncCacheStatus();
    const gate=window.CCGLostSizzlerReleaseGate?.state;
    if(gate?.ready){replayPendingSolo();stopLoaderObservers()}
    else if(gate?.failed){state.pendingSolo=false;stopLoaderObservers()}
  }

  installPublicBetaLock();installStagedLoader();
  document.addEventListener("click",capturePreReleaseSolo,true);
  window.addEventListener("ccg-lost-sizzler-cache-status",()=>queueMicrotask(syncCacheStatus));
  window.addEventListener("pagehide",()=>{
    state.pendingSolo=false;if(state.soloRecoveryTimer)clearTimeout(state.soloRecoveryTimer);
    document.removeEventListener("click",capturePreReleaseSolo,true);document.removeEventListener("click",blockPublicPlay,true);
    window.removeEventListener("ccg:auth-ready",onOwnerAuthSignal);window.removeEventListener("ccg:auth-changed",onOwnerAuthSignal);
    try{state.betaObserver?.disconnect?.();state.betaRunObserver?.disconnect?.();state.moduleObserver?.disconnect?.()}catch(_){}
    if(state.ownerAuthTimer)clearInterval(state.ownerAuthTimer);state.ownerAuthTimer=0;
    if(state.r57Timer)clearInterval(state.r57Timer);state.r57Timer=0;
    stopLoaderObservers();
  },{once:true});
  state.timer=setInterval(tick,250);
  state.r57Timer=setInterval(ensureR57,100);
  tick();ensureR57();
  window.CCGLostSizzlerLoadWatchdog={state,stop:stopLoaderObservers,replayPendingSolo,scheduleSoloLivenessCheck,syncLoadingStage,lockPlayableControls,restoreOwnerControls,resolveOwnerAccess,ownerProfileMatches,publicPlayLocked,publicBetaClosed,ensureR57};
})();