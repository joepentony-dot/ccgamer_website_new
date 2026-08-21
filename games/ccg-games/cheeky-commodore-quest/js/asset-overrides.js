/*
 * OWNER ASSET OVERRIDES
 * Replace any null value with a site-relative file path, then upload that file.
 * Example: logo: "assets/my-new-logo.png"
 * The full key/path catalogue is in assets/asset-manifest.json.
 */
window.CCG_ASSET_OVERRIDES={
  images:{
    logo:null,
    namedEnemies:{"Peter Cortens":null,"Swanh8ter":null,"Syragar":null,"Parsnip Celery":null,"CPU":null,"Yoshi Yoshi":null,"CCG":null},
    items:{health:null,ammo:null,potion:null,torch:null,teleport:null,banishment:null,inventorySlot:null,credits:null,xpOrb:null,armour:null,key:null,bronze:null,exitSigil:null,weapon:null,rapid:null,game:null,loot:null}
  },
  audio:{
    music:{exploration:null,danger:null,sanctuary:null,named:null,stalker:null,rooms:{},namedEnemies:{"peter-cortens":null,"swanh8ter":null,"syragar":null,"parsnip-celery":null,"cpu":null,"yoshi-yoshi":null,"ccg":null}},
    sfx:{}
  }
};
