/* C64 Dungeon Carnage V10.42 — player-facing RPG terminology reconciliation. */
(()=>{
  "use strict";
  if(window.CCGLostSizzlerV142RpgTerminology)return;

  const PGR=window.CCGProgression;
  if(!PGR){console.warn("[C64 Dungeon Carnage] RPG terminology layer skipped: CCGProgression unavailable");return}

  const visibleRarity=Object.freeze({
    COMMON:"COMMON",
    UNCOMMON:"RARE",
    SIZZLER:"ENCHANTED",
    "GOLD MEDAL":"RELIC",
    "ZZAP! 97%":"LEGENDARY"
  });
  const legacyPattern=/^(ZZAP! 97%|GOLD MEDAL|SIZZLER|UNCOMMON|COMMON)\s+/i;

  function rarityLabel(rarity){return visibleRarity[String(rarity||"").toUpperCase()]||String(rarity||"")}
  function reconcileName(name,rarity){
    const raw=String(name||"").trim();
    const label=rarityLabel(rarity);
    if(!raw)return label;
    const stripped=raw.replace(legacyPattern,"");
    return label?`${label} ${stripped}`.trim():stripped;
  }
  function reconcileWeapon(weapon){
    if(!weapon||typeof weapon!=="object")return weapon;
    if(weapon.rarity)weapon.displayName=reconcileName(weapon.displayName||weapon.name,weapon.rarity);
    return weapon;
  }
  function reconcileLoot(loot){
    if(!loot||typeof loot!=="object")return loot;
    if(loot.weapon)reconcileWeapon(loot.weapon);
    if(loot.rarity&&loot.name)loot.name=reconcileName(loot.name,loot.rarity);
    return loot;
  }

  if(typeof PGR.generateWeapon==="function"&&!PGR.generateWeapon.__ccgRpgTerminology){
    const base=PGR.generateWeapon;
    PGR.generateWeapon=function(...args){return reconcileWeapon(base.apply(this,args))};
    PGR.generateWeapon.__ccgRpgTerminology=true;
    PGR.generateWeapon.__ccgOriginal=base;
  }
  if(typeof PGR.lootForChest==="function"&&!PGR.lootForChest.__ccgRpgTerminology){
    const base=PGR.lootForChest;
    PGR.lootForChest=function(...args){return reconcileLoot(base.apply(this,args))};
    PGR.lootForChest.__ccgRpgTerminology=true;
    PGR.lootForChest.__ccgOriginal=base;
  }
  if(typeof PGR.objectiveLabel==="function"&&!PGR.objectiveLabel.__ccgRpgTerminology){
    const base=PGR.objectiveLabel;
    PGR.objectiveLabel=function(...args){
      const value=String(base.apply(this,args)||"");
      return value.replace(/Zzap! Citadel guardian/gi,"Citadel guardian");
    };
    PGR.objectiveLabel.__ccgRpgTerminology=true;
    PGR.objectiveLabel.__ccgOriginal=base;
  }
  if(typeof PGR.inventoryLabel==="function"&&!PGR.inventoryLabel.__ccgRpgTerminology){
    const base=PGR.inventoryLabel;
    PGR.inventoryLabel=function(item,...args){
      const value=String(base.call(this,item,...args)||"");
      return item?.rarity?reconcileName(value,item.rarity):value.replace(/Zzap! Citadel guardian/gi,"Citadel guardian");
    };
    PGR.inventoryLabel.__ccgRpgTerminology=true;
    PGR.inventoryLabel.__ccgOriginal=base;
  }

  window.CCGLostSizzlerV142RpgTerminology={visibleRarity,rarityLabel,reconcileName,reconcileWeapon,reconcileLoot};
})();
