/* The Lost Sizzler V10.18 — input, inventory-scroll, reinforced-door and canonical-path fixes. */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_INPUT_UI_BUGFIXES_V118__)return;
  window.__CCG_LOST_SIZZLER_INPUT_UI_BUGFIXES_V118__=true;

  const REINFORCED_WARNING_COOLDOWN_MS=1800;
  const CANONICAL_PATH="/arcade/lost-sizzler/";
  let lastReinforcedWarningAt=-Infinity;

  function isReinforcedDoor(door){
    return Boolean(door&&(door.sigilGate||door.reinforced||door.reinforcedDoor||door.type==="sigil"));
  }

  function installCanonicalPath(){
    const canonical=document.querySelector('link[rel="canonical"]');
    if(canonical)canonical.href=new URL(CANONICAL_PATH,location.origin).href;
    const encodedReturn=encodeURIComponent(`${CANONICAL_PATH}#weekly-vault`);
    document.querySelectorAll('#weekly-auth-actions a[href]').forEach(link=>{
      try{
        const url=new URL(link.getAttribute("href"),location.origin);
        if(url.pathname==="/auth/register.html"||url.pathname==="/auth/login.html"){
          url.searchParams.set("returnTo",`${CANONICAL_PATH}#weekly-vault`);
          link.setAttribute("href",`${url.pathname}?returnTo=${encodedReturn}`);
        }
      }catch(_){}
    });
  }

  function installCtrlCompatibility(){
    addEventListener("keydown",event=>{
      if(event.code!=="ControlLeft"&&event.code!=="ControlRight"&&event.key!=="Control")return;
      if(mode!=="playing"||!p2)return;
      event.preventDefault();
      // The original engine already handles Right Ctrl. Left Ctrl was never
      // mapped, which made many keyboards appear to have a broken Ctrl dash.
      if(event.code==="ControlLeft"&&!event.repeat){
        try{dashPlayer(p2,d2()||p2.dir)}catch(error){console.warn("[Lost Sizzler] Left Ctrl dash failed",error)}
      }
    },{capture:true,passive:false});
  }

  function installInventoryWheelFix(){
    const overlay=document.getElementById("inventory-panel"),panel=overlay?.querySelector(":scope > .inventory-panel");
    if(!overlay||!panel)return;
    overlay.addEventListener("wheel",event=>{
      if(overlay.classList.contains("hidden")||!panel.contains(event.target))return;
      event.preventDefault();
      event.stopPropagation();
      const delta=Number(event.deltaY||0);
      if(delta)panel.scrollTop=Math.max(0,Math.min(panel.scrollHeight-panel.clientHeight,panel.scrollTop+delta));
    },{passive:false,capture:true});
  }

  function installReinforcedDoorFix(){
    if(typeof tryDoor!=="function")return;
    const originalTryDoor=tryDoor;
    tryDoor=function tryDoorV118StableReinforced(player,x,y){
      let door=null;
      try{door=W?.doorAt?.(host,x,y)||null}catch(_){}
      if(door?.locked&&isReinforcedDoor(door)){
        const now=performance.now();
        if(now-lastReinforcedWarningAt>=REINFORCED_WARNING_COOLDOWN_MS){
          lastReinforcedWarningAt=now;
          try{S?.sfx?.("locked")}catch(_){}
          const lockedByFight=Boolean(host?.sigilLockdown);
          try{showToast(
            lockedByFight?"REINFORCED DOOR SEALED":"REINFORCED DOOR LOCKED",
            lockedByFight
              ?"The Sigil chamber is still active. Defeat every defender before the reinforced doors release."
              :"This reinforced door is controlled by the current dungeon objective and cannot be forced open.",
            "red",
            5200
          )}catch(_){}
        }
        return false;
      }
      return originalTryDoor.apply(this,arguments);
    };
  }

  function mount(){
    installCanonicalPath();
    installCtrlCompatibility();
    installInventoryWheelFix();
    installReinforcedDoorFix();
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mount,{once:true});
  else mount();

  window.CCGLostSizzlerInputUiBugfixes={
    isReinforcedDoor,
    reinforcedWarningCooldownMs:REINFORCED_WARNING_COOLDOWN_MS,
    canonicalPath:CANONICAL_PATH
  };
})();
