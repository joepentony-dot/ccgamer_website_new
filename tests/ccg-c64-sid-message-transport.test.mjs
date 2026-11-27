import test from 'node:test';
import assert from 'node:assert/strict';
import { SidMessageTransport, SidMessageReceiver } from '../js/ccg-c64/core/sid/sid-message-transport.js';
function fixture(options = {}) {
  const pending = [], accepted = [], resets = [], acks = [];
  let snapshotCycle = 9;
  const tx = new SidMessageTransport({postMessage(msg, transfers) { pending.push(structuredClone(msg,{transfer:transfers})); }}, () => ({is8580:true,events:Uint32Array.of(snapshotCycle, 0x00000f18)}), {capacity:25,batchSize:4,...options});
  const rx = new SidMessageReceiver({ initialise: m=>resets.push(m.epoch), accept: events=>accepted.push(...events), acknowledge: m=>acks.push(m) });
  const deliver = () => {assert.ok(rx.receive(pending.shift())); assert.ok(tx.acknowledge(acks.shift()));};
  return { tx, rx, pending, accepted, resets, acks, deliver, setCycle:c=>{snapshotCycle=c;} };
}
test('starts without SharedArrayBuffer and transfers complete SID register pairs',()=>{const f=fixture(); f.tx.start(); f.deliver(); f.tx.write(0xffffffff,0xfedcba98); f.tx.write(0,0x0000ff18); f.tx.flush(); f.deliver(); assert.deepEqual(f.accepted,[9,0xf18,0xffffffff,0xfedcba98,0,0xff18]);});
test('one outstanding batch; repeated flush cannot grow MessagePort backlog',()=>{const f=fixture();f.tx.start();for(let i=0;i<100;i++)f.tx.flush();assert.equal(f.pending.length,1);f.deliver();for(let i=0;i<20;i++)f.tx.write(i,i+100);f.tx.flush();for(let i=0;i<100;i++)f.tx.flush();assert.equal(f.pending.length,1);assert.equal(f.tx.count,16);});
test('wraparound and multi-batch ordering',()=>{const f=fixture();f.tx.start();f.deliver();for(let i=0;i<23;i++)f.tx.write(i,i+100);for(let j=0;j<4;j++){f.tx.flush();f.deliver();}for(let i=23;i<39;i++)f.tx.write(i,i+100);while(f.tx.count){f.tx.flush();f.deliver();}assert.deepEqual(f.accepted.slice(2),Array.from({length:39},(_,i)=>[i,i+100]).flat());});
test('overflow reseeds current registers instead of sending stale writes',()=>{const f=fixture();f.tx.start();f.deliver();for(let i=0;i<4;i++)f.tx.write(i,i);f.tx.flush();for(let i=0;i<100;i++)f.tx.write(i,i);assert.equal(f.pending.length,1);assert.ok(f.tx.needsReseed);f.setCycle(999);f.deliver();f.tx.flush();f.deliver();assert.deepEqual(f.resets,[1,2]);assert.deepEqual(f.accepted.slice(-2),[999,0xf18]);});
test('pause and resume keep acknowledgement barrier and discard stale queued events',()=>{const f=fixture();f.tx.start();f.deliver();f.tx.write(1,1);f.tx.flush();f.tx.write(2,2);f.tx.stop();f.tx.write(3,3);f.setCycle(500);f.tx.start();assert.equal(f.pending.length,1);f.deliver();f.tx.flush();f.deliver();assert.deepEqual(f.accepted,[9,0xf18,1,1,500,0xf18]);});
test('stale acknowledgement cannot unblock a newer batch',()=>{const f=fixture();f.tx.start();f.deliver();f.tx.write(1,2);f.tx.flush();assert.equal(f.tx.acknowledge({type:'sid-message-ack',epoch:1,sequence:1}),false);assert.equal(f.tx.flush(),false);f.deliver();});
test('receiver rejects duplicate, out-of-order, malformed and stale batches',()=>{const f=fixture();f.tx.start();f.deliver();for(const m of [{epoch:1,sequence:1,events:Uint32Array.of(1,2)},{epoch:0,sequence:2,events:Uint32Array.of(1,2)},{epoch:1,sequence:3,events:Uint32Array.of(1,2)},{epoch:1,sequence:2,events:Uint32Array.of(1)},{epoch:1,sequence:2,events:[1,2]}])assert.equal(f.rx.receive({type:'sid-message-events',...m}),false);assert.equal(f.acks.length,0);});
test('reseed during suspended worklet does not pile up messages',()=>{const f=fixture();f.tx.start();for(let i=0;i<100;i++){f.tx.stop();f.tx.start();f.tx.flush();}assert.equal(f.pending.length,1);f.deliver();f.tx.flush();f.deliver();assert.deepEqual(f.resets,[1,101]);});

test('ACK watchdog times out active stalls but excludes time spent paused', () => {
  let time = 0;
  const sent = [], port = { postMessage(m) { sent.push(m); } };
  const transport = new SidMessageTransport(port, () => ({ events: Uint32Array.of(0, 1) }), { now: () => time, ackTimeoutMs: 100 });
  transport.start();
  time = 99; assert.equal(transport.flush(), false);
  transport.stop(); time = 10000; assert.equal(transport.flush(), false);
  transport.start(); time += 99; assert.equal(transport.flush(), false);
  time++; assert.throws(() => transport.flush(), /did not acknowledge/);
  assert.equal(sent.length, 1);
});

test('ACK watchdog clears on matching ACK and does not time out idle transport', () => {
  let time = 0;
  const sent = [], port = { postMessage(m) { sent.push(m); } };
  const transport = new SidMessageTransport(port, () => ({ events: Uint32Array.of(0, 1) }), { now: () => time, ackTimeoutMs: 100 });
  transport.start(); const m = sent[0];
  assert.equal(transport.acknowledge({ type: 'sid-message-ack', epoch: m.epoch, sequence: m.sequence }), true);
  time = 10000; assert.equal(transport.flush(), false);
  transport.write(2, 3); assert.equal(transport.flush(), true);
  time += 101; assert.throws(() => transport.flush(), /did not acknowledge/);
});
