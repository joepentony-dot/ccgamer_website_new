import fs from "node:fs";

const foundation="arcade/lost-sizzler/js/dungeon-progression-foundation.js";
const contract="arcade/lost-sizzler/tests/dungeon-progression-foundation-contract.mjs";

function replaceExact(file,from,to,count=1){
  let source=fs.readFileSync(file,"utf8");
  const hits=source.split(from).length-1;
  if(hits!==count)throw new Error(`${file}: expected ${count} matches, found ${hits}: ${from.slice(0,120)}`);
  source=source.split(from).join(to);
  fs.writeFileSync(file,source);
}

replaceExact(foundation,
`      showToast=function(title,text,...rest){return base.call(this,title,replaceProgressionCopy(text),...rest)};`,
`      showToast=function(title,text,...rest){return base.call(this,title,isDungeonMode()?replaceProgressionCopy(text):text,...rest)};`);

replaceExact(foundation,
`        const player=currentP1();normaliseWeaponOwnership(player);const result=base.apply(this,args);\n        if(!player||!isDungeonMode())return result;`,
`        const player=currentP1(),dungeon=isDungeonMode();if(dungeon)normaliseWeaponOwnership(player);const result=base.apply(this,args);\n        if(!player||!dungeon)return result;`);

replaceExact(contract,
`assert.match(source,/buyShopItem=function\\(id,\\.\\.\\.args\\)\\{return isDungeonMode\\(\\)\\?buyGoldShopItem\\(id\\):baseBuy/,"shop purchases delegate outside dungeon mode");`,
`assert.match(source,/buyShopItem=function\\(id,\\.\\.\\.args\\)\\{return isDungeonMode\\(\\)\\?buyGoldShopItem\\(id\\):baseBuy/,"shop purchases delegate outside dungeon mode");\nassert.match(source,/showToast=function\\(title,text,\\.\\.\\.rest\\)\\{return base\\.call\\(this,title,isDungeonMode\\(\\)\\?replaceProgressionCopy\\(text\\):text/,"toast-copy rewriting is dungeon-only");\nassert.match(source,/const player=currentP1\\(\\),dungeon=isDungeonMode\\(\\);if\\(dungeon\\)normaliseWeaponOwnership\\(player\\)/,"inventory rendering does not mutate special-mode weapon ownership");`);

console.log("Final dungeon progression boundary guards applied.");
