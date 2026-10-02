/* The Lost Sizzler V10.41 — landing-page hierarchy and major notification priority. */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V141_LANDING_NOTIFICATION_POLISH__)return;
  window.__CCG_LOST_SIZZLER_V141_LANDING_NOTIFICATION_POLISH__=true;

  const RELEASE="V10.41";
  const state={installed:false,toastWrapped:false,majorTimer:0,majorUntil:0,pendingImportant:null,observer:null};

  function newerReleaseOwnsIdentity(){
    return Boolean(window.CCGLostSizzlerV142Bootstrap);
  }

  function retireVersionObserver(){
    if(!newerReleaseOwnsIdentity())return false;
    state.observer?.disconnect?.();state.observer=null;
    return true;
  }

  function ensureStyle(){
    if(document.getElementById("ccg-v141-landing-notification-style"))return;
    const style=document.createElement("style");
    style.id="ccg-v141-landing-notification-style";
    style.textContent=`
      /* R93: this retained V10.41 module owns major gameplay notifications only.
       * All menu layout/colour rules were retired; blocking release CSS owns the menu. */
      #ccg-major-notification{position:static;z-index:2;display:none;grid-template-columns:36px minmax(0,1fr);align-items:center;gap:8px;width:100%;min-height:66px;max-height:112px;padding:8px 9px;transform:none;border:1px solid #ffd85a;border-left:3px solid #ffd85a;background:linear-gradient(100deg,rgba(35,20,18,.98),rgba(17,10,20,.97));box-shadow:inset 0 0 18px rgba(255,216,90,.07);opacity:0;overflow:hidden;pointer-events:none}
      #ccg-major-notification[data-visible="true"]{display:grid;opacity:1;transform:none}
      #ccg-major-notification .major-icon{display:grid;place-items:center;width:32px;height:32px;border:1px solid currentColor;background:rgba(7,5,11,.7);color:#ffd85a;font:900 17px/1 "Courier New",monospace;box-shadow:inset 0 0 12px rgba(255,216,90,.06)}
      #ccg-major-notification .major-copy{min-width:0;overflow:hidden}.major-copy b{display:block;margin:0 0 4px;color:#ffd85a;font:900 12px/1.15 "Courier New",monospace;letter-spacing:.055em;text-transform:uppercase;overflow-wrap:anywhere}.major-copy span{display:block;max-height:72px;padding-right:2px;color:#f2eaf5;font:700 9px/1.4 "Courier New",monospace;white-space:normal;overflow:auto;overflow-wrap:anywhere}
      #ccg-major-notification[data-tone="red"]{border-color:#ff6868;box-shadow:inset 0 0 20px rgba(255,104,104,.08)}#ccg-major-notification[data-tone="red"] .major-icon,#ccg-major-notification[data-tone="red"] b{color:#ff6868}
      #ccg-major-notification[data-tone="cyan"]{border-color:#6cecff}#ccg-major-notification[data-tone="cyan"] .major-icon,#ccg-major-notification[data-tone="cyan"] b{color:#6cecff}
      #ccg-major-notification[data-tone="green"]{border-color:#72ff9b}#ccg-major-notification[data-tone="green"] .major-icon,#ccg-major-notification[data-tone="green"] b{color:#72ff9b}
      body[data-ccg-major-notification="true"] #pickup-toast{display:none!important;visibility:hidden!important;opacity:0!important}
      @media(max-width:760px){#ccg-major-notification{grid-template-columns:30px minmax(0,1fr);gap:7px;width:100%;min-height:68px;max-height:86px;padding:7px 9px}#ccg-major-notification .major-icon{width:27px;height:27px;font-size:14px}.major-copy b{font-size:9px!important}.major-copy span{max-height:50px;font-size:7px!important}}
    `;
    document.head.appendChild(style);
  }

  function syncVersion(){
    if(retireVersionObserver())return false;
    if(window.CCGLostSizzlerVersion?.state?.outdated===true)return false;
    const subtitle=document.querySelector(".brand p");
    if(subtitle&&subtitle.textContent!==`THE LOST SIZZLER — ${RELEASE}`)subtitle.textContent=`THE LOST SIZZLER — ${RELEASE}`;
    const badge=document.querySelector(".build-badge");
    if(badge&&!/UPDATE AVAILABLE/i.test(badge.textContent||"")&&badge.textContent!==`BUILD ${RELEASE}`)badge.textContent=`BUILD ${RELEASE}`;
    return true;
  }

  function ensureMajorPanel(){
    let panel=document.getElementById("ccg-major-notification");if(panel)return panel;
    panel=document.createElement("div");panel.id="ccg-major-notification";panel.dataset.visible="false";panel.dataset.tone="gold";panel.setAttribute("role","status");panel.setAttribute("aria-live","assertive");panel.innerHTML=`<div class="major-icon" aria-hidden="true">!</div><div class="major-copy"><b>IMPORTANT UPDATE</b><span></span></div>`;
    const rail=document.querySelector(".game-message-rail"),pickup=document.getElementById("pickup-toast");
    if(rail){if(pickup?.parentNode===rail)rail.insertBefore(panel,pickup);else rail.appendChild(panel)}
    else (document.querySelector(".game-area")||document.querySelector(".ccg-game")||document.body).appendChild(panel);
    return panel;
  }

  function majorPriority(title){
    const text=String(title||"").toUpperCase();
    if(/NEW DUNGEON BOUNTY|DUNGEON BOUNTY|BOUNTY START/.test(text))return 110;
    if(/GAME OVER|RUN OVER|WEEKLY.*OVER|FINAL XP WARNING|PERMA|DEATH STALKER|COUNT LOADULA|HORDE WARDEN|WARDEN|BOSS|SIGIL LOCKDOWN|ARENA LOCKDOWN|TIMED CHAMBER|FLOOR MUTATION|NEW FLOOR MUTATION|BANISHMENT READY/.test(text))return 100;
    if(/OBJECTIVE|MAIN KEY|EXIT SIGIL|BRONZE KEY|GENERATOR|SCOUT FOUND|RESCUE|LEVEL UP|GILDED ELF|GOLDEN ROOM|MIMIC|TRAP WARNING|GAMBLER|SECRET.*REVEALED|SECRET DOOR/.test(text))return 70;
    return 10;
  }

  function iconFor(title,tone){
    const text=String(title||"").toUpperCase();
    if(/BOUNTY/.test(text))return"★";
    if(/KEY|SIGIL/.test(text))return"◆";
    if(/DEATH|GAME OVER|STALKER|LOADULA|TRAP|BOSS|WARDEN/.test(text))return"!";
    if(/OBJECTIVE|GENERATOR|RESCUE/.test(text))return"◎";
    if(/LEVEL/.test(text))return"↑";
    return tone==="red"?"!":"✦";
  }

  function closeMajor(){
    const panel=document.getElementById("ccg-major-notification");if(panel)panel.dataset.visible="false";
    document.body.dataset.ccgMajorNotification="false";delete document.body.dataset.ccgMajorNotification;
    state.majorUntil=0;clearTimeout(state.majorTimer);state.majorTimer=0;
    const pending=state.pendingImportant;state.pendingImportant=null;
    if(pending&&typeof state.originalToast==="function")setTimeout(()=>{try{state.originalToast(...pending)}catch(_){}},120);
  }

  function resetForFloor(){
    clearTimeout(state.majorTimer);state.majorTimer=0;state.majorUntil=0;state.pendingImportant=null;
    const panel=ensureMajorPanel();if(panel)panel.dataset.visible="false";
    document.body.removeAttribute("data-ccg-major-notification");
    return true
  }

  function showMajor(title,text,tone="gold",duration=7600){
    const panel=ensureMajorPanel(),ms=Math.max(5200,Math.min(11500,Number(duration)||7600));
    panel.dataset.tone=["red","cyan","green","gold"].includes(String(tone))?String(tone):"gold";
    panel.querySelector(".major-icon").textContent=iconFor(title,tone);
    panel.querySelector(".major-copy b").textContent=String(title||"IMPORTANT DUNGEON UPDATE");
    panel.querySelector(".major-copy span").textContent=String(text||"");
    panel.dataset.visible="true";document.body.dataset.ccgMajorNotification="true";state.majorUntil=performance.now()+ms;
    clearTimeout(state.majorTimer);state.majorTimer=setTimeout(closeMajor,ms);
    return true;
  }

  function wrapToast(){
    if(typeof window.showToast!=="function")return false;
    if(window.showToast.__ccgV141Priority===true){state.toastWrapped=true;return true}
    const original=window.showToast;state.originalToast=original;
    const wrapped=function showToastV141Priority(title,text,tone,duration){
      const priority=majorPriority(title),now=performance.now(),retain=Boolean(arguments[4]?.retain);
      if(priority>=100){
        // Major events bypass the ordinary pickup queue and immediately own the top notification area.
        return showMajor(title,text,tone,duration||8000);
      }
      if(state.majorUntil>now){
        // Retained confirmations may update the hidden pickup state while the major banner stays visually dominant.
        // They are replayed after the major alert; routine low-priority pickups remain suppressed.
        if(retain){state.pendingImportant=Array.from(arguments);return original.apply(this,arguments)}
        if(priority>=70)state.pendingImportant=Array.from(arguments);
        return false;
      }
      return original.apply(this,arguments);
    };
    wrapped.__ccgV141Priority=true;wrapped.__ccgV141Original=original;window.showToast=wrapped;state.toastWrapped=true;return true;
  }

  function install(){
    /* R93: current blocking CSS owns menu presentation; this legacy module now owns notifications/version compatibility only. */
    ensureStyle();syncVersion();ensureMajorPanel();wrapToast();
    if(!state.observer&&!newerReleaseOwnsIdentity()){
      const brand=document.querySelector(".brand");if(brand){state.observer=new MutationObserver(syncVersion);state.observer.observe(brand,{subtree:true,childList:true,characterData:true})}
    }
    state.installed=true;document.body.dataset.v141LandingNotificationPolish="true";return true;
  }

  const timer=setInterval(()=>{install();if(state.toastWrapped&&document.querySelector("#menu .game-mode-buttons")){clearInterval(timer)}},100);
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",install,{once:true});else install();
  window.addEventListener("ccg:v142-ready",retireVersionObserver,{once:true});
  window.addEventListener("ccg:floor-start",resetForFloor);
  window.addEventListener("pagehide",()=>{clearInterval(timer);clearTimeout(state.majorTimer);state.observer?.disconnect?.()},{once:true});
  window.CCGLostSizzlerV141LandingNotificationPolish={showMajor,majorPriority,resetForFloor,get state(){return state}};
})();