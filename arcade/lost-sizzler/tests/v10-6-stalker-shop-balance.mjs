import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const source=fs.readFileSync(fileURLToPath(new URL('../js/v10-6-stalker-shop-balance.js',import.meta.url)),'utf8');

const toastLog=[];
const added=[];
let xpAwards=0;
let defeats=0;
const hiddenClass={add(){this.hidden=true},hidden:false};
const ui={
  floorComplete:{},
  floorSummary:{innerHTML:''},
  extract:{style:{},textContent:''},
  descend:{style:{}},
  artefactChoice:{classList:hiddenClass}
};

const context={
  console,
  window:{},
  document:{body:{},createTreeWalker(){return{nextNode(){return null}}},querySelector(){return null}},
  NodeFilter:{SHOW_TEXT:4},
  UI:ui,
  C:{maxFloors:5,stalker:{name:'Count Loadula'}},
  P:{purple:'#b978ff',gold:'#ffd85a'},
  PGR:{
    inventoryCanAdd(){return true},
    inventoryAdd(_p,item){added.push(item);return true}
  },
  S:{sfx(){},setStalkerNear(){}},
  p1:{inventory:[]},
  activeShop:{sold:{}},
  host:{revision:0,stalker:null,timedRooms:[],defeatedDeathStalkers:[]},
  run:{floor:2,floorComplete:false,stats:{kills:0}},
  score:10000,
  mode:'playing',
  pendingBanishmentReward:null,
  showToast(title,text,tone,duration){toastLog.push({title,text,tone,duration})},
  renderShop(){},
  buyShopItem(){throw new Error('original score-flask purchase should not run')},
  floorComplete(){
    context.run.floorComplete=true;
    context.UI.floorSummary.innerHTML='Descend for better loot and more danger, or extract now with everything safely saved.';
    context.UI.extract.style.display='';
    context.UI.extract.textContent='Save Loot & Exit';
    context.UI.descend.style.display='';
  },
  itemHelp(kind){return kind==='game'?'C64 rescue collectible; bank it by clearing/extracting.':'base'},
  itemInfoDetails(){return{why:'Trade 3 artefacts, or buy one there for 10,000 score.',desc:'base'}},
  permanentlyBanish(){},
  offerBanishmentArtefact(){},
  claimBanishmentArtefact(){},
  recordEnemyDefeat(){defeats++},
  broadcastWorld(){},
  sync(){},
  burst(){},
  ring(){},
  floatText(){},
  awardXP(){xpAwards++},
  setTimeout(){},
};
vm.createContext(context);
vm.runInContext(source,context,{filename:'v10-6-stalker-shop-balance.js'});

assert.equal(context.window.CCGLostSizzlerStalkerShopBalanceV106.FLASK_SCORE_PRICE,8000);
assert.equal(context.window.CCGLostSizzlerStalkerShopBalanceV106.BANISH_SCORE_REWARD,10000);

assert.equal(context.buyShopItem('banishmentScore'),true);
assert.equal(context.score,2000,'score Flask purchase deducts exactly 8,000');
assert.equal(added.at(-1)?.kind,'banishment','score purchase adds a Banishment Flask');
assert.equal(context.activeShop.sold.banishmentScore,true,'score Flask is one purchase per shop');

context.score=0;
context.run.stats.kills=0;
context.host.revision=0;
const stalker={id:'ds-1',x:4,y:5,alive:true,hp:8,permanentlyBanished:false};
assert.equal(context.permanentlyBanish(stalker,context.p1),true);
assert.equal(context.score,10000,'permanent banishment awards exactly 10,000 score');
assert.equal(xpAwards,0,'permanent banishment awards no XP');
assert.equal(stalker.alive,false);
assert.equal(stalker.permanentlyBanished,true);
assert.equal(context.run.stats.kills,1);
assert.equal(defeats,1);
assert.match(toastLog.at(-1).text,/Congratulations/);
assert.match(toastLog.at(-1).text,/10,000 score/);

context.run.floor=2;
context.run.floorComplete=false;
context.floorComplete('tester');
assert.equal(context.UI.extract.style.display,'none','intermediate floor no longer offers Save Loot & Exit');
assert.equal(context.UI.descend.style.display,'');
assert.doesNotMatch(context.UI.floorSummary.innerHTML,/extract now/i);

context.run.floor=5;
context.run.floorComplete=false;
context.floorComplete('tester');
assert.equal(context.UI.extract.style.display,'','final floor keeps the run-finishing control');
assert.equal(context.UI.extract.textContent,'Finish Run');
assert.equal(context.UI.descend.style.display,'none');

context.showToast('PRICE','Trade 3 artefacts or pay 10,000 score at a shop for a Flask.','red',1000);
assert.match(toastLog.at(-1).text,/8,000 score at a shop/,'old shop-price copy is corrected');
context.showToast('REWARD','Congratulations — 10,000 score awarded.','gold',1000);
assert.match(toastLog.at(-1).text,/10,000 score awarded/,'10,000 reward copy is not mistaken for the 8,000 shop price');

assert.match(context.itemHelp('game'),/banked automatically when a floor is cleared/i);
assert.match(context.itemInfoDetails({kind:'artefact'}).why,/8,000 score/);

console.log('Lost Sizzler Stalker reward/shop balance regression checks passed.');
