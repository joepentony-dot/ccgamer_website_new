/* The Lost Sizzler V10.41 — final tutorial action ownership.
 * Later combat wrappers can sit around the original tutorial fire hook. Without
 * this final owner a single real sword swing can increment training more than
 * once. Count the completed melee animation timestamp instead.
 */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V141_TUTORIAL_ACTION_FINALIZER__)return;
  window.__CCG_LOST_SIZZLER_V141_TUTORIAL_ACTION_FINALIZER__=true;
  const state={installed:false,corrected:0,timer:0};

  function tutorial(){return window.CCGLostSizzlerOnboardingV120?.state||null}
  function repaintSwingProgress(ts){
    const panel=document.getElementById("ccg-tutorial-live-progress");if(!panel)return;
    const spans=[...panel.querySelectorAll("span")],counter=spans.find(node=>/\b\d+\s*\/\s*3\b/.test(node.textContent||""));if(!counter)return;
    const count=Math.max(0,Math.min(3,Number(ts?.swingCount||0)));counter.textContent=`${count} / 3`;counter.className=count>=3?"done":"todo";
  }
  function install(){
    if(state.installed||typeof window.firePlayer!=="function")return state.installed;
    const original=window.firePlayer;
    window.firePlayer=function firePlayerV141TutorialFinal(player,direction){
      const ts=tutorial(),tracking=Boolean(ts?.active&&Number(ts.step)===1),beforeCount=tracking?Math.max(0,Math.min(3,Number(ts.swingCount||0))):0,beforeSwing=tracking?Number(player?._meleeSwingAt||0):0;
      let result;
      try{result=original.apply(this,arguments)}catch(error){throw error}
      if(!tracking)return result;
      const afterSwing=Number(player?._meleeSwingAt||0),completed=Number.isFinite(afterSwing)&&afterSwing>beforeSwing;
      const expected=completed?Math.min(3,beforeCount+1):beforeCount;
      if(Number(ts.swingCount||0)!==expected){
        ts.swingCount=expected;ts.fired=expected>=3;state.corrected++;
        if(expected<3&&ts.autoAdvanceTimer){clearTimeout(ts.autoAdvanceTimer);ts.autoAdvanceTimer=0}
        repaintSwingProgress(ts);
      }
      return result;
    };
    window.firePlayer.__ccgV141TutorialFinal=true;state.installed=true;return true;
  }
  function ready(){return document.body?.dataset?.releaseReady==="true"||window.CCGLostSizzlerReleaseGate?.state?.ready===true}
  const gate=window.CCGLostSizzlerReleaseGate?.state?.promise;
  if(gate&&typeof gate.then==="function")gate.then(ok=>{if(ok!==false)install()}).catch(()=>{});
  state.timer=setInterval(()=>{if(ready()&&install()){clearInterval(state.timer);state.timer=0}},80);
  if(ready())install();
  addEventListener("pagehide",()=>{if(state.timer)clearInterval(state.timer)},{once:true});
  window.CCGLostSizzlerV141TutorialActionFinalizer={install,repaintSwingProgress,get state(){return state}};
})();