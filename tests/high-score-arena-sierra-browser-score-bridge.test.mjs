import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CCG_SITE_ORIGIN,isSierraHelioHostScoreIntent,SierraHelioHostScoreBridge
} from '../js/ccg-c64/arena/client/sierra-browser-score-bridge.mjs';
const GAME='owner-crt-more-crossfiresierraonline-0c60e852f438';
const query='?game='+GAME+'&autoplay=1&start=1&scores=1';
const final=score=>({
  kind:'sierra-crt-local-final-candidate',score,stableFrames:25,
  verified:false,eligibleForSubmission:false
});
const nextTurn=()=>new Promise(resolve=>setImmediate(resolve));

test('score intent is explicitly opted in for exact Sierra CRT and real CCG origin',()=>{
 assert.equal(isSierraHelioHostScoreIntent(query,CCG_SITE_ORIGIN),true);
 assert.equal(isSierraHelioHostScoreIntent('?game='+GAME+'&scores=1',CCG_SITE_ORIGIN),true);
 for(const wrong of [
  '',null,'?scores=1','?game=archive-02121&scores=1',
  '?game=archive-02122&scores=1','?game='+GAME+'&scores=0',
  '?game='+GAME+'&scores=1&scores=1',
  '?game='+GAME+'&game=archive-02121&scores=1',
  '?game='+GAME+'&autoplay=1&autoplay=1&scores=1',
  '?game='+GAME+'&start=1&start=1&scores=1',
  '?game='+GAME+'&scores=1'.repeat(100)
 ])assert.equal(isSierraHelioHostScoreIntent(wrong,CCG_SITE_ORIGIN),false,JSON.stringify(wrong));
 for(const origin of ['','https://cheekycommodoregamer.co.uk','http://www.cheekycommodoregamer.co.uk','https://attacker.example']) {
  assert.equal(isSierraHelioHostScoreIntent(query,origin),false);
 }
});
test('without explicit opt-in no member GET, score POST or public board request is possible',async()=>{
 let n=0;const bridge=new SierraHelioHostScoreBridge({
  onStatus:()=>{n++;},acquire:async()=>{n++;return {enabled:true}},
  readBoard:async()=>{n++;return {status:'ranked'}}
 });
 assert.equal(bridge.enabled,false);
 assert.equal(await bridge.connect(),false);
 bridge.armed();
 bridge.observe({phase:'running',lastScore:0});
 bridge.observe({phase:'completed',lastScore:170},final(170));
 assert.equal(await bridge.loadBoard(),null);
 bridge.stop();
 assert.equal(n,0);
});
test('approved-only Sierra public rankings load even when member sign-in fails',async()=>{
 const models=[],statuses=[],requests=[];
 const bridge=new SierraHelioHostScoreBridge({
  enabled:true,origin:CCG_SITE_ORIGIN,
  onStatus:s=>statuses.push(s),
  onBoard:(board,model)=>models.push([board,model]),
  acquire:async()=>{requests.push('member');return null;},
  readBoard:async({board})=>{
   requests.push('public:'+board);
   return {status:'ranked',rows:[{rank:1,name:'Approved Player',score:170}]};
  }
 });
 assert.equal(await bridge.connect(),false);
 await nextTurn();
 assert.deepEqual(requests,['public:alltime','member']);
 assert.deepEqual(models,[['alltime',{status:'ranked',
  rows:[{rank:1,name:'Approved Player',score:170}]}]]);
 assert(statuses.includes('HELIOHOST UNAVAILABLE OR SIGN-IN REQUIRED'));
 assert.equal(bridge.connected,false);
 assert.equal(bridge.armed(),false);
 bridge.observe({phase:'completed',lastScore:170},final(170));
 assert.equal((await bridge.loadBoard('challenge')).status,'ranked');
 assert.deepEqual(requests,['public:alltime','member','public:challenge']);
 bridge.stop();
});

test('one authenticated 170-point run submits ONCE and only pending-review receipt is displayed',async()=>{
 const calls=[],statuses=[],models=[];
 const transport={enabled:true,
  start:async sel=>{calls.push(['start',sel]);return {status:'started'};},
  finish:async candidate=>{
   calls.push(['finish',candidate]);
   return {status:'pending-review',scoreReceived:170};
  },
  cancel:async()=>{calls.push(['cancel']);return true;}
 };
 const bridge=new SierraHelioHostScoreBridge({
  enabled:true,origin:CCG_SITE_ORIGIN,
  onStatus:s=>statuses.push(s),
  onBoard:(board,model)=>models.push({board,model}),
  acquire:async()=>transport,
  readBoard:async({board})=>({status:'ranked',rows:[{rank:1,name:'Member',score:150}],board})
 });
 assert.equal(await bridge.connect(),true);
 assert.equal(bridge.connected,true);
 assert.equal(bridge.armed(),true);
 bridge.observe({phase:'armed',lastScore:null});
 bridge.observe({phase:'running',lastScore:0});
 await nextTurn();
 bridge.observe({phase:'running',lastScore:10});
 bridge.observe({phase:'completed',lastScore:170},final(170));
 await nextTurn();
 assert.equal(bridge.finished,true);
 assert.deepEqual(calls.map(x=>x[0]),['start','finish']);
 assert.equal(calls[0][1].board,'alltime');
 assert.equal(calls[1][1].score,170);
 assert.equal(calls[1][1].verified,false);
 assert(statuses.includes('SCORE 000170 RECEIVED · PENDING REVIEW'));
 assert(models.some(x=>x.board==='alltime'));
 assert.equal(bridge.armed(),false,'one use per page; no second stale member receipt');
 bridge.observe({phase:'completed'},final(170));
 assert.equal(calls.length,2);
 bridge.stop();
});
test('a successful member handshake cannot start a run before verified F1',async()=>{
 const calls=[];
 const bridge=new SierraHelioHostScoreBridge({
  enabled:true,origin:CCG_SITE_ORIGIN,
  acquire:async()=>({enabled:true,
   start:async()=>{calls.push('start');return {status:'started'};},
   finish:async()=>{calls.push('finish');return null;}
  }),
  readBoard:async()=>({status:'unavailable'})
 });
 assert.equal(await bridge.connect(),true);
 bridge.observe({phase:'running',lastScore:0});
 bridge.observe({phase:'completed',lastScore:20},final(20));
 await nextTurn();
 assert.deepEqual(calls,[],'member login is not sufficient to arm scoring');
 assert.equal(bridge.armed(),true);
 bridge.observe({phase:'running',lastScore:0});
 bridge.observe({phase:'completed',lastScore:20},final(20));
 await nextTurn();
 assert.deepEqual(calls,['start','finish'],'only explicit F1 permits one start and one pending finish');
 bridge.stop();
});
test('server denial never claims receipt, even for a legitimate local game-over',async()=>{
 const statuses=[],calls=[];
 const bridge=new SierraHelioHostScoreBridge({
  enabled:true,origin:CCG_SITE_ORIGIN,onStatus:s=>statuses.push(s),
  acquire:async()=>({enabled:true,
   start:async()=>{calls.push('start');return null;},
   finish:async()=>{calls.push('finish');return {status:'pending-review',scoreReceived:150};}
  }),
  readBoard:async()=>({status:'unavailable'})
 });
 assert.equal(await bridge.connect(),true);
 assert.equal(bridge.armed(),true);
 bridge.observe({phase:'running',lastScore:0});
 bridge.observe({phase:'completed',lastScore:150},final(150));
 await nextTurn();
 assert.deepEqual(calls,['start']);
 assert(statuses.includes('SUBMISSION NOT CONFIRMED · LOCAL SCORE ONLY'));
 bridge.stop();
});
test('missing member auth, unavailable host or discontinued game never submits anything',async()=>{
 for(const value of [null,{enabled:false},undefined]){
  const statuses=[];
  const bridge=new SierraHelioHostScoreBridge({
   enabled:true,origin:CCG_SITE_ORIGIN,onStatus:s=>statuses.push(s),
   acquire:async()=>value
  });
  assert.equal(await bridge.connect(),false);
  assert.equal(bridge.connected,false);
  assert.equal(bridge.armed(),false);
  assert(statuses.some(s=>s.includes('SIGN-IN REQUIRED')));
  bridge.stop();
 }
});
test('reset aborts an outstanding member handshake and discards late replies',async()=>{
 let fulfill;let cancelled=0;
 const bridge=new SierraHelioHostScoreBridge({
  enabled:true,origin:CCG_SITE_ORIGIN,
  acquire:()=>new Promise(resolve=>{fulfill=resolve;})
 });
 const future=bridge.connect();
 bridge.stop();
 fulfill({enabled:true,invalidate:()=>{cancelled++;}});
 assert.equal(await future,false);
 assert.equal(cancelled,1);
 assert.equal(bridge.connected,false);
 assert.equal(await bridge.loadBoard('alltime'),null);
});
test('invalidated game cancels server attempt and cannot finish or be rearmed',async()=>{
 const actions=[];
 const bridge=new SierraHelioHostScoreBridge({
  enabled:true,origin:CCG_SITE_ORIGIN,
  acquire:async()=>({enabled:true,
   start:async()=>{actions.push('start');return {status:'started'};},
   finish:async()=>{actions.push('finish');return null;},
   cancel:async()=>{actions.push('cancel');return true;}
  }),
  readBoard:async()=>({status:'unavailable'})
 });
 await bridge.connect();
 bridge.armed();
 bridge.observe({phase:'running',lastScore:0});
 await nextTurn();
 bridge.observe({phase:'invalid'});
 await nextTurn();
 assert.deepEqual(actions,['start','cancel']);
 assert.equal(bridge.armed(),false);
 bridge.observe({phase:'completed',lastScore:150},final(150));
 assert(!actions.includes('finish'));
 bridge.stop();
});
