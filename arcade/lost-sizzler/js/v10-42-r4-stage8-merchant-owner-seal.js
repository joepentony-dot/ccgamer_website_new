/* The Lost Sizzler V10.42 r4 — preserve Stage 8 merchant dialogue ownership without polling. */
(()=>{
  "use strict";
  if(window.CCGLostSizzlerV142R4Stage8MerchantOwnerSeal)return;

  const state={installed:false,gateActive:false,reAdoptions:0,markerPromotions:0,blockedDescriptors:0,lastReason:""};
  let gate=null;
  let current=null;

  function api(){return window.CCGLostSizzlerStage8NpcDialogue||null}
  function markerOwner(source){
    const seen=new Set();let fn=source;
    while(typeof fn==="function"&&!seen.has(fn)){
      if(fn.__ccgStage8MerchantDialogue)return fn;
      seen.add(fn);fn=fn.__ccgOriginal
    }
    return null
  }
  function hasMarker(source){return Boolean(markerOwner(source))}
  function promoteMarker(source){
    if(typeof source!=="function"||source.__ccgStage8MerchantDialogue)return source;
    const owner=markerOwner(source);if(!owner)return source;
    try{delete owner.__ccgStage8MerchantDialogue}catch(_){try{owner.__ccgStage8MerchantDialogue=false}catch(__){}}
    try{source.__ccgStage8MerchantDialogue=true;state.markerPromotions++}catch(_){}
    return source
  }
  function wrap(source){
    if(typeof source!=="function"||hasMarker(source))return promoteMarker(source);
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
    current=alreadyOwned?promoteMarker(next):wrap(next);
    if(!alreadyOwned)state.reAdoptions++;
    state.installed=Boolean(current?.__ccgStage8MerchantDialogue);
    state.lastReason=String(reason||"adopt")
  }
  function install(reason="install"){
    if(gate){
      if(typeof current==="function"&&!current.__ccgStage8MerchantDialogue)adopt(current,reason);
      state.gateActive=true;
      return state.installed
    }
    const descriptor=Object.getOwnPropertyDescriptor(window,"openShop");
    if(descriptor&&!descriptor.configurable){
      state.blockedDescriptors++;
      try{api()?.installMerchantDialogue?.()}catch(_){}
      state.installed=Boolean(window.openShop?.__ccgStage8MerchantDialogue);
      state.lastReason="non-configurable";
      return state.installed
    }
    if(descriptor&&(descriptor.get||descriptor.set)){
      state.blockedDescriptors++;
      try{api()?.installMerchantDialogue?.()}catch(_){}
      state.installed=Boolean(window.openShop?.__ccgStage8MerchantDialogue);
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
    state.installed=Boolean(current?.__ccgStage8MerchantDialogue);
    return state.installed
  }

  window.CCGLostSizzlerV142R4Stage8MerchantOwnerSeal={state,install,hasMarker,markerOwner,promoteMarker};
  install("module-load");
  addEventListener("ccg:v142-ready",()=>install("v142-ready"),{once:true});
})();
