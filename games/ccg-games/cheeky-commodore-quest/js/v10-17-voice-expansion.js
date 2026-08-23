/* The Lost Sizzler V10.17 — rare-event voice expansion. */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_VOICE_EXPANSION_V117__)return;
  window.__CCG_LOST_SIZZLER_VOICE_EXPANSION_V117__=true;

  const voice=window.CCGLostSizzlerVoice;
  if(!voice?.lines||typeof voice.say!=="function")return;

  Object.assign(voice.lines,{
    mimic:{variants:["Mimic! That chest has teeth!","Mimic chest. Shoot first, loot later."],priority:74,cooldown:9000},
    cursed:{variants:["Cursed cartridge acquired.","That cartridge comes with strings attached."],priority:52,cooldown:10000},
    curseCleared:{variants:["Curse cleansed.","The cartridge curse is gone."],priority:38,cooldown:8000},
    merchant:{variants:["Wandering merchant nearby.","Travelling shopkeeper. He will not stay long."],priority:38,cooldown:15000},
    merchantGone:{variants:["Merchant gone.","The wandering merchant has moved on."],priority:28,cooldown:12000},
    goldenRoom:{variants:["Golden Room! Survive the rush!","Golden Room. Twenty five seconds. Stay alive."],priority:76,cooldown:10000},
    goldenClear:{variants:["Golden Room cleared. Collect your reward.","Survived it. Grab the gold."],priority:64,cooldown:8000},
    adventurer:{variants:["Lost adventurer found.","Someone else made it this far. Get them to sanctuary."],priority:46,cooldown:12000},
    adventurerSaved:{variants:["Adventurer rescued.","Escort complete. Nice work."],priority:48,cooldown:8000},
    tremor:{variants:["Dungeon tremor!","Something just cracked open nearby."],priority:62,cooldown:12000},
    cabinet:{variants:["Arcade challenge! Eight kills. No damage.","Possessed cabinet. Challenge accepted."],priority:60,cooldown:10000},
    cabinetWin:{variants:["Arcade challenge complete!","Perfect run. Reward unlocked."],priority:66,cooldown:7000},
    cabinetFail:{variants:["Arcade challenge failed.","Challenge over. Better luck next time."],priority:42,cooldown:7000},
    treasureBat:{variants:["Treasure bat! Shoot it down!","That bat is carrying loot. Get it!"],priority:63,cooldown:10000},
    treasureBatGone:{variants:["Treasure bat escaped.","And the loot flies away."],priority:42,cooldown:8000},
    treasureBatDown:{variants:["Treasure bat down. Prize dropped.","Got it. Grab the reward."],priority:58,cooldown:7000},
    taxman:{variants:["The Taxman!","Oi! He's nicking your score!"],priority:72,cooldown:10000},
    taxmanCaught:{variants:["Taxman caught. Refund time.","Got him. Take your score back."],priority:64,cooldown:7000},
    mysteryPotion:{variants:["Mystery potion. Brave choice.","You drank that without checking the label?"],priority:34,cooldown:9000},
    developerRoom:{variants:["Secret developer room found.","You found the C C G developer room."],priority:60,cooldown:15000},
    bounty:{variants:["New dungeon bounty.","Bonus objective available."],priority:40,cooldown:10000},
    bountyComplete:{variants:["Bounty complete!","Bonus objective complete. Nice."],priority:58,cooldown:7000},
    treasureMap:{variants:["Treasure map found. Check the radar.","Buried cache marked on your radar."],priority:48,cooldown:10000},
    buriedCache:{variants:["Buried cache found.","Treasure located."],priority:54,cooldown:7000},
    mutation:{variants:["Floor mutation active.","Dungeon rules have changed on this floor."],priority:50,cooldown:10000},
    weeklyGhost:{variants:["Weekly ghost detected.","Another ranked run is passing through here."],priority:30,cooldown:20000},
    respawn:{variants:["Back on your feet.","Try not to make a habit of that.","Right. Again."],priority:48,cooldown:6000}
  });

  function classifyRare(title,text){
    const s=`${title||""} ${text||""}`.toUpperCase();
    if(/MIMIC CHEST|MIMIC DEFEATED/.test(s))return"mimic";
    if(/CURSED CARTRIDGE CLEANSED/.test(s))return"curseCleared";
    if(/CURSED CARTRIDGE/.test(s))return"cursed";
    if(/WANDERING MERCHANT MOVES ON/.test(s))return"merchantGone";
    if(/WANDERING MERCHANT|TRAVELLING SHOPKEEPER/.test(s))return"merchant";
    if(/GOLDEN ROOM CLEARED/.test(s))return"goldenClear";
    if(/GOLDEN ROOM/.test(s))return"goldenRoom";
    if(/ADVENTURER RESCUED/.test(s))return"adventurerSaved";
    if(/LOST ADVENTURER/.test(s))return"adventurer";
    if(/DUNGEON TREMOR/.test(s))return"tremor";
    if(/ARCADE CHALLENGE COMPLETE/.test(s))return"cabinetWin";
    if(/ARCADE CHALLENGE FAILED/.test(s))return"cabinetFail";
    if(/POSSESSED ARCADE CABINET/.test(s))return"cabinet";
    if(/TREASURE BAT DOWN/.test(s))return"treasureBatDown";
    if(/TREASURE BAT ESCAPED/.test(s))return"treasureBatGone";
    if(/TREASURE BAT/.test(s))return"treasureBat";
    if(/TAXMAN CAUGHT/.test(s))return"taxmanCaught";
    if(/THE TAXMAN|TAXMAN!/.test(s))return"taxman";
    if(/MYSTERY POTION/.test(s))return"mysteryPotion";
    if(/SECRET CCG DEVELOPER ROOM|DEVELOPER ROOM/.test(s))return"developerRoom";
    if(/DUNGEON BOUNTY COMPLETE/.test(s))return"bountyComplete";
    if(/DUNGEON BOUNTY/.test(s))return"bounty";
    if(/BURIED CACHE FOUND/.test(s))return"buriedCache";
    if(/TREASURE MAP FRAGMENT/.test(s))return"treasureMap";
    if(/FLOOR MUTATION/.test(s))return"mutation";
    if(/WEEKLY GHOST|GHOST REPLAY/.test(s))return"weeklyGhost";
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

  if(typeof hurtPlayer==="function"){
    const originalHurtPlayer=hurtPlayer;
    hurtPlayer=function hurtPlayerV117VoiceExpansion(player,n,friendly=false,source="enemy"){
      const deathsBefore=Number(run?.stats?.deaths||0),result=originalHurtPlayer.apply(this,arguments),deathsAfter=Number(run?.stats?.deaths||0);
      try{if(!run?.daily&&deathsAfter>deathsBefore&&Number(player?.health||0)>0)voice.say("respawn",{cooldown:0})}catch(_){}
      return result;
    };
  }

  window.CCGLostSizzlerVoiceExpansion={classifyRare};
})();
