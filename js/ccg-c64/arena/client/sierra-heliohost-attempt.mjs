/**
 * Exact Sierra On-Line Crossfire CRT -> independent HelioHost candidate.
 * NOT imported by the public emulator. Network is OFF by default.
 * This is not anti-cheat: accepted finishes remain PRIVATE/pending review.
 * Never reuse the unrelated Atlantis/Pantheon PRG or Crossfire-Tron route.
 */
export const SIERRA_API_ORIGIN='https://api.cheekycommodoregamer.co.uk';
export const SIERRA_ATTEMPT_ROUTE='/v1/arena/sierra-crossfire/attempt';
export const SIERRA_GAME_KEY='c64-crossfire-sierra-online';
export const SIERRA_CATALOG_ID='owner-crt-more-crossfiresierraonline-0c60e852f438';
export const SIERRA_MEDIA_SHA256='0c60e852f438ab9b6b325a1ecedb69ae1bbff9d1519584e52d6bb31df26c14ab';
export const SIERRA_MEDIA_BYTES=65728;
const SITE_ORIGIN='https://www.cheekycommodoregamer.co.uk';
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const NONCE=/^[a-f0-9]{64}$/;
const SLUG=/^[a-z0-9][a-z0-9-]{2,98}[a-z0-9]$/;
const CSRF=/^[a-f0-9]{64}$/;
const MAX_REPLY=4096;

export function sierraStartPayload({board='alltime',challengeSlug=null}={}) {
 if(board!=='alltime'&&board!=='challenge')return null;
 if(board==='alltime'&&challengeSlug!==null)return null;
 if(board==='challenge'&&(!SLUG.test(challengeSlug||'')||typeof challengeSlug!=='string'))return null;
 return Object.freeze({
  action:'start',gameKey:SIERRA_GAME_KEY,catalogId:SIERRA_CATALOG_ID,
  mediaSha256:SIERRA_MEDIA_SHA256,mediaBytes:SIERRA_MEDIA_BYTES,
  rulesVersion:1,board,challengeSlug
 });
}

export function sierraFinishPayload(receipt,final) {
 if(!receipt || !UUID.test(receipt.attemptId||'') || !NONCE.test(receipt.nonce||'') ||
    !final || final.kind!=='sierra-crt-local-final-candidate' ||
    final.verified!==false || final.eligibleForSubmission!==false ||
    !Number.isInteger(final.score) || final.score<0 || final.score>999999 ||
    !Number.isInteger(final.stableFrames) ||
    final.stableFrames<25 || final.stableFrames>120)return null;
 return Object.freeze({
  action:'finish',attemptId:receipt.attemptId,nonce:receipt.nonce,
  score:final.score,
  diagnostic:Object.freeze({
   kind:'sierra-crt-local-final-candidate',
   gameId:SIERRA_CATALOG_ID,
   mediaSha256:SIERRA_MEDIA_SHA256,
   score:final.score,
   stableGameOverFrames:final.stableFrames,
   trust:'unverified-client-session'
  })
 });
}
async function readBoundedJSON(response) {
 if(!response?.ok||typeof response.text!=='function')return null;
 const type=response.headers?.get?.('content-type');
 if(type && !/^application\/json(?:;|$)/i.test(type.trim()))return null;
 const text=await response.text();
 if(typeof text!=='string'||text.length>MAX_REPLY)return null;
 const result=JSON.parse(text);
 return result && typeof result==='object' && !Array.isArray(result)?result:null;
}

/** Requires a signed-in independent member and server-provided CSRF token. */
export async function acquireSierraAttempt({
 enabled=false,websiteOrigin='',fetchImpl=globalThis.fetch,signal
}={}) {
 if(enabled!==true || websiteOrigin!==SITE_ORIGIN ||
    typeof fetchImpl!=='function'||signal?.aborted)return null;
 try {
  const get=async(path)=>readBoundedJSON(await fetchImpl(SIERRA_API_ORIGIN+path,{
   method:'GET',mode:'cors',credentials:'include',cache:'no-store',
   redirect:'error',signal
  }));
  const member=await get('/v1/member/me');
  if(signal?.aborted||!UUID.test(member?.account?.id||''))return null;
  const csrf=await get('/v1/member/csrf');
  if(signal?.aborted||!CSRF.test(csrf?.csrf||''))return null;
  return new SierraPendingAttempt({
   enabled:true,authenticated:true,csrfToken:csrf.csrf,fetchImpl,websiteOrigin
  });
 } catch { return null; }
}

export class SierraPendingAttempt {
 #enabled;#csrf;#fetch;#receipt=null;#used=false;#pending=false;#version=0;
 constructor({enabled=false,authenticated=false,csrfToken='',
              websiteOrigin='',fetchImpl=globalThis.fetch}={}) {
  this.#enabled=enabled===true&&authenticated===true&&
   websiteOrigin===SITE_ORIGIN&&CSRF.test(csrfToken)&&typeof fetchImpl==='function';
  this.#csrf=csrfToken;this.#fetch=fetchImpl;
 }
 get enabled(){return this.#enabled;}
 get active(){return this.#receipt!==null;}
 async #post(body) {
  const reply=await this.#fetch(SIERRA_API_ORIGIN+SIERRA_ATTEMPT_ROUTE,{
   method:'POST',mode:'cors',credentials:'include',cache:'no-store',
   redirect:'error',
   headers:{'Content-Type':'application/json','X-CCG-CSRF':this.#csrf},
   body:JSON.stringify(body)
  });
  return readBoundedJSON(reply);
 }
 async #release(receipt) {
  try {await this.#post({action:'cancel',attemptId:receipt.attemptId,nonce:receipt.nonce});}
  catch { /* Server timeout expires started, non-published attempts. */ }
 }
 async start(selection={}) {
  if(!this.#enabled||this.#used||this.#pending||this.#receipt)return null;
  const payload=sierraStartPayload(selection);
  if(!payload)return null;
  this.#pending=true;
  const version=this.#version;
  try {
   const result=await this.#post(payload);
   if(!result||result.ok!==true||result.status!=='started'||
      result.publicRankingUpdated!==false||result.reviewRequired!==true||
      !UUID.test(result.attemptId||'')||!NONCE.test(result.nonce||''))return null;
   const receipt={attemptId:result.attemptId,nonce:result.nonce};
   if(this.#version!==version||this.#used){
    await this.#release(receipt);
    return null;
   }
   this.#receipt=receipt;
   return Object.freeze({status:'started',reviewRequired:true});
  } catch{return null;}
  finally{this.#pending=false;}
 }
 async finish(candidate) {
  if(!this.#enabled||!this.#receipt||this.#used||this.#pending)return null;
  const payload=sierraFinishPayload(this.#receipt,candidate);
  if(!payload)return null;
  this.#receipt=null;this.#used=true;this.#version++;
  try {
   const result=await this.#post(payload);
   if(!result||result.ok!==true||result.status!=='pending-review'||
      result.publicRankingUpdated!==false||result.reviewRequired!==true||
      result.scoreReceived!==payload.score)return null;
   return Object.freeze({status:'pending-review',scoreReceived:payload.score});
  } catch{return null;}
 }
 async cancel() {
  this.#version++;this.#used=true;
  const receipt=this.#receipt;
  this.#receipt=null;
  if(!receipt||!this.#enabled)return false;
  try {
   const result=await this.#post({
    action:'cancel',attemptId:receipt.attemptId,nonce:receipt.nonce
   });
   return result?.ok===true&&result?.status==='cancelled'&&
     result.publicRankingUpdated===false;
  } catch{return false;}
 }
 invalidate() {
  // Never publish after session/ROM change. Best-effort cancel any begun run.
  void this.cancel();
 }
}
