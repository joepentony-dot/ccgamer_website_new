/* C64 Dungeon Carnage V10.42 r20 — synchronous trap-cycle handoff stability. */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V142_R20_TRAP_CYCLE_HANDOFF_STABILITY__)return;
  window.__CCG_LOST_SIZZLER_V142_R20_TRAP_CYCLE_HANDOFF_STABILITY__=true;

  const state={r56Wraps:0,r57Wraps:0,rearmPasses:0};

  function rearmBeforeCycle(){
    const r19=window.CCGLostSizzlerV142R19MobileTrapLayoutStability;
    if(typeof r19?.rearmInactiveTrapContacts!=="function")return false;
    const result=r19.rearmInactiveTrapContacts();
    if(result!==false)state.rearmPasses++;
    return result
  }

  function wrapCycle(api,name,marker,stateKey){
    if(!api||typeof api[name]!=="function")return false;
    const current=api[name];
    if(current?.[marker]===true)return true;
    const wrapped=function trapCycleHandoffV142R20(){
      /* R56/R57 expose deterministic cycle APIs that can observe an inactive
         trap and its next active phase within one JavaScript turn. R19's normal
         80ms monitor cannot see that transient boundary, so synchronise its
         contact/protection latch before each explicit cycle pass. */
      rearmBeforeCycle();
      return current.apply(this,arguments)
    };
    wrapped[marker]=true;
    wrapped.__ccgOriginal=current;
    api[name]=wrapped;
    state[stateKey]++;
    return true
  }

  function install(){
    const r56=window.CCGLostSizzlerV141R56PlaytestCompletion;
    const r57=window.CCGLostSizzlerV141R57DesktopPrepStability;
    const a=wrapCycle(r56,"trapCycleTick","__ccgV142R20R56TrapCycleHandoff","r56Wraps");
    const b=wrapCycle(r57,"contactTick","__ccgV142R20R57TrapCycleHandoff","r57Wraps");
    return Boolean(a||b)
  }

  install();
  window.CCGLostSizzlerV142R20TrapCycleHandoffStability={install,rearmBeforeCycle,get state(){return state}};
})();
