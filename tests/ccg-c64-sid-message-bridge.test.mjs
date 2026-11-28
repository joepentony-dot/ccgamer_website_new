import test from 'node:test';
import assert from 'node:assert/strict';
import { sidSnapshot, SidMessageBridge, SidLocalRing, attachSidReceiver } from '../js/ccg-c64/core/sid/sid-message-bridge.js';
function machine(v=0) { return { sidCycleCounter: 0xfffffffe, sidIs8580:true, mem:{sid:{regs:Uint8Array.from({length:32},(_,i)=>i+v)}}, secondSidConfig:()=>({enabled:false}) }; }
function port() { const messages=[], listeners=new Set(); return {messages,listeners,postMessage(m){messages.push(m)},addEventListener(_,f){listeners.add(f)},removeEventListener(_,f){listeners.delete(f)},emit(data){for(const f of listeners) f({data})},start(){}}; }
function ack(p,m=p.messages.at(-1)){p.emit({type:'sid-message-ack',epoch:m.epoch,sequence:m.sequence});}
test('snapshot uses live register shadow and exact cycle',()=>{const m=machine(); const s=sidSnapshot(m);assert.equal(s.events.length,50);assert.equal(s.events[0],0xfffffffe);assert.equal(s.events[49],24|(24<<8));});
test('second SID packs chip generation',()=>{let m=machine();m.secondSidConfig=()=>({enabled:true,generation:7});m.sid2={proxy:{regs:new Uint8Array(32).fill(85)}};const s=sidSnapshot(m);assert.equal(s.events.length,100);assert.equal(s.events[51],(7<<16)|(85<<8)|32);});
test('machine switch retains epoch and outstanding ACK barrier',()=>{const p=port(),b=new SidMessageBridge(p),a=machine(),c=machine(5);b.bind(a);b.setActive(true);b.bind(c);b.setActive(true);assert.equal(a.sidMessageSink,null);assert.equal(p.messages.length,1);ack(p);b.flush();assert.equal(p.messages.length,2);assert.ok(p.messages[1].epoch>p.messages[0].epoch);assert.equal(p.messages[1].events[1],5<<8);});
test('pause and warp stop event recording and resume reseeds',()=>{const p=port(),b=new SidMessageBridge(p),m=machine();b.bind(m);b.setActive(true);ack(p);b.setActive(false);m.sidMessageSink(20,99);b.flush();assert.equal(p.messages.length,1);m.mem.sid.regs[0]=73;b.setActive(true);assert.equal(p.messages[1].events[1],73<<8);});
test('idempotent active state and per-frame flush',()=>{const p=port(),b=new SidMessageBridge(p),m=machine();b.bind(m);b.setActive(true);b.setActive(true);ack(p);m.sidMessageSink(1,99);m.sidMessageSink(2,100);assert.equal(b.flush(),true);assert.deepEqual([...p.messages[1].events],[1,99,2,100]);assert.equal(b.flush(),false);});
test('reset reseeds only when active',()=>{const p=port(),b=new SidMessageBridge(p);b.bind(machine());b.reset();assert.equal(p.messages.length,0);b.setActive(true);ack(p);b.reset();assert.equal(p.messages.length,2);});
test('disposal clears source sink and ACK listener',()=>{const p=port(),b=new SidMessageBridge(p),m=machine();b.bind(m);b.dispose();assert.equal(m.sidMessageSink,null);assert.equal(p.listeners.size,0);});
test('local ring uses original packed pairs and wraps counter',()=>{const r=new SidLocalRing(4);r.ctrl[0]=0x7ffffffe;r.append(Uint32Array.of(10,11,20,21,30,31));assert.equal(r.ctrl[0],1);assert.deepEqual([...r.events],[30,31,0,0,10,11,20,21]);});
test('worklet receiver initialises renderer and queues exact events',()=>{const p={port:port(),_configureSecond(){},_fullReset(){this.reset=true},_ensureWasm(){this.wasm=true}};const receiver=attachSidReceiver(p,64);const a={type:'sid-message-init',epoch:1,sequence:1,is8580:true,events:Uint32Array.of(5,6)};assert.equal(receiver.receive(a),true);assert.equal(p.reset,true);assert.equal(p.wasm,true);assert.equal(p.sidCtrl[0],1);assert.equal(receiver.receive({...a,type:'sid-message-events',sequence:2,events:Uint32Array.of(7,8)}),true);assert.deepEqual([...p.sidRing32.slice(0,4)],[5,6,7,8]);assert.equal(p.port.messages.length,2);assert.equal(receiver.receive(a),false);});
test('new epoch clears local ring and stale data',()=>{const p={port:port(),_configureSecond(){},_fullReset(){},_ensureWasm(){}};const r=attachSidReceiver(p,64);const m={type:'sid-message-init',epoch:1,sequence:1,events:Uint32Array.of(1,2)};r.receive(m);const previous=p.sidCtrl;r.receive({...m,epoch:2,events:Uint32Array.of(3,4)});assert.notEqual(p.sidCtrl,previous);assert.deepEqual([...p.sidRing32.slice(0,4)],[3,4,0,0]);});

test('native MessageChannel transfers real typed register buffers, acknowledges and switches epochs', async () => {
  const {MessageChannel}=await import('node:worker_threads');
  const {port1,port2}=new MessageChannel();
  const processor={port:port2,_configureSecond(){},_fullReset(){},_ensureWasm(){}};
  const receiver=attachSidReceiver(processor,131072);
  const received=[];port2.on('message',m=>{received.push(m);receiver.receive(m);});
  const bridge=new SidMessageBridge(port1);
  async function waitAck(){for(let i=0;i<100;i++){if(!bridge.sender.inFlight)return;await new Promise(resolve=>setTimeout(resolve,2));}throw Error('Native port ACK timed out');}
  try {
    const a=machine(), b=machine(19);bridge.bind(a);bridge.setActive(true);await waitAck();
    assert.equal(processor.sidCtrl[0],25);assert.equal(received[0].events.byteLength,200);
    a.sidMessageSink(0xffffffff,0x123);a.sidMessageSink(0,0x456);assert.equal(bridge.flush(),true);await waitAck();
    assert.deepEqual([...processor.sidRing32.slice(50,54)],[0xffffffff,0x123,0,0x456]);
    bridge.bind(b);bridge.setActive(true);await waitAck();assert.equal(a.sidMessageSink,null);
    assert.equal(processor.sidCtrl[0],25);assert.equal(processor.sidRing32[1],19<<8);
    assert.equal(received.length,3);assert.ok(received[2].epoch>received[1].epoch);
  } finally {bridge.dispose();port1.close();port2.close();}
});

test('absent second SID is normalized to an empty configuration',()=>{
 const p={port:port(),_configureSecond(config){assert.deepEqual(config,{})},_fullReset(){},_ensureWasm(){}};
 const r=attachSidReceiver(p,64);assert.equal(r.receive({type:'sid-message-init',epoch:1,sequence:1,is8580:true,secondSid:null,events:Uint32Array.of(1,2)}),true);
});
