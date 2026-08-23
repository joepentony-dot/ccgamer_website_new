/* The Lost Sizzler V10.24 — thumb-reach inventory return and mobile UI safety helpers. */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_MOBILE_ERGONOMICS_V124__)return;
  window.__CCG_LOST_SIZZLER_MOBILE_ERGONOMICS_V124__=true;

  const mobile=()=>navigator.maxTouchPoints>0||window.matchMedia?.("(pointer: coarse)")?.matches===true||window.matchMedia?.("(max-width: 900px)")?.matches===true;
  let observer=null;

  function inventoryPanel(){return document.getElementById("inventory-panel")}
  function inventoryOpen(){const panel=inventoryPanel();return Boolean(panel&&!panel.classList.contains("hidden"))}
  function tutorialWantsInventoryClose(){
    const tutorial=window.CCGLostSizzlerOnboardingV120?.state;
    return Boolean(tutorial?.active&&Number(tutorial.step)===3&&tutorial.inventoryOpened&&!tutorial.inventoryClosed);
  }

  function closeInventory(){
    if(!inventoryOpen())return false;
    const preferred=document.getElementById("inventory-close-top");
    const fallback=document.getElementById("inventory-close");
    if(preferred){preferred.click();return true}
    if(fallback){fallback.click();return true}
    try{
      if(typeof toggleInventory==="function"){toggleInventory();return true}
    }catch(_){}
    return false;
  }

  function ensureReturnButton(){
    if(!mobile())return null;
    const panel=inventoryPanel();if(!panel)return null;
    let button=document.getElementById("ccg-mobile-inventory-return");
    if(!button){
      button=document.createElement("button");
      button.id="ccg-mobile-inventory-return";
      button.type="button";
      button.className="primary hidden";
      button.textContent="← BACK TO GAME";
      button.setAttribute("aria-label","Close inventory and return to the game");
      button.addEventListener("click",event=>{
        event.preventDefault();event.stopPropagation();
        closeInventory();
      });
      panel.appendChild(button);
    }
    return button;
  }

  function sync(){
    const open=inventoryOpen();
    const button=ensureReturnButton();
    button?.classList.toggle("hidden",!open);
    button?.classList.toggle("ccg-tutorial-control-highlight",Boolean(open&&tutorialWantsInventoryClose()));
    document.body.classList.toggle("ccg-mobile-inventory-open",Boolean(open&&mobile()));
  }

  function install(){
    const panel=inventoryPanel();
    if(!panel)return false;
    ensureReturnButton();
    if(!observer){
      observer=new MutationObserver(sync);
      observer.observe(panel,{attributes:true,attributeFilter:["class"]});
    }
    document.getElementById("inventory-close-top")?.setAttribute("aria-label","Back to game");
    document.getElementById("inventory-close")?.setAttribute("aria-label","Back to game");
    sync();
    return true;
  }

  if(!install()){
    let attempts=0;
    const timer=setInterval(()=>{
      attempts++;
      if(install()||attempts>=40)clearInterval(timer);
    },125);
  }

  const syncTimer=setInterval(()=>{if(inventoryOpen())sync()},180);
  window.addEventListener("resize",sync,{passive:true});
  window.addEventListener("orientationchange",()=>setTimeout(sync,80),{passive:true});
  window.addEventListener("pagehide",()=>{clearInterval(syncTimer);observer?.disconnect?.()},{once:true});
  window.CCGLostSizzlerMobileErgonomicsV124={sync,closeInventory,ensureReturnButton};
})();

/* V10.25 is intentionally loaded after all existing runtime enhancement layers.
 * This keeps the sword/ammo rebalance additive and lets it wrap the final combat,
 * hazard, tutorial and mobile-control functions rather than replacing core files. */
(()=>{
  if(document.querySelector('script[data-ccg-lost-sizzler-melee-ammo-v125="true"]'))return;
  const script=document.createElement("script");
  script.src="js/v10-25-melee-ammo-balance.js?v=20260823a";
  script.dataset.ccgLostSizzlerMeleeAmmoV125="true";
  script.async=false;
  script.onerror=()=>console.warn("[Lost Sizzler] V10.25 melee/ammo balance failed to load.");
  document.body.appendChild(script);
})();
