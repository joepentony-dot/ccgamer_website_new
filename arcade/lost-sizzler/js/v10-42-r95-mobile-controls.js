/* C64 Dungeon Carnage V10.42 R95 — authoritative mobile touch controls.
 * Extracted from the retired V10.4 patch so the current runtime owns mobile input
 * without reloading legacy gameplay/presentation wrappers.
 */
(()=>{
  "use strict";
  if(window.__CCG_DUNGEON_R95_MOBILE_CONTROLS__)return;
  window.__CCG_DUNGEON_R95_MOBILE_CONTROLS__=true;

  const state={installed:false,active:false,actions:0,movements:0,visibilitySyncs:0};
  const touchCapable=()=>Boolean((navigator.maxTouchPoints||0)>0||window.matchMedia?.("(pointer: coarse)")?.matches);
  const playing=()=>document.body?.dataset?.runActive==="true"&&String(globalThis.mode||"")==="playing";

  function releaseMovement(button){
    const key=button?.dataset?.key;
    if(key&&globalThis.input?.delete)globalThis.input.delete(key);
    button?.classList?.remove("held");
  }

  function stopFire(button){
    globalThis.input?.delete?.("Space");
    try{if(globalThis.p1&&typeof globalThis.setAttackHeldInput==="function")globalThis.setAttackHeldInput(globalThis.p1,false)}catch(_){}
    button?.classList?.remove("held");
  }

  function fire(button,event){
    if(!playing()||!globalThis.p1)return false;
    event?.preventDefault?.();
    try{button?.setPointerCapture?.(event.pointerId)}catch(_){}
    const tutorial=document.body?.dataset?.tutorialActive==="true";
    if(tutorial){
      window.CCGLostSizzlerV142R58AuthoritativeFireCore?.attackNow?.();
    }else if(typeof globalThis.queueAttack==="function"){
      globalThis.queueAttack(globalThis.p1);
      globalThis.input?.add?.("Space");
      try{globalThis.setAttackHeldInput?.(globalThis.p1,true)}catch(_){}
    }
    button?.classList?.add("held");
    state.actions++;
    return true
  }

  function runAction(button,event){
    if(!playing()||!globalThis.p1)return false;
    const action=String(button?.dataset?.action||"");
    if(!action)return false;
    event?.preventDefault?.();
    if(action==="fire")return fire(button,event);
    if(action==="dash"&&typeof globalThis.dashPlayer==="function")globalThis.dashPlayer(globalThis.p1,globalThis.d1?.()||globalThis.p1.dir);
    else if(action==="potion")globalThis.usePotion?.(globalThis.p1);
    else if(action==="torch")globalThis.useUtility?.(globalThis.p1);
    else if(action==="banish")globalThis.useBanishment?.(globalThis.p1);
    else if(action==="inventory")globalThis.toggleInventory?.();
    state.actions++;
    return true
  }

  function updateItemAvailability(root){
    const inventoryCount=kind=>{
      try{return Number(window.CCGProgression?.inventoryKindCount?.(globalThis.p1,kind)||0)}catch(_){return 0}
    };
    const items={
      potion:["POTION","potion"],
      torch:["TORCH","torch"],
      banish:["BANISH","banishment"]
    };
    for(const [action,[label,kind]] of Object.entries(items)){
      const button=root?.querySelector?.(`[data-action="${action}"]`);
      if(!button)continue;
      const count=globalThis.p1?inventoryCount(kind):0;
      button.classList.toggle("touch-item-unavailable",count===0);
      const small=button.querySelector("small");
      if(small)small.textContent=count>0?`${count} HELD`:"NONE";
      button.setAttribute("aria-label",`${label}: ${count>0?`${count} held`:"none held"}`);
    }
  }

  function sync(){
    const root=document.getElementById("v104-touch-controls");
    if(!root)return false;
    const active=touchCapable()&&document.body?.dataset?.runActive==="true"&&document.getElementById("menu")?.classList.contains("hidden")===true;
    root.classList.toggle("active",active);
    root.setAttribute("aria-hidden",active?"false":"true");
    state.active=active;
    state.visibilitySyncs++;
    if(active)updateItemAvailability(root);
    return active
  }

  function install(){
    if(!touchCapable())return false;
    document.body?.classList?.add("v104-touch-device");
    const area=document.querySelector(".game-area");
    if(!area)return false;
    let root=document.getElementById("v104-touch-controls");
    if(root){state.installed=true;sync();return true}

    root=document.createElement("div");
    root.id="v104-touch-controls";
    root.className="v104-touch-controls";
    root.setAttribute("aria-label","Touch game controls");
    root.setAttribute("aria-hidden","true");
    root.innerHTML=`
      <div class="v104-touch-pad" aria-label="Movement pad">
        <button class="v104-touch-btn" data-dir="up" data-key="KeyW" aria-label="Move up">▲</button>
        <button class="v104-touch-btn" data-dir="left" data-key="KeyA" aria-label="Move left">◀</button>
        <button class="v104-touch-btn" data-dir="right" data-key="KeyD" aria-label="Move right">▶</button>
        <button class="v104-touch-btn" data-dir="down" data-key="KeyS" aria-label="Move down">▼</button>
      </div>
      <div class="v104-touch-actions" aria-label="Action controls">
        <button class="v104-touch-btn" data-action="dash"><span>DASH</span></button>
        <button class="v104-touch-btn" data-action="potion"><span>POTION</span><small>NONE</small></button>
        <button class="v104-touch-btn" data-action="torch"><span>TORCH</span><small>NONE</small></button>
        <button class="v104-touch-btn v104-touch-fire" data-action="fire"><span>FIRE</span></button>
        <button class="v104-touch-btn v104-touch-banish" data-action="banish"><span>BANISH</span><small>NONE</small></button>
        <button class="v104-touch-btn" data-action="inventory"><span>ITEMS</span></button>
      </div>`;
    area.appendChild(root);

    root.querySelectorAll("[data-key]").forEach(button=>{
      button.addEventListener("pointerdown",event=>{
        if(!playing())return;
        event.preventDefault();
        try{button.setPointerCapture?.(event.pointerId)}catch(_){}
        globalThis.input?.add?.(button.dataset.key);
        button.classList.add("held");
        state.movements++;
      });
      for(const type of ["pointerup","pointercancel","lostpointercapture"])button.addEventListener(type,()=>releaseMovement(button));
    });

    root.querySelectorAll("[data-action]").forEach(button=>{
      const action=button.dataset.action;
      button.addEventListener("pointerdown",event=>runAction(button,event));
      for(const type of ["pointerup","pointercancel","lostpointercapture"])button.addEventListener(type,()=>{if(action==="fire")stopFire(button)});
    });

    const observer=new MutationObserver(sync);
    observer.observe(document.body,{attributes:true,attributeFilter:["data-run-active","data-tutorial-active"]});
    const menu=document.getElementById("menu");
    if(menu)observer.observe(menu,{attributes:true,attributeFilter:["class"]});
    window.addEventListener("pagehide",()=>observer.disconnect(),{once:true});

    state.installed=true;
    sync();
    return true
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",install,{once:true});
  else install();

  window.addEventListener("ccg:dungeon-inventory-changed",()=>sync());
  window.CCGLostSizzlerV142R95MobileControls=Object.freeze({state,install,sync,touchCapable});
})();