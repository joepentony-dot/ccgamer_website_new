/* The Lost Sizzler V10.42 r4 — preserve Stage 8 merchant dialogue ownership without polling. */
(()=>{
  "use strict";
  if(window.CCGLostSizzlerV142R4Stage8MerchantOwnerSeal)return;

  const state={installed:false,gateActive:false,reAdoptions:0,blockedDescriptors:0,lastReason:""};
  let gate=null;
  let current=null;

  function api(){return window.CCGLostSizzlerStage8NpcDialogue||null}
  function hasMarker(source){
    const dialogue=api();
    if(typeof dialogue?.ancestryHasMarker==="function")return dialogue.ancestryHasMarker(source,"__ccgStage8MerchantDialogue");
    const seen=new Set();let fn=source;
    while(typeof fn==="function"&&!seen.has(fn)){
      if(fn.__ccgStage8MerchantDialogue)return true;
      seen.add(fn);fn=fn.__ccgOriginal
    }
    return false
  }
  function wrap(source){
    if(typeof source!=="function"||hasMarker(source))return source;
    const wrapped=function v142Stage8MerchantDialogueOwner(shop,player){
      const dialogue=api();
      try{
        if(dialogue?.soloDungeon?.()&&shop?.active&&(player||typeof p1!=="undefined"&&p1))dialogue.presentMerchant?.(shop)
      }catch(_){}
      return source.apply(this,arguments)
    };
    wrapped.__ccgStage8MerchantDialogue=true;
    wrapped.__ccgV142R4MerchantOwnerSeal=true;
    wrapped.__ccgOriginal=source;
    return wrapped
  }
  function adopt(next,reason){
    if(typeof next!=="function"){
      current=next;
      state.installed=false;
      state.lastReason=String(reason||"non-function");
      return
    }
    const alreadyOwned=hasMarker(next);
    current=alreadyOwned?next:wrap(next);
    if(!alreadyOwned)state.reAdoptions++;
    state.installed=hasMarker(current);
    state.lastReason=String(reason||"adopt")
  }
  function install(reason="install"){
    if(gate){
      if(typeof current==="function"&&!hasMarker(current))adopt(current,reason);
      state.gateActive=true;
      return state.installed
    }
    const descriptor=Object.getOwnPropertyDescriptor(window,"openShop");
    if(descriptor&&!descriptor.configurable){
      state.blockedDescriptors++;
      try{api()?.installMerchantDialogue?.()}catch(_){}
      state.installed=hasMarker(window.openShop);
      state.lastReason="non-configurable";
      return state.installed
    }
    if(descriptor&&(descriptor.get||descriptor.set)){
      state.blockedDescriptors++;
      try{api()?.installMerchantDialogue?.()}catch(_){}
      state.installed=hasMarker(window.openShop);
      state.lastReason="existing-accessor";
      return state.installed
    }
    adopt(window.openShop,reason);
    try{
      Object.defineProperty(window,"openShop",{
        configurable:true,
        enumerable:descriptor?.enumerable??true,
        get(){return current},
        set(next){adopt(next,"assignment")}
      });
    }catch(_){
      state.blockedDescriptors++;
      return false
    }
    gate={descriptor};
    state.gateActive=true;
    state.installed=hasMarker(current);
    return state.installed
  }

  window.CCGLostSizzlerV142R4Stage8MerchantOwnerSeal={state,install,hasMarker};
  install("module-load");
  addEventListener("ccg:v142-ready",()=>install("v142-ready"),{once:true});
})();
