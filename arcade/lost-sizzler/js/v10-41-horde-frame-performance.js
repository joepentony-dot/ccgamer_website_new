/* The Lost Sizzler V10.41 — Horde frame-rate and prewarm performance layer. */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V141_HORDE_FRAME_PERFORMANCE__)return;
  window.__CCG_LOST_SIZZLER_V141_HORDE_FRAME_PERFORMANCE__=true;

  const HORDE="horde-survivor";
  const INSTALL_MS=80;
  const R60_OWNER_MS=40;
  const RADAR_REFRESH_MS=140;
  const STATUS_REFRESH_MS=120;
  const FIRST_WAVE_TRACK="assets/audio/music/horde-survival-waves-1-4.ogg";
  const LATER_TRACKS=["assets/audio/music/horde-survival-waves-5-9.ogg","assets/audio/music/horde-survival-wave-10.ogg"];
  const R60_SRC="js/v10-41-r60-horde-combat-integrity.js";
  const state={
    timer:0,installed:false,
    radarWrapped:false,radarSource:null,lastRadarAt:0,radarDraws:0,radarSkips:0,
    statusTimer:0,modeObserver:null,lastStatusSignature:"",statusRenders:0,statusStarts:0,statusStops:0,
    firstWavePrewarmStarted:false,firstWavePrewarmReady:false,firstWavePrewarmPromise:null,laterPrewarmStarted:false,imageDecodes:0,prewarmErrors:0,
    r60Loader:null,r60Ready:false,r60Loads:0,r60Errors:0,r60LiveTimer:0,r60LiveMonitorStops:0,r60LiveOwnerInstalls:0,r60LiveOwnerDeferrals:0,r60LiveOwnerErrors:0,
    r60HordeLiveOwner:null,r60HordeLiveOwnerInstalls:0,r60HordeLiveOwnerReassertions:0,r60HordeLiveOwnerErrors:0
  };

  const special=()=>{try{return window.CCGLostSizzlerSpecialModes?.active||null}catch(_){return null}};
  const specialType=()=>String(special()?.type||document.body?.dataset?.specialMode||"");
  const isHorde=()=>specialType()===HORDE;
  const perfNow=()=>{try{return Number(performance.now())||Date.now()}catch(_){return Date.now()}};

  function stopUnsafeR60LiveMonitor(){
    const live=window.CCGLostSizzlerV141R60LivePlayIntegrity;
    if(!live?.state)return false;
    if(live.state.timer){clearInterval(live.state.timer);live.state.timer=0;state.r60LiveMonitorStops++}
    return true
  }

  function stopR60LiveOwnerTimer(){
    if(state.r60LiveTimer){clearInterval(state.r60LiveTimer);state.r60LiveTimer=0}
    return true
  }

  function originalChainContains(fn,target){
    if(typeof fn!=="function"||typeof target!=="function")return false;
    const seen=new Set();let current=fn,depth=0;
    while(typeof current==="function"&&!seen.has(current)&&depth++<24){
      if(current===target)return true;
      seen.add(current);current=typeof current.__ccgOriginal==="function"?current.__ccgOriginal:null
    }
    return false
  }

  function originalChainHasMarker(fn,marker){
    if(typeof fn!=="function")return false;
    const seen=new Set();let current=fn,depth=0;
    while(typeof current==="function"&&!seen.has(current)&&depth++<24){
      try{if(current[marker]===true)return true}catch(_){}
      seen.add(current);current=typeof current.__ccgOriginal==="function"?current.__ccgOriginal:null
    }
    return false
  }

  function unwrapR60LiveSource(fn){
    if(typeof fn!=="function")return null;
    const seen=new Set();let current=fn,depth=0;
    while(typeof current==="function"&&!seen.has(current)&&depth++<24&&current.__ccgV141R60RealElapsed===true&&typeof current.__ccgOriginal==="function"){
      seen.add(current);current=current.__ccgOriginal
    }
    return typeof current==="function"?current:null
  }

  function maintainR60HordeLiveOwner(){
    const timing=window.CCGLostSizzlerV141R60HordeCombatIntegrity,live=window.CCGLostSizzlerV138;
    if(!isHorde()||!timing?.state||!live||typeof live.updateHordeLive!=="function")return false;
    const current=live.updateHordeLive;
    if(current===state.r60HordeLiveOwner||originalChainContains(current,state.r60HordeLiveOwner))return true;
    const timingOwner=timing.state.liveOwner,timingOwnerInChain=typeof timingOwner==="function"&&originalChainContains(current,timingOwner);
    /* The UI-performance owner is terminal during Horde play: it intentionally
       replaces its source rather than delegating. A buried R60 marker therefore
       does not mean the elapsed-time owner will run. Keep the UI owner as the
       bounded source and let this final owner account for real elapsed time. */
    const terminalUiOwner=timingOwnerInChain&&current.__ccgV141UiPerformanceLive===true;
    const retainsTimingOwner=timingOwnerInChain&&!terminalUiOwner;
    const source=terminalUiOwner||retainsTimingOwner?current:unwrapR60LiveSource(current);if(typeof source!=="function")return false;
    try{
      const wrapped=function updateHordeLiveV141R60FinalOwner(dt){
        const active=isHorde(),timingState=timing.state,elapsed=active&&Number(timingState?.currentElapsed||0)>0?Number(timingState.currentElapsed):Number(dt)||0;
        if(active&&!retainsTimingOwner){
          timingState.liveElapsedFrames=Number(timingState.liveElapsedFrames||0)+1;
          if(typeof timing.runHordeLiveElapsed==="function")return timing.runHordeLiveElapsed(source,this,elapsed)
        }
        return source.call(this,elapsed)
      };
      wrapped.__ccgV141R60RealElapsed=true;wrapped.__ccgV141R60FinalLiveOwner=true;wrapped.__ccgOriginal=source;
      if(originalChainHasMarker(source,"__ccgV141UiPerformanceLive"))wrapped.__ccgV141UiPerformanceLive=true;
      const replacing=typeof state.r60HordeLiveOwner==="function";
      state.r60HordeLiveOwner=wrapped;live.updateHordeLive=wrapped;state.r60HordeLiveOwnerInstalls++;if(replacing)state.r60HordeLiveOwnerReassertions++;
      return true
    }catch(_){state.r60HordeLiveOwnerErrors++;return false}
  }

  function r60LiveOwnerSafe(){
    const live=window.CCGLostSizzlerV141R60LivePlayIntegrity;if(!live)return false;
    if(specialType())return false;
    try{if(window.CCGLostSizzlerV141R29SpyEngine?.state?.isolated)return false}catch(_){}
    try{
      const r30=window.CCGLostSizzlerV141R30,current=window.movePlayer;
      if(typeof current!=="function")return false;
      if(r30?.spyContaminated?.(current)||r30?.topLevelSpyOwner?.(current))return false
    }catch(_){return false}
    return true
  }

  function maintainR60LiveOwner(){
    const live=window.CCGLostSizzlerV141R60LivePlayIntegrity;if(!live)return false;
    stopUnsafeR60LiveMonitor();
    if(!r60LiveOwnerSafe()){state.r60LiveOwnerDeferrals++;return false}
    try{
      const result=live.install?.();
      if(result!==false)state.r60LiveOwnerInstalls++;
      return result!==false
    }catch(_){state.r60LiveOwnerErrors++;return false}
  }

  function maintainR60Owners(){
    stopUnsafeR60LiveMonitor();
    if(isHorde())return maintainR60HordeLiveOwner();
    return maintainR60LiveOwner()
  }

  function startR60LiveOwnerTimer(){
    if(!window.CCGLostSizzlerV141R60LivePlayIntegrity||!window.CCGLostSizzlerV141R60HordeCombatIntegrity)return false;
    stopUnsafeR60LiveMonitor();
    if(!isHorde()){stopR60LiveOwnerTimer();return maintainR60LiveOwner()}
    if(!state.r60LiveTimer){
      state.r60LiveTimer=setInterval(()=>{try{
        if(!isHorde()){stopR60LiveOwnerTimer();maintainR60LiveOwner();return}
        maintainR60Owners()
      }catch(_){state.r60LiveOwnerErrors++}},R60_OWNER_MS)
    }
    maintainR60Owners();return true
  }

  function syncR60LiveOwner(){
    if(!state.r60Ready&&!window.CCGLostSizzlerV141R60HordeCombatIntegrity)return false;
    return isHorde()?startR60LiveOwnerTimer():(stopR60LiveOwnerTimer()&&maintainR60LiveOwner())
  }

  function ensureR60(){
    if(window.CCGLostSizzlerV141R60HordeCombatIntegrity){state.r60Ready=true;startR60LiveOwnerTimer();return true}
    if(state.r60Loader)return false;
    const script=document.createElement("script");state.r60Loader=script;state.r60Loads++;
    script.src=`${R60_SRC}?v=${encodeURIComponent("20260901r60")}`;script.async=false;
    script.onload=()=>{state.r60Loader=null;state.r60Ready=Boolean(window.CCGLostSizzlerV141R60HordeCombatIntegrity);if(state.r60Ready)startR60LiveOwnerTimer()};
    script.onerror=()=>{state.r60Loader=null;state.r60Errors++;setTimeout(()=>{try{ensureR60()}catch(_){}},1000)};
    document.head.appendChild(script);return false
  }

  function fetchWarm(src){
    if(typeof fetch!=="function")return Promise.resolve(false);
    return fetch(src,{cache:"force-cache",credentials:"same-origin"}).then(response=>Boolean(response?.ok)).catch(()=>{state.prewarmErrors++;return false})
  }

  async function decodeKnownImages(){
    const images=new Set();
    try{for(const image of Object.values(window.lostSizzlerPixelAssets||{}))if(image&&typeof image.decode==="function")images.add(image)}catch(_){}
    try{for(const image of Object.values(window.CCGLostSizzlerPixelAssets||{}))if(image&&typeof image.decode==="function")images.add(image)}catch(_){}
    for(const image of images){
      try{await image.decode();state.imageDecodes++}catch(_){}
    }
    return images.size
  }

  function prewarmFirstWave(){
    if(state.firstWavePrewarmPromise)return state.firstWavePrewarmPromise;
    state.firstWavePrewarmStarted=true;
    state.firstWavePrewarmPromise=Promise.all([fetchWarm(FIRST_WAVE_TRACK),decodeKnownImages()]).then(results=>{
      state.firstWavePrewarmReady=Boolean(results[0]);return state.firstWavePrewarmReady
    }).catch(()=>{state.prewarmErrors++;return false});
    return state.firstWavePrewarmPromise
  }

  async function prewarmLaterWaves(){
    if(state.laterPrewarmStarted)return true;
    state.laterPrewarmStarted=true;
    await Promise.all(LATER_TRACKS.map(fetchWarm));
    return true
  }

  function schedulePrewarm(){
    const begin=()=>{prewarmFirstWave().catch(()=>{state.prewarmErrors++})};
    // Do not spend decode/network work on Solo, Dungeon, Tutorial or Spy startup.
    // Warm Horde assets only once the player shows intent to launch Horde.
    for(const selector of ["#horde-mode-btn","[data-horde-solo-btn]","#horde-solo-btn"]){
      const button=document.querySelector(selector);if(!button)continue;
      button.addEventListener("pointerenter",begin,{once:true,passive:true});button.addEventListener("focus",begin,{once:true});button.addEventListener("pointerdown",begin,{once:true,passive:true})
    }
  }

  function installRadarThrottle(){
    const current=window.renderRadarPanel;if(typeof current!=="function")return false;
    if(current.__ccgV141HordeRadarThrottle){state.radarWrapped=true;state.radarSource=current;return true}
    const source=current;
    const wrapped=function renderRadarPanelV141HordeThrottle(){
      if(!isHorde())return source.apply(this,arguments);
      const now=perfNow();
      if(now-state.lastRadarAt<RADAR_REFRESH_MS){state.radarSkips++;return false}
      state.lastRadarAt=now;state.radarDraws++;return source.apply(this,arguments)
    };
    wrapped.__ccgV141HordeRadarThrottle=true;wrapped.__ccgOriginal=source;
    window.renderRadarPanel=wrapped;state.radarSource=wrapped;state.radarWrapped=true;return true
  }

  function desiredQuota(runState){
    const wave=Math.max(0,Number(runState?.wave)||0),players=Math.max(1,Number(runState?.playerCount)||1);if(!wave)return 0;
    try{if(window.CCGLostSizzlerV138?.desiredQuota)return Math.max(0,Number(window.CCGLostSizzlerV138.desiredQuota(wave,players))||0)}catch(_){}
    try{return Math.max(0,Number(window.CCGLostSizzlerHorde?.quotaFor?.(wave,players))||0)}catch(_){return 0}
  }

  function remaining(runState){
    if(!runState)return 0;
    const defeated=Math.max(0,Number(runState.defeated)||0),bossAlive=Boolean(runState.boss?.alive&&Number(runState.boss?.hp||0)>0);
    return Math.max(0,desiredQuota(runState)-defeated)+(bossAlive?1:0)
  }

  function ensureStatusStrip(){
    let node=document.getElementById("horde-performance-status");if(node)return node;
    const gameArea=document.querySelector(".game-area");if(!gameArea)return null;
    node=document.createElement("div");node.id="horde-performance-status";node.setAttribute("aria-live","polite");
    node.innerHTML='<strong>HORDE</strong><span data-horde-wave>WAVE 0/10</span><span data-horde-remaining>ENEMIES LEFT 0</span><span data-horde-active>ACTIVE 0</span>';
    gameArea.insertAdjacentElement("beforebegin",node);return node
  }

  function ensureStyles(){
    if(document.getElementById("ccg-v141-horde-frame-performance-style"))return true;
    const style=document.createElement("style");style.id="ccg-v141-horde-frame-performance-style";style.textContent=`
      #horde-performance-status{display:none}
      body[data-special-mode="horde-survivor"] #horde-performance-status{
        display:flex;align-items:center;justify-content:center;gap:16px;min-height:28px;padding:4px 12px;box-sizing:border-box;
        border-top:1px solid rgba(255,216,90,.34);border-bottom:1px solid rgba(108,236,255,.28);background:rgba(7,4,12,.96);
        color:#d9cfeb;font:900 10px/1.2 "Courier New",monospace;letter-spacing:.35px;white-space:nowrap;overflow:hidden
      }
      body[data-special-mode="horde-survivor"] #horde-performance-status strong{color:#ffd85a}
      body[data-special-mode="horde-survivor"] #horde-performance-status [data-horde-remaining]{color:#6cecff}
      body[data-special-mode="horde-survivor"] #horde-live-remaining{display:none!important}
      @media(max-width:720px){body[data-special-mode="horde-survivor"] #horde-performance-status{gap:8px;font-size:8px;padding-inline:6px}}
    `;document.head.appendChild(style);return true
  }

  function updateStatus(){
    if(!isHorde()){state.lastStatusSignature="";return false}
    const node=ensureStatusStrip();if(!node)return false;
    const runState=special()?.state,wave=Math.max(0,Number(runState?.wave)||0),left=remaining(runState);
    let active=0;try{active=(host?.enemies||[]).filter(enemy=>enemy?.alive&&enemy.hordeEnemy).length}catch(_){}
    const signature=`${wave}|${left}|${active}`;if(signature===state.lastStatusSignature)return false;state.lastStatusSignature=signature;
    const waveNode=node.querySelector("[data-horde-wave]"),leftNode=node.querySelector("[data-horde-remaining]"),activeNode=node.querySelector("[data-horde-active]");
    if(waveNode)waveNode.textContent=`WAVE ${wave}/10`;if(leftNode)leftNode.textContent=`ENEMIES LEFT ${left}`;if(activeNode)activeNode.textContent=`ACTIVE ${active}`;
    state.statusRenders++;return true
  }

  function stopStatusTimer(){
    if(state.statusTimer){clearInterval(state.statusTimer);state.statusTimer=0;state.statusStops++}
    state.lastStatusSignature="";
    return true
  }

  function startStatusTimer(){
    if(!isHorde())return stopStatusTimer();
    if(state.statusTimer)return true;
    ensureStatusStrip();updateStatus();prewarmLaterWaves().catch(()=>{state.prewarmErrors++});
    state.statusTimer=setInterval(()=>{
      if(!isHorde()){stopStatusTimer();return}
      try{updateStatus()}catch(_){}
    },STATUS_REFRESH_MS);
    state.statusStarts++;return true
  }

  function syncStatusTimer(){return isHorde()?startStatusTimer():stopStatusTimer()}

  function installModeObserver(){
    if(state.modeObserver)return true;
    if(typeof MutationObserver!=="function"||!document.body)return false;
    state.modeObserver=new MutationObserver(()=>{syncStatusTimer();syncR60LiveOwner()});
    state.modeObserver.observe(document.body,{attributes:true,attributeFilter:["data-special-mode","data-run-active","data-mode-controller"]});
    addEventListener("focus",syncR60LiveOwner,{passive:true});
    addEventListener("pageshow",syncR60LiveOwner,{passive:true});
    document.addEventListener("visibilitychange",syncR60LiveOwner,{passive:true});
    syncStatusTimer();syncR60LiveOwner();return true
  }

  function install(){
    ensureR60();ensureStyles();installRadarThrottle();installModeObserver();
    if(state.radarWrapped&&state.modeObserver){state.installed=true;document.body.dataset.v141HordeFramePerformance="true"}
    return state.installed
  }

  ensureR60();schedulePrewarm();
  if(!install())state.timer=setInterval(()=>{if(install()){clearInterval(state.timer);state.timer=0}},INSTALL_MS);
  addEventListener("pagehide",()=>{
    if(state.timer)clearInterval(state.timer);state.timer=0;if(state.r60LiveTimer)clearInterval(state.r60LiveTimer);state.r60LiveTimer=0;stopStatusTimer();
    try{state.modeObserver?.disconnect?.()}catch(_){}state.modeObserver=null
  },{once:true});

  window.CCGLostSizzlerV141HordeFramePerformance={
    RADAR_REFRESH_MS,STATUS_REFRESH_MS,R60_OWNER_MS,FIRST_WAVE_TRACK,LATER_TRACKS,R60_SRC,prewarmFirstWave,prewarmLaterWaves,decodeKnownImages,ensureR60,
    stopUnsafeR60LiveMonitor,stopR60LiveOwnerTimer,originalChainContains,unwrapR60LiveSource,maintainR60HordeLiveOwner,r60LiveOwnerSafe,maintainR60LiveOwner,maintainR60Owners,startR60LiveOwnerTimer,syncR60LiveOwner,
    installRadarThrottle,ensureStatusStrip,updateStatus,startStatusTimer,stopStatusTimer,syncStatusTimer,installModeObserver,remaining,get state(){return state}
  };
})();
