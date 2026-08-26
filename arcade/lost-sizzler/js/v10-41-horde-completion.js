/* The Lost Sizzler V10.41 — Solo Horde, persistent rankings and movement ownership. */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V141_HORDE_COMPLETION__)return;
  window.__CCG_LOST_SIZZLER_V141_HORDE_COMPLETION__=true;

  const STORAGE_KEY="ccg-lost-sizzler:horde-leaderboard:v1";
  const CATEGORIES=Object.freeze(["SOLO","DUO","TRIO","SQUAD"]);
  const state={installed:false,aiWrapped:false,controllerOwnedUpdate:true,timer:0,lastResultKey:"",category:"SOLO",startingSolo:false};

  const special=()=>window.CCGLostSizzlerSpecialModes||null;
  const active=()=>special()?.active||null;
  const H=()=>window.CCGLostSizzlerHorde||null;
  const isHorde=()=>active()?.type==="horde-survivor";
  const isHordeAuthority=()=>Boolean(isHorde()&&active()?.authoritative);
  const html=value=>String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));

  function playerDisplayName(){
    try{return String(typeof playerName==="function"?playerName():document.getElementById("player-name")?.value||"CCG Player").trim().slice(0,18)||"CCG Player"}
    catch(_){return"CCG Player"}
  }

  function makeSoloSeed(){
    try{
      const bytes=new Uint32Array(2);crypto.getRandomValues(bytes);
      return`HORDE-SOLO-${bytes[0].toString(36)}${bytes[1].toString(36)}`.toUpperCase();
    }catch(_){return`HORDE-SOLO-${Date.now().toString(36)}`.toUpperCase()}
  }

  function startSoloHorde(){
    if(state.startingSolo||document.body?.dataset?.runActive==="true")return false;
    const api=special();if(!api?.startOnline||!net)return false;
    state.startingSolo=true;
    try{
      const name=playerDisplayName();
      net.setSolo(name);
      const id=String(net.sessionId||"P1"),seed=makeSoloSeed();
      const started=api.startOnline({roomMode:"horde-survivor",players:[{id,name}],hostId:id,seed,roomCode:"SOLO"});
      if(!started){state.startingSolo=false;return false}
      document.body.dataset.hordeSolo="true";
      try{showToast("SOLO HORDE SURVIVOR","Ten waves. No room code, no network required. Survive the siege.","gold",7600)}catch(_){}
      return true;
    }catch(error){
      console.warn("[Lost Sizzler V10.41] Solo Horde start failed",error);
      try{showToast("SOLO HORDE COULD NOT START","The Horde runtime was not ready. Refresh the game and try again.","red",7500)}catch(_){}
      return false;
    }finally{setTimeout(()=>{state.startingSolo=false},300)}
  }

  function injectStyles(){
    if(document.getElementById("ccg-v141-horde-completion-style"))return;
    const style=document.createElement("style");style.id="ccg-v141-horde-completion-style";style.textContent=`
      #horde-solo-btn{border-color:#ffb84d;background:linear-gradient(180deg,rgba(117,58,14,.96),rgba(54,25,8,.98));box-shadow:inset 0 0 18px rgba(255,184,77,.12)}
      #horde-leaderboard{margin:14px 0;padding:14px;border:1px solid rgba(255,216,90,.44);border-radius:12px;background:linear-gradient(145deg,rgba(20,12,27,.92),rgba(7,5,12,.96));text-align:left}
      #horde-leaderboard .horde-board-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:10px}
      #horde-leaderboard h3{margin:0;color:#ffd85a;font-size:15px;letter-spacing:.07em}
      #horde-leaderboard .horde-board-head span{max-width:540px;color:#bfb4ca;font-size:10px;line-height:1.45;text-align:right}
      #horde-leaderboard .horde-board-tabs{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;margin-bottom:9px}
      #horde-leaderboard .horde-board-tabs button{min-height:34px;padding:6px;font-size:10px}
      #horde-leaderboard .horde-board-tabs button[aria-pressed="true"]{border-color:#ffd85a;color:#ffd85a;background:rgba(255,216,90,.1)}
      #horde-leaderboard ol{display:grid;gap:5px;margin:0;padding:0;list-style:none}
      #horde-leaderboard li{display:grid;grid-template-columns:28px minmax(0,1fr) auto auto;gap:8px;align-items:center;padding:7px 8px;border:1px solid rgba(185,120,255,.16);background:rgba(255,255,255,.025);font:700 10px/1.25 "Courier New",monospace}
      #horde-leaderboard li .rank{color:#ffd85a;text-align:center}#horde-leaderboard li .names{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#f5eff9}
      #horde-leaderboard li .wave{color:#6cecff}#horde-leaderboard li .score{color:#72ff9b;text-align:right}
      #horde-leaderboard .horde-empty{padding:11px;color:#9d91a8;text-align:center;font-size:10px}
      #horde-transition-banner{display:none;position:absolute;left:50%;top:45%;z-index:96;transform:translate(-50%,-50%);min-width:min(520px,78%);padding:13px 18px;border:2px solid #ffd85a;background:rgba(5,3,9,.93);box-shadow:0 0 30px rgba(255,216,90,.18);pointer-events:none;text-align:center;font-family:"Courier New",monospace}
      body[data-special-mode="horde-survivor"] #horde-transition-banner[data-visible="true"]{display:block}
      #horde-transition-banner b{display:block;color:#ffd85a;font-size:17px}#horde-transition-banner span{display:block;margin-top:5px;color:#6cecff;font-size:11px}
      @media(max-width:700px){#horde-leaderboard .horde-board-head{display:block}#horde-leaderboard .horde-board-head span{display:block;margin-top:5px;text-align:left}#horde-leaderboard li{grid-template-columns:24px minmax(0,1fr) auto}.horde-board-score{display:none!important}}
    `;document.head.appendChild(style)
  }

  function injectSoloButton(){
    if(document.getElementById("horde-solo-btn"))return;
    const multiplayer=document.getElementById("horde-mode-btn"),row=multiplayer?.parentElement||document.querySelector("#menu .game-mode-buttons");if(!row)return;
    const button=document.createElement("button");button.id="horde-solo-btn";button.type="button";button.className="game-mode-button mode-horde";button.textContent="Horde Survivor Solo";button.title="Play Horde Survivor alone without creating an online room.";
    button.addEventListener("click",event=>{event.preventDefault();event.stopPropagation();startSoloHorde()});
    row.insertBefore(button,multiplayer||null);
  }

  function readLeaderboard(){
    const empty=Object.fromEntries(CATEGORIES.map(category=>[category,[]]));
    try{
      const parsed=JSON.parse(localStorage.getItem(STORAGE_KEY)||"null");if(!parsed||typeof parsed!=="object")return empty;
      for(const category of CATEGORIES)empty[category]=Array.isArray(parsed[category])?parsed[category].slice(0,10):[];
    }catch(_){}
    return empty;
  }

  function resultSort(a,b){
    return Number(Boolean(b.bossDefeated))-Number(Boolean(a.bossDefeated))||Number(b.highestWave||0)-Number(a.highestWave||0)||Number(b.score||0)-Number(a.score||0)||Number(a.completionMs||Infinity)-Number(b.completionMs||Infinity)||Number(a.completedAt||0)-Number(b.completedAt||0)
  }

  function saveLeaderboard(data){
    if(!data||!CATEGORIES.includes(String(data.category)))return false;
    const board=readLeaderboard(),category=String(data.category),entry={
      category,players:(data.players||[]).map(player=>String(player?.name||"CCG Player").slice(0,18)),score:Math.max(0,Math.floor(Number(data.score)||0)),
      highestWave:Math.max(0,Math.floor(Number(data.highestWave)||0)),bossDefeated:Boolean(data.bossDefeated),completionMs:Math.max(0,Math.floor(Number(data.completionMs)||0)),
      seed:String(data.seed||""),completedAt:Number(data.completedAt||Date.now())
    };
    const duplicate=board[category].some(row=>row.seed===entry.seed&&Number(row.completedAt)===entry.completedAt);if(duplicate)return false;
    board[category].push(entry);board[category].sort(resultSort);board[category]=board[category].slice(0,10);
    try{localStorage.setItem(STORAGE_KEY,JSON.stringify(board))}catch(error){console.warn("[Lost Sizzler V10.41] Horde leaderboard storage unavailable",error);return false}
    renderLeaderboard();return true;
  }

  function formatTime(ms){
    const total=Math.max(0,Math.floor(Number(ms||0)/1000)),minutes=Math.floor(total/60),seconds=total%60;return`${minutes}:${String(seconds).padStart(2,"0")}`
  }

  function injectLeaderboard(){
    if(document.getElementById("horde-leaderboard"))return;
    const anchor=document.querySelector("#menu .online-howto")||document.querySelector("#menu .weekly-vault-section");if(!anchor)return;
    const section=document.createElement("section");section.id="horde-leaderboard";section.setAttribute("aria-label","Horde Survivor local leaderboard");section.innerHTML=`
      <div class="horde-board-head"><h3>HORDE SURVIVOR — BEST RUNS</h3><span>Top ten runs are saved in this browser. Rankings favour defeating the Warden, then highest wave, score and completion time.</span></div>
      <div class="horde-board-tabs" role="group" aria-label="Horde leaderboard category">${CATEGORIES.map(category=>`<button type="button" data-horde-category="${category}" aria-pressed="${category==="SOLO"?"true":"false"}">${category}</button>`).join("")}</div>
      <ol id="horde-leaderboard-list"></ol>`;
    anchor.insertAdjacentElement("afterend",section);
    section.addEventListener("click",event=>{const button=event.target?.closest?.("[data-horde-category]");if(!button)return;state.category=button.dataset.hordeCategory;renderLeaderboard()});
    renderLeaderboard();
  }

  function renderLeaderboard(){
    const section=document.getElementById("horde-leaderboard"),list=document.getElementById("horde-leaderboard-list");if(!section||!list)return;
    for(const button of section.querySelectorAll("[data-horde-category]"))button.setAttribute("aria-pressed",String(button.dataset.hordeCategory===state.category));
    const rows=readLeaderboard()[state.category]||[];
    if(!rows.length){list.innerHTML=`<li class="horde-empty">NO ${html(state.category)} HORDE RUNS SAVED YET</li>`;return}
    list.innerHTML=rows.map((row,index)=>`<li><span class="rank">#${index+1}</span><span class="names">${html((row.players||[]).join(" + ")||"CCG Player")}${row.bossDefeated?" · WARDEN DOWN":""}</span><span class="wave">W${Math.max(0,Number(row.highestWave)||0)} · ${formatTime(row.completionMs)}</span><span class="score horde-board-score">${Math.max(0,Number(row.score)||0).toLocaleString()}</span></li>`).join("");
  }

  function injectTransitionBanner(){
    if(document.getElementById("horde-transition-banner"))return;
    const area=document.querySelector(".game-area");if(!area)return;const banner=document.createElement("div");banner.id="horde-transition-banner";banner.dataset.visible="false";banner.innerHTML="<b>HORDE SURVIVOR</b><span>PREPARE YOURSELF</span>";area.appendChild(banner)
  }

  function updateTransitionBanner(){
    const banner=document.getElementById("horde-transition-banner");if(!banner)return;
    if(!isHorde()||!active()?.state){banner.dataset.visible="false";return}
    const runState=active().state,phase=String(runState.state||"");let title="",copy="";
    if(phase==="briefing"){title="HORDE SURVIVOR";copy="WAVE 1 INCOMING · AMMO ∞"}
    else if(phase==="intermission"){
      const remaining=Math.max(0,Math.ceil((Number(runState.intermissionEndsAt||0)-Date.now())/1000));title=`WAVE ${runState.wave} CLEARED · +5 HP`;copy=`NEXT WAVE IN ${remaining}s · RELOAD YOUR NERVES`;
    }else if(phase==="boss"&&runState.boss?.alive){title="THE HORDE WARDEN";copy=`HP ${Math.max(0,Math.ceil(Number(runState.boss.hp||0)))}/${Math.max(1,Math.ceil(Number(runState.boss.maxHp||runState.boss.hp||1)))}`}
    else if(phase==="victory"){title="HORDE DEFEATED";copy=`FINAL SCORE ${Math.max(0,Math.floor(Number(runState.score)||0)).toLocaleString()}`}
    else if(phase==="defeat"){title="NO SURVIVORS";copy=`WAVE ${Math.max(0,Number(runState.wave)||0)} · SCORE ${Math.max(0,Math.floor(Number(runState.score)||0)).toLocaleString()}`}
    if(!title){banner.dataset.visible="false";return}banner.querySelector("b").textContent=title;banner.querySelector("span").textContent=copy;banner.dataset.visible="true";
  }

  function captureTerminalResult(){
    if(!isHordeAuthority())return false;const runState=active()?.state,horde=H();if(!runState||!horde?.leaderboardResult||!["victory","defeat"].includes(runState.state))return false;
    const key=`${runState.seed||""}|${runState.startedAt||0}|${runState.state}`;if(state.lastResultKey===key)return false;
    const result=horde.leaderboardResult(runState);state.lastResultKey=key;
    if(saveLeaderboard(result))try{showToast("HORDE SCORE SAVED",`${result.category} · WAVE ${result.highestWave} · ${Math.floor(result.score).toLocaleString()} points saved to this browser's top ten.`,"green",7200)}catch(_){}
    return true;
  }

  /* V10.4 gives ordinary dungeon enemies a probabilistic projectile-evade step.
     Horde enemies deliberately do not use that system. The normal AI still gets
     to attack and choose targets, but any movement it attempts is rolled back;
     V10.38's dedicated inward-pressure driver moves the Horde afterwards. */
  function wrapEnemyAiMovement(){
    const ai=window.CCGAI;if(state.aiWrapped||!ai||typeof ai.stepEnemies!=="function")return state.aiWrapped;
    const original=ai.stepEnemies.bind(ai);
    ai.stepEnemies=function stepEnemiesV141HordeMovementOwnership(hostState,map,players,dt,hooks,worldState){
      if(!isHorde())return original(hostState,map,players,dt,hooks,worldState);
      const positions=new Map();for(const enemy of hostState?.enemies||[])if(enemy?.alive&&enemy.hordeEnemy)positions.set(String(enemy.id),{x:enemy.x,y:enemy.y});
      const result=original(hostState,map,players,dt,hooks,worldState);
      for(const enemy of hostState?.enemies||[]){const before=positions.get(String(enemy?.id||""));if(!before||!enemy?.alive)continue;enemy.x=before.x;enemy.y=before.y}
      return result;
    };
    state.aiWrapped=true;return true;
  }

  function postHordeCompletionFrame(){
    try{
      if(isHorde()){
        captureTerminalResult();
        updateTransitionBanner();
      }else{
        delete document.body.dataset.hordeSolo;
        updateTransitionBanner();
      }
      return true;
    }catch(error){
      console.warn("[Lost Sizzler V10.41] Horde completion update failed",error);
      return false;
    }
  }

  function install(){
    injectStyles();injectSoloButton();injectLeaderboard();injectTransitionBanner();
    const gate=window.CCGLostSizzlerReleaseGate;if(gate&&!gate.state?.ready)return false;
    if(!special()?.startOnline||!H()||!window.CCGLostSizzlerV138||!window.CCGLostSizzlerV140?.state?.installed)return false;
    if(!wrapEnemyAiMovement())return false;
    state.installed=true;document.body.dataset.v141HordeCompletion="true";return true;
  }

  state.timer=setInterval(()=>{injectStyles();injectSoloButton();injectLeaderboard();injectTransitionBanner();if(install()){clearInterval(state.timer);state.timer=0}},90);
  install();
  window.addEventListener("storage",event=>{if(event.key===STORAGE_KEY)renderLeaderboard()});
  window.addEventListener("pagehide",()=>{if(state.timer)clearInterval(state.timer)},{once:true});

  window.CCGLostSizzlerV141HordeCompletion={STORAGE_KEY,CATEGORIES,startSoloHorde,readLeaderboard,saveLeaderboard,renderLeaderboard,captureTerminalResult,updateTransitionBanner,postHordeCompletionFrame,get state(){return state}};
})();