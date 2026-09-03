# The Lost Sizzler — Supabase Storage Runtime Reference Trace

This document records the current read-only runtime trace for the 16 enabled Lost Sizzler music objects frozen in `SUPABASE-STORAGE-RECOVERY-MANIFEST.md`.

It does not authorise any Supabase Storage/database mutation and does not choose final repository destinations for recovered binaries. Final destination and reference migration decisions remain blocked until enabled objects are actually recovered, measured, SHA-256 hashed and decode-verified.

## Category-to-runtime mapping

`js/admin-audio-overrides.js` maps the database music keys to the five dungeon soundtrack states:

| Frozen database category | Runtime state | Current bundled fallback |
| --- | --- | --- |
| `lostSizzlerExploration` | `normal` | `assets/audio/music/exploration.wav` |
| `lostSizzlerDanger` | `danger` | `assets/audio/music/danger.wav` |
| `lostSizzlerSanctuary` | `sanctuary` | `assets/audio/music/sanctuary.wav` |
| `lostSizzlerNamed` | `named` | `assets/audio/music/named-enemy.wav` |
| `lostSizzlerStalker` | `stalker` | `assets/audio/music/count-loadula.wav` |

The bundled fallback paths are defined in `js/audio-assets.js`. They are independent local assets and are not evidence that the frozen Storage MP3s have already been recovered.

## Frozen enabled objects by runtime state

### `danger`

Database category: `lostSizzlerDanger`

Enabled originals:

- `combat-01.mp3`
- `combat-02.mp3`
- `combat-03.mp3`

Current local fallback: `assets/audio/music/danger.wav`

### `normal`

Database category: `lostSizzlerExploration`

Enabled originals:

- `exploration-01.mp3`
- `exploration-02.mp3`
- `exploration-03.mp3`
- `exploration-04.mp3`
- `exploration-05.mp3`

Current local fallback: `assets/audio/music/exploration.wav`

### `named`

Database category: `lostSizzlerNamed`

Enabled originals:

- `named-01.mp3`
- `named-02.mp3`
- `named-03.mp3`

Current local fallback: `assets/audio/music/named-enemy.wav`

### `sanctuary`

Database category: `lostSizzlerSanctuary`

Enabled originals:

- `sanctuary-01.mp3`
- `sanctuary-02.mp3`

Current local fallback: `assets/audio/music/sanctuary.wav`

### `stalker`

Database category: `lostSizzlerStalker`

Enabled originals:

- `count-loadula-01.mp3`
- `count-loadula-02.mp3`
- `count-loadula-03.mp3`

Current local fallback: `assets/audio/music/count-loadula.wav`

## Runtime selection chain

The current music path is intentionally local-first.

1. `js/audio-assets.js` supplies one bundled local fallback for each of the five states and one-element bundled playlists.
2. `js/admin-audio-overrides.js` does not query Supabase unless remote media is explicitly allowed by `window.__CCG_ALLOW_REMOTE_MEDIA__ === true` or the dedicated test override.
3. When remote media is disabled, admin playlists are explicitly emptied and the local assets remain available.
4. When remote media is explicitly enabled, enabled `arcade_assets` music rows are grouped by the five category keys above and exposed as admin playlists/first-track values.
5. `js/lost-sizzler-playlist-audio.js` prefers explicit owner/admin playlist sources over bundled defaults, and otherwise falls back to `CCG_AUDIO_ASSETS`.
6. The playlist layer recognises Supabase Storage music URLs as metered remote tracks and loops a selected remote song locally for that state rather than repeatedly downloading new multi-megabyte tracks at each song end.

This preserves the project rule: offline game first, online enhancements second.

## Recovery implications

The 16 frozen enabled MP3s represent multi-track remote playlists, while the current bundled runtime has one fallback WAV per state. Therefore recovery must preserve the distinction between:

- **verified recovered originals**;
- **current bundled fallbacks**; and
- **future runtime reference decisions**.

Do not overwrite or rename the bundled WAVs merely because a recovered MP3 belongs to the same state. Do not collapse the recovered multi-track playlists to the single bundled fallback without an explicit later design decision.

A final local destination is still `TBD AFTER VERIFY` for every recovered object. The existing `assets/audio/music/` directory is the current runtime music location, but this trace does not pre-authorise placing recovered files there or changing `audio-assets.js`, `admin-audio-overrides.js`, or `lost-sizzler-playlist-audio.js`.

## Recovery gate

When Storage downloads become available:

1. re-read live metadata and compare against the frozen manifest;
2. recover all 16 enabled objects first;
3. record actual downloaded byte size and SHA-256;
4. run ffprobe/decode verification;
5. use this trace to associate each verified binary with its runtime state;
6. choose final local destinations only after binary verification;
7. run offline audio/Solo/Tutorial/2P regressions after any later reference migration;
8. compare disabled counterparts only after the enabled generation is secured;
9. never infer duplicate identity from byte size alone;
10. keep Supabase Storage/database data untouched until explicit human approval after recovery verification.
