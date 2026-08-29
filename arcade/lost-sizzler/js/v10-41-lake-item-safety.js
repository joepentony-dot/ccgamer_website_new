/* The Lost Sizzler V10.41 — independent sanctuary lake/item safety guard. */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V141_LAKE_ITEM_SAFETY__)return;
  window.__CCG_LOST_SIZZLER_V141_LAKE_ITEM_SAFETY__=true;

  const ESSENTIAL=new Set(["key","mainKey","bronze","bronzeKey","exitSigil","sigil"]);
  const state={timer:0,repairs:0,lastRunKey:""};
  const key=(x,y)=>`${Math.round(Number(x))},${Math.round(Number(y))}`;
  const hordeActive=()=>{
    try{return window.CCGLostSizzlerSpecialModes?.active?.type==="horde-survivor"||document.body?.dataset?.specialMode==="horde-survivor"}catch(_){return false}
  };

  function essential(item){
    if(!item||item.active===false)return false;
    const kind=String(item.kind||item.type||""),title=String(item.title||item.name||item.label||"").toLowerCase();
    return ESSENTIAL.has(kind)||item.progressionEssential===true||item.mandatoryProgression===true||/exit\s*sigil|bronze\s*key|main\s*(?:vault\s*)?key|vault\s*key/.test(title);
  }

  function protectedCells(){
    const out=new Set(),reserve=(row,radius=0)=>{
      if(!row||!Number.isFinite(Number(row.x))||!Number.isFinite(Number(row.y)))return;
      const x=Math.round(Number(row.x)),y=Math.round(Number(row.y));for(let oy=-radius;oy<=radius;oy++)for(let ox=-radius;ox<=radius;ox++)out.add(key(x+ox,y+oy));
    };
    try{for(const item of host?.items||[])if(essential(item))reserve(item,1)}catch(_){}
    try{for(const marker of host?.progressionRecoveryMarkers||[])if(marker?.active!==false)reserve(marker,1)}catch(_){}
    try{if(host?.sigilDropPos)reserve(host.sigilDropPos,1)}catch(_){}
    try{for(const tile of host?.sanctuaryRegeneration||[])reserve(tile,1)}catch(_){}
    return out;
  }

  function repair(){
    if(hordeActive())return 0;
    try{if(!host||!world||!Array.isArray(host.sanctuaryScenes))return 0}catch(_){return 0}
    const protectedSet=protectedCells();if(!protectedSet.size)return 0;
    const removed=new Set();
    for(const scene of host.sanctuaryScenes){
      if(!Array.isArray(scene?.lake))continue;
      const before=scene.lake.length;scene.lake=scene.lake.filter(tile=>!protectedSet.has(key(tile.x,tile.y)));
      if(scene.lake.length!==before)for(const tile of (host.blockingDecor||[]).filter(row=>row?.type==="sanctuaryLake"&&Number(row.roomId)===Number(scene.roomId)&&protectedSet.has(key(row.x,row.y))))removed.add(key(tile.x,tile.y));
    }
    if(!removed.size)return 0;
    host.blockingDecor=(host.blockingDecor||[]).filter(row=>row?.type!=="sanctuaryLake"||!removed.has(key(row.x,row.y)));
    world.decor=(world.decor||[]).filter(row=>row?.type!=="sanctuaryLake"||!removed.has(key(row.x,row.y)));
    host.revision=(host.revision||0)+1;state.repairs+=removed.size;
    try{broadcastWorld?.()}catch(_){}
    try{console.warn(`[Lost Sizzler V10.41] removed ${removed.size} sanctuary lake tile(s) conflicting with progression items`)}catch(_){}
    return removed.size;
  }

  function tick(){
    if(hordeActive())return;
    if(document.body?.dataset?.runActive!=="true")return;
    try{if(!host||!world)return}catch(_){return}
    const runKey=`${run?.seed||"run"}|${run?.floor||1}`;if(state.lastRunKey!==runKey){state.lastRunKey=runKey;setTimeout(repair,120)}
    repair();
  }

  state.timer=setInterval(tick,300);tick();
  window.addEventListener("pagehide",()=>{if(state.timer)clearInterval(state.timer)},{once:true});
  window.CCGLostSizzlerV141LakeItemSafety={ESSENTIAL,essential,repair,get state(){return state}};
})();

/* Late V10.41 runtime guards. Every late module inherits the same published
 * cache generation as the canonical core files, preventing mixed old/new
 * runtime chains after a release. */
(()=>{
  "use strict";
  const releaseRev=String(document.querySelector('meta[name="ccg-lost-sizzler-cache"]')?.content||document.querySelector('meta[name="ccg-lost-sizzler-build"]')?.content||"latest").trim();
  const load=(path,marker)=>{
    if(document.querySelector(`script[${marker}="true"]`))return;
    const script=document.createElement("script");script.src=`${path}?v=${encodeURIComponent(releaseRev)}`;script.async=false;script.setAttribute(marker,"true");document.head.appendChild(script);
  };
  load("js/v10-41-startup-freeze-guard.js","data-ccg-v141-startup-freeze-guard");
  load("js/v10-41-environment-transparency-hotfix.js","data-ccg-v141-environment-transparency-hotfix");
  load("js/v10-41-horde-mode-safety.js","data-ccg-v141-horde-mode-safety");
  load("js/v10-41-horde-network-performance.js","data-ccg-v141-horde-network-performance");
  load("js/v10-41-multiplayer-no-pause.js","data-ccg-v141-multiplayer-no-pause");
  load("js/v10-41-browser-stability-gameplay-hotfix.js","data-ccg-v141-browser-stability-gameplay-hotfix");
  load("js/v10-41-spy-movement-finalizer.js","data-ccg-v141-spy-movement-finalizer");
  load("js/v10-41-tutorial-action-finalizer.js","data-ccg-v141-tutorial-action-finalizer");
  load("js/v10-41-r24-live-regressions.js","data-ccg-v141-r24-live-regressions");
  load("js/v10-41-r29-loop-finalizer.js","data-ccg-v141-r29-loop-finalizer");
  load("js/v10-41-multimode-performance.js","data-ccg-v141-multimode-performance");
  load("js/v10-41-r37-global-performance.js","data-ccg-v141-r37-global-performance");
  load("js/v10-41-r38-colyseus-horde.js","data-ccg-v141-r38-colyseus-horde");
})();
