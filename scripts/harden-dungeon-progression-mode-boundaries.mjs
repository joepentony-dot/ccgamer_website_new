import fs from "node:fs";

const foundation="arcade/lost-sizzler/js/dungeon-progression-foundation.js";
const contract="arcade/lost-sizzler/tests/dungeon-progression-foundation-contract.mjs";

function replaceExact(file,from,to,count=1){
  let source=fs.readFileSync(file,"utf8");
  const hits=source.split(from).length-1;
  if(hits!==count)throw new Error(`${file}: expected ${count} matches, found ${hits}: ${from.slice(0,100)}`);
  source=source.split(from).join(to);
  fs.writeFileSync(file,source);
}

replaceExact(foundation,
`        if(data.player)normaliseWeaponOwnership(data.player);\n        if(data.player2)normaliseWeaponOwnership(data.player2);`,
`        if(isDungeonMode()&&data.player)normaliseWeaponOwnership(data.player);\n        if(isDungeonMode()&&data.player2)normaliseWeaponOwnership(data.player2);`);

replaceExact(foundation,
`      const wrapped=function(runState,player,player2,...rest){ensureRunGold(runState);normaliseWeaponOwnership(player);normaliseWeaponOwnership(player2);return base.call(this,runState,player,player2,...rest)};`,
`      const wrapped=function(runState,player,player2,...rest){ensureRunGold(runState);if(isDungeonMode()){normaliseWeaponOwnership(player);normaliseWeaponOwnership(player2)}return base.call(this,runState,player,player2,...rest)};`);

replaceExact(foundation,
`        makePlayer=function(...args){const player=base.apply(this,args);normaliseWeaponOwnership(player);return player};`,
`        makePlayer=function(...args){const player=base.apply(this,args);if(isDungeonMode())normaliseWeaponOwnership(player);return player};`);

replaceExact(foundation,
`          if(prior&&player){player.ownedWeapons=prior.ownedWeapons;player.activeWeaponIndex=prior.activeWeaponIndex;if(prior.weapon)player.weapon=prior.weapon;if(prior.firearmUnlocked!==undefined)player.firearmUnlocked=prior.firearmUnlocked;normaliseWeaponOwnership(player)}`,
`          if(prior&&player&&isDungeonMode()){player.ownedWeapons=prior.ownedWeapons;player.activeWeaponIndex=prior.activeWeaponIndex;if(prior.weapon)player.weapon=prior.weapon;if(prior.firearmUnlocked!==undefined)player.firearmUnlocked=prior.firearmUnlocked;normaliseWeaponOwnership(player)}`);

replaceExact(foundation,
`    normaliseWeaponOwnership(currentP1());normaliseWeaponOwnership(currentP2());`,
`    if(isDungeonMode()){normaliseWeaponOwnership(currentP1());normaliseWeaponOwnership(currentP2())}`);

replaceExact(foundation,
`  function installShop(){\n    try{shopScorePrice=function(shop){return shopGoldPrice(shop)}}catch(_){}\n    try{\n      renderShop=function(){return renderGoldShop()};renderShop.__ccgProgressionFoundation=true;\n      buyShopItem=function(id){return buyGoldShopItem(id)};buyShopItem.__ccgProgressionFoundation=true;\n    }catch(error){console.warn("[C64 Dungeon Carnage] Gold shop install failed safely",error)}\n  }`,
`  function installShop(){\n    try{\n      const basePrice=typeof shopScorePrice==="function"?shopScorePrice:null;\n      shopScorePrice=function(shop){return isDungeonMode()?shopGoldPrice(shop):basePrice?basePrice.call(this,shop):shopGoldPrice(shop)};\n      shopScorePrice.__ccgProgressionFoundation=true;shopScorePrice.__ccgOriginal=basePrice;\n    }catch(_){}\n    try{\n      const baseRender=typeof renderShop==="function"?renderShop:null,baseBuy=typeof buyShopItem==="function"?buyShopItem:null;\n      renderShop=function(...args){return isDungeonMode()?renderGoldShop():baseRender?baseRender.apply(this,args):false};renderShop.__ccgProgressionFoundation=true;renderShop.__ccgOriginal=baseRender;\n      buyShopItem=function(id,...args){return isDungeonMode()?buyGoldShopItem(id):baseBuy?baseBuy.call(this,id,...args):false};buyShopItem.__ccgProgressionFoundation=true;buyShopItem.__ccgOriginal=baseBuy;\n    }catch(error){console.warn("[C64 Dungeon Carnage] Gold shop install failed safely",error)}\n  }`);

replaceExact(foundation,
`    ensureRunGold(currentRun());normaliseWeaponOwnership(currentP1());normaliseWeaponOwnership(currentP2());patchCopy();syncGoldHud();`,
`    if(isDungeonMode()){ensureRunGold(currentRun());normaliseWeaponOwnership(currentP1());normaliseWeaponOwnership(currentP2());patchCopy();syncGoldHud()}`);

replaceExact(contract,
`assert.match(source,/special!==\\"horde-survivor\\"&&special!==\\"sizzler-saboteurs\\"/,"special-mode ownership stays isolated");`,
`assert.match(source,/special!==\\"horde-survivor\\"&&special!==\\"sizzler-saboteurs\\"/,"special-mode ownership stays isolated");\nassert.match(source,/makePlayer=function\\(\\.\\.\\.args\\)\\{const player=base\\.apply\\(this,args\\);if\\(isDungeonMode\\(\\)\\)normaliseWeaponOwnership\\(player\\)/,"player creation leaves Horde and Spy ownership alone");\nassert.match(source,/if\\(prior&&player&&isDungeonMode\\(\\)\\)/,"preserved players are only migrated in dungeon mode");\nassert.match(source,/renderShop=function\\(\\.\\.\\.args\\)\\{return isDungeonMode\\(\\)\\?renderGoldShop\\(\\):baseRender/,"shop wrapper delegates outside dungeon mode");\nassert.match(source,/buyShopItem=function\\(id,\\.\\.\\.args\\)\\{return isDungeonMode\\(\\)\\?buyGoldShopItem\\(id\\):baseBuy/,"shop purchases delegate outside dungeon mode");`);

console.log("Dungeon progression mode-boundary hardening applied.");
