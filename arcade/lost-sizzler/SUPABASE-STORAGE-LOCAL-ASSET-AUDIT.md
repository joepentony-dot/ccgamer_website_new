# The Lost Sizzler — Supabase Storage Local Asset Audit

This audit records the repository-side status of the recovered Supabase Storage music set. It does **not** authorise any Supabase Storage or database mutation.

## Recovery completed — 6 September 2026

The user recovered the complete Lost Sizzler music set from `ccg-arcade-assets` to desktop storage and supplied it for verification.

Verified result:

- 16 enabled MP3 objects recovered — **72,233,137 bytes**;
- 16 disabled counterparts recovered — **72,233,137 bytes**;
- enabled/disabled SHA-256 comparisons — **16 / 16 HASH IDENTICAL**;
- enabled MP3 decode/probe checks — **16 / 16 passed**;
- every disabled counterpart is byte-for-byte identical to its enabled partner;
- therefore the 32 Storage objects contain **16 unique Lost Sizzler tracks**.

The exact per-track hashes, paths, byte sizes and probe durations are recorded in `SUPABASE-STORAGE-RECOVERY-MANIFEST.md`.

## Current bundled music inventory

Repository directory:

`arcade/lost-sizzler/assets/audio/music/`

The repository already contains small local WAV fallbacks for the five normal gameplay states plus separate OGG music for Horde/Saboteurs. These existing files are independent fallbacks and are **not binary equivalents** of the recovered MP3 originals.

Current category fallbacks include:

| Local file | Role |
| --- | --- |
| `exploration.wav` | normal/exploration fallback |
| `danger.wav` | danger fallback |
| `sanctuary.wav` | sanctuary fallback |
| `named-enemy.wav` | named-enemy fallback |
| `count-loadula.wav` | stalker fallback |

The recovered originals are intended to be promoted alongside these fallbacks under their stable original basenames:

- `combat-01.mp3`
- `combat-02.mp3`
- `combat-03.mp3`
- `exploration-01.mp3`
- `exploration-02.mp3`
- `exploration-03.mp3`
- `exploration-04.mp3`
- `exploration-05.mp3`
- `named-01.mp3`
- `named-02.mp3`
- `named-03.mp3`
- `sanctuary-01.mp3`
- `sanctuary-02.mp3`
- `count-loadula-01.mp3`
- `count-loadula-02.mp3`
- `count-loadula-03.mp3`

## Runtime finding

`js/audio-assets.js` is already the local source catalogue consumed by `js/lost-sizzler-playlist-audio.js`.

At this checkpoint it still points each state at the existing bundled fallback file(s). That is intentional until the 16 verified MP3 bytes are present in the repository/package. Runtime references must not be changed ahead of the binaries.

Once the MP3s are durably present, the intended playlist mapping is:

- `normal` → five `exploration-*.mp3` tracks;
- `danger` → three `combat-*.mp3` tracks;
- `sanctuary` → two `sanctuary-*.mp3` tracks;
- `named` → three `named-*.mp3` tracks;
- `stalker` → three `count-loadula-*.mp3` tracks.

The existing WAV category files remain suitable fail-safe fallbacks during the promotion/regression stage.

## Wider bucket finding

A separate recovery ZIP contains the other **40 objects** in `ccg-arcade-assets`.

Their database groups are:

- `backgrounds`
- `bosses`
- `collectibles`
- `fighter`
- `hazards`
- `invaders`
- `powers`
- `spritesheets`

Their `public.arcade_assets` metadata identifies them as wider Arcade Asset Manager uploads. They are not members of the frozen Lost Sizzler music set, and exact uploaded filenames are not used by the Lost Sizzler runtime. They therefore remain a full-bucket backup and are **not** being added to `arcade/lost-sizzler/`.

## What is still blocked

Storage **recovery is no longer blocked**. Repository promotion is the remaining media step.

The following must still happen before Supabase Storage can be considered removable for Lost Sizzler:

1. place the 16 unique verified MP3 binaries into `arcade/lost-sizzler/assets/audio/music/`;
2. record them in package provenance/integrity;
3. switch the local playlist catalogue to the recovered MP3s while retaining a fail-safe local fallback;
4. run offline Solo/Tutorial/2P/save/audio/achievement regressions;
5. run online regressions separately;
6. review the final package and only then make a deliberate deletion decision.

Until those steps pass, **do not delete any Supabase Storage object**.
