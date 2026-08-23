/* The Lost Sizzler V10.16 — event-driven voice director. */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_VOICE_DIRECTOR_V116__)return;
  window.__CCG_LOST_SIZZLER_VOICE_DIRECTOR_V116__=true;

  const STORAGE_KEY="ccg-lost-sizzler-voice-enabled";
  const DEFAULT_ENABLED=true;
  const VOICE_ASSETS=window.CCG_ASSET_OVERRIDES?.audio?.voice||{};
  const state={enabled:readEnabled(),unlocked:false,active:null,activePriority:-1,queue:[],lastByKey:new Map(),lastPainAt:0,lastLowHealthAt:0,gildedFiveWarned:new Set(),voices:[],button:null};

  const lines={
    welcome:{text:"Welcome to The Lost Sizzler. Good luck down there.",priority:40,cooldown:10000},
    weeklyWelcome:{text:"Weekly High Score Vault. One attempt. Make it count.",priority:55,cooldown:10000},
    hurt:{variants:["Ow!","That hurt!","Watch it!","Oof!"],priority:8,cooldown:6500},
    lowHealth:{variants:["Low health.","Health critical.","You could really use a potion."],priority:35,cooldown:18000},
    noAmmo:{variants:["Ammo low.","You're running dry."],priority:25,cooldown:16000},
    secret:{variants:["Secret found.","Well spotted.","Hidden route discovered."],priority:38,cooldown:6000},
    objectiveHint:{variants:["Objective hint available.","You have been wandering for a while. Check your radar.","Need a nudge? Your next objective is now marked."],priority:45,cooldown:15000},
    objectiveNear:{variants:["Objective nearby.","You're getting warm."],priority:34,cooldown:10000},
    floorClear:{variants:["Floor cleared.","Nice work. Floor complete."],priority:60,cooldown:4000},
    gameOver:{variants:["Run over.","That's the run. Better luck next time."],priority:80,cooldown:4000},
    playerDeath:{variants:["Ouch. That looked expensive.","Back to the sanctuary with you.","That went well."],priority:70,cooldown:5000},
    deathStalker:{variants:["Death Stalker!","Death Stalker nearby. Keep moving."],priority:85,cooldown:12000},
    loadula:{variants:["Count Loadula!","Loadula has entered the dungeon."],priority:88,cooldown:12000},
    gildedElf:{variants:["Gilded Elf! Catch him!","Gold on legs. Thirty seconds!"],priority:80,cooldown:10000},
    gildedFive:{variants:["Five seconds!","He's about to vanish!"],priority:90,cooldown:5000},
    gildedCaught:{variants:["Jackpot!","Got him. Grab the gold!"],priority:82,cooldown:5000},
    gildedEscaped:{variants:["Too slow!","And he's gone."],priority:70,cooldown:5000},
    namedEnemy:{variants:["Named enemy ahead.","Something nasty has noticed you."],priority:52,cooldown:9000},
    rareLoot:{variants:["Rare loot!","That's worth picking up."],priority:30,cooldown:8000},
    levelUp:{variants:["Level up.","Upgrade available."],priority:45,cooldown:4000},
    shop:{variants:["Shop discovered.","Supplies ahead."],priority:28,cooldown:12000},
    sanctuary:{variants:["Sanctuary.","Safe room. For now."],priority:30,cooldown:12000},
    trap:{variants:["Trap!","Move!"],priority:58,cooldown:5000},
    boulder:{variants:["Boulder! Run!","Move! Move! Move!"],priority:76,cooldown:8000},
    weeklyDeath:{text:"Weekly Vault run over. Your score is being recorded.",priority:95,cooldown:6000},
    weeklyReset:{text:"Weekly Dungeon reset. A new ranked attempt is available.",priority:50,cooldown:60000}
  };

  function readEnabled(){try{const raw=localStorage.getItem(STORAGE_KEY);return raw==null?DEFAULT_ENABLED:raw!=="false"}catch(_){return DEFAULT_ENABLED}}
  function saveEnabled(){try{localStorage.setItem(STORAGE_KEY,String(state.enabled))}catch(_){}}
  function soundAllowed(){try{return typeof S?.isEnabled==="function"?S.isEnabled():true}catch(_){return true}}
  function pick(entry,key){const list=entry?.variants;if(!Array.isArray(list)||!list.length)return entry?.text||"";const n=Math.abs(hash(`${key}|${Math.floor(performance.now()/1000)}`))%list.length;return list[n]}
  function hash(value){let h=2166136261>>>0;for(const ch of String(value||"")){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
  function assetFor(key){const value=VOICE_ASSETS?.[key];return typeof value==="string"&&value.trim()?value.trim():""}
  function coolReady(key,cooldown){const now=performance.now(),last=state.lastByKey.get(key)||-Infinity;if(now-last<cooldown)return false;state.lastByKey.set(key,now);return true}
  function chooseVoice(){const voices=state.voices.length?state.voices:(window.speechSynthesis?.getVoices?.()||[]);return voices.find(v=>/^en-GB$/i.test(v.lang)&&/female|serena|sonia|libby|ryan|daniel|george/i.test(v.name))||voices.find(v=>/^en-GB/i.test(v.lang))||voices.find(v=>/^en/i.test(v.lang))||voices[0]||null}
  function stopActive(){
    if(state.active?.audio){try{state.active.audio.pause();state.active.audio.currentTime=0}catch(_){}}
    if(state.active?.speech){try{window.speechSynthesis?.cancel?.()}catch(_){}}
    state.active=null;state.activePriority=-1;
  }
  function finishActive(){state.active=null;state.activePriority=-1;setTimeout(pump,80)}
  function playClip(src,priority){
    try{const audio=new Audio(src);audio.preload="auto";audio.volume=.9;state.active={audio};state.activePriority=priority;audio.onended=finishActive;audio.onerror=()=>{state.active=null;state.activePriority=-1;pump(true)};const p=audio.play();if(p?.catch)p.catch(()=>{state.active=null;state.activePriority=-1;pump(true)});return true}catch(_){return false}
  }
  function speakText(text,priority){
    if(!("speechSynthesis" in window)||typeof SpeechSynthesisUtterance==="undefined")return false;
    try{const u=new SpeechSynthesisUtterance(text);u.lang="en-GB";u.rate=.97;u.pitch=.92;u.volume=.92;const voice=chooseVoice();if(voice)u.voice=voice;u.onend=finishActive;u.onerror=finishActive;state.active={speech:u};state.activePriority=priority;window.speechSynthesis.speak(u);return true}catch(_){return false}
  }
  function pump(forceTts=false){
    if(state.active||!state.enabled||!state.unlocked||!soundAllowed()||!state.queue.length)return;
    state.queue.sort((a,b)=>b.priority-a.priority||a.at-b.at);const next=state.queue.shift();if(!next)return;
    const src=!forceTts?assetFor(next.key):"";
    if(src&&playClip(src,next.priority))return;
    if(speakText(next.text,next.priority))return;
    finishActive();
  }
  function sayKey(key,opts={}){
    const entry=lines[key];if(!entry||!state.enabled)return false;
    const priority=Number(opts.priority??entry.priority??20),cooldown=Number(opts.cooldown??entry.cooldown??5000);if(!coolReady(key,cooldown))return false;
    const text=String(opts.text||pick(entry,key)||"").trim();if(!text)return false;
    if(state.active&&priority>=state.activePriority+25)stopActive();
    state.queue=state.queue.filter(q=>q.key!==key);state.queue.push({key,text,priority,at:performance.now()});if(state.queue.length>8)state.queue=state.queue.sort((a,b)=>b.priority-a.priority).slice(0,8);pump();return true;
  }
  function setEnabled(value){state.enabled=Boolean(value);saveEnabled();if(!state.enabled){state.queue.length=0;stopActive()}updateButton();return state.enabled}
  function updateButton(){if(state.button){state.button.textContent=state.enabled?"VOICE ON":"VOICE OFF";state.button.setAttribute("aria-pressed",String(state.enabled));state.button.title=state.enabled?"Disable spoken game prompts":"Enable spoken game prompts"}}
  function mountButton(){
    if(document.getElementById("voice-btn"))return;
    const row=document.querySelector(".system-buttons");if(!row)return;
    const btn=document.createElement("button");btn.id="voice-btn";btn.type="button";btn.className="sound-toggle";btn.addEventListener("click",()=>{state.unlocked=true;setEnabled(!state.enabled);if(state.enabled)sayKey("welcome",{cooldown:0,text:"Voice prompts enabled."})});
    const sound=document.getElementById("sound-btn");if(sound?.nextSibling)row.insertBefore(btn,sound.nextSibling);else row.appendChild(btn);state.button=btn;updateButton();
  }
  function unlock(){if(state.unlocked)return;state.unlocked=true;pump()}
  document.addEventListener("pointerdown",unlock,{once:true,capture:true});document.addEventListener("keydown",unlock,{once:true,capture:true});
  if(window.speechSynthesis){const refresh=()=>{state.voices=window.speechSynthesis.getVoices?.()||[]};refresh();window.speechSynthesis.onvoiceschanged=refresh}

  function classifyToast(title,text){
    const s=`${title||""} ${text||""}`.toUpperCase();
    if(/GILDED ELF CAUGHT|100 GOLD JACKPOT/.test(s))return"gildedCaught";
    if(/GILDED ELF ESCAPED|TOO SLOW/.test(s))return"gildedEscaped";
    if(/GILDED ELF/.test(s))return"gildedElf";
    if(/COUNT LOADULA|LOADULA/.test(s))return"loadula";
    if(/DEATH STALKER/.test(s))return"deathStalker";
    if(/OBJECTIVE HINT|NEXT OBJECTIVE|RADAR HINT/.test(s))return"objectiveHint";
    if(/OBJECTIVE NEAR|GETTING WARM/.test(s))return"objectiveNear";
    if(/SECRET DOOR|SECRET.*FOUND|HIDDEN WALL|SECRET REVEALED/.test(s))return"secret";
    if(/WEEKLY VAULT.*RUN OVER/.test(s))return"weeklyDeath";
    if(/BOULDER.*RUN/.test(s))return"boulder";
    if(/TRAP|HAZARD.*MOVE/.test(s))return"trap";
    if(/SANCTUARY/.test(s))return"sanctuary";
    if(/LEVEL UP|UPGRADE AVAILABLE/.test(s))return"levelUp";
    if(/GOLD MEDAL|ZZAP! 97%|RARE.*LOOT|ARTEFACT/.test(s))return"rareLoot";
    return"";
  }

  if(typeof showToast==="function"){
    const originalShowToast=showToast;
    showToast=function showToastV116Voice(title,text,tone,duration){const result=originalShowToast.apply(this,arguments);try{const key=classifyToast(title,text);if(key)sayKey(key)}catch(_){}return result};
  }
  if(typeof hurtPlayer==="function"){
    const originalHurtPlayer=hurtPlayer;
    hurtPlayer=function hurtPlayerV116Voice(player,n,friendly=false,source="enemy"){
      const before=Number(player?.health||0)+Number(player?.armor||0),result=originalHurtPlayer.apply(this,arguments),after=Number(player?.health||0)+Number(player?.armor||0);
      try{if(after<before&&Number(player?.health||0)>0)sayKey("hurt");if(player&&player.maxHealth&&player.health>0&&player.health/player.maxHealth<=.28)sayKey("lowHealth")}catch(_){}return result;
    };
  }
  if(typeof beginRun==="function"){
    const originalBeginRun=beginRun;
    beginRun=function beginRunV116Voice(opts={}){const result=originalBeginRun.apply(this,arguments);setTimeout(()=>{try{sayKey(opts?.daily?"weeklyWelcome":"welcome",{cooldown:0})}catch(_){}},450);return result};
  }
  if(typeof floorComplete==="function"){
    const originalFloorComplete=floorComplete;
    floorComplete=function floorCompleteV116Voice(){const result=originalFloorComplete.apply(this,arguments);try{sayKey("floorClear",{cooldown:0})}catch(_){}return result};
  }
  if(typeof endRun==="function"){
    const originalEndRun=endRun;
    endRun=function endRunV116Voice(reason=""){const weekly=Boolean(run?.daily),result=originalEndRun.apply(this,arguments);try{sayKey(weekly&&/death/i.test(String(reason))?"weeklyDeath":"gameOver",{cooldown:0})}catch(_){}return result};
  }

  let watchMs=0;
  function voiceWatch(dt){
    watchMs-=Number(dt||0);if(watchMs>0||mode!=="playing"||!p1)return;watchMs=350;
    try{
      if(p1.maxHealth&&p1.health>0&&p1.health/p1.maxHealth<=.28)sayKey("lowHealth");
      if(Number(p1.mana||0)<=8)sayKey("noAmmo");
      for(const elf of host?.enemies||[])if(elf?.gildedElf&&elf.alive&&Number(elf.lifeMs||0)<=5200&&!state.gildedFiveWarned.has(elf.id)){state.gildedFiveWarned.add(elf.id);sayKey("gildedFive",{cooldown:0})}
    }catch(_){}
  }
  if(typeof update==="function"){
    const originalUpdate=update;
    update=function updateV116Voice(dt){const result=originalUpdate.apply(this,arguments);try{voiceWatch(dt)}catch(_){}return result};
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mountButton,{once:true});else mountButton();
  window.CCGLostSizzlerVoice={say:sayKey,setEnabled,get enabled(){return state.enabled},get state(){return state},lines};
})();
