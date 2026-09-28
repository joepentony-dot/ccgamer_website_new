/* C64 Dungeon Carnage V10.42 r58 — portrait mobile layout compatibility only.
 * Gameplay ownership is canonical in game-play.js. This module must never own
 * FIRE, triggerTrap, hurtPlayer or ordinary floor-trap HEALTH changes.
 */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V142_R19_MOBILE_TRAP_LAYOUT_STABILITY__)return;
  window.__CCG_LOST_SIZZLER_V142_R19_MOBILE_TRAP_LAYOUT_STABILITY__=true;

  const STYLE_ID="ccg-v142-r19-mobile-trap-layout";
  const MONITOR_MS=80;
  const state={timer:0,canvasAspectRepairs:0,layoutPasses:0,trapLivenessPasses:0,trapLivenessHits:0,trapLivenessErrors:0};
  const specialType=()=>{try{return String(window.CCGLostSizzlerSpecialModes?.active?.type||document.body?.dataset?.specialMode||"")}catch(_){return""}};
  const ordinaryDungeon=()=>document.body?.dataset?.runActive==="true"&&!new Set(["horde-survivor","sizzler-saboteurs"]).has(specialType());

  function portraitTouchViewport(){
    try{
      const portrait=window.matchMedia?.("(orientation: portrait)")?.matches ?? (Number(window.innerHeight||0)>=Number(window.innerWidth||0));
      const coarse=window.matchMedia?.("(pointer: coarse)")?.matches===true;
      return Boolean(portrait&&(coarse||Number(window.innerWidth||0)<=900));
    }catch(_){return false}
  }

  function syncPortraitCanvasAspect(){
    if(!ordinaryDungeon()||!portraitTouchViewport())return false;
    const wrap=document.querySelector?.(".canvas-wrap");
    const gameCanvas=document.getElementById?.("game")||window.canvas||globalThis.canvas;
    if(!wrap||!gameCanvas)return false;
    const rect=wrap.getBoundingClientRect?.();
    const cssW=Number(rect?.width||0),cssH=Number(rect?.height||0);
    if(!Number.isFinite(cssW)||!Number.isFinite(cssH)||cssW<2||cssH<2)return false;

    /* The canonical resize guard protects the render budget with a 640x360
       minimum backing store. On narrow portrait phones that independently
       clamps width but not height, producing a backing-store aspect ratio that
       no longer matches the displayed canvas. Scale both axes together instead:
       square dungeon tiles stay square while the camera can use the taller phone
       viewport rather than stretching a landscape frame. */
    const scale=Math.max(1,640/cssW,360/cssH);
    let targetW=Math.max(2,Math.round(cssW*scale));
    let targetH=Math.max(2,Math.round(cssH*scale));
    const maxPixels=1900000;
    if(targetW*targetH>maxPixels){
      const budgetScale=Math.sqrt(maxPixels/(targetW*targetH));
      targetW=Math.max(2,Math.floor(targetW*budgetScale));
      targetH=Math.max(2,Math.floor(targetH*budgetScale));
    }
    const cssAspect=cssW/cssH,currentAspect=Number(gameCanvas.width||0)/Math.max(1,Number(gameCanvas.height||0));
    const targetAspect=targetW/targetH;
    if(Math.abs(currentAspect-cssAspect)<=0.004&&Math.abs(currentAspect-targetAspect)<=0.004)return false;
    gameCanvas.width=targetW;gameCanvas.height=targetH;
    try{const gameCtx=window.ctx||globalThis.ctx;if(gameCtx)gameCtx.imageSmoothingEnabled=false}catch(_){}
    try{window.cameras?.clear?.();globalThis.cameras?.clear?.()}catch(_){}
    state.canvasAspectRepairs++;
    return true
  }

  function installPortraitLayout(){
    if(document.getElementById(STYLE_ID))return true;
    const style=document.createElement("style");
    style.id=STYLE_ID;
    style.textContent=`
      @media (orientation:portrait) and (max-width:900px), (orientation:portrait) and (pointer:coarse){
        /* During active portrait play only three direct shell rows should own
           viewport height: mission, dungeon and compact combat HUD. The normal
           title/desktop information rows are useful before play, but leaving
           them in grid auto-placement after switching to a three-row template
           creates implicit rows and can collapse .game-area to zero height. */
        body[data-run-active="true"] .ccg-game,
        body[data-run-active="true"] .ccg-game:fullscreen,
        body[data-run-active="true"] .ccg-game:-webkit-full-screen{
          grid-template-rows:28px minmax(0,1fr) 74px!important;
        }
        body[data-run-active="true"] .ccg-game>.v102-topbar,
        body[data-run-active="true"] .ccg-game>.critical-strip,
        body[data-run-active="true"] .ccg-game>.fullscreen-hint,
        body[data-run-active="true"] .ccg-game>.tactical-zone{
          display:none!important;
        }
        body[data-run-active="true"] .ccg-game>.mission{
          grid-row:1!important;
          height:28px!important;
          min-height:28px!important;
          padding:3px 7px!important;
        }
        body[data-run-active="true"] .ccg-game>.game-area{
          grid-row:2!important;
          min-height:0!important;
          height:100%!important;
        }
        body[data-run-active="true"] .ccg-game>.player-hub{
          grid-row:3!important;
          display:grid!important;
          grid-template-columns:minmax(0,1.18fr) minmax(0,1fr)!important;
          grid-template-rows:minmax(0,1fr)!important;
          gap:3px!important;
          height:74px!important;
          min-height:74px!important;
          max-height:74px!important;
          padding:3px max(4px,env(safe-area-inset-right)) max(3px,env(safe-area-inset-bottom)) max(4px,env(safe-area-inset-left))!important;
          overflow:hidden!important;
        }
        body[data-run-active="true"] .ccg-game>.player-hub>.hub-inventory,
        body[data-run-active="true"] .ccg-game>.player-hub>.hub-telemetry{
          display:none!important;
        }
        body[data-run-active="true"] .ccg-game>.player-hub>.core-stats{
          grid-template-columns:repeat(4,minmax(0,1fr))!important;
          gap:2px!important;
          min-width:0!important;
        }
        body[data-run-active="true"] .ccg-game>.player-hub .hub-stat{
          min-width:0!important;
          min-height:0!important;
          padding:3px 2px 9px!important;
        }
        body[data-run-active="true"] .ccg-game>.player-hub .hub-stat span{
          font-size:5.8px!important;
        }
        body[data-run-active="true"] .ccg-game>.player-hub .hub-stat b{
          margin-top:2px!important;
          font-size:9px!important;
        }
        body[data-run-active="true"] .ccg-game>.player-hub>.hub-progress{
          grid-column:auto!important;
          display:grid!important;
          grid-template-columns:minmax(78px,1.35fr) repeat(3,minmax(38px,.55fr))!important;
          grid-template-rows:minmax(0,1fr)!important;
          gap:2px!important;
          min-width:0!important;
        }
        body[data-run-active="true"] .ccg-game>.player-hub .priority-xp{
          grid-column:auto!important;
          min-width:0!important;
          padding:3px!important;
        }
        body[data-run-active="true"] .ccg-game>.player-hub .priority-xp-head{
          display:block!important;
        }
        body[data-run-active="true"] .ccg-game>.player-hub .priority-xp-head b,
        body[data-run-active="true"] .ccg-game>.player-hub .priority-xp-head strong{
          display:block!important;
          font-size:6px!important;
          white-space:nowrap!important;
          overflow:hidden!important;
          text-overflow:ellipsis!important;
        }
        body[data-run-active="true"] .ccg-game>.player-hub .priority-xp small{
          display:none!important;
        }
        body[data-run-active="true"] .ccg-game>.player-hub .xp-track{
          height:5px!important;
          margin:3px 0 0!important;
        }
        body[data-run-active="true"] .ccg-game>.player-hub .run-stat{
          min-width:0!important;
          padding:3px 2px!important;
        }
        body[data-run-active="true"] .ccg-game>.player-hub .run-stat span{
          font-size:5.5px!important;
        }
        body[data-run-active="true"] .ccg-game>.player-hub .run-stat b{
          margin-top:2px!important;
          font-size:8px!important;
        }
        body[data-run-active="true"] .ccg-game>.game-area>.canvas-wrap,
        body[data-run-active="true"] .ccg-game:fullscreen>.game-area>.canvas-wrap,
        body[data-run-active="true"] .ccg-game:-webkit-full-screen>.game-area>.canvas-wrap{
          width:100%!important;
          height:100%!important;
          min-width:0!important;
          min-height:0!important;
          max-width:100%!important;
          max-height:100%!important;
          aspect-ratio:auto!important;
          overflow:hidden!important;
        }
        body[data-run-active="true"] .ccg-game>.game-area>.canvas-wrap>canvas#game,
        body[data-run-active="true"] .ccg-game:fullscreen>.game-area>.canvas-wrap>canvas#game,
        body[data-run-active="true"] .ccg-game:-webkit-full-screen>.game-area>.canvas-wrap>canvas#game,
        body[data-run-active="true"] .ccg-game .v102-game-area .canvas-wrap canvas#game{
          display:block!important;
          width:100%!important;
          height:100%!important;
          max-width:100%!important;
          max-height:100%!important;
          aspect-ratio:auto!important;
          object-fit:fill!important;
        }
        body[data-run-active="true"] .ccg-game>.game-area>#v104-touch-controls{
          display:flex!important;
          grid-template-columns:138px minmax(0,1fr)!important;
          gap:5px!important;
          min-height:146px!important;
          max-height:146px!important;
          padding:4px max(5px,env(safe-area-inset-right)) max(4px,env(safe-area-inset-bottom)) max(5px,env(safe-area-inset-left))!important;
        }
        body[data-run-active="true"] .ccg-game #v104-touch-controls .v104-touch-pad{
          grid-template-columns:repeat(3,44px)!important;
          grid-template-rows:repeat(3,44px)!important;
          gap:2px!important;
          width:136px!important;
          height:136px!important;
        }
        body[data-run-active="true"] .ccg-game #v104-touch-controls .v104-touch-pad .v104-touch-btn{
          min-width:44px!important;
          min-height:44px!important;
          padding:0!important;
        }
        body[data-run-active="true"] .ccg-game #v104-touch-controls .v104-touch-actions{
          height:136px!important;
          gap:4px!important;
        }
        body[data-run-active="true"] .ccg-game #v104-touch-controls .v104-touch-btn{
          min-height:44px!important;
          padding:3px 2px!important;
          font-size:9.5px!important;
          line-height:1.08!important;
        }
      }
      @media (orientation:portrait) and (max-width:380px){
        body[data-run-active="true"] .ccg-game>.game-area>#v104-touch-controls{
          grid-template-columns:136px minmax(0,1fr)!important;
          min-height:146px!important;
          max-height:146px!important;
        }
      }
    `;
    document.head.appendChild(style);
    return true
  }

  const core=()=>window.CCGLostSizzlerV142R58AuthoritativeTrapCore||null;
  const delegate=(name,args)=>{const api=core(),fn=api?.[name];return typeof fn==="function"?fn(...args):false};

  function facadeState(){
    const gameplay=core()?.state||{};
    return Object.freeze({...gameplay,timer:state.timer,canvasAspectRepairs:state.canvasAspectRepairs,layoutPasses:state.layoutPasses,trapLivenessPasses:state.trapLivenessPasses,trapLivenessHits:state.trapLivenessHits,trapLivenessErrors:state.trapLivenessErrors});
  }

  const facade=Object.freeze({
    version:"V10.42-r58-mobile-layout-compatibility",
    gameplayOwnership:false,
    installPortraitLayout,
    syncPortraitCanvasAspect,
    damageValidatedTrapContact:(...args)=>delegate("damageValidatedTrapContact",args),
    guaranteeTrapContactDamage:(...args)=>delegate("guaranteeTrapContactDamage",args),
    damageOccupiedActiveTraps:(...args)=>delegate("damageOccupiedActiveTraps",args),
    rearmInactiveTrapContacts:(...args)=>delegate("rearmInactiveTrapContacts",args),
    rearmStaleCycleContact:(...args)=>delegate("rearmStaleCycleContact",args),
    updateTrapContacts:(...args)=>delegate("updateTrapContacts",args),
    trapActive:(...args)=>delegate("trapActive",args),
    trapCycleId:(...args)=>delegate("trapCycleId",args),
    withValidatedTrapContact:(p,t,callback)=>typeof callback==="function"?callback():false,
    serviceTrapLiveness,
    get state(){return facadeState()}
  });

  function serviceTrapLiveness(){
    if(!ordinaryDungeon())return false;
    const api=core(),fn=api?.updateTrapContacts;
    if(typeof fn!=="function")return false;
    state.trapLivenessPasses++;
    try{
      const hit=Boolean(fn("monitor"));
      if(hit)state.trapLivenessHits++;
      return hit
    }catch(error){
      state.trapLivenessErrors++;
      console.warn("[C64 Dungeon Carnage r64] authoritative trap liveness pass failed safely",error);
      return false
    }
  }

  function tick(){
    installPortraitLayout();
    syncPortraitCanvasAspect();
    serviceTrapLiveness();
    state.layoutPasses++;
  }

  window.CCGLostSizzlerV142R19MobileTrapLayoutStability=facade;
  window.CCGLostSizzlerV142R19MobileLayoutCompatibility=facade;
  installPortraitLayout();
  tick();
  state.timer=setInterval(()=>{try{tick()}catch(error){console.warn("[C64 Dungeon Carnage r58] portrait layout tick failed safely",error)}},MONITOR_MS);
  addEventListener("pagehide",()=>{if(state.timer)clearInterval(state.timer);state.timer=0},{once:true});
})();
