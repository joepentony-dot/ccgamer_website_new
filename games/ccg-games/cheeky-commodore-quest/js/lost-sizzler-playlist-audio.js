(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_PLAYLIST_AUDIO__||!window.CCGSound)return;
  window.__CCG_LOST_SIZZLER_PLAYLIST_AUDIO__=true;
  const base=window.CCGSound,original={start:base.start?.bind(base),startMusic:base.startMusic?.bind(base),stopMusic:base.stopMusic?.bind(base),toggle:base.toggle?.bind(base),isEnabled:base.isEnabled?.bind(base),setDanger:base.setDanger?.bind(base),sfx:base.sfx?.bind(base),windWhistle:base.windWhistle?.bind(base)};
  const assets=window.CCG_AUDIO_ASSETS||{music:{}},FADE_MS=2500,STATE_KEYS=["normal","danger","sanctuary","named","stalker"],LEGACY={normal:"exploration",danger:"danger",sanctuary:"sanctuary",named:"named",stalker:"stalker"};
  let enabled=original.isEnabled?Boolean(original.isEnabled()):true,started=false,roomMood="normal",stalkerNear=false,stalkerSight=false,musicLevel=.075,current=null,fadingOut=null,fadeTimer=null;
  const lastByState=new Map(),failedUrls=new Set();
  const asList=v=>Array.isArray(v)?v.filter(Boolean):(v?[v]:[]),unique=list=>[...new Set(list.map(String).filter(Boolean))],normalise=s=>STATE_KEYS.includes(s)?s:"normal";
  function sourceGroups(state){const override=window.CCG_ASSET_OVERRIDES?.audio?.music||{},admin=window.CCG_ADMIN_AUDIO||{},legacy=LEGACY[state];return{custom:unique([...asList(override.playlists?.[state]),...asList(override[legacy]),...asList(admin.playlists?.[state]),...asList(admin[legacy])]),bundled:unique([...asList(assets.music?.playlists?.[state]),...asList(assets.music?.[state])])}}
  function categorySources(state){const g=sourceGroups(state),custom=g.custom.filter(url=>!failedUrls.has(url));return custom.length?custom:g.bundled.filter(url=>!failedUrls.has(url))}
  function desiredState(){return stalkerNear?"stalker":roomMood}
  function targetVolume(state){const mult=state==="stalker"?(stalkerSight?1.15:1.05):state==="danger"||state==="named"?1.05:1;return Math.max(0,Math.min(.45,musicLevel*mult))}
  function pickTrack(state){const list=categorySources(state);if(!list.length)return"";const last=lastByState.get(state),choices=list.filter(url=>url!==last),pool=choices.length?choices:list,url=pool[Math.floor(Math.random()*pool.length)];lastByState.set(state,url);return url}
  function stopSlot(slot){if(!slot)return;try{slot.audio.pause();slot.audio.removeAttribute("src");slot.audio.load()}catch(_){}}
  function clearFade(){if(fadeTimer){clearInterval(fadeTimer);fadeTimer=null}if(fadingOut){stopSlot(fadingOut);fadingOut=null}}
  function updateVolume(){if(current)current.audio.volume=targetVolume(current.state)}
  function fadeBetween(previous,next){clearFade();fadingOut=previous;const startedAt=performance.now(),from=previous?.audio?.volume||0,to=targetVolume(next.state);next.audio.volume=0;fadeTimer=setInterval(()=>{const r=Math.min(1,(performance.now()-startedAt)/FADE_MS);next.audio.volume=to*r;if(previous?.audio)previous.audio.volume=from*(1-r);if(r<1)return;clearInterval(fadeTimer);fadeTimer=null;if(previous)stopSlot(previous);fadingOut=null},50)}
  function failSlot(slot){if(!slot)return;failedUrls.add(slot.url);slot.advancing=true;if(current===slot){stopSlot(slot);current=null;setTimeout(()=>transition(true,true),120)}}
  function armAdvance(slot){const advance=()=>{if(current!==slot||slot.advancing||!Number.isFinite(slot.audio.duration)||slot.audio.duration-slot.audio.currentTime>FADE_MS/1000+.2)return;slot.advancing=true;transition(true,true)};slot.audio.addEventListener("timeupdate",advance);slot.audio.addEventListener("ended",()=>{if(current===slot&&!slot.advancing){slot.advancing=true;transition(true,true)}},{once:true});slot.audio.addEventListener("error",()=>failSlot(slot),{once:true})}
  function transition(force=false,advance=false){if(!enabled||!started)return;const state=desiredState();if(current&&current.state===state&&!current.audio.paused){if(state==="normal"&&!advance){updateVolume();return}if(!force){updateVolume();return}}const url=pickTrack(state);if(!url){try{original.startMusic?.()}catch(_){}return}if(!force&&current&&current.state===state&&current.url===url&&!current.audio.paused)return;const audio=new Audio(url);audio.preload="auto";audio.loop=false;audio.volume=0;audio.playbackRate=1;const next={audio,state,url,advancing:false},previous=current;current=next;armAdvance(next);audio.play().then(()=>fadeBetween(previous,next)).catch(()=>{if(current===next){failedUrls.add(url);current=previous;if(previous&&!previous.audio.paused)updateVolume();else setTimeout(()=>transition(true,true),120)}})}
  async function start(){started=true;try{original.stopMusic?.()}catch(_){}transition(false,false);return true}
  function startMusic(){started=true;transition(false,false)}
  function stopMusic(){started=false;if(fadeTimer){clearInterval(fadeTimer);fadeTimer=null}stopSlot(current);stopSlot(fadingOut);current=null;fadingOut=null;try{original.stopMusic?.()}catch(_){}}
  function setRoomMood(value){const next=normalise(value);if(next==="normal"&&current?.state==="normal"&&!current.audio.paused){roomMood="normal";updateVolume();return}if(next===roomMood)return;roomMood=next;transition(false,false)}
  function setStalkerNear(value){const next=Boolean(value);if(next===stalkerNear)return;stalkerNear=next;transition(false,false)}
  function setStalkerSight(value){stalkerSight=Boolean(value);updateVolume()}
  function setMusicLevel(value){musicLevel=Math.max(0,Math.min(.25,Number(value)||0));updateVolume()}
  function toggle(){try{enabled=original.toggle?Boolean(original.toggle()):!enabled}catch(_){enabled=!enabled}try{original.stopMusic?.()}catch(_){}if(enabled){started=true;transition(false,false)}else stopMusic();return enabled}
  function windWhistle(...args){const r=original.windWhistle?.(...args);setTimeout(()=>{try{original.stopMusic?.()}catch(_){}},0);return r}
  try{original.stopMusic?.()}catch(_){}
  Object.assign(base,{start,startMusic,stopMusic,toggle,isEnabled:()=>enabled,setMusicLevel,setRoomMood,setNamedEnemy:()=>{},setStalkerNear,setStalkerSight,setDanger:value=>original.setDanger?.(value),sfx:(name,...args)=>name==="room"?undefined:original.sfx?.(name,...args),windWhistle});window.CCGSound=base;
  window.CCGLostSizzlerPlaylistAudio={refresh:()=>transition(true,false),getState:()=>({state:desiredState(),url:current?.url||"",enabled,started,failed:[...failedUrls]}),getPlaylist:state=>categorySources(normalise(state)),clearFailed:()=>failedUrls.clear(),crossfadeMs:FADE_MS};
  window.addEventListener("ccg:admin-audio-ready",()=>{failedUrls.clear();if(started&&enabled)transition(true,false)});
})();
