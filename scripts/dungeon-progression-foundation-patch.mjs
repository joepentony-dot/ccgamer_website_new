import fs from "node:fs";
import path from "node:path";

const ROOT=process.cwd();
const read=file=>fs.readFileSync(path.join(ROOT,file),"utf8");
const write=(file,text)=>fs.writeFileSync(path.join(ROOT,file),text);

function exact(file,from,to,count=1){
  let s=read(file),n=s.split(from).length-1;
  if(n!==count)throw new Error(`${file}: expected ${count} exact matches, got ${n}: ${from.slice(0,120)}`);
  s=s.split(from).join(to);write(file,s);
}
function atLeast(file,from,to,min=1){
  let s=read(file),n=s.split(from).length-1;
  if(n<min)throw new Error(`${file}: expected at least ${min} matches, got ${n}: ${from.slice(0,120)}`);
  s=s.split(from).join(to);write(file,s);return n;
}
function replaceLine(file,prefix,replacement,count=1){
  const lines=read(file).split("\n");let n=0;
  const out=[];
  for(const row of lines){if(row.startsWith(prefix)){n++;out.push(...replacement.split("\n"))}else out.push(row)}
  if(n!==count)throw new Error(`${file}: expected ${count} lines starting ${prefix}, got ${n}`);
  write(file,out.join("\n"));
}
function replaceBlock(file,start,end,replacement,count=1){
  let s=read(file),n=0,pos=0;
  while((pos=s.indexOf(start,pos))!==-1){n++;pos+=start.length}
  if(n!==count)throw new Error(`${file}: expected ${count} block starts, got ${n}: ${start}`);
  const a=s.indexOf(start),b=s.indexOf(end,a+start.length);
  if(a<0||b<0)throw new Error(`${file}: block boundary missing for ${start}`);
  s=s.slice(0,a)+replacement+s.slice(b);
  write(file,s);
}

const progression="arcade/lost-sizzler/js/progression.js";
exact(progression,
`  const rarityColour={"COMMON":"#c8c0d0","UNCOMMON":"#72ff9b","SIZZLER":"#6cecff","GOLD MEDAL":"#ffd85a","ZZAP! 97%":"#ff5bae"};`,
`  const rarityColour={"COMMON":"#c8c0d0","UNCOMMON":"#72ff9b","SIZZLER":"#6cecff","GOLD MEDAL":"#ffd85a","ZZAP! 97%":"#ff5bae"};
  const GOLD=Object.freeze({shopBase:2,shopStep:1,banishment:10,coin:1,treasureBat:5});
  function goldBalance(run){return Math.max(0,Math.floor(Number(run?.gold)||0))}
  function canAffordGold(run,amount){return goldBalance(run)>=Math.max(0,Math.floor(Number(amount)||0))}
  function earnGold(run,amount){if(!run)return 0;const gain=Math.max(0,Math.floor(Number(amount)||0));run.gold=goldBalance(run)+gain;return gain}
  function spendGold(run,amount){if(!run)return false;const cost=Math.max(0,Math.floor(Number(amount)||0));if(!canAffordGold(run,cost))return false;run.gold=goldBalance(run)-cost;return true}
  function shopGoldPrice(shop){const purchases=Math.max(0,Math.floor(Number(shop?.goldPurchases??shop?.scorePurchases??0)||0));return GOLD.shopBase+purchases*GOLD.shopStep}
  function creditGoldValue(item){if(!item||item.kind!=="credits")return 0;const explicit=Number(item.goldValue);if(Number.isFinite(explicit)&&explicit>0)return Math.max(1,Math.floor(explicit));const legacy=Number(item.scoreValue??item.value);if(Number.isFinite(legacy)&&legacy>0)return Math.max(1,Math.ceil(legacy/100));return GOLD.coin}
  function awardTreasureBatGold(enemy,run,amount=GOLD.treasureBat){if(!enemy?.treasureBat||enemy._treasureBatGoldAwarded)return 0;enemy._treasureBatGoldAwarded=true;return earnGold(run,amount)}
  function cloneWeapon(weapon){return weapon&&typeof weapon==="object"?{...weapon,mods:Array.isArray(weapon.mods)?[...weapon.mods]:[]}:null}
  function weaponIdentity(weapon){if(!weapon)return"";return JSON.stringify([weapon.id||weapon.name||"weapon",weapon.displayName||weapon.name||"",weapon.rarity||"",Number(weapon.rating||0),Number(weapon.power||0),Number(weapon.delay||0),Number(weapon.shots||1),Number(weapon.pierce||0),weapon.element||"",...(Array.isArray(weapon.mods)?weapon.mods:[])])}
  function normaliseWeaponOwnership(player){if(!player)return[];const owned=[];for(const weapon of Array.isArray(player.ownedWeapons)?player.ownedWeapons:[]){const copy=cloneWeapon(weapon),key=weaponIdentity(copy);if(copy&&key&&!owned.some(row=>weaponIdentity(row)===key))owned.push(copy)}if(player.weapon&&player.firearmUnlocked!==false){const key=weaponIdentity(player.weapon);if(key&&!owned.some(row=>weaponIdentity(row)===key))owned.push(cloneWeapon(player.weapon))}player.ownedWeapons=owned;let index=Number.isInteger(player.activeWeaponIndex)?player.activeWeaponIndex:-1;if(player.weapon){const key=weaponIdentity(player.weapon),found=owned.findIndex(row=>weaponIdentity(row)===key);if(found>=0)index=found}if(index<0||index>=owned.length)index=owned.length&&player.firearmUnlocked!==false?0:-1;player.activeWeaponIndex=index;if(index>=0)player.weapon=cloneWeapon(owned[index]);else if(player.firearmUnlocked===false)player.weapon=null;return owned}
  function acquireWeapon(player,weapon,{equip=true}={}){if(!player||!weapon)return null;const owned=normaliseWeaponOwnership(player),copy=cloneWeapon(weapon),key=weaponIdentity(copy);let index=owned.findIndex(row=>weaponIdentity(row)===key);if(index<0){owned.push(copy);index=owned.length-1}player.ownedWeapons=owned;player.firearmUnlocked=true;if(equip){player.activeWeaponIndex=index;player.weapon=cloneWeapon(owned[index])}return cloneWeapon(owned[index])}
  function equipOwnedWeapon(player,index){if(!player)return null;const owned=normaliseWeaponOwnership(player),i=Math.floor(Number(index));if(!Number.isFinite(i)||i<0||i>=owned.length)return null;player.firearmUnlocked=true;player.activeWeaponIndex=i;player.weapon=cloneWeapon(owned[i]);return cloneWeapon(player.weapon)}`);
exact(progression,`floor:1,maxFloors:C.maxFloors,difficulty,seed,daily:Boolean(opts.daily),score:0,alert:0,elapsed:0,`,`floor:1,maxFloors:C.maxFloors,difficulty,seed,daily:Boolean(opts.daily),score:0,gold:0,alert:0,elapsed:0,`);
exact(progression,
`  function loadCheckpoint(){try{const data=JSON.parse(localStorage.getItem(checkpointStorageKey)||"null");return data?.version==="V10.3"&&data.run&&data.player?data:null}catch(_){return null}}`,
`  function loadCheckpoint(){try{const data=JSON.parse(localStorage.getItem(checkpointStorageKey)||"null");if(data?.version!=="V10.3"||!data.run||!data.player)return null;data.run.gold=goldBalance(data.run);normaliseWeaponOwnership(data.player);if(data.player2)normaliseWeaponOwnership(data.player2);return data}catch(_){return null}}`);
exact(progression,`,roomCompletion,RARITY};`,`,roomCompletion,goldBalance,canAffordGold,earnGold,spendGold,shopGoldPrice,creditGoldValue,awardTreasureBatGold,cloneWeapon,weaponIdentity,normaliseWeaponOwnership,acquireWeapon,equipOwnedWeapon,GOLD,RARITY};`);

const core="arcade/lost-sizzler/js/game-core.js";
exact(core,`weapon:"Equips a randomized weapon/upgrade.",rapid:`,`weapon:"Adds a randomized firearm to your run collection and equips it. Previously owned firearms remain available to switch back to.",rapid:`);
exact(core,`credits:"Gold score coin.",chest:`,`credits:"Adds Gold used by dungeon shops. Score remains a separate leaderboard and run-performance value.",chest:`);
exact(core,`{kind:"credits",name:"GOLD SCORE COIN",desc:itemHelp("credits")}`,`{kind:"credits",name:"GOLD COIN",desc:itemHelp("credits")}`);
exact(core,`or buy one there for 10,000 score.`,`or buy one there for ${PGR.GOLD.banishment} Gold.`);
exact(core,`inventorySlots:C.player.startingInventorySlots||3,weapon:baseWeapon(),weaponLevel:1,`,`inventorySlots:C.player.startingInventorySlots||3,weapon:baseWeapon(),ownedWeapons:[],activeWeaponIndex:-1,weaponLevel:1,`);
exact(core,`"inventorySlots","weapon","weaponLevel","skills"`,`"inventorySlots","weapon","ownedWeapons","activeWeaponIndex","weaponLevel","skills"`);
exact(core,`p.torchMs=0;p.rapidMs=0;p.lastRoom=-99;return p}`,`p.torchMs=0;p.rapidMs=0;p.lastRoom=-99;PGR.normaliseWeaponOwnership(p);return p}`);
replaceLine(core,`function shopScorePrice(shop){`,`function shopGoldPrice(shop){return PGR.shopGoldPrice(shop)}`);
exact(core,`price=shopScorePrice(activeShop)`,`price=shopGoldPrice(activeShop)`);
exact(core,`"You found the hidden floor trader. Normal score stock can be bought repeatedly; this shop keeps its own doubling price ladder.":"Entrance supply desk. Normal score stock can be bought repeatedly, and this shop has a fresh doubling price ladder."`,`"You found the hidden floor trader. Gold buys repeatable supplies here; each standard purchase raises this shop's next price by 1 Gold.":"Entrance supply desk. Gold buys repeatable supplies here; each standard purchase raises this shop's next price by 1 Gold."`);
exact(core,`UI.shopScore.textContent=pad(score);`,`UI.shopScore.textContent=String(PGR.goldBalance(run));`);
exact(core,`{id:"banishmentScore",name:"BANISHMENT FLASK · SCORE",kind:"banishment",price:"10,000 SCORE",desc:"The same Flask bought for a fixed score price. One score purchase per shop; it does not change the normal shop price ladder.",sold:Boolean(sold.banishmentScore)},`,`{id:"banishmentGold",name:"BANISHMENT FLASK · GOLD",kind:"banishment",price:`+"`"+`${PGR.GOLD.banishment} GOLD`+"`"+`,desc:"The same Flask bought for a fixed Gold price. One Gold purchase per shop; it does not change the standard shop price ladder.",sold:Boolean(sold.banishmentGold||sold.banishmentScore)},`);
atLeast(core," SCORE`"," GOLD`");
exact(core,`  {id:"torch",name:"FLAMING TORCH",kind:"torch",price:`+"`"+`${price} GOLD`+"`"+`,desc:"Adds one Torch to the Torch stack. Buy again whenever an inventory slot is available.",sold:false},`,`  {id:"torch",name:"FLAMING TORCH",kind:"torch",price:`+"`"+`${price} GOLD`+"`"+`,desc:"Adds one Torch to the Torch stack. Buy again whenever an inventory slot is available.",sold:false},
  {id:"bronze",name:"BRONZE KEY",kind:"bronze",price:`+"`"+`${price} GOLD`+"`"+`,desc:"Adds one optional Bronze Key for locked side doors or chests. Main objectives never depend on these.",sold:false},`);
const buyShop=`function buyShopItem(id){
  if(!activeShop||!p1)return false;
  activeShop.sold=activeShop.sold||{};
  if(id==="banishment"||id==="banishmentGold"||id==="banishmentScore"){
    const forGold=id!=="banishment",need=C.stalker.flaskArtefacts,have=PGR.inventoryKindCount(p1,"artefact"),fixedPrice=PGR.GOLD.banishment;
    if(forGold&&(activeShop.sold.banishmentGold||activeShop.sold.banishmentScore))return false;
    if(forGold&&!PGR.canAffordGold(run,fixedPrice)){showToast("NOT ENOUGH GOLD",`+"`"+`The Flask costs ${fixedPrice.toLocaleString()} Gold. You currently have ${PGR.goldBalance(run).toLocaleString()}.`+"`"+`,"red",6000);return false}
    if(!forGold&&have<need){showToast("NOT ENOUGH ARTEFACTS",`+"`"+`The Flask costs ${need} artefacts. You have ${have}.`+"`"+`,"red",6000);return false}
    if(!PGR.inventoryCanAdd(p1,{kind:"banishment"})){showToast("INVENTORY FULL","The Flask needs a slot unless you already carry a Banishment stack.","red",6000);return false}
    if(forGold){if(!PGR.spendGold(run,fixedPrice))return false;activeShop.sold.banishmentGold=true;delete activeShop.sold.banishmentScore}else for(let i=0;i<need;i++){const ix=PGR.firstInventory(p1,"artefact");if(ix>=0)PGR.inventoryRemove(p1,ix)}
    PGR.inventoryAdd(p1,{kind:"banishment",name:"Banishment Flask",short:"BANISH"});S.sfx("shrine");showToast("BANISHMENT FLASK ACQUIRED",forGold?`+"`"+`${fixedPrice.toLocaleString()} Gold paid. The artefact exchange is still available at this shop.`+"`"+`:`+"`"+`${need} artefacts exchanged. This shop can repeat the trade whenever you bring ${need} more.`+"`"+`,"gold",8500)
  }else{
    const price=shopGoldPrice(activeShop),buyable=["potion","torch","bronze","teleport","inventorySlot","ammo","armour","weapon"];
    if(!buyable.includes(id))return false;
    if(id==="inventorySlot"&&PGR.inventoryCapacity(p1)>=C.player.inventorySlots){showToast("INVENTORY FULLY EXPANDED",`+"`"+`All ${C.player.inventorySlots} inventory slots are already open.`+"`"+`,"cyan",5200);return false}
    if(!PGR.canAffordGold(run,price)){showToast("NOT ENOUGH GOLD",`+"`"+`${id.toUpperCase()} costs ${price.toLocaleString()} Gold at this shop. You currently have ${PGR.goldBalance(run).toLocaleString()}.`+"`"+`,"red",6000);return false}
    if(["potion","torch","teleport"].includes(id)&&!PGR.inventoryCanAdd(p1,{kind:id})){showToast("INVENTORY FULL",`+"`"+`The ${id} cannot fit under its stack rule. Free or expand a slot.`+"`"+`,"red",6000);return false}
    if(!PGR.spendGold(run,price))return false;
    let boughtName=id.toUpperCase();
    if(id==="potion"){PGR.inventoryAdd(p1,{kind:"potion",name:"Restoration Potion",short:"POTION"});boughtName="Restoration Potion"}
    else if(id==="torch"){PGR.inventoryAdd(p1,{kind:"torch",name:"Flaming Torch",short:"TORCH"});boughtName="Flaming Torch"}
    else if(id==="bronze"){p1.bronzeKeys=Math.max(0,Number(p1.bronzeKeys||0))+1;boughtName=`+"`"+`Bronze Key (${p1.bronzeKeys} carried)`+"`"+`}
    else if(id==="teleport"){PGR.inventoryAdd(p1,{kind:"teleport",name:"Teleport Spell",short:"WARP"});boughtName="Teleport Spell"}
    else if(id==="inventorySlot"){p1.inventorySlots=Math.min(C.player.inventorySlots,PGR.inventoryCapacity(p1)+1);boughtName=`+"`"+`Inventory Expansion (${p1.inventorySlots} slots)`+"`"+`}
    else if(id==="ammo"){const before=p1.mana;p1.mana=Math.min(p1.maxMana,p1.mana+50);p1.ammoFlashMs=C.player.ammoFlashMs;boughtName=`+"`"+`Ammo Crate (+${p1.mana-before})`+"`"+`}
    else if(id==="armour"){const before=p1.armor||0;p1.armor=Math.min(12,before+3);boughtName=`+"`"+`Armour Repair (+${p1.armor-before})`+"`"+`}
    else if(id==="weapon"){const w=PGR.generateWeapon(6+(run.floor||1)*2,run.floor||1,Math.random,.08);equipWeapon(p1,w);boughtName=w.displayName||"Weapon Cache"}
    activeShop.goldPurchases=Math.max(0,Math.floor(Number(activeShop.goldPurchases??activeShop.scorePurchases??0)))+1;delete activeShop.scorePurchases;S.sfx("pickup");showToast("SHOP PURCHASE",`+"`"+`${boughtName} purchased for ${price.toLocaleString()} Gold. The next standard item at this shop costs ${shopGoldPrice(activeShop).toLocaleString()} Gold.`+"`"+`,"green",7500)
  }
  host.revision++;broadcastWorld();renderShop();sync();return true
}`;
replaceLine(core,"function buyShopItem(id){",buyShop);
exact(core,`  const explore=Math.round(PGR.roomCompletion(explored.get(p1.id)||new Set(),world)*100),weapon=p1.weapon||baseWeapon(),clue=`,`  const ownedWeapons=PGR.normaliseWeaponOwnership(p1),explore=Math.round(PGR.roomCompletion(explored.get(p1.id)||new Set(),world)*100),weapon=p1.weapon||baseWeapon(),clue=`);
replaceLine(core,`  const cap=PGR.floorLevelCap(run),atCap=p1.level>=cap,load=document.getElementById("inventory-loadout");if(load)load.innerHTML=`,`  const cap=PGR.floorLevelCap(run),atCap=p1.level>=cap,load=document.getElementById("inventory-loadout");if(load)load.innerHTML=`+"`"+`<b>PLAYER STATUS</b><span>LV ${p1.level}/${cap} FLOOR CAP • HP ${p1.health}/${p1.maxHealth} • ARM ${p1.armor} • AMMO ${p1.mana}/${p1.maxMana} • EARNED XP ${p1.totalXp||0} • ${atCap?"XP STOPPED AT CAP":`+"`"+`LEVEL XP ${p1.xp}/${PGR.xpNeed(p1.level)}`+"`"+`}</span><small>${esc(weapon.displayName||weapon.name)} • MAP ${explore}% • ${p1.torchMs>0?`+"`"+`TORCH ${Math.ceil(p1.torchMs/1000)}s`+"`"+`:"NO ACTIVE TORCH"}</small><div class="slot-actions weapon-switch-actions">${ownedWeapons.length?ownedWeapons.map((w,i)=>`+"`"+`<button data-equip-weapon="${i}" ${i===p1.activeWeaponIndex?"disabled":""}>${i===p1.activeWeaponIndex?"EQUIPPED":"EQUIP"} · ${esc(w.displayName||w.name||`+"`"+`WEAPON ${i+1}`+"`"+`)}</button>`+"`"+`).join(""):"<span>NO FIREARM OWNED</span>"}</div>`+"`"+``);
exact(core,`  const currentSlots=PGR.inventoryCapacity(p1);`,`  if(load)load.querySelectorAll?.("[data-equip-weapon]").forEach(button=>button.addEventListener("click",()=>{const selected=PGR.equipOwnedWeapon(p1,Number(button.dataset.equipWeapon));if(!selected)return;S.sfx("weapon");showToast("WEAPON EQUIPPED",selected.displayName||selected.name||"Weapon","cyan",4200);renderInventoryPanel();sync();if(typeof sendPlayer==="function")sendPlayer()}));
  const currentSlots=PGR.inventoryCapacity(p1);`);

const network="arcade/lost-sizzler/js/game-network.js";
exact(network,`inventory:Array.isArray(p.inventory)?p.inventory.map(x=>({...x})):old?.inventory||[],rx:`,`inventory:Array.isArray(p.inventory)?p.inventory.map(x=>({...x})):old?.inventory||[],ownedWeapons:Array.isArray(p.ownedWeapons)?p.ownedWeapons.map(x=>PGR.cloneWeapon(x)):old?.ownedWeapons||[],activeWeaponIndex:Number.isInteger(p.activeWeaponIndex)?p.activeWeaponIndex:old?.activeWeaponIndex??-1,rx:`);
exact(network,`inventorySlots:p.inventorySlots,weapon:p.weapon?{...p.weapon}:null,firearmUnlocked:Boolean(p.firearmUnlocked),`,`inventorySlots:p.inventorySlots,weapon:p.weapon?PGR.cloneWeapon(p.weapon):null,ownedWeapons:(p.ownedWeapons||[]).map(w=>PGR.cloneWeapon(w)),activeWeaponIndex:Number.isInteger(p.activeWeaponIndex)?p.activeWeaponIndex:-1,firearmUnlocked:Boolean(p.firearmUnlocked),`);
exact(network,`Trade 3 artefacts or pay 10,000 score at a shop for the Flask that destroys it.`,`Trade 3 artefacts or pay ${PGR.GOLD.banishment} Gold at a shop for the Flask that destroys it.`);
replaceLine(network,"function equipWeapon(p,weapon){",`function equipWeapon(p,weapon){const old=p.weapon,owned=PGR.acquireWeapon(p,weapon,{equip:true});if(!owned)return false;p.weaponLevel=Math.max(1,1+PGR.RARITY.indexOf(weapon.rarity));stats.weapons++;S.sfx("weapon");showToast(weapon.displayName,`+"`"+`${weapon.desc} ${weapon.mods?.length?`+"`"+`Modifiers: ${weapon.mods.join(", ")}.`+"`"+`:""} Element: ${weapon.element.toUpperCase()}.`+"`"+`,weapon.rarity==="GOLD MEDAL"?"gold":weapon.rarity==="ZZAP! 97%"?"red":"cyan",7200);if(old&&old.rating>weapon.rating)logEvent(`+"`"+`The higher-rated ${old.displayName} remains in your weapon collection.`+"`"+`,"cyan",6500);return true}`);
exact(network,`else if(i.kind==="credits"){score+=125;S.sfx("pickup");showToast("GOLD SCORE COIN","+125 score.","gold")}`,`else if(i.kind==="credits"){const value=PGR.creditGoldValue(i),gained=PGR.earnGold(run,value);S.sfx("pickup");showToast("GOLD COIN",`+"`"+`+${gained} Gold. Total: ${PGR.goldBalance(run)}.`+"`"+`,"gold")}`);

const play="arcade/lost-sizzler/js/game-play.js";
atLeast(play,"pay 10,000 score at a shop","pay 10 Gold at a shop");
atLeast(play,"HIDDEN GOLD SCORE COIN","HIDDEN GOLD COIN");

const systems="arcade/lost-sizzler/js/systems.js";
atLeast(systems,"scorePurchases:0","goldPurchases:0");
atLeast(systems,"Gold score coin.","Gold coin for dungeon shops.");
atLeast(systems,"TREASURE GOLD COIN","TREASURE GOLD COIN");

const melee="arcade/lost-sizzler/js/v10-25-melee-ammo-balance.js";
exact(melee,`    if(!p.firearmUnlocked)p.weapon=null;`,`    if(!p.firearmUnlocked){p.weapon=null;p.ownedWeapons=[];p.activeWeaponIndex=-1}else PGR.normaliseWeaponOwnership(p);`);
exact(melee,`      p.weapon=null;\n      p.firearmUnlocked=false;`,`      p.weapon=null;\n      p.ownedWeapons=[];\n      p.activeWeaponIndex=-1;\n      p.firearmUnlocked=false;`);
exact(melee,`      p.weapon=p.firearmUnlocked&&old?.weapon?{...old.weapon}:null;\n      p.meleeWeapon=`,`      p.weapon=p.firearmUnlocked&&old?.weapon?{...old.weapon}:null;\n      p.ownedWeapons=p.firearmUnlocked&&Array.isArray(old?.ownedWeapons)?old.ownedWeapons.map(w=>PGR.cloneWeapon(w)):[];\n      p.activeWeaponIndex=p.firearmUnlocked&&Number.isInteger(old?.activeWeaponIndex)?old.activeWeaponIndex:-1;\n      if(p.firearmUnlocked)PGR.normaliseWeaponOwnership(p);\n      p.meleeWeapon=`);

const mp="arcade/lost-sizzler/js/v10-31-multiplayer-sync.js";
exact(mp,`if(Array.isArray(state.inventory))p1.inventory=state.inventory.map(item=>({...item}));if(state.weapon!==undefined)p1.weapon=state.weapon?{...state.weapon}:null;if(state.meleeWeapon)p1.meleeWeapon={...state.meleeWeapon};`,`if(Array.isArray(state.inventory))p1.inventory=state.inventory.map(item=>({...item}));if(state.weapon!==undefined)p1.weapon=state.weapon?PGR.cloneWeapon(state.weapon):null;if(Array.isArray(state.ownedWeapons))p1.ownedWeapons=state.ownedWeapons.map(item=>PGR.cloneWeapon(item));if(Number.isInteger(state.activeWeaponIndex))p1.activeWeaponIndex=state.activeWeaponIndex;if(p1.firearmUnlocked)PGR.normaliseWeaponOwnership(p1);if(state.meleeWeapon)p1.meleeWeapon={...state.meleeWeapon};`);

const rareBalance="arcade/lost-sizzler/js/v10-15-rare-events-balance.js";
replaceBlock(rareBalance,"  function creditValue(item){","\n\n  // DOUBLE GOLD",`  function creditValue(item){return PGR.creditGoldValue(item)}\n\n`,1);
exact(rareBalance,`  // DOUBLE GOLD means every collected score coin is genuinely worth twice its\n  // normal amount. The original pickup still awards the first half; this layer\n  // adds the matching bonus once per pickup.`,`  // DOUBLE GOLD doubles the separate shop currency. Score remains untouched.\n  // The original pickup awards the first half; this layer adds the matching\n  // Gold bonus once per pickup.`);
exact(rareBalance,`      const before=Number(score||0),result=originalApplyItem.apply(this,arguments);`,`      const result=originalApplyItem.apply(this,arguments);`,1);
exact(rareBalance,`        score=Number(score||0)+value;`,`        PGR.earnGold(run,value);`);
exact(rareBalance,`"The dungeon traders are closed on this floor. Save your score for later."`,`"The dungeon traders are closed on this floor. Save your Gold for later."`);
replaceBlock(rareBalance,"  // The Golden Room grants 250 immediately for surviving.","\n\n  /* -----------------------------------------------------------------------",`  // Golden Room coins now pay the separate Gold currency, so they no longer\n  // need the old anti-double-Score rollback wrapper. Its immediate +250 remains Score.\n`,1);

const rare="arcade/lost-sizzler/js/v10-15-rare-events.js";
replaceLine(rare,"  function addCredits(x,y,total,title=\"GOLD\"){",`  function addCredits(x,y,total,title="GOLD"){const gold=Math.max(1,Math.ceil(Math.max(0,Number(total||0))/100));for(let i=0;i<gold;i++){const q=safeNearby(x,y,`+"`"+`${title}|${i}`+"`"+`);host.items.push({id:`+"`"+`rare-credit-${Date.now()}-${i}-${Math.random()}`+"`"+`,x:q.x,y:q.y,kind:"credits",goldValue:1,active:true,title})}}`);
exact(rare,`"DOUBLE GOLD":"Gold score pickups on this floor are worth double.",`,`"DOUBLE GOLD":"Gold pickups on this floor are worth double.",`);
exact(rare,`    if(enemy.treasureBat){score+=350;host.chests.push({id:`+"`"+`bat-reward-${Date.now()}`+"`"+`,x:enemy.x,y:enemy.y,locked:false,active:true,depth:14,roomId:roomAt(enemy.x,enemy.y),treasureBatReward:true});showToast("TREASURE BAT DOWN","+350 score. It dropped the prize it was carrying.","gold",7500)}`,
`    if(enemy.treasureBat){score+=350;const gold=PGR.awardTreasureBatGold(enemy,run);host.chests.push({id:`+"`"+`bat-reward-${Date.now()}`+"`"+`,x:enemy.x,y:enemy.y,locked:false,active:true,depth:14,roomId:roomAt(enemy.x,enemy.y),treasureBatReward:true});showToast("TREASURE BAT DOWN",`+"`"+`+350 score${gold?`+"`"+` and +${gold} Gold`+"`"+`:""}. It dropped the prize it was carrying.`+"`"+`,"gold",7500)}`);

const elf="arcade/lost-sizzler/js/v10-14-gilded-elf.js";
exact(elf,`kind:"credits",gildedElfCoin:true,scoreValue:10,active:true,title:"10 GOLD"`,`kind:"credits",gildedElfCoin:true,goldValue:1,active:true,title:"1 GOLD"`);

const dev="arcade/lost-sizzler/js/v10-41-gambler-devroom.js";
exact(dev,`scoreValue:kind==="credits"?1000:undefined`,`goldValue:kind==="credits"?5:undefined`);

const html="arcade/lost-sizzler/index.html";
exact(html,`Choose what you actually need. Normal score stock can be bought repeatedly, with the price doubling after every purchase at this shop.`,`Choose what you actually need. Gold buys repeatable stock, and each standard purchase raises this shop's next price by 1 Gold.`);
exact(html,`<span>SCORE <b id="shop-score">000000</b></span>`,`<span>GOLD <b id="shop-score">0</b></span>`);
exact(html,`<span>NEXT SCORE PRICE <b id="shop-next-price">1000</b></span>`,`<span>NEXT GOLD PRICE <b id="shop-next-price">2</b></span>`);
exact(html,`Normal score items can be bought repeatedly. Their price starts at 1,000 and doubles at this shop: 1,000, 2,000, 4,000, 8,000... Stock: Potion, Torch, Teleport Spell, Inventory Slot, Ammo, Armour and Weapon Cache. Artefacts are separate: trade 3 for a Banishment Flask, or buy one Flask per shop for 10,000 score.`,`Standard stock starts at 2 Gold and rises by 1 Gold after each purchase at that shop: 2, 3, 4, 5... Stock: Potion, Torch, Bronze Key, Teleport Spell, Inventory Slot, Ammo, Armour and Weapon Cache. Artefacts are separate: trade 3 for a Banishment Flask, or buy one Flask per shop for 10 Gold.`);

const testPath="arcade/lost-sizzler/tests/dungeon-progression-foundation-contract.mjs";
const test=`import assert from "node:assert/strict";\nimport fs from "node:fs";\nimport vm from "node:vm";\n\nconst store=new Map();\nconst localStorage={getItem:key=>store.has(key)?store.get(key):null,setItem:(key,value)=>store.set(key,String(value)),removeItem:key=>store.delete(key)};\nconst C={maxFloors:6,loot:{rarities:["COMMON","UNCOMMON","SIZZLER","GOLD MEDAL","ZZAP! 97%"]},difficulty:{ARCADE:{ammo:1}},floors:Array.from({length:6},(_,i)=>({objective:"keys",name:`+"`"+`Floor ${i+1}`+"`"+`})),levelCaps:[5,8,11,14,17,20],player:{maxHealth:10,maxMana:100,inventorySlots:6},stalker:{flaskArtefacts:3}};\nconst context={console,Math,Date,JSON,localStorage,setTimeout,clearTimeout,window:{CCG_CONFIG:C}};context.window.window=context.window;context.window.localStorage=localStorage;vm.createContext(context);\nvm.runInContext(fs.readFileSync("arcade/lost-sizzler/js/progression.js","utf8"),context,{filename:"progression.js"});\nconst P=context.window.CCGProgression;assert.ok(P,"progression API loads");\n\nconst run=P.makeRun({difficulty:"ARCADE",seed:"GOLDTEST"});assert.equal(run.gold,0,"new runs start with zero Gold");\nassert.equal(P.goldBalance(run),0);assert.equal(P.earnGold(run,5),5);assert.equal(run.gold,5);assert.equal(P.canAffordGold(run,4),true);assert.equal(P.spendGold(run,4),true);assert.equal(run.gold,1);assert.equal(P.spendGold(run,2),false);assert.equal(run.gold,1,"failed spend is non-destructive");\nassert.equal(P.shopGoldPrice({}),2);assert.equal(P.shopGoldPrice({goldPurchases:1}),3);assert.equal(P.shopGoldPrice({scorePurchases:2}),4,"legacy shop purchase counters migrate into the linear ladder");\nassert.equal(P.creditGoldValue({kind:"credits"}),1);assert.equal(P.creditGoldValue({kind:"credits",goldValue:5}),5);assert.equal(P.creditGoldValue({kind:"credits",scoreValue:125}),2,"legacy score-valued coins are scaled, not treated as hundreds of Gold");\n\nconst bat={treasureBat:true};run.gold=0;assert.equal(P.awardTreasureBatGold(bat,run),5);assert.equal(P.awardTreasureBatGold(bat,run),0);assert.equal(run.gold,5,"Treasure Bat Gold is single-award");\n\nconst w1={id:"pulse",displayName:"COMMON Pulse",rarity:"COMMON",rating:1,power:1,delay:1,shots:1,element:"energy",mods:[]};\nconst w2={id:"fire",displayName:"SIZZLER Fire",rarity:"SIZZLER",rating:5,power:3,delay:1.2,shots:1,element:"fire",mods:["Turbo"]};\nconst player={weapon:null,firearmUnlocked:false,ownedWeapons:[],activeWeaponIndex:-1};P.acquireWeapon(player,w1,{equip:true});P.acquireWeapon(player,w2,{equip:true});assert.equal(player.ownedWeapons.length,2,"weapon pickups preserve ownership");assert.equal(player.weapon.id,"fire");P.equipOwnedWeapon(player,0);assert.equal(player.weapon.id,"pulse","owned weapons can be switched non-destructively");assert.equal(player.ownedWeapons.length,2);\n\nstore.set("ccg-quest-v10.3-checkpoint",JSON.stringify({version:"V10.3",run:{floor:2,score:999},player:{weapon:w2,firearmUnlocked:true},player2:{weapon:w1,firearmUnlocked:true}}));const legacy=P.loadCheckpoint();assert.equal(legacy.run.gold,0,"legacy checkpoint gains a safe Gold balance");assert.equal(legacy.player.ownedWeapons.length,1,"legacy P1 weapon migrates into ownership");assert.equal(legacy.player2.ownedWeapons.length,1,"legacy P2 weapon migrates independently");\n\nconst core=fs.readFileSync("arcade/lost-sizzler/js/game-core.js","utf8"),network=fs.readFileSync("arcade/lost-sizzler/js/game-network.js","utf8"),rare=fs.readFileSync("arcade/lost-sizzler/js/v10-15-rare-events.js","utf8"),mp=fs.readFileSync("arcade/lost-sizzler/js/v10-31-multiplayer-sync.js","utf8"),melee=fs.readFileSync("arcade/lost-sizzler/js/v10-25-melee-ammo-balance.js","utf8"),systems=fs.readFileSync("arcade/lost-sizzler/js/systems.js","utf8"),html=fs.readFileSync("arcade/lost-sizzler/index.html","utf8");\nassert.ok(core.includes("function shopGoldPrice"));assert.ok(!core.includes("function shopScorePrice"));assert.ok(core.includes('id:"bronze",name:"BRONZE KEY"'));assert.ok(core.includes("data-equip-weapon"),"inventory exposes weapon switching");const shopBody=core.slice(core.indexOf("function buyShopItem"),core.indexOf("function itemInfoDetails"));assert.ok(shopBody.includes("PGR.spendGold"));assert.ok(!shopBody.includes("score-="),"shop never spends Score");assert.ok(network.includes("PGR.earnGold(run,value)"),"coin pickups earn Gold");assert.ok(network.includes("PGR.acquireWeapon"),"all normal weapon pickups retain ownership");assert.ok(rare.includes("PGR.awardTreasureBatGold(enemy,run)"),"Treasure Bat uses idempotent Gold reward");assert.ok(mp.includes("ownedWeapons")&&mp.includes("activeWeaponIndex"),"normal co-op sync preserves weapon ownership");assert.ok(melee.includes("p.ownedWeapons=[]")&&melee.includes("PGR.normaliseWeaponOwnership(p)"),"melee-first start does not accidentally grant a gun and preserves later ownership");assert.ok(!systems.includes("scorePurchases:0"));assert.ok(html.includes("NEXT GOLD PRICE")&&html.includes("Bronze Key"));\nfor(const file of ["arcade/lost-sizzler/js/v10-33-special-modes.js","arcade/lost-sizzler/js/v10-39-horde-live-loadout.js","arcade/lost-sizzler/js/v10-41-r35-spy-rules-hardening.js","arcade/lost-sizzler/js/v10-41-r58-spy-overhaul.js"]){const source=fs.readFileSync(file,"utf8");assert.ok(!source.includes("ownedWeapons"),`+"`"+`${file} keeps its independent mode-specific ownership model`+"`"+`)}\nconsole.log("Dungeon progression foundation contract: PASS");\n`;
write(testPath,test);

console.log("Guarded dungeon progression foundation patch applied.");
