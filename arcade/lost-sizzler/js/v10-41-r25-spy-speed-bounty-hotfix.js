/* The Lost Sizzler V10.41 r25 — Spy Vs Spy live speed and bounty isolation hotfix.
 *
 * Live regressions fixed here:
 * - normal movement and the r24 Spy fallback must share one cooldown so a held
 *   direction cannot receive an extra fallback step between normal steps;
 * - ordinary Dungeon Bounty state, presentation and legacy voice must never
 *   leak into Spy Vs Spy (or another special mode).
 */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V141_R25_SPY_SPEED_BOUNTY_HOTFIX__)return;
  window.__CCG_LOST_SIZZLER_V141_R25_SPY_SPEED_BOUNTY_HOTFIX__=true;

  const SPECIAL_MODES=new Set(["sizzler-saboteurs","horde-survivor"]);
  const DUNGEON_VOICE_KEYS=/^(?:bountyStart|bounty|bountyComplete|mutation|deathStalker|loadula|sanctuary|shop|objectiveHint|objectiveNear|rareLoot)$/i;
  const state={
    updateSource:null,startSource:null,toastSource:null,voiceSource:null,timer:0,
    pacedMoves:0,rarePurges:0,hiddenDungeonAlerts:0,suppressedToasts:0,suppressedVoice:0
  };

  function specialModeType(){
    try{
      return String(window.CCGLostSizzlerSpecialModes?.active?.type||document.body?.dataset?.specialMode||run?.specialMode||"").trim();
    }catch(_){return""}
  }
  const specialActive=()=>SPECIAL_MODES.has(specialModeType());
  const spyActive=()=>specialModeType()==="sizzler-saboteurs";
  const dungeonOnlyText=value=>/DUNGEON BOUNTY|BOUNTY START|BOUNTY COMPLETE|DUNGEON BONUS|FLOOR MUTATION|DEATH STALKER|COUNT LOADULA|SANCTUARY|SIGIL LOCKDOWN|ARENA LOCKDOWN|TIMED CHAMBER|BANISHMENT READY|SECRET TRADER|WANDERING MERCHANT/i.test(String(value||""));

  function movementCadence(player){
    const base=Math.max(90,Number(window.CCG_CONFIG?.player?.moveDelay||138));
    const multiplier=Math.max(.5,Math.min(3,Number(player?.moveMultiplier)||1));
    return Math.max(90,Math.round(base*multiplier));
  }

  function syncSpyCadence(before,player){
    if(!spyActive()||!before||!player||player.x===before.x&&player.y===before.y)return false;
    const cadence=movementCadence(player);
    try{
      const r24=window.CCGLostSizzlerV141R24LiveRegressions?.state;
      if(r24)r24.spyMoveCooldownMs=Math.max(Number(r24.spyMoveCooldownMs)||0,cadence);
    }catch(_){}
    try{
      if(typeof p1!=="undefined"&&player===p1&&typeof move1!=="undefined")move1=Math.max(Number(move1)||0,cadence);
      else if(typeof p2!=="undefined"&&player===p2&&typeof move2!=="undefined")move2=Math.max(Number(move2)||0,cadence);
    }catch(_){}
    state.pacedMoves++;return true;
  }

  function purgeSpecialDungeonState(){
    if(!specialActive())return false;
    let changed=false;
    try{
      const rare=window.CCGLostSizzlerRareEvents?.state;
      if(rare){
        if(rare.bounty){rare.bounty=null;changed=true}
        if(rare.mutation){rare.mutation=null;changed=true}
        if(rare.golden){rare.golden=null;changed=true}
        if(rare.hintTarget){rare.hintTarget=null;changed=true}
        if(Number(rare.hintMarkerUntil||0)!==0){rare.hintMarkerUntil=0;changed=true}
      }
    }catch(_){}
    try{
      if(typeof run!=="undefined"&&run){
        if(run.rareMutation){run.rareMutation="";changed=true}
        if(run.dungeonBounty){run.dungeonBounty=null;changed=true}
        if(run.activeBounty){run.activeBounty=null;changed=true}
      }
    }catch(_){}
    if(changed)state.rarePurges++;
    return changed;
  }

  function hideDungeonNotifications(){
    if(!specialActive())return false;
    let hidden=false;
    try{
      const major=document.getElementById("ccg-major-notification");
      const title=major?.querySelector?.(".major-copy b")?.textContent||"";
      if(major&&dungeonOnlyText(title)){
        major.dataset.visible="false";
        document.body?.removeAttribute?.("data-ccg-major-notification");
        hidden=true;
      }
    }catch(_){}
    try{
      const pickup=document.getElementById("pickup-toast"),title=document.getElementById("pickup-title")?.textContent||"";
      if(pickup&&dungeonOnlyText(title)){pickup.classList.remove("show");hidden=true}
    }catch(_){}
    if(hidden)state.hiddenDungeonAlerts++;
    return hidden;
  }

  function wrapUpdate(){
    const current=window.update;
    if(typeof current!=="function")return false;
    if(current.__ccgV141R25SpySpeedBounty){state.updateSource=current;return true}
    if(current===state.updateSource)return true;
    const wrapped=function updateV141R25SpySpeedBounty(){
      const local=spyActive()&&typeof p1!=="undefined"?p1:null;
      const before=local?{x:local.x,y:local.y}:null;
      if(specialActive()){purgeSpecialDungeonState();hideDungeonNotifications()}
      const result=current.apply(this,arguments);
      try{if(local&&spyActive())syncSpyCadence(before,local)}catch(_){}
      if(specialActive()){purgeSpecialDungeonState();hideDungeonNotifications()}
      return result;
    };
    wrapped.__ccgV141R25SpySpeedBounty=true;
    wrapped.__ccgV141R25Original=current;
    window.update=wrapped;state.updateSource=wrapped;return true;
  }

  function wrapStartWorld(){
    const current=window.startWorld;
    if(typeof current!=="function")return false;
    if(current.__ccgV141R25SpecialIsolation){state.startSource=current;return true}
    if(current===state.startSource)return true;
    const wrapped=function startWorldV141R25SpecialIsolation(){
      const result=current.apply(this,arguments);
      try{if(specialActive()){purgeSpecialDungeonState();hideDungeonNotifications()}}catch(_){}
      return result;
    };
    wrapped.__ccgV141R25SpecialIsolation=true;
    wrapped.__ccgV141R25Original=current;
    window.startWorld=wrapped;state.startSource=wrapped;return true;
  }

  function wrapToast(){
    const current=window.showToast;
    if(typeof current!=="function")return false;
    if(current.__ccgV141R25SpecialIsolationToast){state.toastSource=current;return true}
    if(current===state.toastSource)return true;
    const wrapped=function showToastV141R25SpecialIsolation(title){
      if(specialActive()&&dungeonOnlyText(title)){
        purgeSpecialDungeonState();hideDungeonNotifications();state.suppressedToasts++;return false;
      }
      return current.apply(this,arguments);
    };
    wrapped.__ccgV141R25SpecialIsolationToast=true;
    wrapped.__ccgV141R25Original=current;
    window.showToast=wrapped;state.toastSource=wrapped;return true;
  }

  function wrapVoice(){
    const voice=window.CCGLostSizzlerVoice,current=voice?.say;
    if(typeof current!=="function")return false;
    if(current.__ccgV141R25SpecialIsolationVoice){state.voiceSource=current;return true}
    if(current===state.voiceSource)return true;
    const wrapped=function sayV141R25SpecialIsolation(key){
      if(specialActive()&&DUNGEON_VOICE_KEYS.test(String(key||""))){
        purgeSpecialDungeonState();hideDungeonNotifications();state.suppressedVoice++;return false;
      }
      return current.apply(this,arguments);
    };
    wrapped.__ccgV141R25SpecialIsolationVoice=true;
    wrapped.__ccgV141R25Original=current;
    voice.say=wrapped;state.voiceSource=wrapped;return true;
  }

  function install(){
    wrapStartWorld();wrapUpdate();wrapToast();wrapVoice();
    if(specialActive()){purgeSpecialDungeonState();hideDungeonNotifications()}
    return Boolean(state.updateSource&&state.startSource);
  }

  const gate=window.CCGLostSizzlerReleaseGate?.state?.promise;
  if(gate&&typeof gate.then==="function")gate.then(ok=>{if(ok!==false)install()}).catch(()=>{});
  install();
  state.timer=setInterval(()=>{
    install();
    if(specialActive()){purgeSpecialDungeonState();hideDungeonNotifications()}
  },120);
  addEventListener("pagehide",()=>{if(state.timer)clearInterval(state.timer);state.timer=0},{once:true});

  window.CCGLostSizzlerV141R25SpySpeedBountyHotfix={
    install,specialModeType,specialActive,spyActive,movementCadence,syncSpyCadence,
    purgeSpecialDungeonState,hideDungeonNotifications,dungeonOnlyText,
    constants:{SPECIAL_MODES},get state(){return state}
  };
})();
