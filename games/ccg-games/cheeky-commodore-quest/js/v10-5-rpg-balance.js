/* The Lost Sizzler V10.5 — RPG progression and adaptive enemy threat. */
(function(){
  "use strict";
  if(window.__CCG_LOST_SIZZLER_RPG_BALANCE_V105__)return;
  window.__CCG_LOST_SIZZLER_RPG_BALANCE_V105__=true;

  const CONFIG=window.CCG_CONFIG;
  const PROG=window.CCGProgression;
  const AI=window.CCGAI;
  if(!CONFIG||!PROG||!AI)return;

  const FLOOR_LEVEL_CAPS=[5,10,15,20,25];
  if(Array.isArray(CONFIG.levelCaps))CONFIG.levelCaps.splice(0,CONFIG.levelCaps.length,...FLOOR_LEVEL_CAPS);

  const originalFloorLevelCap=PROG.floorLevelCap?.bind(PROG);
  PROG.floorLevelCap=function floorLevelCapV105(runState){
    const floor=Math.max(1,Math.min(CONFIG.maxFloors,Number(runState?.floor||1)));
    return FLOOR_LEVEL_CAPS[floor-1]||originalFloorLevelCap?.(runState)||25;
  };

  function combatPower(player){
    if(!player)return 1;
    const weapon=player.weapon||{};
    const raw=Math.max(1,Number(weapon.power||1)+Number(player.damageBonus||0));
    const shots=Math.max(1,Number(weapon.shots||1));
    const fireRate=1/Math.max(.58,Number(weapon.delay||1));
    const pierce=Math.max(0,Number(weapon.pierce||0));
    return raw*(1+Math.min(.48,(shots-1)*.12))*(1+Math.min(.18,pierce*.045))*Math.min(1.32,fireRate);
  }

  function strongestPlayer(players){
    return (players||[]).filter(player=>player&&Number(player.health||0)>0).sort((a,b)=>{
      const levelDiff=Number(b.level||1)-Number(a.level||1);
      return levelDiff||combatPower(b)-combatPower(a);
    })[0]||null;
  }

  function livingPlayers(players){return (players||[]).filter(player=>player&&Number(player.health||0)>0)}

  function difficultyScale(runState){
    try{return Number(PROG.difficulty(runState)?.enemyHp||1)}catch(_){return 1}
  }

  function threatProfile(players,runState){
    const living=livingPlayers(players),lead=strongestPlayer(living);
    const level=Math.max(1,Number(lead?.level||1));
    const combat=Math.max(1,combatPower(lead));
    const party=Math.max(1,living.length);
    const durability=Math.max(0,Number(lead?.maxHealth||CONFIG.player.maxHealth)-CONFIG.player.maxHealth)+Math.max(0,Number(lead?.armor||0))*0.22;
    const levelPressure=Math.min(1.08,(level-1)*.045);
    const weaponPressure=Math.min(.58,Math.max(0,combat-1)*.105);
    const partyPressure=Math.min(.36,(party-1)*.12);
    const survivalPressure=Math.min(.18,durability*.018);
    const damageScale=Math.min(1.68,1+(level-1)*.0275+Math.min(.16,durability*.012)+(party-1)*.035);
    const cadenceScale=Math.min(1.30,1+(level-1)*.0105+(party-1)*.025);
    return{lead,level,combat,party,levelPressure,weaponPressure,partyPressure,survivalPressure,damageScale,cadenceScale,difficulty:difficultyScale(runState)};
  }

  function raiseEnemyDurability(enemy,profile){
    if(!enemy?.alive||enemy.deathStalker||enemy.treasureGoblin)return;
    const base=Math.max(1,Number(enemy._v104BaseMaxHp||enemy._v105BaseMaxHp||enemy.maxHp||enemy.hp||1));
    if(!enemy._v105BaseMaxHp)enemy._v105BaseMaxHp=base;

    let scale;
    if(enemy.follower){
      // Named enemies already receive strong per-level HP/armour scaling in systems.js.
      // Only party size and weapon power add a modest extra response here.
      scale=Math.min(1.45,1.04+profile.weaponPressure*.30+profile.partyPressure*.45);
    }else if(enemy.guardian){
      scale=Math.min(2.25,1.12+profile.levelPressure*.78+profile.weaponPressure*.72+profile.partyPressure*.72+profile.survivalPressure*.6);
    }else if(enemy.champion){
      scale=Math.min(2.45,1.15+profile.levelPressure*.88+profile.weaponPressure*.82+profile.partyPressure*.82+profile.survivalPressure*.7);
    }else{
      scale=Math.min(2.55,1.12+profile.levelPressure+profile.weaponPressure+profile.partyPressure+profile.survivalPressure);
    }

    const desired=Math.max(Number(enemy.maxHp||1),Math.ceil(base*scale));
    if(desired>Number(enemy.maxHp||0)){
      const oldMax=Math.max(1,Number(enemy.maxHp||1));
      const delta=desired-oldMax;
      const wasFull=Number(enemy.hp||0)>=oldMax;
      enemy.maxHp=desired;
      enemy.hp=wasFull?desired:Math.min(desired,Number(enemy.hp||0)+Math.max(1,Math.ceil(delta*.38)));
    }

    if(!enemy.ccgBoss){
      const currentDamage=Math.max(1,Number(enemy.namedDamageScale||1));
      if(enemy.follower){
        const adaptiveNamed=Math.min(2.35,1+(profile.level-1)*.055+profile.partyPressure*.28);
        enemy.namedDamageScale=Math.max(currentDamage,adaptiveNamed);
      }else{
        enemy.namedDamageScale=Math.max(currentDamage,profile.damageScale);
      }
    }
    enemy._v105ThreatLevel=profile.level;
    enemy._v105ThreatParty=profile.party;
  }

  let lastProfile={level:1,combat:1,party:1,damageScale:1,cadenceScale:1};
  if(AI.stepEnemies){
    const originalStepEnemies=AI.stepEnemies.bind(AI);
    AI.stepEnemies=function stepEnemiesV105Rpg(hostState,map,players,dt,hooks,worldState){
      const profile=threatProfile(players,typeof run!=="undefined"?run:null);
      lastProfile=profile;
      const adjustedDt=Number(dt||0)*profile.cadenceScale;
      const result=originalStepEnemies(hostState,map,players,adjustedDt,hooks,worldState);
      for(const enemy of hostState?.enemies||[])raiseEnemyDurability(enemy,profile);
      return result;
    };
  }

  function capLabel(runState){return PROG.floorLevelCap(runState)}
  window.CCGRpgBalanceV105={
    floorCaps:[...FLOOR_LEVEL_CAPS],
    getProfile:()=>({...lastProfile}),
    getFloorCap:capLabel,
    combatPower
  };
})();
