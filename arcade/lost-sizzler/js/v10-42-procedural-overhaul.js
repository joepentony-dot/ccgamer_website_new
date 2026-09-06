/* The Lost Sizzler V10.42 — procedural single-dungeon + RPG progression overhaul. */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V142_PROCEDURAL_OVERHAUL__)return;
  window.__CCG_LOST_SIZZLER_V142_PROCEDURAL_OVERHAUL__=true;

  const CFG=window.CCG_CONFIG;
  const WORLD=window.CCGWorld;
  const PROG=window.CCGProgression;
  const SYSTEMS=window.CCGSystems;
  const PD=CFG?.proceduralDungeon;
  if(!CFG||!WORLD||!PROG||!SYSTEMS||!PD?.enabled)return;

  const RPG_BASE=5;
  const RPG_STATS=[
    {id:"might",name:"MIGHT",short:"MGT",desc:"Physical and weapon power. Every second point above 5 adds +1 weapon damage."},
    {id:"vitality",name:"VITALITY",short:"VIT",desc:"Maximum health and recovery. Every point adds +1 maximum health and heals 1 immediately."},
    {id:"agility",name:"AGILITY",short:"AGI",desc:"Movement and combat handling. Every point makes movement 3% faster."},
    {id:"endurance",name:"ENDURANCE",short:"END",desc:"Ammunition reserve and staying power. Every point adds +14 maximum ammunition and +1 armour immediately."},
    {id:"luck",name:"LUCK",short:"LCK",desc:"Improves the quality of generated chest loot and rare equipment rolls."},
    {id:"arcana",name:"ARCANA",short:"ARC",desc:"Strengthens Sigil powers and Banishment alchemy. Higher Arcana extends Reveal and improves Ward recharge."}
  ];

  const DOMAIN_STATS={
    iron:{kind:"knight",hp:20,armor:8,moveCooldown:820,attackCooldown:720},
    bone:{kind:"skeleton",hp:17,armor:5,moveCooldown:650,attackCooldown:690},
    ash:{kind:"firebreather",hp:19,armor:6,moveCooldown:720,attackCooldown:660}
  };

  const RELICS=[
    {id:"archive-plate",name:"ARCHIVE PLATE",desc:"+2 maximum health and heal 2 now.",apply:p=>{p.maxHealth+=2;p.health=Math.min(p.maxHealth,p.health+2)}},
    {id:"sid-capacitor",name:"SID CAPACITOR",desc:"+50 maximum ammunition and refill 50.",apply:p=>{p.maxMana+=50;p.mana=Math.min(p.maxMana,p.mana+50)}},
    {id:"hot-fire-button",name:"HOT FIRE BUTTON",desc:"+1 weapon damage, but maximum ammunition falls by 20.",apply:p=>{p.damageBonus=(p.damageBonus||0)+1;p.maxMana=Math.max(60,p.maxMana-20);p.mana=Math.min(p.mana,p.maxMana)}},
    {id:"competition-pro-spring",name:"COMPETITION PRO SPRING",desc:"Movement becomes another 10% faster.",apply:p=>{p.moveMultiplier=(p.moveMultiplier||1)*.90}},
    {id:"scavenger-rom",name:"SCAVENGER ROM",desc:"Ammo packs become 35% more effective and potions heal one extra point.",apply:p=>{p.scavenger=(p.scavenger||0)+.35;p.potionBonus=(p.potionBonus||0)+1}},
    {id:"alchemist-seal",name:"ALCHEMIST'S SEAL",desc:"Banishment Charges require one less Essence, to a minimum of two.",apply:p=>{p.banishmentEssenceCost=Math.max(2,essenceCost(p)-1)}},
    {id:"cartographer-chip",name:"CARTOGRAPHER CHIP",desc:"Normal sight increases by one tile for the rest of the run.",apply:p=>{p.v142SightBonus=(p.v142SightBonus||0)+1}},
    {id:"blood-cartridge",name:"BLOOD CARTRIDGE",desc:"Every ten enemy kills restore one health.",apply:p=>{p.v142BloodCartridge=true;p.v142BloodHealAt=(Number(currentRun()?.stats?.kills)||0)+10}},
    {id:"ward-amplifier",name:"WARD AMPLIFIER",desc:"Once Ward awakens, it restores protective armour more frequently.",apply:p=>{p.v142WardCooldownMs=18000}}
  ];

  function seededRandom(text){return typeof PROG.seededRandom==="function"?PROG.seededRandom(text):Math.random}
  function shuffle(values,r){const out=[...values];for(let i=out.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[out[i],out[j]]=[out[j],out[i]]}return out}
  function cell(x,y){return `${x},${y}`}
  function distance(a,b){return Math.abs(a.x-b.x)+Math.abs(a.y-b.y)}
  function currentRun(){try{return typeof run!=="undefined"?run:null}catch(_){return null}}
  function currentHost(){try{return typeof host!=="undefined"?host:null}catch(_){return null}}
  function currentWorld(){try{return typeof world!=="undefined"?world:null}catch(_){return null}}
  function currentPlayer(){try{return typeof p1!=="undefined"?p1:null}catch(_){return null}}
  function currentMode(){try{return typeof mode!=="undefined"?mode:"menu"}catch(_){return"menu"}}
  function setMode(value){try{mode=value}catch(_){} }
  function announce(title,text,tone="gold",duration=8500){try{showToast(title,text,tone,duration)}catch(_){} }
  function broadcast(){try{broadcastWorld()}catch(_){} }
  function syncNow(){try{sync()}catch(_){} }

  function initRpg(player){
    if(!player)return player;
    player.rpgStats=player.rpgStats&&typeof player.rpgStats==="object"?player.rpgStats:{};
    for(const stat of RPG_STATS)player.rpgStats[stat.id]=Math.max(RPG_BASE,Math.floor(Number(player.rpgStats[stat.id])||RPG_BASE));
    player.relics=Array.isArray(player.relics)?player.relics:[];
    player.banishmentVessel=true;
    player.banishmentEssence=Math.max(0,Math.floor(Number(player.banishmentEssence)||0));
    player.banishmentEssenceCost=Math.max(2,Math.floor(Number(player.banishmentEssenceCost)||Number(PD.essenceRequired)||3));
    return player;
  }
  function stat(player,id){initRpg(player);return Math.max(RPG_BASE,Number(player?.rpgStats?.[id])||RPG_BASE)}
  function essenceCost(player){return Math.max(2,Math.floor(Number(player?.banishmentEssenceCost)||Number(PD.essenceRequired)||3))}
  function statSummary(player){return RPG_STATS.map(row=>`${row.short} ${stat(player,row.id)}`).join(" · ")}

  if(typeof makePlayer==="function"){
    const baseMakePlayer=makePlayer;
    makePlayer=function(...args){return initRpg(baseMakePlayer(...args))};
  }
  if(typeof preservePlayer==="function"){
    const basePreservePlayer=preservePlayer;
    preservePlayer=function(old,...args){
      const result=initRpg(basePreservePlayer(old,...args));
      if(old?.rpgStats)result.rpgStats={...old.rpgStats};
      if(Array.isArray(old?.relics))result.relics=[...old.relics];
      for(const key of ["banishmentVessel","banishmentEssence","banishmentEssenceCost","sigilReveal","sigilWard","sigilBind","sigilBanish","v142SightBonus","v142WardCooldownMs","v142BloodCartridge","v142BloodHealAt"]){if(old?.[key]!==undefined)result[key]=old[key]}
      return result;
    };
  }

  const baseSkillChoices=PROG.skillChoices.bind(PROG);
  const baseApplySkill=PROG.applySkill.bind(PROG);
  PROG.skillChoices=function(player){
    initRpg(player);
    const r=seededRandom(`${currentRun()?.seed||"CCG"}-LV${player?.level||1}-${statSummary(player)}`);
    return shuffle(RPG_STATS,r).slice(0,4).map(row=>({
      id:`v142-stat-${row.id}`,
      name:`${row.name} +1`,
      desc:`${row.desc} Current ${row.short}: ${stat(player,row.id)} → ${stat(player,row.id)+1}.`
    }));
  };
  PROG.applySkill=function(player,id){
    if(!String(id).startsWith("v142-stat-"))return baseApplySkill(player,id);
    initRpg(player);const statId=String(id).slice("v142-stat-".length),row=RPG_STATS.find(x=>x.id===statId);if(!row)return null;
    const before=stat(player,statId),after=before+1;player.rpgStats[statId]=after;
    if(statId==="might"&&Math.floor((after-RPG_BASE)/2)>Math.floor((before-RPG_BASE)/2))player.damageBonus=(player.damageBonus||0)+1;
    if(statId==="vitality"){player.maxHealth+=1;player.health=Math.min(player.maxHealth,player.health+1)}
    if(statId==="agility")player.moveMultiplier=(player.moveMultiplier||1)*.97;
    if(statId==="endurance"){player.maxMana+=14;player.mana=Math.min(player.maxMana,player.mana+14);player.armor=Math.min(12,(player.armor||0)+1)}
    if(statId==="arcana"){if(after%3===0)player.banishmentEssenceCost=Math.max(2,essenceCost(player)-1);player.v142WardCooldownMs=Math.max(14000,30000-(after-RPG_BASE)*1800)}
    player.pendingLevels=Math.max(0,(player.pendingLevels||1)-1);player.skills=player.skills||[];player.skills.push(id);
    return{id,name:`${row.name} ${after}`,desc:`${row.name} increased to ${after}. ${row.desc}`};
  };

  const baseLootForChest=PROG.lootForChest.bind(PROG);
  PROG.lootForChest=function(chest,runState,r=Math.random){
    const player=currentPlayer(),luck=Math.max(0,stat(player,"luck")-RPG_BASE),boost=luck*1.35;
    return baseLootForChest({...chest,depth:(Number(chest?.depth)||0)+boost},runState,r);
  };
  const baseEffectiveSight=PROG.effectiveSight.bind(PROG);
  PROG.effectiveSight=function(player,runState){
    initRpg(player);const arcana=Math.max(0,stat(player,"arcana")-RPG_BASE),reveal=player?.sigilReveal?2+Math.floor(arcana/3):0;
    return baseEffectiveSight(player,runState)+reveal+Math.max(0,Number(player?.v142SightBonus)||0);
  };

  const baseInventoryCanAdd=PROG.inventoryCanAdd.bind(PROG);
  const baseInventoryAdd=PROG.inventoryAdd.bind(PROG);
  const baseInventoryKindCount=PROG.inventoryKindCount.bind(PROG);
  PROG.inventoryCanAdd=function(player,item){if(item?.kind==="artefact")return true;return baseInventoryCanAdd(player,item)};
  PROG.inventoryAdd=function(player,item){
    if(item?.kind!=="artefact")return baseInventoryAdd(player,item);
    initRpg(player);player.banishmentEssence+=Math.max(1,Math.floor(Number(item?.qty)||1));return true;
  };
  PROG.inventoryKindCount=function(player,kind){if(kind==="artefact")return Math.max(0,Math.floor(Number(player?.banishmentEssence)||0));return baseInventoryKindCount(player,kind)};

  function gameDeck(seed){
    const buckets=CFG.c64LootByLetter||{},r=seededRandom(`${seed||"CCG"}-V10.42-AZ-GAME-DECK`),deck=[];
    for(let code=65;code<=90;code++){
      const letter=String.fromCharCode(code),pool=Array.isArray(buckets[letter])?buckets[letter].filter(Boolean):[];
      if(pool.length)deck.push({letter,title:pool[Math.floor(r()*pool.length)]});
    }
    return shuffle(deck,r);
  }
  function occupiedSet(w,h){
    const used=new Set([cell(w.start.x,w.start.y),cell(w.exit.x,w.exit.y)]);
    for(const row of h.items||[])if(row.active!==false)used.add(cell(row.x,row.y));
    for(const row of h.enemies||[])if(row.alive!==false)used.add(cell(row.x,row.y));
    for(const row of h.chests||[])if(row.active!==false)used.add(cell(row.x,row.y));
    for(const row of h.doors||[])used.add(cell(row.x,row.y));
    return used;
  }
  function roomCells(w,room,used){
    const out=[];if(!room)return out;
    for(let y=room.y+1;y<room.y+room.h;y++)for(let x=room.x+1;x<room.x+room.w;x++)if(w.map[y]?.[x]===0&&!used.has(cell(x,y)))out.push({x,y});
    return out;
  }

  const baseCreateHostState=WORLD.createHostState.bind(WORLD);
  WORLD.createHostState=function(w){
    const h=baseCreateHostState(w),runState=currentRun(),seed=runState?.seed||"CCG",r=seededRandom(`${seed}-V10.42-DOMAINS`),used=occupiedSet(w,h);
    const keys=(h.items||[]).filter(item=>item.kind==="key"&&item.active!==false).sort((a,b)=>String(a.id).localeCompare(String(b.id))).slice(0,CFG.keyTarget);
    keys.forEach((key,index)=>{
      const domain=(PD.keyDomains||[])[index];if(!domain)return;
      key.title=domain.name;key.domainId=domain.id;key.domainName=domain.name;key.sigilPower=domain.sigilPower;
      const roomId=WORLD.roomAt(w,key.x,key.y),room=w.rooms?.[roomId];if(room){room.keyDomain=domain.id;room.keyDomainName=domain.name;room.theme=domain.theme||room.theme;room.dangerous=true}
      const cells=roomCells(w,room,used).filter(q=>distance(q,key)>=3).sort((a,b)=>distance(b,key)-distance(a,key)),q=cells[Math.floor(r()*Math.max(1,Math.min(cells.length,8)))]||cells[0];if(!q)return;
      used.add(cell(q.x,q.y));const stats=DOMAIN_STATS[domain.id]||DOMAIN_STATS.iron;
      const guardian={id:`v142-${domain.id}-guardian`,x:q.x,y:q.y,kind:stats.kind,hp:stats.hp,maxHp:stats.hp,armor:stats.armor,maxArmor:stats.armor,alive:true,aiState:"idle",facing:{x:index%2?1:-1,y:0},lastSeen:null,memoryMs:0,searchMs:0,moveCooldown:stats.moveCooldown,attackCooldown:stats.attackCooldown,chargeCooldown:900,healCooldown:999999,flash:0,hpBarMs:0,keyGuardian:true,guardian:true,domainId:domain.id,weakness:domain.weakness,championName:domain.guardian||`${domain.name} Warden`};
      h.enemies.push(guardian);key.lockedByEnemyId=guardian.id;
    });

    h.items=(h.items||[]).filter(item=>item.kind!=="game");
    const deck=gameDeck(seed),gameUsed=occupiedSet(w,h),rooms=(w.rooms||[]).filter(room=>!room.optional&&room.id!==w.startRoomId&&room.id!==w.exitRoomId),positionR=seededRandom(`${seed}-V10.42-AZ-POSITIONS`);
    let positions=[];for(const room of rooms)positions.push(...roomCells(w,room,gameUsed));positions=shuffle(positions,positionR);
    for(const [index,pick] of deck.entries()){
      let q=null;while(positions.length&&!q){const candidate=positions.shift();if(!gameUsed.has(cell(candidate.x,candidate.y)))q=candidate}if(!q)break;gameUsed.add(cell(q.x,q.y));
      h.items.push({id:`v142-game-${pick.letter}-${index}`,...q,kind:"game",title:pick.title,alphabetLetter:pick.letter,v142AlphabetPickup:true,active:true});
    }
    h.v142AlphabetDeck=deck.map(row=>`${row.letter}:${row.title}`);h.v142KeyDomains=keys.map(key=>({id:key.domainId,title:key.title,guardianId:key.lockedByEnemyId}));
    return h;
  };

  const baseDecorate=SYSTEMS.decorate.bind(SYSTEMS);
  SYSTEMS.decorate=function(w,h,runState){
    const result=baseDecorate(w,h,runState);h.v142ProceduralDungeon=true;h.v142EssenceSources=[];
    if(h.trader){h.trader.title="BANISHMENT ALCHEMIST";h.trader.v142Alchemist=true;h.trader.cost=Number(PD.essenceRequired)||3}
    const sanctuary=(w.sanctuaryRooms||[]).map(id=>w.rooms?.[id]).filter(Boolean)[0];
    if(sanctuary){const used=occupiedSet(w,h),q=roomCells(w,sanctuary,used)[0];if(q){const alchemist={id:"v142-sanctuary-alchemist",...q,roomId:sanctuary.id,active:true,cost:Number(PD.essenceRequired)||3,shopType:"alchemist",title:"BANISHMENT ALCHEMIST",scorePurchases:0,v142Alchemist:true,sold:{}};h.shops=h.shops||[];h.shops.push(alchemist);sanctuary.alchemistRoom=true}}
    return result;
  };

  function awardEssence(player,amount,source){
    if(!player||amount<=0)return false;initRpg(player);player.banishmentEssence+=amount;const need=essenceCost(player),have=player.banishmentEssence;
    announce("BANISHMENT ESSENCE",`${source}. Vessel ${have}/${need}${have>=need?" — a Banishment Charge can be distilled at an Alchemist.":"."}`,"purple",7600);return true;
  }

  function scanEssenceSources(){
    const h=currentHost(),player=currentPlayer();if(!h||!player||currentMode()!=="playing")return;
    for(const enemy of h.enemies||[]){
      if(enemy.alive||enemy.v142EssenceAwarded)continue;
      if(!(enemy.keyGuardian||enemy.follower||enemy.champion||enemy.guardian||enemy.ccgBoss))continue;
      enemy.v142EssenceAwarded=true;awardEssence(player,1,`${enemy.championName||enemy.follower?.name||"A major dungeon threat"} released spectral residue`);
    }
    for(const generator of h.generators||[])if(!generator.alive&&!generator.v142EssenceAwarded){generator.v142EssenceAwarded=true;awardEssence(player,1,"A corrupted dungeon anchor was cleansed")}
    for(const shrine of h.shrines||[])if(!shrine.active&&!shrine.v142EssenceAwarded){shrine.v142EssenceAwarded=true;awardEssence(player,1,"A spent shrine released supernatural residue")}
    for(const arena of h.arenas||[])if(arena.cleared&&!arena.v142EssenceAwarded){arena.v142EssenceAwarded=true;awardEssence(player,1,"The sealed combat chamber was cleansed")}
  }

  function applySigilPower(player,domain){
    if(!player||!domain)return;initRpg(player);
    const power=String(domain.sigilPower||"").toUpperCase();
    if(power==="REVEAL")player.sigilReveal=true;
    if(power==="WARD"){player.sigilWard=true;player.v142WardReadyAt=0}
    if(power==="BIND"){player.sigilBind=true;player.v142BindReadyAt=0}
    announce(`SIGIL POWER AWAKENED — ${power}`,power==="REVEAL"?"The Sigil now expands your sight and helps expose the dungeon around you.":power==="WARD"?"The Sigil now rebuilds a point of protective armour at intervals while you remain below the armour limit.":"The Sigil now pulses against nearby supernatural pursuers, briefly slowing their pressure.","gold",9500);
  }

  function ensureRelicModal(){
    let modal=document.getElementById("v142-relic-choice");if(modal)return modal;
    const style=document.createElement("style");style.id="v142-overhaul-style";style.textContent=`
      #v142-relic-choice{position:fixed;inset:0;z-index:12100;display:grid;place-items:center;padding:18px;background:rgba(2,1,6,.84);backdrop-filter:blur(4px)}#v142-relic-choice.hidden{display:none!important}
      #v142-relic-choice .v142-card{width:min(900px,95vw);max-height:88dvh;overflow:auto;padding:24px;border:2px solid #ffd85a;border-radius:16px;background:linear-gradient(160deg,#130c20,#070912);box-shadow:0 20px 80px #000;text-align:left}
      #v142-relic-choice h2{margin:4px 0 8px;color:#ffd85a}#v142-relic-choice p{color:#d8cfdf}.v142-relic-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-top:18px}.v142-relic-grid button{min-height:150px;padding:16px;text-align:left;border:1px solid #6cecff;background:#0f1521;color:#fff}.v142-relic-grid button b{display:block;margin-bottom:8px;color:#ffd85a}.v142-relic-grid button span{font-size:.83rem;line-height:1.4;color:#d9d5df}
      .v142-rpg-sheet{margin:12px 0;padding:12px;border:1px solid rgba(108,236,255,.35);border-radius:10px;background:rgba(10,18,28,.72)}.v142-rpg-sheet h3{margin:0 0 8px;color:#ffd85a}.v142-rpg-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}.v142-rpg-stat{padding:8px;border:1px solid rgba(255,255,255,.09);background:rgba(255,255,255,.04)}.v142-rpg-stat b{display:block;color:#6cecff}.v142-rpg-stat span{font-size:.72rem;color:#c9c2d0}.v142-rpg-meta{margin-top:8px;font-size:.78rem;color:#e5d9ef}
      @media(max-width:700px){.v142-relic-grid,.v142-rpg-grid{grid-template-columns:1fr}#v142-relic-choice .v142-card{padding:17px}}
    `;document.head.appendChild(style);
    modal=document.createElement("section");modal.id="v142-relic-choice";modal.className="hidden";modal.setAttribute("role","dialog");modal.setAttribute("aria-modal","true");document.body.appendChild(modal);return modal;
  }
  function offerRelic(player,domain){
    initRpg(player);const modal=ensureRelicModal(),owned=new Set(player.relics||[]),pool=RELICS.filter(row=>!owned.has(row.id)),r=seededRandom(`${currentRun()?.seed||"CCG"}-${domain?.id||"KEY"}-RELIC-${player.level}`),choices=shuffle(pool.length>=3?pool:RELICS,r).slice(0,3);
    if(!choices.length)return;const previous=currentMode();setMode("v142relic");try{input.clear()}catch(_){}
    modal.innerHTML=`<div class="v142-card"><small>KEY DOMAIN CLEARED</small><h2>CHOOSE A RELIC</h2><p>${domain?.name||"A dungeon Key"} has awakened part of the Sigil. Choose one relic to shape this run.</p><div class="v142-relic-grid">${choices.map(row=>`<button type="button" data-relic="${row.id}"><b>${row.name}</b><span>${row.desc}</span></button>`).join("")}</div></div>`;
    modal.querySelectorAll("[data-relic]").forEach(button=>button.addEventListener("click",()=>{const relic=choices.find(row=>row.id===button.dataset.relic);if(!relic)return;relic.apply(player);player.relics.push(relic.id);modal.classList.add("hidden");setMode(previous==="v142relic"?"playing":previous||"playing");announce(`RELIC CLAIMED — ${relic.name}`,relic.desc,"green",8000);syncNow()}));modal.classList.remove("hidden");
  }

  function guardianAliveFor(key,h){return key?.lockedByEnemyId&&h?.enemies?.some(enemy=>enemy.id===key.lockedByEnemyId&&enemy.alive)}
  function beginEscape(player){
    const r=currentRun(),h=currentHost();if(!r||!h||r.v142EscapePhase)return;r.v142EscapePhase=true;r.alert=Math.max(Number(r.alert)||0,Number(PD.escapeAlert)||78);player.sigilBanish=true;
    if(PROG.inventoryCanAdd(player,{kind:"banishment"}))PROG.inventoryAdd(player,{kind:"banishment",name:"Sigil Banishment Charge",short:"BANISH"});
    if(h.stalker){h.stalker.spawnTimer=0;h.stalker.v142EscapeAwakened=true}
    for(const enemy of h.enemies||[])if(enemy.alive&&enemy.deathStalker){enemy.aiState="chase";enemy.lastSeen={x:player.x,y:player.y};enemy.memoryMs=999999;enemy.searchMs=0;enemy.moveCooldown=Math.min(enemy.moveCooldown||650,320)}
    announce("THE SIGIL IS COMPLETE — ESCAPE",`All three Keys are bound to the Sigil. The dungeon is now fully awake. The exit is your objective; a final Banishment Charge has been granted for the run out.`,"red",12000);broadcast();syncNow();
  }

  if(typeof movementTriggers==="function"){
    const baseMovementTriggers=movementTriggers;
    movementTriggers=function(player){
      const h=currentHost(),beforeKeys=Number(h?.keysCollected)||0,beforeSigil=Boolean(h?.exitSigilCollected),blocking=h?.items?.find(item=>item.active&&item.kind==="key"&&item.x===player?.x&&item.y===player?.y&&guardianAliveFor(item,h));
      if(blocking){const was=blocking.active;blocking.active=false;try{baseMovementTriggers(player)}finally{blocking.active=was}const guard=h.enemies.find(enemy=>enemy.id===blocking.lockedByEnemyId);announce(`${blocking.title||"KEY"} IS WARDEN-BOUND`,`${guard?.championName||"Its guardian"} still lives. Defeat the guardian before claiming this Key.`,"red",5800);return}
      const result=baseMovementTriggers(player),afterKeys=Number(h?.keysCollected)||0;
      if(afterKeys>beforeKeys){
        const claimed=h.items?.filter(item=>item.kind==="key"&&item.active===false&&item.domainId).find(item=>!(currentRun()?.v142ClaimedDomains||[]).includes(item.domainId));
        if(claimed){const r=currentRun();r.v142ClaimedDomains=Array.isArray(r.v142ClaimedDomains)?r.v142ClaimedDomains:[];r.v142ClaimedDomains.push(claimed.domainId);const domain=(PD.keyDomains||[]).find(row=>row.id===claimed.domainId);applySigilPower(player,domain);setTimeout(()=>offerRelic(player,domain),300)}
        if(afterKeys>=CFG.keyTarget){const r=currentRun();r.v142ThreeKeys=true;r.alert=Math.max(Number(r.alert)||0,55);announce("THREE KEYS RECOVERED","Iron, Bone and Ash now resonate with the Sigil chamber. Find the Sigil, defeat its defenders and prepare for the escape phase.","gold",10000)}
      }
      if(!beforeSigil&&h?.exitSigilCollected)beginEscape(player);
      return result;
    };
  }

  if(typeof renderShop==="function"){
    const baseRenderShop=renderShop;
    renderShop=function(){
      const result=baseRenderShop();if(!activeShop?.v142Alchemist&&!activeShop?.title?.includes("ALCHEMIST"))return result;
      if(UI.shopTitle)UI.shopTitle.textContent="BANISHMENT ALCHEMIST";
      if(UI.shopCopy)UI.shopCopy.textContent=`Banishment Essence is stored in your Vessel and never uses an inventory slot. Distil ${essenceCost(currentPlayer())} Essence into one permanent Banishment Charge for this run.`;
      if(UI.shopArtefacts)UI.shopArtefacts.textContent=String(currentPlayer()?.banishmentEssence||0);
      const trade=UI.shopItems?.querySelector?.('[data-shop-buy="banishment"]');if(trade){trade.textContent="DISTIL CHARGE";const article=trade.closest("article");if(article){const title=article.querySelector("h3");if(title)title.textContent="DISTIL BANISHMENT CHARGE";const price=article.querySelector(".price");if(price)price.textContent=`${essenceCost(currentPlayer())} ESSENCE`;const copy=article.querySelector("p");if(copy)copy.textContent="Consumes Essence from the Vessel and creates one Banishment Charge."}}
      const scoreBuy=UI.shopItems?.querySelector?.('[data-shop-buy="banishmentScore"]');scoreBuy?.closest("article")?.remove();return result;
    };
  }
  if(typeof buyShopItem==="function"){
    const baseBuyShopItem=buyShopItem;
    buyShopItem=function(id){
      if(id!=="banishment"&&id!=="banishmentScore")return baseBuyShopItem(id);
      const player=currentPlayer();if(!player)return false;initRpg(player);const need=essenceCost(player),have=player.banishmentEssence||0;
      if(have<need){announce("NOT ENOUGH BANISHMENT ESSENCE",`The Alchemist requires ${need} Essence. Your Vessel currently holds ${have}.`,"red",6500);return false}
      if(!PROG.inventoryCanAdd(player,{kind:"banishment"})){announce("INVENTORY FULL","Free a slot or make room in an existing Banishment stack before distilling a charge.","red",6500);return false}
      player.banishmentEssence-=need;PROG.inventoryAdd(player,{kind:"banishment",name:"Banishment Charge",short:"BANISH"});announce("BANISHMENT CHARGE DISTILLED",`${need} Essence consumed. The Vessel now holds ${player.banishmentEssence} Essence.`,"gold",8000);try{S.sfx("shrine")}catch(_){}broadcast();try{renderShop()}catch(_){}syncNow();return true;
    };
  }

  if(typeof itemHelp==="function"){
    const baseItemHelp=itemHelp;
    itemHelp=function(kind){
      if(kind==="artefact")return `Banishment Essence is harvested from major threats, corrupted anchors and cleansed events. It is stored in the Vessel and does not consume an inventory slot.`;
      if(kind==="banishment")return `A distilled Banishment Charge. Use B when a Death Stalker or Count Loadula is within ${CFG.stalker.banishPromptDistance||8} tiles.`;
      if(kind==="key")return "One of the three domain Keys: Iron, Bone or Ash. Its guardian must die before it can be claimed, and each Key awakens another Sigil power.";
      if(kind==="exitSigil")return "The awakened Sigil. Claim it after recovering all three Keys and defeating its defenders to begin the final escape phase.";
      return baseItemHelp(kind);
    };
  }

  function renderRpgSheet(){
    const player=currentPlayer();if(!player||!UI?.inventory)return;initRpg(player);let sheet=document.getElementById("v142-rpg-sheet");if(!sheet){sheet=document.createElement("section");sheet.id="v142-rpg-sheet";sheet.className="v142-rpg-sheet";const list=UI.inventoryList;if(list?.parentElement)list.parentElement.insertBefore(sheet,list)}
    const relicNames=(player.relics||[]).map(id=>RELICS.find(row=>row.id===id)?.name||id).join(" · ")||"NONE";
    sheet.innerHTML=`<h3>CHARACTER ATTRIBUTES · LEVEL ${player.level||1}</h3><div class="v142-rpg-grid">${RPG_STATS.map(row=>`<div class="v142-rpg-stat"><b>${row.name} ${stat(player,row.id)}</b><span>${row.desc}</span></div>`).join("")}</div><div class="v142-rpg-meta"><b>SIGIL:</b> ${[player.sigilReveal&&"REVEAL",player.sigilWard&&"WARD",player.sigilBind&&"BIND",player.sigilBanish&&"BANISH"].filter(Boolean).join(" · ")||"DORMANT"} &nbsp; <b>VESSEL:</b> ${player.banishmentEssence||0}/${essenceCost(player)} ESSENCE &nbsp; <b>RELICS:</b> ${relicNames}</div>`;
  }
  if(typeof renderInventoryPanel==="function"){
    const baseRenderInventoryPanel=renderInventoryPanel;
    renderInventoryPanel=function(...args){const result=baseRenderInventoryPanel(...args);renderRpgSheet();return result};
  }
  if(typeof showNextLevelChoice==="function"){
    const baseShowNextLevelChoice=showNextLevelChoice;
    showNextLevelChoice=function(...args){const result=baseShowNextLevelChoice(...args),player=levelQueue?.[0]||currentPlayer();if(UI?.levelCopy&&player)UI.levelCopy.textContent=`${player.name} reached Level ${player.level}. Choose one RPG attribute to increase. ${statSummary(player)}.`;return result};
  }

  function updateSigilAndRelics(){
    const player=currentPlayer(),h=currentHost(),r=currentRun();if(!player||!h||!r||currentMode()!=="playing")return;initRpg(player);const now=performance.now();
    if(player.sigilWard&&now>=Number(player.v142WardReadyAt||0)&&player.armor<12){player.armor=Math.min(12,player.armor+1);const arcana=Math.max(0,stat(player,"arcana")-RPG_BASE),cool=Math.max(12000,Number(player.v142WardCooldownMs)||30000-arcana*1800);player.v142WardReadyAt=now+cool;announce("SIGIL WARD","The Sigil restored 1 armour.","cyan",4500)}
    if(player.sigilBind&&now>=Number(player.v142BindReadyAt||0)){
      const targets=(h.enemies||[]).filter(enemy=>enemy.alive&&enemy.deathStalker&&distance(enemy,player)<=8),countTarget=h.stalker?.awake&&distance(h.stalker,player)<=8?h.stalker:null;if(targets.length||countTarget){for(const enemy of targets){enemy.moveCooldown=Math.max(Number(enemy.moveCooldown)||0,1300);enemy.memoryMs=Math.min(Number(enemy.memoryMs)||0,1800)}if(countTarget)countTarget.stunMs=Math.max(Number(countTarget.stunMs)||0,900);player.v142BindReadyAt=now+12000;announce("SIGIL BIND","Nearby supernatural movement has been suppressed briefly.","purple",4500)}
    }
    if(player.v142BloodCartridge&&Number(r.stats?.kills||0)>=Number(player.v142BloodHealAt||10)){if(player.health<player.maxHealth){player.health=Math.min(player.maxHealth,player.health+1);announce("BLOOD CARTRIDGE","Ten kills converted into +1 health.","green",4500)}player.v142BloodHealAt=Number(player.v142BloodHealAt||0)+10}
  }

  function updateMenuCopy(){
    const blurb=document.querySelector("#menu .menu-blurb");if(blurb)blurb.textContent="A large procedural dungeon crawl built around three Key domains, RPG character stats, relic builds, Sigil powers, hidden routes, dangerous events and a final escape once the dungeon fully wakes up.";
    const features=[...document.querySelectorAll("#menu .feature-strip span")];if(features[0])features[0].innerHTML="<b>PROCEDURAL DUNGEON</b>A new interconnected layout, route and encounter mix every run";if(features[1])features[1].innerHTML="<b>RPG CHARACTER BUILD</b>Level Might, Vitality, Agility, Endurance, Luck and Arcana";if(features[2])features[2].innerHTML="<b>THREE KEYS & SIGIL</b>Defeat domain guardians, awaken Sigil powers and survive the escape";
    const note=document.getElementById("menu-note");if(note)note.textContent="Every run generates a new dungeon and a shuffled A–Z C64 collectible deck. Recover the Keys of Iron, Bone and Ash, build your character through RPG attributes and relics, awaken the Sigil and escape.";
    const floorStat=document.querySelector('.run-stat #hud-room')?.parentElement?.querySelector("span");if(floorStat)floorStat.textContent="DEPTH";
  }

  ensureRelicModal();updateMenuCopy();
  setInterval(()=>{scanEssenceSources();updateSigilAndRelics();if(currentMode()==="inventory")renderRpgSheet()},500);

  window.CCGLostSizzlerV142ProceduralOverhaul={
    version:"V10.42",
    rpgStats:RPG_STATS.map(row=>({...row})),
    relics:RELICS.map(({apply,...row})=>({...row})),
    gameDeck,
    initRpg,
    statSummary,
    essenceCost
  };
})();