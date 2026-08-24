/* The Lost Sizzler V10.40 — final Horde UI lock and expanded-wave completion guard. */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V140_HORDE_FINAL__)return;
  window.__CCG_LOST_SIZZLER_V140_HORDE_FINAL__=true;

  const state={installed:false,updateWrapped:false,timer:0};
  const active=()=>window.CCGLostSizzlerSpecialModes?.active||null;
  const H=()=>window.CCGLostSizzlerHorde||null;
  const isHorde=()=>active()?.type==="horde-survivor";

  function injectStyles(){
    if(document.getElementById("ccg-v140-horde-final-style"))return;
    const style=document.createElement("style");
    style.id="ccg-v140-horde-final-style";
    style.textContent=`
      /* Final-mode ownership: these ordinary dungeon controls must never
         reappear over Horde because of a later legacy stylesheet. */
      html body[data-special-mode="horde-survivor"] main.ccg-game > .mission,
      html body[data-special-mode="horde-survivor"] main.ccg-game > .critical-strip,
      html body[data-special-mode="horde-survivor"] main.ccg-game .tactical-zone .shortcut-dock,
      html body[data-special-mode="horde-survivor"] main.ccg-game .player-hub .hub-inventory,
      html body[data-special-mode="horde-survivor"] main.ccg-game .player-hub .hub-progress,
      html body[data-special-mode="horde-survivor"] main.ccg-game #inventory-panel,
      html body[data-special-mode="horde-survivor"] main.ccg-game .player-hub .armour-stat,
      html body[data-special-mode="horde-survivor"] main.ccg-game .player-hub .ammo-stat{
        display:none!important;
      }
      html body[data-special-mode="horde-survivor"] main.ccg-game > .tactical-zone{
        grid-template-rows:minmax(0,1fr)!important;
      }
      html body[data-special-mode="horde-survivor"] main.ccg-game > .tactical-zone > .radar-card{
        display:flex!important;
        grid-row:1!important;
        height:100%!important;
      }
      html body[data-special-mode="horde-survivor"] main.ccg-game > .player-hub{
        grid-template-columns:minmax(0,1fr)!important;
      }
      html body[data-special-mode="horde-survivor"] main.ccg-game > .player-hub .core-stats{
        grid-template-columns:repeat(2,minmax(0,1fr))!important;
      }
      html body[data-special-mode="horde-survivor"] main.ccg-game .player-hub .health-stat,
      html body[data-special-mode="horde-survivor"] main.ccg-game .player-hub .weapon-stat{
        display:flex!important;
      }
    `;
    document.head.appendChild(style);
  }

  function reserveId(wave){return`v138-wave-${wave}-reserve`}
  function ensureExpandedWaveReserve(){
    const live=active(),runState=live?.state,horde=H(),liveApi=window.CCGLostSizzlerV138;
    if(!live?.authoritative||live.type!=="horde-survivor"||!runState||!horde||!liveApi||!["wave","siege"].includes(runState.state))return false;
    const wave=Math.max(1,Math.min(10,Number(runState.wave)||1)),count=Math.max(1,Math.min(4,Number(runState.playerCount)||1));
    const baseQuota=horde.quotaFor(wave,count),target=liveApi.desiredQuota(wave,count),id=reserveId(wave);
    if(target<=baseQuota||Number(runState.spawned||0)>=target)return false;
    runState.activeEnemies=Array.isArray(runState.activeEnemies)?runState.activeEnemies:[];
    if(runState.activeEnemies.some(model=>model?.id===id))return false;
    runState.activeEnemies.push({id,kind:"reserve",name:"Reinforcement reserve",hp:1,maxHp:1,alive:true,_v138Reserve:true,_v140PreTickReserve:true});
    return true;
  }

  function wrapUpdate(){
    if(state.updateWrapped||typeof window.update!=="function")return state.updateWrapped;
    const original=window.update;
    window.update=function updateV140HordeGuard(){
      try{if(isHorde())ensureExpandedWaveReserve()}catch(error){console.warn("[Lost Sizzler V10.40] Horde reserve guard failed",error)}
      return original.apply(this,arguments)
    };
    state.updateWrapped=true;
    return true;
  }

  function install(){
    injectStyles();
    if(state.installed)return true;
    const gate=window.CCGLostSizzlerReleaseGate;
    if(gate&&!gate.state?.ready)return false;
    if(!window.CCGLostSizzlerV139?.state?.installed||!window.CCGLostSizzlerV138||!H())return false;
    if(!wrapUpdate())return false;
    state.installed=true;
    document.body.dataset.v140HordeFinal="true";
    return true;
  }

  injectStyles();
  state.timer=setInterval(()=>{if(install()){clearInterval(state.timer);state.timer=0}},90);
  install();
  window.addEventListener("pagehide",()=>{if(state.timer)clearInterval(state.timer)},{once:true});

  window.CCGLostSizzlerV140={injectStyles,ensureExpandedWaveReserve,get state(){return state}};
})();
