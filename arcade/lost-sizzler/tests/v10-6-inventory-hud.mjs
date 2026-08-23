import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const source=fs.readFileSync(fileURLToPath(new URL('../js/v10-6-inventory-hud-fix.js',import.meta.url)),'utf8');

const classList={add(){},toggle(){}};
const target={innerHTML:'',dataset:{}};
const commands={classList,innerHTML:''};
const title={textContent:''},tag={textContent:''};
const head={querySelector(selector){return selector==='h3'?title:selector==='span'?tag:null}};
const dock={classList,querySelector(selector){return selector==='.shortcut-dock-head'?head:selector==='.command-grid'?commands:null}};
const controls={dataset:{},innerHTML:''};
const hubHead={textContent:''};
const keyHandlers=[];
const usedSlots=[];
const toasts=[];
let syncCalls=0;

const player={
  bronzeKeys:1,
  torchMs:0,
  inventorySlots:3,
  inventory:[
    {kind:'potion',name:'Restoration Potion',qty:2},
    {kind:'torch',name:'Flaming Torch',qty:1},
    {kind:'artefact',name:'Rare Artefact',qty:3}
  ]
};

const context={
  console,
  window:{},
  mode:'playing',
  document:{
    body:{dataset:{runActive:'true'}},
    getElementById(id){return id==='item-shortcuts'?target:null},
    querySelector(selector){
      if(selector==='.shortcut-dock')return dock;
      if(selector==='#menu .keys-help')return controls;
      if(selector==='.hub-inventory-head b')return hubHead;
      return null;
    },
    querySelectorAll(){return[]},
    createElement(){throw new Error('quick keyring DOM is intentionally omitted from this focused unit test')}
  },
  C:{keyTarget:3},
  PGR:{
    inventoryKindCount(p,kind){return (p.inventory||[]).filter(item=>item.kind===kind).reduce((sum,item)=>sum+Math.max(1,Number(item.qty)||1),0)},
    inventoryCapacity(){return 3},
    inventoryLabel(item){return item?.name||item?.kind||'EMPTY'}
  },
  p1:player,
  host:{objective:{type:'keys'},keysCollected:1,exitSigilCollected:true},
  itemIconSVG(kind){return `<i data-kind="${kind}"></i>`},
  useInventorySlot(_player,index){usedSlots.push(index)},
  showToast(titleText,text,tone){toasts.push({titleText,text,tone})},
  sync(){syncCalls++},
  addEventListener(type,handler,capture){if(type==='keydown')keyHandlers.push({handler,capture})},
  setInterval(){return 1}
};

vm.createContext(context);
vm.runInContext(source,context,{filename:'v10-6-inventory-hud-fix.js'});

assert.match(target.innerHTML,/STORED ITEMS/);
assert.match(target.innerHTML,/RESTORATION POTION/);
assert.match(target.innerHTML,/×2/,'potion quantity is visible in the tactical inventory');
assert.match(target.innerHTML,/primary-item-key">E<\/kbd>/,'potion keeps its dedicated E shortcut');
assert.match(target.innerHTML,/number-item-key[^>]*>1<\/kbd>/,'potion also shows its exact Quick Inventory slot number');
assert.match(target.innerHTML,/FLAMING TORCH/);
assert.match(target.innerHTML,/primary-item-key">Q<\/kbd>/);
assert.match(target.innerHTML,/TELEPORT SPELL/,'zero-count carriable item types stay visible for recognition');
assert.match(target.innerHTML,/BANISHMENT FLASK/);
assert.match(target.innerHTML,/BRONZE KEY/);
assert.match(target.innerHTML,/Automatically opens a bronze door or locked chest/);
assert.match(target.innerHTML,/primary-item-key">AUTO<\/kbd>/);
assert.match(target.innerHTML,/data-kind="bronze"/,'bronze key has a graphical icon');
assert.match(target.innerHTML,/EXIT SIGIL/);
assert.equal(title.textContent,'INVENTORY & KEYS');
assert.equal(tag.textContent,'LIVE');
assert.match(commands.innerHTML,/1–6/);
assert.match(commands.innerHTML,/USE MATCHING SLOT/);
assert.match(controls.innerHTML,/E POTION/);
assert.match(controls.innerHTML,/Q TORCH/);
assert.match(controls.innerHTML,/1–6 QUICK SLOT/);
assert.match(controls.innerHTML,/O = PLAYER 2 POTION/,'the second potion control remains explicitly Player 2 only');
assert.equal(hubHead.textContent,'QUICK INVENTORY · PRESS 1–3 TO USE SLOT');

assert.equal(keyHandlers.length,1,'one numbered Quick Inventory keyboard handler is installed');
const keydown=keyHandlers[0].handler;
const eventFor=code=>({code,repeat:false,ctrlKey:false,altKey:false,metaKey:false,shiftKey:false,target:{tagName:'BODY'},preventDefault(){this.prevented=true},stopImmediatePropagation(){this.stopped=true}});
const slot1=eventFor('Digit1');keydown(slot1);
assert.deepEqual(usedSlots,[0],'number 1 activates the exact first inventory slot');
assert.equal(slot1.prevented,true);
assert.equal(slot1.stopped,true);

const slot3=eventFor('Digit3');keydown(slot3);
assert.deepEqual(usedSlots,[0],'trade-only artefacts are not consumed by a number key');
assert.match(toasts.at(-1).text,/cannot be activated/i);

context.sync();
assert.equal(syncCalls,1,'the existing sync function remains intact');

console.log('Lost Sizzler live inventory and numbered Quick Inventory regression checks passed.');
