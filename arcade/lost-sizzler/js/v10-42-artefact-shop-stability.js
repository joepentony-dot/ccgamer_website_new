/* C64 Dungeon Carnage V10.42 — Artefact shop exchange stability. */
(()=>{
  "use strict";
  if(window.CCGLostSizzlerV142ArtefactShopStability)return;

  const diagnostics={installs:0,rebinds:0,trades:0,rollbacks:0,insufficient:0,installWaits:0};
  let installed=false,installTimer=0;

  function currentPlayer(){try{return typeof p1!=="undefined"?p1:null}catch(_){return null}}
  function progression(){return window.CCGProgression||null}
  function currentShopOwner(){try{return typeof buyShopItem==="function"?buyShopItem:null}catch(_){return null}}
  function ownsCurrentBoundary(){const owner=currentShopOwner();return Boolean(owner?.__ccgArtefactShopStability)}
  const nonNegativeInt=value=>Math.max(0,Math.floor(Number(value)||0));
  const cloneItem=item=>item&&typeof item==="object"?{...item}:item;

  function physicalArtefactCount(player){
    return (Array.isArray(player?.inventory)?player.inventory:[]).reduce((total,item)=>{
      if(item?.kind!=="artefact")return total;
      return total+Math.max(1,nonNegativeInt(item.qty)||1);
    },0);
  }

  function snapshotPaymentState(player){
    return{
      inventory:(Array.isArray(player?.inventory)?player.inventory:[]).map(cloneItem),
      hadEssence:Object.prototype.hasOwnProperty.call(player||{},"banishmentEssence"),
      essence:player?.banishmentEssence
    };
  }

  function restorePaymentState(player,snapshot){
    if(!player||!snapshot)return;
    player.inventory=snapshot.inventory.map(cloneItem);
    if(snapshot.hadEssence)player.banishmentEssence=snapshot.essence;
    else delete player.banishmentEssence;
  }

  function tradeArtefactsForFlask(){
    const PGR=progression(),player=currentPlayer();
    if(!PGR||!player)return false;
    const need=Math.max(1,Math.floor(Number(window.CCG_CONFIG?.stalker?.flaskArtefacts)||3));
    const physicalHave=physicalArtefactCount(player);
    const essenceHave=nonNegativeInt(player.banishmentEssence);
    const have=physicalHave+essenceHave;
    if(have<need){
      diagnostics.insufficient++;
      try{showToast("NOT ENOUGH ARTEFACTS",`The Flask costs ${need} artefacts. You have ${have}.`,"red",6000)}catch(_){}
      return false;
    }

    /*
      V10.42 stores newly collected Artefacts as banishmentEssence, while older
      saves and compatibility fixtures can still contain physical Artefact
      stacks in inventory. Treat both as spendable without converting one model
      into the other. Spend physical Artefacts first so an exact full stack can
      free the destination slot, then use essence for any remaining cost.
      Snapshot both stores so a failed Flask insertion restores the transaction
      exactly instead of routing legacy Artefacts through the V10.42 essence
      inventory wrapper during rollback.
    */
    const snapshot=snapshotPaymentState(player);
    let remaining=need;
    while(remaining>0&&physicalArtefactCount(player)>0){
      const slot=PGR.firstInventory(player,"artefact");
      if(slot<0){restorePaymentState(player,snapshot);diagnostics.rollbacks++;return false}
      const item=PGR.inventoryRemove(player,slot,1);
      if(!item){restorePaymentState(player,snapshot);diagnostics.rollbacks++;return false}
      remaining--;
    }
    if(remaining>0){
      const available=nonNegativeInt(player.banishmentEssence);
      const spent=Math.min(available,remaining);
      player.banishmentEssence=available-spent;
      remaining-=spent;
    }
    if(remaining>0){restorePaymentState(player,snapshot);diagnostics.rollbacks++;return false}

    const flask={kind:"banishment",name:"Banishment Flask",short:"BANISH"};
    if(!PGR.inventoryAdd(player,flask)){
      restorePaymentState(player,snapshot);diagnostics.rollbacks++;
      try{showToast("INVENTORY FULL","The Flask still needs a free slot. Your Artefacts were not spent.","red",6000)}catch(_){}
      return false;
    }

    diagnostics.trades++;
    try{S.sfx("shrine")}catch(_){}
    try{showToast("BANISHMENT FLASK ACQUIRED",`${need} artefacts exchanged. The 10 Gold purchase remains available separately.`,"gold",8000)}catch(_){}
    try{if(host)host.revision++;broadcastWorld();renderShop();sync()}catch(_){}
    return true;
  }

  function install(){
    const foundation=window.CCGDungeonProgressionFoundation;
    if(!foundation?.ready){diagnostics.installWaits++;return false}
    try{
      const liveOwner=currentShopOwner();
      if(!liveOwner)return false;
      if(liveOwner.__ccgArtefactShopStability){installed=true;return true}

      /*
        Later ordered modules (notably R1 shop-counter stability) legitimately
        wrap buyShopItem after this module first loads. A historical `installed`
        flag therefore cannot prove that the live purchase boundary still reaches
        the Artefact exchange. Re-wrap the current live owner whenever that
        boundary has been displaced; non-Flask purchases continue through the
        latest owner chain unchanged.
      */
      const base=liveOwner;
      const wrapped=function(id,...args){
        if(String(id)==="banishment")return tradeArtefactsForFlask();
        return base.call(this,id,...args);
      };
      wrapped.__ccgArtefactShopStability=true;
      wrapped.__ccgOriginal=base;
      buyShopItem=wrapped;
      if(installed)diagnostics.rebinds++;
      installed=true;diagnostics.installs++;
      return true;
    }catch(_){return false}
  }

  function stopInstaller(){if(installTimer){clearInterval(installTimer);installTimer=0}}
  if(!install()){
    installTimer=setInterval(()=>{if(install())stopInstaller()},60);
    setTimeout(stopInstaller,12000);
  }
  addEventListener("ccg:v142-ready",()=>{queueMicrotask(()=>{install();stopInstaller()})},{once:true});
  addEventListener("pagehide",stopInstaller,{once:true});

  window.CCGLostSizzlerV142ArtefactShopStability=Object.freeze({
    version:"V10.42-artefact-shop-stability",
    diagnostics,
    install,
    tradeArtefactsForFlask,
    isInstalled:()=>installed&&ownsCurrentBoundary()
  });
})();
