import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const source=fs.readFileSync(fileURLToPath(new URL('../js/v10-6-inventory-hud-fix.js',import.meta.url)),'utf8');

const classList={add(){},toggle(){}};
const target={innerHTML:''};
const commands={classList,innerHTML:''};
const title={textContent:''},tag={textContent:''};
const head={querySelector(selector){return selector==='h3'?title:selector==='span'?tag:null}};
const dock={classList,querySelector(selector){return selector==='.shortcut-dock-head'?head:selector==='.command-grid'?commands:null}};
const controls={dataset:{},innerHTML:''};
const hubHead={textContent:''};
let syncCalls=0;

const context={
  console,
  window:{},
  document:{
    getElementById(id){return id==='item-shortcuts'?target:null},
    querySelector(selector){
      if(selector==='.shortcut-dock')return dock;
      if(selector==='#menu .keys-help')return controls;
      if(selector==='.hub-inventory-head b')return hubHead;
      return null;
    },
    createElement(){throw new Error('quick keyring DOM should not be needed in this unit test')}
  },
  C:{keyTarget:3},
  PGR:{inventoryKindCount(_player,kind){return {potion:2,torch:1,teleport:1,banishment:1,artefact:3}[kind]||0}},
  p1:{bronzeKeys:1,torchMs:0},
  host:{objective:{type:'keys'},keysCollected:1,exitSigilCollected:true},
  itemIconSVG(kind){return `<i data-kind="${kind}"></i>`},
  sync(){syncCalls++}
};

vm.createContext(context);
vm.runInContext(source,context,{filename:'v10-6-inventory-hud-fix.js'});

assert.match(target.innerHTML,/RESTORATION POTION/);
assert.match(target.innerHTML,/<kbd>E<\/kbd>/);
assert.match(target.innerHTML,/FLAMING TORCH/);
assert.match(target.innerHTML,/<kbd>Q<\/kbd>/);
assert.match(target.innerHTML,/BRONZE KEY/);
assert.match(target.innerHTML,/Automatically used on a bronze door or locked chest/);
assert.match(target.innerHTML,/<kbd>AUTO<\/kbd>/);
assert.match(target.innerHTML,/data-kind="bronze"/,'bronze key has a graphical icon');
assert.match(target.innerHTML,/EXIT SIGIL/);
assert.equal(title.textContent,'INVENTORY & KEYS');
assert.equal(tag.textContent,'LIVE');
assert.match(commands.innerHTML,/TAB/);
assert.match(commands.innerHTML,/CLOSE DOOR/);
assert.match(controls.innerHTML,/E POTION/);
assert.match(controls.innerHTML,/Q TORCH/);
assert.match(controls.innerHTML,/O = PLAYER 2 POTION/,'the second potion control is explicitly labelled as Player 2');

context.sync();
assert.equal(syncCalls,1,'the existing sync function remains intact');

console.log('Lost Sizzler persistent inventory HUD regression checks passed.');
