/* C64 Dungeon Carnage V10.42 r23 — dungeon RPG build focus. */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V142_R23_RPG_BUILD_FOCUS__)return;
  window.__CCG_LOST_SIZZLER_V142_R23_RPG_BUILD_FOCUS__=true;

  const PROG=window.CCGProgression;
  const RPG=window.CCGLostSizzlerV142ProceduralOverhaul;
  if(!PROG||!RPG||typeof PROG.skillChoices!=="function"||!Array.isArray(RPG.rpgStats))return;

  const BASELINE=5;
  const CHOICE_COUNT=4;
  const MILESTONE_LEVELS=Object.freeze([5,10,15,20,25]);
  const MILESTONE_SET=new Set(MILESTONE_LEVELS);
  const STATS=Object.freeze(RPG.rpgStats
    .map(row=>Object.freeze({
      id:String(row?.id||"").trim().toLowerCase(),
      name:String(row?.name||"").trim().toUpperCase(),
      short:String(row?.short||"").trim().toUpperCase(),
      desc:String(row?.desc||"").trim()
    }))
    .filter(row=>row.id&&row.name));

  function detectMode(){
    try{return String(window.CCGLostSizzlerModeRuntime?.detect?.()||"").trim().toLowerCase()}
    catch(_){return""}
  }
  function isDungeonMode(modeName=detectMode()){
    return /^dungeon(?:-|$)/.test(String(modeName||"").trim().toLowerCase());
  }
  function statValue(player,id){
    return Math.max(BASELINE,Math.floor(Number(player?.rpgStats?.[id])||BASELINE));
  }
  function focusIds(player){
    if(!player||!STATS.length)return[];
    const values=STATS.map(row=>({id:row.id,value:statValue(player,row.id)}));
    const high=Math.max(...values.map(row=>row.value));
    if(high<=BASELINE)return[];
    return values.filter(row=>row.value===high).map(row=>row.id);
  }
  function pivotIds(player){
    if(!player||!STATS.length)return[];
    const values=STATS.map(row=>({id:row.id,value:statValue(player,row.id)}));
    const low=Math.min(...values.map(row=>row.value));
    return values.filter(row=>row.value===low).map(row=>row.id);
  }
  function choiceStatId(choice){
    const id=String(choice?.id||"");
    return id.startsWith("v142-stat-")?id.slice("v142-stat-".length):"";
  }
  function choiceFor(player,id){
    const row=STATS.find(stat=>stat.id===id);if(!row)return null;
    const current=statValue(player,id);
    return{
      id:`v142-stat-${row.id}`,
      name:`${row.name} +1`,
      desc:`${row.desc} Current ${row.short}: ${current} → ${current+1}.`
    };
  }
  function ensureCandidate(choices,candidates,player,protectedIds=new Set()){
    if(!Array.isArray(choices)||!Array.isArray(candidates)||!candidates.length)return choices;
    const currentIds=choices.map(choiceStatId);
    if(candidates.some(id=>currentIds.includes(id)))return choices;
    const target=candidates.find(id=>STATS.some(row=>row.id===id));
    const replacement=choiceFor(player,target);if(!replacement)return choices;
    let replaceIndex=-1;
    for(let index=choices.length-1;index>=0;index--){
      if(!protectedIds.has(choiceStatId(choices[index]))){replaceIndex=index;break}
    }
    if(replaceIndex<0)return choices;
    const next=choices.map(choice=>({...choice}));next[replaceIndex]=replacement;return next;
  }
  function planChoices(player,baseChoices,modeName=detectMode()){
    if(!Array.isArray(baseChoices))return baseChoices;
    const original=baseChoices.map(choice=>({...choice}));
    if(!isDungeonMode(modeName)||original.length!==CHOICE_COUNT||STATS.length<CHOICE_COUNT)return original;
    if(original.some(choice=>!STATS.some(row=>row.id===choiceStatId(choice))))return original;

    const focus=focusIds(player);if(!focus.length)return original;
    let planned=ensureCandidate(original,focus,player);

    const level=Math.max(1,Math.floor(Number(player?.level)||1));
    if(MILESTONE_SET.has(level)){
      const focusPresent=planned.map(choiceStatId).find(id=>focus.includes(id));
      const pivots=pivotIds(player).filter(id=>!focus.includes(id));
      if(pivots.length)planned=ensureCandidate(planned,pivots,player,new Set(focusPresent?[focusPresent]:[]));
    }
    return planned;
  }

  const baseSkillChoices=PROG.skillChoices;
  const wrappedSkillChoices=function dungeonRpgBuildFocusChoices(player){
    return planChoices(player,baseSkillChoices.call(PROG,player),detectMode());
  };
  wrappedSkillChoices.__ccgV142R23RpgBuildFocus=true;
  wrappedSkillChoices.__ccgOriginal=baseSkillChoices;
  PROG.skillChoices=wrappedSkillChoices;

  window.CCGLostSizzlerV142R23RpgBuildFocus=Object.freeze({
    version:"V10.42-r23",
    baseline:BASELINE,
    choiceCount:CHOICE_COUNT,
    milestoneLevels:MILESTONE_LEVELS,
    focusIds,
    pivotIds,
    planChoices,
    isDungeonMode
  });
})();
