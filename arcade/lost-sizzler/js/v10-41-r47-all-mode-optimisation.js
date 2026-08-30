/* The Lost Sizzler V10.41 r47 — all-mode performance governor and fault telemetry.
 *
 * This layer never owns simulation, combat, scoring, collision, world generation,
 * saves or multiplayer transport. It observes the existing runtime, trims only
 * disposable visual arrays when sustained frame pressure is detected, records
 * bounded diagnostics and reports deduplicated client faults through the existing
 * feedback endpoint.
 */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V141_R47_ALL_MODE_OPTIMISATION__)return;
  window.__CCG_LOST_SIZZLER_V141_R47_ALL_MODE_OPTIMISATION__=true;

  const BUILD="V10.41-r47";
  const FUNCTION_NAME="lost-sizzler-feedback";
  const SAMPLE_MS=500;
  const ERROR_COOLDOWN_MS=60000;
  const MAX_ERRORS_PER_SESSION=6;
  const TIERS={NORMAL:"normal",REDUCED:"reduced",SEVERE:"severe"};
  const MODES=new Set(["solo","online","split","daily","tutorial","dungeon","horde-survivor","sizzler-saboteurs"]);
  const state={
    tier:TIERS.NORMAL,timer:0,longTaskObserver:null,mode:"menu",samples:0,
    reducedVotes:0,severeVotes:0,recoveryVotes:0,lastFrameMs:16.7,lastFps:60,
    trims:0,visualsRemoved:0,longTasks:0,longTaskMs:0,maxLongTaskMs:0,lastLongTaskAt:0,
    errorsObserved:0,errorsReported:0,errorsSuppressed:0,errorKeys:new Map(),
    lastSnapshot:null,modeTransitions:0,runTransitions:0,lastRunActive:false,
    gameplayArrayWarnings:0
  };

  const now=()=>{try{return Number(performance.now())||Date.now()}catch(_){return Date.now()}};
  const safe=value=>String(value??"").trim();
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,Number(value)||0));
  const activeRun=()=>document.body?.dataset?.runActive==="true";
  const currentMode=()=>{
    try{
      const special=safe(window.CCGLostSizzlerSpecialModes?.active?.type||document.body?.dataset?.specialMode);
      if(special)return special;
      if(document.body?.dataset?.tutorialActive==="true")return"tutorial";
      if(run?.daily)return"daily";
      const current=safe(playMode||"");
      if(current==="online")return safe(net?.getRoomMode?.()?.id||net?.roomMode||"dungeon")||"dungeon";
      if(current)return current;
    }catch(_){}
    return activeRun()?"solo":"menu"
  };
  const normalizedMode=mode=>MODES.has(safe(mode))?safe(mode):safe(mode)||"unknown";

  function budgets(mode=currentMode(),tier=state.tier){
    mode=normalizedMode(mode);
    let particles=420,rings=80,floaters=96;
    if(mode==="split"){particles=320;rings=72;floaters=82}
    else if(mode==="horde-survivor"){particles=260;rings=64;floaters=76}
    else if(mode==="sizzler-saboteurs"){particles=240;rings=60;floaters=72}
    else if(mode==="online"||mode==="dungeon"){particles=340;rings=72;floaters=84}
    else if(mode==="tutorial"){particles=300;rings=64;floaters=76}
    else if(mode==="daily"){particles=390;rings=76;floaters=90}
    const scale=tier===TIERS.SEVERE?.52:tier===TIERS.REDUCED?.74:1;
    return{
      particles:Math.max(120,Math.floor(particles*scale)),
      rings:Math.max(36,Math.floor(rings*scale)),
      floaters:Math.max(42,Math.floor(floaters*scale))
    }
  }

  function trimArray(array,max){
    if(!Array.isArray(array)||array.length<=max)return 0;
    const remove=array.length-max;array.splice(0,remove);return remove
  }
  function trimDecorativeVisuals(mode=currentMode(),tier=state.tier){
    if(!activeRun()||tier===TIERS.NORMAL)return 0;
    const budget=budgets(mode,tier);let removed=0;
    try{removed+=trimArray(particles,budget.particles)}catch(_){}
    try{removed+=trimArray(rings,budget.rings)}catch(_){}
    try{removed+=trimArray(floaters,budget.floaters)}catch(_){}
    if(removed){state.trims++;state.visualsRemoved+=removed}
    return removed
  }

  function frameStats(){
    try{
      const diag=window.CCGLostSizzlerV141R37GlobalPerformance?.getDiagnostics?.();
      if(diag&&Number.isFinite(Number(diag.frameMs)))return{frameMs:Number(diag.frameMs),fps:Number(diag.fps)||0}
    }catch(_){}
    return{frameMs:16.7,fps:60}
  }
  function chooseTier(frameMs,longTaskPressure=false){
    const ms=clamp(frameMs,1,250);
    if(ms>=28||longTaskPressure)return TIERS.SEVERE;
    if(ms>=20.5)return TIERS.REDUCED;
    return TIERS.NORMAL
  }
  function applyTier(next){
    if(!Object.values(TIERS).includes(next))next=TIERS.NORMAL;
    if(state.tier===next)return false;
    state.tier=next;
    if(document.body)document.body.dataset.v141R47PerformanceTier=next;
    return true
  }
  function evaluatePressure(frameMs,longTaskPressure=false){
    const vote=chooseTier(frameMs,longTaskPressure);
    if(vote===TIERS.SEVERE){state.severeVotes++;state.reducedVotes=0;state.recoveryVotes=0}
    else if(vote===TIERS.REDUCED){state.reducedVotes++;state.severeVotes=Math.max(0,state.severeVotes-1);state.recoveryVotes=0}
    else{state.recoveryVotes++;state.reducedVotes=Math.max(0,state.reducedVotes-1);state.severeVotes=Math.max(0,state.severeVotes-1)}
    if(state.severeVotes>=2)applyTier(TIERS.SEVERE);
    else if(state.reducedVotes>=3&&state.tier===TIERS.NORMAL)applyTier(TIERS.REDUCED);
    else if(state.recoveryVotes>=8&&state.tier!==TIERS.NORMAL)applyTier(TIERS.NORMAL);
    else if(state.recoveryVotes>=5&&state.tier===TIERS.SEVERE)applyTier(TIERS.REDUCED);
    return state.tier
  }

  function gameplayArraySanity(){
    let warned=false;
    try{if(Array.isArray(bullets)&&bullets.length>5000)warned=true}catch(_){}
    try{if(Array.isArray(enemyBullets)&&enemyBullets.length>5000)warned=true}catch(_){}
    try{if(Array.isArray(hazards)&&hazards.length>2500)warned=true}catch(_){}
    try{if(Array.isArray(host?.enemies)&&host.enemies.length>2000)warned=true}catch(_){}
    if(warned)state.gameplayArrayWarnings++;
    return warned
  }

  function snapshot(){
    const mode=normalizedMode(currentMode());let memoryMb=null;
    try{memoryMb=performance.memory?.usedJSHeapSize?Math.round(performance.memory.usedJSHeapSize/1048576*10)/10:null}catch(_){}
    const data={mode,tier:state.tier,runActive:activeRun(),fps:Math.round(state.lastFps*10)/10,frameMs:Math.round(state.lastFrameMs*100)/100,memoryMb,
      particles:(()=>{try{return particles.length}catch(_){return 0}})(),rings:(()=>{try{return rings.length}catch(_){return 0}})(),floaters:(()=>{try{return floaters.length}catch(_){return 0}})(),
      enemies:(()=>{try{return host?.enemies?.length||0}catch(_){return 0}})(),bullets:(()=>{try{return bullets.length}catch(_){return 0}})(),enemyBullets:(()=>{try{return enemyBullets.length}catch(_){return 0}})()};
    state.lastSnapshot=data;return data
  }

  function hashText(value){let h=2166136261;const s=safe(value);for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return(h>>>0).toString(16).padStart(8,"0")}
  function errorDetails(kind,error,source="",line=0,column=0){
    const message=safe(error?.message||error||"Unknown client error").replace(/\s+/g," ").slice(0,180);
    const src=safe(source).split("?")[0].slice(-120);
    const fingerprint=hashText(`${kind}|${message}|${src}|${Number(line)||0}|${Number(column)||0}`);
    return{error_kind:safe(kind).slice(0,24)||"error",error_message:message||"Unknown client error",error_fingerprint:fingerprint,source:src,line:Math.max(0,Math.floor(Number(line)||0)),column:Math.max(0,Math.floor(Number(column)||0))}
  }
  async function sendError(details){
    const tick=Date.now(),last=state.errorKeys.get(details.error_fingerprint)||0;
    state.errorsObserved++;
    if(state.errorsReported>=MAX_ERRORS_PER_SESSION||(last&&tick-last<ERROR_COOLDOWN_MS)){state.errorsSuppressed++;return false}
    state.errorKeys.set(details.error_fingerprint,tick);
    try{
      const client=await window.ccgSupabase?.getClient?.();if(!client){state.errorsSuppressed++;return false}
      const body={action:"telemetry",event_type:"client_error",player_name:"",play_mode:normalizedMode(currentMode()),device_type:"unknown",session_token:"",build:BUILD,page_url:location.href,metadata:details};
      const {data,error}=await client.functions.invoke(FUNCTION_NAME,{body});
      if(error||data?.success===false){state.errorsSuppressed++;return false}
      state.errorsReported++;return true
    }catch(_){state.errorsSuppressed++;return false}
  }
  function onWindowError(event){
    const details=errorDetails("runtime",event?.error||event?.message,event?.filename,event?.lineno,event?.colno);sendError(details)
  }
  function onUnhandledRejection(event){const reason=event?.reason;sendError(errorDetails("promise",reason instanceof Error?reason:safe(reason)||"Unhandled promise rejection"))}

  function installLongTaskObserver(){
    if(!window.PerformanceObserver)return false;
    try{
      const supported=PerformanceObserver.supportedEntryTypes||[];if(!supported.includes("longtask"))return false;
      const observer=new PerformanceObserver(list=>{for(const entry of list.getEntries()){const duration=Math.max(0,Number(entry.duration)||0);state.longTasks++;state.longTaskMs+=duration;state.maxLongTaskMs=Math.max(state.maxLongTaskMs,duration);state.lastLongTaskAt=Date.now()}});
      observer.observe({entryTypes:["longtask"]});state.longTaskObserver=observer;return true
    }catch(_){return false}
  }

  function sample(){
    const stats=frameStats();state.samples++;state.lastFrameMs=stats.frameMs;state.lastFps=stats.fps;
    const mode=normalizedMode(currentMode());if(mode!==state.mode){state.mode=mode;state.modeTransitions++}
    const runNow=activeRun();if(runNow!==state.lastRunActive){state.lastRunActive=runNow;state.runTransitions++;state.recoveryVotes=0;state.reducedVotes=0;state.severeVotes=0}
    const recentLongTask=state.lastLongTaskAt>0&&Date.now()-state.lastLongTaskAt<2000;
    evaluatePressure(stats.frameMs,recentLongTask);trimDecorativeVisuals(mode,state.tier);gameplayArraySanity();snapshot();
  }

  if(document.body)document.body.dataset.v141R47PerformanceTier=state.tier;
  addEventListener("error",onWindowError);
  addEventListener("unhandledrejection",onUnhandledRejection);
  installLongTaskObserver();state.timer=setInterval(sample,SAMPLE_MS);sample();
  addEventListener("pagehide",()=>{
    if(state.timer)clearInterval(state.timer);state.timer=0;
    try{state.longTaskObserver?.disconnect?.()}catch(_){}state.longTaskObserver=null;
    removeEventListener("error",onWindowError);removeEventListener("unhandledrejection",onUnhandledRejection)
  },{once:true});

  window.CCGLostSizzlerV141R47AllModeOptimisation={
    BUILD,TIERS,MODES,SAMPLE_MS,ERROR_COOLDOWN_MS,MAX_ERRORS_PER_SESSION,
    budgets,chooseTier,evaluatePressure,trimDecorativeVisuals,snapshot,hashText,errorDetails,
    getDiagnostics(){return{...snapshot(),samples:state.samples,trims:state.trims,visualsRemoved:state.visualsRemoved,longTasks:state.longTasks,longTaskMs:Math.round(state.longTaskMs),maxLongTaskMs:Math.round(state.maxLongTaskMs),errorsObserved:state.errorsObserved,errorsReported:state.errorsReported,errorsSuppressed:state.errorsSuppressed,modeTransitions:state.modeTransitions,runTransitions:state.runTransitions,gameplayArrayWarnings:state.gameplayArrayWarnings}},
    get state(){return state}
  };
})();
