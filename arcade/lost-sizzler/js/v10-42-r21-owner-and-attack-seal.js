/* C64 Dungeon Carnage V10.42 r21 — trap damage owner stability seal. */
(()=>{
  "use strict";
  if(window.CCGLostSizzlerV142R21OwnerAndAttackSeal)return;

  const state={
    trapMonitorReplaced:false,
    duplicateOuterTrapOwnersRemoved:0,
    finalTrapOwnerInstalls:0,
    finalTrapOwnerCalls:0,
    maintenanceTicks:0
  };
  let maintenanceTimer=0;

  const specialType=()=>{try{return String(window.CCGLostSizzlerSpecialModes?.active?.type||document.body?.dataset?.specialMode||"")}catch(_){return""}};
  const ordinaryDungeon=()=>document.body?.dataset?.runActive==="true"&&!new Set(["horde-survivor","sizzler-saboteurs"]).has(specialType());
  const environmentalTrapSource=source=>/trap|spike/i.test(String(source||""));

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

  /* R19 owns the canonical one-hit-per-contact and invulnerability bookkeeping,
     but R1/R18 legitimately wrap hurtPlayer later in the ordered bootstrap. In
     that final chain an armour-aware owner can consume a floor-trap point before
     R19 gets the chance to preserve armour and route the hit to health. Install
     one final, non-R19 boundary after bootstrap completion: ordinary dungeon
     floor traps always cost exactly one health per valid contact, regardless of
     the raw environmental amount supplied by a lower-level caller. Armour is
     temporarily bypassed while the established R18 -> ... -> R19 chain retains
     contact/invulnerability ownership, then restored unchanged. */
  function installFinalTrapOwner(){
    try{
      const current=window.hurtPlayer;
      if(typeof current!=="function")return false;
      if(current.__ccgV142R21TrapDamageFinal===true)return true;
      const wrapped=function hurtPlayerV142R21TrapDamageFinal(player,amount,flash,source){
        if(!ordinaryDungeon()||!player||!environmentalTrapSource(source))return current.apply(this,arguments);
        const beforeArmor=Number(player.armor||0);
        state.finalTrapOwnerCalls++;
        player.armor=0;
        try{return current.call(this,player,1,flash,source)}finally{player.armor=beforeArmor}
      };
      wrapped.__ccgV142R21TrapDamageFinal=true;
      wrapped.__ccgOriginal=current;
      window.hurtPlayer=wrapped;
      state.finalTrapOwnerInstalls++;
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
          state.maintenanceTicks++;
          collapseDuplicateOuterTrapOwner();
          r19.installPortraitLayout?.();
          r19.rearmInactiveTrapContacts?.();
          r19.syncPortraitCanvasAspect?.();
        }catch(error){console.warn("[C64 Dungeon Carnage r21] trap maintenance failed safely",error)}
      },80);
      state.trapMonitorReplaced=true;
      return true;
    }catch(_){return false}
  }

  replaceR19Monitor();
  addEventListener("ccg:v142-ready",()=>{
    replaceR19Monitor();
    installFinalTrapOwner();
  },{once:true});
  addEventListener("pagehide",()=>{
    if(maintenanceTimer)clearInterval(maintenanceTimer);
    maintenanceTimer=0;
  },{once:true});

  window.CCGLostSizzlerV142R21OwnerAndAttackSeal=Object.freeze({
    version:"V10.42-r21",
    state,
    replaceR19Monitor,
    installFinalTrapOwner,
    collapseDuplicateOuterTrapOwner,
    chainHasR19,
    chainHasNestedR19
  });
})();