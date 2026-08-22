window.CCGAI=(()=>{
  "use strict";
  const C=window.CCG_CONFIG,W=window.CCGWorld,DIRS=[[1,0],[-1,0],[0,1],[0,-1]];
  const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),man=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y);
  const kind=e=>e.follower?.kind||e.kind;
  const memory=e=>C.enemy.alertMemory[kind(e)]||C.enemy.alertMemory.scout;

  function lineOfSight(map,a,b,maxRange=C.enemy.lineOfSightRange,host=null){
    if(!a||!b||dist(a,b)>maxRange)return false;
    let x0=Math.round(a.x),y0=Math.round(a.y),x1=Math.round(b.x),y1=Math.round(b.y);
    let dx=Math.abs(x1-x0),sx=x0<x1?1:-1,dy=-Math.abs(y1-y0),sy=y0<y1?1:-1,err=dx+dy;
    while(true){
      if(!(x0===Math.round(a.x)&&y0===Math.round(a.y))&&!(x0===x1&&y0===y1)){
        {const door=W.doorAt(host,x0,y0),furniture=host?.blockingDecor?.some(q=>q.x===x0&&q.y===y0);if(map[y0]?.[x0]!==0||furniture||(door&&(!door.open||door.locked)))return false;}
      }
      if(x0===x1&&y0===y1)break;
      const e2=2*err;if(e2>=dy){err+=dy;x0+=sx}if(e2<=dx){err+=dx;y0+=sy}
    }
    return true;
  }

  function targetReason(e,p,map,host){
    if(W.sameRoom(host?.worldRef||host?.__world||window.__CCG_WORLD||{},e,p))return "room";
    const range=p.torchMs>0?C.enemy.torchSightRange:C.enemy.lineOfSightRange;
    return lineOfSight(map,e,p,range,host)?"sight":null;
  }

  function visibleTarget(e,map,players,host,world){
    let best=null,bestD=Infinity,bestReason=null;
    for(const p of players.filter(p=>p&&p.health>0)){
      const enemyRoom=W.roomAt(world,e.x,e.y),playerRoom=W.roomAt(world,p.x,p.y);
      if(enemyRoom>=0&&playerRoom<0&&!roomEntered(host,enemyRoom))continue;
      const same=W.sameRoom(world,e,p),range=p.torchMs>0?C.enemy.torchSightRange:C.enemy.lineOfSightRange;
      const seen=same||lineOfSight(map,e,p,range,host);
      if(!seen)continue;
      const d=dist(e,p);if(d<bestD){best=p;bestD=d;bestReason=same?"room":"sight"}
    }
    return best?[best,bestD,bestReason]:[null,Infinity,null];
  }

  function occupied(host,x,y,except){return host.enemies.some(o=>o!==except&&o.alive&&o.x===x&&o.y===y)}
  function roomEntered(host,roomId){return roomId<0||(host?.enteredRoomIds||[]).includes(roomId)}
  function roomDoors(host,roomId){return (host?.doors||[]).filter(door=>door.roomId===roomId)}
  function clearOfUnenteredDoor(host,roomId,x,y){return roomEntered(host,roomId)||roomDoors(host,roomId).every(door=>man({x,y},door)>3)}
  function stalkerDoor(e,host,x,y){const door=W.doorAt(host,x,y);return e?.deathStalker&&door?.type==="room"&&!door.locked?door:null}
  function passable(e,host,map,x,y,world){
    if((!W.walkable(map,x,y,host)&&!stalkerDoor(e,host,x,y))||occupied(host,x,y,e))return false;
    if(window.CCGSystems?.inSanctuary(world,x,y)&&!window.CCGSystems.inSanctuary(world,e.x,e.y)&&!e.stalker)return false;
    const sourceRoom=W.roomAt(world,e.x,e.y),targetRoom=W.roomAt(world,x,y);
    if(sourceRoom>=0&&!roomEntered(host,sourceRoom)&&(targetRoom!==sourceRoom||!clearOfUnenteredDoor(host,sourceRoom,x,y)))return false;
    return true;
  }
  function stageUnenteredEnemies(host,world){
    if(!host?.enemies||!world?.rooms)return;
    for(const e of host.enemies){
      if(!e?.alive)continue;const roomId=W.roomAt(world,e.x,e.y);if(roomId<0||roomEntered(host,roomId)||clearOfUnenteredDoor(host,roomId,e.x,e.y))continue;
      const room=world.rooms[roomId],doors=roomDoors(host,roomId),cells=[];
      for(let y=room.y+1;y<room.y+room.h;y++)for(let x=room.x+1;x<room.x+room.w;x++)if(W.walkable(world.map,x,y,host)&&!occupied(host,x,y,e)&&clearOfUnenteredDoor(host,roomId,x,y))cells.push({x,y,score:doors.length?Math.min(...doors.map(d=>man({x,y},d))):99});
      cells.sort((a,b)=>b.score-a.score);if(cells[0]){e.x=cells[0].x;e.y=cells[0].y;e.facing={x:0,y:1}}
    }
  }
  function randomStep(e,host,map,world){
    const a=DIRS.map(([dx,dy])=>({x:e.x+dx,y:e.y+dy,dx,dy})).filter(p=>passable(e,host,map,p.x,p.y,world));
    if(!a.length||Math.random()<.24)return false;
    a.sort((a,b)=>((a.dx===e.facing?.x&&a.dy===e.facing?.y)?-1:0)-((b.dx===e.facing?.x&&b.dy===e.facing?.y)?-1:0)+(Math.random()-.5)*1.2);
    const p=a[0];e.x=p.x;e.y=p.y;e.facing={x:p.dx,y:p.dy};return true;
  }

  function nextStep(e,host,map,target,world=window.__CCG_WORLD){
    if(!target)return null;const startKey=`${e.x},${e.y}`,goal=`${target.x},${target.y}`;if(startKey===goal)return null;
    const heap=[];
    const push=n=>{heap.push(n);let i=heap.length-1;while(i>0){const p=(i-1)>>1;if(heap[p].f<=n.f)break;heap[i]=heap[p];i=p}heap[i]=n};
    const pop=()=>{if(!heap.length)return null;const root=heap[0],last=heap.pop();if(heap.length){let i=0;while(true){let l=i*2+1,r=l+1;if(l>=heap.length)break;let c=r<heap.length&&heap[r].f<heap[l].f?r:l;if(heap[c].f>=last.f)break;heap[i]=heap[c];i=c}heap[i]=last}return root};
    const best=new Map([[startKey,0]]),came=new Map();push({x:e.x,y:e.y,g:0,f:man(e,target)});let guard=0;
    while(heap.length&&guard++<7000){
      const cur=pop(),ck=`${cur.x},${cur.y}`;if(cur.g!==best.get(ck))continue;
      if(ck===goal){let c=goal,pkey=came.get(c);while(pkey&&pkey!==startKey){c=pkey;pkey=came.get(c)}const [x,y]=c.split(',').map(Number);return{x,y}}
      for(const [dx,dy] of DIRS){
        const x=cur.x+dx,y=cur.y+dy,nk=`${x},${y}`;
        if(!passable(e,host,map,x,y,world))continue;
        const ng=cur.g+1;if(ng>=(best.get(nk)??Infinity))continue;best.set(nk,ng);came.set(nk,ck);push({x,y,g:ng,f:ng+Math.abs(x-target.x)+Math.abs(y-target.y)})
      }
    }
    return null;
  }
  function moveToward(e,host,map,target,world=window.__CCG_WORLD){
    const p=nextStep(e,host,map,target,world);if(!p)return false;e.facing={x:Math.sign(p.x-e.x),y:Math.sign(p.y-e.y)};
    const door=stalkerDoor(e,host,p.x,p.y);
    if(door&&!door.open){const leaves=door.groupId?(host.doors||[]).filter(d=>d.groupId===door.groupId):[door];for(const leaf of leaves){leaf.open=true;leaf.opening=false;leaf.openingStart=0;leaf.openAt=0;leaf.openSoundDone=true}host.revision=(host.revision||0)+1;return true}
    e.x=p.x;e.y=p.y;return true
  }
  function moveBurst(e,host,map,target,world,steps=1){let moved=false;for(let i=0;i<steps;i++){if(!moveToward(e,host,map,target,world))break;moved=true;if(e.x===target.x&&e.y===target.y)break}return moved}
  function coverPoint(e,p,host,map,world){
    const options=[];for(const d of host?.blockingDecor||[]){if(man(e,d)>8||man(p,d)<2)continue;for(const [dx,dy] of DIRS){const q={x:d.x+dx,y:d.y+dy};if(!passable(e,host,map,q.x,q.y,world)||man(p,q)<3||man(e,q)>9)continue;if(lineOfSight(map,p,q,C.enemy.torchSightRange,host))continue;options.push({...q,score:man(e,q)+Math.abs(6-man(p,q))*.35})}}
    options.sort((a,b)=>a.score-b.score);return options[0]||null
  }
  function flankPoint(e,p,host,map,world){
    const vx=Math.sign(p.x-e.x),vy=Math.sign(p.y-e.y),sideA={x:p.x-vy*3-vx*2,y:p.y+vx*3-vy*2},sideB={x:p.x+vy*3-vx*2,y:p.y-vx*3-vy*2};
    const options=[sideA,sideB,...DIRS.map(([dx,dy])=>({x:p.x+dx*3,y:p.y+dy*3}))].filter(q=>passable(e,host,map,q.x,q.y,world));
    options.sort((a,b)=>man(e,a)-man(e,b)+(Math.random()-.5)*2);return options[0]||p
  }
  function predicted(p,map,steps=3){const d=p?.dir||{x:0,y:0};let x=p.x,y=p.y;for(let i=0;i<steps;i++){const nx=x+d.x,ny=y+d.y;if(map[ny]?.[nx]!==0)break;x=nx;y=ny}return{x,y}}
  const idleInterval=()=>C.enemy.idleStepMin+Math.random()*(C.enemy.idleStepMax-C.enemy.idleStepMin);
  const chaseInterval=e=>C.enemy.chaseStep[kind(e)]||650;

  function shotDirection(e,p){
    const ax=p.x-e.x,ay=p.y-e.y,dx=Math.sign(ax),dy=Math.sign(ay);
    if(Math.abs(ax)>.5&&Math.abs(ay)>.5)return{x:dx,y:dy};
    return Math.abs(ax)>=Math.abs(ay)?{x:dx,y:0}:{x:0,y:dy};
  }
  function shootAt(e,p,style,power,ttl,hooks){const d=shotDirection(e,p);e.facing=d;hooks.shoot?.({x:e.x,y:e.y,dx:d.x,dy:d.y,power,style,ttl,source:e.follower?.name||e.kind,enemyId:e.id,damageScale:e.namedDamageScale||1})}

  function executeCharge(e,p,host,map,hooks){
    const target=e.chargeTarget||p;let moved=false;
    for(let i=0;i<3;i++){
      if(man(e,p)<=1){hooks.melee?.(e,p,2);break}
      if(!moveToward(e,host,map,target,window.__CCG_WORLD)&&!moveToward(e,host,map,p,window.__CCG_WORLD))break;moved=true;
      if(man(e,p)<=1){hooks.melee?.(e,p,2);break}
    }
    e.chargeTarget=null;return moved;
  }
  function charge(e,p,host,map,hooks){
    if(e.chargeCooldown>0||e.chargeTelegraphMs>0)return false;const d=dist(e,p);if(d>8||d<2)return false;
    e.chargeCooldown=e.follower?.name==="Swanh8ter"?2300:2000;e.chargeTelegraphMs=e.follower?.name==="Swanh8ter"?520:360;e.chargeTarget={x:p.x,y:p.y};
    hooks.notice?.(e.follower?.name==="Swanh8ter"?"<strong>SWANH8TER LINES UP A CHARGE!</strong> You have half a second to get behind something.":"<strong>CHARGE INCOMING!</strong> Move before it commits.","alert",e);
    return true;
  }

  function attackDelay(e,base){const named=e.follower?(C.enemy.namedAttackMultiplier||.7)*(e.namedCadenceScale||1):1;return Math.max(240,Math.round(base*named))}
  function attack(e,map,p,range,host,hooks){
    if(!p||e.attackCooldown>0)return false;const world=host?.worldRef||window.__CCG_WORLD,enemyRoom=W.roomAt(world,e.x,e.y),playerRoom=W.roomAt(world,p.x,p.y);if(enemyRoom>=0&&playerRoom<0&&!roomEntered(host,enemyRoom))return false;const k=kind(e),hasLOS=lineOfSight(map,e,p,p.torchMs>0?C.enemy.torchSightRange:C.enemy.lineOfSightRange,host);
    if(["scout","hunter","ambusher","charger","ghost","guardian","champion"].includes(k)&&range<=1.5){e.attackCooldown=attackDelay(e,k==="guardian"?520:k==="hunter"?700:k==="charger"?850:950);hooks.melee?.(e,p,k==="guardian"?3:(k==="hunter"||k==="charger"||e.champion)?2:1);return true}
    if(!hasLOS)return false;
    if(k==="ranger"&&range<=10){shootAt(e,p,"normal",1,13,hooks);e.attackCooldown=attackDelay(e,1000);return true}
    if(k==="root"&&range<=9){shootAt(e,p,"root",1,11,hooks);e.attackCooldown=attackDelay(e,1220);return true}
    if(k==="cook"&&range<=9){shootAt(e,p,"food",2,10,hooks);e.attackCooldown=attackDelay(e,1440);return true}
    if(k==="guard"&&range<=10){shootAt(e,p,"normal",1,12,hooks);e.attackCooldown=attackDelay(e,1110);return true}
    if(k==="firebreather"&&range<=10){shootAt(e,p,"fire",2,10,hooks);e.attackCooldown=attackDelay(e,1660);hooks.notice?.("<strong>YOSHI YOSHI BREATHES FIRE.</strong> Ten-tile flame range. Find cover or get out of the line.","flame",e);return true}
    if(k==="guardian"&&range<=8){shootAt(e,p,"shock",2,9,hooks);e.attackCooldown=attackDelay(e,910);return true}
    return false;
  }

  function support(e,host,dt,hooks){
    if(kind(e)!=="cook")return false;e.healCooldown-=dt;if(e.healCooldown>0)return false;let n=0;
    for(const a of host.enemies){if(a===e||!a.alive||a.hp>=a.maxHp||man(a,e)>4)continue;a.hp=Math.min(a.maxHp,a.hp+1);a.flash=120;a.hpBarMs=2600;n++}
    e.healCooldown=6500;if(n){hooks.notice?.("<strong>CPU SERVES DINNER.</strong> Nearby enemies regain health. Stop the chef.","heal",e);return true}return false;
  }
  function retreatAndRestore(e,seen,host,map,hooks,world){
    if(!e.follower||e.restoreUsed||!e.restorePotion||e.hp<=0||e.hp>e.maxHp*.32)return false;
    if(seen){const opts=DIRS.map(([dx,dy])=>({x:e.x+dx,y:e.y+dy,dx,dy,d:man({x:e.x+dx,y:e.y+dy},seen)})).filter(q=>passable(e,host,map,q.x,q.y,world)).sort((a,b)=>b.d-a.d);if(opts[0]){e.x=opts[0].x;e.y=opts[0].y;e.facing={x:opts[0].dx,y:opts[0].dy}}}
    const heal=Math.max(2,Math.round(e.namedPotionHeal||4));e.hp=Math.min(e.maxHp,e.hp+heal);e.restoreUsed=true;e.retreating=true;e.attackCooldown=Math.max(e.attackCooldown,900);e.moveCooldown=Math.max(e.moveCooldown,620);e.aiState="search";e.searchMs=900;e.hpBarMs=3000;
    hooks.notice?.(`<strong>${String(e.follower.name).toUpperCase()} RETREATS AND USES A RESTORE POTION.</strong> +${heal} HP.`,"heal",e);return true;
  }

  function stepOne(e,host,map,players,dt,hooks,world){
    if(!e.alive)return false;e.attackCooldown-=dt;e.chargeCooldown=(e.chargeCooldown||0)-dt;e.moveCooldown-=dt;e.tacticalDecisionMs=(e.tacticalDecisionMs||0)-dt;e.tacticalHoldMs=Math.max(0,(e.tacticalHoldMs||0)-dt);if(e.flash>0)e.flash=Math.max(0,e.flash-dt);
    if((e.hitStunMs||0)>0){e.hitStunMs=Math.max(0,e.hitStunMs-dt);e.attackCooldown=Math.max(e.attackCooldown,e.hitStunMs);return false}
    let [seen,range,reason]=visibleTarget(e,map,players,host,world);if(e.deathStalker&&seen)e.hunting=true;if(e.deathStalker&&e.hunting&&!seen){seen=players.filter(p=>p&&p.health>0).sort((a,b)=>dist(e,a)-dist(e,b))[0]||null;if(seen){range=dist(e,seen);reason="hunt"}}
    if((e.chargeTelegraphMs||0)>0){e.chargeTelegraphMs-=dt;if(e.chargeTelegraphMs<=0&&seen){const moved=executeCharge(e,seen,host,map,hooks);e.moveCooldown=chaseInterval(e);return moved||true}return true}
    if(retreatAndRestore(e,seen,host,map,hooks,world))return true;
    let changed=support(e,host,dt,hooks);
    if(kind(e)==="treasure"){
      e.escapeMs=(e.escapeMs||22000)-dt;if(e.escapeMs<=0){e.alive=false;hooks.notice?.("<strong>TREASURE GOBLIN ESCAPED.</strong> Somewhere, an excellent chest is laughing at you.","search",e);return true}
      if(seen&&e.moveCooldown<=0){const opts=DIRS.map(([dx,dy])=>({x:e.x+dx,y:e.y+dy,dx,dy,d:Math.hypot(e.x+dx-seen.x,e.y+dy-seen.y)})).filter(q=>passable(e,host,map,q.x,q.y,world)).sort((a,b)=>b.d-a.d);if(opts[0]){e.x=opts[0].x;e.y=opts[0].y;e.facing={x:opts[0].dx,y:opts[0].dy};e.moveCooldown=C.enemy.chaseStep.treasure;return true}}
      if(e.moveCooldown<=0){const moved=randomStep(e,host,map,world);e.moveCooldown=700;return moved}return false;
    }
    if(seen){
      const was=e.aiState;e.aiState="chase";e.lastSeen={x:seen.x,y:seen.y};e.memoryMs=memory(e);e.searchMs=0;e.targetId=seen.id;
      if(was!=="chase")hooks.alert?.(e,"alert",reason);
      if(e.tacticalDecisionMs<=0){
        const named=Boolean(e.follower),ranged=["ranger","root","cook","firebreather"].includes(kind(e)),cover=(named||ranged||kind(e)==="ambusher")&&range>=3?coverPoint(e,seen,host,map,world):null;
        if(cover&&Math.random()<(named ? .78 : .42)){e.coverTarget=cover;e.tacticalHoldMs=named?850+Math.random()*900:500+Math.random()*650;e.tacticalMode="cover"}
        else if(range>2&&Math.random()<(named ? .72 : .28)){e.flankTarget=flankPoint(e,seen,host,map,world);e.tacticalMode="flank"}
        e.tacticalDecisionMs=named?700+Math.random()*850:1200+Math.random()*1200;
      }
    }else if(e.aiState==="chase"){
      e.memoryMs-=dt;if(e.memoryMs<=0){e.aiState="search";e.searchMs=C.enemy.searchTime;hooks.alert?.(e,"search")}
    }else if(e.aiState==="search"){
      e.searchMs-=dt;if(e.searchMs<=0){e.aiState="idle";e.lastSeen=null;e.targetId=null;e.moveCooldown=Math.max(e.moveCooldown,idleInterval());hooks.alert?.(e,"idle")}
    }

    if(seen){
      changed=attack(e,map,seen,range,host,hooks)||changed;
      if(kind(e)==="charger"&&e.moveCooldown<=0&&charge(e,seen,host,map,hooks)){e.moveCooldown=chaseInterval(e);return true}
    }
    if(kind(e)==="guard"||e.moveCooldown>0)return changed;

    let moved=false,k=kind(e);
    if(seen){
      const named=Boolean(e.follower),burstSteps=named?1:(Math.random()<.22?2:1);
      if(e.coverTarget){
        if(e.x!==e.coverTarget.x||e.y!==e.coverTarget.y)moved=moveBurst(e,host,map,e.coverTarget,world,Math.min(2,burstSteps));
        else if(e.tacticalHoldMs>0){e.facing=shotDirection(e,seen);e.moveCooldown=180+Math.random()*180;return changed}
        else{e.coverTarget=null;e.flankTarget=flankPoint(e,seen,host,map,world);e.tacticalMode="flank"}
      }
      if(!moved&&e.flankTarget){moved=moveBurst(e,host,map,e.flankTarget,world,burstSteps);if(e.x===e.flankTarget.x&&e.y===e.flankTarget.y)e.flankTarget=null}
      if(!moved&&["ranger","root","cook"].includes(k)){
        if(range<4){const away={x:e.x+Math.sign(e.x-seen.x)*2,y:e.y+Math.sign(e.y-seen.y)*2};moved=passable(e,host,map,away.x,away.y,world)?moveToward(e,host,map,away,world):randomStep(e,host,map,world)}
        else if(range>7)moved=moveBurst(e,host,map,seen,world,Math.min(2,burstSteps));
        else moved=Math.random()<.65?randomStep(e,host,map,world):moveToward(e,host,map,flankPoint(e,seen,host,map,world),world);
      }else if(!moved&&k==="firebreather"){
        if(range>4)moved=moveBurst(e,host,map,flankPoint(e,seen,host,map,world),world,Math.min(2,burstSteps));else moved=randomStep(e,host,map,world);
      }else if(!moved&&k==="ambusher")moved=moveBurst(e,host,map,predicted(seen,map,3),world,burstSteps);
      else if(!moved)moved=moveBurst(e,host,map,Math.random()<(named ? .55 : .2)?flankPoint(e,seen,host,map,world):seen,world,burstSteps);
      if(moved&&man(e,seen)<=1)changed=attack(e,map,seen,dist(e,seen),host,hooks)||changed;
    }else if(e.aiState==="chase"&&e.lastSeen){
      moved=moveToward(e,host,map,e.lastSeen,world);if(e.x===e.lastSeen.x&&e.y===e.lastSeen.y){e.aiState="search";e.searchMs=C.enemy.searchTime;hooks.alert?.(e,"search")}
    }else if(e.aiState==="search")moved=randomStep(e,host,map,world);
    else moved=randomStep(e,host,map,world);

    e.moveCooldown=e.aiState==="chase"?Math.max(210,chaseInterval(e)*(e.follower?1.12:1)*(e.moveSpeedScale||1)):e.aiState==="search"?(1050+Math.random()*800)*(e.moveSpeedScale||1):idleInterval()*(e.moveSpeedScale||1);
    return moved||changed;
  }

  function stepEnemies(host,map,players,dt,hooks={},world=window.__CCG_WORLD){
    if(!host?.enemies||!world)return;host.enteredRoomIds=host.enteredRoomIds||[];for(const p of players||[]){const roomId=p?W.roomAt(world,p.x,p.y):-1;if(roomId>=0&&!host.enteredRoomIds.includes(roomId))host.enteredRoomIds.push(roomId)}let changed=false;for(const e of host.enemies)changed=stepOne(e,host,map,players,dt,hooks,world)||changed;if(changed)host.revision++;
  }
  function alertEnemy(e,x,y){if(!e?.alive)return;e.aiState="chase";e.lastSeen={x,y};e.memoryMs=memory(e);e.searchMs=0;e.moveCooldown=Math.min(e.moveCooldown,180)}
  return{lineOfSight,visibleTarget,nextStepAStar:nextStep,tacticalCoverForTest:coverPoint,stepEnemies,stageUnenteredEnemies,roomEnteredForTest:roomEntered,stalkerDoorForTest:stalkerDoor,alertEnemy,kindOf:kind};
})();
