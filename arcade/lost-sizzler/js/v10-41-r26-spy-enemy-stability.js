/* The Lost Sizzler V10.41 r26 — Spy movement and Solo enemy stability hotfix.
 *
 * Final live-regression goals:
 * - Spy Vs Spy walking cannot be accelerated by the older movement fallback chain;
 * - r24 Solo population rehomes and V10.10 home-room containment share one room owner;
 * - large enemy relocation jumps snap render interpolation instead of smearing across rooms;
 * - horizontal enemy sprite facing remains stable when AI movement is vertical or rejected;
 * - visual stabilisation never rewrites live enemy alert/search AI state.
 */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V141_R26_SPY_ENEMY_STABILITY__)return;
  window.__CCG_LOST_SIZZLER_V141_R26_SPY_ENEMY_STABILITY__=true;

  const SPY_MOVE_CADENCE_MS=220;
  const ENEMY_VISUAL_SNAP_DISTANCE=3;
  const state={
    updateInstalled:false,moveInstalled:false,renderInstalled:false,
    controllerOwnedUpdate:false,controllerOwnedMovement:false,controllerPreFrames:0,controllerPostFrames:0,
    spyMovesObserved:0,spyStepsBlocked:0,spyRoundKey:"",
    enemyHomeRepairs:0,enemyVisualSnaps:0,enemyFacingRepairs:0,timer:0
  };
  const spyMoveAt=new Map();
  const enemyState=new Map();

  const now=()=>{try{return Number(performance.now())||0}catch(_){return Date.now()}};
  const specialMode=()=>{try{return String(window.CCGLostSizzlerSpecialModes?.active?.type||document.body?.dataset?.specialMode||"")}catch(_){return""}};
  const spyActive=()=>specialMode()==="sizzler-saboteurs";
  const normalSoloDungeon=()=>{
    try{
      const r24=window.CCGLostSizzlerV141R24LiveRegressions;
      if(typeof r24?.normalSoloDungeonMode==="function")return r24.normalSoloDungeonMode();
      return Boolean(run&&mode==="playing"&&net?.mode==="solo"&&!p2&&!run.daily&&document.body?.dataset?.tutorialActive!=="true"&&!specialMode());
    }catch(_){return false}
  };
  const roomAt=(x,y)=>{try{return Number(window.CCGWorld?.roomAt?.(world,Number(x),Number(y))??-1)}catch(_){return-1}};
  const playerKey=player=>String(player?.id||"P1");
  const activePlayers=()=>{
    try{return (typeof allPlayers==="function"?allPlayers():[p1,p2,...(remote?.values?.()||[])]).filter(player=>player&&Number(player.health||0)>0)}catch(_){return[]}
  };

  function inheritMarkers(wrapped,current){
    try{Object.assign(wrapped,current)}catch(_){}
    return wrapped;
  }

  function syncSpyRound(){
    if(!spyActive()){state.spyRoundKey="";spyMoveAt.clear();return false}
    const active=window.CCGLostSizzlerSpecialModes?.active,round=Number(active?.state?.round||0),seed=String(active?.seed||active?.state?.seed||"");
    const key=`${seed}|${round}`;if(state.spyRoundKey===key)return false;
    state.spyRoundKey=key;spyMoveAt.clear();
    try{const r24=window.CCGLostSizzlerV141R24LiveRegressions;if(r24?.state)r24.state.spyMoveCooldownMs=0}catch(_){}
    return true;
  }

  function spyRemaining(player,time=now()){
    if(!spyActive()||!player)return 0;
    const last=Number(spyMoveAt.get(playerKey(player))||0);if(!last)return 0;
    return Math.max(0,SPY_MOVE_CADENCE_MS-(Number(time)-last));
  }

  function armSpyTimers(player,remaining,dt=0){
    const value=Math.max(0,Number(remaining)||0);if(!player||!value)return value;
    try{
      if(typeof p1!=="undefined"&&player===p1&&typeof move1!=="undefined")move1=Math.max(Number(move1)||0,value);
      if(typeof p2!=="undefined"&&player===p2&&typeof move2!=="undefined")move2=Math.max(Number(move2)||0,value);
    }catch(_){}
    try{
      const r24=window.CCGLostSizzlerV141R24LiveRegressions;
      if(r24?.state)r24.state.spyMoveCooldownMs=Math.max(Number(r24.state.spyMoveCooldownMs)||0,value+Math.max(0,Number(dt)||0));
    }catch(_){}
    return value;
  }

  function noteSpyMove(player,time=now()){
    if(!player)return false;spyMoveAt.set(playerKey(player),Number(time)||now());state.spyMovesObserved++;
    armSpyTimers(player,SPY_MOVE_CADENCE_MS,0);return true;
  }

  function installMoveGuard(){
    // Spy movement cadence is owned by the isolated r29 engine. Keep the r26
    // diagnostic helpers available without wrapping shared movement.
    state.controllerOwnedMovement=true;state.moveInstalled=true;return true;
  }

  function snapEnemyVisual(enemy){
    if(!enemy)return false;
    try{
      if(typeof enemyVisuals!=="undefined"&&enemyVisuals?.set){enemyVisuals.set(enemy.id,{rx:Number(enemy.x),ry:Number(enemy.y)});state.enemyVisualSnaps++;return true}
    }catch(_){}
    return false;
  }

  function sameRoomLivingPlayer(roomId){return activePlayers().find(player=>roomAt(player.x,player.y)===Number(roomId))||null}

  function syncEnemyHomeOwnership(){
    if(!normalSoloDungeon())return 0;
    let repaired=0;
    try{
      for(const enemy of host?.enemies||[]){
        if(!enemy?.alive||enemy.deathStalker||enemy.voidStalker)continue;
        const current=roomAt(enemy.x,enemy.y),r24Room=Number(enemy._ccgR24LastRoomId);
        if(current<0||!Number.isInteger(r24Room)||r24Room<0||current!==r24Room)continue;
        if(Number(enemy._ccgHomeRoomId)===r24Room&&Number(enemy.roomId)===r24Room)continue;
        enemy._ccgHomeRoomId=r24Room;enemy.roomId=r24Room;
        enemy.aiState="idle";enemy.lastSeen=null;enemy.targetId=null;enemy.memoryMs=0;enemy.searchMs=0;
        enemy.moveCooldown=Math.max(350,Number(enemy.moveCooldown)||0);
        snapEnemyVisual(enemy);repaired++;
      }
    }catch(_){}
    state.enemyHomeRepairs+=repaired;return repaired;
  }

  function stableFacingFor(enemy,previous){
    let facingX=Number(previous?.facingX||0),dx=0;
    if(previous)dx=Number(enemy.x)-Number(previous.x);
    if(dx>0)facingX=1;else if(dx<0)facingX=-1;
    else{
      const rid=roomAt(enemy.x,enemy.y),target=sameRoomLivingPlayer(rid);
      if(enemy.aiState==="chase"&&target&&Number(target.x)!==Number(enemy.x))facingX=Math.sign(Number(target.x)-Number(enemy.x));
      else if(!facingX&&Number(enemy.facing?.x))facingX=Math.sign(Number(enemy.facing.x));
    }
    return facingX||1;
  }

  function stabiliseEnemyVisualState(){
    if(!normalSoloDungeon()){enemyState.clear();return 0}
    let changed=0;const liveIds=new Set();
    try{
      for(const enemy of host?.enemies||[]){
        if(!enemy?.alive)continue;const id=String(enemy.id||"");if(!id)continue;liveIds.add(id);
        const previous=enemyState.get(id),x=Number(enemy.x),y=Number(enemy.y),facingX=stableFacingFor(enemy,previous);
        if(previous){
          const jump=Math.abs(x-Number(previous.x))+Math.abs(y-Number(previous.y));if(jump>ENEMY_VISUAL_SNAP_DISTANCE)snapEnemyVisual(enemy);
          if(previous.facingX!==facingX)changed++;
          // Visual/interpolation repair must never own idle/chase/search. The core
          // AI is the sole alert-state owner; rewriting chase here caused a
          // chase->search->chase loop, repeated !/? indicators and visible stutter.
        }
        enemyState.set(id,{x,y,facingX,rawFacing:enemy.facing?{x:Number(enemy.facing.x)||0,y:Number(enemy.facing.y)||0}:null});
      }
      for(const id of [...enemyState.keys()])if(!liveIds.has(id))enemyState.delete(id);
    }catch(_){}
    state.enemyFacingRepairs+=changed;return changed;
  }

  function installRenderGuard(){
    if(typeof window.drawPixelEnemySprite!=="function")return false;
    if(window.drawPixelEnemySprite.__ccgV141R26EnemyFacing){state.renderInstalled=true;return true}
    const current=window.drawPixelEnemySprite;
    const wrapped=function drawPixelEnemySpriteV141R26StableFacing(enemy,cx,cy){
      if(!normalSoloDungeon()||!enemy)return current.apply(this,arguments);
      const row=enemyState.get(String(enemy.id||""));if(!row?.facingX)return current.apply(this,arguments);
      const originalFacing=enemy.facing;enemy.facing={...(originalFacing||{}),x:row.facingX};
      try{return current.apply(this,arguments)}finally{enemy.facing=originalFacing}
    };
    inheritMarkers(wrapped,current);wrapped.__ccgV141R26EnemyFacing=true;window.drawPixelEnemySprite=wrapped;state.renderInstalled=true;return true;
  }

  function preControllerFrame(controllerId){
    if(String(controllerId||"")!=="dungeon-solo")return false;
    syncEnemyHomeOwnership();state.controllerPreFrames++;return true;
  }

  function postControllerFrame(controllerId){
    if(String(controllerId||"")!=="dungeon-solo")return false;
    stabiliseEnemyVisualState();state.controllerPostFrames++;return true;
  }

  function installUpdateGuard(){
    // Enemy compatibility work is dispatched by the Dungeon Solo controller.
    // Spy rules and cadence are owned by the isolated Spy engine.
    state.controllerOwnedUpdate=true;state.updateInstalled=true;return true;
  }

  function install(){
    const moveReady=installMoveGuard(),updateReady=installUpdateGuard(),renderReady=installRenderGuard();
    syncEnemyHomeOwnership();stabiliseEnemyVisualState();return Boolean(moveReady&&updateReady&&renderReady);
  }

  install();state.timer=setInterval(install,250);
  addEventListener("pagehide",()=>{if(state.timer)clearInterval(state.timer);state.timer=0;spyMoveAt.clear();enemyState.clear()},{once:true});
  window.CCGLostSizzlerV141R26SpyEnemyStability={
    install,preControllerFrame,postControllerFrame,syncSpyRound,spyRemaining,armSpyTimers,noteSpyMove,syncEnemyHomeOwnership,stabiliseEnemyVisualState,snapEnemyVisual,
    constants:{SPY_MOVE_CADENCE_MS,ENEMY_VISUAL_SNAP_DISTANCE},get state(){return state}
  };
})();