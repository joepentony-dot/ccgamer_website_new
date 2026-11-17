/**
 * CCG Arena: opt-in HelioHost member-session handshake.
 *
 * This client never handles passwords, creates accounts, saves credentials or
 * accepts a browser-supplied member ID. Session identity is proved by the
 * independent PHP backend using its own HttpOnly member cookie. No request is
 * made unless the exact Crossfire edition and explicit pilot flag are present.
 */
import {
  CCG_ARENA_API_ORIGIN,HelioHostArenaAttempt
} from './heliohost-attempt.mjs';

const WEBSITE_ORIGIN='https://www.cheekycommodoregamer.co.uk';
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const CSRF=/^[a-f0-9]{64}$/;
const MAX_REPLY_BYTES=2048;

async function readMemberJSON(fetchImpl,path,signal) {
  const response=await fetchImpl(CCG_ARENA_API_ORIGIN+path,{
    method:'GET',mode:'cors',credentials:'include',cache:'no-store',
    redirect:'error',signal
  });
  if(!response?.ok || typeof response.text!=='function')return null;
  const contentType=response.headers?.get?.('content-type');
  if(contentType && !/^application\/json(?:;|$)/i.test(contentType.trim()))return null;
  const raw=await response.text();
  if(typeof raw!=='string' || raw.length>MAX_REPLY_BYTES)return null;
  const value=JSON.parse(raw);
  return value && typeof value==='object' && !Array.isArray(value)?value:null;
}

/**
 * Returns null for every unreleased/anonymous/failed condition.
 * Only the independent member API can grant an authenticated session and CSRF.
 * Scores are still private, unverified claims requiring manual review.
 */
export async function acquireCrossfireHelioHostAttempt({
  enabled=false,websiteOrigin=globalThis.window?.location?.origin||'',
  fetchImpl=globalThis.fetch,signal
}={}) {
  if(enabled!==true || websiteOrigin!==WEBSITE_ORIGIN ||
     typeof fetchImpl!=='function' || signal?.aborted)return null;
  try {
    const member=await readMemberJSON(fetchImpl,'/v1/member/me',signal);
    if(!UUID.test(member?.account?.id||'') || signal?.aborted)return null;
    const csrf=await readMemberJSON(fetchImpl,'/v1/member/csrf',signal);
    if(!CSRF.test(csrf?.csrf||'')||signal?.aborted)return null;
    return new HelioHostArenaAttempt({
      enabled:true,authenticated:true,csrfToken:csrf.csrf,
      websiteOrigin,fetchImpl
    });
  } catch {
    // No retry loops, no fallback identities and no token logging.
    return null;
  }
}
