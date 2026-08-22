window.CCGWeeklyChallenge=(()=>{
  "use strict";

  const endpoint="ccq-weekly-challenge";
  const pendingKey="ccg-weekly-pending-result-v1";
  let retryTimer=null,retrying=false;
  let state={ready:false,signedIn:false,locked:false,weekStart:"",playerName:"",seed:"",attempt:null,leaderboard:[]};

  const statusEl=()=>document.getElementById("weekly-status");
  const boardEl=()=>document.getElementById("weekly-leaderboard");
  const authActions=()=>document.getElementById("weekly-auth-actions");
  const button=()=>document.getElementById("daily-btn");
  const safe=value=>String(value||"").replace(/[&<>]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[c]));
  function readPending(){try{return JSON.parse(localStorage.getItem(pendingKey)||"null")}catch(_){return null}}
  function writePending(value){try{value?localStorage.setItem(pendingKey,JSON.stringify(value)):localStorage.removeItem(pendingKey)}catch(_){}}

  function render(){
    const b=button(),s=statusEl(),actions=authActions(),list=boardEl(),pending=readPending();
    if(b){b.disabled=!state.ready;b.textContent=!state.ready?"Weekly Dungeon — Checking…":state.signedIn&&!state.locked?"Weekly Dungeon — Ranked Attempt":"Weekly Dungeon"}
    if(s)s.textContent=!state.ready?"Checking this week's shared dungeon…":pending?"Your completed ranked result is saved on this device and will keep retrying until the leaderboard confirms it.":!state.signedIn?"Play without an account. Sign in only if you want one ranked leaderboard attempt this week.":state.locked?`Ranked attempt already used for week beginning ${state.weekStart}. You can still play the Weekly Dungeon unranked.`:`Signed in as ${state.playerName}. Your next Weekly Dungeon run can be your ranked attempt.`;
    actions?.classList.toggle("hidden",Boolean(state.signedIn));
    if(list)list.innerHTML=(state.leaderboard||[]).slice(0,10).map((r,i)=>`<li><b>${i+1}. ${safe(r.player_name||"Player")}</b><span>${Number(r.score||0).toLocaleString()} · F${r.deepest_floor||1}</span></li>`).join("")||"<li><span>No ranked results yet this week.</span></li>";
  }

  async function invoke(body){const client=await window.ccgSupabase?.getClient?.();if(!client)throw new Error("Website account service unavailable");const {data,error}=await client.functions.invoke(endpoint,{body});if(error)throw error;if(!data?.ok)throw new Error(data?.error||"Weekly challenge request failed");return data}
  function scheduleRetry(delay=4000){if(retryTimer)clearTimeout(retryTimer);retryTimer=setTimeout(()=>retryPending(),delay)}
  async function retryPending(){const pending=readPending();if(!pending||retrying||navigator.onLine===false)return null;retrying=true;try{const data=await invoke({action:"finish",attemptId:pending.attemptId,result:pending.result,submissionId:pending.submissionId});writePending(null);state={...state,...data,ready:true,locked:true,attempt:state.attempt||{id:pending.attemptId,status:"finished"}};render();return data}catch(error){console.warn("[CCG weekly] durable score retry deferred",error);scheduleRetry(Math.min(60000,Math.max(5000,Number(pending.retryDelay||5000)*1.6)));return null}finally{retrying=false}}

  async function refresh(){try{const data=await invoke({action:"status"});state={...state,...data,ready:true};render();if(readPending())scheduleRetry(250);return state}catch(error){state={...state,ready:true};render();console.warn("[CCG weekly] status unavailable",error);return state}}
  async function claim(){const data=await invoke({action:"start"});state={...state,...data,ready:true,signedIn:true,locked:true,attempt:data.attempt};render();return data}
  async function finish(result){if(!state.attempt)return null;const pending={attemptId:state.attempt.id,weekStart:state.weekStart,result,submissionId:`${state.attempt.id}:${Date.now()}`,savedAt:Date.now(),retryDelay:5000};writePending(pending);render();try{const data=await invoke({action:"finish",attemptId:pending.attemptId,result,submissionId:pending.submissionId});writePending(null);state={...state,...data,locked:true};render();return data}catch(error){console.error("[CCG weekly] score submission saved for retry",error);scheduleRetry(3000);return{ok:false,pending:true}}}

  let lastFocusRefresh=0;
  document.addEventListener("DOMContentLoaded",()=>{render();refresh();retryPending()});
  window.addEventListener("ccg:auth-changed",()=>refresh());window.addEventListener("online",()=>retryPending());
  window.addEventListener("focus",()=>{const now=Date.now();if(now-lastFocusRefresh<1000)return;lastFocusRefresh=now;refresh();retryPending()});
  return{refresh,claim,finish,retryPending,get pending(){return readPending()},get state(){return state}};
})();
