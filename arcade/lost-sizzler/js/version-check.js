(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_VERSION_CHECK__)return;
  window.__CCG_LOST_SIZZLER_VERSION_CHECK__=true;

  const RELEASE_VERSION="V10.41";
  const meta=document.querySelector('meta[name="ccg-lost-sizzler-build"]');
  const current=String(meta?.content||"unknown").trim();
  const state={current,latest:null,checking:false,outdated:false,panel:null,button:null,lastCheck:0};

  function loadV136Bootstrap(){
    if(document.querySelector('script[data-ccg-v136-bootstrap="true"]'))return;
    const script=document.createElement("script");
    script.src="js/v10-36-bootstrap.js?v=20260824a";
    script.async=false;
    script.dataset.ccgV136Bootstrap="true";
    document.head.appendChild(script);
  }
  function loadV137HordeFocus(){
    if(document.querySelector('script[data-ccg-v137-horde-focus="true"]'))return;
    const script=document.createElement("script");
    script.src="js/v10-37-horde-focus.js?v=20260824a";
    script.async=false;
    script.dataset.ccgV137HordeFocus="true";
    document.head.appendChild(script);
  }
  function loadV138HordeLive(){
    if(document.querySelector('script[data-ccg-v138-horde-live="true"]'))return;
    const script=document.createElement("script");
    script.src="js/v10-38-horde-live.js?v=20260824a";
    script.async=false;
    script.dataset.ccgV138HordeLive="true";
    document.head.appendChild(script);
  }
  function loadV139HordeLiveLoadout(){
    if(document.querySelector('script[data-ccg-v139-horde-live-loadout="true"]'))return;
    const script=document.createElement("script");
    script.src="js/v10-39-horde-live-loadout.js?v=20260824a";
    script.async=false;
    script.dataset.ccgV139HordeLiveLoadout="true";
    document.head.appendChild(script);
  }
  function loadV140HordeFinal(){
    if(document.querySelector('script[data-ccg-v140-horde-final="true"]'))return;
    const script=document.createElement("script");
    script.src="js/v10-40-horde-final.js?v=20260824a";
    script.async=false;
    script.dataset.ccgV140HordeFinal="true";
    document.head.appendChild(script);
  }
  function loadV141MultiplayerPresence(){
    if(document.querySelector('script[data-ccg-v141-multiplayer-presence="true"]'))return;
    const script=document.createElement("script");
    script.src="js/v10-41-multiplayer-presence.js?v=20260824b";
    script.async=false;
    script.dataset.ccgV141MultiplayerPresence="true";
    document.head.appendChild(script);
  }
  loadV136Bootstrap();
  loadV137HordeFocus();
  loadV138HordeLive();
  loadV139HordeLiveLoadout();
  loadV140HordeFinal();
  loadV141MultiplayerPresence();

  function menuVisible(){
    const menu=document.getElementById("menu");
    return Boolean(menu&&!menu.classList.contains("hidden")&&document.body?.dataset?.runActive!=="true");
  }

  function setReleaseLabels(){
    const subtitle=document.querySelector(".brand p");
    if(subtitle)subtitle.textContent=`THE LOST SIZZLER — ${RELEASE_VERSION}`;
    const badge=document.querySelector(".build-badge");
    if(badge&&!state.outdated){badge.textContent=`BUILD ${current}`;badge.title=`${RELEASE_VERSION} · Lost Sizzler build ${current}`}
  }

  function ensureButton(){
    if(state.button?.isConnected)return state.button;
    const row=document.querySelector("#menu .secondary-menu")||document.querySelector("#menu .menu-buttons");
    if(!row)return null;
    const button=document.createElement("button");
    button.id="version-refresh-btn";
    button.type="button";
    button.textContent="Check / Refresh Game";
    button.title=`${RELEASE_VERSION} · loaded build ${current}`;
    button.addEventListener("click",()=>checkLatest(true));
    const exit=row.querySelector(".menu-exit-link");
    row.insertBefore(button,exit||null);
    state.button=button;
    return button;
  }

  function ensurePanel(){
    if(state.panel?.isConnected)return state.panel;
    const host=document.querySelector(".game-area")||document.body;
    const wrap=document.createElement("div");
    wrap.id="version-check-panel";
    wrap.className="overlay hidden";
    wrap.innerHTML=`<div class="panel compact"><h2 id="version-check-title">Game Version</h2><p id="version-check-copy"></p><div class="menu-buttons"><button id="version-check-update" class="primary" type="button">Refresh to Latest Version</button><button id="version-check-close" type="button">Close</button></div><small id="version-check-detail"></small></div>`;
    host.appendChild(wrap);
    wrap.querySelector("#version-check-close")?.addEventListener("click",()=>wrap.classList.add("hidden"));
    wrap.querySelector("#version-check-update")?.addEventListener("click",()=>reloadFresh(state.latest||current));
    state.panel=wrap;
    return wrap;
  }

  function renderPanel(mode,message){
    const panel=ensurePanel();if(!panel)return;
    const title=panel.querySelector("#version-check-title"),copy=panel.querySelector("#version-check-copy"),detail=panel.querySelector("#version-check-detail"),update=panel.querySelector("#version-check-update");
    if(mode==="outdated"){
      title.textContent="Update Available";
      copy.textContent="Your browser is running an older cached version of The Lost Sizzler. Refresh now to load the latest game files.";
      detail.textContent=`${RELEASE_VERSION} · Loaded: ${current} · Latest: ${state.latest||"unknown"}`;
      update.textContent="Refresh to Latest Version";
      update.classList.remove("hidden");
    }else if(mode==="current"){
      title.textContent="Game Is Up To Date";
      copy.textContent=message||`You are running ${RELEASE_VERSION}, the latest published Lost Sizzler build.`;
      detail.textContent=`${RELEASE_VERSION} · Loaded: ${current} · Latest: ${state.latest||current}`;
      update.textContent="Reload Anyway";
      update.classList.remove("hidden");
    }else{
      title.textContent="Version Check Unavailable";
      copy.textContent=message||"The latest build number could not be checked. You can still reload the game if something looks stale.";
      detail.textContent=`${RELEASE_VERSION} · Loaded build: ${current}`;
      update.textContent="Reload Game";
      update.classList.remove("hidden");
    }
    panel.classList.remove("hidden");
  }

  function markOutdated(){
    state.outdated=true;
    const button=ensureButton();
    if(button){button.textContent="Update Available — Refresh";button.title=`Loaded ${current}; latest ${state.latest}`}
    const badge=document.querySelector(".build-badge");
    if(badge){badge.textContent="UPDATE AVAILABLE";badge.title=`Loaded ${current}; latest ${state.latest}`}
    const subtitle=document.querySelector(".brand p");if(subtitle)subtitle.textContent=`THE LOST SIZZLER — ${RELEASE_VERSION}`;
    if(menuVisible())renderPanel("outdated");
  }

  function markCurrent(){
    state.outdated=false;
    const button=ensureButton();
    if(button){button.textContent="Check / Refresh Game";button.title=`${RELEASE_VERSION} · latest build loaded: ${current}`}
    setReleaseLabels();
  }

  async function checkLatest(manual=false){
    if(state.checking)return;
    state.checking=true;
    const button=ensureButton();if(button&&manual)button.textContent="Checking…";
    try{
      const response=await fetch(`version.json?check=${Date.now()}`,{cache:"no-store",headers:{"Cache-Control":"no-cache"}});
      if(!response.ok)throw new Error(`HTTP ${response.status}`);
      const payload=await response.json();
      state.latest=String(payload?.build||"").trim()||null;
      state.lastCheck=Date.now();
      if(state.latest&&current!=="unknown"&&state.latest!==current){markOutdated();if(manual&&!menuVisible())renderPanel("outdated");return}
      markCurrent();if(manual)renderPanel("current");
    }catch(error){
      console.warn("[Lost Sizzler] version check failed",error);
      if(button)button.textContent="Check / Refresh Game";
      setReleaseLabels();
      if(manual)renderPanel("error","The live build number could not be reached just now. Reloading will still request a fresh copy of the game page.");
    }finally{state.checking=false}
  }

  function reloadFresh(build){
    try{
      const url=new URL(window.location.href);
      url.searchParams.set("ccg-build",String(build||"latest"));
      url.searchParams.set("ccg-refresh",String(Date.now()));
      window.location.replace(url.toString());
    }catch(_){window.location.reload()}
  }

  function install(){ensureButton();ensurePanel();setReleaseLabels()}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",install,{once:true});else install();
  const labelTimer=setInterval(()=>{
    setReleaseLabels();
    const gate=window.CCGLostSizzlerReleaseGate;
    if(gate?.state?.ready||gate?.state?.failed){clearInterval(labelTimer);setReleaseLabels()}
  },180);
  setTimeout(()=>checkLatest(false),900);
  const timer=setInterval(()=>{checkLatest(false);if(state.outdated&&menuVisible())renderPanel("outdated")},300000);
  window.addEventListener("pagehide",()=>{clearInterval(timer);clearInterval(labelTimer)},{once:true});
  window.CCGLostSizzlerVersion={state,releaseVersion:RELEASE_VERSION,check:()=>checkLatest(true),refresh:()=>reloadFresh(state.latest||current)};
})();
