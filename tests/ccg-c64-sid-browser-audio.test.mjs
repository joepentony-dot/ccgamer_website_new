import test from 'node:test';
import assert from 'node:assert/strict';
import { SidBrowserAudio } from '../js/ccg-c64/core/sid/sid-browser-audio.js';
function setup({blocked=false,load=()=>Promise.resolve(),timeoutMs=100}={}){
  const calls=[]; const machine={sidIs8580:true,sidCycleCounter:0,mem:{sid:{regs:new Uint8Array(32)}},secondSidConfig:()=>({enabled:false})};
  class Context {constructor(){this.state='suspended';this.destination={};this.currentTime=0;this.audioWorklet={addModule:()=>{calls.push('load');return load()}};this.listeners={};}addEventListener(n,f){this.listeners[n]=f}resume(){calls.push('resume');if(!blocked){this.state='running';this.listeners.statechange?.()}return Promise.resolve()}close(){calls.push('close');this.state='closed';return Promise.resolve()}createGain(){return {gain:{value:0,setTargetAtTime(v){this.value=v}},connect(){},disconnect(){}}}}
  class Node {constructor(){this.messages=[];this.listenersByType=new Set();this.port={postMessage:(m)=>this.messages.push(m),addEventListener:(_,f)=>this.listenersByType.add(f),removeEventListener:(_,f)=>this.listenersByType.delete(f),start(){}};this.ack=()=>{const m=this.messages.at(-1);for(const f of this.listenersByType)f({data:{type:"sid-message-ack",epoch:m.epoch,sequence:m.sequence}})};this.listeners={}}connect(){}disconnect(){}addEventListener(n,f){this.listeners[n]=f}}
  const audio=new SidBrowserAudio({browser:{AudioContext:Context,AudioWorkletNode:Node},workletUrl:'/test.js',timeoutMs});return {audio,calls,machine};
}
test('resume requested synchronously before worklet loading',async()=>{const {audio,calls,machine}=setup();const pending=audio.bind(machine);assert.deepEqual(calls,['resume']);await pending;assert.deepEqual(calls.slice(0,2),['resume','load']);audio.setState({running:true});assert.equal(audio.status,'SYNCING SOUND');assert.equal(audio.gain.gain.value,0);audio.node.ack();assert.equal(audio.status,'SID ACTIVE');assert.equal(audio.gain.gain.value,.72);});
test('blocked autoplay displays enable, not false active or mute',async()=>{const {audio,machine}=setup({blocked:true});await audio.bind(machine);audio.setState({running:true});assert.equal(audio.status,'TAP TO ENABLE SOUND');assert.equal(audio.gain.gain.value,0);await audio.activate(machine);assert.equal(audio.muted,false);});
test('nonisolated route seeds registers and pauses/resumes the sender',async()=>{const {audio,machine}=setup();await audio.bind(machine);audio.setState({running:true});assert.equal(audio.node.messages[0].type,'sid-message-init');assert.equal(audio.bridge.enabled,true);audio.setState({held:true});assert.equal(audio.bridge.enabled,false);assert.equal(audio.gain.gain.value,0);audio.setState({held:false});assert.equal(audio.bridge.enabled,true);});
test('shared SID route posts original init and reset/resync commands',async()=>{const {audio,machine}=setup();machine.sidShared={};await audio.bind(machine);assert.equal(audio.bridge,null);assert.equal(audio.node.messages[0].type,'init');audio.reset();audio.resync();assert.deepEqual(audio.node.messages.map(m=>m.type),['init','reset','resync']);});
test('explicit sound click mutes/unmutes and keeps pause silent',async()=>{const {audio,machine}=setup();await audio.bind(machine);audio.setState({running:true});await audio.activate(machine);assert.equal(audio.muted,true);assert.equal(audio.gain.gain.value,0);audio.setState({held:true});await audio.activate(machine);assert.equal(audio.muted,false);assert.equal(audio.gain.gain.value,0);});
test('module load timeout closes graph and exposes retry',async()=>{const {audio,machine,calls}=setup({load:()=>new Promise(()=>{}),timeoutMs:10});assert.equal(await audio.bind(machine),false);assert.ok(calls.includes('close'));assert.equal(audio.status,'TAP TO RETRY SOUND');});
test('processor error cleans graph and retry creates a new one',async()=>{const {audio,machine}=setup();await audio.bind(machine);audio.setState({running:true});const old=audio.node;old.listeners.processorerror();assert.equal(audio.status,'TAP TO RETRY SOUND');assert.equal(audio.node,null);assert.equal(await audio.activate(machine),true);assert.notEqual(audio.node,old);});
test('backgrounding silences output and power off detaches machine',async()=>{const {audio,machine}=setup();await audio.bind(machine);audio.setState({running:true,hidden:true});assert.equal(audio.gain.gain.value,0);audio.setState({hidden:false});audio.node.ack();assert.equal(audio.gain.gain.value,.72);audio.powerOff();assert.equal(machine.sidMessageSink,null);assert.equal(audio.gain.gain.value,0);});

test('browser closing the context exposes retry and reconstructs the graph', async () => {
  const {audio,machine}=setup(); await audio.bind(machine); audio.setState({running:true});
  const old=audio.context; old.state='closed'; old.listeners.statechange();
  assert.equal(audio.status,'TAP TO RETRY SOUND'); assert.equal(audio.ready,false);
  assert.equal(machine.sidMessageSink,null); assert.equal(await audio.activate(machine),true);
  assert.notEqual(audio.context,old); audio.node.ack(); assert.equal(audio.status,'SID ACTIVE');
});
test('lost acknowledgement fails safely and a sound retry replaces the stalled port', async () => {
  const {audio,machine}=setup(); await audio.bind(machine); audio.setState({running:true});
  const old=audio.node;
  const sender=audio.bridge.sender; sender.now=()=>5000; sender.waitSince=0;
  audio.flush(); assert.equal(audio.status,'TAP TO RETRY SOUND'); assert.equal(audio.node,null);
  assert.equal(machine.sidMessageSink,null); assert.equal(await audio.activate(machine),true);
  assert.notEqual(audio.node,old);
});

test('output remains silent until current snapshot ACK, including after machine switch', async () => {
 const {audio,machine}=setup();await audio.bind(machine);audio.setState({running:true});
 assert.equal(audio.gain.gain.value,0);const old=audio.node.messages.at(-1);audio.node.ack();assert.equal(audio.gain.gain.value,.72);
 const other={...machine,mem:{sid:{regs:new Uint8Array(32)}}};await audio.bind(other);assert.equal(audio.gain.gain.value,0);
 for(const f of audio.node.listenersByType)f({data:{type:'sid-message-ack',epoch:old.epoch,sequence:old.sequence}});
 assert.equal(audio.gain.gain.value,0);audio.node.ack();assert.equal(audio.gain.gain.value,.72);
});
