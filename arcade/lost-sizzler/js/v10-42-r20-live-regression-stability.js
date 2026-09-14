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
    staleModeRecoveries:0,
    dossierKeyboardCloses:0,
    cursorHides:0,
    scoreDeltas:0,
    doorLagFreezes:0,
    frameStalls:0,
    duplicateFramesDropped:0
  };
  const ATTACK_KEYS=new Set(["Space","KeyF","Numpad0"]);
  const STALL_MS=120;
  const CURSOR_IDLE_MS=1600;
  let cursorTimer=0,lastDoorTick=performance.now(),capturedR1FireOwner=null;

  const activeRun=()=>document.body?.dataset?.runActive==="true";
  const panelVisible=id=>{const node=document.getElementById(id);return Boolean(node&&!node.classList.contains("hidden"))};
  const currentMode=()=>{try{return typeof mode!=="undefined"?String(mode):""}catch(_){return""}};
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
    if(event.code==="KeyF"&&spyActive())return;
    if(!recoverOrphanedGameplayMode())return;
    event.preventDefault();
    attackNow(event.code);
    event.stopImmediatePropagation();
  },true);
  document.addEventListener("keyup",event=>{if(ATTACK_KEYS.has(event.code))try{input?.delete?.(event.code)}catch(_){}},true);

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

  /* Keep the established mode runtime as the sole RAF owner, but prevent its
     normal dungeon update boundary from repaying a suspended browser frame as
     hundreds of milliseconds of simulation. This clamps only an oversized dt
     passed into ordinary active play; Spy Vs Spy keeps its specialist timing. */
  try{
    if(typeof update==="function"&&!update.__ccgV142R20StallClamp){
      const baseUpdate=update;
      const stallSafeUpdate=function(dt,...args){
        let safeDt=Number(dt);
        if(activeRun()&&currentMode()==="playing"&&!spyActive()&&Number.isFinite(safeDt)&&safeDt>STALL_MS&&safeDt<600000){
          safeDt=16;
          diagnostics.frameStalls++;
        }
        return baseUpdate.call(this,safeDt,...args);
      };
      try{for(const key of Object.keys(baseUpdate))stallSafeUpdate[key]=baseUpdate[key]}catch(_){}
      stallSafeUpdate.__ccgV142R20StallClamp=true;
      stallSafeUpdate.__ccgOriginal=baseUpdate;
      update=stallSafeUpdate;
    }
  }catch(_){}

  /* r20 is deliberately not a frame owner. V10.41/V10.42 mode runtime owns
     update/RAF progression; creating even a passive second RAF chain distorts
     the performance governor and risks competing with the sealed boundary. */
  addEventListener("ccg:v142-ready",()=>captureR1FireOwner(),{once:true});
  addEventListener("pagehide",()=>{showCursor();if(cursorTimer)clearTimeout(cursorTimer)},{once:true});

  window.CCGLostSizzlerV142R20LiveRegressionStability=Object.freeze({
    version:"V10.42-r20",
    diagnostics,
    attackNow,
    recoverOrphanedGameplayMode,
    showScoreDelta,
    captureR1FireOwner
  });
})();
