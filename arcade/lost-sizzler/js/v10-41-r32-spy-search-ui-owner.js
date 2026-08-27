/* The Lost Sizzler V10.41 r32 — authoritative Spy search UI bridge.
 *
 * The R32 Spy overhaul owns the actual furniture-search lifecycle. This bridge
 * mirrors that authoritative state into the retained independent Spy HUD and
 * normalises the search completion window to the retained 520 ms interaction
 * contract so the gameplay owner and HUD cannot disagree during a handoff.
 * It owns no shared gameplay update, packet callback or non-Spy state.
 */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V141_R32_SPY_SEARCH_UI_OWNER__)return;
  window.__CCG_LOST_SIZZLER_V141_R32_SPY_SEARCH_UI_OWNER__=true;

  const MODE_ID="sizzler-saboteurs",MONITOR_MS=20,SEARCH_MS=520;
  const state={timer:0,installed:false,baseRender:null,lastSearchKey:"",syncs:0,pulsesRecovered:0,timingBridges:0};

  const spyActive=()=>{try{return window.CCGLostSizzlerSpecialModes?.active?.type===MODE_ID||document.body?.dataset?.specialMode===MODE_ID}catch(_){return false}};
  const ui=()=>{try{return window.CCGLostSizzlerV141UiSpyPerformance||null}catch(_){return null}};
  const authoritativeSearch=()=>{
    try{
      const q=window.CCGLostSizzlerV141R32SpyOverhaul?.state?.search;if(!q)return null;
      const startedAt=Number(q.startedAt);let completesAt=Number(q.completesAt);
      if(!Number.isFinite(startedAt)||!Number.isFinite(completesAt)||completesAt<=startedAt)return null;
      const bridgedCompletesAt=startedAt+SEARCH_MS;
      if(Math.abs(completesAt-bridgedCompletesAt)>1){q.completesAt=bridgedCompletesAt;completesAt=bridgedCompletesAt;state.timingBridges++}
      return{targetId:String(q.targetId||"furniture"),targetLabel:String(q.targetLabel||"FURNITURE"),startedAt,completesAt}
    }catch(_){return null}
  };

  function sync(){
    if(!spyActive())return false;
    const api=ui(),q=authoritativeSearch();if(!api||!q)return false;
    const shared=api.state,key=`${q.targetId}|${q.startedAt}`;
    if(key!==state.lastSearchKey){
      state.lastSearchKey=key;
      const alreadyMirrored=Boolean(shared?.searchStartedAt)&&String(shared?.searchTargetId||"")===q.targetId&&Math.abs(Number(shared.searchStartedAt)-q.startedAt)<90;
      if(shared){
        shared.searchTargetId=q.targetId;shared.searchTargetLabel=q.targetLabel;shared.searchStartedAt=q.startedAt;shared.searchCompletedAt=0;shared.lastSearchRenderSignature="";
        if(!alreadyMirrored){shared.searchPulses=Math.max(0,Number(shared.searchPulses)||0)+1;state.pulsesRecovered++}
      }
    }
    const node=document.getElementById("spy-search-indicator");if(!node)return false;
    const now=performance.now(),duration=Math.max(1,q.completesAt-q.startedAt),elapsed=Math.max(0,now-q.startedAt),progress=Math.max(0,Math.min(99,Math.round(elapsed/duration*100)));
    node.dataset.visible="true";node.dataset.state="searching";
    const label=node.querySelector("#spy-search-label"),percent=node.querySelector("#spy-search-percent"),fill=node.querySelector("#spy-search-fill");
    if(label)label.textContent=`SEARCHING ${q.targetLabel}`;if(percent)percent.textContent=`${progress}%`;if(fill)fill.style.width=`${progress}%`;
    state.syncs++;return true
  }

  function install(){
    const api=ui(),current=api?.renderSearchIndicator;if(!api||typeof current!=="function")return false;
    if(current.__ccgV141R32SpySearchUiOwner){state.installed=true;state.baseRender=current.__ccgOriginal||state.baseRender;return true}
    const wrapped=function renderSearchIndicatorV141R32Authoritative(){const result=current.apply(this,arguments);sync();return result};
    wrapped.__ccgV141R32SpySearchUiOwner=true;wrapped.__ccgOriginal=current;api.renderSearchIndicator=wrapped;state.baseRender=current;state.installed=true;return true
  }

  function monitor(){
    install();if(spyActive())sync();else state.lastSearchKey=""
  }

  monitor();state.timer=setInterval(()=>{try{monitor()}catch(error){console.warn("[Lost Sizzler r32] Spy search UI sync failed safely",error)}},MONITOR_MS);
  addEventListener("pagehide",()=>{if(state.timer)clearInterval(state.timer);state.timer=0},{once:true});

  window.CCGLostSizzlerV141R32SpySearchUiOwner={install,sync,authoritativeSearch,get state(){return state}};
})();