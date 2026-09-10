/* The Lost Sizzler V10.42 r7 — deterministic room objective and breakable-scenery director.
 * Gameplay-planning layer only: derives repeatable objectives, risk/reward hooks and
 * furnishing descriptors from authoritative run/world state. It does not own input,
 * movement, combat, saves, networking or entitlement state.
 */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V142_R7_ROOM_OBJECTIVE_DIRECTOR__)return;
  window.__CCG_LOST_SIZZLER_V142_R7_ROOM_OBJECTIVE_DIRECTOR__=true;

  const C=window.CCG_CONFIG,W=window.CCGWorld;
  if(!C||!W||typeof W.createHostState!=="function")return;

  const BIOME_IDS=["threshold","iron","bone","ash","sigil"];
  const BREAKABLES={
    threshold:["rotted-crate","rain-barrel","fallen-statue","overgrown-pot"],
    iron:["armour-rack","supply-crate","forge-cask","weapon-stand"],
    bone:["burial-urn","bone-pile","root-casket","crypt-vase"],
    ash:["slag-pot","charred-crate","ember-brazier","ore-cask"],
    sigil:["rune-urn","crystal-plinth","archive-cache","sigil-vessel"]
  };
  const REWARD_FOCUS=["equipment","artefact","dossier","supplies","coins"];
  const state={installed:false,plans:0,lastFloor:0,lastSeed:""};
  const num=(v,f=0)=>{const n=Number(v);return Number.isFinite(n)?n:f};
  const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
  const currentRun=()=>{try{return typeof run!=="undefined"?run:null}catch(_){return null}};

  function hash32(value){let h=2166136261>>>0;for(const ch of String(value||"")){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}h+=h<<13;h^=h>>>7;h+=h<<3;h^=h>>>17;h+=h<<5;return h>>>0}
  const unit=value=>hash32(value)/4294967296;
  const pick=(rows,key)=>rows[hash32(key)%rows.length];
  const floorBiome=floor=>BIOME_IDS[clamp(Math.floor(num(floor,1)),1,5)-1]||"threshold";

  function roomRole(room,worldState){
    const env=room?.v142Environment;
    if(env?.role)return String(env.role);
    if(!room)return"chamber";
    if(room.id===worldState?.startRoomId)return"arrival";
    if(room.id===worldState?.exitRoomId)return"exit";
    if(room.spiderNest)return"web-nest";
    if(room.skeletonHorde)return"ossuary";
    if(room.sanctuary)return"sanctuary";
    if(room.traderRoom)return"trader";
    if(room.memoryPuzzleRoom||room.sequenceTorchRoom||room.weightBridgeRoom)return"puzzle";
    if(room.dedicatedHazard||room.dangerous)return"hazard";
    if(room.optional)return"secret";
    if(room.grandHall)return"great-hall";
    return"chamber";
  }

  function rareRole(room){return String(room?.v142Environment?.rareRole||"")}

  function objectivePool(role,rare){
    if(role==="arrival")return["survey-route"];
    if(role==="exit")return["secure-exit"];
    if(role==="sanctuary")return["sanctuary-choice"];
    if(role==="trader")return["trader-request"];
    if(role==="web-nest")return["cut-web-anchors","purge-brood","rescue-cocooned-scout"];
    if(role==="ossuary")return["break-bone-totems","silence-crypt-guard","recover-reliquary"];
    if(role==="puzzle")return["solve-room-device"];
    if(role==="hazard")return["survive-hazard","cross-without-triggering"];
    if(role==="secret")return["recover-hidden-cache","inspect-lost-dossier","choose-cursed-reward"];
    if(role==="great-hall"||rare==="great-hall")return["hunt-elite","hold-great-hall","claim-elite-cache"];
    if(rare==="alternate-route")return["secure-alternate-route","scout-risk-route","recover-route-cache"];
    if(rare==="shortcut-junction")return["unlock-shortcut","clear-junction"];
    if(rare==="hidden-alcove")return["inspect-hidden-alcove","recover-hidden-cache"];
    return["clear-room","hold-ground","recover-cache","hunt-champion"];
  }

  function titleFor(type){
    return ({
      "survey-route":"SURVEY THE APPROACH","secure-exit":"SECURE THE DESCENT","sanctuary-choice":"CHOOSE A SANCTUARY BOON","trader-request":"FULFIL A TRADER REQUEST",
      "cut-web-anchors":"CUT THE WEB ANCHORS","purge-brood":"PURGE THE BROOD","rescue-cocooned-scout":"RESCUE THE COCOONED SCOUT",
      "break-bone-totems":"BREAK THE BONE TOTEMS","silence-crypt-guard":"SILENCE THE CRYPT GUARD","recover-reliquary":"RECOVER THE RELIQUARY",
      "solve-room-device":"SOLVE THE CHAMBER DEVICE","survive-hazard":"SURVIVE THE HAZARD","cross-without-triggering":"CROSS WITHOUT TRIGGERING THE TRAPS",
      "recover-hidden-cache":"RECOVER THE HIDDEN CACHE","inspect-lost-dossier":"RECOVER THE LOST DOSSIER","choose-cursed-reward":"TAKE OR LEAVE THE CURSED REWARD",
      "hunt-elite":"HUNT THE ELITE","hold-great-hall":"HOLD THE GREAT HALL","claim-elite-cache":"CLAIM THE ELITE CACHE",
      "secure-alternate-route":"SECURE THE ALTERNATE ROUTE","scout-risk-route":"SCOUT THE DANGEROUS ROUTE","recover-route-cache":"RECOVER THE ROUTE CACHE",
      "unlock-shortcut":"UNLOCK THE SHORTCUT","clear-junction":"CLEAR THE JUNCTION","inspect-hidden-alcove":"SEARCH THE HIDDEN ALCOVE",
      "clear-room":"CLEAR THE CHAMBER","hold-ground":"HOLD YOUR GROUND","recover-cache":"RECOVER THE CACHE","hunt-champion":"HUNT THE CHAMPION"
    })[type]||"CLEAR THE CHAMBER";
  }

  function planBreakables(room,biome,role,key){
    const pool=[...(BREAKABLES[biome]||BREAKABLES.threshold)];
    if(role==="web-nest")pool.unshift("web-sac","hanging-cocoon");
    if(role==="ossuary")pool.unshift("bone-pile","burial-urn");
    const area=Math.max(1,num(room?.w,6)*num(room?.h,6));
    const count=clamp(2+Math.floor(area/55)+(hash32(`${key}|breakables`)%2),2,5),rows=[];
    const minX=num(room?.x,0)+1,maxX=num(room?.x,0)+Math.max(1,num(room?.w,6)-1),minY=num(room?.y,0)+1,maxY=num(room?.y,0)+Math.max(1,num(room?.h,6)-1);
    for(let i=0;i<count;i++){
      const itemKey=`${key}|prop|${i}`,kind=pick(pool,`${itemKey}|kind`),durability=1+(hash32(`${itemKey}|hp`)%3);
      const x=Math.floor(minX+unit(`${itemKey}|x`)*Math.max(1,maxX-minX)),y=Math.floor(minY+unit(`${itemKey}|y`)*Math.max(1,maxY-minY));
      rows.push({id:`R${room?.id??0}-P${i}`,kind,x,y,durability,lootChance:Number((.16+unit(`${itemKey}|loot`)*.30).toFixed(2)),hazardous:biome==="ash"&&kind==="ember-brazier",webbed:role==="web-nest"});
    }
    return rows;
  }

  function planRoom(room,worldState,runState){
    const floor=clamp(Math.floor(num(runState?.floor,1)),1,5),biome=String(room?.v142Environment?.biome||floorBiome(floor)),role=roomRole(room,worldState),rare=rareRole(room),key=`${runState?.seed||"lost-sizzler"}|F${floor}|R${room?.id??0}|${biome}|${role}|${rare}|R7`;
    const type=pick(objectivePool(role,rare),`${key}|objective`),optional=role==="secret"||Boolean(rare)||["sanctuary","trader"].includes(role),elite=["hunt-elite","claim-elite-cache","hunt-champion","silence-crypt-guard"].includes(type);
    let risk=1+Math.floor(unit(`${key}|risk`)*3)+Math.floor((floor-1)/2)+(elite?1:0)+(optional?1:0);risk=clamp(risk,1,5);
    let rewardTier=1+Math.floor((risk-1)/2)+(optional?1:0)+(elite?1:0);rewardTier=clamp(rewardTier,1,4);
    const routeBonus=rare==="alternate-route"?"alternate-route-cache":rare==="shortcut-junction"?"shortcut-access":rare==="hidden-alcove"?"secret-cache":rare==="great-hall"?"elite-cache":"";
    const targetCount=["cut-web-anchors","break-bone-totems"].includes(type)?2+(hash32(`${key}|targets`)%3):["hold-ground","hold-great-hall","survive-hazard"].includes(type)?20+(hash32(`${key}|seconds`)%21):1;
    return {version:"V10.42-r7",roomId:room?.id??0,floor,biome,role,rareRole:rare,objective:{id:`F${floor}-R${room?.id??0}-${type}`,type,title:titleFor(type),targetCount,optional,elite,risk,rewardTier,rewardFocus:pick(REWARD_FOCUS,`${key}|reward`),routeBonus},breakables:planBreakables(room,biome,role,key),seed:hash32(key),saveKey:`v142-r7:F${floor}:R${room?.id??0}:${hash32(key).toString(16)}`};
  }

  function applyPlans(worldState,hostState,runState=currentRun()){
    if(!worldState?.rooms||!hostState||!runState)return hostState;
    const plans=[];
    for(const room of worldState.rooms){const plan=planRoom(room,worldState,runState);room.v142Objective=plan.objective;room.v142Breakables=plan.breakables;plans.push(plan);state.plans++}
    const floor=clamp(Math.floor(num(runState.floor,1)),1,5),seed=String(runState.seed||"lost-sizzler");
    hostState.v142RoomObjectives={version:"V10.42-r7",floor,biome:floorBiome(floor),seedKey:`${seed}|F${floor}|OBJECTIVES-R7`,plans};
    state.lastFloor=floor;state.lastSeed=seed;return hostState;
  }

  const baseCreateHostState=W.createHostState.bind(W);
  W.createHostState=function createHostStateV142R7Objectives(worldState){const hostState=baseCreateHostState(worldState);return applyPlans(worldState,hostState,currentRun())};
  state.installed=true;

  window.CCGLostSizzlerV142R7RoomObjectiveDirector={version:"V10.42-r7",BREAKABLES,REWARD_FOCUS,state,hash32,planRoom,applyPlans};
})();