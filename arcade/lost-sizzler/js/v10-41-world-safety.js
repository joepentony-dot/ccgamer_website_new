/* The Lost Sizzler V10.41 — hard doorway traversal safeguard. */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V141_WORLD_SAFETY__)return;
  window.__CCG_LOST_SIZZLER_V141_WORLD_SAFETY__=true;

  const state={installed:false,decorateWrapped:false,startWrapped:false,repairs:0,timer:0};
  const SYS=window.CCGSystems;

  const key=(x,y)=>`${x},${y}`;
  const insideMap=(world,x,y)=>Boolean(world?.map&&y>=0&&x>=0&&y<world.map.length&&x<(world.map[y]?.length||0));

  function directionForDoor(world,door){
    const side=String(door?.side||"").toLowerCase();
    if(side==="east")return{x:1,y:0};
    if(side==="west")return{x:-1,y:0};
    if(side==="south")return{x:0,y:1};
    if(side==="north")return{x:0,y:-1};
    const room=world?.rooms?.[Number(door?.roomId)];
    if(!room)return null;
    const distances=[
      {d:Math.abs(Number(door.x)-Number(room.x)),dir:{x:-1,y:0}},
      {d:Math.abs(Number(door.x)-Number(room.x+room.w)),dir:{x:1,y:0}},
      {d:Math.abs(Number(door.y)-Number(room.y)),dir:{x:0,y:-1}},
      {d:Math.abs(Number(door.y)-Number(room.y+room.h)),dir:{x:0,y:1}}
    ].sort((a,b)=>a.d-b.d);
    return distances[0]?.dir||null;
  }

  function doorwayCells(world,door){
    const dir=directionForDoor(world,door);if(!dir)return[];
    const cells=[];
    /* Door cell plus two guaranteed walkable cells on each side. This is a
     * narrow traversal lane, not a room reshape. Two-leaf doors naturally
     * protect two parallel lanes. */
    for(let step=-2;step<=2;step++){
      const x=Number(door.x)+dir.x*step,y=Number(door.y)+dir.y*step;
      if(insideMap(world,x,y))cells.push({x,y});
    }
    return cells;
  }

  function protectDoorways(world,host){
    if(!world?.map||!host)return{changed:false,repaired:0,protected:new Set()};
    const protectedCells=new Set();let repaired=0,changed=false;
    for(const door of host.doors||[]){
      if(!door||door.secretPassage||door.type==="secret")continue;
      for(const cell of doorwayCells(world,door)){
        protectedCells.add(key(cell.x,cell.y));
        if(world.map[cell.y]?.[cell.x]!==0){world.map[cell.y][cell.x]=0;repaired++;changed=true}
      }
    }

    if(Array.isArray(host.blockingDecor)){
      const before=host.blockingDecor.length;
      host.blockingDecor=host.blockingDecor.filter(row=>!protectedCells.has(key(row.x,row.y)));
      if(host.blockingDecor.length!==before){repaired+=before-host.blockingDecor.length;changed=true}
    }
    if(Array.isArray(world.decor)){
      for(const decor of world.decor){
        if(!decor?.blocking||!protectedCells.has(key(decor.x,decor.y)))continue;
        decor.blocking=false;decor.destroyed=true;repaired++;changed=true;
      }
    }

    /* A chest, generator or similar object should never be used as the only
     * blocker directly in an ordinary doorway lane. These objects are moved
     * one tile toward the room centre when possible instead of deleted. */
    const relocateList=list=>{
      if(!Array.isArray(list))return;
      for(const object of list){
        if(!object||!protectedCells.has(key(object.x,object.y)))continue;
        const room=world.rooms?.[Number(object.roomId)];if(!room)continue;
        const cx=Math.floor(room.x+room.w/2),cy=Math.floor(room.y+room.h/2);
        const candidates=[];
        for(let radius=1;radius<=5;radius++)for(let dy=-radius;dy<=radius;dy++)for(let dx=-radius;dx<=radius;dx++){
          if(Math.abs(dx)+Math.abs(dy)!==radius)continue;
          const x=cx+dx,y=cy+dy;
          if(!insideMap(world,x,y)||world.map[y][x]!==0||protectedCells.has(key(x,y)))continue;
          if((host.blockingDecor||[]).some(row=>row.x===x&&row.y===y))continue;
          candidates.push({x,y});
        }
        const next=candidates[0];if(next){object.x=next.x;object.y=next.y;repaired++;changed=true}
      }
    };
    relocateList(host.chests);relocateList(host.generators);

    if(changed){host.revision=Number(host.revision||0)+1;state.repairs+=repaired}
    world._v141DoorwayProtectedCells=[...protectedCells];
    return{changed,repaired,protected:protectedCells};
  }

  function install(){
    if(!SYS?.decorate)return false;
    if(!state.decorateWrapped){
      const original=SYS.decorate.bind(SYS);
      SYS.decorate=function decorateV141DoorSafety(world,host,run){
        const result=original.apply(this,arguments);
        try{protectDoorways(world,host)}catch(error){console.warn("[Lost Sizzler V10.41] doorway generation repair failed safely",error)}
        return result;
      };
      state.decorateWrapped=true;
    }
    if(!state.startWrapped&&typeof window.startWorld==="function"){
      const originalStart=window.startWorld;
      window.startWorld=function startWorldV141DoorSafety(){
        const result=originalStart.apply(this,arguments);
        try{protectDoorways(window.__CCG_WORLD||window.world,window.host)}catch(error){console.warn("[Lost Sizzler V10.41] post-start doorway audit failed safely",error)}
        return result;
      };
      state.startWrapped=true;
    }
    state.installed=state.decorateWrapped;
    return state.installed;
  }

  install();
  state.timer=setInterval(()=>{if(install()){clearInterval(state.timer);state.timer=0}},100);
  window.addEventListener("pagehide",()=>{if(state.timer)clearInterval(state.timer)},{once:true});
  window.CCGLostSizzlerWorldSafetyV141={state,protectDoorways,directionForDoor,doorwayCells,install};
})();