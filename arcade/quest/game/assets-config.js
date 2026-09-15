(function(){
  'use strict';
  const Q=window.CCGQuest=window.CCGQuest||{};
  const ASSET_REVISION='v20260915-q3';
  const production=path=>`assets/production/${path}?v=${ASSET_REVISION}`;
  const source=path=>`assets/source/${path}?v=${ASSET_REVISION}`;

  Q.CUSTOM_ASSETS={
    backgrounds:{
      bedroom:'https://lcslgxpgmttaexsorxik.supabase.co/storage/v1/object/public/ccg-arcade-assets/backgrounds/bedroom/1787232895204-bedroom.webp',
      beads:'https://lcslgxpgmttaexsorxik.supabase.co/storage/v1/object/public/ccg-arcade-assets/backgrounds/beads/1787233614399-electric-bead-run.webp',
      budget:'https://lcslgxpgmttaexsorxik.supabase.co/storage/v1/object/public/ccg-arcade-assets/backgrounds/budget/1787235091047-budget-rack.webp',
      fighter:'https://lcslgxpgmttaexsorxik.supabase.co/storage/v1/object/public/ccg-arcade-assets/backgrounds/fighter/1787235832987-36-percent-bout.webp',
      invaders:'https://lcslgxpgmttaexsorxik.supabase.co/storage/v1/object/public/ccg-arcade-assets/backgrounds/invaders/1787235456157-alien_formation.webp',
      christmas:'https://lcslgxpgmttaexsorxik.supabase.co/storage/v1/object/public/ccg-arcade-assets/backgrounds/christmas/1787238986811-christmasmorning.webp',
      maze:null,
      amiga:'https://lcslgxpgmttaexsorxik.supabase.co/storage/v1/object/public/ccg-arcade-assets/backgrounds/amiga/1787236613103-amiga-upgrade.webp',
      guru:'https://lcslgxpgmttaexsorxik.supabase.co/storage/v1/object/public/ccg-arcade-assets/backgrounds/guru/1787236226252-guru-meditation.webp'
    },
    layers:{bedroomBack:null,bedroomMid:null,bedroomFront:null,beadsBack:null,beadsMid:null,beadsFront:null,budgetBack:null,budgetMid:null,budgetFront:null,fighterBack:null,fighterMid:null,fighterFront:null,invadersBack:null,invadersMid:null,invadersFront:null,christmasBack:null,christmasMid:null,christmasFront:null,mazeBack:null,mazeMid:null,mazeFront:null,amigaBack:null,amigaMid:null,amigaFront:null,guruBack:null,guruMid:null,guruFront:null},
    bosses:{bedroom:production('bosses/bedroom.png'),budget:production('bosses/budget.png'),christmas:production('bosses/christmas.png'),amiga:production('bosses/amiga.png'),guru:production('bosses/guru.png')},
    collectibles:{tape:production('collectibles/tape.png'),disk:production('collectibles/disk.png'),zzap:production('collectibles/zzap.png'),joystick:production('collectibles/joystick.png')},
    powers:{shield:production('powers/shield.png'),speed:production('powers/speed.png'),double:production('powers/double.png')},
    hazards:{bedroom:production('hazards/bedroom.png'),budget:production('hazards/budget.png'),christmas:production('hazards/christmas.png'),amiga:production('hazards/amiga.png'),guru:production('hazards/guru.png')},
    fighter:{enemy:production('fighter/tiertex-idle.png'),enemyPunch:production('fighter/tiertex-punch.png'),enemyKick:production('fighter/tiertex-kick.png'),enemyHit:production('fighter/tiertex-hit.png')},
    invaders:{alien1:production('invaders/alien-row-1.png'),alien2:production('invaders/alien-row-2.png'),alien3:production('invaders/alien-row-3.png'),alien4:production('invaders/alien-row-4.png'),alien5:production('invaders/alien-row-5.png'),ship:production('invaders/player-ship.png'),bunker:production('invaders/bunker.png'),enemyShot:production('invaders/enemy-shot.png'),playerShot:production('invaders/player-shot.png')},
    spritesheets:{player:production('player/cheeky-main-sheet.png'),playerFight:production('player/cheeky-fight-sheet.png'),fighter:production('fighter/retsu-sheet.png'),enemy:production('enemies/8bit-enemy-sheet.png'),bossBedroom:production('bosses/bedroom-sheet.png'),bossBudget:production('bosses/budget-sheet.png'),bossChristmas:production('bosses/christmas-sheet.png'),bossAmiga:production('bosses/amiga-sheet.png'),bossGuru:production('bosses/guru-sheet.png')},
    player:{mascot:source('player-parts/cheeky-mascot.png'),head:source('player-parts/cheeky-head.png'),avatar:null,body:source('player-parts/cheeky-body.png'),arm:source('player-parts/cheeky-arm.png'),leg:source('player-parts/cheeky-leg.png')},
    music:{bedroom:null,bedroomBoss:null,beads:null,budget:null,budgetBoss:null,fighter:null,invaders:null,christmas:null,christmasBoss:null,maze:null,amiga:null,amigaBoss:null,guru:null,guruBoss:null,title:null},
    sfx:{jump:null,pickup:null,hit:null,shot:null,bosswarn:null,shield:null,shieldlow:null,unlock:null,punch:null,kick:null,dash:null,land:null,break:null}
  };

  const mainState={
    idle:{drawWidth:156,drawHeight:198,offsetY:0,hitbox:{x:51,y:66,w:54,h:108}},
    run:{drawWidth:164,drawHeight:202,offsetY:0,hitbox:{x:54,y:69,w:54,h:107}},
    jumpTakeoff:{drawWidth:160,drawHeight:202,offsetY:0,hitbox:{x:53,y:70,w:52,h:104}},
    jumpRise:{drawWidth:162,drawHeight:206,offsetY:-3,hitbox:{x:55,y:77,w:52,h:103}},
    jumpApex:{drawWidth:164,drawHeight:205,offsetY:-4,hitbox:{x:56,y:78,w:52,h:101}},
    jump:{drawWidth:164,drawHeight:205,offsetY:-4,hitbox:{x:56,y:78,w:52,h:101}},
    fall:{drawWidth:162,drawHeight:204,offsetY:-2,hitbox:{x:55,y:75,w:52,h:103}},
    land:{drawWidth:162,drawHeight:184,offsetY:0,hitbox:{x:54,y:69,w:54,h:88}},
    duck:{drawWidth:166,drawHeight:166,offsetY:0,hitbox:{x:53,y:70,w:60,h:90},muzzle:{x:80,y:83}},
    duckFire:{drawWidth:180,drawHeight:168,offsetY:0,hitbox:{x:54,y:70,w:62,h:92},muzzle:{x:90,y:83}},
    fire:{drawWidth:178,drawHeight:198,offsetY:0,hitbox:{x:62,y:66,w:54,h:107},muzzle:{x:132,y:58}},
    hit:{drawWidth:170,drawHeight:198,offsetY:0,hitbox:{x:58,y:66,w:54,h:107}},
    victory:{drawWidth:170,drawHeight:212,offsetY:-10,hitbox:{x:58,y:74,w:54,h:108}}
  };

  const fightState={
    idle:{drawWidth:238,drawHeight:302,hitbox:{anchor:true,x:-45,y:-260,w:90,h:250}},
    walk:{drawWidth:238,drawHeight:302,hitbox:{anchor:true,x:-45,y:-260,w:90,h:250}},
    jump:{drawWidth:238,drawHeight:302,hitbox:{anchor:true,x:-45,y:-255,w:90,h:245}},
    guard:{drawWidth:238,drawHeight:294,hitbox:{anchor:true,x:-48,y:-245,w:96,h:235}},
    duck:{drawWidth:238,drawHeight:244,hitbox:{anchor:true,x:-50,y:-180,w:100,h:170}},
    punch:{drawWidth:260,drawHeight:302,hitbox:{anchor:true,x:-45,y:-260,w:90,h:250}},
    kick:{drawWidth:276,drawHeight:302,hitbox:{anchor:true,x:-45,y:-260,w:90,h:250}},
    hit:{drawWidth:248,drawHeight:302,hitbox:{anchor:true,x:-45,y:-260,w:90,h:250}},
    victory:{drawWidth:250,drawHeight:314,offsetY:-12,hitbox:{anchor:true,x:-45,y:-260,w:90,h:250}}
  };

  const retsuState={
    idle:{drawWidth:230,drawHeight:300,hitbox:{anchor:true,x:-46,y:-252,w:92,h:242}},
    walk:{drawWidth:236,drawHeight:300,hitbox:{anchor:true,x:-46,y:-252,w:92,h:242}},
    jump:{drawWidth:236,drawHeight:300,hitbox:{anchor:true,x:-46,y:-248,w:92,h:238}},
    guard:{drawWidth:230,drawHeight:294,hitbox:{anchor:true,x:-48,y:-244,w:96,h:234}},
    punch:{drawWidth:260,drawHeight:300,hitbox:{anchor:true,x:-46,y:-252,w:92,h:242}},
    kick:{drawWidth:278,drawHeight:300,hitbox:{anchor:true,x:-46,y:-252,w:92,h:242}},
    hit:{drawWidth:242,drawHeight:300,hitbox:{anchor:true,x:-46,y:-252,w:92,h:242}}
  };

  const bossMeta={frameWidth:256,frameHeight:224,columns:4,fps:7,drawWidth:230,drawHeight:205,nativeFacing:-1,animations:{idle:[0,1],charge:[2,3,4],hit:[5,6],defeat:[7]},loop:true};
  Q.CUSTOM_ASSET_META={
    'spritesheets:player':{frameWidth:256,frameHeight:320,columns:4,fps:10,drawWidth:156,drawHeight:198,nativeFacing:1,animations:{idle:[0,1],run:[2,3,4,5],jumpTakeoff:[6],jumpRise:[7],jumpApex:[8],jump:[7,8],fall:[9],land:[10],duck:[11],fire:[12],duckFire:[13],hit:[14],victory:[15]},loop:true,stateMeta:mainState},
    'spritesheets:playerFight':{frameWidth:248,frameHeight:316,columns:4,fps:8,drawWidth:238,drawHeight:302,nativeFacing:1,animations:{idle:[0,1],walk:[2],run:[2],guard:[3],duck:[3],punch:[4],kick:[5],hit:[6],victory:[7],jump:[2]},loop:true,stateMeta:fightState},
    'spritesheets:fighter':{frameWidth:248,frameHeight:316,columns:4,fps:8,drawWidth:230,drawHeight:300,nativeFacing:-1,animations:{idle:[0,1],walk:[2],jump:[7],guard:[3],punch:[4],kick:[5],hit:[6]},loop:true,stateMeta:retsuState},
    'spritesheets:enemy':{frameWidth:128,frameHeight:128,columns:4,fps:10,drawWidth:78,drawHeight:78,nativeFacing:1,animations:{run:[0,1,2,3],low:[4,5,6,7]},loop:true},
    'spritesheets:bossBedroom':{...bossMeta},'spritesheets:bossBudget':{...bossMeta},'spritesheets:bossChristmas':{...bossMeta},'spritesheets:bossAmiga':{...bossMeta},'spritesheets:bossGuru':{...bossMeta}
  };

  Q.customAsset=function(group,key){return Q.CUSTOM_ASSETS?.[group]?.[key]||null;};
  Q.customAssetMeta=function(group,key){return Q.CUSTOM_ASSET_META?.[`${group}:${key}`]||null;};
})();
