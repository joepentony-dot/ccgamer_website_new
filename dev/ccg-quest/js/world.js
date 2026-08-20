window.CCGWorld=(()=>{
  "use strict";
  const C=window.CCG_CONFIG;

  function hash(s){let h=2166136261>>>0;for(const ch of String(s)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
  function rng(seed){let s=seed>>>0;return()=>((s=Math.imul(1664525,s)+1013904223>>>0)/4294967296)}
  const ri=(r,a,b)=>Math.floor(r()*(b-a+1))+a;
  const centre=r=>({x:Math.floor(r.x+r.w/2),y:Math.floor(r.y+r.h/2)});

  function carve(m,x1,y1,x2,y2){
    for(let y=Math.max(1,y1);y<=Math.min(C.worldHeight-2,y2);y++)
      for(let x=Math.max(1,x1);x<=Math.min(C.worldWidth-2,x2);x++)m[y][x]=0;
  }
  function overlap(rs,q){return rs.some(r=>!(q.x+q.w+2<r.x||r.x+r.w+2<q.x||q.y+q.h+2<r.y||r.y+r.h+2<q.y))}

  function generate(seedText){
    const r=rng(hash(seedText));
    const map=Array.from({length:C.worldHeight},()=>Array(C.worldWidth).fill(1));
    const rooms=[{x:2,y:2,w:10,h:7}];
    carve(map,2,2,12,9);
    let tries=0;
    while(rooms.length<24&&tries++<540){
      const q={w:ri(r,5,11),h:ri(r,4,8),x:ri(r,2,C.worldWidth-15),y:ri(r,2,C.worldHeight-12)};
      if(overlap(rooms,q))continue;
      const prev=rooms[rooms.length-1];rooms.push(q);carve(map,q.x,q.y,q.x+q.w,q.y+q.h);
      const a=centre(prev),b=centre(q);
      if(r()<.5){carve(map,Math.min(a.x,b.x),a.y,Math.max(a.x,b.x),a.y);carve(map,b.x,Math.min(a.y,b.y),b.x,Math.max(a.y,b.y))}
      else{carve(map,a.x,Math.min(a.y,b.y),a.x,Math.max(a.y,b.y));carve(map,Math.min(a.x,b.x),b.y,Math.max(a.x,b.x),b.y)}
    }
    for(let i=0;i<13;i++){
      const a=centre(rooms[ri(r,0,rooms.length-1)]),b=centre(rooms[ri(r,0,rooms.length-1)]);
      if(r()<.5){carve(map,Math.min(a.x,b.x),a.y,Math.max(a.x,b.x),a.y);carve(map,b.x,Math.min(a.y,b.y),b.x,Math.max(a.y,b.y))}
      else{carve(map,a.x,Math.min(a.y,b.y),a.x,Math.max(a.y,b.y));carve(map,Math.min(a.x,b.x),b.y,Math.max(a.x,b.x),b.y)}
    }

    const start=centre(rooms[0]);
    let exit=start,best=-1;
    for(const room of rooms){const c=centre(room),d=Math.abs(c.x-start.x)+Math.abs(c.y-start.y);if(d>best){best=d;exit=c}}

    let tunnelY=Math.max(3,Math.min(C.worldHeight-4,Math.floor(C.worldHeight*.54)));
    for(let y=tunnelY;y<C.worldHeight-3;y++){if(map[y][5]===0&&map[y][C.worldWidth-6]===0){tunnelY=y;break}}
    carve(map,1,tunnelY,7,tunnelY);
    carve(map,C.worldWidth-8,tunnelY,C.worldWidth-2,tunnelY);
    for(let x=7;x<C.worldWidth-8;x++)if(map[tunnelY][x]===0){carve(map,7,tunnelY,x,tunnelY);break}
    for(let x=C.worldWidth-8;x>=8;x--)if(map[tunnelY][x]===0){carve(map,x,tunnelY,C.worldWidth-8,tunnelY);break}

    return{map,rooms,start,exit,random:r,tunnelY};
  }

  function floors(map){const a=[];for(let y=1;y<C.worldHeight-1;y++)for(let x=1;x<C.worldWidth-1;x++)if(map[y][x]===0)a.push({x,y});return a}
  function pick(w,used,min=0){
    const a=floors(w.map).filter(c=>!used.some(o=>o.x===c.x&&o.y===c.y)&&Math.abs(c.x-w.start.x)+Math.abs(c.y-w.start.y)>=min);
    const c=a[Math.floor(w.random()*a.length)]||{x:w.start.x+2,y:w.start.y};used.push(c);return{x:c.x,y:c.y};
  }
  function aiFields(w){
    return{
      aiState:"idle",
      facing:{x:w.random()<.5?1:-1,y:0},
      lastSeen:null,
      memoryMs:0,
      searchMs:0,
      moveCooldown:1200+Math.floor(w.random()*1200),
      attackCooldown:900+Math.floor(w.random()*900),
      healCooldown:4200+Math.floor(w.random()*1600),
      flash:0,
      patrolBias:Math.floor(w.random()*4)
    };
  }

  function createHostState(w){
    const used=[w.start,w.exit,{x:1,y:w.tunnelY},{x:C.worldWidth-2,y:w.tunnelY}],enemies=[];
    const kinds=["scout","scout","ambusher","hunter","scout","guard","ghost","scout","ambusher","hunter","scout","guard","ghost","ambusher","scout","hunter"];
    for(let i=0;i<20;i++){
      const p=pick(w,used,12),kind=kinds[i%kinds.length];
      const hp=kind==="hunter"?5:kind==="guard"?3:kind==="ambusher"?2:kind==="ghost"?2:2;
      enemies.push({id:`e${i}`,...p,kind,hp,maxHp:hp,alive:true,...aiFields(w)});
    }
    C.followerElites.forEach((f,i)=>{
      const p=pick(w,used,18+i*2);
      enemies.push({id:`f${i}`,...p,kind:f.kind,hp:f.hp,maxHp:f.hp,alive:true,follower:f,...aiFields(w)});
    });

    const items=[];
    for(let i=0;i<C.keyTarget;i++){const p=pick(w,used,16);items.push({id:`key${i}`,...p,kind:"key",active:true})}
    for(let i=0;i<16;i++){
      const p=pick(w,used,8);
      const cycle=i%5;
      items.push({id:`p${i}`,...p,kind:cycle===0?"health":cycle===1?"mana":cycle===2?"game":cycle===3?"credits":"sensor",title:C.c64Loot[i%C.c64Loot.length],active:true});
    }
    return{enemies,items,keysCollected:0,exitOpen:false,revision:1};
  }

  function walkable(map,x,y){return x>=0&&y>=0&&x<C.worldWidth&&y<C.worldHeight&&map[y][x]===0}
  function tunnelDestination(world,x,y,dx,dy){
    if(y!==world.tunnelY||dy!==0)return null;
    if(x===1&&dx<0)return{x:C.worldWidth-2,y};
    if(x===C.worldWidth-2&&dx>0)return{x:1,y};
    return null;
  }
  function roomAt(world,x,y){
    for(let i=0;i<world.rooms.length;i++){
      const r=world.rooms[i];if(x>=r.x&&x<=r.x+r.w&&y>=r.y&&y<=r.y+r.h)return i;
    }
    return -1;
  }

  return{hashString:hash,generate,createHostState,walkable,tunnelDestination,roomAt};
})();
