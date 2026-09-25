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

const S={
  mode:'loading',returnMode:'title',practice:false,stage:0,elapsed:0,time:0,last:0,
  score:0,best:0,lives:3,mult:1,combo:0,comboUntil:0,objective:0,
  entities:[],shots:[],particles:[],pending:[],boss:null,mini:null,fighter:null,inv:null,maze:null,
  buttons:[],transition:null,shake:0,flash:0,toast:null,bossDamageTaken:0,
  itemTimer:0,powerTimer:0,stageGrace:0,
  director:{cool:0,lastResponse:null,sequence:0},checkpoint:null,debug:false
};
const P={
  x:250,y:0,w:78,h:132,vx:0,vy:0,ground:true,face:1,hp:100,max:100,
  duck:false,stun:0,inv:0,fire:0,shield:0,speed:0,double:0,jumpAge:0,landTimer:0,coyote:0,jumpBuffer:0,
  attack:null,hitLatch:false,anim:Q.createSpriteAnimator('idle')
};
P.y=Q.GROUND-P.h;
const ACH=new Q.Achievements(a=>{S.toast={text:a.name,xp:a.xp,until:Q.now()+3200};audio.sfx('unlock');});
S.best=ACH.profile.best||0;
const now=()=>Q.now(),clamp=Q.clamp,rand=Q.rand,pick=Q.pick,rhit=Q.rectHit;

function rr(x,y,w,h,r,fill=true,stroke=false){ctx.beginPath();ctx.roundRect(x,y,w,h,r);if(fill)ctx.fill();if(stroke)ctx.stroke();}
function text(t,x,y,size=20,col='#fff',align='left',weight=800){ctx.fillStyle=col;ctx.font=`${weight} ${size}px Consolas,monospace`;ctx.textAlign=align;ctx.textBaseline='alphabetic';ctx.fillText(t,x,y);}
function bar(x,y,w,p,c){ctx.fillStyle='rgba(0,0,0,.82)';rr(x,y,w,14,6);ctx.fillStyle='#252334';rr(x+2,y+2,w-4,10,4);ctx.fillStyle=c;rr(x+2,y+2,(w-4)*clamp(p,0,1),10,4);}
function focus(){canvas.focus({preventScroll:true});try{scrollTo({top:0,left:0,behavior:'instant'});}catch(_e){scrollTo(0,0);}}
function mode(m){S.mode=m;S.buttons=[];focus();}
function stage(){return Q.STAGES[S.stage]||Q.STAGES[0];}
function schedule(delay,fn,tag='ambient'){S.pending.push({delay,fn,tag,done:false});}
function updatePending(dt){for(const p of S.pending){p.delay-=dt;if(p.delay<=0&&!p.done){p.done=true;p.fn();}}S.pending=S.pending.filter(p=>!p.done);}
function pendingDanger(){return S.pending.some(p=>!p.done&&p.tag==='danger');}
function sparks(x,y,c='#6eeaff',n=12){for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,v=rand(90,320);S.particles.push({kind:'dot',x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,c,r:rand(2,5),life:rand(.25,.7)});}}
function float(t,x,y,c='#fff'){S.particles.push({kind:'text',t,x,y,c,life:1});}
function score(n,x=P.x,y=P.y){const v=Math.round(n*(now()<P.double?2:1)*S.mult);S.score+=v;if(!S.practice){ACH.score(S.score);ACH.profile.totals.scoreLifetime+=v;if(S.score>S.best){S.best=S.score;ACH.profile.best=S.best;}ACH.save();}float('+'+v,x,y,'#ffe66c');}
function comboHit(){S.combo=now()<S.comboUntil?Math.min(8,S.combo+1):1;S.comboUntil=now()+1900;S.mult=1+Math.min(2.5,S.combo*.2);}
function clearCombo(){if(now()>S.comboUntil){S.combo=0;S.mult=1;}}
function clearWorld(){S.entities=[];S.shots=[];S.particles=[];S.pending=[];S.boss=null;S.mini=null;S.fighter=null;S.inv=null;S.maze=null;}
function resetPlayer(){Object.assign(P,{x:250,y:Q.GROUND-P.h,vx:0,vy:0,ground:true,face:1,hp:100,duck:false,stun:0,inv:0,fire:0,shield:0,speed:0,double:0,jumpAge:0,landTimer:0,coyote:0,jumpBuffer:0,attack:null,hitLatch:false,anim:Q.createSpriteAnimator('idle')});}
function resetRun(){S.score=0;S.lives=3;S.mult=1;S.combo=0;S.objective=0;S.checkpoint=null;clearWorld();resetPlayer();}
function transition(title,sub,next,dur=1.45){S.transition={title,sub,next,t:0,dur};mode('transition');}

function load(){
  const jobs=[];
  for(const k of ['bedroom','budget','christmas','amiga','guru','beads','fighter','invaders','maze']){
    jobs.push(assets.optionalImage('bg_'+k,`assets/backgrounds/${k}.svg`));
    jobs.push(assets.optionalImage('custom_bg_'+k,Q.customAsset?.('backgrounds',k)));
  }
  for(const scene of ['bedroom','beads','budget','fighter','invaders','christmas','maze','amiga','guru'])for(const suffix of ['Back','Mid','Front'])jobs.push(assets.optionalImage('layer_'+scene+suffix,Q.customAsset?.('layers',scene+suffix)));
  for(const key of ['player','playerFight','fighter','enemy','bossBedroom','bossBudget','bossChristmas','bossAmiga','bossGuru'])jobs.push(assets.image('sheet_'+key,Q.customAsset('spritesheets',key)));
  for(const k of ['bedroom','budget','christmas','amiga','guru']){
    jobs.push(assets.optionalImage('boss_'+k,Q.customAsset?.('bosses',k)));
    jobs.push(assets.optionalImage('hazard_'+k,Q.customAsset?.('hazards',k)));
  }
  for(const k of ['tape','disk','zzap','joystick'])jobs.push(assets.optionalImage('item_'+k,Q.customAsset?.('collectibles',k)));
  for(const k of ['shield','speed','double'])jobs.push(assets.optionalImage('power_'+k,Q.customAsset?.('powers',k)));
  for(const k of ['alien1','alien2','alien3','alien4','alien5','ship','bunker','enemyShot','playerShot'])jobs.push(assets.optionalImage('invader_'+k,Q.customAsset?.('invaders',k)));
  return Promise.all(jobs);
}

function playerSpriteState(){
  if(S.mode==='fighter'){
    if(P.stun>0)return'hit';
    if(P.attack)return P.attack.type;
    if(P.duck&&P.ground)return'duck';
    if(!P.ground)return'jump';
    if(Math.abs(P.vx)>35)return'walk';
    return'idle';
  }
  if(P.stun>0)return'hit';
  if(P.duck&&P.ground)return P.fire>0?'duckFire':'duck';
  if(!P.ground){if(P.jumpAge<.08)return'jumpTakeoff';if(P.vy<-190)return'jumpRise';if(Math.abs(P.vy)<=190)return'jumpApex';return'fall';}
  if(P.landTimer>0)return'land';
  if(P.fire>0)return'fire';
  if(Math.abs(P.vx)>35)return'run';
  return'idle';
}
function playerMeta(){return Q.customAssetMeta?.('spritesheets',S.mode==='fighter'?'playerFight':'player');}
function playerGround(){return P.y+P.h;}
function playerAnchorX(){return P.x+P.w/2;}
function playerBox(){const meta=playerMeta(),stateName=playerSpriteState(),fallback={x:P.x+10,y:P.y+14,w:P.w-20,h:P.h-16};return Q.spriteHitbox?.(meta,stateName,playerAnchorX(),playerGround(),fallback)||fallback;}
function syncPlayerAnim(dt){Q.stepSpriteAnimator(P.anim,playerSpriteState(),dt);}

function updatePlayer(dt,opts={}){
  const gravity=opts.gravity||T.player.gravity,canFire=opts.fire!==false,limitLeft=opts.left??65,limitRight=opts.right??(Q.W-65-P.w);
  const wasGround=P.ground;
  P.stun=Math.max(0,P.stun-dt);P.landTimer=Math.max(0,P.landTimer-dt);P.coyote=P.ground?T.player.coyoteTime:Math.max(0,P.coyote-dt);P.jumpBuffer=Math.max(0,P.jumpBuffer-dt);
  if(input.tap('Space','ArrowUp','KeyW'))P.jumpBuffer=T.player.jumpBuffer;
  P.duck=input.down('ArrowDown','KeyS')&&P.ground&&P.stun<=0;
  let move=0;if(P.stun<=0)move=(input.down('ArrowLeft','KeyA')?-1:0)+(input.down('ArrowRight','KeyD')?1:0);
  const base=now()<P.speed?T.player.runSpeed*1.2:T.player.runSpeed,max=P.duck?T.player.crouchSpeed:base,control=P.ground?1:T.player.airControl;
  P.vx=Q.lerp(P.vx,move*max,Math.min(1,dt*T.player.accel*control));
  if(!move&&P.stun<=0){P.vx*=Math.exp(-(P.ground?32:7)*dt);if(P.ground&&Math.abs(P.vx)<18)P.vx=0;}
  if(move)P.face=move;
  if(!P.duck&&P.stun<=0&&P.jumpBuffer>0&&(P.ground||P.coyote>0)){
    P.vy=-T.player.jumpVelocity;P.ground=false;P.coyote=0;P.jumpBuffer=0;P.jumpAge=0;P.landTimer=0;audio.sfx('jump');sparks(playerAnchorX(),playerGround(),'#b8f5ff',6);
  }
  if(!P.ground){P.jumpAge+=dt;if(!input.down('Space','ArrowUp','KeyW')&&P.vy<0&&P.jumpAge>.1)P.vy+=gravity*.22*dt;}
  P.vy+=gravity*dt;P.x=clamp(P.x+P.vx*dt,limitLeft,limitRight);P.y+=P.vy*dt;
  if(P.y>=Q.GROUND-P.h){P.y=Q.GROUND-P.h;P.vy=0;P.ground=true;if(!wasGround){P.landTimer=.12;sparks(playerAnchorX(),Q.GROUND,'#d8f9ff',7);audio.sfx('land');}}
  P.fire=Math.max(0,P.fire-dt);
  if(canFire&&P.stun<=0&&input.tap('KeyZ','ControlLeft')&&P.fire<=0){
    P.fire=now()<P.double?.13:T.player.shotCooldown;
    const dir=P.face||1,low=P.duck&&P.ground,sx=dir>0?P.x+P.w+10:P.x-10,sy=low?Q.GROUND-65:P.y+54,vx=T.player.shotSpeed*dir;
    S.shots.push({x:sx,y:sy,vx,vy:0,r:low?7:8,owner:'p',life:2.2});
    if(now()<P.double)S.shots.push({x:sx,y:sy+11,vx:vx*.98,vy:0,r:6,owner:'p',life:2.2});
    audio.sfx('shot');
  }
  syncPlayerAnim(dt);
}

function hurt(n,knock=0){
  if(now()<P.inv||P.stun>0)return false;
  if(now()<P.shield){if(!S.practice)ACH.add('shieldBlocks',1);audio.sfx('shield');float('BLOCKED',P.x,P.y-12,'#7ef3ff');return false;}
  P.hp-=n;P.inv=now()+T.player.invulnerabilityMs;P.stun=.22;P.vx+=knock;P.vy=Math.min(P.vy,-95);S.shake=T.feedback.shakeHit;S.flash=T.feedback.flashHit;S.bossDamageTaken+=S.mode==='boss'?n:0;audio.sfx('hit');sparks(playerAnchorX(),P.y+62,'#ff6075',20);float(`-${n}`,playerAnchorX(),P.y-15,'#ff6b78');S.combo=0;S.mult=1;
  if(P.hp<=0){
    S.lives--;
    if(S.lives<=0){gameOver();return true;}
    P.hp=P.max;P.x=stage().direction===1?1180:220;P.y=Q.GROUND-P.h;P.vx=0;P.vy=-250;P.inv=now()+1800;P.stun=0;
    S.entities=[];S.pending=[];S.director.cool=1.8;S.shots=S.shots.filter(s=>s.owner==='p');
    float('CHECKPOINT',P.x+40,P.y-35,'#7df0a5');
  }
  return true;
}

function startQuest(){audio.start();ACH.startRun();S.practice=false;resetRun();enterStage(0);}
function practice(id){audio.start();S.practice=true;resetRun();if(id==='beads')startBeads();else if(id==='fighter')startFighter();else if(id==='invaders')startInvaders();else if(id==='maze')startMaze();else enterStage(Math.max(0,Q.STAGES.findIndex(s=>s.id===id)));}
function enterStage(i){
  clearWorld();S.stage=i;S.elapsed=0;S.objective=0;S.stageGrace=T.stage.grace;S.itemTimer=1.4;S.powerTimer=10;S.bossDamageTaken=0;S.director={cool:1.2,lastResponse:null,sequence:0};
  const st=stage();P.x=st.direction===1?1260:240;P.y=Q.GROUND-P.h;P.vx=P.vy=0;P.face=st.direction===1?-1:1;P.hp=Math.max(70,P.hp);P.inv=now()+1200;P.stun=0;P.anim=Q.createSpriteAnimator('idle');
  S.checkpoint={kind:'stage',id:st.id,index:i};
  audio.setTheme(st.music,false,st.id);if(!S.practice&&st.id==='amiga')ACH.flag('amiga');if(!S.practice&&st.id==='guru')ACH.flag('guru');
  transition(st.name,st.subtitle,'stage',1.55);
}
function afterStage(){if(S.stage===0)startBeads();else if(S.stage===1)startFighter();else if(S.stage===2)startMaze();else if(S.stage===3)enterStage(4);else win();}

function laneY(h,lane='ground'){
  if(lane==='ground')return Q.GROUND-h;
  if(lane==='low')return Q.GROUND-h-36;
  if(lane==='duck')return Q.GROUND-170;
  if(lane==='mid')return Q.GROUND-245;
  if(lane==='high')return Q.GROUND-350;
  return Q.GROUND-h;
}
function spawnX(dir,pad=100){return dir<0?Q.W+pad:-pad-150;}
const HAZARD_SIZE={cassette:[112,82],tapeLoop:[190,58],rewinder:[82,82],shelf:[190,92],price:[158,58],bin:[220,78],present:[92,92],bauble:[72,72],tinsel:[190,50],disk:[90,90],window:[178,72],glitch:[116,100],beam:[88,330],corrupt:[150,70]};
function addHazard(variant,lane='ground',opts={}){
  const st=stage(),dir=opts.dir??st.direction,d=HAZARD_SIZE[variant]||[100,80],w=opts.w||d[0],h=opts.h||d[1];
  S.entities.push({kind:'hazard',stageId:st.id,variant,lane,x:opts.x??spawnX(dir),y:opts.y??laneY(h,lane),w,h,vx:opts.vx??(opts.speed||285)*dir,vy:opts.vy||0,dir,damage:opts.damage||18,t:0,wait:opts.wait||0,life:opts.life||0,scored:false,response:opts.response||null,spin:opts.spin||0});
}
function addEnemy(variant='crawler',lane='ground',opts={}){
  const st=stage(),dir=opts.dir??st.direction,dims={crawler:[74,70],bat:[84,58],mouse:[88,56],bug:[80,70],glitchling:[78,78]},d=dims[variant]||[74,70];
  S.entities.push({kind:'enemy',stageId:st.id,variant,x:opts.x??spawnX(dir,90),y:opts.y??laneY(d[1],lane),w:d[0],h:d[1],vx:(opts.speed||250)*dir,hp:opts.hp||1,t:0,dir,face:dir<0?-1:1,state:variant==='mouse'?'low':'run',response:opts.response||'shoot'});
}
function addItem(lane=null,type=null){
  const st=stage(),dir=st.direction,t=type||pick(st.id==='amiga'||st.id==='guru'?['disk','zzap','joystick']:['tape','zzap','joystick']),ln=lane||pick(['ground','mid','high']),dims={tape:[78,48],disk:[58,58],zzap:[50,66],joystick:[60,64]},d=dims[t]||[56,56];
  S.entities.push({kind:'item',type:t,x:spawnX(dir,70),y:laneY(d[1],ln),w:d[0],h:d[1],vx:(275+S.stage*10)*dir,t:0,rot:rand(-.12,.12),spin:rand(-1.5,1.5)});
}
function addPower(lane='mid'){const dir=stage().direction;S.entities.push({kind:'power',type:pick(['shield','speed','double']),x:spawnX(dir,80),y:laneY(64,lane),w:64,h:64,vx:255*dir,t:0});}
