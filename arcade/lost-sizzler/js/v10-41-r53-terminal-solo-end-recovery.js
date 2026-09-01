/* The Lost Sizzler V10.41 r53 — terminal Solo end-screen recovery.
 *
 * XP/permadeath rules remain owned by progression + game-play. This layer only
 * protects the final presentation boundary after run.xpGameOver has already
 * been set. If the terminal Solo end chain throws, or returns without exposing
 * the end overlay, it restores a usable GAME OVER result screen. Every other
 * ending keeps the canonical error behaviour.
 */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V141_R53_TERMINAL_SOLO_END_RECOVERY__)return;
  window.__CCG_LOST_SIZZLER_V141_R53_TERMINAL_SOLO_END_RECOVERY__=true;

  const MARKER="__ccgV141R53TerminalSoloEndRecovery";
  const state={wraps:0,recoveredThrows:0,recoveredHidden:0,handling:false,observer:null,lastError:""};
  const esc=value=>String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]||char));
  const safeNumber=(value,fallback=0)=>{const n=Number(value);return Number.isFinite(n)?n:fallback};
  const pad=value=>String(Math.max(0,Math.floor(safeNumber(value)))).padStart(6,"0");

  function terminalSolo(){
    try{
      const special=String(window.CCGLostSizzlerSpecialModes?.active?.type||document.body?.dataset?.specialMode||"");
      return Boolean(run?.xpGameOver===true&&!run?.daily&&playMode==="solo"&&!p2&&!special)
    }catch(_){return false}
  }

  function fallbackCopy(reason){
    let currentRun=null,currentScore=0;
    try{currentRun=run}catch(_){}
    try{currentScore=score}catch(_){}
    const deepest=Math.max(1,Math.floor(safeNumber(currentRun?.deepest??currentRun?.floor,1)));
    const maxFloors=Math.max(deepest,Math.floor(safeNumber(window.CCG_CONFIG?.maxFloors,5)));
    const banked=Math.max(0,Math.floor(safeNumber(currentRun?.bankedXP,0)));
    const kills=Math.max(0,Math.floor(safeNumber(currentRun?.stats?.kills,0)));
    const champions=Math.max(0,Math.floor(safeNumber(currentRun?.stats?.champions,0)));
    const secrets=Math.max(0,Math.floor(safeNumber(currentRun?.stats?.secrets,0)));
    const damage=Math.max(0,Math.floor(safeNumber(currentRun?.stats?.damageTaken,0)));
    const friendly=Math.max(0,Math.floor(safeNumber(currentRun?.stats?.friendlyFire,0)));
    return `${esc(reason||"Game over: XP reached zero for the second time after the final warning")}.<br><br><strong>FINAL SCORE ${pad(currentScore)}</strong><br>Deepest floor: ${deepest}/${maxFloors}<br>XP safely kept from cleared floors: ${banked}<br>Kills: ${kills}<br>Champions: ${champions}<br>Secrets: ${secrets}<br>Damage taken: ${damage}<br>Friendly fire: ${friendly}`
  }

  function hideConflictingPanels(){
    for(const id of ["pause","floor-complete","inventory-panel","shop-panel","save-panel","level-up","artefact-choice-panel"]){
      try{document.getElementById(id)?.classList.add("hidden")}catch(_){}
    }
  }

  function presentFallback(reason,error=null){
    if(!terminalSolo())return false;
    const end=document.getElementById("end"),title=document.getElementById("end-title"),text=document.getElementById("end-text");
    if(!end||!title||!text)return false;
    try{mode="ended"}catch(_){}
    try{input?.clear?.()}catch(_){}
    try{window.CCGSound?.setStalkerNear?.(false)}catch(_){}
    try{window.CCGSound?.setNamedEnemy?.(null)}catch(_){}
    try{window.CCGSound?.stopMusic?.()}catch(_){}
    hideConflictingPanels();
    title.textContent="GAME OVER — XP DEPLETED";
    if(!/FINAL SCORE/i.test(text.textContent||""))text.innerHTML=fallbackCopy(reason);
    end.classList.remove("hidden");
    document.body.dataset.runActive="false";
    try{document.exitPointerLock?.()}catch(_){}
    try{refreshCollection?.()}catch(_){}
    try{render?.()}catch(_){}
    if(error){state.lastError=String(error?.message||error||"").slice(0,240);try{console.error("[Lost Sizzler r53] recovered terminal Solo end presentation",error)}catch(_){}}
    return true
  }

  function ensureTerminalVisible(reason){
    if(!terminalSolo())return false;
    const end=document.getElementById("end");
    if(end&&!end.classList.contains("hidden"))return false;
    if(!presentFallback(reason))return false;
    state.recoveredHidden++;return true
  }

  function install(){
    const current=window.endRun;if(typeof current!=="function"||current[MARKER])return false;
    function guardedTerminalSoloEnd(reason,...rest){
      if(state.handling)return current.apply(this,[reason,...rest]);
      const terminal=terminalSolo();
      if(!terminal)return current.apply(this,[reason,...rest]);
      state.handling=true;
      try{
        const result=current.apply(this,[reason,...rest]);
        queueMicrotask(()=>ensureTerminalVisible(reason));
        return result
      }catch(error){
        if(!presentFallback(reason,error))throw error;
        state.recoveredThrows++;return undefined
      }finally{state.handling=false}
    }
    guardedTerminalSoloEnd[MARKER]=true;
    guardedTerminalSoloEnd.__ccgOriginal=current;
    window.endRun=guardedTerminalSoloEnd;state.wraps++;return true
  }

  function watchLateScripts(){
    if(state.observer||!document.head||!window.MutationObserver)return;
    state.observer=new MutationObserver(records=>{
      for(const record of records)for(const node of record.addedNodes||[]){
        if(node?.nodeName!=="SCRIPT")continue;
        node.addEventListener?.("load",()=>queueMicrotask(install),{once:true});
      }
    });
    state.observer.observe(document.head,{childList:true})
  }

  install();watchLateScripts();
  document.addEventListener("DOMContentLoaded",install,{once:true});
  addEventListener("load",install,{once:true});
  addEventListener("pagehide",()=>state.observer?.disconnect(),{once:true});
  document.body.dataset.v141R53TerminalSoloEndRecovery="true";
  window.CCGLostSizzlerV141R53TerminalSoloEndRecovery={terminalSolo,presentFallback,ensureTerminalVisible,install,get state(){return state}};
})();

/* R54 is loaded from the existing final recovery edge so it runs after every
 * other V10.41 late guard without altering the canonical engine load order. */
(()=>{
  "use strict";
  const marker="data-ccg-v141-r54-playtest-regressions";
  if(document.querySelector(`script[${marker}="true"]`))return;
  const rev=String(document.querySelector('meta[name="ccg-lost-sizzler-cache"]')?.content||document.querySelector('meta[name="ccg-lost-sizzler-build"]')?.content||"latest").trim();
  const script=document.createElement("script");
  script.src=`js/v10-41-r54-playtest-regressions.js?v=${encodeURIComponent(rev)}`;
  script.async=false;
  script.setAttribute(marker,"true");
  document.head.appendChild(script);
})();

/* R55 closes the final live-playtest menu/Horde boundaries after R54. */
(()=>{
  "use strict";
  const marker="data-ccg-v141-r55-final-playtest-cleanup";
  if(document.querySelector(`script[${marker}="true"]`))return;
  const rev=String(document.querySelector('meta[name="ccg-lost-sizzler-cache"]')?.content||document.querySelector('meta[name="ccg-lost-sizzler-build"]')?.content||"latest").trim();
  const script=document.createElement("script");
  script.src=`js/v10-41-r55-final-playtest-cleanup.js?v=${encodeURIComponent(rev)}`;
  script.async=false;
  script.setAttribute(marker,"true");
  document.head.appendChild(script);
})();
