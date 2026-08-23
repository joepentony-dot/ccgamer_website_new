/* The Lost Sizzler V10.23 — tutorial control highlighting, mobile visibility and automatic information stages. */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_TUTORIAL_GUIDANCE_V123__)return;
  window.__CCG_LOST_SIZZLER_TUTORIAL_GUIDANCE_V123__=true;

  const INPUT_STEPS=new Map([[0,"move"],[1,"fire"],[2,"dash"],[3,"inventory"]]);
  const INFO_DELAY=8000;
  const FINISH_DELAY=5000;
  let lastStep=-1;
  let deadline=0;

  function ensureStyle(){
    if(document.getElementById("ccg-tutorial-guidance-style"))return;
    const style=document.createElement("style");
    style.id="ccg-tutorial-guidance-style";
    style.textContent=`
      @keyframes ccgTutorialControlFlash{
        0%,100%{box-shadow:0 0 0 2px rgba(114,255,155,.55),0 0 14px rgba(114,255,155,.28);filter:brightness(1.08)}
        50%{box-shadow:0 0 0 4px rgba(255,216,90,.95),0 0 30px rgba(255,216,90,.72);filter:brightness(1.45)}
      }
      body[data-tutorial-active="true"] .ccg-tutorial-control-highlight{
        position:relative!important;
        z-index:80!important;
        border-color:#ffd85a!important;
        outline:2px solid rgba(114,255,155,.88)!important;
        outline-offset:2px!important;
        animation:ccgTutorialControlFlash .82s ease-in-out infinite!important;
      }
      body[data-tutorial-active="true"] .ccg-tutorial-control-callout{
        display:block!important;
        margin:7px 0!important;
        padding:7px 9px!important;
        border:1px solid rgba(255,216,90,.55)!important;
        border-radius:7px!important;
        background:rgba(55,38,8,.58)!important;
        color:#ffd85a!important;
        font-weight:900!important;
        font-size:.78rem!important;
        letter-spacing:.05em!important;
      }
      body[data-tutorial-active="true"] .ccg-tutorial-auto-progress{
        margin:8px 0 4px!important;
        padding:7px 9px!important;
        border-left:3px solid #6cecff!important;
        background:rgba(15,46,60,.48)!important;
        color:#dffaff!important;
        font-size:.78rem!important;
        line-height:1.35!important;
      }
      @media (max-width:900px),(pointer:coarse){
        body[data-tutorial-active="true"][data-run-active="true"] .ccg-game>.game-area>.game-message-rail{
          min-height:150px!important;
          max-height:min(235px,36vh)!important;
          padding:7px!important;
          overflow-y:auto!important;
          overflow-x:hidden!important;
          overscroll-behavior:contain!important;
          background:#08040d!important;
        }
        body[data-tutorial-active="true"] .game-message-rail>#ccg-tutorial-rail{
          display:block!important;
          width:100%!important;
          max-height:none!important;
          margin:0!important;
          padding:10px!important;
          overflow:visible!important;
        }
        body[data-tutorial-active="true"] .game-message-rail>#ccg-tutorial-rail p,
        body[data-tutorial-active="true"] .game-message-rail>#ccg-tutorial-rail .tutorial-detail,
        body[data-tutorial-active="true"] .game-message-rail>#ccg-tutorial-rail .ccg-tutorial-actions,
        body[data-tutorial-active="true"] .game-message-rail>#ccg-tutorial-rail .ccg-tutorial-progress,
        body[data-tutorial-active="true"] .game-message-rail>#ccg-tutorial-rail .ccg-tutorial-doit,
        body[data-tutorial-active="true"] .game-message-rail>#ccg-tutorial-rail .ccg-tutorial-done{
          display:block!important;
          visibility:visible!important;
          opacity:1!important;
        }
        body[data-tutorial-active="true"] .game-message-rail>#ccg-tutorial-rail p{
          color:#f1edf7!important;
          font-size:12px!important;
          line-height:1.35!important;
        }
        body[data-tutorial-active="true"] .game-message-rail>#ccg-tutorial-rail .tutorial-detail{
          color:#c9c1d2!important;
          font-size:11px!important;
        }
        body[data-tutorial-active="true"] .game-message-rail>:not(#ccg-tutorial-rail){display:none!important}
        body[data-tutorial-active="true"] #v104-touch-controls .ccg-tutorial-control-highlight{
          background:#251735!important;
          border-width:2px!important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function onboarding(){return window.CCGLostSizzlerOnboardingV120}
  function tutorialState(){return onboarding()?.state||null}
  function panel(){return document.getElementById("ccg-tutorial-rail")}

  function clearHighlights(){
    document.querySelectorAll(".ccg-tutorial-control-highlight").forEach(el=>el.classList.remove("ccg-tutorial-control-highlight"));
  }

  function desktopCommand(kind){
    const labels={move:["WASD","MOVE"],fire:["SPACE","FIRE"],dash:["SHIFT","DASH"],inventory:["TAB","ITEMS"]}[kind];
    if(!labels)return;
    document.querySelectorAll(".command-grid span").forEach(span=>{
      const text=String(span.textContent||"").toUpperCase();
      if(labels.some(label=>text.includes(label)))span.classList.add("ccg-tutorial-control-highlight");
    });
  }

  function highlightControls(kind){
    clearHighlights();
    const touch=document.getElementById("v104-touch-controls");
    if(touch){
      let nodes=[];
      if(kind==="move")nodes=[...touch.querySelectorAll("[data-dir]")];
      if(kind==="fire")nodes=[...touch.querySelectorAll('[data-action="fire"]')];
      if(kind==="dash")nodes=[...touch.querySelectorAll('[data-action="dash"]')];
      if(kind==="inventory")nodes=[...touch.querySelectorAll('[data-action="inventory"],[data-action="items"]')];
      nodes.forEach(node=>node.classList.add("ccg-tutorial-control-highlight"));
    }
    desktopCommand(kind);
  }

  function ensureControlCallout(kind){
    const root=panel();if(!root)return;
    let callout=root.querySelector(".ccg-tutorial-control-callout");
    if(!kind){callout?.remove();return}
    if(!callout){callout=document.createElement("span");callout.className="ccg-tutorial-control-callout";const actions=root.querySelector(".ccg-tutorial-actions");root.insertBefore(callout,actions||null)}
    const copy={move:"USE THE FLASHING MOVEMENT CONTROLS",fire:"PRESS THE FLASHING FIRE CONTROL",dash:"PRESS THE FLASHING DASH CONTROL",inventory:"OPEN, THEN CLOSE, THE FLASHING ITEMS / INVENTORY CONTROL"};
    callout.textContent=copy[kind]||"USE THE HIGHLIGHTED CONTROL";
  }

  function ensureAutoProgress(step,remaining){
    const root=panel();if(!root)return;
    let info=root.querySelector(".ccg-tutorial-auto-progress");
    if(!info){info=document.createElement("div");info.className="ccg-tutorial-auto-progress";const actions=root.querySelector(".ccg-tutorial-actions");root.insertBefore(info,actions||null)}
    if(step===9)info.textContent=`Training complete. Returning to the game options automatically in ${remaining}s.`;
    else info.textContent=`Explanation only — no button or key press is required. Continuing automatically in ${remaining}s.`;
    const next=root.querySelector("[data-next]");if(next)next.textContent="Continue Now";
    const finish=root.querySelector("[data-finish]");if(finish)finish.textContent="Return to Options Now";
  }

  function removeAutoProgress(){panel()?.querySelector(".ccg-tutorial-auto-progress")?.remove()}

  function enterStep(step){
    lastStep=step;
    deadline=0;
    const kind=INPUT_STEPS.get(step)||null;
    highlightControls(kind);
    ensureControlCallout(kind);
    removeAutoProgress();
    panel()?.scrollTo?.({top:0,behavior:"auto"});
    if(step>=4&&step<=8)deadline=Date.now()+INFO_DELAY;
    else if(step===9)deadline=Date.now()+FINISH_DELAY;
  }

  function advanceExplanation(step){
    const root=panel();if(!root)return false;
    const button=step===9?root.querySelector("[data-finish]"):root.querySelector("[data-next]");
    if(!button)return false;
    deadline=0;
    button.click();
    return true;
  }

  function tick(){
    ensureStyle();
    const state=tutorialState();
    if(!state?.active){
      if(lastStep!==-1){clearHighlights();ensureControlCallout(null);removeAutoProgress();lastStep=-1;deadline=0}
      return;
    }
    const step=Math.max(0,Number(state.step||0));
    if(step!==lastStep)enterStep(step);
    const kind=INPUT_STEPS.get(step)||null;
    if(kind){highlightControls(kind);ensureControlCallout(kind);return}
    clearHighlights();ensureControlCallout(null);
    if(step<4||step>9)return;
    if(!deadline)deadline=Date.now()+(step===9?FINISH_DELAY:INFO_DELAY);
    const remaining=Math.max(0,Math.ceil((deadline-Date.now())/1000));
    ensureAutoProgress(step,remaining);
    if(Date.now()>=deadline)advanceExplanation(step);
  }

  ensureStyle();
  const timer=setInterval(tick,180);
  tick();
  window.addEventListener("pagehide",()=>{clearInterval(timer);clearHighlights()},{once:true});
  window.CCGLostSizzlerTutorialGuidanceV123={tick,highlightControls};
})();
