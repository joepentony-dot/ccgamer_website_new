/**
 * Sierra Crossfire CRT — transport bridge, not a proof of fair gameplay.
 * Explicit, independently enabled transport injection is required.
 * Unimported by the production emulator: no network or public score writes.
 */
export class SierraAutomaticAttempt {
  #transport;
  #started=false;
  #finished=false;
  #stopped=false;
  #startPromise=null;
  #finishPromise=null;
  #finishDispatched=false;

  constructor(transport=null) {
    this.#transport=transport?.enabled===true ? transport : null;
  }
  get enabled(){return this.#transport!==null;}
  get started(){return this.#started;}
  get finished(){return this.#finished;}
  get stopped(){return this.#stopped;}

  observe(observer,candidate=null) {
    if(!this.#transport||this.#stopped)return null;

    // A reset, altered game, invalidated score or emulator transition
    // destroys a pending attempt even when the server reply is in flight.
    if(observer?.phase==='invalid') {
      this.stop();
      return null;
    }

    if(!this.#started && observer?.phase==='running' &&
       observer.lastScore===0) {
      this.#started=true;
      // Always begin on permanent all-time; server automatically binds
      // any currently published challenge based on server-side timestamps.
      this.#startPromise=Promise.resolve()
        .then(()=>this.#stopped ? null : this.#transport.start({board:'alltime'}))
        .catch(()=>null);
    }

    if(!candidate||this.#finished||!this.#startPromise)return null;
    // A client cannot claim verification, eligibility or trustworthiness.
    if(candidate.kind!=='sierra-crt-local-final-candidate' ||
       candidate.verified!==false ||
       candidate.eligibleForSubmission!==false ||
       !Number.isInteger(candidate.score)||candidate.score<0 ||
       candidate.score>999999||
       !Number.isInteger(candidate.stableFrames)||
       candidate.stableFrames<25||candidate.stableFrames>120) return null;

    this.#finished=true;
    const final=Object.freeze({
      kind:candidate.kind,score:candidate.score,
      stableFrames:candidate.stableFrames,
      verified:false,eligibleForSubmission:false
    });
    this.#finishPromise=this.#startPromise.then(started=>{
      if(this.#stopped||started?.status!=='started')return null;
      this.#finishDispatched=true;
      return this.#transport.finish(final);
    }).catch(()=>null);
    return this.#finishPromise;
  }

  stop(){
    if(this.#stopped)return;
    this.#stopped=true;
    if(!this.#startPromise){
      this.#transport?.invalidate?.();
      return;
    }
    // If an attempt was started but no valid final was posted, cancellation
    // invalidates its server-issued nonce. No retry or public promotion.
    if(!this.#finishDispatched){
      void this.#startPromise.then(result=>{
        if(result?.status==='started')return this.#transport.cancel?.();
      }).catch(()=>{});
    }
  }
}
