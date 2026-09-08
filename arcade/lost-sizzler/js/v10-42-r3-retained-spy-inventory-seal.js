/* The Lost Sizzler V10.42 r3 — retained Spy inventory presentation seal.
 *
 * Public online multiplayer remains retired in V10.42. The retained local Spy
 * engine is still exercised by internal regression fixtures, and its r32 state
 * remains the authoritative owner of whether the Spy inventory is open.
 *
 * This compatibility seal only reconciles DOM presentation while that retained
 * mode is internally active. It does not create a network path, acquire the
 * global update/render loop, or affect Solo, Tutorial or local Split Screen.
 */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V142_R3_RETAINED_SPY_INVENTORY_SEAL__)return;
  window.__CCG_LOST_SIZZLER_V142_R3_RETAINED_SPY_INVENTORY_SEAL__=true;

  const MODE_ID="sizzler-saboteurs";
  const TICK_MS=40;
  const state={timer:0,observer:null,observedRoot:null,observerQueued:false,repairs:0,lastOpen:false,displayOverrides:0,mutationRepairs:0};

  function retainedSpyActive(){
    try{return window.CCGLostSizzlerSpecialModes?.active?.type===MODE_ID}catch(_){return false}
  }

  function clearPresentation(root,body){
    let changed=false;
    if(root?.style?.getPropertyValue("display")){root.style.removeProperty("display");changed=true}
    if(body?.dataset?.spyR32Inventory!=="false"){body.dataset.spyR32Inventory="false";changed=true}
    return changed
  }

  function queueMutationReconcile(){
    if(state.observerQueued)return;
    state.observerQueued=true;
    queueMicrotask(()=>{
      state.observerQueued=false;
      try{if(reconcile())state.mutationRepairs+=1}catch(error){console.warn("[Lost Sizzler V10.42 r3] retained Spy mutation reconciliation failed safely",error)}
    })
  }

  function ensureObserver(root,body){
    if(!body)return false;
    if(state.observer&&state.observedRoot===root)return true;
    try{state.observer?.disconnect?.()}catch(_){}
    state.observer=new MutationObserver(queueMutationReconcile);
    state.observer.observe(body,{attributes:true,attributeFilter:["data-special-mode","data-spy-r32-inventory"]});
    if(root){
      state.observer.observe(root,{attributes:true,attributeFilter:["style","class","hidden","aria-hidden"]});
      state.observedRoot=root;
    }else state.observedRoot=null;
    return true
  }

  function reconcile(){
    const api=window.CCGLostSizzlerV141R32SpyOverhaul;
    const body=document.body,root=document.getElementById("spy-r32-inventory");
    ensureObserver(root,body);
    if(!api?.state||!body||!root)return false;
    if(!retainedSpyActive()){
      const changed=clearPresentation(root,body);
      state.lastOpen=false;
      if(changed)state.repairs+=1;
      return changed
    }
    const open=Boolean(api.state.inventoryOpen);
    let changed=false;
    if(open){
      if(body.dataset.specialMode!==MODE_ID){body.dataset.specialMode=MODE_ID;changed=true}
      if(body.dataset.spyR32Inventory!=="true"){body.dataset.spyR32Inventory="true";changed=true}
      if(root.hidden){root.hidden=false;changed=true}
      if(root.classList.contains("hidden")){root.classList.remove("hidden");changed=true}
      if(root.getAttribute("aria-hidden")==="true"){root.setAttribute("aria-hidden","false");changed=true}
      if(root.style.getPropertyValue("display")!=="grid"||root.style.getPropertyPriority("display")!=="important"){
        root.style.setProperty("display","grid","important");
        state.displayOverrides+=1;
        changed=true
      }
    }else{
      changed=clearPresentation(root,body)||changed;
    }
    if(changed)state.repairs+=1;
    state.lastOpen=open;
    return changed
  }

  ensureObserver(document.getElementById("spy-r32-inventory"),document.body);
  state.timer=setInterval(()=>{try{reconcile()}catch(error){console.warn("[Lost Sizzler V10.42 r3] retained Spy inventory reconciliation failed safely",error)}},TICK_MS);
  addEventListener("pagehide",()=>{if(state.timer)clearInterval(state.timer);state.timer=0;try{state.observer?.disconnect?.()}catch(_){};state.observer=null;state.observedRoot=null},{once:true});

  window.CCGLostSizzlerV142R3RetainedSpyInventorySeal=Object.freeze({
    reconcile,
    diagnostics:()=>Object.freeze({repairs:state.repairs,lastOpen:state.lastOpen,displayOverrides:state.displayOverrides,mutationRepairs:state.mutationRepairs,timerActive:Boolean(state.timer),observerActive:Boolean(state.observer)})
  });
})();
