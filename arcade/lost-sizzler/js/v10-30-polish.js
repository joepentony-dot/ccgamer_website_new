/* The Lost Sizzler V10.30 — final balance, pickup density and release polish. */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_POLISH_V130__)return;
  window.__CCG_LOST_SIZZLER_POLISH_V130__=true;

  const POTION_TARGETS=[3,4,4,5,5];
  const state={installed:false,lastPotionCount:0};
  const hash32=value=>{let h=2166136261>>>0;for(const ch of String(value||"")){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0};

  function floorNumber(){return Math.max(1,Math.min(5,Number(typeof run!=="undefined"&&run?.floor||1)))}

  function balanceGroundPotions(){
    if(typeof host==="undefined"||!host?.items)return 0;
    const floor=floorNumber(),target=POTION_TARGETS[floor-1],active=host.items.filter(item=>item?.active&&item.kind==="potion");
    if(active.length>target){
      const keep=new Set([...active].sort((a,b)=>hash32(`${run?.seed}|F${floor}|POTION|${a.id}`)-hash32(`${run?.seed}|F${floor}|POTION|${b.id}`)).slice(0,target).map(item=>item.id));
      host.items=host.items.filter(item=>!(item?.active&&item.kind==="potion")||keep.has(item.id));
      host.revision=(host.revision||0)+1;
    }
    state.lastPotionCount=host.items.filter(item=>item?.active&&item.kind==="potion").length;
    host.v130PotionTarget=target;
    return state.lastPotionCount;
  }

  function setBuildLabel(){
    document.querySelectorAll(".build-badge").forEach(node=>node.textContent="BUILD V10.30");
    const subtitle=document.querySelector(".brand p");if(subtitle)subtitle.textContent="THE LOST SIZZLER — V10.30";
  }

  function keepSubtitleCurrent(){
    const subtitle=document.querySelector(".brand p");if(!subtitle)return;
    const update=()=>{if(subtitle.textContent!=="THE LOST SIZZLER — V10.30")subtitle.textContent="THE LOST SIZZLER — V10.30"};
    update();const observer=new MutationObserver(update);observer.observe(subtitle,{childList:true,characterData:true,subtree:true});window.addEventListener("pagehide",()=>observer.disconnect(),{once:true});
  }

  function install(){
    if(state.installed||typeof startWorld!=="function")return false;
    const original=startWorld;
    startWorld=function startWorldV130Polish(){const result=original.apply(this,arguments);try{balanceGroundPotions()}catch(error){console.warn("[Lost Sizzler V10.30] potion balance failed",error)}return result};
    state.installed=true;setBuildLabel();keepSubtitleCurrent();document.body.dataset.polishReady="true";return true;
  }

  install();
  let attempts=0;const timer=setInterval(()=>{attempts++;if(install()||state.installed||attempts>=40)clearInterval(timer)},100);
  window.addEventListener("pagehide",()=>clearInterval(timer),{once:true});
  window.CCGLostSizzlerPolishV130={state,balanceGroundPotions,constants:{POTION_TARGETS}};
})();
