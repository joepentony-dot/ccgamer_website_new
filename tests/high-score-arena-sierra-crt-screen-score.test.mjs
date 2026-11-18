import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
 readSierraCrossfireScreenScores,SIERRA_SCORE_SCREEN_BASE,
 SIERRA_SCORE_ROWS,SIERRA_HIGHSCORE_ROWS,SIERRA_SCORE_COL
} from '../scripts/high-score-arena/read-sierra-crossfire-screen-score.mjs';

const ZERO=Uint8Array.from([0x7e,0xff,0xe7,0xe7,0xe7,0xff,0x7e,0x00]);
const EIGHT=Uint8Array.from([0x7e,0xe7,0xe7,0x7e,0xe7,0xe7,0x7e,0x00]);
function screen(score=0,high=0){
 const ram=new Uint8Array(65536);
 for(const [row,value] of [[0,0x14],[1,0x15],[3,0x16],[4,0x17],
  [13,0x14],[14,0x15],[16,0x16],[17,0x17]]) {
  ram[SIERRA_SCORE_SCREEN_BASE+row*40+SIERRA_SCORE_COL]=value;
 }
 ram.set(ZERO,0x2800);
 ram.set(EIGHT,0x2800+8*8);
 for(const [number,rows] of [[score,SIERRA_SCORE_ROWS],[high,SIERRA_HIGHSCORE_ROWS]]) {
  const chars=String(number).padStart(6,'0');
  for(let i=0;i<6;i++)ram[SIERRA_SCORE_SCREEN_BASE+rows[i]*40+SIERRA_SCORE_COL]=Number(chars[i]);
 }
 return ram;
}
test('real-capture-compatible zero HUD has two six-digit values',()=>{
 const result=readSierraCrossfireScreenScores(screen());
 assert.equal(result.score,0);
 assert.equal(result.highScore,0);
 assert.equal(result.kind,'local-read-only-hud-candidate');
});
test('synthetic 000800 glyph bytes exercise numeric decoding only, not a real scored ROM run',()=>{
 const result=readSierraCrossfireScreenScores(screen(800,1500));
 assert.equal(result.score,800);
 assert.equal(result.highScore,1500);
});
test('title-only or unrelated RAM cannot be called a game score',()=>{
 assert.equal(readSierraCrossfireScreenScores(new Uint8Array(65536)),null);
 assert.equal(readSierraCrossfireScreenScores(new Uint8Array(0)),null);
 assert.equal(readSierraCrossfireScreenScores(null),null);
});
test('corrupt font, signature or non-digit fails closed',()=>{
 const altered=screen();altered[0x2800]^=1;
 assert.equal(readSierraCrossfireScreenScores(altered),null);
 const malformed=screen();malformed[0x400+19*40+39]=0x10;
 assert.equal(readSierraCrossfireScreenScores(malformed),null);
 const wrong=screen();wrong[0x400+13*40+39]=0;
 assert.equal(readSierraCrossfireScreenScores(wrong),null);
});


import { SierraCrossfireRunObserver, sierraCrossfireGameOverVisible } from '../scripts/high-score-arena/observe-sierra-crossfire-run.mjs';

// The marker bytes below were recorded from the *real* original cartridge's
// GAME OVER screen at frame 503 in Actions run 44336498842. This test uses
// a constructed 64K RAM to exercise the decoder; it is NOT a real positive run.
function gameOver(ram) {
 for(const [col,value] of [
  [10,0x13],[11,0x0a],[12,0xfc],[13,0x0a],[14,0xfd],[15,0x0a],
  [16,0x17],[20,0],[21,0x0a],[22,0xfe],[23,0x0a],
  [24,0x17],[25,0x0a],[26,0x16]
 ])ram[0x400+13*40+col]=value;
 return ram;
}
test('original CRT game-over glyph signature is recognised but not mistaken for submission',()=>{
 const ram=screen(0);assert.equal(sierraCrossfireGameOverVisible(ram),false);
 assert.equal(sierraCrossfireGameOverVisible(gameOver(ram)),true);
 assert.equal(sierraCrossfireGameOverVisible(new Uint8Array(65536)),false);
});
test('attract-mode GAME OVER without deliberate F1 must not complete a player run',()=>{
 const observer=new SierraCrossfireRunObserver({stableFrames:20});
 for(let i=0;i<60;i++)assert.equal(observer.observe(gameOver(screen(0))),null);
 assert.equal(observer.finished,false);
});
test('F1 arming plus distinct active HUD and 20 stable terminal frames remains local and unverified',()=>{
 const observer=new SierraCrossfireRunObserver({stableFrames:20});
 observer.armFromUserF1();
 assert.equal(observer.observe(screen(0)),null);
 assert.equal(observer.observe(screen(800)),null);
 for(let i=0;i<19;i++)assert.equal(observer.observe(gameOver(screen(800))),null);
 const final=observer.observe(gameOver(screen(800)));
 assert.equal(final.score,800);
 assert.equal(final.verified,false);
 assert.equal(final.maySubmit,false);
 assert.equal(final.kind,'sierra-crt-unverified-local-terminal-candidate');
 assert.equal(observer.observe(gameOver(screen(800))),null);
});
test('restore or score decrement invalidates candidate and prevents repeated completion',()=>{
 const observer=new SierraCrossfireRunObserver({stableFrames:20});
 observer.armFromUserF1();
 observer.observe(screen(0));observer.observe(screen(800));
 assert.equal(observer.observe(screen(10)),null);
 assert.equal(observer.invalidated,true);
 for(let i=0;i<40;i++)assert.equal(observer.observe(gameOver(screen(10))),null);
});
test('invalid states refuse fake start and early terminal',()=>{
 const observer=new SierraCrossfireRunObserver({stableFrames:20});
 observer.armFromUserF1();
 for(let i=0;i<40;i++)assert.equal(observer.observe(gameOver(screen(100))),null);
 assert.equal(observer.started,false);
 assert.throws(()=>new SierraCrossfireRunObserver({stableFrames:1}),RangeError);
});


test('authentic 2026-11-18 no-F1 ROM capture decodes zero score and rejects demo submission',()=>{
 const fixture=JSON.parse(readFileSync(new URL('./fixtures/sierra-crossfire-crt-real-zero-gameover.json',import.meta.url),'utf8'));
 const ram=new Uint8Array(65536);
 ram.set(fixture.digitFont,0x2800);
 for(let row=0;row<25;row++)ram[0x400+row*40+39]=fixture.edgeColumn[row];
 ram.set(fixture.gameOverTextRow13,0x400+13*40+10);
 const decoded=readSierraCrossfireScreenScores(ram);
 assert.equal(decoded.score,fixture.expected.score);
 assert.equal(decoded.highScore,fixture.expected.highScore);
 assert.equal(sierraCrossfireGameOverVisible(ram),fixture.expected.gameOverVisible);
 const active=ram.slice();
 active.set(fixture.activeScreenshot.centerRow13,0x400+13*40+10);
 assert.equal(readSierraCrossfireScreenScores(active).score,fixture.activeScreenshot.expected.score);
 assert.equal(sierraCrossfireGameOverVisible(active),false);
 const observer=new SierraCrossfireRunObserver({stableFrames:20});
 for(let i=0;i<40;i++)assert.equal(observer.observe(ram),null);
 assert.equal(observer.armed,false);
 assert.equal(observer.finished,false);
 assert.equal(fixture.expected.submittable,false);
});
