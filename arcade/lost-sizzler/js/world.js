window.CCGWorld=(()=>{
  "use strict";
  const C=window.CCG_CONFIG;

  const THEMES={
    C64_ARCHIVE:{name:"C64 Archive",floor:"#14101d",alt:"#1b1427",wall:"#4b3b91",hi:"#8376dc",accent:"#6cecff",message:"Rows of tapes vanish into the dark. Something is clicking further down the aisle.",motif:"shelves"},
    "1541_WORKSHOP":{name:"1541 Workshop",floor:"#101820",alt:"#14232b",wall:"#405a75",hi:"#73a0bb",accent:"#72ff9b",message:"Drive mechanisms chatter behind the walls. One of them sounds expensive.",motif:"drives"},
    BUDGET_BIN:{name:"Budget Bin",floor:"#1b1510",alt:"#261b11",wall:"#765026",hi:"#bd8139",accent:"#ffd85a",message:"Cheap games, price stickers and absolutely no refunds. Keep looking.",motif:"bins"},
    DEMO_LOUNGE:{name:"Demo Lounge",floor:"#120e22",alt:"#1a1030",wall:"#5a2f84",hi:"#a45ecf",accent:"#ff5bae",message:"Raster bars crawl across the walls. The room is showing off now.",motif:"lights"},
    ARMOURY:{name:"Joystick Armoury",floor:"#151719",alt:"#1d2225",wall:"#555d67",hi:"#939da6",accent:"#ff9950",message:"Spare fire buttons, armour plates and suspiciously reinforced Competition Pros.",motif:"racks"},
    CPU_KITCHEN:{name:"CPU Kitchen",floor:"#20150f",alt:"#2b1c12",wall:"#7b4c26",hi:"#c37b3c",accent:"#ff9950",message:"Something is cooking. Whether it qualifies as food is still under review.",motif:"tables"},
    SID_REACTOR:{name:"SID Reactor",floor:"#1b1014",alt:"#271218",wall:"#73323c",hi:"#bf4e5c",accent:"#ff6868",message:"The floor hums in time with a bass note. Staying still feels unwise.",motif:"reactor"},
    WARP_GALLERY:{name:"Warp Gallery",floor:"#111022",alt:"#181330",wall:"#453aa0",hi:"#7f70eb",accent:"#b978ff",message:"Purple light crawls around the arches. This transit corridor links distant sections of the dungeon.",motif:"arches"},
    ZZAP_LIBRARY:{name:"Zzap! Library",floor:"#18170f",alt:"#242112",wall:"#6d6526",hi:"#ada33e",accent:"#ffd85a",message:"Old review scores glare down from the shelves. A distant 96% feels judgmental.",motif:"books"},
    TAPE_STORE:{name:"Tape Store",floor:"#141319",alt:"#1d1a23",wall:"#594f70",hi:"#8f80aa",accent:"#d7b8ff",message:"Cassettes are stacked from floor to ceiling. Half the labels are handwritten.",motif:"tapes"},
    CARTRIDGE_BAY:{name:"Cartridge Bay",floor:"#101a17",alt:"#14251f",wall:"#356b58",hi:"#5fa384",accent:"#72ff9b",message:"Cartridges sit in chunky slots around the room. At least these load quickly.",motif:"slots"},
    CRACKED_INTRO:{name:"Cracked Intro Chamber",floor:"#171019",alt:"#241127",wall:"#6e3266",hi:"#b351a4",accent:"#ff5bae",message:"Scrolling text runs around the walls. Nobody remembers who added it.",motif:"scroll"},
    PIXEL_FOUNDRY:{name:"Pixel Foundry",floor:"#17120f",alt:"#251811",wall:"#7a3f25",hi:"#ce7441",accent:"#ff9950",message:"Hot pixel presses stamp sprites into metal plates while sparks skip across the floor.",motif:"forge"},
    MODEM_EXCHANGE:{name:"Modem Exchange",floor:"#0d171b",alt:"#10242a",wall:"#326474",hi:"#59a9bd",accent:"#6cecff",message:"Carrier tones leak from stacked terminals. Something has answered from the other end.",motif:"terminals"},
    HIGH_SCORE_CRYPT:{name:"High Score Crypt",floor:"#18130d",alt:"#261d0e",wall:"#756328",hi:"#c2aa43",accent:"#ffd85a",message:"Initials glow on stone cabinets. None of the holders appear willing to surrender first place.",motif:"scores"},
    CRT_MAZE:{name:"CRT Maze",floor:"#101513",alt:"#14211d",wall:"#386a58",hi:"#62ab8e",accent:"#72ff9b",message:"Curved glass screens repeat the room at impossible angles and every reflection is half a second late.",motif:"screens"},
    IRON_KEEP:{name:"Iron Joystick Keep",floor:"#211b18",alt:"#2a211c",wall:"#6f4d3d",hi:"#b37c5d",accent:"#ffb45e",message:"Iron rings hang from burgundy and ochre brickwork. Something armoured is dragging a sword nearby.",motif:"keep"},
    MOSS_CRYPT:{name:"Mossy Tape Crypt",floor:"#162019",alt:"#1d291e",wall:"#4d6144",hi:"#80916d",accent:"#a8d56b",message:"Green mortar and damp flagstones have swallowed the labels on the oldest tapes.",motif:"crypt"},
    EMBER_DUNGEON:{name:"Ember Disk Dungeon",floor:"#241712",alt:"#301d15",wall:"#743b2d",hi:"#b96345",accent:"#ff7848",message:"Rust-red bricks breathe furnace heat through their cracks. The floor plates do not look trustworthy.",motif:"dungeon"},
    SPIDER_NEST:{name:"Dustweb Nest",floor:"#0b090d",alt:"#151018",wall:"#362d3b",hi:"#6e5b72",accent:"#bfc7d8",message:"Webs pulse in the draught. Dozens of tiny feet are answering from the shelves.",motif:"webs"},
    TREASURE_VAULT:{name:"Locked Treasure Vault",floor:"#171b12",alt:"#222b18",wall:"#65712f",hi:"#a5bb50",accent:"#ffd85a",message:"A bonus chamber behind a bronze lock. The main quest never depends on what is inside.",motif:"vault"}
  };

  function hash(s){let h=2166136261>>>0;for(const ch of String(s)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
  function rng(seed){let s=seed>>>0;return()=>((s=Math.imul(1664525,s)+1013904223>>>0)/4294967296)}
  const ri=(r,a,b)=>Math.floor(r()*(b-a+1))+a;
  const cell=(x,y)=>`${x},${y}`;
  const centre=r=>({x:Math.floor(r.x+r.w/2),y:Math.floor(r.y+r.h/2)});
  const inside=(r,p)=>p.x>=r.x&&p.x<=r.x+r.w&&p.y>=r.y&&p.y<=r.y+r.h;

  function carveCell(map,x,y){if(x>0&&y>0&&x<C.worldWidth-1&&y<C.worldHeight-1)map[y][x]=0}
  function carveRoom(map,r){for(let y=r.y;y<=r.y+r.h;y++)for(let x=r.x;x<=r.x+r.w;x++)carveCell(map,x,y)}
  function carvePath(map,a,b,r){
    const path=[],push=(x,y)=>{carveCell(map,x,y);const last=path[path.length-1];if(!last||last.x!==x||last.y!==y)path.push({x,y})};
    let x=a.x,y=a.y;push(x,y);
    const horizontalFirst=r()<.5;
    const walkX=()=>{while(x!==b.x){x+=Math.sign(b.x-x);push(x,y)}};
    const walkY=()=>{while(y!==b.y){y+=Math.sign(b.y-y);push(x,y)}};
    if(horizontalFirst){walkX();walkY()}else{walkY();walkX()}
    return path;
  }

  function splitBSP(r,node,depth=0){
    const min=C.dungeon.minLeaf,max=C.dungeon.maxLeaf;
    const canV=r.w>=min*2,canH=r.h>=min*2;
    if((!canV&&!canH)||(r.w<=max&&r.h<=max&&depth>2))return;
    let vertical=canV&&(!canH||r.w/r.h>1.18||(r.w/r.h>.85&&node.random()<.5));
    if(vertical){
      const cut=ri(node.random,min,r.w-min);
      node.left={rect:{x:r.x,y:r.y,w:cut,h:r.h},random:node.random};
      node.right={rect:{x:r.x+cut,y:r.y,w:r.w-cut,h:r.h},random:node.random};
    }else{
      const cut=ri(node.random,min,r.h-min);
      node.left={rect:{x:r.x,y:r.y,w:r.w,h:cut},random:node.random};
      node.right={rect:{x:r.x,y:r.y+cut,w:r.w,h:r.h-cut},random:node.random};
    }
    splitBSP(node.left.rect,node.left,depth+1);splitBSP(node.right.rect,node.right,depth+1);
  }

  function createRooms(node,map,rooms,r){
    if(!node.left&&!node.right){
      const m=C.dungeon.roomMargin;
      const maxW=Math.max(7,node.rect.w-m*2),maxH=Math.max(6,node.rect.h-m*2);
      const w=ri(r,Math.min(7,maxW),maxW),h=ri(r,Math.min(6,maxH),maxH);
      const x=ri(r,node.rect.x+m,Math.max(node.rect.x+m,node.rect.x+node.rect.w-w-m));
      const y=ri(r,node.rect.y+m,Math.max(node.rect.y+m,node.rect.y+node.rect.h-h-m));
      const room={id:rooms.length,x,y,w,h,theme:C.roomThemes[ri(r,0,C.roomThemes.length-1)],optional:false,depth:0};
      rooms.push(room);node.roomId=room.id;carveRoom(map,room);
      // Cut deterministic corner bites and shallow side alcoves so the BSP rooms
      // retain reliable bounds without all reading as perfect rectangles.
      room.shape=["NOTCHED","L-SHAPED","ALCOVE","CHAMFERED"][room.id%4];
      const depth=Math.min(2,Math.max(1,Math.floor(Math.min(w,h)/6))),corners=room.id%4===0?[[0,0],[1,1]]:room.id%4===1?[[1,0]]:room.id%4===2?[[0,1]]:[[0,0],[1,0]];
      for(const [right,bottom] of corners)for(let yy=0;yy<depth;yy++)for(let xx=0;xx<depth;xx++){const tx=right?room.x+room.w-xx:room.x+xx,ty=bottom?room.y+room.h-yy:room.y+yy;map[ty][tx]=1}
      if(room.id%3===0&&w>=10){const side=room.id%2?room.x:room.x+room.w,y0=room.y+2+(room.id%(Math.max(1,h-4)));for(let yy=Math.max(room.y+2,y0-1);yy<=Math.min(room.y+room.h-2,y0+1);yy++)carveCell(map,side+(side===room.x?-1:1),yy)}
      return room.id;
    }
    const ids=[];if(node.left)ids.push(createRooms(node.left,map,rooms,r));if(node.right)ids.push(createRooms(node.right,map,rooms,r));node.roomId=ids[0];return ids[0];
  }

  function connectionPorts(a,b,r){
    const ca=centre(a),cb=centre(b),horizontal=Math.abs(cb.x-ca.x)>=Math.abs(cb.y-ca.y);
    if(horizontal){const east=ca.x<cb.x,ay=ri(r,a.y+2,Math.max(a.y+2,a.y+a.h-2)),by=Math.max(b.y+2,Math.min(b.y+b.h-2,ay));return{a:{x:east?a.x+a.w:a.x,y:ay},b:{x:east?b.x:b.x+b.w,y:by}}}
    const south=ca.y<cb.y,ax=ri(r,a.x+2,Math.max(a.x+2,a.x+a.w-2)),bx=Math.max(b.x+2,Math.min(b.x+b.w-2,ax));return{a:{x:ax,y:south?a.y+a.h:a.y},b:{x:bx,y:south?b.y:b.y+b.h}}
  }

  function connectTree(node,map,rooms,edges,r){
    if(!node.left&&!node.right)return node.roomId;
    const a=connectTree(node.left,map,rooms,edges,r),b=connectTree(node.right,map,rooms,edges,r);
    const ports=connectionPorts(rooms[a],rooms[b],r),path=carvePath(map,ports.a,ports.b,r);
    edges.push({a,b,path});
    node.roomId=r()<.5?a:b;
    return node.roomId;
  }

  function graphFor(rooms,edges){const g=Array.from({length:rooms.length},()=>[]);for(const e of edges){g[e.a].push({to:e.b,edge:e});g[e.b].push({to:e.a,edge:e})}return g}
  function graphDistances(g,start){const d=Array(g.length).fill(Infinity),parent=Array(g.length).fill(-1),q=[start];d[start]=0;for(let i=0;i<q.length;i++){const u=q[i];for(const n of g[u])if(d[n.to]===Infinity){d[n.to]=d[u]+1;parent[n.to]=u;q.push(n.to)}}return{d,parent}}
  function pathRooms(parent,start,end){const s=new Set();let n=end;while(n>=0){s.add(n);if(n===start)break;n=parent[n]}return s}
  function bfsMap(map,start,blocked=new Set()){
    const seen=new Set([cell(start.x,start.y)]),q=[start];
    for(let i=0;i<q.length;i++){const p=q[i];for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const x=p.x+dx,y=p.y+dy,k=cell(x,y);if(x<0||y<0||x>=C.worldWidth||y>=C.worldHeight||map[y][x]!==0||blocked.has(k)||seen.has(k))continue;seen.add(k);q.push({x,y})}}
    return seen;
  }

  function areaAllWalls(map,x1,y1,x2,y2){
    if(x1<2||y1<2||x2>=C.worldWidth-2||y2>=C.worldHeight-2)return false;
    for(let y=y1;y<=y2;y++)for(let x=x1;x<=x2;x++)if(map[y][x]===0)return false;return true;
  }
  function attachBonusRoom(map,source,index,rooms,sizes=[[12,9],[7,6]]){
    const cx=source.x+2+((source.id*7+index*3)%Math.max(1,source.w-3)),cy=source.y+2+((source.id*5+index*7)%Math.max(1,source.h-3));
    const opts=[];for(const [rw,rh] of sizes){const hw=Math.floor(rw/2),hh=Math.floor(rh/2);opts.push(
      {door:{x:source.x+source.w+1,y:cy},box:{x1:source.x+source.w+2,y1:cy-hh,x2:source.x+source.w+2+rw,y2:cy-hh+rh}},
      {door:{x:source.x-1,y:cy},box:{x1:source.x-2-rw,y1:cy-hh,x2:source.x-2,y2:cy-hh+rh}},
      {door:{x:cx,y:source.y+source.h+1},box:{x1:cx-hw,y1:source.y+source.h+2,x2:cx-hw+rw,y2:source.y+source.h+2+rh}},
      {door:{x:cx,y:source.y-1},box:{x1:cx-hw,y1:source.y-2-rh,x2:cx-hw+rw,y2:source.y-2}}
    )}
    for(const o of opts){
      if(map[o.door.y]?.[o.door.x]!==1||!areaAllWalls(map,o.box.x1-1,o.box.y1-1,o.box.x2+1,o.box.y2+1))continue;
      carveCell(map,o.door.x,o.door.y);const room={id:rooms.length,x:o.box.x1,y:o.box.y1,w:o.box.x2-o.box.x1,h:o.box.y2-o.box.y1,theme:"TREASURE_VAULT",optional:true,depth:(source.depth||0)+1};carveRoom(map,room);rooms.push(room);
      return{id:`door${index}`,x:o.door.x,y:o.door.y,roomId:room.id};
    }
    return null;
  }

  function chooseDoorForLeaf(edge,leafRoom,otherRoom){
    const path=edge.path,forward=edge.a===leafRoom.id?path:[...path].reverse();
    let leftLeaf=false;
    for(const p of forward){
      if(inside(leafRoom,p)){leftLeaf=true;continue}
      if(leftLeaf&&!inside(otherRoom,p))return p;
    }
    for(const p of forward)if(!inside(leafRoom,p)&&!inside(otherRoom,p))return p;
    return null;
  }

  function stage5Floor(seedText){
    const match=String(seedText||"").match(/-F([1-5])(?:$|[^0-9])/i);
    return Math.max(1,Math.min(5,Number(match?.[1]||1)));
  }

  const STAGE5_TOPOLOGY_PROFILES=Object.freeze({
    1:{id:"threshold-branches",loopTarget:1,maxPath:34,landmarkTarget:3},
    2:{id:"iron-crossroads",loopTarget:2,maxPath:38,landmarkTarget:4},
    3:{id:"crypt-rings",loopTarget:2,maxPath:40,landmarkTarget:4},
    4:{id:"ember-braids",loopTarget:3,maxPath:44,landmarkTarget:5},
    5:{id:"sanctum-web",loopTarget:3,maxPath:46,landmarkTarget:5}
  });

  function stage5PairKey(a,b){return a<b?`${a}:${b}`:`${b}:${a}`}
  function stage5ExistingPairs(edges){return new Set(edges.map(edge=>stage5PairKey(edge.a,edge.b)))}
  function stage5GraphDistance(graph,start,end){
    if(start===end)return 0;
    const seen=new Set([start]),queue=[{id:start,d:0}];
    for(let i=0;i<queue.length;i++){
      const current=queue[i];
      for(const next of graph[current.id]||[]){
        if(seen.has(next.to))continue;
        if(next.to===end)return current.d+1;
        seen.add(next.to);queue.push({id:next.to,d:current.d+1});
      }
    }
    return Infinity
  }
  function stage5Clamp(value,min,max){return Math.max(min,Math.min(max,value))}
  function stage5FacingPorts(a,b){
    const ca=centre(a),cb=centre(b),horizontal=Math.abs(cb.x-ca.x)>=Math.abs(cb.y-ca.y);
    if(horizontal){
      const east=ca.x<cb.x;
      return{
        a:{x:east?a.x+a.w:a.x,y:stage5Clamp(cb.y,a.y+1,a.y+a.h-1)},
        b:{x:east?b.x:b.x+b.w,y:stage5Clamp(ca.y,b.y+1,b.y+b.h-1)}
      }
    }
    const south=ca.y<cb.y;
    return{
      a:{x:stage5Clamp(cb.x,a.x+1,a.x+a.w-1),y:south?a.y+a.h:a.y},
      b:{x:stage5Clamp(ca.x,b.x+1,b.x+b.w-1),y:south?b.y:b.y+b.h}
    }
  }
  function stage5OrthogonalPath(a,b,horizontalFirst){
    const out=[],push=(x,y)=>{const last=out[out.length-1];if(!last||last.x!==x||last.y!==y)out.push({x,y})};
    let x=a.x,y=a.y;push(x,y);
    const walkX=()=>{while(x!==b.x){x+=Math.sign(b.x-x);push(x,y)}};
    const walkY=()=>{while(y!==b.y){y+=Math.sign(b.y-y);push(x,y)}};
    if(horizontalFirst){walkX();walkY()}else{walkY();walkX()}
    return out
  }
  function stage5RouteCandidate(map,rooms,a,b,profile,seedText,protectedCells=new Set()){
    const ports=stage5FacingPorts(a,b),routes=[stage5OrthogonalPath(ports.a,ports.b,true),stage5OrthogonalPath(ports.a,ports.b,false)];
    const valid=[];
    for(const route of routes){
      if(route.length<4||route.length>profile.maxPath)continue;
      let walls=0,foreign=false;
      for(const point of route){
        if(point.x<=0||point.y<=0||point.x>=C.worldWidth-1||point.y>=C.worldHeight-1||protectedCells.has(cell(point.x,point.y))){foreign=true;break}
        const room=rooms.find(candidate=>candidate.id!==a.id&&candidate.id!==b.id&&inside(candidate,point));
        if(room){foreign=true;break}
        if(map[point.y][point.x]===1)walls++;
      }
      if(foreign||walls<3||walls/route.length<.42)continue;
      valid.push({route,walls});
    }
    if(!valid.length)return null;
    valid.sort((left,right)=>right.walls-left.walls||left.route.length-right.route.length);
    if(valid.length>1&&valid[0].walls===valid[1].walls&&valid[0].route.length===valid[1].route.length){
      return valid[hash(`${seedText}-STAGE5-PATH-${a.id}-${b.id}`)%valid.length]
    }
    return valid[0]
  }
  function stage5SecretReserveCells(seedText,rooms,doorSpecs){
    const floor=stage5Floor(seedText),secretRoomIds=new Set((doorSpecs||[]).slice(0,Math.max(0,C.dungeon.secretRooms||0)).map(door=>door.roomId)),reserved=new Set();
    const add=(x,y)=>{if(x>2&&y>2&&x<C.worldWidth-3&&y<C.worldHeight-3)reserved.add(cell(x,y))};
    for(const room of rooms){
      if(!room.optional||!secretRoomIds.has(room.id))continue;
      const insetX=room.x+2+((room.id*7+floor*3)%Math.max(1,room.w-3));
      const insetY=room.y+2+((room.id*5+floor*7)%Math.max(1,room.h-3));
      const sides=[
        {dx:1,dy:0,x:room.x+room.w+1,y:insetY},
        {dx:-1,dy:0,x:room.x-1,y:insetY},
        {dx:0,dy:1,x:insetX,y:room.y+room.h+1},
        {dx:0,dy:-1,x:insetX,y:room.y-1}
      ];
      for(const side of sides){
        for(let step=0;step<=4;step++)add(side.x+side.dx*step,side.y+side.dy*step);
        const endX=side.x+side.dx*4,endY=side.y+side.dy*4;
        if(side.dx){
          for(let yy=endY-1;yy<=endY+1;yy++)for(let step=0;step<=2;step++)add(endX+side.dx*step,yy);
        }else{
          for(let xx=endX-1;xx<=endX+1;xx++)for(let step=0;step<=2;step++)add(xx,endY+side.dy*step);
        }
      }
    }
    return reserved
  }

  function addStage5Topology(seedText,map,rooms,edges,graph,startRoom,exitRoom,protectedCells=new Set()){
    const floor=stage5Floor(seedText),profile=STAGE5_TOPOLOGY_PROFILES[floor]||STAGE5_TOPOLOGY_PROFILES[1];
    const existing=stage5ExistingPairs(edges),candidates=[];
    const ordinary=rooms.filter(room=>!room.optional&&room.id!==startRoom&&room.id!==exitRoom);
    for(let i=0;i<ordinary.length;i++)for(let j=i+1;j<ordinary.length;j++){
      const a=ordinary[i],b=ordinary[j],key=stage5PairKey(a.id,b.id);
      if(existing.has(key))continue;
      const graphDistance=stage5GraphDistance(graph,a.id,b.id);
      if(!Number.isFinite(graphDistance)||graphDistance<3)continue;
      const route=stage5RouteCandidate(map,rooms,a,b,profile,seedText,protectedCells);
      if(!route)continue;
      const degreePenalty=(graph[a.id]?.length||0)+(graph[b.id]?.length||0);
      const hashTie=hash(`${seedText}-STAGE5-PAIR-${key}`)%997;
      candidates.push({a,b,key,graphDistance,route,score:graphDistance*100-route.route.length*3-degreePenalty*8+hashTie/1000});
    }
    candidates.sort((a,b)=>b.score-a.score||a.key.localeCompare(b.key));

    const loops=[],useCount=new Map();
    for(const candidate of candidates){
      if(loops.length>=profile.loopTarget)break;
      const aUses=useCount.get(candidate.a.id)||0,bUses=useCount.get(candidate.b.id)||0;
      if(aUses>=2||bUses>=2||(aUses&&bUses))continue;
      for(const point of candidate.route.route)carveCell(map,point.x,point.y);
      const edge={a:candidate.a.id,b:candidate.b.id,path:candidate.route.route.map(point=>({x:point.x,y:point.y})),stage5Loop:true,routeKind:"alternate"};
      edges.push(edge);
      graph[edge.a].push({to:edge.b,edge});graph[edge.b].push({to:edge.a,edge});
      existing.add(candidate.key);useCount.set(edge.a,aUses+1);useCount.set(edge.b,bUses+1);
      loops.push({id:`stage5-loop-${loops.length+1}`,a:edge.a,b:edge.b,graphDistanceBefore:candidate.graphDistance,length:edge.path.length});
    }

    const deadEnds=ordinary.filter(room=>(graph[room.id]?.length||0)===1).sort((a,b)=>(b.depth||0)-(a.depth||0)||(hash(`${seedText}-DEAD-${a.id}`)-hash(`${seedText}-DEAD-${b.id}`)));
    const crossroads=ordinary.filter(room=>(graph[room.id]?.length||0)>=3).sort((a,b)=>(graph[b.id]?.length||0)-(graph[a.id]?.length||0)||(b.depth||0)-(a.depth||0));
    const landmarkIds=[];
    const addLandmark=id=>{if(Number.isInteger(id)&&!landmarkIds.includes(id)&&id!==startRoom&&id!==exitRoom)landmarkIds.push(id)};
    for(const loop of loops){addLandmark(loop.a);addLandmark(loop.b)}
    for(const room of crossroads)addLandmark(room.id);
    for(const room of deadEnds)addLandmark(room.id);
    landmarkIds.splice(profile.landmarkTarget);

    const deadEndIds=deadEnds.map(room=>room.id);
    const crossroadIds=crossroads.map(room=>room.id);
    for(const room of ordinary){
      if(deadEndIds.includes(room.id))room.stage5TopologyRole="purposeful-dead-end";
      else if(crossroadIds.includes(room.id))room.stage5TopologyRole="crossroads";
      else if(loops.some(loop=>loop.a===room.id||loop.b===room.id))room.stage5TopologyRole="alternate-route";
      else room.stage5TopologyRole="route";
      room.stage5Landmark=landmarkIds.includes(room.id);
    }

    return{
      version:"stage5-r1",
      floor,
      profile:profile.id,
      loopTarget:profile.loopTarget,
      loops,
      deadEnds:deadEndIds,
      crossroads:crossroadIds,
      landmarks:landmarkIds,
      dimensions:{width:C.worldWidth,height:C.worldHeight},
      protectedSecretCells:protectedCells.size
    }
  }

  function generate(seedText){
    const random=rng(hash(seedText));
    const map=Array.from({length:C.worldHeight},()=>Array(C.worldWidth).fill(1));
    // Reserve a southern band for one isolated great hall. This gives the
    // Sigil Praetorian encounter a guaranteed large one-door annex without
    // overwriting an ordinary room or severing the critical route.
    const root={rect:{x:1,y:1,w:C.worldWidth-2,h:C.worldHeight-14},random};splitBSP(root.rect,root,0);
    const rooms=[],edges=[];createRooms(root,map,rooms,random);connectTree(root,map,rooms,edges,random);
    const graph=graphFor(rooms,edges);
    let startRoom=0,best=Infinity;for(const r of rooms){const c=centre(r),v=c.x+c.y;if(v<best){best=v;startRoom=r.id}}
    const gd=graphDistances(graph,startRoom);let exitRoom=startRoom,maxD=-1;for(let i=0;i<gd.d.length;i++)if(gd.d[i]!==Infinity&&gd.d[i]>maxD){maxD=gd.d[i];exitRoom=i}
    rooms[startRoom].theme="C64_ARCHIVE";rooms[exitRoom].theme="ZZAP_LIBRARY";
    rooms.forEach(r=>r.depth=gd.d[r.id]===Infinity?0:gd.d[r.id]);
    // Each ordinary corridor gets a deterministic one-in-twenty haunting roll.
    // At most one corridor per floor is selected so the encounter remains rare,
    // memorable and tied to one adjoining spider nest rather than becoming noise.
    let hauntedCorridor=null;
    for(const edge of edges){
      if(random()>=.05)continue;
      const adjoining=[rooms[edge.a],rooms[edge.b]].filter(room=>room&&room.id!==startRoom&&room.id!==exitRoom).sort((a,b)=>(b.depth||0)-(a.depth||0));
      const nest=adjoining[0];if(!nest)continue;
      const path=edge.path.filter(point=>!rooms.some(room=>inside(room,point)));
      if(path.length<2)continue;
      nest.originalTheme=nest.theme;nest.theme="SPIDER_NEST";nest.spiderNest=true;
      hauntedCorridor={id:`haunted-${edge.a}-${edge.b}`,a:edge.a,b:edge.b,roomId:nest.id,cells:path.map(point=>({x:point.x,y:point.y})),triggeredBy:[],torchExtinguishedFor:[]};
      break;
    }

    // Classic wrap tunnel on an ordinary connected corridor row.
    let tunnelY=Math.floor(C.worldHeight*.55),found=false;
    for(let off=0;off<22&&!found;off++)for(const y of [tunnelY+off,tunnelY-off]){
      if(y<3||y>C.worldHeight-4)continue;let left=null,right=null;
      for(let x=3;x<C.worldWidth/2;x++)if(map[y][x]===0){left=x;break}
      for(let x=C.worldWidth-4;x>C.worldWidth/2;x--)if(map[y][x]===0){right=x;break}
      if(left!==null&&right!==null){for(let x=1;x<=left;x++)carveCell(map,x,y);for(let x=right;x<C.worldWidth-1;x++)carveCell(map,x,y);tunnelY=y;found=true;break}
    }
    if(!found){tunnelY=Math.floor(C.worldHeight/2);carvePath(map,{x:1,y:tunnelY},centre(rooms[startRoom]),random);carvePath(map,{x:C.worldWidth-2,y:tunnelY},centre(rooms[exitRoom]),random)}


    const critical=pathRooms(gd.parent,startRoom,exitRoom),doorSpecs=[],optionalCells=new Set(),lockedRooms=new Set();
    const sourceRooms=[...rooms].filter(r=>r.id!==startRoom&&r.id!==exitRoom).sort((a,b)=>b.depth-a.depth);
    let bonusIndex=0;
    const southernSources=[...sourceRooms].sort((a,b)=>(b.y+b.h)-(a.y+a.h));
    for(const source of southernSources){const d=attachBonusRoom(map,source,bonusIndex,rooms,[[12,9]]);if(!d)continue;doorSpecs.push(d);lockedRooms.add(d.roomId);const room=rooms[d.roomId];for(let y=room.y;y<=room.y+room.h;y++)for(let x=room.x;x<=room.x+room.w;x++)optionalCells.add(cell(x,y));optionalCells.add(cell(d.x,d.y));bonusIndex++;break}
    for(let pass=0;pass<3&&bonusIndex<C.dungeon.maxLockedBranches;pass++){
      for(const source of sourceRooms){
        if(bonusIndex>=C.dungeon.maxLockedBranches)break;
        const d=attachBonusRoom(map,source,bonusIndex,rooms);if(!d)continue;
        doorSpecs.push(d);lockedRooms.add(d.roomId);const room=rooms[d.roomId];
        for(let y=room.y;y<=room.y+room.h;y++)for(let x=room.x;x<=room.x+room.w;x++)optionalCells.add(cell(x,y));optionalCells.add(cell(d.x,d.y));bonusIndex++;
      }
    }

    // Stage 5 runs only after the established optional-annex set is frozen.
    // The first optional gates become hidden secret rooms in systems.js, so
    // reserve the exact wall cells its nested-crack generator may need before
    // carving any alternate route.
    const protectedSecretCells=stage5SecretReserveCells(seedText,rooms,doorSpecs);
    const topology=addStage5Topology(seedText,map,rooms,edges,graph,startRoom,exitRoom,protectedSecretCells);

    while(graph.length<rooms.length)graph.push([]);return{map,rooms,edges,graph,start:centre(rooms[startRoom]),exit:centre(rooms[exitRoom]),startRoomId:startRoom,exitRoomId:exitRoom,random,tunnelY,doorSpecs,optionalCells,lockedRooms,hauntedCorridor,topology};
  }

  function allFloorCells(w,allowOptional=false){const a=[];for(let y=1;y<C.worldHeight-1;y++)for(let x=1;x<C.worldWidth-1;x++)if(w.map[y][x]===0&&(allowOptional||!w.optionalCells.has(cell(x,y))))a.push({x,y});return a}
  function occupied(used,p){return used.some(o=>o.x===p.x&&o.y===p.y)}
  function pick(w,used,min=0,allowOptional=false){const a=allFloorCells(w,allowOptional).filter(p=>!occupied(used,p)&&Math.abs(p.x-w.start.x)+Math.abs(p.y-w.start.y)>=min);const q=a[Math.floor(w.random()*a.length)]||{x:w.start.x+2,y:w.start.y};used.push(q);return{x:q.x,y:q.y}}
  function pickInRoom(w,room,used){const a=[];for(let y=room.y+1;y<room.y+room.h;y++)for(let x=room.x+1;x<room.x+room.w;x++){const p={x,y};if(w.map[y][x]===0&&!occupied(used,p))a.push(p)}const q=a[Math.floor(w.random()*a.length)]||centre(room);used.push(q);return{x:q.x,y:q.y}}
  function aiFields(w){return{aiState:"idle",facing:{x:w.random()<.5?1:-1,y:0},lastSeen:null,memoryMs:0,searchMs:0,moveCooldown:C.enemy.idleStepMin+Math.floor(w.random()*(C.enemy.idleStepMax-C.enemy.idleStepMin)),attackCooldown:500+Math.floor(w.random()*800),chargeCooldown:900+Math.floor(w.random()*900),healCooldown:4200+Math.floor(w.random()*1600),flash:0,hpBarMs:0}}

  function createHostState(w){
    const used=[w.start,w.exit,{x:1,y:w.tunnelY},{x:C.worldWidth-2,y:w.tunnelY}],enemies=[];
    const openRooms=w.rooms.filter(r=>!r.optional&&r.id!==w.startRoomId),enemyRooms=[...openRooms].sort(()=>w.random()-.5);
    const kinds=["scout","scout","ambusher","hunter","scout","guard","ghost","ranger","scout","charger","ambusher","hunter","scout","guard","ghost","root","scout","ranger","cook","firebreather"];
    let ei=0;
    const standardTarget=C.dungeon.standardEnemyTarget||44;
    for(const room of enemyRooms.slice(0,Math.min(34,enemyRooms.length))){
      const area=room.w*room.h,count=area>100&&w.random()<.48?3:area>65&&w.random()<.62?2:1;
      for(let n=0;n<count&&ei<standardTarget;n++,ei++){
        const p=pickInRoom(w,room,used),kind=kinds[ei%kinds.length],hp=kind==="hunter"?5:kind==="guard"||kind==="root"?4:kind==="ambusher"||kind==="charger"||kind==="cook"||kind==="firebreather"?3:2;
        enemies.push({id:`e${ei}`,...p,kind,hp,maxHp:hp,alive:true,...aiFields(w)});
      }
    }
    const eliteRooms=[...openRooms].sort((a,b)=>b.depth-a.depth);
    const regularNamed=C.followerElites.filter(f=>!f.ccgBoss);
    regularNamed.forEach((f,i)=>{const room=eliteRooms[(i*4+2)%eliteRooms.length]||openRooms[i%openRooms.length],p=pickInRoom(w,room,used);enemies.push({id:`f${i}`,...p,kind:f.kind,hp:f.hp,maxHp:f.hp,armor:f.armor||0,maxArmor:f.armor||0,alive:true,follower:f,...aiFields(w)})});
    const ccg=C.followerElites.find(f=>f.ccgBoss),floor=Math.max(1,Math.min(5,Number(w.floor)||1)),ccgChance=[0,.03,.15,.38,.72,1][floor];
    if(ccg&&w.random()<ccgChance){const room=eliteRooms[(floor*5+1)%eliteRooms.length]||openRooms[0],p=pickInRoom(w,room,used);enemies.push({id:`ccg-f${floor}`,...p,kind:ccg.kind,hp:18,maxHp:18,armor:4,maxArmor:4,alive:true,follower:ccg,ccgBoss:true,moveSpeedScale:1.35,namedDamageScale:2,...aiFields(w)})}

    const items=[];
    const keyRooms=[...openRooms].sort((a,b)=>b.depth-a.depth).filter((r,i)=>i%2===0).slice(0,C.keyTarget);
    while(keyRooms.length<C.keyTarget)keyRooms.push(openRooms[keyRooms.length]);
    keyRooms.forEach((room,i)=>{const p=pickInRoom(w,room,used);items.push({id:`key${i}`,...p,kind:"key",active:true})});

    const cycle=["health","credits","torch","armour","potion","weapon","rapid","xpOrb","teleport","health","credits","torch","armour","potion","weapon","credits"];
    for(let i=0;i<42;i++){const p=pick(w,used,9,false);items.push({id:`p${i}`,...p,kind:cycle[i%cycle.length],title:C.c64Loot[i%C.c64Loot.length],active:true})}
    const collectibleCount=1+(w.random()<.4?1:0);
    for(let i=0;i<collectibleCount;i++){const p=pick(w,used,9,false);items.push({id:`game${i}`,...p,kind:"game",title:C.c64Loot[(floor*97+i*211)%C.c64Loot.length],active:true})}

    const doors=w.doorSpecs.map(d=>({id:d.id,x:d.x,y:d.y,roomId:d.roomId,locked:true,type:"bronze",open:false,opening:false,openingStart:0,openAt:0}));
    // Bronze keys are balanced after every lock, puzzle and reward chest has been installed.
    // Do not seed speculative spares here: surplus keys made later floors feel cluttered.

    const chestRewards=["weapon","armour","potion","torch","health","rapid","health","weapon","armour","potion","torch","ammo","weapon","armour"];
    const chests=[];
    let ci=0;
    for(const r of w.rooms.filter(r=>r.optional)){
      const p=pickInRoom(w,r,used);chests.push({id:`chest${ci}`,x:p.x,y:p.y,locked:true,active:true,reward:chestRewards[ci%chestRewards.length],roomId:r.id});ci++;
    }
    const deepOpen=[...openRooms].sort((a,b)=>b.depth-a.depth);
    while(ci<C.dungeon.chestCount&&deepOpen.length){const r=deepOpen[ci%deepOpen.length],p=pickInRoom(w,r,used);chests.push({id:`chest${ci}`,x:p.x,y:p.y,locked:ci%2===0,active:true,reward:chestRewards[ci%chestRewards.length],roomId:r.id});ci++}

    return{enemies,items,doors,chests,keysCollected:0,exitOpen:false,revision:1};
  }

  function doorAt(host,x,y){return host?.doors?.find(d=>d.x===x&&d.y===y)||null}
  function chestAt(host,x,y){return host?.chests?.find(c=>c.active&&c.x===x&&c.y===y)||null}
  function walkable(map,x,y,host=null){
    if(x<0||y<0||x>=C.worldWidth||y>=C.worldHeight||map[y][x]!==0)return false;
    if(host?.blockingDecor?.some(q=>q.x===x&&q.y===y))return false;
    const d=doorAt(host,x,y);if(!d)return true;
    return Boolean(d.open)&&!d.locked;
  }
  function tunnelDestination(w,x,y,dx,dy){if(y!==w.tunnelY||dy!==0)return null;if(x===1&&dx<0)return{x:C.worldWidth-2,y};if(x===C.worldWidth-2&&dx>0)return{x:1,y};return null}
  function roomAt(w,x,y){for(let i=w.rooms.length-1;i>=0;i--){const r=w.rooms[i];if(inside(r,{x,y}))return r.id}return -1}
  function sameRoom(w,a,b){const ra=roomAt(w,a.x,a.y),rb=roomAt(w,b.x,b.y);return ra>=0&&ra===rb}
  function themeAt(w,x,y){const id=roomAt(w,x,y),r=id>=0?w.rooms[id]:null;return r?(THEMES[r.theme]||THEMES.C64_ARCHIVE):THEMES.WARP_GALLERY}

  return{hashString:hash,generate,createHostState,walkable,tunnelDestination,roomAt,sameRoom,themeAt,doorAt,chestAt,themes:THEMES};
})();
