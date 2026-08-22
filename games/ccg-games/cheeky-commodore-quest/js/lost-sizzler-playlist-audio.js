(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_PLAYLIST_AUDIO__||!window.CCGSound)return;
  window.__CCG_LOST_SIZZLER_PLAYLIST_AUDIO__=true;

  const base=window.CCGSound;
  /*
   * game-core.js caches window.CCGSound in its `S` constant before this late
   * V10.7 layer loads. Keep references to the original functions, then mutate
   * the existing object in place so the cached game reference stays valid.
   */
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
  let explorationSlot=null;
  let fadingOut=null;
  let fadeTimer=null;
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

  function parkExploration(slot){
    if(!slot||slot.state!=="normal")return;
    try{
      slot.audio.pause();
      slot.audio.volume=targetVolume("normal");
    }catch(_){}
    slot.advancing=false;
    explorationSlot=slot;
  }

  function destroySlot(slot){
    if(!slot)return;
    if(slot===explorationSlot)explorationSlot=null;
    try{
      slot.audio.pause();
      slot.audio.removeAttribute("src");
      slot.audio.load();
    }catch(_){}
  }

  function cancelFade(){
    if(fadeTimer){clearInterval(fadeTimer);fadeTimer=null}
    if(!fadingOut)return;
    if(fadingOut.state==="normal"&&current?.state!=="normal")parkExploration(fadingOut);
    else if(fadingOut!==current)destroySlot(fadingOut);
    fadingOut=null;
  }

  function updateVolume(){
    if(current)current.audio.volume=targetVolume(current.state);
  }

  function finishPrevious(previous,next){
    if(!previous||previous===next)return;
    if(previous.state==="normal"&&next.state!=="normal")parkExploration(previous);
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

  function resumeExploration(previous){
    const next=explorationSlot;
    if(!next)return false;
    next.advancing=false;
    current=next;
    try{
      const play=next.audio.play();
      Promise.resolve(play).then(()=>fadeBetween(previous,next)).catch(()=>{
        if(current===next){
          explorationSlot=null;
          current=previous;
          transition(true,true);
        }
      });
      return true;
    }catch(_){
      explorationSlot=null;
      current=previous;
      return false;
    }
  }

  /*
   * `advance` is true only when the song itself reaches its end or fails.
   * Repeated Exploration requests from rooms/corridors never advance the
   * playlist. Returning from a special theme resumes the exact Exploration
   * Audio object and playback position that was interrupted.
   */
  function transition(force=false,advance=false){
    if(!enabled||!started)return;
    const state=desiredState();

    if(state==="normal"&&!advance){
      if(current?.state==="normal"){
        explorationSlot=current;
        if(current.audio.paused){
          current.audio.play().catch(()=>{});
        }
        updateVolume();
        return;
      }
      if(explorationSlot&&resumeExploration(current))return;
    }

    if(current&&current.state===state&&!current.audio.paused&&!force){
      updateVolume();
      return;
    }

    const url=pickTrack(state);
    if(!url)return;
    if(!advance&&!force&&current&&current.state===state&&current.url===url&&!current.audio.paused)return;

    const next=makeSlot(state,url);
    const previous=current;
    current=next;
    if(state==="normal")explorationSlot=next;

    next.audio.play().then(()=>fadeBetween(previous,next)).catch(()=>{
      if(current===next){
        if(next===explorationSlot)explorationSlot=null;
        current=previous;
        destroySlot(next);
        setTimeout(()=>transition(true,true),250);
      }
    });
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
    const slots=new Set([current,fadingOut,explorationSlot].filter(Boolean));
    for(const slot of slots)destroySlot(slot);
    current=null;
    fadingOut=null;
    explorationSlot=null;
    try{original.stopMusic?.()}catch(_){}
  }

  function setRoomMood(value){
    const next=normaliseState(value);
    if(next===roomMood){
      if(next==="normal")transition(false,false);
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
    updateVolume();
  }

  function setMusicLevel(value){
    musicLevel=Math.max(0,Math.min(.25,Number(value)||0));
    updateVolume();
    if(explorationSlot&&explorationSlot!==current)explorationSlot.audio.volume=targetVolume("normal");
  }

  function toggle(){
    try{enabled=original.toggle?Boolean(original.toggle()):!enabled}catch(_){enabled=!enabled}
    try{original.stopMusic?.()}catch(_){}
    if(enabled){started=true;transition(false,false)}else stopMusic();
    return enabled;
  }

  function windWhistle(...args){
    const result=original.windWhistle?.(...args);
    setTimeout(()=>{try{original.stopMusic?.()}catch(_){}},0);
    return result;
  }

  try{original.stopMusic?.()}catch(_){}

  /*
   * IMPORTANT: mutate the cached sound object. The five-theme playlist owns
   * music completely; the old per-frame danger intensity hook is intentionally
   * ignored so it cannot reintroduce legacy music behaviour.
   */
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
      explorationUrl:explorationSlot?.url||"",
      explorationTime:Number(explorationSlot?.audio?.currentTime||0),
      explorationParked:Boolean(explorationSlot&&explorationSlot!==current)
    }),
    getPlaylist:state=>categorySources(normaliseState(state)),
    crossfadeMs:FADE_MS
  };

  /*
   * Admin audio loading must never stop/start a song mid-run. The new sources
   * are picked on the next natural advance/theme change. Stop the old V10.6
   * refresh listener from restarting Exploration after this handler runs.
   */
  window.addEventListener("ccg:admin-audio-ready",event=>{
    if(started&&enabled&&desiredState()==="normal")transition(false,false);
    event?.stopImmediatePropagation?.();
  });
})();