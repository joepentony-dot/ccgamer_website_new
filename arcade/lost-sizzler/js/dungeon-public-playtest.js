/* C64 Dungeon Carnage — public 24-hour / five-minute playtest experience. */
(function(){
  "use strict";

  if(window.CCGDungeonPublicPlaytest)return;

  const CONTACT_SCRIPT_URL="https://script.google.com/macros/s/AKfycbxiLgl-SR8ngptHDnyOqUCRUl2Ia4yjuu2LO4IWMPt7763nmMgrD0qs3hpJOgw7dtsLiA/exec";
  const TESTER_KEY="ccg_dungeon_public_playtest_browser_id_v1";
  const ACCESS_EVENT="ccg:public-playtest-access-granted";
  const PLAY_SECONDS=300;
  const state={
    active:false,
    publicExpiresAt:0,
    sessionExpiresAt:0,
    sessionStarted:false,
    sessionEnded:false,
    testerId:"",
    tickTimer:0,
    accessDetail:null
  };

  const qs=(sel,root=document)=>root.querySelector(sel);
  const safeText=value=>String(value==null?"":value);
  const token=()=>{try{return String(new URLSearchParams(location.search).get("playtest")||"").trim()}catch(_){return""}};
  const parseTime=value=>{const ms=Date.parse(String(value||""));return Number.isFinite(ms)?ms:0};
  const cleanPageUrl=()=>{
    try{
      const url=new URL(location.href);
      url.searchParams.delete("utm_source");
      url.searchParams.delete("utm_medium");
      url.searchParams.delete("utm_campaign");
      url.searchParams.delete("utm_content");
      url.searchParams.delete("utm_term");
      return url.toString();
    }catch(_){return location.origin+location.pathname}
  };
  const whenBodyReady=fn=>{
    if(document.body){fn();return}
    addEventListener("DOMContentLoaded",fn,{once:true});
  };
  const getClient=async()=>{
    if(!window.ccgSupabase||typeof window.ccgSupabase.getClient!=="function")return null;
    try{return await window.ccgSupabase.getClient()}catch(_){return null}
  };
  const rpc=async(name,args)=>{
    const client=await getClient();
    if(!client||typeof client.rpc!=="function")throw new Error("Playtest service unavailable.");
    const result=await client.rpc(name,args);
    if(result?.error)throw result.error;
    return result?.data||null;
  };
  function testerId(){
    if(state.testerId)return state.testerId;
    try{
      const existing=String(localStorage.getItem(TESTER_KEY)||"").trim();
      if(existing){state.testerId=existing;return existing}
      const value=(crypto?.randomUUID?.()||("ccg-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,18))).replace(/[^A-Za-z0-9._:-]/g,"");
      localStorage.setItem(TESTER_KEY,value);
      state.testerId=value;
      return value;
    }catch(_){
      state.testerId=("ccg-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,18));
      return state.testerId;
    }
  }
  function formatDuration(ms){
    const total=Math.max(0,Math.ceil(ms/1000));
    const days=Math.floor(total/86400);
    const hours=Math.floor((total%86400)/3600);
    const minutes=Math.floor((total%3600)/60);
    const seconds=total%60;
    if(days>0)return String(days).padStart(2,"0")+":"+String(hours).padStart(2,"0")+":"+String(minutes).padStart(2,"0")+":"+String(seconds).padStart(2,"0");
    return String(hours).padStart(2,"0")+":"+String(minutes).padStart(2,"0")+":"+String(seconds).padStart(2,"0");
  }
  function formatSession(ms){
    const total=Math.max(0,Math.ceil(ms/1000));
    return String(Math.floor(total/60)).padStart(2,"0")+":"+String(total%60).padStart(2,"0");
  }
  function ensureBadge(){
    let badge=qs("#ccg-public-playtest-badge");
    if(badge)return badge;
    badge=document.createElement("aside");
    badge.id="ccg-public-playtest-badge";
    badge.setAttribute("aria-live","polite");
    badge.innerHTML='<span>PUBLIC PLAYTEST WINDOW</span><strong data-public-countdown>--:--:--</strong><small data-session-countdown>5-minute test begins when gameplay starts</small>';
    document.body.appendChild(badge);
    return badge;
  }
  function updateCountdowns(){
    if(!state.active)return;
    const now=Date.now();
    const badge=ensureBadge();
    const publicNode=qs("[data-public-countdown]",badge);
    const sessionNode=qs("[data-session-countdown]",badge);
    const introCount=qs("[data-intro-countdown]");
    if(publicNode)publicNode.textContent=formatDuration(state.publicExpiresAt-now);
    if(introCount)introCount.textContent=formatDuration(state.publicExpiresAt-now);
    if(sessionNode){
      sessionNode.textContent=state.sessionStarted&&!state.sessionEnded
        ?"YOUR PLAY TIME · "+formatSession(state.sessionExpiresAt-now)
        :"5-minute test begins when gameplay starts";
    }
    if(state.publicExpiresAt&&now>=state.publicExpiresAt){
      finishSession("public-expired");
      return;
    }
    if(state.sessionStarted&&!state.sessionEnded&&state.sessionExpiresAt&&now>=state.sessionExpiresAt){
      finishSession("five-minutes");
    }
  }
  function startTicker(){
    clearInterval(state.tickTimer);
    updateCountdowns();
    state.tickTimer=setInterval(updateCountdowns,500);
  }
  function showIntro(){
    if(qs("#ccg-public-playtest-intro")||state.sessionEnded)return;
    const wrap=document.createElement("div");
    wrap.id="ccg-public-playtest-intro";
    wrap.setAttribute("role","dialog");
    wrap.setAttribute("aria-modal","true");
    wrap.setAttribute("aria-labelledby","ccg-public-playtest-intro-title");
    wrap.innerHTML=`
      <section class="ccg-public-playtest-card">
        <span class="ccg-public-playtest-kicker">CHEEKY COMMODORE GAMER · PUBLIC PLAYTEST</span>
        <h1 id="ccg-public-playtest-intro-title">24-Hour Test Window</h1>
        <p>You are playing a limited test build of <strong>C64 Dungeon Carnage</strong>. The public link closes automatically when the shared 24-hour window ends.</p>
        <div class="ccg-public-playtest-window"><span>PUBLIC ACCESS REMAINING</span><strong data-intro-countdown>--:--:--</strong></div>
        <div class="ccg-public-playtest-rules">
          <div><b>Five minutes</b><span>Your personal test timer begins only when actual gameplay starts.</span></div>
          <div><b>Try things</b><span>Explore, fight, collect items and note anything confusing, broken or enjoyable.</span></div>
          <div><b>Tell me</b><span>At the end you will get a feedback box that sends your comments directly to CCG.</span></div>
        </div>
        <button type="button" class="ccg-public-playtest-primary" data-public-enter>ENTER THE PLAYTEST</button>
        <p id="ccg-public-playtest-status">The five-minute gameplay clock has not started yet.</p>
      </section>`;
    document.body.appendChild(wrap);
    document.documentElement.classList.add("ccg-public-playtest-locked");
    qs("[data-public-enter]",wrap)?.addEventListener("click",()=>{
      wrap.remove();
      document.documentElement.classList.remove("ccg-public-playtest-locked");
      ensureBadge();
    });
  }
  function installRunObserver(){
    const body=document.body;
    if(!body||body.dataset.ccgPublicPlaytestObserved==="true")return;
    body.dataset.ccgPublicPlaytestObserved="true";
    const check=()=>{
      if(!state.active||state.sessionStarted||state.sessionEnded)return;
      if(body.dataset.runActive==="true")void beginTimedSession();
    };
    new MutationObserver(check).observe(body,{attributes:true,attributeFilter:["data-run-active"]});
    check();
  }
  async function beginTimedSession(){
    if(state.sessionStarted||state.sessionEnded)return;
    state.sessionStarted=true;
    const args={p_token:token(),p_tester_id:testerId()};
    let data=null;
    for(let attempt=0;attempt<2&&!data;attempt++){
      try{data=await rpc("ccg_register_dungeon_carnage_public_playtest_start",args)}catch(_){
        if(attempt===0)await new Promise(resolve=>setTimeout(resolve,1200));
      }
    }
    if(!data){
      state.sessionStarted=false;
      showServiceFailure();
      return;
    }
    state.sessionExpiresAt=parseTime(data.session_expires_at);
    if(data.public_expires_at)state.publicExpiresAt=parseTime(data.public_expires_at)||state.publicExpiresAt;
    if(data.allowed!==true||String(data.reason||"")==="session_complete"){
      finishSession(String(data.reason||"session-complete"));
      return;
    }
    document.body.dataset.ccgPublicPlaytestSession="active";
    updateCountdowns();
  }
  function blockGameInput(event){
    const end=qs("#ccg-public-playtest-end");
    if(!end)return;
    if(event.target instanceof Element&&end.contains(event.target))return;
    event.preventDefault();
    event.stopImmediatePropagation();
  }
  function installHardStop(){
    for(const name of ["keydown","keyup","pointerdown","pointerup","mousedown","mouseup","touchstart","touchend","wheel","contextmenu"]){
      addEventListener(name,blockGameInput,{capture:true,passive:false});
    }
    try{document.body.dataset.runActive="false"}catch(_){}
    try{document.exitFullscreen?.()}catch(_){}
  }
  function endCopy(reason){
    if(reason==="public-expired"||reason==="expired")return{
      kicker:"PUBLIC PLAYTEST CLOSED",
      title:"24-Hour Test Ended",
      copy:"The shared public testing window has now closed. Thanks for taking part.",
      coming:"C64 DUNGEON CARNAGE · COMING SOON"
    };
    return{
      kicker:"FIVE-MINUTE TEST COMPLETE",
      title:"Thanks For Testing",
      copy:"Your timed playtest is finished. Please send anything you noticed below — bugs, balancing problems, confusing bits, or things you particularly liked.",
      coming:"C64 DUNGEON CARNAGE · COMING SOON"
    };
  }
  async function finishSession(reason="five-minutes"){
    if(state.sessionEnded)return;
    if(reason==="five-minutes"&&state.sessionStarted){
      try{
        const data=await rpc("ccg_complete_dungeon_carnage_public_playtest",{p_token:token(),p_tester_id:testerId()});
        if(data?.recorded===false&&data?.reason==="too_early"&&data?.session_expires_at){
          state.sessionExpiresAt=parseTime(data.session_expires_at);
          return;
        }
      }catch(_){}
    }
    state.sessionEnded=true;
    clearInterval(state.tickTimer);
    document.body.dataset.ccgPublicPlaytestSession="complete";
    qs("#ccg-public-playtest-intro")?.remove();
    qs("#ccg-public-playtest-badge")?.remove();
    installHardStop();
    showEnd(reason);
  }
  function showEnd(reason){
    if(qs("#ccg-public-playtest-end"))return;
    const copy=endCopy(reason);
    const wrap=document.createElement("div");
    wrap.id="ccg-public-playtest-end";
    wrap.setAttribute("role","dialog");
    wrap.setAttribute("aria-modal","true");
    wrap.setAttribute("aria-labelledby","ccg-public-playtest-end-title");
    wrap.innerHTML=`
      <section class="ccg-public-playtest-card">
        <span class="ccg-public-playtest-kicker">${copy.kicker}</span>
        <h1 id="ccg-public-playtest-end-title">${copy.title}</h1>
        <p>${copy.copy}</p>
        <div class="ccg-public-playtest-coming">${copy.coming}</div>
        <form class="ccg-public-playtest-form" data-public-feedback>
          <label>Your name
            <input name="name" maxlength="80" value="Dungeon Carnage Tester" autocomplete="name" required>
          </label>
          <label>Your email
            <input name="email" type="email" maxlength="160" autocomplete="email" placeholder="So I can reply if needed" required>
          </label>
          <label>Suggestion / feedback
            <textarea name="message" maxlength="3000" placeholder="What did you find? What should change? Anything broken, confusing or particularly good?" required></textarea>
          </label>
          <button type="submit" class="ccg-public-playtest-primary">SEND FEEDBACK TO CCG</button>
          <p class="ccg-public-playtest-feedback-result" data-feedback-result>Your feedback is sent directly to the Cheeky Commodore Gamer contact system.</p>
        </form>
        <a class="ccg-public-playtest-secondary" style="display:block;text-decoration:none" href="/games/ccg-games/">RETURN TO CCG GAMES</a>
      </section>`;
    document.body.appendChild(wrap);
    document.documentElement.classList.add("ccg-public-playtest-locked");
    qs("[data-public-feedback]",wrap)?.addEventListener("submit",submitFeedback);
  }
  async function submitFeedback(event){
    event.preventDefault();
    const form=event.currentTarget;
    const button=qs('button[type="submit"]',form);
    const result=qs("[data-feedback-result]",form);
    const name=safeText(form.elements.name?.value).trim();
    const email=safeText(form.elements.email?.value).trim();
    const message=safeText(form.elements.message?.value).trim();
    if(!name||!email||message.length<10){
      result.dataset.state="error";
      result.textContent="Please add your name, a valid email address and at least a short description.";
      return;
    }
    button.disabled=true;
    result.dataset.state="";
    result.textContent="Sending feedback…";
    const data=new FormData();
    data.append("action","sendEmail");
    data.append("name",name);
    data.append("email",email);
    data.append("topics","C64 Dungeon Carnage — 24-Hour Public Playtest Feedback");
    data.append("message",message+"\n\nPlaytest page: "+cleanPageUrl());
    try{
      const response=await fetch(CONTACT_SCRIPT_URL,{method:"POST",body:data});
      const text=await response.text();
      let payload={};
      try{payload=JSON.parse(text)}catch(_){payload={success:response.ok}}
      if(!response.ok||(!payload.success&&payload.result!=="success"))throw new Error(payload.error||"Feedback delivery failed.");
      try{await rpc("ccg_mark_dungeon_carnage_public_playtest_feedback",{p_token:token(),p_tester_id:testerId()})}catch(_){}
      form.elements.message.value="";
      result.dataset.state="success";
      result.textContent="Feedback sent. Thank you for testing C64 Dungeon Carnage.";
      button.textContent="FEEDBACK SENT";
    }catch(error){
      result.dataset.state="error";
      result.textContent="The message could not be sent. Please try again, or email info@cheekycommodoregamer.co.uk.";
      button.disabled=false;
    }
  }
  function showServiceFailure(){
    if(qs("#ccg-public-playtest-end"))return;
    state.sessionEnded=true;
    installHardStop();
    const wrap=document.createElement("div");
    wrap.id="ccg-public-playtest-end";
    wrap.innerHTML='<section class="ccg-public-playtest-card"><span class="ccg-public-playtest-kicker">PLAYTEST VALIDATION</span><h1>Unable To Start Test</h1><p>The timed playtest service could not be verified. Refresh the page and try again.</p><a class="ccg-public-playtest-secondary" style="display:block;text-decoration:none" href="'+location.pathname+location.search+'">REFRESH PLAYTEST</a></section>';
    document.body.appendChild(wrap);
    document.documentElement.classList.add("ccg-public-playtest-locked");
  }
  function activate(detail){
    if(state.active)return;
    state.active=true;
    state.accessDetail=detail||{};
    state.publicExpiresAt=parseTime(detail?.expiresAt||detail?.expires_at);
    whenBodyReady(()=>{
      document.body.dataset.ccgPublicPlaytest="true";
      showIntro();
      ensureBadge();
      installRunObserver();
      startTicker();
    });
  }

  addEventListener(ACCESS_EVENT,event=>activate(event.detail||{}));
  window.CCGDungeonPublicPlaytest=Object.freeze({
    state,
    activate,
    finishSession,
    cleanPageUrl
  });
})();