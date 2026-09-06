/* The Lost Sizzler V10.42 — five-depth campaign, global Keys and floor balance. */
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

    function floorPickupSlice(seed,floor){
      const deck=API.gameDeck(seed),distribution=Array.isArray(PD.pickupDistribution)?PD.pickupDistribution:[6,5,5,5,5];
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
      configureDomainKey(hostState,runState);installFloorCollectibles(worldState,hostState,runState);
      hostState.v142CampaignFloor=floorNumber(runState);hostState.v142CampaignFloorId=cfg?.id||`floor-${floorNumber(runState)}`;hostState.v142GlobalKeyCount=globalKeyCount(runState);
      return hostState;
    };

    function tuneGuardian(hostState,runState){
      const floor=floorNumber(runState),domain=domainForFloor(runState),guardian=(hostState.enemies||[]).find(enemy=>enemy.keyGuardian&&(!domain||enemy.domainId===domain.id));if(!guardian)return;
      const stats={2:{hp:20,armor:7},3:{hp:24,armor:8},4:{hp:29,armor:9}}[floor];if(!stats)return;
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
        if(enemy.keyGuardian)continue;
        if(enemy.ccgBoss&&floor<5)continue;
        const oldMax=Math.max(1,Number(enemy.maxHp||enemy.hp)||1),next=Math.max(1,Math.round(oldMax*hpScale));enemy.maxHp=next;enemy.hp=Math.min(next,Math.max(1,Math.round(Number(enemy.hp||oldMax)*hpScale)));
        if(floor>=4&&enemy.follower){enemy.maxArmor=Math.max(1,Number(enemy.maxArmor||enemy.armor||1)+(floor===5?2:1));enemy.armor=enemy.maxArmor}
      }
      tuneGuardian(hostState,runState);trimAmmo(hostState,Math.max(6,Number(cfg.ammoTarget)||12));
      if(hostState.stalker)hostState.stalker.spawnTimer=Math.max(15000,Number(cfg.stalkerDelayMs)||CFG.stalker.spawnDelayMs);
      if(floor===1)removeEarlyDeathStalker(hostState);
      if(floor<CFG.maxFloors)disableInterimSigil(hostState);
      hostState.v142Balance={floor,hpScale,tempo:Number(cfg.tempo)||1,ammoTarget:Number(cfg.ammoTarget)||12,stalkerDelayMs:Number(cfg.stalkerDelayMs)||CFG.stalker.spawnDelayMs};
    }

    const baseDecorate=SYSTEMS.decorate.bind(SYSTEMS);
    SYSTEMS.decorate=function(worldState,hostState,runState){const result=baseDecorate(worldState,hostState,runState);applyFloorBalance(hostState,runState);return result};

    const baseEnemyStep=AI.stepEnemies.bind(AI);
    AI.stepEnemies=function(hostState,map,players,dt,hooks={},worldState=window.__CCG_WORLD){
      const cfg=floorConfig(currentRun()),tempo=Math.max(.8,Math.min(1.25,Number(cfg?.tempo)||1));return baseEnemyStep(hostState,map,players,dt*tempo,hooks,worldState);
    };

    function authorizeInterimExit(hostState){
      hostState.sigilLockdown=false;hostState.sigilResolved=true;hostState.exitSigilCollected=true;hostState.exitOpen=true;
      for(const door of hostState.doors||[])if(door.sigilGate){door.locked=false;door.open=true;door.opening=false;door.openAt=0;door.openingStart=0}
    }
    const baseUpdateObjective=SYSTEMS.updateObjective.bind(SYSTEMS),baseObjectiveText=SYSTEMS.objectiveText.bind(SYSTEMS);
    SYSTEMS.updateObjective=function(hostState,runState,explorePct=0){
      const floor=floorNumber(runState),domain=domainForFloor(runState);
      if(floor===1){baseUpdateObjective(hostState,runState,explorePct);if(hostState.objective?.complete)authorizeInterimExit(hostState);return hostState.exitOpen}
      if(domain){
        const done=(Number(hostState.keysCollected)||0)>=1||claimedDomains(runState).includes(domain.id);if(hostState.objective)hostState.objective.complete=done;if(done)authorizeInterimExit(hostState);else hostState.exitOpen=false;return hostState.exitOpen;
      }
      if(floor===CFG.maxFloors&&globalKeyCount(runState)<CFG.keyTarget){if(hostState.objective)hostState.objective.complete=false;hostState.exitOpen=false;return false}
      return baseUpdateObjective(hostState,runState,explorePct);
    };
    SYSTEMS.objectiveText=function(hostState,runState,explorePct=0){
      const floor=floorNumber(runState),cfg=floorConfig(runState),domain=domainForFloor(runState),keys=globalKeyCount(runState);
      if(floor===1)return hostState.objective?.complete?"The Threshold is cleared — reach the stairs to Iron Keep":`Explore the Threshold ${Math.floor(explorePct)}% / 70% and defeat its guardian`;
      if(domain){const got=claimedDomains(runState).includes(domain.id)||(Number(hostState.keysCollected)||0)>=1;return got?`${domain.name} SECURED — global Keys ${Math.min(CFG.keyTarget,keys||1)}/${CFG.keyTarget}; reach the stairs`:`Defeat ${domain.guardian} and recover ${domain.name} — global Keys ${keys}/${CFG.keyTarget}`}
      if(floor===CFG.maxFloors&&keys<CFG.keyTarget)return `The Sigil Sanctum rejects you — recover all three Keys (${keys}/${CFG.keyTarget})`;
      if(floor===CFG.maxFloors){const base=baseObjectiveText(hostState,runState,explorePct);return base.replace(/floor exit/gi,"final escape").replace(/EXIT SIGIL/g,"AWAKENED SIGIL")}
      return `${cfg?.name||`FLOOR ${floor}`} — ${baseObjectiveText(hostState,runState,explorePct)}`;
    };

    if(typeof movementTriggers==="function"){
      const baseMovementTriggers=movementTriggers;
      movementTriggers=function(player){
        const runState=currentRun(),floor=floorNumber(runState),domain=domainForFloor(runState),before=globalKeyCount(runState),result=baseMovementTriggers(player),afterLocal=Number(currentHost()?.keysCollected)||0;
        if(domain&&afterLocal>=1&&!claimedDomains(runState).includes(domain.id)){
          runState.v142ClaimedDomains.push(domain.id);currentHost().v142GlobalKeyCount=globalKeyCount(runState);
        }
        const after=globalKeyCount(runState);if(after>before){
          announce(`${domain?.name||"DUNGEON KEY"} RECOVERED`,`The Key is bound to your run. Global Key progress ${after}/${CFG.keyTarget}. Your RPG stats, relics, Vessel and rescued games carry into the next depth.`,"gold",9500);
          if(after>=CFG.keyTarget&&!runState.v142AllKeysAnnounced){runState.v142AllKeysAnnounced=true;announce("THREE KEYS COMPLETE","Iron, Bone and Ash are yours. Descend to the Sigil Sanctum and finish the ritual.","gold",11000)}
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
      sync=function(...args){const result=baseSync(...args),runState=currentRun(),hostState=currentHost(),player=currentPlayer();if(!runState||!hostState)return result;const keys=globalKeyCount(runState),floor=floorNumber(runState),cfg=floorConfig(runState);if(UI?.keys)UI.keys.textContent=`${keys}/${CFG.keyTarget}`;if(UI?.room)UI.room.textContent=`F${floor}/${CFG.maxFloors}`;if(UI?.quickKeyring)UI.quickKeyring.textContent=`KEYS ${keys}/${CFG.keyTarget} • ${claimedDomains(runState).map(id=>id.toUpperCase()).join(" · ")||"NONE"}${hostState.exitSigilCollected&&floor===CFG.maxFloors?" • SIGIL":""}`;if(UI?.mission)UI.mission.textContent=SYSTEMS.objectiveText(hostState,runState,Math.round(window.CCGProgression.roomCompletion(explored.get(player?.id)||new Set(),world)*100));return result};
    }

    function updateMenuCopy(){
      const blurb=document.querySelector("#menu .menu-blurb");if(blurb)blurb.textContent="A five-depth procedural RPG dungeon crawl designed for roughly a one-hour successful run. Build your character, recover the Keys of Iron, Bone and Ash, complete the Sigil and escape.";
      const features=[...document.querySelectorAll("#menu .feature-strip span")];if(features[0])features[0].innerHTML="<b>5 PROCEDURAL DEPTHS</b>About 55–75 minutes for a successful full run";if(features[1])features[1].innerHTML="<b>RPG CHARACTER BUILD</b>Level Might, Vitality, Agility, Endurance, Luck and Arcana across the campaign";if(features[2])features[2].innerHTML="<b>THREE GLOBAL KEYS</b>Iron, Bone and Ash persist between floors before the final Sigil escape";
      const note=document.getElementById("menu-note");if(note)note.textContent="Every campaign generates five new dungeon floors and one shuffled A–Z C64 collectible deck distributed across the whole run. Character stats, relics, Banishment Essence and Key progress persist as you descend.";
      const floorLabel=document.querySelector('.run-stat #hud-room')?.parentElement?.querySelector("span");if(floorLabel)floorLabel.textContent="FLOOR";
    }
    updateMenuCopy();

    window.CCGLostSizzlerV142FiveDepthCampaign={version:"V10.42",floorConfig,domainForFloor,floorPickupSlice,globalKeyCount,applyFloorBalance};
    return true;
  }

  if(!install()){
    installTimer=setInterval(()=>{attempts++;if(install()||attempts>200){clearInterval(installTimer);installTimer=0}},50);
    addEventListener("pagehide",()=>{if(installTimer)clearInterval(installTimer)},{once:true});
  }
})();