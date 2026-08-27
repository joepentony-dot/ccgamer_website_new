/* The Lost Sizzler V10.41 r32 — Spy overhaul world-owner seal.
 *
 * Retained r29 callers are still allowed to ask the exported Spy engine to
 * build its physical world. Once r32 is available those calls must resolve to
 * the r32 builder, otherwise an old 9x9 furniture map can replace the 7x7
 * overhaul between controller frames. This bridge owns only the exported Spy
 * world-builder hook and compatibility counters; it never owns window.update.
 */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V141_R32_SPY_WORLD_OWNER__)return;
  window.__CCG_LOST_SIZZLER_V141_R32_SPY_WORLD_OWNER__=true;

  const MODE_ID="sizzler-saboteurs",MONITOR_MS=20;
  const state={timer:0,installed:false,baseBuild:null,engine:null,reassertions:0,delegations:0,fallbacks:0,mirroredMoves:0,lastX:null,lastY:null,lastMode:false};

  const spyActive=()=>{try{return window.CCGLostSizzlerSpecialModes?.active?.type===MODE_ID||document.body?.dataset?.specialMode===MODE_ID}catch(_){return false}};
  const engine=()=>{try{return window.CCGLostSizzlerV141R29SpyEngine||null}catch(_){return null}};
  const overhaul=()=>{try{return window.CCGLostSizzlerV141R32SpyOverhaul||null}catch(_){return null}};

  function worldOwner(force=false){
    const next=overhaul();
    if(spyActive()&&typeof next?.buildOverhaulWorld==="function"){
      state.delegations++;
      return next.buildOverhaulWorld(Boolean(force));
    }
    state.fallbacks++;
    return typeof state.baseBuild==="function"?state.baseBuild.apply(this,arguments):false;
  }
  worldOwner.__ccgV141R32SpyWorldOwner=true;

  function install(){
    const current=engine();if(!current||typeof current.buildCompactWorld!=="function")return false;
    if(state.engine!==current){state.engine=current;state.baseBuild=null;state.lastX=state.lastY=null}
    if(current.buildCompactWorld!==worldOwner){
      if(!state.baseBuild||!spyActive())state.baseBuild=current.buildCompactWorld;
      current.buildCompactWorld=worldOwner;
      state.reassertions++;
    }
    const runtime=window.CCGLostSizzlerModeRuntime,registered=runtime?.runtimes?.[MODE_ID];
    if(registered&&registered.buildWorld!==worldOwner)registered.buildWorld=worldOwner;
    state.installed=true;return true
  }

  function mirrorLegacyMoveCounter(){
    const current=engine();if(!current?.state)return false;
    let live=null;try{live=p1||null}catch(_){}if(!spyActive()||!live){state.lastX=state.lastY=null;state.lastMode=false;return false}
    const x=Number(live.x),y=Number(live.y);if(!Number.isFinite(x)||!Number.isFinite(y))return false;
    if(!state.lastMode||state.lastX==null||state.lastY==null){state.lastX=x;state.lastY=y;state.lastMode=true;return false}
    const distance=Math.abs(x-state.lastX)+Math.abs(y-state.lastY);state.lastX=x;state.lastY=y;
    if(distance<=0)return false;
    current.state.moves=Number(current.state.moves||0)+1;state.mirroredMoves++;return true
  }

  function monitor(){install();mirrorLegacyMoveCounter()}
  monitor();state.timer=setInterval(()=>{try{monitor()}catch(error){console.warn("[Lost Sizzler r32] Spy world-owner monitor failed safely",error)}},MONITOR_MS);
  addEventListener("pagehide",()=>{if(state.timer)clearInterval(state.timer);state.timer=0},{once:true});

  window.CCGLostSizzlerV141R32SpyWorldOwner={worldOwner,install,mirrorLegacyMoveCounter,get state(){return state}};
})();