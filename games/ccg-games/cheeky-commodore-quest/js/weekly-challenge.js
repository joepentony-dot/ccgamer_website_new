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
    leaderboard:[]
  };

  const endpoint="ccq-weekly-challenge";
  const statusEl=()=>document.getElementById("weekly-status");
  const boardEl=()=>document.getElementById("weekly-leaderboard");
  const authActions=()=>document.getElementById("weekly-auth-actions");
  const button=()=>document.getElementById("daily-btn");

  function safe(value){
    return String(value||"").replace(/[&<>]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[c]));
  }

  function render(){
    const b=button(),s=statusEl(),actions=authActions(),list=boardEl();
    if(b){
      b.disabled=!state.ready||(state.signedIn&&state.locked);
      b.textContent=!state.ready
        ?"Weekly Dungeon — Checking…"
        :state.signedIn&&state.locked
          ?"Weekly Dungeon — Ranked Attempt Used"
          :state.signedIn
            ?"Weekly Dungeon — Ranked Run"
            :"Weekly Dungeon";
    }
    if(s){
      s.textContent=!state.ready
        ?"Checking this week's dungeon…"
        :!state.signedIn
          ?"Play the Weekly Dungeon without an account. Sign in only if you want your score submitted to the weekly leaderboard."
          :state.locked
            ?`Your ranked attempt for week beginning ${state.weekStart} has already been used. The ranked challenge resets Monday at 00:00 UTC.`
            :`Signed in as ${state.playerName}. Your next Weekly Dungeon run is your one ranked attempt for this week.`;
    }
    actions?.classList.toggle("hidden",Boolean(state.signedIn));
    if(list){
      list.innerHTML=(state.leaderboard||[]).slice(0,10).map((r,i)=>
        `<li><b>${i+1}. ${safe(r.player_name||"Player")}</b><span>${Number(r.score||0).toLocaleString()} · F${r.deepest_floor||1}</span></li>`
      ).join("")||"<li><span>No ranked results yet this week.</span></li>";
    }
  }

  async function invoke(body){
    const client=await window.ccgSupabase?.getClient?.();
    if(!client)throw new Error("Website account service unavailable");
    const {data,error}=await client.functions.invoke(endpoint,{body});
    if(error)throw error;
    if(!data?.ok)throw new Error(data?.error||"Weekly challenge request failed");
    return data;
  }

  async function refresh(){
    try{
      const data=await invoke({action:"status"});
      state={...state,...data,ready:true};
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
    const data=await invoke({action:"start"});
    state={...state,...data,ready:true,signedIn:true,locked:true,attempt:data.attempt};
    render();
    return data;
  }

  async function finish(result){
    if(!state.attempt)return null;
    try{
      const data=await invoke({action:"finish",attemptId:state.attempt.id,result});
      state={...state,...data,locked:true};
      render();
      return data;
    }catch(error){
      console.error("[CCG weekly] score submission failed",error);
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
    refresh();
  });

  return{refresh,claim,finish,get state(){return state}};
})();
