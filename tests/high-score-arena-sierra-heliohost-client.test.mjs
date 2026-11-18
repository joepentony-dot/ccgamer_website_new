import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
 SIERRA_API_ORIGIN,SIERRA_ATTEMPT_ROUTE,SIERRA_GAME_KEY,SIERRA_CATALOG_ID,
 SIERRA_MEDIA_SHA256,SIERRA_MEDIA_BYTES,sierraStartPayload,sierraFinishPayload,
 SierraPendingAttempt,acquireSierraAttempt
} from '../js/ccg-c64/arena/client/sierra-heliohost-attempt.mjs';
import {
 sierraLeaderboardUrl,readHelioHostSierraBoard
} from '../js/ccg-c64/arena/client/sierra-heliohost-board.mjs';
const SITE='https://www.cheekycommodoregamer.co.uk';
const UUID='01234567-89ab-4abc-8def-0123456789ab',NONCE='a'.repeat(64);
const CSRF='b'.repeat(64);
const final=(score=170)=>({
 kind:'sierra-crt-local-final-candidate',score,stableFrames:25,
 verified:false,eligibleForSubmission:false
});
const receipt={attemptId:UUID,nonce:NONCE};
const reply=value=>({
 ok:true,headers:{get:()=> 'application/json'},
 text:async()=>JSON.stringify(value)
});

test('exact Sierra media protocol cannot be confused with Atlantis PRG or Tron',()=>{
 assert.equal(SIERRA_GAME_KEY,'c64-crossfire-sierra-online');
 assert.equal(SIERRA_CATALOG_ID,'owner-crt-more-crossfiresierraonline-0c60e852f438');
 assert.equal(SIERRA_MEDIA_BYTES,65728);
 assert.equal(SIERRA_MEDIA_SHA256,'0c60e852f438ab9b6b325a1ecedb69ae1bbff9d1519584e52d6bb31df26c14ab');
 const start=sierraStartPayload();
 assert.equal(start.action,'start');
 assert.equal(start.gameKey,SIERRA_GAME_KEY);
 assert.equal(start.catalogId,SIERRA_CATALOG_ID);
 assert.equal(start.mediaSha256,SIERRA_MEDIA_SHA256);
 assert.equal(start.board,'alltime');
 assert.equal(start.challengeSlug,null);
 assert.equal(sierraStartPayload({board:'challenge',challengeSlug:'sierra-week-one'}).board,'challenge');
 for(const p of [{board:'invalid'},{board:'challenge'},{board:'alltime',challengeSlug:'fake'}])
  assert.equal(sierraStartPayload(p),null);
});
test('only genuine local candidate-shaped terminal values yield pending-review wire data',()=>{
 const result=sierraFinishPayload(receipt,final());
 assert.equal(result.score,170);
 assert.deepEqual(result.diagnostic,{
  kind:'sierra-crt-local-final-candidate',gameId:SIERRA_CATALOG_ID,
  mediaSha256:SIERRA_MEDIA_SHA256,score:170,stableGameOverFrames:25,
  trust:'unverified-client-session'
 });
 assert.equal(sierraFinishPayload(receipt,final(150)).score,150);
 for(const bad of [
  {...receipt,nonce:'invalid'},
  {...receipt,attemptId:'not-a-uuid'}
 ])assert.equal(sierraFinishPayload(bad,final()),null);
 for(const candidate of [
  {...final(),kind:'diagnostic-final-score-candidate'},
  {...final(),score:-1},{...final(),score:1000000},
  {...final(),stableFrames:24},{...final(),stableFrames:121},
  {...final(),verified:true},{...final(),eligibleForSubmission:true},
  {...final(),score:170.5}
 ])assert.equal(sierraFinishPayload(receipt,candidate),null);
});
test('unreleased, anonymous or missing-CSRF transport sends zero requests',async()=>{
 let requests=0;const fetchImpl=async()=>{requests++;throw Error('No network permitted')};
 for(const init of [
  {},{enabled:true,authenticated:true,csrfToken:CSRF,websiteOrigin:'https://evil.example'},
  {enabled:true,authenticated:true,websiteOrigin:SITE},
  {enabled:true,authenticated:false,csrfToken:CSRF,websiteOrigin:SITE}
 ]) {
  const t=new SierraPendingAttempt({...init,fetchImpl});
  assert.equal(t.enabled,false);
  assert.equal(await t.start(),null);
  assert.equal(await t.finish(final()),null);
  assert.equal(await t.cancel(),false);
 }
 assert.equal(await acquireSierraAttempt({fetchImpl,websiteOrigin:SITE}),null);
 assert.equal(requests,0);
 const preview=readFileSync(new URL('../js/ccg-c64/arena-preview.js',import.meta.url),'utf8');
 assert.doesNotMatch(preview,/sierra-heliohost-attempt|acquireSierraAttempt/);
});
test('signed-in session + CSRF handshake uses server member identity without sending account ID',async()=>{
 const request=[];
 const fetchImpl=async(url,options)=>{
  request.push({url,options});
  if(url.endsWith('/v1/member/me'))return reply({account:{id:UUID}});
  if(url.endsWith('/v1/member/csrf'))return reply({csrf:CSRF});
  return reply({});
 };
 const t=await acquireSierraAttempt({enabled:true,websiteOrigin:SITE,fetchImpl});
 assert.equal(t?.enabled,true);
 assert.equal(request.length,2);
 assert(request.every(x=>x.options.credentials==='include' && x.options.redirect==='error'));
 assert(request.every(x=>x.options.method==='GET'));
 assert(request.every(x=>!('accountId' in x.options)));
});
test('one exact member nonce accepts just one local final and remains PRIVATE',async()=>{
 const requests=[];
 const t=new SierraPendingAttempt({
  enabled:true,authenticated:true,csrfToken:CSRF,websiteOrigin:SITE,
  fetchImpl:async(url,options)=>{
   const body=JSON.parse(options.body);
   requests.push({url,options,body});
   if(body.action==='start')return reply({
    ok:true,status:'started',attemptId:UUID,nonce:NONCE,
    publicRankingUpdated:false,reviewRequired:true
   });
   if(body.action==='finish')return reply({
    ok:true,status:'pending-review',scoreReceived:170,
    publicRankingUpdated:false,reviewRequired:true
   });
   throw Error('Unexpected action');
  }
 });
 assert.equal((await t.start())?.status,'started');
 assert.equal(t.active,true);
 assert.equal(await t.start(),null);
 assert.deepEqual(await t.finish(final()),{status:'pending-review',scoreReceived:170});
 assert.equal(t.active,false);
 assert.equal(await t.finish(final()),null);
 assert.equal(requests.length,2);
 assert(requests.every(x=>x.url===SIERRA_API_ORIGIN+SIERRA_ATTEMPT_ROUTE));
 assert(requests.every(x=>x.options.credentials==='include'&&x.options.method==='POST'));
 assert(requests.every(x=>x.options.headers['X-CCG-CSRF']===CSRF));
 assert(requests.every(x=>!('accountId' in x.body)&&!('email' in x.body)));
 assert.equal(requests[1].body.diagnostic.trust,'unverified-client-session');
});
test('reset while POST start is in flight cancels the late receipt; no score is published',async()=>{
 let resolveStart;const calls=[];
 const t=new SierraPendingAttempt({
  enabled:true,authenticated:true,csrfToken:CSRF,websiteOrigin:SITE,
  fetchImpl:async(url,options)=>{
   const body=JSON.parse(options.body);calls.push(body.action);
   if(body.action==='start')return new Promise(resolve=>{resolveStart=resolve;});
   if(body.action==='cancel')return reply({
    ok:true,status:'cancelled',publicRankingUpdated:false
   });
   throw Error('Unexpected '+body.action);
  }
 });
 const startPromise=t.start();
 await Promise.resolve();await Promise.resolve();
 assert.equal(await t.start(),null);
 t.invalidate();
 resolveStart(reply({ok:true,status:'started',attemptId:UUID,nonce:NONCE,
  publicRankingUpdated:false,reviewRequired:true}));
 assert.equal(await startPromise,null);
 assert.deepEqual(calls,['start','cancel']);
 assert.equal(t.active,false);
 assert.equal(await t.finish(final()),null);
});
test('cancelling an established session requires the server nonce and never ranks',async()=>{
 const calls=[];const t=new SierraPendingAttempt({
  enabled:true,authenticated:true,csrfToken:CSRF,websiteOrigin:SITE,
  fetchImpl:async(_url,options)=>{
   const payload=JSON.parse(options.body);calls.push(payload);
   if(payload.action==='start')return reply({
    ok:true,status:'started',attemptId:UUID,nonce:NONCE,
    publicRankingUpdated:false,reviewRequired:true
   });
   return reply({ok:true,status:'cancelled',publicRankingUpdated:false});
  }
 });
 await t.start();
 assert.equal(await t.cancel(),true);
 assert.deepEqual(calls.map(x=>x.action),['start','cancel']);
 assert.equal(calls[1].attemptId,UUID);
 assert.equal(calls[1].nonce,NONCE);
 assert.equal(await t.finish(final()),null);
});
test('Sierra public reader stays disabled and refuses Atlantis or malformed records',async()=>{
 assert.match(sierraLeaderboardUrl(),/gameKey=c64-crossfire-sierra-online/);
 assert.match(sierraLeaderboardUrl(),/sierra-crossfire\/leaderboard/);
 assert.equal(sierraLeaderboardUrl({board:'challenge',challengeSlug:'invalid/slug'}),null);
 assert.equal(sierraLeaderboardUrl({board:'alltime',challengeSlug:'fake'}),null);
 let calls=0;
 const disabled=await readHelioHostSierraBoard({
  fetchImpl:async()=>{calls++;throw Error('Unexpected GET');}
 });
 assert.equal(disabled.status,'unavailable');
 assert.equal(calls,0);
 const wrong=await readHelioHostSierraBoard({enabled:true,fetchImpl:async()=>reply({
  ok:true,gameKey:'c64-crossfire-atlantis',board:'alltime',status:'available',
  records:[{playerName:'Wrong PRG',score:2325}]
 })});
 assert.equal(wrong.status,'unavailable');
 const good=await readHelioHostSierraBoard({enabled:true,fetchImpl:async()=>reply({
  ok:true,gameKey:SIERRA_GAME_KEY,board:'alltime',challengeSlug:null,
  status:'available',records:[{playerName:'Test Player',score:170}]
 })});
 assert.equal(good.status,'ranked');
 assert(!JSON.stringify(good).includes('accountId'));
});
