/* The Lost Sizzler V10.41 r36 — Spy Vs Spy gameplay polish and recovery.
 *
 * Spy-only final gameplay owner. It deliberately sits above the established
 * r32 movement/network and r35 knockout rules instead of replacing them.
 *
 * Owns the live gaps found in manual two-player testing:
 * - visible melee/sword swing state for Spy attacks;
 * - deterministic six-frame Spy door animation through the environment atlas;
 * - full-health physical/model reconciliation after the ten-second ghost respawn;
 * - compact, direct search progress inside the local Trapulator report panel;
 * - door-trap transition fallback plus expired trap-effect cleanup;
 * - conservative recovery from stale search state or an impossible movement
 *   cooldown/key ownership stall.
 */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V141_R36_SPY_GAMEPLAY_POLISH__)return;
  window.__CCG_LOST_SIZZLER_V141_R36_SPY_GAMEPLAY_POLISH__=true;

  const MODE_ID="sizzler-saboteurs";
  const MONITOR_MS=40,STALL_MS=850,SEARCH_STALE_MS=1500,SWING_MS=270,CELL=64,GUTTER=1;
  const MOVE_CODES=new Set(["ArrowLeft","ArrowRight","ArrowUp","ArrowDown","KeyA","KeyD","KeyW","KeyS","ShiftLeft","ShiftRight"]);
  const state={
    timer:0,keyBound:false,combatWrapped:false,doorWrapped:false,doorBase:null,
    swingAnimations:0,doorFrames:0,doorFrameChanges:0,respawnSyncs:0,
    searchHudMounts:0,searchHudUpdates:0,trapFallbacks:0,trapRecoveries:0,
    cooldownRepairs:0,staleSearchRepairs:0,movementRepairs:0,lastMovementRepairAt:0,
    ghostedIds:new Set(),seenRespawns:new Set(),lastRoomByPlayer:new Map(),
    lastDoorFrame:new Map(),heldMoves:new Set(),lastLocalPosition:"",lastLocalMoveAt:0,
    syntheticInput:false,lastError:""
  };

  const spyActive=()=>{try{return window.CCGLostSizzlerSpecialModes?.active?.type===MODE_ID||document.body?.dataset?.specialMode===MODE_ID}catch(_){return false}};
  const active=()=>{try{return window.CCGLostSizzlerSpecialModes?.active||null}catch(_){return null}};
  const match=()=>active()?.state||null;
  const authoritative=()=>Boolean(active()?.authoritative);
  const overhaul=()=>{try{return window.CCGLostSizzlerV141R32SpyOverhaul||null}catch(_){return null}};
  const hardening=()=>{try{return window.CCGLostSizzlerV141R35SpyRulesHardening||null}catch(_){return null}};
  const actorId=()=>{try{return String(net?.sessionId||p1?.id||"P1")}catch(_){return"P1"}};
  const modelFor=id=>match()?.players?.find?.(row=>String(row?.id||"")===String(id||""))||null;
  const liveFor=id=>{try{return String(p1?.id||"")===String(id||"")?p1:remote?.get?.(id)||null}catch(_){return null}};
  const localModel=()=>modelFor(actorId())||match()?.players?.[0]||null;
  const localLive=()=>liveFor(actorId())||(()=>{try{return p1||null}catch(_){return null}})();
  const perfNow=()=>{try{return Number(performance.now())||Date.now()}catch(_){return Date.now()}};
  const now=()=>Date.now();
  const editable=target=>{try{return Boolean(target?.closest?.("input,textarea,select,[contenteditable='true'],[contenteditable='']"))}catch(_){return false}};
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

  function physicalRoomFor(model){
    const logical=match()?.map?.rooms?.find?.(row=>String(row?.id||"")===String(model?.roomId||""));
    if(!logical||!Number.isFinite(Number(logical.dungeonRoomId)))return null;
    try{return world?.rooms?.[Number(logical.dungeonRoomId)]||null}catch(_){return null}
  }
  function roomCentre(room){return room?{x:Math.floor(Number(room.x)+Number(room.w)/2),y:Math.floor(Number(room.y)+Number(room.h)/2)}:null}

  function swingDirection(attacker,target){
    if(attacker&&target){const dx=Math.sign(Number(target.x)-Number(attacker.x)),dy=Math.sign(Number(target.y)-Number(attacker.y));if(dx||dy)return{x:dx,y:dy}}
    const dir=attacker?.dir||{x:1,y:0},x=Math.sign(Number(dir.x)||0),y=Math.sign(Number(dir.y)||0);return x||y?{x,y}:{x:1,y:0}
  }
  function stampSwing(attackerId=actorId(),targetId=""){
    if(!spyActive())return false;const attacker=liveFor(attackerId),model=modelFor(attackerId);if(!attacker||model?.status!=="active")return false;
    const target=targetId?liveFor(targetId):null,dir=swingDirection(attacker,target);
    attacker.dir={...dir};attacker._meleeSwingAt=perfNow();attacker._meleeSwingMs=SWING_MS;attacker._meleeSwingDir={...dir};attacker._meleeSwingColour="#ffd85a";
    state.swingAnimations++;return true
  }
  function installCombatAnimation(){
    const base=window.CCGLostSizzlerSaboteurs;if(!base||typeof base.useWeapon!=="function")return false;
    if(base.__ccgV141R36CombatAnimation){state.combatWrapped=true;return true}
    const baseUse=base.useWeapon;
    const useWeapon=function useWeaponR36Animated(matchState,attackerId,targetId,at){
      const result=baseUse.apply(this,arguments);
      if(result&&spyActive())try{stampSwing(String(attackerId||""),String(targetId||""))}catch(_){}
      return result
    };
    useWeapon.__ccgV141R36CombatAnimation=true;useWeapon.__ccgOriginal=baseUse;
    window.CCGLostSizzlerSaboteurs=Object.freeze({...base,useWeapon,__ccgV141R36CombatAnimation:true});state.combatWrapped=true;return true
  }

  function onKeyDown(event){
    if(!spyActive()||editable(event?.target)||event?.repeat||state.syntheticInput)return;const code=String(event?.code||"");
    if(MOVE_CODES.has(code)){state.heldMoves.add(code);return}
    if(code!=="Space")return;
    const api=overhaul(),model=localModel();if(api?.state?.inventoryOpen||api?.state?.search||model?.status!=="active")return;
    stampSwing(actorId(),"")
  }
  function onKeyUp(event){if(MOVE_CODES.has(String(event?.code||"")))state.heldMoves.delete(String(event.code||""))}
  function installKeyTracking(){
    if(state.keyBound)return true;addEventListener("keydown",onKeyDown,true);addEventListener("keyup",onKeyUp,true);addEventListener("blur",()=>state.heldMoves.clear());state.keyBound=true;return true
  }

  function environmentCanvas(){try{return window.CCGLostSizzlerEnvironmentAtlasFix?.state?.canvas||null}catch(_){return null}}
  function doorFrame(door,t=perfNow()){
    const duration=Math.max(1,Number(door?.openAt||0)-Number(door?.openingStart||0));
    const progress=door?.open?1:door?.opening?clamp((t-Number(door.openingStart||t))/duration,0,1):0;
    return Math.max(0,Math.min(5,Math.round(progress*5)))
  }
  function drawSpyDoor(door,image){
    const frame=doorFrame(door),prior=state.lastDoorFrame.get(String(door.id||""));door._v141r36Frame=frame;state.doorFrames++;
    if(prior!==frame){state.lastDoorFrame.set(String(door.id||""),frame);state.doorFrameChanges++}
    if(!image)return false;
    try{if(typeof visibleTo==="function"&&typeof focus!=="undefined"&&focus&&!visibleTo(focus,door.x,door.y))return true}catch(_){}
    try{
      const s=ws(door.x,door.y),sx=frame*CELL+GUTTER,sw=CELL-GUTTER*2,sh=CELL-GUTTER*2;
      ctx.save();ctx.imageSmoothingEnabled=false;ctx.translate(Math.round(s.x+C.tile/2),Math.round(s.y+C.tile/2));if(door.orientation!=="horizontal")ctx.rotate(Math.PI/2);
      ctx.drawImage(image,sx,GUTTER,sw,sh,-30,-30,60,60);ctx.restore();return true
    }catch(_){return false}
  }
  function installDoorRenderer(){
    const current=window.drawDoors;if(typeof current!=="function")return false;
    if(current.__ccgV141R36SpyDoors){state.doorWrapped=true;state.doorBase=current.__ccgOriginal||state.doorBase;return true}
    const original=current;
    const wrapped=function drawDoorsR36SpyAnimated(){
      if(!spyActive())return original.apply(this,arguments);
      const all=Array.isArray(host?.doors)?host.doors:[],spy=all.filter(row=>row?.spyR32Door),other=all.filter(row=>!row?.spyR32Door),image=environmentCanvas();
      if(other.length){try{host.doors=other;original.apply(this,arguments)}finally{host.doors=all}}
      else if(!spy.length)return original.apply(this,arguments);
      for(const door of spy)drawSpyDoor(door,image);
      if(!image&&spy.length)return original.apply(this,arguments);
    };
    wrapped.__ccgV141R36SpyDoors=true;wrapped.__ccgOriginal=original;window.drawDoors=wrapped;state.doorBase=original;state.doorWrapped=true;return true
  }

  function resetSpyActionState(){
    const api=overhaul();if(!api?.state)return false;api.state.lastMoveAt=0;api.state.lastAttackAt=0;api.state.lastTrapAt=0;
    if(api.state.search&&perfNow()>Number(api.state.search.completesAt||0)+SEARCH_STALE_MS){api.state.search=null;state.staleSearchRepairs++}
    return true
  }
  function syncRespawnPlayer(model,force=false){
    const live=liveFor(model?.id);if(!model||!live||model.status!=="active")return false;
    const max=Math.max(1,Number(model.maxHp||6));model.maxHp=max;model.hp=max;model.effects={};
    live.maxHealth=max;live.health=max;live.hpBarMs=Math.max(2200,Number(live.hpBarMs||0));
    const room=physicalRoomFor(model),q=roomCentre(room);if(q){live.x=q.x;live.y=q.y;live.rx=q.x;live.ry=q.y;model.x=q.x;model.y=q.y}
    try{if(overhaul()?.state?.inventoryOpen)overhaul().setInventory?.(false)}catch(_){}resetSpyActionState();
    try{input?.clear?.()}catch(_){};try{document.getElementById("game")?.focus?.({preventScroll:true})}catch(_){}
    state.ghostedIds.delete(String(model.id||""));state.respawnSyncs++;return force||true
  }
  function syncGhostRespawns(){
    if(!spyActive())return false;const m=match();if(!m)return false;let changed=false;
    for(const model of m.players||[]){
      const id=String(model?.id||"");if(!id)continue;
      if(model.status==="ghost"){
        state.ghostedIds.add(id);const live=liveFor(id);if(live){live.maxHealth=Math.max(1,Number(model.maxHp||live.maxHealth||6));live.health=0;live.hpBarMs=Math.max(1200,Number(live.hpBarMs||0))}continue
      }
      if(model.status==="active"&&state.ghostedIds.has(id)){syncRespawnPlayer(model);changed=true}
    }
    for(const event of m.events||[]){
      if(event?.type!=="ghost-respawn")continue;const key=`${event.playerId}|${event.at}`;if(state.seenRespawns.has(key))continue;state.seenRespawns.add(key);
      const model=modelFor(event.playerId);if(model?.status==="active"){syncRespawnPlayer(model,true);changed=true}
    }
    while(state.seenRespawns.size>80){const first=state.seenRespawns.values().next().value;state.seenRespawns.delete(first)}
    return changed
  }

  function edgeBetween(a,b){return match()?.map?.edges?.find?.(row=>(String(row.a)===String(a)&&String(row.b)===String(b))||(String(row.b)===String(a)&&String(row.a)===String(b)))||null}
  function reconcileDoorTraps(){
    if(!spyActive()||!authoritative())return false;const api=overhaul(),m=match();if(!api||!m)return false;let changed=false;
    for(const model of m.players||[]){
      const id=String(model?.id||""),current=String(model?.roomId||""),previous=state.lastRoomByPlayer.get(id);
      if(previous&&current&&previous!==current){
        const edge=edgeBetween(previous,current),armed=edge&&m.traps?.find?.(row=>row?.armed&&row.targetType==="door"&&String(row.targetId||"")===String(edge.id));
        if(armed){
          const placedRoom=String(armed.roomId||"");
          if(placedRoom!==current)armed.roomId=current;
          if(api.triggerTrapForPlayer?.(model,{type:"door",id:edge.id})){state.trapFallbacks++;changed=true}
          else if(placedRoom!==current)armed.roomId=placedRoom;
        }
      }
      if(current)state.lastRoomByPlayer.set(id,current)
    }
    return changed
  }
  function cleanExpiredTrapEffects(){
    if(!spyActive())return false;const t=now();let changed=false;
    for(const model of match()?.players||[]){
      if(!model?.effects||typeof model.effects!=="object")continue;
      for(const [key,value] of Object.entries(model.effects))if(!Number.isFinite(Number(value))||Number(value)<=t){delete model.effects[key];changed=true;state.trapRecoveries++}
    }
    return changed
  }

  function ensureSearchHud(){
    if(!spyActive())return false;let mounted=false;
    if(!document.getElementById("ccg-spy-r36-search-style")){
      const style=document.createElement("style");style.id="ccg-spy-r36-search-style";style.textContent=`
        .spy-classic-notice:has(.spy-r36-search[data-visible="true"]){padding-bottom:22px!important}
        .spy-r36-search{display:none;position:absolute;left:7px;right:7px;bottom:5px;height:13px;pointer-events:none}
        .spy-r36-search[data-visible="true"]{display:block}
        .spy-r36-search em{display:block;margin-bottom:2px;color:#ffd85a;font:900 6px/1 "Courier New",monospace;font-style:normal;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .spy-r36-search span{display:block;height:3px;border:1px solid rgba(108,236,255,.5);background:#050810}
        .spy-r36-search i{display:block;height:100%;width:0;background:#6cecff;box-shadow:0 0 5px rgba(108,236,255,.5)}
      `;document.head.appendChild(style)
    }
    for(const slot of [1,2]){
      const notice=document.querySelector(`.spy-classic-notice[data-slot="${slot}"]`);if(!notice)continue;if(getComputedStyle(notice).position==="static")notice.style.position="relative";
      if(!notice.querySelector(".spy-r36-search")){const node=document.createElement("div");node.className="spy-r36-search";node.dataset.slot=String(slot);node.dataset.visible="false";node.innerHTML="<em></em><span><i></i></span>";notice.appendChild(node);state.searchHudMounts++;mounted=true}
    }
    return mounted
  }
  function localSlot(){const model=localModel();return Math.max(1,Math.min(2,Number(model?.slot)||1))}
  function nearbyFurnitureState(){
    try{
      const found=window.CCGLostSizzlerV141UiSpyPerformance?.nearSpyFurniture?.();if(!found)return null;
      const id=String(found.id||found.near?.logicalFurnitureId||""),label=String(found.near?.label||"FURNITURE").toUpperCase();let logical=null;
      for(const room of match()?.map?.rooms||[]){logical=(room.furniture||[]).find(row=>String(row.id||"")===id);if(logical)break}
      return{id,label,searched:Boolean(logical?.searched)}
    }catch(_){return null}
  }
  function updateSearchHud(){
    if(!spyActive())return false;ensureSearchHud();const slot=localSlot(),api=overhaul(),q=api?.state?.search;
    for(const n of document.querySelectorAll(".spy-r36-search"))if(Number(n.dataset.slot)!==slot)n.dataset.visible="false";
    const node=document.querySelector(`.spy-r36-search[data-slot="${slot}"]`);if(!node)return false;const text=node.querySelector("em"),bar=node.querySelector("i");let label="",pct=0,visible=false;
    if(q){const duration=Math.max(1,Number(q.completesAt)-Number(q.startedAt)),elapsed=perfNow()-Number(q.startedAt);pct=clamp(elapsed/duration*100,0,100);label=`SEARCHING ${String(q.targetLabel||"FURNITURE").toUpperCase()} · ${Math.round(pct)}%`;visible=true}
    else{const near=nearbyFurnitureState();if(near){pct=near.searched?100:0;label=near.searched?`${near.label} · ALREADY SEARCHED`:`E · SEARCH ${near.label}`;visible=true}}
    node.dataset.visible=String(visible);node.dataset.percent=String(Math.round(pct));if(text)text.textContent=label;if(bar)bar.style.width=`${pct}%`;if(visible)state.searchHudUpdates++;return visible
  }

  function heldDirection(){
    const h=code=>state.heldMoves.has(code),dx=+(h("ArrowRight")||h("KeyD"))-+(h("ArrowLeft")||h("KeyA")),dy=+(h("ArrowDown")||h("KeyS"))-+(h("ArrowUp")||h("KeyW"));return{x:Math.sign(dx),y:Math.sign(dy)}
  }
  function nextCellOpen(player,dir){
    if(!player||( !dir.x&&!dir.y))return false;const x=Math.round(Number(player.x))+dir.x,y=Math.round(Number(player.y))+dir.y;
    try{
      const door=(host?.doors||[]).find(row=>row?.spyR32Door&&Number(row.x)===x&&Number(row.y)===y);if(door&&!door.open)return false;
      if(world?.map?.[y]?.[x]!==0)return false;if((host?.blockingDecor||[]).some(row=>Number(row.x)===x&&Number(row.y)===y))return false;
      for(const model of match()?.players||[]){if(String(model.id)===actorId()||model.status!=="active")continue;const live=liveFor(model.id);if(live&&Math.round(Number(live.x))===x&&Math.round(Number(live.y))===y)return false}
      return true
    }catch(_){return false}
  }
  function replayHeldMovement(){
    if(!state.heldMoves.size)return false;state.syntheticInput=true;
    try{
      for(const code of state.heldMoves){dispatchEvent(new KeyboardEvent("keyup",{code,bubbles:true,cancelable:true}));dispatchEvent(new KeyboardEvent("keydown",{code,bubbles:true,cancelable:true}))}
    }finally{state.syntheticInput=false}
    state.movementRepairs++;state.lastMovementRepairAt=perfNow();return true
  }
  function repairMovementStall(){
    if(!spyActive())return false;const api=overhaul(),player=localLive(),model=localModel();if(!api?.state||!player||model?.status!=="active")return false;
    if(!Number.isFinite(Number(api.state.lastMoveAt))||Number(api.state.lastMoveAt)>perfNow()+5000){api.state.lastMoveAt=0;state.cooldownRepairs++}
    if(api.state.search&&perfNow()>Number(api.state.search.completesAt||0)+SEARCH_STALE_MS){api.state.search=null;state.staleSearchRepairs++}
    const pos=`${Number(player.x)},${Number(player.y)}`,t=perfNow();if(pos!==state.lastLocalPosition){state.lastLocalPosition=pos;state.lastLocalMoveAt=t;return false}
    if(!state.lastLocalMoveAt)state.lastLocalMoveAt=t;
    const dir=heldDirection();if((!dir.x&&!dir.y)||api.state.inventoryOpen||api.state.search||!nextCellOpen(player,dir))return false;
    if(t-state.lastLocalMoveAt<STALL_MS||t-state.lastMovementRepairAt<STALL_MS)return false;
    api.state.lastMoveAt=0;return replayHeldMovement()
  }

  function refresh(){
    installKeyTracking();installCombatAnimation();installDoorRenderer();if(!spyActive())return false;
    syncGhostRespawns();reconcileDoorTraps();cleanExpiredTrapEffects();updateSearchHud();repairMovementStall();return true
  }

  refresh();state.timer=setInterval(()=>{try{refresh()}catch(error){state.lastError=String(error?.message||error);console.warn("[Lost Sizzler r36] Spy gameplay polish recovered safely",error)}},MONITOR_MS);
  addEventListener("pagehide",()=>{if(state.timer)clearInterval(state.timer);state.timer=0;state.heldMoves.clear();if(state.keyBound){removeEventListener("keydown",onKeyDown,true);removeEventListener("keyup",onKeyUp,true)}},{once:true});

  window.CCGLostSizzlerV141R36SpyGameplayPolish={
    stampSwing,installCombatAnimation,installDoorRenderer,doorFrame,syncGhostRespawns,syncRespawnPlayer,reconcileDoorTraps,cleanExpiredTrapEffects,ensureSearchHud,updateSearchHud,repairMovementStall,refresh,
    constants:{MONITOR_MS,STALL_MS,SWING_MS},get state(){return state}
  };
})();
