"use strict";
const PATTERNS={
  bedroom:[
    {r:'jump',go(){addHazard('cassette','ground',{speed:285,response:'jump'});schedule(1.55,()=>addItem('mid','tape'));}},
    {r:'duck',go(){addHazard('tapeLoop','duck',{speed:295,response:'duck'});schedule(1.65,()=>addItem('ground','tape'));}},
    {r:'jump',go(){addHazard('rewinder','ground',{speed:320,response:'jump',spin:4});schedule(1.45,()=>addItem('high','zzap'));}},
    {r:'shoot',go(){addEnemy('crawler','ground',{speed:245,response:'shoot'});schedule(1.55,()=>addItem('mid','tape'));}},
    {r:'shoot',go(){addEnemy('bat','mid',{speed:235,response:'shoot'});schedule(1.7,()=>addItem('ground','joystick'));}}
  ],
  budget:[
    {r:'jump',go(){addHazard('shelf','ground',{speed:275,response:'jump'});schedule(1.55,()=>addItem('high','tape'));}},
    {r:'duck',go(){addHazard('price','duck',{speed:305,response:'duck'});schedule(1.55,()=>addItem('ground','tape'));}},
    {r:'jump',go(){addHazard('bin','ground',{speed:268,response:'jump'});schedule(1.65,()=>addItem('mid','tape'));}},
    {r:'shoot',go(){addEnemy('crawler','ground',{speed:265,response:'shoot'});schedule(1.7,()=>addPower('high'));}},
    {r:'jump',go(){addHazard('shelf','ground',{speed:300,w:150,response:'jump'});schedule(1.45,()=>addItem('mid','zzap'));}}
  ],
  christmas:[
    {r:'jump',go(){addHazard('present','ground',{speed:285,dir:1,response:'jump'});schedule(1.6,()=>addItem('mid'));}},
    {r:'duck',go(){addHazard('tinsel','duck',{speed:300,dir:1,response:'duck'});schedule(1.65,()=>addItem('ground'));}},
    {r:'jump',go(){addHazard('bauble','high',{x:-80,y:130,vx:155,vy:110,dir:1,response:'jump'});}},
    {r:'shoot',go(){addEnemy('mouse','ground',{speed:250,dir:1,response:'shoot'});schedule(1.65,()=>addItem('high'));}},
    {r:'jump',go(){addHazard('present','ground',{speed:310,dir:1,response:'jump'});schedule(1.5,()=>addPower('mid'));}}
  ],
  amiga:[
    {r:'jump',go(){addHazard('disk','ground',{speed:290,vy:-170,response:'jump',spin:3});}},
    {r:'duck',go(){addHazard('window','duck',{speed:300,response:'duck'});schedule(1.6,()=>addItem('ground','disk'));}},
    {r:'shoot',go(){addEnemy('bug','mid',{speed:250,response:'shoot'});schedule(1.7,()=>addItem('high','disk'));}},
    {r:'jump',go(){addHazard('disk','ground',{speed:320,vy:-190,response:'jump',spin:4});schedule(1.65,()=>addItem('mid','disk'));}},
    {r:'shoot',go(){addEnemy('mouse','ground',{speed:270,response:'shoot'});schedule(1.7,()=>addPower('high'));}}
  ],
  guru:[
    {r:'move',go(){addHazard('beam','ground',{x:clamp(P.x+rand(-90,90),150,1370),y:405,vx:0,wait:1.55,life:1.0,damage:22,response:'move'});}},
    {r:'jump',go(){addHazard('glitch','ground',{speed:285,response:'jump'});schedule(1.65,()=>addItem('mid','disk'));}},
    {r:'shoot',go(){addEnemy('glitchling','mid',{speed:255,response:'shoot'});schedule(1.65,()=>addItem('high','zzap'));}},
    {r:'jump',go(){addHazard('corrupt','ground',{speed:305,response:'jump'});schedule(1.7,()=>addPower('high'));}},
    {r:'move',go(){addHazard('beam','ground',{x:clamp(P.x+rand(-55,55),150,1370),y:405,vx:0,wait:1.7,life:.95,damage:22,response:'move'});}}
  ]
};
function spawnStagePattern(){
  const list=PATTERNS[stage().id]||PATTERNS.bedroom,candidates=list.filter(p=>p.r!==S.director.lastResponse||list.length<2),pat=pick(candidates.length?candidates:list);
  pat.go();S.director.lastResponse=pat.r;S.director.sequence++;S.director.cool=rand(T.stage.patternMin,T.stage.patternMax);
}
function objectiveType(){const id=stage().id;return id==='amiga'||id==='guru'?'disk':'tape';}
function collectObjective(type){if(type===objectiveType()){S.objective=Math.min(stage().objectiveTarget,S.objective+1);float(`${stage().objective} ${S.objective}/${stage().objectiveTarget}`,playerAnchorX(),P.y-35,stage().accent);}}
function activeMandatoryThreat(){return S.entities.some(e=>(e.kind==='hazard'||e.kind==='enemy')&&!e.dead&&e.response&&Math.abs((e.x+e.w/2)-playerAnchorX())<640);}

function updateStage(dt){
  S.elapsed+=dt;S.stageGrace=Math.max(0,S.stageGrace-dt);clearCombo();updatePlayer(dt);updatePending(dt);S.director.cool-=dt;S.itemTimer-=dt;S.powerTimer-=dt;
  if(S.stageGrace<=0&&S.director.cool<=0&&!pendingDanger()&&!activeMandatoryThreat())spawnStagePattern();
  if(S.itemTimer<=0){addItem();S.itemTimer=rand(T.stage.itemMin,T.stage.itemMax);}
  if(S.powerTimer<=0&&!activeMandatoryThreat()){addPower(pick(['mid','high']));S.powerTimer=rand(T.stage.powerMin,T.stage.powerMax);}
  updateEntities(dt);updateShots(dt);
  if(S.elapsed>=stage().duration)enterBoss();
}

function entityBox(e){
  if(e.kind==='hazard'){
    const pad=e.variant==='tapeLoop'||e.variant==='tinsel'||e.variant==='price'||e.variant==='window'?8:e.variant==='beam'?12:7;
    return{x:e.x+pad,y:e.y+pad,w:Math.max(8,e.w-pad*2),h:Math.max(8,e.h-pad*2)};
  }
  if(e.kind==='enemy')return{x:e.x+7,y:e.y+6,w:e.w-14,h:e.h-10};
  return{x:e.x,y:e.y,w:e.w,h:e.h};
}
function updateEntities(dt){
  const pb=playerBox();
  for(const e of S.entities){
    e.t=(e.t||0)+dt;
    if(e.wait>0){e.wait-=dt;continue;}
    if(e.kind==='hazard'){
      if(e.variant==='bauble'){e.vy+=500*dt;e.y+=e.vy*dt;if(e.y>Q.GROUND-e.h){e.y=Q.GROUND-e.h;e.vy=-250;}}
      else if(e.variant==='disk'){e.vy+=520*dt;e.y+=e.vy*dt;if(e.y>Q.GROUND-e.h){e.y=Q.GROUND-e.h;e.vy=-210;}}
      e.x+=e.vx*dt;if(e.spin)e.rot=(e.rot||0)+e.spin*dt;
      if(e.variant==='beam'&&e.life>0){e.life-=dt;if(e.life<=0)e.dead=true;}
    }else if(e.kind==='enemy'){
      e.x+=e.vx*dt;e.face=e.vx<0?-1:1;
    }else if(e.kind==='item'||e.kind==='power')e.x+=e.vx*dt;
    const box=entityBox(e);
    if(!e.dead&&rhit(pb,box)){
      if(e.kind==='item'){
        score(140,e.x,e.y);comboHit();audio.sfx('pickup');collectObjective(e.type);sparks(e.x+e.w/2,e.y+e.h/2,'#72ff91',16);if(!S.practice){ACH.add('pickups',1);if(e.type==='tape')ACH.add('tapes',1);}e.dead=true;
      }else if(e.kind==='power'){
        if(e.type==='shield')P.shield=now()+8200;if(e.type==='speed')P.speed=now()+7600;if(e.type==='double')P.double=now()+7600;score(220,e.x,e.y);audio.sfx('pickup');sparks(e.x+e.w/2,e.y+e.h/2,'#ffe66c',18);e.dead=true;
      }else{
        hurt(e.damage||(e.kind==='enemy'?T.player.contactDamage:18),e.x>P.x?-220:220);if(e.variant!=='beam')e.dead=true;
      }
    }
    if((e.kind==='hazard'||e.kind==='enemy')&&!e.scored){
      const passed=stage().direction<0?e.x+e.w<P.x-40:e.x>P.x+P.w+40;
      if(passed){e.scored=true;score(45,e.x,e.y);comboHit();}
    }
    if(e.x<-360||e.x>Q.W+360||e.y>Q.H+150)e.dead=true;
  }
  S.entities=S.entities.filter(e=>!e.dead);
}

function shotHitsRect(s,r){return s.x+s.r>r.x&&s.x-s.r<r.x+r.w&&s.y+s.r>r.y&&s.y-s.r<r.y+r.h;}
function updateShots(dt){
  for(const s of S.shots){s.life-=dt;s.x+=s.vx*dt;s.y+=s.vy*dt;if(s.life<=0||s.x<-80||s.x>Q.W+80||s.y<-80||s.y>Q.H+80){s.dead=true;continue;}
    if(s.owner==='p'){
      for(const e of S.entities){if(e.dead||e.kind!=='enemy')continue;if(shotHitsRect(s,entityBox(e))){e.hp--;s.dead=true;sparks(s.x,s.y,'#ffe66c',10);if(e.hp<=0){e.dead=true;score(180,e.x,e.y);if(!S.practice)ACH.add('kills',1);}break;}}
      if(!s.dead&&S.boss&&!S.boss.defeated){const b=S.boss,br={x:b.x-b.w/2,y:b.y-b.h/2,w:b.w,h:b.h};if(shotHitsRect(s,br)){b.hp--;b.hit=.14;s.dead=true;sparks(s.x,s.y,'#ffe66c',8);score(40,s.x,s.y);}}
    }
  }
  S.shots=S.shots.filter(s=>!s.dead);
  S.entities=S.entities.filter(e=>!e.dead);
}

function enterBoss(){
  const st=stage();S.entities=[];S.shots=[];S.pending=[];S.bossDamageTaken=0;S.boss={x:st.direction===1?350:1250,y:515,w:230,h:205,hp:st.bossHp,max:st.bossHp,t:0,next:1.5,phase:1,hit:0,defeated:false,defeatT:0,dir:st.direction===1?1:-1,anim:Q.createSpriteAnimator('idle')};
  P.x=st.direction===1?1180:260;P.y=Q.GROUND-P.h;P.vx=P.vy=0;P.inv=now()+1000;audio.setTheme(st.music,true,st.id);S.checkpoint={kind:'boss',id:st.id,index:S.stage};transition(st.boss,'WATCH THE WARNING, THEN MOVE.','boss',1.45);
}
function bossAttack(){
  const b=S.boss,id=stage().id;b.phase=b.hp<b.max*.34?3:b.hp<b.max*.67?2:1;audio.sfx('bosswarn');
  const dir=-Math.sign(b.x-playerAnchorX())||stage().direction;
  if(id==='bedroom'){
    if(b.phase===1)addHazard('cassette','ground',{dir,speed:285,x:b.x,y:Q.GROUND-82,response:'jump'});
    else if(b.phase===2){addHazard('tapeLoop','duck',{dir,speed:300,x:b.x,y:Q.GROUND-170,response:'duck'});schedule(1.35,()=>addHazard('cassette','ground',{dir,speed:300,x:b.x,y:Q.GROUND-82,response:'jump'}),'danger');}
    else{addHazard('rewinder','ground',{dir,speed:330,x:b.x,y:Q.GROUND-82,response:'jump',spin:5});schedule(1.25,()=>addHazard('tapeLoop','duck',{dir,speed:315,x:b.x,y:Q.GROUND-170,response:'duck'}),'danger');}
  }else if(id==='budget'){
    if(b.phase===1)addHazard('shelf','ground',{dir,speed:280,x:b.x,y:Q.GROUND-92,response:'jump'});
    else if(b.phase===2)addHazard('price','duck',{dir,speed:310,x:b.x,y:Q.GROUND-170,response:'duck'});
    else{addHazard('bin','ground',{dir,speed:300,x:b.x,y:Q.GROUND-78,response:'jump'});schedule(1.35,()=>addHazard('price','duck',{dir,speed:320,x:b.x,y:Q.GROUND-170,response:'duck'}),'danger');}
  }else if(id==='christmas'){
    if(b.phase===1)addHazard('present','ground',{dir,speed:285,x:b.x,y:Q.GROUND-92,response:'jump'});
    else if(b.phase===2)addHazard('tinsel','duck',{dir,speed:310,x:b.x,y:Q.GROUND-170,response:'duck'});
    else{addHazard('bauble','high',{x:b.x,y:160,vx:190*dir,vy:100,dir,response:'jump'});}
  }else if(id==='amiga'){
    if(b.phase===1)addHazard('disk','ground',{dir,speed:300,x:b.x,y:Q.GROUND-90,vy:-170,response:'jump',spin:4});
    else if(b.phase===2)addHazard('window','duck',{dir,speed:310,x:b.x,y:Q.GROUND-170,response:'duck'});
    else{addHazard('disk','ground',{dir,speed:330,x:b.x,y:Q.GROUND-90,vy:-190,response:'jump',spin:5});schedule(1.35,()=>addHazard('window','duck',{dir,speed:320,x:b.x,y:Q.GROUND-170,response:'duck'}),'danger');}
  }else{
    const wait=b.phase===3?1.05:1.35;addHazard('beam','ground',{x:clamp(P.x+rand(-70,70),150,1370),y:405,vx:0,wait,life:1.0,damage:23,response:'move'});
    if(b.phase===3)schedule(1.35,()=>addHazard('glitch','ground',{dir,speed:320,x:b.x,y:Q.GROUND-100,response:'jump'}),'danger');
  }
}
function updateBoss(dt){
  const b=S.boss;if(!b)return;b.t+=dt;b.hit=Math.max(0,b.hit-dt);updatePlayer(dt);updatePending(dt);updateEntities(dt);updateShots(dt);
  const id=stage().id;if(id==='bedroom'){b.y=520+Math.sin(b.t*1.5)*28;b.x=1240+Math.sin(b.t*.65)*90;}else if(id==='budget'){b.x=1240+Math.sin(b.t*1.0)*145;b.y=535+Math.sin(b.t*1.8)*38;}else if(id==='christmas'){b.x=360+Math.sin(b.t*.75)*145;b.y=520+Math.sin(b.t*1.7)*48;}else if(id==='amiga'){b.x=1260+Math.sin(b.t*1.0)*160;b.y=515+Math.sin(b.t*2.0)*55;}else{b.x+=b.dir*(130+b.phase*22)*dt;if(b.x<280){b.x=280;b.dir=1;}if(b.x>1320){b.x=1320;b.dir=-1;}b.y=510+Math.sin(b.t*1.9)*55;}
  if(!b.defeated){b.next-=dt;if(b.next<=0&&!pendingDanger()&&!activeMandatoryThreat()){bossAttack();const min=b.phase===3?T.boss.phase3Min:T.boss.attackMin;b.next=rand(min,T.boss.attackMax);}}
  const stateName=b.defeated?'defeat':b.hit>0?'hit':b.next<.55?'charge':'idle';Q.stepSpriteAnimator(b.anim,stateName,dt);
  if(b.hp<=0&&!b.defeated){b.hp=0;b.defeated=true;b.defeatT=1.1;S.entities=[];S.pending=[];S.shots=[];S.shake=T.feedback.shakeBoss;sparks(b.x,b.y,'#ffe66c',42);score(1800+S.stage*400,b.x,b.y);if(!S.practice){ACH.add('bosses',1);if(S.stage===1)ACH.flag('budgetBoss');if(S.stage===2)ACH.flag('xmasBoss');if(S.bossDamageTaken===0)ACH.flag('noDamageBoss');}}
  if(b.defeated){b.defeatT-=dt;b.y+=24*dt;if(b.defeatT<=0){if(S.practice)transition('PRACTICE COMPLETE','Boss defeated.','title',1.4);else afterStage();}}
}

function startBeads(){
  clearWorld();S.mini={time:0,spawn:1.0,perfectHp:100,lastResponse:null};P.x=280;P.y=Q.GROUND-P.h;P.hp=100;P.vx=P.vy=0;P.inv=now()+800;P.anim=Q.createSpriteAnimator('idle');S.checkpoint={kind:'beads'};audio.setTheme(0,false,'beads');transition('ELECTRIC BEAD RUN','ONE BEAD, ONE DECISION. JUMP LOW. CROUCH HIGH.','beads',1.55);
}
function updateBeads(dt){
  const m=S.mini;m.time+=dt;updatePlayer(dt,{gravity:T.beads.gravity,fire:false});m.spawn-=dt;
  const active=S.entities.filter(e=>e.kind==='bead'&&!e.dead);
  if(m.spawn<=0&&active.length<2){
    const fromLeft=Math.random()<.18,dir=fromLeft?1:-1,response=m.lastResponse==='jump'?'duck':m.lastResponse==='duck'?'jump':(Math.random()<.5?'jump':'duck'),high=response==='duck',x=fromLeft?-70:Q.W+70;
    S.entities.push({kind:'bead',x,y:high?Q.GROUND-178:Q.GROUND-52,w:50,h:50,vx:rand(T.beads.minSpeed,T.beads.maxSpeed)*dir,t:0,wait:T.beads.warning,response,scored:false,dead:false});
    m.lastResponse=response;m.spawn=rand(T.beads.spawnMin,T.beads.spawnMax)+.55;
  }
  const pb=playerBox();
  for(const e of S.entities){if(e.kind!=='bead')continue;e.t+=dt;if(e.wait>0){e.wait-=dt;continue;}e.x+=e.vx*dt;if(!e.hit&&rhit(pb,{x:e.x+5,y:e.y+5,w:e.w-10,h:e.h-10})){hurt(T.beads.damage,e.vx>0?160:-160);e.hit=true;e.dead=true;}const passed=e.vx<0?e.x+e.w<P.x-30:e.x>P.x+P.w+30;if(!e.scored&&passed){e.scored=true;score(120,e.x,e.y);comboHit();if(!S.practice)ACH.add('cleanJumps',1);}if(e.x<-120||e.x>Q.W+120)e.dead=true;}
  S.entities=S.entities.filter(e=>!e.dead);if(m.time>=T.beads.duration){if(!S.practice&&P.hp>=m.perfectHp)ACH.flag('beadPerfect');if(S.practice)transition('PRACTICE COMPLETE','Electric Bead Run complete.','title',1.4);else enterStage(1);}
}
