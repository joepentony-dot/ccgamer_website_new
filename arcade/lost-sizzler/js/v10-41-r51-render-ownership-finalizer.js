/* The Lost Sizzler V10.41 r51 — renderer ownership finalizer.
 *
 * Late presentation modules may legitimately replace drawPlayer/drawEnemy after
 * the initial R51 gameplay install. Reassert R51 only when its wrapper is no
 * longer the active renderer, preserving the current late renderer underneath.
 * R48 character animation and the r31 CPU Cook enemy identity renderer are
 * deliberately retained as part of the composite renderers so their own
 * maintenance timers do not wrap R51 again.
 */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V141_R51_RENDER_OWNERSHIP_FINALIZER__)return;
  window.__CCG_LOST_SIZZLER_V141_R51_RENDER_OWNERSHIP_FINALIZER__=true;

  const CHECK_MS=400,MAX_CHAIN=12;
  const state={timer:0,repairs:0,playerRepairs:0,enemyRepairs:0,playerCompatibilitySeals:0,enemyCompatibilitySeals:0};
  const active=()=>document.body?.dataset?.runActive==="true";

  function chainHas(fn,marker){
    let current=fn;
    for(let depth=0;depth<MAX_CHAIN&&typeof current==="function";depth++){
      if(current?.[marker])return true;
      const next=current?.__ccgOriginal;if(typeof next!=="function"||next===current)break;current=next
    }
    return false
  }

  function sealPlayerCompatibility(){
    const current=window.drawPlayer;
    if(typeof current!=="function"||!current.__ccgV141R51VisualPolish||current.__ccgV141R48CharacterAnimation)return false;
    if(!chainHas(current.__ccgOriginal,"__ccgV141R48CharacterAnimation"))return false;
    current.__ccgV141R48CharacterAnimation=true;state.playerCompatibilitySeals++;return true
  }

  function sealEnemyCompatibility(){
    const current=window.drawEnemy;
    if(typeof current!=="function"||!current.__ccgV141R51VisualPolish||current.__ccgV141R31CpuCookRenderFix)return false;
    if(!chainHas(current.__ccgOriginal,"__ccgV141R31CpuCookRenderFix"))return false;
    current.__ccgV141R31CpuCookRenderFix=true;state.enemyCompatibilitySeals++;return true
  }

  function sealCompatibility(){
    let changed=false;
    if(sealPlayerCompatibility())changed=true;
    if(sealEnemyCompatibility())changed=true;
    return changed
  }

  function repair(){
    if(!active())return false;
    const api=window.CCGLostSizzlerV141R51VisualUIOverhaul;if(!api?.installGameplayVisuals)return false;
    let changed=sealCompatibility();
    const playerMissing=typeof window.drawPlayer==="function"&&!window.drawPlayer.__ccgV141R51VisualPolish;
    const enemyMissing=typeof window.drawEnemy==="function"&&!window.drawEnemy.__ccgV141R51VisualPolish;
    if(!playerMissing&&!enemyMissing)return changed;

    // The R51 installer remembers the source it wrapped. If that exact source
    // later becomes active again, clear only that diagnostic pointer so the
    // installer treats the current renderer as needing a fresh presentation
    // wrapper. No gameplay renderer is removed or bypassed.
    if(playerMissing){api.state.playerSource=null;state.playerRepairs++}
    if(enemyMissing){api.state.enemySource=null;state.enemyRepairs++}
    const repaired=Boolean(api.installGameplayVisuals());
    if(repaired){state.repairs++;changed=true}
    if(sealCompatibility())changed=true;
    return changed
  }

  function start(){
    if(state.timer)return;
    repair();state.timer=setInterval(repair,CHECK_MS);
    document.body.dataset.v141R51RenderOwner="true"
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});else start();
  addEventListener("pagehide",()=>{if(state.timer)clearInterval(state.timer);state.timer=0},{once:true});
  window.CCGLostSizzlerV141R51RenderOwnershipFinalizer={repair,chainHas,sealPlayerCompatibility,sealEnemyCompatibility,sealCompatibility,get state(){return state}};
})();