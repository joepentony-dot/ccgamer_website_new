/* The Lost Sizzler V10.41 — multiplayer never pauses.
 * Online Dungeon, Horde Multiplayer, Spy Vs Spy and local 2P split-screen all
 * continue in real time. Solo Horde remains a single-player mode and may pause.
 *
 * r28: keeping multiplayer in playing mode must never clear held movement or
 * attack input. Input is cleared only by real focus/pause lifecycle handlers.
 */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V141_MULTIPLAYER_NO_PAUSE__)return;
  window.__CCG_LOST_SIZZLER_V141_MULTIPLAYER_NO_PAUSE__=true;

  const state={pauseWrapped:false,menuWrapped:false,updateWrapped:false,timer:0,lastNoticeAt:0};
  const special=()=>window.CCGLostSizzlerSpecialModes?.active||null;

  function readPlayMode(){try{return typeof playMode!=="undefined"?String(playMode||""):""}catch(_){return""}}
  function hasSecondLocalPlayer(){try{return typeof p2!=="undefined"&&Boolean(p2)}catch(_){return false}}
  function runActive(){return document.body?.dataset?.runActive==="true"}
  function soloHorde(){return document.body?.dataset?.hordeSolo==="true"}

  function multiplayerActive(){
    if(!runActive())return false;
    const active=special(),type=String(active?.type||"");
    if(type==="sizzler-saboteurs")return true;
    if(type==="horde-survivor"){
      if(soloHorde())return false;
      const count=Array.isArray(active?.state?.players)?active.state.players.filter(player=>player?.status!=="left").length:0;
      // The shared special-mode launcher internally sets playMode="online" for
      // Solo Horde as well. The explicit hordeSolo dataset above is therefore
      // authoritative. Every other Horde run is a multiplayer room and must
      // keep running even when only the host is connected at that moment.
      return readPlayMode()==="online"||count>1;
    }
    if(readPlayMode()==="online")return true;
    if(hasSecondLocalPlayer())return true;
    return false;
  }

  function forcePlaying(){
    if(!multiplayerActive())return false;
    try{if(typeof mode!=="undefined"&&mode==="paused")mode="playing"}catch(_){}
    try{UI?.pause?.classList?.add("hidden")}catch(_){}
    // This guard changes pause state only. It deliberately leaves held
    // movement and attack state untouched so the normal input owner keeps
    // authoritative movement, doors and combat responsive between frames.
    return true;
  }

  function notice(){
    const now=performance.now();if(now-state.lastNoticeAt<1800)return;
    state.lastNoticeAt=now;
    try{showToast?.("MULTIPLAYER CONTINUES","Pause is disabled while other players are in the match.","cyan",3200)}catch(_){}
  }

  function wrapPause(){
    if(state.pauseWrapped||typeof window.pause!=="function")return state.pauseWrapped;
    const original=window.pause;
    window.pause=function pauseV141MultiplayerLock(){
      if(multiplayerActive()){forcePlaying();notice();return false}
      return original.apply(this,arguments)
    };
    state.pauseWrapped=true;return true;
  }

  function wrapPauseMenu(){
    if(state.menuWrapped||typeof window.openPauseMenu!=="function")return state.menuWrapped;
    const original=window.openPauseMenu;
    window.openPauseMenu=function openPauseMenuV141MultiplayerLock(){
      if(multiplayerActive()){forcePlaying();notice();return false}
      return original.apply(this,arguments)
    };
    state.menuWrapped=true;return true;
  }

  function wrapUpdate(){
    if(state.updateWrapped||typeof window.update!=="function")return state.updateWrapped;
    const original=window.update;
    window.update=function updateV141MultiplayerNoPause(){
      if(multiplayerActive())forcePlaying();
      const result=original.apply(this,arguments);
      if(multiplayerActive())forcePlaying();
      return result
    };
    state.updateWrapped=true;return true;
  }

  function blockPauseKey(event){
    if(!multiplayerActive())return;
    if(event.code!=="Escape"&&event.code!=="KeyP")return;
    event.preventDefault();event.stopImmediatePropagation();forcePlaying();notice();
  }

  function multiplayerQuit(event){
    const button=event.target?.closest?.("#quit-btn");
    if(!button||!multiplayerActive())return;
    event.preventDefault();event.stopImmediatePropagation();forcePlaying();
    let leave=true;try{leave=window.confirm("Leave this multiplayer match? The other players will continue without pausing.")}catch(_){}
    if(!leave)return;
    try{if(typeof window.quitToMenu==="function"){window.quitToMenu();return}}catch(_){}
    try{window.CCGLostSizzlerSpecialModes?.stop?.()}catch(_){}
  }

  function install(){wrapPause();wrapPauseMenu();wrapUpdate();return state.pauseWrapped&&state.updateWrapped}
  addEventListener("keydown",blockPauseKey,true);
  document.addEventListener("click",multiplayerQuit,true);
  state.timer=setInterval(()=>{install();if(multiplayerActive())forcePlaying();if(state.pauseWrapped&&state.menuWrapped&&state.updateWrapped){clearInterval(state.timer);state.timer=0}},80);
  install();
  window.addEventListener("pagehide",()=>{if(state.timer)clearInterval(state.timer);removeEventListener("keydown",blockPauseKey,true);document.removeEventListener("click",multiplayerQuit,true)},{once:true});
  window.CCGLostSizzlerV141MultiplayerNoPause={multiplayerActive,soloHorde,forcePlaying,get state(){return state}};
})();