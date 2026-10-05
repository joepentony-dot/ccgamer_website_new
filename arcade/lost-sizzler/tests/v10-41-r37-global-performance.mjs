import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const read=relative=>fs.readFileSync(path.join(root,relative),"utf8");
const source=read("js/v10-41-r37-global-performance.js");
const loader=read("js/v10-41-lake-item-safety.js");

assert.match(loader,/load\("js\/v10-41-r37-global-performance\.js","data-ccg-v141-r37-global-performance"\)/,"late chain must load the local r37 performance monitor");
assert.match(source,/const VISUAL_TRIM_MS=250/,"visual trimming must remain bounded");
assert.match(source,/trimArray\(particles,budget\.particles\)/,"purely visual particles must have a bounded budget");
assert.match(source,/trimArray\(rings,budget\.rings\)/,"purely visual rings must have a bounded budget");
assert.match(source,/trimArray\(floaters,budget\.floaters\)/,"purely visual floating text must have a bounded budget");
assert.doesNotMatch(source,/\bnet\b|CCGNetwork|playMode==="online"|playMode==="split"/,"local performance monitor must not retain transport or retired mode dependencies");
assert.doesNotMatch(source,/trimArray\(bullets/,"gameplay bullets must never be dropped for performance");
assert.doesNotMatch(source,/trimArray\(enemyBullets/,"enemy projectiles must never be dropped for performance");
assert.doesNotMatch(source,/host\.enemies\.splice|host\.enemies=host\.enemies\.slice/,"enemy simulation must not be trimmed by the visual performance layer");

let clock=1000;
const document={body:{dataset:{runActive:"true",v141R37GlobalPerformance:""}}};
const particles=Array.from({length:700},(_,i)=>({i}));
const rings=Array.from({length:130},(_,i)=>({i}));
const floaters=Array.from({length:140},(_,i)=>({i}));
const bullets=Array.from({length:250},(_,i)=>({i}));
const enemyBullets=Array.from({length:260},(_,i)=>({i}));
let rafCallback=null;
const context={
  console,Date,Math,Number,String,Boolean,Array,Object,
  document,performance:{now:()=>clock},mode:"playing",
  particles,rings,floaters,bullets,enemyBullets,
  setInterval(){return 1},clearInterval(){},addEventListener(){},
  requestAnimationFrame(callback){rafCallback=callback;return 1},cancelAnimationFrame(){}
};
context.window=context;
vm.createContext(context);
vm.runInContext(source,context,{filename:"v10-41-r37-global-performance.js"});
const api=context.window.CCGLostSizzlerV141R37GlobalPerformance;
assert.ok(api?.state?.installed,"r37 local performance monitor must install without any network object");

const bulletsBefore=bullets.length,enemyBulletsBefore=enemyBullets.length;
const removed=api.trimVisuals();
assert.ok(removed>0,"local performance monitor must discard excess purely visual transients");
assert.ok(particles.length<=420&&rings.length<=80&&floaters.length<=96,"normal local visual budgets must be enforced");
assert.equal(bullets.length,bulletsBefore,"player projectile simulation must remain untouched");
assert.equal(enemyBullets.length,enemyBulletsBefore,"enemy projectile simulation must remain untouched");

clock+=17;rafCallback?.(clock);
clock+=17;rafCallback?.(clock);
const diagnostics=api.getDiagnostics();
assert.equal(diagnostics.mode,"game","diagnostics must identify an active local game");
assert.ok(diagnostics.fps>0&&diagnostics.frameMs>0,"diagnostics must expose live frame timing");
assert.ok(diagnostics.visualItemsRemoved>0,"diagnostics must expose visual transient reductions");

console.log("C64 Dungeon Carnage V10.41 r37 local FPS and visual-budget contract passed.");
