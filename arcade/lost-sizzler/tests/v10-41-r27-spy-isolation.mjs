import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const source=fs.readFileSync(path.join(root,"js/v10-41-r27-spy-isolation.js"),"utf8");
const inventorySource=fs.readFileSync(path.join(root,"js/v10-6-inventory-hud-fix.js"),"utf8");
const indexSource=fs.readFileSync(path.join(root,"index.html"),"utf8");

assert.match(source,/specialModeType\(\)==="sizzler-saboteurs"/,"r27 must be hard-gated to Spy Vs Spy");
assert.match(source,/if\(code==="KeyE"\)/,"E must have an explicit Spy-only interception path");
assert.match(source,/stopDungeonPropagation\(event\);return true;/,"Spy E must stop the ordinary Dungeon bubble listener");
assert.doesNotMatch(source,/stopImmediatePropagation/,"Spy E interception must still allow the existing same-window Spy adapter to record Search");
assert.match(source,/if\(code==="KeyF"\)/,"F must have an explicit Spy-only override");
assert.match(source,/toggleSpyFieldKit\(\)/,"F must open the Spy field kit rather than fullscreen");
assert.match(source,/BLOCKED_DUNGEON_KEYS=new Set\(\["KeyQ","KeyR","KeyB"/,"Dungeon item hotkeys must be isolated from Spy Vs Spy");
assert.match(source,/blocker\.structural=true;blocker\.hp=999999;blocker\.maxHp=999999/,"Spy furniture must be made indestructible to shared Dungeon attacks");
assert.match(source,/door\?\.spyDoor/,"only Spy doors may be repaired/opened by the Spy isolation layer");
assert.match(source,/beginDoorOpening\(door,420\)/,"walking into a closed Spy door must begin its opening sequence");
assert.match(source,/SPY VS SPY — CONTROLS & KIT/,"the right sidebar must be replaced with Spy-specific controls and kit");
assert.match(source,/SPY OBJECTIVE ITEMS/,"the Spy sidebar must expose only the Spy objective set");
assert.match(source,/SPY VS SPY FIELD KIT/,"the full inventory overlay must become the Spy field kit");
assert.doesNotMatch(source,/usePotion\s*\(/,"the Spy isolation layer must never invoke the Dungeon potion action");

assert.match(inventorySource,/const spyOwnsHud=/,"the ordinary inventory HUD must recognise Spy ownership");
assert.match(inventorySource,/function onQuickSlotKey\(event\)\{\s*if\(spyOwnsHud\(\)\)return;/,"numbered Dungeon quick slots must be disabled in Spy Vs Spy");
assert.match(inventorySource,/function renderLiveHud\(\)\{\s*if\(spyOwnsHud\(\)\)return;/,"the ordinary Inventory & Keys sidebar must stop rendering while Spy owns it");
assert.match(indexSource,/ccg-lost-sizzler-cache" content="20260827r31"/,"the release cache token must remain current for the changed shared inventory/runtime stack");
assert.match(indexSource,/v10-41-r27-spy-isolation\.js\?v=20260827r31/,"r27 must remain loaded once beneath the retained r28 and final r29 layers");
assert.match(indexSource,/v10-41-r28-special-mode-repair\.js\?v=20260827r31/,"retained r28 repair must load after r27 to provide its Spy notification/furniture boundary");
assert.match(indexSource,/v10-41-r29-runtime-repair\.js\?v=20260827r31/,"r29 must load after the retained r27/r28 Spy layers");

const spyFurniture={id:"spy-chair",x:4,y:4,spyFurniture:true,structural:false,hp:3,maxHp:3};
const spyDecor={...spyFurniture};
const spyDoor={id:"spy-door",x:6,y:5,spyDoor:true,locked:true,open:false,opening:false,openingStart:0,openAt:0};
const normalDoor={id:"normal-door",x:7,y:5,locked:true,open:false,opening:false};
const host={blockingDecor:[spyFurniture],doors:[spyDoor,normalDoor],revision:1};
const world={decor:[spyDecor]};
const player={id:"p1",x:5,y:5};
const active={type:"sizzler-saboteurs",state:{players:[{id:"p1",hasCase:false,objectives:[],counter:null,weapon:null}],trapLoadout:[],wins:{p1:0}}};
let fieldKitToggles=0,doorOpenCalls=0;
const listeners={};
const document={
  body:{dataset:{specialMode:"sizzler-saboteurs"}},
  querySelector:()=>null,
  getElementById:()=>null
};
const context={
  console,
  document,
  host,
  world,
  p1:player,
  mode:"playing",
  performance:{now:()=>1000},
  setInterval:()=>1,
  clearInterval:()=>{},
  setTimeout:fn=>{fn();return 1},
  addEventListener:(type,fn)=>{listeners[type]=fn},
  toggleInventory:()=>{fieldKitToggles++},
  beginDoorOpening:door=>{door.opening=true;door.openingStart=1000;door.openAt=1420;doorOpenCalls++},
  window:{
    CCGLostSizzlerSpecialModes:{active},
    CCGWorld:{doorAt:(state,x,y)=>state.doors.find(door=>door.x===x&&door.y===y)||null},
    movePlayer:()=>true
  }
};
context.window.window=context.window;
context.window.addEventListener=context.addEventListener;
vm.createContext(context);
vm.runInContext(source,context,{filename:"v10-41-r27-spy-isolation.js"});

const api=context.window.CCGLostSizzlerV141R27SpyIsolation;
assert.ok(api,"Spy isolation API must install");
assert.equal(spyFurniture.structural,true,"Spy furniture blocker becomes structural");
assert.equal(spyFurniture.hp,999999,"Spy furniture blocker gets non-breakable HP guard");
assert.equal(spyDecor.structural,true,"matching visible Spy furniture is also marked structural");
assert.equal(normalDoor.locked,true,"ordinary Dungeon doors are not modified by Spy world protection");
assert.equal(spyDoor.locked,false,"Spy doors cannot inherit a Dungeon lock state");

spyDoor.opening=false;spyDoor.open=false;
assert.equal(api.primeSpyDoor(player,1,0),true,"a closed Spy door directly ahead is recognised");
assert.equal(doorOpenCalls,1,"a closed Spy door begins opening once");
assert.equal(spyDoor.opening,true,"the Spy door enters its opening state");

const keyEvent=code=>({code,repeat:false,target:null,prevented:0,stopped:0,preventDefault(){this.prevented++},stopPropagation(){this.stopped++}});
const e=keyEvent("KeyE");
assert.equal(api.onSpyKeyDown(e),true,"E is owned by Spy mode");
assert.equal(e.prevented,1,"Spy Search prevents the browser/default Dungeon action");
assert.equal(e.stopped,1,"Spy Search stops propagation into the Dungeon keydown path");

const f=keyEvent("KeyF");
assert.equal(api.onSpyKeyDown(f),true,"F is owned by Spy mode");
assert.equal(fieldKitToggles,1,"F toggles the Spy field kit");
assert.equal(f.prevented,1,"F cannot fall through to fullscreen while Spy is active");

const q=keyEvent("KeyQ");
assert.equal(api.onSpyKeyDown(q),true,"Q is blocked as a Dungeon inventory hotkey in Spy mode");
assert.equal(q.stopped,1,"blocked Dungeon item keys do not leak into the shared controller");

active.type="horde-survivor";document.body.dataset.specialMode="horde-survivor";
const outside=keyEvent("KeyF");
assert.equal(api.onSpyKeyDown(outside),false,"F is untouched outside Spy Vs Spy");
assert.equal(outside.prevented,0,"non-Spy modes retain their existing fullscreen/input behaviour");
assert.equal(fieldKitToggles,1,"the Spy field kit is not opened in another mode");

console.log("Lost Sizzler V10.41 r27 Spy controls, HUD ownership, furniture and door isolation checks passed beneath r30.");
