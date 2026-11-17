/**
 * CCG High Score Arena: exact-media game profiles.
 *
 * Reuse this registration contract for future verified titles.
 * The Sierra Online CRT is the only opted-in Crossfire presentation edition.
 * Its HUD, lives and game-over signatures have NOT been measured. The old
 * Atlantis PRG observer must never be applied to this different game.
 * No score observers or network submissions are enabled.
 */
import { SIERRA_CROSSFIRE_CRT } from '../game-catalog.js';

export const ARENA_CROSSFIRE_PROFILE = Object.freeze({
  key: 'c64-crossfire-sierra-online',
  platform: 'c64',
  displayTitle: 'Crossfire (Sierra Online)',
  publisher: 'Sierra On-Line',
  developer: 'Not independently verified',
  media: Object.freeze({
    catalogId: SIERRA_CROSSFIRE_CRT.id,
    format: 'crt',
    sha256: SIERRA_CROSSFIRE_CRT.sha256,
    byteLength: SIERRA_CROSSFIRE_CRT.bytes
  }),
  rules: Object.freeze({
    startLevel: 1,
    unlimitedLives: false,
    unlimitedTime: false,
    saveStateEligible: false,
    scoreUnit: 'points'
  }),
  scoreboard: Object.freeze({
    modes: Object.freeze(['alltime', 'challenge']),
    maxDisplayed: 5,
    digitStyle: 'blue-pinball-seven-segment',
    frameAsset: 'crossfire-user-supplied-art',
    gameAspect: '4/3'
  }),
  adapter: 'crt-score-forensics-not-yet-verified',
  // No client-side runtime can by itself establish cheat-free score integrity.
  publicSubmissionEnabled: false
});
const PROFILES = Object.freeze([ARENA_CROSSFIRE_PROFILE]);

export function identifyArenaMedia(media) {
  if (!media || typeof media !== 'object' || Array.isArray(media)) return null;
  for (const profile of PROFILES) {
    const exact = profile.media;
    if (media.platform === profile.platform &&
        media.catalogId === exact.catalogId &&
        media.format === exact.format &&
        media.sha256 === exact.sha256 &&
        media.byteLength === exact.byteLength) return profile;
  }
  return null;
}

// The verified Atlantis PRG RAM addresses DO NOT apply to Sierra's CRT.
// Refuse a score observer until cartridge-specific gameplay forensics exist.
export function createArenaDiagnosticObserver(_media) {
  return null;
}

export function arenaProfileKeys() {
  return PROFILES.map(item => item.key);
}
