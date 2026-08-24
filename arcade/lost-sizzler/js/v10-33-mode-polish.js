/* The Lost Sizzler V10.33 — early firearm and hard occupancy safeguards. */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_MODE_POLISH_V133__)return;
  window.__CCG_LOST_SIZZLER_MODE_POLISH_V133__=true;

  const tutorialActive=()=>Boolean(window.CCGLostSizzlerOnboardingV120?.state?.active||document.body?.dataset?.tutorialActive==="true");
  const livingPlayers=()=>{try{return (typeof allPlayers==="function"?allPlayers():[p1,p2].filter(Boolean)).filter(player=>player&&Number(player.health||0)>0)}catch(_){return[]}};
  const hasFirearm=player=>Boolean(window.CCGLostSizzlerMeleeAmmoV125?.hasGun?.(player)||player?.firearmUnlocked&&player?.weapon);
  const playerOccupies=(x,y)=>livingPlayers().some(player=>player.x===x&&player.y===y);
  const enemyOccupies=(x,y,except=null)=>(host?.enemies||[]).some(enemy=>enemy!==except&&enemy?.alive&&enemy.x===x&&enemy.y===y);

  function safeAdjacent(x,y,except=null){
    const candidates=[{x,y},{x:x+1,y},{x:x-1,y},{x,y:y+1},{x,y:y-1}];
    return candidates.find(cell=>world?.map?.[cell.y]?.[cell.x]===0&&W.walkable(world.map,cell.x,cell.y,host)&&!playerOccupies(cell.x,cell.y)&&!enemyOccupies(cell.x,cell.y,except))||null;
  }

  function releaseStarterFirearm(enemy){
    if(!enemy||!run||!host||tutorialActive()||Number(run.floor||1)!==1||run._v133StarterFirearmReleased||net?.isHost===false)return false;
    if(enemy.passiveNpc||enemy.gildedElf||enemy.treasureBat||enemy.taxman||enemy.lostAdventurer||enemy.deathStalker||enemy.voidStalker)return false;
    if(livingPlayers().some(hasFirearm)){run._v133StarterFirearmReleased=true;return false}
    const cell=safeAdjacent(enemy.x,enemy.y,enemy)||{x:enemy.x,y:enemy.y};
    host.items=host.items||[];host.items.push({id:`v133-starter-firearm-${String(run.seed||"run")}-${Date.now()}`,x:cell.x,y:cell.y,kind:"weapon",active:true,title:"FIRST ENCOUNTER FIREARM",starterFirearm:true});
    run._v133StarterFirearmReleased=true;host.revision=(host.revision||0)+1;
    try{showToast("FIRST ENCOUNTER REWARD","A firearm has dropped beside the first defeated enemy. Pick it up to unlock ranged combat; your sword remains the automatic fallback at zero ammo.","gold",9500);broadcastWorld?.();sync?.()}catch(_){}
    return true;
  }

  function relocateOverlap(entity){
    if(!entity||!playerOccupies(entity.x,entity.y))return false;
    const cell=safeAdjacent(entity.x,entity.y,entity);if(!cell)return false;
    entity.x=cell.x;entity.y=cell.y;entity.rx=cell.x;entity.ry=cell.y;return true;
  }

  function enforceOccupancy(){
    if(!host||mode!=="playing"||net?.isHost===false)return false;
    let changed=false;for(const enemy of host.enemies||[])if(enemy?.alive)changed=relocateOverlap(enemy)||changed;
    if(host.stalker?.awake&&!host.stalker?.permanentlyBanished)changed=relocateOverlap(host.stalker)||changed;
    if(changed)host.revision=(host.revision||0)+1;return changed;
  }

  if(typeof damageEnemy==="function"){
    const original=damageEnemy;
    damageEnemy=function damageEnemyV133StarterFirearm(enemy,power,element="energy",attacker=p1){const alive=Boolean(enemy?.alive),result=original.apply(this,arguments);if(alive&&enemy&&!enemy.alive)try{releaseStarterFirearm(enemy)}catch(error){console.warn("[Lost Sizzler] starter firearm release failed",error)}return result};
  }
  if(typeof startWorld==="function"){
    const original=startWorld;
    startWorld=function startWorldV133MutationReset(seed,split=false,preserve=false,checkpointRestore=false){if(run&&!checkpointRestore)delete run.rareMutation;return original.apply(this,arguments)};
  }
  if(typeof update==="function"){
    const original=update;
    update=function updateV133Occupancy(dt){const result=original.apply(this,arguments);try{enforceOccupancy()}catch(error){console.warn("[Lost Sizzler] occupancy safeguard failed",error)}return result};
  }

  window.CCGLostSizzlerModePolishV133={releaseStarterFirearm,enforceOccupancy,playerOccupies};
})();
