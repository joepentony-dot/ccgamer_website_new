# The Lost Sizzler — Supabase Storage Local Asset Audit

This audit records the current repository-side comparison between the frozen Supabase Storage recovery manifest and the bundled Lost Sizzler music assets.

It is deliberately read-only. It does not authorise any Supabase Storage or database mutation, and it does not claim that similarly named or similarly purposed local assets are binary equivalents of Storage objects.

## Frozen recovery set

The recovery manifest identifies 16 enabled Storage objects that must be recovered first and verified by actual downloaded byte size, SHA-256 and decode/playback evidence before any reference migration or duplicate decision.

Frozen original basenames:

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

## Current bundled music inventory

Repository directory:

`arcade/lost-sizzler/assets/audio/music/`

Current files observed on branch `codex/supabase-egress-containment`:

| Local file | Repository byte size | Relationship to recovery set |
| --- | ---: | --- |
| `count-loadula.wav` | 529,244 | Concept-level local fallback; not an exact frozen original basename |
| `danger.wav` | 529,244 | Concept-level local fallback; not an exact frozen original basename |
| `exploration.wav` | 529,244 | Concept-level local fallback; not an exact frozen original basename |
| `horde-survival-wave-10.ogg` | 4,343,188 | Separate bundled Horde music; not part of the 16-object frozen set |
| `horde-survival-waves-1-4.ogg` | 2,947,999 | Separate bundled Horde music; not part of the 16-object frozen set |
| `horde-survival-waves-5-9.ogg` | 3,114,455 | Separate bundled Horde music; not part of the 16-object frozen set |
| `named-enemy.wav` | 529,244 | Concept-level local fallback; not an exact frozen original basename |
| `sanctuary.wav` | 529,244 | Concept-level local fallback; not an exact frozen original basename |
| `sizzler-saboteurs-theme.ogg` | 3,162,703 | Separate bundled theme; not part of the 16-object frozen set |

## Finding

There are currently **zero exact-basename local candidates** for the 16 frozen enabled Storage originals.

The existing bundled WAV files cover several of the same gameplay categories, but their filenames, formats and byte sizes differ substantially from the frozen MP3 objects. They must therefore be treated as independent local fallback assets unless and until binary evidence proves otherwise.

No duplicate identity may be inferred from:

- shared gameplay purpose;
- similar naming;
- matching playlist/category intent;
- byte size alone;
- the fact that a local fallback already exists.

## Recovery consequence

Supabase Storage recovery is still required if the original 16 enabled binaries are to be preserved or compared against the disabled generation.

When Storage download access becomes available, continue with the frozen sequence:

1. re-read live `public.arcade_assets` metadata and compare it with the frozen manifest;
2. recover the 16 enabled Storage objects first;
3. record actual downloaded byte size and SHA-256 for every object;
4. run `ffprobe`/decode verification where available;
5. trace each verified recovered file to runtime references and intended repository destination;
6. compare disabled counterparts only after enabled recovery is secured;
7. call a pair identical only when SHA-256 matches exactly;
8. keep all Storage/database data untouched until an explicit later human decision after recovery verification.

## Current metadata checkpoint

Read-only Supabase inspection on 3 September 2026 found the frozen database totals unchanged:

- music rows: 32;
- enabled rows: 16;
- disabled rows: 16;
- enabled metadata bytes: 72,233,137;
- disabled metadata bytes: 72,233,137;
- row range: 62–93.

Storage logs returned no recent entries at that checkpoint, so no successful recovery download is inferred from the absence of errors or from project health alone.
