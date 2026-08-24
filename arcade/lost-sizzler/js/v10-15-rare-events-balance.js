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

  /* -----------------------------------------------------------------------
   * Core floor-trap reliability hotfix.
   *
   * Ordinary traps used to be tested only when movementTriggers() ran. That
   * meant a player could stand on an inactive plate, wait for its active phase,
   * and remain unharmed. They also had no dedicated renderer or proximity
   * warning. Keep a contact latch per player/trap so each active cycle can hit
   * once, check occupied plates during the live update loop, and warn once when
   * a player first enters the three-tile danger radius.
   * --------------------------------------------------------------------- */
  const TRAP_WARNING_DISTANCE=3;
  const trapRuntime={worldKey:"",warned:new Set(),contact:new Set()};
  const trapMd=(a,b)=>Math.abs(Number(a?.x||0)-Number(b?.x||0))+Math.abs(Number(a?.y||0)-Number(b?.y||0));
  const trapPlayers=()=>{try{return (typeof localPlayers==="function"?localPlayers():[typeof p1!=="undefined"?p1:null,typeof p2!=="undefined"?p2:null].filter(Boolean)).filter(Boolean)}catch(_){return[]}};
  const trapWorldKey=()=>`${String(run?.seed||"run")}|F${Math.max(1,Number(run?.floor||1))}`;
  const trapPlayerId=player=>String(player?.id||player?.name||"player");
  const trapKey=(trap,player)=>`${trapRuntime.worldKey||trapWorldKey()}|${trapPlayerId(player)}|${String(trap?.id||`${trap?.x},${trap?.y}`)}`;

  function trapIsActive(trap,now=performance.now()){
    if(!trap?.active)return false;
    try{return typeof SYS!=="undefined"&&SYS?.trapActive?Boolean(SYS.trapActive(trap,now)):true}catch(_){return true}
  }

  function resetTrapRuntime(){
    trapRuntime.worldKey=trapWorldKey();
    trapRuntime.warned.clear();
    trapRuntime.contact.clear();
  }

  function warnForNearbyTrap(player){
    if(!player||!host?.traps?.length)return false;
    const candidates=(host.traps||[])
      .filter(trap=>trap?.active&&trapMd(player,trap)<=TRAP_WARNING_DISTANCE)
      .sort((a,b)=>trapMd(player,a)-trapMd(player,b));
    const trap=candidates.find(candidate=>!trapRuntime.warned.has(trapKey(candidate,player)));
    if(!trap)return false;
    trapRuntime.warned.add(trapKey(trap,player));
    const kind=String(trap.kind||"floor").toUpperCase();
    try{
      S.sfx("trap");
      showToast("TRAP WARNING",`${kind} trap within 3 tiles. Watch the floor plate and its active cycle before crossing.`,"red",7000);
      ring?.(trap.x,trap.y,P.red,36);
    }catch(_){}
    return true;
  }

  function resolveTrapContact(player,now=performance.now()){
    if(!player||!host?.traps?.length)return false;
    let hit=false;
    for(const trap of host.traps||[]){
      if(!trap)continue;
      const key=trapKey(trap,player),occupied=Boolean(trap.active&&trap.x===player.x&&trap.y===player.y),active=occupied&&trapIsActive(trap,now);
      if(!active){trapRuntime.contact.delete(key);continue}
      if(trapRuntime.contact.has(key))continue;
      trapRuntime.contact.add(key);
      const kind=String(trap.kind||"floor");
      try{S.sfx("trap")}catch(_){}
      try{showToast(`${kind.toUpperCase()} TRAP`,`Active trap triggered. -1 health.`,"red",6500)}catch(_){}
      try{hurtPlayer(player,1,false,`${kind} trap`)}catch(_){}
      hit=true;
    }
    return hit;
  }

  // movementTriggers() still calls triggerTrap(), but this latched replacement
  // prevents a movement-frame hit and the continuous update check from stacking.
  if(typeof triggerTrap==="function"){
    triggerTrap=function triggerTrapV115Reliable(player){
      warnForNearbyTrap(player);
      return resolveTrapContact(player,performance.now());
    };
  }

  if(typeof startWorld==="function"){
    const originalTrapStartWorld=startWorld;
    startWorld=function startWorldV115TrapReset(){
      const result=originalTrapStartWorld.apply(this,arguments);
      try{resetTrapRuntime()}catch(_){}
      return result;
    };
  }

  if(typeof update==="function"){
    const originalTrapUpdate=update;
    update=function updateV115TrapRuntime(dt){
      const result=originalTrapUpdate.apply(this,arguments);
      if(typeof mode!=="undefined"&&mode==="playing"&&host){
        const key=trapWorldKey();if(trapRuntime.worldKey!==key)resetTrapRuntime();
        const now=performance.now();
        for(const player of trapPlayers()){
          warnForNearbyTrap(player);
          resolveTrapContact(player,now);
        }
      }
      return result;
    };
  }

  function drawReliableTrap(trap){
    if(!trap?.active||typeof ctx==="undefined"||typeof ws!=="function"||typeof C==="undefined")return;
    try{if(typeof focus!=="undefined"&&focus&&typeof visibleTo==="function"&&!visibleTo(focus,trap.x,trap.y))return}catch(_){}
    const s=ws(trap.x,trap.y),size=Math.max(16,Number(C.tile||48)),now=performance.now(),armed=trapIsActive(trap,now),pulse=.5+.5*Math.sin(now/130);
    const colour=trap.kind==="fire"?P.orange:trap.kind==="shock"?P.cyan:P.red;
    ctx.save();
    ctx.globalAlpha=armed?.9:.58;
    ctx.fillStyle="rgba(9,5,12,.78)";ctx.fillRect(s.x+5,s.y+5,size-10,size-10);
    ctx.strokeStyle=colour;ctx.lineWidth=armed?3:2;ctx.shadowColor=colour;ctx.shadowBlur=armed?8+Math.round(pulse*8):2;ctx.strokeRect(s.x+7,s.y+7,size-14,size-14);
    ctx.shadowBlur=0;ctx.fillStyle=colour;
    const cx=s.x+size/2,cy=s.y+size/2;
    if(trap.kind==="spike"){
      for(const dx of [-10,0,10]){ctx.beginPath();ctx.moveTo(cx+dx-5,cy+8);ctx.lineTo(cx+dx,cy-9);ctx.lineTo(cx+dx+5,cy+8);ctx.closePath();ctx.fill()}
    }else if(trap.kind==="shock"){
      ctx.beginPath();ctx.moveTo(cx-10,cy-11);ctx.lineTo(cx+1,cy-3);ctx.lineTo(cx-4,cy+2);ctx.lineTo(cx+11,cy+11);ctx.lineTo(cx+2,cy+1);ctx.lineTo(cx+7,cy-4);ctx.closePath();ctx.fill();
    }else{
      ctx.beginPath();ctx.moveTo(cx,cy-12);ctx.quadraticCurveTo(cx+13,cy-1,cx+5,cy+11);ctx.quadraticCurveTo(cx,cy+16,cx-7,cy+10);ctx.quadraticCurveTo(cx-12,cy,cx,cy-12);ctx.fill();
    }
    if(!armed){ctx.globalAlpha=.8;ctx.fillStyle=P.white;ctx.fillRect(cx-1,cy-1,2,2)}
    ctx.restore();
  }

  if(typeof drawSpecialObjects==="function"){
    const originalTrapSpecialObjects=drawSpecialObjects;
    drawSpecialObjects=function drawSpecialObjectsV115ReliableTraps(){
      const result=originalTrapSpecialObjects.apply(this,arguments);
      try{for(const trap of host?.traps||[])drawReliableTrap(trap)}catch(_){}
      return result;
    };
  }

  window.CCGLostSizzlerRareEventsBalance={mutation,creditValue,get state(){return rareState()},trapRuntime};
})();
