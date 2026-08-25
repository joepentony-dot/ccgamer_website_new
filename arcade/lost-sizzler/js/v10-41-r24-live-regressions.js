/* The Lost Sizzler V10.41 r24 — live regression repair.
 *
 * Targets three reported live issues without changing the ordinary dungeon rules:
 * - Spy Vs Spy local movement can never remain stuck at round start after a valid keypress;
 * - ranged enemies get a reaction beat / occasional hesitation and final 8-way aim;
 * - the desktop rating prompt is centred in the viewport instead of inheriting rail geometry.
 */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V141_R24_LIVE_REGRESSIONS__)return;
  window.__CCG_LOST_SIZZLER_V141_R24_LIVE_REGRESSIONS__=true;

  const held=new Set();
  const state={
    updateInstalled:false,aiInstalled:false,spyFallbackMoves:0,spyPrimes:0,
    delayedEnemyShots:0,hesitatedEnemyShots:0,diagonalEnemyShots:0,
    spyMoveCooldownMs:0,spyRoundKey:"",timer:0
  };

  const spyActive=()=>{
    try{return window.CCGLostSizzlerSpecialModes?.active?.type==="sizzler-saboteurs"||document.body?.dataset?.specialMode==="sizzler-saboteurs"}catch(_){return false}
  };
  const editable=target=>{
    try{return typeof Element!=="undefined"&&target instanceof Element&&Boolean(target.closest("input,textarea,select,[contenteditable='true'],[contenteditable='']"))}catch(_){return false}
  };
  const finite=value=>Number.isFinite(Number(value));
  const actorModel=player=>{
    try{return window.CCGLostSizzlerSpecialModes?.active?.state?.players?.find(row=>String(row?.id||"")===String(player?.id||""))||null}catch(_){return null}
  };
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
    if(typeof window.update!=="function")return false;
    if(window.update.__ccgV141R24SpyMovement){state.updateInstalled=true;return true}
    const original=window.update;
    window.update=function updateV141R24SpyMovement(dt){
      const delta=Math.max(0,Number(dt)||0);state.spyMoveCooldownMs=Math.max(0,state.spyMoveCooldownMs-delta);
      let before=null,dir=null,local=null;
      try{
        if(spyActive()){ensureLocalSpySpawn();local=p1;dir=spyDirection();if(local&&dir)before={x:local.x,y:local.y}}
      }catch(_){}
      const result=original.apply(this,arguments);
      try{
        if(local&&dir&&spyActive()&&typeof mode!=="undefined"&&mode==="playing"&&spyCanMove(local)&&local.x===before?.x&&local.y===before?.y&&state.spyMoveCooldownMs<=0){
          const moved=trySpyFallbackStep(local,dir.x,dir.y);state.spyMoveCooldownMs=moved?Math.max(90,Number(window.CCG_CONFIG?.player?.moveDelay||138)):70;
        }
      }catch(_){}
      return result;
    };
    window.update.__ccgV141R24SpyMovement=true;state.updateInstalled=true;return true;
  }

  function livingPlayers(players){return (players||[]).filter(player=>player&&Number(player.health||0)>0)}
  function nearestTarget(enemy,players){
    return livingPlayers(players).sort((a,b)=>Math.hypot(a.x-enemy.x,a.y-enemy.y)-Math.hypot(b.x-enemy.x,b.y-enemy.y))[0]||null;
  }

  function normaliseEnemyShot(hostState,players,shot,nowValue=performance.now(),randomValue=Math.random()){
    if(!shot||typeof shot!=="object")return{shot,suppress:false,reason:"none"};
    const enemy=(hostState?.enemies||[]).find(row=>String(row?.id||"")===String(shot.enemyId||""));
    if(!enemy)return{shot,suppress:false,reason:"none"};
    const now=Number(nowValue)||0,last=Number(enemy._ccgR24ShotAttemptAt||0),fresh=!last||now-last>2800;
    enemy._ccgR24ShotAttemptAt=now;
    if(fresh){enemy._ccgR24ReactionReady=true;state.delayedEnemyShots++;return{shot,suppress:true,reason:"reaction"}}
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
        #ccg-rating-panel>.ccg-rating-rail-card,#ccg-rating-panel>.panel{
          width:100%!important;max-width:none!important;margin:0!important;box-sizing:border-box!important;
        }
      }
    `;
    document.head.appendChild(style);return true;
  }

  function install(){installSpyUpdateGuard();installEnemyFireGuard();installRatingCentreStyle();try{ensureLocalSpySpawn()}catch(_){}return state.updateInstalled&&state.aiInstalled}

  addEventListener("keydown",event=>{if(editable(event.target))return;held.add(event.code)},true);
  addEventListener("keyup",event=>held.delete(event.code),true);
  addEventListener("blur",()=>held.clear(),{passive:true});
  document.addEventListener("visibilitychange",()=>{if(document.hidden)held.clear()},{passive:true});

  install();state.timer=setInterval(install,180);
  addEventListener("pagehide",()=>{held.clear();if(state.timer)clearInterval(state.timer);state.timer=0},{once:true});
  window.CCGLostSizzlerV141R24LiveRegressions={install,spyDirection,spyCanMove,walkableStep,trySpyFallbackStep,ensureLocalSpySpawn,normaliseEnemyShot,get state(){return state}};
})();
