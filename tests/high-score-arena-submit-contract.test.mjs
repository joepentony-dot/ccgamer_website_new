import test from 'node:test';
import assert from 'node:assert/strict';
import {
 ARENA_SUBMIT_RULES as R,parseArenaStart,parseArenaFinish,
 parseArenaCancel,parseArenaSubmission,isRegisteredActiveGame,
 isChallengeOpen,attemptAge,constantTimeEqual
} from '../supabase/functions/ccg-arena-submit/contract.mjs';
const uuid='01234567-89ab-4abc-8def-0123456789ab';
const nonce='87654321-4321-4abc-8def-0123456789ab';
const start={
 action:'start',gameKey:R.gameKey,catalogId:R.catalogId,
 mediaSha256:R.mediaSha256,mediaBytes:R.mediaBytes,
 rulesVersion:R.rulesVersion,board:'alltime'
};
const diagnostic={
 kind:'diagnostic-final-score-candidate',gameId:R.catalogId,
 score:2325,livesAtLastHud:0,stableGraveFrames:20,
 trust:'unverified-client-session'
};
const finish={action:'finish',attemptId:uuid,nonce,score:2325,diagnostic};
test('start requires exact game edition and never automatically enables an unverified PRG',()=>{
 assert.equal(parseArenaStart(start)?.gameKey,R.gameKey);
 assert.equal(parseArenaStart({...start,gameKey:'crossfire-tron'}),null);
 assert.equal(parseArenaStart({...start,mediaBytes:23638}),null);
 assert.equal(parseArenaStart({...start,mediaSha256:'0'.repeat(64)}),null);
 assert.equal(parseArenaStart({...start,rulesVersion:2}),null);
 assert.equal(parseArenaStart({...start,extra:'do not accept'}),null);
 assert.equal(parseArenaStart({...start,board:'challenge'}),null);
 assert.equal(parseArenaStart({...start,board:'challenge',challengeSlug:'crossfire-week-one'})?.challengeSlug,'crossfire-week-one');
 assert.equal(parseArenaStart({...start,board:'alltime',challengeSlug:'crossfire-week-one'}),null);
});
test('finish is derived from game-over diagnostics, never typed score-only payloads',()=>{
 assert.equal(parseArenaFinish(finish)?.score,2325);
 assert.equal(parseArenaFinish({...finish,score:2326}),null);
 assert.equal(parseArenaFinish({...finish,score:-1}),null);
 assert.equal(parseArenaFinish({...finish,score:1e8}),null);
 assert.equal(parseArenaFinish({...finish,attemptId:'not-uuid'}),null);
 assert.equal(parseArenaFinish({...finish,nonce:'bad'}),null);
 assert.equal(parseArenaFinish({...finish,diagnostic:{...diagnostic,gameId:'archive-02122'}}),null);
 assert.equal(parseArenaFinish({...finish,diagnostic:{...diagnostic,stableGraveFrames:1}}),null);
 assert.equal(parseArenaFinish({...finish,diagnostic:{...diagnostic,livesAtLastHud:1}}),null);
 assert.equal(parseArenaFinish({...finish,diagnostic:{...diagnostic,trust:'verified'}}),null);
 assert.equal(parseArenaFinish({...finish,diagnostic:{...diagnostic,extra:'injection'}}),null);
});
test('start, finish and cancellation are isolated and typed',()=>{
 assert.equal(parseArenaSubmission(start)?.action,'start');
 assert.equal(parseArenaSubmission(finish)?.action,'finish');
 assert.equal(parseArenaSubmission({action:'cancel',attemptId:uuid,nonce})?.payload?.attemptId,uuid);
 assert.equal(parseArenaCancel({action:'cancel',attemptId:uuid,nonce,score:500}),null);
 assert.equal(parseArenaSubmission({action:'approve',attemptId:uuid}),null);
 assert.equal(parseArenaSubmission({action:'publish',score:999999}),null);
});
test('pilot, wrong edition and nonmatching rules never open intake',()=>{
 const row={status:'pilot',game_key:R.gameKey,media_entry_id:R.catalogId,
 media_sha256:R.mediaSha256,media_byte_length:R.mediaBytes,
 rules_version:R.rulesVersion,score_ceiling:R.maxScore};
 assert.equal(isRegisteredActiveGame(row,start),false);
 assert.equal(isRegisteredActiveGame({...row,status:'active'},start),true);
 assert.equal(isRegisteredActiveGame({...row,status:'active',media_entry_id:'archive-02122'},start),false);
 assert.equal(isRegisteredActiveGame({...row,status:'active',score_ceiling:1e8},start),false);
});
test('challenge validity requires actual published in-window dates',()=>{
 const now=Date.parse('2026-11-17T17:00:00Z');
 const challenge={game_key:R.gameKey,status:'published',
 start_at:'2026-11-17T00:00:00Z',end_at:'2026-11-18T00:00:00Z'};
 assert.equal(isChallengeOpen(challenge,R.gameKey,now),true);
 assert.equal(isChallengeOpen({...challenge,status:'draft'},R.gameKey,now),false);
 assert.equal(isChallengeOpen({...challenge,end_at:'2026-11-16T00:00:00Z'},R.gameKey,now),false);
 assert.equal(isChallengeOpen({...challenge,game_key:'other-game'},R.gameKey,now),false);
});
test('attempt time checks use server timestamps and fail closed',()=>{
 const now=Date.parse('2026-11-17T17:00:00Z');
 const row={status:'started',started_at:new Date(now-120000).toISOString()};
 assert.equal(attemptAge(row,now),'valid');
 assert.equal(attemptAge({...row,status:'submitted'},now),'not-started');
 assert.equal(attemptAge({...row,started_at:new Date(now-100).toISOString()},now),'too-early');
 assert.equal(attemptAge({...row,started_at:new Date(now-3900000).toISOString()},now),'expired');
 assert.equal(attemptAge({...row,started_at:'not-a-date'},now),'invalid');
});
test('nonce hashes are compared without a prefix-match exception',()=>{
 assert.equal(constantTimeEqual('ab'.repeat(32),'ab'.repeat(32)),true);
 assert.equal(constantTimeEqual('ab'.repeat(32),'ab'.repeat(31)+'ac'),false);
 assert.equal(constantTimeEqual('ab'.repeat(32),'ab'.repeat(31)),false);
});
