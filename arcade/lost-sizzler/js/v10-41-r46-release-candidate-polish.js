/* The Lost Sizzler V10.41 r46 — release-candidate observability, results and accessibility.
 *
 * This late layer does not own combat, movement, saves or multiplayer authority.
 * It observes the canonical runtime, records small local lifetime statistics,
 * enriches the existing end screen, adds opt-in accessibility preferences and
 * sends coarse gameplay milestones through the existing feedback telemetry path.
 */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V141_R46_RELEASE_CANDIDATE_POLISH__)return;
  window.__CCG_LOST_SIZZLER_V141_R46_RELEASE_CANDIDATE_POLISH__=true;

  const STATS_KEY="ccg-lost-sizzler-lifetime-stats-v1";
  const PREFS_KEY="ccg-lost-sizzler-accessibility-v1";
  const SESSION_KEY="ccg-lost-sizzler-r46-session";
  const FUNCTION_NAME="lost-sizzler-feedback";
  const BUILD="V10.41-r46";
  const VALID_MODES=new Set(["solo","online","split","daily","tutorial","horde-survivor","sizzler-saboteurs"]);
  const state={
    runActive:false,runStartedAt:0,startScore:0,lastFloor:0,lastKills:0,lastMode:"unknown",
    telemetrySent:0,telemetryFailed:0,endsRecorded:0,floorsRecorded:0,resultsRendered:0,
    observer:null,endObserver:null,timer:0,optionsOpen:false,statsOpen:false
  };

  const safe=value=>String(value??"").trim();
  const num=(value,fallback=0)=>{const n=Number(value);return Number.isFinite(n)?n:fallback};
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
  const textNumber=value=>num(String(value??"").replace(/[^0-9.-]/g,""),0);
  const deepClone=value=>{try{return JSON.parse(JSON.stringify(value))}catch(_){return null}};

  function modeName(){
    try{
      const special=safe(window.CCGLostSizzlerSpecialModes?.active?.type||document.body?.dataset?.specialMode);
      if(special)return special;
      if(document.body?.dataset?.tutorialActive==="true")return"tutorial";
      if(run?.daily)return"daily";
      if(p2&&safe(playMode)==="split")return"split";
      const current=safe(playMode||"");
      return VALID_MODES.has(current)?current:(current||"unknown");
    }catch(_){return"unknown"}
  }

  function floorNow(){
    try{const canonical=Math.floor(num(run?.floor,0));if(canonical>0)return canonical}catch(_){}
    const hud=safe(document.getElementById("hud-room")?.textContent),match=hud.match(/\bF(?:LOOR)?\s*([1-9]\d*)\b/i);
    return Math.max(1,Math.floor(num(match?.[1],1)))
  }
  function scoreNow(){try{return Math.max(0,Math.floor(num(score,0)))}catch(_){return Math.max(0,Math.floor(textNumber(document.getElementById("hud-score")?.textContent)))}}
  function killsNow(){return Math.max(0,Math.floor(textNumber(document.getElementById("hud-kills")?.textContent)))}
  function levelNow(){try{return Math.max(1,Math.floor(num(p1?.level,1)))}catch(_){return Math.max(1,Math.floor(textNumber(document.getElementById("quick-level")?.textContent)||1))}}
  function activeRun(){return document.body?.dataset?.runActive==="true"}
  function elapsedMs(){return state.runStartedAt?Math.max(0,Date.now()-state.runStartedAt):0}
  function formatTime(ms){const seconds=Math.max(0,Math.floor(num(ms)/1000)),minutes=Math.floor(seconds/60);return `${String(minutes).padStart(2,"0")}:${String(seconds%60).padStart(2,"0")}`}
  function sessionToken(){
    try{let token=sessionStorage.getItem(SESSION_KEY);if(!token){token=crypto.randomUUID?.()||`${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;sessionStorage.setItem(SESSION_KEY,token)}return token}catch(_){return"r46-session"}
  }

  function emptyStats(){return{version:1,runs:0,wins:0,deaths:0,totalScore:0,bestScore:0,deepestFloor:0,totalKills:0,totalPlayMs:0,lastPlayedAt:0,modes:{}}}
  function loadStats(){
    try{const parsed=JSON.parse(localStorage.getItem(STATS_KEY)||"null");return parsed&&Number(parsed.version)===1?{...emptyStats(),...parsed,modes:{...(parsed.modes||{})}}:emptyStats()}catch(_){return emptyStats()}
  }
  function saveStats(stats){try{localStorage.setItem(STATS_KEY,JSON.stringify(stats))}catch(_){}return stats}
  function modeStats(stats,mode){const key=safe(mode)||"unknown";return stats.modes[key]||{runs:0,wins:0,deaths:0,bestScore:0,deepestFloor:0,totalKills:0,totalPlayMs:0}}

  function defaultPrefs(){return{version:1,reducedMotion:false,reducedFlashes:false,largeText:false,musicPercent:30}}
  function loadPrefs(){try{const parsed=JSON.parse(localStorage.getItem(PREFS_KEY)||"null");return parsed&&Number(parsed.version)===1?{...defaultPrefs(),...parsed,version:1}:defaultPrefs()}catch(_){return defaultPrefs()}}
  function savePrefs(prefs){try{localStorage.setItem(PREFS_KEY,JSON.stringify({...defaultPrefs(),...prefs,version:1}))}catch(_){}applyPrefs(prefs);return prefs}
  function applyPrefs(source=loadPrefs()){
    const prefs={...defaultPrefs(),...(source||{})};
    document.body.classList.toggle("ccg-reduced-motion",Boolean(prefs.reducedMotion));
    document.body.classList.toggle("ccg-reduced-flashes",Boolean(prefs.reducedFlashes));
    document.body.classList.toggle("ccg-large-text",Boolean(prefs.largeText));
    try{window.CCGSound?.setMusicLevel?.(clamp(num(prefs.musicPercent,30),0,100)*0.0025)}catch(_){}
    const pct=document.getElementById("ccg-r46-music-value");if(pct)pct.textContent=`${Math.round(clamp(num(prefs.musicPercent,30),0,100))}%`;
    return prefs
  }

  function deviceType(){
    const touch=navigator.maxTouchPoints>0||matchMedia?.("(pointer: coarse)")?.matches;
    if(!touch&&innerWidth>900)return"desktop";
    if(touch&&Math.min(screen.width||innerWidth,screen.height||innerHeight)>=700)return"tablet";
    return touch?"mobile":"desktop"
  }
  async function telemetry(eventType,metadata={}){
    try{
      const client=await window.ccgSupabase?.getClient?.();if(!client)return false;
      const body={action:"telemetry",event_type:safe(eventType).slice(0,50),player_name:safe(document.getElementById("player-name")?.value||"CCG Player").slice(0,40),play_mode:safe(metadata.play_mode||modeName()).slice(0,40),device_type:deviceType(),session_token:sessionToken(),build:BUILD,page_url:location.href,metadata:deepClone(metadata)||{}};
      const {data,error}=await client.functions.invoke(FUNCTION_NAME,{body});
      if(error||data?.success===false){state.telemetryFailed++;return false}
      state.telemetrySent++;return true
    }catch(_){state.telemetryFailed++;return false}
  }

  function recordRunStart(){
    if(state.runActive)return false;
    state.runActive=true;state.runStartedAt=Date.now();state.startScore=scoreNow();state.lastFloor=floorNow();state.lastKills=killsNow();state.lastMode=modeName();
    const stats=loadStats(),mode=modeStats(stats,state.lastMode);stats.runs++;mode.runs++;stats.modes[state.lastMode]=mode;stats.lastPlayedAt=Date.now();saveStats(stats);
    telemetry("run_started_detail",{play_mode:state.lastMode,floor:state.lastFloor});
    telemetry("floor_reached",{play_mode:state.lastMode,floor:state.lastFloor});
    return true
  }

  function inferOutcome(){
    const title=safe(document.getElementById("end-title")?.textContent).toLowerCase(),body=safe(document.getElementById("end-text")?.textContent).toLowerCase();
    if(/complete|victory|winner|won|escaped|surviv/.test(`${title} ${body}`)&&!/game over|defeat|died|dead/.test(`${title} ${body}`))return"win";
    if(/game over|defeat|died|dead|permadeath/.test(`${title} ${body}`))return"death";
    return"ended"
  }

  function runSnapshot(outcome=inferOutcome()){
    return{mode:state.lastMode||modeName(),outcome,floor:Math.max(state.lastFloor,floorNow()),score:scoreNow(),kills:Math.max(state.lastKills,killsNow()),level:levelNow(),durationMs:elapsedMs(),endedAt:Date.now()}
  }

  function renderEndSummary(snapshot){
    const host=document.getElementById("end-text");if(!host||!snapshot)return false;
    let box=document.getElementById("ccg-r46-run-results");if(!box){box=document.createElement("section");box.id="ccg-r46-run-results";box.className="ccg-r46-run-results";host.appendChild(box)}
    const stats=loadStats();
    box.innerHTML=`<h3>RUN REPORT</h3><div class="ccg-r46-result-grid"><span><b>SCORE</b><strong>${snapshot.score.toLocaleString()}</strong></span><span><b>FLOOR</b><strong>${snapshot.floor}</strong></span><span><b>ENEMIES SLAIN</b><strong>${snapshot.kills}</strong></span><span><b>LEVEL</b><strong>${snapshot.level}</strong></span><span><b>RUN TIME</b><strong>${formatTime(snapshot.durationMs)}</strong></span><span><b>BEST SCORE</b><strong>${Math.max(stats.bestScore,snapshot.score).toLocaleString()}</strong></span></div>`;
    state.resultsRendered++;return true
  }

  function recordRunEnd(outcome=inferOutcome()){
    if(!state.runActive)return false;
    const snapshot=runSnapshot(outcome),stats=loadStats(),mode=modeStats(stats,snapshot.mode);
    stats.totalScore+=snapshot.score;stats.bestScore=Math.max(stats.bestScore,snapshot.score);stats.deepestFloor=Math.max(stats.deepestFloor,snapshot.floor);stats.totalKills+=snapshot.kills;stats.totalPlayMs+=snapshot.durationMs;stats.lastPlayedAt=Date.now();
    mode.bestScore=Math.max(mode.bestScore,snapshot.score);mode.deepestFloor=Math.max(mode.deepestFloor,snapshot.floor);mode.totalKills+=snapshot.kills;mode.totalPlayMs+=snapshot.durationMs;
    if(snapshot.outcome==="win"){stats.wins++;mode.wins++}else if(snapshot.outcome==="death"){stats.deaths++;mode.deaths++}
    stats.modes[snapshot.mode]=mode;saveStats(stats);renderEndSummary(snapshot);
    telemetry("run_ended",{play_mode:snapshot.mode,outcome:snapshot.outcome,floor:snapshot.floor,score:snapshot.score,kills:snapshot.kills,level:snapshot.level,duration_ms:snapshot.durationMs});
    state.endsRecorded++;state.runActive=false;state.runStartedAt=0;return snapshot
  }

  function observeFloor(){
    if(!state.runActive)return;
    const floor=floorNow(),kills=killsNow();state.lastKills=Math.max(state.lastKills,kills);
    if(floor>state.lastFloor){
      const previous=state.lastFloor;state.lastFloor=floor;state.floorsRecorded++;
      telemetry("floor_cleared",{play_mode:state.lastMode,floor:previous,next_floor:floor,score:scoreNow(),kills});
      telemetry("floor_reached",{play_mode:state.lastMode,floor,score:scoreNow(),kills});
    }
  }

  function ensureStyles(){
    if(document.getElementById("ccg-r46-styles"))return;
    const style=document.createElement("style");style.id="ccg-r46-styles";style.textContent=`
      .ccg-r46-run-results{margin:14px 0 4px;padding:12px;border:1px solid rgba(108,236,255,.42);background:rgba(3,8,18,.74);text-align:left}.ccg-r46-run-results h3{margin:0 0 9px;color:#6cecff;letter-spacing:1px}.ccg-r46-result-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}.ccg-r46-result-grid span{padding:7px;border:1px solid rgba(255,255,255,.11);background:rgba(255,255,255,.025)}.ccg-r46-result-grid b{display:block;font-size:9px;color:#aab7c9}.ccg-r46-result-grid strong{display:block;margin-top:3px;font-size:14px;color:#fff}
      .ccg-r46-options-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:12px 0}.ccg-r46-option{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.025);text-align:left}.ccg-r46-option input[type=range]{width:150px}.ccg-r46-option small{display:block;color:#9eacbd;margin-top:3px}.ccg-r46-stats-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:12px 0}.ccg-r46-stats-grid span{padding:10px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.025)}.ccg-r46-stats-grid b{display:block;font-size:9px;color:#aab7c9}.ccg-r46-stats-grid strong{display:block;margin-top:4px;font-size:16px;color:#fff}
      body.ccg-reduced-motion .ccg-game *,body.ccg-reduced-motion .ccg-game *::before,body.ccg-reduced-motion .ccg-game *::after{animation-duration:.001ms!important;animation-iteration-count:1!important;transition-duration:.001ms!important;scroll-behavior:auto!important}
      body.ccg-reduced-flashes .ccg-game .flash,body.ccg-reduced-flashes .ccg-game [class*="flash"],body.ccg-reduced-flashes .ccg-game [class*="screen-shake"]{animation:none!important;opacity:.18!important}
      body.ccg-reduced-flashes .spy-r45-trap-fx{backdrop-filter:none!important;-webkit-backdrop-filter:none!important}
      body.ccg-large-text .ccg-game .panel p,body.ccg-large-text .ccg-game .panel button,body.ccg-large-text .ccg-game .panel label,body.ccg-large-text .ccg-game .panel small,body.ccg-large-text .game-message-rail{font-size:max(12px,1em)!important;line-height:1.45!important}
      @media(max-width:800px){.ccg-r46-result-grid,.ccg-r46-stats-grid,.ccg-r46-options-grid{grid-template-columns:1fr 1fr}.ccg-r46-option{grid-column:1/-1}}
    `;document.head.appendChild(style)
  }

  function makeOverlay(id,title){
    let overlay=document.getElementById(id);if(overlay)return overlay;
    overlay=document.createElement("div");overlay.id=id;overlay.className="overlay hidden";overlay.innerHTML=`<div class="panel v10-info-panel"><h2>${title}</h2><div data-body></div><div class="menu-buttons"><button type="button" class="primary" data-close>Back to Menu</button></div></div>`;
    document.querySelector(".game-area")?.appendChild(overlay);overlay.querySelector("[data-close]")?.addEventListener("click",()=>overlay.classList.add("hidden"));return overlay
  }

  function openOptions(){
    const overlay=makeOverlay("ccg-r46-options","Accessibility & Audio"),body=overlay.querySelector("[data-body]"),prefs=loadPrefs();
    body.innerHTML=`<p>These preferences are stored only in this browser and do not alter difficulty, scoring or multiplayer rules.</p><div class="ccg-r46-options-grid">
      <label class="ccg-r46-option"><span><b>REDUCED MOTION</b><small>Minimises UI animation and transitions.</small></span><input type="checkbox" data-pref="reducedMotion" ${prefs.reducedMotion?"checked":""}></label>
      <label class="ccg-r46-option"><span><b>REDUCED FLASHES</b><small>Softens flashing and trap-view effects.</small></span><input type="checkbox" data-pref="reducedFlashes" ${prefs.reducedFlashes?"checked":""}></label>
      <label class="ccg-r46-option"><span><b>LARGER TEXT</b><small>Increases informational and menu text.</small></span><input type="checkbox" data-pref="largeText" ${prefs.largeText?"checked":""}></label>
      <label class="ccg-r46-option"><span><b>MUSIC LEVEL</b><small>Independent of the existing Sound On/Off switch.</small></span><span><input type="range" min="0" max="100" step="5" value="${clamp(num(prefs.musicPercent,30),0,100)}" data-pref="musicPercent"><b id="ccg-r46-music-value">${Math.round(clamp(num(prefs.musicPercent,30),0,100))}%</b></span></label>
    </div>`;
    body.querySelectorAll("[data-pref]").forEach(input=>input.addEventListener("input",()=>{const next=loadPrefs(),key=input.dataset.pref;next[key]=input.type==="checkbox"?input.checked:num(input.value,30);savePrefs(next)}));
    overlay.classList.remove("hidden");state.optionsOpen=true
  }

  function openStats(){
    const overlay=makeOverlay("ccg-r46-stats","Player Statistics"),body=overlay.querySelector("[data-body]"),stats=loadStats();
    body.innerHTML=`<p>Lifetime statistics stored on this browser. They are separate from achievements and do not affect gameplay.</p><div class="ccg-r46-stats-grid"><span><b>RUNS</b><strong>${stats.runs}</strong></span><span><b>WINS</b><strong>${stats.wins}</strong></span><span><b>DEATHS</b><strong>${stats.deaths}</strong></span><span><b>BEST SCORE</b><strong>${stats.bestScore.toLocaleString()}</strong></span><span><b>DEEPEST FLOOR</b><strong>${stats.deepestFloor}</strong></span><span><b>ENEMIES SLAIN</b><strong>${stats.totalKills.toLocaleString()}</strong></span><span><b>TOTAL PLAY</b><strong>${formatTime(stats.totalPlayMs)}</strong></span><span><b>AVERAGE SCORE</b><strong>${stats.runs?Math.round(stats.totalScore/stats.runs).toLocaleString():"0"}</strong></span><span><b>MODES PLAYED</b><strong>${Object.keys(stats.modes).filter(key=>stats.modes[key]?.runs).length}</strong></span></div>`;
    overlay.classList.remove("hidden");state.statsOpen=true
  }

  function installButtons(){
    const menu=document.querySelector(".secondary-menu");if(!menu)return false;
    if(!document.getElementById("ccg-r46-options-btn")){const button=document.createElement("button");button.id="ccg-r46-options-btn";button.type="button";button.textContent="Accessibility & Audio";button.addEventListener("click",openOptions);menu.insertBefore(button,menu.lastElementChild)}
    if(!document.getElementById("ccg-r46-stats-btn")){const button=document.createElement("button");button.id="ccg-r46-stats-btn";button.type="button";button.textContent="Player Statistics";button.addEventListener("click",openStats);menu.insertBefore(button,menu.lastElementChild)}
    return true
  }

  function onEndVisibility(){
    const end=document.getElementById("end");if(!end||end.classList.contains("hidden"))return;
    if(state.runActive)recordRunEnd();else if(!document.getElementById("ccg-r46-run-results"))renderEndSummary(runSnapshot())
  }
  function installObservers(){
    state.observer=new MutationObserver(()=>{const active=activeRun();if(active&&!state.runActive)recordRunStart();else if(!active&&state.runActive&&document.getElementById("end")?.classList.contains("hidden"))recordRunEnd("ended")});
    state.observer.observe(document.body,{attributes:true,attributeFilter:["data-run-active"]});
    const end=document.getElementById("end");if(end){state.endObserver=new MutationObserver(onEndVisibility);state.endObserver.observe(end,{attributes:true,attributeFilter:["class"]})}
    if(activeRun())recordRunStart();state.timer=setInterval(observeFloor,500)
  }

  function cleanup(){state.observer?.disconnect();state.endObserver?.disconnect();if(state.timer)clearInterval(state.timer);state.timer=0}
  ensureStyles();installButtons();applyPrefs();installObservers();
  addEventListener("pagehide",cleanup,{once:true});
  window.CCGLostSizzlerV141R46ReleaseCandidatePolish={STATS_KEY,PREFS_KEY,loadStats,saveStats,loadPrefs,savePrefs,applyPrefs,recordRunStart,recordRunEnd,renderEndSummary,openOptions,openStats,telemetry,get state(){return state}};
})();