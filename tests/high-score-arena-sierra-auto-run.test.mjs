import test from 'node:test';
import assert from 'node:assert/strict';
import {SierraAutomaticAttempt} from '../js/ccg-c64/arena/client/sierra-auto-run-controller.mjs';

const running=Object.freeze({phase:'running',lastScore:0});
const final=(score=170)=>Object.freeze({
 kind:'sierra-crt-local-final-candidate',score,stableFrames:25,
 verified:false,eligibleForSubmission:false
});
const turn=()=>Promise.resolve();

test('disabled by default; no start, finish, cancel or HTTP',()=>{
 let calls=0;
 const transport={enabled:false,start:()=>{calls++;},finish:()=>{calls++;}};
 const t=new SierraAutomaticAttempt(transport);
 assert.equal(t.enabled,false);
 assert.equal(t.observe(running),null);
 assert.equal(t.observe({phase:'completed'},final()),null);
 t.stop();
 assert.equal(calls,0);
});
test('one complete 170-point run starts, finishes just once, and remains pending review',async()=>{
 const calls=[];
 const transport={
  enabled:true,
  start:async selection=>{
   calls.push(['start',selection]);
   return {status:'started',reviewRequired:true};
  },
  finish:async candidate=>{
   calls.push(['finish',candidate]);
   return {status:'pending-review',scoreReceived:candidate.score};
  },
  cancel:async()=>{calls.push(['cancel'])}
 };
 const run=new SierraAutomaticAttempt(transport);
 assert.equal(run.enabled,true);
 assert.equal(run.observe(running),null);
 assert.equal(run.observe(running),null);
 const completed=run.observe({phase:'completed',lastScore:170},final());
 assert(completed instanceof Promise);
 assert.deepEqual(await completed,{status:'pending-review',scoreReceived:170});
 assert.equal(run.observe({phase:'completed'},final()),null);
 run.stop();
 await turn();
 assert.deepEqual(calls.map(x=>x[0]),['start','finish']);
 assert.deepEqual(calls[0][1],{board:'alltime'});
 assert.equal(calls[1][1].verified,false);
 assert.equal(calls[1][1].eligibleForSubmission,false);
 assert.equal(run.finished,true);
});
test('real second 150-point final follows same single-use path',async()=>{
 const scores=[];
 const transport={enabled:true,
  start:async()=>({status:'started'}),
  finish:async c=>{scores.push(c.score);return {status:'pending-review'};}
 };
 const run=new SierraAutomaticAttempt(transport);
 run.observe(running);
 assert.deepEqual(await run.observe({phase:'completed'},final(150)),{status:'pending-review'});
 assert.deepEqual(scores,[150]);
});
test('score reset/invalidation cancels active nonce and does not finish',async()=>{
 const calls=[];
 const transport={enabled:true,
  start:async()=>{calls.push('start');return {status:'started'};},
  finish:async()=>{calls.push('finish');return null;},
  cancel:async()=>{calls.push('cancel');return true;}
 };
 const run=new SierraAutomaticAttempt(transport);
 run.observe(running);
 await turn();await turn();
 run.observe({phase:'invalid'});
 // The cancellation is scheduled off the resolved start promise: let the
 // event loop complete that microtask chain before asserting the call order.
 await new Promise(resolve=>setImmediate(resolve));
 assert.deepEqual(calls,['start','cancel']);
 assert.equal(run.observe({phase:'completed'},final()),null);
});
test('if a reset precedes the async start reply, later nonce is cancelled',async()=>{
 let resolveStart;
 const calls=[];
 const transport={enabled:true,
  start:()=>{calls.push('start');return new Promise(resolve=>{resolveStart=resolve;});},
  finish:async()=>{calls.push('finish');return {};},
  cancel:async()=>{calls.push('cancel');return true;}
 };
 const run=new SierraAutomaticAttempt(transport);
 run.observe(running);
 await turn();await turn();
 run.stop();
 resolveStart({status:'started'});
 await turn();await turn();await turn();
 assert.deepEqual(calls,['start','cancel']);
});
test('reset after a valid final is queued but before delayed start cancels nonce',async()=>{
 let resolveStart;const calls=[];
 const transport={enabled:true,
  start:()=>{calls.push('start');return new Promise(resolve=>{resolveStart=resolve;});},
  finish:async()=>{calls.push('finish');return {};},
  cancel:async()=>{calls.push('cancel');return true;}
 };
 const run=new SierraAutomaticAttempt(transport);
 run.observe(running);
 await turn();await turn();
 const result=run.observe({phase:'completed'},final());
 run.stop();
 resolveStart({status:'started'});
 assert.equal(await result,null);
 await turn();await turn();
 assert.deepEqual(calls,['start','cancel']);
});
test('invalid, fabricated, premature or self-certified finals are rejected',async()=>{
 const calls=[];
 const transport={enabled:true,
  start:async()=>{calls.push('start');return {status:'started'};},
  finish:async()=>{calls.push('finish');return {};},
  cancel:async()=>{calls.push('cancel');return true;}
 };
 const run=new SierraAutomaticAttempt(transport);
 run.observe(running);
 for(const invalid of [
  {...final(),kind:'diagnostic-final-score-candidate'},
  {...final(),score:-1},{...final(),score:1000000},
  {...final(),score:10.4},{...final(),stableFrames:24},
  {...final(),stableFrames:121},{...final(),verified:true},
  {...final(),eligibleForSubmission:true}
 ])assert.equal(run.observe({phase:'completed'},invalid),null);
 assert.equal(run.finished,false);
 await run.observe({phase:'completed'},final());
 assert.deepEqual(calls,['start','finish']);
});
test('failed server start cannot produce a final POST',async()=>{
 const calls=[];
 const run=new SierraAutomaticAttempt({
  enabled:true,
  start:async()=>{calls.push('start');return null;},
  finish:async()=>{calls.push('finish');return null;}
 });
 run.observe(running);
 assert.equal(await run.observe({phase:'completed'},final()),null);
 assert.deepEqual(calls,['start']);
});
