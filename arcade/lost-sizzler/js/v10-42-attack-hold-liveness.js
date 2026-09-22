/* C64 Dungeon Carnage V10.42 — sustained attack-key liveness. */
(()=>{
  "use strict";
  if(window.CCGLostSizzlerV142AttackHoldLiveness)return;

  const ATTACK_KEYS=new Set(["Space","Numpad0"]); // KeyF is reserved exclusively for fullscreen.
  const held=new Set();
  const diagnostics={keydowns:0,keyups:0,normalisedHolds:0,clears:0,pressVerifications:0,pressRecoveries:0,pressRecoveryFailures:0};

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

  function attackSnapshot(){
    let player=null;try{player=p1||null}catch(_){}
    let shots=0;
    try{shots=(bullets||[]).filter(projectile=>projectile?.ttl>0&&(!player||projectile.owner===player.id)).length}catch(_){}
    return{mana:Math.max(0,Number(player?.mana||0)),shots};
  }

  const shotObserved=(before,after)=>after.mana<before.mana||after.shots>before.shots;

  function verifyFreshPress(code,before){
    const MAX_ATTEMPTS=5;
    const attempt=number=>{
      setTimeout(()=>{
        // A quick tap is still a valid attack intent. Keyup must not cancel
        // verification of the press that already happened. Retry briefly so a
        // normal hit-stun/cadence boundary cannot swallow the whole press.
        if(!activeRun()||currentMode()!=="playing"||spyActive())return;
        diagnostics.pressVerifications++;
        const after=attackSnapshot();
        if(shotObserved(before,after))return;
        const r20=window.CCGLostSizzlerV142R20LiveRegressionStability;
        if(typeof r20?.attackNow!=="function"){
          if(number<MAX_ATTEMPTS){attempt(number+1);return}
          diagnostics.pressRecoveryFailures++;return
        }
        const repairBefore=attackSnapshot();
        try{r20.attackNow(code)}catch(_){}
        const repaired=shotObserved(repairBefore,attackSnapshot());
        if(repaired){diagnostics.pressRecoveries++;return}
        scheduleSync();
        if(number<MAX_ATTEMPTS){attempt(number+1);return}
        diagnostics.pressRecoveryFailures++;
      },number===1?120:180);
    };
    attempt(1);
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
    const fresh=!event.repeat&&!held.has(event.code),before=fresh?attackSnapshot():null;
    held.add(event.code);diagnostics.keydowns++;scheduleSync();
    if(fresh)verifyFreshPress(event.code,before);
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
