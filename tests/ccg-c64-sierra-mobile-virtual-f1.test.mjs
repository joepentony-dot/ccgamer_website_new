import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const app=readFileSync(new URL('../js/ccg-c64/app.js',import.meta.url),'utf8');
// Exercise the *actual* on-screen mobile KEYBOARD pointerdown callback instead
// of testing only a duplicate helper or merely searching for source strings.
const panel=app.indexOf('if (mobileKeyboardKeys) {');
assert(panel>=0,'Mobile virtual keyboard missing');
const start=app.indexOf('button.addEventListener("pointerdown", event => {',panel);
const open=start+'button.addEventListener("pointerdown", event => {'.length;
const end=app.indexOf('\n      });',open);
assert(start>panel && end>open,'Expected complete virtual-key handler');
const callbackSource='(event)=>{'+app.slice(open,end)+'\n}';

function press({code='F1',arena=true,running=true,paused=false}={}) {
 const calls=[],button={
  classList:{add(){calls.push('highlight');}},
  setPointerCapture(){calls.push('capture');}
 };
 const context={
  code,button,running,paused,setup:{hidden:true},mobilePlayActive:true,
  mobileVirtualHeld:new Map(),pollGamepad:()=>calls.push('poll'),
  mobileVirtualBinding:()=>({col:4,row:0,shift:false,restore:false}),
  machine:{cia1:{setKey:()=>calls.push('CIA')}} ,
  performance:{now:()=>100},syncMobileMatrixBit:()=>{},
 };
 if(arena)context.activeArenaPreview={
  cancelOneClick:()=>calls.push('cancel-auto'),
  armFromUserF1:()=>calls.push('arm-local')
 };
 const fn=runInNewContext(callbackSource,context);
 fn({pointerId:7,preventDefault:()=>calls.push('preventDefault')});
 return {calls,context,fn};
}
test('virtual phone KEYBOARD F1 cancels future automatic F1 and arms local score before CIA',()=>{
 const {calls,context,fn}=press();
 const at=name=>calls.indexOf(name);
 assert(at('cancel-auto')>=0,'Must cancel waiting one-click launcher');
 assert(at('arm-local')>at('cancel-auto'),'Must arm before F1 is injected');
 assert(at('CIA')>at('arm-local'),'Actual game key must follow observer arming');
 assert.equal(context.mobileVirtualHeld.size,1);
 fn({pointerId:7,preventDefault(){}});
 assert.equal(calls.filter(x=>x==='cancel-auto').length,1,
  'Repeated pointerdown on held key must not re-arm');
});
test('non-F1 keys never arm or cancel Sierra score lifecycle',()=>{
 const {calls}=press({code:'F3'});
 assert(calls.includes('CIA'));
 assert(!calls.includes('cancel-auto'));
 assert(!calls.includes('arm-local'));
});
test('emulator without mounted Arena still accepts virtual F1 without ReferenceError',()=>{
 const {calls}=press({arena:false});
 assert(calls.includes('CIA'));
 assert(!calls.includes('arm-local'));
});
test('paused game ignores the virtual keyboard and does not arm',()=>{
 const {calls}=press({paused:true});
 assert(!calls.includes('CIA'));
 assert(!calls.includes('cancel-auto'));
});
