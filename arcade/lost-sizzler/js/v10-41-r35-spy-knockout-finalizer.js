/* The Lost Sizzler V10.41 r35 — Spy knockout finalizer.
 *
 * Spy-only synchronous bridge between the Saboteurs combat rules and the r35
 * ghost/capture rules. A lethal weapon/trap hit must become the ten-second
 * ghost state in the same action that caused the knockout; the r35 event sweep
 * remains as a fallback for network/replayed knockout events.
 *
 * This finalizer also keeps the existing r35 black-canvas watchdog on the
 * active Spy render chain if a later presentation owner replaces it. It does
 * not create a second render implementation: it asks the existing r35 owner to
 * wrap the current renderer and preserves the recognition markers of older
 * pass-through presentation guards underneath it.
 */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V141_R35_SPY_KNOCKOUT_FINALIZER__)return;
  window.__CCG_LOST_SIZZLER_V141_R35_SPY_KNOCKOUT_FINALIZER__=true;

  const MODE_ID="sizzler-saboteurs",MONITOR_MS=24;
  const state={installed:false,weaponFinalizations:0,trapFinalizations:0,renderSeals:0,renderRetries:0,renderTimer:0,lastError:""};

  const spyActive=()=>{try{return window.CCGLostSizzlerSpecialModes?.active?.type===MODE_ID||document.body?.dataset?.specialMode===MODE_ID}catch(_){return false}};
  const hardening=()=>{try{return window.CCGLostSizzlerV141R35SpyRulesHardening||null}catch(_){return null}};
  function sourceHasMarker(fn,marker){
    let current=fn;
    for(let depth=0;current&&depth<16;depth++){
      if(current?.[marker])return true;
      current=current.__ccgOriginal||current.__ccgV141ModeOwnedSource||current.__ccgV141R31Original||null
    }
    return false
  }

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

  function preserveRetainedMarkers(target,source){
    if(typeof target!=="function")return false;
    try{
      // Both older guards are pass-through outside their own Horde-specific
      // work. Carrying their markers onto the r35 top owner tells their
      // maintenance loops that their retained source chain is still present,
      // preventing needless wrapper competition during Spy play.
      target.__ccgV141PostPlaytestRender=true;
      if(sourceHasMarker(source,"__ccgV141R28NoHordeBanner"))target.__ccgV141R28NoHordeBanner=true;
      return true
    }catch(_){return false}
  }

  function sealRenderGuard(allowRetry=true){
    if(!spyActive())return false;
    const hard=hardening();if(typeof hard?.installRenderGuard!=="function")return false;
    let before=null;try{before=window.render}catch(_){return false}
    if(typeof before!=="function")return false;
    if(before.__ccgV141R35SpyBlackGuard){preserveRetainedMarkers(before,before.__ccgOriginal||before);return true}

    const sealed=Boolean(hard.installRenderGuard(true));
    let current=null;try{current=window.render}catch(_){current=null}
    if(sealed&&current?.__ccgV141R35SpyBlackGuard){
      preserveRetainedMarkers(current,before);
      state.renderSeals++;state.lastError="";return true
    }

    // A late owner can appear in the same turn that the Spy lazy stack settles.
    // Retry at the two browser scheduling boundaries instead of waiting for an
    // arbitrary long timeout. These retries are inert outside Spy.
    if(allowRetry){
      state.renderRetries++;
      queueMicrotask(()=>{if(spyActive())try{sealRenderGuard(false)}catch(error){state.lastError=String(error?.message||error)}});
      try{requestAnimationFrame(()=>{if(spyActive())try{sealRenderGuard(false)}catch(error){state.lastError=String(error?.message||error)}})}catch(_){}
    }
    return false
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

  function reassert(){if(spyActive())try{sealRenderGuard()}catch(error){state.lastError=String(error?.message||error)}}
  monitor();state.renderTimer=setInterval(()=>{try{monitor()}catch(error){state.lastError=String(error?.message||error);console.warn("[Lost Sizzler r35] final Spy seal failed safely",error)}},MONITOR_MS);
  addEventListener("focus",reassert,{passive:true});
  document.addEventListener("visibilitychange",()=>{if(!document.hidden)reassert()},{passive:true});
  addEventListener("pagehide",()=>{if(state.renderTimer)clearInterval(state.renderTimer);state.renderTimer=0;removeEventListener("focus",reassert)},{once:true});

  window.CCGLostSizzlerV141R35SpyKnockoutFinalizer={install,finalizeKnockout,sealRenderGuard,get state(){return state}};
})();