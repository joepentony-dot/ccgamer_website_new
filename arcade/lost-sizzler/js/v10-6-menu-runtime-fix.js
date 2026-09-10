/* The Lost Sizzler — V10.6 menu runtime correction.
   Keeps Weekly Dungeon playable for guests while reserving sign-in for ranked scores. */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_MENU_RUNTIME_V106__)return;
  window.__CCG_LOST_SIZZLER_MENU_RUNTIME_V106__=true;

  const button=()=>document.getElementById("daily-btn");
  const status=()=>document.getElementById("weekly-status");
  const challenge=()=>window.CCGWeeklyChallenge;
  const deliveryUnavailable=node=>Boolean(node?.dataset?.ccgOnlineUnavailable==="true"&&window.CCGLostSizzlerDelivery?.isDesktop);

  function setText(node,value){if(node&&node.textContent!==value)node.textContent=value;}
  function setDisabled(node,value){
    if(!node)return;
    const next=deliveryUnavailable(node)||Boolean(value);
    if(node.disabled!==next)node.disabled=next;
  }

  function syncWeeklyPresentation(){
    const api=challenge(),state=api?.state,b=button(),s=status();
    if(!state||!b)return;

    /* MutationObserver below watches the disabled attribute. Never write the
       same value back into it: doing so can continuously retrigger the observer
       and starve the browser's main thread. The desktop delivery gate owns the
       unavailable marker, so this presentation layer must never re-enable a
       Weekly control that the packaged build has deliberately disabled. */
    setDisabled(b,!state.ready);
    if(deliveryUnavailable(b))return;
    if(!state.ready)setText(b,"Weekly Dungeon — Checking…");
    else if(state.signedIn&&!state.locked)setText(b,"Weekly Dungeon — Ranked Attempt");
    else setText(b,"Weekly Dungeon");

    if(!s)return;
    if(!state.ready)setText(s,"Checking this week's shared dungeon seed…");
    else if(!state.signedIn)setText(s,"Play without an account. Sign in only if you want one ranked leaderboard attempt this week.");
    else if(state.locked)setText(s,`Ranked attempt already used for week beginning ${state.weekStart}. You can still play the Weekly Dungeon unranked.`);
    else setText(s,`Signed in as ${state.playerName}. Your next Weekly Dungeon run can be your ranked attempt.`);
  }

  async function startUnrankedAfterRankedAttempt(event){
    const b=button();
    if(deliveryUnavailable(b))return;
    const state=challenge()?.state;
    if(!state?.ready||!state?.signedIn||!state?.locked)return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if(!state.seed){
      showToast("WEEKLY DUNGEON UNAVAILABLE","The weekly seed could not be loaded. Try again in a moment.","red",7000);
      challenge()?.refresh?.();
      return;
    }
    const audio=S.start(),fullscreen=requestPlayFullscreen();
    await Promise.all([audio,fullscreen]);
    net.setSolo(state.playerName||playerName());
    beginRun({split:false,daily:true,seed:state.seed,weekly:{weekStart:state.weekStart,attempt:null}});
  }

  button()?.addEventListener("click",startUnrankedAfterRankedAttempt,true);

  const watched=[button(),status()].filter(Boolean);
  if(watched.length&&window.MutationObserver){
    let queued=false;
    const observer=new MutationObserver(()=>{
      if(queued)return;
      queued=true;
      queueMicrotask(()=>{queued=false;syncWeeklyPresentation();});
    });
    for(const node of watched)observer.observe(node,{childList:true,characterData:true,subtree:true,attributes:true,attributeFilter:["disabled"]});
    window.addEventListener("pagehide",()=>observer.disconnect(),{once:true});
  }

  window.addEventListener("ccg:auth-changed",()=>requestAnimationFrame(syncWeeklyPresentation));
  window.addEventListener("focus",()=>setTimeout(syncWeeklyPresentation,80));
  syncWeeklyPresentation();
  setTimeout(syncWeeklyPresentation,250);
  setTimeout(syncWeeklyPresentation,900);
})();
