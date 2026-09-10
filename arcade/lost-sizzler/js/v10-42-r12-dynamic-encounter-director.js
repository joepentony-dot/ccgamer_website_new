/* The Lost Sizzler V10.42 r12 — deterministic biome elite and dynamic encounter director.
 * Adds room-level encounter direction, elite identities, risk/reward pressure and
 * rare-route event hooks without owning AI ticks, movement, rendering, networking or storage.
 */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V142_R12_DYNAMIC_ENCOUNTER_DIRECTOR__)return;
  window.__CCG_LOST_SIZZLER_V142_R12_DYNAMIC_ENCOUNTER_DIRECTOR__=true;

  const R7=window.CCGLostSizzlerV142R7RoomObjectiveDirector,W=window.CCGWorld;
  if(!R7||!W||typeof W.createHostState!=="function")return;

  const ELITES=Object.freeze({
    threshold:{id:"rain-reaver",name:"RAIN REAVER",trait:"rush-and-flank",event:"storm-ambush"},
    "iron-keep":{id:"iron-warden",name:"IRON WARDEN",trait:"armoured-advance",event:"keep-reinforcements"},
    "moss-crypt":{id:"ossuary-captain",name:"OSSUARY CAPTAIN",trait:"bone-rally",event:"bone-wake"},
    "ember-depths":{id:"cinder-brute",name:"CINDER BRUTE",trait:"hazard-pressure",event:"ember-surge"},
    "sigil-sanctum":{id:"rune-sentinel",name:"RUNE SENTINEL",trait:"arcane-zones",event:"rune-lock"},
    web:{id:"brood-matriarch",name:"BROOD MATRIARCH",trait:"web-control",event:"web-descent"},
    crypt:{id:"bone-marshal",name:"BONE MARSHAL",trait:"skeleton-command",event:"bone-wake"}
  });
  const state={installed:false,rooms:new Map(),eliteRooms:0,eventRooms:0};
  const hash32=R7.hash32;
  const clamp=(v,min,max)=>Math.max(min,Math.min(max,Number(v)||0));

  function roomKey(plan){return String(plan?.saveKey||`v142-r12:F${plan?.floor||1}:R${plan?.roomId||0}`)}
  function eliteFamily(plan){
    const role=String(plan?.role||plan?.environment?.role||"").toLowerCase(),biome=String(plan?.biome||plan?.environment?.biome||"threshold").toLowerCase();
    if(/web|spider|cocoon|brood/.test(`${role} ${plan?.objective?.type||""}`))return "web";
    if(/crypt|ossuary|bone|skeleton|burial/.test(`${role} ${plan?.objective?.type||""}`))return "crypt";
    return biome;
  }
  function pressureFor(plan){
    const risk=clamp(plan?.objective?.risk||1,1,5),rare=Boolean(plan?.rareRole||plan?.objective?.routeBonus),hall=Boolean(plan?.grandHall||plan?.role==="great-hall");
    return clamp(risk+(rare?1:0)+(hall?1:0),1,5);
  }
  function buildEncounter(plan){
    const key=roomKey(plan),family=eliteFamily(plan),pressure=pressureFor(plan),seed=hash32(`${key}|${family}|encounter`),eliteBase=ELITES[family]||ELITES.threshold;
    const objectiveElite=Boolean(plan?.objective?.elite),rare=Boolean(plan?.rareRole||plan?.objective?.routeBonus),hall=Boolean(plan?.grandHall||plan?.role==="great-hall");
    const elite=objectiveElite||hall||pressure>=4||rare&&((seed>>>3)%3===0);
    const waves=clamp(1+Math.floor((pressure-1)/2)+(elite?1:0),1,3),reinforcements=elite&&pressure>=4?1+(seed%2):0;
    const trigger=rare?"route-commit":plan?.objective?.optional?"objective-interact":"room-entry";
    const rewardBoost=clamp((plan?.objective?.rewardTier||1)+(elite?1:0)+(rare?1:0),1,4);
    const eventKind=family==="web"?"web-descent":family==="crypt"?"bone-wake":eliteBase.event;
    const event=Object.freeze({kind:eventKind,trigger,intensity:pressure,token:hash32(`${key}|${eventKind}|event`).toString(16),oneShot:true});
    const eliteSpec=elite?Object.freeze({id:eliteBase.id,name:eliteBase.name,trait:eliteBase.trait,pressure,phases:pressure>=5?3:pressure>=3?2:1,rewardBoost,token:hash32(`${key}|${eliteBase.id}|elite`).toString(16)}):null;
    return Object.freeze({version:"V10.42-r12",key,roomId:plan?.roomId??0,floor:plan?.floor||1,family,biome:String(plan?.biome||"threshold"),role:String(plan?.role||"standard"),pressure,waves,reinforcements,elite:Boolean(eliteSpec),eliteSpec,event,optional:Boolean(plan?.objective?.optional),routeBonus:plan?.objective?.routeBonus||"",rewardFocus:plan?.objective?.rewardFocus||"supplies",rewardTier:rewardBoost,objectiveType:String(plan?.objective?.type||""),saveKey:`${key}:encounter`});
  }
  function materializeHost(hostState){
    const plans=hostState?.v142RoomObjectives?.plans||[],rooms=[];
    for(const plan of plans){const encounter=buildEncounter(plan);state.rooms.set(encounter.key,encounter);rooms.push(encounter);if(encounter.elite)state.eliteRooms++;if(encounter.event)state.eventRooms++}
    if(hostState)hostState.v142DynamicEncounters={version:"V10.42-r12",rooms,eliteRooms:rooms.filter(row=>row.elite).length,eventRooms:rooms.filter(row=>row.event).length};
    return hostState;
  }

  const baseCreateHostState=W.createHostState.bind(W);
  W.createHostState=function createHostStateV142R12Encounters(worldState){return materializeHost(baseCreateHostState(worldState))};
  state.installed=true;
  window.CCGLostSizzlerV142R12DynamicEncounterDirector={version:"V10.42-r12",state,ELITES,buildEncounter,materializeHost,pressureFor,eliteFamily};
})();
