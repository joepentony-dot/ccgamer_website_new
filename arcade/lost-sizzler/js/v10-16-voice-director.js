/* The Lost Sizzler V10.16 — event-driven voice director. */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_VOICE_DIRECTOR_V116__)return;
  window.__CCG_LOST_SIZZLER_VOICE_DIRECTOR_V116__=true;

  const STORAGE_KEY="ccg-lost-sizzler-voice-enabled";
  const DEFAULT_ENABLED=true;
  const VOICE_ASSETS=window.CCG_ASSET_OVERRIDES?.audio?.voice||{};
  const BUNDLED_SPRITE={
    src:"assets/audio/voice/lost-sizzler-voices.ogg",
    cues:{
      welcome:{start:0.16,duration:3.221},
      welcomeRare:{start:3.541,duration:5.12},
      hurt:{start:8.821,duration:0.662},
      lowHealth:{start:9.643,duration:1.685},
      noAmmo:{start:11.488,duration:1.493},
      objectiveNear:{start:13.141,duration:2.262},
      floorClear:{start:15.563,duration:2.069},
      gameOver:{start:17.792,duration:1.195},
      playerDeath:{start:19.147,duration:2.453},
      respawn:{start:21.76,duration:1.557},
      rareLoot:{start:23.477,duration:2.39},
      levelUp:{start:26.027,duration:1.194},
      shop:{start:27.381,duration:1.814},
      sanctuary:{start:29.355,duration:2.282},
      secret:{start:31.797,duration:2.454},
      trap:{start:34.411,duration:2.346},
      boulder:{start:36.917,duration:1.472},
      merchantGone:{start:38.549,duration:3.051},
      adventurerSaved:{start:41.76,duration:2.859},
      cabinet:{start:44.779,duration:3.2},
      cabinetFail:{start:48.139,duration:2.389},
      cabinetWin:{start:50.688,duration:2.091},
      bounty:{start:52.939,duration:2.346},
      buriedCache:{start:55.445,duration:2.006},
      loadula:{start:57.611,duration:1.664},
      cursed:{start:59.435,duration:4.757},
      deathStalker:{start:64.352,duration:1.493},
      developerRoom:{start:66.005,duration:6.976},
      bountyStart:{start:73.141,duration:1.75},
      tremor:{start:75.051,duration:1.514},
      mutation:{start:76.725,duration:2.454},
      gildedElf:{start:79.339,duration:2.176},
      gildedCaught:{start:81.675,duration:1.194},
      gildedEscaped:{start:83.029,duration:2.091},
      gildedFive:{start:85.28,duration:2.987},
      goldenRoom:{start:88.427,duration:3.029},
      adventurer:{start:91.616,duration:2.24},
      mysteryPotion:{start:94.016,duration:2.453},
      namedEnemy:{start:96.629,duration:2.603},
      objectiveHint:{start:99.392,duration:3.136},
      taxman:{start:102.688,duration:2.603},
      treasureBat:{start:105.451,duration:2.965},
      treasureMap:{start:108.576,duration:3.093},
      merchant:{start:111.829,duration:2.646},
      weeklyGhost:{start:114.635,duration:1.578},
      weeklyReset:{start:116.373,duration:3.755},
      weeklyDeath:{start:120.288,duration:3.797},
      weeklyWelcome:{start:124.245,duration:5.611},
      mimic:{start:130.016,duration:2.453}
    }
  };
  const state={enabled:readEnabled(),unlocked:false,active:null,activePriority:-1,queue:[],lastByKey:new Map(),lastAssetByKey:new Map(),lastPainAt:0,lastLowHealthAt:0,lowAmmoWarned:false,rareLootFloor:0,gildedFiveWarned:new Set(),voices:[],button:null};

  const lines={
    welcome:{text:"Welcome to The Lost Sizzler. Good luck down there.",priority:40,cooldown:10000},
    welcomeRare:{text:"Welcome to The Lost Sizzler. Good luck down there.",priority:42,cooldown:10000},
    weeklyWelcome:{text:"Weekly High Score Vault. One attempt. Make it count.",priority:55,cooldown:10000},
    hurt:{text:"Ow!",priority:8,cooldown:0},
    lowHealth:{variants:["Low health.","Health critical.","You could really use a potion."],priority:35,cooldown:18000},
    noAmmo:{variants:["Ammo low.","You're running dry."],priority:25,cooldown:120000},
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
    mimic:{variants:["Mimic!","That chest has teeth!"],priority:68,cooldown:9000},
    taxman:{variants:["The Taxman!","Oi! He's nicked your score!"],priority:62,cooldown:10000},
    treasureBat:{variants:["Treasure bat!","Shoot the bat before it gets away!"],priority:56,cooldown:10000},
    goldenRoom:{variants:["Golden room! Survive the rush!","Doors sealed. Twenty five seconds."],priority:66,cooldown:12000},
    bounty:{variants:["Bounty complete.","Challenge complete. Bonus awarded."],priority:46,cooldown:7000},
    mutation:{variants:["Floor mutation active.","This floor has different rules."],priority:42,cooldown:10000},
    cursed:{variants:["Cursed cartridge.","Nice score bonus. Shame about the curse."],priority:45,cooldown:10000},
    mysteryPotion:{variants:["Mystery potion.","Well, something happened."],priority:32,cooldown:7000},
    weeklyGhost:{variants:["Weekly ghost loaded.","Another player's route is in the dungeon."],priority:22,cooldown:30000},
    weeklyDeath:{text:"Weekly Vault run over. Your score is being recorded.",priority:95,cooldown:6000},
    weeklyReset:{text:"Weekly Dungeon reset. A new ranked attempt is available.",priority:50,cooldown:60000}
  };

  function readEnabled(){try{const raw=localStorage.getItem(STORAGE_KEY);return raw==null?DEFAULT_ENABLED:raw!=="false"}catch(_){return DEFAULT_ENABLED}}
  function saveEnabled(){try{localStorage.setItem(STORAGE_KEY,String(state.enabled))}catch(_){}}
  function soundAllowed(){try{return typeof S?.isEnabled==="function"?S.isEnabled():true}catch(_){return true}}
  function pick(entry,key){const list=entry?.variants;if(!Array.isArray(list)||!list.length)return entry?.text||"";const n=Math.abs(hash(`${key}|${Math.floor(performance.now()/1000)}`))%list.length;return list[n]}
  function hash(value){let h=2166136261>>>0;for(const ch of String(value||"")){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
  function assetFor(key){
    const value=VOICE_ASSETS?.[key];
    const list=(Array.isArray(value)?value:[value]).map(item=>String(item||"").trim()).filter(Boolean);
    if(!list.length)return"";
    const last=state.lastAssetByKey.get(key)||"";
    const choices=list.length>1?list.filter(src=>src!==last):list;
    const source=choices[Math.floor(Math.random()*choices.length)]||list[0]||"";
    if(source)state.lastAssetByKey.set(key,source);
    return source;
  }
  function coolReady(key,cooldown){const now=performance.now(),last=state.lastByKey.get(key)||-Infinity;if(now-last<cooldown)return false;state.lastByKey.set(key,now);return true}
  function chooseVoice(){const voices=state.voices.length?state.voices:(window.speechSynthesis?.getVoices?.()||[]);return voices.find(v=>/^en-GB$/i.test(v.lang)&&/female|serena|sonia|libby|ryan|daniel|george/i.test(v.name))||voices.find(v=>/^en-GB/i.test(v.lang))||voices.find(v=>/^en/i.test(v.lang))||voices[0]||null}
  function clearActiveTimer(){if(state.active?.timer){clearInterval(state.active.timer);state.active.timer=null}}
  function stopActive(){
    clearActiveTimer();
    if(state.active?.audio){try{state.active.audio.pause();state.active.audio.currentTime=0}catch(_){}}
    if(state.active?.speech){try{window.speechSynthesis?.cancel?.()}catch(_){}}
    state.active=null;state.activePriority=-1;
  }
  function finishActive(){clearActiveTimer();state.active=null;state.activePriority=-1;setTimeout(pump,80)}
  function voiceVolume(key){return key==="hurt" ? .56 : .72}
  function playClip(src,priority,fallbackText="",key=""){
    try{
      const audio=new Audio(src);let failed=false;
      const fallback=()=>{
        if(failed)return;failed=true;
        try{audio.pause();audio.currentTime=0}catch(_){}
        state.active=null;state.activePriority=-1;
        if(fallbackText&&speakText(fallbackText,priority,key))return;
        setTimeout(pump,80);
      };
      audio.preload="auto";audio.volume=voiceVolume(key);state.active={audio};state.activePriority=priority;audio.onended=finishActive;audio.onerror=fallback;
      const p=audio.play();if(p?.catch)p.catch(fallback);return true;
    }catch(_){return false}
  }
  function playSprite(key,priority,fallbackText=""){
    const cue=BUNDLED_SPRITE.cues[key];if(!cue)return false;
    try{
      const audio=new Audio(BUNDLED_SPRITE.src);let failed=false,started=false;
      const fallback=()=>{
        if(failed)return;failed=true;
        clearActiveTimer();
        try{audio.pause()}catch(_){}
        state.active=null;state.activePriority=-1;
        if(fallbackText&&speakText(fallbackText,priority,key))return;
        setTimeout(pump,80);
      };
      const begin=()=>{
        if(started||failed)return;started=true;
        try{audio.currentTime=Math.max(0,Number(cue.start)||0)}catch(_){fallback();return}
        const stopAt=(Number(cue.start)||0)+(Number(cue.duration)||0);
        const timer=setInterval(()=>{
          if(state.active?.audio!==audio){clearInterval(timer);return}
          if(Number(audio.currentTime||0)+.025<stopAt)return;
          clearInterval(timer);
          try{audio.pause()}catch(_){}
          finishActive();
        },25);
        state.active={audio,timer};
        state.activePriority=priority;
        const p=audio.play();if(p?.catch)p.catch(fallback);
      };
      audio.preload="auto";audio.volume=voiceVolume(key);audio.onerror=fallback;state.active={audio};state.activePriority=priority;
      if(audio.readyState>=1)begin();else audio.addEventListener("loadedmetadata",begin,{once:true});
      audio.load();return true;
    }catch(_){return false}
  }
  function speakText(text,priority,key=""){
    if(!("speechSynthesis" in window)||typeof SpeechSynthesisUtterance==="undefined")return false;
    try{const u=new SpeechSynthesisUtterance(text);u.lang="en-GB";u.rate=.97;u.pitch=.92;u.volume=voiceVolume(key);const voice=chooseVoice();if(voice)u.voice=voice;u.onend=finishActive;u.onerror=finishActive;state.active={speech:u};state.activePriority=priority;window.speechSynthesis.speak(u);return true}catch(_){return false}
  }
  function pump(){
    if(state.active||!state.enabled||!state.unlocked||!soundAllowed()||!state.queue.length)return;
    state.queue.sort((a,b)=>b.priority-a.priority||a.at-b.at);const next=state.queue.shift();if(!next)return;
    const src=!next.forceTts?assetFor(next.key):"";
    if(src&&playClip(src,next.priority,next.text,next.key))return;
    if(!next.forceTts&&playSprite(next.key,next.priority,next.text))return;
    if(speakText(next.text,next.priority,next.key))return;
    finishActive();
  }
  function tutorialSilent(){const tutorial=window.CCGLostSizzlerOnboardingV120?.state;return Boolean(tutorial?.active||tutorial?.tutorialRequested||window.CCGLostSizzlerTutorialGuidanceV123?.tutorialLaunchPending)}
  function sayKey(key,opts={}){
    const entry=lines[key];if(!entry||!state.enabled||tutorialSilent())return false;
    const currentFloor=Math.max(0,Number(run?.floor||0));if(key==="rareLoot"&&currentFloor>0&&state.rareLootFloor===currentFloor)return false;
    const priority=Number(opts.priority??entry.priority??20),cooldown=Number(opts.cooldown??entry.cooldown??5000);if(!coolReady(key,cooldown))return false;
    const text=String(opts.text||pick(entry,key)||"").trim();if(!text)return false;
    if(key==="rareLoot"&&currentFloor>0)state.rareLootFloor=currentFloor;
    if(state.active&&priority>=state.activePriority+25)stopActive();
    if(key!=="hurt")state.queue=state.queue.filter(q=>q.key!==key);state.queue.push({key,text,priority,forceTts:Boolean(opts.forceTts),at:performance.now()});if(state.queue.length>12)state.queue=state.queue.sort((a,b)=>b.priority-a.priority).slice(0,12);pump();return true;
  }
  function setEnabled(value){state.enabled=Boolean(value);saveEnabled();if(!state.enabled){state.queue.length=0;stopActive()}updateButton();return state.enabled}
  function updateButton(){if(state.button){state.button.textContent=state.enabled?"VOICE ON":"VOICE OFF";state.button.setAttribute("aria-pressed",String(state.enabled));state.button.title=state.enabled?"Disable spoken game prompts":"Enable spoken game prompts"}}
  function mountButton(){
    if(document.getElementById("voice-btn"))return;
    const row=document.querySelector(".system-buttons");if(!row)return;
    const btn=document.createElement("button");btn.id="voice-btn";btn.type="button";btn.className="sound-toggle";btn.addEventListener("click",()=>{state.unlocked=true;setEnabled(!state.enabled);if(state.enabled)sayKey("welcome",{cooldown:0,text:"Voice prompts enabled.",forceTts:true})});
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
    if(/MIMIC/.test(s))return"mimic";
    if(/TAXMAN/.test(s))return"taxman";
    if(/TREASURE BAT/.test(s))return"treasureBat";
    if(/GOLDEN ROOM/.test(s))return"goldenRoom";
    if(/DUNGEON BOUNTY COMPLETE|BOUNTY COMPLETE/.test(s))return"bounty";
    if(/FLOOR MUTATION/.test(s))return"mutation";
    if(/CURSED CARTRIDGE/.test(s))return"cursed";
    if(/MYSTERY POTION/.test(s))return"mysteryPotion";
    if(/COUNT LOADULA|LOADULA/.test(s))return"loadula";
    if(/DEATH STALKER/.test(s))return"deathStalker";
    if(/RADAR HINT/.test(s))return"objectiveHint";
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
      const before=Number(player?.health||0)+Number(player?.armor||0),deathsBefore=Number(run?.stats?.deaths||0),result=originalHurtPlayer.apply(this,arguments),after=Number(player?.health||0)+Number(player?.armor||0),deathsAfter=Number(run?.stats?.deaths||0);
      try{
        if(after<before)sayKey("hurt",{cooldown:0});
        if(deathsAfter>deathsBefore)setTimeout(()=>sayKey("playerDeath",{cooldown:0}),750);
        if(player&&player.maxHealth&&player.health>0&&player.health/player.maxHealth<=.28)sayKey("lowHealth");
      }catch(_){}return result;
    };
  }
  if(typeof beginRun==="function"){
    const originalBeginRun=beginRun;
    beginRun=function beginRunV116Voice(opts={}){
      const result=originalBeginRun.apply(this,arguments);
      state.lowAmmoWarned=false;state.rareLootFloor=0;state.lastByKey.delete("noAmmo");
      setTimeout(()=>{
        try{
          const welcomeKey=opts?.daily?"weeklyWelcome":(Math.random()<.1?"welcomeRare":"welcome");
          sayKey(welcomeKey,{cooldown:0});
          if(opts?.daily&&window.CCGWeeklyChallenge?.state?.ghost?.path?.length)sayKey("weeklyGhost",{cooldown:0});
        }catch(_){}
      },450);
      return result;
    };
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
    watchMs-=Number(dt||0);if(watchMs>0||mode!=="playing"||!p1||tutorialSilent())return;watchMs=350;
    try{
      if(p1.maxHealth&&p1.health>0&&p1.health/p1.maxHealth<=.28)sayKey("lowHealth");
      const ammo=Number(p1.mana||0);
      if(ammo>=20)state.lowAmmoWarned=false;
      if(ammo<=8&&!state.lowAmmoWarned&&sayKey("noAmmo")){state.lowAmmoWarned=true}
      for(const elf of host?.enemies||[])if(elf?.gildedElf&&elf.alive&&Number(elf.lifeMs||0)<=5200&&!state.gildedFiveWarned.has(elf.id)){state.gildedFiveWarned.add(elf.id);sayKey("gildedFive",{cooldown:0})}
    }catch(_){}
  }
  if(typeof update==="function"){
    const originalUpdate=update;
    update=function updateV116Voice(dt){const result=originalUpdate.apply(this,arguments);try{voiceWatch(dt)}catch(_){}return result};
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mountButton,{once:true});else mountButton();
  window.CCGLostSizzlerVoice={say:sayKey,setEnabled,get enabled(){return state.enabled},get state(){return state},lines,bundledSprite:BUNDLED_SPRITE};
})();
