/* C64 Dungeon Carnage V10.42 R95 — authoritative mobile touch controls.
 * Extracted from the retired V10.4 patch so the current runtime owns mobile input
 * without reloading legacy gameplay/presentation wrappers.
 */
(()=>{
  "use strict";
  if(window.__CCG_DUNGEON_R95_MOBILE_CONTROLS__)return;
  window.__CCG_DUNGEON_R95_MOBILE_CONTROLS__=true;

  const state={installed:false,active:false,actions:0,movements:0,visibilitySyncs:0};
  const activePointers=new Map();
  const HOLD_REPEAT_DELAY_MS=120;
  const movementVectors=Object.freeze({
    KeyW:{x:0,y:-1},KeyA:{x:-1,y:0},KeyS:{x:0,y:1},KeyD:{x:1,y:0}
  });
  const touchCapable=()=>Boolean((navigator.maxTouchPoints||0)>0||window.matchMedia?.("(pointer: coarse)")?.matches);
  const playing=()=>{
    let live=false;
    try{live=typeof mode!=="undefined"&&mode==="playing"&&typeof p1!=="undefined"&&Boolean(p1)}catch(_){live=false}
    if(!live)return false;
    if(document.body?.dataset?.runActive!=="true"){
      try{window.CCGLostSizzlerV142R20LiveRegressionStability?.restoreLivePresentationNow?.("mobile-control")}catch(_){}
      try{if(document.body)document.body.dataset.runActive="true"}catch(_){}
    }
    return document.body?.dataset?.runActive==="true";
  };

  function releaseMovement(recordOrButton){
    const record=recordOrButton?.button?recordOrButton:{button:recordOrButton,key:recordOrButton?.dataset?.key,holdTimer:0};
    if(record.holdTimer)clearTimeout(record.holdTimer);
    const key=record.key||record.button?.dataset?.key;
    try{if(key&&typeof input!=="undefined")input.delete(key)}catch(_){}
    record.button?.classList?.remove("held");
  }

  function beginMovement(button,event,key){
    event?.preventDefault?.();
    try{button?.setPointerCapture?.(event.pointerId)}catch(_){}
    const vector=movementVectors[key];
    const record={button,key,holdTimer:0};
    activePointers.set(event.pointerId,record);
    button?.classList?.add("held");

    /* A quick touch is one deliberate tile step. Do not expose the keyboard-held
     * key until the finger has remained down long enough to mean "keep moving";
     * otherwise catch-up substeps can consume the same 50–60 ms tap twice. */
    if(vector&&typeof p1!=="undefined"&&p1&&typeof movePlayer==="function"){
      try{
        p1.dir={x:vector.x,y:vector.y};
        movePlayer(p1,vector.x,vector.y);
        if(typeof move1!=="undefined"){
          const delay=Math.max(1,Number(C?.player?.moveDelay||138)*(Number(p1.moveMultiplier)||1));
          move1=Math.max(Number(move1)||0,delay);
        }
      }catch(_){}
    }

    record.holdTimer=setTimeout(()=>{
      const live=activePointers.get(event.pointerId);
      if(live!==record||!playing())return;
      try{if(typeof input!=="undefined")input.add(key)}catch(_){}
      record.holdTimer=0;
    },HOLD_REPEAT_DELAY_MS);
    state.movements++;
    return true
  }

  function stopFire(button){
    try{if(typeof input!=="undefined")input.delete("Space")}catch(_){}
    try{if(typeof p1!=="undefined"&&p1&&typeof setAttackHeldInput==="function")setAttackHeldInput(p1,false)}catch(_){}
    button?.classList?.remove("held");
  }

  function fire(button,event){
    if(!playing()||typeof p1==="undefined"||!p1)return false;
    event?.preventDefault?.();
    try{button?.setPointerCapture?.(event.pointerId)}catch(_){}
    const tutorial=document.body?.dataset?.tutorialActive==="true";
    if(tutorial){
      window.CCGLostSizzlerV142R58AuthoritativeFireCore?.attackNow?.();
    }else if(typeof queueAttack==="function"){
      queueAttack(p1);
      try{if(typeof input!=="undefined")input.add("Space")}catch(_){}
      try{if(typeof setAttackHeldInput==="function")setAttackHeldInput(p1,true)}catch(_){}
    }
    button?.classList?.add("held");
    state.actions++;
    return true
  }

  function runAction(button,event){
    const action=String(button?.dataset?.action||"");
    if(!action)return false;
    if(action==="pause"){
      let pausable=false;
      try{pausable=document.body?.dataset?.runActive==="true"&&typeof mode!=="undefined"&&(mode==="playing"||mode==="paused")}catch(_){pausable=false}
      if(!pausable||typeof pause!=="function")return false;
      event?.preventDefault?.();pause();state.actions++;return true
    }
    if(!playing()||typeof p1==="undefined"||!p1)return false;
    event?.preventDefault?.();
    if(action==="fire")return fire(button,event);
    if(action==="dash"&&typeof dashPlayer==="function")dashPlayer(p1,(typeof d1==="function"?d1():null)||p1.dir);
    else if(action==="potion"&&typeof usePotion==="function")usePotion(p1);
    else if(action==="torch"&&typeof useUtility==="function")useUtility(p1);
    else if(action==="banish"&&typeof useBanishment==="function")useBanishment(p1);
    else if(action==="inventory"&&typeof toggleInventory==="function")toggleInventory();
    else if(action==="warp"&&typeof useTeleport==="function")useTeleport(p1);
    else if(action==="door"&&typeof closeNearbyDoor==="function")closeNearbyDoor(p1);
    else if(action==="map"){
      const map=window.CCGLostSizzlerMobileCombatMap;
      if(map?.toggleMap)map.toggleMap(event);
      else if(typeof KeyboardEvent==="function"){
        try{window.dispatchEvent(new KeyboardEvent("keydown",{code:"KeyM",key:"m",bubbles:true}))}catch(_){}
      }
    }
    state.actions++;
    return true
  }

  function updateItemAvailability(root){
    const inventoryCount=kind=>{
      try{return Number(window.CCGProgression?.inventoryKindCount?.((typeof p1!=="undefined"?p1:null),kind)||0)}catch(_){return 0}
    };
    const items={
      potion:["POTION","potion"],
      torch:["TORCH","torch"],
      banish:["BANISH","banishment"]
    };
    for(const [action,[label,kind]] of Object.entries(items)){
      const button=root?.querySelector?.(`[data-action="${action}"]`);
      if(!button)continue;
      const count=typeof p1!=="undefined"&&p1?inventoryCount(kind):0;
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
        <button class="v104-touch-btn" data-action="warp"><span>WARP</span></button>
        <button class="v104-touch-btn" data-action="door"><span>DOOR</span></button>
        <button class="v104-touch-btn" data-action="pause"><span>PAUSE</span></button>
        <button class="v104-touch-btn ccg-mobile-map-btn" data-action="map" aria-label="Toggle dungeon minimap" aria-pressed="false"><span>MAP</span></button>
      </div>`;
    area.appendChild(root);

    /* One delegated touch owner lives on the stable control root. Child buttons may
     * be replaced by presentation/runtime repairs without losing gameplay input. */
    root.addEventListener("pointerdown",event=>{
      const button=event.target?.closest?.(".v104-touch-btn");
      if(!button||!root.contains(button)||!playing())return;
      const key=button.dataset.key;
      if(key){
        beginMovement(button,event,key);
        return
      }
      if(button.dataset.action){
        activePointers.set(event.pointerId,{button,key:"",holdTimer:0});
        runAction(button,event)
      }
    });

    const release=event=>{
      const captured=activePointers.get(event.pointerId);
      const target=event.target?.closest?.(".v104-touch-btn");
      const targetButton=target&&root.contains(target)?target:null;
      const record=captured||(targetButton?{button:targetButton,key:targetButton.dataset.key||"",holdTimer:0}:null);
      activePointers.delete(event.pointerId);
      const button=record?.button;
      if(!button)return;
      if(record.key||button.dataset.key)releaseMovement(record);
      if(button.dataset.action==="fire")stopFire(button)
    };
    for(const type of ["pointerup","pointercancel","lostpointercapture"])root.addEventListener(type,release);
    /* Pointer capture normally keeps release events on the button, but browsers
     * can retarget a touch end when layout changes during the gesture. The
     * window fallback closes that ownership gap without changing hold-to-move. */
    for(const type of ["pointerup","pointercancel"])window.addEventListener(type,release,true);

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