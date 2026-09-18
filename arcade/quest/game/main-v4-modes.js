"use strict";
function startFighter(){
  clearWorld();S.fighter={x:1190,groundY:Q.GROUND,hp:100,max:100,vx:0,vy:0,ground:true,face:-1,think:.7,cool:.8,attack:null,stun:0,guard:0,time:T.fighter.duration,ai:'watch',anim:Q.createSpriteAnimator('idle'),comboTaken:0};
  P.x=330;P.y=Q.GROUND-P.h;P.hp=100;P.vx=P.vy=0;P.face=1;P.anim=Q.createSpriteAnimator('idle');S.checkpoint={kind:'fighter'};audio.setTheme(1,true,'fighter');transition('THE 36% CONVERSION BOUT','HIGH PUNCH = CROUCH. LOW KICK = JUMP. YOU NOW GET A REAL WARNING.','fighter',1.65);
}
function fighterEnemyMeta(){return Q.customAssetMeta?.('spritesheets','fighter');}
function fighterEnemyBox(f){return Q.spriteHitbox(fighterEnemyMeta(),'idle',f.x,f.groundY,{x:f.x-46,y:f.groundY-250,w:92,h:240});}
function fighterAttackBox(cx,groundY,type,face){const reach=type==='kick'?178:148,y=type==='kick'?groundY-95:groundY-235,h=type==='kick'?62:52,x=face>0?cx+26:cx-26-reach;return{x,y,w:reach,h};}
function playerAttack(type){if(P.attack||P.duck||P.stun>0)return;P.attack={type,t:0,hit:false};audio.sfx(type);}
function enemyAttack(type){const f=S.fighter;if(f.attack||f.stun>0)return;f.attack={type,phase:'telegraph',t:0,hit:false};f.ai=type==='punch'?'HIGH PUNCH — CROUCH':'LOW KICK — JUMP';audio.sfx('bosswarn');}
function updateAttackClock(a,dt,enemy){
  if(!a)return null;a.t+=dt;const cfg=T.fighter;
  if(enemy){const tele=a.type==='kick'?cfg.kickTelegraph:cfg.punchTelegraph,active=a.type==='kick'?cfg.kickActive:cfg.punchActive,recover=a.type==='kick'?cfg.kickRecover:cfg.punchRecover;if(a.phase==='telegraph'&&a.t>=tele){a.phase='active';a.t=0;audio.sfx(a.type);}else if(a.phase==='active'&&a.t>=active){a.phase='recover';a.t=0;}else if(a.phase==='recover'&&a.t>=recover)return null;}
  else{const wind=a.type==='kick'?cfg.playerKickWindup:cfg.playerPunchWindup,active=a.type==='kick'?cfg.playerKickActive:cfg.playerPunchActive,recover=a.type==='kick'?cfg.playerKickRecover:cfg.playerPunchRecover;if(!a.phase)a.phase='windup';if(a.phase==='windup'&&a.t>=wind){a.phase='active';a.t=0;}else if(a.phase==='active'&&a.t>=active){a.phase='recover';a.t=0;}else if(a.phase==='recover'&&a.t>=recover)return null;}
  return a;
}
function updateFighter(dt){
  const f=S.fighter;f.time=Math.max(0,f.time-dt);P.stun=Math.max(0,P.stun-dt);f.stun=Math.max(0,f.stun-dt);f.guard=Math.max(0,f.guard-dt);f.cool-=dt;f.think-=dt;
  P.duck=input.down('ArrowDown','KeyS')&&P.ground&&P.stun<=0&&!P.attack;let mv=0;if(P.stun<=0&&!P.attack)mv=(input.down('ArrowLeft','KeyA')?-1:0)+(input.down('ArrowRight','KeyD')?1:0);P.vx=Q.lerp(P.vx,mv*(P.duck?145:T.fighter.playerSpeed),Math.min(1,dt*13));if(!mv)P.vx*=Math.pow(.035,dt);
  if(!P.duck&&input.tap('Space','ArrowUp','KeyW')&&P.ground&&P.stun<=0){P.vy=-T.fighter.jumpVelocity;P.ground=false;audio.sfx('jump');}
  if(P.stun<=0&&input.tap('KeyZ','ControlLeft'))playerAttack('punch');if(P.stun<=0&&input.tap('KeyX','KeyC'))playerAttack('kick');
  P.vy+=T.fighter.gravity*dt;P.x=clamp(P.x+P.vx*dt,95,1430);P.y+=P.vy*dt;if(P.y>=Q.GROUND-P.h){P.y=Q.GROUND-P.h;P.vy=0;P.ground=true;}
  f.face=P.x<f.x?-1:1;P.face=f.x>=P.x?1:-1;const dist=f.x-playerAnchorX(),ad=Math.abs(dist);
  if(f.think<=0&&!f.attack&&f.stun<=0){
    f.think=rand(T.fighter.enemyThinkMin,T.fighter.enemyThinkMax);const r=Math.random();
    if(ad>330){f.vx=-Math.sign(dist)*rand(145,205);f.ai='advance';}
    else if(P.attack&&P.attack.phase==='active'&&r<.45){f.guard=.42;f.ai='guard';f.vx=0;}
    else if(f.cool<=0&&r<.72){enemyAttack(Math.random()<.52?'punch':'kick');f.cool=rand(T.fighter.enemyCooldownMin,T.fighter.enemyCooldownMax);f.vx=0;}
    else if(r<.86){f.vx=Math.sign(dist)*rand(75,125);f.ai='reset';}
    else{f.vx=-Math.sign(dist)*rand(60,100);f.ai='space';}
  }
  f.x=clamp(f.x+f.vx*dt,120,1480);f.vx*=Math.pow(f.stun>0?.35:.09,dt);

  if(P.attack){
    P.attack=updateAttackClock(P.attack,dt,false);
    if(P.attack&&P.attack.phase==='active'&&!P.attack.hit){const atk=fighterAttackBox(playerAnchorX(),playerGround(),P.attack.type,P.face),body=fighterEnemyBox(f);if(rhit(atk,body)){P.attack.hit=true;let dmg=P.attack.type==='kick'?14:10;if(f.guard>0)dmg=Math.ceil(dmg*.25);f.hp-=dmg;f.stun=f.guard>0?.12:.28;f.vx=P.face*(f.guard>0?90:270);score(100,f.x,f.groundY-150);comboHit();f.comboTaken++;sparks(f.x,f.groundY-130,'#ffe66c',13);if(!S.practice&&S.combo>=5)ACH.flag('fighterCombo');}}
  }
  if(f.attack){
    f.attack=updateAttackClock(f.attack,dt,true);
    if(f.attack&&f.attack.phase==='active'&&!f.attack.hit){const atk=fighterAttackBox(f.x,f.groundY,f.attack.type,f.face),body=playerBox();if(rhit(atk,body)){f.attack.hit=true;hurt(f.attack.type==='kick'?16:12,f.face*250);}}
    if(!f.attack)f.ai='recover';
  }
  const fs=f.stun>0?'hit':f.guard>0?'guard':f.attack?f.attack.type:Math.abs(f.vx)>35?'walk':'idle';Q.stepSpriteAnimator(f.anim,fs,dt);syncPlayerAnim(dt);
  if(f.hp<=0){f.hp=0;if(!S.practice)ACH.add('fighterWins',1);score(2400,f.x,f.groundY-150);if(S.practice)transition('PRACTICE COMPLETE','Retsu defeated.','title',1.4);else startInvaders();return;}
  if(f.time<=0){if(S.practice)transition('BOUT COMPLETE','Timer called it.','title',1.4);else startInvaders();}
}

function startInvaders(){
  clearWorld();const aliens=[];for(let r=0;r<T.invaders.rows;r++)for(let c=0;c<T.invaders.cols;c++)aliens.push({row:r,col:c,x:405+c*92,y:150+r*62,w:58,h:38,alive:true,phase:rand(0,6)});
  S.inv={aliens,dir:1,speed:T.invaders.baseSpeed,drop:0,shipX:800,shots:[],cool:0,enemyCool:.8,shield:3,bunkers:[420,680,920,1180].map(x=>({x,y:690,w:120,h:36,hp:5,max:5})),started:0};S.checkpoint={kind:'invaders'};audio.setTheme(2,false,'invaders');transition('ALIEN FORMATION','BREAK THE FORMATION. THE SHOTS ARE SLOWER AND THE BUNKERS MATTER.','invaders',1.55);
}
function invaderShotHit(sh,b){return sh.x>b.x-b.w/2&&sh.x<b.x+b.w/2&&sh.y>b.y&&sh.y<b.y+b.h;}
function updateInvaders(dt){
  const g=S.inv;g.started+=dt;let mv=(input.down('ArrowLeft','KeyA')?-1:0)+(input.down('ArrowRight','KeyD')?1:0);g.shipX=clamp(g.shipX+mv*410*dt,70,1530);g.cool=Math.max(0,g.cool-dt);g.enemyCool-=dt;
  if(input.tap('Space','KeyZ','ControlLeft')&&g.cool<=0){g.shots.push({x:g.shipX,y:770,vy:-620,owner:'p'});g.cool=T.invaders.playerCooldown;audio.sfx('shot');}
  const alive=g.aliens.filter(a=>a.alive);if(!alive.length){if(!S.practice)ACH.flag('alienFormation');score(2600,800,400);if(S.practice)transition('PRACTICE COMPLETE','Formation broken.','title',1.4);else enterStage(2);return;}
  const minX=Math.min(...alive.map(a=>a.x)),maxX=Math.max(...alive.map(a=>a.x+a.w));if((g.dir>0&&maxX>1450)||(g.dir<0&&minX<150)){g.dir*=-1;for(const a of alive)a.y+=22;}
  const progress=1-alive.length/(T.invaders.rows*T.invaders.cols),speed=T.invaders.baseSpeed+progress*T.invaders.lateSpeedBonus;for(const a of alive){a.x+=g.dir*speed*dt;a.phase+=dt*6;}
  if(g.enemyCool<=0){const shooters=alive.filter(a=>!alive.some(b=>b.alive&&b.col===a.col&&b.row>a.row)),a=pick(shooters.length?shooters:alive);g.shots.push({x:a.x+a.w/2,y:a.y+a.h+8,vy:rand(230,290),owner:'e'});g.enemyCool=rand(T.invaders.enemyCooldownMin,T.invaders.enemyCooldownMax);}
  for(const sh of g.shots){sh.y+=sh.vy*dt;if(sh.owner==='p'){for(const a of alive){if(a.alive&&sh.x>a.x&&sh.x<a.x+a.w&&sh.y>a.y&&sh.y<a.y+a.h){a.alive=false;sh.dead=true;score(90+a.row*20,a.x,a.y);sparks(a.x+28,a.y+18,'#70e8ff',10);break;}}}else if(sh.y>760&&Math.abs(sh.x-g.shipX)<46){sh.dead=true;g.shield--;S.shake=6;audio.sfx('hit');if(g.shield<=0){S.lives--;if(S.lives<=0){gameOver();return;}g.shield=3;g.shipX=800;g.shots=[];float('CHECKPOINT',800,735,'#7df0a5');return;}}
    for(const b of g.bunkers){if(b.hp>0&&invaderShotHit(sh,b)){b.hp--;sh.dead=true;break;}}
    if(sh.y<-40||sh.y>940)sh.dead=true;
  }
  g.shots=g.shots.filter(s=>!s.dead);if(alive.some(a=>a.y>700)){S.lives--;if(S.lives<=0)gameOver();else startInvaders();}
}

const MAZE_LAYOUT=[
  '#########################',
  '#...........#...........#',
  '#.###.#####.#.#####.###.#',
  '#.#.......#...#.......#.#',
  '#.#.###.#.#####.#.###.#.#',
  '#.....#.#.......#.#.....#',
  '#####.#.###.#.###.#.#####',
  '#.....#.....#.....#.....#',
  '#.###.#####.#.#####.###.#',
  '#...........#...........#',
  '#########################'
];
function startMaze(){
  clearWorld();const H=MAZE_LAYOUT.length,W=MAZE_LAYOUT[0].length,walls=new Set(),dots=new Set();for(let y=0;y<H;y++)for(let x=0;x<W;x++){const k=`${x},${y}`;if(MAZE_LAYOUT[y][x]==='#')walls.add(k);else dots.add(k);}const power=new Set(['1,1','23,1','1,9','23,9']);for(const k of power)dots.add(k);const spawn={x:12,y:5};dots.delete(`${spawn.x},${spawn.y}`);
  S.maze={W,H,walls,dots,power,px:spawn.x,py:spawn.y,dir:{x:0,y:0},want:{x:0,y:0},move:0,collected:0,target:Math.min(T.maze.target,dots.size),powered:0,enemies:[{x:1,y:1,sx:1,sy:1,c:'#ff536d',role:0,t:0},{x:23,y:1,sx:23,sy:1,c:'#ff9a57',role:1,t:.12},{x:1,y:9,sx:1,sy:9,c:'#7dffb4',role:2,t:.24},{x:23,y:9,sx:23,sy:9,c:'#b36cff',role:3,t:.36}],fruit:{x:11,y:9,active:true},mouth:0};S.checkpoint={kind:'maze'};audio.setTheme(2,false,'maze');transition('DOT-MAZE RUN','THE FOUR HUNTERS NOW BEHAVE DIFFERENTLY. POWER PELLETS BUY YOU TIME.','maze',1.55);
}
function mazeOpen(m,x,y){return x>=0&&y>=0&&x<m.W&&y<m.H&&!m.walls.has(`${x},${y}`);}
function mazeStepTarget(m,e){
  if(m.powered>0)return{x:e.role%2?23:1,y:e.role<2?9:1,away:true};
  if(e.role===0)return{x:m.px,y:m.py};
  if(e.role===1)return{x:clamp(m.px+m.dir.x*4,1,m.W-2),y:clamp(m.py+m.dir.y*4,1,m.H-2)};
  if(e.role===2)return{x:m.px<12?22:2,y:m.py<5?9:1};
  return{x:12,y:5};
}
function moveMazeEnemy(m,e){const dirs=[{x:1,y:0},{x:-1,y:0},{x:0,y:1},{x:0,y:-1}],opts=dirs.filter(d=>mazeOpen(m,e.x+d.x,e.y+d.y));if(!opts.length)return;const target=mazeStepTarget(m,e),scoreDir=d=>Math.abs(e.x+d.x-target.x)+Math.abs(e.y+d.y-target.y)+Math.random()*.35;opts.sort((a,b)=>scoreDir(a)-scoreDir(b));const d=target.away?opts[opts.length-1]:opts[0];e.x+=d.x;e.y+=d.y;}
function updateMaze(dt){
  const m=S.maze;m.mouth+=dt*10;m.powered=Math.max(0,m.powered-dt);m.move-=dt;if(input.tap('ArrowLeft','KeyA'))m.want={x:-1,y:0};if(input.tap('ArrowRight','KeyD'))m.want={x:1,y:0};if(input.tap('ArrowUp','KeyW'))m.want={x:0,y:-1};if(input.tap('ArrowDown','KeyS'))m.want={x:0,y:1};
  if(m.move<=0){if(mazeOpen(m,m.px+m.want.x,m.py+m.want.y))m.dir={...m.want};if(mazeOpen(m,m.px+m.dir.x,m.py+m.dir.y)){m.px+=m.dir.x;m.py+=m.dir.y;}m.move=T.maze.moveCooldown;const k=`${m.px},${m.py}`;if(m.dots.has(k)){m.dots.delete(k);m.collected++;score(m.power.has(k)?180:30,800,100);if(m.power.has(k)){m.powered=T.maze.powerDuration;m.power.delete(k);audio.sfx('shield');}else audio.sfx('pickup');}if(m.fruit.active&&m.px===m.fruit.x&&m.py===m.fruit.y){m.fruit.active=false;score(500,800,100);}}
  const pace=m.collected>m.target*.75?T.maze.enemyLate:m.collected>m.target*.4?T.maze.enemyMid:T.maze.enemyEarly;for(const e of m.enemies){e.t-=dt;if(e.t<=0){moveMazeEnemy(m,e);e.t=pace+(e.role*.012);}}
  for(const e of m.enemies){if(e.x===m.px&&e.y===m.py){if(m.powered>0){score(250,800,100);e.x=e.sx;e.y=e.sy;e.t=.5;}else{S.lives--;if(S.lives<=0){gameOver();return;}m.px=12;m.py=5;m.dir={x:0,y:0};m.want={x:0,y:0};m.powered=0;for(const z of m.enemies){z.x=z.sx;z.y=z.sy;z.t=.5;}float('CHECKPOINT',800,110,'#7df0a5');}}}
  if(m.collected>=m.target){if(!S.practice)ACH.flag('mazeClear');score(2600,800,450);if(S.practice)transition('PRACTICE COMPLETE','Dot-Maze cleared.','title',1.4);else enterStage(3);}
}

function update(dt){
  S.time+=dt;S.shake=Math.max(0,S.shake-dt*25);S.flash=Math.max(0,S.flash-dt*1.7);
  if(S.mode==='transition'){S.transition.t+=dt;if(S.transition.t>=S.transition.dur)mode(S.transition.next);return;}
  if(S.mode==='stage')updateStage(dt);else if(S.mode==='boss')updateBoss(dt);else if(S.mode==='beads')updateBeads(dt);else if(S.mode==='fighter')updateFighter(dt);else if(S.mode==='invaders')updateInvaders(dt);else if(S.mode==='maze')updateMaze(dt);
}
