/* The Lost Sizzler V10.41 — Stage 13 directed-encounter completion and bounded rewards. */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_STAGE13_ENCOUNTER_COMPLETION__)return;
  window.__CCG_LOST_SIZZLER_STAGE13_ENCOUNTER_COMPLETION__=true;

  const REWARDS=Object.freeze({
    "search-routes":40,
    "split-patrols":60,
    "crossfire-routes":80,
    "lockdown-depths":100
  });
  const completedByWorld=new WeakMap();
  const state={
    installed:false,checks:0,pendingKills:0,clears:0,rewardScore:0,duplicateSuppressions:0,
    lastEncounter:"",lastProfile:"",lastReward:0,lastError:""
  };

  function soloDungeon(){
    try{return window.CCGLostSizzlerStage8NpcDialogue?.soloDungeon?.()===true}catch(_){return false}
  }

  function encounterIdentity(enemy){
    if(!enemy?.levelDirectorEnemy)return null;
    const match=/^stage12-(\d+)-(\d+)-(\d+)$/.exec(String(enemy.id||""));
    if(!match)return null;
    const floor=Math.max(1,Number(match[1])||1),roomId=Math.max(0,Number(match[2])||0),slot=Math.max(0,Number(match[3])||0);
    return{floor,roomId,slot,key:`${floor}:${roomId}`,prefix:`stage12-${floor}-${roomId}-`}
  }

  function completedSet(worldState=(()=>{try{return world}catch(_){return null}})()){
    if(!worldState||typeof worldState!=="object")return null;
    let set=completedByWorld.get(worldState);
    if(!set){set=new Set();completedByWorld.set(worldState,set)}
    return set
  }

  function encounterProfile(enemy,identity){
    const explicit=String(enemy?.levelDirectorProfile||"").trim();
    if(explicit&&Object.hasOwn(REWARDS,explicit))return explicit;
    try{
      const profile=window.CCGLostSizzlerStage8NpcDialogue?.levelProfile?.(identity?.floor||1);
      return Object.hasOwn(REWARDS,String(profile?.id||""))?String(profile.id):"search-routes"
    }catch(_){return"search-routes"}
  }

  function remainingEnemies(identity){
    if(!identity)return[];
    try{return(host?.enemies||[]).filter(enemy=>enemy?.alive&&encounterIdentity(enemy)?.key===identity.key)}catch(_){return[]}
  }

  function roomFor(identity){
    try{return world?.rooms?.[Number(identity?.roomId)]||null}catch(_){return null}
  }

  function awardCompletion(identity,profile,attacker){
    const completed=completedSet();
    if(!completed)return false;
    if(completed.has(identity.key)){state.duplicateSuppressions++;return false}
    completed.add(identity.key);

    const reward=Math.max(0,Math.min(100,Number(REWARDS[profile]||40)));
    try{score=Math.max(0,Number(score||0))+reward}catch(_){}
    try{
      run.stats=run.stats||{};
      run.stats.stage13EncounterClears=Math.max(0,Number(run.stats.stage13EncounterClears||0))+1;
      run.stats.stage13EncounterReward=Math.max(0,Number(run.stats.stage13EncounterReward||0))+reward;
    }catch(_){}
    const room=roomFor(identity);
    if(room){
      room.stage13EncounterCleared=true;
      room.stage13EncounterReward=reward;
      room.stage13EncounterProfile=profile;
      room.stage13EncounterFloor=identity.floor;
    }
    try{host.revision=Math.max(0,Number(host.revision||0))+1}catch(_){}

    state.clears++;state.rewardScore+=reward;state.lastEncounter=identity.key;state.lastProfile=profile;state.lastReward=reward;
    try{
      const who=String(attacker?.name||"Explorer");
      showToast("PATROL CLEARED",`${who} cleared ${profile.replace(/-/g," ")} · +${reward} score`,"green",3200)
    }catch(_){}
    return true
  }

  function onEnemyDefeated(enemy,attacker){
    state.checks++;
    if(!soloDungeon())return false;
    const identity=encounterIdentity(enemy);if(!identity)return false;
    const completed=completedSet();if(!completed)return false;
    if(completed.has(identity.key)){state.duplicateSuppressions++;return false}
    if(remainingEnemies(identity).length){state.pendingKills++;return false}
    const profile=encounterProfile(enemy,identity);
    return awardCompletion(identity,profile,attacker)
  }

  function install(){
    if(state.installed)return true;
    let original=null;
    try{if(typeof recordEnemyDefeat==="function")original=recordEnemyDefeat}catch(_){}
    if(typeof original!=="function")return false;
    if(original.__ccgStage13EncounterCompletion===true){state.installed=true;return true}
    const wrapped=function recordEnemyDefeatStage13(enemy,attacker,displayName=""){
      const result=original.apply(this,arguments);
      try{onEnemyDefeated(enemy,attacker)}catch(error){state.lastError=String(error?.message||error||"unknown").slice(0,220)}
      return result
    };
    wrapped.__ccgStage13EncounterCompletion=true;
    wrapped.__ccgOriginal=original;
    try{recordEnemyDefeat=wrapped}catch(error){state.lastError=String(error?.message||error||"install failed").slice(0,220);return false}
    state.installed=true;return true
  }

  install();
  if(!state.installed)queueMicrotask(install);

  window.CCGLostSizzlerStage13EncounterCompletion={
    REWARDS,encounterIdentity,remainingEnemies,onEnemyDefeated,install,
    get state(){return state}
  };
})();
