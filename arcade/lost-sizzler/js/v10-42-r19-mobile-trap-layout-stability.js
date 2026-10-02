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
  const state={timer:0,canvasAspectRepairs:0,layoutPasses:0};
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
        /* R95 owns the portrait shell, HUD and touch dock. R19 now keeps only
           the canvas geometry contract required by trap/contact qualification. */
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
      }
`;
    document.head.appendChild(style);
    return true
  }

  const core=()=>window.CCGLostSizzlerV142R58AuthoritativeTrapCore||null;
  const delegate=(name,args)=>{const api=core(),fn=api?.[name];return typeof fn==="function"?fn(...args):false};

  function facadeState(){
    const gameplay=core()?.state||{};
    return Object.freeze({...gameplay,timer:state.timer,canvasAspectRepairs:state.canvasAspectRepairs,layoutPasses:state.layoutPasses});
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
    get state(){return facadeState()}
  });

  function tick(){
    installPortraitLayout();
    syncPortraitCanvasAspect();
    state.layoutPasses++;
  }

  window.CCGLostSizzlerV142R19MobileTrapLayoutStability=facade;
  window.CCGLostSizzlerV142R19MobileLayoutCompatibility=facade;
  installPortraitLayout();
  tick();
  state.timer=setInterval(()=>{try{tick()}catch(error){console.warn("[C64 Dungeon Carnage r58] portrait layout tick failed safely",error)}},MONITOR_MS);
  addEventListener("pagehide",()=>{if(state.timer)clearInterval(state.timer);state.timer=0},{once:true});
})();
