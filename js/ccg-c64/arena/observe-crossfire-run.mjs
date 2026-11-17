/**
 * Crossfire (Pantheon/Atlantis) — read-only diagnostic end-of-run observer.
 * Correct game: archive-02121, 23637-byte packed PRG.
 *
 * Verified by headless C64Machine with the exact media checksum:
 * zero / 775 / 1550 / 2325 HUD scores, lives 2 -> 1 -> 0 and the
 * same sustained "HE WAS A GREAT COP" grave screen after scores 0 and 2325.
 * A transient HUD absence must NEVER count as game over.
 *
 * THIS IS NOT A TRUSTED SCORE SUBMISSION SERVICE. Client RAM and snapshots
 * can be manipulated. Do not connect this to user accounts, network or
 * rankings without a separate reviewed eligibility and moderation layer.
 */
import {
  readCrossfireScreenScore, readCrossfireScreenLives
} from './read-crossfire-screen-score.mjs';

export const CROSSFIRE_GAME_ID = 'archive-02121';
export const CROSSFIRE_PRG_SHA256 =
  'ddc3ab84c98fc065fd39e69bfe68b7ee6de38ebab4b51b607bbcea64cad570a9';

// Identical game-over screen-memory header measured independently after 0
// and 2325-point runs; differs from the first 80 bytes of the game title.
// This is edition-bound visual evidence, not a secure attestable signature.
const GRAVE_SCREEN_HEX = '0303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030333340235360303';
const GRAVE_BYTES = Uint8Array.from(
  { length: GRAVE_SCREEN_HEX.length / 2 },
  (_, i) => parseInt(GRAVE_SCREEN_HEX.slice(i * 2, i * 2 + 2), 16)
);

export function isCrossfireGameOverScreen(ram) {
  if (!(ram instanceof Uint8Array) || ram.length !== 65536 ||
      readCrossfireScreenScore(ram) !== null) return false;
  for (let i = 0; i < GRAVE_BYTES.length; i++) {
    if (ram[0x7400 + i] !== GRAVE_BYTES[i]) return false;
  }
  return true;
}

export class CrossfireRunObserver {
  constructor({ gameId, prgSHA256, stableFrames = 20 } = {}) {
    // A caller's claimed media ID alone does not establish trust. Only enable
    // a test-session observer for the exact edition; the host must separately
    // verify the loaded PRG bytes and enforce untrained, unrestored rules.
    this.enabled = gameId === CROSSFIRE_GAME_ID &&
      prgSHA256 === CROSSFIRE_PRG_SHA256;
    if (!Number.isInteger(stableFrames) || stableFrames < 20 || stableFrames > 500) {
      throw new RangeError('Crossfire final-screen gate must hold 20-500 frames');
    }
    this.stableFrames = stableFrames;
    this.started = false;
    this.lastScore = null;
    this.lastLives = null;
    this.sawLifeOne = false;
    this.sawZeroLives = false;
    this.graveFrames = 0;
    this.inconclusive = false;
    this.completed = false;
  }

  observe(ram) {
    if (!this.enabled || this.completed || this.inconclusive) return null;
    const score = readCrossfireScreenScore(ram);
    const lives = readCrossfireScreenLives(ram);
    if (score !== null && lives !== null) {
      // Reject mid-run attachment: a save/restore containing a high score
      // cannot be accepted as an observed fresh game in this diagnostic.
      if (!this.started) {
        if (score !== 0 || lives !== 2) return null;
        this.started = true;
      } else if (this.lastLives !== null && lives > this.lastLives) {
        // Bonus lives have not been verified in this exact game edition.
        // Fail closed rather than silently classifying an unexpected state.
        this.inconclusive = true;
        return null;
      }
      if (lives === 1) this.sawLifeOne = true;
      if (lives === 0 && this.sawLifeOne) this.sawZeroLives = true;
      this.lastScore = score; // last displayed value, NOT lifetime max
      this.lastLives = lives;
      this.graveFrames = 0;
      return null;
    }

    if (!this.started || !this.sawZeroLives ||
        !isCrossfireGameOverScreen(ram)) {
      this.graveFrames = 0;
      return null;
    }
    this.graveFrames++;
    if (this.graveFrames < this.stableFrames) return null;
    this.completed = true;
    return Object.freeze({
      kind: 'diagnostic-final-score-candidate',
      gameId: CROSSFIRE_GAME_ID,
      score: this.lastScore,
      livesAtLastHud: this.lastLives,
      stableGraveFrames: this.graveFrames,
      trust: 'unverified-client-session',
    });
  }
}
