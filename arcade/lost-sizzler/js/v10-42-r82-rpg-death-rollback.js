/* C64 Dungeon Carnage V10.42 r82 — RPG level-loss rollback integrity. */
(()=>{
  "use strict";
  if(window.CCGLostSizzlerV142R82RpgDeathRollback)return;

  const PGR=window.CCGProgression;
  const CFG=window.CCG_CONFIG;
  if(!PGR||typeof PGR.applyDeathPenalty!=="function")return;

  const BASE=5;
  const THRESHOLD=10;
  const state={rollbacks:0,last:null};

  function statName(id){
    return ({might:"MIGHT",vitality:"VITALITY",agility:"AGILITY",endurance:"ENDURANCE",luck:"LUCK",arcana:"ARCANA"})[id]||String(id||"ATTRIBUTE").toUpperCase()
  }
  function markLedger(player,id,active){
    if(!player)return;
    const ledger=player.v142R23BuildMilestones;
    if(!ledger||typeof ledger!=="object"||Array.isArray(ledger))return;
    if(active)ledger[id]=THRESHOLD;else delete ledger[id]
  }
  function recomputeArcana(player,value){
    const points=Math.max(0,value-BASE);
    const baseCost=Math.max(2,Math.floor(Number(CFG?.proceduralDungeon?.essenceRequired)||3));
    const arcanaCuts=Math.max(0,Math.floor(value/3)-Math.floor(BASE/3));
    const relicCut=Array.isArray(player?.relics)&&player.relics.includes("alchemist-seal")?1:0;
    player.banishmentEssenceCost=Math.max(2,baseCost-arcanaCuts-relicCut);

    let ward=Math.max(14000,30000-points*1800);
    const specialised=value>=THRESHOLD&&Number(player?.v142R23BuildMilestones?.arcana||0)>=THRESHOLD;
    const amplified=Array.isArray(player?.relics)&&player.relics.includes("ward-amplifier");
    if(specialised||amplified)ward=Math.min(ward,18000);
    player.v142WardCooldownMs=ward
  }
  function rollbackPoint(player,id,before){
    if(!player?.rpgStats||!Number.isFinite(Number(before))||before<=BASE)return null;
    const after=Math.max(BASE,Math.floor(Number(before))-1);
    player.rpgStats[id]=after;

    if(id==="might"){
      const oldBonus=Math.floor((before-BASE)/2),newBonus=Math.floor((after-BASE)/2);
      if(oldBonus>newBonus)player.damageBonus=Math.max(0,Number(player.damageBonus||0)-(oldBonus-newBonus))
    }else if(id==="vitality"){
      player.maxHealth=Math.max(Number(CFG?.player?.maxHealth)||1,Number(player.maxHealth||1)-1);
      if(before>=THRESHOLD&&after<THRESHOLD&&Number(player?.v142R23BuildMilestones?.vitality||0)>=THRESHOLD){
        player.maxHealth=Math.max(Number(CFG?.player?.maxHealth)||1,Number(player.maxHealth||1)-2);
        markLedger(player,"vitality",false)
      }
      player.health=Math.min(Number(player.health||0),Number(player.maxHealth||1))
    }else if(id==="agility"){
      const adjustMovementBase=(factor,dashLoss=0)=>{
        player.moveMultiplier=Math.max(.1,Number(player.moveMultiplier||1)/factor);
        if(player._v105Base&&typeof player._v105Base==="object"){
          player._v105Base.moveMultiplier=Math.max(.1,Number(player._v105Base.moveMultiplier||1)/factor);
          if(dashLoss)player._v105Base.dashDamage=Math.max(0,Number(player._v105Base.dashDamage||0)-dashLoss)
        }
        if(Number.isFinite(Number(player._mysteryOldMove)))player._mysteryOldMove=Math.max(.1,Number(player._mysteryOldMove)/factor);
        if(player._cursedCartridge&&Number.isFinite(Number(player._cursedCartridge.oldMoveMultiplier)))player._cursedCartridge.oldMoveMultiplier=Math.max(.1,Number(player._cursedCartridge.oldMoveMultiplier)/factor)
      };
      adjustMovementBase(.97);
      if(before>=THRESHOLD&&after<THRESHOLD&&Number(player?.v142R23BuildMilestones?.agility||0)>=THRESHOLD){
        adjustMovementBase(.95,1);
        player.dashDamage=Math.max(0,Number(player.dashDamage||0)-1);
        markLedger(player,"agility",false)
      }
    }else if(id==="endurance"){
      let ammoLoss=14;
      if(before>=THRESHOLD&&after<THRESHOLD&&Number(player?.v142R23BuildMilestones?.endurance||0)>=THRESHOLD){
        ammoLoss+=40;
        markLedger(player,"endurance",false)
      }
      player.maxMana=Math.max(1,Number(player.maxMana||1)-ammoLoss);
      if(player._cursedCartridge&&Number.isFinite(Number(player._cursedCartridge.oldMaxMana))){
        player._cursedCartridge.oldMaxMana=Math.max(1,Number(player._cursedCartridge.oldMaxMana)-ammoLoss)
      }
      player.mana=Math.min(Number(player.mana||0),Number(player.maxMana||1))
    }else if(id==="arcana"){
      if(before>=THRESHOLD&&after<THRESHOLD&&Number(player?.v142R23BuildMilestones?.arcana||0)>=THRESHOLD){
        player.v142SightBonus=Math.max(0,Number(player.v142SightBonus||0)-1);
        markLedger(player,"arcana",false)
      }
      recomputeArcana(player,after)
    }

    state.rollbacks++;
    state.last={id,before,after,at:Date.now()};
    return{id,name:`${statName(id)} ${before} → ${after}`,before,after}
  }

  const baseApplyDeathPenalty=PGR.applyDeathPenalty.bind(PGR);
  PGR.applyDeathPenalty=function r82ApplyDeathPenalty(player,score,run,...args){
    const beforeSkills=Array.isArray(player?.skills)?[...player.skills]:[];
    const beforeStats=player?.rpgStats&&typeof player.rpgStats==="object"?{...player.rpgStats}:null;
    const result=baseApplyDeathPenalty(player,score,run,...args);
    if(!result?.levelLost||!player||!beforeStats)return result;

    const afterSkills=Array.isArray(player.skills)?player.skills:[];
    if(beforeSkills.length!==afterSkills.length+1)return result;
    const lostId=String(beforeSkills[beforeSkills.length-1]||"");
    if(!lostId.startsWith("v142-stat-"))return result;
    const id=lostId.slice("v142-stat-".length);
    const rollback=rollbackPoint(player,id,Number(beforeStats[id]));
    if(!rollback)return result;
    return{...result,lostSkill:`${statName(id)} +1`,rpgRollback:{id,before:rollback.before,after:rollback.after}}
  };
  PGR.applyDeathPenalty.__ccgV142R82RpgRollback=true;
  PGR.applyDeathPenalty.__ccgOriginal=baseApplyDeathPenalty;

  window.CCGLostSizzlerV142R82RpgDeathRollback=Object.freeze({version:"V10.42-r82",state,rollbackPoint,recomputeArcana});
})();