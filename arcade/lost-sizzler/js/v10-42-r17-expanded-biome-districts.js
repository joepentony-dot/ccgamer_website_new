/* C64 Dungeon Carnage V10.42 r17 — expanded biome districts.
 * Keeps the five-floor campaign intact while adding deterministic themed districts
 * inside each floor. The layer owns presentation metadata and encounter flavour;
 * it does not own movement, damage, saves, networking or the campaign objective.
 */
(()=>{
  "use strict";
  if(window.CCGLostSizzlerV142R17ExpandedBiomeDistricts)return;
  const W=window.CCGWorld,C=window.CCG_CONFIG;
  if(!W||!C||typeof W.createHostState!=="function")return;

  const DISTRICTS=Object.freeze({
    1:Object.freeze(["outdoor","forest","prison"]),
    2:Object.freeze(["forge","prison","mines"]),
    3:Object.freeze(["graveyard","web","flooded"]),
    4:Object.freeze(["forge","mines","flooded"]),
    5:Object.freeze(["library","prison","graveyard"])
  });
  const NAMES=Object.freeze({
    outdoor:"STORM COURTYARD",forest:"OVERGROWN GROVE",prison:"FORGOTTEN CELLS",
    library:"FORBIDDEN ARCHIVE",forge:"BLACK IRON FORGE",flooded:"DROWNED VAULT",
    mines:"ABANDONED MINES",graveyard:"SUNLESS GRAVEYARD",web:"WEB HOLLOW"
  });
  const ELITES=Object.freeze({
    outdoor:Object.freeze({id:"rain-reaver",name:"RAIN REAVER",trait:"storm-flank",event:"storm-ambush"}),
    forest:Object.freeze({id:"thorn-stalker",name:"THORN STALKER",trait:"root-and-flank",event:"root-surge"}),
    prison:Object.freeze({id:"gaoler-construct",name:"GAOLER CONSTRUCT",trait:"lockdown-pressure",event:"cell-lockdown"}),
    library:Object.freeze({id:"rune-archivist",name:"RUNE ARCHIVIST",trait:"cursed-zones",event:"cursed-index"}),
    forge:Object.freeze({id:"forge-brute",name:"FORGE BRUTE",trait:"heat-pressure",event:"furnace-burst"}),
    flooded:Object.freeze({id:"drowned-sentinel",name:"DROWNED SENTINEL",trait:"shock-zones",event:"flood-surge"}),
    mines:Object.freeze({id:"deep-delver",name:"DEEP DELVER",trait:"ambush-and-collapse",event:"cave-in"}),
    graveyard:Object.freeze({id:"grave-warden",name:"GRAVE WARDEN",trait:"undead-rally",event:"restless-dead"}),
    web:Object.freeze({id:"brood-matriarch",name:"BROOD MATRIARCH",trait:"web-control",event:"web-descent"})
  });
  const state={hosts:0,rooms:0,encountersRethemed:0,tiles:0};
  const hash32=value=>{let h=2166136261>>>0;for(const ch of String(value||"")){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0};
  const currentRun=()=>{try{return typeof run!=="undefined"?run:null}catch(_){return null}};
  const currentWorld=()=>{try{return typeof world!=="undefined"?world:null}catch(_){return null}};
  const protectedRole=room=>{
    const role=String(room?.v142Environment?.role||"");
    return ["arrival","exit","sanctuary","trader","sigil","great-hall"].includes(role);
  };
  function districtFor(room,runState){
    if(!room||protectedRole(room))return"";
    if(room?.v142Environment?.role==="web-nest")return"web";
    const floor=Math.max(1,Math.min(5,Number(runState?.floor)||1)),pool=DISTRICTS[floor]||DISTRICTS[1];
    const key=`${runState?.seed||"lost-sizzler"}|F${floor}|R${room.id}|district`;
    const roll=hash32(key)%100;
    // About 55% of ordinary rooms form themed districts; the remainder retain
    // the floor's core visual identity so each depth still feels coherent.
    if(roll>=55)return"";
    return pool[hash32(`${key}|pick`)%pool.length];
  }
  function encounterTheme(encounter,district){
    if(!encounter||!district)return encounter;
    const spec=ELITES[district]||null;
    const clone={...encounter,subBiome:district,subBiomeName:NAMES[district]||district.toUpperCase()};
    if(spec&&encounter.elite){
      clone.family=district;
      clone.eliteSpec=Object.freeze({...encounter.eliteSpec,id:spec.id,name:spec.name,trait:spec.trait});
      clone.event=Object.freeze({...encounter.event,kind:spec.event});
    }
    return Object.freeze(clone);
  }
  function applyDistricts(worldState,hostState,runState=currentRun()){
    if(!worldState?.rooms||!hostState||!runState)return hostState;
    const rooms=[];
    for(const room of worldState.rooms){
      const district=districtFor(room,runState);if(!district)continue;
      room.v142Environment=room.v142Environment||{};
      room.v142Environment.subBiome=district;
      room.v142Environment.subBiomeName=NAMES[district]||district.toUpperCase();
      room.v142Environment.district=true;
      const plan=hostState.v142RoomObjectives?.plans?.find(row=>String(row.roomId)===String(room.id));
      if(plan){plan.subBiome=district;plan.subBiomeName=room.v142Environment.subBiomeName}
      const encounterIndex=hostState.v142DynamicEncounters?.rooms?.findIndex?.(row=>String(row.roomId)===String(room.id))??-1;
      if(encounterIndex>=0){
        const previous=hostState.v142DynamicEncounters.rooms[encounterIndex],themed=encounterTheme(previous,district);
        hostState.v142DynamicEncounters.rooms[encounterIndex]=themed;
        const runtime=hostState.v142EncounterRuntime?.rooms?.find?.(row=>String(row.roomId)===String(room.id));
        if(runtime)runtime.encounter=themed;
        state.encountersRethemed++;
      }
      rooms.push({roomId:room.id,id:district,name:room.v142Environment.subBiomeName});state.rooms++;
    }
    hostState.v142ExpandedBiomes={version:"V10.42-r17",floor:Number(runState.floor)||1,rooms,counts:rooms.reduce((out,row)=>(out[row.id]=(out[row.id]||0)+1,out),{})};
    state.hosts++;return hostState;
  }

  const baseCreateHostState=W.createHostState.bind(W);
  W.createHostState=function createHostStateV142R17ExpandedBiomes(worldState){return applyDistricts(worldState,baseCreateHostState(worldState),currentRun())};

  function subBiomeAt(x,y){
    try{const w=currentWorld(),id=W.roomAt(w,x,y);return w?.rooms?.[id]?.v142Environment?.subBiome||""}catch(_){return""}
  }
  function drawDistrictTile(x,y,kind){
    if(typeof ctx==="undefined"||typeof ws!=="function"||!kind)return;
    const s=ws(x,y),tile=Number(C.tile)||42,h=hash32(`${kind}|${x},${y}`);if(!s)return;
    ctx.save();ctx.lineWidth=1;
    if(kind==="forest"&&h%4===0){ctx.strokeStyle="rgba(112,190,105,.34)";ctx.beginPath();ctx.moveTo(s.x+6,s.y+tile-5);ctx.quadraticCurveTo(s.x+tile*.45,s.y+tile*.35,s.x+tile-7,s.y+8);ctx.stroke()}
    else if(kind==="prison"&&h%5===0){ctx.strokeStyle="rgba(170,180,194,.28)";for(let i=9;i<tile-5;i+=8){ctx.beginPath();ctx.moveTo(s.x+i,s.y+5);ctx.lineTo(s.x+i,s.y+tile-5);ctx.stroke()}}
    else if(kind==="library"&&h%4===0){ctx.strokeStyle="rgba(194,145,91,.30)";ctx.strokeRect(s.x+5,s.y+7,tile-10,tile-14);ctx.beginPath();ctx.moveTo(s.x+5,s.y+tile*.48);ctx.lineTo(s.x+tile-5,s.y+tile*.48);ctx.stroke()}
    else if(kind==="forge"&&h%4===0){ctx.fillStyle="rgba(255,104,44,.23)";ctx.fillRect(s.x+6,s.y+tile-7,tile-12,2);ctx.fillRect(s.x+10+(h%16),s.y+10,3,3)}
    else if(kind==="flooded"&&h%3===0){ctx.strokeStyle="rgba(90,190,235,.27)";ctx.beginPath();ctx.moveTo(s.x+4,s.y+tile-9);ctx.quadraticCurveTo(s.x+tile*.35,s.y+tile-13,s.x+tile*.62,s.y+tile-9);ctx.quadraticCurveTo(s.x+tile*.78,s.y+tile-5,s.x+tile-4,s.y+tile-9);ctx.stroke()}
    else if(kind==="mines"&&h%5===0){ctx.strokeStyle="rgba(186,151,105,.31)";ctx.beginPath();ctx.moveTo(s.x+7,s.y+tile-5);ctx.lineTo(s.x+12,s.y+7);ctx.moveTo(s.x+tile-7,s.y+tile-5);ctx.lineTo(s.x+tile-12,s.y+7);ctx.moveTo(s.x+10,s.y+10);ctx.lineTo(s.x+tile-10,s.y+10);ctx.stroke()}
    else if(kind==="graveyard"&&h%5===0){ctx.fillStyle="rgba(186,198,180,.22)";ctx.fillRect(s.x+tile*.42,s.y+9,7,tile-15);ctx.fillRect(s.x+tile*.33,s.y+15,14,4)}
    else if(kind==="web"&&h%2===0){ctx.strokeStyle="rgba(230,235,245,.30)";ctx.beginPath();ctx.moveTo(s.x+3,s.y+3);ctx.quadraticCurveTo(s.x+tile*.5,s.y+tile*.45,s.x+tile-3,s.y+8);ctx.moveTo(s.x+4,s.y+tile-4);ctx.quadraticCurveTo(s.x+tile*.55,s.y+tile*.5,s.x+tile-5,s.y+5);ctx.stroke()}
    else if(kind==="outdoor"&&h%4===0){ctx.strokeStyle="rgba(143,207,219,.25)";for(let i=0;i<3;i++){const ox=7+((h>>(i*5))%28);ctx.beginPath();ctx.moveTo(s.x+ox,s.y+5);ctx.lineTo(s.x+ox-5,s.y+17);ctx.stroke()}}
    ctx.restore();state.tiles++;
  }
  const baseDrawTile=window.drawTile;
  if(typeof baseDrawTile==="function"){
    const wrapped=function drawTileV142R17(x,y){const result=baseDrawTile.apply(this,arguments);try{drawDistrictTile(x,y,subBiomeAt(x,y))}catch(_){}return result};
    wrapped.__ccgV142R17ExpandedBiomes=true;wrapped.__ccgOriginal=baseDrawTile;window.drawTile=wrapped;
  }

  window.CCGLostSizzlerV142R17ExpandedBiomeDistricts=Object.freeze({version:"V10.42-r17",DISTRICTS,NAMES,ELITES,state,districtFor,applyDistricts,subBiomeAt});
})();
