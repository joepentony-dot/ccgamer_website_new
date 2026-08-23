(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_PLAYLIST_AUDIO__||!window.CCGSound)return;
  window.__CCG_LOST_SIZZLER_PLAYLIST_AUDIO__=true;

  const base=window.CCGSound;
  const original={
    start:typeof base.start==="function"?base.start.bind(base):null,
    startMusic:typeof base.startMusic==="function"?base.startMusic.bind(base):null,
    stopMusic:typeof base.stopMusic==="function"?base.stopMusic.bind(base):null,
    toggle:typeof base.toggle==="function"?base.toggle.bind(base):null,
    isEnabled:typeof base.isEnabled==="function"?base.isEnabled.bind(base):null,
    sfx:typeof base.sfx==="function"?base.sfx.bind(base):null,
    windWhistle:typeof base.windWhistle==="function"?base.windWhistle.bind(base):null
  };

  const assets=window.CCG_AUDIO_ASSETS||{music:{}};
  const FADE_MS=2500;
  const STATE_KEYS=["normal","danger","sanctuary","named","stalker"];
  const LEGACY_ADMIN_KEYS={normal:"exploration",danger:"danger",sanctuary:"sanctuary",named:"named",stalker:"stalker"};

  let enabled=original.isEnabled?Boolean(original.isEnabled()):true;
  let started=false;
  let roomMood="normal";
  let stalkerNear=false;
  let stalkerSight=false;
  let musicLevel=.075;
  let current=null;
  let fadingOut=null;
  let fadeTimer=null;
  const stateSlots=new Map();
  const lastByState=new Map();

  const asList=value=>Array.isArray(value)?value.filter(Boolean):(value?[value]:[]);
  const unique=list=>[...new Set(list.map(String).filter(Boolean))];
  const normaliseState=value=>STATE_KEYS.includes(value)?value:"normal";

  function categorySources(state){
    const override=window.CCG_ASSET_OVERRIDES?.audio?.music||{};
    const admin=window.CCG_ADMIN_AUDIO||{};
    const legacy=LEGACY_ADMIN_KEYS[state];
    const custom=unique([
      ...asList(override.playlists?.[state]),
      ...asList(override[legacy]),
      ...asList(admin.playlists?.[state]),
      ...asList(admin[legacy])
    ]);
    if(custom.length)return custom;
    return unique([
      ...asList(assets.music?.playlists?.[state]),
      ...asList(assets.music?.[state])
    ]);
  }

  function desiredState(){return stalkerNear?"stalker":roomMood}

  function targetVolume(state){
    const multiplier=state==="stalker"?(stalkerSight?1.15:1.05):state==="danger"||state==="named"?1.05:1;
    return Math.max(0,Math.min(.45,musicLevel*multiplier));
  }

  function pickTrack(state){
    const list=categorySources(state);
    if(!list.length)return "";
    if(list.length===1){lastByState.set(state,list[0]);return list[0]}
    const last=lastByState.get(state);
    const choices=list.filter(url=>url!==last);
    const pool=choices.length?choices:list;
    const selected=pool[Math.floor(Math.random()*pool.length)];
    lastByState.set(state,selected);
    return selected;
  }

  function pauseSlot(slot){
    if(!slot)return;
    try{
      slot.audio.pause();
      slot.audio.volume=targetVolume(slot.state);
    }catch(_){}
    slot.advancing=false;
  }

  function destroySlot(slot){
    if(!slot)return;
    if(stateSlots.get(slot.state)===slot)stateSlots.delete(slot.state);
    try{
      slot.audio.pause();
      slot.audio.removeAttribute("src");
      slot.audio.load();
    }catch(_){}
  }

  function cancelFade(){
    if(fadeTimer){clearInterval(fadeTimer);fadeTimer=null}
    if(fadingOut&&fadingOut!==current)pauseSlot(fadingOut);
    fadingOut=null;
    if(current)current.audio.volume=targetVolume(current.state);
  }

  function updateVolumes(){
    for(const [state,slot] of stateSlots){
      if(slot)slot.audio.volume=targetVolume(state);
    }
  }

  function finishPrevious(previous,next){
    if(!previous||previous===next)return;
    if(stateSlots.get(previous.state)===previous)pauseSlot(previous);
    else destroySlot(previous);
  }

  function fadeBetween(previous,next){
    cancelFade();
    fadingOut=previous;
    const startedAt=performance.now();
    const previousVolume=previous?.audio?.volume||0;
    const nextVolume=targetVolume(next.state);
    next.audio.volume=0;
    fadeTimer=setInterval(()=>{
      const ratio=Math.min(1,(performance.now()-startedAt)/FADE_MS);
      next.audio.volume=nextVolume*ratio;
      if(previous?.audio)previous.audio.volume=previousVolume*(1-ratio);
      if(ratio<1)return;
      clearInterval(fadeTimer);
      fadeTimer=null;
      finishPrevious(previous,next);
      fadingOut=null;
    },50);
  }

  function armAdvance(slot){
    if(slot.armed)return;
    slot.armed=true;
    const advance=()=>{
      if(current!==slot||slot.advancing||!Number.isFinite(slot.audio.duration))return;
      if(slot.audio.duration-slot.audio.currentTime>FADE_MS/1000+.2)return;
      slot.advancing=true;
      transition(true,true);
    };
    slot.audio.addEventListener("timeupdate",advance);
    slot.audio.addEventListener("ended",()=>{
      if(current===slot&&!slot.advancing){slot.advancing=true;transition(true,true)}
    });
    slot.audio.addEventListener("error",()=>{
      if(current===slot&&!slot.advancing){slot.advancing=true;transition(true,true)}
    });
  }

  function makeSlot(state,url){
    const audio=new Audio(url);
    audio.preload="auto";
    audio.loop=false;
    audio.volume=0;
    audio.playbackRate=1;
    const slot={audio,state,url,advancing:false,armed:false};
    armAdvance(slot);
    return slot;
  }

  function ensureStateSlot(state,advance=false){
    if(!advance){
      const existing=stateSlots.get(state);
      if(existing)return{slot:existing,replaced:null,created:false};
    }
    const replaced=stateSlots.get(state)||null;
    const url=pickTrack(state);
    if(!url)return{slot:null,replaced,created:false};
    const slot=makeSlot(state,url);
    stateSlots.set(state,slot);
    return{slot,replaced,created:true};
  }

  function restoreFailedTransition(next,previous,replaced){
    destroySlot(next);
    if(replaced&&replaced!==next)stateSlots.set(replaced.state,replaced);
    current=previous||null;
    if(current){
      current.advancing=false;
      try{Promise.resolve(current.audio.play()).catch(()=>{})}catch(_){}
      current.audio.volume=targetVolume(current.state);
    }
  }

  /*
   * Every music category owns one persistent Audio object. Theme changes only
   * pause/fade the old category and resume the new category from its saved
   * currentTime. A category selects a new MP3 only when its own active song
   * naturally finishes or fails.
   */
  function transition(force=false,advance=false){
    if(!enabled||!started)return;
    const state=desiredState();

    if(current?.state===state&&!advance){
      current.advancing=false;
      if(current.audio.paused){
        try{Promise.resolve(current.audio.play()).catch(()=>transition(true,true))}catch(_){transition(true,true)}
      }
      current.audio.volume=targetVolume(state);
      return;
    }

    cancelFade();

    const {slot:next,replaced,created}=ensureStateSlot(state,advance);
    if(!next)return;
    const previous=current;

    if(next===previous){
      next.advancing=false;
      if(next.audio.paused){
        try{Promise.resolve(next.audio.play()).catch(()=>transition(true,true))}catch(_){transition(true,true)}
      }
      next.audio.volume=targetVolume(state);
      return;
    }

    current=next;
    next.advancing=false;

    try{
      Promise.resolve(next.audio.play()).then(()=>fadeBetween(previous,next)).catch(()=>{
        if(current!==next)return;
        restoreFailedTransition(next,previous,replaced);
        if(created)setTimeout(()=>transition(true,true),250);
      });
    }catch(_){
      if(current===next){
        restoreFailedTransition(next,previous,replaced);
        if(created)setTimeout(()=>transition(true,true),250);
      }
    }
  }

  async function start(){
    started=true;
    try{original.stopMusic?.()}catch(_){}
    transition(false,false);
    return true;
  }

  function startMusic(){
    started=true;
    transition(false,false);
  }

  function stopMusic(){
    started=false;
    if(fadeTimer){clearInterval(fadeTimer);fadeTimer=null}
    const slots=new Set([...stateSlots.values(),current,fadingOut].filter(Boolean));
    for(const slot of slots)destroySlot(slot);
    stateSlots.clear();
    current=null;
    fadingOut=null;
    try{original.stopMusic?.()}catch(_){}
  }

  function setRoomMood(value){
    const next=normaliseState(value);
    if(next===roomMood){
      transition(false,false);
      return;
    }
    roomMood=next;
    transition(false,false);
  }

  function setStalkerNear(value){
    const next=Boolean(value);
    if(next===stalkerNear)return;
    stalkerNear=next;
    transition(false,false);
  }

  function setStalkerSight(value){
    stalkerSight=Boolean(value);
    updateVolumes();
  }

  function setMusicLevel(value){
    musicLevel=Math.max(0,Math.min(.25,Number(value)||0));
    updateVolumes();
  }

  function toggle(){
    try{enabled=original.toggle?Boolean(original.toggle()):!enabled}catch(_){enabled=!enabled}
    try{original.stopMusic?.()}catch(_){}
    if(enabled){
      started=true;
      transition(false,false);
    }else{
      cancelFade();
      for(const slot of stateSlots.values())pauseSlot(slot);
    }
    return enabled;
  }

  function windWhistle(...args){
    const result=original.windWhistle?.(...args);
    setTimeout(()=>{try{original.stopMusic?.()}catch(_){}},0);
    return result;
  }

  try{original.stopMusic?.()}catch(_){}

  Object.assign(base,{
    start,
    startMusic,
    stopMusic,
    toggle,
    isEnabled:()=>enabled,
    setMusicLevel,
    setRoomMood,
    setNamedEnemy:()=>{},
    setStalkerNear,
    setStalkerSight,
    setDanger:()=>{},
    sfx:(name,...args)=>name==="room"?undefined:original.sfx?.(name,...args),
    windWhistle
  });
  window.CCGSound=base;

  window.CCGLostSizzlerPlaylistAudio={
    refresh:()=>transition(false,false),
    getState:()=>({
      state:desiredState(),
      url:current?.url||"",
      enabled,
      started,
      slots:Object.fromEntries(STATE_KEYS.map(state=>{
        const slot=stateSlots.get(state);
        return[state,{
          url:slot?.url||"",
          time:Number(slot?.audio?.currentTime||0),
          paused:Boolean(slot?.audio?.paused??true),
          active:slot===current
        }];
      }))
    }),
    getPlaylist:state=>categorySources(normaliseState(state)),
    crossfadeMs:FADE_MS
  };

  window.addEventListener("ccg:admin-audio-ready",event=>{
    if(started&&enabled)transition(false,false);
    event?.stopImmediatePropagation?.();
  });
})();
