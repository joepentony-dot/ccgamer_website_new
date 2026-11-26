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
  const revisionNow=()=>{try{return Math.max(0,Number(host?.revision)||0)}catch(_){return 0}};
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

  function fallbackFeedback(id,allowGeneric=true){
    const key=String(id||""),p=player(),shop=typeof activeShop!=="undefined"?activeShop:null;
    if(!p||!shop)return false;
    // The Alchemist transaction uses Essence, not the ordinary shop wallet.
    // Do not preflight capacity before legacy physical Artefacts are consumed:
    // that payment can free the destination slot in an otherwise full pack.
    if(key==="banishmentScore"){
      state.fallbacks++;
      return setStatus("WARD-BREAK SCORE PURCHASE RETIRED","Earn a Ward-Break Charge through a floor challenge or distil one from Essence at an Alchemist. Score cannot buy a charge.","cyan","retired-score-purchase")
    }
    if(key==="banishment"){
      const report=(title,text,tone,reason)=>{state.fallbacks++;return setStatus(title,text,tone,reason)};
      if(!(shop.v142Alchemist||String(shop.title||"").includes("ALCHEMIST")))return report("ALCHEMIST REQUIRED","Find a Banishment Alchemist to distil a Ward-Break Charge.","cyan","alchemist-required");
      const need=Math.max(1,Math.floor(Number(window.CCGLostSizzlerV142ProceduralOverhaul?.essenceCost?.(p))||Number(window.CCG_CONFIG?.stalker?.flaskArtefacts)||3));
      const count=value=>Math.max(0,Math.floor(Number(value)||0));
      const items=Array.isArray(p.inventory)?p.inventory:[],physical=items.reduce((sum,item)=>sum+(item?.kind==="artefact"?Math.max(1,count(item.qty)||1):0),0),have=count(p.banishmentEssence)+physical;
      if(have<need)return report("NOT ENOUGH BANISHMENT ESSENCE",`The Alchemist requires ${need} Essence. Your Vessel and any legacy Artefacts currently provide ${have}.`,"red","insufficient-essence");
      if(items.some(item=>item?.kind==="banishment"))return report("WARD-BREAK CHARGE ALREADY CARRIED","Use your existing Ward-Break Charge before distilling another.","cyan","charge-already-carried");
      if(!allowGeneric)return false;
      return report("DISTILLATION BLOCKED","Check the available unlocked inventory slots. The Alchemist requires Essence, not Score or Gold.","red","distillation-blocked")
    }
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
    if(!allowGeneric)return false;
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

    document.addEventListener("click",event=>{
      const target=event.target instanceof Element?event.target.closest("[data-shop-buy]"):null;
      if(!target||!shopVisible())return;
      const id=String(target.getAttribute("data-shop-buy")||""),before=serial,beforeRevision=revisionNow();
      purchaseDepth++;
      setTimeout(()=>{
        purchaseDepth=Math.max(0,purchaseDepth-1);
        if(shopVisible()&&serial===before&&revisionNow()<=beforeRevision)fallbackFeedback(id)
      },0)
    },true);

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
