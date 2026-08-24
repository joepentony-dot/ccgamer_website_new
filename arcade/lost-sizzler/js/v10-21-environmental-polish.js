/* The Lost Sizzler V10.21 — door geometry, rare vortex pits and environmental combat polish. */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_ENVIRONMENTAL_POLISH_V121__)return;
  window.__CCG_LOST_SIZZLER_ENVIRONMENTAL_POLISH_V121__=true;

  const PIT_RUN_CHANCE=.04;
  const PIT_MIN_FLOOR=3;
  const PIT_MAX_FLOOR=5;
  const PIT_PLAYER_DAMAGE=1;
  const PIT_WARN_DISTANCE=4;
  const TRAP_ENEMY_DAMAGE=2;
  const state={
    worldKey:"",
    warnedPlayers:new Set(),
    trainingWarned:false,
    lastAmbientAt:0,
    installed:{startWorld:false,ai:false,knock:false,move:false,update:false,render:false,doors:false,network:false}
  };

  function hash32(value){
    let h=2166136261>>>0;
    const text=String(value||"");
    for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619)}
    h+=h<<13;h^=h>>>7;h+=h<<3;h^=h>>>17;h+=h<<5;
    return h>>>0;
  }
  const unit=value=>hash32(value)/4294967296;
  const cellKey=(x,y)=>`${x},${y}`;
  const md=(a,b)=>Math.abs(Number(a?.x||0)-Number(b?.x||0))+Math.abs(Number(a?.y||0)-Number(b?.y||0));
  const currentFloor=()=>Math.max(1,Number(typeof run!=="undefined"&&run?.floor||1));
  const currentSeed=()=>String(typeof run!=="undefined"&&run?.seed||"lost-sizzler");
  const pit=()=>typeof host!=="undefined"&&host?.rareVortexPit||null;
  const pitCells=()=>pit()?.cells||[];
  const pitAt=(x,y)=>pitCells().some(q=>q.x===x&&q.y===y);
  const tutorialActive=()=>Boolean(window.CCGLostSizzlerOnboardingV120?.state?.active);
  const isTrainingPit=()=>Boolean(pit()?.training&&tutorialActive());
  const localPeople=()=>typeof localPlayers==="function"?localPlayers():[typeof p1!=="undefined"?p1:null,typeof p2!=="undefined"?p2:null].filter(Boolean);

  function specialRoomIds(){
    const ids=new Set();
    if(typeof world==="undefined"||typeof host==="undefined"||!world||!host)return ids;
    for(const id of [world.startRoomId,world.exitRoomId,host.sigilRoomId,host.trader?.roomId,host.startShop?.roomId,host.spiderNest?.roomId,host.skeletonHorde?.roomId,host.rescue?.roomId])if(id!=null)ids.add(Number(id));
    for(const list of [host.generators,host.arenas,host.timedRooms,host.hazardRooms])for(const row of list||[])if(row?.roomId!=null)ids.add(Number(row.roomId));
    for(const row of [host.memoryPuzzle,host.sequenceTorchPuzzle,host.weightBridge,host.bloodClue])if(row?.roomId!=null)ids.add(Number(row.roomId));
    if(host.guardian&&window.CCGWorld?.roomAt){const id=window.CCGWorld.roomAt(world,host.guardian.x,host.guardian.y);if(id>=0)ids.add(id)}
    return ids;
  }

  function occupied(x,y){
    if(typeof host==="undefined"||!host)return true;
    const tests=[
      host.enemies?.filter(e=>e?.alive),host.blockingDecor,host.generators?.filter(e=>e?.alive),
      host.chests?.filter(e=>e?.active),host.shrines?.filter(e=>e?.active),host.switches?.filter(e=>e?.active),
      host.items?.filter(e=>e?.active),host.shops?.filter(e=>e?.active),host.deathCaches?.filter(e=>e?.active)
    ];
    if(tests.some(list=>(list||[]).some(q=>q?.x===x&&q?.y===y)))return true;
    if((host.doors||[]).some(q=>q?.x===x&&q?.y===y))return true;
    if(localPeople().some(q=>q?.x===x&&q?.y===y))return true;
    return false;
  }

  function nearDoor(x,y,distance=3){return (typeof host!=="undefined"&&host?.doors||[]).some(d=>md(d,{x,y})<=distance)}
  function walkableBase(x,y){return Boolean(typeof world!=="undefined"&&world?.map?.[y]?.[x]===0)}

  function candidateRooms(){
    if(typeof world==="undefined"||!world?.rooms)return[];
    const blocked=specialRoomIds();
    return world.rooms.filter(room=>room&&
      room.id!==world.startRoomId&&room.id!==world.exitRoomId&&!blocked.has(room.id)&&
      !room.optional&&!room.sanctuary&&!room.sigilRoom&&!room.dangerous&&!room.dedicatedHazard&&
      !room.memoryPuzzleRoom&&!room.sequenceTorchRoom&&!room.weightBridgeRoom&&!room.spiderNest&&!room.skeletonHorde&&
      Number(room.depth||0)>=3&&room.w>=8&&room.h>=7);
  }

  function candidateCells(room,key){
    const out=[];
    if(!room||typeof world==="undefined"||!world?.map)return out;
    for(let y=room.y+2;y<=room.y+room.h-2;y++)for(let x=room.x+2;x<=room.x+room.w-2;x++){
      if(!walkableBase(x,y)||occupied(x,y)||nearDoor(x,y,3))continue;
      const neighbours=[[1,0],[-1,0],[0,1],[0,-1]].filter(([dx,dy])=>walkableBase(x+dx,y+dy)).length;
      if(neighbours<3)continue;
      out.push({x,y});
    }
    out.sort((a,b)=>hash32(`${key}|${a.x},${a.y}`)-hash32(`${key}|${b.x},${b.y}`));
    return out;
  }

  function designatedPitFloor(){
    const seed=currentSeed();
    if(unit(`${seed}|VORTEX-RUN`)>=PIT_RUN_CHANCE)return 0;
    const span=PIT_MAX_FLOOR-PIT_MIN_FLOOR+1;
    return PIT_MIN_FLOOR+(hash32(`${seed}|VORTEX-FLOOR`)%span);
  }

  function routeExistsAvoiding(blockedCells){
    if(typeof world==="undefined"||!world?.map||!world.start||!world.exit)return true;
    const blocked=new Set((blockedCells||[]).map(q=>cellKey(q.x,q.y)));
    const start={x:Math.round(world.start.x),y:Math.round(world.start.y)},goal={x:Math.round(world.exit.x),y:Math.round(world.exit.y)};
    const q=[start],seen=new Set([cellKey(start.x,start.y)]);
    for(let i=0;i<q.length&&i<20000;i++){
      const cur=q[i];if(cur.x===goal.x&&cur.y===goal.y)return true;
      for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
        const x=cur.x+dx,y=cur.y+dy,k=cellKey(x,y);
        if(seen.has(k)||blocked.has(k)||world.map[y]?.[x]!==0)continue;
        seen.add(k);q.push({x,y});
      }
    }
    return false;
  }

  function armRareVortex(){
    if(typeof host==="undefined"||typeof world==="undefined"||typeof run==="undefined"||!host||!world||!run)return false;
    if(window.CCGLostSizzlerOnboardingV120?.state?.active)return false;
    const floor=currentFloor(),target=designatedPitFloor();
    if(floor<PIT_MIN_FLOOR||floor>PIT_MAX_FLOOR||target!==floor){if(host.rareVortexPit?.training)host.rareVortexPit=null;return false}
    const floorKey=`${currentSeed()}|F${floor}|VORTEX`;
    if(host.rareVortexPit&&!host.rareVortexPit.training)return true;
    const rooms=candidateRooms().sort((a,b)=>hash32(`${floorKey}|ROOM|${a.id}`)-hash32(`${floorKey}|ROOM|${b.id}`));
    for(const room of rooms){
      const cells=candidateCells(room,floorKey);
      for(const q of cells){
        if(!routeExistsAvoiding([q]))continue;
        host.rareVortexPit={id:`rare-vortex-${floor}-${hash32(floorKey).toString(36)}`,roomId:room.id,cells:[q],training:false,seedKey:floorKey};
        room.rareVortexPit=true;
        host.revision=(host.revision||0)+1;
        state.warnedPlayers.clear();
        return true;
      }
    }
    return false;
  }

  function trainingCell(){
    if(typeof world==="undefined"||!world?.rooms)return null;
    const room=world.rooms[world.startRoomId];if(!room)return null;
    const key=`${currentSeed()}|TRAINING-VORTEX`;
    const cells=[];
    for(let y=room.y+2;y<=room.y+room.h-2;y++)for(let x=room.x+2;x<=room.x+room.w-2;x++){
      if(!walkableBase(x,y)||occupied(x,y)||nearDoor(x,y,3))continue;
      if(typeof p1!=="undefined"&&p1&&md(p1,{x,y})<4)continue;
      cells.push({x,y});
    }
    cells.sort((a,b)=>hash32(`${key}|${a.x},${a.y}`)-hash32(`${key}|${b.x},${b.y}`));
    return cells[0]||null;
  }

  function ensureTrainingVortex(){
    const active=tutorialActive();
    if(!active||typeof host==="undefined"||!host)return;
    if(host.rareVortexPit?.training)return;
    if(host.rareVortexPit&&!host.rareVortexPit.training)return;
    const q=trainingCell();if(!q)return;
    host.rareVortexPit={id:"training-vortex",roomId:world.startRoomId,cells:[q],training:true,harmless:true};
    host.revision=(host.revision||0)+1;
  }

  function installTutorialNote(){
    const onboarding=window.CCGLostSizzlerOnboardingV120;
    if(!onboarding?.state?.active)return;
    ensureTrainingVortex();
    if(Number(onboarding.state.step)!==5)return;
    const rail=document.getElementById("ccg-tutorial-rail");if(!rail||rail.querySelector("[data-vortex-tutorial-note]"))return;
    const note=document.createElement("div");
    note.dataset.vortexTutorialNote="true";
    note.style.cssText="margin:10px 0;padding:10px;border:1px solid rgba(185,120,255,.55);border-radius:8px;background:rgba(40,20,60,.28);line-height:1.45";
    note.innerHTML="<b>HAZARDS &amp; RARE VORTEX PITS</b><br>Enemies normally avoid floor traps and vortex pits. Your gunfire can knock them onto traps or into a vortex. A vortex pit is exceptionally rare and only appears on deeper floors; the glowing training vortex in this room is harmless. A real one can injure you badly, so heed the warning and keep clear.";
    const actions=rail.querySelector(".ccg-tutorial-actions");if(actions)rail.insertBefore(note,actions);else rail.appendChild(note);
  }

  function frameOccupied(x,y){
    if(typeof host==="undefined"||!host)return true;
    if((host.doors||[]).some(d=>d.x===x&&d.y===y))return true;
    const lists=[host.items,host.chests,host.generators,host.shrines,host.switches,host.blockingDecor];
    return lists.some(list=>(list||[]).some(q=>q?.x===x&&q?.y===y));
  }

  function doorGroups(){
    const map=new Map();
    for(const d of typeof host!=="undefined"&&host?.doors||[]){
      if(!d||d.type==="secret"||d.hidden)continue;
      const key=d.groupId||`single:${d.id||d.x+","+d.y}`;
      if(!map.has(key))map.set(key,[]);
      map.get(key).push(d);
    }
    return [...map.values()];
  }

  function inferOrientation(leaves){
    const first=leaves[0];if(first?.orientation)return first.orientation;
    if(leaves.length>1){
      const xs=new Set(leaves.map(d=>d.x)),ys=new Set(leaves.map(d=>d.y));
      if(xs.size===1&&ys.size>1)return"vertical";
      if(ys.size===1&&xs.size>1)return"horizontal";
    }
    const x=first?.x,y=first?.y;
    const left=world?.map?.[y]?.[x-1]===0,right=world?.map?.[y]?.[x+1]===0,up=world?.map?.[y-1]?.[x]===0,down=world?.map?.[y+1]?.[x]===0;
    return left&&right&&!up&&!down?"vertical":up&&down&&!left&&!right?"horizontal":left&&right?"vertical":"horizontal";
  }

  function repairDoorFrames(){
    if(typeof world==="undefined"||typeof host==="undefined"||!world?.map||!host?.doors)return 0;
    world.doorFrameCells=world.doorFrameCells||[];
    const doorSet=new Set(host.doors.map(d=>cellKey(d.x,d.y)));
    let made=0;
    for(const leaves of doorGroups()){
      if(!leaves.length)continue;
      const orientation=inferOrientation(leaves);
      for(const d of leaves){d.orientation=d.orientation||orientation;d._ccgAttachedFrame=true}
      const supports=[];
      if(orientation==="vertical"){
        const x=leaves[0].x,ys=leaves.map(d=>d.y),lo=Math.min(...ys),hi=Math.max(...ys);
        supports.push({x,y:lo-1},{x,y:hi+1});
      }else{
        const y=leaves[0].y,xs=leaves.map(d=>d.x),lo=Math.min(...xs),hi=Math.max(...xs);
        supports.push({x:lo-1,y},{x:hi+1,y});
      }
      const changed=[];
      for(const q of supports){
        if(q.x<=1||q.y<=1||q.y>=world.map.length-1||q.x>=world.map[0].length-1)continue;
        if(doorSet.has(cellKey(q.x,q.y))||frameOccupied(q.x,q.y))continue;
        if(world.map[q.y]?.[q.x]!==0)continue;
        world.map[q.y][q.x]=1;changed.push(q);
      }
      if(changed.length&&!routeExistsAvoiding([])){
        for(const q of changed)world.map[q.y][q.x]=0;
        changed.length=0;
      }
      for(const q of changed){
        if(!world.doorFrameCells.some(c=>c.x===q.x&&c.y===q.y))world.doorFrameCells.push({...q,orientation,groupId:leaves[0].groupId||null});
        made++;
      }
    }
    if(made)host.revision=(host.revision||0)+1;
    return made;
  }

  function trapAt(x,y,requireActive=true){
    if(typeof host==="undefined"||!host)return null;
    const t=(host.traps||[]).find(t=>t?.active&&t.x===x&&t.y===y);
    if(!t)return null;
    if(!requireActive)return t;
    try{return window.CCGSystems?.trapActive?.(t,performance.now())?t:null}catch(_){return t}
  }

  function chamberHazardAt(x,y){
    if(typeof host==="undefined"||!host)return null;
    for(const hazard of host.hazardRooms||[]){
      if(!(hazard.cells||[]).some(q=>q.x===x&&q.y===y))continue;
      try{
        const s=window.CCGSystems?.hazardCellState?.(hazard,x,y,host.floorElapsed||run?.elapsed||0);
        if(s?.active)return hazard;
      }catch(_){}
    }
    return null;
  }

  function hazardAvoidCells(){
    const cells=[];
    if(typeof host==="undefined"||!host)return cells;
    for(const t of host.traps||[])if(t?.active)cells.push({x:t.x,y:t.y});
    for(const q of pitCells())cells.push({x:q.x,y:q.y});
    return cells;
  }

  function nearestSafeEnemyCell(enemy,ox,oy){
    const candidates=[[1,0],[-1,0],[0,1],[0,-1]].map(([dx,dy])=>({x:enemy.x+dx,y:enemy.y+dy}))
      .filter(q=>walkableBase(q.x,q.y)&&!pitAt(q.x,q.y)&&!trapAt(q.x,q.y,false)&&!(host.enemies||[]).some(e=>e!==enemy&&e.alive&&e.x===q.x&&e.y===q.y));
    candidates.sort((a,b)=>md(a,{x:ox,y:oy})-md(b,{x:ox,y:oy}));
    return candidates[0]||null;
  }

  function hazardFx(x,y,kind,heavy=false){
    try{
      const col=kind==="pit"?P.purple:kind==="embers"?P.orange:P.red;
      burst(x,y,col,heavy?28:18,heavy?1.8:1.25);
      ring(x,y,col,heavy?52:34);
      if(kind==="pit"){S.sfx("warp");setTimeout(()=>S.sfx("alert"),75)}
      else{S.sfx("trap");setTimeout(()=>S.sfx("hit"),55)}
      shake=Math.max(shake,heavy?9:5);
    }catch(_){}
  }

  function resolveForcedHazard(enemy,attacker,origin){
    if(!enemy?.alive)return false;
    const vortex=pitAt(enemy.x,enemy.y)&&!isTrainingPit();
    if(vortex){
      if(enemy.deathStalker&&enemy.voidStalker){
        enemy.x=origin.x;enemy.y=origin.y;
        hazardFx(origin.x,origin.y,"pit",true);
        try{floatText(origin.x,origin.y,"VORTEX REJECTED",P.purple,{life:950})}catch(_){}
        return true;
      }
      hazardFx(enemy.x,enemy.y,"pit",true);
      try{floatText(enemy.x,enemy.y,"INTO THE VORTEX!",P.purple,{life:1100})}catch(_){}
      enemy._ccgHazardResolving=true;
      enemy._ccgVortexKill=true;
      try{damageEnemy(enemy,Math.max(9999,Number(enemy.hp||0)+Number(enemy.armor||0)+100),"physical",attacker||p1)}
      finally{delete enemy._ccgHazardResolving;delete enemy._ccgVortexKill}
      if(!enemy.alive)try{showToast("VORTEX KILL","An enemy was knocked into the rare vortex pit. Environmental kills still count.","gold",5200)}catch(_){}
      return true;
    }
    const trap=trapAt(enemy.x,enemy.y,true),chamber=chamberHazardAt(enemy.x,enemy.y);
    if(!trap&&!chamber)return false;
    const kind=chamber?.type||trap?.kind||"trap";
    hazardFx(enemy.x,enemy.y,kind,false);
    try{floatText(enemy.x,enemy.y,`HAZARD -${TRAP_ENEMY_DAMAGE}`,P.red,{life:850})}catch(_){}
    enemy._ccgHazardResolving=true;
    try{damageEnemy(enemy,TRAP_ENEMY_DAMAGE,"physical",attacker||p1)}
    finally{delete enemy._ccgHazardResolving}
    return true;
  }

  function safePlayerCell(player,origin){
    const dirs=[[1,0],[-1,0],[0,1],[0,-1]];
    const cells=dirs.map(([dx,dy])=>({x:origin.x+dx,y:origin.y+dy}))
      .filter(q=>walkableBase(q.x,q.y)&&!pitAt(q.x,q.y)&&!(host.enemies||[]).some(e=>e.alive&&e.x===q.x&&e.y===q.y));
    cells.sort((a,b)=>md(a,player)-md(b,player));
    return cells[0]||world?.start||null;
  }

  function triggerPlayerPit(player){
    if(!player||!pitAt(player.x,player.y))return false;
    if(isTrainingPit()){
      if(!state.trainingWarned){
        state.trainingWarned=true;
        try{S.sfx("warp");showToast("TRAINING VORTEX — HARMLESS","This is the tutorial demonstration. Real vortex pits are exceptionally rare, appear only on deeper floors and can hurt you. Enemies avoid them unless you knock them in.","cyan",9000)}catch(_){}
      }
      return true;
    }
    if(player._ccgPitCooldown&&performance.now()<player._ccgPitCooldown)return true;
    player._ccgPitCooldown=performance.now()+1800;
    const origin={x:player.x,y:player.y};
    hazardFx(origin.x,origin.y,"pit",true);
    try{showToast("VORTEX PIT!","The vortex catches you and throws you clear. Real pits are rare, but they are not decoration. Keep away — or use them against enemies.","red",9000)}catch(_){}
    try{hurtPlayer(player,PIT_PLAYER_DAMAGE,false,"vortex pit")}catch(_){}
    if(player.health>0&&player.x===origin.x&&player.y===origin.y){
      const q=safePlayerCell(player,origin);if(q){player.x=q.x;player.y=q.y;player.rx=q.x;player.ry=q.y}
    }
    return true;
  }

  function warnNearPit(){
    const v=pit();if(!v||v.training)return;
    const q=v.cells?.[0];if(!q)return;
    for(const player of localPeople()){
      if(!player||md(player,q)>PIT_WARN_DISTANCE)continue;
      const key=`${v.id}|${player.id||player.name||"player"}`;
      if(state.warnedPlayers.has(key))continue;
      state.warnedPlayers.add(key);
      try{
        S.sfx("alert");setTimeout(()=>S.sfx("warp"),90);
        showToast("VORTEX PIT AHEAD","A rare gravitational vortex is nearby. Do not step into it. Enemies normally avoid hazards, but gunfire can knock them into traps or into the vortex.","red",9500);
        ring(q.x,q.y,P.purple,52);
      }catch(_){}
    }
  }

  function nudgeNaturalHazardOccupants(){
    if(typeof host==="undefined"||!host)return;
    for(const enemy of host.enemies||[]){
      if(!enemy?.alive||enemy._ccgHazardResolving)continue;
      const onPit=pitAt(enemy.x,enemy.y),onTrap=Boolean(trapAt(enemy.x,enemy.y,false));
      if(!onPit&&!onTrap)continue;
      const q=nearestSafeEnemyCell(enemy,enemy.x,enemy.y);
      if(q){const ox=enemy.x,oy=enemy.y;enemy.x=q.x;enemy.y=q.y;enemy.facing={x:Math.sign(q.x-ox),y:Math.sign(q.y-oy)}}
    }
  }

  function drawVortex(x,y,training=false){
    if(typeof ctx==="undefined"||typeof C==="undefined"||typeof ws!=="function")return;
    const s=ws(x,y),cx=s.x+C.tile/2,cy=s.y+C.tile/2,t=performance.now()/600,rad=C.tile*.39;
    ctx.save();
    const g=ctx.createRadialGradient(cx,cy,2,cx,cy,rad);
    g.addColorStop(0,"rgba(0,0,0,.98)");
    g.addColorStop(.38,training?"rgba(35,120,135,.80)":"rgba(42,8,66,.92)");
    g.addColorStop(.72,training?"rgba(75,230,220,.48)":"rgba(160,70,255,.62)");
    g.addColorStop(1,"rgba(0,0,0,0)");
    ctx.fillStyle=g;ctx.beginPath();ctx.arc(cx,cy,rad,0,Math.PI*2);ctx.fill();
    ctx.translate(cx,cy);ctx.rotate(t);
    for(let n=0;n<4;n++){
      ctx.rotate(Math.PI/2);
      ctx.strokeStyle=training?"rgba(108,236,255,.76)":"rgba(190,110,255,.78)";
      ctx.lineWidth=2-n*.24;
      ctx.beginPath();ctx.arc(0,0,rad*(.30+n*.12),n*.55,Math.PI*1.25+n*.32);ctx.stroke();
    }
    ctx.rotate(-t*1.65);ctx.strokeStyle=training?"rgba(114,255,155,.74)":"rgba(108,236,255,.66)";ctx.lineWidth=1.4;ctx.beginPath();ctx.arc(0,0,rad*.68,0,Math.PI*1.35);ctx.stroke();
    ctx.fillStyle="rgba(0,0,0,.96)";ctx.beginPath();ctx.arc(0,0,rad*.18,0,Math.PI*2);ctx.fill();
    ctx.restore();
  }

  function doorDust(leaves){
    if(!Array.isArray(leaves)||!leaves.length)return;
    for(const d of leaves.slice(0,2))try{
      burst(d.x,d.y,d.sigilGate?P.purple:d.type==="bronze"?P.gold:"#b58a62",6,.55);
    }catch(_){}
  }

  function installStartWorld(){
    if(state.installed.startWorld||typeof startWorld!=="function")return;
    const original=startWorld;
    startWorld=function startWorldV121EnvironmentalPolish(){
      const result=original.apply(this,arguments);
      try{
        state.worldKey=`${currentSeed()}|F${currentFloor()}`;state.warnedPlayers.clear();state.trainingWarned=false;
        repairDoorFrames();armRareVortex();
      }catch(error){console.warn("[Lost Sizzler] environmental world pass failed",error)}
      return result;
    };
    state.installed.startWorld=true;
    if(typeof world!=="undefined"&&world&&typeof host!=="undefined"&&host)try{repairDoorFrames();armRareVortex()}catch(_){}
  }

  function installAI(){
    if(state.installed.ai||!window.CCGAI?.stepEnemies)return;
    const original=window.CCGAI.stepEnemies;
    window.CCGAI.stepEnemies=function stepEnemiesV121HazardAvoidance(hostArg,map,players,dt,hooks,worldArg){
      const changed=[];
      for(const q of hazardAvoidCells()){
        if(map?.[q.y]?.[q.x]!==0)continue;
        changed.push([q.x,q.y,map[q.y][q.x]]);map[q.y][q.x]=1;
      }
      try{return original.apply(this,arguments)}
      finally{for(const [x,y,value] of changed)if(map?.[y])map[y][x]=value}
    };
    state.installed.ai=true;
  }

  function installKnock(){
    if(state.installed.knock||typeof knockEnemyAway!=="function")return;
    const original=knockEnemyAway;
    knockEnemyAway=function knockEnemyAwayV121Hazards(enemy,from){
      if(enemy?._ccgHazardResolving)return false;
      const origin={x:Number(enemy?.x||0),y:Number(enemy?.y||0)};
      const result=original.apply(this,arguments);
      if(enemy?.alive&&(enemy.x!==origin.x||enemy.y!==origin.y))resolveForcedHazard(enemy,from||p1,origin);
      return result;
    };
    state.installed.knock=true;
  }

  function installMovement(){
    if(state.installed.move||typeof movementTriggers!=="function")return;
    const original=movementTriggers;
    movementTriggers=function movementTriggersV121Pit(player){
      const result=original.apply(this,arguments);
      triggerPlayerPit(player);
      return result;
    };
    state.installed.move=true;
  }

  function installUpdate(){
    if(state.installed.update||typeof update!=="function")return;
    const original=update;
    update=function updateV121EnvironmentalPolish(dt){
      const result=original.apply(this,arguments);
      try{installTutorialNote();warnNearPit();nudgeNaturalHazardOccupants()}catch(_){}
      return result;
    };
    state.installed.update=true;
  }

  function installRender(){
    if(state.installed.render||typeof drawTile!=="function")return;
    const original=drawTile;
    drawTile=function drawTileV121Vortex(x,y){
      const result=original.apply(this,arguments);
      if(pitAt(x,y))drawVortex(x,y,isTrainingPit());
      return result;
    };
    state.installed.render=true;
  }

  function installDoorFx(){
    if(state.installed.doors||typeof beginDoorOpening!=="function")return;
    const original=beginDoorOpening;
    beginDoorOpening=function beginDoorOpeningV121Weight(door,delay){
      const leaves=door?.groupId?(host?.doors||[]).filter(d=>d.groupId===door.groupId):[door].filter(Boolean);
      const wasClosed=leaves.some(d=>!d.open&&!d.opening);
      const result=original.apply(this,arguments);
      if(wasClosed&&(door?.sigilGate||door?.type==="bronze"||door?.type==="switch")){
        doorDust(leaves);
        try{setTimeout(()=>S.sfx("wall"),100);shake=Math.max(shake,door.sigilGate?5:3)}catch(_){}
      }
      return result;
    };
    state.installed.doors=true;
  }

  function installNetwork(){
    if(state.installed.network)return;
    let installed=false;
    if(typeof serialWorld==="function"){
      const originalSerial=serialWorld;
      serialWorld=function serialWorldV121(){
        const payload=originalSerial.apply(this,arguments);
        payload.rareVortexPit=host?.rareVortexPit?{...host.rareVortexPit,cells:(host.rareVortexPit.cells||[]).map(q=>({...q}))}:null;
        return payload;
      };
      installed=true;
    }
    if(typeof onWorld==="function"){
      const originalWorld=onWorld;
      onWorld=function onWorldV121(payload){
        const vortex=payload?.rareVortexPit?{...payload.rareVortexPit,cells:(payload.rareVortexPit.cells||[]).map(q=>({...q}))}:null;
        const result=originalWorld.apply(this,arguments);
        if(typeof host!=="undefined"&&host&&payload&&Object.prototype.hasOwnProperty.call(payload,"rareVortexPit"))host.rareVortexPit=vortex;
        return result;
      };
      installed=true;
    }
    if(installed)state.installed.network=true;
  }

  function install(){
    installStartWorld();installAI();installKnock();installMovement();installUpdate();installRender();installDoorFx();installNetwork();
  }

  install();
  const timer=setInterval(()=>{
    install();
    if(Object.values(state.installed).every(Boolean))clearInterval(timer);
  },120);
  window.addEventListener("pagehide",()=>clearInterval(timer),{once:true});

  window.CCGLostSizzlerEnvironmentalV121={
    state,
    PIT_RUN_CHANCE,
    PIT_MIN_FLOOR,
    PIT_MAX_FLOOR,
    designatedPitFloor,
    pitAt,
    trapAt,
    armRareVortex,
    repairDoorFrames,
    resolveForcedHazard,
    triggerPlayerPit
  };
})();
