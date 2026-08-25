/* The Lost Sizzler V10.41 — Horde isolation guard.
 * Horde owns its arena and announcements: no sanctuary scenery/regen and no
 * legacy dungeon voice director cues may leak into the mode.
 */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V141_HORDE_MODE_SAFETY__)return;
  window.__CCG_LOST_SIZZLER_V141_HORDE_MODE_SAFETY__=true;

  const state={installed:false,voiceWrapped:false,wasHorde:false,timer:0,purges:0};
  const active=()=>window.CCGLostSizzlerSpecialModes?.active||null;
  const isHorde=()=>active()?.type==="horde-survivor"||document.body?.dataset?.specialMode==="horde-survivor";

  function purgeSanctuaryState(){
    if(!isHorde())return false;
    let changed=false;
    if(typeof world!=="undefined"&&world){
      for(const room of world.rooms||[])if(room?.sanctuary){room.sanctuary=false;changed=true}
      if(Array.isArray(world.decor)){
        const before=world.decor.length;world.decor=world.decor.filter(row=>row?.type!=="sanctuaryLake"&&row?.type!=="sanctuaryTree"&&row?.type!=="sanctuaryDancer");changed=changed||world.decor.length!==before
      }
    }
    if(typeof host!=="undefined"&&host){
      if((host.sanctuaryRegeneration||[]).length){host.sanctuaryRegeneration=[];changed=true}
      if((host.sanctuaryScenes||[]).length){host.sanctuaryScenes=[];changed=true}
      if(Array.isArray(host.blockingDecor)){
        const before=host.blockingDecor.length;host.blockingDecor=host.blockingDecor.filter(row=>row?.type!=="sanctuaryLake");changed=changed||host.blockingDecor.length!==before
      }
      if(changed)host.revision=(host.revision||0)+1;
    }
    if(changed)state.purges++;
    return changed;
  }

  function stopLegacyDungeonVoice(){
    const voice=window.CCGLostSizzlerVoice;if(!voice)return;
    try{voice.stop?.("horde-mode")}catch(_){}
    try{if(Array.isArray(voice.state?.queue))voice.state.queue.length=0}catch(_){}
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

  function transitionGuard(){
    const now=isHorde();
    if(now&&!state.wasHorde){
      stopLegacyDungeonVoice();
      try{window.speechSynthesis?.cancel?.()}catch(_){}
      try{S?.setRoomMood?.("normal")}catch(_){}
    }
    state.wasHorde=now;
  }

  function install(){
    wrapLegacyVoice();
    if(state.installed||typeof window.update!=="function")return state.installed;
    const previous=window.update;
    window.update=function updateV141HordeIsolation(){
      transitionGuard();
      if(isHorde())purgeSanctuaryState();
      const result=previous.apply(this,arguments);
      if(isHorde())purgeSanctuaryState();
      return result;
    };
    state.installed=true;
    return true;
  }

  state.timer=setInterval(()=>{wrapLegacyVoice();if(install()&&window.CCGLostSizzlerSpecialModes){clearInterval(state.timer);state.timer=0}},90);
  install();
  window.addEventListener("pagehide",()=>{if(state.timer)clearInterval(state.timer)},{once:true});
  window.CCGLostSizzlerHordeModeSafety={purgeSanctuaryState,isHorde,get state(){return state}};
})();
