/* The Lost Sizzler — V10.8 run-integrity hardening.
 * Protects long runs from soft locks, unreachable death caches, unsafe respawns,
 * leaderboard connection loss, multiplayer authority races and excessive canvas
 * allocation on very high-resolution displays.
 */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_RUN_HARDENING_V108__)return;
  window.__CCG_LOST_SIZZLER_RUN_HARDENING_V108__=true;

  const BUILD="V10.8";
  const CHECKPOINT_SCHEMA=2;
  const CHECKPOINT_KEY="ccg-quest-v10.3-checkpoint";
  const MAX_CANVAS_PIXELS=1920*1080;
  const dirs=[[1,0],[-1,0],[0,1],[0,-1]];
  const cell=(x,y)=>`${x},${y}`;
  const hostClaims=new Set(),clientCollections=new Set();

  function doorAt(x,y){return (host?.doors||[]).find(d=>d.x===x&&d.y===y)||null}
  function safeWalkable(x,y,{ignoreLockedDoors=false}={}){
    if(!world?.map?.[y]||world.map[y][x]!==0)return false;
    if((host?.blockingDecor||[]).some(d=>!d.destroyed&&d.x===x&&d.y===y))return false;
    const door=doorAt(x,y);
    if(door&&door.locked&&!ignoreLockedDoors)return false;
    return true;
  }
  function reachableFrom(start,{ignoreLockedDoors=false}={}){
    const seen=new Set();if(!start||!safeWalkable(start.x,start.y,{ignoreLockedDoors}))return seen;
    const q=[{x:start.x,y:start.y}];seen.add(cell(start.x,start.y));
    for(let i=0;i<q.length;i++)for(const [dx,dy] of dirs){const x=q[i].x+dx,y=q[i].y+dy,k=cell(x,y);if(seen.has(k)||!safeWalkable(x,y,{ignoreLockedDoors}))continue;seen.add(k);q.push({x,y})}
    return seen;
  }
  function targetReachable(target,seen){if(!target)return false;const x=Math.round(target.x),y=Math.round(target.y);return seen.has(cell(x,y))||dirs.some(([dx,dy])=>seen.has(cell(x+dx,y+dy)))}
  function activeChallengeLock(){
    if(host?.sigilLockdown)return true;
    const roomId=p1&&world?W.roomAt(world,p1.x,p1.y):null;
    if((host?.arenas||[]).some(a=>a.triggered&&!a.cleared&&a.roomId===roomId))return true;
    return false;
  }
  function objectiveTargets(){
    if(!host||!world)return[];const out=[];
    if(host.objective?.complete){if(world.exit)out.push(world.exit);for(const i of host.items||[])if(i.active&&i.kind==="exitSigil")out.push(i);return out}
    const type=host.objective?.type;
    if(type==="keys")for(const i of host.items||[])if(i.active&&i.kind==="key")out.push(i);
    if(type==="generators")for(const g of host.generators||[])if(g.active!==false&&!g.destroyed)out.push(g);
    if(type==="rescue"&&host.rescue&&!host.rescue.rescued)out.push(host.rescue);
    if(type==="guardian"||type==="explore_guardian")for(const e of host.enemies||[])if(e.alive&&e.guardian)out.push(e);
    if(!out.length&&world.exit)out.push(world.exit);
    return out;
  }
  function bridgeDoorFor(reachable){
    const candidates=(host?.doors||[]).filter(d=>d.type==="room"&&d.locked&&!d.sigilGate);
    for(const d of candidates){const group=d.groupId?(host.doors||[]).filter(x=>x.groupId===d.groupId):[d],sides=[];for(const leaf of group)for(const [dx,dy] of dirs){const q={x:leaf.x+dx,y:leaf.y+dy};if(safeWalkable(q.x,q.y,{ignoreLockedDoors:true}))sides.push(q)}const hasReach=sides.some(q=>reachable.has(cell(q.x,q.y))),hasUnreach=sides.some(q=>!reachable.has(cell(q.x,q.y)));if(hasReach&&hasUnreach)return d}
    return null;
  }
  function reopenDoorGroup(door){const group=door.groupId?(host.doors||[]).filter(d=>d.groupId===door.groupId):[door];for(const d of group){d.locked=false;d.open=true;d.opening=false;d.openAt=0;d.openingStart=0;d.openSoundDone=true}host.revision=(Number(host.revision)||0)+1}
  function validateCriticalRoute(reason="state change",force=false){
    if(mode!=="playing"||!p1||!host||!world||playMode==="online"&&!net?.isHost)return true;
    if(activeChallengeLock()&&!force)return true;
    const targets=objectiveTargets();if(!targets.length)return true;let seen=reachableFrom(p1);if(targets.some(t=>targetReachable(t,seen)))return true;
    let opened=0;while(opened<4){const d=bridgeDoorFor(seen);if(!d)break;reopenDoorGroup(d);opened++;seen=reachableFrom(p1);if(targets.some(t=>targetReachable(t,seen)))break}
    if(opened){try{S.sfx("dooropen")}catch(_){}try{broadcastWorld()}catch(_){}try{showToast("ROUTE RECOVERY",`${opened} stale challenge door${opened===1?"":"s"} reopened after ${reason}. The required route is available again.`,"gold",8000)}catch(_){}return true}
    return targets.some(t=>targetReachable(t,seen));
  }

  function dangerousTile(x,y){
    if(!safeWalkable(x,y))return true;
    if((host?.enemies||[]).some(e=>e.alive&&e.x===x&&e.y===y))return true;
    if((host?.traps||[]).some(t=>t.active&&t.x===x&&t.y===y))return true;
    if((host?.hazardRooms||[]).some(h=>(h.cells||[]).some(c=>c.x===x&&c.y===y)))return true;
    if((host?.doors||[]).some(d=>d.x===x&&d.y===y))return true;
    return false;
  }
  function nearestSafe(origin,maxRadius=12,allowed=null){
    if(!origin)return null;const valid=(x,y)=>!dangerousTile(x,y)&&(!allowed||allowed.has(cell(x,y)));
    if(valid(origin.x,origin.y))return{x:origin.x,y:origin.y};
    for(let r=1;r<=maxRadius;r++)for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++){if(Math.abs(dx)+Math.abs(dy)!==r)continue;const x=origin.x+dx,y=origin.y+dy;if(valid(x,y))return{x,y}}
    return null;
  }
  function nearestReachableSafe(origin,seen){let best=null,bestD=Infinity;for(const key of seen){const [x,y]=key.split(",").map(Number);if(dangerousTile(x,y))continue;const d=Math.abs(x-origin.x)+Math.abs(y-origin.y);if(d<bestD){bestD=d;best={x,y}}}return best}
  function secureDeathCaches(){
    if(!host?.deathCaches?.length||!world||!p1)return;const seen=reachableFrom(p1);
    for(const cache of host.deathCaches)if(cache?.active){const origin={x:Math.round(cache.x),y:Math.round(cache.y)};if(seen.has(cell(origin.x,origin.y))&&!dangerousTile(origin.x,origin.y))continue;const q=nearestSafe(origin,14,seen)||nearestReachableSafe(origin,seen)||nearestSafe(world.start,14,seen);if(q){cache.x=q.x;cache.y=q.y}}
  }
  function securePlayerSpawn(p){
    if(!p)return;const q=nearestSafe({x:Math.round(p.x),y:Math.round(p.y)},10)||nearestSafe(world?.start,14);if(q){p.x=q.x;p.y=q.y;p.rx=q.x;p.ry=q.y}
    p.invuln=Math.max(Number(p.invuln)||0,1500);p._v108RespawnGraceUntil=performance.now()+1500;
  }

  if(typeof hurtPlayer==="function"){const original=hurtPlayer;hurtPlayer=function(p){const deaths=Number(run?.stats?.deaths||0),result=original.apply(this,arguments),after=Number(run?.stats?.deaths||0);if(after>deaths&&mode==="playing"){securePlayerSpawn(p);validateCriticalRoute("a player death",true);secureDeathCaches();try{sync()}catch(_){}}return result}}
  if(typeof useTeleport==="function"){const original=useTeleport;useTeleport=function(p){const before=p?cell(p.x,p.y):"",result=original.apply(this,arguments);if(p&&cell(p.x,p.y)!==before){securePlayerSpawn(p);validateCriticalRoute("teleportation");secureDeathCaches()}return result}}
  if(typeof firePlayer==="function"){const original=firePlayer;firePlayer=function(p){if(p&&Number(p._v108RespawnGraceUntil||0)>performance.now()){p._v108RespawnGraceUntil=0;p.invuln=0}return original.apply(this,arguments)}}
  if(typeof startWorld==="function"){const original=startWorld;startWorld=function(){hostClaims.clear();clientCollections.clear();const result=original.apply(this,arguments);setTimeout(()=>{for(const p of [p1,p2].filter(Boolean))securePlayerSpawn(p);validateCriticalRoute("floor generation");secureDeathCaches()},0);return result}}
  if(typeof descendFloor==="function"){const original=descendFloor;descendFloor=function(){const result=original.apply(this,arguments);setTimeout(()=>{validateCriticalRoute("floor descent");secureDeathCaches()},0);return result}}

  let focusPauseLock=false;
  function pauseForFocusLoss(){if(focusPauseLock||mode!=="playing"||playMode==="online")return;focusPauseLock=true;input.clear();try{pause()}catch(_){}setTimeout(()=>{focusPauseLock=false},250)}
  window.addEventListener("blur",pauseForFocusLoss);document.addEventListener("visibilitychange",()=>{if(document.hidden)pauseForFocusLoss()});

  if(typeof onCollectRequest==="function"){const original=onCollectRequest;onCollectRequest=function(req){const id=String(req?.itemId||"");if(!id)return original.apply(this,arguments);if(hostClaims.has(id))return false;const item=host?.items?.find(x=>String(x.id)===id&&x.active);if(!item)return false;hostClaims.add(id);const result=original.apply(this,arguments);if(host?.items?.some(x=>String(x.id)===id&&x.active))hostClaims.delete(id);return result}}
  if(typeof onCollected==="function"){const original=onCollected;onCollected=function(ev){const id=String(ev?.item?.id||"");if(id&&clientCollections.has(id))return false;if(id)clientCollections.add(id);return original.apply(this,arguments)}}

  if(typeof net!=="undefined"&&net?.cb){
    const originalMembers=net.cb.onMembers,originalPacket=net.cb.onPacket;let migration=null;
    net.cb.onMembers=function(members,isHost,changed){
      if(changed&&isHost&&mode==="playing"&&playMode==="online"){
        try{say("<strong>HOST MIGRATION.</strong> Checking the freshest dungeon state before taking control.","cyan")}catch(_){}
        const epoch=`${net.sessionId}-${Date.now()}`;migration={epoch,candidates:[{revision:Number(host?.revision||0),state:typeof serialWorld==="function"?serialWorld():null}]};net.send("migration_probe",{epoch,target:net.sessionId});
        setTimeout(()=>{if(!migration||migration.epoch!==epoch)return;const best=migration.candidates.filter(x=>x.state).sort((a,b)=>b.revision-a.revision)[0];if(best&&best.revision>Number(host?.revision||0)&&typeof onWorld==="function"){const wasHost=net.isHost;net.isHost=false;try{onWorld(best.state)}finally{net.isHost=wasHost}}migration=null;try{broadcastWorld()}catch(_){}try{showToast("HOST MIGRATION COMPLETE","The freshest shared dungeon state is now authoritative.","green",5200)}catch(_){}},850);return;
      }
      return originalMembers?.(members,isHost,changed);
    };
    net.cb.onPacket=function(event,payload){
      if(event==="migration_probe"&&mode==="playing"&&playMode==="online"&&!net.isHost){net.send("migration_snapshot",{epoch:payload?.epoch,target:payload?.target,source:net.sessionId,revision:Number(host?.revision||0),state:typeof serialWorld==="function"?serialWorld():null});return}
      if(event==="migration_snapshot"&&net.isHost&&migration&&payload?.target===net.sessionId&&payload?.epoch===migration.epoch){migration.candidates.push({revision:Number(payload.revision||0),state:payload.state||null});return}
      return originalPacket?.(event,payload);
    };
  }

  async function startWeeklyUnified(event){
    const api=window.CCGWeeklyChallenge,state=api?.state;if(!state)return;
    event?.preventDefault?.();event?.stopImmediatePropagation?.();
    if(!state.ready){showToast("WEEKLY DUNGEON","Still checking this week's shared seed. Try again in a moment.","cyan",5000);return}
    if(!state.seed){showToast("WEEKLY DUNGEON UNAVAILABLE","The shared weekly seed could not be loaded. Normal Solo play is still available.","red",7000);api.refresh?.();return}
    const audio=S.start(),fullscreen=requestPlayFullscreen();await Promise.all([audio,fullscreen]);
    let weekly={weekStart:state.weekStart,seed:state.seed,attempt:null,playerName:state.playerName||playerName()};
    if(state.signedIn&&!state.locked){try{const claimed=await api.claim();if(claimed?.attempt)weekly=claimed}catch(error){showToast("RANKED ATTEMPT UNAVAILABLE",`${error?.message||"Could not reserve the ranked attempt"} Starting this Weekly Dungeon unranked.`,"gold",8500)}}
    net.setSolo(weekly.playerName||playerName());beginRun({split:false,daily:true,seed:state.seed,weekly});
  }
  document.getElementById("daily-btn")?.addEventListener("click",startWeeklyUnified,true);

  if(typeof PGR!=="undefined"&&PGR){
    const oldMake=PGR.makeCheckpoint?.bind(PGR),oldSave=PGR.saveCheckpointData?.bind(PGR),oldLoad=PGR.loadCheckpoint?.bind(PGR);
    const validate=data=>Boolean(data&&data.version==="V10.3"&&data.run&&data.player&&Number(data.floor||data.run.floor)>=1&&Number(data.floor||data.run.floor)<=Number(C.maxFloors||5)&&Array.isArray(data.player.inventory||[])&&(!data.schemaVersion||Number(data.schemaVersion)<=CHECKPOINT_SCHEMA));
    if(oldMake)PGR.makeCheckpoint=function(){const data=oldMake(...arguments);if(data){data.schemaVersion=CHECKPOINT_SCHEMA;data.build=BUILD}return data};
    if(oldSave)PGR.saveCheckpointData=function(data){if(!validate(data))return false;data.schemaVersion=CHECKPOINT_SCHEMA;data.build=BUILD;return oldSave(data)};
    if(oldLoad)PGR.loadCheckpoint=function(){const data=oldLoad();if(!data)return null;if(validate(data))return data;try{localStorage.removeItem(CHECKPOINT_KEY)}catch(_){}const note=document.getElementById("menu-note");if(note)note.textContent="An incompatible older checkpoint was removed rather than risking a corrupted run.";return null};
    PGR.validateCheckpointV108=validate;
  }

  if(typeof showToast==="function"){const original=showToast;showToast=function(title,text,tone,duration){if(/low health/i.test(String(title||""))&&p1&&PGR?.inventoryKindCount){const potions=Number(PGR.inventoryKindCount(p1,"potion")||0);text=potions>0?`${potions} Restoration Potion${potions===1?" is":"s are"} available — press E or its Quick Inventory number to heal.`:"No Restoration Potion is currently carried — find health or avoid contact until you recover."}return original(title,text,tone,duration)}}

  try{UI?.artefactChoice?.remove?.();pendingBanishmentReward=null}catch(_){}

  if(typeof resizeGameCanvas==="function"){
    resizeGameCanvas=function(){
      const area=document.querySelector(".canvas-wrap");if(!area)return;const r=area.getBoundingClientRect();let w=Math.max(640,Math.floor(r.width)),h=Math.max(360,Math.floor(r.height));const pixels=w*h;
      if(pixels>MAX_CANVAS_PIXELS){const scale=Math.sqrt(MAX_CANVAS_PIXELS/pixels);w=Math.max(640,Math.floor(w*scale));h=Math.max(360,Math.floor(h*scale))}
      if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;ctx.imageSmoothingEnabled=false;cameras.clear()}
    };
    requestAnimationFrame(resizeGameCanvas);
  }

  let lastRevision=-1;
  const auditTimer=setInterval(()=>{if(mode!=="playing"||!host)return;const revision=Number(host.revision||0);if(revision===lastRevision)return;lastRevision=revision;validateCriticalRoute("a dungeon state change");secureDeathCaches()},2200);
  window.addEventListener("pagehide",()=>clearInterval(auditTimer),{once:true});

  window.CCGLostSizzlerHardeningV108={BUILD,CHECKPOINT_SCHEMA,MAX_CANVAS_PIXELS,reachableFrom,nearestSafe,validateCriticalRoute,secureDeathCaches,startWeeklyUnified};
})();
