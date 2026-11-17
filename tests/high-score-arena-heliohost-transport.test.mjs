import test from 'node:test';
import assert from 'node:assert/strict';
import {
  HelioHostArenaAttempt,makeArenaStartRequest,makeArenaFinishRequest,
  CCG_ARENA_API_ORIGIN,CCG_ARENA_INTAKE_PATH
} from '../scripts/high-score-arena/client/heliohost-attempt.mjs';

const UUID='01234567-89ab-4abc-8def-0123456789ab', NONCE='a'.repeat(64);
const diagnostic={
  kind:'diagnostic-final-score-candidate',
  gameId:'archive-02121',score:2325,livesAtLastHud:0,
  stableGraveFrames:20,trust:'unverified-client-session'
};
test('exact edition/board start; challenge slug and no manual-score start',()=>{
  assert.equal(makeArenaStartRequest()?.gameKey,'c64-crossfire-atlantis');
  assert.equal(makeArenaStartRequest()?.mediaBytes,23637);
  assert.equal(makeArenaStartRequest({board:'challenge',challengeSlug:'crossfire-week-one'})?.board,'challenge');
  assert.equal(makeArenaStartRequest({board:'challenge'}),null);
  assert.equal(makeArenaStartRequest({board:'alltime',challengeSlug:'test'}),null);
  assert.equal(makeArenaFinishRequest({attemptId:UUID,nonce:NONCE},diagnostic)?.score,2325);
  assert.equal(makeArenaFinishRequest({attemptId:UUID,nonce:'not-a-nonce'},diagnostic),null);
  assert.equal(makeArenaFinishRequest({attemptId:UUID,nonce:NONCE},{...diagnostic,gameId:'archive-02122'}),null);
  assert.equal(makeArenaFinishRequest({attemptId:UUID,nonce:NONCE},{...diagnostic,stableGraveFrames:1}),null);
});
test('disabled or unsigned frontend never makes a network request',async()=>{
  let calls=0;const fake=async()=>{calls++;throw new Error('Unexpected request');};
  const disabled=new HelioHostArenaAttempt({fetchImpl:fake});
  assert.equal(await disabled.start(),null);
  assert.equal(await disabled.finish(diagnostic),null);
  const missingCsrf=new HelioHostArenaAttempt({
    enabled:true,authenticated:true,websiteOrigin:'https://www.cheekycommodoregamer.co.uk',
    fetchImpl:fake
  });
  assert.equal(await missingCsrf.start(),null);
  assert.equal(calls,0);
});
test('future HelioHost network contract: one automatic final score, pending-review only',async()=>{
  const calls=[];const transport=new HelioHostArenaAttempt({
    enabled:true,authenticated:true,csrfToken:'b'.repeat(64),
    websiteOrigin:'https://www.cheekycommodoregamer.co.uk',
    fetchImpl:async(url,opts)=>{
      calls.push({url,opts,body:JSON.parse(opts.body)});
      const body=JSON.parse(opts.body);
      return {
        ok:true,json:async()=>body.action==='start'
          ?{ok:true,status:'started',attemptId:UUID,nonce:NONCE,publicRankingUpdated:false}
          :{ok:true,status:'pending-review',scoreReceived:2325,publicRankingUpdated:false}
      };
    }
  });
  assert.equal(transport.enabled,true);
  assert.equal((await transport.start())?.status,'started');
  assert.equal(await transport.start(),null);
  assert.deepEqual(await transport.finish(diagnostic),{status:'pending-review',scoreReceived:2325});
  assert.equal(await transport.finish(diagnostic),null);
  assert.equal(calls.length,2);
  for(const item of calls){
    assert.equal(item.url,CCG_ARENA_API_ORIGIN+CCG_ARENA_INTAKE_PATH);
    assert.equal(item.opts.credentials,'include');
    assert.equal(item.opts.method,'POST');
    assert.equal(item.opts.headers['X-CCG-CSRF'],'b'.repeat(64));
    assert.equal(item.body.action==='start'||item.body.action==='finish',true);
    assert.equal('accountId' in item.body,false);
  }
});
test('cancelling invalidates attempt locally even when remote cancellation fails',async()=>{
  let count=0;
  const transport=new HelioHostArenaAttempt({
    enabled:true,authenticated:true,csrfToken:'b'.repeat(64),
    websiteOrigin:'https://www.cheekycommodoregamer.co.uk',
    fetchImpl:async(_url,opts)=>{
      count++;
      if(count===1)return {ok:true,json:async()=>({
        ok:true,status:'started',attemptId:UUID,nonce:NONCE,publicRankingUpdated:false
      })};
      throw new Error('offline');
    }
  });
  await transport.start();
  assert.equal(await transport.cancel(),false);
  assert.equal(transport.active,false);
  assert.equal(await transport.finish(diagnostic),null);
});
