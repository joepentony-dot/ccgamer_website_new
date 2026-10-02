/* The Lost Sizzler V10.41 r55 — final playtest cleanup.
 *
 * Owns two late presentation/runtime boundaries exposed by live playtesting:
 * 1) menu mode-card text must keep three distinct non-overlapping rows;
 * 2) Horde browser authority must remain active until dedicated authority is
 *    actually live, with Solo Horde always remaining browser-authoritative.
 */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V141_R55_FINAL_PLAYTEST_CLEANUP__)return;
  window.__CCG_LOST_SIZZLER_V141_R55_FINAL_PLAYTEST_CLEANUP__=true;

  const HORDE="horde-survivor";
  const STYLE_ID="ccg-v141-r55-final-playtest-cleanup";
  const state={timer:0,menuPasses:0,menuRepairs:0,authorityRepairs:0,phaseRepairs:0,bannerRepairs:0,lastAuthority:null,lastPhase:""};

  const special=()=>{try{return window.CCGLostSizzlerSpecialModes?.active||null}catch(_){return null}};
  const isHorde=()=>String(special()?.type||document.body?.dataset?.specialMode||"")===HORDE;
  const dedicated=()=>window.CCGLostSizzlerV141R38ColyseusHorde||null;
  const dedicatedLive=()=>{
    if(!isHorde())return false;
    try{return Boolean(dedicated()?.state?.authorityLive||document.body?.dataset?.hordeTransport==="colyseus")}catch(_){return false}
  };

  function injectStyle(){
    /* R93: current blocking CSS owns menu presentation from first paint.
     * Remove any stale R55 style node instead of injecting another menu layer. */
    document.getElementById(STYLE_ID)?.remove?.();
    return true
  }

  function sealButtonLayout(button){
    if(!button)return false;
    const id=String(button.id||"");
    let height="74px",font="9.5px";
    if(id==="solo-btn"||id==="create-btn"){height="82px";font="10.5px"}
    else if(id==="continue-save-btn"){height="78px";font="10px"}
    else if(id==="tutorial-zone-btn"||id==="daily-btn"){height="70px";font="9px"}
    const mobile=matchMedia?.("(max-width:900px), (pointer:coarse)")?.matches===true;
    if(mobile)height="78px";
    const hidden=button.classList.contains("hidden");
    const values={
      "box-sizing":"border-box","position":"relative","align-items":"center","justify-content":"flex-start",
      "min-height":height,"padding":mobile?"29px 12px 25px":"28px 12px 24px","overflow":"hidden","white-space":"normal","text-overflow":"clip",
      "text-align":"left","line-height":"1.15","font-size":font,"text-shadow":"none","transform":"none","filter":"none","-webkit-filter":"none"
    };
    if(!hidden)values.display="flex";
    let repaired=false;
    if(hidden&&button.style.getPropertyValue("display")){button.style.removeProperty("display");repaired=true}
    for(const [prop,value] of Object.entries(values)){
      if(button.style.getPropertyValue(prop)!==value||button.style.getPropertyPriority(prop)!=="important"){button.style.setProperty(prop,value,"important");repaired=true}
    }
    if(repaired)state.menuRepairs++;
    return true
  }

  function alignSupportedMenuOrder(grid){
    if(!grid)return false;
    const ids=["continue-save-btn","solo-btn","split-btn","tutorial-zone-btn","daily-btn"];
    const buttons=ids.map(id=>grid.querySelector(`#${id}`)).filter(Boolean);
    if(!buttons.length)return false;
    const current=[...grid.children].filter(node=>ids.includes(String(node.id||""))).map(node=>node.id);
    if(current.length===buttons.length&&current.every((id,index)=>id===buttons[index].id))return true;
    const focused=document.activeElement;
    const restoreFocus=focused instanceof HTMLElement&&buttons.includes(focused);
    const fragment=document.createDocumentFragment();for(const button of buttons)fragment.appendChild(button);grid.insertBefore(fragment,grid.firstChild);
    if(restoreFocus){try{focused.focus({preventScroll:true})}catch(_){try{focused.focus()}catch(__){}}}
    state.menuRepairs++;return true
  }

  function markMenu(){
    /* R93: retained as a compatibility no-op. The current menu is static CSS
     * owned; R55 must not reorder or restyle it after first paint. */
    const grid=document.querySelector("#menu .game-mode-buttons");
    if(grid)delete grid.dataset.r55TextLayout;
    return Boolean(grid)
  }

  function expectedAuthority(){
    if(!isHorde())return null;
    if(dedicatedLive())return false;
    try{
      if(document.body?.dataset?.hordeSolo==="true"||net?.mode==="solo"||!net?.connected)return true;
      return Boolean(net?.isHost)
    }catch(_){return true}
  }

  function updateBanner(){
    const live=special(),banner=document.getElementById("horde-transition-banner");if(!live||!banner)return false;
    const phase=String(live.state?.state||"");
    if(["wave","siege"].includes(phase)&&banner.dataset.visible!=="false"){
      banner.dataset.visible="false";state.bannerRepairs++
    }
    try{window.CCGLostSizzlerV141HordeCompletion?.updateTransitionBanner?.()}catch(_){}
    return true
  }

  function repairHordeAuthority(){
    const live=special();if(!isHorde()||!live)return false;
    const expected=expectedAuthority();if(expected===null)return false;
    if(live.authoritative!==expected){live.authoritative=expected;state.authorityRepairs++}
    state.lastAuthority=expected;

    if(!dedicatedLive()&&document.body?.dataset?.hordeTransport==="colyseus")delete document.body.dataset.hordeTransport;

    const runState=live.state,H=window.CCGLostSizzlerHorde,phase=String(runState?.state||"");
    state.lastPhase=phase;
    if(expected&&runState&&H&&typeof H.tick==="function"&&["briefing","intermission"].includes(phase)){
      const before=phase;
      try{H.tick(runState,Date.now())}catch(error){console.warn("[Lost Sizzler r55] Horde phase recovery failed",error)}
      if(String(runState.state||"")!==before){state.phaseRepairs++;state.lastPhase=String(runState.state||"")}
    }
    updateBanner();return true
  }

  function tick(){repairHordeAuthority()}

  injectStyle();tick();
  state.timer=setInterval(()=>{try{tick()}catch(error){console.warn("[Lost Sizzler r55] final cleanup tick failed",error)}},50);
  addEventListener("pagehide",()=>{if(state.timer)clearInterval(state.timer)},{once:true});
  document.body.dataset.v141R55FinalPlaytestCleanup="true";
  window.CCGLostSizzlerV141R55FinalPlaytestCleanup={injectStyle,sealButtonLayout,markMenu,expectedAuthority,repairHordeAuthority,updateBanner,get state(){return state}};
})();

/* R56 late playtest completion owner. */
(()=>{
  if(document.querySelector('script[data-ccg-v141-r56-playtest-completion]'))return;
  const script=document.createElement('script');
  const rev=document.querySelector('meta[name="ccg-release"]')?.content||document.documentElement?.dataset?.releaseRev||Date.now();
  script.src=`js/v10-41-r56-playtest-completion.js?v=${encodeURIComponent(rev)}`;
  script.async=false;
  script.dataset.ccgV141R56PlaytestCompletion='true';
  document.head.appendChild(script);
})();
