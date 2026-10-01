/* C64 Dungeon Carnage V10.42 r83 — recoverable XP / level / RPG death-cache transaction. */
(()=>{
  "use strict";
  if(window.CCGLostSizzlerV142R83DeathCacheProgression)return;

  const PGR=window.CCGProgression;
  if(!PGR||typeof PGR.applyDeathPenalty!=="function"||typeof PGR.recoverDeathCache!=="function")return;

  const state={transactions:0,recoveries:0,statsRestored:0,pendingRestored:0,last:null};

  function clone(value){
    if(value==null)return value;
    try{return JSON.parse(JSON.stringify(value))}catch(_){return value}
  }
  function skillIdFromPenalty(beforeSkills,result){
    if(!result?.levelLost||!Array.isArray(beforeSkills)||!result?.rpgRollback?.id)return"";
    const wanted=`v142-stat-${result.rpgRollback.id}`;
    return String(beforeSkills[beforeSkills.length-1]||"")===wanted?wanted:""
  }
  function recoveryBundle(before,result,run){
    const xpLost=Math.max(0,Number(result?.xpLost)||0);
    if(!xpLost)return null;
    const floorAfter=Math.max(0,Number(run?.floorXP)||0),bankedAfter=Math.max(0,Number(run?.bankedXP)||0);
    const floorLost=Math.max(0,Math.max(0,Number(before.floorXP)||0)-floorAfter);
    const bankedLost=Math.max(0,Math.max(0,Number(before.bankedXP)||0)-bankedAfter);
    const lostSkillId=skillIdFromPenalty(before.skills,result);
    const lostPendingLevel=Boolean(result?.levelLost&&!lostSkillId&&String(result?.lostSkill||"")==="Unused level-up");
    return{
      version:1,
      xp:xpLost,
      floorXpLost:floorLost,
      bankedXpLost:bankedLost,
      levelBefore:Math.max(1,Number(result?.levelBefore)||Number(before.level)||1),
      levelAfter:Math.max(1,Number(result?.levelAfter)||1),
      lostSkillId,
      lostSkillLabel:String(result?.lostSkill||""),
      lostPendingLevel,
      rpgRollback:clone(result?.rpgRollback||null),
      restored:false,
      createdAt:Date.now()
    }
  }

  const baseApplyDeathPenalty=PGR.applyDeathPenalty.bind(PGR);
  PGR.applyDeathPenalty=function r83ApplyDeathPenalty(player,score,run,...args){
    const before={
      level:Number(player?.level)||1,
      skills:Array.isArray(player?.skills)?[...player.skills]:[],
      pendingLevels:Math.max(0,Number(player?.pendingLevels)||0),
      floorXP:Math.max(0,Number(run?.floorXP)||0),
      bankedXP:Math.max(0,Number(run?.bankedXP)||0)
    };
    const result=baseApplyDeathPenalty(player,score,run,...args);
    const progressionRecovery=recoveryBundle(before,result,run);
    if(progressionRecovery){
      state.transactions++;
      state.last={type:"death",bundle:clone(progressionRecovery),at:Date.now()}
    }
    return{...result,progressionRecovery}
  };
  PGR.applyDeathPenalty.__ccgV142R83DeathCacheProgression=true;
  PGR.applyDeathPenalty.__ccgOriginal=baseApplyDeathPenalty;

  function restoreSpentRpgPoint(player,skillId,pendingFloor=0){
    if(!player||!skillId||typeof PGR.applySkill!=="function")return null;
    const pendingNow=Math.max(0,Number(player.pendingLevels)||0),hasRecoveredEntitlement=pendingNow>Math.max(0,Number(pendingFloor)||0);
    if(!hasRecoveredEntitlement)player.pendingLevels=pendingNow+1;
    const restored=PGR.applySkill(player,skillId);
    if(!restored){
      if(!hasRecoveredEntitlement)player.pendingLevels=pendingNow;
      return null
    }
    state.statsRestored++;
    return restored
  }

  const baseRecoverDeathCache=PGR.recoverDeathCache.bind(PGR);
  PGR.recoverDeathCache=function r83RecoverDeathCache(player,run,cache,...args){
    const bundle=cache?.progressionRecovery&&!cache.progressionRecovery.restored?clone(cache.progressionRecovery):null;
    const pendingBefore=Math.max(0,Number(player?.pendingLevels)||0);
    const result=baseRecoverDeathCache(player,run,cache,...args);
    if(!bundle||Math.max(0,Number(result?.xp)||0)<=0)return result;

    // The base recovery returns all cached XP through the normal XP owner. Move
    // the portion that originally came from banked XP back out of floor XP so
    // run accounting is restored, not merely the player's visible total.
    const banked=Math.max(0,Number(bundle.bankedXpLost)||0);
    if(run&&banked>0){
      run.floorXP=Math.max(0,Number(run.floorXP||0)-banked);
      run.bankedXP=Math.max(0,Number(run.bankedXP||0)+banked)
    }

    const recoveredLevels=Array.isArray(result?.levels)?result.levels.map(Number).filter(Number.isFinite):[];
    const levelRestoredByCache=Boolean(
      bundle.levelBefore>bundle.levelAfter
      && recoveredLevels.some(level=>level>=bundle.levelBefore)
    );

    let restoredSkill=null,pendingLevelRestored=false;
    if(levelRestoredByCache&&bundle.lostSkillId){
      restoredSkill=restoreSpentRpgPoint(player,bundle.lostSkillId,pendingBefore);
    }else if(levelRestoredByCache&&bundle.lostPendingLevel){
      const pendingAfter=Math.max(0,Number(player?.pendingLevels)||0);
      if(pendingAfter<=pendingBefore){
        player.pendingLevels=pendingAfter+1;
        pendingLevelRestored=true;
        state.pendingRestored++
      }else pendingLevelRestored=true
    }

    if(cache?.progressionRecovery)cache.progressionRecovery.restored=true;
    state.recoveries++;
    state.last={type:"recovery",bundle:clone(bundle),restoredLevel:levelRestoredByCache,restoredSkill:restoredSkill?.name||"",pendingLevelRestored,at:Date.now()};
    return{
      ...result,
      restoredLevel:levelRestoredByCache,
      restoredLevelFrom:bundle.levelAfter,
      restoredLevelTo:Number(player?.level)||bundle.levelAfter,
      restoredSkill:restoredSkill?.name||(levelRestoredByCache?bundle.lostSkillLabel:""),
      pendingLevelRestored,
      progressionRecovered:true
    }
  };
  PGR.recoverDeathCache.__ccgV142R83DeathCacheProgression=true;
  PGR.recoverDeathCache.__ccgOriginal=baseRecoverDeathCache;

  const baseTriggerDeathCache=typeof window.triggerDeathCache==="function"?window.triggerDeathCache:null;
  if(baseTriggerDeathCache){
    window.triggerDeathCache=function triggerDeathCacheV142R83ProgressionFeedback(){
      const before=state.recoveries,result=baseTriggerDeathCache.apply(this,arguments);
      const recovery=state.recoveries>before&&state.last?.type==="recovery"?state.last:null;
      if(recovery?.restoredLevel){
        const detail=recovery.restoredSkill
          ?`Lost level and ${recovery.restoredSkill} restored from the recovered cache.`
          :recovery.pendingLevelRestored
            ?"Lost level and unused level-up entitlement restored from the recovered cache."
            :"Lost level restored from the recovered cache.";
        try{showToast?.("PROGRESSION RECOVERED",detail,"gold",9000)}catch(_){}
      }
      return result
    };
    window.triggerDeathCache.__ccgV142R83ProgressionFeedback=true;
    window.triggerDeathCache.__ccgOriginal=baseTriggerDeathCache
  }

  window.CCGLostSizzlerV142R83DeathCacheProgression=Object.freeze({
    version:"V10.42-r83",state,recoveryBundle,restoreSpentRpgPoint
  });
})();