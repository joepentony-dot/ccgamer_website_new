/* The Lost Sizzler V10.29 — extensive local and account-backed achievement system. */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_ACHIEVEMENTS_V129__)return;
  window.__CCG_LOST_SIZZLER_ACHIEVEMENTS_V129__=true;

  const STORAGE_KEY="ccg-lost-sizzler-achievements-v1";
  const rows=[
    ["LS_FIRST_RUN","Dungeon Door Open","Start a Lost Sizzler run.","journey","bronze"],
    ["LS_TUTORIAL_GRADUATE","Training Archive Graduate","Complete the Tutorial.","journey","silver"],
    ["LS_FLOOR_1","Archive Cleared","Clear Floor 1.","journey","bronze"],
    ["LS_FLOOR_2","Workshop Cleared","Clear Floor 2.","journey","bronze"],
    ["LS_FLOOR_3","Reactor Cleared","Clear Floor 3.","journey","silver"],
    ["LS_FLOOR_4","Crypt Cleared","Clear Floor 4.","journey","silver"],
    ["LS_FLOOR_5","Citadel Cleared","Clear Floor 5.","journey","gold"],
    ["LS_CITADEL_PLATINUM","Lost Sizzler Platinum","Complete the full five-floor game and recover the Lost Sizzler.","platinum","platinum"],
    ["LS_SOLO_CHAMPION","Solo Sizzler","Complete the game in Solo mode.","journey","gold"],
    ["LS_SPLIT_CHAMPION","Sofa Sizzlers","Complete the game in local split-screen co-op.","journey","gold"],
    ["LS_ONLINE_CHAMPION","Network Heroes","Complete the game in online co-op.","journey","gold"],
    ["LS_WEEKLY_CHAMPION","Weekly Vault Victor","Complete the Weekly High-Score Vault.","journey","gold"],
    ["LS_SPEEDRUN_45","Fast Loader","Complete the game in under 45 minutes.","journey","gold"],
    ["LS_NO_DEATH_VICTORY","One Life, Five Floors","Complete the game without dying.","journey","gold"],
    ["LS_FIRST_KILL","First Blood","Defeat your first enemy in a run.","combat","bronze"],
    ["LS_KILLS_10","Ten Down","Defeat 10 enemies in one run.","combat","bronze"],
    ["LS_KILLS_25","Dungeon Sweeper","Defeat 25 enemies in one run.","combat","silver"],
    ["LS_KILLS_50","Fifty Freed","Defeat 50 enemies in one run.","combat","silver"],
    ["LS_KILLS_100","Centurion","Defeat 100 enemies in one run.","combat","gold"],
    ["LS_CHAMPION_1","Champion Tamer","Defeat a champion enemy.","combat","bronze"],
    ["LS_CHAMPIONS_5","Sizzler Hunter","Defeat 5 champions in one run.","combat","silver"],
    ["LS_CHAMPIONS_10","Champion of Champions","Defeat 10 champions in one run.","combat","gold"],
    ["LS_GUARDIAN_DOWN","Guardian Breaker","Defeat a floor Guardian.","combat","silver"],
    ["LS_SIGIL_WARDEN_DOWN","Warden Dismissed","Defeat a Sigil Warden.","combat","silver"],
    ["LS_NAMED_ENEMY_1","Name Remembered","Defeat a named enemy.","combat","bronze"],
    ["LS_NAMED_ENEMIES_5","Dossier Closer","Defeat 5 named enemies in one run.","combat","gold"],
    ["LS_SWORD_SWINGS_25","Blade Learner","Swing a melee weapon 25 times in one run.","combat","bronze"],
    ["LS_SWORD_SWINGS_100","SID Sabreur","Swing a melee weapon 100 times in one run.","combat","silver"],
    ["LS_SWORD_KILLS_10","Cutting Remarks","Defeat 10 enemies with melee attacks in one run.","combat","silver"],
    ["LS_GUN_KILLS_10","Straight Shooter","Defeat 10 enemies with firearms in one run.","combat","silver"],
    ["LS_HAZARD_KILL","Use the Scenery","Knock an enemy into a damaging floor hazard.","combat","silver"],
    ["LS_VORTEX_KILL","Into the Vortex","Knock an enemy into a rare vortex.","combat","gold"],
    ["LS_STALKER_BANISHED","No More Stalking","Permanently banish a Death Stalker.","combat","gold"],
    ["LS_BOUNTY_1","Bounty Claimed","Complete a floor Dungeon Bounty.","combat","silver"],
    ["LS_BOUNTIES_5","Bounty Grand Slam","Complete the Dungeon Bounty on all five floors in one run.","combat","gold"],
    ["LS_MAIN_KEY_1","Key Person","Collect a Main Vault Key.","objectives","bronze"],
    ["LS_MAIN_KEYS_ALL","Vault Route Open","Collect every required Main Vault Key on a floor.","objectives","silver"],
    ["LS_EXIT_SIGIL","Sigil Bearer","Recover an Exit Sigil.","objectives","silver"],
    ["LS_FLOOR_EXIT","Extraction Route","Reach an unlocked floor exit.","objectives","bronze"],
    ["LS_GENERATOR_1","Machine Breaker","Destroy a monster generator.","objectives","bronze"],
    ["LS_GENERATORS_ALL","Power Cut","Destroy every required generator on a floor.","objectives","silver"],
    ["LS_RESCUE_SCOUT","Nobody Left Behind","Rescue the trapped CCG Scout.","objectives","silver"],
    ["LS_OBJECTIVE_VARIETY","Mission Specialist","Complete three different main-objective types in one run.","objectives","gold"],
    ["LS_SECRET_1","Suspicious Wall","Find a secret route.","exploration","bronze"],
    ["LS_SECRETS_3","No Wall Is Safe","Find 3 secret routes in one run.","exploration","silver"],
    ["LS_SECRETS_10","Dungeon Surveyor","Find 10 secret routes in one run.","exploration","gold"],
    ["LS_MAP_75","Mostly Mapped","Map 75% of a floor.","exploration","bronze"],
    ["LS_MAP_100","Every Corner","Map 100% of a floor.","exploration","silver"],
    ["LS_ROOMS_25","Corridor Commuter","Enter 25 rooms in one run.","exploration","silver"],
    ["LS_CHEST_1","Lid Lifter","Open a chest.","exploration","bronze"],
    ["LS_CHESTS_10","Chest Inspector","Open 10 chests in one run.","exploration","silver"],
    ["LS_CHESTS_25","Vault Vacuum","Open 25 chests in one run.","exploration","gold"],
    ["LS_SHRINE_1","Risky Prayer","Use a shrine.","exploration","bronze"],
    ["LS_SHRINES_5","Dungeon Devotee","Use 5 shrines in one run.","exploration","silver"],
    ["LS_MEMORY_PUZZLE","Good Memory","Solve the Memory Tile Chamber.","exploration","silver"],
    ["LS_TORCH_PUZZLE","Four Flames","Solve the Torch Vault sequence.","exploration","silver"],
    ["LS_WEIGHT_BRIDGE","Travel Light","Cross and stabilise the rotten weight bridge.","exploration","silver"],
    ["LS_BOULDER_SURVIVOR","Rock and Run","Survive a Boulder Corridor.","exploration","silver"],
    ["LS_RARE_LOOT","Something Rare","Collect rare loot.","collection","bronze"],
    ["LS_ZZAP_LOOT","Zzap! 97%","Collect a Zzap! 97% item.","collection","gold"],
    ["LS_RARE_MELEE","Blade Upgrade","Find and equip a rare melee weapon.","collection","silver"],
    ["LS_GAME_PICKUP_1","Rescue Disk","Collect a C64 game pickup.","collection","bronze"],
    ["LS_GAME_PICKUPS_5","Five Saved Games","Collect 5 C64 game pickups in one run.","collection","silver"],
    ["LS_GAME_PICKUPS_10","Archive Haul","Collect 10 C64 game pickups in one run.","collection","gold"],
    ["LS_DEATH_CACHE","Back for More","Recover a death cache.","collection","silver"],
    ["LS_BURIED_CACHE","X Marks the Spot","Find a buried Treasure Map cache.","collection","silver"],
    ["LS_MIMIC","Chest Dentist","Defeat a Mimic.","rare_events","silver"],
    ["LS_GILDED_ELF","Caught in Gold","Catch the Gilded Elf.","rare_events","gold"],
    ["LS_TREASURE_BAT","Batting Average","Defeat a Treasure Bat before it escapes.","rare_events","silver"],
    ["LS_TAXMAN","Tax Rebate","Catch the Taxman.","rare_events","silver"],
    ["LS_ADVENTURER","Escort Service","Save a Lost Adventurer.","rare_events","silver"],
    ["LS_GOLDEN_ROOM","Golden Survivor","Survive a Golden Room.","rare_events","gold"],
    ["LS_MERCHANT","Window Shopper","Find a wandering merchant.","rare_events","bronze"],
    ["LS_POTION_USED","Medic!","Use a restoration potion.","mastery","bronze"],
    ["LS_TORCH_USED","Light Fantastic","Light a torch.","mastery","bronze"],
    ["LS_TELEPORT_USED","Now You See Me","Use a teleport spell.","mastery","bronze"],
    ["LS_BANISHMENT_USED","Flask Force","Use a Banishment Flask.","mastery","gold"],
    ["LS_LEVEL_5","Powering Up","Reach Level 5.","mastery","bronze"],
    ["LS_LEVEL_8","Power User","Reach Level 8.","mastery","silver"],
    ["LS_LEVEL_10","Double Figures","Reach Level 10.","mastery","gold"],
    ["LS_SCORE_5000","Score 5,000","Reach 5,000 score in one run.","mastery","bronze"],
    ["LS_SCORE_10000","Score 10,000","Reach 10,000 score in one run.","mastery","silver"],
    ["LS_SCORE_25000","Score 25,000","Reach 25,000 score in one run.","mastery","gold"],
    ["LS_SCORE_50000","Score 50,000","Reach 50,000 score in one run.","mastery","gold"],
    ["LS_ARMOUR_10","Tin Can Hero","Carry 10 armour points at once.","mastery","silver"],
    ["LS_ONE_HP_FLOOR","Skin of Your Teeth","Clear a floor while on exactly 1 HP.","mastery","gold"],
    ["LS_NO_DAMAGE_FLOOR","Untouched","Clear a floor without taking damage.","mastery","gold"],
    ["LS_NO_DEATH_FLOOR","Still Standing","Clear a floor without dying.","mastery","silver"],
    ["LS_EMPTY_AMMO_BLADE","Out of Ammo, Not Options","Swing your melee weapon after ammunition reaches zero.","mastery","bronze"]
  ];
  const catalog=Object.freeze(rows.map(([key,name,description,category,rarity],index)=>Object.freeze({key,name,description,category,rarity,sort:index+1})));
  const byKey=new Map(catalog.map(item=>[item.key,item]));
  const state={earned:readEarned(),run:null,profileQueue:new Set(),profileSynced:new Set(),syncing:false,panel:null,installed:false};

  function readEarned(){try{const value=JSON.parse(localStorage.getItem(STORAGE_KEY)||"{}");return value&&typeof value==="object"?value:{}}catch(_){return{}}}
  function saveEarned(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state.earned))}catch(_){}}
  function esc(value){return String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
  function runState(){return state.run||(state.run={floorDamage:0,floorDeaths:0,meleeSwings:0,meleeKills:0,gunKills:0,gamePickups:0,bounties:0,objectiveTypes:new Set()})}
  function earned(key){return Boolean(state.earned[key])}
  function award(key,{silent=false}={}){
    const item=byKey.get(key);if(!item||earned(key))return false;
    state.earned[key]={earnedAt:new Date().toISOString()};saveEarned();state.profileQueue.add(key);drainProfileQueue();renderPanel();
    if(!silent)try{showToast(item.rarity==="platinum"?"PLATINUM ACHIEVEMENT UNLOCKED":"ACHIEVEMENT UNLOCKED",`${item.name} — ${item.description}`,item.rarity==="platinum"?"cyan":"gold",item.rarity==="platinum"?11000:7600)}catch(_){}
    document.dispatchEvent(new CustomEvent("ccg:lost-sizzler-achievement",{detail:{...item}}));return true;
  }
  async function clientAndUser(){try{const client=await window.ccgSupabase?.getClient?.();if(!client)return null;const {data}=await client.auth.getSession();const user=data?.session?.user;if(!user)return null;return{client,user}}catch(_){return null}}
  async function drainProfileQueue(){
    if(state.syncing||!state.profileQueue.size)return;state.syncing=true;
    try{
      const auth=await clientAndUser();if(!auth)return;
      for(const key of [...state.profileQueue]){const {error}=await auth.client.rpc("award_lost_sizzler_achievement",{target_badge_key:key});if(error)break;state.profileQueue.delete(key);state.profileSynced.add(key)}
    }catch(_){}finally{state.syncing=false}
  }
  function queueAllEarned(){for(const key of Object.keys(state.earned))if(byKey.has(key)&&!state.profileSynced.has(key))state.profileQueue.add(key);drainProfileQueue()}

  function checkSnapshot(){
    if(typeof run==="undefined"||!run||typeof p1==="undefined"||!p1)return;const s=runState(),r=run.stats||{};
    if(r.kills>=1)award("LS_FIRST_KILL");if(r.kills>=10)award("LS_KILLS_10");if(r.kills>=25)award("LS_KILLS_25");if(r.kills>=50)award("LS_KILLS_50");if(r.kills>=100)award("LS_KILLS_100");
    if(r.champions>=1)award("LS_CHAMPION_1");if(r.champions>=5)award("LS_CHAMPIONS_5");if(r.champions>=10)award("LS_CHAMPIONS_10");if(r.namedDefeats>=1)award("LS_NAMED_ENEMY_1");if(r.namedDefeats>=5)award("LS_NAMED_ENEMIES_5");
    if(s.meleeSwings>=25)award("LS_SWORD_SWINGS_25");if(s.meleeSwings>=100)award("LS_SWORD_SWINGS_100");if(s.meleeKills>=10)award("LS_SWORD_KILLS_10");if(s.gunKills>=10)award("LS_GUN_KILLS_10");
    if(r.secrets>=1)award("LS_SECRET_1");if(r.secrets>=3)award("LS_SECRETS_3");if(r.secrets>=10)award("LS_SECRETS_10");if(r.rooms>=25)award("LS_ROOMS_25");if(r.chests>=1)award("LS_CHEST_1");if(r.chests>=10)award("LS_CHESTS_10");if(r.chests>=25)award("LS_CHESTS_25");if(r.shrines>=1)award("LS_SHRINE_1");if(r.shrines>=5)award("LS_SHRINES_5");
    if(r.deathCachesRecovered>=1)award("LS_DEATH_CACHE");if(s.gamePickups>=1)award("LS_GAME_PICKUP_1");if(s.gamePickups>=5)award("LS_GAME_PICKUPS_5");if(s.gamePickups>=10)award("LS_GAME_PICKUPS_10");
    if((p1.level||1)>=5)award("LS_LEVEL_5");if((p1.level||1)>=8)award("LS_LEVEL_8");if((p1.level||1)>=10)award("LS_LEVEL_10");if(Number(score||0)>=5000)award("LS_SCORE_5000");if(Number(score||0)>=10000)award("LS_SCORE_10000");if(Number(score||0)>=25000)award("LS_SCORE_25000");if(Number(score||0)>=50000)award("LS_SCORE_50000");if(Number(p1.armor||0)>=10)award("LS_ARMOUR_10");
    const exploredSet=typeof explored!=="undefined"?explored.get(p1.id):null,pct=exploredSet&&world?PGR.roomCompletion(exploredSet,world):0;if(pct>=.75)award("LS_MAP_75");if(pct>=1)award("LS_MAP_100");
    if(host?.keysCollected>0)award("LS_MAIN_KEY_1");if(host?.objective?.type==="keys"&&host.objective.complete)award("LS_MAIN_KEYS_ALL");if(host?.exitSigilCollected)award("LS_EXIT_SIGIL");
  }
  function floorCleared(){
    if(!run)return;const s=runState(),floor=Math.max(1,Number(run.floor||1));award(`LS_FLOOR_${floor}`);award("LS_FLOOR_EXIT");
    if(Number(p1?.health||0)===1)award("LS_ONE_HP_FLOOR");if(Number(run.stats?.damageTaken||0)===s.floorDamage)award("LS_NO_DAMAGE_FLOOR");if(Number(run.stats?.deaths||0)===s.floorDeaths)award("LS_NO_DEATH_FLOOR");
    if(run.objective?.type)s.objectiveTypes.add(run.objective.type);else if(host?.objective?.type)s.objectiveTypes.add(host.objective.type);if(s.objectiveTypes.size>=3)award("LS_OBJECTIVE_VARIETY");
    if(host?.objective?.type==="generators"&&host.objective.complete)award("LS_GENERATORS_ALL");
  }
  function runCompleted(){
    if(!run||Number(run.floor||0)<Number(C?.maxFloors||5)||run.dailyFailed||run.xpGameOver)return;award("LS_CITADEL_PLATINUM");
    if(playMode==="solo")award("LS_SOLO_CHAMPION");else if(playMode==="split")award("LS_SPLIT_CHAMPION");else if(playMode==="online")award("LS_ONLINE_CHAMPION");if(run.daily)award("LS_WEEKLY_CHAMPION");
    if(Number(run.elapsed||Infinity)<45*60*1000)award("LS_SPEEDRUN_45");if(Number(run.stats?.deaths||0)===0)award("LS_NO_DEATH_VICTORY");
  }
  function classifyToast(title,text){
    const value=`${title||""} ${text||""}`.toUpperCase(),s=runState();
    if(/TUTORIAL COMPLETE/.test(value))award("LS_TUTORIAL_GRADUATE");
    if(/MAIN VAULT KEY/.test(value)){award("LS_MAIN_KEY_1");if(host?.keysCollected>=C?.keyTarget)award("LS_MAIN_KEYS_ALL")}
    if(/EXIT SIGIL ACQUIRED/.test(value))award("LS_EXIT_SIGIL");if(/GENERATOR DESTROYED/.test(value))award("LS_GENERATOR_1");if(/SCOUT RESCUED|CCG SCOUT.*SANCTUARY/.test(value))award("LS_RESCUE_SCOUT");
    if(/MEMORY SEQUENCE SOLVED/.test(value))award("LS_MEMORY_PUZZLE");if(/TORCH VAULT OPEN/.test(value))award("LS_TORCH_PUZZLE");if(/BRIDGE STABILIZED/.test(value))award("LS_WEIGHT_BRIDGE");if(/BOULDER CORRIDOR SURVIVED/.test(value))award("LS_BOULDER_SURVIVOR");
    if(/BURIED CACHE FOUND/.test(value))award("LS_BURIED_CACHE");if(/MIMIC DEFEATED/.test(value))award("LS_MIMIC");if(/GILDED ELF CAUGHT|100 GOLD JACKPOT/.test(value))award("LS_GILDED_ELF");if(/TREASURE BAT DOWN/.test(value))award("LS_TREASURE_BAT");if(/TAXMAN CAUGHT/.test(value))award("LS_TAXMAN");if(/ADVENTURER RESCUED/.test(value))award("LS_ADVENTURER");if(/GOLDEN ROOM CLEARED|GOLDEN ROOM SURVIVED/.test(value))award("LS_GOLDEN_ROOM");if(/WANDERING MERCHANT/.test(value))award("LS_MERCHANT");
    if(/DEATH STALKER.*BANISHED|BANISHMENT COMPLETE/.test(value))award("LS_STALKER_BANISHED");if(/DUNGEON BOUNTY COMPLETE/.test(value)){s.bounties++;award("LS_BOUNTY_1");if(s.bounties>=5)award("LS_BOUNTIES_5")}
    if(/VORTEX KILL/.test(value)){award("LS_HAZARD_KILL");award("LS_VORTEX_KILL")}
  }
  function noteItem(item){
    if(!item)return;const s=runState();if(item.kind==="game"){s.gamePickups++;award("LS_GAME_PICKUP_1")}
    if(item.kind==="meleeWeapon")award("LS_RARE_MELEE");const rarity=String(item.loot?.rarity||item.rarity||"").toUpperCase();if(rarity&&rarity!=="COMMON"){award("LS_RARE_LOOT");if(rarity.includes("ZZAP! 97%"))award("LS_ZZAP_LOOT")}
  }

  function installHooks(){
    if(state.installed)return;state.installed=true;
    if(typeof beginRun==="function"){const original=beginRun;beginRun=function beginRunV129Achievements(){state.run={floorDamage:0,floorDeaths:0,meleeSwings:0,meleeKills:0,gunKills:0,gamePickups:0,bounties:0,objectiveTypes:new Set()};const result=original.apply(this,arguments);award("LS_FIRST_RUN");return result}}
    if(typeof startWorld==="function"){const original=startWorld;startWorld=function startWorldV129Achievements(){const result=original.apply(this,arguments),s=runState();s.floorDamage=Number(run?.stats?.damageTaken||0);s.floorDeaths=Number(run?.stats?.deaths||0);return result}}
    if(typeof floorComplete==="function"){const original=floorComplete;floorComplete=function floorCompleteV129Achievements(){floorCleared();return original.apply(this,arguments)}}
    if(typeof endRun==="function"){const original=endRun;endRun=function endRunV129Achievements(){const result=original.apply(this,arguments);runCompleted();return result}}
    if(typeof firePlayer==="function"){const original=firePlayer;firePlayer=function firePlayerV129Achievements(player,direction){const s=runState(),before=Number(player?._meleeSwingAt||0),melee=!window.CCGLostSizzlerMeleeAmmoV125?.hasGun?.(player)||Number(player?.mana||0)<=0;if(player){player._lsAttackKind=melee?"melee":"gun";player._lsAttackAt=performance.now()}const result=original.apply(this,arguments);if(melee&&Number(player?._meleeSwingAt||0)>before){s.meleeSwings++;if(Number(player?.mana||0)<=0)award("LS_EMPTY_AMMO_BLADE")}return result}}
    if(typeof damageEnemy==="function"){const original=damageEnemy;damageEnemy=function damageEnemyV129Achievements(enemy,power,element,attacker){const was=Boolean(enemy?.alive),result=original.apply(this,arguments);if(was&&enemy&&!enemy.alive){const s=runState(),kind=performance.now()-Number(attacker?._lsAttackAt||0)<5000?attacker?._lsAttackKind:"";if(kind==="melee")s.meleeKills++;if(kind==="gun")s.gunKills++;if(enemy.champion)award("LS_CHAMPION_1");if(enemy.guardian&&!enemy.sigilDefender)award("LS_GUARDIAN_DOWN");if(enemy.exitWarden)award("LS_SIGIL_WARDEN_DOWN");if(enemy.follower||enemy.championName)award("LS_NAMED_ENEMY_1");if(enemy._ccgHazardResolving)award("LS_HAZARD_KILL");if(enemy._ccgVortexKill)award("LS_VORTEX_KILL")}return result}}
    if(typeof onCollected==="function"){const original=onCollected;onCollected=function onCollectedV129Achievements(event){noteItem(event?.item);return original.apply(this,arguments)}}
    for(const [name,key] of [["usePotion","LS_POTION_USED"],["useUtility","LS_TORCH_USED"],["useTeleport","LS_TELEPORT_USED"],["useBanishment","LS_BANISHMENT_USED"]])if(typeof window[name]==="function"){const original=window[name];window[name]=function(){const before=arguments[0]&&JSON.stringify(arguments[0]);const result=original.apply(this,arguments);if(result!==false&&before!==JSON.stringify(arguments[0]))award(key);return result}}
    if(typeof showToast==="function"){const original=showToast;showToast=function showToastV129Achievements(title,text){const result=original.apply(this,arguments);try{classifyToast(title,text)}catch(_){}return result}}
  }

  function categoryName(value){return({journey:"Journey",combat:"Combat",objectives:"Objectives",exploration:"Exploration",collection:"Collection",rare_events:"Rare Events",mastery:"Mastery",platinum:"Platinum"})[value]||"Achievement"}
  function ensureUi(){
    if(state.panel?.isConnected)return;const secondary=document.querySelector("#menu .secondary-menu"),system=document.querySelector(".system-buttons"),area=document.querySelector(".game-area")||document.body;if(!secondary||!area)return;
    const button=document.createElement("button");button.id="lost-sizzler-achievements-btn";button.type="button";button.textContent="Achievements";secondary.insertBefore(button,secondary.firstChild);
    const quick=button.cloneNode(true);quick.id="lost-sizzler-achievements-quick";quick.className="sound-toggle";quick.textContent="BADGES";system?.appendChild(quick);
    const panel=document.createElement("div");panel.id="lost-sizzler-achievements";panel.className="overlay hidden";panel.innerHTML='<div class="panel ls-achievements-panel"><div class="ls-achievements-head"><div><span>THE LOST SIZZLER</span><h2>Achievements</h2><p id="ls-achievements-progress"></p></div><button type="button" data-achievements-close>Close</button></div><div class="ls-achievements-grid" id="ls-achievements-grid"></div></div>';area.appendChild(panel);state.panel=panel;
    const open=()=>{renderPanel();panel.classList.remove("hidden");try{input?.clear?.()}catch(_){}};const close=()=>panel.classList.add("hidden");button.addEventListener("click",open);quick.addEventListener("click",open);panel.querySelector("[data-achievements-close]").addEventListener("click",close);panel.addEventListener("click",event=>{if(event.target===panel)close()});renderPanel();
  }
  function renderPanel(){
    const grid=document.getElementById("ls-achievements-grid"),progress=document.getElementById("ls-achievements-progress");if(!grid||!progress)return;const total=catalog.length,count=catalog.filter(item=>earned(item.key)).length;progress.textContent=`${count} / ${total} unlocked${count===total?" — complete collection!":""}`;
    grid.innerHTML=catalog.map(item=>{const unlocked=earned(item.key),date=state.earned[item.key]?.earnedAt;return`<article class="ls-achievement ${unlocked?"earned":"locked"} ${item.rarity}"><span class="ls-achievement-mark">${item.rarity==="platinum"?"★":unlocked?"✓":"◆"}</span><div><small>${esc(categoryName(item.category))} · ${esc(item.rarity)}</small><h3>${esc(item.name)}</h3><p>${esc(item.description)}</p><em>${unlocked?`Earned ${esc(new Date(date).toLocaleDateString("en-GB"))}`:"Not earned"}</em></div></article>`}).join("");
  }
  const style=document.createElement("style");style.id="lost-sizzler-achievements-style";style.textContent=`
    .ls-achievements-panel{width:min(1040px,96vw)!important;max-height:92dvh;overflow:auto}.ls-achievements-head{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;position:sticky;top:0;z-index:2;padding:4px 0 14px;background:#090611}.ls-achievements-head span{color:#6cecff;font-size:.72rem;letter-spacing:.16em;font-weight:900}.ls-achievements-head h2{margin:4px 0}.ls-achievements-head p{margin:0;color:#ffd85a}.ls-achievements-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(265px,1fr));gap:9px}.ls-achievement{display:grid;grid-template-columns:42px 1fr;gap:10px;padding:11px;border:1px solid rgba(255,255,255,.13);background:rgba(8,6,14,.78);text-align:left}.ls-achievement.locked{opacity:.52}.ls-achievement.earned{border-color:rgba(255,216,90,.55)}.ls-achievement.platinum{border-color:#b9f5ff;background:linear-gradient(135deg,rgba(108,236,255,.18),rgba(255,255,255,.07));box-shadow:0 0 22px rgba(108,236,255,.16)}.ls-achievement-mark{display:grid;place-items:center;width:38px;height:38px;border:1px solid currentColor;border-radius:50%;color:#ffd85a;font-size:20px}.ls-achievement.platinum .ls-achievement-mark{color:#dffcff}.ls-achievement small{color:#6cecff;text-transform:uppercase}.ls-achievement h3{margin:3px 0;color:#fff;font-size:.95rem}.ls-achievement p{margin:0;color:#c9c1d2;font-size:.78rem;line-height:1.35}.ls-achievement em{display:block;margin-top:6px;color:#72ff9b;font-size:.68rem;font-style:normal}@media(max-width:620px){.ls-achievements-grid{grid-template-columns:1fr}.ls-achievements-head{position:static}}
  `;document.head.appendChild(style);

  installHooks();ensureUi();const timer=setInterval(()=>{ensureUi();checkSnapshot();queueAllEarned()},600);window.addEventListener("pagehide",()=>clearInterval(timer),{once:true});
  window.CCGLostSizzlerAchievementsV129={catalog,state,award,earned,renderPanel,checkSnapshot};
})();
