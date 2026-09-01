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
    sfx:{},
    voice:{
      welcome:null,weeklyWelcome:null,hurt:null,lowHealth:null,noAmmo:null,secret:null,
      objectiveHint:null,objectiveNear:null,floorClear:null,gameOver:null,playerDeath:null,
      deathStalker:null,loadula:null,gildedElf:null,gildedFive:null,gildedCaught:null,
      gildedEscaped:null,namedEnemy:null,rareLoot:null,levelUp:null,shop:null,sanctuary:null,
      trap:null,boulder:null,weeklyDeath:null,weeklyReset:null,
      mimic:null,cursed:null,curseCleared:null,merchant:null,merchantGone:null,
      goldenRoom:null,goldenClear:null,adventurer:null,adventurerSaved:null,tremor:null,
      cabinet:null,cabinetWin:null,cabinetFail:null,treasureBat:null,treasureBatGone:null,
      treasureBatDown:null,taxman:null,taxmanCaught:null,mysteryPotion:null,developerRoom:null,
      bountyStart:null,bounty:null,bountyComplete:null,treasureMap:null,buriedCache:null,mutation:null,
      weeklyGhost:null,respawn:null
    }
  }
};

/* Every enhancement URL inherits the currently published release token. Older
 * releases used a mixture of historical tokens and bare URLs, allowing a
 * browser HTTP cache to combine new core files with old enhancement files. */
const CCG_RELEASE_REV=String(document.querySelector('meta[name="ccg-lost-sizzler-cache"]')?.content||document.querySelector('meta[name="ccg-lost-sizzler-build"]')?.content||"latest").trim();
const CCG_V106_HUD_REV=CCG_RELEASE_REV;
const CCG_V106_UI_REV=CCG_RELEASE_REV;
const CCG_V104_PATCH_REV=CCG_RELEASE_REV;
const CCG_V106_SIDEBAR_REV=CCG_RELEASE_REV;
const CCG_PLAYLIST_AUDIO_REV=CCG_RELEASE_REV;
const CCG_PLAYER_INSIGHTS_REV=CCG_RELEASE_REV;
const CCG_BROWSER_STABILITY_REV=CCG_RELEASE_REV;
const CCG_DEPTH_FLOW_REV=CCG_RELEASE_REV;
const CCG_MOBILE_FOCUS_REV=CCG_RELEASE_REV;
const CCG_MOBILE_SAFETY_REV=CCG_RELEASE_REV;
const CCG_DOSSIER_REV=CCG_RELEASE_REV;
const CCG_CHANGELOG_REV=CCG_RELEASE_REV;
const CCG_MOBILE_COMBAT_MAP_REV=CCG_RELEASE_REV;
const CCG_GILDED_ELF_REV=CCG_RELEASE_REV;
const CCG_RARE_EVENTS_REV=CCG_RELEASE_REV;
const CCG_RARE_EVENTS_BALANCE_REV=CCG_RELEASE_REV;
const CCG_ADMIN_AUDIO_REV=CCG_RELEASE_REV;
const CCG_VOICE_DIRECTOR_REV=CCG_RELEASE_REV;
const CCG_VOICE_EXPANSION_REV=CCG_RELEASE_REV;
const CCG_EXPANSION_CHANGELOG_REV=CCG_RELEASE_REV;
const CCG_INPUT_UI_FIX_REV=CCG_RELEASE_REV;
const CCG_DUNGEON_VARIETY_REV=CCG_RELEASE_REV;
const CCG_ONBOARDING_SAFETY_REV=CCG_RELEASE_REV;
const CCG_ONBOARDING_HARDENING_REV=CCG_RELEASE_REV;
const CCG_TUTORIAL_GUIDANCE_REV=CCG_RELEASE_REV;
const CCG_MULTIPLAYER_SYNC_REV=CCG_RELEASE_REV;
const CCG_ENVIRONMENTAL_POLISH_REV=CCG_RELEASE_REV;
const CCG_MOBILE_ERGONOMICS_REV=CCG_RELEASE_REV;
const CCG_MELEE_AMMO_REV=CCG_RELEASE_REV;
const CCG_AMMO_BUDGET_REV=CCG_RELEASE_REV;
const CCG_ACHIEVEMENTS_REV=CCG_RELEASE_REV;
const CCG_POLISH_REV=CCG_RELEASE_REV;
const CCG_HORDE_REV=CCG_RELEASE_REV;
const CCG_SABOTEURS_REV=CCG_RELEASE_REV;
const CCG_SPECIAL_MODES_REV=CCG_RELEASE_REV;
const CCG_MODE_POLISH_REV=CCG_RELEASE_REV;
const CCG_QUALITY_V135_REV=CCG_RELEASE_REV;

/* A run must not begin while the ordered enhancement queue is still replacing
 * the base combat, onboarding and balance functions. Keep the first requested
 * launch and replay it once the complete release runtime is ready. */
(()=>{
  const launchIds=new Set(["solo-btn","tutorial-zone-btn","continue-save-btn","daily-btn","split-btn","create-btn","horde-mode-btn","saboteurs-mode-btn","join-btn"]);
  let resolveReady;
  const state={ready:false,failed:false,pendingId:"",errors:[],promise:new Promise(resolve=>{resolveReady=resolve})};
  const setBodyState=value=>{if(document.body)document.body.dataset.releaseReady=value};
  const setMenuStatus=text=>{const note=document.getElementById("menu-note");if(note)note.dataset.releaseStatus=text||""};
  function intercept(event){
    const button=event.target?.closest?.("button");
    if(state.ready||!button||!launchIds.has(button.id))return;
    event.preventDefault();event.stopImmediatePropagation();
    if(!state.failed){state.pendingId=button.id;setMenuStatus("PREPARING DUNGEON — YOUR SELECTION WILL START AUTOMATICALLY");}
  }
  function finish(errors=[]){
    state.errors=[...errors];state.failed=state.errors.length>0;
    if(state.failed){setBodyState("failed");setMenuStatus("DUNGEON STARTUP FAILED — REFRESH THE PAGE TO RETRY");resolveReady(false);return false}
    state.ready=true;setBodyState("true");setMenuStatus("");resolveReady(true);
    const id=state.pendingId;state.pendingId="";
    if(id)setTimeout(()=>document.getElementById(id)?.click(),0);
    return true;
  }
  setBodyState("false");document.addEventListener("click",intercept,true);
  window.addEventListener("pagehide",()=>document.removeEventListener("click",intercept,true),{once:true});
  window.CCGLostSizzlerReleaseGate={state,finish};
})();

/* Start onboarding immediately while the core scripts below this file are still
 * parsing. The modules poll for the core functions they need, so the first Play
 * click cannot outrun the tutorial, welcome or dossier-safety install. */
(()=>{
  if(!document.querySelector('script[data-ccg-lost-sizzler-onboarding-safety-v120="true"]')){
    const script=document.createElement("script");
    script.src=`js/v10-20-onboarding-safety.js?v=${CCG_ONBOARDING_SAFETY_REV}`;
    script.dataset.ccgLostSizzlerOnboardingSafetyV120="true";
    script.async=false;
    document.head.appendChild(script);
  }
  if(!document.querySelector('script[data-ccg-lost-sizzler-onboarding-hardening-v120="true"]')){
    const script=document.createElement("script");
    script.src=`js/v10-20-onboarding-hardening.js?v=${CCG_ONBOARDING_HARDENING_REV}`;
    script.dataset.ccgLostSizzlerOnboardingHardeningV120="true";
    script.async=false;
    document.head.appendChild(script);
  }
})();

(()=>{
  if(!document.querySelector('link[data-ccg-v106-ui="true"]')){
    const link=document.createElement("link");
    link.rel="stylesheet";
    link.href=`css/v10-6-ui-polish.css?v=${CCG_RELEASE_REV}`;
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
  if(!document.querySelector('link[data-ccg-v109-stability-layout="true"]')){
    const link=document.createElement("link");
    link.rel="stylesheet";
    link.href=`css/v10-9-stability-layout.css?v=${CCG_BROWSER_STABILITY_REV}`;
    link.dataset.ccgV109StabilityLayout="true";
    document.head.appendChild(link);
  }
  if(!document.querySelector('link[data-ccg-v111-mobile-focus="true"]')){
    const link=document.createElement("link");
    link.rel="stylesheet";
    link.href=`css/v10-11-mobile-focus.css?v=${CCG_MOBILE_FOCUS_REV}`;
    link.dataset.ccgV111MobileFocus="true";
    document.head.appendChild(link);
  }
  if(!document.querySelector('link[data-ccg-v111-mobile-safety="true"]')){
    const link=document.createElement("link");
    link.rel="stylesheet";
    link.href=`css/v10-11-mobile-runtime-safety.css?v=${CCG_MOBILE_SAFETY_REV}`;
    link.dataset.ccgV111MobileSafety="true";
    document.head.appendChild(link);
  }
  if(!document.querySelector('link[data-ccg-v113-mobile-combat-map="true"]')){
    const link=document.createElement("link");
    link.rel="stylesheet";
    link.href=`css/v10-13-mobile-combat-map.css?v=${CCG_MOBILE_COMBAT_MAP_REV}`;
    link.dataset.ccgV113MobileCombatMap="true";
    document.head.appendChild(link);
  }
  if(!document.querySelector('link[data-ccg-v118-input-ui-fixes="true"]')){
    const link=document.createElement("link");
    link.rel="stylesheet";
    link.href=`css/v10-18-input-ui-bugfixes.css?v=${CCG_INPUT_UI_FIX_REV}`;
    link.dataset.ccgV118InputUiFixes="true";
    document.head.appendChild(link);
  }
  if(!document.querySelector('link[data-ccg-v124-mobile-ergonomics="true"]')){
    const link=document.createElement("link");
    link.rel="stylesheet";
    link.href=`css/v10-24-mobile-ergonomics.css?v=${CCG_MOBILE_ERGONOMICS_REV}`;
    link.dataset.ccgV124MobileErgonomics="true";
    document.head.appendChild(link);
  }
  if(!document.querySelector('link[data-ccg-developer-changelog="true"]')){
    const link=document.createElement("link");
    link.rel="stylesheet";
    link.href=`css/v10-12-developer-changelog.css?v=${CCG_CHANGELOG_REV}`;
    link.dataset.ccgDeveloperChangelog="true";
    document.head.appendChild(link);
  }
  if(!document.querySelector('link[data-ccg-v130-polish="true"]')){
    const link=document.createElement("link");
    link.rel="stylesheet";
    link.href=`css/v10-30-polish.css?v=${CCG_POLISH_REV}`;
    link.dataset.ccgV130Polish="true";
    document.head.appendChild(link);
  }
  if(!document.querySelector('script[data-ccg-developer-changelog="true"]')){
    const script=document.createElement("script");
    script.src=`js/v10-12-developer-changelog.js?v=${CCG_CHANGELOG_REV}`;
    script.dataset.ccgDeveloperChangelog="true";
    script.async=false;
    document.body.appendChild(script);
  }
  if(!document.querySelector('script[data-ccg-admin-audio="true"]')){
    const script=document.createElement("script");
    script.src=`js/admin-audio-overrides.js?v=${CCG_ADMIN_AUDIO_REV}`;
    script.dataset.ccgAdminAudio="true";
    script.async=true;
    document.head.appendChild(script);
  }
})();

(()=>{
  let started=false;
  async function startEnhancements(){
    if(started||document.querySelector('script[data-ccg-lost-sizzler-v104="true"]'))return;
    started=true;

    /* Cache sanitation is best-effort and bounded. The enhancement queue waits
     * for it so old unversioned modules can never race a new release. */
    try{
      const guard=window.CCGLostSizzlerCacheGuard;
      if(guard?.ready)await Promise.race([guard.ready,new Promise(resolve=>setTimeout(resolve,3800))]);
    }catch(error){console.warn("[Lost Sizzler] cache guard unavailable; continuing with release-token URLs",error)}

    const queue=[
      [`js/v10-9-browser-stability.js?v=${CCG_BROWSER_STABILITY_REV}`,"ccgLostSizzlerBrowserStabilityV109"],
      [`js/v10-20-onboarding-safety.js?v=${CCG_ONBOARDING_SAFETY_REV}`,"ccgLostSizzlerOnboardingSafetyV120"],
      [`js/v10-20-onboarding-hardening.js?v=${CCG_ONBOARDING_HARDENING_REV}`,"ccgLostSizzlerOnboardingHardeningV120"],
      [`js/v10-23-tutorial-guidance.js?v=${CCG_TUTORIAL_GUIDANCE_REV}`,"ccgLostSizzlerTutorialGuidanceV123"],
      [`js/v10-19-dungeon-variety.js?v=${CCG_DUNGEON_VARIETY_REV}`,"ccgLostSizzlerDungeonVarietyV119"],
      [`js/lost-sizzler-playlist-audio.js?v=${CCG_PLAYLIST_AUDIO_REV}`,"ccgLostSizzlerPlaylistAudio"],
      [`js/v10-7-continuous-exploration.js?v=${CCG_RELEASE_REV}`,"ccgLostSizzlerContinuousExplorationV107"],
      [`js/v10-4-patch.js?v=${CCG_V104_PATCH_REV}`,"ccgLostSizzlerV104"],
      [`js/v10-4-death-cache.js?v=${CCG_RELEASE_REV}`,"ccgLostSizzlerCacheV104"],
      [`js/v10-4-final-ui.js?v=${CCG_RELEASE_REV}`,"ccgLostSizzlerFinalV104"],
      [`js/v10-4-collectible-effects.js?v=${CCG_RELEASE_REV}`,"ccgLostSizzlerEffectsV104"],
      [`js/v10-4-regression-fixes.js?v=${CCG_RELEASE_REV}`,"ccgLostSizzlerRegressionV104"],
      [`js/v10-13-mobile-combat-map.js?v=${CCG_MOBILE_COMBAT_MAP_REV}`,"ccgLostSizzlerMobileCombatMapV113"],
      [`js/v10-5-collectible-effects.js?v=${CCG_RELEASE_REV}`,"ccgLostSizzlerEffectsV105"],
      [`js/v10-5-rpg-balance.js?v=${CCG_RELEASE_REV}`,"ccgLostSizzlerRpgBalanceV105"],
      [`js/v10-6-runtime.js?v=${CCG_RELEASE_REV}`,"ccgLostSizzlerRuntimeV106"],
      [`js/v10-6-death-room-recovery.js?v=${CCG_RELEASE_REV}`,"ccgLostSizzlerDeathRoomRecoveryV106"],
      [`js/v10-6-ui-polish.js?v=${CCG_V106_UI_REV}`,"ccgLostSizzlerUiV106"],
      [`js/v10-6-inventory-hud-fix.js?v=${CCG_V106_HUD_REV}`,"ccgLostSizzlerInventoryHudV106"],
      [`js/v10-6-menu-runtime-fix.js?v=${CCG_RELEASE_REV}`,"ccgLostSizzlerMenuRuntimeV106"],
      [`js/v10-6-dossier-polish.js?v=${CCG_DOSSIER_REV}`,"ccgLostSizzlerDossierV106"],
      [`js/v10-5-online-effects.js?v=${CCG_RELEASE_REV}`,"ccgLostSizzlerOnlineEffectsV105"],
      [`js/v10-6-stalker-shop-balance.js?v=${CCG_RELEASE_REV}`,"ccgLostSizzlerStalkerShopBalanceV106"],
      [`js/v10-8-player-insights.js?v=${CCG_PLAYER_INSIGHTS_REV}`,"ccgLostSizzlerPlayerInsightsV108"],
      [`js/v10-10-depth-flow.js?v=${CCG_DEPTH_FLOW_REV}`,"ccgLostSizzlerDepthFlowV110"],
      [`js/v10-14-gilded-elf.js?v=${CCG_GILDED_ELF_REV}`,"ccgLostSizzlerGildedElfV114"],
      [`js/v10-15-rare-events.js?v=${CCG_RARE_EVENTS_REV}`,"ccgLostSizzlerRareEventsV115"],
      [`js/v10-15-rare-events-balance.js?v=${CCG_RARE_EVENTS_BALANCE_REV}`,"ccgLostSizzlerRareEventsBalanceV115"],
      [`js/v10-16-voice-director.js?v=${CCG_VOICE_DIRECTOR_REV}`,"ccgLostSizzlerVoiceDirectorV116"],
      [`js/v10-17-voice-expansion.js?v=${CCG_VOICE_EXPANSION_REV}`,"ccgLostSizzlerVoiceExpansionV117"],
      [`js/v10-18-expansion-changelog.js?v=${CCG_EXPANSION_CHANGELOG_REV}`,"ccgLostSizzlerExpansionChangelogV118"],
      [`js/v10-18-input-ui-bugfixes.js?v=${CCG_INPUT_UI_FIX_REV}`,"ccgLostSizzlerInputUiBugfixesV118"],
      [`js/v10-21-environmental-polish.js?v=${CCG_ENVIRONMENTAL_POLISH_REV}`,"ccgLostSizzlerEnvironmentalPolishV121"],
      [`js/v10-24-mobile-ergonomics.js?v=${CCG_MOBILE_ERGONOMICS_REV}`,"ccgLostSizzlerMobileErgonomicsV124"],
      [`js/v10-25-melee-ammo-balance.js?v=${CCG_MELEE_AMMO_REV}`,"ccgLostSizzlerMeleeAmmoV125"],
      [`js/v10-26-ammo-budget.js?v=${CCG_AMMO_BUDGET_REV}`,"ccgLostSizzlerAmmoBudgetV126"],
      [`js/v10-29-achievements.js?v=${CCG_ACHIEVEMENTS_REV}`,"ccgLostSizzlerAchievementsV129"],
      [`js/v10-30-polish.js?v=${CCG_POLISH_REV}`,"ccgLostSizzlerPolishV130"],
      [`js/v10-31-multiplayer-sync.js?v=${CCG_MULTIPLAYER_SYNC_REV}`,"ccgLostSizzlerMultiplayerSyncV131"],
      [`js/horde-survivor.js?v=${CCG_HORDE_REV}`,"ccgLostSizzlerHordeRules"],
      [`js/horde-survivor-audio.js?v=${CCG_HORDE_REV}`,"ccgLostSizzlerHordeAudio"],
      [`js/sizzler-saboteurs.js?v=${CCG_SABOTEURS_REV}`,"ccgLostSizzlerSaboteursRules"],
      [`js/sizzler-saboteurs-audio.js?v=${CCG_SABOTEURS_REV}`,"ccgLostSizzlerSaboteursAudio"],
      [`js/v10-33-special-modes.js?v=${CCG_SPECIAL_MODES_REV}`,"ccgLostSizzlerSpecialModesV133"],
      [`js/v10-33-mode-polish.js?v=${CCG_MODE_POLISH_REV}`,"ccgLostSizzlerModePolishV133"],
      [`js/v10-35-quality.js?v=${CCG_QUALITY_V135_REV}`,"ccgLostSizzlerQualityV135"]
    ];
    const criticalFailures=[];
    const criticalPaths=new Set(["/arcade/lost-sizzler/js/v10-25-melee-ammo-balance.js","/arcade/lost-sizzler/js/v10-26-ammo-budget.js","/arcade/lost-sizzler/js/v10-29-achievements.js","/arcade/lost-sizzler/js/v10-30-polish.js","/arcade/lost-sizzler/js/v10-31-multiplayer-sync.js","/arcade/lost-sizzler/js/horde-survivor.js","/arcade/lost-sizzler/js/horde-survivor-audio.js","/arcade/lost-sizzler/js/sizzler-saboteurs.js","/arcade/lost-sizzler/js/sizzler-saboteurs-audio.js","/arcade/lost-sizzler/js/v10-33-special-modes.js","/arcade/lost-sizzler/js/v10-33-mode-polish.js","/arcade/lost-sizzler/js/v10-35-quality.js"]);

    /* Dynamic scripts with async=false execute in insertion order but may fetch
     * in parallel. This keeps the long-established module ownership order while
     * removing the serial network waterfall that could leave releaseReady=false
     * for 15+ seconds and strand an early New Solo Run click. */
    const loadEntry=([src,key])=>new Promise(resolve=>{
      const selector=`script[data-${key.replace(/[A-Z]/g,m=>`-${m.toLowerCase()}`)}="true"]`;
      const requestedPath=(()=>{try{return new URL(src,location.href).pathname}catch(_){return src.split("?")[0]}})();
      const alreadyLoaded=[...document.scripts].some(node=>{const raw=node.getAttribute("src");if(!raw)return false;try{return new URL(raw,location.href).pathname===requestedPath}catch(_){return raw.split("?")[0]===requestedPath}});
      if(document.querySelector(selector)||alreadyLoaded){resolve(true);return}
      const script=document.createElement("script");
      script.src=src;script.dataset[key]="true";script.async=false;
      let settled=false;
      const settle=ok=>{if(settled)return;settled=true;clearTimeout(timeout);resolve(ok)};
      const timeout=setTimeout(()=>{
        console.warn(`[Lost Sizzler] optional enhancement timed out: ${src}`);
        if(criticalPaths.has(requestedPath))criticalFailures.push(`${requestedPath} timed out`);
        settle(false);
      },5000);
      script.onload=()=>settle(true);
      script.onerror=()=>{
        console.warn(`[Lost Sizzler] optional enhancement failed to load: ${src}`);
        if(criticalPaths.has(requestedPath))criticalFailures.push(`${requestedPath} failed`);
        settle(false);
      };
      document.body.appendChild(script);
    });

    const loads=queue.map(loadEntry);
    Promise.all(loads).then(()=>{
      const runtimeErrors=window.CCGLostSizzlerCacheGuard?.runtimeErrors||[];
      for(const row of runtimeErrors)criticalFailures.push(`runtime error${row.source?` in ${row.source}`:""}: ${row.message}`);
      window.CCGLostSizzlerReleaseGate?.finish?.(criticalFailures);
    }).catch(error=>{
      criticalFailures.push(`release queue failure: ${String(error?.message||error)}`);
      window.CCGLostSizzlerReleaseGate?.finish?.(criticalFailures);
    });
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",startEnhancements,{once:true});
  else startEnhancements();
})();