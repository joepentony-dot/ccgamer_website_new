window.CCGWorld=(()=>{
  "use strict";
  const C=window.CCG_CONFIG;
  const THEMES={
    C64_ARCHIVE:{name:"C64 Archive",floor:"#15111d",alt:"#1b1426",wall:"#4b3b91",hi:"#8173d7",accent:"#6cecff",message:"Rows of tapes disappear into the dark. Somewhere, a datasette is still rewinding."},
    "1541_WORKSHOP":{name:"1541 Workshop",floor:"#101820",alt:"#15212b",wall:"#405a75",hi:"#6f93ae",accent:"#72ff9b",message:"Disk drives tick inside the walls. None of them sound remotely healthy."},
    BUDGET_BIN:{name:"Budget Bin",floor:"#1b1510",alt:"#241a11",wall:"#765026",hi:"#b47a34",accent:"#ffd85a",message:"Cheap games, suspicious price stickers and absolutely no refunds."},
    DEMO_LOUNGE:{name:"Demo Lounge",floor:"#120e22",alt:"#18102d",wall:"#5a2f84",hi:"#9d59c7",accent:"#ff5bae",message:"The lighting gets brighter and the raster bars become increasingly unnecessary."},
    ARMOURY:{name:"Joystick Armoury",floor:"#151719",alt:"#1c2023",wall:"#555d67",hi:"#89929b",accent:"#ff9950",message:"Reinforced cases and spare fire buttons. This room expects trouble."},
    CPU_KITCHEN:{name:"CPU Kitchen",floor:"#20150f",alt:"#281b12",wall:"#7b4c26",hi:"#b9773b",accent:"#ff9950",message:"Something is cooking. Whether it qualifies as food is currently under review."},
    SID_REACTOR:{name:"SID Reactor",floor:"#1b1014",alt:"#241216",wall:"#73323c",hi:"#b64b58",accent:"#ff6868",message:"The floor hums with a bass note. Staying still feels increasingly unwise."},
    WARP_GALLERY:{name:"Warp Gallery",floor:"#111022",alt:"#17132d",wall:"#453aa0",hi:"#786be0",accent:"#b978ff",message:"Purple energy crawls along the walls. The wrap tunnel cannot be far away."},
    ZZAP_LIBRARY:{name:"Zzap! Library",floor:"#18170f",alt:"#211f12",wall:"#6d6526",hi:"#a59b39",accent:"#ffd85a",message:"Scores stare down from the shelves. A distant 96% feels judgmental."},
    TREASURE_VAULT:{name:"Locked Treasure Vault",floor:"#171b12",alt:"#202817",wall:"#65712f",hi:"#9eb24d",accent:"#ffd85a",message:"A sealed bonus chamber. The good stuff is always behind another key."}
  };
  function hash(s){let h=2166136261>>>0;for(const ch of String(s)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
  function rng(seed){let s=seed>>>0;return()=>((s=Math.imul(1664525,s)+1013904223>>>0)/4294967296)}
  const ri=(r,a,b)=>Math.floor(r()*(b-a+1))+a, centre=r=>({x:Math.floor(r.x+r.w/2),y:Math.floor(r.y+r.h/2)}), cell=(x,y)=>`${x},${y}`;
  function carve(m,x1,y1,x2,y2){for(let y=Math.max(1,y1);y<=Math.min(C.worldHeight-2,y2);y++)for(let x=Math.max(1,x1);x<=Math.min(C.worldWidth-2,x2);x++)m[y][x]=0}
  function overlap(rs,q){return rs.some(r=>!(q.x+q.w+2<r.x||r.x+r.w+2<q.x||q.y+q.h+2<r.y||r.y+r.h+2<q.y))}
  function allWalls(map,x1,y1,x2,y2){if(x1<1||y1<1||x2>=C.worldWidth-1||y2>=C.worldHeight-1)return false;for(let y=y1;y<=y2;y++)for(let x=x1;x<=x2;x++)if(map[y][x]===0)return false;return true}
  function addBonusRoom(map,room,index){
    const cy=Math.floor(room.y+room.h/2),cx=Math.floor(room.x+room.w/2),opts=[
      {door:{x:room.x+room.w+1,y:cy},box:{x1:room.x+room.w+2,y1:cy-2,x2:room.x+room.w+5,y2:cy+2}},
      {door:{x:room.x-1,y:cy},box:{x1:room.x-5,y1:cy-2,x2:room.x-2,y2:cy+2}},
      {door:{x:cx,y:room.y+room.h+1},box:{x1:cx-2,y1:room.y+room.h+2,x2:cx+2,y2:room.y+room.h+5}},
      {door:{x:cx,y:room.y-1},box:{x1:cx-2,y1:room.y-5,x2:cx+2,y2:room.y-2}}
    ];
    for(const o of opts){if(map[o.door.y]?.[o.door.x]!==1||!allWalls(map,o.box.x1,o.box.y1,o.box.x2,o.box.y2))continue;map[o.door.y][o.door.x]=0;carve(map,o.box.x1,o.box.y1,o.box.x2,o.box.y2);const vr={x:o.box.x1,y:o.box.y1,w:o.box.x2-o.box.x1,h:o.box.y2-o.box.y1,theme:"TREASURE_VAULT",optional:true};return{id:`door${index}`,x:o.door.x,y:o.door.y,room:vr,treasure:centre(vr)}}return null
  }
  function generate(seedText){
    const r=rng(hash(seedText)),map=Array.from({length:C.worldHeight},()=>Array(C.worldWidth).fill(1));
    const rooms=[{x:2,y:2,w:10,h:7,theme:"C64_ARCHIVE",optional:false}];carve(map,2,2,12,9);let tries=0;
    while(rooms.length<24&&tries++<540){const q={w:ri(r,5,11),h:ri(r,4,8),x:ri(r,2,C.worldWidth-15),y:ri(r,2,C.worldHeight-12),theme:C.roomThemes[ri(r,0,C.roomThemes.length-1)],optional:false};if(overlap(rooms,q))continue;const prev=rooms[rooms.length-1];rooms.push(q);carve(map,q.x,q.y,q.x+q.w,q.y+q.h);const a=centre(prev),b=centre(q);if(r()<.5){carve(map,Math.min(a.x,b.x),a.y,Math.max(a.x,b.x),a.y);carve(map,b.x,Math.min(a.y,b.y),b.x,Math.max(a.y,b.y))}else{carve(map,a.x,Math.min(a.y,b.y),a.x,Math.max(a.y,b.y));carve(map,Math.min(a.x,b.x),b.y,Math.max(a.x,b.x),b.y)}}
    for(let i=0;i<13;i++){const a=centre(rooms[ri(r,0,rooms.length-1)]),b=centre(rooms[ri(r,0,rooms.length-1)]);if(r()<.5){carve(map,Math.min(a.x,b.x),a.y,Math.max(a.x,b.x),a.y);carve(map,b.x,Math.min(a.y,b.y),b.x,Math.max(a.y,b.y))}else{carve(map,a.x,Math.min(a.y,b.y),a.x,Math.max(a.y,b.y));carve(map,Math.min(a.x,b.x),b.y,Math.max(a.x,b.x),b.y)}}
    const start=centre(rooms[0]);let exit=start,best=-1;for(const rm of rooms){const q=centre(rm),d=Math.abs(q.x-start.x)+Math.abs(q.y-start.y);if(d>best){best=d;exit=q}}const er=rooms.find(rm=>exit.x>=rm.x&&exit.x<=rm.x+rm.w&&exit.y>=rm.y&&exit.y<=rm.y+rm.h);if(er)er.theme="ZZAP_LIBRARY";
    let tunnelY=Math.max(3,Math.min(C.worldHeight-4,Math.floor(C.worldHeight*.54)));for(let y=tunnelY;y<C.worldHeight-3;y++){if(map[y][5]===0&&map[y][C.worldWidth-6]===0){tunnelY=y;break}}carve(map,1,tunnelY,7,tunnelY);carve(map,C.worldWidth-8,tunnelY,C.worldWidth-2,tunnelY);for(let x=8;x<C.worldWidth-8;x++)if(map[tunnelY][x]===0){carve(map,7,tunnelY,x,tunnelY);break}for(let x=C.worldWidth-9;x>=8;x--)if(map[tunnelY][x]===0){carve(map,x,tunnelY,C.worldWidth-8,tunnelY);break}
    const doorSpecs=[],optionalCells=new Set();let di=0;for(let i=3;i<rooms.length&&di<4;i+=4){const d=addBonusRoom(map,rooms[i],di);if(!d)continue;doorSpecs.push({id:d.id,x:d.x,y:d.y,treasure:d.treasure});rooms.push(d.room);for(let y=d.room.y;y<=d.room.y+d.room.h;y++)for(let x=d.room.x;x<=d.room.x+d.room.w;x++)optionalCells.add(cell(x,y));optionalCells.add(cell(d.x,d.y));di++}
    return{map,rooms,start,exit,random:r,tunnelY,doorSpecs,optionalCells};
  }
  function floors(w,allowOptional=false){const a=[];for(let y=1;y<C.worldHeight-1;y++)for(let x=1;x<C.worldWidth-1;x++)if(w.map[y][x]===0&&(allowOptional||!w.optionalCells.has(cell(x,y))))a.push({x,y});return a}
  function pick(w,used,min=0,allowOptional=false){const a=floors(w,allowOptional).filter(c=>!used.some(o=>o.x===c.x&&o.y===c.y)&&Math.abs(c.x-w.start.x)+Math.abs(c.y-w.start.y)>=min);const q=a[Math.floor(w.random()*a.length)]||{x:w.start.x+2,y:w.start.y};used.push(q);return{x:q.x,y:q.y}}
  function aiFields(w){return{aiState:"idle",facing:{x:w.random()<.5?1:-1,y:0},lastSeen:null,memoryMs:0,searchMs:0,moveCooldown:1300+Math.floor(w.random()*1300),attackCooldown:900+Math.floor(w.random()*900),healCooldown:4200+Math.floor(w.random()*1600),flash:0}}
  function createHostState(w){
    const used=[w.start,w.exit,{x:1,y:w.tunnelY},{x:C.worldWidth-2,y:w.tunnelY}],enemies=[],kinds=["scout","scout","ambusher","hunter","scout","guard","ghost","scout","ambusher","hunter","scout","guard","ghost","ambusher","scout","hunter"];
    for(let i=0;i<20;i++){const p=pick(w,used,12,false),kind=kinds[i%kinds.length],hp=kind==="hunter"?5:kind==="guard"?3:kind==="ambusher"?2:kind==="ghost"?2:2;enemies.push({id:`e${i}`,...p,kind,hp,maxHp:hp,alive:true,...aiFields(w)})}
    C.followerElites.forEach((f,i)=>{const p=pick(w,used,18+i*2,false);enemies.push({id:`f${i}`,...p,kind:f.kind,hp:f.hp,maxHp:f.hp,alive:true,follower:f,...aiFields(w)})});
    const items=[];for(let i=0;i<C.keyTarget;i++){const p=pick(w,used,16,false);items.push({id:`key${i}`,...p,kind:"key",active:true})}
    const cycle=["health","mana","game","credits","sensor","torch","armour","potion","weapon","rapid"];for(let i=0;i<24;i++){const p=pick(w,used,8,false);items.push({id:`p${i}`,...p,kind:cycle[i%cycle.length],title:C.c64Loot[i%C.c64Loot.length],active:true})}
    const doors=w.doorSpecs.map(d=>({id:d.id,x:d.x,y:d.y,locked:true}));for(let i=0;i<doors.length+1;i++){const p=pick(w,used,7,false);items.push({id:`bronze${i}`,...p,kind:"bronze",active:true})}w.doorSpecs.forEach((d,i)=>items.push({id:`treasure${i}`,x:d.treasure.x,y:d.treasure.y,kind:"treasure",reward:["weapon","armour","potion","torch"][i%4],active:true}));
    return{enemies,items,doors,keysCollected:0,exitOpen:false,revision:1};
  }
  function doorAt(host,x,y){return host?.doors?.find(d=>d.x===x&&d.y===y)||null}
  function walkable(map,x,y,host=null){if(x<0||y<0||x>=C.worldWidth||y>=C.worldHeight||map[y][x]!==0)return false;return !doorAt(host,x,y)?.locked}
  function tunnelDestination(w,x,y,dx,dy){if(y!==w.tunnelY||dy!==0)return null;if(x===1&&dx<0)return{x:C.worldWidth-2,y};if(x===C.worldWidth-2&&dx>0)return{x:1,y};return null}
  function roomAt(w,x,y){for(let i=w.rooms.length-1;i>=0;i--){const r=w.rooms[i];if(x>=r.x&&x<=r.x+r.w&&y>=r.y&&y<=r.y+r.h)return i}return -1}
  function themeAt(w,x,y){const i=roomAt(w,x,y);return i>=0?(THEMES[w.rooms[i].theme]||THEMES.C64_ARCHIVE):THEMES.WARP_GALLERY}
  return{hashString:hash,generate,createHostState,walkable,tunnelDestination,roomAt,themeAt,doorAt,themes:THEMES};
})();
