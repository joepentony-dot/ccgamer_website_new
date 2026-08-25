window.CCGWeeklyChallenge=(()=>{
  "use strict";

  let state={
    ready:false,
    signedIn:false,
    locked:false,
    weekStart:"",
    playerName:"",
    seed:"",
    attempt:null,
    leaderboard:[],
    ghost:null
  };

  const endpoint="ccq-weekly-challenge";
  const statusEl=()=>document.getElementById("weekly-status");
  const boardEl=()=>document.getElementById("weekly-leaderboard");
  const authActions=()=>document.getElementById("weekly-auth-actions");
  const button=()=>document.getElementById("daily-btn");
  const WEEK_MS=7*24*60*60*1000;
  const GHOST_CACHE="ccg-weekly-ghost-preview";
  const PENDING_RESULT="ccg-weekly-pending-result-v1";
  let countdownTimer=0;
  let resetRefreshPending=false;

  function safe(value){
    return String(value||"").replace(/[&<>]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[c]));
  }

  function nextMondayUtc(from=new Date()){
    const now=new Date(from);
    const midnight=Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate());
    const day=now.getUTCDay();
    let days=(8-day)%7;
    if(days===0)days=7;
    return midnight+(days*24*60*60*1000);
  }

  function resetAtMs(){
    if(state.weekStart){
      const start=Date.parse(`${state.weekStart}T00:00:00Z`);
      if(Number.isFinite(start))return start+WEEK_MS;
    }
    return nextMondayUtc();
  }

  function countdownParts(){
    const resetAt=resetAtMs();
    const remaining=Math.max(0,resetAt-Date.now());
    const totalSeconds=Math.ceil(remaining/1000);
    const days=Math.floor(totalSeconds/86400);
    const hours=Math.floor((totalSeconds%86400)/3600);
    const minutes=Math.floor((totalSeconds%3600)/60);
    const seconds=totalSeconds%60;
    const clock=`${String(hours).padStart(2,"0")}:${String(minutes).padStart(2,"0")}:${String(seconds).padStart(2,"0")}`;
    return{resetAt,remaining,text:days>0?`${days}d ${clock}`:clock};
  }

  function stopCountdown(){
    if(countdownTimer){clearInterval(countdownTimer);countdownTimer=0;}
  }

  function syncCountdownTimer(){
    if(!(state.ready&&state.signedIn&&state.locked)){
      stopCountdown();
      resetRefreshPending=false;
      return;
    }
    if(countdownTimer)return;
    countdownTimer=setInterval(()=>{
      const countdown=countdownParts();
      if(countdown.remaining<=0){
        if(resetRefreshPending)return;
        resetRefreshPending=true;
        stopCountdown();
        refresh().finally(()=>{resetRefreshPending=false;syncCountdownTimer();});
        return;
      }
      render();
    },1000);
  }

  function render(){
    const b=button(),s=statusEl(),actions=authActions(),list=boardEl();
    const countdown=state.ready&&state.signedIn&&state.locked?countdownParts():null;
    if(b){
      b.disabled=!state.ready||(state.signedIn&&state.locked);
      b.textContent=!state.ready
        ?"Weekly Dungeon — Checking…"
        :state.signedIn&&state.locked
          ?`Weekly Dungeon — Resets in ${countdown?.text||"--:--:--"}`
          :state.signedIn
            ?"Weekly Dungeon — Ranked Run"
            :"Weekly Dungeon — Sign In Required";
    }
    if(s){
      s.textContent=!state.ready
        ?"Checking this week's dungeon…"
        :!state.signedIn
          ?"Sign in before entering the Weekly Dungeon. Your single attempt for the week is reserved at launch and its final score is submitted to the weekly leaderboard."
          :state.locked
            ?`Your ranked attempt for week beginning ${state.weekStart} has already been used. You can play again in ${countdown?.text||"--:--:--"}. The ranked challenge resets Monday at 00:00 UTC.`
            :`Signed in as ${state.playerName}. Your next Weekly Dungeon run is your one ranked attempt for this week.`;
    }
    actions?.classList.toggle("hidden",Boolean(state.signedIn));
    if(list){
      list.innerHTML=(state.leaderboard||[]).slice(0,5).map((r,i)=>
        `<li><b>${i+1}. ${safe(r.player_name||"Player")}</b><span>${Number(r.score||0).toLocaleString()} · F${r.deepest_floor||1}</span></li>`
      ).join("")||"<li><span>No completed attempts yet this week — no winner will be declared.</span></li>";
    }
    syncCountdownTimer();
  }

  async function invoke(body){
    const client=await window.ccgSupabase?.getClient?.();
    if(!client)throw new Error("Website account service unavailable");
    const {data,error}=await client.functions.invoke(endpoint,{body});
    if(error)throw error;
    if(!data?.ok)throw new Error(data?.error||"Weekly challenge request failed");
    return data;
  }

  function cacheGhost(ghost){
    state={...state,ghost:ghost||null};
    try{
      if(ghost?.path?.length)sessionStorage.setItem(GHOST_CACHE,JSON.stringify(ghost));
      else sessionStorage.removeItem(GHOST_CACHE);
    }catch(_){}
  }

  async function refreshGhost(){
    if(!state.signedIn){cacheGhost(null);return null;}
    try{
      const data=await invoke({action:"ghost"});
      cacheGhost(data.ghost||data.ghostReplay||null);
      return state.ghost;
    }catch(error){
      console.warn("[CCG weekly] ghost replay unavailable",error);
      cacheGhost(null);
      return null;
    }
  }

  function acceptGhostFromResponse(data){
    if(!data||!Object.prototype.hasOwnProperty.call(data,"ghostReplay"))return false;
    cacheGhost(data.ghostReplay||null);
    return true;
  }

  async function refresh(){
    try{
      const data=await invoke({action:"status"});
      state={...state,...data,ready:true};
      if(!state.signedIn)cacheGhost(null);
      else if(!acceptGhostFromResponse(data))await refreshGhost();
      render();
      return state;
    }catch(error){
      state={...state,ready:true};
      render();
      console.warn("[CCG weekly] status unavailable",error);
      return state;
    }
  }

  async function claim(){
    if(!state.ready||!state.signedIn||state.locked)throw new Error(state.locked?"This week's attempt has already been used":"Sign in before starting the Weekly Dungeon");
    const data=await invoke({action:"start"});
    state={...state,...data,ready:true,signedIn:true,locked:true,attempt:data.attempt};
    if(!acceptGhostFromResponse(data))await refreshGhost();
    render();
    return data;
  }

  function savePending(value){try{if(value)localStorage.setItem(PENDING_RESULT,JSON.stringify(value));else localStorage.removeItem(PENDING_RESULT)}catch(_){}}
  function readPending(){try{const value=JSON.parse(localStorage.getItem(PENDING_RESULT)||"null");return value&&typeof value==="object"?value:null}catch(_){return null}}
  async function submitPending(pending=readPending()){
    if(!pending?.attemptId||!pending?.result)return null;
    const data=await invoke({action:"finish",attemptId:pending.attemptId,result:pending.result});
    savePending(null);
    state={...state,...data,locked:true,attempt:state.attempt?{...state.attempt,status:"finished"}:state.attempt};
    acceptGhostFromResponse(data);
    render();
    return data;
  }

  async function finish(result){
    if(!state.attempt)return null;
    const pending={attemptId:state.attempt.id,weekStart:state.weekStart,result};savePending(pending);
    try{
      return await submitPending(pending);
    }catch(error){
      console.error("[CCG weekly] score submission failed",error);
      setTimeout(()=>submitPending().catch(retryError=>console.warn("[CCG weekly] deferred score retry pending",retryError)),2500);
      return null;
    }
  }

  let lastFocusRefresh=0;
  document.addEventListener("DOMContentLoaded",()=>{render();refresh();});
  window.addEventListener("ccg:auth-changed",()=>refresh());
  window.addEventListener("focus",()=>{
    const now=Date.now();
    if(now-lastFocusRefresh<1000)return;
    lastFocusRefresh=now;
    refresh().then(()=>{if(state.signedIn)submitPending().catch(()=>{})});
  });
  window.addEventListener("pagehide",stopCountdown,{once:true});

  return{refresh,refreshGhost,claim,finish,get state(){return state}};
})();
