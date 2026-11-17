import test from 'node:test';
import assert from 'node:assert/strict';
import { CrossfireAutomaticAttempt } from '../js/ccg-c64/arena/client/auto-run-controller.mjs';

const fresh={started:true,lastScore:0,lastLives:2};
const terminal={
  kind:'diagnostic-final-score-candidate',gameId:'archive-02121',
  score:2325,livesAtLastHud:0,stableGraveFrames:20,
  trust:'unverified-client-session'
};
test('disabled or unsigned sessions never start or submit a score',async()=>{
  const disabled=new CrossfireAutomaticAttempt({enabled:false,start:()=>{throw Error('bad');}});
  assert.equal(disabled.enabled,false);
  assert.equal(disabled.observe(fresh),null);
  assert.equal(disabled.observe(fresh,terminal),null);
  disabled.stop();
});
test('one verified fresh game automatically starts and finishes once for review',async()=>{
  const calls=[];
  const attempt=new CrossfireAutomaticAttempt({
    enabled:true,
    start:async(v)=>{calls.push(['start',v]);return {status:'started'};},
    finish:async(v)=>{calls.push(['finish',v]);return {status:'pending-review',scoreReceived:v.score};},
    cancel:async()=>{calls.push(['cancel']);}
  });
  assert.equal(attempt.observe({started:false,lastScore:0,lastLives:2}),null);
  assert.equal(attempt.observe({started:true,lastScore:775,lastLives:2}),null);
  assert.equal(calls.length,0);
  assert.equal(attempt.observe(fresh),null);
  assert.deepEqual(await attempt.observe({...fresh,lastScore:2325,lastLives:0},terminal),
    {status:'pending-review',scoreReceived:2325});
  assert.equal(attempt.observe(fresh,terminal),null);
  assert.deepEqual(calls.map(a=>a[0]),['start','finish']);
  assert.deepEqual(calls[0][1],{board:'alltime'});
  assert.equal(calls[1][1].score,2325);
});
test('forged/wrong-game/incomplete grave candidates never reach HelioHost finish',async()=>{
  let finished=0;
  const attempt=new CrossfireAutomaticAttempt({
    enabled:true,start:async()=>({status:'started'}),
    finish:async()=>{finished++;return {status:'pending-review'};}
  });
  attempt.observe(fresh);
  for(const change of [
    {gameId:'archive-02122'},{score:-1},{trust:'verified'},
    {livesAtLastHud:1},{stableGraveFrames:1},{kind:'manually-entered-score'}
  ]) {
    assert.equal(attempt.observe(fresh,{...terminal,...change}),null);
  }
  assert.equal(finished,0);
  await attempt.observe(fresh,terminal);
  assert.equal(finished,1);
});
test('media switch cancels a signed start even if its response arrives late',async()=>{
  let release;
  const called=[];
  const attempt=new CrossfireAutomaticAttempt({
    enabled:true,
    start:()=>new Promise(resolve=>{release=resolve;}),
    finish:async()=>{called.push('finish');},
    cancel:async()=>{called.push('cancel');return true;},
  });
  attempt.observe(fresh);
  await Promise.resolve();
  attempt.stop();
  release({status:'started'});
  for(let i=0;i<5;i++)await Promise.resolve();
  assert.deepEqual(called,['cancel']);
  assert.equal(attempt.observe(fresh,terminal),null);
});
test('backend rejecting pilot never creates a result',async()=>{
  let writes=0;
  const attempt=new CrossfireAutomaticAttempt({
    enabled:true,start:async()=>null,
    finish:async()=>{writes++;}
  });
  attempt.observe(fresh);
  assert.equal(await attempt.observe(fresh,terminal),null);
  assert.equal(writes,0);
});
