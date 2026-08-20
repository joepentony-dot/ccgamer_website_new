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
        if(map[y0]?.[x0]!==0||W.doorAt(host,x0,y0)?.locked)return false;
      }
      if(x0===x1&&y0===y1)break;
      const e2=2*err;if(e2>=dy){err+=dy;x0+=sx}if(e2<=dx){err+=dx;y0+=sy}
    }
    return true;
  }

  function visibleTarget(e,map,players,host,world){
    let best=null,bestD=Infinity,bestReason=null;
    for(const p of players.filter(p=>p&&p.health>0)){
      const same=W.sameRoom(world,e,p),range=p.torchMs>0?C.enemy.torchSightRange:C.enemy.lineOfSightRange;
      const seen=same||lineOfSight(map,e,p,range,host);
      if(!seen)continue;
      const d=dist(e,p);if(d<bestD){best=p;bestD=d;bestReason=same?"room":"sight"}
    }
    return best?[best,bestD,bestReason]:[null,Infinity,null];
  }

  function occupied(host,x,y,except){return host.enemies.some(o=>o!==except&&o.alive&&o.x===x&&o.y===y)}
  function randomStep(e,host,map){
    const a=DIRS.map(([dx,dy])=>({x:e.x+dx,y:e.y+dy,dx,dy})).filter(p=>W.walkable(map,p.x,p.y,host)&&!occupied(host,p.x,p.y,e));
    if(!a.length||Math.random()<.24)return false;
    a.sort((a,b)=>((a.dx===e.facing?.x&&a.dy===e.facing?.y)?-1:0)-((b.dx===e.facing?.x&&b.dy===e.facing?.y)?-1:0)+(Math.random()-.5)*1.2);
    const p=a[0];e.x=p.x;e.y=p.y;e.facing={x:p.dx,y:p.dy};return true;
  }

  function nextStep(e,host,map,target){
    if(!target)return null;const start=`${e.x},${e.y}`,goal=`${target.x},${target.y}`;if(start===goal)return null;
    const open=[{x:e.x,y:e.y,g:0,f:man(e,target)}],best=new Map([[start,0]]),came=new Map();let guard=0;
    while(open.length&&guard++<1700){
      open.sort((a,b)=>a.f-b.f);const cur=open.shift(),ck=`${cur.x},${cur.y}`;
      if(ck===goal){let c=goal,p=came.get(c);while(p&&p!==start){c=p;p=came.get(c)}const [x,y]=c.split(",").map(Number);return{x,y}}
      for(const [dx,dy] of DIRS){
        const x=cur.x+dx,y=cur.y+dy,nk=`${x},${y}`;
        if(!W.walkable(map,x,y,host)||(occupied(host,x,y,e)&&nk!==goal))continue;
        const ng=cur.g+1;if(ng>=(best.get(nk)??Infinity))continue;
        best.set(nk,ng);came.set(nk,ck);open.push({x,y,g:ng,f:ng+Math.abs(x-target.x)+Math.abs(y-target.y)});
      }
    }
    return null;
  }
  function moveToward(e,host,map,target){const p=nextStep(e,host,map,target);if(!p)return false;e.facing={x:Math.sign(p.x-e.x),y:Math.sign(p.y-e.y)};e.x=p.x;e.y=p.y;return true}
  function predicted(p,map,steps=3){const d=p?.dir||{x:0,y:0};let x=p.x,y=p.y;for(let i=0;i<steps;i++){const nx=x+d.x,ny=y+d.y;if(map[ny]?.[nx]!==0)break;x=nx;y=ny}return{x,y}}
  const idleInterval=()=>C.enemy.idleStepMin+Math.random()*(C.enemy.idleStepMax-C.enemy.idleStepMin);
  const chaseInterval=e=>C.enemy.chaseStep[kind(e)]||650;

  function shotDirection(e,p){
    const ax=p.x-e.x,ay=p.y-e.y,dx=Math.sign(ax),dy=Math.sign(ay);
    if(Math.abs(ax)>.5&&Math.abs(ay)>.5)return{x:dx,y:dy};
    return Math.abs(ax)>=Math.abs(ay)?{x:dx,y:0}:{x:0,y:dy};
  }
  function shootAt(e,p,style,power,ttl,hooks){const d=shotDirection(e,p);e.facing=d;hooks.shoot?.({x:e.x,y:e.y,dx:d.x,dy:d.y,power,style,ttl,source:e.follower?.name||e.kind})}

  function charge(e,p,host,map,hooks){
    if(e.chargeCooldown>0)return false;const d=dist(e,p);if(d>8||d<2)return false;
    e.chargeCooldown=1900;hooks.notice?.(e.follower?.name==="Swanh8ter"?"<strong>SWANH8TER CHARGES!</strong> Get round a corner or get flattened.":"<strong>CHARGE!</strong> Something has decided subtlety is overrated.","alert");
    let moved=false;
    for(let i=0;i<3;i++){
      if(man(e,p)<=1){hooks.melee?.(e,p,2);break}
      if(!moveToward(e,host,map,p))break;moved=true;
      if(man(e,p)<=1){hooks.melee?.(e,p,2);break}
    }
    return moved;
  }

  function attack(e,map,p,range,host,hooks){
    if(!p||e.attackCooldown>0)return false;const k=kind(e),hasLOS=lineOfSight(map,e,p,p.torchMs>0?C.enemy.torchSightRange:C.enemy.lineOfSightRange,host);
    if(["scout","hunter","ambusher","charger","ghost"].includes(k)&&range<=1.5){e.attackCooldown=k==="hunter"?700:k==="charger"?850:950;hooks.melee?.(e,p,k==="hunter"||k==="charger"?2:1);return true}
    if(!hasLOS)return false;
    if(k==="ranger"&&range<=10){shootAt(e,p,"normal",1,13,hooks);e.attackCooldown=900;return true}
    if(k==="root"&&range<=9){shootAt(e,p,"root",1,11,hooks);e.attackCooldown=1100;return true}
    if(k==="cook"&&range<=9){shootAt(e,p,"food",2,10,hooks);e.attackCooldown=1300;return true}
    if(k==="guard"&&range<=10){shootAt(e,p,"normal",1,12,hooks);e.attackCooldown=1000;return true}
    if(k==="firebreather"&&range<=3.4){shootAt(e,p,"fire",2,3,hooks);e.attackCooldown=1500;hooks.notice?.("<strong>YOSHI YOSHI BREATHES FIRE.</strong> Short range, nasty temper. Back up.","flame");return true}
    return false;
  }

  function support(e,host,dt,hooks){
    if(kind(e)!=="cook")return false;e.healCooldown-=dt;if(e.healCooldown>0)return false;let n=0;
    for(const a of host.enemies){if(a===e||!a.alive||a.hp>=a.maxHp||man(a,e)>4)continue;a.hp=Math.min(a.maxHp,a.hp+1);a.flash=120;n++}
    e.healCooldown=6500;if(n){hooks.notice?.("<strong>CPU SERVES DINNER.</strong> Nearby enemies regain health. Stop the chef.","heal");return true}return false;
  }

  function stepOne(e,host,map,players,dt,hooks,world){
    if(!e.alive)return false;e.attackCooldown-=dt;e.chargeCooldown=(e.chargeCooldown||0)-dt;e.moveCooldown-=dt;if(e.flash>0)e.flash=Math.max(0,e.flash-dt);
    let changed=support(e,host,dt,hooks);const [seen,range,reason]=visibleTarget(e,map,players,host,world);
    if(seen){
      const was=e.aiState;e.aiState="chase";e.lastSeen={x:seen.x,y:seen.y};e.memoryMs=memory(e);e.searchMs=0;e.targetId=seen.id;
      if(was!=="chase")hooks.alert?.(e,"alert",reason);
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
      if(["ranger","root","cook"].includes(k)){
        if(range<4){const away={x:e.x+Math.sign(e.x-seen.x)*2,y:e.y+Math.sign(e.y-seen.y)*2};moved=W.walkable(map,away.x,away.y,host)?moveToward(e,host,map,away):randomStep(e,host,map)}
        else if(range>6)moved=moveToward(e,host,map,seen);
        else moved=randomStep(e,host,map);
      }else if(k==="firebreather"){
        if(range>3)moved=moveToward(e,host,map,seen);else moved=randomStep(e,host,map);
      }else if(k==="ambusher")moved=moveToward(e,host,map,predicted(seen,map,3));
      else moved=moveToward(e,host,map,seen);
      if(moved&&man(e,seen)<=1)changed=attack(e,map,seen,dist(e,seen),host,hooks)||changed;
    }else if(e.aiState==="chase"&&e.lastSeen){
      moved=moveToward(e,host,map,e.lastSeen);if(e.x===e.lastSeen.x&&e.y===e.lastSeen.y){e.aiState="search";e.searchMs=C.enemy.searchTime;hooks.alert?.(e,"search")}
    }else if(e.aiState==="search")moved=randomStep(e,host,map);
    else moved=randomStep(e,host,map);

    e.moveCooldown=e.aiState==="chase"?chaseInterval(e):e.aiState==="search"?1100+Math.random()*450:idleInterval();
    return moved||changed;
  }

  function stepEnemies(host,map,players,dt,hooks={},world=window.__CCG_WORLD){
    if(!host?.enemies||!world)return;let changed=false;for(const e of host.enemies)changed=stepOne(e,host,map,players,dt,hooks,world)||changed;if(changed)host.revision++;
  }
  function alertEnemy(e,x,y){if(!e?.alive)return;e.aiState="chase";e.lastSeen={x,y};e.memoryMs=memory(e);e.searchMs=0;e.moveCooldown=Math.min(e.moveCooldown,180)}
  return{lineOfSight,visibleTarget,nextStepAStar:nextStep,stepEnemies,alertEnemy,kindOf:kind};
})();
