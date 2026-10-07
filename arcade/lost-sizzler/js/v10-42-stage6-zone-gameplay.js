/* C64 Dungeon Carnage V10.42 Stage 6 — deterministic zone gameplay director.
 * Consumes established floor/biome/Stage 5 topology state and tunes existing
 * enemies, traps, dedicated hazards and generators after authoritative decoration.
 * It does not carve topology, advance floors/portals, own saves, spawn quest
 * objectives or replace AI/combat/network authority.
 */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V142_STAGE6_ZONE_GAMEPLAY__)return;
  window.__CCG_LOST_SIZZLER_V142_STAGE6_ZONE_GAMEPLAY__=true;

  const C=window.CCG_CONFIG,W=window.CCGWorld,SYS=window.CCGSystems;
  if(!C||!W||!SYS||typeof SYS.decorate!=="function")return;

  const PROFILES=Object.freeze({
    1:Object.freeze({id:"threshold",floor:1,tier:1,enemyKinds:["scout","ambusher","hunter"],hazardKinds:["blade","arrows","embers"],hazardBase:2450,generatorScale:1.08,guardianPattern:"measured-hunt"}),
    2:Object.freeze({id:"driveworks",floor:2,tier:1,enemyKinds:["scout","guard","hunter"],hazardKinds:["arrows","blade","arrows"],hazardBase:2380,generatorScale:1.04,guardianPattern:"drive-crossfire"}),
    3:Object.freeze({id:"iron",floor:3,tier:1,enemyKinds:["guard","knight","charger"],hazardKinds:["blade","arrows","blade"],hazardBase:2320,generatorScale:.98,guardianPattern:"armoured-advance"}),
    4:Object.freeze({id:"budget",floor:4,tier:2,enemyKinds:["ambusher","hunter","guard"],hazardKinds:["blade","embers","arrows"],hazardBase:2250,generatorScale:.95,guardianPattern:"vault-ambush"}),
    5:Object.freeze({id:"cartridge",floor:5,tier:2,enemyKinds:["charger","hunter","ranger"],hazardKinds:["arrows","blade","embers"],hazardBase:2180,generatorScale:.92,guardianPattern:"cartridge-rush"}),
    6:Object.freeze({id:"tapes",floor:6,tier:2,enemyKinds:["ambusher","ghost","ranger"],hazardKinds:["arrows","embers","blade"],hazardBase:2120,generatorScale:.90,guardianPattern:"tape-labyrinth"}),
    7:Object.freeze({id:"bone",floor:7,tier:3,enemyKinds:["skeleton","ghost","root"],hazardKinds:["arrows","blade","arrows"],hazardBase:2060,generatorScale:.88,guardianPattern:"crypt-pressure"}),
    8:Object.freeze({id:"demo",floor:8,tier:3,enemyKinds:["ghost","ranger","ambusher"],hazardKinds:["embers","arrows","blade"],hazardBase:2000,generatorScale:.86,guardianPattern:"demo-crossfire"}),
    9:Object.freeze({id:"modem",floor:9,tier:3,enemyKinds:["ranger","guard","root"],hazardKinds:["arrows","blade","embers"],hazardBase:1940,generatorScale:.84,guardianPattern:"modem-pincer",unpredictable:true}),
    10:Object.freeze({id:"sid",floor:10,tier:4,enemyKinds:["firebreather","ranger","charger"],hazardKinds:["embers","blade","arrows"],hazardBase:1880,generatorScale:.82,guardianPattern:"sid-furnace",unpredictable:true}),
    11:Object.freeze({id:"ash",floor:11,tier:4,enemyKinds:["firebreather","charger","root"],hazardKinds:["embers","blade","embers"],hazardBase:1820,generatorScale:.80,guardianPattern:"ember-surge",unpredictable:true}),
    12:Object.freeze({id:"foundry",floor:12,tier:4,enemyKinds:["knight","firebreather","ranger"],hazardKinds:["blade","embers","arrows"],hazardBase:1760,generatorScale:.78,guardianPattern:"foundry-crush",unpredictable:true}),
    13:Object.freeze({id:"scores",floor:13,tier:5,enemyKinds:["skeleton","ghost","hunter"],hazardKinds:["arrows","embers","blade"],hazardBase:1710,generatorScale:.76,guardianPattern:"score-haunt",unpredictable:true}),
    14:Object.freeze({id:"crt",floor:14,tier:5,enemyKinds:["ranger","root","ambusher"],hazardKinds:["arrows","blade","embers"],hazardBase:1670,generatorScale:.74,guardianPattern:"crt-maze",unpredictable:true}),
    15:Object.freeze({id:"citadel",floor:15,tier:5,enemyKinds:["ranger","root","guard","firebreather"],hazardKinds:["embers","arrows","blade"],hazardBase:1620,generatorScale:.72,guardianPattern:"citadel-crossfire",unpredictable:true})
  });

  const TRAP_FAMILIES=Object.freeze(["fire","spike","shock"]);
  const state={installed:false,hosts:0,enemiesTuned:0,trapsTuned:0,trapFamilyRepairs:0,hazardsTuned:0,generatorsTuned:0};
  function hash32(value){let h=2166136261>>>0;for(const ch of String(value||"")){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
  const clamp=(v,min,max)=>Math.max(min,Math.min(max,Number(v)||0));
  const floorOf=runState=>clamp(Math.floor(Number(runState?.floor)||1),1,C.maxFloors||5);
  const profileForFloor=floor=>PROFILES[clamp(Math.floor(Number(floor)||1),1,C.maxFloors||15)]||PROFILES[1];

  function roomFor(worldState,entity){
    if(!worldState||!entity)return null;
    const id=W.roomAt(worldState,entity.x,entity.y);
    return id>=0?worldState.rooms?.[id]||null:null;
  }
  function routeRole(room){
    return String(room?.stage5TopologyRole||room?.v142Environment?.rareRole||"route");
  }
  function protectedEnemy(enemy){
    return Boolean(!enemy||enemy.follower||enemy.guardian||enemy.keyGuardian||enemy.deathStalker||enemy.voidStalker||enemy.ccgBoss||enemy.treasureGoblin||enemy.sigilDefender||enemy.exitWarden||enemy.sigilWarden);
  }
  function ordinaryKind(profile,seed,room,enemy){
    const role=routeRole(room),salt=hash32(`${seed}|F${profile.id}|${role}|${enemy?.id||""}|kind`);
    const pool=profile.enemyKinds;
    if(role==="purposeful-dead-end")return pool[(salt+2)%pool.length];
    if(role==="crossroads")return pool[(salt+1)%pool.length];
    return pool[salt%pool.length];
  }
  function tuneEnemy(enemy,profile,seed,worldState){
    if(protectedEnemy(enemy))return enemy;
    const room=roomFor(worldState,enemy),role=routeRole(room),roll=hash32(`${seed}|${enemy.id}|stage6`)%100;
    enemy.v142Zone=profile.id;enemy.v142ZoneRouteRole=role;
    const archetypes={
      2:{ambusher:"Vault Sneak",hunter:"Tape Hunter",guard:"Drive Guard",charger:"Cartridge Brute",ranger:"Tape Marksman",ghost:"Static Wraith"},
      3:{skeleton:"Crypt Rattler",ghost:"Moss Wraith",root:"Grave Binder",ranger:"Modem Marksman",guard:"Line Sentinel",ambusher:"Raster Lurker"},
      4:{firebreather:"SID Burner",charger:"Ember Brute",root:"Ash Binder",knight:"Foundry Juggernaut",ranger:"Furnace Marksman"},
      5:{skeleton:"Score Revenant",ghost:"High-Score Wraith",hunter:"CRT Hunter",ranger:"CRT Hexer",root:"Blood Tendril",ambusher:"Raster Phantom",guard:"Citadel Sentinel",firebreather:"Blood Furnace"}
    };
    enemy.r114Archetype=(archetypes[profile.tier]||{})[enemy.kind]||"";
    if(profile.tier>=3){enemy.moveSpeedScale=Math.max(.72,Number(enemy.moveSpeedScale||1)*(1+.025*(profile.tier-2)));enemy.attackCooldown=Math.max(430,Math.round(Number(enemy.attackCooldown||900)*(1-.035*(profile.tier-2))))}
    if(profile.tier>=4&&role==="crossroads")enemy.maxArmor=Math.max(Number(enemy.maxArmor||enemy.armor||0),profile.tier-1),enemy.armor=Math.max(Number(enemy.armor||0),Math.min(enemy.maxArmor,profile.tier-1));
    // Retype only a deterministic subset of ordinary non-champion enemies.
    // Champions retain their established identity/weakness/reward ownership.
    if(!enemy.champion&&roll<46){
      enemy.kind=ordinaryKind(profile,seed,room,enemy);
      const names=archetypes[profile.tier]||{};enemy.r114Archetype=names[enemy.kind]||enemy.r114Archetype||"";
      enemy.v142ZoneRetyped=true;
    }
    if(profile.id==="iron"&&role==="crossroads"){
      enemy.maxArmor=Math.max(Number(enemy.maxArmor||enemy.armor||0),2);
      enemy.armor=Math.max(Number(enemy.armor||0),Math.min(enemy.maxArmor,2));
    }else if(profile.id==="bone"&&role==="purposeful-dead-end"){
      enemy.moveSpeedScale=Math.max(.78,Number(enemy.moveSpeedScale||1)*.92);
    }else if(profile.id==="ash"&&role==="alternate-route"){
      enemy.attackCooldown=Math.min(Number(enemy.attackCooldown||900),720);
    }else if(profile.id==="sigil"&&role==="crossroads"){
      enemy.tacticalDecisionMs=Math.min(Number(enemy.tacticalDecisionMs||0),180);
    }
    state.enemiesTuned++;return enemy;
  }
  function tuneGuardian(enemy,profile){
    if(!enemy||( !enemy.guardian&&!enemy.keyGuardian&&!enemy.exitWarden&&!enemy.sigilWarden))return enemy;
    enemy.v142Zone=profile.id;enemy.v142ZoneBossPattern=profile.guardianPattern;
    if(profile.id==="iron"){
      enemy.attackCooldown=Math.max(Number(enemy.attackCooldown||0),760);
      enemy.moveSpeedScale=Math.min(1.08,Number(enemy.moveSpeedScale||1));
    }else if(profile.id==="bone"){
      enemy.attackCooldown=Math.max(Number(enemy.attackCooldown||0),700);
      enemy.moveSpeedScale=Math.max(.90,Number(enemy.moveSpeedScale||1));
    }else if(profile.id==="ash"){
      enemy.attackCooldown=Math.min(Math.max(520,Number(enemy.attackCooldown||760)),720);
      enemy.moveSpeedScale=Math.max(1.02,Number(enemy.moveSpeedScale||1));
    }else if(profile.id==="sigil"){
      enemy.attackCooldown=Math.min(Math.max(480,Number(enemy.attackCooldown||700)),650);
      enemy.moveSpeedScale=Math.max(1.04,Number(enemy.moveSpeedScale||1));
    }
    return enemy;
  }
  function tuneTrap(trap,index,profile,seed,worldState){
    if(!trap)return trap;
    const room=worldState?.rooms?.[trap.roomId]||null,role=routeRole(room),salt=hash32(`${seed}|${trap.id}|trap|${role}`);
    const guaranteed=String(trap.v142FinalFamilyKind||trap.kind||"").toLowerCase();
    // A final world-start family representative owns its family identity.
    // Zone tuning may still adjust cadence/phase, but never retag the last
    // guaranteed FIRE, SPIKE or SHOCK into another family.
    if(trap.v142FinalFamilyGuaranteed&&TRAP_FAMILIES.includes(guaranteed))trap.kind=guaranteed;
    else{const trapKinds=Array.isArray(profile.trapKinds)&&profile.trapKinds.length?profile.trapKinds:["fire","spike","shock"];trap.kind=profile.id==="ash"&&index%2===0?"fire":trapKinds[(index+salt)%trapKinds.length]}
    const roleScale=role==="crossroads"?.90:role==="alternate-route"?.94:role==="purposeful-dead-end"?1.08:1;
    trap.period=Math.round(Math.max(1500,Number(profile.trapPeriod||profile.hazardBase||2200))*roleScale);
    trap.phase=salt%Math.max(1,trap.period);
    trap.v142Zone=profile.id;trap.v142ZoneRouteRole=role;
    state.trapsTuned++;return trap;
  }
  function reconcileTrapFamilies(hostState,seed,worldState,profile){
    const traps=(hostState?.traps||[]).filter(trap=>trap?.active);
    const counts=Object.fromEntries(TRAP_FAMILIES.map(kind=>[kind,traps.filter(trap=>String(trap.kind||"").toLowerCase()===kind).length]));
    let repairs=0;
    const occupied=new Set(traps.map(trap=>`${Number(trap.x)},${Number(trap.y)}`));
    const hazardRooms=new Set((hostState?.hazardRooms||[]).map(hazard=>hazard?.roomId).filter(id=>id!=null));
    const baseEligibleRooms=(worldState?.rooms||[]).filter(room=>
      room
      && room.id!==worldState?.startRoomId
      && room.id!==worldState?.exitRoomId
      && !room.dedicatedHazard
      && !hazardRooms.has(room.id)
      && Number(room.w)>=3
      && Number(room.h)>=3
    );
    const strictEligibleRooms=baseEligibleRooms.filter(room=>!room.sanctuary&&!room.sigilRoom&&!room.spiderNest);
    const fallbackEligibleRooms=baseEligibleRooms.filter(room=>!room.sanctuary);
    const emergencyEligibleRooms=baseEligibleRooms;
    const compactEligibleRooms=(worldState?.rooms||[]).filter(room=>
      room
      && room.id!==worldState?.startRoomId
      && room.id!==worldState?.exitRoomId
      && !room.dedicatedHazard
      && !hazardRooms.has(room.id)
    );
    const ultimateEligibleRooms=(worldState?.rooms||[]).filter(room=>
      room
      && room.id!==worldState?.startRoomId
      && room.id!==worldState?.exitRoomId
    );
    const reserveCell=kind=>{
      const visited=new Set();
      for(const pool of [strictEligibleRooms,fallbackEligibleRooms,emergencyEligibleRooms,compactEligibleRooms,ultimateEligibleRooms]){
        const ordered=pool
          .filter(room=>!visited.has(room.id))
          .map(room=>({room,key:hash32(`${seed}|${room.id}|stage6-family-room|${kind}`)}))
          .sort((a,b)=>a.key-b.key);
        for(const {room} of ordered){
          visited.add(room.id);
          const cells=[];
          for(let y=Number(room.y)+1;y<Number(room.y)+Number(room.h);y++){
            for(let x=Number(room.x)+1;x<Number(room.x)+Number(room.w);x++){
              if(worldState?.map?.[y]?.[x]!==0)continue;
              if(occupied.has(`${x},${y}`))continue;
              cells.push({x,y});
            }
          }
          if(!cells.length){
            for(let y=Number(room.y);y<=Number(room.y)+Number(room.h);y++){
              for(let x=Number(room.x);x<=Number(room.x)+Number(room.w);x++){
                if(worldState?.map?.[y]?.[x]!==0)continue;
                if(occupied.has(`${x},${y}`))continue;
                cells.push({x,y});
              }
            }
          }
          if(!cells.length)continue;
          cells.sort((a,b)=>hash32(`${seed}|${room.id}|${kind}|${a.x},${a.y}`)-hash32(`${seed}|${room.id}|${kind}|${b.x},${b.y}`));
          return{room,cell:cells[0]};
        }
      }
      return null;
    };
    for(const kind of TRAP_FAMILIES){
      if(counts[kind]>0)continue;
      const donor=traps
        .filter(trap=>counts[String(trap.kind||"").toLowerCase()]>1)
        .map(trap=>({trap,key:hash32(`${seed}|${trap.id}|stage6-family|${kind}`)}))
        .sort((a,b)=>a.key-b.key)[0]?.trap||null;
      if(donor){
        const previous=String(donor.kind||"").toLowerCase();
        counts[previous]=Math.max(0,Number(counts[previous]||0)-1);
        donor.kind=kind;
        donor.v142ZoneFamilyReconciled=true;
        counts[kind]=1;
        repairs++;
        continue;
      }
      const reserve=reserveCell(kind);
      if(!reserve)continue;
      const trap={
        id:`stage6-family-reserve-${kind}-f${floorOf({floor:profile?.floor||1})}`,
        x:reserve.cell.x,
        y:reserve.cell.y,
        roomId:reserve.room.id,
        kind,
        phase:hash32(`${seed}|${kind}|stage6-family-phase`)%1800,
        period:Number(profile?.trapPeriod||2200),
        active:true,
        v142Zone:String(profile?.id||"threshold"),
        v142ZoneRouteRole:routeRole(reserve.room),
        v142ZoneFamilyReconciled:true,
        v142ZoneFamilyReserve:true
      };
      hostState.traps.push(trap);
      traps.push(trap);
      occupied.add(`${trap.x},${trap.y}`);
      counts[kind]=1;
      repairs++;
    }
    for(const kind of TRAP_FAMILIES){
      const representative=traps.find(trap=>trap?.active&&String(trap.kind||"").toLowerCase()===kind);
      if(representative){representative.v142FinalFamilyGuaranteed=true;representative.v142FinalFamilyKind=kind}
    }
    state.trapFamilyRepairs+=repairs;
    return repairs;
  }
  function tuneHazard(hazard,profile,seed,worldState){
    if(!hazard)return hazard;
    const room=worldState?.rooms?.[hazard.roomId]||null,role=routeRole(room),salt=hash32(`${seed}|${hazard.id}|hazard|${role}|F${profile.floor||1}`);
    const kinds=Array.isArray(profile.hazardKinds)&&profile.hazardKinds.length?profile.hazardKinds:["blade","arrows","embers"];
    hazard.type=kinds[salt%kinds.length];
    const base=Math.max(1500,Number(profile.hazardBase)||2300);
    hazard.period=Math.round(base*(role==="crossroads"?.92:1));
    hazard.warningMs=Math.max(profile.unpredictable?520:600,Math.round(hazard.period*(profile.unpredictable?.29:.32)));
    hazard.activeMs=Math.max(480,Math.round(hazard.period*(profile.unpredictable?.30:.27)));
    hazard.r114Unpredictable=Boolean(profile.unpredictable);
    hazard.r114PatternSeed=salt%97;
    hazard.v142Zone=profile.id;hazard.v142ZoneRouteRole=role;
    state.hazardsTuned++;return hazard;
  }
  function tuneGenerator(generator,profile){
    if(!generator)return generator;
    generator.spawnCooldown=Math.max(3200,Math.round(Number(generator.spawnCooldown||6500)*profile.generatorScale));
    generator.v142Zone=profile.id;generator.v142ZonePressureScale=profile.generatorScale;
    state.generatorsTuned++;return generator;
  }
  function encounterDirectives(worldState,hostState,profile){
    const rooms=hostState?.v142EncounterRuntime?.rooms||[];
    return rooms.map(row=>{
      const room=worldState?.rooms?.[row.roomId]||null,role=routeRole(room),enc=row.encounter||{};
      return Object.freeze({
        roomId:row.roomId,zone:profile.id,routeRole:role,
        pressureBias:role==="crossroads"?1:role==="alternate-route"?1:role==="purposeful-dead-end"?0.5:0,
        eventKind:String(enc.event?.kind||""),
        elite:Boolean(enc.elite),
        rewardFocus:String(enc.rewardFocus||"supplies"),
        bossPattern:profile.guardianPattern
      });
    });
  }
  const usableDedicatedHazard=hazard=>Boolean(hazard&&Array.isArray(hazard.cells)&&hazard.cells.length>0);
  function ensureDedicatedHazard(worldState,hostState,runState,profile,seed){
    const existing=Array.isArray(hostState?.hazardRooms)?hostState.hazardRooms:[];
    if(existing.some(usableDedicatedHazard))return false;
    if(existing.some(hazard=>hazard?.v142WardenCleansed===true))return false;
    if(hostState)hostState.hazardRooms=existing.filter(hazard=>usableDedicatedHazard(hazard)||hazard?.v142WardenCleansed===true);
    const sortCandidates=list=>list.sort((a,b)=>
      Number(Boolean(b.dedicatedHazardReserved))-Number(Boolean(a.dedicatedHazardReserved))
      || Number(Boolean(a.sanctuary))-Number(Boolean(b.sanctuary))
      || (Number(b.w)*Number(b.h))-(Number(a.w)*Number(a.h))
      || hash32(`${seed}|stage6-hazard|${a.id}`)-hash32(`${seed}|stage6-hazard|${b.id}`)
    );
    const preferredCandidates=(worldState?.rooms||[]).filter(room=>
      room
      && room.id!==worldState?.startRoomId
      && room.id!==worldState?.exitRoomId
      && !room.sigilRoom
      && !room.spiderNest
      && Number(room.w)>=2
      && Number(room.h)>=2
    );
    const preferredIds=new Set(preferredCandidates.map(room=>room.id));
    const compactFallbackCandidates=(worldState?.rooms||[]).filter(room=>
      room
      && room.id!==worldState?.startRoomId
      && room.id!==worldState?.exitRoomId
      && !room.sigilRoom
      && !room.spiderNest
      && !preferredIds.has(room.id)
      && Number(room.w)>=1
      && Number(room.h)>=1
    );
    const emergencyCandidates=(worldState?.rooms||[]).filter(room=>
      room
      && room.id!==worldState?.startRoomId
      && room.id!==worldState?.exitRoomId
      && !preferredIds.has(room.id)
      && !compactFallbackCandidates.some(candidate=>candidate.id===room.id)
    );
    const candidates=[...sortCandidates(preferredCandidates),...sortCandidates(compactFallbackCandidates),...sortCandidates(emergencyCandidates)];
    const floor=floorOf(runState),resolvedProfile=profile||profileForFloor(floor),types=["blade","embers","arrows"],type=types[floor%types.length],groups=type==="embers"?2:type==="blade"?3:4;
    for(const room of candidates){
      const cells=[];
      for(let y=Number(room.y)+1;y<Number(room.y)+Number(room.h);y++){
        for(let x=Number(room.x)+1;x<Number(room.x)+Number(room.w);x++){
          if(worldState?.map?.[y]?.[x]!==0)continue;
          const group=type==="embers"?(x+y)%2:type==="blade"?(x-Number(room.x))%3:(y-Number(room.y))%4;
          cells.push({x,y,group});
        }
      }
      if(!cells.length){
        // Compact rooms can expose only walkable boundary cells. Exhaust the
        // complete room footprint, then continue to the next candidate if this
        // room still cannot host a real hazard cell.
        for(let y=Number(room.y);y<=Number(room.y)+Number(room.h)&&!cells.length;y++){
          for(let x=Number(room.x);x<=Number(room.x)+Number(room.w);x++){
            if(worldState?.map?.[y]?.[x]!==0)continue;
            cells.push({x,y,group:0});
            break;
          }
        }
      }
      if(!cells.length)continue;
      const hazard={
        id:`hazard-${floor}-stage6-emergency`,roomId:room.id,type,cells,groups,
        period:type==="arrows"?2050:type==="blade"?2300:2550,
        warningMs:type==="arrows"?780:700,activeMs:type==="embers"?760:560,
        phase:hash32(`${seed}|stage6-hazard-phase|${room.id}`)%1200,
        title:type==="blade"?"PENDULUM BLADE GALLERY":type==="embers"?"EMBER-TILE VAULT":"ARROW-SLIT CROSSING"
      };
      hostState.hazardRooms=hostState.hazardRooms||[];
      hostState.hazardRooms.push(hazard);
      room.dedicatedHazard=true;room.dedicatedHazardReserved=true;room.hazardType=type;room.dangerous=true;
      tuneHazard(hazard,resolvedProfile,seed,worldState);
      state.hazardsTuned++;
      return true
    }

    // Absolute final guarantee for narrow/procedural edge cases: consume an
    // already-walkable cell outside the start/exit rooms without carving or
    // changing topology. Prefer a cell that does not already host a floor trap.
    const trapCells=new Set((hostState?.traps||[]).filter(trap=>trap?.active).map(trap=>`${Number(trap.x)},${Number(trap.y)}`));
    const mapFallbacks=[];
    for(let y=0;y<(worldState?.map||[]).length;y++){
      const row=worldState.map[y]||[];
      for(let x=0;x<row.length;x++){
        if(row[x]!==0)continue;
        const roomId=W.roomAt(worldState,x,y);
        if(roomId<0||roomId===worldState?.startRoomId||roomId===worldState?.exitRoomId)continue;
        const room=(worldState?.rooms||[]).find(candidate=>Number(candidate?.id)===Number(roomId))||worldState?.rooms?.[roomId]||null;
        if(!room)continue;
        mapFallbacks.push({x,y,roomId,room,occupied:trapCells.has(`${x},${y}`),key:hash32(`${seed}|stage6-map-hazard|${roomId}|${x},${y}`)});
      }
    }
    mapFallbacks.sort((a,b)=>Number(a.occupied)-Number(b.occupied)||a.key-b.key);
    const fallback=mapFallbacks[0]||null;
    if(fallback){
      const hazard={
        id:`hazard-${floor}-stage6-map-fallback`,roomId:fallback.roomId,type,cells:[{x:fallback.x,y:fallback.y,group:0}],groups,
        period:type==="arrows"?2050:type==="blade"?2300:2550,
        warningMs:type==="arrows"?780:700,activeMs:type==="embers"?760:560,
        phase:hash32(`${seed}|stage6-map-hazard-phase|${fallback.roomId}|${fallback.x},${fallback.y}`)%1200,
        title:type==="blade"?"PENDULUM BLADE GALLERY":type==="embers"?"EMBER-TILE VAULT":"ARROW-SLIT CROSSING",
        v142ZoneHazardMapFallback:true
      };
      hostState.hazardRooms=hostState.hazardRooms||[];
      hostState.hazardRooms.push(hazard);
      fallback.room.dedicatedHazard=true;fallback.room.dedicatedHazardReserved=true;fallback.room.hazardType=type;fallback.room.dangerous=true;
      tuneHazard(hazard,resolvedProfile,seed,worldState);
      state.hazardsTuned++;
      return true
    }
    return false
  }

  function applyZoneGameplay(worldState,hostState,runState){
    if(!worldState||!hostState||!runState)return hostState;
    const floor=floorOf(runState),profile=profileForFloor(floor),seed=String(runState.seed||"CCG");
    for(const enemy of hostState.enemies||[]){tuneGuardian(enemy,profile);tuneEnemy(enemy,profile,seed,worldState)}
    // R67: ordinary FIRE/SPIKE/SHOCK floor traps are retired. Stage 6 must
    // never rebuild or retag them after the base decorator clears the array.
    hostState.traps=[];
    ensureDedicatedHazard(worldState,hostState,runState,profile,seed);
    for(const hazard of hostState.hazardRooms||[])tuneHazard(hazard,profile,seed,worldState);
    for(const generator of hostState.generators||[])tuneGenerator(generator,profile);
    hostState.v142ZoneGameplay={
      version:"V10.42-stage6-r1",floor,zone:profile.id,guardianPattern:profile.guardianPattern,
      topologyVersion:String(worldState.topology?.version||""),topologyProfile:String(worldState.topology?.profile||""),
      encounterDirectives:encounterDirectives(worldState,hostState,profile)
    };
    state.hosts++;return hostState;
  }

  const baseDecorate=SYS.decorate.bind(SYS);
  SYS.decorate=function decorateV142Stage6ZoneGameplay(worldState,hostState,runState){
    const result=baseDecorate(worldState,hostState,runState);
    return applyZoneGameplay(worldState,result||hostState,runState);
  };
  state.installed=true;

  window.CCGLostSizzlerV142Stage6ZoneGameplay={
    version:"V10.42-stage6-r1",PROFILES,state,profileForFloor,routeRole,protectedEnemy,
    ordinaryKind,tuneEnemy,tuneGuardian,tuneTrap,reconcileTrapFamilies,usableDedicatedHazard,ensureDedicatedHazard,tuneHazard,tuneGenerator,encounterDirectives,applyZoneGameplay
  };
})();
