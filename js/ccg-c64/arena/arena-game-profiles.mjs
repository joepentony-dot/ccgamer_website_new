/**
 * CCG High Score Arena: exact-media game profiles.
 *
 * Reuse this registration contract for future verified titles.
 * Only Crossfire has an adapter. This file NEVER enables submissions.
 * Adding a game requires independently validated media, scores, lives or
 * another true completion signal, a game-specific observer and new CI tests.
 */
import {
  CROSSFIRE_GAME_ID,
  CROSSFIRE_PRG_SHA256,
  CrossfireRunObserver
} from './observe-crossfire-run.mjs';

export const ARENA_CROSSFIRE_PROFILE = Object.freeze({
  key: 'c64-crossfire-atlantis',
  platform: 'c64',
  displayTitle: 'Crossfire',
  publisher: 'Atlantis Software',
  developer: 'Pantheon Software',
  media: Object.freeze({
    catalogId: CROSSFIRE_GAME_ID,
    format: 'prg',
    sha256: CROSSFIRE_PRG_SHA256,
    byteLength: 23637
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
  adapter: 'crossfire-grave-screen-v1',
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

export function createArenaDiagnosticObserver(media) {
  const profile = identifyArenaMedia(media);
  if (!profile || profile.adapter !== 'crossfire-grave-screen-v1') return null;
  return new CrossfireRunObserver({
    gameId: profile.media.catalogId,
    prgSHA256: profile.media.sha256
  });
}

export function arenaProfileKeys() {
  return PROFILES.map(item => item.key);
}
