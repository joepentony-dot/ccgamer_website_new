/* The Lost Sizzler V10.41 — Horde isolation guard.
 * Horde owns its arena, objectives and announcements. Both Solo Horde and
 * Horde Multiplayer must remain independent of ordinary dungeon systems.
 */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V141_HORDE_MODE_SAFETY__)return;
  window.__CCG_LOST_SIZZLER_V141_HORDE_MODE_SAFETY__=true;

  const state={installed:false,voiceWrapped:false,toastWrapped:false,wasHorde:false,timer:0,purges:0,lastPurgeAt:0};
  const active=()=>window.CCGLostSizzlerSpecialModes?.active||null;
  const isHorde=()=>{
    try{return active()?.type==="horde-survivor"||document.body?.dataset?.specialMode==="horde-survivor"}catch(_){return false}
  };

  const dungeonOnlyText=value=>/DUNGEON BOUNTY|BOUNTY START|BOUNTY COMPLETE|DUNGEON BONUS|FLOOR MUTATION|DEATH STALKER|COUNT LOADULA|SANCTUARY|SIGIL LOCKDOWN|ARENA LOCKDOWN|TIMED CHAMBER|BANISHMENT READY|SECRET TRADER|WANDERING MERCHANT/i.test(String(value||""));

  function hideDungeonNotifications(){
    if(!isHorde())return false;
    const pickup=document.getElementById("pickup-toast"),pickupTitle=document.getElementById("pickup-title")?.textContent||"";
    if(pickup&&dungeonOnlyText(pickupTitle))pickup.classList.remove("show");
    const major=document.getElementById("ccg-major-notification"),majorTitle=major?.querySelector?.(".major-copy b")?.textContent||"";
    if(major&&dungeonOnlyText(majorTitle)){
      major.dataset.visible="false";
      document.body?.removeAttribute?.("data-ccg-major-notification");
    }
    return true;
  }

  function purgeSanctuaryState(){
    if(!isHorde())return false;
    let changed=false;
    if(typeof world!=="undefined"&&world){
      for(const room of world.rooms||[]){
        if(room?.sanctuary){room.sanctuary=false;changed=true}
        if(room?.goldenRoom){room.goldenRoom=false;changed=true}
        if(room?.developerRoom){room.developerRoom=false;changed=true}
      }
      if(Array.isArray(world.decor)){
        const before=world.decor.length;
        world.decor=world.decor.filter(row=>!/^sanctuary/i.test(String(row?.type||"")));
        changed=changed||world.decor.length!==before;
      }
    }
    if(typeof host!=="undefined"&&host){
      if((host.sanctuaryRegeneration||[]).length){host.sanctuaryRegeneration=[];changed=true}
      if((host.sanctuaryScenes||[]).length){host.sanctuaryScenes=[];changed=true}
      if(Array.isArray(host.blockingDecor)){
        const before=host.blockingDecor.length;
        host.blockingDecor=host.blockingDecor.filter(row=>!/^sanctuary/i.test(String(row?.type||"")));
        changed=changed||host.blockingDecor.length!==before;
      }
      if(changed)host.revision=(host.revision||0)+1;
    }
    return changed;
  }

  function purgeRareDungeonState(){
    if(!isHorde())return false;
    let changed=false;
    const rare=window.CCGLostSizzlerRareEvents?.state;
    if(rare){
      if(rare.bounty){rare.bounty=null;changed=true}
      if(rare.mutation){rare.mutation=null;changed=true}
      if(rare.golden){rare.golden=null;changed=true}
      if(rare.hintTarget){rare.hintTarget=null;changed=true}
      if(Number(rare.hintMarkerUntil||0)!==0){rare.hintMarkerUntil=0;changed=true}
      if(rare.plans&&Object.keys(rare.plans).length){rare.plans={};changed=true}
    }
    try{
      if(typeof run!=="undefined"&&run){
        if(run.rareMutation){run.rareMutation="";changed=true}
        if(run.dungeonBounty){run.dungeonBounty=null;changed=true}
        if(run.activeBounty){run.activeBounty=null;changed=true}
      }
    }catch(_){}
    return changed;
  }

  function purgeHostDungeonObjects(){
    if(!isHorde()||typeof host==="undefined"||!host)return false;
    let changed=false;
    const empty=name=>{
      if(Array.isArray(host[name])&&host[name].length){host[name]=[];changed=true}
    };
    for(const name of ["items","chests","shrines","switches","shops","deathCaches","generators","traps","hazardRooms","timedRooms"])empty(name);
    for(const name of ["trader","startShop","stalker","gildedElf","rescue","memoryPuzzle","sequenceTorchPuzzle","weightBridge","spiderNest","skeletonHorde"]){
      if(host[name]){host[name]=null;changed=true}
    }
    if(Array.isArray(host.enemies)){
      const before=host.enemies.length;
      host.enemies=host.enemies.filter(enemy=>enemy?.hordeEnemy||enemy?.hordeWarden||enemy?._hordeModelId||enemy?._v138Reserve);
      changed=changed||host.enemies.length!==before;
    }
    if(changed)host.revision=(host.revision||0)+1;
    return changed;
  }

  function purgeDungeonRuntime(){
    if(!isHorde())return false;
    const changed=Boolean(purgeRareDungeonState()|purgeSanctuaryState()|purgeHostDungeonObjects());
    hideDungeonNotifications();
    state.lastPurgeAt=performance.now();
    if(changed)state.purges++;
    return changed;
  }

  function stopLegacyDungeonVoice(){
    const voice=window.CCGLostSizzlerVoice;if(!voice)return;
    try{voice.stop?.("horde-mode")}catch(_){}
    try{if(Array.isArray(voice.state?.queue))voice.state.queue.length=0}catch(_){}
    try{window.speechSynthesis?.cancel?.()}catch(_){}
  }

  function wrapLegacyVoice(){
    if(state.voiceWrapped)return true;
    const legacy=window.CCGLostSizzlerVoice;if(!legacy?.say||!legacy?.classifyToast)return false;
    window.CCGLostSizzlerVoice={
      say(key,...args){if(isHorde())return false;return legacy.say.call(legacy,key,...args)},
      stop(...args){return legacy.stop?.call(legacy,...args)},
      classifyToast(...args){if(isHorde())return"";return legacy.classifyToast.call(legacy,...args)},
      setEnabled(...args){return legacy.setEnabled?.call(legacy,...args)},
      get enabled(){return legacy.enabled},
      get state(){return legacy.state},
      lines:legacy.lines,
      bundledSprite:legacy.bundledSprite
    };
    state.voiceWrapped=true;
    return true;
  }

  function wrapToast(){
    if(state.toastWrapped||typeof window.showToast!=="function")return state.toastWrapped;
    const legacy=window.showToast;
    const wrapped=function showToastV141HordeIsolation(title){
      if(isHorde()&&dungeonOnlyText(title)){hideDungeonNotifications();return false}
      return legacy.apply(this,arguments)
    };
    wrapped.__ccgV141HordeIsolation=true;
    window.showToast=wrapped;
    state.toastWrapped=true;
    return true;
  }

  function transitionGuard(){
    const now=isHorde();
    if(now&&!state.wasHorde){
      stopLegacyDungeonVoice();
      purgeDungeonRuntime();
      try{S?.setRoomMood?.("normal")}catch(_){}
    }
    state.wasHorde=now;
  }

  function install(){
    wrapLegacyVoice();
    wrapToast();
    if(state.installed||typeof window.update!=="function")return state.installed;
    const previous=window.update;
    window.update=function updateV141HordeIsolation(){
      transitionGuard();
      if(isHorde())purgeDungeonRuntime();
      const result=previous.apply(this,arguments);
      if(isHorde())purgeDungeonRuntime();
      return result;
    };
    state.installed=true;
    return true;
  }

  state.timer=setInterval(()=>{
    wrapLegacyVoice();wrapToast();
    if(isHorde())purgeDungeonRuntime();
    if(install()&&window.CCGLostSizzlerSpecialModes&&state.voiceWrapped&&state.toastWrapped){clearInterval(state.timer);state.timer=0}
  },90);
  install();
  window.addEventListener("pagehide",()=>{if(state.timer)clearInterval(state.timer)},{once:true});
  window.CCGLostSizzlerHordeModeSafety={purgeSanctuaryState,purgeRareDungeonState,purgeHostDungeonObjects,purgeDungeonRuntime,isHorde,get state(){return state}};
})();