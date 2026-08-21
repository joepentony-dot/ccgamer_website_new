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

/* V10.4/V10.5 layers are loaded after the established engine. */
window.addEventListener("load",()=>{
  if(document.querySelector('script[data-ccg-lost-sizzler-v104="true"]'))return;
  const queue=[
    ["js/v10-4-patch.js","ccgLostSizzlerV104"],
    ["js/v10-4-death-cache.js","ccgLostSizzlerCacheV104"],
    ["js/v10-4-final-ui.js","ccgLostSizzlerFinalV104"],
    ["js/v10-4-collectible-effects.js","ccgLostSizzlerEffectsV104"],
    ["js/v10-4-regression-fixes.js","ccgLostSizzlerRegressionV104"],
    ["js/v10-5-collectible-effects.js","ccgLostSizzlerEffectsV105"],
    ["js/v10-5-rpg-balance.js","ccgLostSizzlerRpgBalanceV105"],
    ["js/v10-5-multiplayer.js","ccgLostSizzlerMultiplayerV105"],
    ["js/v10-5-online-effects.js","ccgLostSizzlerOnlineEffectsV105"]
  ];
  const loadNext=index=>{
    if(index>=queue.length)return;
    const [src,key]=queue[index],selector=`script[data-${key.replace(/[A-Z]/g,m=>`-${m.toLowerCase()}`)}="true"]`;
    if(document.querySelector(selector)){loadNext(index+1);return}
    const script=document.createElement("script");
    script.src=src;script.dataset[key]="true";script.async=false;
    script.onload=()=>loadNext(index+1);
    document.body.appendChild(script);
  };
  loadNext(0);
},{once:true});
