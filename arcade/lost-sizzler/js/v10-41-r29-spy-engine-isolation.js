/* The Lost Sizzler V10.41 r29 — isolated Spy Vs Spy rules runtime.
 *
 * Spy Vs Spy deliberately stops executing the ordinary Dungeon update while the
 * mode is active.  Rendering is shared, but movement, collision, player damage,
 * interaction prompts, compact room geometry and Spy rule ticks are owned here.
 * This prevents Dungeon hazards/recovery wrappers from leaking into the two-player
 * mode while leaving Solo, Dungeon Multiplayer, Horde and Split Screen unchanged.
 */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V141_R29_SPY_ENGINE_ISOLATION__)return;
  window.__CCG_LOST_SIZZLER_V141_R29_SPY_ENGINE_ISOLATION__=true;

  const MODE_ID="sizzler-saboteurs";
  const ROOM_STEP_X=11,ROOM_STEP_Y=11,ROOM_W=9,ROOM_H=9,MAP_X=6,MAP_Y=6;
  const MOVE_MS=135,DASH_MOVE_MS=82,ATTACK_MS=430,MONITOR_MS=40;
  const MOVE_CODES=new Set(["ArrowLeft","ArrowRight","ArrowUp","ArrowDown","KeyA","KeyD","KeyW","KeyS","ShiftLeft","ShiftRight"]);
  const state={
    isolated:false,timer:0,baseUpdate:null,baseMove:null,baseHurt:null,baseBuildSpyPhysical:null,
    updateReassertions:0,moveReassertions:0,worldBuilds:0,logicalCompactions:0,dungeonDamageBlocked:0,
    furnitureBlocks:0,doorOpens:0,moves:0,attacks:0,trapPulses:0,timeBombsRemoved:0,
    lastMoveAt:0,lastAttackAt:0,lastWorldSignature:"",lastPrompt:"",lastMode:"",trapPulse:false,trapHeld:false,
    statusById:new Map()
  };
  const keys=new Set();

  const specialApi=()=>{try{return window.CCGLostSizzlerSpecialModes||null}catch(_){return null}};
  const special=()=>{try{return specialApi()?.active||null}catch(_){return null}};
  const spyActive=()=>{const active=special();return active?.type===MODE_ID||document.body?.dataset?.specialMode===MODE_ID};
  const SAB=()=>window.CCGLostSizzlerSaboteurs||null;
  const actorId=()=>{try{return String(net?.sessionId||p1?.id||"P1")}catch(_){return"P1"}};
  const nowMs=()=>{try{return Number(performance.now())||Date.now()}catch(_){return Date.now()}};
  const editable=target=>{try{return Boolean(target?.closest?.("input,textarea,select,[contenteditable='true'],[contenteditable='']"))}catch(_){return false}};
  const hash32=value=>{const api=SAB();if(api?.hash32)return api.hash32(value);let h=2166136261>>>0;for(const ch of String(value||"")){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0};
  const modelFor=id=>{try{return special()?.state?.players?.find(row=>String(row?.id||"")===String(id||""))||null}catch(_){return null}};
  const localModel=()=>modelFor(actorId())||special()?.state?.players?.[0]||null;
  const liveFor=id=>{try{return String(p1?.id||"")===String(id||"")?p1:remote?.get?.(id)||null}catch(_){return null}};
  const localLive=()=>{try{return p1||null}catch(_){return null}};
  const worldApi=()=>window.CCGWorld||null;
  const roomCentre=room=>room?{x:Math.floor(Number(room.x)+Number(room.w)/2),y:Math.floor(Number(room.y)+Number(room.h)/2)}:null;

  function ensurePrompt(){
    let node=document.getElementById("spy-context-prompt");if(node)return node;
    const wrap=document.querySelector(".canvas-wrap");if(!wrap)return null;
    node=document.createElement("div");node.id="spy-context-prompt";node.setAttribute("aria-live","polite");node.hidden=true;
    node.style.cssText="position:absolute;left:50%;bottom:16px;transform:translateX(-50%);z-index:120;max-width:min(680px,88%);padding:8px 13px;border:2px solid #6cecff;background:rgba(4,2,10,.94);box-shadow:0 4px 18px rgba(0,0,0,.72);color:#eaffff;font:900 13px/1.25 'Courier New',monospace;letter-spacing:.45px;text-align:center;pointer-events:none";
    wrap.appendChild(node);return node;
  }

  function setPrompt(text=""){
    const node=ensurePrompt();if(!node)return false;const value=String(text||"");
    if(state.lastPrompt===value&&node.hidden===!value)return Boolean(value);
    state.lastPrompt=value;node.textContent=value;node.hidden=!value;return Boolean(value);
  }

  function ensureModeStyles(){
    if(document.getElementById("ccg-spy-runtime-isolation-style"))return;
    const style=document.createElement("style");style.id="ccg-spy-runtime-isolation-style";
    style.textContent=`body[data-spy-runtime-isolated="true"] .canvas-wrap{position:relative!important;contain:layout paint!important;}body[data-spy-runtime-isolated="true"] #radar-canvas{visibility:hidden!important;}body[data-spy-runtime-isolated="true"] .radar-legend{visibility:hidden!important;}body[data-spy-runtime-isolated="true"] .game-message-context,body[data-spy-runtime-isolated="true"] #message,body[data-spy-runtime-isolated="true"] #quest-list{display:none!important;}`;
    document.head.appendChild(style);
  }

  function ensureFourFurniture(room,match){
    room.furniture=Array.isArray(room.furniture)?room.furniture:[];
    while(room.furniture.length<4)room.furniture.push({id:`${room.id}-f${room.furniture.length+1}`,type:"desk",searched:false,trappedBy:null,contents:null});
    room.furniture=room.furniture.slice(0,4);
    room.furniture[0].type="bookcase";room.furniture[1].type="bookcase";
    const third=(hash32(`${match.seed}|${match.round}|${room.id}|BOOKCASE-R29`)%4)===0;
    if(third)room.furniture[2].type="bookcase";
  }

  function safeTrapLoadout(match){
    const api=SAB();if(!match||!api)return false;
    const before=Array.isArray(match.trapLoadout)?[...match.trapLoadout]:[];
    let changed=false;
    const out=[];
    for(const id of before){
      const next=id==="timeBomb"?"snare":id;if(id==="timeBomb"){state.timeBombsRemoved++;changed=true}
      if(next&&!out.includes(next))out.push(next);
    }
    for(const fallback of ["snare","fakeHealth","spring","custard","powerBrick"]){if(out.length>=3)break;if(!out.includes(fallback))out.push(fallback)}
    match.trapLoadout=out.slice(0,3);
    if(Array.isArray(match.traps)){
      const keep=match.traps.filter(trap=>trap?.trapId!=="timeBomb");if(keep.length!==match.traps.length){state.timeBombsRemoved+=match.traps.length-keep.length;changed=true;match.traps=keep}
    }
    return changed;
  }

  function compactLogicalMap(){
    const active=special(),match=active?.state,api=SAB();if(!match?.map||!api)return false;
    if(!active.authoritative&&(!match.map.spyRuntimeIsolatedR29||match.map.rooms?.length>30))return false;
    if(active.authoritative&&(match.map.largeRoomGridV135||Number(match.map.rooms?.length||0)>30)){
      const compact=api.distributeContents(api.createMap(match.seed,Number(match.round)||1),`${match.seed}|ROUND-${Number(match.round)||1}`);
      compact.spyRuntimeIsolatedR29=true;compact.largeRoomGridV135=true;compact.directDoorRooms=true;
      match.map=compact;match.traps=[];match.looseObjects=[];match.extraction=null;
      for(const [index,player] of (match.players||[]).entries()){
        player.roomId=compact.spawnRoomIds[index]||compact.spawnRoomIds[0];player.status="active";player.hp=player.maxHp;player.respawnAt=0;
      }
      state.logicalCompactions++;
    }
    if(!match.map.spyRuntimeIsolatedR29)match.map.spyRuntimeIsolatedR29=true;
    match.map.largeRoomGridV135=true;match.map.directDoorRooms=true;
    for(const room of match.map.rooms||[])ensureFourFurniture(room,match);
    safeTrapLoadout(match);return true;
  }

  function clearArray(name){try{const value=window[name];if(Array.isArray(value))value.length=0}catch(_){}}
  function sanitiseSharedDungeonState(){
    if(!spyActive())return false;
    try{
      if(typeof host!=="undefined"&&host){
        for(const key of ["enemies","generators","traps","hazardRooms","arenas","timedRooms","items","chests","shops","deathCaches","sanctuaryRegeneration"]){if(Array.isArray(host[key]))host[key].length=0;else host[key]=[]}
        host.guardian=null;host.sigilWarden=null;host.sigilDefenderIds=[];
        if(host.stalker){host.stalker.awake=false;host.stalker.permanentlyBanished=true}
      }
    }catch(_){}
    for(const name of ["enemyBullets","bullets","hazards"] )clearArray(name);
    try{campStates?.clear?.()}catch(_){}
    try{if(typeof damageFlash!=="undefined")damageFlash=0}catch(_){}
    return true;
  }

  function physicalRoomForLogical(logicalId){
    try{const logical=special()?.state?.map?.rooms?.find(room=>String(room.id)===String(logicalId));return Number.isFinite(Number(logical?.dungeonRoomId))?world?.rooms?.[Number(logical.dungeonRoomId)]||null:null}catch(_){return null}
  }

  function doorCell(a,b,physicalByLogical){
    const pa=physicalByLogical.get(a.id),pb=physicalByLogical.get(b.id);if(!pa||!pb)return null;
    if(a.gridY===b.gridY){const left=a.gridX<b.gridX?pa:pb,right=left===pa?pb:pa;return{x:left.x+left.w+1,y:Math.max(left.y+2,Math.min(left.y+left.h-2,Math.floor((left.y+right.y+left.h)/2))),orientation:"vertical"}}
    if(a.gridX===b.gridX){const top=a.gridY<b.gridY?pa:pb,bottom=top===pa?pb:pa;return{x:Math.max(top.x+2,Math.min(top.x+top.w-2,Math.floor((top.x+bottom.x+top.w)/2))),y:top.y+top.h+1,orientation:"horizontal"}}
    return null;
  }

  function furnitureCells(physical,doors,logical,match){
    const midX=Math.floor(physical.x+physical.w/2),midY=Math.floor(physical.y+physical.h/2);
    const candidates=[
      {x:physical.x+2,y:physical.y+1},{x:physical.x+physical.w-2,y:physical.y+1},
      {x:physical.x+2,y:physical.y+physical.h-1},{x:physical.x+physical.w-2,y:physical.y+physical.h-1},
      {x:physical.x+1,y:midY},{x:physical.x+physical.w-1,y:midY},
      {x:midX,y:physical.y+1},{x:midX,y:physical.y+physical.h-1}
    ];
    return candidates.filter((cell,index,all)=>all.findIndex(row=>row.x===cell.x&&row.y===cell.y)===index&&Math.abs(cell.x-midX)+Math.abs(cell.y-midY)>=3&&doors.every(door=>Math.abs(door.x-cell.x)+Math.abs(door.y-cell.y)>=3)).sort((a,b)=>hash32(`${match.seed}|${match.round}|${logical.id}|${a.x},${a.y}`)-hash32(`${match.seed}|${match.round}|${logical.id}|${b.x},${b.y}`));
  }

  function buildCompactWorld(force=false){
    if(!spyActive()||typeof world==="undefined"||!world||typeof host==="undefined"||!host)return false;
    const match=special()?.state;if(!match?.map?.rooms?.length)return false;
    if(!compactLogicalMap())return false;
    const ids=(match.map.rooms||[]).map(room=>room.id).join("|");const signature=`${match.seed}|${match.round}|${ids}`;
    if(!force&&world._v141r29SpyIsolated&&world._v141r29SpySignature===signature){state.lastWorldSignature=signature;return true}
    const C=window.CCG_CONFIG||{},worldWidth=Math.max(80,Number(C.worldWidth||128)),worldHeight=Math.max(64,Number(C.worldHeight||84));
    const grid=Array.from({length:worldHeight},()=>Array(worldWidth).fill(1)),physicalRooms=[],physicalByLogical=new Map();
    for(const logical of match.map.rooms){
      const physical={id:physicalRooms.length,x:MAP_X+Number(logical.gridX||0)*ROOM_STEP_X,y:MAP_Y+Number(logical.gridY||0)*ROOM_STEP_Y,w:ROOM_W,h:ROOM_H,theme:C.roomThemes?.[hash32(`${match.seed}|${match.round}|${logical.id}|R29-THEME`)%Math.max(1,C.roomThemes?.length||1)]||"C64_ARCHIVE",variant:hash32(`${logical.id}|R29-VARIANT`)%7,optional:false,sanctuary:false,spyRoom:true,logicalRoomId:logical.id,gridX:logical.gridX,gridY:logical.gridY};
      logical.dungeonRoomId=physical.id;physicalRooms.push(physical);physicalByLogical.set(logical.id,physical);
      for(let y=physical.y;y<=physical.y+physical.h;y++)for(let x=physical.x;x<=physical.x+physical.w;x++)if(grid[y]?.[x]!=null)grid[y][x]=0;
    }
    const logicalById=new Map(match.map.rooms.map(room=>[room.id,room])),doors=[];
    for(const edge of match.map.edges||[]){
      const a=logicalById.get(edge.a),b=logicalById.get(edge.b);if(!a||!b)continue;const q=doorCell(a,b,physicalByLogical);if(!q||grid[q.y]?.[q.x]==null)continue;
      grid[q.y][q.x]=0;doors.push({id:edge.id,groupId:edge.id,x:q.x,y:q.y,type:"room",orientation:q.orientation,locked:false,open:false,opening:false,openingStart:0,openAt:0,openSoundDone:false,spyDoor:true});
    }
    world.map=grid;world.rooms=physicalRooms;world.edges=[];world.decor=[];world.wallLights=[];world.doorFrameCells=[];world.tunnelY=-999;world._v135SpyDoorMap=true;world._v141r29SpyIsolated=true;world._v141r29SpySignature=signature;window.__CCG_WORLD=world;
    host.enemies=[];host.generators=[];host.guardian=null;host.sigilWarden=null;host.sigilDefenderIds=[];host.traps=[];host.hazardRooms=[];host.arenas=[];host.timedRooms=[];host.items=[];host.chests=[];host.shops=[];host.deathCaches=[];host.sanctuaryRegeneration=[];host.blockingDecor=[];host.doors=doors;host.worldRef=world;
    for(const edge of match.map.edges||[]){const a=logicalById.get(edge.a),b=logicalById.get(edge.b),door=doors.find(row=>row.id===edge.id);if(a&&b&&door)world.edges.push({a:a.dungeonRoomId,b:b.dungeonRoomId,path:[{x:door.x,y:door.y}],doorId:door.id})}
    for(const logical of match.map.rooms){
      const physical=physicalByLogical.get(logical.id),roomDoors=doors.filter(door=>Math.abs(door.x-(physical.x-1))<=1||Math.abs(door.x-(physical.x+physical.w+1))<=1||Math.abs(door.y-(physical.y-1))<=1||Math.abs(door.y-(physical.y+physical.h+1))<=1),cells=furnitureCells(physical,roomDoors,logical,match);
      for(const [index,furniture] of (logical.furniture||[]).slice(0,4).entries()){
        const cell=cells[index];if(!cell)continue;const id=`spy-r29-${furniture.id}`,type=furniture.type||"bookcase";
        const decor={id,x:cell.x,y:cell.y,type,blocking:true,structural:true,variant:index%5,spyFurniture:true,spyUnbreakable:true,logicalFurnitureId:furniture.id,hp:999999,maxHp:999999};
        world.decor.push({...decor});host.blockingDecor.push({...decor});
      }
      const centre=roomCentre(physical);world.wallLights.push({id:`spy-r29-light-${logical.id}`,x:centre.x,y:physical.y+1,roomId:physical.id,radius:5,permanent:true,kind:"spy-r29"});
    }
    const spawnLogical=logicalById.get(match.map.spawnRoomIds?.[0]);world.startRoomId=spawnLogical?.dungeonRoomId??0;world.start=roomCentre(physicalRooms[world.startRoomId]);world.exit={x:1,y:1};world.exitRoomId=-1;
    const modelRooms=new Map(match.map.rooms.map(room=>[room.id,physicalByLogical.get(room.id)]));
    for(const model of match.players||[]){
      const live=liveFor(model.id),room=modelRooms.get(model.roomId);if(!live||!room)continue;const cell=roomCentre(room);live.x=cell.x;live.y=cell.y;live.rx=cell.x;live.ry=cell.y;live.health=Math.max(1,Number(model.hp||model.maxHp||1));live.maxHealth=Math.max(1,Number(model.maxHp||live.maxHealth||1));model.x=cell.x;model.y=cell.y;
    }
    host.enteredRoomIds=[...new Set((match.players||[]).map(model=>logicalById.get(model.roomId)?.dungeonRoomId).filter(Number.isFinite))];host.revision=(host.revision||0)+1;
    const polish=window.CCGLostSizzlerModePolishV133?.specialState;if(polish){polish.spyRound=Number(match.round||0);polish.spyMapKey=signature;}
    try{cameras?.clear?.();explored?.clear?.();reveal?.(p1);markRoomVisit?.(p1);rememberTrail?.(p1);sync?.()}catch(_){}
    state.worldBuilds++;state.lastWorldSignature=signature;sanitiseSharedDungeonState();return true;
  }

  function activeOccupant(live){const model=modelFor(live?.id);return Boolean(live&&(!model||model.status==="active")&&Number(model?.hp??live.health??1)>0)}
  function occupiedByOther(player,x,y){
    try{return (typeof allPlayers==="function"?allPlayers():[p1,...(remote?.values?.()||[])]).some(other=>other&&other!==player&&activeOccupant(other)&&Number(other.x)===x&&Number(other.y)===y)}catch(_){return false}
  }
  function furnitureAt(x,y){try{return (host?.blockingDecor||[]).find(item=>item?.spyFurniture&&Number(item.x)===x&&Number(item.y)===y)||null}catch(_){return null}}

  function openSpyDoor(x,y){
    try{const door=worldApi()?.doorAt?.(host,x,y);if(!door?.spyDoor)return false;if(!door.open||door.locked||door.opening){door.locked=false;door.open=true;door.opening=false;door.openingStart=0;door.openAt=0;door.openSoundDone=true;host.revision=(host.revision||0)+1;state.doorOpens++;}return true}catch(_){return false}
  }

  function attemptMove(player,dx,dy,dash=false){
    if(!spyActive()||!player)return false;const model=modelFor(player.id);if(model&&model.status!=="active")return false;
    const sx=Math.sign(Number(dx)||0),sy=Math.sign(Number(dy)||0);if(!sx&&!sy)return false;
    const steps=dash?2:1;let moved=false;
    for(let n=0;n<steps;n++){
      const x=Number(player.x),y=Number(player.y),nx=x+sx,ny=y+sy;
      if(sx&&sy){
        if(furnitureAt(x+sx,y)||furnitureAt(x,y+sy)){state.furnitureBlocks++;break}
        if(!worldApi()?.walkable?.(world.map,x+sx,y,host)||!worldApi()?.walkable?.(world.map,x,y+sy,host))break;
      }
      if(furnitureAt(nx,ny)){state.furnitureBlocks++;break}
      openSpyDoor(nx,ny);
      if(!worldApi()?.walkable?.(world.map,nx,ny,host)||occupiedByOther(player,nx,ny))break;
      player.x=nx;player.y=ny;player.rx=nx;player.ry=ny;player.dir={x:sx,y:sy};moved=true;state.moves++;
      if(model){
        model.x=nx;model.y=ny;const rid=worldApi()?.roomAt?.(world,nx,ny),logical=special()?.state?.map?.rooms?.find(room=>Number(room.dungeonRoomId)===Number(rid));
        if(logical&&String(model.roomId)!==String(logical.id)){model.roomId=logical.id;model.roomEnteredAt=Date.now()}
      }
      try{reveal?.(player);markRoomVisit?.(player);rememberTrail?.(player)}catch(_){}
    }
    if(moved)try{sync?.()}catch(_){};return moved;
  }

  function currentDirection(){
    const held=code=>keys.has(code),dx=+(held("ArrowRight")||held("KeyD"))-(+(held("ArrowLeft")||held("KeyA"))),dy=+(held("ArrowDown")||held("KeyS"))-(+(held("ArrowUp")||held("KeyW")));
    return{dx,dy,dash:held("ShiftLeft")||held("ShiftRight")};
  }

  function processMovement(){
    const player=localLive(),direction=currentDirection();if(!player||(!direction.dx&&!direction.dy))return false;
    const t=nowMs(),cadence=direction.dash?DASH_MOVE_MS:MOVE_MS;if(t-state.lastMoveAt<cadence)return false;state.lastMoveAt=t;
    return attemptMove(player,direction.dx,direction.dy,direction.dash);
  }

  function processAttack(){
    if(!keys.has("Space"))return false;const t=nowMs();if(t-state.lastAttackAt<ATTACK_MS)return false;state.lastAttackAt=t;
    const active=special(),match=active?.state,attacker=localModel(),live=localLive(),api=SAB();if(!match||!attacker||!live||attacker.status!=="active"||!api)return false;
    const candidates=(match.players||[]).filter(model=>model.id!==attacker.id&&model.status==="active").map(model=>({model,live:liveFor(model.id)})).filter(row=>row.live&&String(row.model.roomId)===String(attacker.roomId));
    candidates.sort((a,b)=>(Math.abs(a.live.x-live.x)+Math.abs(a.live.y-live.y))-(Math.abs(b.live.x-live.x)+Math.abs(b.live.y-live.y)));
    const target=candidates[0],distance=target?Math.abs(target.live.x-live.x)+Math.abs(target.live.y-live.y):Infinity;if(!target||distance>2)return false;
    if(active.authoritative){api.useWeapon(match,attacker.id,target.model.id,Date.now());target.live.health=Math.max(1,Number(target.model.hp||1));target.live.hpBarMs=2400;}
    else try{net?.send?.("v133_special_hit",{roomMode:MODE_ID,attackerId:attacker.id,targetId:target.model.id}).catch?.(()=>{})}catch(_){}
    try{S?.sfx?.("hit");floatText?.(target.live.x,target.live.y,"SPY HIT",P?.red||"#ff6868")}catch(_){}
    state.attacks++;return true;
  }

  function syncLocalStatus(){
    const match=special()?.state;if(!match)return;
    for(const model of match.players||[]){
      const id=String(model.id||""),before=state.statusById.get(id),live=liveFor(id);state.statusById.set(id,String(model.status||""));if(!live)continue;
      live.maxHealth=Math.max(1,Number(model.maxHp||live.maxHealth||1));
      if(model.status==="active")live.health=Math.max(1,Number(model.hp||1));else live.health=1;
      if(before==="knocked-out"&&model.status==="active"){
        const room=physicalRoomForLogical(model.roomId),cell=roomCentre(room);if(cell){live.x=cell.x;live.y=cell.y;live.rx=cell.x;live.ry=cell.y;try{sync?.()}catch(_){}}
      }
    }
    try{window.CCGLostSizzlerV141SpyMovementFinalizer?.syncRespawns?.()}catch(_){}
  }

  function updatePrompt(){
    const live=localLive(),model=localModel(),match=special()?.state;if(!live||!model||model.status!=="active"||!match)return setPrompt("");
    const near=(host?.blockingDecor||[]).filter(item=>item?.spyFurniture&&Math.abs(Number(item.x)-live.x)+Math.abs(Number(item.y)-live.y)<=1).sort((a,b)=>(Math.abs(a.x-live.x)+Math.abs(a.y-live.y))-(Math.abs(b.x-live.x)+Math.abs(b.y-live.y)))[0];
    if(near){
      const room=match.map?.rooms?.find(row=>String(row.id)===String(model.roomId)),logical=room?.furniture?.find(item=>String(item.id)===String(near.logicalFurnitureId));
      const label=String(near.type||logical?.type||"FURNITURE").replace(/([a-z])([A-Z])/g,"$1 $2").replace(/_/g," ").toUpperCase();
      return setPrompt(logical?.searched?`${label} — ALREADY SEARCHED`:`E — SEARCH ${label}`);
    }
    const room=match.map?.rooms?.find(row=>String(row.id)===String(model.roomId)),complete=Boolean(model.hasCase&&["joystick","tape","key"].every(id=>model.objectives?.includes?.(id)));
    if(room?.extraction&&complete)return setPrompt("X — EXTRACT COMPLETE SIZZLER CASE");
    return setPrompt("");
  }

  function callSpyRules(){
    const api=specialApi(),match=special()?.state,sab=SAB();if(!api?.updateForTest||!match||!sab)return false;
    safeTrapLoadout(match);
    const original=[...(match.trapLoadout||[])];
    if(!state.trapPulse)match.trapLoadout=original.filter(id=>!sab.TRAPS?.[id]?.locations?.includes?.("floor"));
    try{api.updateForTest()}finally{match.trapLoadout=original;state.trapPulse=false}
    return true;
  }

  function isolatedUpdate(){
    if(!spyActive())return false;
    compactLogicalMap();buildCompactWorld();sanitiseSharedDungeonState();processMovement();processAttack();callSpyRules();syncLocalStatus();updatePrompt();return true;
  }

  function spyUpdateOwner(){if(spyActive())return isolatedUpdate();return typeof state.baseUpdate==="function"?state.baseUpdate.apply(this,arguments):undefined}
  spyUpdateOwner.__ccgV141R29SpyRuntimeOwner=true;

  function spyMoveOwner(player,dx,dy,dash=false){if(spyActive())return attemptMove(player,dx,dy,dash);return typeof state.baseMove==="function"?state.baseMove.apply(this,arguments):false}
  spyMoveOwner.__ccgV141R29SpyOwner=true;spyMoveOwner.__ccgV141R27SpyDoorIsolation=true;spyMoveOwner.__ccgV141SpyIsolated=true;

  function spyHurtOwner(player,amount,friendly=false,source="enemy"){
    if(spyActive()){state.dungeonDamageBlocked++;return false}
    return typeof state.baseHurt==="function"?state.baseHurt.apply(this,arguments):false;
  }
  spyHurtOwner.__ccgV141R29HordeFriendly=true;spyHurtOwner.__ccgV141SpyDamageBoundary=true;

  function suppressLegacyPhysicalBuilder(){
    const polish=window.CCGLostSizzlerModePolishV133;if(!polish||typeof polish.buildSpyPhysical!=="function")return false;
    if(polish.buildSpyPhysical.__ccgV141R29SpyRuntimeNoop)return true;
    state.baseBuildSpyPhysical=polish.buildSpyPhysical;
    const noop=function buildSpyPhysicalV141R29Isolated(){return spyActive()?true:state.baseBuildSpyPhysical?.apply(this,arguments)};noop.__ccgV141R29SpyRuntimeNoop=true;polish.buildSpyPhysical=noop;return true;
  }

  function restoreLegacyPhysicalBuilder(){
    const polish=window.CCGLostSizzlerModePolishV133;if(polish&&state.baseBuildSpyPhysical&&polish.buildSpyPhysical?.__ccgV141R29SpyRuntimeNoop)polish.buildSpyPhysical=state.baseBuildSpyPhysical;
    state.baseBuildSpyPhysical=null;
  }

  function enterIsolation(){
    if(state.isolated||!spyActive())return state.isolated;
    ensureModeStyles();state.baseUpdate=window.update;state.baseMove=window.movePlayer;state.baseHurt=window.hurtPlayer;
    window.update=spyUpdateOwner;window.movePlayer=spyMoveOwner;window.hurtPlayer=spyHurtOwner;suppressLegacyPhysicalBuilder();
    document.body.dataset.spyRuntimeIsolated="true";state.isolated=true;state.lastMode=MODE_ID;state.lastMoveAt=0;state.lastAttackAt=0;state.statusById.clear();
    compactLogicalMap();buildCompactWorld(true);sanitiseSharedDungeonState();updatePrompt();return true;
  }

  function leaveIsolation(){
    if(!state.isolated)return false;
    if(window.update===spyUpdateOwner&&typeof state.baseUpdate==="function")window.update=state.baseUpdate;
    if(window.movePlayer===spyMoveOwner&&typeof state.baseMove==="function")window.movePlayer=state.baseMove;
    if(window.hurtPlayer===spyHurtOwner&&typeof state.baseHurt==="function")window.hurtPlayer=state.baseHurt;
    restoreLegacyPhysicalBuilder();delete document.body.dataset.spyRuntimeIsolated;setPrompt("");keys.clear();state.trapPulse=false;state.trapHeld=false;state.statusById.clear();state.isolated=false;state.baseUpdate=state.baseMove=state.baseHurt=null;state.lastWorldSignature="";return true;
  }

  function monitor(){
    if(spyActive()){
      if(!state.isolated)enterIsolation();
      if(state.isolated&&window.update!==spyUpdateOwner){window.update=spyUpdateOwner;state.updateReassertions++}
      if(state.isolated&&window.movePlayer!==spyMoveOwner){window.movePlayer=spyMoveOwner;state.moveReassertions++}
      if(state.isolated&&window.hurtPlayer!==spyHurtOwner)window.hurtPlayer=spyHurtOwner;
      suppressLegacyPhysicalBuilder();return;
    }
    if(state.isolated)leaveIsolation();
  }

  function onKeyDown(event){
    if(!spyActive()||editable(event?.target))return;const code=String(event.code||"");
    if(MOVE_CODES.has(code)){keys.add(code);event.preventDefault?.();}
    if(code==="Space"){keys.add(code);event.preventDefault?.();}
    if(code==="KeyT"){
      if(!event.repeat&&!state.trapHeld){state.trapHeld=true;state.trapPulse=true;state.trapPulses++}
    }
  }
  function onKeyUp(event){const code=String(event.code||"");keys.delete(code);if(code==="KeyT")state.trapHeld=false}
  function clearKeys(){keys.clear();state.trapHeld=false;state.trapPulse=false}

  addEventListener("keydown",onKeyDown,true);addEventListener("keyup",onKeyUp,true);addEventListener("blur",clearKeys,true);
  state.timer=setInterval(monitor,MONITOR_MS);monitor();
  addEventListener("pagehide",()=>{if(state.timer)clearInterval(state.timer);leaveIsolation()},{once:true});

  const runtimeRegistry=window.CCGLostSizzlerModeRuntime||{runtimes:{}};runtimeRegistry.runtimes=runtimeRegistry.runtimes||{};
  runtimeRegistry.runtimes[MODE_ID]={id:MODE_ID,isolatedRules:true,sharedRenderer:true,update:isolatedUpdate,buildWorld:buildCompactWorld};
  runtimeRegistry.current=()=>spyActive()?MODE_ID:String(document.body?.dataset?.specialMode||"dungeon");
  window.CCGLostSizzlerModeRuntime=runtimeRegistry;
  window.CCGLostSizzlerV141R29SpyEngine={enterIsolation,leaveIsolation,isolatedUpdate,attemptMove,buildCompactWorld,compactLogicalMap,sanitiseSharedDungeonState,updatePrompt,get state(){return state}};
})();