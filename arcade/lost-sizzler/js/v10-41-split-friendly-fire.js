/* The Lost Sizzler V10.41 — local split-screen player collision, budging and melee friendly fire. */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V141_SPLIT_FRIENDLY_FIRE__)return;
  window.__CCG_LOST_SIZZLER_V141_SPLIT_FRIENDLY_FIRE__=true;

  const PUSH_HOLD_MS=3000;
  const PUSH_GRACE_MS=850;
  const STARTER_MELEE={power:1,cooldown:390,colour:"#ffd85a",short:"SWORD"};
  const P2_CONTROL_CODES=Object.freeze(["KeyJ","KeyL","KeyI","KeyK","Enter","ControlRight","KeyO"]);
  const state={fireWrapped:null,moveWrapped:null,toastWrapped:false,sayWrapped:false,timer:0,observer:null,pushes:new Map(),controllerId:"",controllerResets:0,lastControllerResetReason:"",movementOwnershipYields:0};

  function splitReady(){
    try{return Boolean(window.CCGLostSizzlerReleaseGate?.state?.ready&&window.__CCG_LOST_SIZZLER_MELEE_AMMO_V125__&&typeof firePlayer==="function"&&typeof hurtPlayer==="function"&&typeof movePlayer==="function")}catch(_){return false}
  }

  function splitPlayers(){
    try{return typeof localPlayers==="function"?localPlayers():[p1,p2].filter(Boolean)}catch(_){return[]}
  }

  function directionFor(player,requested){
    const source=requested&&(requested.x||requested.y)?requested:player?.dir;
    const x=Math.sign(Number(source?.x||0)),y=Math.sign(Number(source?.y||0));
    return x||y?{x,y}:{x:1,y:0};
  }

  function meleeFor(player){return player?.meleeWeapon||STARTER_MELEE}
  function meleeDamage(player){
    const melee=meleeFor(player),mastery=Math.floor(Math.max(0,Number(player?.level||1)-1)/5),bonus=Math.floor(Number(player?.damageBonus||0)*.5);
    return Math.max(1,Number(melee.power||1)+mastery+bonus);
  }

  function adjacentOpponent(player,dir){
    if(!player||String(playMode)!=="split")return null;
    const targetX=Number(player.x)+dir.x,targetY=Number(player.y)+dir.y;
    return splitPlayers().find(other=>other&&other!==player&&Number(other.health||0)>0&&Number(other.x)===targetX&&Number(other.y)===targetY)||null;
  }

  function friendlyMelee(player,target,dir){
    if(!player||!target||String(playMode)!=="split"||String(mode)!=="playing"||(player.hitStunMs||0)>0)return false;
    const cooldown=player===p2?Number(fire2||0):Number(fire1||0);if(cooldown>0)return false;
    const melee=meleeFor(player),swingCooldown=Math.max(180,Number(melee.cooldown||390)),colour=String(melee.colour||"#ffd85a"),damage=meleeDamage(player);

    player.dir={...dir};
    player._meleeSwingAt=performance.now();
    player._meleeSwingMs=Math.max(220,Math.min(320,swingCooldown*.68));
    player._meleeSwingDir={...dir};
    player._meleeSwingColour=colour;
    if(player===p2)fire2=swingCooldown;else fire1=swingCooldown;
    player.emergencyRechargeMs=0;

    try{S?.sfx?.("dash")}catch(_){}
    try{ring?.(target.x,target.y,colour,25)}catch(_){}
    try{burst?.(target.x,target.y,colour,13,1)}catch(_){}
    try{floatText?.(target.x,target.y,`${String(melee.short||"SWORD").toUpperCase()} HIT!`,colour,{life:620})}catch(_){}

    hurtPlayer(target,damage,true,player.name||`Player ${player===p2?2:1}`,player.id);
    try{if(run)run.alert=Math.min(100,Number(run.alert||0)+.45)}catch(_){}
    try{sync?.()}catch(_){}
    return true;
  }

  function resetPush(player){if(player?.id!=null)state.pushes.delete(String(player.id))}
  function resetAllPushes(){state.pushes.clear()}

  function resetP2ControlState(){
    try{move2=0}catch(_){}
    try{fire2=0}catch(_){}
    try{fireBuffer2=0}catch(_){}
    try{for(const code of P2_CONTROL_CODES)input?.delete?.(code)}catch(_){}
    try{
      if(p2){
        if(Number(p2.hitStunMs||0)>0)p2.hitStunMs=0;
        if("controlLocked" in p2)p2.controlLocked=false;
        if("controlsLocked" in p2)p2.controlsLocked=false;
      }
    }catch(_){}
  }

  function resetControllerState(reason="split controller transition"){
    resetAllPushes();
    resetP2ControlState();
    state.controllerResets++;
    state.lastControllerResetReason=String(reason||"split controller transition");
    return true;
  }

  function syncControllerOwnership(){
    const id=String(document.body?.dataset?.modeController||"");
    if(id===state.controllerId)return false;
    const previous=state.controllerId;
    state.controllerId=id;
    if(previous==="split-screen"||id==="split-screen")resetControllerState(`${previous||"none"} -> ${id||"none"}`);
    return true;
  }

  function solidBudgeCell(x,y,movingPlayer){
    try{
      if(!world?.map||!host||!W?.walkable?.(world.map,x,y,host))return false;
      const door=W?.doorAt?.(host,x,y);if(door&&(!door.open||door.locked))return false;
      const chest=W?.chestAt?.(host,x,y);if(chest?.active)return false;
      if((host.enemies||[]).some(enemy=>enemy?.alive&&Number(enemy.x)===x&&Number(enemy.y)===y))return false;
      if(host.stalker?.awake&&Number(host.stalker.x)===x&&Number(host.stalker.y)===y)return false;
      if((host.generators||[]).some(generator=>generator?.alive&&Number(generator.x)===x&&Number(generator.y)===y))return false;
      if((host.shops||[]).some(shop=>shop?.active!==false&&Number(shop.x)===x&&Number(shop.y)===y))return false;
      if(host.trader?.active!==false&&Number(host.trader?.x)===x&&Number(host.trader?.y)===y)return false;
      if(host.rescue&&!host.rescue.rescued&&Number(host.rescue.x)===x&&Number(host.rescue.y)===y)return false;
      if((host.blockingDecor||[]).some(item=>Number(item?.x)===x&&Number(item?.y)===y))return false;
      if(splitPlayers().some(other=>other&&other!==movingPlayer&&Number(other.health||0)>0&&Number(other.x)===x&&Number(other.y)===y))return false;
      return true;
    }catch(_){return false}
  }

  function forcedMoveTriggers(player){
    if(!player)return;
    try{for(const item of host?.items||[])if(item?.active&&Number(item.x)===Number(player.x)&&Number(item.y)===Number(player.y))requestCollect?.(item,player)}catch(_){}
    try{movementTriggers?.(player)}catch(_){}
  }

  function blockedBudgeFeedback(player,target){
    const now=performance.now();if(now-Number(player?._v141BudgeBlockedAt||0)<900)return;
    player._v141BudgeBlockedAt=now;
    try{floatText?.(target.x,target.y,"BUDGE BLOCKED",P?.red||"#ff6868",{life:720})}catch(_){}
    try{S?.sfx?.("wall")}catch(_){}
  }

  function handlePlayerPush(player,target,dir,dash=false){
    if(!player||!target||String(playMode)!=="split"||String(mode)!=="playing")return false;
    player.dir={...dir};
    const destination={x:Number(target.x)+dir.x,y:Number(target.y)+dir.y};
    if(!solidBudgeCell(destination.x,destination.y,target)){
      resetPush(player);blockedBudgeFeedback(player,target);return false;
    }

    const now=performance.now(),id=String(player.id),signature=`${String(target.id)}|${dir.x},${dir.y}|${player.x},${player.y}|${target.x},${target.y}`;
    let push=state.pushes.get(id);
    if(!push||push.signature!==signature||now-Number(push.lastAt||0)>PUSH_GRACE_MS){
      push={signature,startedAt:now,lastAt:now,lastFxAt:0,targetId:String(target.id)};state.pushes.set(id,push);
    }else push.lastAt=now;

    const elapsed=Math.max(0,now-push.startedAt),remaining=Math.max(0,PUSH_HOLD_MS-elapsed);
    if(!push.lastFxAt||now-push.lastFxAt>=620){
      push.lastFxAt=now;
      const copy=elapsed<180?"HOLD TO BUDGE":`BUDGE ${(remaining/1000).toFixed(1)}s`;
      try{floatText?.(target.x,target.y,copy,P?.gold||"#ffd85a",{life:650})}catch(_){}
    }
    if(elapsed<PUSH_HOLD_MS)return false;
    if(!solidBudgeCell(destination.x,destination.y,target)){resetPush(player);blockedBudgeFeedback(player,target);return false}

    const oldTarget={x:Number(target.x),y:Number(target.y)};
    target.x=destination.x;target.y=destination.y;target.rx=destination.x;target.ry=destination.y;
    player.x=oldTarget.x;player.y=oldTarget.y;player.rx=oldTarget.x;player.ry=oldTarget.y;
    resetAllPushes();

    try{S?.sfx?.("dash")}catch(_){}
    try{ring?.(target.x,target.y,P?.gold||"#ffd85a",24);burst?.(target.x,target.y,P?.gold||"#ffd85a",8,.8);floatText?.(target.x,target.y,"BUDGED!",P?.gold||"#ffd85a",{life:700})}catch(_){}
    try{shake=Math.max(Number(shake||0),2)}catch(_){}
    forcedMoveTriggers(target);forcedMoveTriggers(player);
    try{sync?.()}catch(_){}
    return true;
  }

  function wrapFriendlyCopy(){
    if(!state.toastWrapped&&typeof showToast==="function"){
      const previous=showToast;
      showToast=function showToastV141FriendlyCopy(title,text,...rest){
        if(String(title)==="FRIENDLY FIRE")text=String(text||"").replace(" just shot a team-mate."," just hit a team-mate.");
        return previous.call(this,title,text,...rest);
      };
      state.toastWrapped=true;
    }
    if(!state.sayWrapped&&typeof say==="function"){
      const previous=say;
      say=function sayV141FriendlyCopy(text,...rest){
        if(String(text).includes("<strong>FRIENDLY FIRE.</strong> Try pointing the dangerous end elsewhere."))text="<strong>FRIENDLY FIRE.</strong> You hit your team-mate. Aim somewhere else.";
        return previous.call(this,text,...rest);
      };
      state.sayWrapped=true;
    }
  }

  function installFriendlyFire(){
    if(firePlayer?.__ccgV141SplitFriendlyFire)return true;
    const previous=firePlayer;
    const wrapped=function firePlayerV141SplitFriendlyFire(player,requested){
      if(String(playMode)==="split"&&player&&String(mode)==="playing"){
        const dir=directionFor(player,requested),target=adjacentOpponent(player,dir);
        if(target)return friendlyMelee(player,target,dir);
      }
      return previous.apply(this,arguments);
    };
    wrapped.__ccgV141SplitFriendlyFire=true;
    wrapped.__ccgPreviousFirePlayer=previous;
    firePlayer=wrapped;state.fireWrapped=wrapped;
    return true;
  }

  function movementChainHasSplitOwner(fn=window.movePlayer){
    const seen=new Set();let current=fn;
    for(let depth=0;depth<40&&typeof current==="function"&&!seen.has(current);depth++){
      seen.add(current);
      if(current.__ccgV141SplitBudge===true)return true;
      current=current.__ccgPreviousMovePlayer||current.__ccgOriginal||current.__ccgV141Original||current.__ccgV141TutorialOriginal||current.__ccgV141R27Original||current.__ccgV141R25Original||null;
    }
    return false;
  }

  function r30OwnsNormalMovement(){
    try{
      const r30=window.CCGLostSizzlerV141R30?.state;
      return Boolean(r30?.goldenLocked&&typeof r30.goldenMove==="function"&&String(document.body?.dataset?.specialMode||"")!=="sizzler-saboteurs");
    }catch(_){return false}
  }

  function installPlayerCollision(){
    const current=window.movePlayer;if(typeof current!=="function")return false;
    // The split collision layer is installed before the final release owners and
    // therefore normally lives inside r30's sealed golden movement chain. Do not
    // mistake a later outer finalizer for a missing split owner and wrap the
    // golden function every 90 ms. That created a short ownership race in Solo.
    if(movementChainHasSplitOwner(current)){state.moveWrapped=current;return true}
    if(r30OwnsNormalMovement()&&String(playMode)!=="split"){state.movementOwnershipYields++;return true}
    const previous=current;
    const wrapped=function movePlayerV141SplitBudge(player,dx,dy,dash=false){
      if(String(playMode)==="split"&&player&&String(mode)==="playing"){
        const dir={x:Math.sign(Number(dx||0)),y:Math.sign(Number(dy||0))};
        if(dir.x||dir.y){
          const target=adjacentOpponent(player,dir);
          if(target)return handlePlayerPush(player,target,dir,dash);
          resetPush(player);

          if(dash){
            const secondX=Number(player.x)+dir.x*2,secondY=Number(player.y)+dir.y*2;
            const secondStepOpponent=splitPlayers().find(other=>other&&other!==player&&Number(other.health||0)>0&&Number(other.x)===secondX&&Number(other.y)===secondY)||null;
            if(secondStepOpponent)return previous.call(this,player,dir.x,dir.y,false);
          }
        }
      }else resetPush(player);
      return previous.apply(this,arguments);
    };
    wrapped.__ccgV141SplitBudge=true;
    wrapped.__ccgPreviousMovePlayer=previous;
    movePlayer=wrapped;state.moveWrapped=wrapped;
    return true;
  }

  function emergencyDirections(player){
    const raw=[player?.dir,{x:1,y:0},{x:-1,y:0},{x:0,y:1},{x:0,y:-1}],out=[],seen=new Set();
    for(const dir of raw){const x=Math.sign(Number(dir?.x||0)),y=Math.sign(Number(dir?.y||0));if(!(x||y))continue;const key=`${x},${y}`;if(seen.has(key))continue;seen.add(key);out.push({x,y})}
    return out;
  }

  function separatePlayer(player){
    if(!player)return false;
    for(const dir of emergencyDirections(player)){
      const x=Number(player.x)+dir.x,y=Number(player.y)+dir.y;if(!solidBudgeCell(x,y,player))continue;
      player.x=x;player.y=y;player.rx=x;player.ry=y;forcedMoveTriggers(player);
      try{floatText?.(x,y,"MOVE APART",P?.cyan||"#6cecff",{life:600})}catch(_){}
      return true;
    }
    return false;
  }

  function enforceSeparateTiles(){
    if(String(playMode)!=="split"||String(mode)!=="playing")return false;
    const players=splitPlayers().filter(player=>player&&Number(player.health||0)>0);if(players.length<2)return false;
    const first=players[0],second=players[1];if(Number(first.x)!==Number(second.x)||Number(first.y)!==Number(second.y))return false;
    resetAllPushes();
    const moved=separatePlayer(second)||separatePlayer(first);if(moved)try{sync?.()}catch(_){}
    return moved;
  }

  function install(){
    syncControllerOwnership();
    if(!splitReady())return false;
    wrapFriendlyCopy();installFriendlyFire();installPlayerCollision();enforceSeparateTiles();return true;
  }

  state.observer=new MutationObserver(()=>{try{syncControllerOwnership()}catch(error){console.warn("[Lost Sizzler V10.41] split controller transition reset failed safely",error)}});
  state.observer.observe(document.body,{attributes:true,attributeFilter:["data-mode-controller"]});
  state.timer=setInterval(()=>{try{install()}catch(error){console.warn("[Lost Sizzler V10.41] split player collision/friendly-fire install failed safely",error)}},90);
  install();
  window.addEventListener("pagehide",()=>{if(state.timer)clearInterval(state.timer);state.timer=0;state.observer?.disconnect?.();state.observer=null;resetControllerState("pagehide")},{once:true});
  window.CCGLostSizzlerV141SplitFriendlyFire={P2_CONTROL_CODES,resetControllerState,syncControllerOwnership,movementChainHasSplitOwner,r30OwnsNormalMovement,get state(){return state}};
})();