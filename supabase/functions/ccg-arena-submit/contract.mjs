/**
 * CCG High Score Arena — PRIVATE, UNVERIFIED automatic score intake.
 * Crossfire is the sole enrolled game. No function here can publish a score.
 * The server validates a CCG account and owns attempt issuance, nonce hashes,
 * expiry, and replay/duplicate protection. A client score is not attestation.
 */
export const ARENA_SUBMIT_RULES=Object.freeze({
  gameKey:'c64-crossfire-atlantis',
  catalogId:'archive-02121',
  mediaSha256:'ddc3ab84c98fc065fd39e69bfe68b7ee6de38ebab4b51b607bbcea64cad570a9',
  mediaBytes:23637,
  rulesVersion:1,
  maxScore:999999,
  minDurationMs:5000,
  maxDurationMs:60*60*1000,
  maxStartsPerHour:8,
  maxRequestBytes:4096
});
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const SLUG=/^[a-z0-9](?:[a-z0-9-]{2,98})[a-z0-9]$/;

function object(value){
  return value!==null&&typeof value==='object'&&!Array.isArray(value);
}
function only(value,keys){
  return object(value)&&Object.keys(value).every(k=>keys.includes(k));
}
export function parseArenaStart(input){
  if(!only(input,['action','gameKey','catalogId','mediaSha256','mediaBytes','rulesVersion','board','challengeSlug'])||
     input.action!=='start'||
     input.gameKey!==ARENA_SUBMIT_RULES.gameKey||
     input.catalogId!==ARENA_SUBMIT_RULES.catalogId||
     input.mediaSha256!==ARENA_SUBMIT_RULES.mediaSha256||
     input.mediaBytes!==ARENA_SUBMIT_RULES.mediaBytes||
     input.rulesVersion!==ARENA_SUBMIT_RULES.rulesVersion||
     !['alltime','challenge'].includes(input.board))return null;
  if(input.board==='alltime'&&input.challengeSlug!=null)return null;
  if(input.board==='challenge'&&
     (typeof input.challengeSlug!=='string'||!SLUG.test(input.challengeSlug)))return null;
  return Object.freeze({
    gameKey:ARENA_SUBMIT_RULES.gameKey,
    catalogId:ARENA_SUBMIT_RULES.catalogId,
    mediaSha256:ARENA_SUBMIT_RULES.mediaSha256,
    mediaBytes:ARENA_SUBMIT_RULES.mediaBytes,
    rulesVersion:ARENA_SUBMIT_RULES.rulesVersion,
    board:input.board,
    challengeSlug:input.board==='challenge'?input.challengeSlug:null
  });
}
export function parseArenaFinish(input){
  if(!only(input,['action','attemptId','nonce','score','diagnostic'])||
     input.action!=='finish'||
     typeof input.attemptId!=='string'||!UUID.test(input.attemptId)||
     typeof input.nonce!=='string'||!UUID.test(input.nonce)||
     !Number.isSafeInteger(input.score)||input.score<0||
     input.score>ARENA_SUBMIT_RULES.maxScore)return null;
  const d=input.diagnostic;
  if(!only(d,['kind','gameId','score','livesAtLastHud','stableGraveFrames','trust'])||
     d.kind!=='diagnostic-final-score-candidate'||
     d.gameId!==ARENA_SUBMIT_RULES.catalogId||
     d.trust!=='unverified-client-session'||
     d.score!==input.score||d.livesAtLastHud!==0||
     !Number.isInteger(d.stableGraveFrames)||
     d.stableGraveFrames<20||d.stableGraveFrames>500)return null;
  return Object.freeze({
    attemptId:input.attemptId,
    nonce:input.nonce,
    score:input.score,
    diagnostic:Object.freeze({
      kind:d.kind,gameId:d.gameId,
      score:d.score,livesAtLastHud:0,
      stableGraveFrames:d.stableGraveFrames,
      trust:'unverified-client-session'
    })
  });
}
export function parseArenaCancel(input){
  if(!only(input,['action','attemptId','nonce'])||
     input.action!=='cancel'||
     typeof input.attemptId!=='string'||!UUID.test(input.attemptId)||
     typeof input.nonce!=='string'||!UUID.test(input.nonce))return null;
  return Object.freeze({attemptId:input.attemptId,nonce:input.nonce});
}
export function parseArenaSubmission(input){
  if(!object(input))return null;
  if(input.action==='start')return Object.freeze({action:'start',payload:parseArenaStart(input)});
  if(input.action==='finish')return Object.freeze({action:'finish',payload:parseArenaFinish(input)});
  if(input.action==='cancel')return Object.freeze({action:'cancel',payload:parseArenaCancel(input)});
  return null;
}
export function isRegisteredActiveGame(row,selection){
  return Boolean(row&&selection&&row.status==='active'&&
    row.game_key===ARENA_SUBMIT_RULES.gameKey&&
    row.media_entry_id===ARENA_SUBMIT_RULES.catalogId&&
    row.media_sha256===ARENA_SUBMIT_RULES.mediaSha256&&
    row.media_byte_length===ARENA_SUBMIT_RULES.mediaBytes&&
    row.rules_version===ARENA_SUBMIT_RULES.rulesVersion&&
    row.score_ceiling>=0&&row.score_ceiling<=ARENA_SUBMIT_RULES.maxScore&&
    selection.mediaSha256===row.media_sha256);
}
export function isChallengeOpen(row,gameKey,nowMs){
  return Boolean(row&&row.game_key===gameKey&&row.status==='published'&&
    Date.parse(row.start_at)<=nowMs&&nowMs<Date.parse(row.end_at));
}
export function attemptAge(row,nowMs){
  if(!row||row.status!=='started')return 'not-started';
  const started=Date.parse(row.started_at);
  if(!Number.isFinite(started)||!Number.isFinite(nowMs))return 'invalid';
  const age=nowMs-started;
  if(age<ARENA_SUBMIT_RULES.minDurationMs)return 'too-early';
  if(age>ARENA_SUBMIT_RULES.maxDurationMs)return 'expired';
  return 'valid';
}
export function constantTimeEqual(left,right){
  if(typeof left!=='string'||typeof right!=='string')return false;
  let mismatch=left.length^right.length;
  for(let i=0;i<Math.max(left.length,right.length);i++)
    mismatch|=(left.charCodeAt(i)||0)^(right.charCodeAt(i)||0);
  return mismatch===0;
}
