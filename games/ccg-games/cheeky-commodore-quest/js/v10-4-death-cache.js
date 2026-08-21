/* The Lost Sizzler V10.4 — single-use death cache rules. */
(function(){
  "use strict";
  if(window.__CCG_LOST_SIZZLER_DEATH_CACHE_V104__)return;
  window.__CCG_LOST_SIZZLER_DEATH_CACHE_V104__=true;

  function activeCaches(){
    return Array.isArray(host?.deathCaches)?host.deathCaches.filter(cache=>cache?.active):[];
  }

  function removeAllDeathCachesExcept(keep=null){
    if(!host||!Array.isArray(host.deathCaches))return;
    host.deathCaches=keep?[keep]:[];
    host.revision=(host.revision||0)+1;
    if(typeof broadcastWorld==="function")broadcastWorld();
  }

  function previousCacheLostPopup(){
    if(typeof showToast==="function")showToast(
      "PREVIOUS DEATH CACHE LOST",
      "You died again before recovering your previous cache. The old recovery box and everything left inside it have disappeared.",
      "red",
      11000
    );
    if(typeof say==="function")say("<strong>DEATH CACHE LOST.</strong> Only your newest death can be recovered.","red");
  }

  if(typeof window.hurtPlayer==="function"){
    const originalHurtPlayer=window.hurtPlayer;
    window.hurtPlayer=function hurtPlayerV104SingleCache(){
      const before=activeCaches().map(cache=>cache.id);
      const beforeSet=new Set(before);
      const deathsBefore=Number(run?.stats?.deaths||0);
      const weekly=Boolean(run?.daily);
      const result=originalHurtPlayer.apply(this,arguments);
      const deathsAfter=Number(run?.stats?.deaths||0);

      if(!weekly&&deathsAfter>deathsBefore&&host&&Array.isArray(host.deathCaches)){
        const after=activeCaches();
        const newlyCreated=after.filter(cache=>!beforeSet.has(cache.id));
        const newest=newlyCreated.length?newlyCreated[newlyCreated.length-1]:null;
        const previousWasLost=before.length>0;
        removeAllDeathCachesExcept(newest);
        if(previousWasLost)previousCacheLostPopup();
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
      const lost=Math.max(0,Number(recovered?.remaining||0));
      cache.active=false;
      cache.inventory=[];
      cache.games=[];
      removeAllDeathCachesExcept(null);
      S.sfx?.("pickup");

      const itemCount=Math.max(0,Number(recovered?.recovered||0));
      const gameCount=Math.max(0,Number(recovered?.games||0));
      const suffix=lost
        ? ` ${lost} item${lost===1?"":"s"} could not fit and were lost when the recovery box disappeared.`
        : " The recovery box has now disappeared.";
      showToast(
        "DEATH CACHE RECOVERED",
        `${itemCount} carried item${itemCount===1?"":"s"} and ${gameCount} rescued game${gameCount===1?"":"s"} recovered.${suffix}`,
        lost?"cyan":"green",
        9500
      );
    };
  }
})();
