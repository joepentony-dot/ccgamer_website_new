/* C64 Dungeon Carnage V10.42 R94 — floor-aware ordinary-enemy identity. */
(()=>{
  "use strict";
  if(window.CCGLostSizzlerV142R94EnemyIdentity)return;

  const BANDS=Object.freeze([
    Object.freeze({maxFloor:5,labels:Object.freeze({
      spider:"Dustweb Spider",skeleton:"Crypt Skeleton",knight:"Archive Knight",scout:"Vault Scout",
      hunter:"Relic Hunter",ambusher:"Shadow Ambusher",guard:"Iron Guard",charger:"Orc Reaver",
      ranger:"Rune Ranger",root:"Thorn Caster",cook:"Orc Scavenger",firebreather:"Ember Fiend",
      ghost:"Archive Wraith",treasure:"Treasure Goblin"
    })}),
    Object.freeze({maxFloor:10,labels:Object.freeze({
      spider:"Gloomweb Spider",skeleton:"Mossbound Skeleton",knight:"Crypt Knight",scout:"Catacomb Scout",
      hunter:"Gloom Hunter",ambusher:"Nightblade",guard:"Runebound Guard",charger:"Crypt Orc Reaver",
      ranger:"Deep Ranger",root:"Briar Hexer",cook:"Crypt Orc Scavenger",firebreather:"Cinder Fiend",
      ghost:"Memory Wraith",treasure:"Treasure Goblin"
    })}),
    Object.freeze({maxFloor:15,labels:Object.freeze({
      spider:"Bloodweb Spider",skeleton:"Ashen Boneguard",knight:"Blood Knight",scout:"Citadel Scout",
      hunter:"Blood Hunter",ambusher:"Duskblade",guard:"Citadel Guard",charger:"Citadel Orc Reaver",
      ranger:"Ash Ranger",root:"Ashen Hexer",cook:"Citadel Orc Scavenger",firebreather:"Infernal Maw",
      ghost:"Blood Wraith",treasure:"Treasure Goblin"
    })})
  ]);

  const FALLBACK=Object.freeze({
    spider:"Dustweb Spider",skeleton:"Crypt Skeleton",knight:"Archive Knight",scout:"Dungeon Scout",
    hunter:"Dungeon Hunter",ambusher:"Shadow Ambusher",guard:"Dungeon Guard",charger:"Orc Reaver",
    ranger:"Dungeon Ranger",root:"Root Caster",cook:"Orc Scavenger",firebreather:"Firebreather",
    ghost:"Dungeon Wraith",champion:"Citadel Champion",treasure:"Treasure Goblin"
  });

  function floorOf(enemy,context){
    const value=Number(context?.floor??enemy?.v142Floor??enemy?.floor??1);
    return Math.max(1,Math.min(15,Number.isFinite(value)?Math.floor(value):1));
  }

  function ordinaryLabel(enemy,context={}){
    const kind=String(enemy?.kind||"enemy");
    const floor=floorOf(enemy,context);
    const band=BANDS.find(row=>floor<=row.maxFloor)||BANDS[BANDS.length-1];
    return band.labels[kind]||FALLBACK[kind]||kind.replace(/(^|[-_])\w/g,match=>match.replace(/[-_]/,"").toUpperCase());
  }

  function label(enemy,context={}){
    if(!enemy)return "Enemy";
    if(enemy.deathStalker&&enemy.voidStalker)return "Death Stalker";
    if(enemy.follower?.name)return String(enemy.follower.name);
    if(enemy.exitWarden)return String(enemy.championName||"Sigil Warden");
    if(enemy.championName)return String(enemy.championName);
    if(enemy.guardian)return String(context.guardianName||"Floor Guardian");
    if(enemy.treasureGoblin)return "Treasure Goblin";
    return ordinaryLabel(enemy,context);
  }

  const api=Object.freeze({label,ordinaryLabel,floorOf,bands:BANDS,fallback:FALLBACK});
  window.CCGDungeonEnemyIdentity=api;
  window.CCGLostSizzlerV142R94EnemyIdentity=api;
})();