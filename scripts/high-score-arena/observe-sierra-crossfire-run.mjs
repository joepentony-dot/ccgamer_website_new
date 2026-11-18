/**
 * Sierra Crossfire (1983) CRT — local, diagnostic-only run observer.
 *
 * Game-over marker derived from original SHA-256-pinned C64Machine captures
 * in Actions run 44336498842. Final-score evidence for a positive run is
 * still missing. NEVER send this output to an API or publish a leaderboard.
 */
import { readSierraCrossfireScreenScores } from './read-sierra-crossfire-screen-score.mjs';

const SCREEN=0x0400;
const GAME_OVER_MARKER=Object.freeze([
 [10,0x13],[11,0x0a],[12,0xfc],[13,0x0a],[14,0xfd],[15,0x0a],
 [16,0x17],[20,0x00],[21,0x0a],[22,0xfe],[23,0x0a],[24,0x17],
 [25,0x0a],[26,0x16]
]);
const GAME_OVER_ROW=13;
export function sierraCrossfireGameOverVisible(ram) {
 if (!(ram instanceof Uint8Array)||ram.length!==65536) return false;
 for (const [col,value] of GAME_OVER_MARKER) {
  if (ram[SCREEN+GAME_OVER_ROW*40+col]!==value) return false;
 }
 // A visible GAME OVER alone is not evidence of a legitimate completed run.
 return readSierraCrossfireScreenScores(ram)!==null;
}
export class SierraCrossfireRunObserver {
 constructor({stableFrames=25}={}) {
  if(!Number.isInteger(stableFrames)||stableFrames<20||stableFrames>120)
   throw new RangeError('Need 20..120 stable C64 frames to recognise game over');
  this.stableFrames=stableFrames;
  this.clear();
 }
 clear() {
  this.armed=false;this.started=false;this.finished=false;
  this.currentScore=null;this.highScore=null;this.terminalFrames=0;
  this.lastScore=null;this.invalidated=false;
 }
 // Called ONLY by explicit user F1 key down after SHA-verified media selection.
 // A caller must reject Game Vault restore, trainer, media switching, resets,
 // altered cartridge bytes and broken authenticated member sessions.
 armFromUserF1() {
  this.clear();
  this.armed=true;
 }
 invalidate() {
  this.clear();
  this.invalidated=true;
 }
 observe(ram) {
  if (this.invalidated||this.finished)return null;
  const hud=readSierraCrossfireScreenScores(ram);
  if(!hud) {this.terminalFrames=0;return null;}
  this.currentScore=hud.score;
  this.highScore=hud.highScore;
  const gameOver=sierraCrossfireGameOverVisible(ram);
  if(!this.armed) return null; // Attract-mode displays aren't user runs.
  if(!gameOver) {
   this.terminalFrames=0;
   if(!this.started) {
    // Fresh F1 run must first show the initial zero score in active play.
    if(hud.score!==0)return null;
    this.started=true;
   } else if(this.lastScore!==null&&hud.score<this.lastScore) {
    this.invalidate();return null;
   }
   this.lastScore=hud.score;
   return null;
  }
  if(!this.started||this.lastScore===null) return null;
  // Observe a stable real game-over screen, not a transient overlay or reset.
  this.terminalFrames++;
  if(this.terminalFrames<this.stableFrames)return null;
  this.finished=true;
  return Object.freeze({
   kind:'sierra-crt-unverified-local-terminal-candidate',
   score:this.lastScore,
   terminalFrames:this.terminalFrames,
   verified:false,
   maySubmit:false
  });
 }
}
