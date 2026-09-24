/* C64 Dungeon Carnage V10.42 r55 — shop purchase feedback owner.
 * Mirrors purchase success/failure inside the shop overlay so feedback is never
 * hidden behind the overlay. It does not alter prices, stock or inventory rules.
 */
(()=>{
  "use strict";
  if(window.CCGLostSizzlerV142R55ShopFeedback)return;

  const state={installed:false,feedback:0,fallbacks:0,last:null};
  let serial=0,purchaseDepth=0;

  const shopVisible=()=>{try{return Boolean(activeShop&&UI?.shop&&!UI.shop.classList.contains("hidden"))}catch(_){return false}};
  const scoreNow=()=>{try{return Math.max(0,Math.floor(Number(score)||0))}catch(_){return 0}};
  const player=()=>{try{return p1||null}catch(_){return null}};
  const node=id=>document.getElementById(id);

  function setStatus(title,text,tone="cyan",reason=""){
    const box=node("shop-status"),heading=node("shop-status-title"),copy=node("shop-status-text");
    if(!box||!heading||!copy)return false;
    serial++;
    box.classList.remove("hidden","red","green","gold","cyan");
    box.classList.add(["red","green","gold"].includes(tone)?tone:"cyan");
    heading.textContent=String(title||"SHOP UPDATE");
    copy.textContent=String(text||"");
    box.dataset.reason=String(reason||"");
    box.dataset.serial=String(serial);
    state.feedback++;state.last={title:heading.textContent,text:copy.textContent,tone,reason,serial,at:performance.now()};
    try{window.dispatchEvent(new CustomEvent("ccg:shop-feedback",{detail:{...state.last,shopId:String(activeShop?.id||"")}}))}catch(_){}
    return true
  }

  function clearStatus(){
    const box=node("shop-status");if(!box)return false;
    box.classList.add("hidden");box.dataset.reason="";return true
  }

  function inventoryBlocked(id){
    const p=player();if(!p||typeof PGR?.inventoryCanAdd!=="function")return false;
    const kind={banishment:"banishment",banishmentScore:"banishment",potion:"potion",torch:"torch",teleport:"teleport"}[String(id)];
    if(!kind)return false;
    try{return !PGR.inventoryCanAdd(p,{kind})}catch(_){return false}
  }

  function fallbackFeedback(id){
    const key=String(id||""),p=player(),shop=typeof activeShop!=="undefined"?activeShop:null;
    if(!p||!shop)return false;
    const foundation=window.CCGDungeonProgressionFoundation;
    const goldOwned=Boolean(foundation?.ready&&typeof foundation.goldBalance==="function"&&typeof foundation.shopGoldPrice==="function"&&typeof run!=="undefined"&&run);
    if(goldOwned&&key!=="banishment"){
      let goldPrice=0;
      try{
        goldPrice=(key==="banishmentGold"||key==="banishmentScore")
          ?Number(foundation.GOLD?.banishment||10)
          :Number(foundation.shopGoldPrice(shop)||0);
      }catch(_){}
      const goldNow=Number(foundation.goldBalance(run)||0);
      if(goldPrice>0&&goldNow<goldPrice){
        state.fallbacks++;
        return setStatus("NOT ENOUGH GOLD",`This purchase costs ${goldPrice.toLocaleString()} Gold. You currently have ${goldNow.toLocaleString()}.`,"red","insufficient-gold")
      }
    }else{
      let price=0;
      try{
        if(key==="banishmentScore")price=Number(window.CCGLostSizzlerStalkerShopBalanceV106?.FLASK_SCORE_PRICE||8000);
        else if(key==="weapon")price=Number(window.CCGLostSizzlerV142R48ShopFirearmUpgrade?.offerFor?.(p)?.price||0);
        else price=typeof shopScorePrice==="function"?Number(shopScorePrice(shop)||0):0;
      }catch(_){}
      if(price>0&&scoreNow()<price){
        state.fallbacks++;
        return setStatus("NOT ENOUGH SCORE",`This purchase costs ${price.toLocaleString()} score. You currently have ${scoreNow().toLocaleString()}.`,"red","insufficient-score")
      }
    }
    if(inventoryBlocked(key)){
      state.fallbacks++;
      return setStatus("INVENTORY FULL","There is no room for this item. Free a stack slot or expand your inventory before buying it.","red","inventory-full")
    }
    state.fallbacks++;
    return setStatus("PURCHASE BLOCKED","That item cannot be bought right now. Check its price, inventory space and any floor or tier restriction shown on the item card.","red","blocked")
  }

  function install(){
    if(state.installed)return true;
    if(typeof showToast!=="function"||typeof buyShopItem!=="function"||typeof openShop!=="function")return false;

    const toastOwner=showToast;
    showToast=function shopVisibleToastMirror(title,text,tone,duration){
      const result=toastOwner.apply(this,arguments),heading=String(title||"");
      if(shopVisible()&&purchaseDepth>0&&!/^ACHIEVEMENT\b/i.test(heading))setStatus(title,text,tone==="red"?"red":tone==="green"?"green":tone==="gold"?"gold":"cyan","purchase-toast");
      return result
    };
    showToast.__ccgR55ShopFeedback=true;showToast.__ccgOriginal=toastOwner;

    const buyOwner=buyShopItem;
    buyShopItem=function buyShopItemR55Feedback(id,...rest){
      const before=serial;let result;
      purchaseDepth++;
      try{result=buyOwner.call(this,id,...rest)}
      finally{purchaseDepth=Math.max(0,purchaseDepth-1)}
      if(shopVisible()&&result===false&&serial===before)fallbackFeedback(id);
      return result
    };
    buyShopItem.__ccgR55ShopFeedback=true;buyShopItem.__ccgOriginal=buyOwner;

    const openOwner=openShop;
    openShop=function openShopR55Feedback(...args){
      clearStatus();
      const result=openOwner.apply(this,args);
      if(result!==false&&shopVisible())setStatus("SHOP READY","Select an item to buy or trade. If a purchase is blocked, the reason will appear here.","cyan","open");
      return result
    };
    openShop.__ccgR55ShopFeedback=true;openShop.__ccgOriginal=openOwner;

    state.installed=true;
    return true
  }

  let attempts=0;
  const timer=setInterval(()=>{attempts++;if(install()||attempts>=80)clearInterval(timer)},50);
  install();
  addEventListener("pagehide",()=>clearInterval(timer),{once:true});

  window.CCGLostSizzlerV142R55ShopFeedback=Object.freeze({
    version:"V10.42-r55-shop-feedback",state,setStatus,clearStatus,fallbackFeedback,install
  });
})();
