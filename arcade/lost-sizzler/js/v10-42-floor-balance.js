/* The Lost Sizzler V10.42 — progressive five-floor combat balance finalizer. */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V142_FLOOR_BALANCE__)return;
  window.__CCG_LOST_SIZZLER_V142_FLOOR_BALANCE__=true;

  const DAMAGE_SCALE=Object.freeze({1:.80,2:.90,3:1.00,4:1.10,5:1.20});
  const ELITE_SCALE=Object.freeze({1:.90,2:.96,3:1.00,4:1.08,5:1.16});
  let timer=0,attempts=0;

  function install(){
    const C=window.CCG_CONFIG,SYS=window.CCGSystems,campaign=window.CCGLostSizzlerV142FiveDepthCampaign;
    if(!C||!SYS||!campaign)return false;
    if(window.CCGLostSizzlerV142FloorBalance)return true;

    const floorOf=runState=>Math.max(1,Math.min(C.maxFloors,Math.floor(Number(runState?.floor)||1)));
    const damageFor=runState=>DAMAGE_SCALE[floorOf(runState)]||1;
    const eliteFor=runState=>ELITE_SCALE[floorOf(runState)]||1;

    function applyCombatBalance(hostState,runState){
      if(!hostState||!runState)return hostState;
      const floor=floorOf(runState),damage=damageFor(runState),elite=eliteFor(runState);
      for(const enemy of hostState.enemies||[]){
        if(!enemy||enemy.alive===false)continue;
        const named=Boolean(enemy.follower||enemy.champion||enemy.guardian||enemy.keyGuardian||enemy.ccgBoss);
        const inheritedProjectile=Number(enemy.damageScale||1),inheritedMelee=Number(enemy.namedDamageScale||1);
        enemy.damageScale=inheritedProjectile*damage*(named?elite:1);
        enemy.namedDamageScale=inheritedMelee*damage*(named?elite:1);
        enemy.v142CombatFloor=floor;
        enemy.v142DamageScale=damage;
        if(floor===1){
          // The opening depth teaches the RPG and alchemy systems. It must hurt,
          // but it should not spike before the player has earned a build.
          enemy.attackCooldown=Math.max(Number(enemy.attackCooldown)||0,700);
          if(enemy.kind==="charger")enemy.chargeCooldown=Math.max(Number(enemy.chargeCooldown)||0,1200);
        }
        if(floor===5&&named){
          // Named threats on the final depth should remain significant after the
          // player's four floors of stat and relic growth without becoming a HP sponge.
          const oldMax=Math.max(1,Number(enemy.maxHp||enemy.hp)||1),bonus=Math.max(1,Math.round(oldMax*.10));
          enemy.maxHp=oldMax+bonus;enemy.hp=Math.min(enemy.maxHp,Math.max(1,Number(enemy.hp||oldMax)+bonus));
          if(enemy.maxArmor!=null||enemy.armor!=null){enemy.maxArmor=Math.min(14,Math.max(0,Number(enemy.maxArmor||enemy.armor||0)+1));enemy.armor=Math.min(enemy.maxArmor,Math.max(0,Number(enemy.armor||0)+1))}
        }
      }
      hostState.v142CombatBalance={floor,damageScale:damage,eliteScale:elite};
      return hostState;
    }

    const baseDecorate=SYS.decorate.bind(SYS);
    SYS.decorate=function(worldState,hostState,runState){const result=baseDecorate(worldState,hostState,runState);applyCombatBalance(hostState,runState);return result};

    window.CCGLostSizzlerV142FloorBalance={
      version:"V10.42",
      damageScale:{...DAMAGE_SCALE},
      eliteScale:{...ELITE_SCALE},
      damageFor,
      eliteFor,
      applyCombatBalance
    };
    return true;
  }

  if(!install()){
    timer=setInterval(()=>{attempts++;if(install()||attempts>200){clearInterval(timer);timer=0}},50);
    addEventListener("pagehide",()=>{if(timer)clearInterval(timer)},{once:true});
  }
})();