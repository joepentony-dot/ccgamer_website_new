/* The Lost Sizzler V10.41 — startup cache sanitation and load-safety guard. */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V141_CACHE_GUARD__)return;
  window.__CCG_LOST_SIZZLER_V141_CACHE_GUARD__=true;

  const BUILD=String(document.querySelector('meta[name="ccg-lost-sizzler-build"]')?.content||"unknown").trim();
  const CACHE_TOKEN=String(document.querySelector('meta[name="ccg-lost-sizzler-cache"]')?.content||BUILD||"latest").trim();
  const STORAGE_KEY="ccg-lost-sizzler:last-sanitised-cache";
  const GAME_PREFIXES=["/arcade/lost-sizzler/","/games/ccg-games/cheeky-commodore-quest/"];
  const state={build:BUILD,cacheToken:CACHE_TOKEN,previous:"",needed:false,running:false,done:false,timedOut:false,deletedEntries:0,checkedCaches:0,serviceWorkersChecked:0,runtimeErrors:[],errors:[],startedAt:performance.now(),finishedAt:0};

  let resolveReady;
  const ready=new Promise(resolve=>{resolveReady=resolve});
  let activePromise=null;

  function storageGet(){try{return localStorage.getItem(STORAGE_KEY)||""}catch(_){return""}}
  function storageSet(value){try{localStorage.setItem(STORAGE_KEY,String(value||""))}catch(_){}}
  function gamePath(value){
    try{const url=new URL(String(value||""),location.href);return url.origin===location.origin&&GAME_PREFIXES.some(prefix=>url.pathname.startsWith(prefix))}catch(_){return false}
  }
  function announce(stage,message,detail={}){
    try{window.dispatchEvent(new CustomEvent("ccg-lost-sizzler-cache-status",{detail:{stage,message,build:BUILD,cacheToken:CACHE_TOKEN,...detail}}))}catch(_){}
    const status=document.getElementById("ccg-release-loading-status");if(status&&message)status.textContent=message;
  }
  function errorText(value){return String(value?.stack||value?.message||value||"Unknown startup error").slice(0,1200)}
  function sourceLooksLocal(source=""){return !source||gamePath(source)||/lost-sizzler|v10-|horde-survivor|sizzler-saboteurs/i.test(String(source))}

  function recordRuntimeError(error,source=""){
    if(document.body?.dataset?.releaseReady==="true")return;
    if(!sourceLooksLocal(source))return;
    const text=errorText(error),signature=`${String(source||"")}|${text}`;
    if(state.runtimeErrors.some(row=>row.signature===signature))return;
    state.runtimeErrors.push({signature,source:String(source||""),message:text,at:Date.now()});
    if(state.runtimeErrors.length>12)state.runtimeErrors.splice(0,state.runtimeErrors.length-12);
    announce("runtime-error","A game module reported an error while loading. Startup has been stopped safely.",{error:text});
  }

  window.addEventListener("error",event=>recordRuntimeError(event.error||event.message,event.filename||""),true);
  window.addEventListener("unhandledrejection",event=>recordRuntimeError(event.reason,"promise"),true);

  async function clearCacheStorage(){
    if(!("caches" in window))return 0;
    let deleted=0;
    const names=await caches.keys();state.checkedCaches=names.length;
    for(const name of names){
      let cache;
      try{cache=await caches.open(name)}catch(error){state.errors.push(`cache ${name}: ${errorText(error)}`);continue}
      let requests=[];
      try{requests=await cache.keys()}catch(error){state.errors.push(`cache keys ${name}: ${errorText(error)}`);continue}
      for(const request of requests){
        if(!gamePath(request?.url))continue;
        try{if(await cache.delete(request))deleted++}catch(error){state.errors.push(`cache delete ${name}: ${errorText(error)}`)}
      }
    }
    state.deletedEntries+=deleted;
    return deleted;
  }

  async function refreshServiceWorkers(){
    if(!("serviceWorker" in navigator))return 0;
    let registrations=[];
    try{registrations=await navigator.serviceWorker.getRegistrations()}catch(error){state.errors.push(`service worker list: ${errorText(error)}`);return 0}
    let checked=0;
    for(const registration of registrations){
      const scope=String(registration?.scope||"");
      if(scope&&location.origin&&!scope.startsWith(location.origin))continue;
      checked++;
      try{await registration.update()}catch(error){state.errors.push(`service worker update: ${errorText(error)}`)}
    }
    state.serviceWorkersChecked+=checked;
    return checked;
  }

  async function performClean(force=false){
    if(activePromise)return activePromise;
    state.previous=storageGet();
    state.needed=Boolean(force||state.previous!==CACHE_TOKEN);
    if(!state.needed){state.done=true;state.finishedAt=performance.now();announce("current","Cached game files already match this build.");resolveReady(state);return state}
    state.running=true;
    announce("cleaning","Refreshing cached Lost Sizzler files…");
    activePromise=(async()=>{
      try{
        await clearCacheStorage();
        await refreshServiceWorkers();
        if(!state.errors.length)storageSet(CACHE_TOKEN);
        announce("cleaned",state.errors.length?"Game cache refresh completed with a recoverable warning.":"Cached game files refreshed. Preparing modules…",{deletedEntries:state.deletedEntries});
      }catch(error){state.errors.push(errorText(error));announce("warning","Cache refresh was unavailable. Fresh build URLs will still be used.")}
      finally{
        state.running=false;state.done=true;state.finishedAt=performance.now();resolveReady(state);activePromise=null;
      }
      return state;
    })();
    return activePromise;
  }

  async function cleanNow({reload=false}={}){
    storageSet("");
    state.previous="";state.needed=true;state.done=false;state.errors=[];state.deletedEntries=0;
    await performClean(true);
    if(reload){
      const url=new URL(location.href);url.searchParams.set("ccg-cache",CACHE_TOKEN);url.searchParams.set("ccg-refresh",Date.now());location.replace(url.toString());
    }
    return state;
  }

  const timeout=setTimeout(()=>{
    if(state.done)return;
    state.timedOut=true;state.running=false;state.done=true;state.finishedAt=performance.now();
    state.errors.push("cache sanitation timed out after 3500ms");
    announce("timeout","Cache check timed out safely. Continuing with fresh build URLs…");
    resolveReady(state);
  },3500);
  ready.finally(()=>clearTimeout(timeout));

  performClean(false);
  window.CCGLostSizzlerCacheGuard={state,ready,cleanNow,performClean,gamePath,get runtimeErrors(){return state.runtimeErrors.map(row=>({...row}))}};
})();