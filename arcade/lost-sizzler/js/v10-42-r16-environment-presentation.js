/* The Lost Sizzler V10.42 r16 — deterministic biome/environment presentation director. */
(()=>{
  "use strict";
  if(window.CCGLostSizzlerV142R16EnvironmentPresentation)return;

  const BIOMES=Object.freeze({
    threshold:Object.freeze({floor:["rain-dark stone","moss seams","shallow reflective puddles"],walls:["aged blockwork","wet mortar","iron drain channels"],dress:["broken carts","rope bundles","weathered crates","brazier cages"],light:{key:"cold overcast",fill:"warm torch pockets",shadowDepth:0.72},atmosphere:["fine rain","roof drips","ground mist"],weather:"rain",accent:"electric storm flash",silhouette:"broken battlements and drain arches"}),
    iron_keep:Object.freeze({floor:["worn flagstone","iron runners","scuffed guard lanes"],walls:["fortress ashlar","riveted braces","banner hooks"],dress:["weapon racks","tables","barrels","collapsed shields"],light:{key:"amber firelight",fill:"cool corridor spill",shadowDepth:0.78},atmosphere:["embers","dust motes","faint smoke"],weather:"interior-draught",accent:"forge pulse",silhouette:"tall doors, racks and crenellated arches"}),
    moss_crypt:Object.freeze({floor:["sunken tomb slabs","root-cracked stone","damp green seams"],walls:["lichen masonry","recessed sarcophagi","bone niches"],dress:["urns","candles","broken grave markers","bone piles"],light:{key:"sickly crypt glow",fill:"candle islands",shadowDepth:0.84},atmosphere:["spores","low vapour","falling grit"],weather:"crypt-damp",accent:"spectral bone glint",silhouette:"sarcophagi, roots and narrow burial arches"}),
    web_hollow:Object.freeze({floor:["dusty stone","silk mats","cocoon drag marks"],walls:["web-veiled masonry","egg clusters","silk-choked alcoves"],dress:["cocoons","web anchors","splintered furniture","hanging husks"],light:{key:"muted violet-blue",fill:"lantern remnants",shadowDepth:0.88},atmosphere:["floating silk","dust","tiny skitter motes"],weather:"still-air",accent:"web shimmer",silhouette:"hanging cocoons and radial web spokes"}),
    ember_depths:Object.freeze({floor:["charred basalt","heat-cracked tile","glowing fissures"],walls:["blackened stone","copper vents","slag shelves"],dress:["coal carts","cracked furnaces","ash bins","heat shields"],light:{key:"deep ember orange",fill:"dark red bounce",shadowDepth:0.8},atmosphere:["ash","heat haze","sparks"],weather:"thermal-draft",accent:"fissure flare",silhouette:"vents, furnace mouths and jagged rock"}),
    sigil_sanctum:Object.freeze({floor:["inlaid rune tile","polished dark stone","concentric sigil rings"],walls:["carved panels","arcane buttresses","sealed niches"],dress:["lecterns","ritual stands","floating shards","sealed reliquaries"],light:{key:"cyan-violet rune light",fill:"soft reflected glow",shadowDepth:0.68},atmosphere:["rune dust","slow motes","faint energy arcs"],weather:"arcane-static",accent:"sigil pulse",silhouette:"tall rune pillars and geometric arches"}),
    outdoor:Object.freeze({floor:["muddy path","grass tufts","wet flagstone"],walls:["ruined boundary stone","hedge breaks","timber palisade remnants"],dress:["fallen branches","road markers","supply sacks","broken fencing"],light:{key:"storm daylight",fill:"sky bounce",shadowDepth:0.6},atmosphere:["rain streaks","windblown leaves","ground spray"],weather:"storm",accent:"lightning wash",silhouette:"trees, ruins and distant towers"})
  });

  const ROOM_ROLE=Object.freeze({
    sanctuary:{density:0.72,contrast:0.62,props:["seating","storage","notice-board","specialist-workbench"],transition:"soft-safe-fade"},
    combat:{density:0.5,contrast:0.82,props:["cover","debris","impact-scars"],transition:"combat-vignette"},
    elite:{density:0.58,contrast:0.94,props:["arena-markers","destroyed-cover","elite-trophy"],transition:"elite-sting"},
    rare:{density:0.78,contrast:0.88,props:["ornate-cache","unique-statue","unusual-material"],transition:"rare-room-reveal"},
    secret:{density:0.7,contrast:0.76,props:["false-wall-seam","dust-free-track","concealed-lamp"],transition:"secret-reveal"},
    outdoor:{density:0.44,contrast:0.68,props:["vegetation","weather-cover","route-marker"],transition:"exterior-light-shift"}
  });

  function normaliseBiome(value=""){
    const v=String(value).toLowerCase();
    if(v.includes("web")||v.includes("spider"))return "web_hollow";
    if(v.includes("crypt")||v.includes("moss")||v.includes("bone"))return "moss_crypt";
    if(v.includes("ember")||v.includes("cinder"))return "ember_depths";
    if(v.includes("sigil")||v.includes("sanct"))return "sigil_sanctum";
    if(v.includes("iron")||v.includes("keep"))return "iron_keep";
    if(v.includes("outdoor")||v.includes("storm"))return "outdoor";
    return "threshold";
  }
  function hash(text){let h=2166136261;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
  function pick(list,seed,offset=0){return list[(seed+offset)%list.length]}
  function recipe(ctx={}){
    const biomeKey=normaliseBiome(ctx.biome||ctx.theme),biome=BIOMES[biomeKey];
    const roleKey=String(ctx.roomRole||"combat").toLowerCase();
    const role=ROOM_ROLE[roleKey]||ROOM_ROLE.combat;
    const seed=hash([ctx.floor||0,ctx.roomKey||"",biomeKey,roleKey,ctx.route||"main"].join("|"));
    const route=String(ctx.route||"main");
    const rare=Boolean(ctx.rare||roleKey==="rare"||roleKey==="secret"||route.includes("alternate"));
    const layers={
      floor:Object.freeze([pick(biome.floor,seed),pick(biome.floor,seed,1)]),
      walls:Object.freeze([pick(biome.walls,seed,2),pick(biome.walls,seed,3)]),
      foreground:Object.freeze([biome.silhouette,pick(biome.dress,seed,4)]),
      dressing:Object.freeze([...new Set([pick(biome.dress,seed,5),pick(biome.dress,seed,6),...role.props])])
    };
    const particles=biome.atmosphere.map((kind,index)=>Object.freeze({kind,density:Number((0.18+((seed>>(index*3))&7)/32).toFixed(2)),parallax:Number((0.35+index*0.17).toFixed(2))}));
    const feedback=Object.freeze({hit:"directional flash + debris flecks",projectile:"brief trail + contact spark",explosion:"radial debris + floor light pulse",interaction:"edge highlight + short material response",breakable:"material fragments + dust puff + settling pieces"});
    return Object.freeze({
      id:`presentation:${biomeKey}:${ctx.roomKey||seed.toString(16)}`,biome:biomeKey,roomRole:roleKey,seed,rare,route,
      layers:Object.freeze(layers),lighting:Object.freeze({...biome.light,contrast:role.contrast,occlusion:rare?"strong layered occlusion":"layered occlusion"}),
      particles:Object.freeze(particles),weather:biome.weather,accent:biome.accent,
      animation:Object.freeze({ambient:["subtle light flutter",biome.accent],environment:[`animated ${biome.weather}`,"small prop motion"],rateClass:"low-cost deterministic"}),
      depth:Object.freeze({floorRelief:true,wallInsets:true,foregroundOccluders:true,softContactShadows:true,parallaxLayers:3}),
      readability:Object.freeze({playerRimLight:true,enemyRimLight:true,projectileContrastBoost:true,hazardEdgeCue:true,eliteSilhouetteBoost:roleKey==="elite"}),
      feedback,transition:role.transition,dressingDensity:Number(Math.min(1,role.density+(rare?0.12:0)).toFixed(2)),
      renderOwnership:false,simulationOwnership:false,runtimeDependencies:Object.freeze([])
    });
  }

  window.CCGLostSizzlerV142R16EnvironmentPresentation=Object.freeze({version:"V10.42-r16",biomes:BIOMES,roomRoles:ROOM_ROLE,normaliseBiome,recipe});
})();
