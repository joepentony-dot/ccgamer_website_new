/* The Lost Sizzler V10.27 — CCG recorded voice pack defaults. */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_RECORDED_VOICE_PACK_V127__)return;
  window.__CCG_LOST_SIZZLER_RECORDED_VOICE_PACK_V127__=true;

  const voice=window.CCG_ASSET_OVERRIDES?.audio?.voice;
  if(!voice)return;

  const NORMAL_WELCOME="assets/audio/voice/welcome.mp3";
  const RARE_WELCOME="assets/audio/voice/welcome-rare.mp3";
  const defaults={
    welcome:NORMAL_WELCOME,
    hurt:"assets/audio/voice/player-hurt.mp3",
    lowHealth:"assets/audio/voice/low-health.mp3",
    noAmmo:"assets/audio/voice/low-ammo.mp3",
    secret:"assets/audio/voice/secret-found.mp3",
    objectiveNear:"assets/audio/voice/objective-nearby.mp3",
    floorClear:"assets/audio/voice/floor-clear.mp3",
    gameOver:"assets/audio/voice/game-over.mp3",
    playerDeath:"assets/audio/voice/player-death.mp3",
    rareLoot:"assets/audio/voice/rare-loot.mp3",
    levelUp:"assets/audio/voice/level-up.mp3",
    shop:"assets/audio/voice/shop-found.mp3",
    sanctuary:"assets/audio/voice/sanctuary.mp3",
    trap:"assets/audio/voice/trap-warning.mp3",
    boulder:"assets/audio/voice/boulder-warning.mp3",
    respawn:"assets/audio/voice/respawn.mp3"
  };

  /* These are bundled defaults only. If the admin audio loader has already
   * supplied a cue, leave it alone; if it arrives later it can still overwrite
   * this same object. Objective Hint is deliberately not assigned here, so its
   * existing browser-voice fallback remains intact. */
  for(const [key,src] of Object.entries(defaults)){
    const current=voice[key];
    const empty=current==null||current===""||(Array.isArray(current)&&current.length===0);
    if(empty)voice[key]=src;
  }

  function installRareWelcome(){
    const director=window.CCGLostSizzlerVoice;
    if(!director||typeof director.say!=="function"||director.__ccgRecordedWelcomeWrapped)return false;
    const originalSay=director.say.bind(director);
    director.say=function sayWithRecordedWelcome(key,opts){
      if(key==="welcome"){
        const current=voice.welcome;
        if(current===NORMAL_WELCOME||current===RARE_WELCOME){
          voice.welcome=Math.random()<0.10?RARE_WELCOME:NORMAL_WELCOME;
        }
      }
      return originalSay(key,opts);
    };
    director.__ccgRecordedWelcomeWrapped=true;
    return true;
  }

  if(!installRareWelcome()){
    let tries=0;
    const timer=setInterval(()=>{
      tries++;
      if(installRareWelcome()||tries>=200)clearInterval(timer);
    },50);
    window.addEventListener("pagehide",()=>clearInterval(timer),{once:true});
  }

  window.CCGLostSizzlerRecordedVoicePackV127={
    defaults,
    normalWelcome:NORMAL_WELCOME,
    rareWelcome:RARE_WELCOME,
    rareWelcomeChance:0.10,
    installRareWelcome
  };
})();
