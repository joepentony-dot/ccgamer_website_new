/* The Lost Sizzler V10.41 r29 — runtime, Horde and Spy repair. */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V141_R29_RUNTIME_REPAIR__)return;
  window.__CCG_LOST_SIZZLER_V141_R29_RUNTIME_REPAIR__=true;

  const INSTALL_MS=80;
  const SPY_HINT_COOLDOWN_MS=1800;
  const state={
    timer:0,loopInstalled:false,quitInstalled:false,damageInstalled:false,packetInstalled:false,toastInstalled:false,
    spyMoveInstalled:false,lastLoopSource:null,lastQuitSource:null,lastDamageSource:null,lastPacketSource:null,lastToastSource:null,lastSpyMoveSource:null,
    frameFaults:0,updateFaults:0,renderFaults:0,lastFaultAt:0,lastFaultMessage:"",lastFaultLogAt:0,
    hordeFriendlyFireBlocked:0,hordeEnemyHitsRerouted:0,spyMoves:0,spyBlockedMoves:0,spyHintsSuppressed:0,lastSpyHintAt:0,
    lastRunActive:false,audioStops:0,lastRemaining:-1
  };

  const special=()=>{try{return window.CCGLostSizzlerSpecialModes?.active||null}catch(_){return null}};
  const modeType=()=>String(special()?.type||document.body?.dataset?.specialMode||"");
  const hordeActive=()=>modeType()==="horde-survivor";
  const spyActive=()=>modeType()==="sizzler-saboteurs";
  const finite=value=>Number.isFinite(Number(value));
  const liveSpyModel=player=>{try{return special()?.state?.players?.find(row=>String(row?.id||"")===String(player?.id||""))||null}catch(_){return null}};
  const spyCanMove=player=>{const model=liveSpyModel(player);return !model||model.status==="active"};
  const r30OwnsNormalMovement=()=>{try{return !spyActive()&&Boolean(window.CCGLostSizzlerV141R30?.state?.goldenLocked&&typeof window.CCGLostSizzlerV141R30?.state?.goldenMove==="function")}catch(_){return false}};

  function noteFault(phase,error){
    const now=performance.now();state.frameFaults++;if(phase==="update")state.updateFaults++;if(phase==="render")state.renderFaults++;
    state.lastFaultAt=now;state.lastFaultMessage=String(error?.message||error||"Unknown frame fault").slice(0,260);
    if(now-state.lastFaultLogAt>2000){state.lastFaultLogAt=now;try{console.error(`[Lost Sizzler r29] ${phase} fault contained without clearing input, reallocating the canvas or throttling play.`,error)}catch(_){}}
  }

  function stableLoop(timestamp){
    const t=finite(timestamp)?Number(timestamp):performance.now();let dt=16;
    try{
      const previous=finite(last)?Number(last):t-16;dt=Math.min(45,Math.max(0,t-previous||16));last=t;
      if(typeof damageFlash!=="undefined"&&damageFlash>0)damageFlash=Math.max(0,damageFlash-dt/500);
    }catch(error){noteFault("frame-clock",error)}
    try{if(typeof update==="function")update(dt)}catch(error){noteFault("update",error)}
    try{if(typeof render==="function")render()}catch(error){noteFault("render",error)}
    try{requestAnimationFrame(loop)}catch(error){noteFault("raf",error);setTimeout(()=>{try{requestAnimationFrame(loop)}catch(_){}},16)}
  }
  stableLoop.__ccgV141R29Stable=true;

  function installStableLoop(){
    const current=window.loop;if(typeof current!=="function")return false;
    if(current.__ccgV141R29Stable){state.loopInstalled=true;state.lastLoopSource=current;return true}
    const older=window.CCGLostSizzlerV141BrowserStabilityGameplay;
    if(older&&!older.state?.frameGuard)return false;
    window.loop=stableLoop;state.loopInstalled=true;state.lastLoopSource=stableLoop;return true;
  }

  function silenceGameplayAudio(){
    let changed=false;
    try{
      const api=window.CCGLostSizzlerSpecialModes;
      if(api?.active&&typeof api.stop==="function"){api.stop(undefined,true);changed=true}
    }catch(_){}
    try{if(typeof S!=="undefined"&&S?.stopMusic){S.stopMusic();changed=true}}catch(_){}
    try{window.CCGLostSizzlerHordeAudio?.stop?.();changed=true}catch(_){}
    try{window.CCGLostSizzlerSaboteursAudio?.stop?.();changed=true}catch(_){}
    try{window.CCGLostSizzlerVoice?.stop?.("menu")}catch(_){}
    try{window.speechSynthesis?.cancel?.()}catch(_){}
    if(changed)state.audioStops++;
    return changed;
  }

  function installQuitAudioGuard(){
    const current=window.quitToMenu;if(typeof current!=="function")return false;
    if(current.__ccgV141R29SilentMenu){state.quitInstalled=true;state.lastQuitSource=current;return true}
    if(current===state.lastQuitSource)return state.quitInstalled;
    const wrapped=async function quitToMenuV141R29Silent(){
      silenceGameplayAudio();
      try{return await current.apply(this,arguments)}finally{silenceGameplayAudio()}
    };
    wrapped.__ccgV141R29SilentMenu=true;wrapped.__ccgOriginal=current;window.quitToMenu=wrapped;
    state.quitInstalled=true;state.lastQuitSource=wrapped;return true;
  }

  function installHordeFriendlyFireGuard(){
    const current=window.hurtPlayer;if(typeof current!=="function")return false;
    if(current.__ccgV141R29HordeFriendly){state.damageInstalled=true;state.lastDamageSource=current;return true}
    if(current===state.lastDamageSource)return state.damageInstalled;
    const wrapped=function hurtPlayerV141R29NoHordeFriendly(player,amount,friendly=false){
      if(hordeActive()&&friendly){state.hordeFriendlyFireBlocked++;return false}
      return current.apply(this,arguments)
    };
    wrapped.__ccgV141R29HordeFriendly=true;wrapped.__ccgOriginal=current;window.hurtPlayer=wrapped;
    state.damageInstalled=true;state.lastDamageSource=wrapped;return true;
  }

  function installHordeNetworkDamageGuard(){
    const callbacks=typeof net!=="undefined"?net?.cb:null,current=callbacks?.onPacket;if(typeof current!=="function")return false;
    if(current.__ccgV141R29HordePacket){state.packetInstalled=true;state.lastPacketSource=current;return true}
    if(current===state.lastPacketSource)return state.packetInstalled;
    const wrapped=function onPacketV141R29HordeDamage(event,payload){
      if(hordeActive()&&event==="player_hit"&&payload?.target===p1?.id){
        state.hordeEnemyHitsRerouted++;
        try{return hurtPlayer(p1,Math.max(1,Number(payload.power)||1),false,payload.source||"enemy")}catch(error){noteFault("horde-network-hit",error);return false}
      }
      return current.apply(this,arguments)
    };
    wrapped.__ccgV141R29HordePacket=true;wrapped.__ccgOriginal=current;callbacks.onPacket=wrapped;
    state.packetInstalled=true;state.lastPacketSource=wrapped;return true;
  }

  function installSpyToastThrottle(){
    const current=window.showToast;if(typeof current!=="function")return false;
    if(current.__ccgV141R29SpyToast){state.toastInstalled=true;state.lastToastSource=current;return true}
    if(current===state.lastToastSource)return state.toastInstalled;
    const wrapped=function showToastV141R29SpyThrottle(title){
      if(spyActive()&&String(title||"").toUpperCase()==="MOVE BESIDE FURNITURE"){
        const now=performance.now();if(now-state.lastSpyHintAt<SPY_HINT_COOLDOWN_MS){state.spyHintsSuppressed++;return false}state.lastSpyHintAt=now;
      }
      return current.apply(this,arguments)
    };
    // This compatibility guard can become the outer showToast layer every
    // 80 ms as other retained mode guards reassert themselves. Carry the
    // established notification-priority marker forward synchronously so the
    // visible owner never spends a frame in an unowned state.
    if(current.__ccgV141Priority===true)wrapped.__ccgV141Priority=true;
    wrapped.__ccgV141R29SpyToast=true;wrapped.__ccgOriginal=current;window.showToast=wrapped;
    state.toastInstalled=true;state.lastToastSource=wrapped;return true;
  }

  function activeSpyOccupant(player){
    if(!player)return false;const model=liveSpyModel(player);if(model)return model.status==="active"&&Number(model.hp??player.health??1)>0;return Number(player.health??1)>0;
  }
  function spyOccupied(player,x,y){
    try{return (typeof allPlayers==="function"?allPlayers():[p1,...(remote?.values?.()||[])]).some(other=>other&&other!==player&&activeSpyOccupant(other)&&Number(other.x)===x&&Number(other.y)===y)}catch(_){return false}
  }
  function spyWalkable(x,y){try{return Boolean(window.CCGWorld?.walkable?.(world.map,x,y,host))}catch(_){return false}}
  function primeSpyDoor(player,dx,dy){
    try{return Boolean(window.CCGLostSizzlerV141R27SpyIsolation?.primeSpyDoorsForStep?.(player,dx,dy))}catch(_){return false}
  }
  function spyStep(player,dx,dy){
    if(!player||!spyCanMove(player)||typeof mode==="undefined"||mode!=="playing"||!world?.map||!host)return false;
    if((player.hitStunMs||0)>0)return false;
    const sx=Math.sign(Number(dx)||0),sy=Math.sign(Number(dy)||0);if(!sx&&!sy)return false;
    const nx=Number(player.x)+sx,ny=Number(player.y)+sy;
    if(sx&&sy&&(!spyWalkable(Number(player.x)+sx,Number(player.y))||!spyWalkable(Number(player.x),Number(player.y)+sy))){state.spyBlockedMoves++;return false}
    primeSpyDoor(player,sx,sy);
    try{if(typeof tryDoor==="function"&&!tryDoor(player,nx,ny)){state.spyBlockedMoves++;return false}}catch(error){noteFault("spy-door",error);return false}
    if(!spyWalkable(nx,ny)||spyOccupied(player,nx,ny)){state.spyBlockedMoves++;return false}
    player.x=nx;player.y=ny;player.dir={x:sx,y:sy};
    if(!finite(player.rx))player.rx=nx-sx;if(!finite(player.ry))player.ry=ny-sy;
    try{reveal?.(player);markRoomVisit?.(player);rememberTrail?.(player);sync?.()}catch(_){}
    state.spyMoves++;return true;
  }
  function spyMove(player,dx,dy,dash=false){
    if(!spyActive())return null;
    if(!player||!spyCanMove(player))return false;
    const steps=dash?2:1;let moved=false;
    for(let index=0;index<steps;index++){if(!spyStep(player,dx,dy))break;moved=true}
    return moved;
  }
  function installSpyMovementOwner(){
    if(!window.CCGLostSizzlerV141SpyMovementFinalizer?.state?.installed)return false;
    const current=window.movePlayer;if(typeof current!=="function")return false;
    // r29 retains the Spy implementation, but after r30 has locked the final
    // normal-mode movement owner it must not wrap that owner again. During an
    // active Spy session r30 suspends this compatibility installer while the
    // isolated Spy engine owns movement, so the handoff does not weaken Spy.
    if(r30OwnsNormalMovement()){state.spyMoveInstalled=true;state.lastSpyMoveSource=current;return true}
    if(current.__ccgV141R29SpyOwner){state.spyMoveInstalled=true;state.lastSpyMoveSource=current;return true}
    if(current===state.lastSpyMoveSource)return state.spyMoveInstalled;
    const wrapped=function movePlayerV141R29SpyOwner(player,dx,dy,dash=false){
      if(spyActive())return spyMove(player,dx,dy,dash);
      return current.apply(this,arguments)
    };
    wrapped.__ccgV141R29SpyOwner=true;wrapped.__ccgOriginal=current;window.movePlayer=wrapped;
    state.spyMoveInstalled=true;state.lastSpyMoveSource=wrapped;return true;
  }

  function desiredHordeQuota(runState){
    const wave=Math.max(0,Number(runState?.wave)||0),players=Math.max(1,Number(runState?.playerCount)||1);if(!wave)return 0;
    try{if(window.CCGLostSizzlerV138?.desiredQuota)return Number(window.CCGLostSizzlerV138.desiredQuota(wave,players))||0}catch(_){}
    try{return Number(window.CCGLostSizzlerHorde?.quotaFor?.(wave,players))||0}catch(_){return 0}
  }
  function hordeRemaining(runState=special()?.state){
    if(!runState)return 0;const quota=Math.max(0,desiredHordeQuota(runState)),defeated=Math.max(0,Number(runState.defeated)||0),bossAlive=Boolean(runState.boss?.alive&&Number(runState.boss?.hp||0)>0);
    return Math.max(0,quota-defeated)+(bossAlive?1:0)
  }
  function ensureRemainingHud(){
    let node=document.getElementById("horde-live-remaining");if(node)return node;
    const roster=document.getElementById("horde-live-roster");if(!roster)return null;
    node=document.createElement("div");node.id="horde-live-remaining";node.setAttribute("aria-live","polite");node.style.cssText="margin-top:5px;padding-top:5px;border-top:1px solid rgba(108,236,255,.25);color:#6cecff;font:900 10px/1.25 'Courier New',monospace;letter-spacing:.35px";
    const head=roster.querySelector(".v138-head");head?.insertAdjacentElement("afterend",node);return node;
  }
  function updateRemainingHud(){
    const node=ensureRemainingHud();if(!node)return false;
    if(!hordeActive()){node.textContent="";node.hidden=true;state.lastRemaining=-1;return false}
    const runState=special()?.state,remaining=hordeRemaining(runState),wave=Math.max(0,Number(runState?.wave)||0),physical=(typeof host!=="undefined"&&host?.enemies||[]).filter(enemy=>enemy?.alive&&enemy?.hordeEnemy).length;
    node.hidden=false;node.textContent=`WAVE ${wave||0}/10 · ENEMIES LEFT ${remaining} · ACTIVE NOW ${physical}`;state.lastRemaining=remaining;return true;
  }

  function runTransitionGuard(){
    const running=document.body?.dataset?.runActive==="true";
    if(state.lastRunActive&&!running)silenceGameplayAudio();
    state.lastRunActive=running;
  }

  function preserveStaticUi(){
    const levelCopy=document.getElementById("level-up-copy");if(levelCopy&&!String(levelCopy.textContent||"").trim())levelCopy.textContent="Choose an upgrade.";
  }

  /* r29 combat consistency: occupying an enemy tile is a movement block, not
   * a second damage source. Enemies still hurt through their own AI attacks,
   * projectiles, charges and hazards, so sword play can safely close to range
   * without an arbitrary collision tax. */
  function contactBlock(player,enemy,fromX,fromY){
    if(!player||!enemy)return false;
    const ox=Number(fromX),oy=Number(fromY);if(!finite(ox)||!finite(oy))return false;
    const dx=Math.sign(Number(enemy.x)-ox),dy=Math.sign(Number(enemy.y)-oy);
    player.x=ox;player.y=oy;player.rx=ox;player.ry=oy;
    if(dx||dy)player.dir={x:dx,y:dy};
    state.contactBlocks=(state.contactBlocks||0)+1;
    return false;
  }
  function installContactCombatGuard(){
    const current=window.collideWithEnemy;if(typeof current!=="function")return false;
    if(current.__ccgV141R29ContactBlock){state.contactInstalled=true;state.lastContactSource=current;return true}
    if(current===state.lastContactSource)return Boolean(state.contactInstalled);
    const wrapped=function collideWithEnemyV141R29Block(player,enemy,fromX,fromY){return contactBlock(player,enemy,fromX,fromY)};
    wrapped.__ccgV141R29ContactBlock=true;wrapped.__ccgOriginal=current;window.collideWithEnemy=wrapped;
    state.contactInstalled=true;state.lastContactSource=wrapped;return true;
  }

  const GENERIC_ITEM_TITLES={
    health:"HEALTH PACK",mana:"AMMO PACK",ammo:"AMMO PACK",potion:"HEALING POTION",torch:"TORCH",
    armour:"ARMOUR PLATE",teleport:"TELEPORT RUNE",bronze:"BRONZE KEY",key:"MAIN KEY",exitSigil:"EXIT SIGIL",
    inventorySlot:"INVENTORY SLOT UPGRADE",xpOrb:"XP ORB",rapid:"RAPID FIRE",credits:"SCORE COIN"
  };
  function normaliseItemTitle(item){
    if(!item)return"";const base=GENERIC_ITEM_TITLES[String(item.kind||"")],title=String(item.title||"").trim();if(!base)return title;
    const misleading=/^(?:HIDDEN|SECRET|MYSTERIOUS|UNKNOWN|UNMARKED)\b/i.test(title);
    if(!title||misleading)return base;
    return title;
  }
  function normaliseItemNames(){
    const hostState=typeof host!=="undefined"?host:null;if(!hostState?.items)return 0;
    const revision=Number(hostState.revision||0);if(state.itemNameHost===hostState&&state.itemNameRevision===revision)return 0;
    let changed=0;for(const item of hostState.items){const title=normaliseItemTitle(item);if(title&&title!==item.title){item.title=title;changed++}}
    state.itemNameHost=hostState;state.itemNameRevision=revision;state.itemNamesNormalised=(state.itemNamesNormalised||0)+changed;return changed;
  }

  function customPickupPresent(item){
    try{const image=(typeof pickupOverrideImages!=="undefined"?pickupOverrideImages:null)?.get?.(item?.kind);return Boolean(image?.complete&&image.naturalWidth)}catch(_){return false}
  }
  function drawEnhancedPickup(item,col){
    if(!item||customPickupPresent(item)||typeof ctx==="undefined")return false;const k=String(item.kind||"");
    const c=col||"#ffffff";ctx.save();ctx.lineWidth=2;ctx.strokeStyle=c;ctx.fillStyle=c;
    if(k==="health"){
      ctx.fillStyle="rgba(9,12,16,.94)";ctx.fillRect(-15,-11,30,23);ctx.strokeStyle=c;ctx.strokeRect(-15,-11,30,23);ctx.strokeRect(-6,-16,12,5);ctx.fillStyle=c;ctx.fillRect(-3,-8,6,16);ctx.fillRect(-9,-3,18,6);
    }else if(k==="ammo"||k==="mana"){
      ctx.fillStyle="rgba(8,12,18,.94)";ctx.fillRect(-15,-10,30,21);ctx.strokeStyle=c;ctx.strokeRect(-15,-10,30,21);ctx.fillStyle=c;for(const x of [-8,0,8]){ctx.fillRect(x-2,-5,4,11);ctx.fillRect(x-3,-7,6,3)}
    }else if(k==="potion"){
      ctx.fillStyle="rgba(8,12,18,.94)";ctx.fillRect(-5,-14,10,5);ctx.strokeStyle=c;ctx.strokeRect(-5,-14,10,5);ctx.beginPath();ctx.moveTo(-7,-9);ctx.lineTo(-11,7);ctx.quadraticCurveTo(-10,14,0,15);ctx.quadraticCurveTo(10,14,11,7);ctx.lineTo(7,-9);ctx.closePath();ctx.stroke();ctx.fillStyle=c;ctx.globalAlpha=.72;ctx.fillRect(-7,5,14,6);
    }else if(k==="torch"){
      ctx.strokeStyle=c;ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(4,12);ctx.lineTo(-3,-4);ctx.stroke();ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-4,-5);ctx.quadraticCurveTo(-12,-14,-4,-17);ctx.quadraticCurveTo(7,-12,4,-4);ctx.quadraticCurveTo(0,-9,-4,-5);ctx.closePath();ctx.fillStyle=c;ctx.fill();
    }else if(k==="armour"){
      ctx.beginPath();ctx.moveTo(0,-15);ctx.lineTo(13,-10);ctx.lineTo(11,5);ctx.quadraticCurveTo(8,13,0,17);ctx.quadraticCurveTo(-8,13,-11,5);ctx.lineTo(-13,-10);ctx.closePath();ctx.stroke();ctx.globalAlpha=.38;ctx.fill();ctx.globalAlpha=1;ctx.beginPath();ctx.moveTo(0,-10);ctx.lineTo(0,11);ctx.stroke();
    }else if(k==="teleport"){
      ctx.beginPath();ctx.arc(0,0,14,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.arc(0,0,8,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.moveTo(-16,0);ctx.lineTo(16,0);ctx.moveTo(0,-16);ctx.lineTo(0,16);ctx.stroke();
    }else if(k==="bronze"||k==="key"){
      ctx.beginPath();ctx.arc(-7,-3,6,0,Math.PI*2);ctx.stroke();ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(-1,1);ctx.lineTo(13,12);ctx.stroke();ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(7,7);ctx.lineTo(11,3);ctx.moveTo(10,10);ctx.lineTo(14,6);ctx.stroke();
    }else return ctx.restore(),false;
    ctx.restore();state.pickupEnhancedDraws=(state.pickupEnhancedDraws||0)+1;return true;
  }
  function installPickupGraphics(){
    const current=window.drawPickupGlyph;if(typeof current!=="function")return false;
    if(current.__ccgV141R29PickupGraphics){state.pickupInstalled=true;state.lastPickupSource=current;return true}
    if(current===state.lastPickupSource)return Boolean(state.pickupInstalled);
    const wrapped=function drawPickupGlyphV141R29(item,col){
      if(drawEnhancedPickup(item,col))return;
      try{ctx.save();ctx.scale(1.16,1.16);return current.apply(this,arguments)}finally{try{ctx.restore()}catch(_){}}
    };
    wrapped.__ccgV141R29PickupGraphics=true;wrapped.__ccgOriginal=current;window.drawPickupGlyph=wrapped;
    state.pickupInstalled=true;state.lastPickupSource=wrapped;return true;
  }

  function roomAtState(worldState,x,y){try{return window.CCGWorld?.roomAt?.(worldState,x,y)??-1}catch(_){return-1}}
  function sealRoomDoorBypasses(worldState,hostState){
    if(!worldState?.map||!Array.isArray(worldState.rooms)||!Array.isArray(worldState.edges)||!worldState.edges.length||worldState.largeRoomGridV135)return 0;
    if(worldState._v141r29DoorBypassesRepaired)return 0;if(!Array.isArray(hostState?.doors)||!hostState.doors.length)return 0;
    const roomDoors=hostState.doors.filter(door=>door?.type==="room"&&["north","south","east","west"].includes(String(door.side||"")));
    if(!roomDoors.length)return 0;
    const occupied=new Set(hostState.doors.map(door=>`${door.x},${door.y}`)),groups=new Map();
    for(const door of roomDoors){const key=String(door.groupId||door.id||`${door.roomId}:${door.side}:${door.x},${door.y}`);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(door)}
    let sealed=0;
    for(const leaves of groups.values()){
      const first=leaves[0],side=String(first.side||""),room=worldState.rooms[Number(first.roomId)];if(!room)continue;
      let candidates=[],out={x:0,y:0};
      if(side==="east"||side==="west"){
        out={x:side==="east"?1:-1,y:0};const x=Number(first.x),ys=leaves.map(door=>Number(door.y));candidates=[{x,y:Math.min(...ys)-1},{x,y:Math.max(...ys)+1}];
      }else{
        out={x:0,y:side==="south"?1:-1};const y=Number(first.y),xs=leaves.map(door=>Number(door.x));candidates=[{x:Math.min(...xs)-1,y},{x:Math.max(...xs)+1,y}];
      }
      for(const cell of candidates){
        if(cell.x<room.x||cell.x>=room.x+room.w||cell.y<room.y||cell.y>=room.y+room.h)continue;
        const outside={x:cell.x+out.x,y:cell.y+out.y};if(!worldState.map?.[cell.y]||!worldState.map?.[outside.y])continue;
        if(worldState.map[cell.y][cell.x]!==0||worldState.map[outside.y][outside.x]!==0)continue;
        if(occupied.has(`${cell.x},${cell.y}`)||occupied.has(`${outside.x},${outside.y}`))continue;
        if(roomAtState(worldState,outside.x,outside.y)>=0)continue;
        worldState.map[outside.y][outside.x]=1;sealed++;
      }
    }
    worldState._v141r29DoorBypassesRepaired=true;
    if(sealed){hostState.revision=(Number(hostState.revision)||0)+1;state.doorBypassesSealed=(state.doorBypassesSealed||0)+sealed;try{if(typeof broadcastWorld==="function"&&(typeof playMode==="undefined"||playMode!=="online"||net?.isHost))broadcastWorld()}catch(_){}}
    return sealed;
  }
  function repairDungeonStructure(){
    if(modeType())return 0;const worldState=typeof world!=="undefined"?world:null,hostState=typeof host!=="undefined"?host:null;return sealRoomDoorBypasses(worldState,hostState)
  }

  const PROGRESS_LABEL=/^(?:CONTINUE|RESUME|OK|DONE|CLOSE|BACK TO GAME|RETURN TO GAME|GOT IT|DISMISS|ACKNOWLEDGE|COMPLETE TUTORIAL)(?:\b|$)/i;
  function editableTarget(target){return Boolean(target?.closest?.('input,textarea,select,[contenteditable="true"]'))}
  function visibleNode(node){if(!node||node.classList?.contains("hidden")||node.hidden||node.getAttribute?.("aria-hidden")==="true")return false;try{const style=getComputedStyle(node);return style.display!=="none"&&style.visibility!=="hidden"}catch(_){return true}}
  function progressButtonFor(root){
    if(!root)return null;const buttons=[...root.querySelectorAll('button:not([disabled]),input[type="button"]:not([disabled]),input[type="submit"]:not([disabled])')].filter(visibleNode);
    return buttons.find(button=>PROGRESS_LABEL.test(String(button.textContent||button.value||"").trim()))||buttons.find(button=>button.dataset?.enterDefault==="true")||null;
  }
  function handleEnterProgress(event){
    if(event.code!=="Enter"||event.repeat||event.defaultPrevented||editableTarget(event.target))return;
    const roots=[...document.querySelectorAll('.overlay:not(.hidden),[role="dialog"]:not(.hidden),[aria-modal="true"]:not(.hidden),#ccg-tutorial-stage-modal:not(.hidden),#ccg-tutorial-info-tour:not(.hidden)')]
      .filter(visibleNode).filter(node=>!["menu","online-lobby"].includes(node.id));
    const root=roots.at(-1);if(!root)return;const button=progressButtonFor(root);if(!button)return;
    event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();try{button.focus({preventScroll:true})}catch(_){}button.click();state.enterContinues=(state.enterContinues||0)+1;
  }
  function installEnterProgress(){
    if(state.enterInstalled)return true;window.addEventListener("keydown",handleEnterProgress,true);state.enterInstalled=true;return true;
  }

  function install(){
    installStableLoop();installQuitAudioGuard();installHordeFriendlyFireGuard();installHordeNetworkDamageGuard();installSpyToastThrottle();installSpyMovementOwner();installContactCombatGuard();installPickupGraphics();installEnterProgress();normaliseItemNames();repairDungeonStructure();updateRemainingHud();runTransitionGuard();preserveStaticUi();
    return state.loopInstalled&&state.quitInstalled&&state.damageInstalled
  }

  install();state.timer=setInterval(install,INSTALL_MS);
  addEventListener("pagehide",()=>{if(state.timer)clearInterval(state.timer);silenceGameplayAudio()},{once:true});
  window.CCGLostSizzlerV141R29={
    SPY_HINT_COOLDOWN_MS,stableLoop,silenceGameplayAudio,spyMove,spyStep,primeSpyDoor,hordeRemaining,updateRemainingHud,contactBlock,normaliseItemTitle,normaliseItemNames,sealRoomDoorBypasses,repairDungeonStructure,progressButtonFor,handleEnterProgress,drawEnhancedPickup,install,get state(){return state}
  };
})();