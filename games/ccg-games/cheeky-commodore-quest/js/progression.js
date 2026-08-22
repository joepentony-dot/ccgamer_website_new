window.CCGProgression=(()=>{
  "use strict";
  const C=window.CCG_CONFIG;
  const RARITY=C.loot.rarities;
  const rarityColour={"COMMON":"#c8c0d0","UNCOMMON":"#72ff9b","SIZZLER":"#6cecff","GOLD MEDAL":"#ffd85a","ZZAP! 97%":"#ff5bae"};
  const weapons=[
    {id:"pulse",name:"Pulse Blaster",element:"energy",power:1,delay:1,shots:1,ammo:1,desc:"Reliable single-shot blaster."},
    {id:"spread",name:"Spread Gun",element:"physical",power:1,delay:1.08,shots:3,ammo:1,desc:"Three-way spread at close and mid range."},
    {id:"pierce",name:"Piercing Beam",element:"energy",power:2,delay:1.22,shots:1,ammo:1,pierce:2,desc:"Cuts through more than one target."},
    {id:"repeater",name:"Rapid Repeater",element:"physical",power:1,delay:.58,shots:1,ammo:1,desc:"Fast fire at the cost of control."},
    {id:"fire",name:"SID Fire Lance",element:"fire",power:2,delay:1.35,shots:1,ammo:1,desc:"Heavy fire damage. One trigger pull still costs one ammo."},
    {id:"shock",name:"Shockwave Emitter",element:"shock",power:2,delay:1.5,shots:8,ammo:1,ttl:4,desc:"Short-range blast in every direction. One trigger pull costs one ammo."}
  ];
  const modifiers=[
    {id:"turbo",name:"Turbo",apply:w=>{w.delay*=.84}},
    {id:"piercing",name:"Piercing",apply:w=>{w.pierce=(w.pierce||0)+1}},
    {id:"overclocked",name:"Overclocked",apply:w=>{w.power+=1;w.delay*=1.08}},
    {id:"efficient",name:"Efficient",apply:w=>{w.delay*=.92}},
    {id:"vampiric",name:"Vampiric",apply:w=>{w.vampiric=true}},
    {id:"longshot",name:"Longshot",apply:w=>{w.ttl=(w.ttl||18)+5}}
  ];
  const skills=[
    {id:"health",name:"Extra Life Bar",desc:"+1 maximum health and heal 1.",apply:p=>{p.maxHealth+=1;p.health=Math.min(p.maxHealth,p.health+1)},undo:p=>{p.maxHealth=Math.max(C.player.maxHealth,p.maxHealth-1);p.health=Math.min(p.health,p.maxHealth)}},
    {id:"ammo",name:"Bigger Magazine",desc:"+20 maximum ammo and refill 20.",apply:p=>{p.maxMana+=20;p.mana=Math.min(p.maxMana,p.mana+20)},undo:p=>{p.maxMana=Math.max(C.player.maxMana,p.maxMana-20);p.mana=Math.min(p.mana,p.maxMana)}},
    {id:"armour",name:"Armour Repair",desc:"Gain 2 armour immediately.",apply:p=>{p.armor=Math.min(12,p.armor+2)},undo:p=>{p.armor=Math.max(0,p.armor-2)}},
    {id:"torch",name:"Torch Mastery",desc:"Torches last 6 seconds longer.",apply:p=>{p.torchBonusMs=(p.torchBonusMs||0)+6000},undo:p=>{p.torchBonusMs=Math.max(0,(p.torchBonusMs||0)-6000)}},
    {id:"dash",name:"Combat Dash",desc:"Dashing through an enemy deals 1 damage.",apply:p=>{p.dashDamage=(p.dashDamage||0)+1},undo:p=>{p.dashDamage=Math.max(0,(p.dashDamage||0)-1)}},
    {id:"scavenger",name:"Scavenger",desc:"Ammo packs provide 20% more ammunition.",apply:p=>{p.scavenger=(p.scavenger||0)+.2},undo:p=>{p.scavenger=Math.max(0,(p.scavenger||0)-.2)}},
    {id:"medic",name:"Medic",desc:"Potions restore 1 additional health.",apply:p=>{p.potionBonus=(p.potionBonus||0)+1},undo:p=>{p.potionBonus=Math.max(0,(p.potionBonus||0)-1)}},
    {id:"runner",name:"Quick Feet",desc:"Movement delay reduced by 5%.",apply:p=>{p.moveMultiplier=(p.moveMultiplier||1)*.95},undo:p=>{p.moveMultiplier=Math.min(1,(p.moveMultiplier||1)/.95)}},
    {id:"damage",name:"Hot Fire Button",desc:"+1 weapon damage.",apply:p=>{p.damageBonus=(p.damageBonus||0)+1},undo:p=>{p.damageBonus=Math.max(0,(p.damageBonus||0)-1)}}
  ];
  const floorModifiers=[
    {id:"LOW_AMMO",name:"LOW AMMO",desc:"Ammo pickups are scarcer, but weapon loot is better."},
    {id:"EXTRA_DARK",name:"EXTRA DARK",desc:"Normal vision is reduced by one tile radius."},
    {id:"ARMOURED_ENEMIES",name:"ARMOURED ENEMIES",desc:"Enemies have extra health."},
    {id:"DOUBLE_TREASURE",name:"DOUBLE TREASURE",desc:"More valuable chests appear deeper in the floor."},
    {id:"STALKER_ACTIVE",name:"COUNT LOADULA ACTIVE",desc:"The stalker enters this floor much earlier."},
    {id:"RESTLESS_DUNGEON",name:"RESTLESS DUNGEON",desc:"Generators and room events activate more often."}
  ];
  const objectiveNames={keys:"Recover the three main vault keys",generators:"Destroy the monster generators",rescue:"Find and escort the trapped CCG follower",explore_guardian:"Map 70% of the floor and defeat its guardian",guardian:"Defeat the Zzap! Citadel guardian"};

  function seededPick(a,r=Math.random){return a[Math.floor(r()*a.length)]}
  function seedHash(text){let h=2166136261>>>0;for(const ch of String(text)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
  function seededRandom(text){let s=seedHash(text);return()=>((s=Math.imul(1664525,s)+1013904223>>>0)/4294967296)}
  function localDailyKey(date=new Date()){
    const y=date.getFullYear(),m=String(date.getMonth()+1).padStart(2,"0"),d=String(date.getDate()).padStart(2,"0");
    return `${y}-${m}-${d}`;
  }
  function makeRun(opts={}){
    const difficulty=opts.difficulty&&C.difficulty[opts.difficulty]?opts.difficulty:"ARCADE";
    const seed=opts.seed||Math.random().toString(36).slice(2,10).toUpperCase();
    const treasureFloor=2+Math.floor(seededRandom(`${seed}-TREASURE-FLOOR`)()*4);
    return{
      floor:1,maxFloors:C.maxFloors,difficulty,seed,daily:Boolean(opts.daily),score:0,alert:0,elapsed:0,
      treasureFloor,
      bankedXP:0,floorXP:0,deepest:1,bankedGames:[],floorGames:[],modifier:null,
      enemyDefeats:[],
      stats:{kills:0,champions:0,secrets:0,damageTaken:0,friendlyFire:0,rooms:0,chests:0,shrines:0,generators:0,stalkerEscapes:0,floors:0,namedEncounters:0,namedDefeats:0,deathCachesRecovered:0,deaths:0},
      achievementQueue:[],floorComplete:false,runComplete:false,torchClueSeen:false,torchSequence:null,everEarnedXp:false,xpPeak:0,consecutiveDeaths:0
    };
  }
  function floorInfo(run){return C.floors[Math.max(0,Math.min(C.floors.length-1,run.floor-1))]}
  function floorSeed(run){return `${run.seed}-F${run.floor}`}
  function chooseFloorModifier(run,r=null){
    if(run.floor===1)return null;
    const roll=r||((run?.daily)?seededRandom(`${run.seed}-MOD-F${run.floor}`):Math.random);
    if(run.floor>=3&&roll()<.28)return floorModifiers.find(x=>x.id==="STALKER_ACTIVE");
    return seededPick(floorModifiers,roll);
  }
  function objectiveFor(run){return floorInfo(run).objective}
  function objectiveLabel(run){return objectiveNames[objectiveFor(run)]||"Explore the dungeon"}
  function difficulty(run){return C.difficulty[run?.difficulty]||C.difficulty.ARCADE}
  function effectiveSight(player,run){let r=player.torchMs>0?C.player.torchRadius:C.player.sightRadius;if(run?.modifier?.id==="EXTRA_DARK"&&player.torchMs<=0)r=Math.max(3,r-1);return r}

  function rarityIndex(rarity){return Math.max(0,RARITY.indexOf(rarity))}
  function rollRarity(depth=0,floor=1,r=Math.random,bonus=0){
    const power=Math.min(1,depth/10+floor*.08+bonus);
    const n=r();
    if(n<.012+power*.015)return "ZZAP! 97%";
    if(n<.06+power*.06)return "GOLD MEDAL";
    if(n<.20+power*.11)return "SIZZLER";
    if(n<.52+power*.13)return "UNCOMMON";
    return "COMMON";
  }
  function generateWeapon(depth=0,floor=1,r=Math.random,bonus=0){
    const base={...seededPick(weapons,r)},rarity=rollRarity(depth,floor,r,bonus),idx=rarityIndex(rarity);
    base.rarity=rarity;base.colour=rarityColour[rarity];base.rating=1+idx*2+Math.floor(depth/4)+floor;
    if(idx>=1)base.power+=Math.floor((idx+1)/2);
    const modCount=idx>=4?2:idx>=2?1:0;base.mods=[];
    const pool=[...modifiers];for(let i=0;i<modCount&&pool.length;i++){const m=pool.splice(Math.floor(r()*pool.length),1)[0];base.mods.push(m.name);m.apply(base)}
    base.ammo=1;base.displayName=`${rarity} ${base.mods.length?base.mods.join(" ")+" ":""}${base.name}`;
    return base;
  }
  function lootForChest(chest,run,r=Math.random){
    const depth=chest.depth||0,bonus=run?.modifier?.id==="DOUBLE_TREASURE"?.18:0;
    const rarity=rollRarity(depth,run?.floor||1,r,bonus),idx=rarityIndex(rarity);
    const roll=r();
    if(roll<.34+idx*.04)return{kind:"weaponLoot",weapon:generateWeapon(depth,run?.floor||1,r,bonus),rarity};
    if(roll<.52)return{kind:"armour",amount:2+idx,rarity,name:`${rarity} Armour Plate`};
    if(roll<.68)return{kind:"potion",amount:1,rarity,name:`${rarity} Restoration Potion`};
    if(roll<.80)return{kind:"ammo",amount:38+idx*10,rarity,name:`${rarity} Ammo Cache`};
    if(roll<.86)return{kind:"torch",rarity,name:`${rarity} Flaming Torch`};
    if(roll<.91)return{kind:"teleport",rarity,name:`${rarity} Teleport Spell`};
    if(roll<.96)return{kind:"rapid",rarity,name:`${rarity} Rapid-Fire Module`};
    return{kind:"artefact",rarity,name:`${rarity} CCG Artefact`,xp:120+idx*90};
  }
  function colourForRarity(r){return rarityColour[r]||rarityColour.COMMON}

  function xpNeed(level){return 300+level*180+level*level*35}
  function floorLevelCap(run){const floor=Math.max(1,Math.min(C.maxFloors,run?.floor||1));return C.levelCaps?.[floor-1]||Math.max(5,floor*3+2)}
  function xpCapacityToCap(player,cap){let level=Math.max(1,player?.level||1),xp=Math.max(0,player?.xp||0),capacity=0;if(level>=cap)return 0;while(level<cap){capacity+=Math.max(0,xpNeed(level)-xp);level++;xp=0}return capacity}
  function gainXP(player,run,amount,reason="Exploration"){
    const gross=Math.max(0,Math.round(amount)),cap=floorLevelCap(run);
    // The floor cap is a hard stop. Excess XP is discarded, never held for later.
    if((player.level||1)>=cap){player.xp=0;player.xpDebt=0;return{amount:0,gross,debtPaid:0,discarded:gross,capped:true,cap,reason,levels:[]}}
    const capacity=xpCapacityToCap(player,cap),earned=Math.min(gross,capacity),discarded=Math.max(0,gross-earned);
    player.xpDebt=0;player.totalXp=(player.totalXp||0)+earned;player.xp=(player.xp||0)+earned;run.floorXP+=earned;
    if(earned>0){player.everEarnedXp=true;run.everEarnedXp=true;run.xpPeak=Math.max(run.xpPeak||0,player.totalXp||0)}
    const levels=[];
    while((player.level||1)<cap&&player.xp>=xpNeed(player.level||1)){player.xp-=xpNeed(player.level||1);player.level=(player.level||1)+1;player.pendingLevels=(player.pendingLevels||0)+1;levels.push(player.level)}
    if((player.level||1)>=cap)player.xp=0;
    return{amount:earned,gross,debtPaid:0,discarded,capped:(player.level||1)>=cap,cap,reason,levels};
  }
  function skillChoices(player,r=Math.random){
    const pool=[...skills],out=[];while(out.length<3&&pool.length){out.push(pool.splice(Math.floor(r()*pool.length),1)[0])}return out;
  }
  function applySkill(player,id){const s=skills.find(x=>x.id===id);if(!s)return null;s.apply(player);player.pendingLevels=Math.max(0,(player.pendingLevels||1)-1);player.skills=player.skills||[];player.skills.push(id);return s}
  function removeLastSkill(player){player.skills=player.skills||[];const id=player.skills.pop();if(!id)return null;const s=skills.find(x=>x.id===id);s?.undo?.(player);return s||null}

  const stackableKinds=new Set(["potion","teleport","banishment","artefact"]);
  function itemQty(item){return Math.max(1,Math.floor(Number(item?.qty)||1))}
  function stackKey(item){if(!item||!stackableKinds.has(item.kind))return null;return item.kind}
  function inventoryCapacity(player){return Math.max(3,Math.min(C.player.inventorySlots,Math.floor(Number(player?.inventorySlots)||C.player.startingInventorySlots||3)))}
  function stackLimit(item){return item?.kind==="potion"?3:Number.POSITIVE_INFINITY}
  function inventoryCanAdd(player,item){const inv=player?.inventory||[],key=stackKey(item),limit=stackLimit(item);return Boolean(key&&inv.some(x=>stackKey(x)===key&&itemQty(x)<limit))||inv.length<inventoryCapacity(player)}
  function inventoryAdd(player,item){player.inventory=player.inventory||[];let remaining=itemQty(item),key=stackKey(item),limit=stackLimit(item);while(remaining>0){const existing=key?player.inventory.find(x=>stackKey(x)===key&&itemQty(x)<limit):null;if(existing){const add=Math.min(remaining,limit-itemQty(existing));existing.qty=itemQty(existing)+add;remaining-=add;continue}if(player.inventory.length>=inventoryCapacity(player))return false;const add=Math.min(remaining,limit);player.inventory.push({...item,qty:add});remaining-=add}return true}
  function inventoryRemove(player,index,amount=1){player.inventory=player.inventory||[];if(index<0||index>=player.inventory.length)return null;const it=player.inventory[index],qty=itemQty(it),take=Math.max(1,Math.min(qty,Math.floor(Number(amount)||1)));if(qty>take){it.qty=qty-take;return{...it,qty:take}}return player.inventory.splice(index,1)[0]}
  function firstInventory(player,kind){return (player.inventory||[]).findIndex(x=>x.kind===kind)}
  function inventoryCount(player){return (player?.inventory||[]).reduce((n,it)=>n+itemQty(it),0)}
  function inventoryKindCount(player,kind){return (player?.inventory||[]).filter(it=>it.kind===kind).reduce((n,it)=>n+itemQty(it),0)}
  function inventoryLabel(item){if(!item)return "EMPTY";const base=item.short||item.name||item.kind.toUpperCase(),qty=itemQty(item);return qty>1?`${base} ×${qty}`:base}

  function bankFloor(run){
    run.bankedXP+=run.floorXP;run.floorXP=0;run.bankedGames.push(...run.floorGames);run.floorGames=[];run.stats.floors++;run.deepest=Math.max(run.deepest,run.floor);
    const key="ccg-quest-collection";let saved=[];try{saved=JSON.parse(localStorage.getItem(key)||"[]")}catch(_){}for(const g of run.bankedGames)if(!saved.includes(g))saved.push(g);try{localStorage.setItem(key,JSON.stringify(saved))}catch(_){}
    return saved;
  }
  function cloneItem(x){return x&&typeof x==="object"?{...x}:x}
  function deathDebtFor(player){return Math.max(1,Math.ceil(Math.max(0,player?.totalXp||0)*.12))}
  function applyDeathPenalty(player,score,run=null){
    const levelNeed=level=>window.CCGProgression?.xpNeed?.(level)||xpNeed(level),scoreBefore=Math.max(0,Math.floor(Number(score)||0)),scoreAfter=Math.floor(scoreBefore*.5),before=Math.max(0,Math.round(player?.totalXp||0)),levelBefore=Math.max(1,Number(player?.level||1)),progressBefore=Math.max(0,Number(player?.xp||0)),wanted=Math.max(1,Math.ceil(levelNeed(levelBefore)*.15)),loss=Math.min(before,wanted);let levelLost=false,lostSkill=null;
    if(loss<progressBefore)player.xp=progressBefore-loss;
    else if(levelBefore>1){const deficit=Math.max(1,loss-progressBefore),newLevel=levelBefore-1;player.level=newLevel;player.xp=Math.max(0,levelNeed(newLevel)-deficit);levelLost=true;lostSkill=removeLastSkill(player)}
    else player.xp=0;
    player.totalXp=Math.max(0,before-loss);player.xpDebt=0;if(run){run.everEarnedXp=Boolean(run.everEarnedXp||before>0);run.xpPeak=Math.max(run.xpPeak||0,before)}
    return{score:scoreAfter,scoreLost:scoreBefore-scoreAfter,xpLost:loss,xpBefore:before,xpAfter:player.totalXp,levelBefore,levelAfter:player.level,levelLost,lostSkill:lostSkill?.name||null,gameOver:false}
  }
  function createDeathCache(player,run,x,y){
    const carried=(player.inventory||[]).filter(it=>!it.quest).map(cloneItem),kept=(player.inventory||[]).filter(it=>it.quest).map(cloneItem),games=[...(run.floorGames||[])];
    player.inventory=kept;run.floorGames=[];
    return{id:`death-cache-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,x,y,kind:"deathCache",active:carried.length>0||games.length>0,inventory:carried,games,score:0,createdFloor:run.floor||1};
  }
  function recoverDeathCache(player,run,cache){
    if(!cache?.active)return{recovered:0,games:0,remaining:0,score:0};let recovered=0;const remaining=[];
    for(const it of cache.inventory||[]){if(inventoryAdd(player,cloneItem(it)))recovered+=itemQty(it);else remaining.push(cloneItem(it))}
    const games=[...(cache.games||[])];for(const g of games)if(!(run.floorGames||[]).includes(g))run.floorGames.push(g);
    const recoveredScore=Math.max(0,Math.floor(Number(cache.score)||0));cache.inventory=remaining;cache.games=[];cache.score=0;cache.active=remaining.length>0;
    if(!cache.active)run.stats.deathCachesRecovered=(run.stats.deathCachesRecovered||0)+1;
    return{recovered,games:games.length,remaining:remaining.reduce((n,it)=>n+itemQty(it),0),score:recoveredScore};
  }
  function loseFloorProgress(player,run){const cache=createDeathCache(player,run,player?.x||0,player?.y||0);return{lostXP:0,lostItem:cache.inventory?.[0]||null,cache}}
  function persistentCollection(){try{return JSON.parse(localStorage.getItem("ccg-quest-collection")||"[]")}catch(_){return[]}}
  function dailyResultKey(run){return `ccg-daily-result-${run?.dailyKey||localDailyKey()}`}
  function recordDailyResult(run,score,player){
    if(!run?.daily)return null;
    const result={date:run.dailyKey||localDailyKey(),score:Math.floor(score||0),deepest:run.deepest||run.floor||1,timeMs:Math.floor(run.elapsed||0),level:player?.level||1,completed:Boolean(run.runComplete&&run.deepest>=C.maxFloors)};
    try{
      const key=dailyResultKey(run),old=JSON.parse(localStorage.getItem(key)||"null");
      const better=!old||result.deepest>old.deepest||(result.deepest===old.deepest&&result.score>old.score)||(result.deepest===old.deepest&&result.score===old.score&&result.timeMs<old.timeMs);
      if(better)localStorage.setItem(key,JSON.stringify(result));
      return better?result:old;
    }catch(_){return result}
  }
  function dailyBest(date=localDailyKey()){try{return JSON.parse(localStorage.getItem(`ccg-daily-result-${date}`)||"null")}catch(_){return null}}
  function dailyAttemptKey(date=localDailyKey()){return `ccg-daily-attempt-${date}`}
  function hasDailyAttempt(date=localDailyKey()){try{return localStorage.getItem(dailyAttemptKey(date))==="1"}catch(_){return false}}
  function claimDailyAttempt(date=localDailyKey()){if(hasDailyAttempt(date))return false;try{localStorage.setItem(dailyAttemptKey(date),"1")}catch(_){}return true}

  const checkpointStorageKey="ccg-quest-v10.3-checkpoint";
  function checkpointClone(value){try{return JSON.parse(JSON.stringify(value))}catch(_){return null}}
  function makeCheckpoint(run,player,player2,score,playMode="solo"){return{version:"V10.3",savedAt:Date.now(),floor:run?.floor||1,score:Math.max(0,Math.floor(score||0)),playMode,run:checkpointClone(run),player:checkpointClone(player),player2:checkpointClone(player2)}}
  function saveCheckpointData(data){if(!data)return false;try{localStorage.setItem(checkpointStorageKey,JSON.stringify(data));return true}catch(_){return false}}
  function loadCheckpoint(){try{const data=JSON.parse(localStorage.getItem(checkpointStorageKey)||"null");return data?.version==="V10.3"&&data.run&&data.player?data:null}catch(_){return null}}
  function clearCheckpoint(){try{localStorage.removeItem(checkpointStorageKey)}catch(_){}return true}
  function dossierKey(){return "ccg-named-enemy-dossier-v1"}
  function readDossier(){try{return JSON.parse(localStorage.getItem(dossierKey())||"{}")||{}}catch(_){return{}}}
  function recordNamedEncounter(name,defeated=false){
    if(!name)return null;const d=readDossier(),row=d[name]||{encounters:0,defeats:0};if(defeated)row.defeats++;else row.encounters++;d[name]=row;try{localStorage.setItem(dossierKey(),JSON.stringify(d))}catch(_){}return row;
  }

  function achievement(run,id,title){
    const key=`ccg-achievement-${id}`;try{if(localStorage.getItem(key))return false;localStorage.setItem(key,"1")}catch(_){}run.achievementQueue.push({id,title});return true;
  }
  function checkAchievements(run,player){
    if(run.stats.secrets>=3)achievement(run,"secret-three","NO WALL IS SAFE — Find 3 secret rooms");
    if(run.stats.champions>=5)achievement(run,"champion-five","SIZZLER HUNTER — Defeat 5 champions");
    if(run.deepest>=5)achievement(run,"deep-five","BOTTOM OF THE BOX — Reach Floor 5");
    if((player.level||1)>=8)achievement(run,"level-eight","POWER USER — Reach Level 8");
  }

  function roomCompletion(explored,world){
    if(!world?.rooms?.length)return 0;let seen=0;for(const room of world.rooms.filter(r=>!r.optional)){const cx=Math.floor(room.x+room.w/2),cy=Math.floor(room.y+room.h/2);if(explored.has(`${cx},${cy}`))seen++}return seen/Math.max(1,world.rooms.filter(r=>!r.optional).length);
  }

  return{makeRun,floorInfo,floorSeed,chooseFloorModifier,objectiveFor,objectiveLabel,difficulty,effectiveSight,generateWeapon,lootForChest,colourForRarity,gainXP,xpNeed,floorLevelCap,skillChoices,applySkill,removeLastSkill,inventoryCapacity,inventoryCanAdd,inventoryAdd,inventoryRemove,firstInventory,inventoryCount,inventoryKindCount,inventoryLabel,bankFloor,loseFloorProgress,deathDebtFor,applyDeathPenalty,createDeathCache,recoverDeathCache,persistentCollection,localDailyKey,seededRandom,recordDailyResult,dailyBest,dailyAttemptKey,hasDailyAttempt,claimDailyAttempt,makeCheckpoint,saveCheckpointData,loadCheckpoint,clearCheckpoint,readDossier,recordNamedEncounter,checkAchievements,roomCompletion,RARITY};
})();
