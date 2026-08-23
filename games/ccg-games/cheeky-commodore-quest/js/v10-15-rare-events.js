/* The Lost Sizzler V10.15 — rare dungeon events, bounties and adaptive objective hints. */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_RARE_EVENTS_V115__)return;
  window.__CCG_LOST_SIZZLER_RARE_EVENTS_V115__=true;

  const CHANCE={mimic:.08,cursed:.07,merchant:.07,golden:.045,adventurer:.06,tremor:.06,cabinet:.07,bat:.07,taxman:.055,mystery:.10,developer:.025,map:.08,mutation:.16};
  const HINT_STAGE_MS=[75000,120000,180000];
  const state={floorKey:"",startedAt:0,hintMs:0,hintStage:0,hintTarget:null,hintMarkerUntil:0,lastObjectiveSignature:"",plans:{},golden:null,bounty:null,mutation:null,ghost:null,ghostRecord:[],ghostSampleMs:0,announcedRooms:new Set(),specialDeaths:new Set()};

  function hash32(value){let h=2166136261>>>0;for(const ch of String(value||"")){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}h+=h<<13;h^=h>>>7;h+=h<<3;h^=h>>>17;h+=h<<5;return h>>>0}
  const unit=value=>hash32(value)/4294967296;
  const floorKey=seed=>`${String(seed||run?.seed||"CCG")}|F${Math.max(1,Number(run?.floor||1))}|V115`;
  const roll=(name,chance)=>unit(`${state.floorKey}|${name}`)<chance;
  const localPlayersSafe=()=>typeof localPlayers==="function"?localPlayers():[p1,p2].filter(Boolean);
  const playersSafe=()=>typeof allPlayers==="function"?allPlayers():localPlayersSafe();
  const roomAt=(x,y)=>W.roomAt(world,x,y);
  const roomCentre=room=>({x:Math.floor(room.x+room.w/2),y:Math.floor(room.y+room.h/2)});
  const dist=(a,b)=>Math.hypot(Number(a?.x||0)-Number(b?.x||0),Number(a?.y||0)-Number(b?.y||0));

  function specialRoomIds(){
    const ids=new Set([world?.startRoomId,world?.exitRoomId,host?.sigilRoomId].filter(x=>x!=null));
    for(const list of [host?.arenas,host?.timedRooms,host?.hazardRooms])for(const row of list||[])if(row?.roomId!=null)ids.add(row.roomId);
    for(const row of [host?.memoryPuzzle,host?.sequenceTorchPuzzle,host?.weightBridge,host?.spiderNest,host?.skeletonHorde])if(row?.roomId!=null)ids.add(row.roomId);
    if(host?.rescue?.roomId!=null)ids.add(host.rescue.roomId);
    return ids;
  }
  function eligibleRooms({allowOptional=false}={}){
    const blocked=specialRoomIds();
    return (world?.rooms||[]).filter(r=>r&&!blocked.has(r.id)&&!r.sanctuary&&!r.sigilRoom&&!r.dangerous&&!r.dedicatedHazard&&(allowOptional||!r.optional));
  }
  function occupied(x,y){
    if((host?.enemies||[]).some(e=>e.alive&&e.x===x&&e.y===y))return true;
    if((host?.blockingDecor||[]).some(d=>d.x===x&&d.y===y))return true;
    if((host?.chests||[]).some(d=>d.active&&d.x===x&&d.y===y))return true;
    if((host?.items||[]).some(d=>d.active&&d.x===x&&d.y===y))return true;
    if((host?.shops||[]).some(d=>d.active&&d.x===x&&d.y===y))return true;
    if(playersSafe().some(p=>p&&p.x===x&&p.y===y))return true;
    return false;
  }
  function freeCell(room,key){
    const cells=[];if(!room)return null;
    for(let y=room.y+2;y<=room.y+room.h-2;y++)for(let x=room.x+2;x<=room.x+room.w-2;x++){
      if(world?.map?.[y]?.[x]!==0||!W.walkable(world.map,x,y,host)||occupied(x,y))continue;
      if((host?.doors||[]).some(d=>Math.abs(d.x-x)+Math.abs(d.y-y)<=2))continue;
      cells.push({x,y});
    }
    cells.sort((a,b)=>hash32(`${key}|${a.x},${a.y}`)-hash32(`${key}|${b.x},${b.y}`));return cells[0]||null;
  }
  function chooseRoom(key,opts){const rooms=eligibleRooms(opts);if(!rooms.length)return null;return rooms[hash32(`${state.floorKey}|${key}`)%rooms.length]}
  function addCredits(x,y,total,title="GOLD"){const count=Math.max(1,Math.ceil(total/10));for(let i=0;i<count;i++){const q=safeNearby(x,y,`${title}|${i}`);host.items.push({id:`rare-credit-${Date.now()}-${i}-${Math.random()}`,x:q.x,y:q.y,kind:"credits",scoreValue:Math.min(10,total-i*10),active:true,title});}}
  function safeNearby(x,y,key){const a=[];for(let r=0;r<=3;r++)for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++){if(Math.max(Math.abs(dx),Math.abs(dy))!==r)continue;const q={x:x+dx,y:y+dy};if(world?.map?.[q.y]?.[q.x]===0&&W.walkable(world.map,q.x,q.y,host)&&!occupied(q.x,q.y))a.push(q)}return a[hash32(`${state.floorKey}|${key}`)%Math.max(1,a.length)]||{x,y}}
  function spawnSimpleEnemy(id,q,kind,hp,extra={}){const e={id,...q,kind,hp,maxHp:hp,alive:true,aiState:"idle",facing:{x:1,y:0},lastSeen:null,memoryMs:0,searchMs:0,moveCooldown:650,attackCooldown:750,chargeCooldown:999999,healCooldown:999999,flash:0,hpBarMs:0,...extra};host.enemies.push(e);host.revision=(host.revision||0)+1;return e}

  function planFloor(seed,checkpointRestore=false){
    state.floorKey=floorKey(seed);state.startedAt=performance.now();state.hintMs=0;state.hintStage=0;state.hintTarget=null;state.hintMarkerUntil=0;state.lastObjectiveSignature="";state.plans={};state.golden=null;state.bounty=null;state.mutation=null;state.ghost=null;state.ghostRecord=[];state.ghostSampleMs=0;state.announcedRooms.clear();state.specialDeaths.clear();
    if(checkpointRestore)return;
    installMutation();installMimic();installCursedCartridge();installMerchant();installGoldenRoom();installAdventurer();installTremor();installCabinet();installTreasureBat();installTaxman();installMysteryPotion();installDeveloperRoom();installBounty();installTreasureMap();loadWeeklyGhost();
  }

  function installMutation(){
    if(!roll("mutation",CHANCE.mutation))return;
    const types=["DOUBLE GOLD","DARKNESS","ELITE BOUNTY","CHEST RUSH","NO SHOPPING"],type=types[hash32(`${state.floorKey}|mutation-type`)%types.length];state.mutation={type,announced:false};run.rareMutation=type;
    if(type==="DARKNESS")run.alert=Math.min(100,Number(run.alert||0)+18);
    if(type==="CHEST RUSH")for(const c of host.chests||[])c.depth=Number(c.depth||0)+3;
    if(type==="NO SHOPPING")for(const shop of host.shops||[])if(!shop.startShop)shop._rareDisabled=true;
  }
  function installMimic(){if(!roll("mimic",CHANCE.mimic))return;const list=(host.chests||[]).filter(c=>c.active&&!c.memoryPuzzleReward&&!c.torchPuzzleReward&&!c.weightBridgeReward);if(!list.length)return;const c=list[hash32(`${state.floorKey}|mimic-pick`)%list.length];c.mimicChest=true;c.mimicDormant=true;}
  function installCursedCartridge(){if(!roll("cursed",CHANCE.cursed))return;const room=chooseRoom("cursed-room"),q=freeCell(room,"cursed-cell");if(!q)return;host.items.push({id:`cursed-cartridge-${state.floorKey}`,...q,kind:"game",title:"CURSED CARTRIDGE",active:true,cursedCartridge:true,roomId:room.id});}
  function installMerchant(){if(!roll("merchant",CHANCE.merchant))return;const room=chooseRoom("merchant-room"),q=freeCell(room,"merchant-cell"),template=(host.shops||[])[0]||host.trader||host.startShop;if(!q||!template)return;const shop={...template,id:`wandering-merchant-${state.floorKey}`,...q,roomId:room.id,active:true,wanderingMerchant:true,rareLifeMs:60000,rareMoveMs:4000,purchases:0,priceStep:0};host.shops=host.shops||[];host.shops.push(shop);state.plans.merchant=shop;}
  function installGoldenRoom(){if(!roll("golden",CHANCE.golden))return;const room=chooseRoom("gold-room");if(!room)return;room.goldenRoom=true;state.golden={roomId:room.id,active:false,resolved:false,timeMs:25000,waveMs:0};}
  function installAdventurer(){if(!roll("adventurer",CHANCE.adventurer))return;const room=chooseRoom("adv-room"),q=freeCell(room,"adv-cell");if(!q)return;const e=spawnSimpleEnemy(`lost-adventurer-${state.floorKey}`,q,"scout",6,{lostAdventurer:true,passiveNpc:true,following:false,moveCooldown:999999,attackCooldown:999999,rareMoveMs:0,roomId:room.id});state.plans.adventurer=e;}
  function installTremor(){if(!roll("tremor",CHANCE.tremor))return;const door=(host.doors||[]).find(d=>d.type==="secret"&&d.hidden&&d.locked);if(door)state.plans.tremor={door,delayMs:20000+Math.floor(unit(`${state.floorKey}|tremor-delay`)*20000),done:false};}
  function installCabinet(){if(!roll("cabinet",CHANCE.cabinet))return;const list=(host.chests||[]).filter(c=>c.active&&!c.mimicChest&&!c.memoryPuzzleReward&&!c.torchPuzzleReward);if(!list.length)return;const c=list[hash32(`${state.floorKey}|cabinet`)%list.length];c.possessedCabinet=true;c.title="POSSESSED ARCADE CABINET";}
  function installTreasureBat(){if(!roll("bat",CHANCE.bat))return;const room=chooseRoom("bat-room"),q=freeCell(room,"bat-cell");if(!q)return;const e=spawnSimpleEnemy(`treasure-bat-${state.floorKey}`,q,"ambusher",5,{treasureBat:true,passiveNpc:true,lifeMs:20000,rareMoveMs:420,moveCooldown:999999,attackCooldown:999999,x0:q.x,y0:q.y});state.plans.bat=e;}
  function installTaxman(){if(!roll("taxman",CHANCE.taxman))return;const room=chooseRoom("tax-room"),q=freeCell(room,"tax-cell");if(!q)return;const e=spawnSimpleEnemy(`taxman-${state.floorKey}`,q,"scout",8,{taxman:true,passiveNpc:true,stolen:0,rareMoveMs:680,moveCooldown:999999,attackCooldown:999999,fleeing:false,x0:q.x,y0:q.y});state.plans.taxman=e;}
  function installMysteryPotion(){if(!roll("mystery",CHANCE.mystery))return;const room=chooseRoom("mystery-room"),q=freeCell(room,"mystery-cell");if(!q)return;host.items.push({id:`mystery-potion-${state.floorKey}`,...q,kind:"potion",active:true,mysteryPotion:true,title:"MYSTERY POTION",mysterySeed:hash32(`${state.floorKey}|mystery-effect`)});}
  function installDeveloperRoom(){
    if(!roll("developer",CHANCE.developer))return;const hiddenDoors=(host.doors||[]).filter(d=>d.type==="secret"&&d.roomId!=null);if(!hiddenDoors.length)return;const d=hiddenDoors[hash32(`${state.floorKey}|dev-door`)%hiddenDoors.length],room=world.rooms[d.roomId];if(!room)return;room.developerRoom=true;room.developerRoomTitle="CCG DEVELOPER ROOM";const q=freeCell(room,"dev-cache");if(q)host.chests.push({id:`developer-cache-${state.floorKey}`,...q,locked:false,active:true,depth:Number(room.depth||0)+12,roomId:room.id,developerCache:true});state.plans.developer={roomId:room.id};
  }
  function installBounty(){const types=["KILL 8 ENEMIES","NO DAMAGE — 6 KILLS","RESCUE 3 GAMES"],type=types[hash32(`${state.floorKey}|bounty`)%types.length];state.bounty={type,startKills:Number(run.stats?.kills||0),startGames:Number(stats?.games||0),kills:0,games:0,failed:false,complete:false,reward:1000};}
  function installTreasureMap(){if(!roll("map",CHANCE.map))return;const room=chooseRoom("map-room"),q=freeCell(room,"map-cell"),targetRoom=chooseRoom("map-target");if(!q||!targetRoom)return;const t=freeCell(targetRoom,"map-target-cell")||roomCentre(targetRoom);host.items.push({id:`treasure-map-${state.floorKey}`,...q,kind:"loot",active:true,treasureMap:true,title:"TREASURE MAP FRAGMENT",target:{...t}});}

  function announceStartSystems(){
    if(state.mutation&&!state.mutation.announced){state.mutation.announced=true;showToast(`FLOOR MUTATION — ${state.mutation.type}`,mutationCopy(state.mutation.type),state.mutation.type==="DOUBLE GOLD"?"gold":"cyan",9000)}
    if(state.bounty&&!state.bounty.announced){state.bounty.announced=true;showToast(`DUNGEON BOUNTY — ${state.bounty.type}`,"Optional challenge: complete it on this floor for +1,000 score.","gold",8500)}
  }
  function mutationCopy(type){return {"DOUBLE GOLD":"Gold score pickups on this floor are worth double.","DARKNESS":"Torchless visibility is less forgiving and dungeon alert starts higher.","ELITE BOUNTY":"Special enemy kills are worth more score this floor.","CHEST RUSH":"Chest loot quality is boosted across the floor.","NO SHOPPING":"Most dungeon shops are closed on this floor."}[type]||"The rules of this floor have shifted."}

  function clearCurse(player,reason="cleansed"){
    if(!player?._cursedCartridge)return false;const c=player._cursedCartridge;player.moveMultiplier=c.oldMoveMultiplier;player.maxMana=c.oldMaxMana;player.mana=Math.min(player.mana,player.maxMana);delete player._cursedCartridge;showToast("CURSED CARTRIDGE CLEANSED",reason==="shrine"?"The shrine strips the cartridge's slowdown and ammo penalty.":"The curse lifts as the floor is banked.","green",7000);return true;
  }
  function applyCurse(player){if(!player||player._cursedCartridge)return;player._cursedCartridge={oldMoveMultiplier:Number(player.moveMultiplier||1),oldMaxMana:Number(player.maxMana||100)};player.moveMultiplier=Number(player.moveMultiplier||1)*1.14;player.maxMana=Math.max(30,Number(player.maxMana||100)-12);player.mana=Math.min(player.mana,player.maxMana);score+=500;showToast("CURSED CARTRIDGE",`+500 score, but movement is slower and maximum ammo is reduced until a shrine cleanses it or the floor ends.`,"red",9500)}

  function beginGoldenRoom(player){const g=state.golden;if(!g||g.active||g.resolved||roomAt(player.x,player.y)!==g.roomId)return;g.active=true;g.timeMs=25000;g.waveMs=100;SYS.lockRoomDoors?.(host,g.roomId,true);showToast("GOLDEN ROOM — SURVIVE 25 SECONDS","The doors seal. Survive the short rush and the room pays out in gold.","gold",9000);}
  function finishGoldenRoom(){const g=state.golden;if(!g?.active)return;g.active=false;g.resolved=true;SYS.lockRoomDoors?.(host,g.roomId,false);const room=world.rooms[g.roomId],q=roomCentre(room);addCredits(q.x,q.y,250,"GOLDEN ROOM");score+=250;showToast("GOLDEN ROOM CLEARED","The doors reopen. +250 score and a shower of bonus gold.","gold",9000);}
  function spawnGoldenWave(){const g=state.golden,room=world.rooms[g.roomId],p=p1;if(!room||!p)return;for(let i=0;i<2;i++){const q=freeCell(room,`gold-wave-${Date.now()}-${i}`);if(q)spawnSimpleEnemy(`gold-room-${Date.now()}-${i}`,q,["scout","hunter","charger"][i%3],3+Math.max(1,run.floor),{goldenRoomEnemy:true,aiState:"chase",lastSeen:{x:p.x,y:p.y},memoryMs:999999})}}

  function movePassive(enemy,target,away=false){
    if(!enemy?.alive||!target)return;const dirs=[[1,0],[-1,0],[0,1],[0,-1]],candidates=[];for(const [dx,dy] of dirs){const x=enemy.x+dx,y=enemy.y+dy;if(!W.walkable(world.map,x,y,host)||occupiedExcept(x,y,enemy))continue;const d=dist({x,y},target);candidates.push({x,y,dx,dy,value:(away?d:-d)+(unit(`${enemy.id}|${x},${y}|${Math.floor(performance.now()/500)}`)*.01)})}candidates.sort((a,b)=>b.value-a.value);const q=candidates[0];if(!q)return;const ox=enemy.x,oy=enemy.y;enemy.x=q.x;enemy.y=q.y;enemy.facing={x:q.dx,y:q.dy};host.revision=(host.revision||0)+1;if(typeof particles!="undefined")for(let i=0;i<4;i++)particles.push({x:ox*C.tile+C.tile/2,y:oy*C.tile+C.tile*.75,vx:(Math.random()-.5)*1.2,vy:-Math.random()*.6,life:250+Math.random()*250,col:enemy.treasureBat?P.gold:"#b69a78",size:1+Math.random()*2,drag:.95});
  }
  function occupiedExcept(x,y,enemy){return (host.enemies||[]).some(e=>e!==enemy&&e.alive&&e.x===x&&e.y===y)||(host.blockingDecor||[]).some(d=>d.x===x&&d.y===y)||playersSafe().some(p=>p&&p.x===x&&p.y===y)}

  function updateAdventurer(dt){const a=state.plans.adventurer;if(!a?.alive)return;a.rareMoveMs=Number(a.rareMoveMs||0)-dt;const target=[...playersSafe()].sort((x,y)=>dist(a,x)-dist(a,y))[0];if(!a.following&&target&&dist(a,target)<=3){a.following=true;showToast("LOST ADVENTURER","A trapped explorer joins you. Escort them into any sanctuary for +500 score.","cyan",8500)}if(a.following&&a.rareMoveMs<=0&&target){a.rareMoveMs=760;if(dist(a,target)>1)movePassive(a,target,false)}if(a.following){const sanctuary=(world.rooms||[]).find(r=>r.sanctuary&&roomAt(a.x,a.y)===r.id);if(sanctuary){a.alive=false;a.rescued=true;score+=500;showToast("ADVENTURER RESCUED","They made it to sanctuary. +500 score.","green",8000)}}}
  function updateBat(dt){const b=state.plans.bat;if(!b?.alive)return;b.lifeMs-=dt;b.rareMoveMs-=dt;if(b.lifeMs<=0){b.alive=false;showToast("TREASURE BAT ESCAPED","The bat disappears into the darkness with its prize.","cyan",6500);return}const target=[...playersSafe()].sort((x,y)=>dist(b,x)-dist(b,y))[0];if(b.rareMoveMs<=0&&target){b.rareMoveMs=420;movePassive(b,target,true)}}
  function updateTaxman(dt){const t=state.plans.taxman;if(!t?.alive)return;t.rareMoveMs-=dt;const target=[...playersSafe()].sort((x,y)=>dist(t,x)-dist(t,y))[0];if(!target)return;if(!t.fleeing&&dist(t,target)<=1.2){const amount=Math.min(100,Math.max(0,Number(score||0)));if(amount>0){score-=amount;t.stolen+=amount;t.fleeing=true;showToast("THE TAXMAN!",`He pinched ${amount} score and is legging it. Kill him to recover it plus a bonus.`,"red",8000)}}if(t.rareMoveMs<=0){t.rareMoveMs=t.fleeing?450:700;movePassive(t,target,t.fleeing)}}
  function updateMerchant(dt){const m=state.plans.merchant;if(!m?.active)return;m.rareLifeMs-=dt;m.rareMoveMs-=dt;if(m.rareLifeMs<=0){m.active=false;showToast("WANDERING MERCHANT MOVES ON","The travelling shopkeeper has packed up and disappeared.","cyan",6000);return}if(m.rareMoveMs<=0&&!activeShop){m.rareMoveMs=4000;const room=world.rooms[m.roomId],q=freeCell(room,`merchant-move-${Math.floor(m.rareLifeMs/4000)}`);if(q){m.x=q.x;m.y=q.y;host.revision=(host.revision||0)+1}}}
  function updateTremor(){const t=state.plans.tremor;if(!t||t.done||Number(host.floorElapsed||0)<t.delayMs)return;t.done=true;const d=t.door;d.hidden=false;d.locked=false;d.open=true;d.opening=false;host.revision=(host.revision||0)+1;try{shake=Math.max(shake,11);S.sfx("explosion");burst(d.x,d.y,P.gold,30,1.6)}catch(_){}showToast("DUNGEON TREMOR","Stone cracks somewhere nearby. A previously sealed secret passage has been forced open.","gold",9000);}

  function startCabinetChallenge(chest,player){chest.active=false;state.plans.cabinet={active:true,timeMs:30000,kills:0,needed:8,failed:false,startDamage:Number(run.stats?.damageTaken||0),x:chest.x,y:chest.y};showToast("POSSESSED ARCADE CABINET","Challenge accepted: kill 8 enemies in 30 seconds without taking damage for a bonus cache.","purple",9500);host.revision=(host.revision||0)+1;}
  function updateCabinet(dt){const c=state.plans.cabinet;if(!c?.active)return;c.timeMs-=dt;if(Number(run.stats?.damageTaken||0)>c.startDamage)c.failed=true;if(c.kills>=c.needed&&!c.failed){c.active=false;score+=900;host.chests.push({id:`cabinet-reward-${Date.now()}`,x:c.x,y:c.y,locked:false,active:true,depth:15,roomId:roomAt(c.x,c.y),cabinetReward:true});showToast("ARCADE CHALLENGE COMPLETE","8 kills, no damage. +900 score and a high-quality reward cache.","green",9000);return}if(c.timeMs<=0){c.active=false;showToast("ARCADE CHALLENGE FAILED",c.failed?"You took damage during the challenge.":`Time expired at ${c.kills}/${c.needed} kills.`,"red",7000)}}

  function mysteryPotion(player,item){const n=Number(item?.mysterySeed||0)%5;if(n===0){player.health=Math.min(player.maxHealth,player.health+5);showToast("MYSTERY POTION — HEARTY","+5 health.","green",6500)}else if(n===1){player.mana=Math.min(player.maxMana,player.mana+45);showToast("MYSTERY POTION — CHARGED","+45 ammo/energy.","cyan",6500)}else if(n===2){player.armor=Math.min(15,Number(player.armor||0)+6);showToast("MYSTERY POTION — IRON SKIN","+6 armour.","cyan",6500)}else if(n===3){player._mysterySpeedMs=20000;player._mysteryOldMove=Number(player.moveMultiplier||1);player.moveMultiplier=Math.max(.7,player.moveMultiplier*.82);showToast("MYSTERY POTION — QUICK FEET","Movement boosted for 20 seconds.","green",6500)}else{player._mysteryWobbleMs=15000;player._mysteryOldMove=Number(player.moveMultiplier||1);player.moveMultiplier=player.moveMultiplier*1.18;showToast("MYSTERY POTION — DODGY BATCH","Movement is sluggish for 15 seconds. You did ask what was in the bottle.","red",7000)}}
  function updateMysteryEffects(dt){for(const p of localPlayersSafe()){if(p._mysterySpeedMs>0){p._mysterySpeedMs-=dt;if(p._mysterySpeedMs<=0){p.moveMultiplier=p._mysteryOldMove||1;delete p._mysteryOldMove}}if(p._mysteryWobbleMs>0){p._mysteryWobbleMs-=dt;if(p._mysteryWobbleMs<=0){p.moveMultiplier=p._mysteryOldMove||1;delete p._mysteryOldMove}}}}

  function activateTreasureMap(item){state.plans.mapTarget={...item.target,active:true};showToast("TREASURE MAP FRAGMENT","A buried cache location has been marked. Follow the gold marker on the radar.","gold",8500);state.hintTarget={...item.target,label:"BURIED CACHE"};state.hintMarkerUntil=Infinity;}
  function updateTreasureMap(){const m=state.plans.mapTarget;if(!m?.active||!p1)return;if(dist(p1,m)<=1.2){m.active=false;state.hintMarkerUntil=0;state.hintTarget=null;score+=600;host.chests.push({id:`buried-cache-${Date.now()}`,x:m.x,y:m.y,locked:false,active:true,depth:14,roomId:roomAt(m.x,m.y),buriedCache:true});showToast("BURIED CACHE FOUND","+600 score and a reward chest rises from the floor.","gold",8500)}}

  function updateBounty(){const b=state.bounty;if(!b||b.complete||b.failed)return;const kills=Math.max(0,Number(run.stats?.kills||0)-b.startKills),games=Math.max(0,Number(stats?.games||0)-b.startGames);b.kills=kills;b.games=games;if(b.type==="KILL 8 ENEMIES"&&kills>=8)completeBounty();else if(b.type==="NO DAMAGE — 6 KILLS"){if(b.tookDamage)b.failed=true;else if(kills>=6)completeBounty()}else if(b.type==="RESCUE 3 GAMES"&&games>=3)completeBounty();}
  function completeBounty(){const b=state.bounty;if(!b||b.complete)return;b.complete=true;score+=b.reward;showToast("DUNGEON BOUNTY COMPLETE",`+${b.reward.toLocaleString()} score.`,"gold",8000);}

  function objectiveSignature(){const o=host?.objective||{};return JSON.stringify([o.type,o.complete,host?.keysCollected,host?.exitSigilCollected,run?.stats?.generators,run?.stats?.secrets,host?.rescue?.rescued,(host?.generators||[]).filter(g=>g.alive).length,(host?.enemies||[]).filter(e=>e.alive&&e.guardian).length]);}
  function objectiveTarget(){
    if(!host||!world)return null;
    if(host.objective?.complete){if(!host.exitSigilCollected){const e=(host.enemies||[]).find(e=>e.alive&&e.sigilDefender);if(e)return{x:e.x,y:e.y,label:"SIGIL DEFENDER"};if(host.sigilRoomId!=null)return{...roomCentre(world.rooms[host.sigilRoomId]),label:"SIGIL CHAMBER"}}return{x:world.exit.x,y:world.exit.y,label:"FLOOR EXIT"}}
    const gen=(host.generators||[]).find(g=>g.alive);if(gen)return{x:gen.x,y:gen.y,label:"GENERATOR"};
    const key=(host.items||[]).find(i=>i.active&&(i.kind==="key"||i.kind==="exitSigil"));if(key)return{x:key.x,y:key.y,label:key.kind==="key"?"MAIN KEY":"EXIT SIGIL"};
    if(host.rescue&&!host.rescue.rescued)return{x:host.rescue.x,y:host.rescue.y,label:"CCG SCOUT"};
    const guardian=(host.enemies||[]).find(e=>e.alive&&e.guardian);if(guardian)return{x:guardian.x,y:guardian.y,label:"GUARDIAN"};
    const sw=(host.switches||[]).find(s=>s.active);if(sw)return{x:sw.x,y:sw.y,label:"SWITCH"};
    return{x:world.exit.x,y:world.exit.y,label:"FLOOR EXIT"};
  }
  function directionTo(target){if(!p1||!target)return"";const dx=target.x-p1.x,dy=target.y-p1.y,parts=[];if(Math.abs(dy)>2)parts.push(dy<0?"NORTH":"SOUTH");if(Math.abs(dx)>2)parts.push(dx<0?"WEST":"EAST");return parts.join("-")||"VERY CLOSE"}
  function updateHints(dt){
    if(!p1||mode!=="playing")return;const sig=objectiveSignature();if(sig!==state.lastObjectiveSignature){state.lastObjectiveSignature=sig;state.hintMs=0;state.hintStage=0;if(!state.plans.mapTarget?.active){state.hintTarget=null;state.hintMarkerUntil=0}return}
    const target=objectiveTarget();if(target&&dist(p1,target)<5){state.hintMs=Math.max(0,state.hintMs-dt*.65);if(state.hintStage>0&&state.hintMs<45000)state.hintStage=0;return}state.hintMs+=dt;
    const next=state.hintStage<HINT_STAGE_MS.length?HINT_STAGE_MS[state.hintStage]:Infinity;if(state.hintMs<next)return;state.hintStage++;
    const t=objectiveTarget();if(!t)return;const dir=directionTo(t);
    if(state.hintStage===1)showToast("OBJECTIVE HINT","You have been exploring for a while without objective progress. Check unexplored routes and your mission text.","cyan",8000);
    else if(state.hintStage===2)showToast("NEXT OBJECTIVE",`${t.label} is roughly ${dir}.`,"cyan",9000);
    else{state.hintTarget={...t};state.hintMarkerUntil=performance.now()+60000;showToast("RADAR HINT",`${t.label} is now marked on the radar for 60 seconds.`,"gold",9000)}
  }
  function drawRadarHint(){if(!state.hintTarget||performance.now()>state.hintMarkerUntil)return;const c=document.getElementById("radar-canvas");if(!c||!world?.map)return;const r=c.getContext("2d"),w=world.map[0]?.length||1,h=world.map.length||1,x=(state.hintTarget.x/w)*c.width,y=(state.hintTarget.y/h)*c.height;r.save();r.strokeStyle=P.gold;r.fillStyle=P.gold;r.lineWidth=3;r.shadowColor=P.gold;r.shadowBlur=10;r.beginPath();r.arc(x,y,7+Math.sin(performance.now()/180)*2,0,Math.PI*2);r.stroke();r.fillRect(x-2,y-2,4,4);r.restore();}

  function recordGhost(dt){if(!run?.daily||!p1)return;state.ghostSampleMs-=dt;if(state.ghostSampleMs>0)return;state.ghostSampleMs=500;if(state.ghostRecord.length>=360)return;state.ghostRecord.push({f:Number(run.floor||1),x:p1.x,y:p1.y,t:Math.max(0,Math.round(Number(run.elapsed||0)))});}
  async function loadWeeklyGhost(){if(!run?.daily)return;try{const raw=sessionStorage.getItem("ccg-weekly-ghost-preview");if(raw)state.ghost=JSON.parse(raw)}catch(_){}}
  function drawGhost(){const g=state.ghost;if(!g?.path?.length||!run?.daily||!focus)return;const same=g.path.filter(q=>q.f===Number(run.floor||1));if(!same.length)return;const t=Number(run.elapsed||0);let q=same[0];for(const p of same){if(p.t<=t)q=p;else break}if(!q||!visibleTo(focus,q.x,q.y))return;const s=typeof ws==="function"?ws(q.x,q.y):{x:q.x*C.tile,y:q.y*C.tile};ctx.save();ctx.globalAlpha=.28;ctx.fillStyle=P.cyan;ctx.shadowColor=P.cyan;ctx.shadowBlur=12;ctx.beginPath();ctx.arc(s.x+C.tile/2,s.y+C.tile/2,C.tile*.28,0,Math.PI*2);ctx.fill();ctx.font="bold 10px monospace";ctx.textAlign="center";ctx.fillText(g.playerName||"WEEKLY GHOST",s.x+C.tile/2,s.y-4);ctx.restore();}

  function updateRare(dt){if(!host||!run||mode!=="playing")return;announceStartSystems();updateMerchant(dt);updateAdventurer(dt);updateBat(dt);updateTaxman(dt);updateTremor();if(state.golden?.active){state.golden.timeMs-=dt;state.golden.waveMs-=dt;if(state.golden.waveMs<=0){state.golden.waveMs=6500;spawnGoldenWave()}if(state.golden.timeMs<=0)finishGoldenRoom()}for(const p of localPlayersSafe())beginGoldenRoom(p);updateCabinet(dt);updateMysteryEffects(dt);updateTreasureMap();updateBounty();updateHints(dt);recordGhost(dt);}

  function specialDeath(enemy){
    if(!enemy||state.specialDeaths.has(enemy.id))return;state.specialDeaths.add(enemy.id);
    if(enemy.mimicEnemy){score+=550;host.chests.push({id:`mimic-reward-${Date.now()}`,x:enemy.x,y:enemy.y,locked:false,active:true,depth:15,roomId:roomAt(enemy.x,enemy.y),mimicReward:true});showToast("MIMIC DEFEATED","+550 score and a better-than-normal reward chest.","gold",8000)}
    if(enemy.treasureBat){score+=350;host.chests.push({id:`bat-reward-${Date.now()}`,x:enemy.x,y:enemy.y,locked:false,active:true,depth:14,roomId:roomAt(enemy.x,enemy.y),treasureBatReward:true});showToast("TREASURE BAT DOWN","+350 score. It dropped the prize it was carrying.","gold",7500)}
    if(enemy.taxman){const refund=Number(enemy.stolen||0)+200;score+=refund;addCredits(enemy.x,enemy.y,Math.min(refund,200),"TAX REFUND");showToast("TAXMAN CAUGHT",`Recovered ${Number(enemy.stolen||0)} stolen score plus a 200 score bonus.`,"gold",8000)}
    if(state.plans.cabinet?.active)state.plans.cabinet.kills++;
  }

  if(typeof startWorld==="function"){
    const original=startWorld;startWorld=function startWorldV115Rare(seed,split=false,preserve=false,checkpointRestore=false){const result=original.apply(this,arguments);try{planFloor(seed,Boolean(checkpointRestore))}catch(e){console.warn("[Lost Sizzler] rare-event planning failed",e)}return result};
  }
  if(window.CCGAI?.stepEnemies){const original=window.CCGAI.stepEnemies.bind(window.CCGAI);window.CCGAI.stepEnemies=function rareStepEnemies(hostState,map,players,dt,hooks,worldState){const hidden=[];for(const e of hostState?.enemies||[])if(e?.alive&&e.passiveNpc){hidden.push(e);e.alive=false}try{return original(hostState,map,players,dt,hooks,worldState)}finally{for(const e of hidden)if(!e._rareResolved)e.alive=true}}}
  if(typeof openChest==="function"){
    const original=openChest;openChest=function openChestV115Rare(player,chest){
      if(chest?.mimicChest&&chest.active){chest.active=false;chest.opened=true;const hp=10+Number(run.floor||1)*2,enemy=spawnSimpleEnemy(`mimic-${Date.now()}`,{x:chest.x,y:chest.y},"charger",hp,{armor:3+Number(run.floor||1),maxArmor:3+Number(run.floor||1),mimicEnemy:true,aiState:"chase",lastSeen:{x:player.x,y:player.y},memoryMs:999999});showToast("MIMIC CHEST!","That chest has teeth. Kill it for upgraded loot.","red",8500);return false}
      if(chest?.possessedCabinet&&chest.active){startCabinetChallenge(chest,player);return false}
      return original.apply(this,arguments);
    };
  }
  if(typeof applyItem==="function"){
    const original=applyItem;applyItem=function applyItemV115Rare(item,player){
      if(item?.treasureMap){item.active=false;activateTreasureMap(item);return true}
      if(item?.cursedCartridge){const result=original.apply(this,arguments);applyCurse(player);return result}
      return original.apply(this,arguments);
    };
  }
  if(typeof usePotion==="function"){
    const original=usePotion;usePotion=function usePotionV115Rare(player){const ix=(player?.inventory||[]).findIndex(i=>i?.kind==="potion"&&i.mysteryPotion);if(ix>=0){const item=player.inventory.splice(ix,1)[0];mysteryPotion(player,item);sync?.();return true}return original.apply(this,arguments)};
  }
  if(typeof triggerShrine==="function"){
    const original=triggerShrine;triggerShrine=function triggerShrineV115Rare(player){const had=Boolean(player?._cursedCartridge),result=original.apply(this,arguments);if(had)clearCurse(player,"shrine");return result};
  }
  if(typeof floorComplete==="function"){
    const original=floorComplete;floorComplete=function floorCompleteV115Rare(){for(const p of localPlayersSafe())clearCurse(p,"floor");return original.apply(this,arguments)};
  }
  if(typeof damageEnemy==="function"){
    const original=damageEnemy;damageEnemy=function damageEnemyV115Rare(enemy,power,element="energy",attacker=p1){const was=Boolean(enemy?.alive),result=original.apply(this,arguments);if(was&&enemy&&!enemy.alive)specialDeath(enemy);return result};
  }
  if(typeof hurtPlayer==="function"){
    const original=hurtPlayer;hurtPlayer=function hurtPlayerV115Rare(player,n,friendly=false,source="enemy"){const before=Number(run?.stats?.damageTaken||0),result=original.apply(this,arguments),after=Number(run?.stats?.damageTaken||0);if(after>before&&state.bounty?.type==="NO DAMAGE — 6 KILLS")state.bounty.tookDamage=true;return result};
  }
  if(typeof updateRoomMessage==="function"){
    const original=updateRoomMessage;updateRoomMessage=function updateRoomMessageV115Rare(player,force){const result=original.apply(this,arguments),room=world?.rooms?.[roomAt(player.x,player.y)];if(room?.developerRoom&&!state.announcedRooms.has(`dev-${room.id}`)){state.announcedRooms.add(`dev-${room.id}`);showToast("SECRET CCG DEVELOPER ROOM","A hidden developer cache. Expect CCG references, bonus loot and a few things that were probably left in debug mode on purpose.","purple",10000)}return result};
  }
  if(typeof renderRadarPanel==="function"){
    const original=renderRadarPanel;renderRadarPanel=function renderRadarPanelV115Rare(){const result=original.apply(this,arguments);try{drawRadarHint()}catch(_){}return result};
  }
  if(typeof drawEnemy==="function"){
    const original=drawEnemy;drawEnemy=function drawEnemyV115Rare(enemy){if(enemy?.lostAdventurer||enemy?.treasureBat||enemy?.taxman){const s=typeof enemyScreen==="function"?enemyScreen(enemy):ws(enemy.x,enemy.y),cx=s.x+C.tile/2,cy=s.y+C.tile/2;ctx.save();ctx.shadowBlur=8;ctx.shadowColor=enemy.treasureBat?P.gold:enemy.taxman?P.red:P.cyan;ctx.fillStyle=enemy.treasureBat?"#7b4cc7":enemy.taxman?"#49352a":"#6aa9ff";ctx.beginPath();if(enemy.treasureBat){ctx.moveTo(cx,cy-7);ctx.lineTo(cx-15,cy);ctx.lineTo(cx,cy+5);ctx.lineTo(cx+15,cy);ctx.closePath()}else ctx.arc(cx,cy,C.tile*.28,0,Math.PI*2);ctx.fill();ctx.fillStyle=P.white;ctx.font="bold 9px monospace";ctx.textAlign="center";ctx.fillText(enemy.treasureBat?"TREASURE BAT":enemy.taxman?"TAXMAN":"LOST ADVENTURER",cx,s.y-5);ctx.restore();return}return original.apply(this,arguments)};
  }
  if(typeof render==="function"){
    const original=render;render=function renderV115Rare(){const result=original.apply(this,arguments);try{drawGhost()}catch(_){}return result};
  }
  if(typeof update==="function"){
    const original=update;update=function updateV115Rare(dt){const result=original.apply(this,arguments);try{updateRare(Number(dt)||0)}catch(e){console.warn("[Lost Sizzler] rare-event update failed",e)}return result};
  }

  // If the weekly challenge submission function is available, append a compact
  // movement trail. A backend that understands ghostPath can replay real runs;
  // older backends simply ignore this additional result field.
  if(window.CCGWeeklyChallenge?.finish){const original=window.CCGWeeklyChallenge.finish.bind(window.CCGWeeklyChallenge);window.CCGWeeklyChallenge.finish=async result=>original({...result,ghostPath:state.ghostRecord.slice(0,360)})}

  window.CCGLostSizzlerRareEvents={get state(){return state},CHANCE,objectiveTarget,drawRadarHint};
})();
