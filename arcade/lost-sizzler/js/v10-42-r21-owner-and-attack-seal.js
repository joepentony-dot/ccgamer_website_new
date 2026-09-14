/* C64 Dungeon Carnage V10.42 r21 — retired trap-owner compatibility marker. */
(()=>{
  "use strict";
  if(window.CCGLostSizzlerV142R21OwnerAndAttackSeal)return;

  /*
    The r19/r20 trap chain already owns mobile contact, invulnerability and
    re-arm behaviour. r21 previously added another hurtPlayer owner after that
    verified chain, which could turn one physical trap contact into multiple
    health deductions. Keep this module as a compatibility marker for cached
    ordered bootstraps, but deliberately do not wrap hurtPlayer, replace r19
    timers or create another maintenance loop.
  */
  const state=Object.freeze({
    retired:true,
    trapMonitorReplaced:false,
    duplicateOuterTrapOwnersRemoved:0,
    finalTrapOwnerInstalls:0,
    finalTrapOwnerCalls:0,
    finalTrapDamageClamps:0,
    maintenanceTicks:0
  });

  window.CCGLostSizzlerV142R21OwnerAndAttackSeal=Object.freeze({
    version:"V10.42-r21-retired",
    state
  });
})();
