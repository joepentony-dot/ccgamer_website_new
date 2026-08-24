/* The Lost Sizzler V10.41 — harden the per-player two-strike zero-XP game-over rule. */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V141_XP_PERMADEATH__)return;
  window.__CCG_LOST_SIZZLER_V141_XP_PERMADEATH__=true;

  const state={installed:false,wraps:0};

  function playerKey(player){
    return String(player?.id||"solo");
  }

  function trackedZeroDeaths(runState,player){
    if(!runState)return 0;
    const key=playerKey(player),map=runState.xpZeroDeathsByPlayer&&typeof runState.xpZeroDeathsByPlayer==="object"?runState.xpZeroDeathsByPlayer:{};
    let count=Math.max(0,Number(map[key]||0));
    /* Older solo saves also kept the aggregate counter. Migrate it forward so
     * a saved FINAL XP WARNING can never be forgotten after a reload/update. */
    try{
      if(typeof playMode!=="undefined"&&playMode==="solo")count=Math.max(count,Math.max(0,Number(runState.xpZeroDeaths||0)));
    }catch(_){}
    return count;
  }

  function storeZeroDeaths(runState,player,count){
    if(!runState)return;
    runState.xpZeroDeathsByPlayer=runState.xpZeroDeathsByPlayer&&typeof runState.xpZeroDeathsByPlayer==="object"?runState.xpZeroDeathsByPlayer:{};
    const key=playerKey(player),safe=Math.max(0,Math.floor(Number(count)||0));
    runState.xpZeroDeathsByPlayer[key]=Math.max(Math.max(0,Number(runState.xpZeroDeathsByPlayer[key]||0)),safe);
    runState.xpZeroDeaths=Math.max(Math.max(0,Number(runState.xpZeroDeaths||0)),...Object.values(runState.xpZeroDeathsByPlayer).map(value=>Math.max(0,Number(value)||0)));
  }

  function install(){
    const progression=window.CCGProgression;
    if(!progression||typeof progression.applyDeathPenalty!=="function")return false;
    if(progression.applyDeathPenalty.__ccgV141XpPermadeath){state.installed=true;return true}

    const original=progression.applyDeathPenalty;
    const hardened=function applyDeathPenaltyV141XpPermadeath(player,score,runState=null){
      const strikesBefore=trackedZeroDeaths(runState,player);
      const result=original.apply(this,arguments)||{};
      if(!runState||!player)return result;

      const zeroAfter=Math.max(0,Number(player.totalXp||0))===0;
      if(!zeroAfter)return result;

      /* One lethal event may already have been counted by the core progression
       * function. Never double-count it; only repair a missing strike. */
      const strikesAfter=trackedZeroDeaths(runState,player);
      const strikes=Math.max(strikesAfter,strikesBefore+1);
      storeZeroDeaths(runState,player,strikes);

      result.xpZeroDeaths=strikes;
      result.zeroWarning=strikes===1;
      result.gameOver=Boolean(result.gameOver||strikes>=2);
      if(result.gameOver)result.zeroWarning=false;
      return result;
    };
    hardened.__ccgV141XpPermadeath=true;
    hardened.__ccgV141Original=original;
    progression.applyDeathPenalty=hardened;
    state.installed=true;
    state.wraps++;
    document.body.dataset.v141XpPermadeath="true";
    return true;
  }

  let attempts=0;
  const timer=setInterval(()=>{
    attempts++;
    if(install()||attempts>240)clearInterval(timer);
  },100);
  install();
  window.addEventListener("pagehide",()=>clearInterval(timer),{once:true});
  window.CCGLostSizzlerXpPermadeathV141={state,install,trackedZeroDeaths,storeZeroDeaths};
})();