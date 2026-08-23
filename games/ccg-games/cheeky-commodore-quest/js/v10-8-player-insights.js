/* The Lost Sizzler — desktop notices, play telemetry and two-minute rating prompt. */
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
  const IMPORTANT_RE=/DEATH STALKER|COUNT LOADULA|SIGIL|LOST SIZZLER|WEEKLY|WARNING|DUNGEON STARTED|ONLINE ROOM|HOST STARTED|FLOOR|BANISH|SAVE|OBJECTIVE/i;
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

  function safe(value){return String(value??"").trim();}
  function esc(value){return safe(value).replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));}
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

  function ensureNoticeStack(){
    let stack=document.getElementById("ccg-important-notices");
    if(stack)return stack;
    stack=document.createElement("div");
    stack.id="ccg-important-notices";
    stack.setAttribute("aria-live","polite");
    document.querySelector(".game-area")?.appendChild(stack);
    return stack;
  }
  function desktopNotice(title,text,tone="cyan",duration=7500){
    if(!isDesktopNotice())return;
    const stack=ensureNoticeStack();
    if(!stack)return;
    const notice=document.createElement("div");
    notice.className=`ccg-important-notice tone-${safe(tone).replace(/[^a-z]/gi,"").toLowerCase()||"cyan"}`;
    notice.innerHTML=`<b>${esc(title)}</b><span>${esc(text)}</span>`;
    stack.appendChild(notice);
    requestAnimationFrame(()=>notice.classList.add("show"));
    const remove=()=>{notice.classList.remove("show");setTimeout(()=>notice.remove(),260);};
    setTimeout(remove,Math.max(4200,Math.min(12000,Number(duration)||7500)));
  }

  function patchImportantToasts(){
    if(typeof showToast!=="function"||showToast.__ccgInsightsPatched)return;
    const original=showToast;
    const wrapped=function(title,text,tone,duration){
      const result=original.apply(this,arguments);
      const longEnough=(Number(duration)||0)>=6500;
      if(isDesktopNotice()&&(longEnough||IMPORTANT_RE.test(safe(title))))desktopNotice(title,text,tone,duration);
      return result;
    };
    wrapped.__ccgInsightsPatched=true;
    try{showToast=wrapped;}catch(error){console.warn("[Lost Sizzler] important notice hook unavailable",error);}
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
    overlay=document.createElement("div");
    overlay.id="ccg-rating-panel";
    overlay.className="overlay hidden ccg-insight-overlay";
    overlay.innerHTML=`<div class="panel compact ccg-insight-card ccg-rating-card">
      <p class="ccg-insight-kicker">TWO MINUTES IN</p>
      <h2>RATE THE GAME</h2>
      <p>How are you finding <strong>The Lost Sizzler</strong> so far?</p>
      <div class="ccg-star-row" role="group" aria-label="Rate The Lost Sizzler out of five stars">
        ${[1,2,3,4,5].map(value=>`<button type="button" data-rating="${value}" aria-label="${value} star${value===1?"":"s"}">★</button>`).join("")}
      </div>
      <p id="ccg-rating-status" class="ccg-rating-status">Choose 1 to 5 stars.</p>
      <div class="menu-buttons"><button id="ccg-rating-feedback" type="button">REPORT BUG / GAME SUGGESTION</button><button id="ccg-rating-later" type="button">NOT NOW</button></div>
    </div>`;
    document.querySelector(".game-area")?.appendChild(overlay);
    const finish=()=>{
      overlay.classList.add("hidden");
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
    try{
      if(typeof pause==="function"&&typeof mode!=="undefined"&&mode==="playing"){
        pause();
        pausedByRating=true;
      }
    }catch(_){}
    ensureRatingOverlay()?.classList.remove("hidden");
  }

  function ratingClock(){
    const now=performance.now();
    const delta=Math.min(2000,Math.max(0,now-lastPlayTick));
    lastPlayTick=now;
    if(document.hidden)return;
    if(currentRunActive())activePlayedMs+=delta;
    if(activePlayedMs>=120000&&!ratingShown)showRating();
  }

  function watchRunStarts(){
    let wasActive=document.body.dataset.runActive==="true";
    const observer=new MutationObserver(()=>{
      const active=document.body.dataset.runActive==="true";
      if(active&&!wasActive){
        let activeMode="unknown";
        try{activeMode=typeof playMode!=="undefined"?safe(playMode)||"unknown":"unknown";}catch(_){}
        sendTelemetry("run_started",{play_mode:activeMode});
        activePlayedMs=0;
        lastPlayTick=performance.now();
        if(isDesktopNotice()){
          const mission=safe(document.getElementById("mission-text")?.textContent)||"Follow the current objective shown above the dungeon.";
          desktopNotice("IMPORTANT INFORMATION",`${mission}  WASD/ARROWS move · SPACE fires · TAB opens inventory.`, "cyan",9000);
        }
      }
      wasActive=active;
    });
    observer.observe(document.body,{attributes:true,attributeFilter:["data-run-active"]});
  }

  function injectStyles(){
    if(document.getElementById("ccg-lost-sizzler-insight-styles"))return;
    const style=document.createElement("style");
    style.id="ccg-lost-sizzler-insight-styles";
    style.textContent=`
      #ccg-important-notices{position:absolute;top:82px;right:18px;z-index:32;width:min(420px,38vw);display:grid;gap:10px;pointer-events:none}
      .ccg-important-notice{opacity:0;transform:translateY(-10px);padding:13px 15px;border:2px solid #6cecff;background:rgba(6,4,10,.94);box-shadow:0 14px 38px rgba(0,0,0,.5),0 0 22px rgba(108,236,255,.18);transition:opacity .2s ease,transform .2s ease;font-family:"Courier New",monospace}
      .ccg-important-notice.show{opacity:1;transform:translateY(0)}.ccg-important-notice b{display:block;margin-bottom:5px;color:#ffd85a;font-size:12px;letter-spacing:.7px}.ccg-important-notice span{display:block;color:#fff;font-size:11px;line-height:1.42}
      .ccg-important-notice.tone-red{border-color:#ff6868}.ccg-important-notice.tone-gold{border-color:#ffd85a}.ccg-important-notice.tone-green{border-color:#72ff9b}.ccg-important-notice.tone-purple{border-color:#b978ff}
      .ccg-game .ccg-insight-overlay{z-index:190!important}.ccg-insight-card{width:min(600px,94vw)!important;text-align:center}.ccg-insight-kicker{margin:0 0 5px!important;color:#6cecff!important;font:700 10px/1.2 "Courier New",monospace;letter-spacing:1.4px}
      .ccg-star-row{display:flex;justify-content:center;gap:8px;margin:18px 0}.ccg-star-row button{border:1px solid rgba(255,216,90,.5);background:#0b0710;color:#8d7c52;font-size:38px;line-height:1;padding:8px 10px;cursor:pointer}.ccg-star-row button:hover,.ccg-star-row button:focus,.ccg-star-row button.selected{color:#ffd85a;border-color:#ffd85a;transform:translateY(-2px)}
      .ccg-rating-status{min-height:20px;color:#ffd85a}.ccg-rating-card .menu-buttons{justify-content:center}
      @media(max-width:900px),(pointer:coarse){#ccg-important-notices{display:none}.ccg-star-row button{font-size:32px;padding:7px}.ccg-insight-card{max-height:88dvh;overflow:auto}}
    `;
    document.head.appendChild(style);
  }

  function init(){
    injectStyles();
    patchImportantToasts();
    ensureMobileNotice();
    ensureRatingOverlay();
    document.addEventListener("click",onStartClick,true);
    watchRunStarts();
    try{ratingShown=sessionStorage.getItem("ccg-lost-sizzler-rating-shown")==="1";}catch(_){}
    setInterval(ratingClock,1000);
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});
  else init();
})();
