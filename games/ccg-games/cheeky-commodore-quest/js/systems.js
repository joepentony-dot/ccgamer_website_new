window.CCGSystems=(()=>{
  "use strict";
  const C=window.CCG_CONFIG,W=window.CCGWorld,PGR=window.CCGProgression;
  const DIRS=[[1,0],[-1,0],[0,1],[0,-1]];
  const cell=(x,y)=>`${x},${y}`;
  const centre=r=>({x:Math.floor(r.x+r.w/2),y:Math.floor(r.y+r.h/2)});
  const inside=(r,p)=>p.x>=r.x&&p.x<=r.x+r.w&&p.y>=r.y&&p.y<=r.y+r.h;
  const md=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y);

  function uniquePush(arr,obj,keyFn=o=>`${o.x},${o.y}`){const k=keyFn(obj);if(!arr.some(x=>keyFn(x)===k))arr.push(obj)}
  function edgeDoorForRoom(edge,room){
    const path=edge.a===room.id?edge.path:[...edge.path].reverse();
    let lastInside=null;
    for(const point of path){
      if(inside(room,point)){lastInside=point;continue}
      if(lastInside){
        const dx=point.x-lastInside.x,dy=point.y-lastInside.y;
        const side=dx>0?"east":dx<0?"west":dy>0?"south":"north";
        const orientation=dx!==0?"vertical":"horizontal";
        return{...lastInside,roomId:room.id,side,orientation};
      }
    }
    return null;
  }
  function thresholdCells(world,room,d){
    const outward=d.side==="east"?{x:1,y:0}:d.side==="west"?{x:-1,y:0}:d.side==="south"?{x:0,y:1}:{x:0,y:-1};
    const offsets=d.orientation==="vertical"?[[0,-1],[0,0],[0,1]]:[[-1,0],[0,0],[1,0]];
    const valid=offsets.map(([dx,dy])=>({x:d.x+dx,y:d.y+dy})).filter(q=>inside(room,q)&&world.map[q.y]?.[q.x]===0&&world.map[q.y+outward.y]?.[q.x+outward.x]===0);
    const centreIndex=valid.findIndex(q=>q.x===d.x&&q.y===d.y);if(centreIndex<0)return[d];
    let lo=centreIndex,hi=centreIndex;while(lo>0&&md(valid[lo-1],valid[lo])===1)lo--;while(hi+1<valid.length&&md(valid[hi],valid[hi+1])===1)hi++;
    return valid.slice(lo,hi+1).slice(0,2).map(q=>({...d,...q}));
  }
  function inferDoorGeometry(world,d){
    if(d.orientation)return d;
    const left=world.map[d.y]?.[d.x-1]===0,right=world.map[d.y]?.[d.x+1]===0,up=world.map[d.y-1]?.[d.x]===0,down=world.map[d.y+1]?.[d.x]===0;
    if(left&&right&&!up&&!down){d.orientation="vertical";d.side="wall"}
    else if(up&&down&&!left&&!right){d.orientation="horizontal";d.side="wall"}
    else if(left&&right){d.orientation="vertical";d.side="wall"}
    else{d.orientation="horizontal";d.side="wall"}
    return d;
  }
  function roomDoorSet(world){
    const doors=[];
    for(const room of world.rooms.filter(r=>!r.optional)){
      const edges=world.edges.filter(e=>e.a===room.id||e.b===room.id);
      for(const e of edges){
        const d=edgeDoorForRoom(e,room);
        if(d){const span=thresholdCells(world,room,d),group=`room-${room.id}-${e.a}-${e.b}-${d.side}`;for(const [leaf,q] of span.entries())uniquePush(doors,{id:`${group}-${leaf}`,groupId:group,leaf,span:span.length,x:q.x,y:q.y,roomId:room.id,locked:false,type:"room",hidden:false,orientation:d.orientation,side:d.side,open:false,opening:false,openingStart:0,openAt:0})}
      }
    }
    const groups=new Map();for(const d of doors){if(!groups.has(d.groupId))groups.set(d.groupId,[]);groups.get(d.groupId).push(d)}for(const leaves of groups.values())for(const d of leaves)d.span=leaves.length;
    return doors;
  }
  function openRooms(world){return world.rooms.filter(r=>!r.optional&&r.id!==world.startRoomId)}
  function deepRooms(world){return [...openRooms(world)].sort((a,b)=>(b.depth||0)-(a.depth||0))}
  function freeInRoom(world,room,used){
    const a=[];for(let y=room.y+1;y<room.y+room.h;y++)for(let x=room.x+1;x<room.x+room.w;x++){if(world.map[y]?.[x]!==0)continue;if(used.has(cell(x,y)))continue;a.push({x,y})}
    if(!a.length)return centre(room);const q=a[Math.floor(world.random()*a.length)];used.add(cell(q.x,q.y));return q;
  }
  function freeNear(world,room,origin,used,minDist=2,maxDist=5){
    const a=[];for(let y=room.y+1;y<room.y+room.h;y++)for(let x=room.x+1;x<room.x+room.w;x++){const q={x,y},d=md(q,origin);if(world.map[y]?.[x]!==0||used.has(cell(x,y))||d<minDist||d>maxDist)continue;a.push(q)}
    a.sort((u,v)=>md(u,origin)-md(v,origin));const q=a[0]||freeInRoom(world,room,used);if(q)used.add(cell(q.x,q.y));return q
  }
  function wallTorchPositions(room){
    const c=centre(room);return[{x:room.x+1,y:c.y},{x:room.x+room.w-1,y:c.y}].filter(p=>p.x>0&&p.y>0);
  }
  function carveSecretPassages(world,host,used,run){
    const desired=Math.max(0,C.dungeon.secretPassages||0),made=[];if(!desired)return made;
    const candidates=deepRooms(world).filter(r=>!r.sanctuary&&r.id!==world.startRoomId&&r.id!==world.exitRoomId);
    const allWalls=(cells)=>cells.every(q=>q.x>2&&q.y>2&&q.x<C.worldWidth-3&&q.y<C.worldHeight-3&&world.map[q.y]?.[q.x]===1);
    for(const room of candidates){
      if(made.length>=desired)break;
      const insetX=room.x+2+((room.id*7+(run?.floor||1)*3)%Math.max(1,room.w-3));
      const insetY=room.y+2+((room.id*5+(run?.floor||1)*7)%Math.max(1,room.h-3));
      const sides=[
        {name:"east",dx:1,dy:0,door:{x:room.x+room.w+1,y:insetY},orientation:"vertical"},
        {name:"west",dx:-1,dy:0,door:{x:room.x-1,y:insetY},orientation:"vertical"},
        {name:"south",dx:0,dy:1,door:{x:insetX,y:room.y+room.h+1},orientation:"horizontal"},
        {name:"north",dx:0,dy:-1,door:{x:insetX,y:room.y-1},orientation:"horizontal"}
      ];
      let built=false;
      for(const side of sides){
        const path=[];for(let step=0;step<=4;step++)path.push({x:side.door.x+side.dx*step,y:side.door.y+side.dy*step});
        const end=path[path.length-1],pocket=[];
        if(side.dx){for(let yy=end.y-1;yy<=end.y+1;yy++)for(let xx=end.x;xx<=end.x+side.dx*2;xx+=side.dx)pocket.push({x:xx,y:yy})}
        else{for(let xx=end.x-1;xx<=end.x+1;xx++)for(let yy=end.y;yy<=end.y+side.dy*2;yy+=side.dy)pocket.push({x:xx,y:yy})}
        const carve=[...path,...pocket].filter((q,i,a)=>a.findIndex(z=>z.x===q.x&&z.y===q.y)===i);if(!allWalls(carve))continue;
        for(const q of carve)world.map[q.y][q.x]=0;
        const id=`secret-passage-${made.length}`,door={id,x:side.door.x,y:side.door.y,roomId:room.id,locked:true,type:"secret",hidden:true,cracked:true,open:false,opening:false,openingStart:0,openAt:0,orientation:side.orientation,side:side.name,secretPassage:true};host.doors.push(door);used.add(cell(door.x,door.y));
        const chestPos={x:end.x+side.dx,y:end.y+side.dy};host.chests.push({id:`${id}-chest`,...chestPos,locked:false,active:true,depth:(room.depth||0)+5,roomId:room.id,secretPassage:true});used.add(cell(chestPos.x,chestPos.y));made.push(door);built=true;break;
      }
      if(built&&made.length>=desired)break;
    }
    world.secretPassages=made.map(d=>d.id);return made;
  }
  const furnitureByTheme={
    C64_ARCHIVE:["bookcase","tapeStack","desk","cabinet","roundChair"],
    "1541_WORKSHOP":["driveBench","terminal","crate","cable","roundChair"],
    BUDGET_BIN:["bin","crate","display","bookcase","roundChair"],
    DEMO_LOUNGE:["console","speaker","lightBar","roundChair","table"],
    ARMOURY:["rack","crate","bench","shield","pillar"],
    CPU_KITCHEN:["table","counter","oven","crate","roundChair"],
    SID_REACTOR:["reactor","console","pipe","coil","pool"],
    WARP_GALLERY:["arch","obelisk","console","bench","pool"],
    ZZAP_LIBRARY:["bookcase","readingDesk","display","cabinet","roundChair"],
    TAPE_STORE:["tapeStack","bookcase","counter","crate","roundChair"],
    CARTRIDGE_BAY:["slotRack","terminal","crate","bench","roundChair"],
    CRACKED_INTRO:["console","speaker","lightBar","terminal","pool"],
    PIXEL_FOUNDRY:["oven","driveBench","pipe","anvil","crate"],
    MODEM_EXCHANGE:["terminal","desk","cable","cabinet","roundChair"],
    HIGH_SCORE_CRYPT:["statue","pedestal","cabinet","pillar","candleSconce"],
    CRT_MAZE:["display","terminal","console","cable","roundChair"],
    TREASURE_VAULT:["pedestal","crate","statue","chestPile","pillar"]
  };
  const nonBlockingDecor=new Set(["cable","pipe","lightBar","candleSconce"]);
  function decorBlocking(type){return !nonBlockingDecor.has(type)}
  function chooseGrandHall(world,host,run){
    const busy=new Set();
    for(const x of host.generators||[])busy.add(x.roomId);if(host.rescue)busy.add(host.rescue.roomId);if(host.trader)busy.add(host.trader.roomId);if(host.sigilRoomId!=null)busy.add(host.sigilRoomId);
    for(const a of host.arenas||[])busy.add(a.roomId);for(const t of host.timedRooms||[])busy.add(t.roomId);
    const candidates=world.rooms.filter(r=>!r.optional&&!r.sanctuary&&r.id!==world.startRoomId&&r.id!==world.exitRoomId&&!busy.has(r.id)&&!r.memoryPuzzleRoom&&!r.sequenceTorchRoom&&!r.weightBridgeRoom).sort((a,b)=>(b.w*b.h)-(a.w*a.h));
    const room=candidates.find(r=>r.w>=11&&r.h>=8)||candidates[0]||null;if(!room)return null;
    room.grandHall=true;room.grandHallAxis=room.w>=room.h?"horizontal":"vertical";room.grandHallTitle=(run?.floor||1)>=5?"ZZAP! GRAND HALL":"COMMODORE GRAND HALL";return room
  }
  function decorateFurniture(world,host,rooms,used,run){
    world.decor=[];host.blockingDecor=[];const reserved=new Set((world.wallLights||[]).map(x=>cell(x.x,x.y))),doors=host.doors||[],grand=chooseGrandHall(world,host,run);
    const tooCloseToDoor=q=>doors.some(d=>md(d,q)<=2);
    const tooCloseToUsed=q=>used.has(cell(q.x,q.y))||used.has(cell(q.x-1,q.y))||used.has(cell(q.x+1,q.y))||used.has(cell(q.x,q.y-1))||used.has(cell(q.x,q.y+1));
    const addDecor=(room,q,type,variant=0,blocking=decorBlocking(type))=>{
      if(!q||world.map[q.y]?.[q.x]!==0||used.has(cell(q.x,q.y))||reserved.has(cell(q.x,q.y)))return false;
      if(blocking&&(tooCloseToDoor(q)||tooCloseToUsed(q)))return false;
      if(blocking){used.add(cell(q.x,q.y));host.blockingDecor.push({x:q.x,y:q.y,type,roomId:room.id})}
      reserved.add(cell(q.x,q.y));world.decor.push({id:`decor-${room.id}-${world.decor.length}`,x:q.x,y:q.y,roomId:room.id,type,variant,blocking});return true
    };
    for(const room of world.rooms){
      room.variant=(room.id*5+(run?.floor||1)*3+(room.depth||0))%7;room.signature=(room.id*37+(run?.floor||1)*53+(room.depth||0)*11)%256;
      const list=furnitureByTheme[room.theme]||["crate","bench","terminal","roundChair"],target=C.dungeon.furnitureMin+((room.id+room.variant)%Math.max(1,C.dungeon.furnitureMax-C.dungeon.furnitureMin+1)),spots=[];
      for(let x=room.x+2;x<=room.x+room.w-2;x++){spots.push({x,y:room.y+1},{x,y:room.y+room.h-1})}
      for(let y=room.y+2;y<=room.y+room.h-2;y++){spots.push({x:room.x+1,y},{x:room.x+room.w-1,y})}
      let placed=0;
      for(let tries=0;tries<spots.length*3&&placed<target;tries++){const q=spots[(room.id*11+tries*7+room.variant*3)%spots.length];if(!q)continue;const type=list[(placed+room.variant+tries)%list.length];if(addDecor(room,q,type,(placed+room.id)%4)){placed++}}
      // A few recognisable interior objects make rooms read as places rather than empty boxes.
      if(!room.optional&&!room.sigilRoom&&room.w>=9&&room.h>=7){
        const cx=Math.floor(room.x+room.w/2),cy=Math.floor(room.y+room.h/2),interiors=[
          {x:cx-2,y:cy+2,type:"roundChair"},{x:cx+2,y:cy+2,type:"roundChair"},
          {x:cx,y:cy+2,type:(room.id+room.variant)%5===0?"pool":"table"}
        ];
        for(const q of interiors)if((room.id+q.x+q.y)%3===0)addDecor(room,q,q.type,(room.id+q.x)%4,true)
      }
      // Wall candle sconces are non-blocking light-detail and can sit close to the perimeter.
      if(room.w>=8){const cy=Math.floor(room.y+room.h/2);addDecor(room,{x:room.x+1,y:cy},"candleSconce",room.id%3,false)}
    }
    if(grand){
      const cx=Math.floor(grand.x+grand.w/2),cy=Math.floor(grand.y+grand.h/2),pillars=[];
      if(grand.grandHallAxis==="horizontal")for(const x of [grand.x+3,grand.x+grand.w-3])for(const y of [grand.y+2,grand.y+grand.h-2])pillars.push({x,y});
      else for(const y of [grand.y+3,grand.y+grand.h-3])for(const x of [grand.x+2,grand.x+grand.w-2])pillars.push({x,y});
      for(const q of pillars)addDecor(grand,q,"pillar",1,true);
      addDecor(grand,{x:cx,y:grand.y+2},"table",2,true);addDecor(grand,{x:cx-1,y:grand.y+2},"roundChair",1,true);addDecor(grand,{x:cx+1,y:grand.y+2},"roundChair",3,true);
      grand.grandHallDecor=true
    }
  }
  function installBoulderTrap(world,host,run){
    host.boulderTrap=null;if((run?.floor||1)!==(C.dungeon.boulderFloor||4))return null;
    const busy=new Set([world.startRoomId,world.exitRoomId,host.sigilRoomId,host.trader?.roomId,host.startShop?.roomId].filter(x=>x!=null));
    for(const g of host.generators||[])busy.add(g.roomId);for(const a of host.arenas||[])busy.add(a.roomId);for(const t of host.timedRooms||[])busy.add(t.roomId);if(host.rescue)busy.add(host.rescue.roomId);if(host.guardian)busy.add(W.roomAt(world,host.guardian.x,host.guardian.y));
    if(host.bloodClue)busy.add(host.bloodClue.roomId);if(host.memoryPuzzle)busy.add(host.memoryPuzzle.roomId);if(host.sequenceTorchPuzzle)busy.add(host.sequenceTorchPuzzle.roomId);if(host.weightBridge)busy.add(host.weightBridge.roomId);
    const occupied=(x,y)=>world.map[y]?.[x]!==0||(host.blockingDecor||[]).some(d=>d.x===x&&d.y===y)||(host.doors||[]).some(d=>d.x===x&&d.y===y)||(host.items||[]).some(i=>i.active&&i.x===x&&i.y===y)||(host.chests||[]).some(c=>c.active&&c.x===x&&c.y===y)||(host.enemies||[]).some(e=>e.alive&&e.x===x&&e.y===y);
    const candidates=[...world.rooms].filter(r=>!busy.has(r.id)&&!r.sanctuary&&!r.sigilRoom).sort((a,b)=>Number(b.optional)-Number(a.optional)||(b.w*b.h-a.w*a.h));
    for(const room of candidates){
      const cx=Math.floor(room.x+room.w/2),cy=Math.floor(room.y+room.h/2),lanes=[];
      if(room.w>=10)for(const y of [cy,cy-1,cy+1])lanes.push({axis:'horizontal',start:{x:room.x+2,y},end:{x:room.x+room.w-2,y}});
      if(room.h>=10)for(const x of [cx,cx-1,cx+1])lanes.push({axis:'vertical',start:{x,y:room.y+2},end:{x,y:room.y+room.h-2}});
      for(const lane of lanes){const cells=[];if(lane.axis==='horizontal'){for(let x=lane.start.x;x<=lane.end.x;x++)cells.push({x,y:lane.start.y})}else{for(let y=lane.start.y;y<=lane.end.y;y++)cells.push({x:lane.start.x,y})}if(cells.length<7||cells.some(q=>occupied(q.x,q.y)))continue;
        room.boulderRoom=true;host.boulderTrap={id:`boulder-floor-${run.floor}`,roomId:room.id,axis:lane.axis,start:{...lane.start},end:{...lane.end},x:lane.start.x,y:lane.start.y,dx:0,dy:0,target:{...lane.end},active:false,triggered:false,cleared:false,warningMs:0,moveMs:0,stepMs:155,damage:2};return host.boulderTrap
      }
    }
    return null
  }

  function torchSequenceFor(run){
    if(Array.isArray(run?.torchSequence)&&run.torchSequence.length===4)return [...run.torchSequence];
    const seq=["N","E","S","W"],r=PGR.seededRandom(`${run?.seed||"CCG"}-V10.1-TORCH-SEQUENCE`);
    for(let i=seq.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[seq[i],seq[j]]=[seq[j],seq[i]]}
    if(run)run.torchSequence=[...seq];return seq
  }
  function memorySequenceFor(run){
    const r=PGR.seededRandom(`${run?.seed||"CCG"}-F${run?.floor||1}-V10.1-MEMORY`),out=[];
    while(out.length<5){const n=Math.floor(r()*9);if(n!==out[out.length-1])out.push(n)}return out
  }
  function roomHasCoreFeature(host,roomId){
    return (host.generators||[]).some(x=>x.roomId===roomId)||host.rescue?.roomId===roomId||(host.guardian&&host.worldRef&&W.roomAt(host.worldRef,host.guardian.x,host.guardian.y)===roomId)||(host.arenas||[]).some(x=>x.roomId===roomId)||(host.timedRooms||[]).some(x=>x.roomId===roomId)
  }
  function puzzleRoomPool(world,host,rooms){
    return rooms.filter(r=>r.id!==world.startRoomId&&r.id!==world.exitRoomId&&!r.sanctuary&&!roomHasCoreFeature(host,r.id))
  }
  function findClearSquare(world,room,used,size=3){
    for(let y=room.y+2;y<=room.y+room.h-size-1;y++)for(let x=room.x+2;x<=room.x+room.w-size-1;x++){
      const cells=[];let ok=true;for(let yy=0;yy<size;yy++)for(let xx=0;xx<size;xx++){const q={x:x+xx,y:y+yy};if(world.map[q.y]?.[q.x]!==0||used.has(cell(q.x,q.y))){ok=false;break}cells.push(q)}if(ok)return cells
    }return null
  }
  function torchSetForRoom(world,room,used){
    const c=centre(room),pts=[{dir:"N",x:c.x,y:room.y+1},{dir:"E",x:room.x+room.w-1,y:c.y},{dir:"S",x:c.x,y:room.y+room.h-1},{dir:"W",x:room.x+1,y:c.y}];
    if(pts.some(q=>world.map[q.y]?.[q.x]!==0||used.has(cell(q.x,q.y))))return null;return pts
  }
  function firstFreeCell(world,room,used,pred=()=>true){
    for(let y=room.y+1;y<room.y+room.h;y++)for(let x=room.x+1;x<room.x+room.w;x++){const q={x,y};if(world.map[y]?.[x]===0&&!used.has(cell(x,y))&&pred(q))return q}return null
  }
  function optionalEntranceSide(room,gate){if(gate.x<room.x)return"west";if(gate.x>room.x+room.w)return"east";if(gate.y<room.y)return"north";return"south"}
  function makeWeightBridge(world,host,room,gate,used){
    const side=optionalEntranceSide(room,gate),cx=Math.floor(room.x+room.w/2),cy=Math.floor(room.y+room.h/2),pit=[],bridge=[];
    if(side==="west"||side==="east"){
      for(let x=cx-1;x<=cx+1;x++)for(let y=room.y;y<=room.y+room.h;y++){const q={x,y};if(y===cy)bridge.push(q);else pit.push(q)}
    }else{
      for(let y=cy-1;y<=cy+1;y++)for(let x=room.x;x<=room.x+room.w;x++){const q={x,y};if(x===cx)bridge.push(q);else pit.push(q)}
    }
    if([...pit,...bridge].some(q=>world.map[q.y]?.[q.x]!==0))return null;
    const far=q=>side==="west"?q.x>cx+2:side==="east"?q.x<cx-2:side==="north"?q.y>cy+2:q.y<cy-2;
    let reward=firstFreeCell(world,room,used,far);if(!reward){reward=firstFreeCell(world,room,used,q=>side==="west"?q.x>cx:side==="east"?q.x<cx:side==="north"?q.y>cy:q.y<cy)}if(!reward)return null;
    for(const q of bridge)used.add(cell(q.x,q.y));used.add(cell(reward.x,reward.y));
    gate.type="room";gate.locked=false;gate.hidden=false;gate.weightBridgeGate=true;
    let chest=(host.chests||[]).find(c=>c.roomId===room.id);if(!chest){chest={id:"weight-bridge-chest",...reward,locked:false,active:true,depth:(room.depth||0)+7,roomId:room.id};host.chests.push(chest)}else{chest.x=reward.x;chest.y=reward.y;chest.locked=false;chest.active=true;chest.depth=(room.depth||0)+7}chest.weightBridgeReward=true;
    room.weightBridgeRoom=true;return{id:"weight-bridge",roomId:room.id,entranceSide:side,pitTiles:pit,bridgeTiles:bridge,stabilized:false,crossingPlayer:null,rewardPos:{...reward},chestId:chest.id}
  }
  function installOptionalPuzzles(world,host,run,rooms,used){
    host.bloodClue=null;host.memoryPuzzle=null;host.sequenceTorchPuzzle=null;host.weightBridge=null;const floor=run?.floor||1,seq=torchSequenceFor(run),pool=puzzleRoomPool(world,host,rooms);
    if(floor===C.dungeon.clueFloor){const room=pool[0]||rooms[0],q=room&&freeInRoom(world,room,used);if(room&&q){host.bloodClue={id:"faded-blood-clue",...q,roomId:room.id,sequence:[...seq],seen:false};room.bloodClueRoom=true}}
    if(floor===C.dungeon.memoryPuzzleFloor){for(const room of pool){const tiles=findClearSquare(world,room,used,3);if(!tiles)continue;for(const q of tiles)used.add(cell(q.x,q.y));let reward=firstFreeCell(world,room,used,q=>!tiles.some(t=>md(t,q)<2));if(!reward)reward=centre(room);used.add(cell(reward.x,reward.y));const chest={id:"memory-puzzle-chest",...reward,locked:false,active:false,depth:(room.depth||0)+7,roomId:room.id,memoryPuzzleReward:true};host.chests.push(chest);host.memoryPuzzle={id:"memory-puzzle",roomId:room.id,tiles:tiles.map((q,i)=>({...q,index:i})),sequence:memorySequenceFor(run),phase:"idle",flashElapsed:0,flashTile:-1,inputIndex:0,solved:false,failures:0,rewardPos:{...reward},chestId:chest.id};room.memoryPuzzleRoom=true;break}}
    if(floor===C.dungeon.torchPuzzleFloor){for(const room of pool){const torches=torchSetForRoom(world,room,used);if(!torches)continue;for(const q of torches)used.add(cell(q.x,q.y));let reward=firstFreeCell(world,room,used,q=>torches.every(t=>md(t,q)>2));if(!reward)continue;used.add(cell(reward.x,reward.y));const chest={id:"sequence-torch-vault",...reward,locked:false,active:false,depth:(room.depth||0)+9,roomId:room.id,torchPuzzleReward:true};host.chests.push(chest);host.sequenceTorchPuzzle={id:"sequence-torch-puzzle",roomId:room.id,sequence:[...seq],torches:torches.map(q=>({...q,lit:false})),progress:0,solved:false,failures:0,rewardPos:{...reward},chestId:chest.id};room.sequenceTorchRoom=true;break}}
    if(floor===C.dungeon.weightBridgeFloor){const choices=world.rooms.filter(r=>r.optional&&r.id!==host.sigilRoomId&&r.id!==host.trader?.roomId).map(room=>({room,gate:(host.doors||[]).find(d=>d.roomId===room.id&&!d.sigilGate)})).filter(x=>x.gate).sort((a,b)=>(b.room.depth||0)-(a.room.depth||0));for(const x of choices){const b=makeWeightBridge(world,host,x.room,x.gate,used);if(b){host.weightBridge=b;break}}}
  }

  function decorate(world,host,run){
    host.worldRef=world;
    const used=new Set([cell(world.start.x,world.start.y),cell(world.exit.x,world.exit.y)]);
    for(const i of host.items||[])used.add(cell(i.x,i.y));for(const e of host.enemies||[])used.add(cell(e.x,e.y));for(const c of host.chests||[])used.add(cell(c.x,c.y));
    const rooms=deepRooms(world),ordinary=roomDoorSet(world);
    host.doors=[...ordinary,...(host.doors||[])];
    host.doors.forEach(d=>{inferDoorGeometry(world,d);d.open=false;d.opening=false;d.openingStart=0;d.openAt=0});

    // Every room gets a visible threshold door. Optional branches are then assigned distinct lock mechanics.
    const bonus=host.doors.filter(d=>d.type!=="room");
    bonus.forEach((d,i)=>{if(i<C.dungeon.secretRooms){d.type="secret";d.locked=true;d.hidden=true}else if(i===C.dungeon.secretRooms){d.type="switch";d.locked=true;d.hidden=false}else{d.type="bronze";d.locked=true;d.hidden=false}});
    // Additional hidden wall passages create optional shortcuts/loot pockets without touching the mandatory route.
    carveSecretPassages(world,host,used,run);

    world.sanctuaryRooms=[];world.wallLights=[];
    const sanctuaryPool=rooms.filter(r=>r.id!==world.exitRoomId).slice(-Math.min(10,rooms.length));
    for(let i=0;i<Math.min(C.dungeon.sanctuaryRooms,sanctuaryPool.length);i++){
      const room=sanctuaryPool[(i*3+1)%sanctuaryPool.length];if(!room)continue;room.sanctuary=true;world.sanctuaryRooms.push(room.id);
      for(const q of wallTorchPositions(room))world.wallLights.push({...q,roomId:room.id,radius:10,permanent:true,kind:"sanctuary"});
    }
    const lightPool=rooms.filter(r=>!r.sanctuary&&r.id!==world.exitRoomId);
    for(let i=0;i<Math.min(C.dungeon.wallTorchRooms,lightPool.length);i++){
      const room=lightPool[(i*5+2)%lightPool.length];if(!room)continue;for(const q of wallTorchPositions(room).slice(0,1))world.wallLights.push({...q,roomId:room.id,radius:7,permanent:true,kind:"wall"});
    }

    host.traps=[];
    const trapRooms=rooms.filter(r=>!r.sanctuary&&r.id!==world.exitRoomId);
    for(let i=0;i<Math.min(C.dungeon.trapCount,trapRooms.length*2);i++){
      const room=trapRooms[(i*7+3)%trapRooms.length],q=freeInRoom(world,room,used);host.traps.push({id:`trap${i}`,...q,roomId:room.id,kind:i%3===0?"fire":i%3===1?"spike":"shock",phase:Math.floor(world.random()*1800),period:1800+(i%3)*350,active:true});
    }

    host.generators=[];
    const genCount=PGR.objectiveFor(run)==="generators"?C.dungeon.generatorCount:Math.min(2,C.dungeon.generatorCount);
    for(let i=0;i<Math.min(genCount,rooms.length);i++){
      const room=rooms[i],q=freeInRoom(world,room,used);host.generators.push({id:`gen${i}`,...q,roomId:room.id,hp:5+(run.floor||1),maxHp:5+(run.floor||1),alive:true,spawnCooldown:6000+Math.floor(world.random()*2500),spawnKills:0,spawnTotal:0});
    }

    host.shrines=[];
    for(let i=0;i<Math.min(2,rooms.length);i++){const room=rooms[(i*6+4)%rooms.length],q=freeInRoom(world,room,used);host.shrines.push({id:`shrine${i}`,...q,roomId:room.id,active:true})}

    host.switches=[];
    const switchDoor=host.doors.find(d=>d.type==="switch");if(switchDoor){const room=rooms[Math.min(rooms.length-1,5)]||rooms[0],q=freeInRoom(world,room,used);host.switches.push({id:"switch0",...q,active:true,doorId:switchDoor.id,wallMounted:true,remote:false})}
    const remoteSecret=host.doors.find(d=>d.type==="secret"&&d.hidden);if(remoteSecret&&rooms.length){const room=rooms[Math.min(rooms.length-1,8)]||rooms[0],q=freeInRoom(world,room,used);host.switches.push({id:"remote-secret-switch",...q,active:true,doorId:remoteSecret.id,wallMounted:true,remote:true,revealSecret:true})}

    host.deathCaches=[];
    // Per-floor persistent knowledge/state. These reset only when a new floor is generated.
    host.radarSigilSeen=null;host.radarSigilGateSeen=null;host.defeatedDeathStalkers=[];

    host.arenas=[];if(rooms.length){const room=rooms[Math.floor(rooms.length*.55)];host.arenas.push({id:"arena0",roomId:room.id,triggered:false,cleared:false,wave:0,rewarded:false})}
    host.timedRooms=[];if(rooms.length>3){const room=rooms[Math.floor(rooms.length*.7)];host.timedRooms.push({id:"timed0",roomId:room.id,triggered:false,cleared:false,timeLeft:30000,rewarded:false})}

    const obj=PGR.objectiveFor(run);
    host.objective={type:obj,progress:0,target:obj==="keys"?C.keyTarget:obj==="generators"?host.generators.length:obj==="rescue"?1:obj==="explore_guardian"?70:1,complete:false};
    host.rescue=null;if(obj==="rescue"&&rooms.length){const room=rooms[0],q=freeInRoom(world,room,used);host.rescue={id:"rescue0",...q,roomId:room.id,name:"Trapped CCG Scout",found:false,following:false,rescued:false,x0:q.x,y0:q.y}}

    host.guardian=null;
    if(obj==="guardian"||obj==="explore_guardian"){
      const room=world.rooms[world.exitRoomId],q=freeInRoom(world,room,used);host.guardian={id:"guardian0",...q,kind:"guardian",hp:16+run.floor*4,maxHp:16+run.floor*4,alive:true,aiState:"idle",facing:{x:-1,y:0},lastSeen:null,memoryMs:0,searchMs:0,moveCooldown:900,attackCooldown:850,chargeCooldown:1200,healCooldown:999999,flash:0,guardian:true,weakness:run.floor%2?"fire":"shock"};host.enemies.push(host.guardian)
    }

    // Champion enemies have more health, distinct weaknesses and better drops.
    const normal=host.enemies.filter(e=>!e.follower&&!e.guardian);for(let i=0;i<Math.min(5,normal.length);i++){
      const e=normal[(i*6+2)%normal.length];if(!e)continue;e.champion=true;e.kind=e.kind||"champion";e.maxHp=Math.ceil(e.maxHp*1.8);e.hp=e.maxHp;e.weakness=["fire","energy","shock","physical"][i%4];e.championName=["Raster Baron","Tape Tyrant","Joystick Warden","1541 Overlord","SID Butcher"][i%5];
    }

    // Treasure goblin: kill it before it escapes for high-rarity loot.
    if(rooms.length>4){const room=rooms[Math.floor(rooms.length*.4)],q=freeInRoom(world,room,used);host.enemies.push({id:"treasure-goblin",...q,kind:"treasure",hp:4,maxHp:4,alive:true,aiState:"idle",facing:{x:1,y:0},lastSeen:null,memoryMs:0,searchMs:0,moveCooldown:700,attackCooldown:999999,chargeCooldown:0,healCooldown:999999,flash:0,treasureGoblin:true,escapeMs:22000})}

    // The Sigil chamber uses a generated optional annex rather than an ordinary BSP room.
    // Optional annexes are carved as isolated one-door pockets, so sealing this gate cannot sever
    // the main dungeon route even when unrelated corridors cross elsewhere in the carved map.
    const sigilChoices=world.rooms.filter(r=>r.optional).map(room=>({room,gate:host.doors.find(d=>d.roomId===room.id&&d.type!=="room")})).filter(x=>x.gate).sort((a,b)=>{
      const ap=a.gate.type==="bronze"?1:0,bp=b.gate.type==="bronze"?1:0;return bp-ap||((b.room.depth||0)-(a.room.depth||0))
    });
    const sigilChoice=sigilChoices[0]||null,wardenRoom=sigilChoice?.room||null;
    host.sigilRoomId=wardenRoom?.id??null;host.sigilLockdown=false;host.sigilResolved=false;host.sigilDropPos=null;host.sigilDefenderIds=[];host.sigilGateIds=[];
    if(wardenRoom&&sigilChoice?.gate){
      const gate=sigilChoice.gate;gate.type="room";gate.hidden=false;gate.discovered=true;gate.locked=true;gate.open=false;gate.opening=false;gate.sigilGate=true;gate.sigilAnnex=true;host.sigilGateIds=[gate.id];wardenRoom.sigilRoom=true;wardenRoom.sigilAnnex=true;
      // Later optional passage carving can occasionally graze an annex wall. Reseal the
      // annex perimeter here, preserving only its intentional Sigil gate.
      for(let y=wardenRoom.y-1;y<=wardenRoom.y+wardenRoom.h+1;y++)for(let x=wardenRoom.x-1;x<=wardenRoom.x+wardenRoom.w+1;x++){const edge=x===wardenRoom.x-1||x===wardenRoom.x+wardenRoom.w+1||y===wardenRoom.y-1||y===wardenRoom.y+wardenRoom.h+1;if(!edge||(x===gate.x&&y===gate.y)||W.roomAt?.(world,x,y)>=0)continue;if(world.map[y]?.[x]===0)world.map[y][x]=1}
      // Any treasure already generated in the annex becomes part of the chamber reward rather than
      // demanding a bronze key after the mandatory fight.
      for(const chest of host.chests||[])if(chest.roomId===wardenRoom.id){chest.locked=false;chest.sigilReward=true}
      const q=freeInRoom(world,wardenRoom,used),hp=14+(run.floor||1)*4;
      host.sigilWarden={id:"sigil-warden",...q,kind:"guardian",hp,maxHp:hp,alive:true,aiState:"idle",facing:{x:-1,y:0},lastSeen:null,memoryMs:0,searchMs:0,moveCooldown:780,attackCooldown:720,chargeCooldown:1100,healCooldown:999999,flash:0,exitWarden:true,sigilDefender:true,weakness:(run.floor||1)%2?"physical":"energy",championName:"Sigil Warden"};
      host.enemies.push(host.sigilWarden);host.sigilDefenderIds.push(host.sigilWarden.id);
      const defenderTarget=C.dungeon.sigilDefendersMin+Math.min(2,Math.floor(Math.max(0,(run.floor||1)-1)/2)),pool=["guard","hunter","ranger","charger"];
      for(let i=0;i<defenderTarget;i++){const z=freeInRoom(world,wardenRoom,used),kind=pool[i%pool.length],dhp=4+(run.floor||1)+Math.floor(i/2);const e={id:`sigil-defender-${i}`,...z,kind,hp:dhp,maxHp:dhp,alive:true,aiState:"idle",facing:{x:i%2?1:-1,y:0},lastSeen:null,memoryMs:0,searchMs:0,moveCooldown:650+i*80,attackCooldown:700+i*70,chargeCooldown:900,healCooldown:999999,flash:0,hpBarMs:0,sigilDefender:true,champion:i===defenderTarget-1,championName:i===defenderTarget-1?"Sigil Praetorian":undefined};host.enemies.push(e);host.sigilDefenderIds.push(e.id)}
    }
    host.exitSigilCollected=false;host.exitSigilDropped=false;

    // Dungeon shops. Floor 1 has one hidden trader. Floors 2-5 add a guaranteed shop near
    // the floor entrance while still retaining one hidden trader elsewhere on the map.
    host.shops=[];host.trader=null;host.startShop=null;
    const traderRoom=[...world.rooms].filter(r=>r.optional&&r.id!==host.sigilRoomId).sort((a,b)=>(b.depth||0)-(a.depth||0))[0]||rooms[rooms.length-1];
    if(traderRoom){const q=freeInRoom(world,traderRoom,used);host.trader={id:"secret-artefact-trader",...q,roomId:traderRoom.id,active:true,cost:C.stalker.flaskArtefacts,shopType:"hidden",title:"SECRET ARTEFACT TRADER",scorePurchases:0,sold:{potion:false,bronze:false,torch:false,ammo:false,armour:false,weapon:false}};host.shops.push(host.trader);traderRoom.traderRoom=true}
    if((run.floor||1)>1){const startRoom=world.rooms[world.startRoomId],q=startRoom&&freeNear(world,startRoom,world.start,used,2,5);if(startRoom&&q){host.startShop={id:`floor-${run.floor}-entrance-shop`,...q,roomId:startRoom.id,active:true,cost:C.stalker.flaskArtefacts,shopType:"entrance",title:`FLOOR ${run.floor} SUPPLY DESK`,scorePurchases:0,sold:{potion:false,bronze:false,torch:false,ammo:false,armour:false,weapon:false}};host.shops.push(host.startShop);startRoom.shopRoom=true}}

    // V10.2 retains the optional puzzle chain. These rooms never replace the mandatory objective or Sigil route.
    installOptionalPuzzles(world,host,run,rooms,used);

    // Count Loadula remains separate from ordinary enemies. A Banishment Flask can make him vulnerable briefly.
    const stalkRoom=rooms[0]||world.rooms[world.exitRoomId],sq=freeInRoom(world,stalkRoom,used);
    host.stalker={id:"count-loadula",name:C.stalker.name,...sq,active:false,seen:false,awake:false,moveCooldown:C.stalker.moveMs,stunMs:0,vulnerableMs:0,hp:C.stalker.banishHpBase+(run.floor||1)*2,maxHp:C.stalker.banishHpBase+(run.floor||1)*2,spawnTimer:(run.modifier?.id==="STALKER_ACTIVE"?9000:C.stalker.spawnDelayMs),near:false};

    // Death Stalkers begin appearing deeper in the run. Only this explicit class uses the ordinary-fire immunity.
    host.voidStalkers=[];{
      const room=rooms[((run.floor||1)*7+3)%Math.max(1,rooms.length)]||rooms[0],vq=freeInRoom(world,room,used),vhp=6+(run.floor||1)*2,id=`death-stalker-floor-${run.floor||1}`;
      const v={id,...vq,kind:"ghost",hp:vhp,maxHp:vhp,alive:true,aiState:"idle",facing:{x:-1,y:0},lastSeen:null,memoryMs:0,searchMs:0,moveCooldown:650,attackCooldown:720,chargeCooldown:0,healCooldown:999999,flash:0,hpBarMs:0,voidStalker:true,deathStalker:true,stalker:true,permanentlyBanished:false};host.enemies.push(v);host.voidStalkers.push(v.id)
    }

    // Floor identity and difficulty tuning.
    const floorInfo=PGR.floorInfo(run),diff=PGR.difficulty(run),hpFloor=1+(Math.max(1,run.floor)-1)*.12,armoured=run.modifier?.id==="ARMOURED_ENEMIES"?1.3:1,playerLevel=Math.max(1,run.playerLevelHint||1),levelSteps=playerLevel-1;
    if(world.rooms[world.startRoomId])world.rooms[world.startRoomId].theme=floorInfo.theme;
    for(const e of host.enemies){
      if(!e.guardian)e.maxHp=Math.max(1,Math.ceil(e.maxHp*diff.enemyHp*hpFloor*armoured));
      if(e.follower){e.maxHp=Math.max(1,Math.ceil(e.maxHp*(1+levelSteps*C.enemy.namedHpPerLevel)));const armourScale=(1+(Math.max(1,run.floor)-1)*.08)*Math.max(.9,Math.sqrt(diff.enemyHp))*(1+levelSteps*C.enemy.namedArmorPerLevel);e.maxArmor=Math.max(1,Math.ceil((e.maxArmor||e.armor||1)*armourScale));e.armor=e.maxArmor;e.namedDamageScale=1+levelSteps*C.enemy.namedDamagePerLevel;e.namedCadenceScale=Math.max(.65,1-levelSteps*C.enemy.namedCadencePerLevel);e.namedPotionHeal=Math.max(3,Math.round(3+(run.floor||1)*.55+levelSteps*C.enemy.namedPotionPerLevel));e.restorePotion=true;e.restoreUsed=false;e.retreating=false}
      e.hp=e.maxHp;
    }
    // Resource pressure: ammunition remains finite, but every floor now contains visible supply packs.
    let healSeen=0,torchSeen=0;host.items=(host.items||[]).filter(i=>{if(i.kind==="key")return PGR.objectiveFor(run)==="keys";if(["bronze","game","credits","ammo","mana"].includes(i.kind))return true;if(i.kind==="health"){healSeen++;return healSeen%2===1}if(i.kind==="torch"){torchSeen++;return torchSeen%2===1}return true});
    const ammoTarget=Math.max(6,run.modifier?.id==="LOW_AMMO"?Math.floor(C.dungeon.ammoPacks*.7):C.dungeon.ammoPacks);
    const existingAmmo=host.items.filter(i=>i.kind==="ammo"||i.kind==="mana").length;
    for(let i=existingAmmo;i<ammoTarget&&rooms.length;i++){
      const room=rooms[(i*4+1)%rooms.length],q=freeInRoom(world,room,used);
      host.items.push({id:`supply-ammo-${i}`,...q,kind:"ammo",active:true,title:"AMMO PACK"});
    }
    if(run.modifier?.id==="DOUBLE_TREASURE"){for(let i=0;i<2&&i<rooms.length;i++){const room=rooms[i],q=freeInRoom(world,room,used);host.chests.push({id:`bonus-chest-${i}`,...q,locked:i===0,active:true,depth:(room.depth||0)+3,roomId:room.id})}}

    // One collectible key for every current bronze lock: no surplus keys and no impossible lock.
    host.items=(host.items||[]).filter(i=>i.kind!=="bronze");
    const bronzeLocks=(host.doors||[]).filter(d=>d.type==="bronze"&&d.locked).length+(host.chests||[]).filter(c=>c.active&&c.locked).length;
    for(let i=0;i<bronzeLocks&&rooms.length;i++){const room=rooms[(i*5+2)%rooms.length],q=freeInRoom(world,room,used);host.items.push({id:`bronze-balanced-${i}`,...q,kind:"bronze",active:true,title:"BRONZE KEY"})}
    host.bronzeLockCount=bronzeLocks;

    // Furniture and room identity. Most fixtures now block movement; generation keeps them away from doors and core objects.
    for(const d of host.doors||[])used.add(cell(d.x,d.y));
    decorateFurniture(world,host,rooms,used,run);
    installBoulderTrap(world,host,run);
    for(const room of world.rooms){room.dangerous=false;room.verminRoom=false;room.voidRoom=false}
    for(const t of host.traps||[]){const r=world.rooms[t.roomId];if(r)r.dangerous=true}
    for(const g of host.generators||[]){const r=world.rooms[g.roomId];if(r)r.dangerous=true}
    for(const a of host.arenas||[]){const r=world.rooms[a.roomId];if(r)r.dangerous=true}
    for(const t of host.timedRooms||[]){const r=world.rooms[t.roomId];if(r)r.dangerous=true}
    if(host.boulderTrap){const r=world.rooms[host.boulderTrap.roomId];if(r)r.dangerous=true}
    if(host.guardian){const r=world.rooms[W.roomAt(world,host.guardian.x,host.guardian.y)];if(r)r.dangerous=true}
    if(host.sigilWarden){const r=world.rooms[W.roomAt(world,host.sigilWarden.x,host.sigilWarden.y)];if(r){r.dangerous=true;r.sigilRoom=true}}
    for(const e of host.enemies||[]){const r=world.rooms[W.roomAt(world,e.x,e.y)];if(!r)continue;if(e.voidStalker)r.voidRoom=true;if(["scout","ambusher","ghost"].includes(e.kind)&&!e.follower)r.verminRoom=true}
    if(host.trader){const r=world.rooms[host.trader.roomId];if(r)r.traderRoom=true}if(host.startShop){const r=world.rooms[host.startShop.roomId];if(r)r.shopRoom=true}

    host.events=[];host.nextEvent=30000+Math.floor(world.random()*18000);host.alertLevel=0;host.floorElapsed=0;host.mapRewards={r75:false,r90:false,r100:false};world.archiveGames=PGR.persistentCollection().slice(-8);host.revision++;
    // Convert chest placeholders to data-driven loot.
    for(const chest of host.chests||[]){const room=world.rooms[chest.roomId];chest.depth=room?.depth||0;chest.loot=PGR.lootForChest(chest,run,world.random);chest.reward=null}
    return host;
  }

  function isPermanentLit(world,x,y){return (world.wallLights||[]).some(l=>Math.hypot(x-l.x,y-l.y)<=l.radius&&W.roomAt(world,x,y)===l.roomId)}
  function inSanctuary(world,x,y){const id=W.roomAt(world,x,y);return (world.sanctuaryRooms||[]).includes(id)}
  function trapActive(t,now){const phase=(now+t.phase)%t.period;return phase<t.period*.46}
  function roomDoorIds(host,roomId){return (host.doors||[]).filter(d=>d.type==="room"&&d.roomId===roomId).map(d=>d.id)}
  function lockRoomDoors(host,roomId,locked){
    for(const d of host.doors||[])if(d.type==="room"&&d.roomId===roomId){
      d.locked=locked;d.open=false;d.opening=false;d.openingStart=0;d.openAt=0;d.openSoundDone=false;
    }
  }

  function pathStep(world,host,start,target,allowSanctuary=false){
    const width=C.worldWidth,height=C.worldHeight,total=width*height,prev=new Int32Array(total);prev.fill(-2);const q=new Int32Array(total);let head=0,tail=0;
    const si=start.y*width+start.x,gi=target.y*width+target.x,locked=new Set((host.doors||[]).filter(d=>d.locked||!d.open).map(d=>d.y*width+d.x));
    let sanctuary=null;if(!allowSanctuary){sanctuary=new Uint8Array(total);for(const id of world.sanctuaryRooms||[]){const r=world.rooms[id];if(!r)continue;for(let y=r.y;y<=r.y+r.h;y++)for(let x=r.x;x<=r.x+r.w;x++)sanctuary[y*width+x]=1}}
    const startSafe=sanctuary?Boolean(sanctuary[si]):false;prev[si]=-1;q[tail++]=si;
    while(head<tail){const idx=q[head++];if(idx===gi)break;const x=idx%width,y=(idx/width)|0;for(const [dx,dy] of DIRS){const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=width||ny>=height)continue;const ni=ny*width+nx;if(prev[ni]!==-2||world.map[ny][nx]!==0||locked.has(ni))continue;if(sanctuary&&sanctuary[ni]&&!startSafe)continue;prev[ni]=idx;q[tail++]=ni}}
    if(prev[gi]===-2)return null;let cur=gi,parent=prev[cur];while(parent!==-1&&parent!==si){cur=parent;parent=prev[cur]}return{x:cur%width,y:(cur/width)|0};
  }
  function objectiveBaseText(host,run,explorePct=0){
    const o=host.objective;if(!o)return PGR.objectiveLabel(run);
    if(o.type==="keys")return `Recover main vault keys: ${host.keysCollected}/${C.keyTarget}`;
    if(o.type==="generators")return `Destroy monster generators: ${host.generators.filter(g=>!g.alive).length}/${host.generators.length}`;
    if(o.type==="rescue")return host.rescue?.rescued?"CCG scout rescued":"Find the trapped CCG scout and escort them to a sanctuary";
    if(o.type==="explore_guardian")return `Map floor ${Math.floor(explorePct)}% / 70% and defeat the guardian`;
    if(o.type==="guardian")return host.guardian?.alive?"Defeat the Zzap! Citadel guardian":"Guardian defeated";
    return PGR.objectiveLabel(run);
  }
  function sigilDefendersAlive(host){const ids=new Set(host?.sigilDefenderIds||[]);return (host?.enemies||[]).filter(e=>e.alive&&(e.sigilDefender||ids.has(e.id)))}
  function objectiveText(host,run,explorePct=0){
    const base=objectiveBaseText(host,run,explorePct),done=Boolean(host.objective?.complete),defenders=sigilDefendersAlive(host).length;
    if(!done)return `${base}${host.sigilRoomId!=null?" — Sigil route reinforced":""}`;
    if(host.sigilLockdown&&!host.sigilResolved&&defenders>0)return `${base} — SIGIL LOCKDOWN: ${defenders} defender${defenders===1?"":"s"} remain`;
    if(!host.sigilResolved&&defenders>0)return `${base} — enter the reinforced Sigil chamber (${defenders} defenders)`;
    if(!host.exitSigilCollected)return `${base} — recover the EXIT SIGIL`;
    return `${base} — EXIT SIGIL acquired: reach the floor exit`;
  }
  function updateObjective(host,run,explorePct=0){
    const o=host.objective;if(!o)return false;let done=false;
    if(o.type==="keys")done=host.keysCollected>=C.keyTarget;
    else if(o.type==="generators")done=host.generators.every(g=>!g.alive);
    else if(o.type==="rescue")done=Boolean(host.rescue?.rescued);
    else if(o.type==="explore_guardian")done=explorePct>=70&&!host.guardian?.alive;
    else if(o.type==="guardian")done=!host.guardian?.alive;
    o.complete=done;
    for(const d of host.doors||[])if(d.sigilGate){d.locked=!done||Boolean(host.sigilLockdown&&!host.sigilResolved);if(!done)d.open=false}
    host.exitOpen=done&&Boolean(host.exitSigilCollected);return host.exitOpen;
  }

  return{decorate,isPermanentLit,inSanctuary,trapActive,lockRoomDoors,roomDoorIds,pathStep,objectiveText,updateObjective,sigilDefendersAlive};
})();
