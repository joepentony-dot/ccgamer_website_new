/* C64 Dungeon Carnage V10.42 — fifteen-floor campaign, campaign Keys and floor balance. */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V142_FIVE_DEPTH_CAMPAIGN__)return;
  window.__CCG_LOST_SIZZLER_V142_FIVE_DEPTH_CAMPAIGN__=true;

  let installTimer=0,attempts=0;
  function install(){
    const CFG=window.CCG_CONFIG,WORLD=window.CCGWorld,SYSTEMS=window.CCGSystems,AI=window.CCGAI,API=window.CCGLostSizzlerV142ProceduralOverhaul,PD=CFG?.proceduralDungeon;
    if(!CFG||!WORLD||!SYSTEMS||!AI||!API||!PD?.enabled||!Array.isArray(PD.campaignFloors))return false;
    if(window.CCGLostSizzlerV142FiveDepthCampaign)return true;

    const cell=(x,y)=>`${x},${y}`;
    const currentRun=()=>{try{return typeof run!=="undefined"?run:null}catch(_){return null}};
    const currentHost=()=>{try{return typeof host!=="undefined"?host:null}catch(_){return null}};
    const currentPlayer=()=>{try{return typeof p1!=="undefined"?p1:null}catch(_){return null}};
    const floorNumber=runState=>Math.max(1,Math.min(CFG.maxFloors,Math.floor(Number(runState?.floor)||1)));
    const floorConfig=runState=>PD.campaignFloors.find(row=>Number(row.floor)===floorNumber(runState))||PD.campaignFloors[0];
    const domainForFloor=runState=>{const f=floorNumber(runState);return (PD.keyDomains||[]).find(row=>Number(row.floor)===f)||null};
    const claimedDomains=runState=>Array.isArray(runState?.v142ClaimedDomains)?runState.v142ClaimedDomains:[];
    const globalKeyCount=runState=>new Set(claimedDomains(runState)).size;
    const announce=(title,text,tone="gold",duration=8500)=>{try{showToast(title,text,tone,duration)}catch(_){} };
    const BOSS_FLOORS=Object.freeze({
      5:Object.freeze({name:"THE CARTRIDGE MAW",hp:72,armor:10,style:"root",subtitle:"A fused vault-beast blocks the descent."}),
      10:Object.freeze({name:"THE SID ABOMINATION",hp:118,armor:16,style:"fire",subtitle:"The furnace has grown teeth."}),
      15:Object.freeze({name:"THE BLOOD ARCHIVIST",hp:180,armor:24,style:"shock",subtitle:"The Citadel's final keeper is waiting."})
    });
    function bossSpec(runState){return BOSS_FLOORS[floorNumber(runState)]||null}
    function bossEnemy(hostState){
      const fight=hostState?.r114BossFight;if(!fight)return null;
      return (hostState.enemies||[]).find(enemy=>enemy?.id===fight.bossId)||null
    }
    function bossDefeated(hostState){const fight=hostState?.r114BossFight;if(!fight)return true;const boss=bossEnemy(hostState);return Boolean(fight.cleared||!boss||boss.alive===false)}
    function bossCell(worldState,hostState,room){
      const cx=Math.floor(room.x+room.w/2),cy=Math.floor(room.y+room.h/2),candidates=[];
      for(let r=0;r<Math.max(room.w,room.h);r++)for(let y=Math.max(room.y+1,cy-r);y<=Math.min(room.y+room.h-1,cy+r);y++)for(let x=Math.max(room.x+1,cx-r);x<=Math.min(room.x+room.w-1,cx+r);x++){
        if(worldState.map[y]?.[x]!==0)continue;
        if((hostState.enemies||[]).some(e=>e?.alive&&e.x===x&&e.y===y))continue;
        candidates.push({x,y});if(candidates.length>8)return candidates[0]
      }
      return candidates[0]||{x:cx,y:cy}
    }
    function installGrotesqueBoss(worldState,hostState,runState){
      const floor=floorNumber(runState),spec=bossSpec(runState);if(!spec)return null;
      const room=worldState.rooms?.[worldState.exitRoomId];if(!room)return null;
      let boss=floor===CFG.maxFloors?(hostState.guardian||(hostState.enemies||[]).find(e=>e?.guardian&&!e.keyGuardian)):null;
      if(!boss){
        const q=bossCell(worldState,hostState,room);
        boss={id:`r114-grotesque-boss-f${floor}`,...q,kind:"guardian",hp:spec.hp,maxHp:spec.hp,armor:spec.armor,maxArmor:spec.armor,alive:true,aiState:"idle",facing:{x:-1,y:0},lastSeen:null,memoryMs:0,searchMs:0,moveCooldown:980,attackCooldown:940,chargeCooldown:1100,healCooldown:999999,flash:0,hpBarMs:0,guardian:true,ccgBoss:true}
        hostState.enemies.push(boss)
      }
      Object.assign(boss,{r114GrotesqueBoss:true,r114BossFloor:floor,r114BossName:spec.name,championName:spec.name,ccgBoss:true,guardian:true,hp:spec.hp,maxHp:spec.hp,armor:spec.armor,maxArmor:spec.armor,moveSpeedScale:floor===15?1.08:floor===10?1.02:.96,attackCooldown:floor===15?700:floor===10?780:860});
      room.r114BossRoom=true;room.dangerous=true;
      hostState.r114BossFight={floor,roomId:room.id,bossId:boss.id,name:spec.name,style:spec.style,subtitle:spec.subtitle,triggered:false,cleared:false,phase:1,attackMs:2400,rewarded:false};
      return hostState.r114BossFight
    }

    function floorPickupSlice(seed,floor){
      const deck=API.gameDeck(seed),distribution=Array.isArray(PD.pickupDistribution)?PD.pickupDistribution:[2,2,2,2,2,2,2,2,2,2,2,1,1,1,1];
      let start=0;for(let i=0;i<floor-1;i++)start+=Math.max(0,Number(distribution[i])||0);
      const count=Math.max(0,Number(distribution[floor-1])||0);
      return deck.slice(start,start+count);
    }
    function freeCells(worldState,hostState){
      const used=new Set([cell(worldState.start.x,worldState.start.y),cell(worldState.exit.x,worldState.exit.y)]);
      for(const list of [hostState.items,hostState.enemies,hostState.chests,hostState.doors,hostState.shops])for(const row of list||[])if(row.active!==false&&row.alive!==false)used.add(cell(row.x,row.y));
      const rooms=(worldState.rooms||[]).filter(room=>!room.optional&&room.id!==worldState.startRoomId&&room.id!==worldState.exitRoomId),cells=[];
      for(const room of rooms)for(let y=room.y+1;y<room.y+room.h;y++)for(let x=room.x+1;x<room.x+room.w;x++)if(worldState.map[y]?.[x]===0&&!used.has(cell(x,y)))cells.push({x,y,roomId:room.id});
      return cells;
    }
    function seededShuffle(values,seed){
      const r=typeof window.CCGProgression?.seededRandom==="function"?window.CCGProgression.seededRandom(seed):Math.random,out=[...values];
      for(let i=out.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[out[i],out[j]]=[out[j],out[i]]}return out;
    }
    function installFloorCollectibles(worldState,hostState,runState){
      const floor=floorNumber(runState),picks=floorPickupSlice(runState?.seed||"CCG",floor),positions=seededShuffle(freeCells(worldState,hostState),`${runState?.seed||"CCG"}-F${floor}-AZ-POSITIONS`);
      hostState.items=(hostState.items||[]).filter(item=>item.kind!=="game");
      for(const [index,pick] of picks.entries()){
        const q=positions.shift();if(!q)break;
        hostState.items.push({id:`v142-f${floor}-game-${pick.letter}-${index}`,x:q.x,y:q.y,roomId:q.roomId,kind:"game",title:pick.title,alphabetLetter:pick.letter,v142AlphabetPickup:true,v142CampaignFloor:floor,active:true});
      }
      hostState.v142FloorAlphabetDeck=picks.map(row=>`${row.letter}:${row.title}`);
      hostState.v142AlphabetDeck=API.gameDeck(runState?.seed||"CCG").map(row=>`${row.letter}:${row.title}`);
    }
    function configureDomainKey(hostState,runState){
      const domain=domainForFloor(runState),floor=floorNumber(runState),keys=(hostState.items||[]).filter(item=>item.kind==="key");
      if(!domain){
        hostState.items=(hostState.items||[]).filter(item=>item.kind!=="key");
        hostState.enemies=(hostState.enemies||[]).filter(enemy=>!enemy.keyGuardian);
        hostState.v142DomainKeyTarget=0;hostState.v142KeyDomains=[];return;
      }
      let key=keys.find(item=>item.domainId===domain.id)||keys[0]||null;
      hostState.items=(hostState.items||[]).filter(item=>item.kind!=="key"||item===key);
      hostState.enemies=(hostState.enemies||[]).filter(enemy=>!enemy.keyGuardian||enemy.domainId===domain.id);
      if(key){
        key.domainId=domain.id;key.domainName=domain.name;key.title=domain.name;key.sigilPower=domain.sigilPower;
        const guardian=(hostState.enemies||[]).find(enemy=>enemy.keyGuardian&&enemy.domainId===domain.id)||(hostState.enemies||[]).find(enemy=>enemy.keyGuardian);
        if(guardian){guardian.domainId=domain.id;guardian.championName=domain.guardian;guardian.weakness=domain.weakness;key.lockedByEnemyId=guardian.id}
        hostState.v142KeyDomains=[{id:domain.id,title:domain.name,guardianId:key.lockedByEnemyId}];
      }
      hostState.v142DomainKeyTarget=1;hostState.v142CampaignFloor=floor;
    }

    const baseCreateHostState=WORLD.createHostState.bind(WORLD);
    WORLD.createHostState=function(worldState){
      const hostState=baseCreateHostState(worldState),runState=currentRun(),cfg=floorConfig(runState);
      if(!runState)return hostState;
      runState.v142Campaign=true;runState.v142ClaimedDomains=Array.isArray(runState.v142ClaimedDomains)?runState.v142ClaimedDomains:[];
      configureDomainKey(hostState,runState);installFloorCollectibles(worldState,hostState,runState);installGrotesqueBoss(worldState,hostState,runState);
      hostState.v142CampaignFloor=floorNumber(runState);hostState.v142CampaignFloorId=cfg?.id||`floor-${floorNumber(runState)}`;hostState.v142GlobalKeyCount=globalKeyCount(runState);
      return hostState;
    };

    function tuneGuardian(hostState,runState){
      const floor=floorNumber(runState),domain=domainForFloor(runState),guardian=(hostState.enemies||[]).find(enemy=>enemy.keyGuardian&&(!domain||enemy.domainId===domain.id));if(!guardian)return;
      const stats={3:{hp:22,armor:7},7:{hp:32,armor:10},11:{hp:44,armor:13}}[floor];if(!stats)return;
      guardian.maxHp=stats.hp;guardian.hp=stats.hp;guardian.maxArmor=stats.armor;guardian.armor=stats.armor;guardian.v142BalancedGuardian=true;
    }
    function trimAmmo(hostState,target){
      const ammo=(hostState.items||[]).filter(item=>item.active!==false&&(item.kind==="ammo"||item.kind==="mana"));if(ammo.length<=target)return;
      const keep=new Set(ammo.slice(0,target));hostState.items=(hostState.items||[]).filter(item=>!(item.active!==false&&(item.kind==="ammo"||item.kind==="mana"))||keep.has(item));
    }
    function removeEarlyDeathStalker(hostState){
      hostState.enemies=(hostState.enemies||[]).filter(enemy=>!(enemy.deathStalker&&enemy.voidStalker));hostState.voidStalkers=[];hostState.deathStalkerId=null;hostState.voidStalkerInSight=false;
    }
    function disableInterimSigil(hostState){
      hostState.items=(hostState.items||[]).filter(item=>item.kind!=="exitSigil");
      hostState.enemies=(hostState.enemies||[]).filter(enemy=>!enemy.sigilDefender&&!enemy.exitWarden&&!enemy.sigilWarden);
      hostState.sigilDefenderIds=[];hostState.sigilWarden=null;hostState.sigilLockdown=false;hostState.sigilResolved=true;hostState.sigilRoomId=null;
      for(const door of hostState.doors||[])if(door.sigilGate){door.locked=false;door.open=true;door.opening=false}
    }
    function applyFloorBalance(hostState,runState){
      const cfg=floorConfig(runState),floor=floorNumber(runState);if(!cfg)return;
      const hpScale=Math.max(.65,Math.min(1.5,Number(cfg.hpScale)||1));
      for(const enemy of hostState.enemies||[]){
        enemy.v142Floor=floor;
        if(enemy.deathStalker){enemy.moveSpeedScale=Math.max(.65,Math.min(1.4,Number(cfg.deathStalkerSpeed)||1));continue}
        if(enemy.keyGuardian||enemy.r114GrotesqueBoss)continue;
        if(enemy.ccgBoss&&floor<5)continue;
        const oldMax=Math.max(1,Number(enemy.maxHp||enemy.hp)||1),next=Math.max(1,Math.round(oldMax*hpScale));enemy.maxHp=next;enemy.hp=Math.min(next,Math.max(1,Math.round(Number(enemy.hp||oldMax)*hpScale)));
        if(floor>=4&&enemy.follower){enemy.maxArmor=Math.max(1,Number(enemy.maxArmor||enemy.armor||1)+(floor===CFG.maxFloors?2:1));enemy.armor=enemy.maxArmor}
      }
      tuneGuardian(hostState,runState);trimAmmo(hostState,Math.max(6,Number(cfg.ammoTarget)||12));
      if(hostState.stalker)hostState.stalker.spawnTimer=Math.max(15000,Number(cfg.stalkerDelayMs)||CFG.stalker.spawnDelayMs);
      if(floor===1)removeEarlyDeathStalker(hostState);
      if(floor<CFG.maxFloors)disableInterimSigil(hostState);
      hostState.v142Balance={floor,hpScale,tempo:Number(cfg.tempo)||1,ammoTarget:Number(cfg.ammoTarget)||12,stalkerDelayMs:Number(cfg.stalkerDelayMs)||CFG.stalker.spawnDelayMs};
    }

    function applyFloorTheme(worldState,hostState,runState){
      const cfg=floorConfig(runState),theme=String(cfg?.theme||"");if(!theme||!WORLD.themes?.[theme]||!Array.isArray(worldState?.rooms))return;
      for(const room of worldState.rooms){
        if(!room)continue;
        room.v142FloorTheme=theme;
        const preserve=Boolean(room.optional||room.sanctuary||room.sigilRoom||room.spiderNest||room.skeletonHorde||room.dedicatedHazard||room.jackpotRoom||room.verminRoom);
        if(!preserve)room.theme=theme;
      }
      worldState.v142FloorTheme=theme;hostState.v142FloorTheme=theme;
    }

    const baseDecorate=SYSTEMS.decorate.bind(SYSTEMS);
    SYSTEMS.decorate=function(worldState,hostState,runState){const result=baseDecorate(worldState,hostState,runState);applyFloorTheme(worldState,hostState,runState);applyFloorBalance(hostState,runState);return result};

    const baseEnemyStep=AI.stepEnemies.bind(AI);
    AI.stepEnemies=function(hostState,map,players,dt,hooks={},worldState=window.__CCG_WORLD){
      const cfg=floorConfig(currentRun()),tempo=Math.max(.8,Math.min(1.25,Number(cfg?.tempo)||1));return baseEnemyStep(hostState,map,players,dt*tempo,hooks,worldState);
    };

    function authorizeInterimExit(hostState){
      hostState.sigilLockdown=false;hostState.sigilResolved=true;hostState.exitSigilCollected=false;hostState.exitOpen=true;
      for(const door of hostState.doors||[])if(door.sigilGate){door.locked=false;door.open=true;door.opening=false;door.openAt=0;door.openingStart=0}
    }
    function ensureInterimExit(hostState,runState){
      if(!hostState||floorNumber(runState)>=CFG.maxFloors||!hostState.objective?.complete)return false;
      authorizeInterimExit(hostState);
      return true;
    }
    function noteProgressionRecovery(hostState,reason){
      if(!hostState)return;
      hostState.v142ProgressionSafetyRecovery={reason:String(reason||"unknown"),floor:floorNumber(currentRun()),at:Date.now()};
    }
    function recoverMissingDomainKey(hostState,runState,domain){
      if(!hostState||!domain||claimedDomains(runState).includes(domain.id)||(Number(hostState.keysCollected)||0)>=1)return false;
      const activeKey=(hostState.items||[]).some(item=>item?.active!==false&&item?.kind==="key"&&(!item.domainId||item.domainId===domain.id));
      if(activeKey)return false;
      const guardian=(hostState.enemies||[]).find(enemy=>enemy?.keyGuardian&&(!enemy.domainId||enemy.domainId===domain.id));
      if(guardian?.alive)return false;
      runState.v142ClaimedDomains=Array.isArray(runState.v142ClaimedDomains)?runState.v142ClaimedDomains:[];
      if(!runState.v142ClaimedDomains.includes(domain.id))runState.v142ClaimedDomains.push(domain.id);
      hostState.keysCollected=Math.max(1,Number(hostState.keysCollected)||0);
      hostState.v142GlobalKeyCount=globalKeyCount(runState);
      noteProgressionRecovery(hostState,`missing-domain-key:${domain.id}`);
      announce("PROGRESSION RECOVERED",`${domain.name} was missing after its guardian was defeated. The campaign has restored the Key to prevent an unwinnable floor.`,"gold",9500);
      return true;
    }
    function recoverMissingFinalSigil(hostState,runState){
      if(!hostState||floorNumber(runState)!==CFG.maxFloors||globalKeyCount(runState)<CFG.keyTarget||!hostState.objective?.complete)return false;
      const defenders=SYSTEMS.sigilDefendersAlive?.(hostState)||[];
      if(defenders.length>0||hostState.exitSigilCollected)return false;
      const activeSigil=(hostState.items||[]).some(item=>item?.active!==false&&item?.kind==="exitSigil");
      if(activeSigil)return false;
      const player=currentPlayer(),worldState=(()=>{try{return typeof world!=="undefined"?world:null}catch(_){return null}})(),fallback=worldState?.exit||{x:1,y:1},drop=hostState.sigilDropPos||player||fallback;
      hostState.items=hostState.items||[];
      hostState.items.push({id:`progression-recovery-sigil-${Date.now()}`,x:Number(drop.x)||fallback.x,y:Number(drop.y)||fallback.y,kind:"exitSigil",active:true,title:"AWAKENED SIGIL",v142ProgressionRecovery:true});
      hostState.sigilResolved=true;hostState.sigilLockdown=false;hostState.exitSigilDropped=true;
      for(const door of hostState.doors||[])if(door.sigilGate){door.locked=false;door.open=true;door.opening=false;door.openAt=0;door.openingStart=0}
      noteProgressionRecovery(hostState,"missing-final-sigil");
      announce("AWAKENED SIGIL RESTORED","The final Sigil failed to materialise after the chamber was cleared. It has been restored so the campaign can still be completed.","gold",10000);
      return true;
    }
    const baseUpdateObjective=SYSTEMS.updateObjective.bind(SYSTEMS),baseObjectiveText=SYSTEMS.objectiveText.bind(SYSTEMS);
    const stripInterimSigilSuffix=text=>String(text||"")
      .replace(/\s+—\s+SIGIL LOCKDOWN:.*$/i,"")
      .replace(/\s+—\s+enter the reinforced Sigil chamber.*$/i,"")
      .replace(/\s+—\s+recover the EXIT SIGIL.*$/i,"")
      .replace(/\s+—\s+EXIT SIGIL acquired:.*$/i,"");
    SYSTEMS.updateObjective=function(hostState,runState,explorePct=0){
      const floor=floorNumber(runState),domain=domainForFloor(runState);
      if(floor===1){baseUpdateObjective(hostState,runState,explorePct);ensureInterimExit(hostState,runState);return hostState.exitOpen}
      if(domain){
        recoverMissingDomainKey(hostState,runState,domain);
        const done=(Number(hostState.keysCollected)||0)>=1||claimedDomains(runState).includes(domain.id);if(hostState.objective)hostState.objective.complete=done;if(done)ensureInterimExit(hostState,runState);else hostState.exitOpen=false;return hostState.exitOpen;
      }
      if(floor<CFG.maxFloors){
        baseUpdateObjective(hostState,runState,explorePct);
        const baseDone=Boolean(hostState.objective?.complete),bossDone=bossDefeated(hostState);
        if(baseDone&&!bossDone){hostState.objective.complete=false;hostState.exitOpen=false;return false}
        if(baseDone&&bossDone)ensureInterimExit(hostState,runState);else hostState.exitOpen=false;
        return hostState.exitOpen;
      }
      if(floor===CFG.maxFloors&&globalKeyCount(runState)<CFG.keyTarget){if(hostState.objective)hostState.objective.complete=false;hostState.exitOpen=false;return false}
      const result=baseUpdateObjective(hostState,runState,explorePct);
      if(hostState.objective?.complete&&bossDefeated(hostState))recoverMissingFinalSigil(hostState,runState);
      return hostState.exitOpen||result;
    };
    SYSTEMS.objectiveText=function(hostState,runState,explorePct=0){
      const floor=floorNumber(runState),cfg=floorConfig(runState),domain=domainForFloor(runState),keys=globalKeyCount(runState);
      if(floor===1)return hostState.objective?.complete?`The Threshold is cleared — reach the stairs to ${PD.campaignFloors?.[1]?.name||"Floor 2"}`:`Explore the Threshold ${Math.floor(explorePct)}% / 70% and defeat its guardian`;
      if(domain){const got=claimedDomains(runState).includes(domain.id)||(Number(hostState.keysCollected)||0)>=1;return got?`FLOOR KEY SECURED — ${domain.name} • CAMPAIGN KEYS ${Math.min(CFG.keyTarget,keys||1)}/${CFG.keyTarget} • Reach the stairs`:`FLOOR KEY — Defeat ${domain.guardian} and recover ${domain.name} • CAMPAIGN KEYS ${keys}/${CFG.keyTarget}`}
      if(floor===CFG.maxFloors&&keys<CFG.keyTarget)return `${cfg?.name||"The final Citadel"} rejects you — recover all three Campaign Keys (${keys}/${CFG.keyTarget})`;
      const fight=hostState?.r114BossFight,boss=bossEnemy(hostState);
      if(fight&&boss?.alive){
        const base=stripInterimSigilSuffix(baseObjectiveText(hostState,runState,explorePct));
        const baseReady=floor===CFG.maxFloors?keys>=CFG.keyTarget:Boolean(hostState.objective?.complete);
        return baseReady?`BOSS GATE — Defeat ${fight.name} to unseal the ${floor===CFG.maxFloors?"final escape":"stairs"}`:`${cfg?.name||`FLOOR ${floor}`} — ${base} • ${fight.name} guards the descent`
      }
      if(floor===CFG.maxFloors){const base=baseObjectiveText(hostState,runState,explorePct);return base.replace(/floor exit/gi,"final escape").replace(/EXIT SIGIL/g,"AWAKENED SIGIL")}
      const base=stripInterimSigilSuffix(baseObjectiveText(hostState,runState,explorePct));
      return hostState.objective?.complete?`${cfg?.name||`FLOOR ${floor}`} — ${base} — reach the stairs`:`${cfg?.name||`FLOOR ${floor}`} — ${base}`;
    };

    if(typeof movementTriggers==="function"){
      const baseMovementTriggers=movementTriggers;
      movementTriggers=function(player){
        const runState=currentRun(),floor=floorNumber(runState),domain=domainForFloor(runState),before=globalKeyCount(runState),result=baseMovementTriggers(player),afterLocal=Number(currentHost()?.keysCollected)||0;
        if(domain&&afterLocal>=1&&!claimedDomains(runState).includes(domain.id)){
          runState.v142ClaimedDomains.push(domain.id);currentHost().v142GlobalKeyCount=globalKeyCount(runState);
        }
        const after=globalKeyCount(runState);if(after>before){
          announce(`${domain?.name||"DUNGEON KEY"} RECOVERED`,`The Key is bound to your run. Campaign Key progress ${after}/${CFG.keyTarget}. Your RPG stats, relics, Vessel and rescued games carry into the next depth.`,"gold",9500);
          if(after>=CFG.keyTarget&&!runState.v142AllKeysAnnounced){runState.v142AllKeysAnnounced=true;announce("THREE KEYS COMPLETE","Iron, Bone and Ash are bound to the run. Keep descending — the Blood Citadel will accept the completed set on Floor 15.","gold",11000)}
        }
        return result;
      };
    }

    if(typeof updateFloorObjective==="function"){
      const baseUpdateFloorObjective=updateFloorObjective;
      updateFloorObjective=function(){
        const runState=currentRun(),floor=floorNumber(runState);if(floor===CFG.maxFloors)return baseUpdateFloorObjective();
        const pct=Math.round(window.CCGProgression.roomCompletion(explored.get(p1.id)||new Set(),world)*100);SYSTEMS.updateObjective(host,runState,pct);
        if(host.objective?.complete&&!host._objectiveAnnounced){host._objectiveAnnounced=true;try{S.sfx("open")}catch(_){}announce("DEPTH OBJECTIVE COMPLETE",`${floorConfig(runState)?.name||`Depth ${floor}`} is complete. The stairs to the next depth are now open.`,"green",9000)}
        if(host.exitOpen&&!host._exitAnnounced){host._exitAnnounced=true;try{S.sfx("open")}catch(_){}announce("STAIRS UNSEALED",floor<CFG.maxFloors?`Descend when ready. Your character build and campaign progress will continue into Floor ${floor+1}.`:"The final escape is open.","gold",8500)}
        try{updateQuests()}catch(_){}
      };
    }

    if(typeof sync==="function"){
      const baseSync=sync;
      sync=function(...args){const result=baseSync(...args),runState=currentRun(),hostState=currentHost(),player=currentPlayer();if(!runState||!hostState)return result;ensureInterimExit(hostState,runState);const keys=globalKeyCount(runState),floor=floorNumber(runState),cfg=floorConfig(runState);if(UI?.keys)UI.keys.textContent=`${keys}/${CFG.keyTarget}`;if(UI?.room)UI.room.textContent=`F${floor}/${CFG.maxFloors}`;if(UI?.quickKeyring)UI.quickKeyring.textContent=`CAMPAIGN KEYS ${keys}/${CFG.keyTarget} • ${claimedDomains(runState).map(id=>id.toUpperCase()).join(" · ")||"NONE"}${hostState.exitSigilCollected&&floor===CFG.maxFloors?" • SIGIL":""}`;if(UI?.mission)UI.mission.textContent=SYSTEMS.objectiveText(hostState,runState,Math.round(window.CCGProgression.roomCompletion(explored.get(player?.id)||new Set(),world)*100));return result};
    }

    function updateMenuCopy(){
      const blurb=document.querySelector("#menu .menu-blurb");if(blurb)blurb.textContent="A fifteen-floor procedural RPG dungeon crawl with persistent character growth, changing objectives and a distinct visual identity on every floor. Recover the Keys of Iron, Bone and Ash across the campaign, complete the Sigil and escape the Blood Citadel.";
      const features=[...document.querySelectorAll("#menu .feature-strip span")];if(features[0])features[0].innerHTML="<b>15 PROCEDURAL FLOORS</b>A full campaign now continues all the way to the Blood Citadel";if(features[1])features[1].innerHTML="<b>RPG CHARACTER BUILD</b>Level Might, Vitality, Agility, Endurance, Luck and Arcana across the campaign";if(features[2])features[2].innerHTML="<b>THREE GLOBAL KEYS</b>Iron, Bone and Ash persist between floors before the final Sigil escape";
      const note=document.getElementById("menu-note");if(note)note.textContent="Every campaign generates fifteen dungeon floors and one shuffled A–Z C64 collectible deck distributed across the whole run. Character stats, equipment, relics, Banishment Essence, death-cache recovery and Key progress persist as you descend.";
      const floorLabel=document.querySelector('.run-stat #hud-room')?.parentElement?.querySelector("span");if(floorLabel)floorLabel.textContent="FLOOR";
    }
    updateMenuCopy();

    window.CCGLostSizzlerV142FiveDepthCampaign={version:"V10.42",floorConfig,domainForFloor,floorPickupSlice,globalKeyCount,bossSpec,bossEnemy,bossDefeated,installGrotesqueBoss,applyFloorTheme,applyFloorBalance,ensureInterimExit,recoverMissingDomainKey,recoverMissingFinalSigil};
    return true;
  }

  if(!install()){
    installTimer=setInterval(()=>{attempts++;if(install()||attempts>200){clearInterval(installTimer);installTimer=0}},50);
    addEventListener("pagehide",()=>{if(installTimer)clearInterval(installTimer)},{once:true});
  }
})();