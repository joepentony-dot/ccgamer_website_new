/* The Lost Sizzler V10.30 — final balance, pickup density and release polish. */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_POLISH_V130__)return;
  window.__CCG_LOST_SIZZLER_POLISH_V130__=true;

  const RELEASE_VERSION="V10.41";
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

  /*
   * Release branding is intentionally one-shot here. V10.30 previously kept a
   * MutationObserver alive that forced the subtitle back to V10.35. Newer
   * release UI correctly displays V10.41, so the two observers could trigger
   * each other forever and eventually crash the browser. The current release
   * label is now written once; version-check.js remains the canonical owner.
   */
  function setBuildLabel(){
    document.querySelectorAll(".build-badge").forEach(node=>{
      if(!/UPDATE AVAILABLE/i.test(node.textContent||""))node.textContent=`BUILD ${RELEASE_VERSION}`;
    });
    const subtitle=document.querySelector(".brand p");
    if(subtitle)subtitle.textContent=`THE LOST SIZZLER — ${RELEASE_VERSION}`;
  }

  function install(){
    if(state.installed||typeof startWorld!=="function")return false;
    const original=startWorld;
    startWorld=function startWorldV130Polish(){const result=original.apply(this,arguments);try{balanceGroundPotions()}catch(error){console.warn("[Lost Sizzler V10.30] potion balance failed",error)}return result};
    state.installed=true;
    setBuildLabel();
    document.body.dataset.polishReady="true";
    return true;
  }

  install();
  let attempts=0;
  const timer=setInterval(()=>{attempts++;if(install()||state.installed||attempts>=40)clearInterval(timer)},100);
  window.addEventListener("pagehide",()=>clearInterval(timer),{once:true});
  window.CCGLostSizzlerPolishV130={state,balanceGroundPotions,constants:{POTION_TARGETS}};
})();