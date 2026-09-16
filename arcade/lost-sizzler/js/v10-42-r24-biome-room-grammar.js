/* The Lost Sizzler V10.42 r24 — deterministic biome room-grammar expansion.
 * Semantic metadata only: consumes R6 environment and R7 objective output to give each
 * campaign depth stronger room identity, landmarks, route intent and foreshadowing.
 * Does not alter map topology, collision, combat, input, saves, networking or progression.
 */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V142_R24_BIOME_ROOM_GRAMMAR__)return;
  window.__CCG_LOST_SIZZLER_V142_R24_BIOME_ROOM_GRAMMAR__=true;

  const C=window.CCG_CONFIG,W=window.CCGWorld;
  if(!C||!W||typeof W.createHostState!=="function")return;

  const BIOME_ORDER=["threshold","iron","bone","ash","sigil"];
  const FLOOR_GRAMMAR=Object.freeze({
    threshold:Object.freeze({
      identity:"RUINED APPROACH",
      routeMood:"exposed approach",
      landmarks:Object.freeze(["collapsed gate arch","flooded watch court","broken signal tower","rain-cut archive wall","overgrown supply yard"]),
      approach:Object.freeze(["follow the least flooded stone","use broken walls as route markers","watch for masonry hiding side passages"]),
      foreshadow:Object.freeze(["iron brackets point toward the keep below","old key marks survive on the gate stones","drain channels converge toward the descent"])
    }),
    iron:Object.freeze({
      identity:"FORTRESS INTERIOR",
      routeMood:"military choke points",
      landmarks:Object.freeze(["riveted gatehouse","abandoned armoury rack","chain-lift junction","cold forge throat","bannerless guard station"]),
      approach:Object.freeze(["read doorways as defensive choke points","use iron runners to distinguish main routes","expect guarded routes near forge infrastructure"]),
      foreshadow:Object.freeze(["bone charms appear among confiscated gear","crypt dust gathers in unused guard rooms","old burial seals have been bolted over"])
    }),
    bone:Object.freeze({
      identity:"DROWNED OSSUARY",
      routeMood:"burial maze",
      landmarks:Object.freeze(["root-split reliquary","sunken ossuary aisle","mossed sarcophagus row","candleless memorial vault","bone-marked crossing"]),
      approach:Object.freeze(["follow carved burial numbers through repeated chambers","treat root growth as a sign of older side routes","look for disturbed bone piles near useful passages"]),
      foreshadow:Object.freeze(["warm soot stains appear where no candles burn","sealed vents breathe dry heat from below","charred offerings mark the route toward Ember Depths"])
    }),
    ash:Object.freeze({
      identity:"BURNING WORKS",
      routeMood:"industrial hazard network",
      landmarks:Object.freeze(["slag bridge","furnace spine","copper vent gallery","ash conveyor trench","cracked smelter chamber"]),
      approach:Object.freeze(["use vent direction to read the main route","expect exposed crossings around heat machinery","treat cooled slag lanes as safer navigation lines"]),
      foreshadow:Object.freeze(["violet symbols survive beneath the soot","rune-cut stone appears inside furnace repairs","arcane seals have been heated but not destroyed"])
    }),
    sigil:Object.freeze({
      identity:"RITUAL CORE",
      routeMood:"converging ritual geometry",
      landmarks:Object.freeze(["concentric rune dais","sealed reliquary axis","violet archive apse","floating shard gallery","three-key ritual gate"]),
      approach:Object.freeze(["read repeated sigils as orientation marks","expect routes to converge toward ritual axes","use intact rune lines to distinguish deliberate paths from dead ends"]),
      foreshadow:Object.freeze(["all three recovered domains are represented in the masonry","the final chambers repeat symbols seen across earlier depths","broken routes now point inward rather than downward"])
    })
  });

  const ROLE_GRAMMAR=Object.freeze({
    arrival:Object.freeze({archetype:"orientation chamber",routeIntent:"orient",landmarkPrefix:"entry marker"}),
    exit:Object.freeze({archetype:"descent threshold",routeIntent:"descend",landmarkPrefix:"descent marker"}),
    sanctuary:Object.freeze({archetype:"safe refuge",routeIntent:"recover",landmarkPrefix:"refuge marker"}),
    trader:Object.freeze({archetype:"supply stop",routeIntent:"resupply",landmarkPrefix:"merchant marker"}),
    "web-nest":Object.freeze({archetype:"infested nest",routeIntent:"purge",landmarkPrefix:"web anchor"}),
    ossuary:Object.freeze({archetype:"burial stronghold",routeIntent:"break-guard",landmarkPrefix:"bone totem"}),
    sigil:Object.freeze({archetype:"ritual chamber",routeIntent:"ritual",landmarkPrefix:"rune focus"}),
    "great-hall":Object.freeze({archetype:"major set-piece hall",routeIntent:"confront",landmarkPrefix:"hall centrepiece"}),
    puzzle:Object.freeze({archetype:"mechanism chamber",routeIntent:"solve",landmarkPrefix:"device focus"}),
    hazard:Object.freeze({archetype:"hazard crossing",routeIntent:"cross",landmarkPrefix:"hazard marker"}),
    secret:Object.freeze({archetype:"concealed reward room",routeIntent:"discover",landmarkPrefix:"hidden landmark"}),
    chamber:Object.freeze({archetype:"route chamber",routeIntent:"advance",landmarkPrefix:"room landmark"}),
    corridor:Object.freeze({archetype:"connector route",routeIntent:"navigate",landmarkPrefix:"route marker"})
  });

  const RARE_GRAMMAR=Object.freeze({
    "great-hall":Object.freeze({archetype:"major set-piece hall",routeIntent:"confront"}),
    "shortcut-junction":Object.freeze({archetype:"shortcut junction",routeIntent:"unlock-shortcut"}),
    "alternate-route":Object.freeze({archetype:"risk-reward side route",routeIntent:"choose-route"}),
    "hidden-alcove":Object.freeze({archetype:"concealed alcove",routeIntent:"search"})
  });

  const state={installed:false,applications:0,rooms:0,lastFloor:0,lastBiome:""};
  const num=(value,fallback=0)=>{const parsed=Number(value);return Number.isFinite(parsed)?parsed:fallback};
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
  const currentRun=()=>{try{return typeof run!=="undefined"?run:null}catch(_){return null}};

  function hash32(value){let h=2166136261>>>0;for(const ch of String(value||"")){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}h+=h<<13;h^=h>>>7;h+=h<<3;h^=h>>>17;h+=h<<5;return h>>>0}
  const pick=(rows,key)=>rows[hash32(key)%rows.length];
  const floorNumber=runState=>clamp(Math.floor(num(runState?.floor,1)),1,C.maxFloors||5);
  const configuredFloorId=floor=>String(C.proceduralDungeon?.campaignFloors?.find(row=>Number(row.floor)===floor)?.id||"");

  function normaliseBiome(value,floor=1){
    const raw=String(value||configuredFloorId(floor)||BIOME_ORDER[floor-1]||"threshold").toLowerCase();
    if(raw.includes("iron")||raw.includes("keep"))return"iron";
    if(raw.includes("bone")||raw.includes("crypt")||raw.includes("moss"))return"bone";
    if(raw.includes("ash")||raw.includes("ember"))return"ash";
    if(raw.includes("sigil")||raw.includes("sanct"))return"sigil";
    return"threshold";
  }

  function roleFor(room){return String(room?.v142Environment?.role||"chamber")}
  function rareRoleFor(room){return String(room?.v142Environment?.rareRole||"")}

  function grammarForRoom(room,worldState,hostState,runState){
    const floor=floorNumber(runState),env=room?.v142Environment||{},biome=normaliseBiome(env.biome,floor),floorGrammar=FLOOR_GRAMMAR[biome]||FLOOR_GRAMMAR.threshold;
    const role=roleFor(room),rareRole=rareRoleFor(room),roleGrammar=RARE_GRAMMAR[rareRole]||ROLE_GRAMMAR[role]||ROLE_GRAMMAR.chamber;
    const objective=room?.v142Objective||{},objectiveType=String(objective.type||""),objectiveTitle=String(objective.title||"");
    const seedKey=`${runState?.seed||"lost-sizzler"}|F${floor}|R${room?.id??0}|${biome}|${role}|${rareRole}|${objectiveType}|R24`;
    const baseLandmark=pick(floorGrammar.landmarks,`${seedKey}|landmark`),approachCue=pick(floorGrammar.approach,`${seedKey}|approach`),foreshadowing=pick(floorGrammar.foreshadow,`${seedKey}|foreshadow`);
    const landmark=["arrival","exit","sanctuary","trader","web-nest","ossuary","sigil","puzzle","hazard","secret"].includes(role)||rareRole?`${roleGrammar.landmarkPrefix||ROLE_GRAMMAR.chamber.landmarkPrefix}: ${baseLandmark}`:baseLandmark;
    const routeIntent=String(roleGrammar.routeIntent||ROLE_GRAMMAR.chamber.routeIntent),archetype=String(roleGrammar.archetype||ROLE_GRAMMAR.chamber.archetype);
    const objectiveCue=objectiveTitle?`${objectiveTitle} · ${routeIntent}`:routeIntent;
    const grammar=Object.freeze({
      version:"V10.42-r24",floor,biome,biomeIdentity:floorGrammar.identity,roomId:room?.id??0,role,rareRole,
      archetype,landmark,routeIntent,routeMood:floorGrammar.routeMood,approachCue,foreshadowing,objectiveType,objectiveCue,
      variant:String(env.variant||""),dressingSeed:Number(env.dressingSeed||hash32(seedKey)),grammarSeed:hash32(seedKey),
      simulationOwnership:false,collisionOwnership:false,progressionOwnership:false,saveOwnership:false,networkOwnership:false
    });
    return grammar;
  }

  function applyGrammar(worldState,hostState,runState=currentRun()){
    if(!worldState?.rooms||!hostState||!runState)return hostState;
    const floor=floorNumber(runState),sampleRoom=worldState.rooms.find(Boolean),biome=normaliseBiome(sampleRoom?.v142Environment?.biome,floor),floorGrammar=FLOOR_GRAMMAR[biome]||FLOOR_GRAMMAR.threshold,plans=[];
    for(const room of worldState.rooms){
      if(!room)continue;
      const grammar=grammarForRoom(room,worldState,hostState,runState);
      room.v142RoomGrammar=grammar;
      if(room.v142Environment)room.v142Environment.roomGrammar=grammar;
      plans.push({roomId:grammar.roomId,role:grammar.role,rareRole:grammar.rareRole,archetype:grammar.archetype,landmark:grammar.landmark,routeIntent:grammar.routeIntent,objectiveType:grammar.objectiveType,grammarSeed:grammar.grammarSeed});
      state.rooms+=1;
    }
    hostState.v142RoomGrammar=Object.freeze({
      version:"V10.42-r24",floor,biome,identity:floorGrammar.identity,routeMood:floorGrammar.routeMood,
      seedKey:`${runState.seed||"lost-sizzler"}|F${floor}|ROOM-GRAMMAR-R24`,plans:Object.freeze(plans)
    });
    state.applications+=1;state.lastFloor=floor;state.lastBiome=biome;
    return hostState;
  }

  const baseCreateHostState=W.createHostState.bind(W);
  W.createHostState=function createHostStateV142R24RoomGrammar(worldState){
    const hostState=baseCreateHostState(worldState);
    return applyGrammar(worldState,hostState,currentRun());
  };
  state.installed=true;

  window.CCGLostSizzlerV142R24BiomeRoomGrammar=Object.freeze({
    version:"V10.42-r24",FLOOR_GRAMMAR,ROLE_GRAMMAR,RARE_GRAMMAR,normaliseBiome,grammarForRoom,applyGrammar,get state(){return state}
  });
})();