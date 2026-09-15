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

  function loadProgressionFoundation(){
    if(window.CCGDungeonProgressionFoundation||document.querySelector('script[data-ccg-dungeon-progression-foundation="true"]'))return;
    const cache=String(document.querySelector('meta[name="ccg-lost-sizzler-cache"]')?.content||"20260915-progression").trim();
    const script=document.createElement("script");
    script.async=false;
    script.src=`js/dungeon-progression-foundation.js?v=${encodeURIComponent(cache)}`;
    script.dataset.ccgDungeonProgressionFoundation="true";
    script.onerror=()=>console.error("[C64 Dungeon Carnage] progression foundation failed to load");
    document.head.appendChild(script);
  }

  loadProgressionFoundation();

  window.CCGLostSizzlerV142R21OwnerAndAttackSeal=Object.freeze({
    version:"V10.42-r21-retired",
    state
  });
})();
