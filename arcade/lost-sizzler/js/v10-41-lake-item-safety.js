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
 * runtime chains after a release. Dedicated multiplayer networking is lazy so
 * local-only modes never install its gameplay transport wrappers before the
 * corresponding online mode has actually started. */
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
  load("js/v10-41-r42-solo-live-recovery.js","data-ccg-v141-r42-solo-live-recovery");
  load("js/v10-41-r43-solo-save-continue.js","data-ccg-v141-r43-solo-save-continue");
  load("js/v10-41-r44-solo-cloud-save.js","data-ccg-v141-r44-solo-cloud-save");
  load("js/v10-41-r44-cloud-clear-guard.js","data-ccg-v141-r44-cloud-clear-guard");
  load("js/v10-41-spy-movement-finalizer.js","data-ccg-v141-spy-movement-finalizer");
  load("js/v10-41-tutorial-action-finalizer.js","data-ccg-v141-tutorial-action-finalizer");
  load("js/v10-41-r24-live-regressions.js","data-ccg-v141-r24-live-regressions");
  load("js/v10-41-r29-loop-finalizer.js","data-ccg-v141-r29-loop-finalizer");
  load("js/v10-41-multimode-performance.js","data-ccg-v141-multimode-performance");
  load("js/v10-41-r37-global-performance.js","data-ccg-v141-r37-global-performance");
  load("js/v10-41-release-overlay-safety.js","data-ccg-v141-release-overlay-safety");
  load("js/v10-41-r46-release-candidate-polish.js","data-ccg-v141-r46-release-candidate-polish");
  load("js/v10-41-r47-all-mode-optimisation.js","data-ccg-v141-r47-all-mode-optimisation");
  load("js/v10-41-r48-character-animation-polish.js","data-ccg-v141-r48-character-animation-polish");
  load("js/v10-41-r49-gamepad-input-polish.js","data-ccg-v141-r49-gamepad-input-polish");
  load("js/v10-41-r50-multiplayer-recovery-ux.js","data-ccg-v141-r50-multiplayer-recovery-ux");
  load("js/v10-41-r51-visual-ui-overhaul.js","data-ccg-v141-r51-visual-ui-overhaul");
  load("js/v10-41-r51-world-lighting-addendum.js","data-ccg-v141-r51-world-lighting-addendum");
  load("js/v10-41-r51-menu-focus-polish.js","data-ccg-v141-r51-menu-focus-polish");
  load("js/v10-41-r51-render-ownership-finalizer.js","data-ccg-v141-r51-render-ownership-finalizer");
  load("js/v10-41-r52-audio-accessibility.js","data-ccg-v141-r52-audio-accessibility");
  load("js/v10-41-r53-terminal-solo-end-recovery.js","data-ccg-v141-r53-terminal-solo-end-recovery");

  let dungeonLoaded=false,dungeonTimer=0;
  const dungeonOnline=()=>{
    try{
      const special=String(window.CCGLostSizzlerSpecialModes?.active?.type||document.body?.dataset?.specialMode||"");
      const roomMode=String(net?.getRoomMode?.()?.id||net?.roomMode||"dungeon");
      return playMode==="online"&&Boolean(net?.connected)&&roomMode==="dungeon"&&!special
    }catch(_){return false}
  };
  const loadDungeonServer=()=>{
    if(dungeonLoaded||!dungeonOnline())return false;
    dungeonLoaded=true;if(dungeonTimer)clearInterval(dungeonTimer);dungeonTimer=0;
    load("js/v10-41-r40-colyseus-dungeon.js","data-ccg-v141-r40-colyseus-dungeon");return true
  };
  if(!loadDungeonServer())dungeonTimer=setInterval(loadDungeonServer,250);

  let spyLoaded=false,spyTimer=0;
  const spyOnline=()=>{
    try{
      const special=String(window.CCGLostSizzlerSpecialModes?.active?.type||document.body?.dataset?.specialMode||"");
      const code=String(net?.roomCode||"").toUpperCase();
      return playMode==="online"&&Boolean(net?.connected)&&code.length>=4&&special==="sizzler-saboteurs"
    }catch(_){return false}
  };
  const loadSpyServer=()=>{
    if(spyLoaded||!spyOnline())return false;
    spyLoaded=true;if(spyTimer)clearInterval(spyTimer);spyTimer=0;
    load("js/v10-41-r41-colyseus-spy.js","data-ccg-v141-r41-colyseus-spy");return true
  };
  if(!loadSpyServer())spyTimer=setInterval(loadSpyServer,250);

  let hordeLoaded=false,hordeObserver=null;
  const loadHordeServer=()=>{
    if(hordeLoaded||document.body?.dataset?.specialMode!=="horde-survivor")return false;
    hordeLoaded=true;hordeObserver?.disconnect();hordeObserver=null;
    load("js/v10-41-r38-colyseus-horde.js","data-ccg-v141-r38-colyseus-horde");
    load("js/v10-41-r39-horde-responsive-handoff.js","data-ccg-v141-r39-horde-responsive-handoff");
    return true
  };
  if(!loadHordeServer()&&window.MutationObserver&&document.body){
    hordeObserver=new MutationObserver(records=>{if(records.some(record=>record.attributeName==="data-special-mode"))loadHordeServer()});
    hordeObserver.observe(document.body,{attributes:true,attributeFilter:["data-special-mode"]});
  }
  addEventListener("pagehide",()=>{hordeObserver?.disconnect();if(dungeonTimer)clearInterval(dungeonTimer);if(spyTimer)clearInterval(spyTimer)},{once:true});
})();