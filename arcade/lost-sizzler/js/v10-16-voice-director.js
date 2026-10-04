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
  const MAX_RECORDED_CLIP_MS=10000;
  const state={enabled:readEnabled(),unlocked:false,active:null,activePriority:-1,queue:[],lastByKey:new Map(),lastAssetByKey:new Map(),rareLootFloor:0,artefactLorePlayed:false,ammoPickupRuns:new WeakSet(),ammoPickupFallbackSpoken:false,gildedFiveWarned:new Set(),lowHealthLatch:new WeakSet(),criticalHealthLatch:new WeakSet(),voices:[],button:null,serial:0,played:0,queued:0,skipped:0,interrupted:0,lastSkipped:null,dungeonFxApplied:0};
  let voiceContext=null,voiceImpulse=null;

  const lines={
    welcome:{text:"Welcome to C64 Dungeon Carnage. Good luck down there.",priority:40,cooldown:10000},
    welcomeRare:{text:"Welcome to C64 Dungeon Carnage. Good luck down there.",priority:42,cooldown:10000},
    weeklyWelcome:{text:"Weekly High Score Vault. One attempt. Make it count.",priority:55,cooldown:10000},
    hurt:{text:"Ow!",priority:8,cooldown:30000},
    lowHealth:{text:"I need to heal.",priority:35,cooldown:0},
    noAmmo:{variants:["Ammo low.","You're running dry."],priority:25,cooldown:120000},
    secret:{variants:["Secret found.","Well spotted.","Hidden route discovered."],priority:38,cooldown:6000},
    objectiveHint:{variants:["Objective hint available.","You have been wandering for a while. Check your radar.","Need a nudge? Your next objective is now marked."],priority:45,cooldown:15000},
    objectiveNear:{variants:["Objective nearby.","You're getting warm."],priority:34,cooldown:10000},
    floorClear:{variants:["Floor cleared.","Nice work. Floor complete."],priority:60,cooldown:4000},
    gameOver:{variants:["Run over.","That's the run. Better luck next time."],priority:80,cooldown:4000,interrupt:true},
    playerDeath:{variants:["Ouch. That looked expensive.","Back to the sanctuary with you.","That went well."],priority:70,cooldown:5000,interrupt:true},
    deathStalker:{variants:["Death Stalker!","Death Stalker nearby. Keep moving."],priority:85,cooldown:12000,interrupt:true},
    loadula:{variants:["Count Loadula!","Loadula has entered the dungeon."],priority:88,cooldown:12000,interrupt:true},
    gildedElf:{variants:["Gilded Elf! Catch him!","Gold on legs. Thirty seconds!"],priority:80,cooldown:10000},
    gildedFive:{variants:["Five seconds!","He's about to vanish!"],priority:90,cooldown:5000,interrupt:true},
    gildedCaught:{variants:["Jackpot!","Got him. Grab the gold!"],priority:82,cooldown:5000},
    gildedEscaped:{variants:["Too slow!","And he's gone."],priority:70,cooldown:5000},
    namedEnemy:{variants:["Named enemy ahead.","Something nasty has noticed you."],priority:52,cooldown:9000},
    rareLoot:{variants:["Rare loot!","That's worth picking up."],priority:30,cooldown:8000},
    levelUp:{variants:["Level up.","Upgrade available."],priority:45,cooldown:4000},
    shop:{variants:["Shop discovered.","Supplies ahead."],priority:28,cooldown:12000},
    sanctuary:{variants:["Sanctuary.","Safe room. For now."],priority:30,cooldown:12000},
    trap:{variants:["Trap!","Move!"],priority:58,cooldown:5000},
    boulder:{variants:["Boulder! Run!","Move! Move! Move!"],priority:76,cooldown:8000,interrupt:true},
    mimic:{variants:["Mimic!","That chest has teeth!"],priority:68,cooldown:9000},
    taxman:{variants:["The Taxman!","Oi! He's nicked your score!"],priority:62,cooldown:10000},
    treasureBat:{variants:["Treasure bat!","Shoot the bat before it gets away!"],priority:56,cooldown:10000},
    goldenRoom:{variants:["Golden room! Survive the rush!","Doors sealed. Twenty five seconds."],priority:66,cooldown:12000},
    bounty:{variants:["Bounty complete.","Challenge complete. Bonus awarded."],priority:46,cooldown:7000},
    mutation:{variants:["Floor mutation active.","This floor has different rules."],priority:42,cooldown:10000},
    cursed:{variants:["Cursed cartridge.","Nice score bonus. Shame about the curse."],priority:45,cooldown:10000},
    mysteryPotion:{variants:["Mystery potion.","Well, something happened."],priority:32,cooldown:7000},
    weeklyGhost:{variants:["Weekly ghost loaded.","Another player's route is in the dungeon."],priority:22,cooldown:30000},
    weeklyDeath:{text:"Weekly Vault run over. Your score is being recorded.",priority:95,cooldown:6000,interrupt:true},
    weeklyReset:{text:"Weekly Dungeon reset. A new ranked attempt is available.",priority:50,cooldown:60000},
    criticalHealth:{text:"Critical health.",priority:72,cooldown:0,interrupt:true},
    trapsNearby:{text:"Traps nearby.",priority:48,cooldown:8000},
    watchStep:{text:"Watch your step.",priority:42,cooldown:9000},
    enemiesNearby:{text:"Enemies nearby.",priority:38,cooldown:9000},
    roomLockdown:{text:"Room locked down.",priority:62,cooldown:5000},
    bronzeKeyRequired:{text:"Bronze key required.",priority:48,cooldown:2500},
    bronzeDoorUnlocked:{text:"Bronze door unlocked.",priority:40,cooldown:2000},
    chestKeyRequired:{text:"You need a key to open this chest.",priority:48,cooldown:2500},
    chestUnlocked:{text:"Chest unlocked.",priority:28,cooldown:12000},
    doorSealed:{text:"The door is sealed.",priority:45,cooldown:3500},
    findSwitch:{text:"Find the switch.",priority:40,cooldown:5000},
    exitSealed:{text:"The exit is still sealed.",priority:52,cooldown:7000},
    exitOpen:{text:"The exit is open.",priority:58,cooldown:5000},
    ammoCollected:{text:"Ammunition collected.",priority:8,cooldown:120000},
    healthRestored:{text:"Health restored.",priority:12,cooldown:60000},
    armourRestored:{text:"Armour restored.",priority:12,cooldown:60000},
    bronzeKeyCollected:{text:"Bronze key collected.",priority:28,cooldown:2500},
    artefactCollected:{text:"Artefact collected.",priority:28,cooldown:2500},
    essenceCollected:{text:"Banishment Essence collected.",priority:28,cooldown:2500},
    weaponUpgraded:{text:"Weapon upgraded.",priority:36,cooldown:2500},
    upgradeAvailable:{text:"Upgrade available.",priority:44,cooldown:2500},
    exitSigilAcquired:{text:"Exit Sigil acquired.",priority:62,cooldown:2500},
    banishmentFlaskAcquired:{text:"Banishment Flask acquired.",priority:55,cooldown:2500},
    arenaLockdown:{text:"Arena lockdown.",priority:64,cooldown:5000},
    surviveAmbush:{text:"Survive the ambush.",priority:50,cooldown:6000},
    timedChamber:{text:"Timed chamber.",priority:58,cooldown:5000},
    memorySequenceStarted:{text:"Memory sequence initiated.",priority:44,cooldown:5000},
    watchSequence:{text:"Watch the sequence.",priority:38,cooldown:5000},
    sequenceIncorrect:{text:"Sequence incorrect.",priority:46,cooldown:2500},
    sequenceComplete:{text:"Sequence complete.",priority:46,cooldown:2500},
    scoutFound:{text:"Scout found.",priority:44,cooldown:5000},
    escortScout:{text:"Escort the scout to sanctuary.",priority:40,cooldown:9000},
    sanctuaryReached:{text:"Sanctuary reached.",priority:38,cooldown:7000},
    guardianEncountered:{text:"Guardian encountered.",priority:58,cooldown:8000},
    guardianDefeated:{text:"Guardian defeated.",priority:58,cooldown:5000},
    sigilWardenEncountered:{text:"Sigil Warden encountered.",priority:68,cooldown:8000},
    sigilWardenDefeated:{text:"Sigil Warden defeated.",priority:68,cooldown:5000},
    deathStalkerBanished:{text:"Death Stalker banished.",priority:82,cooldown:5000,interrupt:true},
    useBanishmentFlask:{text:"Use the Banishment Flask.",priority:72,cooldown:7000},
    notEnoughScore:{text:"Not enough score.",priority:38,cooldown:2500},
    notEnoughArtefacts:{text:"Not enough artefacts.",priority:38,cooldown:2500},
    notEnoughEssence:{text:"Not enough Banishment Essence.",priority:38,cooldown:2500},
    purchaseComplete:{text:"Purchase complete.",priority:20,cooldown:12000},
    inventoryFull:{text:"Your inventory is full.",priority:42,cooldown:2500},
    ambush:{text:"Ambush.",priority:66,cooldown:6000},
    descending:{text:"Descending.",priority:52,cooldown:2500},
    deathStalkerImmune:{text:"Weapons cannot kill the Death Stalker.",priority:82,cooldown:10000,interrupt:true},
    hazardPain:{text:"Well, that looked painful.",priority:16,cooldown:45000},
    shopNoScore:{text:"No score, no sale.",priority:34,cooldown:2800},
    merchantPurchase:{text:"Pleasure doing business.",priority:28,cooldown:2400},
    adventurerHelp:{text:"Get me out of here.",priority:46,cooldown:9000},
    adventurerSafe:{text:"We made it.",priority:42,cooldown:9000},
    scoutLagging:{text:"Don’t leave me behind.",priority:42,cooldown:12000},
    scoutSanctuaryNear:{text:"Is that sanctuary?",priority:44,cooldown:12000},
    artefactLore:{text:"Artefacts are worth more than they look.",priority:18,cooldown:90000},
    essenceLore:{text:"Banishment Essence is stored in your Vessel. An Alchemist can distil it into a Flask.",priority:18,cooldown:90000},
    hazardWarning:{text:"Probably best not to stand on that.",priority:48,cooldown:10000},
    dangerRoom:{text:"That doesn’t look safe.",priority:32,cooldown:30000},
    secretDoor:{text:"Secret door discovered.",priority:44,cooldown:6000},
    movementNearby:{text:"Something is moving nearby.",priority:22,cooldown:60000},
    stayAlert:{text:"Stay alert.",priority:26,cooldown:60000},
    deepeningDungeon:{text:"This place is getting worse.",priority:24,cooldown:90000},
    buriedWarning:{text:"There are things buried down here that should have stayed buried.",priority:34,cooldown:90000},
    uneasySound:{text:"I don’t like the sound of that.",priority:24,cooldown:60000},
    needThreeArtefacts:{text:"You need three artefacts.",priority:38,cooldown:3000},
    comeBackFunded:{text:"Come back when you have enough.",priority:30,cooldown:5000}
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
  function coolReady(key,cooldown,now=performance.now()){const last=state.lastByKey.get(key)||-Infinity;return now-last>=cooldown}
  function chooseVoice(){const voices=state.voices.length?state.voices:(window.speechSynthesis?.getVoices?.()||[]);return voices.find(v=>/^en-GB$/i.test(v.lang)&&/female|serena|sonia|libby|ryan|daniel|george/i.test(v.name))||voices.find(v=>/^en-GB/i.test(v.lang))||voices.find(v=>/^en/i.test(v.lang))||voices[0]||null}
  function clearActiveTimers(active=state.active){if(active?.timer){clearInterval(active.timer);active.timer=null}if(active?.watchdog){clearTimeout(active.watchdog);active.watchdog=null}}
  function releaseDungeonFx(active){if(!active?.dungeonFx)return;try{active.dungeonFx.disconnect()}catch(_){}active.dungeonFx=null}
  function drainQueue(){
    if(state.active||!state.enabled||!state.unlocked||!state.queue.length)return false;
    const next=state.queue.shift();
    queueMicrotask(()=>{try{if(!state.active&&next?.key)sayKey(next.key,{...(next.opts||{}),queue:false,cooldown:0})}catch(_){}});
    return true
  }
  function finishActive(active=state.active){if(!active||state.active!==active)return false;clearActiveTimers(active);releaseDungeonFx(active);state.active=null;state.activePriority=-1;drainQueue();return true}
  function stopActive(reason="stopped"){
    const active=state.active;if(!active)return false;state.active=null;state.activePriority=-1;state.serial++;
    clearActiveTimers(active);
    if(active.audio){try{active.audio.onended=null;active.audio.onerror=null;active.audio.pause();active.audio.currentTime=0}catch(_){}}
    releaseDungeonFx(active);
    if(active.speech){try{active.speech.onend=null;active.speech.onerror=null;window.speechSynthesis?.cancel?.()}catch(_){}}
    if(reason==="interrupted")state.interrupted++;
    return true;
  }
  function armWatchdog(active,ms=MAX_RECORDED_CLIP_MS){active.watchdog=setTimeout(()=>finishActive(active),Math.max(500,Number(ms)||MAX_RECORDED_CLIP_MS))}
  function voiceVolume(key){return key==="hurt" ? .56 : .72}
  function dungeonVoiceFx(audio,key){
    const Context=window.AudioContext||window.webkitAudioContext;if(!Context||!audio)return null;
    try{
      voiceContext=voiceContext||new Context();
      if(!voiceImpulse){
        const length=Math.max(1,Math.floor(voiceContext.sampleRate*.32));voiceImpulse=voiceContext.createBuffer(2,length,voiceContext.sampleRate);
        for(let channel=0;channel<voiceImpulse.numberOfChannels;channel++){const data=voiceImpulse.getChannelData(channel);for(let i=0;i<length;i++)data[i]=(Math.random()*2-1)*Math.pow(1-i/length,3.1)}
      }
      const source=voiceContext.createMediaElementSource(audio),tone=voiceContext.createBiquadFilter(),dry=voiceContext.createGain(),wet=voiceContext.createGain(),reverb=voiceContext.createConvolver(),master=voiceContext.createGain();
      tone.type="lowpass";tone.frequency.value=3600;tone.Q.value=.55;dry.gain.value=.92;wet.gain.value=.12;reverb.buffer=voiceImpulse;master.gain.value=voiceVolume(key);
      source.connect(tone);tone.connect(dry);dry.connect(master);tone.connect(reverb);reverb.connect(wet);wet.connect(master);master.connect(voiceContext.destination);audio.volume=1;
      if(voiceContext.state==="suspended")voiceContext.resume?.().catch?.(()=>{});
      state.dungeonFxApplied++;
      return{disconnect(){for(const node of [source,tone,dry,wet,reverb,master])try{node.disconnect()}catch(_){}}};
    }catch(_){audio.volume=voiceVolume(key);return null}
  }
  function playClip(src,priority,fallbackText="",key=""){
    try{
      const audio=new Audio(src),active={id:++state.serial,key,priority,audio,timer:null,watchdog:null};let failed=false;
      const fallback=()=>{
        if(failed||state.active!==active)return;failed=true;clearActiveTimers(active);
        try{audio.onended=null;audio.onerror=null;audio.pause();audio.currentTime=0}catch(_){}releaseDungeonFx(active);
        state.active=null;state.activePriority=-1;
        if(fallbackText&&speakText(fallbackText,priority,key))return;
      };
      audio.preload="auto";audio.volume=voiceVolume(key);active.dungeonFx=dungeonVoiceFx(audio,key);state.active=active;state.activePriority=priority;audio.onended=()=>finishActive(active);audio.onerror=fallback;armWatchdog(active);
      const p=audio.play();if(p?.catch)p.catch(fallback);return true;
    }catch(_){return false}
  }
  function playSprite(key,priority,fallbackText=""){
    const recorded=window.CCG_RECORDED_VOICE_SPRITE,recordedKey=String(recorded?.aliases?.[key]||key),recordedCue=recorded?.cues?.[recordedKey],recordedAvailable=Boolean(recordedCue),pack=recordedAvailable?recorded:BUNDLED_SPRITE,cue=recordedCue||BUNDLED_SPRITE.cues[key];
    if(!cue||!pack?.src)return false;
    try{
      const audio=new Audio(pack.src),active={id:++state.serial,key,priority,audio,timer:null,watchdog:null};let failed=false,started=false;
      const fallback=()=>{
        if(failed||state.active!==active)return;failed=true;clearActiveTimers(active);
        try{audio.onerror=null;audio.pause()}catch(_){}releaseDungeonFx(active);
        state.active=null;state.activePriority=-1;
        if(!recordedAvailable&&fallbackText&&speakText(fallbackText,priority,key))return;
      };
      const begin=()=>{
        if(started||failed||state.active!==active)return;started=true;
        try{audio.currentTime=Math.max(0,Number(cue.start)||0)}catch(_){fallback();return}
        const stopAt=(Number(cue.start)||0)+(Number(cue.duration)||0);
        const timer=setInterval(()=>{
          if(state.active!==active){clearInterval(timer);return}
          if(Number(audio.currentTime||0)+.025<stopAt)return;
          clearInterval(timer);
          try{audio.pause()}catch(_){}
          finishActive(active);
        },25);
        active.timer=timer;
        const p=audio.play();if(p?.catch)p.catch(fallback);
      };
      audio.preload="auto";audio.volume=voiceVolume(key);active.dungeonFx=dungeonVoiceFx(audio,key);audio.onerror=fallback;state.active=active;state.activePriority=priority;armWatchdog(active,(Number(cue.duration)||0)*1000+2500);
      if(audio.readyState>=1)begin();else audio.addEventListener("loadedmetadata",begin,{once:true});
      audio.load();return true;
    }catch(_){return false}
  }
  function speakText(text,priority,key=""){
    if(!("speechSynthesis" in window)||typeof SpeechSynthesisUtterance==="undefined")return false;
    try{
      const u=new SpeechSynthesisUtterance(text),active={id:++state.serial,key,priority,speech:u,timer:null,watchdog:null};u.lang="en-GB";u.rate=.97;u.pitch=.92;u.volume=voiceVolume(key);const voice=chooseVoice();if(voice)u.voice=voice;
      u.onend=()=>finishActive(active);u.onerror=()=>finishActive(active);try{window.speechSynthesis.cancel()}catch(_){}state.active=active;state.activePriority=priority;armWatchdog(active);window.speechSynthesis.speak(u);return true;
    }catch(_){return false}
  }
  function tutorialSilent(){const tutorial=window.CCGLostSizzlerOnboardingV120?.state;return Boolean(tutorial?.active||tutorial?.tutorialRequested||window.CCGLostSizzlerTutorialGuidanceV123?.tutorialLaunchPending)}
  function sayKey(key,opts={}){
    const entry=lines[key];if(!entry||!state.enabled||tutorialSilent())return false;
    const currentFloor=Math.max(0,Number(run?.floor||0));if(key==="rareLoot"&&currentFloor>0&&state.rareLootFloor===currentFloor)return false;if(key==="rareLoot"&&currentFloor>0)state.rareLootFloor=currentFloor;
    const priority=Number(opts.priority??entry.priority??20),cooldown=Number(opts.cooldown??entry.cooldown??5000),now=performance.now();if(!coolReady(key,cooldown,now))return false;
    const text=String(opts.text||pick(entry,key)||"").trim();if(!text)return false;
    if(!state.unlocked||!soundAllowed()){state.skipped++;state.lastSkipped={key,reason:"unavailable",at:now};return false}
    if(state.active){const importantOverride=priority>=50&&state.activePriority<30,mayInterrupt=Boolean(opts.interrupt??entry.interrupt)||importantOverride;if(!mayInterrupt||priority<=state.activePriority){if(opts.queue===true&&state.queue.length<4&&!state.queue.some(item=>item?.key===key)){state.queue.push({key,opts:{...opts,queue:false}});state.queued++;return true}state.skipped++;state.lastSkipped={key,reason:"busy",at:now};return false}stopActive("interrupted")}
    const forceTts=Boolean(opts.forceTts),src=!forceTts?assetFor(key):"",recorded=window.CCG_RECORDED_VOICE_SPRITE,recordedKey=String(recorded?.aliases?.[key]||key),hasRecorded=Boolean(recorded?.cues?.[recordedKey]);let started=false;
    if(src)started=playClip(src,priority,text,key);if(!started&&!forceTts)started=playSprite(key,priority,text);if(!started&&(!hasRecorded||forceTts))started=speakText(text,priority,key);
    if(!started){state.skipped++;state.lastSkipped={key,reason:"playback",at:now};return false}
    state.lastByKey.set(key,now);state.played++;return true;
  }
  function sayDialogue(key,text,opts={}){
    const voiceKey=String(key||"dialogue").trim()||"dialogue";
    const spokenText=String(text||"").trim();
    if(!spokenText||!state.enabled||tutorialSilent())return false;
    const priority=Number(opts.priority??44),cooldown=Math.max(0,Number(opts.cooldown??9000)),now=performance.now();
    if(!coolReady(voiceKey,cooldown,now))return false;
    if(!state.unlocked||!soundAllowed()){state.skipped++;state.lastSkipped={key:voiceKey,reason:"unavailable",at:now};return false}
    if(state.active){
      const mayInterrupt=Boolean(opts.interrupt);
      if(!mayInterrupt||priority<=state.activePriority){state.skipped++;state.lastSkipped={key:voiceKey,reason:"busy",at:now};return false}
      stopActive("interrupted")
    }
    const forceTts=Boolean(opts.forceTts),src=!forceTts?assetFor(voiceKey):"",recorded=window.CCG_RECORDED_VOICE_SPRITE,recordedKey=String(recorded?.aliases?.[voiceKey]||voiceKey),hasRecorded=Boolean(recorded?.cues?.[recordedKey]);let started=false;
    if(src)started=playClip(src,priority,spokenText,voiceKey);
    if(!started&&!forceTts)started=playSprite(voiceKey,priority,spokenText);
    if(!started&&(!hasRecorded||forceTts))started=speakText(spokenText,priority,voiceKey);
    if(!started){state.skipped++;state.lastSkipped={key:voiceKey,reason:"playback",at:now};return false}
    state.lastByKey.set(voiceKey,now);state.played++;return true
  }
  function setEnabled(value){state.enabled=Boolean(value);saveEnabled();if(!state.enabled){state.queue.length=0;stopActive()}updateButton();return state.enabled}
  function updateButton(){if(state.button){state.button.textContent=state.enabled?"VOICE ON":"VOICE OFF";state.button.setAttribute("aria-pressed",String(state.enabled));state.button.title=state.enabled?"Disable spoken game prompts":"Enable spoken game prompts"}}
  function mountButton(){
    if(document.getElementById("voice-btn"))return;
    const row=document.querySelector(".system-buttons");if(!row)return;
    const btn=document.createElement("button");btn.id="voice-btn";btn.type="button";btn.className="sound-toggle";btn.addEventListener("click",()=>{state.unlocked=true;setEnabled(!state.enabled);if(state.enabled)sayKey("welcome",{cooldown:0,text:"Voice prompts enabled.",forceTts:true})});
    const sound=document.getElementById("sound-btn");if(sound?.nextSibling)row.insertBefore(btn,sound.nextSibling);else row.appendChild(btn);state.button=btn;updateButton();
  }
  function unlock(){state.unlocked=true}
  function onRecordedPickupVoice(event){
    const detail=event?.detail||{},kind=String(detail.kind||""),lootKind=String(detail.lootKind||"");
    const key=kind==="health"?"healthRestored":kind==="ammo"||kind==="mana"?"ammoCollected":kind==="armour"?"armourRestored":kind==="bronze"?"bronzeKeyCollected":kind==="exitSigil"?"exitSigilAcquired":kind==="loot"&&lootKind==="artefact"?"essenceCollected":"";
    if(key==="ammoCollected"){
      // R70 voice pacing: ammunition is a routine pickup. Say it once per run,
      // and only mark it spoken when playback actually starts.
      const currentRun=run&&typeof run==="object"?run:null;
      const alreadySpoken=currentRun?state.ammoPickupRuns.has(currentRun):state.ammoPickupFallbackSpoken;
      if(!alreadySpoken){
        let started=false;try{started=Boolean(sayKey(key,{cooldown:0}))}catch(_){}
        if(started){if(currentRun)state.ammoPickupRuns.add(currentRun);else state.ammoPickupFallbackSpoken=true}
      }
    }else if(key)try{sayKey(key)}catch(_){}
    if(kind==="loot"&&lootKind==="artefact"&&!state.artefactLorePlayed){
      state.artefactLorePlayed=true;
      setTimeout(()=>{try{sayKey("essenceLore",{cooldown:0})}catch(_){}},2300)
    }
  }
  function onHazardDamageVoice(){
    setTimeout(()=>{try{sayKey("hazardPain",{cooldown:45000})}catch(_){}},420);
  }
  function onShopFirearmUpgradeVoice(){try{sayKey("weaponUpgraded",{cooldown:0})}catch(_){}}
  function onFirearmEvolvedVoice(event){const detail=event?.detail||{},before=Math.max(0,Number(detail.beforeTier)||0),after=Math.max(0,Number(detail.afterTier)||0);if(detail.first||after<=before)return;try{sayKey("weaponUpgraded",{cooldown:0})}catch(_){}}
  window.addEventListener?.("ccg:item-collected",onRecordedPickupVoice);
  window.addEventListener?.("ccg:hazard-damage",onHazardDamageVoice);
  window.addEventListener?.("ccg:shop-firearm-upgrade",onShopFirearmUpgradeVoice);
  window.addEventListener?.("ccg:firearm-evolved",onFirearmEvolvedVoice);
  window.addEventListener?.("pagehide",()=>{
    window.removeEventListener?.("ccg:item-collected",onRecordedPickupVoice);
    window.removeEventListener?.("ccg:hazard-damage",onHazardDamageVoice);
    window.removeEventListener?.("ccg:shop-firearm-upgrade",onShopFirearmUpgradeVoice);
    window.removeEventListener?.("ccg:firearm-evolved",onFirearmEvolvedVoice);
  },{once:true});
  document.addEventListener("pointerdown",unlock,{once:true,capture:true});document.addEventListener("keydown",unlock,{once:true,capture:true});
  if(window.speechSynthesis){const refresh=()=>{state.voices=window.speechSynthesis.getVoices?.()||[]};refresh();window.speechSynthesis.onvoiceschanged=refresh}

  function sharesLiveRoom(enemy){
    if(!enemy?.alive||!p1||!world)return false;
    try{
      if(W.roomAt(world,p1.x,p1.y)!==W.roomAt(world,enemy.x,enemy.y))return false;
      return typeof visibleTo!=="function"||visibleTo(p1,enemy.x,enemy.y);
    }catch(_){return false}
  }
  function deathStalkerEncounterVisible(){return (host?.enemies||[]).some(enemy=>enemy?.deathStalker&&enemy?.voidStalker&&sharesLiveRoom(enemy))}
  function loadulaEncounterVisible(){return Boolean(host?.stalker?.awake&&!host.stalker.permanentlyBanished&&sharesLiveRoom(host.stalker))}

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
    if(/LOCKED BRONZE DOOR/.test(s))return"bronzeKeyRequired";
    if(/BRONZE DOOR UNLOCKED/.test(s))return"bronzeDoorUnlocked";
    if(/LOCKED CHEST/.test(s))return"chestKeyRequired";
    if(/MECHANICAL GATE/.test(s))return"findSwitch";
    if(/DOOR SEALED/.test(s))return"doorSealed";
    if(/FLOOR OBJECTIVE COMPLETE/.test(s))return"exitSealed";
    if(/EXIT UNSEALED/.test(s))return"exitOpen";
    if(/FURNITURE AMBUSH/.test(s))return"ambush";
    if(/ARENA LOCKDOWN/.test(s))return"arenaLockdown";
    if(/MEMORY VAULT LOCKDOWN/.test(s))return"roomLockdown";
    if(/TIMED CHAMBER/.test(s)&&!/CLEARED/.test(s))return"timedChamber";
    if(/MEMORY PAD SEQUENCE/.test(s))return"memorySequenceStarted";
    if(/MEMORY SEQUENCE SOLVED/.test(s))return"sequenceComplete";
    if(/MEMORY SEQUENCE RESET|SEQUENCE INCORRECT|WRONG MEMORY PAD|TORCH ORDER WRONG/.test(s))return"sequenceIncorrect";
    if(/TORCH VAULT OPEN/.test(s))return"sequenceComplete";
    if(/SCOUT REACHES SANCTUARY/.test(s))return"sanctuaryReached";
    if(/SIGIL CHAMBER LOCKDOWN/.test(s))return"sigilWardenEncountered";
    if(/SIGIL WARDEN DOWN/.test(s))return"sigilWardenDefeated";
    if(/SHOP PURCHASE/.test(s))return"merchantPurchase";
    if(/FLOOR EXIT SEALED/.test(s))return"exitSealed";
    if(/NOT ENOUGH SCORE/.test(s))return"shopNoScore";
    if(/NOT ENOUGH BANISHMENT ESSENCE/.test(s))return"notEnoughEssence";
    if(/NOT ENOUGH ARTEFACTS/.test(s))return"notEnoughArtefacts";
    if(/INVENTORY FULL/.test(s))return"inventoryFull";
    if(/BANISHMENT FLASK (?:ACQUIRED|DISTILLED)/.test(s))return"banishmentFlaskAcquired";
    if(/EXIT SIGIL/.test(s)&&/ACQUIRED|FOUND|COLLECTED/.test(s))return"exitSigilAcquired";
    if(/BRONZE KEY/.test(s)&&/FOUND|COLLECTED|ACQUIRED/.test(s))return"bronzeKeyCollected";
    if(/WEAPON EVOLVED|FIREARM UPGRADE COMPLETE/.test(s))return"weaponUpgraded";
    if(/HAZARD CHAMBER|TRAPS NEARBY/.test(s))return"trapsNearby";
    // Lore, door and shop messages also mention these names. A threat cue is
    // authorised only by the corresponding live enemy in the player's room.
    if(/COUNT LOADULA|LOADULA/.test(s)&&loadulaEncounterVisible())return"loadula";
    if(/WEAPONS CANNOT|CANNOT BE KNOCKED BACK|RESISTS THE BLADE/.test(s)&&deathStalkerEncounterVisible())return"deathStalkerImmune";
    if(/DEATH STALKER/.test(s)&&deathStalkerEncounterVisible())return"deathStalker";
    if(/RADAR HINT/.test(s))return"objectiveHint";
    if(/OBJECTIVE NEAR|GETTING WARM/.test(s))return"objectiveNear";
    if(/SECRET DOOR/.test(s))return"secretDoor";
    if(/SECRET.*FOUND|HIDDEN WALL|SECRET REVEALED/.test(s))return"secret";
    if(/WEEKLY VAULT.*RUN OVER/.test(s))return"weeklyDeath";
    if(/BOULDER.*RUN/.test(s))return"boulder";
    if(/^DANGER\s*—/.test(s))return"dangerRoom";
    if(/TRAP|HAZARD.*MOVE/.test(s))return"trap";
    if(/SANCTUARY/.test(s)){
      try{const room=world?.rooms?.[W.roomAt(world,p1?.x,p1?.y)];if(room?.sanctuary)return"sanctuary"}catch(_){}
      return"";
    }
    if(/UPGRADE AVAILABLE/.test(s))return"upgradeAvailable";
    if(/LEVEL UP|^LEVEL\s+\d+\b/.test(s))return"levelUp";
    if(/NAMED ENEMY\s*[—-]/.test(s))return"namedEnemy";
    if(/GOLD MEDAL|ZZAP! 97%|RARE.*LOOT|ARTEFACT/.test(s))return"rareLoot";
    return"";
  }

  if(typeof showToast==="function"){
    const originalShowToast=showToast;
    showToast=function showToastV116Voice(title,text,tone,duration,meta){const result=originalShowToast.apply(this,arguments);try{if(meta?.ccgDialogueVoiceHandled!==true){const key=classifyToast(title,text);if(key){sayKey(key);if(key==="arenaLockdown")sayKey("surviveAmbush",{queue:true,cooldown:0});else if(key==="memorySequenceStarted")sayKey("watchSequence",{queue:true,cooldown:0})}}}catch(_){}return result};
  }
  if(typeof hurtPlayer==="function"){
    const originalHurtPlayer=hurtPlayer;
    hurtPlayer=function hurtPlayerV116Voice(player,n,friendly=false,source="enemy"){
      const before=Number(player?.health||0)+Number(player?.armor||0),deathsBefore=Number(run?.stats?.deaths||0),result=originalHurtPlayer.apply(this,arguments),after=Number(player?.health||0)+Number(player?.armor||0),deathsAfter=Number(run?.stats?.deaths||0);
      try{
        const painPlayed=after<before?sayKey("hurt"):false;
        if(deathsAfter>deathsBefore)setTimeout(()=>sayKey("playerDeath"),painPlayed?800:0);
        if(player&&player.maxHealth&&player.health>0&&player.health/player.maxHealth<=.12&&!state.criticalHealthLatch.has(player)){state.criticalHealthLatch.add(player);sayKey("criticalHealth")}else if(player&&player.maxHealth&&player.health>0&&player.health/player.maxHealth<=.28&&!state.lowHealthLatch.has(player)){state.lowHealthLatch.add(player);sayKey("lowHealth")}
      }catch(_){}return result;
    };
  }
  if(typeof update==="function"){
    const originalUpdate=update;
    update=function updateV116LowHealthLatch(dt){
      const result=originalUpdate.apply(this,arguments);
      try{for(const player of (typeof localPlayers==="function"?localPlayers():[p1,p2].filter(Boolean)))if(player?.maxHealth&&Number(player.health||0)/Number(player.maxHealth)>=.5){state.lowHealthLatch.delete(player);state.criticalHealthLatch.delete(player)}}catch(_){}
      return result;
    };
  }
  if(typeof firePlayer==="function"){
    const originalFirePlayer=firePlayer;
    firePlayer=function firePlayerV116Voice(player,direction){
      const hadGun=Boolean(player?.firearmUnlocked&&player?.weapon),before=Math.max(0,Number(player?.mana||0)),result=originalFirePlayer.apply(this,arguments),after=Math.max(0,Number(player?.mana||0));
      try{if(hadGun&&before>0&&after===0)sayKey("noAmmo")}catch(_){}
      return result;
    };
  }
  if(typeof beginRun==="function"){
    const originalBeginRun=beginRun;
    beginRun=function beginRunV116Voice(opts={}){
      const result=originalBeginRun.apply(this,arguments);
      stopActive();state.queue.length=0;state.rareLootFloor=0;state.artefactLorePlayed=false;state.gildedFiveWarned.clear();state.lastByKey.delete("noAmmo");const activeRun=run;
      setTimeout(()=>{
        try{
          if(run!==activeRun||mode!=="playing")return;
          const welcomeKey=opts?.daily?"weeklyWelcome":(Math.random()<.1?"welcomeRare":"welcome");
          sayKey(welcomeKey);
          if(opts?.daily&&window.CCGWeeklyChallenge?.state?.ghost?.path?.length)sayKey("weeklyGhost");
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
      if(p1.maxHealth&&p1.health>0&&p1.health/p1.maxHealth<=.12&&!state.criticalHealthLatch.has(p1)){state.criticalHealthLatch.add(p1);sayKey("criticalHealth")}else if(p1.maxHealth&&p1.health>0&&p1.health/p1.maxHealth<=.28&&!state.lowHealthLatch.has(p1)){state.lowHealthLatch.add(p1);sayKey("lowHealth")}
      for(const elf of host?.enemies||[])if(elf?.gildedElf&&elf.alive&&Number(elf.lifeMs||0)<=5200&&!state.gildedFiveWarned.has(elf.id)){state.gildedFiveWarned.add(elf.id);sayKey("gildedFive",{cooldown:0})}
    }catch(_){}
  }
  if(typeof update==="function"){
    const originalUpdate=update;
    update=function updateV116Voice(dt){const result=originalUpdate.apply(this,arguments);try{voiceWatch(dt)}catch(_){}return result};
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mountButton,{once:true});else mountButton();
  window.CCGLostSizzlerVoice={say:sayKey,sayDialogue,stop:stopActive,classifyToast,setEnabled,get enabled(){return state.enabled},get state(){return state},lines,bundledSprite:BUNDLED_SPRITE};
})();
