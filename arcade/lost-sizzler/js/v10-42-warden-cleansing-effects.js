/* The Lost Sizzler V10.42 r3 — visible Warden cleansing, refuges and return-rest effects. */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V142_WARDEN_CLEANSING_EFFECTS__)return;
  window.__CCG_LOST_SIZZLER_V142_WARDEN_CLEANSING_EFFECTS__=true;

  const W=window.CCGWorld;
  if(!W)return;

  const SCAN_MS=250;
  const PROFILES={
    1:{id:"static-veil",name:"STATIC VEIL",benefit:"Archive beacon restored — the cleansed chamber stays illuminated."},
    2:{id:"iron-surge",name:"IRON SURGE",benefit:"Power reclaimed — local reinforcements stay suppressed and ammunition is restored."},
    3:{id:"grave-call",name:"GRAVE CALL",benefit:"Grave call silenced — ordinary enemies in the chamber break pursuit."},
    4:{id:"ember-drain",name:"EMBER DRAIN",benefit:"Embers quenched — chamber hazards die and armour is restored."},
    5:{id:"sigil-pressure",name:"SIGIL PRESSURE",benefit:"Sigil pressure broken — ambient alert pressure falls and final defenders lose corruption support."}
  };

  function currentRun(){try{return typeof run!=="undefined"?run:null}catch(_){return null}}
  function currentHost(){try{return typeof host!=="undefined"?host:null}catch(_){return null}}
  function currentWorld(){try{return typeof world!=="undefined"?world:null}catch(_){return null}}
  function currentPlayer(){try{return typeof p1!=="undefined"?p1:null}catch(_){return null}}
  function currentMode(){try{return typeof mode!=="undefined"?mode:"menu"}catch(_){return"menu"}}
  function floorNo(r=currentRun()){return Math.max(1,Math.min(5,Math.floor(Number(r?.floor)||1)))}
  function sameId(a,b){return String(a)===String(b)}
  function announce(title,text,tone="green",duration=10500){try{showToast(title,text,tone,duration)}catch(_){} }
  function broadcast(){try{broadcastWorld()}catch(_){} }
  function syncNow(){try{sync()}catch(_){} }
  function sfx(name){try{S?.sfx?.(name)}catch(_){} }
  function localPlayerList(){
    try{if(typeof localPlayers==="function")return localPlayers().filter(Boolean)}catch(_){}
    const out=[];try{if(typeof p1!=="undefined"&&p1)out.push(p1)}catch(_){}try{if(typeof p2!=="undefined"&&p2)out.push(p2)}catch(_){}return out;
  }
  function roomAt(w,x,y){try{return W.roomAt(w,x,y)}catch(_){return-1}}
  function roomFor(w,roomId){return (w?.rooms||[]).find(room=>sameId(room.id,roomId))||w?.rooms?.[Number(roomId)]||null}
  function recordFor(r,floor=floorNo(r)){return r?.v142WardenFloors?.[String(floor)]||null}
  function domainFor(h){return h?.v142WardenDomain||null}
  function isCleansed(r,h,floor=floorNo(r)){
    const record=recordFor(r,floor),domain=domainFor(h);
    return Boolean(record?.resolved||record?.cleansed||domain?.cleansed);
  }

  function validLightCell(w,room,q){
    if(!w||!room||!q)return false;
    if(w.map?.[q.y]?.[q.x]!==0)return false;
    return sameId(roomAt(w,q.x,q.y),room.id);
  }
  function restoredLightCandidates(room){
    const cx=Math.floor(room.x+room.w/2),cy=Math.floor(room.y+room.h/2);
    return[
      {x:room.x+1,y:cy},{x:room.x+room.w-1,y:cy},
      {x:cx,y:room.y+1},{x:cx,y:room.y+room.h-1},
      {x:cx,y:cy}
    ];
  }
  function addRestoredLights(w,room,floor){
    if(!w||!room)return 0;
    w.wallLights=Array.isArray(w.wallLights)?w.wallLights:[];
    const existing=w.wallLights.filter(light=>sameId(light.roomId,room.id)&&light.kind==="warden-cleansed");
    if(existing.length)return 0;
    const target=floor===1?3:2,radius=floor===1?11:9,used=new Set(w.wallLights.map(light=>`${light.x},${light.y}`));let added=0;
    for(const q of restoredLightCandidates(room)){
      if(added>=target)break;if(!validLightCell(w,room,q)||used.has(`${q.x},${q.y}`))continue;
      w.wallLights.push({id:`v142-cleansed-light-${floor}-${added}`,x:q.x,y:q.y,roomId:room.id,radius,permanent:true,kind:"warden-cleansed"});used.add(`${q.x},${q.y}`);added++;
    }
    return added;
  }

  function suppressRegularTraps(h,roomId){
    let count=0;for(const trap of h?.traps||[]){if(!sameId(trap.roomId,roomId)||trap.active===false)continue;trap.active=false;trap.v142WardenCleansed=true;count++}return count;
  }
  function suppressDedicatedHazards(h,roomId){
    let count=0,cells=0;for(const hazard of h?.hazardRooms||[]){
      if(!sameId(hazard.roomId,roomId)||hazard.v142WardenCleansed)continue;
      hazard.v142WardenCleansed=true;hazard.v142CleansedCellCount=(hazard.cells||[]).length;cells+=hazard.v142CleansedCellCount;hazard.cells=[];count++;
    }
    return{count,cells};
  }
  function calmOrdinaryEnemies(h,w,roomId){
    let count=0;for(const enemy of h?.enemies||[]){
      if(!enemy?.alive||!sameId(roomAt(w,enemy.x,enemy.y),roomId))continue;
      const major=enemy.deathStalker||enemy.follower||enemy.champion||enemy.guardian||enemy.keyGuardian||enemy.ccgBoss||enemy.exitWarden||enemy.sigilDefender;
      if(major)continue;
      enemy.aiState="idle";enemy.lastSeen=null;enemy.memoryMs=0;enemy.searchMs=0;enemy.targetId=null;enemy.moveCooldown=Math.max(1400,Number(enemy.moveCooldown)||0);enemy.attackCooldown=Math.max(1000,Number(enemy.attackCooldown)||0);count++;
    }
    return count;
  }
  function restoreAmmo(players){
    let total=0;for(const player of players){const max=Math.max(1,Number(player.maxMana)||100),before=Math.max(0,Number(player.mana)||0),gain=Math.max(20,Math.ceil(max*.25));player.mana=Math.min(max,before+gain);total+=Math.max(0,player.mana-before)}return total;
  }
  function restoreArmour(players){let total=0;for(const player of players){const before=Math.max(0,Number(player.armor)||0);player.armor=Math.min(12,before+2);total+=Math.max(0,player.armor-before)}return total}
  function revealRefuge(players){for(const player of players)try{if(typeof reveal==="function")reveal(player)}catch(_){} }

  function prepareEnvironmentalBenefit(floor,h,w,roomId,players){
    const result={detail:"",hazards:0};
    if(floor===1){revealRefuge(players);result.detail="Restored lights expose the cleansed chamber."}
    if(floor===4){
      const hazards=suppressDedicatedHazards(h,roomId),room=roomFor(w,roomId);result.hazards=hazards.count;
      if(room&&hazards.count){room.dedicatedHazard=false;room.hazardType=null}
      if(hazards.count)result.detail=`${hazards.count} chamber hazard${hazards.count===1?"":"s"} extinguished.`;
    }
    return result;
  }

  function applyInitialFloorBenefit(floor,h,w,roomId,players,r){
    const result={detail:"",amount:0};
    if(floor===1){result.detail="The restored Archive beacon now provides a lasting lit refuge.";return result}
    if(floor===2){result.amount=restoreAmmo(players);result.detail=`Local reinforcement power is cut and ${result.amount} ammunition restored across the party.`;return result}
    if(floor===3){result.amount=calmOrdinaryEnemies(h,w,roomId);result.detail=`The Grave Call releases ${result.amount} ordinary enem${result.amount===1?"y":"ies"} from forced pursuit.`;return result}
    if(floor===4){result.amount=restoreArmour(players);result.detail=`${result.amount} armour restored across the party.`;return result}
    if(floor===5){
      const before=Math.max(0,Number(r.alert)||0);r.alert=Math.min(before,Math.max(0,before-25),35);result.amount=Math.max(0,before-r.alert);result.detail=`Ambient alert pressure drops by ${result.amount}% and the live Sigil corruption stack is gone.`;return result;
    }
    return result;
  }

  function restoreRefugeRest(players){
    let hp=0,ammo=0;
    for(const player of players){
      const maxHealth=Math.max(1,Number(player.maxHealth)||1),beforeHealth=Math.max(0,Number(player.health)||0);player.health=Math.min(maxHealth,beforeHealth+2);hp+=Math.max(0,player.health-beforeHealth);
      const maxMana=Math.max(1,Number(player.maxMana)||100),beforeMana=Math.max(0,Number(player.mana)||0),gain=Math.max(12,Math.ceil(maxMana*.15));player.mana=Math.min(maxMana,beforeMana+gain);ammo+=Math.max(0,player.mana-beforeMana);
      if(player.health>beforeHealth)player.hpBarMs=Math.max(2200,Number(player.hpBarMs)||0);
    }
    return{hp,ammo,total:hp+ammo};
  }

  function applyCleansingEffects(){
    const r=currentRun(),h=currentHost(),w=currentWorld();if(!r||!h||!w)return false;
    const floor=floorNo(r),record=recordFor(r,floor),domain=domainFor(h);if(!isCleansed(r,h,floor))return false;
    if(h.v142CleansingEffectsApplied&&Number(h.v142CleansingEffectsFloor)===floor)return true;
    const roomId=domain?.roomId??record?.domainRoomId??record?.refugeRoomId??record?.roomId??h.v142WardenCheckpoint?.roomId;if(roomId==null)return false;
    const room=roomFor(w,roomId);if(!room)return false;
    const players=localPlayerList(),profile=PROFILES[floor]||{id:`floor-${floor}`,name:`FLOOR ${floor}`,benefit:"The corruption has been cleansed."};
    const lights=addRestoredLights(w,room,floor),traps=suppressRegularTraps(h,roomId),environment=prepareEnvironmentalBenefit(floor,h,w,roomId,players),initialClaimed=Boolean(record?.refugeInitialBenefitClaimed);
    let initial={detail:"The refuge's initial cleansing surge was already claimed.",amount:0};
    if(!initialClaimed){
      r.alert=Math.max(0,(Number(r.alert)||0)-12);initial=applyInitialFloorBenefit(floor,h,w,roomId,players,r);if(record)record.refugeInitialBenefitClaimed=true;
    }
    const anchor=h.v142WardenCheckpoint,centre={x:Math.floor(room.x+room.w/2),y:Math.floor(room.y+room.h/2)};
    room.wardenCleansed=true;room.wardenRefuge=true;room.dangerous=false;
    w.v142CleansedRooms=Array.isArray(w.v142CleansedRooms)?w.v142CleansedRooms:[];if(!w.v142CleansedRooms.some(id=>sameId(id,roomId)))w.v142CleansedRooms.push(roomId);
    h.v142CleansedRefuge={floor,roomId,x:Number(anchor?.x??centre.x),y:Number(anchor?.y??centre.y),profileId:profile.id,title:`${profile.name} REFUGE`,benefit:profile.benefit,active:true,recoveryAnchor:Boolean(anchor?.active),restoredLights:lights,suppressedTraps:traps,restUsed:Boolean(record?.refugeRestUsed)};
    h.v142CleansingEffectsApplied=true;h.v142CleansingEffectsFloor=floor;h.v142RefugePlayerInside=players.some(player=>sameId(roomAt(w,player.x,player.y),roomId));h.v142RefugeSeenLeaving=false;h.revision=(Number(h.revision)||0)+1;
    r.v142WardenRefugeFloors=Array.isArray(r.v142WardenRefugeFloors)?r.v142WardenRefugeFloors:[];if(!r.v142WardenRefugeFloors.includes(floor))r.v142WardenRefugeFloors.push(floor);
    if(record){record.refugeEstablished=true;record.refugeBenefit=profile.benefit;record.refugeRoomId=roomId}
    revealRefuge(players);sfx("open");
    const extra=[lights?`${lights} permanent light${lights===1?"":"s"} restored`:"chamber lighting restored",traps?`${traps} trap${traps===1?"":"s"} disabled`:"local traps neutralised",environment.detail,!initialClaimed?initial.detail:""].filter(Boolean).join(" ");
    if(!initialClaimed&&["playing","inventory","paused"].includes(currentMode()))announce("WARDEN REFUGE ESTABLISHED",`${profile.benefit} ${extra}`,"green",12000);
    broadcast();syncNow();return true;
  }

  function updateRefugeReturn(){
    const r=currentRun(),h=currentHost(),w=currentWorld(),refuge=h?.v142CleansedRefuge;if(!r||!h||!w||!refuge?.active)return false;
    const players=localPlayerList(),inside=players.some(player=>sameId(roomAt(w,player.x,player.y),refuge.roomId)),previous=Boolean(h.v142RefugePlayerInside),record=recordFor(r,refuge.floor);
    if(previous&&!inside)h.v142RefugeSeenLeaving=true;
    if(inside&&!previous&&h.v142RefugeSeenLeaving&&!record?.refugeRestUsed){
      const restored=restoreRefugeRest(players);
      if(restored.total>0){
        if(record)record.refugeRestUsed=true;refuge.restUsed=true;h.revision=(Number(h.revision)||0)+1;sfx("shrine");
        announce("WARDEN REFUGE REST",`Returning to the cleansed chamber restores ${restored.hp} health and ${restored.ammo} ammunition across the local party. This refuge recovery is now spent for Floor ${refuge.floor}.`,"green",10500);broadcast();syncNow();
      }else if(["playing","inventory"].includes(currentMode()))announce("WARDEN REFUGE READY","You are already fully supplied. The refuge's one return-rest remains available until you actually need it.","cyan",6500);
    }
    h.v142RefugePlayerInside=inside;return inside;
  }

  function refreshRefugeReadout(){
    const h=currentHost(),w=currentWorld(),player=currentPlayer(),refuge=h?.v142CleansedRefuge;if(!h||!w||!player||!refuge?.active)return;
    if(!sameId(roomAt(w,player.x,player.y),refuge.roomId))return;
    const rest=refuge.restUsed?"Return-rest spent.":"Leave and return once for a recovery rest.";
    try{if(UI?.surroundings)UI.surroundings.textContent=`${refuge.title} — ${refuge.benefit} ${rest}` }catch(_){}
  }

  function fragmentCount(record){return Number(Boolean(record?.fragmentAwarded))+Number(Boolean(record?.cacheFragmentAwarded))}
  function wardenLegacyHtml(r,floor){
    const record=recordFor(r,floor),skipped=Array.isArray(r?.v142SkippedWardenFloors)&&r.v142SkippedWardenFloors.includes(floor);
    if(!record&&!skipped)return"";
    const resolved=Boolean(record?.resolved||record?.cleansed);
    if(!resolved){
      return `<br><br><b data-v142-warden-legacy="true">WARDEN LEGACY</b><br>WARDEN UNRESOLVED${skipped?" · WARDEN DEBT +1":""} · Later major guardians retain this floor's corruption.`;
    }
    const fragments=fragmentCount(record),cache=record?.cacheFragmentAwarded?"WARDEN CACHE CLAIMED":"WARDEN CACHE UNCLAIMED — SECOND SEAL FRAGMENT MISSED",refuge=record?.refugeEstablished?`REFUGE ESTABLISHED · RETURN-REST ${record?.refugeRestUsed?"SPENT":"AVAILABLE"}`:"REFUGE NOT ESTABLISHED";
    return `<br><br><b data-v142-warden-legacy="true">WARDEN LEGACY</b><br>WARDEN CLEANSED · SEAL FRAGMENTS ${fragments}/2 · ${cache} · ${refuge}.`;
  }
  function appendWardenLegacySummary(r,floor){
    try{
      if(!UI?.floorSummary)return false;const html=wardenLegacyHtml(r,floor);if(!html)return false;
      const existing=String(UI.floorSummary.innerHTML||"");if(existing.includes('data-v142-warden-legacy="true"'))return false;
      UI.floorSummary.innerHTML=existing+html;return true;
    }catch(_){return false}
  }

  const baseFloorComplete=typeof floorComplete==="function"?floorComplete:null;
  if(baseFloorComplete){
    floorComplete=function(by){
      const r=currentRun(),floor=floorNo(r),result=baseFloorComplete(by);appendWardenLegacySummary(r,floor);return result;
    };
  }

  function scan(){try{applyCleansingEffects();updateRefugeReturn();refreshRefugeReadout()}catch(error){console.warn("[Lost Sizzler V10.42] Warden cleansing tick failed safely",error)}}
  scan();const timer=setInterval(scan,SCAN_MS);addEventListener("pagehide",()=>clearInterval(timer),{once:true});

  window.CCGLostSizzlerV142WardenCleansingEffects={version:"V10.42 r3",profiles:PROFILES,apply:applyCleansingEffects,updateRefugeReturn,wardenLegacyHtml,appendWardenLegacySummary};
})();
