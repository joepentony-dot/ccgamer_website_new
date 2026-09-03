/* The Lost Sizzler V10.41 r60 — Horde live-owner composition bridge.
 *
 * R60's real-elapsed Horde owner and the UI/performance throttling owner both
 * legitimately wrap CCGLostSizzlerV138.updateHordeLive. Their independent
 * maintenance cadences can briefly alternate which marked wrapper is outermost.
 * This bridge adds no gameplay wrapper: it waits for the two existing owners to
 * be composed, records that the outer R60 owner preserves the throttled owner in
 * its __ccgOriginal chain, then retires its own bounded installer timer.
 */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V141_R60_HORDE_OWNER_COMPOSITION__)return;
  window.__CCG_LOST_SIZZLER_V141_R60_HORDE_OWNER_COMPOSITION__=true;

  const INSTALL_MS=25,MAX_ATTEMPTS=320;
  const state={timer:0,attempts:0,adoptions:0,stable:false,retired:false,lastError:""};

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

  function retire(){
    if(state.timer){clearInterval(state.timer);state.timer=0}
    state.retired=true;return true
  }

  function compose(){
    state.attempts++;
    try{
      const api=window.CCGLostSizzlerV138,r60=window.CCGLostSizzlerV141R60HordeCombatIntegrity;
      const current=api?.updateHordeLive,owner=r60?.state?.liveOwner;
      if(typeof current!=="function"||typeof owner!=="function")return false;

      /* Ideal steady state: the hardening owner is outermost and retains R60. */
      if(current.__ccgV141UiPerformanceLive===true&&chainContains(current,owner)){
        state.stable=true;retire();return true
      }

      /* R60 may legitimately be outermost after its 60 ms ownership pass. Its
         source still contains the real throttling owner, so advertise the
         preserved capability on the composed function instead of forcing the
         50 ms hardening monitor to wrap it again. */
      if(current===owner&&chainHasMarker(current.__ccgOriginal,"__ccgV141UiPerformanceLive")){
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

  window.CCGLostSizzlerV141R60HordeOwnerComposition={compose,chainContains,chainHasMarker,retire,get state(){return state}};
})();
