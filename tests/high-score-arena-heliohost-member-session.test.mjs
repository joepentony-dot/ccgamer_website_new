import test from 'node:test';
import assert from 'node:assert/strict';
import {
  acquireCrossfireHelioHostAttempt
} from '../js/ccg-c64/arena/client/heliohost-member-session.mjs';

const WEBSITE='https://www.cheekycommodoregamer.co.uk';
const UUID='01234567-89ab-4abc-8def-0123456789ab';
const NONCE='a'.repeat(64);
function json(value){return {ok:true,headers:{get:()=> 'application/json'},
  text:async()=>JSON.stringify(value)};}
test('no score handshake for ordinary user or wrong website',async()=>{
  let calls=0;const fake=async()=>{calls++;throw Error('unexpected network')};
  assert.equal(await acquireCrossfireHelioHostAttempt({fetchImpl:fake}),null);
  assert.equal(await acquireCrossfireHelioHostAttempt({
    enabled:true,websiteOrigin:'https://other.invalid',fetchImpl:fake
  }),null);
  assert.equal(await acquireCrossfireHelioHostAttempt({
    enabled:true,websiteOrigin:WEBSITE,signal:{aborted:true},fetchImpl:fake
  }),null);
  assert.equal(calls,0);
});
test('signed member and CSRF issue one HelioHost-capable client; no password or account ID posted',async()=>{
  const calls=[];
  const fetchImpl=async(url,opts)=>{
    calls.push({url,opts});
    if(url.endsWith('/v1/member/me'))return json({account:{id:UUID,role:'member',
      email:'never-forward@example.invalid'}});
    if(url.endsWith('/v1/member/csrf'))return json({csrf:NONCE});
    return json({ok:false});
  };
  const client=await acquireCrossfireHelioHostAttempt({
    enabled:true,websiteOrigin:WEBSITE,fetchImpl
  });
  assert.equal(client?.enabled,true);
  assert.equal(calls.length,2);
  assert.deepEqual(calls.map(x=>new URL(x.url).pathname),
    ['/v1/member/me','/v1/member/csrf']);
  for(const call of calls){
    assert.equal(call.opts.method,'GET');
    assert.equal(call.opts.credentials,'include');
    assert.equal(call.opts.redirect,'error');
    assert.equal(call.opts.cache,'no-store');
    assert.equal(call.opts.body,undefined);
    assert.equal(call.url.startsWith('https://api.cheekycommodoregamer.co.uk/'),true);
  }
  assert.equal(JSON.stringify(client).includes('never-forward'),false);
});
test('anonymous / stale / invalid cookie or CSRF fails closed',async()=>{
  for(const [me,csrf] of [
    [{error:'auth required'},{csrf:NONCE}],
    [{account:{id:'not-an-id'}},{csrf:NONCE}],
    [{account:{id:UUID}},{csrf:'bad'}],
    [{account:{id:UUID}},{csrf:['unexpected']}],
    [{account:{id:UUID}},{csrf:NONCE}]
  ]){
    let step=0; const invalidLast=me.account?.id===UUID && csrf.csrf===NONCE;
    const fetchImpl=async()=>{
      step++;
      if(invalidLast)return {ok:false};
      return json(step===1?me:csrf);
    };
    assert.equal(await acquireCrossfireHelioHostAttempt({
      enabled:true,websiteOrigin:WEBSITE,fetchImpl
    }),null);
  }
  assert.equal(await acquireCrossfireHelioHostAttempt({
    enabled:true,websiteOrigin:WEBSITE,
    fetchImpl:async()=>{throw new Error('offline');}
  }),null);
});
test('aborting after member probe refuses score transport',async()=>{
  const controller=new AbortController();
  let calls=0;
  const client=await acquireCrossfireHelioHostAttempt({
    enabled:true,websiteOrigin:WEBSITE,signal:controller.signal,
    fetchImpl:async()=>{
      calls++; controller.abort();
      return json({account:{id:UUID}});
    }
  });
  assert.equal(client,null);
  assert.equal(calls,1);
});
