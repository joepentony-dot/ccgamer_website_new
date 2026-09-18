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
    1:Object.freeze({id:"threshold",enemyKinds:["scout","ambusher","hunter"],trapKinds:["spike","shock","fire"],trapPeriod:2300,generatorScale:1.08,guardianPattern:"measured-hunt"}),
    2:Object.freeze({id:"iron",enemyKinds:["guard","knight","charger"],trapKinds:["shock","spike","shock"],trapPeriod:2050,generatorScale:.96,guardianPattern:"armoured-advance"}),
    3:Object.freeze({id:"bone",enemyKinds:["skeleton","ghost","root"],trapKinds:["spike","shock","spike"],trapPeriod:1920,generatorScale:.90,guardianPattern:"crypt-pressure"}),
    4:Object.freeze({id:"ash",enemyKinds:["firebreather","charger","ranger"],trapKinds:["fire","fire","spike"],trapPeriod:1740,generatorScale:.84,guardianPattern:"ember-surge"}),
    5:Object.freeze({id:"sigil",enemyKinds:["ranger","root","guard"],trapKinds:["shock","fire","shock"],trapPeriod:1640,generatorScale:.80,guardianPattern:"sigil-crossfire"})
  });

  const state={installed:false,hosts:0,enemiesTuned:0,trapsTuned:0,hazardsTuned:0,generatorsTuned:0};
  function hash32(value){let h=2166136261>>>0;for(const ch of String(value||"")){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
  const clamp=(v,min,max)=>Math.max(min,Math.min(max,Number(v)||0));
  const floorOf=runState=>clamp(Math.floor(Number(runState?.floor)||1),1,C.maxFloors||5);
  const profileForFloor=floor=>PROFILES[clamp(Math.floor(Number(floor)||1),1,5)]||PROFILES[1];

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
    // Retype only a deterministic subset of ordinary non-champion enemies.
    // Champions retain their established identity/weakness/reward ownership.
    if(!enemy.champion&&roll<46){
      enemy.kind=ordinaryKind(profile,seed,room,enemy);
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
    // Ember must always advertise its mechanical identity even on a floor
    // with only one or two retained traps. Other zones keep deterministic
    // palette selection, while every even Ember trap is guaranteed fire.
    trap.kind=profile.id==="ash"&&index%2===0?"fire":profile.trapKinds[(index+salt)%profile.trapKinds.length];
    const roleScale=role==="crossroads"?.90:role==="alternate-route"?.94:role==="purposeful-dead-end"?1.08:1;
    trap.period=Math.round(profile.trapPeriod*roleScale);
    trap.phase=salt%Math.max(1,trap.period);
    trap.v142Zone=profile.id;trap.v142ZoneRouteRole=role;
    state.trapsTuned++;return trap;
  }
  function tuneHazard(hazard,profile,seed,worldState){
    if(!hazard)return hazard;
    const room=worldState?.rooms?.[hazard.roomId]||null,role=routeRole(room),salt=hash32(`${seed}|${hazard.id}|hazard|${role}`);
    const kinds=profile.id==="ash"?["embers","blade","embers"]:profile.id==="iron"?["blade","arrows","blade"]:profile.id==="bone"?["arrows","blade","arrows"]:profile.id==="sigil"?["arrows","embers","blade"]:["blade","arrows","embers"];
    hazard.type=kinds[salt%kinds.length];
    const base=profile.id==="ash"?2080:profile.id==="sigil"?1980:profile.id==="bone"?2220:profile.id==="iron"?2180:2450;
    hazard.period=Math.round(base*(role==="crossroads"?.92:1));
    hazard.warningMs=Math.max(600,Math.round(hazard.period*.32));
    hazard.activeMs=Math.max(500,Math.round(hazard.period*.27));
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
  function applyZoneGameplay(worldState,hostState,runState){
    if(!worldState||!hostState||!runState)return hostState;
    const floor=floorOf(runState),profile=profileForFloor(floor),seed=String(runState.seed||"CCG");
    for(const enemy of hostState.enemies||[]){tuneGuardian(enemy,profile);tuneEnemy(enemy,profile,seed,worldState)}
    (hostState.traps||[]).forEach((trap,index)=>tuneTrap(trap,index,profile,seed,worldState));
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
    ordinaryKind,tuneEnemy,tuneGuardian,tuneTrap,tuneHazard,tuneGenerator,encounterDirectives,applyZoneGameplay
  };
})();
