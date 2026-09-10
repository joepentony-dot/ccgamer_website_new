/* The Lost Sizzler V10.42 r10 — breakable objective runtime.
 * Converts shared r8 destruction state into deterministic room objective progress,
 * completion rewards and biome consequences. No input, movement, render-loop,
 * networking, entitlement or browser-storage ownership.
 */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V142_R10_BREAKABLE_OBJECTIVE_RUNTIME__)return;
  window.__CCG_LOST_SIZZLER_V142_R10_BREAKABLE_OBJECTIVE_RUNTIME__=true;

  const R7=window.CCGLostSizzlerV142R7RoomObjectiveDirector;
  const R8=window.CCGLostSizzlerV142R8BreakableInteractionDirector;
  const R9=window.CCGLostSizzlerV142R9BreakablePresentationDirector;
  const W=window.CCGWorld;
  if(!R7||!R8||!W||typeof W.createHostState!=="function")return;

  const BREAKABLE_OBJECTIVES=new Set(["cut-web-anchors","break-bone-totems"]);
  const state={installed:false,rooms:new Map(),completed:0,hazards:0,rewards:0};
  const clamp=(v,min,max)=>Math.max(min,Math.min(max,Number(v)||0));
  const hash32=R7.hash32;
  const isWeb=prop=>Boolean(prop?.webbed)||/web|cocoon/.test(String(prop?.kind||""));
  const isBone=prop=>/bone|burial|crypt|casket|urn|vase/.test(String(prop?.kind||""));
  const eligible=(type,prop)=>type==="cut-web-anchors"?isWeb(prop):type==="break-bone-totems"?isBone(prop):false;

  function runtimeKey(room){return String(room?.key||"")}
  function planFor(hostState,room){
    const id=room?.roomId;
    return (hostState?.v142RoomObjectives?.plans||[]).find(plan=>plan?.roomId===id)||null;
  }

  function materializeRoom(hostState,room){
    const key=runtimeKey(room),existing=state.rooms.get(key);if(existing)return existing;
    const plan=planFor(hostState,room),objective=plan?.objective||{},type=String(objective.type||"");
    const eligibleIds=[...room?.props?.values?.()||[]].filter(prop=>eligible(type,prop)).map(prop=>String(prop.id));
    const requested=Math.max(1,Math.floor(Number(objective.targetCount)||1));
    const target=BREAKABLE_OBJECTIVES.has(type)?Math.max(1,Math.min(requested,eligibleIds.length||1)):0;
    const runtime={version:"V10.42-r10",key,roomId:room?.roomId??0,type,eligibleIds,target,progress:0,completed:false,rewardClaimed:false,reward:null,hazardEvents:[],completionToken:hash32(`${key}|${type}|completion`).toString(16)};
    state.rooms.set(key,runtime);return runtime;
  }

  function recount(runtime,room){
    if(!runtime||!room||!BREAKABLE_OBJECTIVES.has(runtime.type))return runtime;
    let count=0;for(const id of runtime.eligibleIds){if(room.props.get(id)?.destroyed)count++}
    runtime.progress=Math.min(runtime.target,count);
    if(!runtime.completed&&runtime.progress>=runtime.target)complete(runtime,room);
    return runtime;
  }

  function completionReward(runtime,room){
    const planRoomId=room?.roomId??0;
    const tier=clamp((room?.objectiveId&&state.rooms.get(runtime.key)?.target)||1,1,4);
    const kind=runtime.type==="cut-web-anchors"?"web-cache":"crypt-reliquary";
    return Object.freeze({kind,tier,token:hash32(`${runtime.key}|${planRoomId}|${runtime.type}|reward`).toString(16),roomKey:runtime.key});
  }

  function complete(runtime,room){
    if(runtime.completed)return runtime.reward;
    runtime.completed=true;state.completed+=1;
    if(!runtime.rewardClaimed){runtime.rewardClaimed=true;runtime.reward=completionReward(runtime,room);state.rewards+=1}
    return runtime.reward;
  }

  function hazardFor(room,prop){
    if(!prop?.hazardous||!prop.destroyed)return null;
    const runtime=state.rooms.get(runtimeKey(room));if(!runtime)return null;
    const token=hash32(`${runtime.key}|${prop.id}|ember-hazard`).toString(16);
    if(runtime.hazardEvents.some(event=>event.token===token))return null;
    const event=Object.freeze({kind:"ember-surge",token,x:prop.x,y:prop.y,radius:1.25,durationMs:900,damage:1});
    runtime.hazardEvents.push(event);state.hazards+=1;return event;
  }

  function reconcile(room,hostState=currentHost()){
    if(!room)return null;
    const runtime=materializeRoom(hostState,room);recount(runtime,room);
    for(const prop of room.props?.values?.()||[])if(prop.destroyed)hazardFor(room,prop);
    room.objectiveProgress=BREAKABLE_OBJECTIVES.has(runtime.type)?runtime.progress:room.objectiveProgress;
    return runtime;
  }

  function currentHost(){try{return typeof host!=="undefined"?host:null}catch(_){return null}}
  function resolveRoom(keyOrRoom){return typeof keyOrRoom==="string"?R8.state.rooms.get(keyOrRoom):keyOrRoom}

  function materializeHost(hostState){
    const rooms=[];for(const room of hostState?.v142BreakableInteractions?.rooms||[])rooms.push(materializeRoom(hostState,room));
    if(hostState)hostState.v142BreakableObjectiveRuntime={version:"V10.42-r10",rooms};
    return hostState;
  }

  const baseCreateHostState=W.createHostState.bind(W);
  W.createHostState=function createHostStateV142R10Objectives(worldState){const hostState=baseCreateHostState(worldState);return materializeHost(hostState)};

  const baseDamage=R8.damageBreakable.bind(R8);
  R8.damageBreakable=function damageBreakableV142R10(){
    const keyOrRoom=arguments[0],room=resolveRoom(keyOrRoom),result=baseDamage(...arguments);
    const runtime=reconcile(room,currentHost());
    return runtime?{...result,objective:{type:runtime.type,progress:runtime.progress,target:runtime.target,completed:runtime.completed,reward:runtime.reward},hazard:result?.destroyed?hazardFor(room,room?.props?.get?.(String(arguments[1]))):null}:result;
  };

  const baseStrike=R8.strikeAt.bind(R8);
  R8.strikeAt=function strikeAtV142R10(){
    const room=resolveRoom(arguments[0]),results=baseStrike(...arguments),runtime=reconcile(room,currentHost());
    if(runtime)for(const row of results||[]){row.objective={type:runtime.type,progress:runtime.progress,target:runtime.target,completed:runtime.completed,reward:runtime.reward};const prop=room?.props?.get?.(String(row.id));row.hazard=hazardFor(room,prop)}
    return results;
  };

  function snapshot(){return {version:"V10.42-r10",rooms:[...state.rooms.values()].map(runtime=>({key:runtime.key,type:runtime.type,progress:runtime.progress,completed:runtime.completed,rewardClaimed:runtime.rewardClaimed,reward:runtime.reward,hazardEvents:runtime.hazardEvents}))}}
  function restore(data){
    if(data?.version!=="V10.42-r10"||!Array.isArray(data.rooms))return false;
    for(const saved of data.rooms){const runtime=state.rooms.get(String(saved.key));if(!runtime)continue;runtime.progress=clamp(saved.progress,0,runtime.target);runtime.completed=Boolean(saved.completed);runtime.rewardClaimed=Boolean(saved.rewardClaimed);runtime.reward=saved.reward||null;runtime.hazardEvents=Array.isArray(saved.hazardEvents)?saved.hazardEvents.slice(0,16):[]}
    return true;
  }

  state.installed=true;
  window.CCGLostSizzlerV142R10BreakableObjectiveRuntime={version:"V10.42-r10",state,BREAKABLE_OBJECTIVES,materializeRoom,materializeHost,reconcile,hazardFor,snapshot,restore};
})();