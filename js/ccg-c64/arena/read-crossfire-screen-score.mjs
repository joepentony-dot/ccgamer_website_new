/**
 * Atlantis/Pantheon Crossfire C64 — read-only HUD score glyph decoder.
 * Source: exact game archive-02121, PRG SHA-256 ddc3ab84c98fc065fd39e69bfe68b7ee6de38ebab4b51b607bbcea64cad570a9.
 *
 * OBSERVATION, not a submission contract: 16 Nov 2026 headless real game
 * capture displayed 000000 then 000775 after a controlled lower-window shot.
 * Each of six 2-tile wide digits uses codes 0x04,0x05 for zero;
 * 0x08,0x09 for 1, etc. This pattern has only been exercised on 0,5,7.
 *
 * A caller must separately verify media identity, emulator lifecycle, lack
 * of trainers/restore and a real game-over event. Never publish a score based
 * solely on this decoder.
 */
export const CROSSFIRE_HUD_SCREEN_BASE = 0x7400;
export const CROSSFIRE_HUD_SCORE_BASE = 0x7443;
export const CROSSFIRE_HUD_SCORE_DIGITS = 6;

export function readCrossfireScreenScore(ram) {
  if (!(ram instanceof Uint8Array) || ram.length !== 65536) return null;
  const base = CROSSFIRE_HUD_SCREEN_BASE;
  // All known active-game HUD samples use a 40-byte border header and a
  // distinctive two-character digit/time row. This is a corruption guard,
  // not proof that the game is active or that the score is final.
  for (let i = 0; i < 40; i++) if (ram[base + i] !== 0x01) return null;
  if (ram[base + 40] !== 0x01 ||
      ram[base + 40 + 19] !== 0x2c ||
      ram[base + 40 + 39] !== 0x01) return null;

  let score = 0;
  for (let i = 0; i < CROSSFIRE_HUD_SCORE_DIGITS; i++) {
    const a = ram[CROSSFIRE_HUD_SCORE_BASE + i * 2];
    const b = ram[CROSSFIRE_HUD_SCORE_BASE + i * 2 + 1];
    if (b !== a + 1 || a < 0x04 || a > 0x28 || ((a - 0x04) % 4) !== 0) {
      return null;
    }
    score = score * 10 + (a - 0x04) / 4;
  }
  return score;
}


/**
 * Remaining lives shown as a single paired tile digit in the top-left HUD.
 * Observed 2 -> 1 -> 0 on exact Atlantis/Pantheon Crossfire, run 43938124747.
 * A zero here means the LAST life, not the end of the whole game.
 */
export function readCrossfireScreenLives(ram) {
  if (readCrossfireScreenScore(ram) === null) return null;
  const first = ram[0x7429], second = ram[0x742a];
  if (second !== first + 1 || first < 0x04 || first > 0x28 ||
      (first - 0x04) % 4 !== 0) return null;
  return (first - 0x04) / 4;
}
