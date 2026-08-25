(function(){
'use strict';
const Q=window.CCGQuest;
const canvas=document.getElementById('game');
const ctx=canvas.getContext('2d',{alpha:false});
const loading=document.getElementById('loading');
const input=new Q.Input(canvas);
const assets=new Q.AssetLoader();
const audio=new Q.AudioEngine();
const T=Q.TUNE;
ctx.imageSmoothingEnabled=true;

const S={mode:'loading',returnMode:'title',practice:false,stage:0,elapsed:0,time:0,last:0,score:0,best:0,lives:3,mult:1,combo:0,comboUntil:0,objective:0,entities:[],shots:[],particles:[],pending:[],boss:null,mini:null,fighter:null,inv:null,maze:null,buttons:[],transition:null,shake:0,flash:0,toast:null,patternTimer:0,itemTimer:0,powerTimer:0,enemyTimer:0,stageGrace:0,bossDamageTaken:0,cameraX:0};
const P={x:250,y:0,w:78,h:132,vx:0,vy:0,ground:true,face:1,hp:100,max:100,duck:false,stun:0,inv:0,fire:0,shield:0,speed:0,double:0,anim:0,jumpAge:0,landTimer:0,coyote:0,attack:null,attackT:0,attackLen:0,hitLatch:false,combo:0,comboUntil:0};
P.y=Q.GROUND-P.h;
const ACH=new Q.Achievements(a=>{S.toast={text:a.name,xp:a.xp,until:Q.now()+3200};audio.sfx('unlock');});
S.best=ACH.profile.best||0;
const now=()=>Q.now(),clamp=Q.clamp,rand=Q.rand,pick=Q.pick,rhit=Q.rectHit;

function rr(x,y,w,h,r,fill=true,stroke=false){ctx.beginPath();ctx.roundRect(x,y,w,h,r);if(fill)ctx.fill();if(stroke)ctx.stroke();}
function text(t,x,y,size=20,col='#fff',align='left',weight=800){ctx.fillStyle=col;ctx.font=`${weight} ${size}px Consolas,monospace`;ctx.textAlign=align;ctx.textBaseline='alphabetic';ctx.fillText(t,x,y);}
function bar(x,y,w,p,c){ctx.fillStyle='rgba(0,0,0,.78)';rr(x,y,w,14,6);ctx.fillStyle='#252334';rr(x+2,y+2,w-4,10,4);ctx.fillStyle=c;rr(x+2,y+2,(w-4)*clamp(p,0,1),10,4);}
function focus(){canvas.focus({preventScroll:true});try{scrollTo({top:0,left:0,behavior:'instant'});}catch(_e){scrollTo(0,0);}}
function mode(m){S.mode=m;S.buttons=[];focus();}
function stage(){return Q.STAGES[S.stage]||Q.STAGES[0];}
function schedule(delay,fn){S.pending.push({delay,fn,done:false});}
function updatePending(dt){for(const p of S.pending){p.delay-=dt;if(p.delay<=0&&!p.done){p.done=true;p.fn();}}S.pending=S.pending.filter(p=>!p.done);}
function sparks(x,y,c='#6eeaff',n=12){for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,v=rand(90,340);S.particles.push({kind:'dot',x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,c,r:rand(2,6),life:rand(.25,.75)});}}
function float(t,x,y,c='#fff'){S.particles.push({kind:'text',t,x,y,c,life:1});}
function score(n,x=P.x,y=P.y){const v=Math.round(n*(now()<P.double?2:1)*S.mult);S.score+=v;if(!S.practice){ACH.score(S.score);ACH.profile.totals.scoreLifetime+=v;if(S.score>S.best){S.best=S.score;ACH.profile.best=S.best;}ACH.save();}float('+'+v,x,y,'#ffe66c');}
function comboHit(){S.combo=now()<S.comboUntil?Math.min(8,S.combo+1):1;S.comboUntil=now()+1700;S.mult=1+Math.min(3,S.combo*.25);}
function clearCombo(){if(now()>S.comboUntil){S.combo=0;S.mult=1;}}
function clearWorld(){S.entities=[];S.shots=[];S.particles=[];S.pending=[];S.boss=null;S.mini=null;S.fighter=null;S.inv=null;S.maze=null;}
function resetPlayer(){Object.assign(P,{x:250,y:Q.GROUND-P.h,vx:0,vy:0,ground:true,face:1,hp:100,duck:false,stun:0,inv:0,fire:0,shield:0,speed:0,double:0,anim:0,jumpAge:0,landTimer:0,coyote:0,attack:null,hitLatch:false,combo:0,comboUntil:0});}
function resetRun(){S.score=0;S.lives=3;S.mult=1;S.combo=0;S.objective=0;clearWorld();resetPlayer();}
function transition(title,sub,next,dur=1.65){S.transition={title,sub,next,t:0,dur};mode('transition');}

function load(){
  const jobs=[];
  for(const k of ['bedroom','budget','christmas','amiga','guru','beads','fighter','invaders','maze']){jobs.push(assets.optionalImage('bg_'+k,`assets/backgrounds/${k}.svg`));jobs.push(assets.optionalImage('custom_bg_'+k,Q.customAsset?.('backgrounds',k)));}
  for(const scene of ['bedroom','beads','budget','fighter','invaders','christmas','maze','amiga','guru'])for(const suffix of ['Back','Mid','Front'])jobs.push(assets.optionalImage('layer_'+scene+suffix,Q.customAsset?.('layers',scene+suffix)));
  for(const key of ['player','playerFight','fighter','enemy','bossBedroom','bossBudget','bossChristmas','bossAmiga','bossGuru'])jobs.push(assets.image('sheet_'+key,Q.customAsset('spritesheets',key)));
  for(const k of ['bedroom','budget','christmas','amiga','guru'])jobs.push(assets.optionalImage('boss_'+k,Q.customAsset?.('bosses',k)));
  for(const k of ['tape','disk','zzap','joystick'])jobs.push(assets.optionalImage('item_'+k,Q.customAsset?.('collectibles',k)));
  for(const k of ['shield','speed','double'])jobs.push(assets.optionalImage('power_'+k,Q.customAsset?.('powers',k)));
  for(const k of ['alien1','alien2','alien3','alien4','alien5','ship','bunker','enemyShot','playerShot'])jobs.push(assets.optionalImage('invader_'+k,Q.customAsset?.('invaders',k)));
  return Promise.all(jobs);
}

function playerSpriteState(){
  if(S.mode==='fighter'){
    if(P.stun>0)return'hit';
    if(P.attack)return P.attack;
    if(P.duck&&P.ground)return'duck';
    if(!P.ground)return'jump';
    if(Math.abs(P.vx)>35)return'walk';
    return'idle';
  }
  if(P.stun>0)return'hit';
  if(P.duck&&P.ground)return P.fire>0?'duckFire':'duck';
  if(!P.ground){if(P.jumpAge<.09)return'jumpTakeoff';if(P.vy<-220)return'jumpRise';if(Math.abs(P.vy)<=220)return'jumpApex';return'fall';}
  if(P.landTimer>0)return'land';
  if(P.fire>0)return'fire';
  if(Math.abs(P.vx)>35)return'run';
  return'idle';
}
function playerMeta(){return Q.customAssetMeta?.('spritesheets',S.mode==='fighter'?'playerFight':'player');}
function playerBox(){const meta=playerMeta(),stateName=playerSpriteState(),fallback={x:P.x,y:P.y,w:P.w,h:P.h};return Q.spriteHitbox?.(meta,stateName,P.x+P.w/2,P.y+P.h,fallback)||fallback;}
function playerGround(){return P.y+P.h;}
function updatePlayer(dt,opts={}){
  const gravity=opts.gravity||T.player.gravity,canFire=opts.fire!==false,limitLeft=opts.left||65,limitRight=opts.right||Q.W-65-P.w;
  const wasGround=P.ground;
  P.stun=Math.max(0,P.stun-dt);P.landTimer=Math.max(0,P.landTimer-dt);P.coyote=P.ground?.1:Math.max(0,P.coyote-dt);
  P.duck=input.down('ArrowDown','KeyS')&&P.ground&&P.stun<=0;
  let move=0;if(P.stun<=0)move=(input.down('ArrowLeft','KeyA')?-1:0)+(input.down('ArrowRight','KeyD')?1:0);
  const base=now()<P.speed?T.player.runSpeed*1.24:T.player.runSpeed,max=P.duck?T.player.crouchSpeed:base;
  const control=P.ground?1:T.player.airControl;
  P.vx=Q.lerp(P.vx,move*max,Math.min(1,dt*T.player.accel*control));
  if(!move&&P.stun<=0)P.vx*=Math.pow(.025,dt);
  if(move)P.face=move;
  if(!P.duck&&P.stun<=0&&input.tap('Space','ArrowUp','KeyW')&&(P.ground||P.coyote>0)){P.vy=-T.player.jumpVelocity;P.ground=false;P.coyote=0;P.jumpAge=0;P.landTimer=0;audio.sfx('jump');sparks(P.x+P.w/2,P.y+P.h,'#b8f5ff',6);}
  if(!P.ground)P.jumpAge+=dt;
  P.vy+=gravity*dt;P.x=clamp(P.x+P.vx*dt,limitLeft,limitRight);P.y+=P.vy*dt;
  if(P.y>=Q.GROUND-P.h){P.y=Q.GROUND-P.h;P.vy=0;P.ground=true;if(!wasGround){P.landTimer=.13;sparks(P.x+P.w/2,Q.GROUND,'#d8f9ff',8);audio.sfx('land');}}
  P.fire=Math.max(0,P.fire-dt);
  if(canFire&&P.stun<=0&&input.tap('KeyZ','ControlLeft')&&P.fire<=0){
    P.fire=now()<P.double?.12:T.player.shotCooldown;
    const dir=P.face||1,low=P.duck&&P.ground,sx=dir>0?P.x+P.w+8:P.x-8,sy=low?Q.GROUND-61:P.y+57,vx=T.player.shotSpeed*dir;
    S.shots.push({x:sx,y:sy,vx,vy:0,r:low?7:8,owner:'p',life:2.2});
    if(now()<P.double)S.shots.push({x:sx,y:sy+10,vx:vx*.98,vy:0,r:6,owner:'p',life:2.2});
    audio.sfx('shot');
  }
  P.anim+=dt*(Math.abs(P.vx)>40?9:2.5);
}
function hurt(n,knock=0){
  if(now()<P.inv||P.stun>0)return false;
  if(now()<P.shield){if(!S.practice)ACH.add('shieldBlocks',1);audio.sfx('shield');float('BLOCKED',P.x,P.y-12,'#7ef3ff');return false;}
  P.hp-=n;P.inv=now()+T.player.invulnerabilityMs;P.stun=.23;P.vx+=knock;P.vy=Math.min(P.vy,-105);S.shake=T.feedback.shakeHit;S.flash=T.feedback.flashHit;S.bossDamageTaken+=S.mode==='boss'?n:0;audio.sfx('hit');sparks(P.x+42,P.y+62,'#ff6075',24);float(`-${n}`,P.x+P.w/2,P.y-15,'#ff6b78');S.combo=0;S.mult=1;
  if(P.hp<=0){S.lives--;if(S.lives<=0){gameOver();return true;}P.hp=100;P.x=S.stage===2?1260:220;P.vy=-360;P.inv=now()+1600;P.stun=0;}
  return true;
}

function startQuest(){audio.start();ACH.startRun();S.practice=false;resetRun();enterStage(0);}
function practice(id){audio.start();S.practice=true;resetRun();if(id==='beads')startBeads();else if(id==='fighter')startFighter();else if(id==='invaders')startInvaders();else if(id==='maze')startMaze();else enterStage(Math.max(0,Q.STAGES.findIndex(s=>s.id===id)));}
function enterStage(i){
  clearWorld();S.stage=i;S.elapsed=0;S.objective=0;S.patternTimer=1.1;S.itemTimer=1.0;S.powerTimer=8.5;S.enemyTimer=4.4;S.stageGrace=T.stage.grace;S.bossDamageTaken=0;
  const st=stage();P.x=st.direction===1?1260:240;P.y=Q.GROUND-P.h;P.vx=P.vy=0;P.face=st.direction===1?-1:1;P.hp=Math.max(65,P.hp);P.inv=now()+1050;P.stun=0;
  audio.setTheme(st.music,false,st.id);if(!S.practice&&st.id==='amiga')ACH.flag('amiga');if(!S.practice&&st.id==='guru')ACH.flag('guru');
  transition(st.name,st.subtitle,'stage',1.7);
}
function afterStage(){if(S.stage===0)startBeads();else if(S.stage===1)startFighter();else if(S.stage===2)startMaze();else if(S.stage===3)enterStage(4);else win();}

function laneY(h,lane='ground'){
  if(lane==='ground')return Q.GROUND-h;
  if(lane==='low')return Q.GROUND-h-38;
  if(lane==='duck')return Q.GROUND-150;
  if(lane==='mid')return Q.GROUND-245;
  if(lane==='high')return Q.GROUND-370;
  return Q.GROUND-h;
}
function spawnX(dir,pad=90){return dir<0?Q.W+pad:-pad-140;}
function addHazard(variant,lane='ground',opts={}){
  const st=stage(),dir=opts.dir??st.direction;
  const profiles={
    cassette:[112,78],tapeLoop:[178,58],rewinder:[76,76],shelf:[190,80],price:[154,58],bin:[220,68],present:[88,88],bauble:[70,70],tinsel:[190,48],disk:[86,86],window:[175,72],mouse:[84,56],glitch:[110,96],beam:[90,330],corrupt:[150,62]
  };
  const d=profiles[variant]||[100,80],w=opts.w||d[0],h=opts.h||d[1];
  S.entities.push({kind:'hazard',variant,lane,x:opts.x??spawnX(dir),y:opts.y??laneY(h,lane),w,h,vx:opts.vx??(opts.speed||290)*dir,vy:opts.vy||0,dir,damage:opts.damage||24,t:0,wait:opts.wait||0,life:opts.life||0,scored:false});
}
function addEnemy(variant='crawler',lane='ground',opts={}){
  const st=stage(),dir=opts.dir??st.direction;const dims={crawler:[72,68],bat:[78,58],mouse:[82,54],bug:[76,66],glitchling:[74,74]},d=dims[variant]||[72,68],w=d[0],h=d[1];
  S.entities.push({kind:'enemy',variant,x:spawnX(dir,80),y:laneY(h,lane),w,h,vx:(opts.speed||260)*dir,hp:opts.hp||1,t:rand(0,4),dir});
}
function addItem(lane=null,type=null){
  const st=stage(),dir=st.direction,t=type||pick(st.id==='amiga'||st.id==='guru'?['disk','zzap','joystick']:['tape','zzap','joystick']),ln=lane||pick(['ground','mid','high']);
  const dims={tape:[78,48],disk:[58,58],zzap:[50,66],joystick:[60,64]},d=dims[t]||[56,56];
  S.entities.push({kind:'item',type:t,x:spawnX(dir,70),y:laneY(d[1],ln),w:d[0],h:d[1],vx:(300+S.stage*13)*dir,t:0,rot:rand(-.18,.18),spin:rand(-2,2)});
}
function addPower(lane='mid'){const dir=stage().direction;S.entities.push({kind:'power',type:pick(['shield','speed','double']),x:spawnX(dir,80),y:laneY(64,lane),w:64,h:64,vx:275*dir,t:0});}

function bedroomPattern(){const n=(S.objective+Math.floor(S.elapsed/4))%8;if(n===0){addHazard('cassette','ground',{speed:305});schedule(1.25,()=>addItem('mid','tape'));}else if(n===1){addHazard('tapeLoop','duck',{speed:320});schedule(1.35,()=>addEnemy('crawler','ground',{speed:285}));}else if(n===2){addHazard('rewinder','ground',{speed:350});schedule(.75,()=>addHazard('rewinder','ground',{speed:365}));schedule(1.65,()=>addItem('high','zzap'));}else if(n===3){addEnemy('bat','mid',{speed:275});schedule(1.1,()=>addHazard('cassette','ground',{speed:320}));}else if(n===4){addItem('ground','tape');schedule(.45,()=>addItem('mid','tape'));schedule(.9,()=>addItem('high','tape'));schedule(1.7,()=>addHazard('tapeLoop','duck',{speed:340}));}else if(n===5){addHazard('cassette','ground',{speed:330});schedule(.9,()=>addHazard('tapeLoop','duck',{speed:325}));}else if(n===6){addEnemy('crawler','ground',{speed:315});schedule(.65,()=>addEnemy('bat','mid',{speed:285}));}else{addHazard('rewinder','ground',{speed:375});schedule(1.2,()=>addPower('high'));}return rand(2.8,3.7);}
function budgetPattern(){const n=(S.objective+Math.floor(S.elapsed/4))%8;if(n===0){addHazard('shelf','ground',{speed:300});schedule(1.25,()=>addItem('high','tape'));}else if(n===1){addHazard('price','duck',{speed:335});schedule(1.3,()=>addItem('ground','tape'));}else if(n===2){addHazard('bin','ground',{speed:290});schedule(1.0,()=>addHazard('price','duck',{speed:350}));}else if(n===3){addEnemy('crawler','ground',{speed:315});schedule(.8,()=>addEnemy('bat','mid',{speed:275}));}else if(n===4){for(let i=0;i<4;i++)schedule(i*.42,()=>addItem(i%2?'mid':'ground','tape'));}else if(n===5){addHazard('shelf','ground',{speed:350,w:145});schedule(1.05,()=>addHazard('shelf','ground',{speed:360,w:110}));}else if(n===6){addHazard('price','duck',{speed:365});schedule(.75,()=>addHazard('bin','ground',{speed:315}));}else{addPower('high');schedule(.8,()=>addEnemy('crawler','ground',{speed:330}));}return rand(2.7,3.6);}
function christmasPattern(){const n=(S.objective+Math.floor(S.elapsed/4))%8,dir=1;if(n===0){addHazard('present','ground',{speed:300,dir});schedule(1.05,()=>addItem('mid'));}else if(n===1){addHazard('bauble','high',{x:rand(180,820),y:90,vx:100,vy:165,dir});schedule(.9,()=>addHazard('bauble','high',{x:rand(620,1220),y:70,vx:80,vy:190,dir}));}else if(n===2){addHazard('tinsel','duck',{speed:335,dir});schedule(1.2,()=>addHazard('present','ground',{speed:320,dir}));}else if(n===3){addEnemy('mouse','ground',{speed:285,dir});schedule(.8,()=>addItem('high'));}else if(n===4){addHazard('present','ground',{speed:340,dir});schedule(.65,()=>addHazard('present','ground',{speed:360,dir}));}else if(n===5){addHazard('tinsel','duck',{speed:360,dir});schedule(1.1,()=>addPower('mid'));}else if(n===6){for(let i=0;i<3;i++)schedule(i*.5,()=>addItem(i===2?'high':'mid'));}else{addEnemy('mouse','ground',{speed:315,dir});schedule(.7,()=>addHazard('bauble','high',{x:rand(300,1000),y:70,vx:120,vy:200,dir}));}return rand(2.8,3.7);}
function amigaPattern(){const n=(S.objective+Math.floor(S.elapsed/4))%8;if(n===0){addHazard('disk','ground',{speed:310,vy:-190});}else if(n===1){addHazard('window','duck',{speed:330});schedule(1.25,()=>addItem('ground','disk'));}else if(n===2){addHazard('disk','ground',{speed:350,vy:-220});schedule(.85,()=>addHazard('disk','ground',{speed:335,vy:-170}));}else if(n===3){addEnemy('mouse','ground',{speed:310});schedule(1.0,()=>addHazard('window','duck',{speed:345}));}else if(n===4){addItem('ground','disk');schedule(.5,()=>addItem('mid','disk'));schedule(1.0,()=>addItem('high','disk'));}else if(n===5){addHazard('window','duck',{speed:370});schedule(.95,()=>addEnemy('bug','mid',{speed:300}));}else if(n===6){addHazard('disk','ground',{speed:380,vy:-240});schedule(1.0,()=>addPower('high'));}else{addEnemy('bug','mid',{speed:320});schedule(.7,()=>addEnemy('mouse','ground',{speed:340}));}return rand(2.6,3.5);}
function guruPattern(){const n=(S.objective+Math.floor(S.elapsed/4))%8;if(n===0){addHazard('beam','ground',{x:clamp(P.x+rand(-100,100),120,1380),y:405,vx:0,wait:1.8,life:1.15,damage:34});}else if(n===1){addHazard('glitch','ground',{speed:315});schedule(1.1,()=>addHazard('beam','ground',{x:rand(180,1300),y:405,vx:0,wait:1.5,life:1.0,damage:32}));}else if(n===2){addEnemy('glitchling','mid',{speed:315});schedule(.7,()=>addEnemy('glitchling','ground',{speed:350}));}else if(n===3){addHazard('corrupt','ground',{speed:345});schedule(.85,()=>addHazard('glitch','ground',{speed:330}));}else if(n===4){addItem('mid','disk');schedule(.5,()=>addItem('high','zzap'));schedule(1.2,()=>addHazard('beam','ground',{x:rand(180,1300),y:405,vx:0,wait:1.5,life:1.0,damage:34}));}else if(n===5){addHazard('glitch','ground',{speed:365});schedule(.7,()=>addHazard('glitch','ground',{speed:380,dir:1}));}else if(n===6){addEnemy('glitchling','mid',{speed:340});schedule(.85,()=>addPower('high'));}else{addHazard('beam','ground',{x:clamp(P.x+rand(-40,40),140,1360),y:405,vx:0,wait:1.35,life:1.1,damage:36});schedule(1.0,()=>addHazard('corrupt','ground',{speed:365}));}return rand(3.0,4.0);}
function nextStagePattern(){return stage().id==='bedroom'?bedroomPattern():stage().id==='budget'?budgetPattern():stage().id==='christmas'?christmasPattern():stage().id==='amiga'?amigaPattern():guruPattern();}

function objectiveType(){const id=stage().id;return id==='amiga'||id==='guru'?'disk':'tape';}
function collectObjective(type){if(type===objectiveType()){S.objective=Math.min(stage().objectiveTarget,S.objective+1);float(`${stage().objective} ${S.objective}/${stage().objectiveTarget}`,P.x+40,P.y-35,stage().accent);}}
function updateStage(dt){
  S.elapsed+=dt;S.stageGrace=Math.max(0,S.stageGrace-dt);clearCombo();updatePlayer(dt);updatePending(dt);S.patternTimer-=dt;S.itemTimer-=dt;S.powerTimer-=dt;S.enemyTimer-=dt;
  if(S.stageGrace<=0&&S.patternTimer<=0)S.patternTimer=nextStagePattern();
  if(S.itemTimer<=0){addItem();S.itemTimer=rand(T.stage.itemMin,T.stage.itemMax);}
  if(S.powerTimer<=0){addPower(pick(['mid','high']));S.powerTimer=rand(T.stage.powerMin,T.stage.powerMax);}
  if(S.stageGrace<=0&&S.enemyTimer<=0){const id=stage().id,v=id==='christmas'?'mouse':id==='amiga'?'bug':id==='guru'?'glitchling':Math.random()<.35?'bat':'crawler';addEnemy(v,v==='bat'||v==='bug'||v==='glitchling'?'mid':'ground',{speed:280+S.stage*20});S.enemyTimer=rand(3.4,5.4);}
  updateEntities(dt);updateShots(dt);
  if(S.elapsed>=stage().duration)enterBoss();
}

function updateEntities(dt){
  const pb=playerBox();
  for(const e of S.entities){
    e.t=(e.t||0)+dt;if(e.wait>0){e.wait-=dt;continue;}
    if(e.kind==='hazard'){
      if(e.variant==='bauble'){e.vy+=620*dt;e.y+=e.vy*dt;if(e.y>Q.GROUND-e.h){e.y=Q.GROUND-e.h;e.vy=-260;e.vx=Math.abs(e.vx||120)*(stage().direction||1);}}
      else if(e.variant==='disk'){e.vy=(e.vy||0)+760*dt;e.y+=e.vy*dt;if(e.y>Q.GROUND-e.h){e.y=Q.GROUND-e.h;e.vy=-220;}}
      else if(e.variant==='beam'){if(e.life>0){e.life-=dt;if(e.life<=0)e.dead=true;}}
      e.x+=(e.vx||0)*dt;
    }else{e.x+=(e.vx||0)*dt;if(e.kind==='enemy'){if(e.variant==='bat'||e.variant==='bug'||e.variant==='glitchling')e.y+=Math.sin(e.t*7)*2.6;}}
    if(e.kind==='item'||e.kind==='power'){/* collision below */}
    const box={x:e.x+4,y:e.y+4,w:e.w-8,h:e.h-8};
    if(!e.dead&&rhit(pb,box)){
      if(e.kind==='item'){
        score(140,e.x,e.y);comboHit();audio.sfx('pickup');collectObjective(e.type);sparks(e.x+e.w/2,e.y+e.h/2,'#72ff91',18);if(!S.practice){ACH.add('pickups',1);if(e.type==='tape')ACH.add('tapes',1);}e.dead=true;
      }else if(e.kind==='power'){
        if(e.type==='shield')P.shield=now()+7600;if(e.type==='speed')P.speed=now()+7200;if(e.type==='double')P.double=now()+7200;score(220,e.x,e.y);audio.sfx('pickup');sparks(e.x+e.w/2,e.y+e.h/2,'#ffe66c',20);e.dead=true;
      }else{hurt(e.damage||(e.kind==='enemy'?18:24),e.x>P.x?-260:260);if(e.variant!=='beam')e.dead=true;}
    }
    if(e.x<-320||e.x>Q.W+320||e.y>Q.H+120)e.dead=true;
  }
  S.entities=S.entities.filter(e=>!e.dead);
}
function updateShots(dt){
  for(const s of S.shots){s.x+=s.vx*dt;s.y+=s.vy*dt;s.life-=dt;
    if(s.owner==='p'){
      if(S.boss&&!S.boss.defeated&&rhit({x:s.x-s.r,y:s.y-s.r,w:s.r*2,h:s.r*2},{x:S.boss.x-S.boss.w/2,y:S.boss.y-S.boss.h/2,w:S.boss.w,h:S.boss.h})){S.boss.hp-=1;S.boss.hit=.12;s.dead=true;comboHit();sparks(s.x,s.y,'#ffe66c',8);}
      for(const e of S.entities)if(!s.dead&&e.kind==='enemy'&&rhit({x:s.x-s.r,y:s.y-s.r,w:s.r*2,h:s.r*2},e)){e.dead=true;s.dead=true;score(190,e.x,e.y);comboHit();sparks(e.x+e.w/2,e.y+e.h/2,'#ff9b5e',15);if(!S.practice)ACH.add('kills',1);}
    }else if(rhit({x:s.x-s.r,y:s.y-s.r,w:s.r*2,h:s.r*2},playerBox())){hurt(18,s.vx>0?180:-180);s.dead=true;}
    if(s.life<=0||s.x<-120||s.x>Q.W+120||s.y<-120||s.y>Q.H+120)s.dead=true;
  }
  S.shots=S.shots.filter(s=>!s.dead);S.entities=S.entities.filter(e=>!e.dead);
}

function enterBoss(){
  const st=stage();S.entities=[];S.shots=[];S.pending=[];S.bossDamageTaken=0;S.boss={x:st.direction===1?350:1250,y:515,w:230,h:205,hp:st.bossHp,max:st.bossHp,t:0,next:1.25,phase:1,hit:0,defeated:false,defeatT:0,dir:st.direction===1?1:-1};P.x=st.direction===1?1180:260;P.vx=P.vy=0;P.inv=now()+900;audio.setTheme(st.music,true,st.id);transition(st.boss,'NEW ATTACK PATTERN — READ THE ROOM.','boss',1.65);
}
function bossAttack(){
  const b=S.boss,id=stage().id;b.phase=b.hp<b.max*.34?3:b.hp<b.max*.67?2:1;
  if(id==='bedroom'){
    if(b.phase===1){addHazard('cassette','ground',{dir:-Math.sign(b.x-P.x),speed:330,x:b.x,y:Q.GROUND-78});schedule(.65,()=>addHazard('tapeLoop','duck',{dir:-Math.sign(b.x-P.x),speed:345,x:b.x,y:Q.GROUND-150}));}
    else if(b.phase===2){for(let i=0;i<3;i++)schedule(i*.42,()=>addHazard('rewinder','ground',{dir:-Math.sign(b.x-P.x),speed:360+i*18,x:b.x,y:Q.GROUND-76}));}
    else{addHazard('tapeLoop','duck',{dir:-Math.sign(b.x-P.x),speed:385,x:b.x,y:Q.GROUND-150});schedule(.55,()=>addHazard('cassette','ground',{dir:-Math.sign(b.x-P.x),speed:390,x:b.x,y:Q.GROUND-78}));schedule(1.1,()=>addHazard('tapeLoop','duck',{dir:-Math.sign(b.x-P.x),speed:405,x:b.x,y:Q.GROUND-150}));}
  }else if(id==='budget'){
    if(b.phase===1){addHazard('price','duck',{dir:-Math.sign(b.x-P.x),speed:350,x:b.x,y:Q.GROUND-150});}
    else if(b.phase===2){addHazard('shelf','ground',{dir:-Math.sign(b.x-P.x),speed:360,x:b.x,y:Q.GROUND-80});schedule(.65,()=>addHazard('price','duck',{dir:-Math.sign(b.x-P.x),speed:375,x:b.x,y:Q.GROUND-150}));}
    else{for(let i=0;i<3;i++)schedule(i*.45,()=>addHazard(i%2?'price':'shelf',i%2?'duck':'ground',{dir:-Math.sign(b.x-P.x),speed:385+i*15,x:b.x,y:i%2?Q.GROUND-150:Q.GROUND-80}));}
  }else if(id==='christmas'){
    if(b.phase===1)addHazard('present','ground',{dir:-Math.sign(b.x-P.x),speed:335,x:b.x,y:Q.GROUND-88});
    else if(b.phase===2){addHazard('tinsel','duck',{dir:-Math.sign(b.x-P.x),speed:365,x:b.x,y:Q.GROUND-150});schedule(.75,()=>addHazard('present','ground',{dir:-Math.sign(b.x-P.x),speed:370,x:b.x,y:Q.GROUND-88}));}
    else{for(let i=0;i<3;i++)schedule(i*.4,()=>addHazard('present','ground',{dir:i%2?-1:1,speed:370+i*18,x:i%2?Q.W+60:-60,y:Q.GROUND-88}));schedule(.7,()=>addHazard('tinsel','duck',{dir:-Math.sign(b.x-P.x),speed:390,x:b.x,y:Q.GROUND-150}));}
  }else if(id==='amiga'){
    if(b.phase===1)addHazard('disk','ground',{dir:-Math.sign(b.x-P.x),speed:350,x:b.x,y:Q.GROUND-86,vy:-230});
    else if(b.phase===2){addHazard('window','duck',{dir:-Math.sign(b.x-P.x),speed:360,x:b.x,y:Q.GROUND-150});schedule(.7,()=>addHazard('disk','ground',{dir:-Math.sign(b.x-P.x),speed:380,x:b.x,y:Q.GROUND-86,vy:-250}));}
    else{for(let i=0;i<3;i++)schedule(i*.45,()=>addHazard('disk','ground',{dir:-Math.sign(b.x-P.x),speed:390+i*15,x:b.x,y:Q.GROUND-86,vy:-210-i*20}));schedule(.85,()=>addHazard('window','duck',{dir:-Math.sign(b.x-P.x),speed:400,x:b.x,y:Q.GROUND-150}));}
  }else{
    if(b.phase===1)addHazard('beam','ground',{x:clamp(P.x+rand(-80,80),120,1380),y:405,vx:0,wait:1.2,life:1.05,damage:32});
    else if(b.phase===2){addHazard('glitch','ground',{dir:-Math.sign(b.x-P.x),speed:370,x:b.x,y:Q.GROUND-96});schedule(.7,()=>addHazard('beam','ground',{x:clamp(P.x+rand(-60,60),120,1380),y:405,vx:0,wait:1.0,life:1.05,damage:34}));}
    else{addHazard('beam','ground',{x:clamp(P.x+rand(-35,35),120,1380),y:405,vx:0,wait:.8,life:1.05,damage:36});schedule(.45,()=>addHazard('glitch','ground',{dir:-Math.sign(b.x-P.x),speed:410,x:b.x,y:Q.GROUND-96}));schedule(1.0,()=>addHazard('beam','ground',{x:rand(180,1320),y:405,vx:0,wait:.75,life:1.0,damage:36}));}
  }
}
function updateBoss(dt){
  const b=S.boss;if(!b)return;b.t+=dt;b.hit=Math.max(0,b.hit-dt);updatePlayer(dt);updatePending(dt);updateEntities(dt);updateShots(dt);
  const id=stage().id;if(id==='bedroom'){b.y=520+Math.sin(b.t*1.8)*35;b.x=1240+Math.sin(b.t*.7)*105;}else if(id==='budget'){b.x=1240+Math.sin(b.t*1.2)*175;b.y=535+Math.sin(b.t*2.2)*48;}else if(id==='christmas'){b.x=350+Math.sin(b.t*.85)*180;b.y=520+Math.sin(b.t*2.0)*62;}else if(id==='amiga'){b.x=1260+Math.sin(b.t*1.35)*205;b.y=510+Math.sin(b.t*2.6)*75;}else{b.x+=b.dir*(155+b.phase*35)*dt;if(b.x<250){b.x=250;b.dir=1;}if(b.x>1350){b.x=1350;b.dir=-1;}b.y=500+Math.sin(b.t*2.15)*75;}
  if(!b.defeated){b.next-=dt;if(b.next<=0){bossAttack();b.next=rand(Math.max(.8,1.65-b.phase*.18),Math.max(1.15,2.15-b.phase*.2));}}
  if(b.hp<=0&&!b.defeated){b.hp=0;b.defeated=true;b.defeatT=1.0;S.entities=[];S.shots=[];S.shake=T.feedback.shakeBoss;sparks(b.x,b.y,'#ffe66c',48);score(2200+S.stage*450,b.x,b.y);if(!S.practice){ACH.add('bosses',1);if(S.stage===1)ACH.flag('budgetBoss');if(S.stage===2)ACH.flag('xmasBoss');if(S.bossDamageTaken===0)ACH.flag('noDamageBoss');}}
  if(b.defeated){b.defeatT-=dt;b.y+=30*dt;if(b.defeatT<=0){if(S.practice)transition('PRACTICE COMPLETE','Boss defeated.','title',1.6);else afterStage();}}
}

function startBeads(){clearWorld();S.mini={kind:'beads',time:0,spawn:.65,leftCount:0,perfectHp:P.hp};P.x=230;P.y=Q.GROUND-P.h;P.vx=P.vy=0;P.hp=Math.max(70,P.hp);audio.setTheme(0,false,'beads');transition('ELECTRIC BEAD RUN','30 SECONDS. JUMP, CROUCH AND SHOOT THROUGH THE PATTERN.','beads',1.7);}
function updateBeads(dt){
  const m=S.mini;m.time+=dt;updatePlayer(dt,{gravity:T.beads.gravity});m.spawn-=dt;if(m.spawn<=0){const fromLeft=Math.random()<.24,dir=fromLeft?1:-1,x=fromLeft?-60:Q.W+60,high=Math.random()<.34;S.entities.push({kind:'bead',x,y:high?Q.GROUND-175:Q.GROUND-46,w:46,h:46,vx:rand(T.beads.minSpeed,T.beads.maxSpeed)*dir,t:0,high,scored:false});if(m.time>10&&Math.random()<.28)schedule(.42,()=>S.entities.push({kind:'bead',x:dir<0?Q.W+60:-60,y:high?Q.GROUND-46:Q.GROUND-175,w:46,h:46,vx:rand(T.beads.minSpeed,T.beads.maxSpeed)*dir,t:0,high:!high,scored:false}));m.spawn=rand(T.beads.spawnMin,T.beads.spawnMax);}
  updatePending(dt);const pb=playerBox();for(const e of S.entities){if(e.kind!=='bead')continue;e.x+=e.vx*dt;e.t+=dt;if(!e.hit&&rhit(pb,e)){hurt(20,e.vx>0?190:-190);e.hit=true;e.dead=true;}const passed=e.vx<0?e.x+e.w<P.x:e.x>P.x+P.w;if(!e.scored&&passed){e.scored=true;score(120,e.x,e.y);comboHit();if(!S.practice)ACH.add('cleanJumps',1);}if(e.x<-100||e.x>Q.W+100)e.dead=true;}
  updateShots(dt);S.entities=S.entities.filter(e=>!e.dead);if(m.time>=T.beads.duration){if(!S.practice&&P.hp>=m.perfectHp)ACH.flag('beadPerfect');if(S.practice)transition('PRACTICE COMPLETE','Electric Bead Run complete.','title',1.6);else enterStage(1);}
}

function startFighter(){clearWorld();S.fighter={x:1190,y:Q.GROUND-154,w:96,h:154,hp:100,max:100,vx:0,vy:0,ground:true,face:-1,think:.2,cool:.5,attack:null,attackT:0,attackLen:0,hitLatch:false,stun:0,guard:0,time:T.fighter.duration,ai:'watch'};P.x=330;P.y=Q.GROUND-P.h;P.hp=100;P.vx=P.vy=0;P.face=1;audio.setTheme(1,true,'fighter');transition('THE 36% CONVERSION BOUT','TRUE CROUCH. READ THE HIGH PUNCH AND LOW KICK.','fighter',1.8);}
function fighterBody(a,isPlayer){if(isPlayer)return playerBox();return{x:a.x-46,y:a.y+a.h-255,w:92,h:245};}
function fighterAttackBox(a,type,prog,face,isPlayer){const active=type==='kick'?(prog>.28&&prog<.7):(prog>.24&&prog<.64);if(!active)return null;const gy=isPlayer?P.y+P.h:a.y+a.h,cx=isPlayer?P.x+P.w/2:a.x,reach=type==='kick'?170:148,y=type==='kick'?gy-150:gy-235,h=type==='kick'?60:52;return face>0?{x:cx+28,y,w:reach,h}:{x:cx-28-reach,y,w:reach,h};}
function playerAttack(type){if(P.attack||P.duck||P.stun>0)return;P.attack=type;P.attackT=now();P.attackLen=type==='kick'?500:350;P.hitLatch=false;audio.sfx(type);}
function enemyAttack(type){const f=S.fighter;if(f.attack||f.stun>0)return;f.attack=type;f.attackT=now();f.attackLen=type==='kick'?540:380;f.hitLatch=false;f.ai=type==='punch'?'HIGH PUNCH — CROUCH':'LOW KICK — JUMP';}
function updateFighter(dt){
  const f=S.fighter;f.time=Math.max(0,f.time-dt);P.stun=Math.max(0,P.stun-dt);f.stun=Math.max(0,f.stun-dt);f.guard=Math.max(0,f.guard-dt);f.cool-=dt;f.think-=dt;P.duck=input.down('ArrowDown','KeyS')&&P.ground&&P.stun<=0;let mv=0;if(P.stun<=0)mv=(input.down('ArrowLeft','KeyA')?-1:0)+(input.down('ArrowRight','KeyD')?1:0);P.vx=Q.lerp(P.vx,mv*(P.duck?145:T.fighter.playerSpeed),Math.min(1,dt*13));if(!mv)P.vx*=Math.pow(.03,dt);if(!P.duck&&input.tap('Space','ArrowUp','KeyW')&&P.ground&&P.stun<=0){P.vy=-T.fighter.jumpVelocity;P.ground=false;audio.sfx('jump');}if(P.stun<=0&&input.tap('KeyZ','ControlLeft'))playerAttack('punch');if(P.stun<=0&&input.tap('KeyX','KeyC'))playerAttack('kick');P.vy+=T.player.gravity*dt;P.x=clamp(P.x+P.vx*dt,95,1430);P.y+=P.vy*dt;if(P.y>=Q.GROUND-P.h){P.y=Q.GROUND-P.h;P.vy=0;P.ground=true;}f.face=P.x<f.x?-1:1;P.face=f.x>=P.x?1:-1;
  const dist=f.x-P.x,ad=Math.abs(dist);if(f.think<=0&&!f.attack&&f.stun<=0){f.think=rand(T.fighter.enemyThinkMin,T.fighter.enemyThinkMax);const r=Math.random();if(ad>320){f.vx=-Math.sign(dist)*rand(170,250);f.ai='advance';}else if(P.attack&&r<.42){f.guard=.38;f.ai='guard';}else if(f.cool<=0&&r<.78){enemyAttack(Math.random()<.5?'punch':'kick');f.cool=rand(.45,.8);}else if(r<.88&&f.ground){f.vy=-640;f.ground=false;f.vx=-Math.sign(dist)*170;f.ai='jump read';}else{f.vx=Math.sign(dist)*rand(90,160);f.ai='reset';}}
  f.vy+=T.player.gravity*dt;f.x=clamp(f.x+f.vx*dt,110,1490);f.y+=f.vy*dt;if(f.y>=Q.GROUND-f.h){f.y=Q.GROUND-f.h;f.vy=0;f.ground=true;}f.vx*=Math.pow(f.stun>0?.3:.12,dt);
  if(P.attack){const prog=clamp((now()-P.attackT)/P.attackLen,0,1),atk=fighterAttackBox(P,P.attack,prog,P.face,true),body=fighterBody(f,false);if(atk&&rhit(atk,body)&&!P.hitLatch){P.hitLatch=true;let dmg=P.attack==='kick'?15:10;if(f.guard>0)dmg=Math.ceil(dmg*.3);f.hp-=dmg;f.stun=f.guard>0?.14:.3;f.vx=P.face*(f.guard>0?120:340);score(100,f.x,f.y);comboHit();sparks(f.x,f.y+70,'#ffe66c',14);}if(prog>=1){P.attack=null;P.hitLatch=false;}}
  if(f.attack){const prog=clamp((now()-f.attackT)/f.attackLen,0,1),atk=fighterAttackBox(f,f.attack,prog,f.face,false),body=fighterBody(P,true);if(atk&&rhit(atk,body)&&!f.hitLatch){f.hitLatch=true;hurt(f.attack==='kick'?18:13,f.face*320);}if(prog>=1){f.attack=null;f.hitLatch=false;}}
  if(f.hp<=0){f.hp=0;if(!S.practice)ACH.add('fighterWins',1);score(2800,f.x,f.y);if(S.practice)transition('PRACTICE COMPLETE','Retsu defeated.','title',1.6);else startInvaders();return;}if(f.time<=0){if(S.practice)transition('BOUT COMPLETE','Timer called it.','title',1.6);else startInvaders();}
}

function startInvaders(){clearWorld();const aliens=[];for(let r=0;r<T.invaders.rows;r++)for(let c=0;c<T.invaders.cols;c++)aliens.push({x:330+c*105,y:145+r*62,w:56,h:36,alive:true,row:r,col:c,phase:(r+c)%2});const bunkers=[330,650,970,1290].map(x=>({x,y:690,w:120,h:38,hp:9,max:9}));S.inv={shipX:800,shield:3,invuln:0,fire:0,dir:1,speed:T.invaders.baseSpeed,aliens,shots:[],enemyCool:.62,elapsed:0,bunkers,wavePulse:0};audio.setTheme(3,false,'invaders');transition('ALIEN FORMATION','BUNKERS CRUMBLE. THE FORMATION ACCELERATES.','invaders',1.7);}
function updateInvaders(dt){
  const g=S.inv;g.elapsed+=dt;g.invuln=Math.max(0,g.invuln-dt);g.wavePulse=Math.max(0,g.wavePulse-dt);const move=(input.down('ArrowLeft','KeyA')?-1:0)+(input.down('ArrowRight','KeyD')?1:0);g.shipX=clamp(g.shipX+move*545*dt,75,1525);g.fire-=dt;if(input.tap('KeyZ','ControlLeft')&&g.fire<=0){g.fire=T.invaders.playerCooldown;g.shots.push({x:g.shipX,y:785,vx:0,vy:-820,owner:'p'});audio.sfx('shot');}
  const alive=g.aliens.filter(a=>a.alive),ratio=1-alive.length/g.aliens.length,spd=g.speed+ratio*T.invaders.lateSpeedBonus;let edge=false;for(const a of alive){a.phase+=dt*6;a.x+=g.dir*spd*dt;if(a.x<65||a.x+a.w>1535)edge=true;}if(edge){g.dir*=-1;g.wavePulse=.15;for(const a of alive){a.x+=g.dir*spd*dt;a.y+=26;}}
  g.enemyCool-=dt;if(g.enemyCool<=0&&alive.length){const count=ratio>.6?3:ratio>.25?2:1;const front=alive.slice().sort((a,b)=>Math.abs(a.x-g.shipX)-Math.abs(b.x-g.shipX));for(let i=0;i<count;i++){const shooter=i===0?front[0]:pick(alive);g.shots.push({x:shooter.x+shooter.w/2,y:shooter.y+shooter.h,vx:0,vy:285+ratio*135,owner:'e'});}g.enemyCool=rand(Math.max(.22,T.invaders.enemyCooldownMin-ratio*.08),Math.max(.4,T.invaders.enemyCooldownMax-ratio*.15));}
  for(const sh of g.shots){sh.x+=sh.vx*dt;sh.y+=sh.vy*dt;for(const b of g.bunkers){if(!sh.dead&&b.hp>0&&sh.x>b.x-b.w/2&&sh.x<b.x+b.w/2&&sh.y>b.y&&sh.y<b.y+b.h){b.hp--;sh.dead=true;sparks(sh.x,sh.y,'#7df0a5',7);}}
    if(sh.dead)continue;if(sh.owner==='p'){for(const a of alive)if(a.alive&&sh.x>a.x&&sh.x<a.x+a.w&&sh.y>a.y&&sh.y<a.y+a.h){a.alive=false;sh.dead=true;score(150+a.row*10,a.x,a.y);comboHit();sparks(a.x+a.w/2,a.y,'#78efff',10);break;}}
    else if(g.invuln<=0&&sh.x>g.shipX-46&&sh.x<g.shipX+46&&sh.y>760&&sh.y<835){sh.dead=true;g.shield--;g.invuln=1;S.shake=8;audio.sfx('hit');if(g.shield<=0){S.lives--;if(S.lives<=0){gameOver();return;}g.shield=3;}}
    if(sh.y<70||sh.y>880)sh.dead=true;}
  g.shots=g.shots.filter(s=>!s.dead);if(alive.some(a=>a.y>690)){S.lives--;if(S.lives<=0){gameOver();return;}startInvaders();return;}if(g.aliens.every(a=>!a.alive)){if(!S.practice)ACH.flag('alienFormation');score(3200,800,300);if(S.practice)transition('PRACTICE COMPLETE','Formation cleared.','title',1.6);else enterStage(2);}
}

function makeMaze(){const W=21,H=13,walls=new Set();for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(x===0||y===0||x===W-1||y===H-1)walls.add(`${x},${y}`);[[5,2,4],[5,7,10],[10,2,5],[10,8,10],[15,2,4],[15,7,10]].forEach(([x,a,b])=>{for(let y=a;y<=b;y++)walls.add(`${x},${y}`);});[[6,2,4],[6,7,9],[6,11,13],[6,16,18]].forEach(([y,a,b])=>{for(let x=a;x<=b;x++)walls.add(`${x},${y}`);});const dots=new Set();for(let y=1;y<H-1;y++)for(let x=1;x<W-1;x++)if(!walls.has(`${x},${y}`))dots.add(`${x},${y}`);['1,1','19,1','1,11','19,11'].forEach(k=>dots.add(k));return{W,H,walls,dots,power:new Set(['1,1','19,1','1,11','19,11']),px:10,py:11,moveCool:0,lastDx:0,lastDy:-1,enemies:[{x:10,y:6,sx:10,sy:6,role:'hunter',px:10,py:6},{x:9,y:6,sx:9,sy:6,role:'ambush',px:9,py:6},{x:11,y:6,sx:11,sy:6,role:'pincer',px:11,py:6},{x:10,y:7,sx:10,sy:7,role:'guard',px:10,py:7}],enemyCool:.3,powered:0,target:T.maze.target,collected:0,hitCooldown:0,fruit:{x:3,y:6,active:true}};}
function startMaze(){clearWorld();S.maze=makeMaze();P.hp=Math.max(70,P.hp);audio.setTheme(4,false,'maze');transition('DOT-MAZE RUN','POWER CELLS CREATE A SHORT HUNTING WINDOW.','maze',1.7);}
function mazeCan(m,x,y){return x>=0&&y>=0&&x<m.W&&y<m.H&&!m.walls.has(`${x},${y}`);}function mazeDistance(m,sx,sy,tx,ty){if(sx===tx&&sy===ty)return 0;const q=[[sx,sy,0]],seen=new Set([`${sx},${sy}`]);for(let i=0;i<q.length;i++){const[x,y,d]=q[i];for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,k=`${nx},${ny}`;if(!mazeCan(m,nx,ny)||seen.has(k))continue;if(nx===tx&&ny===ty)return d+1;seen.add(k);q.push([nx,ny,d+1]);}}return 999;}
function mazeTarget(m,e){let tx=m.px,ty=m.py;if(e.role==='ambush'){tx=clamp(m.px+m.lastDx*4,1,m.W-2);ty=clamp(m.py+m.lastDy*4,1,m.H-2);if(!mazeCan(m,tx,ty)){tx=m.px;ty=m.py;}}else if(e.role==='pincer'){tx=clamp(m.px-m.lastDx*3,1,m.W-2);ty=clamp(m.py-m.lastDy*3,1,m.H-2);}else if(e.role==='guard'&&m.power.size){const first=[...m.power][0].split(',').map(Number);tx=first[0];ty=first[1];}return[tx,ty];}
function updateMaze(dt){
  const m=S.maze;m.moveCool-=dt;m.enemyCool-=dt;m.powered=Math.max(0,m.powered-dt);m.hitCooldown=Math.max(0,m.hitCooldown-dt);let dx=0,dy=0;if(input.down('ArrowLeft','KeyA'))dx=-1;else if(input.down('ArrowRight','KeyD'))dx=1;else if(input.down('ArrowUp','KeyW'))dy=-1;else if(input.down('ArrowDown','KeyS'))dy=1;
  if(m.moveCool<=0&&(dx||dy)){if(mazeCan(m,m.px+dx,m.py+dy)){m.px+=dx;m.py+=dy;m.lastDx=dx;m.lastDy=dy;const k=`${m.px},${m.py}`;if(m.dots.has(k)){m.dots.delete(k);m.collected++;score(m.power.has(k)?160:45,800,450);if(m.power.has(k)){m.powered=4.5;m.power.delete(k);audio.sfx('shield');}}if(m.fruit.active&&m.px===m.fruit.x&&m.py===m.fruit.y){m.fruit.active=false;score(850,800,450);comboHit();}}m.moveCool=T.maze.moveCooldown;}
  if(m.enemyCool<=0){m.enemyCool=m.powered>0?.25:(m.collected>80?T.maze.enemyLate:m.collected>45?T.maze.enemyMid:T.maze.enemyEarly);for(const e of m.enemies){const [tx,ty]=mazeTarget(m,e),opts=[[1,0],[-1,0],[0,1],[0,-1]].map(([x,y])=>({x:e.x+x,y:e.y+y})).filter(p=>mazeCan(m,p.x,p.y)),pool=opts.filter(p=>!(p.x===e.px&&p.y===e.py));const use=pool.length?pool:opts;use.sort((a,b)=>{const da=mazeDistance(m,a.x,a.y,tx,ty),db=mazeDistance(m,b.x,b.y,tx,ty),pa=mazeDistance(m,a.x,a.y,m.px,m.py),pb=mazeDistance(m,b.x,b.y,m.px,m.py);return m.powered>0?pb-pa:da-db;});const choice=use[0];if(choice){e.px=e.x;e.py=e.y;e.x=choice.x;e.y=choice.y;}if(e.x===m.px&&e.y===m.py&&m.hitCooldown<=0){if(m.powered>0){score(260,800,450);m.powered=Math.max(0,m.powered-1);e.x=e.sx;e.y=e.sy;}else{P.hp-=28;m.hitCooldown=.75;S.flash=.2;audio.sfx('hit');e.x=e.sx;e.y=e.sy;if(P.hp<=0){S.lives--;if(S.lives<=0){gameOver();return;}P.hp=100;m.px=10;m.py=11;}}}}}
  if(m.collected>=m.target){if(!S.practice)ACH.flag('mazeClear');score(3000,800,450);if(S.practice)transition('PRACTICE COMPLETE','Dot-Maze cleared.','title',1.6);else enterStage(3);}
}

function update(dt){S.time+=dt;S.shake=Math.max(0,S.shake-dt*28);S.flash=Math.max(0,S.flash-dt*1.8);if(S.mode==='transition'){S.transition.t+=dt;if(S.transition.t>=S.transition.dur)mode(S.transition.next);return;}if(S.mode==='stage')updateStage(dt);else if(S.mode==='boss')updateBoss(dt);else if(S.mode==='beads')updateBeads(dt);else if(S.mode==='fighter')updateFighter(dt);else if(S.mode==='invaders')updateInvaders(dt);else if(S.mode==='maze')updateMaze(dt);}

function drawLayer(id,suffix){const im=assets.get('layer_'+id+suffix);if(im)ctx.drawImage(im,0,0,Q.W,Q.H);}
function drawBase(id){const im=assets.get('custom_bg_'+id)||assets.get('bg_'+id);if(im)ctx.drawImage(im,0,0,Q.W,Q.H);else{ctx.fillStyle='#080914';ctx.fillRect(0,0,Q.W,Q.H);}drawLayer(id,'Back');drawLayer(id,'Mid');}
function drawParallax(id){
  const t=S.time,st=Q.STAGES.find(x=>x.id===id)||stage();ctx.save();
  if(id==='bedroom'){ctx.globalAlpha=.24;ctx.strokeStyle='#6eeaff';ctx.lineWidth=6;for(let i=0;i<7;i++){const x=((i*285-t*38)%1900)-150;ctx.beginPath();ctx.arc(x,170+(i%3)*70,70,0,Math.PI*2);ctx.stroke();}ctx.globalAlpha=.16;ctx.fillStyle='#b36cff';for(let i=0;i<10;i++)ctx.fillRect(((i*190+t*18)%1800)-100,580+(i%2)*48,120,8);}
  else if(id==='budget'){ctx.globalAlpha=.2;ctx.strokeStyle='#ffd75e';ctx.lineWidth=5;for(let y=170;y<650;y+=120){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(Q.W,y);ctx.stroke();}for(let i=0;i<9;i++){const x=((i*210-t*25)%1900)-100;ctx.fillStyle=i%2?'#ff8a57':'#ffd75e';ctx.fillRect(x,205+(i%3)*120,82,38);}}
  else if(id==='christmas'){ctx.globalAlpha=.35;for(let i=0;i<45;i++){const x=(i*137+t*15)%Q.W,y=(i*83+t*(10+i%4))%650;ctx.fillStyle=i%3?'#fff':'#ffdae2';ctx.fillRect(x,y,3,3);}ctx.globalAlpha=.2;ctx.strokeStyle='#7dffb4';ctx.lineWidth=5;ctx.beginPath();for(let x=0;x<Q.W;x+=50)ctx.lineTo(x,130+Math.sin(x*.018+t)*22);ctx.stroke();}
  else if(id==='amiga'){ctx.globalAlpha=.18;ctx.strokeStyle='#70e8ff';ctx.lineWidth=4;for(let i=0;i<6;i++){const x=((i*310-t*22)%2000)-180;ctx.strokeRect(x,145+(i%2)*120,235,130);ctx.fillStyle='#8f86ff';ctx.fillRect(x,145+(i%2)*120,235,18);}}
  else if(id==='guru'){ctx.globalAlpha=.2;for(let i=0;i<16;i++){const y=70+i*40,x=Math.sin(t*2+i)*35;ctx.fillStyle=i%2?'#ff536d':'#f0d866';ctx.fillRect(x,y,Q.W,2+(i%3));}for(let i=0;i<8;i++){ctx.fillStyle='rgba(255,83,109,.12)';ctx.fillRect(((i*280+t*70)%1800)-100,160+(i%4)*105,150,42);}}
  ctx.restore();ctx.globalAlpha=1;
}
function bg(id){drawBase(id);drawParallax(id);}
function foreground(id){drawLayer(id,'Front');}

function drawPlayer(){
  const key=S.mode==='fighter'?'playerFight':'player',im=assets.get('sheet_'+key),meta=Q.customAssetMeta?.('spritesheets',key),stateName=playerSpriteState(),cx=P.x+P.w/2,gy=playerGround();
  if(now()<P.inv&&Math.floor(now()/85)%2===0)ctx.globalAlpha=.45;
  ctx.fillStyle='rgba(0,0,0,.28)';ctx.beginPath();ctx.ellipse(cx,gy+8,P.duck?46:38,9,0,0,Math.PI*2);ctx.fill();
  if(im&&meta)Q.drawAnchoredSprite(ctx,im,meta,stateName,S.time,cx,gy,P.face||1);else{ctx.fillStyle='#2b93ae';rr(P.x,P.y,P.w,P.h,15);}
  ctx.globalAlpha=1;if(S.mode!=='fighter')bar(P.x-14,P.y-34,108,P.hp/P.max,'#62ed8e');if(now()<P.shield){const rem=clamp((P.shield-now())/7600,0,1);ctx.strokeStyle=rem<.25?'#ffd45d':'#70efff';ctx.lineWidth=5;ctx.beginPath();ctx.arc(cx,P.y+62,78,-Math.PI/2,-Math.PI/2+Math.PI*2*rem);ctx.stroke();}
}
function drawEnemyShape(e){ctx.save();ctx.translate(e.x+e.w/2,e.y+e.h/2);const face=e.vx>=0?1:-1;ctx.scale(face,1);if(e.variant==='bat'){ctx.fillStyle='#8e62ff';ctx.strokeStyle='#120c22';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(-34,0);ctx.lineTo(-8,-22);ctx.lineTo(0,-5);ctx.lineTo(8,-22);ctx.lineTo(34,0);ctx.lineTo(8,17);ctx.lineTo(0,4);ctx.lineTo(-8,17);ctx.closePath();ctx.fill();ctx.stroke();}else if(e.variant==='mouse'){ctx.fillStyle='#c3c8d0';ctx.strokeStyle='#152030';ctx.lineWidth=5;ctx.beginPath();ctx.ellipse(0,4,31,20,0,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.beginPath();ctx.arc(23,-9,9,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.strokeStyle='#ff7b8f';ctx.beginPath();ctx.moveTo(-27,5);ctx.quadraticCurveTo(-48,-16,-58,4);ctx.stroke();}else if(e.variant==='bug'){ctx.fillStyle='#70e8ff';ctx.strokeStyle='#071622';ctx.lineWidth=5;rr(-28,-22,56,44,12,true,true);ctx.strokeStyle='#8f86ff';for(const y of[-14,0,14]){ctx.beginPath();ctx.moveTo(-28,y);ctx.lineTo(-43,y-8);ctx.moveTo(28,y);ctx.lineTo(43,y+8);ctx.stroke();}}else if(e.variant==='glitchling'){ctx.fillStyle='#ff536d';ctx.strokeStyle='#22060f';ctx.lineWidth=5;rr(-30,-30,60,60,5,true,true);ctx.fillStyle='#f0d866';ctx.fillRect(-16,-10,10,10);ctx.fillRect(8,-10,10,10);ctx.fillRect(-8,12,20,6);}else{ctx.fillStyle='#253b69';ctx.strokeStyle='#071622';ctx.lineWidth=5;rr(-30,-28,60,56,12,true,true);ctx.fillStyle='#6eeaff';ctx.fillRect(-17,-9,10,10);ctx.fillRect(7,-9,10,10);}ctx.restore();}
function drawHazard(e){ctx.save();ctx.translate(e.x+e.w/2,e.y+e.h/2);const v=e.variant;ctx.shadowBlur=14;ctx.shadowColor='#ff536d';ctx.lineWidth=5;ctx.strokeStyle='#35101a';if(v==='cassette'){ctx.fillStyle='#20202a';rr(-e.w/2,-e.h/2,e.w,e.h,12,true,true);ctx.fillStyle='#f0d866';ctx.beginPath();ctx.arc(-25,0,16,0,Math.PI*2);ctx.arc(25,0,16,0,Math.PI*2);ctx.fill();ctx.fillStyle='#ff536d';ctx.fillRect(-34,23,68,7);}else if(v==='tapeLoop'||v==='tinsel'||v==='price'||v==='window'){ctx.fillStyle=v==='tinsel'?'#2d5b47':v==='price'?'#5c3d12':v==='window'?'#173b61':'#32162f';rr(-e.w/2,-e.h/2,e.w,e.h,10,true,true);ctx.fillStyle=v==='price'?'#ffd75e':v==='window'?'#70e8ff':v==='tinsel'?'#7dffb4':'#b36cff';ctx.fillRect(-e.w/2+10,-7,e.w-20,14);if(v==='price')text('£9.99',0,10,22,'#1b1306','center',900);if(v==='window')text('READ ERROR',0,8,15,'#071622','center',900);}else if(v==='rewinder'||v==='disk'||v==='bauble'){ctx.fillStyle=v==='disk'?'#70e8ff':v==='bauble'?'#ff7b8f':'#b36cff';ctx.beginPath();ctx.arc(0,0,e.w*.42,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle='#10131d';ctx.beginPath();ctx.arc(0,0,e.w*.15,0,Math.PI*2);ctx.fill();}else if(v==='shelf'||v==='bin'||v==='present'||v==='glitch'||v==='corrupt'){ctx.fillStyle=v==='present'?'#a63a4d':v==='glitch'||v==='corrupt'?'#541225':v==='shelf'?'#5b3822':'#3d2a18';rr(-e.w/2,-e.h/2,e.w,e.h,10,true,true);if(v==='present'){ctx.fillStyle='#7dffb4';ctx.fillRect(-7,-e.h/2,14,e.h);ctx.fillRect(-e.w/2,-7,e.w,14);}if(v==='glitch'||v==='corrupt'){ctx.fillStyle='#f0d866';for(let i=-e.w/2+10;i<e.w/2-10;i+=24)ctx.fillRect(i,-8,13,16);}}else if(v==='beam'){if(e.wait>0){ctx.shadowBlur=0;ctx.globalAlpha=.22;ctx.fillStyle='#ff536d';ctx.fillRect(-e.w/2,-e.h/2,e.w,e.h);ctx.globalAlpha=1;ctx.strokeStyle='#f0d866';ctx.setLineDash([12,8]);ctx.strokeRect(-e.w/2,-e.h/2,e.w,e.h);ctx.setLineDash([]);}else{ctx.fillStyle='rgba(255,83,109,.72)';ctx.fillRect(-e.w/2,-e.h/2,e.w,e.h);ctx.fillStyle='#fff';ctx.fillRect(-8,-e.h/2,16,e.h);}}ctx.restore();ctx.shadowBlur=0;}
function drawEntities(){for(const e of S.entities){if(e.wait>0&&e.variant!=='beam'){text('!',e.x+e.w/2,e.y-12,20,'#ffe66c','center');continue;}if(e.kind==='item'){const im=assets.get('item_'+e.type),bob=Math.sin(e.t*5)*4;ctx.save();ctx.translate(e.x+e.w/2,e.y+e.h/2+bob);ctx.rotate((e.rot||0)+(e.spin||0)*e.t);ctx.shadowBlur=18;ctx.shadowColor='#72ff91';if(im)ctx.drawImage(im,-e.w/2,-e.h/2,e.w,e.h);else{ctx.fillStyle='#275b37';rr(-e.w/2,-e.h/2,e.w,e.h,8);text(e.type.toUpperCase(),0,5,12,'#fff','center');}ctx.restore();ctx.shadowBlur=0;}else if(e.kind==='power'){const im=assets.get('power_'+e.type);ctx.save();ctx.translate(e.x+e.w/2,e.y+e.h/2);const p=1+Math.sin(e.t*7)*.06;ctx.scale(p,p);ctx.shadowBlur=20;ctx.shadowColor='#ffe66c';if(im)ctx.drawImage(im,-32,-32,64,64);else{ctx.fillStyle='#171223';rr(-30,-30,60,60,12);text(e.type.toUpperCase(),0,6,11,'#ffe66c','center');}ctx.restore();ctx.shadowBlur=0;}else if(e.kind==='enemy')drawEnemyShape(e);else if(e.kind==='hazard')drawHazard(e);else if(e.kind==='bead'){ctx.shadowBlur=20;ctx.shadowColor=e.high?'#ff7b8f':'#70e8ff';ctx.fillStyle=e.high?'#ff7b8f':'#70e8ff';ctx.beginPath();ctx.arc(e.x+e.w/2,e.y+e.h/2,e.w*.42,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;}}
}
function drawShots(){for(const s of S.shots){ctx.shadowBlur=12;ctx.shadowColor=s.owner==='p'?'#ffe66c':'#ff536d';ctx.fillStyle=s.owner==='p'?'#ffe66c':'#ff536d';ctx.beginPath();ctx.arc(s.x,s.y,s.r||6,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;}}
function drawBoss(){const b=S.boss;if(!b)return;const id=stage().id,key='boss'+id.charAt(0).toUpperCase()+id.slice(1),sheet=assets.get('sheet_'+key),meta=Q.customAssetMeta?.('spritesheets',key),im=assets.get('boss_'+id),face=P.x>=b.x?1:-1,stateName=b.defeated?'defeat':b.hit>0?'hit':b.next<.45?'charge':'idle';if(sheet&&meta)Q.drawSpriteSheet(ctx,sheet,meta,stateName,S.time,b.x-b.w/2,b.y-b.h/2,b.w,b.h,face);else if(im)ctx.drawImage(im,b.x-b.w/2,b.y-b.h/2,b.w,b.h);else{ctx.fillStyle='#29111d';ctx.strokeStyle=stage().accent;ctx.lineWidth=6;rr(b.x-b.w/2,b.y-b.h/2,b.w,b.h,20,true,true);text(stage().boss,b.x,b.y,18,'#fff','center');}bar(b.x-b.w/2,b.y-b.h/2-27,b.w,b.hp/b.max,'#ff5570');text(`PHASE ${b.phase}`,b.x,b.y-b.h/2-45,13,stage().accent,'center');}
function drawHUD(){const st=stage();ctx.fillStyle='rgba(5,7,15,.78)';rr(24,20,555,86,14);text(`SCORE ${Q.fmt(S.score)}`,44,50,18,'#fff');text(`BEST ${Q.fmt(S.best)}`,44,78,13,'#9fb0c9');text(`LIVES ${S.lives}`,242,50,18,'#fff');text(`HP ${Math.max(0,Math.ceil(P.hp))}`,242,78,13,'#9fb0c9');if(S.mode==='stage'||S.mode==='boss'){text(`${st.objective}: ${S.objective}/${st.objectiveTarget}`,400,50,15,st.accent);text(S.combo>1?`CHAIN x${S.mult.toFixed(2)}`:st.mechanic.toUpperCase(),400,78,13,S.combo>1?'#ffe66c':'#9fb0c9');}else if(S.mode==='beads')text(`${Math.max(0,Math.ceil(T.beads.duration-S.mini.time))} SEC`,400,50,16,'#70e8ff');}
function drawStage(){const id=stage().id;bg(id);drawEntities();drawShots();drawPlayer();if(S.mode==='boss')drawBoss();foreground(id);drawHUD();}
function drawBeads(){bg('beads');drawEntities();drawShots();drawPlayer();foreground('beads');drawHUD();}

function drawFighter(){bg('fighter');drawPlayer();const f=S.fighter,sheet=assets.get('sheet_fighter'),meta=Q.customAssetMeta?.('spritesheets','fighter'),stateName=f.stun>0?'hit':f.attack||(!f.ground?'jump':Math.abs(f.vx)>50?'walk':f.guard>0?'guard':'idle');if(sheet&&meta)Q.drawSpriteSheet(ctx,sheet,meta,stateName,S.time,f.x-115,f.y+f.h-300,230,300,f.face||-1);else{ctx.fillStyle='#7b3c48';rr(f.x-46,f.y+42,92,78,18);}foreground('fighter');bar(90,40,440,P.hp/P.max,'#62ed8e');bar(1070,40,440,f.hp/f.max,'#ff6a62');text('CHEEKY',90,32,16,'#fff');text('RETSU',1510,32,16,'#fff','right');text(`TIMER ${Math.ceil(f.time)}`,800,65,22,'#ffe66c','center');text(f.ai.toUpperCase(),800,98,14,'#70e8ff','center');text('Z PUNCH   X/C KICK   ↓ DEEP CROUCH   SPACE JUMP',800,855,14,'#fff','center');}
function drawInvaders(){bg('invaders');const g=S.inv;for(const b of g.bunkers){if(b.hp<=0)continue;const im=assets.get('invader_bunker');ctx.globalAlpha=.35+.65*(b.hp/b.max);if(im)ctx.drawImage(im,b.x-b.w/2,b.y,b.w,b.h);else{ctx.fillStyle='#59d98a';ctx.fillRect(b.x-b.w/2,b.y,b.w,b.h);}ctx.globalAlpha=1;}for(const a of g.aliens){if(!a.alive)continue;const im=assets.get('invader_alien'+(a.row+1)),bob=Math.sin(a.phase)*3;if(im)ctx.drawImage(im,a.x,a.y+bob,a.w,a.h);else{ctx.fillStyle='#70e8ff';ctx.fillRect(a.x,a.y+bob,a.w,a.h);}}const ship=assets.get('invader_ship');if(ship)ctx.drawImage(ship,g.shipX-48,775,96,58);else{ctx.fillStyle='#fff';ctx.beginPath();ctx.moveTo(g.shipX,770);ctx.lineTo(g.shipX-50,830);ctx.lineTo(g.shipX+50,830);ctx.closePath();ctx.fill();}for(const sh of g.shots){const im=assets.get('invader_'+(sh.owner==='p'?'playerShot':'enemyShot'));if(im)ctx.drawImage(im,sh.x-8,sh.y-14,16,28);else{ctx.fillStyle=sh.owner==='p'?'#ffe66c':'#ff536d';ctx.fillRect(sh.x-3,sh.y-10,6,20);}}text('ALIEN FORMATION',800,62,28,'#70e8ff','center');text(`SHIELDS ${g.shield}   ALIENS ${g.aliens.filter(a=>a.alive).length}`,800,96,15,'#fff','center');drawHUD();}
function drawMaze(){bg('maze');const m=S.maze,cell=52,ox=(Q.W-m.W*cell)/2,oy=130;ctx.strokeStyle='#743cff';ctx.lineWidth=4;for(const k of m.walls){const[x,y]=k.split(',').map(Number);ctx.fillStyle='#24103f';ctx.fillRect(ox+x*cell,oy+y*cell,cell,cell);ctx.strokeRect(ox+x*cell+2,oy+y*cell+2,cell-4,cell-4);}for(const k of m.dots){const[x,y]=k.split(',').map(Number);ctx.fillStyle=m.power.has(k)?'#ffe66c':'#70e8ff';ctx.beginPath();ctx.arc(ox+x*cell+cell/2,oy+y*cell+cell/2,m.power.has(k)?8:3,0,Math.PI*2);ctx.fill();}if(m.fruit.active){ctx.fillStyle='#ff7b8f';ctx.beginPath();ctx.arc(ox+m.fruit.x*cell+26,oy+m.fruit.y*cell+26,11,0,Math.PI*2);ctx.fill();}ctx.fillStyle=m.powered>0?'#ffe66c':'#fff';ctx.beginPath();ctx.arc(ox+m.px*cell+26,oy+m.py*cell+26,18,0,Math.PI*2);ctx.fill();for(let i=0;i<m.enemies.length;i++){const e=m.enemies[i];ctx.fillStyle=m.powered>0?'#315980':['#ff536d','#ff8a57','#7dffb4','#b36cff'][i];rr(ox+e.x*cell+9,oy+e.y*cell+9,34,34,11);}text(`DOTS ${m.collected}/${m.target}   POWER ${m.powered.toFixed(1)}`,800,92,19,'#fff','center');drawHUD();}

function particlesDraw(){for(const p of S.particles){if(p.kind==='dot'){ctx.globalAlpha=clamp(p.life/.6,0,1);ctx.fillStyle=p.c;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill();}else{ctx.globalAlpha=clamp(p.life,0,1);text(p.t,p.x,p.y,16,p.c,'center');}ctx.globalAlpha=1;}}
function particlesUpdate(dt){for(const p of S.particles){p.life-=dt;if(p.kind==='dot'){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=320*dt;}else p.y-=35*dt;}S.particles=S.particles.filter(p=>p.life>0);}

function button(x,y,w,h,label,fn,danger=false){S.buttons.push({x,y,w,h,fn});ctx.fillStyle=danger?'rgba(86,18,31,.9)':'rgba(9,16,31,.92)';ctx.strokeStyle=danger?'#ff7183':'#6eeaff';ctx.lineWidth=3;rr(x,y,w,h,12,true,true);text(label,x+w/2,y+h/2+7,18,danger?'#ffd3d8':'#fff','center',900);}
function title(){bg('bedroom');ctx.fillStyle='rgba(3,5,12,.54)';ctx.fillRect(0,0,Q.W,Q.H);text("CHEEKY'S",800,180,40,'#fff','center',900);text('COMMODORE QUEST',800,250,72,'#6eeaff','center',900);text('QUEST 2.0',800,302,23,'#ffe66c','center',900);text('A nine-stage Commodore arcade trip with rebuilt movement, bosses and stage mechanics.',800,350,17,'#d9e4f2','center',700);S.buttons=[];button(585,410,430,64,'START QUEST',startQuest);button(585,495,430,60,'LEVEL SELECT',()=>mode('levels'));button(585,575,430,60,'ACHIEVEMENTS',()=>mode('achievements'));text('MOVE: ARROWS / WASD     JUMP: SPACE     FIRE: Z / CTRL     KICK: X / C',800,690,15,'#fff','center');text('↓ now uses a genuine deep crouch with a reduced collision profile.',800,723,14,'#7dffb4','center');text(`BEST ${Q.fmt(S.best)}   •   ${ACH.rank()}   •   ${ACH.profile.xp} XP`,800,795,16,'#ffe66c','center');}
function levels(){bg('amiga');ctx.fillStyle='rgba(3,5,12,.72)';ctx.fillRect(0,0,Q.W,Q.H);text('LEVEL SELECT',800,110,46,'#70e8ff','center');text('Practice does not submit the run score.',800,145,14,'#c8d3e1','center');S.buttons=[];Q.LEVELS.forEach((l,i)=>{const col=i%3,row=Math.floor(i/3),x=220+col*395,y=205+row*150;button(x,y,330,78,`${i+1}. ${l[1].toUpperCase()}`,()=>practice(l[0]));});button(625,710,350,58,'BACK',()=>mode('title'));}
function achievementScreen(){bg('guru');ctx.fillStyle='rgba(3,5,12,.78)';ctx.fillRect(0,0,Q.W,Q.H);text('ACHIEVEMENTS',800,80,42,'#ffe66c','center');text(`${ACH.rank()} • ${ACH.profile.xp} XP`,800,115,16,'#fff','center');const entries=ACH.entries();for(let i=0;i<entries.length;i++){const a=entries[i],col=i%2,row=Math.floor(i/2),x=95+col*760,y=150+row*50;if(y>800)break;ctx.fillStyle=a.done?'rgba(26,70,46,.74)':'rgba(10,15,27,.76)';rr(x,y,700,40,8);text(a.done?'✓':'•',x+16,y+26,15,a.done?'#72ff91':'#7f8ca3');text(a.name,x+42,y+25,13,'#fff');text(`${Math.min(a.value,a.target)}/${a.target}`,x+675,y+25,12,a.done?'#72ff91':'#ffe66c','right');}S.buttons=[];button(625,825,350,52,'BACK',()=>mode('title'));}
function overlay(){if(S.mode==='transition'){ctx.fillStyle='rgba(0,0,0,.68)';ctx.fillRect(0,0,Q.W,Q.H);text(S.transition.title,800,410,48,'#72eaff','center');text(S.transition.sub,800,464,19,'#ffe66c','center');}else if(S.mode==='pause'||S.mode==='quit'){S.buttons=[];ctx.fillStyle='rgba(0,0,0,.72)';ctx.fillRect(0,0,Q.W,Q.H);text(S.mode==='pause'?'PAUSED':'ABANDON THIS RUN?',800,300,50,S.mode==='pause'?'#72eaff':'#ff7183','center');button(590,375,420,58,'RESUME',()=>mode(S.returnMode));if(S.mode==='pause')button(590,450,420,58,'LEVEL SELECT',()=>mode('levels'));button(590,S.mode==='pause'?525:460,420,58,'QUIT TO TITLE',quit,true);}else if(S.mode==='over'||S.mode==='won'){S.buttons=[];ctx.fillStyle='rgba(0,0,0,.76)';ctx.fillRect(0,0,Q.W,Q.H);text(S.mode==='won'?'COMMODORE QUEST COMPLETE':'GAME OVER',800,280,54,S.mode==='won'?'#7df0a5':'#ff7183','center');text(`SCORE ${Q.fmt(S.score)}`,800,350,30,'#fff','center');button(535,420,250,60,'PLAY AGAIN',startQuest);button(815,420,250,60,'LEVEL SELECT',()=>mode('levels'));button(675,505,250,54,'TITLE',quit);}}
function draw(){ctx.save();const sh=S.shake;ctx.translate(sh?rand(-sh,sh):0,sh?rand(-sh,sh):0);if(S.mode==='title')title();else if(S.mode==='levels')levels();else if(S.mode==='achievements')achievementScreen();else if(S.mode==='stage'||S.mode==='boss')drawStage();else if(S.mode==='beads')drawBeads();else if(S.mode==='fighter')drawFighter();else if(S.mode==='invaders')drawInvaders();else if(S.mode==='maze')drawMaze();else if(S.mode==='transition'){const next=S.transition?.next;if(next==='stage'||next==='boss')drawStage();else if(next==='beads')drawBeads();else if(next==='fighter')drawFighter();else if(next==='invaders')drawInvaders();else if(next==='maze')drawMaze();else title();}particlesDraw();if(S.toast&&now()<S.toast.until){ctx.fillStyle='rgba(4,8,15,.94)';ctx.strokeStyle='#ffd45d';ctx.lineWidth=3;rr(1080,760,470,105,12,true,true);text('ACHIEVEMENT UNLOCKED',1100,790,13,'#ffd45d');text(S.toast.text,1100,820,19);text('+'+S.toast.xp+' CCG XP',1100,846,13,'#7ff0a4');}overlay();ctx.restore();if(S.flash>0){ctx.globalAlpha=S.flash;ctx.fillStyle='#ff4964';ctx.fillRect(0,0,Q.W,Q.H);ctx.globalAlpha=1;}ctx.globalAlpha=.055;ctx.fillStyle='#000';for(let y=0;y<Q.H;y+=4)ctx.fillRect(0,y,Q.W,1);ctx.globalAlpha=1;}

function gameOver(){mode('over');if(!S.practice)ACH.save();}
function win(){if(!S.practice){ACH.flag('won');if(S.lives===3)ACH.flag('oneCredit');}mode('won');}
function quit(){audio.setTheme(0,false,'title');resetRun();mode('title');}
function pointer(ev){const r=canvas.getBoundingClientRect();return{x:(ev.clientX-r.left)*Q.W/r.width,y:(ev.clientY-r.top)*Q.H/r.height};}
canvas.addEventListener('pointerdown',e=>{focus();const p=pointer(e);for(let i=S.buttons.length-1;i>=0;i--){const b=S.buttons[i];if(p.x>=b.x&&p.x<=b.x+b.w&&p.y>=b.y&&p.y<=b.y+b.h){b.fn();break;}}});
function pause(){if(['stage','boss','beads','fighter','invaders','maze','transition'].includes(S.mode)){S.returnMode=S.mode;mode('pause');}else if(S.mode==='pause')mode(S.returnMode);}
document.getElementById('btn-pause').onclick=pause;
document.getElementById('btn-level').onclick=()=>mode('levels');
document.getElementById('btn-quit').onclick=()=>{if(S.mode==='title'){window.location.assign('/games/ccg-games/');return;}S.returnMode=S.mode;mode('quit');};
document.getElementById('btn-fullscreen').onclick=()=>{const shell=document.getElementById('game-shell');document.fullscreenElement?document.exitFullscreen?.():shell.requestFullscreen?.();focus();};
document.querySelectorAll('[data-touch]').forEach(b=>{const n=b.dataset.touch;['pointerdown','touchstart'].forEach(ev=>b.addEventListener(ev,e=>{e.preventDefault();input.setVirtual(n,true);}));['pointerup','pointercancel','pointerleave','touchend'].forEach(ev=>b.addEventListener(ev,e=>{e.preventDefault();input.setVirtual(n,false);}));});
addEventListener('keydown',e=>{if(e.code==='Escape')pause();});
function loop(t){const dt=Math.min(.033,(t-S.last)/1000||0);S.last=t;if(!['title','levels','achievements','pause','quit','over','won','loading'].includes(S.mode))update(dt);particlesUpdate(dt);draw();input.clear();requestAnimationFrame(loop);}
window.CCGQuestDebug={startQuest,practice,getState:()=>({mode:S.mode,stage:S.stage,score:S.score,objective:S.objective,player:{x:P.x,y:P.y,hp:P.hp,duck:P.duck,box:playerBox()},boss:S.boss&&{x:S.boss.x,y:S.boss.y,hp:S.boss.hp,phase:S.boss.phase},fighter:S.fighter&&{x:S.fighter.x,hp:S.fighter.hp,ai:S.fighter.ai},invaders:S.inv&&{alive:S.inv.aliens.filter(a=>a.alive).length,shield:S.inv.shield},maze:S.maze&&{dots:S.maze.collected,target:S.maze.target,powered:S.maze.powered}})};
Promise.resolve(Q.hydrateRemoteAssets?.()).catch(()=>false).then(load).then(()=>{loading.classList.add('is-hidden');audio.setTheme(0,false,'title');mode('title');requestAnimationFrame(loop);}).catch(e=>{loading.textContent='LOAD ERROR: '+e.message;console.error(e);});
})();
