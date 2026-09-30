/* C64 Dungeon Carnage V10.42 r72/r79 — map/death feedback presentation. */
(()=>{
  "use strict";
  if(window.CCGLostSizzlerV142R72MapDeathFeedback)return;

  const STYLE="css/v10-42-r72-map-death-feedback.css";
  const AUTO_CONFIRM_MS=6200;
  const state={deathShows:0,lastDeath:null,active:false,confirming:false,shownAt:0,confirmations:0,autoConfirmTimer:0};

  function ensureStyle(){
    if(document.querySelector('link[data-ccg-r72-map-death="true"]'))return;
    const cache=String(document.querySelector('meta[name="ccg-lost-sizzler-cache"]')?.content||"latest");
    const link=document.createElement("link");link.rel="stylesheet";link.href=`${STYLE}?v=${encodeURIComponent(cache)}`;link.dataset.ccgR72MapDeath="true";document.head.appendChild(link)
  }

  function safeSource(value){
    const s=String(value||"enemy").replace(/[_-]+/g," ").trim();
    if(!s)return"AN UNKNOWN THREAT";
    return s.toUpperCase().slice(0,72)
  }

  function ensureDeathOverlay(){
    let node=document.getElementById("ccg-r72-death-feedback");
    if(node)return node;
    const host=document.querySelector(".ccg-game")||document.body;
    node=document.createElement("div");
    node.id="ccg-r72-death-feedback";
    node.className="ccg-r72-death-feedback";
    node.setAttribute("role","dialog");
    node.setAttribute("aria-modal","true");
    node.setAttribute("aria-labelledby","ccg-r72-death-title");
    node.setAttribute("aria-live","assertive");
    node.setAttribute("aria-hidden","true");
    node.innerHTML='<div class="ccg-r72-death-card"><span class="ccg-r72-death-kicker">C64 DUNGEON CARNAGE</span><strong id="ccg-r72-death-title">YOU DIED</strong><b id="ccg-r72-death-source">DEFEATED</b><span id="ccg-r72-death-loss"></span><small>RESPAWNING IN A MOMENT</small><button id="ccg-r72-death-continue" type="button">CONTINUE</button><em>ENTER / SPACE SKIPS THE WAIT</em></div>';
    host.appendChild(node);
    node.querySelector("#ccg-r72-death-continue")?.addEventListener("click",confirmDeath);
    return node
  }

  function showDeath(event){
    ensureStyle();const detail=event?.detail||{},node=ensureDeathOverlay();
    const source=node.querySelector("#ccg-r72-death-source"),loss=node.querySelector("#ccg-r72-death-loss");
    if(source)source.textContent=`DEFEATED BY ${safeSource(detail.source)}`;
    const bits=[];if(Number(detail.scoreLost)>0)bits.push(`${Number(detail.scoreLost).toLocaleString()} SCORE LOST`);if(Number(detail.xpLost)>0)bits.push(`${Number(detail.xpLost).toLocaleString()} XP MOVED TO DEATH CACHE`);if(detail.cacheActive)bits.push("DEATH CACHE MARKED ON MAP");
    if(loss)loss.textContent=bits.join(" · ")||"NO SCORE OR XP LOST";
    node.classList.add("active");node.setAttribute("aria-hidden","false");
    if(state.autoConfirmTimer)clearTimeout(state.autoConfirmTimer);
    state.deathShows++;state.lastDeath={...detail,at:Date.now()};state.active=true;state.confirming=false;state.shownAt=performance.now();
    state.autoConfirmTimer=setTimeout(()=>{state.autoConfirmTimer=0;confirmDeath()},AUTO_CONFIRM_MS);
    requestAnimationFrame(()=>node.querySelector("#ccg-r72-death-continue")?.focus?.({preventScroll:true}))
  }

  function hideDeath(){
    const node=document.getElementById("ccg-r72-death-feedback");
    if(node){node.classList.remove("active");node.setAttribute("aria-hidden","true")}
    if(state.autoConfirmTimer){clearTimeout(state.autoConfirmTimer);state.autoConfirmTimer=0}
    state.active=false;state.confirming=false
  }

  function confirmDeath(){
    if(!state.active||state.confirming)return false;
    state.confirming=true;state.confirmations++;
    try{dispatchEvent(new CustomEvent("ccg:death-confirmed",{detail:{playerId:String(state.lastDeath?.playerId||""),at:Date.now()}}));return true}
    catch(_){state.confirming=false;return false}
  }

  function onDeathKey(event){
    if(!state.active||event.repeat||event.altKey||event.ctrlKey||event.metaKey)return;
    if(event.code!=="Enter"&&event.code!=="NumpadEnter"&&event.code!=="Space")return;
    event.preventDefault();event.stopImmediatePropagation();confirmDeath()
  }

  ensureStyle();
  window.addEventListener("ccg:player-death",showDeath);
  window.addEventListener("ccg:respawn-confirmed",hideDeath);
  window.addEventListener("keydown",onDeathKey,true);
  window.CCGLostSizzlerV142R72MapDeathFeedback=Object.freeze({version:"V10.42-r79-timed-death-feedback",AUTO_CONFIRM_MS,state,showDeath,confirmDeath,hideDeath});
})();