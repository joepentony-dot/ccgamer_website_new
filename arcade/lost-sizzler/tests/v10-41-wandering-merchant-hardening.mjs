import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const merchantSource=fs.readFileSync(path.join(root,"js/v10-41-wandering-merchant-hardening.js"),"utf8");
const tutorialSource=fs.readFileSync(path.join(root,"js/v10-41-tutorial-action-finalizer.js"),"utf8");

assert.match(merchantSource,/MIN_VISIBLE_MS=90000/,"merchant must require ninety seconds of visible encounter time");
assert.match(merchantSource,/shopOpenFor\(m\)/,"merchant departure must understand the live shop panel");
assert.match(merchantSource,/positionForEncounter\(m\)/,"merchant must be repositioned into an encounter-safe visible cell when necessary");
assert.match(merchantSource,/document\?\.hidden===true/,"hidden tabs must not consume merchant encounter time");
assert.match(tutorialSource,/v10-41-wandering-merchant-hardening\.js\?v=/,"the r21 direct finalizer must load wandering merchant hardening with the release token");

let clock=0;
const toasts=[];
const merchant={id:"merchant-test",x:16,y:16,roomId:0,active:true,wanderingMerchant:true,rareLifeMs:5,rareMoveMs:1};
const p1={id:"p1",x:30,y:5,health:10};
const rooms=[{id:0,x:0,y:0,w:20,h:20},{id:1,x:24,y:0,w:20,h:20}];
const host={enemies:[],blockingDecor:[],generators:[],chests:[],items:[],shops:[merchant],doors:[],revision:0};
const world={rooms,map:Array.from({length:30},()=>Array(50).fill(0))};
let activeShop=null;
const roomAt=(x,y)=>rooms.find(room=>x>=room.x&&x<=room.x+room.w&&y>=room.y&&y<=room.y+room.h)?.id??null;
const documentState={hidden:false,body:{dataset:{runActive:"true"}}};
const context={
  console,
  performance:{now:()=>clock},
  setInterval:()=>1,
  clearInterval:()=>{},
  addEventListener:()=>{},
  document:documentState,
  window:{CCGLostSizzlerRareEvents:{state:{plans:{merchant}}},CCGWorld:{roomAt:(_world,x,y)=>roomAt(x,y),walkable:()=>true}},
  world,host,p1,playMode:"solo",mode:"playing",net:{isHost:true},
  allPlayers:()=>[p1],
  showToast:(title,text,tone,duration)=>toasts.push({title,text,tone,duration})
};
Object.defineProperty(context,"activeShop",{get:()=>activeShop,set:value=>{activeShop=value},configurable:true});
context.window.window=context.window;
vm.createContext(context);
vm.runInContext(merchantSource,context,{filename:"v10-41-wandering-merchant-hardening.js"});
const api=context.window.CCGLostSizzlerV141WanderingMerchant;
assert.ok(api,"merchant hardening API must install");

clock=100;api.tick(clock);
assert.equal(merchant._v141MerchantSeen,false,"an off-room merchant is not treated as seen");
assert.ok(merchant.rareLifeMs>=api.constants.PROTECTED_LIFE_MS,"the legacy floor timer is neutralised before first sighting");

p1.x=2;p1.y=2;clock=200;api.tick(clock);
assert.equal(merchant._v141MerchantSeen,true,"entering the merchant room starts the encounter");
assert.equal(merchant._v141MerchantDiscovered,true,"the live encounter records that this merchant has genuinely been discovered");
assert.ok(Math.hypot(merchant.x-p1.x,merchant.y-p1.y)<=api.constants.VISIBILITY_RADIUS,"an off-camera merchant is moved into a safe visible encounter position");
assert.equal(api.state.repositions,1,"the off-camera merchant is repositioned once");
assert.equal(toasts.filter(row=>row.title==="WANDERING MERCHANT").length,1,"arrival is announced only when the merchant is actually visible");

const seenAt=merchant._v141MerchantVisibleMs;
p1.x=30;p1.y=5;
for(let i=0;i<40;i++){clock+=250;api.tick(clock)}
assert.equal(merchant._v141MerchantVisibleMs,seenAt,"time spent away from the merchant does not consume his visit");
assert.ok(merchant.rareLifeMs>=api.constants.PROTECTED_LIFE_MS,"the merchant remains protected while off-screen");

p1.x=merchant.x-3;p1.y=merchant.y;
for(let i=0;i<80;i++){clock+=250;api.tick(clock)}
const activeVisibleTime=merchant._v141MerchantVisibleMs;
assert.ok(activeVisibleTime>=20000,"visible encounter time accumulates while the game is actively being viewed");
context.mode="paused";
for(let i=0;i<40;i++){clock+=250;api.tick(clock)}
assert.equal(merchant._v141MerchantVisibleMs,activeVisibleTime,"pausing the game does not spend the merchant visit");
context.mode="playing";documentState.hidden=true;
for(let i=0;i<40;i++){clock+=250;api.tick(clock)}
assert.equal(merchant._v141MerchantVisibleMs,activeVisibleTime,"a hidden browser tab does not spend the merchant visit");
documentState.hidden=false;
for(let i=0;i<160;i++){clock+=250;api.tick(clock)}
assert.ok(merchant._v141MerchantVisibleMs>=60000,"active visible encounter time resumes after returning to play");
assert.equal(merchant._v141MerchantWarned,true,"the player receives a thirty-second packing warning");
assert.equal(toasts.filter(row=>row.title==="MERCHANT PACKING UP SOON").length,1,"packing warning is shown once");

activeShop=merchant;
for(let i=0;i<120;i++){clock+=250;api.tick(clock)}
assert.equal(merchant._v141MerchantVisibleMs,api.constants.MIN_VISIBLE_MS,"visible encounter time reaches the ninety-second requirement");
assert.equal(merchant._v141MerchantDepartArmed,true,"departure becomes eligible only after the full visible-time requirement");
assert.equal(merchant._v141MerchantDepartCountdown,false,"the merchant cannot begin leaving while the shop is open");
assert.ok(merchant.rareLifeMs>=api.constants.PROTECTED_LIFE_MS,"the open shop protects the merchant from disappearing mid-purchase");

activeShop=null;clock+=250;api.tick(clock);
assert.equal(merchant._v141MerchantDepartCountdown,true,"closing the shop starts the final departure grace period");
assert.equal(merchant.rareLifeMs,api.constants.DEPART_GRACE_MS,"departure uses an explicit final grace period instead of vanishing immediately");
assert.equal(toasts.filter(row=>row.title==="MERCHANT CLOSING").length,1,"final departure is announced");

console.log("Lost Sizzler V10.41 wandering merchant visibility, encounter positioning, pause/tab-safe ninety-second visit and shop-safe departure checks passed.");