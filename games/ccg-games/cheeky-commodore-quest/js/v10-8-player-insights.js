/* The Lost Sizzler — non-intrusive desktop notices, play telemetry and five-minute rating prompt. */
(function(){
  "use strict";
  if(window.__CCG_LOST_SIZZLER_PLAYER_INSIGHTS__)return;
  window.__CCG_LOST_SIZZLER_PLAYER_INSIGHTS__=true;

  const FUNCTION_NAME="lost-sizzler-feedback";
  const BUILD="V10.6";
  const START_ACTIONS=new Map([
    ["solo-btn","solo"],
    ["continue-save-btn","resume_saved"],
    ["daily-btn","weekly"],
    ["split-btn","split_screen"],
    ["create-btn","create_online"],
    ["join-btn","join_online"],
    ["lobby-start-btn","host_online"]
  ]);
  const sessionToken=(()=>{
    try{
      const key="ccg-lost-sizzler-session-token";
      let value=sessionStorage.getItem(key);
      if(!value){
        value=crypto.randomUUID?.()||`${Date.now().toString(36)}-${Math.random().toString(36).slice(2,14)}`;
        sessionStorage.setItem(key,value);
      }
      return value;
    }catch(_){
      return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,14)}`;
    }
  })();

  let bypassMobileTarget=null;
  let activePlayedMs=0;
  let lastPlayTick=performance.now();
  let ratingShown=false;
  let pausedByRating=false;
  let ratingTimer=null;
  let runObserver=null;

  function safe(value){return String(value??"").trim();}
  function playerNameValue(){
    try{
      if(typeof playerName==="function")return safe(playerName()).slice(0,18)||"CCG Player";
    }catch(_){}
    return safe(document.getElementById("player-name")?.value).slice(0,18)||"CCG Player";
  }
  function deviceType(){
    const ua=navigator.userAgent||"";
    const touch=navigator.maxTouchPoints>0||matchMedia("(pointer: coarse)").matches;
    if(!touch&&innerWidth>900)return"desktop";
    if(/iPad|Tablet/i.test(ua)||(/Android/i.test(ua)&&!/Mobile/i.test(ua))||(touch&&Math.min(screen.width||innerWidth,screen.height||innerHeight)>=700))return"tablet";
    if(touch||/Mobi|Android|iPhone|iPod/i.test(ua))return"mobile";
    return"desktop";
  }
  function isMobileLike(){return deviceType()!=="desktop";}
  function isDesktopNotice(){return deviceType()==="desktop"&&innerWidth>=901&&matchMedia("(pointer: fine)").matches;}
  function currentRunActive(){
    const active=document.body.dataset.runActive==="true";
    try{return active&&typeof mode!=="undefined"&&mode==="playing";}catch(_){return active;}
  }
  async function sendTelemetry(eventType,extra={}){
    try{
      const client=await window.ccgSupabase?.getClient?.();
      if(!client)return;
      const body={
        action:"telemetry",
        event_type:eventType,
        player_name:playerNameValue(),
        play_mode:safe(extra.play_mode).slice(0,40)||null,
        device_type:deviceType(),
        rating:Number.isInteger(extra.rating)?extra.rating:null,
        session_token:sessionToken,
        build:BUILD,
        page_url:location.href
      };
      const {error}=await client.functions.invoke(FUNCTION_NAME,{body});
      if(error)console.warn("[Lost Sizzler] telemetry could not be recorded",error);
    }catch(error){
      console.warn("[Lost Sizzler] telemetry unavailable",error);
    }
  }

  function messageRail(){return document.querySelector(".game-message-rail");}

  /* There is deliberately one notification channel. Earlier revisions mirrored
   * long/important toasts into a second DOM stack, which could produce several
   * large cards at once. showToast already replaces the previous message, so it
   * is the single source of truth and the layout layer keeps it above the canvas. */
  function retireLegacyNoticeStack(){document.getElementById("ccg-important-notices")?.remove();}
  function desktopNotice(title,text,tone="cyan",duration=7500){
    if(!isDesktopNotice()||typeof showToast!=="function")return;
    retireLegacyNoticeStack();
    showToast(title,text,tone,duration);
  }

  function ensureMobileNotice(){
    let overlay=document.getElementById("ccg-mobile-pc-notice");
    if(overlay)return overlay;
    overlay=document.createElement("div");
    overlay.id="ccg-mobile-pc-notice";
    overlay.className="overlay hidden ccg-insight-overlay";
    overlay.innerHTML=`<div class="panel compact ccg-insight-card">
      <p class="ccg-insight-kicker">MOBILE PLAY NOTICE</p>
      <h2>OPTIMISED FOR PC DESKTOP PLAY</h2>
      <p>The Lost Sizzler can be played on mobile and tablet, but it is designed around a larger desktop display and keyboard controls. Touch controls are available, although some screens and encounters are easier on PC.</p>
      <p><strong>Click ACCEPT to continue on this device.</strong></p>
      <div class="menu-buttons"><button id="ccg-mobile-pc-accept" class="primary" type="button">ACCEPT</button><button id="ccg-mobile-pc-cancel" type="button">CANCEL</button></div>
    </div>`;
    document.querySelector(".game-area")?.appendChild(overlay);
    overlay.querySelector("#ccg-mobile-pc-cancel")?.addEventListener("click",()=>{overlay.classList.add("hidden");bypassMobileTarget=null;});
    overlay.querySelector("#ccg-mobile-pc-accept")?.addEventListener("click",()=>{
      const target=bypassMobileTarget;
      const playMode=target?START_ACTIONS.get(target.id)||"unknown":"unknown";
      overlay.classList.add("hidden");
      bypassMobileTarget=target;
      sendTelemetry("mobile_pc_notice_accept",{play_mode:playMode});
      if(target)setTimeout(()=>target.click(),0);
    });
    return overlay;
  }

  function onStartClick(event){
    const button=event.target?.closest?.("button");
    if(!button||!START_ACTIONS.has(button.id))return;
    const playMode=START_ACTIONS.get(button.id);
    if(isMobileLike()&&bypassMobileTarget!==button){
      event.preventDefault();
      event.stopImmediatePropagation();
      bypassMobileTarget=button;
      ensureMobileNotice()?.classList.remove("hidden");
      return;
    }
    if(bypassMobileTarget===button)bypassMobileTarget=null;
    sendTelemetry("start_click",{play_mode:playMode});
  }

  function openExistingFeedback(){
    const panel=document.getElementById("v104-feedback-panel");
    if(panel){panel.classList.remove("hidden");return;}
    document.getElementById("v104-feedback-btn")?.click();
  }

  function ensureRatingOverlay(){
    let overlay=document.getElementById("ccg-rating-panel");
    if(overlay)return overlay;
    const desktop=isDesktopNotice();
    overlay=document.createElement("div");
    overlay.id="ccg-rating-panel";
    overlay.className=desktop?"ccg-rating-rail hidden":"overlay hidden ccg-insight-overlay";
    overlay.innerHTML=`<div class="${desktop?"ccg-rating-rail-card":"panel compact ccg-insight-card ccg-rating-card"}">
      <p class="ccg-insight-kicker">FIVE MINUTES IN</p>
      <h2>RATE THE GAME</h2>
      <p>How are you finding <strong>The Lost Sizzler</strong> so far?</p>
      <div class="ccg-star-row" role="group" aria-label="Rate The Lost Sizzler out of five stars">
        ${[1,2,3,4,5].map(value=>`<button type="button" data-rating="${value}" aria-label="${value} star${value===1?"":"s"}">★</button>`).join("")}
      </div>
      <p id="ccg-rating-status" class="ccg-rating-status">Choose 1 to 5 stars.</p>
      <div class="menu-buttons"><button id="ccg-rating-feedback" type="button">REPORT BUG / GAME SUGGESTION</button><button id="ccg-rating-later" type="button">NOT NOW</button></div>
    </div>`;
    if(desktop){
      const rail=messageRail();
      if(!rail)return null;
      const toast=rail.querySelector("#pickup-toast");
      if(toast)rail.insertBefore(overlay,toast);else rail.appendChild(overlay);
    }else{
      document.querySelector(".game-area")?.appendChild(overlay);
    }
    const finish=()=>{
      overlay.classList.add("hidden");
      window.CCGLostSizzlerBrowserStability?.resize?.();
      if(pausedByRating){
        pausedByRating=false;
        try{if(typeof pause==="function"&&typeof mode!=="undefined"&&mode==="paused")pause(true);}catch(_){}
      }
    };
    overlay.querySelectorAll("[data-rating]").forEach(button=>button.addEventListener("click",()=>{
      const rating=Number(button.dataset.rating);
      overlay.querySelectorAll("[data-rating]").forEach(star=>star.classList.toggle("selected",Number(star.dataset.rating)<=rating));
      const status=overlay.querySelector("#ccg-rating-status");
      if(status)status.textContent=`Thank you — ${rating}/5 recorded.`;
      sendTelemetry("rating_submitted",{rating,play_mode:(typeof playMode!=="undefined"?playMode:"unknown")});
      setTimeout(finish,900);
    }));
    overlay.querySelector("#ccg-rating-feedback")?.addEventListener("click",()=>{finish();setTimeout(openExistingFeedback,60);});
    overlay.querySelector("#ccg-rating-later")?.addEventListener("click",()=>{
      sendTelemetry("rating_dismissed",{play_mode:(typeof playMode!=="undefined"?playMode:"unknown")});
      finish();
    });
    return overlay;
  }

  function showRating(){
    if(ratingShown)return;
    ratingShown=true;
    try{sessionStorage.setItem("ccg-lost-sizzler-rating-shown","1");}catch(_){}
    if(!isDesktopNotice()){
      try{
        if(typeof pause==="function"&&typeof mode!=="undefined"&&mode==="playing"){
          pause();
          pausedByRating=true;
        }
      }catch(_){}
    }else{
      document.getElementById("pickup-toast")?.classList.remove("show");
    }
    ensureRatingOverlay()?.classList.remove("hidden");
    window.CCGLostSizzlerBrowserStability?.resize?.();
  }

  function ratingClock(){
    const now=performance.now();
    const delta=Math.min(2000,Math.max(0,now-lastPlayTick));
    lastPlayTick=now;
    if(document.hidden)return;
    if(currentRunActive())activePlayedMs+=delta;
    if(activePlayedMs>=300000&&!ratingShown)showRating();
  }

  function watchRunStarts(){
    let wasActive=document.body.dataset.runActive==="true";
    runObserver=new MutationObserver(()=>{
      const active=document.body.dataset.runActive==="true";
      if(active&&!wasActive){
        let activeMode="unknown";
        try{activeMode=typeof playMode!=="undefined"?safe(playMode)||"unknown":"unknown";}catch(_){}
        sendTelemetry("run_started",{play_mode:activeMode});
        activePlayedMs=0;
        lastPlayTick=performance.now();
        if(isDesktopNotice()){
          const mission=safe(document.getElementById("mission-text")?.textContent)||"Follow the current objective shown above the dungeon.";
          desktopNotice("IMPORTANT INFORMATION",`${mission}  WASD/ARROWS move · SPACE fires · TAB opens inventory.`,"cyan",9000);
        }
      }
      wasActive=active;
    });
    runObserver.observe(document.body,{attributes:true,attributeFilter:["data-run-active"]});
  }

  function injectStyles(){
    if(document.getElementById("ccg-lost-sizzler-insight-styles"))return;
    const style=document.createElement("style");
    style.id="ccg-lost-sizzler-insight-styles";
    style.textContent=`
      #ccg-important-notices{display:none!important}
      .ccg-game .ccg-insight-overlay{z-index:190!important}.ccg-insight-card{width:min(600px,94vw)!important;text-align:center}.ccg-insight-kicker{margin:0 0 5px!important;color:#6cecff!important;font:700 10px/1.2 "Courier New",monospace;letter-spacing:1.4px}
      .ccg-rating-rail{width:100%;min-width:0}.ccg-rating-rail-card{padding:8px 10px;border:1px solid rgba(255,216,90,.75);background:rgba(8,5,14,.98);text-align:center;overflow-wrap:anywhere}.ccg-rating-rail-card h2{margin:2px 0 3px;font-size:13px;color:#fff}.ccg-rating-rail-card p{margin:2px 0;font-size:9px;line-height:1.25}.ccg-rating-rail-card .menu-buttons{display:flex;justify-content:center;gap:6px;margin:4px 0 0}.ccg-rating-rail-card .menu-buttons button{width:auto;font-size:8px;padding:5px 7px}
      .ccg-star-row{display:flex;justify-content:center;gap:4px;margin:5px 0}.ccg-star-row button{border:1px solid rgba(255,216,90,.5);background:#0b0710;color:#8d7c52;font-size:20px;line-height:1;padding:3px 5px;cursor:pointer}.ccg-star-row button:hover,.ccg-star-row button:focus,.ccg-star-row button.selected{color:#ffd85a;border-color:#ffd85a;transform:translateY(-1px)}
      .ccg-rating-status{min-height:12px;color:#ffd85a}.ccg-rating-card .menu-buttons{justify-content:center}
      @media(max-width:900px),(pointer:coarse){.ccg-star-row button{font-size:32px;padding:7px}.ccg-insight-card{max-height:88dvh;overflow:auto}}
    `;
    document.head.appendChild(style);
  }

  function cleanup(){
    document.removeEventListener("click",onStartClick,true);
    runObserver?.disconnect();
    runObserver=null;
    if(ratingTimer)clearInterval(ratingTimer);
    ratingTimer=null;
  }

  function init(){
    injectStyles();
    retireLegacyNoticeStack();
    ensureMobileNotice();
    ensureRatingOverlay();
    document.addEventListener("click",onStartClick,true);
    watchRunStarts();
    try{ratingShown=sessionStorage.getItem("ccg-lost-sizzler-rating-shown")==="1";}catch(_){}
    ratingTimer=setInterval(ratingClock,1000);
    window.addEventListener("pagehide",cleanup,{once:true});
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});
  else init();
})();