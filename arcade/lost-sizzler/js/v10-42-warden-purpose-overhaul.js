/* The Lost Sizzler V10.42 r3 — Warden purpose + consequence overhaul. */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V142_WARDEN_PURPOSE_OVERHAUL__)return;
  window.__CCG_LOST_SIZZLER_V142_WARDEN_PURPOSE_OVERHAUL__=true;

  const CFG=window.CCG_CONFIG;
  const PROG=window.CCGProgression;
  if(!CFG||!PROG)return;

  const SCORE_REWARD=7500;
  const XP_REWARD=250;
  const AFTERSHOCK_MS=30000;
  const WARD_ALERT=65;
  const AFTERSHOCK_ALERT=82;

  const baseIsDeathStalkerEnemy=typeof isDeathStalkerEnemy==="function"?isDeathStalkerEnemy:null;
  const baseHitStalker=typeof hitStalker==="function"?hitStalker:null;
  const baseDamageEnemy=typeof damageEnemy==="function"?damageEnemy:null;
  const baseItemHelp=typeof itemHelp==="function"?itemHelp:null;
  const baseSync=typeof sync==="function"?sync:null;
  const baseRenderShop=typeof renderShop==="function"?renderShop:null;
  const baseTriggerTimed=typeof triggerTimed==="function"?triggerTimed:null;
  const baseUpdateTimed=typeof updateTimed==="function"?updateTimed:null;

  function currentHost(){try{return typeof host!=="undefined"?host:null}catch(_){return null}}
  function currentRun(){try{return typeof run!=="undefined"?run:null}catch(_){return null}}
  function currentWorld(){try{return typeof world!=="undefined"?world:null}catch(_){return null}}
  function currentPlayer(){try{return typeof p1!=="undefined"?p1:null}catch(_){return null}}
  function currentMode(){try{return typeof mode!=="undefined"?mode:"menu"}catch(_){return"menu"}}
  function dist(a,b){return Math.abs(Number(a?.x||0)-Number(b?.x||0))+Math.abs(Number(a?.y||0)-Number(b?.y||0))}
  function announce(title,text,tone="gold",duration=9000){try{showToast(title,text,tone,duration)}catch(_){} }
  function syncNow(){try{baseSync?.()}catch(_){} }
  function broadcast(){try{broadcastWorld()}catch(_){} }
  function sfx(name){try{S?.sfx?.(name)}catch(_){} }
  function fxBurst(x,y){try{burst(x,y,P.purple,34,1.9);ring(x,y,P.gold,52);shake=Math.max(shake,10)}catch(_){} }
  function label(target){return target===currentHost()?.stalker?String(CFG.stalker?.name||"Count Loadula"):"Death Stalker"}
  function isCount(target){return Boolean(target&&target===currentHost()?.stalker)}
  function recognisedEnemy(target){return Boolean(target&&baseIsDeathStalkerEnemy?.(target))}
  function broken(target){return Boolean(target?.v142WardBroken&&target?.v142WardState!=="defeated")}
  function floorNo(){return Math.max(1,Number(currentRun()?.floor)||1)}
  function playerLevel(player){return Math.max(1,Number(player?.level)||1)}
  function wardHp(target,player){
    const floor=floorNo(),level=playerLevel(player);
    return isCount(target)?22+floor*5+Math.max(0,level-1)*2:14+floor*4+Math.max(0,level-1)*2;
  }
  function inventoryChargeIndex(player){try{return PROG.firstInventory(player,"banishment")}catch(_){return-1}}
  function chargeRange(){return Math.max(2,Number(CFG.stalker?.banishPromptDistance)||8)}

  function wardTargets(player){
    const h=currentHost();if(!h||!player)return[];const range=chargeRange(),targets=[];
    for(const enemy of h.enemies||[]){
      if(!enemy?.alive||!recognisedEnemy(enemy)||enemy.v142WardenDefeated||broken(enemy))continue;
      if(dist(enemy,player)<=range)targets.push(enemy);
    }
    const count=h.stalker;
    if(count?.awake&&!count.permanentlyBanished&&!count.v142WardenDefeated&&!broken(count)&&dist(count,player)<=range)targets.push(count);
    return targets.sort((a,b)=>dist(a,player)-dist(b,player));
  }

  function banishmentStateV142(player){
    const range=chargeRange(),hasFlask=inventoryChargeIndex(player)>=0,targets=wardTargets(player);
    return{ready:hasFlask&&targets.length>0,hasFlask,range,targets,nearest:targets[0]||null,action:"ward-break"};
  }

  function markThreatAggressive(target,player){
    if(!target||isCount(target))return;
    target.aiState="chase";target.lastSeen={x:player.x,y:player.y};target.memoryMs=999999;target.searchMs=0;
    target.moveCooldown=Math.min(Number(target.moveCooldown)||420,340);target.attackCooldown=Math.min(Number(target.attackCooldown)||620,560);
  }

  function wardBurst(target){
    const h=currentHost();if(!h)return;for(const enemy of h.enemies||[]){
      if(!enemy?.alive||enemy===target||recognisedEnemy(enemy)||dist(enemy,target)>3)continue;
      enemy.hitStunMs=Math.max(Number(enemy.hitStunMs)||0,900);
      if(Number(enemy.armor)>0)enemy.armor=Math.max(0,Number(enemy.armor)-2);
    }
  }

  function breakWard(target,player){
    const r=currentRun(),h=currentHost();if(!target||!player||!r||!h||broken(target)||target.v142WardenDefeated)return false;
    const hp=wardHp(target,player),name=label(target);
    target.v142WardBroken=true;target.v142WardState="broken";target.v142WardBrokenAt=performance.now();target.v142WardBrokenFloor=floorNo();
    target.maxHp=hp;target.hp=hp;target.armor=0;target.maxArmor=0;target.stunMs=Math.max(Number(target.stunMs)||0,950);target.hitStunMs=Math.max(Number(target.hitStunMs)||0,950);target.flash=280;target.hpBarMs=5000;
    markThreatAggressive(target,player);wardBurst(target);
    r.stats=r.stats||{};r.stats.wardsBroken=(Number(r.stats.wardsBroken)||0)+1;r.alert=Math.min(100,Math.max(Number(r.alert)||0,WARD_ALERT));
    h.v142LastWardBreak={name,x:target.x,y:target.y,at:performance.now(),floor:floorNo()};h.revision=(Number(h.revision)||0)+1;
    sfx("shrine");fxBurst(target.x,target.y);
    try{floatText(target.x,target.y,"WARD BROKEN!",P.gold,{life:2600})}catch(_){}
    announce(`WARD BROKEN — ${name.toUpperCase()}`,`The charge has stripped its immunity, not killed it. ${name} now has ${hp} HP and can be damaged by your weapons. The rupture has driven dungeon alert to at least ${WARD_ALERT}%. Finish the fight to earn the Warden Cache.`,"gold",11500);
    broadcast();syncNow();return true;
  }

  function spawnWardenCache(target){
    const h=currentHost(),w=currentWorld(),r=currentRun();if(!h||!target||!r)return null;
    h.chests=h.chests||[];if(h.chests.some(chest=>chest.v142WardenCache&&chest.v142WardenSource===target.id))return null;
    const roomId=typeof W!=="undefined"&&W?.roomAt&&w?W.roomAt(w,target.x,target.y):-1,room=roomId>=0?w?.rooms?.[roomId]:null;
    const chest={id:`v142-warden-cache-${floorNo()}-${String(target.id||"count")}`,x:target.x,y:target.y,locked:false,active:true,depth:Math.max(8,Number(room?.depth)||0)+8,roomId,v142WardenCache:true,v142WardenSource:target.id||"count-loadula"};
    h.chests.push(chest);return chest;
  }

  function startAftershock(target,player){
    const h=currentHost(),r=currentRun(),w=currentWorld();if(!h||!r)return;
    let roomId=-1;try{if(w&&typeof W!=="undefined"&&W?.roomAt)roomId=W.roomAt(w,target.x,target.y)}catch(_){}
    h.v142WardenAftershock={roomId,sourceId:target.id||"count-loadula",sourceName:label(target),until:performance.now()+AFTERSHOCK_MS,lastTick:0};h.v142AftershockFadedShown=false;
    r.alert=Math.min(100,Math.max(Number(r.alert)||0,AFTERSHOCK_ALERT));
    if(player){player.armor=Math.min(12,(Number(player.armor)||0)+2);const ammo=Math.max(12,Math.ceil((Number(player.maxMana)||100)*.18));player.mana=Math.min(Number(player.maxMana)||100,(Number(player.mana)||0)+ammo)}
  }

  function grantEssence(player){
    if(!player)return 0;player.banishmentEssence=Math.max(0,Math.floor(Number(player.banishmentEssence)||0))+1;return player.banishmentEssence;
  }

  function finaliseWarden(target,player,{baseScore=0,baseXp=0}={}){
    const h=currentHost(),r=currentRun();if(!target||!player||!h||!r||target.v142WardenRewarded)return false;
    target.v142WardenRewarded=true;target.v142WardenDefeated=true;target.v142WardState="defeated";target.v142WardBroken=false;
    const name=label(target);
    if(isCount(target)){
      target.awake=false;target.near=false;target.permanentlyBanished=true;target.spawnTimer=Number.POSITIVE_INFINITY;target.hp=0;target.stunMs=0;
      try{S?.setStalkerNear?.(false)}catch(_){}
      r.stats.kills=(Number(r.stats.kills)||0)+1;
      try{recordEnemyDefeat(target,player,name)}catch(_){}
    }else{
      h.defeatedDeathStalkers=h.defeatedDeathStalkers||[];if(!h.defeatedDeathStalkers.includes(target.id))h.defeatedDeathStalkers.push(target.id);
      const timed=(h.timedRooms||[]).find(room=>room.hunterId===target.id);if(timed)timed.stalkerDefeated=true;
    }
    r.stats=r.stats||{};r.stats.wardenKills=(Number(r.stats.wardenKills)||0)+1;
    const scoreBonus=Math.max(0,SCORE_REWARD-baseScore),xpBonus=Math.max(0,XP_REWARD-baseXp);
    try{score+=scoreBonus}catch(_){}
    try{if(xpBonus>0)awardXP(player,xpBonus,`${name} defeated after its ward was broken`)}catch(_){}
    const essence=grantEssence(player),cache=spawnWardenCache(target);startAftershock(target,player);
    h.revision=(Number(h.revision)||0)+1;sfx("elite");fxBurst(target.x,target.y);
    try{floatText(target.x,target.y,`WARDEN DOWN! +${SCORE_REWARD.toLocaleString()} SCORE`,P.gold,{life:3200})}catch(_){}
    announce(`${name.toUpperCase()} DEFEATED`,`Warden kill secured: ${SCORE_REWARD.toLocaleString()} total score, ${XP_REWARD} total XP, +1 Banishment Essence, +2 armour and an ammo refill. ${cache?"A high-tier Warden Cache has appeared at the kill site. ":""}The kill has also triggered a ${Math.round(AFTERSHOCK_MS/1000)}-second dungeon aftershock at ${AFTERSHOCK_ALERT}%+ alert, so taking the reward still carries risk. Vessel Essence: ${essence}.`,"green",12500);
    broadcast();syncNow();return true;
  }

  function damageCountWarden(target,power,player){
    if(!target?.awake||target.v142WardenDefeated)return false;
    if(!broken(target))return false;
    const damage=Math.max(1,Math.floor(Number(power)||1));target.hp=Math.max(0,(Number(target.hp)||wardHp(target,player))-damage);target.flash=180;target.hpBarMs=3600;target.stunMs=Math.max(Number(target.stunMs)||0,120);
    sfx("hit");try{burst(target.x,target.y,P.purple,12,1.2);ring(target.x,target.y,P.purple,24);floatText(target.x,target.y,`-${damage} · ${target.hp} HP`,P.white)}catch(_){}
    if(target.hp<=0)finaliseWarden(target,player||currentPlayer(),{baseScore:0,baseXp:0});return true;
  }

  if(baseDamageEnemy&&baseIsDeathStalkerEnemy){
    damageEnemy=function(enemy,power,element="energy",attacker=currentPlayer()){
      if(!enemy?.alive||!baseIsDeathStalkerEnemy(enemy)||!broken(enemy))return baseDamageEnemy(enemy,power,element,attacker);
      const livePredicate=isDeathStalkerEnemy,scoreBefore=(()=>{try{return Number(score)||0}catch(_){return 0}})(),xpBefore=Number(attacker?.totalXp)||0;let result;
      try{
        isDeathStalkerEnemy=function(candidate){return candidate===enemy?false:baseIsDeathStalkerEnemy(candidate)};
        result=baseDamageEnemy(enemy,power,element,attacker);
      }finally{
        isDeathStalkerEnemy=livePredicate;
      }
      if(!enemy.alive&&!enemy.v142WardenRewarded){const scoreAfter=(()=>{try{return Number(score)||0}catch(_){return scoreBefore}})(),xpAfter=Number(attacker?.totalXp)||xpBefore;finaliseWarden(enemy,attacker||currentPlayer(),{baseScore:Math.max(0,scoreAfter-scoreBefore),baseXp:Math.max(0,xpAfter-xpBefore)})}
      return result;
    };
  }

  banishmentState=function(player){return banishmentStateV142(player)};
  permanentlyBanish=function(target,player){return breakWard(target,player)};
  activateBanishment=function(player){
    if(!player)return false;const ix=inventoryChargeIndex(player);if(ix<0){sfx("empty");announce("NO WARD-BREAK CHARGE","Distil Banishment Essence at an Alchemist. The charge breaks a supernatural Warden's immunity; it does not kill the target for you.","red",7200);return false}
    const state=banishmentStateV142(player);if(!state.ready){announce("NO SEALED WARD IN RANGE",`Move within ${state.range} tiles of a sealed Death Stalker or ${String(CFG.stalker?.name||"Count Loadula")}. If its ward has already been broken, use your weapons and finish the fight.`,"cyan",7200);return false}
    PROG.inventoryRemove(player,ix);return breakWard(state.nearest,player);
  };
  useBanishment=function(player){return activateBanishment(player)};

  if(baseHitStalker){
    hitStalker=function(bullet){
      const h=currentHost(),target=h?.stalker;if(!target?.awake||target.v142WardenDefeated)return false;
      if(Math.round(Number(bullet?.x))!==Number(target.x)||Math.round(Number(bullet?.y))!==Number(target.y))return false;
      if(!broken(target))return baseHitStalker(bullet);
      let attacker=null;try{attacker=typeof findLocal==="function"?findLocal(bullet.owner):null}catch(_){}attacker=attacker||currentPlayer();
      return damageCountWarden(target,bullet.power,attacker);
    };
  }

  if(baseItemHelp){
    itemHelp=function(kind){
      if(kind==="banishment")return `A distilled Ward-Break Charge. Press B within ${chargeRange()} tiles of a sealed Death Stalker or ${String(CFG.stalker?.name||"Count Loadula")} to remove its immunity. The Warden then has a real health pool and must be defeated in combat. The charge is consumed when the ward breaks.`;
      return baseItemHelp(kind);
    };
  }

  if(baseRenderShop){
    renderShop=function(...args){
      const result=baseRenderShop(...args);try{
        const alchemist=activeShop?.v142Alchemist||String(activeShop?.title||"").includes("ALCHEMIST");if(!alchemist)return result;
        if(UI?.shopCopy)UI.shopCopy.textContent=`Distil Banishment Essence into a Ward-Break Charge. It removes a supernatural Warden's immunity but does not kill it — you must finish the Warden in combat to claim its cache and rewards.`;
        const trade=UI?.shopItems?.querySelector?.('[data-shop-buy="banishment"]');if(trade){trade.textContent="DISTIL WARD-BREAK CHARGE";const article=trade.closest("article");const title=article?.querySelector("h3");if(title)title.textContent="DISTIL WARD-BREAK CHARGE";const copy=article?.querySelector("p");if(copy)copy.textContent="Consumes Essence to break one sealed Warden ward. The target becomes vulnerable and must then be defeated normally."}
      }catch(_){}return result;
    };
  }

  if(baseSync){
    sync=function(...args){
      const result=baseSync(...args);try{
        const player=currentPlayer(),state=player?banishmentStateV142(player):null;
        if(state?.ready&&UI?.banishAlertText){const name=label(state.nearest).toUpperCase(),tiles=Math.max(0,Math.round(dist(state.nearest,player)));UI.banishAlertText.textContent=`${name} ${tiles} TILE${tiles===1?"":"S"} AWAY — PRESS B TO BREAK WARD`}
        const flaskCount=player?PROG.inventoryKindCount(player,"banishment"):0;if(UI?.quickSpecials&&flaskCount>0){const text=String(UI.quickSpecials.textContent||"").replace(/BANISH/g,"WARD BREAK");UI.quickSpecials.textContent=text}
      }catch(_){}return result;
    };
  }

  if(baseTriggerTimed){
    triggerTimed=function(player){
      const h=currentHost(),before=new Set((h?.timedRooms||[]).filter(room=>room.triggered).map(room=>room.hunterId||room.roomId));const result=baseTriggerTimed(player);
      for(const room of h?.timedRooms||[]){if(!room.triggered||before.has(room.hunterId||room.roomId))continue;const hunter=(h.enemies||[]).find(enemy=>enemy.id===room.hunterId);if(hunter?.alive)announce("TIMED CHAMBER — SEALED DEATH STALKER",`Survive the chamber or use a Ward-Break Charge in range. Breaking its ward only makes it vulnerable — you still need to kill it with weapons for the full Warden reward.`,"red",10500)}
      return result;
    };
  }

  if(baseUpdateTimed){
    updateTimed=function(dt){
      const h=currentHost(),before=new Map((h?.timedRooms||[]).map(room=>[room.id,Boolean(room.cleared)]));const result=baseUpdateTimed(dt);
      for(const room of h?.timedRooms||[])if(!before.get(room.id)&&room.cleared){const hunter=(h.enemies||[]).find(enemy=>enemy.id===room.hunterId);if(hunter?.alive)announce("TIMED CHAMBER CLEARED","Thirty seconds survived. The Death Stalker still holds its ward. You can leave it alone, or spend a Ward-Break Charge and fight for the Warden Cache.","green",9000)}return result;
    };
  }

  function scanWardenDefeats(){
    const h=currentHost(),player=currentPlayer();if(!h||!player)return;
    for(const enemy of h.enemies||[]){
      if(enemy?.alive||!enemy?.v142WardBroken||enemy.v142WardenRewarded||!baseIsDeathStalkerEnemy?.(enemy))continue;
      finaliseWarden(enemy,player,{baseScore:120,baseXp:100});
    }
  }

  function updateAftershock(){
    const h=currentHost(),r=currentRun(),w=currentWorld(),player=currentPlayer();if(!h||!r||!h.v142WardenAftershock)return;
    const state=h.v142WardenAftershock,now=performance.now();if(now>=Number(state.until||0)){delete h.v142WardenAftershock;if(!h.v142AftershockFadedShown){h.v142AftershockFadedShown=true;announce("WARDEN AFTERSHOCK FADES","The dungeon pressure has settled. The Warden Cache remains if you have not opened it yet.","cyan",6500)}return}
    r.alert=Math.max(Number(r.alert)||0,AFTERSHOCK_ALERT);if(now-Number(state.lastTick||0)<600)return;state.lastTick=now;
    let playerRoom=-2;try{if(w&&player&&typeof W!=="undefined"&&W?.roomAt)playerRoom=W.roomAt(w,player.x,player.y)}catch(_){}
    for(const enemy of h.enemies||[]){
      if(!enemy?.alive||enemy.v142WardenDefeated||recognisedEnemy(enemy))continue;
      let enemyRoom=-3;try{if(w&&typeof W!=="undefined"&&W?.roomAt)enemyRoom=W.roomAt(w,enemy.x,enemy.y)}catch(_){}
      if(state.roomId>=0&&enemyRoom!==state.roomId&&enemyRoom!==playerRoom)continue;
      if(player){enemy.aiState="chase";enemy.lastSeen={x:player.x,y:player.y};enemy.memoryMs=Math.max(Number(enemy.memoryMs)||0,2800);enemy.moveCooldown=Math.min(Number(enemy.moveCooldown)||650,500)}
    }
  }

  function patchStaticCopy(){
    try{
      const tip=document.querySelector(".dossier-card .reference-tip");if(tip)tip.innerHTML=`<b>Supernatural Wardens:</b> distil Banishment Essence into a Ward-Break Charge, press <b>B</b> in range to strip immunity, then defeat the Warden in combat for its cache and rewards.`;
      const feature=[...document.querySelectorAll("#menu .feature-strip span")].find(node=>/DEATH STALKER|WARDEN/i.test(node.textContent||""));if(feature)feature.innerHTML="<b>SUPERNATURAL WARDENS</b>Break their immunity with alchemy, then earn the kill in combat for high-tier rewards";
      const alertTitle=UI?.banishAlert?.querySelector?.("b");if(alertTitle)alertTitle.textContent="WARD BREAK READY";
    }catch(_){}
  }

  patchStaticCopy();
  const timer=setInterval(()=>{try{scanWardenDefeats();updateAftershock()}catch(error){console.warn("[Lost Sizzler V10.42] Warden purpose tick failed safely",error)}},250);
  addEventListener("pagehide",()=>clearInterval(timer),{once:true});

  window.CCGLostSizzlerV142WardenPurposeOverhaul={
    version:"V10.42 r3",
    scoreReward:SCORE_REWARD,
    xpReward:XP_REWARD,
    aftershockMs:AFTERSHOCK_MS,
    breakWard,
    state:banishmentStateV142
  };
})();
