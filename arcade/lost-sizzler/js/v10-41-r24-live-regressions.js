/* The Lost Sizzler V10.41 r24 — live regression repair and Solo balance pass.
 *
 * Release blockers covered here:
 * - Spy Vs Spy local movement cannot remain stuck at round start;
 * - ranged enemies receive a reaction beat / occasional hesitation and final 8-way aim;
 * - desktop rating prompt is centred in the viewport;
 * - normal Solo rooms are capped at floor creation without relocating enemies into cleared rooms;
 * - enemy ammo drops award 10 rounds;
 * - ember hazard rooms use varied broken patterns rather than a checkerboard cross-grid;
 * - generated dungeon corridors are audited and deterministic rerolls prefer non-merged layouts;
 * - runaway projectile/effect populations are contained in ordinary Solo Dungeon runs.
 */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V141_R24_LIVE_REGRESSIONS__)return;
  window.__CCG_LOST_SIZZLER_V141_R24_LIVE_REGRESSIONS__=true;

  const held=new Set();
  const SOLO_ORDINARY_ROOM_CAP=3;
  const SOLO_TRAP_ROOM_CAP=2;
  const SOLO_HAZARD_ROOM_CAP=1;
  const SOLO_ARENA_ROOM_CAP=4;
  const SOLO_SPIDER_CAP=6;
  const SOLO_SKELETON_CAP=5;
  const SOLO_ENEMY_AMMO_ROUNDS=10;
  const MAX_SOLO_ENEMY_BULLETS=96;
  const MAX_SOLO_PARTICLES=520;
  const MAX_SOLO_FLOATERS=90;
  const MAX_SOLO_RINGS=80;

  const state={
    updateInstalled:false,controllerOwnedSpyMovement:false,aiInstalled:false,startInstalled:false,worldInstalled:false,ammoInstalled:false,
    spyFallbackMoves:0,spyPrimes:0,delayedEnemyShots:0,hesitatedEnemyShots:0,diagonalEnemyShots:0,
    roomRehomes:0,roomTrims:0,swarmTrims:0,ammoNormalised:0,hazardRoomsRedesigned:0,
    layoutRerolls:0,layoutLastViolations:0,transientTrims:0,
    spyMoveCooldownMs:0,spyRoundKey:"",lastBalanceAt:0,lastFloorKey:"",timer:0
  };

  const specialMode=()=>{try{return String(window.CCGLostSizzlerSpecialModes?.active?.type||document.body?.dataset?.specialMode||"")}catch(_){return""}};
  const spyActive=()=>specialMode()==="sizzler-saboteurs";
  const editable=target=>{try{return typeof Element!=="undefined"&&target instanceof Element&&Boolean(target.closest("input,textarea,select,[contenteditable='true'],[contenteditable='']"))}catch(_){return false}};
  const finite=value=>Number.isFinite(Number(value));
  const roomAt=(x,y)=>{try{return window.CCGWorld?.roomAt?.(world,Number(x),Number(y))??-1}catch(_){return-1}};
  const normalSoloDungeonMode=()=>{
    try{
      if(!run||typeof mode==="undefined"||mode!=="playing"||net?.mode!=="solo")return false;
      if((typeof p2!=="undefined"&&p2)||Boolean(run.daily)||document.body?.dataset?.tutorialActive==="true"||specialMode())return false;
      return true;
    }catch(_){return false}
  };
  const actorModel=player=>{try{return window.CCGLostSizzlerSpecialModes?.active?.state?.players?.find(row=>String(row?.id||"")===String(player?.id||""))||null}catch(_){return null}};
  const spyCanMove=player=>{const model=actorModel(player);return !model||String(model.status||"active")==="active"};

  function spyDirection(){
    const left=held.has("ArrowLeft")||held.has("KeyA"),right=held.has("ArrowRight")||held.has("KeyD"),up=held.has("ArrowUp")||held.has("KeyW"),down=held.has("ArrowDown")||held.has("KeyS");
    const x=(right?1:0)-(left?1:0),y=(down?1:0)-(up?1:0);return x||y?{x,y}:null;
  }

  function activeOthers(player){
    try{
      const list=typeof allPlayers==="function"?allPlayers():[p1,...(remote?.values?.()||[])];
      return list.filter(other=>other&&other!==player&&Number(other.health??1)>0&&spyCanMove(other));
    }catch(_){return[]}
  }

  function walkableStep(player,dx,dy){
    try{
      if(!player||!window.CCGWorld||!world?.map||!host)return null;
      const nx=Number(player.x)+Number(dx),ny=Number(player.y)+Number(dy);
      if(!finite(nx)||!finite(ny)||(dx===0&&dy===0))return null;
      if(dx&&dy){
        if(!window.CCGWorld.walkable(world.map,player.x+dx,player.y,host)||!window.CCGWorld.walkable(world.map,player.x,player.y+dy,host))return null;
      }
      if(!window.CCGWorld.walkable(world.map,nx,ny,host))return null;
      if(activeOthers(player).some(other=>other.x===nx&&other.y===ny))return null;
      return{x:nx,y:ny};
    }catch(_){return null}
  }

  function trySpyFallbackStep(player,dx,dy){
    try{
      if(!spyActive()||typeof mode==="undefined"||mode!=="playing"||!player||!spyCanMove(player)||(player.hitStunMs||0)>0)return false;
      const step=walkableStep(player,Number(dx)||0,Number(dy)||0);if(!step)return false;
      const ox=player.x,oy=player.y;player.x=step.x;player.y=step.y;player.dir={x:Number(dx)||0,y:Number(dy)||0};
      if(!finite(player.rx))player.rx=ox;if(!finite(player.ry))player.ry=oy;
      try{reveal?.(player);markRoomVisit?.(player);rememberTrail?.(player);sync?.()}catch(_){}
      state.spyFallbackMoves++;return true;
    }catch(_){return false}
  }

  function ensureLocalSpySpawn(){
    if(!spyActive())return false;
    let player,active;try{player=p1;active=window.CCGLostSizzlerSpecialModes?.active}catch(_){return false}
    if(!player)return false;
    const round=Number(active?.state?.round||0),key=`${String(active?.seed||"")}|${round}|${String(player.id||"")}`;
    if(state.spyRoundKey===key)return false;state.spyRoundKey=key;
    try{window.CCGLostSizzlerV141BrowserStabilityGameplay?.repairSpySpawn?.()}catch(_){}
    try{player.hitStunMs=0;if(typeof move1!=="undefined")move1=0}catch(_){}
    try{
      const roomId=window.CCGWorld?.roomAt?.(world,player.x,player.y),room=world?.rooms?.[roomId],cardinal=[[1,0],[-1,0],[0,1],[0,-1]];
      if(room&&window.CCGWorld&&!cardinal.some(([dx,dy])=>window.CCGWorld.walkable(world.map,player.x+dx,player.y+dy,host))){
        for(const [dx,dy] of cardinal){
          const nx=player.x+dx,ny=player.y+dy;
          if(nx<=room.x||nx>=room.x+room.w||ny<=room.y||ny>=room.y+room.h)continue;
          if(world.map?.[ny]?.[nx]!=null)world.map[ny][nx]=0;
          if(Array.isArray(host?.blockingDecor))host.blockingDecor=host.blockingDecor.filter(item=>item?.structural||item.x!==nx||item.y!==ny);
        }
        if(host)host.revision=(host.revision||0)+1;
      }
    }catch(_){}
    state.spyMoveCooldownMs=0;state.spyPrimes++;return true;
  }

  function installSpyUpdateGuard(){
    // The isolated Spy engine and six-mode controller now own input cadence and
    // movement. Retain the r24 compatibility API, but never claim window.update.
    state.controllerOwnedSpyMovement=true;state.updateInstalled=true;return true;
  }

  function livingPlayers(players){return(players||[]).filter(player=>player&&Number(player.health||0)>0)}
  function nearestTarget(enemy,players){return livingPlayers(players).sort((a,b)=>Math.hypot(a.x-enemy.x,a.y-enemy.y)-Math.hypot(b.x-enemy.x,b.y-enemy.y))[0]||null}

  function normaliseEnemyShot(hostState,players,shot,nowValue=performance.now(),randomValue=Math.random()){
    if(!shot||typeof shot!=="object"||specialMode())return{shot,suppress:false,reason:"none"};
    const enemy=(hostState?.enemies||[]).find(row=>String(row?.id||"")===String(shot.enemyId||""));
    if(!enemy)return{shot,suppress:false,reason:"none"};
    const now=Number(nowValue)||0,last=Number(enemy._ccgR24ShotAttemptAt||0),fresh=!last||now-last>2800;
    enemy._ccgR24ShotAttemptAt=now;
    if(fresh){state.delayedEnemyShots++;return{shot,suppress:true,reason:"reaction"}}
    if(Number(randomValue)<.2){state.hesitatedEnemyShots++;return{shot,suppress:true,reason:"hesitation"}}
    const target=nearestTarget(enemy,players);if(!target)return{shot,suppress:false,reason:"none"};
    const dx=Math.sign(Number(target.x)-Number(enemy.x)),dy=Math.sign(Number(target.y)-Number(enemy.y));
    if(!dx&&!dy)return{shot,suppress:false,reason:"none"};
    const next={...shot,dx,dy};if(dx&&dy)state.diagonalEnemyShots++;
    return{shot:next,suppress:false,reason:dx&&dy?"diagonal":"aim"};
  }

  function installEnemyFireGuard(){
    const ai=window.CCGAI;if(!ai||typeof ai.stepEnemies!=="function")return false;
    if(ai.stepEnemies.__ccgV141R24EnemyFire){state.aiInstalled=true;return true}
    const original=ai.stepEnemies.bind(ai);
    ai.stepEnemies=function stepEnemiesV141R24EnemyFire(hostState,map,players,dt,hooks={},worldState){
      if(typeof hooks.shoot!=="function")return original(hostState,map,players,dt,hooks,worldState);
      const wrapped={...hooks,shoot:(shot,...rest)=>{
        const decision=normaliseEnemyShot(hostState,players,shot,performance.now(),Math.random());
        if(decision.suppress)return false;
        return hooks.shoot(decision.shot,...rest);
      }};
      return original(hostState,map,players,dt,wrapped,worldState);
    };
    ai.stepEnemies.__ccgV141R24EnemyFire=true;state.aiInstalled=true;return true;
  }

  function hostile(enemy){return Boolean(enemy?.alive&&!enemy?.lostAdventurer&&!enemy?.passiveNpc&&!enemy?.treasureGoblin)}
  function criticalEnemy(enemy){return Boolean(enemy?.guardian||enemy?.exitWarden||enemy?.sigilWarden||enemy?.follower||enemy?.ccgBoss||enemy?.deathStalker||enemy?.voidStalker||enemy?.knight||enemy?.champion)}
  function roomFeature(roomId){
    const room=world?.rooms?.find?.(row=>Number(row?.id)===Number(roomId));
    const trap=Boolean((host?.traps||[]).some(row=>row?.active&&Number(row.roomId)===Number(roomId)));
    const generator=Boolean((host?.generators||[]).some(row=>row?.alive&&Number(row.roomId)===Number(roomId)));
    const arena=Boolean((host?.arenas||[]).some(row=>Number(row.roomId)===Number(roomId)));
    const timed=Boolean((host?.timedRooms||[]).some(row=>Number(row.roomId)===Number(roomId)));
    return{room,trap,generator,arena,timed};
  }
  function stalkerOccupancy(roomId){
    try{return host?.stalker?.awake&&host.stalker?.active!==false&&roomAt(host.stalker.x,host.stalker.y)===Number(roomId)?1:0}catch(_){return 0}
  }
  function roomLimit(roomId){
    const {room,trap,generator,arena,timed}=roomFeature(roomId);if(!room)return SOLO_ORDINARY_ROOM_CAP;
    if(room.sanctuary)return 0;
    if(room.dedicatedHazard)return SOLO_HAZARD_ROOM_CAP;
    if(room.spiderNest)return SOLO_SPIDER_CAP;
    if(room.skeletonHorde)return SOLO_SKELETON_CAP;
    if(room.sigilRoom||arena||timed)return SOLO_ARENA_ROOM_CAP;
    if(trap||generator)return SOLO_TRAP_ROOM_CAP;
    return SOLO_ORDINARY_ROOM_CAP;
  }

  function roomHostiles(roomId){return(host?.enemies||[]).filter(enemy=>hostile(enemy)&&roomAt(enemy.x,enemy.y)===Number(roomId))}

  function trimSpecialSwarms(){
    if(!normalSoloDungeonMode()||!host?.enemies)return 0;
    let removed=0;
    for(const room of world?.rooms||[]){
      const cap=room?.spiderNest?SOLO_SPIDER_CAP:room?.skeletonHorde?SOLO_SKELETON_CAP:0;if(!cap)continue;
      const members=roomHostiles(room.id).filter(enemy=>room.spiderNest?enemy.spider:enemy.skeleton);
      for(const enemy of members.slice(cap)){enemy.alive=false;removed++;state.swarmTrims++}
      if(room.spiderNest&&host.spiderNest?.roomId===room.id)host.spiderNest.enemyIds=(host.spiderNest.enemyIds||[]).filter(id=>host.enemies.some(enemy=>enemy.id===id&&enemy.alive));
      if(room.skeletonHorde&&host.skeletonHorde?.roomId===room.id)host.skeletonHorde.enemyIds=(host.skeletonHorde.enemyIds||[]).filter(id=>host.enemies.some(enemy=>enemy.id===id&&enemy.alive));
    }
    if(removed)host.revision=(host.revision||0)+1;
    return removed;
  }

  function rebalanceRoomPopulation(){
    if(!normalSoloDungeonMode()||!host?.enemies||!world?.rooms)return 0;
    let trimmed=0;
    for(const enemy of host.enemies)if(hostile(enemy)){const rid=roomAt(enemy.x,enemy.y);if(rid>=0&&enemy._ccgR24LastRoomId==null)enemy._ccgR24LastRoomId=rid}
    for(const room of world.rooms){
      const all=roomHostiles(room.id),effectiveCap=Math.max(0,roomLimit(room.id)-stalkerOccupancy(room.id));
      if(all.length<=effectiveCap)continue;
      const ordered=[...all].sort((a,b)=>Number(criticalEnemy(b))-Number(criticalEnemy(a))||String(a.id||"").localeCompare(String(b.id||"")));
      const overflow=ordered.slice(effectiveCap);
      for(const enemy of overflow){
        if(criticalEnemy(enemy))continue;
        enemy.alive=false;trimmed++;state.roomTrims++;
      }
    }
    if(trimmed)host.revision=(host.revision||0)+1;
    return trimmed;
  }

  function normaliseEnemyAmmoDrops(){
    if(!host?.items)return 0;let changed=0;
    for(const item of host.items){
      if(!item?.v141SoloEnemyAmmo)continue;
      if(Number(item.ammoRounds)!==SOLO_ENEMY_AMMO_ROUNDS){item.ammoRounds=SOLO_ENEMY_AMMO_ROUNDS;changed++}
      if(item.title!=="ENEMY AMMO DROP · 10 ROUNDS"){item.title="ENEMY AMMO DROP · 10 ROUNDS";changed++}
    }
    if(changed){state.ammoNormalised+=changed;host.revision=(host.revision||0)+1}
    return changed;
  }

  function installAmmoPickupGuard(){
    if(typeof window.applyItem!=="function")return false;
    if(window.applyItem.__ccgV141R24TenAmmo){state.ammoInstalled=true;return true}
    const original=window.applyItem;
    window.applyItem=function applyItemV141R24TenAmmo(item){
      if(!item?.v141SoloEnemyAmmo)return original.apply(this,arguments);
      const hadFlag=Object.prototype.hasOwnProperty.call(item,"v141SoloEnemyAmmo"),oldFlag=item.v141SoloEnemyAmmo,hadReserve=Object.prototype.hasOwnProperty.call(item,"v130ReserveAmmo"),oldReserve=item.v130ReserveAmmo,oldRounds=item.ammoRounds,oldTitle=item.title;
      item.v141SoloEnemyAmmo=false;item.v130ReserveAmmo=true;item.ammoRounds=SOLO_ENEMY_AMMO_ROUNDS;item.title="ENEMY AMMO DROP · 10 ROUNDS";
      try{return original.apply(this,arguments)}finally{item.ammoRounds=oldRounds;item.title=oldTitle;if(hadFlag)item.v141SoloEnemyAmmo=oldFlag;else delete item.v141SoloEnemyAmmo;if(hadReserve)item.v130ReserveAmmo=oldReserve;else delete item.v130ReserveAmmo}
    };
    window.applyItem.__ccgV141R24TenAmmo=true;state.ammoInstalled=true;return true;
  }

  function redesignEmberHazard(hazard,index=0){
    const room=world?.rooms?.find?.(row=>Number(row?.id)===Number(hazard?.roomId));if(!room||hazard?.type!=="embers")return false;
    const pattern=(Number(room.id||0)+Number(run?.floor||1)+index)%3,cells=[];
    for(let y=room.y+1;y<room.y+room.h;y++)for(let x=room.x+1;x<room.x+room.w;x++){
      const lx=x-room.x,ly=y-room.y;let include=false,group=0;
      if(pattern===0){
        include=(lx%3===0&&((ly+Math.floor(lx/3))%4!==1))||(ly===1&&lx%4===2)||(ly===room.h-1&&lx%4===0);
        group=(Math.floor(lx/3)+ly)%3;
      }else if(pattern===1){
        const island=((Math.floor((lx+1)/3)+Math.floor((ly+2)/3))%2===0),gap=(lx+2*ly)%5===0;
        include=island&&!gap;
        if((lx===1||lx===room.w-1)&&ly%4===2)include=true;
        group=(Math.floor(lx/3)+Math.floor(ly/3))%3;
      }else{
        include=(ly%3===1&&((lx+ly)%5!==0))||(lx%5===2&&ly%4===0);
        if((ly===1||ly===room.h-1)&&lx%5===1)include=true;
        group=(Math.floor(ly/3)+lx)%3;
      }
      if(include)cells.push({x,y,group});
    }
    const interior=Math.max(1,(room.w-1)*(room.h-1));
    if(cells.length<Math.floor(interior*.22)||cells.length>Math.ceil(interior*.62))return false;
    hazard.cells=cells;hazard.groups=3;hazard.period=2700;hazard.warningMs=850;hazard.activeMs=600;
    hazard.title=pattern===0?"FURNACE STEP CHAMBER":pattern===1?"CINDER ISLAND VAULT":"EMBER BREAK-LANE ROOM";
    hazard.r24Pattern=pattern;state.hazardRoomsRedesigned++;return true;
  }
  function redesignHazardRooms(){
    if(!normalSoloDungeonMode()||!host?.hazardRooms)return 0;let count=0;
    host.hazardRooms.forEach((hazard,index)=>{if(hazard.r24Pattern==null&&redesignEmberHazard(hazard,index))count++});
    if(count)host.revision=(host.revision||0)+1;
    return count;
  }

  function trimTransientLoad(){
    if(!normalSoloDungeonMode())return 0;let trimmed=0;
    const cap=(list,max)=>{if(!Array.isArray(list)||list.length<=max)return;const n=list.length-max;list.splice(0,n);trimmed+=n};
    try{cap(enemyBullets,MAX_SOLO_ENEMY_BULLETS);cap(particles,MAX_SOLO_PARTICLES);cap(floaters,MAX_SOLO_FLOATERS);cap(rings,MAX_SOLO_RINGS)}catch(_){}
    if(trimmed){state.transientTrims+=trimmed}
    return trimmed;
  }

  function corridorLayoutAudit(candidate){
    if(!candidate?.map||!candidate?.rooms)return{violations:999,mergedComponents:999,multiEntrances:999};
    const map=candidate.map,height=map.length,width=map[0]?.length||0,roomGrid=Array.from({length:height},()=>new Int16Array(width).fill(-1));
    for(const room of candidate.rooms||[])for(let y=Math.max(0,room.y);y<=Math.min(height-1,room.y+room.h);y++)for(let x=Math.max(0,room.x);x<=Math.min(width-1,room.x+room.w);x++)if(map[y]?.[x]===0)roomGrid[y][x]=Number(room.id);
    const seen=new Set(),dirs=[[1,0],[-1,0],[0,1],[0,-1]];let mergedComponents=0,multiEntrances=0;
    for(let sy=1;sy<height-1;sy++)for(let sx=1;sx<width-1;sx++){
      const startKey=`${sx},${sy}`;if(seen.has(startKey)||map[sy]?.[sx]!==0||roomGrid[sy][sx]>=0)continue;
      const queue=[[sx,sy]],contacts=new Map();seen.add(startKey);
      for(let i=0;i<queue.length;i++){
        const [x,y]=queue[i];
        for(const [dx,dy] of dirs){
          const nx=x+dx,ny=y+dy;if(nx<1||ny<1||nx>=width-1||ny>=height-1)continue;
          const rid=roomGrid[ny][nx];
          if(rid>=0){if(!contacts.has(rid))contacts.set(rid,[]);contacts.get(rid).push({x,y});continue}
          const key=`${nx},${ny}`;if(seen.has(key)||map[ny]?.[nx]!==0)continue;seen.add(key);queue.push([nx,ny]);
        }
      }
      if(contacts.size>2)mergedComponents+=contacts.size-2;
      for(const points of contacts.values()){
        const unique=[...new Map(points.map(p=>[`${p.x},${p.y}`,p])).values()];
        let clusters=0;const pending=new Set(unique.map(p=>`${p.x},${p.y}`));
        while(pending.size){clusters++;const first=pending.values().next().value,stack=[first];pending.delete(first);while(stack.length){const key=stack.pop(),[x,y]=key.split(",").map(Number);for(const [dx,dy] of dirs){const next=`${x+dx},${y+dy}`;if(pending.delete(next))stack.push(next)}}}
        if(clusters>1)multiEntrances+=clusters-1;
      }
    }
    const pairs=new Set();let duplicateEdges=0;for(const edge of candidate.edges||[]){const key=[Number(edge.a),Number(edge.b)].sort((a,b)=>a-b).join("-");if(pairs.has(key))duplicateEdges++;else pairs.add(key)}
    return{violations:mergedComponents*3+multiEntrances*2+duplicateEdges*5,mergedComponents,multiEntrances,duplicateEdges};
  }

  function installWorldGeneratorGuard(){
    const api=window.CCGWorld;if(!api||typeof api.generate!=="function")return false;
    if(api.generate.__ccgV141R24CorridorAudit){state.worldInstalled=true;return true}
    const original=api.generate.bind(api);
    api.generate=function generateV141R24CorridorAudit(seedText){
      let best=original(seedText),audit=corridorLayoutAudit(best);if(audit.violations<=0){best.r24LayoutAudit=audit;return best}
      for(let attempt=1;attempt<=4;attempt++){
        const candidate=original(`${seedText}|R24-LAYOUT-${attempt}`),next=corridorLayoutAudit(candidate);
        if(next.violations<audit.violations){best=candidate;audit=next;state.layoutRerolls++}
        if(audit.violations<=0)break;
      }
      best.r24LayoutAudit=audit;state.layoutLastViolations=audit.violations;return best;
    };
    api.generate.__ccgV141R24CorridorAudit=true;state.worldInstalled=true;return true;
  }

  function rebalanceFloor(reason="sweep"){
    if(!normalSoloDungeonMode())return false;
    trimSpecialSwarms();redesignHazardRooms();normaliseEnemyAmmoDrops();rebalanceRoomPopulation();trimTransientLoad();
    try{if(host)host.r24SoloBalance={ordinaryRoomCap:SOLO_ORDINARY_ROOM_CAP,trapRoomCap:SOLO_TRAP_ROOM_CAP,hazardRoomCap:SOLO_HAZARD_ROOM_CAP,spiderCap:SOLO_SPIDER_CAP,skeletonCap:SOLO_SKELETON_CAP,respawnPolicy:"no-standard-room-rehome",reason}}
    catch(_){}
    return true;
  }

  function installStartGuard(){
    if(typeof window.startWorld!=="function")return false;
    if(window.startWorld.__ccgV141R24SoloBalance){state.startInstalled=true;return true}
    const original=window.startWorld;
    window.startWorld=function startWorldV141R24SoloBalance(){
      const result=original.apply(this,arguments);
      setTimeout(()=>{try{rebalanceFloor("floor-start")}catch(error){console.warn("[Lost Sizzler r24] Solo balance start sweep failed safely",error)}},0);
      return result;
    };
    window.startWorld.__ccgV141R24SoloBalance=true;state.startInstalled=true;return true;
  }

  function installRatingCentreStyle(){
    if(document.getElementById("ccg-v141-r24-rating-centre"))return true;
    const style=document.createElement("style");style.id="ccg-v141-r24-rating-centre";
    style.textContent=`
      @media (min-width:901px){
        #ccg-rating-panel:not(.hidden){
          position:fixed!important;left:50%!important;top:50%!important;right:auto!important;bottom:auto!important;
          width:min(760px,calc(100vw - 48px))!important;max-width:760px!important;max-height:calc(100dvh - 48px)!important;
          margin:0!important;transform:translate(-50%,-50%)!important;z-index:12050!important;overflow:auto!important;
        }
        #ccg-rating-panel>.ccg-rating-rail-card,#ccg-rating-panel>.panel{width:100%!important;max-width:none!important;margin:0!important;box-sizing:border-box!important}
      }
    `;
    document.head.appendChild(style);return true;
  }

  function balanceTick(){
    if(!normalSoloDungeonMode())return;
    const now=performance.now();if(now-state.lastBalanceAt<350)return;state.lastBalanceAt=now;
    const floorKey=`${String(run?.seed||"")}|${Number(run?.floor||1)}`;
    if(state.lastFloorKey!==floorKey){state.lastFloorKey=floorKey;rebalanceFloor("new-floor");return}
    normaliseEnemyAmmoDrops();trimTransientLoad();
  }

  function install(){
    installWorldGeneratorGuard();installStartGuard();installSpyUpdateGuard();installEnemyFireGuard();installAmmoPickupGuard();installRatingCentreStyle();
    try{ensureLocalSpySpawn()}catch(_){}
    try{balanceTick()}catch(_){}
    return state.updateInstalled&&state.aiInstalled&&state.startInstalled&&state.worldInstalled&&state.ammoInstalled;
  }

  install();state.timer=setInterval(()=>{install();balanceTick()},180);
  addEventListener("pagehide",()=>{held.clear();if(state.timer)clearInterval(state.timer);state.timer=0},{once:true});
  window.CCGLostSizzlerV141R24LiveRegressions={
    install,spyDirection,spyCanMove,walkableStep,trySpyFallbackStep,ensureLocalSpySpawn,normaliseEnemyShot,
    normalSoloDungeonMode,roomLimit,roomHostiles,rebalanceRoomPopulation,trimSpecialSwarms,normaliseEnemyAmmoDrops,
    redesignEmberHazard,redesignHazardRooms,corridorLayoutAudit,rebalanceFloor,
    constants:{SOLO_ORDINARY_ROOM_CAP,SOLO_TRAP_ROOM_CAP,SOLO_HAZARD_ROOM_CAP,SOLO_ARENA_ROOM_CAP,SOLO_SPIDER_CAP,SOLO_SKELETON_CAP,SOLO_ENEMY_AMMO_ROUNDS,MAX_SOLO_ENEMY_BULLETS},
    get state(){return state}
  };
})();