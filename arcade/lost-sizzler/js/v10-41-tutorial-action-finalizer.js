/* The Lost Sizzler V10.41 — final tutorial action ownership.
 * Later enhancement modules can replace movement, fire and dash after the
 * original tutorial hooks install. Keep one outer physical-action owner after
 * release readiness so training tracks what the player actually did, not how
 * many nested wrappers happened to observe the same input.
 */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V141_TUTORIAL_ACTION_FINALIZER__)return;
  window.__CCG_LOST_SIZZLER_V141_TUTORIAL_ACTION_FINALIZER__=true;
  const state={installed:false,wraps:0,corrected:0,timer:0};

  function tutorial(){return window.CCGLostSizzlerOnboardingV120?.state||null}
  function tutorialApi(){return window.CCGLostSizzlerOnboardingV120||null}
  function clampCount(value){return Math.max(0,Math.min(3,Number(value||0)))}
  function numericCounter(){
    const panel=document.getElementById("ccg-tutorial-live-progress");if(!panel)return null;
    return[...panel.querySelectorAll("span")].find(node=>/\b\d+\s*\/\s*3\b/.test(node.textContent||""))||null;
  }
  function repaintCount(ts,key){
    const counter=numericCounter();if(!counter)return;
    const count=clampCount(ts?.[key]);counter.textContent=`${count} / 3`;counter.className=count>=3?"done":"todo";
  }
  function armInteractive(kind){
    try{return tutorialApi()?.completeInteractiveForTest?.(kind)}catch(error){console.warn(`[Lost Sizzler V10.41] tutorial ${kind} completion guard recovered`,error);return false}
  }
  function movementDirection(before,player){
    const ax=Number(player?.x),ay=Number(player?.y),bx=Number(before?.x),by=Number(before?.y);if(![ax,ay,bx,by].every(Number.isFinite))return null;
    const dx=Math.sign(ax-bx),dy=Math.sign(ay-by);if(!dx&&!dy)return null;
    if(Math.abs(ax-bx)>=Math.abs(ay-by)&&dx)return dx<0?"left":"right";
    return dy<0?"up":"down";
  }

  function installMove(){
    const current=window.movePlayer;if(typeof current!=="function")return false;
    if(current.__ccgV141TutorialMoveFinal)return true;
    const original=current;
    const wrapped=function movePlayerV141TutorialFinal(player,dx,dy,dash=false){
      const ts=tutorial(),tracking=Boolean(ts?.active&&Number(ts.step)===0),before=tracking&&player?{x:Number(player.x),y:Number(player.y)}:null;
      const result=original.apply(this,arguments);
      if(!tracking||!player)return result;
      const direction=movementDirection(before,player);if(!direction)return result;
      if(!(ts.movementDirections instanceof Set))ts.movementDirections=new Set();
      const beforeSize=ts.movementDirections.size;ts.movementDirections.add(direction);
      const distance=Math.abs(Number(player.x)-before.x)+Math.abs(Number(player.y)-before.y);ts.movementDistance=Math.max(0,Number(ts.movementDistance||0))+Math.max(0,distance);
      try{ts.lastMovement?.set?.(player.id||player,{x:Number(player.x),y:Number(player.y)})}catch(_){}
      ts.moved=ts.movementDirections.size>=4;
      if(ts.movementDirections.size!==beforeSize)state.corrected++;
      if(ts.moved&&!ts.autoAdvanceTimer)armInteractive("move");
      return result;
    };
    wrapped.__ccgV141TutorialMoveFinal=true;wrapped.__ccgV141TutorialOriginal=original;window.movePlayer=wrapped;state.wraps++;return true;
  }

  function installFire(){
    const current=window.firePlayer;if(typeof current!=="function")return false;
    if(current.__ccgV141TutorialFireFinal)return true;
    const original=current;
    const wrapped=function firePlayerV141TutorialFinal(player,direction){
      const ts=tutorial(),tracking=Boolean(ts?.active&&Number(ts.step)===1),beforeCount=tracking?clampCount(ts.swingCount):0,beforeSwing=tracking?Number(player?._meleeSwingAt||0):0;
      const result=original.apply(this,arguments);
      if(!tracking)return result;
      const afterSwing=Number(player?._meleeSwingAt||0),completed=Number.isFinite(afterSwing)&&afterSwing>beforeSwing;
      const expected=completed?Math.min(3,beforeCount+1):beforeCount;
      if(clampCount(ts.swingCount)!==expected||Boolean(ts.fired)!==(expected>=3))state.corrected++;
      ts.swingCount=expected;ts.fired=expected>=3;
      if(expected<3&&ts.autoAdvanceTimer){clearTimeout(ts.autoAdvanceTimer);ts.autoAdvanceTimer=0}
      repaintCount(ts,"swingCount");
      if(expected>=3&&!ts.autoAdvanceTimer)armInteractive("fire");
      return result;
    };
    wrapped.__ccgV141TutorialFireFinal=true;wrapped.__ccgV141TutorialOriginal=original;window.firePlayer=wrapped;state.wraps++;return true;
  }

  function installDash(){
    const current=window.dashPlayer;if(typeof current!=="function")return false;
    if(current.__ccgV141TutorialDashFinal)return true;
    const original=current;
    const wrapped=function dashPlayerV141TutorialFinal(player,direction){
      const ts=tutorial(),tracking=Boolean(ts?.active&&Number(ts.step)===2),beforeCount=tracking?clampCount(ts.dashCount):0,before=tracking&&player?{x:Number(player.x),y:Number(player.y)}:null;
      const result=original.apply(this,arguments);
      if(!tracking||!player)return result;
      const moved=Boolean(movementDirection(before,player));
      const expected=moved?Math.min(3,beforeCount+1):beforeCount;
      if(clampCount(ts.dashCount)!==expected||Boolean(ts.dashed)!==(expected>=3))state.corrected++;
      ts.dashCount=expected;ts.dashed=expected>=3;
      if(expected<3&&ts.autoAdvanceTimer){clearTimeout(ts.autoAdvanceTimer);ts.autoAdvanceTimer=0}
      repaintCount(ts,"dashCount");
      if(expected>=3&&!ts.autoAdvanceTimer)armInteractive("dash");
      return result;
    };
    wrapped.__ccgV141TutorialDashFinal=true;wrapped.__ccgV141TutorialOriginal=original;window.dashPlayer=wrapped;state.wraps++;return true;
  }

  function install(){
    const moveReady=installMove(),fireReady=installFire(),dashReady=installDash();
    state.installed=Boolean(moveReady&&fireReady&&dashReady);return state.installed;
  }
  function ready(){return document.body?.dataset?.releaseReady==="true"||window.CCGLostSizzlerReleaseGate?.state?.ready===true}
  const gate=window.CCGLostSizzlerReleaseGate?.state?.promise;
  if(gate&&typeof gate.then==="function")gate.then(ok=>{if(ok!==false)install()}).catch(()=>{});
  state.timer=setInterval(()=>{if(ready())install()},60);
  if(ready())install();
  addEventListener("pagehide",()=>{if(state.timer)clearInterval(state.timer)},{once:true});
  window.CCGLostSizzlerV141TutorialActionFinalizer={install,repaintCount,get state(){return state}};
})();