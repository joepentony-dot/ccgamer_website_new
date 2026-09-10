# Lost Sizzler local music

This directory contains the package-local music used by The Lost Sizzler.

## Verified recovered playlists

The 16 MP3 files below were recovered from the Supabase Storage bucket `ccg-arcade-assets`, verified against the frozen recovery manifest by exact byte size and SHA-256, and promoted into the repository on 6 September 2026.

- Exploration: `exploration-01.mp3` through `exploration-05.mp3`
- Danger/combat: `combat-01.mp3` through `combat-03.mp3`
- Sanctuary: `sanctuary-01.mp3`, `sanctuary-02.mp3`
- Named enemies: `named-01.mp3` through `named-03.mp3`
- Count Loadula/stalker: `count-loadula-01.mp3` through `count-loadula-03.mp3`

`js/audio-assets.js` is the bundled runtime catalogue. Normal play uses these local MP3 playlists and does not need Supabase Storage.

## Local fallbacks

The existing WAV category tracks remain deliberately bundled as independent fail-safe fallbacks:

- `exploration.wav`
- `danger.wav`
- `sanctuary.wav`
- `named-enemy.wav`
- `count-loadula.wav`

They are not byte-equivalent replacements for the recovered MP3s and should not be deleted merely because the richer playlists are now local.

## Integrity

`scripts/verify-lost-sizzler-storage-recovery.mjs` records the recovery-side evidence. `tests/storage-local-music-contract.mjs` independently verifies the repository copies by filename, exact byte size and SHA-256 during the canonical static regression suite.

Do not replace these files without deliberately updating the recovery/provenance evidence and regression contract.