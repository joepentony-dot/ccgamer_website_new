/**
 * Sierra On-Line Crossfire CRT — read-only VIC score glyph decoder.
 * This module may display LOCAL scores only; NEVER use it as proof for ranked submissions.
 *
 * Based on actual original-media C64Machine captures from 18 Nov 2026:
 * VIC screen $0400; rightmost column 39; 6-digit current-score glyphs on
 * screen rows 19..24, existing high score rows 6..11. Digit charset at $2800,
 * custom glyph indices $00..$09. The ROM/font can be revalidated in RAM.
 *
 * Authentic original-ROM local scores 000010 were captured at two distinct
 * gameplay frames (Actions run 44340060196) and corroborated against video PNGs.
 * This still cannot validate player identity or a final completed game.
 * Caller MUST independently verify SHA-pinned Sierra CRT bytes and session.
 */
export const SIERRA_SCORE_SCREEN_BASE = 0x0400;
export const SIERRA_SCORE_COL = 39;
export const SIERRA_SCORE_ROWS = Object.freeze([19,20,21,22,23,24]);
export const SIERRA_HIGHSCORE_ROWS = Object.freeze([6,7,8,9,10,11]);
const TITLE_SIGNATURE = Object.freeze([
 [0,0x14],[1,0x15],[3,0x16],[4,0x17],
 [13,0x14],[14,0x15],[16,0x16],[17,0x17]
]);
// Actual $2800 digit glyphs from original Sierra cartridge headless RAM.
// These are not score offsets or evidence of any finished run.
const GLYPHS = Object.freeze([
 [0x00,[0x7e,0xff,0xe7,0xe7,0xe7,0xff,0x7e,0x00]],
 [0x08,[0x7e,0xe7,0xe7,0x7e,0xe7,0xe7,0x7e,0x00]]
]);
function readGlyphNumber(ram,rows) {
 let score=0;
 for(const row of rows) {
  const glyph=ram[SIERRA_SCORE_SCREEN_BASE+row*40+SIERRA_SCORE_COL];
  if(glyph>9)return null;
  score=score*10+glyph;
 }
 return score;
}
export function readSierraCrossfireScreenScores(ram) {
 if(!(ram instanceof Uint8Array)||ram.length!==65536)return null;
 for(const [row,glyph] of TITLE_SIGNATURE) {
  if(ram[SIERRA_SCORE_SCREEN_BASE+row*40+SIERRA_SCORE_COL]!==glyph)return null;
 }
 for(const [code,bytes] of GLYPHS) {
  for(let i=0;i<8;i++)if(ram[0x2800+code*8+i]!==bytes[i])return null;
 }
 const score=readGlyphNumber(ram,SIERRA_SCORE_ROWS);
 const highScore=readGlyphNumber(ram,SIERRA_HIGHSCORE_ROWS);
 if(score===null||highScore===null)return null;
 return Object.freeze({score,highScore,kind:'local-read-only-hud-candidate'});
}
