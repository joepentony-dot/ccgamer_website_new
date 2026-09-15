/* C64 Dungeon Carnage — Gold economy and non-destructive weapon progression foundation. */
(()=>{
  "use strict";
  if(window.__CCG_DUNGEON_PROGRESSION_FOUNDATION__)return;
  window.__CCG_DUNGEON_PROGRESSION_FOUNDATION__=true;

  const PGR=window.CCGProgression;
  if(!PGR){console.warn("[C64 Dungeon Carnage] progression foundation skipped: CCGProgression unavailable");return}

  const GOLD=Object.freeze({shopBase:2,shopStep:1,banishment:10,coin:1,treasureBat:5});
  const state={helpersInstalled:false,runtimeInstalled:false,shopPurchases:0,weaponAcquisitions:0,weaponSwitches:0,coinAwards:0,treasureBatAwards:0};
  const clone=value=>{try{return value==null?value:JSON.parse(JSON.stringify(value))}catch(_){return value&&typeof value==="object"?{...value}:value}};
  const nonNegativeInt=value=>Math.max(0,Math.floor(Number(value)||0));

  function goldBalance(runState){return nonNegativeInt(runState?.gold)}
  function ensureRunGold(runState){if(runState&&goldBalance(runState)!==runState.gold)runState.gold=goldBalance(runState);return goldBalance(runState)}
  function canAffordGold(runState,amount){return goldBalance(runState)>=nonNegativeInt(amount)}
  function earnGold(runState,amount){if(!runState)return 0;const gain=nonNegativeInt(amount);runState.gold=goldBalance(runState)+gain;return gain}
  function spendGold(runState,amount){if(!runState)return false;const cost=nonNegativeInt(amount);if(!canAffordGold(runState,cost))return false;runState.gold=goldBalance(runState)-cost;return true}
  function shopGoldPrice(shop){const purchases=nonNegativeInt(shop?.goldPurchases??shop?.scorePurchases);return GOLD.shopBase+purchases*GOLD.shopStep}
  function creditGoldValue(item){if(!item||item.kind!=="credits")return 0;const explicit=Number(item.goldValue);return Number.isFinite(explicit)&&explicit>0?Math.max(1,Math.floor(explicit)):GOLD.coin}

  function weaponIdentity(weapon){
    if(!weapon)return"";
    return JSON.stringify([
      weapon.id||weapon.name||"weapon",weapon.displayName||weapon.name||"",weapon.rarity||"",
      Number(weapon.rating||0),Number(weapon.power||0),Number(weapon.delay||0),Number(weapon.shots||1),
      Number(weapon.pierce||0),weapon.element||"",...(Array.isArray(weapon.mods)?weapon.mods:[])
    ])
  }
  function cloneWeapon(weapon){const copy=clone(weapon);if(copy&&Array.isArray(weapon?.mods))copy.mods=[...weapon.mods];return copy}
  function normaliseWeaponOwnership(player){
    if(!player)return[];
    const owned=[];
    for(const raw of Array.isArray(player.ownedWeapons)?player.ownedWeapons:[]){
      const weapon=cloneWeapon(raw),key=weaponIdentity(weapon);
      if(weapon&&key&&!owned.some(row=>weaponIdentity(row)===key))owned.push(weapon);
    }
    if(player.firearmUnlocked!==false&&player.weapon){
      const current=cloneWeapon(player.weapon),key=weaponIdentity(current);
      if(key&&!owned.some(row=>weaponIdentity(row)===key))owned.push(current);
    }
    player.ownedWeapons=owned;
    let index=Number.isInteger(player.activeWeaponIndex)?player.activeWeaponIndex:-1;
    if(player.weapon){const key=weaponIdentity(player.weapon),found=owned.findIndex(row=>weaponIdentity(row)===key);if(found>=0)index=found}
    if(player.firearmUnlocked===false){index=-1;player.weapon=null}
    else if(owned.length&&(index<0||index>=owned.length))index=0;
    else if(!owned.length)index=-1;
    player.activeWeaponIndex=index;
    if(index>=0)player.weapon=cloneWeapon(owned[index]);
    return owned;
  }
  function rememberWeapon(player,weapon,{equip=true}={}){
    if(!player||!weapon)return null;
    const owned=normaliseWeaponOwnership(player),copy=cloneWeapon(weapon),key=weaponIdentity(copy);
    let index=owned.findIndex(row=>weaponIdentity(row)===key);
    if(index<0){owned.push(copy);index=owned.length-1}
    player.ownedWeapons=owned;player.firearmUnlocked=true;
    if(equip){player.activeWeaponIndex=index;player.weapon=cloneWeapon(owned[index])}
    return cloneWeapon(owned[index]);
  }
  function equipOwnedWeapon(player,index){
    if(!player)return null;
    const owned=normaliseWeaponOwnership(player),target=Math.floor(Number(index));
    if(!Number.isFinite(target)||target<0||target>=owned.length)return null;
    player.firearmUnlocked=true;player.activeWeaponIndex=target;player.weapon=cloneWeapon(owned[target]);state.weaponSwitches++;
    return cloneWeapon(player.weapon);
  }
  function awardTreasureBatGold(enemy,runState,amount=GOLD.treasureBat){
    if(!enemy?.treasureBat||enemy._ccgTreasureBatGoldAwarded)return 0;
    enemy._ccgTreasureBatGoldAwarded=true;
    const gained=earnGold(runState,amount);if(gained)state.treasureBatAwards++;
    return gained;
  }

  function installHelpers(){
    if(state.helpersInstalled)return;
    state.helpersInstalled=true;
    Object.assign(PGR,{GOLD,goldBalance,ensureRunGold,canAffordGold,earnGold,spendGold,shopGoldPrice,creditGoldValue,weaponIdentity,cloneWeapon,normaliseWeaponOwnership,rememberWeapon,equipOwnedWeapon,awardTreasureBatGold});

    if(typeof PGR.makeRun==="function"&&!PGR.makeRun.__ccgGoldFoundation){
      const base=PGR.makeRun;
      const wrapped=function(...args){const made=base.apply(this,args);if(made)made.gold=goldBalance(made);return made};
      wrapped.__ccgGoldFoundation=true;wrapped.__ccgOriginal=base;PGR.makeRun=wrapped;
    }
    if(typeof PGR.loadCheckpoint==="function"&&!PGR.loadCheckpoint.__ccgGoldFoundation){
      const base=PGR.loadCheckpoint;
      const wrapped=function(...args){
        const data=base.apply(this,args);if(!data)return data;
        if(data.run)ensureRunGold(data.run);
        if(isDungeonMode()&&data.player)normaliseWeaponOwnership(data.player);
        if(isDungeonMode()&&data.player2)normaliseWeaponOwnership(data.player2);
        return data;
      };
      wrapped.__ccgGoldFoundation=true;wrapped.__ccgOriginal=base;PGR.loadCheckpoint=wrapped;
    }
    if(typeof PGR.makeCheckpoint==="function"&&!PGR.makeCheckpoint.__ccgGoldFoundation){
      const base=PGR.makeCheckpoint;
      const wrapped=function(runState,player,player2,...rest){ensureRunGold(runState);if(isDungeonMode()){normaliseWeaponOwnership(player);normaliseWeaponOwnership(player2)}return base.call(this,runState,player,player2,...rest)};
      wrapped.__ccgGoldFoundation=true;wrapped.__ccgOriginal=base;PGR.makeCheckpoint=wrapped;
    }
  }

  function currentRun(){try{return typeof run!=="undefined"?run:null}catch(_){return null}}
  function currentP1(){try{return typeof p1!=="undefined"?p1:null}catch(_){return null}}
  function currentP2(){try{return typeof p2!=="undefined"?p2:null}catch(_){return null}}
  function isDungeonMode(){
    try{
      const special=String(window.CCGLostSizzlerSpecialModes?.active?.type||document.body?.dataset?.specialMode||"");
      return special!=="horde-survivor"&&special!=="sizzler-saboteurs";
    }catch(_){return true}
  }

  function ensureGoldHud(){
    let node=document.getElementById("hud-gold");if(node)return node;
    const score=document.getElementById("hud-score"),stat=score?.closest?.(".hub-stat");if(!stat?.parentElement)return null;
    const wrap=stat.cloneNode(true),label=wrap.querySelector("span"),value=wrap.querySelector("b");
    if(label)label.textContent="GOLD";
    if(value){value.id="hud-gold";value.textContent="0"}
    stat.insertAdjacentElement("afterend",wrap);return value;
  }
  function syncGoldHud(){const node=ensureGoldHud(),runState=currentRun();if(node)node.textContent=String(goldBalance(runState))}

  function textReplacementPairs(){return [
    [/pay 10,000 score at a shop/gi,"pay 10 Gold at a shop"],
    [/10,000 SCORE/gi,"10 GOLD"],
    [/Normal score stock can be bought repeatedly[^.]*\./gi,"Gold buys repeatable supplies here; each standard purchase raises this shop's next price by 1 Gold."],
    [/Normal score items can be bought repeatedly\.[\s\S]*?Stock:/gi,"Standard stock starts at 2 Gold and rises by 1 Gold after each purchase at that shop: 2, 3, 4, 5... Stock:"],
    [/Gold score coin/gi,"Gold coin"],
    [/Score buys supplies/gi,"Gold buys supplies"],
    [/Score works too/gi,"Gold works too"],
    [/two currencies: score at the quartermaster, rare artefacts at the hidden trader/gi,"two resources: Gold at the quartermaster, rare artefacts at the hidden trader"]
  ]}
  function replaceProgressionCopy(text){let next=String(text??"");for(const [pattern,value] of textReplacementPairs())next=next.replace(pattern,value);return next}
  function patchCopy(){
    const roots=document.querySelectorAll(".reference-tip,.feature-strip,#shop-panel,#rulebook-panel,#developer-changelog");
    for(const root of roots){
      const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let node;
      while((node=walker.nextNode())){const next=replaceProgressionCopy(node.nodeValue);if(next!==node.nodeValue)node.nodeValue=next}
    }
  }
  function installToastCopy(){
    try{
      if(typeof showToast!=="function"||showToast.__ccgProgressionFoundation)return;
      const base=showToast;
      showToast=function(title,text,...rest){return base.call(this,title,isDungeonMode()?replaceProgressionCopy(text):text,...rest)};
      showToast.__ccgProgressionFoundation=true;showToast.__ccgOriginal=base;
    }catch(_){}
  }

  function installPlayerOwnership(){
    try{
      if(typeof makePlayer==="function"&&!makePlayer.__ccgProgressionFoundation){
        const base=makePlayer;
        makePlayer=function(...args){const player=base.apply(this,args);if(isDungeonMode())normaliseWeaponOwnership(player);return player};
        makePlayer.__ccgProgressionFoundation=true;makePlayer.__ccgOriginal=base;
      }
    }catch(_){}
    try{
      if(typeof preservePlayer==="function"&&!preservePlayer.__ccgProgressionFoundation){
        const base=preservePlayer;
        preservePlayer=function(old,...args){
          const prior=old?{ownedWeapons:(old.ownedWeapons||[]).map(cloneWeapon),activeWeaponIndex:old.activeWeaponIndex,weapon:cloneWeapon(old.weapon),firearmUnlocked:old.firearmUnlocked}:null;
          const player=base.call(this,old,...args);
          if(prior&&player&&isDungeonMode()){player.ownedWeapons=prior.ownedWeapons;player.activeWeaponIndex=prior.activeWeaponIndex;if(prior.weapon)player.weapon=prior.weapon;if(prior.firearmUnlocked!==undefined)player.firearmUnlocked=prior.firearmUnlocked;normaliseWeaponOwnership(player)}
          return player;
        };
        preservePlayer.__ccgProgressionFoundation=true;preservePlayer.__ccgOriginal=base;
      }
    }catch(_){}
    if(isDungeonMode()){normaliseWeaponOwnership(currentP1());normaliseWeaponOwnership(currentP2())}
  }

  function installWeaponAcquisition(){
    try{
      if(typeof equipWeapon!=="function"||equipWeapon.__ccgProgressionFoundation)return;
      const base=equipWeapon;
      equipWeapon=function(player,weapon,...rest){
        const previous=player?.weapon?cloneWeapon(player.weapon):null;
        const result=base.call(this,player,weapon,...rest);
        if(player&&isDungeonMode()){
          if(previous)rememberWeapon(player,previous,{equip:false});
          if(player.weapon||weapon)rememberWeapon(player,player.weapon||weapon,{equip:true});
          state.weaponAcquisitions++;
        }
        return result;
      };
      equipWeapon.__ccgProgressionFoundation=true;equipWeapon.__ccgOriginal=base;
    }catch(_){}
  }

  function installCredits(){
    try{
      if(typeof applyItem!=="function"||applyItem.__ccgProgressionFoundation)return;
      const base=applyItem;
      applyItem=function(item,player,...rest){
        if(item?.kind!=="credits"||!isDungeonMode())return base.call(this,item,player,...rest);
        const runState=currentRun();if(!runState)return base.call(this,item,player,...rest);
        if(item._ccgGoldAwarded)return base.call(this,item,player,...rest);
        let beforeScore=0;try{beforeScore=Number(score||0)}catch(_){}
        const result=base.call(this,item,player,...rest);
        try{score=beforeScore}catch(_){}
        if(result===false)return result;
        item._ccgGoldAwarded=true;
        const multiplier=String(runState.rareMutation||"").toUpperCase()==="DOUBLE GOLD"?2:1;
        const gained=earnGold(runState,creditGoldValue(item)*multiplier);state.coinAwards+=gained;
        try{showToast(multiplier>1?"DOUBLE GOLD":"GOLD COIN",`+${gained} Gold. Total: ${goldBalance(runState)}. Score is unchanged.`,"gold",5200);syncGoldHud()}catch(_){}
        return result;
      };
      applyItem.__ccgProgressionFoundation=true;applyItem.__ccgOriginal=base;
    }catch(_){}
  }

  function installTreasureBatReward(){
    try{
      if(typeof damageEnemy!=="function"||damageEnemy.__ccgProgressionFoundation)return;
      const base=damageEnemy;
      damageEnemy=function(enemy,...args){
        const wasAlive=Boolean(enemy?.alive),isBat=Boolean(enemy?.treasureBat);
        const result=base.call(this,enemy,...args);
        if(wasAlive&&isBat&&enemy?.alive===false&&isDungeonMode()){
          const gained=awardTreasureBatGold(enemy,currentRun());
          if(gained)try{showToast("TREASURE BAT DOWN",`+${gained} Gold awarded once. Its existing score reward and prize chest are preserved.`,"gold",7000);syncGoldHud()}catch(_){}
        }
        return result;
      };
      damageEnemy.__ccgProgressionFoundation=true;damageEnemy.__ccgOriginal=base;
    }catch(_){}
  }

  function renderGoldShop(){
    if(!activeShop||!currentP1()||!UI?.shopItems)return false;
    const player=currentP1(),runState=currentRun();ensureRunGold(runState);
    const artefacts=PGR.inventoryKindCount(player,"artefact"),price=shopGoldPrice(activeShop),sold=activeShop.sold||{},inventoryFull=PGR.inventoryCapacity(player)>=C.player.inventorySlots;
    UI.shopTitle.textContent=activeShop.title||"DUNGEON SUPPLY SHOP";
    UI.shopCopy.textContent=activeShop.shopType==="hidden"?"Hidden trader. Gold buys repeatable supplies; rare artefacts can still be exchanged for a Banishment Flask.":"Quartermaster. Gold buys repeatable supplies; each standard purchase raises this shop's next price by 1 Gold.";
    UI.shopScore.textContent=String(goldBalance(runState));
    const scoreLabel=UI.shopScore.parentElement;if(scoreLabel)scoreLabel.firstChild.textContent="GOLD ";
    UI.shopArtefacts.textContent=String(artefacts);UI.shopNextPrice.textContent=String(price);
    const nextLabel=UI.shopNextPrice.parentElement;if(nextLabel)nextLabel.firstChild.textContent="NEXT GOLD PRICE ";
    const defs=[
      {id:"banishment",name:"BANISHMENT FLASK · ARTEFACT TRADE",kind:"banishment",price:`${C.stalker.flaskArtefacts} ARTEFACTS`,desc:"Exchange rare artefacts for one Flask. Repeat whenever you have enough artefacts.",sold:false},
      {id:"banishmentGold",name:"BANISHMENT FLASK · GOLD",kind:"banishment",price:`${GOLD.banishment} GOLD`,desc:"Buy one Flask at this shop for a fixed Gold price. This does not raise the standard stock price.",sold:Boolean(sold.banishmentGold||sold.banishmentScore)},
      {id:"potion",name:"RESTORATION POTION",kind:"potion",price:`${price} GOLD`,desc:"Adds one Health Potion to the Potion stack.",sold:false},
      {id:"torch",name:"FLAMING TORCH",kind:"torch",price:`${price} GOLD`,desc:"Adds one Torch when inventory space allows.",sold:false},
      {id:"bronze",name:"BRONZE KEY",kind:"bronze",price:`${price} GOLD`,desc:"Adds one optional Bronze Key for locked side doors or chests.",sold:false},
      {id:"teleport",name:"TELEPORT SPELL",kind:"teleport",price:`${price} GOLD`,desc:"Adds one safe-room Teleport Spell.",sold:false},
      {id:"inventorySlot",name:"INVENTORY SLOT",kind:"inventorySlot",price:`${price} GOLD`,desc:`Expands this run's inventory by one slot, up to ${C.player.inventorySlots}.`,sold:inventoryFull,maxed:inventoryFull},
      {id:"ammo",name:"AMMO CRATE",kind:"ammo",price:`${price} GOLD`,desc:"Restores 50 ammunition immediately.",sold:false},
      {id:"armour",name:"ARMOUR REPAIR",kind:"armour",price:`${price} GOLD`,desc:"Adds 3 armour immediately, up to the normal armour limit.",sold:false},
      {id:"weapon",name:"WEAPON CACHE",kind:"weapon",price:`${price} GOLD`,desc:"Rolls a fresh firearm and keeps previous firearms in your weapon collection.",sold:false}
    ];
    UI.shopItems.innerHTML=defs.map(d=>`<article class="shop-item ${d.sold?"sold":""}"><div class="shop-item-icon">${itemIconSVG(d.kind,d.name)}</div><div><h3>${esc(d.name)}</h3><span class="price">${esc(d.price)}</span><p>${esc(d.desc)}</p><button data-shop-buy="${d.id}" ${d.sold?"disabled":""}>${d.maxed?"MAXIMUM REACHED":d.sold?"SOLD / TRADED":"BUY / TRADE"}</button></div></article>`).join("");
    UI.shopItems.querySelectorAll?.("[data-shop-buy]").forEach(button=>button.addEventListener("click",()=>buyShopItem(button.dataset.shopBuy)));
    return true;
  }

  function buyGoldShopItem(id){
    const player=currentP1(),runState=currentRun();if(!activeShop||!player||!runState)return false;
    ensureRunGold(runState);activeShop.sold=activeShop.sold||{};
    if(id==="banishment"||id==="banishmentGold"||id==="banishmentScore"){
      const forGold=id!=="banishment",need=C.stalker.flaskArtefacts,have=PGR.inventoryKindCount(player,"artefact");
      if(forGold&&(activeShop.sold.banishmentGold||activeShop.sold.banishmentScore))return false;
      if(forGold&&!canAffordGold(runState,GOLD.banishment)){showToast("NOT ENOUGH GOLD",`The Flask costs ${GOLD.banishment} Gold. You have ${goldBalance(runState)}.`,"red",6000);return false}
      if(!forGold&&have<need){showToast("NOT ENOUGH ARTEFACTS",`The Flask costs ${need} artefacts. You have ${have}.`,"red",6000);return false}
      if(!PGR.inventoryCanAdd(player,{kind:"banishment"})){showToast("INVENTORY FULL","The Flask needs a slot unless you already carry a Banishment stack.","red",6000);return false}
      if(forGold){if(!spendGold(runState,GOLD.banishment))return false;activeShop.sold.banishmentGold=true;delete activeShop.sold.banishmentScore}
      else for(let i=0;i<need;i++){const index=PGR.firstInventory(player,"artefact");if(index>=0)PGR.inventoryRemove(player,index)}
      PGR.inventoryAdd(player,{kind:"banishment",name:"Banishment Flask",short:"BANISH"});
      S.sfx("shrine");showToast("BANISHMENT FLASK ACQUIRED",forGold?`${GOLD.banishment} Gold paid. The artefact exchange remains available.`:`${need} artefacts exchanged.`,"gold",8000);
    }else{
      const allowed=new Set(["potion","torch","bronze","teleport","inventorySlot","ammo","armour","weapon"]);if(!allowed.has(id))return false;
      const price=shopGoldPrice(activeShop);
      if(id==="inventorySlot"&&PGR.inventoryCapacity(player)>=C.player.inventorySlots){showToast("INVENTORY FULLY EXPANDED",`All ${C.player.inventorySlots} inventory slots are already open.`,"cyan",5200);return false}
      if(!canAffordGold(runState,price)){showToast("NOT ENOUGH GOLD",`${id.toUpperCase()} costs ${price} Gold. You have ${goldBalance(runState)}.`,"red",6000);return false}
      if(["potion","torch","teleport"].includes(id)&&!PGR.inventoryCanAdd(player,{kind:id})){showToast("INVENTORY FULL",`The ${id} cannot fit under its stack rule. Free or expand a slot.`,"red",6000);return false}
      if(!spendGold(runState,price))return false;
      let boughtName=id.toUpperCase();
      if(id==="potion"){PGR.inventoryAdd(player,{kind:"potion",name:"Restoration Potion",short:"POTION"});boughtName="Restoration Potion"}
      else if(id==="torch"){PGR.inventoryAdd(player,{kind:"torch",name:"Flaming Torch",short:"TORCH"});boughtName="Flaming Torch"}
      else if(id==="bronze"){player.bronzeKeys=nonNegativeInt(player.bronzeKeys)+1;boughtName=`Bronze Key (${player.bronzeKeys} carried)`}
      else if(id==="teleport"){PGR.inventoryAdd(player,{kind:"teleport",name:"Teleport Spell",short:"WARP"});boughtName="Teleport Spell"}
      else if(id==="inventorySlot"){player.inventorySlots=Math.min(C.player.inventorySlots,PGR.inventoryCapacity(player)+1);boughtName=`Inventory Expansion (${player.inventorySlots} slots)`}
      else if(id==="ammo"){const before=player.mana;player.mana=Math.min(player.maxMana,player.mana+50);player.ammoFlashMs=C.player.ammoFlashMs;boughtName=`Ammo Crate (+${player.mana-before})`}
      else if(id==="armour"){const before=player.armor||0;player.armor=Math.min(12,before+3);boughtName=`Armour Repair (+${player.armor-before})`}
      else if(id==="weapon"){const weapon=PGR.generateWeapon(6+(runState.floor||1)*2,runState.floor||1,Math.random,.08);equipWeapon(player,weapon);boughtName=weapon.displayName||"Weapon Cache"}
      activeShop.goldPurchases=nonNegativeInt(activeShop.goldPurchases??activeShop.scorePurchases)+1;delete activeShop.scorePurchases;state.shopPurchases++;
      S.sfx("pickup");showToast("SHOP PURCHASE",`${boughtName} purchased for ${price} Gold. Next standard item: ${shopGoldPrice(activeShop)} Gold.`,"green",7200);
    }
    try{host.revision++;broadcastWorld();renderGoldShop();sync();syncGoldHud()}catch(_){}
    return true;
  }

  function installShop(){
    try{
      const basePrice=typeof shopScorePrice==="function"?shopScorePrice:null;
      shopScorePrice=function(shop){return isDungeonMode()?shopGoldPrice(shop):basePrice?basePrice.call(this,shop):shopGoldPrice(shop)};
      shopScorePrice.__ccgProgressionFoundation=true;shopScorePrice.__ccgOriginal=basePrice;
    }catch(_){}
    try{
      const baseRender=typeof renderShop==="function"?renderShop:null,baseBuy=typeof buyShopItem==="function"?buyShopItem:null;
      renderShop=function(...args){return isDungeonMode()?renderGoldShop():baseRender?baseRender.apply(this,args):false};renderShop.__ccgProgressionFoundation=true;renderShop.__ccgOriginal=baseRender;
      buyShopItem=function(id,...args){return isDungeonMode()?buyGoldShopItem(id):baseBuy?baseBuy.call(this,id,...args):false};buyShopItem.__ccgProgressionFoundation=true;buyShopItem.__ccgOriginal=baseBuy;
    }catch(error){console.warn("[C64 Dungeon Carnage] Gold shop install failed safely",error)}
  }

  function installInventorySwitching(){
    try{
      if(typeof renderInventoryPanel!=="function"||renderInventoryPanel.__ccgProgressionFoundation)return;
      const base=renderInventoryPanel;
      renderInventoryPanel=function(...args){
        const player=currentP1(),dungeon=isDungeonMode();if(dungeon)normaliseWeaponOwnership(player);const result=base.apply(this,args);
        if(!player||!dungeon)return result;
        const load=document.getElementById("inventory-loadout"),owned=player.ownedWeapons||[];if(!load)return result;
        load.querySelector(".ccg-owned-weapons")?.remove();
        const panel=document.createElement("div");panel.className="ccg-owned-weapons slot-actions";
        panel.innerHTML=owned.length?`<b>OWNED FIREARMS · ${owned.length}</b>${owned.map((weapon,index)=>`<button type="button" data-ccg-equip-weapon="${index}" ${index===player.activeWeaponIndex?"disabled":""}>${index===player.activeWeaponIndex?"EQUIPPED":"EQUIP"} · ${esc(weapon.displayName||weapon.name||`WEAPON ${index+1}`)}</button>`).join("")}`:"<b>OWNED FIREARMS · NONE</b>";
        panel.querySelectorAll("[data-ccg-equip-weapon]").forEach(button=>button.addEventListener("click",()=>{
          const selected=equipOwnedWeapon(player,Number(button.dataset.ccgEquipWeapon));if(!selected)return;
          try{S.sfx("weapon");showToast("WEAPON EQUIPPED",selected.displayName||selected.name||"Firearm","cyan",4200);if(typeof sendPlayer==="function")sendPlayer();sync();renderInventoryPanel()}catch(_){}
        }));
        load.appendChild(panel);return result;
      };
      renderInventoryPanel.__ccgProgressionFoundation=true;renderInventoryPanel.__ccgOriginal=base;
    }catch(_){}
  }

  function installNetworkOwnership(){
    try{
      if(typeof playerStateForNetwork==="function"&&!playerStateForNetwork.__ccgProgressionFoundation){
        const base=playerStateForNetwork;
        playerStateForNetwork=function(player,...args){
          const payload=base.call(this,player,...args)||{};if(!isDungeonMode())return payload;normaliseWeaponOwnership(player);
          payload.ownedWeapons=(player?.ownedWeapons||[]).map(cloneWeapon);payload.activeWeaponIndex=Number.isInteger(player?.activeWeaponIndex)?player.activeWeaponIndex:-1;return payload;
        };
        playerStateForNetwork.__ccgProgressionFoundation=true;playerStateForNetwork.__ccgOriginal=base;
      }
    }catch(_){}
    try{
      if(net?.cb?.onPacket&&!net.cb.onPacket.__ccgProgressionFoundation){
        const base=net.cb.onPacket;
        const wrapped=function(event,payload,...rest){
          const result=base.call(this,event,payload,...rest);
          if(isDungeonMode()&&event==="v131_player_state"&&payload?.target===net.sessionId&&payload?.state&&currentP1()){
            const player=currentP1();if(Array.isArray(payload.state.ownedWeapons))player.ownedWeapons=payload.state.ownedWeapons.map(cloneWeapon);if(Number.isInteger(payload.state.activeWeaponIndex))player.activeWeaponIndex=payload.state.activeWeaponIndex;normaliseWeaponOwnership(player);
          }
          return result;
        };
        wrapped.__ccgProgressionFoundation=true;wrapped.__ccgOriginal=base;net.cb.onPacket=wrapped;
      }
    }catch(_){}
  }

  function installSync(){
    try{
      if(typeof sync==="function"&&!sync.__ccgProgressionFoundation){
        const base=sync;
        sync=function(...args){const result=base.apply(this,args);if(isDungeonMode()){ensureRunGold(currentRun());normaliseWeaponOwnership(currentP1());normaliseWeaponOwnership(currentP2());syncGoldHud()}return result};
        sync.__ccgProgressionFoundation=true;sync.__ccgOriginal=base;
      }
    }catch(_){}
  }

  function installRuntime(){
    if(state.runtimeInstalled)return true;
    if(!PGR||typeof document==="undefined")return false;
    state.runtimeInstalled=true;
    installPlayerOwnership();installWeaponAcquisition();installCredits();installTreasureBatReward();installShop();installInventorySwitching();installNetworkOwnership();installToastCopy();installSync();
    if(isDungeonMode()){ensureRunGold(currentRun());normaliseWeaponOwnership(currentP1());normaliseWeaponOwnership(currentP2());patchCopy();syncGoldHud()}
    window.CCGDungeonProgressionFoundation.ready=true;
    return true;
  }

  installHelpers();
  window.CCGDungeonProgressionFoundation={ready:false,state,GOLD,goldBalance,ensureRunGold,canAffordGold,earnGold,spendGold,shopGoldPrice,creditGoldValue,weaponIdentity,cloneWeapon,normaliseWeaponOwnership,rememberWeapon,equipOwnedWeapon,awardTreasureBatGold,installRuntime,renderGoldShop,buyGoldShopItem};
  if(document.body?.dataset?.releaseReady==="true")queueMicrotask(installRuntime);
  else addEventListener("ccg:v142-ready",installRuntime,{once:true});
  const fallback=setInterval(()=>{if(state.runtimeInstalled||document.body?.dataset?.releaseReady!=="true")return;if(installRuntime())clearInterval(fallback)},120);
  setTimeout(()=>clearInterval(fallback),12000);
})();
