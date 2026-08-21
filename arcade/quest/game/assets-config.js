(function(){
  "use strict";
  const Q=window.CCGQuest=window.CCGQuest||{};
  const A='assets/production';

  Q.CUSTOM_ASSETS={
    backgrounds:{bedroom:'https://lcslgxpgmttaexsorxik.supabase.co/storage/v1/object/public/ccg-arcade-assets/backgrounds/bedroom/1787232895204-bedroom.webp',beads:'https://lcslgxpgmttaexsorxik.supabase.co/storage/v1/object/public/ccg-arcade-assets/backgrounds/beads/1787233614399-electric-bead-run.webp',budget:'https://lcslgxpgmttaexsorxik.supabase.co/storage/v1/object/public/ccg-arcade-assets/backgrounds/budget/1787235091047-budget-rack.webp',fighter:'https://lcslgxpgmttaexsorxik.supabase.co/storage/v1/object/public/ccg-arcade-assets/backgrounds/fighter/1787235832987-36-percent-bout.webp',invaders:'https://lcslgxpgmttaexsorxik.supabase.co/storage/v1/object/public/ccg-arcade-assets/backgrounds/invaders/1787235456157-alien_formation.webp',christmas:'https://lcslgxpgmttaexsorxik.supabase.co/storage/v1/object/public/ccg-arcade-assets/backgrounds/christmas/1787238986811-christmasmorning.webp',maze:null,amiga:'https://lcslgxpgmttaexsorxik.supabase.co/storage/v1/object/public/ccg-arcade-assets/backgrounds/amiga/1787236613103-amiga-upgrade.webp',guru:'https://lcslgxpgmttaexsorxik.supabase.co/storage/v1/object/public/ccg-arcade-assets/backgrounds/guru/1787236226252-guru-meditation.webp'},
    layers:{bedroomBack:null,bedroomMid:null,bedroomFront:null,beadsBack:null,beadsMid:null,beadsFront:null,budgetBack:null,budgetMid:null,budgetFront:null,fighterBack:null,fighterMid:null,fighterFront:null,invadersBack:null,invadersMid:null,invadersFront:null,christmasBack:null,christmasMid:null,christmasFront:null,mazeBack:null,mazeMid:null,mazeFront:null,amigaBack:null,amigaMid:null,amigaFront:null,guruBack:null,guruMid:null,guruFront:null},
    bosses:{bedroom:`${A}/bosses/bedroom.png`,budget:`${A}/bosses/budget.png`,christmas:`${A}/bosses/christmas.png`,amiga:`${A}/bosses/amiga.png`,guru:`${A}/bosses/guru.png`},
    collectibles:{tape:`${A}/collectibles/tape.png`,disk:`${A}/collectibles/disk.png`,zzap:`${A}/collectibles/zzap.png`,joystick:`${A}/collectibles/joystick.png`},
    powers:{shield:`${A}/powers/shield.png`,speed:`${A}/powers/speed.png`,double:`${A}/powers/double.png`},
    hazards:{bedroom:`${A}/hazards/bedroom.png`,budget:`${A}/hazards/budget.png`,christmas:`${A}/hazards/christmas.png`,amiga:`${A}/hazards/amiga.png`,guru:`${A}/hazards/guru.png`},
    fighter:{enemy:`${A}/fighter/tiertex-idle.png`,enemyPunch:`${A}/fighter/tiertex-punch.png`,enemyKick:`${A}/fighter/tiertex-kick.png`,enemyHit:`${A}/fighter/tiertex-hit.png`},
    invaders:{alien1:`${A}/invaders/alien-row-1.png`,alien2:`${A}/invaders/alien-row-2.png`,alien3:`${A}/invaders/alien-row-3.png`,alien4:`${A}/invaders/alien-row-4.png`,alien5:`${A}/invaders/alien-row-5.png`,ship:`${A}/invaders/player-ship.png`,bunker:`${A}/invaders/bunker.png`,enemyShot:`${A}/invaders/enemy-shot.png`,playerShot:`${A}/invaders/player-shot.png`},
    spritesheets:{player:`${A}/player/cheeky-main-sheet.png`,playerFight:`${A}/player/cheeky-fight-sheet.png`,fighter:`${A}/fighter/retsu-sheet.png`,enemy:`${A}/enemies/8bit-enemy-sheet.png`,bossBedroom:`${A}/bosses/bedroom-sheet.png`,bossBudget:`${A}/bosses/budget-sheet.png`,bossChristmas:`${A}/bosses/christmas-sheet.png`,bossAmiga:`${A}/bosses/amiga-sheet.png`,bossGuru:`${A}/bosses/guru-sheet.png`},
    player:{mascot:`${A}/player/cheeky-mascot.png`,head:`${A}/player/cheeky-head.png`,avatar:null,body:`${A}/player/cheeky-body.png`,arm:`${A}/player/cheeky-arm.png`,leg:`${A}/player/cheeky-leg.png`},
    music:{bedroom:null,bedroomBoss:null,beads:null,budget:null,budgetBoss:null,fighter:null,invaders:null,christmas:null,christmasBoss:null,maze:null,amiga:null,amigaBoss:null,guru:null,guruBoss:null,title:null},
    sfx:{jump:null,pickup:null,hit:null,shot:null,bosswarn:null,shield:null,shieldlow:null,unlock:null,punch:null,kick:null}
  };
  const bedroomBossMeta={frameWidth:256,frameHeight:224,columns:4,fps:6,drawWidth:205,drawHeight:180,animations:{idle:[0,1],charge:[2,3,4],hit:[5,6],defeat:[7]},loop:true};
  const bossMeta={frameWidth:256,frameHeight:224,columns:4,fps:7,drawWidth:205,drawHeight:180,animations:{idle:[0,1],charge:[2,3,4],hit:[5,6],defeat:[7]},loop:true};
  Q.CUSTOM_ASSET_META={
    'spritesheets:player':{frameWidth:256,frameHeight:320,columns:4,fps:10,drawWidth:150,drawHeight:190,avatarHead:false,animations:{idle:[0,1],run:[2,3,4,5],jumpTakeoff:[6],jumpRise:[7],jumpApex:[8],jump:[7,8],fall:[9],land:[10],duck:[11],fire:[12],duckFire:[13],hit:[14],victory:[15]},loop:true},
    'spritesheets:playerFight':{frameWidth:248,frameHeight:316,columns:4,fps:8,drawWidth:238,drawHeight:302,avatarHead:false,animations:{idle:[0,1],walk:[2],run:[2],jump:[2],guard:[3],duck:[3],punch:[4],kick:[5],hit:[6],victory:[7]},loop:true},
    'spritesheets:fighter':{frameWidth:248,frameHeight:316,columns:4,fps:8,drawWidth:230,drawHeight:300,animations:{idle:[0,1],walk:[2],jump:[7],guard:[3],punch:[4],kick:[5],hit:[6]},loop:true},
    'spritesheets:enemy':{frameWidth:128,frameHeight:128,columns:4,fps:10,animations:{run:[0,1,2,3],low:[4,5,6,7]},loop:true},
    'spritesheets:bossBedroom':{...bedroomBossMeta},'spritesheets:bossBudget':{...bossMeta},'spritesheets:bossChristmas':{...bossMeta},'spritesheets:bossAmiga':{...bossMeta},'spritesheets:bossGuru':{...bossMeta}
  };
  Q.customAsset=function(group,key){return Q.CUSTOM_ASSETS?.[group]?.[key] || null;};
  Q.customAssetMeta=function(group,key){return Q.CUSTOM_ASSET_META?.[`${group}:${key}`] || null;};
})();
