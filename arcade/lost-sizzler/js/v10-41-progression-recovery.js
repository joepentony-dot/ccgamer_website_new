/* The Lost Sizzler V10.41 — essential progression-item recovery hardening. */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V141_PROGRESSION_RECOVERY__)return;
  window.__CCG_LOST_SIZZLER_V141_PROGRESSION_RECOVERY__=true;

  const KINDS=new Set(["key","mainKey","bronze","bronzeKey","exitSigil","sigil"]);
  const state={installed:false,wrapped:false,timer:0};
  const activeCaches=()=>Array.isArray(host?.deathCaches)?host.deathCaches.filter(cache=>cache?.active):[];
  const kindOf=item=>String(item?.kind||"");

  function preferredOrigin(item,cache){
    for(const pair of [[item?.originX,item?.originY],[item?.spawnX,item?.spawnY],[item?.x0,item?.y0],[item?.x,item?.y],[cache?.x,cache?.y]]){
      if(pair.every(value=>Number.isFinite(Number(value))))return{x:Math.round(Number(pair[0])),y:Math.round(Number(pair[1]))};
    }
    return{x:Math.round(Number(world?.start?.x||1)),y:Math.round(Number(world?.start?.y||1))};
  }

  function safeCell(origin){
    if(!world?.map||!host)return origin;
    const free=(x,y)=>world.map?.[y]?.[x]===0&&!(host.blockingDecor||[]).some(row=>row.x===x&&row.y===y)&&!(host.doors||[]).some(row=>row.x===x&&row.y===y);
    if(free(origin.x,origin.y))return origin;
    for(let radius=1;radius<=8;radius++)for(let dy=-radius;dy<=radius;dy++)for(let dx=-radius;dx<=radius;dx++){
      if(Math.abs(dx)+Math.abs(dy)!==radius)continue;const x=origin.x+dx,y=origin.y+dy;if(free(x,y))return{x,y};
    }
    const fallback={x:Math.round(Number(world?.start?.x||origin.x)),y:Math.round(Number(world?.start?.y||origin.y))};
    return free(fallback.x,fallback.y)?fallback:origin;
  }

  function restoreFromSnapshots(caches){
    if(!host||!world)return 0;
    host.items=Array.isArray(host.items)?host.items:[];
    host.progressionRecoveryMarkers=Array.isArray(host.progressionRecoveryMarkers)?host.progressionRecoveryMarkers:[];
    let restored=0;
    for(const cache of caches||[]){
      const source=[...(cache?.inventory||[]),...(cache?.progressionItems||[])].filter(item=>KINDS.has(kindOf(item)));
      for(const item of source){
        const kind=kindOf(item),origin=safeCell(preferredOrigin(item,cache)),id=String(item.id||`v141-recovered-${kind}-${Date.now()}-${restored}`);
        let floorItem=host.items.find(row=>String(row?.id||"")===id);
        if(!floorItem){floorItem={...item,id,kind,x:origin.x,y:origin.y,active:true,recoveredProgression:true};host.items.push(floorItem)}
        else{floorItem.x=origin.x;floorItem.y=origin.y;floorItem.active=true;floorItem.recoveredProgression=true}
        const markerId=`progression-recovery-${id}`,sigil=/sigil/i.test(kind),bronze=/bronze/i.test(kind),payload={id:markerId,itemId:id,x:origin.x,y:origin.y,kind:sigil?"exitSigil":"key",label:sigil?"SIGIL":bronze?"BRONZE KEY":"KEY",active:true,known:true};
        const marker=host.progressionRecoveryMarkers.find(row=>String(row?.id||"")===markerId);if(marker)Object.assign(marker,payload);else host.progressionRecoveryMarkers.push(payload);
        restored++;
      }
    }
    if(restored){host.revision=(host.revision||0)+1;try{broadcastWorld?.();sync?.()}catch(_){}}
    return restored;
  }

  function wrapDeath(){
    if(state.wrapped||typeof window.hurtPlayer!=="function")return state.wrapped;
    const original=window.hurtPlayer;
    window.hurtPlayer=function hurtPlayerV141ProgressionRecovery(){
      const before=activeCaches().slice(),deathsBefore=Number(run?.stats?.deaths||0),result=original.apply(this,arguments),deathsAfter=Number(run?.stats?.deaths||0);
      if(run?.xpGameOver||run?.daily||deathsAfter<=deathsBefore||!before.length)return result;
      const restored=restoreFromSnapshots(before);
      if(restored)try{showToast("ESSENTIAL ITEMS RESTORED",`${restored} progression item${restored===1?" has":"s have"} returned to a safe floor position. Follow the KEY/SIGIL markers on the tactical radar or full map.`,"gold",9500)}catch(_){}
      return result;
    };
    state.wrapped=true;return true;
  }

  function install(){
    if(state.installed)return true;const gate=window.CCGLostSizzlerReleaseGate;if(gate&&!gate.state?.ready)return false;
    if(!window.CCGProgression||typeof window.hurtPlayer!=="function")return false;
    if(!wrapDeath())return false;state.installed=true;document.body.dataset.v141ProgressionRecovery="true";return true;
  }

  state.timer=setInterval(()=>{if(install()){clearInterval(state.timer);state.timer=0}},90);install();
  window.addEventListener("pagehide",()=>{if(state.timer)clearInterval(state.timer)},{once:true});
  window.CCGLostSizzlerV141ProgressionRecovery={KINDS,restoreFromSnapshots,get state(){return state}};
})();