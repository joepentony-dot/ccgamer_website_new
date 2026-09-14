/* C64 Dungeon Carnage V10.42 r21 — trap damage owner stability seal. */
(()=>{
  "use strict";
  if(window.CCGLostSizzlerV142R21OwnerAndAttackSeal)return;

  const state={
    trapMonitorReplaced:false,
    duplicateOuterTrapOwnersRemoved:0,
    maintenanceTicks:0
  };
  let maintenanceTimer=0;

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
  addEventListener("ccg:v142-ready",()=>replaceR19Monitor(),{once:true});
  addEventListener("pagehide",()=>{
    if(maintenanceTimer)clearInterval(maintenanceTimer);
    maintenanceTimer=0;
  },{once:true});

  window.CCGLostSizzlerV142R21OwnerAndAttackSeal=Object.freeze({
    version:"V10.42-r21",
    state,
    replaceR19Monitor,
    collapseDuplicateOuterTrapOwner,
    chainHasR19,
    chainHasNestedR19
  });
})();