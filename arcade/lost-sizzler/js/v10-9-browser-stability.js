/* The Lost Sizzler V10.9 — browser stability guardrails.
 *
 * This layer deliberately leaves game rules alone. It protects the browser from
 * runaway canvas reallocations and unexpectedly large transient render arrays,
 * both of which can turn a recoverable layout/effect bug into a crashed tab.
 */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_BROWSER_STABILITY__)return;
  window.__CCG_LOST_SIZZLER_BROWSER_STABILITY__=true;

  const coarsePointer=()=>window.matchMedia?.("(pointer: coarse)")?.matches===true;
  const deviceMemory=()=>Math.max(1,Number(navigator.deviceMemory)||4);
  const canvasPixelBudget=()=>{
    if(coarsePointer())return deviceMemory()<=2?1400000:1900000;
    if(deviceMemory()<=2)return 2200000;
    if(deviceMemory()<=4)return 3200000;
    return 5000000;
  };

  let resizeFrame=0;
  let resizeObserver=null;
  let safetyTimer=null;

  function stableCanvasSize(){
    const area=document.querySelector(".canvas-wrap");
    if(!area||typeof canvas==="undefined"||!canvas||typeof ctx==="undefined"||!ctx)return false;
    const rect=area.getBoundingClientRect();
    if(!Number.isFinite(rect.width)||!Number.isFinite(rect.height)||rect.width<2||rect.height<2)return false;

    let width=Math.max(640,Math.floor(rect.width));
    let height=Math.max(360,Math.floor(rect.height));
    const budget=canvasPixelBudget();
    const pixels=width*height;
    if(pixels>budget){
      const scale=Math.sqrt(budget/pixels);
      width=Math.max(640,Math.floor(width*scale));
      height=Math.max(360,Math.floor(height*scale));
    }

    /* A one-pixel CSS rounding wobble must never repeatedly destroy and recreate
     * the canvas backing store. Reallocate only for a material size change. */
    if(Math.abs(canvas.width-width)<2&&Math.abs(canvas.height-height)<2)return false;
    canvas.width=width;
    canvas.height=height;
    ctx.imageSmoothingEnabled=false;
    try{if(typeof cameras!=="undefined")cameras.clear();}catch(_){}
    return true;
  }

  function scheduleResize(){
    if(resizeFrame)return;
    resizeFrame=requestAnimationFrame(()=>{
      resizeFrame=0;
      stableCanvasSize();
    });
  }

  /* Replace the original direct resize function. Existing resize/fullscreen
   * listeners now call this guarded implementation without needing to be
   * rebound, while the extra observer watches the canvas wrapper itself because
   * the notification lane can legitimately change its height. */
  try{if(typeof resizeGameCanvas==="function")resizeGameCanvas=stableCanvasSize;}catch(error){console.warn("[Lost Sizzler] guarded canvas resize unavailable",error);}

  if(window.ResizeObserver){
    const area=document.querySelector(".canvas-wrap");
    if(area){
      resizeObserver=new ResizeObserver(scheduleResize);
      resizeObserver.observe(area);
    }
  }
  window.addEventListener("resize",scheduleResize,{passive:true});
  document.addEventListener("fullscreenchange",scheduleResize);

  function trimTransientArray(value,limit){
    if(!Array.isArray(value)||value.length<=limit)return;
    value.splice(0,value.length-limit);
  }

  function trimRunawayRenderState(){
    /* These ceilings are far above normal play. They only engage if a bug or
     * malformed online packet starts growing a transient list without bound. */
    try{if(typeof particles!=="undefined")trimTransientArray(particles,2600);}catch(_){}
    try{if(typeof rings!=="undefined")trimTransientArray(rings,700);}catch(_){}
    try{if(typeof floaters!=="undefined")trimTransientArray(floaters,700);}catch(_){}
    try{if(typeof bullets!=="undefined")trimTransientArray(bullets,900);}catch(_){}
    try{if(typeof enemyBullets!=="undefined")trimTransientArray(enemyBullets,1600);}catch(_){}
    try{if(typeof hazards!=="undefined")trimTransientArray(hazards,900);}catch(_){}
    try{if(typeof toastQueue!=="undefined")trimTransientArray(toastQueue,4);}catch(_){}
    try{if(typeof levelQueue!=="undefined")trimTransientArray(levelQueue,12);}catch(_){}
  }

  safetyTimer=setInterval(trimRunawayRenderState,2000);
  scheduleResize();

  window.addEventListener("pagehide",()=>{
    if(resizeFrame)cancelAnimationFrame(resizeFrame);
    resizeFrame=0;
    resizeObserver?.disconnect();
    resizeObserver=null;
    if(safetyTimer)clearInterval(safetyTimer);
    safetyTimer=null;
  },{once:true});

  window.CCGLostSizzlerBrowserStability={
    resize:scheduleResize,
    trim:trimRunawayRenderState,
    pixelBudget:canvasPixelBudget
  };
})();
