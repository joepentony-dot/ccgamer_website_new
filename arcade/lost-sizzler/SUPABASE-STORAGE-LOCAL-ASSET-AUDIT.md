# The Lost Sizzler — Supabase Storage Local Asset Audit

This audit records the repository-side status of the recovered Supabase Storage music set. It does **not** authorise any Supabase Storage or database mutation.

## Recovery completed — 6 September 2026

The complete Lost Sizzler music set was recovered from `ccg-arcade-assets` and verified.

Verified result:

- 16 enabled MP3 objects recovered — **72,233,137 bytes**;
- 16 disabled counterparts recovered — **72,233,137 bytes**;
- enabled/disabled SHA-256 comparisons — **16 / 16 HASH IDENTICAL**;
- enabled MP3 decode/probe checks — **16 / 16 passed**;
- every disabled counterpart is byte-for-byte identical to its enabled partner;
- therefore the 32 Storage objects contain **16 unique Lost Sizzler tracks**.

The exact per-track hashes, paths, byte sizes and probe durations are recorded in `SUPABASE-STORAGE-RECOVERY-MANIFEST.md`.

## Repository promotion completed

Promotion commit:

`0a36821232eb2d7d3dd60a0773fd73df3eee6411` — `Promote verified Lost Sizzler music locally`

The promotion workflow independently fetched the 16 enabled public objects, required every exact byte size and SHA-256 to match the verified recovery evidence, copied only the passing binaries into `arcade/lost-sizzler/assets/audio/music/`, guarded against concurrent branch movement, committed the files, and removed its own temporary workflow.

The 16 repository MP3s therefore have a continuous verification chain from the recovered Storage objects to the committed local binaries.

## Bundled music inventory

The recovered local originals are:

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

The existing WAV category files remain independent fail-safe fallbacks and are not binary equivalents of the recovered MP3 originals:

| Local file | Role |
| --- | --- |
| `exploration.wav` | normal/exploration fallback |
| `danger.wav` | danger fallback |
| `sanctuary.wav` | sanctuary fallback |
| `named-enemy.wav` | named-enemy fallback |
| `count-loadula.wav` | stalker fallback |

## Runtime mapping

`js/audio-assets.js` is the local source catalogue consumed by `js/lost-sizzler-playlist-audio.js`.

The bundled playlist mapping is now:

- `normal` → five `exploration-*.mp3` tracks;
- `danger` → three `combat-*.mp3` tracks;
- `sanctuary` → two `sanctuary-*.mp3` tracks;
- `named` → three `named-*.mp3` tracks;
- `stalker` → three `count-loadula-*.mp3` tracks.

The single-track `music.normal`, `music.danger`, `music.sanctuary`, `music.named` and `music.stalker` entries deliberately continue to identify the existing WAV fallbacks. The playlist controller uses the richer local MP3 arrays for normal play.

`tests/storage-local-music-contract.mjs` verifies all 16 local files by exact byte size and SHA-256 and requires every bundled playlist URL to stay under `assets/audio/music/` with no Supabase URL.

## Wider bucket finding

The other **40 objects** recovered from `ccg-arcade-assets` belong to the wider Arcade Asset Manager inventory:

- `backgrounds`
- `bosses`
- `collectibles`
- `fighter`
- `hazards`
- `invaders`
- `powers`
- `spritesheets`

They are not members of the frozen Lost Sizzler music set and their exact uploaded filenames are not consumed by the Lost Sizzler runtime. They remain full-bucket backup evidence and are not being added to `arcade/lost-sizzler/`.

## Remaining removal gate

Storage recovery and repository promotion are complete. Supabase Storage removal is **still not authorised**.

Before any Lost Sizzler Storage object is considered for deletion:

1. the canonical static playlist/integrity contracts must pass on the runtime-switch commit;
2. offline Solo, Tutorial and 2P gameplay/package regressions must pass;
3. save, achievement and audio-state regressions must pass;
4. relevant online account, Weekly Vault, cloud-save and multiplayer regressions must be checked separately;
5. package/release provenance must include the promoted local files;
6. a final human review must explicitly approve deletion.

Until those gates pass, **do not delete any Supabase Storage object**.