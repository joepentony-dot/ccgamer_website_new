/**
 * Sierra On-Line Crossfire CRT — local score/run observer only.
 *
 * The ORIGINAL exact SHA-256-verified Sierra CRT produced two complete
 * independent C64Machine captures in Actions run 44342537424: 170 and 150.
 * This module reads screen RAM only. It makes NO authenticity, fairness or
 * membership claim and must NEVER submit scores or populate rankings.
 *
 * F1 arming is accepted only after an actual observed GAME OVER screen.
 * This prevents SierraVision credits / unattended attract play being counted.
 * Mounting code independently verifies actual cartridge bytes and identity.
 */
import { readSierraCrossfireScreenScores } from './read-sierra-crossfire-screen-score.mjs';

const SCREEN_BASE = 0x0400;
const GAME_OVER_ROW = 13;
const GAME_OVER_MARKER = Object.freeze([
  [10,0x13],[11,0x0a],[12,0xfc],[13,0x0a],[14,0xfd],[15,0x0a],
  [16,0x17],[20,0x00],[21,0x0a],[22,0xfe],[23,0x0a],
  [24,0x17],[25,0x0a],[26,0x16]
]);
export function isSierraCrossfireGameOver(ram) {
  if (!(ram instanceof Uint8Array) || ram.length!==65536) return false;
  if (!readSierraCrossfireScreenScores(ram)) return false;
  for (const [column,value] of GAME_OVER_MARKER) {
    if (ram[SCREEN_BASE + GAME_OVER_ROW*40 + column]!==value) return false;
  }
  return true;
}

export class SierraCrossfireLocalRunObserver {
  constructor({stableFrames=25}={}) {
    if (!Number.isInteger(stableFrames) || stableFrames<20 || stableFrames>120) {
      throw new RangeError('Sierra CRT requires 20–120 stable GAME OVER frames');
    }
    this.stableFrames=stableFrames;
    this.clear();
  }

  clear() {
    this.phase='attract';
    this.sawGameOver=false;
    this.lastScore=null;
    this.finalScore=null;
    this.consecutiveGameOver=0;
  }

  invalidate() {
    this.clear();
    this.phase='invalid';
  }

  armFromUserF1() {
    // F1 during loading/credits or mid-game is never an eligible start.
    if (!this.sawGameOver ||
        !['attract','completed','invalid'].includes(this.phase)) return false;
    this.phase='armed';
    this.lastScore=null;
    this.finalScore=null;
    this.consecutiveGameOver=0;
    return true;
  }

  observe(ram) {
    const hud=readSierraCrossfireScreenScores(ram);
    if (!hud) {
      this.consecutiveGameOver=0;
      return null;
    }
    const over=isSierraCrossfireGameOver(ram);
    if (over) this.sawGameOver=true;

    if (this.phase==='attract' || this.phase==='invalid' ||
        this.phase==='completed') return null;

    if (this.phase==='armed') {
      if (over || hud.score!==0) return null;
      this.phase='running';
      this.lastScore=0;
      return null;
    }

    if (this.phase!=='running') return null;
    if (over) {
      if (this.lastScore===null) return null;
      this.consecutiveGameOver++;
      if (this.consecutiveGameOver<this.stableFrames) return null;
      this.phase='completed';
      this.finalScore=this.lastScore;
      return Object.freeze({
        kind:'sierra-crt-local-final-candidate',
        score:this.finalScore,
        stableFrames:this.consecutiveGameOver,
        verified:false,
        eligibleForSubmission:false
      });
    }

    this.consecutiveGameOver=0;
    if (hud.score<this.lastScore) {
      this.invalidate();
      return null;
    }
    this.lastScore=hud.score;
    return null;
  }
}
