/* The Lost Sizzler V10.4 — final regression hardening. */
(function(){
  "use strict";
  if(window.__CCG_LOST_SIZZLER_REGRESSION_V104__)return;
  window.__CCG_LOST_SIZZLER_REGRESSION_V104__=true;

  function effectActive(player,key){
    return Number(player?._v104Effects?.[key]?.until||0)>performance.now();
  }

  /* Bozo's Night Out reverses every movement input, including a connected gamepad. */
  if(typeof gamepadDirection==="function"){
    const originalGamepadDirection=gamepadDirection;
    gamepadDirection=function gamepadDirectionV104(){
      const state=originalGamepadDirection();
      if(!state||typeof p1==="undefined"||!p1||!effectActive(p1,"reverse_controls"))return state;
      const x=-Number(state.x||0),y=-Number(state.y||0);
      return{...state,x,y,dir:x||y?{x,y}:null};
    };
  }

  /* Keep shot-evasion movement from dodging an enemy directly onto a player square. */
  if(window.CCGAI?.stepEnemies){
    const originalStepEnemies=window.CCGAI.stepEnemies.bind(window.CCGAI);
    window.CCGAI.stepEnemies=function stepEnemiesV104SafeEvade(hostState,map,players,dt,hooks,worldState){
      const before=new Map((hostState?.enemies||[]).map(enemy=>[enemy.id,{x:enemy.x,y:enemy.y}]));
      const result=originalStepEnemies(hostState,map,players,dt,hooks,worldState);
      const playerCells=new Set((players||[]).filter(Boolean).map(player=>`${player.x},${player.y}`));
      for(const enemy of hostState?.enemies||[]){
        if(!enemy?.alive||Number(enemy._v104EvadeMs||0)<=300||!playerCells.has(`${enemy.x},${enemy.y}`))continue;
        const previous=before.get(enemy.id);
        if(!previous)continue;
        const occupied=(hostState.enemies||[]).some(other=>other!==enemy&&other.alive&&other.x===previous.x&&other.y===previous.y);
        if(!occupied&&window.CCGWorld?.walkable?.(map,previous.x,previous.y,hostState)){
          enemy.x=previous.x;enemy.y=previous.y;
        }
      }
      return result;
    };
  }

  /* Track game-created AudioContexts so the global sound toggle also silences horror audio. */
  const trackedAudioContexts=new Set();
  for(const key of ["AudioContext","webkitAudioContext"]){
    const Native=window[key];
    if(typeof Native!=="function"||Native.__ccgV104Tracked)continue;
    try{
      const Tracked=function(...args){const context=new Native(...args);trackedAudioContexts.add(context);return context};
      Object.setPrototypeOf(Tracked,Native);Tracked.prototype=Native.prototype;Tracked.__ccgV104Tracked=true;window[key]=Tracked;
    }catch(_){}
  }
  if(window.CCGSound?.toggle){
    const originalToggle=window.CCGSound.toggle.bind(window.CCGSound);
    window.CCGSound.toggle=function toggleV104AllAudio(){
      const enabled=originalToggle();
      for(const context of trackedAudioContexts){
        try{if(enabled)context.resume?.();else context.suspend?.()}catch(_){}
      }
      return enabled;
    };
  }

  /* Add the remaining mobile/tablet actions needed to play without a keyboard. */
  function addTouchAction(label,action,handler){
    const actions=document.querySelector("#v104-touch-controls .v104-touch-actions");
    if(!actions||actions.querySelector(`[data-action="${action}"]`))return;
    const button=document.createElement("button");
    button.className="v104-touch-btn";button.type="button";button.dataset.action=action;button.textContent=label;
    button.addEventListener("pointerdown",event=>{event.preventDefault();if(typeof mode==="undefined"||!p1)return;handler()});
    actions.appendChild(button);
  }
  function completeTouchControls(){
    addTouchAction("WARP","warp",()=>{if(mode==="playing")useTeleport(p1)});
    addTouchAction("DOOR","door",()=>{if(mode==="playing")closeNearbyDoor(p1)});
    addTouchAction("PAUSE","pause",()=>{if(mode==="playing"||mode==="paused")pause()});
  }
  completeTouchControls();setTimeout(completeTouchControls,250);

  /* The richer death/victory credits supersede the earlier plain-text game list. */
  if(typeof endRun==="function"){
    const originalEndRun=endRun;
    endRun=function endRunV104NoDuplicateCredits(){
      const result=originalEndRun.apply(this,arguments);
      if(UI?.endText){
        let html=UI.endText.innerHTML;
        const legacy=html.search(/<br><br><strong>GAMES FOUND ON THIS CONQUEST/i);
        const rich=html.search(/<section id="v104-retro-credits"/i);
        if(legacy>=0&&rich>legacy)UI.endText.innerHTML=html.slice(0,legacy)+html.slice(rich);
      }
      return result;
    };
  }
})();
