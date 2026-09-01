/* The Lost Sizzler V10.41 — startup freeze guard.
 * V10.36 historically rebuilt the chest atlas using synchronous data-URL
 * encoding inside the release-gate finish callback. Large image allocations
 * there can stall the main thread while the loading UI is still showing 92%.
 * This guard marks that legacy synchronous pass as already handled, then
 * performs the same gutter preparation later using a canvas directly.
 */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V141_STARTUP_FREEZE_GUARD__)return;
  window.__CCG_LOST_SIZZLER_V141_STARTUP_FREEZE_GUARD__=true;

  const state={timer:0,hooked:false,observerArmed:false,bypassed:false,deferred:false,source:null,canvas:null};

  function pixelAssets(){
    try{return typeof lostSizzlerPixelAssets!=="undefined"?lostSizzlerPixelAssets:null}catch(_){return null}
  }

  function markLegacyGutterHandled(){
    const assets=pixelAssets(),source=assets?.chests;
    if(!source)return false;
    if(source.__ccgV141SafeGutter===true)return true;
    state.source=source;
    // V10.36 checks this marker before its synchronous encoded-image rebuild.
    // Marking the source here skips only that conversion; the safe pass below
    // still prepares the guttered atlas.
    try{source.__ccgV136Guttered=true}catch(_){}
    try{source.__ccgV141DeferredGutter=true}catch(_){}
    state.bypassed=true;
    return true;
  }

  function buildSafeGutter(){
    if(state.deferred)return true;
    const assets=pixelAssets(),source=state.source||assets?.chests;
    if(!assets||!source||source.__ccgV141SafeGutter===true)return false;
    const width=Number(source.naturalWidth||source.width||0),height=Number(source.naturalHeight||source.height||0);
    if(!width||!height||width%32||height%32)return false;
    try{
      const canvas=document.createElement("canvas");canvas.width=width;canvas.height=height;
      const g=canvas.getContext("2d");if(!g)return false;
      g.imageSmoothingEnabled=false;g.clearRect(0,0,width,height);
      for(let y=0;y<height;y+=32)for(let x=0;x<width;x+=32)g.drawImage(source,x+1,y+1,30,30,x+1,y+1,30,30);
      canvas.__ccgV136Guttered=true;canvas.__ccgV141SafeGutter=true;
      assets.chests=canvas;state.canvas=canvas;state.deferred=true;
      return true;
    }catch(error){console.warn("[Lost Sizzler V10.41] deferred chest gutter skipped safely",error);return false}
  }

  function scheduleSafeGutter(){
    const run=()=>{markLegacyGutterHandled();buildSafeGutter()};
    if(typeof requestIdleCallback==="function")requestIdleCallback(run,{timeout:1800});
    else setTimeout(run,80);
  }

  function hookReleaseGate(){
    const gate=window.CCGLostSizzlerReleaseGate;
    if(!gate||gate.__v141StartupFreezeGuard)return false;
    // V10.36 must own the inner wrapper. This guard is then placed outside it
    // so the legacy atlas marker is set immediately before installRuntime().
    if(!gate.__v136Hooked)return false;
    const current=gate.finish;
    if(typeof current!=="function")return false;
    gate.finish=function finishV141StartupFreezeGuard(){
      markLegacyGutterHandled();
      const result=current.apply(this,arguments);
      scheduleSafeGutter();
      return result;
    };
    gate.__v141StartupFreezeGuard=true;state.hooked=true;
    return true;
  }

  function armV136HookObserver(){
    const gate=window.CCGLostSizzlerReleaseGate;
    if(!gate||state.observerArmed)return Boolean(gate);
    let v136Hooked=Boolean(gate.__v136Hooked);
    try{
      Object.defineProperty(gate,"__v136Hooked",{
        configurable:true,
        enumerable:true,
        get(){return v136Hooked},
        set(value){
          v136Hooked=Boolean(value);
          if(!v136Hooked)return;
          markLegacyGutterHandled();
          if(hookReleaseGate()&&state.timer){clearInterval(state.timer);state.timer=0}
        }
      });
      state.observerArmed=true;
      if(v136Hooked)hookReleaseGate();
      return true;
    }catch(error){
      console.warn("[Lost Sizzler V10.41] deterministic V10.36 gate hook unavailable; retaining timer fallback",error);
      return false;
    }
  }

  function tick(){
    markLegacyGutterHandled();
    armV136HookObserver();
    if(hookReleaseGate()){
      if(state.timer){clearInterval(state.timer);state.timer=0}
      return;
    }
    const gate=window.CCGLostSizzlerReleaseGate?.state;
    if(gate?.ready){scheduleSafeGutter();if(state.timer){clearInterval(state.timer);state.timer=0}}
  }

  state.timer=setInterval(tick,25);tick();
  window.addEventListener("pagehide",()=>{if(state.timer)clearInterval(state.timer)},{once:true});
  window.CCGLostSizzlerV141StartupFreezeGuard={markLegacyGutterHandled,buildSafeGutter,scheduleSafeGutter,hookReleaseGate,get state(){return state}};
})();