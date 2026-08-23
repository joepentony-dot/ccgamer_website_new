/* The Lost Sizzler — V10.6 Death Stalker reward/shop simplification.
 *
 * This late layer keeps the established game systems intact while simplifying
 * three player-facing decisions:
 *   - intermediate floor clears only continue deeper; there is no early
 *     "Save Loot & Exit" choice
 *   - permanently banishing a Stalker awards 10,000 score only, with no XP
 *     conversion choice or dropped bounty artefact
 *   - a Banishment Flask costs a fixed 8,000 score at shops
 */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_STALKER_SHOP_BALANCE_V106__)return;
  window.__CCG_LOST_SIZZLER_STALKER_SHOP_BALANCE_V106__=true;

  const FLASK_SCORE_PRICE=8000;
  const BANISH_SCORE_REWARD=10000;

  const originalShowToast=typeof showToast==="function"?showToast:null;
  const originalRenderShop=typeof renderShop==="function"?renderShop:null;
  const originalBuyShopItem=typeof buyShopItem==="function"?buyShopItem:null;
  const originalFloorComplete=typeof floorComplete==="function"?floorComplete:null;
  const originalItemHelp=typeof itemHelp==="function"?itemHelp:null;
  const originalItemInfoDetails=typeof itemInfoDetails==="function"?itemInfoDetails:null;

  function updatePriceSentence(value){
    return String(value??"")
      .replace(/pay 10,000 score at a (?:dungeon )?shop/gi,"pay 8,000 score at a shop")
      .replace(/buy one there for 10,000 score/gi,"buy one there for 8,000 score")
      .replace(/Flask costs 10,000 score/gi,"Flask costs 8,000 score");
  }

  if(originalShowToast){
    showToast=function(title,text,tone,duration){
      return originalShowToast(title,updatePriceSentence(text),tone,duration);
    };
  }

  function updateStaticPriceCopy(){
    if(typeof document==="undefined"||!document.body||typeof document.createTreeWalker!=="function"||typeof NodeFilter==="undefined")return;
    const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
    let node;
    while((node=walker.nextNode())){
      const next=updatePriceSentence(node.nodeValue);
      if(next!==node.nodeValue)node.nodeValue=next;
    }
  }

  if(originalRenderShop){
    renderShop=function(){
      const result=originalRenderShop.apply(this,arguments);
      const buy=document.querySelector?.('[data-shop-buy="banishmentScore"]');
      const card=buy?.closest?.(".shop-item");
      const price=card?.querySelector?.(".price");
      if(price)price.textContent=`${FLASK_SCORE_PRICE.toLocaleString()} SCORE`;
      return result;
    };
  }

  if(originalBuyShopItem){
    buyShopItem=function(id){
      if(id!=="banishmentScore")return originalBuyShopItem.apply(this,arguments);
      if(!activeShop||!p1)return false;
      activeShop.sold=activeShop.sold||{};
      if(activeShop.sold.banishmentScore)return false;
      if(score<FLASK_SCORE_PRICE){
        showToast("NOT ENOUGH SCORE",`The Flask costs ${FLASK_SCORE_PRICE.toLocaleString()} score. You currently have ${score.toLocaleString()}.`,"red",6000);
        return false;
      }
      if(!PGR.inventoryCanAdd(p1,{kind:"banishment"})){
        showToast("INVENTORY FULL","The Flask needs a slot unless you already carry a Banishment stack.","red",6000);
        return false;
      }
      score-=FLASK_SCORE_PRICE;
      activeShop.sold.banishmentScore=true;
      PGR.inventoryAdd(p1,{kind:"banishment",name:"Banishment Flask",short:"BANISH"});
      S.sfx("shrine");
      showToast("BANISHMENT FLASK ACQUIRED",`${FLASK_SCORE_PRICE.toLocaleString()} score paid. The artefact exchange is still available at this shop.`,"gold",8500);
      host.revision++;
      broadcastWorld();
      renderShop();
      sync();
      return true;
    };
  }

  if(originalItemHelp){
    itemHelp=function(kind){
      if(kind==="game")return "C64 rescue collectible; banked automatically when a floor is cleared. Any granted ability is announced above your character.";
      return updatePriceSentence(originalItemHelp(kind));
    };
  }

  if(originalItemInfoDetails){
    itemInfoDetails=function(it){
      const details=originalItemInfoDetails(it);
      if(details?.why)details.why=updatePriceSentence(details.why);
      if(details?.desc)details.desc=updatePriceSentence(details.desc);
      return details;
    };
  }

  if(originalFloorComplete){
    floorComplete=function(by){
      const result=originalFloorComplete.apply(this,arguments);
      if(!run?.floorComplete||!UI?.floorComplete)return result;
      const finalFloor=Number(run.floor||1)>=Number(C.maxFloors||5);
      if(UI.floorSummary&&!finalFloor){
        UI.floorSummary.innerHTML=String(UI.floorSummary.innerHTML||"").replace(
          "Descend for better loot and more danger, or extract now with everything safely saved.",
          "Descend for better loot and more danger."
        );
      }
      if(UI.extract){
        UI.extract.style.display=finalFloor?"":"none";
        UI.extract.textContent="Finish Run";
      }
      if(UI.descend)UI.descend.style.display=finalFloor?"none":"";
      return result;
    };
  }

  // The previous reward dropped a second artefact and asked the player to pick
  // between 10,000 score and XP. A successful permanent banishment is now one
  // decisive reward: 10,000 score and no XP.
  if(typeof permanentlyBanish==="function"){
    permanentlyBanish=function(target,p){
      if(!target||!p||!host||!run)return false;
      const name=target===host.stalker?(C.stalker.name||"Count Loadula"):"Death Stalker";
      if(target===host.stalker){
        target.awake=false;
        target.near=false;
        target.permanentlyBanished=true;
        target.spawnTimer=Number.POSITIVE_INFINITY;
        S.setStalkerNear(false);
      }else{
        target.alive=false;
        target.hp=0;
        target.permanentlyBanished=true;
        host.defeatedDeathStalkers=host.defeatedDeathStalkers||[];
        if(!host.defeatedDeathStalkers.includes(target.id))host.defeatedDeathStalkers.push(target.id);
        const timed=(host.timedRooms||[]).find(room=>room.hunterId===target.id);
        if(timed)timed.stalkerDefeated=true;
      }
      run.stats.kills++;
      recordEnemyDefeat(target,p,name);
      score+=BANISH_SCORE_REWARD;
      S.sfx("elite");
      burst(target.x,target.y,P.purple,30,1.8);
      ring(target.x,target.y,P.gold,46);
      floatText(target.x,target.y,`BANISHED! +${BANISH_SCORE_REWARD.toLocaleString()} SCORE`,P.gold);
      showToast(
        `${name.toUpperCase()} BANISHED`,
        `Congratulations — ${name} has been permanently removed from this floor. +${BANISH_SCORE_REWARD.toLocaleString()} score.`,
        "green",
        10500
      );
      host.revision++;
      broadcastWorld();
      return true;
    };
  }

  // Old bounty artefacts should never be generated after this patch. If one is
  // present in an already-created shared world, collecting it resolves straight
  // to score rather than reopening the retired XP/score choice panel.
  if(typeof offerBanishmentArtefact==="function"){
    offerBanishmentArtefact=function(p){
      const player=p||p1;
      if(!player)return false;
      score+=BANISH_SCORE_REWARD;
      floatText(player.x,player.y,`+${BANISH_SCORE_REWARD.toLocaleString()} SCORE`,P.gold);
      pendingBanishmentReward=null;
      UI.artefactChoice?.classList.add("hidden");
      if(mode==="artefactchoice")mode="playing";
      showToast("BANISHMENT REWARD",`Congratulations — ${BANISH_SCORE_REWARD.toLocaleString()} score awarded.`,"gold",7000);
      sync();
      return true;
    };
  }

  if(typeof claimBanishmentArtefact==="function"){
    claimBanishmentArtefact=function(){
      const reward=pendingBanishmentReward;
      if(!reward)return false;
      return offerBanishmentArtefact(reward.p||p1,reward.loot||{});
    };
  }

  UI?.artefactChoice?.classList.add("hidden");
  updateStaticPriceCopy();
  if(typeof setTimeout==="function")setTimeout(updateStaticPriceCopy,250);

  window.CCGLostSizzlerStalkerShopBalanceV106={FLASK_SCORE_PRICE,BANISH_SCORE_REWARD,updatePriceSentence};
})();
