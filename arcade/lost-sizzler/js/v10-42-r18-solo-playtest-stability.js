/* The Lost Sizzler V10.42 r18 — guarded solo playtest stability repairs. */
(()=>{
  "use strict";
  if(window.CCGLostSizzlerV142R18SoloPlaytestStability)return;

  const diagnostics={
    staleInvulnerabilityRepairs:0,
    staleEnemyCooldownRepairs:0,
    attackBoundaryRepairs:0,
    pauseResumeAttackRepairs:0,
    suppressedSfxRetriggers:0,
    wardenHudRepairs:0
  };
  const now=()=>performance.now();
  const MAX_PLAYER_INVULN_MS=2500;
  const MAX_ENEMY_ATTACK_COOLDOWN_MS=15000;
  const SFX_MIN_GAP=Object.freeze({
    wall:180,enemy:180,alert:220,search:260,flame:320,fireplace:650,
    trap:220,lowhealth:900,stalker:700,creak:800,pssst:500,generator:300
  });
  const lastSfxAt=new Map();

  function installInteractionXPSourceContract(){
    if(window.CCGLostSizzlerXPSourceContract)return;
    const blockedReasons=new Set(["Hidden wall opened","Bronze door unlocked","Hidden wall switch","Gate switch opened"]);
    const grantXP=awardXP;
    awardXP=function(player,amount,reason=""){
      if(blockedReasons.has(String(reason)))return{amount:0,gross:Math.max(0,Math.round(Number(amount)||0)),debtPaid:0,discarded:0,capped:false,reason,levels:[],blocked:true};
      return grantXP(player,amount,reason);
    };
    window.CCGLostSizzlerXPSourceContract=Object.freeze({
      blockedReasons:Object.freeze([...blockedReasons]),
      isBlocked:reason=>blockedReasons.has(String(reason))
    });
  }
  installInteractionXPSourceContract();

  function currentMode(){try{return typeof mode!=="undefined"?String(mode):""}catch(_){return""}}
  function activeRun(){return document.body?.dataset?.runActive==="true"}
  function localRoster(){
    try{return typeof localPlayers==="function"?(localPlayers()||[]).filter(Boolean):[typeof p1!=="undefined"?p1:null,typeof p2!=="undefined"?p2:null].filter(Boolean)}catch(_){return[]}
  }

  function repairPlayer(player){
    if(!player)return false;
    const inv=Number(player.invuln);
    if(!Number.isFinite(inv)||inv<0||(currentMode()==="playing"&&inv>MAX_PLAYER_INVULN_MS)){
      player.invuln=0;
      diagnostics.staleInvulnerabilityRepairs++;
      return true;
    }
    return false;
  }

  function repairEnemy(enemy){
    if(!enemy||enemy.alive===false)return false;
    let changed=false;
    for(const key of ["attackCooldown","chargeCooldown","chargeTelegraphMs"]){
      const value=Number(enemy[key]);
      if(!Number.isFinite(value)||value<0||value>MAX_ENEMY_ATTACK_COOLDOWN_MS){enemy[key]=0;changed=true}
    }
    if(changed)diagnostics.staleEnemyCooldownRepairs++;
    return changed;
  }

  function repairAttackLiveness(reason="runtime"){
    if(!activeRun()||currentMode()!=="playing")return false;
    let changed=false;
    try{if(fire1!==0){fire1=0;changed=true}}catch(_){}
    try{if(fire2!==0){fire2=0;changed=true}}catch(_){}
    try{if(projectileCD!==0){projectileCD=0;changed=true}}catch(_){}
    try{if(fireBuffer1!==0){fireBuffer1=0;changed=true}}catch(_){}
    try{if(fireBuffer2!==0){fireBuffer2=0;changed=true}}catch(_){}
    try{input?.delete?.("Space");input?.delete?.("Enter")}catch(_){}
    if(changed&&reason==="pause-resume")diagnostics.pauseResumeAttackRepairs++;
    try{
      const r1=window.CCGLostSizzlerV142R1Stability;
      r1?.repairCombatTimers?.();
      r1?.repairProjectilePool?.();
    }catch(_){}
    return changed;
  }

  function repairCombatState(){
    if(!activeRun()||currentMode()!=="playing")return false;
    let changed=false;
    for(const player of localRoster())changed=repairPlayer(player)||changed;
    try{for(const enemy of host?.enemies||[])changed=repairEnemy(enemy)||changed}catch(_){}
    try{
      const r1=window.CCGLostSizzlerV142R1Stability;
      r1?.repairCombatTimers?.();
      r1?.repairProjectilePool?.();
    }catch(_){}
    return changed;
  }

  function repairAfterPauseTransition(beforeMode){
    if(beforeMode!=="paused")return;
    const attempt=()=>{
      try{
        if(currentMode()==="playing"&&activeRun()){repairAttackLiveness("pause-resume");return true}
      }catch(_){}
      return false;
    };
    if(attempt())return;
    setTimeout(()=>{if(attempt())return;requestAnimationFrame(()=>attempt())},0);
  }

  try{
    if(typeof pause==="function"&&!pause.__ccgV142R18){
      const basePause=pause;
      pause=function(...args){
        const before=currentMode();
        const result=basePause(...args);
        repairAfterPauseTransition(before);
        return result;
      };
      pause.__ccgV142R18=true;pause.__ccgOriginal=basePause;
    }
  }catch(_){}

  try{
    if(typeof hurtPlayer==="function"&&!hurtPlayer.__ccgV142R18){
      const baseHurtPlayer=hurtPlayer;
      hurtPlayer=function(player,...args){repairPlayer(player);return baseHurtPlayer(player,...args)};
      hurtPlayer.__ccgV142R18=true;hurtPlayer.__ccgOriginal=baseHurtPlayer;
    }
  }catch(_){}

  try{
    if(typeof queueAttack==="function"&&!queueAttack.__ccgV142R18){
      const baseQueueAttack=queueAttack;
      queueAttack=function(player,...args){
        repairCombatState();
        diagnostics.attackBoundaryRepairs++;
        return baseQueueAttack(player,...args);
      };
      queueAttack.__ccgV142R18=true;queueAttack.__ccgOriginal=baseQueueAttack;
    }
  }catch(_){}

  try{
    const ai=window.CCGAI;
    if(ai&&typeof ai.stepEnemy==="function"&&!ai.stepEnemy.__ccgV142R18){
      const baseStepEnemy=ai.stepEnemy.bind(ai);
      const wrapped=function(enemy,...args){repairEnemy(enemy);return baseStepEnemy(enemy,...args)};
      wrapped.__ccgV142R18=true;wrapped.__ccgOriginal=ai.stepEnemy;
      ai.stepEnemy=wrapped;
    }
  }catch(_){}

  function ensureWardenStatusNode(){
    let node=document.getElementById("quick-warden-status");
    if(node)return node;
    const effects=document.getElementById("quick-specials"),head=effects?.closest?.(".hub-inventory-head")||effects?.parentElement;
    if(!effects||!head)return null;
    node=document.createElement("span");
    node.id="quick-warden-status";
    node.className="quick-warden-status";
    node.hidden=true;
    node.setAttribute("aria-live","polite");
    head.appendChild(node);
    return node;
  }

  function stripWardenFromEffects(){
    const effects=document.getElementById("quick-specials");
    if(!effects)return false;
    const before=String(effects.textContent||"");
    let next=before
      .replace(/\s*•\s*WARDEN (?:CORRUPTED \[[^\]]+\]|CLEANSED|SKIPPED)/gi,"")
      .replace(/^WARDEN (?:CORRUPTED \[[^\]]+\]|CLEANSED|SKIPPED)\s*•?\s*/i,"")
      .trim();
    if(!next)next="NO ACTIVE EFFECTS";
    if(next!==before){effects.textContent=next;diagnostics.wardenHudRepairs++;return true}
    return false;
  }

  function wardenLabel(){
    let domain=null,state=null;
    try{domain=window.CCGLostSizzlerV142WardenDomainProgression?.domain?.()||null}catch(_){}
    try{
      const floor=Math.max(1,Number(run?.floor)||1);
      state=run?.v142WardenFloors?.[String(floor)]||null;
    }catch(_){}
    if(domain?.active)return `WARDEN CORRUPTED${domain.profileName?` [${domain.profileName}]`:""}`;
    if(domain?.cleansed||state?.resolved)return "WARDEN CLEANSED";
    if(state?.skipped)return "WARDEN SKIPPED";
    return "";
  }

  function syncWardenHud(){
    stripWardenFromEffects();
    const node=ensureWardenStatusNode();if(!node)return;
    const label=wardenLabel();
    if(node.textContent!==label)node.textContent=label;
    node.hidden=!label;
  }

  try{
    if(typeof sync==="function"&&!sync.__ccgV142R18){
      const baseSync=sync;
      sync=function(...args){const result=baseSync(...args);syncWardenHud();return result};
      sync.__ccgV142R18=true;sync.__ccgOriginal=baseSync;
    }
  }catch(_){}
  try{
    if(typeof syncQuickHud==="function"&&!syncQuickHud.__ccgV142R18){
      const baseQuick=syncQuickHud;
      syncQuickHud=function(...args){const result=baseQuick(...args);syncWardenHud();return result};
      syncQuickHud.__ccgV142R18=true;syncQuickHud.__ccgOriginal=baseQuick;
    }
  }catch(_){}

  try{
    const sound=window.CCGSound;
    if(sound&&typeof sound.sfx==="function"&&!sound.sfx.__ccgV142R18){
      const baseSfx=sound.sfx.bind(sound);
      const wrapped=function(name,...args){
        const key=String(name||"");
        const gap=SFX_MIN_GAP[key]||0;
        const t=now(),last=lastSfxAt.get(key)||-Infinity;
        if(gap&&t-last<gap){diagnostics.suppressedSfxRetriggers++;return false}
        lastSfxAt.set(key,t);
        return baseSfx(name,...args);
      };
      wrapped.__ccgV142R18=true;wrapped.__ccgOriginal=sound.sfx;
      sound.sfx=wrapped;
    }
  }catch(_){}

  const maintenance=setInterval(()=>{
    try{repairCombatState();syncWardenHud()}catch(error){console.warn("[Lost Sizzler V10.42] solo stability maintenance failed safely",error)}
  },500);
  addEventListener("pagehide",()=>clearInterval(maintenance),{once:true});
  syncWardenHud();

  window.CCGLostSizzlerV142R18SoloPlaytestStability=Object.freeze({
    version:"V10.42-r18",
    diagnostics,
    repairCombatState,
    repairAttackLiveness,
    repairPlayer,
    repairEnemy,
    syncWardenHud,
    sfxMinGap:SFX_MIN_GAP
  });
})();
