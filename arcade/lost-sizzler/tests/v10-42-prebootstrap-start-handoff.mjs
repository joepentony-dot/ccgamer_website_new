import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const file=path.join(root,"js","v10-41-startup-freeze-guard.js");
const source=fs.readFileSync(file,"utf8");

assert.ok(source.includes("capturePreBootstrapStart"),"the first pre-bootstrap guard must capture local start clicks");
assert.ok(source.includes("ccg:v142-ready"),"captured starts must wait for the authoritative V10.42 ready event");
assert.ok(source.includes("document.body?.dataset?.releaseReady!==\"true\""),"replay must still require release readiness");
assert.equal(source.includes("requestAnimationFrame"),false,"the start handoff must not add another frame owner");
assert.equal(source.includes("WebSocket"),false,"the start handoff must not add a network owner");
assert.equal(source.includes("fetch("),false,"the start handoff must not add a network request");

class FakeElement{
  constructor(id){this.id=id;this.disabled=false;this.isConnected=true;this.attrs=new Map();this.clicks=0}
  closest(selector){return selector.includes(`#${this.id}`)?this:null}
  setAttribute(name,value){this.attrs.set(name,String(value))}
  removeAttribute(name){this.attrs.delete(name)}
  click(){this.clicks+=1}
}

const button=new FakeElement("solo-btn");
const documentListeners=new Map();
const windowListeners=new Map();
const document={
  body:{dataset:{releaseReady:"false",runActive:"false"}},
  addEventListener(type,fn){documentListeners.set(type,fn)},
  removeEventListener(type,fn){if(documentListeners.get(type)===fn)documentListeners.delete(type)},
  getElementById(id){return id===button.id?button:null},
  createElement(){return{width:0,height:0,getContext(){return null}}}
};
const window={
  addEventListener(type,fn){windowListeners.set(type,fn)},
  CCGLostSizzlerReleaseGate:null
};
const context={
  window,document,Element:FakeElement,console,Object,Number,Boolean,String,Math,Map,Set,
  queueMicrotask,setTimeout(){return 1},clearTimeout(){},setInterval(){return 1},clearInterval(){},
  requestIdleCallback:undefined
};
vm.createContext(context);
vm.runInContext(source,context,{filename:file});

const api=window.CCGLostSizzlerV141StartupFreezeGuard;
assert.ok(api,"startup freeze guard API must remain available");
const clickListener=documentListeners.get("click");
assert.equal(typeof clickListener,"function","the early capture listener must install before V10.42 bootstrap");

let prevented=false,stopped=false;
clickListener({
  target:button,
  preventDefault(){prevented=true},
  stopImmediatePropagation(){stopped=true}
});
assert.equal(prevented,true,"a pre-bootstrap Solo click must be held instead of falling through legacy startup handlers");
assert.equal(stopped,true,"the held click must not also reach competing startup handlers");
assert.equal(api.state.pendingStartId,"solo-btn");
assert.equal(api.state.earlyStartCaptured,1);
assert.equal(button.attrs.get("aria-busy"),"true");

window.CCGLostSizzlerV142Bootstrap={ready:true,failed:false};
document.body.dataset.releaseReady="true";
const readyListener=windowListeners.get("ccg:v142-ready");
assert.equal(typeof readyListener,"function","the handoff must listen for V10.42 readiness");
readyListener();
await Promise.resolve();
assert.equal(button.clicks,1,"the held Solo request must replay exactly once after V10.42 is ready");
assert.equal(api.state.earlyStartReplayed,1);
assert.equal(api.state.pendingStartId,"");
assert.equal(button.attrs.has("aria-busy"),false);

prevented=false;stopped=false;
api.capturePreBootstrapStart({target:button,preventDefault(){prevented=true},stopImmediatePropagation(){stopped=true}});
assert.equal(prevented,false,"once V10.42 bootstrap exists it must retain normal start ownership");
assert.equal(stopped,false,"the early guard must not compete with V10.42 bootstrap");
assert.equal(button.clicks,1);

console.log("Lost Sizzler V10.42 pre-bootstrap local start handoff contract passed.");
