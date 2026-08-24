/* The Lost Sizzler V10.41 — landing-page hierarchy and major notification priority. */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V141_LANDING_NOTIFICATION_POLISH__)return;
  window.__CCG_LOST_SIZZLER_V141_LANDING_NOTIFICATION_POLISH__=true;

  const RELEASE="V10.41";
  const state={installed:false,toastWrapped:false,majorTimer:0,majorUntil:0,pendingImportant:null,observer:null,modeObserver:null};

  function ensureStyle(){
    if(document.getElementById("ccg-v141-landing-notification-style"))return;
    const style=document.createElement("style");
    style.id="ccg-v141-landing-notification-style";
    style.textContent=`
      /* Landing page: make PLAY the visual destination, and quieten supporting information. */
      body[data-run-active="false"] #menu>.panel{padding-top:20px!important;padding-bottom:22px!important}
      body[data-run-active="false"] #menu .pixel-title-lockup{max-width:980px;margin:0 auto 10px!important;padding:12px 18px 8px!important}
      body[data-run-active="false"] #menu .pixel-title-lockup .pixel-title-ccg{opacity:.68!important;transform:scale(.92)}
      body[data-run-active="false"] #menu .pixel-title-lockup .pixel-title-quest{opacity:.88!important;letter-spacing:.13em!important}
      body[data-run-active="false"] #menu .pixel-title-lockup h2{margin:4px 0 3px!important;line-height:.94!important;filter:drop-shadow(0 8px 18px rgba(0,0,0,.48))}
      body[data-run-active="false"] #menu .pixel-title-lockup h2 span,
      body[data-run-active="false"] #menu .pixel-title-lockup h2 strong{text-shadow:0 0 18px rgba(108,236,255,.13)!important}
      body[data-run-active="false"] #menu .pixel-title-lockup em{margin-top:9px!important;opacity:.86!important;letter-spacing:.18em!important}
      body[data-run-active="false"] #menu .menu-blurb{max-width:900px;margin:5px auto 9px!important;color:#c8becf!important;font-size:9.5px!important;line-height:1.48!important}
      body[data-run-active="false"] #menu .beta-stage-disclaimer{max-width:960px;margin:7px auto!important;padding:7px 12px!important;border:1px solid rgba(255,216,90,.28)!important;background:rgba(255,216,90,.025)!important;box-shadow:none!important;color:#bdb0c4!important;font-size:8px!important;letter-spacing:.055em!important}
      body[data-run-active="false"] #menu .desktop-play-recommendation{max-width:1000px;margin:6px auto 7px!important;padding:7px 11px!important;border-color:rgba(108,236,255,.20)!important;background:rgba(108,236,255,.025)!important;box-shadow:none!important;font-size:8px!important;color:#a99faf!important}
      body[data-run-active="false"] #menu .desktop-play-recommendation strong{color:#6cecff!important}
      body[data-run-active="false"] #menu .lost-sizzler-discord-cta{max-width:760px!important;margin:5px auto 10px!important;padding:7px 11px!important;border-color:rgba(108,236,255,.25)!important;background:rgba(108,236,255,.02)!important;box-shadow:none!important;opacity:.92}
      body[data-run-active="false"] #menu .lost-sizzler-discord-cta b{font-size:9px!important}
      body[data-run-active="false"] #menu .lost-sizzler-discord-cta span{font-size:8px!important;color:#9f95aa!important}

      body[data-run-active="false"] #menu .feature-strip{max-width:1120px;margin:10px auto 13px!important;gap:7px!important}
      body[data-run-active="false"] #menu .feature-strip>span{position:relative;min-height:64px!important;padding:11px 12px 10px 47px!important;border-color:rgba(185,120,255,.20)!important;background:rgba(10,7,15,.55)!important;box-shadow:none!important;text-align:left!important;color:#9c92a5!important}
      body[data-run-active="false"] #menu .feature-strip>span:before{position:absolute;left:13px;top:50%;transform:translateY(-50%);display:grid;place-items:center;width:24px;height:24px;border:1px solid rgba(108,236,255,.26);background:#09060e;color:#6cecff;font:900 15px/1 "Courier New",monospace;box-shadow:inset 0 0 12px rgba(108,236,255,.04)}
      body[data-run-active="false"] #menu .feature-strip>span:nth-child(1):before{content:"▦"}
      body[data-run-active="false"] #menu .feature-strip>span:nth-child(2):before{content:"◆";color:#ffd85a;border-color:rgba(255,216,90,.28)}
      body[data-run-active="false"] #menu .feature-strip>span:nth-child(3):before{content:"◈";color:#b978ff;border-color:rgba(185,120,255,.30)}
      body[data-run-active="false"] #menu .feature-strip>span b{display:block!important;margin-bottom:4px!important;font-size:9px!important;color:#e6dff0!important;letter-spacing:.08em!important}

      body[data-run-active="false"] #menu .menu-config{max-width:760px;margin:9px auto 10px!important;padding:9px 12px!important;border-top:1px solid rgba(185,120,255,.13);border-bottom:1px solid rgba(185,120,255,.13);background:rgba(5,3,9,.28)!important;gap:20px!important}
      body[data-run-active="false"] #menu .menu-config .field>span{font-size:7.5px!important;color:#b9a75d!important;letter-spacing:.08em!important}
      body[data-run-active="false"] #menu .menu-config input,
      body[data-run-active="false"] #menu .menu-config select{min-height:42px!important;border-color:rgba(185,120,255,.34)!important;background:#07050b!important}
      body[data-run-active="false"] #menu .mode-select-label{margin:13px 0 8px!important;color:#ff72ef!important;font-size:10px!important;letter-spacing:.14em!important}

      body[data-run-active="false"] #menu .game-mode-buttons{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:7px!important;align-items:stretch!important;margin-top:0!important}
      body[data-run-active="false"] #menu .ccg-mode-tier-label{grid-column:1/-1;padding:7px 4px 2px;border-top:1px solid rgba(185,120,255,.13);color:#746b7d;font:800 7px/1.2 "Courier New",monospace;letter-spacing:.16em;text-align:left;text-transform:uppercase}
      body[data-run-active="false"] #menu .ccg-mode-tier-label[data-tier="main"]{order:10;border-top:0;color:#bcae72}
      body[data-run-active="false"] #menu .ccg-mode-tier-label[data-tier="special"]{order:20;margin-top:2px}
      body[data-run-active="false"] #menu .ccg-mode-tier-label[data-tier="other"]{order:30;margin-top:2px}
      body[data-run-active="false"] #menu #solo-btn{order:11;grid-column:span 2!important}
      body[data-run-active="false"] #menu #create-btn{order:12;grid-column:span 2!important}
      body[data-run-active="false"] #menu #continue-save-btn{order:13;grid-column:1/-1!important}
      body[data-run-active="false"] #menu #horde-solo-btn{order:21}
      body[data-run-active="false"] #menu #horde-mode-btn{order:22}
      body[data-run-active="false"] #menu #saboteurs-mode-btn{order:23}
      body[data-run-active="false"] #menu #split-btn{order:24}
      body[data-run-active="false"] #menu #tutorial-zone-btn{order:31;grid-column:span 2!important}
      body[data-run-active="false"] #menu #daily-btn{order:32;grid-column:span 2!important}
      body[data-run-active="false"] #menu #solo-btn,
      body[data-run-active="false"] #menu #create-btn{min-height:54px!important;border-width:2px!important;font-size:10.5px!important;box-shadow:0 8px 18px rgba(0,0,0,.20),inset 0 1px rgba(255,255,255,.08)!important}
      body[data-run-active="false"] #menu #horde-solo-btn,
      body[data-run-active="false"] #menu #horde-mode-btn,
      body[data-run-active="false"] #menu #saboteurs-mode-btn,
      body[data-run-active="false"] #menu #split-btn{min-height:46px!important;font-size:9px!important;box-shadow:none!important;filter:saturate(.88)}
      body[data-run-active="false"] #menu #tutorial-zone-btn,
      body[data-run-active="false"] #menu #daily-btn{min-height:38px!important;font-size:8.5px!important;opacity:.88;box-shadow:none!important}

      body[data-run-active="false"] #menu .online-howto{margin:12px 0 8px!important;padding:9px 12px!important;border-color:rgba(108,236,255,.18)!important;background:rgba(4,11,14,.25)!important;box-shadow:none!important}
      body[data-run-active="false"] #menu .online-howto h3{font-size:8.5px!important;color:#6cecff!important;opacity:.86}
      body[data-run-active="false"] #menu .online-howto p{font-size:7.5px!important;color:#958b9f!important}
      body[data-run-active="false"] #menu .join-row{max-width:760px;margin:8px auto!important}

      body[data-run-active="false"] #menu #horde-leaderboard{margin:11px 0!important}
      body[data-run-active="false"] #menu #horde-leaderboard.is-empty{padding:13px 16px 14px!important}
      body[data-run-active="false"] #menu #horde-leaderboard.is-empty .horde-board-head{margin-bottom:9px!important;padding-bottom:9px!important}
      body[data-run-active="false"] #menu #horde-leaderboard.is-empty .horde-board-tabs{margin-bottom:7px!important}
      body[data-run-active="false"] #menu #horde-leaderboard.is-empty .horde-empty{min-height:58px!important;padding:9px 12px!important;gap:10px!important}
      body[data-run-active="false"] #menu #horde-leaderboard.is-empty .horde-empty-mark{width:34px!important;height:34px!important;flex-basis:34px!important;font-size:14px!important}
      body[data-run-active="false"] #menu #weekly-vault{border-color:rgba(108,236,255,.14)!important;box-shadow:none!important}
      body[data-run-active="false"] #menu .secondary-menu{gap:6px!important;padding:8px!important;background:rgba(4,3,8,.28)!important;border-color:rgba(185,120,255,.13)!important}
      body[data-run-active="false"] #menu .secondary-menu button,
      body[data-run-active="false"] #menu .secondary-menu a{min-height:34px!important;padding:7px 10px!important;font-size:7.5px!important;box-shadow:none!important;filter:saturate(.78)}
      body[data-run-active="false"] #menu .developer-changelog,
      body[data-run-active="false"] #menu [class*="developer-changelog"]{box-shadow:none!important}

      /* Major gameplay notifications own the top of the screen. */
      #ccg-major-notification{position:absolute;top:12px;left:50%;z-index:118;display:grid;grid-template-columns:48px minmax(0,1fr);align-items:center;gap:12px;width:min(760px,88%);min-height:74px;padding:11px 15px;transform:translate(-50%,-18px) scale(.985);border:2px solid #ffd85a;background:linear-gradient(100deg,rgba(27,14,8,.98),rgba(10,6,15,.985));box-shadow:0 14px 46px rgba(0,0,0,.72),0 0 25px rgba(255,216,90,.14);opacity:0;pointer-events:none;transition:opacity .13s ease,transform .13s ease}
      #ccg-major-notification[data-visible="true"]{opacity:1;transform:translate(-50%,0) scale(1)}
      #ccg-major-notification .major-icon{display:grid;place-items:center;width:44px;height:44px;border:1px solid currentColor;background:#07050b;color:#ffd85a;font:900 22px/1 "Courier New",monospace;box-shadow:inset 0 0 18px rgba(255,216,90,.08)}
      #ccg-major-notification .major-copy{min-width:0}.major-copy b{display:block;margin:0 0 4px;color:#ffd85a;font:900 13px/1.15 "Courier New",monospace;letter-spacing:.07em;text-transform:uppercase}.major-copy span{display:block;color:#f2eaf5;font:700 9px/1.45 "Courier New",monospace}
      #ccg-major-notification[data-tone="red"]{border-color:#ff6868;box-shadow:0 14px 46px rgba(0,0,0,.72),0 0 28px rgba(255,104,104,.18)}#ccg-major-notification[data-tone="red"] .major-icon,#ccg-major-notification[data-tone="red"] b{color:#ff6868}
      #ccg-major-notification[data-tone="cyan"]{border-color:#6cecff}#ccg-major-notification[data-tone="cyan"] .major-icon,#ccg-major-notification[data-tone="cyan"] b{color:#6cecff}
      #ccg-major-notification[data-tone="green"]{border-color:#72ff9b}#ccg-major-notification[data-tone="green"] .major-icon,#ccg-major-notification[data-tone="green"] b{color:#72ff9b}
      body[data-ccg-major-notification="true"] #pickup-toast{visibility:hidden!important;opacity:0!important}

      @media(max-width:760px){body[data-run-active="false"] #menu .game-mode-buttons{grid-template-columns:1fr 1fr!important}body[data-run-active="false"] #menu #solo-btn,body[data-run-active="false"] #menu #create-btn{grid-column:span 1!important}body[data-run-active="false"] #menu #horde-solo-btn,body[data-run-active="false"] #menu #horde-mode-btn,body[data-run-active="false"] #menu #saboteurs-mode-btn,body[data-run-active="false"] #menu #split-btn{grid-column:span 1!important}body[data-run-active="false"] #menu .feature-strip{grid-template-columns:1fr!important}#ccg-major-notification{grid-template-columns:38px minmax(0,1fr);gap:8px;width:92%;min-height:62px;padding:9px 10px}#ccg-major-notification .major-icon{width:34px;height:34px;font-size:17px}.major-copy b{font-size:10px!important}.major-copy span{font-size:7.5px!important}}
    `;
    document.head.appendChild(style);
  }

  function syncVersion(){
    const subtitle=document.querySelector(".brand p");
    if(subtitle&&subtitle.textContent!==`THE LOST SIZZLER — ${RELEASE}`)subtitle.textContent=`THE LOST SIZZLER — ${RELEASE}`;
    const badge=document.querySelector(".build-badge");
    if(badge&&!/UPDATE AVAILABLE/i.test(badge.textContent||"")&&badge.textContent!==`BUILD ${RELEASE}`)badge.textContent=`BUILD ${RELEASE}`;
  }

  function ensureModeLabels(){
    const grid=document.querySelector("#menu .game-mode-buttons");if(!grid)return false;
    const defs=[
      ["main","MAIN ADVENTURES"],["special","SPECIAL MODES"],["other","TRAINING & WEEKLY CHALLENGE"]
    ];
    for(const [tier,text] of defs){
      let label=grid.querySelector(`.ccg-mode-tier-label[data-tier="${tier}"]`);
      if(!label){label=document.createElement("div");label.className="ccg-mode-tier-label";label.dataset.tier=tier;label.textContent=text;label.setAttribute("aria-hidden","true");grid.appendChild(label)}
    }
    return true;
  }

  function ensureMajorPanel(){
    let panel=document.getElementById("ccg-major-notification");if(panel)return panel;
    panel=document.createElement("div");panel.id="ccg-major-notification";panel.dataset.visible="false";panel.dataset.tone="gold";panel.setAttribute("role","status");panel.setAttribute("aria-live","assertive");panel.innerHTML=`<div class="major-icon" aria-hidden="true">!</div><div class="major-copy"><b>IMPORTANT UPDATE</b><span></span></div>`;
    (document.querySelector(".game-area")||document.querySelector(".ccg-game")||document.body).appendChild(panel);return panel;
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
      const priority=majorPriority(title),now=performance.now();
      if(priority>=100){
        // Major events bypass the ordinary pickup queue and immediately own the top notification area.
        return showMajor(title,text,tone,duration||8000);
      }
      if(state.majorUntil>now){
        // Do not let ammo, coins, health or other routine pickups cover a major event.
        // Keep only the latest genuinely useful secondary message for after the alert.
        if(priority>=70)state.pendingImportant=[title,text,tone,duration];
        return false;
      }
      return original.apply(this,arguments);
    };
    wrapped.__ccgV141Priority=true;wrapped.__ccgV141Original=original;window.showToast=wrapped;state.toastWrapped=true;return true;
  }

  function install(){
    ensureStyle();syncVersion();ensureModeLabels();ensureMajorPanel();wrapToast();
    if(!state.observer){
      const brand=document.querySelector(".brand");if(brand){state.observer=new MutationObserver(syncVersion);state.observer.observe(brand,{subtree:true,childList:true,characterData:true})}
    }
    if(!state.modeObserver){
      const grid=document.querySelector("#menu .game-mode-buttons");if(grid){state.modeObserver=new MutationObserver(()=>ensureModeLabels());state.modeObserver.observe(grid,{childList:true})}
    }
    state.installed=true;document.body.dataset.v141LandingNotificationPolish="true";return true;
  }

  const timer=setInterval(()=>{install();if(state.toastWrapped&&document.querySelector("#menu .game-mode-buttons")){clearInterval(timer)}},100);
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",install,{once:true});else install();
  window.addEventListener("pagehide",()=>{clearInterval(timer);clearTimeout(state.majorTimer);state.observer?.disconnect?.();state.modeObserver?.disconnect?.()},{once:true});
  window.CCGLostSizzlerV141LandingNotificationPolish={showMajor,majorPriority,get state(){return state}};
})();