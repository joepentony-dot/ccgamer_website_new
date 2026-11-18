import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SIERRA_ONE_CLICK_GAME_ID, isSierraOneClickLaunchQuery, SierraOneClickStarter
} from '../js/ccg-c64/arena/sierra-one-click-launch.mjs';

const base='?game='+SIERRA_ONE_CLICK_GAME_ID+'&autoplay=1&start=1';
const addr=(row,col)=>0x400+row*40+col;
function hud(value=0,gameOver=false) {
 const ram=new Uint8Array(65536);
 for(const [row,glyph] of [[0,20],[1,21],[3,22],[4,23],
                          [13,20],[14,21],[16,22],[17,23]])ram[addr(row,39)]=glyph;
 ram.set([126,255,231,231,231,255,126,0],0x2800);
 ram.set([126,231,231,126,231,231,126,0],0x2840);
 for(const first of [6,19]) {
  [...String(value).padStart(6,'0')].forEach((digit,i)=>
    ram[addr(first+i,39)]=Number(digit));
 }
 if(gameOver)for(const [col,v] of [[10,0x13],[11,0x0a],[12,0xfc],
   [13,0x0a],[14,0xfd],[15,0x0a],[16,0x17],[20,0x00],
   [21,0x0a],[22,0xfe],[23,0x0a],[24,0x17],[25,0x0a],[26,0x16]]) {
   ram[addr(13,col)]=v;
 }
 return ram;
}
function harness(options={}) {
 const calls=[];
 const starter=new SierraOneClickStarter({
  onArm:()=>{calls.push('arm');return true;},
  onPress:()=>{calls.push('press');return true;},
  onRelease:()=>{calls.push('release');},
  ...options
 });
 return {starter,calls};
}
test('one click requires exact pinned Sierra CRT plus explicit autoplay and start',()=>{
 assert.equal(isSierraOneClickLaunchQuery(base),true);
 assert.equal(isSierraOneClickLaunchQuery('?start=1&autoplay=1&game='+SIERRA_ONE_CLICK_GAME_ID),true);
 for(const bad of [
  '', '?game='+SIERRA_ONE_CLICK_GAME_ID+'&autoplay=1',
  '?game='+SIERRA_ONE_CLICK_GAME_ID+'&start=1',
  '?game='+SIERRA_ONE_CLICK_GAME_ID+'&autoplay=1&start=yes',
  '?game='+SIERRA_ONE_CLICK_GAME_ID+'&autoplay=1&start=0',
  '?game=archive-02121&autoplay=1&start=1',
  '?game=archive-02122&autoplay=1&start=1',
  '?game=owner-crt-more-crossfiretron&autoplay=1&start=1',
  '?game='+SIERRA_ONE_CLICK_GAME_ID+'&game=archive-02122&autoplay=1&start=1',
  '?game='+SIERRA_ONE_CLICK_GAME_ID+'&autoplay=1&autoplay=1&start=1',
  '?game='+SIERRA_ONE_CLICK_GAME_ID+'&autoplay=1&start=1&start=1',
  '<script>', 'x'.repeat(600), null
 ])assert.equal(isSierraOneClickLaunchQuery(bad),false,JSON.stringify(bad));
});
test('no F1 is injected on SierraVision credits or an incomplete game-over screen',()=>{
 const {starter,calls}=harness();
 for(let i=0;i<250;i++)starter.tick(hud(0));
 assert.deepEqual(calls,[]);
 for(let i=0;i<24;i++)starter.tick(hud(0,true));
 assert.deepEqual(calls,[]);
 assert.equal(starter.phase,'waiting');
 assert.equal(starter.tick(hud(0,true)),true);
 assert.deepEqual(calls,['arm','press']);
 for(let i=0;i<7;i++)starter.tick(hud(0,true));
 assert.deepEqual(calls,['arm','press']);
 starter.tick(hud(0,true));
 assert.deepEqual(calls,['arm','press','release']);
 assert.equal(starter.phase,'done');
 for(let i=0;i<300;i++)starter.tick(hud(0,true));
 assert.deepEqual(calls,['arm','press','release']);
});
test('interrupted game-over resets countdown; no early start or repeat',()=>{
 const {starter,calls}=harness();
 for(let i=0;i<19;i++)starter.tick(hud(0,true));
 starter.tick(hud(0,false));
 for(let i=0;i<24;i++)starter.tick(hud(0,true));
 assert.deepEqual(calls,[]);
 starter.tick(hud(0,true));
 assert.deepEqual(calls,['arm','press']);
 starter.cancel();
 assert.deepEqual(calls,['arm','press','release']);
 for(let i=0;i<40;i++)starter.tick(hud(0,true));
 assert.deepEqual(calls,['arm','press','release']);
});
test('manual start cancels a waiting automatic start before F1 can be injected',()=>{
 const {starter,calls}=harness();
 for(let i=0;i<10;i++)starter.tick(hud(0,true));
 starter.cancel();
 for(let i=0;i<90;i++)starter.tick(hud(0,true));
 assert.deepEqual(calls,[]);
 assert.equal(starter.phase,'cancelled');
});
test('no key injection after deadline, failed arming, failed press or invalid memory',()=>{
 const timeout=harness({maxWaitFrames:25});
 for(let i=0;i<26;i++)timeout.starter.tick(hud(0));
 assert.deepEqual(timeout.calls,[]);
 assert.equal(timeout.starter.phase,'cancelled');
 const badArm=harness({onArm:()=>{badArm.calls.push('reject-arm');return false;}});
 for(let i=0;i<25;i++)badArm.starter.tick(hud(0,true));
 assert.deepEqual(badArm.calls,['reject-arm']);
 assert.equal(badArm.starter.phase,'cancelled');
 const noMachine=harness({onPress:()=>{noMachine.calls.push('reject-press');return false;}});
 for(let i=0;i<25;i++)noMachine.starter.tick(hud(0,true));
 assert.deepEqual(noMachine.calls,['arm','reject-press']);
 assert.equal(noMachine.starter.phase,'cancelled');
 const malformed=harness();
 for(let i=0;i<25;i++)malformed.starter.tick(new Uint8Array(65536));
 assert.deepEqual(malformed.calls,[]);
});
test('invalid callback types and PAL-frame bounds fail closed',()=>{
 assert.throws(()=>new SierraOneClickStarter(),TypeError);
 assert.throws(()=>harness({stableFrames:1}),RangeError);
 assert.throws(()=>harness({holdFrames:0}),RangeError);
 assert.throws(()=>harness({maxWaitFrames:10001}),RangeError);
});
