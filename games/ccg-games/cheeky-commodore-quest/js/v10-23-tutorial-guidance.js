/* The Lost Sizzler V10.23 — permanent tutorial entry, centred acknowledgement cards and highlighted control training. */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_TUTORIAL_GUIDANCE_V123__)return;
  window.__CCG_LOST_SIZZLER_TUTORIAL_GUIDANCE_V123__=true;

  const INPUT_STEPS=new Map([[0,"move"],[1,"fire"],[2,"dash"],[3,"inventory"]]);
  let lastStep=-1;
  let acknowledgedStep=-1;
  let startChoiceBound=false;

  function ensureStyle(){
    if(document.getElementById("ccg-tutorial-guidance-style"))return;
    const style=document.createElement("style");
    style.id="ccg-tutorial-guidance-style";
    style.textContent=`
      @keyframes ccgTutorialControlFlash{
        0%,100%{box-shadow:0 0 0 2px rgba(114,255,155,.55),0 0 14px rgba(114,255,155,.28);filter:brightness(1.08)}
        50%{box-shadow:0 0 0 4px rgba(255,216,90,.95),0 0 30px rgba(255,216,90,.72);filter:brightness(1.45)}
      }
      body[data-tutorial-active="true"] #ccg-tutorial-rail{display:none!important}
      body[data-tutorial-active="true"] .ccg-tutorial-control-highlight{
        position:relative!important;z-index:80!important;border-color:#ffd85a!important;
        outline:2px solid rgba(114,255,155,.88)!important;outline-offset:2px!important;
        animation:ccgTutorialControlFlash .82s ease-in-out infinite!important;
      }
      #ccg-tutorial-stage-modal,#ccg-start-mode-choice{
        position:fixed!important;inset:0!important;z-index:10120!important;display:grid;place-items:center;
        padding:max(16px,env(safe-area-inset-top)) max(14px,env(safe-area-inset-right)) max(16px,env(safe-area-inset-bottom)) max(14px,env(safe-area-inset-left));
        background:rgba(2,1,5,.76);backdrop-filter:blur(3px);
      }
      #ccg-tutorial-stage-modal.hidden,#ccg-start-mode-choice.hidden{display:none!important}
      #ccg-tutorial-stage-modal .ccg-tutorial-modal-card,#ccg-start-mode-choice .ccg-tutorial-modal-card{
        width:min(720px,calc(100vw - 28px));max-height:calc(100dvh - 34px);overflow:auto;
        padding:clamp(18px,3vw,30px);border:2px solid rgba(108,236,255,.68);border-radius:16px;
        background:linear-gradient(160deg,rgba(13,10,22,.99),rgba(5,7,14,.99));
        box-shadow:0 22px 80px rgba(0,0,0,.78),0 0 34px rgba(108,236,255,.18);text-align:left;
      }
      #ccg-tutorial-stage-modal .tutorial-kicker,#ccg-start-mode-choice .tutorial-kicker{
        display:block;color:#6cecff;font-size:.74rem;font-weight:900;letter-spacing:.16em;text-transform:uppercase;
      }
      #ccg-tutorial-stage-modal h2,#ccg-start-mode-choice h2{margin:7px 0 12px;color:#ffd85a;line-height:1.12}
      #ccg-tutorial-stage-modal p,#ccg-start-mode-choice p{margin:8px 0;line-height:1.5;color:#f1edf7}
      #ccg-tutorial-stage-modal .tutorial-detail{color:#c9c1d2;font-size:.9rem}
      #ccg-tutorial-stage-modal .tutorial-ack-note{
        margin-top:14px;padding:9px 11px;border-left:3px solid #72ff9b;background:rgba(18,62,40,.4);
        color:#caffd7;font-weight:800;font-size:.82rem;
      }
      #ccg-tutorial-stage-modal .ccg-tutorial-modal-actions,#ccg-start-mode-choice .ccg-tutorial-modal-actions{
        display:flex;gap:10px;flex-wrap:wrap;margin-top:18px;
      }
      #ccg-tutorial-stage-modal button,#ccg-start-mode-choice button{min-height:44px;padding:10px 16px}
      #ccg-tutorial-stage-modal .ccg-tutorial-primary,#ccg-start-mode-choice .ccg-tutorial-primary{
        border-color:#ffd85a!important;box-shadow:0 0 20px rgba(255,216,90,.2)!important;
      }
      #menu #tutorial-zone-btn.tutorial-primary-option{
        border-color:rgba(108,236,255,.72)!important;box-shadow:0 0 16px rgba(108,236,255,.14)!important;
      }
      @media(max-width:700px){
        #ccg-tutorial-stage-modal,#ccg-start-mode-choice{align-items:center;padding:12px}
        #ccg-tutorial-stage-modal .ccg-tutorial-modal-card,#ccg-start-mode-choice .ccg-tutorial-modal-card{
          width:min(94vw,620px);max-height:88dvh;padding:18px 16px;
        }
        #ccg-tutorial-stage-modal .ccg-tutorial-modal-actions,#ccg-start-mode-choice .ccg-tutorial-modal-actions{display:grid;grid-template-columns:1fr}
        #ccg-tutorial-stage-modal button,#ccg-start-mode-choice button{width:100%}
        body[data-tutorial-active="true"] #v104-touch-controls .ccg-tutorial-control-highlight{background:#251735!important;border-width:2px!important}
      }
    `;
    document.head.appendChild(style);
  }

  function onboarding(){return window.CCGLostSizzlerOnboardingV120}
  function tutorialState(){return onboarding()?.state||null}
  function rail(){return document.getElementById("ccg-tutorial-rail")}

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
    const state=tutorialState();
    const touch=document.getElementById("v104-touch-controls");
    if(touch){
      let nodes=[];
      if(kind==="move")nodes=[...touch.querySelectorAll("[data-dir]")];
      if(kind==="fire")nodes=[...touch.querySelectorAll('[data-action="fire"]')];
      if(kind==="dash")nodes=[...touch.querySelectorAll('[data-action="dash"]')];
      if(kind==="inventory")nodes=[...touch.querySelectorAll('[data-action="inventory"],[data-action="items"]')];
      nodes.forEach(node=>node.classList.add("ccg-tutorial-control-highlight"));
    }
    if(kind==="inventory"&&state?.inventoryOpened&&!state?.inventoryClosed){
      document.querySelectorAll("#inventory-close,#inventory-close-top").forEach(node=>node.classList.add("ccg-tutorial-control-highlight"));
    }
    desktopCommand(kind);
  }

  function ensurePrimaryTutorialButton(){
    const solo=document.getElementById("solo-btn");
    const row=solo?.closest?.(".menu-buttons");
    if(!solo||!row)return false;
    let button=document.getElementById("tutorial-zone-btn");
    if(!button){
      button=document.createElement("button");
      button.id="tutorial-zone-btn";
      button.type="button";
      button.addEventListener("click",()=>onboarding()?.replay?.());
    }
    button.textContent="Tutorial";
    button.title="Open the safe Training Archive tutorial";
    button.classList.add("tutorial-primary-option");
    if(button.parentElement!==row||button.previousElementSibling!==solo)solo.insertAdjacentElement("afterend",button);
    return true;
  }

  function ensureStartChoice(){
    let wrap=document.getElementById("ccg-start-mode-choice");
    if(wrap)return wrap;
    wrap=document.createElement("div");
    wrap.id="ccg-start-mode-choice";
    wrap.className="hidden";
    wrap.setAttribute("role","dialog");
    wrap.setAttribute("aria-modal","true");
    wrap.setAttribute("aria-labelledby","ccg-start-mode-title");
    wrap.innerHTML=`<div class="ccg-tutorial-modal-card">
      <span class="tutorial-kicker">START THE LOST SIZZLER</span>
      <h2 id="ccg-start-mode-title">Choose how you want to start</h2>
      <p><b>Tutorial</b> opens the safe Training Archive and walks through the controls and dungeon systems.</p>
      <p><b>Play Game</b> starts a normal dungeon run immediately.</p>
      <div class="ccg-tutorial-modal-actions">
        <button type="button" class="ccg-tutorial-primary" data-start-tutorial>TUTORIAL</button>
        <button type="button" data-start-game>PLAY GAME</button>
        <button type="button" data-start-cancel>CANCEL</button>
      </div>
    </div>`;
    document.body.appendChild(wrap);
    wrap.querySelector("[data-start-tutorial]")?.addEventListener("click",()=>{
      wrap.classList.add("hidden");
      onboarding()?.replay?.();
    });
    wrap.querySelector("[data-start-game]")?.addEventListener("click",()=>{
      wrap.classList.add("hidden");
      const state=tutorialState();
      if(!state||typeof startSolo!=="function")return;
      state.forceTutorial=false;state.tutorialRequested=false;state.choiceAccepted=true;
      try{startSolo()}finally{state.choiceAccepted=false}
    });
    wrap.querySelector("[data-start-cancel]")?.addEventListener("click",()=>wrap.classList.add("hidden"));
    return wrap;
  }

  function bindStartChoice(){
    if(startChoiceBound||typeof startSolo!=="function")return;
    const solo=document.getElementById("solo-btn");
    if(!solo)return;
    solo.addEventListener("click",event=>{
      event.preventDefault();event.stopPropagation();event.stopImmediatePropagation?.();
      const choice=ensureStartChoice();
      choice.classList.remove("hidden");
      choice.querySelector("[data-start-tutorial]")?.focus?.({preventScroll:true});
    },true);
    startChoiceBound=true;
  }

  function ensureStageModal(){
    let modal=document.getElementById("ccg-tutorial-stage-modal");
    if(modal)return modal;
    modal=document.createElement("div");
    modal.id="ccg-tutorial-stage-modal";
    modal.className="hidden";
    modal.setAttribute("role","dialog");modal.setAttribute("aria-modal","true");
    document.body.appendChild(modal);
    return modal;
  }

  function readStage(){
    const root=rail();
    if(!root)return null;
    return {
      kicker:String(root.querySelector(".tutorial-kicker")?.textContent||"TUTORIAL ZONE"),
      title:String(root.querySelector("h3")?.textContent||"Tutorial"),
      copy:String(root.querySelector("p:not(.tutorial-detail)")?.textContent||""),
      detail:String(root.querySelector(".tutorial-detail")?.textContent||"")
    };
  }

  function closeStageModal(){ensureStageModal().classList.add("hidden")}

  function stageAction(step){
    const state=tutorialState();
    if(!state?.active)return;
    if(INPUT_STEPS.has(step)){
      acknowledgedStep=step;
      closeStageModal();
      highlightControls(INPUT_STEPS.get(step));
      return;
    }
    const root=rail();
    const button=step===9?root?.querySelector("[data-finish]"):root?.querySelector("[data-next]");
    button?.click?.();
  }

  function exitTutorial(){
    const button=rail()?.querySelector("[data-skip]");
    button?.click?.();
  }

  function showStage(step){
    const info=readStage();
    if(!info)return false;
    const kind=INPUT_STEPS.get(step)||null;
    const modal=ensureStageModal();
    clearHighlights();acknowledgedStep=-1;
    const note=kind
      ? `Press Continue to acknowledge this step. The tutorial will then highlight the ${kind==="inventory"?"Items / Inventory":kind} control for you to use.`
      : step===9
        ? "Press Complete Tutorial when you have read this final message."
        : "Press Continue when you have read this information. The tutorial will not move on until you acknowledge it.";
    modal.innerHTML=`<div class="ccg-tutorial-modal-card">
      <span class="tutorial-kicker">${escapeHtml(info.kicker)}</span>
      <h2>${escapeHtml(info.title)}</h2>
      <p>${escapeHtml(info.copy)}</p>
      <p class="tutorial-detail">${escapeHtml(info.detail)}</p>
      <div class="tutorial-ack-note">${escapeHtml(note)}</div>
      <div class="ccg-tutorial-modal-actions">
        <button type="button" class="ccg-tutorial-primary" data-stage-continue>${step===9?"COMPLETE TUTORIAL":"CONTINUE"}</button>
        <button type="button" data-stage-exit>EXIT TUTORIAL</button>
      </div>
    </div>`;
    modal.querySelector("[data-stage-continue]")?.addEventListener("click",()=>stageAction(step));
    modal.querySelector("[data-stage-exit]")?.addEventListener("click",exitTutorial);
    modal.classList.remove("hidden");
    modal.querySelector("[data-stage-continue]")?.focus?.({preventScroll:true});
    lastStep=step;
    return true;
  }

  function escapeHtml(value){
    return String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
  }

  function blockGameplayKeysWhileReading(event){
    const modal=document.getElementById("ccg-tutorial-stage-modal");
    if(!tutorialState()?.active||!modal||modal.classList.contains("hidden"))return;
    if(event.target instanceof HTMLButtonElement)return;
    event.preventDefault();event.stopPropagation();event.stopImmediatePropagation?.();
  }

  function tick(){
    ensureStyle();ensurePrimaryTutorialButton();bindStartChoice();
    const state=tutorialState();
    if(!state?.active){
      if(lastStep!==-1){clearHighlights();closeStageModal();lastStep=-1;acknowledgedStep=-1}
      return;
    }
    const step=Math.max(0,Number(state.step||0));
    if(step!==lastStep){if(!showStage(step))return}
    const kind=INPUT_STEPS.get(step)||null;
    if(kind&&acknowledgedStep===step){
      highlightControls(kind);
      const ready=onboarding()?.stepReadyForTest?.();
      if(ready&&!state.autoAdvanceTimer)onboarding()?.completeInteractiveForTest?.(kind);
    }else if(acknowledgedStep!==step){
      clearHighlights();
    }
  }

  ensureStyle();ensureStageModal();ensureStartChoice();
  document.addEventListener("keydown",blockGameplayKeysWhileReading,true);
  const timer=setInterval(tick,100);
  tick();
  window.addEventListener("pagehide",()=>{
    clearInterval(timer);clearHighlights();document.removeEventListener("keydown",blockGameplayKeysWhileReading,true);
  },{once:true});
  window.CCGLostSizzlerTutorialGuidanceV123={tick,highlightControls,showStage,ensurePrimaryTutorialButton};
})();
