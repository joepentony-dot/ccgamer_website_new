/* The Lost Sizzler V10.41 r60 — Horde live-owner composition bridge.
 *
 * R60's real-elapsed Horde owner and the UI/performance throttling owner both
 * legitimately wrap CCGLostSizzlerV138.updateHordeLive. Their independent
 * maintenance cadences can briefly alternate which marked wrapper is outermost.
 * This bridge adds no gameplay wrapper: it waits for the two existing owners to
 * be composed, records that the outer R60 owner preserves the throttled owner in
 * its __ccgOriginal chain, then retires its own bounded installer timer.
 *
 * LS-SOLO-002 also uses this bridge to make the production R60 maintenance
 * delegate ancestry-aware. The original R60 40 ms installer is retired by the
 * Horde performance layer; that layer calls the exported install() method. A
 * cooperative owner may legitimately sit above R60 after a pause boundary, so
 * re-running an outermost-marker-only installer would otherwise add another R60
 * movement/update wrapper every few transitions. The protected delegate keeps
 * the existing R60 owner when it is already present anywhere in the ancestry,
 * but only while a real Solo Dungeon run is active. Every special mode and all
 * non-Solo lifecycle states fall straight through to the original R60 installer.
 *
 * Once the final R56 + R60 damage stack exists, this bridge also seals that
 * complete ancestry behind the hurtPlayer property during ordinary Solo play.
 * Retired compatibility polls can therefore no longer expose a transient R56-
 * only owner between maintenance passes. Spy isolation is still allowed to own
 * hurtPlayer temporarily, and later normal-mode wrappers are accepted whenever
 * their ancestry preserves both modern damage owners.
 */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V141_R60_HORDE_OWNER_COMPOSITION__)return;
  window.__CCG_LOST_SIZZLER_V141_R60_HORDE_OWNER_COMPOSITION__=true;

  const INSTALL_MS=25,MAX_ATTEMPTS=320,SPY_MODE="sizzler-saboteurs";
  const state={
    timer:0,attempts:0,adoptions:0,stable:false,retired:false,
    soloInstallProtected:false,soloInstallSkips:0,soloMoveReuse:0,soloUpdateReuse:0,
    soloHurtGate:false,soloHurtGateUnsupported:false,soloHurtGateLosses:0,soloHurtBlockedWrites:0,soloHurtAcceptedWrites:0,soloHurtFallbackReads:0,
    lastBlockedHurtName:"",lastError:""
  };
  let gatedHurt=null,sealedSoloHurt=null,hurtGateGetter=null,hurtGateSetter=null;

  function chainContains(fn,target){
    if(typeof fn!=="function"||typeof target!=="function")return false;
    const seen=new Set();let current=fn,depth=0;
    while(typeof current==="function"&&!seen.has(current)&&depth++<32){
      if(current===target)return true;
      seen.add(current);current=typeof current.__ccgOriginal==="function"?current.__ccgOriginal:null
    }
    return false
  }

  function chainHasMarker(fn,marker){
    if(typeof fn!=="function")return false;
    const seen=new Set();let current=fn,depth=0;
    while(typeof current==="function"&&!seen.has(current)&&depth++<32){
      if(current[marker]===true)return true;
      seen.add(current);current=typeof current.__ccgOriginal==="function"?current.__ccgOriginal:null
    }
    return false
  }

  function specialType(){
    try{return String(window.CCGLostSizzlerSpecialModes?.active?.type||document.body?.dataset?.specialMode||"")}catch(_){return""}
  }

  function soloDungeon(){
    try{return document.body?.dataset?.runActive==="true"&&typeof playMode!=="undefined"&&String(playMode||"")==="solo"&&!specialType()}catch(_){return false}
  }

  function spyDamageOwned(){
    try{return specialType()===SPY_MODE||Boolean(window.CCGLostSizzlerV141R29SpyEngine?.state?.isolated)}catch(_){return false}
  }

  function completeSoloDamageOwner(fn){
    return typeof fn==="function"&&chainHasMarker(fn,"__ccgV141R56EnvironmentDamage")&&chainHasMarker(fn,"__ccgV141R60EnvironmentSeal")
  }

  function soloHurtGateActive(){
    if(!state.soloHurtGate||typeof hurtGateGetter!=="function"||typeof hurtGateSetter!=="function")return false;
    let descriptor=null;
    try{descriptor=Object.getOwnPropertyDescriptor(window,"hurtPlayer")}catch(_){descriptor=null}
    const live=Boolean(descriptor&&descriptor.get===hurtGateGetter&&descriptor.set===hurtGateSetter);
    if(!live){state.soloHurtGate=false;state.soloHurtGateLosses++}
    return live
  }

  function installSoloHurtGate(){
    if(soloHurtGateActive())return true;
    if(state.soloHurtGateUnsupported)return false;
    const current=window.hurtPlayer;
    if(!completeSoloDamageOwner(current))return false;
    let descriptor=null;
    try{descriptor=Object.getOwnPropertyDescriptor(window,"hurtPlayer")}catch(_){descriptor=null}
    if(descriptor&&descriptor.configurable===false){state.soloHurtGateUnsupported=true;return false}
    gatedHurt=current;sealedSoloHurt=current;
    hurtGateGetter=function getHurtPlayerV141R60SoloDamageSeal(){
      if(soloDungeon()&&!spyDamageOwned()&&completeSoloDamageOwner(sealedSoloHurt)){
        if(!completeSoloDamageOwner(gatedHurt))state.soloHurtFallbackReads++;
        return sealedSoloHurt
      }
      return gatedHurt
    };
    hurtGateSetter=function setHurtPlayerV141R60SoloDamageSeal(value){
      if(!soloDungeon()||spyDamageOwned()){
        gatedHurt=value;
        if(completeSoloDamageOwner(value))sealedSoloHurt=value;
        return
      }
      if(completeSoloDamageOwner(value)){
        gatedHurt=value;sealedSoloHurt=value;state.soloHurtAcceptedWrites++;return
      }
      state.soloHurtBlockedWrites++;
      state.lastBlockedHurtName=typeof value==="function"?String(value.name||"anonymous"):String(typeof value)
    };
    try{
      Object.defineProperty(window,"hurtPlayer",{
        configurable:true,
        enumerable:descriptor?.enumerable!==false,
        get:hurtGateGetter,
        set:hurtGateSetter
      });
      state.soloHurtGate=true;return true
    }catch(error){
      state.soloHurtGateUnsupported=true;state.lastError=String(error?.message||error||"unknown").slice(0,260);
      hurtGateGetter=hurtGateSetter=null;return false
    }
  }

  function protectSoloInstall(){
    const live=window.CCGLostSizzlerV141R60LivePlayIntegrity;
    if(!live||typeof live.install!=="function")return false;
    if(live.install.__ccgV141R60ChainAwareMaintenance===true){
      state.soloInstallProtected=true;installSoloHurtGate();return true
    }
    const source=live.install;
    const protectedInstall=function installV141R60ChainAwareMaintenance(){
      if(!soloDungeon()){
        const result=source.apply(this,arguments);installSoloHurtGate();return result
      }
      const moveCurrent=window.movePlayer,updateCurrent=window.update;
      const moveOwned=chainHasMarker(moveCurrent,"__ccgV141R60CadenceSeal");
      const updateOwned=chainHasMarker(updateCurrent,"__ccgV141R60TimeSmoothing");
      if(!moveOwned&&!updateOwned){
        const result=source.apply(this,arguments);installSoloHurtGate();return result
      }
      state.soloInstallSkips++;
      try{
        live.patchAzalea?.();
        live.wrapStartWorld?.();
        if(moveOwned){state.soloMoveReuse++;if(live.state)live.state.moveWrapped=true}else live.wrapMovement?.();
        live.wrapEnvironmentalDamage?.();
        installSoloHurtGate();
        if(updateOwned){state.soloUpdateReuse++;if(live.state)live.state.updateWrapped=true}else live.wrapUpdate?.();
        live.ensureCcgEnemy?.();
        if(live.state){
          live.state.installed=Boolean(live.state.moveWrapped&&live.state.startWrapped&&live.state.hurtWrapped);
          if(live.state.installed)try{document.body.dataset.v141R60LivePlayIntegrity="true"}catch(_){}
          return live.state.installed
        }
        return true
      }catch(error){state.lastError=String(error?.message||error||"unknown").slice(0,260);return false}
    };
    protectedInstall.__ccgV141R60ChainAwareMaintenance=true;
    protectedInstall.__ccgOriginal=source;
    live.install=protectedInstall;state.soloInstallProtected=true;installSoloHurtGate();return true
  }

  function retire(){
    if(state.timer){clearInterval(state.timer);state.timer=0}
    state.retired=true;return true
  }

  function compose(){
    state.attempts++;protectSoloInstall();installSoloHurtGate();
    try{
      const api=window.CCGLostSizzlerV138,r60=window.CCGLostSizzlerV141R60HordeCombatIntegrity;
      const current=api?.updateHordeLive,owner=r60?.state?.liveOwner;
      if(typeof current!=="function"||typeof owner!=="function")return false;

      /* Ideal steady state: the hardening owner is outermost and retains R60. */
      if(current.__ccgV141UiPerformanceLive===true&&chainContains(current,owner)){
        if(!installSoloHurtGate())return false;
        state.stable=true;retire();return true
      }

      /* R60 may legitimately be outermost after its 60 ms ownership pass. Its
         source still contains the real throttling owner, so advertise the
         preserved capability on the composed function instead of forcing the
         50 ms hardening monitor to wrap it again. */
      if(current===owner&&chainHasMarker(current.__ccgOriginal,"__ccgV141UiPerformanceLive")){
        if(!installSoloHurtGate())return false;
        current.__ccgV141UiPerformanceLive=true;
        state.adoptions++;state.stable=true;retire();return true
      }
      return false
    }catch(error){state.lastError=String(error?.message||error||"unknown").slice(0,260);return false}
  }

  function tick(){
    if(compose())return;
    if(state.attempts>=MAX_ATTEMPTS)retire()
  }

  tick();
  if(!state.retired)state.timer=setInterval(tick,INSTALL_MS);
  addEventListener("pagehide",retire,{once:true});

  window.CCGLostSizzlerV141R60HordeOwnerComposition={
    compose,chainContains,chainHasMarker,soloDungeon,spyDamageOwned,completeSoloDamageOwner,soloHurtGateActive,installSoloHurtGate,protectSoloInstall,retire,
    get state(){return state}
  };
})();
