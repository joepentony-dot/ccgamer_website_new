/**
 * CCG High Score Arena -> future HelioHost PHP/member API only.
 * No API is enabled or deployed by this file. The existing C64 launcher
 * does NOT import it. The game diagnostic continues to operate locally.
 *
 * This is a contract adapter for the independent CCG backend project;
 * its future route must authenticate CCG member cookies, enforce Origin+CSRF
 * and pass identity to ArenaCrossfire.php from the verified server session.
 *
 * Server treats every browser score as UNVERIFIED pending review.
 */
export const CCG_ARENA_API_ORIGIN = 'https://api.cheekycommodoregamer.co.uk';
export const CCG_ARENA_INTAKE_PATH = '/v1/arena/crossfire/attempt';

const SHA = 'ddc3ab84c98fc065fd39e69bfe68b7ee6de38ebab4b51b607bbcea64cad570a9';
const GAME_KEY='c64-crossfire-atlantis';
const CATALOG='archive-02121';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const NONCE=/^[a-f0-9]{64}$/;
const SLUG=/^[a-z0-9][a-z0-9-]{2,98}[a-z0-9]$/;

export function makeArenaStartRequest({board='alltime',challengeSlug=null}={}) {
  if(board!=='alltime'&&board!=='challenge')return null;
  if(board==='alltime'&&challengeSlug!==null)return null;
  if(board==='challenge'&&(typeof challengeSlug!=='string'||!SLUG.test(challengeSlug)))return null;
  return Object.freeze({
    action:'start',gameKey:GAME_KEY,catalogId:CATAL,
    mediaSha256:SHA,mediaBytes:23637,rulesVersion:1,
    board,challengeSlug
  });
}
export function makeArenaFinishRequest(attempt,diagnostic) {
  if(!attempt || !UUID.test(attempt.attemptId||'')||
    !NONCE.test(attempt.nonce||'') || !diagnostic ||
    diagnostic.kind!=='diagnostic-final-score-candidate' ||
    diagnostic.gameId!==CATAL ||
    diagnostic.trust!=='unverified-client-session' ||
    diagnostic.livesAtLastHud!==0 ||
    !Number.isInteger(diagnostic.score) || diagnostic.score<0||
    diagnostic.score>999999 ||
    !Number.isInteger(diagnostic.stableGraveFrames) ||
    diagnostic.stableGraveFrames<20 ||
    diagnostic.stableGraveFrames>500)return null;
  return Object.freeze({
    action:'finish',attemptId:attempt.attemptId,nonce:attempt.nonce,
    score:diagnostic.score,diagnostic:{
      kind:diagnostic.kind,gameId:diagnostic.gameId,score:diagnostic.score,
      livesAtLastHud:0,stableGraveFrames:diagnostic.stableGraveFrames,
      trust:'unverified-client-session'
    }
  });
}

/**
 * Must remain disabled until independent backend member auth + route are
 * deployed and reviewed. No payload allows a user to type a score.
 */
export class HelioHostArenaAttempt {
  #enabled;
  #csrf;
  #fetch;
  #active=null;
  #used=false;

  constructor({enabled=false,authenticated=false,csrfToken='',fetchImpl=globalThis.fetch,
               websiteOrigin=''}={}) {
    this.#enabled=enabled===true && authenticated===true &&
      websiteOrigin==='https://www.cheekycommodoregamer.co.uk' &&
      typeof csrfToken==='string' && /^[a-f0-9]{64}$/.test(csrfToken) &&
      typeof fetchImpl==='function';
    this.#csrf=csrfToken;
    this.#fetch=fetchImpl;
  }
  get enabled(){return this.#enabled;}
  get active(){return this.#active!==null;}
  async #post(body) {
    const response=await this.#fetch(CCG_ARENA_API_ORIGIN+CCG_ARENA_INTAKE_PATH,{
      method:'POST',mode:'cors',credentials:'include',cache:'no-store',
      headers:{'Content-Type':'application/json','X-CCG-CSRF':this.#csrf},
      body:JSON.stringify(body)
    });
    if(!response.ok)throw new Error('Arena service unavailable');
    return response.json();
  }
  async start(selection={}) {
    if(!this.#enabled||this.#active||this.#used)return null;
    const request=makeArenaStartRequest(selection);
    if(!request)return null;
    const result=await this.#post(request);
    if(!result || result.ok!==true ||result.status!=='started' ||
       !UUID.test(result.attemptId||'')||!NONCE.test(result.nonce||'') ||
       result.publicRankingUpdated!==false)return null;
    this.#active={attemptId:result.attemptId,nonce:result.nonce};
    return {status:'started',reviewRequired:true};
  }
  async finish(diagnostic) {
    if(!this.#enabled||!this.#active||this.#used)return null;
    const payload=makeArenaFinishRequest(this.#active,diagnostic);
    if(!payload)return null;
    // One-time use, independent of whether network/route succeeds.
    this.#used=true;
    this.#active=null;
    const result=await this.#post(payload);
    if(!result||result.ok!==true||result.status!=='pending-review'||
       result.publicRankingUpdated!==false||
       result.scoreReceived!==diagnostic.score)return null;
    return Object.freeze({status:'pending-review',scoreReceived:result.scoreReceived});
  }
  async cancel() {
    if(!this.#active||this.#used)return false;
    const attempt=this.#active;
    this.#active=null;
    this.#used=true;
    if(!this.#enabled)return false;
    try {
      await this.#post({action:'cancel',attemptId:attempt.attemptId,nonce:attempt.nonce});
      return true;
    } catch {return false;}
  }
  invalidate(){this.#used=true;this.#active=null;}
}
