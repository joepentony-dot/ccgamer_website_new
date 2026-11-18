import test from 'node:test';
import assert from 'node:assert/strict';
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
