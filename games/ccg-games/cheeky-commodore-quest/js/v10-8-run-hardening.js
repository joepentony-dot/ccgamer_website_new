/* The Lost Sizzler — V10.8 run-integrity hardening.
 * Defensive layer for soft-lock prevention, safe recovery, focus pausing,
 * multiplayer authority handoff, duplicate collection suppression, save schema
 * validation and consistent inventory warnings. It does not rebalance combat.
 */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_RUN_HARDENING_V108__)return;
  window.__CCG_LOST_SIZZLER_RUN_HARDENING_V108__=true;

  const BUILD="V10.8";
  const CHECKPOINT_SCHEMA=2;
  const CHECKPOINT_KEY="ccg-quest-v10.3-checkpoint";
  const dirs=[[1,0],[-1,0],[0,1],[0,-1]];
  const cell=(x,y)=>`${x},${y}`;
  const exists=name=>typeof window[name]==="function"||typeof globalThis[name]==="function";

  function safeWalkable(x,y,{ignoreDoors=false}={}){
    if(!world?.map?.[y]||world.map[y][x]!==0)return false;
    if((host?.blockingDecor||[]).some(d=>!d.destroyed&&d.x===x&&d.y===y))return false;
    if(!ignoreDoors){
      const d=(host?.doors||[]).find(door=>door.x===x&&door.y===y);
      if(d&&(!d.open||d.locked))return false;
    }
    return true;
  }

  function reachableFrom(start,{ignoreDoors=false}={}){
    const seen=new Set();
    if(!start||!safeWalkable(start.x,start.y,{ignoreDoors}))return seen;
    const q=[{x:start.x,y:start.y}];seen.add(cell(start.x,start.y));
    for(let i=0;i<q.length;i++)for(const [dx,dy] of dirs){
      const x=q[i].x+dx,y=q[i].y+dy,k=cell(x,y);
      if(seen.has(k)||!safeWalkable(x,y,{ignoreDoors}))continue;
      seen.add(k);q.push({x,y});
    }
    return seen;
  }

  function objectiveTargets(){
    if(!host||!world)return[];
    const out=[];
    if(host.objective?.complete){
      if(world.exit)out.push(world.exit);
      for(const d of host.doors||[])if(d.type==="exit"||d.exitDoor)out.push(d);
      for(const i of host.items||[])if(i.active&&i.kind==="exitSigil")out.push(i);
      return out;
    }
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
    for(const d of candidates){
      const sides=dirs.map(([dx,dy])=>({x:d.x+dx,y:d.y+dy})).filter(p=>safeWalkable(p.x,p.y,{ignoreDoors:true}));
      const hasReach=sides.some(p=>reachable.has(cell(p.x,p.y))),hasUnreach=sides.some(p=>!reachable.has(cell(p.x,p.y)));
      if(hasReach&&hasUnreach)return d;
    }
    return null;
  }

  function reopenDoorGroup(door){
    const group=door.groupId?(host.doors||[]).filter(d=>d.groupId===door.groupId):[door];
    for(const d of group){d.locked=false;d.open=true;d.opening=false;d.openAt=0;d.openingStart=0;d.openSoundDone=true}
    host.revision=(Number(host.revision)||0)+1;
  }

  function validateCriticalRoute(reason="state change"){
    if(mode!=="playing"||!p1||!host||!world||playMode==="online"&&!net?.isHost)return true;
    const targets=objectiveTargets();if(!targets.length)return true;
    let seen=reachableFrom(p1);
    if(targets.some(t=>seen.has(cell(Math.round(t.x),Math.round(t.y)))))return true;
    let opened=0;
    while(opened<4){
      const d=bridgeDoorFor(seen);if(!d)break;
      reopenDoorGroup(d);opened++;seen=reachableFrom(p1);
      if(targets.some(t=>seen.has(cell(Math.round(t.x),Math.round(t.y)))))break;
    }
    if(opened){
      try{S?.sfx?.("dooropen")}catch(_){}
      try{broadcastWorld?.()}catch(_){}
      try{showToast("ROUTE RECOVERY",`${opened} challenge door${opened===1?"":"s"} reopened after ${reason} so the floor objective remains reachable.`,"gold",8000)}catch(_){}
      return true;
    }
    return false;
  }

  function dangerousTile(x,y){
    if(!safeWalkable(x,y))return true;
    if((host?.enemies||[]).some(e=>e.alive&&e.x===x&&e.y===y))return true;
    if((host?.traps||[]).some(t=>t.active&&t.x===x&&t.y===y))return true;
    if((host?.hazardRooms||[]).some(h=>(h.cells||[]).some(c=>c.x===x&&c.y===y)))return true;
    if((host?.doors||[]).some(d=>d.x===x&&d.y===y))return true;
    return false;
  }

  function nearestSafe(origin,maxRadius=12){
    if(!origin)return null;
    if(!dangerousTile(origin.x,origin.y))return{x:origin.x,y:origin.y};
    for(let r=1;r<=maxRadius;r++)for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++){
      if(Math.abs(dx)+Math.abs(dy)!==r)continue;
      const x=origin.x+dx,y=origin.y+dy;if(!dangerousTile(x,y))return{x,y};
    }
    return null;
  }

  function secureDeathCaches(){
    if(!host?.deathCaches?.length||!world)return;
    for(const c of host.deathCaches)if(c?.active){
      const q=nearestSafe({x:Math.round(c.x),y:Math.round(c.y)},14);
      if(q){c.x=q.x;c.y=q.y}
    }
  }

  function securePlayerSpawn(p){
    if(!p)return;
    const q=nearestSafe({x:Math.round(p.x),y:Math.round(p.y)},10)||nearestSafe(world?.start,14);
    if(q){p.x=q.x;p.y=q.y;p.rx=q.x;p.ry=q.y}
    p.invuln=Math.max(Number(p.invuln)||0,1500);
  }

  // Respawn/cache safety and 1.5s grace period.
  if(typeof hurtPlayer==="function"){
    const original=hurtPlayer;
    hurtPlayer=function(p){
      const deaths=Number(run?.stats?.deaths||0),result=original.apply(this,arguments),after=Number(run?.stats?.deaths||0);
      if(after>deaths&&mode==="playing"){
        secureDeathCaches();securePlayerSpawn(p);validateCriticalRoute("a player death");
        try{sync?.()}catch(_){}
      }
      return result;
    };
  }

  if(typeof useTeleport==="function"){
    const original=useTeleport;
    useTeleport=function(p){
      const before=p?cell(p.x,p.y):"",result=original.apply(this,arguments);
      if(p&&cell(p.x,p.y)!==before){securePlayerSpawn(p);validateCriticalRoute("teleportation")}
      return result;
    };
  }

  if(typeof startWorld==="function"){
    const original=startWorld;
    startWorld=function(){const result=original.apply(this,arguments);setTimeout(()=>validateCriticalRoute("floor generation"),0);return result};
  }
  if(typeof descendFloor==="function"){
    const original=descendFloor;
    descendFloor=function(){const result=original.apply(this,arguments);setTimeout(()=>validateCriticalRoute("floor descent"),0);return result};
  }

  // Solo/local games should not keep attacking an unfocused player. Online play
  // deliberately remains live because one client cannot pause the room.
  let focusPauseLock=false;
  function pauseForFocusLoss(){
    if(focusPauseLock||mode!=="playing"||playMode==="online")return;
    focusPauseLock=true;input?.clear?.();
    try{if(typeof pause==="function")pause()}catch(_){}
    setTimeout(()=>{focusPauseLock=false},250);
  }
  window.addEventListener("blur",pauseForFocusLoss);
  document.addEventListener("visibilitychange",()=>{if(document.hidden)pauseForFocusLoss()});

  // Duplicate host/client collect packets must resolve exactly once per item id.
  const hostClaims=new Set(),clientCollections=new Set();
  if(typeof onCollectRequest==="function"){
    const original=onCollectRequest;
    onCollectRequest=function(req){
      const id=String(req?.itemId||"");if(!id)return original.apply(this,arguments);
      if(hostClaims.has(id))return false;
      const item=host?.items?.find(x=>String(x.id)===id&&x.active);if(!item)return false;
      hostClaims.add(id);const result=original.apply(this,arguments);return result;
    };
  }
  if(typeof onCollected==="function"){
    const original=onCollected;
    onCollected=function(ev){
      const id=String(ev?.item?.id||"");if(id&&clientCollections.has(id))return false;
      if(id)clientCollections.add(id);return original.apply(this,arguments);
    };
  }

  // Host migration handshake: the new host asks all remaining peers for their
  // latest world revision, adopts the freshest snapshot, then broadcasts once.
  if(typeof net!=="undefined"&&net?.cb){
    const originalMembers=net.cb.onMembers,originalPacket=net.cb.onPacket;
    let migration=null;
    net.cb.onMembers=function(members,isHost,changed){
      if(changed&&isHost&&mode==="playing"&&playMode==="online"){
        try{sync?.()}catch(_){}
        try{say?.("<strong>HOST MIGRATION.</strong> Checking the freshest dungeon state before taking control.","cyan")}catch(_){}
        const epoch=`${net.sessionId}-${Date.now()}`;
        migration={epoch,candidates:[{revision:Number(host?.revision||0),state:typeof serialWorld==="function"?serialWorld():null}]};
        net.send("migration_probe",{epoch,target:net.sessionId});
        setTimeout(()=>{
          if(!migration||migration.epoch!==epoch)return;
          const candidates=migration.candidates.filter(x=>x.state).sort((a,b)=>b.revision-a.revision),best=candidates[0];
          if(best&&best.revision>Number(host?.revision||0)&&typeof onWorld==="function"){
            const wasHost=net.isHost;net.isHost=false;try{onWorld(best.state)}finally{net.isHost=wasHost}
          }
          migration=null;try{broadcastWorld?.()}catch(_){}
          try{showToast?.("HOST MIGRATION COMPLETE","The freshest shared dungeon state is now authoritative.","green",5200)}catch(_){}
        },850);
        return;
      }
      return originalMembers?.(members,isHost,changed);
    };
    net.cb.onPacket=function(event,payload){
      if(event==="migration_probe"&&mode==="playing"&&playMode==="online"&&!net.isHost){
        net.send("migration_snapshot",{epoch:payload?.epoch,target:payload?.target,source:net.sessionId,revision:Number(host?.revision||0),state:typeof serialWorld==="function"?serialWorld():null});return;
      }
      if(event==="migration_snapshot"&&net.isHost&&migration&&payload?.target===net.sessionId&&payload?.epoch===migration.epoch){
        migration.candidates.push({revision:Number(payload.revision||0),state:payload.state||null});return;
      }
      return originalPacket?.(event,payload);
    };
  }

  // One source for Weekly Dungeon button behaviour. Guests play unranked;
  // signed-in users get one ranked attempt and may continue unranked afterwards.
  if(typeof startDaily==="function"){
    startDaily=async function(){
      const api=window.CCGWeeklyChallenge,state=api?.state;
      if(!state?.ready){showToast?.("WEEKLY DUNGEON","Still checking this week's dungeon seed. Try again in a moment.","cyan",5000);return}
      if(!state.seed){showToast?.("WEEKLY DUNGEON UNAVAILABLE","The shared weekly seed could not be loaded.","red",7000);api?.refresh?.();return}
      const audio=S.start(),fs=requestPlayFullscreen();await Promise.all([audio,fs]);
      let weekly={weekStart:state.weekStart,seed:state.seed,attempt:null,playerName:state.playerName||playerName()};
      if(state.signedIn&&!state.locked){
        try{const claimed=await api.claim();if(claimed?.attempt)weekly=claimed}catch(error){showToast?.("RANKED ATTEMPT UNAVAILABLE",`${error?.message||"Could not reserve the ranked attempt"} Starting an unranked Weekly Dungeon instead.`,"gold",8500)}
      }
      net.setSolo(weekly.playerName||playerName());beginRun({split:false,daily:true,seed:weekly.seed,weekly});
    };
  }

  // Save schema validation layered onto the existing local checkpoint key so
  // older valid beta saves remain readable but malformed/newer saves fail safe.
  if(typeof PGR!=="undefined"&&PGR){
    const oldMake=PGR.makeCheckpoint?.bind(PGR),oldSave=PGR.saveCheckpointData?.bind(PGR),oldLoad=PGR.loadCheckpoint?.bind(PGR);
    const validate=data=>Boolean(data&&data.version==="V10.3"&&data.run&&data.player&&Number(data.floor||data.run.floor)>=1&&Number(data.floor||data.run.floor)<=Number(C.maxFloors||5)&&Array.isArray(data.player.inventory||[])&&(!data.schemaVersion||Number(data.schemaVersion)<=CHECKPOINT_SCHEMA));
    if(oldMake)PGR.makeCheckpoint=function(){const data=oldMake(...arguments);if(data){data.schemaVersion=CHECKPOINT_SCHEMA;data.build=BUILD}return data};
    if(oldSave)PGR.saveCheckpointData=function(data){if(!validate(data))return false;data.schemaVersion=CHECKPOINT_SCHEMA;data.build=BUILD;return oldSave(data)};
    if(oldLoad)PGR.loadCheckpoint=function(){const data=oldLoad();if(!data)return null;if(validate(data))return data;try{localStorage.removeItem(CHECKPOINT_KEY)}catch(_){}return null};
    PGR.validateCheckpointV108=validate;
  }

  // Low-health copy must query the same inventory API as the quick inventory.
  if(typeof showToast==="function"){
    const original=showToast;
    showToast=function(title,text,tone,duration){
      if(/low health/i.test(String(title||""))&&p1&&PGR?.inventoryKindCount){
        const potions=Number(PGR.inventoryKindCount(p1,"potion")||0);
        if(potions>0)text=`${potions} Restoration Potion${potions===1?" is":"s are"} available — press E or its Quick Inventory number to heal.`;
      }
      return original(title,text,tone,duration);
    };
  }

  // Retired choice UI cannot be resurrected by stale styling or a later sync.
  try{UI?.artefactChoice?.remove?.()}catch(_){}

  // A lightweight route check after meaningful state churn catches challenge
  // locks that were not created through the known wrapper paths.
  let lastRevision=-1;
  setInterval(()=>{
    if(mode!=="playing"||!host)return;
    const revision=Number(host.revision||0);if(revision===lastRevision)return;lastRevision=revision;
    validateCriticalRoute("a dungeon state change");secureDeathCaches();
  },1800);

  window.CCGLostSizzlerHardeningV108={BUILD,CHECKPOINT_SCHEMA,reachableFrom,nearestSafe,validateCriticalRoute,secureDeathCaches};
})();
