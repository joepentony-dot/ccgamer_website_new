/* The Lost Sizzler V10.33 — early firearm, occupancy and special-mode geometry safeguards. */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_MODE_POLISH_V133__)return;
  window.__CCG_LOST_SIZZLER_MODE_POLISH_V133__=true;

  const tutorialActive=()=>Boolean(window.CCGLostSizzlerOnboardingV120?.state?.active||document.body?.dataset?.tutorialActive==="true");
  const livingPlayers=()=>{try{return (typeof allPlayers==="function"?allPlayers():[p1,p2].filter(Boolean)).filter(player=>player&&Number(player.health||0)>0)}catch(_){return[]}};
  const hasFirearm=player=>Boolean(window.CCGLostSizzlerMeleeAmmoV125?.hasGun?.(player)||player?.firearmUnlocked&&player?.weapon);
  const playerOccupies=(x,y)=>livingPlayers().some(player=>player.x===x&&player.y===y);
  const enemyOccupies=(x,y,except=null)=>(host?.enemies||[]).some(enemy=>enemy!==except&&enemy?.alive&&enemy.x===x&&enemy.y===y);

  function safeAdjacent(x,y,except=null){
    const candidates=[{x,y},{x:x+1,y},{x:x-1,y},{x,y:y+1},{x,y:y-1}];
    return candidates.find(cell=>world?.map?.[cell.y]?.[cell.x]===0&&W.walkable(world.map,cell.x,cell.y,host)&&!playerOccupies(cell.x,cell.y)&&!enemyOccupies(cell.x,cell.y,except))||null;
  }

  function releaseStarterFirearm(enemy){
    if(!enemy||!run||!host||tutorialActive()||Number(run.floor||1)!==1||run._v133StarterFirearmReleased||net?.isHost===false)return false;
    if(enemy.passiveNpc||enemy.gildedElf||enemy.treasureBat||enemy.taxman||enemy.lostAdventurer||enemy.deathStalker||enemy.voidStalker)return false;
    if(livingPlayers().some(hasFirearm)){run._v133StarterFirearmReleased=true;return false}
    const cell=safeAdjacent(enemy.x,enemy.y,enemy)||{x:enemy.x,y:enemy.y};
    host.items=host.items||[];host.items.push({id:`v133-starter-firearm-${String(run.seed||"run")}-${Date.now()}`,x:cell.x,y:cell.y,kind:"weapon",active:true,title:"FIRST ENCOUNTER FIREARM",starterFirearm:true});
    run._v133StarterFirearmReleased=true;host.revision=(host.revision||0)+1;
    try{showToast("FIRST ENCOUNTER REWARD","A firearm has dropped beside the first defeated enemy. Pick it up to unlock ranged combat; your sword remains the automatic fallback at zero ammo.","gold",9500);broadcastWorld?.();sync?.()}catch(_){}
    return true;
  }

  function relocateOverlap(entity){
    if(!entity||!playerOccupies(entity.x,entity.y))return false;
    const cell=safeAdjacent(entity.x,entity.y,entity);if(!cell)return false;
    entity.x=cell.x;entity.y=cell.y;entity.rx=cell.x;entity.ry=cell.y;return true;
  }

  function enforceOccupancy(){
    if(!host||mode!=="playing"||net?.isHost===false)return false;
    let changed=false;for(const enemy of host.enemies||[])if(enemy?.alive)changed=relocateOverlap(enemy)||changed;
    if(host.stalker?.awake&&!host.stalker?.permanentlyBanished)changed=relocateOverlap(host.stalker)||changed;
    if(changed)host.revision=(host.revision||0)+1;return changed;
  }

  if(typeof damageEnemy==="function"){
    const original=damageEnemy;
    damageEnemy=function damageEnemyV133StarterFirearm(enemy,power,element="energy",attacker=p1){const alive=Boolean(enemy?.alive),result=original.apply(this,arguments);if(alive&&enemy&&!enemy.alive)try{releaseStarterFirearm(enemy)}catch(error){console.warn("[Lost Sizzler] starter firearm release failed",error)}return result};
  }
  if(typeof startWorld==="function"){
    const original=startWorld;
    startWorld=function startWorldV133MutationReset(seed,split=false,preserve=false,checkpointRestore=false){if(run&&!checkpointRestore)delete run.rareMutation;return original.apply(this,arguments)};
  }
  if(typeof update==="function"){
    const original=update;
    update=function updateV133Occupancy(dt){const result=original.apply(this,arguments);try{enforceOccupancy()}catch(error){console.warn("[Lost Sizzler] occupancy safeguard failed",error)}return result};
  }

  /* -----------------------------------------------------------------------
   * V10.35 special-mode geometry correction.
   *
   * Horde Survivor now uses one enormous open arena. Spy Vs Spy uses a large
   * 8x5 matrix of smaller rooms with direct door-to-door links and no corridor
   * network. This layer runs after the V10.33 adapter so the ordinary dungeon
   * remains untouched for Solo, Split Screen and Dungeon Multiplayer.
   * --------------------------------------------------------------------- */
  const SPY_COLUMNS=8,SPY_ROWS=5,SPY_ROOM_STEP_X=15,SPY_ROOM_STEP_Y=15,SPY_ROOM_W=13,SPY_ROOM_H=13;
  const spyFurnitureTypes=["desk","bookcase","cupboard","barrel","cabinet","readingDesk"];
  const spyVoiceLines=Object.freeze({
    matchStart:"Spy versus Spy. Five rounds. Find the case, ruin the other agent's day, and get out.",
    round1:"Round one. Try to look innocent.",
    round2:"Round two. Check the furniture. Trust nothing.",
    round3:"Round three. Somebody is getting smug.",
    round4:"Round four. Traps are cheaper than apologies.",
    finalRound:"Final round. No pressure. Apart from all of it.",
    trapArmed:"Trap armed. Nasty.",
    caseFound:"The case is in play.",
    extraction:"Extraction started. Stop them.",
    thirtySeconds:"Thirty seconds. Get moving.",
    suddenDeath:"Sudden death. That has gone well.",
    knockout:"Agent down. Embarrassing.",
    matchWon:"Match over. Somebody owes the other one a pint."
  });
  const specialState={type:"",hordeBuilt:false,spyRound:0,spyMapKey:"",legacyVoiceSuppressed:false,legacyVoiceEnabled:true,spyVoiceEnabled:true,voiceRound:0,voicePhase:"",voiceTrapCount:0,voiceCaseOwners:"",voiceExtraction:false,voiceThirty:false,voiceStatuses:new Map(),voiceMatchDone:false};

  const hash32=value=>{let h=2166136261>>>0;for(const ch of String(value||"")){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0};
  const specialApi=()=>window.CCGLostSizzlerSpecialModes;
  const specialActive=()=>specialApi()?.active||null;
  const actorId=()=>String(net?.sessionId||p1?.id||"P1");
  const roomCentre=room=>({x:Math.floor(room.x+room.w/2),y:Math.floor(room.y+room.h/2)});

  function clearGameplayCollections(){
    try{for(const list of [bullets,enemyBullets,particles,rings,floaters,hazards,levelQueue,toastQueue])if(Array.isArray(list))list.length=0}catch(_){}
    try{for(const collection of [pendingItems,enemyVisuals,cameras,explored,campStates,roomVisits,playerTrails])collection?.clear?.()}catch(_){}
  }

  function resetHostForSpecial(){
    if(!host)return;
    host.enemies=[];host.generators=[];host.guardian=null;host.sigilWarden=null;host.sigilDefenderIds=[];host.traps=[];host.hazardRooms=[];host.arenas=[];host.timedRooms=[];host.deathCaches=[];host.chests=[];host.items=[];host.shops=[];host.blockingDecor=[];host.sanctuaryRegeneration=[];host.enteredRoomIds=[];
    if(host.stalker){host.stalker.awake=false;host.stalker.permanentlyBanished=true}
  }

  function setLocalPosition(cell){
    if(!p1||!cell)return false;
    p1.x=cell.x;p1.y=cell.y;p1.rx=cell.x;p1.ry=cell.y;
    try{resetCamp?.(p1,true);reveal?.(p1);markRoomVisit?.(p1);rememberTrail?.(p1)}catch(_){}
    return true;
  }

  function placeRemoteModels(models,logicalToPhysical){
    try{
      for(const model of models||[]){
        const live=model.id===p1?.id?p1:remote?.get?.(model.id);if(!live)continue;
        const physical=logicalToPhysical.get(model.roomId),room=physical!=null?world.rooms[physical]:null;if(!room)continue;
        const q=roomCentre(room);live.x=q.x;live.y=q.y;live.rx=q.x;live.ry=q.y;
      }
    }catch(_){}
  }

  function buildHordeArena(){
    const active=specialActive();if(!active||active.type!=="horde-survivor"||!world||!host)return false;
    if(specialState.hordeBuilt&&world._v135HordeArena)return true;
    const map=Array.from({length:C.worldHeight},()=>Array(C.worldWidth).fill(1));
    const room={id:0,x:3,y:3,w:C.worldWidth-7,h:C.worldHeight-7,theme:"IRON_KEEP",variant:2,optional:false,sanctuary:false,hordeArena:true};
    for(let y=room.y;y<=room.y+room.h;y++)for(let x=room.x;x<=room.x+room.w;x++)map[y][x]=0;
    const centre=roomCentre(room);
    resetHostForSpecial();
    world.map=map;world.rooms=[room];world.start={...centre};world.startRoomId=0;world.exit={x:1,y:1};world.exitRoomId=-1;world.edges=[];world.decor=[];world.wallLights=[];world.doorFrameCells=[];world.tunnelY=-999;world._v135HordeArena=true;window.__CCG_WORLD=world;
    host.doors=[];host.worldRef=world;host.enteredRoomIds=[0];host.revision=(host.revision||0)+1;
    const edgeLights=[
      {x:room.x+6,y:room.y+3},{x:centre.x,y:room.y+3},{x:room.x+room.w-6,y:room.y+3},
      {x:room.x+6,y:room.y+room.h-3},{x:centre.x,y:room.y+room.h-3},{x:room.x+room.w-6,y:room.y+room.h-3}
    ];
    world.wallLights=edgeLights.map((q,index)=>({...q,id:`horde-light-${index}`,roomId:0,radius:5}));
    const entries=active.state?.players||net?.getMembers?.()||[];
    const index=Math.max(0,entries.findIndex(entry=>String(entry.id)===actorId()));
    const spawns=[{x:centre.x-3,y:centre.y},{x:centre.x+3,y:centre.y},{x:centre.x,y:centre.y-3},{x:centre.x,y:centre.y+3}];
    setLocalPosition(spawns[index%spawns.length]);clearGameplayCollections();
    try{cameras?.clear?.();explored?.clear?.();reveal?.(p1);sync?.()}catch(_){}
    specialState.hordeBuilt=true;specialState.spyRound=0;specialState.spyMapKey="";
    return true;
  }

  function arenaPerimeterCell(enemy){
    const room=world?.rooms?.[0];if(!room)return null;
    const seed=hash32(`${specialActive()?.seed||run?.seed||"HORDE"}|${enemy?.id||Date.now()}`),side=seed%4;
    const minX=room.x+2,maxX=room.x+room.w-2,minY=room.y+2,maxY=room.y+room.h-2;
    for(let attempt=0;attempt<24;attempt++){
      const n=hash32(`${seed}|${attempt}`),x=minX+(n%Math.max(1,maxX-minX+1)),y=minY+((n>>>8)%Math.max(1,maxY-minY+1));
      const q=side===0?{x:minX,y}:side===1?{x:maxX,y}:side===2?{x,y:minY}:{x,y:maxY};
      if(!W.walkable(world.map,q.x,q.y,host)||playerOccupies(q.x,q.y)||enemyOccupies(q.x,q.y,enemy))continue;
      return q;
    }
    return{x:minX,y:minY};
  }

  function steerHordeEnemies(){
    const active=specialActive();if(!active||active.type!=="horde-survivor"||!world?._v135HordeArena)return false;
    const players=livingPlayers();if(!players.length)return false;
    for(const enemy of host?.enemies||[]){
      if(!enemy?.alive||!enemy.hordeEnemy)continue;
      if(!enemy._v135ArenaSpawned){const q=arenaPerimeterCell(enemy);if(q){enemy.x=q.x;enemy.y=q.y;enemy._v135ArenaSpawned=true}}
      const target=[...players].sort((a,b)=>Math.hypot(enemy.x-a.x,enemy.y-a.y)-Math.hypot(enemy.x-b.x,enemy.y-b.y))[0];
      if(!target)continue;
      enemy.aiState="chase";enemy.lastSeen={x:target.x,y:target.y};enemy.memoryMs=999999;enemy.searchMs=0;enemy.facing={x:Math.sign(target.x-enemy.x)||enemy.facing?.x||1,y:Math.sign(target.y-enemy.y)||0};
    }
    return true;
  }

  function spyEdges(rooms){
    const byCell=new Map(rooms.map(room=>[`${room.gridX},${room.gridY}`,room])),edges=[],seen=new Set();
    const add=(a,b)=>{if(!a||!b)return;const k=[a.id,b.id].sort().join("|");if(seen.has(k))return;seen.add(k);edges.push({id:`spy-door-${edges.length+1}`,a:a.id,b:b.id,trappedBy:null})};
    for(let row=0;row<SPY_ROWS;row++)for(let col=0;col<SPY_COLUMNS-1;col++)add(byCell.get(`${col},${row}`),byCell.get(`${col+1},${row}`));
    for(let row=0;row<SPY_ROWS-1;row++){
      const endCol=row%2===0?SPY_COLUMNS-1:0;add(byCell.get(`${endCol},${row}`),byCell.get(`${endCol},${row+1}`));
      for(let col=1;col<SPY_COLUMNS-1;col++)if(hash32(`SPY-CROSSLINK|${row}|${col}`)%4===0)add(byCell.get(`${col},${row}`),byCell.get(`${col},${row+1}`));
    }
    return edges;
  }

  function makeSpyModeMap(match){
    const oldMap=match?.map;if(!oldMap||oldMap.largeRoomGridV135)return oldMap;
    const oldContents=[];
    for(const room of oldMap.rooms||[])for(const furniture of room.furniture||[])if(furniture.contents)oldContents.push(furniture.contents);
    for(const required of ["case","joystick","tape","key"])if(!oldContents.includes(required))oldContents.push(required);
    const rooms=[];
    for(let row=0;row<SPY_ROWS;row++)for(let col=0;col<SPY_COLUMNS;col++){
      const id=`spy-room-${row*SPY_COLUMNS+col+1}`,furniture=[];
      for(let n=0;n<3;n++)furniture.push({id:`${id}-f${n+1}`,type:spyFurnitureTypes[(hash32(`${match.seed}|${match.round}|${id}|${n}`))%spyFurnitureTypes.length],searched:false,trappedBy:null,contents:null});
      rooms.push({id,gridX:col,gridY:row,x:col*12+2,y:row*11+2,w:10,h:9,furniture,extraction:false,spawn:null});
    }
    const edges=spyEdges(rooms),spawnA=rooms[0],spawnB=rooms[rooms.length-1],centreCandidates=rooms.filter(room=>room.gridY===Math.floor(SPY_ROWS/2)&&[3,4].includes(room.gridX)),extraction=centreCandidates[hash32(`${match.seed}|${match.round}|EXTRACT`)%centreCandidates.length]||rooms[Math.floor(rooms.length/2)];
    spawnA.spawn=1;spawnB.spawn=2;extraction.extraction=true;
    const eligible=rooms.filter(room=>!room.spawn&&!room.extraction).flatMap(room=>room.furniture.map(item=>({room,item}))).sort((a,b)=>hash32(`${match.seed}|${match.round}|${a.item.id}`)-hash32(`${match.seed}|${match.round}|${b.item.id}`));
    oldContents.forEach((content,index)=>{if(eligible[index])eligible[index].item.contents=content});
    const modeMap={seed:match.seed,roundNumber:match.round,width:SPY_COLUMNS*12+4,height:SPY_ROWS*11+4,rooms,edges,spawnRoomIds:[spawnA.id,spawnB.id],extractionRoomId:extraction.id,noMinimap:true,largeRoomGridV135:true,directDoorRooms:true};
    match.map=modeMap;
    for(const [index,player] of (match.players||[]).entries()){player.roomId=modeMap.spawnRoomIds[index]||modeMap.spawnRoomIds[0];player.status="active";player.hp=player.maxHp;player.respawnAt=0}
    match.traps=[];match.looseObjects=[];match.extraction=null;
    return modeMap;
  }

  function directDoorCell(a,b){
    if(a.gridY===b.gridY){
      const left=a.gridX<b.gridX?a:b,right=left===a?b:a,pa=world.rooms[left.dungeonRoomId],pb=world.rooms[right.dungeonRoomId];
      return{x:pa.x+pa.w+1,y:pa.y+2+(hash32(`${left.id}|${right.id}`)%Math.max(1,pa.h-3)),orientation:"vertical"};
    }
    const top=a.gridY<b.gridY?a:b,bottom=top===a?b:a,pa=world.rooms[top.dungeonRoomId],pb=world.rooms[bottom.dungeonRoomId];
    return{x:pa.x+2+(hash32(`${top.id}|${bottom.id}`)%Math.max(1,pa.w-3)),y:pa.y+pa.h+1,orientation:"horizontal"};
  }

  function decorateSpyRoom(logical,physical,reserved){
    const decor=[];
    const candidates=[
      {x:physical.x+3,y:physical.y+3},{x:physical.x+physical.w-3,y:physical.y+3},
      {x:physical.x+3,y:physical.y+physical.h-3},{x:physical.x+physical.w-3,y:physical.y+physical.h-3},
      {x:physical.x+Math.floor(physical.w/2),y:physical.y+3},{x:physical.x+3,y:physical.y+Math.floor(physical.h/2)}
    ];
    for(const [index,furniture] of (logical.furniture||[]).entries()){
      const q=candidates.find(cell=>!reserved.has(`${cell.x},${cell.y}`)&&!decor.some(item=>item.x===cell.x&&item.y===cell.y));if(!q)continue;
      const id=`spy-physical-${furniture.id}`,type=furniture.type||spyFurnitureTypes[index%spyFurnitureTypes.length];
      decor.push({id,x:q.x,y:q.y,type,blocking:true,structural:false,variant:index%5,spyFurniture:true,logicalFurnitureId:furniture.id});
    }
    return decor;
  }

  function buildSpyPhysical(match){
    if(!match?.map||!world||!host)return false;
    const mapKey=`${match.seed}|${match.round}|${match.map.rooms?.length||0}`;
    if(specialState.spyMapKey===mapKey&&world._v135SpyDoorMap)return true;
    const modeMap=match.map.largeRoomGridV135?match.map:makeSpyModeMap(match);if(!modeMap)return false;
    const grid=Array.from({length:C.worldHeight},()=>Array(C.worldWidth).fill(1)),physicalRooms=[];
    for(const logical of modeMap.rooms){
      const physical={id:physicalRooms.length,x:4+logical.gridX*SPY_ROOM_STEP_X,y:4+logical.gridY*SPY_ROOM_STEP_Y,w:SPY_ROOM_W,h:SPY_ROOM_H,theme:C.roomThemes[hash32(`${match.seed}|${match.round}|${logical.id}|theme`)%C.roomThemes.length],variant:hash32(`${logical.id}|variant`)%7,optional:false,sanctuary:false,spyRoom:true,logicalRoomId:logical.id,gridX:logical.gridX,gridY:logical.gridY};
      logical.dungeonRoomId=physical.id;physicalRooms.push(physical);
      for(let y=physical.y;y<=physical.y+physical.h;y++)for(let x=physical.x;x<=physical.x+physical.w;x++)if(grid[y]?.[x]!=null)grid[y][x]=0;
    }
    world.map=grid;world.rooms=physicalRooms;world.edges=[];world.decor=[];world.wallLights=[];world.doorFrameCells=[];world.tunnelY=-999;world._v135SpyDoorMap=true;window.__CCG_WORLD=world;
    resetHostForSpecial();host.worldRef=world;host.doors=[];
    const logicalById=new Map(modeMap.rooms.map(room=>[room.id,room]));
    for(const edge of modeMap.edges){
      const a=logicalById.get(edge.a),b=logicalById.get(edge.b);if(!a||!b)continue;
      const q=directDoorCell(a,b);if(!q||!grid[q.y]?.[q.x])grid[q.y][q.x]=0;
      host.doors.push({id:edge.id,groupId:edge.id,x:q.x,y:q.y,type:"room",orientation:q.orientation,locked:false,open:false,opening:false,openingStart:0,openAt:0,openSoundDone:false,spyDoor:true});
      world.edges.push({a:a.dungeonRoomId,b:b.dungeonRoomId,path:[{x:q.x,y:q.y}],doorId:edge.id});
    }
    const reserved=new Set(host.doors.map(door=>`${door.x},${door.y}`));
    for(const logical of modeMap.rooms){
      const physical=physicalRooms[logical.dungeonRoomId],centre=roomCentre(physical);reserved.add(`${centre.x},${centre.y}`);
      const roomDecor=decorateSpyRoom(logical,physical,reserved);world.decor.push(...roomDecor);for(const d of roomDecor)host.blockingDecor.push({...d,hp:3,maxHp:3});
      if(logical.gridX%4===0&&logical.gridY%2===0)world.wallLights.push({id:`spy-light-${logical.id}`,x:physical.x+Math.floor(physical.w/2),y:physical.y+1,roomId:physical.id,radius:3});
    }
    const spawnLogical=logicalById.get(modeMap.spawnRoomIds[0]),extractLogical=logicalById.get(modeMap.extractionRoomId);
    world.startRoomId=spawnLogical?.dungeonRoomId??0;world.start=roomCentre(physicalRooms[world.startRoomId]);world.exit={x:1,y:1};world.exitRoomId=-1;
    const logicalToPhysical=new Map(modeMap.rooms.map(room=>[room.id,room.dungeonRoomId]));
    const localModel=(match.players||[]).find(player=>String(player.id)===actorId())||match.players?.[0],localRoom=localModel?physicalRooms[logicalToPhysical.get(localModel.roomId)]:null;
    if(localRoom)setLocalPosition(roomCentre(localRoom));placeRemoteModels(match.players,logicalToPhysical);
    host.enteredRoomIds=[...new Set((match.players||[]).map(player=>logicalToPhysical.get(player.roomId)).filter(Number.isFinite))];host.revision=(host.revision||0)+1;
    clearGameplayCollections();try{cameras?.clear?.();explored?.clear?.();reveal?.(p1);markRoomVisit?.(p1);sync?.()}catch(_){}
    specialState.spyMapKey=mapKey;specialState.spyRound=Number(match.round||0);specialState.hordeBuilt=false;
    return true;
  }

  function suppressLegacySpyVoice(){
    const voice=window.CCGLostSizzlerVoice;if(!voice||specialState.legacyVoiceSuppressed)return;
    specialState.legacyVoiceEnabled=Boolean(voice.enabled);specialState.spyVoiceEnabled=specialState.legacyVoiceEnabled;voice.stop?.();
    try{voice.state.enabled=false}catch(_){}
    specialState.legacyVoiceSuppressed=true;
  }

  function restoreLegacyVoice(){
    if(!specialState.legacyVoiceSuppressed)return;
    const voice=window.CCGLostSizzlerVoice;try{if(voice?.state)voice.state.enabled=specialState.legacyVoiceEnabled}catch(_){}
    specialState.legacyVoiceSuppressed=false;specialState.spyVoiceEnabled=true;cancelSpyVoice();
  }

  function cancelSpyVoice(){try{window.speechSynthesis?.cancel?.()}catch(_){}
  }

  function chooseSpyVoice(){
    const voices=window.speechSynthesis?.getVoices?.()||[];
    return voices.find(voice=>/^en-GB$/i.test(voice.lang)&&/Daniel|Ryan|George|Arthur|Oliver|Serena|Sonia|Libby/i.test(voice.name))||voices.find(voice=>/^en-GB/i.test(voice.lang))||voices.find(voice=>/^en/i.test(voice.lang))||voices[0]||null;
  }

  function spySpeak(id){
    const text=spyVoiceLines[id];if(!text||!specialState.spyVoiceEnabled||document.body?.dataset?.specialMode!=="sizzler-saboteurs")return false;
    try{if(typeof S?.isEnabled==="function"&&!S.isEnabled())return false;if(!window.speechSynthesis||typeof SpeechSynthesisUtterance==="undefined")return false;const utterance=new SpeechSynthesisUtterance(text);utterance.lang="en-GB";utterance.rate=1;utterance.pitch=.88;utterance.volume=.72;const voice=chooseSpyVoice();if(voice)utterance.voice=voice;window.speechSynthesis.cancel();window.speechSynthesis.speak(utterance);return true}catch(_){return false}
  }

  function resetSpyVoiceState(match=null){
    specialState.voiceRound=Number(match?.round||0);specialState.voicePhase=String(match?.state||"");specialState.voiceTrapCount=Number(match?.traps?.length||0);specialState.voiceCaseOwners=(match?.players||[]).filter(player=>player.hasCase).map(player=>player.id).sort().join("|");specialState.voiceExtraction=Boolean(match?.extraction);specialState.voiceThirty=false;specialState.voiceStatuses=new Map((match?.players||[]).map(player=>[player.id,player.status]));specialState.voiceMatchDone=match?.state==="match-complete";
  }

  function updateSpyVoice(match){
    if(!match)return;
    const round=Number(match.round||0),phase=String(match.state||"");
    if(round&&round!==specialState.voiceRound){specialState.voiceRound=round;specialState.voiceThirty=false;specialState.voiceTrapCount=Number(match.traps?.length||0);specialState.voiceCaseOwners="";specialState.voiceExtraction=false;spySpeak(round>=5?"finalRound":`round${round}`)}
    const trapCount=Number(match.traps?.length||0);if(trapCount>specialState.voiceTrapCount)spySpeak("trapArmed");specialState.voiceTrapCount=trapCount;
    const caseOwners=(match.players||[]).filter(player=>player.hasCase).map(player=>player.id).sort().join("|");if(caseOwners&&caseOwners!==specialState.voiceCaseOwners)spySpeak("caseFound");specialState.voiceCaseOwners=caseOwners;
    const extracting=Boolean(match.extraction);if(extracting&&!specialState.voiceExtraction)spySpeak("extraction");specialState.voiceExtraction=extracting;
    const remaining=Number(match.roundEndsAt||0)-Date.now();if(["playing","sudden-death"].includes(phase)&&remaining>0&&remaining<=30000&&!specialState.voiceThirty){specialState.voiceThirty=true;spySpeak("thirtySeconds")}
    if(phase==="sudden-death"&&specialState.voicePhase!=="sudden-death")spySpeak("suddenDeath");
    for(const player of match.players||[]){const before=specialState.voiceStatuses.get(player.id);if(before==="active"&&player.status!=="active")spySpeak("knockout");specialState.voiceStatuses.set(player.id,player.status)}
    if(phase==="match-complete"&&!specialState.voiceMatchDone){specialState.voiceMatchDone=true;spySpeak("matchWon")}
    specialState.voicePhase=phase;
  }

  function ensureSpecialModeGeometry(){
    const active=specialActive();
    if(!active){if(specialState.legacyVoiceSuppressed)restoreLegacyVoice();specialState.type="";specialState.hordeBuilt=false;specialState.spyRound=0;specialState.spyMapKey="";return}
    if(active.type!==specialState.type){specialState.type=active.type;specialState.hordeBuilt=false;specialState.spyRound=0;specialState.spyMapKey=""}
    if(active.type==="horde-survivor"){buildHordeArena();steerHordeEnemies();return}
    if(active.type!=="sizzler-saboteurs")return;
    suppressLegacySpyVoice();
    if(active.authoritative&&active.state?.map&&!active.state.map.largeRoomGridV135)makeSpyModeMap(active.state);
    if(active.state?.map){if(Number(active.state.round||0)!==specialState.spyRound||!world?._v135SpyDoorMap)buildSpyPhysical(active.state);updateSpyVoice(active.state)}
  }

  const api=specialApi();
  if(api&&!api.__v135GeometryWrapped){
    const oldStart=api.startOnline?.bind(api),oldStop=api.stop?.bind(api);
    if(oldStart)api.startOnline=function startOnlineV135Geometry(meta={}){
      const result=oldStart(meta);if(!result)return result;
      specialState.type=String(meta.roomMode||specialActive()?.type||"");specialState.hordeBuilt=false;specialState.spyRound=0;specialState.spyMapKey="";
      if(specialState.type==="sizzler-saboteurs"){
        suppressLegacySpyVoice();const active=specialActive();if(active?.authoritative&&active.state?.map)makeSpyModeMap(active.state);if(active?.state?.map)buildSpyPhysical(active.state);resetSpyVoiceState(active?.state);spySpeak("matchStart");setTimeout(()=>{if(specialActive()?.type==="sizzler-saboteurs")spySpeak("round1")},1900);
      }else if(specialState.type==="horde-survivor")buildHordeArena();
      return result;
    };
    if(oldStop)api.stop=function stopV135Geometry(){const result=oldStop.apply(api,arguments);restoreLegacyVoice();specialState.type="";specialState.hordeBuilt=false;specialState.spyRound=0;specialState.spyMapKey="";return result};
    api.__v135GeometryWrapped=true;
  }

  if(typeof update==="function"){
    const originalSpecialPolishUpdate=update;
    update=function updateV135SpecialGeometry(dt){const result=originalSpecialPolishUpdate.apply(this,arguments);try{ensureSpecialModeGeometry()}catch(error){console.warn("[Lost Sizzler V10.35] special-mode geometry pass failed",error)}return result};
  }

  window.CCGLostSizzlerModePolishV133={
    releaseStarterFirearm,enforceOccupancy,playerOccupies,
    buildHordeArena,steerHordeEnemies,makeSpyModeMap,buildSpyPhysical,ensureSpecialModeGeometry,spySpeak,
    get specialState(){return specialState},
    constants:Object.freeze({SPY_COLUMNS,SPY_ROWS,SPY_ROOM_STEP_X,SPY_ROOM_STEP_Y,SPY_ROOM_W,SPY_ROOM_H})
  };
})();
