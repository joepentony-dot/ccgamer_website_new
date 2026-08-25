/* The Lost Sizzler V10.41 — sanctuary challenge/progression hardening. */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V141_SANCTUARY_HARDENING__)return;
  window.__CCG_LOST_SIZZLER_V141_SANCTUARY_HARDENING__=true;

  const ADVENTURER_SCORE_REWARD=1000;
  const ADVENTURER_XP_REWARD=200;
  const ADVENTURER_RECRUIT_DISTANCE=5;
  const ADVENTURER_STEP_MS=340;
  const ADVENTURER_CATCHUP_MS=1800;
  const state={installed:false,startWrapped:false,updateWrapped:false,arenaWrapped:false,timedWrapped:false,doorWrapped:false,drawWrapped:false,lastSweep:0,released:0,removedChallenges:0};

  const sanctuaryIds=()=>new Set((world?.rooms||[]).filter(room=>room?.sanctuary).map(room=>Number(room.id)));
  const roomById=id=>(world?.rooms||[]).find(room=>Number(room?.id)===Number(id))||null;
  const isSanctuaryRoomId=id=>Boolean(roomById(id)?.sanctuary);
  const escortPlayers=()=>{
    try{
      const list=typeof allPlayers==="function"?allPlayers():[p1,p2].filter(Boolean);
      return (list||[]).filter(player=>player&&(player.health==null||Number(player.health)>0));
    }catch(_){return[p1,p2].filter(Boolean)}
  };
  const escortPlayerId=player=>String(player?.id??player?.playerId??player?.sessionId??"");
  const escortDistance=(a,b)=>Math.hypot(Number(a?.x||0)-Number(b?.x||0),Number(a?.y||0)-Number(b?.y||0));
  const roomIdAt=(x,y)=>{try{return W.roomAt?.(world,Number(x),Number(y))}catch(_){return null}};

  function adjacentSanctuary(x,y){
    if(!world)return false;
    const points=[[0,0],[1,0],[-1,0],[0,1],[0,-1]];
    for(const [dx,dy] of points){
      try{
        const id=W.roomAt?.(world,Number(x)+dx,Number(y)+dy);
        if(id!=null&&id>=0&&isSanctuaryRoomId(id))return true;
      }catch(_){}
    }
    return false;
  }

  function sanctuaryDoor(door,ids=sanctuaryIds()){
    if(!door||door.type==="secret"||door.sigilGate||door.sigilAnnex)return false;
    return ids.has(Number(door.roomId))||adjacentSanctuary(door.x,door.y);
  }

  function releaseDoorGroup(door,ids){
    if(!door||!host)return 0;
    const leaves=door.groupId?(host.doors||[]).filter(item=>item.groupId===door.groupId):[door];
    let changed=0;
    for(const leaf of leaves){
      if(!sanctuaryDoor(leaf,ids)&&!sanctuaryDoor(door,ids))continue;
      const wasBlocked=Boolean(leaf.locked||leaf.opening||!leaf.open);
      leaf.locked=false;
      leaf.open=true;
      leaf.opening=false;
      leaf.openingStart=0;
      leaf.openAt=0;
      leaf.openSoundDone=true;
      leaf.sanctuarySafeDoor=true;
      if(wasBlocked)changed++;
    }
    if(changed){host.revision=(host.revision||0)+1;state.released+=changed}
    return changed;
  }

  function stripSanctuaryChallenges(){
    if(!world||!host)return{removed:0,released:0};
    const ids=sanctuaryIds();
    if(!ids.size)return{removed:0,released:0};
    let removed=0,released=0;

    for(const key of ["arenas","timedRooms"]){
      if(!Array.isArray(host[key]))continue;
      const before=host[key].length;
      host[key]=host[key].filter(challenge=>!ids.has(Number(challenge?.roomId)));
      removed+=before-host[key].length;
    }

    for(const room of world.rooms||[]){
      if(!room?.sanctuary)continue;
      room.dangerous=false;
      room.arenaRoom=false;
      room.timedRoom=false;
      room.challengeRoom=false;
    }

    for(const door of host.doors||[]){
      if(door.type!=="room"||!sanctuaryDoor(door,ids))continue;
      released+=releaseDoorGroup(door,ids);
    }

    if(removed){
      state.removedChallenges+=removed;
      host.revision=(host.revision||0)+1;
      try{broadcastWorld?.()}catch(_){}
    }
    return{removed,released};
  }

  function sanctuaryPlayer(player){
    if(!player||!world)return false;
    try{return Boolean(roomById(W.roomAt(world,player.x,player.y))?.sanctuary)}catch(_){return false}
  }

  function adventurerEntity(){
    return(host?.enemies||[]).find(enemy=>enemy?.alive&&enemy.lostAdventurer)||null;
  }

  function escortTarget(adventurer){
    const players=escortPlayers();
    if(!players.length)return null;
    const wanted=String(adventurer?._v141EscortPlayerId||"");
    if(wanted){
      const matched=players.find(player=>escortPlayerId(player)===wanted);
      if(matched)return matched;
    }
    return[...players].sort((a,b)=>escortDistance(adventurer,a)-escortDistance(adventurer,b))[0]||null;
  }

  function escortCellBlocked(x,y,adventurer){
    if(!world?.map?.[y]||world.map[y][x]!==0)return true;
    try{if(!W.walkable(world.map,x,y,host))return true}catch(_){return true}
    if((host?.enemies||[]).some(enemy=>enemy!==adventurer&&enemy?.alive&&enemy.x===x&&enemy.y===y))return true;
    if((host?.blockingDecor||[]).some(item=>item?.x===x&&item?.y===y))return true;
    if(escortPlayers().some(player=>player?.x===x&&player?.y===y))return true;
    return false;
  }

  function escortGoalCells(target,adventurer){
    if(!target)return[];
    const cells=[];
    for(let radius=1;radius<=2;radius++){
      for(let dy=-radius;dy<=radius;dy++)for(let dx=-radius;dx<=radius;dx++){
        if(Math.max(Math.abs(dx),Math.abs(dy))!==radius)continue;
        const x=Number(target.x)+dx,y=Number(target.y)+dy;
        if(escortCellBlocked(x,y,adventurer))continue;
        cells.push({x,y});
      }
      if(cells.length)break;
    }
    return cells;
  }

  function nextEscortStep(adventurer,target){
    if(!adventurer||!target)return null;
    const goals=escortGoalCells(target,adventurer);
    if(!goals.length)return null;
    const goalKeys=new Set(goals.map(cell=>`${cell.x},${cell.y}`));
    const start={x:Number(adventurer.x),y:Number(adventurer.y)},startKey=`${start.x},${start.y}`;
    if(goalKeys.has(startKey))return null;
    const queue=[start],previous=new Map([[startKey,null]]),nodes=new Map([[startKey,start]]);
    const dirs=[[1,0],[-1,0],[0,1],[0,-1]];
    let found="";
    for(let index=0;index<queue.length&&index<3500;index++){
      const current=queue[index];
      for(const [dx,dy] of dirs){
        const next={x:current.x+dx,y:current.y+dy},key=`${next.x},${next.y}`;
        if(previous.has(key)||escortCellBlocked(next.x,next.y,adventurer))continue;
        previous.set(key,`${current.x},${current.y}`);nodes.set(key,next);
        if(goalKeys.has(key)){found=key;index=queue.length;break}
        queue.push(next);
      }
    }
    if(!found)return null;
    let cursor=found,parent=previous.get(cursor);
    while(parent&&parent!==startKey){cursor=parent;parent=previous.get(cursor)}
    return nodes.get(cursor)||null;
  }

  function safeEscortCatchupCell(target,adventurer){
    if(!target)return null;
    for(let radius=1;radius<=3;radius++){
      const cells=[];
      for(let dy=-radius;dy<=radius;dy++)for(let dx=-radius;dx<=radius;dx++){
        if(Math.max(Math.abs(dx),Math.abs(dy))!==radius)continue;
        const x=Number(target.x)+dx,y=Number(target.y)+dy;
        if(escortCellBlocked(x,y,adventurer))continue;
        cells.push({x,y});
      }
      if(cells.length){
        cells.sort((a,b)=>Math.abs(a.x-target.x)+Math.abs(a.y-target.y)-(Math.abs(b.x-target.x)+Math.abs(b.y-target.y)));
        return cells[0];
      }
    }
    return null;
  }

  function moveAdventurer(adventurer,target,dt){
    adventurer._v141EscortMoveMs=Math.max(0,Number(adventurer._v141EscortMoveMs||0)-Math.max(0,Number(dt||0)));
    if(adventurer._v141EscortMoveMs>0)return false;
    adventurer._v141EscortMoveMs=ADVENTURER_STEP_MS;
    if(escortDistance(adventurer,target)<=1.45){adventurer._v141EscortStuckMs=0;return false}
    const step=nextEscortStep(adventurer,target);
    if(step){
      const ox=adventurer.x,oy=adventurer.y;
      adventurer.x=step.x;adventurer.y=step.y;adventurer.rx=step.x;adventurer.ry=step.y;
      adventurer.facing={x:Math.sign(step.x-ox)||adventurer.facing?.x||1,y:Math.sign(step.y-oy)||0};
      adventurer._v141EscortStuckMs=0;
      if(host)host.revision=(host.revision||0)+1;
      return true;
    }
    adventurer._v141EscortStuckMs=Number(adventurer._v141EscortStuckMs||0)+ADVENTURER_STEP_MS;
    if(adventurer._v141EscortStuckMs>=ADVENTURER_CATCHUP_MS&&escortDistance(adventurer,target)>4){
      const catchup=safeEscortCatchupCell(target,adventurer);
      if(catchup){
        adventurer.x=catchup.x;adventurer.y=catchup.y;adventurer.rx=catchup.x;adventurer.ry=catchup.y;
        adventurer._v141EscortStuckMs=0;
        if(host)host.revision=(host.revision||0)+1;
        return true;
      }
    }
    return false;
  }

  function awardAdventurerXp(player){
    if(!player)return 0;
    try{
      const result=window.CCGProgression?.gainXP?.(player,run,ADVENTURER_XP_REWARD,"Lost Adventurer Rescue");
      if(result&&Number.isFinite(Number(result.amount)))return Number(result.amount);
    }catch(error){console.warn("[Lost Sizzler V10.41] adventurer XP award fallback",error)}
    player.xp=Math.max(0,Number(player.xp||0))+ADVENTURER_XP_REWARD;
    player.totalXp=Math.max(0,Number(player.totalXp||0))+ADVENTURER_XP_REWARD;
    if(run)run.floorXP=Math.max(0,Number(run.floorXP||0))+ADVENTURER_XP_REWARD;
    return ADVENTURER_XP_REWARD;
  }

  function rescueAdventurer(adventurer,target){
    if(!adventurer?.alive||adventurer._v141EscortRescued)return false;
    adventurer._v141EscortRescued=true;
    adventurer.rescued=true;
    adventurer.alive=false;
    score=Math.max(0,Number(score||0))+ADVENTURER_SCORE_REWARD;
    awardAdventurerXp(target);
    if(host)host.revision=(host.revision||0)+1;
    try{showToast("ADVENTURER RESCUED","Safe at last! +1,000 score and +200 XP.","green",9000)}catch(_){}
    try{floatText?.(target?.x??adventurer.x,target?.y??adventurer.y,"+1000 SCORE / +200 XP",P?.gold||"#ffd75a")}catch(_){}
    try{broadcastWorld?.();sync?.()}catch(_){}
    return true;
  }

  function updateLostAdventurerEscort(dt){
    if(!host||!world||mode!=="playing")return false;
    const adventurer=adventurerEntity();
    if(!adventurer)return false;
    let target=escortTarget(adventurer);
    if(!target)return false;

    const sameRoom=roomIdAt(adventurer.x,adventurer.y)!=null&&roomIdAt(adventurer.x,adventurer.y)===roomIdAt(target.x,target.y);
    if(!adventurer.following&&(sameRoom||escortDistance(adventurer,target)<=ADVENTURER_RECRUIT_DISTANCE)){
      adventurer.following=true;
      adventurer.passiveNpc=true;
      adventurer._v141EscortPlayerId=escortPlayerId(target);
      adventurer._v141EscortMoveMs=0;
      adventurer._v141EscortStuckMs=0;
      if(!adventurer._v141EscortAnnounced){
        adventurer._v141EscortAnnounced=true;
        try{showToast("LOST ADVENTURER","Please get me out of here! I'll follow you. Lead me to any SANCTUARY. Reward: +1,000 score and +200 XP.","cyan",11500)}catch(_){}
      }
      if(host)host.revision=(host.revision||0)+1;
    }

    if(!adventurer.following)return false;
    target=escortTarget(adventurer)||target;
    const adventurerSafe=isSanctuaryRoomId(roomIdAt(adventurer.x,adventurer.y));
    const escortSafe=sanctuaryPlayer(target)&&escortDistance(adventurer,target)<=2.25;
    if(adventurerSafe||escortSafe)return rescueAdventurer(adventurer,target);
    return moveAdventurer(adventurer,target,dt);
  }

  function drawFriendlyAdventurer(enemy){
    if(!enemy?.lostAdventurer)return false;
    const s=typeof enemyScreen==="function"?enemyScreen(enemy):typeof ws==="function"?ws(enemy.x,enemy.y):{x:enemy.x*C.tile,y:enemy.y*C.tile};
    const tile=Math.max(24,Number(C?.tile||32)),u=tile/32,cx=s.x+tile/2,cy=s.y+tile/2;
    const bob=Math.sin(performance.now()/240)*.7;
    const flip=Number(enemy.facing?.x||1)<0?-1:1;
    ctx.save();
    ctx.translate(cx,cy+bob);
    ctx.scale(flip*u,u);
    ctx.shadowBlur=7/u;ctx.shadowColor="rgba(87,214,255,.55)";

    ctx.fillStyle="rgba(0,0,0,.28)";ctx.beginPath();ctx.ellipse(0,12,9,3,0,0,Math.PI*2);ctx.fill();
    ctx.shadowBlur=0;

    ctx.fillStyle="#5a3b24";ctx.fillRect(-8,-2,5,12);
    ctx.fillStyle="#735036";ctx.fillRect(-10,0,4,9);

    ctx.fillStyle="#315f54";ctx.fillRect(-6,-2,12,12);
    ctx.fillStyle="#3f7d68";ctx.fillRect(-7,0,14,7);
    ctx.fillStyle="#d5b06f";ctx.fillRect(-6,5,12,2);

    ctx.fillStyle="#d8aa7b";ctx.fillRect(-10,0,3,8);ctx.fillRect(7,-4,3,9);
    ctx.fillStyle="#d8aa7b";ctx.beginPath();ctx.arc(8,-6,2.2,0,Math.PI*2);ctx.fill();

    ctx.fillStyle="#263848";ctx.fillRect(-5,10,4,6);ctx.fillRect(1,10,4,6);
    ctx.fillStyle="#4a3024";ctx.fillRect(-6,15,5,2);ctx.fillRect(1,15,5,2);

    ctx.fillStyle="#d8aa7b";ctx.beginPath();ctx.arc(0,-8,6.2,0,Math.PI*2);ctx.fill();
    ctx.fillStyle="#6d472b";ctx.beginPath();ctx.arc(0,-10,6.4,Math.PI,Math.PI*2);ctx.fill();ctx.fillRect(-6,-10,2,4);ctx.fillRect(4,-10,2,3);
    ctx.fillStyle="#f3d59f";ctx.fillRect(-4,-8,8,4);
    ctx.fillStyle="#24313a";ctx.fillRect(-3,-7,1.4,1.4);ctx.fillRect(2,-7,1.4,1.4);
    ctx.strokeStyle="#7b3f2b";ctx.lineWidth=1;ctx.beginPath();ctx.arc(0,-4,2.6,.2,Math.PI-.2);ctx.stroke();

    ctx.fillStyle="#6b4c2f";ctx.fillRect(-4,-15,8,2);
    ctx.fillStyle="#4f8f70";ctx.beginPath();ctx.moveTo(-5,-14);ctx.lineTo(5,-14);ctx.lineTo(1,-18);ctx.closePath();ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.font=`bold ${Math.max(9,Math.round(tile*.23))}px monospace`;
    ctx.textAlign="center";ctx.textBaseline="bottom";
    ctx.lineWidth=3;ctx.strokeStyle="rgba(0,0,0,.8)";ctx.strokeText("LOST ADVENTURER",cx,s.y-4);
    ctx.fillStyle="#9be7ff";ctx.fillText("LOST ADVENTURER",cx,s.y-4);
    ctx.restore();
    return true;
  }

  function installStartGuard(){
    if(state.startWrapped||typeof startWorld!=="function")return state.startWrapped;
    const original=startWorld;
    startWorld=function startWorldV141SanctuaryHardening(){
      const result=original.apply(this,arguments);
      try{stripSanctuaryChallenges()}catch(error){console.warn("[Lost Sizzler V10.41] sanctuary floor hardening failed safely",error)}
      return result;
    };
    state.startWrapped=true;
    return true;
  }

  function installArenaGuard(){
    if(state.arenaWrapped||typeof triggerArena!=="function")return state.arenaWrapped;
    const original=triggerArena;
    triggerArena=function triggerArenaV141SanctuaryGuard(player){
      if(sanctuaryPlayer(player)){
        stripSanctuaryChallenges();
        return;
      }
      return original.apply(this,arguments);
    };
    state.arenaWrapped=true;
    return true;
  }

  function installTimedGuard(){
    if(state.timedWrapped||typeof triggerTimed!=="function")return state.timedWrapped;
    const original=triggerTimed;
    triggerTimed=function triggerTimedV141SanctuaryGuard(player){
      if(sanctuaryPlayer(player)){
        stripSanctuaryChallenges();
        return;
      }
      return original.apply(this,arguments);
    };
    state.timedWrapped=true;
    return true;
  }

  function installDoorFailSafe(){
    if(state.doorWrapped||typeof tryDoor!=="function")return state.doorWrapped;
    const original=tryDoor;
    tryDoor=function tryDoorV141SanctuaryFailSafe(player,x,y){
      const door=host&&W?.doorAt?.(host,x,y);
      if(door&&door.type==="room"&&sanctuaryDoor(door)){
        const changed=releaseDoorGroup(door,sanctuaryIds());
        if(changed){
          try{showToast("SANCTUARY EXIT RELEASED","Sanctuary doors can never be sealed by dungeon challenges.","green",4200)}catch(_){}
          try{broadcastWorld?.()}catch(_){}
        }
        return true;
      }
      return original.apply(this,arguments);
    };
    state.doorWrapped=true;
    return true;
  }

  function installAdventurerDrawGuard(){
    if(state.drawWrapped||typeof drawEnemy!=="function")return state.drawWrapped;
    const original=drawEnemy;
    drawEnemy=function drawEnemyV141FriendlyAdventurer(enemy){
      if(enemy?.lostAdventurer){drawFriendlyAdventurer(enemy);return}
      return original.apply(this,arguments);
    };
    state.drawWrapped=true;
    return true;
  }

  function installUpdateSweep(){
    if(state.updateWrapped||typeof update!=="function")return state.updateWrapped;
    const original=update;
    update=function updateV141SanctuaryHardening(dt){
      try{updateLostAdventurerEscort(Number(dt)||0)}catch(error){console.warn("[Lost Sizzler V10.41] adventurer escort hardening failed safely",error)}
      const result=original.apply(this,arguments);
      const now=performance.now();
      if(now-state.lastSweep>=450){
        state.lastSweep=now;
        try{stripSanctuaryChallenges()}catch(_){}
      }
      return result;
    };
    state.updateWrapped=true;
    return true;
  }

  function install(){
    const ready=installStartGuard()&&installArenaGuard()&&installTimedGuard()&&installDoorFailSafe()&&installAdventurerDrawGuard()&&installUpdateSweep();
    if(ready){
      state.installed=true;
      try{stripSanctuaryChallenges()}catch(_){}
      document.body.dataset.v141SanctuaryHardening="true";
      document.body.dataset.v141LostAdventurerEscort="true";
    }
    return ready;
  }

  let attempts=0;
  const timer=setInterval(()=>{
    attempts++;
    if(install()||attempts>240)clearInterval(timer);
  },100);
  install();
  window.addEventListener("pagehide",()=>clearInterval(timer),{once:true});
  window.CCGLostSizzlerSanctuaryHardeningV141={state,stripSanctuaryChallenges,releaseDoorGroup,updateLostAdventurerEscort,drawFriendlyAdventurer,install};
})();