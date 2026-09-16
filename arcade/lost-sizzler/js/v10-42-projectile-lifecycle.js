/* C64 Dungeon Carnage V10.42 — authoritative projectile lifecycle cleanup. */
(()=>{
  "use strict";
  if(window.CCGLostSizzlerV142ProjectileLifecycle)return;

  const diagnostics={steps:0,playerRetired:0,enemyRetired:0,impactRetirements:0,faultSweeps:0};

  function sweepExpired(list,kind){
    if(!Array.isArray(list))return 0;
    let removed=0;
    for(let i=list.length-1;i>=0;i--){
      if(Number(list[i]?.ttl)>0)continue;
      list.splice(i,1);removed++;
    }
    if(kind==="player")diagnostics.playerRetired+=removed;
    else if(kind==="enemy")diagnostics.enemyRetired+=removed;
    return removed;
  }

  function consumeImpact(projectile){
    if(!projectile)return true;
    if(Number(projectile.pierce||0)>0){
      projectile.pierce=Number(projectile.pierce||0)-1;
      return false;
    }
    projectile.ttl=0;
    diagnostics.impactRetirements++;
    return true;
  }

  function stepProjectilesV142Lifecycle(){
    diagnostics.steps++;
    let completed=false;
    try{
      for(const b of bullets){
        if(b.ttl<=0)continue;
        const nx=b.x+b.dx,ny=b.y+b.dy;
        if(damageFurnitureAt(nx,ny,b.power)){b.ttl=0;continue}
        if(!projectilePathClear(b,nx,ny)){
          b.ttl=0;
          burst(b.x,b.y,b.element==="shock"?P.cyan:b.element==="fire"?P.orange:P.gold,14,1);
          ring(b.x,b.y,b.element==="shock"?P.cyan:P.orange,20);
          S.sfx("wall");
          continue;
        }
        b.x=nx;b.y=ny;b.ttl--;
        const trailCol=b.element==="fire"?P.orange:b.element==="shock"?P.cyan:b.element==="physical"?P.white:P.gold;
        for(let n=0;n<3;n++)particles.push({x:(nx-b.dx*(.15+n*.18))*C.tile+C.tile/2+(Math.random()-.5)*4,y:(ny-b.dy*(.15+n*.18))*C.tile+C.tile/2+(Math.random()-.5)*4,vx:-b.dx*(.4+Math.random()*.8)+(Math.random()-.5)*.5,vy:-b.dy*(.4+Math.random()*.8)+(Math.random()-.5)*.5,life:130+n*45,col:trailCol,size:1.4+n*.7,drag:.91,glow:7});

        const puzzleTorch=(host.sequenceTorchPuzzle?.torches||[]).find(t=>t.x===Math.round(nx)&&t.y===Math.round(ny));
        if(puzzleTorch&&!host.sequenceTorchPuzzle?.solved){b.ttl=0;activateSequenceTorch(puzzleTorch,findLocal(b.owner)||p1,true);continue}

        const sw=(host.switches||[]).find(s=>s.active&&s.x===Math.round(nx)&&s.y===Math.round(ny));
        if(sw){b.ttl=0;activateSwitch(sw,findLocal(b.owner)||p1,true);continue}

        const stalker=host.stalker;
        const stalkerImpact=Boolean(stalker?.awake&&!(stalker.stunMs>0)&&Math.round(nx)===stalker.x&&Math.round(ny)===stalker.y);
        if(stalkerImpact){b.ttl=0;hitStalker(b);continue}

        const g=(host.generators||[]).find(g=>g.alive&&g.x===Math.round(nx)&&g.y===Math.round(ny));
        if(g){consumeImpact(b);damageGenerator(g,b.power,findLocal(b.owner)||p1);continue}

        // Projectile collision remains authoritative and never checks visibleTo:
        // blind fire can hit an enemy in darkness. Retire a non-piercing impact
        // before downstream damage/death callbacks so a recoverable callback
        // fault cannot leave the projectile resident in the authoritative array.
        const e=host.enemies.find(e=>e.alive&&e.x===Math.round(nx)&&e.y===Math.round(ny));
        if(e){
          const impactCol=e.deathStalker&&e.voidStalker?P.purple:b.element==="shock"?P.cyan:b.element==="fire"?P.orange:P.gold;
          burst(e.x,e.y,impactCol,20,1.35);ring(e.x,e.y,impactCol,28);
          consumeImpact(b);
          const owner=findLocal(b.owner);
          if(owner)damageEnemy(e,b.power,b.element,owner);
          else if(playMode==="online")net.send("hit",{enemyId:e.id,power:b.power,element:b.element,owner:b.owner,ownerName:b.ownerName,source:{x:b.x,y:b.y}});
          continue;
        }

        for(const lp of localPlayers())if(lp.id!==b.owner&&Math.round(nx)===lp.x&&Math.round(ny)===lp.y){b.ttl=0;hurtPlayer(lp,1,true,b.ownerName||"your co-op partner",b.owner);break}
      }

      for(const b of enemyBullets){
        if(b.ttl<=0)continue;
        const nx=b.x+b.dx,ny=b.y+b.dy;
        if(!projectilePathClear(b,nx,ny)){b.ttl=0;continue}
        b.x=nx;b.y=ny;b.ttl--;
        if(b.style==="fire")burst(nx,ny,Math.random()<.5?P.orange:P.gold,3,.6);
        for(const lp of localPlayers())if(Math.round(nx)===lp.x&&Math.round(ny)===lp.y){b.ttl=0;hurtPlayer(lp,Number(b.power||1),false,b.source||"enemy");const px=lp.x+b.dx,py=lp.y+b.dy;if(W.walkable(world.map,px,py,host)){lp.x=px;lp.y=py}break}
      }
      completed=true;
    }finally{
      sweepExpired(bullets,"player");
      sweepExpired(enemyBullets,"enemy");
      if(!completed)diagnostics.faultSweeps++;
    }
  }

  stepProjectilesV142Lifecycle.__ccgV142ProjectileLifecycle=true;
  stepProjectilesV142Lifecycle.__ccgOriginal=window.stepProjectiles;
  window.stepProjectiles=stepProjectilesV142Lifecycle;

  window.CCGLostSizzlerV142ProjectileLifecycle=Object.freeze({
    version:"V10.42-projectile-lifecycle",
    diagnostics,
    consumeImpact,
    sweepExpired,
    ownsBoundary:()=>window.stepProjectiles===stepProjectilesV142Lifecycle
  });
})();
