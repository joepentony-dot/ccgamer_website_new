/* The Lost Sizzler V10.26 — enemy-budgeted firearm ammunition with a 50% miss allowance. */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_AMMO_BUDGET_V126__)return;
  window.__CCG_LOST_SIZZLER_AMMO_BUDGET_V126__=true;

  const BASE_MAX_AMMO=120;
  const FIRST_GUN_ROUNDS=24;
  const RESPAWN_ROUNDS=12;
  const ASSUMED_DAMAGE_PER_HIT=1.8;
  const ASSUMED_ACCURACY=.50;
  const SAFETY_RESERVE=1.10;
  const PACK_ROUNDS_BY_FLOOR=[36,38,40,42,44];
  const MIN_PACKS_BY_FLOOR=[8,9,10,11,12];
  const MAX_PACKS_BY_FLOOR=[12,14,15,17,18];
  const state={lastBudget:null,installed:{players:false,world:false,items:false,survival:false}};

  const hash32=value=>{let h=2166136261>>>0;for(const ch of String(value||"")){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0};
  const floorNumber=()=>Math.max(1,Math.min(5,Number(run?.floor||1)));
  const difficulty=()=>{try{return PGR.difficulty(run)||{enemyHp:1,ammo:1}}catch(_){return{enemyHp:1,ammo:1}}};
  const hasGun=p=>Boolean(p?.firearmUnlocked&&p?.weapon);

  function basePackRounds(floor=floorNumber()){
    return PACK_ROUNDS_BY_FLOOR[Math.max(0,Math.min(PACK_ROUNDS_BY_FLOOR.length-1,floor-1))];
  }
  function packRounds(floor=floorNumber(),player=null){
    const scavenger=Math.max(0,Number(player?.scavenger||0));
    return Math.max(12,Math.round(basePackRounds(floor)*Number(difficulty().ammo||1)*(1+scavenger)));
  }

  function enemyDurability(enemy){
    if(!enemy?.alive||enemy.deathStalker||enemy.voidStalker||enemy.gildedElf||enemy.treasureGoblin)return 0;
    let value=Math.max(1,Number(enemy.hp||enemy.maxHp||1))+Math.max(0,Number(enemy.armor||0));
    /* Named enemies can restore health once. Count that healing in the ammo budget
     * instead of pretending their displayed starting HP is the entire fight. */
    if(enemy.follower&&enemy.restorePotion!==false)value+=Math.max(3,Number(enemy.namedPotionHeal||3));
    return value;
  }

  function futureGeneratorDurability(){
    const alive=(host?.generators||[]).filter(g=>g?.alive!==false).length;
    if(!alive)return 0;
    const floor=floorNumber(),hpFloor=1+(floor-1)*.12,diff=difficulty();
    const averageSpawnHp=Math.max(2,Math.ceil(3*hpFloor*Number(diff.enemyHp||1)));
    const spawnCap=Math.max(0,Number(C?.dungeon?.generatorSpawnCap||3));
    return alive*spawnCap*averageSpawnHp;
  }

  function buildBudget(){
    const floor=floorNumber();
    const enemyRows=(host?.enemies||[]).filter(e=>enemyDurability(e)>0);
    const currentDurability=enemyRows.reduce((sum,e)=>sum+enemyDurability(e),0);
    const generatorDurability=futureGeneratorDurability();
    const totalDurability=currentDurability+generatorDurability;
    /* At 50% accuracy every successful hit costs two trigger pulls on average.
     * 1.8 damage/hit is deliberately conservative: common guns can be weaker,
     * while later rarity, spread, shock and piercing weapons can be much stronger. */
    const roundsNeeded=Math.ceil((totalDurability/ASSUMED_DAMAGE_PER_HIT)/ASSUMED_ACCURACY*SAFETY_RESERVE);
    const perPack=Math.max(1,packRounds(floor));
    const minPacks=MIN_PACKS_BY_FLOOR[floor-1],maxPacks=MAX_PACKS_BY_FLOOR[floor-1];
    const calculated=Math.ceil(Math.max(0,roundsNeeded-FIRST_GUN_ROUNDS)/perPack);
    const targetPacks=Math.max(minPacks,Math.min(maxPacks,calculated));
    return{floor,enemyCount:enemyRows.length,currentDurability,generatorDurability,totalDurability,roundsNeeded,firstGunRounds:FIRST_GUN_ROUNDS,packRounds:perPack,targetPacks,totalPlannedRounds:FIRST_GUN_ROUNDS+targetPacks*perPack,accuracyAllowance:ASSUMED_ACCURACY,assumedDamagePerHit:ASSUMED_DAMAGE_PER_HIT};
  }

  function occupied(x,y){
    if(world?.map?.[y]?.[x]!==0)return true;
    if((host?.doors||[]).some(q=>Math.abs(q.x-x)+Math.abs(q.y-y)<=2))return true;
    if((host?.items||[]).some(q=>q.active&&q.x===x&&q.y===y))return true;
    if((host?.enemies||[]).some(q=>q.alive&&q.x===x&&q.y===y))return true;
    if((host?.blockingDecor||[]).some(q=>q.x===x&&q.y===y))return true;
    if((host?.traps||[]).some(q=>q.x===x&&q.y===y))return true;
    if((host?.hazardRooms||[]).some(h=>(h.cells||[]).some(q=>q.x===x&&q.y===y)))return true;
    return false;
  }

  function candidateAmmoCells(key){
    if(!world?.rooms)return[];
    const rooms=world.rooms.filter(r=>r&&r.id!==world.startRoomId&&!r.optional&&!r.sanctuary&&!r.sigilRoom&&!r.dedicatedHazard)
      .sort((a,b)=>hash32(`${key}|ROOM|${a.id}`)-hash32(`${key}|ROOM|${b.id}`));
    const cells=[];
    for(const room of rooms){
      const local=[];
      for(let y=room.y+1;y<room.y+room.h;y++)for(let x=room.x+1;x<room.x+room.w;x++)if(!occupied(x,y))local.push({x,y,roomId:room.id});
      local.sort((a,b)=>hash32(`${key}|CELL|${a.x},${a.y}`)-hash32(`${key}|CELL|${b.x},${b.y}`));
      /* Spread supplies across rooms instead of dumping several packs together. */
      if(local[0])cells.push(local[0]);
    }
    return cells;
  }

  function ensureAmmoPacks(){
    if(!host?.items||!run||!world)return null;
    const budget=buildBudget();
    const existing=host.items.filter(i=>i?.active&&(i.kind==="ammo"||i.kind==="mana"));
    if(existing.length>budget.targetPacks){
      const ranked=[...existing].sort((a,b)=>hash32(`${run.seed}|F${budget.floor}|KEEP|${a.id}`)-hash32(`${run.seed}|F${budget.floor}|KEEP|${b.id}`));
      const keep=new Set(ranked.slice(0,budget.targetPacks).map(i=>i.id));
      host.items=host.items.filter(i=>!(i?.active&&(i.kind==="ammo"||i.kind==="mana"))||keep.has(i.id));
    }
    let count=host.items.filter(i=>i?.active&&(i.kind==="ammo"||i.kind==="mana")).length;
    const cells=candidateAmmoCells(`${run.seed}|F${budget.floor}|V126-AMMO`);
    for(let i=0;count<budget.targetPacks&&i<cells.length;i++){
      const q=cells[i];
      if(occupied(q.x,q.y))continue;
      host.items.push({id:`v126-ammo-${budget.floor}-${i}-${hash32(`${run.seed}|${q.x},${q.y}`).toString(36)}`,x:q.x,y:q.y,roomId:q.roomId,kind:"ammo",active:true,title:`AMMO PACK · ${budget.packRounds} ROUNDS`,v126Ammo:true});
      count++;
    }
    budget.actualPacks=count;
    budget.totalPlannedRounds=FIRST_GUN_ROUNDS+count*budget.packRounds;
    state.lastBudget=budget;
    host.ammoBudget={...budget};
    host.revision=(host.revision||0)+1;
    return budget;
  }

  function normalisePlayer(p){
    if(!p)return;
    p.maxMana=Math.max(BASE_MAX_AMMO,Math.min(Number(p.maxMana||BASE_MAX_AMMO),180));
    p.mana=Math.max(0,Math.min(Number(p.mana||0),p.maxMana));
  }

  function installPlayers(){
    if(state.installed.players||typeof makePlayer!=="function"||typeof preservePlayer!=="function")return;
    const oldMake=makePlayer,oldPreserve=preservePlayer;
    makePlayer=function makePlayerV126(id,name,x,y){const p=oldMake(id,name,x,y);p.maxMana=BASE_MAX_AMMO;p.mana=0;return p};
    preservePlayer=function preservePlayerV126(old,x,y){const p=oldPreserve(old,x,y);normalisePlayer(p);return p};
    state.installed.players=true;
  }

  function installWorld(){
    if(state.installed.world||typeof startWorld!=="function")return;
    const oldStart=startWorld;
    startWorld=function startWorldV126(...args){
      const result=oldStart.apply(this,args);
      try{for(const p of typeof localPlayers==="function"?localPlayers():[])normalisePlayer(p);ensureAmmoPacks()}catch(error){console.warn("[Lost Sizzler V10.26] ammo budget failed",error)}
      return result;
    };
    state.installed.world=true;
  }

  function installItems(){
    if(state.installed.items||typeof equipWeapon!=="function"||typeof applyItem!=="function"||typeof applyLoot!=="function")return;
    const oldEquip=equipWeapon,oldItem=applyItem,oldLoot=applyLoot;
    equipWeapon=function equipWeaponV126(p,weapon){
      const first=!hasGun(p);const before=Math.max(0,Number(p?.mana||0));const result=oldEquip(p,weapon);normalisePlayer(p);
      if(first){p.mana=Math.max(before,Math.min(p.maxMana,FIRST_GUN_ROUNDS));p.ammoFlashMs=C.player.ammoFlashMs;try{showToast("FIREARM READY",`${weapon.displayName||weapon.name} begins with ${p.mana} rounds. The floor's ammunition supply is balanced for roughly 50% shot accuracy; at zero ammo ATTACK returns to melee automatically.`,"gold",9000)}catch(_){}}
      return result;
    };
    applyItem=function applyItemV126(i,p){
      if(i?.kind!=="ammo"&&i?.kind!=="mana")return oldItem(i,p);
      const n=packRounds(floorNumber(),p);normalisePlayer(p);p.mana=Math.min(p.maxMana,p.mana+n);p.ammoFlashMs=C.player.ammoFlashMs;p.emergencyRechargeMs=0;
      try{S.sfx("pickup");showToast("AMMO PACK",`${p===p2?"P2":"P1"} gains ${n} rounds.`,"cyan");awardXP(p,typeof pickupXP==="function"?pickupXP(i.kind):3,"AMMO PACK collected");updateQuests();PGR.checkAchievements(run,p)}catch(_){}
      return true;
    };
    applyLoot=function applyLootV126(loot,p){
      if(loot?.kind!=="ammo")return oldLoot(loot,p);
      const rarityIndex=Math.max(0,["COMMON","UNCOMMON","SIZZLER","GOLD MEDAL","ZZAP! 97%"].indexOf(loot.rarity));
      const n=Math.round(packRounds(floorNumber(),p)*(1.15+rarityIndex*.12));normalisePlayer(p);p.mana=Math.min(p.maxMana,p.mana+n);p.ammoFlashMs=C.player.ammoFlashMs;p.emergencyRechargeMs=0;
      try{S.sfx("pickup");showToast(loot.name||"AMMO CACHE",`+${n} bonus rounds.`,"cyan")}catch(_){}
      return true;
    };
    state.installed.items=true;
  }

  function installSurvival(){
    if(state.installed.survival||typeof hurtPlayer!=="function")return;
    const oldHurt=hurtPlayer;
    hurtPlayer=function hurtPlayerV126(p,n,friendly=false,source="enemy"){
      const before=Number(run?.stats?.deaths||0),result=oldHurt(p,n,friendly,source),after=Number(run?.stats?.deaths||0);
      if(p&&after>before&&p.health>0){normalisePlayer(p);if(hasGun(p))p.mana=Math.max(Number(p.mana||0),Math.min(p.maxMana,RESPAWN_ROUNDS));p.emergencyRechargeMs=0;try{sync()}catch(_){}}
      return result;
    };
    state.installed.survival=true;
  }

  function install(){
    try{if(C?.player){C.player.maxMana=BASE_MAX_AMMO;C.player.emergencyAmmo=0;C.player.emergencyRechargeMs=0}}catch(_){}
    installPlayers();installWorld();installItems();installSurvival();
    try{for(const p of typeof localPlayers==="function"?localPlayers():[])normalisePlayer(p)}catch(_){}
  }

  install();let tries=0;const timer=setInterval(()=>{tries++;install();if(Object.values(state.installed).every(Boolean)||tries>=80)clearInterval(timer)},100);
  window.addEventListener("pagehide",()=>clearInterval(timer),{once:true});
  window.CCGLostSizzlerAmmoBudgetV126={state,buildBudget,ensureAmmoPacks,packRounds,constants:{BASE_MAX_AMMO,FIRST_GUN_ROUNDS,RESPAWN_ROUNDS,ASSUMED_DAMAGE_PER_HIT,ASSUMED_ACCURACY,SAFETY_RESERVE,PACK_ROUNDS_BY_FLOOR,MIN_PACKS_BY_FLOOR,MAX_PACKS_BY_FLOOR}};
})();
