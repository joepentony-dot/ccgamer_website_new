/**
 * Explicit one-click launcher for the owner's exact Sierra Crossfire CRT.
 *
 * The normal /emulator/c64/?game=...&autoplay=1 link already queues the
 * SHA-256 verified cartridge. Add &start=1 to press F1 ONCE, and only after
 * the genuine Sierra GAME OVER screen has been visible for 25 PAL frames.
 * This code is lazy-loaded only after Sierra CRT verification.
 *
 * In particular this is NOT a generic automated key injector; ordinary game
 * links, the Atlantis/Pantheon PRG and Crossfire - Tron are never eligible.
 * No network, score submission, browser synthetic events or persisted state.
 */
import { isSierraCrossfireGameOver } from './observe-sierra-crossfire-run.mjs';

export const SIERRA_ONE_CLICK_GAME_ID =
  'owner-crt-more-crossfiresierraonline-0c60e852f438';

export function isSierraOneClickLaunchQuery(search) {
  if (typeof search!=='string' || search.length>512) return false;
  try {
    const params=new URLSearchParams(search);
    for (const name of ['game','autoplay','start']) {
      if (params.getAll(name).length!==1) return false;
    }
    return params.get('game')===SIERRA_ONE_CLICK_GAME_ID &&
      params.get('autoplay')==='1' && params.get('start')==='1';
  } catch {
    return false;
  }
}

/**
 * Drives an 8-PAL-frame CIA F1 key hold, using emulated frames rather than a
 * browser timeout. All callbacks must refer to the exact verified C64Machine
 * instance, not whichever emulator happens to be current after media changes.
 */
export class SierraOneClickStarter {
  constructor({
    onArm,onPress,onRelease,stableFrames=25,holdFrames=8,maxWaitFrames=2000
  }={}) {
    if (![onArm,onPress,onRelease].every(fn=>typeof fn==='function')) {
      throw new TypeError('A verified machine must supply F1 callbacks');
    }
    if (!Number.isInteger(stableFrames) || stableFrames<20 || stableFrames>120 ||
        !Number.isInteger(holdFrames) || holdFrames<2 || holdFrames>20 ||
        !Number.isInteger(maxWaitFrames) ||
        maxWaitFrames<stableFrames || maxWaitFrames>10000) {
      throw new RangeError('Invalid Sierra one-click PAL-frame limits');
    }
    this.onArm=onArm;
    this.onPress=onPress;
    this.onRelease=onRelease;
    this.stableFrames=stableFrames;
    this.holdFrames=holdFrames;
    this.maxWaitFrames=maxWaitFrames;
    this.phase='waiting';
    this.elapsed=0;
    this.gameOverFrames=0;
    this.heldFrames=0;
  }

  tick(ram) {
    if (this.phase==='waiting') {
      this.elapsed++;
      if (this.elapsed>this.maxWaitFrames) {
        this.cancel();
        return false;
      }
      this.gameOverFrames=isSierraCrossfireGameOver(ram)
        ? this.gameOverFrames+1 : 0;
      if (this.gameOverFrames<this.stableFrames) return false;
      if (this.onArm()!==true || this.onPress()!==true) {
        this.cancel();
        return false;
      }
      this.phase='holding';
      this.heldFrames=0;
      return true;
    }
    if (this.phase==='holding') {
      this.heldFrames++;
      if (this.heldFrames>=this.holdFrames) {
        this.onRelease();
        this.phase='done';
      }
    }
    return false;
  }

  cancel() {
    if (this.phase==='holding') this.onRelease();
    this.phase='cancelled';
  }
}
