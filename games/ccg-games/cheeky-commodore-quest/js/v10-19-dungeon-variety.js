/* The Lost Sizzler V10.19 — structural dungeon variety without bypassing progression locks. */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_DUNGEON_VARIETY_V119__)return;
  window.__CCG_LOST_SIZZLER_DUNGEON_VARIETY_V119__=true;

  const World=window.CCGWorld;
  const C=window.CCG_CONFIG;
  if(!World||typeof World.generate!=="function"||typeof World.createHostState!=="function"||!C)return;

  const originalGenerate=World.generate.bind(World);
  const originalCreateHostState=World.createHostState.bind(World);
  const key=(x,y)=>`${x},${y}`;
  const dirs=[[1,0],[-1,0],[0,1],[0,-1]];

  function hash(value){let h=2166136261>>>0;for(const ch of String(value||"")){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
  function rng(seed){let s=seed>>>0;return()=>((s=Math.imul(1664525,s)+1013904223>>>0)/4294967296)}
  function ri(random,min,max){return Math.floor(random()*(max-min+1))+min}
  function inBounds(x,y){return x>1&&y>1&&x<C.worldWidth-2&&y<C.worldHeight-2}
  function roomAt(w,x,y){try{return World.roomAt(w,x,y)}catch(_){return-1}}
  function roomNear(w,x,y,pad=1){return w.rooms.some(room=>x>=room.x-pad&&x<=room.x+room.w+pad&&y>=room.y-pad&&y<=room.y+room.h+pad)}
  function lockedRoomSet(w){return new Set([...(w.lockedRooms||[]),...(w.doorSpecs||[]).map(d=>d.roomId)].filter(Number.isFinite))}

  function protectCell(set,x,y,radius=0){
    for(let yy=y-radius;yy<=y+radius;yy++)for(let xx=x-radius;xx<=x+radius;xx++)set.add(key(xx,yy));
  }
  function protectedCells(w){
    const set=new Set();
    for(const raw of w.optionalCells||[]){
      const [x,y]=String(raw).split(",").map(Number);if(Number.isFinite(x)&&Number.isFinite(y))protectCell(set,x,y,2);
    }
    for(const door of w.doorSpecs||[])protectCell(set,door.x,door.y,4);
    const locked=lockedRoomSet(w);
    for(const id of locked){
      const room=w.rooms[id];if(!room)continue;
      for(let y=room.y-3;y<=room.y+room.h+3;y++)for(let x=room.x-3;x<=room.x+room.w+3;x++)set.add(key(x,y));
    }
    if(w.start)protectCell(set,w.start.x,w.start.y,4);
    if(w.exit)protectCell(set,w.exit.x,w.exit.y,4);
    if(Number.isFinite(w.tunnelY))for(let x=0;x<C.worldWidth;x++)set.add(key(x,w.tunnelY));
    return set;
  }

  function canCarve(w,protectedSet,x,y,{nearRooms=true}={}){
    if(!inBounds(x,y)||protectedSet.has(key(x,y)))return false;
    if(roomAt(w,x,y)>=0)return false;
    if(nearRooms&&roomNear(w,x,y,1))return false;
    return true;
  }
  function carve(w,protectedSet,x,y,opts){if(!canCarve(w,protectedSet,x,y,opts))return false;w.map[y][x]=0;return true}
  function safeCorridorCells(w,edge,protectedSet){
    return (edge?.path||[]).filter(p=>inBounds(p.x,p.y)&&roomAt(w,p.x,p.y)<0&&!protectedSet.has(key(p.x,p.y)));
  }
  function edgeIsProtected(w,edge){
    const locked=lockedRoomSet(w),a=w.rooms[edge?.a],b=w.rooms[edge?.b];
    return !a||!b||a.optional||b.optional||locked.has(a.id)||locked.has(b.id);
  }

  function straightRuns(points){
    const runs=[];if(points.length<2)return runs;
    let start=0,lastDir=null;
    for(let i=1;i<points.length;i++){
      const dx=Math.sign(points[i].x-points[i-1].x),dy=Math.sign(points[i].y-points[i-1].y),dir=`${dx},${dy}`;
      if(lastDir&&dir!==lastDir){if(i-start>=4)runs.push(points.slice(start,i));start=i-1}
      lastDir=dir;
    }
    if(points.length-start>=4)runs.push(points.slice(start));
    return runs.sort((a,b)=>b.length-a.length);
  }

  function widenGallery(w,points,protectedSet,random,meta){
    const runs=straightRuns(points).filter(run=>run.length>=5);if(!runs.length)return false;
    const run=runs[ri(random,0,Math.min(runs.length-1,2))],span=Math.min(run.length-2,ri(random,4,8));
    const start=Math.max(1,Math.floor((run.length-span)/2)),sample=run[Math.min(run.length-1,start+1)],prev=run[Math.max(0,start)];
    const horizontal=sample.y===prev.y,carved=[];
    for(let i=start;i<Math.min(run.length-1,start+span);i++){
      const p=run[i];
      for(const side of [-1,1]){
        const x=p.x+(horizontal?0:side),y=p.y+(horizontal?side:0);
        if(carve(w,protectedSet,x,y,{nearRooms:true}))carved.push({x,y});
      }
    }
    if(carved.length<3)return false;
    meta.galleries.push({cells:carved});return true;
  }

  function carveAlcove(w,points,protectedSet,random,meta){
    const runs=straightRuns(points).filter(run=>run.length>=6);if(!runs.length)return false;
    const run=runs[0],mid=run[ri(random,2,run.length-3)],prev=run[Math.max(0,run.indexOf(mid)-1)],horizontal=mid.y===prev.y;
    const sides=random()<.5?[-1,1]:[1,-1];
    for(const side of sides){
      const cells=[];
      for(let depth=1;depth<=3;depth++)for(let width=-1;width<=1;width++){
        const x=mid.x+(horizontal?width:side*depth),y=mid.y+(horizontal?side*depth:width);cells.push({x,y,depth,width});
      }
      if(cells.some(p=>!canCarve(w,protectedSet,p.x,p.y,{nearRooms:true})||w.map[p.y][p.x]===0))continue;
      for(const p of cells)w.map[p.y][p.x]=0;
      const reward=cells.find(p=>p.depth===3&&p.width===0)||cells[cells.length-1];
      meta.alcoves.push({cells:cells.map(({x,y})=>({x,y})),reward:{x:reward.x,y:reward.y}});meta.deadEnds.push({x:reward.x,y:reward.y});return true;
    }
    return false;
  }

  function carveJunction(w,points,protectedSet,random,meta){
    if(points.length<5)return false;
    const turns=[];
    for(let i=1;i<points.length-1;i++){
      const a=points[i-1],b=points[i],c=points[i+1],d1={x:Math.sign(b.x-a.x),y:Math.sign(b.y-a.y)},d2={x:Math.sign(c.x-b.x),y:Math.sign(c.y-b.y)};
      if(d1.x!==d2.x||d1.y!==d2.y)turns.push(b);
    }
    const centre=turns.length?turns[ri(random,0,turns.length-1)]:points[Math.floor(points.length/2)],cells=[];
    for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++)if(Math.abs(dx)<=1||Math.abs(dy)<=1){const x=centre.x+dx,y=centre.y+dy;if(canCarve(w,protectedSet,x,y,{nearRooms:true}))cells.push({x,y})}
    if(cells.length<5)return false;
    for(const p of cells)w.map[p.y][p.x]=0;meta.junctions.push({x:centre.x,y:centre.y,cells});return true;
  }

  function carveParallelLoop(w,points,protectedSet,random,meta){
    const runs=straightRuns(points).filter(run=>run.length>=9);if(!runs.length)return false;
    const run=runs[0],len=Math.min(run.length-2,ri(random,6,10)),start=Math.max(1,Math.floor((run.length-len)/2)),segment=run.slice(start,start+len);
    if(segment.length<6)return false;
    const horizontal=segment[0].y===segment[1].y,sides=random()<.5?[-1,1]:[1,-1];
    for(const side of sides){
      const offset=2,cells=[];
      for(const p of segment)cells.push({x:p.x+(horizontal?0:side*offset),y:p.y+(horizontal?side*offset:0)});
      const first=segment[0],last=segment[segment.length-1];
      cells.push({x:first.x+(horizontal?0:side),y:first.y+(horizontal?side:0)},{x:last.x+(horizontal?0:side),y:last.y+(horizontal?side:0)});
      if(cells.some(p=>!canCarve(w,protectedSet,p.x,p.y,{nearRooms:true})||w.map[p.y][p.x]===0))continue;
      for(const p of cells)w.map[p.y][p.x]=0;meta.parallelLoops.push({cells});return true;
    }
    return false;
  }

  function openShortThreshold(w,points,protectedSet,meta){
    if(points.length<1||points.length>7)return false;
    let carved=0;const cells=[];
    for(let i=1;i<points.length-1;i++){
      const p=points[i],prev=points[i-1],next=points[i+1],horizontal=prev.y===p.y&&next.y===p.y;
      for(const side of [-1,1]){
        const x=p.x+(horizontal?0:side),y=p.y+(horizontal?side:0);
        if(carve(w,protectedSet,x,y,{nearRooms:false})){carved++;cells.push({x,y})}
      }
    }
    if(!carved)return false;meta.openThresholds.push({cells});return true;
  }

  function greatHall(w,safeEdges,protectedSet,random,meta){
    const candidates=[];
    for(const entry of safeEdges){const runs=straightRuns(entry.points).filter(run=>run.length>=10);if(runs.length)candidates.push({edge:entry.edge,run:runs[0]})}
    candidates.sort((a,b)=>b.run.length-a.run.length);
    for(const candidate of candidates.slice(0,4)){
      const run=candidate.run,mid=run[Math.floor(run.length/2)],horizontal=run[0].y===run[1].y;
      const halfLong=5,halfWide=3,cells=[];
      for(let a=-halfLong;a<=halfLong;a++)for(let b=-halfWide;b<=halfWide;b++){
        const x=mid.x+(horizontal?a:b),y=mid.y+(horizontal?b:a);
        if(!inBounds(x,y)||protectedSet.has(key(x,y))||roomAt(w,x,y)>=0||roomNear(w,x,y,2)){cells.length=0;break}
        cells.push({x,y});
      }
      if(!cells.length)continue;
      for(const p of cells)w.map[p.y][p.x]=0;
      meta.greatHalls.push({x:mid.x,y:mid.y,w:horizontal?11:7,h:horizontal?7:11,cells});return true;
    }
    return false;
  }

  function shortcutPath(a,b,horizontalFirst){
    const path=[],push=(x,y)=>{const last=path[path.length-1];if(!last||last.x!==x||last.y!==y)path.push({x,y})};let x=a.x,y=a.y;push(x,y);
    const walkX=()=>{while(x!==b.x){x+=Math.sign(b.x-x);push(x,y)}};const walkY=()=>{while(y!==b.y){y+=Math.sign(b.y-y);push(x,y)}};
    if(horizontalFirst){walkX();walkY()}else{walkY();walkX()}return path;
  }
  function carveShortcut(w,safeEdges,protectedSet,random,meta){
    const samples=safeEdges.map((entry,index)=>({index,points:entry.points.filter((_,i)=>i%Math.max(1,Math.floor(entry.points.length/8))===0)}));
    const candidates=[];
    for(let a=0;a<samples.length;a++)for(let b=a+1;b<samples.length;b++)for(const p of samples[a].points)for(const q of samples[b].points){const d=Math.abs(p.x-q.x)+Math.abs(p.y-q.y);if(d>=4&&d<=9)candidates.push({p,q,d})}
    candidates.sort((a,b)=>a.d-b.d);
    for(const candidate of candidates.slice(0,40)){
      const path=shortcutPath(candidate.p,candidate.q,random()<.5),middle=path.slice(1,-1);
      if(middle.length<2)continue;
      if(middle.some(p=>!canCarve(w,protectedSet,p.x,p.y,{nearRooms:true})||w.map[p.y][p.x]===0))continue;
      for(const p of middle)w.map[p.y][p.x]=0;meta.shortcuts.push({cells:path});return true;
    }
    return false;
  }

  function diversify(w,seedText){
    if(!w?.map||!Array.isArray(w.rooms)||!Array.isArray(w.edges))return w;
    const random=rng(hash(`v10.19|${seedText}`)),protectedSet=protectedCells(w);
    const meta={version:"10.19",galleries:[],alcoves:[],deadEnds:[],junctions:[],parallelLoops:[],shortcuts:[],greatHalls:[],openThresholds:[]};
    const safeEdges=[];
    for(const edge of w.edges){if(edgeIsProtected(w,edge))continue;const points=safeCorridorCells(w,edge,protectedSet);if(points.length>=2)safeEdges.push({edge,points})}
    safeEdges.sort((a,b)=>b.points.length-a.points.length);

    // Every eligible floor gets structural variety, but with a deliberately small
    // carving budget so rooms still matter and the map does not dissolve into one open area.
    const galleryBudget=Math.min(3,Math.max(1,Math.ceil(safeEdges.length/5)));
    const alcoveBudget=Math.min(3,Math.max(1,Math.ceil(safeEdges.length/7)));
    const junctionBudget=Math.min(2,Math.max(1,Math.ceil(safeEdges.length/9)));
    let galleries=0,alcoves=0,junctions=0,loops=0,thresholds=0;
    for(let i=0;i<safeEdges.length;i++){
      const entry=safeEdges[i],profile=(hash(`${seedText}|edge|${entry.edge.a}|${entry.edge.b}`)+i)%5;
      if(entry.points.length<=7&&thresholds<2&&openShortThreshold(w,entry.points,protectedSet,meta)){thresholds++;continue}
      if(galleries<galleryBudget&&(profile===0||profile===3)&&widenGallery(w,entry.points,protectedSet,random,meta))galleries++;
      if(alcoves<alcoveBudget&&(profile===1||i===0)&&carveAlcove(w,entry.points,protectedSet,random,meta))alcoves++;
      if(junctions<junctionBudget&&(profile===2||i===1)&&carveJunction(w,entry.points,protectedSet,random,meta))junctions++;
      if(loops<2&&profile===4&&carveParallelLoop(w,entry.points,protectedSet,random,meta))loops++;
    }
    if(!meta.alcoves.length)for(const entry of safeEdges)if(carveAlcove(w,entry.points,protectedSet,random,meta))break;
    if(!meta.parallelLoops.length)for(const entry of safeEdges)if(carveParallelLoop(w,entry.points,protectedSet,random,meta))break;
    greatHall(w,safeEdges,protectedSet,random,meta);
    carveShortcut(w,safeEdges,protectedSet,random,meta);

    meta.changedCells=[...meta.galleries,...meta.alcoves,...meta.junctions,...meta.parallelLoops,...meta.shortcuts,...meta.greatHalls,...meta.openThresholds].reduce((n,part)=>n+(part.cells?.length||0),0);
    w.dungeonVariety=meta;return w;
  }

  World.generate=function generateV119Variety(seedText){const world=originalGenerate(seedText);return diversify(world,seedText)};
  World.createHostState=function createHostStateV119Variety(world){
    const host=originalCreateHostState(world),spots=world?.dungeonVariety?.deadEnds||[];
    if(!spots.length||!host?.items)return host;
    const occupied=new Set([...(host.items||[]),...(host.enemies||[]),...(host.chests||[]),...(host.doors||[])].map(o=>key(o.x,o.y)));
    spots.slice(0,3).forEach((spot,index)=>{
      if(occupied.has(key(spot.x,spot.y))||world.map?.[spot.y]?.[spot.x]!==0)return;
      host.items.push({id:`variety-cache-${index}`,...spot,kind:index%2?"xpOrb":"credits",title:index%2?"Hidden XP cache":"Hidden corridor cache",active:true,source:"Dungeon exploration"});
      occupied.add(key(spot.x,spot.y));
    });
    return host;
  };

  window.CCGLostSizzlerDungeonVariety={version:"10.19",diversify};
})();
