/* The Lost Sizzler V10.42 r8 — deterministic breakable interaction director.
 * Materialises r7 furnishing descriptors into shared, exactly-once room interaction state.
 * Does not own input, movement, combat timing, rendering, networking, entitlement or storage.
 */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V142_R8_BREAKABLE_INTERACTION_DIRECTOR__)return;
  window.__CCG_LOST_SIZZLER_V142_R8_BREAKABLE_INTERACTION_DIRECTOR__=true;

  const R7=window.CCGLostSizzlerV142R7RoomObjectiveDirector,W=window.CCGWorld;
  if(!R7||!W||typeof W.createHostState!=="function")return;

  const state={installed:false,rooms:new Map(),destroyed:0,rewards:0};
  const clamp=(v,min,max)=>Math.max(min,Math.min(max,Number(v)||0));
  const hash32=R7.hash32;
  const rewardKinds={equipment:"equipment-cache",artefact:"artefact-fragment",dossier:"dossier-fragment",supplies:"field-supplies",coins:"coin-cache"};

  function roomKey(plan){return String(plan?.saveKey||`v142-r8:F${plan?.floor||1}:R${plan?.roomId||0}`)}
  function outcomeFor(plan,prop){
    const key=`${roomKey(plan)}|${prop.id}|reward`,roll=hash32(key)/4294967296;
    const rewarded=roll<clamp(prop.lootChance,0,1);
    const focus=String(plan?.objective?.rewardFocus||"supplies");
    const tier=clamp(plan?.objective?.rewardTier||1,1,4);
    return {rewarded,kind:rewarded?(rewardKinds[focus]||"field-supplies"):"none",tier,token:hash32(`${key}|token`).toString(16)};
  }

  function materializePlan(plan){
    const key=roomKey(plan),existing=state.rooms.get(key);if(existing)return existing;
    const props=new Map();
    for(const source of plan?.breakables||[]){
      const maxHp=Math.max(1,Math.floor(Number(source.durability)||1));
      props.set(String(source.id),{id:String(source.id),kind:String(source.kind),x:Number(source.x)||0,y:Number(source.y)||0,hp:maxHp,maxHp,destroyed:false,rewardClaimed:false,outcome:outcomeFor(plan,source),hazardous:Boolean(source.hazardous),webbed:Boolean(source.webbed)});
    }
    const room={key,roomId:plan?.roomId??0,objectiveId:String(plan?.objective?.id||""),destroyedCount:0,objectiveProgress:0,props};
    state.rooms.set(key,room);return room;
  }

  function materializeHost(hostState){
    const plans=hostState?.v142RoomObjectives?.plans||[];
    const rooms=[];for(const plan of plans)rooms.push(materializePlan(plan));
    if(hostState)hostState.v142BreakableInteractions={version:"V10.42-r8",rooms};
    return hostState;
  }

  function destroy(room,prop){
    if(!room||!prop||prop.destroyed)return {changed:false,destroyed:Boolean(prop?.destroyed),reward:null};
    prop.hp=0;prop.destroyed=true;room.destroyedCount+=1;state.destroyed+=1;
    let reward=null;
    if(prop.outcome.rewarded&&!prop.rewardClaimed){prop.rewardClaimed=true;state.rewards+=1;reward={...prop.outcome,propId:prop.id,roomKey:room.key}}
    room.objectiveProgress=room.destroyedCount;
    return {changed:true,destroyed:true,reward,fx:{kind:prop.webbed?"web-burst":prop.hazardous?"ember-burst":"debris-burst",x:prop.x,y:prop.y,seed:hash32(`${room.key}|${prop.id}|fx`)}};
  }

  function damageBreakable(keyOrRoom,id,amount=1){
    const room=typeof keyOrRoom==="string"?state.rooms.get(keyOrRoom):keyOrRoom;
    const prop=room?.props?.get(String(id));if(!prop||prop.destroyed)return {changed:false,destroyed:Boolean(prop?.destroyed),reward:null};
    const damage=Math.max(0,Number(amount)||0);if(!damage)return {changed:false,destroyed:false,reward:null};
    prop.hp=Math.max(0,prop.hp-damage);if(prop.hp<=0)return destroy(room,prop);
    return {changed:true,destroyed:false,reward:null,fx:{kind:"prop-hit",x:prop.x,y:prop.y,seed:hash32(`${room.key}|${prop.id}|${prop.hp}|hit`)}};
  }

  function strikeAt(keyOrRoom,x,y,amount=1,radius=.72){
    const room=typeof keyOrRoom==="string"?state.rooms.get(keyOrRoom):keyOrRoom;if(!room)return [];
    const hits=[];for(const prop of room.props.values()){
      if(prop.destroyed)continue;const dx=prop.x-Number(x||0),dy=prop.y-Number(y||0);if(dx*dx+dy*dy<=radius*radius)hits.push({id:prop.id,...damageBreakable(room,prop.id,amount)});
    }
    return hits;
  }

  function snapshot(){
    return {version:"V10.42-r8",rooms:[...state.rooms.values()].map(room=>({key:room.key,destroyedCount:room.destroyedCount,objectiveProgress:room.objectiveProgress,props:[...room.props.values()].map(prop=>({id:prop.id,hp:prop.hp,destroyed:prop.destroyed,rewardClaimed:prop.rewardClaimed}))}))};
  }

  function restore(data){
    if(data?.version!=="V10.42-r8"||!Array.isArray(data.rooms))return false;
    for(const savedRoom of data.rooms){const room=state.rooms.get(String(savedRoom.key));if(!room)continue;
      room.destroyedCount=Math.max(0,Number(savedRoom.destroyedCount)||0);room.objectiveProgress=Math.max(0,Number(savedRoom.objectiveProgress)||0);
      for(const saved of savedRoom.props||[]){const prop=room.props.get(String(saved.id));if(!prop)continue;prop.hp=clamp(saved.hp,0,prop.maxHp);prop.destroyed=Boolean(saved.destroyed);prop.rewardClaimed=Boolean(saved.rewardClaimed);if(prop.destroyed)prop.hp=0}
    }
    return true;
  }

  const baseCreateHostState=W.createHostState.bind(W);
  W.createHostState=function createHostStateV142R8Breakables(worldState){return materializeHost(baseCreateHostState(worldState))};
  state.installed=true;
  window.CCGLostSizzlerV142R8BreakableInteractionDirector={version:"V10.42-r8",state,materializePlan,materializeHost,damageBreakable,strikeAt,snapshot,restore,outcomeFor};
})();