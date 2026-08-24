/* The Lost Sizzler V10.4 — single-use death cache rules. */
(function(){
  "use strict";
  if(window.__CCG_LOST_SIZZLER_DEATH_CACHE_V104__)return;
  window.__CCG_LOST_SIZZLER_DEATH_CACHE_V104__=true;

  const progressionKinds=new Set(["key","mainKey","bronze","bronzeKey","exitSigil","sigil"]);

  function activeCaches(){
    return Array.isArray(host?.deathCaches)?host.deathCaches.filter(cache=>cache?.active):[];
  }

  function removeAllDeathCachesExcept(keep=null){
    if(!host||!Array.isArray(host.deathCaches))return;
    host.deathCaches=keep?[keep]:[];
    host.revision=(host.revision||0)+1;
    if(typeof broadcastWorld==="function")broadcastWorld();
  }

  function itemOrigin(item,cache){
    const candidates=[
      [item?.originX,item?.originY],[item?.spawnX,item?.spawnY],[item?.x0,item?.y0],[item?.x,item?.y],[cache?.x,cache?.y]
    ];
    for(const [x,y] of candidates)if(Number.isFinite(Number(x))&&Number.isFinite(Number(y)))return{x:Math.round(Number(x)),y:Math.round(Number(y))};
    return{x:Math.round(Number(world?.start?.x||1)),y:Math.round(Number(world?.start?.y||1))};
  }

  function safeRecoveryCell(origin){
    if(!world?.map||!host)return origin;
    const ok=(x,y)=>world.map?.[y]?.[x]===0&&!(host.blockingDecor||[]).some(row=>row.x===x&&row.y===y)&&!(host.doors||[]).some(row=>row.x===x&&row.y===y);
    if(ok(origin.x,origin.y))return origin;
    for(let radius=1;radius<=8;radius++)for(let dy=-radius;dy<=radius;dy++)for(let dx=-radius;dx<=radius;dx++){
      if(Math.abs(dx)+Math.abs(dy)!==radius)continue;const x=origin.x+dx,y=origin.y+dy;if(ok(x,y))return{x,y};
    }
    return{x:Math.round(Number(world?.start?.x||origin.x)),y:Math.round(Number(world?.start?.y||origin.y))};
  }

  function restoreProgressionItems(cache){
    if(!cache||!host)return 0;
    const source=[];
    for(const item of cache.inventory||[])if(progressionKinds.has(String(item?.kind||"")))source.push(item);
    for(const item of cache.progressionItems||[])if(progressionKinds.has(String(item?.kind||"")))source.push(item);
    if(!source.length)return 0;
    host.items=Array.isArray(host.items)?host.items:[];
    host.progressionRecoveryMarkers=Array.isArray(host.progressionRecoveryMarkers)?host.progressionRecoveryMarkers:[];
    let restored=0;
    for(const item of source){
      const kind=String(item.kind||"key"),origin=safeRecoveryCell(itemOrigin(item,cache));
      const id=String(item.id||`recovered-${kind}-${Date.now()}-${restored}`);
      let floorItem=host.items.find(row=>String(row?.id||"")===id);
      if(!floorItem){floorItem={...item,id,x:origin.x,y:origin.y,kind,active:true,recoveredProgression:true};host.items.push(floorItem)}
      else{floorItem.x=origin.x;floorItem.y=origin.y;floorItem.active=true;floorItem.recoveredProgression=true}
      const markerId=`progression-recovery-${id}`;
      const label=/sigil/i.test(kind)?"SIGIL":/bronze/i.test(kind)?"BRONZE KEY":"KEY";
      const marker=host.progressionRecoveryMarkers.find(row=>row.id===markerId);
      const payload={id:markerId,itemId:id,x:origin.x,y:origin.y,kind:/sigil/i.test(kind)?"exitSigil":"key",label,active:true,known:true};
      if(marker)Object.assign(marker,payload);else host.progressionRecoveryMarkers.push(payload);
      restored++;
    }
    cache.inventory=(cache.inventory||[]).filter(item=>!progressionKinds.has(String(item?.kind||"")));
    cache.progressionItems=[];
    if(restored){host.revision=(host.revision||0)+1;try{broadcastWorld?.()}catch(_){}}
    return restored;
  }

  function previousCacheLostPopup(restored=0){
    if(typeof showToast==="function")showToast(
      restored?"PREVIOUS CACHE LOST — ESSENTIALS RESTORED":"PREVIOUS DEATH CACHE LOST",
      restored
        ?`You died again before recovering the old box. Ordinary loot was lost, but ${restored} essential progression item${restored===1?" was":"s were"} returned to the floor and are marked on your maps.`
        :"You died again before recovering your previous cache. The old recovery box and non-essential contents have disappeared.",
      restored?"gold":"red",
      11000
    );
    if(typeof say==="function")say(restored?"<strong>ESSENTIAL ITEMS RESTORED.</strong> Check the map markers.":"<strong>DEATH CACHE LOST.</strong> Only your newest death can be recovered.",restored?"gold":"red");
  }

  if(typeof window.hurtPlayer==="function"){
    const originalHurtPlayer=window.hurtPlayer;
    window.hurtPlayer=function hurtPlayerV104SingleCache(){
      const beforeCaches=activeCaches();
      const before=beforeCaches.map(cache=>cache.id);
      const beforeSet=new Set(before);
      const deathsBefore=Number(run?.stats?.deaths||0);
      const weekly=Boolean(run?.daily);
      const result=originalHurtPlayer.apply(this,arguments);
      const deathsAfter=Number(run?.stats?.deaths||0);

      // A second zero-XP death ends the run outright. The run is over, so the
      // terminal game-over cleanup remains authoritative.
      if(run?.xpGameOver){
        removeAllDeathCachesExcept(null);
        return result;
      }

      if(!weekly&&deathsAfter>deathsBefore&&host&&Array.isArray(host.deathCaches)){
        const after=activeCaches();
        const newlyCreated=after.filter(cache=>!beforeSet.has(cache.id));
        const newest=newlyCreated.length?newlyCreated[newlyCreated.length-1]:null;
        let restored=0;
        for(const oldCache of beforeCaches)restored+=restoreProgressionItems(oldCache);
        const previousWasLost=before.length>0;
        removeAllDeathCachesExcept(newest);
        if(previousWasLost)previousCacheLostPopup(restored);
      }
      return result;
    };
  }

  if(typeof window.triggerDeathCache==="function"){
    window.triggerDeathCache=function triggerDeathCacheV104SingleUse(player){
      if(!player||!host||!Array.isArray(host.deathCaches))return;
      const cache=host.deathCaches.find(entry=>entry?.active&&entry.x===player.x&&entry.y===player.y);
      if(!cache)return;

      const recovered=PGR.recoverDeathCache(player,run,cache);
      score+=Math.max(0,Number(recovered?.score||0));
      const lost=Math.max(0,Number(recovered?.remaining||0));
      cache.active=false;
      cache.inventory=[];
      cache.games=[];
      cache.score=0;
      cache.xp=0;
      removeAllDeathCachesExcept(null);
      S.sfx?.("pickup");

      const itemCount=Math.max(0,Number(recovered?.recovered||0));
      const gameCount=Math.max(0,Number(recovered?.games||0));
      const suffix=lost
        ?` ${lost} non-essential item${lost===1?"":"s"} could not fit and were lost when the recovery box disappeared.`
        :" The recovery box has now disappeared.";
      showToast(
        "DEATH CACHE RECOVERED",
        `${itemCount} carried item${itemCount===1?"":"s"}, ${gameCount} rescued game${gameCount===1?"":"s"}, ${Math.max(0,Number(recovered?.score||0)).toLocaleString()} score and ${Math.max(0,Number(recovered?.xp||0)).toLocaleString()} XP recovered.${suffix}`,
        lost?"cyan":"green",
        9500
      );
      if(recovered?.levels?.length){S.sfx?.("level");if(typeof queueLevelChoice==="function")queueLevelChoice(player)}
    };
  }

  window.CCGLostSizzlerDeathCacheV104={restoreProgressionItems};
})();