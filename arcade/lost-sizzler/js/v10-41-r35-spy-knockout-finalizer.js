/* The Lost Sizzler V10.41 r35 — Spy knockout finalizer.
 *
 * Spy-only synchronous bridge between the Saboteurs combat rules and the r35
 * ghost/capture rules. A lethal weapon/trap hit must become the ten-second
 * ghost state in the same action that caused the knockout; the r35 event sweep
 * remains as a fallback for network/replayed knockout events.
 *
 * This finalizer also keeps the existing r35 black-canvas watchdog on the
 * actual top-level Spy render chain if a later presentation owner replaces it.
 */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V141_R35_SPY_KNOCKOUT_FINALIZER__)return;
  window.__CCG_LOST_SIZZLER_V141_R35_SPY_KNOCKOUT_FINALIZER__=true;

  const MODE_ID="sizzler-saboteurs",MONITOR_MS=40;
  const state={installed:false,weaponFinalizations:0,trapFinalizations:0,renderSeals:0,renderTimer:0,lastError:""};

  const spyActive=()=>{try{return window.CCGLostSizzlerSpecialModes?.active?.type===MODE_ID||document.body?.dataset?.specialMode===MODE_ID}catch(_){return false}};
  const hardening=()=>{try{return window.CCGLostSizzlerV141R35SpyRulesHardening||null}catch(_){return null}};

  function finalizeKnockout(matchState,targetId,beforeStatus,kind){
    if(!spyActive()||beforeStatus!=="active")return false;
    const target=matchState?.players?.find?.(row=>String(row?.id||"")===String(targetId||""));
    if(!target||target.status!=="knocked-out"||Number(target.hp)>0)return false;
    const hard=hardening();if(typeof hard?.processEvents!=="function")return false;
    hard.processEvents();
    const converted=target.status==="ghost";
    if(converted){if(kind==="trap")state.trapFinalizations++;else state.weaponFinalizations++}
    return converted
  }

  function sealRenderGuard(){
    if(!spyActive())return false;
    const hard=hardening();if(typeof hard?.installRenderGuard!=="function")return false;
    let before=null;try{before=window.render}catch(_){return false}
    const already=Boolean(before?.__ccgV141R35SpyBlackGuard),retainedR28=Boolean(before?.__ccgV141R28NoHordeBanner),sealed=Boolean(hard.installRenderGuard(true));
    if(sealed&&window.render?.__ccgV141R35SpyBlackGuard){
      // Retain markers for presentation guards already underneath this Spy
      // watchdog. Their monitors can then recognise that their behaviour is
      // preserved instead of repeatedly replacing the top-level r35 owner.
      try{
        window.render.__ccgV141PostPlaytestRender=true;
        if(retainedR28)window.render.__ccgV141R28NoHordeBanner=true
      }catch(_){}
      if(!already)state.renderSeals++
    }
    return sealed
  }

  function install(){
    const base=window.CCGLostSizzlerSaboteurs,hard=hardening();
    if(!base||!hard||typeof base.useWeapon!=="function"||typeof base.triggerTrap!=="function")return false;
    if(base.__ccgV141R35KnockoutFinalizer){state.installed=true;return true}

    const baseUseWeapon=base.useWeapon,baseTriggerTrap=base.triggerTrap;

    const useWeapon=function useWeaponR35Finalized(matchState,attackerId,targetId,at){
      if(!spyActive())return baseUseWeapon.apply(this,arguments);
      try{hard.refresh?.()}catch(_){}
      const target=matchState?.players?.find?.(row=>String(row?.id||"")===String(targetId||""));
      const beforeStatus=String(target?.status||"");
      const result=baseUseWeapon.apply(this,arguments);
      if(result)try{finalizeKnockout(matchState,targetId,beforeStatus,"weapon")}catch(error){state.lastError=String(error?.message||error);console.warn("[Lost Sizzler r35] weapon knockout finalizer failed safely",error)}
      return result
    };
    useWeapon.__ccgV141R35KnockoutFinalizer=true;
    useWeapon.__ccgOriginal=baseUseWeapon;

    const triggerTrap=function triggerTrapR35Finalized(matchState,playerId,target,at){
      if(!spyActive())return baseTriggerTrap.apply(this,arguments);
      try{hard.refresh?.()}catch(_){}
      const player=matchState?.players?.find?.(row=>String(row?.id||"")===String(playerId||""));
      const beforeStatus=String(player?.status||"");
      const result=baseTriggerTrap.apply(this,arguments);
      if(result)try{finalizeKnockout(matchState,playerId,beforeStatus,"trap")}catch(error){state.lastError=String(error?.message||error);console.warn("[Lost Sizzler r35] trap knockout finalizer failed safely",error)}
      return result
    };
    triggerTrap.__ccgV141R35KnockoutFinalizer=true;
    triggerTrap.__ccgOriginal=baseTriggerTrap;

    window.CCGLostSizzlerSaboteurs=Object.freeze({...base,useWeapon,triggerTrap,__ccgV141R35KnockoutFinalizer:true});
    state.installed=true;state.lastError="";return true
  }

  function monitor(){
    if(!state.installed)install();
    if(spyActive())sealRenderGuard()
  }

  monitor();state.renderTimer=setInterval(()=>{try{monitor()}catch(error){state.lastError=String(error?.message||error);console.warn("[Lost Sizzler r35] final Spy seal failed safely",error)}},MONITOR_MS);
  addEventListener("pagehide",()=>{if(state.renderTimer)clearInterval(state.renderTimer);state.renderTimer=0},{once:true});

  window.CCGLostSizzlerV141R35SpyKnockoutFinalizer={install,finalizeKnockout,sealRenderGuard,get state(){return state}};
})();