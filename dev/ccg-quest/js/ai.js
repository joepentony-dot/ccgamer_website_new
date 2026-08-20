window.CCGAI=(()=>{
  "use strict";
  const C=window.CCG_CONFIG;
  const DIRS=[[1,0],[-1,0],[0,1],[0,-1]];

  function distance(a,b){return Math.hypot(a.x-b.x,a.y-b.y)}
  function manhattan(a,b){return Math.abs(a.x-b.x)+Math.abs(a.y-b.y)}

  function lineOfSight(map,a,b,maxRange=C.enemy.lineOfSightRange){
    if(!a||!b||distance(a,b)>maxRange)return false;
    let x0=a.x,y0=a.y,x1=b.x,y1=b.y;
    let dx=Math.abs(x1-x0),sx=x0<x1?1:-1,dy=-Math.abs(y1-y0),sy=y0<y1?1:-1,err=dx+dy;
    while(true){
      if(!(x0===a.x&&y0===a.y)&&!(x0===b.x&&y0===b.y)&&map[y0]?.[x0]!==0)return false;
      if(x0===x1&&y0===y1)break;
      const e2=2*err;
      if(e2>=dy){err+=dy;x0+=sx}
      if(e2<=dx){err+=dx;y0+=sy}
    }
    return true;
  }

  function kindOf(e){return e.follower?.kind||e.kind}
  function memoryFor(e){return C.enemy.alertMemory[kindOf(e)]||C.enemy.alertMemory.scout}
  function moveInterval(e){
    const k=kindOf(e);
    if(k==="hunter")return 2200;
    if(k==="charger")return 1750;
    if(k==="ranger")return 2150;
    if(k==="root")return 2250;
    if(k==="cook")return 2450;
    if(k==="firebreather")return 2050;
    if(k==="ambusher")return 1950;
    if(k==="ghost")return 2100;
    if(k==="guard")return 999999;
    return 1850;
  }
  function idleInterval(e){return Math.max(moveInterval(e),C.enemy.idleStepMin)+Math.random()*(C.enemy.idleStepMax-C.enemy.idleStepMin)}

  function livePlayers(players){return players.filter(p=>p&&p.health>0)}
  function inViewCone(e,p){
    const d=distance(e,p);
    if(d<=2.25)return true;
    if(e.aiState==="chase")return true;
    const f=e.facing||{x:1,y:0};
    const vx=p.x-e.x,vy=p.y-e.y,len=Math.hypot(vx,vy)||1;
    const dot=(vx/len)*f.x+(vy/len)*f.y;
    return dot>=-0.05;
  }

  function visibleTarget(e,map,players){
    let best=null,bestDist=Infinity;
    for(const p of livePlayers(players)){
      const d=distance(e,p);
      if(d<bestDist&&inViewCone(e,p)&&lineOfSight(map,e,p,C.enemy.lineOfSightRange)){best=p;bestDist=d}
    }
    return best?[best,bestDist]:[null,Infinity];
  }

  function occupied(host,x,y,except){return host.enemies.some(o=>o!==except&&o.alive&&o.x===x&&o.y===y)}

  function randomStep(e,host,map){
    const choices=DIRS.map(([dx,dy])=>({x:e.x+dx,y:e.y+dy,dx,dy})).filter(p=>map[p.y]?.[p.x]===0&&!occupied(host,p.x,p.y,e));
    if(!choices.length)return false;
    choices.sort((a,b)=>{
      const af=(a.dx===e.facing?.x&&a.dy===e.facing?.y)?-1:0;
      const bf=(b.dx===e.facing?.x&&b.dy===e.facing?.y)?-1:0;
      return af-bf+(Math.random()-.5)*1.4;
    });
    if(Math.random()<.22)return false;
    const p=choices[0];e.x=p.x;e.y=p.y;e.facing={x:p.dx,y:p.dy};return true;
  }

  function reconstructStep(came,startKey,endKey){
    if(!came.has(endKey))return null;
    let cur=endKey,prev=came.get(cur);
    while(prev&&prev!==startKey){cur=prev;prev=came.get(cur)}
    const [x,y]=cur.split(",").map(Number);return{x,y};
  }

  function nextStepAStar(e,host,map,target){
    if(!target)return null;
    const startKey=`${e.x},${e.y}`,goalKey=`${target.x},${target.y}`;
    if(startKey===goalKey)return null;
    const open=[{x:e.x,y:e.y,g:0,f:manhattan(e,target)}],best=new Map([[startKey,0]]),came=new Map();
    let guard=0;
    while(open.length&&guard++<900){
      open.sort((a,b)=>a.f-b.f);const cur=open.shift(),ck=`${cur.x},${cur.y}`;
      if(ck===goalKey)return reconstructStep(came,startKey,goalKey);
      for(const [dx,dy] of DIRS){
        const x=cur.x+dx,y=cur.y+dy,nk=`${x},${y}`;
        if(map[y]?.[x]!==0)continue;
        if(occupied(host,x,y,e)&&nk!==goalKey)continue;
        const ng=cur.g+1;if(ng>=(best.get(nk)??Infinity))continue;
        best.set(nk,ng);came.set(nk,ck);open.push({x,y,g:ng,f:ng+Math.abs(x-target.x)+Math.abs(y-target.y)});
      }
    }
    return null;
  }

  function moveToward(e,host,map,target){
    const p=nextStepAStar(e,host,map,target);if(!p)return false;
    e.facing={x:Math.sign(p.x-e.x),y:Math.sign(p.y-e.y)};e.x=p.x;e.y=p.y;return true;
  }

  function predictedTarget(target,map,steps=3){
    const d=target?.dir||{x:0,y:0};let x=target.x,y=target.y;
    for(let i=0;i<steps;i++){const nx=x+d.x,ny=y+d.y;if(map[ny]?.[nx]!==0)break;x=nx;y=ny}
    return{x,y};
  }

  function shootAt(e,target,style,power,ttl,emitShot){
    const dx0=target.x-e.x,dy0=target.y-e.y;
    let dx=0,dy=0;
    if(Math.abs(dx0)>=Math.abs(dy0))dx=Math.sign(dx0);else dy=Math.sign(dy0);
    e.facing={x:dx,y:dy};emitShot?.({x:e.x,y:e.y,dx,dy,power,style,ttl});
  }

  function enterChase(e,target,hooks){
    const was=e.aiState;
    e.aiState="chase";e.lastSeen={x:target.x,y:target.y};e.memoryMs=memoryFor(e);e.searchMs=0;
    if(was!=="chase")hooks.alert?.(e,"alert");
  }
  function loseTarget(e,hooks){
    if(e.aiState!=="search")hooks.alert?.(e,"search");
    e.aiState="search";e.searchMs=C.enemy.searchTime;e.memoryMs=0;
  }
  function calm(e,hooks){
    if(e.aiState!=="idle")hooks.alert?.(e,"idle");
    e.aiState="idle";e.lastSeen=null;e.memoryMs=0;e.searchMs=0;e.moveCooldown=Math.max(e.moveCooldown,idleInterval(e));
  }

  function updateSupport(e,host,dt,hooks){
    if(kindOf(e)!=="cook")return false;
    e.healCooldown-=dt;
    if(e.healCooldown>0)return false;
    let healed=0;
    for(const ally of host.enemies){
      if(ally===e||!ally.alive||ally.hp>=ally.maxHp||manhattan(ally,e)>4)continue;
      ally.hp=Math.min(ally.maxHp,ally.hp+1);ally.flash=120;healed++;
    }
    e.healCooldown=7600;
    if(healed){hooks.notice?.("<strong>CPU SERVES DINNER.</strong> Nearby enemies regain health. Someone unplug the kitchen.","heal");return true}
    return false;
  }

  function attackIfPossible(e,map,target,range,hooks){
    if(!target||!lineOfSight(map,e,target,C.enemy.lineOfSightRange)||range===Infinity||e.attackCooldown>0)return false;
    const k=kindOf(e);
    if(k==="ranger"&&range<=9){shootAt(e,target,"normal",1,11,hooks.shoot);e.attackCooldown=2500;return true}
    if(k==="root"&&range<=8){shootAt(e,target,"root",1,9,hooks.shoot);e.attackCooldown=2700;return true}
    if(k==="cook"&&range<=8){shootAt(e,target,"food",2,8,hooks.shoot);e.attackCooldown=3100;return true}
    if(k==="guard"&&range<=9){shootAt(e,target,"normal",1,10,hooks.shoot);e.attackCooldown=2800;return true}
    if(k==="firebreather"&&range<=3.7){
      shootAt(e,target,"fire",2,3,hooks.shoot);e.attackCooldown=3300;
      hooks.notice?.("<strong>YOSHI YOSHI BREATHES FIRE.</strong> Short range, nasty temper, very small insurance excess.","flame");return true;
    }
    return false;
  }

  function stepOne(e,host,map,players,dt,hooks){
    if(!e.alive)return false;
    e.attackCooldown-=dt;e.moveCooldown-=dt;if(e.flash>0)e.flash=Math.max(0,e.flash-dt);
    let changed=updateSupport(e,host,dt,hooks);

    const [seen,range]=visibleTarget(e,map,players);
    if(seen)enterChase(e,seen,hooks);
    else if(e.aiState==="chase"){
      e.memoryMs-=dt;
      if(e.memoryMs<=0||(!e.lastSeen)){loseTarget(e,hooks)}
    }else if(e.aiState==="search"){
      e.searchMs-=dt;if(e.searchMs<=0)calm(e,hooks);
    }

    if(seen)changed=attackIfPossible(e,map,seen,range,hooks)||changed;
    if(kindOf(e)==="guard")return changed;
    if(e.moveCooldown>0)return changed;

    const k=kindOf(e);let moved=false;
    if(seen){
      if(k==="ranger"||k==="root"||k==="cook"){
        if(range<4){
          const away={x:e.x+Math.sign(e.x-seen.x)*2,y:e.y+Math.sign(e.y-seen.y)*2};
          if(map[away.y]?.[away.x]===0)moved=moveToward(e,host,map,away);else moved=randomStep(e,host,map);
        }else if(range>6)moved=moveToward(e,host,map,seen);
      }else if(k==="firebreather"){
        if(range>3)moved=moveToward(e,host,map,seen);
      }else if(k==="ambusher"){
        moved=moveToward(e,host,map,predictedTarget(seen,map,3));
      }else if(k==="charger"&&range<=6&&e.attackCooldown<=0){
        moved=moveToward(e,host,map,seen);if(range>2)moved=moveToward(e,host,map,seen)||moved;e.attackCooldown=3900;
      }else moved=moveToward(e,host,map,seen);
    }else if(e.aiState==="chase"&&e.lastSeen){
      moved=moveToward(e,host,map,e.lastSeen);
      if(e.x===e.lastSeen.x&&e.y===e.lastSeen.y)loseTarget(e,hooks);
    }else if(e.aiState==="search"){
      moved=randomStep(e,host,map);
    }else{
      moved=randomStep(e,host,map);
    }

    e.moveCooldown=(e.aiState==="idle"?idleInterval(e):moveInterval(e))+Math.random()*350;
    return moved||changed;
  }

  function stepEnemies(host,map,players,dt,hooks={}){
    if(!host||!Array.isArray(host.enemies))return;
    let changed=false;
    for(const e of host.enemies)changed=stepOne(e,host,map,players,dt,hooks)||changed;
    if(changed)host.revision++;
  }

  function alertEnemy(e,x,y){
    if(!e||!e.alive)return;e.aiState="chase";e.lastSeen={x,y};e.memoryMs=memoryFor(e);e.searchMs=0;
  }

  return{lineOfSight,visibleTarget,nextStepAStar,stepEnemies,alertEnemy,kindOf};
})();
