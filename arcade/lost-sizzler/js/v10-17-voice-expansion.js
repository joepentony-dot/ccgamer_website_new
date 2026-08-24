/* The Lost Sizzler V10.17 — rare-event voice expansion. */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_VOICE_EXPANSION_V117__)return;
  window.__CCG_LOST_SIZZLER_VOICE_EXPANSION_V117__=true;

  const voice=window.CCGLostSizzlerVoice;
  if(!voice?.lines||typeof voice.say!=="function")return;

  Object.assign(voice.lines,{
    merchant:{variants:["Wandering merchant nearby.","Travelling shopkeeper. He will not stay long."],priority:38,cooldown:15000},
    merchantGone:{variants:["Merchant gone.","The wandering merchant has moved on."],priority:28,cooldown:12000},
    adventurer:{variants:["Lost adventurer found.","Someone else made it this far. Get them to sanctuary."],priority:46,cooldown:12000},
    adventurerSaved:{variants:["Adventurer rescued.","Escort complete. Nice work."],priority:48,cooldown:8000},
    tremor:{variants:["Dungeon tremor!","Something just cracked open nearby."],priority:62,cooldown:12000},
    cabinet:{variants:["Arcade challenge! Eight kills. No damage.","Possessed cabinet. Challenge accepted."],priority:60,cooldown:10000},
    cabinetWin:{variants:["Arcade challenge complete!","Perfect run. Reward unlocked."],priority:66,cooldown:7000},
    cabinetFail:{variants:["Arcade challenge failed.","Challenge over. Better luck next time."],priority:42,cooldown:7000},
    developerRoom:{variants:["Secret developer room found.","You found the C C G developer room."],priority:60,cooldown:15000},
    bountyStart:{variants:["New dungeon bounty.","Bonus objective available."],priority:40,cooldown:10000},
    treasureMap:{variants:["Treasure map found. Check the radar.","Buried cache marked on your radar."],priority:48,cooldown:10000},
    buriedCache:{variants:["Buried cache found.","Treasure located."],priority:54,cooldown:7000},
    respawn:{variants:["Back on your feet.","Try not to make a habit of that.","Right. Again."],priority:48,cooldown:6000}
  });

  function classifyRare(title,text){
    const s=`${title||""} ${text||""}`.toUpperCase();
    if(/WANDERING MERCHANT MOVES ON/.test(s))return"merchantGone";
    if(/WANDERING MERCHANT|TRAVELLING SHOPKEEPER/.test(s))return"merchant";
    if(/ADVENTURER RESCUED/.test(s))return"adventurerSaved";
    if(/LOST ADVENTURER/.test(s))return"adventurer";
    if(/DUNGEON TREMOR/.test(s))return"tremor";
    if(/ARCADE CHALLENGE COMPLETE/.test(s))return"cabinetWin";
    if(/ARCADE CHALLENGE FAILED/.test(s))return"cabinetFail";
    if(/POSSESSED ARCADE CABINET/.test(s))return"cabinet";
    if(/SECRET CCG DEVELOPER ROOM|DEVELOPER ROOM/.test(s))return"developerRoom";
    if(/BURIED CACHE FOUND/.test(s))return"buriedCache";
    if(/TREASURE MAP FRAGMENT/.test(s))return"treasureMap";
    return"";
  }

  if(typeof showToast==="function"){
    const originalShowToast=showToast;
    showToast=function showToastV117VoiceExpansion(title,text,tone,duration){
      const result=originalShowToast.apply(this,arguments);
      try{const key=classifyRare(title,text);if(key)voice.say(key)}catch(_){}
      return result;
    };
  }

  window.CCGLostSizzlerVoiceExpansion={classifyRare};
})();
