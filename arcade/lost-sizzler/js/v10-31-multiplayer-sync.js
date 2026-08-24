/* The Lost Sizzler V10.32 — host-authoritative co-op interactions. */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_MULTIPLAYER_SYNC_V131__)return;
  window.__CCG_LOST_SIZZLER_MULTIPLAYER_SYNC_V131__=true;

  const requested=new Map();
  const canRequest=key=>{const now=performance.now(),last=Number(requested.get(key)||0);if(now-last<260)return false;requested.set(key,now);return true};
  const onlineGuest=()=>typeof playMode!=="undefined"&&playMode==="online"&&net?.connected&&!net.isHost;
  let requestSerial=0;
  const near=(actor,target,limit=2.25)=>Boolean(actor&&target&&Math.hypot(Number(actor.x)-Number(target.x),Number(actor.y)-Number(target.y))<=limit);
  function actorFor(payload,target=null,limit=2.25){
    const claimed=payload?.actorState,member=net.getMembers?.().some?.(row=>row.id===payload?.actor);let actor=remote?.get?.(payload?.actor)||null;if(!actor&&!member)return null;
    const validClaim=claimed&&Number.isFinite(Number(claimed.x))&&Number.isFinite(Number(claimed.y))&&(!target||near(claimed,target,limit))&&(!actor||near(actor,claimed,6)||performance.now()-Number(actor.lastSeen||0)>900);
    if(!actor&&validClaim){actor={...claimed,id:payload.actor,lastSeen:performance.now(),rx:Number(claimed.x),ry:Number(claimed.y)};remote.set(payload.actor,actor)}
    else if(actor&&validClaim){actor={...actor,...claimed,id:payload.actor,lastSeen:performance.now(),rx:actor.rx??Number(claimed.x),ry:actor.ry??Number(claimed.y)};remote.set(payload.actor,actor)}
    return actor
  }
  const request=(action,payload={})=>{const requestId=`${net.sessionId}-${Date.now()}-${++requestSerial}`;return net.sendRequired("v131_interact",{action,actor:net.sessionId,actorState:playerStateForNetwork(p1),requestId,...payload}).catch(error=>{
    try{showToast("CO-OP ACTION DELAYED",error?.message||"The host did not receive that action. Try again.","red",5200)}catch(_){}
  })};
  const reply=(payload,accepted,reason="")=>net.send("v132_interaction_result",{target:payload?.actor,requestId:payload?.requestId,action:payload?.action,accepted:Boolean(accepted),reason});

  function applyPlayerState(payload){
    if(payload?.target!==net.sessionId||!payload.state||!p1)return;const state=payload.state;
    for(const key of ["health","maxHealth","mana","maxMana","torchMs","rapidMs","armor","bronzeKeys","level","xp","totalXp","inventorySlots","firearmUnlocked","damageBonus","dashDamage","potionBonus","torchBonusMs","moveMultiplier"])if(state[key]!==undefined)p1[key]=state[key];
    if(Array.isArray(state.inventory))p1.inventory=state.inventory.map(item=>({...item}));if(state.weapon!==undefined)p1.weapon=state.weapon?{...state.weapon}:null;if(state.meleeWeapon)p1.meleeWeapon={...state.meleeWeapon};
    try{sync()}catch(_){}
  }

  function finishHostAction(actor,delay=0){
    const finish=()=>{try{sendRemotePlayerState(actor);broadcastWorld();sync()}catch(_){}};if(delay>0)setTimeout(finish,delay);else finish()
  }

  function handleInteraction(payload){
    if(!net.isHost||playMode!=="online"||mode!=="playing"||!payload)return;
    if(payload.action==="door"){
      const door=W.doorAt(host,Number(payload.x),Number(payload.y)),actor=actorFor(payload,door);if(!door||!actor||!near(actor,door)){reply(payload,false,"The host could not validate your position beside that door.");return}if(Number.isFinite(Number(payload.bronzeKeys)))actor.bronzeKeys=Math.max(0,Math.min(99,Number(payload.bronzeKeys)));tryDoor(actor,door.x,door.y);finishHostAction(actor);reply(payload,true);return
    }
    if(payload.action==="chest"){
      const chest=(host.chests||[]).find(item=>item.id===payload.id&&item.active),actor=actorFor(payload,chest);if(!chest||!actor||!near(actor,chest)){reply(payload,false,"The host could not validate your position beside that chest.");return}if(Number.isFinite(Number(payload.bronzeKeys)))actor.bronzeKeys=Math.max(0,Math.min(99,Number(payload.bronzeKeys)));openChest(actor,chest);finishHostAction(actor,720);reply(payload,true);return
    }
    if(payload.action==="close-door"){
      const actor=actorFor(payload),nearby=(host.doors||[]).filter(door=>door.type==="room"&&door.open&&near(actor,door,1.5)),leaves=new Set(nearby.flatMap(door=>door.groupId?(host.doors||[]).filter(item=>item.groupId===door.groupId):[door]));if(!actor||!nearby.length||[...remote.values()].some(player=>player.id!==actor.id&&[...leaves].some(door=>door.x===player.x&&door.y===player.y))){reply(payload,false,"No clear open door was confirmed beside you.");return}closeNearbyDoor(actor);finishHostAction(actor);reply(payload,true);return
    }
    if(payload.action==="generator"){
      const generator=(host.generators||[]).find(item=>item.id===payload.id&&item.alive),actor=actorFor(payload,generator);if(!generator||!actor||!near(actor,generator)){reply(payload,false);return}damageGenerator(generator,Math.max(1,Math.min(8,Number(payload.power)||1)),actor);finishHostAction(actor);reply(payload,true);return
    }
    if(payload.action==="furniture"){
      const target=(host.blockingDecor||[]).find(item=>item.id===payload.id),actor=actorFor(payload,target);if(!target||!actor||!near(actor,target)){reply(payload,false);return}damageFurnitureAt(target.x,target.y,Math.max(1,Math.min(8,Number(payload.power)||1)),actor);finishHostAction(actor);reply(payload,true)
    }
  }

  const originalPacket=net.cb.onPacket;
  net.cb.onPacket=function onPacketV132Sync(event,payload){if(event==="v131_interact"){handleInteraction(payload);return}if(event==="v131_player_state"){applyPlayerState(payload);return}if(event==="v132_interaction_result"){if(payload?.target===net.sessionId&&!payload.accepted&&payload.reason)try{showToast("CO-OP ACTION NOT CONFIRMED",payload.reason,"red",4800)}catch(_){}return}return originalPacket?.(event,payload)};

  if(typeof tryDoor==="function"){
    const original=tryDoor;tryDoor=function tryDoorV131Sync(player,x,y){const door=W.doorAt(host,x,y);if(!onlineGuest()||player!==p1||!door||door.open&&!door.locked)return original.apply(this,arguments);const key=`door:${door.id||`${x},${y}`}`;if(canRequest(key))request("door",{x,y,bronzeKeys:Number(player.bronzeKeys||0)});return false}
  }
  if(typeof tryChest==="function"){
    const original=tryChest;tryChest=function tryChestV131Sync(player,x,y){const chest=W.chestAt(host,x,y);if(!onlineGuest()||player!==p1||!chest)return original.apply(this,arguments);const key=`chest:${chest.id}`;if(canRequest(key))request("chest",{id:chest.id,bronzeKeys:Number(player.bronzeKeys||0)});return false}
  }
  if(typeof closeNearbyDoor==="function"){
    const original=closeNearbyDoor;closeNearbyDoor=function closeNearbyDoorV131Sync(player){if(!onlineGuest()||player!==p1)return original.apply(this,arguments);if(canRequest("close-door"))request("close-door");return true}
  }
  if(typeof damageEnemy==="function"){
    const original=damageEnemy;damageEnemy=function damageEnemyV131Sync(enemy,power,element="energy",attacker=p1){if(!onlineGuest()||attacker!==p1)return original.apply(this,arguments);if(enemy?.alive&&canRequest(`enemy:${enemy.id}:${Math.floor(performance.now()/120)}`))net.send("hit",{enemyId:enemy.id,power:Math.max(1,Math.min(8,Number(power)||1)),element,owner:p1.id,ownerName:p1.name,source:{x:p1.x,y:p1.y}});return true}
  }
  if(typeof damageGenerator==="function"){
    const original=damageGenerator;damageGenerator=function damageGeneratorV131Sync(generator,power,player){if(!onlineGuest()||player!==p1)return original.apply(this,arguments);if(generator?.alive&&canRequest(`generator:${generator.id}`))request("generator",{id:generator.id,power});return true}
  }
  if(typeof damageFurnitureAt==="function"){
    const original=damageFurnitureAt;damageFurnitureAt=function damageFurnitureAtV131Sync(x,y,power,player){if(!onlineGuest()||player!==p1)return original.apply(this,arguments);const target=(host.blockingDecor||[]).find(item=>item.x===x&&item.y===y);if(!target)return false;if(canRequest(`furniture:${target.id}`))request("furniture",{id:target.id,power});return true}
  }

  window.ccgLostSizzlerMultiplayerSyncV131=true;
  window.CCGLostSizzlerMultiplayerSyncV131=window.CCGLostSizzlerMultiplayerSyncV132={handleInteraction,applyPlayerState,actorFor};
})();
