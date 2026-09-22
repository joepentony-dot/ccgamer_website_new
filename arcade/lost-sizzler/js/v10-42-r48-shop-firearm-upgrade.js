/* C64 Dungeon Carnage V10.42 r48 — shop firearm upgrade bridge.
 * Replaces the legacy random Weapon Cache shop purchase with one deterministic,
 * floor-gated upgrade for the r47 single evolving firearm. Normal shop stock and
 * its shared score ladder remain owned by the established shop runtime.
 */
(()=>{
  "use strict";
  if(window.CCGLostSizzlerV142R48ShopFirearmUpgrade)return;

  const GOLD_SCORE_COIN_VALUE=125;
  const BASE_UPGRADE_PRICE=2500;
  const UPGRADE_PRICE_STEP=1250;
  const state={installed:false,renderInstalls:0,buyInstalls:0,helpInstalls:0,purchases:0,blockedAtCap:0,insufficientFunds:0};

  const api=()=>window.CCGLostSizzlerV142R47FirearmEvolution||null;
  const currentPlayer=()=>{try{return p1||null}catch(_){return null}};
  const currentFloor=()=>{try{return Math.max(1,Math.min(5,Math.floor(Number(run?.floor||1))))}catch(_){return 1}};
  const currentScore=()=>{try{return Math.max(0,Math.floor(Number(score)||0))}catch(_){return 0}};
  const format=n=>Math.max(0,Math.floor(Number(n)||0)).toLocaleString();

  function offerFor(player=currentPlayer()){
    const evolution=api(),floor=currentFloor();
    const tier=evolution?.deriveTier?.(player)??Math.max(0,Math.floor(Number(player?.weaponEvolutionTier||0)));
    const cap=evolution?.capForFloor?.(floor)??Math.min(6,floor+1);
    const nextTier=Math.min(6,Math.max(1,tier+1));
    const maxed=tier>=6;
    const floorCapped=!maxed&&tier>=cap;
    const price=BASE_UPGRADE_PRICE+Math.max(0,tier)*UPGRADE_PRICE_STEP;
    const goldCoins=Math.round(price/GOLD_SCORE_COIN_VALUE);
    return{floor,tier,cap,nextTier,maxed,floorCapped,available:!maxed&&!floorCapped,price,goldCoins}
  }

  function offerName(offer){
    if(offer.maxed)return"FIREARM · MAXIMUM TIER";
    if(offer.floorCapped)return`FIREARM UPGRADE · FLOOR ${offer.floor} CAP`;
    if(offer.tier<=0)return"FIREARM ACQUISITION · TIER 1";
    return`FIREARM UPGRADE · TIER ${offer.tier} → ${offer.nextTier}`
  }

  function offerDescription(offer){
    if(offer.maxed)return"Your evolving firearm is already Tier 6. No further weapon purchase is needed.";
    if(offer.floorCapped)return`Tier ${offer.tier} is the Floor ${offer.floor} limit. Descend before buying the next firearm upgrade.`;
    const stage=api()?.STAGES?.[offer.nextTier];
    const result=stage?.name?` Next: ${stage.name}.`:"";
    const unlock=offer.nextTier===4?" This is the three-way-fire unlock.":"";
    return`Upgrades your single evolving firearm by exactly one tier. Price: ${format(offer.price)} score, equivalent to ${offer.goldCoins} Gold Score Coins.${result}${unlock}`
  }

  function decorateShop(){
    try{
      if(!activeShop)return false;
      const button=document.querySelector?.('[data-shop-buy="weapon"]');
      const card=button?.closest?.(".shop-item");
      if(!button||!card)return false;
      const offer=offerFor();
      const title=card.querySelector("h3"),price=card.querySelector(".price"),copy=card.querySelector("p");
      if(title)title.textContent=offerName(offer);
      if(price)price.textContent=offer.available?`${format(offer.price)} SCORE · ${offer.goldCoins} GOLD COINS`:"UPGRADE LOCKED";
      if(copy)copy.textContent=offerDescription(offer);
      button.disabled=!offer.available;
      button.textContent=offer.maxed?"MAXIMUM TIER":offer.floorCapped?"DESCEND TO UPGRADE":offer.tier<=0?"BUY FIREARM":"BUY UPGRADE";
      card.classList.toggle("sold",!offer.available);
      card.dataset.ccgR48FirearmShop="true";
      return true
    }catch(_){return false}
  }

  function purchaseUpgrade(){
    const player=currentPlayer(),evolution=api(),shop=typeof activeShop!=="undefined"?activeShop:null;
    if(!player||!shop||!evolution?.stageWeapon||typeof equipWeapon!=="function")return false;
    const offer=offerFor(player);
    if(!offer.available){
      state.blockedAtCap++;
      try{
        const message=offer.maxed?"Tier 6 is already the maximum firearm level.":`Floor ${offer.floor} is capped at Tier ${offer.cap}. Descend to unlock the next upgrade.`;
        showToast("FIREARM UPGRADE LOCKED",message,"cyan",6200)
      }catch(_){}
      decorateShop();return false
    }
    if(currentScore()<offer.price){
      state.insufficientFunds++;
      try{showToast("NOT ENOUGH SCORE",`The Tier ${offer.nextTier} firearm upgrade costs ${format(offer.price)} score (${offer.goldCoins} Gold Score Coins). You currently have ${format(currentScore())}.`,"red",6500)}catch(_){}
      return false
    }

    const beforeTier=offer.tier,beforeScore=currentScore();
    try{score=beforeScore-offer.price}catch(_){return false}
    const target=evolution.stageWeapon(offer.nextTier);
    try{equipWeapon(player,target)}catch(error){
      try{score=beforeScore}catch(_){}
      throw error
    }
    const afterTier=evolution.deriveTier(player);
    if(afterTier<=beforeTier){
      try{score=beforeScore}catch(_){}
      try{showToast("FIREARM UPGRADE FAILED","No firearm tier was gained, so your score was refunded.","red",6500)}catch(_){}
      return false
    }

    shop.weaponUpgradePurchases=Math.max(0,Number(shop.weaponUpgradePurchases||0))+1;
    state.purchases++;
    try{host.revision++}catch(_){}
    try{window.CCGLostSizzlerV142Stage7NpcMerchant?.noteTransaction?.(shop,"weapon")}catch(_){}
    try{broadcastWorld()}catch(_){}
    try{renderShop()}catch(_){decorateShop()}
    try{sync()}catch(_){}
    return true
  }

  function installRender(){
    const current=window.renderShop;
    if(typeof current!=="function")return false;
    if(current.__ccgR48ShopFirearmUpgrade)return true;
    const wrapped=function(...args){const result=current.apply(this,args);decorateShop();return result};
    wrapped.__ccgR48ShopFirearmUpgrade=true;wrapped.__ccgOriginal=current;window.renderShop=wrapped;state.renderInstalls++;return true
  }

  function installBuy(){
    const current=window.buyShopItem;
    if(typeof current!=="function")return false;
    if(current.__ccgR48ShopFirearmUpgrade)return true;
    const wrapped=function(id,...rest){if(String(id)==="weapon")return purchaseUpgrade();return current.call(this,id,...rest)};
    wrapped.__ccgR48ShopFirearmUpgrade=true;wrapped.__ccgOriginal=current;window.buyShopItem=wrapped;state.buyInstalls++;return true
  }

  function installHelp(){
    const current=window.itemHelp;
    if(typeof current!=="function")return false;
    if(current.__ccgR48ShopFirearmUpgrade)return true;
    const wrapped=function(kind,...rest){
      if(String(kind)==="weapon")return"Weapon pickups and shop upgrades improve your one evolving firearm by one tier, subject to the current floor cap. Three-way fire first unlocks at Tier 4 on Floor 3.";
      return current.call(this,kind,...rest)
    };
    wrapped.__ccgR48ShopFirearmUpgrade=true;wrapped.__ccgOriginal=current;window.itemHelp=wrapped;state.helpInstalls++;return true
  }

  function install(){
    const ready=installRender()&&installBuy()&&installHelp();
    state.installed=Boolean(ready);
    if(ready)queueMicrotask(decorateShop);
    return state.installed
  }

  if(document.body?.dataset?.releaseReady==="true")queueMicrotask(install);
  addEventListener("ccg:v142-ready",()=>queueMicrotask(install),{once:true});

  window.CCGLostSizzlerV142R48ShopFirearmUpgrade=Object.freeze({
    version:"V10.42-r48-shop-firearm-upgrade",
    GOLD_SCORE_COIN_VALUE,BASE_UPGRADE_PRICE,UPGRADE_PRICE_STEP,
    offerFor,decorateShop,purchaseUpgrade,install,get state(){return state}
  });
})();