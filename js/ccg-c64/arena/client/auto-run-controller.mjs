/**
 * CCG Crossfire high-score attempt lifecycle.
 *
 * This is a transport bridge, NOT anti-cheat. No account IDs, cookies,
 * manually entered scores or writes exist unless a separately authenticated,
 * independently released HelioHostArenaAttempt is explicitly injected.
 */
export class CrossfireAutomaticAttempt {
  #transport;
  #begun=false;
  #finished=false;
  #stopped=false;
  #startPromise=null;

  constructor(transport=null) {
    this.#transport=transport?.enabled===true ? transport : null;
  }

  get enabled(){return this.#transport!==null;}

  /**
   * Observer must have proven exact PRG and fresh game HUD (0 score, 2 lives).
   * Transport START always uses permanent all-time category; the server also
   * binds any current published challenge to that same attempt.
   */
  observe(observer,candidate=null) {
    if(this.#stopped || !this.#transport)return null;
    if(!this.#begun && observer?.started===true &&
       observer.lastScore===0 && observer.lastLives===2) {
      this.#begun=true;
      this.#startPromise=Promise.resolve()
        .then(()=>this.#stopped ? null : this.#transport.start({board:'alltime'}))
        .catch(()=>null);
    }
    if(!candidate || this.#finished || !this.#startPromise)return null;
    if(candidate.kind!=='diagnostic-final-score-candidate'
       ||candidate.gameId!=='archive-02121'
       ||candidate.trust!=='unverified-client-session'
       ||!Number.isInteger(candidate.score)||candidate.score<0
       ||candidate.score>999999 ||candidate.livesAtLastHud!==0
       ||!Number.isInteger(candidate.stableGraveFrames)
       ||candidate.stableGraveFrames<20)return null;
    this.#finished=true;
    return this.#startPromise.then(started=>{
      if(this.#stopped || started?.status!=='started')return null;
      return this.#transport.finish(candidate);
    }).catch(()=>null);
  }

  stop() {
    if(this.#stopped)return;
    this.#stopped=true;
    if(!this.#startPromise){
      this.#transport?.invalidate?.();
      return;
    }
    void this.#startPromise.then(started=>{
      if(started?.status==='started')return this.#transport.cancel?.();
    }).catch(()=>{});
  }
}
