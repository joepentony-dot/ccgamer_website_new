(function(){
  "use strict";
  const Q=window.CCGQuest=window.CCGQuest||{};

  /*
    CUSTOM ASSET SLOTS
    ------------------
    Leave a value as null to use the bundled artwork/audio.
    Live overrides are normally hydrated from Supabase by remote-assets.js.
    PNG, JPG, WEBP and SVG are supported directly; raster art does not need
    to be converted to SVG simply to be usable by the game.
  */
  Q.CUSTOM_ASSETS={
    backgrounds:{bedroom:null,beads:null,budget:null,fighter:null,christmas:null,amiga:null,guru:null},
    bosses:{bedroom:null,budget:null,christmas:null,amiga:null,guru:null},
    collectibles:{tape:null,disk:null,zzap:null,joystick:null},
    powers:{shield:null,speed:null,double:null},
    hazards:{bedroom:null,budget:null,christmas:null,amiga:null,guru:null},
    fighter:{enemy:null,enemyPunch:null,enemyKick:null,enemyHit:null},
    player:{
      mascot:null,
      head:null,
      body:null,
      arm:null,
      leg:null
    },
    music:{bedroom:null,bedroomBoss:null,beads:null,budget:null,budgetBoss:null,fighter:null,christmas:null,christmasBoss:null,amiga:null,amigaBoss:null,guru:null,guruBoss:null,title:null}
  };

  Q.customAsset=function(group,key){return Q.CUSTOM_ASSETS?.[group]?.[key] || null;};
})();
