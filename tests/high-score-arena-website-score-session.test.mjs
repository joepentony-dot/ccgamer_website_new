import test from 'node:test';
import assert from 'node:assert/strict';
import {readWebsiteScoreCapability,standardWebsiteSession,createWebsiteScoreCredential,watchWebsiteScoreMode} from '../js/ccg-c64/arena/client/website-score-session.mjs';
import {acquireWebsiteCrtAttempt,SIERRA_ATTEMPT_PROFILE,DROPZONE_ATTEMPT_PROFILE} from '../js/ccg-c64/arena/client/sierra-heliohost-attempt.mjs';
const SITE='https://www.cheekycommodoregamer.co.uk';
const API='https://api.cheekycommodoregamer.co.uk';
const SOURCE='https://lcslgxpgmttaexsorxik.supabase.co';
const id='11111111-1111-4111-8111-111111111111';
const other='22222222-2222-4222-8222-222222222222';
const csrf='a'.repeat(64),nonce='b'.repeat(64);
const game=SIERRA_ATTEMPT_PROFILE.gameKey;
const reply=x=>({ok:true,headers:{get:()=> 'application/json'},text:async()=>JSON.stringify(x)});
const available={csrf,websiteScores:{version:1,games:[game]}};
test('only exact independently released game capability permits website mode',async()=>{
 let calls=0;
 const options={origin:SITE,gameKey:game,fetchImpl:async(url,req)=>{
  calls++;assert.equal(url,API+'/v1/member/csrf');assert.equal(req.credentials,'include');
  assert.equal(req.redirect,'error');assert.equal(req.headers,undefined);return reply(available);
 }};
 assert.deepEqual(await readWebsiteScoreCapability(options),{gameKey:game,csrf});
 assert.equal(await readWebsiteScoreCapability({...options,origin:'https://evil.invalid'}),null);
 assert.equal(await readWebsiteScoreCapability({...options,gameKey:'unsupported'}),null);
 assert.equal(calls,1);
 for(const data of [{csrf},{...available,websiteScores:{version:2,games:[game]}},{...available,websiteScores:{version:1,games:['wrong']}},{...available,websiteScores:{version:1,games:[game,game]}}])
  assert.equal(await readWebsiteScoreCapability({...options,fetchImpl:async()=>reply(data)}),null);
});
test('uses shared website client and refuses other origin or source',async()=>{
 const client={auth:{getSession:async()=>({data:{session:{user:{id},access_token:'aaa.bbb.ccc'}}})}};
 const win={location:{origin:SITE},CCG_SUPABASE_URL:SOURCE,ccgSupabase:{getClient:async()=>client}};
 assert.deepEqual(await standardWebsiteSession({win}),{id,token:'aaa.bbb.ccc'});
 assert.equal(await standardWebsiteSession({win:{...win,CCG_SUPABASE_URL:'https://wrong.invalid'}}),null);
 assert.equal(await standardWebsiteSession({win:{...win,location:{origin:'https://wrong.invalid'}}}),null);
});
test('website transport refreshes token for finish and never sends identity fields',async()=>{
 let session={id,token:'aaa.bbb.ccc'};const calls=[];
 const capability={gameKey:game,csrf};
 const credential=createWebsiteScoreCredential({origin:SITE,capability,getSession:async()=>session});
 const attempt=await acquireWebsiteCrtAttempt({enabled:true,websiteOrigin:SITE,capability,credential,fetchImpl:async(url,req)=>{
  calls.push({url,req,body:JSON.parse(req.body)});
  return reply(calls.length===1?{ok:true,status:'started',attemptId:id,nonce,reviewRequired:true,publicRankingUpdated:false}:{ok:true,status:'pending-review',scoreReceived:170,reviewRequired:true,publicRankingUpdated:false});
 }});
 assert.equal((await attempt.start()).status,'started');
 session={id,token:'ddd.eee.fff'};
 assert.equal((await attempt.finish({kind:SIERRA_ATTEMPT_PROFILE.finalKind,score:170,stableFrames:25,verified:false,eligibleForSubmission:false})).status,'pending-review');
 assert.deepEqual(calls.map(x=>x.req.headers.Authorization),['Bearer aaa.bbb.ccc','Bearer ddd.eee.fff']);
 for(const x of calls){assert.equal(x.url,API+SIERRA_ATTEMPT_PROFILE.path);assert.equal(x.req.redirect,'error');assert.equal(x.req.headers['X-CCG-CSRF'],csrf);assert(!('accountId'in x.body));assert(!('token'in x.body));}
 assert.equal(await acquireWebsiteCrtAttempt({enabled:true,websiteOrigin:SITE,capability,credential,profile:DROPZONE_ATTEMPT_PROFILE}),null);
});
test('logout and account switch never fall back to native POST',async()=>{
 let current={id,token:'aaa.bbb.ccc'};let sent=0;
 const capability={gameKey:game,csrf};
 const credential=createWebsiteScoreCredential({origin:SITE,capability,getSession:async()=>current});
 const t=await acquireWebsiteCrtAttempt({enabled:true,websiteOrigin:SITE,capability,credential,fetchImpl:async()=>{sent++;return reply({});}});
 current=null;assert.equal(await t.start(),null);assert.equal(sent,0);
 current={id:other,token:'ddd.eee.fff'};assert.equal(await t.start(),null);assert.equal(sent,0);
});

test('advertised mode watches the standard login without navigation or a new password',async()=>{
 const win=new EventTarget();win.location={origin:SITE};win.setTimeout=setTimeout;
 const signal=new AbortController();let session=null,credential=null,capabilities=0;
 const mode=await watchWebsiteScoreMode({doc:{defaultView:win},origin:SITE,gameKey:game,
  fetchImpl:async()=>reply(available),signal:signal.signal,loadClient:async()=>true,getSession:async()=>session,
  onCapability:()=>capabilities++,onIdentity:value=>{credential=value;}});
 assert.equal(mode,true);assert.equal(capabilities,1);assert.equal(credential,null);
 session={id,token:'aaa.bbb.ccc'};win.dispatchEvent(new Event('focus'));
 await new Promise(r=>setImmediate(r));assert.equal(await credential(),'aaa.bbb.ccc');
 const old=credential;session=null;const event=new Event('ccg:auth-changed');
 event.detail={event:'SIGNED_OUT'};win.dispatchEvent(event);
 assert.equal(credential,null);assert.equal(await old(),null);
 signal.abort();
 session={id:other,token:'ddd.eee.fff'};win.dispatchEvent(new Event('focus'));
 await new Promise(r=>setImmediate(r));assert.equal(credential,null);
});
test('old backend never loads the standard client or starts scoring',async()=>{
 const win={location:{origin:SITE}};
 let loaded=0;
 assert.equal(await watchWebsiteScoreMode({doc:{defaultView:win},origin:SITE,gameKey:game,
 fetchImpl:async()=>reply({csrf}),loadClient:async()=>{loaded++;return true;}}),false);
 assert.equal(loaded,0);
});
