/* The Lost Sizzler V10.42 — authoritative ordered bootstrap. */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V142_BOOTSTRAP__)return;
  window.__CCG_LOST_SIZZLER_V142_BOOTSTRAP__=true;

  const BUILD="V10.42 r1";
  const CACHE="20260907r1";
  const modules=[
    ["v10-42-procedural-overhaul.js","CCGLostSizzlerV142ProceduralOverhaul"],
    ["v10-42-five-depth-campaign.js","CCGLostSizzlerV142FiveDepthCampaign"],
    ["v10-42-floor-balance.js","CCGLostSizzlerV142FloorBalance"],
    ["v10-42-tutorial-campaign.js","CCGLostSizzlerV142TutorialCampaign"],
    ["v10-42-demo-paywall.js","CCGLostSizzlerV142DemoPaywall"],
    ["v10-42-multiplayer-state.js","CCGLostSizzlerV142MultiplayerState"],
    ["v10-42-multiplayer-collect-authority.js","CCGLostSizzlerV142MultiplayerCollectAuthority"],
    ["v10-42-r1-stability.js","CCGLostSizzlerV142R1Stability"]
  ];
  const state={build:BUILD,cache:CACHE,ready:false,failed:false,loaded:[]};
  window.CCGLostSizzlerV142Bootstrap=state;

  function stampBuild(){
    const buildMeta=document.querySelector('meta[name="ccg-lost-sizzler-build"]'),cacheMeta=document.querySelector('meta[name="ccg-lost-sizzler-cache"]');
    if(buildMeta)buildMeta.content=BUILD;if(cacheMeta)cacheMeta.content=CACHE;
    const subtitle=document.querySelector(".v102-brand p");if(subtitle)subtitle.textContent="THE LOST SIZZLER — V10.42";
    const badge=document.querySelector(".build-badge");if(badge)badge.textContent=`BUILD ${BUILD.toUpperCase()}`;
    document.body.dataset.v142Build=BUILD;document.body.dataset.v142BootstrapReady="false";
  }

  function blockedStart(event){
    if(state.ready||state.failed)return;
    const target=event.target instanceof Element?event.target.closest("#solo-btn,#continue-save-btn,#daily-btn,#split-btn,#create-btn,#join-btn,#horde-mode-btn,#saboteurs-mode-btn,#tutorial-zone-btn"):null;
    if(!target)return;
    event.preventDefault();event.stopImmediatePropagation();
    const note=document.getElementById("menu-note");if(note)note.textContent="V10.42 systems are finishing their ordered startup. Start controls will unlock automatically when the build is ready.";
  }
  document.addEventListener("click",blockedStart,true);

  function alreadyLoaded(marker){return Boolean(marker&&window[marker])}
  function loadOne(file,marker){
    if(alreadyLoaded(marker)){state.loaded.push(file);return Promise.resolve()}
    return new Promise((resolve,reject)=>{
      const existing=[...document.scripts].find(script=>String(script.src||"").includes(`/js/${file}`));
      if(existing){
        if(alreadyLoaded(marker)){state.loaded.push(file);resolve();return}
        existing.addEventListener("load",()=>{state.loaded.push(file);resolve()},{once:true});
        existing.addEventListener("error",()=>reject(new Error(`Failed to load ${file}`)),{once:true});
        return;
      }
      const script=document.createElement("script");script.async=false;script.src=`js/${file}?v=${CACHE}`;script.dataset.ccgV142Ordered="true";
      script.onload=()=>{state.loaded.push(file);resolve()};script.onerror=()=>reject(new Error(`Failed to load ${file}`));document.head.appendChild(script);
    })
  }

  async function boot(){
    stampBuild();
    try{
      for(const [file,marker] of modules)await loadOne(file,marker);
      state.ready=true;document.body.dataset.v142BootstrapReady="true";document.removeEventListener("click",blockedStart,true);
      const note=document.getElementById("menu-note");if(note)note.textContent="V10.42 READY — five new dungeon floors are loaded in verified order. RPG attributes, relics, global Keys, Banishment Essence and rescued C64 games persist between depths; collectible games are shuffled into a seeded random order for every run.";
      window.dispatchEvent(new CustomEvent("ccg:v142-ready",{detail:{build:BUILD,cache:CACHE,loaded:[...state.loaded]}}));
    }catch(error){
      state.failed=true;state.error=String(error?.message||error);document.body.dataset.v142BootstrapReady="failed";
      const note=document.getElementById("menu-note");if(note)note.textContent=`V10.42 startup failed safely: ${state.error}. Refresh before starting a run.`;
      console.error("[Lost Sizzler V10.42] ordered bootstrap failed",error);
    }
  }

  boot();
})();
