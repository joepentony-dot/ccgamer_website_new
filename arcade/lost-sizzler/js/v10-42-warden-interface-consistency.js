/* The Lost Sizzler V10.42 r3 — retire legacy Flask/instant-kill interface copy. */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V142_WARDEN_INTERFACE_CONSISTENCY__)return;
  window.__CCG_LOST_SIZZLER_V142_WARDEN_INTERFACE_CONSISTENCY__=true;

  const C=window.CCG_CONFIG,PGR=window.CCGProgression;
  if(!C||!PGR)return;

  const baseShowToast=typeof showToast==="function"?showToast:null;
  const baseRenderShop=typeof renderShop==="function"?renderShop:null;
  const baseBuyShopItem=typeof buyShopItem==="function"?buyShopItem:null;
  const baseGuideDefinitions=typeof guideDefinitions==="function"?guideDefinitions:null;
  const baseItemInfoDetails=typeof itemInfoDetails==="function"?itemInfoDetails:null;
  const baseInventoryLabel=typeof PGR.inventoryLabel==="function"?PGR.inventoryLabel.bind(PGR):null;
  const A=()=>{try{return typeof activeShop!=="undefined"?activeShop:null}catch(_){return null}};
  const P=()=>{try{return typeof p1!=="undefined"?p1:null}catch(_){return null}};
  const range=()=>Math.max(2,Number(C.stalker?.banishPromptDistance)||8);
  const isAlchemist=shop=>Boolean(shop&&(shop.v142Alchemist||/ALCHEMIST/i.test(String(shop.title||""))));

  function wardBreakHelp(){return`Ward-Break Charge. Press B within ${range()} tiles of a sealed Death Stalker or ${String(C.stalker?.name||"Count Loadula")} to strip its supernatural immunity. The charge does not kill the Warden; finish the fight with normal weapons to cleanse its domain and earn the Warden Cache.`}
  function essenceHelp(){return"Rare spectral residue is stored as Banishment Essence in the Vessel rather than occupying an inventory slot. Distil enough Essence at a Banishment Alchemist to create a Ward-Break Charge."}

  function normaliseToast(title,text){
    let nextTitle=String(title??""),nextText=String(text??"");
    if(nextTitle==="SOMETHING HAS ENTERED THE VAULT"||/ IS NEAR$/i.test(nextTitle)){
      if(/ARTEFACT|POTION TO KILL|INDESTRUCTIBLE|FLASK/i.test(nextText))nextText=`A supernatural Warden is active. Normal attacks cannot harm its sealed ward. Earn or distil a Ward-Break Charge, press B within ${range()} tiles, then defeat it with normal weapons.`;
    }
    if(nextTitle==="TIMED CHAMBER — DEATH STALKER")nextText=`This is the floor's Death Stalker. Survive the chamber timer, or use an earned/distilled Ward-Break Charge within ${range()} tiles to strip its immunity and fight it normally. Killing it cleanses this floor's Warden domain.`;
    if(nextTitle==="TIMED CHAMBER CLEARED"&&/BANISHMENT FLASK|PERMANENTLY DESTROYED/i.test(nextText))nextText="Thirty seconds survived. The Death Stalker remains on this floor until its ward is broken and it is defeated in normal combat. Bonus armour awarded.";
    if(nextTitle==="TIMED CHAMBER — STALKER BANISHED"){
      nextTitle="TIMED CHAMBER — WARDEN DEFEATED";nextText="This floor's Death Stalker has already been defeated and its Warden domain cleansed. Survive the remaining chamber trial for the reward.";
    }
    nextText=nextText.replace(/Banishment Flask/gi,"Ward-Break Charge").replace(/the Flask/gi,"the Ward-Break Charge");
    return{title:nextTitle,text:nextText};
  }

  if(baseShowToast){
    showToast=function(title,text,...rest){const next=normaliseToast(title,text);return baseShowToast(next.title,next.text,...rest)};
  }

  function retireLegacyShopCards(shop=A()){
    const root=typeof UI!=="undefined"?UI?.shopItems:null;if(!root)return 0;let removed=0;
    for(const id of isAlchemist(shop)?["banishmentScore"]:["banishment","banishmentScore"]){
      const button=root.querySelector?.(`[data-shop-buy="${id}"]`),article=button?.closest?.("article");if(article){article.remove?.();removed++}
    }
    return removed;
  }

  if(baseRenderShop){
    renderShop=function(...args){const result=baseRenderShop(...args);try{retireLegacyShopCards(A())}catch(error){console.warn("[Lost Sizzler V10.42] legacy Warden shop cleanup failed safely",error)}return result};
  }

  if(baseBuyShopItem){
    buyShopItem=function(id,...args){
      if(id==="banishmentScore"){baseShowToast?.("WARD-BREAK SCORE PURCHASE RETIRED","Ward-Break Charges are now earned through floor challenges or distilled from Banishment Essence at an Alchemist. The old 10,000-score instant-kill purchase is no longer part of V10.42.","cyan",8000);return false}
      if(id==="banishment"&&!isAlchemist(A())){baseShowToast?.("ALCHEMIST REQUIRED","Normal dungeon shops no longer sell the old Banishment Flask. Find a Banishment Alchemist to distil Essence into a Ward-Break Charge, or complete this floor's field route.","cyan",8000);return false}
      return baseBuyShopItem(id,...args);
    };
  }

  if(baseGuideDefinitions){
    guideDefinitions=function(...args){return (baseGuideDefinitions(...args)||[]).map(row=>{
      if(row?.kind==="banishment")return{...row,name:"WARD-BREAK CHARGE",desc:wardBreakHelp()};
      if(row?.kind==="loot"&&/Banishment Flask|Secret Artefact Trader|artefact/i.test(String(row.desc||"")))return{...row,desc:essenceHelp()};
      return row;
    })};
  }

  if(baseItemInfoDetails){
    itemInfoDetails=function(it,...args){const result=baseItemInfoDetails(it,...args)||{};
      if(it?.kind==="banishment")return{...result,name:"WARD-BREAK CHARGE",desc:wardBreakHelp(),why:`WARD BREAK MATTERS: move within ${range()} tiles of a sealed Warden and press B. Its immunity drops, but you still have to win the fight.`};
      if(it?.kind==="artefact")return{...result,desc:essenceHelp(),why:"ESSENCE MATTERS: V10.42 stores spectral residue in the Vessel for Alchemist distillation into Ward-Break Charges."};
      return result;
    };
  }

  if(baseInventoryLabel){
    PGR.inventoryLabel=function(item,...args){if(item?.kind==="banishment")return"Ward-Break Charge";return baseInventoryLabel(item,...args)};
  }

  function refreshVisibleCopy(){
    try{
      const tip=document.querySelector?.(".dossier-card .reference-tip");if(tip&&/Flask|artefacts|10,000/i.test(tip.textContent||""))tip.innerHTML="<b>Warden Hunt:</b> earn or distil a Ward-Break Charge, press <b>B</b> near a sealed Warden to remove its immunity, then defeat it normally to cleanse the floor.";
      const feature=[...document.querySelectorAll?.("#menu .feature-strip span")||[]].find(node=>/DEATH STALKER|BANISHMENT FLASK/i.test(node.textContent||""));if(feature)feature.innerHTML="<b>WARDEN HUNTS</b>Break immunity, cleanse corrupted domains and recover Seal Fragments";
    }catch(_){}
  }

  refreshVisibleCopy();
  window.CCGLostSizzlerV142WardenInterfaceConsistency={version:"V10.42 r3",wardBreakHelp,essenceHelp,normaliseToast,isAlchemist,retireLegacyShopCards,refreshVisibleCopy};
})();
