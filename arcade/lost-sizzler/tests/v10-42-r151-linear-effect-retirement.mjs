import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const source=readFileSync(new URL("../js/game-play.js",import.meta.url),"utf8");
const start=source.indexOf("function updateEffects(dt){");
const end=source.indexOf("\nfunction updateEmergencyAmmo(",start);
assert.ok(start>=0&&end>start,"Load the actual canonical visual-effects update owner");

let now=5000;
const particles=[],rings=[],floaters=[];
const scope={
  particles,rings,floaters,
  MAX_GAMEPLAY_PARTICLES:32,MAX_GAMEPLAY_RINGS:16,
  performance:{now:()=>now}
};
vm.createContext(scope);
vm.runInContext(source.slice(start,end),scope,{filename:"game-play.js::updateEffects"});

// Catch a regression to repeated Array.splice() on burst retirement: large
// waves of simultaneous expiry must be compacted in place in linear time.
for(const rows of [particles,rings,floaters]){
  Object.defineProperty(rows,"splice",{value:()=>{throw Error("Repeated splice during visual effect retirement")},configurable:true});
}
for(let i=0;i<1200;i++)particles.push({id:`expired-p-${i}`,x:1,y:1,vx:1,vy:2,drag:.9,life:1});
for(let i=0;i<42;i++)particles.push({id:`live-p-${i}`,x:1,y:2,vx:2,vy:3,drag:.5,life:2000});
particles.push({id:"wall-expired-p",x:1,y:1,vx:0,vy:0,drag:1,life:2000,__ccgWallBornAt:1000,__ccgWallLifeMs:100});
for(let i=0;i<600;i++)rings.push({id:`expired-r-${i}`,r:3,max:30,life:1});
for(let i=0;i<21;i++)rings.push({id:`live-r-${i}`,r:3,max:30,life:2000});
rings.push({id:"wall-expired-r",r:3,max:30,life:2000,__ccgWallBornAt:1000,__ccgWallLifeMs:100});
for(let i=0;i<600;i++)floaters.push({id:`expired-f-${i}`,y:100,life:1});
for(let i=0;i<103;i++)floaters.push({id:`live-f-${i}`,y:100,life:2000,ownerId:i%2?"player":null});
floaters.push({id:"wall-expired-f",y:100,life:2000,__ccgWallBornAt:1000,__ccgWallLifeMs:100});

scope.updateEffects(16);
assert.deepEqual(particles.map(x=>x.id),Array.from({length:32},(_,i)=>`live-p-${i+10}`),
  "Particle overflow keeps the newest live entries in original draw order");
assert.deepEqual(rings.map(x=>x.id),Array.from({length:16},(_,i)=>`live-r-${i+5}`),
  "Ring overflow keeps the newest live entries in original draw order");
assert.deepEqual(floaters.map(x=>x.id),Array.from({length:96},(_,i)=>`live-f-${i+7}`),
  "Floater overflow keeps the newest live entries in original draw order");
assert.equal(particles[0].x,3,"Particles still advance position");
assert.equal(particles[0].y,5,"Particles still advance both axes");
assert.equal(particles[0].vx,1,"Particle drag remains unchanged");
assert.equal(particles[0].life,1984,"Effect simulation still reduces lifetime");
assert.equal(rings[0].r,3+(30-3)*.12,"Ring expansion remains unchanged");
assert.equal(floaters[0].y,100,"Player-owned labels stay anchored");
assert.equal(floaters[1].y,100-16*.018,"World labels continue drifting upward");
assert.ok(particles.every(x=>Number.isFinite(x.__ccgWallBornAt)),
  "Retained effects keep wall-clock expiry metadata");

now+=10000;
scope.updateEffects(1);
assert.equal(particles.length,0,"Expired particle lifetimes cannot persist indefinitely");
assert.equal(rings.length,0,"Expired ring lifetimes cannot persist indefinitely");
assert.equal(floaters.length,0,"Expired floater lifetimes cannot persist indefinitely");
scope.updateEffects(16);
assert.equal(floaters.length,0,"Empty effect queues remain safe");

// Preserve the old wall-age fallback for legacy malformed FX: NaN lifetime
// was not removed by the original <=0 check, but must expire by wall clock.
floaters.push({id:"legacy-nonnumeric-f",y:100,life:NaN,ownerId:"player"});
scope.updateEffects(16);
assert.equal(floaters.length,1,"Legacy nonnumeric effect gets its bounded wall-age grace");
now+=500;
scope.updateEffects(16);
assert.equal(floaters.length,0,"Legacy nonnumeric effect still expires by wall clock");

console.log("R151 source-executed linear visual-effect retirement: 18 assertions passed");
