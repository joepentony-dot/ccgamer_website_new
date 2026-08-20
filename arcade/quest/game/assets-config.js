(function(){
  "use strict";
  const Q=window.CCGQuest=window.CCGQuest||{};

  /*
    CUSTOM ASSET SLOTS
    ------------------
    Leave a value as null to use the built-in artwork/audio.
    When a custom file is supplied, put it in the matching assets/custom or
    assets/music folder and set the relative path here. PNG, JPG, WEBP and SVG
    are all supported directly; raster artwork does not need to be converted
    to SVG just to be used by the game.
  */
  Q.CUSTOM_ASSETS={
    backgrounds:{bedroom:null,beads:null,budget:null,fighter:null,christmas:null,amiga:null,guru:null},
    bosses:{bedroom:null,budget:null,christmas:null,amiga:null,guru:null},
    collectibles:{tape:null,disk:null,zzap:null,joystick:null},
    powers:{shield:null,speed:null,double:null},
    hazards:{bedroom:null,budget:null,christmas:null,amiga:null,guru:null},
    fighter:{enemy:null},
    player:{mascot:null},
    music:{bedroom:null,bedroomBoss:null,beads:null,budget:null,budgetBoss:null,fighter:null,christmas:null,christmasBoss:null,amiga:null,amigaBoss:null,guru:null,guruBoss:null,title:null}
  };

  Q.customAsset=function(group,key){return Q.CUSTOM_ASSETS?.[group]?.[key] || null;};
})();
