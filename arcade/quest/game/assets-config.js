(function(){
  "use strict";
  const Q=window.CCGQuest=window.CCGQuest||{};

  /*
    CUSTOM ASSET SLOTS
    ------------------
    Leave a value as null to use the bundled artwork/audio.
    Live overrides are normally hydrated from Supabase by remote-assets.js.
    PNG, JPG, WEBP, GIF and SVG are supported for visual assets.
  */
  Q.CUSTOM_ASSETS={
    backgrounds:{bedroom:null,beads:null,budget:null,fighter:null,invaders:null,christmas:null,maze:null,amiga:null,guru:null},
    layers:{
      bedroomBack:null,bedroomMid:null,bedroomFront:null,
      beadsBack:null,beadsMid:null,beadsFront:null,
      budgetBack:null,budgetMid:null,budgetFront:null,
      fighterBack:null,fighterMid:null,fighterFront:null,
      invadersBack:null,invadersMid:null,invadersFront:null,
      christmasBack:null,christmasMid:null,christmasFront:null,
      mazeBack:null,mazeMid:null,mazeFront:null,
      amigaBack:null,amigaMid:null,amigaFront:null,
      guruBack:null,guruMid:null,guruFront:null
    },
    bosses:{bedroom:null,budget:null,christmas:null,amiga:null,guru:null},
    collectibles:{tape:null,disk:null,zzap:null,joystick:null},
    powers:{shield:null,speed:null,double:null},
    hazards:{bedroom:null,budget:null,christmas:null,amiga:null,guru:null},
    fighter:{enemy:null,enemyPunch:null,enemyKick:null,enemyHit:null},
    invaders:{alien1:null,alien2:null,alien3:null,alien4:null,alien5:null,ship:null,bunker:null,enemyShot:null,playerShot:null},
    spritesheets:{player:null,fighter:null,enemy:null,bossBedroom:null,bossBudget:null,bossChristmas:null,bossAmiga:null,bossGuru:null},
    player:{mascot:null,head:null,avatar:null,body:null,arm:null,leg:null},
    music:{bedroom:null,bedroomBoss:null,beads:null,budget:null,budgetBoss:null,fighter:null,invaders:null,christmas:null,christmasBoss:null,maze:null,amiga:null,amigaBoss:null,guru:null,guruBoss:null,title:null},
    sfx:{jump:null,pickup:null,hit:null,shot:null,bosswarn:null,shield:null,shieldlow:null,unlock:null,punch:null,kick:null}
  };

  Q.CUSTOM_ASSET_META={};
  Q.customAsset=function(group,key){return Q.CUSTOM_ASSETS?.[group]?.[key] || null;};
  Q.customAssetMeta=function(group,key){return Q.CUSTOM_ASSET_META?.[`${group}:${key}`] || null;};
})();