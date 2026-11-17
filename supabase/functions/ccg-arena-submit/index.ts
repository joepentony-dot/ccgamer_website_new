/**
 * CCG High Score Arena automatic private attempt intake — DRAFT, NOT DEPLOYED.
 *
 * A signed-in player starts an attempt, then the running game's validated
 * diagnostic emits its final score without manual entry. The server stores
 * that CLAIM as "submitted" for independent review, NEVER as "approved".
 * The cracked/trained source program and browser-controlled emulator mean
 * client scores cannot currently be independently attested.
 *
 * Never expose the Supabase service-role key, player JWT or nonce in logs,
 * browser HTML, or public leaderboard results.
 */
import { createClient } from 'npm:@supabase/supabase-js@2.95.0';
import {
  ARENA_SUBMIT_RULES as RULES,parseArenaSubmission,isRegisteredActiveGame,
  isChallengeOpen,attemptAge,constantTimeEqual
} from './contract.mjs';

const ORIGINS=new Set([
  'https://www.cheekycommodoregamer.co.uk',
  'https://cheekycommodoregamer.co.uk'
]);
const URL=Deno.env.get('SUPABASE_URL')||'';
const ANON=Deno.env.get('SUPABASE_ANON_KEY')||
  Deno.env.get('SUPABASE_PUBLISHABLE_KEY')||'';
const SERVICE=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'';
const MAX=RULES.maxRequestBytes;

function cors(req:Request){
  const origin=req.headers.get('origin');
  const headers:Record<string,string>={
    'Vary':'Origin',
    'Access-Control-Allow-Headers':'authorization, apikey, content-type',
    'Access-Control-Allow-Methods':'POST, OPTIONS'
  };
  if(origin&&ORIGINS.has(origin))headers['Access-Control-Allow-Origin']=origin;
  return headers;
}
function json(req:Request,status:number,data:unknown){
  return new Response(JSON.stringify(data),{status,headers:{
    ...cors(req),'Content-Type':'application/json; charset=utf-8',
    'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'
  }});
}
const fail=(req:Request,status:number,error:string)=>json(req,status,{ok:false,error});
const parseToken=(req:Request)=>{
  const header=req.headers.get('authorization')||'';
  return /^Bearer [^\s]+$/i.test(header)?header.slice(7):null;
};
function client(key:string){
  return createClient(URL,key,{
    auth:{persistSession:false,autoRefreshToken:false},
    global:{headers:{'X-CCG-Arena':'private-attempt-intake'}}
  });
}
async function hash(value:string){
  const raw=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));
  return Array.from(new Uint8Array(raw),b=>b.toString(16).padStart(2,'0')).join('');
}
function dbUnavailable(req:Request){
  return fail(req,503,'Arena submissions are not available');
}
async function start(req:Request,admin:any,userId:string,body:any,now:number){
  const gameQuery=await admin.from('ccg_arena_games')
    .select('game_key,media_entry_id,media_sha256,media_byte_length,rules_version,score_ceiling,status')
    .eq('game_key',body.gameKey).maybeSingle();
  if(gameQuery.error)return dbUnavailable(req);
  const game=gameQuery.data;
  if(!isRegisteredActiveGame(game,body))
    return fail(req,423,'This game is not open for competitive submissions');

  let challengeId:string|null=null;
  if(body.board==='challenge'){
    const query=await admin.from('ccg_arena_challenges')
      .select('id,game_key,status,start_at,end_at,rules_version')
      .eq('slug',body.challengeSlug).eq('game_key',body.gameKey).maybeSingle();
    if(query.error)return dbUnavailable(req);
    if(!isChallengeOpen(query.data,body.gameKey,now)||
       query.data.rules_version!==game.rules_version)
      return fail(req,423,'No active challenge matches that selection');
    challengeId=query.data.id;
  }

  // Service-role-only cleanup. A partial unique index still prevents two
  // simultaneous starts from racing through the read-side rate limit.
  const expireBefore=new Date(now-RULES.maxDurationMs).toISOString();
  const expiration=await admin.from('ccg_arena_attempts')
    .update({status:'expired'}).eq('user_id',userId).eq('status','started')
    .lt('started_at',expireBefore);
  if(expiration.error)return dbUnavailable(req);
  const lastHour=new Date(now-60*60*1000).toISOString();
  const countQuery=await admin.from('ccg_arena_attempts')
    .select('id',{count:'exact',head:true})
    .eq('user_id',userId).gte('started_at',lastHour);
  if(countQuery.error)return dbUnavailable(req);
  if((countQuery.count??RULES.maxStartsPerHour)>=RULES.maxStartsPerHour)
    return fail(req,429,'Hourly attempt limit reached');

  const nonce=crypto.randomUUID();
  const nonceHash=await hash(nonce);
  const insert=await admin.from('ccg_arena_attempts').insert({
    user_id:userId,game_key:body.gameKey,nonce_sha256:nonceHash,
    media_sha256:body.mediaSha256,rules_version:body.rulesVersion,
    status:'started',
    evidence:{
      board:body.board,challengeSlug:body.challengeSlug,challengeId,
      intakeVersion:1,verification:'unverified-client-session',
      // Not proof of genuine game settings; leave review mandatory.
      verifiedClient:false
    }
  }).select('id,started_at').single();
  if(insert.error){
    if(insert.error.code==='23505')return fail(req,409,'An attempt is already active');
    return dbUnavailable(req);
  }
  return json(req,201,{
    ok:true,status:'started',attemptId:insert.data.id,nonce,
    gameKey:body.gameKey,expiresAt:new Date(now+RULES.maxDurationMs).toISOString(),
    reviewRequired:true,publicRankingUpdated:false
  });
}
async function getAttempt(admin:any,attemptId:string,userId:string){
  return admin.from('ccg_arena_attempts')
    .select('id,user_id,game_key,nonce_sha256,media_sha256,rules_version,status,started_at,evidence')
    .eq('id',attemptId).eq('user_id',userId).maybeSingle();
}
async function checkAttempt(req:Request,admin:any,userId:string,body:any,now:number){
  const query=await getAttempt(admin,body.attemptId,userId);
  if(query.error)return {error:dbUnavailable(req)};
  if(!query.data)return {error:fail(req,404,'Attempt not found')};
  const attempt=query.data;
  if(attempt.status!=='started')return {error:fail(req,409,'Attempt is no longer active')};
  const hashed=await hash(body.nonce);
  if(!constantTimeEqual(hashed,attempt.nonce_sha256))
    return {error:fail(req,403,'Attempt token does not match')};
  const age=attemptAge(attempt,now);
  if(age==='expired'){
    // Best-effort transition. The partial unique index will block a new
    // attempt until a later cleanup if this operation becomes unavailable.
    await admin.from('ccg_arena_attempts').update({status:'expired'})
      .eq('id',attempt.id).eq('status','started').eq('user_id',userId);
    return {error:fail(req,410,'Attempt expired')};
  }
  if(age!=='valid')return {error:fail(req,409,'Attempt cannot finish yet')};
  if(attempt.game_key!==RULES.gameKey||
     attempt.media_sha256!==RULES.mediaSha256||
     attempt.rules_version!==RULES.rulesVersion)
    return {error:fail(req,409,'Wrong game edition or rules version')};
  return {attempt};
}
async function finish(req:Request,admin:any,userId:string,body:any,now:number){
  const checked=await checkAttempt(req,admin,userId,body,now);
  if(checked.error)return checked.error;
  const attempt=checked.attempt;
  const game=await admin.from('ccg_arena_games')
    .select('game_key,status,media_entry_id,media_sha256,media_byte_length,rules_version,score_ceiling')
    .eq('game_key',attempt.game_key).maybeSingle();
  if(game.error)return dbUnavailable(req);
  if(!isRegisteredActiveGame(game.data,{mediaSha256:attempt.media_sha256})||
     body.score>game.data.score_ceiling)
    return fail(req,423,'This game or score is not eligible for submission');

  const evidence=attempt.evidence&&typeof attempt.evidence==='object'
    ? attempt.evidence:{};
  let challengeEligible=false;
  if(evidence.board==='challenge'&&typeof evidence.challengeId==='string'){
    const challenge=await admin.from('ccg_arena_challenges')
      .select('id,game_key,status,start_at,end_at,rules_version')
      .eq('id',evidence.challengeId).eq('game_key',attempt.game_key).maybeSingle();
    if(challenge.error)return dbUnavailable(req);
    challengeEligible=isChallengeOpen(challenge.data,attempt.game_key,now)&&
      challenge.data.rules_version===attempt.rules_version;
  }
  // Atomic, single-use transition. A concurrent repeat cannot resubmit.
  // All submissions remain private and unreviewed, even if score looks valid.
  const update=await admin.from('ccg_arena_attempts')
    .update({
      status:'submitted',claimed_score:body.score,
      finished_at:new Date(now).toISOString(),
      evidence:{
        ...evidence,final:body.diagnostic,
        challengeEligible,
        verification:'unverified-client-session',reviewRequired:true
      }
    })
    .eq('id',attempt.id).eq('user_id',userId)
    .eq('nonce_sha256',attempt.nonce_sha256)
    .eq('status','started')
    .select('id').maybeSingle();
  if(update.error)return dbUnavailable(req);
  if(!update.data)return fail(req,409,'Attempt already finished');
  return json(req,202,{
    ok:true,status:'pending-review',attemptId:attempt.id,
    scoreReceived:body.score,reviewRequired:true,
    challengeEligible,publicRankingUpdated:false
  });
}
async function cancel(req:Request,admin:any,userId:string,body:any,now:number){
  const query=await getAttempt(admin,body.attemptId,userId);
  if(query.error)return dbUnavailable(req);
  if(!query.data)return fail(req,404,'Attempt not found');
  if(query.data.status!=='started')return fail(req,409,'Attempt is no longer active');
  if(!constantTimeEqual(await hash(body.nonce),query.data.nonce_sha256))
    return fail(req,403,'Attempt token does not match');
  const update=await admin.from('ccg_arena_attempts')
    .update({status:'expired',finished_at:new Date(now).toISOString()})
    .eq('id',body.attemptId).eq('user_id',userId).eq('status','started')
    .eq('nonce_sha256',query.data.nonce_sha256).select('id').maybeSingle();
  if(update.error)return dbUnavailable(req);
  if(!update.data)return fail(req,409,'Attempt already finished');
  return json(req,200,{ok:true,status:'cancelled',publicRankingUpdated:false});
}

Deno.serve(async(req:Request)=>{
  try {
    const origin=req.headers.get('origin');
    if(origin&&!ORIGINS.has(origin))return fail(req,403,'Origin not permitted');
    if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors(req)});
    if(req.method!=='POST')return fail(req,405,'Method not allowed');
    if(!URL||!ANON||!SERVICE)return dbUnavailable(req);
    const token=parseToken(req);
    if(!token)return fail(req,401,'Sign in to submit a score');
    const reported=Number(req.headers.get('content-length')||0);
    if(!Number.isFinite(reported)||reported>MAX)return fail(req,413,'Request too large');
    const raw=await req.text();
    if(new TextEncoder().encode(raw).byteLength>MAX)return fail(req,413,'Request too large');
    let input:unknown;
    try {input=JSON.parse(raw);}catch{return fail(req,400,'Invalid JSON');}
    const parsed=parseArenaSubmission(input);
    if(!parsed||!parsed.payload)return fail(req,400,'Invalid attempt request');
    // Validate the JWT against Supabase Auth, never trust user ID supplied in body.
    const publicClient=client(ANON);
    const authentication=await publicClient.auth.getUser(token);
    const userId=authentication.data?.user?.id;
    if(authentication.error||!userId)return fail(req,401,'Sign in to submit a score');
    const admin=client(SERVICE);
    const now=Date.now();
    if(parsed.action==='start')return await start(req,admin,userId,parsed.payload,now);
    if(parsed.action==='finish')return await finish(req,admin,userId,parsed.payload,now);
    if(parsed.action==='cancel')return await cancel(req,admin,userId,parsed.payload,now);
    return fail(req,400,'Invalid request');
  } catch {
    // No credentials, nonce values, raw user input or DB exception details.
    return fail(req,503,'Arena submissions are temporarily unavailable');
  }
});
