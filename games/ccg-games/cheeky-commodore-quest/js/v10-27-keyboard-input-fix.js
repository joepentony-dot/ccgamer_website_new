/* The Lost Sizzler V10.27 — keyboard focus and tutorial input regression fix. */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_KEYBOARD_INPUT_FIX_V127__)return;
  window.__CCG_LOST_SIZZLER_KEYBOARD_INPUT_FIX_V127__=true;

  const TUTORIAL_KEYS=new Map([
    [0,new Set(["KeyW","KeyA","KeyS","KeyD","ArrowUp","ArrowDown","ArrowLeft","ArrowRight"])],
    [1,new Set(["Space"])],
    [2,new Set(["ShiftLeft","ShiftRight","ControlLeft","ControlRight"])],
    [3,new Set(["Tab"])]
  ]);

  function isEditableTarget(target){
    if(!(target instanceof Element))return false;
    return Boolean(target.closest('input,textarea,select,[contenteditable="true"],[contenteditable=""],[role="textbox"]'));
  }

  /* The core engine listens on window. Stop editable-field key events at
   * document bubbling so normal text entry reaches the field first but never
   * reaches the game shortcut handler. This restores Space, Tab, M, F, P and
   * movement letters inside Bug Report / Suggestion and other text controls. */
  function protectEditableFields(event){
    if(!isEditableTarget(event.target))return;
    event.stopPropagation();
  }

  /* Tutorial instruction cards used to swallow the very key they asked the
   * player to press until Continue was clicked. Treat the expected control as
   * acknowledgement, close the card synchronously, then let that same keydown
   * continue to the engine so the player moves/fires/dashes/opens inventory. */
  function releaseExpectedTutorialKey(event){
    if(event.repeat||isEditableTarget(event.target))return;
    const state=window.CCGLostSizzlerOnboardingV120?.state;
    const modal=document.getElementById("ccg-tutorial-stage-modal");
    if(!state?.active||!modal||modal.classList.contains("hidden"))return;
    const step=Math.max(0,Number(state.step||0));
    const expected=TUTORIAL_KEYS.get(step);
    if(!expected?.has(event.code))return;
    const button=modal.querySelector("[data-stage-continue]");
    if(!(button instanceof HTMLButtonElement))return;
    button.click();
    if(document.activeElement instanceof HTMLElement)document.activeElement.blur();
  }

  window.addEventListener("keydown",releaseExpectedTutorialKey,true);
  document.addEventListener("keydown",protectEditableFields,false);
  window.addEventListener("pagehide",()=>{
    window.removeEventListener("keydown",releaseExpectedTutorialKey,true);
    document.removeEventListener("keydown",protectEditableFields,false);
  },{once:true});

  window.CCGLostSizzlerKeyboardInputFixV127={isEditableTarget,releaseExpectedTutorialKey};
})();
