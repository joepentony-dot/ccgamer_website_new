/* C64 Dungeon Carnage V10.42 r24 — deterministic biome room-grammar expansion.
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

  const BIOME_ORDER=["threshold","driveworks","iron","budget","cartridge","tapes","bone","demo","modem","sid","ash","foundry","scores","crt","citadel"];
  const FLOOR_GRAMMAR=Object.freeze({
    threshold:Object.freeze({
      identity:"RUINED APPROACH",routeMood:"exposed approach",
      landmarks:Object.freeze(["collapsed gate arch","flooded watch court","broken signal tower","rain-cut archive wall","overgrown supply yard"]),
      approach:Object.freeze(["follow the least flooded stone","use broken walls as route markers","watch for masonry hiding side passages"]),
      foreshadow:Object.freeze(["drive housings appear beneath the old archive","cable channels converge toward the machinery below","metal service plates replace the oldest stonework"])
    }),
    driveworks:Object.freeze({
      identity:"MECHANICAL SERVICE MAZE",routeMood:"machine-room junctions",
      landmarks:Object.freeze(["drive spindle bay","head-alignment bench","service gantry","disk-control alcove","cable trench crossing"]),
      approach:Object.freeze(["follow service rails between machine bays","use numbered drive housings as route markers","watch cable trenches for side-room junctions"]),
      foreshadow:Object.freeze(["riveted stonework thickens toward the keep","discarded armour fittings appear beside the machinery","service corridors end at fortified iron doors"])
    }),
    iron:Object.freeze({
      identity:"FORTRESS INTERIOR",routeMood:"military choke points",
      landmarks:Object.freeze(["riveted gatehouse","abandoned armoury rack","chain-lift junction","cold forge throat","bannerless guard station"]),
      approach:Object.freeze(["read doorways as defensive choke points","use iron runners to distinguish main routes","expect guarded routes near forge infrastructure"]),
      foreshadow:Object.freeze(["cheap stock crates appear behind sealed gates","yellow tally marks survive on requisition walls","supply tunnels widen toward the vaults below"])
    }),
    budget:Object.freeze({
      identity:"STOCKROOM VAULT NETWORK",routeMood:"packed storage lanes",
      landmarks:Object.freeze(["discount stock cage","sealed price vault","crate sorting bay","yellow ledger wall","bulk storage crossing"]),
      approach:Object.freeze(["use numbered stock bays to keep orientation","expect narrow lanes between storage chambers","check dead-end stockrooms for concealed routes"]),
      foreshadow:Object.freeze(["green cartridge sockets appear in reinforced walls","plastic cases replace paper stock labels","slot-shaped recesses mark the deeper descent"])
    }),
    cartridge:Object.freeze({
      identity:"SLOTSTONE CATACOMBS",routeMood:"socket-lined passages",
      landmarks:Object.freeze(["cartridge reliquary","slotstone gallery","ROM vault arch","green socket junction","sealed case chamber"]),
      approach:Object.freeze(["follow repeated socket markings along main routes","use cartridge galleries to distinguish major junctions","expect hidden rooms behind sealed case walls"]),
      foreshadow:Object.freeze(["violet tape labels appear among the cases","magnetic reels are stored in side vaults","archive numbering becomes less orderly below"])
    }),
    tapes:Object.freeze({
      identity:"MAGNETIC ARCHIVE LABYRINTH",routeMood:"repeating archive aisles",
      landmarks:Object.freeze(["tape rack maze","reel archive crossway","violet loading bay","duplicator room","magnetic store junction"]),
      approach:Object.freeze(["use reel colours and rack numbers as orientation marks","treat repeated aisles as a reason to check the map","follow loading bays toward larger junctions"]),
      foreshadow:Object.freeze(["moss appears behind the oldest tape shelving","stone burial marks show through damaged racks","cool mist leaks from lower archive passages"])
    }),
    bone:Object.freeze({
      identity:"DROWNED OSSUARY",routeMood:"burial maze",
      landmarks:Object.freeze(["root-split reliquary","sunken ossuary aisle","mossed sarcophagus row","candleless memorial vault","bone-marked crossing"]),
      approach:Object.freeze(["follow carved burial numbers through repeated chambers","treat root growth as a sign of older side routes","look for disturbed bone piles near useful passages"]),
      foreshadow:Object.freeze(["raster light flickers through cracks in the crypt","coloured test patterns mark repaired stone","electronic hum rises from the undercroft below"])
    }),
    demo:Object.freeze({
      identity:"RASTER UNDERCROFT",routeMood:"showcase chambers and side stages",
      landmarks:Object.freeze(["raster projection hall","scroll-text gallery","demo stage junction","copper timing room","colour-bar vault"]),
      approach:Object.freeze(["use animated light and stage markings to track major rooms","expect showcase chambers to branch into smaller routes","follow timing cables toward the main descent"]),
      foreshadow:Object.freeze(["carrier tones bleed through the masonry","terminal wiring replaces display cabling","cyan signal lamps point toward the warrens"])
    }),
    modem:Object.freeze({
      identity:"SIGNAL EXCHANGE WARRENS",routeMood:"communications junctions",
      landmarks:Object.freeze(["carrier exchange","dial bank chamber","terminal cross-connect","cyan relay trench","line-test alcove"]),
      approach:Object.freeze(["follow cable bundles between relay rooms","use signal lamps to identify active junctions","expect narrow service passages around larger exchanges"]),
      foreshadow:Object.freeze(["bass vibration rattles the relay covers","red furnace stone appears around signal conduits","sound channels grow wider toward the SID works"])
    }),
    sid:Object.freeze({
      identity:"RESONANT FURNACE",routeMood:"acoustic heat channels",
      landmarks:Object.freeze(["filter chamber","resonance gallery","waveform furnace","red oscillator vault","speaker-stone crossing"]),
      approach:Object.freeze(["follow resonant channels toward larger machinery","use waveform markings to distinguish repeated chambers","avoid confusing heat vents with traversable routes"]),
      foreshadow:Object.freeze(["ember deposits gather inside the lowest channels","scorched masonry replaces resonant stone","ash drifts upward from the depth below"])
    }),
    ash:Object.freeze({
      identity:"BURNING DEPTHS",routeMood:"industrial hazard network",
      landmarks:Object.freeze(["slag bridge","furnace spine","copper vent gallery","ash conveyor trench","cracked smelter chamber"]),
      approach:Object.freeze(["use vent direction to read the main route","expect exposed crossings around heat machinery","treat cooled slag lanes as safer navigation lines"]),
      foreshadow:Object.freeze(["pixel-grid press marks appear in cooled metal","square mould channels replace natural cracks","foundry machinery is audible beyond sealed walls"])
    }),
    foundry:Object.freeze({
      identity:"PIXEL PRESS WORKS",routeMood:"grid-aligned production halls",
      landmarks:Object.freeze(["sprite press","copper pixel mould","tile stamping line","palette furnace","grid calibration bay"]),
      approach:Object.freeze(["use floor grids to track direction through production halls","follow press lines toward major junctions","expect service rooms beside large stamping chambers"]),
      foreshadow:Object.freeze(["gold score plates appear among rejected tiles","numbered plaques replace production labels","crypt masonry returns beneath the factory floor"])
    }),
    scores:Object.freeze({
      identity:"GILDED SCORE CRYPT",routeMood:"trophy-lined burial routes",
      landmarks:Object.freeze(["high-score mausoleum","gilded initials wall","record vault","champion plinth crossing","score-table crypt"]),
      approach:Object.freeze(["use initials and score plaques as route markers","expect ceremonial dead ends around record chambers","follow repeated champion symbols toward central routes"]),
      foreshadow:Object.freeze(["green phosphor light leaks through sealed stone","curved glass fragments appear in side chambers","scanline patterns mark the route toward the CRT maze"])
    }),
    crt:Object.freeze({
      identity:"PHOSPHOR MAZE",routeMood:"screen-like recursive corridors",
      landmarks:Object.freeze(["phosphor chamber","scanline gallery","glass-tube junction","deflection coil vault","green raster crossing"]),
      approach:Object.freeze(["use scanline direction to distinguish parallel corridors","check the map often where chambers repeat","follow brighter phosphor marks toward major junctions"]),
      foreshadow:Object.freeze(["blood-red runes interrupt the green glow","obsidian masonry appears behind broken glass","all routes begin converging toward the Citadel"])
    }),
    citadel:Object.freeze({
      identity:"BLOOD CITADEL",routeMood:"fortified converging assault routes",
      landmarks:Object.freeze(["blood-rune gate","scarlet bastion","obsidian guard axis","final reliquary court","citadel throne approach"]),
      approach:Object.freeze(["read converging rune lines as the route toward the centre","expect defended junctions and fewer forgiving detours","use bastions and gate axes as fixed orientation marks"]),
      foreshadow:Object.freeze(["the recovered domains repeat across the final masonry","every major route points inward toward the last guardian","broken side passages leave the central assault route exposed"])
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
    if(FLOOR_GRAMMAR[raw])return raw;
    if(raw.includes("drive"))return"driveworks";
    if(raw.includes("iron")||raw.includes("keep"))return"iron";
    if(raw.includes("budget"))return"budget";
    if(raw.includes("cartridge"))return"cartridge";
    if(raw.includes("tape"))return"tapes";
    if(raw.includes("bone")||raw.includes("moss"))return"bone";
    if(raw.includes("demo"))return"demo";
    if(raw.includes("modem"))return"modem";
    if(raw.includes("sid"))return"sid";
    if(raw.includes("ash")||raw.includes("ember"))return"ash";
    if(raw.includes("foundry")||raw.includes("pixel"))return"foundry";
    if(raw.includes("score"))return"scores";
    if(raw.includes("crt")||raw.includes("phosphor"))return"crt";
    if(raw.includes("citadel")||raw.includes("blood")||raw.includes("sigil")||raw.includes("sanct"))return"citadel";
    if(raw.includes("crypt"))return floor>=13?"scores":floor>=7?"bone":"threshold";
    return BIOME_ORDER[floor-1]||"threshold";
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
