/* C64 Dungeon Carnage V10.42 — interaction XP source contract. */
(()=>{
  "use strict";
  if(window.CCGLostSizzlerXPSourceContract)return;

  const blockedReasons=new Set([
    "Hidden wall opened",
    "Bronze door unlocked",
    "Hidden wall switch",
    "Gate switch opened"
  ]);
  const grantXP=awardXP;

  awardXP=function(player,amount,reason=""){
    const source=String(reason);
    if(blockedReasons.has(source)){
      return{
        amount:0,
        gross:Math.max(0,Math.round(Number(amount)||0)),
        debtPaid:0,
        discarded:0,
        capped:false,
        reason,
        levels:[],
        blocked:true
      };
    }
    return grantXP(player,amount,reason);
  };

  window.CCGLostSizzlerXPSourceContract=Object.freeze({
    blockedReasons:Object.freeze([...blockedReasons]),
    isBlocked:reason=>blockedReasons.has(String(reason))
  });
})();
