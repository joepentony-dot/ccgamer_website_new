/* C64 Dungeon Carnage V10.42 — sustained attack-key liveness. */
(()=>{
  "use strict";
  if(window.CCGLostSizzlerV142AttackHoldLiveness)return;

  const ATTACK_KEYS=new Set(["Space","Numpad0"]); // KeyF is reserved exclusively for fullscreen.
  const HOLD_ARM_MS=180;
  const held=new Set();
  const holdTimers=new Map();
  const diagnostics={keydowns:0,keyups:0,normalisedHolds:0,clears:0,holdArms:0,holdCancellations:0,tutorialSingles:0};

  const activeRun=()=>document.body?.dataset?.runActive==="true";
  const currentMode=()=>{try{return typeof mode!=="undefined"?String(mode):""}catch(_){return""}};
  const editableTarget=target=>Boolean(target instanceof Element&&(target.matches("input,textarea,select,[contenteditable='true'],[contenteditable='']")||target.closest("input,textarea,select,[contenteditable='true'],[contenteditable='']")));
  const spyActive=()=>{try{return String(window.CCGLostSizzlerSpecialModes?.active?.type||document.body?.dataset?.specialMode||"")==="sizzler-saboteurs"}catch(_){return false}};
  const tutorialActive=()=>document.body?.dataset?.tutorialActive==="true";

  function disarmHold(code){
    const timer=holdTimers.get(code);
    if(timer){
      clearTimeout(timer);
      holdTimers.delete(code);
      diagnostics.holdCancellations++;
    }
  }

  function syncHeldAttack(){
    try{
      if(held.size&&activeRun()&&currentMode()==="playing"&&!spyActive()&&!tutorialActive()){
        input?.add?.("Space");
        diagnostics.normalisedHolds++;
      }else input?.delete?.("Space");
    }catch(_){}
  }

  function scheduleSync(){
    queueMicrotask(syncHeldAttack);
    requestAnimationFrame(()=>syncHeldAttack());
  }

  function armHeldAttack(code){
    disarmHold(code);
    if(tutorialActive())return false;
    diagnostics.holdArms++;
    const timer=setTimeout(()=>{
      holdTimers.delete(code);
      if(!held.has(code)||!activeRun()||currentMode()!=="playing"||spyActive()||tutorialActive())return;
      syncHeldAttack();
    },HOLD_ARM_MS);
    holdTimers.set(code,timer);
    return true;
  }

  function clearHeld(){
    if(held.size||holdTimers.size)diagnostics.clears++;
    for(const timer of holdTimers.values())clearTimeout(timer);
    holdTimers.clear();
    held.clear();
    try{input?.delete?.("Space");input?.delete?.("KeyF");input?.delete?.("Numpad0")}catch(_){}
  }

  /*
    R20 owns the immediate capture-phase shot. This layer only restores the
    canonical Space hold after the physical key has remained down long enough
    to be an intentional hold. A quick tap therefore stays one shot, while a
    deliberate hold still enters the ordinary frame-cadence autofire path.
    Tutorial FIRE is always single-action and is never armed as a hold.
  */
  addEventListener("keydown",event=>{
    if(!ATTACK_KEYS.has(event.code)||editableTarget(event.target)||!activeRun()||spyActive())return;
    const fresh=!event.repeat&&!held.has(event.code);
    diagnostics.keydowns++;
    if(!fresh)return;
    if(tutorialActive()){
      diagnostics.tutorialSingles++;
      held.delete(event.code);
      disarmHold(event.code);
      try{input?.delete?.("Space");input?.delete?.(event.code)}catch(_){}
      return;
    }
    held.add(event.code);
    armHeldAttack(event.code);
  },true);

  addEventListener("keyup",event=>{
    if(!ATTACK_KEYS.has(event.code))return;
    disarmHold(event.code);
    held.delete(event.code);
    diagnostics.keyups++;
    scheduleSync();
  },true);

  addEventListener("blur",clearHeld,{passive:true});
  document.addEventListener("visibilitychange",()=>{if(document.hidden)clearHeld();else scheduleSync()},{passive:true});
  addEventListener("pagehide",clearHeld,{once:true});

  window.CCGLostSizzlerV142AttackHoldLiveness=Object.freeze({
    version:"V10.42-attack-hold-liveness",
    diagnostics,
    held,
    syncHeldAttack,
    clearHeld
  });
})();
