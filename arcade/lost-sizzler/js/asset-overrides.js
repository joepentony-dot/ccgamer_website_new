/*
 * OWNER ASSET OVERRIDES
 * Replace any null value with a site-relative file path, or add paths to a
 * playlist array. Unchanged values continue to use the bundled defaults.
 * The full key/path catalogue is in assets/asset-manifest.json.
 */
window.CCG_ASSET_OVERRIDES={
  images:{
    logo:null,
    visuals:{
      playerSheet:null,
      enemyWarriorSheet:null,
      enemySoldierSheet:null,
      enemyArcherSheet:null,
      enemyMageSheet:null,
      chestSheet:null,
      chestFrame0:null,
      chestFrame1:null,
      chestFrame2:null,
      spikeTrapFrame0:null,
      spikeTrapFrame1:null,
      spikeTrapFrame2:null,
      spikeTrapFrame3:null,
      fireplaceFrame0:null,
      fireplaceFrame1:null,
      fireplaceFrame2:null,
      fireplaceFrame3:null,
      fireplaceFrame4:null,
      torchSconceFrame0:"assets/pixel/user-r118/wall-torch-0.png",
      torchSconceFrame1:"assets/pixel/user-r118/wall-torch-1.png",
      torchSconceFrame2:"assets/pixel/user-r118/wall-torch-2.png",
      torchSconceFrame3:"assets/pixel/user-r118/wall-torch-3.png",
      enemyAtlasA:null,
      enemyAtlasB:null,
      environmentAtlas:null,
      switchSheet:null,
      switchSecretSheet:null,
      switchButtonUp:null,
      switchButtonDown:null,
      sigilSheet:null,
      environmentTileset:null,
      floorTile1:null,
      floorTile2:null,
      floorTile3:null,
      floorTile4:null,
      floorTile5:null,
      floorTile6:null,
      floorTile7:null,
      floorTile8:null,
      wallTileMid:null,
      wallTileHole1:null,
      wallTileHole2:null,
      doorLeafClosed:null,
      doorLeafOpen:null,
      doorFrameLeft:null,
      doorFrameRight:null,
      doorFrameTop:null,
      bladeHazard:null,
      hazardHole:null,
      propCrate:null,
      propBarrel:null,
      propBookcase:null,
      propConsole:null,
      r118PumpkinDude:"assets/pixel/user-r118/pumpkin-dude.png",
      r118PlagueDoc:"assets/pixel/user-r118/plague-doc.png",
      r118DarkKnight:"assets/pixel/user-r118/monster-dark-knight.png",
      r118Imp:"assets/pixel/user-r118/monster-imp.png",
      r118Necromancer:"assets/pixel/user-r118/monster-necromancer.png",
      r118BoxesStacked:"assets/pixel/user-r118/prop-boxes-stacked.png",
      r118Column:"assets/pixel/user-r118/prop-column.png",
      r118FloorStairs:"assets/pixel/user-r118/floor-stairs.png",
      r118SkeletonMove:"assets/pixel/user-r118/skeleton-move.png",
      r118VampireMove:"assets/pixel/user-r118/vampire-move.png"
    },
    namedEnemies:{"Peter Cortens":null,"Swanh8ter":null,"Syragar":null,"Parsnip Celery":null,"CPU":null,"Yoshi Yoshi":null,"CCG":null},
    items:{
      health:"assets/pixel/visual-overhaul/r85/pickup-health.svg",
      ammo:"assets/pixel/visual-overhaul/r85/pickup-ammo.svg",
      mana:"assets/pixel/visual-overhaul/r85/pickup-ammo.svg",
      potion:"assets/pixel/visual-overhaul/r85/pickup-health.svg",
      torch:null,teleport:null,banishment:null,inventorySlot:null,
      credits:"assets/pixel/visual-overhaul/r85/pickup-gold.svg",
      xpOrb:"assets/pixel/visual-overhaul/r85/pickup-xp.svg",
      armour:"assets/pixel/visual-overhaul/r85/pickup-armour.svg",
      key:null,bronze:null,exitSigil:null,
      weapon:"assets/pixel/visual-overhaul/r85/pickup-firearm-upgrade.svg",
      rapid:null,game:null,loot:null
    }
  },
  audio:{
    music:{
      /* R110 pins the currently approved uploaded production soundtrack into
       * the release itself. Admin hydration can still replace these arrays at
       * runtime, but live play no longer depends on a late catalogue fetch. */
      exploration:"https://lcslgxpgmttaexsorxik.supabase.co/storage/v1/object/public/ccg-arcade-assets/music/lostSizzlerExploration/1787411626645-5-exploration-01.mp3",
      danger:"https://lcslgxpgmttaexsorxik.supabase.co/storage/v1/object/public/ccg-arcade-assets/music/lostSizzlerDanger/1787411621547-0-combat-01.mp3",
      sanctuary:"https://lcslgxpgmttaexsorxik.supabase.co/storage/v1/object/public/ccg-arcade-assets/music/lostSizzlerSanctuary/1787411634411-12-sanctuary-01.mp3",
      named:"https://lcslgxpgmttaexsorxik.supabase.co/storage/v1/object/public/ccg-arcade-assets/music/lostSizzlerNamed/1787411632588-10-named-01.mp3",
      stalker:"https://lcslgxpgmttaexsorxik.supabase.co/storage/v1/object/public/ccg-arcade-assets/music/lostSizzlerStalker/1787411624060-2-count-loadula-01.mp3",
      playlists:{
        normal:[
          "https://lcslgxpgmttaexsorxik.supabase.co/storage/v1/object/public/ccg-arcade-assets/music/lostSizzlerExploration/1787411626645-5-exploration-01.mp3",
          "https://lcslgxpgmttaexsorxik.supabase.co/storage/v1/object/public/ccg-arcade-assets/music/lostSizzlerExploration/1787411628149-6-exploration-02.mp3",
          "https://lcslgxpgmttaexsorxik.supabase.co/storage/v1/object/public/ccg-arcade-assets/music/lostSizzlerExploration/1787411629062-7-exploration-03.mp3",
          "https://lcslgxpgmttaexsorxik.supabase.co/storage/v1/object/public/ccg-arcade-assets/music/lostSizzlerExploration/1787411630429-8-exploration-04.mp3",
          "https://lcslgxpgmttaexsorxik.supabase.co/storage/v1/object/public/ccg-arcade-assets/music/lostSizzlerExploration/1787411631439-9-exploration-05.mp3"
        ],
        danger:[
          "https://lcslgxpgmttaexsorxik.supabase.co/storage/v1/object/public/ccg-arcade-assets/music/lostSizzlerDanger/1787411621547-0-combat-01.mp3",
          "https://lcslgxpgmttaexsorxik.supabase.co/storage/v1/object/public/ccg-arcade-assets/music/lostSizzlerDanger/1787411622953-1-combat-03.mp3",
          "https://lcslgxpgmttaexsorxik.supabase.co/storage/v1/object/public/ccg-arcade-assets/music/lostSizzlerDanger/1787411636390-14-combat-02.mp3"
        ],
        sanctuary:[
          "https://lcslgxpgmttaexsorxik.supabase.co/storage/v1/object/public/ccg-arcade-assets/music/lostSizzlerSanctuary/1787411634411-12-sanctuary-01.mp3",
          "https://lcslgxpgmttaexsorxik.supabase.co/storage/v1/object/public/ccg-arcade-assets/music/lostSizzlerSanctuary/1787411635463-13-sanctuary-02.mp3"
        ],
        named:[
          "https://lcslgxpgmttaexsorxik.supabase.co/storage/v1/object/public/ccg-arcade-assets/music/lostSizzlerNamed/1787411632588-10-named-01.mp3",
          "https://lcslgxpgmttaexsorxik.supabase.co/storage/v1/object/public/ccg-arcade-assets/music/lostSizzlerNamed/1787411633643-11-named-02.mp3",
          "https://lcslgxpgmttaexsorxik.supabase.co/storage/v1/object/public/ccg-arcade-assets/music/lostSizzlerNamed/1787411637581-15-named-03.mp3"
        ],
        stalker:[
          "https://lcslgxpgmttaexsorxik.supabase.co/storage/v1/object/public/ccg-arcade-assets/music/lostSizzlerStalker/1787411624060-2-count-loadula-01.mp3",
          "https://lcslgxpgmttaexsorxik.supabase.co/storage/v1/object/public/ccg-arcade-assets/music/lostSizzlerStalker/1787411624977-3-count-loadula-02.mp3",
          "https://lcslgxpgmttaexsorxik.supabase.co/storage/v1/object/public/ccg-arcade-assets/music/lostSizzlerStalker/1787411625578-4-count-loadula-03.mp3"
        ]
      }
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
const CCG_V106_SIDEBAR_REV=CCG_RELEASE_REV;
const CCG_PLAYLIST_AUDIO_REV=`${CCG_RELEASE_REV}-music-20261006b`;
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
const CCG_ADMIN_AUDIO_REV=`${CCG_RELEASE_REV}-music-20261006b`;
const CCG_VOICE_DIRECTOR_REV=CCG_RELEASE_REV;
const CCG_VOICE_EXPANSION_REV=CCG_RELEASE_REV;
const CCG_EXPANSION_CHANGELOG_REV=CCG_RELEASE_REV;
const CCG_INPUT_UI_FIX_REV=CCG_RELEASE_REV;
const CCG_DUNGEON_VARIETY_REV=CCG_RELEASE_REV;
const CCG_ONBOARDING_SAFETY_REV=CCG_RELEASE_REV;
const CCG_ONBOARDING_HARDENING_REV=CCG_RELEASE_REV;
const CCG_TUTORIAL_GUIDANCE_REV=CCG_RELEASE_REV;
const CCG_ENVIRONMENTAL_POLISH_REV=CCG_RELEASE_REV;
const CCG_MOBILE_ERGONOMICS_REV=CCG_RELEASE_REV;
const CCG_MELEE_AMMO_REV=CCG_RELEASE_REV;
const CCG_AMMO_BUDGET_REV=CCG_RELEASE_REV;
const CCG_ACHIEVEMENTS_REV=CCG_RELEASE_REV;
const CCG_POLISH_REV=CCG_RELEASE_REV;
const CCG_QUALITY_V135_REV=CCG_RELEASE_REV;

/* A run must not begin while the ordered enhancement queue is still replacing
 * the base combat, onboarding and balance functions. Keep the first requested
 * launch and replay it once the complete release runtime is ready. */
(()=>{
  const launchIds=new Set(["solo-btn","tutorial-zone-btn","continue-save-btn"]);
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
    if(state.failed){console.error(`[Lost Sizzler] release gate failed: ${state.errors.join(" | ")}`);setBodyState("failed");setMenuStatus("DUNGEON STARTUP FAILED — REFRESH THE PAGE TO RETRY");resolveReady(false);return false}
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
    link.href=`css/v10-6-sidebar-layout-fix.css?v=${CCG_V106_SIDEBAR_REV}&ui=20261006-viewport`;
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
    link.href=`css/v10-18-input-ui-bugfixes.css?v=${CCG_INPUT_UI_FIX_REV}&ui=20261006-viewport`;
    link.dataset.ccgV118InputUiFixes="true";
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
    link.href=`css/v10-30-polish.css?v=${CCG_POLISH_REV}&ui=20261006-viewport`;
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
  /* R99: admin audio now loads inside the ordered enhancement queue below.
   * It is release-critical because uploaded soundtrack and recorded voice ownership
   * must never silently fall back to the base placeholder audio stack. */
})();

(()=>{
  let started=false;
  async function startEnhancements(){
    if(started)return;
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
      [`js/admin-audio-overrides.js?v=${CCG_ADMIN_AUDIO_REV}`,"ccgAdminAudio"],
      [`js/lost-sizzler-playlist-audio.js?v=${CCG_PLAYLIST_AUDIO_REV}`,"ccgLostSizzlerPlaylistAudio"],
      [`js/v10-7-continuous-exploration.js?v=${CCG_RELEASE_REV}`,"ccgLostSizzlerContinuousExplorationV107"],
      [`js/v10-4-death-cache.js?v=${CCG_RELEASE_REV}`,"ccgLostSizzlerCacheV104"],
      [`js/v10-4-final-ui.js?v=${CCG_RELEASE_REV}`,"ccgLostSizzlerFinalV104"],
      [`js/v10-4-collectible-effects.js?v=${CCG_RELEASE_REV}`,"ccgLostSizzlerEffectsV104"],
      [`js/v10-4-regression-fixes.js?v=${CCG_RELEASE_REV}`,"ccgLostSizzlerRegressionV104"],
      [`js/v10-13-mobile-combat-map.js?v=${CCG_MOBILE_COMBAT_MAP_REV}`,"ccgLostSizzlerMobileCombatMapV113"],
      [`js/v10-5-collectible-effects.js?v=${CCG_RELEASE_REV}`,"ccgLostSizzlerEffectsV105"],
      [`js/v10-5-rpg-balance.js?v=${CCG_RELEASE_REV}`,"ccgLostSizzlerRpgBalanceV105"],
      [`js/v10-6-death-room-recovery.js?v=${CCG_RELEASE_REV}`,"ccgLostSizzlerDeathRoomRecoveryV106"],
      [`js/v10-6-ui-polish.js?v=${CCG_V106_UI_REV}`,"ccgLostSizzlerUiV106"],
      [`js/v10-6-inventory-hud-fix.js?v=${CCG_V106_HUD_REV}&ui=20261006-viewport`,"ccgLostSizzlerInventoryHudV106"],
      [`js/v10-6-dossier-polish.js?v=${CCG_DOSSIER_REV}`,"ccgLostSizzlerDossierV106"],
      [`js/v10-6-stalker-shop-balance.js?v=${CCG_RELEASE_REV}`,"ccgLostSizzlerStalkerShopBalanceV106"],
      [`js/v10-8-player-insights.js?v=${CCG_PLAYER_INSIGHTS_REV}`,"ccgLostSizzlerPlayerInsightsV108"],
      [`js/v10-10-depth-flow.js?v=${CCG_DEPTH_FLOW_REV}`,"ccgLostSizzlerDepthFlowV110"],
      [`js/v10-14-gilded-elf.js?v=${CCG_GILDED_ELF_REV}`,"ccgLostSizzlerGildedElfV114"],
      [`js/v10-15-rare-events.js?v=${CCG_RARE_EVENTS_REV}`,"ccgLostSizzlerRareEventsV115"],
      [`js/v10-15-rare-events-balance.js?v=${CCG_RARE_EVENTS_BALANCE_REV}`,"ccgLostSizzlerRareEventsBalanceV115"],
      [`js/v10-42-r69-recorded-voices.js?v=${CCG_RELEASE_REV}`,"ccgLostSizzlerR69RecordedVoices"],
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
      [`js/v10-35-quality.js?v=${CCG_QUALITY_V135_REV}`,"ccgLostSizzlerQualityV135"],
      [`js/v10-42-bootstrap.js?v=${CCG_RELEASE_REV}`,"ccgLostSizzlerV142Bootstrap"]
    ];
    const criticalFailures=[];
    const criticalFiles=["admin-audio-overrides.js","lost-sizzler-playlist-audio.js","v10-42-r69-recorded-voices.js","v10-16-voice-director.js","v10-25-melee-ammo-balance.js","v10-26-ammo-budget.js","v10-29-achievements.js","v10-30-polish.js","v10-35-quality.js","v10-42-bootstrap.js"];
    const criticalPaths=new Set(["/arcade/lost-sizzler/","/arcade/c64-dungeon-carnage/"].flatMap(prefix=>criticalFiles.map(file=>`${prefix}js/${file}`)));

    /* Dynamic scripts with async=false execute in insertion order but may fetch
     * in parallel. This keeps the long-established module ownership order while
     * removing the serial startup waterfall that could leave releaseReady=false
     * for 15+ seconds and strand an early New Solo Run click. */
    const loadEntry=([src,key])=>new Promise(resolve=>{
      const selector=`script[data-${key.replace(/[A-Z]/g,m=>`-${m.toLowerCase()}`)}="true"]`;
      const requestedPath=(()=>{try{return new URL(src,location.href).pathname}catch(_){return src.split("?")[0]}})();
      const adminAudio=requestedPath.endsWith("/admin-audio-overrides.js");
      let settled=false,timeout=null;
      const settle=ok=>{if(settled)return;settled=true;if(timeout)clearTimeout(timeout);resolve(ok)};
      const finishLoaded=()=>{
        if(!adminAudio){settle(true);return}
        const ready=window.CCG_ADMIN_AUDIO_READY_PROMISE;
        if(!ready?.then){
          if(window.CCG_ADMIN_AUDIO_READY===true)settle(true);
          else{criticalFailures.push(`${requestedPath} did not expose audio readiness`);settle(false)}
          return;
        }
        ready.then(()=>{
          const admin=window.CCG_ADMIN_AUDIO||{},remoteSkipped=admin.remoteMediaSkipped===true;
          const requiredStates=["normal","danger","sanctuary","named","stalker"];
          const missingStates=requiredStates.filter(state=>!Array.isArray(admin.playlists?.[state])||admin.playlists[state].length<1);
          if(!remoteSkipped&&(admin.loadFailed===true||missingStates.length)){
            criticalFailures.push(`${requestedPath} did not hydrate the complete uploaded soundtrack${missingStates.length?`: ${missingStates.join(", ")}`:""}`);
            settle(false);
            return;
          }
          settle(true);
        }).catch(error=>{
          criticalFailures.push(`${requestedPath} audio readiness failed: ${String(error?.message||error)}`);
          settle(false);
        });
      };
      const alreadyLoaded=[...document.scripts].some(node=>{const raw=node.getAttribute("src");if(!raw)return false;try{return new URL(raw,location.href).pathname===requestedPath}catch(_){return raw.split("?")[0]===requestedPath}});
      timeout=setTimeout(()=>{
        console.warn(`[Lost Sizzler] optional enhancement timed out: ${src}`);
        if(criticalPaths.has(requestedPath))criticalFailures.push(`${requestedPath} timed out`);
        settle(false);
      },adminAudio?12000:5000);
      if(document.querySelector(selector)||alreadyLoaded){finishLoaded();return}
      const script=document.createElement("script");
      script.src=src;script.dataset[key]="true";script.async=false;
      script.onload=finishLoaded;
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