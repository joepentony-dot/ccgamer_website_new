/* The Lost Sizzler V10.14 — rare Gilded Elf bonus encounter. */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_GILDED_ELF_V114__)return;
  window.__CCG_LOST_SIZZLER_GILDED_ELF_V114__=true;

  const SPAWN_CHANCE=.08;
  const LIFETIME_MS=30000;
  const PASSIVE_DROP_MS=3000;
  const HIT_DROP_COOLDOWN_MS=250;
  const MOVE_MS=540;
  const state={floorKey:"",armed:false,spawned:false,plan:null,lastVisual:new Map()};

  function hash32(value){
    let h=2166136261>>>0;
    const text=String(value||"");
    for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619)}
    h+=h<<13;h^=h>>>7;h+=h<<3;h^=h>>>17;h+=h<<5;
    return h>>>0;
  }
  const unit=value=>hash32(value)/4294967296;
  const hashSort=(a,b,key)=>hash32(`${key}|${a.x},${a.y}`)-hash32(`${key}|${b.x},${b.y}`);
  const floorKeyFor=seed=>`${String(seed||run?.seed||"lost-sizzler")}|F${Math.max(1,Number(run?.floor||1))}`;

  function specialRoomIds(){
    const ids=new Set();
    if(host?.sigilRoomId!=null)ids.add(host.sigilRoomId);
    for(const row of host?.arenas||[])if(row?.roomId!=null)ids.add(row.roomId);
    for(const row of host?.timedRooms||[])if(row?.roomId!=null)ids.add(row.roomId);
    for(const row of host?.hazardRooms||[])if(row?.roomId!=null)ids.add(row.roomId);
    for(const row of [host?.memoryPuzzle,host?.sequenceTorchPuzzle,host?.weightBridge,host?.spiderNest,host?.skeletonHorde])if(row?.roomId!=null)ids.add(row.roomId);
    return ids;
  }

  function eligibleRooms(){
    if(!world?.rooms)return[];
    const blocked=specialRoomIds();
    return world.rooms.filter(room=>room&&
      !room.optional&&!room.sanctuary&&!room.sigilRoom&&!room.dangerous&&!room.dedicatedHazard&&
      !room.memoryPuzzleRoom&&!room.sequenceTorchRoom&&!room.weightBridgeRoom&&!room.spiderNest&&!room.skeletonHorde&&
      room.id!==world.startRoomId&&room.id!==world.exitRoomId&&!blocked.has(room.id));
  }

  function tooCloseToDoor(x,y){return (host?.doors||[]).some(d=>Math.abs(d.x-x)+Math.abs(d.y-y)<=2)}
  function occupiedCell(x,y,ignoreElf=null){
    if((host?.enemies||[]).some(e=>e!==ignoreElf&&e.alive&&e.x===x&&e.y===y))return true;
    if((host?.blockingDecor||[]).some(d=>d.x===x&&d.y===y))return true;
    if((host?.generators||[]).some(d=>d.alive&&d.x===x&&d.y===y))return true;
    if((host?.chests||[]).some(d=>d.active&&d.x===x&&d.y===y))return true;
    if((host?.shrines||[]).some(d=>d.active&&d.x===x&&d.y===y))return true;
    if((host?.switches||[]).some(d=>d.active&&d.x===x&&d.y===y))return true;
    if((host?.items||[]).some(d=>d.active&&d.x===x&&d.y===y))return true;
    if((host?.shops||[]).some(d=>d.active&&d.x===x&&d.y===y))return true;
    if(host?.trader?.active&&host.trader.x===x&&host.trader.y===y)return true;
    if(host?.startShop?.active&&host.startShop.x===x&&host.startShop.y===y)return true;
    if((host?.deathCaches||[]).some(d=>d.active&&d.x===x&&d.y===y))return true;
    if((typeof allPlayers==="function"?allPlayers():[]).some(p=>p&&p.x===x&&p.y===y))return true;
    return false;
  }

  function roomCells(room,key){
    const cells=[];
    if(!room||!world?.map)return cells;
    for(let y=room.y+2;y<=room.y+room.h-2;y++)for(let x=room.x+2;x<=room.x+room.w-2;x++){
      if(world.map[y]?.[x]!==0)continue;
      if(!W.walkable(world.map,x,y,host)||tooCloseToDoor(x,y)||occupiedCell(x,y))continue;
      cells.push({x,y});
    }
    cells.sort((a,b)=>hashSort(a,b,key));
    return cells;
  }

  function armFloor(seed,checkpointRestore=false){
    state.floorKey=floorKeyFor(seed);state.spawned=false;state.armed=false;state.plan=null;state.lastVisual.clear();
    if(checkpointRestore)return;
    const rooms=eligibleRooms();if(!rooms.length)return;
    if(unit(`${state.floorKey}|chance`)>=SPAWN_CHANCE)return;
    const room=rooms[hash32(`${state.floorKey}|room`)%rooms.length],cells=roomCells(room,`${state.floorKey}|spawn`);
    if(!cells.length)return;
    state.plan={roomId:room.id,preferred:{...cells[0]},delayMs:3500+Math.floor(unit(`${state.floorKey}|delay`)*5000)};
    state.armed=true;
  }

  function currentTwoScreenTiles(){
    const tile=Math.max(1,Number(C?.tile)||32),splitFactor=playMode==="split"?2:1;
    const screenTiles=Math.max(6,Math.floor((Number(canvas?.width)||1280)/(tile*splitFactor)));
    return Math.max(12,screenTiles*2);
  }
  function roamLimit(elf){return Math.max(10,Math.min(Number(elf?.maxRoamTiles)||currentTwoScreenTiles(),currentTwoScreenTiles()))}
  function withinTether(elf,x,y){return Math.hypot(x-elf.x0,y-elf.y0)<=roamLimit(elf)+.01}

  function pickSpawnCell(){
    const plan=state.plan,room=world?.rooms?.[plan?.roomId];if(!plan||!room)return null;
    const ordered=roomCells(room,`${state.floorKey}|spawn`);
    if(plan.preferred){ordered.sort((a,b)=>((a.x===plan.preferred.x&&a.y===plan.preferred.y)?-1:0)-((b.x===plan.preferred.x&&b.y===plan.preferred.y)?-1:0)||hashSort(a,b,`${state.floorKey}|spawn-fallback`))}
    return ordered.find(q=>!occupiedCell(q.x,q.y))||null;
  }

  function spawnElf(){
    if(!state.armed||state.spawned||!net?.isHost||!host?.enemies)return false;
    if(host.enemies.some(e=>e?.gildedElf)){state.spawned=true;state.armed=false;return false}
    const q=pickSpawnCell();if(!q)return false;
    const elf={
      id:`gilded-elf-${Math.max(1,Number(run?.floor||1))}-${hash32(state.floorKey).toString(36)}`,
      x:q.x,y:q.y,x0:q.x,y0:q.y,kind:"scout",gildedElf:true,
      hp:10,maxHp:10,armor:5,maxArmor:5,alive:true,aiState:"flee",facing:{x:1,y:0},
      lastSeen:null,memoryMs:0,searchMs:0,moveCooldown:999999,attackCooldown:999999,chargeCooldown:999999,healCooldown:999999,
      flash:0,hpBarMs:0,lifeMs:LIFETIME_MS,dropTimerMs:PASSIVE_DROP_MS,moveTimerMs:MOVE_MS,
      lastHitGoldAt:-999999,hitCount:0,quipCooldownMs:0,maxRoamTiles:currentTwoScreenTiles(),spawnFloor:run?.floor||1
    };
    host.enemies.push(elf);state.spawned=true;state.armed=false;state.lastVisual.set(elf.id,{x:q.x,y:q.y});host.revision=(host.revision||0)+1;
    try{S.sfx("pickup");burst(q.x,q.y,P.gold,24,1.45);ring(q.x,q.y,P.gold,38);floatText(q.x,q.y,"GILDED ELF!",P.gold,{life:1250});showToast("GILDED ELF!","Catch the little sod before he disappears! You have 30 seconds. He drops 10 gold while fleeing and whenever you land a hit.","gold",9000);broadcastWorld()}catch(_){}
    return true;
  }

  function safeCoinCells(x,y,key,count){
    const cells=[];
    for(let radius=0;radius<=4;radius++)for(let dy=-radius;dy<=radius;dy++)for(let dx=-radius;dx<=radius;dx++){
      if(Math.max(Math.abs(dx),Math.abs(dy))!==radius)continue;
      const q={x:x+dx,y:y+dy};if(!world?.map?.[q.y]||!W.walkable(world.map,q.x,q.y,host))continue;
      if((host?.blockingDecor||[]).some(d=>d.x===q.x&&d.y===q.y))continue;
      cells.push(q);
    }
    cells.sort((a,b)=>hashSort(a,b,key));
    if(!cells.length)cells.push({x,y});
    const out=[];for(let i=0;i<count;i++)out.push(cells[i%cells.length]);return out;
  }

  function singleDropCell(elf){
    const fx=Math.sign(elf?.facing?.x||0),fy=Math.sign(elf?.facing?.y||0),behind={x:elf.x-fx,y:elf.y-fy};
    if((fx||fy)&&world?.map?.[behind.y]&&W.walkable(world.map,behind.x,behind.y,host)&&!(host?.blockingDecor||[]).some(d=>d.x===behind.x&&d.y===behind.y))return behind;
    return{x:elf.x,y:elf.y};
  }

  function dropGold(elf,count=1,reason="trail"){
    if(!net?.isHost||!elf||!host?.items)return;
    elf.goldDropSerial=(elf.goldDropSerial||0)+1;
    const cells=count===1?[singleDropCell(elf)]:safeCoinCells(elf.x,elf.y,`${elf.id}|${reason}|${elf.goldDropSerial}`,count);
    cells.forEach((q,i)=>host.items.push({id:`elf-gold-${elf.id}-${elf.goldDropSerial}-${i}`,...q,kind:"credits",gildedElfCoin:true,scoreValue:10,active:true,title:"10 GOLD",source:"Gilded Elf"}));
    host.revision=(host.revision||0)+1;
    try{S.sfx("pickup");for(const q of cells.slice(0,3)){ring(q.x,q.y,P.gold,22);burst(q.x,q.y,P.gold,8,.7)}}catch(_){}
  }

  function dustAt(x,y,dx=0,dy=0,heavy=false){
    if(typeof particles==="undefined")return;
    const n=heavy?18:6,cx=x*C.tile+C.tile/2,cy=y*C.tile+C.tile*.75;
    for(let i=0;i<n;i++)particles.push({x:cx+(Math.random()-.5)*14,y:cy+(Math.random()-.5)*8,vx:-dx*(.4+Math.random()*1.1)+(Math.random()-.5)*1.2,vy:-dy*(.4+Math.random()*1.1)-Math.random()*.7,life:(heavy?520:300)+Math.random()*(heavy?600:420),col:i%4===0?P.gold:(i%2?"#a97845":"#d0a56d"),size:1+Math.random()*(heavy?3.6:2.3),drag:.95,glow:i%4===0?4:0});
  }

  function validElfStep(elf,x,y){
    if(!world?.map||!W.walkable(world.map,x,y,host)||!withinTether(elf,x,y))return false;
    if(occupiedCell(x,y,elf))return false;
    return true;
  }

  function moveElfStep(elf,target){
    if(!elf?.alive||!target)return false;
    const dirs=[[1,0],[-1,0],[0,1],[0,-1]],limit=roamLimit(elf),currentDistance=Math.hypot(elf.x-target.x,elf.y-target.y),candidates=[];
    for(const [dx,dy] of dirs){
      const x=elf.x+dx,y=elf.y+dy;if(!validElfStep(elf,x,y))continue;
      const away=Math.hypot(x-target.x,y-target.y),home=Math.hypot(x-elf.x0,y-elf.y0),margin=limit-home;
      let value=away*100+margin*1.8;
      if(away<currentDistance)value-=120;
      if(home>limit*.82&&away<=currentDistance+.01)value-=60;
      value+=unit(`${elf.id}|${elf.hitCount||0}|${elf.lifeMs}|${x},${y}`)*.1;
      candidates.push({x,y,dx,dy,value});
    }
    candidates.sort((a,b)=>b.value-a.value);const q=candidates[0];if(!q)return false;
    const ox=elf.x,oy=elf.y;elf.x=q.x;elf.y=q.y;elf.facing={x:q.dx,y:q.dy};elf.moveTimerMs=MOVE_MS;host.revision=(host.revision||0)+1;dustAt(ox,oy,q.dx,q.dy,false);state.lastVisual.set(elf.id,{x:elf.x,y:elf.y});return true;
  }

  function nearestPlayer(elf){
    const players=(typeof allPlayers==="function"?allPlayers():[]).filter(p=>p&&Number(p.health||1)>0);
    return players.sort((a,b)=>Math.hypot(elf.x-a.x,elf.y-a.y)-Math.hypot(elf.x-b.x,elf.y-b.y))[0]||null;
  }

  function escapeElf(elf){
    if(!elf?.alive)return;elf.alive=false;elf.hp=Math.max(0,elf.hp);elf.gildedResolved="escaped";
    try{dustAt(elf.x,elf.y,0,0,true);burst(elf.x,elf.y,P.gold,28,1.55);ring(elf.x,elf.y,P.gold,46);floatText(elf.x,elf.y,"TOO SLOW!",P.gold,{life:1300});S.sfx("warp");showToast("GILDED ELF ESCAPED","Too slow. The elf vanishes in a cloud of dust; any gold already dropped is still yours to collect.","gold",7600)}catch(_){}
    host.revision=(host.revision||0)+1;try{broadcastWorld()}catch(_){}
  }

  function updateElfHost(elf,dt){
    if(!elf?.alive)return;
    elf.lifeMs=Math.max(0,Number(elf.lifeMs||0)-dt);elf.dropTimerMs=Number(elf.dropTimerMs||PASSIVE_DROP_MS)-dt;elf.moveTimerMs=Number(elf.moveTimerMs||MOVE_MS)-dt;elf.quipCooldownMs=Math.max(0,Number(elf.quipCooldownMs||0)-dt);
    while(elf.dropTimerMs<=0&&elf.lifeMs>0){elf.dropTimerMs+=PASSIVE_DROP_MS;dropGold(elf,1,"passive")}
    if(elf.lifeMs<=0){escapeElf(elf);return}
    if(elf.moveTimerMs<=0){const target=nearestPlayer(elf);if(target)moveElfStep(elf,target);else elf.moveTimerMs=MOVE_MS}
  }

  function updateVisualTrails(){
    if(!host?.enemies)return;
    const liveIds=new Set();
    for(const elf of host.enemies.filter(e=>e?.gildedElf&&e.alive)){
      liveIds.add(elf.id);const old=state.lastVisual.get(elf.id);
      if(old&&(old.x!==elf.x||old.y!==elf.y))dustAt(old.x,old.y,Math.sign(elf.x-old.x),Math.sign(elf.y-old.y),false);
      state.lastVisual.set(elf.id,{x:elf.x,y:elf.y});
    }
    for(const id of state.lastVisual.keys())if(!liveIds.has(id))state.lastVisual.delete(id);
  }

  function updateGildedElf(dt){
    if(!host||!run||mode!=="playing")return;
    if((host.enemies||[]).some(e=>e?.gildedElf)){state.spawned=true;state.armed=false}
    if(net?.isHost&&state.armed&&!state.spawned&&state.plan&&Number(host.floorElapsed||0)>=state.plan.delayMs){
      const entered=(typeof allPlayers==="function"?allPlayers():[]).some(p=>p&&W.roomAt(world,p.x,p.y)===state.plan.roomId);
      if(entered)spawnElf();
    }
    if(net?.isHost)for(const elf of host.enemies.filter(e=>e?.gildedElf&&e.alive))updateElfHost(elf,dt);
    updateVisualTrails();
  }

  function gildedHit(elf,power,attacker){
    if(!elf?.alive)return;
    const now=performance.now(),damage=Math.max(1,Number(power)||1);elf.flash=170;elf.hpBarMs=3000;elf.hitCount=(elf.hitCount||0)+1;elf.moveTimerMs=0;
    if(now-Number(elf.lastHitGoldAt||-999999)>=HIT_DROP_COOLDOWN_MS){elf.lastHitGoldAt=now;dropGold(elf,1,"hit")}
    let left=damage;
    if((elf.armor||0)>0){const absorbed=Math.min(elf.armor,left);elf.armor-=absorbed;left-=absorbed;try{S.sfx("armour");burst(elf.x,elf.y,P.blue,8,1);ring(elf.x,elf.y,P.blue,18);floatText(elf.x,elf.y,`ARM -${absorbed}`,P.cyan)}catch(_){}}
    if(left>0){elf.hp=Math.max(0,elf.hp-left);try{S.sfx("hit");burst(elf.x,elf.y,P.gold,11,1.1);ring(elf.x,elf.y,P.orange,20);floatText(elf.x,elf.y,`-${left}`,P.white)}catch(_){}}
    if(elf.hp>0){
      if((elf.quipCooldownMs||0)<=0){elf.quipCooldownMs=1400;const text=elf.hp<=3?"THIS IS ROBBERY!":((elf.hitCount||0)%2?"OI!":"MY GOLD!");try{floatText(elf.x,elf.y,text,P.gold,{life:950})}catch(_){}}
      host.revision=(host.revision||0)+1;return;
    }
    elf.hp=0;elf.alive=false;elf.gildedResolved="caught";dropGold(elf,10,"jackpot");
    try{S.sfx("elite");dustAt(elf.x,elf.y,0,0,true);burst(elf.x,elf.y,P.gold,42,2);ring(elf.x,elf.y,P.gold,58);floatText(elf.x,elf.y,"100 GOLD JACKPOT!",P.gold,{life:1500});showToast("GILDED ELF CAUGHT","The Gilded Elf drops a 100 gold jackpot. Grab the ten 10-gold coins before moving on.","gold",8200)}catch(_){}
    host.revision=(host.revision||0)+1;try{broadcastWorld()}catch(_){}
  }

  function drawGildedElf(elf){
    if(!elf?.alive||!focus||!visibleTo(focus,elf.x,elf.y))return;
    const s=typeof enemyScreen==="function"?enemyScreen(elf):ws(elf.x,elf.y),cx=s.x+C.tile/2,cy=s.y+C.tile/2,t=performance.now()/115,bob=Math.sin(t)*1.3,seconds=Math.max(0,Math.ceil(Number(elf.lifeMs||0)/1000)),urgent=seconds<=10,critical=seconds<=5;
    ctx.save();ctx.imageSmoothingEnabled=false;
    ctx.shadowColor=critical?P.red:P.gold;ctx.shadowBlur=urgent?12+Math.sin(t)*5:7;
    ctx.fillStyle="rgba(0,0,0,.45)";ctx.beginPath();ctx.ellipse(cx,s.y+C.tile-2,14,4,0,0,Math.PI*2);ctx.fill();
    const stride=Math.sin(t*1.7)*3;
    ctx.strokeStyle="#7c4d22";ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(cx-4,cy+8+bob);ctx.lineTo(cx-7-stride,cy+16+bob);ctx.moveTo(cx+4,cy+8+bob);ctx.lineTo(cx+7+stride,cy+16+bob);ctx.stroke();
    ctx.fillStyle="#147a3b";ctx.beginPath();ctx.moveTo(cx,cy-8+bob);ctx.lineTo(cx+11,cy+10+bob);ctx.lineTo(cx,cy+13+bob);ctx.lineTo(cx-11,cy+10+bob);ctx.closePath();ctx.fill();
    ctx.fillStyle="#6b3f1f";ctx.fillRect(cx+7,cy-1+bob,8,10);ctx.fillStyle=P.gold;ctx.fillRect(cx+9,cy+1+bob,4,2);
    ctx.fillStyle="#edbd83";ctx.fillRect(cx-6,cy-16+bob,12,9);ctx.beginPath();ctx.moveTo(cx-6,cy-13+bob);ctx.lineTo(cx-12,cy-11+bob);ctx.lineTo(cx-6,cy-8+bob);ctx.fill();ctx.beginPath();ctx.moveTo(cx+6,cy-13+bob);ctx.lineTo(cx+12,cy-11+bob);ctx.lineTo(cx+6,cy-8+bob);ctx.fill();
    ctx.fillStyle="#15120e";ctx.fillRect(cx-4,cy-13+bob,2,2);ctx.fillRect(cx+2,cy-13+bob,2,2);
    ctx.fillStyle=P.gold;ctx.beginPath();ctx.moveTo(cx-7,cy-17+bob);ctx.lineTo(cx+8,cy-17+bob);ctx.lineTo(cx+3,cy-25+bob);ctx.closePath();ctx.fill();ctx.beginPath();ctx.arc(cx+3,cy-25+bob,2.5,0,Math.PI*2);ctx.fill();
    ctx.fillStyle="#e7c15b";ctx.fillRect(cx-10-stride*.35,cy+14+bob,7,3);ctx.fillRect(cx+3+stride*.35,cy+14+bob,7,3);
    ctx.globalAlpha=.8;ctx.fillStyle=P.gold;for(let i=0;i<3;i++){const a=t+i*2.1,r=13+i*2;ctx.fillRect(cx+Math.cos(a)*r,cy+Math.sin(a)*6+bob,2,2)}
    ctx.restore();
    if(typeof label==="function")label("GILDED ELF",s,P.gold);
    if(typeof drawTransientHealth==="function")drawTransientHealth(elf,s,P.gold);
    ctx.save();ctx.textAlign="center";ctx.font=`bold ${critical?13:11}px "Courier New"`;ctx.fillStyle=critical?P.red:P.gold;ctx.shadowColor=ctx.fillStyle;ctx.shadowBlur=urgent?8:3;ctx.fillText(`${seconds}s`,cx,s.y-12);ctx.restore();
  }

  if(typeof startWorld==="function"){
    const originalStartWorld=startWorld;
    startWorld=function startWorldV114GildedElf(seed,split=false,preserve=false,checkpointRestore=false){const result=originalStartWorld.apply(this,arguments);try{armFloor(seed,Boolean(checkpointRestore))}catch(error){console.warn("[Lost Sizzler] Gilded Elf floor plan failed",error)}return result};
  }

  if(window.CCGAI?.stepEnemies){
    const originalStepEnemies=window.CCGAI.stepEnemies.bind(window.CCGAI);
    window.CCGAI.stepEnemies=function stepEnemiesV114GildedElf(hostState,map,players,dt,hooks,worldState){
      const hidden=[];for(const elf of hostState?.enemies||[])if(elf?.gildedElf&&elf.alive){hidden.push(elf);elf.alive=false}
      try{return originalStepEnemies(hostState,map,players,dt,hooks,worldState)}finally{for(const elf of hidden)if(!elf.gildedResolved)elf.alive=true}
    };
  }

  if(typeof update==="function"){
    const originalUpdate=update;
    update=function updateV114GildedElf(dt){const result=originalUpdate.apply(this,arguments);try{updateGildedElf(Number(dt)||0)}catch(error){console.warn("[Lost Sizzler] Gilded Elf update failed",error)}return result};
  }

  if(typeof damageEnemy==="function"){
    const originalDamageEnemy=damageEnemy;
    damageEnemy=function damageEnemyV114GildedElf(enemy,power,element="energy",attacker=p1){if(enemy?.gildedElf){gildedHit(enemy,power,attacker);return}return originalDamageEnemy.apply(this,arguments)};
  }

  if(typeof collideWithEnemy==="function"){
    const originalCollideWithEnemy=collideWithEnemy;
    collideWithEnemy=function collideWithEnemyV114GildedElf(player,enemy,fromX,fromY){
      if(!enemy?.gildedElf)return originalCollideWithEnemy.apply(this,arguments);
      moveElfStep(enemy,player);if(player){player.x=fromX;player.y=fromY;player.rx=fromX;player.ry=fromY}return;
    };
  }

  if(typeof applyItem==="function"){
    const originalApplyItem=applyItem;
    applyItem=function applyItemV114GildedElf(item,player){
      if(item?.gildedElfCoin){const amount=Math.max(1,Number(item.scoreValue)||10);score+=amount;try{S.sfx("pickup");floatText(player.x,player.y,`+${amount} GOLD`,P.gold,{life:900})}catch(_){}return true}
      return originalApplyItem.apply(this,arguments);
    };
  }

  if(typeof drawEnemy==="function"){
    const originalDrawEnemy=drawEnemy;
    drawEnemy=function drawEnemyV114GildedElf(enemy){if(enemy?.gildedElf)return drawGildedElf(enemy);return originalDrawEnemy.apply(this,arguments)};
  }

  window.CCGLostSizzlerGildedElf={
    get state(){return state},
    constants:{spawnChance:SPAWN_CHANCE,lifetimeMs:LIFETIME_MS,passiveDropMs:PASSIVE_DROP_MS,hitDropCooldownMs:HIT_DROP_COOLDOWN_MS,moveMs:MOVE_MS}
  };
})();
