/*
 * OWNER ASSET OVERRIDES
 * Replace any null value with a site-relative file path, or add paths to a
 * playlist array. Unchanged values continue to use the bundled defaults.
 * The full key/path catalogue is in assets/asset-manifest.json.
 */
window.CCG_ASSET_OVERRIDES={
  images:{
    logo:null,
    namedEnemies:{"Peter Cortens":null,"Swanh8ter":null,"Syragar":null,"Parsnip Celery":null,"CPU":null,"Yoshi Yoshi":null,"CCG":null},
    items:{health:null,ammo:null,potion:null,torch:null,teleport:null,banishment:null,inventorySlot:null,credits:null,xpOrb:null,armour:null,key:null,bronze:null,exitSigil:null,weapon:null,rapid:null,game:null,loot:null}
  },
  audio:{
    music:{
      exploration:null,danger:null,sanctuary:null,named:null,stalker:null,
      playlists:{normal:[],danger:[],sanctuary:[],named:[],stalker:[]}
    },
    sfx:{}
  }
};

const CCG_V106_HUD_REV="20260822e";
const CCG_V106_SIDEBAR_REV="20260822a";
const CCG_PLAYLIST_AUDIO_REV="20260822d";

(()=>{
  if(!document.querySelector('link[data-ccg-v106-ui="true"]')){
    const link=document.createElement("link");
    link.rel="stylesheet";
    link.href="css/v10-6-ui-polish.css";
    link.dataset.ccgV106Ui="true";
    document.head.appendChild(link);
  }
  if(!document.querySelector('link[data-ccg-v106-inventory-hud="true"]')){
    const link=document.createElement("link");
    link.rel="stylesheet";
    link.href=`css/v10-6-inventory-hud-fix.css?v=${CCG_V106_HUD_REV}`;
    link.dataset.ccgV106InventoryHud="true";
    document.head.appendChild(link);
  }
  if(!document.querySelector('link[data-ccg-v106-sidebar-fix="true"]')){
    const link=document.createElement("link");
    link.rel="stylesheet";
    link.href=`css/v10-6-sidebar-layout-fix.css?v=${CCG_V106_SIDEBAR_REV}`;
    link.dataset.ccgV106SidebarFix="true";
    document.head.appendChild(link);
  }
  if(!document.querySelector('script[data-ccg-admin-audio="true"]')){
    const script=document.createElement("script");
    script.src="js/admin-audio-overrides.js";
    script.dataset.ccgAdminAudio="true";
    script.async=true;
    document.head.appendChild(script);
  }
})();

window.addEventListener("load",()=>{
  if(document.querySelector('script[data-ccg-lost-sizzler-v104="true"]'))return;
  const queue=[
    [`js/lost-sizzler-playlist-audio.js?v=${CCG_PLAYLIST_AUDIO_REV}`,"ccgLostSizzlerPlaylistAudio"],
    ["js/v10-7-continuous-exploration.js","ccgLostSizzlerContinuousExplorationV107"],
    ["js/v10-4-patch.js","ccgLostSizzlerV104"],
    ["js/v10-4-death-cache.js","ccgLostSizzlerCacheV104"],
    ["js/v10-4-final-ui.js","ccgLostSizzlerFinalV104"],
    ["js/v10-4-collectible-effects.js","ccgLostSizzlerEffectsV104"],
    ["js/v10-4-regression-fixes.js","ccgLostSizzlerRegressionV104"],
    ["js/v10-5-collectible-effects.js","ccgLostSizzlerEffectsV105"],
    ["js/v10-5-rpg-balance.js","ccgLostSizzlerRpgBalanceV105"],
    ["js/v10-6-runtime.js","ccgLostSizzlerRuntimeV106"],
    ["js/v10-6-death-room-recovery.js","ccgLostSizzlerDeathRoomRecoveryV106"],
    ["js/v10-6-ui-polish.js","ccgLostSizzlerUiV106"],
    [`js/v10-6-inventory-hud-fix.js?v=${CCG_V106_HUD_REV}`,"ccgLostSizzlerInventoryHudV106"],
    ["js/v10-6-menu-runtime-fix.js","ccgLostSizzlerMenuRuntimeV106"],
    ["js/v10-6-dossier-polish.js","ccgLostSizzlerDossierV106"],
    ["js/v10-5-online-effects.js","ccgLostSizzlerOnlineEffectsV105"],
    ["js/v10-6-stalker-shop-balance.js","ccgLostSizzlerStalkerShopBalanceV106"]
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