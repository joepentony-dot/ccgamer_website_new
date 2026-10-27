import fs from "node:fs";
import assert from "node:assert/strict";
import vm from "node:vm";

const root=new URL("../",import.meta.url);
const html=fs.readFileSync(new URL("index.html",root),"utf8");
const bootstrap=fs.readFileSync(new URL("js/v10-42-bootstrap.js",root),"utf8");
const moduleSource=fs.readFileSync(new URL("js/v10-42-r71-equipment-inventory.js",root),"utf8");
const css=fs.readFileSync(new URL("css/v10-42-r71-equipment-inventory.css",root),"utf8");
const render=fs.readFileSync(new URL("js/game-render.js",root),"utf8");
const version=JSON.parse(fs.readFileSync(new URL("version.json",root),"utf8"));
const cache=String(version.cacheToken||"");
assert.match(cache,/^\d{8}r\d+$/,"equipment contract requires a valid current release cache token");

assert.ok(html.includes(`v10-42-r71-equipment-inventory.css?v=${cache}`));
assert.ok(bootstrap.includes('v10-42-r71-equipment-inventory.js'));
assert.ok(moduleSource.includes("Equipment & Inventory"));
assert.ok(moduleSource.includes("r71-equipment-board"));
assert.ok(moduleSource.includes("r71-character-stage"));
assert.ok(moduleSource.includes("playerSheetSource"));
assert.ok(moduleSource.includes("explorer-sheet-v10-34.png"));
assert.ok(moduleSource.includes("../assets/pixel/explorer-sheet-v10-34.png"),"R71 CSS custom-property sprite URL must resolve out of css/ into the canonical assets directory");
assert.ok(moduleSource.includes("BODY ARMOUR"));
assert.ok(moduleSource.includes("EQUIPPED RELICS"));
assert.ok(!moduleSource.includes("HELMET"),"R71 must not invent a helmet equipment slot before one exists in gameplay");
assert.ok(!moduleSource.includes("GLOVES"),"R71 must not invent a gloves equipment slot before one exists in gameplay");
assert.ok(!moduleSource.includes("BOOTS"),"R71 must not invent a boots equipment slot before one exists in gameplay");
assert.ok(moduleSource.includes("r71-stat-strip"));
assert.ok(moduleSource.includes("DOMAIN KEYS"));
assert.match(moduleSource,/v142ClaimedDomains/,"Domain Keys must use persistent campaign progress across floor transitions");
assert.match(moduleSource,/new Set\(claimedDomains/,"campaign Domain Keys must count unique claimed domains rather than only the current floor");
assert.ok(moduleSource.includes("player.relics"));
assert.ok(moduleSource.includes("player?.rpgStats"));
assert.ok(moduleSource.includes('guide.setAttribute("aria-hidden","true")'));
assert.ok(css.includes("height:min(740px,100%)"));
assert.ok(css.includes("overflow:hidden!important"));
assert.ok(css.includes("@media(max-height:820px) and (min-width:901px)"),"short desktop inventory must have a dedicated compact fit rather than inheriting the narrow-screen scrolling layout");
assert.ok(css.includes("#inventory-panel{overflow:hidden!important}"),"desktop inventory overlay must not expose an outer scrollbar");
assert.ok(css.includes("height:calc(100dvh - 16px)!important"),"short desktop inventory panel must fit the live viewport height");
assert.ok(css.includes("--r71-rpg-font:"));
assert.ok(css.includes("Palatino Linotype"));
assert.ok(css.includes("font-family:var(--r71-rpg-font)"));
assert.ok(css.includes(".r71-character-sprite-window"));
assert.ok(css.includes("transform:scale(3)"));
assert.ok(css.includes("image-rendering:pixelated"));
assert.ok(!css.includes(".r71-paper-doll{"));
assert.ok(css.includes(".r71-long-copy{display:none!important}"));
assert.ok(render.includes("R71 equipment presentation: preserve the CCG sprite silhouette"));
assert.ok(render.includes("function playerEquipmentPresentation(p)"));
assert.ok(render.includes("p?.sigilReveal||p?.sigilWard||p?.sigilBind||p?.sigilBanish"));
assert.ok(render.includes("Array.isArray(p?.relics)?p.relics.length:0"));
assert.ok(!render.includes("fillRect(cx-6,cy-5,12,12)"));
assert.ok(!render.includes("strokeRect(cx-7,cy-17,14,27)"));
assert.ok(!render.includes("fillRect(cx-5,cy-3,10,5)"));
assert.ok(render.includes("fillRect(cx-4,cy-2,8,2)"));
assert.ok(render.includes("fillRect(cx-4,cy-12,8,2)"));

// R145: execute the real progression authority and R71 inventory renderer.
// Magic Sacks are run-wide upgrades, not carried inventory item counts.
const progressionSource=fs.readFileSync(new URL("js/progression.js",root),"utf8");
const progressWindow={CCG_CONFIG:{loot:{rarities:["COMMON","UNCOMMON","SIZZLER","GOLD MEDAL","ZZAP! 97%"]},player:{inventorySlots:12,startingInventorySlots:6}}};
vm.runInNewContext(progressionSource,{window:progressWindow,console,Math,Date},{filename:"progression.js"});
const actualPGR=progressWindow.CCGProgression;
assert.equal(typeof actualPGR.magicSackTier,"function");
assert.equal(typeof actualPGR.stackLimit,"function");
actualPGR.floorLevelCap=()=>10;
actualPGR.roomCompletion=()=>0;
actualPGR.xpNeed=()=>10;

const loadout={innerHTML:""},objective={innerHTML:""};
const inventoryList={setAttribute(){},querySelectorAll(){return[]}};
const layout={appendChild(){}};
const heading={textContent:""},notice={textContent:"",nextSibling:null};
const panel={
  classList:{add(){}},
  querySelector(selector){return selector===".mobile-panel-head h2"?heading:selector===".r71-inventory-layout"?layout:null},
  insertBefore(){}
};
const fakeDocument={
  readyState:"loading",
  addEventListener(){},
  querySelector(selector){return selector==="#inventory-panel .inventory-panel"?panel:null},
  getElementById(id){return ({"inventory-mobile-notice":notice,"inventory-loadout":loadout,"inventory-objective":objective,"inventory-list":inventoryList})[id]||null}
};
const player={id:"p1",level:1,xp:0,armor:0,magicSacks:0,inventory:[{kind:"potion",qty:1}],relics:[],torchMs:0};
const gameWindow={CCGProgression:actualPGR,CCGLostSizzlerV142ProceduralOverhaul:{rpgStats:[],relics:[]}};
const gameContext={window:gameWindow,document:fakeDocument,p1:player,run:{floor:1},host:{keysCollected:0},world:{rooms:[]},C:{keyTarget:3},SYS:{objectiveText:()=>"REACH THE EXIT"},explored:new Map([["p1",new Set()]]),renderInventoryPanel(){}};
vm.createContext(gameContext);
vm.runInContext(moduleSource,gameContext,{filename:"v10-42-r71-equipment-inventory.js"});
const renderInventory=gameWindow.CCGLostSizzlerV142R71EquipmentInventory.render;
assert.equal(typeof renderInventory,"function");
for(const tier of [0,1,2,3]){
  gameContext.p1.magicSacks=tier;
  const beforeInventory=JSON.stringify(gameContext.p1.inventory);
  renderInventory();
  assert.ok(loadout.innerHTML.includes(`data-r71-magic-sacks="${tier}"`),`tier ${tier} must render its authoritative numeric readout`);
  assert.ok(loadout.innerHTML.includes(`MAGIC SACKS ${tier}/3`),`tier ${tier} must show 0–3 owned sacks`);
  assert.ok(loadout.innerHTML.includes(`POTIONS ${3+tier}/STACK`),`tier ${tier} must show the actual potion stack limit`);
  assert.ok(loadout.innerHTML.includes(`TORCH ${1+tier}/STACK`),`tier ${tier} must show the actual torch stack limit`);
  assert.ok(loadout.innerHTML.includes(`Teleport Spells ${3+tier}`),`tier ${tier} tooltip must include teleport capacity`);
  assert.ok(loadout.innerHTML.includes("Ward-Break Charges remain limited to one carried charge"),"sack tooltip must not falsely promise extra Ward-Break charges");
  assert.equal(JSON.stringify(gameContext.p1.inventory),beforeInventory,"rendering must not add, remove or mutate carried items");
}
gameContext.p1=JSON.parse(JSON.stringify({...gameContext.p1,magicSacks:2}));
renderInventory();
assert.ok(loadout.innerHTML.includes("MAGIC SACKS 2/3"),"JSON-restored run state must render its owned sack tier");
gameContext.p1.magicSacks=99;
renderInventory();
assert.ok(loadout.innerHTML.includes("MAGIC SACKS 3/3"),"legacy over-cap values must be displayed at the canonical maximum");
gameContext.p1.magicSacks=-4;
renderInventory();
assert.ok(loadout.innerHTML.includes("MAGIC SACKS 0/3"),"invalid negative save values must not appear as owned sacks");

console.log("PASS V10.42 R71 equipment inventory contract");
