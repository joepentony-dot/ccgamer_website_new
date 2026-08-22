(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_PLAYLIST_AUDIO__||!window.CCGSound)return;
  window.__CCG_LOST_SIZZLER_PLAYLIST_AUDIO__=true;

  const base=window.CCGSound;
  /*
   * game-core.js caches window.CCGSound in its `S` constant before this late
   * V10.7 layer is loaded. Keep references to the original functions, then
   * mutate the existing sound object in place below. Replacing window.CCGSound
   * with a new object would leave the game calling the stale cached instance.
   */
  const original={
    start:typeof base.start==="function"?base.start.bind(base):null,
    startMusic:typeof base.startMusic==="function"?base.startMusic.bind(base):null,
    stopMusic:typeof base.stopMusic==="function"?base.stopMusic.bind(base):null,
    toggle:typeof base.toggle==="function"?base.toggle.bind(base):null,
    isEnabled:typeof base.isEnabled==="function"?base.isEnabled.bind(base):null,
    setDanger:typeof base.setDanger==="function"?base.setDanger.bind(base):null,
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

  function clearFade(){
    if(fadeTimer){clearInterval(fadeTimer);fadeTimer=null}
    if(fadingOut){
      try{fadingOut.audio.pause()}catch(_){ }
      fadingOut=null;
    }
  }

  function stopSlot(slot){
    if(!slot)return;
    try{slot.audio.pause();slot.audio.removeAttribute("src");slot.audio.load()}catch(_){ }
  }

  function updateVolume(){
    if(current)current.audio.volume=targetVolume(current.state);
  }

  function fadeBetween(previous,next){
    clearFade();
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
      clearInterval(fadeTimer);fadeTimer=null;
      if(previous)stopSlot(previous);
      fadingOut=null;
    },50);
  }

  function armAdvance(slot){
    const advance=()=>{
      if(current!==slot||slot.advancing||!Number.isFinite(slot.audio.duration))return;
      if(slot.audio.duration-slot.audio.currentTime>FADE_MS/1000+.2)return;
      slot.advancing=true;
      transition(true,true);
    };
    slot.audio.addEventListener("timeupdate",advance);
    slot.audio.addEventListener("ended",()=>{
      if(current===slot&&!slot.advancing){slot.advancing=true;transition(true,true)}
    },{once:true});
    slot.audio.addEventListener("error",()=>{
      if(current===slot){slot.advancing=true;transition(true,true)}
    },{once:true});
  }

  /*
   * `advance` is true only when the current song itself has reached its end (or
   * failed to load). A normal Exploration request caused by room/corridor
   * movement must never be allowed to pick another Exploration song.
   */
  function transition(force=false,advance=false){
    if(!enabled||!started)return;
    const state=desiredState();
    if(current&&current.state===state&&!current.audio.paused){
      if(state==="normal"&&!advance){updateVolume();return}
      if(!force){updateVolume();return}
    }
    const url=pickTrack(state);
    if(!url)return;
    if(!force&&current&&current.state===state&&current.url===url&&!current.audio.paused)return;

    const audio=new Audio(url);
    audio.preload="auto";
    audio.loop=false;
    audio.volume=0;
    audio.playbackRate=1;
    const next={audio,state,url,advancing:false};
    armAdvance(next);
    const previous=current;
    current=next;
    audio.play().then(()=>fadeBetween(previous,next)).catch(()=>{
      if(current===next){current=previous;setTimeout(()=>transition(true,true),250)}
    });
  }

  async function start(){
    started=true;
    try{original.stopMusic?.()}catch(_){ }
    transition(false,false);
    return true;
  }

  function startMusic(){started=true;transition(false,false)}

  function stopMusic(){
    started=false;
    if(fadeTimer){clearInterval(fadeTimer);fadeTimer=null}
    stopSlot(current);stopSlot(fadingOut);
    current=null;fadingOut=null;
    try{original.stopMusic?.()}catch(_){ }
  }

  function setRoomMood(value){
    const next=normaliseState(value);
    /*
     * Corridors and every ordinary room resolve to `normal`. Repeated normal
     * requests are deliberately ignored so crossing a room boundary cannot
     * restart or rotate the Exploration playlist.
     */
    if(next==="normal"&&current?.state==="normal"&&!current.audio.paused){
      roomMood="normal";
      updateVolume();
      return;
    }
    if(next===roomMood)return;
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
  }

  function toggle(){
    try{enabled=original.toggle?Boolean(original.toggle()):!enabled}catch(_){enabled=!enabled}
    try{original.stopMusic?.()}catch(_){ }
    if(enabled){started=true;transition(false,false)}else stopMusic();
    return enabled;
  }

  function windWhistle(...args){
    const result=original.windWhistle?.(...args);
    setTimeout(()=>{try{original.stopMusic?.()}catch(_){ }},0);
    return result;
  }

  try{original.stopMusic?.()}catch(_){ }

  /*
   * IMPORTANT: mutate the object rather than assigning a replacement object.
   * game-core.js has already cached this exact object as `S` by this point.
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
    setDanger:value=>original.setDanger?.(value),
    /*
     * The old room-enter WAV fired once entering a corridor and again entering
     * the next room. It sounded like a music interruption, so room-boundary
     * audio is suppressed while all actual gameplay SFX remain untouched.
     */
    sfx:(name,...args)=>name==="room"?undefined:original.sfx?.(name,...args),
    windWhistle
  });
  window.CCGSound=base;

  window.CCGLostSizzlerPlaylistAudio={
    refresh:()=>transition(true,false),
    getState:()=>({state:desiredState(),url:current?.url||"",enabled,started}),
    getPlaylist:state=>categorySources(normaliseState(state)),
    crossfadeMs:FADE_MS
  };

  window.addEventListener("ccg:admin-audio-ready",()=>{
    if(started&&enabled)transition(true,false);
  });
})();