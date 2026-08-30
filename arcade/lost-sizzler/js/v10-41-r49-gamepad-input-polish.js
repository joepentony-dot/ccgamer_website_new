/* The Lost Sizzler V10.41 r49 — gamepad and controller input polish.
 *
 * This layer does not own movement, combat, menus or multiplayer authority.
 * It translates standard Gamepad API state into the game's existing keyboard
 * controls so every mode continues to use the established input/action paths.
 */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V141_R49_GAMEPAD_INPUT_POLISH__)return;
  window.__CCG_LOST_SIZZLER_V141_R49_GAMEPAD_INPUT_POLISH__=true;

  const DEADZONE=.28,NAV_REPEAT_MS=210;
  const state={raf:0,connected:0,lastNavAt:0,held:[new Set(),new Set()],buttonLatch:[new Map(),new Map()],statusNode:null,frames:0,syntheticDown:0,syntheticUp:0,menuMoves:0,menuClicks:0};
  const gameplay=()=>document.body?.dataset?.runActive==="true"&&String(window.mode||"")==="playing";
  const split=()=>{try{return Boolean(window.p2)&&String(window.playMode||"")==="split"}catch(_){return false}};
  const editable=()=>{const el=document.activeElement;return Boolean(el?.matches?.("input,textarea,select,[contenteditable='true'],[contenteditable='']"))};

  function emit(code,down){
    if(!code)return;
    const ev=new KeyboardEvent(down?"keydown":"keyup",{code,key:code,bubbles:true,cancelable:true,repeat:false});
    window.dispatchEvent(ev);if(down)state.syntheticDown++;else state.syntheticUp++
  }
  function setHeld(slot,code,on){
    const held=state.held[slot];if(!held)return;
    if(on&&!held.has(code)){held.add(code);emit(code,true)}
    else if(!on&&held.has(code)){held.delete(code);emit(code,false)}
  }
  function releaseSlot(slot){for(const code of [...state.held[slot]])setHeld(slot,code,false);state.buttonLatch[slot].clear()}
  function releaseAll(){releaseSlot(0);releaseSlot(1)}
  function axis(v){const n=Number(v)||0;return Math.abs(n)>=DEADZONE?n:0}
  function pressed(button){return Boolean(button&&(button.pressed||Number(button.value)>.55))}
  function edge(slot,index,on){const map=state.buttonLatch[slot],before=Boolean(map.get(index));map.set(index,on);return on&&!before}

  function ensureStatus(){
    if(state.statusNode?.isConnected)return state.statusNode;
    const anchor=document.getElementById("net-status")||document.querySelector(".status");if(!anchor?.parentElement)return null;
    let node=document.getElementById("gamepad-status");if(!node){node=document.createElement("span");node.id="gamepad-status";node.className="status";node.hidden=true;node.title="Gamepad input status";node.style.cssText="border-color:#72ff9b;color:#72ff9b;white-space:nowrap";anchor.insertAdjacentElement("afterend",node)}
    state.statusNode=node;return node
  }
  function renderStatus(count){const node=ensureStatus();if(!node)return;node.hidden=count<1;node.textContent=count>1?`GAMEPADS · ${count}`:"GAMEPAD · READY"}

  function focusables(){return [...document.querySelectorAll("button:not([disabled]),a[href],input:not([disabled]),select:not([disabled])")].filter(el=>{const r=el.getBoundingClientRect();const s=getComputedStyle(el);return r.width>0&&r.height>0&&s.display!=="none"&&s.visibility!=="hidden"&&!el.closest(".hidden")})}
  function moveFocus(direction){
    const list=focusables();if(!list.length)return false;const current=document.activeElement,idx=list.indexOf(current);const next=idx<0?(direction>0?0:list.length-1):(idx+direction+list.length)%list.length;list[next]?.focus?.({preventScroll:true});state.menuMoves++;return true
  }
  function clickFocused(){const el=document.activeElement;if(el&&typeof el.click==="function"&&focusables().includes(el)){el.click();state.menuClicks++;return true}const first=focusables()[0];if(first){first.focus?.({preventScroll:true});first.click?.();state.menuClicks++;return true}return false}

  const P1_MOVE={up:"KeyW",down:"KeyS",left:"KeyA",right:"KeyD"};
  const P2_MOVE={up:"ArrowUp",down:"ArrowDown",left:"ArrowLeft",right:"ArrowRight"};
  function processGameplayPad(slot,pad){
    const map=slot===1?P2_MOVE:P1_MOVE,x=axis(pad.axes?.[0]),y=axis(pad.axes?.[1]),b=pad.buttons||[];
    const up=y<0||pressed(b[12]),down=y>0||pressed(b[13]),left=x<0||pressed(b[14]),right=x>0||pressed(b[15]);
    setHeld(slot,map.up,up);setHeld(slot,map.down,down);setHeld(slot,map.left,left);setHeld(slot,map.right,right);
    if(slot===0){
      setHeld(slot,"Space",pressed(b[0]));
      if(edge(slot,5,pressed(b[5])))emit("ShiftLeft",true),emit("ShiftLeft",false);
      if(edge(slot,2,pressed(b[2])))emit("KeyE",true),emit("KeyE",false);
      if(edge(slot,1,pressed(b[1])))emit("KeyQ",true),emit("KeyQ",false);
      if(edge(slot,3,pressed(b[3])))emit("KeyR",true),emit("KeyR",false);
      if(edge(slot,4,pressed(b[4])))emit("KeyC",true),emit("KeyC",false);
      if(edge(slot,6,pressed(b[6])))emit("KeyB",true),emit("KeyB",false);
    }else{
      setHeld(slot,"Enter",pressed(b[0]));
      if(edge(slot,5,pressed(b[5])))emit("ControlRight",true),emit("ControlRight",false);
      if(edge(slot,2,pressed(b[2])))emit("KeyO",true),emit("KeyO",false);
    }
    if(edge(slot,8,pressed(b[8])))emit("Tab",true),emit("Tab",false);
    if(edge(slot,9,pressed(b[9])))emit("KeyP",true),emit("KeyP",false)
  }

  function processMenuPad(slot,pad,now=performance.now()){
    releaseSlot(slot);const b=pad.buttons||[],y=axis(pad.axes?.[1]);
    const navUp=y<-.55||pressed(b[12]),navDown=y>.55||pressed(b[13]);
    if((navUp||navDown)&&now-state.lastNavAt>=NAV_REPEAT_MS){state.lastNavAt=now;moveFocus(navDown?1:-1)}
    if(edge(slot,0,pressed(b[0])))clickFocused();
    if(edge(slot,1,pressed(b[1])))emit("Escape",true),emit("Escape",false);
    if(edge(slot,9,pressed(b[9])))emit("KeyP",true),emit("KeyP",false)
  }

  function processSnapshot(index,pad,now=performance.now()){
    if(index>1)return false;
    if(!pad||pad.connected===false){releaseSlot(index);return false}
    if(editable()){releaseSlot(index);return false}
    if(gameplay()){
      if(index===1&&!split()){releaseSlot(index);return false}
      processGameplayPad(index,pad);return true
    }
    processMenuPad(index,pad,now);return true
  }
  function tick(now){
    state.frames++;const pads=Array.from(navigator.getGamepads?.()||[]).filter(Boolean),usable=pads.filter(p=>p.connected!==false).slice(0,2);state.connected=usable.length;renderStatus(state.connected);
    processSnapshot(0,usable[0]||null,now);processSnapshot(1,usable[1]||null,now);if(!usable[1])releaseSlot(1);
    state.raf=requestAnimationFrame(tick)
  }

  addEventListener("gamepadconnected",()=>{renderStatus(Array.from(navigator.getGamepads?.()||[]).filter(Boolean).length)});
  addEventListener("gamepaddisconnected",()=>{releaseAll();renderStatus(Array.from(navigator.getGamepads?.()||[]).filter(Boolean).length)});
  addEventListener("blur",releaseAll);document.addEventListener("visibilitychange",()=>{if(document.hidden)releaseAll()});
  addEventListener("pagehide",()=>{releaseAll();if(state.raf)cancelAnimationFrame(state.raf);state.raf=0},{once:true});
  document.body.dataset.v141R49Gamepad="true";ensureStatus();state.raf=requestAnimationFrame(tick);
  window.CCGLostSizzlerV141R49GamepadInput={DEADZONE,processSnapshot,releaseAll,moveFocus,clickFocused,get state(){return state}};
})();
