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

/* V10.4 is intentionally loaded after the established V10.3 engine. */
window.addEventListener("load",()=>{
  if(document.querySelector('script[data-ccg-lost-sizzler-v104="true"]'))return;
  const gameplay=document.createElement("script");
  gameplay.src="js/v10-4-patch.js";
  gameplay.dataset.ccgLostSizzlerV104="true";
  gameplay.async=false;
  gameplay.onload=()=>{
    if(document.querySelector('script[data-ccg-lost-sizzler-cache-v104="true"]'))return;
    const cache=document.createElement("script");
    cache.src="js/v10-4-death-cache.js";
    cache.dataset.ccgLostSizzlerCacheV104="true";
    cache.async=false;
    document.body.appendChild(cache);
  };
  document.body.appendChild(gameplay);
},{once:true});
