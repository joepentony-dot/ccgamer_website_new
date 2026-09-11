/* C64 Dungeon Carnage V10.42 r20 — XP source policy.
 * Levelling is driven by combat and explicit XP items. Routine navigation,
 * locks, switches, puzzle mechanisms and ordinary chests remain score/loot rewards.
 */
(()=>{
  "use strict";
  if(window.CCGLostSizzlerV142R20XpSourcePolicy)return;

  const BLOCKED_REASONS=new Set([
    "Hidden wall opened","Bronze door unlocked","Hidden wall switch","Gate switch opened",
    "Chest opened","Memory vault opened","Torch vault opened"
  ]);
  const state={blockedAwards:0,blockedXp:0,copyRepairs:0};
  const normal=value=>String(value||"").trim();

  try{
    if(typeof awardXP==="function"&&!awardXP.__ccgV142R20){
      const baseAwardXP=awardXP;
      awardXP=function(player,amount,reason,...rest){
        const why=normal(reason);
        if(BLOCKED_REASONS.has(why)){
          state.blockedAwards++;
          state.blockedXp+=Math.max(0,Math.round(Number(amount)||0));
          return false;
        }
        return baseAwardXP(player,amount,reason,...rest);
      };
      awardXP.__ccgV142R20=true;awardXP.__ccgOriginal=baseAwardXP;
    }
  }catch(_){}

  function repairCopy(title,text){
    const t=normal(title),value=String(text||"");
    if(t==="CHEST OPENED")return value.replace(/\s+and\s+\+10 XP\.?/i,".").replace(/\s{2,}/g," ");
    if(t==="MEMORY SEQUENCE SOLVED"||t==="TORCH VAULT OPEN")return value.replace(/\s+and\s+\+10 XP\.?/i,".").replace(/\s*\+10 XP\.?/i,"").replace(/\s{2,}/g," ").trim();
    return value;
  }
  try{
    if(typeof showToast==="function"&&!showToast.__ccgV142R20){
      const baseToast=showToast;
      showToast=function(title,text,...rest){
        const fixed=repairCopy(title,text);if(fixed!==String(text||""))state.copyRepairs++;
        return baseToast(title,fixed,...rest);
      };
      showToast.__ccgV142R20=true;showToast.__ccgOriginal=baseToast;
    }
  }catch(_){}
  try{
    if(typeof floatText==="function"&&!floatText.__ccgV142R20){
      const baseFloat=floatText;
      floatText=function(x,y,text,...rest){
        const value=String(text||""),fixed=value.replace(/\s*·\s*\+10 XP\b/i,"");
        if(fixed!==value)state.copyRepairs++;
        return baseFloat(x,y,fixed,...rest);
      };
      floatText.__ccgV142R20=true;floatText.__ccgOriginal=baseFloat;
    }
  }catch(_){}

  window.CCGLostSizzlerV142R20XpSourcePolicy=Object.freeze({version:"V10.42-r20",BLOCKED_REASONS,state,repairCopy});
})();
