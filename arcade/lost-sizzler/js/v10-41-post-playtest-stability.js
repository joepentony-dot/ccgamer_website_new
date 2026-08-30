/* The Lost Sizzler V10.41 — post-playtest gameplay stability guard.
 *
 * This late release layer fixes faults found in manual playtesting without
 * changing the six-mode controller boundary:
 * - Horde physical HP follows the Horde rules model instead of being clamped
 *   back to 1 HP after a lethal hit;
 * - one-player Horde defeat resolves immediately when no second wind exists;
 * - compact Horde traversal geometry is retried against real start flows;
 * - the obsolete canvas Horde banner is suppressed in favour of the DOM roster;
 * - Spy keeps logical grid collision/networking while render coordinates ease
 *   between accepted one-tile moves;
 * - an impossible/non-finite Solo fire cooldown cannot permanently disable fire;
 * - busy online modes trim visual-only effect backlogs before they can snowball.
 */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V141_POST_PLAYTEST_STABILITY__)return;
  window.__CCG_LOST_SIZZLER_V141_POST_PLAYTEST_STABILITY__=true;

  const MODE_HORDE="horde-survivor",MODE_SPY="sizzler-saboteurs",MONITOR_MS=40;
  const state={
    timer:0,hurtWrapped:false,renderWrapped:false,spyWrapped:false,
    hordeHpSyncs:0,hordeSoloDefeats:0,hordeTerminalLocks:0,hordeArenaRetries:0,hordeArenaReady:0,hordeArenaInvalidations:0,
    bannerRectsSuppressed:0,bannerTextSuppressed:0,spySmoothedFrames:0,spySmoothedMoves:0,
    fireCooldownRepairs:0,fireBufferRepairs:0,visualTrims:0,lastRepairAt:0
  };

  const active=()=>{try{return window.CCGLostSizzlerSpecialModes?.active||null}catch(_){return null}};
  const specialType=()=>String(active()?.type||document.body?.dataset?.specialMode||"");
  const isHorde=()=>specialType()===MODE_HORDE;
  const isSpy=()=>specialType()===MODE_SPY;
  const finite=value=>Number.isFinite(Number(value));
  const now=()=>Date.now();

  function physicalPlayers(){
    const out=[];
    try{if(typeof p1!=="undefined"&&p1)out.push(p1)}catch(_){}
    try{if(typeof p2!=="undefined"&&p2&&!out.includes(p2))out.push(p2)}catch(_){}
    try{for(const player of remote?.values?.()||[])if(player&&!out.includes(player))out.push(player)}catch(_){}
    return out
  }

  function hordeState(){return isHorde()?active()?.state||null:null}
  function hordeModelFor(player,runState=hordeState()){
    if(!player||!runState)return null;
    const id=String(player.id||"");
    return (runState.players||[]).find(model=>String(model?.id||"")===id)||null
  }

  function resolveSoloHordeDefeat(runState=hordeState()){
    if(!runState||Number(runState.playerCount||0)!==1||["defeat","victory"].includes(String(runState.state||"")))return false;
    const player=runState.players?.[0];
    if(!player||Number(player.hp||0)>0||String(player.status||"")!=="downed")return false;
    // A valid Solo second wind is represented by the rules engine as
    // `second-wind`, never `downed`. Reaching this branch means no revive path
    // exists, so a 20-second multiplayer down timer would only leave a dead
    // body being attacked in an unwinnable game.
    player.status="eliminated";player.downedAt=0;player.downExpiresAt=0;
    if(runState.revives&&typeof runState.revives==="object")delete runState.revives[player.id];
    runState.state="defeat";runState.completedAt=now();runState.events=Array.isArray(runState.events)?runState.events:[];
    runState.events.push({type:"player-eliminated",playerId:player.id,at:runState.completedAt});
    runState.events.push({type:"defeat",at:runState.completedAt});
    state.hordeSoloDefeats++;state.lastRepairAt=now();return true
  }

  function setPatchLock(player,locked){
    if(!player)return;
    if(locked){
      player._v141PostPlaytestHordeLock=true;
      if("controlLocked" in player)player.controlLocked=true;
      if("controlsLocked" in player)player.controlsLocked=true;
      player.hitStunMs=Math.max(250,Number(player.hitStunMs||0));
      return
    }
    if(!player._v141PostPlaytestHordeLock)return;
    delete player._v141PostPlaytestHordeLock;
    if("controlLocked" in player)player.controlLocked=false;
    if("controlsLocked" in player)player.controlsLocked=false;
    if(Number(player.hitStunMs||0)<=300)player.hitStunMs=0;
  }

  function clearTerminalInput(){
    try{input?.clear?.()}catch(_){}
    try{if(typeof fireBuffer1!=="undefined")fireBuffer1=0}catch(_){}
    try{if(typeof fireBuffer2!=="undefined")fireBuffer2=0}catch(_){}
    try{if(typeof move1!=="undefined")move1=Math.max(120,Number(move1||0))}catch(_){}
    try{if(typeof move2!=="undefined")move2=Math.max(120,Number(move2||0))}catch(_){}
    try{if(typeof fire1!=="undefined")fire1=Math.max(120,Number(fire1||0))}catch(_){}
    try{if(typeof fire2!=="undefined")fire2=Math.max(120,Number(fire2||0))}catch(_){}
  }

  function syncHordePhysicalState(){
    const runState=hordeState();if(!runState)return false;
    resolveSoloHordeDefeat(runState);
    const terminal=["defeat","victory"].includes(String(runState.state||""));let changed=false;
    for(const player of physicalPlayers()){
      const model=hordeModelFor(player,runState);if(!model)continue;
      const status=String(model.status||"active"),maxHp=Math.max(1,Number(model.maxHp||player.maxHealth||10));
      player.maxHealth=maxHp;
      if(status==="active"){
        const hp=Math.max(0,Math.min(maxHp,Number(model.hp??player.health??maxHp)));
        if(Number(player.health)!==hp){player.health=hp;changed=true}
        setPatchLock(player,terminal);
      }else{
        if(Number(player.health)!==0){player.health=0;changed=true}
        setPatchLock(player,true);
      }
      if(status!=="active")player.hpBarMs=Math.max(1200,Number(player.hpBarMs||0));
    }
    if(terminal){clearTerminalInput();state.hordeTerminalLocks++}
    if(changed){state.hordeHpSyncs++;state.lastRepairAt=now()}
    return changed
  }

  function installHurtGuard(){
    const current=window.hurtPlayer;if(typeof current!=="function")return false;
    if(current.__ccgV141PostPlaytestHurt){state.hurtWrapped=true;return true}
    // Spy intentionally owns hurtPlayer while its isolated runtime is active.
    // Do not compete with that owner; the monitor installs/reinstalls only when
    // the shared/Horde damage stack is visible.
    if(isSpy()||current.__ccgV141SpyDamageBoundary)return false;
    const original=current;
    const wrapped=function hurtPlayerV141PostPlaytest(){
      const result=original.apply(this,arguments);
      if(isHorde())syncHordePhysicalState();
      return result
    };
    wrapped.__ccgV141PostPlaytestHurt=true;wrapped.__ccgOriginal=original;
    window.hurtPlayer=wrapped;state.hurtWrapped=true;return true
  }

  function hordeTraversalGeometryHealthy(){
    if(!isHorde())return false;
    try{
      const room=world?.rooms?.[0],map=world?.map;
      if(!world?._v141CompactHordeArena||!world?._v141TraversalHordeArena||!room?.hordeTraversalArena||Number(room?.hordeTraversalBlocks||0)<4||!Array.isArray(map))return false;
      let interiorWalls=0;
      for(let y=room.y+4;y<=room.y+room.h-4;y++)for(let x=room.x+4;x<=room.x+room.w-4;x++)if(map?.[y]?.[x]===1)interiorWalls++;
      if(interiorWalls<40)return false;
      const centreX=Math.round(room.x+room.w/2),centreY=Math.round(room.y+room.h/2);
      return map?.[centreY]?.[centreX]===0
    }catch(_){return false}
  }

  function invalidateHordeTraversalGeometry(){
    try{
      if(typeof world==="undefined"||!world)return false;
      const room=world.rooms?.[0];
      delete world._v141TraversalHordeArena;
      if(room){delete room.hordeTraversalArena;delete room.hordeTraversalBlocks}
      state.hordeArenaInvalidations++;state.lastRepairAt=now();return true
    }catch(_){return false}
  }

  function ensureHordeArena(){
    if(!isHorde())return false;
    try{
      if(!world?._v141CompactHordeArena){state.hordeArenaRetries++;window.CCGLostSizzlerV141BrowserStabilityGameplay?.compactHordeArena?.()}
      if(world?._v141CompactHordeArena&&!hordeTraversalGeometryHealthy()){
        if(world?._v141TraversalHordeArena||world?.rooms?.[0]?.hordeTraversalArena)invalidateHordeTraversalGeometry();
        state.hordeArenaRetries++;window.CCGLostSizzlerHordeModeSafety?.shapeHordeArena?.();
      }
      if(hordeTraversalGeometryHealthy()){state.hordeArenaReady++;return true}
    }catch(_){}
    return false
  }

  function legacyHordeBannerRect(x,y,w,h){
    if(!isHorde())return false;
    const nx=Number(x),ny=Number(y),nw=Number(w),nh=Number(h);
    return [nx,ny,nw,nh].every(Number.isFinite)&&nx>=13&&nx<=15&&ny>=13&&ny<=15&&nw>=300&&nh>=68&&nh<=71
  }
  function legacyHordeBannerText(text,x,y){
    if(!isHorde())return false;
    const value=String(text||""),nx=Number(x),ny=Number(y);
    return nx>=25&&nx<=30&&ny>=34&&ny<=66&&(/^HORDE SURVIVOR · WAVE /.test(value)||/^DEFEATED /.test(value))
  }

  function installRenderGuard(){
    const current=window.render;if(typeof current!=="function")return false;
    // r35 owns the top-level Spy render chain so its black-frame watchdog is
    // never displaced by this Horde-only presentation guard.
    if(isSpy()&&current.__ccgV141R35SpyBlackGuard)return true;
    if(current.__ccgV141PostPlaytestRender){state.renderWrapped=true;return true}
    const original=current;
    const wrapped=function renderV141PostPlaytest(){
      if(!isHorde()||!ctx)return original.apply(this,arguments);
      const baseFillRect=ctx.fillRect,baseStrokeRect=ctx.strokeRect,baseFillText=ctx.fillText;
      try{
        ctx.fillRect=function(x,y,w,h){if(legacyHordeBannerRect(x,y,w,h)){state.bannerRectsSuppressed++;return}return baseFillRect.apply(this,arguments)};
        ctx.strokeRect=function(x,y,w,h){if(legacyHordeBannerRect(x,y,w,h)){state.bannerRectsSuppressed++;return}return baseStrokeRect.apply(this,arguments)};
        ctx.fillText=function(text,x,y){if(legacyHordeBannerText(text,x,y)){state.bannerTextSuppressed++;return}return baseFillText.apply(this,arguments)};
        return original.apply(this,arguments)
      }finally{
        ctx.fillRect=baseFillRect;ctx.strokeRect=baseStrokeRect;ctx.fillText=baseFillText
      }
    };
    wrapped.__ccgV141PostPlaytestRender=true;wrapped.__ccgOriginal=original;
    window.render=wrapped;state.renderWrapped=true;return true
  }

  function spyActors(){
    const out=[];
    try{if(typeof p1!=="undefined"&&p1)out.push(p1)}catch(_){}
    try{for(const player of remote?.values?.()||[])if(player&&!out.includes(player))out.push(player)}catch(_){}
    return out
  }
  function actorKey(player,index=0){return String(player?.id||`actor-${index}`)}
  function installSpySmoothing(){
    const engine=window.CCGLostSizzlerV141R29SpyEngine,current=engine?.isolatedUpdate;
    if(typeof current!=="function")return false;
    if(current.__ccgV141PostPlaytestSpySmooth){state.spyWrapped=true;return true}
    const original=current;
    const wrapped=function isolatedUpdateV141PostPlaytest(){
      const before=new Map();spyActors().forEach((player,index)=>before.set(actorKey(player,index),{x:Number(player.x),y:Number(player.y),rx:Number(player.rx),ry:Number(player.ry)}));
      const result=original.apply(this,arguments);
      if(!isSpy())return result;
      spyActors().forEach((player,index)=>{
        const prior=before.get(actorKey(player,index));if(!prior)return;
        const x=Number(player.x),y=Number(player.y);if(!Number.isFinite(x)||!Number.isFinite(y))return;
        let rx=Number(player.rx),ry=Number(player.ry);if(!Number.isFinite(rx))rx=Number.isFinite(prior.rx)?prior.rx:prior.x;if(!Number.isFinite(ry))ry=Number.isFinite(prior.ry)?prior.ry:prior.y;
        const dx=x-prior.x,dy=y-prior.y,distance=Math.abs(dx)+Math.abs(dy),moved=distance>0;
        const snapped=Math.abs(rx-x)<.001&&Math.abs(ry-y)<.001;
        if(moved&&distance<=1.5&&snapped){rx=Number.isFinite(prior.rx)?prior.rx:prior.x;ry=Number.isFinite(prior.ry)?prior.ry:prior.y;state.spySmoothedMoves++}
        if(distance>2){player.rx=x;player.ry=y;return}
        const local=(()=>{try{return player===p1}catch(_){return false}})(),factor=local?.32:.28;
        player.rx=rx+(x-rx)*factor;player.ry=ry+(y-ry)*factor;
      });
      state.spySmoothedFrames++;return result
    };
    wrapped.__ccgV141PostPlaytestSpySmooth=true;wrapped.__ccgOriginal=original;
    engine.isolatedUpdate=wrapped;
    const registered=window.CCGLostSizzlerModeRuntime?.runtimes?.[MODE_SPY];if(registered)registered.update=wrapped;
    state.spyWrapped=true;return true
  }

  function dungeonSoloActive(){
    if(specialType())return false;
    try{return mode==="playing"&&String(playMode||"solo")==="solo"&&document.body?.dataset?.hordeSolo!=="true"}catch(_){return false}
  }
  function repairSoloFireState(){
    if(!dungeonSoloActive())return false;let repaired=false;
    try{
      if(typeof fire1!=="undefined"&&(!Number.isFinite(Number(fire1))||Number(fire1)>2500)){fire1=0;state.fireCooldownRepairs++;repaired=true}
    }catch(_){}
    try{
      if(typeof fireBuffer1!=="undefined"&&(!Number.isFinite(Number(fireBuffer1))||Number(fireBuffer1)>2000||Number(fireBuffer1)<0)){fireBuffer1=0;state.fireBufferRepairs++;repaired=true}
    }catch(_){}
    if(repaired)state.lastRepairAt=now();return repaired
  }

  function trimArray(name,max){
    try{
      const list=eval(name);if(!Array.isArray(list)||list.length<=max)return 0;
      const removed=list.length-max;list.splice(0,removed);return removed
    }catch(_){return 0}
  }
  function trimVisualBacklog(){
    let online=false;try{online=String(playMode||"")==="online"}catch(_){}
    if(!isHorde()&&!isSpy()&&!online)return 0;
    const horde=isHorde(),removed=trimArray("particles",horde?420:560)+trimArray("rings",horde?90:130)+trimArray("floaters",horde?70:100);
    if(removed){state.visualTrims+=removed;state.lastRepairAt=now()}return removed
  }

  function monitor(){
    installRenderGuard();installSpySmoothing();
    if(!isSpy())installHurtGuard();
    if(isHorde()){ensureHordeArena();syncHordePhysicalState()}
    repairSoloFireState();trimVisualBacklog();
  }

  monitor();state.timer=setInterval(monitor,MONITOR_MS);
  addEventListener("pagehide",()=>{if(state.timer)clearInterval(state.timer);state.timer=0},{once:true});
  window.CCGLostSizzlerV141PostPlaytestStability={
    monitor,ensureHordeArena,hordeTraversalGeometryHealthy,invalidateHordeTraversalGeometry,syncHordePhysicalState,resolveSoloHordeDefeat,repairSoloFireState,trimVisualBacklog,
    installHurtGuard,installRenderGuard,installSpySmoothing,get state(){return state}
  };
})();