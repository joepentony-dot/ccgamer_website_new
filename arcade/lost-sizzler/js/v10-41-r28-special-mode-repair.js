/* The Lost Sizzler V10.41 r28 — special-mode repair and final balance pass. */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V141_R28_SPECIAL_MODE_REPAIR__)return;
  window.__CCG_LOST_SIZZLER_V141_R28_SPECIAL_MODE_REPAIR__=true;

  const HORDE_SPEED_SCALE=.75;
  const HORDE_LIGHT_RADIUS=20;
  const HUNTER_BALANCE=Object.freeze({
    1:Object.freeze({hp:2,moveSpeedScale:1.55}),
    2:Object.freeze({hp:3,moveSpeedScale:1.30}),
    3:Object.freeze({hp:4,moveSpeedScale:1.10}),
    4:Object.freeze({hp:5,moveSpeedScale:.95}),
    5:Object.freeze({hp:6,moveSpeedScale:.82})
  });
  const SPY_ALLOWED=/(?:SPY(?:\s+VS\s+SPY)?|AGENT|ROUND|CASE|SEARCH|TRAP|EXTRACT|FIELD\s+KIT|SUDDEN\s+DEATH|MATCH\s+(?:WON|OVER|COMPLETE)|DOOR|MULTIPLAYER\s+CONTINUES|HOST\s+MIGRATION|PLAYER\s+(?:JOINED|LEFT))/i;
  const SPY_DUNGEON_ONLY=/(?:DUNGEON|BOUNTY|MUTATION|DEATH\s+STALKER|COUNT\s+LOADULA|SIGIL|SANCTUARY|SHRINE|TREASURE|GILDED|BRONZE\s+KEY|ARENA\s+LOCKDOWN|TIMED\s+CHAMBER|BANISHMENT|INVENTORY|LOW\s+AMMO|EMERGENCY\s+CAPACITOR|FLOOR\s+OBJECTIVE)/i;
  const state={timer:0,lastMode:"",spyFurnitureKey:"",renderSource:null,fogSource:null,resourceSource:null,aiSource:null,toastSource:null,majorSource:null,bannerSuppressions:0,hordeBalanced:0,spySuppressed:0,huntersBalanced:0};

  const special=()=>{try{return window.CCGLostSizzlerSpecialModes?.active||null}catch(_){return null}};
  const modeType=()=>String(special()?.type||document.body?.dataset?.specialMode||"");
  const hordeActive=()=>modeType()==="horde-survivor";
  const spyActive=()=>modeType()==="sizzler-saboteurs";
  const hash32=value=>{let h=2166136261>>>0;for(const ch of String(value||"")){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0};
  const livePlayers=()=>{try{return typeof localPlayers==="function"?localPlayers():[p1,p2].filter(Boolean)}catch(_){return[]}};

  function hordeModelId(enemy){return String(enemy?.hordeModelId||enemy?._hordeModelId||enemy?.id||"")}
  function applyHordeEnemyBalance(){
    if(!hordeActive())return 0;
    const runState=special()?.state,models=runState?.activeEnemies||[];let changed=0;
    for(const model of models){
      if(!model||model._v138Reserve||model.kind==="reserve")continue;
      if(!model._v141r28HpAdjusted){
        const oldMax=Math.max(1,Number(model.maxHp??model.hp??1)),oldHp=Math.max(1,Number(model.hp??oldMax)),nextMax=Math.max(1,oldMax-1);
        model.maxHp=nextMax;model.hp=Math.max(1,Math.min(nextMax,oldHp-1));model._v141r28HpAdjusted=true;changed++;
      }
      if(!model._v141r28SpeedAdjusted){model.speed=Math.max(.45,Number(model.speed||1)*HORDE_SPEED_SCALE);model._v141r28SpeedAdjusted=true;changed++}
      const physical=(host?.enemies||[]).find(enemy=>hordeModelId(enemy)===String(model.id));
      if(physical){physical.maxHp=Number(model.maxHp||physical.maxHp||1);physical.hp=Math.max(1,Math.min(physical.maxHp,Number(model.hp||physical.hp||1)))}
    }
    if(changed){state.hordeBalanced+=changed;try{if(host)host.revision=(host.revision||0)+1}catch(_){}}
    return changed;
  }

  function applyHordeLoadout(){
    if(!hordeActive())return false;let changed=false;
    for(const player of livePlayers()){
      if(!player)continue;
      if(player.weapon&&Number(player.weapon.shots||1)!==3){player.weapon.shots=3;changed=true}
      if(Number(player.ammoFlashMs||0)!==0){player.ammoFlashMs=0;changed=true}
      if(Number(player.maxMana||0)>0&&Number(player.mana||0)!==Number(player.maxMana||0)){player.mana=player.maxMana;changed=true}
    }
    return changed;
  }

  function ensureHordeLighting(){
    if(!hordeActive()||!world?.rooms)return false;
    const room=(world.rooms||[]).find(row=>row?.hordeArena)||world.rooms[0];if(!room)return false;
    if((world.wallLights||[]).some(light=>light?.kind==="horde-r28"))return true;
    const cx=Math.floor(room.x+room.w/2),cy=Math.floor(room.y+room.h/2),dx=Math.max(7,Math.floor(room.w/4)),dy=Math.max(6,Math.floor(room.h/4));
    const points=[[cx,cy],[cx-dx,cy],[cx+dx,cy],[cx,cy-dy],[cx,cy+dy],[cx-dx,cy-dy],[cx+dx,cy-dy],[cx-dx,cy+dy],[cx+dx,cy+dy]];
    world.wallLights=points.map(([x,y],index)=>({id:`horde-r28-light-${index}`,x,y,roomId:Number(room.id||0),radius:HORDE_LIGHT_RADIUS,permanent:true,kind:"horde-r28"}));
    return true;
  }

  function installFogGuard(){
    const current=window.drawFog;if(typeof current!=="function")return false;
    if(current.__ccgV141R28HordeFog){state.fogSource=current;return true}
    if(current===state.fogSource)return true;
    const wrapped=function drawFogV141R28(){if(hordeActive()){try{drawDynamicLighting?.()}catch(_){}return false}return current.apply(this,arguments)};
    wrapped.__ccgV141R28HordeFog=true;wrapped.__ccgOriginal=current;window.drawFog=wrapped;state.fogSource=wrapped;return true;
  }

  function installPlayerResourceGuard(){
    const current=window.drawPlayerResources;if(typeof current!=="function")return false;
    if(current.__ccgV141R28HordeResources){state.resourceSource=current;return true}
    if(current===state.resourceSource)return true;
    const wrapped=function drawPlayerResourcesV141R28(){if(hordeActive())return false;return current.apply(this,arguments)};
    wrapped.__ccgV141R28HordeResources=true;wrapped.__ccgOriginal=current;window.drawPlayerResources=wrapped;state.resourceSource=wrapped;return true;
  }

  function installHordeBannerGuard(){
    const current=window.render;if(typeof current!=="function")return false;
    if(current.__ccgV141R28NoHordeBanner){state.renderSource=current;return true}
    if(current===state.renderSource)return true;
    const wrapped=function renderV141R28NoHordeBanner(){
      if(!hordeActive()||!window.ctx)return current.apply(this,arguments);
      const c=window.ctx,fillRect=c.fillRect,strokeRect=c.strokeRect,fillText=c.fillText;
      c.fillRect=function(x,y,w,h){if(Number(x)===14&&Number(y)===14&&Number(h)===70){state.bannerSuppressions++;return}return fillRect.apply(this,arguments)};
      c.strokeRect=function(x,y,w,h){if(Number(x)===14.5&&Number(y)===14.5&&Number(h)===69)return;return strokeRect.apply(this,arguments)};
      c.fillText=function(text){const value=String(text||"");if(value.startsWith("HORDE SURVIVOR")||value.startsWith("DEFEATED "))return;return fillText.apply(this,arguments)};
      try{return current.apply(this,arguments)}finally{c.fillRect=fillRect;c.strokeRect=strokeRect;c.fillText=fillText}
    };
    wrapped.__ccgV141R28NoHordeBanner=true;wrapped.__ccgOriginal=current;window.render=wrapped;state.renderSource=wrapped;return true;
  }

  function cardinalEnemyShot(hostState,players,shot){
    if(!shot||!shot.dx||!shot.dy)return shot;
    const enemy=(hostState?.enemies||[]).find(row=>String(row?.id||"")===String(shot.enemyId||""));
    const alive=(players||[]).filter(player=>player&&Number(player.health||0)>0);
    const target=alive.find(player=>String(player.id||"")===String(enemy?.targetId||""))||alive.sort((a,b)=>Math.hypot(a.x-(enemy?.x||shot.x),a.y-(enemy?.y||shot.y))-Math.hypot(b.x-(enemy?.x||shot.x),b.y-(enemy?.y||shot.y)))[0];
    if(!target)return{...shot,dy:0};
    const ax=Math.abs(Number(target.x)-Number(enemy?.x??shot.x)),ay=Math.abs(Number(target.y)-Number(enemy?.y??shot.y));
    return ax>=ay?{...shot,dx:Math.sign(Number(target.x)-Number(enemy?.x??shot.x))||Math.sign(shot.dx),dy:0}:{...shot,dx:0,dy:Math.sign(Number(target.y)-Number(enemy?.y??shot.y))||Math.sign(shot.dy)};
  }

  function installEnemyCardinalFire(){
    const ai=window.CCGAI,current=ai?.stepEnemies;if(typeof current!=="function")return false;
    if(current.__ccgV141R28EnemyCardinal){state.aiSource=current;return true}
    if(current===state.aiSource)return true;
    const wrapped=function stepEnemiesV141R28Cardinal(hostState,map,players,dt,hooks={},worldState){
      if(typeof hooks.shoot!=="function")return current.apply(this,arguments);
      const originalShoot=hooks.shoot,patched={...hooks,shoot:(shot,...rest)=>originalShoot(cardinalEnemyShot(hostState,players,shot),...rest)};
      return current.call(this,hostState,map,players,dt,patched,worldState);
    };
    wrapped.__ccgV141R28EnemyCardinal=true;wrapped.__ccgOriginal=current;ai.stepEnemies=wrapped;state.aiSource=wrapped;return true;
  }

  function allowedSpyNotification(title,text=""){
    const combined=`${String(title||"")} ${String(text||"")}`;
    if(SPY_DUNGEON_ONLY.test(combined)&&!SPY_ALLOWED.test(combined))return false;
    return SPY_ALLOWED.test(combined);
  }
  function clearSpyNotificationLeak(){
    if(!spyActive())return false;let changed=false;
    const pickup=document.getElementById("pickup-toast"),title=document.getElementById("pickup-title")?.textContent||"",text=document.getElementById("pickup-text")?.textContent||"";
    if(pickup?.classList?.contains("show")&&!allowedSpyNotification(title,text)){pickup.classList.remove("show");changed=true}
    const major=document.getElementById("ccg-major-notification"),majorTitle=major?.querySelector?.(".major-copy b")?.textContent||"",majorText=major?.textContent||"";
    if(major&&major.dataset?.visible==="true"&&!allowedSpyNotification(majorTitle,majorText)){major.dataset.visible="false";major.hidden=true;document.body?.removeAttribute?.("data-ccg-major-notification");changed=true}
    return changed;
  }
  function installSpyToastGuard(){
    const current=window.showToast;if(typeof current!=="function")return false;
    if(current.__ccgV141R28SpyBoundary){state.toastSource=current;return true}
    if(current===state.toastSource)return true;
    const wrapped=function showToastV141R28SpyBoundary(title,text){if(spyActive()&&!allowedSpyNotification(title,text)){state.spySuppressed++;clearSpyNotificationLeak();return false}return current.apply(this,arguments)};
    wrapped.__ccgV141R28SpyBoundary=true;wrapped.__ccgOriginal=current;window.showToast=wrapped;state.toastSource=wrapped;return true;
  }
  function installSpyMajorGuard(){
    const api=window.CCGLostSizzlerV141LandingNotificationPolish,current=api?.showMajor;if(typeof current!=="function")return false;
    if(current.__ccgV141R28SpyBoundary){state.majorSource=current;return true}
    if(current===state.majorSource)return true;
    const wrapped=function showMajorV141R28SpyBoundary(title,text){if(spyActive()&&!allowedSpyNotification(title,text)){state.spySuppressed++;clearSpyNotificationLeak();return false}return current.apply(this,arguments)};
    wrapped.__ccgV141R28SpyBoundary=true;wrapped.__ccgOriginal=current;api.showMajor=wrapped;state.majorSource=wrapped;return true;
  }

  function spyFurnitureType(seed,index){const others=["desk","cupboard","cabinet","barrel","readingDesk"];return others[hash32(`${seed}|${index}`)%others.length]}
  function positionSpyFurniture(match){
    if(!spyActive()||!match?.map?.rooms||!world?._v135SpyDoorMap)return false;let changed=false;
    const logicalById=new Map(match.map.rooms.map(room=>[String(room.id),room]));
    for(const physical of world.rooms||[]){
      if(!physical?.spyRoom)continue;const logical=logicalById.get(String(physical.logicalRoomId));if(!logical)continue;
      const ids=new Set((logical.furniture||[]).map(item=>String(item.id))),decor=(world.decor||[]).filter(item=>item?.spyFurniture&&ids.has(String(item.logicalFurnitureId)));
      const cx=Math.floor(physical.x+physical.w/2),cy=Math.floor(physical.y+physical.h/2),xs=[physical.x+2,physical.x+4,cx,physical.x+physical.w-4,physical.x+physical.w-2],ys=[physical.y+2,physical.y+4,cy,physical.y+physical.h-4,physical.y+physical.h-2],candidates=[];
      for(const x of xs){candidates.push({x,y:physical.y+2},{x,y:physical.y+physical.h-2})}for(const y of ys){candidates.push({x:physical.x+2,y},{x:physical.x+physical.w-2,y})}
      const doors=(host?.doors||[]).filter(door=>door?.spyDoor);
      const usable=candidates.filter((cell,index,all)=>all.findIndex(q=>q.x===cell.x&&q.y===cell.y)===index&&world.map?.[cell.y]?.[cell.x]===0&&Math.abs(cell.x-cx)+Math.abs(cell.y-cy)>=3&&doors.every(door=>Math.abs(door.x-cell.x)+Math.abs(door.y-cell.y)>=4)).sort((a,b)=>hash32(`${match.seed}|${match.round}|${logical.id}|${a.x},${a.y}`)-hash32(`${match.seed}|${match.round}|${logical.id}|${b.x},${b.y}`));
      decor.forEach((item,index)=>{const cell=usable[index];if(!cell)return;if(item.x!==cell.x||item.y!==cell.y)changed=true;item.x=cell.x;item.y=cell.y;item.structural=true;item.spyUnbreakable=true;item.hp=999999;item.maxHp=999999;const blocker=(host?.blockingDecor||[]).find(row=>String(row.id)===String(item.id));if(blocker){Object.assign(blocker,{x:cell.x,y:cell.y,structural:true,spyUnbreakable:true,hp:999999,maxHp:999999})}});
    }
    if(changed&&host)host.revision=(host.revision||0)+1;return changed;
  }
  function ensureSpyFurniture(){
    const active=special(),match=active?.state,map=match?.map;if(!spyActive()||!active?.authoritative||!map?.largeRoomGridV135||!Array.isArray(map.rooms))return false;
    const key=`${match.seed}|${match.round}`;
    if(!map._v141r28Bookcases){
      for(const [roomIndex,room] of map.rooms.entries()){
        room.furniture=Array.isArray(room.furniture)?room.furniture:[];
        while(room.furniture.length<4)room.furniture.push({id:`${room.id}-f${room.furniture.length+1}`,type:"desk",searched:false,trappedBy:null,contents:null});
        room.furniture=room.furniture.slice(0,4);
        room.furniture[0].type="bookcase";room.furniture[1].type="bookcase";
        const thirdBookcase=hash32(`${match.seed}|${match.round}|${room.id}|BOOKCASE`)%4===0;
        room.furniture[2].type=thirdBookcase?"bookcase":spyFurnitureType(`${match.seed}|${match.round}|${room.id}`,2);
        room.furniture[3].type=spyFurnitureType(`${match.seed}|${match.round}|${room.id}`,3);
      }
      map._v141r28Bookcases=true;
      try{const polish=window.CCGLostSizzlerModePolishV133;if(polish?.specialState)polish.specialState.spyMapKey="";polish?.buildSpyPhysical?.(match)}catch(error){console.warn("[Lost Sizzler r28] Spy furniture rebuild failed",error)}
      state.spyFurnitureKey=key;
    }
    positionSpyFurniture(match);return true;
  }

  function ordinaryHunter(enemy){return Boolean(enemy?.alive&&String(enemy.kind)==="hunter"&&!enemy.follower&&!enemy.horrorCreature&&!enemy.hordeEnemy&&!enemy.hordeWarden&&!enemy.ccgBoss&&!enemy.guardian&&!enemy.champion&&!enemy.passiveNpc)}
  function balanceJoystickHunters(){
    if(modeType()||!run||!host?.enemies)return 0;const floor=Math.max(1,Math.min(5,Number(run.floor)||1)),rule=HUNTER_BALANCE[floor];let changed=0;
    for(const enemy of host.enemies){if(!ordinaryHunter(enemy)||enemy._v141r28HunterFloor===floor)continue;const oldMax=Math.max(1,Number(enemy.maxHp||enemy.hp||5)),oldHp=Math.max(1,Number(enemy.hp||oldMax)),damage=Math.max(0,oldMax-oldHp);enemy.maxHp=rule.hp;enemy.hp=Math.max(1,Math.min(rule.hp,rule.hp-damage));enemy.moveSpeedScale=rule.moveSpeedScale;enemy._v141r28HunterFloor=floor;changed++}
    state.huntersBalanced+=changed;return changed;
  }

  function tick(){
    const currentMode=modeType();if(currentMode!==state.lastMode){if(currentMode==="sizzler-saboteurs")clearSpyNotificationLeak();if(currentMode!=="sizzler-saboteurs")state.spyFurnitureKey="";state.lastMode=currentMode}
    installFogGuard();installPlayerResourceGuard();installHordeBannerGuard();installEnemyCardinalFire();installSpyToastGuard();installSpyMajorGuard();
    if(hordeActive()){applyHordeEnemyBalance();applyHordeLoadout();ensureHordeLighting()}
    if(spyActive()){clearSpyNotificationLeak();ensureSpyFurniture()}
    if(!currentMode)balanceJoystickHunters();
  }

  tick();state.timer=setInterval(tick,80);
  addEventListener("pagehide",()=>{if(state.timer)clearInterval(state.timer)},{once:true});
  window.CCGLostSizzlerV141R28={HORDE_SPEED_SCALE,HORDE_LIGHT_RADIUS,HUNTER_BALANCE,SPY_ALLOWED,SPY_DUNGEON_ONLY,applyHordeEnemyBalance,applyHordeLoadout,ensureHordeLighting,cardinalEnemyShot,allowedSpyNotification,ensureSpyFurniture,positionSpyFurniture,balanceJoystickHunters,get state(){return state}};
})();
