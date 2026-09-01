/* The Lost Sizzler V10.41 r57 — desktop-prep stability owner.
 *
 * Final browser-runtime repair pass before the downloadable desktop build:
 * - keep the canonical Quick Inventory artwork stable instead of rebuilding a
 *   second visible icon layer every 80ms;
 * - make active dungeon traps and shrines survive frame stalls and stale
 *   contact state;
 * - bound Timed Chamber wave work, prune dead wave actors and prevent a long
 *   frame from turning into simulation catch-up;
 * - restore normal movement timing after a main-thread stall;
 * - repair Spy Field Kit TAB fallback, active-host movement state, transient HP
 *   bars, ten-tile sword presentation and transient Player 2 presence gaps.
 */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V141_R57_DESKTOP_PREP_STABILITY__)return;
  window.__CCG_LOST_SIZZLER_V141_R57_DESKTOP_PREP_STABILITY__=true;

  const MODE_SPY="sizzler-saboteurs";
  const SPECIAL_BLOCK=new Set(["horde-survivor",MODE_SPY]);
  const STYLE_ID="ccg-v141-r57-desktop-prep-stability";
  const MONITOR_MS=80,STALL_MS=280,MAX_TIMED_DT=50,INTERWAVE_MS=360,TIMED_ACTIVE_CAP=3,SPY_SWORD_TILES=10,SPY_HP_MS=1500;
  const state={
    timer:0,lastTick:performance.now(),lastMode:"",r56TimerRetired:0,r56Bridges:0,
    trapCycles:new Map(),trapHits:0,trapFallbacks:0,shrinesActivated:0,
    timedOwnerInstalled:false,timedBase:null,timedPruned:0,timedInterwaves:0,timedSpawns:0,maxTimedEnemies:0,
    stallRecoveries:0,movementRepairs:0,visualTrims:0,
    spyInventoryObserver:null,lastSpyInventoryMutationAt:0,lastSpyInventoryValue:"false",spyTabFallbacks:0,
    spyFreezeRepairs:0,spySearchRepairs:0,spyPositionRepairs:0,spyPresenceRepairs:0,spyPresence:new Map(),
    spyHpPrevious:new Map(),spyHpUntil:new Map(),spyHpHits:0,drawPlayerWrapped:false,drawWeaponWrapped:false,spySwordSuppressions:0
  };

  const nowPerf=()=>{try{return Number(performance.now())||Date.now()}catch(_){return Date.now()}};
  const special=()=>{try{return window.CCGLostSizzlerSpecialModes?.active||null}catch(_){return null}};
  const specialType=()=>String(special()?.type||document.body?.dataset?.specialMode||"");
  const spyActive=()=>specialType()===MODE_SPY;
  const running=()=>document.body?.dataset?.runActive==="true";
  const ordinaryDungeon=()=>running()&&!SPECIAL_BLOCK.has(specialType());
  const localPlayerList=()=>{try{return typeof localPlayers==="function"?localPlayers():[typeof p1!=="undefined"?p1:null,typeof p2!=="undefined"?p2:null].filter(Boolean)}catch(_){return[]}};
  const durability=player=>Number(player?.health||0)+Number(player?.armor||0);
  const playerId=player=>String(player?.id||player?.name||(player===globalThis.p2?"P2":"P1"));
  const trapId=trap=>String(trap?.id||`${trap?.x},${trap?.y}`);
  const trapKey=(player,trap)=>`${playerId(player)}|${trapId(trap)}`;

  function installStyle(){
    if(document.getElementById(STYLE_ID))return true;
    const style=document.createElement("style");style.id=STYLE_ID;style.textContent=`
      /* Core sync already inserts the canonical SVG inside each occupied slot.
       * R56's second icon remains in the DOM for its regression contract but is
       * no longer the visible layer, removing the post-sync blank/flicker gap. */
      #quick-slots .quick-slot>.item-svg-wrap{position:absolute!important;left:50%!important;top:4px!important;transform:translateX(-50%)!important;width:22px!important;height:22px!important;display:grid!important;place-items:center!important;z-index:5!important;pointer-events:none!important}
      #quick-slots .quick-slot>.item-svg-wrap svg,#quick-slots .quick-slot>.item-svg-wrap img.item-art{width:20px!important;height:20px!important;max-width:20px!important;max-height:20px!important;display:block!important;object-fit:contain!important;filter:drop-shadow(0 0 3px currentColor)!important}
      #quick-slots .quick-slot .r56-quick-slot-icon{opacity:0!important;visibility:hidden!important}
    `;document.head.appendChild(style);return true
  }

  function r56(){return window.CCGLostSizzlerV141R56PlaytestCompletion||null}
  function retireR56PeriodicTick(){
    const api=r56();if(!api?.state)return false;
    if(api.state.timer){clearInterval(api.state.timer);api.state.timer=0;state.r56TimerRetired++}
    return true
  }
  function bridgeR56(){
    const api=r56();if(!api)return false;retireR56PeriodicTick();
    try{api.installOwners?.()}catch(_){}
    try{api.pendingChestTick?.()}catch(_){}
    try{api.combatTick?.()}catch(_){}
    let current="";try{current=String(mode||"")}catch(_){}
    if(state.lastMode&&state.lastMode!=="playing"&&current==="playing")try{api.rearmCombat?.("r57 mode resume",0,true)}catch(_){}
    state.lastMode=current;state.r56Bridges++;return true
  }

  function trapIsActive(trap,now=nowPerf()){
    if(!trap?.active)return false;
    try{return typeof SYS?.trapActive==="function"?Boolean(SYS.trapActive(trap,now)):true}catch(_){return true}
  }
  function contactTick(){
    if(!ordinaryDungeon()||!host)return false;
    const players=localPlayerList(),now=nowPerf(),seen=new Set();
    for(const player of players){
      if(!player||Number(player.health||0)<=0)continue;
      for(const shrine of host.shrines||[]){
        if(!shrine?.active||Number(shrine.x)!==Number(player.x)||Number(shrine.y)!==Number(player.y))continue;
        const was=Boolean(shrine.active);try{triggerShrine?.(player)}catch(error){console.warn("[Lost Sizzler r57] shrine contact recovery failed",error)}
        if(was&&!shrine.active)state.shrinesActivated++;
      }
      for(const trap of host.traps||[]){
        if(!trap)continue;const key=trapKey(player,trap),occupied=Number(trap.x)===Number(player.x)&&Number(trap.y)===Number(player.y),active=occupied&&trapIsActive(trap,now);seen.add(key);
        const was=state.trapCycles.get(key)===true;
        if(active&&!was){
          state.trapCycles.set(key,true);const before=durability(player);
          try{triggerTrap?.(player)}catch(error){console.warn("[Lost Sizzler r57] canonical trap trigger failed",error)}
          if(durability(player)===before){
            try{window.hurtPlayer?.(player,1,false,`${String(trap.kind||"floor")} trap`);state.trapFallbacks++}catch(error){console.warn("[Lost Sizzler r57] trap damage fallback failed",error)}
          }
          if(durability(player)<before)state.trapHits++;
        }else if(!active&&was)state.trapCycles.set(key,false);
      }
    }
    for(const key of [...state.trapCycles.keys()])if(!seen.has(key))state.trapCycles.delete(key);
    return true
  }

  function timedPlayers(t){
    try{return localPlayerList().filter(player=>player&&W?.roomAt?.(world,Number(player.x),Number(player.y))===Number(t?.roomId))}catch(_){return[]}
  }
  function timedEnemies(t){return(host?.enemies||[]).filter(enemy=>enemy?.alive&&enemy._v141TimedRoomId===t?.id)}
  function pruneTimedEnemies(t){
    if(!host?.enemies||!t)return 0;
    const live=(host.enemies||[]).filter(enemy=>enemy?.alive&&enemy._v141TimedRoomId===t.id);
    if(live.length>TIMED_ACTIVE_CAP)for(const enemy of live.slice(TIMED_ACTIVE_CAP)){enemy.alive=false;enemy._r57TimedOverflow=true}
    let removed=0;
    for(let i=host.enemies.length-1;i>=0;i--){const enemy=host.enemies[i];if(enemy?._v141TimedRoomId===t.id&&!enemy.alive){host.enemies.splice(i,1);removed++}}
    if(removed){host.revision=(host.revision||0)+1;state.timedPruned+=removed}
    state.maxTimedEnemies=Math.max(state.maxTimedEnemies,timedEnemies(t).length);return removed
  }
  function healTimedPlayers(t){
    for(const player of timedPlayers(t)){
      player.health=Math.max(1,Number(player.maxHealth||player.health||1));player.hpBarMs=Math.max(1200,Number(player.hpBarMs||0));
      try{floatText?.(player.x,player.y,"FULL HEALTH",P?.green||"#72ff9b",{life:1300})}catch(_){}
    }
    try{showToast?.("TIMED WAVE CLEARED","Health restored. The next three enemies are incoming.","green",2800)}catch(_){}
  }
  function prepareTimedInterwaves(){
    const now=nowPerf();
    for(const t of host?.timedRooms||[]){
      if(!t?.triggered||t.cleared)continue;pruneTimedEnemies(t);
      const alive=timedEnemies(t);
      if(!alive.length&&t._v141WaveSpawned&&!t._r57NextWaveAt&&Number(t.timeLeft||0)>0){
        healTimedPlayers(t);t.wave=Math.max(1,Number(t.wave||1))+1;t._v141WaveSpawned=false;t._r57NextWaveAt=now+INTERWAVE_MS;state.timedInterwaves++
      }
    }
  }
  function finishTimedInterwaves(){
    const now=nowPerf(),api=window.CCGLostSizzlerDungeonCombatSafetyV141;
    for(const t of host?.timedRooms||[]){
      if(!t?.triggered||t.cleared||Number(t.timeLeft||0)<=0){if(t)delete t._r57NextWaveAt;continue}
      if(!t._r57NextWaveAt||now<Number(t._r57NextWaveAt))continue;
      if(!timedPlayers(t).length){delete t._r57NextWaveAt;continue}
      pruneTimedEnemies(t);if(timedEnemies(t).length){delete t._r57NextWaveAt;continue}
      delete t._r57NextWaveAt;
      try{const count=api?.spawnTimedWave?.(t)||0;if(count>0){state.timedSpawns++;state.maxTimedEnemies=Math.max(state.maxTimedEnemies,timedEnemies(t).length)}}catch(error){console.warn("[Lost Sizzler r57] bounded Timed Chamber spawn failed",error)}
    }
  }
  function installTimedGuard(){
    const current=window.updateTimed;if(typeof current!=="function")return false;
    if(current.__ccgV141R57TimedGuard){state.timedOwnerInstalled=true;return true}
    const wrapped=function updateTimedV141R57Bounded(dt){
      if(!ordinaryDungeon())return current.apply(this,arguments);
      prepareTimedInterwaves();const elapsed=Math.min(MAX_TIMED_DT,Math.max(0,Number(dt)||0)),result=current.call(this,elapsed);finishTimedInterwaves();return result
    };
    wrapped.__ccgV141R57TimedGuard=true;wrapped.__ccgOriginal=current;state.timedBase=current;window.updateTimed=wrapped;state.timedOwnerInstalled=true;return true
  }

  function trimVisualArray(list,max){
    if(!Array.isArray(list)||list.length<=max)return 0;const count=list.length-max;list.splice(0,count);return count
  }
  function restoreMovementTiming(player,index){
    if(!player||Number(player.health||0)<=0)return false;
    let mult=Number(player.moveMultiplier);if(!Number.isFinite(mult)||mult<=.25||mult>2){player.moveMultiplier=1;mult=1}
    const cadence=Math.max(70,Math.min(360,Number(C?.player?.moveDelay||140)*mult));
    try{if(index===2)move2=cadence;else move1=cadence}catch(_){}
    if(player.controlLocked)player.controlLocked=false;if(player.controlsLocked)player.controlsLocked=false;
    if(!Number.isFinite(Number(player.hitStunMs))||Number(player.hitStunMs)>5000||Number(player.hitStunMs)<0)player.hitStunMs=0;
    const gap=Math.abs(Number(player.x)-Number(player.rx))+Math.abs(Number(player.y)-Number(player.ry));if(Number.isFinite(gap)&&gap>1.5){player.rx=player.x;player.ry=player.y}
    state.movementRepairs++;return true
  }
  function recoverAfterStall(delay=0){
    if(!ordinaryDungeon())return false;
    const players=localPlayerList();players.forEach((player,index)=>restoreMovementTiming(player,index+1));
    let trimmed=0;try{trimmed+=trimVisualArray(particles,420)}catch(_){}try{trimmed+=trimVisualArray(rings,120)}catch(_){}try{trimmed+=trimVisualArray(floaters,80)}catch(_){}
    state.visualTrims+=trimmed;for(const t of host?.timedRooms||[])pruneTimedEnemies(t);state.stallRecoveries++;
    try{document.body.dataset.r57LastStall=Math.round(Number(delay)||0)}catch(_){}return true
  }

  const spyMatch=()=>spyActive()?special()?.state||null:null;
  const spyActorId=()=>{try{return String(net?.sessionId||p1?.id||"P1")}catch(_){return"P1"}};
  const spyModelFor=id=>spyMatch()?.players?.find?.(row=>String(row?.id||"")===String(id||""))||null;
  function spyLiveFor(id){
    try{if(String(p1?.id||"")===String(id||""))return p1;return remote?.get?.(id)||null}catch(_){return null}
  }
  function spyPhysicalRoom(model){
    try{const logical=spyMatch()?.map?.rooms?.find?.(row=>String(row?.id||"")===String(model?.roomId||"")),index=Number(logical?.dungeonRoomId);return Number.isFinite(index)?world?.rooms?.[index]||null:null}catch(_){return null}
  }
  function centre(room){return room?{x:Math.floor(Number(room.x)+Number(room.w)/2),y:Math.floor(Number(room.y)+Number(room.h)/2)}:null}
  function validSpyCell(x,y){try{return Number.isFinite(Number(x))&&Number.isFinite(Number(y))&&world?.map?.[Math.round(Number(y))]?.[Math.round(Number(x))]===0}catch(_){return false}}

  function repairSpyPresence(){
    const m=spyMatch();if(!m)return false;let changed=false;const localId=spyActorId(),now=nowPerf();
    for(const model of m.players||[]){
      const id=String(model?.id||"");if(!id||id===localId)continue;
      if(String(model.status||"")!=="active"){state.spyPresence.delete(id);continue}
      let live=spyLiveFor(id);
      if(live){state.spyPresence.set(id,live)}else{
        live=state.spyPresence.get(id)||null;
        if(!live){
          const room=spyPhysicalRoom(model),q=centre(room),x=Number.isFinite(Number(model.x))?Number(model.x):Number(q?.x||0),y=Number.isFinite(Number(model.y))?Number(model.y):Number(q?.y||0);
          live={id,name:String(model.name||"PLAYER 2"),x,y,rx:x,ry:y,dir:{x:1,y:0},health:Math.max(1,Number(model.hp||1)),maxHealth:Math.max(1,Number(model.maxHp||model.hp||1)),armor:0,mana:0,maxMana:0,torchMs:0,rapidMs:0,hitStunMs:0,firearmUnlocked:false,weapon:null,meleeWeapon:null,lastSeen:now,_r57SpyPresenceProxy:true};state.spyPresence.set(id,live)
        }
        try{remote?.set?.(id,live);state.spyPresenceRepairs++;changed=true}catch(_){}
      }
      live.lastSeen=now;
      if(Number.isFinite(Number(model.x))&&Number.isFinite(Number(model.y))){const dx=Math.abs(Number(live.x)-Number(model.x))+Math.abs(Number(live.y)-Number(model.y));if(live._r57SpyPresenceProxy||dx>3){live.x=Number(model.x);live.y=Number(model.y);if(!Number.isFinite(Number(live.rx))||dx>4){live.rx=live.x;live.ry=live.y}}}
      live.maxHealth=Math.max(1,Number(model.maxHp||live.maxHealth||1));live.health=Math.max(0,Number(model.hp??live.health??1));
    }
    return changed
  }

  function spyInventoryVisible(){
    const node=document.getElementById("spy-r32-inventory");if(!node)return false;
    try{const style=getComputedStyle(node),rect=node.getBoundingClientRect();return style.display!=="none"&&style.visibility!=="hidden"&&rect.width>1&&rect.height>1}catch(_){return false}
  }
  function repairSpyLiveness(){
    if(!spyActive()||!running())return false;const api=window.CCGLostSizzlerV141R32SpyOverhaul,model=spyModelFor(spyActorId())||spyMatch()?.players?.[0],player=(()=>{try{return p1}catch(_){return null}})();if(!api?.state||!model||!player||String(model.status||"")!=="active")return false;let repaired=false;const t=nowPerf();
    if(api.state.inventoryOpen&&!spyInventoryVisible()){api.setInventory?.(false);state.spyFreezeRepairs++;repaired=true}
    const q=api.state.search;if(q){const complete=Number(q.completesAt),started=Number(q.startedAt);if(!Number.isFinite(complete)||!Number.isFinite(started)||t-complete>1400){api.state.search=null;state.spySearchRepairs++;repaired=true;try{window.CCGLostSizzlerV141UiSpyPerformance?.cancelSearchFeedback?.()}catch(_){}}}
    const lastMove=Number(api.state.lastMoveAt);if(!Number.isFinite(lastMove)||lastMove>t+500){api.state.lastMoveAt=0;state.spyFreezeRepairs++;repaired=true}
    try{if(!api.state.inventoryOpen&&["inventory","paused","dossier"].includes(String(mode||""))){mode="playing";UI?.inventory?.classList?.add?.("hidden");UI?.pause?.classList?.add?.("hidden");state.spyFreezeRepairs++;repaired=true}}catch(_){}
    if(player.controlLocked){player.controlLocked=false;repaired=true}if(player.controlsLocked){player.controlsLocked=false;repaired=true}
    if(!Number.isFinite(Number(player.hitStunMs))||Number(player.hitStunMs)>5000||Number(player.hitStunMs)<0){player.hitStunMs=0;repaired=true}
    if(!validSpyCell(player.x,player.y)){const q2=centre(spyPhysicalRoom(model));if(q2&&validSpyCell(q2.x,q2.y)){player.x=player.rx=q2.x;player.y=player.ry=q2.y;model.x=q2.x;model.y=q2.y;state.spyPositionRepairs++;repaired=true}}
    if(repaired)try{document.getElementById("game")?.focus?.({preventScroll:true})}catch(_){}
    return repaired
  }

  function installSpyInventoryObserver(){
    if(state.spyInventoryObserver||!document.body)return false;
    state.lastSpyInventoryValue=String(document.body.getAttribute("data-spy-r32-inventory")||"false");
    state.spyInventoryObserver=new MutationObserver(records=>{for(const record of records){if(record.attributeName!=="data-spy-r32-inventory")continue;state.lastSpyInventoryMutationAt=nowPerf();state.lastSpyInventoryValue=String(document.body.getAttribute("data-spy-r32-inventory")||"false")}});
    state.spyInventoryObserver.observe(document.body,{attributes:true,attributeFilter:["data-spy-r32-inventory"]});return true
  }
  function onSpyTabKeyUp(event){
    if(event.code!=="Tab"||!spyActive())return;event.preventDefault?.();
    const api=window.CCGLostSizzlerV141R32SpyOverhaul;if(!api?.state)return;
    // R32 normally toggles on keydown. If a later capture owner swallowed that
    // keydown, the body inventory attribute will not have changed during the
    // gesture. Keyup supplies a safe fallback without double-toggling a normal
    // open/close operation.
    if(api.state.inventoryOpen)return;
    const recentFalse=state.lastSpyInventoryValue==="false"&&nowPerf()-state.lastSpyInventoryMutationAt<650;
    if(recentFalse)return;
    api.setInventory?.(true);state.spyTabFallbacks++
  }

  function spyOpponentDistance(player){
    if(!spyActive()||!player)return Infinity;const id=String(player.id||""),rows=[];
    for(const model of spyMatch()?.players||[]){if(String(model?.id||"")===id||String(model?.status||"")!=="active")continue;const live=spyLiveFor(model.id)||state.spyPresence.get(String(model.id));if(live)rows.push(live)}
    if(!rows.length)return Infinity;return Math.min(...rows.map(other=>Math.hypot(Number(other.x)-Number(player.x),Number(other.y)-Number(player.y))))
  }
  function spySwordAllowedFor(player){return spyOpponentDistance(player)<=SPY_SWORD_TILES}
  function repairSpySwordRange(){
    if(!spyActive())return false;let changed=false;
    const lives=[];try{if(p1)lives.push(p1);for(const model of spyMatch()?.players||[]){const live=spyLiveFor(model.id);if(live&&!lives.includes(live))lives.push(live)}}catch(_){}
    for(const player of lives){if(spySwordAllowedFor(player))continue;if(Number(player?._meleeSwingAt||0)>0){player._meleeSwingAt=-Infinity;player._meleeSwingMs=0;delete player._meleeSwingDir;state.spySwordSuppressions++;changed=true}}
    return changed
  }

  function trackSpyHealth(player){
    if(!spyActive()||!player)return 0;const id=String(player.id||""),health=Number(player.health),previous=state.spyHpPrevious.get(id),now=nowPerf();
    if(Number.isFinite(previous)&&Number.isFinite(health)&&health<previous){state.spyHpUntil.set(id,now+SPY_HP_MS);state.spyHpHits++}
    if(Number.isFinite(health))state.spyHpPrevious.set(id,health);return Number(state.spyHpUntil.get(id)||0)
  }
  function spyHealthBarVisibleFor(player){return trackSpyHealth(player)>nowPerf()}
  function installSpyDrawGuards(){
    const currentPlayer=window.drawPlayer;if(typeof currentPlayer==="function"&&!currentPlayer.__ccgV141R57SpyHp){
      const wrapped=function drawPlayerV141R57SpyHp(player,kind){
        if(!spyActive()||!player)return currentPlayer.apply(this,arguments);const old=Number(player.hpBarMs||0),until=trackSpyHealth(player),remaining=Math.max(0,until-nowPerf());player.hpBarMs=remaining>0?remaining:0;
        try{return currentPlayer.apply(this,arguments)}finally{player.hpBarMs=old}
      };
      wrapped.__ccgV141R57SpyHp=true;wrapped.__ccgOriginal=currentPlayer;window.drawPlayer=wrapped;state.drawPlayerWrapped=true
    }else if(currentPlayer?.__ccgV141R57SpyHp)state.drawPlayerWrapped=true;

    const currentWeapon=window.drawPlayerWeapon;if(typeof currentWeapon==="function"&&!currentWeapon.__ccgV141R57SpySwordRange){
      const wrappedWeapon=function drawPlayerWeaponV141R57Range(player){
        if(spyActive()&&player){const hasGun=Boolean(player.firearmUnlocked&&player.weapon&&Number(player.mana||0)>0);if(!hasGun&&!spySwordAllowedFor(player)){state.spySwordSuppressions++;return false}}
        return currentWeapon.apply(this,arguments)
      };
      wrappedWeapon.__ccgV141R57SpySwordRange=true;wrappedWeapon.__ccgOriginal=currentWeapon;window.drawPlayerWeapon=wrappedWeapon;state.drawWeaponWrapped=true
    }else if(currentWeapon?.__ccgV141R57SpySwordRange)state.drawWeaponWrapped=true;
    return state.drawPlayerWrapped&&state.drawWeaponWrapped
  }

  function tick(){
    installStyle();retireR56PeriodicTick();bridgeR56();installTimedGuard();installSpyInventoryObserver();installSpyDrawGuards();
    const now=nowPerf(),delay=now-state.lastTick;state.lastTick=now;
    if(delay>STALL_MS&&!document.hidden)recoverAfterStall(delay);
    contactTick();
    if(spyActive()){repairSpyPresence();repairSpyLiveness();repairSpySwordRange()}else{state.spyHpPrevious.clear();state.spyHpUntil.clear()}
  }

  installStyle();installSpyInventoryObserver();installSpyDrawGuards();retireR56PeriodicTick();installTimedGuard();
  addEventListener("keyup",onSpyTabKeyUp,true);
  tick();state.timer=setInterval(()=>{try{tick()}catch(error){console.warn("[Lost Sizzler r57] desktop-prep stability tick failed safely",error)}},MONITOR_MS);
  addEventListener("pagehide",()=>{if(state.timer)clearInterval(state.timer);state.timer=0;removeEventListener("keyup",onSpyTabKeyUp,true);try{state.spyInventoryObserver?.disconnect?.()}catch(_){}},{once:true});
  document.body.dataset.v141R57DesktopPrepStability="true";
  window.CCGLostSizzlerV141R57DesktopPrepStability={
    installStyle,retireR56PeriodicTick,bridgeR56,trapIsActive,contactTick,pruneTimedEnemies,prepareTimedInterwaves,finishTimedInterwaves,installTimedGuard,recoverAfterStall,
    repairSpyPresence,repairSpyLiveness,spyOpponentDistance,spySwordAllowedFor,repairSpySwordRange,trackSpyHealth,spyHealthBarVisibleFor,installSpyDrawGuards,onSpyTabKeyUp,
    constants:{MONITOR_MS,STALL_MS,MAX_TIMED_DT,INTERWAVE_MS,TIMED_ACTIVE_CAP,SPY_SWORD_TILES,SPY_HP_MS},get state(){return state}
  };
})();