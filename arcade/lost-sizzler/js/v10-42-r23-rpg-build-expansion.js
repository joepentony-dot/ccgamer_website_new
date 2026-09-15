/* C64 Dungeon Carnage V10.42 r23 — RPG build specialisations. */
(()=>{
  "use strict";
  if(window.CCGLostSizzlerV142R23RpgBuildExpansion)return;

  const PROG=window.CCGProgression;
  const RPG=window.CCGLostSizzlerV142ProceduralOverhaul;
  if(!PROG||!RPG)return;

  const THRESHOLD=10;
  const definitions=Object.freeze({
    vitality:Object.freeze({id:"vitality",name:"VITALITY",copy:"At VIT 10: +2 maximum health and heal 2 immediately.",apply(player){player.maxHealth=Math.max(1,Number(player.maxHealth)||1)+2;player.health=Math.min(player.maxHealth,Math.max(0,Number(player.health)||0)+2)}}),
    agility:Object.freeze({id:"agility",name:"AGILITY",copy:"At AGI 10: another 5% movement improvement and dashes deal +1 contact damage.",apply(player){player.moveMultiplier=Math.max(.1,Number(player.moveMultiplier)||1)*.95;player.dashDamage=Math.max(0,Number(player.dashDamage)||0)+1}}),
    endurance:Object.freeze({id:"endurance",name:"ENDURANCE",copy:"At END 10: +40 maximum ammunition, refill 40 and gain +2 armour immediately.",apply(player){player.maxMana=Math.max(1,Number(player.maxMana)||1)+40;player.mana=Math.min(player.maxMana,Math.max(0,Number(player.mana)||0)+40);player.armor=Math.min(12,Math.max(0,Number(player.armor)||0)+2)}}),
    arcana:Object.freeze({id:"arcana",name:"ARCANA",copy:"At ARC 10: +1 permanent sight and Ward recharge is capped at 18 seconds.",apply(player){player.v142SightBonus=Math.max(0,Number(player.v142SightBonus)||0)+1;const current=Number(player.v142WardCooldownMs);player.v142WardCooldownMs=Math.min(Number.isFinite(current)&&current>0?current:18000,18000)}})
  });

  function specialMode(){
    try{
      const direct=String(window.CCGLostSizzlerSpecialModes?.active?.type||document.body?.dataset?.specialMode||"").toLowerCase();
      if(direct)return direct;
      return String(window.CCGLostSizzlerModeRuntime?.detect?.()||"").toLowerCase();
    }catch(_){return""}
  }
  function dungeonEligible(player){
    if(!player?.rpgStats||typeof player.rpgStats!=="object")return false;
    const active=specialMode();
    return active!=="horde-survivor"&&active!=="sizzler-saboteurs"&&!active.includes("horde")&&!active.includes("saboteur")&&!active.includes("spy");
  }
  function ledger(player){
    if(!player.v142R23BuildMilestones||typeof player.v142R23BuildMilestones!=="object"||Array.isArray(player.v142R23BuildMilestones))player.v142R23BuildMilestones={};
    return player.v142R23BuildMilestones;
  }
  function stat(player,id){return Math.max(5,Math.floor(Number(player?.rpgStats?.[id])||5))}
  function reconcile(player){
    if(!dungeonEligible(player))return[];
    const marks=ledger(player),unlocked=[];
    for(const row of Object.values(definitions)){
      if(stat(player,row.id)<THRESHOLD)continue;
      if(!marks[row.id]){row.apply(player);marks[row.id]=THRESHOLD;unlocked.push(row.id)}
      if(row.id==="arcana"){
        const current=Number(player.v142WardCooldownMs);
        player.v142WardCooldownMs=Math.min(Number.isFinite(current)&&current>0?current:18000,18000);
      }
    }
    return unlocked;
  }
  function milestoneText(player,id){
    const row=definitions[id];if(!row)return"";
    const value=stat(player,id),active=Boolean(player?.v142R23BuildMilestones?.[id])||value>=THRESHOLD;
    if(active)return ` Specialisation active: ${row.copy.replace(/^At [A-Z]+ 10: /,"")}`;
    if(value===THRESHOLD-1)return ` SPECIALISATION UNLOCKS NOW: ${row.copy.replace(/^At [A-Z]+ 10: /,"")}`;
    return ` ${row.copy}`;
  }

  const baseChoices=PROG.skillChoices.bind(PROG);
  const composedSkillChoices=function dungeonRpgBuildSpecialisationChoices(player,...args){
    const choices=baseChoices(player,...args);
    if(!dungeonEligible(player)||!Array.isArray(choices))return choices;
    return choices.map(choice=>{
      const id=String(choice?.id||"").replace(/^v142-stat-/,"");
      if(!definitions[id])return choice;
      return{...choice,desc:`${String(choice.desc||"").trim()}${milestoneText(player,id)}`.trim()};
    });
  };
  composedSkillChoices.__ccgV142R23RpgBuildFocus=Boolean(PROG.skillChoices?.__ccgV142R23RpgBuildFocus);
  composedSkillChoices.__ccgV142R23RpgBuildExpansion=true;
  composedSkillChoices.__ccgOriginal=PROG.skillChoices;
  PROG.skillChoices=composedSkillChoices;

  const baseApply=PROG.applySkill.bind(PROG);
  PROG.applySkill=function(player,id,...args){
    const result=baseApply(player,id,...args);
    if(!dungeonEligible(player))return result;
    const unlocked=reconcile(player);
    if(!unlocked.length||!result||typeof result!=="object")return result;
    const names=unlocked.map(key=>definitions[key]?.name||key.toUpperCase()).join(" + ");
    return{...result,desc:`${String(result.desc||"").trim()} ${names} SPECIALISATION UNLOCKED.`.trim()};
  };

  if(typeof preservePlayer==="function"){
    const basePreservePlayer=preservePlayer;
    preservePlayer=function(old,...args){
      const result=basePreservePlayer(old,...args);
      if(old?.v142R23BuildMilestones&&typeof old.v142R23BuildMilestones==="object")result.v142R23BuildMilestones={...old.v142R23BuildMilestones};
      reconcile(result);
      return result;
    };
  }

  try{if(typeof p1!=="undefined"&&p1)reconcile(p1);if(typeof p2!=="undefined"&&p2)reconcile(p2)}catch(_){}

  window.CCGLostSizzlerV142R23RpgBuildExpansion=Object.freeze({
    version:"V10.42-r23",
    threshold:THRESHOLD,
    definitions,
    reconcile,
    dungeonEligible,
    milestoneText
  });
})();