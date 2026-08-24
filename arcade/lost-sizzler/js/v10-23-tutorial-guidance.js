/* The Lost Sizzler V10.23 — permanent tutorial entry, centred acknowledgement cards and reliable async launch. */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_TUTORIAL_GUIDANCE_V123__)return;
  window.__CCG_LOST_SIZZLER_TUTORIAL_GUIDANCE_V123__=true;

  const INPUT_STEPS=new Map([[0,"move"],[1,"fire"],[2,"dash"],[3,"inventory"]]);
  const INFO_HIGHLIGHTS=new Map([
    [4,[[".mission","1 · CURRENT OBJECTIVE"],[".radar-card","2 · TACTICAL RADAR"],["#pickup-toast","3 · CONTEXTUAL HINTS"]]],
    [5,[[".health-stat","1 · HEALTH"],[".armour-stat","2 · ARMOUR"],[".potion-card","3 · POTION · E"],[".torch-card","4 · TORCH · Q"],[".hub-inventory","5 · QUICK ITEMS"]]],
    [6,[[".keys-card","1 · KEYRING"],[".canvas-wrap","2 · DOORS & CHESTS"],["#pickup-toast","3 · INTERACTION REPORTS"]]],
    [7,[[".canvas-wrap","1 · LIVE ENEMIES"],[".dossier-card","2 · NAMED ENEMY DOSSIER"],["#banish-alert","3 · STALKER BANISH PROMPT"]]],
    [8,[[".canvas-wrap","1 · EVENTS & HAZARDS"],[".radar-card","2 · DISCOVERED SHOPS"],["#hud-score","3 · SCORE"],["#pickup-toast","4 · EVENT REPORTS"]]]
  ]);
  const INFO_SHOWCASES=new Map([
    [4,{title:"FOLLOW THE FLOOR OBJECTIVE",copy:"These three live areas work together. The mission tells you what is required, the radar shows explored routes, and contextual hints appear only after five inactive minutes when nothing has been collected or encountered.",items:[["◎","MISSION","Main Vault Keys → Exit Sigil → Exit"],["⌖","RADAR","Explored routes and known objective markers"],["!","HINTS","Objective-only guidance when genuinely lost"]]}],
    [5,{title:"READ YOUR SURVIVAL HUD",copy:"These are live examples from your current training screen. Armour is spent before health; quick items show both their shortcut and their carried quantity.",items:[["+","HEALTH","Damage remaining before defeat"],["◇","ARMOUR","Absorbs incoming damage first"],["E","POTION","Restore health from inventory"],["Q","TORCH","Increase dungeon visibility"],["1–6","QUICK ITEMS","Numbered carried-item stacks"]]}],
    [6,{title:"UNDERSTAND LOCKS AND REWARDS",copy:"Main keys belong to the floor objective. Bronze keys open optional bronze doors or locked chests. The Exit Sigil appears after its defenders are defeated. Secret routes are deliberately not revealed here.",items:[["KEY","MAIN KEY","Required objective progress"],["BK","BRONZE KEY","Optional door or locked chest"],["▥","DOOR","Walk into it to interact"],["▣","CHEST","Open for loot; locked ones need Bronze"],["SIG","EXIT SIGIL","Required before the exit releases"]]}],
    [7,{title:"KNOW THE DUNGEON THREATS",copy:"Ordinary enemies, tougher named enemies and the Death Stalker have distinct warnings. Permanently banishing the Death Stalker awards a large score bonus and can drop a rare Banishment Artefact.",items:[["♟","ENEMY","Standard floor threat"],["★","NAMED ENEMY","Tougher foe with a dossier entry"],["S","DEATH STALKER","Cannot be killed by ordinary weapons"],["B","BANISHMENT FLASK","Use in range for permanent banishment"]]}],
    [8,{title:"SPOT SPECIAL OPPORTUNITIES",copy:"Rare events announce themselves through the dungeon view and report panel. Shops appear on the radar only after discovery, hazards demand careful movement, and score buys supplies as well as driving Weekly rankings.",items:[["✦","RARE EVENT","Mimics, Gilded Elf and mutations"],["$","SHOP","Spend score or trade artefacts"],["▲","HAZARD","Traps, boulders and vortex pits"],["000","SCORE","Currency, bonuses and Weekly ranking"]]}]
  ]);
  let lastStep=-1;
  let acknowledgedStep=-1;
  let soloBound=false;
  let tutorialLaunchPending=false;
  let queuedLaunch=null;
  let informationTourStep=-1;

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
      @keyframes ccgTutorialInfoGlow{0%,100%{outline-color:#6cecff;filter:brightness(1.08)}50%{outline-color:#ffd85a;filter:brightness(1.28)}}
      body[data-tutorial-active="true"] .ccg-tutorial-info-highlight{position:relative!important;z-index:10130!important;outline:3px solid #6cecff!important;outline-offset:3px!important;box-shadow:0 0 0 6px rgba(3,2,8,.88),0 0 34px rgba(108,236,255,.68)!important;animation:ccgTutorialInfoGlow 1.25s ease-in-out infinite!important}
      body[data-tutorial-active="true"] .ccg-tutorial-info-highlight:after{content:attr(data-tutorial-callout);position:absolute;z-index:2;right:6px;top:6px;padding:5px 8px;border:1px solid #ffd85a;border-radius:6px;background:#160d21;color:#fff3b0;font:900 .68rem/1.1 monospace;letter-spacing:.06em;box-shadow:0 4px 16px rgba(0,0,0,.55);pointer-events:none}
      #ccg-tutorial-stage-modal{
        position:fixed!important;inset:0!important;z-index:10120!important;display:grid;place-items:center;
        padding:max(16px,env(safe-area-inset-top)) max(14px,env(safe-area-inset-right)) max(16px,env(safe-area-inset-bottom)) max(14px,env(safe-area-inset-left));
        background:rgba(2,1,5,.76);backdrop-filter:blur(3px);
      }
      #ccg-tutorial-stage-modal.hidden{display:none!important}
      #ccg-tutorial-stage-modal .ccg-tutorial-modal-card{
        width:min(720px,calc(100vw - 28px));max-height:calc(100dvh - 34px);overflow:auto;
        padding:clamp(18px,3vw,30px);border:2px solid rgba(108,236,255,.68);border-radius:16px;
        background:linear-gradient(160deg,rgba(13,10,22,.99),rgba(5,7,14,.99));
        box-shadow:0 22px 80px rgba(0,0,0,.78),0 0 34px rgba(108,236,255,.18);text-align:left;
      }
      #ccg-tutorial-stage-modal .tutorial-kicker{
        display:block;color:#6cecff;font-size:.74rem;font-weight:900;letter-spacing:.16em;text-transform:uppercase;
      }
      #ccg-tutorial-stage-modal h2{margin:7px 0 12px;color:#ffd85a;line-height:1.12}
      #ccg-tutorial-stage-modal p{margin:8px 0;line-height:1.5;color:#f1edf7}
      #ccg-tutorial-stage-modal .tutorial-detail{color:#c9c1d2;font-size:.9rem}
      #ccg-tutorial-stage-modal .tutorial-ack-note{
        margin-top:14px;padding:9px 11px;border-left:3px solid #72ff9b;background:rgba(18,62,40,.4);
        color:#caffd7;font-weight:800;font-size:.82rem;
      }
      #ccg-tutorial-stage-modal .ccg-tutorial-modal-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:18px}
      #ccg-tutorial-stage-modal button{min-height:44px;padding:10px 16px}
      #ccg-tutorial-stage-modal .ccg-tutorial-primary{
        border-color:#ffd85a!important;box-shadow:0 0 20px rgba(255,216,90,.2)!important;
      }
      #ccg-tutorial-info-tour{position:fixed;z-index:10150;left:50%;bottom:max(18px,env(safe-area-inset-bottom));transform:translateX(-50%);width:min(880px,calc(100vw - 28px));max-height:min(46dvh,430px);overflow:auto;padding:15px 17px;border:2px solid rgba(255,216,90,.75);border-radius:14px;background:linear-gradient(150deg,rgba(20,12,30,.98),rgba(4,12,20,.98));box-shadow:0 18px 60px rgba(0,0,0,.72),0 0 32px rgba(255,216,90,.16)}
      #ccg-tutorial-info-tour.hidden{display:none!important}#ccg-tutorial-info-tour .tour-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px}#ccg-tutorial-info-tour small{color:#6cecff;font-weight:900;letter-spacing:.14em}#ccg-tutorial-info-tour h3{margin:3px 0 5px;color:#ffd85a}#ccg-tutorial-info-tour p{margin:0;color:#ddd5e5;font-size:.84rem;line-height:1.4}#ccg-tutorial-info-tour .tour-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(145px,1fr));gap:8px;margin:12px 0}#ccg-tutorial-info-tour .tour-item{display:grid;grid-template-columns:42px 1fr;gap:8px;align-items:center;padding:9px;border:1px solid rgba(108,236,255,.28);border-radius:9px;background:rgba(255,255,255,.045)}#ccg-tutorial-info-tour .tour-symbol{display:grid;place-items:center;width:38px;height:38px;border:1px solid #ffd85a;border-radius:8px;color:#fff3b0;background:#20152c;font:900 .78rem/1 monospace;box-shadow:inset 0 0 12px rgba(255,216,90,.12)}#ccg-tutorial-info-tour .tour-item b{display:block;color:#fff;font-size:.72rem}#ccg-tutorial-info-tour .tour-item span:last-child{display:block;color:#bfb5c9;font-size:.65rem;line-height:1.3}#ccg-tutorial-info-tour button{min-height:42px;padding:9px 15px}
      #menu #tutorial-zone-btn.tutorial-primary-option{
        border-color:rgba(108,236,255,.72)!important;box-shadow:0 0 16px rgba(108,236,255,.14)!important;
      }
      @media(max-width:700px){
        #ccg-tutorial-stage-modal{align-items:center;padding:12px}
        #ccg-tutorial-stage-modal .ccg-tutorial-modal-card{width:min(94vw,620px);max-height:88dvh;padding:18px 16px}
        #ccg-tutorial-stage-modal .ccg-tutorial-modal-actions{display:grid;grid-template-columns:1fr}
        #ccg-tutorial-stage-modal button{width:100%}
        #ccg-tutorial-info-tour{bottom:10px;max-height:58dvh;padding:12px}#ccg-tutorial-info-tour .tour-head{display:block}#ccg-tutorial-info-tour .tour-head button{width:100%;margin-top:10px}#ccg-tutorial-info-tour .tour-grid{grid-template-columns:1fr 1fr}
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
    document.querySelectorAll(".ccg-tutorial-info-highlight").forEach(el=>{el.classList.remove("ccg-tutorial-info-highlight");delete el.dataset.tutorialCallout;if(el.dataset.tutorialWasHidden==="true"){el.classList.add("hidden");delete el.dataset.tutorialWasHidden}});
  }

  function highlightInformation(step){for(const [selector,label] of INFO_HIGHLIGHTS.get(step)||[]){const node=document.querySelector(selector);if(!node)continue;if(node.classList.contains("hidden")){node.dataset.tutorialWasHidden="true";node.classList.remove("hidden")}node.dataset.tutorialCallout=label;node.classList.add("ccg-tutorial-info-highlight")}}

  function ensureInformationTour(){let tour=document.getElementById("ccg-tutorial-info-tour");if(tour)return tour;tour=document.createElement("section");tour.id="ccg-tutorial-info-tour";tour.className="hidden";tour.setAttribute("aria-live","polite");(document.querySelector(".ccg-game")||document.body).appendChild(tour);return tour}
  function hideInformationTour(){const tour=document.getElementById("ccg-tutorial-info-tour");if(tour)tour.classList.add("hidden");informationTourStep=-1}
  function completeInformationTour(step){const state=tutorialState();if(!state?.active||Number(state.step)!==step)return;hideInformationTour();clearHighlights();rail()?.querySelector("[data-next]")?.click?.()}
  function showInformationTour(step){const data=INFO_SHOWCASES.get(step);if(!data)return false;const tour=ensureInformationTour();informationTourStep=step;tour.innerHTML=`<div class="tour-head"><div><small>LIVE VISUAL TOUR · ${step+1}/10</small><h3>${escapeHtml(data.title)}</h3><p>${escapeHtml(data.copy)}</p></div><button type="button" class="ccg-tutorial-primary" data-tour-continue>CONTINUE</button></div><div class="tour-grid">${data.items.map(([symbol,title,copy])=>`<article class="tour-item"><span class="tour-symbol">${escapeHtml(symbol)}</span><span><b>${escapeHtml(title)}</b><span>${escapeHtml(copy)}</span></span></article>`).join("")}</div>`;tour.querySelector("[data-tour-continue]")?.addEventListener("click",()=>completeInformationTour(step));tour.classList.remove("hidden");return true}

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

  function launchSolo(tutorial){
    const requested=Boolean(tutorial);
    const state=tutorialState();
    if(!state||typeof startSolo!=="function"){
      queuedLaunch=requested;
      tutorialLaunchPending=requested;
      return false;
    }
    queuedLaunch=null;
    state.forceTutorial=requested;
    state.tutorialRequested=requested;
    state.choiceAccepted=true;
    tutorialLaunchPending=requested;
    let result;
    try{
      result=startSolo();
    }catch(error){
      state.choiceAccepted=false;
      tutorialLaunchPending=false;
      throw error;
    }
    Promise.resolve(result).finally(()=>{
      /* startSolo waits for fullscreen/audio before beginRun. Keep the bypass
       * alive for that entire async period so the retired core chooser cannot
       * reappear after the player has already made a menu choice. */
      state.choiceAccepted=false;
      if(!tutorial)state.forceTutorial=false;
      if(tutorial&&!state.active){
        /* Do not clear tutorialRequested here. The core onboarding activation
         * timer owns it and must still see the request after fullscreen settles. */
        setTimeout(()=>{tutorialLaunchPending=Boolean(state.tutorialRequested&&!state.active)},250);
      }else tutorialLaunchPending=false;
    });
    return result;
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
    }
    if(button.dataset.ccgTutorialLaunchBound!=="true"){
      button.addEventListener("click",event=>{
        event.preventDefault();event.stopPropagation();event.stopImmediatePropagation?.();
        launchSolo(true);
      },true);
      button.dataset.ccgTutorialLaunchBound="true";
    }
    button.textContent="Tutorial";
    button.title="Open the safe Training Archive tutorial";
    button.classList.add("tutorial-primary-option");
    if(button.parentElement!==row||button.previousElementSibling!==solo)solo.insertAdjacentElement("afterend",button);
    return true;
  }

  function bindSoloDirect(){
    if(soloBound)return;
    const solo=document.getElementById("solo-btn");
    if(!solo)return;
    solo.addEventListener("click",event=>{
      event.preventDefault();event.stopPropagation();event.stopImmediatePropagation?.();
      launchSolo(false);
    },true);
    soloBound=true;
  }

  function hideRedundantChoices(){
    document.getElementById("ccg-start-mode-choice")?.remove();
    const legacy=document.getElementById("ccg-tutorial-choice");
    if(legacy)legacy.classList.add("hidden");
  }

  function ensureStageModal(){
    let modal=document.getElementById("ccg-tutorial-stage-modal");
    const mount=document.querySelector(".ccg-game")||document.body;
    if(modal){if(modal.parentElement!==mount)mount.appendChild(modal);return modal}
    modal=document.createElement("div");
    modal.id="ccg-tutorial-stage-modal";
    modal.className="hidden";
    modal.setAttribute("role","dialog");modal.setAttribute("aria-modal","true");
    mount.appendChild(modal);
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

  function focusGameplaySurface(){
    requestAnimationFrame(()=>{
      const canvas=document.getElementById("game");
      try{document.activeElement?.blur?.()}catch(_){}
      try{if(canvas){canvas.tabIndex=-1;canvas.focus({preventScroll:true})}}catch(_){}
    });
  }

  function stageAction(step){
    const state=tutorialState();
    if(!state?.active)return;
    if(INPUT_STEPS.has(step)){
      acknowledgedStep=step;
      closeStageModal();
      highlightControls(INPUT_STEPS.get(step));
      focusGameplaySurface();
      return;
    }
    if(INFO_SHOWCASES.has(step)){
      acknowledgedStep=step;
      closeStageModal();
      clearHighlights();
      highlightInformation(step);
      showInformationTour(step);
      focusGameplaySurface();
      return;
    }
    const root=rail();
    const button=step===9?root?.querySelector("[data-finish]"):root?.querySelector("[data-next]");
    button?.click?.();
  }

  function exitTutorial(){rail()?.querySelector("[data-skip]")?.click?.()}

  function showStage(step){
    const info=readStage();
    if(!info)return false;
    const kind=INPUT_STEPS.get(step)||null;
    const modal=ensureStageModal();
    clearHighlights();hideInformationTour();acknowledgedStep=-1;
    const note=kind
      ? `Press Continue to acknowledge this step. The tutorial will then highlight the ${kind==="inventory"?"Items / Inventory":kind} control for you to use.`
      : step===9
        ? "Press Complete Tutorial when you have read this final message."
        : INFO_HIGHLIGHTS.has(step)
          ? "Press Continue to begin a guided visual tour. The lesson will pause while the live interface areas and examples are highlighted."
          : "Press Continue when you have read this information. The tutorial will not move on until you acknowledge it.";
    modal.innerHTML=`<div class="ccg-tutorial-modal-card">
      <span class="tutorial-kicker">${escapeHtml(info.kicker)}</span>
      <h2>${escapeHtml(info.title)}</h2>
      <p>${escapeHtml(info.copy)}</p>
      <p class="tutorial-detail">${escapeHtml(info.detail)}</p>
      <div class="tutorial-ack-note">${escapeHtml(note)}</div>
      <div class="ccg-tutorial-modal-actions">
        <button type="button" class="ccg-tutorial-primary" data-stage-continue>${step===9?"COMPLETE TUTORIAL":"CONTINUE"}</button>
        ${step===9?"":'<button type="button" data-stage-exit>EXIT TUTORIAL</button>'}
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
    return String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]||char));
  }

  function interactiveReady(kind,state){
    if(kind==="move")return Boolean(state?.moved);
    if(kind==="fire")return Boolean(state?.fired);
    if(kind==="dash")return Boolean(state?.dashed);
    if(kind==="inventory")return Boolean(state?.inventoryOpened&&state?.inventoryClosed);
    return false;
  }

  function blockGameplayKeysWhileReading(event){
    const modal=document.getElementById("ccg-tutorial-stage-modal");
    if(!tutorialState()?.active||!modal||modal.classList.contains("hidden"))return;
    if(event.target instanceof HTMLButtonElement&&(event.code==="Enter"||event.code==="Space"))return;
    event.preventDefault();event.stopPropagation();event.stopImmediatePropagation?.();
  }

  function tick(){
    ensureStyle();ensurePrimaryTutorialButton();bindSoloDirect();hideRedundantChoices();
    const state=tutorialState();
    if(queuedLaunch!==null&&state&&typeof startSolo==="function"){
      const requested=queuedLaunch;queuedLaunch=null;launchSolo(requested);return;
    }
    if(!state?.active){
      if(lastStep!==-1){clearHighlights();closeStageModal();hideInformationTour();lastStep=-1;acknowledgedStep=-1}
      return;
    }
    tutorialLaunchPending=false;
    const step=Math.max(0,Number(state.step||0));
    if(step!==lastStep){if(!showStage(step))return}
    const kind=INPUT_STEPS.get(step)||null;
    if(kind&&acknowledgedStep===step){
      highlightControls(kind);
      if(interactiveReady(kind,state)&&!state.autoAdvanceTimer)onboarding()?.completeInteractiveForTest?.(kind);
    }else if(INFO_SHOWCASES.has(step)&&acknowledgedStep===step){
      highlightInformation(step);
      if(informationTourStep!==step)showInformationTour(step);
    }else if(acknowledgedStep!==step){
      clearHighlights();
    }
  }

  ensureStyle();ensureStageModal();
  document.addEventListener("keydown",blockGameplayKeysWhileReading,true);
  const timer=setInterval(tick,100);
  tick();
  window.addEventListener("pagehide",()=>{
    clearInterval(timer);clearHighlights();hideInformationTour();document.removeEventListener("keydown",blockGameplayKeysWhileReading,true);
  },{once:true});
  window.CCGLostSizzlerTutorialGuidanceV123={tick,highlightControls,highlightInformation,showStage,showInformationTour,completeInformationTour,ensurePrimaryTutorialButton,launchSolo,get tutorialLaunchPending(){return tutorialLaunchPending},get queuedLaunch(){return queuedLaunch}};
})();
