/* The Lost Sizzler V10.41 r52 — independent SFX and voice volume accessibility.
 *
 * This layer extends the existing r46 Accessibility & Audio panel without
 * changing gameplay, scoring, multiplayer authority or the established
 * Sound/Voice on-off controls. SFX continues through CCGSound's existing bus;
 * voice output is scaled at the current voice director playback boundary.
 */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V141_R52_AUDIO_ACCESSIBILITY__)return;
  window.__CCG_LOST_SIZZLER_V141_R52_AUDIO_ACCESSIBILITY__=true;

  const state={voiceLevel:1,applies:0,optionsEnhancements:0,activeVoiceAdjustments:0,timer:0,observer:null,mediaPlayWrapped:false,speechWrapped:false};
  const clamp=(value,min=0,max=1)=>Math.max(min,Math.min(max,Number(value)||0));
  const percent=value=>Math.round(clamp(value,0,100));
  const voiceBase=key=>String(key||"")==="hurt"?.56:.72;
  const r46=()=>window.CCGLostSizzlerV141R46ReleaseCandidatePolish;
  const voice=()=>window.CCGLostSizzlerVoice;

  function prefs(){
    const source=r46()?.loadPrefs?.()||{};
    return{...source,sfxPercent:percent(source.sfxPercent??100),voicePercent:percent(source.voicePercent??100)}
  }

  function applyActiveVoice(){
    const active=voice()?.state?.active;if(!active)return false;
    const level=state.voiceLevel,base=voiceBase(active.key);
    try{
      if(active.audio){active.audio.volume=clamp(active.dungeonFx?level:base*level)}
      if(active.speech)active.speech.volume=clamp(base*level);
      state.activeVoiceAdjustments++;return true
    }catch(_){return false}
  }

  function setSfxLevel(value){
    const level=clamp(value);try{window.CCGSound?.setSfxLevel?.(level)}catch(_){}return level
  }
  function setVoiceLevel(value){state.voiceLevel=clamp(value);applyActiveVoice();return state.voiceLevel}
  function applyPrefs(source=prefs()){
    const next={...source,sfxPercent:percent(source.sfxPercent??100),voicePercent:percent(source.voicePercent??100)};
    setSfxLevel(next.sfxPercent/100);setVoiceLevel(next.voicePercent/100);
    const sfxValue=document.getElementById("ccg-r52-sfx-value");if(sfxValue)sfxValue.textContent=`${next.sfxPercent}%`;
    const voiceValue=document.getElementById("ccg-r52-voice-value");if(voiceValue)voiceValue.textContent=`${next.voicePercent}%`;
    state.applies++;return next
  }

  function savePercent(key,value){
    const api=r46();if(!api?.savePrefs)return false;
    const next=prefs();next[key]=percent(value);api.savePrefs(next);applyPrefs(next);return true
  }

  function slider(label,copy,key,value,id){
    const row=document.createElement("label");row.className="ccg-r46-option ccg-r52-audio-option";row.dataset.r52Audio=key;
    row.innerHTML=`<span><b>${label}</b><small>${copy}</small></span><span><input type="range" min="0" max="100" step="5" value="${value}" data-r52-pref="${key}" aria-label="${label}"><b id="${id}">${value}%</b></span>`;
    row.querySelector("input")?.addEventListener("input",event=>savePercent(key,event.currentTarget.value));return row
  }

  function enhanceOptions(){
    const overlay=document.getElementById("ccg-r46-options"),grid=overlay?.querySelector(".ccg-r46-options-grid");if(!grid)return false;
    const current=prefs();
    if(!grid.querySelector('[data-r52-audio="sfxPercent"]'))grid.appendChild(slider("SFX LEVEL","Controls combat, pickup, door and environment effects without changing music.","sfxPercent",current.sfxPercent,"ccg-r52-sfx-value"));
    if(!grid.querySelector('[data-r52-audio="voicePercent"]'))grid.appendChild(slider("VOICE LEVEL","Controls spoken dungeon prompts independently of music and sound effects.","voicePercent",current.voicePercent,"ccg-r52-voice-value"));
    applyPrefs(current);state.optionsEnhancements++;return true
  }

  function installPlaybackHooks(){
    if(!state.mediaPlayWrapped&&window.HTMLMediaElement?.prototype?.play){
      const original=HTMLMediaElement.prototype.play;
      HTMLMediaElement.prototype.play=function playV141R52VoiceScale(){try{const active=voice()?.state?.active;if(active?.audio===this){const base=voiceBase(active.key);this.volume=clamp(active.dungeonFx?state.voiceLevel:base*state.voiceLevel)}}catch(_){}return original.apply(this,arguments)};
      HTMLMediaElement.prototype.play.__ccgV141R52VoiceScale=true;state.mediaPlayWrapped=true
    }
    if(!state.speechWrapped&&window.speechSynthesis?.speak){
      const original=window.speechSynthesis.speak.bind(window.speechSynthesis);
      window.speechSynthesis.speak=function speakV141R52VoiceScale(utterance){try{const active=voice()?.state?.active;if(active?.speech===utterance)utterance.volume=clamp(voiceBase(active.key)*state.voiceLevel)}catch(_){}return original(utterance)};
      window.speechSynthesis.speak.__ccgV141R52VoiceScale=true;state.speechWrapped=true
    }
    return state.mediaPlayWrapped||state.speechWrapped
  }

  function install(){
    installPlaybackHooks();applyPrefs();enhanceOptions();
    if(!state.observer&&document.body){state.observer=new MutationObserver(()=>enhanceOptions());state.observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:["class"]})}
    if(!state.timer)state.timer=setInterval(()=>{installPlaybackHooks();applyActiveVoice();enhanceOptions()},250);
    document.body.dataset.v141R52AudioAccessibility="true";return true
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",install,{once:true});else install();
  addEventListener("pagehide",()=>{state.observer?.disconnect();if(state.timer)clearInterval(state.timer);state.timer=0},{once:true});
  window.CCGLostSizzlerV141R52AudioAccessibility={prefs,applyPrefs,setSfxLevel,setVoiceLevel,enhanceOptions,applyActiveVoice,getSfxLevel:()=>Number(window.CCGSound?.getSfxLevel?.()??1),getVoiceLevel:()=>state.voiceLevel,get state(){return state}};
})();
