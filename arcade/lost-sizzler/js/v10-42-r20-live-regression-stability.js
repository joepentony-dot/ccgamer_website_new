/* C64 Dungeon Carnage V10.42 r20 — live regression consolidation. */
(()=>{
  "use strict";
  if(window.CCGLostSizzlerV142R20LiveRegressionStability)return;

  const diagnostics={
    attackIntents:0,
    queuedAttackRepairs:0,
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
  let cursorTimer=0,lastFrameTimestamp=null,lastDoorTick=performance.now();

  const activeRun=()=>document.body?.dataset?.runActive==="true";
  const panelVisible=id=>{const node=document.getElementById(id);return Boolean(node&&!node.classList.contains("hidden"))};
  const currentMode=()=>{try{return typeof mode!=="undefined"?String(mode):""}catch(_){return""}};
  const editableTarget=target=>Boolean(target instanceof Element&&(target.matches("input,textarea,select,[contenteditable='true'],[contenteditable='']")||target.closest("input,textarea,select,[contenteditable='true'],[contenteditable='']")));
  const finePointer=()=>window.matchMedia?.("(pointer: fine)")?.matches!==false;
  const spyActive=()=>{try{return String(window.CCGLostSizzlerSpecialModes?.active?.type||document.body?.dataset?.specialMode||"")==="sizzler-saboteurs"}catch(_){return false}};

  function focusGame(){
    try{if(typeof focusGameplayKeyboard==="function")focusGameplayKeyboard();else{const game=document.getElementById("game");game?.focus?.({preventScroll:true})}}catch(_){}
  }

  function recoverOrphanedGameplayMode(){
    if(!activeRun())return false;
    const stale=(currentMode()==="dossier"&&!panelVisible("named-dossier-panel"))||(currentMode()==="inventory"&&!panelVisible("inventory-panel"))||(currentMode()==="shop"&&!panelVisible("shop-panel"));
    if(stale){try{mode="playing";diagnostics.staleModeRecoveries++}catch(_){} }
    return currentMode()==="playing";
  }

  function repairAttackBoundary(){
    try{window.CCGLostSizzlerV142R1Stability?.repairCombatTimers?.()}catch(_){}
    try{window.CCGLostSizzlerV142R1Stability?.repairProjectilePool?.()}catch(_){}
    try{
      if(!Number.isFinite(Number(fire1))||Number(fire1)<0||Number(fire1)>5000)fire1=0;
      if(!Number.isFinite(Number(fireBuffer1))||Number(fireBuffer1)<0||Number(fireBuffer1)>2500)fireBuffer1=0;
      if(!Number.isFinite(Number(projectileCD))||Number(projectileCD)<0||Number(projectileCD)>1000)projectileCD=0;
    }catch(_){}
  }

  function attackNow(code){
    if(!activeRun()||!recoverOrphanedGameplayMode())return false;
    let player=null;try{player=p1}catch(_){}
    if(!player)return false;
    repairAttackBoundary();
    try{input?.add?.(code)}catch(_){}
    let queued=false;
    try{if(typeof queueAttack==="function")queued=queueAttack(player)!==false}catch(_){}
    if(queued)diagnostics.queuedAttackRepairs++;
    diagnostics.attackIntents++;
    return queued;
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
    // Spy Vs Spy owns F as its fullscreen key. Do not steal that established
    // special-mode control while repairing normal Dungeon/Horde attack input.
    if(event.code==="KeyF"&&spyActive())return;
    if(!recoverOrphanedGameplayMode())return;
    event.preventDefault();
    attackNow(event.code);
    // The base KeyF owner toggles fullscreen before it reaches normal gameplay.
    // Once an ordinary run is active F is an attack key, so stop that path.
    if(event.code==="KeyF"||event.code==="Numpad0")event.stopImmediatePropagation();
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
  document.addEventListener("visibilitychange",()=>{showCursor();lastFrameTimestamp=null;lastDoorTick=performance.now()});

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

  // Door animation is wall-clock based. A browser stall longer than the open
  // animation used to let updateDoors jump straight from closed to open. Shift
  // the active animation window by the stalled time so the visual still plays.
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

  // Final single-owner RAF boundary. Long browser stalls resume with one normal
  // simulation step instead of paying down wall-clock debt; duplicate RAF
  // chains die on the shared timestamp rather than multiplying game speed.
  function stableFrame(timestamp){
    const numeric=Number(timestamp),t=Number.isFinite(numeric)?numeric:performance.now();
    if(Number.isFinite(lastFrameTimestamp)&&t<=lastFrameTimestamp){diagnostics.duplicateFramesDropped++;return}
    let gap=Number.isFinite(lastFrameTimestamp)?t-lastFrameTimestamp:16;lastFrameTimestamp=t;
    if(!Number.isFinite(gap)||gap<0)gap=16;
    const stalled=gap>STALL_MS;if(stalled)diagnostics.frameStalls++;
    const dt=stalled?16:Math.max(0,Math.min(32,gap||16));
    try{last=t}catch(_){}
    try{if(typeof update==="function")update(dt)}catch(error){console.error("[Dungeon Carnage r20] update fault contained",error)}
    try{if(typeof render==="function")render()}catch(error){console.error("[Dungeon Carnage r20] render fault contained",error)}
    try{requestAnimationFrame(loop)}catch(_){setTimeout(()=>{try{requestAnimationFrame(loop)}catch(__){}},16)}
  }
  stableFrame.__ccgV141R29Stable=true;
  stableFrame.__ccgV142R20=true;
  try{loop=stableFrame;window.loop=stableFrame}catch(_){}

  addEventListener("pagehide",()=>{showCursor();if(cursorTimer)clearTimeout(cursorTimer)},{once:true});
  window.CCGLostSizzlerV142R20LiveRegressionStability=Object.freeze({
    version:"V10.42-r20",
    diagnostics,
    attackNow,
    recoverOrphanedGameplayMode,
    showScoreDelta,
    stableFrame
  });
})();
