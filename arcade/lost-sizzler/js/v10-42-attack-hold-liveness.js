/* C64 Dungeon Carnage V10.42 — sustained attack-key liveness. */
(()=>{
  "use strict";
  if(window.CCGLostSizzlerV142AttackHoldLiveness)return;

  const ATTACK_KEYS=new Set(["Space","KeyF","Numpad0"]);
  const held=new Set();
  const diagnostics={keydowns:0,keyups:0,normalisedHolds:0,clears:0};

  const activeRun=()=>document.body?.dataset?.runActive==="true";
  const currentMode=()=>{try{return typeof mode!=="undefined"?String(mode):""}catch(_){return""}};
  const editableTarget=target=>Boolean(target instanceof Element&&(target.matches("input,textarea,select,[contenteditable='true'],[contenteditable='']")||target.closest("input,textarea,select,[contenteditable='true'],[contenteditable='']")));
  const spyActive=()=>{try{return String(window.CCGLostSizzlerSpecialModes?.active?.type||document.body?.dataset?.specialMode||"")==="sizzler-saboteurs"}catch(_){return false}};

  function syncHeldAttack(){
    try{
      if(held.size&&activeRun()&&currentMode()==="playing"&&!spyActive()){
        input?.add?.("Space");
        diagnostics.normalisedHolds++;
      }else input?.delete?.("Space");
    }catch(_){}
  }

  function scheduleSync(){
    queueMicrotask(syncHeldAttack);
    requestAnimationFrame(()=>syncHeldAttack());
  }

  function clearHeld(){
    if(held.size)diagnostics.clears++;
    held.clear();
    try{input?.delete?.("Space");input?.delete?.("KeyF");input?.delete?.("Numpad0")}catch(_){}
  }

  /*
    R20 owns the immediate capture-phase attack repair. Its successful direct
    shot deliberately removes the triggering key from the shared input Set.
    That made a held fire button depend on browser/OS repeat keydown events.
    Normalise every supported attack key back to the canonical Space hold after
    the R20 event finishes so the ordinary frame cadence keeps firing until the
    physical key is released. This does not wrap or replace firePlayer.
  */
  addEventListener("keydown",event=>{
    if(!ATTACK_KEYS.has(event.code)||editableTarget(event.target)||!activeRun()||spyActive())return;
    held.add(event.code);diagnostics.keydowns++;scheduleSync();
  },true);

  addEventListener("keyup",event=>{
    if(!ATTACK_KEYS.has(event.code))return;
    held.delete(event.code);diagnostics.keyups++;scheduleSync();
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
