/* C64 Dungeon Carnage V10.42 r72 — map/death feedback presentation. */
(()=>{
  "use strict";
  if(window.CCGLostSizzlerV142R72MapDeathFeedback)return;

  const STYLE="css/v10-42-r72-map-death-feedback.css";
  const state={deathShows:0,lastDeath:null,timer:0};

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
    node.setAttribute("aria-live","assertive");
    node.setAttribute("aria-hidden","true");
    node.innerHTML='<div class="ccg-r72-death-card"><span class="ccg-r72-death-kicker">C64 DUNGEON CARNAGE</span><strong>YOU DIED</strong><b id="ccg-r72-death-source">DEFEATED</b><span id="ccg-r72-death-loss"></span><small>RESPAWNING AT THE FLOOR ENTRANCE…</small></div>';
    host.appendChild(node);return node
  }

  function showDeath(event){
    ensureStyle();const detail=event?.detail||{},node=ensureDeathOverlay();
    clearTimeout(state.timer);
    const source=node.querySelector("#ccg-r72-death-source"),loss=node.querySelector("#ccg-r72-death-loss");
    if(source)source.textContent=`DEFEATED BY ${safeSource(detail.source)}`;
    const bits=[];if(Number(detail.scoreLost)>0)bits.push(`${Number(detail.scoreLost).toLocaleString()} SCORE LOST`);if(Number(detail.xpLost)>0)bits.push(`${Number(detail.xpLost).toLocaleString()} XP MOVED TO DEATH CACHE`);if(detail.cacheActive)bits.push("DEATH CACHE MARKED ON MAP");
    if(loss)loss.textContent=bits.join(" · ")||"RETURNING TO THE FLOOR ENTRANCE";
    node.classList.remove("fade");node.classList.add("active");node.setAttribute("aria-hidden","false");
    state.deathShows++;state.lastDeath={...detail,at:Date.now()};
    const duration=Math.max(900,Number(detail.duration)||1200);
    state.timer=setTimeout(()=>{node.classList.add("fade");setTimeout(()=>{node.classList.remove("active","fade");node.setAttribute("aria-hidden","true")},260)},Math.max(650,duration-220))
  }

  ensureStyle();
  window.addEventListener("ccg:player-death",showDeath);
  window.CCGLostSizzlerV142R72MapDeathFeedback=Object.freeze({version:"V10.42-r72-map-death-feedback",state,showDeath});
})();