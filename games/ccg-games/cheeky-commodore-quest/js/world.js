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
  function attachBonusRoom(map,source,index,rooms){
    const cx=source.x+2+((source.id*7+index*3)%Math.max(1,source.w-3)),cy=source.y+2+((source.id*5+index*7)%Math.max(1,source.h-3));
    const opts=[
      {door:{x:source.x+source.w+1,y:cy},box:{x1:source.x+source.w+2,y1:cy-3,x2:source.x+source.w+9,y2:cy+3}},
      {door:{x:source.x-1,y:cy},box:{x1:source.x-9,y1:cy-3,x2:source.x-2,y2:cy+3}},
      {door:{x:cx,y:source.y+source.h+1},box:{x1:cx-3,y1:source.y+source.h+2,x2:cx+3,y2:source.y+source.h+8}},
      {door:{x:cx,y:source.y-1},box:{x1:cx-3,y1:source.y-8,x2:cx+3,y2:source.y-2}}
    ];
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

  function generate(seedText){
    const random=rng(hash(seedText));
    const map=Array.from({length:C.worldHeight},()=>Array(C.worldWidth).fill(1));
    const root={rect:{x:1,y:1,w:C.worldWidth-2,h:C.worldHeight-2},random};splitBSP(root.rect,root,0);
    const rooms=[],edges=[];createRooms(root,map,rooms,random);connectTree(root,map,rooms,edges,random);
    const graph=graphFor(rooms,edges);
    let startRoom=0,best=Infinity;for(const r of rooms){const c=centre(r),v=c.x+c.y;if(v<best){best=v;startRoom=r.id}}
    const gd=graphDistances(graph,startRoom);let exitRoom=startRoom,maxD=-1;for(let i=0;i<gd.d.length;i++)if(gd.d[i]!==Infinity&&gd.d[i]>maxD){maxD=gd.d[i];exitRoom=i}
    rooms[startRoom].theme="C64_ARCHIVE";rooms[exitRoom].theme="ZZAP_LIBRARY";
    rooms.forEach(r=>r.depth=gd.d[r.id]===Infinity?0:gd.d[r.id]);
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
    for(let pass=0;pass<3&&bonusIndex<C.dungeon.maxLockedBranches;pass++){
      for(const source of sourceRooms){
        if(bonusIndex>=C.dungeon.maxLockedBranches)break;
        const d=attachBonusRoom(map,source,bonusIndex,rooms);if(!d)continue;
        doorSpecs.push(d);lockedRooms.add(d.roomId);const room=rooms[d.roomId];
        for(let y=room.y;y<=room.y+room.h;y++)for(let x=room.x;x<=room.x+room.w;x++)optionalCells.add(cell(x,y));optionalCells.add(cell(d.x,d.y));bonusIndex++;
      }
    }

    while(graph.length<rooms.length)graph.push([]);return{map,rooms,edges,graph,start:centre(rooms[startRoom]),exit:centre(rooms[exitRoom]),startRoomId:startRoom,exitRoomId:exitRoom,random,tunnelY,doorSpecs,optionalCells,lockedRooms};
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
    if(ccg&&w.random()<ccgChance){const room=eliteRooms[(floor*5+1)%eliteRooms.length]||openRooms[0],p=pickInRoom(w,room,used);enemies.push({id:`ccg-f${floor}`,...p,kind:ccg.kind,hp:20,maxHp:20,armor:5,maxArmor:5,alive:true,follower:ccg,ccgBoss:true,moveSpeedScale:.5,namedDamageScale:2,...aiFields(w)})}

    const items=[];
    const keyRooms=[...openRooms].sort((a,b)=>b.depth-a.depth).filter((r,i)=>i%2===0).slice(0,C.keyTarget);
    while(keyRooms.length<C.keyTarget)keyRooms.push(openRooms[keyRooms.length]);
    keyRooms.forEach((room,i)=>{const p=pickInRoom(w,room,used);items.push({id:`key${i}`,...p,kind:"key",active:true})});

    const cycle=["health","ammo","game","credits","torch","armour","potion","weapon","rapid","xpOrb","teleport","health","ammo","torch","game","credits"];
    for(let i=0;i<42;i++){const p=pick(w,used,9,false);items.push({id:`p${i}`,...p,kind:cycle[i%cycle.length],title:C.c64Loot[i%C.c64Loot.length],active:true})}

    const doors=w.doorSpecs.map(d=>({id:d.id,x:d.x,y:d.y,roomId:d.roomId,locked:true,type:"bronze",open:false,opening:false,openingStart:0,openAt:0}));
    // Bronze keys are balanced after every lock, puzzle and reward chest has been installed.
    // Do not seed speculative spares here: surplus keys made later floors feel cluttered.

    const chestRewards=["weapon","armour","potion","torch","ammo","rapid","health","weapon","armour","potion","torch","ammo","weapon","armour"];
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
