/* The Lost Sizzler V10.15 — rare-event balance and mutation enforcement. */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_RARE_EVENTS_BALANCE_V115__)return;
  window.__CCG_LOST_SIZZLER_RARE_EVENTS_BALANCE_V115__=true;

  const mutation=()=>String(run?.rareMutation||"").toUpperCase();
  const rareState=()=>window.CCGLostSizzlerRareEvents?.state||null;

  function creditValue(item){
    if(!item||item.kind!=="credits")return 0;
    return Math.max(1,Number(item.scoreValue||item.value||10));
  }

  // DOUBLE GOLD means every collected score coin is genuinely worth twice its
  // normal amount. The original pickup still awards the first half; this layer
  // adds the matching bonus once per pickup.
  if(typeof applyItem==="function"){
    const originalApplyItem=applyItem;
    applyItem=function applyItemV115MutationBalance(item,player){
      const before=Number(score||0),result=originalApplyItem.apply(this,arguments);
      if(mutation()==="DOUBLE GOLD"&&item?.kind==="credits"&&!item._v115DoubleGoldPaid){
        item._v115DoubleGoldPaid=true;
        const value=creditValue(item);
        score=Number(score||0)+value;
        try{floatText(player?.x??item.x,player?.y??item.y,`DOUBLE GOLD +${value}`,P.gold,{life:900})}catch(_){}
      }
      return result;
    };
  }

  // NO SHOPPING disables ordinary floor traders, while leaving the starting
  // preparation shop alone so a run cannot be soft-locked before it begins.
  if(typeof triggerTrader==="function"){
    const originalTriggerTrader=triggerTrader;
    triggerTrader=function triggerTraderV115MutationBalance(player){
      if(mutation()==="NO SHOPPING"){
        const shops=(host?.shops?.length?host.shops:[host?.trader].filter(Boolean));
        const trader=shops.find(s=>s?.active&&s.x===player?.x&&s.y===player?.y);
        if(trader&&!trader.startShop){
          if(!trader._v115NoShopNoticeAt||performance.now()-trader._v115NoShopNoticeAt>5000){
            trader._v115NoShopNoticeAt=performance.now();
            showToast("FLOOR MUTATION — NO SHOPPING","The dungeon traders are closed on this floor. Save your score for later.","red",6500);
          }
          return;
        }
      }
      return originalTriggerTrader.apply(this,arguments);
    };
  }

  // ELITE BOUNTY rewards genuinely dangerous kills rather than changing a
  // number invisibly at floor generation.
  if(typeof damageEnemy==="function"){
    const originalDamageEnemy=damageEnemy;
    damageEnemy=function damageEnemyV115EliteBounty(enemy,power,element="energy",attacker=p1){
      const alive=Boolean(enemy?.alive),result=originalDamageEnemy.apply(this,arguments);
      if(alive&&enemy&&!enemy.alive&&mutation()==="ELITE BOUNTY"&&!enemy._v115EliteBountyPaid){
        const elite=Boolean(enemy.follower||enemy.guardian||enemy.champion||enemy.mimicEnemy||enemy.deathStalker||enemy.gildedElf);
        if(elite){
          enemy._v115EliteBountyPaid=true;
          const bonus=enemy.guardian||enemy.deathStalker?350:200;
          score=Number(score||0)+bonus;
          try{floatText(enemy.x,enemy.y,`ELITE BOUNTY +${bonus}`,P.gold,{life:1100})}catch(_){}
        }
      }
      return result;
    };
  }

  // The Golden Room grants 250 immediately for surviving. Its scattered coins
  // are celebration pickups, not another hidden 250-point payout.
  if(typeof applyItem==="function"){
    const originalGoldenApply=applyItem;
    applyItem=function applyItemV115GoldenRoomBalance(item,player){
      if(item?.kind==="credits"&&item?.title==="GOLDEN ROOM"){
        const before=Number(score||0),result=originalGoldenApply.apply(this,arguments);
        const gained=Math.max(0,Number(score||0)-before);
        if(gained>0)score=Math.max(before,Number(score||0)-gained);
        try{floatText(player?.x??item.x,player?.y??item.y,"GOLDEN ROOM",P.gold,{life:700})}catch(_){}
        return result;
      }
      return originalGoldenApply.apply(this,arguments);
    };
  }

  window.CCGLostSizzlerRareEventsBalance={mutation,creditValue,get state(){return rareState()}};
})();
