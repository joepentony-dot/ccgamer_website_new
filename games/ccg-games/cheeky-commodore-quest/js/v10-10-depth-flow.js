/* The Lost Sizzler V10.10 — depth-ramped combat and safe room thresholds.
 *
 * The first rooms of each floor are deliberately forgiving. Combat pressure
 * rises as the party reaches greater room depth, while ordinary enemies are
 * kept inside rooms so doors/corridors remain traversal space rather than
 * unavoidable kill funnels. The Death Stalker keeps its unique roaming rules.
 */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_DEPTH_FLOW_V110__)return;
  window.__CCG_LOST_SIZZLER_DEPTH_FLOW_V110__=true;

  const AI=window.CCGAI;
  const W=window.CCGWorld;
  if(!AI?.stepEnemies||!W?.roomAt)return;

  const ENTRY_GRACE_EARLY_MS=1250;
  const ENTRY_GRACE_LATE_MS=650;
  const DOOR_CLEARANCE=1;
  const floorState={floor:null,maxDepthReached:0,gracedRooms:new Set(),playerRooms:new Map()};
  let lastProfile={depth:0,maxDepth:1,progress:0,cadence:.72,damage:.66,shotChance:.62};

  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
  const roomAt=(worldState,x,y)=>{
    if(!worldState)return -1;
    try{return Number(W.roomAt(worldState,x,y))}catch(_){return -1}
  };
  const activeWorld=worldState=>worldState||window.__CCG_WORLD||null;
  const currentRun=()=>{
    try{return typeof run!=="undefined"?run:null}catch(_){return null}
  };
  const currentFloor=()=>{
    const state=currentRun();
    return Math.max(1,Number(state?.floor||1));
  };
  const isRoamingException=enemy=>Boolean(enemy?.deathStalker);
  const alivePlayers=players=>(players||[]).filter(player=>player&&Number(player.health||0)>0);

  function resetFloorIfNeeded(){
    const floor=currentFloor();
    if(floorState.floor===floor)return;
    floorState.floor=floor;
    floorState.maxDepthReached=0;
    floorState.gracedRooms.clear();
    floorState.playerRooms.clear();
  }

  function maxRoomDepth(worldState){
    const rooms=worldState?.rooms||[];
    let max=1;
    for(const room of rooms){
      if(room?.optional)continue;
      max=Math.max(max,Number(room?.depth||0));
    }
    return max;
  }

  function depthForRoom(worldState,roomId){
    if(roomId<0)return 0;
    return Math.max(0,Number(worldState?.rooms?.[roomId]?.depth||0));
  }

  function progressProfile(depth,maxDepth){
    const progress=clamp(maxDepth>0?depth/maxDepth:0,0,1);
    /*
     * Early map: substantially slower attacks/movement and fewer successful
     * attack attempts. Mid-map: close to the previous baseline. Deep map:
     * modestly above baseline, layered on top of the existing floor/level RPG
     * scaling rather than replacing it.
     */
    const cadence=.72+progress*.52;
    const damage=.66+progress*.48;
    const shotChance=.62+progress*.38;
    return{depth,maxDepth,progress,cadence,damage,shotChance};
  }

  function partyDepthProfile(players,worldState){
    resetFloorIfNeeded();
    const world=activeWorld(worldState);
    const maxDepth=maxRoomDepth(world);
    let currentDepth=0;
    for(const player of alivePlayers(players)){
      const roomId=roomAt(world,player.x,player.y);
      if(roomId>=0)currentDepth=Math.max(currentDepth,depthForRoom(world,roomId));
    }
    floorState.maxDepthReached=Math.max(floorState.maxDepthReached,currentDepth);
    const profile=progressProfile(floorState.maxDepthReached,maxDepth);
    lastProfile=profile;
    return profile;
  }

  function doorCells(hostState,roomId){
    const cells=[];
    for(const door of hostState?.doors||[]){
      if(Number(door?.roomId)!==Number(roomId))continue;
      cells.push({x:Number(door.x),y:Number(door.y)});
    }
    return cells;
  }

  function tooCloseToDoor(hostState,roomId,x,y){
    if(roomId<0)return false;
    return doorCells(hostState,roomId).some(door=>Math.abs(door.x-x)+Math.abs(door.y-y)<=DOOR_CLEARANCE);
  }

  function validInteriorCell(hostState,worldState,roomId,x,y,enemy){
    if(roomId<0||roomAt(worldState,x,y)!==roomId)return false;
    if(tooCloseToDoor(hostState,roomId,x,y))return false;
    try{if(!W.walkable(worldState.map,x,y,hostState))return false}catch(_){return false}
    return !(hostState?.enemies||[]).some(other=>other!==enemy&&other?.alive&&other.x===x&&other.y===y);
  }

  function nearestSafeInterior(hostState,worldState,roomId,enemy){
    const room=worldState?.rooms?.[roomId];
    if(!room)return null;
    const cx=Math.floor(room.x+room.w/2),cy=Math.floor(room.y+room.h/2),candidates=[];
    for(let y=room.y+1;y<room.y+room.h;y++){
      for(let x=room.x+1;x<room.x+room.w;x++){
        if(!validInteriorCell(hostState,worldState,roomId,x,y,enemy))continue;
        candidates.push({x,y,score:Math.abs(x-cx)+Math.abs(y-cy)});
      }
    }
    candidates.sort((a,b)=>a.score-b.score);
    return candidates[0]||null;
  }

  function resolveHomeRoom(enemy,worldState){
    if(!enemy)return -1;
    if(Number.isInteger(enemy._ccgHomeRoomId)&&enemy._ccgHomeRoomId>=0)return enemy._ccgHomeRoomId;
    const explicit=Number(enemy.roomId);
    if(Number.isInteger(explicit)&&explicit>=0&&worldState?.rooms?.[explicit]){
      enemy._ccgHomeRoomId=explicit;
      return explicit;
    }
    const live=roomAt(worldState,enemy.x,enemy.y);
    if(live>=0)enemy._ccgHomeRoomId=live;
    return live;
  }

  function sanitiseEnemyPosition(hostState,worldState,enemy,previous=null){
    if(!enemy?.alive||isRoamingException(enemy))return;
    const home=resolveHomeRoom(enemy,worldState);
    if(home<0)return;
    const current=roomAt(worldState,enemy.x,enemy.y);
    const invalid=current!==home||tooCloseToDoor(hostState,home,enemy.x,enemy.y);
    if(!invalid)return;

    if(previous&&validInteriorCell(hostState,worldState,home,previous.x,previous.y,enemy)){
      enemy.x=previous.x;
      enemy.y=previous.y;
      return;
    }
    const safe=nearestSafeInterior(hostState,worldState,home,enemy);
    if(safe){
      enemy.x=safe.x;
      enemy.y=safe.y;
    }
  }

  function noteRoomEntries(players,hostState,worldState,profile){
    const playerList=players||[];
    playerList.forEach((player,index)=>{
      if(!player||Number(player.health||0)<=0)return;
      const key=player.id??`player-${index}`;
      const roomId=roomAt(worldState,player.x,player.y);
      const previous=floorState.playerRooms.get(key);
      floorState.playerRooms.set(key,roomId);
      if(roomId<0||roomId===previous||roomId===worldState?.startRoomId||floorState.gracedRooms.has(roomId))return;

      floorState.gracedRooms.add(roomId);
      const roomProgress=clamp(depthForRoom(worldState,roomId)/Math.max(1,profile.maxDepth),0,1);
      const grace=Math.round(ENTRY_GRACE_EARLY_MS-(ENTRY_GRACE_EARLY_MS-ENTRY_GRACE_LATE_MS)*roomProgress);
      for(const enemy of hostState?.enemies||[]){
        if(!enemy?.alive||isRoamingException(enemy)||resolveHomeRoom(enemy,worldState)!==roomId)continue;
        enemy.attackCooldown=Math.max(Number(enemy.attackCooldown||0),grace);
        enemy.moveCooldown=Math.max(Number(enemy.moveCooldown||0),Math.min(650,Math.round(grace*.45)));
      }
    });
  }

  function sameCombatRoom(enemy,player,worldState){
    if(!enemy||!player)return false;
    if(isRoamingException(enemy))return true;
    const home=resolveHomeRoom(enemy,worldState);
    if(home<0)return false;
    return roomAt(worldState,enemy.x,enemy.y)===home&&roomAt(worldState,player.x,player.y)===home;
  }

  function scaledAttempt(enemy,key,chance){
    if(chance>=.999)return true;
    const property=`_ccgDepth${key}Meter`;
    const next=Number(enemy?.[property]||0)+clamp(chance,.05,1);
    if(enemy)enemy[property]=next;
    if(next<1)return false;
    if(enemy)enemy[property]=next-1;
    return true;
  }

  const originalStepEnemies=AI.stepEnemies.bind(AI);
  AI.stepEnemies=function stepEnemiesV110DepthFlow(hostState,map,players,dt,hooks={},worldState){
    const world=activeWorld(worldState);
    if(!world)return originalStepEnemies(hostState,map,players,dt,hooks,worldState);

    const profile=partyDepthProfile(players,world);
    const before=new Map();
    for(const enemy of hostState?.enemies||[]){
      if(!enemy?.alive)continue;
      resolveHomeRoom(enemy,world);
      sanitiseEnemyPosition(hostState,world,enemy);
      before.set(enemy.id,{x:enemy.x,y:enemy.y});
    }
    noteRoomEntries(players,hostState,world,profile);

    const wrappedHooks={...hooks};
    if(typeof hooks.melee==="function"){
      wrappedHooks.melee=(enemy,player,power,...rest)=>{
        if(!sameCombatRoom(enemy,player,world))return;
        const home=resolveHomeRoom(enemy,world);
        const roomProfile=progressProfile(depthForRoom(world,home),profile.maxDepth);
        if(!isRoamingException(enemy)&&!scaledAttempt(enemy,"Melee",Math.min(1,roomProfile.damage)))return;
        const scaledPower=roomProfile.damage>1?Math.max(1,Math.round(Number(power||1)*roomProfile.damage)):Math.max(1,Math.round(Number(power||1)));
        return hooks.melee(enemy,player,scaledPower,...rest);
      };
    }
    if(typeof hooks.shoot==="function"){
      wrappedHooks.shoot=(shot,...rest)=>{
        const enemy=(hostState?.enemies||[]).find(candidate=>candidate?.id===shot?.enemyId);
        if(enemy&&!isRoamingException(enemy)){
          const home=resolveHomeRoom(enemy,world);
          const hasTarget=alivePlayers(players).some(player=>roomAt(world,player.x,player.y)===home);
          if(!hasTarget)return;
          const roomProfile=progressProfile(depthForRoom(world,home),profile.maxDepth);
          if(!scaledAttempt(enemy,"Shot",roomProfile.shotChance))return;
          if(shot&&typeof shot==="object"){
            shot={...shot,damageScale:Number(shot.damageScale||1)*roomProfile.damage};
          }
        }
        return hooks.shoot(shot,...rest);
      };
    }

    const result=originalStepEnemies(hostState,map,players,Number(dt||0)*profile.cadence,wrappedHooks,worldState);

    for(const enemy of hostState?.enemies||[]){
      if(!enemy?.alive||isRoamingException(enemy))continue;
      sanitiseEnemyPosition(hostState,world,enemy,before.get(enemy.id)||null);
    }
    return result;
  };

  /* Keep the in-game rulebook aligned with the safer threshold rules. */
  try{
    for(const section of document.querySelectorAll(".rulebook-grid section")){
      const heading=section.querySelector("h3")?.textContent||"";
      if(!/DOORS & SECRETS/i.test(heading))continue;
      const paragraph=section.querySelector("p");
      if(paragraph)paragraph.textContent="Ordinary enemies remain inside their room, cannot occupy doorway cells and will not attack a player waiting in a corridor. Entering a new room gives a brief reaction window before its enemies fully engage. The Death Stalker is the exception: it can roam corridors and open ordinary room doors.";
    }
  }catch(_){}

  window.CCGLostSizzlerDepthFlowV110={
    getProfile:()=>({...lastProfile}),
    profileForDepth:progressProfile,
    getMaxDepthReached:()=>floorState.maxDepthReached,
    corridorSafe:true,
    doorwayClearance:DOOR_CLEARANCE
  };
})();
