import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const source=fs.readFileSync(path.join(root,"js/v10-41-multiplayer-no-pause.js"),"utf8");

assert.match(source,/__ccgV141MultiplayerNoPause/,"multiplayer no-pause wrappers must carry an ownership marker");
assert.match(source,/setInterval\(\(\)=>\{install\(\);if\(multiplayerActive\(\)\)forcePlaying\(\)\},120\)/,"multiplayer no-pause must keep checking for later wrapper replacement");
assert.doesNotMatch(source,/state\.pauseWrapped&&state\.menuWrapped&&state\.updateWrapped\)\{clearInterval/,"no-pause ownership must not stop watching as soon as its first wrappers install");

let intervalTick=null,lateUpdates=0,latePauses=0;
const context={
  console,
  performance:{now:()=>5000},
  setInterval:fn=>{intervalTick=fn;return 1},
  clearInterval:()=>{},
  addEventListener:()=>{},
  removeEventListener:()=>{},
  document:{
    body:{dataset:{runActive:"true",hordeSolo:"false"}},
    addEventListener:()=>{},
    removeEventListener:()=>{}
  },
  playMode:"online",
  mode:"playing",
  p2:null,
  UI:{pause:{classList:{add:()=>{}}}},
  input:{clear:()=>{}},
  showToast:()=>{},
  confirm:()=>true,
  pause(){latePauses++;return true},
  openPauseMenu(){latePauses++;return true},
  update(){lateUpdates++;return "base"}
};
context.window=context;
vm.createContext(context);
vm.runInContext(source,context,{filename:"v10-41-multiplayer-no-pause.js"});

assert.equal(typeof intervalTick,"function","no-pause ownership must keep a reassertion timer alive");
assert.equal(context.update.__ccgV141MultiplayerNoPause,true,"initial update wrapper must be owned by multiplayer no-pause");
assert.equal(context.pause.__ccgV141MultiplayerNoPause,true,"initial pause wrapper must be owned by multiplayer no-pause");

context.update=function updateV133LateReplacement(){lateUpdates++;return "late"};
context.pause=function pauseV141LateReplacement(){latePauses++;return true};
context.openPauseMenu=function openPauseMenuV141LateReplacement(){latePauses++;return true};
intervalTick();

assert.equal(context.update.__ccgV141MultiplayerNoPause,true,"a later update wrapper must be re-wrapped by multiplayer no-pause");
assert.equal(context.pause.__ccgV141MultiplayerNoPause,true,"a later pause wrapper must be re-wrapped by multiplayer no-pause");
assert.equal(context.openPauseMenu.__ccgV141MultiplayerNoPause,true,"a later pause-menu wrapper must be re-wrapped by multiplayer no-pause");

context.mode="paused";
const result=context.update(16);
assert.equal(result,"late","the reasserted no-pause wrapper must preserve the later update implementation");
assert.equal(lateUpdates,1,"the later update implementation must execute exactly once through the final wrapper");
assert.equal(context.mode,"playing","multiplayer update ownership must force an accidental paused mode back to playing");

context.mode="paused";
assert.equal(context.pause(),false,"direct pause calls must remain blocked after a late wrapper replacement");
assert.equal(context.mode,"playing","blocked direct pause must restore playing mode");
assert.equal(latePauses,0,"the replaced underlying pause implementation must not execute while multiplayer is active");

console.log("Lost Sizzler V10.41 multiplayer no-pause late-wrapper ownership checks passed.");