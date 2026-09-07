import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const source=fs.readFileSync(path.join(root,"js/v10-42-r2-controller-owner-seal.js"),"utf8");

const boundary=function updateV141ModeControllerBoundary(){return "controller"};
boundary.__ccgV141ModeFrameBoundary=true;
const window={
  CCGLostSizzlerModeRuntime:{state:{sharedFrameBoundary:boundary}}
};
Object.defineProperty(window,"update",{
  configurable:false,
  enumerable:true,
  writable:true,
  value:boundary
});

const document={hidden:true,readyState:"complete",addEventListener(){}};
const context={
  window,
  document,
  console,
  queueMicrotask(fn){fn()},
  setTimeout(){return 1},
  clearTimeout(){},
  setInterval(){return 1},
  clearInterval(){},
  addEventListener(){}
};
vm.runInNewContext(source,context,{filename:"v10-42-r2-controller-owner-seal.js"});

const api=window.CCGLostSizzlerV142R2ControllerOwnerSeal;
assert.ok(api,"V10.42 controller owner seal must register");
assert.equal(api.state.installed,true,"controller owner seal must install on the classic-script global update data property");
assert.equal(api.state.unsupported,false,"non-configurable but writable global update must be supported");
assert.equal(api.state.lockMode,"frozen-data","controller owner seal must use the data-property freeze path");
assert.equal(api.gateActive(),true,"controller owner gate must report active after freezing the verified V10.41 boundary");

const descriptor=Object.getOwnPropertyDescriptor(window,"update");
assert.equal(descriptor.configurable,false,"controller update must remain non-configurable");
assert.equal(descriptor.writable,false,"controller update must become non-writable before later compatibility modules load");
assert.equal(descriptor.value,boundary,"controller update must remain the first verified V10.41 mode boundary");

const replacement=function update(){return "replacement"};
replacement.__ccgV141ModeFrameBoundary=true;
assert.equal(Reflect.set(window,"update",replacement),false,"later compatibility assignments must be rejected by the frozen global property");
assert.equal(window.update,boundary,"rejected compatibility writes must not displace the controller boundary even transiently");

window.CCGLostSizzlerModeRuntime.state.sharedFrameBoundary=replacement;
const drift=api.runtimeBoundaryStatus();
assert.equal(drift.locked,boundary,"the seal must retain its original verified controller boundary");
assert.equal(drift.current,replacement,"diagnostics may report a later runtime-state boundary without adopting it");
assert.equal(drift.drift,true,"runtime-state boundary replacement must be exposed as drift");
assert.equal(window.update,boundary,"runtime-state drift must never redefine global update ownership");
assert.equal(api.gateActive(),true,"global controller ownership must remain sealed while runtime-state drift is diagnosed");
assert.ok(api.state.runtimeBoundaryDrifts>=1,"controller diagnostics must count runtime-state boundary drift");

console.log("Lost Sizzler V10.42 controller update data-property freeze and immutable first-boundary contract passed.");
