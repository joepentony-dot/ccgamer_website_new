/* The Lost Sizzler V10.41 r32 — Spy Vs Spy overhaul.
 *
 * Final Spy-only owner for room geometry, door lifecycle, contextual traps,
 * item inventory, searching/objective feedback and reliable two-player combat.
 * This layer does not acquire shared window.update ownership.
 */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V141_R32_SPY_OVERHAUL__)return;
  window.__CCG_LOST_SIZZLER_V141_R32_SPY_OVERHAUL__=true;

  const MODE_ID="sizzler-saboteurs";
  const ACTION_PACKET="v141_r32_spy_action";
  const RESULT_PACKET="v141_r32_spy_result";
  const LEGACY_HIT_PACKET="v133_special_hit";
  const ROOM_W=7,ROOM_H=7,ROOM_STEP_X=9,ROOM_STEP_Y=9,MAP_X=5,MAP_Y=5;
  const MOVE_MS=220,SLOW_MOVE_MS=350,DASH_MOVE_MS=105,ATTACK_MS=430,SEARCH_MS=680,DOOR_MS=360,MONITOR_MS=50;
  const MOVE_CODES=new Set(["ArrowLeft","ArrowRight","ArrowUp","ArrowDown","KeyA","KeyD","KeyW","KeyS","ShiftLeft","ShiftRight"]);
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

  const state={
    installed:false,timer:0,lastMode:"",worldKey:"",round:0,selectedTrapIndex:0,
    inventoryOpen:false,search:null,lastMoveAt:0,lastAttackAt:0,lastTrapAt:0,
    packetBase:null,packetInstalled:false,engineBaseUpdate:null,engineBaseEnter:null,
    enginePatched:false,worldBuilds:0,roomUpgrades:0,searches:0,objectives:0,
    trapsPlaced:0,trapsTriggered:0,trapsDisarmed:0,attacks:0,doorAnimations:0,
    resultsSent:0,actionsSent:0,lastRoomByPlayer:new Map(),lastTrapArmed:new Map()
  };
  const keys=new Set();

  const specialApi=()=>{try{return window.CCGLostSizzlerSpecialModes||null}catch(_){return null}};
  const active=()=>{try{return specialApi()?.active||null}catch(_){return null}};
  const match=()=>active()?.state||null;
  const SAB=()=>window.CCGLostSizzlerSaboteurs||null;
  const spyActive=()=>active()?.type===MODE_ID||document.body?.dataset?.specialMode===MODE_ID;
  const actorId=()=>{try{return String(net?.sessionId||p1?.id||"P1")}catch(_){return"P1"}};
  const liveFor=id=>{try{return String(p1?.id||"")===String(id||"")?p1:remote?.get?.(id)||null}catch(_){return null}};
  const localLive=()=>{try{return p1||null}catch(_){return null}};
  const modelFor=id=>match()?.players?.find?.(row=>String(row?.id||"")===String(id||""))||null;
  const localModel=()=>modelFor(actorId())||match()?.players?.[0]||null;
  const nowPerf=()=>{try{return Number(performance.now())||Date.now()}catch(_){return Date.now()}};
  const hash32=value=>{const api=SAB();if(api?.hash32)return api.hash32(value);let h=2166136261>>>0;for(const ch of String(value||"")){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0};
  const editable=target=>{try{return Boolean(target?.closest?.("input,textarea,select,[contenteditable='true'],[contenteditable='']"))}catch(_){return false}};
  const roomFor=id=>match()?.map?.rooms?.find?.(row=>String(row?.id||"")===String(id||""))||null;
  const physicalRoomFor=id=>{const logical=roomFor(id);return Number.isFinite(Number(logical?.dungeonRoomId))?world?.rooms?.[Number(logical.dungeonRoomId)]||null:null};
  const objectiveName=id=>SAB()?.OBJECTIVES?.find?.(row=>row.id===id)?.name||String(id||"Objective");
  const trapName=id=>SAB()?.TRAPS?.[id]?.name||String(id||"Trap");
  const connected=()=>{try{return playMode==="online"&&Boolean(net?.connected)}catch(_){return false}};
  const authoritative=()=>Boolean(active()?.authoritative);

  function sfx(name){try{S?.sfx?.(name)}catch(_){}
  }
  function floatAt(x,y,text,colour){try{floatText?.(x,y,text,colour||P?.cyan||"#6cecff")}catch(_){}
  }

  function ensureStyles(){
    if(document.getElementById("ccg-v141-r32-spy-style"))return true;
    const style=document.createElement("style");style.id="ccg-v141-r32-spy-style";
    style.textContent=`
      #spy-r32-inventory{display:none;position:fixed;inset:0;z-index:2147482000;background:rgba(3,2,8,.86);backdrop-filter:blur(3px);padding:clamp(18px,4vw,54px);box-sizing:border-box;overflow:auto}
      body[data-special-mode="sizzler-saboteurs"][data-spy-r32-inventory="true"] #spy-r32-inventory{display:grid;place-items:center}
      #spy-r32-inventory .spy-r32-panel{width:min(920px,96vw);max-height:90vh;overflow:auto;border:2px solid #b978ff;background:linear-gradient(145deg,#150b20,#070a12);box-shadow:0 18px 70px rgba(0,0,0,.8);padding:18px;box-sizing:border-box;color:#efe8f6;font:800 12px/1.35 "Courier New",monospace}
      #spy-r32-inventory h2{margin:0 0 5px;color:#ffd85a;font:900 22px/1.1 "Courier New",monospace}
      #spy-r32-inventory .spy-r32-sub{color:#9cefff;margin-bottom:14px}
      #spy-r32-inventory .spy-r32-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
      #spy-r32-inventory section{border:1px solid rgba(185,120,255,.38);background:rgba(255,255,255,.025);padding:12px}
      #spy-r32-inventory h3{margin:0 0 9px;color:#b978ff;font-size:13px}
      #spy-r32-inventory .spy-r32-objectives,#spy-r32-inventory .spy-r32-traps{display:grid;gap:6px}
      #spy-r32-inventory .spy-r32-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:7px 8px;border:1px solid rgba(255,255,255,.1);background:rgba(0,0,0,.18)}
      #spy-r32-inventory .spy-r32-row[data-held="true"]{border-color:rgba(114,255,155,.55);color:#72ff9b}
      #spy-r32-inventory button{font:900 11px/1.2 "Courier New",monospace;border:1px solid #6cecff;background:#07131b;color:#eaffff;padding:7px 9px;cursor:pointer}
      #spy-r32-inventory button[data-selected="true"]{border-color:#ffd85a;color:#ffd85a;box-shadow:0 0 0 1px rgba(255,216,90,.25) inset}
      #spy-r32-inventory .spy-r32-footer{margin-top:12px;color:#cfc5da}
      #spy-r32-objective-toast{display:none;position:absolute;left:50%;top:18%;transform:translateX(-50%);z-index:190;min-width:min(480px,82%);max-width:86%;padding:10px 15px;border:2px solid #72ff9b;background:rgba(5,12,10,.95);box-shadow:0 5px 22px rgba(0,0,0,.72);color:#eaffef;font:900 13px/1.25 "Courier New",monospace;text-align:center;pointer-events:none}
      body[data-special-mode="sizzler-saboteurs"] #spy-r32-objective-toast[data-visible="true"]{display:block}
      #spy-r32-room-label{display:none;position:absolute;left:16px;top:96px;z-index:125;padding:6px 9px;border:1px solid rgba(108,236,255,.55);background:rgba(3,7,12,.86);color:#9cefff;font:900 10px/1.2 "Courier New",monospace;pointer-events:none}
      body[data-special-mode="sizzler-saboteurs"] #spy-r32-room-label{display:block}
      #spy-r32-effect{display:none;position:absolute;inset:0;z-index:124;pointer-events:none}
      #spy-r32-effect[data-visible="true"]{display:block;box-shadow:inset 0 0 80px rgba(255,216,90,.42)}
      @media(max-width:760px){#spy-r32-inventory .spy-r32-grid{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);return true
  }

  function ensureUi(){
    ensureStyles();
    if(!document.getElementById("spy-r32-inventory")){
      const node=document.createElement("div");node.id="spy-r32-inventory";node.setAttribute("role","dialog");node.setAttribute("aria-modal","true");node.setAttribute("aria-label","Spy item inventory");
      node.innerHTML='<div class="spy-r32-panel"><h2>SPY ITEM INVENTORY</h2><div class="spy-r32-sub">TAB closes · 1/2/3 selects a trap · T places the selected trap</div><div class="spy-r32-grid"><section><h3>OBJECTIVE CASE</h3><div class="spy-r32-objectives"></div></section><section><h3>TRAP KIT</h3><div class="spy-r32-traps"></div></section><section><h3>FIELD KIT</h3><div class="spy-r32-field"></div></section><section><h3>CONTROLS</h3><div>E search · Space attack · T place trap · X extract · TAB inventory</div></section></div><div class="spy-r32-footer">Search furniture for the four objective items, weapons and trap counters. Reach extraction with the complete case.</div></div>';
      document.body.appendChild(node);
      node.addEventListener("click",event=>{const button=event.target?.closest?.("[data-spy-trap-index]");if(!button)return;selectTrap(Number(button.dataset.spyTrapIndex)||0)})
    }
    const wrap=document.querySelector(".canvas-wrap");
    if(wrap&&!document.getElementById("spy-r32-objective-toast")){const n=document.createElement("div");n.id="spy-r32-objective-toast";n.dataset.visible="false";n.setAttribute("role","status");n.setAttribute("aria-live","polite");wrap.appendChild(n)}
    if(wrap&&!document.getElementById("spy-r32-room-label")){const n=document.createElement("div");n.id="spy-r32-room-label";wrap.appendChild(n)}
    if(wrap&&!document.getElementById("spy-r32-effect")){const n=document.createElement("div");n.id="spy-r32-effect";n.dataset.visible="false";wrap.appendChild(n)}
    return true
  }

  let toastTimer=0,effectTimer=0;
  function toast(text,tone="green",duration=2200){
    ensureUi();const node=document.getElementById("spy-r32-objective-toast");if(!node)return false;
    node.textContent=String(text||"");node.dataset.visible="true";node.style.borderColor=tone==="red"?"#ff6868":tone==="gold"?"#ffd85a":tone==="cyan"?"#6cecff":"#72ff9b";
    clearTimeout(toastTimer);toastTimer=setTimeout(()=>{node.dataset.visible="false"},duration);return true
  }
  function flashEffect(duration=700){
    const node=document.getElementById("spy-r32-effect");if(!node)return;node.dataset.visible="true";clearTimeout(effectTimer);effectTimer=setTimeout(()=>{node.dataset.visible="false"},duration)
  }

  function selectedTrapId(){
    const ids=match()?.trapLoadout||[];if(!ids.length)return"";state.selectedTrapIndex=Math.max(0,Math.min(ids.length-1,state.selectedTrapIndex));return String(ids[state.selectedTrapIndex]||"")
  }
  function selectTrap(index){
    const ids=match()?.trapLoadout||[];if(!ids.length)return false;state.selectedTrapIndex=Math.max(0,Math.min(ids.length-1,Number(index)||0));renderInventory();toast(`TRAP SELECTED · ${trapName(selectedTrapId()).toUpperCase()}`,"cyan",1200);return true
  }
  function objectiveHeld(player,id){if(!player)return false;if(id==="case")return Boolean(player.hasCase);return Boolean(player.objectives?.includes?.(id)||(player.looseItem===id))}
  function renderInventory(){
    ensureUi();const panel=document.getElementById("spy-r32-inventory"),m=match(),player=localModel();if(!panel||!m||!player)return false;
    const objectives=panel.querySelector(".spy-r32-objectives"),traps=panel.querySelector(".spy-r32-traps"),field=panel.querySelector(".spy-r32-field");
    if(objectives)objectives.innerHTML=(SAB()?.OBJECTIVES||[]).map(item=>`<div class="spy-r32-row" data-held="${objectiveHeld(player,item.id)}"><span>${item.name}</span><b>${objectiveHeld(player,item.id)?"SECURED":"MISSING"}</b></div>`).join("");
    if(traps)traps.innerHTML=(m.trapLoadout||[]).map((id,index)=>`<div class="spy-r32-row"><span>${index+1}. ${trapName(id)}</span><button type="button" data-spy-trap-index="${index}" data-selected="${index===state.selectedTrapIndex}">${index===state.selectedTrapIndex?"SELECTED":"SELECT"}</button></div>`).join("")+`<div class="spy-r32-row"><span>Trap charges</span><b>${Math.max(0,Number(player.trapCharges||0))}</b></div>`;
    const weapon=player.weapon?.name||"Rolled-Up Rulebook",counter=SAB()?.COUNTERS?.[player.counter]?.name||"None";
    if(field)field.innerHTML=`<div class="spy-r32-row"><span>Weapon</span><b>${weapon}</b></div><div class="spy-r32-row"><span>Trap counter</span><b>${counter}</b></div>`;
    return true
  }
  function setInventory(open){
    if(!spyActive())open=false;state.inventoryOpen=Boolean(open);document.body?.setAttribute?.("data-spy-r32-inventory",String(state.inventoryOpen));
    if(state.inventoryOpen){keys.clear();renderInventory()}return state.inventoryOpen
  }

  function archetypeFor(room,m){
    const index=hash32(`${m?.seed}|${m?.round}|${room?.id}|R32-ROOM`)%ROOM_ARCHETYPES.length;return ROOM_ARCHETYPES[index]
  }
  function ensureLogicalFurniture(m){
    if(!m?.map?.rooms)return false;let changed=false;
    for(const room of m.map.rooms){
      const archetype=archetypeFor(room,m);room.spyArchetype=archetype.name;room.spyTheme=archetype.theme;
      room.furniture=Array.isArray(room.furniture)?room.furniture:[];
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
  function doorCell(a,b,physicalByLogical){
    const pa=physicalByLogical.get(a.id),pb=physicalByLogical.get(b.id);if(!pa||!pb)return null;
    if(Number(a.gridY)===Number(b.gridY)){const left=Number(a.gridX)<Number(b.gridX)?pa:pb;return{x:left.x+left.w+1,y:Math.floor(left.y+left.h/2),orientation:"vertical"}}
    if(Number(a.gridX)===Number(b.gridX)){const top=Number(a.gridY)<Number(b.gridY)?pa:pb;return{x:Math.floor(top.x+top.w/2),y:top.y+top.h+1,orientation:"horizontal"}}
    return null
  }
  function furnitureCells(room){
    const cx=Math.floor(room.x+room.w/2),cy=Math.floor(room.y+room.h/2);
    return[
      {x:room.x+1,y:room.y+1},{x:room.x+room.w-1,y:room.y+1},
      {x:room.x+1,y:room.y+room.h-1},{x:room.x+room.w-1,y:room.y+room.h-1},
      {x:room.x+1,y:cy},{x:room.x+room.w-1,y:cy},
      {x:cx,y:room.y+1},{x:cx,y:room.y+room.h-1}
    ]
  }
  function centre(room){return{x:Math.floor(room.x+room.w/2),y:Math.floor(room.y+room.h/2)}}

  function buildOverhaulWorld(force=false){
    if(!spyActive()||typeof world==="undefined"||!world||typeof host==="undefined"||!host)return false;
    const m=match();if(!m?.map?.rooms?.length)return false;ensureLogicalFurniture(m);
    const key=`${m.seed}|${m.round}|${m.map.rooms.map(r=>r.id).join(",")}|R32`;
    if(!force&&state.worldKey===key&&world._v141r32SpyOverhaul)return true;
    const C=window.CCG_CONFIG||{},width=Math.max(72,Number(C.worldWidth||128)),height=Math.max(60,Number(C.worldHeight||84));
    const grid=Array.from({length:height},()=>Array(width).fill(1)),physical=[],physicalByLogical=new Map();
    for(const logical of m.map.rooms){
      const room={id:physical.length,x:MAP_X+Number(logical.gridX||0)*ROOM_STEP_X,y:MAP_Y+Number(logical.gridY||0)*ROOM_STEP_Y,w:ROOM_W,h:ROOM_H,theme:logical.spyTheme||"ZZAP_LIBRARY",variant:hash32(`${m.seed}|${m.round}|${logical.id}|VARIANT`)%7,optional:false,sanctuary:false,spyRoom:true,logicalRoomId:logical.id,spyArchetype:logical.spyArchetype||"ARCHIVE ROOM",gridX:logical.gridX,gridY:logical.gridY};
      logical.dungeonRoomId=room.id;physical.push(room);physicalByLogical.set(logical.id,room);
      for(let y=room.y;y<=room.y+room.h;y++)for(let x=room.x;x<=room.x+room.w;x++)if(grid[y]?.[x]!=null)grid[y][x]=0
    }
    const byId=new Map(m.map.rooms.map(r=>[r.id,r])),doors=[];
    for(const edge of m.map.edges||[]){
      const a=byId.get(edge.a),b=byId.get(edge.b),cell=a&&b?doorCell(a,b,physicalByLogical):null;if(!cell||grid[cell.y]?.[cell.x]==null)continue;
      grid[cell.y][cell.x]=0;doors.push({id:edge.id,groupId:edge.id,x:cell.x,y:cell.y,type:"room",orientation:cell.orientation,locked:false,open:false,opening:false,openingStart:0,openAt:0,openSoundDone:false,spyDoor:true,spyR32Door:true})
    }
    const decor=[];
    for(const logical of m.map.rooms){
      const room=physicalByLogical.get(logical.id),cells=furnitureCells(room);
      for(const [index,item] of (logical.furniture||[]).entries()){
        const cell=cells[index%cells.length];if(!cell)continue;
        decor.push({id:`spy-r32-${item.id}`,x:cell.x,y:cell.y,type:item.type||"bookcase",variant:hash32(`${item.id}|DECOR`)%7,blocking:true,structural:true,spyUnbreakable:true,spyFurniture:true,spyR32Furniture:true,logicalFurnitureId:item.id,logicalRoomId:logical.id,label:item.spySearchLabel||String(item.type||"FURNITURE").toUpperCase(),hp:999999,maxHp:999999})
      }
    }
    world.map=grid;world.rooms=physical;world.edges=[];world.decor=decor;world.wallLights=[];world.doorFrameCells=[];world.tunnelY=-999;world._v135SpyDoorMap=true;world._v141r29SpyIsolated=true;world._v141r32SpyOverhaul=true;world._v141r32SpySignature=key;window.__CCG_WORLD=world;
    const firstModel=m.players?.[0],firstRoom=physicalByLogical.get(firstModel?.roomId)||physical[0];world.start=firstRoom?centre(firstRoom):{x:MAP_X+3,y:MAP_Y+3};world.startRoomId=Number(firstRoom?.id||0);world.exitRoomId=-1;
    for(const edge of m.map.edges||[]){const a=byId.get(edge.a),b=byId.get(edge.b),door=doors.find(row=>String(row.id)===String(edge.id));if(a&&b&&door)world.edges.push({a:a.dungeonRoomId,b:b.dungeonRoomId,path:[{x:door.x,y:door.y}],doorId:door.id})}
    host.enemies=[];host.generators=[];host.guardian=null;host.sigilWarden=null;host.sigilDefenderIds=[];host.traps=[];host.hazardRooms=[];host.arenas=[];host.timedRooms=[];host.items=[];host.chests=[];host.shops=[];host.deathCaches=[];host.sanctuaryRegeneration=[];host.doors=doors;host.blockingDecor=decor;host.enteredRoomIds=[world.startRoomId];host.worldRef=world;
    for(const model of m.players||[]){
      const live=liveFor(model.id),room=physicalByLogical.get(model.roomId)||physicalByLogical.get(m.map.spawnRoomIds?.[Math.max(0,Number(model.slot||1)-1)]);if(!live||!room)continue;const q=centre(room);live.x=live.rx=q.x;live.y=live.ry=q.y;model.x=q.x;model.y=q.y
    }
    try{cameras?.clear?.();explored?.clear?.();for(const player of [localLive(),...(remote?.values?.()||[])].filter(Boolean)){reveal?.(player);markRoomVisit?.(player);rememberTrail?.(player)}}catch(_){}
    host.revision=(host.revision||0)+1;state.worldKey=key;state.round=Number(m.round)||0;state.worldBuilds++;state.roomUpgrades+=(m.map.rooms||[]).length;return true
  }

  function roomAtPhysical(x,y){
    try{const id=window.CCGWorld?.roomAt?.(world,x,y);return match()?.map?.rooms?.find?.(room=>Number(room.dungeonRoomId)===Number(id))||null}catch(_){return null}
  }
  function occupied(player,x,y){
    try{return [p1,...(remote?.values?.()||[])].filter(Boolean).some(other=>other!==player&&Number(other.x)===Number(x)&&Number(other.y)===Number(y)&&modelFor(other.id)?.status==="active")}catch(_){return false}
  }
  function blockingAt(x,y){try{return (host?.blockingDecor||[]).some(item=>Number(item.x)===Number(x)&&Number(item.y)===Number(y))}catch(_){return false}}
  function doorAt(x,y){try{return (host?.doors||[]).find(door=>door?.spyR32Door&&Number(door.x)===Number(x)&&Number(door.y)===Number(y))||null}catch(_){return null}}
  function startDoor(door){
    if(!door||door.open||door.opening)return false;const t=nowPerf();door.locked=false;door.open=false;door.opening=true;door.openingStart=t;door.openAt=t+DOOR_MS;door.openSoundDone=false;door._v141r32Animating=true;state.doorAnimations++;sfx("open");try{host.revision=(host.revision||0)+1}catch(_){}return true
  }
  function animateDoors(){
    const t=nowPerf();for(const door of host?.doors||[]){if(!door?.spyR32Door||!door.opening)continue;if(t>=Number(door.openAt||0)){door.open=true;door.opening=false;door.openSoundDone=true;door._v141r32Animating=false;try{host.revision=(host.revision||0)+1}catch(_){}}}
  }
  function direction(){
    const held=code=>keys.has(code),dx=+(held("ArrowRight")||held("KeyD"))-+(held("ArrowLeft")||held("KeyA")),dy=+(held("ArrowDown")||held("KeyS"))-+(held("ArrowUp")||held("KeyW"));
    return{dx,dy,dash:held("ShiftLeft")||held("ShiftRight")}
  }
  function slowActive(model){const until=Number(model?.effects?.slow||0);return until>Date.now()}
  function moveLocal(){
    if(state.inventoryOpen||state.search)return false;const player=localLive(),model=localModel();if(!player||!model||model.status!=="active")return false;
    const dir=direction();if(!dir.dx&&!dir.dy)return false;const t=nowPerf(),cadence=slowActive(model)?SLOW_MOVE_MS:dir.dash?DASH_MOVE_MS:MOVE_MS;if(t-state.lastMoveAt<cadence)return false;state.lastMoveAt=t;
    const sx=Math.sign(dir.dx),sy=Math.sign(dir.dy),steps=dir.dash?2:1;let moved=false;
    for(let n=0;n<steps;n++){
      const nx=Number(player.x)+sx,ny=Number(player.y)+sy,door=doorAt(nx,ny);
      if(door&&!door.open){startDoor(door);break}
      if(world?.map?.[ny]?.[nx]!==0||blockingAt(nx,ny)||occupied(player,nx,ny))break;
      const oldRoom=String(model.roomId||"");player.x=player.rx=nx;player.y=player.ry=ny;player.dir={x:sx,y:sy};model.x=nx;model.y=ny;moved=true;
      const logical=roomAtPhysical(nx,ny);if(logical&&String(logical.id)!==oldRoom){
        const m=match(),edge=m?.map?.edges?.find?.(row=>(String(row.a)===oldRoom&&String(row.b)===String(logical.id))||(String(row.b)===oldRoom&&String(row.a)===String(logical.id)));
        model.roomId=logical.id;model.roomEnteredAt=Date.now();m?.events?.push?.({type:"player-moved",playerId:model.id,roomId:logical.id,doorId:edge?.id||null,at:Date.now()});
        if(authoritative()&&edge)triggerTrapForPlayer(model,{type:"door",id:edge.id});
        state.lastRoomByPlayer.set(String(model.id),String(logical.id))
      }
      if(authoritative())checkFloorTrap(model,player);
      try{reveal?.(player);markRoomVisit?.(player);rememberTrail?.(player)}catch(_){}
    }
    if(moved){try{window.CCGLostSizzlerV141R29SpyNetwork?.sendPosition?.(true)}catch(_){};try{sync?.()}catch(_){}}
    return moved
  }

  function nearestFurniture(live=localLive(),model=localModel(),distance=1){
    if(!live||!model)return null;
    const rows=(host?.blockingDecor||[]).filter(item=>item?.spyR32Furniture&&String(item.logicalRoomId)===String(model.roomId)&&Math.abs(Number(item.x)-Number(live.x))+Math.abs(Number(item.y)-Number(live.y))<=distance);
    rows.sort((a,b)=>(Math.abs(a.x-live.x)+Math.abs(a.y-live.y))-(Math.abs(b.x-live.x)+Math.abs(b.y-live.y)));return rows[0]||null
  }
  function nearestDoor(live=localLive(),distance=1){
    if(!live)return null;const rows=(host?.doors||[]).filter(item=>item?.spyR32Door&&Math.abs(Number(item.x)-Number(live.x))+Math.abs(Number(item.y)-Number(live.y))<=distance);rows.sort((a,b)=>(Math.abs(a.x-live.x)+Math.abs(a.y-live.y))-(Math.abs(b.x-live.x)+Math.abs(b.y-live.y)));return rows[0]||null
  }
  function beginSearch(){
    if(state.inventoryOpen||state.search)return false;const target=nearestFurniture();if(!target){const loose=match()?.looseObjects?.find?.(row=>String(row.roomId)===String(localModel()?.roomId));if(loose)return submitAction({type:"collect-loose",looseId:loose.id});toast("MOVE BESIDE A BOOKCASE OR TABLE TO SEARCH","cyan",1700);return false}
    const logical=roomFor(target.logicalRoomId)?.furniture?.find?.(item=>String(item.id)===String(target.logicalFurnitureId));if(logical?.searched){sfx("empty");toast(`${target.label||"FURNITURE"} · ALREADY SEARCHED`,"cyan",1300);return false}
    const t=nowPerf();state.search={targetId:String(target.logicalFurnitureId),targetLabel:String(target.label||"FURNITURE"),startedAt:t,completesAt:t+SEARCH_MS,pulsed:false};sfx("search");try{window.CCGLostSizzlerV141UiSpyPerformance?.beginSearchFeedback?.()}catch(_){};return true
  }
  function updateSearch(){
    const q=state.search;if(!q)return false;const t=nowPerf();if(!q.pulsed&&t-q.startedAt>SEARCH_MS*.48){q.pulsed=true;sfx("search")}if(t<q.completesAt)return false;state.search=null;state.searches++;return submitAction({type:"search",furnitureId:q.targetId})
  }

  function targetForAttack(attackerId=actorId()){
    const m=match(),attacker=modelFor(attackerId),live=liveFor(attackerId);if(!m||!attacker||!live)return null;
    const rows=(m.players||[]).filter(model=>String(model.id)!==String(attacker.id)&&model.status==="active"&&String(model.roomId)===String(attacker.roomId)).map(model=>({model,live:liveFor(model.id)})).filter(row=>row.live);
    rows.sort((a,b)=>Math.hypot(Number(a.live.x)-Number(live.x),Number(a.live.y)-Number(live.y))-Math.hypot(Number(b.live.x)-Number(live.x),Number(b.live.y)-Number(live.y)));const target=rows[0];if(!target)return null;
    return Math.hypot(Number(target.live.x)-Number(live.x),Number(target.live.y)-Number(live.y))<=3.15?target:null
  }
  function attackLocal(){
    if(state.inventoryOpen||state.search||!keys.has("Space"))return false;const t=nowPerf();if(t-state.lastAttackAt<ATTACK_MS)return false;state.lastAttackAt=t;
    const target=targetForAttack();if(!target)return false;return submitAction({type:"attack",targetId:target.model.id})
  }

  function trapContext(trapId,live=localLive(),model=localModel()){
    const def=SAB()?.TRAPS?.[trapId];if(!def||!live||!model)return null;
    const furniture=nearestFurniture(live,model,1),door=nearestDoor(live,1);
    if(def.locations?.includes?.("furniture")&&furniture)return{type:"furniture",id:String(furniture.logicalFurnitureId),roomId:String(model.roomId),x:Number(furniture.x),y:Number(furniture.y),label:String(furniture.label||"FURNITURE")};
    if(def.locations?.includes?.("door")&&door)return{type:"door",id:String(door.id),roomId:String(model.roomId),x:Number(door.x),y:Number(door.y),label:"DOOR"};
    if(def.locations?.includes?.("floor"))return{type:"floor",id:`floor:${Math.round(live.x)},${Math.round(live.y)}`,roomId:String(model.roomId),x:Math.round(live.x),y:Math.round(live.y),label:"FLOOR"};
    return null
  }
  function placeTrapLocal(){
    if(state.inventoryOpen||state.search)return false;const t=nowPerf();if(t-state.lastTrapAt<500)return false;state.lastTrapAt=t;
    const id=selectedTrapId();if(!id){toast("NO TRAP SELECTED","red");return false}const context=trapContext(id);if(!context){toast(`${trapName(id).toUpperCase()} NEEDS ${String((SAB()?.TRAPS?.[id]?.locations||[]).join(" OR ")).toUpperCase()}`,"gold",2100);return false}
    return submitAction({type:"place-trap",trapId:id,target:context})
  }
  function beginExtraction(){if(state.inventoryOpen)return false;return submitAction({type:"extract"})}

  function validateActor(id){if(!id)return false;try{const rows=net?.getMembers?.();return !Array.isArray(rows)||!rows.length||rows.some(row=>String(row?.id||"")===String(id))}catch(_){return true}}
  function physicalNearTarget(actor,target,max=1){
    const live=liveFor(actor);if(!live||!target)return false;return Math.abs(Number(live.x)-Number(target.x))+Math.abs(Number(live.y)-Number(target.y))<=max
  }
  function syncPhysical(id){
    const model=modelFor(id),live=liveFor(id);if(!model||!live)return false;live.maxHealth=Math.max(1,Number(model.maxHp||live.maxHealth||1));live.health=model.status==="active"?Math.max(1,Number(model.hp||1)):1;live.hpBarMs=Math.max(Number(live.hpBarMs||0),1400);return true
  }
  function syncAllPhysical(){for(const model of match()?.players||[])syncPhysical(model.id)}

  function describeSearch(result,actor,furnitureId,beforeTrap){
    if(!result)return{kind:"search",ok:false,text:"SEARCH FAILED"};
    if(result.trapped)return{kind:"trap-triggered",ok:true,trapId:beforeTrap?.trapId||"",text:`TRAP! ${trapName(beforeTrap?.trapId).toUpperCase()}`};
    if(result.objective){const complete=SAB()?.hasCompleteCase?.(modelFor(actor));return{kind:"objective",ok:true,objectiveId:result.objective,complete:Boolean(complete),text:`${objectiveName(result.objective).toUpperCase()} SECURED`}}
    if(result.weapon){return{kind:"weapon",ok:true,text:`WEAPON FOUND · ${String(result.weapon.name||"WEAPON").toUpperCase()}`}}
    if(result.counter){return{kind:"counter",ok:true,text:`COUNTER FOUND · ${String(SAB()?.COUNTERS?.[result.counter]?.name||result.counter).toUpperCase()}`}}
    return{kind:"empty",ok:true,text:"NOTHING USEFUL HERE"}
  }

  function placeTrapAuthoritative(actor,trapId,target){
    const m=match(),player=modelFor(actor),def=SAB()?.TRAPS?.[trapId],room=roomFor(player?.roomId);if(!m||!player||player.status!=="active"||!def||!room||room.spawn||room.extraction)return{kind:"trap",ok:false,text:"TRAP CANNOT BE PLACED HERE"};
    if(!m.trapLoadout?.includes?.(trapId)||Number(player.trapCharges||0)<=0||!def.locations?.includes?.(target?.type))return{kind:"trap",ok:false,text:"TRAP KIT NOT AVAILABLE"};
    if(target.type==="furniture"){const furniture=room.furniture?.find?.(item=>String(item.id)===String(target.id));const physical=(host?.blockingDecor||[]).find(item=>item?.spyR32Furniture&&String(item.logicalFurnitureId)===String(target.id));if(!furniture||!physical||!physicalNearTarget(actor,physical,1))return{kind:"trap",ok:false,text:"MOVE BESIDE THAT FURNITURE"}}
    if(target.type==="door"){const physical=(host?.doors||[]).find(item=>item?.spyR32Door&&String(item.id)===String(target.id));if(!physical||!physicalNearTarget(actor,physical,1))return{kind:"trap",ok:false,text:"MOVE BESIDE THAT DOOR"}}
    if(target.type==="floor"){const live=liveFor(actor);if(!live||Math.abs(Number(live.x)-Number(target.x))+Math.abs(Number(live.y)-Number(target.y))>0.5)return{kind:"trap",ok:false,text:"INVALID FLOOR POSITION"}}
    if(m.traps?.some?.(entry=>entry.armed&&entry.targetType===target.type&&String(entry.targetId||"")===String(target.id||"")))return{kind:"trap",ok:false,text:"THAT TARGET IS ALREADY TRAPPED"};
    if(def.oncePerMatch&&player.timeBombUsed)return{kind:"trap",ok:false,text:"TIME BOMB ALREADY USED"};
    const now=Date.now(),placed={id:`trap-r32-${m.round}-${now}-${m.traps.length+1}`,trapId,ownerId:player.id,roomId:room.id,targetType:target.type,targetId:target.id||null,armed:true,placedAt:now,detonatesAt:def.fuseMs?now+def.fuseMs:0,x:Number(target.x),y:Number(target.y),spyR32Trap:true};
    m.traps.push(placed);player.trapCharges=Math.max(0,Number(player.trapCharges||0)-1);if(def.oncePerMatch)player.timeBombUsed=true;m.events?.push?.({type:"trap-armed",playerId:actor,trap:{...placed},at:now});state.trapsPlaced++;
    return{kind:"trap-placed",ok:true,trapId,text:`TRAP ARMED · ${trapName(trapId).toUpperCase()}`,charges:player.trapCharges}
  }

  function performAction(payload,remoteAction=false){
    if(!authoritative()||!spyActive())return{kind:"error",ok:false,text:"HOST RULES NOT READY"};const actor=String(payload?.actorId||actorId());if(!validateActor(actor))return{kind:"error",ok:false,text:"INVALID AGENT"};
    const api=SAB(),m=match(),player=modelFor(actor);if(!api||!m||!player||player.status!=="active")return{kind:"error",ok:false,text:"AGENT NOT ACTIVE"};
    let result={kind:"error",ok:false,text:"ACTION FAILED"};
    if(payload.type==="search"){
      const room=roomFor(player.roomId),logical=room?.furniture?.find?.(item=>String(item.id)===String(payload.furnitureId)),physical=(host?.blockingDecor||[]).find(item=>item?.spyR32Furniture&&String(item.logicalFurnitureId)===String(payload.furnitureId));
      if(!logical||!physical||!physicalNearTarget(actor,physical,1))result={kind:"search",ok:false,text:"MOVE BESIDE THAT FURNITURE"};
      else{const beforeTrap=m.traps?.find?.(entry=>entry.armed&&entry.roomId===player.roomId&&entry.targetType==="furniture"&&String(entry.targetId)===String(logical.id)),countered=Boolean(beforeTrap&&api.TRAPS?.[beforeTrap.trapId]?.counter&&player.counter===api.TRAPS[beforeTrap.trapId].counter);const found=api.searchFurniture(m,actor,logical.id,Date.now());syncPhysical(actor);result=countered&&found?.trapped?{kind:"trap-disarmed",ok:true,trapId:beforeTrap.trapId,text:`DISARMED · ${trapName(beforeTrap.trapId).toUpperCase()}`}:describeSearch(found,actor,logical.id,beforeTrap)}
    }else if(payload.type==="collect-loose"){
      const loose=m.looseObjects?.find?.(row=>String(row.id)===String(payload.looseId)&&String(row.roomId)===String(player.roomId));if(loose&&api.collectLoose(m,actor,loose.id,Date.now())){result={kind:"objective",ok:true,objectiveId:loose.objectiveId,complete:Boolean(api.hasCompleteCase(player)),text:`${objectiveName(loose.objectiveId).toUpperCase()} RECOVERED`};syncPhysical(actor)}
    }else if(payload.type==="place-trap")result=placeTrapAuthoritative(actor,String(payload.trapId||""),payload.target||{});
    else if(payload.type==="attack"){
      const target=modelFor(payload.targetId),aLive=liveFor(actor),tLive=liveFor(target?.id);if(target&&aLive&&tLive&&target.status==="active"&&String(target.roomId)===String(player.roomId)&&Math.hypot(Number(tLive.x)-Number(aLive.x),Number(tLive.y)-Number(aLive.y))<=3.15&&api.useWeapon(m,actor,target.id,Date.now())){syncPhysical(target.id);result={kind:"attack",ok:true,targetId:target.id,text:`HIT · ${String(target.name||"OTHER AGENT").toUpperCase()}`};sendResult(target.id,{kind:"attacked",ok:true,attackerId:actor,text:`HIT BY ${String(player.name||"OTHER AGENT").toUpperCase()}`})}else result={kind:"attack",ok:false,text:"OTHER AGENT OUT OF RANGE"}
    }else if(payload.type==="extract"){
      result=api.beginExtraction(m,actor,Date.now())?{kind:"extract",ok:true,text:"EXTRACTION STARTED"}:{kind:"extract",ok:false,text:"YOU NEED THE COMPLETE CASE AT EXTRACTION"}
    }
    if(remoteAction)sendResult(actor,result);else presentResult(result);return result
  }

  function sendAction(action){
    if(!connected()||typeof net?.send!=="function")return false;try{const payload={...action,roomMode:MODE_ID,actorId:actorId(),sentAt:Date.now()};net.send(ACTION_PACKET,payload)?.catch?.(()=>{});state.actionsSent++;return true}catch(_){return false}
  }
  function sendResult(id,result){
    if(!connected()||typeof net?.send!=="function")return false;try{net.send(RESULT_PACKET,{roomMode:MODE_ID,actorId:String(id||""),result,sentAt:Date.now()})?.catch?.(()=>{});state.resultsSent++;return true}catch(_){return false}
  }
  function submitAction(action){
    if(!spyActive())return false;if(authoritative()){performAction({...action,actorId:actorId()},false);return true}
    const sent=sendAction(action);if(!sent)toast("NETWORK ACTION COULD NOT BE SENT","red");return sent
  }
  function applyRemoteAction(payload){if(!authoritative()||payload?.roomMode!==MODE_ID)return false;performAction(payload,true);return true}
  function applyRemoteResult(payload){if(payload?.roomMode!==MODE_ID||String(payload?.actorId||"")!==actorId())return false;presentResult(payload.result||{});return true}

  function presentResult(result){
    if(!result)return false;renderInventory();try{window.CCGLostSizzlerV141UiSpyPerformance?.renderSpyHud?.(true)}catch(_){}
    const text=String(result.text||"");
    if(result.kind==="objective"){state.objectives++;sfx(result.objectiveId==="case"?"mainKey":"key");toast(text,"green",2600);floatAt(localLive()?.x,localLive()?.y,text,P?.green||"#72ff9b");if(result.complete)toast("COMPLETE CASE · FIND EXTRACTION AND PRESS X","gold",3800)}
    else if(result.kind==="weapon"||result.kind==="counter"){sfx("pickup");toast(text,"cyan",2200);floatAt(localLive()?.x,localLive()?.y,text,P?.cyan||"#6cecff")}
    else if(result.kind==="empty"){sfx("empty");toast(text,"cyan",1400)}
    else if(result.kind==="trap-placed"){sfx("key");toast(text,"gold",1800)}
    else if(result.kind==="trap-triggered"||result.kind==="attacked"){state.trapsTriggered+=result.kind==="trap-triggered"?1:0;sfx("hurt");flashEffect(800);toast(text,"red",2200);floatAt(localLive()?.x,localLive()?.y,text,P?.red||"#ff6868")}
    else if(result.kind==="trap-disarmed"){state.trapsDisarmed++;sfx("pickup");toast(text,"green",2000)}
    else if(result.kind==="attack"){if(result.ok){state.attacks++;sfx("hit");toast(text,"red",1100)}else toast(text,"cyan",1100)}
    else if(result.kind==="extract")toast(text,result.ok?"gold":"red",2200);
    else if(text)toast(text,result.ok===false?"red":"cyan",1700);
    return true
  }

  function triggerTrapForPlayer(model,target){
    const m=match(),api=SAB();if(!authoritative()||!m||!api||!model)return false;
    const placed=m.traps?.find?.(entry=>entry.armed&&String(entry.roomId)===String(model.roomId)&&entry.targetType===target.type&&(entry.targetId==null||String(entry.targetId)===String(target.id)));if(!placed)return false;
    const counter=api.TRAPS?.[placed.trapId]?.counter,countered=Boolean(counter&&model.counter===counter),ok=api.triggerTrap(m,model.id,target,Date.now());if(!ok)return false;syncPhysical(model.id);
    const result=countered?{kind:"trap-disarmed",ok:true,trapId:placed.trapId,text:`DISARMED · ${trapName(placed.trapId).toUpperCase()}`}:{kind:"trap-triggered",ok:true,trapId:placed.trapId,text:`TRAP! ${trapName(placed.trapId).toUpperCase()}`};
    if(String(model.id)===actorId())presentResult(result);else sendResult(model.id,result);return true
  }
  function checkFloorTrap(model,live){
    if(!authoritative()||!model||!live)return false;const m=match(),placed=m?.traps?.find?.(entry=>entry.armed&&entry.targetType==="floor"&&String(entry.roomId)===String(model.roomId)&&Number.isFinite(Number(entry.x))&&Math.round(Number(entry.x))===Math.round(Number(live.x))&&Math.round(Number(entry.y))===Math.round(Number(live.y)));if(!placed)return false;
    if(Date.now()-Number(placed.placedAt||0)<350&&String(placed.ownerId)===String(model.id))return false;return triggerTrapForPlayer(model,{type:"floor",id:placed.targetId})
  }
  function detectPlayerTransitions(){
    if(!authoritative())return false;let changed=false;
    for(const model of match()?.players||[]){
      const id=String(model.id),current=String(model.roomId||""),previous=state.lastRoomByPlayer.get(id);if(previous&&current&&previous!==current){
        const edge=match()?.map?.edges?.find?.(row=>(String(row.a)===previous&&String(row.b)===current)||(String(row.b)===previous&&String(row.a)===current));if(edge)triggerTrapForPlayer(model,{type:"door",id:edge.id});changed=true
      }
      state.lastRoomByPlayer.set(id,current);checkFloorTrap(model,liveFor(id))
    }
    return changed
  }

  function legacyPacket(event,payload){
    if(event===ACTION_PACKET){applyRemoteAction(payload);return}
    if(event===RESULT_PACKET){applyRemoteResult(payload);return}
    if(event===LEGACY_HIT_PACKET&&payload?.roomMode===MODE_ID&&authoritative()){applyRemoteAction({roomMode:MODE_ID,actorId:String(payload.attackerId||""),type:"attack",targetId:String(payload.targetId||"")});return}
    return typeof state.packetBase==="function"?state.packetBase.apply(this,arguments):undefined
  }
  legacyPacket.__ccgV141R32SpyPacket=true;
  function installPacketHandler(){
    if(!net?.cb)return false;const current=net.cb.onPacket;if(current===legacyPacket){state.packetInstalled=true;return true}
    if(current?.__ccgV141R29SpyNetworkOwner&&spyActive())return state.packetInstalled;
    state.packetBase=current;net.cb.onPacket=legacyPacket;state.packetInstalled=true;return true
  }

  function suppressLegacyActions(){
    const a=active(),m=match();if(!a?.cooldowns||!m?.players)return false;for(const player of m.players)for(const type of ["trap","search","extract"])a.cooldowns.set(`${type}:${player.id}`,Number.MAX_SAFE_INTEGER);return true
  }
  function syncStatusAndRespawns(){
    const m=match();if(!m)return;
    for(const model of m.players||[]){
      const live=liveFor(model.id);if(!live)continue;const previous=live._v141r32Status||"";live._v141r32Status=String(model.status||"");
      syncPhysical(model.id);
      if(model.status==="active"&&previous&&previous!=="active"){const room=physicalRoomFor(model.roomId);if(room){const q=centre(room);live.x=live.rx=q.x;live.y=live.ry=q.y;model.x=q.x;model.y=q.y}}
    }
  }
  function processTimedTrapChanges(before){
    if(!authoritative())return;const m=match();for(const trap of m?.traps||[]){if(!before.get(trap.id)||trap.armed||!trap.detonatesAt||Date.now()<Number(trap.detonatesAt))continue;for(const model of m.players||[]){if(String(model.roomId)!==String(trap.roomId))continue;const result={kind:"trap-triggered",ok:true,trapId:trap.trapId,text:`TIME BOMB! ${trapName(trap.trapId).toUpperCase()}`};syncPhysical(model.id);if(String(model.id)===actorId())presentResult(result);else sendResult(model.id,result)}}
  }

  function updateRoomLabel(){
    ensureUi();const node=document.getElementById("spy-r32-room-label"),model=localModel(),room=roomFor(model?.roomId);if(!node||!room)return false;const remaining=(room.furniture||[]).filter(item=>!item.searched).length;node.textContent=`${room.spyArchetype||"ARCHIVE ROOM"} · ${remaining} SEARCHABLE`;return true
  }

  function overhaulUpdate(){
    if(!spyActive())return false;
    ensureUi();const m=match();if(!m)return false;
    if(state.round!==Number(m.round)||!world?._v141r32SpyOverhaul)buildOverhaulWorld(true);else ensureLogicalFurniture(m);
    try{window.CCGLostSizzlerV141R29SpyEngine?.sanitiseSharedDungeonState?.()}catch(_){}
    suppressLegacyActions();animateDoors();moveLocal();updateSearch();attackLocal();detectPlayerTransitions();
    const before=new Map((m.traps||[]).map(trap=>[trap.id,Boolean(trap.armed)]));
    try{specialApi()?.updateForTest?.()}catch(error){console.warn("[Lost Sizzler r32] Spy rules tick failed safely",error)}
    syncStatusAndRespawns();processTimedTrapChanges(before);animateDoors();updateRoomLabel();try{window.CCGLostSizzlerV141UiSpyPerformance?.renderSpyHud?.(false)}catch(_){}
    return true
  }
  overhaulUpdate.__ccgV141R32SpyOverhaul=true;

  function patchEngine(){
    const engine=window.CCGLostSizzlerV141R29SpyEngine;if(!engine)return false;
    if(!state.engineBaseUpdate)state.engineBaseUpdate=engine.isolatedUpdate;
    if(!state.engineBaseEnter)state.engineBaseEnter=engine.enterIsolation;
    if(engine.isolatedUpdate!==overhaulUpdate)engine.isolatedUpdate=overhaulUpdate;
    if(!engine.enterIsolation?.__ccgV141R32SpyEnter){
      const base=state.engineBaseEnter;
      const wrapped=function enterSpyR32(){const result=typeof base==="function"?base.apply(this,arguments):true;if(spyActive())buildOverhaulWorld(true);return result};
      wrapped.__ccgV141R32SpyEnter=true;wrapped.__ccgOriginal=base;engine.enterIsolation=wrapped
    }
    state.enginePatched=true;return true
  }

  function onKeyDown(event){
    if(!spyActive()||editable(event?.target))return;const code=String(event.code||"");
    if(code==="Tab"){event.preventDefault?.();event.stopPropagation?.();setInventory(!state.inventoryOpen);return}
    if(["Digit1","Digit2","Digit3","Numpad1","Numpad2","Numpad3"].includes(code)){const n=Number(code.slice(-1));if(n>=1&&n<=3){event.preventDefault?.();selectTrap(n-1)}return}
    if(state.inventoryOpen){if(MOVE_CODES.has(code)||["Space","KeyE","KeyT","KeyX"].includes(code)){event.preventDefault?.();event.stopPropagation?.()}return}
    if(MOVE_CODES.has(code)){keys.add(code);event.preventDefault?.()}
    if(code==="Space"){keys.add(code);event.preventDefault?.()}
    if(code==="KeyE"&&!event.repeat){event.preventDefault?.();beginSearch()}
    if(code==="KeyT"&&!event.repeat){event.preventDefault?.();try{const old=window.CCGLostSizzlerV141R29SpyEngine?.state;if(old){old.trapPulse=false;old.trapHeld=false}}catch(_){};placeTrapLocal()}
    if(code==="KeyX"&&!event.repeat){event.preventDefault?.();beginExtraction()}
  }
  function onKeyUp(event){const code=String(event.code||"");keys.delete(code)}
  function clearInput(){keys.clear();state.search=null}

  function release(){
    setInventory(false);keys.clear();state.search=null;state.worldKey="";state.round=0;state.lastRoomByPlayer.clear();const label=document.getElementById("spy-r32-room-label");if(label)label.textContent=""
  }
  function monitor(){
    installPacketHandler();patchEngine();const mode=spyActive()?MODE_ID:"";
    if(mode!==state.lastMode){if(!mode)release();else{ensureUi();buildOverhaulWorld(true);renderInventory()}state.lastMode=mode}
    if(mode){suppressLegacyActions();updateRoomLabel()}
  }

  addEventListener("keydown",onKeyDown,true);addEventListener("keyup",onKeyUp,true);addEventListener("blur",clearInput,true);
  ensureUi();installPacketHandler();patchEngine();monitor();state.timer=setInterval(()=>{try{monitor()}catch(error){console.warn("[Lost Sizzler r32] Spy overhaul monitor failed safely",error)}},MONITOR_MS);
  addEventListener("pagehide",()=>{if(state.timer)clearInterval(state.timer);clearTimeout(toastTimer);clearTimeout(effectTimer);release()},{once:true});

  window.CCGLostSizzlerV141R32SpyOverhaul={
    ACTION_PACKET,RESULT_PACKET,ROOM_W,ROOM_H,ROOM_STEP_X,ROOM_STEP_Y,ROOM_ARCHETYPES,
    buildOverhaulWorld,ensureLogicalFurniture,renderInventory,setInventory,selectTrap,beginSearch,placeTrapLocal,
    performAction,applyRemoteAction,applyRemoteResult,triggerTrapForPlayer,overhaulUpdate,patchEngine,installPacketHandler,
    get state(){return state}
  };
})();
