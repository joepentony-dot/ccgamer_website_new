/* C64 Dungeon Carnage V10.42 r20 — live regression consolidation. */
(()=>{
  "use strict";
  if(window.CCGLostSizzlerV142R20LiveRegressionStability)return;

  const diagnostics={
    attackIntents:0,
    queuedAttackRepairs:0,
    directAttackRepairs:0,
    directAttackFallbacks:0,
    capturedR1Shots:0,
    directAttackErrors:0,
    staleStunRepairs:0,
    controlLockRepairs:0,
    staleModeRecoveries:0,
    dossierKeyboardCloses:0,
    cursorHides:0,
    scoreDeltas:0,
    doorLagFreezes:0,
    frameStalls:0,
    stallClampInstalls:0,
    duplicateFramesDropped:0,
    presentationRepairs:0,
    mobileFireFallbacks:0,
    mobileFireReleases:0
  };
  const ATTACK_KEYS=new Set(["Space","KeyF","Numpad0"]);
  const STALL_MS=120;
  const CURSOR_IDLE_MS=1600;
  let cursorTimer=0,lastDoorTick=performance.now(),capturedR1FireOwner=null;

  const panelVisible=id=>{const node=document.getElementById(id);return Boolean(node&&!node.classList.contains("hidden"))};
  const currentMode=()=>{try{return typeof mode!=="undefined"?String(mode):""}catch(_){return""}};
  const liveSession=()=>{
    try{
      const live=Boolean(run&&host&&p1),state=currentMode();
      return live&&!["menu","end"].includes(state)
    }catch(_){return false}
  };
  function activeRun(){
    if(document.body?.dataset?.runActive==="true")return true;
    if(!liveSession())return false;
    try{
      document.body.dataset.runActive="true";
      diagnostics.presentationRepairs++;
      if(typeof focusGameplayKeyboard==="function")focusGameplayKeyboard()
    }catch(_){}
    return true
  }
  const editableTarget=target=>Boolean(target instanceof Element&&(target.matches("input,textarea,select,[contenteditable='true'],[contenteditable='']")||target.closest("input,textarea,select,[contenteditable='true'],[contenteditable='']")));
  const finePointer=()=>window.matchMedia?.("(pointer: fine)")?.matches!==false;
  const spyActive=()=>{try{return String(window.CCGLostSizzlerSpecialModes?.active?.type||document.body?.dataset?.specialMode||"")==="sizzler-saboteurs"}catch(_){return false}};

  function focusGame(){
    try{if(typeof focusGameplayKeyboard==="function")focusGameplayKeyboard();else document.getElementById("game")?.focus?.({preventScroll:true})}catch(_){}
  }

  function recoverOrphanedGameplayMode(){
    if(!activeRun())return false;
    const stale=(currentMode()==="dossier"&&!panelVisible("named-dossier-panel"))||(currentMode()==="inventory"&&!panelVisible("inventory-panel"))||(currentMode()==="shop"&&!panelVisible("shop-panel"));
    if(stale){try{mode="playing";diagnostics.staleModeRecoveries++}catch(_){} }
    return currentMode()==="playing";
  }

  function captureR1FireOwner(){
    try{
      let owner=typeof firePlayer==="function"?firePlayer:null;
      const seen=new Set();
      while(typeof owner==="function"&&!seen.has(owner)){
        if(owner.__ccgV142R1===true){capturedR1FireOwner=owner;return owner}
        seen.add(owner);owner=typeof owner.__ccgOriginal==="function"?owner.__ccgOriginal:null;
      }
    }catch(_){}
    return capturedR1FireOwner
  }

  function repairAttackBoundary(){
    try{window.CCGLostSizzlerV142R18SoloPlaytestStability?.repairAttackLiveness?.("r20-input")}catch(_){}
    try{window.CCGLostSizzlerV142R1Stability?.repairCombatTimers?.()}catch(_){}
    try{window.CCGLostSizzlerV142R1Stability?.repairProjectilePool?.()}catch(_){}
    try{
      if(!Number.isFinite(Number(fire1))||Number(fire1)<0||Number(fire1)>5000)fire1=0;
      if(!Number.isFinite(Number(fireBuffer1))||Number(fireBuffer1)<0||Number(fireBuffer1)>2500)fireBuffer1=0;
      if(!Number.isFinite(Number(projectileCD))||Number(projectileCD)<0||Number(projectileCD)>1000)projectileCD=0;
      const player=p1||null;
      if(player){
        if(player.controlLocked){player.controlLocked=false;diagnostics.controlLockRepairs++}
        if(player.controlsLocked){player.controlsLocked=false;diagnostics.controlLockRepairs++}
        const stun=Number(player.hitStunMs||0),lastHurt=Number(player.__ccgLastHurtAt||0),expected=Math.max(1,Number(window.CCG_CONFIG?.player?.hitStunMs||180)),staleAfter=Math.max(540,expected*3);
        if(stun>0&&(!Number.isFinite(lastHurt)||lastHurt<=0||performance.now()-lastHurt>staleAfter)){player.hitStunMs=0;diagnostics.staleStunRepairs++}
      }
    }catch(_){}
  }

  function deepestFireOwner(){
    try{
      let owner=typeof firePlayer==="function"?firePlayer:null;
      const seen=new Set();
      while(typeof owner==="function"&&typeof owner.__ccgOriginal==="function"&&!seen.has(owner)){
        seen.add(owner);owner=owner.__ccgOriginal;
      }
      return typeof owner==="function"?owner:null;
    }catch(_){return null}
  }

  function shotCompleted(player,beforeMana,beforeBullets){
    const mana=Math.max(0,Number(player?.mana)||0);
    let bullets=beforeBullets;
    try{bullets=(host?.projectiles||[]).filter(projectile=>projectile?.active!==false).length}catch(_){}
    return mana<beforeMana||bullets>beforeBullets
  }

  function attackNow(code){
    if(!activeRun()||!recoverOrphanedGameplayMode())return false;
    let player=null;try{player=p1}catch(_){}
    if(!player)return false;
    repairAttackBoundary();
    try{input?.add?.(code)}catch(_){}
    const beforeMana=Math.max(0,Number(player.mana)||0);
    let beforeBullets=0;try{beforeBullets=(host?.projectiles||[]).filter(projectile=>projectile?.active!==false).length}catch(_){}
    const direction=typeof attackDirection==="function"?attackDirection(player):player.dir;
    let fired=false;

    const r1Owner=captureR1FireOwner();
    if(typeof r1Owner==="function"){
      try{
        repairAttackBoundary();
        r1Owner(player,direction);
        fired=shotCompleted(player,beforeMana,beforeBullets);
        if(fired)diagnostics.capturedR1Shots++;
      }catch(_){diagnostics.directAttackErrors++}
    }

    if(!fired){
      try{
        if(typeof firePlayer==="function"&&firePlayer!==r1Owner){
          repairAttackBoundary();
          firePlayer(player,direction);
          fired=shotCompleted(player,beforeMana,beforeBullets);
        }
      }catch(_){diagnostics.directAttackErrors++}
    }

    if(!fired){
      const fallback=deepestFireOwner();
      if(fallback&&fallback!==firePlayer&&fallback!==r1Owner){
        try{
          repairAttackBoundary();
          fallback(player,direction);
          fired=shotCompleted(player,beforeMana,beforeBullets);
          if(fired)diagnostics.directAttackFallbacks++;
        }catch(_){diagnostics.directAttackErrors++}
      }
    }

    if(fired){
      try{fireBuffer1=0;input?.delete?.(code)}catch(_){}
      diagnostics.directAttackRepairs++;
    }else{
      let queued=false;
      try{if(typeof queueAttack==="function")queued=queueAttack(player)!==false}catch(_){}
      if(queued)diagnostics.queuedAttackRepairs++;
    }
    diagnostics.attackIntents++;
    return fired||Boolean(fireBuffer1>0)
  }

  try{
    if(typeof hideNamedDossier==="function"&&!hideNamedDossier.__ccgV142R20){
      const baseHideDossier=hideNamedDossier;
      hideNamedDossier=function(...args){
        const result=baseHideDossier(...args);
        try{if(activeRun()&&!panelVisible("named-dossier-panel")&&currentMode()==="dossier")mode="playing"}catch(_){}
        try{input?.delete?.("Space");fireBuffer1=0}catch(_){}
        focusGame();scheduleCursorHide();
        return result;
      };
      hideNamedDossier.__ccgV142R20=true;hideNamedDossier.__ccgOriginal=baseHideDossier;
    }
  }catch(_){}

  document.addEventListener("keydown",event=>{
    if(editableTarget(event.target))return;
    if(event.code==="Space"&&panelVisible("named-dossier-panel")){
      event.preventDefault();event.stopImmediatePropagation();
      try{hideNamedDossier()}catch(_){document.getElementById("named-dossier-panel")?.classList.add("hidden")}
      diagnostics.dossierKeyboardCloses++;
      return;
    }
    if(!ATTACK_KEYS.has(event.code)||!activeRun())return;
    if(spyActive())return;
    if(!recoverOrphanedGameplayMode())return;
    event.preventDefault();
    attackNow(event.code);
    event.stopImmediatePropagation();
  },true);
  document.addEventListener("keyup",event=>{if(ATTACK_KEYS.has(event.code))try{input?.delete?.(event.code)}catch(_){}},true);

  const mobileFirePointers=new Set();
  document.addEventListener("pointerdown",event=>{
    const button=event.target instanceof Element?event.target.closest('#v104-touch-controls [data-action="fire"]'):null;
    if(!button||spyActive())return;
    mobileFirePointers.add(event.pointerId);
    const before=diagnostics.attackIntents;
    queueMicrotask(()=>{
      if(diagnostics.attackIntents!==before)return;
      if(!activeRun()||!recoverOrphanedGameplayMode())return;
      const handled=attackNow("Space");
      if(handled){
        diagnostics.mobileFireFallbacks++;
        try{input?.add?.("Space");button.classList.add("held")}catch(_){}
      }
    });
  },true);
  const releaseMobileFire=event=>{
    if(!mobileFirePointers.has(event.pointerId))return;
    mobileFirePointers.delete(event.pointerId);
    try{input?.delete?.("Space")}catch(_){}
    try{document.querySelector('#v104-touch-controls [data-action="fire"]')?.classList.remove("held")}catch(_){}
    diagnostics.mobileFireReleases++;
  };
  document.addEventListener("pointerup",releaseMobileFire,true);
  document.addEventListener("pointercancel",releaseMobileFire,true);

  function interactiveOverlayVisible(){
    return ["menu","pause","inventory-panel","named-dossier-panel","shop-panel","save-panel","level-up","floor-complete","end","artefact-choice-panel","item-info-panel"].some(panelVisible);
  }
  function ensureCursorStyle(){
    if(document.getElementById("ccg-r20-cursor-style"))return;
    const style=document.createElement("style");style.id="ccg-r20-cursor-style";style.textContent="body.ccg-game-cursor-idle,body.ccg-game-cursor-idle *{cursor:none!important}";document.head.appendChild(style);
  }
  function showCursor(){document.body?.classList.remove("ccg-game-cursor-idle");if(cursorTimer){clearTimeout(cursorTimer);cursorTimer=0}}
  function hideCursorIfIdle(){
    cursorTimer=0;
    if(!activeRun()||!finePointer()||interactiveOverlayVisible())return;
    document.body?.classList.add("ccg-game-cursor-idle");diagnostics.cursorHides++;
  }
  function scheduleCursorHide(){
    showCursor();
    if(!activeRun()||!finePointer()||interactiveOverlayVisible())return;
    cursorTimer=setTimeout(hideCursorIfIdle,CURSOR_IDLE_MS);
  }
  ensureCursorStyle();
  addEventListener("pointermove",scheduleCursorHide,{passive:true});
  addEventListener("pointerdown",scheduleCursorHide,{passive:true});
  addEventListener("keydown",()=>{if(activeRun()&&!interactiveOverlayVisible())scheduleCursorHide()},{passive:true});
  document.addEventListener("visibilitychange",()=>{showCursor();lastDoorTick=performance.now()});

  function ensureScoreFeedback(){
    let rail=document.getElementById("shop-score-delta-rail");if(rail)return rail;
    const scoreNode=document.getElementById("shop-score");if(!scoreNode)return null;
    rail=document.createElement("span");rail.id="shop-score-delta-rail";rail.setAttribute("aria-live","polite");rail.style.cssText="display:inline-flex;flex-wrap:wrap;gap:5px;margin-left:8px;vertical-align:middle";scoreNode.insertAdjacentElement("afterend",rail);return rail;
  }
  function showScoreDelta(amount){
    const value=Math.max(0,Math.round(Number(amount)||0));if(!value)return;
    const rail=ensureScoreFeedback();if(!rail)return;
    const chip=document.createElement("b");chip.className="shop-score-delta";chip.textContent=`−${value.toLocaleString()} SCORE`;chip.style.cssText="display:inline-block;padding:3px 6px;border:1px solid rgba(255,104,104,.65);border-radius:3px;color:#ff8b8b;background:rgba(48,8,16,.78);font:900 10px/1.2 'Courier New',monospace;letter-spacing:.25px";rail.appendChild(chip);diagnostics.scoreDeltas++;
    while(rail.children.length>6)rail.firstElementChild?.remove();
    setTimeout(()=>chip.remove(),4200);
  }
  try{
    if(typeof buyShopItem==="function"&&!buyShopItem.__ccgV142R20){
      const baseBuy=buyShopItem;
      buyShopItem=function(...args){
        let before=0;try{before=Math.max(0,Number(score)||0)}catch(_){}
        const result=baseBuy(...args);
        let after=before;try{after=Math.max(0,Number(score)||0)}catch(_){}
        if(result&&after<before)showScoreDelta(before-after);
        return result;
      };
      buyShopItem.__ccgV142R20=true;buyShopItem.__ccgOriginal=baseBuy;
    }
  }catch(_){}

  try{
    if(typeof updateDoors==="function"&&!updateDoors.__ccgV142R20){
      const baseUpdateDoors=updateDoors;
      updateDoors=function(...args){
        const now=performance.now(),gap=Math.max(0,now-lastDoorTick);lastDoorTick=now;
        if(gap>STALL_MS&&gap<600000){
          const freeze=Math.max(0,gap-16);
          try{for(const door of host?.doors||[])if(door?.opening){door.openingStart=Number(door.openingStart||now)+freeze;door.openAt=Number(door.openAt||now)+freeze;diagnostics.doorLagFreezes++}}catch(_){}
        }
        return baseUpdateDoors(...args);
      };
      updateDoors.__ccgV142R20=true;updateDoors.__ccgOriginal=baseUpdateDoors;
    }
  }catch(_){}

  function installAuthoritativeLoopStallClamp(){
    const current=window.loop;
    if(typeof current!=="function")return false;
    if(current.__ccgV142R20LoopStallClamp===true)return true;
    const wrapped=function loopV142R20StallClamp(timestamp){
      const ownsNormalFrame=activeRun()&&currentMode()==="playing"&&!spyActive();
      const t=Number(timestamp);
      let maxAdvance=45,beforeElapsed=NaN,beforeFloorElapsed=NaN;
      if(ownsNormalFrame&&Number.isFinite(t)){
        try{
          const previous=typeof last!=="undefined"?Number(last):NaN;
          const gap=Number.isFinite(previous)?Math.max(0,t-previous):16;
          maxAdvance=Math.min(45,Math.max(0,gap||16));
          if(gap>STALL_MS&&gap<600000){last=t-16;maxAdvance=16;diagnostics.frameStalls++}
          beforeElapsed=Number(run?.elapsed);
          beforeFloorElapsed=Number(host?.floorElapsed);
        }catch(_){}
      }
      const result=current.call(this,timestamp);
      if(ownsNormalFrame){
        try{
          if(Number.isFinite(beforeElapsed)&&Number.isFinite(Number(run?.elapsed))&&Number(run.elapsed)-beforeElapsed>maxAdvance)run.elapsed=beforeElapsed+maxAdvance;
          if(Number.isFinite(beforeFloorElapsed)&&Number.isFinite(Number(host?.floorElapsed))&&Number(host.floorElapsed)-beforeFloorElapsed>maxAdvance)host.floorElapsed=beforeFloorElapsed+maxAdvance;
        }catch(_){}
      }
      return result;
    };
    try{for(const key of Object.keys(current))wrapped[key]=current[key]}catch(_){}
    wrapped.__ccgV141R29Stable=true;
    wrapped.__ccgV142R20LoopStallClamp=true;
    wrapped.__ccgOriginal=current;
    window.loop=wrapped;
    diagnostics.stallClampInstalls++;
    return window.loop===wrapped;
  }

  /* R2 intentionally seals global update ownership behind a non-configurable
     accessor. Keep its mutable boundary clamp for direct external update calls,
     and extend the already-established r29 RAF owner for real browser stalls.
     This adds no second RAF chain and explicitly leaves Spy timing untouched. */
  function installStallClamp(){
    let installed=installAuthoritativeLoopStallClamp();
    const runtime=window.CCGLostSizzlerModeRuntime,boundary=runtime?.state?.sharedFrameBoundary;
    if(typeof boundary!=="function")return installed;
    if(boundary.__ccgV142R20StallClamp===true)return true;
    const stallSafeBoundary=function updateV142R20StallClamp(dt,...args){
      let safeDt=Number(dt);
      if(activeRun()&&currentMode()==="playing"&&!spyActive()&&Number.isFinite(safeDt)&&safeDt>STALL_MS&&safeDt<600000){
        safeDt=16;
        diagnostics.frameStalls++;
      }
      return boundary.call(this,safeDt,...args);
    };
    try{for(const key of Object.keys(boundary))stallSafeBoundary[key]=boundary[key]}catch(_){}
    stallSafeBoundary.__ccgV141ModeFrameBoundary=true;
    stallSafeBoundary.__ccgV142R20StallClamp=true;
    stallSafeBoundary.__ccgOriginal=boundary;
    runtime.state.sharedFrameBoundary=stallSafeBoundary;
    diagnostics.stallClampInstalls++;
    installed=runtime.state.sharedFrameBoundary===stallSafeBoundary||installed;
    return installed;
  }
  installStallClamp();

  /* r20 remains an extension of the established frame owner. It never starts
     a second RAF chain; it only clamps the timestamp gap before r29 advances
     the existing simulation loop. */
  addEventListener("ccg:v142-ready",()=>{captureR1FireOwner();installStallClamp()},{once:true});
  addEventListener("pagehide",()=>{showCursor();mobileFirePointers.clear();try{input?.delete?.("Space")}catch(_){}if(cursorTimer)clearTimeout(cursorTimer)},{once:true});

  window.CCGLostSizzlerV142R20LiveRegressionStability=Object.freeze({
    version:"V10.42-r20",
    diagnostics,
    attackNow,
    activeRun,
    liveSession,
    recoverOrphanedGameplayMode,
    showScoreDelta,
    captureR1FireOwner,
    installStallClamp
  });
})();