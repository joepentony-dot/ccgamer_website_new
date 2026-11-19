/**
 * User-requested Sierra Crossfire score submission through HelioHost.
 *
 * Independent, opt-in, same-origin browser bridge. The only authoritative
 * "received" result is a matching authenticated HelioHost pending-review ACK.
 * The browser cannot verify honest play or place a score on a public board.
 * No fallback to old Crossfire PRG, Tron, Supabase, or a guessed identity.
 */
import { acquireSierraAttempt, SIERRA_CATALOG_ID } from './sierra-heliohost-attempt.mjs';
import { SierraAutomaticAttempt } from './sierra-auto-run-controller.mjs';
import { readHelioHostSierraBoard } from './sierra-heliohost-board.mjs';

export const CCG_SITE_ORIGIN='https://www.cheekycommodoregamer.co.uk';
const SCORE_PARAM='scores';
const QUERY_MAX=512;

export function isSierraHelioHostScoreIntent(query,origin) {
 if(origin!==CCG_SITE_ORIGIN||typeof query!=='string'||
    query.length>QUERY_MAX) return false;
 try {
  const params=new URLSearchParams(query);
  if(params.getAll(SCORE_PARAM).length!==1 ||
     params.get(SCORE_PARAM)!=='1' ||
     params.getAll('game').length!==1 ||
     params.get('game')!==SIERRA_CATALOG_ID) return false;
  // Reject ambiguous duplicated autoload/start selectors if present.
  for(const name of ['autoplay','start'])if(params.getAll(name).length>1)return false;
  return true;
 }catch{return false;}
}

export class SierraHelioHostScoreBridge {
 #closed=false;#transport=null;#run=null;#connecting=null;
 #abort=null;#armedForRun=false;#finished=false;
 constructor({enabled=false,origin='',fetchImpl=globalThis.fetch,
              onStatus=()=>{},onBoard=()=>{},acquire=acquireSierraAttempt,
              readBoard=readHelioHostSierraBoard}={}) {
  this.enabled=enabled===true&&origin===CCG_SITE_ORIGIN;
  this.origin=origin;
  this.fetchImpl=fetchImpl;
  this.onStatus=onStatus;
  this.onBoard=onBoard;
  this.acquire=acquire;
  this.readBoard=readBoard;
 }
 get connected(){return this.#run?.enabled===true&&!this.#closed;}
 get finished(){return this.#finished;}
 #status(value) { if(!this.#closed)this.onStatus(value); }
 connect() {
  if(!this.enabled||this.#closed)return Promise.resolve(false);
  if(this.#connecting)return this.#connecting;
  this.#status('CHECKING HELIOHOST MEMBER SESSION');
  this.#abort=new AbortController();
  // Public, approved-only Sierra rankings are independent of member login.
  // This is a credential-free GET, and only the explicit scores=1 Sierra
  // preview constructs this bridge. Submission still requires auth and CSRF.
  void this.loadBoard('alltime');
  this.#connecting=(async()=>{
   let transport=null;
   try {
    transport=await this.acquire({
      enabled:true,websiteOrigin:this.origin,
      fetchImpl:this.fetchImpl,signal:this.#abort.signal
    });
    if(this.#closed) {
      transport?.invalidate?.();
      return false;
    }
    if(!transport?.enabled) {
      this.#status('HELIOHOST UNAVAILABLE OR SIGN-IN REQUIRED');
      return false;
    }
    this.#transport=transport;
    this.#run=new SierraAutomaticAttempt(transport);
    this.#status('SIGNED IN · START A NEW GAME TO REQUEST SCORE');
    // Deferred F1 intent is retained by the parent Arena controller until
    // member/CSRF is ready. This bridge only arms on explicit armed().
    // The public board read started independently of authentication.
    return true;
   }catch{
    this.#status('HELIOHOST UNAVAILABLE · SCORE LOCAL ONLY');
    return false;
   }
  })();
  return this.#connecting;
 }
 async loadBoard(board='alltime') {
  if(!this.enabled||this.#closed||!['alltime','challenge'].includes(board))return null;
  try {
   const result=await this.readBoard({
    enabled:true,board,fetchImpl:this.fetchImpl,signal:this.#abort?.signal
   });
   if(this.#closed || !result || result.status==='unavailable')return null;
   this.onBoard(board,result);
   return result;
  }catch{return null;}
 }
 armed() {
  if(!this.connected) {
   if(this.enabled)this.#status('HELIOHOST NOT READY · SCORE LOCAL ONLY');
   return false;
  }
  if(this.#finished || this.#run?.stopped) {
   this.#status('RELOAD TO RECORD ANOTHER RUN');
   return false;
  }
  this.#armedForRun=true;
  this.#status('RUN ARMED · HELIOHOST REQUEST STARTS AT 000000');
  return true;
 }
 observe(observer,final=null) {
  if(!this.connected||this.#closed||!this.#armedForRun)return;
  const phase=observer?.phase;
  if(phase==='invalid') {
   this.#run.stop();
   this.#status('RUN INVALIDATED · NOT SUBMITTED');
   return;
  }
  const wasStarted=this.#run.started;
  const result=this.#run.observe(observer,final);
  if(!wasStarted && this.#run.started) {
   this.#status('HELIOHOST ATTEMPT REQUESTED');
  }
  if(!result || this.#finished)return;
  this.#finished=true;
  const score=final?.score;
  this.#status('GAME OVER · AWAITING HELIOHOST RECEIPT');
  void Promise.resolve(result).then(receipt=>{
   if(this.#closed)return;
   if(receipt?.status==='pending-review'&&receipt.scoreReceived===score) {
    this.#status('SCORE '+String(score).padStart(6,'0')+' RECEIVED · PENDING REVIEW');
    void this.loadBoard('alltime');
   }else this.#status('SUBMISSION NOT CONFIRMED · LOCAL SCORE ONLY');
  }).catch(()=>{
   this.#status('SUBMISSION FAILED · LOCAL SCORE ONLY');
  });
 }
 stop() {
  if(this.#closed)return;
  this.#closed=true;
  this.#abort?.abort();
  this.#run?.stop();
  if(!this.#run)this.#transport?.invalidate?.();
 }
}
