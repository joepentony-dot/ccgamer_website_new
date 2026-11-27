// Runs only after the integration generator has written the actual upstream
// source into a disposable repository checkout. Audio samples are generated
// by the existing SID renderer; this is not physical-device audio acceptance.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
const worklet = new URL('../js/ccg-c64/core/sid/sid-worklet.js', import.meta.url);
const available = existsSync(worklet);
for (const rate of [44100,48000]) {
 test(`actual SID JS worklet renders local-ring audio at ${rate} Hz`, {skip: !available && !process.env.CI}, async () => {
  assert.ok(available, 'Expected integrated worklet in repository checkout');
  const previous = Object.fromEntries(['sampleRate','AudioWorkletProcessor','registerProcessor'].map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));
  let Processor;
  const messages=[];
  try {
   globalThis.sampleRate=rate;
   globalThis.AudioWorkletProcessor=class {constructor(){this.port={postMessage:m=>messages.push(m)}}};
   globalThis.registerProcessor=(name,ctor)=>{assert.equal(name,'sid-processor');Processor=ctor};
   await import(worklet.href+`?test_rate=${rate}`);
   const p=new Processor();
   // Exercise the real worklet message handler, with optional WASM deliberately
   // suppressed for deterministic JS fallback. WASM and audible iPhone playback
   // remain separate release gates.
   p._ensureWasm=()=>{p.engineSel='resid'};
   const data=[[0,0x34],[1,0x12],[5,0],[6,0xf0],[24,0x0f],[4,0x21]];
   const events=Uint32Array.from(data.flatMap(([reg,val])=>[100000,reg|(val<<8)]));
   p.port.onmessage({data:{type:'sid-message-init',epoch:1,sequence:1,is8580:true,secondSid:null,events}});
   assert.ok(messages.some(m=>m.type==='sid-message-ack'&&m.epoch===1&&m.sequence===1));
   let peak=0,sum=0,count=0;
   for(let block=0;block<80;block++){
    const left=new Float32Array(128),right=new Float32Array(128);
    p.process([],[[left,right]]);
    for(const v of left){assert.ok(Number.isFinite(v));peak=Math.max(peak,Math.abs(v));sum+=v*v;count++}
   }
   assert.equal(p.sidCtrl[1],data.length);assert.ok(peak>0.001&&peak<=1);assert.ok(Math.sqrt(sum/count)>0.001);
  }finally{for(const [key,descriptor] of Object.entries(previous)){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key]}}
 });
}
