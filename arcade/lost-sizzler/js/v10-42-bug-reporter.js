/* C64 Dungeon Carnage V10.42 — bounded developer incident recorder.
 * Observation only: no gameplay/input/render ownership.
 */
(()=>{
  "use strict";
  if(window.CCGLostSizzlerBugReporter)return;

  const MAX_EVENTS=240;
  const TEXT_EVENTS=120;
  const SAMPLE_MS=3000;
  const TRAP_PROBE_MS=40;
  const TRAP_VERIFY_MS=220;
  const STYLE_PATH="css/v10-42-bug-reporter.css";
  const events=[];
  const trapObservations=new Map();
  const trapChecks=new Set();
  const duplicateTrapTiles=new Set();
  const movementBoundaryChecks=new WeakMap();
  let movementBoundarySerial=0;
  const state={installed:false,reports:0,anomalies:0,trapAnomalies:0,trapContacts:0,trapVerifiedHits:0,environmentContacts:0,environmentAnomalies:0,environmentVerifiedHits:0,lastTrap:null,lastEnvironment:null,lastReport:null,preReportSnapshot:null,sampleTimer:0,trapProbeTimer:0};

  const safe=(fn,fallback=null)=>{try{const value=fn();return value===undefined?fallback:value}catch(_){return fallback}};
  const nowIso=()=>new Date().toISOString();
  const compact=value=>{
    if(value==null||["string","number","boolean"].includes(typeof value))return value;
    if(Array.isArray(value))return value.slice(0,24).map(compact);
    if(typeof value==="object"){
      const out={};let count=0;
      for(const [key,val] of Object.entries(value)){
        if(count++>=32)break;
        out[key]=compact(val);
      }
      return out;
    }
    return String(value);
  };
  function push(type,detail={}){
    events.push({at:nowIso(),ms:Math.round(performance.now()),type:String(type),detail:compact(detail)});
    if(events.length>MAX_EVENTS)events.splice(0,events.length-MAX_EVENTS);
  }

  function panelState(id){
    const node=document.getElementById(id);
    return node?{present:true,hidden:node.classList.contains("hidden"),display:safe(()=>getComputedStyle(node).display,"")}:{present:false};
  }
  function activeElement(){
    const node=document.activeElement;
    if(!(node instanceof Element))return null;
    return{tag:node.tagName,id:node.id||"",className:String(node.className||"").slice(0,160)};
  }
  function weaponState(player){
    const weapon=player?.weapon;
    if(!weapon)return null;
    return{
      id:weapon.id||"",name:weapon.displayName||weapon.name||"",rarity:weapon.rarity||"",
      rating:Number(weapon.rating||0),power:Number(weapon.power||0),delay:Number(weapon.delay||0),
      shots:Number(weapon.shots||1),ammo:Number(weapon.ammo||1),pierce:Number(weapon.pierce||0),
      element:weapon.element||"",mods:Array.isArray(weapon.mods)?weapon.mods.slice(0,12):[]
    };
  }
  function playerState(player){
    if(!player)return null;
    return{
      id:player.id||"",x:Number(player.x),y:Number(player.y),rx:Number(player.rx),ry:Number(player.ry),
      health:Number(player.health),maxHealth:Number(player.maxHealth),mana:Number(player.mana),maxMana:Number(player.maxMana),
      armor:Number(player.armor||0),level:Number(player.level||0),hitStunMs:Number(player.hitStunMs||0),
      invuln:Number(player.invuln||0),controlLocked:Boolean(player.controlLocked),controlsLocked:Boolean(player.controlsLocked),
      firearmUnlocked:player.firearmUnlocked!==false,weaponLevel:Number(player.weaponLevel||0),
      weapon:weaponState(player),ownedWeaponCount:Array.isArray(player.ownedWeapons)?player.ownedWeapons.length:0,
      activeWeaponIndex:Number.isInteger(player.activeWeaponIndex)?player.activeWeaponIndex:null,
      meleeSwingAt:Number(player._meleeSwingAt||0)
    };
  }

  const trapId=trap=>String(trap?.id||`${trap?.x},${trap?.y}`);
  const trapPlayerId=player=>String(player?.id||player?.name||"P1");
  const trapWorldKey=()=>safe(()=>`${String(run?.seed||"run")}|F${Math.max(1,Number(run?.floor||1))}`,"run|F1");
  const trapContactKey=(player,trap)=>`${trapWorldKey()}|${trapPlayerId(player)}|${trapId(trap)}`;
  const trapCycleKey=(player,trap)=>`${trapPlayerId(player)}|${trapId(trap)}`;
  function trapClock(trap,stamp=performance.now()){
    const period=Math.max(1,Number(trap?.period)||1),phaseOffset=Number(trap?.phase)||0;
    const phase=((Number(stamp)+phaseOffset)%period+period)%period;
    const active=Boolean(trap?.active!==false&&safe(()=>typeof SYS?.trapActive==="function"?SYS.trapActive(trap,stamp):phase<period*.46,false));
    const cycle=safe(()=>window.CCGLostSizzlerV142R19MobileTrapLayoutStability?.trapCycleId?.(trap,stamp),Math.floor((Number(stamp)+phaseOffset)/period));
    return{period,phaseOffset,phase,activeWindow:period*.46,active,cycle:Number(cycle||0)};
  }
  function ownerChain(fn){
    const rows=[],seen=new Set();let current=fn,depth=0;
    while(typeof current==="function"&&!seen.has(current)&&depth<16){
      seen.add(current);
      const markers=[];
      for(const marker of [
        "__ccgV142R19MobileTrapDamage","__ccgV142R19TrapTriggerOwner","__ccgV141R56EnvironmentDamage",
        "__ccgV141R60EnvironmentSeal","__ccgV142R18","__ccgV141PostPlaytestHurt",
        "__ccgV141R57DesktopPrepStability","__ccgV141R54","__ccgV141PostPlaytestStability"
      ])if(current?.[marker]===true)markers.push(marker);
      rows.push({depth,name:String(current.name||"anonymous"),markers});
      current=typeof current.__ccgOriginal==="function"?current.__ccgOriginal:null;depth++;
    }
    return rows;
  }
  function trapOwnerSnapshot(player,trap,stamp=performance.now()){
    const rare=window.CCGLostSizzlerRareEventsBalance?.trapRuntime||null;
    const contactKey=trapContactKey(player,trap),cycleKey=trapCycleKey(player,trap),clock=trapClock(trap,stamp);
    return{
      trap:{id:trapId(trap),kind:String(trap?.kind||"floor"),x:Number(trap?.x),y:Number(trap?.y),activeFlag:trap?.active!==false,...clock},
      player:{id:trapPlayerId(player),x:Number(player?.x),y:Number(player?.y),health:Number(player?.health),armor:Number(player?.armor||0),invuln:Number(player?.invuln||0),hitStunMs:Number(player?.hitStunMs||0),lastHurtAt:Number(player?.__ccgLastHurtAt||0)},
      latches:{
        rareContact:safe(()=>Boolean(rare?.contact?.has?.(contactKey)),false),
        r56Cycle:safe(()=>window.CCGLostSizzlerV141R56PlaytestCompletion?.state?.trapCycles?.get?.(cycleKey)??null,null),
        r57Cycle:safe(()=>window.CCGLostSizzlerV141R57DesktopPrepStability?.state?.trapCycles?.get?.(cycleKey)??null,null)
      },
      r19:compact(safe(()=>window.CCGLostSizzlerV142R19MobileTrapLayoutStability?.state||null,null)),
      owners:{hurtPlayer:ownerChain(window.hurtPlayer),triggerTrap:ownerChain(window.triggerTrap)}
    };
  }
  function trapSnapshot(player){
    if(!player)return null;
    const stamp=performance.now(),matches=safe(()=>(host?.traps||[]).filter(trap=>trap?.active!==false&&Number(trap.x)===Number(player.x)&&Number(trap.y)===Number(player.y)),[]);
    return{
      at:{x:Number(player.x),y:Number(player.y)},
      totalOrdinaryTraps:safe(()=>Number(host?.traps?.length||0),0),
      matches:matches.map(trap=>trapOwnerSnapshot(player,trap,stamp)),
      duplicateCount:matches.length,
      layers:{
        rareEvents:Boolean(window.CCGLostSizzlerRareEventsBalance),
        r56:Boolean(window.CCGLostSizzlerV141R56PlaytestCompletion),
        r57:Boolean(window.CCGLostSizzlerV141R57DesktopPrepStability),
        r60:Boolean(window.CCGLostSizzlerV141R60LivePlayIntegrity),
        r19:Boolean(window.CCGLostSizzlerV142R19MobileTrapLayoutStability),
        r20:Boolean(window.CCGLostSizzlerV142R20TrapCycleHandoffStability)
      }
    };
  }
  function dedicatedHazardSnapshot(player){
    if(!player)return null;
    return safe(()=>{
      const elapsed=Number(host?.floorElapsed||run?.elapsed||0);
      const roomId=typeof W?.roomAt==="function"?W.roomAt(world,Number(player.x),Number(player.y)):null;
      const matches=(host?.hazardRooms||[]).filter(hazard=>hazard&&hazard.roomId===roomId).map(hazard=>{
        const state=typeof SYS?.hazardCellState==="function"?SYS.hazardCellState(hazard,Number(player.x),Number(player.y),elapsed):{active:false,warning:false,group:-1};
        return{id:String(hazard.id||""),type:String(hazard.type||""),title:String(hazard.title||""),roomId:Number(hazard.roomId),active:Boolean(state?.active),warning:Boolean(state?.warning),group:Number(state?.group??-1),elapsed,hitCooldown:Number(player.hazardHitCooldown||0)};
      }).filter(row=>row.active||row.warning);
      return{at:{x:Number(player.x),y:Number(player.y)},matches};
    },null);
  }

  function observeMovementBoundary(player,stage="after",meta={}){
    const playing=document.body?.dataset?.runActive==="true"&&safe(()=>String(mode)==="playing",false);
    if(!playing||!player||Number(player.health||0)<=0)return false;
    const stamp=performance.now(),x=Number(player.x),y=Number(player.y);

    if(stage==="before"){
      const ordinary=safe(()=>(host?.traps||[])
        .filter(trap=>trap?.active!==false&&Number(trap.x)===x&&Number(trap.y)===y)
        .map(trap=>trapOwnerSnapshot(player,trap,stamp)),[]);
      const activeTraps=ordinary.filter(row=>row?.trap?.active===true);
      const dedicated=dedicatedHazardSnapshot(player);
      const activeHazards=(dedicated?.matches||[]).filter(row=>row?.active===true&&Number(row?.hitCooldown||0)<=0);
      const record={
        serial:++movementBoundarySerial,world:trapWorldKey(),playerId:trapPlayerId(player),x,y,at:stamp,
        beforeHealth:Number(player.health||0),beforeArmor:Number(player.armor||0),beforeHurtAt:Number(player.__ccgLastHurtAt||0),
        activeTraps,activeHazards,meta:compact(meta)
      };
      movementBoundaryChecks.set(player,record);
      if(activeTraps.length||activeHazards.length){
        state.environmentContacts++;
        state.lastEnvironment=record;
        push("environment-boundary-contact",record);
      }
      return true
    }

    const before=movementBoundaryChecks.get(player);
    movementBoundaryChecks.delete(player);
    if(!before)return false;
    if(!before.activeTraps.length&&!before.activeHazards.length)return true;

    const immediate={
      health:Number(player.health||0),armor:Number(player.armor||0),hurtAt:Number(player.__ccgLastHurtAt||0),
      x:Number(player.x),y:Number(player.y),at:performance.now()
    };
    push("environment-boundary-result",{
      serial:before.serial,world:before.world,playerId:before.playerId,
      contact:{x:before.x,y:before.y},after:immediate,
      healthLoss:before.beforeHealth-immediate.health,armorLoss:before.beforeArmor-immediate.armor,
      activeTrapKinds:before.activeTraps.map(row=>String(row?.trap?.kind||"floor")),
      activeHazards:before.activeHazards.map(row=>({id:row.id,type:row.type,title:row.title}))
    });

    setTimeout(()=>{
      const finalHealth=Number(player.health||0),finalArmor=Number(player.armor||0),finalHurtAt=Number(player.__ccgLastHurtAt||0);
      const healthLoss=before.beforeHealth-finalHealth,armorLoss=before.beforeArmor-finalArmor;
      const trapDamageObserved=healthLoss>=1||finalHurtAt>before.beforeHurtAt;
      if(before.activeTraps.length&&!trapDamageObserved){
        state.anomalies++;state.trapAnomalies++;state.environmentAnomalies++;
        const detail={
          serial:before.serial,world:before.world,playerId:before.playerId,contact:{x:before.x,y:before.y},
          expectedHealthLoss:1,actualHealthLoss:healthLoss,armorLoss,
          beforeHealth:before.beforeHealth,afterHealth:finalHealth,beforeArmor:before.beforeArmor,afterArmor:finalArmor,
          beforeHurtAt:before.beforeHurtAt,afterHurtAt:finalHurtAt,
          movedAway:Number(player.x)!==before.x||Number(player.y)!==before.y,
          traps:before.activeTraps,meta:before.meta
        };
        state.lastEnvironment=detail;
        push("ANOMALY_ACTIVE_TRAP_CROSSING_NO_DAMAGE",detail);
        updateBadge();
      }else if(before.activeTraps.length){
        state.environmentVerifiedHits++;
        push("environment-trap-crossing-damage-confirmed",{
          serial:before.serial,world:before.world,playerId:before.playerId,contact:{x:before.x,y:before.y},
          healthLoss,armorLoss,traps:before.activeTraps.map(row=>row.trap)
        });
      }

      const dedicatedDamage=healthLoss+Math.max(0,armorLoss);
      if(before.activeHazards.length&&dedicatedDamage<1&&finalHurtAt<=before.beforeHurtAt){
        state.anomalies++;state.environmentAnomalies++;
        const detail={
          serial:before.serial,world:before.world,playerId:before.playerId,contact:{x:before.x,y:before.y},
          expectedDamageSignal:1,healthLoss,armorLoss,beforeHurtAt:before.beforeHurtAt,afterHurtAt:finalHurtAt,
          movedAway:Number(player.x)!==before.x||Number(player.y)!==before.y,
          hazards:before.activeHazards,meta:before.meta
        };
        state.lastEnvironment=detail;
        push("ANOMALY_ACTIVE_HAZARD_CROSSING_NO_DAMAGE",detail);
        updateBadge();
      }else if(before.activeHazards.length){
        state.environmentVerifiedHits++;
        push("environment-hazard-crossing-damage-confirmed",{
          serial:before.serial,world:before.world,playerId:before.playerId,contact:{x:before.x,y:before.y},
          healthLoss,armorLoss,hazards:before.activeHazards
        });
      }
    },TRAP_VERIFY_MS);
    return true
  }

  function currentSnapshot(reason="snapshot"){
    const player=safe(()=>p1,null),second=safe(()=>p2,null);
    const playerId=player?.id;
    const activeProjectiles=safe(()=>bullets.filter(b=>b&&b.ttl>0&&(!playerId||b.owner===playerId)).length,0);
    const memory=safe(()=>host?.memoryPuzzle,null);
    const build=document.querySelector('meta[name="ccg-lost-sizzler-build"]')?.content||document.body?.dataset?.v142Build||"";
    const cache=document.querySelector('meta[name="ccg-lost-sizzler-cache"]')?.content||"";
    return{
      capturedAt:nowIso(),reason,
      release:{build,cache,path:location.pathname,bootstrapReady:document.body?.dataset?.v142BootstrapReady||"",releaseReady:document.body?.dataset?.releaseReady||""},
      browser:{
        visibility:document.visibilityState,hasFocus:document.hasFocus(),activeElement:activeElement(),
        viewport:{w:innerWidth,h:innerHeight,dpr:Number(devicePixelRatio||1)},fullscreen:Boolean(document.fullscreenElement),
        coarsePointer:safe(()=>matchMedia("(pointer: coarse)").matches,false),deviceMemory:Number(navigator.deviceMemory||0),
        hardwareConcurrency:Number(navigator.hardwareConcurrency||0),
        heap:safe(()=>performance.memory?{used:performance.memory.usedJSHeapSize,total:performance.memory.totalJSHeapSize,limit:performance.memory.jsHeapSizeLimit}:null,null)
      },
      game:{
        mode:safe(()=>String(mode),""),playMode:safe(()=>String(playMode),""),
        specialMode:safe(()=>String(window.CCGLostSizzlerSpecialModes?.active?.type||document.body?.dataset?.specialMode||""),""),
        runActive:document.body?.dataset?.runActive==="true",
        floor:safe(()=>Number(run?.floor||0),0),elapsed:safe(()=>Number(run?.elapsed||0),0),
        alert:safe(()=>Number(run?.alert||0),0),floorComplete:safe(()=>Boolean(run?.floorComplete),false),
        score:safe(()=>Number(score||0),0),
        inputKeys:safe(()=>[...input].map(String).sort(),[]),
        fire1:safe(()=>Number(fire1),null),fire2:safe(()=>Number(fire2),null),
        fireBuffer1:safe(()=>Number(fireBuffer1),null),fireBuffer2:safe(()=>Number(fireBuffer2),null),
        projectileCD:safe(()=>Number(projectileCD),null),activeProjectiles,
        maxProjectiles:safe(()=>Number(C?.player?.maxProjectiles||0)+Math.max(0,Number(player?.weapon?.shots||1)-1),null),
        bulletsTotal:safe(()=>bullets.length,0),enemyBulletsTotal:safe(()=>enemyBullets.length,0),
        performanceTier:document.body?.dataset?.v141R47PerformanceTier||"normal"
      },
      player1:playerState(player),player2:playerState(second),
      trapUnderPlayer:trapSnapshot(player),
      shopState:safe(()=>({
        open:Boolean(activeShop&&UI?.shop&&!UI.shop.classList.contains("hidden")),
        shopId:String(activeShop?.id||""),shopType:String(activeShop?.shopType||""),
        score:Number(score||0),artefacts:Number(PGR?.inventoryKindCount?.(player,"artefact")||0),
        inventoryUsed:Array.isArray(player?.inventory)?player.inventory.length:0,
        inventoryCapacity:Number(PGR?.inventoryCapacity?.(player)||0),
        feedback:window.CCGLostSizzlerV142R55ShopFeedback?.state?.last||null
      }),null),
      dedicatedHazardUnderPlayer:dedicatedHazardSnapshot(player),
      panels:{
        inventory:panelState("inventory-panel"),pause:panelState("pause-panel"),shop:panelState("shop-panel"),
        itemInfo:panelState("item-info-panel"),dossier:panelState("named-dossier-panel"),save:panelState("save-panel")
      },
      puzzle:memory?{
        roomId:memory.roomId,phase:memory.phase,inputIndex:Number(memory.inputIndex||0),failures:Number(memory.failures||0),
        flashTile:Number(memory.flashTile??-1),solved:Boolean(memory.solved),
        sequence:Array.isArray(memory.sequence)?[...memory.sequence]:[],
        tiles:Array.isArray(memory.tiles)?memory.tiles.map(t=>({index:t.index,x:t.x,y:t.y})):[],
        activator:memory.activator?{x:memory.activator.x,y:memory.activator.y}:null
      }:null,
      diagnostics:{
        pauseAttackLastReset:safe(()=>window.__CCG_PAUSE_ATTACK_LAST_RESET__||null,null),
        attackHold:safe(()=>window.CCGLostSizzlerV142AttackHoldLiveness?.diagnostics||null,null),
        soloStability:safe(()=>window.CCGLostSizzlerV142R18SoloPlaytestStability?.diagnostics||null,null),
        fireRecovery:safe(()=>window.CCGLostSizzlerV142R20LiveRegressionStability?.diagnostics||null,null),
        runtimeRepair:safe(()=>window.CCGLostSizzlerV141R29?.state||null,null),
        trapStability:safe(()=>window.CCGLostSizzlerV142R19MobileTrapLayoutStability?.state||null,null),
        loopFinalizer:safe(()=>window.CCGLostSizzlerV141R29LoopFinalizer?.state||null,null),
        renderOwnership:safe(()=>window.CCGLostSizzlerV141R51RenderOwnershipFinalizer?.state||null,null),
        chestRender:safe(()=>window.__CCG_CHEST_RENDER_DIAGNOSTICS__||null,null),
        projectileLifecycle:safe(()=>window.CCGLostSizzlerV142ProjectileLifecycle?.state||null,null),
        performanceGovernor:safe(()=>window.CCGLostSizzlerV141R47AllModeOptimisation?.getDiagnostics?.()||null,null),
        globalPerformance:safe(()=>window.CCGLostSizzlerV141R37GlobalPerformance?.getDiagnostics?.()||null,null),
        enemySimulation:safe(()=>window.CCGAI?.getSimulationDiagnostics?.()||null,null),
        liveArrays:safe(()=>({
          enemies:Array.isArray(host?.enemies)?host.enemies.length:0,
          particles:Array.isArray(particles)?particles.length:0,
          rings:Array.isArray(rings)?rings.length:0,
          floaters:Array.isArray(floaters)?floaters.length:0,
          hazards:Array.isArray(hazards)?hazards.length:0,
          bullets:Array.isArray(bullets)?bullets.length:0,
          enemyBullets:Array.isArray(enemyBullets)?enemyBullets.length:0
        }),null)
      }
    };
  }

  function snapshotSummary(reason){
    const s=currentSnapshot(reason);
    push("snapshot",{
      reason,mode:s.game.mode,floor:s.game.floor,pos:s.player1?{x:s.player1.x,y:s.player1.y}:null,
      mana:s.player1?.mana,weapon:s.player1?.weapon?.name||"",fire1:s.game.fire1,buffer:s.game.fireBuffer1,
      projectiles:s.game.activeProjectiles,input:s.game.inputKeys,inventoryHidden:s.panels.inventory.hidden,
      performanceTier:s.game.performanceTier,
      trapHits:s.diagnostics.trapStability?.trapHits??null,trapRepairs:s.diagnostics.trapStability?.directTrapRepairs??null,
      trapUnderPlayer:s.trapUnderPlayer,trapAnomalies:state.trapAnomalies,
      loopReassertions:s.diagnostics.loopFinalizer?.reassertions??null,renderRepairs:s.diagnostics.renderOwnership?.repairs??null,
      visibility:s.browser.visibility,focus:s.browser.hasFocus
    });
    return s;
  }

  function fireProbe(code,before){
    if(!before?.player1||before.game.mode!=="playing"||!before.game.runActive)return;
    setTimeout(()=>{
      const after=currentSnapshot("attack-probe");
      const fired=Number(after.player1?.mana)<Number(before.player1?.mana)||
        Number(after.game.activeProjectiles)>Number(before.game.activeProjectiles)||
        Number(after.player1?.meleeSwingAt||0)>Number(before.player1?.meleeSwingAt||0);
      push("attack-probe",{code,fired,before:{mana:before.player1?.mana,hitStunMs:before.player1?.hitStunMs,meleeSwingAt:before.player1?.meleeSwingAt,fire1:before.game.fire1,buffer:before.game.fireBuffer1,projectiles:before.game.activeProjectiles,mode:before.game.mode},after:{mana:after.player1?.mana,hitStunMs:after.player1?.hitStunMs,meleeSwingAt:after.player1?.meleeSwingAt,fire1:after.game.fire1,buffer:after.game.fireBuffer1,projectiles:after.game.activeProjectiles,mode:after.game.mode}});
      if(!fired&&after.game.mode==="playing"&&after.game.runActive&&after.browser.visibility==="visible"){
        state.anomalies++;
        const anomalyDetail={
          code,ammo:after.player1?.mana,weapon:after.player1?.weapon?.name||"MELEE",input:after.game.inputKeys,
          hitStunMs:after.player1?.hitStunMs,lastHurtAt:safe(()=>Number(p1?.__ccgLastHurtAt||0),0),
          meleeSwingAt:after.player1?.meleeSwingAt,fire1:after.game.fire1,buffer:after.game.fireBuffer1,projectiles:after.game.activeProjectiles,
          deepOwnerFallbacks:after.diagnostics.fireRecovery?.deepOwnerFallbacks??null,
          deepOwnerFallbackSuccesses:after.diagnostics.fireRecovery?.deepOwnerFallbackSuccesses??null,
          inventoryHidden:after.panels.inventory.hidden,activeElement:after.browser.activeElement
        };
        push("ANOMALY_POSSIBLE_ATTACK_FAILURE",anomalyDetail);
        if(String(after.player1?.weapon?.kind||"").toLowerCase()==="firearm"||Number(after.player1?.mana)>0){
          push("ANOMALY_POSSIBLE_FIRE_FAILURE",anomalyDetail);
        }
        updateBadge();
      }
    },900);
  }

  function trapProbe(){
    const playing=document.body?.dataset?.runActive==="true"&&safe(()=>String(mode)==="playing",false);
    const players=playing?safe(()=>typeof localPlayers==="function"?localPlayers():[safe(()=>p1,null),safe(()=>p2,null)].filter(Boolean),[]):[];
    const stamp=performance.now(),seen=new Set();
    if(!playing||!safe(()=>Array.isArray(host?.traps),false)){
      for(const row of trapObservations.values())row.occupied=false;
      return false
    }

    for(const player of players){
      if(!player||Number(player.health||0)<=0)continue;
      const overlaps=(host.traps||[]).filter(trap=>trap?.active!==false&&Number(trap.x)===Number(player.x)&&Number(trap.y)===Number(player.y));
      const tileKey=`${trapWorldKey()}|${trapPlayerId(player)}|${Number(player.x)},${Number(player.y)}`;
      if(overlaps.length>1&&!duplicateTrapTiles.has(tileKey)){
        duplicateTrapTiles.add(tileKey);state.anomalies++;state.trapAnomalies++;
        push("ANOMALY_MULTIPLE_TRAPS_SAME_TILE",{tileKey,count:overlaps.length,traps:overlaps.map(trap=>({id:trapId(trap),kind:String(trap.kind||""),period:Number(trap.period||0),phase:Number(trap.phase||0)}))});
        updateBadge();
      }

      for(const trap of overlaps){
        const key=trapContactKey(player,trap),clock=trapClock(trap,stamp),previous=trapObservations.get(key)||{occupied:false,active:false,cycle:null,visit:0};
        const entered=!previous.occupied,visit=Number(previous.visit||0)+(entered?1:0);
        seen.add(key);
        const owner=trapOwnerSnapshot(player,trap,stamp);
        if(entered){
          state.trapContacts++;state.lastTrap=owner;
          push("trap-enter",{visit,...owner});
        }
        const activeBoundary=clock.active&&(entered||previous.active!==true||Number(previous.cycle)!==Number(clock.cycle));
        trapObservations.set(key,{occupied:true,active:clock.active,cycle:clock.cycle,visit,lastHealth:Number(player.health||0),kind:String(trap.kind||"floor"),x:Number(trap.x),y:Number(trap.y)});

        if(!activeBoundary)continue;
        const checkKey=`${key}|cycle:${clock.cycle}|visit:${visit}`;
        if(trapChecks.has(checkKey))continue;
        trapChecks.add(checkKey);

        const beforeHealth=Number(player.health||0),beforeHurtAt=Number(player.__ccgLastHurtAt||0),kind=String(trap.kind||"floor").toLowerCase();
        const beforeHits=Number(window.CCGLostSizzlerV142R19MobileTrapLayoutStability?.state?.trapHitsByKind?.[kind]||0);
        push("trap-active-contact-observed",{checkKey,visit,beforeHealth,beforeHits,...owner});

        setTimeout(()=>{
          const afterStamp=performance.now(),afterHealth=Number(player.health||0),afterHurtAt=Number(player.__ccgLastHurtAt||0);
          const afterHits=Number(window.CCGLostSizzlerV142R19MobileTrapLayoutStability?.state?.trapHitsByKind?.[kind]||0);
          const healthLoss=beforeHealth-afterHealth,stillOnTile=Number(player.x)===Number(trap.x)&&Number(player.y)===Number(trap.y);
          const damageObserved=healthLoss>=1||afterHurtAt>beforeHurtAt||afterHits>beforeHits;
          const afterOwner=trapOwnerSnapshot(player,trap,afterStamp);
          if(!damageObserved){
            state.anomalies++;state.trapAnomalies++;state.lastTrap=afterOwner;
            push("ANOMALY_ACTIVE_TRAP_NO_DAMAGE",{
              checkKey,visit,expectedHealthLoss:1,actualHealthLoss:healthLoss,beforeHealth,afterHealth,
              beforeHurtAt,afterHurtAt,beforeHits,afterHits,stillOnTile,elapsedMs:Math.round(afterStamp-stamp),
              before:owner,after:afterOwner
            });
            updateBadge();
          }else{
            state.trapVerifiedHits++;
            push("trap-active-damage-confirmed",{checkKey,visit,kind,healthLoss,beforeHealth,afterHealth,beforeHits,afterHits,stillOnTile});
          }
        },TRAP_VERIFY_MS);
      }
    }

    for(const [key,row] of trapObservations){
      if(!row.occupied||seen.has(key))continue;
      row.occupied=false;row.active=false;
      push("trap-exit",{key,visit:row.visit,kind:row.kind,x:row.x,y:row.y,lastHealth:row.lastHealth});
    }
    if(trapChecks.size>500){
      const keep=[...trapChecks].slice(-250);trapChecks.clear();for(const key of keep)trapChecks.add(key);
    }
    return true
  }

  function createReport(reason="manual",snapshot=null){
    const current=snapshot||currentSnapshot(reason);
    const report={
      schema:"CCG-DUNGEON-BUG-REPORT-v1",
      createdAt:nowIso(),reason,
      summary:current,
      anomalies:state.anomalies,
      recentEvents:events.slice(-MAX_EVENTS)
    };
    state.lastReport=report;state.reports++;
    push("report-created",{reason,events:report.recentEvents.length,anomalies:state.anomalies});
    try{sessionStorage.setItem("ccg-dungeon-last-bug-report",JSON.stringify(report))}catch(_){}
    return report;
  }
  function formatReport(report){
    const s=report.summary,g=s.game,p=s.player1,mem=s.puzzle;
    const lines=[
      "CCG DUNGEON CARNAGE BUG REPORT",
      `Created: ${report.createdAt}`,
      `Build: ${s.release.build} | Cache: ${s.release.cache}`,
      `Reason: ${report.reason}`,
      `Mode: ${g.mode} / ${g.playMode} | Floor: ${g.floor} | Run active: ${g.runActive}`,
      `P1: ${p?`x${p.x},y${p.y} HP ${p.health}/${p.maxHealth} AMMO ${p.mana}/${p.maxMana} ARM ${p.armor}`:"none"}`,
      `Weapon: ${p?.weapon?.name||"none"} | rating ${p?.weapon?.rating??"-"} | power ${p?.weapon?.power??"-"} | shots ${p?.weapon?.shots??"-"}`,
      `Fire state: fire1=${g.fire1} buffer=${g.fireBuffer1} projectileCD=${g.projectileCD} activeProjectiles=${g.activeProjectiles}/${g.maxProjectiles}`,
      `Input: ${g.inputKeys.join(", ")||"none"}`,
      `Inventory hidden: ${s.panels.inventory.hidden} | Pause hidden: ${s.panels.pause.hidden} | Focus: ${s.browser.hasFocus} | Active element: ${s.browser.activeElement?.tag||""}#${s.browser.activeElement?.id||""}`,
      `Memory puzzle: ${mem?`phase=${mem.phase} input=${mem.inputIndex}/${mem.sequence.length} failures=${mem.failures} flash=${mem.flashTile}`:"none"}`,
      `Trap monitor: contacts=${state.trapContacts} verifiedHits=${state.trapVerifiedHits} trapAnomalies=${state.trapAnomalies}`,
      `Recorded anomalies: ${report.anomalies}`
    ];
    const anomalyEvents=report.recentEvents.filter(event=>String(event.type||"").startsWith("ANOMALY_"));
    if(anomalyEvents.length){
      lines.push("","ANOMALY EVENTS");
      for(const event of anomalyEvents){
        let detail="";try{detail=JSON.stringify(event.detail)}catch(_){detail=String(event.detail)}
        lines.push(`[${event.at}] ${event.type} ${detail}`);
      }
    }
    lines.push("",`RECENT EVENTS (latest ${Math.min(TEXT_EVENTS,report.recentEvents.length)})`);
    for(const event of report.recentEvents.slice(-TEXT_EVENTS)){
      let detail="";try{detail=JSON.stringify(event.detail)}catch(_){detail=String(event.detail)}
      lines.push(`[${event.at}] ${event.type} ${detail}`);
    }
    return lines.join("\n");
  }

  function installStylesheet(){
    if(document.querySelector('link[data-ccg-bug-reporter-style="true"]'))return;
    const cache=document.querySelector('meta[name="ccg-lost-sizzler-cache"]')?.content||"latest";
    const link=document.createElement("link");link.rel="stylesheet";link.href=`${STYLE_PATH}?v=${encodeURIComponent(cache)}`;link.dataset.ccgBugReporterStyle="true";document.head.appendChild(link);
  }
  function reporterEnabled(){
    const params=new URLSearchParams(location.search);
    if(params.get("bugreport")==="0"){try{localStorage.removeItem("ccg-dungeon-bug-reporter")}catch(_){}return false}
    if(params.get("bugreport")==="1"||params.get("debug")==="1"){try{localStorage.setItem("ccg-dungeon-bug-reporter","1")}catch(_){}return true}
    return safe(()=>localStorage.getItem("ccg-dungeon-bug-reporter")==="1",false);
  }

  function ensureUi(){
    installStylesheet();
    if(document.getElementById("ccg-bug-report-btn"))return;
    const controls=document.querySelector(".system-buttons")||document.body;
    const button=document.createElement("button");
    button.id="ccg-bug-report-btn";button.type="button";button.className="sound-toggle ccg-bug-report-trigger";
    button.innerHTML='REPORT BUG <span id="ccg-bug-report-count" aria-hidden="true"></span>';
    button.title="Capture the current Dungeon Carnage state and recent diagnostic history (F8)";
    button.style.cssText="position:static!important;inset:auto!important;z-index:auto!important;pointer-events:auto!important;touch-action:manipulation;";
    button.hidden=!reporterEnabled();
    const quit=document.getElementById("quit-btn");
    if(quit&&quit.parentElement===controls)controls.insertBefore(button,quit);else controls.appendChild(button);

    const modal=document.createElement("dialog");modal.id="ccg-bug-report-modal";modal.className="ccg-bug-report-dialog";modal.innerHTML=`
      <section class="ccg-bug-report-card" aria-labelledby="ccg-bug-report-title">
        <div class="ccg-bug-report-head"><h2 id="ccg-bug-report-title">DUNGEON BUG REPORT</h2><button type="button" data-bug-close aria-label="Close bug report">×</button></div>
        <p>Capture this immediately after the fault, before refreshing. Paste the text into the development chat, or attach the JSON file.</p>
        <textarea id="ccg-bug-report-text" spellcheck="false" readonly></textarea>
        <div class="ccg-bug-report-actions">
          <button type="button" data-bug-copy>COPY REPORT</button>
          <button type="button" data-bug-save>SAVE JSON</button>
          <button type="button" data-bug-close>CLOSE</button>
        </div>
        <small id="ccg-bug-report-status">F8 also opens this reporter on desktop.</small>
      </section>`;
    document.body.appendChild(modal);

    const captureBefore=()=>{state.preReportSnapshot=currentSnapshot("manual-pre-ui")};
    button.addEventListener("pointerdown",captureBefore,{passive:true});
    button.addEventListener("click",()=>openReporter("manual-button",state.preReportSnapshot));

    modal.querySelectorAll("[data-bug-close]").forEach(node=>node.addEventListener("click",closeReporter));
    modal.querySelector("[data-bug-copy]")?.addEventListener("click",copyReport);
    modal.querySelector("[data-bug-save]")?.addEventListener("click",saveReport);
    modal.addEventListener("cancel",event=>{event.preventDefault();closeReporter()});
  }
  function updateBadge(){
    const badge=document.getElementById("ccg-bug-report-count");
    if(badge)badge.textContent=state.anomalies?String(state.anomalies):"";
  }
  function openReporter(reason="manual",snapshot=null){
    ensureUi();
    const report=createReport(reason,snapshot||currentSnapshot(reason));
    const textarea=document.getElementById("ccg-bug-report-text"),modal=document.getElementById("ccg-bug-report-modal");
    if(textarea)textarea.value=formatReport(report);
    if(modal&&!modal.open&&typeof modal.showModal==="function")try{modal.showModal()}catch(_){}
    document.getElementById("ccg-bug-report-status").textContent=`Captured ${report.recentEvents.length} recent events and ${report.anomalies} anomaly flag${report.anomalies===1?"":"s"}.`;
  }
  function closeReporter(){
    const modal=document.getElementById("ccg-bug-report-modal");
    if(modal?.open&&typeof modal.close==="function")try{modal.close()}catch(_){}
    if(safe(()=>mode==="playing",false))try{focusGameplayKeyboard()}catch(_){}
  }
  async function copyReport(){
    const text=document.getElementById("ccg-bug-report-text")?.value||"";
    let ok=false;
    try{await navigator.clipboard.writeText(text);ok=true}catch(_){
      const area=document.getElementById("ccg-bug-report-text");
      try{area?.focus();area?.select();ok=document.execCommand("copy")}catch(__){}
    }
    const status=document.getElementById("ccg-bug-report-status");if(status)status.textContent=ok?"REPORT COPIED — paste it into the development chat.":"Copy was blocked by the browser. Select the report text manually.";
  }
  function saveReport(){
    const report=state.lastReport||createReport("manual-save");
    const blob=new Blob([JSON.stringify(report,null,2)],{type:"application/json"});
    const url=URL.createObjectURL(blob),a=document.createElement("a");
    a.href=url;a.download=`ccg-dungeon-bug-${new Date().toISOString().replace(/[:.]/g,"-")}.json`;a.click();
    setTimeout(()=>URL.revokeObjectURL(url),0);
  }

  const interesting=new Set(["Space","Enter","KeyF","Numpad0","Tab","Escape","KeyP","F8"]);
  addEventListener("keydown",event=>{
    if(event.code==="F8"){
      if(event.target instanceof Element&&event.target.matches("input,textarea,select,[contenteditable='true'],[contenteditable='']"))return;
      event.preventDefault();
      const snap=currentSnapshot("f8-pre-ui");push("hotkey-report",{code:event.code,mode:snap.game.mode});
      openReporter("F8",snap);return;
    }
    if(!interesting.has(event.code))return;
    const before=currentSnapshot(`keydown-${event.code}`);
    push("keydown",{code:event.code,repeat:Boolean(event.repeat),mode:before.game.mode,input:before.game.inputKeys,fire1:before.game.fire1,buffer:before.game.fireBuffer1,inventoryHidden:before.panels.inventory.hidden});
    if(["Space","KeyF","Numpad0"].includes(event.code)&&!event.repeat)fireProbe(event.code,before);
    if(["Tab","Escape","KeyP"].includes(event.code))setTimeout(()=>snapshotSummary(`after-${event.code}`),80);
  },true);
  addEventListener("keyup",event=>{if(interesting.has(event.code))push("keyup",{code:event.code,mode:safe(()=>String(mode),""),input:safe(()=>[...input].map(String),[])})},true);
  addEventListener("focus",()=>push("window-focus",{mode:safe(()=>String(mode),"")}),true);
  addEventListener("blur",()=>push("window-blur",{mode:safe(()=>String(mode),""),input:safe(()=>[...input].map(String),[])}),true);
  document.addEventListener("visibilitychange",()=>push("visibility",{state:document.visibilityState,mode:safe(()=>String(mode),"")}));
  document.addEventListener("fullscreenchange",()=>push("fullscreen",{active:Boolean(document.fullscreenElement)}));
  addEventListener("error",event=>push("window-error",{message:String(event.message||""),file:String(event.filename||""),line:Number(event.lineno||0),column:Number(event.colno||0)}));
  addEventListener("unhandledrejection",event=>push("unhandled-rejection",{reason:String(event.reason?.stack||event.reason||"").slice(0,2000)}));
  addEventListener("ccg:sfx",event=>push("sfx",{name:String(event.detail?.name||""),at:Number(event.detail?.at||0)}));
  addEventListener("ccg:shop-firearm-upgrade",event=>push("shop-firearm-upgrade",{shopId:String(event.detail?.shopId||""),floor:Number(event.detail?.floor||0),beforeTier:Number(event.detail?.beforeTier||0),afterTier:Number(event.detail?.afterTier||0),price:Number(event.detail?.price||0),goldCoins:Number(event.detail?.goldCoins||0),scoreBefore:Number(event.detail?.scoreBefore||0),scoreAfter:Number(event.detail?.scoreAfter||0)}));
  addEventListener("ccg:shop-feedback",event=>push("shop-feedback",event.detail||{}));
  addEventListener("ccg:music-state",event=>push("music-state",{reason:String(event.detail?.reason||""),state:String(event.detail?.state||""),roomMood:String(event.detail?.roomMood||""),stalkerNear:Boolean(event.detail?.stalkerNear),stalkerSight:Boolean(event.detail?.stalkerSight),namedEnemy:String(event.detail?.namedEnemy||""),asset:String(event.detail?.asset||""),useMusicAssets:Boolean(event.detail?.useMusicAssets),at:Number(event.detail?.at||0)}));
  addEventListener("ccg:item-collected",event=>push("item-collected",{kind:String(event.detail?.kind||""),name:String(event.detail?.name||""),lootKind:String(event.detail?.lootKind||""),collector:String(event.detail?.collector||""),floor:Number(event.detail?.floor||0)}));
  addEventListener("ccg:collectible-effect",event=>push("collectible-effect",{effect:String(event.detail?.effect||""),active:Boolean(event.detail?.active),at:Number(event.detail?.at||0)}));
  document.addEventListener("click",event=>{
    const target=event.target instanceof Element?event.target.closest("#inventory-close,#inventory-close-top,#resume-btn,[data-ccg-equip-weapon],[data-shop-buy],[data-bug-close]"):null;
    if(!target)return;
    push("ui-click",{id:target.id||"",action:target.getAttribute("data-shop-buy")!=null?`shop-buy:${target.getAttribute("data-shop-buy")}`:target.getAttribute("data-ccg-equip-weapon")!=null?"equip-weapon":target.hasAttribute("data-bug-close")?"bug-close":"",mode:safe(()=>String(mode),"")});
    setTimeout(()=>snapshotSummary(`after-click-${target.id||"control"}`),80);
  },true);

  ensureUi();
  snapshotSummary("reporter-installed");
  state.sampleTimer=setInterval(()=>{
    if(document.body?.dataset?.runActive==="true"||safe(()=>String(mode)!=="menu",false))snapshotSummary("periodic");
  },SAMPLE_MS);
  state.trapProbeTimer=setInterval(()=>{try{trapProbe()}catch(error){push("trap-probe-error",{message:String(error?.stack||error||"").slice(0,1600)})}},TRAP_PROBE_MS);
  addEventListener("pagehide",()=>{if(state.sampleTimer)clearInterval(state.sampleTimer);if(state.trapProbeTimer)clearInterval(state.trapProbeTimer)},{once:true});
  state.installed=true;

  window.CCGLostSizzlerBugReporter=Object.freeze({
    version:"V10.42-bug-reporter-v4",observationOnly:true,gameplayOwnership:false,inputOwnership:false,renderOwnership:false,
    get state(){return state},get events(){return [...events]},
    snapshot:currentSnapshot,trapProbe,trapSnapshot,observeMovementBoundary,createReport,formatReport,open:openReporter,close:closeReporter,
    enable(){try{localStorage.setItem("ccg-dungeon-bug-reporter","1")}catch(_){}ensureUi();const b=document.getElementById("ccg-bug-report-btn");if(b)b.hidden=false},
    disable(){try{localStorage.removeItem("ccg-dungeon-bug-reporter")}catch(_){}const b=document.getElementById("ccg-bug-report-btn");if(b)b.hidden=true;closeReporter()}
  });
})();
