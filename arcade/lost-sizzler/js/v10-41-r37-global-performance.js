/* C64 Dungeon Carnage V10.41 r37 — local frame and visual-budget monitor. */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V141_R37_GLOBAL_PERFORMANCE__)return;
  window.__CCG_LOST_SIZZLER_V141_R37_GLOBAL_PERFORMANCE__=true;

  const VISUAL_TRIM_MS=250;
  const state={
    installed:false,timer:0,raf:0,
    visualTrims:0,visualItemsRemoved:0,
    frameSamples:0,lastFrameAt:0,avgFrameMs:16.7,fps:60,lowFps:false
  };

  const perfNow=()=>{try{return Number(performance.now())||Date.now()}catch(_){return Date.now()}};
  const gameplayActive=()=>{try{return document.body?.dataset?.runActive==="true"&&typeof mode!=="undefined"&&mode==="playing"}catch(_){return false}};

  function visualBudget(){
    const particlesBudget=state.lowFps?285:420;
    return{particles:particlesBudget,rings:state.lowFps?54:80,floaters:state.lowFps?64:96}
  }

  function trimArray(array,max){
    if(!Array.isArray(array)||array.length<=max)return 0;
    const remove=array.length-max;array.splice(0,remove);return remove
  }

  function trimVisuals(){
    if(!gameplayActive())return 0;
    const budget=visualBudget();let removed=0;
    try{removed+=trimArray(particles,budget.particles)}catch(_){}
    try{removed+=trimArray(rings,budget.rings)}catch(_){}
    try{removed+=trimArray(floaters,budget.floaters)}catch(_){}
    if(removed){state.visualTrims++;state.visualItemsRemoved+=removed}
    return removed
  }

  function frameSample(timestamp){
    const tick=Number(timestamp)||perfNow();
    if(state.lastFrameAt){
      const delta=Math.max(1,Math.min(120,tick-state.lastFrameAt));
      state.avgFrameMs=state.frameSamples?state.avgFrameMs*.92+delta*.08:delta;
      state.frameSamples++;
      state.fps=Math.max(1,Math.min(120,1000/state.avgFrameMs));
      state.lowFps=state.avgFrameMs>22.5;
    }else state.frameSamples=1;
    state.lastFrameAt=tick;
    state.raf=requestAnimationFrame(frameSample);
  }

  let lastVisualTrimAt=0;
  function tick(){
    const now=perfNow();
    if(now-lastVisualTrimAt>=VISUAL_TRIM_MS){lastVisualTrimAt=now;trimVisuals()}
  }

  function install(){
    if(state.installed)return true;
    state.installed=true;
    if(document.body)document.body.dataset.v141R37GlobalPerformance="true";
    return true
  }

  install();
  state.timer=setInterval(tick,80);
  state.raf=requestAnimationFrame(frameSample);
  addEventListener("pagehide",()=>{
    if(state.timer)clearInterval(state.timer);
    if(state.raf)cancelAnimationFrame(state.raf);
    state.timer=0;state.raf=0;
  },{once:true});

  window.CCGLostSizzlerV141R37GlobalPerformance={
    VISUAL_TRIM_MS,trimVisuals,visualBudget,install,
    getDiagnostics(){return{
      mode:gameplayActive()?"game":"menu",
      fps:Math.round(state.fps*10)/10,
      frameMs:Math.round(state.avgFrameMs*100)/100,
      lowFps:state.lowFps,
      visualItemsRemoved:state.visualItemsRemoved
    }},
    get state(){return state}
  };
})();
