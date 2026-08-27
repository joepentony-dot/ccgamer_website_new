/* The Lost Sizzler V10.41 — Horde frame-rate and prewarm performance layer. */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V141_HORDE_FRAME_PERFORMANCE__)return;
  window.__CCG_LOST_SIZZLER_V141_HORDE_FRAME_PERFORMANCE__=true;

  const HORDE="horde-survivor";
  const INSTALL_MS=80;
  const RADAR_REFRESH_MS=140;
  const STATUS_REFRESH_MS=120;
  const FIRST_WAVE_TRACK="assets/audio/music/horde-survival-waves-1-4.ogg";
  const LATER_TRACKS=["assets/audio/music/horde-survival-waves-5-9.ogg","assets/audio/music/horde-survival-wave-10.ogg"];
  const state={
    timer:0,installed:false,
    radarWrapped:false,radarSource:null,lastRadarAt:0,radarDraws:0,radarSkips:0,
    statusTimer:0,modeObserver:null,lastStatusSignature:"",statusRenders:0,statusStarts:0,statusStops:0,
    firstWavePrewarmStarted:false,firstWavePrewarmReady:false,firstWavePrewarmPromise:null,laterPrewarmStarted:false,imageDecodes:0,prewarmErrors:0
  };

  const special=()=>{try{return window.CCGLostSizzlerSpecialModes?.active||null}catch(_){return null}};
  const isHorde=()=>String(special()?.type||document.body?.dataset?.specialMode||"")===HORDE;
  const perfNow=()=>{try{return Number(performance.now())||Date.now()}catch(_){return Date.now()}};

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
    state.modeObserver=new MutationObserver(()=>syncStatusTimer());
    state.modeObserver.observe(document.body,{attributes:true,attributeFilter:["data-special-mode"]});
    syncStatusTimer();return true
  }

  function install(){
    ensureStyles();installRadarThrottle();installModeObserver();
    if(state.radarWrapped&&state.modeObserver){state.installed=true;document.body.dataset.v141HordeFramePerformance="true"}
    return state.installed
  }

  schedulePrewarm();
  if(!install())state.timer=setInterval(()=>{if(install()){clearInterval(state.timer);state.timer=0}},INSTALL_MS);
  addEventListener("pagehide",()=>{
    if(state.timer)clearInterval(state.timer);state.timer=0;stopStatusTimer();
    try{state.modeObserver?.disconnect?.()}catch(_){}state.modeObserver=null
  },{once:true});

  window.CCGLostSizzlerV141HordeFramePerformance={
    RADAR_REFRESH_MS,STATUS_REFRESH_MS,FIRST_WAVE_TRACK,LATER_TRACKS,prewarmFirstWave,prewarmLaterWaves,decodeKnownImages,
    installRadarThrottle,ensureStatusStrip,updateStatus,startStatusTimer,stopStatusTimer,syncStatusTimer,installModeObserver,remaining,get state(){return state}
  };
})();