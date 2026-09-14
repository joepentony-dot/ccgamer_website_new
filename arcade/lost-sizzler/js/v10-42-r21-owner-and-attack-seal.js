/* C64 Dungeon Carnage V10.42 r21 — trap owner and attack completion seal. */
(()=>{
  "use strict";
  if(window.CCGLostSizzlerV142R21OwnerAndAttackSeal)return;

  const state={
    trapMonitorReplaced:false,
    duplicateOuterTrapOwnersRemoved:0,
    attackOwnerInstalled:false,
    queuedAttacks:0,
    dedupedAttacks:0,
    fallbackShots:0
  };
  let maintenanceTimer=0;
  const lastAttackAt=new WeakMap();
  const pendingFallback=new WeakMap();

  function r19Marker(owner){return Boolean(owner?.__ccgV142R19MobileTrapDamage===true)}
  function chainHasR19(owner){
    const seen=new Set();let current=owner;
    while(typeof current==="function"&&!seen.has(current)){
      if(r19Marker(current))return true;
      seen.add(current);current=typeof current.__ccgOriginal==="function"?current.__ccgOriginal:null;
    }
    return false;
  }
  function chainHasNestedR19(owner){
    const seen=new Set();let current=owner,markers=0;
    while(typeof current==="function"&&!seen.has(current)){
      if(r19Marker(current))markers++;
      if(markers>1)return true;
      seen.add(current);current=typeof current.__ccgOriginal==="function"?current.__ccgOriginal:null;
    }
    return false;
  }

  function collapseDuplicateOuterTrapOwner(){
    try{
      const top=window.hurtPlayer;
      if(!r19Marker(top)||!chainHasR19(top.__ccgOriginal))return false;
      window.hurtPlayer=top.__ccgOriginal;
      state.duplicateOuterTrapOwnersRemoved++;
      return true;
    }catch(_){return false}
  }

  function replaceR19Monitor(){
    const r19=window.CCGLostSizzlerV142R19MobileTrapLayoutStability;
    if(!r19?.state)return false;
    try{
      if(r19.state.timer){clearInterval(r19.state.timer);r19.state.timer=0}
      collapseDuplicateOuterTrapOwner();
      if(maintenanceTimer)clearInterval(maintenanceTimer);
      maintenanceTimer=setInterval(()=>{
        try{
          collapseDuplicateOuterTrapOwner();
          r19.installPortraitLayout?.();
          r19.rearmInactiveTrapContacts?.();
          r19.syncPortraitCanvasAspect?.();
        }catch(error){console.warn("[C64 Dungeon Carnage r21] maintenance failed safely",error)}
      },80);
      state.trapMonitorReplaced=true;
      return true;
    }catch(_){return false}
  }

  function activeGameplay(){
    try{return document.body?.dataset?.runActive==="true"&&String(mode)==="playing"}catch(_){return false}
  }
  function shotDirection(player){
    try{
      if(player===p1&&typeof d1==="function")return d1()||player.dir;
      if(player===p2&&typeof d2==="function")return d2()||player.dir;
    }catch(_){}
    return player?.dir||{x:1,y:0}
  }
  function installAttackOwner(){
    try{
      const current=queueAttack;
      if(typeof current!=="function")return false;
      if(current.__ccgV142R21AttackSeal===true)return true;
      const wrapped=function queueAttackV142R21(player,...args){
        if(!player||!activeGameplay())return current.call(this,player,...args);
        const t=performance.now(),last=Number(lastAttackAt.get(player)||-Infinity);
        if(t-last<45){state.dedupedAttacks++;return true}
        lastAttackAt.set(player,t);
        const beforeMana=Number(player.mana),beforeBullets=Number(bullets?.length||0);
        const result=current.call(this,player,...args);
        state.queuedAttacks++;
        const prior=pendingFallback.get(player);if(prior)clearTimeout(prior);
        const timer=setTimeout(()=>{
          pendingFallback.delete(player);
          try{
            if(!activeGameplay()||!player)return;
            const manaNow=Number(player.mana),bulletsNow=Number(bullets?.length||0);
            if(Number.isFinite(beforeMana)&&manaNow<beforeMana)return;
            if(bulletsNow>beforeBullets)return;
            if(player===p1){if(!Number.isFinite(Number(fire1))||Number(fire1)<0)fire1=0;if(!Number.isFinite(Number(fireBuffer1))||Number(fireBuffer1)<0)fireBuffer1=0}
            if(player===p2){if(!Number.isFinite(Number(fire2))||Number(fire2)<0)fire2=0;if(!Number.isFinite(Number(fireBuffer2))||Number(fireBuffer2)<0)fireBuffer2=0}
            if(!Number.isFinite(Number(projectileCD))||Number(projectileCD)<0||Number(projectileCD)>1000)projectileCD=0;
            if(typeof firePlayer==="function"){
              const fired=firePlayer(player,shotDirection(player));
              if(fired!==false||Number(player.mana)<beforeMana||Number(bullets?.length||0)>beforeBullets)state.fallbackShots++;
            }
          }catch(error){console.warn("[C64 Dungeon Carnage r21] attack fallback failed safely",error)}
        },90);
        pendingFallback.set(player,timer);
        return result===false?true:result;
      };
      wrapped.__ccgV142R21AttackSeal=true;
      wrapped.__ccgOriginal=current;
      queueAttack=wrapped;window.queueAttack=wrapped;
      state.attackOwnerInstalled=true;
      return true;
    }catch(_){return false}
  }

  replaceR19Monitor();
  const installAfterBoot=()=>{replaceR19Monitor();installAttackOwner()};
  if(window.CCGLostSizzlerV142Bootstrap?.ready)queueMicrotask(installAfterBoot);
  else addEventListener("ccg:v142-ready",installAfterBoot,{once:true});

  addEventListener("pagehide",()=>{
    if(maintenanceTimer)clearInterval(maintenanceTimer);
    maintenanceTimer=0;
    try{for(const player of [p1,p2].filter(Boolean)){const timer=pendingFallback.get(player);if(timer)clearTimeout(timer)}}catch(_){}
  },{once:true});

  window.CCGLostSizzlerV142R21OwnerAndAttackSeal=Object.freeze({
    version:"V10.42-r21",
    state,
    replaceR19Monitor,
    collapseDuplicateOuterTrapOwner,
    installAttackOwner,
    chainHasR19,
    chainHasNestedR19
  });
})();