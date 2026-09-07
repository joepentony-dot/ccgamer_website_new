import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const sealSource=fs.readFileSync(path.join(root,"js/v10-42-r2-controller-owner-seal.js"),"utf8");
const stabilitySource=fs.readFileSync(path.join(root,"js/v10-42-r1-stability.js"),"utf8");

const boundary=function updateV141ModeControllerBoundary(){return "controller"};
boundary.__ccgV141ModeFrameBoundary=true;
const context={
  console,
  performance:{now:()=>1000},
  queueMicrotask(fn){fn()},
  setTimeout(){return 1},
  clearTimeout(){},
  setInterval(){return 1},
  clearInterval(){},
  addEventListener(){},
  document:{hidden:true,readyState:"complete",addEventListener(){},getElementById(){return null}},
  localStorage:{getItem(){return null},setItem(){}},
  CCGLostSizzlerModeRuntime:{state:{sharedFrameBoundary:boundary}}
};
context.window=context;
Object.defineProperty(context,"update",{
  configurable:false,
  enumerable:true,
  writable:true,
  value:boundary
});

vm.runInNewContext(sealSource,context,{filename:"v10-42-r2-controller-owner-seal.js"});
const seal=context.CCGLostSizzlerV142R2ControllerOwnerSeal;
assert.ok(seal,"V10.42 controller owner seal must register");
assert.equal(seal.state.installed,true,"controller owner seal must install on the classic-script global update data property");
assert.equal(seal.state.unsupported,false,"non-configurable but writable global update must remain supported");
assert.equal(seal.state.lockMode,"cooperative-data","controller owner seal must preserve writable V10.41 compatibility semantics");
assert.equal(seal.gateActive(),true,"controller owner gate must report active while the verified V10.41 boundary owns update");

let descriptor=Object.getOwnPropertyDescriptor(context,"update");
assert.equal(descriptor.configurable,false,"controller update must remain non-configurable");
assert.equal(descriptor.writable,true,"controller update must remain writable for the established V10.41 ownership/recovery layers");
assert.equal(descriptor.value,boundary,"controller update must remain the first verified V10.41 mode boundary");

vm.runInNewContext(stabilitySource,context,{filename:"v10-42-r1-stability.js"});
const stability=context.CCGLostSizzlerV142R1Stability;
assert.ok(stability,"V10.42 r1 stability must register");
assert.equal(context.update,boundary,"V10.42 r1 stability must not wrap or replace an authoritative V10.41 controller boundary");
assert.equal(Boolean(context.update.__ccgV142R1CombatIntegrity),false,"authoritative V10.41 controller boundary must not receive the legacy r1 update wrapper");
assert.ok(stability.diagnostics.controllerBoundaryPreserved>=1,"V10.42 r1 diagnostics must record that authoritative controller ownership was preserved");

const replacement=function updateCompatibilityWriter(){return "replacement"};
context.update=replacement;
assert.equal(seal.gateActive(),false,"cooperative owner diagnostics must notice a displaced global update");
assert.equal(seal.restoreOwnership(),true,"cooperative owner must restore the first verified V10.41 boundary when a later writer displaces it");
assert.equal(context.update,boundary,"cooperative repair must restore controller ownership without changing global descriptor semantics");
assert.ok(seal.state.ownershipRepairs>=1,"controller diagnostics must record cooperative ownership repairs");

descriptor=Object.getOwnPropertyDescriptor(context,"update");
assert.equal(descriptor.writable,true,"cooperative repair must not make update read-only");
assert.equal(descriptor.configurable,false,"cooperative repair must not redefine the classic-script global descriptor");

const driftedBoundary=function updateDriftedModeBoundary(){return "drift"};
driftedBoundary.__ccgV141ModeFrameBoundary=true;
context.CCGLostSizzlerModeRuntime.state.sharedFrameBoundary=driftedBoundary;
const drift=seal.runtimeBoundaryStatus();
assert.equal(drift.locked,boundary,"the seal must retain its original verified controller boundary");
assert.equal(drift.current,driftedBoundary,"diagnostics may report a later runtime-state boundary without adopting it");
assert.equal(drift.drift,true,"runtime-state boundary replacement must be exposed as drift");
assert.equal(context.update,boundary,"runtime-state drift must never redefine global update ownership");
assert.equal(seal.gateActive(),true,"global controller ownership must remain valid while runtime-state drift is diagnosed");
assert.ok(seal.state.runtimeBoundaryDrifts>=1,"controller diagnostics must count runtime-state boundary drift");
assert.equal(stability.authoritativeControllerBoundary(),boundary,"V10.42 r1 must prefer r2's first verified boundary over later ModeRuntime drift");

console.log("Lost Sizzler V10.42 cooperative controller ownership, writable recovery and r1 no-wrapper contract passed.");
