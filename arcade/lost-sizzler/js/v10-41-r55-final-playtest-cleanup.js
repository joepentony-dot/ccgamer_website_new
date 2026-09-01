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
    if(document.getElementById(STYLE_ID))return true;
    const style=document.createElement("style");style.id=STYLE_ID;style.textContent=`
      body[data-run-active="false"] #menu .game-mode-buttons button{
        box-sizing:border-box!important;position:relative!important;display:flex!important;align-items:center!important;justify-content:flex-start!important;
        min-height:74px!important;padding:28px 12px 24px!important;overflow:hidden!important;white-space:normal!important;text-overflow:clip!important;
        text-align:left!important;line-height:1.15!important;color:#f5eefb!important;text-shadow:none!important;transform:none!important;filter:none!important;-webkit-filter:none!important
      }
      body[data-run-active="false"] #menu .game-mode-buttons #solo-btn,
      body[data-run-active="false"] #menu .game-mode-buttons #create-btn{min-height:82px!important;font-size:10.5px!important}
      body[data-run-active="false"] #menu .game-mode-buttons #continue-save-btn{min-height:78px!important;font-size:10px!important}
      body[data-run-active="false"] #menu .game-mode-buttons #horde-solo-btn,
      body[data-run-active="false"] #menu .game-mode-buttons #horde-mode-btn,
      body[data-run-active="false"] #menu .game-mode-buttons #saboteurs-mode-btn,
      body[data-run-active="false"] #menu .game-mode-buttons #split-btn{min-height:74px!important;font-size:9.5px!important}
      body[data-run-active="false"] #menu .game-mode-buttons #tutorial-zone-btn,
      body[data-run-active="false"] #menu .game-mode-buttons #daily-btn{min-height:70px!important;font-size:9px!important}
      body[data-run-active="false"] #menu .game-mode-buttons button::before{
        position:absolute!important;left:12px!important;right:12px!important;top:9px!important;bottom:auto!important;display:block!important;margin:0!important;
        font-size:7.5px!important;font-weight:700!important;line-height:1!important;letter-spacing:.8px!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important;text-shadow:none!important;transform:none!important;filter:none!important
      }
      body[data-run-active="false"] #menu .game-mode-buttons button::after{
        position:absolute!important;left:12px!important;right:12px!important;top:auto!important;bottom:8px!important;display:block!important;margin:0!important;
        max-height:2.3em!important;font-size:7px!important;font-weight:400!important;line-height:1.15!important;letter-spacing:.35px!important;white-space:normal!important;overflow:hidden!important;text-overflow:clip!important;text-shadow:none!important;transform:none!important;filter:none!important
      }
      body[data-run-active="false"] #menu .game-mode-buttons button.primary{color:#160b1e!important}
      @media(max-width:760px){
        body[data-run-active="false"] #menu .game-mode-buttons button,
        body[data-run-active="false"] #menu .game-mode-buttons #solo-btn,
        body[data-run-active="false"] #menu .game-mode-buttons #create-btn,
        body[data-run-active="false"] #menu .game-mode-buttons #continue-save-btn,
        body[data-run-active="false"] #menu .game-mode-buttons #horde-solo-btn,
        body[data-run-active="false"] #menu .game-mode-buttons #horde-mode-btn,
        body[data-run-active="false"] #menu .game-mode-buttons #saboteurs-mode-btn,
        body[data-run-active="false"] #menu .game-mode-buttons #split-btn,
        body[data-run-active="false"] #menu .game-mode-buttons #tutorial-zone-btn,
        body[data-run-active="false"] #menu .game-mode-buttons #daily-btn{min-height:78px!important;padding-top:29px!important;padding-bottom:25px!important}
      }
    `;document.head.appendChild(style);return true
  }

  function sealButtonLayout(button){
    if(!button)return false;
    const id=String(button.id||"");
    let height="74px",font="9.5px";
    if(id==="solo-btn"||id==="create-btn"){height="82px";font="10.5px"}
    else if(id==="continue-save-btn"){height="78px";font="10px"}
    else if(id==="tutorial-zone-btn"||id==="daily-btn"){height="70px";font="9px"}
    const mobile=matchMedia?.("(max-width:760px)")?.matches===true;
    if(mobile)height="78px";
    const values={
      "box-sizing":"border-box","position":"relative","display":"flex","align-items":"center","justify-content":"flex-start",
      "min-height":height,"padding":mobile?"29px 12px 25px":"28px 12px 24px","overflow":"hidden","white-space":"normal","text-overflow":"clip",
      "text-align":"left","line-height":"1.15","font-size":font,"text-shadow":"none","transform":"none","filter":"none","-webkit-filter":"none"
    };
    let repaired=false;
    for(const [prop,value] of Object.entries(values)){
      if(button.style.getPropertyValue(prop)!==value||button.style.getPropertyPriority(prop)!=="important"){button.style.setProperty(prop,value,"important");repaired=true}
    }
    if(repaired)state.menuRepairs++;
    return true
  }

  function markMenu(){
    const grid=document.querySelector("#menu .game-mode-buttons");if(!grid)return false;
    for(const button of grid.querySelectorAll("button"))sealButtonLayout(button);
    grid.dataset.r55TextLayout="true";state.menuPasses++;return true
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

  function tick(){injectStyle();markMenu();repairHordeAuthority()}

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
