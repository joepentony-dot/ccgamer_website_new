/* The Lost Sizzler V10.31 — host-authoritative co-op interactions. */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_MULTIPLAYER_SYNC_V131__)return;
  window.__CCG_LOST_SIZZLER_MULTIPLAYER_SYNC_V131__=true;

  const requested=new Map();
  const canRequest=key=>{const now=performance.now(),last=Number(requested.get(key)||0);if(now-last<260)return false;requested.set(key,now);return true};
  const onlineGuest=()=>typeof playMode!=="undefined"&&playMode==="online"&&net?.connected&&!net.isHost;
  const actorFor=payload=>remote?.get?.(payload?.actor)||null;
  const near=(actor,target,limit=2.25)=>Boolean(actor&&target&&Math.hypot(Number(actor.x)-Number(target.x),Number(actor.y)-Number(target.y))<=limit);
  const request=(action,payload={})=>net.sendRequired("v131_interact",{action,actor:net.sessionId,...payload}).catch(error=>{
    try{showToast("CO-OP ACTION DELAYED",error?.message||"The host did not receive that action. Try again.","red",5200)}catch(_){}
  });

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
    if(!net.isHost||playMode!=="online"||mode!=="playing"||!payload)return;const actor=actorFor(payload);if(!actor)return;
    if(Number.isFinite(Number(payload.bronzeKeys)))actor.bronzeKeys=Math.max(0,Math.min(99,Number(payload.bronzeKeys)));
    if(payload.action==="door"){
      const door=W.doorAt(host,Number(payload.x),Number(payload.y));if(!door||!near(actor,door))return;tryDoor(actor,door.x,door.y);finishHostAction(actor);return
    }
    if(payload.action==="chest"){
      const chest=(host.chests||[]).find(item=>item.id===payload.id&&item.active);if(!chest||!near(actor,chest))return;openChest(actor,chest);finishHostAction(actor,720);return
    }
    if(payload.action==="close-door"){
      const nearby=(host.doors||[]).filter(door=>door.type==="room"&&door.open&&near(actor,door,1.5)),leaves=new Set(nearby.flatMap(door=>door.groupId?(host.doors||[]).filter(item=>item.groupId===door.groupId):[door]));if(!nearby.length||[...remote.values()].some(player=>player.id!==actor.id&&[...leaves].some(door=>door.x===player.x&&door.y===player.y)))return;closeNearbyDoor(actor);finishHostAction(actor);return
    }
    if(payload.action==="generator"){
      const generator=(host.generators||[]).find(item=>item.id===payload.id&&item.alive);if(!generator||!near(actor,generator))return;damageGenerator(generator,Math.max(1,Math.min(8,Number(payload.power)||1)),actor);finishHostAction(actor);return
    }
    if(payload.action==="furniture"){
      const target=(host.blockingDecor||[]).find(item=>item.id===payload.id);if(!target||!near(actor,target))return;damageFurnitureAt(target.x,target.y,Math.max(1,Math.min(8,Number(payload.power)||1)),actor);finishHostAction(actor)
    }
  }

  const originalPacket=net.cb.onPacket;
  net.cb.onPacket=function onPacketV131Sync(event,payload){if(event==="v131_interact"){handleInteraction(payload);return}if(event==="v131_player_state"){applyPlayerState(payload);return}return originalPacket?.(event,payload)};

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
  window.CCGLostSizzlerMultiplayerSyncV131={handleInteraction,applyPlayerState};
})();
