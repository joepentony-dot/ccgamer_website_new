/* The Lost Sizzler V10.41 r32 — Spy overhaul world-owner seal.
 *
 * Retained r29 callers are still allowed to ask the exported Spy engine to
 * build its physical world. This lightweight bridge is safe to preload because
 * it owns no packet callback and never owns window.update. If the full r32
 * overhaul is not loaded yet, it can still build the same deterministic 7x7
 * Spy world so furniture identity and placement cannot change on the next frame.
 */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V141_R32_SPY_WORLD_OWNER__)return;
  window.__CCG_LOST_SIZZLER_V141_R32_SPY_WORLD_OWNER__=true;

  const MODE_ID="sizzler-saboteurs",MONITOR_MS=20;
  const MOVE_CODES=new Set(["ArrowLeft","ArrowRight","ArrowUp","ArrowDown","KeyA","KeyD","KeyW","KeyS"]);
  const ROOM_W=7,ROOM_H=7,ROOM_STEP_X=9,ROOM_STEP_Y=9,MAP_X=5,MAP_Y=5;
  const ROOM_ARCHETYPES=Object.freeze([
    Object.freeze({name:"ARCHIVE STACKS",theme:"ZZAP_LIBRARY",types:["bookcase","bookcase","bookcase","table","table","cabinet","bookcase"]}),
    Object.freeze({name:"READING ROOM",theme:"C64_ARCHIVE",types:["table","table","bookcase","bookcase","desk","cabinet","bookcase"]}),
    Object.freeze({name:"TAPE RECORDS",theme:"TAPE_STORE",types:["bookcase","tapeStack","table","cabinet","desk","bookcase","tapeStack"]}),
    Object.freeze({name:"DISK WORKSHOP",theme:"1541_WORKSHOP",types:["table","driveBench","rack","bookcase","table","desk","bookcase"]}),
    Object.freeze({name:"SIGNAL OFFICE",theme:"MODEM_EXCHANGE",types:["desk","table","rack","bookcase","table","cabinet","bookcase"]}),
    Object.freeze({name:"TROPHY ROOM",theme:"WARP_GALLERY",types:["table","bookcase","cabinet","bookcase","table","painting","bookcase"]}),
    Object.freeze({name:"ARMOURY RECORDS",theme:"ARMOURY",types:["rack","bookcase","table","table","cabinet","desk","bookcase"]}),
    Object.freeze({name:"SID LAB",theme:"SID_REACTOR",types:["driveBench","table","rack","bookcase","bookcase","desk","table"]})
  ]);
  const state={timer:0,installed:false,baseBuild:null,engine:null,reassertions:0,controllerReassertions:0,delegations:0,fallbacks:0,fallbackR32Builds:0,mirroredMoves:0,inputBaselines:0,lastX:null,lastY:null,lastMode:false,lastFallbackKey:""};

  const spyActive=()=>{try{return window.CCGLostSizzlerSpecialModes?.active?.type===MODE_ID||document.body?.dataset?.specialMode===MODE_ID}catch(_){return false}};
  const activeMatch=()=>{try{return window.CCGLostSizzlerSpecialModes?.active?.state||null}catch(_){return null}};
  const engine=()=>{try{return window.CCGLostSizzlerV141R29SpyEngine||null}catch(_){return null}};
  const overhaul=()=>{try{return window.CCGLostSizzlerV141R32SpyOverhaul||null}catch(_){return null}};
  const SAB=()=>{try{return window.CCGLostSizzlerSaboteurs||null}catch(_){return null}};
  const hash32=value=>{const api=SAB();if(api?.hash32)return api.hash32(value);let h=2166136261>>>0;for(const ch of String(value||"")){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0};
  const liveFor=id=>{try{return String(p1?.id||"")===String(id||"")?p1:remote?.get?.(id)||null}catch(_){return null}};
  const centre=room=>({x:Math.floor(room.x+room.w/2),y:Math.floor(room.y+room.h/2)});

  function archetypeFor(room,m){return ROOM_ARCHETYPES[hash32(`${m?.seed}|${m?.round}|${room?.id}|R32-ROOM`)%ROOM_ARCHETYPES.length]}
  function ensureLogicalFurniture(m){
    if(!m?.map?.rooms)return false;let changed=false;
    for(const room of m.map.rooms){
      const archetype=archetypeFor(room,m);room.spyArchetype=archetype.name;room.spyTheme=archetype.theme;room.furniture=Array.isArray(room.furniture)?room.furniture:[];
      while(room.furniture.length<7){room.furniture.push({id:`${room.id}-r32-f${room.furniture.length+1}`,type:"table",searched:false,trappedBy:null,contents:null});changed=true}
      room.furniture=room.furniture.slice(0,8);
      for(const [index,item] of room.furniture.entries()){
        const next=archetype.types[index%archetype.types.length];if(item.type!==next){item.type=next;changed=true}
        item.spySearchLabel=next==="driveBench"?"WORKBENCH":next==="tapeStack"?"TAPE SHELF":String(next).replace(/([a-z])([A-Z])/g,"$1 $2").toUpperCase()
      }
    }
    const desired=SAB()?.trapLoadout?.(m.seed,Number(m.round)||1);if(Array.isArray(desired)&&desired.length){const old=(m.trapLoadout||[]).join("|"),next=desired.join("|");if(old!==next){m.trapLoadout=[...desired];changed=true}}
    m.map.spyRuntimeR32=true;return changed
  }
  function furnitureCells(room){
    const cx=Math.floor(room.x+room.w/2),cy=Math.floor(room.y+room.h/2);return[
      {x:room.x+1,y:room.y+1},{x:room.x+room.w-1,y:room.y+1},{x:room.x+1,y:room.y+room.h-1},{x:room.x+room.w-1,y:room.y+room.h-1},
      {x:room.x+1,y:cy},{x:room.x+room.w-1,y:cy},{x:cx,y:room.y+1},{x:cx,y:room.y+room.h-1}
    ]
  }
  function doorCell(a,b,physicalByLogical){
    const pa=physicalByLogical.get(a.id),pb=physicalByLogical.get(b.id);if(!pa||!pb)return null;
    if(Number(a.gridY)===Number(b.gridY)){const left=Number(a.gridX)<Number(b.gridX)?pa:pb;return{x:left.x+left.w+1,y:Math.floor(left.y+left.h/2),orientation:"vertical"}}
    if(Number(a.gridX)===Number(b.gridX)){const top=Number(a.gridY)<Number(b.gridY)?pa:pb;return{x:Math.floor(top.x+top.w/2),y:top.y+top.h+1,orientation:"horizontal"}}
    return null
  }

  function buildFallbackR32World(force=false){
    if(!spyActive())return false;let w=null,h=null;try{w=world;h=host}catch(_){return false}if(!w||!h)return false;
    const m=activeMatch();if(!m?.map?.rooms?.length)return false;ensureLogicalFurniture(m);
    const key=`${m.seed}|${m.round}|${m.map.rooms.map(r=>r.id).join(",")}|R32`;
    if(!force&&state.lastFallbackKey===key&&w._v141r32SpyOverhaul)return true;
    const C=window.CCG_CONFIG||{},width=Math.max(72,Number(C.worldWidth||128)),height=Math.max(60,Number(C.worldHeight||84));
    const grid=Array.from({length:height},()=>Array(width).fill(1)),physical=[],physicalByLogical=new Map();
    for(const logical of m.map.rooms){
      const room={id:physical.length,x:MAP_X+Number(logical.gridX||0)*ROOM_STEP_X,y:MAP_Y+Number(logical.gridY||0)*ROOM_STEP_Y,w:ROOM_W,h:ROOM_H,theme:logical.spyTheme||"ZZAP_LIBRARY",variant:hash32(`${m.seed}|${m.round}|${logical.id}|VARIANT`)%7,optional:false,sanctuary:false,spyRoom:true,logicalRoomId:logical.id,spyArchetype:logical.spyArchetype||"ARCHIVE ROOM",gridX:logical.gridX,gridY:logical.gridY};
      logical.dungeonRoomId=room.id;physical.push(room);physicalByLogical.set(logical.id,room);for(let y=room.y;y<=room.y+room.h;y++)for(let x=room.x;x<=room.x+room.w;x++)if(grid[y]?.[x]!=null)grid[y][x]=0
    }
    const byId=new Map(m.map.rooms.map(r=>[r.id,r])),doors=[];
    for(const edge of m.map.edges||[]){const a=byId.get(edge.a),b=byId.get(edge.b),cell=a&&b?doorCell(a,b,physicalByLogical):null;if(!cell||grid[cell.y]?.[cell.x]==null)continue;grid[cell.y][cell.x]=0;doors.push({id:edge.id,groupId:edge.id,x:cell.x,y:cell.y,type:"room",orientation:cell.orientation,locked:false,open:false,opening:false,openingStart:0,openAt:0,openSoundDone:false,spyDoor:true,spyR32Door:true})}
    const decor=[];
    for(const logical of m.map.rooms){const room=physicalByLogical.get(logical.id),cells=furnitureCells(room);for(const [index,item] of (logical.furniture||[]).entries()){const cell=cells[index%cells.length];if(!cell)continue;decor.push({id:`spy-r32-${item.id}`,x:cell.x,y:cell.y,type:item.type||"bookcase",variant:hash32(`${item.id}|DECOR`)%7,blocking:true,structural:true,spyUnbreakable:true,spyFurniture:true,spyR32Furniture:true,logicalFurnitureId:item.id,logicalRoomId:logical.id,label:item.spySearchLabel||String(item.type||"FURNITURE").toUpperCase(),hp:999999,maxHp:999999})}}
    w.map=grid;w.rooms=physical;w.edges=[];w.decor=decor;w.wallLights=[];w.doorFrameCells=[];w.tunnelY=-999;w._v135SpyDoorMap=true;w._v141r29SpyIsolated=true;w._v141r32SpyOverhaul=true;w._v141r32SpySignature=key;window.__CCG_WORLD=w;
    const firstModel=m.players?.[0],firstRoom=physicalByLogical.get(firstModel?.roomId)||physical[0];w.start=firstRoom?centre(firstRoom):{x:MAP_X+3,y:MAP_Y+3};w.startRoomId=Number(firstRoom?.id||0);w.exitRoomId=-1;
    for(const edge of m.map.edges||[]){const a=byId.get(edge.a),b=byId.get(edge.b),door=doors.find(row=>String(row.id)===String(edge.id));if(a&&b&&door)w.edges.push({a:a.dungeonRoomId,b:b.dungeonRoomId,path:[{x:door.x,y:door.y}],doorId:door.id})}
    h.enemies=[];h.generators=[];h.guardian=null;h.sigilWarden=null;h.sigilDefenderIds=[];h.traps=[];h.hazardRooms=[];h.arenas=[];h.timedRooms=[];h.items=[];h.chests=[];h.shops=[];h.deathCaches=[];h.sanctuaryRegeneration=[];h.doors=doors;h.blockingDecor=decor;h.enteredRoomIds=[w.startRoomId];h.worldRef=w;
    for(const model of m.players||[]){const live=liveFor(model.id),room=physicalByLogical.get(model.roomId)||physicalByLogical.get(m.map.spawnRoomIds?.[Math.max(0,Number(model.slot||1)-1)]);if(!live||!room)continue;const q=centre(room);live.x=live.rx=q.x;live.y=live.ry=q.y;model.x=q.x;model.y=q.y}
    try{cameras?.clear?.();explored?.clear?.();for(const player of [p1,...(remote?.values?.()||[])].filter(Boolean)){reveal?.(player);markRoomVisit?.(player);rememberTrail?.(player)}}catch(_){}
    h.revision=(h.revision||0)+1;state.lastFallbackKey=key;state.fallbackR32Builds++;return true
  }

  function worldOwner(force=false){
    if(spyActive()){
      const next=overhaul();if(typeof next?.buildOverhaulWorld==="function"){state.delegations++;return next.buildOverhaulWorld(Boolean(force))}
      if(buildFallbackR32World(Boolean(force))){state.delegations++;return true}
    }
    state.fallbacks++;return typeof state.baseBuild==="function"?state.baseBuild.apply(this,arguments):false
  }
  worldOwner.__ccgV141R32SpyWorldOwner=true;

  function install(){
    const current=engine();if(!current||typeof current.buildCompactWorld!=="function")return false;
    if(state.engine!==current){state.engine=current;state.baseBuild=null;state.lastX=state.lastY=null}
    if(current.buildCompactWorld!==worldOwner){if(!state.baseBuild||!spyActive())state.baseBuild=current.buildCompactWorld;current.buildCompactWorld=worldOwner;state.reassertions++}
    const runtime=window.CCGLostSizzlerModeRuntime,registered=runtime?.runtimes?.[MODE_ID],next=overhaul();
    if(registered&&registered.buildWorld!==worldOwner)registered.buildWorld=worldOwner;
    if(registered&&typeof next?.overhaulUpdate==="function"&&registered.update!==next.overhaulUpdate){registered.update=next.overhaulUpdate;state.controllerReassertions++}
    state.installed=true;return true
  }

  function r32ControllerOwnsMovement(){
    const registered=window.CCGLostSizzlerModeRuntime?.runtimes?.[MODE_ID],next=overhaul();
    return Boolean(registered&&typeof next?.overhaulUpdate==="function"&&(registered.update===next.overhaulUpdate||registered.update?.__ccgV141R32SpyOverhaul))
  }

  function movementInputHeld(){
    if(!spyActive())return false;
    try{for(const code of MOVE_CODES)if(input?.has?.(code))return true}catch(_){}
    return false
  }

  function primeMovementBaseline(event){
    if(!spyActive()||!MOVE_CODES.has(String(event?.code||"")))return false;let live=null;try{live=p1||null}catch(_){}if(!live)return false;
    const x=Number(live.x),y=Number(live.y);if(!Number.isFinite(x)||!Number.isFinite(y))return false;
    state.lastX=x;state.lastY=y;state.lastMode=true;state.inputBaselines++;return true
  }

  function mirrorLegacyMoveCounter(){
    const current=engine();if(!current?.state)return false;let live=null;try{live=p1||null}catch(_){}if(!spyActive()||!live){state.lastX=state.lastY=null;state.lastMode=false;return false}
    const x=Number(live.x),y=Number(live.y);if(!Number.isFinite(x)||!Number.isFinite(y))return false;
    if(!state.lastMode||state.lastX==null||state.lastY==null){state.lastX=x;state.lastY=y;state.lastMode=true;return false}
    const distance=Math.abs(x-state.lastX)+Math.abs(y-state.lastY);state.lastX=x;state.lastY=y;
    if(distance<=0||!r32ControllerOwnsMovement()||!movementInputHeld())return false;
    const steps=Math.max(1,Math.round(distance));current.state.moves=Number(current.state.moves||0)+steps;state.mirroredMoves+=steps;return true
  }

  function monitor(){install();mirrorLegacyMoveCounter()}
  addEventListener("keydown",primeMovementBaseline,true);
  monitor();state.timer=setInterval(()=>{try{monitor()}catch(error){console.warn("[Lost Sizzler r32] Spy world-owner monitor failed safely",error)}},MONITOR_MS);
  addEventListener("pagehide",()=>{if(state.timer)clearInterval(state.timer);state.timer=0},{once:true});

  window.CCGLostSizzlerV141R32SpyWorldOwner={worldOwner,install,buildFallbackR32World,ensureLogicalFurniture,r32ControllerOwnsMovement,movementInputHeld,primeMovementBaseline,mirrorLegacyMoveCounter,get state(){return state}};
})();