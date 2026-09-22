/* C64 Dungeon Carnage V10.42 r47 — Inventory -> FIRE recovery boundary.
 * Does not replace firePlayer/queueAttack. It verifies the established attack
 * owners after Inventory closes and invokes the existing r20 attackNow fallback
 * only when a valid attack intent produced no activity.
 */
(()=>{
  "use strict";
  if(window.CCGLostSizzlerV142R47InventoryFireRecovery)return;

  const ATTACK_KEYS=new Set(["Space","KeyF","Numpad0"]);
  const state={installed:false,inventoryClosures:0,boundaryRepairs:0,verifiedAttacks:0,fallbackAttacks:0,failedFallbacks:0,armed:false,lastCloseAt:0,lastFallbackAt:0};
  const activeRun=()=>document.body?.dataset?.runActive==="true";
  const currentMode=()=>{try{return String(mode||"")}catch(_){return""}};
  const spyActive=()=>{try{return String(window.CCGLostSizzlerSpecialModes?.active?.type||document.body?.dataset?.specialMode||"")==="sizzler-saboteurs"}catch(_){return false}};
  const inventory=()=>document.getElementById("inventory-panel");
  const inventoryVisible=()=>{const node=inventory();return Boolean(node&&!node.classList.contains("hidden")&&getComputedStyle(node).display!=="none")};
  const player=()=>{try{return p1||null}catch(_){return null}};
  const bulletCount=p=>{try{return bullets.filter(b=>b&&b.ttl>0&&b.owner===p?.id).length}catch(_){return 0}};
  const maxProjectiles=p=>{try{return Number(C?.player?.maxProjectiles||0)+Math.max(0,Number(p?.weapon?.shots||1)-1)}catch(_){return 1}};
  const validAttack=p=>{
    if(!p||!activeRun()||currentMode()!=="playing"||spyActive())return false;
    if(p.firearmUnlocked===false||!p.weapon||Number(p.mana||0)<=0||Number(p.hitStunMs||0)>0)return false;
    return bulletCount(p)<Math.max(1,maxProjectiles(p));
  };

  function focusGame(){
    try{if(typeof focusGameplayKeyboard==="function")focusGameplayKeyboard();else document.getElementById("game")?.focus?.({preventScroll:true})}catch(_){}
  }
  function clearBoundaryState(){
    try{if(typeof settlePauseAttackCadence==="function")settlePauseAttackCadence("r47-inventory-close")}catch(_){}
    try{window.CCGLostSizzlerV142R18SoloPlaytestStability?.repairAttackLiveness?.("pause-resume")}catch(_){}
    try{window.CCGLostSizzlerV142R20LiveRegressionStability?.recoverOrphanedGameplayMode?.()}catch(_){}
    try{
      if(currentMode()==="inventory"&&!inventoryVisible())mode="playing";
      input?.delete?.("Space");input?.delete?.("KeyF");input?.delete?.("Numpad0");
      if(!Number.isFinite(Number(fire1))||Number(fire1)<0||Number(fire1)>5000)fire1=0;
      if(!Number.isFinite(Number(fireBuffer1))||Number(fireBuffer1)<0||Number(fireBuffer1)>2500)fireBuffer1=0;
      if(!Number.isFinite(Number(projectileCD))||Number(projectileCD)<0||Number(projectileCD)>1000)projectileCD=0;
    }catch(_){}
    focusGame();state.boundaryRepairs++;
  }
  function onInventoryClosed(reason="inventory-close"){
    if(!activeRun())return false;
    state.inventoryClosures++;state.lastCloseAt=performance.now();state.armed=true;
    clearBoundaryState();
    try{window.CCGLostSizzlerBugReporter?.events}catch(_){}
    return true;
  }

  function verifyAttack(code,before){
    setTimeout(()=>{
      const p=player();if(!p||!state.armed||!activeRun()||currentMode()!=="playing")return;
      const afterMana=Number(p.mana||0),afterBullets=bulletCount(p),afterFire=Number(typeof fire1!=="undefined"?fire1:0),afterBuffer=Number(typeof fireBuffer1!=="undefined"?fireBuffer1:0);
      const handled=afterMana<before.mana||afterBullets>before.bullets||afterFire>0||afterBuffer>0;
      if(handled){state.verifiedAttacks++;return}
      if(!validAttack(p))return;
      const r20=window.CCGLostSizzlerV142R20LiveRegressionStability;
      if(typeof r20?.attackNow!=="function"){state.failedFallbacks++;return}
      const fallbackBeforeMana=Number(p.mana||0),fallbackBeforeBullets=bulletCount(p);
      let result=false;try{result=Boolean(r20.attackNow(code))}catch(_){result=false}
      const succeeded=result||Number(p.mana||0)<fallbackBeforeMana||bulletCount(p)>fallbackBeforeBullets||Number(typeof fire1!=="undefined"?fire1:0)>0||Number(typeof fireBuffer1!=="undefined"?fireBuffer1:0)>0;
      if(succeeded){state.fallbackAttacks++;state.lastFallbackAt=performance.now()}else state.failedFallbacks++;
    },90);
  }

  let wasVisible=inventoryVisible();
  const observer=new MutationObserver(()=>{
    const visible=inventoryVisible();
    if(wasVisible&&!visible)queueMicrotask(()=>onInventoryClosed("mutation"));
    wasVisible=visible;
  });
  const node=inventory();if(node)observer.observe(node,{attributes:true,attributeFilter:["class","style","hidden"]});

  addEventListener("keydown",event=>{
    if(!state.armed||!ATTACK_KEYS.has(event.code)||event.repeat)return;
    const p=player();if(!validAttack(p))return;
    const target=event.target;
    if(target instanceof Element&&(target.matches("input,textarea,select,[contenteditable='true'],[contenteditable='']")||target.closest("input,textarea,select,[contenteditable='true'],[contenteditable='']")))return;
    verifyAttack(event.code,{mana:Number(p.mana||0),bullets:bulletCount(p),fire:Number(typeof fire1!=="undefined"?fire1:0),buffer:Number(typeof fireBuffer1!=="undefined"?fireBuffer1:0)});
  },true);

  document.addEventListener("click",event=>{
    const target=event.target instanceof Element?event.target.closest("#inventory-close,#inventory-close-top"):null;
    if(!target)return;
    setTimeout(()=>{if(!inventoryVisible())onInventoryClosed("close-button")},0);
  },true);
  addEventListener("keydown",event=>{
    if(event.code!=="Tab"&&event.code!=="Escape")return;
    const visibleBefore=inventoryVisible();
    if(!visibleBefore)return;
    setTimeout(()=>{if(!inventoryVisible())onInventoryClosed(event.code)},0);
  },true);

  addEventListener("pagehide",()=>observer.disconnect(),{once:true});
  state.installed=true;
  window.CCGLostSizzlerV142R47InventoryFireRecovery=Object.freeze({
    version:"V10.42-r47-inventory-fire-recovery",
    gameplayOwnership:false,inputOwnership:false,fireOwnership:false,
    state,onInventoryClosed,clearBoundaryState,validAttack
  });
})();
