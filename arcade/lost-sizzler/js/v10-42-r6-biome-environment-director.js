/* The Lost Sizzler V10.42 r6 — deterministic biome/environment director.
 * Presentation-first: derives all room dressing from run seed, floor and room id.
 * Does not alter movement, combat, saves, network authority or progression locks.
 */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V142_R6_BIOME_ENVIRONMENT_DIRECTOR__)return;
  window.__CCG_LOST_SIZZLER_V142_R6_BIOME_ENVIRONMENT_DIRECTOR__=true;

  const C=window.CCG_CONFIG,W=window.CCGWorld;
  if(!C||!W||typeof W.createHostState!=="function")return;

  const BIOMES={
    threshold:{id:"threshold",name:"RUINED THRESHOLD",material:"weathered flagstone",weather:"rain",accent:"108,206,178",shadow:.18,motes:"rain"},
    iron:{id:"iron",name:"IRON KEEP",material:"riveted keepstone",weather:"draft",accent:"207,137,76",shadow:.26,motes:"sparks"},
    bone:{id:"bone",name:"MOSS CRYPT",material:"crypt limestone",weather:"crypt-mist",accent:"122,176,105",shadow:.31,motes:"mist"},
    ash:{id:"ash",name:"EMBER DEPTHS",material:"scorched basalt",weather:"ashfall",accent:"255,103,52",shadow:.25,motes:"embers"},
    sigil:{id:"sigil",name:"SIGIL SANCTUM",material:"rune-cut obsidian",weather:"arcane-dust",accent:"176,104,255",shadow:.29,motes:"sigils"}
  };
  const state={profiles:0,tileFrames:0,atmosphereFrames:0,lastFloor:0,lastBiome:"",installed:{host:false,tile:false,view:false}};
  const num=(v,f=0)=>{const n=Number(v);return Number.isFinite(n)?n:f};
  const currentRun=()=>{try{return typeof run!=="undefined"?run:null}catch(_){return null}};
  const currentWorld=()=>{try{return typeof world!=="undefined"?world:null}catch(_){return null}};
  const currentHost=()=>{try{return typeof host!=="undefined"?host:null}catch(_){return null}};
  const currentFloor=()=>Math.max(1,Math.min(C.maxFloors||5,Math.floor(num(currentRun()?.floor,1))));
  const currentSeed=()=>String(currentRun()?.seed||"lost-sizzler");
  const reduced=()=>document.body?.classList?.contains("ccg-reduced-motion")||(()=>{try{return matchMedia("(prefers-reduced-motion: reduce)").matches}catch(_){return false}})();
  const performanceTier=()=>String(document.body?.dataset?.v141R47PerformanceTier||"normal");
  const constrained=()=>performanceTier()!=="normal";
  const severe=()=>performanceTier()==="severe";

  function hash32(value){let h=2166136261>>>0;for(const ch of String(value||"")){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}h+=h<<13;h^=h>>>7;h+=h<<3;h^=h>>>17;h+=h<<5;return h>>>0}
  const unit=value=>hash32(value)/4294967296;
  const floorId=floor=>C.proceduralDungeon?.campaignFloors?.find(row=>Number(row.floor)===floor)?.id||["threshold","iron","bone","ash","sigil"][floor-1]||"threshold";
  const floorBiome=floor=>BIOMES[floorId(floor)]||BIOMES.threshold;

  function roomRole(room,worldState,hostState){
    if(!room)return"corridor";
    if(room.id===worldState?.startRoomId)return"arrival";
    if(room.id===worldState?.exitRoomId)return"exit";
    if(room.spiderNest||Number(hostState?.spiderNest?.roomId)===room.id)return"web-nest";
    if(room.skeletonHorde||Number(hostState?.skeletonHorde?.roomId)===room.id)return"ossuary";
    if(room.sanctuary)return"sanctuary";
    if(room.traderRoom||Number(hostState?.trader?.roomId)===room.id||Number(hostState?.startShop?.roomId)===room.id)return"trader";
    if(room.sigilRoom||Number(hostState?.sigilRoomId)===room.id)return"sigil";
    if(room.grandHall)return"great-hall";
    if(room.memoryPuzzleRoom||room.sequenceTorchRoom||room.weightBridgeRoom)return"puzzle";
    if(room.dedicatedHazard||room.dangerous)return"hazard";
    if(room.optional)return"secret";
    return"chamber";
  }

  function rareRoleForRoom(room,worldState){
    const variety=worldState?.dungeonVariety;if(!variety||!room)return"";
    const inside=q=>q&&q.x>=room.x&&q.x<=room.x+room.w&&q.y>=room.y&&q.y<=room.y+room.h;
    if((variety.greatHalls||[]).some(part=>(part.cells||[]).some(inside)))return"great-hall";
    if((variety.shortcuts||[]).some(part=>(part.cells||[]).some(inside)))return"shortcut-junction";
    if((variety.parallelLoops||[]).some(part=>(part.cells||[]).some(inside)))return"alternate-route";
    if((variety.alcoves||[]).some(part=>(part.cells||[]).some(inside)))return"hidden-alcove";
    return"";
  }

  function profileRoom(room,worldState,hostState,runState){
    const floor=Math.max(1,Math.min(C.maxFloors||5,Math.floor(num(runState?.floor,1)))),biome=floorBiome(floor),role=roomRole(room,worldState,hostState),rareRole=rareRoleForRoom(room,worldState),seedKey=`${runState?.seed||"lost-sizzler"}|F${floor}|R${room.id}|${role}|${rareRole}`;
    const variants={
      threshold:["collapsed-courtyard","rain-slick-archive","broken-battlement","overgrown-entry"],
      iron:["chain-gallery","riveted-barracks","forge-annex","armour-vault"],
      bone:["moss-ossuary","sunken-crypt","bone-aisle","rooted-tomb"],
      ash:["ember-foundry","charred-vault","lava-drain","smoke-gallery"],
      sigil:["rune-vault","violet-sanctum","archive-apse","astral-gallery"]
    };
    let variant=(variants[biome.id]||variants.threshold)[hash32(seedKey)%4];
    if(role==="web-nest")variant="web-choked-nest";
    if(role==="ossuary")variant="bone-ossuary";
    if(role==="sanctuary")variant=`${biome.id}-sanctuary`;
    if(role==="secret"||rareRole)variant=rareRole||`${biome.id}-secret`;
    const profile={version:"V10.42-r6",floor,biome:biome.id,biomeName:biome.name,material:biome.material,weather:biome.weather,motes:biome.motes,accent:biome.accent,role,rareRole,variant,dressingSeed:hash32(seedKey),density:.42+unit(`${seedKey}|density`)*.34,shadow:Math.min(.42,biome.shadow+unit(`${seedKey}|shadow`)*.07),animationPhase:unit(`${seedKey}|phase`)*Math.PI*2};
    room.v142Environment=profile;room.v142EnvironmentVariant=variant;state.profiles++;return profile;
  }

  function applyEnvironment(worldState,hostState,runState=currentRun()){
    if(!worldState?.rooms||!hostState||!runState)return hostState;
    const floor=Math.max(1,Math.min(C.maxFloors||5,Math.floor(num(runState.floor,1)))),biome=floorBiome(floor),profiles=[];
    for(const room of worldState.rooms)profiles.push(profileRoom(room,worldState,hostState,runState));
    hostState.v142Environment={version:"V10.42-r6",floor,floorId:floorId(floor),biome:biome.id,biomeName:biome.name,weather:biome.weather,motes:biome.motes,accent:biome.accent,seedKey:`${runState.seed||"lost-sizzler"}|F${floor}|ENV-R6`,roomProfiles:profiles.map((p,index)=>({roomId:worldState.rooms[index]?.id,role:p.role,rareRole:p.rareRole,variant:p.variant,dressingSeed:p.dressingSeed}))};
    state.lastFloor=floor;state.lastBiome=biome.id;return hostState;
  }

  const baseCreateHostState=W.createHostState.bind(W);
  W.createHostState=function createHostStateV142R6Environment(worldState){const hostState=baseCreateHostState(worldState);return applyEnvironment(worldState,hostState,currentRun())};
  state.installed.host=true;

  function screenFor(x,y){try{return typeof ws==="function"?ws(x,y):null}catch(_){return null}}
  function profileAt(x,y){try{const worldState=currentWorld(),roomId=W.roomAt(worldState,x,y),room=worldState?.rooms?.[roomId];return room?.v142Environment||null}catch(_){return null}}
  function drawFloorDressing(x,y,profile,h,s){
    if(typeof ctx==="undefined"||!s||!profile)return;
    const tile=num(C.tile,42),wall=currentWorld()?.map?.[y]?.[x]!==0,t=performance.now()/1000+profile.animationPhase;
    ctx.save();
    if(wall){
      if(profile.biome==="iron"&&h%7===0){ctx.strokeStyle="rgba(216,166,100,.30)";ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(s.x+8,s.y+5);ctx.lineTo(s.x+8,s.y+tile-6);ctx.moveTo(s.x+tile-9,s.y+5);ctx.lineTo(s.x+tile-9,s.y+tile-6);ctx.stroke();ctx.fillStyle="rgba(230,190,120,.38)";ctx.fillRect(s.x+6,s.y+8,4,4);ctx.fillRect(s.x+tile-11,s.y+tile-12,4,4)}
      else if(profile.biome==="bone"&&h%6===0){ctx.strokeStyle="rgba(172,196,143,.24)";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(s.x+4,s.y+tile-4);ctx.quadraticCurveTo(s.x+tile*.35,s.y+tile*.35,s.x+tile-5,s.y+7);ctx.stroke()}
      else if(profile.biome==="ash"&&h%5===0){ctx.fillStyle="rgba(255,91,38,.18)";ctx.fillRect(s.x+5+(h%11),s.y+tile-7,8+(h%9),2);if(!constrained()){ctx.shadowColor="rgba(255,91,38,.65)";ctx.shadowBlur=7;ctx.fillStyle="rgba(255,165,74,.35)";ctx.fillRect(s.x+9+(h%17),s.y+tile-8,2,2)}}
      else if(profile.biome==="sigil"&&h%8===0){ctx.strokeStyle="rgba(196,125,255,.28)";ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(s.x+tile/2,s.y+7);ctx.lineTo(s.x+tile-8,s.y+tile/2);ctx.lineTo(s.x+tile/2,s.y+tile-7);ctx.lineTo(s.x+8,s.y+tile/2);ctx.closePath();ctx.stroke()}
      if(profile.role==="web-nest"&&h%3===0){ctx.strokeStyle="rgba(232,237,246,.38)";ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(s.x+2,s.y+3);ctx.quadraticCurveTo(s.x+tile*.5,s.y+tile*.2,s.x+tile-3,s.y+tile*.55);ctx.moveTo(s.x+3,s.y+tile-3);ctx.quadraticCurveTo(s.x+tile*.6,s.y+tile*.55,s.x+tile-4,s.y+5);ctx.stroke()}
      ctx.restore();return;
    }
    if(profile.biome==="threshold"){
      if(h%7===0){ctx.fillStyle="rgba(80,136,122,.15)";ctx.beginPath();ctx.ellipse(s.x+8+(h%22),s.y+9+((h>>>6)%18),7+(h%5),3+(h%3),0,0,Math.PI*2);ctx.fill()}
      if(h%11===0){ctx.strokeStyle="rgba(174,219,214,.17)";ctx.beginPath();ctx.moveTo(s.x+5,s.y+tile-8);ctx.lineTo(s.x+tile-6,s.y+tile-10);ctx.stroke()}
    }else if(profile.biome==="iron"){
      if(h%6===0){ctx.strokeStyle="rgba(208,151,87,.22)";ctx.lineWidth=1;ctx.strokeRect(s.x+6,s.y+6,tile-12,tile-12);ctx.fillStyle="rgba(232,191,126,.28)";for(const [dx,dy] of [[7,7],[tile-10,7],[7,tile-10],[tile-10,tile-10]])ctx.fillRect(s.x+dx,s.y+dy,2,2)}
    }else if(profile.biome==="bone"){
      if(h%5===0){ctx.fillStyle="rgba(179,194,151,.13)";ctx.beginPath();ctx.ellipse(s.x+tile*.5,s.y+tile*.58,12+(h%6),5+(h%3),((h>>>4)%5)*.2,0,Math.PI*2);ctx.fill()}
      if((profile.role==="ossuary"||h%13===0)){ctx.strokeStyle="rgba(231,220,178,.25)";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(s.x+9,s.y+tile*.5);ctx.lineTo(s.x+tile-9,s.y+tile*.5);ctx.stroke();ctx.fillStyle="rgba(231,220,178,.28)";ctx.beginPath();ctx.arc(s.x+9,s.y+tile*.5,3,0,Math.PI*2);ctx.arc(s.x+tile-9,s.y+tile*.5,3,0,Math.PI*2);ctx.fill()}
    }else if(profile.biome==="ash"){
      if(h%4===0){ctx.strokeStyle=`rgba(255,86,35,${.12+.06*Math.sin(t+h)})`;ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(s.x+5,s.y+10+(h%8));ctx.lineTo(s.x+tile*.45,s.y+tile*.55);ctx.lineTo(s.x+tile-6,s.y+tile-9);ctx.stroke()}
    }else if(profile.biome==="sigil"){
      if(h%5===0){ctx.strokeStyle="rgba(187,114,255,.19)";ctx.lineWidth=1;ctx.beginPath();ctx.arc(s.x+tile/2,s.y+tile/2,9+(h%5),0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.moveTo(s.x+tile/2,s.y+7);ctx.lineTo(s.x+tile-8,s.y+tile-9);ctx.lineTo(s.x+8,s.y+tile-9);ctx.closePath();ctx.stroke()}
    }
    if(profile.role==="web-nest"&&h%2===0){ctx.strokeStyle="rgba(235,239,247,.28)";ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(s.x+2,s.y+3);ctx.quadraticCurveTo(s.x+tile*.45,s.y+tile*.55,s.x+tile-3,s.y+8);ctx.moveTo(s.x+4,s.y+tile-3);ctx.quadraticCurveTo(s.x+tile*.55,s.y+tile*.35,s.x+tile-5,s.y+5);ctx.stroke()}
    if(profile.rareRole&&h%3===0){ctx.strokeStyle="rgba(255,216,90,.18)";ctx.lineWidth=1;ctx.strokeRect(s.x+4,s.y+4,tile-8,tile-8)}
    ctx.restore();
  }

  function installTileWrapper(){
    const base=window.drawTile;if(typeof base!=="function")return false;if(base.__ccgV142R6Environment)return true;
    const wrapped=function drawTileV142R6(x,y){const result=base.apply(this,arguments);try{const profile=profileAt(x,y),s=screenFor(x,y);if(profile&&s){const h=hash32(`${profile.dressingSeed}|${x},${y}`);if(unit(`${h}|draw`)<=profile.density+.22)drawFloorDressing(x,y,profile,h,s);state.tileFrames++}}catch(_){}return result};
    wrapped.__ccgV142R6Environment=true;wrapped.__ccgOriginal=base;window.drawTile=wrapped;state.installed.tile=true;return true;
  }

  function drawAtmosphere(p,v){
    if(severe()||reduced()||typeof ctx==="undefined"||!v)return;
    const hostState=currentHost(),env=hostState?.v142Environment;if(!env)return;
    const now=performance.now(),seed=hash32(env.seedKey),count=constrained()?5:12,accent=env.accent||"160,120,255";
    ctx.save();ctx.beginPath();ctx.rect(v.x,v.y,v.w,v.h);ctx.clip();
    if(env.weather==="rain"){
      ctx.strokeStyle="rgba(174,224,235,.18)";ctx.lineWidth=1;for(let i=0;i<count;i++){const x=v.x+((seed+i*97+now*.085)%Math.max(1,v.w+40))-20,y=v.y+((seed+i*53+now*.19)%Math.max(1,v.h+50))-25;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-7,y+17);ctx.stroke()}
    }else if(env.weather==="crypt-mist"){
      for(let i=0;i<Math.max(3,Math.floor(count/2));i++){const x=v.x+((seed+i*137+now*.018)%Math.max(1,v.w+100))-50,y=v.y+v.h*(.55+.32*((i%3)/2));const g=ctx.createRadialGradient(x,y,5,x,y,80+i*12);g.addColorStop(0,"rgba(132,165,122,.045)");g.addColorStop(1,"rgba(70,88,68,0)");ctx.fillStyle=g;ctx.fillRect(x-110,y-55,220,110)}
    }else if(env.weather==="ashfall"||env.weather==="arcane-dust"||env.weather==="draft"){
      for(let i=0;i<count;i++){const phase=(seed+i*83)%1000,x=v.x+((phase+now*(env.weather==="draft"?.035:.018)+i*31)%Math.max(1,v.w)),y=v.y+((phase*.7+now*(env.weather==="ashfall"?.05:.025)+i*47)%Math.max(1,v.h)),size=env.weather==="arcane-dust"?2:1;ctx.fillStyle=env.weather==="ashfall"?"rgba(255,126,57,.32)":env.weather==="draft"?"rgba(213,179,126,.16)":`rgba(${accent},.28)`;ctx.fillRect(Math.round(x),Math.round(y),size,size)}
    }
    ctx.restore();state.atmosphereFrames++;
  }

  function installViewWrapper(){
    const base=window.renderView;if(typeof base!=="function")return false;if(base.__ccgV142R6Environment)return true;
    const wrapped=function renderViewV142R6(p,v){const result=base.apply(this,arguments);try{drawAtmosphere(p,v)}catch(_){}return result};
    wrapped.__ccgV142R6Environment=true;wrapped.__ccgOriginal=base;window.renderView=wrapped;state.installed.view=true;return true;
  }

  function installRenderers(){installTileWrapper();installViewWrapper();return state.installed.tile&&state.installed.view}
  installRenderers();
  addEventListener("ccg:v142-ready",()=>{installRenderers();const w=currentWorld(),h=currentHost(),r=currentRun();if(w&&h&&r&&!h.v142Environment)applyEnvironment(w,h,r)},{once:false});
  document.addEventListener("ccg:floor-start",()=>{const w=currentWorld(),h=currentHost(),r=currentRun();if(w&&h&&r)applyEnvironment(w,h,r);installRenderers()});

  window.CCGLostSizzlerV142R6BiomeEnvironmentDirector={version:"V10.42-r6",BIOMES,applyEnvironment,profileRoom,installRenderers,get state(){return state}};
})();