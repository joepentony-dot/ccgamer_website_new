/* The Lost Sizzler V10.5 — catalogue-wide themed collectible effects. */
(function(){
  "use strict";
  if(window.__CCG_LOST_SIZZLER_EFFECTS_V105__)return;
  window.__CCG_LOST_SIZZLER_EFFECTS_V105__=true;

  const HANDLED=new Set(["explorer_sight","map_ping","arcade_frenzy","casino_roll","combat_focus","wildcard","nimble","secret_scan","turbo","xp_boon","brain_boost","weapon_overdrive","athlete","tactical_freeze","ghostbuster_kit","bubble_shield","ninja_step","turbo_blaster","elite_bounty","frog_hop","underpants_mode","boulder_skin","colour_burst","score_feast","time_slow"]);
  const FALLBACK=[
    ["genre","action-adventure","explorer_sight",10000,{popup:"ADVENTURE VISION!",bonus:2.5}],
    ["genre","adventure","map_ping",0,{popup:"MAP CLUE FOUND!",rooms:3}],
    ["genre","arcade","arcade_frenzy",8000,{popup:"ARCADE FRENZY!",ammo:15}],
    ["genre","casino","casino_roll",0,{popup:"PLACE YOUR BET..."}],
    ["genre","fighting","combat_focus",10000,{popup:"FIGHT MODE!",dash_bonus:2}],
    ["genre","miscellaneous","wildcard",0,{popup:"ANYTHING COULD HAPPEN..."}],
    ["genre","platform","nimble",10000,{popup:"NIMBLE FEET!",move_scale:.76}],
    ["genre","puzzle","secret_scan",0,{popup:"SECRET SCAN!",doors:2}],
    ["genre","racing","turbo",10000,{popup:"TURBO!",move_scale:.58}],
    ["genre","role-playing","xp_boon",0,{popup:"RPG XP BOOST!",xp:300}],
    ["genre","quiz","brain_boost",9000,{popup:"BRAIN BOOST!",xp:150,sight:2}],
    ["genre","shooting","weapon_overdrive",10000,{popup:"WEAPON OVERDRIVE!",ammo:25}],
    ["genre","sports","athlete",10000,{popup:"SPORTS MODE!",move_scale:.82,heal:1}],
    ["genre","strategy","tactical_freeze",6500,{popup:"TACTICAL ADVANTAGE!",enemy_time_scale:.55}]
  ].map(([match_type,match_value,effect_type,duration_ms,config])=>({match_type,match_value,effect_type,duration_ms,config,enabled:true}));

  let meta=new Map(),rules=[...FALLBACK],ready=null;
  const norm=value=>String(value||"").toLowerCase().replace(/[’‘`]/g,"'").replace(/&/g,"and").replace(/[^a-z0-9]+/g," ").trim();
  const now=()=>performance.now();
  const locals=()=>{try{return typeof localPlayers==="function"?localPlayers():[typeof p1!=="undefined"?p1:null,typeof p2!=="undefined"?p2:null].filter(Boolean)}catch(_){return[]}};
  function state(player,key){return player?._v105Effects?.[key]||null}
  function active(player,key){return Number(state(player,key)?.until||0)>now()}
  function ensureBase(player){if(!player._v105Base)player._v105Base={moveMultiplier:Number(player.moveMultiplier||1),dashDamage:Number(player.dashDamage||0)}}
  function temp(player,key,duration,config={}){if(!player)return;ensureBase(player);player._v105Effects=player._v105Effects||{};player._v105Effects[key]={until:now()+Math.max(1,Number(duration||1)),config:{...config}}}
  function overhead(player,text,colour=P.gold){if(!player||!text)return;setTimeout(()=>{const label=String(text).toUpperCase();try{if(typeof floatPickupText==="function")floatPickupText(player,label,colour);else floatText(player.x,player.y,label,colour)}catch(_){}},420)}
  function toast(title,text,tone="cyan",duration=7200){try{showToast(title,text,tone,duration)}catch(_){}}

  async function loadData(){
    try{
      const response=await fetch("/games/games.json",{cache:"no-cache"});
      if(response.ok){const games=await response.json();if(Array.isArray(games))meta=new Map(games.map(game=>[norm(game?.title),{title:String(game?.title||""),genres:Array.isArray(game?.genres)?game.genres.map(norm):[]}]))}
    }catch(error){console.warn("V10.5 game theme metadata unavailable",error)}
    try{
      if(window.CCGLostSizzlerCollectibleEffects?.reload)await window.CCGLostSizzlerCollectibleEffects.reload();
      const loaded=window.CCGLostSizzlerCollectibleEffects?.getRules?.()||[];
      if(Array.isArray(loaded)&&loaded.some(rule=>HANDLED.has(rule?.effect_type)))rules=loaded;
    }catch(error){console.warn("V10.5 effect database unavailable; using built-in genre fallbacks",error)}
  }
  function ensureReady(){return ready||(ready=loadData())}

  function matchingRules(title){
    const key=norm(title),game=meta.get(key),allTitle=rules.filter(rule=>rule?.enabled!==false&&rule.match_type==="title"&&norm(rule.match_value)===key),titleHandled=allTitle.filter(rule=>HANDLED.has(rule.effect_type));
    if(titleHandled.length)return titleHandled;
    if(allTitle.length)return[];
    for(const genre of game?.genres||[]){const rule=rules.find(candidate=>candidate?.enabled!==false&&candidate.match_type==="genre"&&norm(candidate.match_value)===genre&&HANDLED.has(candidate.effect_type));if(rule)return[rule]}
    return[];
  }

  function revealRooms(player,count=3){
    if(!player||!world?.rooms)return 0;let set=explored.get(player.id);if(!set){set=new Set();explored.set(player.id,set)}
    const rooms=(world.rooms||[]).map(room=>({room,x:Math.floor(room.x+room.w/2),y:Math.floor(room.y+room.h/2),d:Math.hypot(Math.floor(room.x+room.w/2)-player.x,Math.floor(room.y+room.h/2)-player.y)})).filter(q=>q.room&&!set.has(`${q.x},${q.y}`)).sort((a,b)=>b.d-a.d);
    let n=0;for(const q of rooms.slice(0,Math.max(1,count))){set.add(`${q.x},${q.y}`);n++;try{ring(q.x,q.y,P.cyan,34)}catch(_){}}
    return n;
  }
  function scanSecrets(player,count=2){
    const doors=(host?.doors||[]).filter(door=>door?.type==="secret"&&!door.open).sort((a,b)=>Math.hypot(a.x-player.x,a.y-player.y)-Math.hypot(b.x-player.x,b.y-player.y));let n=0;
    for(const door of doors.slice(0,Math.max(1,count))){door.hidden=false;door.discovered=true;n++;let set=explored.get(player.id);if(!set){set=new Set();explored.set(player.id,set)}set.add(`${door.x},${door.y}`);try{ring(door.x,door.y,P.purple,36)}catch(_){}}
    if(n){host.revision=(host.revision||0)+1;try{broadcastWorld()}catch(_){}}
    return n;
  }
  function safeHop(player){
    if(!player||!world?.rooms)return false;const candidates=[];for(const room of world.rooms||[]){const x=Math.floor(room.x+room.w/2),y=Math.floor(room.y+room.h/2),d=Math.hypot(x-player.x,y-player.y);if(d<5||d>18||!W.walkable(world.map,x,y,host))continue;if((host.enemies||[]).some(e=>e.alive&&e.x===x&&e.y===y))continue;candidates.push({x,y,d})}if(!candidates.length)return false;const q=candidates[Math.floor(Math.random()*candidates.length)];try{burst(player.x,player.y,P.green,18,1.2)}catch(_){}player.x=q.x;player.y=q.y;player.rx=q.x;player.ry=q.y;try{burst(q.x,q.y,P.green,20,1.4);S.sfx("warp");broadcastWorld()}catch(_){}return true
  }
  function giveBanishment(player){
    const item={kind:"banishment",name:"Ghostbusters Banishment Flask",short:"BANISH"};
    if(PGR.inventoryCanAdd(player,item)&&PGR.inventoryAdd(player,item)){toast("GHOSTBUSTERS KIT","A Banishment Flask has been added to your inventory. Press B when a Death Stalker is in range.","purple",9000);return true}
    score+=1000;toast("GHOSTBUSTERS KIT — INVENTORY FULL","No room for the Flask, so the dungeon pays 1,000 score instead.","gold",8500);return false
  }
  function casinoRoll(player){const roll=Math.floor(Math.random()*5);if(roll===0){score+=1200;toast("CASINO WIN","Jackpot: +1,200 score.","gold")}else if(roll===1){score=Math.max(0,score-500);toast("CASINO LOSS","The house wins: -500 score.","red")}else if(roll===2){awardXP(player,5,"Casino collectible");toast("CASINO XP WIN","+5 XP.","cyan")}else if(roll===3){player.armor=Math.min(12,Number(player.armor||0)+3);toast("CASINO ARMOUR WIN","+3 armour.","green")}else{player.mana=Math.min(player.maxMana,player.mana+10);player.ammoFlashMs=C.player.ammoFlashMs;toast("CASINO AMMO WIN","+10 ammunition.","cyan")}}
  function colourBurst(player){const roll=Math.floor(Math.random()*3);if(roll===0){player.health=Math.min(player.maxHealth,player.health+2);player.hpBarMs=2800;toast("WIZBALL COLOUR — GREEN","+2 health.","green")}else if(roll===1){player.mana=Math.min(player.maxMana,player.mana+10);player.ammoFlashMs=C.player.ammoFlashMs;toast("WIZBALL COLOUR — CYAN","+10 ammunition.","cyan")}else{player.armor=Math.min(12,Number(player.armor||0)+2);toast("WIZBALL COLOUR — BLUE","+2 armour.","cyan")}}
  function wildcard(player){const roll=Math.floor(Math.random()*4);if(roll===0){awardXP(player,5,"Wildcard collectible");toast("WILDCARD — XP","+5 XP.","cyan")}else if(roll===1){score+=750;toast("WILDCARD — SCORE","+750 score.","gold")}else if(roll===2){player.rapidMs=Math.max(player.rapidMs||0,7000);toast("WILDCARD — RAPID FIRE","Seven seconds of rapid fire.","gold")}else{safeHop(player);toast("WILDCARD — WARP","You have been bounced somewhere else on the floor.","purple")}}

  function applyRule(rule,player,title){
    const config=rule?.config||{},duration=Math.max(0,Number(rule?.duration_ms||0)),popup=config.popup||rule.effect_type;
    switch(rule.effect_type){
      case"explorer_sight":temp(player,"explorer_sight",duration,config);toast(`${title} — EXPLORER VISION`,`Visibility increased for ${Math.ceil(duration/1000)} seconds.`,"cyan");break;
      case"map_ping":{const n=revealRooms(player,Number(config.rooms||3));toast(`${title} — MAP CLUE`,`${n} unexplored room${n===1?"":"s"} added to your explored map.`,"cyan");break}
      case"arcade_frenzy":{const ammo=Math.min(10,Math.max(1,Number(config.ammo||8)));player.rapidMs=Math.max(player.rapidMs||0,duration);player.mana=Math.min(player.maxMana,player.mana+ammo);player.ammoFlashMs=C.player.ammoFlashMs;toast(`${title} — ARCADE FRENZY`,`Rapid fire plus ${ammo} ammo for the pickup burst.`,"gold");break}
      case"casino_roll":casinoRoll(player);break;
      case"combat_focus":temp(player,"combat_focus",duration,config);toast(`${title} — FIGHT MODE`,`Dash/contact attack power increased for ${Math.ceil(duration/1000)} seconds.`,"red");break;
      case"wildcard":wildcard(player);break;
      case"nimble":temp(player,"nimble",duration,config);toast(`${title} — NIMBLE FEET`,`Movement quickened for ${Math.ceil(duration/1000)} seconds.`,"green");break;
      case"secret_scan":{const n=scanSecrets(player,Number(config.doors||2));toast(`${title} — SECRET SCAN`,n?`${n} hidden route${n===1?"":"s"} marked.`:"No unopened secret route remains on this floor.","purple");break}
      case"turbo":temp(player,"turbo",duration,config);toast(`${title} — TURBO`,`Movement accelerated for ${Math.ceil(duration/1000)} seconds.`,"cyan");break;
      case"xp_boon":{const xp=Math.min(5,Math.max(1,Number(config.xp||5)));awardXP(player,xp,`${title} RPG bonus`);toast(`${title} — XP BOOST`,`+${xp} XP, subject to the floor level cap.`,"cyan");break}
      case"brain_boost":{const xp=Math.min(5,Math.max(1,Number(config.xp||5)));awardXP(player,xp,`${title} knowledge bonus`);temp(player,"brain_boost",duration,config);toast(`${title} — BRAIN BOOST`,`+${xp} XP and sharper sight for ${Math.ceil(duration/1000)} seconds.`,"cyan");break}
      case"weapon_overdrive":{const ammo=Math.min(10,Math.max(1,Number(config.ammo||10)));player.rapidMs=Math.max(player.rapidMs||0,duration);player.mana=Math.min(player.maxMana,player.mana+ammo);player.ammoFlashMs=C.player.ammoFlashMs;toast(`${title} — WEAPON OVERDRIVE`,`Rapid fire and +${ammo} ammo.`,"gold");break}
      case"athlete":temp(player,"athlete",duration,config);player.health=Math.min(player.maxHealth,player.health+Number(config.heal||1));player.hpBarMs=2600;toast(`${title} — SPORTS MODE`,`Faster movement and +${Number(config.heal||1)} health.`,"green");break;
      case"tactical_freeze":temp(player,"enemy_slow",duration,config);toast(`${title} — TACTICAL ADVANTAGE`,`Enemy movement and attacks slowed for ${Math.ceil(duration/1000)} seconds.`,"purple");break;
      case"time_slow":temp(player,"enemy_slow",duration,config);toast(`${title} — TIME SLOWS`,`The dungeon slows around you for ${Math.ceil(duration/1000)} seconds.`,"purple");break;
      case"ghostbuster_kit":giveBanishment(player);break;
      case"bubble_shield":temp(player,"bubble_shield",duration,config);toast("BUBBLE BOBBLE — BUBBLE SHIELD",`Protected for ${Math.ceil(duration/1000)} seconds.`,"cyan");break;
      case"ninja_step":temp(player,"ninja_step",duration,config);toast(`${title} — NINJA STEP`,`Movement quickened for ${Math.ceil(duration/1000)} seconds.`,"purple");break;
      case"turbo_blaster":{const ammo=Math.min(10,Math.max(1,Number(config.ammo||10)));temp(player,"turbo_blaster",duration,config);player.rapidMs=Math.max(player.rapidMs||0,duration);player.mana=Math.min(player.maxMana,player.mana+ammo);player.ammoFlashMs=C.player.ammoFlashMs;toast(`${title} — TURBO BLASTER`,`Speed, rapid fire and +${ammo} ammo for ${Math.ceil(duration/1000)} seconds.`,"gold");break}
      case"elite_bounty":score+=Number(config.score||2000);toast("ELITE — BOUNTY",`+${Number(config.score||2000)} score.`,"gold");break;
      case"score_feast":score+=Number(config.score||1000);toast(`${title} — SCORE FEAST`,`+${Number(config.score||1000)} score.`,"gold");break;
      case"frog_hop":safeHop(player);toast("FROGGER — HOP!","A large frog-hop has moved you across the floor.","green");break;
      case"underpants_mode":{const saved=Math.max(0,Number(player.armor||0));temp(player,"underpants_mode",duration,{...config,savedArmor:saved});player.armor=0;toast(`${title} — ARMOUR GONE`,`Your armour vanishes for ${Math.ceil(duration/1000)} seconds, then returns.`,"red",9000);break}
      case"boulder_skin":player.armor=Math.min(12,Number(player.armor||0)+Number(config.armor||3));toast("BOULDER DASH — BOULDER TOUGH",`+${Number(config.armor||3)} armour.`,"cyan");break;
      case"colour_burst":colourBurst(player);break;
    }
    overhead(player,popup,rule.effect_type==="underpants_mode"?P.red:rule.effect_type==="bubble_shield"?P.cyan:P.gold);
    try{sync()}catch(_){}
  }

  async function trigger(title,player){if(!title||!player)return;await ensureReady().catch(()=>{});for(const rule of matchingRules(title))applyRule(rule,player,title)}
  if(typeof applyItem==="function"){const originalApplyItem=applyItem;applyItem=function applyItemV105ThemeEffects(item,player){const result=originalApplyItem.apply(this,arguments);if(item?.kind==="game"&&player)trigger(item.title,player);return result}}

  if(window.CCGProgression?.effectiveSight){const originalSight=window.CCGProgression.effectiveSight.bind(window.CCGProgression);window.CCGProgression.effectiveSight=function effectiveSightV105(player,runState){let radius=originalSight(player,runState),bonus=0;if(active(player,"explorer_sight"))bonus=Math.max(bonus,Number(state(player,"explorer_sight")?.config?.bonus||2.5));if(active(player,"brain_boost"))bonus=Math.max(bonus,Number(state(player,"brain_boost")?.config?.sight||2));return radius+bonus}}
  if(window.CCGAI?.stepEnemies){const originalStep=window.CCGAI.stepEnemies.bind(window.CCGAI);window.CCGAI.stepEnemies=function stepEnemiesV105ThemeSlow(hostState,map,players,dt,hooks,worldState){let scale=1;for(const player of locals())if(active(player,"enemy_slow"))scale=Math.min(scale,Number(state(player,"enemy_slow")?.config?.enemy_time_scale||.55));return originalStep(hostState,map,players,dt*scale,hooks,worldState)}}
  if(typeof drawPlayer==="function"){const originalDrawPlayer=drawPlayer;drawPlayer=function drawPlayerV105Shield(player,kind="p1"){const result=originalDrawPlayer.apply(this,arguments);if(player&&active(player,"bubble_shield")){const s=ws(player.rx,player.ry),cx=s.x+C.tile/2,cy=s.y+C.tile/2;ctx.save();ctx.strokeStyle=P.cyan;ctx.lineWidth=2;ctx.globalAlpha=.72;ctx.shadowColor=P.cyan;ctx.shadowBlur=14;ctx.beginPath();ctx.arc(cx,cy,20+Math.sin(performance.now()/120)*2,0,Math.PI*2);ctx.stroke();ctx.restore()}return result}}

  setInterval(()=>{
    const t=now();for(const player of locals()){
      const effects=player?._v105Effects||{};
      for(const [key,value] of Object.entries(effects))if(Number(value?.until||0)<=t){if(key==="underpants_mode"){const saved=Number(value?.config?.savedArmor||0);player.armor=Math.min(12,Number(player.armor||0)+saved)}delete effects[key]}
      const keys=Object.keys(effects);if(keys.length){ensureBase(player);let moveScale=1;if(active(player,"turbo"))moveScale=Math.min(moveScale,Number(state(player,"turbo")?.config?.move_scale||.58));if(active(player,"nimble"))moveScale=Math.min(moveScale,Number(state(player,"nimble")?.config?.move_scale||.76));if(active(player,"athlete"))moveScale=Math.min(moveScale,Number(state(player,"athlete")?.config?.move_scale||.82));if(active(player,"ninja_step"))moveScale=Math.min(moveScale,Number(state(player,"ninja_step")?.config?.move_scale||.65));if(active(player,"turbo_blaster"))moveScale=Math.min(moveScale,Number(state(player,"turbo_blaster")?.config?.move_scale||.68));player.moveMultiplier=player._v105Base.moveMultiplier*moveScale;let dashBonus=0;if(active(player,"combat_focus"))dashBonus=Math.max(dashBonus,Number(state(player,"combat_focus")?.config?.dash_bonus||2));player.dashDamage=player._v105Base.dashDamage+dashBonus;if(active(player,"bubble_shield"))player.invuln=Math.max(Number(player.invuln||0),140)}else if(player._v105Base){player.moveMultiplier=player._v105Base.moveMultiplier;player.dashDamage=player._v105Base.dashDamage;delete player._v105Base}
    }
  },80);

  window.CCGLostSizzlerEffectsV105={reload:async()=>{ready=null;await ensureReady();return rules.length},trigger,getRules:()=>rules.map(rule=>({...rule,config:{...(rule.config||{})}})),getGameTheme:title=>meta.get(norm(title))||null};
  ensureReady();
})();
